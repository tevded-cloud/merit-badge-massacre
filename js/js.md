# js

The game. 33 plain script files, no module system: no `import`, no `export`, no
bundler and no build step. `index.html` loads all 33 with ordinary `<script
src>` tags and every top level `const` in them becomes a shared global visible
to every file that loads after it. Nothing in the source states what depends on
what, so the load order below IS the dependency contract, and this file is where
it is written down.

Read this before opening anything in here. The per file entries say what job a
file holds, not what is inside it, so you can pick the right file on the first
try.

Mastered child folder:

- [js/music/src/src.md](music/src/src.md): the offline music composition
  sources. Data for the render harness in `tools/render/`, NOT shipped runtime
  code. `index.html` never loads any of it (grep: `grep -n "js/music" index.html`
  returns exactly one hit, line 638, and that is `js/music.js`, a different
  file). The stems those sources bake into are what `js/music.js` plays.

Canon: `docs/preproduction/RULINGS.md` outranks every other design document in
this repo. `ART_STYLE.md` at the repo root is a superseded stub and must not be
used for art direction.

## Load order

Read off `index.html:634-666`, in order, one script tag each:

1. `sprites.js` (index.html:634)
2. `portraits.js` (635)
3. `assets.js` (636)
4. `audio.js` (637)
5. `music.js` (638)
6. `voice.js` (639)
7. `hooks.js` (640)
8. `traits.js` (641)
9. `stats.js` (642)
10. `pool.js` (643)
11. `data.js` (644)
12. `rooms.js` (645)
13. `meta.js` (646)
14. `roster.js` (647)
15. `feats.js` (648)
16. `dialogue.js` (649)
17. `finds.js` (650)
18. `collide.js` (651)
19. `game.js` (652)
20. `render.js` (653)
21. `props.js` (654)
22. `director.js` (655)
23. `room.js` (656)
24. `run.js` (657)
25. `dodge.js` (658)
26. `reticle.js` (659)
27. `transition.js` (660)
28. `audio_director.js` (661)
29. `footsteps.js` (662)
30. `touch.js` (663)
31. `camp.js` (664)
32. `ui.js` (665)
33. `devtools.js` (666)

### The rule that makes this order survivable

A file may reference a name that is declared in a LATER file, as long as it only
does so from inside a function body. By the time anything calls that function
the whole page has loaded and every global exists. Only a reference evaluated at
MODULE SCOPE (the top level of the file, including the top level of a file's
wrapping IIFE, which runs at load) needs its target to already be there.

Verified rather than assumed. `pool.js` loads at `index.html:643`, one tag
BEFORE `data.js` at `index.html:644`, and it reads `DATA.WEAPON_MAX`,
`DATA.weapons` and `DATA.passives` at `js/pool.js:149`, `js/pool.js:154` and
`js/pool.js:159`. Those reads sit inside `candidates()`, which nothing calls
until a level up, so the backwards looking order is harmless. This is the normal
case in this folder, not an exception.

### Where the order IS load bearing

These are the module scope dependencies. Move one of these files up the list and
the page throws on load.

- **Five files hang methods on `Game.prototype` at module scope**, so all five
  must load after `game.js` (index.html:652): `render.js` (16 assignments),
  `props.js` (4), `director.js` (60), `room.js` (2), `dodge.js` (4). None is
  guarded by a `typeof Game` check, so the assignment runs the instant the file
  loads. Proven with
  `grep -nE "^ {0,2}Game\.prototype\.[A-Za-z_]+ = " js/*.js`, which returns hits
  in exactly those five files plus `game.js` itself and nowhere else.
- **`director.js` needs the method, not just the identifier.**
  `js/director.js:34` reads `const rawGainCoins = Game.prototype.gainCoins;` at
  module scope and wraps it, so `game.js` must not merely have declared `Game`
  by then, it must already have defined `gainCoins`.
- **`ui.js` is the boot sequence and must be second to last.** Its module scope
  gets a canvas 2d context (`js/ui.js:79-81`), paints the coin icon through
  `SPR.icon`, then runs `Touch.init(cv)`, `syncFeatPools()`, `buildSelect()`,
  `setState('title')` and `requestAnimationFrame(frame)` at `js/ui.js:2185-2191`.
  That start up reaches into `sprites.js`, `touch.js`, `feats.js`, `data.js` and
  `meta.js` at load time, which is why it sits after all of them.
- **`traits.js` self audits at load.** `js/traits.js:1006` runs
  `const AUDIT = auditScopes();` and logs a loud console error if the scope table
  has an unfilled cell. That is a self check, not a cross file dependency: it
  touches nothing outside `traits.js`.

Everything else in the list is ordered by convention (art, then audio, then
substrate, then data, then sim, then shell) rather than by necessity.

### The testing constraint, and it is the big one

`js/ui.js` calls `getContext('2d')` at FILE SCOPE (`js/ui.js:79-81`) and starts a
`requestAnimationFrame` loop at `js/ui.js:2191`. No Node harness can load it at
all. `tools/smoke.cjs` deliberately stops below it and does not load `game.js`
either. Anything you want covered by an automated test has to be reachable
without `ui.js`, which means the shell, the HUD, the screens and the boot
sequence are all untestable headlessly today. Plan around it.

`js/ui.js:7` sets `MBM_FIELD = false`, so the ROOM RUNTIME is the live path and
the 1.0 open field is the debug path. `MBM_FIELD` is declared and read only in
`ui.js` (grep: `grep -rn "MBM_FIELD" js/*.js index.html tools/*.cjs` returns the
declaration at `js/ui.js:7`, four executable reads at `js/ui.js:172`, `:188`,
`:1383`, `:1396`, and otherwise only comments in `game.js`, `room.js`, `rooms.js`
and `run.js`).

### The pattern to imitate

`js/traits.js` is the canonical structure file for this repo. It opens with a
doctrine comment stating the problem it replaced, walks a closed vocabulary in
fixed pipeline order, and carries a self auditing `SCOPE_TABLE`
(`js/traits.js:496`) checked by `auditScopes()` (`js/traits.js:576`) that fails
loudly at load if a cell is unfilled. New systems are supposed to be data the
code reads and audits, not a comment promising behaviour nobody checks.

## Boot and shell

- **ui.js** The shell: title, character select, HUD, pause, settings, records,
  level up cards, toasts, and the single `requestAnimationFrame` frame loop that
  drives everything else. Owns `INPUT` (keys and mouse), `SETTINGS`, `App` state
  and the `MBM_FIELD` switch. It is the boot sequence, so it runs at load: see
  the load order notes above. Nothing here can be loaded in Node.
- **devtools.js** A developer cheat overlay on the backquote key: live tuning
  over `DATA`, granting, spawning, warping, plus save guards so nothing granted
  reaches a real save. It wraps existing prototype methods at runtime instead of
  editing `game.js` or `traits.js`. It is loaded UNCONDITIONALLY at
  `index.html:666`, with no environment guard, so it ships in the public build.
  That is a known open item, not a decision anyone made.

## Simulation core

- **game.js** The engine. The `Game` class (`js/game.js:85`), the update loop,
  the player, projectiles, damage, pickups, level ups, and the shared helpers
  (`rand`, `pick`, `clamp`, `lerp`, `TAU`, `CELL`) that half the folder uses.
  `Game.prototype.rng()` at `js/game.js:255` is the simulation's random stream:
  it delegates to `Run.rng` when a run is active and falls back to `Math.random`
  otherwise, so the simulation is seeded now. Before that wiring it was always
  `Math.random` despite a comment promising otherwise. `js/game.js:649` passes
  that stream into `Pool.offer` as `rng: () => this.rng()`.
- **director.js** Spawning, enemy AI, elites, scripted events and the three
  bosses, hung on `Game.prototype` (60 methods). Also reads the Deeper Nights
  carvings off `Totem` and applies them (harder critters, halved payouts) at the
  one door each effect passes through rather than at every till.
- **dodge.js** The dodge roll. Spends the single frame `p.in.dodge` edge, owns
  the player's position for the length of the dash, and ticks charge cooldowns
  every frame regardless of phase. The dash carries a trait set walked like a
  projectile's, and the bounds clamp is applied outside the trait walk so no item
  can dash a player out of a locked room.

## Run and world layer

- **run.js** The night. Owns the seeded stream (mulberry32 with a read/seek
  cursor at `js/run.js:76-87`), the PLAN of concrete room slots three acts deep,
  the DOOR offers, and the CURSOR. `Run.begin(charId, seed, carvings)` at
  `js/run.js:805` seeds everything and builds the plan once at `js/run.js:825`;
  room interiors are drawn lazily from the same stream when the room is
  constructed at `js/run.js:942`. Also writes the resume save for a night in
  progress. If you are asking "why did this night deal that", start here.
- **rooms.js** The room catalogue: room kinds, the per act running order, the
  wave tables, and the `ROOMS` layout data (`js/rooms.js:186`) that `run.js`
  picks from and `room.js` instantiates. It is LIVE. It carried a stale header
  claiming nothing in it ran; that was wrong and has been fixed.
- **room.js** One room instance: the `Room` class (`js/room.js:33`), bounds,
  doors, solids, the block grid, the wave pump and the clear then open door
  lifecycle. Three calls drive it: `new Room(def, rng)`, `room.enter(g)`,
  `room.update(g, dt)`. Also hangs door rendering on `Game.prototype`.
- **props.js** The breakable and interactable room props (crates, mailboxes,
  birdhouses, stumps, barrels, logpiles, boulders): the `PROPS` catalogue plus
  the spawn, damage, update and render methods it hangs on `Game.prototype`.
- **collide.js** Pure solid geometry against AABBs and the room's blocked cell
  grid. No game state, no globals except `Collide`. The one file here you can
  reason about in isolation.
- **transition.js** The wipe between rooms. Owns the `transit` phase on a fixed
  timeline (push in, cut, hold, fade out) and clears the per room entity arrays
  at the cut. Without it, walking a door swaps rooms with no beat and stale
  entities from the old room survive into the new one.

## Build substrate

The four files that make a hundred items possible without a hundred branches.

- **traits.js** The trait substrate and the repo's pattern file. Traits ride the
  PROJECTILE (and the dash), not the weapon, so combinations fall out of walking
  a closed vocabulary in fixed order. Twelve traits by three surfaces (strike,
  carrier, field) is a 36 cell `SCOPE_TABLE` where every cell is a behaviour or a
  written down no op, audited at load. Read this file before designing any new
  system in this repo.
- **hooks.js** The run event bus, the substrate's other half: traits change what
  a projectile IS, hooks let an item react to what the run DOES without living in
  the file where the thing happened. Nine events, every one carrying an owner,
  registry keyed by owner and source together, one bus per `Game` rather than a
  module singleton. `emit()` is written not to allocate.
- **stats.js** The stat block. Nineteen stats, their bounds, the per level
  magnitudes that used to be hardcoded in `recalc()` and mirrored in the dev
  overlay, and the one hyperbolic stacking curve every fractional stat climbs.
  The single source of truth for what a patch is worth, what a stack is worth,
  and where a stat stops. If a card and a character disagree about the same pick,
  the bug is a caller not reading this file.
- **pool.js** The offer builder: what can be offered, how likely it is, and how
  one round of offers is filled for however many players are standing there.
  `draw()` at `js/pool.js:236` takes `opts.rng` (`js/pool.js:238`) and
  `game.js` passes the seeded stream through, so offers are reproducible.
  Exclusivity is per round, never run wide, and the constant that says so is
  deliberately named so a future pass has to argue with it.

## Tuning data

- **data.js** Every tuning number in one object: `DATA.characters`,
  `DATA.weapons`, `DATA.passives`, `DATA.enemies`, `DATA.bosses`, `DATA.pool`,
  `DATA.rosters`, `DATA.relics`, `DATA.skills`, `DATA.themes`, the scaling
  curves and `DATA.threatOf`. `DATA.characters` holds exactly three entries: max,
  junie and gus. THOSE THREE ARE SUPERSEDED BY RULING. The game is mid reboot and
  the cast is five different survivors; nothing has been renamed in code on
  purpose, because display names and internal ids stay separate. Cutting or
  renaming those three ids is a crash, not a data change. The analysis and the
  migration plan live in `docs/preproduction/SAVE_MIGRATION.md`: read that, do
  not re-derive it.

## Meta and save layer

- **meta.js** The save. `META` (badges, lifetime, dawns, deaths, upgrades,
  selected character, journal, flags, codex, counters, camp cosmetics) plus its
  `localStorage` load and save under `mbm_meta`, and `METADEFS`, the permanent
  upgrade tree bought at the Badge Board. `js/meta.js:44` falls back to the
  character id `'max'` when the selected id is unknown, which is the line that
  makes a stale or renamed character id silently become Max instead of throwing.
  `Transfer` (`js/meta.js:181`) is the camp transfer code: a fingerprinted,
  Crockford base 32 string encoding a save, refused in plain words if the id
  tables it was minted against have moved.
- **roster.js** Who you can play as and what wakes them. `ROSTER` conditions are
  checked against `META` on demand and `Roster.checkUnlocks()` returns the ids
  gained so the caller can announce them. Small file, one job.
- **feats.js** The Merit Badge Board and the Tally Post: `FEATS` (long horizon
  dares the camp remembers) and `Totem` (`js/feats.js:502`, the Deeper Nights
  carvings you make in advance to make the night worse and the payout better).
  Every read is defensive against a save that predates the feature. The internal
  identifiers (`FEATS`, `featMeta`, `FEAT_REWARDS`, `flags.feats`) are frozen
  because four other files and every save already written depend on them.

## Story and text

- **dialogue.js** Every word anyone says: per character run barks (`BARKS`),
  select lines, killer names, boss lines and epithets, and `BROCK`, the
  Scoutmaster's campfire arc, dripped one beat at a time and gated on `META`
  progress.
- **finds.js** The things on the ground that are not loot: fourteen Troop 12
  relics delivered strictly in order and ten signs that teach a tell before the
  thing that owns it turns up. A find writes one key into `META.journal`, which
  is the same journal Brock's arc counts, so picking things up is what unlocks
  him talking about them. Nothing here renders.

## Camp

- **camp.js** Camp Hearthwood, the walkable home base, and the second largest
  file in the folder. The `Camp` class (`js/camp.js:561`), the zone layout, the
  baked ground and treeline layers, the idler cast, the walk up prompts, and the
  doors into the Badge Board, the journal, the feats board, the totem and the
  trailhead. It is a whole second game mode with no shooting in it, which is why
  several systems (input, audio scenes, dialogue) have a camp branch.

## Presentation layer

- **render.js** Everything that draws during a run: `Game.prototype.render` and
  the 16 draw methods under it, moved out of the `Game` class unchanged. Every
  sprite name it draws is resolved through a cached `safeSpr()` wrapper so a
  painter that has not landed yet substitutes rather than taking the frame down.
- **reticle.js** The two layer aiming reticle: a world space layer under the
  cursor previewing what the manual weapon will actually do (blast radius, swing
  wedge, aim lane), and a screen space HUD layer at the mouse (spread ring,
  cooldown sweep, hover feedback). Read only against game state.

## Art layer

CODE PAINTED ART IS BEING RETIRED BY RULING. Authored assets replace it. Both
files below are live today and both are on the way out. Do not take art
direction from `ART_STYLE.md`, which is a superseded stub.

- **sprites.js** Every in game sprite, painted in code as vector shapes baked to
  offscreen canvases. 300 KB and the largest source file in this folder. THE MIGRATION SEAM
  IS `SPR.get(name)` at `js/sprites.js:5375-5381`: it is the only place a painter
  from the `P` table is ever invoked (`P[name]()` at `js/sprites.js:5378`; the
  other `P[...]` lines, `js/sprites.js:3119` and `js/sprites.js:4738`, are
  painter REGISTRATION, and `js/sprites.js:5377` is the existence check), and
  every painter backed entry point routes through it: `draw` calls it at
  `js/sprites.js:5415`, `drawBottom` at `:5428`, `eyePositions` at `:5435`,
  `height` at `:5451`, `drawScout` at `:5459`. So an authored asset can be
  dropped in one name at a time behind that single function. `SPR.icon` and
  `SPR.itemIcon` are the exception: they paint HUD glyphs inline with canvas ops
  and never touch a painter.
- **portraits.js** Half body character art for the camp dialogue box, same code
  painted doctrine at portrait scale, baked lazily the first time a speaker opens
  their mouth. `Portraits.get(id, expression)`, `Portraits.idFor(speakerName)`.
  Expressions are neutral, warm, alarmed, a signature per character, and a rare
  comedy closeup.

## Audio layer

- **audio.js** `AudioSys`: the procedural sound engine. Every sound effect is
  synthesised at load, no samples. Owns the AudioContext, the bus graph (master,
  music, sfx, voice, stinger, with ducking), the mixer headroom, positional
  emitters and the legacy live music scheduler. This is what makes noise when
  there is no `assets/` folder.
- **music.js** `Music`: a layered stem player for the pre rendered tracks. Plays
  every layer of a theme at once locked to one scheduled start and moves gains
  around instead of switching tracks. With no stems loaded every call is a
  recorded no op, so a build with no `assets/` folder behaves exactly as it did
  before this file existed. States fall down a preference list, so a half
  rendered soundtrack still plays.
- **voice.js** `Voice`: spoken barks from the pre rendered lines, with a priority
  ladder, a cooldown, an LRU decode cache and subtitles. It owns its OWN private
  AudioContext and gain node, because `AudioSys` does not expose its voice bus;
  read the header comment before changing the routing. Safe no op with no
  manifest.
- **audio_director.js** `AudioDirector`: turns game state into music and voice
  cues so the simulation never has to know what a stinger is. A pure observer.
  Nothing emits events at it; every frame it reads the shape of `g` (room, phase,
  act, boss, enemies, player), diffs it against last frame, and drives
  `Music.goto/setHeat/setPhase/stop` plus the procedural fallback from that. A
  boss with no baked theme keeps the act theme rather than dropping to silence.
- **assets.js** `Assets`: the optional asset layer. Fetches `assets/manifest.json`
  and the `.webm` files it lists, in parallel with a cap. If the manifest is
  missing, `available` stays false, every getter returns null, and `music.js`,
  `voice.js` and `audio_director.js` all fall back to procedural audio. The game
  ships and plays with no `assets/` folder at all.

## Dead or superseded

- **footsteps.js** DEAD. Seven lines. `Footsteps.update(g, dt)` has an empty
  body, and nothing in the repo references the `Footsteps` global at all: grep
  (`grep -rn "Footsteps" --include=*.js --include=*.html --include=*.cjs .`,
  excluding `node_modules` and `dist`) returns exactly one hit, the declaration
  at `js/footsteps.js:5`. It is still loaded at `index.html:662` and costs one
  request and nothing else. Do not write footstep audio into it without checking
  where it would be called from, because today the answer is nowhere.
- **touch.js** SUPERSEDED BY RULING but still live code. On screen thumbsticks
  for phones and tablets: a move stick, an aim stick that also holds fire, a
  dodge button, and camp variants (interact, menu). It wraps
  `Game.prototype.readInput` at boot, only on touch devices, and `ui.js` calls
  `Touch.init` and `Touch.render` unconditionally. TOUCH IS DROPPED: controller
  is required instead (`docs/preproduction/RULINGS.md`, ruling 10, because the
  touch layout cannot express the design and the active skill is already
  unreachable on it). The file has not been removed and there is no controller
  layer in this folder yet, so input today is `ui.js`'s `INPUT` plus this.
