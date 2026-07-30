# tools/

Author tooling. Nothing under `tools/` ships: `electron-builder`'s packaged
build does not include this folder, and none of it is loaded by `index.html`.
It exists to build assets and to check engine data before either reaches a
player.

## Files directly here

- `manifest.cjs`: run via `npm run audio:manifest`. Walks the whole `assets/`
  tree (art, music, voice, whatever exists) and writes `assets/manifest.json`,
  the file `js/assets.js` reads at runtime to know what it can optionally
  load. Placed at `tools/` rather than `tools/voice/` on purpose: it is a
  general asset packager that the voice pipeline happens to depend on for the
  speaker and `spokenText` lookup (it reads `tools/voice/lines.json`), not a
  voice only tool. Must always succeed, even with no `assets/` folder at all,
  because the game itself is built to run with none.

- `smoke.cjs`: `npm test`. The engine smoke test, written the day before this
  master file system landed, and the newest of the two gates here. It
  concatenates ten real engine files (traits, stats, pool, data, rooms, meta,
  collide, props, room, run) behind a small stub and evaluates them once in a
  Node `vm` context: no DOM, no canvas. Four checks: a META save round trip, a
  seed reproducibility check through `Run.begin`, an rng cursor read and seek
  check, and item offer determinism. It deliberately stops below `js/ui.js`,
  which takes a 2D canvas context at file scope, so a Node harness cannot load
  it, and it never loads `js/game.js` either. It also prints a `Math.random`
  call site count as a ratchet, not a gate: the count should only ever go
  down. Exits 0 today.

- `validate_rooms.cjs`: `npm run rooms:check`. The layout validator and the
  house pattern every other headless tool here copies: it concatenates real
  engine source (`data.js`, `props.js`, `collide.js`, `room.js`, `rooms.js`)
  behind a small stub and evaluates it once in a Node `vm` context, so the
  real logic runs with no DOM and no canvas. CLI: `--layout <id>`, `--json`,
  `--verbose`, `--selftest`. Exits 1 when any layout fails a predicate that
  was actually evaluated, 0 otherwise. ITS CURRENT BASELINE IS A FAILURE: 33
  of 46 layouts fail at least one predicate, 85 failures, exit code 1. That is
  the known state, not a regression: an agent that runs this and sees red
  should not go hunting for what they broke.

- `validate_masters.cjs`: the gate for this very master file system (this
  file's own sibling, written by another agent alongside this one). Fails
  when a folder contains a file its master does not name, when a master names
  a path that does not exist, or when a master is unreachable by links from
  the root master. Without it, a master file can silently drift out of sync
  with the folder it describes, which is worse than no master at all.

## Mastered children

- [tools/render/render.md](render/render.md): the Electron based offline
  music render harness, `npm run audio:music`. Bakes the composition sources
  in `js/music/src/` into the `.webm` stems under `assets/music/`.
- [tools/voice/voice.md](voice/voice.md): the voice line pipeline,
  `npm run audio:voice`. Turns `js/dialogue.js` into the `.webm` files under
  `assets/voice/en/`.
