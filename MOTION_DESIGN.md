# MOTION_DESIGN.md

Binding law for Merit Badge Massacre, alongside ART_STYLE.md and LEVEL_DESIGN.md.
Written 2026-07-28 against main at commit c0740d2. Every claim about the game as it
stands today carries a file path and a line number. Where a number is inference
rather than a measurement, it says so.

Twelve sections:

1. The one page
2. The measured state
3. The architecture decision
4. The attack table
5. The rest of the animation vocabulary
6. Motion as tone
7. The effects layer
8. The budget
9. What we are not doing
10. The build order
11. How this changes the house artist
12. Open questions for Teddy

---

## 1. THE ONE PAGE

**What the game does today.** Every critter, bosses included, is animated by thirty lines
at `js/render.js:675-704`. They produce three numbers: how squashed the body is, how high
off the ground, and how far tilted. Fifteen of the twenty-one creatures never leave the
default case, one breathing sine and one waddle. A 4 hp tick, a 132 hp beaver and a
6000 hp final boss all bob at the same rate.

**What is wrong with it.** Three things.

Nothing anticipates. An owl firing and an owl standing still are the same picture
(`js/director.js:2018-2025`). The bog frog has a data field literally called "inflate
telegraph" (`js/data.js:172`), the AI reserves 0.35 seconds for it
(`js/director.js:1919`), and the renderer never reads it. The player dodges on the
projectile appearing, which is reaction, not reading.

Nothing reacts. One hit response exists: a white silhouette for a tenth of a second
(`js/render.js:708-711`), identical for a 4 damage tick and a 400 damage crit, because
`e.flash = 0.1` is flat (`js/game.js:345`).

Nothing stays. Corpses last 0.18 seconds (`js/game.js:423`) and there is not one decal or
scorch mark in 29,347 lines. You clear a room of ninety critters and the floor looks
untouched. For a game whose premise is that belief leaves a mark, that is a thematic miss
as well as a feel miss.

**What we are doing.** Not what four designs proposed, which was to break every critter
into baked parts and rebuild them as puppets. That fails on a physical fact of this art
style: the lighting is painted into the bitmap at a fixed angle, including a hard rim
highlight (`js/sprites.js:43-48`) that visibly breaks once one piece rotates against a
piece that did not. Instead:

- The three numbers become eight, and bodies rotate over their feet rather than around
  their bellies. That alone carries most of the attack table.
- Anything that must truly articulate is drawn live as strokes over the baked body, the
  way the player's legs already work (`js/sprites.js:4763-4791`). Strokes carry no baked
  light, so they move freely.
- Gaze is light, not geometry. The eye glow is already drawn fresh every frame
  (`js/render.js:730-747`), so looking at you, blinking, and stopping blinking are free.
- Every creature gets a named attack from its real biology, readable with no text and
  unsettling with gore switched off.
- The tin Token comes off the body when a critter dies and stays on the floor.

Roughly 2,000 new lines and zero rewritten painters.

---

## 2. THE MEASURED STATE

Counted, not estimated. Line counts from `wc -l js/*.js`: 29,347 total across 28 files.
`js/sprites.js` 4913, `js/camp.js` 3743, `js/director.js` 2190, `js/ui.js` 2170,
`js/rooms.js` 2150, `js/render.js` 1805, `js/game.js` 1751, `js/data.js` 493,
`js/transition.js` 233, `js/props.js` 215, `js/dodge.js` 161.

**The gait block is thirty lines.** `js/render.js:675` is the comment "per-species gait".
`js/render.js:703` is `const drawY = yB - hopY`. Between them: `squash` (676), `hopY`
(677), `gaitRot` (678), then five override cases, then the options object at 704 and one
`SPR.drawBottom` at 707. That is the entire critter animation system.

**Six of twenty-one bodies get a bespoke gait. Fifteen get the default sine.**

- Hop case (`render.js:679`): rabbit (`data.js:154`), bogfrog (185), BRAMBLEBUCK (208).
- Bat case (`render.js:689`): bat only, and it is keyed on `e.spr === 'bat'`, not on the
  movement law, which is why the cindercrow (`data.js:193`, `move: 'sine'`, the game's
  other flier) animates like a walking squirrel.
- Charge case (`render.js:693` and `696`): boar (`data.js:159`) and ashelk (191), and
  only during two of their four AI states.
- Default breathing sine, fifteen bodies: squirrel, doe, raccoon, owl, fox, beaver,
  ticktot, pineconepuffer, chipchoir, stiltheron, sapperrat, cindercrow, quarrybadger,
  THE TALLYMAN (`data.js:209`) and OLD NOBODY (210).

**There are no attack animations.** `js/render.js` contains zero references to `puffT`,
`guarding`, `guardT` or `shotT`. The frog inflate telegraph, the badger's plating shift
(`js/director.js:824-841`, an 85 percent damage refund running 2.5 seconds on and 1.5
off) and every ranged windup are invisible.

**There is one hit reaction.** `js/render.js:708-711` redraws the same sprite in white at
the same pose, alpha ramped from `e.flash / 0.1`. `e.flash` is set to a flat 0.1 in
`dealDamage` (`js/game.js:345`) for every hit from every source. Knockback
(`js/game.js:346-352`) moves the position without touching the pose.

**Particle push sites: eighteen real ones.** A grep for `parts.push` across `js/` returns
20 hits. Two are not run particles: `js/camp.js:950` pushes to camp's own separate array
(declared `js/camp.js:544`, cap 60) and `js/meta.js:397` is a local variable named
`parts` used to hyphenate a save code. The real eighteen: `js/game.js` 15 sites (286,
308, 357, 426, 495, 552, 559, 568, 575, 578, 1402, 1456, 1472, 1495, 1524),
`js/dodge.js` 2 (99, 110), `js/props.js` 1 (178). On top of that sit 48 calls to the
three helpers `spawnPuff` / `spawnBurst` / `spawnBoom` (defined `js/game.js:549`, 565,
574), the majority of them in `js/director.js`. Six particle kinds, drawn by one if/else
chain at `js/render.js:243-278`. No gravity, no rotation, no sprite particles, no
settling (`js/game.js:1213-1226`, fourteen lines).

**Busy frame draw call count: about 210 `drawImage` and about 1,100 path, fill and text
operations.** This is counted from the code paths in `js/render.js:23-336`, not measured
with a stopwatch. Blits: ground and far treeline 2, near overlay 1, enemy bodies 90,
white flash overlays about 15 (a 0.1 second window on a 90 body room), gems about 60 of
a 400 cap (`js/render.js:100-104`, cap `js/game.js:456`), props 12, solid decos 2, doors
about 16, player torso and weapon 2, corpses 6, projectiles 3. Non-blit operations in the
same frame: 90 shadow ellipses (`render.js:661-663`), 180 `createRadialGradient` plus 180
arc fills for eyes (`render.js:741`), up to 420 particle arcs (`render.js:243-278`), up to
80 damage numbers each costing a `strokeText` plus a `fillText` so 160 text rasterizations
(`render.js:293-304`, cap `js/game.js:546`), 26 fireflies, and two full-screen radial
gradient fills built fresh every frame (`render.js:1789-1802`). The blits are the minority
of the frame.

**Nothing culls offscreen.** `js/render.js:125-135` pushes every entry in `this.enemies`
into the y-sort buffer and sorts the whole array with no viewport test, against a director
ceiling of 300 (`js/director.js:497`).

**Nothing measures the frame.** Three `performance.now` calls exist in 29,347 lines:
`js/ui.js:1348` is an audio slider throttle, 2107 and 2115 are the frame delta. There is
no FPS counter and no frame timer. Note that `.claude/agents/release-gate.md` area 5
already mandates the exact measurement (average, p95, worst, count over 16.7 ms, at three
resolutions) before any deploy, so the procedure exists and has simply never been run
against an animation change.

**Two other facts that constrain this work.**

`SPR.draw` (`js/sprites.js:4704-4716`) supports exactly seven things: target width,
rotation about the sprite centre, flip, y-only squash, alpha, white, tint. There is no
pivot, so today's `gaitRot` rotates every critter about its own middle and the feet slide
sideways instead of the body tilting over them.

`SPR.eyePositions` (`js/sprites.js:4725-4738`) applies flip and squash but **not**
rotation, while the body at `render.js:707` is drawn with `gaitRot`. On a squirrel that
already displaces the outer eye glow by about 0.85 CSS pixels, oscillating at 1.4 Hz, and
by about 2.3 pixels during a charge lean. That is a live bug, and it is larger than the
gaze signal we are about to add.

---

## 3. THE ARCHITECTURE DECISION

**The call: no baked part rigs, on anything, in 3.0. Bodies move as one baked bitmap
through a widened pose channel, and anything that must genuinely articulate is drawn live
as flat strokes over the baked body. Gaze is done with light, not geometry.**

### Why not parts

Four designs converged on splitting each critter's bake into a head, a body and an
appendage, composed live each frame with a pivot. It is the obvious answer and it is
wrong here, for two reasons that are physical rather than budgetary.

**Reason one: the lighting is painted in at a fixed angle, and the rim breaks fast.**
`shadePass` (`js/sprites.js:34-49`) bakes five levels into every carrying form: a midtone
band, a core shadow, a warm ground bounce underneath, an upper-left highlight, and an
opt-in rim. The first four are soft and forgiving. The rim is not: it is a hard stroke at
`lineWidth` 2 in a saturated hue-shifted colour, drawn as an ellipse arc from `Math.PI *
1.02` to `Math.PI * 1.82`, which is the top 144 degrees of the form
(`js/sprites.js:43-48`). Its terminator moves by radius times angle, so it exceeds its own
2-unit width at an angle of 2 divided by the radius. On a boar body that is 4.6 degrees.
On a squirrel tail, 5.6. On a fox head, 7.7. On a rabbit ear, 11.9. There are 83 `rim:`
usages in `js/sprites.js`, and they sit on exactly the forms a rig would want to move.

This is invisible today only because `gaitRot` rotates the whole sprite, so every rim
tilts together and the eye reads it as the animal leaning. The moment one part rotates
against a neighbour that did not, there is a same-frame reference and it stops being a
lean and becomes a lighting fault. Every pose the designs actually asked for is between 6
and 40 degrees, which is between 1.3 and 8 times the break threshold.

**Reason two: in-plane rotation cannot turn a head, so the flagship poses are unreachable
anyway.** Every critter head is painted three-quarter-forward with both eyes and the snout
on-axis (the fox head at `js/sprites.js:666` carries both `demonEye` calls at x 20.8 and
31.2 with a centred snout wedge at 672 to 677). A part rig's channels are rotation, offset
and scale. There is no yaw. Rotating a forward-facing head bitmap in the image plane reads
as the head **tilting**, not turning. "The head turns to face you past where a neck should
allow" needs a second baked view, which is a pose-variant programme, not a rig.

Three further costs, all real, none of them the deciding factor: three parts takes the
enemy segment from about 105 blits to about 330 and canvas state operations from 630 to
1,710 per frame; the flat source-in white fills (`js/sprites.js:4674-4701`) double-brighten
at every seam on every hit in the game, and the fix (compositing to a scratch canvas)
means about 15 offscreen render-target switches per frame, 900 per second, which is the
single worst thing you can do to a phone GPU; and the fox head and body currently overlap
by roughly half a logical unit against a 2.4-unit outline, so on that species a split is
new art, not a regroup.

### What we are doing instead, and where the line falls

**The unit of animation is the whole baked body plus a small number of live-drawn
strokes.** The test for which side something falls on has three parts and all three must
be true for a thing to become a live stroke part:

1. **It can be drawn as a stroke or a small flat fill**, not as a shaded mass. A neck, a
   leg, an ear, a tail tip, a strap, an antenna, a tongue. Not a haunch, not a chest,
   not a head.
2. **It carries no `shadePass` lighting**, therefore no rim, therefore no fixed light
   direction to disagree with.
3. **It is separable from the silhouette contract**: moving it does not delete the
   species tell named in ART_STYLE rule 6.

Everything else stays in the bake and moves only through the whole-body pose channel.

This is not a new technique. It is the one that already works. `SPR.drawScout`
(`js/sprites.js:4747-4796`) draws a baked legless torso plus two live-stroked segmented
legs with a knee break, a stride phase, a foot lift and a wedge boot, and it is the only
thing in the game that reads as a different order of creature. It works precisely because
those legs are flat strokes with no baked light. The same construction already exists,
unanimated, inside three critter painters: the stiltheron's S-neck is two quadratic
strokes at `lineWidth` 8 and 6 (`js/sprites.js:1199-1205`), the ticktot's six jointed legs
are two strokes each (`js/sprites.js:1036-1043`), and the doe has segmented legs with a
knee break (`js/sprites.js:377`).

So the largest silhouette change anyone proposed, the heron's neck straightening from a
hunched grey lump into a 110-unit vertical spike, is reachable today with no engine change
at all. It just has to be redrawn live rather than rotated.

### The four layers, in draw order

1. **Behind strokes.** Live-drawn parts that sit behind the mass: a tail, a wing, a
   trailing strap. Drawn before the body blit.
2. **The baked body.** One `drawBottom` call, exactly as today, through the widened pose
   channel.
3. **Front strokes.** Live-drawn parts that sit over the mass: a neck, a foreleg, a
   tongue, an ear that has come forward.
4. **The eye pass.** Already live (`js/render.js:730-747`), gains gaze offset and blink.

### The pose channel

Replace the three scalars at `js/render.js:676-678` with a pose object:

    { squash, stretchX, offX, offY, rot, pivotY, alpha, still }

`squash` and `alpha` behave as today. `stretchX` is new and is the one that makes a
gather read (a body that gets wider without getting taller is bracing; a body that only
squashes is being stepped on). `offX` and `offY` are pixel offsets in world space, which
is how a lunge, a flinch and a recoil are expressed. `still` is a hard short-circuit that
sets squash to exactly 1 and rot to exactly 0, discussed in section 6.

`pivotY` requires a six-line change to `SPR.draw` (`js/sprites.js:4704-4716`): translate,
rotate about a point offset toward the feet rather than the centre, then scale.
`drawBottom` already computes the foot anchor, so the pivot is a subtraction. **This fixes
a bug that already ships**: today every critter rotates around its belly, so a waddle
slides the feet sideways. Do it first, before anything else, because everything else
inherits it.

### Ramp-then-hold

Every anticipation reaches its extreme in the first third of its window and then holds
perfectly still for the rest. One helper:

    anticipate(t, dur, ramp) -> eased 0..1, reaching 1 at t = ramp * dur, held after

This is the load-bearing idea in the whole document and it resolves two collisions at
once. A held pose is not motion, so a reduced-motion setting sets `ramp` to 0 and the
telegraph still lands intact. And a held pose is attached to the creature you are already
looking at, so it costs no screen space and survives ninety bodies.

### Migration path

Nothing forks. Every step below leaves the game shipping and looking correct.

1. **Pivot plus pose object.** `js/sprites.js` gains `o.px`/`o.py`. `js/render.js:675-704`
   assembles a pose object instead of three loose numbers. Existing behaviour is
   byte-identical if the new fields default to identity, except that the waddle now tilts
   over the feet, which is the fix.
2. **Facing split, with a deadband.** `js/director.js:2181` sets `e.flip = p.x < e.x`
   unconditionally every frame, and `gaitRot` takes its sign from it
   (`js/render.js:678`, 684, 694). Split into `e.flip` derived from actual horizontal
   travel with a hysteresis threshold of about 12 units per second, and `e.look`, a unit
   vector the gaze system owns. **The deadband is not optional**: without it, slow and
   jostling bodies flip every few frames and ninety strobing sprites is worse than the bug.
3. **Apply rotation in `eyePositions`.** Rotate the offset by `o.rot` before scaling
   (`js/sprites.js:4725-4738`). Must land before anyone judges whether the gaze reads,
   because the existing error is bigger than the new signal.
4. **Bake the eye glow disc.** Two small canvases replace 180 gradient allocations per
   frame.
5. **The live stroke helper.** One function in `js/sprites.js`, roughly 40 lines, taking a
   chain of points and a width taper, with a `white` flag so the hit flash covers it. Live
   strokes are actually **easier** to flash than baked parts, because we control the
   stroke colour directly and there is no seam to double-brighten.
6. **Species by species.** A creature with no live parts declared and no attack clip
   authored draws exactly as it does today. There is no flag day and no big-bang merge.

### The hard sequencing gate

Two branches have checked-out worktrees on this machine: `D:/Programs/mbm-3.0-substrate`
(v3-substrate, 13 behind main, 1 ahead) and `D:/Programs/mbm-2.1-audio` (v2.1-audio, 5
behind, 3 ahead). The substrate branch changes `js/game.js` (354 lines), `js/dodge.js`
(186), `js/render.js` (111), `js/data.js` (123) and `js/director.js` (29), and
`BUILD_ECONOMY_3.md` on main already warns that the mid-run save shifted line numbers
enough to break a blind patch apply. **Land the substrate merge before any animation unit
touches those five files**, or a one-day merge becomes a three-way merge on the two
hardest files in the repo. Decide the audio branch next; it is only three commits ahead.

---

## 4. THE ATTACK TABLE

The centrepiece. One row per creature: eighteen in `DATA.enemies` (`js/data.js:153-195`)
and three bosses (207-210).

**The standard, taken from Teddy's own owl pellet example.** Every row has to pass all
four:

1. True to the real animal. Not a monster move. A thing the actual species does.
2. Unsettling with gore switched off. If blood is doing the work, the row is not finished.
3. Readable with no text. Nobody needs a tooltip.
4. It says something about what the Signed have become.

**The ruler.** Junie has 85 hp (`js/data.js:26`), Max 100 (18), Gus 140 (34). Damage tiers
are stated against Junie, the squishiest, because that is the honest case. Dodge iframes:
Max 0.30s on a 1.0s cooldown, Junie 0.24s twice on 0.8s, Gus 0.34s on 1.4s
(`js/data.js:435-443`). Visual reaction time is around 0.25 seconds clean and closer to
0.35 picking one threat out of ninety bodies.

**Anticipation floors:**

| Tier | Damage vs 85 hp | Anticipation floor | Channels |
|---|---|---|---|
| CHIP | under 12 percent | 0.26 to 0.35 s | body only, no world channel |
| REAL | 12 to 30 percent | 0.50 to 0.70 s | body plus edge |
| HEAVY | over 30 percent, or any knockdown | 0.85 to 1.30 s | all three |
| BOSS SIGNATURE | any | 1.20 to 1.60 s | all three |

**Recovery floors:** at least 0.8 times the anticipation for REAL attacks, 1.4 times for
HEAVY. The creature must be in a visibly **open** pose during recovery, not merely
not-attacking. That is the punish window and it has to be a picture.

CHIP attacks are deliberately below the dodge window. They are attacks you are meant to
**see**, not dodge, and they exist so the room reads as alive without becoming a rhythm
game.

---

### SQUIRREL: THE CACHE
`js/data.js:153` (dmg 7, CHIP, 8.2 percent) | pool weight 100, the most-seen body in the
game | painter `js/sprites.js:272-325`

- **Wind up (0.30 s).** It stops dead. Body squashes to 0.88 and `stretchX` goes to 1.14,
  so it gets **wider** rather than shorter: cheeks visibly packed. Head tips back 0.10 rad.
  The stop is the tell, and on the highest-weight body in the game it is worth spending
  the game's cheapest signal on. No world channel.
- **What comes out.** A cone of 6 to 9 husk and shell shards. Not a magenta ball.
- **How it travels.** 70 units in 0.18 s, 0.5 rad cone, gravity 300 so the fringe drops.
- **Player impact.** Shards stop dead, small brown puff, damage.
- **Wall impact.** Rattle off at 40 percent speed, dead in 0.12 s.
- **Residue.** 3 to 5 husk specks, 12 s. One of them is a small tooth that is not a
  squirrel's, and nothing in the game ever comments on it.
- **Timings.** 0.30 / 0.10 / 0.45. Recovery pose: cheeks flat, visibly smaller than it
  was, hunched, waddle amplitude doubled.

---

### RABBIT: THE THUMP
`js/data.js:154` (dmg 8, CHIP, 9.4 percent) | hop AI at `js/director.js:1881-1923`, arc
0.42 s | painter `js/sprites.js:327-367`

- **Wind up (0.22 s).** Squash to 0.80. Ears rotate **forward and pin** (see the
  silhouette rule below). One hind foot thumps: a 26-unit dust ring goes out from the
  foot and is gone in 0.3 s. Rabbits really do thump as an alarm, and it is diegetic,
  cheap, and attached to the body.
- **What comes out.** Nothing. Contact on the hop.
- **How it travels.** The existing 0.42 s hop arc at hopSpd 310, unchanged mechanically.
  At apex, squash 0.92 with the feet forward, which is what a real rabbit does before it
  lands a kick.
- **Player impact.** Contact damage. No projectile.
- **Wall impact.** Landing scuff.
- **Residue.** Shallow scuff depression, 4 s. A room ten rabbits have crossed shows their
  route.
- **Timings.** 0.22 / 0.42 / 0.30. Landing recovery squash 1.18 with the ears still back
  is the punish window act 2 rabbits currently do not have at all.
- **The feint stays honest.** `js/director.js:1903-1905` sends 30 percent of act 2 rabbit
  hops 45 degrees off where you read them. The ears do the same thing both times, but the
  **head** turns to the real landing spot 0.10 s before takeoff. A veteran reads the head.
  That is real skill expression out of one head rotation.
- **CHANGED FROM THE PROPOSED DESIGN.** Design 2 wanted the ears laid flat back along the
  spine. Rejected: ART_STYLE rule 6 names the ears as the rabbit's silhouette tell, and a
  rabbit with its ears removed from its outline collapses toward the bogfrog (both
  hoppers, w 30 and 32) during the exact 0.22 seconds a player must name the threat. Ears
  forward and pinned **adds** to the outline instead of subtracting from it.

---

### DOE: THE STRIKE
`js/data.js:155` (dmg 12, REAL, 14.1 percent) | act 1 pool weight 26, the highest-weight
body a player meets in the first minute | painter `js/sprites.js:369-413`, already has
segmented legs with a knee break at 377

- **Wind up (0.55 s).** It stops. Completely. Gait amplitude to exactly zero while
  fifteen other bodies in the room keep bobbing. Head up and level, gaze locked, no blink.
  At 0.40 s in, the front legs come up: `offY` +6, squash 0.86, rotating about the **hind**
  feet, which is what the pivot is for. The forelegs are live strokes; the painter already
  draws them jointed.
- **What comes out.** Nothing. Hooves.
- **How it travels.** Straight down.
- **Player impact.** Contact plus a 34-radius ground impact at the hoof line.
- **Wall or prop impact.** A doe rearing into a prop breaks it, the same way a boar into a
  wall staggers.
- **Residue.** Paired hoof prints, 20 s, cumulative across a fight.
- **Timings.** 0.55 / 0.14 / 0.70. Recovery: legs splayed, head down, breathing at 4 Hz
  instead of the standard 8.
- **This is the game's first stillness moment** and the doe is the right creature for it.
  Deer do not bite; they rear and strike with the front feet, and the freeze before the
  bolt is the most recognisable real deer behaviour there is. The first time a player sees
  a room full of bobbing critters with one doe that has gone completely still, the game has
  made its tonal argument with no text.

---

### BAT: THE BUZZ
`js/data.js:156` (dmg 7, CHIP, 8.2 percent) | the only species with a bespoke gait today
(`js/render.js:689-692`) | CHIROPTERAN CHOIR spawns 36 at once (`js/data.js:255`)

- **Wind up (0.32 s).** The existing 17 Hz wingbeat multiplier doubles to 34 Hz and the
  hover offset drops from +8 toward 0. That is a real terminal buzz (a hunting bat roughly
  doubles its call rate immediately before capture) and it costs one multiplier on a branch
  that already exists.
- **What comes out.** Nothing. Contact.
- **How it travels.** The dive.
- **Player impact.** Contact damage, mouth open on the frame it lands.
- **Wall impact.** None; it pulls up.
- **Residue.** None, deliberately. Not every species leaves a mark, and a roster where
  everything does will bury the floor.
- **Timings.** 0.32 / 0.12 / 0.40. Recovery: hover offset to +14, wingbeat slowed to 9 Hz,
  like something catching its breath.
- **Density fallback, load-bearing.** A thin colourless ground ring at the buzz moment,
  0 to 90 units in 0.25 s at alpha 0.12, is the echolocation made visible. **Only the six
  bats nearest the player draw it.** Thirty-six rings is a mess. The ring is atmosphere;
  the doubled wingbeat is the contract, and the wingbeat survives any crowd because it is
  on the body.

---

### RACCOON: THE HANDLING
`js/data.js:157` (dmg 14, REAL, 16.5 percent) | painter `js/sprites.js:474-532`, hands at
524-530 with finger lines and speculared claws

- **Wind up (0.50 s, last 0.25 held).** It stops, brings both forepaws up in front of its
  chest, and works at the air: fast, small, precise. Live strokes; the hands are already
  the best-drawn part of the sprite. **And it turns its head away from you while it does
  it.**
- **What comes out.** Nothing. The hands come out.
- **How it travels.** A short lunge.
- **Player impact.** Contact plus knock 90.
- **Wall impact.** None.
- **Residue.** None.
- **Timings.** 0.50 / 0.12 / 0.60. Recovery pose, and the pose is the entire point: head
  down, hands up, examining its own hands.
- **Why this is the best tone row on the roster.** Raccoons douse: they dunk food and work
  it with the forepaws, and the reason is that wetting the hands massively increases nerve
  sensitivity, because the hands are the primary sense organ, more than the eyes. A real
  raccoon looks away while its hands work. Gaze is ranked first of six on the doctrine's
  own wrongness ordering (`.claude/agents/sprite-artist.md`, the "where the wrongness
  comes from" list), and **looking away is a stronger read than staring**, because staring
  is what the player expects. Do not resolve the discomfort inside the animation.

---

### OWL: THE CASTING
`js/data.js:158` (shotDmg 9, CHIP-high, 10.6 percent; contact 10) | act 3 weight 18 |
`shotCd` 2.8, `shotSpd` 190 | AI `js/director.js:2005-2026` | painter
`js/sprites.js:534-587`

**This is the reference implementation. The other twenty are written against it.**

- **Wind up (0.75 s, three sub-beats).**
  - 0.00 to 0.25, THE LOOK: the body does not move at all. The gaze goes to you and holds.
    This is the eye layer, not geometry.
  - 0.25 to 0.55, THE HEAVE: the neck extends and lowers, drawn as a live stroke from the
    body up to the baked head position, with the head sliding down and forward on `offY`.
    Body squash 1.0 to 0.86. Two visible pulses travel up the neck stroke, 0.12 s apart.
  - 0.55 to 0.75, THE HOLD: motionless, beak open, still looking at you. The hold is what
    makes it legible with reduced motion on.
- **What comes out.** A pellet. A matte grey-brown ovoid, not a magenta plasma ball.
- **How it travels.** Existing `shotSpd` 190 with a downward gravity term so it arcs and
  reads heavy. It tumbles on its long axis, shedding loose fur.
- **Player impact.** It bursts. Five layers: one additive flash disc for 0.07 s; nine dust
  dots in dry bone-brown that **rise** (negative gravity 18) and stop within 0.15 s,
  drawn on the ground layer so the cloud never covers the player; six bone sprites (two rib
  arcs, a vertebra, a jawbone, one intact tiny skull) at gravity 520, bouncing once and
  settling; five fur tufts at gravity 130 which therefore **float** where the bones fall;
  four fast grit dots as the leading edge. Twenty-five particles.
- **Wall impact.** Same recipe, doubled dust because a wall traps the cloud, bone bounce
  raised to 0.45, and the dust decal lands at the wall base. **A pellet that reaches the
  end of its range with nothing in front of it still bursts**, keeping only dust and fur
  and dropping the bones, because a pellet that quietly fades out breaks the promise the
  sprite made.
- **Residue.** Bone specks and a dust ring, 25 s. Over a long fight, bone collects at the
  foot of whatever wall the owl has been shooting at.
- **Timings.** 0.75 / 0.10 / 0.85. Longest recovery on a ranged trash body, which is
  correct at act 3 weight 18: head stays down, feather tremor, head rises slowly.
- **Act 3 triple shot.** `js/director.js:2018-2022` fires three at once with a 0.22 rad
  fan. Keep the fan, but the **head turns between each cast**, so three casts read as three
  separate efforts rather than one shotgun.
- **Why it survives the gore toggle.** Bone that has been through an owl is dry and clean.
  There is no blood in an owl pellet. That is why this is the right standard for the whole
  roster: **reach for what the animal actually does before reaching for blood.**
- **CHANGED FROM THE PROPOSED DESIGN.** Design 2 had the head physically rotating past
  where a neck should allow. Rejected: the head is a fixed three-quarter-forward bake and
  rotating it in-plane reads as a tilt, not a turn (section 3). The turn is done with the
  eyes, which is where it was always strongest anyway, and the neck extension carries the
  silhouette change.

---

### BOAR: THE HOOK
`js/data.js:159` (dmg 20, REAL-high, 23.5 percent) | charge AI `js/director.js:2029-2064`,
windup 0.45, charge 0.75, recover 0.5 | wall stagger at 2137-2143

- **Wind up (0.55 s, RAISED from 0.45).** 20 damage on 85 hp is 23.5 percent and 0.45 s
  sits under the reaction floor for that tier. The snout goes down into the ground and
  shoves forward twice, throwing soil back over the shoulders. **Keep the existing tremble
  but drop it from 40 Hz to 12 Hz** (`js/render.js:697` currently runs `Math.sin(this.t *
  40)`): 40 Hz reads as an action game, 12 Hz reads as an animal with weight.
- **What comes out.** The animal.
- **How it travels.** Existing charge, 340 speed for 0.75 s, with the existing 0.16 rad
  headlong lean **now rotating about the feet**. At the moment of the pass, the whole body
  rotates 0.35 rad toward the player over 0.10 s. That is the hook, and it is the frame the
  damage lands. Boars do not gore upward like a bull; they run past and hook sideways.
- **Player impact.** Contact, existing knock, plus 4 units of directional shake **along
  the charge direction**.
- **Wall impact.** The stagger already exists and is completely invisible today
  (`js/director.js:2137-2143`, stun 0.6). Give it the picture: head snaps back, two bone
  sparks off the tusks, two gouge decals that stay.
- **Residue.** Two ploughed furrows down the entire charge lane, 40 s. A boar really does
  plough soil with the snout, and a field one has worked looks tilled.
- **Timings.** 0.55 / 0.75 / 0.65 (recover raised from 0.5, and it currently has no pose
  at all).
- **Depends on the facing fix.** With `e.flip` slaved to the player's position
  (`js/director.js:2181`), a boar that overshoots turns to look at you while still
  sprinting away and leans backwards for the rest of the charge. The hook inherits the
  wrong sign until step 2 of the migration lands.

---

### FOX: THE MOUSING
`js/data.js:160` (dmg 14, REAL, 16.5 percent) | act 2+ AI `js/director.js:1829-1880`, the
crouch is already 1.2 s and the code comment at 1855 literally calls the back-off "the tell
that something worse is coming" | painter `js/sprites.js:641-687`

- **Wind up (1.20 s, existing, three beats).**
  - 0.0 to 0.4: gives ground (existing code, unchanged).
  - 0.4 to 0.9: the body drops. Squash 0.82, `offY` -2, front legs fold as live strokes,
    haunches rise above the shoulders. The tail **bristles wider** rather than going
    vertical.
  - 0.9 to 1.2: total stillness. Ears pinned forward.
  The existing cone zone stays but its alpha halves, because the body is now doing the work.
- **What comes out.** Nothing. The whole fox.
- **How it travels.** The existing 0.34 s pounce at 620 speed, but the arc goes near
  vertical: `offY` to 26 at midpoint, coming down rotated 0.5 rad forward, nose-first
  between the paws. The mousing pounce is the most photographed animal behaviour in the
  world and it is close to vertical.
- **Player impact.** Contact.
- **Wall or miss impact.** It lands with its face in the ground and its haunches up and has
  to pull its head out.
- **Residue.** Nose-and-forepaw impressions, 20 s.
- **Timings.** 1.20 / 0.34 / 0.70. **Recovery is currently zero** (`js/director.js:1848`
  sets `ai.state = null` immediately). This is the largest missing punish window on the
  trash roster.
- **CHANGED FROM THE PROPOSED DESIGN.** Design 2 wanted the tail stiff and vertical.
  Rejected: a crouched fox with a vertical tail is the squirrel silhouette, and the
  squirrel's own named tell is a vertical crescent tail (`js/sprites.js:274-278`). A brush
  tail that bristles **wider** is the same amount of read without the collision.

---

### BEAVER: THE ALARM, and THE FELLING
`js/data.js:161` (dmg 18, REAL, 21.2 percent; the ring is dmg times 0.4 plus a 130-unit
shove) | act 2 slap at `js/director.js:1801-1816`, currently **zero anticipation** on a
132 hp body that shoves you across a room | painter `js/sprites.js:688-737`, crosshatched
paddle tail at 690-699, iron-orange incisors as the accent at 726-730

THE ALARM:
- **Wind up (0.65 s, NEW; there is none today).** The paddle tail rotates up behind the
  body to near vertical as a live stroke and **holds**. On a body that is otherwise a lump,
  that is a colossal silhouette change visible from anywhere in the room. World channel:
  the ground darkens and dust lifts along the landing arc before the strike.
- **What comes out.** The existing 340-speed ring to 200 radius.
- **How it travels.** Existing.
- **Player impact.** Existing damage plus the 130-unit shove, plus **a visible ripple
  through any puddle the ring crosses**. Puddles already render at `js/render.js:52-66`,
  so this is Teddy's ringing water using an entity that already exists.
- **Wall impact.** The ring stops.
- **Residue.** Radial ground cracks, 30 s. Gnaw marks on adjacent props, permanent for the
  room.
- **Timings.** 0.65 / 0.08 / 0.80. Recovery: tail flat on the ground, body low, levering
  itself back up.

THE FELLING (second attack, so a 132 hp body has two things to read):
- **Wind up (0.45 s).** Rises on the haunches, incisors showing. Beaver enamel genuinely
  contains iron, which is why the teeth are orange and why they cut hardwood.
- **Timings.** 0.45 / 0.12 / 0.55. Act 2 pool weight is only 4, so this is an event body
  and it earns two attacks.

---

### TICKTOT: THE QUEST
`js/data.js:179` (dmg 4, CHIP, 4.7 percent) | act 2 weight 24, act 1 weight 8, the
floodiest body on the roster | painter `js/sprites.js:1033-1062`, six jointed legs at
1042-1043, gold back dot at 1052

- **Wind up (0.26 s).** It rears onto its back four legs, holds the front two out in the
  air, and stops moving entirely. Rotation -0.22, `offY` +3, gait amplitude to zero. Ticks
  quest: they climb to the tip of a grass blade, hold their front legs out, and wait
  motionless for days for something warm to walk past. It is the best real behaviour on
  the whole roster for this game's tone and it is free.
- **What comes out.** Nothing.
- **How it travels.** It drops on you.
- **Player impact.** Nothing is thrown, nothing is knocked. The body squashes to 1.3 wide
  and the gold back dot flashes bright for 0.15 s. That is the only feedback it needs and
  it says the thing just fed.
- **Wall impact.** None.
- **Residue.** None per tick. But a fed ticktot **keeps a permanently larger gold dot**,
  one scalar on the entity, which makes a fed tick visibly worth killing first.
- **Timings.** 0.26 / 0.08 / 0.30. Recovery: flat on the ground, legs splayed.
- **This is the density design.** The roster's highest-count body deliberately gets the
  cheapest possible tell: one rotation and a hold, no world channel, no particles. Six of
  them motionless with their arms up at once is free horror.

---

### PINECONEPUFFER: SEROTINY
`js/data.js:181` (dmg 9, CHIP, 10.6 percent) | `onDeath: 'eshot6'` fired at
`js/director.js:786-790` | painter `js/sprites.js:1064-1086`, five furRow scale bands at
1072-1076

- **Wind up (0.30 s).** The scale rows lift outward as live strokes, the green sprout on
  its head stands straight up, the body squashes wider.
- **What comes out (living attack).** A pollen puff on contact.
- **The death is the real attack.** Six winged samaras on the existing eshot6 vectors,
  spinning as they fly.
- **How they travel.** Existing speed, plus real rotation, plus a slow flutter.
- **Player impact.** They stick, with a green pollen puff.
- **Wall impact.** They embed and stay 20 s.
- **Residue.** A seed that reaches the end of its life on open ground **plants**, and a
  small sprout stays for the rest of the room. A room where you killed twelve puffers has
  twelve sprouts in it. Permanence with meaning, zero blood, and it makes act 1 read as
  something growing back wrong.
- **Timings.** 0.30 / 0.10 / 0.35.
- **Real biology.** Serotinous pine cones only open in fire: the resin melts, the scales
  spring apart, and the seeds fire out. It is exactly this creature.

---

### CHIPCHOIR: THE CHORUS
`js/data.js:183` (dmg 7, CHIP, 8.2 percent) | leash AI `js/director.js:1969-1985`, shared
centroid computed at 1724-1740 | painter `js/sprites.js:1088-1132`, cheek pouches at
1117-1120, round singing mouth at 1125

- **Wind up (0.60 s).** All three stop, inflate the cheek pouches, and open the singing
  mouth, **in perfect phase**. The group shares a bob phase during the anticipation only.
  That single mechanism solves the attack **and** the invisible-tether problem: the moment
  you can finally see which three are a set is the moment they wind up.
- **What comes out.** One ring from the group centroid, radius 130, damage times 0.5,
  using the existing `fireEnemyRing` primitive (`js/director.js:629-635`).
- **How it travels.** Expanding ring. **It passes through walls, because sound does.** It
  is the one enemy attack you cannot hide from behind cover, and a 0.60 s tell makes that
  fair.
- **Player impact.** Staggering rather than killing.
- **Wall impact.** Passes through.
- **Residue.** None.
- **Timings.** 0.60 / 0.15 / 0.85. Recovery is long on purpose: killing one during it
  breaks the trio, and the survivors cannot chorus.
- **Real biology.** Chipmunks chip, and a colony synchronises and answers for half an hour
  at a time.

---

### BOGFROG: THE PAD
`js/data.js:185` (shotDmg 8, CHIP, 9.4 percent) | `puff: 0.35` documented at
`js/data.js:172` as "inflate telegraph, seconds, before the tongue lands", set at
`js/director.js:1919`, counted down at 1884-1891, **and drawn nowhere** | painter
`js/sprites.js:1134-1173`, pale throat sac at 1162-1165

**The cheapest single win in the codebase.** The designer already decided this critter
should inflate. The AI already reserves the time. Only the drawing is missing.

- **Wind up (0.35 s, existing data, unchanged).** The throat sac scales 1.0 to 1.6 on an
  ease-out so most of the swell lands in the first 0.15 s and holds for the last 0.2. Body
  squash to 1.10. The pale core brightens. World channel: reeds and grass within 40 units
  bend away. **It also goes completely still**, which gives the game a second telegraph
  grammar: every existing telegraph is added motion, and a hole in the noise is a
  genuinely different channel.
- **What comes out.** The tongue: a 6-unit tapered stroke from mouth to shot position, not
  a magenta ball. You can see it is a tongue.
- **How it travels.** Existing `shotSpd` 300 to `tongue` 320.
- **Player impact.** Wet ring, damage. **No pull** (see open question 4).
- **Wall impact.** The pad sticks flat for 0.25 s then peels off with a wet snap, leaving
  a 14-radius slick for 8 s.
- **Prop impact.** It sticks and drags a small prop 8 units.
- **Residue.** The slick, 8 s.
- **Timings.** 0.35 / 0.09 / 0.55.
- **The recovery is the row's best idea.** The tongue retracts visibly over 0.2 s, then
  both eye turrets **sink down into the head** and come back over 0.35 s. Frogs really do
  swallow using their eyeballs, pushing food down through the roof of the mouth. It is real,
  unsettling, has no blood in it, and it happens whether or not the tongue connected, so it
  is always the punish window.

---

### STILTHERON: THE STAND, and THE STAB
`js/data.js:187` (shotDmg 11 = 12.9 percent REAL; stab is shotDmg times 1.3 = 14.3 =
16.8 percent REAL) | act 2 weight only 6, a rare body that earns expensive animation |
existing stab zone warn 0.45 at `js/director.js:2010-2017` | painter `js/sprites.js:1175-1219`,
the S-neck is two quadratic strokes at 1199-1205

THE STAND (long range):
- **Wind up (0.70 s).** The S-neck **straightens fully**, turning a hunched grey lump into
  a 110-unit vertical spike. This is the largest silhouette change available on the roster
  and it needs no engine change at all, because the neck is already strokes: it is redrawn,
  not rotated. Then it pumps twice.
- **What comes out.** A wet grey pellet.
- **How it travels.** Existing `shotSpd` 230 **with gravity**, so it lands rather than
  flying flat.
- **Player impact.** Bursts into a 40-radius ring of fish bones and scales where the damage
  actually lands. That converts a boring straight shot into a lobbed area attack you dodge
  by moving.
- **Wall impact.** Bursts on contact.
- **Residue.** Fish scales, 15 s, pale and iridescent, no blood anywhere.
- **Timings.** 0.70 / 0.12 / 0.65. Recovery: the neck folds and a visible lump travels
  down it over 0.4 s.

THE STAB (close range):
- **Wind up (0.55 s, RAISED from 0.45).** 14.3 damage on 85 hp is 16.8 percent and 0.45
  sits at the reaction floor. The neck **coils**, head pulled back 12 units. The whole tell
  is in the coil.
- **Commit 0.06 s.** Deliberately the fastest thing in the game. A real heron strike is
  roughly 60 milliseconds, among the fastest movements in vertebrate biology.
- **Recovery 0.75 s.** The longest punish window on any trash body: the bill is stuck in
  the ground and the bird rocks backward twice to pull it out. That is what makes closing
  on a heron the correct play.
- **Residue.** Bill punctures, 25 s.

---

### SAPPERRAT: THE UNDERMINE
`js/data.js:189` (dmg times 0.8 = 8.8, CHIP, 10.4 percent) | burrow AI
`js/director.js:1939-1967`, rise warn 0.5, `underT` 2.2, `out` state 1.2 s with no pose |
painter `js/sprites.js:1221-1267`

- **Wind up (0.50 s, existing).** The mound does not sit still. Redraw `renderMound` so
  the ground ahead of it **heaves three times** across the rise warn, soil lifting and
  falling back on each heave. This is Teddy's shuddering ground on the one creature where
  it is unarguably diegetic, and it costs three sine bursts on a renderer that already
  exists.
- **What comes out.** The rat, teeth first.
- **How it travels.** It surfaces rotated 0.4 rad, coming up at an angle rather than
  straight.
- **Player impact.** Existing zone damage plus knock 80.
- **Wall impact.** None.
- **Residue, and it is free.** `renderTunnel` and `ai.tunnels` already exist in the
  renderer for the unreachable mole boss (`js/render.js:91-93`). Give the sapperrat an open
  tunnel mouth at every surfacing point, permanent for the room, capped at 24. A room six
  sapperrats have worked is visibly undermined, and the holes are a **map of where a
  burrower has been**, which is diegetic telegraphing at its best.
- **Timings.** 0.50 / 0.10 / 0.55. Recovery: half out of the hole and climbing, tilted,
  which is when it is most hittable and currently has no pose at all.
- **Real biology.** Rat incisors never stop growing, roughly 12 cm a year, so a rat gnaws
  compulsively or the teeth grow through its own skull. The name already says sapper: it
  undermines.

---

### ASHELK: THE BUGLE, and THE BURN LANE
`js/data.js:191` (dmg 19, REAL-high, 22.4 percent; trail is dmg times 0.35) | charge AI
shared with the boar, trail zones every 0.09 s at `js/director.js:2049-2058` | act 3 weight
11 | painter `js/sprites.js:1268-1342`, glowing seam cracks at 1313-1329

- **Wind up (0.85 s, RAISED from 0.45).** Heavier than the boar and correct at 19 damage
  plus a fire lane. The head goes up and back, muzzle to the sky. The seam cracks along
  the shoulders and haunches **brighten and pulse** as it draws air. World channel: ash
  lifts off the floor in a 90-unit ring and drifts upward.
- **Why this is the best diegetic row on the roster.** The act 3 floor is already ash, so
  lifting ash around a bugling elk is atmosphere and telegraph in one gesture, on a species
  whose act 3 weight is only 11 and which will therefore rarely be crowded. And the seam
  cracks are the creature's **one saturated accent**, which means the accent is doing
  telegraph work instead of being decoration. That is the correct answer to how a growing
  roster stays coherent under the one-accent-per-creature rule.
- **What comes out.** The animal, and the lane behind it.
- **How it travels.** Existing 0.75 s charge, existing trail zones. The trail now starts as
  dark scorch and **blooms to fire across its 0.55 s warn**, so the lane visibly catches
  behind it and the safe ground is the ground it has already left.
- **Player impact.** Contact, plus the lane.
- **Wall impact.** The same stagger as the boar.
- **Residue.** **The lane stays as black char for 45 seconds after the fire burns out.** A
  late act 3 room is criss-crossed with black lanes. This is the strongest permanence image
  in the document and it falls out of a mechanic that already ships.
- **Timings.** 0.85 / 0.75 / 0.70. Recovery: the seams dimmed almost to nothing, visibly
  cooling, which is a punish-window tell legible at a glance from anywhere in the room.
- **Real biology.** Elk bugle partly through the nostrils, which is why a body that size
  reaches frequencies it should not.

---

### CINDERCROW: THE DROP
`js/data.js:193` (dmg 9, CHIP, 10.6 percent) | `move: 'sine'`, `onDeath: 'split2'` at
`js/director.js:791-804` | act 3 weight 24, the highest on the roster | painter
`js/sprites.js:1344-1381`, throat glow at 1358

**Fix the gait bug first.** `js/render.js:689` keys the wingbeat on `e.spr === 'bat'`
instead of on the movement law, so the game's other flier falls through to the ground-walker
breathing sine. Key the branch on `move === 'sine'` and both fliers are fixed forever, plus
every future flier.

- **Wind up (0.55 s).** It **climbs**, hover offset from 8 to 26, separating vertically
  from everything else in the room. Wingbeat drops from fast-and-shallow to a slow deep
  4 Hz. The throat glow swells. Height is the one axis a crowd does not compete for, which
  is why climbing is the correct telegraph for the highest-weight body in act 3.
- **What comes out.** One falling coal.
- **How it travels.** Real gravity, aimed **where the player is going**, not where they
  are. That is a genuinely different threat to read from everything else on the roster.
- **Player impact.** A direct hit calls the existing `applyBurn` (`js/game.js:369`).
- **Ground impact.** Starts a small fire zone (reuse the elk trail shape, radius 26, warn
  0.4).
- **Residue.** Small scorch, 30 s.
- **Timings.** 0.55 / 0.10 / 0.60. Recovery: it stalls, tips sideways, and has to beat
  hard to get its height back.
- **The split death is the signature** and at weight 24 it is the most-seen death in act 3,
  so it gets the most drawing: the body opens, two smaller crows visibly made out of the
  parent climb out, and what is left falls as cold ash. It does not divide; it comes apart.
- **Real biology.** Australian raptors are documented carrying burning sticks to flush
  prey, and corvids deliberately ant, sitting in smoke and letting it wash through their
  feathers.

---

### QUARRYBADGER: THE SHIFT, and THE TURN
`js/data.js:195` (dmg 17, REAL, 20 percent) | `tickGuard` at `js/director.js:824-841`,
2.5 s on and 1.5 s off, `armorMul` 0.15 so 85 percent of every hit is refunded, and
`e.guarding` reaches the renderer nowhere | painter `js/sprites.js:1383-1431`, riveted tin
plate over the head at 1408-1425 with **one demon eye burning through a slot and the other
side deliberately empty**

**The sprite already solved this and nobody wired it up.** For five eighths of the fight
the player's damage is nearly worthless and the badger looks exactly the same as when it is
soft.

THE SHIFT (the persistent state, not an attack):
- **Plates down (2.5 s, existing).** The head lowers so the tin plate faces the player,
  the front claws plant, and a slow specular sweeps the brass rivets every 0.9 s. The pose
  says "there is metal between you and me".
- **Plates up (1.5 s, existing).** The head comes up and **the plate visibly tips back off
  the face**, exposing the empty socket side and the open throat. That is the burst window,
  and there is no number on screen anywhere.
- A player learns to time a burst in about three cycles and the game never says a word.

THE TURN (the attack):
- **Wind up (0.55 s).** The shoulders bunch and it plants.
- **What comes out.** A head-butt with a tin plate.
- **How it travels.** A short lunge, plate leading.
- **Player impact.** Contact plus knock.
- **Wall impact.** The plate **rings**. One bright metal spark, and it sits crooked for two
  seconds.
- **Residue.** Claw furrows where it planted, 25 s.
- **Timings.** 0.55 / 0.14 / 0.60. **The recovery pose is the best single image on the
  trash roster**: the plate askew and a forepaw pushing it back into place. An animal
  correcting a mask it does not understand it is wearing. That is the premise in one
  gesture, with no blood in it.

---

### BRAMBLEBUCK (act 1 boss): the vanishing act ends
`js/data.js:208` (hp 1050, dmg 13) | phase machine `js/director.js:1096-1252` | the only
boss with a body animation today, via the hop case at `js/render.js:679-684`

**The single biggest fix in this document.** `js/render.js:654-657` returns having drawn
absolutely nothing for the 1.2 seconds of this boss's climactic leap (`js/director.js:1216-1244`
sets both `hidden` and `airborne`, and the airborne branch skips even the mound). The act 1
boss, which the design notes at `js/data.js:200-203` call the wall of the whole run,
disappears entirely for its most important attack. The player tracks a red circle, not a
creature.

- **THE LEAP, wind up (0.90 s, existing).** Unchanged mechanically.
- **Airborne (1.2 s, existing).** Draw a **shadow** under the tracked zone whose scale and
  softness encode height: large and soft at takeoff, tightening and darkening as it rises,
  then swelling fast over the last 0.35 s. Nothing is drawn above it, which is honest,
  because you cannot see a thing that is above the camera. The existing chasing warn circle
  drops to 40 percent alpha because the shadow now carries the read.
- **Landing.** Existing ring, shake 9 and 0.1 hitstop stay, plus a crater decal that stays
  for the fight, and the existing 1.5 s stun gets a real downed pose (splayed, head down,
  ears flat) instead of the generic 20 Hz wobble.
- **PHASE 1, the hopscotch.** Every third landing stamps a zone (`js/director.js:1113`).
  On the hop **before** a stamping landing, lay the ears flat back at apex, so the tell
  arrives 0.42 seconds early and is a silhouette change on a 96-unit body. Add landing dust
  and an impression.
- **PHASE 2.** It is planted in a corner venting squirrels from four stump mounds and
  currently just hops in place. Make it **dig** between hops, working the ground with the
  forefeet, soil piling around it, each mound vent getting a heave. And its eyes stay on the
  player even though its body faces the corner.
- **Residue.** Craters and dig spoil, whole fight.

---

### THE TALLYMAN (act 2 boss): the ledger and the tin
`js/data.js:209` (hp 5000, dmg 21, 24.7 percent) | phase machine `js/director.js:1020-1065`,
ring fired at 1050-1054, tally payout at 805-816 | **runs the default breathing sine in all
three phases**

**Honest problem first, and no animation fixes it.** `js/data.js:209` gives this boss
`spr: 'raccoon'`. A 5000 hp boss and an ordinary act 2 raccoon are the same drawing at
different scale. That is a painter dependency and it limits how much any of the below can
buy. Track it separately.

- **PHASE 1, THE LEDGER. Wind up (0.90 s).** Both hands come up and apart, opening a book.
- **What comes out.** `js/director.js:1050-1054` fires all n ring shots simultaneously
  today. Instead they **emerge one at a time, walking around the circle over 0.35 s**. That
  converts an unreadable simultaneous ring into a thing with a direction you can watch.
- **The projectile.** Not magenta plasma. Small hard chips of stamped tin, spinning,
  catching light.
- **Player impact.** Damage.
- **Wall or prop impact.** They **stick** rather than vanishing: into ground, into walls,
  into crates.
- **Residue.** The tin stays for the fight. The room fills with tally marks. By phase 3 you
  are fighting inside a ledger.
- **Timings.** 0.90 / 0.35 / 0.70.
- **PHASE 2, summoning.** The hands arrive out of his coat rather than out of a generic
  puff. Anticipation 0.70 s, in which he opens the front of himself.
- **PHASE 3, flight.** The flee at `js/director.js:1026-1032` has no pose at all. He runs
  clutching the book to his chest and **looking back at you over his shoulder** (gaze, not
  geometry: the body runs forward, the eyes stay on you).
- **His death.** The book opens and the tally payout goes up as a column of gold. This is
  the one moment gold should be the loudest thing on screen: `flashGold` peaks at 0.7 times
  0.18 alpha, which is 0.126 and barely a tint (`js/render.js:317-318`). Raise it for this
  event only. **And the last thing left on screen is the open ledger on the ground with the
  tally marks you made in it.** The payout does not resolve the fight emotionally. The wrong
  is allowed to stay.

---

### OLD NOBODY (act 3 boss, final): the procession
`js/data.js:210` (hp 6000, dmg 26, 30.6 percent, HEAVY) | phase machine
`js/director.js:1555-1720` | 150 units wide off a 180x200 bake, the largest body in the game
| **runs the default breathing sine in all three phases**

- **PHASE 1, THE PROCESSION.** A slow four-beat walk with real weight, footfalls lifting
  dust, rotating about the feet. It never runs. **Making the largest body in the game the
  slowest-animated thing on screen while ninety things bob at 8 Hz around it is free
  dread**, and it costs one gait branch.
- **THE CHARGE. Wind up (1.20 s, existing).** `ai.telegraph` (`js/director.js:1582`) is the
  **only** redundant-channel telegraph in the entire game: a 380-unit lane. Keep it and make
  it literal: the head and antlers lower until the tine tips touch the floor, and it
  **drags** them, so the red lane is ground the antlers have already scored. Two furrows,
  cut ahead of itself. That is the best possible marriage of Teddy's diegetic ask to a
  mechanic that already ships.
- **Residue.** The furrows stay for the fight.
- **THE TINE (five circles walking outward, warn 0.9, `js/director.js:1595-1603`).** The
  rack **sheds a tine per circle**, one at a time, each visibly leaving the head and landing
  where the circle lands. The rack is emptier afterwards, and you can count how many are
  left.
- **PHASE 2, SIGNING.** It plants centre with `armorMul` 0.35 while six contested signs
  light at the markers and the body does nothing. Give it head down, antlers spread, and a
  **thin line of light from the boss to each live sign**, so snuffing one visibly cuts a
  connection. Six strokes.
- **PHASE 3, THE HOLLOWING.** Today `e.w *= 0.55`, `e.r *= 0.6`, `e.spd *= 2.2` happen in
  **one frame** with a puff over them (`js/director.js:1668-1672`). Restage as 1.1 seconds
  inside the existing 1.2 s `phaseGuard`, so no timing changes at all: the three antler
  props already spawned at 1661-1667 **fly out of the head** and land where they are
  spawned, and the body deflates on an ease. The best moment in the fight for the cost of
  one lerp.
- No blood anywhere in any of it.

---

### MAWMOLE and THE BEHIND: out of scope
Both have complete phase machines (`js/director.js:1257-1411` and 1440-1550), spawn wiring,
a baked sprite (`js/sprites.js:852`), dedicated music tracks, and in THE BEHIND's case the
only bespoke render treatment in the whole renderer (tint plus two pale glints,
`js/render.js:705-706` and 736-739). Neither appears in `DATA.bosses` (`js/data.js:207-210`)
or `DATA.bossTiers` (449-460), and nothing anywhere pushes to either array. **A player has
never met either of them.** No animation budget goes here until Teddy decides they ship.
See open question 5.

---

## 5. THE REST OF THE ANIMATION VOCABULARY

### Hit reactions: five axes, no new draw calls

Everything below fits inside the pose channel, so it is arithmetic, not blits.

**AXIS 1, MAGNITUDE.** Keyed on `f = damage / e.maxhp`, not absolute damage. Today
`js/game.js:345` sets a flat `e.flash = 0.1` for everything, which is why hitting a
squirrel for 4 and a boss for 400 look identical.

| Tier | f | Reaction |
|---|---|---|
| GRAZE | under 0.06 | **No white flash at all.** A 6 percent pale rim for 0.06 s. |
| HIT | 0.06 to 0.18 | White 0.5 for 0.08 s, squash 0.94, rot kick 0.08 |
| HEAVY | 0.18 to 0.45 | White 0.75 for 0.12 s, squash 0.88 overshooting to 1.04, 20 ms hitstop |
| STAGGER | 0.45 and up | The body **folds** to squash 0.80, rot 0.30, and holds folded 0.10 s. 45 ms hitstop. |

The GRAZE tier is not a nicety. It is the fix for twelve simultaneous flamethrower ticks
merging into one white blob at the exact moment a player needs to count survivors.

**AXIS 2, DIRECTION.** The rot kick and the squash axis key off `o.fx` / `o.fy`, which
`dealDamage` already receives (`js/game.js:347-349`) and currently spends only on knockback.
A hit from the left rocks the body right.

**AXIS 3, TYPE.** Fire **darkens** the body rather than whitening it, and leaves it charred.
Water rusts the tin Token permanently (the canteen's own description at `js/data.js:119`
already promises this and nothing draws it). Bug spray tints green and visibly slows the
gait. The bugle **rings**: a 0.25 s high-frequency tremor with no colour change at all.

**AXIS 4, OUTCOME.** A killing blow gets **no** hit reaction. It goes straight to the death.
A flash and then a pop is two events where there is one.

**AXIS 5, ACCUMULATION.** One `hurt` scalar from 0 to 1 that never falls, driving gait
amplitude and head carriage, so a nearly-dead critter stands lower and breathes shallower.

**THE ABSORBED HIT.** `e.armorMul` is already the armour path (`js/director.js:847-851`) and
`e.guarding` already exists. Route both into the reaction branch: shooting the badger's plate
throws a **hard metal spark off the plate**, rings, draws the number in grey, and rocks the
whole animal back with **no white flash at all**. Shooting the striped flank gets the full
reaction. That is how a player learns to flank without a tooltip.

**Density cap.** No more than 8 full-white silhouettes per frame. The rest render the pale
rim. Hard, not a suggestion.

### Deaths: three layers, and only the third is toggleable

Today: `killEnemy` (`js/game.js:413-449`) queues a corpse with `dur` 0.18 (0.34 boss), capped
at 40, plus 7 puffs and one wisp, and `js/render.js:115-121` inflates a white silhouette to
1.45x while flattening it and fading it out. Eleven frames. `ART_STYLE.md:118-119` promises
"deaths are scenes, not fades", and that is a fade with extra steps.

**LAYER 1, THE FALL. Never toggleable. 0.35 to 0.60 s.** One authored collapse per
**movement law**, not per species, which is six of them for twenty-one bodies:

- Walkers fold at the knees, sideways.
- Hoppers go up half a hop and come down wrong.
- **Fliers stop flying first**: a real gravity term for half a second before they die. The
  most legible death on the roster and it costs one branch.
- Burrowers go down and the mound collapses inward.
- Rangers with a long neck (the heron) buckle at the legs and the neck comes down last, as a
  separate beat.
- Chargers keep going for a beat, then plough.

**LAYER 2, THE RELEASE. Never toggleable. This is the signature of the whole document.**

**The tin Token comes off.** `pendant()` (`js/sprites.js:245-266`) is already called inside
every critter painter, so every Signed thing wears a stamped tin token. The premise is that
cryptids sign wildlife with stamped tin. So the single most thematically correct thing that
can happen on a death is the token detaching: it pops off with real velocity, tumbles, lands,
bounces once, settles, and **stays on the floor for the rest of the room**.

That gives us, from one painter and one settling particle: real permanence, a cleared room
that looks cleared, a fiction that says the mark outlasts the animal, and a permanence layer
that is completely gore-toggle-proof, because a tin disc is not blood. It reinforces the
premise harder than gore does.

Implementation note the designs missed: the token is baked **into** the body and its cord
crosses the neck, so there is no token to detach. Paint **one standalone token sprite** (a
new painter, about 12 lines, reusing `pendant`) and spawn it. Do not try to make the worn
token a moving part.

The existing red soul wisp stays but now rises **out of the eyes**, whose positions are
already registered and read every frame (`js/render.js:735`).

**LAYER 3, GORE. Behind the flag.** A wet layer under everything else. With it off, layers 1
and 2 carry the whole death. That is the acceptance test the doctrine demands.

**By killer:**

- Fire kills burn from the bottom up into an ash silhouette over 0.6 s that crumbles and
  leaves a permanent ash mark.
- Explosive kills keep the current inflate-and-burst, which is correct: that is the only
  death where the thing was actually blown apart.
- Crit kills get 60 ms hitstop and run at 0.5x for 0.15 s, so a crit kill is visibly a
  different event.
- **A death during a wind up aborts visibly.** A frog dying mid-inflate deflates. An owl
  dying mid-heave drops the pellet at its feet, unburst. This is the most satisfying thing
  you can give a player and almost nobody builds it.

### The player

**THE ARM. The cheapest big win on the player.** `scoutBase` (`js/sprites.js:1492-1564`)
paints no arm of any kind, and `js/render.js:592-610` draws the held weapon at a fixed
offset from the body with no shoulder, so the weapon floats. Draw one live arm exactly the
way `drawScout` already draws legs (`js/sprites.js:4763-4791`): shoulder fixed on the torso,
elbow solved with the same knee-bulge trick, hand at the weapon grip. Roughly 12 lines, two
strokes and a hand. The arm then absorbs recoil at the elbow, swings on the hatchet, and
comes up to guard. Add a second arm swinging counter-phase to the legs. A body with no arms
cannot brace, gesture or flinch, and unnecessary motion is the definition of alive.

**TAKING A HIT.** Today: a 0.7 s invulnerability drawn as an 18 Hz alpha flicker at 0.35
(`js/render.js:581`, 589), which reads as a rendering bug. Replace with a torso rotation of
0.22 rad **away from the impact** over 0.08 s returning over 0.25 s, the free arm across the
face, and one stagger step (a phase offset plus a hip shift on the existing rig). Keep a much
gentler flicker at 9 Hz and 0.75 alpha so the player can see their own character.

**DODGING, and a real hole.** There are two separate invulnerability clocks: `p.iframe`, set
to 0.7 s when you are **hit** (`js/game.js:476`), and `p.dashI`, set to 0.24 to 0.34 s by the
**roll** (`js/dodge.js:61`). `js/render.js:581` reads only `p.iframe`. A grep for `dashI`
across `js/render.js`, `js/ui.js` and `js/touch.js` returns zero hits. **The player is never
shown the window that is the entire point of the mechanic.** The only feedback is the reticle
dimming to 0.75 (`js/reticle.js:342`).

Fix: draw a pale rim for **exactly** the `dashI` duration, so the player learns how long
their own 0.30 seconds is. Body low to squash 0.72 with the legs **tucked**, frozen at the
tucked position rather than cycling (`js/dodge.js:89` keeps the cycle running today, and
Gus's dodge is literally named "Tuck and Roll", `js/data.js:441`). Junie's burn trail comes
off the boots rather than the body centre.

**And Gus's barge has no art at all.** `js/dodge.js:120-134` knocks enemies 260 units, stuns
them 0.3 s and does 20 damage to props, with zero contact effect. Same category as the
invisible Whittling Knives, and only the knives got caught. Give it a contact effect.

Design the dodge visual as a composable base plus per-item overlays from day one, keyed on
the same hook bus the substrate branch is building, so backlog task 20 (dodge items) does not
force a rewrite.

**SKILL USE.** The bugle and the Reveille skill are currently the same effect: both push to
`this.rings` and are drawn by the same three lines (`js/render.js:233-239`). A weapon and a
signature active skill look identical. Differentiate: the bugle is a gold ring plus a ring of
**dust lifted off the ground** travelling with it. Reveille keeps the pure ring and adds the
gold flash.

**LOW HEALTH (under 30 percent).** Breath rate goes from 2.4 Hz to 4.2 Hz, a hitch every
fourth step, hat sits crooked. No HUD change needed.

**WALKING BACKWARDS.** `p.face` comes from the aim vector (`js/game.js:755`) and `walkPhase`
knows nothing about travel direction (`js/game.js:736`), so strafing and back-pedalling look
exactly like running forward. Reverse the stride phase on a negative dot product of travel
against facing. About two lines, and it fixes the most-seen animation in the game.

**THE WIN POSE.** `js/render.js:570-575` abandons the rig entirely and draws
`this.char.spr`, the whole baked standing sprite including its baked legs, hopping. Call
`drawScout` with a celebration phase instead.

**DEATH.** Already the best-staged moment in the game (`js/game.js:507-517`, 659-679,
`js/render.js:536-568`) and needs only two additions: the arm reaches after the flying hat,
and the three dizzy stars stop being the literal character `*` in bold 9px Verdana
(`js/render.js:563-565`). Four lines. Same criticism as the red exclamation mark, thirty
lines away in the same file, and only one of them ever got caught.

---

## 6. MOTION AS TONE

The doctrine's own ordering of where wrongness comes from puts GAZE first, WORN WRONG second,
STILLNESS third. All three are motion. None of the three exists in the game today. This is
the cheapest quality in the document and it is what serves the Steam repositioning.

### Gaze is light, not geometry

The eye glow is already drawn live, per eye, per enemy, per frame (`js/render.js:730-747`).
It is the one part of a critter that is not frozen in the bake. So offset, radius, blink and
going out are all free consequences of a blit that was going to happen anyway.

**Widen the eye record.** `demonEye` (`js/sprites.js:206-225`) already knows both facts the
renderer needs and throws both away: the final eye radius (`r *= 1.2` at line 207) and the
head's own darker lid tint, which every painter passes as the fifth argument. Change line 224
from `eyes.push([x, y])` to `eyes.push([x, y, r, lid])`. Every one of the ~50 `demonEye` call
sites already passes a lid, so **no painter needs editing**.

**The gaze state machine.** A small object per enemy, updated in the director's per-enemy
tail beside the `e.flip` line (`js/director.js:2181`) so it slows correctly during hitstop.
Four states:

- **SCAN.** A drift target picked at random within a 70 degree cone off the travel direction,
  retargeted every 1.4 to 3.2 s, eased at about 4 per second.
- **LOCK.** Eased onto the player at 9 per second. Acquires on distance alone, at a range
  longer than the room, because there is no aggro system: enemies chase from spawn
  unconditionally. So **everything on screen is already watching you.**
- **WRONG.** Locked onto a point offset from the player by a fixed 14 to 22 degrees. Held.
  Never corrected. That is the doctrine's "aimed slightly wrong", and it reads as a thing
  that is watching but has not quite found you.
- **DEAD.** Look frozen, no drift, no blink. The thousand-yard eye.

Two numbers do the work: the **latency** (0.25 to 0.5 seconds to arrive, so a head never
snaps) and the **hold-past** (LOCK persists 1.2 to 2.5 seconds after its condition ends,
which is literally "a beat past comfortable").

In the renderer the look vector becomes three things: the glow centre offsets toward it by up
to 0.42 of the eye radius; the glow radius scales 0.82 to 1.0 with how directly it faces the
camera; and the far eye, when the look is more than 90 degrees off the body facing, drops to
0.55 radius and clamps at the eye edge, which reads as a head turned as far as it will go.

**Two or three species get a permanent look target that is not the player**: each other, or a
fixed point in the room. That is worse than being watched.

**Two rules that stop this breaking.** First, apply `o.rot` in `eyePositions` before anyone
judges whether the gaze reads (section 2: the existing rotation error is bigger than the new
signal). Second, **eye lists are not pairs**. The quarrybadger registers exactly one eye
(`js/sprites.js:1420`, because the other side of its plate is deliberately empty), the
stiltheron registers two of different radius at different heights (`js/sprites.js:1217-1218`,
which is intentional proportion drift), and one prop registers three
(`js/sprites.js:2709-2711`). Write the gaze layer over an N-eye list with per-eye radius and
**forbid any code path that names a left and a right eye**. Registered eye radius and position
are artist data: the renderer may scale them, never equalise them.

### Blink

The glow alpha is a pure sine today (`js/render.js:734`), which means nothing in the game can
ever have its eyes closed. Replace with a countdown per creature: interval randomised 2.6 to
5.4 s at spawn beside the existing `bob: rand(0, TAU)` (`js/director.js:179`), plus a small
per-blink drift so a pack never settles into sync. The blink is 0.11 s: alpha to zero over
40 ms, hold 30 ms, return over 40 ms, and during the closed window stroke the lid arc in the
registered lid tint.

**The rule that does the work: while gaze is in LOCK, the blink timer does not tick.** A
player never has to be told this. They learn it because everything else blinks.

Non-blinkers by default: THE TALLYMAN, every elite, and exactly one trash species.

Blink is also the most density-robust signal in the whole document, because counting bright
points survives heavy overlap where reading a shape does not, and because it **removes**
luminance where the white hit flash **adds** it, so the two never fight for the same channel.

### Stillness

Add a hard short-circuit at the top of the gait block: if `e.stillT > 0`, then `squash = 1`,
`hopY = 0`, `gaitRot = 0`. Exactly 1 and exactly 0. **A slowed sine still reads as alive; a
zeroed one does not.**

This is only possible because all fifteen default-gait species share one identical baseline
(`js/render.js:676-678`). That uniformity looks like a defect in an audit and is actually the
asset stillness spends. **Do not fix it** by giving every species its own breathing frequency:
per-instance amplitude jitter is fine and desirable (roll a 0.8 to 1.25 multiplier at spawn
beside `bob`, zero runtime cost), but frequency variety in the woods spends the exact resource
stillness lives on.

**Stillness is a low-density tool and this is the honest limit of the doctrine's own item 3.**
The eye finds motion, not its absence, so one motionless thing inside a horde of ninety is
invisible. It belongs at room entry, in the pre-wave lull, in a boss phase, and on the last
enemy alive. **It must never be the only channel on a telegraph during a flood**, which is
exactly why the bog frog gets a swelling throat next to it and the doe's strike also lifts
its forelegs.

**Budget: four placements across the whole game, named.** See open question 2.

1. **The room that was already still.** One to three critters standing motionless at room
   entry, gaze in WRONG state aimed 18 degrees off the door you just came through, holding
   until the first wave lands, then fighting normally. They are placed as room dressing at
   bake time, not as wave spawns. The timing budget is real: wave delays in `js/rooms.js` are
   0.8 to 1.6 s, but the transition already gives about a second more (`js/transition.js`
   zoom home at 0.95 s, room card holding to 2.0 s), so the hold gets roughly two seconds.
   **This is the strongest single beat in the document**, because it borrows the
   best-directed system in the codebase as its setup, and because it fits the premise: the
   Signed do not ambush, they were waiting to be witnessed.
2. **The bog frog windup** (section 4).
3. **The doe's strike** (section 4).
4. **One boss phase change** (below).

### The boss phase change that is silence

`js/director.js:899-925` announces every phase change identically: roar, shake 7, hitstop
0.12, `bossFlash` 0.7, a 16-particle puff and a reposition lerp, with the body strobing white
at `js/render.js:713-717`. Not one boss changes posture, and two of the three shipping bosses
have no gait case at all.

Rather than build three new boss rigs, **invert exactly one phase change on one boss**: still
on the boss and on every non-boss enemy alive, gaze forced to DEAD so the glow ramps to zero
over 0.4 s, hitstop 0, shake 0, flash 0. The music ducks. It holds for 0.9 seconds. Then it
moves.

The absence is the announcement. It is the cheapest boss-body work available and it does more
than a five-part rig would, because it uses the vocabulary the player has spent three acts
learning.

### Wrong motion: the catalogue

1. **THE WRONG FREQUENCY BAND.** Existing tremors run at 20 and 40 rad/s
   (`js/render.js:697`, 700), which is 3.2 and 6.4 Hz: firmly action-game. Dread lives at
   1.5 to 3 rad/s, three to four times **slower** than the 8 rad/s breathing baseline. Same
   amplitude, completely different emotion, costs a constant.
2. **THE LATE FLINCH.** `e.flash` fires the instant damage lands. Give elites a 0.10 to 0.14
   second delay between damage and any visible response: the number floats, the health bar
   drops, and the body does nothing for six frames, then reacts. It reads as a thing that had
   to be **informed**.
3. **ONE BODY IN THREE PLACES.** Seed the chipchoir's `bob` from `e.leashGroup` instead of
   per-instance random, so all three squash on the identical frame while every other body in
   the room is out of step. This fixes a real mechanic-readability bug and buys tone with the
   same line, which makes it the best value item in this section.
4. **TOO LINEAR.** One species moves on perfectly constant velocity with squash locked to 1
   and rot locked to 0: it **slides** rather than walks. In top-down a body translating with
   no gait reads as being on rails, which is a machine tell rather than an animal tell.
5. **THE PERFECT LOOP INVERTED.** Once per-instance amplitude jitter lands, one species keeps
   the mathematically pure single-frequency loop, and that becomes the tell. Fix the baseline
   and the horror appears for free.

### WORN WRONG: the gap nobody designed for

The doctrine ranks worn-wrong **second**, above stillness, above proportion drift, far above
blood: "human gear on an animal that does not understand it... imitation without comprehension
is the whole premise, so make the gear say it." Across four separate designs it received zero
motion design.

It is also the **cheapest** thing on that list to animate under our architecture, because gear
is the one thing on a critter that is legitimately separable: it is not the animal's anatomy,
it does not need to share the body's baked light, and a lashed-on bedroll or a knotted
neckerchief is a live stroke by definition.

**The build: a three-point verlet chain per species, one scavenged item each**, drawn live
over the baked body, lagging the body's motion and springing back. The anchor is registered on
the bake the same way `demonEye` already registers eye positions, so the mechanism exists. The
maths is four lines and is numerically stable at our timestep.

A rabbit's bedroll swings on the wrong axis because it is strapped over a limb that cannot
carry it. A fox's half-shirt drags when it crouches. A bat's neckerchief-as-cape trails a beat
behind the wingbeat. **Gear that moves like it was taken from someone**, which is exactly what
the tone brief asks for and what no amount of stillness or gaze can say.

### What top-down takes away, stated so nobody builds it

There is no behind. `js/render.js:125-135` draws the entire room, the camera is welded to the
player, and the game cannot know where the player's eyes are on the screen. **Weeping-angel
behaviour is not available and should not be designed.** Facial acting is not available on
trash either: a squirrel's pupil slit is about 1.5 CSS pixels wide with roughly 2 pixels of
travel, so pupil tracking is a bosses-and-camp thing only. Nothing hides except the burrower's
mound. Nothing looms, because there is no perspective.

**What it gives back is worth more.** Ninety bodies visible at once means a pattern **across
ninety bodies** is a composable shot, and no first-person horror game can ever do that. Every
eye in the room turning to you on the same frame, once, in a whole run, is a beat only this
camera can stage.

And the crosshair is a gaze. `js/game.js:751-754` computes `aimX`, `aimY` and `aimAngle` every
frame, so the game knows exactly where the player is pointing, and the player chose it
deliberately. That is a better definition of "looking at" than a first-person camera. Use it:
**one species** holds perfectly still while your crosshair is within 25 degrees of it and moves
when it is not, so sweeping your aim across a room wakes the room up. **Ship it on exactly one
species, never globally**, or the game quietly becomes a stealth game.

---

## 7. THE EFFECTS LAYER

### The particle system

Today: one flat `Game.parts` array, six kinds drawn by a 36-line if/else
(`js/render.js:243-278`), fourteen lines of physics with no gravity (`js/game.js:1213-1226`),
drag hardcoded to `Math.pow(0.1, dt)` for everything so every spark stops within a third of a
second and dies where it stopped. No rotation field, no sprite field, no gravity field, no
settling, no chaining. **Nothing in the game can tumble, fall, skid or stay.** That is why it
cannot draw the owl pellet.

**Build `js/fx.js`.**

**Pool.** 900 records preallocated at boot, every field always present so the object shape
stays monomorphic. Live count `n`, swap-remove on death, zero allocation and zero splice cost.
About 180 KB, allocated once.

**Record.** `x, y, vx, vy, t, life, kind, spr, frame, w0, w1, rot, vrot, grav, drag, a0, a1,
fadeIn, fadeOut, col, layer, pri, gy, bounce, friction, hold, flags`.

**Integration.** Gravity, per-particle drag, spin, and a ground plane `gy`. On reaching the
ground: bounce (`vy = -vy * bounce`, `vx *= friction`) or **settle** (velocity zeroed, life
extended by `hold`, layer forced to ground, optional promotion to a decal). Settling is the
thing the current system cannot do and it is half of why the owl pellet reads as real.

**Three draw layers, in this order:**

1. **GROUND**, drawn right after the room ground and **under** the y-sorted cast, so dust and
   settled debris never cover the player.
2. **AIR NORMAL**, after the cast.
3. **AIR ADDITIVE**, after that, one `globalCompositeOperation` change for the whole group.

Three loops, **three** canvas state changes total instead of the roughly 500 the current
per-ember save/lighter/restore pattern costs. That is a large win the original design
understated.

**Sprite particles via a rotation strip.** Each debris painter bakes once into a horizontal
strip of 16 rotation frames, 22.5 degrees apart, which is invisible quantisation on a 5-pixel
bone chip. A sprite particle then draws as **one** nine-argument `drawImage` with a source
rect plus one `globalAlpha` write. No save, no rotate, no restore, no scale call. That is the
single engineering decision the owl pellet depends on, and it makes 90 tumbling debris cost
about a fifth of today's per-particle state cost.

**Sub-budget: sprite particles capped at 70 of the 900, and under 40 in any one frame.**
Reduced from the proposed 220 because the frame is call-bound, not fill-bound.

**Graceful degradation, not a cliff.** Today the 421st particle silently does not appear. A
quality scalar `q` recomputed once per frame **from measured frame time**, not from enemy
count, scales emission counts; priority-3 layers drop entirely below `q` 0.5; lifetimes scale
by 0.8 below `q` 0.7 so the pool drains. **When the pool is genuinely full, recycle the oldest
particle of equal or lower priority rather than refuse the newest**, because the newest impact
is the one the player is looking at. Every recipe declares per-layer minimums that survive all
scaling, so **an impact always produces something**. That guarantee is what lets the coin flip
at `js/game.js:354` (`Math.random() < 0.45` on the only impact particle in the game) die.
Inconsistent feedback reads as a bug, not as restraint.

**Migration.** `spawnPuff`, `spawnBurst` and `spawnBoom` (`js/game.js:549`, 565, 574) stay as
three-line shims onto `FX.play`, so all 66 existing emission sites keep working untouched and
nothing migrates in a big bang.

**Note for whoever builds it:** `js/camp.js` has its **own** particle array (declared
`js/camp.js:544`, cap 60, pushed at 950) and its **own** bake helper with its own `SS = 3`
(`js/camp.js:161-181`). An effects refactor that assumes one shared array will either miss
camp or break it.

**Fix before the first area-effect recipe:** `queryEnemies` (`js/game.js:604-622`) returns a
single shared `this._qbuf`. Nothing nests today, so it has never misbehaved. The first recipe
that applies an area effect from inside a damage handler will silently truncate whatever outer
loop is iterating the same array, and it will present as enemies randomly not taking damage.

### The recipe table

A recipe is a header (sound, hitstop, directional shake, one-frame light, decal) plus a list of
**layers**. Layer schema: `n, min, kind, spr, w, spread, bias, speed, life, grav, drag, rot,
vrot, scale, alpha, fadeIn, fadeOut, blend, layer, pri, settle`.

**Surface variants.** `FX.play` takes `opt.surface` of `flesh`, `wall`, `ground` or `none`, and
a recipe may override any layer per surface. That is what makes "when they hit the player or a
wall or whatever" one recipe rather than four.

**Gore variants.** Every recipe authors its **clean** layer set first. Gore is an optional
extra layer list, appended last, suppressed entirely when the toggle is off. Author clean
first, always, or the clean version ends up an afterthought and reads as missing rather than as
clean.

**Key on trait and stat, not on weapon.** `BUILD_ECONOMY_3.md` commits to a closed vocabulary
of 19 trait primitives, 18 stats and 12 hook events, plus 72 patches and 36 weapon forks. A
recipe table keyed purely by weapon has no row for a pierce-plus-bounce-plus-giant frozen
pebble. Lock the composition rule up front: **additive for particle layers, max-of for screen
effects, first-wins for the base projectile sprite.**

**Authoring support, not optional.** A debug key that fires every recipe in a labelled grid,
twice, once with gore on and once off, plus a **rotation row** and a **silhouette collision
row** (every species at idle and at telegraph pose, black fill, 40 px, all in one strip). There
is no typecheck for "looks cheap" and this contact sheet is the only gate the table will ever
have. It should reuse the sprite-artist's existing screenshot sink at `localhost:8399` rather
than inventing a second one.

### Weapon identity

The test: cover the HUD, mute the sound, freeze on one impact, name the weapon. Each weapon
gets one accent colour and, more importantly, one debris **shape**, because colour is the first
thing that fails at density.

- **Slingshot**: mineral, round grit. Impact throws 2 grit sprites at gravity 700 that bounce
  and settle, plus 4 pale dust dots on the ground layer, plus an 8-unit scuff decal.
- **Marshmallow Roaster**: heat, glow. **Fixes a real hole**: `js/game.js:858`, 886 and 907
  show `recoil` is set by only three weapons, so a flamethrower firing six times a second
  produces no kick, no muzzle glow and no light on the scout holding it, and the flame appears
  18 units in front of him unconnected. Give it a persistent additive light at the barrel and a
  dark smoke curl trailing on the ground layer, which is what makes a flame read as burning
  rather than glowing. Impact: no debris, a bloom, and a scorch decal that **darkens** on
  repeated hits in the same spot.
- **Hand Axe**: edge, long shards. 5 splinter sprites thrown **along the swing tangent**, not
  radially, which is what makes a cut read as a cut.
- **Firecrackers**: blast, fluttering flakes. Existing ring plus 10 charred paper scraps with
  **high drag and low gravity and high spin** so they flutter and hang. That is the opposite
  physics from every other weapon and instantly recognisable.
- **Compass Boomerang**: arc, line. A thin fading arc streak laid along the path, the only
  weapon with a persistent trail. On a kill it visibly staggers in flight for 0.08 s.
- **Whittling Knives**: shavings, curls. **This is not polish, it is a missing feature.**
  `js/game.js:795-810` spins the angle, computes orbit positions and does the hit test, and a
  grep for `knife` across `js/render.js` returns nothing. A shipped 2.0 weapon draws no art at
  all. Draw the baked knife at each orbit position rotated tangentially, add a faint arc smear
  between frames, and throw 3 wood-curl sprites on impact. **Fix this before any polish work
  so the polish is not built on a hole.**
- **Bug Spray**: vapour, haze. Currently a static disc that pulses 3 percent and emits nothing.
  Slow upward drift of green vapour on the ground layer, a rippling edge, one tiny fleck per
  tick.
- **Canteen**: wet, droplets. **Also fixes a hole**: `js/game.js:924-938` is the only weapon
  case with no `AudioSys.play` call at all. Add 6 droplet sprites that arc and land, plus a
  flat ripple ring. On a kill, the tin Token visibly rusts orange before it drops.
- **Camp Bugle**: sound, ring plus lifted dust (see the player section).

**Also fix while here:** three weapons produce **zero** feedback on a hit. Bug Spray, the
canteen puddle and the Ember Drag lane all call `dealDamage` with small, quiet and no knock, so
they emit no particle **and** suppress the hit sound. Every damage source gets at least a
one-particle tick.

**The Mark red is not available to weapons.** `#d4402c` (`js/render.js:8`) is the single most
valuable piece of visual grammar in the game: every telegraph and every stamped critter shares
it. But note honestly that the shipped game already breaks a strict version of this rule in
three places (`COLORS.max = '#c0392b'` at `js/reticle.js:11`, the HUD alert `#ff5b45` at
`index.html:65` and 71, and the elite ground ring at `rgba(220,60,40)`, `js/render.js:669`), so
the rule as written is: **no new effect, debris, decal or projectile may use a red within a
distance threshold of the Mark.** Enforce it in the recipe schema at authoring time.

**And add a per-screen colour budget**, because the one-accent rule caps colour per creature
and nothing caps it per screen. Weapon and effect accents come only from the ART_STYLE palette
anchors, never invented. Gold is already triple-booked (the ticktot's back dot, the badger's
rivets, the progress flash, the bugle ring) and should stay reserved for progress.

### World reaction

**No baked decal canvas.** Two designs proposed a second per-room offscreen canvas painted
into and never cleared. Rejected: on the largest room that is another 3 MB on top of the 53 MB
of ground and treeline that room already holds, its saturation guard needs a full-canvas
read-modify-write mid-frame, and **iOS Safari enforces a per-tab canvas backing-store budget**
and an evicted canvas comes back blank rather than missing. The free web build is the funnel
for the paid release and has to survive Safari.

**Instead: a capped live decal list**, drawn under the y-sorted cast in the same pass that
already draws puddles (`js/render.js:52-66`) and corpses (115-121). Cap 60, with a priority
ordering so tokens are never evicted before scorch and scorch never before dust, plus a global
decal alpha that falls as count rises. Sixty extra path fills on a frame that already does
about 1,100, zero new canvases, zero render-target switches, zero per-room memory.

`js/transition.js:22-24` wipes thirteen array fields at the room cut. **The decal list joins
them**: decals are room-scoped. And `Game.prototype.snapshot` (`js/game.js:1548`) is taken only
at the room swap and carries no enemy state, so per-enemy pose, gaze, clip clock and stillness
state need no serialising at all. Nobody should spend a day writing that.

**What persists:** tokens (whole room), scorch and char lanes (whole room), tunnel mouths
(whole room, cap 24), ash (whole room, low alpha), hoof prints and furrows and scuffs (4 to
40 s per the attack table), blood pools (gore layer only, 6 to 10 s), water puddles (unchanged).

**Foliage that parts: do not move the scatter.** Ground decoration is baked into the ground
canvas by `rdGroundScatter` (`js/render.js:1317-1338`), so it physically cannot react. Moving
it live costs 60 to 90 extra blits per frame, a third of the entire current frame, for an
ambient effect. Instead add a **separate small live list of about 24 reactive tufts**, placed
only along paths and inside telegraph-prone areas where the parting actually communicates
something.

**Water:** `RD.water` is a margin profile painted into the ground bake. Add ripples as ordinary
ground-layer ring particles triggered on entry, which needs no change to the bake at all.

### Light

**Step one pays for itself immediately and should ship regardless of everything else.**
`js/render.js:741` constructs a fresh `createRadialGradient` **per eye, per enemy, per frame**:
180 gradient objects a frame, about 10,800 a second at 90 enemies. Three more of the same
pattern at lines 175, 208 and 271. Bake the radial falloff once into a small canvas per colour.
There are exactly two colours in the eye block (the red at `rgba(255,60,30)` and the pale for
THE BEHIND), so bake two and no more: a per-colour disc cache is the same trap as `tintOf`.

State it honestly as a **swap**: it removes 180 gradient allocations and 180 gradient
rasterizations per frame and adds 180 small blits. The blit counter goes up and the frame gets
cheaper. Sequenced after the viewport cull the blit count is far lower and the objection never
arises.

**Step two, the light layer.** `FX.light(x, y, r, colorId, a)` for one frame, `FX.lightPulse`
for a decaying one. Budget 16 lights per frame, radius capped at 220 world units, 16 blits.
Muzzle flash on every firing weapon, firecracker detonations lighting the ground, every burning
critter carrying a small flickering light (replacing the two hardcoded additive arcs at
`js/render.js:719-729`), the campfire, and boss telegraphs casting a growing glow.

**Step three, a real light buffer: not now.** Rendering all lights into a half-resolution
offscreen canvas and compositing would let the night go genuinely darker and let fire and
muzzles be the only things that reveal the ground, which is enormous for eerie. The cost is
affordable. It is deferred because it is an **art direction** change, not an effects change: it
alters how every room reads, risks mud at 90-enemy density, and wants to be judged against the
baked five-level lighting in every sprite rather than slipped in as a technical improvement.

**One more free win nobody found.** `renderRoomOverlay` (`js/render.js:1789-1802`) constructs
**two** fresh full-screen radial gradients every frame and fills each across the whole viewport,
breathing on a sine with an alpha amplitude of only 0.011 to 0.02. That is two full-screen
gradient rasterizations plus two allocations per frame, and on a phone it is plausibly the most
expensive single thing in the frame. Bake both into one offscreen canvas per room beside
`RD.ground` and blit it under `lighter` with `globalAlpha` carrying the breathe. About ten
lines. **This is a guess** as to its relative cost, because nothing has been measured, but it is
cheap enough to just do and check.

### Screen-level effects

**HITSTOP.** There are exactly eight callers today and **not one is a hit or a kill**
(`js/director.js:371`, 910, 1238; `js/game.js:285`, 305, 492, 509; `js/room.js:765`). Killing a
critter, landing a crit and connecting an axe swing all produce zero time distortion.

| Event | Duration |
|---|---|
| Hit, under 8 percent of maxhp | 0 (flash only) |
| Hit, 8 to 25 percent | 0.020 |
| Hit, over 25 percent, or crit | 0.045 |
| Kill, trash | 0.030 |
| Kill, trash, overkill (damage at least 2x remaining hp) | 0.050 |
| Kill, elite | 0.090 |
| Kill, boss | 0.300 (none today) |
| Player hurt | 0.070 (none today) |
| Player hurt over 25 percent | 0.130 |
| Dodge through an attack on iframes | 0.100 (new, rewards the skill) |

Existing ceremony values unchanged. **Two rules keep it safe and are load-bearing, not
refinements:** take the **max** of everything requested in a frame, never the sum; and carry a
hitstop debt that decays, clamping total frozen time to about 0.25 s in any rolling second.
Without the debt clamp, a roaster ticking twelve critters at 6 Hz stutters the game into
unplayability and this feature is a net negative.

**Co-op decision, made now because it is free now and expensive later** (backlog task 29):
hitstop is a **global** freeze requested by any player and resolved as a max, and camera
push-in is per-viewport and therefore does not exist in co-op. The API takes an owner from day
one. Also generalise the `ghost` particle to take a draw callback rather than hardcoding
`SPR.drawScout` (`js/render.js:264`), since that same change is what lets a critter leave an
afterimage.

**SHAKE.** Today `js/game.js:1236-1237` is pure `rand(-1,1)` on both axes: chaos, not force.
Replace with a direction vector plus a 25 percent perpendicular jitter. Weight classes set
frequency and decay, and **frequency goes down as weight goes up**: light 1 to 3 at 11 Hz
decaying in 0.09 s, medium 3 to 8 at 8 Hz in 0.16 s, heavy 8 to 16 at 5 Hz in 0.28 s.

Landed hits and trash kills shake by **zero**: far too frequent. Elite kills 2 light directed
away. Boss kills 9 heavy (exists). Axe connecting on 3 or more, 1.5 light along the swing.
Player hurt 3 medium **along the incoming attack vector**, 6 heavy for a big one. A charger
connecting, 4 medium along the charge. The existing clamp of 14 (`js/game.js:543`) stays: it is
what stops shake stacking and it was already right.

**FLASH.** Keep `hurtFlash` and `bossFlash`. Raise `flashGold` from a peak of 0.126 to about
0.22, because the loudest gold moment in the game is currently almost subliminal. Add a
**directional hurt vignette**: darken the screen edge on the side the hit came from instead of
only washing the whole frame red. More information, less full-screen luminance. **No new
full-screen white flashes, ever.**

Make the vignette a canvas layer rather than the static CSS div at `index.html:13-17` and 441:
baked once, drawn at variable alpha and radius, tighter and darker at low HP and during a boss.
One blit per frame, and it is the cheapest tone tool in the document.

**ZOOM.** Boss entrance 1.0 to 1.06 over 0.5 s, hold, release over 1.2 s. Boss death 1.0 to
1.10 over 0.25 s, hold 0.6 s, release. Player death 1.3 (exists). **Nothing else.** A
survivors-like with 90 enemies must never pump the camera per kill.

**Hard prerequisite:** `js/reticle.js:52-53` and 355-357 transform by the bare `ZOOM` constant
while the camera at `js/render.js:43` uses `ZOOM * this.zoomF`. Any new combat zoom immediately
exposes a reticle that lies about where your firecracker lands. Two lines, and it must land
before the zoom table.

### DIEGETIC TELEGRAPHS, and the resolution

Teddy asked for this by name: the ground shaking where an attack will land instead of a red
border. It is the right instinct and it collides with two things. Here is the resolution.

**Every telegraph carries three channels, always. What changes with conditions is their
relative weight, never their presence.**

**CHANNEL A, THE BODY (pose).** The creature's own anticipation, computed in the gait block,
ramp-then-hold. **Never removable, never scaled, by anything.** This is the only channel that
survives both a ninety-body crowd and a reduced-motion setting, because a held pose is not
motion and it is attached to the thing you are already looking at.

**CHANNEL B, THE WORLD (diegetic).** The thing Teddy asked for. Dust lift, ground heave, grass
flattening outward, water rings, ash stir, a growing shadow. All ordinary ground-layer
particles plus the 24 reactive tufts, so it needs no new rendering path.

**CHANNEL C, THE EDGE (geometric precision).** The exact danger area drawn as a **thin
Mark-red outline, 1.5 px, no fill**. Today the charge lane at `js/render.js:86-87` is a
0.16-alpha filled red rectangle: a fill is what makes this read as a free browser game, an
outline is what makes it read as precise, and an outline survives overlap where a fill does
not. **Shape-coded, not colour-coded**: circle lands here, cone sweeps this way, lane runs
through, ring expands out.

**Where the line falls, exactly:**

1. **The world channel only exists for anticipations of 0.60 seconds or longer.** Dust that
   lifts and settles inside a third of a second is noise, not information. Every CHIP-tier
   attack in section 4 gets body plus edge and no world channel at all. This is not a
   compromise; it is why the ticktot's tell is one rotation and the elk's is a ring of rising
   ash.
2. **The world channel is never the sole carrier of a read.** If the body pose and the edge
   were both removed, the attack would still be unreadable. Every row in section 4 obeys this.
3. **Under density**, compute a `telegraphLoad` from the number of live telegraphs. One live
   telegraph gets the full show; eight get about 30 percent of channel B. And **only the eight
   telegraphs nearest the player draw channel B at all**; the rest keep body plus edge.
   Channels A and C never scale down.
4. **Under reduced motion**, channel B loses its **motion** and keeps its **value**: the grass
   does not flatten and the dust does not lift, but a static dust tint sits inside the shape and
   the ground inside it darkens by a scalar. Luminance survives every theme and every form of
   colour blindness. Channel C thickens from 1.5 to 2.5 px and gains a 2 Hz alpha pulse, which
   is under the photosensitivity floor and is a thin line, not a full-screen change.
5. **Fast attacks** (windup under 0.5 s) get channel A plus **one sharp diegetic beat at the
   start**, not a build, because there is no time for a build to read. Slow attacks get the full
   ramp, and channel C only brightens in the last 25 percent, which is the moment precision
   matters.
6. **The ground channel is never the only channel**, full stop, for a reason nobody raised:
   `js/touch.js:107-108` puts the move stick at `min(RADIUS + EDGE, w * 0.28)` and
   `min(h * 0.72, h - RADIUS - EDGE)`, with the aim stick mirrored and a 42 px dodge button up
   and inboard. On a 375x812 phone two thumbs and that button cover the bottom third and both
   lower corners, and `.claude/agents/release-gate.md` area 6 says landscape phones at 812x375
   are the common case, where the sticks sit 270 px down and the thumbs cover the ground almost
   up to the player. **The world channel is act-scale atmosphere, not per-attack readability.**

**What this fixes beyond aesthetics.** Exactly one enemy in the game has a redundant-channel
telegraph: `ai.telegraph` is assigned in one place, `js/director.js:1582`, inside the stag.
Boar and ashelk hit for 20 and 19 with a 0.45 s windup whose only tell is a 3-degree body
tremble plus a red exclamation mark competing with fifteen other bodies bobbing at similar
amplitude.

**And retire the exclamation mark.** `js/render.js:749-757` draws one red `!` glyph above the
head for every windup in the game. It is a text glyph doing the communication work the body
should be doing, it is the same for every creature, and in a game repositioned around stillness
and posture as the sources of unease it works directly against the direction.

### Accessibility: non-negotiable

`js/ui.js:11` is the entire settings object: `musicVol`, `sfxVol`, `voiceVol`, `shake`,
`dmgNums`, `subtitles`. Six keys, none about motion, flash or violence. And a grep across
`index.html` and all of `js/` returns **zero** matches for `prefers-reduced-motion`,
`prefers-contrast`, `aria-`, `role=` or `tabindex`. There is no reduced-motion setting **and**
no respect for the operating system's own setting, on a UI that is entirely DOM.

**Four new keys:**

- **`motion: 'full' | 'reduced'`.** Reduced multiplies shake by 0.15 (not zero: a tiny
  directional nudge is information about where a hit came from), disables all zoom, **keeps 60
  percent of hitstop** (hitstop is timing information, not vestibular motion, and should not be
  stripped like camera movement), scales particle counts to 0.6, and switches telegraph channel
  B from motion to value. The existing `shake` boolean folds in as a legacy alias.
- **`flash: 'full' | 'reduced'`.** Caps every full-screen fill at 0.10 alpha, replaces the white
  hit-flash silhouette with a 2 px white **rim stroke** (which reads better in a crowd anyway),
  and replaces the boss phase-guard strobe with a steady overlay.
- **`gore: 'off' | 'on'`.** **Build the toggle before the gore**, or the gore ends up
  load-bearing by accident, which is the exact failure the doctrine warns about. See open
  question 1 for the default.
- **`fxDensity: 'high' | 'medium' | 'low'`.** A manual floor on the quality scalar for weak
  machines. Labelled as **performance**, not comfort.

**Read `prefers-reduced-motion` at boot and seed the setting from it**, then let the player
override. That is what protects a player who never opens the options screen.

**Both settings must be reachable from the pause menu**, not only the title screen, because the
player who discovers they need reduced flash discovers it mid-fight.

**Hard photosensitivity rules, absolute, enforced at the `FX.flash` entry point so no caller can
violate them:**

- No full-screen luminance change may repeat faster than 3 Hz. **The game violates this today:**
  `js/render.js:713-717` strobes a boss's white silhouette at 8 Hz
  (`Math.floor(this.t * 8) % 2`), which at boss size is a large-area flicker sitting inside the
  3-to-30 Hz risk band. Replace with a steady 0.35 white overlay or a 2.5 Hz ramp. **Fix this as
  a standalone one-line safety change regardless of what else ships.**
- No single-frame full-screen alpha step above 0.25. Ramp instead.
- Nothing deep red may flicker full-screen. `bossFlash` is a 1.0 s decay ramp, which is fine,
  and it must stay a ramp.
- The once-per-run synchronised whole-room blink (section 6) is by construction a whole-screen
  luminance change. It survives only as a **fade**, never a cut, and ordinary blinks must never
  sync: the per-instance interval drift is what keeps 90 bodies from accidentally settling into
  a strobe.

**Also add a colour-blind pass to the contact sheet.** The elite ground ring
(`js/render.js:669`, `rgba(220,60,40)`, within a few points of the Mark), the corruption rim
(`js/render.js:1542`), the marked-door thorn tips (`js/room.js:866`) and the reticle's
per-scout colour all carry meaning in colour with no shape partner. A red-green simulation on a
Mark-red-heavy game is a five-minute check that nobody has ever run.

### Audio sync, stated once for everyone

**Every new enemy cue uses `AudioSys.playAt` at the creature's position, never `play`.** The
positional engine is finished and has **zero call sites**: `playAt` and `emitter` are exported
at `js/audio.js:664` and called nowhere, and `setListener` has exactly one caller
(`js/game.js:748`). All 116 existing `AudioSys.play` calls are centre-panned at full volume
regardless of distance. Adding twenty attack cues on top of that makes the game measurably
worse.

**The sync rule.** The tell's sound fires on the **first frame of anticipation**. The impact
sound fires on the **contact frame**. Nothing plays during the hold. Where a pose and a sound
coincide, the pose leads by exactly one frame.

**Gate the pass on a LUFS re-measure**, not by ear. The audio branch already built a validated
BS.1770 analyser and measured the busiest fight at -25.52 LUFS against a -18 target
(`AUDIO_2.1.md` on `v2.1-audio`). Twenty new cues will move that number.

**And fix the roaster while there:** it fires every 0.16 s and plays a 0.18 s one-shot. The fix
(`hold('flame')`, a refcounted sustained voice at `js/audio.js:326`) exists and has zero call
sites.

---

## 8. THE BUDGET

**Draw calls.** Today, busy act 3 room, 90 living enemies, counted from code paths: about 210
`drawImage` plus about 1,100 path, fill and text operations. After everything in this document,
before the viewport cull:

| Item | Delta |
|---|---|
| Baked eye glow (swap) | +180 blits, -180 gradient allocations, -180 gradient rasterizations |
| Live stroke parts (about 8 of 21 species carry any, and only in an attack window) | +about 60 path operations |
| Live arm on the player | +4 path operations |
| Sprite particles (capped at 40 in frame) | +40 blits, replacing arc fills |
| Decal list | +up to 60 path fills |
| Light layer | +16 blits |
| Baked room overlay gradient | -2 full-screen gradient rasterizations, -2 allocations |
| Particle batching by blend mode | -about 500 canvas state operations |

Net: roughly +240 blits and roughly -400 operations, before the cull.

**With the viewport cull, which is a hard prerequisite:** `js/render.js:125-135` pushes every
enemy into the y-sort with no viewport test. A desktop viewport at 1280x800 CSS and ZOOM 1.5 is
about 853 by 533 world units, so a typical 1100x750 room is roughly 55 percent visible and 90
enemies becomes about 50. A **phone** viewport is about 250 by 541 world units, so the same room
is about 16 percent visible and 90 becomes about 15. Because the cull sits **before** the zbuf
push, it also removes, per culled enemy, the zbuf object, the sort entry, the gait arithmetic,
the pose object, the eye position arrays and the eye blits.

**The cull is worth about five times more on a phone than on a desktop**, and it buys back more
than everything in this document costs. Five lines. Build it first.

**Allocation.** Roughly 1,285 objects and strings are allocated per frame today at 90 enemies,
and particles are the **smallest** contributor at about 4. The top four are `eyePositions` (270:
one out array plus one pair array per eye, `js/sprites.js:4725-4738`), the spatial hash string
keys (about 230, `js/game.js:590`), `queryEnemies` string keys (about 200, `js/game.js:612`),
and gradients (about 190). Fix all four in one small unit: a module-level reused out array with
reused pair slots, an integer key (`cx * 4096 + cy`) at both hash sites, a reused zbuf array at
`js/render.js:125`, and hoisted comparator and path closures. Under 30 lines, zero behaviour
change, and it removes roughly 900 of the 1,285.

**Memory.** No baked part rigs means the sprite atlas does not grow. Additions: 32 debris rot
strips at 16 frames of about 12x12 logical at supersample 3, which is 663,552 device pixels =
2.53 MB across **32** canvases (a strip is one canvas, not sixteen); two baked eye glow discs
plus about six light discs, under 0.5 MB; one baked room overlay canvas per room. For scale, the
whole existing sprite atlas is about 13.4 MB, and **one room's dressing bake is 17.2 MB for the
smallest room and 53.2 MB for the largest** (`js/render.js:767-770`, `RD_S` 1.5, `RD_PAD` 170,
`RD_BLEED` 26). Any memory objection to this design would be dishonest.

**Canvas count** goes from roughly 168 live to roughly 210. Under 1.25x. That is the number
Safari cares about, and it is why the baked decal canvas was cut.

**Phone verdict.** At 375x812 CSS with DPR capped at 2 (`js/ui.js:85`), the backing store is
1.218 megapixels, so the six full-screen operations that run before a single critter cost about
7.3 megapixels a frame, while all 90 enemies cost about 0.77 megapixels because sprite size is
world-space. So enemies go from about 3 percent of the frame's fill on desktop to about 9.5
percent on a phone. **The phone is bound by full-screen fills and by the fact that it draws 84
percent of its critters into a viewport that cannot see them.** The cull plus the baked overlay
gradient plus the allocation cleanup are worth more on a phone than every animation item here
costs. This design should be net positive on a phone. **That is a prediction, not a
measurement**, and step zero of the build order is the instrument that settles it.

### The frame budget rule, binding on all future work

**Per entity:** an on-screen enemy costs **one** baked blit for its body, plus at most **one**
more inside a flash or attack window, plus at most **12 live path operations**, plus **two**
eye blits. Anything that wants more must first show a measurement.

**Per frame, busy room, measured at 1920x1080 DPR 2 in the busiest state the game can produce:**
under 300 `drawImage`, under 1,400 path/fill/text operations, under 500 allocations, and **p95
frame time under 16.7 ms**.

That last number is the one to fight for. `.claude/agents/release-gate.md` area 5 already
mandates the measurement (average, p95, worst, count over 16.7 ms, out of at least 300 frames,
at three resolutions) before any deploy, but it says **report**, not **fail**. Propose the p95
threshold as a gate amendment, so the next fifty performance arguments in this repo are settled
by a number instead of by arithmetic.

---

## 9. WHAT WE ARE NOT DOING

Everything below was proposed and is cut, so nobody re-proposes it.

1. **Baked part rigs, on trash, bosses or camp.** Section 3. The rim light breaks at 4.6 to
   11.9 degrees, in-plane rotation cannot turn a fixed-view head anyway, and the white flash
   would need 900 offscreen render-target switches a second. Deferred, not forbidden: see open
   question 3.
2. **Rain World soft bodies.** Every creature there is a chain of point masses with meshes
   generated per frame, and the art direction was designed around what that can draw. Our body
   is one baked bitmap with baked five-level lighting and painted fur clumps. We cannot deform it
   without destroying the exact thing our art is good at.
3. **Dead Cells style pose variants, in 3.0.** Baking a second and third canvas per painter for
   gather and strike poses is genuinely reachable (everything bakes once, so runtime cost is
   zero) and would give real attack poses with correct anatomy. It is deferred because it
   multiplies load-time bakes, white caches and tint caches linearly, and because the pose
   channel plus live strokes covers the attack table without it. Open question 3.
4. **A baked per-room decal canvas.** Section 7. Safari backing-store eviction plus mid-frame
   render-target switches. Replaced by a capped live decal list.
5. **A real light buffer.** Section 7. Affordable, but it is an art direction change that must
   be judged against the baked sprite lighting, not slipped in as a technical improvement.
6. **Per-kill screen shake and per-kill zoom.** The single most likely mistake in an impact
   pass. A bugle clearing thirty critters becomes a seizure of camera motion.
7. **Full-screen white flashes on hits.** Twelve simultaneous flashes merge into one white field
   at the exact moment a player needs to count survivors.
8. **Bloom or glow on enemy bodies.** Additive over 90 bodies destroys the outline contract the
   entire art style rests on. Additive belongs to particles, projectiles and lights, never to a
   creature's silhouette.
9. **Motion trails on enemies.** 90 extra blits and a smeared field where silhouettes must stay
   hard. The dodge afterimage is fine because there is exactly one player.
10. **Chromatic aberration.** Three offset full-screen composites per frame in Canvas 2D, and
    against 2.4-weight outlines it reads as a rendering fault rather than a style.
11. **Global colour grading or a coloured field tint.** Collapses the one-accent-per-creature
    system that is what stops a crowd reading as noise.
12. **Screen-space distortion (heat haze, shockwave warp).** Needs `getImageData` /
    `putImageData` or repeated slice blits. The one category here that genuinely will drop
    frames.
13. **Persistent smoke or fog volumes over the play area.** Any large soft shape over the fight
    hides enemy projectiles.
14. **Any particle above enemy projectiles.** This is a bug the game **has today**
    (`js/render.js:205` draws enemy shots, 243 draws particles over them) and the new system must
    never reintroduce it. Enemy shots are the sacred layer.
15. **More damage numbers.** Capped at 80 and the cap does not rise. Aggregate damage-over-time
    ticks into one rolling number per enemy.
16. **Tint driven by a continuous value.** `tintOf` (`js/sprites.js:4687-4701`) keeps a
    four-colour FIFO per sprite and is safe today only because three call sites pass three
    constant colours. A damage ramp, a per-act palette shift or a per-enemy variation colour blows
    past four live colours and then allocates a fresh full-size canvas plus a `drawImage` plus a
    composite fill **every frame, per sprite**. Damage-type feedback goes in the additive overlay
    pass, never in `tintOf`.
17. **Rabbit ears laid flat back**, and **the fox's tail going vertical.** Section 4. Both
    subtract the species' named silhouette tell during the exact window a player must name the
    threat, and both collide with another roster member.
18. **The bog frog's tongue pulling the player.** That is a balance change (chip attack to
    positioning attack) wearing animation clothes. Open question 4 if Teddy wants it.
19. **MAWMOLE and THE BEHIND.** Section 4. Content decision first. Open question 5.
20. **Per-species breathing frequencies in the woods.** Spends the stillness budget without
    knowing it. Per-instance amplitude jitter only.
21. **Weeping-angel "moves when unobserved" behaviour.** Section 6. The camera is welded to the
    player and the game cannot know where the player's eyes are.
22. **Pupil tracking on trash.** A squirrel's pupil slit is about 1.5 CSS pixels wide. Bosses and
    camp only.
23. **Camp animation, in this pass.** `js/camp.js` is 3,743 lines with its own bake helper, its
    own particle array, its own camera and a fully staged five-stage NPC (Blink, `js/camp.js:1142`
    and 1237), and `CAMP_DESIGN.md` already owns it with its own tier list. **This document is
    scoped to combat.** Camp also has no moment vocabulary at all (a grep for shake, hitstop,
    flash and zoom across `js/camp.js` returns zero hits for all four), and backlog tasks 23, 25,
    26 and 33 all need somewhere to land. That is a separate design, reconciled with
    `CAMP_DESIGN.md`, not written beside it.

---

## 10. THE BUILD ORDER

Every wave is shippable on its own.

### WAVE 0: the gate. Nothing else starts until this is done.

- **Land the substrate merge** (`BUILD_ECONOMY_3.md` unit U1). It ships dark and settles
  `js/game.js`, `js/dodge.js`, `js/render.js`, `js/data.js` and `js/director.js`. Decide the
  audio branch next. **Every animation brief from here carries the branch state and an explicit
  "do not touch `js/traits.js`, `js/hooks.js` or `js/audio.js`".**
- **Write `.claude/agents/animator.md`** (section 11). This is the cheapest item in the document
  and it decides whether the other 2,000 lines are safe to hand to a cheap model.
- **The frame timer**, run through `release-gate.md` area 5 rather than as a bespoke debug key,
  plus a live enemy count, particle count and blit count behind a debug key. Take the baseline at
  90 enemies **before** anything else lands, on desktop and on a phone.

### WAVE 1: free wins and existing bugs. A day. Nothing new is drawn.

- The viewport cull (`js/render.js:125-135`). Five lines, the biggest single win here.
- The allocation cleanup: `eyePositions` out array, integer spatial-hash keys, reused zbuf,
  hoisted closures. Under 30 lines, about 900 of 1,285 allocations gone.
- Move enemy shots **above** particles (a block move).
- Fix the 8 Hz boss strobe (`js/render.js:713-717`), a safety fix.
- Fix the reticle zoom desync (`js/reticle.js:52-53`, 355-357).
- Apply `o.rot` in `eyePositions`.
- Bake the eye glow disc and the room overlay gradient.
- The cindercrow gait key: `move === 'sine'`, not `e.spr === 'bat'`.
- The `queryEnemies` shared buffer.

### WAVE 2: the pose channel and the feel pass. Changes how every second feels.

- Pivot in `SPR.draw`, pose object in the gait block. **Fixes the existing feet-slide bug.**
- Facing split with hysteresis (`js/director.js:2181`). **Prerequisite for every lean and
  anticipation in section 4.**
- Hit reactions, five axes, plus the absorbed hit.
- Hitstop table with the max rule and the debt clamp. Directional shake. Zoom table.
- The density governor from measured frame time, replacing the hard caps and killing the 45
  percent spark coin flip.
- The four settings keys plus `prefers-reduced-motion` at boot, plus the pause-menu rows.
  **Build the gore toggle here, before any gore exists.**

### WAVE 3: the cheapest telegraphs, from data that already exists.

- Bog frog inflate (one squash ramp on `puffT`, which is already set and ticked).
- Quarry badger plating state (`e.guarding` already runs a full shift).
- Fox crouch (the AI already holds it 1.2 s and the comment already calls it the tell).
- Chipchoir shared bob phase.
- Ticktot quest, doe strike, bat buzz. Stillness lands here.
- The gaze state machine and blink.

### WAVE 4: the effects core.

- `js/fx.js`: pool, three layers, rot-strip sprite particles, settling.
- `js/fxdata.js`: the recipe table, keyed on trait and stat.
- The contact sheet debug key posting to the existing sink.
- **The owl end to end, as the reference implementation.** Nothing else in section 4 gets
  authored until the owl passes all four of Teddy's criteria.
- Decal list, the tin Token drop, and the death layers.
- The live stroke helper.

### WAVE 5: the remaining roster.

The other nineteen creature rows, ordered by **pool weight**, not by how fun they are to
animate: squirrel (100), ticktot, cindercrow, rabbit, doe, owl, bat before beaver, heron and
puffer. The library's own red flag is spending variety budget on rare content while the
high-exposure loops stay robotic.

### WAVE 6: the player and the three bosses.

Player arm, hit reaction, dodge rim and tuck, Gus's barge, backwards walk, win pose, the death
stars. Then BRAMBLEBUCK's shadow (the biggest single fix), THE TALLYMAN's ledger, OLD NOBODY's
procession and hollowing.

### WAVE 7: separate designs, not this one.

UI motion (`index.html` has exactly **one** `@keyframes` and seven transitions; `showLevelup` at
`js/ui.js:1028` clears a row and appends three cards with no entry, stagger, commit or exit, on
the most-seen decision screen in a roguelite). Elites (`js/director.js:170-182` gives them 9x hp,
1.5x size, the same sprite and the same gait, and their entire identity is a pulsing red ground
ellipse; they are the only body that is both common and long-lived, which makes them the highest
value target left). A camp practice area for the dodge (a grep for practice, dummy or target
across all of `js/` returns nothing). Camp motion, reconciled with `CAMP_DESIGN.md`.

---

### THE HARD SEQUENCING FLAG

**Nothing in this document blocks the 3.0 art density pass (backlog task 27), and that is
deliberate.**

The four designs all forced the opposite: their part-rig plans required every one of the 36
creature painters to be split before any new costume detail was painted, or the detail would be
painted into a monolithic block and then have to be sorted by hand. That would have made task 27
wait on this document, and painting a sprite twice is the most expensive mistake available.

**Because we are not splitting bakes, the density pass and the motion pass touch different
things.** Density adds costume and prop detail inside existing painters. Motion adds live strokes
over the top and moves the whole body. They can run in parallel on different species.

**Three exceptions, and they are the only ordering constraints:**

1. **The Token painter must land before the density pass touches `pendant`**, because the
   standalone token sprite has to match whatever the worn token becomes.
2. **A species that gets a live stroke part must have that part's anchor point registered before
   the density pass repaints that area**, or the anchor drifts. Practically this means: when a
   species is scheduled for both, do the motion row first, and it is one line in the painter.
3. **Section 11's additions to `sprite-artist.md` must land before the density pass starts**, so
   every painter touched by density is authored motion-ready.

Everything else is genuinely independent.

---

## 11. HOW THIS CHANGES THE HOUSE ARTIST

`.claude/agents/sprite-artist.md` is the file an agent loads when it paints. It currently has no
concept of motion at all. Below is exactly what to add. **Do not let a painter ship without it**,
or every new critter arrives unable to animate and has to be reopened.

Also amend `ART_STYLE.md`: the "Adding a new critter" checklist item 4 currently reads that a new
gait is "built from rotation, squash, and hover only". That is now wrong in one direction (the
pose channel is wider) and right in another (baked forms still do not rotate independently). It
needs rewriting deliberately and in writing, not quietly outgrown.

### Add to `.claude/agents/sprite-artist.md`, after the five laws

    ## Painting for motion (added 2026-07-28, see MOTION_DESIGN.md)

    Creatures move. What you paint decides what can move, so decide it while you
    paint rather than leaving it to be discovered later.

    THE ONE RULE THAT DECIDES EVERYTHING: a form drawn with shadePass (through
    apoly or blob) carries baked lighting at a fixed angle, including a hard rim
    stroke. It CANNOT rotate independently of its neighbours. On a boar-sized body
    the rim visibly breaks at about 5 degrees; on a small ear, about 12. A form
    drawn as a flat stroke or a flat fill carries no baked light and can move
    freely. That is the whole distinction.

    So there are two kinds of thing in a painter:

    1. THE MASS. Everything through apoly, blob or shadePass. Head, chest,
       haunch, snout, wings as forms. Baked into the sprite. Moves only as a
       whole body, through squash, stretch, offset and a rotation about the feet.
       Paint it exactly as you do today.

    2. LIVE PARTS. Thin things that can be a stroke or a small flat fill: a neck,
       a foreleg, an ear, a tail tip, a tongue, an antenna, a strap, a lashed-on
       bedroll. These are drawn live over the baked body every frame, the way
       drawScout already draws the scout's legs (js/sprites.js:4763-4791).

    WHAT YOU OWE A LIVE PART, and it is three lines of work:

    - Do NOT bake it into the sprite if the task says it animates. Bake the body
      without it, exactly the way the scout torso bakes without legs.
    - Register its anchor on the bake, the same way demonEye registers eye
      positions: part(eyes-style list, x, y) at the point where it joins the mass.
    - State its rest geometry (points and stroke widths) in your report, so the
      motion brief can drive it without re-deriving your drawing.

    A painter that declares no live parts bakes and draws exactly as it does
    today. There is no flag day and nothing to migrate.

    WHAT NEVER BECOMES A LIVE PART: a head. Heads are painted three-quarter
    forward with both eyes and the snout on-axis, so rotating one in the image
    plane reads as a tilt, not a turn. A head that needs to look at the player
    does it with its EYES, which the renderer already draws live. Paint the eyes
    to carry that: the glow offsets toward the look direction, so eyes near the
    silhouette edge of the head read best.

    EYE REGISTRATION IS ARTIST DATA. demonEye now records position, radius and
    the head's lid tint. The renderer scales those; it never equalises them. A
    creature may register one eye (the quarry badger has one, the other side of
    its plate is empty), or two of different radius at different heights (the
    stiltheron, which is deliberate proportion drift), or three. Never write a
    painter that assumes a pair, and never "fix" an asymmetric pair.

    THE ACCENT DOES TELEGRAPH WORK. One saturated accent per creature still
    holds, and it is now load-bearing twice: it stops a crowd reading as noise,
    AND it is the thing that brightens, swells or dims when the creature is about
    to attack. Paint the accent somewhere a change to it is visible at 40 px, on
    the part of the body that moves during the wind-up. The ashelk's ember seams,
    the bog frog's throat sac, the badger's brass rivets and the ticktot's gold
    back dot are the references.

    SILHOUETTE IS STILL THE CONTRACT, AND ANIMATION CAN BREAK IT. A pose may ADD
    to the outline. It may never SUBTRACT the species tell named in ART_STYLE
    rule 6, and it may never move the outline into another roster member's read.
    Ears laid flat make a rabbit read as a frog; a crouched fox with a vertical
    tail reads as a squirrel. Both fail during the exact half second the player
    must name the threat.

    THE SCAVENGED GEAR IS THE BEST LIVE PART YOU HAVE. Worn-wrong is number 2 on
    the wrongness ordering above, and gear is the one thing on a critter that is
    legitimately separable: it is not the animal's anatomy and it does not need to
    share the body's baked light. Paint one scavenged item per species as a live
    part with an anchor, and it will swing, lag and settle a beat behind the body,
    which is what makes gear read as taken from someone rather than as costume.

### Add two rows to the verification loop

    4. Stress modes: squash 0.8, flip, white flash, tint. All must read.
    4b. ROTATION ROW: render every form that the task says will rotate, at its
        maximum authored angle, beside its unrotated neighbours. This is the only
        test that catches a baked rim disagreeing with itself. If a rim breaks,
        the form is not a live part and must be redrawn as a stroke.
    4c. SILHOUETTE COLLISION ROW: every creature at idle AND at each of its
        telegraph poses, black fill, 40 px, in one strip beside the whole existing
        roster. Reject any pose whose outline is confusable with another species.

### Add one line to the hard rules

    - Everything bakes once: spend hundreds of draw ops freely, runtime cost is
      zero. But a LIVE part is drawn every frame, so keep it under about six path
      operations and never give it shadePass, a rim or a closed apoly outline.

---

## 12. OPEN QUESTIONS FOR TEDDY

**1. Should the free web build default gore OFF?**

Recommendation: **yes, gore off by default on the web build, and prompt once on first launch of
the Steam build.** The web build is the funnel and it is the version teens meet first, and the
doctrine's own rule ("if the toggle can remove it, it cannot be load-bearing") is only enforceable
if the default state is the clean one and somebody actually plays it. Every attack, death and
impact in this document is authored clean first for exactly that reason.

Alternative: gore on by default everywhere, with the toggle in settings. That is the more
conventional choice and it makes the game look more like what it is on a first screenshot, at the
cost of the clean pass never getting real playtime and therefore quietly rotting.

**2. The stillness budget: four named placements, or per-species?**

Recommendation: **four, named, and written into this file.** Room entry, the bog frog wind-up, the
doe's strike, and one boss phase change. Stillness only works because all fifteen default-gait
species breathe on one identical sine, and every extra use spends that. Three species that go
still is a mechanic; one is a moment.

Alternative: let each species that wants it have a still beat. Cheaper to write and it will make
the first five minutes feel richer, but by act 3 stillness will mean nothing and the room-entry
beat will not land.

**3. Do we fund baked pose variants for the three bosses in a later pass?**

Recommendation: **not in 3.0, and revisit after the effects layer ships.** Because everything
bakes once, calling a boss painter with a pose argument to produce a second and third canvas
(neutral, gather, strike) is genuinely cheap at runtime and would give real attack poses with
correct anatomy, including the head turn this document says no to. It is deferred rather than
refused because the pose channel plus live strokes covers the attack table without it, and
because a boss painter dependency exists first anyway (THE TALLYMAN currently uses the plain
raccoon sprite, `js/data.js:209`, so a 5000 hp boss and an act 2 trash critter are the same
drawing).

Alternative: fund three extra bakes per boss now, in wave 6. About nine new painter variants and
a linear increase in load-time bakes, white caches and tint caches.

**4. The quarry badger's plating: keep it direction-free, or make it a front arc?**

Recommendation: **keep it direction-free and just make it visible.** The code comment at
`js/director.js:820-823` says the shift is direction-free on purpose so it reads from any angle,
which was a deliberate call, and the whole problem is that the timing information never reached
the screen. Drawing the shift fixes it without touching balance.

Alternative: make it a 140-degree front arc keyed to facing, so flanking beats it. The sprite
genuinely argues for this (the tin plate is strapped over its **face**, with one eye burning
through a slot and the other side empty, `js/sprites.js:1408-1425`) and it would turn a timing
puzzle into a positioning puzzle. But it is a balance change, not a visual one, and it needs a
play pass.

**5. MAWMOLE and THE BEHIND: do they ship?**

Recommendation: **decide before any art time is spent, and if the answer is "not yet", leave them
entirely out of the animation budget.** Both have complete phase machines, spawn wiring, a baked
sprite and dedicated music tracks, and neither appears in `DATA.bosses` or `DATA.bossTiers`, and
nothing anywhere pushes to either array. A player has never met either of them. Any plan that
budgets for five bosses is budgeting for two that do not ship.

Alternative: wire one of them in now. Worth noting for the argument: THE BEHIND already owns the
**only** bespoke render treatment in the entire renderer (a tinted silhouette with two pale eye
glints instead of a body, `js/render.js:705-706` and 736-739), which is the closest thing in the
codebase to a proof that per-species drawing works, and it was built by one person adding one
branch.
