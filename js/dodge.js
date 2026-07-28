// Merit Badge Massacre: the dodge roll. readInput() already turns a key
// press into a single-frame p.in.dodge edge; this file spends it, owns the
// player's position for the length of the dash, and ticks the charge
// cooldowns every frame regardless of phase.
'use strict';

(function () {

  const DEFAULT_DODGE = { spd: 620, dur: 0.17, iframe: 0.30, cd: 1.05, charges: 1 };

  function dodgeParams(game) {
    return (game.char && game.char.dodge) || DEFAULT_DODGE;
  }

  Game.prototype.updateDodge = function (dt) {
    const p = this.player;
    const params = dodgeParams(this);
    const charges = params.charges || DEFAULT_DODGE.charges;

    // lazy init of dash state living on the player
    if (p.dashT == null) {
      p.dashT = 0;
      p.dashI = 0;
      p.dashDx = 0;
      p.dashDy = 0;
      p.dashCds = [];
    }
    while (p.dashCds.length < charges) p.dashCds.push(0);

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

        p.dashCds[chargeIdx] = params.cd;
        p.dashT = params.dur;
        p.dashI = params.iframe;
        p.dashDx = dx;
        p.dashDy = dy;

        // fresh hit registry for this dash's barge/charge effects
        this._dashHit = new Set();

        this.spawnPuff(p.x, p.y, 6);
        AudioSys.play('swing', { pitch: 1.4 });
      }
    }

    // ---- integration: owns the player's position while dashT > 0 ----
    if (p.dashT > 0) {
      const elapsedBefore = params.dur - p.dashT;

      let nx = p.x + p.dashDx * params.spd * dt;
      let ny = p.y + p.dashDy * params.spd * dt;
      const solids = (this.room && this.room.solids) || [];
      const resolved = Collide.resolveCircle(nx, ny, p.r, solids);
      nx = resolved.x; ny = resolved.y;
      if (this.room) {
        const clamped = Collide.clampToBounds(nx, ny, p.r, this.room.bounds);
        nx = clamped.x; ny = clamped.y;
      }
      p.x = nx; p.y = ny;

      // keep the legs moving through the dash, subtly
      this.walkPhase = (this.walkPhase || 0) + dt * (this.speed / 13);

      // four afterimages spaced across the dash duration
      const newDashT = Math.max(0, p.dashT - dt);
      const elapsedAfter = params.dur - newDashT;
      const quarter = params.dur / 4;
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

      // ---- character flavor ----
      if (params.trail === 'burn') {
        if (this.parts.length < 420 && Math.random() < 0.3) {
          this.parts.push({
            kind: 'ember', x: p.x, y: p.y - 4,
            vx: rand(-16, 16), vy: rand(-16, 16),
            t: 0, life: rand(0.2, 0.4), size: rand(1.4, 2.4),
          });
        }
        const near = this.queryEnemies(p.x, p.y, 26);
        for (const e of near) this.applyBurn(e, 6, 1.2);
      }

      if (params.barge) {
        const hitSet = this._dashHit || (this._dashHit = new Set());
        const near = this.queryEnemies(p.x, p.y, 30, true);
        for (const e of near) {
          if (hitSet.has(e)) continue;
          hitSet.add(e);
          if (e.prop) {
            this.damageProp(e, 20, {});
            continue;
          }
          const d = Math.max(1, Math.hypot(e.x - p.x, e.y - p.y));
          e.kx += (e.x - p.x) / d * 260;
          e.ky += (e.y - p.y) / d * 260;
          if (!e.boss) e.stunT = Math.max(e.stunT || 0, 0.3);
        }
      }

      p.dashT = newDashT;
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
    return 1 - min / (params.cd || DEFAULT_DODGE.cd);
  };

})();
