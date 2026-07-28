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
      in: { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, dodge: false },
    };
    this.players = [this.player];

    // Room-system fields. The open-field run leaves them at these values;
    // later waves fill them in.
    this.room = null;
    this.act = 1;
    this.roomIdx = 0;
    this.coins = 0;
    this.props = [];
    this.zones = [];
    this.nextId = 1;
    this._threat = null;

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

  // Difficulty clock. Rooms will set _threat directly; until then it is the
  // minute count the director has always scaled on.
  get threat() {
    return this._threat != null ? this._threat : this.time / 60;
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

  // ---------------- input ----------------
  // The one place the simulation touches the raw INPUT globals. Everything
  // downstream reads player.in, so a pad, a touch stick or a replay can feed
  // the same frame shape.
  readInput() {
    const p = this.player;
    const k = INPUT.keys;
    let moveX = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let moveY = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const il = 1 / Math.hypot(moveX, moveY);
      moveX *= il; moveY *= il;
    }
    const W = window.innerWidth, H = window.innerHeight;
    const aimX = this.cam.x + (INPUT.mx - W / 2) / ZOOM;
    const aimY = this.cam.y + (INPUT.my - H / 2) / ZOOM;
    const dodge = INPUT.dodge === true;
    if (dodge) INPUT.dodge = false;
    p.in = { moveX, moveY, aimX, aimY, fire: INPUT.fire, dodge };
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
    if (this.phase === 'transit') {
      Transition.update(this, rawDt);
      return;
    }
    if (this.phase !== 'play') return;

    this.readInput();

    // big moments chew time: level ups, boss entrances, chests
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      dt *= 0.12;
    }

    this.time += dt;
    const p = this.player;

    // movement
    const ax = p.in.moveX, ay = p.in.moveY;
    p.moving = (ax !== 0 || ay !== 0);
    if (p.moving) {
      p.x += ax * this.speed * dt;
      p.y += ay * this.speed * dt;
      p.lastDir.x = ax; p.lastDir.y = ay;
      this.walkPhase = (this.walkPhase || 0) + dt * (this.speed / 13);
    }
    p.iframe = Math.max(0, p.iframe - dt);
    if (this.regen > 0) p.hp = Math.min(p.maxhp, p.hp + this.regen * dt);

    // aim at the cursor (world space)
    const dxm = p.in.aimX - p.x, dym = p.in.aimY - p.y;
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
      const wantsFire = def.kind === 'manual' ? p.in.fire : true;
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
        for (let i = 0; i < st.count; i++) {
          let tx = p.in.aimX + (i > 0 ? rand(-40, 40) : 0);
          let ty = p.in.aimY + (i > 0 ? rand(-40, 40) : 0);
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
}

Game.prototype.gainCoins = function (n) {
  this.coins += n;
};

// debug hooks (harmless in production, invaluable in test)
window.MBM = {
  get game() { return window.App ? App.game : null; },
  skip(t) { if (App.game) App.game.time = t; },
  god() { if (App.game) App.game.player.god = !App.game.player.god; return App.game.player.god; },
  levelup() { if (App.game) App.game.gainXP(App.game.xpNext + 1); },
  warp(act, room) { console.log('warp: room system not landed yet'); },
  clear() {
    if (!App.game) return;
    for (const e of App.game.enemies) {
      if (!e.boss && !e.dead) App.game.killEnemy(e, true);
    }
  },
  coins(n) { if (App.game) App.game.gainCoins(n); },
};
