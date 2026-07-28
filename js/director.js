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

  // Heft: one number for what a species costs you to meet, read off the same
  // table the fight reads. Tuning hp or damage moves the ordering with it,
  // instead of leaving a hand written list of "the heavy ones" behind.
  function heftOf(id) {
    const d = DATA.enemies[id];
    if (!d) return 0;
    return (d.hp || 0) * 0.55 + (d.dmg || 0) * 2.2 + (d.xp || 1) * 5;
  }

  const ROSTER_GUEST = 6;     // base weight a cast-only guest species walks in on
  const ROSTER_TILT = 0.85;   // how hard early rooms lean light, late rooms heavy
  const ROSTER_FLOOR = 0.12;  // nothing in an act is ever made impossible

  // The heft range of an act's own roster, cached: the tilt needs to know what
  // counts as light and heavy in THIS woods, not across the whole game.
  const actHeftCache = {};
  function actHeft(act) {
    if (actHeftCache[act]) return actHeftCache[act];
    const roster = (DATA.rosters && DATA.rosters[act]) || {};
    let lo = Infinity, hi = -Infinity;
    for (const id in roster) {
      const h = heftOf(id);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    if (!(hi > lo)) { lo = 0; hi = 1; }
    const r = { lo, hi };
    actHeftCache[act] = r;
    return r;
  }

  // Roll one body out of the act's ecosystem. cast is the room's own map of
  // species to multipliers: it bends the act's weights toward the scene, and a
  // species the act does not stock at all walks in as a guest at ROSTER_GUEST
  // so a layout can call for one thing the woods around it does not have.
  Game.prototype.rosterPick = function (m, cast) {
    const act = clamp(Math.round(this.act || 1), 1, 3);
    const roster = (DATA.rosters && DATA.rosters[act]) || null;
    if (!roster) return null;
    const range = actHeft(act);
    const span = range.hi - range.lo;
    // Where in the act we are: 0 at the first room, 1 at the last.
    const p = clamp((m - (act - 1) * 4.6) / 4.6, 0, 1);

    const ids = [];
    for (const id in roster) ids.push(id);
    if (cast) {
      for (const id in cast) {
        if (roster[id] == null && DATA.enemies[id] && ids.indexOf(id) < 0) ids.push(id);
      }
    }

    const wts = [];
    let total = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      let w = roster[id] != null ? roster[id] : ROSTER_GUEST;
      if (cast && cast[id] != null) w *= cast[id];
      if (!(w > 0)) { wts.push(0); continue; }
      const h01 = span > 0 ? clamp((heftOf(id) - range.lo) / span, 0, 1) : 0.5;
      // Light early, heavy late, and the mirror of that for the other half.
      const tilt = Math.max(ROSTER_FLOOR, 1 + (2 * p - 1) * (2 * h01 - 1) * ROSTER_TILT);
      w *= tilt;
      wts.push(w);
      total += w;
    }
    if (!(total > 0)) return ids.length ? ids[0] : null;
    let roll = Math.random() * total;
    for (let i = 0; i < ids.length; i++) {
      roll -= wts[i];
      if (roll <= 0) return ids[i];
    }
    return ids[ids.length - 1];
  };

  // Rooms draw from their act's ecosystem, tilted by the layout's own cast.
  // The open field (and the field debug mode) still rolls the flat 1.0 pool on
  // the wall clock, exactly as it always has. room.js calls this with one
  // argument, so the room's cast is read from here rather than passed in.
  Game.prototype.pickSpawn = function (m, cast) {
    if (this.room) {
      const c = cast || (this.room.def && this.room.def.cast) || null;
      const id = this.rosterPick(m, c);
      if (id) return id;
    }
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

  const TALLY_CHANCE = 0.25;  // ... of an early act elite being the collector

  Game.prototype.tallymanLives = function () {
    for (const o of this.enemies) if (!o.dead && o.tally) return true;
    return false;
  };

  Game.prototype.spawnEnemy = function (id, x, y, elite) {
    // THE TALLYMAN walks the first two acts on his own account, in place of
    // whatever the elite roll came up with. One of him at a time, ever.
    let tally = false;
    if (elite && this.room && (this.act || 1) <= 2 && DATA.enemies.raccoon &&
        Math.random() < TALLY_CHANCE && !this.tallymanLives()) {
      id = 'raccoon';
      tally = true;
    }
    const d = DATA.enemies[id];
    const m = this.threat;
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
    e.id = this.nextId++;
    if (d.move === 'hop') e.ai = { state: 'idle', t: rand(0.1, 0.5), k: 0, dx: 0, dy: 0, hopSpd: d.hopSpd };
    if (d.move === 'charge') e.ai = { state: 'stalk', t: rand(1, 2.2), dx: 0, dy: 0, chargeSpd: d.chargeSpd };
    if (d.move === 'ranged') e.ai = { shotT: rand(1, d.shotCd) };
    if (d.move === 'sine' || d.move === 'weave') e.ai = { ph: rand(0, TAU) };
    if (d.move === 'orbit') e.ai = { spin: Math.random() < 0.5 ? 1 : -1, ph: rand(0, TAU) };
    if (d.move === 'burrow') e.ai = { state: 'under', t: rand(0.6, 1) * (d.underT || 2.5) };
    if (d.move === 'leash') e.ai = { ph: rand(0, TAU) };
    // The old vicar pattern is an elite move now, so it needs the same ai a
    // boss used to get handed at spawn.
    if (d.move === 'bossvicar') e.ai = { ringT: rand(2, 4), summonT: rand(8, 15), spiralA: 0 };

    // Optional data fields. The content wave that fills these in lands later;
    // until then every one of them is simply absent and nothing changes.
    if (d.orbitR != null) e.orbitR = d.orbitR;
    if (d.underT != null) e.underT = d.underT;
    if (d.leash) { e.leash = true; e.leashGroup = this.leashGroupFor(x, y, id); }
    if (d.onDeath) { e.onDeath = d.onDeath; e._watchDeath = true; e.splitAgain = !!d.splitAgain; }

    // Anything that declares a shot carries the shot fields, whatever its gait.
    // The owl and the heron stand off and throw; the bog frog spits on landing
    // out of a hop. Same three numbers, one place that reads them.
    if (d.shotCd != null) {
      e.shotCd = d.shotCd;
      e.shotSpd = d.shotSpd;
      e.shotDmg = d.shotDmg * DATA.dmgScale(m);
      if (e.ai.shotT == null) e.ai.shotT = rand(0.6, d.shotCd);
      if (d.tongue != null) e.tongue = d.tongue;
      if (d.puff != null) e.puff = d.puff;
    }
    if (d.stab) e.stab = true;
    if (d.trail) e.trail = true;
    // A guard cycle starts with the plates up and a random offset, so a pack of
    // badgers is never all shielded on the same beat.
    if (d.guard) {
      e.guardCycle = { on: d.guard[0], off: d.guard[1] };
      // An elite is already nine times the health. Stacking the full plating on
      // top of that turns the shielded half of its cycle into a wall nothing
      // can chew through, so an elite's plates are worth half, not six sevenths.
      const ga = d.guardArmor != null ? d.guardArmor : 0.15;
      e.guardArmor = elite ? Math.max(0.5, ga) : ga;
      e.guarding = false;
      e.guardT = rand(0.2, d.guard[1]);
    }

    if (tally) this.makeTallyman(e);

    this.enemies.push(e);
    return e;
  };

  // =====================================================================
  // THE TALLYMAN: the vicar's collector, working the early acts himself.
  // Everything you have, he considers a loan, and he keeps the book.
  // =====================================================================
  Game.prototype.makeTallyman = function (e) {
    e.name = 'THE TALLYMAN';
    e.tally = true;
    e.move = 'bossvicar';
    e.ai = { ringT: rand(2.5, 4), summonT: rand(10, 16), spiralA: 0 };
    // No health bump: the elite curve already stands him up, and one more
    // multiplier on top would put him level with the act boss he works for.
    e.spd = 62 * (1 + this.threat * 0.012);
    e.stolen = 0;
    e.stealT = 0;
    e.onDeath = 'tally';
    e._watchDeath = true;
    this.toast('THE TALLYMAN', '#f4c542');
    AudioSys.play('roar');
    return e;
  };

  // Picking a pocket is not damage, so it does not wait on the hurt frames:
  // he skims on his own clock for as long as he is standing on you. Never
  // takes what is not there, so the purse can never go negative.
  Game.prototype.tallySteal = function (e) {
    if (this.t < (e.stealT || 0)) return;
    e.stealT = this.t + 0.9;
    const take = Math.min(5, this.coins);
    if (!(take > 0)) return;
    this.gainCoins(-take);
    e.stolen = (e.stolen || 0) + take;
    const p = this.player;
    this.spawnNum(p.x + rand(-6, 6), p.y - 34, '-' + take, '#f4c542');
    this.spawnBurst(e.x, e.y - e.r * 0.4, '#f4c542', 5);
    AudioSys.play('pop', { pitch: 1.4 });
  };

  // Pairs and trios are made at spawn by proximity: a new leash critter joins
  // the nearest group of its own kind that is still short a member, or starts
  // one of its own.
  Game.prototype.leashGroupFor = function (x, y, id) {
    const counts = {};
    for (const o of this.enemies) {
      if (o.dead || !o.leash || o.kind !== id || o.leashGroup == null) continue;
      counts[o.leashGroup] = (counts[o.leashGroup] || 0) + 1;
    }
    let best = null, bestD = 260 * 260;
    for (const o of this.enemies) {
      if (o.dead || !o.leash || o.kind !== id || o.leashGroup == null) continue;
      if (counts[o.leashGroup] >= 3) continue;
      const d = dist2(o.x, o.y, x, y);
      if (d < bestD) { bestD = d; best = o.leashGroup; }
    }
    if (best != null) return best;
    this._leashNext = (this._leashNext || 0) + 1;
    return this._leashNext;
  };

  Game.prototype.spawnBoss = function (def) {
    const pos = this.spawnPos();
    const m = this.threat;
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
      dmgF: 1, phaseGuard: 0, hidden: false,
      ai: {
        state: def.move === 'bosshare' ? 'idle' : 'chase',
        t: 1, k: 0, dx: 0, dy: 0, hopSpd: def.hopSpd || 0,
        hopCount: 0, summonT: 9, ringT: 3.5, spiralA: 0, enrage: 0,
        telegraph: null, phase: 1, cuts: null,
      },
    };
    e.id = this.nextId++;

    // Phase cuts, as fractions of max hp. A boss without cuts keeps the old
    // single-phase behaviour, which is what the retired vicar still wants.
    if (def.move === 'bosshare') e.ai.cuts = [0.6, 0.25];
    if (def.move === 'bossmole') e.ai.cuts = [0.65, 0.3];
    if (def.move === 'bossbehind') e.ai.cuts = [0.6, 0.25];
    if (def.move === 'bossstag') e.ai.cuts = [0.7, 0.35];

    // Per-fight clocks, so nothing counts down from undefined.
    if (def.move === 'bossmole') {
      this._hasMole = true;
      e.underT = def.underT != null ? def.underT : 5;
      e.ai.state = 'under';
      e.ai.t = 2;
      e.ai.tunnels = null;
      e.ai.huntSpot = null;
    }
    if (def.move === 'bossbehind') {
      e.ai.hideT = 0.6;
      e.ai.reachT = 2.5;
      e.ai.regrowT = 8;
      e.ai.exposeT = 0;
      e.ai.hideProp = null;
    }
    if (def.move === 'bossstag') {
      e.ai.tineT = 9;
      e.ai.state = 'chase';
      e.ai.t = rand(2.5, 3.5);
    }

    // THE BEHIND needs something to stand behind. An arena that was not built
    // for it gets stumps at its markers before the fight starts.
    if (def.id === 'behind') this.ensureCover(5);

    this.enemies.push(e);
    this.toast(def.name);
    AudioSys.play('roar');
    this.shakeAdd(8);
    this.hitstop = Math.max(this.hitstop, 0.4);
    this.bossFlash = 0.9;

    // Name card, bottom left: name, epithet, and the thing it says.
    this.bossCard = {
      name: def.name,
      epithet: (typeof BOSS_EPITHETS !== 'undefined' && BOSS_EPITHETS[def.id]) || '',
      line: (typeof BOSSLINES !== 'undefined' && BOSSLINES[def.id]) || '',
      t: 0,
    };

    // The scout answers by name when they know it, and falls back to the
    // generic boss bark when they do not.
    const named = ((typeof BARKS !== 'undefined' && BARKS[this.charId]) || {}).bossnamed;
    const line = named && named[def.id];
    if (line) this.barkNow = { text: line, t: 3.4 };
    else this.bark('boss');
    return e;
  };

  // Breakable props the player (and THE BEHIND) can use as cover. Tops the
  // room up to n of them at free markers without disturbing what is there.
  Game.prototype.ensureCover = function (n) {
    let have = 0;
    for (const pr of this.props) {
      if (!pr.dead && pr.def && pr.def.breakable) have++;
    }
    if (have >= n) return 0;
    let made = 0;
    const marks = this.arenaMarkers();
    for (const m of marks) {
      if (have + made >= n) break;
      if (!this.markerFree(m, 70)) continue;
      if (this.spawnProp('stump', m.x, m.y)) made++;
    }
    // A bare arena with too few markers still gets its cover, ringed around
    // the middle rather than left short.
    const c = this.arenaCenter();
    for (let i = 0; have + made < n && i < 8; i++) {
      const a = i * TAU / 8 + 0.3;
      const spot = { x: c.x + Math.cos(a) * 240, y: c.y + Math.sin(a) * 240 };
      if (!this.markerFree(spot, 70)) continue;
      if (this.spawnProp('stump', spot.x, spot.y)) made++;
    }
    return made;
  };

  Game.prototype.markerFree = function (m, clear) {
    const c2 = clear * clear;
    for (const pr of this.props) {
      if (!pr.dead && dist2(pr.x, pr.y, m.x, m.y) < c2) return false;
    }
    if (dist2(this.player.x, this.player.y, m.x, m.y) < c2) return false;
    if (this.room && Collide.blockedAt(this.room, m.x, m.y)) return false;
    return true;
  };

  // The arena's authored anchor points in world space, or a ring around the
  // middle when there is no room (the open field still spawns bosses).
  Game.prototype.arenaMarkers = function () {
    const out = [];
    const room = this.room;
    if (room && room.def && Array.isArray(room.def.spawnMarkers) && typeof room.toWorld === 'function') {
      for (const m of room.def.spawnMarkers) {
        const w = room.toWorld(m.x, m.y);
        out.push({ x: w.x, y: w.y });
      }
    }
    if (!out.length) {
      const c = this.arenaCenter();
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6;
        out.push({ x: c.x + Math.cos(a) * 300, y: c.y + Math.sin(a) * 300 });
      }
    }
    return out;
  };

  Game.prototype.arenaCenter = function () {
    const b = this.room && this.room.bounds;
    if (b) return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    return { x: this.player.x, y: this.player.y };
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
    const m = this.threat;

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

  // opts is optional and additive: a destructible shot passes { hp: 3, r: 12 }
  // and everything that already called this keeps the shot it always got.
  Game.prototype.fireEshot = function (x, y, a, spd, dmg, kind, opts) {
    const s = {
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      r: 6, dmg, life: 5, kind: kind || null,
    };
    if (opts) for (const k in opts) s[k] = opts[k];
    if (s.hp > 0) this._destructT = 8;
    this.eshots.push(s);
    return s;
  };

  Game.prototype.summonAround = function (e, ids, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), d = rand(60, 130);
      this.spawnEnemy(pick(ids), e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, false);
    }
    this.spawnPuff(e.x, e.y, 10);
  };

  // =====================================================================
  // Combat primitives. Every boss attack below goes out as a zone, so the
  // ground always says what is about to happen before it happens.
  // =====================================================================

  const ZONE_FIRE = 0.25;      // how long a fired zone lingers as a flash
  const BOSS_CARD_LIFE = 4.4;  // name card holds four seconds, then fades out
  const PHASE_GUARD = 1.2;     // untouchable roar and reposition between phases

  // Hiding is done by parking the hit radius at zero: nothing queries a body
  // it cannot reach, so an underground critter is off the table without any
  // change to the damage path in game.js.
  function setHidden(e, on) {
    if (on) {
      if (e.hidden) return;
      e.hidden = true;
      e._rBak = e.r;
      e.r = 0;
    } else {
      if (!e.hidden) return;
      e.hidden = false;
      if (e._rBak != null) e.r = e._rBak;
      e._rBak = null;
    }
  }

  function bodyR(e) { return e._rBak != null ? e._rBak : e.r; }

  // Invulnerability without touching dealDamage: health is parked on a buffer
  // no burst can chew through, and maxhp is scaled by the same factor, so the
  // health bar still reads the true fraction while nothing that lands matters.
  Game.prototype.holdHp = function (e, owner) {
    if (e._hpHold != null) return;
    e._hpHold = e.hp;
    e._maxHold = e.maxhp;
    e._holdOwner = owner || 'guard';
    e._holdFrac = clamp(e.maxhp > 0 ? e.hp / e.maxhp : 1, 0.02, 1);
    e._holdBuf = Math.max(1, e.maxhp) * 1e5;
    this.keepHp(e);
  };

  Game.prototype.keepHp = function (e) {
    if (e._hpHold == null) return;
    e.hp = e._holdBuf;
    e.maxhp = e._holdBuf / e._holdFrac;
  };

  Game.prototype.releaseHp = function (e, owner) {
    if (e._hpHold == null) return;
    if (owner && e._holdOwner !== owner) return;
    e.maxhp = e._maxHold;
    e.hp = clamp(e._hpHold, 1, e.maxhp);
    e._hpHold = null;
    e._maxHold = null;
    e._holdOwner = null;
    e._hpPrev = e.hp;
  };

  // ---------------------------------------------------------------- zones
  Game.prototype.spawnZone = function (o) {
    const z = {
      type: 'circle', x: 0, y: 0, r: 80, a: 0, arc: 0.6,
      warn: 0.5, fire: ZONE_FIRE, dmg: 0, owner: 'enemy', kind: null,
      t: 0, fired: false, knock: 0, quiet: false,
      contest: 0, snuff: 0, effect: null,
    };
    if (o) for (const k in o) z[k] = o[k];
    this.zones.push(z);
    return z;
  };

  // An expanding wall of sound. Same shape as the bugle ring the player owns,
  // aimed the other way.
  Game.prototype.fireEnemyRing = function (x, y, speed, dmg, maxR, kind) {
    return this.spawnZone({
      type: 'ring', x, y, r: 0, speed: speed || 260, dmg: dmg || 0,
      maxR: maxR || 420, hitPlayer: false, fired: true, warn: 0, fire: 0,
      kind: kind || null,
    });
  };

  Game.prototype.updateZones = function (dt) {
    const p = this.player;

    if (this.bossCard) {
      this.bossCard.t += dt;
      if (this.bossCard.t > BOSS_CARD_LIFE) this.bossCard = null;
    }
    if (this._destructT > 0) {
      this._destructT -= dt;
      this.shotsVsEshots();
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;

      if (z.type === 'ring') {
        const prev = z.r;
        z.r += z.speed * dt;
        if (!z.hitPlayer && z.owner !== 'player' && z.dmg > 0) {
          const d = Math.hypot(p.x - z.x, p.y - z.y);
          if (d <= z.r + 14 && d >= prev - 14) {
            z.hitPlayer = true;
            this.damagePlayer(z.dmg, z.x, z.y, z.kind);
          }
        }
        if (z.r >= z.maxR) this.zones.splice(i, 1);
        continue;
      }

      // A contested circle is snuffed by standing on it. Step off and the
      // progress bleeds back out.
      if (z.contest > 0 && !z.fired) {
        if (dist2(p.x, p.y, z.x, z.y) < z.r * z.r) {
          z.snuff += dt;
          if (z.snuff >= z.contest) {
            z.snuffed = true;
            this.spawnPuff(z.x, z.y, 8);
            AudioSys.play('pop', { pitch: 1.35 });
            this.zones.splice(i, 1);
            continue;
          }
        } else {
          z.snuff = Math.max(0, z.snuff - dt * 0.5);
        }
      }

      if (!z.fired) {
        if (z.t >= z.warn) {
          z.fired = true;
          this.detonateZone(z);
        }
        continue;
      }
      if (z.t >= z.warn + z.fire) this.zones.splice(i, 1);
    }
  };

  Game.prototype.zoneCovers = function (z, x, y, pad) {
    const dx = x - z.x, dy = y - z.y;
    const d = Math.hypot(dx, dy);
    if (d > z.r + (pad || 0)) return false;
    if (z.type !== 'cone') return true;
    if (d < 0.001) return true;
    return Math.abs(angDiff(Math.atan2(dy, dx), z.a)) <= z.arc / 2;
  };

  Game.prototype.detonateZone = function (z) {
    const p = this.player;
    if (z.effect === 'sign') this.promoteNearestElite(z);
    if (z.dmg > 0) {
      if (z.owner === 'player') {
        const hits = this.queryEnemies(z.x, z.y, z.r, true);
        for (const e of hits) {
          if (!this.zoneCovers(z, e.x, e.y, e.r)) continue;
          this.dealDamage(e, z.dmg, { knock: z.knock || 0, fx: z.x, fy: z.y });
        }
      } else if (this.zoneCovers(z, p.x, p.y, p.r)) {
        const before = p.hp;
        this.damagePlayer(z.dmg, z.x, z.y, z.kind);
        if (z.knock && p.hp < before) {
          const dx = p.x - z.x, dy = p.y - z.y;
          const d = Math.max(10, Math.hypot(dx, dy));
          p.x += dx / d * z.knock;
          p.y += dy / d * z.knock;
        }
      }
    }
    if (!z.quiet) {
      this.spawnPuff(z.x, z.y, 8);
      this.shakeAdd(3);
      AudioSys.play('boom');
    }
  };

  // A sign that lights uncontested promotes whatever is standing closest.
  Game.prototype.promoteNearestElite = function (z) {
    let best = null, bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.boss || e.elite) continue;
      const d = dist2(e.x, e.y, z.x, z.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    best.elite = true;
    best.hp *= 4;
    best.maxhp *= 4;
    best.w *= 1.3;
    best.r *= 1.15;
    this.spawnBurst(best.x, best.y, '#ff5b45', 14);
    AudioSys.play('roar');
    return best;
  };

  // Destructible enemy shots: a player projectile that touches one chips it
  // and dies for the trouble. Both arrays live on the same object graph, so
  // this stays a splice from here.
  Game.prototype.shotsVsEshots = function () {
    let any = false;
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const s = this.eshots[i];
      if (!(s.hp > 0)) continue;
      any = true;
      for (let j = this.shots.length - 1; j >= 0; j--) {
        const b = this.shots[j];
        if (dist2(b.x, b.y, s.x, s.y) >= 16 * 16) continue;
        s.hp -= 1;
        this.spawnBurst(s.x, s.y, '#f8d8f0', 4);
        if (b.kind !== 'boomer') this.shots.splice(j, 1);
        if (s.hp <= 0) {
          this.spawnPuff(s.x, s.y, 6);
          AudioSys.play('pop', { pitch: 1.25 });
          this.eshots.splice(i, 1);
          break;
        }
      }
    }
    if (!any) this._destructT = 0;
  };

  // ------------------------------------------------------- on-death effects
  // killEnemy lives in game.js, so the effect fires from a sweep at the end of
  // updateEnemies: everything that died this frame is still in the array, and
  // sweepDead has not run yet.
  Game.prototype.runDeathEffects = function () {
    for (const e of this.enemies) {
      if (!e.dead || !e._watchDeath || e._deathDone) continue;
      e._deathDone = true;
      const od = e.onDeath;
      if (od === 'eshot6') {
        for (let i = 0; i < 6; i++) {
          this.fireEshot(e.x, e.y - 8, i * TAU / 6 + rand(0, 0.4), 165, e.dmg * 0.6, e.kind);
        }
        AudioSys.play('boom', { pitch: 1.2 });
      } else if (od === 'split2') {
        for (let i = 0; i < 2; i++) {
          const a = rand(0, TAU);
          const c = this.spawnEnemy(e.kind, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, false);
          if (!c) continue;
          c.maxhp = Math.max(1, e.maxhp * 0.5);
          c.hp = c.maxhp;
          c.w = e.w * 0.5;
          c.r = Math.max(4, e.r * 0.5);
          c.xp = Math.max(1, Math.round(e.xp * 0.5));
          if (e.splitAgain) { c.onDeath = 'split2'; c._watchDeath = true; c.splitAgain = false; }
          else { c.onDeath = null; c._watchDeath = false; }
        }
        this.spawnPuff(e.x, e.y, 8);
      } else if (od === 'tally') {
        // The book closes. Everything he took comes back, plus what he was
        // charging you to hold it.
        const pay = (e.stolen || 0) + 10;
        this.gainCoins(pay);
        this.spawnBurst(e.x, e.y, '#f4c542', 18);
        this.spawnNum(e.x, e.y - 26, '+' + pay, '#f4c542', true);
        this.toast('THE TALLYMAN SETTLES UP', '#f4c542');
        AudioSys.play('levelup');
      }
    }
  };

  // Quarry badgers work a shift: plates down and almost nothing lands, then a
  // beat where everything does. On a clock, direction free, so it reads from
  // any angle. The refund below is the same one the stag's plating uses, so it
  // has to be told where to start counting the moment the plates come down.
  Game.prototype.tickGuard = function (e, dt) {
    const g = e.guardCycle;
    e.guardT -= dt;
    if (e.guardT > 0) return;
    if (e.guarding) {
      e.guarding = false;
      e.armorMul = null;
      e.guardT = g.off;
      this.spawnBurst(e.x, e.y - e.r * 0.4, '#ffd08a', 6);
      AudioSys.play('pop', { pitch: 0.75 });
    } else {
      e.guarding = true;
      e.armorMul = e.guardArmor;
      e._hpPrev = e.hp;
      e.guardT = g.on;
      this.spawnPuff(e.x, e.y - e.r * 0.4, 4);
    }
  };

  // ------------------------------------------------------ the phase machine
  Game.prototype.tickBossHp = function (e, dt) {
    if (e._hpHold != null) {
      this.keepHp(e);
    } else if (e.armorMul != null && e._hpPrev != null && e.hp > 0 && e.hp < e._hpPrev) {
      // Armour without touching dealDamage: hand back the share of this
      // frame's loss the plating was supposed to eat.
      e.hp = Math.min(e.maxhp, e.hp + (e._hpPrev - e.hp) * (1 - e.armorMul));
    }
    e._hpPrev = e.hp;
    if (e.ai && e.ai.cuts) this.tickBossPhase(e, dt);
  };

  Game.prototype.tickBossPhase = function (e, dt) {
    const ai = e.ai;
    if (ai.phase == null) ai.phase = 1;

    if (e.phaseGuard > 0) {
      e.phaseGuard -= dt;
      if (ai.guardTo) {
        const k = Math.min(1, dt * 2.4);
        e.x += (ai.guardTo.x - e.x) * k;
        e.y += (ai.guardTo.y - e.y) * k;
      }
      if (e.phaseGuard <= 0) {
        e.phaseGuard = 0;
        ai.guardTo = null;
        this.releaseHp(e, 'guard');
        this.onBossPhase(e, ai.phase);
      }
      return;
    }

    const frac = e.maxhp > 0 ? e.hp / e.maxhp : 1;
    let want = 1;
    for (let i = 0; i < ai.cuts.length; i++) if (frac <= ai.cuts[i]) want = i + 2;
    if (want > ai.phase) {
      ai.phase = want;
      this.beginPhaseGuard(e, PHASE_GUARD);
    }
  };

  Game.prototype.beginPhaseGuard = function (e, dur) {
    const ai = e.ai;
    const p = this.player;
    e.phaseGuard = dur;
    e.stunT = 0;
    ai.state = 'idle';
    ai.t = 0;
    ai.telegraph = null;
    this.holdHp(e, 'guard');
    AudioSys.play('roar');
    this.shakeAdd(7);
    this.hitstop = Math.max(this.hitstop, 0.12);
    this.bossFlash = Math.max(this.bossFlash || 0, 0.7);
    this.spawnPuff(e.x, e.y - bodyR(e) * 0.5, 16);

    // The roar buys it room: it backs off the player, toward the middle.
    const c = this.arenaCenter();
    const ax = e.x - p.x, ay = e.y - p.y;
    const al = Math.hypot(ax, ay) || 1;
    let gx = (e.x + c.x) / 2 + ax / al * 140;
    let gy = (e.y + c.y) / 2 + ay / al * 140;
    if (this.room) {
      const cb = Collide.clampToBounds(gx, gy, bodyR(e) + 40, this.room.bounds);
      gx = cb.x; gy = cb.y;
    }
    ai.guardTo = { x: gx, y: gy };
  };

  // Fight-specific entry beats, run the frame the roar ends.
  Game.prototype.onBossPhase = function (e, phase) {
    if (e.move === 'bosshare') {
      if (phase === 2) this.hareOpenWarren(e);
      if (phase === 3) {
        this.hareCloseWarren(e);
        e.ai.state = 'windup';
        e.ai.t = 0.9;
      }
    } else if (e.move === 'bossmole') {
      if (phase === 2 && !e.ai.tunnels) e.ai.tunnels = [];
      if (phase === 3) {
        setHidden(e, false);
        this.releaseHp(e, 'under');
        e.ai.state = 'stalk';
        e.ai.t = 0.8;
      }
    } else if (e.move === 'bossbehind') {
      if (phase === 2) e.ai.reachT = 2.5;
      if (phase === 3) this.behindFace(e);
    } else if (e.move === 'bossstag') {
      if (phase === 2) this.stagPlant(e);
      if (phase === 3) this.stagHollow(e);
    }
    this.toast(e.name, '#ff5b45');
  };

  // =====================================================================
  // BRAMBLEBUCK: hopscotch, then the warren, then the leap.
  // =====================================================================

  // The shared hop. Landing is the beat everything else hangs off.
  function hopStep(e, dt, tx, ty, slowMul, onLand) {
    const ai = e.ai;
    const spd = (ai.hopSpd || 300) * slowMul;
    if (ai.state !== 'hop') {
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'hop';
        ai.k = 0;
        const dx = tx - e.x, dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        ai.dx = dx / d; ai.dy = dy / d;
      }
      return;
    }
    ai.k += dt / 0.42;
    e.x += ai.dx * spd * dt;
    e.y += ai.dy * spd * dt;
    if (ai.k >= 1) {
      ai.state = 'idle';
      ai.t = rand(0.25, 0.5);
      if (onLand) onLand();
    }
  }

  Game.prototype.bossHare = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    const p = this.player;
    if (e.phaseGuard > 0) return;

    if (ai.phase === 3) return this.hareLeap(e, dt, slowMul);

    if (ai.phase === 2 && ai.mounds && ai.mounds.length) {
      this.hareTendWarren(e, dt, slowMul);
      return;
    }

    // Hopscotch: every third landing stamps the ground it came down on.
    const self = this;
    hopStep(e, dt, p.x, p.y, slowMul, function () {
      ai.hopCount++;
      self.shakeAdd(2);
      if (ai.hopCount % 3 === 0) {
        self.spawnZone({
          x: e.x, y: e.y, r: 90, warn: 0.35, dmg: e.dmg * 0.8,
          knock: 60, kind: e.kind,
        });
        AudioSys.play('swing');
      }
    });
  };

  Game.prototype.hareOpenWarren = function (e) {
    const ai = e.ai;
    const marks = this.arenaMarkers();
    ai.mounds = [];
    ai.moundT = [];
    // Mounds want to read as three hits, whatever the player is swinging, so
    // their health is pinned to the damage the build is putting out.
    const hp = Math.max(18, Math.round(45 * this.dmgMul));
    for (const m of marks) {
      if (ai.mounds.length >= 4) break;
      const pr = this.spawnProp('stump', m.x, m.y);
      if (!pr) continue;
      pr.hp = hp;
      pr.maxhp = hp;
      pr.mound = true;
      ai.mounds.push(pr);
      ai.moundT.push(rand(1.2, 3));
      this.spawnPuff(m.x, m.y, 10);
    }
    // Planted in the nearest corner while its warren stands.
    let best = null, bd = Infinity;
    for (const m of marks) {
      const dd = dist2(m.x, m.y, e.x, e.y);
      if (dd < bd) { bd = dd; best = m; }
    }
    ai.corner = best || this.arenaCenter();
    if (ai.mounds.length) this.holdHp(e, 'warren');
    AudioSys.play('roar');
  };

  Game.prototype.hareTendWarren = function (e, dt, slowMul) {
    const ai = e.ai;
    let living = 0;
    for (const pr of ai.mounds) if (pr && !pr.dead) living++;
    if (!living) {
      this.hareCloseWarren(e);
      return;
    }

    // Hops in place at the corner, venting squirrels out of every mound.
    hopStep(e, dt, ai.corner.x, ai.corner.y, slowMul, null);

    let alive = 0;
    for (const o of this.enemies) if (!o.dead && !o.boss) alive++;
    for (let i = 0; i < ai.mounds.length; i++) {
      const pr = ai.mounds[i];
      if (!pr || pr.dead) continue;
      ai.moundT[i] -= dt;
      if (ai.moundT[i] > 0) continue;
      ai.moundT[i] += 3;
      if (alive >= 24) continue;
      const a = rand(0, TAU);
      this.spawnEnemy('squirrel', pr.x + Math.cos(a) * 26, pr.y + Math.sin(a) * 26, false);
      this.spawnPuff(pr.x, pr.y - 6, 5);
      alive++;
    }
  };

  Game.prototype.hareCloseWarren = function (e) {
    const ai = e.ai;
    if (ai.mounds) {
      for (const pr of ai.mounds) {
        if (pr && !pr.dead) this.damageProp(pr, pr.hp + 1, {});
      }
    }
    ai.mounds = null;
    ai.moundT = null;
    this.releaseHp(e, 'warren');
  };

  // The leap: crouch, gone, a shadow that hunts you, then the landing.
  Game.prototype.hareLeap = function (e, dt, slowMul) {
    const ai = e.ai;
    const p = this.player;

    if (ai.state === 'windup') {
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'air';
        ai.t = 1.2;
        setHidden(e, true);
        e.airborne = true;   // gone up, not gone under: nothing to draw
        this.holdHp(e, 'leap');
        this.spawnPuff(e.x, e.y, 14);
        AudioSys.play('swing');
        ai.leapZone = this.spawnZone({
          x: p.x, y: p.y, r: 120, warn: 1.3, dmg: e.dmg * 1.2,
          knock: 220, kind: e.kind,
        });
      }
      return;
    }

    if (ai.state === 'air') {
      ai.t -= dt;
      const z = ai.leapZone;
      if (z) {
        // The shadow closes three quarters of the gap every second: standing
        // still is the only way to be under it when it lands.
        const k = 1 - Math.pow(0.25, dt);
        z.x += (p.x - z.x) * k;
        z.y += (p.y - z.y) * k;
        e.x = z.x;
        e.y = z.y;
      }
      if (ai.t <= 0) {
        setHidden(e, false);
        e.airborne = false;
        this.releaseHp(e, 'leap');
        if (z) {
          e.x = z.x; e.y = z.y;
          if (!z.fired) { z.fired = true; z.t = z.warn; this.detonateZone(z); }
        }
        this.fireEnemyRing(e.x, e.y, 300, e.dmg * 0.6, 380, e.kind);
        this.shakeAdd(9);
        this.hitstop = Math.max(this.hitstop, 0.1);
        AudioSys.play('boom');
        ai.leapZone = null;
        ai.state = 'ground';
        e.stunT = 1.5;
      }
      return;
    }

    // Grounded and helpless: this is the damage window the fight is built on.
    if (e.stunT <= 0) {
      ai.state = 'windup';
      ai.t = 0.9;
    }
  };

  // =====================================================================
  // MAWMOLE: a fin in the dirt, then tunnels, then a blind charge.
  // =====================================================================
  Game.prototype.bossMole = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    const p = this.player;
    if (e.phaseGuard > 0) return;
    if (ai.phase === 3) return this.moleHunt(e, dt, ux, uy, d, slowMul);
    if (!ai.state || ai.state === 'chase') { ai.state = 'under'; ai.t = e.underT || 5; }
    if (ai.tunnels) this.moleTunnels(e, dt);

    if (ai.state === 'under') {
      setHidden(e, true);
      this.holdHp(e, 'under');
      e.x += ux * e.spd * 1.3 * slowMul * dt;
      e.y += uy * e.spd * 1.3 * slowMul * dt;
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'rise';
        ai.t = 0.8;
        ai.riseZone = this.spawnZone({
          x: e.x, y: e.y, r: 100, warn: 0.8, dmg: e.dmg * 0.9,
          knock: 120, kind: e.kind,
        });
      }
      return;
    }

    if (ai.state === 'rise') {
      ai.t -= dt;
      if (ai.t > 0) return;
      // Erupt: the warning fires, the mole comes out with it.
      setHidden(e, false);
      this.releaseHp(e, 'under');
      const z = ai.riseZone;
      if (z && !z.fired) { z.fired = true; z.t = z.warn; this.detonateZone(z); }
      ai.riseZone = null;
      for (let i = 0; i < 6; i++) {
        this.fireEshot(e.x, e.y - 10, i * TAU / 6 + rand(0, 0.5), 190, e.dmg * 0.5, e.kind);
      }
      this.shakeAdd(6);
      AudioSys.play('boom');
      if (ai.phase >= 2) this.moleDig(e);
      ai.state = 'out';
      ai.t = 2.5;
      return;
    }

    // Out and breathing: the only honest window in the first two phases.
    ai.t -= dt;
    if (ai.t <= 0) {
      ai.state = 'under';
      ai.t = e.underT || 5;
      this.spawnPuff(e.x, e.y, 10);
    }
  };

  Game.prototype.moleDig = function (e) {
    const ai = e.ai;
    if (!ai.tunnels) ai.tunnels = [];
    // Beside the crater, not in it: a mouth that opened exactly under the
    // player would be plugged by standing still, which is no cost at all.
    const a = rand(0, TAU);
    ai.tunnels.push({ x: e.x + Math.cos(a) * 70, y: e.y + Math.sin(a) * 70, ventT: 4, plugT: 0, t: 0 });
    while (ai.tunnels.length > 3) {
      const old = ai.tunnels.shift();
      this.spawnPuff(old.x, old.y, 8);
    }
  };

  Game.prototype.moleTunnels = function (e, dt) {
    const ai = e.ai;
    const p = this.player;
    for (let i = ai.tunnels.length - 1; i >= 0; i--) {
      const tn = ai.tunnels[i];
      tn.t += dt;
      // Standing on a tunnel mouth for a beat and a bit fills it in.
      if (dist2(p.x, p.y, tn.x, tn.y) < 40 * 40) {
        tn.plugT += dt;
        if (tn.plugT >= 1.2) {
          this.spawnPuff(tn.x, tn.y, 12);
          AudioSys.play('pop', { pitch: 0.9 });
          ai.tunnels.splice(i, 1);
          continue;
        }
      } else {
        tn.plugT = Math.max(0, tn.plugT - dt * 0.6);
      }
      tn.ventT -= dt;
      if (tn.ventT > 0) continue;
      tn.ventT += 4;
      let alive = 0;
      for (const o of this.enemies) if (!o.dead && !o.boss) alive++;
      if (alive >= 24) continue;
      const a = rand(0, TAU);
      this.spawnEnemy(pick(['raccoon', 'owl', 'fox']), tn.x + Math.cos(a) * 26, tn.y + Math.sin(a) * 26, false);
      this.spawnPuff(tn.x, tn.y - 4, 6);
    }
  };

  // Nose to nose: it cannot see, it can only hear. Every shot you take is an
  // address. Hold your fire and it charges the last place you were loud.
  Game.prototype.moleHunt = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    const p = this.player;
    if (ai.tunnels) this.moleTunnels(e, dt);

    const spot = ai.huntSpot;
    const chargeSpd = 360;

    if (ai.state === 'charge') {
      ai.t -= dt;
      e.x += ai.dx * chargeSpd * slowMul * dt;
      e.y += ai.dy * chargeSpd * slowMul * dt;
      if (ai.t <= 0) { ai.state = 'recover'; ai.t = 0.7; }
      return;
    }
    if (ai.state === 'windup') {
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'charge';
        ai.t = 0.8;
        const tx = (spot ? spot.x : e.x + ai.dx * 100);
        const ty = (spot ? spot.y : e.y + ai.dy * 100);
        const dx = tx - e.x, dy = ty - e.y;
        const dd = Math.hypot(dx, dy) || 1;
        ai.dx = dx / dd; ai.dy = dy / dd;
        AudioSys.play('roar');
      }
      return;
    }
    if (ai.state === 'recover') {
      ai.t -= dt;
      if (ai.t <= 0) { ai.state = 'stalk'; ai.t = rand(0.6, 1.1); }
      return;
    }

    // Stalking: toward the noise if there was any, a slow blind wander if not.
    ai.t -= dt;
    if (spot) {
      const dx = spot.x - e.x, dy = spot.y - e.y;
      const dd = Math.hypot(dx, dy) || 1;
      e.x += dx / dd * e.spd * slowMul * dt;
      e.y += dy / dd * e.spd * slowMul * dt;
      if (ai.t <= 0 && dd < 460) {
        ai.state = 'windup';
        ai.t = 0.55;
        this.spawnZone({
          type: 'cone', x: e.x, y: e.y, r: 300, a: Math.atan2(dy, dx), arc: 0.42,
          warn: 0.55, dmg: 0, quiet: true, owner: 'enemy',
        });
      }
      return;
    }
    ai.wanderA = (ai.wanderA || rand(0, TAU)) + rand(-1.6, 1.6) * dt;
    e.x += Math.cos(ai.wanderA) * e.spd * 0.35 * slowMul * dt;
    e.y += Math.sin(ai.wanderA) * e.spd * 0.35 * slowMul * dt;
  };

  // Anything loud the player does becomes an address for the mole. Shots,
  // swings and lobbed crackers all count, so no build goes silent by accident.
  Game.prototype.trackPlayerNoise = function () {
    if (!this._hasMole) return;
    const p = this.player;
    // Holding the attack button is the loud thing, whether or not the shot
    // survives long enough to be counted: point blank fire is still fire.
    let loud = !!(p.in && p.in.fire);
    const n = this.shots.length + this.swings.length + this.bombs.length;
    if (n > (this._noiseN || 0)) loud = true;
    this._noiseN = n;
    if (!loud) {
      for (const s of this.shots) {
        if (s.kind === 'boomer') continue;
        if (dist2(s.x, s.y, p.x, p.y) < 44 * 44) { loud = true; break; }
      }
    }
    if (!loud) return;
    for (const e of this.enemies) {
      if (e.dead || e.move !== 'bossmole') continue;
      e.ai.huntSpot = { x: p.x, y: p.y, t: this.t };
    }
  };

  // =====================================================================
  // THE BEHIND: it is never where you are looking.
  // =====================================================================
  Game.prototype.bossBehind = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    const p = this.player;
    if (e.phaseGuard > 0) return;

    if (ai.phase === 3) {
      // Facing. It walks at you in the open and never does anything else.
      e.x += ux * e.spd * 0.55 * slowMul * dt;
      e.y += uy * e.spd * 0.55 * slowMul * dt;
      return;
    }

    if (ai.exposeT > 0) {
      ai.exposeT -= dt;
      if (ai.exposeT <= 0) {
        ai.exposeT = 0;
        ai.hideT = 0;
      }
      return;
    }

    // The prop it was behind is gone: caught in the open, for two seconds.
    if (ai.hideProp && ai.hideProp.dead) {
      ai.hideProp = null;
      ai.exposeT = 2;
      this.releaseHp(e, 'behind');
      this.spawnPuff(e.x, e.y, 12);
      AudioSys.play('hurt');
      return;
    }

    this.holdHp(e, 'behind');
    ai.hideT -= dt;
    if (ai.hideT <= 0) {
      ai.hideT = 3;
      // Smash every last thing in the room and there is nowhere left for it
      // to be: it stands in the open until something grows back.
      if (!this.behindStep(e)) {
        ai.exposeT = 2;
        this.releaseHp(e, 'behind');
        this.spawnPuff(e.x, e.y, 12);
      }
    }

    if (ai.phase >= 2) {
      ai.regrowT -= dt;
      if (ai.regrowT <= 0) {
        ai.regrowT = 8;
        this.behindRegrow(e);
      }
      ai.reachT -= dt;
      if (ai.reachT <= 0) {
        ai.reachT = 2.5;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        for (const off of [-0.45, 0.45]) {
          this.spawnZone({
            type: 'cone', x: e.x, y: e.y, r: 300, a: a + off, arc: 0.5,
            warn: 0.7, dmg: e.dmg * 0.9, knock: 90, kind: e.kind,
          });
        }
        AudioSys.play('swing');
      }
    }
  };

  // Puff out, puff in: behind whatever is farthest from the player.
  Game.prototype.behindStep = function (e) {
    const p = this.player;
    let best = null, bd = -1;
    for (const pr of this.props) {
      if (pr.dead || !pr.def || !pr.def.breakable) continue;
      const d = dist2(pr.x, pr.y, p.x, p.y);
      if (d > bd) { bd = d; best = pr; }
    }
    if (!best) return null;
    const ax = best.x - p.x, ay = best.y - p.y;
    const al = Math.hypot(ax, ay) || 1;
    // Clear of the prop's own footprint, or the wall handler shoves it back
    // out into the open the moment it arrives.
    const off = (best.r || 16) + 20;
    this.spawnPuff(e.x, e.y, 12);
    e.x = best.x + ax / al * off;
    e.y = best.y + ay / al * off;
    this.spawnPuff(e.x, e.y, 12);
    AudioSys.play('pop', { pitch: 0.6 });
    e.ai.hideProp = best;
    return best;
  };

  Game.prototype.behindRegrow = function (e) {
    let have = 0;
    for (const pr of this.props) if (!pr.dead && pr.def && pr.def.breakable) have++;
    if (have >= 6) return null;
    for (const m of this.arenaMarkers()) {
      if (!this.markerFree(m, 70)) continue;
      const pr = this.spawnProp('stump', m.x, m.y);
      if (pr) { this.spawnPuff(m.x, m.y, 8); return pr; }
    }
    return null;
  };

  Game.prototype.behindFace = function (e) {
    const ai = e.ai;
    ai.hideProp = null;
    ai.exposeT = 0;
    ai.reachT = 0;
    ai.regrowT = 0;
    e.dmgF = 3;
    this.releaseHp(e, 'behind');
    this.spawnPuff(e.x, e.y, 18);
  };

  // =====================================================================
  // OLD NOBODY: the procession, the signing, and what is left after.
  // =====================================================================
  Game.prototype.bossStag = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    if (e.phaseGuard > 0) return;
    if (ai.phase === 2) return this.stagSigning(e, dt, ux, uy, d, slowMul);
    if (ai.phase === 3) return this.stagFlee(e, dt, ux, uy, d, slowMul);

    // Procession: it walks. It never runs. The charge is slow enough to read.
    if (ai.state === 'windup') {
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'charge';
        ai.t = 1.0;
        ai.telegraph = null;
        AudioSys.play('roar');
      }
    } else if (ai.state === 'charge') {
      ai.t -= dt;
      e.x += ai.dx * 330 * slowMul * dt;
      e.y += ai.dy * 330 * slowMul * dt;
      if (ai.t <= 0) { ai.state = 'chase'; ai.t = rand(3, 4); }
    } else {
      e.x += ux * e.spd * slowMul * dt;
      e.y += uy * e.spd * slowMul * dt;
      ai.t -= dt;
      if (ai.t <= 0) {
        ai.state = 'windup';
        ai.t = 1.2;
        ai.telegraph = { a: Math.atan2(uy, ux), len: 380 };
        ai.dx = ux; ai.dy = uy;
      }
    }

    ai.tineT -= dt;
    if (ai.tineT <= 0) {
      ai.tineT = 9;
      this.stagTine(e, ux, uy);
    }
  };

  // A tine: five circles walking away from it, straight at the player.
  Game.prototype.stagTine = function (e, ux, uy) {
    for (let i = 0; i < 5; i++) {
      this.spawnZone({
        x: e.x + ux * (95 * (i + 1)), y: e.y + uy * (95 * (i + 1)),
        r: 60, warn: 0.9, dmg: e.dmg * 0.7, knock: 70, kind: e.kind,
      });
    }
    AudioSys.play('swing');
  };

  Game.prototype.stagPlant = function (e) {
    const ai = e.ai;
    const c = this.arenaCenter();
    e.x = c.x; e.y = c.y;
    e.armorMul = 0.35;
    e._hpPrev = e.hp;
    ai.signs = [];
    ai.signT = 0;
    ai.shotT = 1.2;
    this.spawnPuff(e.x, e.y, 20);
    this.shakeAdd(6);
  };

  // The signing. Six circles light at the markers: let one burn down and it
  // promotes whatever stands nearest. Stand on one for a second to snuff it.
  Game.prototype.stagSigning = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;
    const p = this.player;
    if (!ai.signs) this.stagPlant(e);

    let live = 0;
    for (const z of ai.signs) if (this.zones.indexOf(z) >= 0) live++;
    if (!live) {
      ai.signT -= dt;
      if (ai.signT <= 0) {
        ai.signT = 3;
        ai.signs = [];
        const marks = this.arenaMarkers();
        for (let i = 0; i < 6; i++) {
          const m = marks[i % marks.length];
          const jitter = i >= marks.length ? 90 : 0;
          ai.signs.push(this.spawnZone({
            x: m.x + rand(-jitter, jitter), y: m.y + rand(-jitter, jitter),
            r: 70, warn: 6, dmg: 0, effect: 'sign', contest: 1.0,
            quiet: true, kind: e.kind,
          }));
        }
        AudioSys.play('roar');
      }
    }

    // Big slow shells that can be shot out of the air.
    ai.shotT -= dt;
    if (ai.shotT <= 0) {
      ai.shotT = 1.7;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      this.fireEshot(e.x, e.y - 16, a, 105, e.dmg * 0.8, e.kind, { hp: 3, r: 12, life: 7 });
    }
  };

  Game.prototype.stagHollow = function (e) {
    const ai = e.ai;
    e.armorMul = null;
    ai.signs = [];
    ai.lashT = 3;
    // It sheds. The antlers come off as three things you can break open.
    ai.antlers = [];
    const ids = ['basket', 'crate', 'urn'];
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 + rand(0, 0.5);
      const pr = this.spawnProp(ids[i], e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
      if (pr) ai.antlers.push(pr);
    }
    e.w *= 0.55;
    e.r = Math.max(8, e.r * 0.6);
    e.spd *= 2.2;
    e.noPop = true;
    this.spawnPuff(e.x, e.y, 24);
    this.shakeAdd(8);
    AudioSys.play('roar');
    if (this.room) {
      const b = this.room.bounds;
      ai.b0 = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    }
  };

  Game.prototype.stagFlee = function (e, dt, ux, uy, d, slowMul) {
    const ai = e.ai;

    // Broken antlers pay out cocoa. props.js owns the break, so this watches
    // for it instead of reaching into it.
    if (ai.antlers) {
      for (let i = ai.antlers.length - 1; i >= 0; i--) {
        const pr = ai.antlers[i];
        if (!pr.dead) continue;
        this.pickups.push({ type: 'cocoa', x: pr.x, y: pr.y, t: 0 });
        ai.antlers.splice(i, 1);
      }
    }

    // Small and afraid: it runs from you now.
    e.x -= ux * e.spd * slowMul * dt;
    e.y -= uy * e.spd * slowMul * dt;

    ai.lashT -= dt;
    if (ai.lashT <= 0) {
      ai.lashT = 3;
      const back = Math.atan2(-uy, -ux);
      for (let i = -1; i <= 1; i++) {
        this.fireEshot(e.x, e.y - 8, back + i * 0.35, 210, e.dmg * 0.45, e.kind);
      }
      AudioSys.play('hurt');
    }

    // The hollow closes in until there is nowhere left to run to.
    if (this.room && ai.b0) {
      const b = this.room.bounds, b0 = ai.b0;
      const cx = (b0.x0 + b0.x1) / 2, cy = (b0.y0 + b0.y1) / 2;
      const minW = (b0.x1 - b0.x0) * 0.6, minH = (b0.y1 - b0.y0) * 0.6;
      const step = 12 * dt;
      b.x0 = Math.min(cx - minW / 2, b.x0 + step);
      b.x1 = Math.max(cx + minW / 2, b.x1 - step);
      b.y0 = Math.min(cy - minH / 2, b.y0 + step);
      b.y1 = Math.max(cy + minH / 2, b.y1 - step);
    }
  };

  // Group centroids for leashed packs, computed once a frame instead of once
  // per critter per frame.
  Game.prototype.updateLeashGroups = function () {
    let any = false;
    for (const e of this.enemies) { if (!e.dead && e.leash) { any = true; break; } }
    if (!any) { this._leash = null; return; }
    const map = new Map();
    for (const e of this.enemies) {
      if (e.dead || !e.leash || e.leashGroup == null) continue;
      let g = map.get(e.leashGroup);
      if (!g) { g = { x: 0, y: 0, n: 0 }; map.set(e.leashGroup, g); }
      g.x += e.x; g.y += e.y; g.n++;
    }
    for (const g of map.values()) { g.x /= g.n; g.y /= g.n; }
    this._leash = map;
  };

  Game.prototype.updateEnemies = function (dt) {
    const p = this.player;
    const relocate2 = Math.pow(this.viewRadius() * 2.3, 2);

    // Ground effects first: everything the player took this frame has already
    // landed, so a zone that fires here is read on the same frame it warned to.
    this.updateZones(dt);
    this.trackPlayerNoise();
    this.updateLeashGroups();
    let sawMole = false;

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
          if ((typeof SETTINGS !== 'undefined' ? SETTINGS.dmgNums : true) && Math.random() < 0.5) {
            this.spawnNum(e.x + rand(-5, 5), e.y - e.r - 4, Math.round(e.burnDps * 0.5) + '', '#ff9a3c');
          }
          if (e.hp <= 0) { this.killEnemy(e); continue; }
        }
      }

      // a timed guard runs off the clock, not off the gait, so a staggered
      // badger still comes out of its shift on schedule
      if (e.guardCycle) this.tickGuard(e, dt);

      // boss upkeep: held health, armour refunds and the phase machine all
      // run even while stunned, so a phase never waits on a stagger
      if (e.boss || e._hpHold != null || e.armorMul != null) this.tickBossHp(e, dt);
      if (e.move === 'bossmole') sawMole = true;

      // knockback
      const preX = e.x, preY = e.y;
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
            // Sog beavers have learned what the tail is for. Get inside its
            // reach and the whole room gets shoved off it.
            if (e.kind === 'beaver' && this.act >= 2) {
              ai.slapT = (ai.slapT || 0) - dt;
              if (ai.slapT <= 0 && d < 60) {
                ai.slapT = 3;
                this.fireEnemyRing(e.x, e.y, 340, e.dmg * 0.4, 200, e.kind);
                // A roll through the slap is a roll through it: nothing moves
                // a player who is not there to be moved.
                if (!(p.iframe > 0 || p.dashI > 0 || p.god)) {
                  const kd = Math.max(12, d);
                  p.x += (p.x - e.x) / kd * 130;
                  p.y += (p.y - e.y) / kd * 130;
                }
                this.spawnPuff(e.x, e.y, 8);
                this.shakeAdd(4);
                AudioSys.play('boom', { pitch: 0.7 });
              }
            }
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
            // A fox that has lived past act 1 stops weaving in and starts
            // taking the distance in one go: a crouch you can read on the
            // ground, then a lunge you cannot outwalk.
            if (this.act >= 2) {
              if (ai.state === 'crouch') {
                ai.t -= dt;
                if (ai.t <= 0) {
                  ai.state = 'pounce';
                  ai.t = 0.34;
                  ai.dx = ux; ai.dy = uy;
                  AudioSys.play('swing', { pitch: 1.15 });
                }
                break;
              }
              if (ai.state === 'pounce') {
                ai.t -= dt;
                e.x += ai.dx * 620 * slowMul * dt;
                e.y += ai.dy * 620 * slowMul * dt;
                if (ai.t <= 0) { ai.state = null; ai.pounceT = rand(2.6, 4.2); }
                break;
              }
              if (ai.pounceT == null) ai.pounceT = rand(1.4, 3);
              ai.pounceT -= dt;
              if (ai.pounceT <= 0 && d < 260) {
                // Too close to leap from. It gives ground first, which is the
                // tell that something worse is coming. Cornered against a wall
                // it stops waiting and goes anyway.
                ai.backT = (ai.backT || 0) + dt;
                if (d < 180 && ai.backT < 1.6) {
                  e.x -= ux * e.spd * 0.9 * slowMul * dt;
                  e.y -= uy * e.spd * 0.9 * slowMul * dt;
                  break;
                }
                ai.backT = 0;
                ai.state = 'crouch';
                ai.t = 1.2;
                this.spawnZone({
                  type: 'cone', x: e.x, y: e.y, r: 300, a: Math.atan2(dy, dx),
                  arc: 0.34, warn: 1.2, dmg: 0, quiet: true, owner: 'enemy',
                });
                break;
              }
            }
            const px = -uy, py = ux;
            const s = Math.sin(this.t * 7 + ai.ph) * 0.45;
            let vx = ux + px * s, vy = uy + py * s;
            const il = 1 / (Math.hypot(vx, vy) || 1);
            e.x += vx * il * e.spd * slowMul * dt;
            e.y += vy * il * e.spd * slowMul * dt;
            break;
          }
          case 'hop': {
            // The tongue. A frog inflates where it landed, and whatever it was
            // aimed at when it started is where the strike goes.
            if (e.puffT > 0) {
              e.puffT -= dt;
              if (e.puffT <= 0) {
                e.puffT = 0;
                this.fireEshot(e.x, e.y - 8, ai.tongueA || 0, e.shotSpd, e.shotDmg, e.kind);
                AudioSys.play('swing', { pitch: 1.35 });
              }
            }
            if (e.shotCd > 0) ai.shotT -= dt;

            const hopSpd = ai.hopSpd * slowMul;
            if (ai.state === 'idle') {
              ai.t -= dt;
              if (ai.t <= 0) {
                ai.state = 'hop';
                ai.k = 0;
                let a = Math.atan2(uy, ux);
                // Rabbits that have seen an act out learn the feint: near a
                // third of their hops come down well off where you read them.
                if (e.kind === 'rabbit' && this.act >= 2 && Math.random() < 0.3) {
                  a += (Math.random() < 0.5 ? -1 : 1) * Math.PI / 4;
                }
                ai.dx = Math.cos(a); ai.dy = Math.sin(a);
              }
            } else if (ai.state === 'hop') {
              ai.k += dt / 0.42;
              e.x += ai.dx * hopSpd * dt;
              e.y += ai.dy * hopSpd * dt;
              if (ai.k >= 1) {
                ai.state = 'idle';
                ai.t = rand(0.35, 0.7);
                // Landed, and it can see you from here.
                if (e.shotCd > 0 && ai.shotT <= 0 && !(e.puffT > 0) && d < (e.tongue || 320)) {
                  ai.shotT = e.shotCd;
                  ai.tongueA = Math.atan2(dy, dx);
                  e.puffT = e.puff || 0.35;
                }
              }
            }
            break;
          }
          case 'orbit': {
            // Holds a ring around the player: sidesteps along it, closes or
            // backs off at half speed to keep the range it wants.
            const want = e.orbitR || 260;
            const spin = ai.spin || 1;
            const gap = d - want;
            const radial = clamp(gap / 90, -1, 1);
            const vx = -uy * spin + ux * radial * 0.5;
            const vy = ux * spin + uy * radial * 0.5;
            const il = 1 / (Math.hypot(vx, vy) || 1);
            e.x += vx * il * e.spd * slowMul * dt;
            e.y += vy * il * e.spd * slowMul * dt;
            break;
          }
          case 'burrow': {
            if (ai.state === 'under') {
              setHidden(e, true);
              e.x += ux * e.spd * 1.3 * slowMul * dt;
              e.y += uy * e.spd * 1.3 * slowMul * dt;
              ai.t -= dt;
              if (ai.t <= 0) {
                ai.state = 'rise';
                ai.t = 0.5;
                this.spawnZone({
                  x: e.x, y: e.y, r: 70, warn: 0.5, dmg: e.dmg * 0.8,
                  knock: 80, kind: e.kind,
                });
              }
            } else if (ai.state === 'rise') {
              ai.t -= dt;
              if (ai.t <= 0) {
                setHidden(e, false);
                ai.state = 'out';
                ai.t = 1.2;
                this.spawnPuff(e.x, e.y, 8);
              }
            } else {
              e.x += ux * e.spd * slowMul * dt;
              e.y += uy * e.spd * slowMul * dt;
              ai.t -= dt;
              if (ai.t <= 0) { ai.state = 'under'; ai.t = e.underT || 2.5; }
            }
            break;
          }
          case 'leash': {
            // Chases you, but never strays far from its partners: pull the
            // pack's middle back in once the tether stretches.
            let vx = ux, vy = uy;
            const g = this._leash ? this._leash.get(e.leashGroup) : null;
            if (g && g.n > 1) {
              const gx = g.x - e.x, gy = g.y - e.y;
              const gd = Math.hypot(gx, gy) || 1;
              const pull = clamp((gd - 90) / 120, 0, 1) * 1.4;
              vx += gx / gd * pull;
              vy += gy / gd * pull;
            }
            const il = 1 / (Math.hypot(vx, vy) || 1);
            e.x += vx * il * e.spd * slowMul * dt;
            e.y += vy * il * e.spd * slowMul * dt;
            break;
          }
          case 'bosshare': {
            this.bossHare(e, dt, ux, uy, d, slowMul);
            break;
          }
          case 'bossmole': {
            this.bossMole(e, dt, ux, uy, d, slowMul);
            break;
          }
          case 'bossbehind': {
            this.bossBehind(e, dt, ux, uy, d, slowMul);
            break;
          }
          case 'ranged': {
            // Birds that only throw back away when you close. A stabber does
            // not: closing on it is how you get stabbed, so it holds its
            // ground and lets you walk in.
            const backOff = e.stab ? 0 : 175;
            if (d > 270) { e.x += ux * e.spd * slowMul * dt; e.y += uy * e.spd * slowMul * dt; }
            else if (d < backOff) { e.x -= ux * e.spd * slowMul * dt; e.y -= uy * e.spd * slowMul * dt; }
            else { e.x += -uy * e.spd * 0.5 * slowMul * dt; e.y += ux * e.spd * 0.5 * slowMul * dt; }
            ai.shotT -= dt;
            if (ai.shotT <= 0 && d < 430) {
              ai.shotT = e.shotCd;
              const sa = Math.atan2(dy, dx);
              if (e.stab && d < 150) {
                // Close enough to reach. It does not throw anything: the bill
                // comes straight down on the ground you are standing on.
                this.spawnZone({
                  x: p.x, y: p.y, r: 46, warn: 0.45, dmg: e.shotDmg * 1.3,
                  knock: 60, kind: e.kind,
                });
                AudioSys.play('swing', { pitch: 0.85 });
              } else if (e.kind === 'owl' && this.act >= 3) {
                // Burn owls stopped firing one at a time.
                for (let i = -1; i <= 1; i++) {
                  this.fireEshot(e.x, e.y - 10, sa + i * 0.22, e.shotSpd, e.shotDmg, e.kind);
                }
              } else {
                this.fireEshot(e.x, e.y - 10, sa, e.shotSpd, e.shotDmg, e.kind);
              }
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
                ai.trailT = 0;
              }
            } else if (ai.state === 'charge') {
              ai.t -= dt;
              e.x += ai.dx * ai.chargeSpd * slowMul * dt;
              e.y += ai.dy * ai.chargeSpd * slowMul * dt;
              // An elk runs smouldering: the lane it just took catches a beat
              // after it has gone through, so the safe ground is behind it.
              if (e.trail) {
                ai.trailT = (ai.trailT || 0) - dt;
                if (ai.trailT <= 0) {
                  ai.trailT += 0.09;
                  this.spawnZone({
                    x: e.x, y: e.y, r: 30, warn: 0.55, fire: 0.5,
                    dmg: e.dmg * 0.35, quiet: true, kind: e.kind,
                  });
                }
              }
              if (ai.t <= 0) { ai.state = 'recover'; ai.t = 0.5; }
            } else {
              ai.t -= dt;
              if (ai.t <= 0) { ai.state = 'stalk'; ai.t = rand(1.2, 2.2); }
            }
            break;
          }
          case 'bossvicar': {
            // The same pattern serves the boss and the collector who walks the
            // early acts with it: thinner rings and fewer hands when it is not
            // the fight the whole room is built around.
            e.x += ux * e.spd * dt;
            e.y += uy * e.spd * dt;
            ai.ringT -= dt;
            if (ai.ringT <= 0) {
              ai.ringT = e.boss ? 4 : 5.5;
              const n = e.boss ? 10 : 7;
              for (let i = 0; i < n; i++) {
                this.fireEshot(e.x, e.y - 10, i * TAU / n + this.t, 160, e.dmg * 0.55, e.kind);
              }
              AudioSys.play('roar');
            }
            ai.summonT -= dt;
            if (ai.summonT <= 0) {
              ai.summonT = e.boss ? 15 : 20;
              this.summonAround(e, ['raccoon'], e.boss ? 3 : 2);
            }
            break;
          }
          case 'bossstag': {
            this.bossStag(e, dt, ux, uy, d, slowMul);
            break;
          }
        }
      }

      // room walls: revert the blocked axis so enemies slide along walls, and
      // a boar that charges into one staggers (the arena becomes a weapon)
      if (this.room) {
        if (Collide.blockedAt(this.room, e.x, e.y)) {
          const hitCharge = e.move === 'charge' && ai.state === 'charge';
          if (!Collide.blockedAt(this.room, preX, e.y)) {
            e.x = preX;
            // Chasing square into a wall face stalls without routing: bias a
            // slide along the wall so the crowd pours around the corner.
            if (Math.abs(uy) < 0.45) {
              e.slideDir = e.slideDir || (e.bob > Math.PI ? 1 : -1);
              const sy = e.y + e.spd * dt * e.slideDir;
              if (!Collide.blockedAt(this.room, e.x, sy)) e.y = sy;
              else e.slideDir = -e.slideDir;
            }
          }
          else if (!Collide.blockedAt(this.room, e.x, preY)) {
            e.y = preY;
            if (Math.abs(ux) < 0.45) {
              e.slideDir = e.slideDir || (e.bob > Math.PI ? 1 : -1);
              const sx = e.x + e.spd * dt * e.slideDir;
              if (!Collide.blockedAt(this.room, sx, e.y)) e.x = sx;
              else e.slideDir = -e.slideDir;
            }
          }
          else {
            e.x = preX; e.y = preY;
            // Born or shoved inside geometry: eject toward the room center a
            // step per frame until free, instead of freezing forever.
            if (Collide.blockedAt(this.room, preX, preY)) {
              const b = this.room.bounds;
              const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2;
              const ed = Math.hypot(cxm - e.x, cym - e.y) || 1;
              e.x += (cxm - e.x) / ed * Math.max(60, e.spd) * dt * 2;
              e.y += (cym - e.y) / ed * Math.max(60, e.spd) * dt * 2;
            }
          }
          if (hitCharge) {
            ai.state = 'recover'; ai.t = 0.6;
            e.stunT = Math.max(e.stunT || 0, 0.6);
            e.kx *= 0.2; e.ky *= 0.2;
            this.spawnPuff(e.x, e.y - e.r * 0.5, 6);
            this.shakeAdd(2);
          }
        }
        const cb = Collide.clampToBounds(e.x, e.y, e.r * 0.6, this.room.bounds);
        e.x = cb.x; e.y = cb.y;
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

      // contact damage (nothing underground touches you)
      const rr = e.r + p.r;
      if (!e.hidden && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        if (e.tally) this.tallySteal(e);
        this.damagePlayer(e.dmg * (e.dmgF || 1), e.x, e.y, e.kind);
      }

      // faraway trash gets recycled to the spawn ring (open field only:
      // a room's enemies stay in the room)
      if (!e.boss && !this.room && dist2(e.x, e.y, p.x, p.y) > relocate2) {
        const pos = this.spawnPos();
        e.x = pos.x; e.y = pos.y;
      }

      e.flip = p.x < e.x;
    }
    this._hasMole = sawMole;

    // Anything that died this frame still has one beat left to do something
    // about it: game.js sweeps the dead after this returns.
    this.runDeathEffects();
  };

})();
