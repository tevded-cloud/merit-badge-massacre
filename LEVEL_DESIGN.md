# LEVEL DESIGN

The binding level design doctrine for Merit Badge Massacre. Every rule here is
written against the shipped schema in `js/rooms.js` and the shipped constants in
`js/room.js`, `js/data.js`, `js/collide.js` and `js/render.js`. Where a rule can
be computed, it is expressed as a predicate over a `RoomDef` so the rebuild
workflow can enforce it without a human in the loop.

The mandate this document answers, in the owner's words: not just density but a
full level design taking into account player flow and dynamic level layouts
unique to the game but meeting players expectations in the genre. And the
diagnosis that sharpened it: the rocks and stumps are randomly placed, it looks
as is, rather than in all of the games it is trying to grow from.

That diagnosis is correct and it is not a density problem. Section 3 measures
the current Boulder Run at 0.58 solid bodies per 100 tile-units, comfortably
inside the band the research supports. The room does not have too much stuff or
too little. The stuff is not arranged. Section 2 is the answer and it governs
every other section in this file.

## Source ledger

Rules borrowed from the owner's research library at `D:/Programs/GameTev/research/`
carry a tag. Rules with no tag are derived from this game's own constants and are
marked with the derivation.

| Tag | Report |
| --- | --- |
| [LLR] | `asset-forge/level-layout-recipes/report.md` |
| [OFS] | `asset-forge/open-field-survivors-space-recipes/report.md` |
| [BER] | `asset-forge/boss-encounter-recipes/report.md` |
| [RMN] | `asset-forge/run-map-node-graph-recipes/report.md` |
| [HEL] | `game-systems/hades-experience-ledger/report.md` |
| [BIL] | `game-systems/binding-of-isaac-experience-ledger/report.md` |
| [RDF] | `game-systems/roguelite-dungeon-systems-floor/report.md` |
| [VRC] | `visual/visual-readability-clarity-game-feel/report.md` |
| [CFV] | `visual/composition-framing-visual-hierarchy/report.md` |
| [LSD] | `asset-forge/lore-set-dressing-recipes/report.md` |

Four things the research does **not** provide, so this document derives them from
the engine instead of inventing them. Stated up front so nobody later mistakes a
derivation for a citation.

1. No report gives a millisecond figure for how long a player needs to read a new
   room. [LLR] and [VRC] both explicitly decline to state one. Section 1 derives
   the read window from `ROOM_LOCK_T`.
2. No report gives a maximum sightline length or a percent-of-room-visible rule
   for a top-down arena. [LLR] covers only spawn-point occlusion. Section 4
   derives the sightline maxima from `ZOOM` and the camera clamp.
3. No report names randomly scattered obstacles as a failure mode, and none says
   where scatter is compositionally appropriate. [CFV] gets closest with "one
   idea per moment" and the one-focal-point rule but has no Gestalt content and
   no numeric tolerances at all. Section 2 is authored from first principles on
   top of what [CFV] does supply.
4. No report gives rooms per act or a numeric difficulty curve. [RDF] states
   plainly that all three of its canon games leave this undocumented and refuses
   to average them. This document asserts room shape, never a room count.

---

## 0. The derived unit set

Everything downstream is expressed in these. Each has a source line.

| Unit | Value | Where it comes from |
| --- | --- | --- |
| `D` reference dodge | **105** world units | `DATA.characters.max.dodge` (`js/data.js:409`): `spd 620 * dur 0.17 = 105.4` |
| `D_min` | **91** | Junie `Backdraft` (`js/data.js:412`): `700 * 0.13` |
| `D_max` | **125** | Gus `Tuck and Roll` (`js/data.js:415`): `520 * 0.24 = 124.8` |
| `Pr` player radius | **11** | `js/game.js:34`, `r: 11` |
| `Er` widest enemy radius | **17** | `ashelk` (`js/data.js:191`), `r: 17` |
| `Ew` widest enemy body | **52** | `ashelk`, `w: 52` |
| `TILE` | **24** | `ROOM_CELL` (`js/room.js:15`), the block grid resolution |
| `VIEW` | **911 x 512** | `1366 / ZOOM 1.5` by `768 / ZOOM 1.5`; `ZOOM = 1.5` at `js/game.js:6` |
| `VHX` view half width | **455** | `VIEW.w / 2` |
| `VHY` view half height | **256** | `VIEW.h / 2`. This is the binding one. |
| `WALL` wall clearance | **130** | the shipped house rule in the `js/rooms.js` header |
| `PEEK` | **108** | `RD_PEEK` (`js/render.js:767`), camera overscan into the treeline |

Derived spacing, each with its formula:

| Name | Formula | Value |
| --- | --- | --- |
| `GAP_MIN` | `1.5 * D` | **158** |
| `GAP_MAX` | `2.5 * D` | **263** |
| `LANE_MIN` | `D + 2 * Pr` | **127**, floored to **130** to meet `WALL` |
| `LANE_MAX` | `2 * D + 2 * Pr` | **232**, ceiled to **240** |
| `MARKER_CLEAR` | `D + Pr + Er` | **133**, rounded to **135** |
| `CROSS_R` | `D + Pr` | **116**, rounded to **120** |
| `PAIR_TOL` | `0.5 * D` | **52** |
| `FRINGE` | `1.5 * D` | **158** from any wall |
| `FOOT` | `0.5 * D` | **52** from a formation member |

`LANE_MIN` at 130 landing exactly on the shipped `WALL` constant is not a
coincidence to paper over, it is the strongest evidence the existing house rule
was already right: 130 is one dodge plus a body, which is precisely the width a
lane needs. It also comfortably clears the pass-through requirement of
`Ew + 2 * Pr = 74`, so the widest body in the game (`ashelk`) can share a lane
with the player.

### 0.0 Coordinate conventions, stated before anything is measured

Every measurement in this document depends on these three facts, and getting any
of them wrong silently moves a body by half its own width. They are read off the
engine, not assumed.

**A solid's `x, y` is the centre of its AABB, not its top left corner.** `enter()`
(`js/room.js:189-190`) does `hw = s.w / 2; hh = s.h / 2` and then
`x0 = p.x - hw, x1 = p.x + hw`. So `{ x: 185, y: 505, w: 135, h: 43 }` occupies
`x [117.5, 252.5]`, `y [483.5, 526.5]`, and its centre is `(185, 505)`. Authoring a
solid as if `x, y` were its corner puts it `w/2` right and `h/2` down of where it
was drawn on paper, which for the catalogue's 135 x 43 log is 67.5 by 21.5 units.

**Room-local coordinates put the origin at the top left**, and `toWorld()`
(`js/room.js:95-97`) adds `bounds.x0` and `bounds.y0`. So room-local `(585, 385)`
is the centre `C` of a 1170 x 770 room, and world `(0, 0)`.

**A solid prop's `x, y` is its centre and its footprint is a disc of `PROPS[id].r`**,
not a box. The radii that matter: `boulder` **32**, `logpile` **20**, `stump` **18**,
`crate` **15**, `barrel` **15**, `urn` **13** (`js/props.js:32-102`). Clearance for a
prop is therefore measured centre-to-centre minus `r`, and against a solid it is
centre-to-AABB minus `r`.

### 0.1 The composition rect

Inset a room by `WALL` on all four sides and you get the rect every authored
solid must live inside. For the catalogue's most common combat size:

```
1170 - 2 * 130 = 910      VIEW.w = 911
 770 - 2 * 130 = 510      VIEW.h = 512
```

A 1170 x 770 room's legal solid area is **one screen, to within two units**. That
is the single most important geometric fact in this document. It means the entire
composed arrangement of a mid-size combat room can be taken in at once, which is
exactly what Isaac buys from its single-screen rooms [BIL] and what this game
gets for free at `ZOOM 1.5`.

**Rule 0.1.** Every solid and every solid prop, in every combat room, must lie
fully inside the centered rect `910 x 510` (room-local `x` in `[C.x - 455, C.x + 455]`,
`y` in `[C.y - 255, C.y + 255]`) **and** fully inside the `WALL` inset. For rooms
at or under 1170 x 770 the `WALL` inset is the binding one. For the two large
sizes (1210 x 790, 1250 x 830) the composition rect is stricter, and the extra
width and height they carry must be spent on fringe, never on formation members.

| Room size | `WALL` inset | Inside one screen? |
| --- | --- | --- |
| 1000 x 700 | 740 x 440 | yes, with room to spare |
| 1080 x 730 | 820 x 470 | yes |
| 1130 x 750 | 870 x 490 | yes |
| **1170 x 770** | **910 x 510** | **exactly, the reference** |
| 1210 x 790 | 950 x 530 | no, over by 39 x 18 |
| 1250 x 830 | 990 x 570 | no, over by 79 x 58 |

---

## 1. The core loop of a room

Five beats. Each has a time budget taken from a shipped constant, so none of this
is a feel argument.

```
ENTRY READ  ->  FIRST ENGAGEMENT  ->  MID FIGHT  ->  CLEAR BEAT  ->  DOOR CHOICE
   0.9s          0.8 to 1.4s          the fight       0.65s          0.3s dwell
```

### 1.1 Entry read: 0.9 seconds

The player lands `ROOM_ENTRY_INSET` (46) inside the wall at `def.entry`. The doors
shut when the player has walked `ROOM_LOCK_STEP` (40) further in **or** after
`ROOM_LOCK_T` (0.9 s), whichever lands first (`js/room.js:17-18`). That 0.9 s is
not a design target somebody picked for reading time, it is the literal window in
which the player is not yet committed. It is therefore the read budget, and it is
derived rather than borrowed, because neither [LLR] nor [VRC] states a room-read
figure at all.

Within that window the player must be able to assess three things without moving
the camera, because the camera is pinned to them and clamped:

**Threat directions.** Every spawn marker consumed by wave 1 must be inside the
entry view rect (Section 6.2), or on a wall segment inside it. Later waves may and
should arrive from outside it.

**The cover map.** At least one member of every declared formation must be inside
the entry view rect, and every formation member inside that rect must be
unoccluded from the entry point by `Collide.segmentBlocked`. The player does not
need to see all the cover; they need to see the *idea* of the cover, which is
what a formation is for.

**Door positions.** At `ZOOM 1.5` a 1170 x 770 room cannot show any of its doors
from the entry point (worked in Section 6.2). The engine already solves this: the
`js/rooms.js` header states that rooms bake worn paths from the entry toward each
door. So a door is read either by being in the view rect **or** by a `path` or
`road` dressing entry running from the entry point to it. Layouts that declare a
`dressing` array must declare those paths explicitly rather than assume the
fallback.

No blind corners at entry. Concretely: no solid may sit within `GAP_MAX` (263) of
the entry point, and no solid may lie on the segment from the entry point to any
door anchor within a corridor of half-width `LANE_MIN / 2` (65).

### 1.2 First engagement beat: the wave arrives in under 1.5 seconds

`ROOM_RELEASE` is 0.06 s per queued body (`js/room.js:24`), so a wave's arrival
time is `n * 0.06`. Wave 1 should be between 12 and 20 bodies, which is 0.72 s to
1.20 s of arrival. Below 12 the room does not commit; above 24 (1.44 s) the wave
is still pouring in after the player has already begun to fight it, which reads
as the room stuttering rather than opening.

Wave 1 announces. It uses `mode: 'marker'` for a small announced count from
visible gaps, and `mode: 'edge'` for the body of it. It never uses `mode: 'ring'`,
because a ring is a surround and a surround is a climax, not an opening.

`delay` on wave 1 is 0.8 to 1.4 s across the catalogue today and should stay
there: it is the gap between the doors shutting and the first body, and it is the
only silence the room gets.

### 1.3 Mid fight flow

The room's job during the fight is to keep the player moving through the
formation rather than around it. Three rules.

**The player must cross the composition at least twice.** Wave 2's markers sit on
the far side of the primary formation from wave 1's. The player cannot answer both
from one position.

**No position may be safe.** Computable: for every free grid cell, count the
compass directions (8) along which the first blocked cell lies within `FRINGE`
(158). If that count is 4 or more the cell is an alcove and the layout fails. This
is the anti-turtle rule and it matters most for `lock: 'survive'` rooms.

**Cover never becomes a wall.** [OFS] section 6.2 is blunt that in horde combat a
field wants almost no cover, because cover lets the player cheese the swarm, and
sets kite-space density at 0 to 2 props per 100 tile-units. Section 3.4 shows this
game already sits at 0.3 to 0.9, inside that band. The rule that keeps it there:
no formation may enclose an area on three sides where the mouth is narrower than
`LANE_MIN` (130).

### 1.4 Clear beat: 0.65 seconds, then the doors

Fully specified by shipped constants. `ROOM_CLEAR_GRACE` (0.4 s) is the beat
between the last kill and the payout; `ROOM_OPEN_T` (0.25 s) is the door opening
animation (`js/room.js:22-23`). So 0.65 s from the last body dying to a usable
door.

This matches the Hades clear beat exactly in structure [HEL]: clear all enemies,
exits light up carrying their reward symbol, the player reads the symbol and then
chooses. The defining property [HEL] identifies is that the reward is read before
it is claimed, and this game's `reward: { kind: 'auto' }` plus the door card
preserves that. Nothing in the room layout may obstruct it: **no solid may sit
within `GAP_MAX` (263) of a door anchor**, so the door and its card are legible
from the fighting floor the instant they open.

Isaac's rule is the same in the other direction [BIL]: enemies present means doors
visibly lock, and the last enemy's death unlocks them, stated as absolute. This
game's `lock: 'clear'` is that rule. Layouts must not undercut it by making the
last enemy hard to find, which is what the `nextAt` and `maxT` fields exist to
prevent.

### 1.5 Door choice: 0.3 seconds of dwell

`ROOM_DWELL` is 0.3 s stood inside `ROOM_DOOR_R` (46) before the door fires
(`js/room.js:19-21`). That dwell is a commitment gesture and the layout must not
let it fire by accident, which is where the door separation rule in Section 6.3
comes from.

Door count is the run graph's branching factor. [RMN] sets that at 1 to 3 forward
edges per node with 1 to 4 nodes per tier, and states the genre's defining rule
that choosing one branch spends the others. This game's catalogue already sits
there: combat rooms carry 3 doors, service rooms carry fewer. Section 6.4 binds
door count to archetype.

---

## 2. Composition and intentionality

This is the heart of the document. Everything in Section 3 is shaped by it.

The reference games do not scatter. Isaac's rocks sit on a grid and the interest
comes from which grid cells are empty. Gungeon's crates and tables come in
clusters that read as furniture. Hades hand-authors every chamber [HEL], which is
the structural claim [RDF] singles out as its divergence from Isaac's procedural
floors. What all three share is that a player entering a room sees an
*arrangement*, and knows within a beat what the room is going to ask of them.

The current rooms do not read that way. `_scatterSpot` (`js/room.js:280-285`)
samples uniformly across the whole floor inset by `ROOM_SCATTER_INSET` (80), so
scatter props land mid floor. The authored props are placed by eye. Boulder Run's
five boulders have per-segment angles of 35.1, 21.2, 28.8 and 31.1 degrees and
edge gaps of 129, 243, 167 and 116. The intent was a diagonal. The execution is a
sprinkle. Section 9 works the fix.

### 2.1 Formations, never scatter

**Rule 2.1.** Every solid and every solid prop that sits in the composition rect
belongs to a declared formation. There is no third category. A body that is not a
formation member and not fringe dressing is a bug, not a decision.

The formation vocabulary is closed. Eight entries. Nothing else may be authored.

| Formation | Members | Geometry | Reads as |
| --- | --- | --- | --- |
| **Mirrored pair** | 2 | two bodies at equal distance from an axis or from `C`, same type, same size | deliberate, ceremonial, a gate |
| **Line** | 3 to 5 | evenly spaced on one axis, constant step | a fallen trunk, a fence, a ridge |
| **Broken line** | 3 to 5 filled of 4 to 6 slots | a Line with one interior slot empty | a line something came through |
| **Arc** | 3 to 5 | evenly spaced on a circle or ellipse, spanning 60 to 150 degrees | a shore, a crater lip, a sweep |
| **Diamond** | 4 | a rhombus about a center, both axes aligned | a marked place, a claim |
| **L** and **double L** | 3 (6) | two perpendicular arms sharing a corner body | a corner, a pocket, a shelter |
| **Ring** and **half ring** | 5 to 8 (3 to 4) | evenly spaced on a full or half circle or ellipse | a henge, an enclosure, an eye |
| **Staggered lane pair** | 4 to 6 | two parallel rows, offset along the row by half the step | a corridor with cross-overs |

Every formation carries four locked properties and the checker reads all four.

**Type**, from the table above.

**Axis.** A formation is aligned to something or it is not a formation. Legal
anchors: a room axis (horizontal or vertical through `C`), the room's true
diagonal (`atan(insetH / insetW)`, which is `atan(510 / 910)` = **29.3 degrees**
for 1170 x 770), the entry sightline, or a door-to-door flow line. Angular
tolerance **5 degrees**. Aligning to nothing is the failure the owner is naming.

The 5 degree tolerance is doing real work on the diagonal specifically, and
Section 9 spends it deliberately: a formation laid on the exact 29.3 degree
diagonal at the step the reference room wants runs its end members into the wall
clearance, so the worked rebuild shallows the axis to 27.8 degrees, 1.5 degrees
inside tolerance, and buys back 9 to 16 units of wall margin. Shallowing the axis
to fit the wall is legal. Landing at 27.8 and *calling* it the true diagonal is
the bookkeeping error this note exists to prevent.

**Step.** The centre-to-centre interval along the formation. Constant within a
formation, tolerance **8 units**. The resulting edge-to-edge gap must sit in
`[GAP_MIN, GAP_MAX]` = `[158, 263]`, so the player crosses a formation in one to
two dodges. Exactly one **break** per formation may exceed `GAP_MAX`, and only if
it is declared.

**Anchor.** The point the formation is positioned from: `C`, a door anchor, or the
entry point.

Note a hard schema consequence. `def.solids` are axis-aligned AABBs (`x, y, w, h`,
no rotation), so a formation built from `solids` can only align to a room axis.
Solid props (`boulder`, `crate`, `stump`, `logpile`) are discs with a radius, so
only they can express a diagonal, an arc, a ring or a diamond. **A diagonal or
curved formation must be built from props. An axis-aligned formation may use
either.** This is why Boulder Run's diagonal is made of boulders, and why its
counter-element in Section 9 is made of logs on the room axes.

### 2.2 Symmetry with one violation

[CFV] treats symmetry only as a tone dial and never mentions deliberate
symmetry-breaking, so this rule is authored, not borrowed. What [CFV] does supply
and this rule leans on: exactly one focal point per view, competing focal points
collapse the read, and the eye goes to the break in a pattern (its "difference and
anomaly" attractor).

**Rule 2.2.** Every combat room has a declared symmetry operation and exactly one
declared violation of it.

Legal operations: `mirrorX` (across the vertical centre line), `mirrorY` (across
the horizontal centre line), `rot180` (about `C`), `radialN` for N in 3 to 8
(about `C`). [LLR] section 4 uses the same four classes for its arenas
(bilateral, radial with N in 3 to 6, rotational 2-fold, asymmetric-balanced) and
this document drops only the asymmetric-balanced class, because a horde room has
no team-fairness requirement to satisfy and an unsymmetric base is exactly the
look being fixed.

The base arrangement is symmetric under the declared operation to within
`PAIR_TOL` (52). Then exactly one member is displaced off its lattice slot. That
displacement is the violation, and the pocket it opens is the room's interesting
corner: the risk-reward space, the shortcut that runs closest to the horde, the
one asymmetric approach.

The violation is declared, not inferred, so the checker can be exact: snap the
declared violated member back to its declared slot, then require the resulting set
to be perfectly symmetric with zero unmatched members. Displacement magnitude must
be at least `0.5 * D` (52, or the eye reads it as sloppiness rather than
intent) and at most `1.5 * D` (158, or the member has left its formation).

Exactly one. Zero violations reads as sterile. Two or more reads as the scatter
this doctrine exists to remove.

### 2.3 Scatter is demoted to fringe

**Rule 2.3.** Random props may occupy only two zones, and never the open floor.

**The fringe band**: within `FRINGE` (158) of any wall, outside
`ROOM_SCATTER_INSET` (80). That is a ring 78 units wide against the treeline, and
it is where the room's organic filler lives: `bush`, small deco, ground mushrooms.
It reads as the clearing's edge fraying into the trees, which is true to the
fiction and matches the [OFS] density gradient exactly: sparse in the kite space,
dense at the border, and [OFS] section 11.1 names flat or inverted dressing
density (denser near the player than at the border) as a red flag.

**Formation feet**: within `FOOT` (52) of a declared formation member. Rubble at a
boulder's base, moss at a log's end. This makes a formation member look planted
rather than dropped, and it is the only reason a small prop may appear away from
the walls.

Everything else is open floor and carries no scatter at all.

This requires an engine change and the rebuild owns it: `_scatterSpot`
(`js/room.js:280`) currently rejection-samples the whole inset rect and must
instead sample the union of the fringe band and the feet discs. Until that lands,
layouts must keep `def.scatter` to props that are non-solid so a bad roll cannot
put a blocker mid floor. Read off `js/props.js:32-102`, the catalogue splits
exactly four and six:

- **non-solid, safe to scatter:** `basket`, `mailbox`, `birdhouse`, `bush`
- **solid, never scattered:** `crate`, `stump`, `urn`, `barrel`, `logpile`,
  `boulder`

That split is worth stating in full because `urn` and `barrel` are easy to read as
decoration and are `solid: true` (`js/props.js:85`, `js/props.js:90`). They block,
they bake into the grid, and they count against density and formation membership
exactly as a boulder does.

Non-solid props in the fringe are unconstrained. **Solid** props in the fringe
must be within `FOOT` of a formation member, otherwise they are the orphan the
owner is pointing at. Boulder Run's stump at (1085, 685) is 125.6 units from its
nearest formation candidate. It is an orphan and Section 9 either adopts it or
deletes it.

### 2.4 Motif consistency: one room, one idea

[CFV] section 4.2 states it as "one idea per moment: stage one clear action or
threat at a time, competing staged actions are competing focal points." [LSD]
section 6.2 backs it with hard density caps for named dressing (arena 3, room 4,
lanes 2) and the principle that one strong artifact beats three redundant ones,
and calls "more props means a richer world" a misconception outright.

**Rule 2.4.** A room is about one arrangement idea. A henge ring. A fallen tree
line. A flooded crossing. A rockfall run. The formation expresses it and the
dressing agrees with it.

Computable ceilings, per combat room:

- at most **2** distinct formation types
- at most **2** distinct `spr` values across `def.solids`
- at most **2** distinct prop ids among formation members
- at most **3** distinct `kind` values in `def.dressing`, and every one of them
  drawn from the motif's declared dressing set (Section 7 gives one set per act)
- named story dressing (`props` that are not formation members and not fringe)
  capped at **4** per room [LSD] section 6.2

The `anchor` exemption: a single solid may be declared the room's anchor (the one
focal body, per [CFV]'s one-focal-point rule) and is exempt from formation
membership and from the symmetry count, provided it sits on the symmetry axis or
at `C`. At most one anchor per room.

### 2.5 What this fixes, stated plainly

A room built to Section 2 reads as designed the moment the player enters, because
the eye finds a repeated interval, an axis, and one place where the pattern
breaks. That break is where the player goes. That is the whole trick, and it is
what Isaac, Gungeon and Hades all do and this game currently does not.

---

## 3. Engagement shapes

Eight archetypes. A layout declares exactly one. Each recipe below is worked
against the reference size 1170 x 770 (`C` at room-local (585, 385), composition
rect 910 x 510) and scales to the other sizes by holding the derived units fixed
and letting the member counts move.

### 3.1 The Bowl

Open centre, treeline pressure. The purest horde room.

**Geometry.** No solid within `GAP_MIN` (158) of `C`. All cover on one ellipse
about `C` with `rx = insetHalfW - 100`, `ry = insetHalfH - 60`. At 1170 x 770 that
is `rx 355, ry 195`.

**Formation.** One **ring** of 6 props at 30, 90, 150, 210, 270 and 330 degrees.
Ellipse perimeter 1765, so adjacent arc spacing 294 and edge gap about 226, inside
the band. Symmetry `radial6`. Violation: one member pushed outward along its own
radius by `1.0 * D`.

**Why an ellipse and not a circle.** A 1170 x 770 room's composition rect is
910 x 510; a circle of the radius the width allows would not fit the height. The
rooms are wide and short (aspect 1.52) and formations that ignore that aspect
cannot be legal. This is a general rule: formation axes respect the room aspect.

**Spawn choreography.** Opener `edge` (the treeline closes in from everywhere).
Pressure `marker` from 4 markers placed just outside the ring, radially between
members so they arrive through the gaps. Climax `ring` at `r 240`.

**Movement pattern.** A wide kite circle in the open centre, using the ring props
to shear pursuers. The [OFS] kiting model exactly: the player circles and doubles
back, net displacement near zero.

**Suits.** Acts 1 and 3. Casts heavy on walkers and chargers (`doe`, `boar`,
`ashelk`). Shape `round`. Sizes M and L.

### 3.2 The Lanes

Parallel cover rows forcing lane switching.

**Geometry.** Two rows of solids at `y = C.y +/- 100`, giving a centre lane of
`200 - 43 = 157` (solid height 43), inside `[LANE_MIN, LANE_MAX]`. Outer lanes run
from the row edge to the `WALL` line: `255 - 121.5 = 133.5`, which clears
`LANE_MIN` by 3.5. Row A carries 3 solids at step 340 (edge gap 205); row B
carries 2, offset along the row by half the step.

At 1170 x 770: row A at `y 285`, `x` centres 245, 585, 925. Row B at `y 485`, `x`
centres 415, 755. Five solids, the house-rule maximum.

**Formation.** One **staggered lane pair**. Symmetry `mirrorX` (row A is
symmetric about `x = 585` with a self-matched centre member, row B's two members
are a mirrored pair). Violation: displace `(925, 285)` to `(925, 175)`, which
breaks the mirror by exactly one pair and opens a cross-over pocket at the east
end of row A.

**Spawn choreography.** Opener `door` (they come down the lanes at you). Pressure
`marker` from markers seated in the *outer* lanes so the player must change lane
to answer. Climax `edge`.

**Movement pattern.** Run a lane, shear at a stagger gap, change lane. The
staggering is what makes lane changes cheap in one direction and expensive in the
other.

**Suits.** Act 2 above all (the Sog's water-forced lanes, Section 7). Casts with
ranged pressure (`owl`, `stiltheron`, `bogfrog`) so lanes carry real risk. Shape
`rect`. Sizes M and L.

### 3.3 The Pockets

Connected sub-clearings with risk pockets.

**Geometry.** A **double L**, the two Ls being an exact `rot180` pair about `C`.
At 1170 x 770: L1 at `(325, 215)`, `(565, 215)`, `(325, 455)`, arms of 240 along
`+x` and `+y`. L2 at `(845, 555)`, `(605, 555)`, `(845, 315)`.

Verified: every inter-formation clearance is at least 233 (the tightest pair is
`(565, 215)` to `(845, 315)` at 233.3), every wall clearance is at least 183, and
each L's inner corner is open toward `C` so neither pocket is enclosed.

**Formation.** Two **L** formations as one mirrored system. Symmetry `rot180`.
Violation: displace one arm-end member perpendicular to its arm by `1.0 * D`,
which widens one pocket's mouth and narrows the other's approach.

**Movement pattern.** Duck into a pocket to break line of sight from ranged
enemies, then leave before the walkers seal the mouth. The pocket is a timer, not
a shelter, which is what the `LANE_MIN` mouth rule guarantees.

**Suits.** Act 1 (the Understory's organic pockets, Section 7). Mixed casts with
one ranged type. Shape `rect` or `pillars`. Sizes M and L.

### 3.4 The Ring

Centre anchor, orbital flow.

**Geometry.** One anchor solid at `C` (92 x 92 at `(539, 339)`), and a **ring** of
6 props on an ellipse `rx 320, ry 208`. Members at 0, 60, 120, 180, 240, 300
degrees: `(905, 385)`, `(745, 565)`, `(425, 565)`, `(265, 385)`, `(425, 205)`,
`(745, 205)`.

The orbital lane between anchor and ring is `320 - 46 - 32 = 242`, well over
`LANE_MIN`. Adjacent ring spacing runs 176.8 to 256 edge to edge, inside the band.
`ry` is derived: `ry >= anchorHalfH (46) + propR (32) + LANE_MIN (130) = 208`.

**Formation.** One **ring** plus one declared **anchor** (exempt per Section 2.4).
Symmetry `radial6` and `rot180` simultaneously. Violation: one ring member pushed
outward by `1.0 * D`, opening the orbit at one bearing.

**Movement pattern.** Orbit the anchor, using it to break pursuit, and use the
violated bearing as the escape when the orbit gets crowded. The anchor is the
room's single focal point in [CFV]'s sense and the dressing must reinforce it (a
`ring` dressing entry at `C`).

**Suits.** Act 3 and boss antechambers. Corruption 1 rooms especially: the anchor
is where the Mark shows. Shape `round` or `pillars`. Sizes M and L.

### 3.5 The Funnel

Wide to narrow with an ambush turn.

**Geometry.** Two convergent **broken lines** mirrored across the spine, narrowing
to a throat of exactly `LANE_MIN` (130), then one solid past the throat as the
ambush. At 1170 x 770 entering west: upper line `(200, 215)`, `(420, 251)`,
`(640, 288)`; lower line mirrored across `y = 385`: `(200, 555)`, `(420, 519)`,
`(640, 482)`. Step 222.9, edge gap 158.9, just inside `GAP_MIN`. Throat between
`(640, 288)` and `(640, 482)`: `194 - 64 = 130` exactly.

Ambush solid: a log at `(900, 300)`, 135 x 43. Clearance from the upper line's
last member is 160.5, over the 158 inter-formation minimum, and right wall
clearance 202.5.

**Formation.** Two **broken lines** as a mirrored pair. Symmetry `mirrorY`.
Violation: the ambush solid itself is the violation, being unpaired by design; it
must therefore be declared as the violation, not as an anchor.

**Spawn choreography.** Opener `edge` in the wide mouth. Pressure `point` at the
throat's far side (the ambush fires as the player commits). Climax `marker` from
behind the funnel walls, so the player is caught between the throat and the
returning horde.

**Movement pattern.** Commit through the throat, then immediately turn. The
funnel is the one archetype that deliberately punishes forward momentum.

**Suits.** Act 3 and elite rooms. Casts with a charger (`boar`, `ashelk`) so the
throat is genuinely dangerous. Shape `rect`. Size L is comfortable; M is tight and
the checker will show it.

### 3.6 The Crossroads

Path intersection with four-way pressure.

**Geometry.** An open crossing disc of `CROSS_R` (120) at `C`. Two clear corridors
of `LANE_MIN` (130) width along the door axes. Formation members only in the four
quadrants. Base symmetry `rot180` about `C`, which is the symmetry a crossroads
actually has.

**Formation.** One **broken line** on the room's true diagonal through `C` with
the centre slot empty (so the entry-to-far-door spine runs through the break),
plus one **mirrored pair** of axis-aligned solids on the anti-diagonal shoulders.
Section 9 works this in full as the Boulder Run redesign.

**Spawn choreography.** Opener `marker` from the two door-axis gaps (visible from
entry), then `edge`. Pressure `marker` from the two quadrant markers behind the
shoulder solids (not visible from entry). Climax `ring`.

**Movement pattern.** Fight from the crossing, retreat down whichever corridor is
least pressured, re-take the crossing. The crossing must stay open or the room
becomes four separate small fights.

**Suits.** Any act. Rooms with an entry plus three doors. Shape `rect`. Sizes M
and L.

### 3.7 The Gauntlet

Survive and traps. `lock: 'survive'` with `surviveT`.

**Geometry.** The lowest cover density of any archetype: bottom of the band, about
0.3 solid bodies per 100 tile-units, which for 1170 x 770 (1564 tile-units) is 4
to 5 bodies total. A **half ring** of 3 to 4 against one wall, plus a **line** of
3 dividing the room, positioned so the half ring's shelter is on the wrong side of
the line from the spawn pressure.

**The anti-turtle rule is binding here and is checked hard.** No free cell may
have 4 or more of its 8 compass directions blocked within `FRINGE` (158). A
survive room with a corner is a survive room the player wins by standing still.

**Formation.** One **half ring** and one **line**. Symmetry `mirrorX`. Violation:
one line member displaced to open the single crossing the player will use over and
over, which is what makes the room learnable.

**Spawn choreography.** No wave structure in the usual sense. Continuous `drip`
plus timed `edge` and `ring` waves. `ring` radius must stay in `[190, 256]` per
Section 5.3.

**Movement pattern.** A figure-eight around the line and the half ring, never
stopping. The room is a treadmill and the geometry's only job is to make the
treadmill legible.

**Suits.** One layout exists today (`js/rooms.js:718`, 1130 x 720, `surviveT 45`).
Acts 2 and 3. Shape `rect`.

### 3.8 The Den

The boss room.

**Geometry.** A central open disc of radius `GAP_MAX + bossR` = `263 + 30 = 293`,
where 30 is the boss collision radius (`DATA.bosses`, `r: 30`). This disc is not
decoration: [BER] section 4.3 establishes that any attack whose active window
exceeds the player's i-frame budget must have a named non-dodge answer, and for
its ROOM-WIDE HAZARD class that answer is "reposition", which requires the arena
to contain somewhere to reposition to. [BER] sets the moderate tier (which
includes `roguelite-action`) at 0.40 s / 24 frames of i-frames, with ROOM-WIDE
HAZARD active windows of 0.33 to 1.5 s, so the negative margin is real and the
open disc is the fairness guarantee.

Boss sizes and whether the disc fits:

| Size | Composition half-height | 293 disc fits? |
| --- | --- | --- |
| 1280 x 900 | 320 | yes, 27 to spare |
| 1350 x 940 | 340 | yes, 47 |
| 1430 x 980 | 360 | yes, 67 |
| 1100 x 1100 (Hollow) | 420 | yes, 127 |

**Formation.** One **half ring** or one symmetric **ring** of 4 at the shoulders,
strictly outside the open disc, giving the reposition targets. Symmetry `radial4`
or `mirrorX`. Violation: still exactly one, and in a Den it is the tell for where
the adds come from.

**Add spawns.** [BER] section 3.3 is explicit that minions spawn only at the
arena's own pre-computed spawn positions and never at a newly invented point.
This game's equivalent: boss add waves use `mode: 'marker'` against
`def.spawnMarkers`, never `mode: 'point'`. Markers sit outside the open disc and
behind the shoulder cover.

**Phases.** [BER] sets 2 phases for `roguelite-action` at a 50 percent health
threshold, with a 1.2 to 1.5 s invulnerable transition beat. This engine has no
arena-shrink or hazard-toggle primitive, so phase change is expressed through the
wave table and `corruption`, not through geometry. Stated honestly rather than
papered over: a Den does not change shape mid fight, it changes what is in it.

**Entry.** [BER] section 5.1 makes the boss gate proximity-triggered and warns
against an instant un-triggered lock that traps a player who has not chosen to
engage. This game's `ROOM_LOCK_STEP` (40 units of walking) plus `ROOM_LOCK_T`
(0.9 s) is exactly that gate, and it must not be shortened for Dens.

**Suits.** End of each act plus the Hollow. Shape `round` or `pillars`.

### 3.9 Archetype to act and size

| Archetype | Acts | Shape | Sizes | Doors |
| --- | --- | --- | --- | --- |
| Bowl | 1, 3 | round | M, L | 2 to 3 |
| Lanes | 2 | rect | M, L | 2 to 3 |
| Pockets | 1 | rect, pillars | M, L | 3 |
| Ring | 3 | round, pillars | M, L | 2 to 3 |
| Funnel | 3 | rect | L | 2 |
| Crossroads | 1, 2, 3 | rect | M, L | 3 |
| Gauntlet | 2, 3 | rect | M | 1 to 2 |
| Den | act ends, Hollow | round, pillars | boss | 1 |

---

## 4. Flow numbers

Section 0 gives the unit set. This section gives the reasoning and the checks that
depend on it.

### 4.1 Dodge travel and cover spacing

The three scouts (`js/data.js:408-416`):

| Scout | Dodge | `spd` | `dur` | Travel | `iframe` | `cd` | `charges` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Max | Sidestep | 620 | 0.17 | **105.4** | 0.30 | 1.0 | 1 |
| Junie | Backdraft | 700 | 0.13 | **91.0** | 0.24 | 0.8 | 2 |
| Gus | Tuck and Roll | 520 | 0.24 | **124.8** | 0.34 | 1.4 | 1 |

`D = 105` (Max, the default troop leader) is the reference. The spread is 91 to
125, a range of 34 units, which is the tolerance the layout must survive: at
`GAP_MIN` (158) Junie needs two dodges to cross a gap and Gus needs 1.3. That
difference in feel between scouts is intended and is why the band is a band.

Cover spacing `[158, 263]` is `[1.5 D, 2.5 D]`. Below 158 the gap is a single
dodge and cover stops mattering. Above 263 the player crosses in the open for more
than two dodges and the formation stops reading as connected.

Note this **tightens** the shipped house rule. The header says solids are never
closer than 75 to each other; that rule is a safety floor against sealing a
pocket, and it stays. 158 is the composition rule and it is strictly stricter, so
there is no conflict, only a narrowing.

### 4.2 Weapon ranges

From `DATA.weapons` (`js/data.js`):

| Weapon | Base range | Notes |
| --- | --- | --- |
| melee swing | 84 | plus `arc 2.1` |
| flamethrower | 175 | `+55` upgrade |
| slingshot class | 285 | `+95` upgrade, projectile `speed 430` |
| lobbed | 340 | `radius 78`, `fuse 0.45` |
| placed | 300 | `radius 64`, `dur 3` |

The binding number is the melee 84, because it is shorter than `D` (105). A player
on melee must dodge *into* range, which means cover pieces at `GAP_MIN` (158) sit
just under two melee commitments apart. That is the intended melee rhythm and it
is why `GAP_MIN` is not lower.

At the long end, 340 is well under `VHX` (455), so every weapon in the game can
reach anything the player can see horizontally. Nothing is out of range on screen,
which is the property that keeps the horde readable.

### 4.3 Enemy closing speeds

| Enemy | `spd` | `r` | `w` | Gait |
| --- | --- | --- | --- | --- |
| `ticktot` | 138 | 7 | 20 | walk |
| `fox` | 140 | 12 | 40 | weave |
| `bat` | 120 | 10 | 34 | sine |
| `squirrel` | 96 | 11 | 32 | walk |
| `chipchoir` | 92 | 10 | 26 | leash |
| `owl` | 82 | 12 | 34 | ranged |
| `sapperrat` | 78 | 11 | 28 | burrow |
| `raccoon` | 64 | 13 | 36 | walk |
| `ashelk` | 58 | **17** | **52** | charge (320) |
| `boar` | 56 | 16 | 48 | charge (340) |
| `doe` | 54 | 14 | 40 | walk |
| `stiltheron` | 48 | 13 | 44 | ranged, stab |
| `beaver` | 44 | 14 | 38 | walk |

Fastest sustained closer is `fox` at 140. Player dodge speed is 520 to 700, so a
dodge always breaks contact; the question is only how long the break lasts. At
`GAP_MIN` (158), a `fox` re-closes in `158 / 140 = 1.13 s`, which sits just above
Max's dodge cooldown of 1.0 s and just below Gus's 1.4 s. That is the intended
knife edge and it is another reason `GAP_MIN` is 158 rather than lower.

Chargers are the reason `LANE_MIN` exists. A `boar` at `chargeSpd 340` crossing a
130-wide lane is in the lane for 0.38 s, which is longer than any dodge duration
(0.13 to 0.24), so the player can always clear a lane ahead of a charge. Narrow
the lane below 130 and that stops being true.

### 4.4 Lane widths

`LANE_MIN = D + 2 * Pr = 105 + 22 = 127`, floored to **130** to sit on the shipped
`WALL` constant. Cross-check against the widest body: a player sharing a lane with
an `ashelk` needs `Ew + 2 * Pr = 52 + 22 = 74`, so 130 clears it by 56.

`LANE_MAX = 2 * D + 2 * Pr = 232`, ceiled to **240**. Above 240 a lane stops
reading as a lane and becomes open floor, which is a legitimate design choice but
must then be authored as open floor, not as a lane.

### 4.5 Minimum open radius around spawn markers

`MARKER_CLEAR = D + Pr + Er = 105 + 11 + 17 = 133`, rounded to **135**.

This is not cosmetic. `_queueOne` (`js/room.js:581`) wraps every spawn position in
`_free()`, which spirals outward up to 6 rings of `ROOM_CELL` (144 units) looking
for an unblocked cell and **falls back to the entry point** if it finds none
(`js/room.js:597-609`). So a marker sitting on or near a solid does not freeze the
room, it silently teleports the spawn up to 144 units away, or in the worst case
dumps the wave on top of the player's entry. Either outcome destroys the
choreography the marker existed to express.

Additional marker rules:

- No marker within `ROOM_EDGE_AWAY` (190) of the entry point. That constant
  (`js/room.js:28`) is the engine's own "do not spawn on top of the player"
  distance for edge spawns; markers have no such guard, so the layout must supply
  it.
- Markers must be at least `ROOM_SPAWN_INSET` (32) inside the bounds, since
  `_clip` will clamp them there anyway and a clamped marker is not where the
  author put it.
- 3 to 5 markers per combat room. Do not pad to fill a symmetric pattern; marker
  count follows the choreography, not the composition.

### 4.6 Sightline maxima

At `ZOOM 1.5` on 1366 x 768, the world view is `911 x 512`, so half extents are
`VHX 455` and `VHY 256`. **The vertical is the binding constraint and it is the
number most likely to be forgotten.**

The camera clamps to the room bounds with `RD_PEEK` (108) of overscan
(`js/render.js:28-37`):

```
cam.x in [b.x0 - 108 + 455, b.x1 + 108 - 455]
cam.y in [b.y0 - 108 + 256, b.y1 + 108 - 256]
```

For a 1170 x 770 room that is `cam.x in [-237.7, 237.7]` and
`cam.y in [-237, 237]`.

**Rule 4.6.** Nothing the player must react to may begin further than `VHX` (455)
horizontally or `VHY` (256) vertically from the player. In practice `VHY` is what
bites, because rooms are 700 to 830 tall and the view shows 512 of that.

The immediate consequence, and it is a real defect in the shipped content:
`_ringPos` defaults to radius **420** (`js/room.js:631`), which is 164 units past
`VHY`, so a ring spawn that declares no `r` at all is born well offscreen.

The full census of `mode: 'ring'` call sites, counted rather than estimated
(ten in `js/rooms.js`, three of them in the templates and seven authored directly
into layouts). Six of the ten break Rule 4.6a below:

| Where | `js/rooms.js` | `r` | Verdict |
| --- | --- | --- | --- |
| `ring_of_the_hare` | 109 | 291 | **35 over `VHY`** |
| `foxfire_hunt` | 127 | 267 | **11 over** |
| `dam_break` | 139 | 285 | **29 over** |
| `a1_c_needlefall` w2 | 214 | 227 | in band |
| layout | 335 | 248 | in band |
| layout | 449 | 241 | in band |
| layout | 537 | 259 | **3 over** |
| layout | 694 | 267 | **11 over** |
| layout | 778 | 271 | **15 over** |
| layout | 903 | 185 | **5 under the 190 floor** |

Only three of the six `WAVE_TEMPLATES` use `ring` at all; the other three
(`chiropteran_choir`, `the_squirrel_flood`, `stampede`) are `edge` and are fine.
The seven layout-authored rings are the larger problem precisely because they are
easy to miss when auditing the templates alone.

**Rule 4.6a.** `mode: 'ring'` must declare `r` in `[190, 256]`. The floor is
`ROOM_EDGE_AWAY` (190) so the ring does not land on the player; the ceiling is
`VHY` (256) so the whole ring is on screen. A wave that deliberately wants an
offscreen arrival uses `mode: 'edge'`, which is honest about being an arrival from
the treeline. [OFS] reaches the same conclusion from the other direction: its
shipped 14 to 18 tile spawn ring is flagged as a bug precisely because a spawn at
16 tiles landed inside a 20 tile half-view, and its fix is a camera-edge band
rather than a player-centred radius.

The three templates at 267 to 291 and the three layout rings at 259 to 271 are 3
to 35 units over the ceiling, which is marginal and can stand with a note; the 420
default cannot and the rebuild should change it to 240. The one ring at 185
(`js/rooms.js:903`) is under the `ROOM_EDGE_AWAY` floor and should go to 190 or
above, because that one lands *on* the player rather than merely offscreen.

### 4.7 Cover density

Using `TILE = ROOM_CELL = 24`, a 1170 x 770 room is 48.75 x 32.08 tiles = **1564
tile-units**, and the 911 x 512 view is 38 x 21.3 = 809 tile-units, close enough
to [OFS]'s 40 x 22.5 tile camera rect to borrow its bands.

[OFS] section 6.1 sets kite-space obstacle density at **0 to 2 props per 100
tile-units**, explicitly below the bounded-arena cap, on the argument that a horde
field wants little cover because cover lets the player cheese the swarm.

This game's shipped house rule is 2 to 5 `solids` per combat room plus 3 to 8
solid props, so 5 to 13 solid bodies in 1216 to 1802 tile-units, which is **0.3 to
0.9 bodies per 100 tile-units**. That sits inside [OFS]'s kite band with margin.

**Rule 4.7.** Total solid bodies (`solids` plus solid `props`) must give a density
in `[0.3, 1.2]` per 100 tile-units.

The important finding: Boulder Run today is 3 solids plus 5 boulders plus 1 stump
= 9 bodies = **0.58 per 100 tile-units**, comfortably in band. The redesign in
Section 9 is 2 solids plus 4 boulders plus 1 stump = 7 bodies = **0.45**, also in
band. Density was never the problem. This is the numeric proof of the owner's
diagnosis: the count is fine, the arrangement is not.

Note also that [LLR] section 4's arena cover density (3 to 5 props per 100
tile-units at low tier) is an order of magnitude above this. That is a genuine
unit mismatch, not a disagreement: [LLR] counts all set dressing in a 24 x 24 tile
arena, where this game counts gameplay blockers only and puts its dressing in the
fringe and the `dressing` bake. Cited so nobody later "fixes" the density upward
against the wrong reference.

---

## 5. Spawn choreography grammar

Waves use geometry or they are just numbers. Three roles, bound to modes and to
marker placement.

### 5.1 The three wave roles

**Opener: announce.** The wave must arrive from somewhere the player has already
looked. Modes: `marker` for a small announced count (2 to 4) from markers inside
the entry view rect, then `edge` for the body. Never `ring`. Size 12 to 20 so
arrival is 0.72 to 1.20 s.

`nextAt` on the opener should be 0.30 to 0.40, so the next wave starts while the
last third of this one is still alive. That overlap is what makes a room feel like
one fight instead of three.

**Pressure: flank from behind cover.** Modes: `marker` from markers seated behind
formation members, deliberately outside the entry view rect. This is the only wave
that is *supposed* to surprise, and it can only surprise because the opener
established where threats come from. Size 18 to 24.

`nextAt` 0.25 to 0.30.

**Climax: surround.** Modes: `ring` at `r` in `[190, 256]`, or `edge` if the room
is small enough that edge already reads as a surround. Size 20 to 26, arrival 1.2
to 1.56 s. `nextAt: 0` (kill it all) because the climax is what the door is
waiting on.

### 5.2 The marker cursor is the choreography

`_markerPos` (`js/room.js:686-694`) walks `def.spawnMarkers` round robin using
`this._markerI`, and **`_markerI` is never reset between waves**. It is a
persistent cursor across the whole room.

This is a gift and the doctrine uses it. Order `def.spawnMarkers` so the cursor
walks the room in choreographic order, then size each wave's marker count to
consume exactly the prefix it should:

```
spawnMarkers: [ M1 announce, M2 announce, M3 flank, M4 flank ]

wave 1: { n: 2, mode: 'marker' }   consumes M1, M2   (both inside the entry view)
wave 2: { n: 2, mode: 'marker' }   consumes M3, M4   (both behind cover, offscreen)
```

No engine change required. This is how a layout expresses "announce, then flank"
today.

If a wave's marker count exceeds the marker list length the cursor wraps and the
distinction is lost, so: **a marker spawn's `n` must not exceed the number of
markers remaining in its intended segment.** A wave that wants many bodies from
markers should pair a small `marker` spawn with a larger `edge` spawn in the same
wave, which is also what keeps arrival time inside budget.

### 5.3 Mode to archetype binding

| Archetype | Opener | Pressure | Climax |
| --- | --- | --- | --- |
| Bowl | `edge` | `marker` between ring members | `ring` 240 |
| Lanes | `door` | `marker` in the outer lanes | `edge` |
| Pockets | `edge` | `marker` behind each L | `ring` 220 |
| Ring | `marker` at the open bearing | `edge` | `ring` 200 |
| Funnel | `edge` in the mouth | `point` past the throat | `marker` behind the walls |
| Crossroads | `marker` on the door axes, then `edge` | `marker` in the quadrants | `ring` 240 |
| Gauntlet | `drip` continuous | timed `edge` | timed `ring` 240 |
| Den | `marker` outside the disc | `marker` outside the disc | `marker` outside the disc |

`mode: 'point'` is reserved. It puts every body of that spawn at one coordinate,
which reads as a rupture rather than an arrival, so it is legal only as the
Funnel's ambush and as a scripted lore beat.

`mode: 'door'` puts bodies at the room's door anchors, which is thematically the
horde coming down the paths. It suits the Lanes and nothing else, because in every
other archetype a door spawn contradicts the door's role as an exit.

### 5.4 Threat budget shape

[LLR] section 5 gives `budget(w) = 10 + 5w` with per-type costs (weak 1, medium 2,
strong 4, elite 8), and notes that in its 8-wave worked table the budget rises 233
percent while headcount *falls* 17 percent, because the ramp is carried by type
mix rather than by numbers. [LLR] section 8 steepens `budget_growth` from 5 to 7
for `roguelite-action` and shifts spawn patterns toward burst as run depth
increases.

This game already carries the type-mix mechanism: `id: 'auto'` rolls
`DATA.pool` at the room's threat, and `def.cast` gives per-layout weights. So the
rule is:

**Rule 5.4.** Across a room's waves, headcount stays flat or falls while the cast
weight shifts toward the heavier entries. A room whose three waves are 18, 22 and
20 is correct in shape. A room whose waves are 12, 24 and 40 is escalating by
headcount, which the arrival-time budget (Section 1.2) will not survive anyway:
40 bodies is 2.4 s of pouring.

Total kill budget per combat room: **50 to 70**. Boulder Run's 60 is the reference.

### 5.5 Corruption tier escalation

`corruption: 0 or 1` per layout; the `js/rooms.js` header states rooms near an act
boss default to 1 and that it drives Mark red accents, and `js/render.js:1425`
paints red glinting fungus creeping in from the treeline.

Corruption bends the room's shape toward the Mark. It never changes the archetype
and never breaks a Section 2 rule. It changes four things:

**The formation's break widens.** A corrupted room's declared break gap grows by
`0.5 * D` (52). The pattern is coming apart.

**The violation moves outward.** A corrupted room's violation displacement sits at
the top of its legal range (`1.5 * D` = 158) rather than the middle. The
interesting corner is further from where it should be.

**Cover is charred or thorned, not replaced.** Same formation, same positions,
different `spr` and different dressing. Act 3 swaps `patch role: 'scree'` for
`role: 'char'` and adds `burnband` along the formation axis. Act 1 and 2 corrupted
rooms add `cracks` at each formation member. The arrangement is identical, which
is the point: the room the player learned is still there, wrong.

**Paths distort.** The `path` dressing from the entry to each door bends: instead
of a straight `from`/`to`, a corrupted room declares two `path` entries meeting at
an off-axis point displaced by `1.0 * D` (105) perpendicular to the direct line.
The worn route no longer goes where it looks like it goes.

Checkable: `corruption: 1` requires at least one `cracks` or `burnband` or
`char`-role dressing entry, and requires the declared violation displacement to be
in `[1.2 D, 1.5 D]` = `[126, 158]`.

---

## 6. Door and entry grammar

### 6.1 Entry always reads the room

`def.entry` is `{ side, t }` and the player lands `ROOM_ENTRY_INSET` (46) inside
that wall. Rules:

- No solid within `GAP_MAX` (263) of the entry point.
- No solid on the segment from the entry point to any door anchor, within a
  corridor of half-width `LANE_MIN / 2` (65).
- No spawn marker within `ROOM_EDGE_AWAY` (190) of the entry point.
- The entry must not be on the same wall as any door, and if it shares a wall
  with a door the layout is malformed (the player would be able to leave without
  entering).

### 6.2 The entry view rect, worked

This is the most-cited derivation in the document, so here it is in full for the
reference size. Room 1170 x 770 entered from the west at `t 0.5`. Entry point
room-local `(46, 385)`, world `(-539, 0)`.

Horizontal: room width 1170 plus `2 * PEEK` (216) is 1386, which exceeds `2 * VHX`
(911), so the camera clamps: `cam.x = clamp(-539, -237.7, 237.7) = -237.7`. View
spans world `x` in `[-693, 217.7]`, room-local `[-108, 802.7]`.

Vertical: 770 plus 216 is 986, exceeds `2 * VHY` (512), so clamp:
`cam.y = clamp(0, -237, 237) = 0`. View spans world `y` in `[-256, 256]`,
room-local `[129, 641]`.

**Entry view rect = room-local `x [0, 802]`, `y [129, 641]`**, which is 45.6
percent of the room's area.

What that means in practice, and it is uncomfortable but true: **no door is
visible from the entry point of a 1170 x 770 room.** The north door at
`(585, 0)` is above the view; the south door at `(585, 770)` is below it; the east
door at `(1170, 462)` is past its right edge.

This is not a defect to fix by shrinking rooms (a 911 x 512 room cannot hold horde
combat). It is a defect the engine already fixed, and the doctrine's job is to
stop layouts from opting out of the fix.

### 6.3 Doors are visible or signposted

**Rule 6.3.** Every door must satisfy at least one of:

(a) its anchor lies inside the entry view rect, or

(b) a `dressing` entry of `kind: 'path'` or `kind: 'road'` exists whose `from` is
within 100 units of the entry point and whose `to` is within 120 units of the door
anchor.

The `js/rooms.js` header states rooms without a `dressing` list get worn paths
from the entry toward each door automatically. Layouts that *do* declare a
`dressing` list must declare those paths themselves rather than rely on a
fallback that may not apply.

Further:

- No solid within `GAP_MAX` (263) of a door anchor, so the door and its reward
  card are legible the instant they open (Section 1.4).
- Two doors on the same wall must be at least `2 * ROOM_DOOR_R + D` =
  `92 + 105 = 197` apart, floored to **200**, so a `ROOM_DWELL` (0.3 s) cannot
  fire on the wrong one. The Mailbox Lane's two east doors at `t 0.3` and `t 0.7`
  on a 700-tall room are 280 apart and pass.
- Doors on opposite walls should not be exactly opposite (`t` within 0.08 of each
  other), because a straight run from one to the other lets the player cross the
  room without engaging the composition.

### 6.4 Door count maps to archetype

Per [RMN]: branching factor 1 to 3 forward edges per node, 1 to 4 nodes per tier,
and choosing one branch spends the others.

| Doors | Meaning | Archetypes |
| --- | --- | --- |
| 1 | forced, no choice | Den, Gauntlet |
| 2 | a binary | Bowl, Lanes, Ring, Funnel, Gauntlet |
| 3 | the full choice | Crossroads, Pockets, Bowl, Lanes, Ring |

A room with 3 doors must be an archetype whose geometry gives the three exits
genuinely different approaches, which is why the Funnel (whose whole point is one
committed direction) caps at 2.

Service rooms (`lock: 'none'`: shop, rest, lore) are 640 x 490 to 780 x 550, which
fits entirely inside one view, and they carry no formations, no markers and no
waves. They are exempt from Sections 2 through 5 and need only satisfy the door
rules here.

---

## 7. Per-act spatial motifs

`DATA.themes` (`js/data.js:275`) gives four themes: 1 THE UNDERSTORY, 2 THE SOG,
3 THE BURN, and `hollow` THE HOLLOW. The `dressing` vocabulary from the
`js/rooms.js` header is the shared palette; each act draws a fixed subset. That
subset is the motif's declared dressing set referenced in Rule 2.4.

### 7.1 Act 1: The Understory

Organic pockets and paths. The forest floor before anything went wrong.

- **Preferred archetypes:** Pockets, Bowl, Crossroads.
- **Preferred formations:** L and double L, arc, broken line. Curved and cornered
  shapes; the Understory does not do straight lines.
- **Dressing set:** `path`, `patch` with `role` in `dirt | needle | moss`, `bowl`,
  `ring`. Corrupted rooms add `cracks`.
- **Solid vocabulary:** `log`, `brock`. Props: `stump`, `logpile`, `bush`,
  `basket`, `birdhouse`.
- **Motif examples:** the fallen tree line; the deer bed hollow; the trail fork.
- **Symmetry preference:** `rot180` and `mirrorX`. Radial reads too formal for a
  forest floor and belongs to act 3.

### 7.2 Act 2: The Sog

Water-forced lanes and islands. The ground decides where you may go.

- **Preferred archetypes:** Lanes, Crossroads, Gauntlet.
- **Preferred formations:** staggered lane pair, line, mirrored pair. The Sog is
  the act where axis-aligned formations are correct, because water channels are
  straight.
- **Dressing set:** `pool`, `patch` with `role` in `mud | moss`, `path`, `road`.
  Corrupted rooms add `cracks`.
- **Solid vocabulary:** `wall`, `log`. Props: `crate`, `barrel`, `logpile`,
  `mailbox`.
- **Motif examples:** the flooded crossing; the beaver cut; the boardwalk.
- **A `pool` dressing entry is decorative only** (nothing in `dressing` has
  gameplay effect, per the header), so a lane that the fiction says is water must
  be made real by `solids` flanking it. Never rely on the dressing to communicate
  a blocker.
- **Symmetry preference:** `mirrorX` and `mirrorY`.

### 7.3 Act 3: The Burn

Open scorched bowls with hard cover and vents. Nothing soft is left.

- **Preferred archetypes:** Bowl, Ring, Funnel.
- **Preferred formations:** ring and half ring, diamond, arc. Radial symmetry
  belongs here: the Burn's spaces were made by something, not grown.
- **Dressing set:** `burnband`, `scree`, `cracks`, `patch` with `role` in
  `ash | char | scree`, `bowl`.
- **Solid vocabulary:** `slab`, `brock`. Props: `boulder`, `urn`, `barrel`.
- **Motif examples:** the rockfall run; the ash henge; the vent field.
- **Corruption is the default here**, not the exception; act 3 rooms near the boss
  carry `corruption: 1` and the Section 5.5 escalation applies.
- **Symmetry preference:** `radialN` and `rot180`.

### 7.4 The Hollow

One room, 1100 x 1100, `shape: 'round'`, the only square room in the catalogue.
Archetype Den. Its squareness means its composition rect is 840 x 840, which is
the only case in the game where a true circle fits, so its formation is a full
`ring` with `radial6` or `radial8` symmetry and its violation is the single thing
in the game that is deliberately, visibly wrong.

---

## 8. The validation checklist

Every predicate is computable over a `RoomDef` plus the shipped helpers. The
rebuild enforces all of them. **50 predicates in 7 groups** (A 7, B 7, C 12, D 6,
E 5, F 9, G 4).

Six of the fifty need the block grid rather than closed-form arithmetic (B6, B7,
and all of Group G), so the checker builds the room once via `buildGrid()` and
runs those against `room.grid`. The other forty-four are pure arithmetic over the
`RoomDef` and need no engine at all.

Two additive optional fields are proposed so composition can be declared rather
than guessed. Both are new; everything else in this section reads fields that
exist today.

```
formations  [{ type, axis, anchor, step, members: [ref...], break?: slotIndex,
               violation?: { member: ref, slot: {x,y} } }]
scatterZone 'fringe' | 'feet' | 'both'     (default 'both')
```

A `ref` is either `{ solid: i }` or `{ prop: i }`. Layouts with no `formations`
array can still be checked by inference (fit each formation type to the solid set
and take the best fit), but declared is authoritative and inference is a fallback
that reports lower confidence.

Shorthand used below: `S` is the set of `def.solids`, each an AABB centred on its
`x, y` per Section 0.0; `P` is the set of `def.props` whose `PROPS[id].solid` is
true, which is exactly `crate`, `stump`, `urn`, `barrel`, `logpile`, `boulder`,
each a disc of radius `PROPS[id].r`; `B = S union P` is every solid body; `F` is
the set of declared formation members; `C` is the room centre; `E` is the entry
point; `insetRect` is the room inset by `WALL` (130); `compRect` is the centered
`910 x 510` rect.

Distances involving a body are always to its **surface**, not its centre: AABB
edge for a member of `S`, centre minus `r` for a member of `P`. A predicate that
says "within 135 of `b`" means 135 units of open floor between the point and the
thing the player will collide with.

### Group A: size, shape and budget (existing rules, restated computably)

| # | Predicate | Bound |
| --- | --- | --- |
| A1 | `def.size.w` in `[1000, 1250]` and `def.size.h` in `[700, 830]` for `type: 'combat'` or `'elite'` | catalogue |
| A2 | `2 <= len(S) <= 5` for combat rooms | shipped house rule |
| A3 | every `s` in `S`: `dist(s.AABB, wall) >= 130` for all four walls | shipped house rule |
| A4 | every pair in `S`: edge gap `>= 75` | shipped house rule |
| A5 | `sum(waves[i].spawns[j].n)` in `[50, 70]` | Section 5.4 |
| A6 | every wave: `n * 0.06 <= 1.56` (arrival time) | `ROOM_RELEASE`, Section 1.2 |
| A7 | density `len(B) / (w * h / 576) * 100` in `[0.3, 1.2]` per 100 tile-units | Section 4.7 |

### Group B: geometry and clearance

| # | Predicate | Bound |
| --- | --- | --- |
| B1 | every `b` in `B` lies fully inside `insetRect` **and** fully inside `compRect` | Rule 0.1 |
| B2 | every pair within one formation: edge gap in `[158, 263]`, except one declared `break` | Section 2.1 |
| B3 | every pair in different formations: edge gap `>= 158` | Section 2.1 |
| B4 | within a formation, step is constant to within `8` units | Section 2.1 |
| B5 | every declared lane's clear width in `[130, 240]` | Section 4.4 |
| B6 | widest-path clearance between every pair of door anchors `>= 65` (half `LANE_MIN`), via a distance transform on `room.grid` | Section 1.3 |
| B7 | no free cell has 4 or more of its 8 compass directions blocked within `158` (anti-alcove) | Section 1.3 |

### Group C: composition and intentionality

| # | Predicate | Bound |
| --- | --- | --- |
| C1 | every `b` in `B` is either in `F`, or is the declared `anchor`, or satisfies the fringe rule (C6) | Rule 2.1 |
| C2 | `1 <= len(formations) <= 2` | Rule 2.4 |
| C3 | every formation's `type` is in the closed vocabulary of 8 | Rule 2.1 |
| C4 | every formation's fitted axis is within **5 degrees** of a room axis, the room's true diagonal, the entry sightline, or a door-to-door line | Rule 2.1 |
| C5 | after snapping the declared `violation.member` back to `violation.slot`, `F` is perfectly symmetric under `def.symmetry` with **zero** unmatched members, tolerance `52` | Rule 2.2 |
| C6 | exactly **1** declared violation per combat room, with displacement magnitude in `[52, 158]` (or `[126, 158]` if `corruption: 1`) | Rules 2.2, 5.5 |
| C7 | every solid prop in the fringe band is within `52` of a formation member | Rule 2.3 |
| C8 | at most `1` declared `anchor`, and it lies on the symmetry axis or within `52` of `C` | Rule 2.4 |
| C9 | `def.scatter` names only props with `PROPS[id].solid === false`, until `_scatterSpot` is rezoned | Rule 2.3 |
| C10 | distinct `spr` across `S` `<= 2`; distinct prop ids among `F` `<= 2`; distinct `dressing.kind` `<= 3` | Rule 2.4 |
| C11 | every `dressing.kind` used is in the act's declared dressing set (Section 7) | Rule 2.4 |
| C12 | non-formation, non-fringe `props` count `<= 4` | [LSD] 6.2 |

### Group D: entry read

| # | Predicate | Bound |
| --- | --- | --- |
| D1 | no `b` in `B` within `263` of `E` | Section 6.1 |
| D2 | no `b` in `B` intersects the corridor of half-width `65` from `E` to any door anchor | Section 6.1 |
| D3 | `area(insetRect intersect entryViewRect) / area(insetRect) >= 0.60` | Section 1.1 |
| D4 | at least one member of every formation lies inside `entryViewRect` | Section 1.1 |
| D5 | every formation member inside `entryViewRect` returns `null` from `Collide.segmentBlocked(room, E, member)` | Section 1.1 |
| D6 | `def.entry.side` is not the side of any door | Section 6.1 |

### Group E: doors

| # | Predicate | Bound |
| --- | --- | --- |
| E1 | door count matches the archetype table in Section 6.4 | Section 6.4 |
| E2 | every door is inside `entryViewRect`, **or** a `path`/`road` dressing runs from within `100` of `E` to within `120` of the door anchor | Rule 6.3 |
| E3 | no `b` in `B` within `263` of any door anchor | Rule 6.3 |
| E4 | two doors on the same `side`: `abs(t1 - t2) * wallLength >= 200` | Rule 6.3 |
| E5 | doors on opposite walls: `abs(t1 - t2) >= 0.08` | Rule 6.3 |

### Group F: spawn choreography

| # | Predicate | Bound |
| --- | --- | --- |
| F1 | `3 <= len(spawnMarkers) <= 5` for combat rooms | Section 4.5 |
| F2 | every marker: `dist` to every `b` in `B` `>= 135` | Section 4.5 |
| F3 | every marker: `dist(marker, E) >= 190` | Section 4.5 |
| F4 | every marker at least `32` inside the bounds | Section 4.5 |
| F5 | wave 1's `marker` spawns consume only markers inside `entryViewRect` (prefix check against the persistent `_markerI` cursor) | Section 5.2 |
| F6 | every `mode: 'ring'` spawn declares `r` in `[190, 256]` | Rule 4.6a |
| F7 | wave 1 uses no `mode: 'ring'`; the final wave uses `nextAt: 0` | Section 5.1 |
| F8 | headcount is non-increasing across waves after wave 1 | Rule 5.4 |
| F9 | `mode: 'point'` appears only in a Funnel or a `type: 'lore'` room | Section 5.3 |

### Group G: reachability (the hard gates, never waived)

| # | Predicate | Bound |
| --- | --- | --- |
| G1 | flood fill `room.grid` from `E`: every door anchor is reachable | [LLR] 9 |
| G2 | flood fill from `E`: every spawn marker is reachable | [LLR] 9 |
| G3 | flood fill from `E`: **every** free cell is reachable (no islands, no dead pockets) | [LLR] 9, shipped house rule |
| G4 | no formation encloses an area on 3 sides whose mouth is narrower than `130` | Section 1.3 |

[LLR] section 9's on-failure procedure applies to all of Group G: reject and
reroll the offending piece, never the whole layout, and after 3 consecutive
failures drop the cover count by one body.

---

## 9. Worked example: a1_c_boulderrun

The template for the rebuild. Everything below is worked against the real layout
at `js/rooms.js:342-381`.

### 9.1 Before

```js
a1_c_boulderrun: {
  id: 'a1_c_boulderrun', name: 'BOULDER RUN', type: 'combat', acts: [1],
  cast: { doe: 2, pineconepuffer: 1.5, squirrel: 1.3, bat: 0.5, chipchoir: 0.6 },
  size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
  doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.6 }, { side: 's', t: 0.5 }],
  entry: { side: 'w', t: 0.5 },
  solids: [
    { x: 185, y: 505, w: 135, h: 43, spr: 'log' },
    { x: 899, y: 148, w: 135, h: 43, spr: 'log' },
    { x: 517, y: 320, w:  92, h: 92, spr: 'brock' },
  ],
  props: [
    { id: 'boulder', x:  216, y: 154 }, { id: 'boulder', x: 374, y: 265 },
    { id: 'boulder', x:  660, y: 376 }, { id: 'boulder', x: 862, y: 487 },
    { id: 'boulder', x: 1016, y: 580 },
    { id: 'bush', x: 111, y: 665 }, { id: 'stump', x: 1085, y: 685 },
  ],
  scatter: { bush: [2, 4] },
  spawnMarkers: [
    { x: 160, y: 160 }, { x: 1096, y: 185 }, { x: 160, y: 634 },
    { x: 1047, y: 647 }, { x: 585, y: 185 },
  ],
  waves: [ edge 18, edge 22, marker 20 ],
  ...
}
```

### 9.2 The measurement

Room 1170 x 770, so `C = (585, 385)`, `insetRect` = `x [130, 1040]`, `y [130, 640]`,
which equals `compRect` exactly.

Resolved bodies, on the centre convention of Section 0.0. Getting this table right
is the whole of the measurement; the first pass at this example read `x, y` as a
corner and every conclusion below moved.

| Body | Centre | Extent |
| --- | --- | --- |
| log A | (185, 505) | AABB `x [117.5, 252.5]`, `y [483.5, 526.5]` |
| log B | (899, 148) | AABB `x [831.5, 966.5]`, `y [126.5, 169.5]` |
| brock | (517, 320) | AABB `x [471, 563]`, `y [274, 366]` |
| boulders | (216,154) (374,265) (660,376) (862,487) (1016,580) | disc `r 32` |
| stump | (1085, 685) | disc `r 18` |

Nine solid bodies. The bush at (111, 665) is `solid: false` and is not one of them.

**The boulder line's intent was right.** Its four segments run at 35.1, 21.2, 28.8
and 31.1 degrees, averaging **29.0 degrees**. The room's true diagonal
(`atan(510 / 910)`) is **29.3 degrees**. The author was reaching for the room's own
diagonal and landed within **0.3 degrees** of it on average. That is the good news,
it is better news than it first looked, and it is why the redesign keeps the line
rather than replacing it.

**The execution is a sprinkle.** Per-segment angles vary over a 13.9 degree spread
against a 5 degree tolerance. Edge gaps are 129, 243, 167, 116 against a
`[158, 263]` band, so two of four are out of band and one (116) is barely over one
dodge.

**The two logs are a failed pair.** Log A centre `(185, 505)`, log B centre
`(899, 148)`. Reflecting A through `C` gives `2C - A = (985, 265)`, which is
**145.2 units** from where B actually is, against a `PAIR_TOL` of 52. They were
plainly meant to be a rotational pair and they miss by 93 units more than the eye
will forgive. This is the single clearest piece of evidence for the owner's
complaint: the intent is visible in the numbers and the execution loses it.

**Nothing checked any of this when this section was written, because the
assertion pass did not exist.** That gap is now closed:
`tools/validate_rooms.cjs` implements all 50 predicates of Section 8 and runs
as `npm run rooms:check`, exiting nonzero on any failure. Its first run
scored every one of the 46 layouts as failing, which is how everything below
shipped. The catalogue has since been rebuilt against it act by act.

**Five of nine bodies break the 130 wall line**, and two of them are `solids` that
the header's own rule already covers:

| Body | Violating edge | Line | Short by |
| --- | --- | --- | --- |
| log A | left `117.5` | 130 | 12.5 |
| log B | top `126.5` | 130 | 3.5 |
| boulder (216,154) | top `154 - 32 = 122` | 130 | 8 |
| boulder (1016,580) | right `1016 + 32 = 1048`, so `1170 - 1048 = 122` | 130 | 8 |
| stump (1085,685) | right and bottom, both `67` | 130 | **63** |

The stump is the worst offender in the room and its *centre* is outside `insetRect`
on both axes. It is not a near miss, it is a body parked in the treeline.

**All five markers are unusable, not three.** `MARKER_CLEAR` is 135 units of open
floor, measured to the body's surface:

| Marker | Nearest body | Clear floor | Required |
| --- | --- | --- | --- |
| (160, 160) | boulder (216,154), centre dist 56.3 | **24.3** | 135 |
| (1096, 185) | log B AABB corner (966.5, 169.5) | **130.4** | 135 |
| (160, 634) | log A edge (160, 526.5) | **107.5** | 135 |
| (1047, 647) | boulder (1016,580), centre dist 73.8 | **41.8** | 135 |
| (585, 185) | brock AABB corner (563, 274) | **91.7** | 135 |

Marker (160, 160) is 56.3 units from the boulder's centre, so it sits just *outside*
the 32-unit footprint rather than inside it, but with 24 units of floor it is inside
the spiral `_free()` will walk, and the wave arrives somewhere the author did not
choose. Marker (1096, 185) misses by 4.6 units, which is the kind of miss that only
a checker ever catches.

**The stump is an orphan.** `(1085, 685)` is a solid body 125.6 units from its
nearest formation candidate, the boulder at (1016, 580), against a `FOOT` of 52. It
belongs to nothing.

**Scatter lands mid floor.** `scatter: { bush: [2, 4] }` goes through
`_scatterSpot`, which samples uniformly across the whole rect inset by 80. `bush`
is non-solid so it does no gameplay harm, but visually it is exactly the random
sprinkle being complained about.

**The entry read fails on the approach corridors, not on the sightline.** From
`E = (46, 385)` the line to the east door at `(1170, 462)` passes `y = 414.1` at
`x = 471` and `y = 420.4` at `x = 563`, clearing the brock's bottom edge at 366 by
48 units. That one is fine. What is not fine is `D2`, the requirement that no body
intrudes on a corridor of half-width 65 around the run from the entry to each door:

| Corridor | Intruder | Clear | Required |
| --- | --- | --- | --- |
| `E` to north door (585, 0) | boulder (216, 154) | **57.2** | 65 |
| `E` to east door (1170, 462) | boulder (660, 376) | **18.9** | 65 |
| `E` to east door (1170, 462) | brock corner (563, 366) | **54.3** | 65 |
| `E` to south door (585, 770) | log A corner (252.5, 483.5) | **39.9** | 65 |

Every one of the room's three exits is pinched on the way out of the entry. And
`D1` fails at the entry itself: log A's nearest corner is **121.7** units from `E`
and the boulder at (216, 154) is **254.8**, both inside the 263 no-build radius.

**No door is signposted.** The entry view rect for this room is `x [0, 802]`,
`y [129, 641]` (Section 6.2), which contains none of the three door anchors, and
the `dressing` array declares `scree`, `cracks` and `patch` but no `path` or
`road`. Because the layout declares a `dressing` list at all, the engine's
automatic worn paths do not apply, so `E2` fails on all three doors: the room
neither shows its exits nor points at them.

**The north and south doors are exactly opposite.** Both sit at `t 0.5`, so `E5`
fails: a player can run the room's short axis from one to the other without ever
meeting the composition.

**The dressing belongs to the wrong act.** Act 1's declared set (Section 7.1) is
`path`, `patch` with `role` in `dirt | needle | moss`, `bowl` and `ring`, with
`cracks` added only for `corruption: 1`. This layout uses `scree`, `cracks` with no
corruption flag, and `patch` with `role: 'scree'`. All three are act 3 vocabulary
on an act 1 floor, so `C11` fails.

**Wave 3 has no choreography.** `marker` with `n: 20` over 5 markers is 4 full
cursor cycles, so every marker fires four times including the three that are
compromised. Announce and flank are indistinguishable.

**Density was fine.** 3 solids + 5 boulders + 1 stump = 9 bodies in 1564
tile-units = **0.58 per 100 tile-units**, inside the `[0.3, 1.2]` band. Nothing
needs adding or removing for density reasons.

**Checklist result: 20 of 50 predicates fail**, 24 pass, and 6 need the grid runner
(B6, B7, G1 to G4, all of which this layout is expected to pass on inspection since
nothing here encloses anything).

| Fails | What tips it |
| --- | --- |
| A3 | log A left 117.5, log B top 126.5 |
| B1 | 5 bodies outside `insetRect`: both logs, 2 boulders, the stump |
| B2 | boulder gaps 129 and 116, against `[158, 263]` |
| B3 | brock to boulder (374,265) is 65.4, to boulder (660,376) is 65.5, against 158 |
| B4 | centre steps 193, 307, 230, 180: spread 127 against a tolerance of 8 |
| C1 | no `formations` declared, so no body is a member of anything |
| C2 | zero formations, against `[1, 2]` |
| C3 | no declared types |
| C4 | per-segment axis spread 13.9 degrees against 5 |
| C5 | no `def.symmetry`; the logs miss `rot180` by 145.2 against `PAIR_TOL` 52 |
| C6 | zero declared violations, against exactly 1 |
| C7 | stump 125.6 from its nearest candidate, against `FOOT` 52 |
| C11 | `scree`, `cracks`, `patch role scree` are all outside act 1's set |
| D1 | log A 121.7 and boulder (216,154) 254.8 from `E`, against 263 |
| D2 | all three door corridors pinched, worst 18.9 against 65 |
| D4 | no formations, so none can be in the entry view rect |
| E2 | no door in the entry view rect and no `path` or `road` dressing |
| E3 | east door: boulder (1016,580) at 162 and stump at 220.6, against 263 |
| E5 | north and south doors both at `t 0.5` |
| F2 | all five markers under `MARKER_CLEAR` 135 |

Four predicates the first pass at this example recorded as failures actually
**pass**, and they are worth naming so the rebuild does not chase them: `C9` (the
only scattered prop is `bush`, which is `solid: false`), `D5` and `F5` (vacuous,
there being no formations and no wave-1 marker spawns), `F6` (the room has no
`mode: 'ring'` spawn at all), and `F7` (wave 1 is `edge`, and wave 3 carries
`nextAt: 0`).

The corrected tally makes the owner's diagnosis sharper, not softer. This room
fails two fifths of the doctrine, and it fails almost all of it on **arrangement**:
of the 20 failures, 12 are composition, entry-read or door-grammar rules and only
`A3`, `B1` and `B2` are about where a single body sits. Density (`A7`) passes.
Kill budget (`A5`) passes. Wave shape (`F7`, `F8`) passes. The room is built from
the right amount of the right stuff, arranged by nobody.

### 9.3 After

**Archetype: The Crossroads.** Entry west plus doors north, east and south is a
four-way, and the room's name says the spine is a run.

**Motif: the rockfall run.** One idea. A fall came down the clearing's diagonal and
the path threads the gap it left.

**Symmetry: `rot180` about `C`. One violation.**

**Formation 1: the broken line.** Five lattice slots on the room's diagonal through
`C`, step **230**, centre slot empty. Built from props because `solids` are
axis-aligned AABBs and cannot express a diagonal (Section 2.1).

The axis is `u = (0.885, 0.466)`, **27.8 degrees**, which is deliberately 1.5
degrees shallower than the room's true diagonal of 29.3 degrees and well inside the
5 degree tolerance of Rule 2.1. The shallowing is not cosmetic: on the exact 29.3
degree axis the outer slots at step 230 land at `(384.7, 160.1)` and `(785.3, 609.9)`,
whose top and bottom edges at `r 32` fall at 128.1 and 641.9, both **outside** the
130 wall line. Shallowing to 27.8 degrees pulls both back inside with margin to
spare. Where the wall and the ideal axis disagree, the wall wins and the deviation
is declared.

| Slot `t` | Position | Filled |
| --- | --- | --- |
| -460 | (178, 171) | yes |
| -230 | (381, 278) | yes |
| 0 | (585, 385) | **break** |
| +230 | (789, 492) | yes, then violated |
| +460 | (992, 599) | yes |

Edge gap `230 - 64 = 166`, inside `[158, 263]`. The break spans
`2 * 230 - 64 = 396`, which is the one declared exceedance, and it is exactly the
lane the spine runs through: the player enters west and runs east straight through
the middle of the boulder line. That is Boulder Run.

Wall clearance check with `r = 32`: `(178, 171)` has edges at left 146 and top 139,
both over 130. `(992, 599)` has edges at right 146 and bottom 139. Both pass, with
9 to 16 units of margin rather than the 8-unit violation before.

Perfect `rot180`: `2C - (178, 171) = (992, 599)` exactly, and
`2C - (381, 278) = (789, 492)` exactly.

**Formation 2: the mirrored pair.** The two logs, an exact `rot180` pair, on the
anti-diagonal shoulders. Authored on the centre convention of Section 0.0:

```js
{ x: 330.5, y: 560.5, w: 135, h: 43, spr: 'log' },   // AABB x [263, 398],   y [539, 582]
{ x: 839.5, y: 209.5, w: 135, h: 43, spr: 'log' },   // AABB x [772, 907],   y [188, 231]
```

`2C - (330.5, 560.5) = (839.5, 209.5)` exactly. The 145.2-unit miss is now zero.

Note what changed from the before: the two logs keep the same *footprints* the
author was reaching for, and only their authored `x, y` move, because the original
pair was written as if `x, y` were the corner. Half of what read as a sloppy eye
was a coordinate convention nobody had written down. That is the strongest argument
in this document for Section 0.0 existing at all.

Clearances: log 1 min wall distance 188, log 2 min wall distance 188. Both clear
the spine corridor (`y 320` to `450`) and the cross corridor (`x 520` to `650`)
entirely. Inter-formation clearance to the nearest boulder is 229 both ways,
over the 158 minimum.

**The one violation.** Boulder at slot `+230` is displaced perpendicular to the
line (along `n = (-0.466, 0.885)`) by `1.0 * D` = 105, moving `(789, 492)` to
**`(740, 585)`**. Displacement magnitude 105, inside `[52, 158]`. Wall clearances:
left 708, right 398, top 553, bottom 153, all over 130. Gap to `(992, 599)` is
`252.4 - 64 = 188.4`, still in band.

The pocket it opens: a fast shoulder on the south-east side of the break, running
from the crossing toward the east door, closest to the south-east marker. It is a
shortcut that carries you nearest the horde. That is the interesting corner.

Symmetry check per C5: snap `(740, 585)` back to `(789, 492)` and the six bodies
are perfectly `rot180` symmetric with zero unmatched. Exactly one declared
violation. Passes.

**The boulder is retired.** (This document called it "the brock" throughout, inheriting the naming
mistake corrected 2026-07-29: `brock` was never a rock, it was Scoutmaster Brock's own sprite, and
31 room solids rendered him as boulders. Solids now say `slab` and the rock is chosen by aspect
ratio.) Its old position sat on the entry sightline and its role
as a centre mass is now taken by the crossing, which must be **open**. Solids drop
from 3 to 2, which is the house-rule floor and legal. This is a deliberate
deletion: the Crossroads' crossing is empty by definition, and adding a third
solid would require a third formation, breaking the two-formation cap in Rule 2.4.

**The stump is adopted.** Moved from `(1085, 685)` to **`(1030, 630)`**, which is
49 units from boulder `(992, 599)`, inside the `FOOT` of 52. It becomes rubble at
the base of the line's last boulder: planted, not dropped. It stays in the fringe
band (right and bottom clearances 122) where fringe dressing belongs.

**Scatter is rezoned.** `scatter: { bush: [2, 4] }` stays (bush is non-solid, so it
passes C9 today), and `scatterZone: 'both'` is declared so that once `_scatterSpot`
is rezoned the bushes land against the treeline and at the boulders' feet rather
than mid floor.

**Markers become choreography.** Four, ordered so the persistent `_markerI` cursor
walks announce-then-flank.

| Order | Position | Role | Inside entry view rect? | Min clearance to a body |
| --- | --- | --- | --- | --- |
| M1 | (585, 172) | announce, north door axis | yes | 196 |
| M2 | (560, 606) | announce, south door axis | yes | 149 |
| M3 | (1045, 310) | flank, behind log 2 | **no** | 159 |
| M4 | (880, 725) | flank, behind the violation pocket | **no** | 136.6 |

All four clear `MARKER_CLEAR` (135). All four are over `ROOM_EDGE_AWAY` (190) from
the entry. M1 and M2 are inside the entry view rect (`x [0, 802]`, `y [129, 641]`)
and M3 and M4 are outside it, which is exactly right: the opener announces from
what the player already saw, the pressure wave flanks from what they did not.

Note there is deliberately **no west marker**. The west band is squeezed between
the 190-unit entry guard and log 1, and padding a fifth marker in to make the set
look symmetric is precisely the reflex this doctrine exists to stop. Marker count
follows choreography, not composition (Section 4.5).

**Waves become announce, flank, surround.** Kill budget held at 60, matching before.

| Wave | Spawns | Cursor | Arrival | `nextAt` |
| --- | --- | --- | --- | --- |
| 1 opener | `marker n 2` + `edge n 12` | M1, M2 | 0.84 s | 0.35 |
| 2 pressure | `marker n 2` + `edge n 20` | M3, M4 | 1.32 s | 0.30 |
| 3 climax | `ring r 240 n 24` | none | 1.44 s | 0 |

`ring r 240` is inside `[190, 256]`, so unlike the shipped templates at 267 to 291
the whole climax ring is born on screen (Rule 4.6a). Headcount runs 14, 22, 24;
the rise from 14 to 22 is the opener-to-pressure step and 22 to 24 is flat within
tolerance, with the real escalation carried by `cast` weighting through
`id: 'auto'` (Rule 5.4).

**Dressing agrees with the formation.** The scree band now follows the actual line
axis instead of the old sprinkle, and the crossing is marked.

```js
dressing: [
  { kind: 'scree',  x0: 178, y0: 171, x1: 992, y1: 599, w: 130 },
  { kind: 'cracks', x: 585, y: 385, r: 90 },
  { kind: 'cracks', x: 381, y: 278, r: 52 },
  { kind: 'cracks', x: 740, y: 585, r: 52 },
  { kind: 'patch',  x: 178, y: 171, r: 60, role: 'scree' },
  { kind: 'patch',  x: 992, y: 599, r: 60, role: 'scree' },
  { kind: 'path',   from: { x: 46, y: 385 }, to: { x: 1170, y: 462 } },
  { kind: 'path',   from: { x: 46, y: 385 }, to: { x:  585, y:   0 } },
  { kind: 'path',   from: { x: 46, y: 385 }, to: { x:  585, y: 770 } },
]
```

Three `kind` values (`scree`, `cracks`, `patch`, `path` is four; drop the
`patch` entries if C10's cap of 3 is enforced strictly, or count `path` as
structural rather than motif dressing, which is the reading this document takes
since Rule 6.3 *requires* the paths). The cracks at `(740, 585)` matter: they mark
the violated boulder as authored rather than misplaced. The cracks at `C` mark the
break as the crossing. All of it says "rock", which is the one idea.

The three `path` entries satisfy E2 for all three doors, none of which is visible
from the entry point (Section 6.2). Without them the room would fail E2, and with
the old `dressing` array present the automatic fallback could not be relied on.

**Final density.** 2 solids + 4 boulders + 1 stump = 7 bodies = **0.45 per 100
tile-units**, still in band, down from 0.58. Slightly less stuff, arranged.

### 9.4 Before and after, rule by rule

| Rule | Before | After |
| --- | --- | --- |
| Formation axis (C4) | 4 segments spanning 13.9 degrees | one axis at 27.8 degrees, 1.5 off the true diagonal and declared, 0 spread |
| Formation step (B4) | centre steps 193, 307, 230, 180 | step 230 constant, gap 166 |
| Gap band (B2) | 2 of 4 outside `[158, 263]` | all inside; one declared break at 396 |
| Symmetry (C5) | logs miss `rot180` by 145.2 | exact `rot180`, 0 unmatched after snap |
| Violation (C6) | none declared, several accidental | exactly 1, displacement 105 |
| Wall clearance (A3, B1) | 5 bodies over the line, worst by 63 | all bodies at 139 or more |
| Inter-formation gap (B3) | brock 65.4 from the boulder line | 229 both ways |
| Solid props checked | 6 bodies unchecked, and no checker exists | all 7 in `B`, all checked |
| Orphan solids (C7) | stump 125.6 from anything | stump adopted as a foot at 49 |
| Scatter zone (C9) | passed by luck: `bush` happens to be non-solid | `scatterZone` declared, fringe and feet |
| Marker clearance (F2) | 5 of 5 fail, worst 24.3 of a required 135 | 4 of 4 pass, min 136.6 |
| Marker choreography (F5) | 5 markers, 4 cursor cycles, no roles | 2 announce visible, 2 flank hidden |
| Ring radius (F6) | n/a, no ring wave | 240, inside `[190, 256]` |
| Entry approach (D1, D2) | 3 of 3 door corridors pinched, worst 18.9 | all corridors clear at 65 or more |
| Door signposting (E2) | no paths declared, no door visible | 3 `path` entries, all doors signposted |
| Opposite doors (E5) | north and south both at `t 0.5` | offset past the 0.08 minimum |
| Dressing vocabulary (C11) | act 3 `scree` and `cracks` on an act 1 floor | act 1 set only |
| Solid count (A2) | 3 | 2, at the floor, deliberately |
| Density (A7) | 0.58 per 100 tu | 0.45 per 100 tu |
| Kill budget (A5) | 60 | 60 |
| Checklist | **20 of 50 fail** | **50 of 50 pass** |

### 9.5 The rebuild workflow this implies

0. Resolve every body to its real extent first: solids centred on `x, y`, solid
   props as discs of `PROPS[id].r`, per Section 0.0. Every step below is measured
   against surfaces, not authored coordinates. Boulder Run shows what skipping this
   costs: half its apparent sloppiness was a corner-versus-centre confusion.
1. Read the layout. Fit each formation type to the solid set and report the best
   fit, its axis and its step spread. This alone identifies which of the 46
   layouts are sprinkles.
2. Lock the axis to the nearest legal anchor (room axis, true diagonal, entry
   sightline, door line) within 5 degrees.
3. Lock the step so every gap lands in `[158, 263]`, and declare at most one
   break.
4. Choose the symmetry operation the archetype implies and make the base
   arrangement exact under it.
5. Displace exactly one member by `[52, 158]` and declare it. Name what the pocket
   is for.
6. Re-seat markers to `MARKER_CLEAR` (135) and order them announce-then-flank
   against the entry view rect.
7. Re-cut the waves to opener, pressure, climax with the arrival-time budget.
8. Rewrite `dressing` to agree with the new formation axis and declare the door
   paths.
9. Run all 50 predicates. Group G is never waived.

---

## 10. Open items for the rebuild

Stated so they are decisions and not surprises.

**`_scatterSpot` must be rezoned** (`js/room.js:280`). Until it is, Rule 2.3 is
enforced only by restricting `def.scatter` to non-solid props (predicate C9).

**`_ringPos` default radius is 420** (`js/room.js:631`), which is 164 units past
`VHY`. Change the default to 240. Six of the ten shipped `mode: 'ring'` call sites
also break Rule 4.6a (full census in Section 4.6): three templates at 267, 285 and
291 and three layout rings at 259, 267 and 271 are 3 to 35 over the ceiling, which
is marginal and can stand with a note or be pulled to 256. The ring at
`js/rooms.js:903` uses `r: 185`, which is under the `ROOM_EDGE_AWAY` floor of 190,
and that one is not marginal: it spawns on top of the player. Fix it first.

**The assertion pass has been written.** It was the single biggest gap between
what the code claimed and what it did, and it is now `tools/validate_rooms.cjs`,
wired to `npm run rooms:check`. It implements all 50 predicates of Section 8,
resolves solid props as well as `def.solids` (`crate`, `stump`, `urn`, `barrel`,
`logpile`, `boulder` are all `solid: true`), uses the centre convention of
Section 0.0, builds a real block grid through `Room.enter` for the navigability
group, and skips formation predicates with a counted warning until a layout
declares `def.formations`. Predicates that a layout cannot satisfy without
changing a frozen field (a door count, a door pairing, an entry side) are
reported honestly rather than waived.

**`mode: 'marker'` has no per-wave subset.** Section 5.2 shows the persistent
`_markerI` cursor makes announce-then-flank expressible today with no engine
change, which is why this document does not ask for a `markers: [indices]` field.
If a layout ever needs non-contiguous marker sets, that field becomes necessary.

**Two additive schema fields are proposed**: `formations` and `scatterZone`
(Section 8). Both are optional; inference is the fallback. Nothing else in this
document requires a schema change.

**The Hollow is unmeasured.** 1100 x 1100 is the only square room and the only one
whose composition rect (840 x 840) admits a true circle. Its layout at
`js/rooms.js:1603` should be worked as a second example once the Boulder Run
template is proven.

## Validator baseline (recorded 2026-07-28, at v2.0) [SUPERSEDED, see below]

`npm run rooms:check` exits 1 today and is EXPECTED to. The doctrine above is
deliberately stricter than the shipped layouts, so the validator is a ratchet,
not a build gate. What matters is whether the numbers MOVE.

The baseline at the 2.0 release:

    33 of 46 layouts fail at least one predicate
    85 failures
    165 skips (predicates awaiting a field the layout has not declared)
    exit code 1

Worst offenders, all three boss arenas: a2_b_middenhall (9), a3_b_ashenring (8),
a1_b_warren (7). The commonest failures are D2 (entry to door corridors clear,
18 layouts), D3 (entry view covers 60 percent, 15) and E3 (no body within 263 of
a door, 15).

A release gate should compare against these numbers and report ANY change in
either direction. Fewer failures is progress and should be recorded here. More
failures means a layout edit broke something the doctrine cares about, and is a
finding. A gate with nothing to compare against cannot do its job: this section
exists because one ran without it.

## Correction to the baseline above (same day, after play)

The section above framed 85 failures as an accepted baseline and the validator
as a ratchet. That was too generous and it was wrong in a specific way: nobody
checked whether the failures were things a PLAYER COULD SEE.

They are. The owner, playing the shipped build, reported that "doors on the
sides of the levels are not lined up correctly". That is predicate D2, "entry to
door corridors clear", which fails in 28 of 46 layouts and is the single most
common failure in the game. E3 (25) and D3 (20) are the same family: they are
all about whether a player entering a room can see and reach the way out.

So the numbers stand as a measurement, but their STATUS changes. These are a bug
list, not a baseline. The ratchet framing still applies to predicates that are
genuinely stricter than the shipped game intends; it does not apply to D1, D2,
D3, E3 and E4, which describe whether a room is navigable and readable on entry.

The lesson worth keeping: a validator baseline recorded without asking "would a
player notice this one?" converts real defects into accepted furniture.
