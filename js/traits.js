// Merit Badge Massacre 3.0: the trait substrate.
//
// THE IDEA. In 2.0 a weapon owned its behaviour: the slingshot knew about
// pierce because someone wrote pierce into the slingshot. That does not
// scale. Every new combination is a new branch, and a catalogue of a hundred
// items becomes a catalogue of ten thousand branches nobody can hold in one
// head.
//
// So traits live on the PROJECTILE, not on the weapon. A shot carries a set
// of small trait objects; the update loop walks that set in a fixed order;
// combinations fall out of the walk instead of being written down. An item
// that says "every shot pierces and chains" is two lines of data, and it is
// automatically correct on the slingshot, the roaster, the boomerang, and on
// every weapon that has not been designed yet.
//
// TWO VOCABULARIES, ONE SHAPE. Shot traits ride projectiles. Dash traits
// ride the dodge roll (a whole planned build archetype), and they use the
// same authoring shape with their own hooks. Both are closed vocabularies:
// an item composes what is here, it does not add verbs.
//
// THREE RULES THIS FILE IS WRITTEN AGAINST, from COOP_DESIGN.md section 10,
// applied now because applying them after ninety six items exist is not free:
//
//   C5. A hit registry is a set of IDS, never a set of objects. Every
//       exclusion set here (a shot's own hit record, chain's seen list, a
//       dash's contact record) holds e.eid. An object set cannot be written
//       to a save, cannot attribute damage and cannot credit a kill.
//   C6. Nothing in here reads g.player. A projectile knows who fired it
//       (s.owner, stamped by Game.armShot, which is the single door), and
//       orbit flies home to THAT scout rather than to the one the Game
//       happens to call "the player".
//   C7. Nothing in here reads META, the wall clock, the window size or
//       Math.random. Randomness comes from g.rng(), the simulation's own
//       stream, so a replay and a desync check have one place to seed.
//
// A NOTE ON queryEnemies. game.js queryEnemies returns a SHARED scratch
// buffer (this._qbuf). updateShots is iterating that buffer at the exact
// moment a trait's onHit runs, so a trait that called queryEnemies would
// clobber the list being walked and drop hits. Every search in this file is
// therefore a plain linear scan of g.enemies. At the counts this game runs
// (tens of bodies, tens of shots) that is cheaper than the bug.
'use strict';

const Traits = (function () {

  const PI = Math.PI;
  const TWO_PI = PI * 2;

  // The set every shot gets when nothing has granted anything. One frozen
  // array shared by every projectile in the game, so the default path costs
  // no allocation and `s.traits.length === 0` is the whole test.
  const NONE = Object.freeze([]);

  // ---------------------------------------------------------------- helpers

  function num(v, dflt) { return typeof v === 'number' && v === v ? v : dflt; }

  // The simulation's random stream. Everything in this file draws from here
  // rather than from Math.random, so the item surface has exactly one seam a
  // seeded replay has to seed (C7).
  function rnd(g) { return g.rng(); }
  function rrange(g, a, b) { return a + g.rng() * (b - a); }

  // Nearest living body, skipping props, one named id, and anything already
  // in a Set of excluded ids. Linear on purpose: see the note at the top.
  function nearest(g, x, y, range, skipId, excludeIds) {
    const list = g.enemies;
    let best = null;
    let bd = range * range;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.prop || e.eid === skipId) continue;
      if (excludeIds !== null && excludeIds !== undefined && excludeIds.has(e.eid)) continue;
      const dx = e.x - x, dy = e.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  }

  // Turn a projectile's velocity toward a point, at most `turn` radians this
  // frame, preserving speed. Shots that do not carry a velocity (the
  // boomerang steers itself) are left alone.
  function steer(s, tx, ty, turn, dt) {
    const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (sp < 0.001) return;
    const cur = Math.atan2(s.vy, s.vx);
    let d = Math.atan2(ty - s.y, tx - s.x) - cur;
    while (d > PI) d -= TWO_PI;
    while (d < -PI) d += TWO_PI;
    const max = turn * dt;
    if (d > max) d = max; else if (d < -max) d = -max;
    const a = cur + d;
    s.vx = Math.cos(a) * sp;
    s.vy = Math.sin(a) * sp;
  }

  // Bodies near a point, as the DASH sees them.
  //
  // This is deliberately not the linear scan above. game.js runs
  // rebuildGrid() AFTER updateDodge, so a queryEnemies call made from inside
  // a dash reads the PREVIOUS frame's grid, and it tests against radius plus
  // the body's own radius. That is what Junie's burn trail and Gus's barge
  // have always seen. Reproducing it exactly is the difference between a
  // refactor that is provably identical and one that merely looks it.
  //
  // The result is copied out first, because queryEnemies hands the same
  // scratch buffer to every caller and a trait is going to call other engine
  // code while it walks the list.
  function gridNear(g, x, y, r, includeProps) {
    const src = g.queryEnemies(x, y, r, includeProps);
    const dst = g._dashBuf || (g._dashBuf = []);
    dst.length = 0;
    for (let i = 0; i < src.length; i++) dst.push(src[i]);
    return dst;
  }

  // Trail sampling for the derived visuals. A flat ring buffer allocated once
  // when the shot is armed, never per frame.
  function sampleTrail(s) {
    const buf = s.trailBuf;
    if (buf === undefined || buf === null) return;
    const cap = buf.length >> 1;
    buf[s.trailHead * 2] = s.x;
    buf[s.trailHead * 2 + 1] = s.y;
    s.trailHead = (s.trailHead + 1) % cap;
    if (s.trailN < cap) s.trailN++;
  }

  // ============================================================ SHOT TRAITS

  // Each trait is a small object with:
  //   scope    'shot' needs a projectile to mean anything, 'any' fires on
  //            every point of player damage including melee, auras and blasts
  //   apply    (g, s, cfg)          once, when the shot is armed
  //   update   (g, s, cfg, dt)      every frame, BEFORE the shot integrates
  //   onHit    (g, s, cfg, e, dmg)  when damage lands; return true to keep a
  //                                 shot that would otherwise be spent
  //   onExpire (g, s, cfg)          when the shot's life runs out
  //   vis      (out, cfg)           folds this trait into the visual
  //                                 descriptor the renderer reads
  // Every hook is optional.

  const SHOT = {};

  // ---- giant: bigger, and it hits like it looks -------------------------
  SHOT.giant = {
    scope: 'shot',
    apply(g, s, c) {
      const k = num(c.scale, 1.7);
      s.r *= k;
      s.dmg *= num(c.dmg, 1 + (k - 1) * 0.8);
      s.giant = (s.giant || 1) * k;
    },
    vis(out, c) { out.bulk = Math.max(out.bulk, num(c.scale, 1.7) - 1); },
  };

  // ---- seek: a soft drift toward whatever is nearest right now ----------
  // No lock. It leans at the closest body every frame, so a seeking shot
  // wanders through a crowd rather than committing to one target.
  SHOT.seek = {
    scope: 'shot',
    update(g, s, c, dt) {
      if (s.vx === undefined) return;
      const tgt = nearest(g, s.x, s.y, num(c.range, 300), -1, s.hit);
      if (tgt === null) return;
      steer(s, tgt.x, tgt.y, num(c.turn, 2.2), dt);
    },
    vis(out) { out.trail = Math.max(out.trail, 4); },
  };

  // ---- homing: acquires a target and stays on it ------------------------
  // s.homeT is a live body reference rather than an id, and it is the one
  // exception in this file. It is not a registry: it is one steering target
  // read every frame by every homing shot in the air, and resolving an id
  // back to a body would put a linear scan of g.enemies on that path for
  // nothing. Nothing is ever written to a save from it.
  SHOT.homing = {
    scope: 'shot',
    apply(g, s) { s.homeT = null; },
    update(g, s, c, dt) {
      if (s.vx === undefined) return;
      let t = s.homeT;
      if (t === null || t === undefined || t.dead) {
        t = nearest(g, s.x, s.y, num(c.range, 260), -1, s.hit);
        s.homeT = t;
      }
      if (t === null) return;
      steer(s, t.x, t.y, num(c.turn, 6.5), dt);
    },
    vis(out) { out.trail = Math.max(out.trail, 7); },
  };

  // ---- orbit: out to a distance, then home, like the boomerang ----------
  // A boomerang already does this in its own branch of updateShots, so on a
  // boomer this trait stands down rather than fighting it. That is the only
  // kind-awareness anywhere in this file, and it is a no-op, not a special
  // case: the trait simply has nothing to add.
  //
  // It flies home to s.owner, the scout Game.armShot stamped on it, and not
  // to g.player (C6). In a party of four, four orbiting shots go four
  // different ways and no line here had to learn that.
  SHOT.orbit = {
    scope: 'shot',
    update(g, s, c, dt) {
      if (s.vx === undefined) return;
      const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (sp < 0.001) return;
      if (s.orbBack === true) {
        const p = s.owner;
        if (p === undefined || p === null) return;
        const dx = p.x - s.x, dy = p.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        s.vx = dx / d * sp;
        s.vy = dy / d * sp;
        if (d < 26) s.life = 0;
        return;
      }
      s.orbTrav = (s.orbTrav || 0) + sp * dt;
      if (s.orbTrav >= num(c.range, 220)) {
        s.orbBack = true;
        s.life = Math.max(s.life, 3);
        if (s.hit !== undefined && s.hit !== null) s.hit.clear();
      }
    },
    vis(out) { out.trail = Math.max(out.trail, 5); },
  };

  // ---- ricochet: off the walls -----------------------------------------
  // Runs in update, which fires BEFORE the shot integrates, so the bounce
  // happens on the frame the shot would have entered the wall and the main
  // loop's blocked-cell check never sees it. No fifth hook needed.
  SHOT.ricochet = {
    scope: 'shot',
    apply(g, s, c) { s.ricoN = (s.ricoN || 0) + num(c.n, 2); },
    update(g, s, c, dt) {
      if (s.vx === undefined || s.ricoN <= 0 || !g.room) return;
      const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (!Collide.blockedAt(g.room, nx, ny)) return;
      const bx = Collide.blockedAt(g.room, nx, s.y);
      const by = Collide.blockedAt(g.room, s.x, ny);
      if (bx && !by) s.vx = -s.vx;
      else if (by && !bx) s.vy = -s.vy;
      else { s.vx = -s.vx; s.vy = -s.vy; }
      s.ricoN--;
      s.life = Math.max(s.life, num(c.life, 0.6));
      g.spawnBurst(nx, ny, '#cfc9b8', 3);
    },
  };

  // ---- bounce: off the bodies ------------------------------------------
  // Where pierce spends a charge to pass THROUGH, bounce spends one to turn
  // and go after somebody else.
  SHOT.bounce = {
    scope: 'shot',
    apply(g, s, c) { s.bounceN = (s.bounceN || 0) + num(c.n, 2); },
    onHit(g, s, c, e) {
      if (s.bounceN <= 0 || s.vx === undefined) return false;
      const next = nearest(g, s.x, s.y, num(c.range, 170), e.eid, s.hit);
      if (next === null) return false;
      const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
      const dx = next.x - s.x, dy = next.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      s.vx = dx / d * sp;
      s.vy = dy / d * sp;
      s.bounceN--;
      s.life = Math.max(s.life, num(c.life, 0.8));
      return true;
    },
  };

  // ---- pierce: passes through ------------------------------------------
  // Folds straight into the s.pierce field updateShots has always read, so a
  // trait-granted pierce and a slingshot's own level 3 pierce are the same
  // number and stack without either knowing about the other.
  SHOT.pierce = {
    scope: 'shot',
    apply(g, s, c) { s.pierce = (s.pierce || 0) + num(c.n, 1); },
  };

  // ---- chain: arcs to a second body -------------------------------------
  // Scope 'any', so it fires off a hand axe chop and a bugle blast as
  // readily as off a stone. Its own damage is dealt with noTraits so an
  // arc cannot arc.
  SHOT.chain = {
    scope: 'any',
    onHit(g, s, c, e, dmg) {
      const jumps = num(c.jumps, 1);
      const range = num(c.range, 150);
      const fall = num(c.falloff, 0.6);
      let fx = e.x, fy = e.y;
      let power = dmg * fall;
      const seen = g._chainSet;
      seen.clear();
      seen.add(e.eid);
      const owner = (s !== null && s !== undefined) ? s.owner : null;
      for (let j = 0; j < jumps; j++) {
        const t = nearest(g, fx, fy, range, -1, seen);
        if (t === null) break;
        seen.add(t.eid);
        g.parts.push({
          kind: 'arc', x: fx, y: fy, x2: t.x, y2: t.y,
          t: 0, life: 0.16, color: c.color || '150,220,255',
        });
        // Raw damage: dealDamage multiplies by dmgMul, and the hit that
        // spawned this arc was already scaled, so hand it the base share.
        g.dealDamage(t, power / (g.dmgMul || 1), {
          knock: 0, quiet: true, small: true, noTraits: true,
          color: '#96dcff', fx: fx, fy: fy, owner: owner,
        });
        fx = t.x; fy = t.y;
        power *= fall;
      }
      return false;
    },
    vis(out) { out.arc = true; },
  };

  // ---- split: becomes several ------------------------------------------
  // on: 'hit' or 'expire'. gen caps the recursion: a child is armed with the
  // same set minus one generation, and at zero the burst does nothing, so a
  // split cannot run away.
  SHOT.split = {
    scope: 'shot',
    apply(g, s, c) { if (s.gen === undefined) s.gen = num(c.gen, 1); },
    onHit(g, s, c, e) {
      if (c.on === 'expire') return false;
      burst(g, s, c);
      return false;
    },
    onExpire(g, s, c) {
      if (c.on !== 'expire') return;
      burst(g, s, c);
    },
    vis(out) { out.split = true; },
  };

  function burst(g, s, c) {
    if (s.gen <= 0) return;
    if (g.shots.length > 300) return;
    const n = num(c.n, 3);
    const spread = num(c.spread, 1.1);
    const dmgK = num(c.dmg, 0.55);
    const spK = num(c.speed, 0.9);
    // The heading a child leaves on: the parent's, or its aim if it never
    // carried a velocity (a boomerang splitting on the way home).
    let base;
    let sp;
    if (s.vx !== undefined) {
      base = Math.atan2(s.vy, s.vx);
      sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) * spK;
    } else if (s.dirx !== undefined) {
      base = Math.atan2(s.diry, s.dirx);
      sp = (s.speed || 300) * spK;
    } else {
      base = rnd(g) * TWO_PI;
      sp = 260 * spK;
    }
    if (sp < 40) sp = 40;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread / Math.max(1, n - 1) * 2;
      const child = {
        kind: s.kind === 'boomer' ? 'pebble' : s.kind,
        x: s.x, y: s.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: s.dmg * dmgK,
        r: Math.max(2.5, (s.r || 5) * num(c.size, 0.75)),
        life: num(c.life, 0.85),
        pierce: 0,
        gen: s.gen - 1,
        burnDps: s.burnDps, burnDur: s.burnDur,
      };
      if (child.kind === 'flame') child.maxlife = child.life;
      // A child belongs to whoever fired the parent, so its kills are that
      // scout's kills and its own children inherit the same name.
      g.armShot(s.owner, child, s.traits);
      g.shots.push(child);
    }
  }

  // ---- burn ------------------------------------------------------------
  SHOT.burn = {
    scope: 'any',
    // A burning projectile sheds embers as it flies. The emission lives here
    // rather than in the renderer because it changes the world: parts are
    // simulation state, and a field that looked different depending on
    // whether anything was drawn would be a bug waiting to be filed.
    update(g, s, c) {
      if (g.parts.length >= 420 || rnd(g) >= num(c.embers, 0.25)) return;
      const a = rnd(g) * TWO_PI, sp = 20 + rnd(g) * 40;
      g.parts.push({
        kind: 'ember', x: s.x, y: s.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        t: 0, life: 0.25 + rnd(g) * 0.2, size: 1.3 + rnd(g) * 1.1,
      });
    },
    onHit(g, s, c, e) {
      g.applyBurn(e, num(c.dps, 7), num(c.dur, 2.2));
      return false;
    },
    vis(out) { out.hot = true; },
  };

  // ---- freeze: a slow, on the field the director already reads ---------
  SHOT.freeze = {
    scope: 'any',
    onHit(g, s, c, e) {
      e.slowT = Math.max(e.slowT || 0, num(c.dur, 1.2));
      return false;
    },
    vis(out) { out.cold = true; },
  };

  // ---- rend: damage over time that is not fire -------------------------
  // Its own status fields, ticked with the others in director.updateEnemies,
  // so a rent body can also be a burning body.
  SHOT.rend = {
    scope: 'any',
    onHit(g, s, c, e) {
      e.rendDps = Math.max(e.rendDps || 0, num(c.dps, 6));
      e.rendT = Math.max(e.rendT || 0, num(c.dur, 3));
      if (e.rendTick === undefined) e.rendTick = 0;
      return false;
    },
    vis(out) { out.rend = true; },
  };

  // The pipeline. Movement and geometry settle first, then the response to
  // what was struck, then the hit budget, then anything derived from the
  // hit, then the statuses left behind. A set is sorted into this order once,
  // at compile time, so the walk is a plain indexed loop.
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

  // ================================================== THE STACKING POLICY

  // BUILD_ARCHITECTURE.md rule 8, quoted:
  //
  //   "accumulate (sum) for pierce, bounce, ricochet and extra shots;
  //    multiply for giant; take the max for burn damage, freeze duration,
  //    rend and chain jumps; single-instance for orbit, homing, seek and
  //    split, where a second grant raises the config parameter and never
  //    adds a second instance."
  //
  // WHY IT HAS TO BE HERE. A compiled set is walked once per frame and once
  // per hit, so two entries of the same trait id run the hook twice. In a
  // slot architecture that is a corner case; in an unbounded ledger, two
  // grants of the same trait is certain. Split is the one that hurts: two
  // grants each call burst() and produce two batches of children per hit
  // behind nothing but the 300-live-shot guard, which is how a build eats a
  // 420 particle cap and a frame budget in the same second.
  //
  // So a compiled set holds AT MOST ONE entry per trait id, always, and the
  // table below is how two grants of one id become one. `keys` are the
  // fields folded by `mode`; every other number folds by max, because a
  // bigger radius or a longer life is the harmless reading and no trait in
  // the vocabulary is improved by shrinking. A string or a flag keeps the
  // FIRST grant's value: there is no meaningful maximum of 'hit' and
  // 'expire', and first-wins is the only rule a player can predict.
  //
  // 'one' folds exactly like 'max'. It is spelled differently because the
  // reason is different: max is a balance choice, one is a correctness
  // requirement.
  //
  // Extra shots is in the rule and not in this table on purpose: it is a
  // stat, not a trait, and it lands with the stat block in unit E3.
  const SHOT_STACK = {
    pierce:   { mode: 'sum', keys: ['n'] },
    bounce:   { mode: 'sum', keys: ['n'] },
    ricochet: { mode: 'sum', keys: ['n'] },
    giant:    { mode: 'mul', keys: ['scale', 'dmg'] },
    burn:     { mode: 'max' },
    freeze:   { mode: 'max' },
    rend:     { mode: 'max' },
    chain:    { mode: 'max' },
    orbit:    { mode: 'one' },
    homing:   { mode: 'one' },
    seek:     { mode: 'one' },
    split:    { mode: 'one' },
  };

  // The dash vocabulary is deduplicated too, with one exception that the
  // design document is explicit about: an item granting a frost trail must
  // land BESIDE Junie's fire rather than on top of it. So a trail is keyed
  // by its effect and two effects are two entries, while two frost trails
  // are still one. Everything else is one instance per id.
  const DASH_STACK = {
    trail: { mode: 'max', key: c => 'trail:' + (c.effect || 'burn') },
  };

  // ============================================================ DASH TRAITS

  // The dodge roll is the second surface an item can carry, and it is a
  // planned build archetype in its own right, so it gets a real vocabulary
  // rather than a pile of flags.
  //
  //   start (g, p, cfg, dash)      the dash is committed, before it moves
  //   step  (g, p, cfg, dash, dt)  every frame of the dash
  //   end   (g, p, cfg, dash)      the dash finished
  //
  // THE BOUNDARY RULE. A dash trait may switch off solid resolution (that is
  // what phase does), but nothing in this vocabulary can reach the bounds
  // clamp: dodge.js applies Collide.clampToBounds unconditionally, outside
  // the trait walk, on every frame of every dash. A locked room is the woods
  // deciding you stay, and no item overrules the woods.

  const DASH = {};

  // ---- phase: through the crowd, not through the walls ------------------
  DASH.phase = {
    start(g, p, c, dash) {
      dash.noSolids = true;
      // Untouchable for the whole roll, not just its opening window.
      p.dashI = Math.max(p.dashI, dash.dur + num(c.grace, 0.08));
    },
    step(g, p, c, dash, dt) {
      if (!(c.smash > 0)) return;
      const near = gridNear(g, p.x, p.y, num(c.r, 30), true);
      for (let i = 0; i < near.length; i++) {
        const pr = near[i];
        if (!pr.prop || !pr.def || !pr.def.breakable) continue;
        if (dash.hit.has(pr.eid)) continue;
        dash.hit.add(pr.eid);
        g.damageProp(pr, c.smash, {});
      }
    },
    end(g, p, c, dash) {
      // Skipping resolveCircle can finish the roll inside a boulder. One
      // push-out on the way back to normal physics, so phase can never leave
      // a scout stuck in the scenery.
      if (!g.room) return;
      const q = Collide.resolveCircle(p.x, p.y, p.r, g.room.solids);
      const b = Collide.clampToBounds(q.x, q.y, p.r, g.room.bounds);
      p.x = b.x; p.y = b.y;
    },
    vis(out) { out.ghost = true; },
  };

  // ---- trail: lay something in the lane --------------------------------
  // effect is 'burn', 'frost' or 'thorn'. This is what Junie's dodge has
  // always done, said in the vocabulary instead of in an if.
  DASH.trail = {
    step(g, p, c, dash, dt) {
      const eff = c.effect || 'burn';
      // The particle first and the bodies second, which is the order the
      // hand written version ran in. Nothing here would notice the swap
      // except a seeded replay, and a seeded replay is the point.
      if (g.parts.length < 420 && rnd(g) < num(c.rate, 0.3)) {
        const part = {
          kind: eff === 'frost' ? 'spark' : 'ember',
          x: p.x, y: p.y - 4,
          vx: rrange(g, -16, 16), vy: rrange(g, -16, 16),
          t: 0, life: rrange(g, 0.2, 0.4), size: rrange(g, 1.4, 2.4),
        };
        if (eff === 'frost') part.color = '#9fe4ff';
        else if (eff === 'thorn') part.color = '#c98cff';
        g.parts.push(part);
      }
      const near = gridNear(g, p.x, p.y, num(c.r, 26), false);
      for (let i = 0; i < near.length; i++) {
        const e = near[i];
        if (eff === 'burn') g.applyBurn(e, num(c.dps, 6), num(c.dur, 1.2));
        else if (eff === 'frost') e.slowT = Math.max(e.slowT || 0, num(c.dur, 1.2));
        else if (eff === 'thorn') {
          e.rendDps = Math.max(e.rendDps || 0, num(c.dps, 6));
          e.rendT = Math.max(e.rendT || 0, num(c.dur, 2));
          if (e.rendTick === undefined) e.rendTick = 0;
        }
      }
    },
  };

  // ---- mark: tagged on the way past, softer for everything after -------
  DASH.mark = {
    step(g, p, c, dash) {
      const near = gridNear(g, p.x, p.y, num(c.r, 34), false);
      for (let i = 0; i < near.length; i++) {
        near[i].markMul = num(c.mul, 1.35);
        near[i].markT = num(c.dur, 4);
      }
    },
  };

  // ---- reflect: their shot, their problem -------------------------------
  // A caught shell becomes a player projectile, which means it is armed with
  // the run's own shot traits on the way out. Nothing here knows that; it
  // falls out of going through armShot like everything else does, including
  // whose shot it now is: the scout who caught it.
  DASH.reflect = {
    step(g, p, c, dash) {
      const r = num(c.r, 40);
      const mul = num(c.dmg, 1.6);
      for (let i = g.eshots.length - 1; i >= 0; i--) {
        const s = g.eshots[i];
        const dx = s.x - p.x, dy = s.y - p.y;
        if (dx * dx + dy * dy > r * r) continue;
        g.eshots.splice(i, 1);
        const tgt = nearest(g, s.x, s.y, num(c.range, 420), -1, null);
        const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 260;
        let a;
        if (tgt !== null) a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        else a = Math.atan2(-s.vy, -s.vx);
        const shot = {
          kind: 'pebble', x: s.x, y: s.y,
          vx: Math.cos(a) * sp * 1.15, vy: Math.sin(a) * sp * 1.15,
          dmg: (s.dmg || 8) * mul, pierce: 0, r: Math.max(4, s.r || 5), life: 2,
        };
        g.armShot(p, shot, null);
        g.shots.push(shot);
        g.spawnBurst(s.x, s.y, '#f8d8f0', 6);
      }
    },
  };

  // ---- magnet: the loot comes with you ----------------------------------
  DASH.magnet = {
    step(g, p, c, dash) {
      const r = num(c.r, 190);
      const r2 = r * r;
      const gems = g.gems;
      for (let i = 0; i < gems.length; i++) {
        const gm = gems[i];
        const dx = gm.x - p.x, dy = gm.y - p.y;
        if (dx * dx + dy * dy <= r2) gm.attracted = true;
      }
      const pk = g.pickups;
      for (let i = 0; i < pk.length; i++) {
        const k = pk[i];
        const dx = p.x - k.x, dy = p.y - k.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2 || d2 < 1) continue;
        const d = Math.sqrt(d2);
        k.x += dx / d * num(c.pull, 3.2);
        k.y += dy / d * num(c.pull, 3.2);
      }
    },
  };

  // ---- decoy: something else to swing at --------------------------------
  // director.updateEnemies picks its target vector in exactly one place, and
  // that is the one line a decoy diverts.
  DASH.decoy = {
    end(g, p, c, dash) {
      g._decoy = {
        x: p.x, y: p.y,
        r: num(c.range, 260),
        life: num(c.life, 3),
        oid: p.eid,
        charId: g.charId,
        face: p.face,
      };
      g.parts.push({
        kind: 'ghost', x: p.x, y: p.y, charId: g.charId, face: p.face,
        t: 0, life: num(c.life, 3), alpha: 0.35,
      });
    },
  };

  // ---- barge: Gus, said in the vocabulary -------------------------------
  DASH.barge = {
    step(g, p, c, dash) {
      // One list, bodies and breakables together, exactly as the hand
      // written shoulder charge read it.
      const near = gridNear(g, p.x, p.y, num(c.r, 30), true);
      const pd = num(c.propDmg, 20);
      for (let i = 0; i < near.length; i++) {
        const e = near[i];
        if (dash.hit.has(e.eid)) continue;
        dash.hit.add(e.eid);
        if (e.prop) { g.damageProp(e, pd, {}); continue; }
        const d = Math.max(1, Math.hypot(e.x - p.x, e.y - p.y));
        e.kx += (e.x - p.x) / d * num(c.knock, 260);
        e.ky += (e.y - p.y) / d * num(c.knock, 260);
        if (!e.boss) e.stunT = Math.max(e.stunT || 0, num(c.stun, 0.3));
      }
    },
  };

  const DASH_ORDER = ['phase', 'magnet', 'reflect', 'barge', 'mark', 'trail', 'decoy'];

  // =========================================================== compilation

  function orderIndex(order, id) {
    const i = order.indexOf(id);
    return i === -1 ? 999 : i;
  }

  // Merge one grant into an accumulator that already holds another grant of
  // the same trait. Never touches either authored object: a config is shared
  // by every shot armed from a set, and writing to one would leak state
  // between unrelated shots and unrelated runs.
  function foldInto(into, add, rule) {
    const mode = rule.mode;
    const keys = rule.keys;
    for (const k in add) {
      if (k === 't') continue;
      const v = add[k];
      const cur = into[k];
      if (cur === undefined) { into[k] = v; continue; }
      if (typeof v !== 'number' || typeof cur !== 'number') continue;  // first wins
      const summed = (mode === 'sum' || mode === 'mul') && keys !== undefined && keys.indexOf(k) !== -1;
      if (!summed) { into[k] = Math.max(cur, v); continue; }
      into[k] = mode === 'sum' ? cur + v : cur * v;
    }
  }

  // Turn authored data into a walkable set. Validates ids, folds duplicate
  // grants of one trait under the stacking policy above, and sorts into
  // pipeline order. Compile once per grant, never per shot.
  function compile(list, defs, order, stack, dfltRule) {
    if (!list || !list.length) return NONE;
    const out = [];
    const seen = {};
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (!t || typeof t.t !== 'string') continue;
      if (defs[t.t] === undefined) {
        if (typeof console !== 'undefined') console.warn('Traits: unknown trait "' + t.t + '"');
        continue;
      }
      const rule = stack[t.t] || dfltRule;
      const key = rule.key === undefined ? t.t : rule.key(t);
      const at = seen[key];
      if (at === undefined) {
        seen[key] = out.length;
        out.push(t);
        continue;
      }
      // Second grant of this trait. Copy the first one out of the authored
      // data on the way, so the fold writes to a set-private object.
      const merged = Object.assign({}, out[at]);
      foldInto(merged, t, rule);
      out[at] = merged;
    }
    if (!out.length) return NONE;
    out.sort(function (a, b) { return orderIndex(order, a.t) - orderIndex(order, b.t); });
    return out;
  }

  // The visual descriptor. Every rule the renderer applies is derived from
  // the trait set, so a combination nobody anticipated still draws: giant
  // scales it, burn makes it hot, freeze makes it cold, homing gives it a
  // trail, chain flags its arcs. A shot that is giant and burning and frozen
  // draws as all three at once and needed no art to say so.
  function buildVis(set) {
    if (set === NONE || !set.length) return null;
    const out = { hot: false, cold: false, rend: false, arc: false, split: false, bulk: 0, trail: 0, ghost: false };
    let any = false;
    for (let i = 0; i < set.length; i++) {
      const d = SHOT[set[i].t] || DASH[set[i].t];
      if (d === undefined || d.vis === undefined) continue;
      d.vis(out, set[i]);
      any = true;
    }
    return any ? out : null;
  }

  const ONE_RULE = { mode: 'max' };

  return {
    NONE: NONE,
    SHOT: SHOT,
    DASH: DASH,
    SHOT_ORDER: SHOT_ORDER,
    DASH_ORDER: DASH_ORDER,
    SHOT_STACK: SHOT_STACK,

    compileShot(list) {
      const set = compile(list, SHOT, SHOT_ORDER, SHOT_STACK, ONE_RULE);
      if (set !== NONE && set.vis === undefined) {
        Object.defineProperty(set, 'vis', { value: buildVis(set), enumerable: false });
      }
      return set;
    },

    compileDash(list) { return compile(list, DASH, DASH_ORDER, DASH_STACK, ONE_RULE); },

    // Everything in a set whose scope is 'any': the traits that mean
    // something without a projectile, so a hand axe chop can burn.
    anyScope(set) {
      if (set === NONE || !set.length) return NONE;
      const out = [];
      for (let i = 0; i < set.length; i++) {
        const d = SHOT[set[i].t];
        if (d !== undefined && d.scope === 'any') out.push(set[i]);
      }
      if (!out.length) return NONE;
      Object.defineProperty(out, 'vis', { value: null, enumerable: false });
      return out;
    },

    // ------------------------------------------------------- shot pipeline

    // Arm a projectile: hang the set on it, fold in the visual descriptor,
    // run every apply hook in pipeline order. Called by Game.armShot, which
    // is the single door every projectile in the game comes through and the
    // one place a shot's owner id and entity id are stamped.
    arm(g, s, set) {
      s.traits = set;
      if (set === NONE || set.length === 0) return s;
      s.vis = set.vis || null;
      if (s.vis !== null && s.vis.trail > 0) {
        s.trailBuf = new Float32Array(s.vis.trail * 2);
        s.trailN = 0;
        s.trailHead = 0;
      }
      for (let i = 0; i < set.length; i++) {
        const d = SHOT[set[i].t];
        if (d !== undefined && d.apply !== undefined) d.apply(g, s, set[i]);
      }
      return s;
    },

    update(g, s, dt) {
      const set = s.traits;
      for (let i = 0; i < set.length; i++) {
        const d = SHOT[set[i].t];
        if (d !== undefined && d.update !== undefined) d.update(g, s, set[i], dt);
      }
      if (s.trailBuf !== undefined) sampleTrail(s);
    },

    // Damage landed. set is the shot's own traits when a projectile did it,
    // and the run's 'any' scope set when a chop, an aura or a blast did.
    // Returns true when some trait insists the projectile survives.
    hit(g, e, set, s, dmg) {
      let keep = false;
      const shot = s === undefined ? null : s;
      for (let i = 0; i < set.length; i++) {
        const t = set[i];
        const d = SHOT[t.t];
        if (d === undefined || d.onHit === undefined) continue;
        if (d.scope === 'shot' && shot === null) continue;
        if (d.onHit(g, shot, t, e, dmg) === true) keep = true;
      }
      return keep;
    },

    expire(g, s) {
      const set = s.traits;
      for (let i = 0; i < set.length; i++) {
        const d = SHOT[set[i].t];
        if (d !== undefined && d.onExpire !== undefined) d.onExpire(g, s, set[i]);
      }
    },

    // ------------------------------------------------------- dash pipeline

    dashStart(g, p, set, dash) {
      for (let i = 0; i < set.length; i++) {
        const d = DASH[set[i].t];
        if (d !== undefined && d.start !== undefined) d.start(g, p, set[i], dash);
      }
    },
    dashStep(g, p, set, dash, dt) {
      for (let i = 0; i < set.length; i++) {
        const d = DASH[set[i].t];
        if (d !== undefined && d.step !== undefined) d.step(g, p, set[i], dash, dt);
      }
    },
    dashEnd(g, p, set, dash) {
      for (let i = 0; i < set.length; i++) {
        const d = DASH[set[i].t];
        if (d !== undefined && d.end !== undefined) d.end(g, p, set[i], dash);
      }
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Traits;
