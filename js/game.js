// Merit Badge Massacre: core game engine. The director (spawning, enemy AI,
// bosses, events) lives in director.js and extends Game.prototype.
'use strict';

const TAU = Math.PI * 2;
const ZOOM = 1.22;

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) >>> 0;
}

const CELL = 72;

class Game {
  constructor(charId) {
    const c = DATA.characters[charId];
    this.charId = charId;
    this.char = c;
    const hearty = META.rank('hearty') * 12;
    this.player = {
      x: 0, y: 0, r: 11, hp: c.hp + hearty, maxhp: c.hp + hearty,
      face: 1, moving: false, lastDir: { x: 1, y: 0 },
      iframe: 0, god: false,
    };
    this.revived = false;
    this.lastKiller = null;
    this.barkNow = null;
    this.barkCds = {};
    this.killBarked = false;
    this.aimAngle = 0;
    this.aimX = 1; this.aimY = 0;
    this.recoil = 0;
    this.hurtFlash = 0;
    this.flashGold = 0;

    this.weapons = [];
    this.passives = {};
    this.addWeapon(c.weapon);

    this.enemies = [];
    this.shots = [];
    this.eshots = [];
    this.bombs = [];
    this.puddles = [];
    this.rings = [];
    this.swings = [];
    this.corpses = [];
    this.zoomF = 1;
    this.deathHat = null;
    this.hitstop = 0;
    this.gems = [];
    this.pickups = [];
    this.parts = [];
    this.nums = [];
    this.fireflies = [];
    for (let i = 0; i < 26; i++) {
      this.fireflies.push({ x: rand(-600, 600), y: rand(-400, 400), a: rand(0, TAU), ph: rand(0, TAU) });
    }

    this.time = 0;
    this.t = 0;             // animation clock
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = DATA.xpNext(1);
    this.badges = 0;
    this.pendingLevelups = 0;
    this.gemCombo = 0;
    this.gemComboT = 0;

    this.spawnT = 0.6;
    this.eliteT = 110;
    this.eventIdx = 0;
    this.bossSpawned = [false, false, false];
    this.spawnQueue = [];

    this.cam = { x: 0, y: 0 };
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;

    this.phase = 'play';    // play, dying, over, dawn, win
    this.phaseT = 0;
    this.toasts = [];

    this.grid = new Map();
    this._qbuf = [];

    this.recalc();

    // Head Start ranks from the Badge Board: begin the night already ranked up
    const hs = META.rank('headstart');
    for (let i = 0; i < hs; i++) {
      this.level++;
      this.pendingLevelups++;
    }
    this.xpNext = DATA.xpNext(this.level);
  }

  bark(trigger) {
    const lines = (BARKS[this.charId] || {})[trigger];
    if (!lines || !lines.length) return;
    if (this.barkCds[trigger] != null && this.t - this.barkCds[trigger] < 25) return;
    this.barkCds[trigger] = this.t;
    this.barkNow = { text: pick(lines), t: 3.0 };
  }

  // ---------------- stats ----------------
  recalc() {
    const c = this.char, p = this.passives;
    const lv = id => p[id] || 0;
    this.dmgMul = (1 + c.dmg) * (1 + 0.12 * lv('trailmix')) * (1 + 0.05 * META.rank('sharp'));
    this.speed = c.speed * (1 + 0.10 * lv('boots')) * (1 + 0.04 * META.rank('swift'));
    this.cdMul = Math.pow(0.91, lv('whistle'));
    this.armor = c.armor + 2 * lv('skillet') + META.rank('grit');
    this.magnetR = 65 * (1 + c.pickup) * (1 + 0.45 * lv('lodestone')) * (1 + 0.12 * META.rank('packrat'));
    this.xpMul = (1 + 0.15 * lv('fieldguide')) * (1 + 0.08 * META.rank('scholar'));
    this.critCh = c.crit + 0.08 * lv('rabbitfoot');
    this.regen = 0.6 * lv('firstaid');
  }

  computeWeaponStats(id, lvl) {
    const def = DATA.weapons[id];
    const st = Object.assign({ cdFactor: 1 }, def.base);
    for (let i = 0; i < lvl - 1 && i < def.levels.length; i++) {
      const up = def.levels[i];
      for (const k in up) {
        if (k === 'text') continue;
        if (k === 'cdMul') st.cdFactor *= up[k];
        else st[k] = (st[k] || 0) + up[k];
      }
    }
    return st;
  }

  addWeapon(id) {
    this.weapons.push({ id, lvl: 1, t: 0, angle: rand(0, TAU), tickT: 0, stats: this.computeWeaponStats(id, 1) });
  }
  upgradeWeapon(id) {
    const w = this.weapons.find(w => w.id === id);
    if (!w) return;
    w.lvl++;
    w.stats = this.computeWeaponStats(id, w.lvl);
  }

  // ---------------- level up pool ----------------
  levelPool(n) {
    const pool = [];
    const owned = id => this.weapons.find(w => w.id === id);
    for (const w of this.weapons) {
      if (w.lvl < DATA.WEAPON_MAX) {
        pool.push({ kind: 'weapon', id: w.id, isNew: false, lvl: w.lvl + 1, wgt: 10 });
      }
    }
    if (this.weapons.length < DATA.WEAPON_SLOTS) {
      for (const id in DATA.weapons) {
        if (!owned(id)) pool.push({ kind: 'weapon', id, isNew: true, lvl: 1, wgt: 6 });
      }
    }
    const pcount = Object.keys(this.passives).length;
    for (const id in DATA.passives) {
      const cur = this.passives[id] || 0;
      if (cur > 0 && cur < DATA.passives[id].max) {
        pool.push({ kind: 'passive', id, isNew: false, lvl: cur + 1, wgt: 8 });
      } else if (cur === 0 && pcount < DATA.PASSIVE_SLOTS) {
        pool.push({ kind: 'passive', id, isNew: true, lvl: 1, wgt: 5 });
      }
    }
    const out = [];
    if (pool.length === 0) {
      const fillers = DATA.fillers.slice();
      while (out.length < n && fillers.length) {
        const i = (Math.random() * fillers.length) | 0;
        const f = fillers.splice(i, 1)[0];
        out.push({ kind: 'filler', id: f.id, isNew: false, lvl: 0 });
      }
      return out;
    }
    let guard = 0;
    while (out.length < Math.min(n, pool.length) && guard++ < 200) {
      let total = 0;
      for (const p of pool) total += p.wgt;
      let roll = Math.random() * total;
      let chosen = pool[0];
      for (const p of pool) { roll -= p.wgt; if (roll <= 0) { chosen = p; break; } }
      if (!out.some(o => o.kind === chosen.kind && o.id === chosen.id)) out.push(chosen);
    }
    return out;
  }

  choiceInfo(c) {
    if (c.kind === 'weapon') {
      const def = DATA.weapons[c.id];
      return {
        name: def.name, icon: def.icon,
        chip: c.isNew ? 'NEW ' + (def.kind === 'manual' ? 'WEAPON' : 'SKILL') : 'LV ' + c.lvl,
        desc: c.isNew ? def.desc : def.levels[c.lvl - 2].text,
      };
    }
    if (c.kind === 'passive') {
      const def = DATA.passives[c.id];
      return {
        name: def.name, icon: def.icon,
        chip: c.isNew ? 'NEW BADGE' : 'LV ' + c.lvl,
        desc: (c.isNew ? def.desc + ' ' : '') + def.per,
      };
    }
    const f = DATA.fillers.find(f => f.id === c.id);
    return { name: f.name, icon: f.icon, chip: 'SUPPLY', desc: f.desc };
  }

  applyChoice(c) {
    if (c.kind === 'weapon') {
      if (c.isNew) this.addWeapon(c.id); else this.upgradeWeapon(c.id);
    } else if (c.kind === 'passive') {
      this.passives[c.id] = (this.passives[c.id] || 0) + 1;
      this.recalc();
    } else {
      const p = this.player;
      if (c.id === 'smore') p.hp = Math.min(p.maxhp, p.hp + 40);
      if (c.id === 'patch') { p.maxhp += 10; p.hp = Math.min(p.maxhp, p.hp + 10); }
      if (c.id === 'stash') this.gainXP(25);
    }
    this.flashGold = 0.35;
    this.spawnBurst(this.player.x, this.player.y, '#f4c542', 14);
  }

  grantChest() {
    const picks = this.levelPool(1);
    if (picks.length === 0) {
      this.player.hp = Math.min(this.player.maxhp, this.player.hp + 30);
      this.toast('CHEST: 30 HP', '#7ec87e');
      return;
    }
    const c = picks[0];
    this.applyChoice(c);
    const info = this.choiceInfo(c);
    this.toast('CHEST: ' + info.name.toUpperCase() + (c.kind !== 'filler' ? ' LV ' + c.lvl : ''), '#f4c542');
    this.hitstop = Math.max(this.hitstop, 0.16);
    this.parts.push({ kind: 'ring', x: this.player.x, y: this.player.y - 8, t: 0, life: 0.5, size: 90 });
    AudioSys.play('chest');
  }

  toast(text, color) {
    this.toasts.push({ text, color: color || '#ff5b45' });
  }

  gainXP(v) {
    this.xp += v * this.xpMul;
    this.badges += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = DATA.xpNext(this.level);
      this.pendingLevelups++;
      this.player.maxhp += 2;
      this.player.hp = Math.min(this.player.maxhp, this.player.hp + 6);
      // rank-up moment: freeze frame, gold ring, spark shower
      this.hitstop = Math.max(this.hitstop, 0.2);
      this.flashGold = 0.4;
      this.spawnBurst(this.player.x, this.player.y - 10, '#f4c542', 18);
      this.parts.push({ kind: 'ring', x: this.player.x, y: this.player.y - 8, t: 0, life: 0.45, size: 70 });
    }
  }

  statsSummary() {
    return [
      ['Damage', Math.round(this.dmgMul * 100) + '%'],
      ['Crit chance', Math.round(this.critCh * 100) + '%'],
      ['Move speed', Math.round(this.speed)],
      ['Armor', this.armor],
      ['Regen', this.regen.toFixed(1) + '/s'],
      ['Cooldowns', Math.round(this.cdMul * 100) + '%'],
      ['Pickup radius', Math.round(this.magnetR)],
      ['Badge XP', Math.round(this.xpMul * 100) + '%'],
    ];
  }

  get activeBoss() {
    for (const e of this.enemies) if (e.boss && !e.dead) return e;
    return null;
  }

  // ---------------- damage ----------------
  dealDamage(e, base, o) {
    o = o || {};
    if (e.dead) return;
    let dmg = base * this.dmgMul;
    let crit = false;
    if (!o.noCrit && Math.random() < this.critCh) { crit = true; dmg *= 2; }
    e.hp -= dmg;
    e.flash = 0.1;
    if (o.knock && !e.boss) {
      const d = Math.max(12, Math.hypot(e.x - (o.fx != null ? o.fx : this.player.x), e.y - (o.fy != null ? o.fy : this.player.y)));
      const fx = o.fx != null ? o.fx : this.player.x;
      const fy = o.fy != null ? o.fy : this.player.y;
      e.kx += (e.x - fx) / d * o.knock;
      e.ky += (e.y - fy) / d * o.knock;
    }
    if (!o.quiet) AudioSys.play('hit', { pitch: rand(0.9, 1.15) });
    if (o.knock >= 60 && this.parts.length < 380 && Math.random() < 0.45) {
      for (let i = 0; i < 2; i++) {
        const a = rand(0, TAU), s = rand(50, 130);
        this.parts.push({
          kind: 'spark', x: e.x, y: e.y - e.r * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          t: 0, life: rand(0.15, 0.3), size: rand(1.2, 2.2), color: '#fff2d8',
        });
      }
    }
    if ((window.SETTINGS ? SETTINGS.dmgNums : true) && (!o.small || dmg >= 9 || crit || Math.random() < 0.25)) {
      this.spawnNum(e.x + rand(-6, 6), e.y - e.r - 6, Math.round(dmg) + '', crit ? '#ffd94a' : (o.color || '#f0e8d8'), crit);
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  applyBurn(e, dps, dur) {
    if (e.boss) dur *= 0.6;
    e.burnDps = Math.max(e.burnDps || 0, dps);
    e.burnT = Math.max(e.burnT || 0, dur);
  }

  killEnemy(e, noDrops) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    AudioSys.play('pop', { pitch: e.boss ? 0.5 : rand(0.85, 1.2) });
    this.spawnPuff(e.x, e.y - e.r * 0.5, e.boss ? 26 : (e.elite ? 14 : 7));
    // squash-pop corpse flash, then a soul wisp escapes
    if (this.corpses.length < 40) {
      this.corpses.push({ spr: e.spr, x: e.x, y: e.y + e.r, w: e.w, flip: e.flip, t: 0, dur: e.boss ? 0.34 : 0.18 });
    }
    if (this.parts.length < 420) {
      this.parts.push({
        kind: 'wisp', x: e.x, y: e.y - e.r * 0.6, vx: rand(-8, 8), vy: -rand(46, 70),
        t: 0, life: rand(0.6, 0.9), size: e.boss ? 5 : 2.6,
      });
    }
    if (noDrops) return;
    this.dropGems(e.x, e.y, e.xp * (e.elite ? 10 : 1));
    if (e.elite) this.pickups.push({ type: 'chest', x: e.x, y: e.y, t: 0 });
    if (e.boss) {
      this.shakeAdd(9);
      this.pickups.push({ type: 'chest', x: e.x + 20, y: e.y, t: 0 });
      this.pickups.push({ type: 'cocoa', x: e.x - 20, y: e.y, t: 0 });
      this.dropGems(e.x, e.y, 40);
      if (e.final) this.triggerDawn();
      else this.toast(e.name + ' IS DOWN', '#f4c542');
    } else {
      // The litter cap is for random consumables only; uncollected chests
      // must never starve cocoa and magnet drops for the rest of the run.
      let litter = 0;
      for (const pk of this.pickups) if (pk.type !== 'chest') litter++;
      if (Math.random() < 0.015 && litter < 8) this.pickups.push({ type: 'cocoa', x: e.x, y: e.y, t: 0 });
      else if (Math.random() < 0.006 && litter < 8) this.pickups.push({ type: 'magnet', x: e.x, y: e.y, t: 0 });
    }
  }

  dropGems(x, y, value) {
    let v = Math.max(1, Math.round(value));
    while (v > 0) {
      const chunk = v >= 25 ? 25 : (v >= 5 ? 5 : 1);
      v -= chunk;
      if (this.gems.length >= 400) {
        let best = null, bd = Infinity;
        for (const g of this.gems) {
          const d = dist2(g.x, g.y, x, y);
          if (d < bd) { bd = d; best = g; }
        }
        if (best) best.v += chunk;
        continue;
      }
      this.gems.push({ x: x + rand(-14, 14), y: y + rand(-10, 10), v: chunk, attracted: false, ph: rand(0, TAU) });
    }
  }

  damagePlayer(dmg, fx, fy, kind) {
    const p = this.player;
    if (p.iframe > 0 || p.god || this.phase !== 'play') return;
    const taken = Math.max(1, Math.round(dmg - this.armor));
    p.hp -= taken;
    if (kind) this.lastKiller = kind;
    if (p.hp > 0 && p.hp < p.maxhp * 0.3) this.bark('lowhp');
    p.iframe = 0.7;
    this.hurtFlash = 0.4;
    this.shakeAdd(6);
    AudioSys.play('hurt');
    if (fx != null) {
      const d = Math.max(10, Math.hypot(p.x - fx, p.y - fy));
      p.x += (p.x - fx) / d * 14;
      p.y += (p.y - fy) / d * 14;
    }
    this.spawnNum(p.x, p.y - 24, '-' + taken, '#ff5b45', true);
    if (p.hp <= 0) {
      // Second Wind from the Badge Board: once per night, dawn insists
      if (META.rank('secondwind') > 0 && !this.revived) {
        this.revived = true;
        p.hp = Math.ceil(p.maxhp * 0.4);
        p.iframe = 2.5;
        this.hitstop = Math.max(this.hitstop, 0.35);
        this.flashGold = 0.7;
        this.spawnBurst(p.x, p.y, '#f4c542', 26);
        this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.6, size: 110 });
        this.toast('SECOND WIND', '#f4c542');
        AudioSys.play('levelup');
        this.bark('revive');
        return;
      }
      this.bark('death');
      p.hp = 0;
      this.phase = 'dying';
      this.phaseT = 0;
      this.hitstop = 0.28;
      this.shakeAdd(10);
      this.spawnPuff(p.x, p.y, 12);
      // hat flies off
      this.deathHat = {
        x: p.x, y: p.y - 26, vx: rand(-70, 70), vy: -190,
        rot: 0, vrot: rand(-7, 7), ground: p.y + p.r - 2, bounced: false,
      };
      AudioSys.play('defeat');
    }
  }

  triggerDawn() {
    if (this.phase !== 'play') return;
    this.phase = 'dawn';
    this.phaseT = 0;
    // Nothing collects loot after the phase flip, so bank the field now:
    // every gem at face value, every unopened chest as a badge bonus.
    let banked = 0;
    for (const g of this.gems) banked += g.v;
    for (const pk of this.pickups) if (pk.type === 'chest') banked += 10;
    this.badges += banked;
    this.gems.length = 0;
    this.pickups.length = 0;
    AudioSys.play('victory');
    this.toast('THE SUN RISES', '#f4c542');
    this.bark('win');
  }

  // ---------------- fx ----------------
  shakeAdd(m) {
    if (window.SETTINGS && !SETTINGS.shake) return;
    this.shake = Math.min(14, this.shake + m);
  }
  spawnNum(x, y, txt, color, big) {
    if (this.nums.length > 80) this.nums.shift();
    this.nums.push({ x, y, txt, color, big, t: 0 });
  }
  spawnPuff(x, y, n) {
    for (let i = 0; i < n && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(15, 70);
      this.parts.push({
        kind: 'puff', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
        t: 0, life: rand(0.4, 0.8), size: rand(4, 9),
      });
    }
    for (let i = 0; i < Math.min(4, n) && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(60, 160);
      this.parts.push({
        kind: 'ember', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.3, 0.6), size: rand(1.5, 3),
      });
    }
  }
  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(40, 180);
      this.parts.push({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.3, 0.7), size: rand(1.5, 3.2), color,
      });
    }
  }
  spawnBoom(x, y, r) {
    this.parts.push({ kind: 'ring', x, y, t: 0, life: 0.3, size: r });
    for (let i = 0; i < 16 && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(60, 240);
      this.parts.push({
        kind: 'ember', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.25, 0.55), size: rand(2, 4),
      });
    }
    this.spawnPuff(x, y, 8);
  }

  // ---------------- grid ----------------
  rebuildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const k = ((e.x / CELL) | 0) + '|' + ((e.y / CELL) | 0);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(e);
    }
  }
  queryEnemies(x, y, r) {
    const buf = this._qbuf;
    buf.length = 0;
    const x0 = ((x - r) / CELL) | 0, x1 = ((x + r) / CELL) | 0;
    const y0 = ((y - r) / CELL) | 0, y1 = ((y + r) / CELL) | 0;
    const r2 = r * r;
    for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
      for (let cy = y0 - 1; cy <= y1 + 1; cy++) {
        const arr = this.grid.get(cx + '|' + cy);
        if (!arr) continue;
        for (const e of arr) {
          if (e.dead) continue;
          if (dist2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) buf.push(e);
        }
      }
    }
    return buf;
  }

  // ---------------- update ----------------
  update(rawDt) {
    let dt = rawDt;
    this.t += rawDt;

    if (this.phase === 'dying') {
      this.phaseT += rawDt;
      // brief hitstop, then the world crawls while the camera pushes in
      if (this.hitstop > 0) { this.hitstop -= rawDt; return; }
      dt = rawDt * 0.25;
      this.zoomF = Math.min(1.3, this.zoomF + rawDt * 0.35);
      if (this.deathHat) {
        const h = this.deathHat;
        h.vy += 620 * rawDt;
        h.x += h.vx * rawDt;
        h.y += h.vy * rawDt;
        h.rot += h.vrot * rawDt;
        if (h.y >= h.ground) {
          h.y = h.ground;
          if (!h.bounced) { h.bounced = true; h.vy = -h.vy * 0.35; h.vx *= 0.5; h.vrot *= 0.4; }
          else { h.vx = 0; h.vy = 0; h.vrot = 0; }
        }
      }
      if (this.phaseT > 2.3) { this.phase = 'over'; return; }
      this.updateFx(dt);
      return;
    }
    if (this.phase === 'dawn') {
      this.phaseT += rawDt;
      const alive = this.enemies.filter(e => !e.dead);
      const killRate = Math.ceil(alive.length * rawDt * 1.6) + 1;
      for (let i = 0; i < killRate && i < alive.length; i++) {
        this.killEnemy(alive[(Math.random() * alive.length) | 0], true);
      }
      this.updateFx(rawDt);
      this.sweepDead();
      if (this.phaseT > 2.4) this.phase = 'win';
      return;
    }
    if (this.phase !== 'play') return;

    // big moments chew time: level ups, boss entrances, chests
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      dt *= 0.12;
    }

    this.time += dt;
    const p = this.player;

    // movement
    const ax = (INPUT.keys.has('KeyD') || INPUT.keys.has('ArrowRight') ? 1 : 0) - (INPUT.keys.has('KeyA') || INPUT.keys.has('ArrowLeft') ? 1 : 0);
    const ay = (INPUT.keys.has('KeyS') || INPUT.keys.has('ArrowDown') ? 1 : 0) - (INPUT.keys.has('KeyW') || INPUT.keys.has('ArrowUp') ? 1 : 0);
    p.moving = (ax !== 0 || ay !== 0);
    if (p.moving) {
      const il = 1 / Math.hypot(ax, ay);
      p.x += ax * il * this.speed * dt;
      p.y += ay * il * this.speed * dt;
      p.lastDir.x = ax * il; p.lastDir.y = ay * il;
      this.walkPhase = (this.walkPhase || 0) + dt * (this.speed / 13);
    }
    p.iframe = Math.max(0, p.iframe - dt);
    if (this.regen > 0) p.hp = Math.min(p.maxhp, p.hp + this.regen * dt);

    // aim at mouse (world space)
    const mw = this.mouseWorld();
    const dxm = mw.x - p.x, dym = mw.y - p.y;
    const ml = Math.hypot(dxm, dym) || 1;
    this.aimX = dxm / ml; this.aimY = dym / ml;
    this.aimAngle = Math.atan2(dym, dxm);
    p.face = this.aimX < 0 ? -1 : 1;
    this.recoil = Math.max(0, this.recoil - dt * 4);

    this.rebuildGrid();
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateBombs(dt);
    this.updatePuddles(dt);
    this.updateRings(dt);
    this.updateDirector(dt);   // director.js
    this.updateEnemies(dt);    // director.js
    this.updateEshots(dt);
    this.updateLoot(dt);
    this.updateFx(dt);
    this.sweepDead();

    // music intensity
    AudioSys.setIntensity(Math.min(3, Math.floor(this.time / 240) + (this.activeBoss ? 1 : 0)));

    this.gemComboT -= dt;
    if (this.gemComboT <= 0) this.gemCombo = 0;

    if (!this.killBarked && this.kills >= 100) {
      this.killBarked = true;
      this.bark('kills');
    }
  }

  mouseWorld() {
    const W = window.innerWidth, H = window.innerHeight;
    return {
      x: this.cam.x + (INPUT.mx - W / 2) / ZOOM,
      y: this.cam.y + (INPUT.my - H / 2) / ZOOM,
    };
  }

  sweepDead() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead) this.enemies.splice(i, 1);
    }
  }

  // ---------------- weapons ----------------
  updateWeapons(dt) {
    const p = this.player;
    for (const w of this.weapons) {
      const st = w.stats;
      const def = DATA.weapons[w.id];

      if (w.id === 'knives') {
        w.angle += st.rot * dt;
        const n = st.count;
        for (let i = 0; i < n; i++) {
          const a = w.angle + i * TAU / n;
          const kx = p.x + Math.cos(a) * st.radius;
          const ky = p.y + Math.sin(a) * st.radius;
          const hits = this.queryEnemies(kx, ky, 13);
          for (const e of hits) {
            if ((e.knifeT || 0) > this.t - st.hitCd) continue;
            e.knifeT = this.t;
            this.dealDamage(e, st.dmg, { knock: 90, fx: p.x, fy: p.y });
          }
        }
        continue;
      }

      if (w.id === 'bugspray') {
        w.tickT -= dt;
        if (w.tickT <= 0) {
          w.tickT += st.tick;
          const hits = this.queryEnemies(p.x, p.y, st.radius);
          for (const e of hits) {
            this.dealDamage(e, st.dps * st.tick, { small: true, quiet: true, noCrit: true, color: '#9ed88a' });
            if (st.slow > 0) e.slowT = Math.max(e.slowT || 0, 0.5);
          }
        }
        continue;
      }

      w.t -= dt;
      if (w.t > 0) continue;
      const wantsFire = def.kind === 'manual' ? INPUT.fire : true;
      if (!wantsFire) { w.t = 0; continue; }
      this.fireWeapon(w);
      w.t = Math.max(0.06, st.cd * st.cdFactor * this.cdMul);
    }
  }

  // Attacks grow with power: damage passives and weapon level fatten every
  // projectile, blast and swing, Isaac-style.
  attackScale(w) {
    return clamp(0.9 + (this.dmgMul - 1) * 0.65 + (w.lvl - 1) * 0.09, 0.9, 2.3);
  }

  fireWeapon(w) {
    const p = this.player;
    const st = w.stats;
    const aim = this.aimAngle;
    const gs = this.attackScale(w);

    switch (w.id) {
      case 'slingshot': {
        const n = st.count;
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 0.11 + rand(-st.spread, st.spread);
          const a = aim + off;
          this.shots.push({
            kind: 'pebble', x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16 - 8,
            vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
            dmg: st.dmg, pierce: st.pierce, r: 4.5 * gs, life: 1.5,
          });
        }
        this.recoil = 0.15;
        AudioSys.play('shoot', { pitch: rand(0.92, 1.1) });
        break;
      }
      case 'roaster': {
        for (let i = 0; i < st.count; i++) {
          const a = aim + rand(-st.spread, st.spread);
          const sp = st.speed * rand(0.85, 1.2);
          this.shots.push({
            kind: 'flame', x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18 - 8,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            dmg: st.dmg, r: 9 * gs, life: st.range / st.speed, maxlife: st.range / st.speed,
            burnDps: st.burnDps, burnDur: st.burnDur,
          });
        }
        AudioSys.play('flame');
        break;
      }
      case 'hatchet': {
        const range = st.range * (0.8 + gs * 0.25);
        this.swings.push({ x: p.x, y: p.y, a: aim, t: 0, dur: 0.2, range, arc: st.arc });
        const hits = this.queryEnemies(p.x, p.y, range);
        for (const e of hits) {
          const ea = Math.atan2(e.y - p.y, e.x - p.x);
          if (Math.abs(angDiff(ea, aim)) <= st.arc / 2 + 0.25) {
            this.dealDamage(e, st.dmg, { knock: st.knock });
          }
        }
        this.recoil = 0.2;
        AudioSys.play('swing');
        break;
      }
      case 'firecracker': {
        const mw = this.mouseWorld();
        for (let i = 0; i < st.count; i++) {
          let tx = mw.x + (i > 0 ? rand(-40, 40) : 0);
          let ty = mw.y + (i > 0 ? rand(-40, 40) : 0);
          const d = Math.hypot(tx - p.x, ty - p.y);
          if (d > st.range) { tx = p.x + (tx - p.x) / d * st.range; ty = p.y + (ty - p.y) / d * st.range; }
          this.bombs.push({ type: 'boom', sx: p.x, sy: p.y - 10, tx, ty, x: p.x, y: p.y, t: 0, fuse: st.fuse, radius: st.radius * (0.8 + gs * 0.25), dmg: st.dmg });
        }
        this.recoil = 0.15;
        AudioSys.play('throw');
        break;
      }
      case 'boomerang': {
        for (let i = 0; i < st.count; i++) {
          const a = aim + (i - (st.count - 1) / 2) * 0.22;
          this.shots.push({
            kind: 'boomer', x: p.x, y: p.y - 6,
            dirx: Math.cos(a), diry: Math.sin(a), speed: st.speed,
            traveled: 0, range: st.range, r: st.size * gs, dmg: st.dmg,
            phase: 'out', spin: rand(0, TAU), hits: new Map(), life: 6,
          });
        }
        AudioSys.play('throw');
        break;
      }
      case 'canteen': {
        for (let i = 0; i < st.count; i++) {
          let tx, ty;
          const targets = this.queryEnemies(p.x, p.y, st.range);
          if (targets.length) {
            const e = pick(targets);
            tx = e.x + rand(-20, 20); ty = e.y + rand(-20, 20);
          } else {
            const a = rand(0, TAU), d = rand(90, 220);
            tx = p.x + Math.cos(a) * d; ty = p.y + Math.sin(a) * d;
          }
          this.bombs.push({ type: 'puddle', sx: p.x, sy: p.y - 10, tx, ty, x: p.x, y: p.y, t: 0, fuse: 0.5, radius: st.radius, dps: st.dps, dur: st.dur });
        }
        break;
      }
      case 'bugle': {
        this.rings.push({ x: p.x, y: p.y, r: 14, max: st.radius, speed: 460, dmg: st.dmg, knock: st.knock, stun: st.stun, hit: new Set() });
        AudioSys.play('bugle');
        break;
      }
    }
  }

  // ---------------- projectiles ----------------
  updateShots(dt) {
    const p = this.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      let remove = false;

      if (s.kind === 'boomer') {
        s.spin += 13 * dt;
        if (s.phase === 'out') {
          s.x += s.dirx * s.speed * dt;
          s.y += s.diry * s.speed * dt;
          s.traveled += s.speed * dt;
          if (s.traveled >= s.range) s.phase = 'back';
        } else {
          const dx = p.x - s.x, dy = p.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          s.x += dx / d * s.speed * 1.2 * dt;
          s.y += dy / d * s.speed * 1.2 * dt;
          if (d < 26) remove = true;
        }
        s.life -= dt;
        if (s.life <= 0) remove = true;
        const hits = this.queryEnemies(s.x, s.y, s.r);
        for (const e of hits) {
          const last = s.hits.get(e);
          if (last != null && this.t - last < 0.4) continue;
          s.hits.set(e, this.t);
          this.dealDamage(e, s.dmg, { knock: 60, fx: s.x, fy: s.y });
        }
        if (remove) this.shots.splice(i, 1);
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) { this.shots.splice(i, 1); continue; }

      const hits = this.queryEnemies(s.x, s.y, s.r);
      for (const e of hits) {
        if (s.kind === 'flame') {
          this.dealDamage(e, s.dmg, { small: true, color: '#ffb347' });
          this.applyBurn(e, s.burnDps, s.burnDur);
          remove = true;
          break;
        }
        // A stone overlaps a surviving enemy for several frames; without a
        // hit record the pierce charge is burned re-hitting the same target.
        if (s.hit && s.hit.has(e)) continue;
        this.dealDamage(e, s.dmg, { knock: 70, fx: s.x, fy: s.y });
        if (s.pierce > 0) {
          s.pierce--;
          (s.hit || (s.hit = new Set())).add(e);
        } else {
          remove = true;
          break;
        }
      }
      if (remove) this.shots.splice(i, 1);
    }
  }

  updateBombs(dt) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.fuse);
      b.x = lerp(b.sx, b.tx, k);
      b.y = lerp(b.sy, b.ty, k) - Math.sin(k * Math.PI) * 46;
      if (b.t >= b.fuse) {
        if (b.type === 'boom') {
          this.spawnBoom(b.tx, b.ty, b.radius);
          this.shakeAdd(4);
          AudioSys.play('boom');
          const hits = this.queryEnemies(b.tx, b.ty, b.radius);
          for (const e of hits) {
            this.dealDamage(e, b.dmg, { knock: 240, fx: b.tx, fy: b.ty });
          }
        } else {
          this.puddles.push({ x: b.tx, y: b.ty, r: b.radius, dps: b.dps, life: b.dur, tick: 0 });
          AudioSys.play('splash');
        }
        this.bombs.splice(i, 1);
      }
    }
  }

  updatePuddles(dt) {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      pd.life -= dt;
      pd.tick -= dt;
      if (pd.tick <= 0) {
        pd.tick += 0.25;
        const hits = this.queryEnemies(pd.x, pd.y, pd.r);
        for (const e of hits) {
          this.dealDamage(e, pd.dps * 0.25, { small: true, quiet: true, noCrit: true, color: '#7ec8e8' });
        }
      }
      if (pd.life <= 0) this.puddles.splice(i, 1);
    }
  }

  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      const prev = rg.r;
      rg.r += rg.speed * dt;
      const hits = this.queryEnemies(rg.x, rg.y, rg.r + 20);
      for (const e of hits) {
        if (rg.hit.has(e)) continue;
        const d = Math.hypot(e.x - rg.x, e.y - rg.y);
        if (d <= rg.r + e.r && d >= prev - e.r - 6) {
          rg.hit.add(e);
          this.dealDamage(e, rg.dmg, { knock: rg.knock, fx: rg.x, fy: rg.y });
          if (rg.stun > 0 && !e.boss) e.stunT = Math.max(e.stunT || 0, rg.stun);
        }
      }
      if (rg.r >= rg.max) this.rings.splice(i, 1);
    }
    for (let i = this.swings.length - 1; i >= 0; i--) {
      const sw = this.swings[i];
      sw.t += dt;
      if (sw.t >= sw.dur) this.swings.splice(i, 1);
    }
  }

  updateEshots(dt) {
    const p = this.player;
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const s = this.eshots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) { this.eshots.splice(i, 1); continue; }
      if (dist2(s.x, s.y, p.x, p.y) < (s.r + p.r) * (s.r + p.r)) {
        this.damagePlayer(s.dmg, s.x, s.y, s.kind);
        this.eshots.splice(i, 1);
      }
    }
  }

  // ---------------- loot ----------------
  updateLoot(dt) {
    const p = this.player;
    const mr2 = this.magnetR * this.magnetR;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (g.attracted || d2 < mr2) {
        g.attracted = true;
        const d = Math.sqrt(d2) || 1;
        const sp = 540;
        g.x += (p.x - g.x) / d * sp * dt;
        g.y += (p.y - g.y) / d * sp * dt;
        if (d < 18) {
          this.gems.splice(i, 1);
          this.gainXP(g.v);
          this.gemCombo = Math.min(14, this.gemCombo + 1);
          this.gemComboT = 0.9;
          AudioSys.play('pickup', { pitch: 1 + this.gemCombo * 0.05 });
        }
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t += dt;
      const d2 = dist2(pk.x, pk.y, p.x, p.y);
      if (d2 < (this.magnetR * 0.8) * (this.magnetR * 0.8)) {
        const d = Math.sqrt(d2) || 1;
        pk.x += (p.x - pk.x) / d * 300 * dt;
        pk.y += (p.y - pk.y) / d * 300 * dt;
        if (d < 20) {
          this.pickups.splice(i, 1);
          if (pk.type === 'cocoa') {
            p.hp = Math.min(p.maxhp, p.hp + 25);
            this.spawnNum(p.x, p.y - 26, '+25', '#7ec87e', true);
            AudioSys.play('heal');
          } else if (pk.type === 'magnet') {
            for (const g of this.gems) g.attracted = true;
            AudioSys.play('magnet');
          } else if (pk.type === 'chest') {
            this.grantChest();
          }
        }
      }
    }
  }

  // ---------------- fx update ----------------
  updateFx(dt) {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += dt;
      if (c.t >= c.dur) this.corpses.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const pa = this.parts[i];
      pa.t += dt;
      if (pa.t >= pa.life) { this.parts.splice(i, 1); continue; }
      if (pa.vx != null) {
        pa.x += pa.vx * dt;
        pa.y += pa.vy * dt;
        if (pa.kind === 'wisp') {
          pa.x += Math.sin(pa.t * 9) * 14 * dt;
        } else {
          pa.vx *= Math.pow(0.1, dt);
          pa.vy *= Math.pow(0.1, dt);
        }
        if (pa.kind === 'puff') pa.y -= 14 * dt;
      }
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += dt;
      n.y -= 34 * dt;
      if (n.t > 0.75) this.nums.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt * 26);
    this.shakeX = rand(-1, 1) * this.shake;
    this.shakeY = rand(-1, 1) * this.shake;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    this.flashGold = Math.max(0, this.flashGold - dt * 1.4);
    this.bossFlash = Math.max(0, (this.bossFlash || 0) - dt * 0.9);
    if (this.barkNow) {
      this.barkNow.t -= dt;
      if (this.barkNow.t <= 0) this.barkNow = null;
    }
    // fireflies wander near the camera
    for (const f of this.fireflies) {
      f.a += rand(-1.4, 1.4) * dt;
      f.x += Math.cos(f.a) * 26 * dt;
      f.y += Math.sin(f.a) * 26 * dt;
      const dx = f.x - this.cam.x, dy = f.y - this.cam.y;
      if (Math.abs(dx) > 700) f.x = this.cam.x - Math.sign(dx) * 680;
      if (Math.abs(dy) > 500) f.y = this.cam.y - Math.sign(dy) * 480;
    }
  }

  // ---------------- render ----------------
  render(ctx, W, H) {
    const p = this.player;
    this.cam.x = p.x;
    this.cam.y = p.y;

    ctx.fillStyle = '#131a11';
    ctx.fillRect(0, 0, W, H);

    const Z = ZOOM * this.zoomF;
    ctx.save();
    ctx.translate(W / 2 + this.shakeX, H / 2 + this.shakeY);
    ctx.scale(Z, Z);
    ctx.translate(-this.cam.x, -this.cam.y);

    const vw = W / Z, vh = H / Z;
    this.renderGround(ctx, vw, vh);

    // puddles under everything
    for (const pd of this.puddles) {
      const a = clamp(pd.life, 0, 1) * 0.4;
      ctx.fillStyle = 'rgba(110,190,230,' + (a * 0.55) + ')';
      ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.r, pd.r * 0.62, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(180,230,250,' + a + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,250,255,' + (a * 0.9) + ')';
      for (let i = 0; i < 3; i++) {
        const gx = pd.x + Math.cos(this.t * 2 + i * 2.1) * pd.r * 0.5;
        const gy = pd.y + Math.sin(this.t * 3 + i * 1.7) * pd.r * 0.3;
        ctx.beginPath(); ctx.arc(gx, gy, 2, 0, TAU); ctx.fill();
      }
    }

    // bugspray aura
    const spray = this.weapons.find(w => w.id === 'bugspray');
    if (spray) {
      const r = spray.stats.radius;
      const pulse = 1 + Math.sin(this.t * 3) * 0.03;
      ctx.fillStyle = 'rgba(120,190,90,0.10)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * pulse, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(140,210,110,0.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // charge telegraphs under entities
    for (const e of this.enemies) {
      if (e.ai && e.ai.telegraph) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.ai.telegraph.a);
        ctx.fillStyle = 'rgba(220,60,40,0.16)';
        ctx.fillRect(0, -e.r, e.ai.telegraph.len, e.r * 2);
        ctx.restore();
      }
    }

    // gems
    for (const g of this.gems) {
      const bobY = Math.sin(this.t * 4 + g.ph) * 2.5;
      const name = g.v >= 25 ? 'badge3' : (g.v >= 5 ? 'badge2' : 'badge1');
      SPR.draw(ctx, name, g.x, g.y + bobY, 15);
    }
    // pickups
    for (const pk of this.pickups) {
      const bobY = Math.sin(this.t * 3 + pk.t) * 3;
      if (pk.type === 'chest') {
        ctx.fillStyle = 'rgba(244,197,66,' + (0.16 + Math.sin(this.t * 5) * 0.06) + ')';
        ctx.beginPath(); ctx.arc(pk.x, pk.y + bobY, 22, 0, TAU); ctx.fill();
      }
      SPR.draw(ctx, pk.type === 'chest' ? 'chest' : pk.type, pk.x, pk.y + bobY, pk.type === 'chest' ? 26 : 21);
    }

    // death pops: white silhouette inflates and bursts
    for (const c of this.corpses) {
      const k = c.t / c.dur;
      SPR.drawBottom(ctx, c.spr, c.x, c.y, c.w * (1 + k * 0.45), {
        flip: c.flip, white: true, alpha: 0.9 * (1 - k), squash: 1 - k * 0.25,
      });
    }

    // y-sorted entities
    this.enemies.sort((a, b) => a.y - b.y);
    let drewPlayer = false;
    for (const e of this.enemies) {
      if (!drewPlayer && e.y > p.y) { this.renderPlayer(ctx); drewPlayer = true; }
      this.renderEnemy(ctx, e);
    }
    if (!drewPlayer) this.renderPlayer(ctx);

    // swings (hatchet arcs)
    for (const sw of this.swings) {
      const k = sw.t / sw.dur;
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.rotate(sw.a);
      ctx.fillStyle = 'rgba(240,235,220,' + (0.35 * (1 - k)) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, sw.range, -sw.arc / 2 + k * 0.5, sw.arc / 2 + k * 0.5);
      ctx.arc(0, 0, sw.range * 0.35, sw.arc / 2 + k * 0.5, -sw.arc / 2 + k * 0.5, true);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // player shots
    for (const s of this.shots) {
      if (s.kind === 'pebble') {
        ctx.fillStyle = '#cfc9b8';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(60,50,40,0.5)';
        ctx.beginPath(); ctx.arc(s.x + 1, s.y + 1, s.r * 0.5, 0, TAU); ctx.fill();
      } else if (s.kind === 'flame') {
        const k = 1 - s.life / s.maxlife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rr = s.r * (0.7 + k * 1.1);
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
        grd.addColorStop(0, 'rgba(255,230,150,' + (0.9 * (1 - k)) + ')');
        grd.addColorStop(0.5, 'rgba(255,130,40,' + (0.55 * (1 - k)) + ')');
        grd.addColorStop(1, 'rgba(200,40,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (s.kind === 'boomer') {
        SPR.draw(ctx, 'boomer', s.x, s.y, s.r * 2.2, { rot: s.spin });
      }
    }

    // bombs in flight
    for (const b of this.bombs) {
      if (b.type === 'boom') {
        SPR.draw(ctx, 'bomb', b.x, b.y, 13, { rot: b.t * 9 });
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,210,110,0.9)';
        ctx.beginPath(); ctx.arc(b.x + rand(-2, 2), b.y - 9 + rand(-2, 2), 2, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(126,200,232,0.9)';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, 5, 7, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(230,250,255,0.8)';
        ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 2, 1.6, 0, TAU); ctx.fill();
      }
    }

    // enemy shots
    for (const s of this.eshots) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2);
      grd.addColorStop(0, 'rgba(255,120,200,0.9)');
      grd.addColorStop(0.5, 'rgba(180,40,160,0.5)');
      grd.addColorStop(1, 'rgba(120,10,120,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f8d8f0';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, TAU); ctx.fill();
    }

    // bugle rings
    for (const rg of this.rings) {
      const k = rg.r / rg.max;
      ctx.strokeStyle = 'rgba(244,197,66,' + (0.65 * (1 - k)) + ')';
      ctx.lineWidth = 5 * (1 - k) + 1.5;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, TAU); ctx.stroke();
    }

    // particles
    for (const pa of this.parts) {
      const k = pa.t / pa.life;
      if (pa.kind === 'puff') {
        ctx.fillStyle = 'rgba(40,36,44,' + (0.5 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * (1 + k * 1.4), 0, TAU); ctx.fill();
      } else if (pa.kind === 'ember') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,' + Math.round(170 - k * 120) + ',60,' + (0.85 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * (1 - k * 0.5), 0, TAU); ctx.fill();
        ctx.restore();
      } else if (pa.kind === 'spark') {
        ctx.fillStyle = pa.color || '#f4c542';
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (pa.kind === 'ring') {
        ctx.strokeStyle = 'rgba(255,200,120,' + (0.8 * (1 - k)) + ')';
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * k, 0, TAU); ctx.stroke();
      } else if (pa.kind === 'wisp') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createRadialGradient(pa.x, pa.y, 0, pa.x, pa.y, pa.size * 3);
        grd.addColorStop(0, 'rgba(255,80,50,' + (0.7 * (1 - k)) + ')');
        grd.addColorStop(1, 'rgba(255,30,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * 3, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    // fireflies
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fireflies) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 2.2 + f.ph));
      ctx.fillStyle = 'rgba(190,230,120,' + a + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // damage numbers
    for (const n of this.nums) {
      const k = n.t / 0.75;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = (n.big ? 'bold 15px' : 'bold 11px') + ' Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,8,6,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(n.txt, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.txt, n.x, n.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // screen-space overlays
    if (this.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(180,30,20,' + (this.hurtFlash * 0.4) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.bossFlash > 0) {
      ctx.fillStyle = 'rgba(150,15,10,' + (this.bossFlash * 0.3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flashGold > 0) {
      ctx.fillStyle = 'rgba(244,197,66,' + (this.flashGold * 0.18) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.phase === 'dawn' || this.phase === 'win') {
      const k = clamp(this.phaseT / 2.4, 0, 1);
      ctx.fillStyle = 'rgba(255,244,214,' + (k * 0.85) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.phase === 'dying') {
      const k = clamp(this.phaseT / 1.5, 0, 1);
      ctx.fillStyle = 'rgba(10,2,2,' + (k * 0.7) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // crosshair
    if (this.phase === 'play') {
      const cx = INPUT.mx, cy = INPUT.my;
      const sc = INPUT.fire ? 0.82 : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.strokeStyle = 'rgba(244,197,66,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
      ctx.beginPath();
      [[0, -14, 0, -6], [0, 14, 0, 6], [-14, 0, -6, 0], [14, 0, 6, 0]].forEach(l => {
        ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]);
      });
      ctx.stroke();
      ctx.fillStyle = 'rgba(244,197,66,0.9)';
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  renderGround(ctx, vw, vh) {
    const CS = 96;
    const x0 = Math.floor((this.cam.x - vw / 2) / CS) - 1;
    const x1 = Math.floor((this.cam.x + vw / 2) / CS) + 1;
    const y0 = Math.floor((this.cam.y - vh / 2) / CS) - 1;
    const y1 = Math.floor((this.cam.y + vh / 2) / CS) + 1;

    // soft mottling
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const h = hash2(cx, cy);
        if (h % 5 === 0) {
          ctx.fillStyle = 'rgba(28,40,24,0.5)';
          ctx.beginPath();
          ctx.ellipse(cx * CS + (h % 60), cy * CS + (h % 47), 50 + (h % 30), 34 + (h % 22), 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    // rune circles on a coarser grid
    const RS = CS * 5;
    const rx0 = Math.floor((this.cam.x - vw / 2) / RS) - 1;
    const rx1 = Math.floor((this.cam.x + vw / 2) / RS) + 1;
    const ry0 = Math.floor((this.cam.y - vh / 2) / RS) - 1;
    const ry1 = Math.floor((this.cam.y + vh / 2) / RS) + 1;
    for (let cx = rx0; cx <= rx1; cx++) {
      for (let cy = ry0; cy <= ry1; cy++) {
        const h = hash2(cx * 7 + 3, cy * 11 + 5);
        if (h % 3 === 0) {
          SPR.draw(ctx, 'rune', cx * RS + RS / 2 + (h % 120) - 60, cy * RS + RS / 2 + ((h >> 4) % 120) - 60, 170);
        }
      }
    }
    // decorations
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const h = hash2(cx, cy);
        const m = h % 97;
        const px = cx * CS + 12 + (h % 72);
        const py = cy * CS + 12 + ((h >> 6) % 72);
        if (m < 22) SPR.draw(ctx, (h & 1) ? 'grass1' : 'grass2', px, py, 24);
        else if (m < 30) SPR.draw(ctx, 'stone', px, py, 22);
        else if (m < 34) SPR.draw(ctx, 'mush', px, py, 16);
        else if (m < 37) SPR.draw(ctx, 'bone', px, py, 22);
      }
    }
  }

  renderPlayer(ctx) {
    const p = this.player;
    if (this.phase === 'dying' || this.phase === 'over') {
      // full death scene: body down, hat tossed, ghost rises, stars spin
      const k = clamp(this.phaseT / 2.3, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.5, p.r * 0.45, 0, 0, TAU); ctx.fill();
      SPR.drawBottom(ctx, this.char.spr, p.x, p.y + p.r, 34, {
        rot: Math.PI / 2 * Math.min(1, this.phaseT * 4),
        squash: 0.94,
      });
      if (this.deathHat) {
        SPR.draw(ctx, 'hat_' + this.charId, this.deathHat.x, this.deathHat.y, 22, { rot: this.deathHat.rot });
      }
      if (this.phaseT > 0.45) {
        const gk = clamp((this.phaseT - 0.45) / 1.85, 0, 1);
        const gx = p.x + Math.sin(this.phaseT * 3.2) * 7;
        const gy = p.y - 10 - gk * 58;
        SPR.draw(ctx, 'ghost', gx, gy, 26 + gk * 8, {
          alpha: gk < 0.75 ? 0.9 : 0.9 * (1 - (gk - 0.75) / 0.25),
          squash: 1 + Math.sin(this.phaseT * 6) * 0.06,
        });
      }
      // dizzy stars over the body
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + i * TAU / 3;
        const sx = p.x + Math.cos(a) * 14;
        const sy = p.y - 6 + Math.sin(a) * 4;
        ctx.fillStyle = 'rgba(244,197,66,' + (0.75 - k * 0.4) + ')';
        ctx.font = 'bold 9px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('*', sx, sy);
      }
      return;
    }
    if (this.phase === 'dawn' || this.phase === 'win') {
      const hop = Math.abs(Math.sin(this.t * 7)) * 9;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.15, p.r * 0.42, 0, 0, TAU); ctx.fill();
      SPR.drawBottom(ctx, this.char.spr, p.x, p.y + p.r - hop, 34, { squash: 1.05 });
      return;
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.15, p.r * 0.42, 0, 0, TAU); ctx.fill();

    const flicker = p.iframe > 0 && Math.floor(this.t * 18) % 2 === 0;
    SPR.drawScout(ctx, this.charId, p.x, p.y + p.r, 34, {
      flip: p.face < 0,
      phase: this.walkPhase || 0,
      moving: p.moving,
      squash: p.moving ? 1 : 1 + Math.sin(this.t * 2.4) * 0.015,
      alpha: flicker ? 0.35 : 1,
    });

    // held weapon aimed at cursor
    if (this.char.held) {
      const a = this.aimAngle;
      const off = 15 - this.recoil * 26;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * off, p.y - 8 + Math.sin(a) * off);
      ctx.rotate(a + (p.face < 0 ? Math.PI : 0));
      if (p.face < 0) ctx.scale(-1, 1);
      SPR.draw(ctx, this.char.held, 6, 0, 26);
      ctx.restore();
      if (this.recoil > 0.08) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const mx = p.x + Math.cos(a) * (off + 16), my = p.y - 8 + Math.sin(a) * (off + 16);
        ctx.fillStyle = 'rgba(255,220,140,' + this.recoil * 3 + ')';
        ctx.beginPath(); ctx.arc(mx, my, 5, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    this.renderBark(ctx);
  }

  renderBark(ctx) {
    if (!this.barkNow) return;
    const p = this.player;
    const alpha = Math.min(1, this.barkNow.t / 0.4);
    const text = this.barkNow.text;
    ctx.font = 'bold 11px Verdana, sans-serif';
    // wrap into at most two lines
    let lines = [text];
    if (text.length > 26) {
      const mid = text.lastIndexOf(' ', Math.ceil(text.length / 2) + 4);
      if (mid > 0) lines = [text.slice(0, mid), text.slice(mid + 1)];
    }
    const w = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bx = p.x, by = p.y - 52 - (lines.length - 1) * 13;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(14,16,20,0.92)';
    ctx.strokeStyle = 'rgba(217,210,192,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx - w / 2 - 9, by - 14, w + 18, 14 * lines.length + 12, 7);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + 14 * lines.length - 2);
    ctx.lineTo(bx + 5, by + 14 * lines.length - 2);
    ctx.lineTo(bx, by + 14 * lines.length + 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,16,20,0.92)'; ctx.fill();
    ctx.fillStyle = '#e8e0cc';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx, by + i * 14));
    ctx.globalAlpha = 1;
  }

  renderEnemy(ctx, e) {
    if (e.dead) return;
    const yB = e.y + e.r;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.05, e.r * 0.38, 0, 0, TAU); ctx.fill();

    if (e.boss) {
      const pulse = 0.22 + Math.sin(this.t * 3.5) * 0.06;
      ctx.fillStyle = 'rgba(190,30,20,' + pulse + ')';
      ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.9, e.r * 0.72, 0, 0, TAU); ctx.fill();
    } else if (e.elite) {
      ctx.strokeStyle = 'rgba(220,60,40,' + (0.5 + Math.sin(this.t * 5) * 0.2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.5, e.r * 0.6, 0, 0, TAU); ctx.stroke();
    }

    // per-species gait
    let squash = 1 + Math.sin(this.t * 8 + e.bob) * 0.05;
    let hopY = 0;
    let gaitRot = Math.sin(this.t * 9 + e.bob) * 0.06 * (e.flip ? -1 : 1);
    if (e.move === 'hop' || e.move === 'bosshare') {
      if (e.ai && e.ai.state === 'hop') {
        const k = e.ai.k || 0;
        hopY = Math.sin(k * Math.PI) * (e.boss ? 30 : 16);
        squash = 1.14 - Math.sin(k * Math.PI) * 0.18;
        gaitRot = (e.flip ? 0.1 : -0.1);
      } else {
        squash = 0.95 + Math.sin(this.t * 6 + e.bob) * 0.02;
        gaitRot = 0;
      }
    } else if (e.spr === 'bat') {
      squash = 1 + Math.sin(this.t * 17 + e.bob) * 0.13;   // wingbeat
      hopY = Math.sin(this.t * 5 + e.bob) * 5 + 8;         // hover
      gaitRot = Math.sin(this.t * 3 + e.bob) * 0.08;
    } else if (e.move === 'charge' && e.ai && e.ai.state === 'charge') {
      gaitRot = (e.flip ? 0.16 : -0.16);                    // headlong lean
      squash = 0.94;
    } else if (e.move === 'charge' && e.ai && e.ai.state === 'windup') {
      gaitRot = Math.sin(this.t * 40) * 0.05;               // trembling
      squash = 1.06;
    } else if (e.stunT > 0) {
      gaitRot = Math.sin(this.t * 20) * 0.08;
      squash = 0.97;
    }
    const drawY = yB - hopY;
    const o = { flip: e.flip, squash, rot: gaitRot, alpha: e.stunT > 0 ? 0.85 : 1 };
    SPR.drawBottom(ctx, e.spr, e.x, drawY, e.w, o);
    if (e.flash > 0) {
      o.white = true;
      o.alpha = clamp(e.flash / 0.1, 0, 1) * 0.75;
      SPR.drawBottom(ctx, e.spr, e.x, drawY, e.w, o);
    }
    // burning
    if (e.burnT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const fx = e.x + Math.sin(this.t * 9 + i * 2.4 + e.bob) * e.r * 0.5;
        const fy = drawY - e.r - Math.abs(Math.sin(this.t * 7 + i)) * 6;
        ctx.fillStyle = 'rgba(255,150,50,0.55)';
        ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // possessed eye glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = 0.32 + 0.2 * Math.sin(this.t * 5 + e.bob);
    for (const [ex, ey] of SPR.eyePositions(e.spr, e.x, drawY, e.w, e.flip, squash)) {
      const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, e.boss ? 9 : 5);
      grd.addColorStop(0, 'rgba(255,60,30,' + glow + ')');
      grd.addColorStop(1, 'rgba(255,30,10,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(ex, ey, e.boss ? 9 : 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // windup warning
    if (e.ai && e.ai.state === 'windup') {
      ctx.font = 'bold 16px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5b45';
      ctx.strokeStyle = 'rgba(10,5,5,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText('!', e.x, drawY - e.w * SPR.height(e.spr, 1) - 8);
      ctx.fillText('!', e.x, drawY - e.w * SPR.height(e.spr, 1) - 8);
    }
  }
}

// debug hooks (harmless in production, invaluable in test)
window.MBM = {
  get game() { return window.App ? App.game : null; },
  skip(t) { if (App.game) App.game.time = t; },
  god() { if (App.game) App.game.player.god = !App.game.player.god; return App.game.player.god; },
  levelup() { if (App.game) App.game.gainXP(App.game.xpNext + 1); },
};
