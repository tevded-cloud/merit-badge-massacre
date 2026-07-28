#!/usr/bin/env python3
"""Merit Badge Massacre: author tooling, never shipped.

Reads tools/voice/lines.json (written by dump_lines.cjs) and
tools/voice/voices.json (the character recipe table), synthesizes any line
whose output file is missing, and writes WebM/Opus files under
assets/voice/en/<speaker>/<category>_<slot>_<hash8>.webm.

Pipeline per line:
  1. kokoro synthesis -> 24 kHz mono float audio (one render per stacked
     layer, or one render for a plain single-pitch speaker).
  2. ffmpeg pitch shift per layer (asetrate + atempo: deliberately shifts
     formants along with pitch).
  3. mixdown (ffmpeg amix with explicit per-layer gain) if the speaker has
     more than one stacked layer.
  4. named post chains from POST_CHAINS, in the order listed in voices.json,
     each either an ffmpeg filtergraph or (ringmod42) a numpy transform.
  5. final encode to WebM Opus, 24 kHz, mono, 32 kbps.

Nothing here is imported by the game. This script is run by hand
(`npm run audio:voice`) on the author's machine; it never runs in CI and its
output is a set of static asset files checked in (or not) at the author's
discretion.
"""

import argparse
import datetime
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE_DIR = Path(__file__).resolve().parent          # tools/voice/
REPO_ROOT = VOICE_DIR.parent.parent                   # repo root
LINES_PATH = VOICE_DIR / "lines.json"
VOICES_PATH = VOICE_DIR / "voices.json"
ASSETS_VOICE_DIR = REPO_ROOT / "assets" / "voice" / "en"
LICENSE_PATH = REPO_ROOT / "assets" / "voice" / "LICENSE-VOICES.md"

SAMPLE_RATE = 24000  # kokoro's native output rate; kept through the whole chain
OPUS_BITRATE = "32k"

# Post-chain names that are applied per stacked layer (before mixdown) rather
# than to the final mixed render. See voices.json's "_readme" for why
# highpass_upper needs this: it thins the antlered's upper/overtone layer so
# stacking reads as two voices, not one doubled voice.
LAYER_ONLY_CHAINS = {"highpass_upper"}


# ---------------------------------------------------------------------------
# Named ffmpeg filtergraphs (static -af argument strings), referenced by name
# from a speaker's "post" list in voices.json and applied in list order.
# ringmod42 is intentionally absent here: ffmpeg has no clean ring modulator,
# so it is implemented as a numpy transform in apply_ringmod42() below and
# dispatched separately in run_post_chain().
# ---------------------------------------------------------------------------
POST_CHAINS = {
    # Warm campfire-radio saturation: drive into a soft clip, then pull the
    # level back down so the *harmonics* are what changed, not the loudness.
    "saturate": "volume=6dB,asoftclip=type=tanh,volume=-4dB",

    # A single 40ms reflection at low mix: the "slap" off a nearby surface
    # near the fire, not a room. One aecho tap, short delay, low decay.
    "campfire_slap": "aecho=in_gain=1.0:out_gain=1.0:delays=40:decays=0.25",

    # Cheap doubling: two short, slightly detuned/delayed copies via ffmpeg's
    # chorus filter, standard doubling-preset delays/decays/speeds.
    "detune_double": "chorus=in_gain=0.5:out_gain=0.9:delays=45|55:decays=0.4|0.32:speeds=0.3|0.4",

    # Short plate-style reverb approximated with a handful of closely spaced
    # aecho taps of decreasing level (ffmpeg has no real plate reverb; a
    # single aecho with multiple delay/decay pairs is the documented
    # approximation asked for). Kept under ~100ms so it reads as "plate",
    # not "hall".
    "plate": "aecho=0.8:0.7:40|60|90:0.35|0.25|0.15",

    # Longer diffuse tail for the antlered one: same aecho-taps approach as
    # plate, stretched out to several hundred ms.
    "longtail": "aecho=0.8:0.85:400|700|1000:0.4|0.3|0.2",

    # Thins a layer down to its upper harmonics only. See LAYER_ONLY_CHAINS.
    "highpass_upper": "highpass=f=1200,highpass=f=1200",
}

# ringmod42: multiply the signal by a 42 Hz sine carrier, mixed under the dry
# signal rather than fully wet so it reads as a metallic edge instead of a
# pure robot voice. RINGMOD42_WET is the fraction of ring-modulated signal in
# the final mix (0 = no effect, 1 = fully wet/robotic).
RINGMOD42_FREQ_HZ = 42.0
RINGMOD42_WET = 0.55


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def require_ffmpeg():
    if shutil.which("ffmpeg") is None:
        eprint(
            "gen.py: ffmpeg not found on PATH. Install it and make sure "
            "'ffmpeg' runs from a terminal. See tools/voice/README.md."
        )
        sys.exit(1)


def run_ffmpeg(args):
    """Run ffmpeg quietly, but surface stderr on failure."""
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + args
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        eprint("ffmpeg failed: " + " ".join(cmd))
        eprint(result.stderr.decode("utf-8", errors="replace"))
        raise RuntimeError("ffmpeg failed")


def semitone_ratio(semitones):
    return 2.0 ** (float(semitones) / 12.0)


def atempo_chain(factor):
    """ffmpeg's atempo filter only accepts [0.5, 100.0] per instance. Chain
    multiple atempo stages for factors outside that range. Our recipes never
    need more than one stage, but this stays correct if that changes."""
    stages = []
    remaining = factor
    if remaining <= 0:
        raise ValueError("atempo factor must be positive")
    while remaining < 0.5 or remaining > 100.0:
        stage = 0.5 if remaining < 0.5 else 100.0
        stages.append(stage)
        remaining /= stage
    stages.append(remaining)
    return ",".join(f"atempo={s:.6f}" for s in stages)


def pitch_shift_filter(semitones):
    """asetrate+atempo pitch shift: resample at a scaled rate (changes both
    pitch and speed), then time-stretch back to the original speed with
    atempo (which does not touch pitch). Net effect: pitch changes, formants
    move with it, duration is restored. That formant shift is deliberate,
    per spec, for this cast (small critters should sound small-bodied)."""
    if not semitones:
        return None
    ratio = semitone_ratio(semitones)
    new_rate = int(round(SAMPLE_RATE * ratio))
    tempo = atempo_chain(1.0 / ratio)
    return f"asetrate={new_rate},{tempo},aresample={SAMPLE_RATE}"


def apply_ffmpeg_filter(in_wav: Path, out_wav: Path, filtergraph: str):
    run_ffmpeg(["-i", str(in_wav), "-af", filtergraph, str(out_wav)])


def apply_ringmod42(in_wav: Path, out_wav: Path):
    """Ring modulation has no clean ffmpeg equivalent, so this step is done
    directly on the samples in Python, then written back out as a wav for the
    rest of the (ffmpeg-based) chain to keep using."""
    import numpy as np
    import soundfile as sf

    samples, sr = sf.read(str(in_wav), dtype="float32", always_2d=False)
    t = np.arange(len(samples), dtype=np.float32) / float(sr)
    carrier = np.sin(2.0 * np.pi * RINGMOD42_FREQ_HZ * t).astype(np.float32)
    modulated = samples * carrier
    mixed = (1.0 - RINGMOD42_WET) * samples + RINGMOD42_WET * modulated
    peak = float(np.max(np.abs(mixed))) if len(mixed) else 0.0
    if peak > 1.0:
        mixed = mixed / peak
    sf.write(str(out_wav), mixed, sr)


def run_post_chain(in_wav: Path, work_dir: Path, chain_names, step_prefix):
    """Applies an ordered list of post-chain names to in_wav, writing an
    intermediate file per step (ffmpeg and the python ring-mod step hand off
    to each other through plain wav files). Returns the path to the final
    wav. Unknown chain names are a hard error: silently skipping a named
    effect would ship the wrong take without anyone noticing."""
    current = in_wav
    for i, name in enumerate(chain_names):
        step_out = work_dir / f"{step_prefix}_post{i}_{name}.wav"
        if name == "ringmod42":
            apply_ringmod42(current, step_out)
        elif name in POST_CHAINS:
            apply_ffmpeg_filter(current, step_out, POST_CHAINS[name])
        else:
            raise ValueError(f"unknown post chain '{name}' (see POST_CHAINS in gen.py)")
        current = step_out
    return current


def lang_code_for_voice(voice_id: str) -> str:
    """kokoro voice ids are prefixed by language pack: af_/am_ = American
    English ('a'), bf_/bm_ = British English ('b'). Extend this if a recipe
    ever picks a voice from another pack."""
    prefix = voice_id.split("_", 1)[0]
    if prefix.startswith("a"):
        return "a"
    if prefix.startswith("b"):
        return "b"
    raise ValueError(
        f"gen.py: don't know the kokoro language pack for voice '{voice_id}' "
        "(expected an af_/am_/bf_/bm_ prefix). Add a case to lang_code_for_voice()."
    )


class Kokoro:
    """Thin wrapper so the rest of the script never touches the kokoro
    package directly, and so --dry-run never has to import it at all."""

    def __init__(self):
        from kokoro import KPipeline  # deferred: only real (non-dry-run) synthesis needs this

        self._KPipeline = KPipeline
        self._pipelines = {}

    def _pipeline_for(self, lang_code):
        if lang_code not in self._pipelines:
            self._pipelines[lang_code] = self._KPipeline(lang_code=lang_code)
        return self._pipelines[lang_code]

    def synth_to_wav(self, text, voice_id, speed, out_wav: Path):
        import numpy as np
        import soundfile as sf

        pipeline = self._pipeline_for(lang_code_for_voice(voice_id))
        chunks = []
        for _graphemes, _phonemes, audio in pipeline(text, voice=voice_id, speed=speed):
            chunks.append(np.asarray(audio, dtype="float32"))
        if not chunks:
            raise RuntimeError(f"kokoro produced no audio for voice '{voice_id}': {text!r}")
        full = chunks[0] if len(chunks) == 1 else np.concatenate(chunks)
        sf.write(str(out_wav), full, SAMPLE_RATE)

    def model_version(self) -> str:
        try:
            from importlib.metadata import version

            return version("kokoro")
        except Exception:
            try:
                import kokoro as kokoro_pkg

                return getattr(kokoro_pkg, "__version__", "unknown")
            except Exception:
                return "unknown"


def render_layer(kokoro: "Kokoro", text, recipe, semitones, extra_post_names, work_dir, step_prefix):
    """Synthesizes one layer of one line: kokoro render, pitch shift, then any
    layer-only post chains (currently just highpass_upper on upper stack
    layers). Returns a wav path."""
    raw_wav = work_dir / f"{step_prefix}_raw.wav"
    kokoro.synth_to_wav(text, recipe["voice"], recipe.get("speed", 1.0), raw_wav)

    pitched_filter = pitch_shift_filter(semitones)
    if pitched_filter:
        pitched_wav = work_dir / f"{step_prefix}_pitched.wav"
        apply_ffmpeg_filter(raw_wav, pitched_wav, pitched_filter)
    else:
        pitched_wav = raw_wav

    if extra_post_names:
        return run_post_chain(pitched_wav, work_dir, extra_post_names, step_prefix + "_layer")
    return pitched_wav


def mixdown(layer_wavs, gains, work_dir: Path, step_prefix):
    """ffmpeg amix with explicit per-input gain and normalize=0, so the mix
    respects voices.json's "mix" weights instead of ffmpeg's default
    divide-by-input-count normalization."""
    filter_parts = []
    labels = []
    for i, gain in enumerate(gains):
        filter_parts.append(f"[{i}:a]volume={gain}[g{i}]")
        labels.append(f"[g{i}]")
    filter_parts.append("".join(labels) + f"amix=inputs={len(layer_wavs)}:duration=longest:normalize=0[mixed]")
    filtergraph = ";".join(filter_parts)

    out_wav = work_dir / f"{step_prefix}_mixed.wav"
    args = []
    for wav in layer_wavs:
        args += ["-i", str(wav)]
    args += ["-filter_complex", filtergraph, "-map", "[mixed]", str(out_wav)]
    run_ffmpeg(args)
    return out_wav


def encode_webm_opus(in_wav: Path, out_webm: Path):
    out_webm.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg([
        "-i", str(in_wav),
        "-ar", str(SAMPLE_RATE),
        "-ac", "1",
        "-c:a", "libopus",
        "-b:a", OPUS_BITRATE,
        str(out_webm),
    ])


def slug(value: str) -> str:
    """Filesystem-safe slot slug. Slots are already simple identifiers
    (numeric indices, boss ids, arc beat ids like 'firstNight_0'), so this is
    a defensive pass, not the primary sanitizer."""
    out = []
    for ch in str(value):
        out.append(ch if (ch.isalnum() or ch in "-_") else "-")
    return "".join(out)


def output_path_for(entry) -> Path:
    filename = f"{slug(entry['category'])}_{slug(entry['slot'])}_{entry['hash8']}.webm"
    return ASSETS_VOICE_DIR / entry["speaker"] / filename


def load_json(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def update_license_file(model_version: str, voice_ids, generated_count: int):
    """Appends a dated record of what generated the just-written audio:
    engine, kokoro package version, and every voice id used this run. Never
    called for --dry-run, since nothing was actually generated."""
    LICENSE_PATH.parent.mkdir(parents=True, exist_ok=True)
    today = datetime.date.today().isoformat()
    voice_list = ", ".join(f"`{v}`" for v in sorted(voice_ids))
    entry = (
        f"## {today}\n\n"
        f"- Engine: kokoro (TTS)\n"
        f"- kokoro package version: {model_version}\n"
        f"- Voices used this run: {voice_list}\n"
        f"- Lines (re)generated this run: {generated_count}\n\n"
    )
    header = (
        "# Voice generation record\n\n"
        "Auto-appended by `tools/voice/gen.py` every time it actually generates "
        "audio (never for --dry-run). Kept for attribution: which engine, which "
        "model/package version, and which voice ids produced the files under "
        "this folder.\n\n"
        "Kokoro (https://github.com/hexgrad/kokoro) is Apache-2.0 licensed; its "
        "voice packs carry their own upstream licenses, see the kokoro project "
        "for per-voice attribution.\n\n"
    )
    if LICENSE_PATH.exists():
        existing = LICENSE_PATH.read_text(encoding="utf-8")
        LICENSE_PATH.write_text(existing.rstrip("\n") + "\n\n" + entry, encoding="utf-8")
    else:
        LICENSE_PATH.write_text(header + entry, encoding="utf-8")


def parse_args():
    p = argparse.ArgumentParser(description="Generate Merit Badge Massacre voice lines with kokoro.")
    p.add_argument("--dry-run", action="store_true", help="List what would generate; synthesize nothing.")
    p.add_argument("--speaker", default=None, help="Only process this speaker (e.g. brock).")
    p.add_argument("--limit", type=int, default=None, help="Cap the number of lines processed (after --speaker filtering). Useful for the recipe evaluation round.")
    p.add_argument("--force", action="store_true", help="Regenerate even if the output file already exists. voices.json edits don't change hash8, so this (or deleting the speaker's folder) is how you re-render after tuning a recipe.")
    return p.parse_args()


def main():
    args = parse_args()

    if not LINES_PATH.exists():
        eprint(f"gen.py: {LINES_PATH} not found. Run dump_lines.cjs first (npm run audio:voice does this).")
        sys.exit(1)
    if not VOICES_PATH.exists():
        eprint(f"gen.py: {VOICES_PATH} not found.")
        sys.exit(1)

    lines = load_json(LINES_PATH)
    voices = load_json(VOICES_PATH)
    speakers = {k: v for k, v in voices.items() if not k.startswith("_")}

    if args.speaker:
        lines = [e for e in lines if e["speaker"] == args.speaker]
    if args.limit is not None:
        lines = lines[: args.limit]

    missing_recipe = sorted({e["speaker"] for e in lines if e["speaker"] not in speakers})
    if missing_recipe:
        eprint(f"gen.py: no voices.json recipe for speaker(s): {', '.join(missing_recipe)}")
        sys.exit(1)

    todo = []
    already = 0
    for entry in lines:
        out_path = output_path_for(entry)
        if out_path.exists() and not args.force:
            already += 1
            continue
        todo.append((entry, out_path))

    if args.dry_run:
        print(f"gen.py --dry-run: {len(lines)} line(s) selected, {already} already present, {len(todo)} would generate.")
        for entry, out_path in todo:
            rel = out_path.relative_to(REPO_ROOT)
            print(f"  {entry['speaker']}/{entry['category']}/{entry['slot']}  {entry['hash8']}  -> {rel}")
        return

    if not todo:
        print(f"gen.py: nothing to do ({already} already present, 0 selected to generate).")
        return

    require_ffmpeg()
    kokoro = Kokoro()

    generated = 0
    failed = 0
    used_voice_ids = set()

    with tempfile.TemporaryDirectory(prefix="mbm_voice_") as tmp:
        work_dir = Path(tmp)
        for i, (entry, out_path) in enumerate(todo):
            recipe = speakers[entry["speaker"]]
            used_voice_ids.add(recipe["voice"])
            step_prefix = f"L{i:04d}_{slug(entry['speaker'])}_{slug(entry['category'])}_{slug(entry['slot'])}"
            try:
                if "stacked" in recipe:
                    shifts = recipe["stacked"]
                    gains = recipe["mix"]
                    if len(shifts) != len(gains):
                        raise ValueError(f"{entry['speaker']}: 'stacked' and 'mix' must be the same length")
                    layer_wavs = []
                    for li, semis in enumerate(shifts):
                        layer_only = [n for n in recipe.get("post", []) if n in LAYER_ONLY_CHAINS] if li > 0 else []
                        layer_wavs.append(
                            render_layer(kokoro, entry["spokenText"], recipe, semis, layer_only, work_dir, f"{step_prefix}_L{li}")
                        )
                    mixed = mixdown(layer_wavs, gains, work_dir, step_prefix)
                    remaining_post = [n for n in recipe.get("post", []) if n not in LAYER_ONLY_CHAINS]
                    final_wav = run_post_chain(mixed, work_dir, remaining_post, step_prefix) if remaining_post else mixed
                else:
                    semis = recipe.get("pitchSemitones", 0)
                    base_wav = render_layer(kokoro, entry["spokenText"], recipe, semis, [], work_dir, step_prefix)
                    post_names = [n for n in recipe.get("post", []) if n not in LAYER_ONLY_CHAINS]
                    final_wav = run_post_chain(base_wav, work_dir, post_names, step_prefix) if post_names else base_wav

                encode_webm_opus(final_wav, out_path)
                generated += 1
            except Exception as e:
                failed += 1
                eprint(f"gen.py: FAILED {entry['speaker']}/{entry['category']}/{entry['slot']}: {e}")

    print(f"gen.py: generated {generated}, failed {failed}, already present {already}, total selected {len(lines)}.")

    if generated > 0:
        update_license_file(kokoro.model_version(), used_voice_ids, generated)
        print(f"gen.py: updated {LICENSE_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
