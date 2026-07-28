# Camp Hearthwood: the redesign, in two tiers

Companion to LEVEL_DESIGN.md. That document is binding doctrine for combat rooms and it does
not govern this one: the hub borrows its composition rules (formations, symmetry with one
violation, one motif per space) and refuses its combat numbers (dodge-distance gaps, charger
lane widths, the anti-alcove rule). A nook you can stand in is a bug in an arena and the point
of a hub.

## How to read the code references in this document

Every instruction names a **landmark** first: a unique string you can search for in the file.
The line number after it is a hint, correct as of 2026-07-28 against js/camp.js at 3721 lines,
and it will drift the moment anyone edits. **Follow the landmark, not the number.** Where an
earlier draft of this document gave a line range as the instruction, that was a mistake: line
ranges had drifted by 12 to 29 lines in camp.js and by 82 lines in index.html, where "relabel
the death panel buttons at index.html:536-538" was pointing at the Merit Badges panel.

This is not a theoretical hazard. **js/camp.js grew by 8 lines while this revision was being
written**, which moved every reference past line 800 by 7 or 8. Every number below was
re-resolved against the file afterwards and every one of them lands on the line its landmark
quotes, but the next edit will break some of them again. That is what the landmarks are for.

Every number below was measured against the current files, and the geometry was run through the
real `clampWalk` in a stubbed-DOM node harness, not reasoned about on paper.

---

## 1. The diagnosis

Camp Hearthwood is an open field with good furniture on it, and Hades is a building. The gap is
not dressing and it is not the lighting: **a hub gets its shape from a walk with a start and an
end, and our camp never makes you take one.** You come back from a run standing inside the trail
sign's own trigger radius, so the first prompt you see on arriving home says "take the trail"
and the entire campground is optional. That is the whole finding. Everything else in this
document is second place.

The second problem is smaller than the earlier draft of this document claimed, and the
correction matters because it changes what to build.

**Correction: things do already pass in front of you, and they pass badly.** The `nearL`
foreground layer holds nothing the player can reach, which is true. But the y-sorted furniture
pass already produces occlusion, and three of the four lone in-camp pines already swallow the
player whole:

| Pine (`push(py, ...)` in the loop at js/camp.js:2169) | Drawn span in y | Where you stand | Covered |
|---|---|---|---|
| (-250,-265) 74 by 168 | -443 to -265 | grove-to-stall corridor, (-250,-315) | the whole scout |
| (-285,130) 66 by 150 | -29 to 130 | west path, (-285,80) | the whole scout |
| (360,190) 64 by 146 | 35 to 190 | trailhead south edge, (360,130) | the whole scout |
| (240,-200) 70 by 158 | -367 to -200 | nothing walks there | nothing |

A scout is drawn 34 wide by 43.66 tall (arithmetic in section 3.2). Each of those three pines
covers all 43.66 of it at its own centreline, for as long as you stand there. So the camp does
not lack foreground; it has foreground with no budget on it. Section 6 sets that budget and
spends four lines fixing the pines that already ship.

---

## 2. The scope, in two tiers, so you can choose

Teddy asked for a slight redesign. The earlier draft of this document was not one: measured
honestly it is **8 units across 4 files, six of them a strict serial chain inside a 3721-line
file, roughly 450 to 550 changed lines, 18 new entries in a y-sorted array on a measured base of
30 furniture pushes, 16 additive-glow call sites, and 24 existing `shadow(ctx, ...)` call sites
disturbed by something it described as "one function move, five call sites".** That is a full
orchestration wave. It may still be the right thing to build. It is not a tweak, and the
document should have said so.

So it is split. Tier 1 is the slight one and ships on its own. Tier 2 is the wave.

### Tier 1: the slight one. About 105 changed lines, 92 of them in js/camp.js.

| # | What a player notices | Files | Changed lines |
|---|---|---|---|
| T1.1 | **You arrive at your own bedroll and walk home.** Today you arrive already standing on the exit. | js/camp.js | ~30 |
| T1.2 | **The fire gets louder as you walk toward it**, quieter and duller as you leave, and it pans to the side it is on. | js/camp.js, js/ui.js | ~22 + 1 |
| T1.3 | **The screen has corners again.** A real vignette, and it opens out of the dark when you get home. | js/camp.js | ~16 |
| T1.4 | **The cloth in camp moves.** Bunting, pennants, tent flaps and the lantern wire all lift on the same gust. | js/camp.js | ~24 |
| T1.5 | **Brock says how you died** before he starts a story. Today those hand-written lines are usually thrown away unheard. | js/dialogue.js | 6 moved |
| T1.6 | **The death panel's first button says RETURN TO CAMP**, and Enter goes there. | index.html, js/ui.js | 2 + 3 |

**Before and after, in player words.** Before: you die, you press Enter, you are standing next
to the trail sign in a silent still photograph of a campground, and the game asks you if you
would like to leave. After: you die, the screen opens out of black onto your own bedroll at the
far west end of camp, the fire is a faint crackle somewhere east of you, the bunting is moving,
and you walk the length of the camp to get to Brock, who tells you what killed you.

T1.1 plus T1.2 plus T1.3 is 68 lines in one file and already delivers most of that. T1.4 and
T1.5 are the two cheapest additions in the whole document. T1.6 is four lines and is the only
part that touches a second and third file.

### Tier 2: the wave. About 470 more changed lines, 6 units, 2 files.

| # | Unit | Files | Changed lines | Depends on |
|---|---|---|---|---|
| T2.1 | Architecture: three gates, narrowed connectors, the cabin you can hide behind | js/camp.js | ~120 | Tier 1 |
| T2.2 | Light: elliptical pools, the new pool table, the darker pine wall, one shadow convention | js/camp.js | ~90 | T2.1 |
| T2.3 | Ground: three new zone floors, the wider spine, six hedge runs | js/camp.js | ~70 | T2.2 |
| T2.4 | Ceremony: leaving at the trailhead, the dawn arrival colour, camp keeps moving during dialogue | js/camp.js, js/ui.js | ~50 + 8 | T2.3 |
| T2.5 | Ownership: Brock's seat, the tally post's yard, per-scout tents, two trigger radii, the death stick | js/camp.js | ~80 | T2.4 |
| T2.6 | Life: three gate lanterns, two birds, a deeper idle breath | js/camp.js | ~50 | T2.5 |

**Before and after, in player words.** Before Tier 2: a lit field with furniture on it, one
brightness everywhere, no doorways, and a cabin you walk around the front of. After: you walk a
road with three doorways on it, each one a peeled-log arch you pass through; the ground under
your boots changes when you leave the road; there is real dark either side of you and warm
knots at the fire, the gate lamps, the tally post and the trailhead; the tents belong to
particular people; and there is a pocket behind the cabin where nobody can see you.

**Five of the six Tier 2 units are a serial chain in js/camp.js. Never dispatch two at once.**
The game runs after every unit and every unit is one commit.

**This redesign does not**, at either tier: resize the camp (bounds stay 1560 by 1080); add a
zone, an NPC or a system; move the Badge Board, the Quartermaster, the merit badge rack, the
fire, the tents, the trail sign, the memorial grove or the lake; touch the cabin interior;
convert any full-screen menu into in-world UI; change any zone id, spot id, interact type, save
key or tier threshold; rebuild the treeline bake, the tier gating, the idler state machine or
the Blink arc; or add music, weather, footsteps or an ambient bed.

---

## 3. Verified engine numbers

### 3.1 Constants

| Thing | Real value | Landmark | Line |
|---|---|---|---|
| Camp camera zoom | **1.25**, not 1.5 | `const CAMP_ZOOM = 1.25;` | camp.js:10 |
| Bake scale (the 1.5 in the file) | 1.5 canvas pixels per world unit | `const CAMP_S = 1.5;` | camp.js:15 |
| World bounds | x -780..780, y -540..540 | `const CAMP_G = { x0: -780,` | camp.js:14 |
| Camera overscan | 110 units past the bounds | `const CAMP_PEEK = 110;` | camp.js:16 |
| Player speed | 175 world units per second, flat | `p.x += ax * il * 175 * dt;` | camp.js:897 |
| Player collision radius | 11 | `this.p = { x: 0, y: 60, r: 11,` | camp.js:541 |
| Camera clamp | half-width `W / (2 * CAMP_ZOOM)` | `const hw = W / (2 * CAMP_ZOOM)` | camp.js:977 |
| Cabin interior zoom | 1.8, camera pinned at (0,20) | `const CABIN_ZOOM = 1.8;` (camp.js:3644) and `this.cam.x = 0; this.cam.y = 20;` (camp.js:1274) | |
| Canvas | `window.innerWidth/innerHeight`, DPR capped at 2 | `DPR = Math.min(2, window.devicePixelRatio \|\| 1);` | ui.js:85 |

**How much of the camp you see at once.** Visible world span is W/1.25 by H/1.25 in CSS pixels.

| Viewport | Visible world | Share of camp area | Camera travel in x |
|---|---|---|---|
| 1280 x 800 | 1024 x 640 | 39% | plus or minus 378 |
| 1366 x 768 | 1092.8 x 614.4 | 40% | plus or minus 343.6 |
| 1920 x 1080 | 1536 x 864 | 79% | plus or minus 122 |
| 390 x 844 (phone) | 312 x 675 | 12.5% | free, never clamps |

On a laptop the walk is a reveal. On a 1080p monitor the camera barely moves and the walk is a
traverse of one composed picture, which is what the House of Hades actually is. On a phone it is
a tight follow. Which is why the composition is built out of objects that work close up (a
doorway you pass under) rather than out of wide vistas.

**Why the bounds do not change.** Longest routed walk today is about 1072 units, 6.1 seconds.
Corner to corner is 1242 units, 7.1 seconds. Resizing would invalidate every coordinate in a
3721-line file and buy nothing.

### 3.2 How big a scout is drawn, which every occlusion number depends on

`SPR.drawScout` (sprites.js:4748) builds the figure from the body sprite plus legs:

```
body = P.max_body = mk(44, 48)              sprites.js:1622   (gus_body is mk(50, 48))
drawn width w = 34                          camp.js, renderPlayer: SPR.drawScout(ctx, META.selected, p.x, p.y + p.r, 34, ...)
u = w / body.w = 34 / 44 = 0.7727
legLen  = 10.5 * u = 8.11
torso   = body.h * u = 48 * 0.7727 = 37.09
overlap = 2 * u = 1.55                      (the torso is drawn 2u below the hip)
drawn height = 8.11 + 37.09 - 1.55 = 43.66
```

`renderPlayer` anchors the feet at `p.y + p.r`, so the drawn scout occupies:

```
x from p.x - 17 to p.x + 17          (34 wide)
y from p.y - 32.66 to p.y + 11       (43.66 tall)
```

Gus is drawn 38.42 tall because his body sprite is wider, so it scales down. Every number in
section 6 uses **34 by 43.66**, which is the taller case.

### 3.3 The processional

**Today.** Timed from routed distances over the real `walkRects()` and `keepOuts()`, a standard
visit after a death is 1615 units of walking, 9.2 seconds, of which **708 units (44%) is
retracing the corridor you already walked**, because arrival and exit are the same object.

**After.** You arrive at `spotFor(META.selected)` and leave at the trail sign.

| Leg | From | To | Units | Seconds |
|---|---|---|---|---|
| 1 | bedroll (Max -452,-102) | west gate (-255,6) | 227 | 1.30 |
| 2 | west gate | fire circle, south of the pit (0,-20) | 257 | 1.47 |
| 3 out | (0,-20) | Badge Board (-30,-352) via the north gate | 334 | 1.91 |
| 3 back | Badge Board | (0,-20) | 334 | 1.91 |
| 4 | (0,-20) | east gate (240,-18) | 240 | 1.37 |
| 5 | east gate | tally post (330,-70) | 104 | 0.59 |
| 6 | tally post | trail sign (600,-30) | 273 | 1.56 |

Full visit including the shop: **1769 units, 10.1 seconds**, of which 334 units (19%) is
retraced. Without the shop: 1101 units, 6.3 seconds, zero retraced. The gate centres are
unchanged by the Tier 2 rect narrowing (west y=6, north x=-10, east y=-18), so these distances
hold at both tiers.

The walk gets 0.9 seconds longer and the backtrack drops from 708 units to 334. That is the
trade, and it is the right one.

Junie's bedroll is (-512,76) and Gus's is (-402,244), so leg 1 varies from 227 to about 290
units depending on who you sent. Your walk home is your scout's walk home.

**Note that leg 1 exists at Tier 1 alone.** T1.1 buys the entire processional. Tier 2 dresses
the road it created.

---

## 4. Tier 1, unit by unit

Every brief carries these constraints: do not run git, do not run a build, do not touch a file
another unit owns, do not change any zone id, spot id, interact type or save key, no emoji, no
em dashes or en dashes.

### T1.1 You arrive at your own bedroll

**File: js/camp.js only.**

The run-count edge already exists. It is inside `updateBlink`, where it resets one Blink flag:

```
landmark:  if (this.lastRuns !== META.runs) {      camp.js:1124, inside updateBlink(dt)
```

Move that edge test out of `updateBlink` and into a dedicated block at the top of `update(dt)`
(landmark `update(dt) {`, camp.js:872), after `this._maybeBake();` and before the input read.
`updateBlink` keeps consuming the flag reset; it just reads `this.arrived` instead of testing
the edge itself.

On the edge, and **only when `this.scene === 'grounds'`**:

1. Place the player at `spotFor(META.selected)`, fallback (0,60). Existing method, camp.js:627.
2. `p.face = 1`, `p.moving = false`.
3. **Snap the camera**: `this.cam.x = p.x; this.cam.y = p.y;` Do not let it ease in from (0,0).
4. `this.arriveT = 1.1`. T1.3 reads it.
5. Send the nearest unlocked idler over to meet you. The idler state machine already does this;
   `swap()` uses the same three fields (landmark `out.state = 'walking';`, camp.js:841):
   ```
   it.state = 'walking'; it.tx = p.x + 46; it.ty = p.y + 18; it.after = 'idle';
   ```
   That is the beat: someone is already walking toward you when the frame opens.

**Guard on the scene.** If the run count changes while the camp object is alive but the player
is inside the cabin, do not consume the edge; leave `lastRuns` untouched until the scene is
grounds. Otherwise the player gets yanked out of a room. Order the top of `update()` so the
arrival runs **after** `_maybeBake()` (landmark `if (this.bakedTier !== this.tier()`,
camp.js:1425), so the camp you arrive into is the camp you just earned.

**Do not fire `AudioSys.play('defeat')` here.** The player heard that cue three seconds ago on
the death panel (`AudioSys.play('defeat');`, game.js:517). Repeating it is not a beat. The
audible half of the arrival is T1.2: the fire is 512 units away and barely there.

**Acceptance:**
1. Harness: bump `META.runs`, call `update(0.016)` twice with `scene = 'cabin'`, assert the
   player did not move and `lastRuns` did not advance. Set `scene = 'grounds'`, call again,
   assert the player is at `spotFor(META.selected)` and `cam` equals the player position exactly.
2. Harness: assert exactly one idler has `state === 'walking'` after the arrival frame.
3. Visual: die, come back. You are at your bedroll and the first prompt you can reach is not
   "take the trail".

### T1.2 The fire gets louder as you walk toward it

**Files: js/camp.js, plus one line in js/ui.js.**

`js/audio.js` contains a complete positional emitter layer: distance attenuation, panning, a
low-pass that darkens with distance, and an out-of-range disconnect.

```
landmark:  const EMITTERS = {                                     audio.js:426
landmark:  campfire: { ref: 60, max: 520, gain: 0.55, lp: true }, audio.js:427
landmark:  function setListener(x, y) {                           audio.js:438
landmark:  function emitter(recipeId, opt) {                      audio.js:485
landmark:  setListener, emitter, playAt,                          audio.js:664   (the export)
```

`AudioSys.emitter(` and `AudioSys.playAt(` have **zero call sites in the entire repo**.
`AudioSys.setListener(` has exactly one, in the run, not in camp (`AudioSys.setListener(p.x,
p.y);`, game.js:748). The `campfire` recipe is a real crackle synthesis branch, not the generic
fallback (landmark `if (kind === 'campfire' || kind === 'torch'`, audio.js:365).

Two hooks:

1. `AudioSys.setListener(this.p.x, this.p.y)` once per `update()`, in the grounds branch.
2. On entering the grounds, build and hold `AudioSys.emitter('campfire', {x: 0, y: -70})`, and
   at tier 2 or higher `AudioSys.emitter('water', {x: 0, y: this.bankY(0)})`. Stop both on
   entering the cabin (landmark `enterCabin() {`, camp.js:1237) and on starting a run; rebuild
   on `exitCabin()`.

The campfire recipe's `max: 520` is almost exactly right for this map with no tuning: the trail
sign at (600,-30) is 604 units from the fire, so the crackle fades out precisely as you reach
the trailhead and swells as you walk back. Your own bedroll at (-452,-102) is 512 units away,
which is the very edge of audible. That is the arrival beat, and it costs nothing.

**One dependency, and it is the reason for the ui.js line.** `emitter()` returns a dead handle
unless the audio context has started (landmark `if (!started || !recipe) return DEAD_HANDLE;`,
audio.js:487). `AudioSys.init()` is called at ui.js:167 (`startRun`), ui.js:230 (`continueRun`)
and ui.js:1851, so a fresh page load going title to camp never starts audio. Add
`AudioSys.init();` to `enterCamp()` (landmark `function enterCamp() {`, ui.js:247). The Enter
keypress that gets you there is a user gesture, so the context resumes legally.

Explicitly out of scope: the ambient night-woods bed, footsteps (js/footsteps.js is a seven-line
stub with zero call sites), zone reverb, camp music. All in LATER.

**Acceptance:**
1. Grep: `AudioSys.emitter(` and `AudioSys.setListener(` each appear in camp.js. Both were zero
   in camp.js before this unit.
2. Audible: walk from the fire to the trail sign and the crackle fades and darkens; walk back
   and it swells. Pan follows which side of you the fire is on.
3. Audible: enter the cabin, the crackle stops. Step out, it comes back.

### T1.3 The screen-space vignette

**File: js/camp.js only.**

The camp has never had a screen-space vignette. The only one it has is world-anchored at the
origin with inner radius 480, so at the fire circle, where the player spawns and Brock stands,
it contributes nothing.

```
landmark:  gr = ctx.createRadialGradient(0, 0, 480, 0, 0, 980);       camp.js:3028
           ...
           ctx.fillRect(CAMP_G.x0 - CAMP_G.pad, ...)                  camp.js:3032
```

**Insert the new vignette after the `ctx.restore()` that ends the world camera transform.** That
is camp.js:3039, the restore immediately before the letterhead block (landmark
`ctx.font = 'bold 15px Verdana, sans-serif';`, camp.js:3043). **It is not the `ctx.restore()` at
camp.js:3016**: that one closes the additive glow pass, it sits inside the cabin window gradient
block (landmark `// the cabin window glows`, camp.js:3008), and it is still inside the world
transform. A screen-space vignette placed inside a world transform is not screen space. An
earlier draft of this document sent an implementer to exactly that wrong line.

```
CAMP_VIG        = 0.52    corner alpha at rest
CAMP_VIG_ARRIVE = 0.86    corner alpha at the instant of arrival
colour  rgba(5,8,5,a)
inner stop at 0.42 of the half diagonal, outer stop at the half diagonal
```

At 1366x768 the half diagonal is 783.6, so the gradient runs from radius 329 to 784, centred on
the canvas. **Cache the gradient object** keyed on `W:H:alpha.toFixed(2)` and rebuild only when
one changes, so the per-frame cost is one `fillRect` with a prebuilt gradient. Plain
source-over, not additive.

The alpha lerps from `CAMP_VIG_ARRIVE` down to `CAMP_VIG` over `this.arriveT` from T1.1, so the
camp opens up around you as you stand at your own bedroll. That works with subtitles off, on a
muted machine, on any monitor.

**And lower the existing world vignette so the two do not stack to mud.** At camp.js:3030,
landmark `'rgba(6,10,5,' + (0.16 + 0.02 * breathe)`, change `0.16 + 0.02*breathe` to
`0.10 + 0.015*breathe`. Ship both in one commit so one revert undoes the whole experiment.

**Acceptance:** standing at the fire on a 1280x800 window, at least 12% of the frame sits below
25% of peak brightness (today it is 0.0%) and frame contrast is at least 4.5:1 (today 2.72:1).
Sample a captured frame the way the lighting audit did.

### T1.4 One gust through all the cloth

**File: js/camp.js only.**

`this.furn` is a list of closures executed every frame inside the y-sorted pass, not a baked
image, so `this.t` is available inside every piece of furniture at zero extra cost. The file
documents this and uses it exactly once, on the tally post tarp, which is then deleted forever
the first time the player wins. Every other cloth object in camp is drawn live and hangs dead
still.

Lift the three-wave non-repeating gust that already exists on the tarp:

```
landmark:  let g = 0.5 + 0.34 * Math.sin(t * 0.61) + 0.26 * Math.sin(t * 0.283 + 1.7)
           renderTarp, camp.js:2345
```

into a module-level `campWind(t, phase)`, compute it once per frame into `this._wind` in
`update()`, and wire it into the five cloth objects already drawn live:

| Cloth | Landmark | Line |
|---|---|---|
| bunting | `// FEEDING THE CORKBOARD: bunting strung between the lantern poles.` | camp.js:2134 |
| stall pennants | `// pennant string across the front once the camp has grown into itself` | camp.js:2873 |
| tent flaps | `// tents, each wearing the accent flap` | camp.js:1993 |
| lantern wire | `ctx.moveTo(-100, -224); ctx.quadraticCurveTo(0, -204, 100, -219);` | camp.js:3092 |
| the tarp | `renderTarp(ctx, x, yB, postHw) {` | camp.js:2340 (already wired, now shares the helper) |

Per-frame cost: three `Math.sin` calls in total, for five objects that are already being drawn.

**Acceptance:** the bunting, the pennants, the tent flaps and the lantern wire all lift on the
same gust at the same moment, not on independent cycles.

### T1.5 Brock says how you died before he tells a story

**File: js/dialogue.js only.** Independent of everything else. Land it first, it is six lines.

```
landmark:  function brockLinePick() {          dialogue.js:352
landmark:  const arcLine = nextArcLine();      dialogue.js:358
landmark:  const last = META.lastRun;          dialogue.js:360
```

The arc check runs before the death check. While any of the twelve gated story beats is pending,
talking to Brock spends the arc beat and leaves `last.ack` false. Go out again and `META.lastRun`
is overwritten wholesale (landmark `this.lastRun = {`, meta.js:127), so that death reaction is
never spoken by anyone, ever. The game has a hand-written line for being killed by a squirrel,
by a rabbit, by a doe, by a beaver, and the priority order throws them away.

Move the `const last = META.lastRun; if (last && !last.ack) { ... }` block **above** the
`const arcLine = nextArcLine(); if (arcLine) return arcLine;` pair. The arc beat is not lost, it
waits one visit, which is correct: how you died is fresher than a thirty-year-old story.

This is what makes T1.1 land. You walk the length of the camp and the man at the end of the walk
has something to say about the night you just had.

**Acceptance:** with `META.lastRun = {result:'died', killer:'squirrel', ack:false}` and at least
one arc gate open, `brockLinePick()` returns the squirrel line, and a second call returns the
arc line.

### T1.6 Stop telling the player the hub is optional

**Files: index.html and js/ui.js.**

```
landmark:  <button class="btn" id="btnretry">RETRY</button>        index.html:619
landmark:  <button class="btn" id="btntitle">TITLE</button>        index.html:620
landmark:  $('btntitle').addEventListener('click',                 ui.js:2078
landmark:  if (e.code === 'KeyR' || e.code === 'Enter') { startRun(App.char); }   ui.js:2001
```

Those two buttons live in `<div id="over">` (index.html:612). The button that takes you home is
labelled TITLE, is wired to `enterCamp()`, not to the title, and is not the default. Relabel it
RETURN TO CAMP, put it first, and swap the keys so Enter goes to camp and R stays retry. Keep
RETRY; just stop making it the headline.

(An earlier draft of this document pointed at index.html:536-538 for these buttons. That is the
Merit Badges panel.)

**Acceptance:** on the death panel the first button says RETURN TO CAMP and Enter takes you
there.

---

## 5. Tier 2, unit T2.1: the architecture

**File: js/camp.js only.**

### 5.1 The gates are solid by geometry. There are no gate keep-out circles.

This is the single most important correction in this document.

`clampWalk` (landmark `clampWalk(p) {`, camp.js:692) pushes out of every keep-out circle first,
then unconditionally clamps into the nearest walkable rectangle, and **it skips the push
entirely when the distance is exactly zero**:

```
if (d < k[2] && d > 0.001) { ... }        camp.js:698
```

An earlier draft of this document put ten new keep-out circles **centred exactly on walkable
rectangle edges**, because the clear-passage numbers were derived as "rect span minus 2 x 10".
That construction makes each circle centre an absorbing point: `clampWalk` leaves a player
standing there forever, and the first step out moves them ten units in one frame instead of
2.9167. Proven against the real function in the harness:

```
player centre placed at exactly (-255,-34), the post centre:
  idle clamp 0..4 -> -255.000 -34.000   distance to post 0.0000   (never moved)
  hold WEST one frame (2.9167 of input) -> -265.000 -34.000   TOTAL FRAME MOVE 10.0000
```

And a whole-camp grid scan finds **760 grid points that settle inside a post circle** under that
construction, and a settled position that is not a fixed point of `clampWalk`: a clamp produces
(-255.25, -34), and the very next clamp, with no input at all, moves the player 9.75 units.

Two things follow.

**First: the circles go.** The fix is the one the reviewer named and it is also the argument this
document already makes for the cabin. **Narrow the walkable rectangles by 10 more units on each
side so the posts are solid by geometry**, exactly the way every other wall in this camp already
works. No new keep-out circles at any gate.

**Second, and this is why it matters beyond the gates: the pattern already ships.** The same grid
scan run against the camp exactly as it is today finds one instance:

```
shipped camp, worst unstable settled position: 16.0000 units, at (150,-350)
```

That is the crate keep-out `[152, -350, 18]` straddling the supply stall rect's east edge at
x=150. Nobody caught it, because nothing checks for it. Section 11 adds the check that does.

Neither instance is reachable by ordinary walking (see 5.4), and the shipped one has been
harmless for as long as it has existed. That is precisely the point: this class of bug is inert
by arithmetic luck, and it stops being inert the moment somebody nudges a rect edge. Do not build
new ones.

### 5.2 Walkable rectangle diff

`walkRects()`, landmark `walkRects() {`, camp.js:634. Every line stated, so this is diffable.

```
UNCHANGED  [-210, 210, -180, 140]   fire circle
UNCHANGED  [-660, -300, -220, 290]  tent row
CHANGED    [-320, -190,  -60,  80]  west path   ->  [-320, -190, -24,  36]
UNCHANGED  [-170, 150, -358, -230]  supply stall front
CHANGED    [ -60,  70, -245, -160]  north path  ->  [ -35,   15, -245, -160]
UNCHANGED  [ 270, 700, -130, 130]   trailhead
CHANGED    [ 190, 290,  -60,  70]   east path   ->  [ 190,  290, -44,   8]
UNCHANGED  [-640, -350, -450, -280] memorial grove
UNCHANGED  [-375, -150, -400, -315] grove to stall
UNCHANGED  [-560, -460, -295, -205] grove to tents

tier >= 1:
CHANGED    [ 340, 660, -300, -170]  cabin yard  ->  [ 340,  700, -300, -170]
UNCHANGED  [ 420, 540, -185, -110]  cabin path
NEW        [ 634, 700, -368, -300]  cabin east lane
NEW        [ 560, 700, -368, -330]  cabin north lane
NEW        [ 472, 568, -368, -330]  behind the cabin

tier >= 2:
UNCHANGED  [-340, 340, 150, 345]    lake bank
UNCHANGED  [  48, 112, 330, 465]    dock
UNCHANGED  [ -60,  60, 125, 165]    lake path      (no lake gate: see section 9)
tier <  2:
UNCHANGED  [ -60,  60, 125, 195]    stub into the overgrowth
```

Net: three connectors narrowed, cabin yard widened east, three new rects around the back of the
cabin. **The lake path is untouched**, which is a change from the earlier draft and is explained
in section 9.

### 5.3 The gates, exactly, with the clear passage re-derived from the rectangles

Three gates. A gate is two peeled posts drawn 12 wide and 64 tall, and a crossbeam 12 thick
joining the post tops. Each post's footprint is the 10 units the rectangle was narrowed by, so
the post is solid without a circle and its drawn face sits 4 units outside the walkable edge,
which is the ordinary way a wall works in this camp.

| Gate | Posts | Rect after narrowing | Clear passage | Player diameters | Tier |
|---|---|---|---|---|---|
| West | (-255,-34), (-255,46) | y from -34+10 = **-24** to 46-10 = **36** | **60** | 2.7 | always |
| East | (240,-54), (240,18) | y from -54+10 = **-44** to 18-10 = **8** | **52** | 2.4 | always |
| North | (-45,-200), (25,-200) | x from -45+10 = **-35** to 25-10 = **15** | **50** | 2.3 | always |

Player radius is 11, so a diameter is 22. The north gate at 50 is the tightest thing in camp;
the next tightest is the grove-to-stall corridor at 85. Risk 1 in section 10 sets the floor at
44 and the harness asserts it.

The east and north gate lanterns sit at (240,-18) and (-10,-200), which are within 2 units of the
painted path centrelines at those points (the spine runs at y=-20; the north path at y=-200 sits
at x = -9.6). The gates stand on the roads the camp already drew.

**How the gate lands in the draw order.** Push each gate as three entries in the existing
y-sorted array (landmark `items.sort((a, b) => a.y - b.y);`, camp.js:2965): the far post at the
smaller y, the near post at the larger y, and the beam at (larger y + 0.5). No new layer, no new
pass, no new draw call. What that actually buys is measured in section 6, and it is not what the
earlier draft claimed.

**Connectivity after narrowing** (checked, not assumed):

- west path [-320,-190,-24,36] meets the tent row over x -320..-300 and the fire circle over
  x -210..-190.
- north path [-35,15,-245,-160] meets the fire circle over y -180..-160 and the stall front over
  y -245..-230.
- east path [190,290,-44,8] meets the fire circle over x 190..210 and the trailhead over
  x 270..290.

### 5.4 Keep-out circle diff

`keepOuts()`, landmark `keepOuts() {`, camp.js:662. **All existing entries unchanged. No gate
posts.** Added, all of them in T2.5's dressing:

```
NEW  [  92,  -64, 13]   Brock's seat
NEW  [ 308,  -30, 11]   tally post chopping block
NEW  [ 368, -104, 18]   tally post log pile
```

Clearances, all checked: Brock's seat at (92,-64) r13 is 35.5 from Brock (58,-52,18), needs 31;
63 from the bench log (80,-2,24), needs 37; 92 from the fire (0,-70,44), needs 57. The chopping
block at (308,-30) r11 sits 18 clear of the east path's east edge at x=290, and 45.6 from the
tally post (330,-70,17) which needs 28. The log pile at (368,-104) r18 is 46 from the tally post,
needs 35. None of the three sits on a rectangle edge.

**No collision circle for the cabin.** The cabin is solid by geometry, the same way the gates
now are. Adding circles at the cabin base would fight the door trigger (landmark
`if (Math.hypot(p.x - 520, p.y + 295) < 24) this.enterCabin();`, camp.js:912).

### 5.5 Behind the cabin, computed from the sprite

An earlier draft promised "walk behind the cabin, fully hidden at (520,-445)". The cabin's own
baked size refutes it.

```
P.cabin = () => mk(140, 110, ...)                                     sprites.js:4141
push(-300, ... campSpr(ctx, 'cabin', 520, -300, 220, ...))            camp.js:2257

scale        = 220 / 140 = 1.5714
drawn height = 220 * 110 / 140 = 172.86
canvas top   = -300 - 172.86 = -472.86  world y
roof apex    painter (70,16)  -> world (520.00, -447.71)
left eave    painter (2,62)   -> world (413.14, -375.43)
right eave   painter (138,62) -> world (626.86, -375.43)
step bottom  painter (70,110) -> world (520.00, -300.00)
```

A scout standing at (520,-445) has their head top at -477.66 and their boots at -434. The cabin
at that x runs from -447.71 down to -300. Covered: **13.71 of 43.66 units, 31%.** Two thirds of
the scout stands above the roofline. At the west end of the earlier draft's pocket, x=470, the
roofline is at -413.89 and the boots are at -434, so **the cabin covers nothing at all**.

The mistake was direction. The cabin's ground contact is the line y = -300 and everything is
painted upward (northward on screen) from there, so the ground the cabin's sprite covers is the
ground **north of its base**, not the ground north of its apex. The pocket is south of the roof
apex, not beyond it.

Solving `cabinTop(x) <= p.y - 32.66` and `p.y + 11 <= -300` over the gable line gives:

```
behind the cabin   [472, 568, -368, -330]     96 by 38 world units
```

Verified across the whole rectangle at 1-unit spacing, checking the scout's left edge, centre and
right edge (x plus or minus 17):

- fully covered at every point: **true**
- tightest head-above-roofline margin: **3.08 units**, at the scout's left edge when standing at
  (472,-368)
- boots at the south edge sit at -319, which is 19 units north of the cabin's base line
- nearest point of the pocket to the cabin door trigger centre (520,-295) is 35, and the trigger
  radius is 24, so standing in the pocket never opens the door

Two connectors reach it, both around the east side where the cabin's roof ends at x=626.86:

```
cabin north lane   [560, 700, -368, -330]     overlaps the pocket over x 560..568
cabin east lane    [634, 700, -368, -300]     meets the widened cabin yard along y = -300
```

You round the east corner of the cabin, walk west, and disappear. That is a real hiding place
and it is the only one in camp. **Do not fade the cabin.** Full occlusion is correct here and
nowhere else, for the reason set out in section 6.

### T2.1 acceptance

1. **Harness, the gate walk.** For each of the three gates, start on a ring 220 units out at
   every approach angle in 2-degree steps and walk straight at the gate centre for 600 frames at
   2.9167 units per frame, calling the real `clampWalk` every frame. Assert: **zero frames with
   the player inside a post footprint**, and **zero frames where the player moved further than
   the input step plus the largest legitimate circle slide**. Measured on the revised geometry:

   ```
   west  gate: 108000 frames, inside a post 0, frames over 8u 0, worst frame move 4.696
   east  gate: 108000 frames, inside a post 0, frames over 8u 0, worst frame move 4.709
   north gate: 108000 frames, inside a post 0, frames over 8u 0, worst frame move 4.657
   ```

   The 4.7 worst is an ordinary slide around the fire, tent and picnic-table circles, and it is
   the same number the shipped camp produces today.

2. **Harness, the fixed-point check.** This is the one that catches the class of bug in 5.1, and
   nothing in the earlier draft's Risk 1 could have caught it, because neither of its two checks
   looks at a circle's own edge. Walk the player from a grid of legal start cells in 24
   directions for 90 frames each, then call `clampWalk` once more with no input and assert the
   position does not move. Revised geometry and the shipped camp both report:

   ```
   worst idle-clamp move after a walk = 2.3656 at (150,-358)
   ```

   which is the pre-existing crate at the stall's south-east corner, unchanged by this unit.
   **The gate work must not raise that number.**

3. **Harness, connectivity.** Flood fill on a 5-unit grid from (0,60) at every tier 0 through 4
   and assert every entry in `spots()` is reachable within its own trigger radius. Measured:

   ```
   tier 0: 21179 cells, unreachable: none
   tier 1: 23763 cells, unreachable: none
   tier 2: 29044 cells, unreachable: none
   tier 3: 29044 cells, unreachable: none
   tier 4: 29035 cells, unreachable: none
   ```

   Tier 1 gains 2584 cells over tier 0, which is the cabin lanes and the pocket.

4. **Visual.** Walk west from the fire: the beam crosses over your head and the posts sit either
   side of you. Round the cabin's east corner and walk west: you vanish behind the roof and step
   back out.

---

## 6. Tier 2, unit T2.1 continued: the depth plan, rebuilt on the right object

camp.js draws in one pass and it stays one pass. Nothing here adds a layer.

### 6.1 What the earlier draft got wrong

It led with the crossbeam. At CAMP_ZOOM 1.25 a crossbeam 64 units above the walking line clears
a 43.66-unit scout by 31 units, so **the object the entire depth plan led with never touches the
player.** What actually occludes at a gate is the **post**, which the earlier draft never reasoned
about, and it crosses 35 of the scout's 43.66 units in the tightest gap in camp.

It also placed three occluder pines at (330,146), (440,146) and (-352,302), all of them south of
rectangles the processional never enters. They occlude nothing. And it proposed an alpha-fade
helper called from those three no-op call sites, while the four pines that actually do swallow
the player (section 1) were left alone.

### 6.2 The occlusion budget, and why it is measured as area

An occluder's job is to say "that scout is behind that thing". It fails in two directions: too
little and you read a sprite clipping, too much and you lose which scout you are and which way
you face.

**Measure it as the fraction of the scout's drawn silhouette box (34 by 43.66) that the
occluder's drawn box covers at the worst frame.** Height alone is the wrong measure, and getting
that wrong is what made the earlier draft's "an occluder that hides most of the player is worse
than none" argument point at the wrong objects. A gate post covers 80% of the scout's *height*
and only 35% of the scout's *silhouette*, because it is 12 units wide against a 34-unit body: you
see the scout on both sides of it the whole time.

**The budget on a walking route is 25% to 40% of the silhouette.** Below about 20% the eye reads
it as an error in the sprite. Above about 50% the torso goes and with it the read of which scout
you are, which is the thing the tent row, the sash and the whole per-scout ownership pass exist
to make legible.

**One exception, deliberate: the cabin pocket, at 100%.** Full occlusion is allowed exactly where
the player walked in on purpose and can step back out in under a second. It is a hiding place, and
a hiding place that only half hides you is not one.

A useful consequence for anyone adding furniture later: **a y-sorted occluder can never cover more
of the scout's height than its own drawn height**, because the scout is 43.66 tall and full
alignment needs an occluder at least that tall. So anything drawn under 18 units tall is
automatically inside budget on the height axis whatever else you do with it.

### 6.3 What actually occludes, with the arithmetic

Player box: x plus or minus 17, y from p.y - 32.66 to p.y + 11.

**a) The gate posts and beam. This is the real occluder and it is what the section should lead
with.** At the west and east gates both posts share an x, so the gate's silhouette at that x is a
continuous vertical band: far post, beam, near post, no gap. The player passing through is inside
that band in y, and the band is 12 wide.

| Gate | Player at | x cover | y cover | **Silhouette covered** |
|---|---|---|---|---|
| West | y = -24 (hugging the far post) | 35% | 100% | **35%** |
| West | y = 6 (centreline) | 35% | 100% | **35%** |
| West | y = 36 (hugging the near post) | 35% | 98% | **34%** |
| East | y = -44 | 35% | 100% | **35%** |
| East | y = -18 (centreline) | 35% | 100% | **35%** |
| East | y = 8 | 35% | 98% | **34%** |

Duration: (34 + 12) / 175 = **0.26 seconds** at full walking speed. Consistent 34% to 35%
wherever you walk through, which is what makes it read as architecture rather than as a glitch.

**b) The north gate's beam, which is the only beam in camp that does any work.** Its two posts
share a y, so the beam runs east-west across the path at y = -264, 12 thick, 70 wide. It is
sorted at the posts' y plus 0.5, so it draws over anyone north of them.

| Player at | x cover | y cover | **Silhouette covered** |
|---|---|---|---|
| y = -245 (north end of the passage) | 100% | 27% | **27%** |
| y = -240 | 100% | 27% | **27%** |
| y = -235 | 100% | 22% | **22%** |
| y = -230 | 100% | 11% | **11%** |
| y = -225 and south | 100% | 0% | **0%** |

So at the north gate the beam really does pass over your hat as you walk under it, and stops when
you are through. **At the west and east gates the beam is dressing**: it shares the posts' x, so
every pixel of it is inside a band the posts already occupy. Say so in the brief, and do not
budget any feel for it.

**c) The `nearL` hedge runs.** `nearL` is a full-map baked canvas drawn after the whole y-sorted
cast (landmark `ctx.drawImage(this.nearL.c,`, camp.js:2969), so anything painted into it draws
over the player unconditionally. It costs **zero new draw calls** and it is the cheapest depth in
the document. The controlling number is the hedge line's distance south of the walkable edge it
guards. **Put it 8 units south**, and the natural variation in `_clusterAt` (landmark
`_clusterAt(q, x, y, rng, bias) {`, camp.js:1476) does the rest, for a player standing right on
the edge:

| Cluster the rng picks | Drawn size | x cover | y cover | **Silhouette covered** |
|---|---|---|---|---|
| tallgrass | 26 by 26.0 | 76% | 48% | **37%** |
| rockcluster | 24 by 17.1 | 71% | 28% | **20%** |
| fernclump | 24 by 18.8 | 71% | 20% | **14%** |
| mushroomring | 22 by 14.4 | 65% | 17% | **11%** |
| mosslog | 30 by 16.9 | 88% | 11% | **10%** |

Range 10% to 37%, averaging around 20%, and it drops to nothing as you step north. That is brush
at your boots, which is what a south edge should be, and no single cluster can break the budget.

**d) The four existing lone pines, which are already over budget.** They cover the whole scout
(section 1). This is where the alpha helper belongs, and applying it here is **cheaper** than the
earlier draft's plan: one call site instead of three, because all four pines are drawn from a
single loop.

```
landmark:  for (const [px, py, pw, ph, seed] of [[-250, -265, 74, 168, 11], ...   camp.js:2169

// returns 1 normally, 0.4 while the scout's drawn box overlaps the pine's drawn box
campFade(p, x, halfW, yTop, yBot)
```

Six lines for the helper, one call site setting `ctx.globalAlpha` for the duration of the draw.
The pine still reads as in front of you; you can see yourself through it.

**e) The three new occluder pines are dropped.** Where the earlier draft put them they occlude
nothing. Anywhere they would occlude, they occlude everything: a 150-unit pine has a 13-unit-deep
band of good coverage and swallows you completely 31 units further south. Foreground on a walking
route is the job of the gates and the hedge runs, both of which are already paid for.

**f) The cabin, at 100%, once, on purpose.** Section 5.5.

**Count.** On a standard visit the player now passes behind something **four times**: the west
gate, the north gate beam on the way to the shop, the east gate, and either a lone pine at the
trailhead's south edge or the cabin if they walk round the back. Today that count is three, and
all three are accidents nobody budgeted.

### 6.4 Named layers and draw order

`render(ctx, W, H, o)`, landmark `render(ctx, W, H, o) {`, camp.js:2891.

| # | Layer | Contents | Change |
|---|---|---|---|
| L0 | void fill | screen-space background | unchanged |
| L1 | `groundL` (baked) | grass, mottle, tree shadows, zone pads, paths, sun pools, dapple, edge darkening, **H1-H3 hedges** | new content, same one drawImage |
| L2 | `farL` (baked) | treeline mass beyond the bounds, forced treeline for locked zones | unchanged |
| L3 | live water | glints, bank lap, tier 2+ | unchanged |
| L4 | firelight | additive radial, breathing | unchanged |
| L5 | **the y-sorted pass** | baked furniture closures plus the live cast, ascending y. **All new architecture lands here:** gate posts, gate beams, tent props, Brock's seat, tally post dressing | new items only |
| L6 | `nearL` (baked) | perimeter fringe, **plus H4-H6 hedges** | new content, same one drawImage |
| L7 | smoke, takeover dust | | unchanged |
| L8 | additive glow | lantern string, sparks, 33 fireflies, Blink, cabin window, **plus 3 gate lanterns** | 3 new gradients |
| L9 | world washes | warm centre breathing, dark rim | one alpha lowered (T1.3) |
| L10 | prompt, message | world space | unchanged |
| --- | `ctx.restore()` at camp.js:3039 | **this is the one the vignette goes after** | |
| L11 | **screen-space vignette** | T1.3, one cached gradient, one fillRect | new |
| L12 | letterhead | screen space | unchanged |

### 6.5 Parallax: no, and here is the proof

**The camera cannot support it.** At 1920x1080 the clamp restricts `cam.x` to plus or minus 122
units out of a 1560-unit world (landmark `this.cam.x = (x1 - x0) < hw * 2 ?`, camp.js:980). A
parallax layer at 0.8x would displace by at most 24 units across the entire camp, 30 screen
pixels over a whole playthrough. At 1366x768 the travel is plus or minus 343.6, giving a 69-unit
maximum, still under one tenth of a screen.

**The library says so.** `D:\Programs\GameTev\research\visual-trace\parallax-band-geometry\report.md`
opens with its own applicability table: top-down and isometric, skip this report entirely.
Parallax needs a horizon and a receding scene. This camera looks straight down.

**What this document buys instead:** occlusion (6.2, 6.3), one consistent light direction (7.3e),
and real value separation between the floor and the wall of pines (7.3c). Those are the three
depth cues a top-down projection actually has.

---

## 7. Tier 2, unit T2.2: the light plan

### 7.1 What the light is today, measured

- Seven baked circular sun pools, radii 110 to 240, alpha 0.06 to 0.20 (landmark
  `const pool = (x, y, r, a) => {`, camp.js:1732; the calls at camp.js:1739-1745). Their
  footprints touch or overlap. Fire and stall overlap by 120 units.
- 91.8% of the walkable floor sits at or above a quarter of peak brightness. The middle 90% of
  the floor spans **2.09:1**.
- Standing at the fire on a 1280x800 window, **0.0% of the frame is outside the lit clearing**.
  Frame contrast there is 2.72:1 and the middle 80% of the frame spans 1.7:1.
- The pine wall (`pineFront: '#264019',` camp.js:32, relative luminance 4.15) against the grass
  (`grass: '#43491d',` camp.js:22, 6.05) is **1.21:1**. The wall and the floor are almost the
  same brightness.
- The 15 west tree shadows are alpha 0.08 to 0.16 (landmark `q.globalAlpha = 0.08 + rng() * 0.08;`,
  camp.js:1519), giving 1.06:1 to 1.13:1 against grass. A shape needs roughly 1.6:1 to be seen.
  They are invisible, and they only exist in the western third.

Note that the zone pad helper is **already** elliptical (landmark
`const pad = (x, y, rx, ry, col, a) => {`, camp.js:1530). Only `pool` is circular.

### 7.2 The governing idea: darkness runs perpendicular to the walk

The naive reading of "pools of warm light, darkness between them" would put dark ground along the
spine between the fire and the trailhead. That is wrong here. The spine is the ritual; the great
hall is lit along its length. **The spine is a continuous lit lane with brighter knots at its
stations (fire, gate, tally post, trailhead), and the darkness is off-axis: north and south of
the spine, and between the stall spur and the tent row.** Your eye is led along the walk and the
sides fall away.

### 7.3 Concrete changes

**a) Make `pool()` elliptical.** Four lines at camp.js:1732. Circular pools cannot open darkness
on one axis and keep it on the other, which is what 7.2 requires.

```
const pool = (x, y, rx, ry, a) => {
  q.save(); q.translate(x, y); q.scale(1, ry / rx);
  const gr = q.createRadialGradient(0, 0, 6, 0, 0, rx);
  gr.addColorStop(0, 'rgba(255,196,110,' + a + ')');
  gr.addColorStop(1, 'rgba(255,196,110,0)');
  q.fillStyle = gr; q.fillRect(-rx, -rx, rx * 2, rx * 2); q.restore();
};
```

**b) The new pool table.** Old call on the left, new on the right. The calls are the seven lines
starting at camp.js:1739.

```
pool(0,   -40, 240, 0.20)  ->  pool(0,   -40, 210, 140, 0.26)   fire circle, broad and soft
pool(-10,-330, 170, 0.15)  ->  pool(-10,-330, 145,  95, 0.19)   supply stall
pool(560, -20, 170, 0.13)  ->  pool(560, -20, 145, 105, 0.17)   trailhead
pool(-490,-360,110, 0.06)  ->  pool(-490,-360, 95,  60, 0.09)   memorial grove
tier>=1 pool(500,-235,150,0.13) -> pool(500,-235,120, 85, 0.17) cabin yard
tier>=2 pool(80,  360,190,0.12) -> pool(80,  360,165,110, 0.12) lake, ALPHA UNCHANGED

pool(-480, 40, 200, 0.13)  ->  DELETED, replaced by three pockets:
                               pool(-486,-126, 115, 95, 0.17)   Max's pocket
                               pool(-548,  53, 115, 95, 0.16)   Junie's pocket
                               pool(-436, 225, 115, 95, 0.16)   Gus's pocket

NEW  pool(330, -70, 105,  80, 0.15)   the tally post
NEW  pool(-255,  6,  58,  58, 0.14)   west gate lamp, tight and hard edged
NEW  pool(240, -18,  58,  58, 0.14)   east gate lamp
NEW  pool(-10,-200,  55,  55, 0.14)   north gate lamp
```

Four things this buys. The **tally post** stops standing in the one 150-unit unlit strip in the
camp: it is the only decision object physically on the outbound walk, and it should be the one lit
station you cannot miss. The **tent row** stops being one long smear and becomes three pockets
with dark grass between them, which is "every character owns a spot" done in light for free. The
**gate lamps** are deliberately small and tight where every other pool is broad and soft: per the
lighting report, a tight hard pool reads as a small exposed island and a broad soft one reads as
an inhabitable safe zone. A doorway should be the former and a hearth the latter. And **the lake
does not get brighter**: it gets the same elliptical treatment for consistency and keeps its
current alpha, because nothing lives there and the light must not promise otherwise (section 9).

Off-axis darkness check: fire pool now reaches y = -180, stall pool starts at y = -235, leaving 55
units of genuinely dark ground on the north spur with only the gate lamp in the middle of it. That
is the threshold reading.

**c) Darken the wall, never the lawn.** Two hex values in `CPAL`:

```
pineMid:   '#1d3013'  ->  '#182810'      camp.js:31
pineFront: '#264019'  ->  '#1e330f'      camp.js:32
```

Grass to pineFront goes from 1.21:1 to about 1.44:1. Do **not** darken `CPAL.grass`: anything
below about #3d4319 inverts figure and ground and makes the lawn darker than the trees. Leave
`pineLit: '#4c6a24',` (camp.js:33) alone; the sunlit west flanks at luminance 12 are what keep the
treeline from going to mud.

**d) The screen vignette ships in Tier 1** (T1.3), including lowering the world vignette. Nothing
more to do here.

**e) Make the golden hour cast shadows visible and give the east half the same language.**
Landmark `// golden hour: long soft tree shadows reaching in from the west treeline`, camp.js:1513.
Raise `q.globalAlpha = 0.08 + rng() * 0.08;` (camp.js:1519) to `0.18 + rng() * 0.12`, landing the
streaks at roughly 1.18:1 to 1.32:1, which with the darker pines is on the edge of visible without
becoming stripes. Then add a second short loop casting the same streak eastward from the four lone
in-camp pines at (-250,-265), (-285,130), (240,-200) and (360,190) and from the cabin at
(520,-300), so the eastern two thirds of the camp has cast light on the ground for the first time.
About twelve lines, baked once, zero runtime cost.

### 7.4 One shadow convention for everything, and its real cost

Today the furniture casts a warm green elongated ellipse offset east by half its radius:

```
landmark:  const shadow = (ctx, x, y, rx) => {          camp.js:1988, local to the furniture bake
```

and every living thing casts a **pure black round puddle**:

```
landmark:  ctx.fillStyle = 'rgba(0,0,0,0.35)';   renderPlayer,  camp.js:3115
landmark:  ctx.fillStyle = 'rgba(0,0,0,0.28)';   renderIdler asleep, camp.js:3138
landmark:  ctx.fillStyle = 'rgba(0,0,0,0.35)';   renderIdler awake,  camp.js:3151
landmark:  ctx.fillStyle = 'rgba(0,0,0,0.3)';    renderCritter, camp.js:3174
```

plus Brock and the Quartermaster, who use `CPAL.shadow` with hand-rolled ellipses inside their
pushes (camp.js:2949 and camp.js:2955). On the same patch of grass a crate throws a golden-hour
shadow and a person throws a black dot. The characters are the thing the eye is on and they are
the least grounded in the light.

**Honest cost.** The earlier draft called this "one function move, five call sites". The local
`shadow` helper has **24 call sites** inside the furniture bake. Promoting it to module level means
those 24 keep working unchanged (the signature does not change) but the diff touches the block they
live in, and six new call sites replace the hand-rolled ellipses. Budget it as a function move plus
six rewrites with 24 call sites in the blast radius, and read the diff on all of them.

### 7.5 Target values, which are the acceptance numbers

| Measure | Today | Target |
|---|---|---|
| Frame contrast standing at the fire | 2.72:1 | at least 4.5:1 |
| Share of the frame below 25% of peak, at the fire | 0.0% | at least 12% |
| Walkable floor, p5 to p95 span | 2.09:1 | at least 3.0:1 |
| Grass to pineFront value contrast | 1.21:1 | at least 1.40:1 |
| Cast shadow contrast against grass | 1.06:1 | at least 1.18:1 |

Plus: grep for `rgba(0,0,0,0.35)`, `rgba(0,0,0,0.30)` and `rgba(0,0,0,0.28)` in camp.js returns
nothing in the cast render functions.

Teddy's lighting report puts 2:1 to 4:1 at the gentle end of the ladder and 8:1 upward in horror
territory. Landing at roughly 4.5:1 to 5:1 in frame keeps the camp firmly cozy while giving the eye
somewhere to be led. Do not push past 6:1: this is a safe place and the research is explicit that
contrast ratio sets the genre before any colour choice does.

---

## 8. Tier 2, units T2.3 to T2.6

### 8.0 Zone reference table

Every zone: its floor, its edge, its dressing, its resident, and the reason you go there.
"Unchanged" is stated explicitly wherever it applies, because a diffable unchanged is as valuable
as a change.

| Zone | Floor | Edge / threshold | Dressed by | Lives there | Why you go |
|---|---|---|---|---|---|
| Tent row | **NEW** needle litter `CPAL.needle` | north hedge H1 in `groundL`; south hedge H6 in `nearL` at y=298 | three tents, three bedrolls, **NEW** one prop per scout | the two scouts you did not send | **NEW, and it ships in Tier 1: you arrive here.** It is your bedroll. |
| West gate | spine dirt, widened to 48 | **NEW** the gate itself, solid by rectangle | two posts (the occluder), a crossbeam (dressing), a lantern | nobody | you pass through it |
| Fire circle | shared camp dirt, UNCHANGED | north hedge H2 in `groundL`; south hedge H4 in `nearL` at y=148; two gates on its mouths | logs, stumps, tripod, picnic table, lanterns, **NEW** Brock's seat | Brock | he reacts to how your night went |
| North gate | spine dirt | **NEW** the gate | posts, **the one beam in camp that occludes**, a lantern | nobody | you pass under it to shop |
| Supply stall | **NEW** swept bare earth `CPAL.swept` | the north gate is its door | badge board, barrels, crates, baskets, feat rack, pennants | the Quartermaster | spend badges |
| East gate | spine dirt, widened to 48 | **NEW** the gate | posts, beam (dressing), lantern | nobody | you pass through it to leave |
| Trailhead | **NEW** pale packed gravel `CPAL.gravel` | north hedge H3 in `groundL`; south hedge H5 in `nearL` at y=138 | trail sign, mailbox, **NEW** the tally post's yard (chopping block, log pile) | the mail carrier if its sprite exists | the tally post decides your night, then you leave |
| Memorial grove | moss, UNCHANGED | the grove-to-stall corridor, 85 wide by 180 long, the only real passage in camp today | cairn, birdhouse, death sticks | nobody | one stick per death, and **NEW** it now updates the night you earn it |
| Cabin yard | camp dirt, UNCHANGED | the cabin door, already a real threshold | cabin, porch light | nobody | **NEW: you can walk round the back and disappear** |
| Lake bank and dock (t2) | sand and water, UNCHANGED | **no new edge and no gate** | canoe, reeds, dock | nobody | nothing yet, and nothing points at it. See section 9. |

### T2.3 Ground: zone floors, the wider spine, six hedge runs

**File: js/camp.js only. After T2.2.**

- Add `CPAL.gravel = '#8d8873'`, `CPAL.needle = '#4a4526'`, `CPAL.swept = '#6b5330'` to the palette
  object (landmark `const CPAL = {`, camp.js:19).
- Repoint the pad calls: trailhead to gravel at 0.45, tent row to needle at 0.42, stall to swept at
  0.5. Fire circle, grove and cabin yard pads unchanged.
- Widen both spine legs. Landmarks, both in `_bakeGround`:
  ```
  this._paintPath(q, 0, -10, -370, 30, 34, rng);       // to the tents      camp.js:1544   34 -> 48
  this._paintPath(q, 30, -20, 590, -20, 36, rng);      // to the trailhead  camp.js:1545   36 -> 48
  ```
  Spur widths stay: stall 30, grove 24, cabin 26, lake 30. The road now reads as wider than the
  doors off it.
- Add a `hedgeRun` helper and six runs. Each is a loop stepping 34 + rng()*16 units along a line,
  calling the existing `this._clusterAt(q, x, y + jitter, rng, 'plain')`. Six lines each plus the
  shared helper.

**Into `groundL` (flat, behind the cast; these are north edges you look at, so they need no
occlusion budget). Placed 8 units outside the walkable edge so the brush is not standing on the
floor:**

- H1 tent row north: y = -228, x from -660 to -300
- H2 fire circle north: y = -188, x from -210 to -50 and from 30 to 210 (gap for the north gate)
- H3 trailhead north: y = -138, x from 270 to 410 and from 550 to 700 (gap for the cabin path)

**Into `nearL` (foreground, drawn after the y-sorted cast; these are south edges that cover your
boots). Placed 8 units south of the walkable edge, which is the number section 6.3(c) derives:**

- H4 fire circle south: walkable edge y=140, hedge line **y = 148**, x from -210 to -70 and from 70
  to 210 (gap for the lake path)
- H5 trailhead south: walkable edge y=130, hedge line **y = 138**, x from 270 to 700
- H6 tent row south: walkable edge y=290, hedge line **y = 298**, x from -660 to -300

Today, at tier 0, **zero percent** of the walkable perimeter has a visible barrier within 40 units
of it. You walk off dirt onto grass, keep going, and stop at nothing. These six runs fix the six
longest bare stretches, and H4 to H6 turn a decorative baked layer into a working one at zero new
draw calls.

- Add a small pad and a short path up the east side of the cabin for the new lane and pocket.

**Acceptance:**
1. Harness: for each of the three gap ranges, assert no hedge cluster is placed inside it, checking
   the generated coordinate list before it is painted.
2. Harness: run the flood fill from T2.1 again. Nothing got sealed.
3. Visual: standing anywhere on the spine you can name which zone the floor belongs to without
   looking up. Walking east along the fire circle's south edge, brush covers your boots and not
   your face.

### T2.4 Ceremony: leaving, and the dawn colour

**Files: js/camp.js, plus about 8 lines in js/ui.js. After T2.3.**

The arrival beat already shipped in Tier 1. This unit adds the other two ends.

**Arriving from a dawn.** Same hook as T1.1, branch on `META.lastRun.result === 'dawn'`. Three-line
dawn pool, `AudioSys.play('victory')` (landmark `case 'victory':`, audio.js:270), `arriveT = 0.7`,
and the arrival tint opens out of warm `rgba(255,196,110)` rather than dark `rgba(5,8,5)`. One
extra colour in the vignette builder. Coming home from a win is a different colour of morning, and
that is the whole beat. Do not touch the tier-4 tarp reveal or Brock's one-time tarp line; both
already fire correctly.

**Leaving at the trailhead.** Today `startRun` sets state to `'play'` in the same frame as the
keypress, with the scout's `runstart` bark firing after the camp is already gone, so you hear it
over the first room.

```
landmark:  if (act.type === 'run') { AudioSys.play('click'); startRun(META.selected); }   ui.js:1889
```

`js/transition.js` cannot be reused: it sets `g.phase = 'transit'` on a live game object (landmark
`g.phase = 'transit';`, transition.js:53) and camp has no `g`. So do it locally:

1. E at the sign sets `this.leaveT = 0.6` and `this.msg` to a per-scout departure line, instead of
   returning `{type:'run'}` immediately.
2. Over 0.6 seconds the screen vignette closes from `CAMP_VIG` to 1.0. The fire and the lantern
   glows are in L8, drawn before the vignette, so they are the last things to go, which is right.
3. When `leaveT` reaches zero, camp sets `this.pendingRun = true`.
4. ui.js's frame loop drains `App.camp.pendingRun`, clears it, and calls `startRun(META.selected)`.

**Camp keeps moving while a dialogue box is open.**

```
landmark:  if (App.state === 'camp' && !App.dialogOpen) App.camp.update(dt);   ui.js:2140
```

becomes `App.camp.update(dt, App.dialogOpen)` with the gate dropped. **Lock this signature:**
`update(dt, frozen)`. When `frozen` is truthy, skip only the input block (landmark
`let ax = (INPUT.keys.has('KeyD')`, camp.js:880, through `this.walkPhase = (this.walkPhase || 0) +
dt * 13.5 * push;`, camp.js:900) and the interactable scan (landmark `for (const s of this.spots())`,
camp.js:918). Everything else runs. Because `update(dt)` leaves `frozen` undefined, the camp side
and the ui side can land in either order without breaking.

It costs exactly one normal update per frame while talking. It is worth it: talking to Brock at the
fire is the most common thing a player does in camp, the dialogue box is a bottom-docked bar
(`#dialog`), not a full-screen overlay, so the frozen scene is right there in view, and today it is
the one moment the camp is provably a photograph.

**Acceptance:**
1. Harness: `update(dt, true)` leaves `p.x` and `p.y` unchanged with movement keys held, and still
   advances `this.t` and the particle lists.
2. Visual: talk to Brock and the sparks, fireflies and idlers keep moving behind the dialogue box.
3. Visual: press E at the trail sign and the camp darkens for about 0.6 seconds before the first
   room appears.

### T2.5 Ownership: whose spot is whose

**File: js/camp.js only. After T2.4.**

- **Brock's seat** at (92,-64): a camp chair or stump with a folded blanket, a mug on the ground,
  drawn in the existing fire-circle furniture block. Keep-out added in T2.1.
- **Tally post yard**: chopping block at (308,-30) reusing the baked `stump` painter, log pile at
  (368,-104) reusing `logpile`. Keep-outs added in T2.1. Both are drawn under 18 units tall, so
  they are inside the occlusion budget by construction (section 6.2).
- **Per-scout tents** inside the existing loop (landmark
  `for (const [id, tx, ty, fl] of [['max', -520, -150, false],`, camp.js:1995): three `tcol` values
  instead of one shared, plus one prop each. Max's slingshot leans on the pole at (-500,-138)
  (`P.h_slingshot = () => mk(28, 14,`, sprites.js:1685). Junie's is a scorched ring, a filled
  ellipse at (-560,52), no sprite needed. Gus's is a cooler at (-448,222) plus a crate at
  (-424,214), both existing baked painters. Guard each with the file's existing `campHasSpr` idiom
  and fall back to a painted shape.
- **Two trigger radii.** Badge Board 46 -> **34** (landmark `{ id: 'board', x: -30, y: -352, r: 46,`,
  camp.js:798) and Quartermaster 38 -> **28** (landmark `{ id: 'qm', x: 35, y: -340, r: 38,`,
  camp.js:799). Board to Quartermaster is 66.1 apart; 34 + 28 = 62, no overlap. Neither sprite moves
  and neither keep-out moves. This is a two-number fix for a real bug where the nearest-wins picker
  silently swaps which prompt you get as you shuffle.
- **The cabin pinboard returns `{ type: 'journal' }`** instead of setting `this.msg` (landmark
  `if (id === 'pinboard') {`, camp.js:1359). The pinboard already paints twelve journal pins read
  live off the save; it was flavour text. Add the matching ui.js branch beside the existing act
  branches at ui.js:1889.
- **Add the clamped death count to `campFeatSig()`** (landmark `function campFeatSig() {`,
  camp.js:89): `s = f + ':' + t + ':' + Math.min(n0(META.deaths), 24)`. Today a death does not plant
  its stick in the memorial grove until some unrelated rebake happens later, which means the game's
  highest-frequency accrual signal fires out of context.

**Acceptance:**
1. Harness: `spots()` contains no two entries whose trigger circles overlap. Assert board to
   Quartermaster distance 66.1 against radii 34 plus 28.
2. Harness: bump `META.deaths`, call `_maybeBake()`, assert `bakedFeatSig` changed.
3. Visual: from across the fire circle you can tell which tent is Max's, which is Junie's and which
   is Gus's without a label.

### T2.6 Life: lanterns, birds, a deeper breath

**File: js/camp.js only. After T2.5. The most droppable half of this unit is the birds.**

- Three gate lantern glows in the additive pass (L8), swaying on `this._wind` from T1.4.
- Two birds crossing the treeline on a long bezier with a two-frame wingbeat. About 30 lines, one
  tiny painter, 2 bezier evals and 2 small path fills per frame.
- Raise the idle squash on Brock and the Quartermaster from 0.02 and 0.018 to 0.05 (landmarks
  `const squash = 1 + Math.sin(this.t * 2.2) * 0.02;`, camp.js:2948, and
  `const squash = 1 + Math.sin(this.t * 1.9) * 0.018;`, camp.js:2954). Two numbers. At zoom 1.25 on
  a 40-unit figure, 2% is under one screen pixel, so today they are provably still.

**Frame budget.** The camp already animates about 136 things and roughly 80 are on screen at the
fire, but 129 of the 136 are the same idea: a glowing dot on a sine. Everything in this document
adds one extra full-canvas gradient fill (there are already two, at L9), three extra gradient glows,
two bird draws, about nine more entries in a sort whose base is 30 furniture pushes plus the cast,
and three sine calls. On a mid laptop that is comfortably under 0.5 ms against a 16.7 ms budget. The
frame's real cost is three `drawImage` blits of the baked layers and the additive glow pass, and
neither grows materially.

**Acceptance:** sample the frame budget standing at the fire before and after; no regression.

---

## 9. The lake stays an honest empty state, and nothing points at it

The earlier draft built a lit ceremonial gateway at the mouth of the lake: two posts, a crossbeam, a
hanging lantern, a new light pool, and a narrowed lake path to hold them.

The lake contains 141,240 square units, about 18% of the camp's walkable ground, and **zero spots,
zero NPCs, zero furniture and zero systems.** The hint sign that stood there is removed at tier 2 and
nothing replaces it.

Leading a player toward an empty field with ceremony is a promise the game does not keep. It is the
same mistake the totem pole made before it became the Tally Post, and the project's own rules forbid
it: sourced content only, honest empty states instead of fake content, sections render only when
there is something real to render.

**The decision, and it is not split: remove the ceremony, keep the lake honest.**

- No lake gate. No fourth gate at all: three gates, all on the processional, all leading somewhere
  with content in it.
- No lake gate lantern and no lake gate light pool.
- The lake path rect stays `[-60, 60, 125, 165]` exactly as it is. The tier-0 and tier-1 stub and
  hint sign stay exactly as they are. The way south is still overgrowth, honestly.
- The lake's existing sun pool becomes elliptical for consistency with the others but **keeps its
  current alpha of 0.12**, so it does not get more inviting.
- The `water` positional emitter from T1.2 still runs at tier 2 and up. That is not a promise, it is
  a fact about a lake: there is water there and you can hear it. It costs nothing and it does not
  point anywhere.

This is not a smaller version of the ceremony. It is the ceremony removed. When the lake earns
content, LATER item 1 says exactly what the cheapest version of that is, and the gate can be built
then, pointing at something.

---

## 10. What could go wrong

### Risk 1: a gate passage feels sticky

The north gate at 50 units clear is the tightest thing in the camp, and `clampWalk` pushes out of
circles before it clamps into rects, so a player pressed into a corner can be shoved along a
boundary in a way that reads as catching.

**De-risk, mechanically, not by feel.** The three checks in T2.1's acceptance are the ones that
matter, and the second of them is the one the earlier draft was missing entirely: **assert that a
position `clampWalk` itself produced is a fixed point of `clampWalk`.** Neither of the earlier
draft's two proposed checks (post circles must not intersect the opposite rect edge; clear passage
at least 44) looks at a circle's own edge, which is exactly where that failure lives. Measured
numbers to hold the line at:

- zero frames inside a post footprint, over 108,000 frames per gate
- zero frames moving further than 8 units
- worst idle-clamp move after a walk: 2.3656, which is the pre-existing crate at the stall's corner
  and must not rise

If a gate still feels sticky in the hand, the fix is one number: widen the rect back by 2 units on
each side and draw the posts 2 narrower.

### Risk 2: the vignette turns the camp to mud

Two darkening systems stack: the new screen vignette at 0.52 corner alpha and the existing world
vignette. On a dim laptop or in a bright room this could read as murk rather than composition, and
it would be blamed on the redesign rather than on one number.

**De-risk, cheap:** `CAMP_VIG` is a single named constant at the top of camp.js, so tuning is one
edit. Ship the world vignette reduction in the same commit as the screen vignette so one commit owns
the total and one revert undoes the whole experiment. Validate on the measures in 7.5 rather than by
eye, because eye judgements of darkness do not survive a different monitor.

### Risk 3: arrival fires at the wrong moment

The arrival runs on a run-count edge inside `update()`, and `update()` also runs while the player is
inside the cabin. `_maybeBake()` can rebuild the entire furniture list on the same frame, since a
death that crosses a tier threshold triggers a rebake. Getting yanked out of the cabin, or arriving
mid-rebake, is the failure that would make this feel broken rather than ceremonial.

**De-risk, cheap:** guard on `this.scene === 'grounds'` and do not consume the edge otherwise, so the
beat waits until the player steps outside. Order the top of `update()` so the arrival runs after
`_maybeBake()`. Assert both in the harness with T1.1's two-line cabin test.

### Risk 4: the depth work is invisible on a phone

At 390x844 the visible world is 312 by 675, so a 12-unit gate post is 15 screen pixels on a screen
where the scout is 42 pixels wide. The occlusion budget in 6.2 was derived in world units, which are
resolution-independent, so the *fraction* of the scout covered is identical at every viewport. What
changes is absolute pixel size. **Check the west gate on a phone-sized window before committing
T2.1.** If 35% of a 42-pixel scout does not read, the answer is a wider post, not a taller one.

### Risk 5: the shadow convention diff is bigger than it looks

24 existing call sites sit in the blast radius (7.4). Read the whole diff, not the summary.

---

## 11. The acceptance harness

Write once, in the scratchpad, **never in the repo**. A node script that stubs
`document.createElement('canvas')` to return an object whose `getContext` yields a no-op 2D context,
stubs `window`, `SPR`, `META`, `Roster`, `Feats`, `Totem`, `DATA`, `INPUT`, `Touch` and `AudioSys`,
then loads js/camp.js into a `vm` context and pulls `Camp.prototype.clampWalk` off the class.

`walkRects()`, `keepOuts()`, `spots()` and `clampWalk()` are pure and fully assertable this way, and
`clampWalk` is the one that matters: **test the real function against candidate geometry, never a
copy of its logic.** Everything in section 5 was measured that way. Rendering needs a real canvas, so
anything visual stays a visual check.

**Do not use the browser pane; another process holds it.**

The four checks that must exist, because each of them catches something a reviewer had to find by
hand:

1. **Fixed point.** Every position `clampWalk` produces is a position `clampWalk` leaves alone.
2. **Gate walk.** Every gate, every approach angle, several hundred frames: never inside a post,
   never a frame that moves further than the input step plus a legitimate slide.
3. **Flood fill.** Every spot reachable within its own trigger radius, at every tier 0 through 4.
4. **Occlusion budget.** For every y-sorted occluder on a walking route, the fraction of the scout's
   34 by 43.66 box it covers at the worst reachable player position is between 25% and 40%, with the
   cabin pocket as the single declared exception at 100%.

---

## 12. LATER

Everything the audits found that this redesign deliberately cut. Nothing good is lost; none of it is
in scope now. Roughly ranked by value.

**Top of the list, worth doing next:**

1. **The lake holds nothing.** Reaching 150 lifetime badges opens 141,240 square units containing
   zero interactables, zero NPCs, zero systems and zero solids. The cheapest close: one spot at the
   dock end (about 80,440) with a sit-and-look line and a coil of rope beside it. Second cheapest and
   better: give the moored canoe a spot; it already has a keep-out circle at (170,430,34). **Section 9
   is a promise not to point at the lake until one of those exists.** When one does, build the fourth
   gate then.
2. **Growth collapses into night one.** `META.tier()` (landmark `tier() {`, meta.js:143) is four
   independent ifs, so it is a maximum, not a ladder. A single combat room queues 62 enemies at 1 to 6
   badges each, so 150 lifetime badges clears inside the first room of the first night. The end of run
   one delivers, in one frame: the cabin plus chimney smoke plus porch fireflies (tier 1), the lake
   plus dock plus canoe plus twenty fireflies plus fourteen glints (tier 2), and Junie waking up,
   because `cond: () => META.lifetime >= 150 || META.dawns >= 1,` (roster.js:12) gates her on the
   identical number. Do **not** convert `tier()` to a strict ladder: an existing save at one dawn and
   zero spent would drop from tier 4 back to tier 2 and lose the trophy post. Re-space the numbers
   instead: move tier 2 off 150 to something reached on night three or four, and move Junie off that
   same number. Two constants, and the camp then grows five times instead of twice with exactly the
   same content.
3. **A tier crossing happens silently.** The single biggest growth event in the game rebuilds the
   furniture list in place with no dust, no sound, no line and no camera nudge, while camp.js already
   contains the perfect effect: eleven dust puffs, a squash pop and a star flash, used only for a
   character swap (landmark `for (let i = 0; i < 11; i++) {`, camp.js:860). Capture the old tier in
   `_maybeBake`, and on an increase spawn the existing puff burst at the newly revealed object.
4. **Four of the seven zones have no life of their own.** Standing in the tent row, all seven animated
   groups on screen belong to the fire circle seen from across the clearing. The trailhead has nothing
   local at all. One local moving thing per dead zone: a bird resident for the grove birdhouse (which
   retroactively makes the knocking joke land), a mail carrier walking a ten-second beat at the
   trailhead reusing the idler state machine verbatim, a swinging lantern and a restocking loop for
   the Quartermaster.

**Space and architecture:**

5. Make the memorial grove the camp's one enclosed nook by shrinking its rect from 290 by 170 to about
   170 by 110 and letting the forced-treeline pass close in around it (landmark
   `// locked zones read as dense treeline`, camp.js:1887). The cairn, the birdhouse and the
   death-stick grid all move inside. This is the one zone where smaller is better, and it is the only
   change that touches the treeline bake, which is why it is out of scope here.
6. Move the merit badge rack out of the shop and into the fire circle at about (-150,-120), so reading
   your sash is a fireside act rather than a shopping act. Three coordinates: the spot, the keep-out,
   the baked furniture position.
7. Hedge the remaining bare perimeter beyond the six longest runs. At tier 4 only 8.5% of the walkable
   perimeter has a visible barrier within 40 units.
8. Dwell spots as a first-class inventory: turn the two bench logs at (-85,8) and (80,-2) into sit
   spots with an idle pose and no prompt. Today the dock is the only place in camp where you can stand
   still with a view and nothing asking for input, and it is gated behind tier 2.
9. A duty roster board beside the trail sign at about (556,-70), giving the scout swap a fixed
   silhouette while keeping the walk-up-and-press-E that camp already does best. Today the biggest
   run-shaping decision in camp is attached to an NPC who walks away.

**Systems as objects:**

10. The Badge Board, Merit Badges, the Field Guide and the Tally Post are all full-screen DOM modals
    (index.html:487 through 573). Every one of them is a hard cut out of the world. This is the largest
    single gap against Hades and it is also the largest single piece of work in the whole audit, which
    is why it is not in a slight redesign.
11. The outdoor merit badge rack paints badges at radius 2.6 world units (landmark
    `ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, TAU); ctx.fill();`, camp.js:2301), which is three screen
    pixels at zoom 1.25, so the difference between two badges and eleven is unreadable. Scale to about
    4.5 and go two per row instead of three.
12. Personalise the cabin to `META.selected`: the held weapon propped by the bunk, a personal item on
    the shelf, a kerchief in that scout's colour. Needs an interior rebake when the selection changes,
    which `_bakeInterior` does not currently support (landmark `_bakeInterior() {`, camp.js:3210,
    called from camp.js:1243 and camp.js:3638).
13. `#select`, the card-based scout select screen, is built once in ui.js and `setState('select')` is
    never called anywhere. Dead code still shipping in the bundle.
14. Options cannot be reached from camp at all; Escape drops you to the title.

**Sound and life:**

15. The ambient night-woods bed, zone-based reverb crossfading between the named zones, and footsteps.
    `js/footsteps.js` is a seven-line no-op stub with zero call sites anywhere.
16. Camp music. `enterCamp()` explicitly calls `AudioSys.stopMusic()` and camp.js never starts anything
    back, so the hub is the quietest place in the game. Do not reuse `startMusic()` (landmark
    `function startMusic() {`, audio.js:639): its sequencer is a driving square-wave bassline on every
    eighth and is wrong for a hub.
17. More motion kinds. 129 of the camp's 136 moving objects are a glowing dot on a sine. A drifting seed
    or leaf layer with falling-and-spinning physics rather than orbiting-and-pulsing would cost about
    fifteen lines reusing the spark loop.

**Doctrine:**

18. A hub validator. `LEVEL_DESIGN.md` Section 2 (formations, symmetry with one violation, one motif per
    space, the foot rule, the single anchor) and the reachability floor from Group G port almost whole.
    Everything else must be rebuilt against hub-native numbers: the dodge gap band, the charger lane
    width and the anti-alcove rule are actively hostile to a place people are meant to linger in. New
    predicates a hub needs and an arena does not: a dwell-spot inventory with sightlines, an NPC
    approachability ring, threshold legibility from the zone you are already unlocked into, the
    occlusion budget from section 6.2, and a composed-with-a-zone-missing check run per tier, since a
    combat room is never authored to work with pieces of itself absent.

---

## 13. Co-op flags

The camp is the shared hub in the planned four-player phase. Four things here assume one player.

1. **Arrival places one body at one spot.** Four players would stack on `spotFor(META.selected)`. The
   shape of the fix is a slot index offsetting by about 30 units per slot around the bedroll, or one
   bedroll per player once the tent row has four. Not built. This is the smallest of the four, and it
   applies to Tier 1, so it arrives with the first thing that ships.
2. **`campFade` keys on `this.p`.** With four players a pine must fade if **any** player overlaps it,
   not just the local one. The helper needs to take a list. Two lines when the time comes, but it will
   be missed if it is not written down.
3. **Departure is single-player.** `leaveT` and `pendingRun` express one person deciding to leave. In
   co-op, leaving is a vote or a host action and the trailhead needs a lobby state showing who is
   ready. **This is the largest co-op rework in the document** and the departure beat should be treated
   as provisional until that design exists.
4. **Gate widths.** Clear passage is 60, 52 and 50. Two players abreast is 44 units of body plus slack,
   so the north gate at 50 is a squeeze for two. If co-op is committed, widen the north path rect to
   [-52, 32, -245, -160] for 64 clear, move the posts to match, and revisit the east gate. Note that
   the fix is now a rect edit plus a post coordinate, not a keep-out edit, because there are no gate
   keep-outs any more.

`AudioSys.setListener` is per-client and correct as it stands: each client sets its own listener and
builds its own emitters. No rework needed there as long as nobody tries to run one shared audio graph.
