# AUDIO 2.1: our own music, our own voices

The plan for giving Merit Badge Massacre a soundtrack it composed and a cast it
speaks with, shipped as 2.1, before the 3.0 content wave.

Written against the worktree at D:\Programs\mbm-2.1-audio on branch v2.1-audio.
Every number below is labelled MEASURED (read off a real run), COMPUTED (arithmetic
on values read out of the repo) or ESTIMATE (a planning guess that must be replaced
by a measurement before anyone relies on it). The house doctrine at
.claude/agents/sound-designer.md governs; where this file and that file disagree,
that file wins.

---

## 1. WHERE WE ACTUALLY ARE

Every note and every voice line in the game today is being made up on the spot by
code, because the baked layer that was designed to sit on top of it has never once
been generated. That is a supported mode, not a bug: the doctrine says the game must
sound finished with the entire assets folder deleted, and it does, which was
confirmed by serving this worktree and playing it with no assets at all and no
errors. But it is the tier below what was designed. The music you hear is one
four-bar loop, the same loop in act 1, act 2, act 3 and all four boss fights, while
eight finished compositions sit unrendered in js/music/src. There are 156 written
lines of dialogue and not one of them has a voice, while a complete generation
pipeline sits unused in tools/voice. Nothing here needs to be designed or written:
it needs to be rendered, and rendering needs software installed on your machine,
which is the next section and is your call.

---

## 2. THE DEPENDENCY DECISION (your call, it gates everything)

### Voices: yes, this is a multi-gigabyte machine learning stack on your PC.

The voice engine the project already picked (Kokoro, chosen for its Apache 2.0
licence) runs on PyTorch. There is no small version of that. Honest total for the
voice side: roughly 2 to 3 GB on disk once everything unpacks.

| What | Why | Size | Command |
|---|---|---|---|
| PyTorch, CPU build | Kokoro's model runs on it | roughly 200-250 MB download, roughly 1.5-2.5 GB unpacked (ESTIMATE, general knowledge, not installed here) | `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| kokoro + soundfile | the text-to-speech engine and the WAV writer | a few MB of Python on top of torch | `pip install kokoro soundfile` |
| Kokoro-82M weights | the actual voices | roughly 300-350 MB, cached after first use (ESTIMATE) | none, downloads itself on the first real generation |
| espeak-ng | turns unusual words into phonemes | roughly 10-15 MB | run `espeak-ng-*-x64.msi` from https://github.com/espeak-ng/espeak-ng/releases |
| ffmpeg with libopus | every pitch shift, every effect, the final encode | roughly 100-130 MB | `winget install Gyan.FFmpeg` then open a fresh terminal |

RUN THE TORCH COMMAND FIRST, BEFORE `pip install kokoro`. If kokoro resolves torch
itself, pip may pull a CUDA wheel, which is 2.5 GB or more on its own and useless
here since this is CPU work. Ordering the commands this way is the single biggest
saving available.

Cheapest honest alternatives for voices:

- Put all of it in a throwaway virtual environment (`python -m venv D:\mbm-voice-env`)
  so nothing lands in your system Python and deleting one folder undoes the whole
  thing. Recommended regardless of anything else.
- A hosted text-to-speech service instead of local ML. Rejected, and it should stay
  rejected: shipped game assets need clean licence and provenance, which is exactly
  why Kokoro was picked in the first place, and a hosted service means a per-line
  terms-of-service question for a commercial game.
- Do voices later. Real option, costs nothing, but it is the thing you asked for in
  2.1, and the pipeline is finished and idle.

### Music: much lighter, roughly 250 MB, no ML at all.

| What | Why | Size | Command |
|---|---|---|---|
| Electron plus electron-builder | tools/render is an Electron app: it needs a real Chromium OfflineAudioContext to bake the compositions | roughly 100-200 MB download, expect 400-600 MB of node_modules (ESTIMATE) | `npm install` in D:\Programs\mbm-2.1-audio |
| ffmpeg with libopus | encodes the rendered WAVs to the Opus-in-WebM the game loads | same install as above, shared with voices | `winget install Gyan.FFmpeg` |

ffmpeg is needed for BOTH tracks. Install it once and it covers music and voices.

Cheapest honest alternative for music: skip Electron and run tools/render/index.html
in Chrome or Edge, which you already have, since the only thing Electron provides is
Chromium's audio engine. The catch is that the render page hands finished WAVs back
to Electron's main process over IPC, and a browser tab cannot write files, so
somebody has to write a browser-side shim that triggers 25 downloads instead. That is
maybe an hour of code plus the manual filing of 25 files, to save roughly 500 MB of
node_modules that package.json already declares as a devDependency. Recommendation:
just run `npm install`. It is the cheap side of this decision, not the expensive one.

### The decision, stated plainly

- ffmpeg: yes, both tracks need it, roughly 130 MB, one command.
- Electron: yes, roughly 500 MB, one command, it is already in package.json.
- The torch and Kokoro stack: 2 to 3 GB and it is only for voices. This is the one
  that deserves a real yes or no from you. If the answer is no, sections 4 through 6
  still ship and 2.1 becomes a music and mix release, because voice absence is
  already a shipped, tested mode.

---

## 3. VOICES

### The real line count

Read out of tools/voice/lines.json, which was generated from js/dialogue.js by
running `node tools/voice/dump_lines.cjs`. MEASURED, not estimated.

| Speaker | Lines | Spoken characters | Average line |
|---|---|---|---|
| brock | 48 | 5168 | 108 chars |
| max | 35 | 1051 | 30 chars |
| gus | 35 | 1150 | 33 chars |
| junie | 35 | 1117 | 32 chars |
| hare | 1 | 29 | 29 chars |
| vicar | 1 | 28 | 28 chars |
| antlered | 1 | 28 | 28 chars |
| **Total** | **156** | **8571** | **55 chars** |

The three scouts have identical line sets: boss 6, bossnamed 3, chest 2, death 5,
kills 2, lowhp 6, revive 2, runstart 6, select 1, win 2. Brock is the talker: arc 24,
died 13, idle 7, dawn 2, intro 2. Each of the three bosses has exactly one voiced
line. Longest line in the game is 258 characters, so nothing here is a monologue.
No duplicate slot or hash collision warnings were printed, so the data is clean.

### The casting

Recipes are already written in tools/voice/voices.json. In plain words:

- **Max** (`am_michael`, +3 semitones, 1.05x speed). A boy, slightly quick, the
  ordinary one you measure the others against.
- **Junie** (`af_bella`, +5 semitones, 1.12x speed). A girl, fastest talker in the
  troop, brightest. **This one breaks a house rule**: the doctrine caps kids at plus
  four semitones because past that they stop sounding like kids and start sounding
  like a chipmunk. Junie is at plus five. Fix it in the recipe round below, or get an
  explicit exception, but do not just ship past it.
- **Gus** (`am_puck`, +1 semitone, 0.94x speed). The slow, heavy kid. Barely shifted,
  which is the point: he is the one who sounds nearly his real size.
- **Brock** (`bm_lewis`, -2 semitones, 0.92x speed, saturate then campfire_slap).
  The adult. Gruff, slower, with a soft warm distortion and one short reflection
  behind him so he sounds like a man talking across a fire in the open air rather
  than a man in a recording booth. He carries 60 percent of all spoken characters in
  the game, so he is the voice a player will actually form an opinion about.
- **The Hare / Bramblebuck** (`af_sky`, -3 semitones, 1.20x speed, detune_double
  then plate). A bright voice, dropped and doubled slightly out of tune with itself,
  in a room that is bigger than the room you are standing in. Cute first, wrong
  second: the wrongness is the doubling, not a growl.
- **The Vicar** (`bm_george`, -5 semitones, 0.88x speed, ringmod42 then plate). Slow,
  low, with a 42 Hz ring modulation at 55 percent wet, which is the buzzing metallic
  edge you cannot place. Same big room as the hare.
- **The Antlered One** (`am_onyx`, 0.80x speed, two stacked renders at -7 and +5
  semitones mixed 1.0 and 0.35, the upper one thinned with a highpass, then a long
  diffuse tail). Two voices at once out of one mouth, the high one sitting on top
  like an overtone rather than a second person. This is the only speaker that costs
  two synthesis passes per line, and there is exactly one line, so it costs nothing.

### The generation plan

1. **Decode gate first, before anything else.** Generate three Brock lines
   (`python tools/voice/gen.py --speaker brock --limit 3`). Open one of the resulting
   .webm files in Chrome, Firefox and Edge and confirm all three decode it. The
   doctrine is explicit about doing this before generating a set, and it is right:
   getting this wrong after 156 files means regenerating 156 files. This same run is
   also where the real seconds-per-line number gets measured.
2. **Recipe evaluation round.** One line per speaker, seven files, with `--force`.
   Listen to all seven back to back. Fix Junie's semitone cap. Retune anything that
   does not sound like the character. Only voices.json changes here.
3. **Full generation.** `npm run audio:voice`, which re-dumps lines.json from
   dialogue.js and then generates everything missing. Incremental: a line is skipped
   if its output file already exists.
4. **Review step.** Listen to all 48 Brock lines, since he is 60 percent of the
   words and the most likely to have a line that reads wrong. Spot check ten scout
   lines per scout and all three boss lines. Anything wrong is a dialogue.js wording
   fix or a voices.json retune, and both paths are already handled: wording changes
   produce a new hash and regenerate automatically, recipe changes need `--force`.
5. **Index and ship.** `npm run audio:manifest`. No game code change is needed:
   js/voice.js self-boots at the bottom of the file (`try { init(); } catch (e) {}`)
   and will find the new files on its own.

### The incremental hashing, and its one trap

Output files are named `assets/voice/en/<speaker>/<category>_<slot>_<hash8>.webm`
where hash8 is the first eight hex characters of sha1 of the spoken text. The
consequences, both deliberate:

- Change a line's wording in dialogue.js and it gets a new hash, so it regenerates
  automatically and the old file is flagged in the manifest's `prune` list.
- Change a voice recipe in voices.json and the hash does NOT change, so nothing
  regenerates. That is what makes the recipe evaluation round cheap, and it is also
  the trap: after tuning Junie you must pass `--force` or delete her folder, or you
  will listen to the old take and conclude the tuning did nothing.

### File sizes and what ships

8571 spoken characters at roughly 15 characters per second of speech is about 570
seconds, call it 9 to 10 minutes of finished audio (ESTIMATE, replace with the real
figure after step 1). At the pipeline's fixed 32 kbps mono Opus, that is about 4 KB
per second, so **roughly 2.3 MB total for all 156 lines** (COMPUTED from that
estimate). That is nothing. Voice is the cheapest thing in this document to ship and
the most noticeable thing in it to hear.

### How long it takes once the dependencies exist

An afternoon, and most of that afternoon is installing and listening, not computing.
The compute itself is 156 short synthesis passes (157 counting the Antlered One's
second layer) plus a handful of ffmpeg calls each. Planning band: 10 to 30 minutes
of compute (ESTIMATE). The doctrine says measure rather than estimate, so the three
line Brock batch in step 1 produces the real number and that number replaces this
paragraph before anyone schedules around it.

### Licence and provenance

Kokoro is Apache 2.0. There is an inconsistency in the repo that has to be resolved
before generating for real, because it is a licence question on shipped assets:

- The doctrine (.claude/agents/sound-designer.md, line 84) says Apache 2.0 "covers
  the model and the voicepacks", and says Piper was rejected specifically because its
  voice models would each need a per-voice licence audit.
- The text gen.py would actually write into LICENSE-VOICES.md (tools/voice/gen.py,
  the header in `update_license_file()`) says the opposite: the voice packs "carry
  their own upstream licenses, see the kokoro project for per-voice attribution".

One of those is wrong. If the hedged version is correct, then the exact reason Piper
was rejected also applies to Kokoro and the seven voice ids in voices.json each need
checking before they ship in a game. If the doctrine is correct, the file gen.py
writes should say so. Resolve this first, in one edit, before the first real run,
because the very first real run creates the file.

**assets/voice/LICENSE-VOICES.md does not exist yet.** It is created automatically
the first time gen.py generates anything for real (never on --dry-run), and appended
to on every subsequent run with the date, the kokoro package version, every voice id
used, and how many lines were generated. That file is the provenance record and it
ships with the game. It is excluded from the asset manifest by design
(tools/manifest.cjs skips .md files), so it costs nothing at runtime.

---

## 4. MUSIC

### There are eight compositions, not nine

js/music/src/index.js lists eight compositions plus one shared toolkit. All eight are
real, finished music. **None are stubs.** This was verified by running
`node tools/render/selftest.cjs`, which passed all 47 checks including building every
layer of every composition against a stand-in audio graph.

| Theme | id | Tempo | Bars | Key | Stems | Loop length (COMPUTED) |
|---|---|---|---|---|---|---|
| act1 | `act1` | 116 bpm | 16 | A minor | base, l1, l2, l3 | 33.1 s |
| act2, "The Sog" | `act2` | 92 bpm | 16 | D minor | base, l1, l2, l3 | 41.7 s |
| act3, "The Burn" | `act3` | 144 bpm | 16 | E minor | base, l1, l2, l3 | 26.7 s |
| camp | `camp` | 68 bpm | 16 | C major | warm (one stem, no drums, on purpose) | 56.5 s |
| Bramblebuck | `bramblebuck` | 128 bpm | 32 | G minor | base, p2, p3 | 60.0 s |
| Mawmole | `mawmole` | 70 bpm | 32 | F minor | base, p2, p3 | 109.7 s |
| The Hidebehind | `behind` | 72 bpm | 32 | B minor | base, p2, p3 | 106.7 s |
| Old Nobody | `oldnobody` | 96 bpm | 32 | A minor | base, p2, p3 | 80.0 s |

25 stems total. js/music/src/synth.js is the shared voice toolkit every piece is
built from, not a ninth theme, and js/music/src/index.js is just the load order.

Two notes worth carrying:

- **There is a ninth theme id with no composition.** js/music.js's STATE table maps
  `'title'` to `['title', 'camp']`. There is no title.js. Today that falls through to
  the camp theme, which is a perfectly good outcome, so this is a deliberate-looking
  gap rather than a break, but nobody should be surprised when `goto('title')` plays
  the camp bed.
- Act themes fall back down their list, so `act3.combat` with only act1 baked lands
  on act1 rather than on silence. This is why the render order below is what it is.

### What it takes to render one act theme end to end

Assume ffmpeg and Electron are installed. For act1:

1. `npx electron tools/render --only act1`
   Runs the composition's four render functions in a real OfflineAudioContext at
   48000 Hz, folds each layer's reverb tail back onto its own head so the loop has
   no seam, asserts all four layers are the exact same sample count, and writes
   act1_base.wav, act1_l1.wav, act1_l2.wav, act1_l3.wav to tools/render/out/, plus a
   render.log and a render.json reporting peak dBFS per layer. **The peak report is
   the gate**: a layer that clips or comes back far too quiet is a composition fix
   and it has to be fixed before continuing, not after encoding.
2. `node tools/render/encode.cjs --only act1`
   Shells to ffmpeg, writes assets/music/act1_base.<hash8>.webm and the three support
   layers as Opus in WebM (base at 96 kbps, support layers at 64 kbps), and writes
   tools/render/out/samplecounts.json with the exact source sample count per stem.
3. `npm run audio:manifest`
   Indexes assets/ and merges samplecounts.json into assets/manifest.json. Verified
   by reading tools/manifest.cjs lines 161 to 183: the merge is genuinely implemented,
   it keys on the full relative path (which contains the content hash), and it sets
   `samples`, `sampleRate`, `theme` and `layer` per file plus a `themes` table.
4. **Add a call to Music.load.** There is none anywhere in js/. Grep for `Music.load(`
   returns zero call sites. js/audio_director.js only ever calls goto/setHeat/setPhase/
   stop, and every one of those is a silent no-op until something has been loaded.
   Without this step, all of the above is invisible and the game still plays the
   placeholder loop. One line in js/ui.js, at startRun (line 159) and continueRun
   (line 220), plus one for camp at enterCamp (line 247).
5. Play it. `Music.debug()` in the console should report mode `stems` and theme
   `act1`. Then walk the verification loop in the doctrine: loop seam, empty assets
   mode, and the bus and duck check.

The whole cycle is one command per step and the cache in tools/render/out/.rendercache.json
skips themes whose source has not changed, so the second theme onward is faster.

### The order to do the eight in

1. **act1**, because the STATE fallback means one render immediately improves act 1,
   act 2 and act 3 at once, and because it is the theme the current placeholder loop
   evidently grew out of (same key, same 116 bpm), so it is the easiest A/B.
2. **camp**, because camp is currently completely silent (ui.js calls stopMusic on
   entering camp and Music.goto('camp') has nothing to play), it is a single stem,
   and it is the place a player spends unhurried time.
3. **act2**, then 4. **act3**, which is where the three acts stop sounding identical.
5. **bramblebuck**, 6. **mawmole**, 7. **behind**, 8. **oldnobody**. Bosses last
   because a boss with no baked theme leaves the act theme playing rather than
   breaking, so they degrade gracefully, and because Mawmole and the Hidebehind alone
   are about 6 MB of the total.

### Total music size

COMPUTED from loop length times bitrate, so treat it as a ceiling to check against
rather than a measurement: act1 1.2 MB, act2 1.5 MB, act3 0.9 MB, camp 0.45 MB,
bramblebuck 1.7 MB, mawmole 3.1 MB, behind 3.0 MB, oldnobody 2.2 MB. **Roughly 14 MB
for all eight.** With voices, roughly 16 MB of shipped audio in total.

### The loop seam trap and the sample count rule, as build time assertions

The doctrine calls the loop seam out as the thing that will bite. Opus pads a decoded
buffer with silence, so `buffer.duration` is longer than what was rendered and the
padding lands exactly on the seam. The defences, and their status:

| Defence | Where | Status |
|---|---|---|
| Every layer of a theme is the exact same sample count | tools/render/stems.js `assertSameLength`, called from renderer.js line 162 | ALREADY A HARD ASSERTION. Leave it alone. |
| loopEnd comes from the manifest sample count, never from buffer.duration | js/music.js `buildTheme` | ALREADY IMPLEMENTED. Falls back to buffer.duration with a one-time console warning naming the exact fix. |
| Exact sample counts reach the manifest | tools/manifest.cjs lines 161-183 | IMPLEMENTED BUT SOFT. If the sidecar is missing entirely it is skipped in silence; if unreadable it prints a warning and continues. Either way the manifest ships without `samples` and the game silently falls back to padded buffer lengths. |

The gap is that last row, and it is the one that matters, because a stale or missing
sidecar is exactly the failure that produces drifting loops nobody can reproduce.
**The fix is a hard build time assertion in tools/manifest.cjs: if any indexed file
under music/ has no `samples` field after the merge, exit non-zero and name the file.**
Because the merge keys on the full relative path and that path carries the content
hash, a stale sidecar cannot match a freshly encoded file, so it will produce a
missing `samples` field, so this one assertion closes the stale case and the missing
case together. It is roughly ten lines. Do not ship music without it.

---

## 5. POSITIONAL AUDIO

The engine is finished and correct and has never been switched on. `emitter()` and
`playAt()` have zero call sites in the entire repo. `setListener()` has exactly one,
in js/game.js line 748, inside the run, not in camp. The falloff curve was measured
point by point against the campfire recipe and matches the design exactly: full
volume and full brightness inside 60 units, 0.308 gain and an 8495 Hz lowpass at 200
units, 0.064 and 2500 Hz at 400, disconnected entirely past 520. The 24 emitter cap
is real and evicts the farthest.

### What is landing right now

Another agent is wiring the first emitters as this is written. As of the last check
no js file in this worktree had been modified yet, so **verify what actually landed
before starting any unit below.** What that pass is expected to cover:

- The camp campfire as one persistent emitter at world (0, -70), the coordinate camp.js
  already uses for the fire's keep-out circle and its interaction spot.
- A `setListener` call in Camp.prototype.update, after `this.clampWalk(p)` at
  js/camp.js line 929, so the ear exists in camp at all.
- Teardown, which does not exist anywhere today and has to be written from scratch:
  enterCamp (js/ui.js line 247) and quitToTitle (line 283) both discard the whole run
  object without telling the audio system anything, and Run.advance (js/run.js, the
  `g.room = room` reassignment) is the room-to-room swap where a previous room's
  emitters must be stopped. There is no per-owner or clear-all API on AudioSys, and
  `emitter()` does not dedupe the way `hold()` does, so a campfire created on every
  camp entry instead of once would slowly eat the 24 slot cap and present as "the
  fire randomly stops sometimes".

### What remains after it

- **The lake.** Not a point, a shoreline. camp.js already has a `bankY(x)` helper for
  the shore curve. Two or three `water` emitters along it (x = -200, 0, 200 at
  y = bankY(x)) rather than one, or it will not read as a lake the width of the camp.
  The lake only exists at tier 2 and up, so creation is gated on that.
- **Room pools.** Every room layout in js/rooms.js carries a decorative `dressing`
  array. At least 15 `{ kind: 'pool' }` entries across the layouts, and room-local
  coordinates ARE world coordinates while a room is loaded (js/game.js lines 738-741),
  so they can be handed straight to a `water` emitter with no conversion.
- **Burnband embers.** At least 8 `{ kind: 'burnband' }` line segments. Each needs a
  midpoint or two or three points spaced along it for a `hazard` emitter. This is the
  only real fit found for the hazard recipe: there is no spike or poison or damage
  zone mechanic anywhere for it to belong to.
- **The torch recipe has no target.** There is no torch, lantern flame, hearth or
  stove anywhere in camp.js. The "lantern poles" and the "cabin porch light" are
  firefly spawn markers, not lit props. Wiring torch to them is a design call for you,
  not a mechanical hookup waiting to happen. Below the line until you say otherwise.
- **The room named THE FIRE PIT (a1_r_firepit, rooms.js line 1985) has no fire
  dressing entry at all.** If a campfire loop belongs there somebody has to pick a
  coordinate; the stump ring centres around (320, 310).
- **Heat driven ambience mixing.** js/audio_director.js already computes a continuous
  heat value every frame, rising over 0.45 s and falling over 2.6 s. Nothing feeds it
  into the emitter layer, so a fire crackles at the same level during a boss fight as
  it does in an empty room. Ducking ambience against heat is the cheapest way to make
  the world sound like it is reacting.
- **Boss telegraph audio.** js/director.js plays `roar` about a dozen times as a flat
  non-positional cue. `playAt()` at the boss's position, which already exists and is
  already correct, would turn every telegraph into information about where the boss
  is. This is the single highest gameplay value use of the positional engine and it
  is one function swap per call site.

---

## 6. THE MIX

Measured on a real render of the real code: the worktree served on port 8318, the
game's own AudioSys bound to an OfflineAudioContext, and the result analysed with a
real ITU-R BS.1770 K-weighted analyser that was first validated against a textbook
reference tone (a -20 dBFS 997 Hz sine measured -23.01 LUFS, the exact known
calibration point).

| Scene | Music alone | Sfx alone | Full mix | Worst peak |
|---|---|---|---|---|
| Busiest realistic fight | -46.88 LUFS | -25.66 LUFS | -25.52 LUFS | -13.08 dBFS |
| Quietest realistic scene | -48.71 LUFS | -26.85 LUFS | -26.77 LUFS | -18.68 dBFS |

Three things are wrong, and they are all in those two rows.

**1. The music is inaudible. Gap measured at 21.2 dB in the fight, 21.9 dB in the
quiet scene.** The full mix comes out within 0.3 LU of sfx alone in both scenes,
which is the numerical way of saying the music contributes nothing a player will
consciously hear. Nobody can judge the new soundtrack while this is true.
- TARGET: music sits **10 dB** under sfx in the busiest fight, and **4 dB** under in
  the quiet scene. That is roughly +11 dB on musicBus in combat and a wider gap that
  narrows when nothing is happening.

**2. Ambient loops are as loud as combat.** A single torch loop measured -26.85 LUFS
against -25.66 LUFS for the entire busiest fight. An ambient bed 1.2 dB under a boss
fight is not a bed, it is a competitor.
- TARGET: an ambient emitter bed sits **12 dB** under the busiest combat sfx, so
  roughly -38 LUFS alone. That means the emitter recipe gains come down: campfire is
  at 0.55, torch 0.30, water 0.35, hazard 0.40, and the campfire figure is the one
  that will be obviously too hot the moment the fire is switched on.

**3. There is roughly 12 dB of unused headroom and nothing is using it.** Worst
measured peak anywhere is -13.08 dBFS. There is no loudness target written down
anywhere in the code or the doctrine, so nothing has ever been aimed at.
- TARGET, and write it into the doctrine so it is not re-derived every time:
  **busiest fight full mix at -18 LUFS integrated, plus or minus 1 LU, true peak at
  or below -3 dBFS.** Today: -25.52 LUFS. That is about 7.5 dB of overall lift
  available before anything is at risk.

Two things are measured as correct and should be left alone:

- **Ducking.** Driven with voice.js's real parameters, the music bus reaches 95
  percent of its -6 dB target in about 80 ms and settles by 150-200 ms, and recovers
  to 99 percent in about 0.6 s. The stinger bus measured at exactly 1.0 throughout,
  so the duck exemption is real and not just documented. It is currently unreachable
  in play only because there are no voice lines to trigger it, which section 3 fixes.
- **The falloff curve.** Matches its design point for point, all four recipes.

One more, which is a bug and not a level: **the flame stutters.** The Marshmallow
Roaster fires every 0.16 s while held (js/data.js line 54) and plays a 0.18 s
one-shot noise burst each time, so every burst starts before the previous one has
finished and holding the trigger sounds like chatter rather than fire. The fix
already exists in js/audio.js and is never called: `hold('flame')` is a real
sustained looping fire voice with two LFOs, one wobbling the cutoff and one breathing
the amplitude, and it is refcounted so calling it repeatedly is safe. This is a call
site change in js/game.js only. audio.js needs no change for it.

---

## 7. UNITS

Waves run in order. Within a wave, no two units touch the same file, so a wave can be
dispatched in parallel. Across waves, a file may be revisited.

`assets/manifest.json`, `assets/music/**`, `assets/voice/**` and
`tools/render/out/**` are BUILD OUTPUTS, produced by scripts, never hand edited, and
are excluded from file ownership. Regenerating them is idempotent.

### Wave 0: the gate (you, not an agent)

Decide section 2. Nothing below can start without it. Music track needs `npm install`
plus `winget install Gyan.FFmpeg`. Voice track needs those plus the torch and Kokoro
stack.

### Wave 1: voices

**V1. Resolve the voice licence contradiction.**
Files: `tools/voice/gen.py`, `.claude/agents/sound-designer.md`.
Make the doctrine and the text gen.py writes into LICENSE-VOICES.md say the same
thing about whether Apache 2.0 covers the voice packs. Must be done before the first
real generation, because the first real run creates that file.
Acceptance: `python tools/voice/gen.py --dry-run --speaker brock --limit 1` runs
clean, and the two texts agree word for word on the licence claim.

**V2. The decode gate, and the first real measurement.**
Files: none (build outputs only).
`python tools/voice/gen.py --speaker brock --limit 3`. Time it with a stopwatch.
Acceptance: three .webm files exist; one of them decodes in Chrome, Firefox AND Edge;
integrated loudness and true peak reported for all three; the measured
seconds-per-line recorded and multiplied by 157 to give the real full-run figure.
If any browser fails to decode, STOP: everything after this is wasted until it is
fixed.

**V3. The recipe evaluation round.**
Files: `tools/voice/voices.json`.
One line per speaker with `--force`, all seven listened to back to back. Junie comes
down to at most +4 semitones per the doctrine's kid cap, or gets a written exception.
Acceptance: seven files, one per speaker; loudness and peak per speaker reported;
a one line plain words description of how each one actually sounds, compared against
section 3's casting; the Junie cap resolved either way.

**V4. Generate and ship all 156 lines.**
Files: none (build outputs only).
`npm run audio:voice` then `npm run audio:manifest`. No game code change: js/voice.js
self-boots and finds the files on its own.
Acceptance: exactly 156 files under assets/voice/en/; assets/manifest.json contains
groups `voice:max`, `voice:junie`, `voice:gus`, `voice:brock`, `voice:hare`,
`voice:vicar`, `voice:antlered` and a `camp` group holding Brock's lines; the `prune`
list is empty; total bytes reported; `Voice.available` is true in the browser; all 48
Brock lines listened to; then **rename assets/ out of the way and confirm the game
still runs, still shows every dialogue bubble, and throws no errors.** That last check
is not optional, it is the doctrine's tier zero rule.

**V5. Prove the duck with a real line.**
Files: none (measurement only), or `js/voice.js` if a change proves necessary.
Acceptance: a real bark measured over combat sfx, reporting duck depth on music and
sfx, attack time, release time, and that the stinger bus stayed at 1.0. Compare
against the already measured -6 dB / 80 ms / 0.6 s figures in section 6.

### Wave 2: the mix (parallel with wave 1, shares no files with it)

**M1. Rebalance to the section 6 targets.**
Files: `js/audio.js`, `.claude/agents/sound-designer.md`.
Raise the music bus, lower the four EMITTERS recipe gains, lift the overall mix into
the headroom, and write the loudness target into the doctrine so nobody re-derives it.
MEASURE, DO NOT ESTIMATE: the doctrine records that a previous headroom change was
set by reasoning about gain staging and shipped music two decibels hot.
Acceptance: the same two scenes re-measured with the same K-weighted analyser and
reported as a before and after table; busiest fight full mix within 1 LU of -18 LUFS;
true peak at or below -3 dBFS; music to sfx gap 10 dB in the fight; a single ambient
loop 12 dB under the busiest fight; mute and both volume sliders still work.

**M2. Stop the flame stuttering.**
Files: `js/game.js`.
In the roaster branch of fireWeapon, call `AudioSys.hold('flame')` once when fire
starts being held and stop it on release, instead of `play('flame')` every 0.16 s.
Ember Drag keeps `play('flame')`: it is a single arm cue, not a held weapon.
Acceptance: hold the roaster for five seconds and hear one continuous flame with no
retrigger chatter; release and hear it stop cleanly with no tail cut; nodes created
per second while holding reported before and after (this is the point of the change);
swap weapons mid-hold and confirm the loop stops.

Note: M2 and any positional wiring in flight both touch js/game.js. Sequence M2 after
the positional pass lands, or hand both to the same agent.

### Wave 3: music

**S1. Make the sample count rule a build failure.**
Files: `tools/manifest.cjs`.
After the samplecounts merge, if any indexed file under `music/` has no `samples`
field, print the offending paths and exit non-zero.
Acceptance: with a valid sidecar the script exits 0 and the manifest carries `samples`
for every music file; with the sidecar deleted the script exits non-zero and names
every file; with a deliberately stale sidecar (edit one hash) it exits non-zero and
names exactly that file.

**S2. Render, encode and wire act1 and camp.**
Files: `js/ui.js`.
Run the four step cycle for act1 and camp, then add the missing `Music.load` calls at
startRun (line 159), continueRun (line 220) and enterCamp (line 247). This is the
unit that turns the whole music system from dead code into audible music.
Acceptance: `Music.debug()` reports mode `stems`, theme `act1` in a run and `camp` in
camp; peak dBFS per layer from render.json reported; two consecutive loops rendered
end to end and the joint inspected for a click or a gap, with the sample offset used
stated; heat crossfades audibly move the l1/l2/l3 layers in and out; and with assets/
renamed away the game falls back to the procedural loop with no error.

**S3. Render the remaining six themes.**
Files: none (build outputs only).
act2, act3, bramblebuck, mawmole, behind, oldnobody, in that order.
Acceptance: per theme, peak dBFS per layer, loop seam checked, total encoded bytes,
and the theme confirmed playing in the right place in game (boss themes by starting
that boss). Any theme that fails its listen goes below the line and STATE fallback
covers it, so a failure here never blocks the release.

### Wave 4: positional remainder

**P1. The lake.**
Files: `js/camp.js`.
Two or three `water` emitters along `bankY(x)`, created at tier 2, torn down with the
rest of camp's audio.
Acceptance: walk the shoreline and report gain, pan and cutoff at four positions;
walk from the fire to the dock and confirm the two beds cross over rather than one
cutting out; `emitterCount` returns to its pre-camp value after leaving camp; enter
and leave camp ten times and confirm `emitterCount` does not grow.

**P2. Boss telegraphs become positional.**
Files: `js/director.js`.
Swap the roughly twelve `play('roar')` telegraph calls for `playAt` at the boss's
position. Nothing else in director.js changes.
Acceptance: stand left of a boss, hear the telegraph left; walk past it and report
gain and pan at four positions; confirm a telegraph is still clearly audible at the
far edge of the arena, since this is gameplay information and must not be lost to
distance.

### Below the line, named, in section 8

---

## 8. WHAT SHIPS IN 2.1, AND WHAT WAITS

You asked for voices in 2.1, before the 3.0 content wave. Voices are wave 1 and the
only thing ahead of them is your dependency decision.

### Ships in 2.1

- All 156 voice lines, all seven speakers, with LICENSE-VOICES.md as the provenance
  record. (V1 to V5, roughly 2.3 MB.)
- The mix rebalanced to a written target, so the music is audible and the ambience
  sits under the fight. (M1.)
- The flame stops stuttering. (M2.)
- The campfire and the lake, positional, in camp, with real teardown. (whatever the
  in-flight pass lands, plus P1.)
- Boss telegraphs that tell you where the boss is. (P2.)
- act1 and camp music, wired, with the sample count rule enforced as a build failure.
  (S1, S2.)
- act2, act3 and the four boss themes if they pass their listen. (S3.)

That is roughly 16 MB of shipped audio and the whole system going from "designed" to
"switched on".

### Waits for 3.0 or later, and why

- **Footsteps.** js/footsteps.js is a two line empty stub and `Footsteps.update` is
  not called from anywhere. That is not a tuning job, it is a whole surface-aware
  system plus a hook into the frame loop, in a game about constant movement, so it
  will take real design time. Below the line because it would delay voices.
- **Per-room pool and burnband emitters.** 15 pools and 8 burnbands across layouts
  that are about to change anyway in the 3.0 content wave, plus the room-to-room
  teardown in Run.advance that has to be written from scratch. Doing this before 3.0
  means doing it twice.
- **Heat driven ambience mixing.** Wants the mix rebalance (M1) to be settled first,
  or it is tuning against a moving target.
- **The torch recipe.** It has no target in the game. It needs a design call from you
  about whether the lantern poles and the cabin porch light are lit props, and design
  calls are not a thing an agent should invent.
- **A fire loop in THE FIRE PIT room.** Needs a coordinate chosen, which is the same
  kind of call.
- **A title theme.** js/music.js expects one and there is no composition. Falls back
  to the camp bed, which is fine. Writing a ninth piece is composition work, not
  release work.
- **Anything that would delay voices.** If wave 3 or wave 4 slips, they slip. Voices
  ship.

---

## 9. RISKS

**Risk 1: the Kokoro stack does not work on this Windows machine.** The classic
failure is the espeak-ng phonemizer not being found, or a torch wheel that will not
load. Nothing in this document has been run against a real install, because nothing
is installed.
Cheap early test: **V2, the three line Brock batch, is this test.** It costs one
generation run after the installs and it tells you whether the whole voice track is
alive. Do it before anything else touches voice.
If it fails: voice absence is already a shipped and tested mode, verified in the
browser with `Voice.available` false and no errors, so 2.1 becomes a music and mix
release with nothing broken. The failure is a delay, not damage.

**Risk 2: the encoded files do not decode everywhere, and 156 of them get
regenerated.** This is the doctrine's own first verification step and it is first for
a reason. Opus in WebM at 24 kHz mono is not the most travelled path, and the music
side has the same exposure with a different failure: Opus pads decoded buffers with
silence, so a manifest missing its sample counts produces loops that drift a little
further every pass and sound wrong after ten minutes in a way nobody can reproduce.
Cheap early test: **decode ONE file in Chrome, Firefox and Edge before generating any
set**, once for voice (V2) and once for music (S2). Then make the padding case
impossible rather than unlikely: **S1 turns a missing sample count from a silent
fallback into a build failure**, which is roughly ten lines in tools/manifest.cjs and
is the highest value defensive code in this whole plan.

**Risk 3: the mix rebalance ships hot.** The doctrine records this exact scar: a
previous headroom change was set by reasoning about gain staging and shipped music two
decibels hot. M1 raises the music bus by roughly 11 dB relative and lifts the whole
mix into 12 dB of headroom, which is precisely the change most likely to repeat it,
and the danger doubles because voices and music arrive at the same time and each will
be blamed for the other's level.
Cheap early test: the measurement harness that produced every number in section 6
already exists and needs no install: serve the worktree on port 8318, bind AudioSys
to an OfflineAudioContext, analyse with the K-weighted analyser, which was validated
against a -20 dBFS 997 Hz reference tone reading -23.01 LUFS. **Re-measure both
scenes before and after M1 and report both tables.** Never set a level by arithmetic.

---

## Appendix: verified facts this plan rests on

- 156 voiceable lines, 8571 spoken characters, from `node tools/voice/dump_lines.cjs`.
- 8 compositions, 25 stems, all real, from `node tools/render/selftest.cjs` (47 of 47
  checks passed, including building every layer of every composition).
- assets/manifest.json is empty: no files, `core` and `camp` groups both empty arrays.
- assets/voice/ and assets/music/ do not exist on disk.
- `Music.load(` has zero call sites in js/. `emitter(` and `playAt(` have zero call
  sites. `setListener` has one, js/game.js line 748. `Footsteps.update` has zero.
- js/voice.js self-boots (`try { init(); } catch (e) {}` at the bottom), so voice
  needs no code change to start working once files exist.
- tools/manifest.cjs lines 161-183 really do merge samplecounts.json, keyed on the
  full relative path, which contains the content hash.
- Python 3.12.10 is present. ffmpeg is not. node_modules does not exist, so Electron
  is not either.
- Loudness figures in section 6 were measured on a real render of the real code with
  a BS.1770 analyser validated against a reference tone.
