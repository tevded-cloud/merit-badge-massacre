# The 3.0 build economy

This document is the design for how a night's build is assembled in 3.0: what a
scout is made of, what items are allowed to change, how many items there are,
and why the pool never dies. It is meant to be implementable from this file
alone.

**Nothing in here is named.** There are no item names and no flavour text in this
document, on purpose. The game is being repositioned to an eerie, adult tone and
that doctrine is not settled. Item names and descriptions are story-carrying
content: writing them now means rewriting them later. Every item below is
described by what it does, and the naming pass happens after the tone doctrine
lands. Nobody should fill these in early.

Two evidence rules apply throughout. Facts about our game are measured by reading
or running our code, and cited by file and line. Facts about other games are
labelled as such, and are sourced to the research library at
`D:\Programs\GameTev\research\` or to a named wiki page.

---

## 1. The diagnosis

A build can absorb 32 upgrades in a whole night, and a night delivers about 36
picks, so the pool is arithmetically guaranteed to run out before the run does.
Fifteen bot runs measured the last genuinely new item at a median of 4.7 minutes
and the pool going completely dead at a median of 12.6 minutes, always in act 3,
after which every card for the rest of the night is one of the same three supply
cards (`js/game.js:216-224`, `js/data.js:262-266`). The cause is not one thing:
it is roughly half the pool structure, a third the stat block, and the rest the
curve. The pool structure is the biggest share because four gear slots and four
patch slots close permanently once filled and can never be traded through
(`js/game.js:200`, `js/game.js:210`), so the run stops offering new things long
before it stops offering cards. The stat block is the next share because the
eight numbers a patch can move (`js/game.js:155-166`) are so few that the picks
which remain all read as the same pick, which is why the run feels finished at
minute seven even though the mechanical ceiling is not reached until minute
twelve. The curve is the smallest share and is only at fault in one specific way:
badge income roughly triples across the three acts, from 100.7 per minute in act
1 to 319.9 in act 3, while build capacity stays a fixed constant, so income
outruns the pool by design.

---

## 2. The stat block

This is the foundation and the thing we most lack. Today there is barely a player
stat block at all: `recalc()` at `js/game.js:155-166` is a hardcoded function
with exactly eight named outputs, each fed by exactly one patch, each consumed at
exactly one site elsewhere in the file. Weapons carry 21 tuning fields
(`js/data.js:39-138`) and only two of them, damage and cooldown, have any
cross-weapon hook (`js/game.js:341` and `js/game.js:830`). The other 19 are read
only inside that one weapon's own case in the `fireWeapon` switch
(`js/game.js:840-944`) and are invisible to every item in the game.

For scale, from the reference games: The Binding of Isaac tracks seven player
stats and carries roughly seven hundred items on them (sourced, wiki Attributes
page). Vampire Survivors names about fifteen (sourced, wiki Passive Items page).
Brotato names seventeen (sourced, wiki Stats page). Enter the Gungeon names about
nineteen (sourced, wiki Stats page). Megabonk names about twenty-one (community
wiki, single source, treat as approximate). So the count is not the lesson. The
lesson is what *kind* of stats they are: in Gungeon most of the block is what
your bullets *do* (piercing, bouncing, bullet scale, projectile speed,
knockback), and because those live on the player they rewrite every gun at once.
That is exactly the shape we are missing, and the fields we are missing are
already authored per weapon in our own data.

### The proposed block: 18 stats

Notation: **base** is the value with no items and no Badge Board ranks. **A** is
additive (contributions sum, then apply once). **M** is multiplicative
(contributions multiply). The math order is fixed for every stat, following the
research library's grammar (`asset-forge/run-upgrade-and-relic-effect-grammar`
section 3.5): `final = (base + FLAT) * (1 + PCT) * MULT`, then clamp to bounds.
Every stat has a bound. That is mandatory, not optional: a stat with no cap rule
produces a degenerate build the moment the item list gets large.

#### Offence

| # | Stat | Base | Bounds | Kind | Exists today as | Why it exists |
|---|------|------|--------|------|-----------------|---------------|
| 1 | Damage | 1.00 (+0.10 Max) | 0.50 to 6.00 | M | `dmgMul`, `js/game.js:158` | The universal scalar. Every build wants some; no build is built on it alone. |
| 2 | Attack Speed | 1.00 | 1.00 to 3.00 | M | `cdMul` inverted, `js/game.js:160` | The fire-rate build. Small hits, constantly, so that on-hit effects fire constantly. |
| 3 | Area | 1.00 | 0.60 to 4.00 | M | nothing (see note below) | The crowd build. Turns a room-clearing horde into the thing that feeds you. Reads instantly, which both VS and Brotato rely on. |
| 4 | Extra Shots | 0 | 0 to +6 | A (integer) | nothing | More of whatever you already fire. The single most legible upgrade in the genre and we cannot currently express it. |
| 5 | Reach | 1.00 | 0.70 to 2.50 | M | nothing | The standoff build: hit them before they arrive. Currently impossible to want. |
| 6 | Pierce | 0 | 0 to 8 | A (integer) | one weapon's private field, `js/data.js:43` | The line-them-up build. Already exists as a shot trait in the substrate; this promotes it to a player stat. |
| 7 | Crit Chance | 0.00 (Max 0.03, Junie 0.08) | 0.00 to 1.00 | A (points) | `critCh`, `js/game.js:164` | The spike build. Caps out on its own, which is why it needs stat 8. |
| 8 | Crit Damage | 2.00x | 1.50 to 6.00 | M | hardcoded `dmg *= 2` at `js/game.js:342` | The second axis of the crit build. Without it, crit chance is dead the moment it approaches 100 percent, which is the exact dead-pick failure Isaac accepts and we cannot afford. |
| 9 | Effect Duration | 1.00 | 0.50 to 3.00 | M | nothing | The attrition build: burns, slows, puddles, stuns. Feeds every status the substrate already has. |
| 10 | Force | 1.00 | 0.00 to 3.00 | M | nothing | Crowd control without damage. Note the lower bound is genuinely zero: a build that wants bodies to *stay* in the burning puddle wants no knockback at all, and that is a real and interesting item. |

#### Defence and movement

| # | Stat | Base | Bounds | Kind | Exists today as | Why it exists |
|---|------|------|--------|------|-----------------|---------------|
| 11 | Max Health | 100 Max, 85 Junie, 140 Gus | 40 to 600 | A then M | `p.maxhp`, `js/game.js:36`, not in `recalc()` | The obvious defensive floor. It belongs in the block; today it is set at construction and edited in five scattered places. |
| 12 | Armour | 0 (Gus 2) | 0 to 0.75 as a fraction | A then diminishing | `armor`, flat subtraction at `js/game.js:472` | Survivability that scales. **Recommended change: percentage with diminishing returns, not flat subtraction.** Flat armour is why late armour picks are dead: once a hit exceeds your armour by a lot it does nothing, and `taken = max(1, round(dmg - armor))` guarantees that. |
| 13 | Regeneration | 0.0 HP/s | 0.0 to 12.0 | A | `regen`, `js/game.js:165` | The sustain build. Fine as it is. |
| 14 | Move Speed | 150 Max, 168 Junie, 132 Gus | 90 to 340 | M | `speed`, `js/game.js:159` | Kiting, which in a horde game is a whole style of play. |
| 15 | Dodge Recharge | 1.00 | 1.00 to 2.50 | M | nothing at all | The dash build. The substrate has seven dash traits sitting unused and no stat feeds the dodge, which is currently a fixed per-scout table (`js/data.js:435-442`) that no patch or Badge Board rank can touch. |

#### Economy and texture

| # | Stat | Base | Bounds | Kind | Exists today as | Why it exists |
|---|------|------|--------|------|-----------------|---------------|
| 16 | Pickup Radius | 65 (Gus 81) | 65 to 420 | M | `magnetR`, `js/game.js:162` | Quality of life. Honestly the weakest stat in the block: it should never be a card on its own, only a rider on a card that does something else. |
| 17 | Badge XP | 1.00 | 1.00 to 2.20 | M | `xpMul`, `js/game.js:163` | The greed build. Section 6 shows that under the proposed curve this stat alone swings a run between 27 and 36 ranks, which makes it genuinely interesting rather than a percentage nobody feels. |
| 18 | Luck | 0 | 0 to 20 | A (points) | nothing | Biases what appears in the offer, and biases rarity. Cheap to add: `levelPool` (`js/game.js:193-235`) uses fixed weights of 10, 6, 8 and 5 with nothing player-facing feeding them, so luck is confined to one function. This is what makes "find rarer things" possible for the first time. |

### Which already exist, and under what name

Eight are already in `recalc()` (`js/game.js:155-166`): Damage, Attack Speed
(as `cdMul`), Crit Chance, Armour, Regeneration, Move Speed, Pickup Radius, Badge
XP. One more exists but is not in the block: Max Health, which is set at
construction from `c.hp` plus the Hearty rank (`js/game.js:36`) and then mutated
in five separate places (`js/game.js:473`, `744`, `490`, and two of the three
supply cards at `js/game.js:266-268`). Crit Damage exists as the literal `2` in
`dmg *= 2` at `js/game.js:342`. Six of the remaining stats (Area, Extra Shots,
Reach, Pierce, Effect Duration, Force) are not new inventions: every one of them
is already authored, per weapon, in `DATA.weapons` (`js/data.js:39-138`). We
already write the numbers. We have simply never given the player a handle on
them. Only Dodge Recharge and Luck are genuinely new concepts.

### Duplicates and collisions to fix while doing this

The stat catalog found stat modification happening in several places under
colliding names. All five of these are real and all five must be resolved in the
same unit that builds the block, because a large item list makes each one
ambiguous.

1. **`cdMul` means two unrelated things under the identical name.** There is a
   per-weapon-level tuning key `cdMul` inside `DATA.weapons[*].levels[*]`
   (`js/data.js:48`, `69`, `81`, `92`, `135`) which `computeWeaponStats` folds
   into `st.cdFactor` (`js/game.js:175`), and there is the global
   `this.cdMul` (`js/game.js:160`). They are combined correctly at
   `js/game.js:830` only because the code renames one internally. **Fix:** the
   global becomes Attack Speed and is inverted so bigger is better; the
   per-weapon key is renamed to `cdScale`.

2. **"Cooldowns" is a name that lies.** The Scoutmaster Whistle patch reads "9%
   faster cooldowns" (`js/data.js:145`), but `this.cdMul` only ever multiplies
   weapon fire-rate timers (`js/game.js:830`). It has no effect on dodge
   recharge, which comes from the fixed per-scout `dodge.cd`
   (`js/data.js:435-442`) with no `cdMul` term anywhere in `js/dodge.js`. A
   player reading that line would reasonably expect their dodge to come back
   faster. **Fix:** Attack Speed is weapons only and says so; Dodge Recharge
   (stat 15) is the separate stat that does the other thing.

3. **"speed" names three disconnected systems.** Player movement
   (`js/game.js:159`), each scout's dodge-roll speed (`js/data.js:436-442`), and
   each weapon's projectile speed (`js/data.js:43`, `87`). **Fix:** only the
   first is a stat, and it is called Move Speed. Dodge-roll speed stays a
   per-scout constant. Projectile speed is deliberately not a stat (see section
   9).

4. **"radius" is reused across five unrelated per-weapon fields** (knives orbit
   `js/game.js:800`, bug spray cloud `js/game.js:816`, canteen splash
   `js/game.js:935`, firecracker blast `js/game.js:905`, bugle blast
   `js/game.js:940`) and also describes the concept behind pickup radius. **Fix:**
   Area covers the weapon fields; Pickup Radius keeps its own name and the word
   "area" never appears in its description.

5. **There is already a hidden, undocumented area stat and nobody knows.**
   `attackScale()` at `js/game.js:836-838` returns
   `clamp(0.9 + (dmgMul - 1) * 0.65 + (lvl - 1) * 0.09, 0.9, 2.3)` and that
   value is multiplied into projectile radii and blast radii throughout
   `fireWeapon`. So damage silently already grows your area, up to 2.3x. **Fix:**
   this is folded into the Area stat as a contribution and removed as a hidden
   term, otherwise Area double-counts against Damage.

One more duplication worth naming, though it is a Badge Board question rather
than a stat block question: five of the eight board ranks are paired one-to-one
with a patch feeding the identical field (`js/meta.js:6-15` against
`js/data.js:141-148`). Sharpened Sticks and Trail Mix both feed Damage, Trail
Legs and Hiking Boots both feed Move Speed, Camp Grit and Cast Iron Skillet both
feed Armour, Packrat and Lodestone both feed Pickup Radius, Merit Scholar and
Field Guide both feed Badge XP. With eighteen stats there is plenty of room for
the board to stop duplicating the run. The rule going forward: **a Badge Board
rank may not feed a stat that a patch already feeds.**

---

## 3. The item lattice

### The number, and the arithmetic behind it

Start with the failure, stated as arithmetic. Today a run holds 4 of 9 weapons
and 4 of 8 patches (`js/data.js:8-10`). If two nights drew at random, the
expected number of shared patches between them is 4 x (4/8) = **2 of 4**, and the
expected number of shared weapons is 4 x (4/9) = **1.8 of 4**. Half your patches
and nearly half your gear are the same every single night. That is the "every run
is the same run" feeling written as a number, and no amount of tuning fixes it,
because it is division.

The proposed shape: **4 gear slots, 6 patch slots, 1 skill slot**, drawing from
**12 weapons, 72 patches, 6 skills**. Expected shared patches between two nights
becomes 6 x (6/72) = **0.5 of 6**. On average two nights share half a patch. That
ratio, twelve items in the pool per slot held, sits between Vampire Survivors
(roughly 4x, sourced from its 6+6 cap against its base item list) and The Binding
of Isaac (roughly 30x, sourced: roughly seven hundred collectibles against a run
that takes a couple of dozen). It is the smallest number that produces genuine
run-to-run variance, which matters because authoring bandwidth is the real
constraint.

Why not more? The research library is blunt about this being the trap. The
survivors-like report's own recommendation for a small roster is "fewer items,
tightly interlocking stats", and its through-line is that the genre "compresses
design cost into systemic combinatorics rather than into authored content
volume". Brotato reached 241 items with a team and years (sourced, its wiki Items
page). We are not authoring 241 items and should not try.

Why 72 is affordable: the substrate provides 12 shot traits
(`SHOT_ORDER`, `js/traits.js:398`) and 7 dash traits (`DASH_ORDER`,
`js/traits.js:599`), and `compile()` (`js/traits.js:611`) puts no cap on how many
an item may grant. That is 19 primitives, giving 19 single-trait concepts plus
171 legal pairs (66 shot pairs, 21 dash pairs, 84 shot-and-dash cross pairs),
roughly 190 distinct concepts before triples or hooks are counted. Against
eighteen stats and twelve hook events, 72 authored items is a small fraction of
what the vocabulary can already express.

### The 72 patches, by kind

| Kind | Count | What it is | Cost |
|------|-------|------------|------|
| Stat modifiers | 20 | One or two entries against the 18-stat block. The atom. | **Cheap.** Data only. |
| Behaviour grants | 24 | One or two of the 19 substrate traits, granted to every shot or every dash. | **Cheap.** Data only. |
| Conditional and triggered | 12 | Handlers on the hook bus: on kill, on hit, on taking damage, on room clear, on boss phase, and the three new primitives below. | **Cheap per item, behind one engine unit** (U6). |
| Drawbacks and trades | 8 | One stat up hard, one stat down hard, or a trait granted at the cost of a stat floored. | **Cheap.** Data only, once the stat block exists. |
| Transformative | 4 | A large trait bundle plus a stat swap that changes how the build plays rather than how big it is. | **Cheap**, subject to the rule below. |
| Rare authored payoffs | 4 | Prerequisite-gated. Only becomes legal once the run already carries specific traits or items. | **Cheap per item, behind one engine unit** (in U2). |
| **Total** | **72** | | **52 pure data, 20 data behind two engine units, 0 needing per-item engine work.** |

That last cell is the whole point of the substrate and it is the answer to "which
are cheap and which are expensive, because that is the schedule". **Zero of the
72 patches needs engine work of its own**, provided every item is authored from
the closed vocabulary: the 19 traits, the 18 stats, and the 12 hook events. This
is only true because of the following rule, which must be enforced:

> **The vocabulary rule.** An item composes what exists. An item that cannot be
> written from the 19 traits, the 18 stats and the 12 hook events is not
> authored. It becomes a change request against the vocabulary, and a new verb
> costs roughly half a day of engine work plus a render pass, because
> `buildVis()` (`js/traits.js`) derives every projectile's appearance from the
> trait set and a new verb with no visual descriptor draws as nothing.

This rule is what makes "transformative" items cheap. A transformative item is
allowed to be a huge bundle (every shot orbits and pierces and splits, and your
Reach is floored) because all of that is data. A transformative item is **not**
allowed to change which weapon fires or rewrite a weapon's base fire pattern,
because `fireWeapon` (`js/game.js:840-944`) is a switch with one hand-written
case per weapon and there is no shared abstraction to hang that off. If a build
needs a different fire pattern, that is a new weapon, not an item.

### What is genuinely expensive

Three things, and they are all outside the 72:

1. **A new weapon: roughly one day each.** `fireWeapon` needs a whole new case
   (`js/game.js:840-944`); knives and bug spray are handled separately again in
   `updateWeapons` (`js/game.js:795-823`). Budget 3 new weapons to reach 12.
2. **A new skill: roughly one day each.** Same shape; the two shipped skills are
   bespoke branches at `js/game.js:1381-1468`. Budget 3 new skills to reach 6.
3. **A new trait verb: roughly half a day each.** Only if the vocabulary rule
   forces one. Budget zero and expect two.

---

## 4. How saturation is prevented

The research offers four candidate answers. Here is the choice, and why the other
three are riders rather than the mechanism.

**The mechanism is the overflow track.** When the pool of new things is empty,
the level-up offers stat increments against the 18-stat block instead of the
three supply cards. This is guaranteed rather than hoped, because it is
arithmetic: with 18 stats and an increment step that shrinks but never reaches
zero, `levelPool` cannot return an empty pool, ever, at any point in any run. The
supply cards stop being a level-up outcome entirely and survive only as the chest
fallback (`js/game.js:275-280`).

This is Vampire Survivors' Limit Break (sourced, wiki Limit Break page: it offers
extra levels on maxed weapons across Might, Area, Speed, Duration, Amount,
Pierce, Crit Chance and Chance, with Area capped at 1000 percent, Amount at 20,
Pierce at 10). Read that stat list against section 2: it is nearly the same list
we are missing. Limit Break works because those stats already exist for the
engine to raise. Ours will work for the same reason and for no other reason,
which is why the stat block has to land first.

**Two deliberate departures from VS.** First, ours is on by default. In VS it is
a late unlock behind a relic, for players who have already broken the game. For
us the dead pool is not an endgame edge case, it is what happens to a first-time
player at a median of 12.6 minutes, so shipping the fix behind an unlock would
hide it from exactly the people who need it. Second, an overflow card should
prefer to grant a trait rather than a percentage where one is available, because
"your stones now punch through" reads better than "+8% pierce", and for an eerie
game that is not a small difference.

### The diminishing returns curve

Each stat tracks how many overflow ranks have already been spent on it. The nth
overflow rank in a stat grants:

```
step(n) = baseStep / (1 + n / 4)
```

So the 1st overflow rank gives the full step, the 5th gives half, the 13th gives
a quarter, the 29th gives an eighth. It never reaches zero, so there is always a
legal card, and it never runs away, so twenty overflow ranks in Damage is worth
about 6.3 base steps rather than 20. On top of that sits each stat's hard bound
from the section 2 table, which catches the stats that break the game outright if
they run (Attack Speed and Area especially).

### The anti-monotony rule

Of the three cards in an overflow offer, at most two may come from stats the
player has already overflowed into. There is always at least one fresh direction
on the screen. Without this rule the player's own diminishing returns push them
into a single stat and the back third becomes three cards that are all the same
card.

### What happens at minute 20

Concretely, with a strong build in act 3, roughly seven minutes past the point
where the old pool would have died. The player levels. Three cards appear. Two of
them are overflow increments in stats they have already invested in, and the step
size is visibly smaller than it was at minute 10, which is legible and correct:
the run is late and gains are getting harder. The third is an overflow increment
in a stat they have ignored all night, which is often the interesting one because
it is at full step size. Alongside that, two other channels are still alive: any
patch slot can still be traded through (below), so a new patch can still appear
and ask what it replaces, and the prerequisite-gated rare tail has by now become
legal because the build is deep enough to satisfy it. No card in that offer is a
supply card. No card is a duplicate. The player is still making a decision, and
the decision is smaller than the one at minute 5, which is exactly right.

### The two riders

**Replacement over exhaustion, for patches only.** Slot scarcity stays: 4 gear,
6 patches, 1 skill. But a full patch slot is a door you can trade through rather
than a door that closes. Taking a patch when all six slots are full asks which
one goes. This is Hades' model (sourced, fextralife Boons page: a new boon for a
filled slot replaces the old one) and it keeps the "new things" channel alive for
the whole night instead of closing it at a median of 4.7 minutes. It is
restricted to patches on purpose: gear is the player's muscle memory and swapping
a weapon mid-fight with manual aim is disorienting, so **gear replacement is
allowed only at a rest or shop room**, never mid-combat.

**A prerequisite tail, so the pool grows as the build grows.** Four rare items
that are only legal when the run already carries specific traits or items. This
is Isaac's transformations (sourced, wiki Transformations page: 16 sets, each
triggered by holding three items from a themed set, each granting a new identity
rather than a bigger number) and Hades' duo boons (sourced, fextralife: offered
only when you already hold a boon from each of two named gods). It is unusually
cheap for us because the run already keeps a compiled trait set, so the gate is a
lookup against `this.shotTraits` and `this.relics`, not a bespoke condition
system. It flips the pool from shrinking monotonically with every pick to having
a growing tail, and the tail is where late-run excitement lives.

### What was considered and rejected as the mechanism

- **A bigger pool.** Isaac's answer is roughly seven hundred items against a run
  that takes a couple of dozen, so a duplicate is structurally almost impossible.
  We cannot buy that, and the research library says so directly: depth is
  interactions per item, not item count.
- **Rarity tiers.** Kept as a magnitude rider, not the mechanism. A rarity tier
  is one multiplier over the numeric parameters the trait entries already carry
  (for example `{ t: 'chain', jumps: 2, range: 150, falloff: 0.6 }`, and every
  handler reads them through a `num(field, default)` accessor). The fold point is
  exactly one place: `rebuildTraits` (`js/game.js:170-200` on the branch) pushes
  authored trait objects into the run's set by reference, so it would push scaled
  copies instead. One loop, one clone, three strengths per item, zero new
  authoring. **Rarity changes magnitude only, never identity**, or authoring
  multiplies by the number of tiers for no design gain. This is worth doing but
  it is not the anti-saturation mechanism, because scaling a card the player has
  already seen does not make the pool non-empty.
- **Evolutions.** Deliberately not the anti-saturation mechanism, and this is the
  most commonly misread thing in the reference material. Sourced from the VS wiki
  Evolution page: the base weapon is removed and the evolved weapon added, so the
  slot stays occupied. **An evolution adds zero picks to the pool.** It is a
  scheduling mechanic: it places the biggest reward of the run at the exact
  minute the pool starts drying up. It is a good mechanic and it fits our clock
  almost eerily well (VS gates evolution chests at roughly the 10-minute mark of
  a 30-minute run; our act 2 to act 3 boundary is measured at 10.73 minutes and
  our hard saturation at a median of 12.59 minutes, always in act 3). But it is
  section 9 work, not section 4 work.

---

## 5. Weapons specifically

Nine weapons, four slots, five levels each, is 20 of the 32 absorbable picks:
62 percent of the entire build is gear, and a maxed weapon is the same weapon
with bigger numbers. The reference games mostly do not do that. Isaac's items
change what your tears *do*. Gungeon's passives rewrite every gun you own at
once. Hades' hammers offer a choice between two clauses that alter a core attack
(sourced, from the owner's own Hades ledger, section 9).

### What survives

**Four slots survives, and should not be argued with.** The research library is
firm that slot scarcity is the lever that makes a draft a real choice rather than
a decorative yes, and Vampire Survivors caps a build at 6 plus 6 regardless of
how large its pool grows. More importantly, four is right *for us specifically*:
we have manual aim and a dodge roll, so the player is already expressing skill
every second, and widening to six auto-firing weapons would flatten the thing
that makes us not a Vampire Survivors clone. VS can afford six because it removed
the fire button entirely, so slot count is its whole build surface.

**The five-level ladder does not survive.**

### What it changes to

`DATA.WEAPON_MAX` drops from 5 to 4, and **levels 3 and 4 become forks**. Levels
1 to 2 stay as they are, a plain numbers step, because a new weapon needs to be
legible before it gets interesting. Then:

- At **level 3**, the player chooses one of two authored clauses.
- At **level 4**, the player chooses one of two more clauses, which may be gated
  on the level 3 choice.

That gives four distinct end states per weapon instead of one. Nine weapons
become 36 distinct maxed weapons. A player who has taken the slingshot to the top
five times has seen four different slingshots, and can tell you which one they
are running.

**The clause rule, which is what makes this affordable:** a fork clause must be
expressible as a trait grant or a field delta on the weapon's existing stats.
Nothing else. Trait grants are free because `armShot` (`js/game.js`, branch)
already arms every projectile from a set, and field deltas already work through
`computeWeaponStats` (`js/game.js:168-180`). **A fork clause may not add a branch
to `fireWeapon`.** If a weapon needs a genuinely different fire pattern, it is a
new weapon, not a fork. With that rule, all 36 fork clauses are data and cost
zero engine days beyond the plumbing in U2.

Worked shape, functional, no names: the hand axe currently ends at "+30 damage,
heavy knockback" (`js/data.js:70`). Under forks its level 3 offers either (a) the
swing gains a rend status and the arc narrows, or (b) the swing gains an area
increase and a force increase and loses damage. Its level 4 then offers, within
branch (a), either the rend stacking harder or the swing gaining pierce; within
branch (b), either the swing gaining a barge-style stun or a second swing at
reduced damage. All four are trait grants and field deltas. None touches the
switch.

### Pick arithmetic

Gear drops from 4 x 5 = 20 picks to 4 x 4 = 16 picks. That is deliberate. Gear
stops being 62 percent of the build and becomes roughly a third of it, with
patches and the overflow track carrying the rest. The four picks lost are more
than recovered by the patch layer going from 4 slots at 3 ranks (12 picks, hard
capped) to 6 slots with replacement (unbounded).

### One thing the weapons should gain from the stat block

Once Area, Extra Shots, Reach, Pierce, Effect Duration and Force are player
stats, a single patch rewrites all four held weapons at once. That is the
Gungeon lesson stated exactly: the value of a stat item goes *up* as the weapon
collection grows, which is the inverse of a slot system. Four slots stop being a
ceiling the moment one pick changes all four.

---

## 6. The numbers

### What the curve does today, measured

`DATA.xpNext = l => floor(6 + l * 5.0 + l^1.8 * 2.0)` (`js/data.js:272`).
Cumulative cost to reach level 20 is 4523 XP.

Measured badge income from the fifteen bot runs: act 1 delivers 552 raw badges
over 5.48 minutes, act 2 delivers 1058 over 5.25 minutes, act 3 delivers 2207
over 6.90 minutes. Total 3817 raw. Credited XP is raw times `xpMul`, which climbs
across the run (`js/game.js:295`); modelling it as 1.08 in act 1, 1.22 in act 2
and 1.38 in act 3 gives 596, 1291 and 3046 credited, 4933 total.

Running the real formula against those three numbers reproduces the measured run
almost exactly, which is how we know the model is sound:

| | modelled | measured |
|---|---|---|
| ranks in act 1, end level | +8, level 9 | level 8.9 |
| ranks in act 2, end level | +6, level 15 | level 14.1 |
| ranks in act 3, end level | +6, level 21 | level ~20 |
| **total ranks per run** | **20** | ~19.3 |

So a run delivers about 20 level-up picks and about 17 chest grants, 37 pick
events, against a capacity of 32. And the shape is wrong in a second way that the
totals hide: **act 1 delivers more ranks than act 3 does.** Eight, then six, then
six, while income triples. The night decelerates as it escalates.

### The proposed curve

```
DATA.xpNext = l => Math.floor(10 + l * 5.0 + Math.pow(l, 1.55) * 0.9);
```

Per-level cost: 15, 22, 29, 37, 45, 54, 63, 72, 82, 91, 102, 112, 122, 133, 144,
156, 167, 179, 191, 203, 215, 228, 241, 254, 267, 280, 293, 307, 321, 335.

Against the same measured income:

| | ranks | end level |
|---|---|---|
| act 1 | +10 | 11 |
| act 2 | +9 | 20 |
| act 3 | +11 | 31 |
| **total** | **30** | |

Thirty ranks, ten per act, gently rising rather than falling. The first rank
costs 15 instead of 13, so the very start is marginally slower, which is correct:
a scout with one weapon should have a beat to feel it before the cards start.

### Sensitivity, which is the Badge XP stat earning its place

Same curve, same income, varying only how hard the player invests in Badge XP:

| Badge XP investment | ranks per act | total ranks |
|---|---|---|
| none (1.00x) | 9, 8, 10 | 27 |
| typical (1.25x) | 10, 9, 11 | 30 |
| stacked hard (1.80x, the cap) | 13, 10, 13 | 36 |

A 33 percent swing in total picks from one stat, bounded by that stat's cap.
That is what makes a greed build real, and it is why stat 17 exists.

### Total picks per run, and where they land

30 level-up picks plus about 17 chest picks equals roughly **47 pick events per
run**, up from a measured 37. Against capacity:

- Gear: 16 picks (4 slots x 4 levels, forks included).
- Patches: 6 slots, single acquisition, so 6 picks before replacement starts and
  unbounded after.
- Skill: 1 pick. Note this is a change: the active skill is currently granted
  automatically at run start (`grantSkill`, `js/game.js:1333`, called at
  construction, `js/game.js:77`) and never appears in the pool at all, so it is
  worth zero picks today. Making it a pick is worth one pick and, more
  importantly, a slot is a card that can never be a duplicate.
- Overflow: unbounded.

So roughly 23 to 29 of the 47 are content picks and the remaining 18 to 24 are
overflow, replacement and the rare tail. **Overflow carries about 40 percent of a
run's picks**, which is why it cannot be a filler card and must be a real
increment on a real stat.

### Patches lose their ranks

Today every patch has `max: 3` (`js/data.js:141-148`). Under this design patches
are single-acquisition: you either have it or you do not. With 72 items, ranks
are a duplicate machine, and rarity (section 4) already covers "the same item,
stronger". This is also what makes replacement clean: trading a ranked item away
is a confusing loss, trading a single item away is a clear decision.

### The three delivery channels, and the one that is currently broken

There are three ways a pick reaches the player, and **all three drain the same
pool**, which is why saturation is total when it arrives:

1. Level-up, three cards, a real choice (`js/game.js:193-235` via `js/ui.js`).
2. Chests from loot rooms and elite kills, which call `grantChest`
   (`js/game.js:274-288`), which calls `levelPool(1)` and **auto-applies it with
   no player choice**. Measured: 256 of 546 pick events across fifteen runs, 47
   percent. Nearly half of all build progress in a night is not a decision.
3. The in-run shop, `RUNSHOP` (`js/ui.js:358-362`), which sells "one badge,
   chosen for you" and "one weapon, chosen for you" out of `patchPool` and
   `gearPool` (`js/ui.js:364-386`) and shows **SOLD OUT** once the pool is dry
   (`runshopAvailable`, `js/ui.js:401-405`). This is a shop room that a saturated
   run walks into and finds empty.

Fix all three the same way: **chests become a choice of two** (the research
library validates pick-one-of-N only for N in 2, 3 and 4, and explicitly does not
validate beyond 4), and both chests and the shop draw from the full pool
including the overflow track, so neither can ever be empty. Chests are also the
right channel for the prerequisite-gated rare tail, which is what VS does with
evolutions on purpose.

---

## 7. What this means for the scouts

Today the three scouts differ by seven numbers, a starting weapon and a dodge
table (`js/data.js:12-36` and `js/data.js:435-442`). Max has +10 percent damage
and +3 percent crit. Junie has +12 percent move speed, +8 percent crit and 15
less health. Gus has +40 health, +2 armour and +25 percent pickup radius. Their
dodges differ meaningfully (Junie gets two charges and trails fire, Gus gets a
longer roll with a barge) but nothing in the build can touch a dodge, so that
difference never grows over a night.

With an eighteen-stat block, a scout becomes four things instead of one:

1. **A full base row across all 18 stats**, including deliberate negatives. Today
   no scout is *bad* at anything except health; every difference is a bonus.
   A scout who is genuinely bad at something is a scout whose build has a problem
   to solve, which is what makes them play differently.
2. **A signature**, which is one trait every one of their shots or dashes always
   carries, from the existing 19. Junie already has one in all but name (her
   dodge trails burn, `js/data.js:439`); Gus already has one (his dodge barges,
   `js/data.js:442`).
3. **An offer bias**, which is a weighting applied inside the pool builder so
   that items in a family appear more often for that scout. This is Luck (stat
   18) pointed at a family instead of at rarity, and it costs nothing extra
   because the weighting machinery has to exist for Luck anyway.
4. **A starting weapon**, as now.

Sketched against the existing three, functionally:

- **Max.** The readable one. Baseline everywhere, slightly above on Damage and
  Crit Chance, no negative. Signature: one point of base Pierce, so his stones
  behave slightly differently from anyone else's from the first second. Offer
  bias: none, deliberately. He is the scout you learn the game on and the control
  against which the others read as strange.
- **Junie.** High Move Speed, high Crit Chance, high Effect Duration, high Dodge
  Recharge. Low Max Health, low Armour, low Reach. Signature: her dash already
  trails fire. Offer bias toward burn, dash and crit families. She is the scout
  who has to be inside the horde and cannot afford to be hit, which is a
  genuinely different game from Max's.
- **Gus.** High Max Health, high Armour, high Force, high Area. Low Move Speed,
  low Attack Speed, low Dodge Recharge. Signature: his dash already barges.
  Offer bias toward area, force and sustain families. He stands still and the
  room comes apart around him.

**This is the biggest content lever in the game, and it is the reason the stat
block is worth three engineer-days.** Today a fourth scout costs a portrait, a
voice set, a dodge table, a starting weapon and an argument about what makes them
different, because there are only eight numbers to make them different with and
five of them are already claimed. After the stat block, a scout is a row of 18
numbers, one trait id and one offer-bias table: content, not engineering. Given
that there are already pending plans for scout identity, an alternate starting
weapon system and unlockable scouts, this section is what unblocks all three.

---

## 8. Implementation units

**A note on the file-disjointness constraint.** The brief asks that no two units
share a file. That is achievable for everything after the first two units and is
not achievable for those two, because the stat block and every one of its
consumption sites live in `js/game.js`, and the substrate merge necessarily
touches every file it changed on the branch. So the honest structure is: two
sequential units up front that own `js/game.js` one at a time and are never
dispatched in parallel with anything, and then a wave of six units that are
strictly file-disjoint from each other and can all run at once. That is stated
plainly rather than faked by splitting `game.js` into files that would only make
the code worse.

Measured merge sizes for U1, taken this session by diffing the two working trees
with line endings normalised (the branch worktree is CRLF, main is LF, which
otherwise inflates every file to "fully changed"):

| file | main lines | branch lines | changed lines |
|---|---|---|---|
| `js/traits.js` | does not exist | 754 | new file |
| `js/hooks.js` | does not exist | 114 | new file |
| `js/game.js` | 1751 | 1779 | 354 |
| `js/dodge.js` | 161 | 249 | 184 |
| `js/data.js` | 493 | 602 | 123 |
| `js/render.js` | 1805 | 1916 | 111 |
| `js/director.js` | 2190 | 2217 | 29 |

And the finding that makes the merge smaller than it looks: `js/run.js`,
`js/ui.js` and `js/meta.js` have diverged enormously since the branch was cut
(436, 342 and 610 changed lines respectively, main having grown the mid-run save,
the seeded plan system and the camp work), but **grepping the branch copies of
all three for `Traits.`, `Hooks.`, `relic`, `shotTraits` and `dashTraits` returns
zero hits in each**. The substrate does not touch those three files at all. They
are taken from main wholesale and are not part of the merge.

---

### U1. Merge the trait substrate onto main

**Files:** `js/traits.js` (new), `js/hooks.js` (new), `js/game.js`, `js/dodge.js`,
`js/data.js`, `js/render.js`, `js/director.js`.

**Cost: one engineer-day, and it is mostly reading.** This is a hand merge, not a
rebase. Two known collisions in `js/data.js` where main independently rewrote two
descriptions the branch also carries, and one structural item in `js/game.js`:
main grew a roughly 150-line mid-run save block (`snapshot` and `restore`, in its
own block at the tail of the file) after the branch was cut, so a blind patch
apply will fail on shifted line numbers even though the content does not
actually collide. Re-apply by hand.

**The game runs identically after this unit.** The substrate is inert when
nothing grants a trait: the default set is one frozen shared empty array
(`js/traits.js:36`) and the whole test is `s.traits.length === 0`, so an unused
substrate costs one property read per shot. It was parity tested on the branch.
Nothing player-facing changes. This unit ships dark.

**One thing to fix while in there, before the catalogue grows:** `compile()`
(`js/traits.js:611`) does not deduplicate by trait id, and stacking behaviour
differs per trait with no stated policy. Pierce, bounce and ricochet accumulate
cleanly. Giant multiplies and composes. Freeze and rend take the max. But two
grants of orbit both write the same fields and the second silently does nothing,
two grants of homing both null the same lock, and two grants of split each call
`burst()` and produce two batches of children per hit. With 72 items in
circulation, two items granting the same trait becomes likely rather than
theoretical. Write the policy down per trait and make the code match it.

---

### U2. The stat block, the offer pipeline, and the fork plumbing

**Files:** `js/stats.js` (new), `js/pool.js` (new), `js/game.js`.

**Cost: three engineer-days. This is the largest engine unit in the plan and
there is no way to make any of it data.** It is also the unit everything else
waits on.

`js/stats.js` holds the 18 field definitions from section 2, the bounds table,
the diminishing-returns function from section 4, and one accessor. `js/pool.js`
holds the offer builder: the replacement flow, the overflow track, the
anti-monotony rule, the Luck weighting, the prerequisite check for the rare tail,
and the fork choice.

`js/game.js` gets: `recalc()` replaced by a call into `js/stats.js`;
`levelPool()` (currently `js/game.js:193-235`) replaced by a call into
`js/pool.js`; and the new read sites. **The read sites are the measured cost.**
Counted this session inside the `fireWeapon` switch and `updateWeapons`:
`st.count` at lines 797, 848, 863, 891, 912, 913 and 925; `st.radius` at 800,
816, 905, 935 and 940; `st.range` at 869, 877, 895, 917 and 927; `st.arc` at 878
and 882; `st.knock` at 883 and 940; `st.pierce` at 855; `st.dur` at 935;
`st.burnDur` at 870. That is **23 edit sites across the switch** for six of the
new stats. Three more are one-liners: Crit Damage replaces the literal `2` at
`js/game.js:342`, Armour changes shape at `js/game.js:472`, and Dodge Recharge
folds into the dodge cooldown read in `js/dodge.js:59` (which is the one file
outside this unit's set that U2 needs to touch, so it is listed here and no other
unit may take it).

Also in this unit: fold `attackScale()` (`js/game.js:836-838`) into Area so the
hidden multiplier stops double-counting, and rename the per-weapon-level `cdMul`
key so it stops colliding with the global.

**The game runs after this unit** with the existing 9 weapons and 8 patches, now
reading through the new block. This unit does not add a single item. It is
verifiable on its own: the bot harness should reproduce the measured run
unchanged apart from the intended armour and crit changes.

---

### Wave 3. Six units, strictly file-disjoint, all runnable in parallel.

#### U3. The item catalogue

**Files:** `js/items.js` (new).

**Cost: three days of authoring, zero engine days.** The 72 patches from section
3, as data: stat entries against `js/stats.js`, trait entries against the 19
primitives, hook entries against the 12 events. Effects only. **No names, no
descriptions.** Every entry carries a placeholder id and a functional summary
line; the naming and voice pass happens after the tone doctrine lands.

#### U4. Weapon forks, scout rows, and the curve

**Files:** `js/data.js`.

**Cost: two days.** The 36 fork clauses from section 5 (trait grants and field
deltas only, no `fireWeapon` branches, per the clause rule). The three full
18-stat scout rows with their negatives, signatures and offer biases from section
7. `DATA.WEAPON_MAX` from 5 to 4, `DATA.PASSIVE_SLOTS` from 4 to 6. The new
`DATA.xpNext` from section 6. Patch `max: 3` removed.

#### U5. The draft, the chest and the replacement screen

**Files:** `js/ui.js`.

**Cost: two days.** The card renderer learns the new kinds (stat increment, trait
grant, fork choice, replacement). The chest becomes a choice of two rather than a
silent grant. The replacement prompt: "this slot is full, which goes". The in-run
shop stops going SOLD OUT because it now draws the full pool.

Note the tone constraint that already exists on the board: build arithmetic is
meant to stop showing. A stat increment card should say what it does, not what
the number is.

#### U6. Three hook primitives

**Files:** `js/hooks.js`.

**Cost: one day.** The bus covers "on X do Y" well but has no primitive for any
condition needing state across events, so today every such item reinvents its own
bookkeeping on the Game object by hand. Three additions unlock the 12 conditional
items in U3:

1. A **counter** primitive, so "every third kill" is data rather than a private
   field per item.
2. A **per-frame tick event**, because the nine existing events all fire at named
   moments and there is nothing for "while below 30 percent health" or "while
   standing still" to hook.
3. A **timed stack** primitive, for buffs that build and decay.

That takes the bus from 9 events to 12. Everything already registered keeps
working; these are additions.

#### U7. Badge Board de-duplication, Luck, and slot unlocks

**Files:** `js/meta.js`, `js/feats.js`.

**Cost: one day.** Enforce the rule from section 2 that a board rank may not feed
a stat a patch already feeds, which currently breaks five of eight ranks. Point
the freed ranks at Luck, Dodge Recharge and Crit Damage instead. Add slot unlocks
as merit badge rewards: `feats.js` already carries a reward kind and id per badge
(`js/feats.js:249`), and the slot constants are read at nine sites and written
nowhere, so making them derive from meta state is contained. A sixth patch slot
earned at camp is worth more to a returning player than any three new items,
because it raises the ceiling rather than refilling under it.

#### U8. Chests and the shop become decisions

**Files:** `js/room.js`.

**Cost: half a day.** The room side of U5: chests offer rather than grant, and
the prerequisite-gated rare tail is delivered through chests specifically, which
is what VS does with evolutions on purpose.

---

### U9. Balance and verification

**Files:** none in the game repo. The bot harness only.

**Cost: two days.** Re-run the fifteen-run bot measurement against the new
economy and check four things, all of which have a measured baseline to beat:

| metric | measured today | target |
|---|---|---|
| time to last genuinely new item | median 4.70 min | no such moment exists |
| time to hard saturation | median 12.59 min | never |
| share of run spent on filler cards | avg 16.8%, up to 36.5% | 0% |
| share of pick events that are not a decision | 47% | under 10% |
| ranks per run | ~19.3 | ~30, split 10 / 9 / 11 across acts |

Note honestly what this cannot measure: the research library has **no method for
measuring build variety at all**. It offers a qualitative target (multiple
genuinely viable archetypes that play differently rather than just number
differently) and names the failure state (every run converges on one or two
correct builds), but no metric. If a build-variety number is wanted, that is its
own research pass or its own telemetry, and it is not something this plan
delivers.

### Total size

| | days |
|---|---|
| U1 substrate merge | 1 |
| U2 stat block and offer engine | 3 |
| U3 item catalogue (authoring) | 3 |
| U4 forks, scouts, curve | 2 |
| U5 draft and chest UI | 2 |
| U6 hook primitives | 1 |
| U7 board, luck, slot unlocks | 1 |
| U8 chest and shop rooms | 0.5 |
| U9 balance and verification | 2 |
| **total** | **15.5 engineer-days** |

Of which **4 days are engine work that must happen before any item can exist**
(U1, U2 and U6 partially), and the remaining 11.5 are content, UI and
verification. Three new weapons and three new skills, if wanted, are a further
6 days on top and are not in this total.

---

## 9. What we are not doing, and why

**Naming anything.** Stated at the top and repeated here because it is the
easiest constraint to violate by accident. No item names, no descriptions, no
flavour text, until the eerie and adult tone doctrine is settled. An item is an
id and a functional effect list until then.

**A currency-and-shop economy.** Brotato's answer to saturation is that the
scarce resource is money rather than slots: 241 items bought from a shop with a
rising price curve, per-item stacking caps instead of a hard pool wall. It works,
and it is wrong for us. It needs a wave boundary, a price curve, reroll costs,
lock and sell, and it converts a night of continuous pressure into
burst-then-calm. The research library names shop reroll, lock and sell and the
dual money-and-XP material as anti-floor, Brotato-only affordances. We already
have shop rooms with Cookie Money (`js/ui.js:358-362`); U8 fixes them, and that
is enough.

**More weapon slots.** Four stays. Six auto-firing weapons is the answer for a
game with no fire button, and we have manual aim and a dodge.

**Unlimited patch slots.** Isaac never saturates mainly because passive items
just accumulate forever, and that is the reason it works and the reason we cannot
copy it. In Isaac you read your build off one character sprite; in a 21-minute
horde run the screen is full of enemies and the build has to be legible at a
glance. Slot scarcity is the lever that makes a draft a real choice.

**Two hundred and forty-one items.** See section 3. Copy the composition method,
not the catalogue size.

**Projectile speed as a player stat.** Gungeon has it and it is real there. For
us, raising projectile speed mostly makes shots harder to read, which is a feel
regression dressed as an upgrade. Weapons keep their own private `speed` field.

**Evolutions, for now.** Deliberately deferred, and section 4 explains why: an
evolution adds zero picks and is a scheduling mechanic, not an anti-saturation
mechanic. It is worth doing later, and our clock lines up almost exactly with the
one VS uses. But it must be gated on act 3 rather than on "weapon maxed plus
patch maxed", because our measured last-new-item median is 4.7 minutes and an
ungated evolution would fire in act 1 and move the flat stretch earlier rather
than removing it.

**A curse or risk stat.** Genuinely tempting, thematically native to the eerie
repositioning, and independently recommended by both the Gungeon and Isaac
passes. Deferred for one specific reason: the Tally Post blazes already let a
player promise the night will be worse for more pay, which is the same lever
attached to our own fiction. Adding a second risk dial before deciding what the
first one is for would be two systems doing one job.

**Rarity tiers, in the first wave.** Kept as a rider and scheduled after the stat
block lands, because rarity multiplies numeric parameters and there need to be
parameters worth multiplying first. When it lands: three tiers, magnitude only,
folded in one loop inside `rebuildTraits`. The three-tier cap in the research
library is a palette constraint specific to the forge tooling and does not
transfer to us as a design law, but three is still the cheaper number.

**Anti-snowball throttling.** Gungeon appears to suppress high-tier drops after
you take high-tier items (weakly sourced, community lore). Even if true it is
wrong here: the survivors-like arc has items assembled by minute 8 to 15 and full
snowball from 15 onward, so degrading late-run quality sands off the one thing
our back half is supposed to deliver.

**Making the build readable off a pause screen.** Isaac keeps the item list and
all numeric stats off the standing HUD, readable only by pausing. Fine for a game
you can stop. Ours has to communicate the build through what the screen does,
which is a separate piece of work and is already on the board.

**A build-variety metric.** Named as a real gap in section 8 rather than quietly
skipped. The research library has none, and inventing one is its own project.
