// Merit Badge Massacre: one room instance. Bounds, doors, solids, the block
// grid the collide helpers read, the wave pump, and the clear-then-open door
// lifecycle.
//
// Every night is rooms now. The 1.0 open field survives only behind the
// MBM_FIELD debug flag in ui.js, where g.room stays null and every path in
// this file sleeps. A room is driven by three calls and nothing else:
//
//   const room = new Room(def, rng);   // geometry, doors, waves resolved
//   room.enter(g);                     // solids, props, scatter, grid
//   g.room = room;                     // then room.update(g, dt) per frame
'use strict';

const ROOM_TAU = Math.PI * 2;
const ROOM_CELL = 24;            // block grid resolution, world units
const ROOM_ENTRY_INSET = 46;     // how far inside the wall the player lands
const ROOM_LOCK_STEP = 40;       // how much further in before the doors shut
const ROOM_LOCK_T = 0.9;         // ... or this long, whichever lands first
const ROOM_DOOR_R = 46;          // door trigger radius
const ROOM_DOOR_W = 64;          // door sprite draw width
const ROOM_DWELL = 0.3;          // seconds stood in a door before it fires
const ROOM_OPEN_T = 0.25;        // door opening animation
const ROOM_CLEAR_GRACE = 0.4;    // beat between the last kill and the payout
const ROOM_RELEASE = 0.06;       // one queued spawn every this many seconds
const ROOM_SCATTER_INSET = 80;   // scatter stays this far off the walls
const ROOM_SCATTER_CLEAR = 64;   // ... and this far off anything that matters
const ROOM_SPAWN_INSET = 32;     // spawns clip to bounds inset by this
const ROOM_EDGE_AWAY = 190;      // edge spawns land at least this far away
const ROOM_TRIES = 20;           // rejection sampling budget per placement
const ROOM_FIND_R = 46;          // how close you stand to a find to read it
const ROOM_FIND_DWELL = 0.4;     // ... and how long you stand there

class Room {
  // Deeper Nights, read from the room. Every read is defensive on purpose:
  // the open field, the layout validator and any save written before the
  // totem was raised all answer false, so an uncarved night is the room this
  // file has always built.
  static night(id) {
    if (typeof Totem === 'undefined' || !Totem) return false;
    if (typeof META === 'undefined' || !META) return false;
    try { return !!Totem.open(META) && !!Totem.on(id, META); } catch (e) { return false; }
  }

  constructor(def, rng) {
    this.def = def || null;
    this.rng = typeof rng === 'function' ? rng : Math.random;

    // THE MARK SPREADS. Corruption is decided off the layout def (render.js
    // rdCorruption reads def.corruption first, then falls back to boss rooms
    // and the last two rooms of an act), so a marked night hands this room a
    // copy of its own def with the tier turned up. The copy is the reason the
    // shared ROOMS table is never written to: the tier belongs to tonight,
    // not to the layout.
    if (this.def && Room.night('mark') && (this.def.corruption | 0) < 1) {
      this.def = Object.assign({}, this.def, { corruption: 1 });
      def = this.def;
    }

    // TIGHTER WOODS packs twenty percent more bodies into every room. The
    // remainder rides along from wave to wave rather than being rounded away,
    // so a room of small waves still ends up a fifth heavier.
    this.bodyMul = Room.night('tighter') ? 1.2 : 1;
    this._bodyCarry = 0.5;

    const size = def && def.size ? def.size : null;
    this.w = size && size.w > 0 ? size.w : 1900;
    this.h = size && size.h > 0 ? size.h : 1300;
    this.bounds = {
      x0: -this.w / 2, y0: -this.h / 2,
      x1: this.w / 2, y1: this.h / 2,
    };

    this.lock = def && def.lock ? def.lock : 'none';
    // Smallest act the layout is dealt in, unless the run tells us otherwise
    // by writing room.act before enter().
    this.act = (def && Array.isArray(def.acts) && def.acts.length)
      ? Math.min.apply(null, def.acts) : 1;
    this.roomIdx = null;
    this.threatValue = null;

    this.solids = [];
    this.solidDecos = [];
    this.grid = null;
    this.doors = [];

    this.state = 'entering';
    this.enterT = 0;
    this.clearGrace = ROOM_CLEAR_GRACE;
    this.objectiveDone = false;
    this.doorFired = false;
    this.t = 0;

    // The one thing a lore room holds: { x, y, id, def }, or null once the act
    // has nothing left to hand over. Filled in by enter().
    this.findSpot = null;
    this.findT = 0;
    this.mailFind = false;

    // wave machinery, armed by the lock-in
    this.waves = [];
    const raw = def && Array.isArray(def.waves) ? def.waves : [];
    for (let i = 0; i < raw.length; i++) this.waves.push(this._resolveWave(raw[i]));
    this.armed = false;
    this.waveIdx = -1;
    this.wave = null;
    this.nextWaveIdx = null;
    this.waveT = 0;
    this.waveElapsed = 0;
    this.waveTotal = 0;
    this.waveSpawned = [];
    this.dripT = 0;
    this.pending = [];
    this.releaseT = 0;
    this._markerI = 0;

    this._buildDoors();
  }

  // ---------------------------------------------------------------- geometry
  // Layouts are authored with the origin at the room's top left corner; the
  // world has the room centered on 0, 0.
  toWorld(lx, ly) {
    return { x: this.bounds.x0 + lx, y: this.bounds.y0 + ly };
  }

  // A point on a wall: t runs left to right on n/s, top to bottom on e/w.
  wallPoint(side, t) {
    const b = this.bounds;
    const f = t == null ? 0.5 : t;
    if (side === 'n') return { x: b.x0 + f * this.w, y: b.y0 };
    if (side === 's') return { x: b.x0 + f * this.w, y: b.y1 };
    if (side === 'e') return { x: b.x1, y: b.y0 + f * this.h };
    return { x: b.x0, y: b.y0 + f * this.h };
  }

  // The inward normal of a wall, so one helper serves entry points, door
  // spawns and the lock-in depth test.
  inward(side) {
    if (side === 'n') return { x: 0, y: 1 };
    if (side === 's') return { x: 0, y: -1 };
    if (side === 'e') return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }

  _buildDoors() {
    const def = this.def;
    const list = def && Array.isArray(def.doors) ? def.doors : [];
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const p = this.wallPoint(d.side, d.t);
      this.doors.push({
        side: d.side, t: d.t, x: p.x, y: p.y, r: ROOM_DOOR_R,
        state: 'shut', offer: null, dwell: 0, openT: 0,
      });
    }

    const e = def && def.entry ? def.entry : { side: 'w', t: 0.5 };
    this.entrySide = e.side || 'w';
    this.entryT = e.t == null ? 0.5 : e.t;
    const wp = this.wallPoint(this.entrySide, this.entryT);
    const n = this.inward(this.entrySide);
    this.entryPoint = {
      x: wp.x + n.x * ROOM_ENTRY_INSET,
      y: wp.y + n.y * ROOM_ENTRY_INSET,
    };
    this.entry = {
      side: this.entrySide, t: this.entryT,
      x: this.entryPoint.x, y: this.entryPoint.y,
    };
  }

  // ------------------------------------------------------------- wave tables
  // A wave with a ref borrows the template's spawns and its screen name; every
  // other field stays the layout's own.
  _resolveWave(w) {
    const src = w || {};
    const out = {
      delay: src.delay > 0 ? src.delay : 0,
      nextAt: src.nextAt > 0 ? src.nextAt : 0,
      maxT: src.maxT > 0 ? src.maxT : 0,
      elites: src.elites > 0 ? src.elites : 0,
      drip: src.drip || null,
      ref: src.ref || null,
      spawns: Array.isArray(src.spawns) ? src.spawns : [],
      name: src.name || null,
    };
    if (out.ref && typeof WAVE_TEMPLATES !== 'undefined' && WAVE_TEMPLATES[out.ref]) {
      const tpl = WAVE_TEMPLATES[out.ref];
      out.spawns = Array.isArray(tpl.spawns) ? tpl.spawns : [];
      out.name = tpl.name || out.name;
    }
    return out;
  }

  // ------------------------------------------------------------------- enter
  // Dresses the room and hands it to the game. Called before g.room is set by
  // the caller, so it claims g.room itself: spawnProp() only bakes a prop's
  // footprint into a room that is already the live one.
  enter(g) {
    if (!g) return this;
    g.room = this;

    const def = this.def;

    if (def && Array.isArray(def.solids)) {
      for (let i = 0; i < def.solids.length; i++) {
        const s = def.solids[i];
        const p = this.toWorld(s.x, s.y);
        const pd = (typeof PROPS !== 'undefined' && s.spr) ? PROPS[s.spr] : null;
        // A solid whose sprite names an unbreakable prop (boulder) is that
        // prop: it gets the shadow, the y-sort and the footprint for free.
        if (pd && pd.solid && !pd.breakable && typeof g.spawnProp === 'function') {
          g.spawnProp(s.spr, p.x, p.y);
          continue;
        }
        const hw = (s.w || 0) / 2, hh = (s.h || 0) / 2;
        this.solids.push({ x0: p.x - hw, y0: p.y - hh, x1: p.x + hw, y1: p.y + hh });
        this.solidDecos.push({ spr: s.spr || null, x: p.x, y: p.y, w: s.w || 0 });
      }
    }

    if (def && Array.isArray(def.props) && typeof g.spawnProp === 'function') {
      for (let i = 0; i < def.props.length; i++) {
        const pr = def.props[i];
        const p = this.toWorld(pr.x, pr.y);
        g.spawnProp(pr.id, p.x, p.y);
      }
    }

    const sc = def && def.scatter ? def.scatter : null;
    if (sc && typeof g.spawnProp === 'function') {
      for (const id in sc) {
        if (!Object.prototype.hasOwnProperty.call(sc, id)) continue;
        const range = sc[id] || [0, 0];
        const min = range[0] | 0;
        const max = range[1] == null ? min : (range[1] | 0);
        const span = Math.max(0, max - min);
        const n = min + Math.floor(this.rng() * (span + 1));
        for (let i = 0; i < n; i++) {
          const spot = this._scatterSpot(g);
          if (spot) g.spawnProp(id, spot.x, spot.y);
        }
      }
    }

    this.buildGrid();

    if (this.act != null) g.act = this.act;
    if (this.roomIdx != null) g.roomIdx = this.roomIdx;
    if (this.threatValue != null) g._threat = this.threatValue;

    this._markAct(g);
    this._placeFind(g);

    this.state = 'entering';
    this.enterT = 0;
    return this;
  }

  // Getting this deep is the story beat. Brock reads these two switches at the
  // fire, and the room is the thing that moves the act, so the room sets them.
  _markAct(g) {
    if (typeof META === 'undefined' || !META) return;
    const act = (g && g.act != null) ? g.act : this.act;
    if (!(act >= 2)) return;
    if (!META.flags || typeof META.flags !== 'object') META.flags = {};
    let changed = false;
    if (act >= 2 && !META.flags.act2) { META.flags.act2 = true; changed = true; }
    if (act >= 3 && !META.flags.act3) { META.flags.act3 = true; changed = true; }
    if (changed && typeof META.save === 'function') META.save();
  }

  // A lore room holds exactly one find, standing on the layout's first spawn
  // marker (the lore layouts leave that spot clear for it) or on the room
  // center when the layout has no markers. Once the act's finds are all in the
  // journal there is nothing to stand there, so nothing does.
  _placeFind(g) {
    this.findSpot = null;
    this.findT = 0;
    const def = this.def;
    if (!def || def.type !== 'lore') return;
    if (typeof Finds === 'undefined' || !Finds) return;
    const act = (g && g.act != null) ? g.act : this.act;
    const id = Finds.nextFor(act);
    if (!id) return;
    const mk = (Array.isArray(def.spawnMarkers) && def.spawnMarkers.length) ? def.spawnMarkers[0] : null;
    const p = mk ? this.toWorld(mk.x, mk.y) : { x: 0, y: 0 };
    this.findSpot = { x: p.x, y: p.y, id, def: Finds.byId(id) };
  }

  // Stand on it and read it. Walking off resets faster than it fills, so a
  // find is a small deliberate stop rather than something you collect by
  // running past at the wrong angle.
  _tickFind(g, dt) {
    const spot = this.findSpot;
    if (!spot) return;
    const p = g ? g.player : null;
    if (!p) return;
    if (this._d2(p.x, p.y, spot.x, spot.y) <= ROOM_FIND_R * ROOM_FIND_R) this.findT += dt;
    else this.findT = Math.max(0, this.findT - dt * 2);
    if (this.findT < ROOM_FIND_DWELL) return;
    this.findSpot = null;
    this.findT = 0;
    if (typeof Finds !== 'undefined' && Finds) Finds.grant(g, spot.id);
  }

  _scatterSpot(g) {
    const b = this.bounds;
    const x0 = b.x0 + ROOM_SCATTER_INSET, x1 = b.x1 - ROOM_SCATTER_INSET;
    const y0 = b.y0 + ROOM_SCATTER_INSET, y1 = b.y1 - ROOM_SCATTER_INSET;
    if (x1 <= x0 || y1 <= y0) return null;
    const clear2 = ROOM_SCATTER_CLEAR * ROOM_SCATTER_CLEAR;
    const p = g ? g.player : null;

    for (let tries = 0; tries < ROOM_TRIES; tries++) {
      const x = x0 + this.rng() * (x1 - x0);
      const y = y0 + this.rng() * (y1 - y0);
      if (p && this._d2(x, y, p.x, p.y) < clear2) continue;
      if (this._d2(x, y, this.entryPoint.x, this.entryPoint.y) < clear2) continue;
      let bad = false;
      for (let i = 0; i < this.doors.length && !bad; i++) {
        const d = this.doors[i];
        if (this._d2(x, y, d.x, d.y) < clear2) bad = true;
      }
      for (let i = 0; i < this.solids.length && !bad; i++) {
        if (this._boxDist2(x, y, this.solids[i]) < clear2) bad = true;
      }
      if (bad) continue;
      return { x, y };
    }
    return null;
  }

  // ---------------------------------------------------------- the block grid
  buildGrid() {
    const b = this.bounds;
    const cw = Math.max(1, Math.ceil((b.x1 - b.x0) / ROOM_CELL));
    const ch = Math.max(1, Math.ceil((b.y1 - b.y0) / ROOM_CELL));
    this.grid = {
      x0: b.x0, y0: b.y0, cw, ch, cell: ROOM_CELL,
      data: new Uint8Array(cw * ch),
    };
    for (let i = 0; i < this.solids.length; i++) {
      this.solids[i].baked = true;
      this._stamp(this.solids[i], 1);
    }
    return this.grid;
  }

  // spawnProp() pushes a footprint straight onto solids without knowing about
  // the grid, so anything that arrived that way gets stamped on the next
  // frame instead of being solid to the player but invisible to the grid.
  _syncGrid() {
    if (!this.grid) return;
    for (let i = 0; i < this.solids.length; i++) {
      const box = this.solids[i];
      if (box.baked) continue;
      box.baked = true;
      this._stamp(box, 1);
    }
  }

  // Adds a blocker and marks its cells.
  bake(box) {
    if (!box) return null;
    if (this.solids.indexOf(box) < 0) this.solids.push(box);
    box.baked = true;
    if (this.grid) this._stamp(box, 1);
    return box;
  }

  // Removes a blocker (a prop, or a raw box) and recomputes only the cells it
  // covered, so two overlapping blockers never punch each other's holes.
  unbake(prop) {
    if (!prop) return;
    const box = prop.solidBox || (prop.x0 != null && prop.x1 != null ? prop : null);
    if (!box) return;
    const i = this.solids.indexOf(box);
    if (i >= 0) this.solids.splice(i, 1);
    box.baked = false;
    if (this.grid) this._restamp(box);
  }

  _cellRange(box) {
    const gr = this.grid;
    if (!gr) return null;
    const maxX = gr.x0 + gr.cw * gr.cell;
    const maxY = gr.y0 + gr.ch * gr.cell;
    if (box.x1 <= gr.x0 || box.x0 >= maxX) return null;
    if (box.y1 <= gr.y0 || box.y0 >= maxY) return null;
    const gx0 = Math.max(0, Math.min(gr.cw - 1, Math.floor((box.x0 - gr.x0) / gr.cell)));
    const gx1 = Math.max(0, Math.min(gr.cw - 1, Math.floor((box.x1 - gr.x0) / gr.cell)));
    const gy0 = Math.max(0, Math.min(gr.ch - 1, Math.floor((box.y0 - gr.y0) / gr.cell)));
    const gy1 = Math.max(0, Math.min(gr.ch - 1, Math.floor((box.y1 - gr.y0) / gr.cell)));
    return { gx0, gx1, gy0, gy1 };
  }

  _stamp(box, v) {
    const r = this._cellRange(box);
    if (!r) return;
    const gr = this.grid;
    for (let gy = r.gy0; gy <= r.gy1; gy++) {
      for (let gx = r.gx0; gx <= r.gx1; gx++) gr.data[gy * gr.cw + gx] = v;
    }
  }

  _restamp(box) {
    const r = this._cellRange(box);
    if (!r) return;
    const gr = this.grid;
    for (let gy = r.gy0; gy <= r.gy1; gy++) {
      for (let gx = r.gx0; gx <= r.gx1; gx++) {
        const cx0 = gr.x0 + gx * gr.cell, cx1 = cx0 + gr.cell;
        const cy0 = gr.y0 + gy * gr.cell, cy1 = cy0 + gr.cell;
        let hit = 0;
        for (let i = 0; i < this.solids.length; i++) {
          const s = this.solids[i];
          if (s.x0 < cx1 && s.x1 > cx0 && s.y0 < cy1 && s.y1 > cy0) { hit = 1; break; }
        }
        gr.data[gy * gr.cw + gx] = hit;
      }
    }
  }

  // ------------------------------------------------------------------ update
  update(g, dt) {
    if (!g) return;
    dt = (typeof dt === 'number' && dt > 0) ? dt : 0;
    this.t += dt;
    this._syncGrid();

    if (this.state === 'entering') this._tickEntering(g, dt);
    if (this.state === 'active' && (this.lock === 'clear' || this.lock === 'survive')) this._tickWaves(g, dt);
    this._releasePending(g, dt);
    if (this.state === 'active') {
      if (this.lock === 'clear') this._tickClear(g, dt);
      else if (this.lock === 'survive') {
        // Hold out: the doors open on the clock, not on the body count.
        this.surviveLeft = Math.max(0, (this.def.surviveT || 45) - (this.t - (this.lockT || 0)));
        if (this.surviveLeft <= 0) this.onClear(g);
      }
      else if (this.lock === 'objective') {
        // A loot room's objective is its cache: a chest spawned at the room
        // center on entry. Collecting it (the pickup magnet does the walk
        // up work) completes the room. Without this, the doors never open.
        if (!this._cacheSpawned && this.def && this.def.type === 'loot') {
          this._cacheSpawned = true;
          g.pickups.push({ type: 'chest', x: 0, y: 0, t: 0, cache: true });
          if (typeof DATA !== 'undefined' && DATA.COINS) g.gainCoins(Math.round(DATA.COINS.cache * 0.4));
        }
        if (this._cacheSpawned && !this.objectiveDone) {
          const left = g.pickups.some(pk => pk.cache);
          if (!left) this.objectiveDone = true;
        }
        if (this.objectiveDone === true) this._onObjective(g);
      }
    }
    this._tickFind(g, dt);
    this._tickDoors(g, dt);
  }

  // How far past the entry wall the player has walked.
  entryDepth(g) {
    const p = g ? g.player : null;
    if (!p) return 0;
    const b = this.bounds;
    if (this.entrySide === 'n') return p.y - b.y0;
    if (this.entrySide === 's') return b.y1 - p.y;
    if (this.entrySide === 'e') return b.x1 - p.x;
    return p.x - b.x0;
  }

  _tickEntering(g, dt) {
    this.enterT += dt;
    const stepped = this.entryDepth(g) >= ROOM_ENTRY_INSET + ROOM_LOCK_STEP;
    if (stepped || this.enterT >= ROOM_LOCK_T) this._lockIn(g);
  }

  _lockIn(g) {
    this.state = 'active';
    this.armed = true;
    this.lockT = this.t;
    if (this.lock !== 'clear' && this.lock !== 'survive') {
      // Nothing to fight. Shops, rests and lore rooms stand open; a loot room
      // waits on its objective and opens the moment that flips.
      if (this.lock !== 'objective') this.openDoors();
      return;
    }
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      d.state = 'shut';
      d.openT = 0;
      d.dwell = 0;
    }
    if (this.waves.length) {
      this.nextWaveIdx = 0;
      this.waveT = this.waves[0].delay;
    } else {
      this.nextWaveIdx = null;
    }
  }

  // -------------------------------------------------------------- wave pump
  _tickWaves(g, dt) {
    if (this.wave) {
      this.waveElapsed += dt;
      const drip = this.wave.drip;
      if (drip && drip.every > 0) {
        this.dripT -= dt;
        while (this.dripT <= 0) {
          this.dripT += drip.every;
          const n = drip.n > 0 ? drip.n : 1;
          for (let i = 0; i < n; i++) {
            this._queueOne(g, drip.id || 'auto', { mode: 'edge' }, i, n, -1);
          }
        }
      }
      if (this._shouldAdvance()) this._endWave(g);
      return;
    }
    if (this.nextWaveIdx != null) {
      this.waveT -= dt;
      if (this.waveT <= 0) this._beginWave(g, this.nextWaveIdx);
    }
  }

  _beginWave(g, i) {
    const w = this.waves[i];
    if (!w) { this.nextWaveIdx = null; return; }
    this.waveIdx = i;
    this.wave = w;
    this.nextWaveIdx = null;
    this.waveElapsed = 0;
    this.waveSpawned = [];
    this.dripT = (w.drip && w.drip.every > 0) ? w.drip.every : 0;

    const before = this.pending.length;
    for (let s = 0; s < w.spawns.length; s++) {
      const sp = w.spawns[s];
      const n = this._bodyCount(sp && sp.n > 0 ? (sp.n | 0) : 0);
      for (let k = 0; k < n; k++) this._queueOne(g, sp.id, sp, k, n, i);
    }
    const mine = this.pending.length - before;
    this.waveTotal = mine;

    // Elites are spread through the wave, not stacked on its front.
    const elites = Math.min(w.elites, mine);
    for (let e = 0; e < elites; e++) {
      const idx = before + Math.floor((e * mine) / elites);
      const q = this.pending[Math.min(this.pending.length - 1, idx)];
      if (q) q.elite = true;
    }

    if (w.name && typeof g.toast === 'function') g.toast(w.name);
  }

  // How many bodies an authored count is worth tonight. On an uncarved night
  // this is the authored number and nothing else happens. TIGHTER WOODS keeps
  // the fraction it could not spend and spends it on the next group, so three
  // groups of three become 4, 4, 3 rather than three untouched groups. The
  // carry starts at a half so the running total rounds rather than always
  // rounding down, which is what keeps a whole room honest at a fifth more.
  _bodyCount(n) {
    if (!(n > 0) || this.bodyMul === 1) return n;
    const want = n * this.bodyMul + this._bodyCarry;
    const take = Math.floor(want);
    this._bodyCarry = want - take;
    return take;
  }

  _endWave(g) {
    this.wave = null;
    const next = this.waveIdx + 1;
    if (next < this.waves.length) {
      this.nextWaveIdx = next;
      this.waveT = this.waves[next].delay;
    } else {
      this.nextWaveIdx = null;
    }
  }

  // A wave hands over when enough of it is dead, when it has outstayed its
  // maxT, or when it finished spawning and nothing of it is left standing.
  _shouldAdvance() {
    const w = this.wave;
    if (!w) return false;
    if (w.maxT > 0 && this.waveElapsed >= w.maxT) return true;
    if (this._pendingOf(this.waveIdx) > 0) return false;
    if (this.waveTotal <= 0) return true;
    const living = this._livingOfWave();
    if (living / this.waveTotal <= w.nextAt) return true;
    return living === 0;
  }

  _pendingOf(waveIdx) {
    let n = 0;
    for (let i = 0; i < this.pending.length; i++) {
      if (this.pending[i].wave === waveIdx) n++;
    }
    return n;
  }

  _livingOfWave() {
    let n = 0;
    for (let i = 0; i < this.waveSpawned.length; i++) {
      const e = this.waveSpawned[i];
      if (e && !e.dead) n++;
    }
    return n;
  }

  livingEnemies(g) {
    const list = g && Array.isArray(g.enemies) ? g.enemies : null;
    if (!list) return 0;
    let n = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) n++;
    return n;
  }

  // Positions resolve when the spawn is queued; the queue then pours out one
  // body every ROOM_RELEASE so a 30 strong wave arrives as a flood, not as a
  // single frame of thirty.
  _queueOne(g, id, sp, k, n, waveIdx) {
    let kind = id;
    if (!kind || kind === 'auto') {
      kind = (typeof g.pickSpawn === 'function') ? g.pickSpawn(g.threat) : null;
    }
    if (!kind) return null;
    const pos = this._free(this._spawnPos(g, sp, k, n));
    if (!pos) return null;
    const q = { id: kind, x: pos.x, y: pos.y, elite: false, wave: waveIdx };
    this.pending.push(q);
    return q;
  }

  // No spawn mode may ever place a body inside a blocked cell: a walker born
  // in a wall freezes there and the room can never clear. Spiral outward to
  // the nearest free spot, falling back to the entry.
  _free(spot) {
    if (!spot) return null;
    if (!this._blocked(spot.x, spot.y)) return spot;
    for (let ring = 1; ring <= 6; ring++) {
      const rad = ring * ROOM_CELL;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * ROOM_TAU;
        const c = this._clip(spot.x + Math.cos(a) * rad, spot.y + Math.sin(a) * rad);
        if (!this._blocked(c.x, c.y)) return c;
      }
    }
    return { x: this.entryPoint.x, y: this.entryPoint.y };
  }

  _releasePending(g, dt) {
    if (!this.pending.length) {
      if (this.releaseT < 0) this.releaseT = 0;
      return;
    }
    this.releaseT -= dt;
    while (this.releaseT <= 0 && this.pending.length) {
      const q = this.pending.shift();
      let e = null;
      if (typeof g.spawnEnemy === 'function') e = g.spawnEnemy(q.id, q.x, q.y, q.elite);
      if (e && q.wave === this.waveIdx) this.waveSpawned.push(e);
      this.releaseT += ROOM_RELEASE;
    }
    if (!this.pending.length && this.releaseT < 0) this.releaseT = 0;
  }

  // ------------------------------------------------------------ spawn points
  _spawnPos(g, sp, k, n) {
    const mode = sp && sp.mode ? sp.mode : 'edge';
    if (mode === 'ring') return this._ringPos(g, sp && sp.r > 0 ? sp.r : 420, k, n);
    if (mode === 'marker') return this._markerPos(g);
    if (mode === 'point') return this._pointPos(sp);
    if (mode === 'door') return this._doorPos(g);
    return this._edgePos(g);
  }

  _clip(x, y) {
    if (typeof Collide !== 'undefined' && Collide && Collide.clampToBounds) {
      return Collide.clampToBounds(x, y, ROOM_SPAWN_INSET, this.bounds);
    }
    const b = this.bounds;
    return {
      x: Math.max(b.x0 + ROOM_SPAWN_INSET, Math.min(b.x1 - ROOM_SPAWN_INSET, x)),
      y: Math.max(b.y0 + ROOM_SPAWN_INSET, Math.min(b.y1 - ROOM_SPAWN_INSET, y)),
    };
  }

  _blocked(x, y) {
    if (typeof Collide === 'undefined' || !Collide || !Collide.blockedAt) return false;
    return Collide.blockedAt(this, x, y);
  }

  _edgePos(g) {
    const sides = ['n', 'e', 's', 'w'];
    const p = g ? g.player : null;
    const away2 = ROOM_EDGE_AWAY * ROOM_EDGE_AWAY;
    let last = null;
    for (let tries = 0; tries < ROOM_TRIES; tries++) {
      const side = sides[Math.min(3, (this.rng() * 4) | 0)];
      const wp = this.wallPoint(side, this.rng());
      const nrm = this.inward(side);
      const spot = this._clip(
        wp.x + nrm.x * ROOM_SPAWN_INSET,
        wp.y + nrm.y * ROOM_SPAWN_INSET
      );
      last = spot;
      if (p && this._d2(spot.x, spot.y, p.x, p.y) < away2) continue;
      if (this._blocked(spot.x, spot.y)) continue;
      return spot;
    }
    return last;
  }

  _ringPos(g, r, k, n) {
    const p = g ? g.player : null;
    const cx = p ? p.x : 0, cy = p ? p.y : 0;
    const count = n > 0 ? n : 1;
    const a = (k / count) * ROOM_TAU + this.rng() * 0.35;
    return this._clip(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }

  _markerPos(g) {
    const mk = this.def && Array.isArray(this.def.spawnMarkers) ? this.def.spawnMarkers : null;
    if (!mk || !mk.length) return this._edgePos(g);
    const m = mk[this._markerI % mk.length];
    this._markerI++;
    const p = this.toWorld(m.x, m.y);
    return this._clip(p.x, p.y);
  }

  _pointPos(sp) {
    if (!sp || sp.x == null || sp.y == null) {
      return this._clip(0, 0);
    }
    const p = this.toWorld(sp.x, sp.y);
    return this._clip(p.x, p.y);
  }

  _doorPos(g) {
    if (!this.doors.length) return this._edgePos(g);
    const d = this.doors[Math.min(this.doors.length - 1, (this.rng() * this.doors.length) | 0)];
    const nrm = this.inward(d.side);
    return this._clip(d.x + nrm.x * ROOM_SPAWN_INSET, d.y + nrm.y * ROOM_SPAWN_INSET);
  }

  // ------------------------------------------------------------------- clear
  _tickClear(g, dt) {
    if (this.wave || this.nextWaveIdx != null || !this.armed ||
        this.pending.length || this.livingEnemies(g) > 0) {
      this.clearGrace = ROOM_CLEAR_GRACE;
      return;
    }
    this.clearGrace -= dt;
    if (this.clearGrace <= 0) this.onClear(g);
  }

  onClear(g) {
    if (this.state === 'cleared') return;
    this.state = 'cleared';
    this.clearGrace = 0;
    this.openDoors();

    g.hitstop = Math.max(g.hitstop || 0, 0.18);
    g.flashGold = 0.5;
    const act = g.act != null ? g.act : (this.act || 1);
    if (typeof g.gainCoins === 'function' && typeof DATA !== 'undefined' &&
        DATA.COINS && typeof DATA.COINS.clear === 'function') {
      g.gainCoins(DATA.COINS.clear(act));
    }
    if (typeof AudioSys !== 'undefined' && AudioSys && typeof AudioSys.play === 'function') {
      AudioSys.play('chest');
    }
    if (typeof g.toast === 'function') g.toast('ROOM CLEAR', '#f4c542');
    // A room clearing belongs to the room, not to a scout, so the owner is
    // null and the bus hands each handler its own.
    if (g.hooks) g.hooks.emit('onRoomClear', g, null, this);
  }

  _onObjective(g) {
    if (this.state === 'cleared') return;
    this.state = 'cleared';
    this.openDoors();
    if (typeof AudioSys !== 'undefined' && AudioSys && typeof AudioSys.play === 'function') {
      AudioSys.play('chest');
    }
  }

  openDoors() {
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      if (d.state === 'open') continue;
      d.state = 'open';
      d.openT = ROOM_OPEN_T;
    }
  }

  isClear(g) {
    if (this.lock === 'none') return true;
    if (this.lock === 'objective') return this.objectiveDone === true;
    if (this.lock === 'survive') return this.state === 'cleared';
    if (this.lock === 'clear') {
      if (this.state === 'cleared') return true;
      if (!this.armed && this.waves.length) return false;
      if (this.wave || this.nextWaveIdx != null) return false;
      if (this.pending.length) return false;
      return this.livingEnemies(g) === 0;
    }
    return this.state === 'cleared';
  }

  // ------------------------------------------------------------------- doors
  _tickDoors(g, dt) {
    const p = g ? g.player : null;
    for (let i = 0; i < this.doors.length; i++) {
      const d = this.doors[i];
      if (d.openT > 0) d.openT = Math.max(0, d.openT - dt);
      if (d.state !== 'open') { d.dwell = 0; continue; }
      if (!p) continue;
      if (this._d2(p.x, p.y, d.x, d.y) <= d.r * d.r) d.dwell += dt;
      else d.dwell = Math.max(0, d.dwell - dt * 2);
      if (d.dwell >= ROOM_DWELL && !this.doorFired) {
        this.doorFired = true;
        if (typeof Transition !== 'undefined' && Transition && typeof Transition.start === 'function') {
          Transition.start(g, d);
        }
      }
    }
  }

  // ----------------------------------------------------------------- helpers
  _d2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  _boxDist2(x, y, box) {
    const cx = Math.max(box.x0, Math.min(x, box.x1));
    const cy = Math.max(box.y0, Math.min(y, box.y1));
    return this._d2(x, y, cx, cy);
  }
}

(function () {
  // The exit is a living gate of bramble. Shut, the weave fills the treeline
  // gap; opening, the weave parts from the middle and gathers at the sides
  // over the already lit gap; open, the woods are letting you through. The
  // shadow, the dwell arc and the offer plaque are untouched.
  Game.prototype.renderDoor = function (ctx, door) {
    if (!ctx || !door) return;
    if (typeof SPR === 'undefined' || !SPR) return;

    const open = door.state === 'open';
    const yB = door.y + 6;
    const W = ROOM_DOOR_W;
    const h = typeof SPR.height === 'function' ? SPR.height('gate_shut', W) : 84;
    // 0 while shut, easing to 1 as the opening animation runs out
    const k = open ? 1 - Math.max(0, Math.min(1, (door.openT || 0) / ROOM_OPEN_T)) : 0;
    const e = k * k * (3 - 2 * k);
    const t = this.t || 0;

    // corruption is the render side's call: read the same field it does, so a
    // marked room gets red thorn tips and scratched canes without a second
    // opinion about which rooms are marked
    let mark = false;
    if (this.room && typeof this._roomDress === 'function') {
      const rd = this._roomDress();
      mark = !!(rd && rd.corrupt);
    }
    const gate = (name, x, w, o) => {
      SPR.drawBottom(ctx, name, x, yB, w, o);
      if (mark) SPR.drawBottom(ctx, name + '_mark', x, yB, w, o);
    };

    ctx.save();

    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(door.x, yB, ROOM_DOOR_W * 0.46, ROOM_DOOR_W * 0.16, 0, 0, ROOM_TAU);
    ctx.fill();

    if (open && e > 0) {
      // the light pool the open gap throws on the ground in front of it
      const pr = W * 0.56 * (0.72 + 0.28 * e);
      const pg = ctx.createRadialGradient(door.x, yB + 4, 1, door.x, yB + 4, pr);
      pg.addColorStop(0, 'rgba(255,226,158,' + (0.3 * e).toFixed(3) + ')');
      pg.addColorStop(0.5, 'rgba(244,197,66,' + (0.12 * e).toFixed(3) + ')');
      pg.addColorStop(1, 'rgba(244,197,66,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(door.x, yB + 4);
      ctx.scale(1, 0.42);
      ctx.fillStyle = pg;
      ctx.translate(-door.x, -(yB + 4));
      ctx.beginPath(); ctx.arc(door.x, yB + 4, pr, 0, ROOM_TAU); ctx.fill();
      ctx.restore();
    }

    if (open && k > 0) {
      // the halo the open gap throws back into the treeline around it
      const cx = door.x, cy = yB - h * 0.52;
      const rad = h * 0.75;
      const gr = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      gr.addColorStop(0, 'rgba(255,238,190,' + (0.34 * e).toFixed(3) + ')');
      gr.addColorStop(0.45, 'rgba(244,197,66,' + (0.18 * e).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(244,197,66,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    if (!open) {
      gate('gate_shut', door.x, W, null);
    } else {
      // the parted gate is laid down first and the shut weave rides over it in
      // two halves, each squeezed toward its own edge of the gap: the curtain
      // gathers where it is pinned instead of sliding out of the treeline, and
      // the same art crushed into half the width is what thickens the bunches
      gate('gate_open', door.x, W, e < 0.22 ? { alpha: e / 0.22 } : null);
      if (e < 1) {
        const sx = 1 - 0.56 * e;
        const fade = e < 0.55 ? 1 : 1 - (e - 0.55) / 0.45;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(side < 0 ? door.x - W : door.x, yB - h - 34, W, h + 44);
          ctx.clip();
          const pivot = door.x + side * W * 0.5;
          ctx.translate(pivot, 0);
          ctx.scale(sx, 1);
          ctx.translate(-pivot, 0);
          gate('gate_shut', door.x, W, { alpha: fade });
          ctx.restore();
        }
      }
      // the light coming through, laid over the weave rather than behind it:
      // a hot slit where the canes first part, widening into the whole gap
      const lx = door.x, ly = yB - h * 0.46;
      const lrx = W * (0.1 + 0.32 * e), lry = h * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(lx, ly);
      ctx.scale(lrx / lry, 1);
      ctx.translate(-lx, -ly);
      const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, lry);
      lg.addColorStop(0, 'rgba(255,232,176,' + (0.24 + 0.14 * e).toFixed(3) + ')');
      lg.addColorStop(0.42, 'rgba(244,197,66,' + (0.08 + 0.08 * e).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(244,197,66,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, ly, lry, 0, ROOM_TAU); ctx.fill();
      ctx.restore();

      // motes drifting up out of the lit gap
      if (e > 0.25) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const ph = i * 1.7 + door.x * 0.05;
          const my = (t * 9 + i * 11) % 44;
          const mx = door.x + (i - 2) * 4 + Math.sin(t * 0.9 + ph) * (5 + i * 1.4);
          const a = (1 - my / 44) * 0.5 * e;
          ctx.fillStyle = 'rgba(255,226,158,' + a.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(mx, yB - 8 - my, 1 + (i % 2) * 0.6, 0, ROOM_TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (open && door.offer) {
      this.renderDoorOffer(ctx, door, yB - h - 10);
    }

    if (door.dwell > 0) {
      const fill = Math.max(0, Math.min(1, door.dwell / ROOM_DWELL));
      const rx = door.r * 0.72, ry = door.r * 0.3;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,16,10,0.45)';
      ctx.beginPath();
      ctx.ellipse(door.x, yB, rx, ry, 0, 0, ROOM_TAU);
      ctx.stroke();
      ctx.strokeStyle = '#f4c542';
      ctx.beginPath();
      ctx.ellipse(door.x, yB, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + fill * ROOM_TAU);
      ctx.stroke();
    }

    ctx.restore();
  };

  // The card on the door: what taking this exit gets you. Icon over a short
  // all-caps label, on the same dark plaque the bark bubbles use.
  Game.prototype.renderDoorOffer = function (ctx, door, bottomY) {
    const offer = door.offer;
    const label = String(offer.label || offer.name || '').toUpperCase();
    const spacing = 1.4;

    ctx.font = 'bold 10px Verdana, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';

    let textW = 0;
    for (const ch of label) textW += ctx.measureText(ch).width + spacing;
    if (textW > 0) textW -= spacing;

    const padX = 11;
    const pw = Math.max(48, textW + padX * 2);
    const ph = label ? 44 : 32;
    const px = door.x - pw / 2;
    const py = bottomY - ph;

    ctx.fillStyle = 'rgba(14,16,20,0.92)';
    ctx.strokeStyle = 'rgba(244,197,66,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 7);
    ctx.fill();
    ctx.stroke();

    if (offer.icon) SPR.icon(ctx, offer.icon, door.x, py + 15, 22);

    if (label) {
      ctx.fillStyle = '#e8e0cc';
      let x = door.x - textW / 2;
      for (const ch of label) {
        const cw = ctx.measureText(ch).width;
        ctx.fillText(ch, x + cw / 2, py + ph - 9);
        x += cw + spacing;
      }
    }
  };
})();
