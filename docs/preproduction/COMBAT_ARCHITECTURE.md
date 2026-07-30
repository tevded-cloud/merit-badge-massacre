# COMBAT ARCHITECTURE

Date 2026-07-29. The combat, economy and run-shape pass for the game currently called Merit Badge
Massacre, working title PAST THE TREELINE. Serves the premise canon at
`docs/preproduction/PREMISE_2.md` and the creator rulings at the top of that file.

Assembled from three authored chapters, three skeptic passes and one completeness critic. Every
blocker and every major finding has been applied in place. There is no errata section: where a
claim was refuted it is corrected, dropped, or restated honestly where it stands. Where a skeptic's
number differed from a chapter's, the skeptic's number is used and the document says so. Where two
chapters contradicted each other, the contradiction is resolved and the losing chapter is named.

Evidence rules, inherited from PREMISE_2.md:97-105 `[spec]`. A repo claim carries a file and a line
opened in this pass, tagged `[code]` for shipped behaviour and `[spec]` for a design document.
Library claims carry the report path plus a section or line range. My own reasoning is
`[inference]`.

---

# THE ONE PAGE

**Growth.** One carried tool per survivor, no slots, no pickups, and it grows for the whole run off
a run-scoped counter called conviction (internal name only, never rendered as a word). Conviction
ticks once per armed room cleared and once more if that tool's own habit condition was met that
room, which lands a full clear at about 26 ticks. Damage grows on an uncapped decelerating power
law, cadence approaches a per-tool floor and never crosses it, and geometry is fenced so the tool
stops changing how it FEELS long before it stops changing its number. At run end the tool is 3.49x
damage and 5.45x throughput against room one. Three shape escalations fire at rooms 5, 13 and 21,
and each one is a choice of three mutually exclusive branches, so two Dez runs are not the same Dez
run. Conviction resets every night. Meta unlocks options, never strength.

**The five tools, one line each.** DEZ, rock bar, the verb is COMMIT: hold to wind, release to
swing, locked through the swing, breaks rather than cuts. JUNIOR, snare cable, the verb is PREDICT:
she aims at ground not bodies, placing anchored loops that arm, hold and rend. VIC, spotlight, the
verb is FIX: a held beam that slows one body, suppresses its attack and amplifies all damage it
takes, on a battery that drains held and recharges idle. HOLLIS, drip torch, the verb is DENY: his
attack input and his movement input are the same input, and he lays burning ground behind him.
MIKEY, wrist rocket, the verb is AIM: a charged single shot with travel time and no assist, from a
pouch of six bearings that persist on the floor as recoverable ammunition.

**The derived ability.** One button, unlabelled, charging one use per room entered and holding at
most two, so its frequency never compounds with its strength. Its SHAPE is selected by the leading
ledger family from six authored deliveries, its PAYLOAD is armed through the same trait substrate
the tool uses so its behaviour is the player's own item set run through `js/traits.js` rather than
anything written down, and its SCALE is the tool's damage multiplier times the square root of the
ledger count. It is gated behind one prototype question and ships as the static swappable active if
that question fails.

**HP and healing.** Pips, not points: Dez 8, Junior 6, Hollis 6, Vic 5, Mikey 5, every contact
damage re-authored as an integer of 1, 2 or 3, percentage armour replaced with padding charges that
each eat one whole hit, and a hard rule that no fractional term ever reaches `damageTaken`. Healing
is three survival objects and nothing else: the thermos you carry, the fire you sit at (priced in
scrip), and dry socks you find, for a life budget of about 17 pips across 27 rooms, which is one
mistake tolerated every 1.6 rooms.

**Where power comes from.** Room clears, not kills: one ledger pick per armed combat clear, three
per boss, one per loot cache, for 25.5 expected picks against the pool's own 26-pick invariant, with
zero bodies counted and the gem shower, the magnet and the XP rank machine all deleted.

**Death rotation.** Death ends the night and rotation happens at the roster layer, never inside a
run, because a mid-run body swap hands the player one extra life per survivor. What death takes is a
person: the fallen survivor walks back over a flat 2 nights, the same 2 every time, with no
escalation, no lifetime term and no banked debt (creator ruling 2026-07-30,
`docs/preproduction/RULINGS.md` `[spec]`, correction 2). The roster is Dez,
Junior and Mikey at the start, Vic arrives after run 3 and Hollis after run 5, and nothing on the
board can buy a survivor.

---

# THE RULINGS THIS SERVES

Restated from the creator's rulings. The ones this document had to INTERPRET are flagged, and where
an interpretation could have gone the other way the fork is named.

1. **ONE CARRIED TOOL PER CHARACTER, NO WEAPON SLOTS, NO WEAPON PICKUPS, UNCAPPED GROWTH.** Served
   directly. `DATA.WEAPON_SLOTS = 4` (`js/data.js:8`) and `DATA.WEAPON_MAX = 5` (`js/data.js:10`)
   `[code]` are deleted, and `computeWeaponStats` (`js/game.js:574-586`) `[code]` is replaced by a
   formula.
2. **ONE FLAGSHIP ABILITY DERIVED DYNAMICALLY FROM THE CURRENT BUILD.** Served, with one
   interpretation: I read "derived from the build" as derived from the ledger's family tally and
   trait multiset, not from the tool. The tool contributes only scale. If the creator meant the
   ability should also change SHAPE per character, that is five times the authored content and it
   is not what is designed here.
3. **CONSUMABLE TIER ACTIVES UNDERNEATH, SUBJECT TO THE SLOT PROBLEM.** Served and PAID, not
   dissolved. Three chapters independently invented three mutually exclusive consumable surfaces
   and all three were unpaid. Open call 27 is ruled in this document (chapter two, section 4) with
   the cost named. **Interpretation flagged:** I ruled that a carried object with a channel and no
   button of its own is not a slot under `BUILD_ARCHITECTURE.md:30-31` `[spec]`, because that test
   requires its own clock AND its own place on the screen. That is a reading of the test, and the
   architecture's owner can overrule it.
4. **HP IS SINGLE OR DOUBLE DIGITS, ISAAC-HEARTS-CLASS READABILITY. HEALING IS SURVIVAL AND CAMPING
   SUPPLIES.** Served. Only Dez at full growth reaches double digits (11).
5. **THE SURVIVORS-GAME LEFTOVERS DIE.** Served. Magnet, kill drops, gem shower and the XP rank
   machine are all deleted, and power is decided as room clears, not inherited.
6. **DEATH IS ROTATION, NOT GAME OVER.** Served. **Interpretation flagged, and this is the largest
   one in the document:** I read "the player continues as another unlocked seer" as continuing the
   CAMPAIGN on the next night, not continuing the same night in a new body. The entire stakes
   argument rests on that reading. If the creator meant a mid-run swap, the walking-back state
   survives (flat, two nights, per `docs/preproduction/RULINGS.md` `[spec]`), but a cost the player
   feels inside the night is owed and is not designed here. This is open call 1.
   The candidate lore mechanism from the rulings appendix (PREMISE_2.md:41-48 `[spec]`) was tested
   and the verdict is split: adopt it as the REASON, refuse it as the METER. Reasoning in chapter
   three, section 2.
7. **THE ROSTER STARTS AT THREE. LIFETIME-COUNTER UNLOCKS ARE DELETED.** Served. `js/roster.js:8-20`
   `[code]` is rewritten and the `cond()` closures on `META.lifetime` go with it.
8. **NO FIREARMS, CEILING IS A BB GUN.** Served, two arrivals and one hard rule, chapter one
   section 7.
9. **THREE ACTS, THE UNDERSTORY / THE SOG / THE BURN, ROOM TO ROOM WITH A CAMP HUB.** Served. Room
   counts unchanged at 8 / 9 / 10 (`js/rooms.js:156`, `:164`, `:172`) `[code]`. One act name is
   proposed for change (THE SOG to THE FLOWAGE) and it is open call 8, not a ruling.
10. **ART IS NOT MINE.** Served. Nothing in this document proposes a technique, a style or a
    pipeline. Every visual is described in words.
11. **FULL HUMAN VOICE ACTING IS THE TARGET.** Served, with a total. Every speaking beat is counted
    in one place (chapter three, section 4) and the silent-orphan hazard at `js/voice.js:77-94`
    `[code]` is answered with a required lint.

---

# CHAPTER ONE: THE CARRIED TOOL AND THE DERIVED ABILITY

## 1.1 The growth model

`computeWeaponStats(id, lvl)` (`js/game.js:574-586`) `[code]` walks `def.levels[]` with the loop
bound `i < lvl - 1 && i < def.levels.length`, so growth stops dead at the length of a hand-written
array, and the key `cdMul` MULTIPLIES into `st.cdFactor` while every other key ADDS. It is replaced,
not extended, by `computeToolStats(id, conv)`. `DATA.weapons[id].levels[]` is deleted from every
row (`js/data.js:39-138`). `base` survives.

```
dmgMul(conv) = (1 + conv / 5) ** 0.68              // uncapped, decelerating
cd(conv)     = cdMin + (cdBase - cdMin) * 0.5 ** (conv / 11)   // asymptotic floor
```

`cdMin`, `cdBase` and the per-tool geometry constants are per-tool data. Reach, area and projectile
count are CAPPED even inside an uncapped model, and the reasons are input reasons and not balance
reasons: a cadence below the human repress floor turns a manual tool into an auto tool and deletes
the character; a reach past the arena deletes aiming; a count past a small integer is a particle
budget.

**Conviction ticks on `onRoomClear`, and that hook does not fire in every room.** This corrects the
chapter's original claim of 27 to 54 ticks. `_tickClear` bails on `!this.armed` before it can call
`onClear` (`js/room.js:750`) `[code]`, `onClear` is the only path that emits `onRoomClear`
(`js/room.js:778`) `[code]`, and loot rooms clear through `_onObjective` instead, which sets
`state = 'cleared'`, opens the doors and emits nothing (`js/room.js:781-788`) `[code]`. `armed` is
set true at `js/room.js:481` `[code]` only where waves exist. So shop, lore, rest and loot rooms
tick nothing, and a shop room has no bodies so no habit condition can fire there either.

Expected emitting rooms per run, recomputed against the guarantee takeover the original chapter
missed (`js/run.js:536-551`) `[code]: a guaranteed type that never rolled TAKES OVER a slot where
`types[i] === 'combat'`, and slot 0 is sacred):

| Act | Beat-roll arming rooms | Guarantee takeover loss | Arming | Boss | Emits |
|---|---|---|---|---|---|
| 1 | 4.50 | 1.17 (shop 0.5, loot 0.67) | 3.33 | 1 | 4.33 |
| 2 | 5.17 | 0.67 (loot only, shop is a pure slot) | 4.50 | 1 | 5.50 |
| 3 | 6.33 | 0.67 (loot only) | 5.67 | 1 | 6.67 |
| | | | **13.50** | **3** | **16.50** |

At a habit-tick rate of 0.6, a full clear lands **26.4 conviction**, not 43 and not 54.

| | Room | conv | dmgMul | Dez cd (base 0.72, floor 0.40) | throughput |
|---|---|---|---|---|---|
| Mid act 1 | 5 | 5.3 | 1.63 | 0.635 | 1.85x |
| End act 1 | 8 | 6.9 | 1.80 | 0.607 | 2.14x |
| End act 2 | 17 | 15.7 | 2.63 | 0.519 | 3.65x |
| **Run end** | **27** | **26.4** | **3.49** | **0.461** | **5.45x** |
| Double-length loop | 54 | 52.8 | 5.28 | 0.412 | 9.24x |

The run-end row is mandatory and the double-length row exists so a future loop mode has a defined
answer rather than an overflow. Both rows are here because the original chapter's only tabulated
endpoint was a room that does not exist, and that omission is what let a 63x throughput hide.

**How the flat-multiplier failure is avoided, three ways.** Deceleration: double the run length and
the tool is 5.28x damage, not 7x. Split channels: damage climbs forever, cadence converges on a
floor, geometry is fenced, so the tool's feel stops changing long before its number does and the
player stops re-learning it. Branching escalations, three per tool at rooms 5, 13 and 21, each a
choice of three mutually exclusive options: 27 tool shapes per character from 9 authored
escalations, which is the design's only source of within-character run-to-run variance and is
adopted directly from the completeness critic.

**Escalations are room-indexed, not conviction-indexed.** The original chapter fired them at
conviction 9 / 18 / 27 and claimed they landed on act boundaries. They do not: act boundaries are
rooms 8, 17 and 27 (`js/rooms.js:156`, `:164`, `:172`) `[code]`, and at the real tick rate
conviction 27 arrives at the last room of the run, so act 3 would have received nothing. Rooms 5,
13 and 21 put exactly one shape change inside each act, before that act's boss.

**Escalations are silent.** No voice line, no toast. The tool changes and nobody comments, which is
the premise's own rule about the player not being told what they are doing.

## 1.2 The area clamp, fixed

The original chapter proposed feeding `conv` into `attackScale(area, dmgMul, lvl)` in place of `lvl`
and keeping the shipped clamp. That saturates in act 1 and kills the Geometry family's size axis.
`legacy = clamp(0.9 + (dmgMul - 1) * 0.65 + ((lvl || 1) - 1) * 0.09, 0.9, 2.3)` (`js/stats.js:340`,
with `AREA_LEGACY_MAX = 2.3` at `js/stats.js:105`) `[code]`. The damage term ALONE pins the clamp:
at dmgMul 3.49 the term is 1.62, and 0.9 plus 1.62 is 2.52, already over 2.3 with no level
contribution at all. Raising the ceiling only moves the saturation point.

**Ruling: freeze the legacy term.** It is a compatibility hack that folded the old hatchet's reach
into Area (`js/stats.js:100-103` says so in its own comment) `[code]`. Compute it once at run start
from the CHARACTER's base damage row and never again, so it sits in a narrow per-character band and
never moves with growth. `attackScale` then returns `clamp(frozenLegacy * area, 0.60, 4.00)` and the
Area stat alone drives geometry, all the way to its own cap of 4.00 (`js/stats.js:119`) `[code]`.
That is what makes the ledger's Geometry family worth taking at room 20, and the chapter's headline
claim (all qualitative variety comes from the ledger) now survives its own growth feed.

## 1.3 The five tools

**DEZ, rock bar, five feet of steel, seventeen pounds. The verb is COMMIT.** Hold to wind through
three visible stages, release to swing. Once released he is locked through startup and recovery and
cannot dodge out. The swing BREAKS: heavy stagger, prop destruction, knockback, no bleed. Growth
means weight, not speed, so he carries the highest `cdMin` in the cast and the largest damage
coefficient. Escalation branches: carry-through (no stop on kill) or a ground crack past the arc or
a wind that throws a body into other bodies. Bad at anything that will not stand still, at ranged
attackers, and at being interrupted, because the wind is a real window where dodging costs the
charge.

**JUNIOR, snare cable, pliers, stakes. The verb is PREDICT.** She aims at ground. Tap places an
anchored loop at the cursor, it arms in 0.6s, holds the first body across it and rends over the
hold. Live cap 3, growing to 6. Hold cinches every live snare at once. Growth means coverage and
persistence. Escalation branches: a cable run between two stakes (a snare becomes a line), or a
snare that re-arms once, or a snare that holds a second body. Bad at bosses (nothing that big is
held, so she chips), at open rooms with no chokepoint, at burst, and at the first three seconds of
any ambush because nothing is placed yet.

**VIC, a 12-volt spotlight on a battery in a pack frame. The verb is FIX.** A held beam on one body.
He deals almost no damage himself. A lit body is slowed hard, its attack is suppressed, and damage
it takes from any source is amplified. The battery drains held and recharges idle. Growth means the
meter and the multiplier. **Corrected against the HP chapter:** the spill cone re-targets unlit
enemies onto Vic only WHILE THE BEAM IS HELD, and dropping the beam drops the aggro. The original
tool chapter made the re-target unconditional, which at a 5-pip pool is a character who dies for
using his tool once. This is the tool chapter losing to the economy chapter's numbers, which it
never saw.

**HOLLIS, drip torch. The verb is DENY.** Hold the trigger while moving and he lays a burning line
behind him. His attack input and his movement input are the same input, which is the entire
character. Fire persists, creeps along dry ground, burns what stands in it. Growth means the ground.
Escalation branches: fire that jumps a gap, or fire that spreads perpendicular to the line, or fire
that leaves a slow scar after it burns out. Bad at anything airborne or fast enough to cross a line,
bad in wet terrain (act 2 is his bad act by construction, which is a feature), bad in enclosed rooms
where his own fire fences him in, and bad at burst.

**MIKEY, wrist rocket and a pocket of ball bearings. The verb is AIM.** A charged single shot, high
damage, travel time, no assist, from a pouch of 6. Reload is a deliberate 1.1s action, and spent
bearings persist on the floor as recoverable pickups, so her ammo economy is a movement problem:
shoot from cover, then walk your shots back up. That is the one thing no other tool does and it is
the argument for keeping the draft tool. Growth means the pouch and the precision. Bad at crowds,
bad at point-blank (a real minimum range where the rocket does nothing), and the reload is a death
window. **The pink hair stays cosmetic.** Building enemy aggro on a hair colour taxes a character
for a costume choice the creator fixed for identity reasons, and it would read as a punishment.

## 1.4 How items touch the tool

96 ledger items times 5 tools is 480 authored pairings if items name tools. The solve is already
shipped. `js/traits.js:494` declares three surfaces (`strike`, `carrier`, `field`) `[code]`,
`SCOPE_TABLE` fills 12 traits x 3 surfaces = 36 cells with exactly one `act` or one written `noop`
per cell, and `auditScopes()` (`js/traits.js:576-600`) `[code]` enforces that at load. The file's
own claim is the load-bearing one: "Adding the ninety seventh item adds no cells"
(`js/traits.js:486`) `[code]`.

Five rules on top:

1. **No item may name a tool.** Zero per-character items in the pool, keystones included.
2. **Every tool declares which surfaces it produces.** Dez: strike, field, carrier (late branch).
   Junior: strike, field. Vic: strike, field. Hollis: field, strike, carrier (late branch). Mikey:
   strike, carrier.
3. **Coverage rule: no tool produces fewer than two surfaces.** Vic satisfies it because his lit
   debuff is a FIELD parked on the body rather than a flag, which makes field-cell traits (giant,
   pierce, split) legal on him without inventing a verb.
4. **Carrier is thin early**, Mikey only until Dez and Hollis take a carrier branch at room 21. Do
   not fix that with a second pool. Fix it at offer time with a 0.25 weight multiplier on any item
   whose only acting cell is `carrier` when the current tool produces no carrier, using the weight
   machinery RULE 1 already specifies (`BUILD_ARCHITECTURE.md:516-522`) `[spec]`.
5. **Permanently forbidden to items:** changing a tool's input (never manual to auto), crossing a
   tool's `cdMin`, or adding a control surface.

Extend `auditScopes()` into a tool audit: 12 traits x 5 tools = 60 declarations, a fixed cost that
does not grow with the catalogue.

**The residual risk, named.** The audit proves an item is CORRECT on five tools. Nothing proves it
is FUN on five. An item can be mathematically live on Vic and pointless to take. That gap cannot be
automated and is paid in a per-tool balance pass, sized L.

## 1.5 The derived flagship ability

One button, unlabelled.

**Charging is decoupled from strength.** The original chapter charged it on damage dealt, which
compounds: damage dealt rises 5.45x over the run, so the recharge interval shortens 5.45x, and
multiplied by a linear uncapped magnitude term the throughput at run end was 63x room one. That is
the library's named failure verbatim (the uncapped snowball,
`D:\Programs\GameTev\research\genres\roguelike-roguelite\report.md` sec 6.3 comparative table).
**Ruling: it banks one charge per ROOM ENTERED and holds at most two.** Frequency is flat at about
27 charges a night regardless of build, and there is one meter in the game (conviction) plus one
counter (rooms), not three interacting ones.

**Inputs, all already computable.** The tool's surface set and current conviction; the six-family
tally on the ledger (`BUILD_ARCHITECTURE.md:490-502`) `[spec]`, whose families are the six at
`js/pool.js:41` `[code]`; and the acting trait multiset the substrate already maintains.

**Derivation, three steps.**

- **STEP 1, THE SHAPE.** The leading family, ties broken by most recent acquisition, selects one of
  six authored deliveries. GEOMETRY: a ring that expands from the player and keeps going. HEAT: a
  standing pyre. COLD: a hold that freezes everything in radius. MOTION: a dash that strikes the
  line. BLOOD: a pull that drags bodies in and hits once hard. TAKE: a tax that makes every body in
  radius drop its tin now and takes a share of it as damage. Six shapes is the entire authored
  content of the feature.
- **STEP 2, THE PAYLOAD.** The shape is armed through the same substrate as the tool. A ring is a
  field, so it takes every trait with an acting field cell. A dash is strike plus carrier. This is
  the genuinely derived part: the ability's behaviour is not written down anywhere, it is the
  player's own trait set run through `js/traits.js` `[code]`.
- **STEP 3, THE SCALE.** `magnitude = dmgMul(conv) * sqrt(1 + ledgerCount / 8)`. Sublinear on the
  ledger term deliberately, because a linear uncapped term outside the power law makes the word
  "deceleration" true only of the factor the author chose to plot. At run end (conv 26.4, ledger
  25.5) magnitude is 3.49 x 2.05 = **7.15x**, against a flat frequency. Radius runs through the
  shipped clamps so it cannot exceed the arena.

**What the player sees change, and how they learn it.** Four surfaces in order of load: the ledger
pickup card carries a one-line delta on the ability, which surfaces the derivation at the instant of
choice, which is the only instant that teaches; the button icon is a live silhouette of the current
shape and animates on change; the icon sits at the end of the family strip
(`BUILD_ARCHITECTURE.md:718-722`) `[spec]` so cause and effect are physically adjacent; and one
voice line per character on the FIRST shape change of a run only, five lines shipped, with the
remaining 25 (five characters times six shapes) written and held until the prototype says they are
worth recording.

**Honest comparison with the static swappable active it replaces** (`DATA.skills`, three entries,
all `locked: true` at `js/data.js:672-685`, runtime at `js/game.js:2074-2354`, flat cooldowns
deliberately not multiplied by `cdMul` at `js/game.js:2086-2088`) `[code]`. The static one wins on
four counts: it is readable, it is tunable in one place, it has no derivation bugs, and the player
CHOOSES it, which is agency the derived one takes away. The derived one wins on exactly one, and it
is the one the game is betting on: it makes 26 separate ledger picks legible as a single face. The
research library found no precedent for an ability whose behaviour is computed at runtime from build
state, across all twelve reports, so there are no known pitfalls to design around, which is a risk
and not a compliment.

**The gate, and it is a real gate.** Six shapes is a small number, and the per-family acquisition
cap of six against 26 picks (`js/pool.js:39-43`, and the file's own comment that six times six is 36
against 26 picks, a 38 percent margin) `[code]` makes it likely a player's leading family stabilises
early and then stops moving, because they hit the cap on the family they are leaning into. **Ship
condition: instrument the derivation and log leading-family changes across 30 runs. Median three or
more shape changes, ship the derived ability. Under three, ship the static active and keep the
derivation as a post-launch swing.**

## 1.6 The BB gun

Two arrivals from ruling 6, and one hard rule.

**As a late survivor's carried tool.** The highest single-shot damage in the game, a real reload,
and one property nobody else has: a Signed thing at full belief cannot be hurt
(`STORY_DESIGN.md:45-48`, relayed through PREMISE_2.md ch2 sec 1) `[spec]`, and his is the only
certainty on the ridge large enough to argue with theirs, so his shot is the one thing that opens
them. He believes it is a rifle, and on this ridge that is the same as it being one.

**As a legendary drop for the existing five.** It cannot become their tool, because you cannot pick
up someone else's certainty. So it is not a tool, it is the one shot already in it: found loaded,
fired once on a confirm prompt, then it is a stick. No slot, no storage, no growth.

**Hard rule: the BB gun never grows. Conviction is zero on it, forever.** It is the only object in
the design with a fixed number, and that is the point, because it belongs to someone else.

## 1.7 What is not true that the original chapter claimed

- The chapter sized "Vic's beam and Junior's placement have no analogue in the `switch (w.id)`" as a
  two-tool greenfield. **Junior's placement is shipped.** `case 'firecracker'` (`js/game.js:1575`)
  `[code]` reads `p.in.aimX/aimY`, clamps to `Stats.reachOf(st.range, bs.reach)`, runs
  `Collide.segmentBlocked` to pull the target back off a wall, and arms a fused field object through
  `armField` (`js/game.js:1575-1600`) `[code]`. That is her tap, arm delay and anchoring. `canteen`
  (`js/game.js:1623`) `[code]` is a persistent grounded field, which is Hollis. **Vic's held
  single-target beam is the only greenfield tool.** The implementation row is re-sized accordingly.
- The chapter routed bugspray to "the strike clock." It is a field: its base is
  `{ radius, dps, tick, slow }` (`js/data.js:106-115`) and it is FIELD CALL SITE 6 of 6
  (`js/game.js:1463`) `[code]`. It becomes a ledger item on the field clock.
- The chapter cited `js/game.js:697` as proof that touch-to-grant already exists. That line is
  `owner.hp = Math.min(owner.maxhp, owner.hp + 30)`, the empty-pool chest fallback inside
  `grantChest` (`js/game.js:693-700`) `[code]`, not a contact site.

---

# CHAPTER TWO: HEALTH, DROPS, AND WHERE POWER COMES FROM

## 2.1 The HP reframe

Reference pool 6, derived by dividing today's cast by 100/6 = 16.667, which reproduces the shipped
ladder exactly (Max 100 at `js/data.js:18`, Junie 85 at `:26`, Gus 140 at `:34`) `[code]`.

| | Pool | Derivation |
|---|---|---|
| DEZ | 8 | Gus 140 / 16.667 = 8.4, floored |
| JUNIOR | 6 | Max 100 / 16.667 = 6.0, the reference body |
| HOLLIS | 6 | Reference body; burn crew, terrain, not tanky |
| VIC | 5 | Junie 85 / 16.667 = 5.1, floored |
| MIKEY | 5 | Placed at Vic's number. Not derived, and see below |

**Mikey is 5, not 4, and the economy chapter's own recommendation is overruled.** It recommended 4
on the argument that a roster with no fragile body wastes the legibility the pip scale buys. It made
that recommendation without the tool chapter's numbers. Worst-case incoming is 3 pips per hit and
hits land every 0.7s, so a 4-pip Mikey dies in two act-3 charger touches, 0.7 seconds apart, while
her core loop is a 1.1 second reload. Her time to death would be shorter than her own reload. That
is not a glass cannon, it is a character who cannot use her tool in act 3. She keeps 3 dodge charges,
which is where her fragility lives instead.

**Rounding, explicitly.** `Stats.damageTaken` uses `Math.round` on `(dmg - armourFlat) * (1 -
armourPct)` with a floor of 1 (`js/stats.js:357-358`) `[code]`. At 100 HP, rounding is noise worth
1%. At 6 pips it is 16.67% of a life. **Rule: no fractional term may ever reach `damageTaken`.**
Contact damage is authored as an integer, armour subtracts integers, `Math.round` becomes a no-op
that stays in place as a guard, and `DATA.dmgScale` (`js/data.js:328`) `[code]` is removed from
`js/director.js:193` (contact), `:233` (shots) and `:325` (bosses) `[code]`.

**The damage table, with the shot row the original chapter omitted.** `js/director.js:233` is
`e.shotDmg = d.shotDmg * DATA.dmgScale(m) * teeth` `[code]`, projectile damage, not contact, and the
original table had no row for it. Owl 9, stiltheron 11 and bogfrog 8 shots would either keep raw
values (vaporising any pool) or lose scaling with nothing authored in their place.

| | Act 1 | Act 2 | Act 3 |
|---|---|---|---|
| Chaff contact (squirrel, bat, ticktot class) | 1 | 1 | 1 |
| Heavy contact (raccoon, beaver, badger class) | 1 | 2 | 2 |
| Charger contact (boar, ashelk class) | 2 | 2 | 3 |
| **Ranged shot** (owl, stiltheron, bogfrog class) | **1** | **1** | **2** |
| Boss telegraphed hit | 2 | 3 | 3 |

**The pips-per-second ceiling, restated correctly.** The original chapter claimed a flat 1.43 pips/s
and a 4.2 second death for a full Junior. `p.iframe = 0.7` after every hit (`js/game.js:1032`) and
the bail on `p.iframe > 0` (`js/game.js:1018`) `[code]` cap HITS per second, not PIPS. The honest
numbers: chaff-only worst case is 1 pip per 0.7s = **1.43 pips/s**; act-3 charger or boss contact is
3 pips per 0.7s = **4.3 pips/s**. Hits land at t = 0, 0.7, 1.4, so a 6-pip Junior against pure chaff
dies on the sixth hit at **3.5 seconds**, not 4.2, and death is at `p.hp <= 0` (`js/game.js:1043`)
`[code]` so she survives five touches, not six. An act-3 Junior in charger contact dies on the second
touch, 0.7 seconds after the first. That worst case is what the padding system exists to answer.

**Armour becomes padding.** `armourPct` is dead at pip scale: 15% of a 2-damage hit rounds back to 2.
`armourFlat` is worse the other way, because the shipped design bets on flat 11 putting every chaff
body on the 1-damage floor, which is stated in the code's own comment as "the entire reason Gus can
stand still in a crowd" (`js/game.js:1019-1026`) `[code]`. At 6 pips that bet makes a tank immune to
two thirds of the roster. **Replace both rows with PADDING: an integer count of charges, each
absorbing one full incoming hit regardless of its size, refilled only at THE SIT.** Dez starts with 1
(converting his ancestor's `armor: 2`, `js/data.js:34`) `[code]`, everyone else 0, ledger items add
charges, ceiling 4. Padding renders as pips of a different SHAPE beside the health pips, which is the
Isaac soul-heart grammar (`research/game-systems/binding-of-isaac-experience-ledger/report.md`
lines 102 and 116). **Flagged as an unchecked channel:** shape is the only thing distinguishing
padding from health, and nobody has verified that reads at the game's icon size or under colour
vision deficiency. That belongs to the accessibility owner.

**Every percentage-of-max-HP effect, and what it becomes.**

| Site | Today `[code]` | At pip scale | Ruling |
|---|---|---|---|
| Second Wind revive, `js/game.js:1047` | `ceil(maxhp * 0.4)` | 6 to 3 | **Deleted entirely**, see 2.5 |
| Low-HP bark, `js/game.js:1031` | `hp < maxhp * 0.3` | fires under 1.8 | Keep, fire at `hp <= 1` |
| `firstaid` regen, `js/data.js:142` | +0.6 HP/s per rank | refills a pool in 10s | Delete the passive |
| Level-up heal, `js/game.js:724-725` | +6 HP, +2 maxHP | a full pool per rank | Delete both; the rank machine dies anyway |
| `smore`, `js/data.js:313` | +40 HP | 6.7 pools | Delete |
| `patch`, `js/data.js:314` | +10 maxHP, +10 HP | +167% max | Delete |
| `cocoa` pickup, `js/game.js:1994-1997` | +25 HP | 4.2 pools | Delete with the drop table |
| Empty-chest fallback, `js/game.js:697` | +30 HP | 5 pools | 1 pip |
| `fieldstrip` skill, `js/game.js:2259-2271` | 30 coins to 30 HP | 5 pools | 12 scrip to 1 pip, max 2 per use |
| `addMaxHp` clamp, `js/game.js:566-571` | 40 to 600 | nonsense | 3 to 12 |
| Damage numbers, `js/game.js:1041` | `'-' + taken` | always "-1" or "-2" | Delete; the class floor bans them anyway (ENEMY_DESIGN.md:44, :123) `[spec]` |

Max-HP growth becomes a rare supply find worth +1 pip, hard cap 3 per run. Ceiling: Dez 8+3 = 11,
everyone else 8 or 9. **Only Dez reaches double digits**, which satisfies ruling 4.

## 2.2 Healing as supplies

**The two healing designs in the pile are merged, and the run chapter wins on placement while the
economy chapter wins on value.** The economy chapter's FIRE was rest-room-only at a one-in-three
roll; the run chapter's SIT was a placed prop in every act, guaranteed, with a free 1 pip. Neither
survives alone: a one-in-three roll makes the healing budget a lottery, and a free guaranteed heal is
50% of a pool per run for nothing. They are the same object and they merge.

**THE SIT.** A fire ring placed as a prop in the `loot|rest|lore` slot of every act (index 6 of act
1, index 7 of act 2, index 8 of act 3, `js/rooms.js:157`, `:165`, `:173`) `[code]`, whatever type
that slot rolled, near the existing type-filling special case at `js/run.js:568` `[code]`. It does
not consume a room slot, which matters because 8 rooms cannot guarantee shop, loot AND rest.
**Sitting costs 15 scrip**, restores up to 2 pips, refills the thermos by one pull and refills all
padding charges, takes 6 seconds and is uninterruptible. Once per act. The scrip price is the answer
to the unpriced-heal finding, and it puts healing in direct competition with the shop, which gives
the run its second real opportunity cost.

**THE THERMOS.** Carried, never a pickup, 3 pulls at run start. One pull is 1 pip, takes 1.4s
standing still, and cancels if you take a hit with the pull spent anyway. Refills +1 at each SIT,
back to 3 at camp. Its slot cost is ruled in 2.4.

**DRY SOCKS.** One hand-placed ground find per act, guaranteed. +1 pip on pickup, instant.

**The run's health budget.** Thermos 3 plus 3 refills = 6. SIT 2 x 3 = 6, if the player pays 45 scrip
across the night. Socks 3. **Ceiling 15 pips of healing on top of a 6-pip pool, so a full clear is
about 17 pips of life across 27 rooms if the player buys every sit, one mistake tolerated every 1.6
rooms.** That number is the balance dial and it is the single number to tune.

Trivial-healing is avoided three ways: the count is capped rather than a drop table, every heal costs
standing time in a game where standing still is how you die, and the sit costs currency. Never-heal
is avoided one way: the thermos is carried, not found, so a bad room seed can never leave the player
with no recovery. The fiction stays out of the way. Nobody says why a hot drink works and Brock does
not explain it.

## 2.3 The dodge economy

The library's only sourced datum on small pools raising dodge value is Brotato's i-frame formula,
`0.4s x (% of max HP taken / 15%)` with **a minimum of 0.2s and a maximum of 0.4s**
(`D:\Programs\GameTev\research\game-systems\survivors-horde-systems-floor\report.md:222`, SOURCED
from the Brotato wiki, advisory grade, row still OPEN). The original chapter quoted the formula
without its cap and computed 0.445s, which the formula's own bound forbids. At 6 pips one pip is
16.67% of max, so the formula returns its capped **0.4s**, and the shipped post-hit grace of 0.7s
(`js/game.js:1032`) `[code]` is **1.75x** what the small-pool formula would give. So the post-hit
window needs no change and none is proposed.

The DODGE is a separate window and it does change. Today: Max `iframe 0.30, cd 1.0, charges 1`; Junie
`0.24 / 0.8 / 2`; Gus `0.34 / 1.4 / 1` (`js/data.js:495-506`) `[code]`. At pip health a missed dodge
costs a sixth of the run's body, so charge scarcity stops being a skill test. **Every character gets
at least 2 charges and the character difference moves into the trait, not the count.**

| | spd | dur | iframe | cd | charges | trait |
|---|---|---|---|---|---|---|
| DEZ | 520 | 0.24 | 0.34 | 1.4 | 2 | barge (Gus's row, `knock 260, stun 0.3`, `js/data.js:504`) |
| JUNIOR | 700 | 0.13 | 0.24 | 0.9 | 2 | drops a stake at the start point |
| VIC | 620 | 0.17 | 0.30 | 1.1 | 2 | beam drops on dodge and must be re-acquired |
| HOLLIS | 600 | 0.18 | 0.30 | 1.1 | 2 | trail burn (Junie's row, `dps 6, dur 1.2, r 26`, `js/data.js:500`) |
| MIKEY | 720 | 0.12 | 0.24 | 0.85 | 3 | none; the fragile ranged body buys the most charges |

At 2 charges on a 1.1s per-charge timer a 90 second room offers about 81 dodge availabilities.
**Dodge is not the scarce resource; the pool is.** That is the correct arrangement at pip health,
because it puts failure on reading the room rather than on a cooldown readout.

## 2.4 The consumable ruling: open call 27, closed

Three chapters invented three mutually exclusive consumable surfaces and all three were unpaid. The
tool chapter said no slot and ground-only. The economy chapter carried a thermos with charges, a
channel clock and an activation input. The run chapter said "burn a camping supply" and admitted it
was blocked. This is the ruling, with the cost named.

**There is no new consumable slot. There are three surfaces and each one is paid.**

**1. THE THERMOS rides the existing interact input as a context verb.** The architecture's test is
that a thing needing its own clock AND its own place on the screen is a slot
(`BUILD_ARCHITECTURE.md:30-31`) `[spec]`. The thermos has neither: its charge count renders as three
small marks INSIDE the health pip row, which is an existing fixture and not a new position, and its
channel is a 1.4 second one-shot with no cooldown, which is not a clock in the architecture's sense.
**The cost, named honestly:** the interact input is shared with world props, so pressing it near a
prop does the prop and not the thermos, which means in a prop-dense room the player cannot reliably
drink. That is a real cost and it is the price of not buying a button. Mitigation: the thermos wins
the input whenever the player is at 2 pips or below, which is the only time it matters.
**Interpretation flagged:** this is a reading of the slot test, not a derivation from it, and
`BUILD_ARCHITECTURE.md:396` `[spec]` (the active skill owns the only button) is respected only
because the thermos does not get a button. The architecture's owner may overrule.

**2. GROUND ONE-SHOTS are collected on a true overlap, and this only works because of ruling 5.** The
tool chapter's "walk over it" decision does not exist in the shipped engine: pickups are pulled
toward the player from `magnetR * 0.8` and collected at 20px (`js/game.js:1987-1993`) `[code]`, where
`magnetR = st.pickupRadius` (`js/game.js:546`) `[code]` with a base of 65 rising to 420
(`js/stats.js:133`, `:210`) `[code]`, so a stacked player suctions everything from 336px, which is
most of a room. But ruling 5 deletes `pickupRadius` from the stat frame entirely, and the pull goes
with it. **So the compensation is real, and it is real only as a consequence of the drop deletion.**
Firecracker becomes a ground one-shot (touch, fuse, bang where it sits). Bugle becomes a ground
one-shot with its scout skin replaced by a hand-crank siren, same stun ring.

**3. THE SIT is a prop interaction priced in scrip**, per 2.2. It is not a carried object and needs
no surface at all.

Canteen and bugspray are NOT consumables: both are persistent grounded fields (FIELD CALL SITE 3 and
FIELD CALL SITE 6, `js/game.js:1623`, `:1463`) `[code]` and both become ledger items on the field
clock, which `BUILD_ARCHITECTURE.md:30-31` `[spec]` already permits at zero cost.

## 2.5 Killing the survivors leftovers

| Site | Today `[code]` | Replacement | Size |
|---|---|---|---|
| `js/data.js:651` | dash trait `{ t: 'magnet', r: 190, pull: 3.4 }` | the trait vocabulary loses `magnet`; that demonstration relic re-authors to a padding-charge trait | S |
| `js/game.js:990-994` | litter counter, cocoa at 0.015, magnet at 0.006 | the whole `else` branch deleted; nothing drops from a non-boss body | S |
| `js/game.js:546` | `this.magnetR = st.pickupRadius` | `pickupRadius` leaves the stat frame; `lodestone` (`js/data.js:145`) is deleted and Gus's `pickup: 0.25` row field (`js/data.js:34`) has no successor | S, touches the stat spec |
| `js/game.js:1963-1982` | gem attract-and-collect loop | deleted whole; there are no gems | M |
| `js/game.js:1983-2006` | pickup attract loop with the cocoa/magnet/chest branch | retained for one type, `supply`, at a fixed 20px overlap and no attraction radius | M |
| `js/hooks.js:57` | `'gem' \| 'cocoa' \| 'magnet' \| 'chest'` | `'supply' \| 'cache'`. `EVENTS` is a closed list and `on()` rejects a typo out loud (`js/hooks.js:48-58`) `[code]`, so every item authored against `'gem'` fails at registration rather than silently | S to change, M to sweep authors |
| `js/game.js:998-1014` | `dropGems` and its 400-gem fold | deleted | M |
| `js/game.js:715-730` | `gainXP` and the rank machine | deleted, with `DATA.xpNext` (`js/data.js:322`) `[code]` | L |

**What the screen looks like after a kill.** Everything needed is already shipped and stays: the
`pop` sound (`js/game.js:966`), the puff (`js/game.js:967`), the corpse squash-flash
(`js/game.js:969-971`) and the single escaping wisp (`js/game.js:972-977`) `[code]`. Nothing travels
toward the player. Nothing waits on the floor. **And nothing counts on the HUD either:** see 2.7.
The player's eye never leaves the live enemies. What is deleted along with the objects is the sweep
pass, the walk over the floor after the fight ends. I estimate 8 seconds per combat room across
13.5 arming rooms, about 1.8 minutes of a 17.63 minute night (night length at
`BUILD_ARCHITECTURE.md:913` via ENEMY_DESIGN ch3) `[spec]`, roughly 10% of the run. **The 8-second
figure is my estimate and nobody has measured it `[inference]`.**

**Second Wind is deleted, and the economy chapter loses this one.** The economy chapter's table kept
it and converted the revive to a flat 1 pip. The run chapter deleted it as the single shipped
mechanic that cancels the death-rotation pillar, and the pillar is a creator ruling. A revive bought
with permanent currency is exactly the accumulated-power substitution the meta-features report warns
against (`research/game-design/game-meta-features-systems/report.md:527`, and the concern developed
at `:529` and `:532`). **The orphans, all of which the original break lists missed:** the banked 400
in `upgrades.secondwind` with no refund path, because `META.upgrades` never decreases
(`js/meta.js:96-104`) `[code]`, so the save migration must refund it to `badges`; the `revived` field
in run save and load (`js/game.js:2440`, `:2543`) `[code]`; three characters' revive barks
(`js/dialogue.js:13`, `:30`, `:47`) `[code]`; and the `'revive'` entry in `PRIORITY_ORDER`
(`js/voice.js:33`) `[code]`.

## 2.6 Where power comes from, decided

**ROOM CLEAR. Not kills. Not hybrid. And the tool grows on the same event.**

Three arguments. First, the library's position for this class is explicit: the roguelite-dungeon
floor's power path is room rewards and its anti-floor excludes XP levelling outright
(`research/game-systems/roguelite-dungeon-systems-floor/report.md:286`, "HADES and ISAAC have no XP
leveling"), while kill-driven XP is the survivors-horde floor. The game is room to room with a camp
hub. Second, kill income only reads because the gem shower renders it, and ruling 5 deletes the
shower, so kill income with no floor objects is an invisible counter. Third, hybrid needs both
readouts on a HUD that has no room for either yet.

**And the tool grows on rooms too. The economy chapter's `r = floor(hits / 40)` formula is STRUCK.**
This is the largest contradiction in the pile and neither skeptic caught it: the economy chapter's
own headline is "ROOM CLEAR, not kills" and then it gave the game's central growth object a per-hit
counter, which is kill-driven power wearing a different word. It also derived its 2519 hits from 2.2
mean hits per body, which is a Max-shaped reference figure (ENEMY_DESIGN.md:117, :284) `[spec]` from
a cast the premise deletes, and Junie's shipped figure on the same page is 5.24. **Chapter one owns
tool growth, the meter is conviction, and the event is `onRoomClear`.**

**Re-derived income, against the guarantee takeover.** The original chapter counted 16.0 arming
combat rooms and 25.0 picks by banking the loot guarantee's +3 while ignoring that the same
mechanism deletes about 2.5 combat clears. Corrected arming rooms are 3.33 / 4.50 / 5.67 = **13.50**
(table in 1.1), so at 1 pick per arming clear, 2 per boss and 1 per loot cache the total would be
13.5 + 6 + 3 = **22.5**, which is 13% under the pool's own invariant of 26
(`LEDGER_PICKS_PER_RUN = 26`, `js/pool.js:43`) `[code]`, not 4%.

**Fix: the boss pays 3, not 2.** One authored constant, it concentrates reward on the run's biggest
beats and it needs no new room logic. Total expected picks = 13.5 + 9 + 3 = **25.5 against 26**, a
2% gap. The clear payout already fires from `_tickClear` through `onClear` when `this.armed`
(`js/room.js:749-778`) `[code]`, so the vehicle exists and only the payload changes from
`gainCoins` to a pick.

**Against ENEMY_DESIGN.md chapter 3.** It holds spawn tables and per-kill xp fixed and protects a
3.5% margin (4933 credited against 4760 cumulative for 30 ranks). Under a room model that margin
analysis is void and it is not preserved. Income stops being a function of bodies, so rank count
stops being a measured outcome and becomes an authored constant, which is strictly easier to defend
than a model whose own author calls the elite counts (3, 5.5, 11) the softest numbers in the chapter.
Its TTK bands survive untouched: they govern hits per body, which this model does not price.

**WALK ON, and this is the answer to the critic's strongest argument.** Every ledger draft carries a
fourth option: decline the pick and walk on. It costs the pick and it buys nothing except that the
ledger count did not move. This is added because the completeness critic is right that a build with
no scarcity is a checklist and taking everything is the dominant strategy, and because without it
the sight cost is an unavoidable debuff accrued by playing correctly, which players read as bad
tuning rather than as theme. WALK ON does not contradict `BUILD_ARCHITECTURE.md:406` `[spec]`
(single-acquisition, never leaves the build), because nothing leaves; it only means the player can
decline. It is the cheapest possible version of "refusing pays," and it is what makes the sight cost
a price at the point of decision, which is what PREMISE_2 chapter two says it is.

**And sight has to be worth keeping, so it pays two concrete things.** In the Light band the room's
roster is readable from the door before the doors close, which is AUTHENTICITY's own stated payoff
for layer 2 (`AUTHENTICITY.md:1220`, "the load bearing one, and the recommendation") `[spec]`, and
in the Light band THE CROSSING shows the next act's route so the player chooses which act entrance
they take. Route choice is concrete, it is not damage, and it is also something the board can sell.

## 2.7 Tin, scrip, and the sight bands

**Tin is Reading-only. It never appears during a run.** The economy chapter contradicted itself here
and it loses its own section 5: it claimed both "the only readout is the tin counter ticking in the HUD" and
"tin never appears during a run, so they never share a screen." Those cannot both hold, and the
never-share-a-screen rule is the stronger of the two, because it is the strongest anti-confusion
measure available and it costs nothing. Tin still accrues on the shipped `onKill` emit
(`js/game.js:963`) `[code]`; it is simply not rendered. In-run kill feedback is the tin sound and
the room's falling threat count, which the chapter's own section 6 argument accepted as sufficient.

**Tin income, solved backwards instead of guessed forwards.** The economy chapter invented a 0.25
chaff token rate with no source, multiplied it by body counts whose elite figures that document
calls its own softest numbers, and then derived a board price from the product. That is a guess times
a soft estimate. Inverted: pick the board target first and solve for the rate, then treat the BOARD
PRICE as the dial when a real rate is measured.

Target: a 16-entry board completed in about 20 nights. Rates: chaff carry a token 35% of the time,
elites pay 6, bosses pay 30.

| Act | Bodies | Chaff tin (x0.35) | Elite tin | Boss tin | Act total |
|---|---|---|---|---|---|
| 1 | 282 | 98.7 | 3 x 6 = 18 | 30 | 146.7 |
| 2 | 324 | 113.4 | 5.5 x 6 = 33 | 30 | 176.4 |
| 3 | 539 | 188.7 | 11 x 6 = 66 | 30 | 284.7 |
| | | | | **Full clear** | **608** |

Body and elite counts from ENEMY_DESIGN.md:279-281 `[spec]`, which are themselves soft. At a modelled
55% mean night, 334 tin, a 6,400 tin board completes in **19.2 nights**.

**The board sells options, and the original chapters between them named none.** The economy chapter
priced a 24-entry board of "options only" without naming one option, and the run chapter said the
roster is the ONLY thing permanent progression grants, which cannot both be true. **Resolution: the
run chapter's claim is too strong and is narrowed.** The roster is the only PERSON progression
grants. The board sells 16 entries in two tiers of 8:

- **STARTING KIT VARIANTS**, 8 entries at 200 tin. Each is an option chosen at send-off, ONE at a
  time, so owning more is more choices and never more strength in a single night. Class examples: a
  thermos that starts at 4 pulls instead of 3; a starting padding charge; 10 scrip in the pocket; the
  night's first room entered with the tool already at conviction 3.
- **CAMP FIXTURES**, 8 entries at 400 tin. Things at camp that change what the player can see or do
  BETWEEN runs, never inside one. The field guide's completed pages, the tally post's second column,
  a bench at the gate, the pinboard's second layer (`js/camp.js:832`) `[code]`.

Board total = 8(200) + 8(400) = **6,400 tin**. A third tier of world options (a fourth act 1 layout,
a chooseable act 2 route at the crossing, the BB gun's owner arriving earlier, an opt-in harder
night) is designed but NOT priced and NOT shipped in this pass, because it needs the most new systems
and because a board the player can see the end of is a board they engage with.

**Scrip: delete the conversion.** Verified exactly: `DATA.COINS.convert: 2` (`js/data.js:558`)
`[code]`, applied once in `showOver` (`js/ui.js:905-913`) `[code]` under a `_cashedOut` guard, so
each leftover coin pays 2 badges once at dawn or death. At 608 tin per full night, a player hoarding
300 scrip would be paid 600 tin, 99% of a whole night's income from bodies, for declining every
in-run choice. Delete it. Unspent scrip is lost at dawn, the Quartermaster says so once, and the last
act-3 shop (`js/rooms.js:173`, slot 4) `[code]` always stocks a sink priced to empty a typical purse.
The SIT's 15-scrip price gives scrip a second sink all night, which strengthens the deletion rather
than weakening it.

**Non-collision.** Tin never appears during a run. Scrip never appears at camp. They never share a
screen. Different icon, different corner. The fiction holds it: scrip is camp-store credit nobody
believes in, tin is proof of witness, and a thing with no belief in it cannot buy a thing that is
only worth what it saw.

**The sight bands, derived off the corrected model.** Cumulative expected picks with the boss at 3:

| Boundary | Cumulative picks |
|---|---|
| End of act 1 | 3.33 + 3 + 1 = **7.33** |
| End of act 2 | 7.33 + 4.50 + 3 + 1 = **15.83** |
| End of act 3 | 15.83 + 5.67 + 3 + 1 = **25.50** |

**LIGHT 0 to 7. SETTLED 8 to 15. CERTAIN 16 and up.** Settled opens within two thirds of a pick of
the act 1/2 boundary and Certain within one sixth of a pick of the act 2/3 boundary, which is
precisely what the premise asked for: "you lose the pre-room roster read exactly as act 3 arrives"
(PREMISE_2.md:1229-1231) `[spec]`. These are derived, and the derivation depends on the boss payout
being 3. At the original payout of 2 the boundaries fall to 6.3 and 13.8 and the bands stop lining
up, which is worth stating because it means one authored constant is holding two systems together.

**Band 3 does not remove the sign. It removes the READ.** PREMISE_2.md:1233-1243 `[spec]` routes band
3 to AUTHENTICITY's owner and marks per-room suppression of baked ground sign as UNVERIFIED. The
resolution offered from this side: the sign stays baked and stays true, so
`AUTHENTICITY.md:1233-1235`'s "the finds are the lesson and the ground is the exam" `[spec]` survives
whole. What Certain takes is legibility at a glance: sign renders at reduced contrast and ambiguous
form, so the player must walk the ground rather than scan it from the door. That costs one render
parameter, needs no per-room bake suppression, and turns an L into an S. AUTHENTICITY's owner still
rules; this is a cheaper option for them to rule on, not a ruling.

**The bands are still blocked on the ledger counter, which does not exist.** `DATA.PASSIVE_SLOTS = 4`
is live at `js/data.js:9` and gates offers at `js/pool.js:163`, `DATA.WEAPON_MAX = 5` is live at
`js/data.js:10` and gates at `js/pool.js:149` `[code]`, and the family strip is a proposal at
`BUILD_ARCHITECTURE.md:723` `[spec]`, not shipped. Blocked on the 3.0 ledger unit.

**And the coupling is deliberate, which no chapter said out loud.** The ledger count is the sight
band input AND the flagship's scale term. The sight cost and the power spike are therefore the same
number moving in the same direction. That is not an accident and it is not a bug: PREMISE_2 chapter
two says certainty is one faculty and certainty spent on gear is certainty not spent on the woods.
One number, one direction, IS the design. **Chapter two owns the counter. Chapter one reads it.**

---

# CHAPTER THREE: THE RUN SHAPE, DEATH ROTATION, AND WHAT THINGS ARE CALLED

## 3.1 Death rotation

**Death ends the night, always. Rotation happens at the roster layer, never inside a run.** A mid-run
body swap hands the player one extra life per survivor, which is the collapse the library documents
(`genres/roguelike-roguelite/report.md` sec 1.3, "risk trivializing the run and replacing skill with
accumulated power," plus failures #6 and #10). **This is the document's largest interpretation and it
is open call 1.**

**The instant HP hits 0.** Everything shipped stays: `bark('death')`, `Run.clearSave()`,
`phase = 'dying'`, the hat flying off, the defeat sting (`js/game.js:1058-1075`) `[code]`. Three
fields are added to META:

```
META.walking = { }   // charId -> the META.runs value at which they are back
META.falls   = { }   // charId -> lifetime falls, a record the Reading can speak, never a lever
META.arrived = [ ]   // charIds whose arrival scene has played
```

**The write happens INSIDE `credit`, after `this.runs++`, and the original chapter got this wrong.**
`META.credit` increments `runs` at `js/meta.js:125` `[code]`. Written BEFORE credit, `runs` is still
R and `walking = R + 2` brings the survivor back a night early, because the night that just ended
has not been counted yet. Written AFTER credit, `runs` is R+1 and the survivor sits out the stated
two nights:

```
META.falls[id] = (META.falls[id] || 0) + 1;              // a record, never a term in the walk
META.walking[id] = META.runs + 2;                        // flat, always 2, never escalates
walking(id) = META.runs < (META.walking[id] || 0)
```

Every fall: 2 nights out. The same 2 whether it is the first fall or the fortieth.

**The empty roster needs no special case, and that is a consequence of the flat walk rather than a
lucky accident.** Worked through: a 3-roster and a death every night leaves exactly one sendable
survivor on every night and never zero, because a flat two-night walk returns the first faller on
night 4, which is the same night the third faller leaves. There is no zero-sendable branch, no
immediate short walk, and no debt to bank or forgive. The escalating version was struck because its
bite was inversely proportional to how much the player needed it: benching the survivor a struggling
player is still learning removes exactly the per-character transfer the genre's skill model depends
on, since under ruling 1 the tool IS the attack and mastery is per character
(`GROUNDING_AUDIT_1.md:108-109` `[spec]`, sourcing `game-design/game-meta-features-systems/report.md:526`
and `genres/roguelike-roguelite/report.md:110`). The harsher version belongs on the opt-in ladder and
nowhere else.

**What the player sees, in order.** Death FX as shipped. Then the results screen, which states the
night's tin and one new line: the survivor's name and IS WALKING BACK, with the number of nights. Not
a game over screen and not a toast. Then camp: they are not there.

**The empty spot is NOT rendered as a hole in a row, and this corrects the original chapter.** It
proposed the survivor's tent spot standing empty in a fixed row, and rejected the name MISSING on the
grounds that counted absence is capped at three and all three are spent
(`AUTHENTICITY.md:1199-1213`) `[spec]`: the Buddy Board, the Duty Roster Board, the Quartermaster's
Tags, closing with "Three is the number. Do not add a fourth." An empty tent in a fixed five-tent row
is the Buddy Board with tents. The rejection of the NAME was right and the replacement tripped the
same rule. **Resolution: the idlers close up.** The survivor is simply absent from the idler list
with no reserved coordinate left standing, so there is nothing enumerable and the cap is not touched.
What tells the player, once, is a plant and not a counter: after a fall, the youngest child's drawings
on the cabin pinboard (`js/camp.js:832`) `[code]` include that survivor walking, dated before they
are back. No line. No meter.

**The return.** At the start of a camp visit, any `id` where `META.runs >= META.walking[id]` and `id`
is not in `this.idlers` is spawned at the gate and walks to their spot using the walk the camp
already has (`js/camp.js:889-891` sets `state = 'walking'`, `after = 'idle'`) `[code]`. Control is
never taken. One voice line, once, and it is about the walk and not about dying, because it repeats
forever.

**What carries over.** Banked tin, `lifetime`, the falls tally, the walking map, camp build
state. **What does not.** The run save (already cleared at `js/game.js:1062`) `[code]`, conviction,
the ledger, the keystone, scrip. Nothing strength-shaped carries: no heirloom, no inherited stat.

**The candidate lore mechanism, tested.** PREMISE_2.md:41-48 `[spec]` proposes that the seers come
back because the children at camp believe totally that they will, and nobody believes an adult is
coming back. **It holds as the reason.** It is the one rule pointed at a person instead of a tool, so
it costs no new cosmology; it gives the children's creep toward the treeline a second job; and it
explains adult permadeath without a scene. **It fails as the meter**, and the failure is real: it
puts the cost on a party the player never touches, and a cost you cannot see, spend or trade is a
justification, not a mechanic. Worse, it routes straight into whether a child can be lost, which the
premise itself flags as the question the mechanic makes unbearable. **Verdict: adopt it as the
reason, refuse it as the meter.** The two-night walk is charged to the player's own survivor.

## 3.2 The roster curve

Replaces `js/roster.js:8-20` entirely, deleting `max` free, `junie` on `META.lifetime >= 150 ||
META.dawns >= 1` and `gus` on `META.lifetime >= 400` `[code]`.

```
dez:    { start: true }
junior: { start: true }
mikey:  { start: true }
vic:    { arrivesAfter: 3 }
hollis: { arrivesAfter: 5 }

SUPERSEDED, DO NOT IMPLEMENT THE ABOVE. Gating arrival on a raw run count is ruled
out (see RULINGS.md, contradiction C-5): arrival gates on a milestone the player's
own play produces, not on a counter. The replacement milestones are not designed
yet, so this block stays here as the shape of the data, never as its values.

known(id)    = r.start || META.arrived.indexOf(id) !== -1
walking(id)  = META.runs < (META.walking[id] || 0)
sendable(id) = known(id) && !walking(id)
```

`Roster.checkUnlocks` (`js/roster.js:35-51`) `[code]` becomes `checkArrivals` with the same shape and
no `cond()` closures. `hint()` (`js/roster.js:53-56`) `[code]` is deleted: nothing is locked behind a
number, so there is no hint to give. Three at the start, no growth through the first three runs, Vic
before night 4, Hollis before night 6, staggered so the two arrivals never land together.

**It unlocks options, not strength, and here is the proof.** Every survivor is sendable the instant
they are known: no purchase, no threshold, no rank. No survivor is numerically stronger than another,
because under ruling 1 the tool IS the attack, so a fourth and fifth survivor add verbs rather than
numbers. Nothing on the board can grant a survivor.

**That makes `METADEFS` the odd one out and it must be re-pointed in the same unit.**
`js/meta.js:7-14` `[code]` is SEVEN flat strength ranks plus a revive, not six as the original chapter
said: `hearty` (+12 maxHP, applied at `js/game.js:106`, `:114`), `sharp` (+5% damage), `swift`
(+4% move), `packrat` (+12% pickup radius), `scholar` (+8% badge XP), `grit` (+1 armor), `headstart`
(start 1 rank higher), and `secondwind`. Two of them (`packrat`, `scholar`) key to systems ruling 5
deletes outright, `headstart` keys to a rank machine that no longer exists, and `hearty` at 3 ranks is
+36 on a pool of 6. The whole table is replaced by the 16-entry options board in chapter two.

**Arrival is gated on run count alone.** The library prefers unlocks tied to varied play rather than
volume (`genres/roguelike-roguelite/report.md` sec 3e) and this departs from that on purpose: an
arrival is a fiction event, a stranger walking up the two-track because the woods reached the road,
and tying a stranger's survival to the player's kill count turns an event back into an unlock.

## 3.3 Interludes

Three and no more, because each one repeats every single run and therefore either earns its
repetition or it is noise.

**THE SIT (pre-boss trough).** Ruled in chapter two, section 2.2: a fire ring placed as a prop in the
`loot|rest|lore` slot of every act, whatever type that slot rolled, priced at 15 scrip, restoring up
to 2 pips plus a thermos pull plus all padding, 6 seconds, uninterruptible, once per act. It does not
consume a room slot. The slot itself is nearly empty today: the three rest rooms carry `waves: []`
and `reward: { kind: 'auto' }`, a grep for `reward` across `js/room.js` returns no reader for that
field, and the only code that treats `'rest'` specially is the music (`js/audio_director.js:158`)
`[code]`. **Speaks: no. Zero lines, forever.** It deliberately gets two of the rest beat's three
jobs: no build choice happens here, because the shop and loot slots already carry the decisions.

**THE CROSSING (between acts).** Out of the boss room's one door into a corridor of ground you cannot
fight in, with exactly one interactive thing: the ground. In the Light band you read the next act's
roster in the mud and you choose which of two entrances you take; in Settled you read less and the
choice is blind; in Certain you read nothing and it is just walking. 6 to 8 seconds at base move
speed, one door in, one door out, no re-entry. Acts 1 and 2 only. After the act 3 boss there is no
crossing: that is the terminal boundary and the payoff there is True Dawn.

**Two corrections to what the original chapter claimed about it.** First, **it does not unblock the
sight bands.** The bands' blocker is the ledger COUNT input, not the surface
(PREMISE_2.md:1243-1253) `[spec]`, and a place does not supply a count. What the crossing supplies is
the SURFACE half, which was also missing, so it halves the blocker and the row stays blocked on the
3.0 ledger unit. Second, **"skippable by walking" is not skippability**, and the chapter quoted
failures #3, #6 and #10 from the roguelike-roguelite failure table while skipping #8, which names
forced cutscenes and hub walk-back verbatim
(`genres/roguelike-roguelite/report.md:584`). The honest answer to #8: the crossing is the act
transition, which already exists as a build boundary whether it is rendered as a fade or as a place,
so it spends time that already passes rather than adding time; it happens twice per run and never on
the restart path, which is what #8 is actually about; and it is short. That is a defence, not a
dismissal, and if a playtest shows players resent it the answer is to shorten it to 4 seconds, not to
add a skip button.

**THE ARRIVAL (at camp).** Reuses the idler walk (`js/camp.js:889-891`) `[code]`. The player does
nothing and control is never taken, so there is nothing to skip. **Speaks: yes, and this is most of
the voice budget.** See 3.4 for the corrected count.

## 3.4 The voice budget, in one place

Nobody owned this and no chapter totalled it. Everything that speaks, counted once:

| Beat | Lines | Note |
|---|---|---|
| First arrival, Vic and Hollis | 4 | 2 each (the arriver, plus whoever is at the fire) |
| Walk-back return, all five | 5 | 1 each, about the walk and not about dying |
| First walk-back ever | 1 | plays once in a save's life |
| Flagship, first shape change of a run | 5 | 1 per character; the other 25 are written and HELD |
| The Reading | 1 + numeral bank | one sentence off `lifetime`, plus a recorded numeral bank |
| Quartermaster, scrip expires at dawn | 1 | said once |
| Brock's act 2 ask, re-scoped to far-maker tin | 1 re-record | `js/dialogue.js:231-232` `[code]` |
| **Total to write and record now** | **18 plus the numeral bank** | |

**The original run chapter said 16 arrival lines for five survivors. It is 10.** Dez, Junior and
Mikey start at camp under ruling 7 and have no first arrival, so first-arrival lines are 2 x 2, not
2 x 5.

**Nothing else speaks.** Escalations are silent. THE SIT is silent. THE CROSSING is silent, because
two crossings per run every run is the worst place in the game to spend voice. The padding tutorial
does not exist, because nothing in this game is taught by a character explaining it.

**The hazard, and the required lint.** `js/voice.js:77-94` `[code]` keys clips on speaker plus spoken
text with only whitespace normalisation as a fallback, and `logMissing` only does a `console.info`,
so a reword after recording silently orphans the clip. **Every one of these 18 strings is frozen
before it is recorded, and a lint asserts a clip exists for every key, failing the build rather than
logging.** The lint is new tooling, sized S, and it appears in the implementation ledger. Note also
that the shipped voice table has ten speakers and none of the new cast
(`tools/voice/voices.json`, per PREMISE_2.md:1880-1882) `[spec]`.

## 3.5 Act and room shape

Unchanged: 8 / 9 / 10 rooms, 27 total, boss always the last slot, `bossTier` 1/2/3 at
`js/rooms.js:158`, `:166`, `:174` `[code]`. Beat tables untouched. Act boundaries at rooms 8, 17 and
27, which is what escalations at rooms 5, 13 and 21 are indexed against.

Placement, stated in ONE convention (0-indexed room slots, because that is what the code uses): THE
SIT is a prop in slot 6 of act 1, slot 7 of act 2 and slot 8 of act 3, which is the `loot|rest|lore`
slot in all three. THE CROSSING is on the outgoing edge of the boss room in acts 1 and 2 only. THE
ARRIVAL is at camp, outside the run, so it costs no room budget.

---

# THE VOCABULARY TABLE

| System | Current | Proposed | Reasoning |
|---|---|---|---|
| Mid-run coin | COOKIE MONEY (`js/run.js:745`, `js/ui.js:427`) `[code]` | **SCRIP** | Already ruled (PREMISE_2.md:1197) `[spec]`. CHITS is the fallback. |
| Permanent currency | badges, merit badges | **TIN** | Ruled. Internals frozen (`META.badges`), precedent at `js/feats.js:11-17` `[code]`. |
| The ceremony | none | **THE READING** | Ruled. Off `lifetime`, Brock at the fire, once a night, skippable, never blocking a purchase. |
| Act 1 | THE UNDERSTORY | **keep** | A real forestry word a burn-crew kid would say. Names a place and a state. |
| Act 2 | THE SOG | **THE FLOWAGE** (open call 8) | "Sog" is a coinage that reads cute, and cute is dead. Flowage is the real regional word for a flooded impoundment, one word, spelled as it sounds, passes read-aloud and shout (`research/narrative/naming-nomenclature/report.md` sec 3.2). THE SLOUGH rejected on the pronunciation trap; THE WET rejected on common-word collision. |
| Act 3 | THE BURN | **keep** | Same argument as act 1, and it is Hollis's own vocabulary. |
| Pre-boss trough | SIT SPOT (`js/run.js:751`) `[code]` | **THE SIT** | Verb, not a place, and it says what the button does. |
| Between-act beat | none | **THE CROSSING** | Plain, spatial, and it is literally what you do. |
| Arrival beat | none | **left plain, unnamed** | Naming it makes it a feature. It is somebody walking up the two-track. |
| Enemies, category | critters | **THE SIGNED** for anything wearing a token, **animals** for anything not | A two-word taxonomy the player verifies by looking. "Critters" is cute. |
| Badge Board, the spend screen | Badge Board (`js/camp.js:848`) `[code]` | **THE BOARD** | One syllable, it is the thing Brock reads off, and the old name carries the dead award fiction. THE LEDGER is rejected: it collides with the item ledger. Internal id `board` frozen. |
| Feat board | merit badges (`js/camp.js:854`) `[code]` | **THE ENTRIES** | It holds your name and the date beside what you handed in. Internal id `featboard` frozen. |
| The tool's growth counter | weapon level | **CONVICTION**, internal only | Never rendered as a word. A resource called Belief that behaves like mana is the named failure (PREMISE_2.md:1125-1127) `[spec]`. |
| Death-rotation state | none | **WALKING BACK** | A verb phrase on a person, no coinage. MISSING is rejected: counted absence is capped at three and all three are spent (`AUTHENTICITY.md:1199-1213`) `[spec]`. A state on a person with no reserved coordinate is not a counted object. |
| Armour | armor, armourFlat, armourPct | **PADDING** | It is what a kid actually has: layers. And it names charges, not a percentage. |
| Quartermaster | Quartermaster | **left plain** | A real camp job title, and the camp keeping old job titles is canon (PREMISE_2.md:1137) `[spec]`. |
| Field guide, tally post | as shipped | **left plain** | A field guide is a field guide. The tally post's un-promise verb is the best thing at camp; renaming it buys nothing. |
| The flagship ability | none | **left plain, unnamed** | It has no name because it has no fixed identity. Naming a thing that changes shape six ways teaches the player it is one thing. |

---

# THE STRONGEST ARGUMENT AGAINST

Stated as the completeness critic made it, unsoftened.

The three chapters defended the wrong flank. They spent their arithmetic on whether one unbounded
weapon becomes a flat multiplier. The real cost of ruling 1 is not flatness, it is **sameness**: it
deletes the last source of within-character run-to-run variance and nothing in three chapters put one
back.

Count what actually varies between two Dez runs under the architecture as authored. The tool:
identical, same base, same three authored escalations, in the same order, every run. The growth
curve: identical, because conviction is a function of rooms cleared and every run clears the same 27.
The flagship: one of six shapes, and the tool chapter's own gate concedes the leading family
stabilises early because `FAMILY_CAP = 6` against `LEDGER_PICKS_PER_RUN = 26` (`js/pool.js:39-43`)
`[code]`. The ledger: 26 picks from 96, single-acquisition, never traded, and 6 families x 6 cap = 36
capacity against 26 picks, a 38% margin the file itself advertises `[code]`. The keystone is "the only
replacement prompt in the whole design" (`BUILD_ARCHITECTURE.md:399-401`) `[spec]`.

So: **the entire design contains one decision with an opportunity cost, and it is the keystone.**
Everything else is accumulation. Four weapon slots were not interesting because four is more than
one; they were interesting because taking a weapon COST a slot and levelling one COST levelling
another. Ruling 1 deletes the opportunity-cost engine and the replacement chapters installed nothing
in its place. A build with no scarcity is a checklist, and the correct play in a checklist is to take
everything, which is exactly what the economy chapter's pick model has the player do. The library
named this: variety comes from more interactions per item, not more numbers
(`genres/roguelike-roguelite/report.md` sec 3b).

Two further charges from the same pass, also stated as made:

**The Signing half is narrated, not mechanised.** The premise says the player is running an
unlicensed Signing operation on their own equipment. In the mechanics the tool grows off attendance:
rooms cleared. That is not an act of certainty. There is no moment where the player DECLARES
something and the object changes in response. Strip the fiction and this is a weapon that levels up.

**Nothing in the world notices what you have become.** The premise's own keystone fiction is that
"the world notices which mark you are wearing" (PREMISE_2.md:1086) `[spec]`. The player harvests tin
off things somebody else Signed and produces no visible mark of their own. No chapter implements the
noticing.

**What this document did about it.** Two of the three are answered and one is not. The sameness
charge is answered by branching escalations (three mutually exclusive branches at each of three
thresholds, 27 tool shapes per character, chapter one section 1.1) and by the WALK ON option on every
ledger draft (chapter two section 2.6), which together install an opportunity cost inside the tool
and an opportunity cost at every pick. The scarcity-of-refusal charge is answered by WALK ON plus
paying sight two concrete things (the pre-room roster read and route choice at the crossing), which
turns the sight cost from a passive fade into a price at the point of decision. **The third charge is
NOT answered.** Nothing in this document makes the world notice the player's mark, and the Signing
half remains narrated. That is a real hole and it belongs to the keystone and enemy-behaviour owners.
It is open call 10.

---

# WHAT IS STILL UNDESIGNED

Each with the owner it should go to. All of these were found by the completeness critic and verified
in this pass.

1. **Controller input does not exist.** `grep -rl gamepad js/` returns nothing `[code]`. Input is
   keyboard and mouse plus `js/touch.js`. **Owner: the input and control-feel unit. M to design, L
   to ship, and it must land BEFORE the tool authoring**, because Dez's hold-to-wind and Vic's held
   beam are input designs and re-authoring input feel twice is the expensive path.
2. **The touch layout cannot express the design.** `js/touch.js:9` `[code]` says the right third is
   an aim stick and holding it also holds fire; roles are move, aim/fire, dodge and an interact pill.
   `grep skill js/touch.js` returns 0 matches `[code]` while `js/game.js:2226` reads `p.in.skill`, so
   the shipped active skill is ALREADY unreachable on touch. The flagship inherits that hole, the
   thermos context verb adds a second, and Dez's hold-to-wind and Vic's held beam both collide with a
   hold gesture already spent on fire. **Owner: same input unit.**
3. **The HUD after the deletion.** `index.html:444` is `<div id="xpwrap"><div id="xpfill">` and
   `js/ui.js:1392` fills it `[code]`. Deleting XP deletes the HUD's largest element and its only
   number, and this document then removes the in-run tin counter too. Nobody has drawn the
   replacement screen. **Owner: the HUD and family-strip unit.**
4. **Save migration, and it is M not S.** `META.selected` defaults to `'max'` (`js/meta.js:25`),
   `load()` coerces any unknown id back to `'max'` (`js/meta.js:44`), any save with `runs > 0` is
   force-fed `'junie'` and `'gus'` into `unlocked` (`js/meta.js:54`), the run save serializes
   `weapons[]` and `revived` (`js/game.js:2440`), and `META.upgrades` never decreases
   (`js/meta.js:96-104`) so the 400 banked in `secondwind` has no refund path `[code]`. **Owner:
   whoever writes the roster, in the same unit.**
5. **Tutorial and cold open.** `grep -rl "tutorial\|firstRun" js/` returns nothing `[code]`. Nothing
   teaches the shipped game, and this one adds four systems with no genre analogue: the derived
   ability, the sight bands, walking back, and one-tool identity. The only teaching surface named
   anywhere in three chapters is a pickup card. **Owner: an onboarding unit that does not exist yet.**
6. **Accessibility at 5 to 8 pips.** No difficulty posture, no assist options, and the health/padding
   distinction is carried by pip SHAPE, which is the one channel nobody checked. **Owner: the
   accessibility unit.**
7. **Co-op is worse than stale.** `COOP_DESIGN.md:1081` `[spec]` makes duplicate scouts mandatory
   because three cannot fill four seats, and cites `js/roster.js:8-20`, which this document deletes.
   Under one tool a duplicate is now a literally identical character; the four-weapon spine used to
   hide that. Plus: whose conviction ticks on a shared clear, whose ledger picks the flagship's shape,
   and can a walking-back survivor fill a mandatory seat. **Owner: the co-op unit. Out of scope here,
   flagged loudly.**
8. **Two of five characters have a declared deficiency against three mandatory encounters.** Junior
   is stated bad at bosses, Vic is stated bad at killing things, and every run contains three bosses.
   No chapter tested it. **Owner: the boss unit, jointly with the tool prototype.**
9. **The ledger counter itself.** The sight bands and the flagship's scale term both read a number
   that does not exist (PREMISE_2.md:1245-1253) `[spec]`. **Owner: the 3.0 ledger unit.**

---

# WHAT NEEDS A PLAYTEST

Nothing here is knowable on paper. Each row states the test.

1. **Shape-change frequency.** Instrument the derivation and log leading-family changes across 30
   runs. Median three or more, ship the derived ability; under three, ship the static active. This is
   the flagship's ship gate and it depends on offer weights in `js/pool.js`.
2. **Whether one tool holds 27 rooms.** Play each character with the whole ledger disabled. The
   question is not damage, it is whether the player is still making choices at room 20.
3. **Whether Vic has a solo loop.** Vic alone, act 1, no ledger. If the beam is never off, he is a
   turret with a story, and he should arrive last or be re-verbed toward the light itself doing harm.
4. **Whether branching escalations are felt.** Two Dez runs back to back with different branches at
   each threshold, then ask what was different. If the answer is "he hit harder," branching bought
   nothing and the authoring cost is refundable.
5. **Whether the pillar is felt.** Force the death of the player's most-used survivor on night 4 and
   observe whether they play DIFFERENTLY or just WORSE. This is the whole weight of ruling 6 and it
   rests entirely on whether the tools land as five verbs rather than five damage profiles.
6. **Pip legibility at the worst case.** Act-3 charger contact at 5 pips with padding charges
   present: can the player read how close to death they are without leaving the fight, and can they
   tell padding from health.
7. **Whether ground one-shots are ever chosen.** Log pickup rate. Above 90% means placement took the
   decision; below 20% means the rule failed and the slot question reopens.
8. **Whether WALK ON is ever taken.** If the decline rate across 30 runs is under 5%, the refusal is
   theoretical and the sight cost is still a fade, and the ledger needs a real capacity bound after
   all.
9. **Whether the sight cost is perceived at all.** Unprompted exit question: why did the animals stop
   appearing. If the player cannot connect it to their own build, the premise's central cost is
   invisible and the fix is systems, never more text.
10. **Whether five tools read as five characters or one character with five skins.** Blind
    back-to-back play of two characters, then ask what was different.

---

# THE IMPLEMENTATION LEDGER

Ordered so a wave can be cut off the top. Every unit is gated by typecheck plus build plus a smoke
verification before commit, regardless of who implements it.

| # | Unit | Files touched | What breaks | Size | Depends on |
|---|---|---|---|---|---|
| 1 | **Kill the survivors leftovers.** Delete the magnet trait, the kill drop branch, `dropGems`, the gem loop, `gainXP`, `DATA.xpNext`, `lodestone`, `pickupRadius` from the stat frame | `js/data.js:145`, `:322`, `:651`; `js/game.js:546`, `:715-730`, `:990-1014`, `:1963-1982` | The pickup pull disappears, which is what makes ground one-shots work. `pickupRadius` leaving the stat frame touches the stat spec. Gus's `pickup: 0.25` row field has no successor | M | nothing |
| 2 | **The pickup contract.** `onPickup` becomes `'supply' \| 'cache'`, collection at a true 20px overlap | `js/hooks.js:57`; `js/game.js:1983-2006` | `EVENTS` is a closed list and `on()` rejects a typo out loud (`js/hooks.js:48-58`), so every item authored against `'gem'` fails at registration | S to change, M to sweep | 1 |
| 3 | **Input: controller plus a touch layout that can express the design** | new; `js/touch.js` throughout | Nothing today, because nothing exists. Blocks tool authoring if deferred | M design, L ship | nothing |
| 4 | **Roster rewrite plus save migration.** Five ids, arrival state, walking, falls; refund the banked Second Wind | `js/roster.js:8-56`; `js/meta.js:7-14`, `:25`, `:28`, `:44`, `:54`, `:96-104`, `:125`; `js/data.js:12`, `:495-506` | `META.selected` and both coercion paths point at dead ids; every existing save is force-fed `junie` and `gus`; per-character dodge is keyed to three dead ids; `METADEFS` is replaced wholesale | M | nothing |
| 5 | **HP reframe to pips.** Pools, integer contact and shot damage, `dmgScale` off contact, padding replaces both armour rows, all eleven percentage-of-max sites | `js/data.js:18`, `:26`, `:34`, `:106-115`, `:142`, `:313-314`, `:328`; `js/director.js:193`, `:233`, `:325`; `js/stats.js:205`, `:357-358`; `js/game.js:106`, `:114`, `:566-571`, `:697`, `:724-725`, `:1031`, `:1041`, `:1994-1997`, `:2259-2271` | Every enemy damage number in the game is re-authored. Damage numbers are deleted. `hearty` and `grit` become meaningless and die with unit 4 | L | 4 |
| 6 | **Death rotation.** Write the fall inside `credit` after `this.runs++`, the flat two-night walk, delete Second Wind and its four orphans | `js/meta.js:125`; `js/game.js:1043-1075`, `:2440`, `:2543`; `js/dialogue.js:13`, `:30`, `:47`; `js/voice.js:33` | The revive path and its barks; the run save shape | M | 4 |
| 7 | **Camp roster surfaces.** Five survivors, no reserved coordinate for an absent one, the pinboard plant, the arrival walk | `js/camp.js:648`, `:658`, `:774`, `:832`, `:870-871`, `:889-891`, and the swap gate | `scoutSpots()` holds three hardcoded ids; the `'zzz'` locked label and its per-frame refresh, the swap gate and the sleep render are five more sites than the original chapter listed. This is the pillar's only face | L | 4, 6 |
| 8 | **`computeToolStats` plus conviction.** Replace `computeWeaponStats`, delete `levels[]`, freeze the legacy area term, tick on `onRoomClear` | `js/game.js:574-586`, `:589-596`; `js/data.js:8`, `:10`, `:39-138`; `js/stats.js:105`, `:340`; `js/pool.js:149`, `:153-156` | Keep `this.weapons` as a length-1 array with the cap as a data invariant: a true single-object rewrite is L for no gain and breaks the co-op owner shape. The offer pool's new-weapon branch goes dead. Pause-screen slot rendering (`js/ui.js:378`, `:1175`, `:1473-1474`) | M | 1 |
| 9 | **The five tools.** Four have shipped analogues; only Vic's held beam is greenfield | `js/game.js:1515` switch onward | `case 'firecracker'` (`:1575-1600`) already does Junior's cursor placement, arm delay and wall clamping; `canteen` (`:1623`) is Hollis's persistent field. Vic's sustained single-target lock has no analogue anywhere | L | 3, 8 |
| 10 | **Branching escalations.** Three thresholds at rooms 5, 13, 21, three mutually exclusive branches each, five tools | new; `js/data.js` tool rows | 45 authored escalations and a per-run branch state that the run save must carry | L | 9 |
| 11 | **Room-clear income.** One pick per armed clear, three per boss, one per loot cache; the WALK ON option on every draft | `js/room.js:749-778`; `js/pool.js:35-43`; the draft UI | The guarantee takeover (`js/run.js:536-551`) is what makes 13.5 the arming count; the boss payout of 3 is load-bearing for the sight bands | M | 1 |
| 12 | **Consumables.** Thermos on the interact context verb, ground one-shots, the SIT prop and its scrip price | `js/run.js:568`; `js/game.js:1463`, `:1623`; new prop and interaction | The interact input becomes contested with world props. The SIT prop needs a placement rule in the run builder | M | 2, 5 |
| 13 | **The derived flagship, PROTOTYPE FIRST** | `js/game.js:2074-2354`; `js/traits.js` | Replaces the skill IIFE and `DATA.skills` (`js/data.js:672-685`, all `locked: true`). Do not write the item pass against it until the shape-change gate passes | L, gated | 8, 11 |
| 14 | **Tool-coverage audit.** 12 traits x 5 tools = 60 declarations added to the scope audit | `js/traits.js:576-600` | Nothing; it is additive and it fails at load like the existing audit | S | 9 |
| 15 | **Vocabulary and voice.** Display strings, 18 new lines plus a numeral bank, Brock's act 2 re-scope, and the clip lint | `js/run.js:745`, `:751`; `js/ui.js:427`, `:968`, `:1212`; `js/camp.js:848`, `:854`; `js/dialogue.js:231-232`; new lint tooling | A reword orphans a clip silently (`js/voice.js:77-94`). The shipped voice table has ten speakers and none of the new cast | M, plus a re-render in the same wave | 4, 6 |
| 16 | **Scrip conversion deletion** | `js/data.js:558`; `js/ui.js:905-913` | The dawn cash-out line and the results row that reports it | S | 11 |
| 17 | **The HUD rebuild.** Pips, padding, the family strip, the flagship icon, no XP bar, no in-run tin | `index.html:22-23`, `:444`; `js/ui.js:1392-1393` | The HUD's largest element and its only number are both deleted at once | L | 5, 13 |
| 18 | **The camp board, 16 entries in two tiers** | `js/meta.js` (`METADEFS` replacement); `js/camp.js:848` | Nothing survives of the seven strength ranks | M | 4, 5 |
| 19 | **THE CROSSING** | new; the act transition control flow | No design doc names an act transition today; the only reference is the boss being called "the act boundary" (`BOSS_DESIGN.md:257`) `[spec]` | L | 11 |
| 20 | **Sight bands** | blocked | The band input is the 3.0 ledger count, which does not exist. Deleting `DATA.PASSIVE_SLOTS` and `DATA.WEAPON_MAX` is that unit's job, not this one's | **BLOCKED** on the 3.0 ledger unit; S for the render change once it lands | 20 is downstream of everything |

Whole programme: **XL**.

**A wave can be cut at units 1 through 4**, which are disjoint by file set except that 2 depends on
1: unit 1 (`data.js`, `game.js` drop sites), unit 3 (`touch.js`, new input), unit 4 (`roster.js`,
`meta.js`) can run in parallel; unit 2 sequences behind 1.

---

# OPEN CALLS

1. **Does death end the night, or swap the body mid-run?** Options: (a) ends the night, rotation
   between runs, stakes intact, which is what this document designs; (b) mid-run swap with a real
   cost inside the night (incoming survivor at half pool, conviction reset to zero, ledger retained);
   (c) mid-run swap with no cost. **Recommend (a).** (c) is the collapse the library documents, and
   (b) is designable but nothing in this pass designs it. This is the single largest interpretation
   in the document and everything about the pillar's stakes rests on it.
2. **Does the conviction tick include a per-tool habit condition, or is it one tick per armed room
   clear flat?** Options: (a) flat, fully deterministic, every run's curve identical, trivially
   tunable, and all five tools grow identically; (b) clear plus habit, which rewards playing each
   tool the way it wants but makes the curve variable and the enemy-HP pairing fuzzier.
   **Recommend (b)**, because a deterministic curve erases the character differences the habit
   condition exists to teach, and the variance is bounded (26 to 33 ticks, not 26 to 54).
3. **Do the tool's three escalation thresholds present a branch, or a fixed unlock?** Options:
   (a) fixed ladder, cheapest and most tunable, 15 authored escalations across the cast; (b) three
   mutually exclusive branches at each threshold, 45 authored escalations, 27 tool shapes per
   character. **Recommend (b).** It is the only source of within-character run-to-run variance in
   the whole design, and it is the completeness critic's central charge.
4. **Is WALK ON added to every ledger draft?** Options: (a) yes, declining is always legal and costs
   the pick, which makes sight a price rather than a fade; (b) no, keep the draft as authored and
   accept that taking everything is optimal. **Recommend (a).** Without it the sight cost is an
   unavoidable debuff accrued by playing correctly, and players read unavoidable punishment as bad
   tuning, not as theme.
5. **Is the thermos allowed to ride the shared interact input, or does it buy a button?** Options:
   (a) shared interact, no new slot, at the cost that a prop-dense room can steal the input;
   (b) buy a dedicated button, which reopens `BUILD_ARCHITECTURE.md:33` and costs a HUD position, a
   cooldown model and a balance pass across five tools; (c) no thermos, healing is the SIT and socks
   only, which means a bad room seed can leave a player with no recovery at all. **Recommend (a).**
6. **Does the SIT cost 15 scrip, or is it free?** Options: (a) 15 scrip, which puts healing in direct
   competition with the shop and gives the run its second real opportunity cost; (b) free, which is
   6 free pips a run on top of everything else; (c) no verb at all until the consumable question is
   settled, a prop you look at. **Recommend (a).**
7. **Does the boss pay 3 ledger picks or 2?** Options: (a) 3, which lands expected picks at 25.5
   against the pool's 26 invariant and puts the sight band boundaries within a pick of the act
   boundaries; (b) 2, which lands at 22.5, 13% under the invariant, and moves both band boundaries
   into the middle of the wrong act. **Recommend (a).** One authored constant is currently holding
   two systems together and it should be (a).
8. **Does act 2 become THE FLOWAGE?** Options: (a) THE FLOWAGE, the real regional word for a flooded
   impoundment and what a trapline kid would call that ground; (b) keep THE SOG; (c) something else.
   **Recommend (a)**, decided by one read-aloud pass, because "sog" is a coinage that reads cute and
   cute is dead everywhere else in the reboot.
9. **Does the board ship 16 entries at 6,400 tin, or 24 at 11,200?** Options: (a) 16 in two tiers,
   about 19 nights to complete at the modelled tin rate; (b) 24 in three tiers, about 33 nights, with
   the third tier being the entries that need the most new systems. **Recommend (a).** A board the
   player can see the end of is a board they engage with, and the third tier can arrive later without
   retrofit.
10. **Who owns "the world notices which mark you are wearing," and does it ship?** Options: (a) the
    keystone owner, as a visible mark on the player that enemy behaviour reads, which is new
    behaviour on every enemy; (b) the enemy owner, as a per-family reaction table; (c) it does not
    ship and the Signing half stays narrated. **Recommend (a)**, sized L, because it is the one
    premise promise this pass could not answer and the critic named it correctly.
11. **Does controller and touch input land before the tool authoring, or after?** Options: (a)
    before, since Dez's hold-to-wind and Vic's held beam are input designs and touch already has no
    channel for either; (b) after, and accept re-authoring the input feel twice. **Recommend (a)**,
    sized M to design.

---

# HONEST LIMITATIONS

**What this pass could not verify, and why.**

- **Every body count and elite count is inherited soft.** 282 / 324 / 539 bodies and 3 / 5.5 / 11
  elites come from ENEMY_DESIGN.md:279-281 `[spec]`, which the document's own author calls the
  softest numbers in the chapter, and they are keyed to a cast the premise deletes. The tin rate, the
  board price and the 19-night completion all sit on top of them. The mitigation is structural: the
  board PRICE is the dial, not the tin rate, so a measured rate moves one authored number.
- **The 0.35 chaff token rate is solved backwards from a board target, not measured.** It is a
  defensible construction and it is still not a measurement.
- **The habit-tick rate of 0.6 is assumed, not derived.** It sets conviction at 26.4 and therefore
  every cell in the growth table. A rate of 0.4 gives conv 23 and 5.1x throughput; a rate of 0.8
  gives conv 30 and 5.8x. The curve is not sensitive enough for this to be a blocker, but it is not
  known.
- **The beat-roll expectations assume the roller picks uniformly among `|` alternates.** I opened the
  roller (`js/run.js:528-551`) `[code]` and confirmed the guarantee takeover and the `noRepeatType`
  filter, but I did not model the `noRepeatType: 2` interaction precisely, so the arming counts
  (3.33 / 4.50 / 5.67) are correct to about a tenth of a room and not exactly.
- **The 8-seconds-per-room gem sweep is my estimate and nobody has measured it `[inference]`**, so
  the "about 10% of the night" figure is an estimate of an estimate.
- **No prototype exists for anything in chapter one.** Vic's solo loop, the flagship's shape-change
  frequency, whether one tool holds 27 rooms, and whether branching is felt are all paper claims
  with tests attached and no results.
- **I did not open the plan of record in `~\.claude\plans\`.** The rulings restated here come from
  the creator rulings block at PREMISE_2.md:3-65 `[spec]` and from the task brief, not from the plan.
- **The sight bands cannot be built and therefore cannot be tested.** The band input does not exist
  in code (PREMISE_2.md:1245-1253) `[spec]`, so the central cost of the premise is the one system in
  this document with no path to a playtest until the 3.0 ledger unit lands.
- **Co-op was flagged and not designed.** `COOP_DESIGN.md:1081` `[spec]` cites the exact roster file
  this document deletes, and under one tool a duplicate survivor is a literally identical character.
  I named the problem and did not solve it.
- **The `AUTHENTICITY.md:1199-1213` cap of three counted objects has a live conflict that predates
  this pass** (the range scoreboard at `STORY_DESIGN.md:802-805`, flagged as open call 25 in
  PREMISE_2). This document's resolution avoids adding a fourth; it does not resolve the existing
  conflict.
