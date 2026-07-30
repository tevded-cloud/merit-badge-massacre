# js/music/src/

OFFLINE RENDER TOOLING, not shipped runtime code, despite living under `js/`.
Every file here is composition data for `tools/render/`: `index.html` does
not load any of them, and none of them run in the browser build or the
Electron shell. The music that actually ships is the pre-rendered `.webm`
files under `assets/music/`, baked from these sources by
`npx electron tools/render` (see `tools/render/render.md`). The live runtime
synth the game actually plays through is `js/audio.js`; the layer that will
eventually play the baked stems back is `js/music.js`. Read `README.md` in
full before editing anything here; it is the contract every composition file
must follow.

- `README.md`: the composition file contract in full. What a classic script
  composition must push onto `MBM_COMPOSITIONS`, the rules the render harness
  enforces (every layer of a theme must be exactly the same sample count,
  loop length computed once and the tail folded not cut, no underscore in a
  theme or layer id, `base` always the drum carrying layer), and the full
  `MBMSynth` helper table. A file added here also has to be added to
  `index.js` or the harness never sees it.

- `index.js`: the source list `tools/render/main.cjs` reads to know which
  files to hash and hand to the render page, and the load order
  `tools/render/index.html` uses: `synth.js` first (registers the shared
  `MBMSynth` global), then every composition file. Add a new composition file
  here or it is invisible to the render harness no matter how correct its
  own code is.

- `synth.js`: registers `MBMSynth`, the shared helper library every
  composition file builds with (`tone`, `noise`, `kick`/`snare`/`hat`, `pad`,
  `pluck`, `sub`, `airBed`, `reverb`, `echo`, `tremolo`, `pump`, plus
  `midi`/`hz`/`db` note conversion). Deliberately richer than the live
  scheduler in `js/audio.js`: detuned oscillator stacks, filter envelopes, a
  generated convolution reverb, sidechain style pumping. Fully deterministic,
  seeded noise only, no `Math.random`, since the render cache and the
  `hash8` in each output filename both depend on identical source producing
  byte identical audio.

- `act1.js`: the act 1 theme, "act1" (file name stem, no underscore). 116
  bpm, 16 bars, A minor. Four layers of equal length: `base` (drums, bass,
  room tone, always audible), `l1` (harmonic bed), `l2` (lead motif), `l3`
  (peril, tremolo dissonance).

- `act2.js`: the act 2 theme, "act2", THE SOG. 92 bpm, 16 bars, D minor. Same
  four layer shape as `act1.js` (`base`, `l1`, `l2`, `l3`), half time and
  waterlogged where act 1 marches.

- `act3.js`: the act 3 theme, "act3", THE BURN. 144 bpm, 16 bars, E minor.
  Same four layer shape as `act1.js`, four on the floor and urgent where
  act 1 marches and act 2 sinks.

- `camp.js`: the between runs theme, "camp". 68 bpm, 16 bars, C major, one
  stem only (`warm`): no drums or percussion of any kind, since camp is not a
  fight. C major is act 1's relative major on purpose, so leaving camp for a
  run is a mood shift, not a key change.

- `boss_bramblebuck.js`: the jackalope boss theme, "bramblebuck". 128 bpm, 32
  bars, G minor. Boss layers stack rather than crossfade: `base` (phase 1,
  must carry the fight alone), `p2` (phase 2, added on top), `p3` (phase 3,
  added on top of both).

- `boss_mawmole.js`: the star nosed mole boss theme, "mawmole". 70 bpm, 32
  bars, F minor. Same stacking layer shape as `boss_bramblebuck.js`: `base`,
  `p2`, `p3`.

- `boss_behind.js`: the hidebehind boss theme, "behind". 72 bpm, 32 bars, B
  minor. Same stacking layer shape as `boss_bramblebuck.js`: `base`, `p2`,
  `p3`, but mixed far below the other bosses on purpose, since this fight
  gets louder by adding almost nothing.

- `boss_oldnobody.js`: the final boss theme, "oldnobody". 96 bpm, 32 bars, A
  minor. Same stacking layer shape as `boss_bramblebuck.js`: `base`, `p2`,
  `p3`. `p2` quotes act 1's lead motif from `act1.js`, transformed, which is
  the one place a composition file deliberately echoes another.
