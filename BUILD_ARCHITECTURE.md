# The 3.0 build architecture

This document settles how a night's build is assembled in 3.0. It supersedes
parts of `BUILD_ECONOMY_3.md` and section 7 says exactly which parts, so nobody
cites the wrong one by mistake. Every implementation brief after this cites this
file.

Three architectures were designed independently and judged by three panels: one
on combat feel and readability at density, one on cost and feasibility for one
developer, one on depth over a hundred hours. The winner was unanimous. This
document is that winner, with the best ideas from the two losers grafted in and
attributed.

Two evidence rules apply throughout. Facts about our game are measured by reading
our code and cited by file and line, and I re-read every load-bearing one myself
this session. Facts about other games are labelled sourced or recalled, and a
recalled number is never presented as a measured one.

**Nothing here is named.** No item names, no flavour text. Naming waits for the
tone doctrine.

---

## 1. The decision

**We are building FOUR CLOCKS, ONE LEDGER.**

The rule is one sentence, and it is the whole architecture:

> **If a thing needs its own clock and its own place on the screen, it is a slot.
> If it rides a clock that already exists, it goes in the ledger.**

So a run holds four weapons, one active skill and one keystone, and those six
things are capped forever. Everything else the night hands you goes into a single
uncapped ledger that changes what your hits do. There are no patch slots. There
is no "which of my four patches goes". The twentieth pick lands because it
modifies the thing you press every second.

That rule is not a slogan. It is the cost boundary drawn in our own source. A
thing with its own clock needs a new hand-written case in the `fireWeapon` switch
(`js/game.js:843-944`, ten cases, one per weapon) or a new branch in
`updateWeapons` (`js/game.js:795-823`, where knives and bug spray are handled
separately again), and that is a day of engine work each. A thing that rides an
existing clock composes into `dealDamage` (`js/game.js:337`) or into the stat
block and costs zero engine days. The schedule enforces the design.

**Why it won.** Three reasons, in the order the panel weighted them.

First, it is the only one of the three that keeps what 2.0 actually does.
`updateWeapons` walks every held weapon every frame, the entire manual gate is
one line (`js/game.js:827`), and every weapon reads the single `this.aimAngle`
computed once at `js/game.js:754`. So holding the fire button already sends a
stone volley and a flame gout and an axe chop at the same cursor angle, together,
on one press. That layered volley is the game. One rival deleted it and used it
as its own justification; the other kept it but removed every progression event
from inside a room.

Second, it is the only one that finds and fixes the hole that would have made two
thirds of the weapon roster feel unchanged by two thirds of the catalogue. I
verified it: `this.shots.push(this.armShot(` appears exactly three times in the
substrate (`D:/Programs/mbm-3.0-substrate/js/game.js:974`, `988`, `1036`), which
is slingshot, roaster and boomerang. The other six weapons deliver damage as a
swing, two kinds of bomb, a ring, an orbit query and an aura tick, and none of
those objects is ever armed. Under "traits ride the projectile" a night running
knives plus bug spray plus canteen plus bugle receives only the four traits
declared `scope: 'any'` (chain at `js/traits.js:255`, burn at `349`, freeze at
`372`, rend at `384`) and nothing else, however many items it holds. This
architecture splits the scope into strike, carrier and field, adds a second
arming door beside `armShot`, and publishes a table of twelve traits by three
surfaces. That triples the surface every trait item acts on, for one and a half
days.

Third, it lands a piece at a time with a playable, bot-verifiable game after
every piece, and for one developer that outweighs any design argument. Merge the
substrate. Land the stat block. Add the field arming door and the autos
immediately inherit your traits that evening. Build the icon composer and the
existing cards improve. Delete the patch slots. Author the catalogue in batches
of twenty. Nothing in that list is a flag day.

**What it sacrifices, honestly, in four lines.**

The "which one goes" moment is gone except once, for the keystone. That is a good
moment and we are giving it up on the grounds that our player already has manual
aim, a dodge, twenty-four door choices and a keystone slot, and is not short of
decisions the way a Vampire Survivors player is. Run-to-run item overlap is
arithmetically worse than a six-slot design would be: about 27 percent of a
26-item ledger repeats between two nights against about 8 percent for six slots
out of seventy-two. Holding more things means sharing more things and no tuning
fixes division. Build legibility degrades continuously rather than being bounded,
so at item 26 the family strip is a texture, not a list, and a player who wants
the exact contents pauses. And it costs more days than the committed plan: 27.5
against a stated 15.5, of which about 5 is genuinely this architecture and about
7 is work every architecture owes and the committed plan omitted.

---

## 2. What the reference games actually do

Six mechanisms carry the whole canon. Everything else in the studies is detail.

### Accumulation versus slots

**Isaac caps only what occupies a control surface.** Passive collectibles simply
accumulate with no inventory and no cap. The capped kinds are the active item
(one, two with a specific item), trinkets (one, two with a specific item), and
the pocket consumable. Sourced, wiki.gg Items page: 171 activated collectibles,
only one held at a time unless you hold the bag item, and no passive holding
limit is stated anywhere on the page. That is why the twentieth pick still lands:
no slot can be full, so the pool narrows for content reasons only.

**Hades caps by verb and trades through the cap.** A boon attaches to your
attack, special, cast, dash or call. Take a boon for a verb you have filled and
it replaces what was there. The slot is a door you trade through, not a door that
closes. Sourced via `BUILD_ECONOMY_3.md` section 4 citing fextralife's Boons
page.

**Gungeon does not cap the toolbox at all and moves scarcity to ammunition.**
Recalled: you keep every gun you find and scroll freely, and each gun has its own
finite ammo. The consequence named in the study is the one that matters: because
a pickup is never a hard choice, there is no tension at the moment of acquisition
at all.

**Balatro settles the slot question outright.** Sourced, balatrowiki.org: five
joker slots by default, 150 jokers, 105 available from the first run. Fewer slots
than we have and vastly more depth. Four weapon slots is not what is killing us.

**Brotato has no carry cap and prices each item individually.** Sourced, Brotato
Wiki Items and Shop pages: 208 vanilla items plus 33 DLC, an individual Limit
column per item, no overall carry cap, weapons capped at six. It works because
the build is read off a calm between-wave stat sheet.

### Pool gating

**Taking removes; seeing decays.** Isaac runs two separate removal laws. Touching
an item removes it from all pools for the run. Merely seeing it spawn decrements
its weight in the pool that spawned it, fully in most pools, 50 percent in a
named set, 40 percent in another, 10 percent in the Library and Crane Game.
Sourced, wiki.gg Item Pool page. That split is why its pools feel deep without
being infinite, and it is the cheapest thing on this list to copy.

**Conditional removal is an authored table, not a side effect.** Sourced, Fandom
Item Pools, verbatim: "In order to decrease redundancy, certain items can be
removed from pools even if they are not picked up. In the list below, the first
event prevents the player from obtaining the item that follows." Event-driven,
one-directional, flat data.

**Every delivery channel gets its own pool.** Sourced, the owner's own Hades
ledger at `D:\Programs\GameTev\research\game-systems\hades-experience-ledger\report.md:221`:
the shop, the Pool of Purging, the hammer and the Pom are four unrelated tables.
Draining one cannot drain the others.

**Player-side pool tools buy offer quality, never pool depth.** Sourced, VS Wiki
Banish page: two banishes per rank, no upper limit on total; VS Wiki Skip page:
skip the offer and take experience instead, no upper limit. Brotato's free lock
is the exception worth stealing, because it is the only pool tool that adds a
goal rather than removing noise. Sourced, Brotato Wiki Shop page: locking is free
and a locked item keeps its price while everything else inflates on
`(Base + Wave + Base * 0.1 * Wave) * Shop_Price`.

### Keystones

**Isaac's tear-replacing items are resolved by a priority ladder plus a
hand-written pairwise table, and that is exactly the cost we cannot pay.**
Sourced, wiki.gg Brimstone page: Repentance authored specific combined
behaviours for that one item against Dr. Fetus, Epic Fetus, Technology, Ludovico,
Tech X, Monstro's Lung, Chocolate Milk, Soy Milk, Ipecac and Tiny Planet. That is
one row of an O(n squared) matrix maintained by a funded team over eleven years
with a modding community filing the bugs.

**Three tagged items make an identity.** Sourced, wiki.gg Transformations page,
verbatim trigger: "A transformation occurs when obtaining at least three
different items from a particular set of items." Fifteen sets plus one variant.
The trigger is a count over tags and nothing more, which is trivially cheap. The
payloads are what is expensive there and free for us.

**Hades opens a top end as the build deepens.** A Legendary boon needs specific
prerequisites from one god; a Duo needs one named boon from each of two gods.
Recalled for the counts, sourced in shape via the owner's ledger. This is the
only mechanism in the canon where the pool grows rather than shrinks.

### Stacking curves

**Risk of Rain 2 bounds the total, not the step.** Sourced,
riskofrain2.wiki.gg Item Stacking and Tougher Times: magnitudes stack linearly,
and anything that would break at 100 percent stacks hyperbolically as
`f(x) = 1 - 1/(1 + a*x)`. Tougher Times at 15 percent per stack gives 13.04
percent at one stack and 60 percent at ten, not the linear 150. Bounded by
construction, monotone so pick order cannot matter, no cap table needed, and
because nothing can run away a duplicate is always a legitimate reward.

**Isaac's hard ceilings produce dead picks and it can afford them.** Sourced via
StrategyWiki Repentance stats: speed hard-capped at 2.0, a minimum tear delay of
5 past which the tears stat does literally nothing, luck clamped 0 to 10 for room
drops. Drawing a dead pick out of 716 items is rare. At 96 it would recur several
times a night and read as the pool being broken.

**Vampire Survivors converts the dead pool into stat increments.** Sourced, VS
Wiki Limit Break page: unlocked by a relic, and with it on, a fully upgraded build
stops receiving the money and heal consolation cards and instead gets extra
levels expressed as Might, Area, Speed, Duration, Amount, Pierce, Crit Chance and
Chance. Read that list against our stat block: it is nearly the same list.

**Brotato runs the same mechanism as the normal case from wave one.** Sourced,
the library's Brotato ledger at `report.md:213`: level-ups offer stat upgrades in
rarity tiers, and items come from the separate between-wave shop. Nobody
experiences Brotato's level-ups as filler, and that is the difference between a
stat card being how stats work and a stat card meaning the game ran out.

### Room delivery

**Hades' door is a closed-set reward menu that cannot saturate.** Every exit
carries a symbol naming what is behind it before you commit. The menu of reward
types is exactly the same size in chamber 40 as in chamber 1, so the navigation
choice is structurally incapable of running dry no matter what the item pool is
doing. This is the single most valuable idea in the canon for us and it is nearly
free, because we already paint reward previews on doors.

**Isaac spends agency to keep a floor moving.** Treasure Room items sit on one
pedestal, take it or leave it. The only rooms offering a choice among items are
the Shop, Devil Room, Angel Room and Library. It gets away with it because a
pedestal is a visible object in a quiet room you chose to walk into.

### Where permanent progression sits

**Dead Cells buys pool width and grants zero power.** Sourced,
deadcells.wiki.gg Blueprints page, which states plainly that unlocking does not
hand you the item at run start, only a permanent chance of encountering it. Every
run starts at the same power level and gets more varied over a lifetime rather
than easier.

**Gungeon splits the two halves cleanly.** Recalled: the grind currency buys new
guns and items into the drop pool, so a veteran has a richer game rather than an
easier one; the reward for a flawless floor is a heart container that dies with
the run. Currency earned by grinding buys content, and power earned by playing
well resets.

**Hades runs three separate permanent systems doing three separate jobs.** The
Mirror is paired, exclusive, respeccable permanent tuning; the keepsake aims a
single run before it starts; the Pact sets tonight's difficulty and pays out once
per configuration cleared. Recalled for the counts, sourced in shape via the
owner's ledger at `report.md:223` and `256`. The keepsake job, forming an
intention before leaving the hub, is the one our permanent layer has nothing
doing.

---

## 3. Why our game is not any of them

### The hybrid, stated properly

Combat is horde combat with survivors-like DNA. Structure is room-based with
Isaac and Hades DNA. Survivors-likes deliver items by levelling; Isaac and Hades
deliver items by rooms. The received framing is that we do the first and are
shaped like the second, and that this is the mismatch to resolve.

**That framing is wrong, and the correction is the most useful thing in this
document.** `banksLevelups` (`js/ui.js:984`) holds every ranked-up card through a
locked fight, and the stack drains the moment the room clears (`js/ui.js:2132`
and the recursive drain from `chooseLevelup`). The authors' own comment above it
says three cards in the middle of a wave is a freeze frame nobody asked for.
**The shipped game already delivers picks at room boundaries.** XP does not
deliver items at kill time; it is the accounting for how many cards the room
clear hands you.

So we are not choosing between two genres. We already run both. The XP curve says
how many, the room says when. What we actually have to decide is what each
channel carries, and the answer that falls out of the whole canon is:

> **The door carries DIRECTION. The room clear carries MAGNITUDE and the item.**

Both stay. Deleting the level-up channel is wrong for us because our rooms are
long: waves hand over at 25 to 40 percent remaining (`js/room.js:584-593`) across
two to four waves, with bodies released one per 0.06 seconds (`js/room.js:24`),
against a release-gate ceiling of 90 seconds per room
(`.claude/agents/release-gate.md:46`). A door-only economy leaves whole minutes
with no progression event inside a fight. Hades can put everything on the door
because a chamber is short and holds a handful of enemies. Deleting the door
channel is equally wrong, because a menu of directions is the only anti-saturation
mechanism in the canon that is completely independent of catalogue size.

One correction to the brief while we are here. I could not reproduce "up to about
90 living enemies" from the authored data. Parsing the room defs gives a median
of about 59 authored bodies per combat room, and the authors' own budget comment
at `js/rooms.js:181-182` states 55 to 70 spawns per combat room. With wave
handover at 25 to 40 percent the realistic peak concurrent count is roughly 25 to
40, rising toward 60 only in a room where a wave times out with everything still
standing. Ninety is a pathological case. That matters for anything that leans on
screen density.

### The code-generated art advantage, stated properly

Isaac has roughly 700 items and each one is a hand-drawn sprite plus a
hand-drawn in-world effect. We have no artist. But our art is generated code, and
the substrate already proves half of the payoff: `buildVis`
(`D:/Programs/mbm-3.0-substrate/js/traits.js:633-646`) folds the compiled trait
set into an eight-field descriptor once per grant, and `renderShotTraits`
(substrate `js/render.js:390-447`) stacks independent layers off it, so a shot
that is giant and burning and frozen draws a heavy rim, a warm additive glow, a
pale blue glow and a frost rim, all at once, and nobody authored that
combination. It ships behind one falsy check on `s.vis` (substrate
`js/render.js:192`), so the 2.0 look is untouched when nothing is granted.

There is a second, quieter fact that decides how large the catalogue can be, and
it is the reason the density objection to accumulation is a false premise. **The
descriptor saturates.** Of its eight fields, six are plain booleans and two are
`Math.max` (`js/traits.js:134` for bulk, `148`, `165` and `195` for trail).
Twenty burn items and one burn item both set `vis.hot = true` and draw
identically. Visual complexity is bounded by the size of the VOCABULARY, not by
the number of items held. That single property is what makes an uncapped ledger
survivable for us where it would not survive for a game needing a drawn sprite
per item, and it is why the fashionable objection ("thirty modifiers on every
projectile turns the screen to soup") does not apply to the layer it is aimed at.

**But the advantage stops dead at the card, and that gap is the largest
uncosted hole in the committed plan.** `SPR.icon` (`js/sprites.js:4802`) is a
switch over exactly eighteen hardcoded ids and a default case that paints a plain
gold five-pointed star (`js/sprites.js:4904-4907`). It is called everywhere the
build is shown. The failure is already live in the shipped game: the in-run shop
authors one of its three rows with `icon: 'chest'` (`js/ui.js:361`) and the
switch has no `chest` case, so that card renders as an anonymous gold star right
now. The string "icon" appears zero times in the 930 lines of
`BUILD_ECONOMY_3.md`. A 96-item catalogue authored under that plan ships 96
identical gold stars, or 96 hand-painted icons nobody budgeted.

The answer is already written, tested and shipping in our own repo, which is why
this is a solvable problem rather than a fatal one. See section 5.

---

## 4. The architecture

### 4.1 Where items come from

Four channels with four separate tables, because that is what makes saturation
partial rather than total. Today all three of our channels drain one table
(`levelPool` at `js/game.js:193-235`), which is why the shop prints SOLD OUT
(`js/ui.js:450`, gated by `runshopAvailable` at `js/ui.js:401`) when the pool
dies.

**1. The room-clear draft.** Kills feed the bar, ranks bank during the fight, the
banked stack drains as cards the moment the room clears. Three cards, four with a
board rank. This channel carries the ledger items, the weapon levels and the
overflow increments. It stays because it is the horde's heartbeat.

**2. The door, widened from room type to build direction.** `makeOffer`
(`js/run.js:742-758`) already returns `{kind, icon, label}` and for a combat door
rolls one of three payout flavours: coins at one third, heal at two thirds, gear
otherwise. `rollDoors` (`js/run.js:861-895`) already forces two or three real
options. The card already paints on the plaque.

**Two things change.** The vocabulary widens from three payout flavours to the
six FAMILIES below, so a door reads as a build direction. And the preview gets
honoured, which today it is not: room clear pays a flat coin amount by act
(`js/room.js:766-771`, calling `DATA.COINS.clear(act)`) no matter which door you
took, and grepping the tree for `offer.kind` finds no consumer outside `run.js`
and `room.js`. **The shipped game has been showing players a reward preview it
does not pay.** From now on the door names the family and the room's reward is
drawn from that family's sub-pool.

A night is 27 rooms, 8 then 9 then 10 (`js/rooms.js:155`, `163`, `171`), three of
them bosses, so roughly 24 real navigation choices already exist and are
currently spent on almost nothing.

**3. Chests, which become a choice of two and carry the keystone.** `grantChest`
(`js/game.js:274-288`) calls `levelPool(1)` and applies the result with no player
input at all, measured at 47 percent of all pick events. That is the worst single
number in the diagnosis and it is a half-day fix. Chests also deliver keystones,
which puts the run's identity moment in a room you chose to walk into.

**4. The shop, with its own small table and the player-side verbs.** It gets its
own stock plus a reroll priced in Cookie Money and Brotato's free lock. It can
never be empty because there are no slot gates left to close.

**Weapon swapping stays out of combat.** A weapon owns the fire button and manual
aim is muscle memory, so a new weapon offered when all four slots are full is
only resolvable at a rest, shop, loot or boss room. Everything in the ledger can
arrive anywhere.

### 4.2 What is capped

The rule, stated as the panel's cleanest formulation (grafted from the losing
ACCUMULATION proposal, because it produces the same answers as the clock test and
reads better):

> **A thing is capped if and only if it occupies a control surface.**

**CAPPED AT FOUR: weapons.** Unchanged from `js/data.js:8`. Weapons compete for
three finite resources that a modifier does not. They compete for the screen.
They compete for the ear, because each plays its own cue on fire. And they
compete for one aim vector, because holding fire fires every manual weapon at
once at the same `this.aimAngle` (`js/game.js:754`, read at `843`), so a fifth is
genuinely worse to play rather than just more. A ledger item competes for none of
that, because it does not draw an object of its own; it modifies objects already
being drawn. Capping items is a cap that buys nothing and costs the pool.

**CAPPED AT ONE: the active skill.** It owns a button.

**CAPPED AT ONE: the keystone.** A keystone grants a large trait bundle, floors
something, and owns the run's visual signature. Eight exist. Taking a second
offers a straight trade, and that is the only replacement prompt in the whole
design. One slot means Isaac's pairwise exception matrix never needs to exist:
there is never a collision to author, ever, at any catalogue size.

**UNCAPPED: the ledger.** `DATA.PASSIVE_SLOTS` (`js/data.js:9`) is deleted along
with the `pcount < DATA.PASSIVE_SLOTS` gate at `js/game.js:211` that closes the
modifier channel at minute five. Ledger items are single-acquisition, so there
are no duplicates and no rank machine. Patch ranks (`max: 3` on every entry,
`js/data.js:141-149`) are deleted.

**UNCAPPED: weapon levels, with one hard rule.** `DATA.WEAPON_MAX`
(`js/data.js:10`) is deleted. The five-level ladder exists only because each
weapon has exactly four hand-written entries in a `levels` array; it is where the
writing stopped, not a balance decision. Levels 1 and 2 stay plain numbers.
Levels 3 and 4 become forks, one of two authored clauses each, giving four
distinct end states per weapon. Level 5 and up is generated from the stat block
on the hyperbolic curve.

The hard rule, and it is a correction the combat-feel judge caught that nobody
else did: **a generated weapon level may raise magnitude and may never add a
projectile.** The shipped level deltas being generalised from do add projectiles
(the slingshot gains a stone at level 2 and again at level 4, the roaster gains a
gob at level 4, the firecracker gains one at level 3). A hyperbolic bound on a
multiplier does not bound an integer count, and the split guard only refuses
above 300 live shots (`js/traits.js:308`) against a 420 particle cap.

**UNCAPPED: overflow ranks against the stat block, from the first draft.**

### 4.3 The stat block: 19 stats, not 18

The block in `BUILD_ECONOMY_3.md` section 2 survives almost intact and is not
restated here. Four corrections, all of which are bugs in the committed plan
rather than preferences.

**Armour splits into two rows and the flat term is kept.** The committed plan
recommends converting flat armour to a percentage with diminishing returns
(`BUILD_ECONOMY_3.md:98`). That is a silent nerf to the tank scout that no
automated gate would catch. `damagePlayer` computes
`taken = Math.max(1, Math.round(dmg - this.armor))` (`js/game.js:472`), and at the
shipped ceiling of 11 (Gus 2, plus three Skillet ranks at 2, plus three Grit
ranks at 1) that reduces every chaff hit in the enemy table to the 1-damage
floor. **That immunity to small bodies is the entire reason Gus can stand still
in a crowd.** So: a flat term, 0 to 12, keeping the swarm immunity, plus a
percentage term, 0 to 0.60, hyperbolic, keeping the scaling against bosses. That
is 19 stats.

**Dodge Recharge is bounded on resulting invulnerability uptime, per scout, not
on a multiplier.** The committed plan gives it a 2.50x ceiling. Junie already
runs 60 percent invulnerability uptime with zero items (2 charges, 0.8 second
cooldown, 0.24 second window, `js/data.js:438-440`, assigned not accumulated at
`js/dodge.js:61`, and `damagePlayer` bails on `p.dashI > 0` at `js/game.js:471`).
2.50x puts her past 100 percent, which is permanently untouchable. Max is at 30
percent and Gus at 24, so one multiplier means three different things. Cap the
uptime at 0.75 and compute the multiplier per scout.

**Move Speed's floor is 132, not 90.** `js/data.js:200-206` records the fix and
the reason in the authors' own words: a boss was cut from 76 speed to 58
specifically so that Gus at 132 with no boot patch still catches him, because at
76 "he could not be caught by anyone who had not bought speed, and the fight
simply never ended." A floor of 90 reintroduces that bug.

**The crit line has drifted.** The hardcoded crit multiplier is `dmg *= 2` at
`js/game.js:343`, not 342 as the committed plan states. Ten minutes to fix, and
worth fixing because the plan asks agents to make 23 edits at cited line numbers.

### 4.4 The stacking curve

Fractional and multiplier stats use the Risk of Rain 2 hyperbolic **total**:

```
total(n) = bound * (a * n) / (1 + a * n)
```

Integer stats (Extra Shots, Pierce, Luck, armour points) use a plain additive law
with a hard cap.

This replaces the committed plan's per-step decay,
`step(n) = baseStep / (1 + n/4)` (`BUILD_ECONOMY_3.md:305`). Two reasons. The
per-step form is a harmonic series whose sum diverges, so it slows the approach
to a runaway without preventing one, and the bounds table ends up doing all the
safety work rather than acting as a backstop. And the printed worked example does
not reproduce: summing `1/(1 + n/4)` over twenty ranks gives 7.60 indexing from
zero or 6.77 indexing from one, against the stated 6.3. The hyperbolic total is
bounded by construction, monotone so pick order cannot matter, needs no stored
per-step state, and is one line.

The card renderer must display a delta computed as `total(n+1) - total(n)` rather
than reading a stored step, and that must live in exactly one place or the two
representations drift.

### 4.5 Families

Six families, closed. Every ledger item, every keystone and every door sigil
carries exactly one.

1. **Geometry.** Size, shot count, reach, pierce, split, orbit, ricochet, bounce.
2. **Heat.** Burn, rend, effect duration, damage over time.
3. **Cold.** Freeze, slow, force floored to zero, crowd holding.
4. **Motion.** Attack speed, move speed, dodge recharge, all seven dash traits.
5. **Blood.** Crit chance, crit damage, armour, regeneration, max health, the
   on-damaged hooks.
6. **Take.** Drawbacks and trades, coin income, badge XP, luck, pickup radius,
   the on-kill hooks.

Six because that maps onto the twelve shot traits (`js/traits.js:398-411`) and
seven dash traits (`js/traits.js:599`) without inventing a verb, and because six
sigils is what a player can learn in one night. Families do four jobs: the door
names one, the scout biases toward two, three-different-of-a-family is the
keystone gate, and the family is the acquisition cap below.

Family count and render-channel count are separate axes and are not forced to
match. Six and six is a coincidence and nothing should depend on it.

### 4.6 The full pool gating ruleset

Eight rules. All eight are data plus one offer builder in a new `js/pool.js`.

**RULE 1. Taken deletes, seen decays.** Taking an item removes it for the night.
Being offered in the draft and declined multiplies its weight by 0.35. Being seen
in a chest or shop and not taken multiplies by 0.7, so a thing you could not
afford comes back. This is Isaac's see-versus-touch split with two tiers instead
of six. Today `levelPool` (`js/game.js:193-235`) rebuilds from ownership alone
with fixed weights of 10, 6, 8 and 5 (`js/game.js:198`, `203`, `210`, `212`) and
nothing anywhere records that a card was offered and declined, so a card you
turned down at rank 3 is exactly as likely at rank 4 and the same three cards can
chase a player all night. One Map, cleared at run start, under an hour.

**RULE 2. Per-family acquisition cap of six.** A family may pay at most six
ledger items a night. This is the graft that fixes this architecture's real
weakness, and it comes from the losing ROOM DELIVERED proposal by way of the
depth judge, who named it explicitly as the correction. Without it, 26 ledger
picks drawn from a vocabulary of nineteen traits plus nineteen stats means most
runs touch most verbs and two builds converge. With it, at most six of your
twenty-six items are heat items, so you cannot hold the whole heat vocabulary and
the whole geometry vocabulary in the same night.

**The invariant that must be checked as a gate, because it is what killed the
proposal this came from:** family count times the per-family cap must exceed
ledger picks per run **on a fresh save**, not merely at full board. Six families
at six is 36 against 26 picks, a 38 percent margin, and it holds on a fresh save
because all six families ship unlocked (see 4.8). Any future change to family
count, cap or pick count re-checks this.

**RULE 3. No offer contains two items of one family.** One check in the offer
builder. This is stronger than the committed plan's anti-monotony rule, which
only covers overflow stats, because it makes the screen look varied even when the
build is narrow.

**RULE 4. Exclusion, budgeted at twelve pairs, net non-negative.** An authored
table of "you now hold X, so Y leaves the pool." Isaac can delete freely from 716
items and we cannot delete freely from 96, so the constraint that makes this safe
is grafted from ACCUMULATION and is not optional: **every pair that closes
something must be matched by a pair that opens something, so the table's net
effect on pool size is zero or positive.** A pair that only closes is not allowed
to exist. Without it, we reinvent our own saturation with extra steps.

**RULE 5. Prerequisites, and they are visible before they are met.** Eight
keystones: one per family, gated on holding three DIFFERENT items of that family,
plus two cross-family, gated on three from each of two named families. Different
items only, never duplicates, because counting duplicates is a duplicate machine
and we have no duplicates at all.

Hades' duos and Isaac's transformations both work partly because the target is
knowable: Hades names the two gods on the card, and Isaac's community memorised
sixteen sets over a decade. We will have no wiki and no community, so a hidden
prerequisite is a lottery, not a goal. **The tally is shown.** The family strip on
the HUD (4.9) is the prerequisite UI and costs nothing extra. If a gate cannot be
stated in one plain line, it is not authored.

Note a property this architecture has that a slot-capped one structurally cannot:
because the ledger accumulates and never trades away, a gate met is met forever.
On a design that trades items through six slots, the thing that satisfied a gate
can be thrown away, so gates must stay shallow or the player gets punished for a
replacement the game encouraged.

**RULE 6. No dead card, ever.** The offer builder refuses any card whose applied
effect after clamping would be zero. One guard, and it must not be forgotten. Our
flat armour is already this bug in a different costume, and Isaac's speed and
tear-delay caps are the canonical version.

**RULE 7. Overflow runs from the first draft, not from exhaustion.** Brotato's
level-ups have always been stat picks and nobody reads them as filler; Vampire
Survivors' Limit Break is a late unlock and is understood as an endgame toggle.
If our stat cards only appear once the interesting ones are gone, the player
learns that a stat card means the game ran out. The three filler cards
(`js/data.js:262-266`, returned by `js/game.js:216-224`) are deleted from the
level-up path entirely and survive only as a chest fallback that rule 6 makes
unreachable.

**RULE 8. The per-trait stacking policy is written down and enforced.**
`compile()` (`js/traits.js:611`) does not deduplicate by trait id and stacking
behaviour differs per trait with no stated policy. In a slot architecture that is
a corner case; here, two grants of the same trait is certain. The policy:
accumulate (sum) for pierce, bounce, ricochet and extra shots; multiply for
giant; take the max for burn damage, freeze duration, rend and chain jumps;
single-instance for orbit, homing, seek and split, where a second grant raises
the config parameter and never adds a second instance. Split especially: today
two grants each call `burst()` and produce two batches of children per hit behind
only the 300-live-shot guard at `js/traits.js:308`.

### 4.7 The three trait scopes and the field arming door

This is the engine change that makes "your items improve all four weapons" true
rather than a slogan, and it is the winning proposal's own contribution.

Traits currently ride the projectile. Only three of nine weapons produce an armed
projectile. So the model becomes three scopes, not two:

- **strike:** needs only a hit. Burn, freeze, rend, chain, plus the on-kill and
  execute verbs. Works on all nine weapons today, unchanged, because `dealDamage`
  (`js/game.js:337`) is the single door every point of player damage comes
  through.
- **carrier:** needs a moving thing with a heading. Seek, homing, orbit,
  ricochet, bounce, pierce, split, giant. Works on projectiles today.
- **field:** needs an area with a radius and a duration. **New, and it closes the
  hole.** Six of the nine weapons already create an object with a position and a
  lifetime; they are simply never armed. Add a second door beside `armShot`
  (substrate `js/game.js:164`) called `armField`, same shape, and six call sites:
  the hatchet swing, the firecracker bomb, the canteen puddle, the bugle ring,
  the knife orbit and the spray aura. Giant then scales the radius instead of the
  shot size, which is the same field name at five of the six sites and is already
  on the committed plan's counted edit list. Split spawns smaller copies of the
  field. Pierce extends the hit budget.

Some pairs are meaningless: homing on a ring has no heading. So there is a
published **scope table of twelve traits by three surfaces**, with a stated
behaviour or a stated no-op in every cell. That is 36 cells written once, and it
stays 36 forever no matter how many items ship. It is not Isaac's O(n squared)
keystone matrix, because a surface is not an item.

### 4.8 What the Badge Board becomes

**Today the board makes saturation arrive faster, and this is arithmetic, not
feel.** Head Start sells three ranks of "Start 1 rank higher" (`js/meta.js:13`,
costs 90, 200, 420) and the constructor spends them before a single enemy exists:
`this.level++; this.pendingLevelups++` in a loop at `js/game.js:130-136`. At run
start the offer weights are 10 for an owned weapon upgrade and 6 and 5 for new
things, so on a fully unlocked save the great majority of the offer weight is a
genuinely new item, and three free picks at t=0 consume roughly 2.6 of the seven
new things a night has. **The most invested player burns about 37 percent of the
night's novelty budget before seeing a critter.** Merit Scholar compounds it:
three ranks at +8 percent badge XP land in `recalc()` at `js/game.js:163` as a
flat 1.24x multiplier from the first frame. And five of the eight ranks feed a
stat a patch already feeds (`js/meta.js:7-14` against `js/data.js:141-149`).

**The board becomes a pool board. It buys what the woods contain and never what
the scout starts with.** This is the Dead Cells blueprint model, and we already
shipped the engine and then pointed a stat shop at the player anyway:
`FEAT_VAULT` (`js/feats.js:271`) physically lifts a locked definition out of its
`DATA` table so no loop over `DATA.weapons` ever sees it, driven by a generic
kind-to-table map at `js/feats.js:266`, and puts it back the night the badge
lands. It gates eight pieces of content today (`js/feats.js:259-263`) while the
board separately sells 22 ranks of raw power.

It sells four things, none of them power:

**1. Pool width.** All six families ship on a fresh save with 12 items each, 72
available. The board releases the remaining 24, a few per purchase, spread across
families. **The unlock unit is deliberately items-within-families and not a whole
locked family**, and that is a place where I side against the depth judge, who
preferred a family as the unlock because it is more legible. The reason is the
fresh-save invariant in rule 2: locking a family makes the cap arithmetic depend
on unlocks, which is exactly the flaw that sank the proposal the family idea came
from. A seventh family is the right shape for a post-launch content pass, where
it only ever adds.

**2. Offer width.** One purchase takes the room-clear draft from three cards to
four. Nuclear Throne shows four mutations per level up (sourced,
nuclear-throne.fandom.com Mutations) from a pool of roughly two dozen across a
nine-pick run and does not saturate. Offer width is what a player experiences as
variety. The research library validates pick-one-of-N only for N in 2, 3 and 4,
so four is the ceiling and it is the right thing to sell.

**3. Player verbs.** A reroll charge, a banish charge, a free-lock charge for the
shop. Grepping the whole `js/` tree for reroll, banish and skip returns no
gameplay hit anywhere: the player has literally no lever on the offer
distribution today. Honest caveat, and it is why these are meta rather than the
fix: on a dead pool a banish makes it deader and a reroll returns the same cards.
They buy offer quality, never pool depth.

**4. An intention, equipped before the night.** One slot holding a family token
that guarantees that family appears on the first door and biases the offer all
night. This is the Hades keepsake job, the one thing our permanent layer has
nothing doing, and it is nearly free because the offer-bias machinery has to exist
for Luck and the scout biases anyway.

**Head Start is deleted.** Second Wind survives unchanged (`js/meta.js:14`); it
is the one rank that does not compress the build.

**The Tally Post gains one-time payouts.** Six blazes exist, each a named
worsening paying a percentage on every badge the night banks (`js/feats.js:469-501`).
Today that is a pure farming multiplier that rewards repeating your best night
forever. Hades tracks the highest difficulty each weapon has personally cleared
and pays once per configuration (recalled for the detail; the owner's ledger
confirms the Pact exists and flags its numbers as needing verification). Same
change: the payout for clearing a new blaze combination on a given scout is one
time. Half a day of bookkeeping plus one UI line.

**The thematic read is free and correct.** Badges are proof of witness, and the
permanent system is meant to be complicity rather than power. A board that makes
the scout stronger contradicts that. A board that makes the woods have more in
them does not: the most invested player has the strangest night, not the easiest
one.

**The save breaks and we pay it once.** The camp transfer code's fingerprint
covers the board definition keys, so deleting any rank invalidates every existing
code. 2.0 is unlisted and the installed base is the owner plus one or two
playtesters. Bump a version byte, refund every badge ever spent at full value,
show one migration screen. Half a day, and designing around it would cost more
than paying it.

### 4.9 How a player reads their build

Four surfaces, none of them a pause screen, in the order they carry weight.

**1. The shot and the bodies, continuously.** Section 5. This is the primary read
and it is the one that works while forty things are trying to touch you.

**2. The family strip, in the top band of the HUD.** Six family marks, each
showing progress toward three, filling as items are taken. Its size is
O(families), not O(items), which is the property that makes it work: it is the
same six marks at item 26 as at item 3. At a glance you read the COLOUR of the
strip, and the colour is the family colour, so a heat build has a warm strip. It
doubles as the keystone prerequisite display, so it pays for two features at
once.

The idea is grafted from ACCUMULATION, which proposed nine family tallies. The
placement is grafted from the combat-feel judge and overrides the proposal that
suggested it: **that proposal put its strip along the bottom, and the bottom of a
phone screen is the control surface.** The move stick, the aim stick and the
dodge button all live there (`js/touch.js:23-32`), and `ZOOM` is a fixed 1.5
(`js/game.js:6`) against `window.innerWidth`, so a 375-pixel phone sees 250 world
units and has no spare width down there either. Top band, wrapped, six marks.

**3. The card, at the moment of the pick.** Section 5.

**4. The pause list.** Survives for people who want the exact contents
(`js/ui.js:1116`), and nothing requires it.

This is a genuine and permanent cost: at item 26 the strip tells you the shape of
your build and not its contents. Isaac has the same problem and does not solve it
either. The counter is that the shot composes and the strip colours, so the build
reads at the level that matters during a fight, and that the readable-at-a-glance
problem is really an icon problem that a slot cap does not fix.

---

## 5. The visual system

Two composers sharing one descriptor. The projectile composer exists and works.
The card composer does not exist anywhere and is the piece the panel called
unproven.

### 5.1 The projectile composer, and the hard limit

What ships today on the branch: `compileShot` folds an eight-field descriptor
(hot, cold, rend, arc, split, bulk, trail, ghost) once per grant and hangs it as
a non-enumerable property (`js/traits.js:633-646`, `656`). Each trait contributes
through a `vis(out, cfg)` hook. `renderShotTraits` (substrate `js/render.js:390-447`)
stacks independent additive layers off it and the renderer never walks traits.

**The hard limit on simultaneous visible signatures is SIX CHANNELS**, each
physically able to hold exactly one value, resolved once at compile time by an
authored priority. This is grafted from ACCUMULATION, and it is grafted as a
BOUND rather than as the replacement that proposal wanted, which is the one place
I side with the combat-feel judge against a losing proposal's own reasoning. That
proposal argued the additive renderer's draw cost grows with build size and must
be replaced. It does not grow: six of the eight descriptor fields are booleans
and two are `Math.max`, so twenty burn items and one draw identically. Rewriting
a finished, proven renderer to fix a growth that does not happen, and paying a
permanently narrower visual language for it, is the wrong trade. What we take is
the ceiling.

- **CORE.** The shot's fill and silhouette. From the weapon's own kind, then bulk.
- **RIM.** One stroked outline, one colour. From rend, freeze, pierce, bulk.
- **HALO.** One additive radial gradient. From burn and freeze. Two contributors
  blend as a single gradient with two colour stops, so hot plus cold still makes
  the strange colour the branch comment celebrates, as one gradient instead of
  two.
- **WAKE.** The trail ring buffer already allocated at `js/traits.js:687`. Length
  from homing, seek and orbit; colour from HALO.
- **BEAT.** The on-hit flourish at the impact point. From chain, split, bounce,
  pierce. **This is where the five currently silent verbs get a signature, and it
  is the right place because it is where the player is looking.**
- **MARK.** Drawn on the ENEMY, never on the shot. Every status: burn, freeze,
  rend, mark.

MARK is the single best readability idea in the whole panel and it is grafted
from ACCUMULATION intact, because the combat-feel judge verified the gap: only
the burn timer has a body visual today (two flame dots in the enemy renderer),
while the slow and rend timers draw nothing on the body at all. And on a phone at
250 world units the shot is a few pixels and the enemy is ten to sixteen, so the
enemy is where information belongs.

**The anti-noise principle, stated so nobody undoes it:** geometry paints the
shot, statuses paint the body. A build with six statuses therefore paints six
kinds of dying critter and one kind of stone, which reads as the woods being
wrong rather than as a christmas tree on a bullet. That is exactly the Isaac
register the story spine asks for: cute shapes, wrong details, the wrong allowed
to stay.

Each trait declares two fields in data, a channel and a priority. `buildVis`
becomes a resolver writing six values. It already runs once per grant and never
per shot, so resolution is free, and the renderer then draws at most six things
per shot regardless of build size.

**Three gaps that are release-blocking under an uncapped ledger.**

1. **Five of the twelve shot traits draw as nothing.** Pierce
   (`js/traits.js:245`), bounce (`223`) and ricochet (`202`) define no `vis` hook
   at all, and `vis.split` (set at `303`) and `vis.ghost` (set at `458`) are
   written into the descriptor and read nowhere in the renderer. A build
   assembled from pierce, bounce and ricochet is visually identical to a build
   with no traits. Under an accumulating layer an invisible upgrade is the
   primary failure mode: the player takes twenty things and the screen does not
   change.
2. **The dash has no derived visual system at all.** `compileDash`
   (`js/traits.js:661`) never attaches a `vis`, so the phase trait's hook is dead
   code and the other six dash traits have none.
3. **The six non-projectile surfaces need a descriptor read.** They are not armed
   projectiles, so they read the run-level descriptor rather than a per-object
   one. Four more render branches on the same fields.

**One real performance cost, and it is a caching fix rather than an architecture
one.** `renderShotTraits` calls `ctx.createRadialGradient` per hot-or-cold shot
per frame (substrate `js/render.js:403`, `421`). Cache gradients per radius
bucket. Half a day.

**The particle budget splits three ways and feedback never loses.** There is a
verified priority inversion in shipped code: the burn trait's ember shed gates at
420 (`js/traits.js:355`) while `dealDamage`'s hit sparks gate at 380
(`js/game.js:354`), so a burning build can starve its own hit feedback. Three
sub-budgets: feedback 200, ambience 140, effect 80. Grafted from ACCUMULATION,
and needed under any architecture that adds burn items.

### 5.2 The card composer, and the honest verdict on it

**The panel did not judge composed card icons infeasible, but it did judge them
unproven, and all three proposals underpriced them by about a day.** The
feasibility judge's finding is worth quoting in substance: the merit badge frame
genuinely is shared machinery, but each of the fourteen emblems still carries
roughly 37 lines of bespoke illustration on top, so "frame plus colour plus
glyph" is a real simplification that nobody has demonstrated yet.

**The template is already written, tested and shipping in our repo.** The
fourteen merit badge emblems (`js/sprites.js:1752` onward) are not fourteen
drawings. The authors state the rule out loud at `js/sprites.js:1758-1763`: every
one is a 40 by 40 bake box, the same merrowed edge laid by `mbStitchRing`
(`js/sprites.js:1774`), the same rope colours (`js/sprites.js:1768`), the same
felt weave clipped by `mbFelt` (`js/sprites.js:1817`), and **only the field
colour and the symbol change**. `mbRound` (`js/sprites.js:1839`) and `mbShield`
(`js/sprites.js:1876`) give two silhouettes off shared constants
(`js/sprites.js:1764-1767`).

A composed item icon is three parts:

1. **Frame.** Round for a ledger item, shield for a keystone. Both already
   written. The silhouette alone tells you a keystone from across the card.
2. **Field colour.** One of six, from the item's family. One table. This is also
   the family strip colour and the door sigil colour, so the family read is the
   same read at 34 pixels on a card, at 14 on the strip, and on a door plaque.
3. **Symbol.** One to three glyphs in a fixed three-slot grid, composed from the
   item's own verbs, laid out in `SHOT_ORDER` so the arrangement is deterministic
   and a player learns to read it.

**Budget 3.5 days, not the 2.5 every proposal guessed**, and it must land BEFORE
the catalogue is authored, because the composer needs the item schema to carry
the family and the glyph slots and retrofitting 96 authored ids is a second pass.

**The fallback, named now so it is a decision and not a panic.** If three-slot
composition does not read well at 34 pixels after two days of glyph iteration,
ship frame plus family field colour plus ONE glyph, the item's primary verb.
That is roughly 20 glyph painters and a colour table, about 1.5 days, and it
still gives six visually distinct card families and beats the gold star
completely. What we do not do under any circumstance is hand-paint the
catalogue: at the emblems' measured rate of roughly 52 lines each, 96 icons is
about 5,000 lines and roughly 8 developer days that appears in no estimate.

**The payoff no competitor gets:** the card and the projectile are composed from
the same descriptor, so the icon on the card and the look of the shot match by
construction, including for combinations nobody authored. Isaac pays an artist
700 times for a static picture that a later patch can silently make wrong.

**The standing budget rule.** The descriptor field count is a tracked design
budget with an owner. Every proposal for a new verb must answer what it looks
like before it is accepted. That slows item brainstorming on purpose.

---

## 6. The content math

### The catalogue

| Thing | Count | Notes |
|---|---|---|
| Ledger items | 96 | 16 per family; 72 available on a fresh save, 24 released by the board |
| Keystones | 8 | 6 single-family, 2 cross-family |
| Weapons | 12 | 9 shipped (`js/data.js:39-139`) plus 3 new at one day each |
| Skills | 6 | 3 shipped plus 3 new at one day each |
| Fork clauses | 48 | 2 at level 3 and 2 at level 4 per weapon, 4 end states each |
| Overflow | unbounded | 19 stats on the hyperbolic curve |

Authored pieces the pool can offer: 122, plus unbounded overflow.

### Picks per run

The committed plan's proposed curve survives:
`DATA.xpNext = l => floor(10 + l * 5.0 + pow(l, 1.55) * 0.9)`. Against the
measured badge income (act 1: 552 raw over 5.48 minutes; act 2: 1058 over 5.25;
act 3: 2207 over 6.90) it produces 30 ranks split 10 / 9 / 11, gently rising,
against today's measured 8 / 6 / 6 that falls while income triples. Plus about 17
chest picks. **About 47 pick events in a 17.6 minute night**, plus 24 door
direction choices.

Where they land: roughly 18 weapon ranks, 26 ledger items, 1 keystone, and the
remainder absorbed by overflow, which means there is no remainder and no filler
card at any point.

### The inequality that is the whole diagnosis

Today: 37 pick events against an absorption capacity of 32 (4 weapons times 5
levels at `js/data.js:8` and `10`, plus 4 patches times 3 ranks at `js/data.js:9`
and `141-149`). That is 2.10 delivered per minute against 1.82 absorbable. We
over-deliver by 15 percent and are the only game in the family that does.

Under this architecture absorption is unbounded on three of four channels, so the
inequality cannot be violated by arithmetic. It is a structural guarantee rather
than a tuning target, which matters because tuning drifts and structure does not.

### Ratios, stated honestly in both directions

- **Pool to picks on the ledger:** 96 against 26, so 3.7 to 1.
- **Pool to picks overall:** 122 authored pieces against about 45 taken, so 2.7 to
  1.
- **Per-family, which is the ratio the player actually steers:** 16 items against
  a cap of 6, so 2.7 to 1 inside the channel they are leaning on.

For comparison: Isaac is roughly 29 to 1 (sourced: 716 collectibles in Repentance
against a couple of dozen picks). Balatro is 30 to 1 (sourced, balatrowiki.org:
150 jokers against 5 slots). **Ours is the lowest number in this document and I
am not going to dress it up.** All three architectures were within a factor of
1.5 of each other on catalogue size and all three show the player most of the
catalogue on night one. That argument is over and nobody won it.

### What a player sees

**In one run.** 30 drafts at three cards is 90 impressions, plus 17 chests at two
is 34, plus shop stock, plus locked prerequisite cards shown as goals. Roughly
130 card impressions. After within-offer dedup, the one-per-family rule and the
seen-decay, **a player lays eyes on roughly 65 to 80 distinct pieces of a
122-piece catalogue in a single night.**

**In twenty runs.** Every ledger item has been seen. But the divergence has never
been in the ledger, and this is why the architecture wins on depth despite that
number:

- Weapon sets: 12 choose 4 is **495**.
- Fork end states: 4 per weapon, so 4^4 is **256** shapes per held set.
- Keystone: **8**, and it owns the run's signature.
- Total weapon-and-keystone configurations: **1,013,760**, every one AUTHORED,
  which means every one is legible, learnable and different in a way a player can
  name.

At run twenty a player has tried maybe ten of 495 weapon sets and a dozen of 48
fork ends. Random draws from a bag of 96 do not produce that, and over 200 runs a
probability distribution regresses to its mean while a set of authored shapes
does not, because the player is working through named things rather than
sampling.

**Run-to-run item overlap, the number that costs me.** Taking 26 of 96, the
expected shared count between two independent nights is 26 x (26/96) = 7.0, so
**about 27 percent of the ledger repeats.** A six-slot design holding 6 of 72
shares 0.5, so 8 percent. The capped design wins that metric outright and it is
arithmetic, not tuning. What buys it back is the weapon set, the fork ends, the
keystone, the door path and the acquisition ORDER, which under an accumulating
ledger determines which prerequisites became legal when. Two builds sharing seven
items with different keystones and different forks are not the same build. But
the raw overlap number belongs to the other design and a rival is entitled to say
so.

### Cost per additional item once the engine exists

Measured against the four demonstration relics on the substrate branch:

- **A pure composition item** (stat entries plus trait entries) is 7 to 8 lines
  and about **12 to 18 minutes**.
- **A hook item** with a real handler is 23 to 24 lines and about **40 minutes**.

**The marginal unit is one item.** Twenty more items is one authoring day with no
art, no icons and no code, which is the correct shape for a paid release with
post-launch content passes. That property is a direct consequence of two rules
and it evaporates if either is broken: the vocabulary rule (an item that cannot
be written from the 19 traits, 19 stats and 12 hook events is a change request
against the vocabulary, not an item) and the composed icon (an item that needs a
drawn picture to be understood is not authored).

---

## 7. What changes from BUILD_ECONOMY_3.md

That document is committed and will otherwise be cited by mistake. Here is
exactly what stands and what does not.

### Survives unchanged

- **Section 1, the entire diagnosis.** Measured, re-verified, and the numbers in
  it are the baselines section 8 has to beat.
- **Section 2, the stat block**, 17 of its 18 rows, the discipline that every
  stat carries a bound, the fixed math order
  `final = (base + FLAT) * (1 + PCT) * MULT`, all five naming-collision fixes
  (the two meanings of `cdMul`, the cooldown name that lies, the three things
  called speed, the five things called radius, and the hidden `attackScale` area
  multiplier at `js/game.js:836-838` that must be folded into Area or Area
  double-counts against Damage), and the rule that a board rank may not feed a
  stat a patch already feeds.
- **Section 3, the vocabulary rule.** Load-bearing, quoted above, unchanged.
- **Section 5, four weapon slots**, and the argument for them.
- **Section 5, weapon forks and the clause rule.** A fork clause is a trait grant
  or a field delta and may not add a branch to `fireWeapon`.
- **Section 6, the proposed curve**, and its derivation against measured income.
- **Section 6, patches lose their ranks.** Single acquisition, for exactly the
  stated reason.
- **Section 6, the three-delivery-channel diagnosis** and the finding that all
  three drain the same pool.
- **Section 7, the scouts.** A scout becomes a full stat row with real negatives,
  a signature trait, an offer bias and a starting weapon. It is now 19 rows.
- **Section 8, the measured merge sizes for U1** and the finding that
  `js/run.js`, `js/ui.js` and `js/meta.js` are not part of the merge.
- **Section 8, the 23 measured edit sites** across the `fireWeapon` switch.
- **Section 9's rejections:** no currency-and-shop economy, no more weapon slots,
  no 241 items, no projectile speed as a player stat, no anti-snowball
  throttling.

### Superseded

- **Section 2, stat 12 (Armour).** The recommended conversion to a percentage is
  **rejected** as a silent nerf to the tank scout. Armour splits into a flat term
  and a percentage term, and the block is 19 stats, not 18.
- **Section 2, stat 15 (Dodge Recharge).** The 2.50x ceiling is replaced by a
  bound on resulting invulnerability uptime, capped at 0.75, computed per scout.
- **Section 2, stat 14 (Move Speed).** The lower bound of 90 is replaced by 132,
  the boss-catchability floor recorded at `js/data.js:200-206`.
- **Section 2's citation of the crit multiplier at `js/game.js:342`.** It is at
  343.
- **Section 3, "4 gear, 6 patch, 1 skill slots drawing from 12 weapons, 72
  patches, 6 skills."** Patch slots are deleted entirely. The catalogue is 96
  ledger items plus 8 keystones.
- **Section 3, the six-way item taxonomy** (stat modifiers, behaviour grants,
  conditional, drawbacks, transformative, rare payoffs) **as separate CARD
  KINDS.** They remain useful authoring categories, but a ledger entry is one
  object that may carry stat entries, trait entries and hook entries together,
  and the player's model is one sentence rather than four.
- **Section 4, the overflow track as "the mechanism".** Overflow is a normal card
  kind from the first draft, not an exhaustion fallback. The mechanism is the
  uncapped ledger; overflow is the guarantee underneath it.
- **Section 4, `step(n) = baseStep / (1 + n/4)`.** Replaced by the bounded
  hyperbolic total. Its printed worked example (6.3 base steps over twenty ranks)
  also does not reproduce.
- **Section 4, the anti-monotony rule.** Superseded by the stronger
  one-per-family-per-offer rule, which subsumes it.
- **Section 4, rarity tiers as a scheduled rider.** **Dropped entirely.** With 96
  single-acquisition items and no duplicates there is no repeated card for a tier
  to make stronger, and 96 is too small for tiers to be distinguishable. The job
  rarity was going to do is carried by the eight keystones.
- **Section 4, "replacement over exhaustion, for patches only."** There is no
  patch slot to replace through. The single replacement moment is the keystone.
- **Section 5, `DATA.WEAPON_MAX` from 5 to 4.** The cap is deleted entirely, with
  the rule that a generated level may never add a projectile.
- **Section 6, "roughly 23 to 29 content picks and 18 to 24 overflow."** Recast
  as roughly 18 weapon ranks, 26 ledger items, 1 keystone and overflow absorbing
  the remainder.
- **Section 8, U7.** The Badge Board is not de-duplicated and repointed at other
  stats; it stops selling stats altogether and becomes a pool board. Head Start
  is deleted rather than repriced.
- **Section 8, U1 at one day.** 1.5, because it must also serialise items in the
  save and write the removal path.
- **Section 8, the 15.5-day total.** 27.5, and section 8 below shows where every
  extra day goes.
- **Section 9, "unlimited patch slots" as a rejection.** Reversed. The stated
  reason (build legibility in a horde run) is real and is answered by the family
  strip and the composed shot, and the slot cap it defended is the thing that
  closes the new-items channel at a median of 4.7 minutes.

### Absent from that document entirely, and now required

Every one of these is either a bug in shipped or branch code, or work that any
large-catalogue architecture owes.

- **The composed card icon.** The word "icon" appears zero times in its 930
  lines, and `SPR.icon` already paints a gold star for a live shop card today.
- **The strike / carrier / field scope split and `armField`.** Without it, six of
  nine weapons receive four of twelve traits and no derived visual.
- **The six render channels, the MARK principle and the particle budget split.**
- **The five visually silent traits, the dash descriptor and the field
  descriptor.**
- **Doors carrying build families**, and honouring a preview the shipped game
  already shows and does not pay.
- **The offer ruleset:** seen-decay, per-family cap, one-per-offer, the exclusion
  table with its net-non-negative budget, visible prerequisites, the no-dead-card
  guard.
- **Item serialisation in the mid-run save.** The substrate branch has no save
  code at all (grepping its `js/game.js` for snapshot, restore, removeRelic and
  Hooks.off returns zero hits) and main's save (`js/game.js:1548` and `1598`)
  knows nothing about items. Shipping the merge as written means a player who
  closes the tab mid-night returns with every weapon intact and every item
  silently gone.
- **The removal path.** About ten lines, because `rebuildTraits` recompiles the
  whole set from the list rather than mutating incrementally.
- **The Tally Post one-time payout ladder.**
- **A director scaling term** keyed to build depth, as the backstop for an
  uncapped ladder meeting three authored acts with fixed bosses.

---

## 8. The build order

**The `v3-substrate` branch is the FOUNDATION, not a merge chore.** Its trait
pipeline, its event bus and its derived projectile visuals are the most valuable
code in either tree and this entire architecture is built on them. It is merged
first and everything else lands on top.

Every wave leaves a shippable, bot-verifiable game.

### Wave 0: the engine floor. 6.0 days. Sequential, one unit owns `js/game.js` at a time.

| Unit | Days | Files | What |
|---|---|---|---|
| E1 | 1.5 | `js/traits.js` (new), `js/hooks.js` (new), `js/game.js`, `js/dodge.js`, `js/data.js`, `js/render.js`, `js/director.js` | The substrate merge, hand-applied. Plus item serialisation in snapshot and restore with id validation matching how weapon and passive ids are already validated. Plus the removal path. Plus the per-trait stacking policy from rule 8, written down and enforced in `compile()`. |
| E2 | 1.5 | `js/traits.js`, `js/game.js` | The strike / carrier / field scope split. `armField` beside `armShot`, six call sites, the published 12-by-3 scope table. **After this evening, all nine weapons inherit your traits.** |
| E3 | 3.0 | `js/stats.js` (new), `js/pool.js` (new), `js/game.js`, `js/dodge.js` | The 19-stat block, the bounds table, the hyperbolic total, the offer builder. The 23 measured edit sites plus the crit, armour and dodge one-liners. Folds `attackScale`, preserving its range term on the hatchet or every existing damage build silently gets a shorter axe. |

The game plays identically after E1, better after E2, and reproduces the measured
run apart from the intended armour and crit changes after E3.

### Wave 1: the art floor. 5.5 days. Blocks the catalogue.

| Unit | Days | Files | What |
|---|---|---|---|
| A1 | 3.5 | `js/sprites.js` | The composed card icon on the `mbRound` / `mbShield` frame. Roughly 24 glyph painters, a three-slot composer, a six-entry family colour table. Fallback at 1.5 days if composition does not read at 34 pixels: frame plus colour plus one glyph. |
| A2 | 2.0 | `js/traits.js`, `js/render.js` | The six-channel resolver, MARK on bodies, the five silent traits, the dash descriptor, the field descriptor, cached gradients, the three-way particle split with feedback first. |

Existing cards get better on the day A1 lands, which is why it is a shippable
wave on its own.

### Wave 2: the structure. 8.0 days.

| Unit | Days | Files | Parallel with |
|---|---|---|---|
| S1 | 1.5 | `js/game.js`, `js/data.js` | nothing (owns game.js) |
| S2 | 1.0 | `js/hooks.js` | S1, S3, S4, S5 |
| S3 | 2.5 | `js/ui.js` | S1, S2, S4, S5 |
| S4 | 1.5 | `js/run.js`, `js/room.js` | S1, S2, S3, S5 |
| S5 | 1.5 | `js/meta.js`, `js/feats.js` | S1, S2, S3, S4 |

S1 deletes `DATA.PASSIVE_SLOTS`, `DATA.WEAPON_MAX` and the patch ranks, and turns
the passives object into an unbounded id list plus a keystone slot. S2 adds the
three hook primitives (a counter, a per-frame tick, a timed stack) taking the bus
from 9 to 12 events. S3 teaches the card renderer the new kinds, makes the chest a
choice of two, adds the keystone trade prompt, adds the family strip to the top
band, and stops the shop going SOLD OUT. S4 widens `makeOffer` to families, makes
the room honour the family on clear, and spawns the reward object when the last
wave releases. S5 turns the board into a pool board, deletes Head Start, adds the
Tally Post ladder, and ships the save-break migration with the full badge refund.

### Wave 3: the content. 6.0 days.

| Unit | Days | Files | What |
|---|---|---|---|
| C1 | 4.0 | `js/items.js` (new) | 96 ledger items and 8 keystones, pure data, authored in batches of twenty so every batch is committable. No names, no descriptions. |
| C2 | 2.0 | `js/data.js` | 48 fork clauses, three 19-stat scout rows with real negatives and offer biases, the new curve. |

### Wave 4: verification. 2.0 days.

| Unit | Days | Files | What |
|---|---|---|---|
| V1 | 2.0 | bot harness only | Fifteen runs against the five baselines. The director scaling term lives here and is the line item most likely to grow. |

### Totals

| Wave | Days |
|---|---|
| 0 engine floor | 6.0 |
| 1 art floor | 5.5 |
| 2 structure | 8.0 |
| 3 content | 6.0 |
| 4 verification | 2.0 |
| **Architecture total** | **27.5** |
| 3 new weapons plus 3 new skills, optional | 6.0 |
| **With the full roster** | **33.5** |

**Where the extra 12 days over the committed 15.5 went**, because that comparison
will be made. About 7 days are work every architecture owes and the committed plan
omits: the card composer (3.5), the visual channel and silent-trait work (2), item
serialisation and the removal path (0.5), and the director term (1). About 5 days
are genuinely this architecture: the scope split (1.5), one extra authoring day
for 96 items over 72, half a UI day for the family strip and the locked
prerequisite card, the door families (1.5), and the board migration over a board
rework (0.5).

### The targets

| Metric | Measured today | Target |
|---|---|---|
| Time to last genuinely new item | median 4.70 min | no such moment exists |
| Time to hard saturation | median 12.59 min | never |
| Share of run on filler cards | avg 16.8%, up to 36.5% | 0% |
| Share of pick events that are not a decision | 47% | under 10% |
| Ranks per run | ~19.3 | ~30, split 10 / 9 / 11 |

---

## 9. What we are not doing

Everything the panel killed, so nobody re-proposes it.

**Collapsing to one manually aimed weapon.** The losing ACCUMULATION proposal
capped the primary at one and named the four-weapons-on-one-press model as its
own justification. That layered volley is the moment to moment and the thing 2.0
does that nothing else does. Four stays.

**Uncapped auto-firing weapons.** The same proposal made the four auto weapons
plus four more into uncapped ledger items. None of those is a projectile, so none
carries the descriptor and none is bounded by the render channels. Eight
concurrent independent emitter systems on a 250-world-unit phone viewport is the
soup that architecture claimed to prevent. Auto weapons are weapons and they
occupy weapon slots.

**Deleting the XP economy.** The losing ROOM DELIVERED proposal removed levels
entirely. Its central observation is correct and we took it (cards already land
at room boundaries), but the XP bar is the only thing that pays continuously
INSIDE a room, and rooms run two to four waves under a 90-second ceiling. It also
strands survival mode, which is on the board and which has no doors.

**Gating families behind the board.** Same proposal. Its family cap does not
close on a fresh save: four unlocked families at four payouts each is sixteen
against twenty-one family-tagged picks needed, so five doors on a new player's
first night have no legal family. All six families ship unlocked and the
fresh-save invariant in rule 2 is checked as a gate.

**Replacing the additive projectile renderer.** The six-channel ceiling is taken
as a bound on the resolver; the finished renderer stays. The growth it was meant
to fix does not happen, because the descriptor saturates.

**A sash or item strip along the bottom of the screen.** The bottom is the
control surface on a phone and there is no spare width there.

**Rarity tiers.** Dropped, not deferred. Nothing to make stronger with 96
single-acquisition items.

**Evolutions.** Still deferred, for the reason the committed plan gives: an
evolution adds zero picks and is a scheduling mechanic. The keystone does the
identity job and does it at a moment the player chose.

**A curse or risk stat.** Still deferred. The Tally Post blazes already attach
that lever to our own fiction and a second dial would be two systems doing one
job.

**A currency-and-shop economy as the answer.** Brotato's model needs a wave
boundary, a price curve and burst-then-calm pacing. We take its free lock and
nothing else.

**More than 96 items on day one.** The marginal unit is one item at 12 to 40
minutes, so the catalogue grows for a day per twenty items forever. Brotato
reached 241 with a team over years (sourced, its wiki Items page: 208 vanilla
plus 33 DLC). Copy the composition method, never the catalogue size.

**Player-controlled trait ordering.** `SHOT_ORDER` (`js/traits.js:398-411`) stays
a fixed designer-authored pipeline sorted once at compile time. That fixed order
is exactly what lets an unanticipated combination behave sensibly with no
authoring, and it is why 96 items cost zero engine days. The permanent price is
that we never get Noita's or Balatro's discovery economy off arrangements the
developer did not author. Our ceiling is the size of the authored vocabulary and
content cadence should be planned knowing that.

**Hand-painting item icons.** About 8 developer days for 96 and 20 for 300, and
it scales linearly with the catalogue forever.

**Naming anything.** Still. No item names, no descriptions, no flavour text until
the tone doctrine lands.

**A build-variety metric.** Still a real gap. The research library has none and
inventing one is its own project.

### Two things to protect that a refactor would silently delete

**The cooldown reset.** When the fire button is not held, `w.t = 0`
(`js/game.js:828`), so the first shot after any release is instant and tapping is
never punished. It is one line inside a branch whose obvious purpose looks like
just skipping a shot, and no automated gate would catch its loss.

**The `queryEnemies` scratch buffer trap.** `queryEnemies` returns a shared
buffer that `updateShots` is iterating at the exact moment a trait's on-hit hook
runs, which is why every search in `traits.js` is a linear scan
(`js/traits.js:21-26`). This belongs in every brief that touches damage, not just
in one file's header comment.

---

## 10. Open questions for Teddy

**1. The card icon composer is the one unproven piece in the whole plan. Do we
budget 3.5 days for it and build it before the catalogue?**
Recommend yes. It pays for itself around item 30 and it is the difference between
a catalogue that can grow forever at one authoring day per twenty items and one
that cannot grow at all. The fallback is already specified (frame plus family
colour plus one glyph, 1.5 days) so the downside is bounded.
Alternative: skip composition and hand-paint 96 icons at roughly 8 days, which
also means every future item costs an icon forever.

**2. Are the three new weapons and three new skills in or out of 3.0, at 6 days
on top of 27.5?**
Recommend in, and specifically the weapons. Twelve weapons over four slots is
495 possible sets against 126 for nine, and the weapon set plus the fork ends is
where this architecture's run-to-run divergence actually lives. The skills are
the softer half of that six and could slip.
Alternative: ship nine weapons and add three post-launch, accepting thinner
divergence in the first months.

**3. Do we break the camp save once, with a full badge refund and one migration
screen?**
Recommend yes. It is half a day. Deleting Head Start and repointing the board
invalidates every existing transfer code anyway, 2.0 is unlisted, and the
installed base is you plus one or two playtesters. Three design documents have now
been shaped around an append-only constraint that costs more to honour than to
pay off.
Alternative: keep the board ranks in place as dead entries and design around
them, which leaves Head Start's novelty burn in the game or requires a quieter
half-fix.

**4. Ship 96 ledger items, or 144?**
Recommend 96. Reviewers count items and 96 is the smallest catalogue we will be
compared against, but 144 is only two more authoring days and does not fix the
real number: a player sees most of either in one night. The compensation is that
our items visibly combine and the catalogue grows at one day per twenty forever,
which is the right shape for a paid release with content passes.
Alternative: 144 up front for a bigger store-page number, at two extra days and a
higher risk that the last fifty are filler nobody remembers.

**5. Uncapped weapon levels, or a hard cap at level 8?**
Recommend uncapped, with the rule that a generated level may raise magnitude and
may never add a projectile, plus a director scaling term keyed to build depth.
Uncapped is what stops a full weapon slot from ever being a finished slot, which
is half the reason the current game closes at minute five.
Alternative: cap at 8, which removes the need for the director term and the
projectile-count risk entirely, at the cost of reintroducing a closing channel
late in a night.
