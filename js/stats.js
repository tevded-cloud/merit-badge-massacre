// Merit Badge Massacre: THE STAT BLOCK. Nineteen stats, their bounds, and the
// one stacking curve every fractional stat climbs.
//
// This file is the single source of truth for three things that used to live
// in three different places and drift:
//
//   1. WHAT A PATCH IS WORTH. The eight per level constants (0.12 damage a
//      Trail Mix rank, and so on) were hardcoded inside recalc() in game.js
//      and MIRRORED, formula for formula, inside the dev overlay, because that
//      overlay could not edit game.js. Two copies of one number is one number
//      going stale. They are PATCH_MAG below, recalc reads them live, and the
//      overlay writes into the same table.
//   2. WHAT A STACK IS WORTH. total() and delta() below, and nowhere else. The
//      card renderer must print total(n+1) - total(n) rather than a stored per
//      step number, or the card and the character disagree about the same pick
//      (BUILD_ARCHITECTURE.md 4.4).
//   3. WHERE A STAT STOPS. Every stat has a bound. A stat with no cap produces
//      a degenerate build the moment the item list gets large, and at 96 items
//      it gets large.
//
// THE CURVE (BUILD_ARCHITECTURE.md 4.4). Fractional and multiplier stats use
// the Risk of Rain 2 hyperbolic TOTAL:
//
//     total(n) = span * (a * n) / (1 + a * n)
//
// bounded by construction because (a*n)/(1+a*n) is strictly below 1 for every
// finite n, monotone so pick ORDER cannot change the answer, and needing no
// stored per step state. Integer stats (Extra Shots, Pierce, Luck, armour
// points, max health) use a plain additive law with a hard cap.
//
// The rate a is not authored. Each stat states what its FIRST stack is worth
// in game units and a is derived, because a = d1 / (span - d1) makes
// total(1) === d1 exactly. So the table below reads "the first damage item is
// worth +0.15" rather than "the damage rate is 0.0309", which is the number a
// balance pass actually wants to argue about.
//
// THE COMPOSITION ORDER is fixed for every stat and follows the research
// library's grammar: final = (base + FLAT) * (1 + PCT) * MULT, then clamp.
// base is the SHIPPED expression, verbatim, character plus patches plus badge
// board. Keeping it verbatim rather than re factoring it into flat and mult
// terms is deliberate and load bearing: floating point multiplication is not
// associative, so re associating `65 * (1+pickup) * (1+0.45*L) * (1+0.12*P)`
// can move the last bits of a stat, and a scout who moves a ten thousandth of
// a unit differently kills a squirrel one frame later. With no items the
// composition is (base + 0) * 1 * 1, and both of those are exact identities in
// IEEE754, so a build with no items reproduces the shipped numbers bit for
// bit. That is what makes the seeded run comparison meaningful.
'use strict';

const Stats = (function () {

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ------------------------------------------------------------------ magnitudes

  // What one rank of each shipped patch is worth. These were literals inside
  // recalc(); they are here so there is one copy and the dev overlay can tune
  // the live number instead of mirroring the formula that reads it.
  const PATCH_MAG = {
    trailmix: 0.12,    // damage multiplier per level
    boots: 0.10,       // move speed multiplier per level
    whistle: 0.91,     // weapon cooldown base, per level exponent (lower is faster)
    skillet: 2,        // flat armour per level
    lodestone: 0.45,   // pickup radius multiplier per level
    fieldguide: 0.15,  // badge XP multiplier per level
    rabbitfoot: 0.08,  // crit chance points per level
    firstaid: 0.6,     // HP regenerated per second, per level
  };

  // The badge board's per rank numbers, the same literals from the same
  // function, for the same reason.
  const BOARD_MAG = {
    sharp: 0.05,     // damage multiplier per rank
    swift: 0.04,     // move speed multiplier per rank
    grit: 1,         // flat armour per rank
    packrat: 0.12,   // pickup radius multiplier per rank
    scholar: 0.08,   // badge XP multiplier per rank
    hearty: 12,      // max health per rank, spent at construction
  };

  // C13: nothing a weapon or an item does reaches past 455 world units, which
  // is the horizontal half view at the reference resolution and therefore what
  // makes "nothing on screen is out of range" a true sentence. The longest
  // shipped weapon is the boomerang at 380, so this is a fence against Reach,
  // not a limit anything hits today.
  const RANGE_CAP = 455;

  // CORRECTION 2 (BUILD_ARCHITECTURE.md 4.3). Dodge Recharge is bounded on the
  // invulnerability uptime it RESULTS IN, per scout, never on a multiplier.
  // Measured with no items: Junie runs 2 charges * 0.24s of window / 0.8s of
  // recharge = 0.60 uptime, Max 1 * 0.30 / 1.0 = 0.30, Gus 1 * 0.34 / 1.4 =
  // 0.243. One 2.50x ceiling means three different things across those three,
  // and on Junie it means 1.50 uptime, which is permanently untouchable. So
  // the cap is on the uptime and the multiplier is computed backwards from it.
  const UPTIME_CAP = 0.75;

  // The legacy hidden area term. attackScale() has always multiplied
  // projectile radii, blast radii and the axe's reach by this, so damage has
  // silently grown your area up to 2.3x since the game shipped and nobody
  // wrote it down. It is folded into the Area stat as a BASE CONTRIBUTION
  // rather than deleted: deleting it is a silent nerf to every damage build
  // that exists, and on the hatchet specifically it is a shorter axe, because
  // the swing's reach reads `st.range * (0.8 + scale * 0.25)`.
  const AREA_LEGACY_MIN = 0.9;
  const AREA_LEGACY_MAX = 2.3;

  // ------------------------------------------------------------------ the block

  // law: 'hyper' climbs the hyperbolic total toward max. 'int' adds a fixed
  //      integer per stack up to the cap. 'cd' is Attack Speed, which the
  //      engine reads as a cooldown multiplier (see cdMul below).
  // d1:  what the first stack is worth, in the stat's own units.
  // d1f: the same thing as a FRACTION of the headroom, for the two stats whose
  //      headroom is per scout and where an absolute number would mean
  //      something different to each of them.
  const SPEC = {
    damage:         { name: 'Damage',          law: 'hyper', min: 0.50, max: 6.00, d1: 0.15,  fmt: 'mul' },
    attackSpeed:    { name: 'Attack Speed',    law: 'hyper', min: 1.00, max: 3.00, d1: 0.12,  fmt: 'mul' },
    area:           { name: 'Area',            law: 'hyper', min: 0.60, max: 4.00, d1: 0.15,  fmt: 'mul' },
    extraShots:     { name: 'Extra Shots',     law: 'int',   min: 0,    max: 6,    per: 1,    fmt: 'int' },
    reach:          { name: 'Reach',           law: 'hyper', min: 0.70, max: 2.50, d1: 0.10,  fmt: 'mul' },
    pierce:         { name: 'Pierce',          law: 'int',   min: 0,    max: 8,    per: 1,    fmt: 'int' },
    critChance:     { name: 'Crit Chance',     law: 'hyper', min: 0.00, max: 1.00, d1: 0.06,  fmt: 'pct' },
    critDamage:     { name: 'Crit Damage',     law: 'hyper', min: 1.50, max: 6.00, d1: 0.25,  fmt: 'mul' },
    effectDuration: { name: 'Effect Duration', law: 'hyper', min: 0.50, max: 3.00, d1: 0.15,  fmt: 'mul' },
    force:          { name: 'Force',           law: 'hyper', min: 0.00, max: 3.00, d1: 0.15,  fmt: 'mul' },
    maxHealth:      { name: 'Max Health',      law: 'int',   min: 40,   max: 600,  per: 10,   fmt: 'int' },
    armourFlat:     { name: 'Armour',          law: 'int',   min: 0,    max: 12,   per: 1,    fmt: 'int' },
    armourPct:      { name: 'Armour Percent',  law: 'hyper', min: 0.00, max: 0.60, d1: 0.06,  fmt: 'pct' },
    regen:          { name: 'Regeneration',    law: 'hyper', min: 0.0,  max: 12.0, d1: 0.6,   fmt: 'rate' },
    moveSpeed:      { name: 'Move Speed',      law: 'hyper', min: 132,  max: 340,  d1: 14,    fmt: 'int' },
    dodgeRecharge:  { name: 'Dodge Recharge',  law: 'hyper', min: 1.00, max: 2.50, d1f: 0.10, fmt: 'mul' },
    pickupRadius:   { name: 'Pickup Radius',   law: 'hyper', min: 65,   max: 420,  d1: 22,    fmt: 'int' },
    badgeXP:        { name: 'Badge XP',        law: 'hyper', min: 1.00, max: 2.20, d1: 0.10,  fmt: 'mul' },
    luck:           { name: 'Luck',            law: 'int',   min: 0,    max: 20,   per: 1,    fmt: 'int' },
  };

  // The order the block is built and displayed in. Nineteen, not eighteen:
  // CORRECTION 1 splits armour into a flat row and a percentage row, because
  // converting the flat term to a percentage is a silent nerf no automated
  // gate would catch. See armourFlat below.
  const KEYS = [
    'damage', 'attackSpeed', 'area', 'extraShots', 'reach', 'pierce',
    'critChance', 'critDamage', 'effectDuration', 'force',
    'maxHealth', 'armourFlat', 'armourPct', 'regen', 'moveSpeed',
    'dodgeRecharge', 'pickupRadius', 'badgeXP', 'luck',
  ];

  // ------------------------------------------------------------------ per scout

  const DEFAULT_DODGE = { spd: 620, dur: 0.17, iframe: 0.30, cd: 1.05, charges: 1 };

  // A scout's invulnerability uptime with no items: what fraction of the time
  // the dodge alone can keep them untouchable.
  function baseUptime(char) {
    const d = (char && char.dodge) || DEFAULT_DODGE;
    const charges = Math.max(1, d.charges || 1);
    const iframe = d.iframe || 0;
    const cd = d.cd || 1;
    if (cd <= 0) return 1;
    return charges * iframe / cd;
  }

  // The Dodge Recharge ceiling FOR THIS SCOUT: whatever multiplier lands them
  // exactly on the uptime cap, never a shared 2.50x. Junie starts at 0.60
  // uptime so hers is 1.25; Gus starts at 0.243 so his is 3.09. Floored at 1.0
  // so a scout who somehow already exceeds the cap simply gains nothing rather
  // than being handed a multiplier below one.
  function dodgeMax(char) {
    const u0 = baseUptime(char);
    if (!(u0 > 0)) return SPEC.dodgeRecharge.max;
    return Math.max(1, UPTIME_CAP / u0);
  }

  // What a given recharge multiplier actually buys, as uptime. This is the
  // number the cap is written against, and the one a verification pass reads.
  function dodgeUptime(char, recharge) {
    return baseUptime(char) * (recharge > 0 ? recharge : 1);
  }

  // The bases and bounds for one scout, resolved once. Everything downstream
  // (total, delta, clampTo, compute) takes this rather than a character, so a
  // second scout is a second frame and never a second copy of the table.
  function frame(char, passives, rank) {
    const c = char || {};
    const p = passives || {};
    const lv = id => p[id] || 0;
    const rk = typeof rank === 'function' ? rank : function () { return 0; };
    const M = PATCH_MAG, B = BOARD_MAG;

    // EVERY EXPRESSION BELOW IS THE SHIPPED ONE, VERBATIM, in the shipped
    // order. See the file header for why the association is not touched.
    const base = {
      damage: (1 + c.dmg) * (1 + M.trailmix * lv('trailmix')) * (1 + B.sharp * rk('sharp')),
      attackSpeed: 1,   // see cdBase: the engine reads this stat as a cooldown
      area: 1,
      extraShots: 0,
      reach: 1,
      pierce: 0,
      critChance: c.crit + M.rabbitfoot * lv('rabbitfoot'),
      critDamage: 2,
      effectDuration: 1,
      force: 1,
      maxHealth: c.hp + B.hearty * rk('hearty'),
      armourFlat: c.armor + M.skillet * lv('skillet') + B.grit * rk('grit'),
      armourPct: 0,
      regen: M.firstaid * lv('firstaid'),
      moveSpeed: c.speed * (1 + M.boots * lv('boots')) * (1 + B.swift * rk('swift')),
      dodgeRecharge: 1,
      pickupRadius: 65 * (1 + c.pickup) * (1 + M.lodestone * lv('lodestone')) * (1 + B.packrat * rk('packrat')),
      badgeXP: (1 + M.fieldguide * lv('fieldguide')) * (1 + B.scholar * rk('scholar')),
      luck: 0,
    };

    // The weapon cooldown multiplier, verbatim. Attack Speed is this number
    // upside down, and the engine keeps the cooldown form because that is the
    // form the shipped expression is written in: inverting it and inverting it
    // back is NOT bit exact (1 / 0.91^-1 is 0.9100000000000001, not 0.91), and
    // that difference is enough to move a weapon's fire frame.
    const cdBase = Math.pow(M.whistle, lv('whistle'));

    const bounds = {};
    for (const k of KEYS) bounds[k] = { min: SPEC[k].min, max: SPEC[k].max };
    bounds.dodgeRecharge.max = dodgeMax(c);

    return { char: c, base, cdBase, bounds, uptime0: baseUptime(c) };
  }

  // ------------------------------------------------------------------ the curve

  function headroom(key, fr) {
    const b = (fr && fr.bounds && fr.bounds[key]) || SPEC[key];
    const base = (fr && fr.base && fr.base[key] !== undefined) ? fr.base[key] : SPEC[key].min;
    return Math.max(0, b.max - base);
  }

  // THE FIRST STACK, in the stat's own units. Absolute where an absolute
  // number means the same thing to every scout, a fraction of the headroom
  // where it does not.
  function firstStep(key, fr) {
    const s = SPEC[key];
    const span = headroom(key, fr);
    if (s.d1f !== undefined) return span * s.d1f;
    return Math.min(s.d1, span * 0.9);
  }

  // THE ONE FUNCTION THAT TURNS A STACK COUNT INTO A VALUE. Nothing else in
  // the game is allowed to compute this, and delta() below is the only way to
  // ask what one more pick is worth.
  function total(key, n, fr) {
    const s = SPEC[key];
    if (!s || !(n > 0)) return 0;
    const span = headroom(key, fr);
    if (span <= 0) return 0;
    if (s.law === 'int') return Math.min(span, s.per * n);
    const d1 = firstStep(key, fr);
    if (!(d1 > 0)) return 0;
    // a is derived so that total(1) === d1 exactly. The quotient is strictly
    // below 1 for every finite n, so the total is strictly below the span:
    // bounded by construction, not by a clamp that has to remember to run.
    const a = d1 / (span - d1);
    const an = a * n;
    return span * an / (1 + an);
  }

  // THE ONE FUNCTION THAT TURNS A STACK COUNT INTO A CARD'S PRINTED NUMBER.
  // A card showing a stored per step number and a character carrying a
  // hyperbolic total are two representations of one thing, and they drift.
  function delta(key, n, fr) {
    return total(key, (n | 0) + 1, fr) - total(key, n | 0, fr);
  }

  function clampTo(key, v, fr) {
    const b = (fr && fr.bounds && fr.bounds[key]) || SPEC[key];
    return clamp(v, b.min, b.max);
  }

  // ------------------------------------------------------------------ compose

  // final = (base + FLAT + stacks) * (1 + PCT) * MULT, clamped.
  //
  // With no items every term is its identity, and (x + 0) * 1 * 1 === x in
  // IEEE754, so this returns the shipped number unchanged rather than a number
  // that rounds to it.
  function composeOne(key, fr, g) {
    const base = fr.base[key] !== undefined ? fr.base[key] : 0;
    const flat = g && g.flat && g.flat[key] ? g.flat[key] : 0;
    const pct = g && g.pct && g.pct[key] ? g.pct[key] : 0;
    const mult = g && g.mult && g.mult[key] !== undefined ? g.mult[key] : 1;
    const n = g && g.stacks && g.stacks[key] ? g.stacks[key] : 0;
    const stacked = n > 0 ? total(key, n, fr) : 0;
    return clampTo(key, (base + flat + stacked) * (1 + pct) * mult, fr);
  }

  // An empty grant set. Items author into this in wave 3; today it is what
  // makes "no items" a real, tested state rather than a special case.
  function grants() {
    return { flat: {}, pct: {}, mult: {}, stacks: {} };
  }

  // THE WHOLE BLOCK. One object per scout, rebuilt when the build changes and
  // never per frame.
  function compute(fr, g) {
    const out = {};
    for (const k of KEYS) out[k] = composeOne(k, fr, g);

    // Attack Speed is stored twice on purpose, in the two units the two
    // readers want. cdMul is what the weapon timer multiplies its cooldown by
    // and is the SHIPPED expression divided by whatever the items bought;
    // dividing by exactly 1 is exact, so a build with no items gets the
    // shipped cooldown to the last bit. attackSpeed is the number a player
    // reads, and it is derived from cdMul rather than beside it, so the two
    // can never disagree.
    const gain = out.attackSpeed;
    const cdMin = 1 / SPEC.attackSpeed.max;
    const cdMax = 1 / SPEC.attackSpeed.min;
    out.cdMul = clamp(fr.cdBase / gain, cdMin, cdMax);
    out.attackSpeed = 1 / out.cdMul;

    // Max health is not recomputed from the block: it accumulates during a
    // night (two per rank up, ten from a supply patch) and recomputing would
    // throw that away. The block owns its BOUNDS and game.js spends them
    // through addMaxHp, so the cap is real without the value being rebuilt.
    out.maxHealth = clampTo('maxHealth', fr.base.maxHealth, fr);
    return out;
  }

  // ------------------------------------------------------------------ consumers

  // The composed attack scale for one weapon. THE LEGACY TERM IS THE BASE:
  // damage and weapon level fatten every projectile exactly as they always
  // have, and the Area stat multiplies that, with the Area bounds applied to
  // the product so a maxed Area cannot hand out a nine times fireball.
  //
  // Measured, with an identical damage build: Gus at hatchet level 1 with no
  // patches gets 0.9 here and an 86.1 unit swing, and Max, whose ten percent
  // damage is baked into his character row, gets 0.965 and 87.465. Those are
  // the numbers this function has to keep returning.
  function attackScale(area, dmgMul, lvl) {
    const legacy = clamp(0.9 + (dmgMul - 1) * 0.65 + ((lvl || 1) - 1) * 0.09, AREA_LEGACY_MIN, AREA_LEGACY_MAX);
    return clamp(legacy * (area > 0 ? area : 1), SPEC.area.min, SPEC.area.max);
  }

  // Reach, applied to a weapon's own reach number, with C13's fence on top.
  function reachOf(range, reach) {
    return Math.min(RANGE_CAP, range * (reach > 0 ? reach : 1));
  }

  // What a hit costs after armour. CORRECTION 1, and the ORDER here is the
  // whole correction: the flat term subtracts FIRST, so the 1 damage floor
  // still catches every chaff body in the table, and the percentage scales
  // whatever survives that subtraction, so a late armour pick is not dead
  // against a boss. Measured on a maxed Gus (2 from his row, 6 from three
  // Skillet ranks, 3 from three Camp Grit ranks, 11 flat): every one of the
  // twelve small bodies in DATA.enemies lands on 1, which is the entire reason
  // he can stand still in a crowd.
  function damageTaken(dmg, armourFlat, armourPct) {
    return Math.max(1, Math.round((dmg - armourFlat) * (1 - armourPct)));
  }

  // ------------------------------------------------------------------ display

  function format(key, v) {
    const s = SPEC[key];
    if (!s) return String(v);
    if (s.fmt === 'pct') return Math.round(v * 100) + '%';
    if (s.fmt === 'mul') return Math.round(v * 100) + '%';
    if (s.fmt === 'rate') return v.toFixed(1) + '/s';
    return String(Math.round(v));
  }

  // What one more stack prints on a card. The delta, formatted, from the one
  // place that knows the curve.
  function deltaText(key, n, fr) {
    const d = delta(key, n, fr);
    const s = SPEC[key];
    if (s.fmt === 'pct' || s.fmt === 'mul') return '+' + (d * 100).toFixed(d * 100 < 10 ? 1 : 0) + '%';
    if (s.fmt === 'rate') return '+' + d.toFixed(2) + '/s';
    return '+' + (Math.abs(d) < 1 ? d.toFixed(2) : Math.round(d));
  }

  // Whether a card would land on nothing. RULE 6 of the pool gating ruleset:
  // the offer builder refuses any card whose applied effect after clamping
  // would be zero, and flat armour is that bug in a different costume.
  function isDead(key, fr, g) {
    const before = composeOne(key, fr, g);
    const n = (g && g.stacks && g.stacks[key]) ? g.stacks[key] : 0;
    const probe = { flat: g && g.flat, pct: g && g.pct, mult: g && g.mult, stacks: {} };
    if (g && g.stacks) for (const k in g.stacks) probe.stacks[k] = g.stacks[k];
    probe.stacks[key] = n + 1;
    return composeOne(key, fr, probe) === before;
  }

  return {
    KEYS, SPEC, PATCH_MAG, BOARD_MAG,
    RANGE_CAP, UPTIME_CAP, DEFAULT_DODGE,
    frame, grants, compute, composeOne,
    total, delta, deltaText, clampTo, headroom, firstStep, format, isDead,
    attackScale, reachOf, damageTaken,
    baseUptime, dodgeMax, dodgeUptime,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Stats;
