# Voice generation pipeline (author tooling, never shipped)

Generates spoken-line audio for Merit Badge Massacre offline, on the author's
own machine. Nothing under `tools/` is loaded by the game; `js/voice.js` is
still a stub (`available: false`) until someone wires playback in separately.
This pipeline only produces the asset files and their manifest.

Two commands, run in this order whenever dialogue changes or you want to
regenerate audio:

```
npm run audio:voice      # dialogue.js -> lines.json -> kokoro + ffmpeg -> assets/voice/en/**/*.webm
npm run audio:manifest   # assets/ -> assets/manifest.json
```

## Setup (Windows)

1. **Python 3.10+.** Check with `python --version`. Get it from
   https://www.python.org/downloads/windows/ if needed, and tick "Add
   python.exe to PATH" in the installer.
2. **kokoro + soundfile**, the TTS engine and the WAV writer it needs:
   ```
   pip install kokoro soundfile
   ```
   The first real (non `--dry-run`) generation run will also pull kokoro's
   model weights from Hugging Face the first time a given voice is used;
   that needs an internet connection once, then it's cached locally.
3. **espeak-ng.** kokoro uses it for text-to-phoneme fallback on
   out-of-dictionary words. Installer:
   https://github.com/espeak-ng/espeak-ng/releases (grab the latest
   `espeak-ng-*-x64.msi`). Default install location is fine.
4. **ffmpeg on PATH.** Used for every pitch shift, post effect, and the
   final WebM/Opus encode. Get a Windows build from
   https://www.gyan.dev/ffmpeg/builds/ (the "essentials" build is enough),
   unzip it somewhere permanent, and add its `bin/` folder to your PATH.
   Confirm with `ffmpeg -version` in a fresh terminal.

Nothing here installs itself: this repo's own tooling never runs `pip
install` or downloads anything for you. Run the steps above yourself, once.

## The two-command workflow

```
npm run audio:voice
```
Runs `node tools/voice/dump_lines.cjs` (rebuilds `tools/voice/lines.json`
from `js/dialogue.js`, no dependencies needed) then `python
tools/voice/gen.py` (synthesizes every line whose output file is missing,
under `assets/voice/en/<speaker>/`). It's incremental: lines that already
have a generated file for their current wording are skipped, so adding one
new bark and re-running only synthesizes that one line.

```
npm run audio:manifest
```
Runs `node tools/manifest.cjs`, which scans all of `assets/` (not just
voice) and writes `assets/manifest.json`, the file `js/assets.js` reads at
runtime. Always run this after `audio:voice` so the game can see new files.
Safe to run any time, including with no `assets/` folder at all.

## Useful flags on gen.py

```
python tools/voice/gen.py --dry-run                    # lists what would generate, touches nothing
python tools/voice/gen.py --speaker brock               # only one speaker
python tools/voice/gen.py --speaker brock --limit 3      # only the first 3 selected lines
python tools/voice/gen.py --force                       # regenerate even if the output file exists
```

`--dry-run` never imports kokoro/soundfile, so it works even before step 2 of
setup is done, as a way to sanity-check `lines.json` and see exactly which
files would be written.

## Recipe evaluation round

Voice choice, speed, pitch, and effects live in `tools/voice/voices.json`
(one entry per speaker; every field is documented in that file's `_readme`).
To dial in a character's sound:

1. Generate a small sample for just that speaker:
   ```
   python tools/voice/gen.py --speaker brock --limit 3
   ```
2. Listen to the files under `assets/voice/en/brock/`.
3. Edit that speaker's entry in `voices.json` (voice id, `speed`,
   `pitchSemitones`, or the `post` list).
4. Regenerate. **Important:** `gen.py`'s incremental check is keyed on the
   line's *text* hash (`hash8`), not on the recipe, so editing `voices.json`
   alone does not make it re-render an existing file. Either add `--force`:
   ```
   python tools/voice/gen.py --speaker brock --limit 3 --force
   ```
   or delete `assets/voice/en/brock/` and run the plain command again.
5. Repeat until it sounds right, then run the full `npm run audio:voice`
   (no `--speaker`/`--limit`/`--force`) to fill in every remaining line for
   every speaker, and `npm run audio:manifest` to refresh the manifest.

## Post effect chains

Named in `POST_CHAINS` inside `gen.py`, referenced by name from a speaker's
`post` list in `voices.json`, applied in list order:

- `saturate` (Brock): warm campfire-radio soft-clip warmth.
- `campfire_slap` (Brock): one 40ms reflection, low mix, not a room.
- `detune_double` (the hare/BRAMBLEBUCK): a short chorus doubling.
- `plate` (the hare/BRAMBLEBUCK and the vicar/THE TALLYMAN): short multi-tap
  `aecho` approximation of a plate reverb (ffmpeg has no true plate reverb
  filter).
- `longtail` (the antlered one): the same multi-tap `aecho` approach as
  `plate`, stretched to a several-hundred-ms diffuse tail.
- `ringmod42` (THE TALLYMAN): ring modulation at 42 Hz, mixed under the dry
  signal. ffmpeg has no clean ring modulator, so this one step runs in
  Python (numpy) directly on the samples, in between the ffmpeg-driven
  steps around it, before the file is handed off for final encoding.
- `highpass_upper` (the antlered one only): thins the *second* stacked
  layer (see below) down to its upper harmonics, so stacking two pitch
  layers reads as a second, ghostly overtone voice rather than a doubled
  main voice.

## The antlered one's stacked voice

Most speakers use a single `pitchSemitones` shift. The antlered one instead
uses `stacked: [-7, 5]` with `mix: [1.0, 0.35]`: the same synthesized line is
rendered as two separately pitch-shifted layers (a low layer at -7
semitones, full volume, and a high layer at +5 semitones, quieter), with
`highpass_upper` applied to only the second layer before the two are mixed
down. `longtail` then applies to the mixed result. This is the only speaker
that uses `stacked`/`mix`; everyone else uses plain `pitchSemitones`.

## Output layout

```
assets/voice/en/<speaker>/<category>_<slot>_<hash8>.webm
assets/voice/LICENSE-VOICES.md
assets/manifest.json
```

`<hash8>` is the first 8 hex characters of `sha1(spokenText)` (see
`tools/voice/lines.json`), so a line's filename changes only when its
*wording* changes, not when you retune its voice. `assets/voice/LICENSE-VOICES.md`
is appended to automatically by every real (non `--dry-run`) `gen.py` run:
engine, kokoro package version, every voice id used that run, generation
date. It's the attribution record for whatever audio ends up in the repo (or
gets shipped) later.

## Speakers and where their lines come from

- `max`, `junie`, `gus`: `BARKS.<name>` (runstart/boss/lowhp/chest/revive/
  win/death/kills), `BARKS.<name>.bossnamed` (a scout talking *about* a
  boss, still in the scout's own voice), and `SELECT_LINES.<name>` (the
  character-select line).
- `brock`: `BROCK.intro`, `BROCK.died` (one per killer, including the
  `generic` fallback), `BROCK.dawn`, `BROCK.idle`, and `BROCK.arc` (each
  beat's `lines` array, slot named `<beatId>_<index>`).
- `hare`, `vicar`, `antlered`: `BOSSLINES.<bossId>`, the boss speaking for
  itself mid-fight. Separate from `bossnamed` above, which is the scouts'
  own barks, not the boss's voice.

Only the words inside `"double quotes"` in a line are ever spoken; narration
around them (stage directions like `Brock pokes the fire.`) is stripped.
Lines with no quotes at all (most barks, all `BOSSLINES`) are spoken in
full. See the header comment in `tools/voice/dump_lines.cjs` for the exact
rule and `tools/voice/lines.json` for every line's `text` next to its
`spokenText`.
