// Merit Badge Massacre: the director. Spawning, enemy AI, elites, scripted
// events, and the three bosses. Extends Game.prototype (game.js loads first).
'use strict';

(function () {

  Game.prototype.viewRadius = function () {
    return Math.hypot(window.innerWidth, window.innerHeight) / (2 * ZOOM) + 70;
  };

  Game.prototype.spawnPos = function () {
    const a = rand(0, TAU);
    const r = this.viewRadius();
    return { x: this.player.x + Math.cos(a) * r, y: this.player.y + Math.sin(a) * r };
  };

  Game.prototype.pickSpawn = function (m) {
    const c = [];
    let total = 0;
    for (const p of DATA.pool) {
      if (m >= p.from && m < p.until) { c.push(p); total += p.wgt; }
    }
    if (!c.length) return null;
    let roll = Math.random() * total;
    for (const p of c) { roll -= p.wgt; if (roll <= 0) return p.id; }
    return c[c.length - 1].id;
  };

  Game.prototype.spawnEnemy = function (id, x, y, elite) {
    const d = DATA.enemies[id];
    const m = this.time / 60;
    // Elites get their own linear curve: the quadratic trash curve times 9
    // would out-tank the linearly scaled final boss by minute 12.
    const hp = d.hp * (elite ? (1 + m * 0.55) * 9 : DATA.hpScale(m));
    const e = {
      kind: id, spr: d.spr, move: d.move,
      x, y, hp, maxhp: hp,
      spd: d.spd * (1 + m * 0.012) * (elite ? 0.9 : 1),
      dmg: d.dmg * DATA.dmgScale(m) * (elite ? 1.5 : 1),
      r: d.r * (elite ? 1.5 : 1),
      w: d.w * (elite ? 1.5 : 1),
      xp: d.xp,
      flip: false, bob: rand(0, TAU),
      kx: 0, ky: 0, slowT: 0, stunT: 0, flash: 0,
      burnT: 0, burnDps: 0, burnTick: 0,
      dead: false, elite: !!elite, boss: false,
      ai: {},
    };
    if (d.move === 'hop') e.ai = { state: 'idle', t: rand(0.1, 0.5), k: 0, dx: 0, dy: 0, hopSpd: d.hopSpd };
    if (d.move === 'charge') e.ai = { state: 'stalk', t: rand(1, 2.2), dx: 0, dy: 0, chargeSpd: d.chargeSpd };
    if (d.move === 'ranged') { e.ai = { shotT: rand(1, d.shotCd) }; e.shotCd = d.shotCd; e.shotSpd = d.shotSpd; e.shotDmg = d.shotDmg * DATA.dmgScale(m); }
    if (d.move === 'sine' || d.move === 'weave') e.ai = { ph: rand(0, TAU) };
    this.enemies.push(e);
    return e;
  };

  Game.prototype.spawnBoss = function (def) {
    const pos = this.spawnPos();
    const m = this.time / 60;
    const hp = def.hp * DATA.bossHpScale(m);
    const e = {
      kind: def.id, spr: def.spr, move: def.move, name: def.name,
      x: pos.x, y: pos.y, hp, maxhp: hp,
      spd: def.spd || 0,
      dmg: def.dmg * DATA.dmgScale(m * 0.5),
      r: def.r, w: def.w, xp: def.xp,
      flip: false, bob: rand(0, TAU),
      kx: 0, ky: 0, slowT: 0, stunT: 0, flash: 0,
      burnT: 0, burnDps: 0, burnTick: 0,
      dead: false, elite: false, boss: true, final: !!def.final,
      dmgF: 1,
      ai: {
        state: def.move === 'bosshare' ? 'idle' : 'chase',
        t: 1, k: 0, dx: 0, dy: 0, hopSpd: def.hopSpd || 0,
        hopCount: 0, summonT: 9, ringT: 3.5, spiralA: 0, enrage: 0,
        telegraph: null,
      },
    };
    this.enemies.push(e);
    this.toast(def.name);
    AudioSys.play('roar');
    this.shakeAdd(8);
    this.hitstop = Math.max(this.hitstop, 0.4);
    this.bossFlash = 0.9;
    this.bark('boss');
    return e;
  };

  Game.prototype.queueEventSpawns = function (sp) {
    const p = this.player;
    if (sp.mode === 'ring') {
      const r = Math.min(this.viewRadius() - 30, 470);
      for (let i = 0; i < sp.n; i++) {
        const a = (i / sp.n) * TAU;
        this.spawnEnemy(sp.id, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, false);
      }
      return;
    }
    // Queued spawns store only an angle: the queue drains over seconds, and
    // a position baked now can be on screen by the time it drains.
    if (sp.mode === 'side') {
      const side = rand(0, TAU);
      for (let i = 0; i < sp.n; i++) {
        this.spawnQueue.push({ id: sp.id, a: side + rand(-0.5, 0.5) });
      }
      return;
    }
    for (let i = 0; i < sp.n; i++) {
      this.spawnQueue.push({ id: sp.id, a: rand(0, TAU) });
    }
  };

  Game.prototype.updateDirector = function (dt) {
    const m = this.time / 60;

    // burst queue drains a few per frame so floods pour in
    if (this.spawnQueue.length) {
      this._qt = (this._qt || 0) - dt;
      while (this._qt <= 0 && this.spawnQueue.length) {
        const q = this.spawnQueue.shift();
        const rr = this.viewRadius();
        this.spawnEnemy(q.id, this.player.x + Math.cos(q.a) * rr, this.player.y + Math.sin(q.a) * rr, false);
        this._qt += 0.06;
      }
    }

    // steady trickle
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT += DATA.spawnInterval(m);
      if (this.enemies.length < 300) {
        const batch = DATA.spawnBatch(m);
        for (let i = 0; i < batch && this.enemies.length < 300; i++) {
          const id = this.pickSpawn(m);
          if (!id) break;
          const pos = this.spawnPos();
          this.spawnEnemy(id, pos.x, pos.y, false);
        }
      }
    }

    // elites every 70s from 1:50
    if (this.time >= this.eliteT) {
      this.eliteT += 70;
      const id = this.pickSpawn(Math.max(2, m));
      if (id) {
        const pos = this.spawnPos();
        this.spawnEnemy(id, pos.x, pos.y, true);
      }
    }

    // scripted events
    while (this.eventIdx < DATA.events.length && this.time >= DATA.events[this.eventIdx].t) {
      const ev = DATA.events[this.eventIdx++];
      this.toast(ev.name);
      AudioSys.play('roar');
      for (const sp of ev.spawns) this.queueEventSpawns(sp);
    }

    // bosses
    for (let i = 0; i < DATA.bosses.length; i++) {
      if (!this.bossSpawned[i] && this.time >= DATA.bosses[i].at) {
        this.bossSpawned[i] = true;
        this.spawnBoss(DATA.bosses[i]);
      }
    }
  };

  Game.prototype.fireEshot = function (x, y, a, spd, dmg, kind) {
    this.eshots.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      r: 6, dmg, life: 5, kind: kind || null,
    });
  };

  Game.prototype.summonAround = function (e, ids, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = rand(60, 130);
      this.spawnEnemy(pick(ids), e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, false);
    }
    this.spawnPuff(e.x, e.y, 10);
  };

  Game.prototype.updateEnemies = function (dt) {
    const p = this.player;
    const relocate2 = Math.pow(this.viewRadius() * 2.3, 2);

    for (const e of this.enemies) {
      if (e.dead) continue;
      const ai = e.ai;

      // status decay
      e.flash = Math.max(0, e.flash - dt);
      e.slowT = Math.max(0, (e.slowT || 0) - dt);
      e.stunT = Math.max(0, (e.stunT || 0) - dt);

      // burning
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick += 0.5;
          e.hp -= e.burnDps * 0.5;
          if ((window.SETTINGS ? SETTINGS.dmgNums : true) && Math.random() < 0.5) {
            this.spawnNum(e.x + rand(-5, 5), e.y - e.r - 4, Math.round(e.burnDps * 0.5) + '', '#ff9a3c');
          }
          if (e.hp <= 0) { this.killEnemy(e); continue; }
        }
      }

      // knockback
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      e.kx *= Math.pow(0.002, dt);
      e.ky *= Math.pow(0.002, dt);

      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const slowMul = e.slowT > 0 ? 0.62 : 1;

      if (e.stunT <= 0) {
        switch (e.move) {
          case 'walk': {
            e.x += ux * e.spd * slowMul * dt;
            e.y += uy * e.spd * slowMul * dt;
            break;
          }
          case 'sine': {
            const px = -uy, py = ux;
            const s = Math.sin(this.t * 4 + ai.ph) * 0.65;
            let vx = ux + px * s, vy = uy + py * s;
            const il = 1 / (Math.hypot(vx, vy) || 1);
            e.x += vx * il * e.spd * slowMul * dt;
            e.y += vy * il * e.spd * slowMul * dt;
            break;
          }
          case 'weave': {
            const px = -uy, py = ux;
            const s = Math.sin(this.t * 7 + ai.ph) * 0.45;
            let vx = ux + px * s, vy = uy + py * s;
            const il = 1 / (Math.hypot(vx, vy) || 1);
            e.x += vx * il * e.spd * slowMul * dt;
            e.y += vy * il * e.spd * slowMul * dt;
            break;
          }
          case 'hop':
          case 'bosshare': {
            const hopSpd = ai.hopSpd * slowMul;
            if (ai.state === 'idle') {
              ai.t -= dt;
              if (ai.t <= 0) {
                ai.state = 'hop';
                ai.k = 0;
                ai.dx = ux; ai.dy = uy;
              }
            } else if (ai.state === 'hop') {
              ai.k += dt / 0.42;
              e.x += ai.dx * hopSpd * dt;
              e.y += ai.dy * hopSpd * dt;
              if (ai.k >= 1) {
                ai.state = 'idle';
                ai.t = e.boss ? rand(0.25, 0.5) : rand(0.35, 0.7);
                if (e.move === 'bosshare') {
                  ai.hopCount++;
                  this.shakeAdd(2);
                  if (ai.hopCount % 3 === 0) {
                    for (let i = 0; i < 8; i++) {
                      this.fireEshot(e.x, e.y - 8, i * TAU / 8, 170, e.dmg * 0.6, e.kind);
                    }
                    AudioSys.play('boom');
                  }
                }
              }
            }
            if (e.move === 'bosshare') {
              ai.summonT -= dt;
              if (ai.summonT <= 0) {
                ai.summonT = 12;
                this.summonAround(e, ['rabbit'], 4);
              }
            }
            break;
          }
          case 'ranged': {
            if (d > 270) { e.x += ux * e.spd * slowMul * dt; e.y += uy * e.spd * slowMul * dt; }
            else if (d < 175) { e.x -= ux * e.spd * slowMul * dt; e.y -= uy * e.spd * slowMul * dt; }
            else { e.x += -uy * e.spd * 0.5 * slowMul * dt; e.y += ux * e.spd * 0.5 * slowMul * dt; }
            ai.shotT -= dt;
            if (ai.shotT <= 0 && d < 430) {
              ai.shotT = e.shotCd;
              this.fireEshot(e.x, e.y - 10, Math.atan2(dy, dx), e.shotSpd, e.shotDmg, e.kind);
            }
            break;
          }
          case 'charge': {
            if (ai.state === 'stalk') {
              e.x += ux * e.spd * 0.6 * slowMul * dt;
              e.y += uy * e.spd * 0.6 * slowMul * dt;
              ai.t -= dt;
              if (ai.t <= 0 && d < 420) { ai.state = 'windup'; ai.t = 0.45; }
            } else if (ai.state === 'windup') {
              ai.t -= dt;
              if (ai.t <= 0) {
                ai.state = 'charge';
                ai.t = 0.75;
                ai.dx = ux; ai.dy = uy;
              }
            } else if (ai.state === 'charge') {
              ai.t -= dt;
              e.x += ai.dx * ai.chargeSpd * slowMul * dt;
              e.y += ai.dy * ai.chargeSpd * slowMul * dt;
              if (ai.t <= 0) { ai.state = 'recover'; ai.t = 0.5; }
            } else {
              ai.t -= dt;
              if (ai.t <= 0) { ai.state = 'stalk'; ai.t = rand(1.2, 2.2); }
            }
            break;
          }
          case 'bossvicar': {
            e.x += ux * e.spd * dt;
            e.y += uy * e.spd * dt;
            ai.ringT -= dt;
            if (ai.ringT <= 0) {
              ai.ringT = 4;
              for (let i = 0; i < 10; i++) {
                this.fireEshot(e.x, e.y - 10, i * TAU / 10 + this.t, 160, e.dmg * 0.55, e.kind);
              }
              AudioSys.play('roar');
            }
            ai.summonT -= dt;
            if (ai.summonT <= 0) {
              ai.summonT = 15;
              this.summonAround(e, ['raccoon'], 3);
            }
            break;
          }
          case 'bossstag': {
            ai.enrage += dt;
            const enrF = 1 + Math.min(0.6, Math.max(0, ai.enrage - 75) * 0.01);
            e.dmgF = enrF;
            if (ai.state === 'chase') {
              e.x += ux * e.spd * enrF * dt;
              e.y += uy * e.spd * enrF * dt;
              ai.t -= dt;
              if (ai.t <= 0) {
                if (ai.next === 'spiral') {
                  ai.state = 'spiral'; ai.t = 1.6; ai.next = 'charge'; ai.st = 0;
                } else {
                  ai.state = 'windup'; ai.t = 0.8; ai.next = 'spiral';
                  ai.telegraph = { a: Math.atan2(dy, dx), len: 380 };
                  ai.dx = ux; ai.dy = uy;
                }
              }
            } else if (ai.state === 'windup') {
              ai.t -= dt;
              if (ai.t <= 0) {
                ai.state = 'charge'; ai.t = 1.0;
                ai.telegraph = null;
                AudioSys.play('roar');
              }
            } else if (ai.state === 'charge') {
              ai.t -= dt;
              e.x += ai.dx * 390 * enrF * dt;
              e.y += ai.dy * 390 * enrF * dt;
              if (ai.t <= 0) { ai.state = 'chase'; ai.t = rand(2.5, 3.5); }
            } else if (ai.state === 'spiral') {
              ai.t -= dt;
              ai.st = (ai.st || 0) - dt;
              if (ai.st <= 0) {
                ai.st += 0.1;
                ai.spiralA += 0.62;
                this.fireEshot(e.x, e.y - 14, ai.spiralA, 175, e.dmg * 0.5, e.kind);
                this.fireEshot(e.x, e.y - 14, ai.spiralA + Math.PI, 175, e.dmg * 0.5, e.kind);
              }
              if (ai.t <= 0) { ai.state = 'chase'; ai.t = rand(2, 3); }
            }
            ai.summonT -= dt;
            if (ai.summonT <= 0) {
              ai.summonT = 18;
              const m = this.time / 60;
              const ids = ['raccoon', 'fox', 'boar'];
              this.summonAround(e, ids, 5);
            }
            break;
          }
        }
      }

      // cheap separation using the collision grid from the frame start
      const cellArr = this.grid.get(((e.x / CELL) | 0) + '|' + ((e.y / CELL) | 0));
      if (cellArr) {
        let checked = 0;
        for (const o of cellArr) {
          if (o === e || o.dead) continue;
          if (++checked > 4) break;
          const sx = e.x - o.x, sy = e.y - o.y;
          const sd = Math.hypot(sx, sy);
          const min = (e.r + o.r) * 0.72;
          if (sd > 0.01 && sd < min) {
            const push = (min - sd) * 0.5;
            e.x += sx / sd * push;
            e.y += sy / sd * push;
          }
        }
      }

      // contact damage
      const rr = e.r + p.r;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        this.damagePlayer(e.dmg * (e.dmgF || 1), e.x, e.y, e.kind);
      }

      // faraway trash gets recycled to the spawn ring
      if (!e.boss && dist2(e.x, e.y, p.x, p.y) > relocate2) {
        const pos = this.spawnPos();
        e.x = pos.x; e.y = pos.y;
      }

      e.flip = p.x < e.x;
    }
  };

})();
