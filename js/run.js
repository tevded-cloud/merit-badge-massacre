// Merit Badge Massacre: the run. Which act, which room, which doors are on
// offer. This drives every night: startRun calls Run.begin then Run.advance
// before the first frame. Only the MBM_FIELD debug flag bypasses it.
//
// The run owns three things:
//   1. the PLAN, a seeded list of concrete room slots, three acts deep
//   2. the DOORS, the two or three offers shown for the next slot
//   3. the CURSOR, which slot the player is standing in right now
//
// ---------------------------------------------------------------------------
// Slot
// ---------------------------------------------------------------------------
// {
//   act        1, 2 or 3
//   idx        position inside the act, 0 based
//   type       'combat' | 'elite' | 'shop' | 'loot' | 'rest' | 'lore' | 'boss'
//   layoutId   a key into ROOMS[type]
//   boss       null, or the boss def this slot spawns (truthy on boss slots)
//   bossDef    the same def, spelled out for readers that want the name
// }
//
// ---------------------------------------------------------------------------
// DoorOffer
// ---------------------------------------------------------------------------
// {
//   type       the room type walking through this door leads to
//   layoutId   the concrete layout behind it
//   offer      { kind, icon, label } the preview printed on the door card
// }
//
// Picking a door REWRITES the next slot to that door's type and layout, so the
// choice on the card is the choice the run makes.
'use strict';

const Run = (function () {
  // How far inside the wall the player lands when walking into a room.
  const ENTRY_INSET = 70;

  // THE HOLLOW is authored as the room after act 3, not as act 3's boss arena,
  // so the generic boss arena pick skips it until the epilogue lands.
  const HOLLOW_ID = 'hollow';

  // Plausible swaps per position, used to build a real choice when the beat
  // itself only names one type. Shop is never conjured out of nowhere: it only
  // appears as a door when the act's own beat offered it.
  const ALT_TYPES = {
    combat: ['elite', 'lore', 'rest'],
    elite: ['combat', 'rest'],
    lore: ['combat', 'rest'],
    rest: ['loot', 'lore'],
    loot: ['rest', 'lore'],
    shop: ['loot', 'rest'],
  };

  // ------------------------------------------------------------------ rng --
  function mulberry32(a) {
    let t = a >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The one sanctioned entropy read in the whole run system. Everything after
  // this comes out of the stored seed, so a run can be replayed exactly.
  function entropySeed() {
    const a = Date.now() >>> 0;
    let b = 0;
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      b = Math.floor(performance.now() * 1000) >>> 0;
    }
    let h = (a ^ ((b + 0x9e3779b9) >>> 0)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  function pick(rng, arr) {
    if (!arr || !arr.length) return null;
    const i = Math.floor(rng() * arr.length);
    return arr[i < 0 ? 0 : i >= arr.length ? arr.length - 1 : i];
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // ------------------------------------------------------------ the totem --
  // Deeper Nights, read from the run. Defensive on every read: a save from
  // before the pole was raised, and a pole nobody has carved, both answer
  // false, and the plan this file builds is the plan it has always built.
  function nightOn(id) {
    if (typeof Totem === 'undefined' || !Totem) return false;
    if (typeof META === 'undefined' || !META) return false;
    try { return !!Totem.open(META) && !!Totem.on(id, META); } catch (e) { return false; }
  }

  // The beats this run is actually walking, act keyed. THE LONG WALK adds a
  // slot, so everything that reads a beat by index has to read the run's copy
  // rather than the template's or it reads the wrong beat for every slot past
  // the new one. Rebuilt from scratch by buildPlan.
  let PLAN_BEATS = {};

  // One more room in every act. The extra slot is another fight, dropped in
  // front of the boss, so the act still opens and ends the way it was written
  // to: only the walk between them gets longer.
  function actBeats(t) {
    const beats = (t && Array.isArray(t.beats)) ? t.beats.slice() : [];
    if (!beats.length || !nightOn('longwalk')) return beats;
    const at = beats[beats.length - 1] === 'boss' ? beats.length - 1 : beats.length;
    beats.splice(at, 0, 'combat');
    return beats;
  }

  function beatsOf(act) {
    const b = PLAN_BEATS[act];
    if (b) return b;
    const t = actTemplate(act);
    return (t && Array.isArray(t.beats)) ? t.beats : [];
  }

  // ---------------------------------------------------------------- lookup --
  function gameRef() {
    if (typeof App === 'undefined' || !App) return null;
    return App.game || null;
  }

  function actTemplate(act) {
    if (typeof ACT_TEMPLATES === 'undefined' || !Array.isArray(ACT_TEMPLATES)) return null;
    for (const t of ACT_TEMPLATES) if (t && t.act === act) return t;
    return null;
  }

  // Every layout of this type this act may deal, in authored order.
  function layoutsFor(type, act) {
    if (typeof ROOMS === 'undefined' || !ROOMS) return [];
    // NOTHING WASTED deals no cache rooms. A type with no layout for this act
    // is already a type the plan cannot use: the beat roll drops it, the act's
    // guarantee skips it, the repair site declines it and no door offers it,
    // so one answer here takes the supply cache out of the whole run.
    if (type === 'loot' && nightOn('nothing')) return [];
    const tbl = ROOMS[type];
    if (!tbl) return [];
    const out = [];
    for (const id in tbl) {
      const def = tbl[id];
      if (!def) continue;
      if (type === 'boss' && id === HOLLOW_ID) continue;
      if (Array.isArray(def.acts) && def.acts.indexOf(act) === -1) continue;
      out.push(id);
    }
    return out;
  }

  function layoutDef(type, layoutId) {
    if (typeof ROOMS === 'undefined' || !ROOMS) return null;
    const tbl = ROOMS[type];
    return (tbl && tbl[layoutId]) || null;
  }

  // A sprite name is only worth printing if the art actually exists.
  function iconOr(name, fallback) {
    if (typeof SPR === 'undefined' || !SPR || typeof SPR.get !== 'function') return name;
    try { return SPR.get(name) ? name : fallback; } catch (e) { return fallback; }
  }

  // ------------------------------------------------------------ plan rules --
  // noRepeatType: the same non combat type never lands twice inside the window.
  // Combat is exempt, it is the connective tissue of an act.
  function repeatsNearby(type, at, len, typeAt, win) {
    if (!win || type === 'combat') return false;
    for (let d = 1; d <= win; d++) {
      const a = at - d;
      const b = at + d;
      if (a >= 0 && typeAt(a) === type) return true;
      if (b < len && typeAt(b) === type) return true;
    }
    return false;
  }

  function bossWeight(def) {
    const codex = (typeof META !== 'undefined' && META && META.codex) ? META.codex : null;
    if (!codex || !def) return 1;
    const e = codex[def.id];
    if (!e) return 3;
    const killed = e === 'killed' || e.killed === true || (isNum(e.kills) && e.kills > 0);
    if (killed) return 1;
    const seen = e === true || e === 'seen' || e.seen === true || (isNum(e.seen) && e.seen > 0);
    if (seen) return 2;
    return 3;
  }

  function pickBoss(rng, tier) {
    const list = (typeof DATA !== 'undefined' && DATA.bossTiers && DATA.bossTiers[tier]) || [];
    if (!list.length) return null;
    const w = [];
    let total = 0;
    for (const def of list) { const v = Math.max(0, bossWeight(def)); w.push(v); total += v; }
    if (total <= 0) return pick(rng, list);
    let roll = rng() * total;
    for (let i = 0; i < list.length; i++) {
      roll -= w[i];
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  // Layout for one slot: never one of the last two layouts used across the run,
  // unless that leaves nothing (the one shop per act, for instance).
  function pickLayout(rng, type, act, recent, banned) {
    const all = layoutsFor(type, act);
    if (!all.length) return null;
    const free = all.filter(id => recent.indexOf(id) === -1 && (!banned || banned.indexOf(id) === -1));
    if (free.length) return pick(rng, free);
    const notBanned = banned ? all.filter(id => banned.indexOf(id) === -1) : all;
    return pick(rng, notBanned.length ? notBanned : all);
  }

  function noteLayout(recent, id) {
    if (!id) return;
    recent.push(id);
    while (recent.length > 2) recent.shift();
  }

  // ----------------------------------------------------------- plan build --
  function buildAct(t, rng, recent) {
    const beats = actBeats(t);
    PLAN_BEATS[t.act] = beats;
    const rules = t.rules || {};
    const win = rules.noRepeatType || 0;
    const types = [];
    const typeAt = i => types[i];

    // 1. resolve the beats, honoring the no repeat window as we go
    for (let i = 0; i < beats.length; i++) {
      const beat = String(beats[i] || 'combat');
      if (beat === 'boss') { types.push('boss'); continue; }
      const opts = beat.split('|');
      const legal = opts.filter(o => !repeatsNearby(o, i, types.length, typeAt, win) && layoutsFor(o, t.act).length);
      const usable = legal.length ? legal : opts.filter(o => layoutsFor(o, t.act).length);
      types.push(pick(rng, usable.length ? usable : opts) || 'combat');
    }

    // 2. guarantees: a type the act promised but the roll never dealt takes
    //    over a combat slot, preferring one that is not in the last two slots.
    const guarantee = Array.isArray(rules.guarantee) ? rules.guarantee : [];
    for (const want of guarantee) {
      if (types.indexOf(want) !== -1) continue;
      if (!layoutsFor(want, t.act).length) continue;
      const early = [];
      const late = [];
      // Slot 0 is sacred: a night that opens on an empty shop or loot room
      // reads as broken, so the guarantee never takes the first fight.
      for (let i = 1; i < types.length; i++) {
        if (types[i] !== 'combat') continue;
        if (repeatsNearby(want, i, types.length, typeAt, win)) continue;
        (i < types.length - 2 ? early : late).push(i);
      }
      let at = pick(rng, early.length ? early : late);
      if (at == null) {
        // No spare fight to take over: claim a duplicated safe room instead
        // (the second lore or rest), never slot 0, never the boss, never
        // another promised type.
        const counts = {};
        for (const ty of types) counts[ty] = (counts[ty] || 0) + 1;
        const dupes = [];
        for (let i = 1; i < types.length; i++) {
          const ty = types[i];
          if (ty === 'boss' || guarantee.indexOf(ty) !== -1) continue;
          if (counts[ty] > 1) dupes.push(i);
        }
        at = pick(rng, dupes);
        if (at == null) {
          // Still nothing: claim the least essential singleton, comfort
          // before flavor before challenge.
          for (const ty of ['rest', 'lore', 'elite']) {
            const i = types.indexOf(ty);
            if (i >= 1) { at = i; break; }
          }
        }
      }
      if (at != null) types[at] = want;
    }

    // 3. concrete layouts, and the boss def for the slot that ends the act
    const slots = [];
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const slot = { act: t.act, idx: i, type, layoutId: null, boss: null, bossDef: null };
      if (type === 'boss') {
        const def = pickBoss(rng, t.bossTier);
        slot.boss = def;
        slot.bossDef = def;
      }
      slot.layoutId = pickLayout(rng, type, t.act, recent, null);
      noteLayout(recent, slot.layoutId);
      slots.push(slot);
    }
    return slots;
  }

  function buildPlan(rng, recent) {
    if (typeof ACT_TEMPLATES === 'undefined' || !Array.isArray(ACT_TEMPLATES)) return [];
    PLAN_BEATS = {};
    const plan = [];
    for (const t of ACT_TEMPLATES) {
      if (!t) continue;
      plan.push(buildAct(t, rng, recent));
    }
    return plan;
  }

  // -------------------------------------------------------------- cursor --
  function slotAt(plan, act, idx) {
    const arr = plan && plan[act - 1];
    return (arr && arr[idx]) || null;
  }

  function nextCursor(plan, act, idx) {
    const arr = plan && plan[act - 1];
    if (!arr) return null;
    if (idx + 1 < arr.length) return { act, idx: idx + 1 };
    if (plan[act]) return { act: act + 1, idx: 0 };
    return null;
  }

  function guaranteedSole(plan, slot, act) {
    const t = actTemplate(act);
    const guarantee = (t && t.rules && Array.isArray(t.rules.guarantee)) ? t.rules.guarantee : [];
    if (guarantee.indexOf(slot.type) === -1) return false;
    const arr = plan[act - 1] || [];
    let n = 0;
    for (const s of arr) if (s && s.type === slot.type) n++;
    return n <= 1;
  }

  // A later slot in this act that could carry a promised room if the player
  // trades this one away. Only combat slots volunteer: another promised room
  // is never robbed to pay for this one.
  function repairSite(plan, act, afterIdx, want) {
    const t = actTemplate(act);
    const win = (t && t.rules && t.rules.noRepeatType) || 0;
    const arr = plan[act - 1] || [];
    // The slot at afterIdx is the one being traded away, so it does not count
    // against the window it is about to vacate.
    const typeAt = i => (i === afterIdx || !arr[i] ? undefined : arr[i].type);
    if (!layoutsFor(want, act).length) return -1;
    for (let i = afterIdx + 1; i < arr.length; i++) {
      const s = arr[i];
      if (!s || s.boss || s.type !== 'combat') continue;
      if (repeatsNearby(want, i, arr.length, typeAt, win)) continue;
      return i;
    }
    return -1;
  }

  // A slot the player may not trade away: the boss, and the only shop or loot
  // room of an act when no later room could take that promise over. Those get
  // a single door.
  function isLocked(plan, slot, act, idx) {
    if (!slot) return true;
    if (slot.boss) return true;
    if (!guaranteedSole(plan, slot, act)) return false;
    return repairSite(plan, act, idx, slot.type) < 0;
  }

  // The act promised a shop and a cache. If a door choice just traded the last
  // one away, a later combat room takes the promise over.
  function keepPromises(run, act, idx, dropped) {
    const t = actTemplate(act);
    const guarantee = (t && t.rules && Array.isArray(t.rules.guarantee)) ? t.rules.guarantee : [];
    if (guarantee.indexOf(dropped) === -1) return;
    const arr = (run.plan && run.plan[act - 1]) || [];
    for (const s of arr) if (s && s.type === dropped) return;
    const at = repairSite(run.plan, act, idx, dropped);
    if (at < 0) return;
    const s = arr[at];
    const id = pickLayout(run.rng, dropped, act, run._recent, null);
    if (!id) return;
    s.type = dropped;
    s.layoutId = id;
  }

  // ---------------------------------------------------------------- room --
  function boundsOf(room, def) {
    const b = room && room.bounds;
    if (b && isNum(b.x0) && isNum(b.y0) && isNum(b.x1) && isNum(b.y1)) return b;
    const w = (def && def.size && isNum(def.size.w)) ? def.size.w : 1900;
    const h = (def && def.size && isNum(def.size.h)) ? def.size.h : 1300;
    return { x0: -w / 2, y0: -h / 2, x1: w / 2, y1: h / 2 };
  }

  // Where the player lands. The room gets first say; failing that we read
  // def.entry the same way a room does, one wall inset in from the door.
  function entryPointOf(room, def) {
    const p = room && room.entryPoint;
    if (p && isNum(p.x) && isNum(p.y)) return p;
    if (room && room.entry && isNum(room.entry.x) && isNum(room.entry.y)) {
      return { x: room.entry.x, y: room.entry.y };
    }
    const e = (room && room.entry && room.entry.side) ? room.entry : ((def && def.entry) || null);
    const b = boundsOf(room, def);
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    if (!e || !e.side) return { x: b.x0 + w / 2, y: b.y0 + h / 2 };
    const t = isNum(e.t) ? e.t : 0.5;
    const inset = Math.min(ENTRY_INSET, Math.min(w, h) * 0.25);
    if (e.side === 'n') return { x: b.x0 + w * t, y: b.y0 + inset };
    if (e.side === 's') return { x: b.x0 + w * t, y: b.y1 - inset };
    if (e.side === 'w') return { x: b.x0 + inset, y: b.y0 + h * t };
    if (e.side === 'e') return { x: b.x1 - inset, y: b.y0 + h * t };
    return { x: b.x0 + w / 2, y: b.y0 + h / 2 };
  }

  // --------------------------------------------------------------- doors --
  function gearIcon(rng) {
    const g = gameRef();
    const weapons = (typeof DATA !== 'undefined' && DATA.weapons) ? DATA.weapons : {};
    const slots = (typeof DATA !== 'undefined' && isNum(DATA.WEAPON_SLOTS)) ? DATA.WEAPON_SLOTS : 4;
    const maxLvl = (typeof DATA !== 'undefined' && isNum(DATA.WEAPON_MAX)) ? DATA.WEAPON_MAX : 5;
    const ids = [];
    const held = (g && Array.isArray(g.weapons)) ? g.weapons : null;
    for (const id in weapons) {
      if (!held) { ids.push(id); continue; }
      const own = held.find(w => w && w.id === id);
      if (!own) { if (held.length < slots) ids.push(id); }
      else if (own.lvl < maxLvl) ids.push(id);
    }
    if (!ids.length) for (const id in weapons) ids.push(id);
    const id = pick(rng, ids);
    return (id && weapons[id] && weapons[id].icon) || 'trailmix';
  }

  // The card printed on a door. Combat rooms preview the payout waiting on the
  // other side, everything else says what it is.
  function makeOffer(rng, type, slot) {
    if (type === 'combat') {
      const roll = rng();
      if (roll < 1 / 3) return { kind: 'coins', icon: 'coin', label: 'COOKIE MONEY' };
      if (roll < 2 / 3) return { kind: 'heal', icon: 'cocoa', label: 'TRAIL SNACK' };
      return { kind: 'gear', icon: gearIcon(rng), label: 'SUPPLY DROP' };
    }
    if (type === 'shop') return { kind: 'shop', icon: 'coin', label: 'THE STORE' };
    if (type === 'loot') return { kind: 'loot', icon: 'chest', label: 'SUPPLY CACHE' };
    if (type === 'rest') return { kind: 'rest', icon: 'cocoa', label: 'SIT SPOT' };
    if (type === 'lore') return { kind: 'lore', icon: 'fieldguide', label: '?' };
    if (type === 'elite') return { kind: 'elite', icon: iconOr('skull', 'trailmix'), label: 'ELITE' };
    if (type === 'boss') {
      const name = (slot && slot.bossDef && slot.bossDef.name) ? slot.bossDef.name : 'THE DEN';
      return { kind: 'boss', icon: iconOr('skull', 'trailmix'), label: name };
    }
    return { kind: type, icon: 'trailmix', label: String(type || '').toUpperCase() };
  }

  function makeDoor(rng, type, layoutId, slot) {
    return { type, layoutId, offer: makeOffer(rng, type, slot) };
  }

  // Types this slot could plausibly become: what the plan rolled, whatever the
  // beat itself offered, then the swap table. Anything that would break the no
  // repeat window or has no layout for this act is dropped.
  function optionTypes(plan, slot, act, idx) {
    const t = actTemplate(act);
    const win = (t && t.rules && t.rules.noRepeatType) || 0;
    const arr = plan[act - 1] || [];
    const typeAt = i => (arr[i] ? arr[i].type : undefined);
    const want = [slot.type];
    const own = beatsOf(act);
    const beat = own[idx] ? String(own[idx]) : '';
    for (const o of beat.split('|')) if (o && want.indexOf(o) === -1) want.push(o);
    for (const o of (ALT_TYPES[slot.type] || [])) if (want.indexOf(o) === -1) want.push(o);
    return want.filter(o => {
      if (o === 'boss') return false;
      if (!layoutsFor(o, act).length) return false;
      if (o !== slot.type && repeatsNearby(o, idx, arr.length, typeAt, win)) return false;
      return true;
    });
  }

  // ------------------------------------------------------------------ api --
  const api = {
    active: false,
    finished: false,
    charId: null,
    seed: 0,
    rng: null,
    act: 1,
    roomIdx: 0,
    plan: null,
    doors: [],
    _entered: false,
    _recent: [],

    // Start a run. Seed is optional: leave it out and the run reads the clock
    // once, stores the number, and never touches entropy again.
    begin(charId, seed) {
      const s = (seed === undefined || seed === null) ? entropySeed() : (seed >>> 0);
      this.charId = charId || ((typeof META !== 'undefined' && META && META.selected) || 'max');
      this.seed = s;
      this.rng = mulberry32(s);
      this.active = true;
      this.finished = false;
      this.act = 1;
      this.roomIdx = 0;
      this._entered = false;
      this._recent = [];
      this.doors = [];
      this.plan = buildPlan(this.rng, this._recent);
      return this.plan;
    },

    reset() {
      this.active = false;
      this.finished = false;
      this.plan = null;
      this.doors = [];
      this.rng = null;
      this.act = 1;
      this.roomIdx = 0;
      this._entered = false;
      this._recent = [];
    },

    // The plan is the truth about how long an act is: THE LONG WALK makes it
    // one longer than the template says, and the threat curve reads this to
    // decide how far through the act a room stands.
    roomsInAct(act) {
      const arr = this.plan && this.plan[act - 1];
      if (arr && arr.length) return arr.length;
      const t = actTemplate(act);
      return (t && isNum(t.rooms)) ? t.rooms : 0;
    },

    isBossRoom() {
      if (!this.active || !this.plan || !this._entered) return false;
      const s = slotAt(this.plan, this.act, this.roomIdx);
      return !!(s && s.boss);
    },

    // Two or three offers for the NEXT slot, or one when that slot is fixed
    // (the boss, and the single shop or loot room an act promises).
    rollDoors() {
      const out = [];
      if (!this.active || !this.plan || !this.rng) return out;
      const nxt = nextCursor(this.plan, this.act, this.roomIdx);
      if (!nxt) return out;
      const slot = slotAt(this.plan, nxt.act, nxt.idx);
      if (!slot) return out;
      const rng = this.rng;

      if (isLocked(this.plan, slot, nxt.act, nxt.idx)) {
        out.push(makeDoor(rng, slot.type, slot.layoutId, slot));
        return out;
      }

      const used = [];
      for (const type of optionTypes(this.plan, slot, nxt.act, nxt.idx)) {
        if (out.length >= 3) break;
        const keep = (type === slot.type && slot.layoutId) ? slot.layoutId : null;
        const id = keep || pickLayout(rng, type, nxt.act, this._recent, used);
        if (!id) continue;
        used.push(id);
        out.push(makeDoor(rng, type, id, slot));
      }

      // One option only: give the same room a second face so the door is still
      // a choice rather than a corridor.
      if (out.length < 2) {
        const id = pickLayout(rng, slot.type, nxt.act, this._recent, used);
        if (id) {
          used.push(id);
          out.push(makeDoor(rng, slot.type, id, slot));
        }
      }
      return out;
    },

    // Called by Transition at the swap, with the door the player walked
    // through, or null for the very first room of the run.
    advance(door) {
      if (!this.active || !this.plan) return null;
      const g = gameRef();
      if (!g) return null;

      let cur;
      if (!this._entered) {
        this._entered = true;
        cur = { act: this.act, idx: this.roomIdx };
      } else {
        if (this.finished) return null;
        cur = nextCursor(this.plan, this.act, this.roomIdx);
      }
      if (!cur) { this.finished = true; this.doors = []; return null; }

      this.act = cur.act;
      this.roomIdx = cur.idx;
      const slot = slotAt(this.plan, cur.act, cur.idx);
      if (!slot) { this.finished = true; this.doors = []; return null; }

      // The door the player chose rewrites the slot they are walking into.
      if (door && door.type && !slot.boss) {
        const chosen = layoutDef(door.type, door.layoutId);
        if (chosen) {
          const was = slot.type;
          slot.type = door.type;
          slot.layoutId = door.layoutId;
          if (was !== slot.type) keepPromises(this, cur.act, cur.idx, was);
        }
      }

      noteLayout(this._recent, slot.layoutId);

      const def = layoutDef(slot.type, slot.layoutId);
      const room = new Room(def, this.rng);
      const total = this.roomsInAct(cur.act) || (this.plan[cur.act - 1] || []).length || 1;
      const base = (typeof DATA !== 'undefined' && typeof DATA.threatOf === 'function')
        ? DATA.threatOf(cur.act, cur.idx, total) : 0;
      room.threatValue = base + (slot.boss ? 0.5 : 0);

      // The room copies its own act, index and threat onto the game at enter,
      // so the run stamps them on the room first and mirrors them for any room
      // that does not.
      room.act = cur.act;
      room.roomIdx = cur.idx;
      g.act = cur.act;
      g.roomIdx = cur.idx;
      g.room = room;
      if (typeof room.enter === 'function') room.enter(g);
      else g._threat = room.threatValue;

      const entry = entryPointOf(room, def);
      if (entry) {
        if (!room.entryPoint) room.entryPoint = entry;
        if (g.player) { g.player.x = entry.x; g.player.y = entry.y; }
      }

      if (slot.boss && typeof g.spawnBoss === 'function') g.spawnBoss(slot.bossDef || slot.boss);

      // Doors for the room the player is standing in point at the NEXT slot.
      // The last room of act 3 has nothing after it.
      if (!nextCursor(this.plan, cur.act, cur.idx)) {
        this.finished = true;
        this.doors = [];
      } else {
        this.doors = this.rollDoors();
        const doors = (room && Array.isArray(room.doors)) ? room.doors : [];
        for (let i = 0; i < doors.length && this.doors.length; i++) {
          const d = doors[i];
          if (!d) continue;
          const o = this.doors[i % this.doors.length];
          d.type = o.type;
          d.layoutId = o.layoutId;
          d.offer = o.offer;
          d.label = (o.offer && o.offer.label) || null;
        }
      }
      return room;
    },
  };

  return api;
})();
