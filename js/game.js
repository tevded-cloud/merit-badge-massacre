// Merit Badge Massacre: core game engine. The director (spawning, enemy AI,
// bosses, events) lives in director.js and extends Game.prototype.
'use strict';

const TAU = Math.PI * 2;
const ZOOM = 1.5;

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

// Reveille's speed burst. Applied where the player is integrated, never to
// this.speed, which dodge.js reads and recalc() owns.
const HASTE_MUL = 1.3;

class Game {
  constructor(charId) {
    const c = DATA.characters[charId];
    this.charId = charId;
    this.char = c;

    // 3.0 substrate. A night starts with an empty bus: nothing a previous run
    // registered can reach this one. Trait sets start empty, which is the
    // state that makes every projectile behave exactly as it did in 2.0.
    Hooks.clear();
    this.relics = [];
    this.shotTraits = Traits.NONE;    // rides every projectile
    this.strikeTraits = Traits.NONE;  // the 'any' scope subset: chops, auras, blasts
    this.dashTraits = Traits.NONE;    // rides the dodge roll
    this._tDepth = 0;                 // reentrancy guard for the trait pipeline
    this._chainSet = new Set();       // scratch for chain, allocated once
    this._decoy = null;
    const hearty = META.rank('hearty') * 12;
    this.player = {
      x: 0, y: 0, r: 11, hp: c.hp + hearty, maxhp: c.hp + hearty,
      face: 1, moving: false, lastDir: { x: 1, y: 0 },
      iframe: 0, god: false,
      // active skill state: Ember Drag's armed window, Reveille's speed burst
      emberArm: 0, hasteT: 0,
      in: { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, dodge: false, skill: false },
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

    // One active skill per night, on a button, granted here: the highest
    // priority one the player has actually earned. A run with no merit badge
    // for any of them gets null, and every skill hook below reads that as
    // "there is no button" rather than as a reason to throw.
    this.skill = this.grantSkill();
    this.emberTrail = [];
    this._wasDashing = false;

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

    // The scout's own dodge flavour, said in the dash vocabulary. Junie's
    // burn trail and Gus's barge are trait sets now, not branches in
    // dodge.js, which is what lets an item that adds frost to a dash compose
    // with her fire instead of arguing with it.
    this.rebuildTraits();
    Hooks.emit('onRunStart', this);
  }

  // ---------------- 3.0 substrate ----------------

  // Every projectile in the game comes through this door. set defaults to the
  // run's granted traits; a caller that has its own set (a split child
  // inheriting its parent's) passes it explicitly.
  armShot(s, set) {
    return Traits.arm(this, s, (set === undefined || set === null) ? this.shotTraits : set);
  }

  // Fold every relic's grants into the three sets the run walks. Called
  // whenever the build changes, never per frame.
  rebuildTraits() {
    let shot = null;
    let dash = null;
    const mods = { charges: 0, cdMul: 1, distMul: 1, iframeAdd: 0 };

    // The scout's own dodge flavour is a trait set like any other. A
    // character authored before the vocabulary existed is compiled from its
    // old flags, so Junie's fire and Gus's shoulder are in the same list an
    // item writes into and compose with it instead of fighting it.
    const cd = this.char && this.char.dodge;
    if (cd) {
      const own = cd.traits || (this.legacyDashTraits ? this.legacyDashTraits(cd) : null);
      if (own) { dash = []; for (const t of own) dash.push(t); }
    }

    for (let i = 0; i < this.relics.length; i++) {
      const def = DATA.relics ? DATA.relics[this.relics[i]] : null;
      if (!def) continue;
      if (def.shotTraits) { if (shot === null) shot = []; for (const t of def.shotTraits) shot.push(t); }
      if (def.dashTraits) { if (dash === null) dash = []; for (const t of def.dashTraits) dash.push(t); }
      const d = def.dash;
      if (d) {
        if (d.charges) mods.charges += d.charges;
        if (d.cdMul) mods.cdMul *= d.cdMul;
        if (d.distMul) mods.distMul *= d.distMul;
        if (d.iframeAdd) mods.iframeAdd += d.iframeAdd;
      }
    }

    this.dashMods = mods;
    this.shotTraits = Traits.compileShot(shot);
    this.strikeTraits = Traits.anyScope(this.shotTraits);
    this.dashTraits = Traits.compileDash(dash);
  }

  // Take an item. Grants are data: trait lists get folded into the run's
  // sets, hooks get registered against the item id so removing the item
  // removes them.
  addRelic(id) {
    const def = DATA.relics ? DATA.relics[id] : null;
    if (!def || this.relics.indexOf(id) !== -1) return false;
    this.relics.push(id);
    this.rebuildTraits();
    if (def.hooks) {
      for (const h of def.hooks) Hooks.on(h.on, id, h.pri || 0, h.fn);
    }
    return true;
  }

  bark(trigger) {
    const lines = (BARKS[this.charId] || {})[trigger];
    if (!lines || !lines.length) return;
    if (this.barkCds[trigger] != null && this.t - this.barkCds[trigger] < 25) return;
    this.barkCds[trigger] = this.t;
    this.barkNow = { text: pick(lines), t: 3.0, trigger };
    // Voice rides the bark: the subtitle stretches to cover the audio when
    // a line exists, and silence is a fully supported state.
    if (typeof Voice !== 'undefined' && Voice.available) {
      const v = Voice.speak(this.charId, this.barkNow.text, { priority: trigger });
      if (v && v.dur) this.barkNow.t = Math.max(3.0, v.dur + 0.4);
    }
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
    // 3.0 demonstration items. These exist to prove the substrate composes,
    // not to be balance, so they sit behind a flag a normal run never sets:
    // DATA.DEBUG_TRAITS is false in data.js and is turned on only by the
    // verification harness, by ?traits=1, or by hand from a console.
    if (DATA.DEBUG_TRAITS && DATA.relics) {
      for (const id in DATA.relics) {
        if (this.relics.indexOf(id) === -1) {
          pool.push({ kind: 'relic', id, isNew: true, lvl: 1, wgt: 12 });
        }
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
    if (c.kind === 'relic') {
      const r = DATA.relics[c.id];
      return { name: r.name, icon: r.icon, chip: 'RELIC', desc: r.desc };
    }
    const f = DATA.fillers.find(f => f.id === c.id);
    return { name: f.name, icon: f.icon, chip: 'SUPPLY', desc: f.desc };
  }

  applyChoice(c) {
    if (c.kind === 'relic') {
      this.addRelic(c.id);
    } else if (c.kind === 'weapon') {
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
      Hooks.emit('onLevelUp', this, this.level);
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
    if (e.prop) return this.damageProp(e, base * this.dmgMul, o);
    let dmg = base * this.dmgMul;
    let crit = false;
    if (!o.noCrit && Math.random() < this.critCh) { crit = true; dmg *= 2; }
    // A dash that marked this body on the way past. Undefined on every
    // critter nobody marked, so the compare is the whole cost.
    if (e.markT > 0) dmg *= (e.markMul || 1);
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
    if ((typeof SETTINGS !== 'undefined' ? SETTINGS.dmgNums : true) && (!o.small || dmg >= 9 || crit || Math.random() < 0.25)) {
      this.spawnNum(e.x + rand(-6, 6), e.y - e.r - 6, Math.round(dmg) + '', crit ? '#ffd94a' : (o.color || '#f0e8d8'), crit);
    }

    // THE ONE DOOR. Every point of player damage in this game arrives here:
    // stones, flame, boomerangs, the hand axe, orbiting knives, bug spray,
    // holy water, firecrackers, the bugle. So this is where a hit becomes an
    // event and where a trait's onHit fires, and nothing downstream of here
    // needs to know which weapon it was.
    //
    // o.src is the projectile when a projectile did it, and undefined when a
    // chop or an aura did, which is exactly the distinction a trait's scope
    // is written against. The depth guard means a handler that deals damage
    // of its own (a chain arc) cannot re-enter the pipeline.
    if (this._tDepth === 0 && !o.noTraits) {
      this._tDepth = 1;
      const tt = o.src !== undefined ? o.src.traits : this.strikeTraits;
      if (tt !== undefined && tt !== null && tt.length !== 0) {
        if (Traits.hit(this, e, tt, o.src, dmg) && o.src !== undefined) o.src._keep = true;
      }
      Hooks.emit('onHit', this, e, dmg, o.src || null);
      this._tDepth = 0;
    }

    if (e.hp <= 0) this.killEnemy(e);
  }

  applyBurn(e, dps, dur) {
    if (e.boss) dur *= 0.6;
    // Feat counter: one tick per critter set alight, guarded on the critter,
    // or a flamethrower would count the same rabbit sixty times a second.
    if (!e.burnCounted) {
      e.burnCounted = true;
      if (typeof META !== 'undefined' && META && META.counters) META.counters.burned++;
    }
    e.burnDps = Math.max(e.burnDps || 0, dps);
    e.burnT = Math.max(e.burnT || 0, dur);
  }

  // The camp's field guide. Every named thing the troop has laid eyes on, and
  // how many of them it has put down for good. Seen is never below one:
  // nothing gets killed that was never seen. Reads whatever shape the codex
  // is already in, since it has been written by more than one hand.
  recordBoss(e, killed) {
    if (!e || !e.kind) return;
    if (typeof META === 'undefined' || !META) return;
    if (!META.codex || typeof META.codex !== 'object') META.codex = {};
    const prev = META.codex[e.kind];
    let seen = 0, kills = 0;
    if (prev && typeof prev === 'object') {
      if (prev.seen > 0) seen = prev.seen;
      if (prev.killed > 0) kills = prev.killed;
      else if (prev.kills > 0) kills = prev.kills;
      else if (prev.killed === true) kills = 1;
    } else if (prev === 'killed') { seen = 1; kills = 1; }
    else if (prev) seen = 1;

    if (killed) kills++; else seen++;
    seen = Math.max(1, seen, kills);
    META.codex[e.kind] = { seen, killed: kills };

    if (killed) {
      // A downed boss is a story switch at the fire: which one depends only on
      // how deep the run had gotten when it fell.
      if (!META.flags || typeof META.flags !== 'object') META.flags = {};
      const act = this.act >= 3 ? 3 : (this.act >= 2 ? 2 : 1);
      META.flags['act' + act + 'boss'] = true;
    }
    if (typeof META.save === 'function') META.save();
  }

  killEnemy(e, noDrops) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    // Fired here, above the noDrops bail, for the same reason the codex is
    // written here: a body that went down went down, however it went down.
    // The critter still has its position, so a handler can drop something on
    // the spot it fell.
    Hooks.emit('onKill', this, e);
    // Before the noDrops bail: a bloodless sweep still killed the thing.
    if (e.boss) this.recordBoss(e, true);
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
    if (p.iframe > 0 || p.dashI > 0 || p.god || this.phase !== 'play') return;
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
    Hooks.emit('onDamaged', this, taken, kind);
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
    if (typeof SETTINGS !== 'undefined' && !SETTINGS.shake) return;
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
    for (const pr of this.props) {
      if (pr.dead) continue;
      const k = ((pr.x / CELL) | 0) + '|' + ((pr.y / CELL) | 0);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(pr);
    }
  }
  queryEnemies(x, y, r, includeProps) {
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
          if (e.prop && !includeProps) continue;
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
    // The active skill is an edge exactly like the dodge: a key, a pad button
    // or a thumb sets it, this is the one place it is spent.
    const skill = INPUT.skill === true;
    if (skill) INPUT.skill = false;
    p.in = { moveX, moveY, aimX, aimY, fire: INPUT.fire, dodge, skill };
  }

  // ---------------- update ----------------
  update(rawDt) {
    let dt = rawDt;
    this.t += rawDt;

    // The music/voice brain: a pure observer of whatever this frame's phase,
    // room and boss turn out to be, so it has to run every frame regardless
    // of which branch below returns early.
    if (typeof AudioDirector !== 'undefined' && AudioDirector) AudioDirector.update(this, rawDt);

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

    // A boss lands in the codex the frame it arrives, however it got here: the
    // spawner lives in director.js, the bookkeeping lives with the save.
    for (const e of this.enemies) {
      if (e.boss && !e.codexSeen) { e.codexSeen = true; this.recordBoss(e, false); }
    }

    // Feat counter: seconds spent one bad hit from the end of the night.
    // Nothing is written to storage here, credit() banks it when the run ends.
    if (typeof META !== 'undefined' && META && META.counters &&
        p.hp > 0 && p.hp < p.maxhp * 0.15) {
      META.counters.lowHpTime += dt;
    }

    this.updateDodge(dt);      // dodge.js, integrates its own movement
    this.updateSkill(dt);      // the one active skill, below

    // movement (a dash owns the player's position while it runs). Reveille's
    // haste is a temporary multiplier on the way out, never on this.speed
    // itself: dodge.js reads that and recalc() owns it.
    const spd = this.speed * (p.hasteT > 0 ? HASTE_MUL : 1);
    const ax = p.in.moveX, ay = p.in.moveY;
    p.moving = (ax !== 0 || ay !== 0);
    if (p.moving && !(p.dashT > 0)) {
      p.x += ax * spd * dt;
      p.y += ay * spd * dt;
      p.lastDir.x = ax; p.lastDir.y = ay;
      this.walkPhase = (this.walkPhase || 0) + dt * (spd / 13);
    }
    if (this.room) {
      const q = Collide.resolveCircle(p.x, p.y, p.r, this.room.solids);
      const c = Collide.clampToBounds(q.x, q.y, p.r, this.room.bounds);
      p.x = c.x; p.y = c.y;
    }
    p.iframe = Math.max(0, p.iframe - dt);
    if (this.regen > 0) p.hp = Math.min(p.maxhp, p.hp + this.regen * dt);

    // positional audio (campfire/torch/water/hazard emitters) tracks the
    // player from here every frame
    AudioSys.setListener(p.x, p.y);

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
    if (this.room) this.room.update(this, dt);   // room.js drives spawns
    else this.updateDirector(dt);                // director.js, open field
    this.updateEnemies(dt);    // director.js
    this.updateProps(dt);      // props.js
    this.updateEshots(dt);
    this.updateLoot(dt);
    this.updateFx(dt);
    this.sweepDead();

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
          const hits = this.queryEnemies(kx, ky, 13, true);
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
          const hits = this.queryEnemies(p.x, p.y, st.radius, true);
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
          this.shots.push(this.armShot({
            kind: 'pebble', x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16 - 8,
            vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
            dmg: st.dmg, pierce: st.pierce, r: 4.5 * gs, life: 1.5,
          }));
        }
        this.recoil = 0.15;
        AudioSys.play('shoot', { pitch: rand(0.92, 1.1) });
        break;
      }
      case 'roaster': {
        for (let i = 0; i < st.count; i++) {
          const a = aim + rand(-st.spread, st.spread);
          const sp = st.speed * rand(0.85, 1.2);
          this.shots.push(this.armShot({
            kind: 'flame', x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18 - 8,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            dmg: st.dmg, r: 9 * gs, life: st.range / st.speed, maxlife: st.range / st.speed,
            burnDps: st.burnDps, burnDur: st.burnDur,
          }));
        }
        AudioSys.play('flame');
        break;
      }
      case 'hatchet': {
        const range = st.range * (0.8 + gs * 0.25);
        this.swings.push({ x: p.x, y: p.y, a: aim, t: 0, dur: 0.2, range, arc: st.arc });
        const hits = this.queryEnemies(p.x, p.y, range, true);
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
          if (this.room) {
            const hit = Collide.segmentBlocked(this.room, p.x, p.y, tx, ty);
            if (hit) {
              const hd = Math.hypot(hit.x - p.x, hit.y - p.y);
              const back = Math.max(0, hd - 24) / (hd || 1);
              tx = p.x + (hit.x - p.x) * back;
              ty = p.y + (hit.y - p.y) * back;
            }
          }
          this.bombs.push({ type: 'boom', sx: p.x, sy: p.y - 10, tx, ty, x: p.x, y: p.y, t: 0, fuse: st.fuse, radius: st.radius * (0.8 + gs * 0.25), dmg: st.dmg });
        }
        this.recoil = 0.15;
        AudioSys.play('throw');
        break;
      }
      case 'boomerang': {
        for (let i = 0; i < st.count; i++) {
          const a = aim + (i - (st.count - 1) / 2) * 0.22;
          this.shots.push(this.armShot({
            kind: 'boomer', x: p.x, y: p.y - 6,
            dirx: Math.cos(a), diry: Math.sin(a), speed: st.speed,
            traveled: 0, range: st.range, r: st.size * gs, dmg: st.dmg,
            phase: 'out', spin: rand(0, TAU), hits: new Map(), life: 6,
          }));
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

  // The breakable solid standing in a blocked cell, damaged once, if there is
  // one. A cell can be blocked by bare room geometry or by a boulder, and
  // both of those still stop a shot dead with nothing to show for it, so this
  // returns the prop it hit or null. Damage goes through dealDamage, which
  // routes props to damageProp, so a projectile hit is worth exactly what a
  // melee hit is worth, dmgMul and all.
  damageSolidAt(s, dmg, o) {
    if (!this.props.length) return null;
    // The block grid stamps WHOLE cells, so a shot can die in a cell a prop
    // stamped while sitting well outside that prop's own hit circle: a stump
    // footprint 28 units wide blocks a 24 unit cell that reaches 20 units
    // further out. Search wide enough to cover the cell, then confirm the
    // point against the footprint that actually did the stamping. Testing the
    // hit circle instead is what left one of BRAMBLEBUCK's four mounds
    // unbreakable from one approach angle but not the others.
    const cell = (this.room && this.room.grid && this.room.grid.cell) || 24;
    const sr = s.r || 4;
    const near = this.queryEnemies(s.x, s.y, sr + cell, true);
    let best = null, bd = Infinity;
    for (const e of near) {
      if (!e.prop || e.dead) continue;
      const def = e.def;
      if (!def || !def.solid || !def.breakable) continue;
      const box = e.solidBox;
      if (box) {
        // A stamped cell reaches at most one cell beyond the box it came from.
        if (s.x < box.x0 - cell || s.x > box.x1 + cell) continue;
        if (s.y < box.y0 - cell || s.y > box.y1 + cell) continue;
      } else if (dist2(e.x, e.y, s.x, s.y) > (e.r + sr) * (e.r + sr)) {
        continue;
      }
      const d = dist2(e.x, e.y, s.x, s.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    this.dealDamage(best, dmg, Object.assign({ fx: s.x, fy: s.y }, o || {}));
    return best;
  }

  updateShots(dt) {
    const p = this.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      let remove = false;

      // ---- 3.0 trait pipeline ----------------------------------------
      // Every projectile carries a set. In a build that has granted nothing
      // the set is the shared frozen empty array, so this is one length
      // compare and the whole loop below runs exactly as it did in 2.0.
      const hasT = s.traits !== undefined && s.traits.length !== 0;
      if (hasT) {
        s._keep = false;
        // Steering, wall response and path ownership all resolve BEFORE the
        // shot integrates, so a ricochet turns on the frame it would have
        // entered the wall and the blocked-cell check never sees it.
        Traits.update(this, s, dt);
      }

      if (s.kind === 'boomer') {
        s.spin += 13 * dt;
        if (s.phase === 'out') {
          s.x += s.dirx * s.speed * dt;
          s.y += s.diry * s.speed * dt;
          s.traveled += s.speed * dt;
          if (s.traveled >= s.range) s.phase = 'back';
          else if (this.room && Collide.blockedAt(this.room, s.x, s.y)) s.phase = 'back';
        } else {
          const dx = p.x - s.x, dy = p.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          s.x += dx / d * s.speed * 1.2 * dt;
          s.y += dy / d * s.speed * 1.2 * dt;
          if (d < 26) remove = true;
        }
        s.life -= dt;
        if (s.life <= 0) remove = true;
        const hits = this.queryEnemies(s.x, s.y, s.r, true);
        for (const e of hits) {
          const last = s.hits.get(e);
          if (last != null && this.t - last < 0.4) continue;
          s.hits.set(e, this.t);
          this.dealDamage(e, s.dmg, { knock: 60, fx: s.x, fy: s.y, src: s });
        }
        if (remove) {
          if (hasT) Traits.expire(this, s);
          this.shots.splice(i, 1);
        }
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
        continue;
      }
      if (this.room && Collide.blockedAt(this.room, s.x, s.y)) {
        // A shot resolves what it hit before it dies. Most blocked cells in a
        // room are blocked BY something: a stump, a logpile, a warren mound.
        // Killing the shot on the cell first meant no projectile could ever
        // damage a solid prop, which left a slingshot or roaster build unable
        // to break BRAMBLEBUCK's mounds (an unwinnable act one) or to open the
        // cache under the logpile in a1_l_cacheline.
        this.damageSolidAt(s, s.dmg, { knock: 70 });
        this.spawnPuff(s.x, s.y, 2);
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
        continue;
      }

      const hits = this.queryEnemies(s.x, s.y, s.r, true);
      for (const e of hits) {
        if (s.kind === 'flame') {
          if (s.hit !== undefined && s.hit.has(e)) continue;
          this.dealDamage(e, s.dmg, { small: true, color: '#ffb347', src: s });
          this.applyBurn(e, s.burnDps, s.burnDur);
          // A gob of burning sugar is spent on contact, unless something a
          // trait did says otherwise. Pierce reads the same field the stone
          // reads, so a build that grants pierce grants it to the flame too.
          if (hasT && (s._keep || s.pierce > 0)) {
            if (!s._keep) s.pierce--;
            (s.hit || (s.hit = new Set())).add(e);
            s._keep = false;
            continue;
          }
          remove = true;
          break;
        }
        // A stone overlaps a surviving enemy for several frames; without a
        // hit record the pierce charge is burned re-hitting the same target.
        if (s.hit && s.hit.has(e)) continue;
        this.dealDamage(e, s.dmg, { knock: 70, fx: s.x, fy: s.y, src: s });
        // A trait can insist the shot lives: bounce turns it at somebody
        // else rather than spending it. That is checked before the pierce
        // budget, so a bounce does not cost a pierce charge.
        if (hasT && s._keep) {
          (s.hit || (s.hit = new Set())).add(e);
          s._keep = false;
          continue;
        }
        if (s.pierce > 0) {
          s.pierce--;
          (s.hit || (s.hit = new Set())).add(e);
        } else {
          remove = true;
          break;
        }
      }
      if (remove) {
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
      }
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
          const hits = this.queryEnemies(b.tx, b.ty, b.radius, true);
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
        const hits = this.queryEnemies(pd.x, pd.y, pd.r, true);
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
      const hits = this.queryEnemies(rg.x, rg.y, rg.r + 20, true);
      for (const e of hits) {
        if (rg.hit.has(e)) continue;
        const d = Math.hypot(e.x - rg.x, e.y - rg.y);
        if (d <= rg.r + e.r && d >= prev - e.r - 6) {
          rg.hit.add(e);
          // A ring that carries damage is a weapon (the Camp Bugle) and goes
          // through dealDamage exactly as it always has. A ring with no damage
          // is a shout (Reveille): it must not spawn a "0" over anybody, must
          // not play a hit sound, and must leave props standing, so it shoves
          // by hand and lets the stun below do the rest.
          if (rg.dmg > 0) {
            this.dealDamage(e, rg.dmg, { knock: rg.knock, fx: rg.x, fy: rg.y });
          } else if (!e.prop && rg.knock && !e.boss) {
            const kd = Math.max(12, d);
            e.kx = (e.kx || 0) + (e.x - rg.x) / kd * rg.knock;
            e.ky = (e.ky || 0) + (e.y - rg.y) / kd * rg.knock;
          }
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
      if (this.room && Collide.blockedAt(this.room, s.x, s.y)) {
        this.spawnPuff(s.x, s.y, 2);
        this.eshots.splice(i, 1);
        continue;
      }
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
          Hooks.emit('onPickup', this, 'gem', g.v);
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
          Hooks.emit('onPickup', this, pk.type, 1);
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
    // A dash decoy is the only thing in the world that can pull a critter's
    // attention off the scout, so it is on a short clock and it clears itself.
    if (this._decoy !== null) {
      this._decoy.life -= dt;
      if (this._decoy.life <= 0) this._decoy = null;
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

// ---------------------------------------------------------------- skills ---
// The active skill: one per run, on a button, earned with a merit badge.
// DATA.skills carries the name, the icon and the description; the numbers live
// here because data.js is the balance pass's file, not this one's. An id being
// present in DATA.skills IS the unlock gate: feats.js physically lifts a locked
// def out of that table and parks it in its vault until the badge lands.
(function () {

  // Priority order. The first one the player has earned is the one the night
  // grants: a run never carries two.
  const SKILL_ORDER = ['emberdrag', 'reveille', 'fieldstrip'];

  // Seconds. Deliberately NOT multiplied by this.cdMul: the cooldown ring on
  // the HUD should be honest about the number, and tuning is not this file's.
  const SKILL_CD = { emberdrag: 10, reveille: 14, fieldstrip: 18 };

  const ARM_WINDOW = 3;        // Ember Drag: seconds to start a dash in
  const NODE_LIFE = 2.4;       // seconds a patch of the lane keeps burning
  const NODE_R = 22;
  const NODE_GAP = 14;         // minimum spacing, so the lane is even
  const NODE_TICK = 0.2;       // seconds between a node's bites
  const NODE_BURN_DPS = 9;
  const NODE_BURN_DUR = 2.0;
  const NODE_DMG = 4;
  const TRAIL_MAX = 120;       // defensive cap, a dash drops well under ten
  const EMBER_RATE = 25;       // embers a second for the whole lane, any length
  const PART_CAP = 420;        // the budget guard used everywhere in this file

  const STRIP_MAX = 30;        // Field Strip: coins spent at most, 1 hp each
  const REVEILLE_HASTE = 2.2;  // seconds of the speed burst
  const REVEILLE_STUN = 1.2;

  // ------------------------------------------------------------ unlocking ---

  // The def, wherever it currently lives. Normally DATA.skills; the vault is
  // read as a fallback so a page that has not run syncPools yet still works.
  function defOf(id) {
    if (typeof DATA !== 'undefined' && DATA && DATA.skills && DATA.skills[id]) return DATA.skills[id];
    if (typeof Feats !== 'undefined' && Feats && typeof Feats.rewardDef === 'function') {
      try { return Feats.rewardDef({ kind: 'skill', id }) || null; } catch (e) { return null; }
    }
    return null;
  }

  // Earned? Present and unlocked in DATA.skills is the real gate. The feats
  // ledger is asked as well, and both are feature tested, so a page with
  // feats.js missing (or a save that has never heard of any of this) plays.
  function unlocked(id) {
    if (typeof DATA !== 'undefined' && DATA && DATA.skills && DATA.skills[id] && !DATA.skills[id].locked) return true;
    if (typeof Feats !== 'undefined' && Feats && typeof Feats.isUnlocked === 'function') {
      try {
        const m = (typeof META !== 'undefined') ? META : null;
        if (Feats.isUnlocked('skill', id, m)) return true;
      } catch (e) { /* a save shaped like nothing we know is simply not earned */ }
    }
    return false;
  }

  function build(id) {
    const def = defOf(id);
    if (!def) return null;
    return { id, def, cd: SKILL_CD[id] || 12, t: 0 };
  }

  // Statics, so the debug door can report without a live run.
  Game.skillIds = function () { return SKILL_ORDER.slice(); };
  Game.skillUnlocked = function (id) { return unlocked(id); };
  Game.skillPick = function () {
    for (const id of SKILL_ORDER) if (unlocked(id) && defOf(id)) return id;
    return null;
  };

  Game.prototype.grantSkill = function () {
    const id = Game.skillPick();
    return id ? build(id) : null;
  };

  // Debug only: force the live run's skill. Builds the same shape the
  // constructor builds and touches nothing on the save.
  Game.prototype.setSkill = function (id) {
    if (id == null) { this.skill = null; return null; }
    const s = build(id);
    if (!s) return null;
    this.skill = s;
    return s;
  };

  // ----------------------------------------------------------- HUD hooks ---
  // Deliberately shaped like dodgeReady and dodgeCdFrac in dodge.js.

  Game.prototype.skillInfo = function () {
    const s = this.skill;
    if (!s) return null;
    const def = s.def || {};
    return { id: s.id, name: def.name || s.id, icon: def.icon || 'knives' };
  };

  Game.prototype.skillReady = function () {
    const s = this.skill;
    return (s && s.t <= 0) ? 1 : 0;
  };

  Game.prototype.skillCdFrac = function () {
    const s = this.skill;
    if (!s) return 1;
    if (s.t <= 0) return 1;
    const cd = s.cd || SKILL_CD[s.id] || 12;
    return 1 - s.t / cd;
  };

  // ---------------------------------------------------------------- tick ---

  Game.prototype.updateSkill = function (dt) {
    const p = this.player;
    const dashing = p.dashT > 0;

    // Ember Drag hooks the dash from out here, because dodge.js owns the dash
    // and is not this unit's file. updateDodge already ran this frame, so a
    // dash that started this frame is visible right now as p.dashT > 0.
    if (dashing && !this._wasDashing) {
      if (p.emberArm > 0) {
        p.emberArm = 0;
        this._emberDash = true;
        this.dropEmberNode(p.x, p.y, true);
      }
    }
    if (!dashing) this._emberDash = false;
    this._wasDashing = dashing;
    if (this._emberDash && dashing) this.dropEmberNode(p.x, p.y, false);

    this.updateEmberTrail(dt);

    // timers. The armed window is ticked after the edge check, so a dash that
    // starts on the very frame it lapses still lights.
    if (p.emberArm > 0) p.emberArm = Math.max(0, p.emberArm - dt);
    if (p.hasteT > 0) {
      p.hasteT = Math.max(0, p.hasteT - dt);
      this._hasteSpark = (this._hasteSpark || 0) - dt;
      const movingNow = p.in && (p.in.moveX !== 0 || p.in.moveY !== 0);
      if (movingNow && this._hasteSpark <= 0 && this.parts.length < PART_CAP) {
        this._hasteSpark = 0.05;
        this.parts.push({
          kind: 'spark', x: p.x + rand(-5, 5), y: p.y + rand(-2, 8),
          vx: rand(-16, 16), vy: -rand(8, 34),
          t: 0, life: rand(0.18, 0.36), size: rand(1.1, 2), color: '#f4c542',
        });
      }
    }

    const s = this.skill;
    if (s && s.t > 0) s.t = Math.max(0, s.t - dt);

    if (p.in && p.in.skill) this.fireSkill();
  };

  // --------------------------------------------------------- the trigger ---

  Game.prototype.fireSkill = function () {
    const s = this.skill;
    if (!s) return false;
    if (this.phase !== 'play') return false;
    if (s.t > 0) return false;

    let fired = false;
    if (s.id === 'emberdrag') fired = this.fireEmberDrag();
    else if (s.id === 'fieldstrip') fired = this.fireFieldStrip();
    else if (s.id === 'reveille') fired = this.fireReveille();

    if (!fired) return false;
    s.t = s.cd;                 // the cooldown starts the moment it fires
    return true;
  };

  // Ember Drag: firing does not make fire, it arms the next dash. Arming is
  // the cost, so a window that lapses unused still spent the cooldown.
  Game.prototype.fireEmberDrag = function () {
    const p = this.player;
    p.emberArm = ARM_WINDOW;
    this.spawnPuff(p.x, p.y, 6);
    AudioSys.play('flame');
    return true;
  };

  // Field Strip: unspent Cookie Money straight into hit points. Refuses, and
  // charges nothing, when there is no money or no wound to spend it on.
  Game.prototype.fireFieldStrip = function () {
    const p = this.player;
    const n = Math.min(STRIP_MAX, Math.floor(this.coins), Math.ceil(p.maxhp - p.hp));
    if (!(n > 0)) return false;
    this.coins -= n;
    p.hp = Math.min(p.maxhp, p.hp + n);
    this.spawnNum(p.x, p.y - 26, '+' + n, '#7ec87e', true);
    this.toast('FIELD STRIP  ' + n + ' COOKIE MONEY', '#7ec87e');
    AudioSys.play('heal');
    this.spawnBurst(p.x, p.y, '#7ec87e', 16);
    this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.45, size: 70 });
    return true;
  };

  // Reveille: one blast, everything that is not a boss stops, and the bugler
  // gets a couple of seconds to be somewhere else.
  Game.prototype.fireReveille = function () {
    const p = this.player;
    this.rings.push({
      x: p.x, y: p.y, r: 14, max: 340, speed: 560,
      dmg: 0, knock: 90, stun: REVEILLE_STUN, hit: new Set(),
    });
    p.hasteT = REVEILLE_HASTE;
    AudioSys.play('bugle');
    this.shakeAdd(4);
    this.spawnBurst(p.x, p.y, '#f4c542', 14);
    this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.5, size: 90 });
    this.toast('REVEILLE', '#f4c542');
    return true;
  };

  // ---------------------------------------------------------- the burning ---

  // One patch of burning ground. Spacing is measured against the last node so
  // the lane is even however fast the dash is going.
  Game.prototype.dropEmberNode = function (x, y, force) {
    const trail = this.emberTrail || (this.emberTrail = []);
    if (!force && trail.length) {
      const last = trail[trail.length - 1];
      if (dist2(last.x, last.y, x, y) < NODE_GAP * NODE_GAP) return;
    }
    if (trail.length >= TRAIL_MAX) trail.shift();
    // The room a patch was lit in. Every room is built around the origin, so
    // without this a lane lit on the way to a door would freeze through the
    // transition (nothing ticks outside the play phase) and light up again at
    // the same coordinates in the next room. Burning ground belongs to the
    // floor it was burned into.
    trail.push({ x, y, t: 0, life: NODE_LIFE, r: NODE_R, tick: 0, room: this.room || null });
    if (this.parts.length < PART_CAP) {
      this.parts.push({ kind: 'ring', x, y, t: 0, life: 0.35, size: NODE_R * 1.1 });
    }
  };

  Game.prototype.updateEmberTrail = function (dt) {
    const trail = this.emberTrail;
    if (!trail || !trail.length) return;
    // The whole lane emits at about the same rate whatever its length, so a
    // long drag is a long fire rather than a brighter one.
    const emit = Math.min(1, (EMBER_RATE / trail.length) * dt);
    for (let i = trail.length - 1; i >= 0; i--) {
      const nd = trail[i];
      nd.t += dt;
      if (nd.t >= nd.life || nd.room !== (this.room || null)) { trail.splice(i, 1); continue; }

      nd.tick -= dt;
      if (nd.tick <= 0) {
        nd.tick += NODE_TICK;
        const hits = this.queryEnemies(nd.x, nd.y, nd.r, true);
        for (const e of hits) {
          // applyBurn is written for critters; dealDamage routes props to
          // damageProp on its own, so the second call is safe for both.
          if (!e.prop) this.applyBurn(e, NODE_BURN_DPS, NODE_BURN_DUR);
          this.dealDamage(e, NODE_DMG, { small: true, quiet: true, noCrit: true, color: '#ffb347' });
        }
      }

      if (this.parts.length < PART_CAP && Math.random() < emit) {
        const a = rand(0, TAU), rr = Math.sqrt(Math.random()) * nd.r;
        this.parts.push({
          kind: 'ember', x: nd.x + Math.cos(a) * rr, y: nd.y + Math.sin(a) * rr,
          vx: rand(-12, 12), vy: -rand(14, 40),
          t: 0, life: rand(0.35, 0.7), size: rand(1.3, 2.6),
        });
      }
    }
  };

})();

// debug hooks (harmless in production, invaluable in test)
window.MBM = {
  get game() { return typeof App !== 'undefined' && App ? App.game : null; },
  skip(t) { if (App.game) App.game.time = t; },
  god() { if (App.game) App.game.player.god = !App.game.player.god; return App.game.player.god; },
  levelup() { if (App.game) App.game.gainXP(App.game.xpNext + 1); },
  warp(act, room) {
    // Debug: jump the live run to act N, room M (1 based), skipping the
    // rooms between. Clears each intermediate room bloodlessly.
    if (!App.game || typeof Run === 'undefined' || !Run.active) { console.log('warp needs a live room run'); return; }
    const g = App.game;
    let guard = 0;
    while ((Run.act < act || (Run.act === act && Run.roomIdx < room - 1)) && !Run.finished && guard++ < 40) {
      for (const e of g.enemies) if (!e.dead) g.killEnemy(e, true);
      g.enemies.length = 0;
      // Warp skips the transition, so it must also do the transition's
      // sweeping or skipped rooms pile their props into the destination.
      g.props.length = 0; g.zones.length = 0; g.gems.length = 0;
      g.pickups.length = 0; g.shots.length = 0; g.eshots.length = 0;
      const door = (g.room && g.room.doors && g.room.doors[0]) || null;
      Run.advance(door);
    }
    g.player.x = g.room && g.room.entryPoint ? g.room.entryPoint.x : g.player.x;
    g.player.y = g.room && g.room.entryPoint ? g.room.entryPoint.y : g.player.y;
    console.log('warped to act ' + Run.act + ' room ' + (Run.roomIdx + 1));
  },
  clear() {
    if (!App.game) return;
    for (const e of App.game.enemies) {
      if (!e.boss && !e.dead) App.game.killEnemy(e, true);
    }
  },
  coins(n) { if (App.game) App.game.gainCoins(n); },
  skill(id) {
    // Debug: hand the live run an active skill without earning its merit
    // badge first. Live game object only, nothing is written to the save.
    const g = this.game;
    if (!g) { console.log('skill needs a live run'); return null; }
    if (id == null) {
      console.log('skill(id) takes one of: ' + Game.skillIds().join(', ') +
        '. current: ' + (g.skill ? g.skill.id : 'none'));
      return g.skill ? g.skill.id : null;
    }
    const s = g.setSkill(id);
    if (!s) { console.log('no skill called ' + id + ', try: ' + Game.skillIds().join(', ')); return null; }
    console.log('skill set to ' + s.id + ' (' + (s.def.name || s.id) + '), cooldown ' + s.cd + 's, ready now');
    return s.id;
  },
  skills() {
    // Debug: what the badge board has actually opened, and what a fresh run
    // would therefore grant. Reads only.
    const ids = Game.skillIds();
    for (const id of ids) {
      console.log(id + ': ' + (Game.skillUnlocked(id) ? 'unlocked' : 'locked'));
    }
    const pick = Game.skillPick();
    console.log('a fresh run would grant: ' + (pick || 'nothing'));
    const g = this.game;
    if (g) console.log('this run is carrying: ' + (g.skill ? g.skill.id : 'nothing'));
    return pick;
  },
  find() {
    // Debug: hand over the next thing this act owes you, card and all.
    if (!App.game) { console.log('find needs a live run'); return null; }
    if (typeof Finds === 'undefined' || !Finds) { console.log('finds.js is not loaded'); return null; }
    const act = App.game.act || 1;
    const id = Finds.nextFor(act);
    if (!id) { console.log('act ' + act + ' has nothing left to find'); return null; }
    Finds.grant(App.game, id);
    console.log('found ' + id);
    return id;
  },
};
