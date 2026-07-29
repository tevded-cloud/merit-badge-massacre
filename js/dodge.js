// Merit Badge Massacre: the dodge roll. readInput() already turns a key
// press into a single-frame p.in.dodge edge; this file spends it, owns the
// player's position for the length of the dash, and ticks the charge
// cooldowns every frame regardless of phase.
//
// 3.0: the dash is a first class item surface, not a fixed move.
//
//   1. onDodge fires the instant a dash is COMMITTED and BEFORE it moves an
//      inch, with a mutable options object. A handler can lengthen the roll,
//      widen the invulnerable window, redirect it, or wave it off entirely.
//      What comes back out of that emit is what integrates.
//   2. The dash carries a TRAIT SET, exactly as a projectile does, walked
//      every step by the same kind of pipeline. Junie's burn trail and Gus's
//      barge are entries in that vocabulary now rather than branches here.
//   3. THE BOUNDARY RULE. A trait may switch off solid resolution, which is
//      what phase does. Nothing can switch off the bounds clamp: it is
//      applied below, unconditionally, outside the trait walk, on every
//      frame of every dash. A locked room is the woods deciding you stay.
//
// Everything here reads the roll off the PLAYER, never off the Game: the
// charges, the trait set and the modifiers all come from p.build, so a
// second scout rolling in the same frame is a second build and not a second
// set of fields somewhere else (COOP_DESIGN.md C1). The roll's contact
// record is a set of entity ids for the same reason every other hit registry
// in the game now is (C5).
'use strict';

(function () {

  const DEFAULT_DODGE = { spd: 620, dur: 0.17, iframe: 0.30, cd: 1.05, charges: 1 };
  const NO_MODS = { charges: 0, cdMul: 1, distMul: 1, iframeAdd: 0 };

  function dodgeParams(game) {
    return (game.char && game.char.dodge) || DEFAULT_DODGE;
  }

  // A character authored before the dash vocabulary existed still works: the
  // old trail and barge flags compile into the traits that replaced them, so
  // nothing outside this file has to know the shape changed.
  function legacyTraits(params) {
    let out = null;
    if (params.trail === 'burn') {
      out = [{ t: 'trail', effect: 'burn', dps: 6, dur: 1.2, r: 26, rate: 0.3 }];
    }
    if (params.barge) {
      if (out === null) out = [];
      out.push({ t: 'barge', knock: 260, stun: 0.3, propDmg: 20, r: 30 });
    }
    return out;
  }

  // Everything riding this scout's dash: their own flavour plus whatever
  // their build has granted. Compiled when the build changes, not per dash.
  function dashSet(owner) {
    const s = owner.build && owner.build.dashTraits;
    return (s === undefined || s === null) ? Traits.NONE : s;
  }

  function dashMods(owner) {
    return (owner.build && owner.build.dashMods) || NO_MODS;
  }

  // DODGE RECHARGE (stat 15), and the correction that makes it safe. The
  // committed plan gave it one 2.50x ceiling for everybody. That ceiling means
  // three different things across the three scouts, because they do not start
  // level: with no items at all Junie already runs 2 charges * 0.24s of
  // invulnerability / 0.8s of recharge = 0.60 uptime, Max runs 0.30 and Gus
  // 0.243. At 2.50x Junie is at 1.50, which is not a fast dodge, it is being
  // permanently untouchable.
  //
  // So the bound is on the UPTIME, capped at 0.75, and the multiplier is
  // computed backwards from it per scout: 2.50x for Max, 1.25x for Junie,
  // 3.09x for Gus. Stats.dodgeMax does that arithmetic and the block has
  // already clamped the stat to it by the time this reads it, so this file
  // divides and nothing more.
  function rechargeOf(game, owner) {
    if (typeof Stats === 'undefined' || !Stats) return 1;
    const st = (owner && owner.build && owner.build.stats) ||
      (game && typeof game.statsOf === 'function' ? game.statsOf(owner) : null);
    const r = st && st.dodgeRecharge;
    return r > 0 ? r : 1;
  }

  Game.prototype.updateDodge = function (dt) {
    const p = this.player;
    const params = dodgeParams(this);
    const mods = dashMods(p);
    const charges = Math.max(1, (params.charges || DEFAULT_DODGE.charges) + mods.charges);

    // lazy init of dash state living on the player
    if (p.dashT == null) {
      p.dashT = 0;
      p.dashI = 0;
      p.dashDx = 0;
      p.dashDy = 0;
      p.dashCds = [];
      p.dashInfo = null;
    }
    while (p.dashCds.length < charges) p.dashCds.push(0);
    while (p.dashCds.length > charges) p.dashCds.pop();

    // charge cooldowns tick every frame no matter the phase
    for (let i = 0; i < p.dashCds.length; i++) {
      if (p.dashCds[i] > 0) {
        p.dashCds[i] -= dt;
        if (p.dashCds[i] < 0) p.dashCds[i] = 0;
      }
    }
    // invulnerability window runs on its own clock and outlasts the dash
    if (p.dashI > 0) {
      p.dashI -= dt;
      if (p.dashI < 0) p.dashI = 0;
    }

    // ---- trigger: exactly one frame of p.in.dodge, only while playing ----
    if (this.phase === 'play' && p.in.dodge && !(p.dashT > 0)) {
      let chargeIdx = -1;
      for (let i = 0; i < p.dashCds.length; i++) {
        if (p.dashCds[i] <= 0) { chargeIdx = i; break; }
      }
      if (chargeIdx !== -1) {
        let dx = p.in.moveX, dy = p.in.moveY;
        if (dx === 0 && dy === 0) {
          dx = p.in.aimX - p.x;
          dy = p.in.aimY - p.y;
        }
        const dl = Math.hypot(dx, dy);
        if (dl > 0.0001) { dx /= dl; dy /= dl; }
        else { dx = p.lastDir.x; dy = p.lastDir.y; }

        // The mutable options every onDodge handler is handed. Distance and
        // duration are the two numbers an item is most likely to want, so
        // both are here in their own right and the speed is derived from
        // whichever one the handler chose to write.
        const baseDist = params.spd * params.dur * mods.distMul;
        const opt = {
          dx: dx, dy: dy,
          dist: baseDist,
          dur: params.dur,
          spd: params.spd * mods.distMul,
          iframe: params.iframe + mods.iframeAdd,
          cd: params.cd * mods.cdMul / rechargeOf(this, p),
          charge: chargeIdx,
          charges: p.dashCds.length,
          traits: dashSet(p),
          cancel: false,
        };
        this.hooks.emit('onDodge', this, p, opt);

        if (opt.cancel !== true) {
          // Distance wins if a handler moved it; otherwise speed does.
          if (opt.dist !== baseDist) opt.spd = opt.dist / Math.max(0.0001, opt.dur);
          else opt.dist = opt.spd * opt.dur;

          // Re-normalise, but ONLY if a handler actually turned the roll.
          // Normalising an already normalised vector is not free: hypot of a
          // unit vector is not exactly one, so dividing again moves the last
          // bits, and a dash that lands a thousandth of a unit off eventually
          // kills a squirrel one frame late. A seeded replay notices.
          if (opt.dx !== dx || opt.dy !== dy) {
            const ol = Math.hypot(opt.dx, opt.dy);
            if (ol > 0.0001) { opt.dx /= ol; opt.dy /= ol; }
          }

          p.dashCds[chargeIdx] = opt.cd;
          p.dashT = opt.dur;
          p.dashI = opt.iframe;
          p.dashDx = opt.dx;
          p.dashDy = opt.dy;

          // fresh hit registry for this dash's barge/phase effects, holding
          // entity ids rather than bodies (C5)
          this._dashHit = new Set();

          const set = (opt.traits === undefined || opt.traits === null) ? Traits.NONE : opt.traits;
          const dash = {
            dx: opt.dx, dy: opt.dy,
            spd: opt.spd, dur: opt.dur, dist: opt.dist,
            iframe: opt.iframe, charge: chargeIdx,
            t: 0, traveled: 0,
            hit: this._dashHit,
            noSolids: false,
            traits: set,
            oid: p.eid,
          };
          p.dashInfo = dash;
          if (set.length !== 0) Traits.dashStart(this, p, set, dash);

          this.spawnPuff(p.x, p.y, 6);
          AudioSys.play('swing', { pitch: 1.4 });
        }
      }
    }

    // ---- integration: owns the player's position while dashT > 0 ----
    if (p.dashT > 0) {
      const dash = p.dashInfo;
      const spd = dash ? dash.spd : params.spd;
      const dur = dash ? dash.dur : params.dur;
      const elapsedBefore = dur - p.dashT;

      let nx = p.x + p.dashDx * spd * dt;
      let ny = p.y + p.dashDy * spd * dt;
      // phase skips the solids. It cannot skip the walls: the clamp below is
      // outside the trait walk on purpose, and there is no config that
      // reaches it.
      if (!(dash && dash.noSolids)) {
        const solids = (this.room && this.room.solids) || [];
        const resolved = Collide.resolveCircle(nx, ny, p.r, solids);
        nx = resolved.x; ny = resolved.y;
      }
      if (this.room) {
        const clamped = Collide.clampToBounds(nx, ny, p.r, this.room.bounds);
        nx = clamped.x; ny = clamped.y;
      }
      if (dash) dash.traveled += Math.hypot(nx - p.x, ny - p.y);
      p.x = nx; p.y = ny;

      // keep the legs moving through the dash, subtly
      this.walkPhase = (this.walkPhase || 0) + dt * (this.statsOf(p).moveSpeed / 13);

      // four afterimages spaced across the dash duration
      const newDashT = Math.max(0, p.dashT - dt);
      const elapsedAfter = dur - newDashT;
      const quarter = dur / 4;
      if (quarter > 0) {
        for (let k = 0; k < 4; k++) {
          const th = k * quarter;
          if (elapsedBefore <= th && th < elapsedAfter) {
            this.parts.push({
              kind: 'ghost', x: p.x, y: p.y, charId: this.charId, face: p.face,
              t: 0, life: 0.28, alpha: 0.45,
            });
          }
        }
      }

      // The dash trait walk sits exactly where the hand written character
      // flavour sat: after the roll has moved and after the afterimages have
      // been laid down, never before. A trait that reads the scout's
      // position is reading where the roll IS this frame, not where it was
      // last frame, and moving this call one line up is enough to shove a
      // barged squirrel a different distance.
      if (dash && dash.traits.length !== 0) {
        dash.t += dt;
        Traits.dashStep(this, p, dash.traits, dash, dt);
      }

      p.dashT = newDashT;
      if (p.dashT <= 0 && dash) {
        if (dash.traits.length !== 0) Traits.dashEnd(this, p, dash.traits, dash);
        p.dashInfo = null;
      }
    }
  };

  // ---- HUD hooks ----
  Game.prototype.dodgeReady = function () {
    const p = this.player;
    const params = dodgeParams(this);
    if (!p.dashCds) return params.charges || DEFAULT_DODGE.charges;
    let n = 0;
    for (const c of p.dashCds) if (c <= 0) n++;
    return n;
  };

  Game.prototype.dodgeCdFrac = function () {
    const p = this.player;
    if (!p.dashCds || !p.dashCds.length) return 1;
    let min = Infinity;
    for (const c of p.dashCds) if (c < min) min = c;
    if (min <= 0) return 1;
    const params = dodgeParams(this);
    const mods = dashMods(p);
    // The same divisor the charge was spent with, or the cooldown ring on the
    // HUD says one thing and the dodge does another.
    return 1 - min / ((params.cd || DEFAULT_DODGE.cd) * mods.cdMul / rechargeOf(this, p));
  };

  // Exposed so game.rebuildTraits can compile a character's own flavour the
  // same way it compiles an item's grants: one vocabulary, one compiler.
  Game.prototype.legacyDashTraits = function (params) {
    return legacyTraits(params);
  };

})();
