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

  // ------------------------------------------------------------ the save --
  // One night in progress, written at every room boundary under its own key.
  // The version is exact: a snapshot stamped by another build is dropped on
  // sight rather than half understood. Nothing else in the game reads or
  // writes this key, and a page with no snapshot behaves exactly as before.
  const SAVE_KEY = 'mbm_run';
  const SAVE_VERSION = 2;

  // Every night carries an id, minted when it begins and kept through every
  // save and every continue, and the id of the last night to END is kept here.
  // That is the whole guard against the same saved night being cashed in
  // twice: two tabs opened on one snapshot share its id, so the moment either
  // of them finishes the night, the other one's copy is a night that is over,
  // and it is neither written back nor offered again. One id is enough for
  // that, and one id is all this ever holds, so it stays a few bytes forever.
  const DONE_KEY = 'mbm_rundone';

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
  // Run.rng IS THE WORLD STREAM. Every draw that decides which rooms exist
  // and what is in them goes through it: the plan (buildPlan), the door
  // offers at every boundary, and the concrete layout a Room places on
  // entry. Nothing input dependent may read it. The simulation (trait procs,
  // item rolls, level up offers) draws from Run.simRng instead, a second
  // stream below, derived from the same seed but decorrelated from this one,
  // so how the player fights a night never changes which rooms that night
  // deals. The name stays Run.rng rather than something like Run.worldRng,
  // and the snapshot field stays s.rng: both are save surface, and renaming
  // either would break every night saved before this split (display names
  // and internal ids stay separate forever, see CLAUDE.md GOTCHAS).
  //
  // The whole stream is one 32 bit counter, so where the dice have got to is
  // a single number. read and seek let a continued night pick the stream back
  // up exactly where it was rather than starting a new one.
  function mulberry32(a) {
    let t = a >>> 0;
    const fn = function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    fn.read = function () { return t >>> 0; };
    fn.seek = function (v) { t = v >>> 0; };
    return fn;
  }

  function rngRead(fn) {
    return (fn && typeof fn.read === 'function') ? (fn.read() >>> 0) : 0;
  }

  function rngSeek(fn, v) {
    if (fn && typeof fn.seek === 'function' && isNum(v)) fn.seek(v >>> 0);
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

  // The sim stream's seed, derived from the world seed rather than drawn from
  // entropy: one seed still has to determine a whole night. Runs the same
  // avalanche mix entropySeed folds the clock through above (two Math.imul
  // rounds, the finalizer half of MurmurHash3) over the world seed instead,
  // with a distinct odd constant folded in first rather than a bare seed + 1
  // or a bare XOR, so the two streams a single seed produces start nowhere
  // near each other.
  function deriveSimSeed(seed) {
    let h = ((seed >>> 0) ^ 0x9e3779b9) >>> 0;
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

  // The carvings this night started under, held for the length of the run.
  // A player who carves the pole between sessions changes the next night,
  // never the one they are standing in, so every read of the totem during a
  // run answers with the list the night began with. On a night nobody
  // interrupted the frozen list is the live list, so this changes nothing.
  let frozenNight = null;

  function liveCarvings() {
    if (typeof Totem === 'undefined' || !Totem || typeof Totem.active !== 'function') return [];
    if (typeof META === 'undefined' || !META) return [];
    try {
      if (!Totem.open(META)) return [];
      const out = [];
      for (const c of (Totem.active(META) || [])) if (c && c.id) out.push(c.id);
      return out;
    } catch (e) { return []; }
  }

  // Both totem readers are wrapped once, in place: room.js and director.js ask
  // the pole directly and neither is this unit's file. The wrappers hand every
  // question straight back to the original while no run is frozen.
  function installFreeze() {
    if (typeof Totem === 'undefined' || !Totem || Totem._runFrozen) return;
    const on = Totem.on;
    const active = Totem.active;
    if (typeof on !== 'function' || typeof active !== 'function') return;
    Totem._runFrozen = true;
    Totem.on = function (id, m) {
      if (frozenNight) return frozenNight.indexOf(id) !== -1;
      return on.call(this, id, m);
    };
    Totem.active = function (m) {
      if (!frozenNight) return active.call(this, m);
      const out = [];
      for (const c of (this.list || [])) if (frozenNight.indexOf(c.id) !== -1) out.push(c);
      return out;
    };
  }

  function freezeNight(list) {
    installFreeze();
    frozenNight = null;
    if (Array.isArray(list)) {
      const out = [];
      for (const id of list) if (typeof id === 'string' && id) out.push(id);
      frozenNight = out;
    } else {
      frozenNight = liveCarvings();
    }
  }

  function thawNight() { frozenNight = null; }

  // ---------------------------------------------------------- the storage --
  function store() {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return null;
      return localStorage;
    } catch (e) { return null; }
  }

  function writeSave(obj) {
    const st = store();
    if (!st) return false;
    try { st.setItem(SAVE_KEY, JSON.stringify(obj)); return true; } catch (e) { return false; }
  }

  function dropSave() {
    const st = store();
    if (!st) return;
    try { st.removeItem(SAVE_KEY); } catch (e) {}
  }

  // A name for one night. Nothing in the simulation reads it, so it is allowed
  // the clock and a counter: it only has to be different from the night before
  // it and from a night begun in another tab at the same moment.
  let idTick = 0;
  function newRunId() {
    idTick = (idTick + 1) >>> 0;
    const a = entropySeed() >>> 0;
    const b = ((Date.now() >>> 0) ^ Math.imul(idTick, 2654435761)) >>> 0;
    return a.toString(36) + '-' + b.toString(36);
  }

  function markDone(id) {
    if (!id) return;
    const st = store();
    if (!st) return;
    try { st.setItem(DONE_KEY, String(id)); } catch (e) {}
  }

  // The id on the snapshot as it lies in storage, read without validating any
  // of the rest of it. Wanted only when a night is being thrown away by a page
  // that is not the one playing it: the title screen starting a fresh night,
  // or a camp arriving from another device.
  function storedId() {
    const st = store();
    if (!st) return null;
    let raw = null;
    try { raw = st.getItem(SAVE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      return (s && typeof s.id === 'string' && s.id) ? s.id : null;
    } catch (e) { return null; }
  }

  function isDone(id) {
    if (!id) return false;
    const st = store();
    if (!st) return false;
    let v = null;
    try { v = st.getItem(DONE_KEY); } catch (e) { return false; }
    return !!v && v === String(id);
  }

  // Every reason to refuse a snapshot lives here, and refusing is silent: a
  // bad save is a save that never existed, and the title screen never learns
  // there was one. Anything the build no longer has a definition for (a
  // scout, a weapon, a patch, a layout, a boss) fails the same way.
  function readSave() {
    const st = store();
    if (!st) return null;
    let raw = null;
    try { raw = st.getItem(SAVE_KEY); } catch (e) { return null; }
    if (raw === null || raw === undefined) return null;
    // A key holding nothing at all is not a snapshot, it is litter.
    if (!raw) { dropSave(); return null; }
    const s = parseSave(raw);
    // A snapshot that was refused is a snapshot that is never coming back, so
    // it does not sit in storage waiting for the next fresh night to sweep it
    // up. The offer is already hidden; this is the key going with it.
    if (!s) dropSave();
    return s;
  }

  function parseSave(raw) {
    let s = null;
    try { s = JSON.parse(raw); } catch (e) { return null; }
    if (!s || typeof s !== 'object') return null;
    if (s.v !== SAVE_VERSION) return null;
    // The night this snapshot belongs to. A night that has already ended, in
    // this tab or another one, is not continued: it was banked or abandoned
    // and cashing it in again would pay for it twice.
    if (typeof s.id !== 'string' || !s.id) return null;
    if (isDone(s.id)) return null;
    if (!isNum(s.seed) || !isNum(s.rng)) return null;
    // s.simRng is NOT required here, on purpose. A snapshot written before
    // the sim stream existed has no such field, and refusing the snapshot
    // over it would throw away a real player's saved night. resume() already
    // tolerates an absent s.simRng: it leaves Run.simRng exactly where
    // begin() just seeded it fresh from the run's own seed, rather than
    // seeking it, so an old snapshot still loads.
    if (!isNum(s.act) || !isNum(s.roomIdx) || s.act < 1 || s.roomIdx < 0) return null;
    if (typeof s.charId !== 'string') return null;
    if (typeof DATA === 'undefined' || !DATA || !DATA.characters || !DATA.characters[s.charId]) return null;
    if (!Array.isArray(s.plan) || !s.plan.length) return null;
    const plan = planIn(s.plan);
    if (!plan) return null;
    if (!slotAt(plan, s.act, s.roomIdx)) return null;
    const g = s.game;
    if (!g || typeof g !== 'object') return null;
    if (!Array.isArray(g.weapons) || !g.weapons.length) return null;
    for (const w of g.weapons) {
      if (!w || typeof w.id !== 'string' || !DATA.weapons || !DATA.weapons[w.id]) return null;
    }
    if (g.passives && typeof g.passives === 'object') {
      for (const id in g.passives) if (!DATA.passives || !DATA.passives[id]) return null;
    }
    if (!Array.isArray(s.recent)) s.recent = [];
    if (!Array.isArray(s.carvings)) s.carvings = [];
    return s;
  }

  // A boss by id, out of the tier table the plan deals from. A snapshot naming
  // a boss this build no longer ships is a snapshot we decline.
  function bossById(id) {
    if (typeof DATA === 'undefined' || !DATA || !DATA.bossTiers) return null;
    for (const tier in DATA.bossTiers) {
      const list = DATA.bossTiers[tier];
      if (!Array.isArray(list)) continue;
      for (const def of list) if (def && def.id === id) return def;
    }
    return null;
  }

  // The plan, flattened for storage and read back. Only what cannot be
  // derived travels: the type, the layout and the boss id.
  function planOut(plan) {
    const out = [];
    if (!Array.isArray(plan)) return out;
    for (const act of plan) {
      const arr = [];
      if (!Array.isArray(act)) { out.push(arr); continue; }
      for (const s of act) {
        if (!s) continue;
        const boss = s.bossDef || s.boss || null;
        arr.push({ t: s.type, l: s.layoutId || null, b: (boss && boss.id) || null });
      }
      out.push(arr);
    }
    return out;
  }

  function planIn(stored) {
    if (!Array.isArray(stored) || !stored.length) return null;
    const out = [];
    for (let a = 0; a < stored.length; a++) {
      const act = stored[a];
      if (!Array.isArray(act) || !act.length) return null;
      const arr = [];
      for (let i = 0; i < act.length; i++) {
        const r = act[i];
        if (!r || typeof r.t !== 'string') return null;
        const layoutId = (typeof r.l === 'string' && r.l) ? r.l : null;
        // A slot with no layout is legal (a type this act has no rooms for
        // builds a default arena), but a named layout has to still exist.
        if (layoutId && !layoutDef(r.t, layoutId)) return null;
        let boss = null;
        if (r.b) {
          boss = bossById(r.b);
          if (!boss) return null;
        }
        arr.push({ act: a + 1, idx: i, type: r.t, layoutId, boss, bossDef: boss });
      }
      out.push(arr);
    }
    return out;
  }

  // The stored plan against the plan the seed rebuilds. The seed is the truth
  // about how the night was dealt, but door choices rewrite slots as they are
  // walked into and the codex moves under the boss weights, so the two are
  // allowed to differ. What is not allowed is differing quietly: the stored
  // plan wins, and the difference is written down where a test can read it.
  function comparePlans(derived, stored) {
    const rep = { match: true, at: null, note: null };
    if (!Array.isArray(derived) || derived.length !== stored.length) {
      rep.match = false;
      rep.note = 'act count';
      return rep;
    }
    for (let a = 0; a < stored.length; a++) {
      const d = derived[a] || [];
      const s = stored[a];
      if (d.length !== s.length) {
        rep.match = false;
        rep.at = 'act ' + (a + 1);
        rep.note = 'length ' + d.length + ' vs ' + s.length;
        return rep;
      }
      for (let i = 0; i < s.length; i++) {
        const ds = d[i] || {};
        const ss = s[i];
        const db = (ds.bossDef && ds.bossDef.id) || null;
        const sb = (ss.bossDef && ss.bossDef.id) || null;
        if (ds.type !== ss.type || (ds.layoutId || null) !== (ss.layoutId || null) || db !== sb) {
          rep.match = false;
          rep.at = 'act ' + (a + 1) + ' room ' + (i + 1);
          rep.note = (ds.type + '/' + (ds.layoutId || '-')) + ' vs ' + (ss.type + '/' + (ss.layoutId || '-'));
          return rep;
        }
      }
    }
    return rep;
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

  // A restored plan is the truth about how long an act is, so the beats have
  // to agree with it or every beat read past the cursor lines up with the
  // wrong slot. With the night's carvings frozen first this is already true
  // and the loop does nothing; it exists for the save that disagrees anyway.
  function syncBeats(plan) {
    for (let a = 0; a < plan.length; a++) {
      const want = plan[a].length;
      let beats = PLAN_BEATS[a + 1];
      if (!Array.isArray(beats)) { beats = []; PLAN_BEATS[a + 1] = beats; }
      while (beats.length > want) beats.pop();
      while (beats.length < want) beats.splice(Math.max(0, beats.length - 1), 0, 'combat');
    }
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
    simRng: null,
    act: 1,
    roomIdx: 0,
    plan: null,
    doors: [],
    carvings: [],
    runId: null,
    lastResume: null,
    _entered: false,
    _recent: [],

    // Start a run. Seed is optional: leave it out and the run reads the clock
    // once, stores the number, and never touches entropy again.
    begin(charId, seed, carvings) {
      const s = (seed === undefined || seed === null) ? entropySeed() : (seed >>> 0);
      this.charId = charId || ((typeof META !== 'undefined' && META && META.selected) || 'max');
      this.seed = s;
      this.rng = mulberry32(s);
      // Same seed, decorrelated stream (see deriveSimSeed and the WORLD
      // STREAM doctrine comment on Run.rng above).
      this.simRng = mulberry32(deriveSimSeed(s));
      // A fresh night is a new night, whatever it was dealt from. resume puts
      // the saved id back over this one, because a continued night is the same
      // night and has to end as the same night.
      this.runId = newRunId();
      this.active = true;
      this.finished = false;
      this.act = 1;
      this.roomIdx = 0;
      this._entered = false;
      this._recent = [];
      this.doors = [];
      // The pole is read once, here, and held for the night. A fresh run
      // freezes exactly what the player just carved, so nothing moves.
      freezeNight(carvings);
      this.carvings = frozenNight.slice();
      this.plan = buildPlan(this.rng, this._recent);
      return this.plan;
    },

    reset() {
      this.active = false;
      this.finished = false;
      this.plan = null;
      this.doors = [];
      this.rng = null;
      this.simRng = null;
      this.act = 1;
      this.roomIdx = 0;
      this._entered = false;
      this._recent = [];
      this.carvings = [];
      this.runId = null;
      thawNight();
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

      // The save boundary. The world has just been emptied by the transition,
      // the slot the player is walking into is decided, and nothing inside the
      // room has run yet. The dice and the recent layouts are read from before
      // the room takes its turn with them, so continuing replays this room
      // exactly rather than dealing a different one. Both streams are read
      // here, at the same moment: the sim stream has already drawn plenty by
      // this point (traits, item rolls from the room just left), and pre.simRng
      // is where the NEXT room's simulation should pick back up from.
      const pre = { recent: this._recent.slice(), rng: rngRead(this.rng), simRng: rngRead(this.simRng) };

      noteLayout(this._recent, slot.layoutId);

      const def = layoutDef(slot.type, slot.layoutId);
      this._write(g, cur, pre);
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

    // ------------------------------------------------------------- saving --
    // Called from advance at the room boundary and nowhere else. Everything
    // the night is made of goes in: the seed and where the dice have got to,
    // the plan and the cursor into it, the carvings the night started under,
    // and whatever the game says its own state is.
    _write(g, cur, pre) {
      if (!this.active || !g || typeof g.snapshot !== 'function') return false;
      // This night has already ended somewhere else: another tab was playing
      // the same saved night and finished it, or the player started a fresh
      // one from the title screen. Writing here would put a night that is over
      // back on the shelf. Refuse, and leave the shelf alone: whatever is on
      // it now belongs to whichever night is still being played.
      if (isDone(this.runId)) return false;
      let mine = null;
      try { mine = g.snapshot(); } catch (e) { return false; }
      if (!mine) return false;
      return writeSave({
        v: SAVE_VERSION,
        id: this.runId,
        at: Date.now(),
        seed: this.seed >>> 0,
        rng: pre.rng >>> 0,
        simRng: pre.simRng >>> 0,
        charId: this.charId,
        act: cur.act,
        roomIdx: cur.idx,
        recent: pre.recent.slice(),
        carvings: (this.carvings || []).slice(),
        plan: planOut(this.plan),
        game: mine,
      });
    },

    // The one snapshot on disk, fully validated, or null. Asking twice costs
    // nothing: the only thing a read ever writes is the removal of a snapshot
    // it has just refused, and a refused snapshot is gone the first time.
    peek() { return readSave(); },

    // A line for the title screen, in the player's words rather than the
    // save's. Null when there is nothing to continue.
    peekLabel() {
      const s = readSave();
      if (!s) return null;
      const c = (typeof DATA !== 'undefined' && DATA.characters && DATA.characters[s.charId]) || null;
      const g = s.game || {};
      const bits = [];
      if (c && c.name) bits.push(String(c.name).toUpperCase());
      bits.push('ACT ' + s.act + ', ROOM ' + ((s.roomIdx | 0) + 1));
      if (isNum(g.level)) bits.push('LV ' + g.level);
      return bits.join('  |  ');
    },

    // Called wherever a night stops being continuable: death, dawn, abandoning
    // it, the results screen, a fresh night, an imported camp. The night's id
    // is retired here as well as the snapshot, so any other copy of it (the
    // second tab) is a night that is over the next time anything looks.
    clearSave() {
      // The night being ended is this page's night, or, when this page is not
      // playing one (the title screen starting a fresh one, an imported camp),
      // the night lying in storage that is about to be thrown away.
      markDone(this.runId || storedId());
      dropSave();
    },

    // Put a night back. The game is already rebuilt and handed in; this puts
    // the plan, the cursor and the dice back, then walks the player into the
    // room they were about to enter. Returns the room, or null if the save
    // could not be honored, in which case nothing is left half restored.
    resume(s) {
      if (!s) return null;
      const stored = planIn(s.plan);
      if (!stored) return null;
      // The carvings go back before the plan is rebuilt, because the beats
      // themselves read the pole: a night carved for THE LONG WALK is one
      // room longer and has to stay that way whatever the pole says now.
      this.begin(s.charId, s.seed, s.carvings);
      // A continued night is the same night, so it keeps the name it was saved
      // under and ending it retires that name for every copy of the snapshot.
      if (typeof s.id === 'string' && s.id) this.runId = s.id;
      this.lastResume = comparePlans(this.plan, stored);
      this.plan = stored;
      syncBeats(stored);
      const slot = slotAt(stored, s.act, s.roomIdx);
      if (!slot) { this.reset(); return null; }
      // The window was written down before this room was counted into it, and
      // advance is about to count it in again, so it goes back exactly as
      // stored. Trimming anything here would drop a layout that legitimately
      // repeats, and the next room's door would offer the wrong thing.
      this._recent = Array.isArray(s.recent) ? s.recent.slice(-2) : [];
      rngSeek(this.rng, s.rng);
      // A snapshot saved before the sim stream existed has no s.simRng:
      // isNum fails inside rngSeek, the seek is a silent no-op, and the
      // stream stays exactly where begin() (called above) just seeded it,
      // freshly derived from the run's own seed. That is a deliberate
      // backward compatibility path, not an oversight: a night saved under
      // the old shared stream still resumes rather than being refused.
      rngSeek(this.simRng, s.simRng);
      this.act = s.act;
      this.roomIdx = s.roomIdx;
      this._entered = false;
      this.finished = false;
      this.doors = [];
      // advance answers null when it cannot build the room (no game attached
      // to the page, for one), and by then begin has already run: the run is
      // live, a plan is built, the pole is frozen. Put all of it back, so the
      // claim above is true for the caller rather than true for the one caller
      // that happens to clean up afterwards.
      const room = this.advance(null);
      if (!room) { this.reset(); return null; }
      return room;
    },
  };

  return api;
})();
