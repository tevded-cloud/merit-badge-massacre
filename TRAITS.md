# The Trait Substrate

This is the reference for Merit Badge Massacre 3.0's trait system: how a
projectile or a dash roll picks up behaviour that nobody wrote a special case
for. Read this instead of reading the engine. It explains what each piece
does and, more importantly, why it is shaped the way it is.

The four files that make up the substrate are `js/traits.js` (the vocabulary
and the two pipelines), `js/hooks.js` (the event bus), `js/dodge.js` (where
the dash trait pipeline is driven from), and `js/data.js` (where everything
gets authored: `DATA.relics`, `DATA.characters.*.dodge`).

---

## 1. Why this exists

In 2.0 a weapon owned its behaviour. If the slingshot was going to pierce,
someone wrote pierce into the slingshot's own code. That does not scale:
every new combination of "this weapon does that thing" was a new branch
somewhere, and a catalogue of a hundred items would have needed something
like ten thousand branches to cover every weapon-times-effect pairing,
nobody could hold that in one head, let alone test it.

3.0 moves behaviour off the weapon and onto the projectile instead. A shot
carries a small list of trait objects, and a fixed pipeline walks that list
in a fixed order, every frame, for every shot, whatever the list contains.
Combinations are not authored, they fall out of the walk: an item that says
"everything you fire pierces and then chains to a second target" is two
lines of data, and it is automatically correct on the slingshot, the
roaster, the boomerang, and on every weapon that has not been designed yet,
because none of those two lines mentions a weapon at all. The dash roll
gets the identical treatment as a second surface: an item can grant the
dodge itself new behaviour (phase through the crowd, mark bodies on the way
past, drag loot along) using the same authoring shape.

The goal, stated plainly: later item authoring should be data, not
engineering. A new relic is a new entry in `DATA.relics`. It should never
require a new `if (weapon.id === ...)` anywhere in the engine.

---

## 2. The shot trait vocabulary

Every shot trait is a small object living in `Traits.SHOT` with up to four
optional hooks (`apply`, `update`, `onHit`, `onExpire`) and an optional `vis`
function. `scope` says what the trait needs to mean anything: `'shot'` traits
only do something to an actual projectile; `'any'` traits fire on every point
of player damage, projectile or not (see section 5). Defaults below are the
literal numbers passed to `num(c.x, DEFAULT)` in `traits.js`; leaving a key
out of an authored trait object gets you exactly that default.

### giant
```
{ t: 'giant', scale?: 1.7, dmg?: 1 + (scale - 1) * 0.8 }
```
Scope `shot`. Hooks: `apply`, `vis`. Scales the shot's radius by `scale` and
its damage by a multiplier that is *derived from whatever scale actually
got used*, not a fixed constant: set only `scale` and the damage bump scales
with it automatically. Stacks a `s.giant` multiplier on the shot for anything
downstream (the renderer) that wants to know how oversized it is.

### seek
```
{ t: 'seek', range?: 300, turn?: 2.2 }
```
Scope `shot`. Hooks: `update`, `vis`. No lock, no memory: every frame it
finds whichever body is nearest *right now* and steers toward it at up to
`turn` radians/second. A seeking shot wanders through a crowd rather than
committing, because the target it is leaning toward can change frame to
frame as bodies move past each other.

### homing
```
{ t: 'homing', range?: 260, turn?: 6.5 }
```
Scope `shot`. Hooks: `apply`, `update`, `vis`. Acquires one target on `apply`
(`s.homeT = null`, resolved on the first `update`) and keeps steering at that
same body until it dies, then re-acquires. This is the opposite of `seek`:
where seek re-picks every frame and drifts, homing commits to one target and
turns harder (`turn` defaults to nearly 3x seek's) to actually land on it.

### orbit
```
{ t: 'orbit', range?: 220 }
```
Scope `shot`. Hooks: `update`, `vis`. Travels straight out to `range`, then
takes over the shot's path entirely and flies it back to the player,
finishing when it gets within 26 units (this is the boomerang's own flight
shape, said as a trait). On a shot of `kind === 'boomer'`, the boomerang
already owns this behaviour in its own branch of `updateShots`, so `orbit`
stands down and does nothing: this is the one place in the file that is even
aware a "boomer" kind exists, and it is a no-op, not a special case. The
trait genuinely has nothing to add there.

### ricochet
```
{ t: 'ricochet', n?: 2, life?: 0.6 }
```
Scope `shot`. Hooks: `apply` (grants `n` bounce charges onto `s.ricoN`),
`update`. Off the **walls**. Runs in `update`, which fires before the shot
integrates (see section 4), so on the frame the shot would have entered a
wall it instead reflects the axis that was blocked (X, Y, or both) and keeps
going, spending one `ricoN` charge and refreshing `s.life` to at least
`life` seconds so a shot that was about to expire gets a little more road.

### bounce
```
{ t: 'bounce', n?: 2, range?: 170, life?: 0.8 }
```
Scope `shot`. Hooks: `apply` (grants `n` charges onto `s.bounceN`), `onHit`.
Off the **bodies**. Where pierce spends a charge to pass *through* a body
without changing course, bounce spends a charge to turn and go after
somebody else nearby (within `range`, excluding bodies already hit). Returns
`true` from `onHit` to tell the pipeline the shot survives this hit.

### pierce
```
{ t: 'pierce', n?: 1 }
```
Scope `shot`. Hooks: `apply` only. Adds `n` to `s.pierce`, the same field
`updateShots` has always read for a weapon's own built-in pierce (the
slingshot's level-3 upgrade, for instance). A trait-granted pierce and a
weapon's own pierce are literally the same number and stack without either
side knowing the other exists.

### chain
```
{ t: 'chain', jumps?: 1, range?: 150, falloff?: 0.6, color?: '150,220,255' }
```
Scope **`any`**. Hooks: `onHit`, `vis`. On a hit, arcs to up to `jumps`
additional nearby bodies (each one falls off by `falloff` from the last),
dealing raw scaled damage to each via `g.dealDamage(..., { noTraits: true, ... })`.
Because its scope is `any`, it fires off a hand-axe chop or a bugle blast as
readily as off a stone: chain does not care whether anything that reached it
was a projectile. Its own arc damage is dealt with `noTraits: true` so an arc
cannot itself trigger chain again (see section 5 and section 11).

### split
```
{ t: 'split', on?: 'hit', gen?: 1, n?: 3, spread?: 1.1, dmg?: 0.55, speed?: 0.9, size?: 0.75, life?: 0.85 }
```
Scope `shot`. Hooks: `apply` (seeds `s.gen` if unset), `onHit`, `onExpire`,
`vis`. `on: 'hit'` (the default, anything other than the literal string
`'expire'`) bursts into `n` children the moment the shot lands a hit;
`on: 'expire'` instead waits and bursts when the shot's life runs out.
Children spawn at the parent's heading (or a random one, for a shot with no
velocity) fanned by `spread`, each scaled down by `dmg`/`size`/`speed`, and
carrying `gen - 1`. At `gen <= 0` the burst does nothing, which is what caps
the recursion: a split cannot cascade forever.

### burn
```
{ t: 'burn', dps?: 7, dur?: 2.2 }
```
Scope **`any`**. Hooks: `onHit`, `vis`. Calls `g.applyBurn(e, dps, dur)`,
the same status a burning weapon like the roaster already applies.

### freeze
```
{ t: 'freeze', dur?: 1.2 }
```
Scope **`any`**. Hooks: `onHit`, `vis`. Sets `e.slowT`, the slow field the
director already reads when it moves and attacks enemies.

### rend
```
{ t: 'rend', dps?: 6, dur?: 3 }
```
Scope **`any`**. Hooks: `onHit`, `vis`. Damage over time that is not fire:
its own `rendDps`/`rendT`/`rendTick` fields on the enemy, ticked alongside
burn in `director.js`'s `updateEnemies`, so a body can be rent and burning
at once without either status overwriting the other.

---

## 3. The pipeline order, and why it is that order

```js
const SHOT_ORDER = [
  'giant',      // 0  size and damage, before anything reads either
  'seek',       // 1  coarse steering
  'homing',     // 2  locked steering, overrides the drift above
  'orbit',      // 3  owns the path outright once it turns for home
  'ricochet',   // 4  walls, resolved before the shot integrates
  'bounce',     // 5  bodies, resolved when the shot lands
  'pierce',     // 6  the hit budget
  'chain',      // 7  derived damage
  'split',      // 8  derived projectiles
  'burn',       // 9  statuses last: they ride a hit that survived the rest
  'freeze',     // 10
  'rend',       // 11
];
```

A trait *set* (the list an item, a character, or a weapon grants) is not
walked in the order it was authored. `Traits.compileShot` sorts it once, at
compile time, into `SHOT_ORDER`'s indices, so the runtime walk is always a
plain indexed loop over an array that is already in the right order. Nothing
at runtime ever asks "what order should these run in": that question was
answered once, when the set was built.

The order falls into four bands:

1. **Movement and geometry settle first** (`giant`, `seek`, `homing`,
   `orbit`, `ricochet`, indices 0 to 4): size and damage are fixed before
   anything downstream reads them, and steering happens before wall
   response, so a shot that just turned toward a target is the one that
   then decides whether it is about to hit a wall.
2. **The response to what was struck, then the hit budget** (`bounce` then
   `pierce`, indices 5 to 6): when a shot lands on a body, first ask
   whether something wants to turn it toward somebody else instead of
   spending it (bounce), and only if nothing claimed it does the ordinary
   hit-budget check run (pierce).
3. **Things derived from the hit** (`chain`, `split`, indices 7 to 8): once
   it is settled that a hit happened and what the shot itself is doing
   about it, secondary effects that spin off new damage or new projectiles
   run.
4. **The statuses left behind** (`burn`, `freeze`, `rend`, indices 9 to 11):
   these ride a hit that already survived everything above, and never need
   to know whether the shot that delivered them pierced, bounced, or was
   about to split.

`DASH_ORDER` follows the same idea for the dash vocabulary (see section 7).

---

## 4. The four hooks

Every trait's hooks share one calling convention: `g` (the Game instance),
`s` (the shot, or `null`/absent for a dash-side call), `c` (that trait's own
authored config object, the literal `{ t: '...', ... }`), plus whatever else
the hook needs.

- **`apply(g, s, cfg)`**: fires once, the instant a shot is armed
  (`Traits.arm`, called from `Game.armShot`, the single door every
  projectile in the game comes through). This is where a trait sets up
  fields on the shot: `pierce.apply` adds to `s.pierce`, `bounce.apply`
  seeds `s.bounceN`, `homing.apply` clears `s.homeT`.

- **`update(g, s, cfg, dt)`**: fires every frame, and critically, it fires
  **before the shot integrates** (before `s.x += s.vx * dt` runs in
  `updateShots`). This is what lets `ricochet` turn a shot away from a wall
  on the exact frame it would otherwise have entered that wall, without a
  fifth hook: by the time the position update and the blocked-cell check
  run, the velocity has already been flipped.

- **`onHit(g, s, cfg, e, dmg)`**: fires when damage lands on `e`. Return
  `true` to tell the pipeline "keep this shot alive, I've claimed it"
  (this is how `bounce` avoids being spent on the hit that redirected it);
  any other return value means the shot is treated normally by whatever
  budget logic runs next (pierce, or simple removal). For `'any'`-scope
  traits reached through melee or an aura, `s` is `null` and the return
  value is meaningless because there is no shot to keep alive.

- **`onExpire(g, s, cfg)`**: fires whenever the projectile leaves the
  world. That is a wider net than "its life ran out": `updateShots` also
  calls it when the shot is spent on a hit (pierce budget exhausted, no
  trait claimed it), and when it dies against a wall. `split`'s
  `on: 'expire'` mode and any cleanup logic should be written against that
  full definition of "expire," not just the timer running to zero.

There is a fifth per-trait function, `vis(out, cfg)`, which is not part of
the hit/update lifecycle at all: it runs once at compile time to build the
shot's visual descriptor (section 8), never per frame and never per hit.

---

## 5. The scope rule

`scope: 'shot'` traits are meaningless without a projectile to carry them:
pierce, bounce, ricochet, homing, seek, orbit, giant, and split all read or
write fields that only exist on a shot object (`s.vx`, `s.pierce`, `s.gen`,
and so on).

`scope: 'any'` traits (chain, burn, freeze, rend) fire on every point of
player damage, because `Game.dealDamage` is **the single door** all of it
comes through, marked in the source as "THE ONE DOOR": stones, flame,
boomerangs, the hand axe swing, orbiting knives, bug spray, holy water
puddles, firecracker blasts, and the bugle ring all end up calling
`dealDamage`. Concretely, the weapons that reach `'any'`-scope traits with
**no projectile at all** are the hand axe swing, the orbiting knives, bug
spray's damage tick, holy water puddles, firecracker blasts, and the bugle
ring: every one of those call sites (`fireWeapon`'s `hatchet` case,
`updateWeapons`' `knives`/`bugspray` branches, `updatePuddles`,
`updateBombs`'s `boom` branch, `updateRings`) calls `dealDamage` directly
with no `src` at all.

`dealDamage` decides which trait set to walk based on whether the hit
carried a shot: `o.src` is the projectile when a projectile did it, and
`undefined` when a chop or an aura did it. When there is no `src`,
`dealDamage` walks `this.strikeTraits`, a pre-filtered subset built once by
`Traits.anyScope(this.shotTraits)` in `rebuildTraits`, containing only the
traits whose `scope` is `'any'`. `'shot'`-scope traits are never even
present in `strikeTraits`; they are dropped at compile time, not skipped at
runtime. When there *is* a `src`, `dealDamage` instead walks that shot's own
full compiled set (`o.src.traits`), which includes both scopes, because a
projectile can meaningfully carry either kind: `Traits.hit`'s runtime guard
(`if (d.scope === 'shot' && shot === null) continue`) exists specifically
to skip `'shot'`-scope hooks when there is no shot, i.e. only in the
melee/aura case.

**Reentrancy.** `dealDamage` guards the whole trait-and-hook block behind
`this._tDepth`: it only runs the block when `_tDepth === 0`, sets it to `1`
for the duration, and resets it to `0` afterward. This is what stops a
trait's own derived damage from re-entering the pipeline while the pipeline
is already running on the stack: `chain`'s arc damage happens *inside*
`Traits.hit`, while `_tDepth` is still `1`, so a chain arc cannot itself
trigger another chain purely by virtue of the depth guard. `chain` also
passes `noTraits: true` explicitly on that call, which is the belt this
particular buckle does not strictly need (the depth guard alone already
covers it) but is the correct pattern to copy, because the depth guard is
`0` again by the time hooks like `onKill` run (those fire *after*
`dealDamage` returns, outside the guarded window). Any item author dealing
secondary damage from a hook, not from inside a trait's own `onHit`, must
pass `noTraits: true` by hand if that damage is meant to be a clean final
hit rather than a fresh entry point for the whole trait suite.

---

## 6. The event bus

Nine events, declared as the closed list `Hooks.EVENTS` in `hooks.js`.
Registering against a name not on this list is treated as a typo and
rejected with a console warning rather than silently doing nothing.

| Event | Signature | Meaning | Emitted from |
|---|---|---|---|
| `onRunStart` | `(g)` | a night begins, build is empty | `js/game.js`, the `Game` constructor, after `rebuildTraits()` |
| `onLevelUp` | `(g, level)` | a rank was gained | `js/game.js`, `gainXP()`, inside the while-loop each time a level completes |
| `onHit` | `(g, enemy, dmg, shot)` | player damage landed, shot may be null | `js/game.js`, `dealDamage()`, inside THE ONE DOOR, right after `Traits.hit` |
| `onKill` | `(g, enemy)` | a body went down | `js/game.js`, `killEnemy()`, right after `e.dead = true`, before the `noDrops` bail |
| `onDamaged` | `(g, taken, kind)` | the scout took a hit | `js/game.js`, `damagePlayer()`, after the damage number spawns |
| `onDodge` | `(g, player, opt)` | a dash is about to integrate, `opt` is MUTABLE | `js/dodge.js`, `updateDodge()`, right after building `opt`, before checking `opt.cancel` |
| `onPickup` | `(g, type, value)` | `'gem'`, `'cocoa'`, `'magnet'`, or `'chest'` | `js/game.js`, `updateLoot()`, twice: once for gems, once for pickups |
| `onRoomClear` | `(g, room)` | doors just opened | `js/room.js`, `onClear()`, after `openDoors()` |
| `onBossPhase` | `(g, enemy, phase)` | a boss crossed a phase cut | `js/director.js`, `Game.prototype.onBossPhase()`, at the end of the per-fight branch |

An item registers with `Hooks.on(event, src, pri, fn)`, where `src` is the
id it registers under (an item id, a character id, `'debug'`). `Hooks.off(src)`
removes everything one source registered; `Hooks.clear()` wipes the entire
bus and is called at the top of the `Game` constructor, so nothing a
previous run registered can reach the next one. `Hooks.count(ev)` reports
how many handlers are on an event.

Handlers on the same event run in **priority order** (lower `pri` runs
first); ties break on registration order, so a set of same-priority
handlers fires in the order the items were picked up, matching what a
player would intuitively expect.

**The allocation-free rule.** `emit()` must never allocate, because it is
called from hot paths (`dealDamage`, `updateShots`'s neighbourhood). That
means: fixed arity (`emit(ev, g, a, b, c)`, no rest args, no spread, no
options object assembled at the call site), no closures created per event
(a handler record, `{ src, pri, seq, fn }`, is built once at registration
and reused for the handler's whole lifetime), and an event with zero
handlers costs exactly one property lookup and one length compare. That last
property is what makes it safe to emit `onHit` from inside `dealDamage`
without worrying about the common case (no items granting hooks) costing
anything measurable. A handler that throws is caught, logged, and skipped:
one bad item can never take a frame down with it.

---

## 7. The dash section

The dodge roll is a first-class item surface in 3.0, not a fixed move with a
couple of per-character flags bolted on. It gets its own real vocabulary,
its own three-hook pipeline, and it is driven from `js/dodge.js`'s
`updateDodge`.

### The onDodge payload

The moment a dash is committed (the input edge fired, a free charge exists)
and **before it has moved an inch**, `dodge.js` builds a single mutable
options object and hands it to every `onDodge` handler:

```js
const opt = {
  dx: dx, dy: dy,                          // normalized heading
  dist: baseDist,                          // spd * dur * mods.distMul
  dur: params.dur,                         // seconds the roll lasts
  spd: params.spd * mods.distMul,
  iframe: params.iframe + mods.iframeAdd,  // untouchable window, own clock
  cd: params.cd * mods.cdMul,              // cooldown this charge pays
  charge: chargeIdx,                       // which charge slot fired
  charges: p.dashCds.length,               // total charges the scout has
  traits: dashSet(this),                   // this run's compiled dash set
  cancel: false,                           // set true to wave the roll off
};
Hooks.emit('onDodge', this, p, opt);
```

Every field here is writable and every write matters. `dist` is
authoritative over `spd` if a handler touched it: after the emit, `dodge.js`
compares `opt.dist` to the `baseDist` it started with, and if `dist`
changed, `spd` is recomputed from it (`spd = dist / dur`); otherwise `dist`
is recomputed from whatever `spd` ended up as. This is a deliberate
one-of-two authority rule, not two independent numbers that can drift out
of sync. `ghostlace`'s handler (section 9) writes `opt.dist *= 1.33` for
exactly this reason: it is rewriting the roll's reach, and letting
`dodge.js` work out what speed that implies.

The whole point of firing before integration is that a handler is
**rewriting the roll**, not reacting to one that already happened. `dx`/`dy`
can be turned (`dodge.js` re-normalizes them after the emit, in case a
handler changed the heading), `dist`/`dur` can be stretched, `iframe` can be
widened, and `cancel: true` cancels the roll outright before the player has
moved an inch.

### The dash trait vocabulary

All seven live in `Traits.DASH`. Unlike shot traits there is no `scope`
field: a dash trait always has a player and a dash to work with.

#### phase
```
{ t: 'phase', grace?: 0.08, smash?: undefined }
```
Hooks: `start`, `step`, `end`, `vis`. `start` turns off solid resolution for
the whole roll (`dash.noSolids = true`) and extends the scout's
invulnerability to cover the entire dash plus `grace` seconds, not just its
opening window. If `smash` is set and greater than 0, `step` also damages
any breakable prop within 30 units the dash has not already hit this roll.
`end` (see the boundary rule below) pushes the scout back out of any solid
it finished the roll standing inside.

#### trail
```
{ t: 'trail', effect?: 'burn', r?: 26, dps?: 6 (burn/thorn), dur?: 1.2 (burn/frost) or 2 (thorn), rate?: 0.3 }
```
Hook: `step` only. Lays a status in the scout's wake: `effect` is `'burn'`
(applies `applyBurn`), `'frost'` (sets `slowT`), or `'thorn'` (sets the same
`rendDps`/`rendT` fields the `rend` shot trait uses), against every body
within `r` of the scout each frame, plus a chance (`rate`) each frame to
spawn a trailing spark/ember particle. This is what Junie's fire dash has
always done, now said in the vocabulary instead of an `if` in `dodge.js`.

#### mark
```
{ t: 'mark', r?: 34, mul?: 1.35, dur?: 4 }
```
Hook: `step` only. Tags every body within `r` of the scout with `markMul`/
`markT`; `dealDamage` reads `e.markT > 0` to multiply subsequent damage by
`markMul` for as long as the mark lasts. Bodies the dash passes near take
extra damage from whatever hits them next, not from the dash itself.

#### reflect
```
{ t: 'reflect', r?: 40, dmg?: 1.6, range?: 420 }
```
Hook: `step` only. Any enemy shot (`g.eshots`) within `r` of the scout is
deleted and replaced with a new player projectile aimed at the nearest body
in `range` (or straight back the way it came, if nothing is nearby),
carrying `dmg` times the caught shot's own damage. The caught shell is armed
through `g.armShot(shot, null)`, meaning **it is armed with the run's own
shot traits**, exactly like anything else fired through that door: nothing
in `reflect` itself knows that, it falls out of going through `armShot`.

#### magnet
```
{ t: 'magnet', r?: 190, pull?: 3.2 }
```
Hook: `step` only. Every gem within `r` gets flagged `attracted` (so the
normal loot-magnet code in `updateLoot` reels it in); every non-gem pickup
within `r` gets nudged toward the scout by `pull` units per frame.

#### decoy
```
{ t: 'decoy', range?: 260, life?: 3 }
```
Hook: `end` only. Drops a `g._decoy` marker (position, `r: range`, `life`,
plus the scout's `charId`/`face` for the ghost sprite) at the spot the dash
finished. `director.js`'s enemy targeting reads this in exactly one place
(searched for as `_decoy` in the codebase): while it is alive and a hunting
body is within its radius, that body's target vector points at the decoy
instead of the scout. `game.js` ticks `_decoy.life` down each frame and
clears it to `null` when it expires.

#### barge
```
{ t: 'barge', r?: 30, knock?: 260, stun?: 0.3, propDmg?: 20 }
```
Hook: `step` only. Every body or breakable prop within `r` of the scout,
not already hit this roll, gets knocked back by `knock` and (bodies only,
non-boss) stunned for `stun` seconds; props take `propDmg`. This is Gus's
shoulder-check, said in the vocabulary.

### The three dash hooks

- **`start(g, p, cfg, dash)`**: fires once, the instant the dash is
  committed (after `onDodge` has already had its say and the roll's numbers
  are locked in), before the player moves.
- **`step(g, p, cfg, dash, dt)`**: fires every frame the dash is in
  progress, before the player's position is integrated for that frame.
- **`end(g, p, cfg, dash)`**: fires once, the frame the dash's timer runs
  out.

The `dash` object passed to all three carries: `dx`/`dy` (heading), `spd`,
`dur`, `dist`, `iframe`, `charge` (which charge slot), `t` (elapsed time
this roll), `traveled` (distance actually covered, which can differ from
`dist` if solids blocked part of the path), `hit` (a fresh `Set` for this
roll's phase/barge contact tracking), `noSolids` (writable by `phase`), and
`traits` (the compiled set being walked).

### THE BOUNDARY RULE

A dash trait may switch off solid resolution: that is exactly what `phase`
does, by setting `dash.noSolids = true`. **Nothing in the dash vocabulary
can reach `Collide.clampToBounds`.** `dodge.js` applies the bounds clamp
unconditionally, outside the trait walk entirely, on every single frame of
every dash, whether or not any trait ran:

```js
if (this.room) {
  const clamped = Collide.clampToBounds(nx, ny, p.r, this.room.bounds);
  nx = clamped.x; ny = clamped.y;
}
```

There is no config key on any trait, current or future, that reaches this
line. A locked room is the woods deciding you stay, and no item overrules
the woods. `phase`'s `end` hook is the one piece of cleanup this rule makes
necessary: because `phase` skips solid resolution for the whole roll, a
scout could finish a phase dash standing inside a boulder. `end` runs
`Collide.resolveCircle` followed by `Collide.clampToBounds` once, on the way
back to normal physics, so `phase` can never leave anyone stuck in the
scenery, only briefly ignore it.

### Standing dash modifiers

Separate from the trait list, an item can carry `def.dash`, a small object
of flat modifiers folded into `this.dashMods` by `rebuildTraits`:

```js
def.dash = { charges?: number, cdMul?: number, distMul?: number, iframeAdd?: number };
```

`charges` adds extra dash charges, `cdMul` multiplies the cooldown per
charge, `distMul` multiplies both the roll's distance and its speed, and
`iframeAdd` adds flat seconds to the invulnerable window. These are plain
numeric folds, not trait-vocabulary entries, because they describe "how the
dodge button behaves" rather than "what the roll does while it happens."

### The refactor

Before 3.0, Junie's burn trail and Gus's shoulder-barge were two boolean
flags (`trail: 'burn'`, `barge: true`) read by two `if` statements inside
`dodge.js`. They are entries in `DATA.characters.*.dodge.traits` now,
exactly the same list shape an item writes into:

```js
DATA.characters.junie.dodge = {
  name: 'Backdraft', spd: 700, dur: 0.13, iframe: 0.24, cd: 0.8, charges: 2,
  traits: [{ t: 'trail', effect: 'burn', dps: 6, dur: 1.2, r: 26, rate: 0.3 }],
};
DATA.characters.gus.dodge = {
  name: 'Tuck and Roll', spd: 520, dur: 0.24, iframe: 0.34, cd: 1.4, charges: 1,
  traits: [{ t: 'barge', knock: 260, stun: 0.3, propDmg: 20, r: 30 }],
};
```

`rebuildTraits` folds a character's own `dodge.traits` in alongside whatever
the build has granted, so an item that adds `{ t: 'trail', effect: 'frost' }`
lands *beside* Junie's fire rather than replacing it: both trail entries
walk in the same dash, in `DASH_ORDER`. `dodge.js` keeps a `legacyTraits()`
compiler for any character still authored with the old `trail`/`barge`
flags, so nothing outside `dodge.js` needs to know the shape ever changed.
`DASH_ORDER` itself is `['phase', 'magnet', 'reflect', 'barge', 'mark', 'trail', 'decoy']`:
`phase` first because it decides whether solids apply at all this step, the
independent area effects next, and `decoy` last because it only matters once
the roll has actually finished somewhere.

---

## 8. Derived visuals

Every shot and every dash trait may implement `vis(out, cfg)`, called
exactly **once**, at compile time (inside `Traits.compileShot`/its internal
`buildVis`), never per shot and never per frame. The renderer never walks a
trait list at all; it reads the already-folded descriptor.

```js
// out starts as:
{ hot: false, cold: false, rend: false, arc: false, split: false, bulk: 0, trail: 0, ghost: false }
```

- `hot`: set by `burn`. `cold`: set by `freeze`. `rend`: set by `rend`.
- `arc`: set by `chain` (the projectile is expected to draw arcing links).
- `split`: set by `split`.
- `bulk`: the largest scale-minus-one any `giant` grant contributed
  (`Math.max(out.bulk, scale - 1)`), so stacked giant sources do not
  over-report.
- `trail`: the largest trail-sample count any of `seek` (4), `homing` (7),
  or `orbit` (5) asked for, and this number becomes the ring buffer's capacity.
- `ghost`: set by `phase` (dash-side).

The descriptor is built once per **compiled set** (i.e. once per build
change, when `rebuildTraits` runs `Traits.compileShot`), memoized onto that
compiled array, and every shot armed from that set gets `s.vis` pointed at
the same shared object. A shot that is giant and burning and frozen at once
draws as all three simultaneously and needed no bespoke art to say so,
because every layer composes independently off one descriptor.

**The trail ring buffer.** When `s.vis.trail > 0`, `Traits.arm` allocates
`s.trailBuf = new Float32Array(trail * 2)` once per shot: a flat buffer of
`x0, y0, x1, y1, ...` pairs, capacity `trail` samples. `s.trailN` is how
many of those samples are currently valid (grows from 0 up to capacity and
then holds). `s.trailHead` is the index of the *next* slot to be written,
which means the most recently written sample sits at `trailHead - 1`, and
the oldest still-valid sample sits at `(trailHead - trailN + cap) % cap`.
Sampling happens once per frame in `updateShots`, after the trait `update`
pass.

This section describes the **contract**, not the pixels: a separate agent
owns `js/render.js` and is implementing the drawing side against this same
descriptor right now. A new trait combination should never require new art;
if it does, something is wrong with how it folded into `vis`, not with the
renderer.

---

## 9. The four demonstration items

`DATA.relics` currently holds four entries, and they exist for exactly one
reason: to prove that composable traits and event hooks actually compose.
They are not balance and they are not content. No feat awards them, they
appear in no shop, and `levelPool` only ever offers them when
`DATA.DEBUG_TRAITS` is `true`, which nothing in a normal run sets: it is
flipped by `?traits=1` in the URL, or by hand from a console
(`DATA.DEBUG_TRAITS = true`).

**1. Quartz Splitter**, two shot traits stacked:
```js
quartzsplitter: {
  shotTraits: [
    { t: 'pierce', n: 2 },
    { t: 'chain', jumps: 2, range: 150, falloff: 0.6 },
  ],
}
```
Proves a `'shot'`-scope trait and an `'any'`-scope trait can ride the same
grant list and both do their own thing: pierce works on the slingshot, the
roaster, the boomerang (anything with a projectile); chain, being `'any'`,
*also* arcs off a hand axe chop, an orbiting knife, the bug spray cloud, a
holy water puddle, a firecracker blast, and a bugle ring, none of which
carry a projectile pierce could ever touch.

**2. Ember Seed**, a status and a shape, stacked:
```js
emberseed: {
  shotTraits: [
    { t: 'burn', dps: 8, dur: 2.4 },
    { t: 'split', on: 'expire', n: 3, spread: 1.0, dmg: 0.5, size: 0.7, life: 0.7, gen: 1 },
  ],
}
```
Proves the same thing from the other direction: `burn` (`'any'`) reaches
every weapon, `split` (`'shot'`) only reshapes actual projectiles, which is
the honest answer for a swing that has nothing to split.

**3. Tinder Fetch**, no traits at all, one event handler:
```js
tinderfetch: {
  hooks: [{
    on: 'onKill', pri: 0,
    fn: function (g, e) {
      if (!e || e.prop || e.boss) return;
      if (g.shots.length > 260) return;
      if (DATA._sparkSet === undefined) {
        DATA._sparkSet = Traits.compileShot([{ t: 'homing', turn: 7.5, range: 340 }]);
      }
      const a = Math.random() * Math.PI * 2;
      g.shots.push(g.armShot({
        kind: 'pebble', x: e.x, y: e.y - 6,
        vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
        dmg: 6, pierce: 0, r: 4, life: 2.4,
      }, DATA._sparkSet));
    },
  }],
}
```
Proves the event bus is a real second surface, independent of the trait
lists, and that a hook can manufacture an entirely new trait-carrying
projectile that no weapon ever fired.

**4. Ghost Lace Boots**, the dash surface end to end:
```js
ghostlace: {
  dash: { charges: 1, cdMul: 0.85, iframeAdd: 0.05 },
  dashTraits: [
    { t: 'phase', grace: 0.1, smash: 18 },
    { t: 'magnet', r: 190, pull: 3.4 },
    { t: 'mark', mul: 1.35, dur: 4, r: 34 },
    { t: 'trail', effect: 'frost', dur: 1.1, r: 26, rate: 0.35 },
  ],
  hooks: [{
    on: 'onDodge', pri: 0,
    fn: function (g, p, opt) { opt.dist *= 1.33; },
  }],
}
```
Proves the standing modifiers, the trait list, and an `onDodge` handler that
rewrites the roll before it integrates all combine on one item, and that it
works identically on all three scouts without naming any of them: Junie
keeps her fire and gains frost beside it rather than losing her fire to it,
Gus keeps his shoulder, and Max, who had nothing dash-side before, now has
all of this.

---

## 10. The worked example: the Swiss Army Knife

The brief: each use flicks out a random tool, and whatever the tool's effect
is gets pushed through whatever weapon the scout is currently holding. No
per-weapon branching, no per-scout branching. Here is the whole thing,
authored entirely on top of what sections 1 to 9 already describe:

```js
swissarmyknife: {
  name: 'Swiss Army Knife', icon: 'knives',
  desc: 'Every roll flicks out a random tool. Whatever you are holding uses it next.',
  hooks: [
    {
      // Each roll IS a "use": pick a tool, and swap the run's live trait
      // sets to that tool's set for a short window.
      on: 'onDodge', pri: 0,
      fn: function (g, p, opt) {
        const TOOLS = [
          { id: 'corkscrew', traits: [{ t: 'bounce', n: 2, range: 170 }] },
          { id: 'flint',     traits: [{ t: 'burn', dps: 8, dur: 2.4 }] },
          { id: 'awl',       traits: [{ t: 'pierce', n: 2 }] },
        ];
        const tool = TOOLS[(Math.random() * TOOLS.length) | 0];
        if (DATA._sakCache === undefined) DATA._sakCache = {};
        let set = DATA._sakCache[tool.id];
        if (set === undefined) {
          set = DATA._sakCache[tool.id] = Traits.compileShot(tool.traits);
        }
        // Snapshot the real build only if a window is not already running,
        // so re-rolling mid-window can't lose the true base set.
        if (!g._sakBase) g._sakBase = g.shotTraits;
        g._sakHits = 4; // window: the next 4 points of player damage
        g.shotTraits = set;
        g.strikeTraits = Traits.anyScope(set);
      },
    },
    {
      // Count the window down on every point of player damage, and put the
      // real build back the instant it runs out.
      on: 'onHit', pri: 0,
      fn: function (g) {
        if (!g._sakHits) return;
        g._sakHits--;
        if (g._sakHits <= 0 && g._sakBase) {
          g.shotTraits = g._sakBase;
          g.strikeTraits = Traits.anyScope(g._sakBase);
          g._sakBase = null;
        }
      },
    },
  ],
},
```

**Why this needs no branching at all.** The tool grants traits. Traits ride
the projectile. Every weapon's projectiles are armed through
`Game.armShot(s, set)`, and when a weapon's fire code calls `armShot`
without a second argument (which every projectile weapon does), it always
uses whatever `this.shotTraits` currently is. The traits whose scope is
`'any'` reach the weapons that have no projectile at all through
`dealDamage`'s `this.strikeTraits`, which this hook keeps in lockstep with
`shotTraits`. Nothing here mentions the slingshot, the hand axe, or any
scout by name; it only ever touches the two fields the rest of the substrate
already reads.

**Case 1: corkscrew (bounce) while holding the slingshot.** The scout dashes,
the roll picks `corkscrew`, `g.shotTraits` becomes the bounce set. The next
pebble fired calls `armShot({...})` with no explicit set, so it is armed
with bounce: `apply` grants it `bounceN = 2`. When that pebble hits a body,
`bounce.onHit` finds a second nearby body, redirects the pebble's velocity
at it, decrements `bounceN`, and returns `true`, so `updateShots` keeps the
shot alive instead of removing it. One stone snaps between two targets
before the pierce-or-remove check finally consumes it on a third hit.

**Case 2: flint (burn) while holding the hand axe, which has no projectile
at all.** `fireWeapon`'s `hatchet` case calls `dealDamage` directly with no
`src`. THE ONE DOOR sees `o.src === undefined` and walks `this.strikeTraits`
instead of a shot's own set. `strikeTraits` is `Traits.anyScope(g.shotTraits)`,
and burn's scope is `'any'`, so it survived that filter. `burn.onHit(g, null, cfg, e, dmg)`
runs with `shot` as `null` (fine, `applyBurn` never touches it) and the
struck critter starts burning. No projectile ever existed; the chop itself
left the target on fire.

**Case 3: awl (pierce) while holding the boomerang.** This is the honest
no-op, and it is the right answer, not a gap. `armShot` gives the boomerang
shot `s.pierce = 2` exactly as it would any other shot; `apply` never checks
what `kind` it is arming. But the boomerang's own branch in `updateShots`
resolves every body in range on every frame it is out, gated only by a
per-target 0.4-second cooldown stored in `s.hits` (a `Map`), and it never
reads `s.pierce` or `s._keep` at all. The boomerang was built to hit
everything along its whole flight already; it does not consume a pierce
budget to keep going, so there is no budget for a pierce grant to extend.
The number sits on the object, correctly computed, correctly ignored. (The
same is true of `bounce` on a boomerang, for the identical reason: nothing
in that branch reads `_keep` either.)

**One honest limitation of this specific implementation, worth stating
plainly:** the window is counted in points of damage (`onHit` firing), not
literally "shots fired." A rapid-tick weapon like bug spray or the roaster
will burn through a 4-hit window in a fraction of a second; a single hand
axe swing might only spend one. And because the snapshot in `g._sakBase` is
taken once when the window opens, if the run's real build changes mid-window
(a level-up, a new relic) before the window closes, restoring reverts to the
*old* snapshot and briefly discards that change until the next `rebuildTraits`
call catches up. Both are acceptable for a four-hit window on a joke item;
either would need a sturdier mechanism (a dedicated field on the shot rather
than a global swap) for anything meant to run longer.

---

## 11. Authoring rules and gotchas

- **The vocabulary is closed.** An item *composes* the twelve shot traits
  and seven dash traits that exist. It does not add new verbs. If an item's
  idea genuinely needs a thirteenth shot trait, that is an engine change to
  `traits.js`, not something to fake by overloading an existing trait's
  config.

- **Never call `g.queryEnemies` from inside a trait hook or an `onHit`
  handler.** It returns `g._qbuf`, one shared scratch array reused on every
  call (`buf.length = 0` at the top of the function, then refilled). At the
  exact moment a trait's `onHit` is running, `updateShots` is *already*
  iterating a `queryEnemies` result to find bodies to hit; calling
  `queryEnemies` again from inside that walk clobbers the buffer out from
  under the outer loop and drops hits. This is why every search inside
  `traits.js` (`nearest`, in the `nearest()` helper) is a plain linear scan
  over `g.enemies` instead. At the counts this game runs, tens of bodies and
  tens of shots, that is cheaper than the bug.

- **Derived damage must pass `noTraits: true`.** The `_tDepth` reentrancy
  guard stops a trait's own `onHit` from re-triggering the pipeline while
  the pipeline is already on the stack (this is what actually stops `chain`
  from chaining off its own arcs). It does **not** protect damage dealt
  later, from a different call site such as an `onKill` or `onDodge` hook,
  because `_tDepth` is back to `0` by the time those fire. Any secondary
  damage authored from a hook that is meant to be a clean, final hit (not a
  fresh entry into chain/split/etc.) needs `noTraits: true` set by hand.

- **Compile trait lists once, never per shot.** `Traits.compileShot` and
  `Traits.compileDash` sort into pipeline order and build the `vis`
  descriptor; both are real work, and both are only ever called from
  `rebuildTraits`, which itself only runs when the build changes (a relic
  picked up, a levelled dodge). A shot is armed by handing `Game.armShot` an
  *already-compiled* set (`this.shotTraits`, or an explicit set for special
  cases like a split child or a Tinder Fetch spark). Nothing should call
  `compileShot` from inside `updateShots` or any per-frame loop.

- **Per-shot mutable state belongs on the shot, never on the shared config
  object.** The authored `cfg` passed into every hook (`{ t: 'bounce', n: 2, ... }`)
  is the same object reference for every shot that was armed from that
  compiled set; two different pebbles fired a frame apart share one `cfg`.
  Anything that needs to change per-shot, like `bounceN` counting down, is
  written onto `s` (`s.bounceN`), never onto `cfg`. Writing to `cfg` would
  leak state between unrelated shots and, worse, between unrelated runs if
  the same relic definition object is ever reused.
