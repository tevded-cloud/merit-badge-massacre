# The co-op design

This document answers four questions Teddy asked: how many players, how the room
scale survives them, how each player's items and progression work, and what co-op
adds rather than merely permits.

It is written after four measurement studies, three independent designs and two
adversarial reviews. Where a reviewer was right, the design changed and this
document says so in the section where it changed. Where a reviewer was wrong, one
line says why.

Two evidence rules apply throughout, the same two BUILD_ARCHITECTURE.md uses.
Every claim about our own code is cited by file and line, and I re-read every
load-bearing one this session. Claims about other games are labelled sourced or
recalled, and a recalled number is never presented as a measured one. Where I am
guessing, the sentence says "this is a guess".

---

## 1. The decision

**Co-op is decided today and built after 3.0 ships. Not before.**

That is the honest answer and it is the first thing on the page because Teddy
asked to be told rather than humoured. Everything below is a real design, ready to
build, and the recommendation is still to not build it yet. The reasons are three
numbers.

The item architecture we committed to this week costs 27.5 developer days, or 33.5
with the full roster (`BUILD_ARCHITECTURE.md:1186-1188`). The smallest co-op worth
shipping costs 72 to 106 developer days. The full design in this document costs
110 to 170. So co-op is between two and six times the entire 3.0 item system, for
a game that is unlisted, whose installed base is Teddy and one or two playtesters,
sitting behind two backlog items that are themselves still pending (task 29,
Survival mode, and task 30, the money plan). Co-op is already correctly placed in
the backlog. Nothing in four studies, three designs or two reviews argues for
moving it forward.

What we do now instead is the cheap part, and it is worth real money:

1. **Fold the co-op invariants into 3.0 while the files are already open.** Section
   11 is the list. It costs 4 to 7 extra days on top of the 27.5 already planned,
   and it removes 18 to 26 days of rework later. Skipping it means rewriting 96
   authored items and eight keystones by hand after the fact
   (`BUILD_ARCHITECTURE.md:1168`, unit C1 authors them in four days). This is the
   single most valuable output of the whole co-op exercise.
2. **Fix the four solo bugs the co-op lens found.** They are shipped defects in the
   single player game today and section 2 lists them with lines.
3. **Ship THE BEHIND and MAWMOLE as solo bosses in 3.0.** Two complete boss fights
   are sitting in the tree, wired to nothing. Section 7 prices them at 2 to 4 days.

When co-op is eventually built, this is the shape:

**PLAYER COUNT: TWO.** Built for N, shipped at 2, with 3 as a lobby constant that
can be turned on later without touching the simulation. Never 4. Section 3.

**CAMERA: ONE PER PLAYER. Online only.** Every machine renders its own window on
its own scout, exactly as the code does today (`js/render.js:23-47`). No shared
camera, no leash box, no split screen, no couch co-op. Section 4.

**ITEM OWNERSHIP: EVERY SCOUT CARRIES THEIR OWN BUILD.** Never shared, never
borrowed, never a guest riding the host's items. One shared XP bar, one shared
purse, and a card to every living scout. Section 5.

**THE LEVEL UP PROBLEM: ONE BAR, PARTY-SCALED CURVE, CARDS THAT DO NOT STOP THE
WORLD.** Thirty picks per player per night at any party size, so the number of
interruptions is 30 and not 90. The cards resolve in the quiet after a room
clears, they do not pause the simulation, and the doors are not held for anyone.
Section 5.6 is the full answer and it is the hardest thing in this document.

**WHAT CO-OP ADDS:** a downed scout who is brought back by a friend standing over
them, a door choice that becomes an argument instead of a menu, a horde that
surrounds the group instead of surrounding each person, and two boss fights that
are already about being seen and being heard. Section 7.

**WHAT IS CO-OP EXCLUSIVE: NOTHING.** No badge, no scout, no weapon, no item, no
story beat, no camp furniture, no Steam achievement. Co-op is a way to play the
game, not a set of things to own. Section 7.5 argues this and it is a change from
the design that proposed one co-op merit badge.

**WHAT IT COSTS:** 72 to 106 developer days minimum, 110 to 170 for the full
design, and about 62 percent of that cost is not networking at all. It is turning
a simulation that says `this.player` in 71 places into one that says "which
scout". Section 12.

---

## 2. The measured state

### 2.1 How big is a room, in screens

The camera scale is a fixed constant, `ZOOM = 1.5` (`js/game.js:6`), and the render
call takes the raw window size (`js/ui.js:2135`), so the visible world is
`innerWidth / 1.5` by `innerHeight / 1.5`. At 1920 by 1080 that is 1280 by 720
world units.

Room sizes, computed from all 46 layout definitions in `js/rooms.js`:

| Type | Count | Smallest | Largest |
| --- | --- | --- | --- |
| combat | 21 | 1000x700 | 1250x830 |
| elite | 6 | 1080x730 | 1210x790 |
| boss | 4 | 1280x900 | 1430x980 |
| lore | 6 | 700x520 | 780x550 |
| shop | 3 | 700x520 | 750x550 |
| loot | 3 | 670x490 | 730x550 |
| rest | 3 | 640x490 | 700x520 |

A typical combat room is about 1170 by 770. So, in screens:

| Screen | View in world units | Typical combat room | Widest combat room | Largest layout |
| --- | --- | --- | --- | --- |
| 1366x768 | 911x512 | 1.28 w x 1.50 h | 1.37 x 1.62 | 1.57 x 1.91 |
| 1920x1080 | 1280x720 | 0.91 x 1.07 | 0.98 x 1.15 | 1.12 x 1.36 |
| 2560x1440 | 1707x960 | 0.69 x 0.80 | 0.73 x 0.86 | 0.84 x 1.02 |

The useful sentence: **"how many screens is a room" is a property of the monitor,
not of the room.** At 1440p every combat and elite room is already entirely inside
the view at today's zoom. At 1080p a combat room is about one screen. The rooms are
small, and that is the single fact that makes co-op tractable at all.

### 2.2 How many enemies are actually in a room

Everyone has been planning against "about 90 living enemies". That number is the
open field, and it is wrong for rooms.

The 300 body cap lives only in `updateDirector`, the open field path
(`js/director.js:497-499`). The room wave pump has no cap at all: `_beginWave` and
`_releasePending` never check a count. Rooms advance on a ratio, not a clock: a
wave hands over when the living fraction drops to its `nextAt`
(`js/room.js:584-593`), so peak concurrency is the leftover from the last wave plus
the whole of the new one.

Run wave by wave across the fighting layouts and the peak is 26 to 32 living
bodies, about 30 in the median room. (The layout-by-layout figures come from the
space study; I verified the handover rule at `js/room.js:584-593` and spot-checked
Needlefall's first wave of 16 at `nextAt 0.35`, `js/rooms.js:224`. I did not re-run
all 27 fighting layouts myself.)

TIGHTER WOODS multiplies every wave by 1.2 (`js/room.js:62`), so a carved night
peaks near 37.

What that means for party size, using the scaling this document recommends in
section 4.4:

| Players | Body multiplier | Peak living | With TIGHTER WOODS |
| --- | --- | --- | --- |
| 1 | 1.00 | about 30 | about 37 |
| 2 | 1.35 | about 40 | about 49 |
| 3 | 1.60 | about 48 | about 58 |

Fifty bodies in a 1170 by 770 room is not a readability problem. The readability
problem is the separation pass, not the count, and that is item 12 in the list
below.

### 2.3 Every co-op readiness invariant the shipped code violates

This list is the most valuable thing in this document. Every line was read this
session. Four of these are shipped single player bugs and are marked SOLO BUG.

**Identity: there is no such thing as a second scout.**

1. `this.players = [this.player]` at `js/game.js:45` is the only occurrence of
   `players` in the whole tree. It is written once in the constructor and read
   nowhere.
2. Against that one dead line: 52 direct reads of `this.player` (26 in game.js, 20
   in director.js, 3 in dodge.js, 3 in render.js) and 19 of `g.player` (6 in
   room.js, 5 in ui.js, 4 in transition.js, 2 in reticle.js, 1 in run.js, 1 in
   audio_director.js). Thirty of those are `const p = this.player` aliases (14 in
   game.js, 16 in director.js).
3. **There is no `playerCount` anywhere.** A case-insensitive search across all 29
   source files and index.html for playercount, numplayers, nplayers, multiplayer,
   webrtc and netcode returns zero matches. The claim that 2.0 shipped multipliers
   "pinned at 1" is not true of this codebase. They have to be built, not unpinned.
4. Every enemy in the game chases one variable. `updateEnemies` opens with
   `const p = this.player` (`js/director.js:1740`) and every AI branch below,
   including all five boss patterns, steers at that `p`.
5. Entity ids exist on enemies (`js/director.js:185`, `js/director.js:316`) and
   props (`js/props.js:153`) and nowhere else. Shots, enemy shots, bombs, swings,
   rings, puddles, gems, pickups, corpses and zones are all anonymous object
   literals.

**Ownership: the build belongs to the run, not to a scout.**

6. `this.level`, `this.xp`, `this.xpNext`, `this.badges` and
   `this.pendingLevelups` are Game fields (`js/game.js:104-108`), as are
   `this.coins` (`js/game.js:52`) and `this.kills`.
7. `recalc()` reads `this.passives` and writes eight per-scout numbers onto the
   Game: `dmgMul`, `speed`, `cdMul`, `armor`, `magnetR`, `xpMul`, `critCh` and
   `regen` (`js/game.js:155-166`).
8. `levelPool(n)` takes no owner (`js/game.js:191`). It reads `this.weapons` and
   `this.passives` off the Game and dedupes only within one offer.
9. `grantChest()` (`js/game.js:274`) and `gainXP(v)` (`js/game.js:294`) write to
   the Game with no owner argument.
10. Loot is single-magnet: `updateLoot` runs one loop against `this.player` with a
    single `this.magnetR` (`js/game.js:162`, `js/game.js:1160-1201`). Gems credit
    one counter, cocoa heals one player, the chest grants to one build.
11. The mid-run save is one scout: one charId, one level, one xp pair, one weapons
    array, one passives map (`js/game.js:1560-1596`).
12. **SOLO BUG.** The enemy separation pass reads exactly one 72 by 72 hash cell
    and gives up after four neighbours (`js/director.js:2150`, `js/director.js:2155`,
    `CELL = 72` at `js/game.js:25`). Two enemies five units apart across a cell
    boundary never see each other. This already under-resolves at the shipped solo
    peak of about 30 and it will visibly stack bodies at 48.

**Determinism and portability.**

13. **SOLO BUG.** `viewRadius()` reads `window.innerWidth`
    (`js/director.js:43-45`), `spawnPos()` places on it (`js/director.js:47-51`),
    and `spawnBoss` calls `spawnPos`. On a 1440p monitor that radius is about 1049
    units, so a boss in the 1430 by 980 room is spawned outside the room and
    clamped back on the next frame, landing somewhere different than it does on a
    laptop. `updateEnemies` also uses it for the relocate distance
    (`js/director.js:1741`).
14. The aim solve reads the window inside the simulation and produces a world
    point (`js/game.js:637-639`). An input frame carrying a world aim point is not
    portable between two machines with different window sizes.
15. Simulation randomness is not seeded. `rand` and `pick` are `Math.random`
    (`js/game.js:8-9`). The crit roll (`js/game.js:343`) and both level pool rolls
    (`js/game.js:219`, `js/game.js:229`) are unseeded, as are the spawn weight
    rolls (`js/director.js:120`, `js/director.js:144`) and the Tallyman chance
    (`js/director.js:161`). The seeded mulberry32 (`js/run.js:76`) drives the run
    plan and, through `js/room.js:46`, spawn positions only.
16. The update loop is variable dt clamped to 0 to 0.05 (`js/ui.js:2115`) with no
    accumulator, and the simulation rescales dt three ways inside one update
    (dying at 0.25, hitstop at 0.12, phase timers on raw dt).
17. Hit registries key on object identity: `hits: new Map()` (`js/game.js:918`),
    `hit: new Set()` (`js/game.js:940`, `js/game.js:1466`), `s.hit`
    (`js/game.js:1053`), `this._dashHit` (`js/dodge.js:66`, `js/dodge.js:121`).
    Object identity does not survive a snapshot and cannot credit a kill.
18. `Transition` keeps `active`, `t` and `door` on the module rather than on the
    Game (`js/transition.js:36-57`), so two Game instances cannot coexist in one
    process. That blocks headless replay, a desync detector and any automated
    co-op test.
19. `queryEnemies` returns a single shared scratch buffer `this._qbuf`
    (`js/game.js:127`, `js/game.js:605`) across every call site. Under the 3.0 hook
    bus an `onHit` handler can call it from inside a loop iterating the same
    buffer. This is a latent single player bug the item system will detonate.

**Structure: the world stops for one person.**

20. `g.update(dt)` runs only when `App.state === 'play'` (`js/ui.js:2127`). Any of
    the eleven screens stops the entire world.
21. **SOLO BUG.** `banksLevelups` returns true only when `r.lock === 'clear'` and
    `r.state === 'active'` (`js/ui.js:984-987`). THE PRESSURE BOG is
    `type: 'combat'` with `lock: 'survive'` (`js/rooms.js:948-950`), waves tick for
    survive rooms (`js/room.js:433`), and it runs three of them. So a rank-up in
    that room opens the modal card screen in the middle of a wave and freezes the
    world, in the shipped solo game, today. Six documents leaned on "the engine
    already banks level-ups during a fight". It banks in 30 of 46 layouts
    (`lock: 'clear'`); 12 layouts are `lock: 'none'`, 3 are `objective` and 1 is
    `survive`.
22. **SOLO BUG (small).** Doors are first past the post and one shot. `_tickDoors`
    accumulates dwell against `g.player` only and sets `this.doorFired`
    (`js/room.js:811-827`), and `Transition.start` returns immediately if already
    active (`js/transition.js:44`), so a second caller is silently ignored.
23. Death ends the world for everyone. `damagePlayer` calls `Run.clearSave()` at
    `js/game.js:506` and then sets `this.phase = 'dying'` on the GAME at
    `js/game.js:507`. There is no downed state, no bleed-out, no rescue. The only
    revive is Second Wind, a once-per-night meta rank (`js/game.js:488-499`).
24. The particle budget is a single global `PART_CAP = 420` (`js/game.js:1287`)
    with the literal repeated at 1400, 1494 and 1522 and again in dodge.js. At
    three players every scout's feedback competes for the same 420 slots.
25. The simulation reads the local player's permanent camp progress in at least
    eleven places, two of which change the fight: TIGHTER WOODS multiplies every
    wave by 1.2 (`js/room.js:62`) and SHARP TEETH stamps 25 percent more damage
    onto every body at spawn (`js/director.js:20-22`, applied at
    `js/director.js:167`). `recalc` folds five META ranks into live stats
    (`js/game.js:155-166`).
26. Guests would earn nothing. Every META write happens inside simulation code
    that, under host authority, only the host runs. `META.credit` banks
    `g.badges` times the host's Tally Post multiplier (`js/meta.js:107-125`).

**The three things that are already right.**

- Per-player input frames exist on the player object (`js/game.js:43`), and the
  movement, dodge, aim and firing paths already read that frame rather than the
  global.
- The mid-run save already writes at room boundaries and already carries the seed,
  the rng cursor, the plan, the act, the room index and the frozen carvings
  (`js/run.js:993-1018`). That is the host departure design, already built.
- Coins are credited, never collected. `gainCoins` is called from room clear
  (`js/room.js:768`), the cache (`js/room.js:449`), smashed props
  (`js/props.js:16`) and the collector (`js/director.js:811`). There is no coin
  pickup entity, so the Enter the Gungeon failure where one player is physically
  holding all the money cannot happen here. (Gungeon: money is shared, guns and
  actives can be traded, passives cannot. Sourced,
  enterthegungeon.wiki.gg/wiki/Co-op.)

---

## 3. Player count, decided

**Two players at launch. Three as a lobby constant that can be turned on later.
Four never.**

Teddy suggested up to three. Three is defensible and it is not the launch number.
Here is the whole argument, including the part where the best reason for capping
at three turned out to be wrong.

### 3.1 The reason that died

The strongest case for exactly three was arithmetic about our own item pool: a
solo build makes about eleven named acquisitions from a pool of about ninety, so
three players drawing thirty-three of ninety leaves room for every player to hold a
different build, and four players start to bite.

That argument was computed against a slotted spine. The architecture we actually
committed to is FOUR CLOCKS, ONE LEDGER: four weapons, one skill, one keystone,
and an uncapped ledger. "There are no patch slots" (`BUILD_ARCHITECTURE.md:36`). A
player takes about 26 ledger items a night from a catalogue of 96, of which 72 are
available on a fresh save (`BUILD_ARCHITECTURE.md:895`, `:914`). Three players need
78 exclusive draws from 72 available. That is not tight, it is short by six items,
before any per-family cap. Two players need 52 of 72.

So run-wide item exclusivity is dead (section 5.5 says what replaces it), and with
it the pool-based reason to cap at exactly three. The first reviewer found this and
was right; the design changed.

### 3.2 The reasons that survived

**Assembling a party.** If a player has F friends who own the game and each is free
and wanting to play right now with probability p, party assembly is a binomial
tail. At p = 0.25 with three owning friends you can start a duo 58 percent of the
time, a trio 16 percent, a quad 2 percent. With five friends: 76, 37 and 10. With
eight: 90, 63 and 32. (Derived arithmetic, and it is the least arguable number in
this document because it does not depend on our game at all.) For a paid indie
whose buyer typically knows one to three other owners, the duo is the only party
size that assembles reliably.

**The queue, if there ever is one.** Greedy matching on Poisson arrivals gives an
average wait of (N-1) / (2 x lambda). To hold a sixty second wait you need about 59
concurrent players for a duo queue, 118 for a trio, 176 for a quad, and splitting
by region triples each. We are not building a queue (section 13), but the shape of
the number tells you which party size a small game can actually fill.

**The stack problem, and it gets worse with every player.** Player radius is 11
(`js/game.js:38`) and a squirrel's is 11 (`js/data.js:153`), so bodies press to
about 22 units apart. The contact perimeter of a party is its hull perimeter plus
2 pi times 22. One player fits about 6.3 bodies in the contact ring, two players
standing together about 9.0, three about 10.4, four about 11.7. Player damage
scales exactly N. So a tight stack is 1.39x easier at two, 1.82x at three, 2.14x at
four. (Derived geometry.) **The horde physically cannot deliver more pressure to a
stack.** More players make the fight easier unless the room pulls them apart, and
every added player makes that worse.

**The test matrix.** Party compositions with three scouts and duplicates allowed:
6 at two players, 10 at three, 15 at four. Alive and down states: 4, 8, 16. Add a
disconnected state: 9, 27, 81. Every one of those is a case a human plays by hand,
because there is no automated gate for "the host dropped while the second player
was down during a boss".

**Host upload.** Section 9 costs the wire. Two players is comfortable at any
encoding. Four is only viable if the snapshot format is packed from day one.

**Duplicate scouts are mandatory at any count.** Junie needs 150 lifetime badges or
one dawn and Gus needs 400 (`js/roster.js:8-20`), and guests keep their own
progression, so a host plus one fresh friend is very often two Maxes. The tidy
"three players, three scouts" story never existed.

### 3.3 The decision

Ship two. Every axis is comfortable at two and no axis prefers three. Build the
simulation for N so the cap lives in the lobby and never in the code: hard-coding a
2 into the simulation is the kind of decision that is expensive to undo, and going
from two to three afterwards is 3 to 6 days of difficulty tuning and identity
readability if, and only if, the ownership work in section 11 was done properly.

Four is ruled out, not deferred. There is no axis on which four is the better
answer.

---

## 4. Space and camera

### 4.1 One camera per player, and the whole leash discussion goes away

**The camera model is: every machine renders its own window, on its own scout, with
today's code.** `js/render.js:23-47` already does exactly this. Nothing changes.

The space study designed a shared centroid camera, a 640 by 240 leash box with
movement damping, a fit-whole-room zoom table and a recommendation to shrink four
boss rooms. All of that is excellent work on a question we are not asking: it
solves same-screen co-op, and the plan of record is online. The second reviewer
caught this and was right. Deleting it removes the largest single block of cost in
the design and it removes the worst technical collision in the plan, which is a
guest predicting their own movement while fighting a movement damper at a hard box
edge.

What survives from that study, and it is the good half:

- **The room is already the leash.** Players cannot leave a locked room; the player
  is clamped to bounds (`js/game.js:737-741`) and so is every enemy. Maximum
  separation in the widest combat room is 1250 by 830 world units. No rubber band,
  no off-screen arrow, no camera fight.
- **Zoom never changes, for anybody, ever.** The smallest enemy, ticktot, is
  authored at `w: 20` (`js/data.js:179`) and draws at exactly 30 CSS pixels at
  ZOOM 1.5, which is exactly the 30 pixel readability floor carried forward at
  `docs/preproduction/RULINGS.md` `[spec]` (the old `ART_STYLE.md` is superseded). There is zero
  headroom to zoom out. Any framing zoom is also a permanent camera pump, which
  MOTION_DESIGN's screen effects doctrine forbids outside boss entrance and death.
- **Raise ticktot from `w: 20` to `w: 24` anyway, as a solo art fix.** It is 24 of
  120 weight in the act 2 roster (`js/data.js:247`), so it is one in five of every
  body you fight in that act, drawn at the absolute readability floor. `w` is draw
  width; the hitbox is `r: 7` and separate (`js/data.js:179`), and contact damage
  tests `e.r + p.r` (`js/director.js:2168-2172`). It is not purely cosmetic though:
  `w` also sizes the corpse, positions the eye glow and sets the height of the
  exclamation telegraph, so it wants an eye on the contact sheet, not just
  arithmetic. Move this out of the co-op budget and into 3.0 art.

### 4.2 The horde surrounds the group, not each person

This is the change that makes 1000 by 700 rooms work with more than one scout, and
it survives the camera decision completely.

The engagement disc study concluded that three separate r240 fights need 1440 units
of long axis and that no layout has it. That arithmetic is right and it answers the
wrong question, because it assumes three separate fights. In a room based game there
is one fight.

`_ringPos` places on a circle around `g.player` (`js/room.js:716-721`) and
`_edgePos` tests `ROOM_EDGE_AWAY` (190, `js/room.js:28`) against that one player.
Both become party-aware: the ring becomes an ellipse around the party centroid, and
the edge test becomes a minimum over living scouts. **With one player both compute
exactly what they compute today**, which is the property every change in this
document has to have.

Do not shrink the ring radius to 170 as one study proposed. 170 is below
`ROOM_EDGE_AWAY` 190, which is the engine's own do-not-spawn-on-the-player
distance, and under party-centred spawning there is no reason to shrink it.

### 4.3 No layout is re-authored, ever

Not one of the 46 layouts changes size, and there is no co-op layout set. The
reasons are measured, not taste. Every derived spacing in `LEVEL_DESIGN.md` is
anchored to the dodge distance, which does not scale: the minimum gap is 1.5
dodges, the minimum lane is one dodge plus a body, and the marker clearance is a
dodge plus two radii. Scale a room by 1.2 and a lane becomes 1.25 dodges wide and
the melee rhythm the whole catalogue was tuned to is gone. The composition rect
argument is stronger still: every solid and prop in every combat room sits inside a
centred 910 by 510 box precisely because that is one screen at the reference
resolution, and scaling it stops it being one screen.

The one thing the layouts already parameterise is the one thing that should vary:
body count, through `this.bodyMul` (`js/room.js:62`).

### 4.4 Scaling: more bodies, sub-linearly, and nothing else

| Players | Bodies | Elites | Enemy HP | Enemy damage | Wave count |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.00 | 1.00 | 1.00 | 1.00 | unchanged |
| 2 | 1.35 | 1.50 | 1.00 | 1.00 | unchanged |
| 3 | 1.60 | 2.00 | 1.00 | 1.00 | unchanged |

Bodies go through `js/room.js:62`. Elites go through `js/room.js:547`. Enemy health
never scales, because our trash runs 4 to 132 hp and the sensation being sold is
volume of kills, not chewing. This is what Risk of Rain 2 does deliberately: its
enemy level formula subtracts the player factor back out, so extra players buy more
bodies rather than spongier ones, and its total lift is about 1.30x at two players
and 1.60x at three, decaying as the run goes on (sourced formula,
riskofrain2.wiki.gg/wiki/Difficulty and /wiki/Level; the arithmetic on it is mine).

Wave count never changes. The run is measured at 17.63 minutes over 27 rooms
(`BUILD_ECONOMY_3.md`), and co-op should be the same length with more happening in
it, never longer.

**And the item that will be forgotten if it is not written in capitals:
`ROOM_RELEASE` must be divided by the same body multiplier.** It is 0.06 seconds
per queued body (`js/room.js:24`, poured out at `js/room.js:664`). The level
doctrine budgets a first wave of 12 to 20 bodies, which is 0.72 to 1.20 seconds of
arrival, and says that above 24 bodies the wave is still pouring in after the fight
has started and the room reads as stuttering. A 16 body opener at 1.6x is 26 bodies
and takes 1.56 seconds at the shipped rate. Dividing the release by the body
multiplier keeps arrival TIME invariant while body COUNT scales. It is one line and
it must ship in the same commit as the body multiplier so it cannot be lost.

### 4.5 What must be rebuilt before any of this

**The separation pass, and it is a solo bug fix.** One cell, four neighbours, then
break (`js/director.js:2150`, `:2155`). It needs the 3 by 3 neighbourhood and a
real budget. Do it together with the integer cell key, because `rebuildGrid`
(`js/game.js:590`) and `queryEnemies` (`js/game.js:612`) build string keys per
entity per frame. This is a prerequisite unit, not a follow-on, and it is worth
doing for the single player game regardless.

### 4.6 What co-op takes away from the fight, said out loud

Three pieces of feel do not survive multiple players and Teddy should agree to this
rather than discover it:

- **Trash-kill hitstop goes to zero above one player.** A freeze somebody else
  caused is the worst feel bug co-op can produce. Crits, elite kills, boss kills and
  player-hurt keep theirs.
- **Player-hurt camera shake stops shaking the camera above one player** and becomes
  a per-player edge vignette. Two people hurt from two bearings on one screen is
  noise, not force. `js/game.js:1235-1237`, clamped at `js/game.js:543`.
- **The player death zoom does not exist above one player** (`js/game.js:664`).

Solo keeps all three. Co-op will feel measurably different from the solo game, and
that is another honest reason the launch number is two rather than three.

---

## 5. Builds, items and XP

### 5.1 Every scout carries their own build. This is not a close call

Each scout owns their own weapons, ledger, skill, keystone, stats, HP and level
state. There is no shared build, no borrowed build, no host build the guest rides.

The evidence from the genre is unanimous and it is the failure everybody remembers.
In Isaac Rebirth a joining player pays the host a heart container, becomes a random
baby, deals half damage, and **cannot interact with items or pickups at all**; on
death rejoining costs another container (sourced,
bindingofisaacrebirth.wiki.gg/wiki/Co-op). Enter the Gungeon locks player 2 to The
Cultist regardless of what player 1 picked (sourced,
enterthegungeon.wiki.gg/wiki/Co-op). Both are the same wound: in a game where the
build is the run, a player with no build is not playing the game. Isaac Repentance
replaced its own version with per-player everything and one extra boss pedestal per
extra player (sourced, /wiki/Repentance_Co-Op), which is where the whole genre
converged.

The code blocker is not netcode. It is that `this.weapons`, `this.passives`,
`this.level`, `this.xp`, `this.xpNext` and `this.pendingLevelups` are Game fields
(`js/game.js:104-108`) and `recalc` writes eight derived stats onto the Game
(`js/game.js:155-166`). In 3.0 that list grows: the substrate keeps `this.relics`,
`this.shotTraits` and `this.dashTraits` on the Game
(`D:\Programs\mbm-3.0-substrate\js\game.js:41-44`), `armShot` defaults to
`this.shotTraits` (`:164-166`), and the recompile writes `dashMods`, `shotTraits`,
`strikeTraits` and `dashTraits` back onto the Game (`:199-202`). Every one of those
is a per-scout field the moment a second scout exists.

### 5.2 One shared XP bar

There is no personal XP. Gems feed a single party bar. When it fills, the party
ranks up once, and every living scout is handed their own cards.

This is both the better design and the smaller diff, which almost never happens.
`level`, `xp`, `xpNext` and `pendingLevelups` are already single Game fields and
`gainXP` already increments one counter (`js/game.js:294-300`). Per-player XP would
need per-player gem attraction, per-player magnet radius, per-player curves and a
kill-credit rule in a room holding thirty bodies where kill credit is meaningless.
A shared bar also deletes kill stealing outright.

Vampire Survivors shares XP and then rotates who gets to choose, in repeating
numerical order (sourced, vampire.survivors.wiki/w/Co-op_mode). We do not rotate.
Rotating at three players gives each player a third of the picks, which is a
stripped run, and it is exactly why that game also has to cut every player to
3 weapons and 3 passives at three players and 2 and 2 at four, against 6 and 6 solo
(sourced, same page). Everyone picks, every time.

**One consequence to tune rather than discover:** `xpMul` is per player and applies
at collect time (`js/game.js:162`, applied in `gainXP` at `js/game.js:294-296`), so
with a shared bar the scout who leaned into badge XP is worth more running for gems
than their friends are. That is a real emergent role and nobody had to author it.
It also means one player's item choices silently set the whole party's progression
speed, so it is a balance target, not just a feature.

### 5.3 One purse

Cookie Money is a single shared party purse. The in-run shop stocks a separate
stall per scout, because what it sells is build and build is per player, but they
all pay out of the one purse, and every spend announces who spent it on what.

The Gungeon wallet failure cannot happen here for a structural reason: coins are
credited, never collected (violation list item, section 2.3). There is no coin
entity for a fast player to hoover. Three separate purses would third everyone's
buying power against fixed prices and break Field Strip's arithmetic
(`js/game.js:1447-1450`). One purse also makes spending party money to heal
yourself a decision you have to say out loud, which is the good kind of friction.

One fix the shop needs either way: `runshopAvailable` can show SOLD OUT when a pool
runs dry (`js/ui.js:401-405`). With two buyers that is two disappointments.

### 5.4 Chests open for everybody

Nobody takes a chest. When any scout touches one, it opens for the whole party and
every living scout gets their own choice from their own pool.

`grantChest` currently auto-applies `levelPool(1)` with no choice at all
(`js/game.js:274-288`), which BUILD_ARCHITECTURE already wants changed on its own
merits. Chests arrive through the pickup loop (`js/game.js:1199`).

That resolves contested pickups almost entirely. The complete list of pickup types
is cocoa, magnet and chest (`js/game.js:1192-1201`) plus gems. Gems feed a shared
bar so they cannot be hoarded, chests open for everyone, and magnet attracts every
gem to its nearest scout so it helps the party by definition. **Cocoa is the only
contested object left in the game**, and one contested heal that two people have to
talk about is a feature.

### 5.5 Offer exclusivity: within a round only

When two card panels open at once, no two players see the same card. That is the
whole rule.

Run-wide first-acquisition exclusivity is cut. Against 96 ledger items with 72
available on a fresh save (`BUILD_ARCHITECTURE.md:895`) and 26 taken per player per
night (`:914`), two players need 52 of 72 and three need 78 of 72. It is
arithmetically impossible at three and it strangles a fresh guest at two. It is
tighter still per family: the family is the acquisition cap, 16 items against a cap
of 6, so two players leaning the same family collide immediately.

What stops two Maxes playing the same run, then? The capped channels, which co-op
cannot exhaust. Twelve weapons choose four is 495 weapon sets. Four fork ends per
weapon. Eight keystones. Those carry divergence by themselves; the ledger was never
where two players would have been separated. Add a soft per-family offer bias away
from families a teammate is already deep in, which costs nothing and needs no pool
headroom.

### 5.6 The level up problem

This is the hardest question in the brief. Here is the whole answer.

**The fear.** Thirty picks a night, times three players, is ninety card moments,
each of which stops the world for everyone. At a 17.6 minute run that is an
interruption every twelve seconds.

**Why the fear does not survive a shared bar.** With one bar and one party level,
the party ranks up thirty times, not ninety, and every living scout picks from
their own cards at the same moment. Thirty interruptions at any party size, which
is exactly what solo already lives with, at roughly 1.1 per room across 27 rooms.

**Then price the curve so nobody loses picks.** `DATA.xpNext` takes only a level
today (`js/data.js:272`). It gains a living-player count. The rule is an invariant,
not a multiplier, because stating it as a multiplier is how one design ended up
saying two incompatible things a page apart:

> **xpNext must be scaled by exactly the same factor as total XP income, so that
> ranks per player per run is invariant to party size.**

Write that as a test rather than a formula. `xpNext(l, 1)` must equal `xpNext(l)`
exactly, and a simulated party of N earning N-scaled income must produce the same
rank count as solo, measured in the bot harness against actual credited XP. It has
to be measured rather than derived because income does not scale exactly with body
count: `xpMul` is per player and applies at collect time, so which scout picks up
which gem moves the number.

Apply the same treatment to the other two delivery channels so pick income per
player is invariant on all three: chest drop rate divides by party size so each
player still sees about seventeen, and coin income multiplies by party size against
unchanged prices so each player keeps solo buying power. Coin income already has
the right door to hang it on, because `gainCoins` is already wrapped once for the
LEAN SEASON carving (`js/director.js:34-40`).

**Now the card itself: it must not stop the world.** Today it does. `g.update` runs
only when `App.state === 'play'` (`js/ui.js:2127`), so the card screen, the shop,
the pause menu and eight other screens all freeze the simulation. In co-op that is
unacceptable and there is no way around it.

So the card becomes a non-modal panel on your own side of the screen, with the
simulation running behind it. Three notes on the cost:

1. **The banking pattern already exists and it has a hole.** `banksLevelups`
   (`js/ui.js:984-987`) banks rank-ups during a clear-locked fight, which is
   genuinely the most valuable co-op property the engine owns by accident. But it
   requires `lock === 'clear'`, and THE PRESSURE BOG is a combat room with
   `lock: 'survive'` that runs three waves (`js/rooms.js:948-950`, waves tick at
   `js/room.js:433`). So the card screen already opens mid-wave there, in the
   shipped solo game. **Fix it now, independent of co-op**, by making
   `banksLevelups` key on the same condition `js/room.js:433` uses to decide whether
   to run waves: state active, and lock clear or survive. One line, and the two
   predicates stop disagreeing.
2. **Cards resolve at the room boundary and the doors are NOT held.** One design
   held the doors until every scout had picked, with a twenty second escape valve
   after which unresolved picks travel with you. If picks can travel, the hold buys
   nothing except the wait, and it converts the party's cost per rank from the
   average reader to the slowest reader, roughly forty-seven times a night. Picks
   travel, always. A player who wants to read stands still and reads; the room ahead
   does not lock until the party enters it.
3. **Read time is going up while we are doing this, and nobody costed it.**
   BUILD_ARCHITECTURE targets the share of pick events that are not a decision
   dropping from 47 percent to under 10 (`BUILD_ARCHITECTURE.md` section 8), against
   a 96 item catalogue with composed icons, a family strip and locked prerequisite
   cards shown as goals. Every card is about to take longer to read, correctly and
   on purpose, at exactly the moment co-op multiplies read time by the maximum over
   N players. **Measure it before designing around it:** the Wave 4 bot harness can
   record wall-clock time on the card screen per pick under the new catalogue, solo.
   That single number times the expected maximum over two draws is the real cost of
   any co-op pick model, and until it exists every cadence claim in this document
   rests on today's much simpler cards.

**Solo pays for exactly one thing here**, and it is refundable: the solo card is a
big centred modal today and would become a smaller side panel. So build one panel
and ship a "pause while choosing" setting that is on by default for solo and forced
off in co-op. Same UI, same content, one flag. Do not build two level-up screens.

---

## 6. Death, downing and revive

### 6.1 The rule

At zero HP a scout does not die. They go down: kneeling, unable to shoot, crawling
at about 40 percent speed, bleeding out over 25 seconds. A teammate standing within
about 40 units for 2.5 seconds brings them back at 40 percent of max HP. The
reviver pays 8 max HP for the rest of the night. If the clock runs out the scout is
out for that room only and returns automatically at the next room clear, at 40
percent HP, costing the party 25 Cookie Money or, if the purse is empty, 10 of
their own max HP.

The night ends when every living scout is down at the same time. That is the only
wipe, and it needs no extra machinery: a room can only clear if somebody is
standing, and a scout only auto-returns on a room clear, so a party with nobody
standing can never clear and can never return anyone. On a wipe everyone banks what
they earned, the same rule as solo (`js/meta.js:105-125`), and everyone banks the
same badge total, because badges are proof of witness and you were all there.

### 6.2 Why these numbers

- **25 second bleed-out.** Corner to corner in a 1210 by 790 room is about 1445
  units, and Gus at speed 132 (`js/data.js:34`) covers it in about 11 seconds. So
  the timer is two crossings with room for a fight in the way.
- **40 unit revive radius** sits just under the door trigger radius of 46
  (`js/room.js:19`), so it reads as the same kind of interaction as everything else
  in the room.
- **2.5 second dwell** is the same accumulator the doors (0.3s, `js/room.js:21`) and
  the finds (0.4s, `js/room.js:31`) already use, retuned.
- **40 percent return** is exactly what Second Wind already gives
  (`js/game.js:490`), so there is one revive number in the game rather than two.
- **The tension is free**, because every AI in the game steers at one variable
  (`js/director.js:1740`). A downed scout stops being a target, so the whole room
  converges on the one standing.

### 6.3 What has to be built, honestly

Nothing. There is nothing to extend. `damagePlayer` flips `this.phase = 'dying'` on
the GAME object and calls `Run.clearSave()` first (`js/game.js:506-507`), and the
only revive is a 400-badge meta rank operating on the single player. Downed has to
become a state on the player, which is only expressible once player state is per
player. Budget it as a full 4 to 6 day unit with its own review pass, not as a
follow-on to the netcode.

### 6.4 Solo gets none of this

Solo death stays death. Second Wind stays the once-per-night revive that costs 400
badges on the Badge Board. The downed state requires another scout standing, so with
one scout the rule resolves to exactly today's behaviour with no solo branch. Do not
let the auto-return-at-room-clear rule leak into solo: it would make the solo player
effectively immortal and delete the stakes for the majority of buyers.

---

## 7. What co-op adds

Teddy asked whether co-op unlocks any interactions. It does, and the honest framing
is that **it cannot add more horde**, because the frontage arithmetic in section 3.2
says a stacked party is easier and not harder. Anything co-op adds has to come from
the build, the room and each other.

### 7.1 A friend picks you up

The downed and revived beat is the one mechanic that structurally cannot exist solo,
and in every game in the reference set it produces the best moments. Vampire
Survivors leaves a coffin whose revive bar fills faster when living players stand
near it, and grows enemies near coffins; Repentance turns dead players into ghost
babies that can still carry consumables and respawn at the next boss clear (both
sourced). Ours writes itself out of the premise: belief is sight, a scout going down
is being Signed, and a friend standing over them and seeing them is what interrupts
it.

### 7.2 The door becomes an argument

The door choice with reward previews is the Isaac and Hades DNA we are building
anyway. Solo it is a decision; with two people it is a negotiation, and it is
expressed by standing somewhere rather than by a vote screen. `_tickDoors`
accumulates dwell for the one player inside the radius and one-shots the whole room
(`js/room.js:811-827`). In co-op, accumulate per standing scout into the same dwell
and raise the threshold to about 0.9 seconds. One scout alone still takes the party
through, in 0.9 seconds, which is long enough for the other to notice and walk over.
Two scouts on the same door take 0.45. Two on different doors fill neither, because
the existing 2x decay eats each door while its occupant is elsewhere. The door
already knows what it is offering (`d.offer`, `d.label` from the run plan), so the
disagreement is legible with no new UI. Keep the solo threshold at 0.3: making 27
transitions a night sticky for solo players to enable a two-player negotiation is a
bad trade.

### 7.3 The horde arrives around the group

Section 4.2. Two scouts standing apart split the ring; two standing together share
one wall of bodies. That is a positioning conversation that solo cannot have, and
it costs one change to two functions.

### 7.4 Two boss fights that are already written and are already about being seen

This is the best value item in the entire co-op exercise and it has nothing to do
with co-op.

`bossBehind` (`js/director.js:1440-1550`) is a complete three phase AI: it holds its
own HP hostage while hidden, puffs to the breakable prop farthest from the player,
is caught in the open for two seconds when its cover dies, regrows stumps when the
room runs out of cover, and throws paired cones in phase two. `bossMole`, MAWMOLE
(`js/director.js:1255-1300`, `:1356-1435`), goes under, is untouchable under, erupts
on a warned zone, digs tunnels in phase two, and in phase three hunts `ai.huntSpot`,
which `trackPlayerNoise` writes from whether you are holding fire
(`js/director.js:1415-1435`).

Both are referenced by nothing. `DATA.bosses` holds exactly three entries, hare,
vicar and antlered (`js/data.js:207-211`), and `DATA.bossTiers` copies those same
three (`js/data.js:449-459`). Everything else exists: the phase cuts
(`js/director.js:321-322`), the arena prep, the move dispatch, the render branch
(`js/render.js:648-659`), the sprites (`P.mawmole` at `js/sprites.js:852`, `P.behind`
at `js/sprites.js:908`) and the music, already mapped in the audio director
(`js/audio_director.js:27-33`, mole to mawmole and behind to behind, with the tracks
at `js/music/src/boss_mawmole.js` and `js/music/src/boss_behind.js`).

One design claimed the sprites were missing and budgeted these as a content wave.
They are not missing. What is missing is a `DATA.bosses` entry, a `DATA.bossTiers`
slot, a killer name, a Field Guide entry and playtesting. **Two to four days.**

**Ship them for solo, in 3.0, and delete the co-op framing.** THE BEHIND solo is a
demolition puzzle: break cover until it has nowhere to be. MAWMOLE solo is a noise
puzzle: stop firing and it loses your address. If co-op ever ships, THE BEHIND
becomes a pinning fight, but note what the design that proposed it missed:
`behindStep` returns null only when there are zero live breakable props
(`js/director.js:1506-1527`), so changing its scoring function never fires the
exposure punishment. Making the two-witness version work needs a new minimum
acceptable score threshold and a shorter re-step cadence (`hideT` is reset to 3),
and both are visible in the solo fight. It is a real design unit, not a one line
change.

### 7.5 Should any content be co-op exclusive? No

**Nothing. No badge, no scout, no weapon, no ledger item, no keystone, no story
beat, no camp furniture, no Steam achievement.**

One design proposed a single co-op merit badge, presence-gated rather than skill
gated, rewarding a cosmetic, deliberately kept out of the Steam achievement map. It
was carefully argued and I am cutting it, for two reasons. First, `STORY_DESIGN.md`
plans to map the fourteen merit badges one to one onto Steam achievements, and a
sash with a badge you cannot earn alone is a permanent, visible cost paid by the
overwhelming majority of buyers for a mode most of them will never open. Second, the
moment one thing is co-op exclusive, everything else in the design has to be
defended against the same pressure, and the rule "co-op is a way to play, not a
thing to own" is much easier to hold at zero than at one.

The related and non-negotiable version of this rule: **no co-op bonus may route into
permanent progress.** Anything co-op pays goes into `this.badges`, the run currency,
and stops there. It must never touch `META.counters`, `META.codex`, the Field Guide
thresholds or any merit badge `have()` function. If co-op ever becomes the fast way
to fill the Field Guide, the solo majority pays for co-op in the currency of their
own playtime, and that is the one thing the standing rules forbid outright.

### 7.6 What I am cutting from the co-op-adds list, and why

Corroboration currency (a witnessed kill paying more), the Attending (one critter
turning to face the scout who is not looking), the guest book marks and the
two-point objective rooms are all good ideas and all cut from any first version.

The premise objection is worth stating because it is the strongest argument against
building co-op at all. `STORY_DESIGN.md` section 0 says belief is sight and badges
are proof of witness, and the emotional engine underneath that is **you saw it and
cannot prove it**. A second player is the exact thing the story is built on not
having. Making corroboration a mechanic does not add co-op to the story, it plays
the story's resolution as a mode. The clearest case is the Attending, which is
explicitly the sibling of THE DOE, a beat the solo player already gets at minute two
and, by the proposing design's own account, gets better.

So the rule is: **co-op does not touch the fiction.** No corroboration currency, no
co-op dialogue, no arc beat that acknowledges a second scout. Camp Hearthwood's
story is something each player has alone. That is a smaller and more coherent
product, and it removes the premise objection rather than arguing with it.

---

## 8. The host's camp, with guests in it

Teddy already decided the shape: the host's camp is the shared hub, everyone hangs
out in the host's Camp Hearthwood between runs, guests keep their own roster,
badges, meta progression and cosmetics, NPCs are visible to everyone from host world
state, and dialogue and voice resolve per player against that player's own progress
with stranger variants and tease gating. This section builds on that and answers the
new wrinkle: the camp is now survivors, and the player builds it, so a guest walks
into a camp somebody else built.

### 8.1 The buildings are theirs, the contents are yours

A guest sees the camp exactly as the host built it. They can walk anywhere and talk
to anyone. They cannot construct, move furniture or spend the host's badges. But
when they walk up to the Badge Board it opens THEIR board. Same building, their name
on it.

### 8.2 Camp construction buys things for the NIGHT, not for the person

This is the rule that makes a guest's visit work, and it is cheaper and cleaner than
the alternative.

A finished mess hall starts every scout on the night with a heal. A workshop
guarantees a shop room in the plan. A watchtower reveals one extra door preview.
Because the benefit attaches to the night rather than to a save, the host's camp
naturally gives it to everyone who leaves from it, with no merge logic between two
camps, no way to farm a stranger's progress, and no version of "the guest is playing
on borrowed progression", which is the Isaac baby inverted.

The alternative considered and rejected was "take the better of your camp and
theirs, session only". It needs both camps loaded, and it makes the host feel their
camp does not matter whenever the guest's is better.

Night-scoped construction benefits are also a better solo design on their own
merits: they make the camp a thing you build to change tonight, rather than a
permanent stat sheet. Camp tier today is a render authority only, keyed on lifetime
totals (`js/meta.js:143-150`).

### 8.3 The host's night, disclosed before anybody commits

The one genuinely mechanical thing the host owns is the Tally Post. TIGHTER WOODS
multiplies every wave by 1.2 (`js/room.js:62`) and SHARP TEETH stamps 25 percent
more damage onto every body at spawn (`js/director.js:20-22`, applied at
`js/director.js:167`). Both read the LOCAL player's carvings today.

In co-op the night is one night, so the host's carvings are read once at run start
and frozen, and the guest runs the host's night. The guest therefore also earns the
host's badge multiplier, which is 1 with a bare post and exactly 2.00 with all six
carvings (`js/meta.js:107-118`). That is fair, legible, capped, and it requires
surviving the harder night, which makes hosting from a veteran camp a real gift.

**The guest must see the night's carvings and its badge multiplier before they
commit, in plain words.** Dragging somebody into a doubled night without telling them
is the kind of thing that ends a co-op session. If this disclosure is treated as
polish and cut, it becomes the single most common co-op complaint. And the reverse
must be impossible: a guest's carvings can never change the host's night, or a
friend can make your run harder from their own camp.

### 8.4 Staged moments are host-world only

The camp has a budget of about eight staged story moments across an entire save, and
every one is a one-shot that writes a flag and saves immediately. A guest pressing E
must never consume one of the host's, and must never have one of their own consumed
for them. Each player's dialogue resolves against their own META, which is correct
and means two people at the same fire hear their own beat from the same man without
either seeing the other's dialogue box. The held twist does free work here.

### 8.5 What the camp does not need

The camp is a fixed 1560 by 1080 world units regardless of build tier (`CAMP_G` at
`js/camp.js:14`) at `CAMP_ZOOM 1.25` (`js/camp.js:10`), with a smoothed follow
camera. Under per-player cameras, two scouts in a camp is a second avatar and
nothing else. The guest problem is a content and dialogue problem, not a space
problem.

### 8.6 The trailhead

Departure becomes the lobby: walk to the trailhead, pick your scout there, standing
on it marks you ready, the host starts the night. This is the largest camp rework and
it is cut from the first version (use a menu-based join and add the in-world lobby
later). Solo's departure must not gain a ready confirmation: one scout at the
trailhead leaves, full stop.

---

## 9. Networking, disconnection and host migration

### 9.1 The model is decided for us: host-authoritative binary snapshots

Lockstep is dead twice over.

It is dead once because the simulation is nowhere near deterministic. Variable dt
with no accumulator (`js/ui.js:2115`), three dt rescales inside one update, about 85
`rand`/`pick` calls in the simulation files plus seventeen direct `Math.random` calls
that change fight outcomes, two window reads inside the simulation, knockback that
decays by `Math.pow(0.002, dt)` (`js/director.js:1786-1787`) so the game literally
plays differently on a 144 Hz screen.

It is dead again because backlog task 30 makes the free web build the funnel for the
paid Steam release, so cross-browser co-op would mean cross-engine lockstep, and the
ECMAScript spec explicitly allows `Math.sin`, `cos`, `pow`, `atan2` and `hypot` to
differ in the last bit between conforming engines (sourced, ECMA-262). Our simulation
files use those functions over a hundred times.

So: **the host simulates, guests predict only their own scout, and the host pushes
binary quantised snapshots at 30 Hz.**

### 9.2 Bandwidth is not the constraint, the wire format is

Measured against the real field list, a live enemy is 582 bytes of JSON. JSON
snapshot replication is dead at any rate worth playing: dynamic fields only at 20 Hz
is still over 5 Mbit/s per guest, before the garbage collection problem of allocating
megabytes of string per second on a 60 Hz canvas game.

Binary quantised, with static fields sent once at spawn (about 12 bytes per enemy, 8
per projectile, 5 per gem, 4 per prop, 16 per player), against the real room peak of
about 40 bodies at two players rather than the 90 everyone was budgeting: roughly
1.2 KB per tick, so about 37 KB/s per guest at 30 Hz, which is 0.30 Mbit/s. Two
guests is 0.6 Mbit/s of host upload. Comfortable on home broadband.

There is no middle option. JSON never works and hand written binary always works.

### 9.3 Disconnection and host migration

**Version one ships no mid-room host migration, and probably no host migration
ever.** If the host quits, the run ends, and every player keeps their own
room-boundary save and continues solo. The results screen says a scout walked home,
not a network error.

That is a two day feature instead of a fifteen day one, and it works because the
mid-run save is already the migration design. `Run._write` (`js/run.js:993-1018`)
carries the seed, the rng cursor, the plan, the act, the room index, the recent
window, the frozen carvings and a per-player game snapshot, and it already writes at
room boundaries. Any peer holding that tuple can rebuild the identical night.

**Headcount changes must be deferred to the next room boundary.** The room advances
on a ratio of living to `waveTotal` (`js/room.js:584-593`), so rescaling a wave in
flight either strands the room permanently unclearable or opens the doors instantly.

### 9.4 Cheating and griefing

Join by code or invite link only, friends only, permanently (section 13). Host
authority means the host can hand themselves health and can inflate or starve a
stranger's badge progression, because guest progression arrives as host-sent events.
Among friends nobody cares. A public queue would add a lobby directory, abuse
reporting, name moderation, relay costs and a real cheat surface, for a game whose
co-op pitch is playing with a friend.

Griefing is mostly solved by the loot rules rather than by moderation: the shared XP
bar means gems cannot be hoarded, the shared purse is credited rather than collected,
and chests open for everyone.

### 9.5 The lobby service

A Cloudflare Worker doing signalling and short codes with a TTL is 2 to 3 days, and
it is the smallest piece of the whole project by a wide margin. Build it last.

### 9.6 On the fixed timestep

It is worth 3 to 5 days and the single player game is owed it, because the game plays
differently on a 144 Hz screen today. But it is not required by snapshot netcode, and
converting roughly 300 dt sites while 3.0 is simultaneously re-tuning the entire build
economy against measured baselines means no regression can be attributed to anything.
**Schedule it after 3.0 ships and before netcode starts, on its own.** Same for
seeding the simulation RNG.

---

## 10. Constraints for BUILD_ARCHITECTURE.md

These are hard requirements on the item architecture. Each one is written so that it
can be checked against that document by reading it, and most of them can be checked
by a grep. They assume nothing about whether co-op is ever built: every one of them
is either free or a solo improvement.

**C1. The build is an object owned by a player, and no stat lives on the Game.**
Test: no derived stat, held item, trait set or progression counter is assigned to
`this.` on the Game object. Today `recalc` writes eight stats onto the Game
(`js/game.js:155-166`) and the substrate keeps `relics`, `shotTraits`, `dashTraits`
and `dashMods` there (`mbm-3.0-substrate/js/game.js:41-44`, `:199-202`).

**C2. Every offer, apply and grant function takes an owner as its first argument.**
Test: `offer(build, n, taken)`, `apply(build, c)`, `grantChest(build)`,
`gainXP(build, v)`. Today `levelPool(n)` (`js/game.js:191`), `grantChest()`
(`js/game.js:274`) and `gainXP(v)` (`js/game.js:294`) all read and write `this`.

**C3. The offer builder accepts a taken-set and can fill N distinct offers for N
players in one round.** Test: calling the builder twice in the same round with the
same catalogue returns no card in common. Run-wide exclusivity is NOT required and
must not be assumed: at 26 picks from 72 available on a fresh save
(`BUILD_ARCHITECTURE.md:895`, `:914`) it is arithmetically impossible above one
player.

**C4. Arming takes an owner, and every spawned persistent object carries an owner id
and an entity id.** Test: `armShot(owner, s, set)` rather than defaulting to
`this.shotTraits` (`mbm-3.0-substrate/js/game.js:164-166`), and no `push` of a
projectile, zone, ring, puddle or pickup creates an object without both ids.

**C5. Hit registries are sets of ids, never sets of objects.** Test: grep the item
and trait files for `new Set()` and `new Map()` holding entities. Today
`js/game.js:918`, `:940`, `:1053`, `:1466` and `js/dodge.js:66` all store enemy
objects, which cannot survive a snapshot, cannot attribute damage and cannot credit a
kill.

**C6. No item, trait or hook handler reads `g.player` or `this.player`.** Test: a
lint rule banning those two identifiers in `traits.js`, `hooks.js` and `items.js`,
enforced in CI. The substrate already violates it once, homing an orbiting shot at
`g.player` (`mbm-3.0-substrate/js/traits.js:180`).

**C7. No item effect reads META, the wall clock, the window size or `Math.random` at
fire time.** Test: grep the item and trait files for `META.`, `window.`,
`performance.now`, `Date.` and `Math.random`. Each player's meta must resolve once at
run start into a loadout object, because under host authority only the host runs the
handler.

**C8. Nothing keys off character uniqueness.** Test: no item, synergy, prerequisite
or scaling rule reads a charId in a way that assumes the party holds distinct ones.
Duplicate scouts are mandatory (`js/roster.js:8-20`).

**C9. Item delivery is resolvable without stopping the simulation, in all seven room
types.** Test: no delivery moment requires `App.state` to leave `'play'`
(`js/ui.js:2127`), and no delivery moment requires the player to resolve it at the
instant it is earned. Note the existing banking hole: `banksLevelups` misses
`lock: 'survive'` (`js/ui.js:986` against `js/rooms.js:948-950`).

**C10. If reward delivery is per room rather than per level, it is one offer per
player per room.** Test: the document states either three reward objects priced in the
art, the 27 authored layouts and the door preview UI, or the rule that one touch opens
a per-player offer for everybody. One pedestal contested by two players is the
Gungeon wallet problem with better graphics.

**C11. Every world-space item visual is an outline, declares a maximum radius of 240
world units, and accepts an owner tint as a parameter of its derivation.** Test: no
persistent aura, zone, orbital or trail is a filled disc. The shipped charge lane is a
filled rectangle at 0.16 alpha (`js/render.js:86-87`) and is the proof that fills wash
out when two overlap.

**C12. No item's identity rides on emitter density, and the effects budget is per
party.** Test: `PART_CAP` is a single global 420 (`js/game.js:1287`), so an item whose
feel depends on particle count is silently divided by the player count. Identity rides
on shape, timing and sound.

**C13. Weapon and item range stays under 455 world units.** Test: the longest shipped
weapon is 340. 455 is the horizontal half-view at the reference resolution, and it is
what makes "nothing on screen is out of range" true.

**C14. No item may raise the living enemy count outside the party body multiplier.**
Test: summons, splits and resurrections route through `js/room.js:62` rather than
around it. `cindercrow` already carries `onDeath: 'split2'` (`js/data.js:186`), so
this is a live path.

**C15. A player's whole build serialises to a few hundred bytes as a count vector over
a fixed id list.** Test: the build can be written and restored without any object
reference, because it is sent at join, at every room boundary and at migration.

**C16. The save is a list of builds, not a build.** Test: `snapshot` and `restore`
(`js/game.js:1560-1596`) produce and accept an array with a length of one. The save
and transfer compatibility rule is explicitly no longer a constraint, so this is free
today and a migration later.

---

## 11. What 3.0 must hold so co-op is not a rewrite

Paste this list into every 3.0 implementation brief. Each item is a shape decision
that is nearly free while the code is being written and expensive once 96 items and
eight keystones exist. **None of them changes solo behaviour.** The sequencing point
that matters: the ownership items must land in the early waves, before unit C1
authors the catalogue (`BUILD_ARCHITECTURE.md:1168`, four days of authoring against
whatever signature exists at that moment).

**I1. Owner on every event.** `Hooks.emit` becomes `emit(ev, g, owner, a, b, c)` and
handlers become `fn(g, owner, a, b, c)`. None of the ten emit sites carries an owner
today: `onKill` does not say who killed it, `onDamaged` does not say who was hurt,
`onPickup` does not say who picked it up (`mbm-3.0-substrate/js`: director.js:954,
dodge.js:115, game.js:156, :406, :484, :543, :613, :1342, :1356, room.js:776).

**I2. The handler registry is keyed by owner and source together.** `Hooks.off(src)`
removes by source alone (`mbm-3.0-substrate/js/hooks.js:72-80`), so two players
holding the same item cannot register independently and removing one removes both.

**I3. No module-level mutable simulation state.** The Hooks lists and the sequence
counter are closure state (`mbm-3.0-substrate/js/hooks.js:45-52`), `Transition` keeps
`active`, `t` and `door` on the module (`js/transition.js:36-57`), `Reticle` keeps one
module object, `INPUT` is a global. Anything a second Game needs its own copy of moves
onto the Game. Without this there is no headless replay, no desync detector and no
automated co-op test.

**I4. The build is an object owned by a player.** See C1. `p.build` holds items,
weapons, level, xp, xpNext, pendingLevelups, the stat block and the compiled trait
sets. Nothing reads a stat off the Game.

**I5. Every offer and apply function takes an owner.** See C2.

**I6. Arming takes an owner; every spawned object carries an owner id and an entity
id.** Ids exist only on enemies (`js/director.js:185`, `:316`) and props
(`js/props.js:153`).

**I7. Hit registries are id sets.** See C5.

**I8. No trait, hook or item reads `g.player` or `this.player`.** See C6. One grep in
CI, and it is the cheapest guard on this list.

**I9. No simulation code reads `window`, `screen` or `devicePixelRatio`.** Three
sites: `viewRadius` (`js/director.js:43-45`), the aim solve in `readInput`
(`js/game.js:637-639`), `Reticle.update` (`js/reticle.js:51-53`). The input frame
carries an angle or a unit vector, never a world point. **This is also a shipped solo
bug**: a boss spawns outside the 1430 by 980 room on a 1440p monitor.

**I10. No simulation code reads META at fire time.** Five `META.rank` calls inside
`recalc` (`js/game.js:158-163`), Second Wind inside `damagePlayer`
(`js/game.js:488`), the carvings in `Room.night` (`js/room.js:38-42`, `:62`) and
`nightDmgMul` stamping 1.25x at spawn (`js/director.js:20-22`, `:167`). Each player's
meta resolves once at run start into a loadout; the night's carvings belong to the
host and are frozen at run start.

**I11. No shared scratch buffers.** `queryEnemies` returns `this._qbuf`
(`js/game.js:127`, `:605`) across every call site. Under the hook bus an `onHit`
handler can call it from inside a loop iterating the same buffer. **Latent solo bug
that the item system will detonate.**

**I12. Target selection is a function, not a variable.** Introduce `g.targetFor(e)`
returning a player, implemented today as `return this.player`. Every AI branch, every
boss pattern and the contact damage test goes through it (`js/director.js:1740` and
the steer sites below it, contact damage at `js/director.js:2168-2172`). This single
indirection, written now, turns the largest item in the whole co-op budget from a
rewrite into a function body.

**I13. The pick moment never stops the world.** `g.update` runs only when
`App.state === 'play'` (`js/ui.js:2127`). Any card, chest, keystone trade or shop UI
3.0 adds must be resolvable with the simulation running. Do not build a modal you will
have to unbuild. Fix `banksLevelups` to cover `lock: 'survive'` while you are here
(`js/ui.js:986`, and the hole is `js/rooms.js:948-950`).

**I14. Damage, death and revival are per player.** `damagePlayer` flips
`this.phase = 'dying'` on the Game and clears the save first (`js/game.js:506-507`).
Every 3.0 item reacting to death, low health or revival reads player state, never the
Game phase.

**I15. The save is a list of builds, not a build.** See C16.

**I16. Scale hooks exist and are pinned at exactly 1.** Add `g.livingPlayers()` and
route `bodyMul` (`js/room.js:62`), `ROOM_RELEASE` (`js/room.js:24`), the elite count
(`js/room.js:547`), the chest rate, coin income (`js/director.js:34-40` already wraps
`gainCoins`) and `DATA.xpNext` (`js/data.js:272`) through a party factor. Assert in a
test that every factor is the identity at one player. There is no `playerCount`
anywhere today, so this is new work, not unpinning.

**I17. Nothing keys off character uniqueness, and the scout tint is a parameter.** The
scout painters bake fixed palettes (`js/sprites.js:1618-1624`), so a per-player colour
means the painter takes a tint and the bake cache key includes it. The same change
unlocks cosmetic scout colours later.

**I18. No room layout may have a co-op only clear condition, and no layout is
re-authored for co-op.** Every layout ships its solo shape as the authored default.

**THE REVIEW DISCIPLINE.** Every unit that touches this list is reviewed by reading
its SOLO path and asking what changed, and the answer must be nothing. Typecheck and
build cannot catch a sapperrat losing interest when a solo player stops firing. This
is the only gate that exists for the thing that matters most.

---

## 12. Cost

One developer, honest, and the categories matter more than the totals because they
say where the money actually goes.

### 12.1 The full design

**A. Making the simulation genuinely multi player.** This exists even if the two
players sit on the same couch, and it is bigger than the entire networking layer.

| Unit | Days |
| --- | --- |
| Players array and target selection through the AI | 10 to 14 |
| Build state onto a player-owned object (during 3.0; 8 to 12 after) | 5 to 8 |
| Hooks bus per owner (during 3.0; 5 to 8 after unit C1) | 1 |
| Viewport out of the simulation (three sites) | 1 to 2 |
| Entity ids everywhere and id-based hit sets | 2 to 3 |
| Downed state, bleed-out, revive, wipe rules | 4 to 6 |
| Loot, magnet, XP and coin ownership | 2 to 3 |
| Pause model: the world runs while a card is open | 4 to 6 |
| HUD per player, identity colour, nameplates | 3 to 5 |
| META out of the simulation, per-player credit events | 3 to 4 |
| Camera per player and the reticle zoom fix | 2 to 4 |
| Singleton and scratch buffer cleanup | 2 to 3 |
| Seeded simulation RNG (optional for snapshots) | 2 to 3 |
| Fixed timestep (optional for snapshots) | 3 to 5 |
| **Subtotal A** | **44 to 67** |

**B. The networking layer.**

| Unit | Days |
| --- | --- |
| Binary wire format, quantisation, spawn deltas | 5 to 8 |
| WebRTC transport and connection state machine | 4 to 6 |
| Guest prediction, reconciliation, interpolation | 6 to 10 |
| Presentation events for guests | 3 to 5 |
| Hit claims and host validation | 3 to 4 |
| Room transition sync, join and drop grace | 4 to 6 |
| Two-window harness with latency and loss injection | 3 to 5 |
| NAT failure, a real relay, reconnect UX, build hash gating, error states | 5 to 8 |
| **Subtotal B** | **33 to 52** |

**C. The lobby service:** 5 to 8 days. Smallest piece by a wide margin.

**D. The design features on top:** shared bar and party curve (3 to 5), within-round
exclusivity (2 to 3), chests for everyone (1), the door negotiation (1), revive feel
(2 to 3), target selection rules (2 to 3), party-centred spawns (2 to 3), sub-linear
scaling plus release scaling plus the separation rebuild (3 to 4), camp guest work
(5 to 8), balance and playtest passes (5 to 10). **Subtotal D: 26 to 43.**

**GRAND TOTAL: 108 to 170 developer days.** For one person also making art, audio and
design, that is 9 to 14 months of calendar.

**Which is biggest: A**, and it is the one everybody mistakes for netcode.

### 12.2 The minimum viable co-op

Two players. Invite by link or six character code. Friends only. No random queue. No
host migration. No drop-in: both present in the camp before the run starts. Online
only, so per-player cameras and no shared-screen work at all. Host quitting ends the
night and everyone keeps their own room-boundary save.

It keeps: per-player builds, one shared XP bar with a card to each scout, the
non-modal pick, chests opening for both, the shared purse, the downed and revived
beat, the door as a negotiation, party-centred spawns, sub-linear scaling with the
release rate fix, and the separation rebuild.

It drops: the third player, run-wide exclusivity, all shared-camera work, the
corroboration currency, the Attending, the co-op badge, the guest book, the trailhead
lobby rework, two-point objective rooms, host migration, matchmaking, and both the
fixed timestep and the seeded RNG waves.

**A narrowed 30 to 42, B narrowed 26 to 40, C 4 to 6, D narrowed 12 to 18.
TOTAL: 72 to 106 developer days.**

About 62 percent of the full cost for what I judge to be about 85 percent of the
value, and the value it drops is almost entirely the third player. That last figure
is a judgement, not a measurement.

### 12.3 What to spend now

**4 to 7 days, inside 3.0, on the section 11 invariants.** That is the whole
recommendation. It buys back 18 to 26 days later and it is the difference between
co-op being a project and co-op being a rewrite.

Plus, separately and for solo reasons: the separation rebuild, the three window-read
fixes, the `banksLevelups` fix, the `_qbuf` fix, and 2 to 4 days shipping THE BEHIND
and MAWMOLE.

---

## 13. What we are not doing

**Split screen.** A half viewport at 1920 by 1080 puts a typical room at 1.83 screens
wide per player, which is the exact framing the 2.0 room pass was built to eliminate,
and fitting it back needs a zoom well under the line-weight floor. The DOM HUD, the
screen-space reticle and the touch layer are secondary reasons.

**Couch co-op.** Same reason, plus the shared camera would need to zoom out and
ticktot is already exactly at the readability floor at ZOOM 1.5 (`js/data.js:179`).
This has a store page consequence: **do not let the word "local" appear in marketing
copy** unless this decision is revisited first.

**Mobile co-op.** A phone in landscape at 844 by 390 gives a vertical half-view of 130
world units against a 190 unit edge spawn floor (`js/room.js:28`), so a phone player
already cannot see an edge spawn arrive vertically at one player. The touch sticks are
sized in CSS pixels and cover the bottom of the screen (`js/touch.js:9-13`,
`:104-109`). The free web build stays solo and stays the funnel, which is what backlog
task 30 already assumes.

**Four players.** Section 3.

**Random matchmaking and a lobby directory.** Permanently, not just for version one.
It adds abuse reporting, name moderation, relay costs and a real cheat surface to a
game whose co-op pitch is playing with a friend.

**Mid-room host migration.** Version two at the earliest and probably never. The
room-boundary save already covers the case honestly.

**Re-authoring or resizing any of the 46 layouts.** Section 4.3.

**Co-op exclusive content of any kind.** Section 7.5.

**Anything co-op paying into permanent progress.** Section 7.5.

**Rotating who gets to pick on level up.** Section 5.2.

---

## 14. Open questions for Teddy

**1. Is co-op online only, or is couch co-op ever going on the store page?**
Recommend online only. It deletes the largest single block of cost in the design (the
shared camera, the leash, the zoom work), it removes the worst technical collision in
the plan, and it is forced anyway by ticktot sitting exactly on the readability floor
at the only zoom we can use. The alternative is same-screen co-op, which costs 6 to 9
extra days, requires re-authoring enemy sprite widths so the camera can zoom out, and
still cannot show two players a 1250 by 830 room on a laptop. If the answer is "online
only", say so before any marketing copy uses the word local.

**2. Do we accept that co-op ships after 3.0, not with it?** Recommend yes. The
minimum viable version is 72 to 106 developer days against 27.5 for the entire item
architecture, for a game that currently has two or three players. The alternative is to
schedule it now, which means 3.0 lands months later and the co-op is built for an
audience that does not exist yet. What we spend now is 4 to 7 days on the section 11
invariants, which is the part that gets expensive if it waits.

**3. Two players at launch, or three?** Recommend two, with three as a lobby constant
so it can be turned on later without touching the simulation. Two is the only count
where every axis is comfortable at once, and the item-pool reason that used to favour
exactly three died when the architecture became an uncapped 96 item ledger. The
alternative, shipping three, costs 3 to 6 extra days of tuning and readability work and
makes the stack problem, the test matrix and the party assembly odds all worse.

**4. Do you accept that co-op will feel different from solo?** Recommend yes, and it is
another reason the number is two. Trash-kill hitstop, player-hurt camera shake and the
death zoom all stop existing above one player, replaced by information rather than
force. Solo keeps all three. The alternative is to keep them, and then every kill
somebody else makes freezes your screen, which is the worst feel bug co-op can produce.
If you are not willing to ship a co-op mode that feels measurably different from your
solo game, that is a legitimate reason to not ship co-op at all, and you should get to
make that call before 47 days are spent.

**5. Should anything be co-op exclusive?** Recommend nothing at all: no badge, no
scout, no item, no story beat, no achievement. Co-op is a way to play the game, not a
set of things to own, and that rule is much easier to hold at zero than at one. The
alternative that was proposed and is defensible is a single presence-gated merit badge
rewarding a cosmetic and deliberately kept out of the Steam achievement map. I cut it
because the fourteen badges are planned to map one to one onto achievements, and a sash
with a badge a solo player cannot earn is a permanent visible cost paid by almost every
buyer.
