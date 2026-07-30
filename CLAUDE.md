# Merit Badge Massacre

A top down action roguelite. Belief is sight and it runs out with age, so only
teenagers can see what is in the woods, and five survivors sheltering at a dead
scout camp go out into it. Three acts of rooms, three bosses.

THE REPO IS MID-REBOOT AND ITS NAMES ARE STALE. The code, the folder and README
still say Merit Badge Massacre and still describe three scouts (Max, Junie,
Gus). Both are superseded: the working title is PAST THE TREELINE and the cast
is five non-scout survivors (Dez, Junior, Vic, Hollis, Mikey). Nothing has been
renamed in code yet, on purpose, because display names and internal ids stay
separate (see GOTCHAS). Trust `docs\preproduction\RULINGS.md` over any name you
find in source or README.

It is BUILT as a browser game (index.html plus plain `js/*.js` script tags, no
bundler, no build step for the code itself) and packaged as an Electron desktop
app (see package.json's `build` block). SHIPPING IS RULED STEAM ONLY, with a
playable demo on Steam. The browser build is retired as a shipping surface and
kept as an internal build target, so it is still how the game is run and tested,
just not how it reaches players. Every sprite is code painted at runtime
(js/sprites.js) and every sound effect is synthesised in code; music and voice
lines are the exception, pre-rendered to 223 `.webm` files plus a manifest under
`assets\`, shipped inside the Electron package. CODE PAINTED ART IS BEING
RETIRED: authored assets replace it, and ART_STYLE.md is superseded, so do not
take art direction from it.

## COMMANDS

Verified against package.json:

- `npm start` -> `electron .` : run the desktop app windowed.
- `npm run pack` -> `electron-builder --dir` : unpacked desktop build into `dist\win-unpacked`.
- `npm run dist` -> `electron-builder` : full Windows installer into `dist\`.
- `npm run audio:voice` -> `node tools/voice/dump_lines.cjs && python tools/voice/gen.py` : regenerates voice line audio.
- `npm run audio:music` -> `electron tools/render && node tools/render/encode.cjs` : renders and encodes music.
- `npm run audio:music:test` -> `node tools/render/selftest.cjs` : music render self test.
- `npm run audio:manifest` -> `node tools/manifest.cjs` : rebuilds `assets\manifest.json`.
- `npm run rooms:check` -> `node tools/validate_rooms.cjs` : the layout validator, see below.
- `npm test` -> `node tools/smoke.cjs` : the engine smoke test, see below.
- `npm run masters:check` -> `node tools/validate_masters.cjs` : the master file gate, see below.

There is no tsconfig, no eslint config and no `.github` directory (checked:
none present at repo root).

To play or serve the game locally in a browser (not the Electron shell): open
`index.html` directly, or serve it to sidestep local file restrictions, per
README.md:

    npx http-server . -p 8317

`http-server` is not a devDependency, so `npx` fetches it on demand.

## WHERE CANON LIVES

`docs\preproduction\RULINGS.md` EXISTS AND IT OUTRANKS EVERYTHING. It is the
single file that governs every other design document, both in
`docs\preproduction\` (BOSS_DESIGN.md, COMBAT_ARCHITECTURE.md, ENEMY_DESIGN.md,
and the rest) and at the repo root (ART_STYLE.md, BUILD_ARCHITECTURE.md,
COOP_DESIGN.md, LEVEL_DESIGN.md, and the rest). Those documents are large
(several run past 100 KB) and must not be quoted directly in a brief or a
commit once RULINGS.md covers the point: point at RULINGS.md instead.

Read it before writing any brief. It exists because the three grounding audits
contradicted each other in eleven places and two claims in canon were
factually wrong, so a document that looks authoritative may be superseded on
exactly the point you are about to cite.

## THE CANONICAL PATTERN

`js\traits.js` is the file to imitate for structure. It opens with a doctrine
comment that states the problem it replaced and why the new shape scales
(a closed trait vocabulary walked in a fixed pipeline order, called through
single doors like `Game.armShot`), and it carries a self-auditing table
(`SCOPE_TABLE`, checked by `auditScopes()`) that fails loudly at load if a
cell is ever left unfilled, rather than silently doing nothing. New systems
should be data the code reads and audits, not a comment promising behaviour
nobody checks.

## THE VALIDATOR PATTERN

`tools\validate_rooms.cjs` and `tools\smoke.cjs` are the working automated
gates in the repo, and they are the same shape.

`validate_rooms.cjs` concatenates the real engine source (`data.js`,
`props.js`, `collide.js`, `room.js`, `rooms.js`) behind a small stub and
evaluates it once in a Node `vm` context: no DOM, no canvas, no game state,
just the real logic run headlessly. It has a documented CLI (`--layout <id>`,
`--json`, `--verbose`, `--selftest`) and exits 1 if any layout fails a
predicate that was actually evaluated, 0 otherwise. ITS CURRENT BASELINE IS A
FAILURE: 33 of 46 layouts fail at least one predicate, 85 failures, exit code
1. That is the known state, not a regression you just caused.

`smoke.cjs` is `npm test` and copies that pattern with ten engine files. Four
checks: a META save round trip, seed reproducibility through `Run.begin`, the
rng cursor read and seek, and item offer determinism. It exits 0 today. It
stops below `js\ui.js`, which takes a 2d canvas context at file scope, so no
Node harness can load that file. It also prints a `Math.random` call site
count as a RATCHET rather than a gate: 51 real sites, and the number should
only ever go down.

`validate_masters.cjs` is `npm run masters:check`, the third gate, and it keeps
the master file system honest. START AT `merit-badge-massacre.md`: every
significant folder holds a master named after itself that lists every file in
it and links to the masters below it, so following the links from the root
gives you the whole project's scope before you open any source. The gate fails
when a folder gains a file its master does not name, when a master cites a path
that does not exist, when a master stops being reachable from the root, or when
one picks up a dash or a non-ASCII byte. It derives which folders need a master
from the tree rather than a hard-coded list, and it honours nested `.gitignore`
files. It exits 0 today.

New tooling copies this shape: load real engine code headlessly, expose a CLI
with `--json` and `--selftest`, and return a real nonzero exit code on
failure.

## GOTCHAS

- Cute is dead. The tone is eerie and adult, played straight. Any friendly,
  big-eyed, storybook treatment is a defect.
- No em dashes or en dashes anywhere: not in code, comments, commits, docs or
  copy. Use commas, colons, or parentheses.
- No emojis anywhere, including escaped forms. If a pictogram is needed, an
  icon gets designed.
- Effort is sized S/M/L/XL, never in days or hours.
- THE COMPLETENESS CLAIM RULE: no statement of the form "all callers",
  "nothing references this", "no seed exists", "safe to delete" goes into a
  brief or a commit message until it has been independently verified with a
  grep or by opening the file. Three such claims were made in one session
  recently and all three were false.
- Display names and internal ids are separate forever. Renaming a thing in
  fiction never moves a storage key, a feat id, a painter id or a save field.
