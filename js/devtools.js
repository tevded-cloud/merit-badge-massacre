// Merit Badge Massacre: the dev overlay. A face on window.MBM, plus live
// tuning over DATA, for Teddy, who does not read or write code and should
// never have to open a console to see a change.
//
// HARD RULES THIS FILE FOLLOWS (see the brief):
//   - Every line of new code lives here. index.html only gained one script tag.
//   - js/game.js and js/traits.js are never edited. Where this file needs to
//     change something that only game.js's own functions compute (recalc's
//     passive magnitudes, a room's spawn release rate), it wraps the existing
//     prototype method at runtime instead: the original keeps running, this
//     just layers a tunable number on top.
//   - Closed, this file costs nothing: no per-frame work happens unless the
//     panel is open or an overlay toggle is on, and the one key it binds
//     (backquote) is not read by any gameplay system.
//   - Nothing granted, spawned, warped or tuned through this panel is allowed
//     to reach a real save. See installSaveGuards() below for exactly how.
'use strict';

(function () {
  if (typeof window === 'undefined') return;
  if (window.__MBM_DEVTOOLS__) return; // never install twice
  window.__MBM_DEVTOOLS__ = true;

  // =========================================================================
  // Small helpers
  // =========================================================================
  function el(tag, opts) {
    const e = document.createElement(tag);
    opts = opts || {};
    if (opts.cls) e.className = opts.cls;
    if (opts.text != null) e.textContent = opts.text;
    if (opts.html != null) e.innerHTML = opts.html;
    if (opts.attrs) for (const k in opts.attrs) e.setAttribute(k, opts.attrs[k]);
    if (opts.on) for (const k in opts.on) e.addEventListener(k, opts.on[k]);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function titleCase(id) {
    if (!id) return '';
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
  function fmtNum(v) {
    if (typeof v !== 'number' || !isFinite(v)) return String(v);
    return (Math.round(v * 1000) / 1000).toString();
  }
  function activeGame() {
    return (typeof App !== 'undefined' && App) ? App.game : null;
  }

  // feats.js lifts locked-by-default content (3 weapons, 2 patches, 3 skills)
  // clean out of DATA.weapons / DATA.passives / DATA.skills and parks it in
  // FEAT_VAULT until the feat that unlocks it lands, specifically so a
  // for..in over DATA never sees it. That is exactly the mechanism a "grant
  // any weapon" tool has to see through: these three helpers merge the vault
  // back in for listing, and restore an entry from the vault the moment this
  // panel actually grants it (mirroring Feats.syncPools' own "open" branch).
  const VAULT_KIND = { weapons: 'weapon', passives: 'patch', skills: 'skill' };
  function fullTable(tableName) {
    const out = clone(DATA[tableName] || {});
    const kind = VAULT_KIND[tableName];
    if (kind && typeof FEAT_VAULT !== 'undefined' && FEAT_VAULT[kind]) {
      for (const id in FEAT_VAULT[kind]) if (!out[id]) out[id] = clone(FEAT_VAULT[kind][id]);
    }
    return out;
  }
  function ensureUnvaulted(tableName, id) {
    const table = DATA[tableName];
    if (!table || table[id]) return;
    const kind = VAULT_KIND[tableName];
    if (!kind || typeof FEAT_VAULT === 'undefined' || !FEAT_VAULT[kind]) return;
    const def = FEAT_VAULT[kind][id];
    if (!def) return;
    delete def.locked;
    table[id] = def;
    delete FEAT_VAULT[kind][id];
  }

  // =========================================================================
  // State
  // =========================================================================
  const DT = {
    open: false,
    paused: false,
    stepQueued: 0,
    dirty: false,          // true the instant any dev tool has changed live state
    dirtyReasons: [],
    overlays: {
      hitPlayer: false, hitEnemy: false, hitProp: false, hitShot: false,
      roomBounds: false, doorZones: false, spawnMarkers: false, enemyCount: false,
    },
    tuning: {
      passiveMag: null,   // filled by installPassiveMagnitudes()
      xp: null,            // filled by installXpCurve()
      spawnPacing: null,   // filled by installSpawnPacing()
      roomRelease: null,   // filled by installRoomReleaseRate()
    },
    shipped: {},           // deep-cloned defaults, for RESET buttons
    lastReload: null,      // { ok, msg, at }
    statusMsg: '',
  };

  function markDirty(reason) {
    DT.dirty = true;
    if (reason && DT.dirtyReasons.indexOf(reason) === -1) DT.dirtyReasons.push(reason);
    refreshSaveBanner();
  }

  // =========================================================================
  // Save guards. Once DT.dirty is true, nothing this page does is allowed to
  // reach localStorage: the permanent camp (mbm_meta), the mid run
  // continuable save (mbm_run) and the best-night bragging line (mbm_best)
  // all get their write call turned into a no-op for the rest of this page
  // load. Reloading the page (a real F5) is what gets a clean, saveable state
  // back; that trade is the whole point, since a debug run's numbers must
  // never be indistinguishable from an honest one on disk.
  // =========================================================================
  function installSaveGuards() {
    // META.save(): the single funnel every permanent write goes through
    // (ranks bought, badges credited, codex entries, feat unlocks, roster
    // unlocks). Blocking this one function blocks all of them at once,
    // regardless of which file's code tried to call it.
    if (typeof META !== 'undefined' && META && typeof META.save === 'function' && !META.__mbmGuarded) {
      const origSave = META.save.bind(META);
      META.save = function () {
        if (DT.dirty) return false;
        return origSave();
      };
      META.__mbmGuarded = true;
    }
    // META.credit(): banks a finished run's badges into the permanent camp.
    // Even with save() blocked above, letting credit() run would still leave
    // META.badges etc. inflated IN MEMORY for the rest of the tab, which a
    // later clean run's own (unblocked) save could then carry to disk. So
    // credit() itself is short circuited to a zero-effect version: it tells
    // the results screen the truth (nothing banked) and touches nothing else.
    if (typeof META !== 'undefined' && META && typeof META.credit === 'function' && !META.__mbmCreditGuarded) {
      const origCredit = META.credit.bind(META);
      META.credit = function (g, won) {
        if (DT.dirty) {
          const base = Math.max(0, Math.round((g && g.badges) || 0));
          this.lastCredit = { base, paid: 0, mult: 1, bonus: 0 };
          return;
        }
        return origCredit(g, won);
      };
      META.__mbmCreditGuarded = true;
    }
    // Run._write(): the mid run continuable save, written at every door.
    // Blocked outright while dirty, so a night the panel touched can never be
    // resumed later as if it were a clean one.
    if (typeof Run !== 'undefined' && Run && typeof Run._write === 'function' && !Run.__mbmGuarded) {
      const origWrite = Run._write;
      Run._write = function () {
        if (DT.dirty) return false;
        return origWrite.apply(this, arguments);
      };
      Run.__mbmGuarded = true;
    }
    // saveBest(): the best-time/kills/dawns line on the title screen. A top
    // level function declaration in ui.js, which (classic script, not a
    // module) hangs it on window, so it is reachable and replaceable here.
    if (typeof window.saveBest === 'function' && !window.saveBest.__mbmGuarded) {
      const origSaveBest = window.saveBest;
      const guarded = function () {
        if (DT.dirty) return;
        return origSaveBest.apply(this, arguments);
      };
      guarded.__mbmGuarded = true;
      window.saveBest = guarded;
    }
  }

  // =========================================================================
  // Pause / resume / step. Wraps Game.prototype.update so the wrap is the
  // only thing that ever changes: game.js itself is untouched. When closed
  // and never paused this is one extra property read per frame.
  // =========================================================================
  function installPauseHook() {
    if (typeof Game === 'undefined' || !Game || !Game.prototype || Game.prototype.__mbmUpdateWrapped) return;
    const origUpdate = Game.prototype.update;
    Game.prototype.update = function (dt) {
      if (DT.paused) {
        if (DT.stepQueued > 0) {
          DT.stepQueued--;
          return origUpdate.call(this, 1 / 60);
        }
        return; // frozen: render() still runs every frame off this same state
      }
      return origUpdate.call(this, dt);
    };
    Game.prototype.__mbmUpdateWrapped = true;
  }

  // =========================================================================
  // TIER 2: passive magnitudes. recalc() in game.js hardcodes each patch's
  // per level number (0.12 damage per Trail Mix level, and so on); DATA.
  // passives only carries the description text, not the number. There is no
  // way to make that number live-tunable without either editing game.js
  // (forbidden) or mirroring its formula here and re-applying it after the
  // original runs. This does the second thing: it copies recalc's own
  // formula, unchanged, and only swaps in an overridable magnitude in place
  // of each hardcoded constant. If game.js's recalc ever changes shape this
  // mirror goes stale and needs a resync; everything else in the game keeps
  // working regardless, since the original recalc still runs first, in full.
  // =========================================================================
  const PASSIVE_MAG_DEFAULTS = {
    trailmix: 0.12,   // +damage multiplier per level
    boots: 0.10,      // +move speed multiplier per level
    whistle: 0.91,    // cooldown multiplier base (lower = faster), per level exponent
    skillet: 2,        // +armor per level (flat)
    lodestone: 0.45,  // +pickup radius multiplier per level
    fieldguide: 0.15, // +badge XP multiplier per level
    rabbitfoot: 0.08, // +crit chance per level (flat)
    firstaid: 0.6,     // +HP regen per second, per level (flat)
  };

  function installPassiveMagnitudes() {
    DT.tuning.passiveMag = Object.assign({}, PASSIVE_MAG_DEFAULTS);
    DT.shipped.passiveMag = Object.assign({}, PASSIVE_MAG_DEFAULTS);
    if (typeof Game === 'undefined' || !Game || !Game.prototype || Game.prototype.__mbmRecalcWrapped) return;
    const origRecalc = Game.prototype.recalc;
    Game.prototype.recalc = function () {
      origRecalc.call(this);
      const mag = DT.tuning.passiveMag;
      const c = this.char, p = this.passives;
      const lv = id => p[id] || 0;
      this.dmgMul = (1 + c.dmg) * (1 + mag.trailmix * lv('trailmix')) * (1 + 0.05 * META.rank('sharp'));
      this.speed = c.speed * (1 + mag.boots * lv('boots')) * (1 + 0.04 * META.rank('swift'));
      this.cdMul = Math.pow(mag.whistle, lv('whistle'));
      this.armor = c.armor + mag.skillet * lv('skillet') + META.rank('grit');
      this.magnetR = 65 * (1 + c.pickup) * (1 + mag.lodestone * lv('lodestone')) * (1 + 0.12 * META.rank('packrat'));
      this.xpMul = (1 + mag.fieldguide * lv('fieldguide')) * (1 + 0.08 * META.rank('scholar'));
      this.critCh = c.crit + mag.rabbitfoot * lv('rabbitfoot');
      this.regen = mag.firstaid * lv('firstaid');
    };
    Game.prototype.__mbmRecalcWrapped = true;
  }

  function applyPassiveMagChange(id, val) {
    DT.tuning.passiveMag[id] = val;
    markDirty('tune:passive:' + id);
    const g = activeGame();
    if (g) g.recalc(); // forces the live fields (dmgMul, speed, ...) to update now
  }

  function resetPassiveMag() {
    DT.tuning.passiveMag = Object.assign({}, DT.shipped.passiveMag);
    const g = activeGame();
    if (g) g.recalc();
  }

  // =========================================================================
  // TIER 2: XP curve. DATA.xpNext is a plain function property; replacing it
  // is a normal assignment, not a file edit. Reapplied to the CURRENT bar too
  // (not just the next one) so the change is honestly live rather than
  // "next rank up only".
  // =========================================================================
  const XP_DEFAULTS = { base: 6, lin: 5.0, curveMul: 2.0, curveExp: 1.8 };

  function installXpCurve() {
    DT.tuning.xp = Object.assign({}, XP_DEFAULTS);
    DT.shipped.xp = Object.assign({}, XP_DEFAULTS);
    applyXpCurve(false);
  }
  function applyXpCurve(touchLive) {
    const t = DT.tuning.xp;
    DATA.xpNext = l => Math.floor(t.base + l * t.lin + Math.pow(l, t.curveExp) * t.curveMul);
    if (touchLive) {
      markDirty('tune:xp');
      const g = activeGame();
      if (g) g.xpNext = DATA.xpNext(g.level);
    }
  }
  function resetXpCurve() {
    DT.tuning.xp = Object.assign({}, DT.shipped.xp);
    applyXpCurve(false);
    const g = activeGame();
    if (g) g.xpNext = DATA.xpNext(g.level);
  }

  // =========================================================================
  // TIER 2: spawn pacing. DATA.spawnInterval / DATA.spawnBatch drive the
  // legacy open field director (updateDirector in director.js). Normal
  // room-by-room nights never call that path today (every real room paces its
  // own waves instead, see below), so these sliders are labeled honestly as
  // legacy in the panel. They are still real, live DATA values.
  // =========================================================================
  const SPAWN_DEFAULTS = { intervalBase: 1.05, intervalSlope: 0.062, intervalFloor: 0.24, batchBase: 1, batchSlope: 0.55 };

  function installSpawnPacing() {
    DT.tuning.spawnPacing = Object.assign({}, SPAWN_DEFAULTS);
    DT.shipped.spawnPacing = Object.assign({}, SPAWN_DEFAULTS);
    applySpawnPacing(false);
  }
  function applySpawnPacing(touchLive) {
    const t = DT.tuning.spawnPacing;
    DATA.spawnInterval = m => Math.max(t.intervalFloor, t.intervalBase - m * t.intervalSlope);
    DATA.spawnBatch = m => t.batchBase + Math.floor(m * t.batchSlope);
    if (touchLive) markDirty('tune:spawnpacing');
  }
  function resetSpawnPacing() {
    DT.tuning.spawnPacing = Object.assign({}, DT.shipped.spawnPacing);
    applySpawnPacing(false);
  }

  // The number that actually matters for a room-based night: how fast a
  // room's queued wave trickles bodies onto the field. room.js hardcodes this
  // as ROOM_RELEASE = 0.06s per body; there is no DATA field for it, so the
  // same wrap-the-prototype approach as recalc() applies. Room.prototype
  // lives in js/room.js, which nobody else is editing this session, so the
  // drift risk that recalc's mirror carries does not apply here.
  const ROOM_RELEASE_DEFAULT = 0.06;
  function installRoomReleaseRate() {
    DT.tuning.roomRelease = ROOM_RELEASE_DEFAULT;
    DT.shipped.roomRelease = ROOM_RELEASE_DEFAULT;
    if (typeof Room === 'undefined' || !Room || !Room.prototype || Room.prototype.__mbmReleaseWrapped) return;
    Room.prototype._releasePending = function (g, dt) {
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
        this.releaseT += DT.tuning.roomRelease;
      }
      if (!this.pending.length && this.releaseT < 0) this.releaseT = 0;
    };
    Room.prototype.__mbmReleaseWrapped = true;
  }
  function applyRoomReleaseRate(val) {
    DT.tuning.roomRelease = Math.max(0.01, val);
    markDirty('tune:roomrelease');
  }
  function resetRoomReleaseRate() {
    DT.tuning.roomRelease = DT.shipped.roomRelease;
  }

  // =========================================================================
  // TIER 2: enemies, weapons, bosses. These live entirely in DATA, so tuning
  // them is a direct mutation of DATA plus, where the change should be felt
  // immediately rather than on the next spawn, a proportional rescale of
  // whatever is already on the field.
  // =========================================================================
  function snapshotEnemiesWeaponsBosses() {
    DT.shipped.enemies = clone(DATA.enemies);
    // fullTable(), not clone(DATA.weapons): at boot, feats.js has already run
    // its own syncPools and may have already lifted locked-by-default weapons
    // out of DATA.weapons entirely (see FEAT_VAULT above). The shipped
    // snapshot needs the complete, original catalogue for RESET and EXPORT
    // to be honest, so it merges the vault back in.
    DT.shipped.weapons = fullTable('weapons');
    DT.shipped.bosses = clone(DATA.bosses);
  }

  const ENEMY_FIELDS = ['hp', 'spd', 'dmg', 'xp'];

  function applyEnemyField(id, field, val) {
    const d = DATA.enemies[id];
    if (!d) return;
    const old = d[field];
    d[field] = val;
    markDirty('tune:enemy:' + id + ':' + field);
    const g = activeGame();
    if (!g || !old || old === 0) return;
    const ratio = val / old;
    for (const e of g.enemies) {
      if (e.dead || e.boss || e.kind !== id) continue;
      if (field === 'hp') {
        e.maxhp = e.maxhp * ratio;
        e.hp = Math.min(e.maxhp, Math.max(1, e.hp * ratio));
      } else if (field === 'spd') e.spd = e.spd * ratio;
      else if (field === 'dmg') e.dmg = e.dmg * ratio;
      else if (field === 'xp') e.xp = e.xp * ratio;
    }
  }
  // Reset puts DATA back to the shipped numbers exactly, so every future
  // spawn is exact again. What is already standing in the room keeps
  // whatever numbers applyEnemyField last gave it: there is no single
  // "original" value recorded per live body to rescale it back to (two
  // squirrels tuned by two different edits would need two different
  // answers), so this one case is honestly a next-spawn-only reset, and the
  // panel's hint text says so.
  function resetEnemies() {
    DATA.enemies = clone(DT.shipped.enemies);
  }

  const WEAPON_MAX = (typeof DATA !== 'undefined' && DATA.WEAPON_MAX) || 5;

  function refreshWeaponInstances(id) {
    const g = activeGame();
    if (!g) return;
    for (const w of g.weapons) {
      if (w.id === id) w.stats = g.computeWeaponStats(id, w.lvl);
    }
  }
  function applyWeaponBaseField(id, field, val) {
    const def = DATA.weapons[id];
    if (!def || !def.base) return;
    def.base[field] = val;
    markDirty('tune:weapon:' + id + ':base:' + field);
    refreshWeaponInstances(id);
  }
  function applyWeaponLevelField(id, levelIdx, field, val) {
    const def = DATA.weapons[id];
    if (!def || !def.levels || !def.levels[levelIdx]) return;
    def.levels[levelIdx][field] = val;
    markDirty('tune:weapon:' + id + ':lvl' + (levelIdx + 1) + ':' + field);
    refreshWeaponInstances(id);
  }
  function resetWeapons() {
    DATA.weapons = clone(DT.shipped.weapons);
    const g = activeGame();
    if (g) for (const w of g.weapons) w.stats = g.computeWeaponStats(w.id, w.lvl);
  }

  function applyBossField(idx, field, val) {
    const def = DATA.bosses[idx];
    if (!def) return;
    const old = def[field];
    def[field] = val;
    markDirty('tune:boss:' + def.id + ':' + field);
    // Keep the tiered copies (DATA.bossTiers) that the room run actually
    // deals from in sync: they were built once, at load, as separate object
    // copies of these same rows.
    if (DATA.bossTiers) {
      for (const tier in DATA.bossTiers) {
        for (const t of DATA.bossTiers[tier]) if (t.id === def.id) t[field] = val;
      }
    }
    const g = activeGame();
    if (!g || !old) return;
    const ratio = val / old;
    for (const e of g.enemies) {
      if (e.dead || !e.boss || e.kind !== def.id) continue;
      if (field === 'hp') {
        e.maxhp = e.maxhp * ratio;
        e.hp = Math.min(e.maxhp, Math.max(1, e.hp * ratio));
      } else if (field === 'dmg') e.dmg = e.dmg * ratio;
    }
  }
  function resetBosses() {
    DATA.bosses = clone(DT.shipped.bosses);
    DATA.bossTiers = (function () {
      const by = {};
      for (const b of DATA.bosses) by[b.id] = b;
      return {
        1: [Object.assign({}, by.hare, { tier: 1, act: 1 })],
        2: [Object.assign({}, by.vicar, { tier: 2, act: 2 }), Object.assign({}, by.mole, { tier: 2, act: 2 })],
        3: [Object.assign({}, by.antlered, { tier: 3, act: 3, final: true }), Object.assign({}, by.behind, { tier: 3, act: 3, final: true })],
      };
    })();
  }

  // =========================================================================
  // TIER 2 addendum: reload js/rooms.js live, without restarting the run.
  // Fetches the file fresh (cache busted), evaluates it in an isolated scope
  // (so its top level `const ROOMS =` etc. cannot collide with the page's
  // real ones), validates the room the player is standing in still builds
  // under the new data, and only THEN swaps the live catalogue and re-enters
  // the room. Any failure at any step leaves the live game completely
  // untouched and reports why on screen.
  // =========================================================================
  function swapObjInPlace(target, source) {
    const backup = Object.assign({}, target);
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(target, source);
    return backup;
  }
  function swapArrInPlace(target, source) {
    const backup = target.slice();
    target.length = 0;
    for (const v of source) target.push(v);
    return backup;
  }

  async function fetchRoomsModule() {
    const url = 'js/rooms.js?_dtreload=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed: HTTP ' + res.status);
    const text = await res.text();
    const wrapped = text +
      '\n;return { ROOMS: (typeof ROOMS!=="undefined"?ROOMS:null), ' +
      'ACT_TEMPLATES: (typeof ACT_TEMPLATES!=="undefined"?ACT_TEMPLATES:null), ' +
      'WAVE_TEMPLATES: (typeof WAVE_TEMPLATES!=="undefined"?WAVE_TEMPLATES:null) };';
    let factory;
    try {
      factory = new Function(wrapped);
    } catch (e) {
      throw new Error('syntax error: ' + e.message);
    }
    const out = factory();
    if (!out || !out.ROOMS || typeof out.ROOMS !== 'object') throw new Error('rooms.js did not define ROOMS');
    if (!Array.isArray(out.ACT_TEMPLATES)) throw new Error('rooms.js did not define ACT_TEMPLATES');
    if (!out.WAVE_TEMPLATES || typeof out.WAVE_TEMPLATES !== 'object') throw new Error('rooms.js did not define WAVE_TEMPLATES');
    return out;
  }

  async function reloadLayouts() {
    const g = activeGame();
    if (!g || !g.room) {
      setReloadResult(false, 'no live room to reload into');
      return;
    }
    let fresh;
    try {
      fresh = await fetchRoomsModule();
    } catch (e) {
      setReloadResult(false, 'fetch/parse failed, kept old layouts: ' + e.message);
      return;
    }

    const type = g.room.def && g.room.def.type;
    const id = g.room.def && g.room.def.id;
    if (!type || !id) {
      setReloadResult(false, 'the live room has no def.type/def.id to look up, kept old layouts');
      return;
    }

    const bakRooms = swapObjInPlace(ROOMS, fresh.ROOMS);
    const bakWave = swapObjInPlace(WAVE_TEMPLATES, fresh.WAVE_TEMPLATES);
    const bakAct = swapArrInPlace(ACT_TEMPLATES, fresh.ACT_TEMPLATES);

    let probe = null;
    let failReason = null;
    try {
      const newDef = ROOMS[type] && ROOMS[type][id];
      if (!newDef) {
        failReason = 'the room you are standing in ("' + id + '", type ' + type + ') no longer exists in the reloaded file';
      } else {
        probe = new Room(newDef, Math.random);
      }
    } catch (e) {
      failReason = 'the new layout failed to build: ' + e.message;
    }

    if (!probe || failReason) {
      swapObjInPlace(ROOMS, bakRooms);
      swapObjInPlace(WAVE_TEMPLATES, bakWave);
      swapArrInPlace(ACT_TEMPLATES, bakAct);
      setReloadResult(false, (failReason || 'unknown error') + ' -- kept the old layouts, nothing changed.');
      return;
    }

    // Committed. Sweep the world exactly the way a real door transition does
    // (Transition.js's own ARRAY_FIELDS list, reused rather than reinvented),
    // then stand the fresh room up in the old one's place.
    const ARRAY_FIELDS = ['enemies', 'shots', 'eshots', 'bombs', 'puddles', 'rings',
      'swings', 'corpses', 'gems', 'pickups', 'parts', 'props', 'zones'];
    for (const f of ARRAY_FIELDS) { if (Array.isArray(g[f])) g[f].length = 0; }

    const old = g.room;
    probe.act = old.act;
    probe.roomIdx = old.roomIdx;
    probe.threatValue = old.threatValue;
    g.room = probe;
    if (typeof probe.enter === 'function') probe.enter(g);
    if (probe.entryPoint && g.player) { g.player.x = probe.entryPoint.x; g.player.y = probe.entryPoint.y; }

    const slot = (typeof Run !== 'undefined' && Run && Run.plan && Run.plan[Run.act - 1]) ? Run.plan[Run.act - 1][Run.roomIdx] : null;
    if (slot && slot.boss && typeof g.spawnBoss === 'function') g.spawnBoss(slot.bossDef || slot.boss);

    // Ambience: a new Room object no longer equals the one updateAmbience
    // last saw, so the very next frame tears the old loops down and builds
    // fresh ones off the new room's own dressing (game.js buildAmbience does
    // the teardown; nothing here needs to touch AudioSys directly).
    g._ambRoom = null;

    markDirty('reload:' + id);
    setReloadResult(true, 'reloaded "' + id + '" (' + type + ') at ' + new Date().toLocaleTimeString());
  }

  function setReloadResult(ok, msg) {
    DT.lastReload = { ok, msg, at: Date.now() };
    const box = document.getElementById('mbmdt-reload-status');
    if (box) {
      box.textContent = msg;
      box.style.color = ok ? '#7ec87e' : '#d84b3a';
    }
  }

  // =========================================================================
  // TIER 1: pick up existing window.MBM, add a few of our own.
  // =========================================================================
  function doJump(act, room) {
    const g = activeGame();
    if (!g || typeof Run === 'undefined' || !Run.active) {
      setStatus('jump needs a run in progress');
      return;
    }
    markDirty('jump');
    window.MBM.warp(act, room);
    // The room's own 0.9s timer already locks it in and starts its waves on
    // its own (verified: it does not actually get stuck at -1 in real play).
    // Forcing it here just makes a debug jump feel instant instead of making
    // you wait out that timer.
    if (g.room && g.room.state === 'entering') {
      try { g.room._lockIn(g); } catch (e) {}
    }
    setStatus('jumped to act ' + Run.act + ', room ' + (Run.roomIdx + 1));
  }

  function cursorWorldPos(g) {
    if (g.player && g.player.in && typeof g.player.in.aimX === 'number') {
      return { x: g.player.in.aimX, y: g.player.in.aimY };
    }
    return { x: g.player.x, y: g.player.y };
  }
  function nearPlayerPos(g) {
    const a = Math.random() * Math.PI * 2;
    const r = 140 + Math.random() * 80;
    let x = g.player.x + Math.cos(a) * r;
    let y = g.player.y + Math.sin(a) * r;
    if (g.room && g.room.bounds && typeof Collide !== 'undefined' && Collide.clampToBounds) {
      const c = Collide.clampToBounds(x, y, 20, g.room.bounds);
      x = c.x; y = c.y;
    }
    return { x, y };
  }

  function doSpawnEnemy(id, atCursor) {
    const g = activeGame();
    if (!g) { setStatus('spawn needs a live run'); return; }
    if (!DATA.enemies[id]) { setStatus('no enemy called ' + id); return; }
    markDirty('spawn:' + id);
    const p = atCursor ? cursorWorldPos(g) : nearPlayerPos(g);
    const e = g.spawnEnemy(id, p.x, p.y, false);
    setStatus(e ? ('spawned ' + id) : ('spawn of ' + id + ' failed'));
  }
  function doSpawnBoss(id, atCursor) {
    const g = activeGame();
    if (!g) { setStatus('spawn needs a live run'); return; }
    const def = DATA.bosses.find(b => b.id === id);
    if (!def) { setStatus('no boss called ' + id); return; }
    markDirty('spawn:boss:' + id);
    const p = atCursor ? cursorWorldPos(g) : nearPlayerPos(g);
    const e = g.spawnBoss(def);
    if (e) { e.x = p.x; e.y = p.y; }
    setStatus(e ? ('spawned ' + def.name) : ('spawn of ' + def.name + ' failed'));
  }

  function doGrantWeapon(id, lvl) {
    const g = activeGame();
    if (!g) { setStatus('grant needs a live run'); return; }
    ensureUnvaulted('weapons', id); // a locked-by-default weapon has to come back from FEAT_VAULT before DATA.weapons[id] exists to read
    if (!DATA.weapons[id]) { setStatus('no weapon called ' + id); return; }
    markDirty('grant:weapon:' + id);
    let w = g.weapons.find(w => w.id === id);
    if (!w) { g.addWeapon(id); w = g.weapons.find(w => w.id === id); }
    if (w) { w.lvl = clamp(lvl | 0, 1, WEAPON_MAX); w.stats = g.computeWeaponStats(id, w.lvl); }
    setStatus('granted ' + DATA.weapons[id].name + ' lv ' + (w ? w.lvl : '?'));
  }
  function doGrantPatch(id, lvl) {
    const g = activeGame();
    if (!g) { setStatus('grant needs a live run'); return; }
    ensureUnvaulted('passives', id);
    const def = DATA.passives[id];
    if (!def) { setStatus('no patch called ' + id); return; }
    markDirty('grant:patch:' + id);
    g.passives[id] = clamp(lvl | 0, 1, def.max || 3);
    g.recalc();
    setStatus('granted ' + def.name + ' lv ' + g.passives[id]);
  }
  function doGrantSkill(id) {
    const g = activeGame();
    if (!g) { setStatus('grant needs a live run'); return; }
    ensureUnvaulted('skills', id);
    markDirty('grant:skill:' + id);
    const s = g.setSkill(id);
    setStatus(s ? ('granted skill ' + (s.def.name || id)) : ('no skill called ' + id));
  }
  function doGrantRelic(id) {
    const g = activeGame();
    if (!g) { setStatus('grant needs a live run'); return; }
    if (!DATA.relics[id]) return;
    markDirty('grant:relic:' + id);
    const ok = g.addItem(g.player, id);
    setStatus(ok ? ('granted relic ' + DATA.relics[id].name) : (DATA.relics[id].name + ' already held'));
  }

  function doGod() {
    const g = activeGame();
    if (!g) { setStatus('god mode needs a live run'); return; }
    markDirty('god');
    const on = window.MBM.god();
    setStatus('god mode ' + (on ? 'ON' : 'off'));
    return on;
  }
  function doKillAll() {
    const g = activeGame();
    if (!g) { setStatus('kill all needs a live run'); return; }
    markDirty('killall');
    let n = 0;
    for (const e of g.enemies.slice()) { if (!e.dead) { g.killEnemy(e, true); n++; } }
    setStatus('killed ' + n + ' (including any boss)');
  }

  function setStatus(msg) {
    DT.statusMsg = msg;
    const box = document.getElementById('mbmdt-status');
    if (box) box.textContent = msg;
  }

  // =========================================================================
  // Overlay drawing: an independent, self scheduling requestAnimationFrame
  // loop, separate from the game's own. It draws on top of whatever the
  // game's frame() just painted to the same canvas, and it costs one boolean
  // check and nothing else on every frame where every toggle is off and the
  // panel is closed.
  // =========================================================================
  function drawOverlays() {
    requestAnimationFrame(drawOverlays);
    const anyOn = DT.overlays.hitPlayer || DT.overlays.hitEnemy || DT.overlays.hitProp ||
      DT.overlays.hitShot || DT.overlays.roomBounds || DT.overlays.doorZones ||
      DT.overlays.spawnMarkers || DT.overlays.enemyCount;
    if (!anyOn) return;
    const g = activeGame();
    if (!g || typeof cv === 'undefined' || !cv) return;
    try { paintOverlays(g); } catch (e) { /* an overlay glitch must never break the game's own render */ }
  }

  function paintOverlays(g) {
    const ctx = cv.getContext('2d');
    const W = window.innerWidth, H = window.innerHeight;
    const dpr = (typeof DPR === 'number' && DPR > 0) ? DPR : 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Z = (typeof ZOOM === 'number' ? ZOOM : 1.5) * (g.zoomF || 1);
    ctx.translate(W / 2 + (g.shakeX || 0), H / 2 + (g.shakeY || 0));
    ctx.scale(Z, Z);
    ctx.translate(-g.cam.x, -g.cam.y);
    ctx.lineWidth = 1.5 / Z;

    const circle = (x, y, r, color) => {
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    };

    if (DT.overlays.roomBounds && g.room && g.room.bounds) {
      const b = g.room.bounds;
      ctx.strokeStyle = 'rgba(126,200,232,0.85)';
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
    if (DT.overlays.doorZones && g.room && Array.isArray(g.room.doors)) {
      for (const d of g.room.doors) circle(d.x, d.y, d.r, d.state === 'open' ? 'rgba(126,232,150,0.9)' : 'rgba(232,126,126,0.9)');
    }
    if (DT.overlays.spawnMarkers && g.room && g.room.def && Array.isArray(g.room.def.spawnMarkers)) {
      for (const m of g.room.def.spawnMarkers) {
        const p = g.room.toWorld(m.x, m.y);
        ctx.strokeStyle = 'rgba(244,197,66,0.9)';
        ctx.beginPath(); ctx.moveTo(p.x - 8, p.y); ctx.lineTo(p.x + 8, p.y);
        ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y + 8); ctx.stroke();
      }
    }
    if (DT.overlays.hitPlayer && g.player) circle(g.player.x, g.player.y, g.player.r, '#7ec8e8');
    if (DT.overlays.hitEnemy) for (const e of g.enemies) if (!e.dead) circle(e.x, e.y, e.r, e.boss ? '#ff5b45' : '#f4c542');
    if (DT.overlays.hitProp) for (const pr of g.props) if (!pr.dead) circle(pr.x, pr.y, pr.r, '#7ec87e');
    if (DT.overlays.hitShot) {
      for (const s of g.shots) circle(s.x, s.y, s.r || 3, '#ffffff');
      for (const s of g.eshots) circle(s.x, s.y, s.r || 3, '#ff8a8a');
    }
    ctx.restore();

    if (DT.overlays.enemyCount) {
      const n = g.enemies.filter(e => !e.dead).length;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = 'bold 13px Verdana, sans-serif';
      ctx.fillStyle = 'rgba(8,8,12,0.75)';
      ctx.fillRect(W - 150, H - 34, 138, 24);
      ctx.fillStyle = '#f4c542';
      ctx.fillText(n + ' enemies live', W - 142, H - 17);
      ctx.restore();
    }
  }

  // =========================================================================
  // Stat readout: reads exactly the fields the game itself computed, on a
  // slow poll while the panel is open. Never recomputes anything of its own.
  // =========================================================================
  let statTimer = null;
  function startStatPolling() {
    stopStatPolling();
    statTimer = setInterval(refreshStatReadout, 250);
    refreshStatReadout();
  }
  function stopStatPolling() {
    if (statTimer) { clearInterval(statTimer); statTimer = null; }
  }
  function refreshStatReadout() {
    const box = document.getElementById('mbmdt-stats');
    if (!box) return;
    const g = activeGame();
    if (!g) { box.textContent = 'no live run'; return; }
    const p = g.player;
    const lines = [];
    lines.push('HP ' + Math.round(p.hp) + ' / ' + Math.round(p.maxhp) + (p.god ? '  (GOD)' : ''));
    lines.push('Level ' + g.level + '   XP ' + Math.round(g.xp) + ' / ' + g.xpNext);
    lines.push('Act ' + g.act + ', room ' + ((g.roomIdx || 0) + 1) + '   time ' + Math.floor(g.time) + 's');
    lines.push('Coins ' + g.coins + '   badges ' + Math.round(g.badges) + '   kills ' + g.kills);
    const s = g.skillInfo ? g.skillInfo() : null;
    lines.push('Skill: ' + (s ? s.name : 'none'));
    if (typeof g.statsSummary === 'function') {
      for (const [k, v] of g.statsSummary()) lines.push(k + ': ' + v);
    }
    box.textContent = lines.join('\n');
  }

  // =========================================================================
  // Export: everything that differs from the shipped snapshot, as pasteable
  // assignment statements. This is not the file's own inline formatting
  // (matching that byte for byte is not something a generic diff can
  // promise); it is valid, directly pasteable JS that lands the same values.
  // =========================================================================
  function buildExportText() {
    const lines = [];
    lines.push('// Dev overlay export, ' + new Date().toString());
    lines.push('// Paste each block after the file it is commented with loads,');
    lines.push('// or fold the individual values into the matching literal by hand.');
    lines.push('');

    const enemyLines = [];
    for (const id in DATA.enemies) {
      const shipped = DT.shipped.enemies && DT.shipped.enemies[id];
      if (!shipped) continue;
      for (const f of ENEMY_FIELDS) {
        if (DATA.enemies[id][f] !== shipped[f]) {
          enemyLines.push('DATA.enemies.' + id + '.' + f + ' = ' + fmtNum(DATA.enemies[id][f]) + ';  // was ' + fmtNum(shipped[f]));
        }
      }
    }
    if (enemyLines.length) { lines.push('// js/data.js -- DATA.enemies'); lines.push(...enemyLines); lines.push(''); }

    const weaponLines = [];
    for (const id in DATA.weapons) {
      const shipped = DT.shipped.weapons && DT.shipped.weapons[id];
      if (!shipped) continue;
      const base = DATA.weapons[id].base || {};
      for (const f in base) {
        if (base[f] !== (shipped.base || {})[f]) {
          weaponLines.push('DATA.weapons.' + id + '.base.' + f + ' = ' + fmtNum(base[f]) + ';  // was ' + fmtNum(shipped.base[f]));
        }
      }
      const levels = DATA.weapons[id].levels || [];
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i] || {};
        const shipLvl = (shipped.levels || [])[i] || {};
        for (const f in lvl) {
          if (f === 'text') continue;
          if (lvl[f] !== shipLvl[f]) {
            weaponLines.push('DATA.weapons.' + id + '.levels[' + i + '].' + f + ' = ' + fmtNum(lvl[f]) + ';  // was ' + fmtNum(shipLvl[f]));
          }
        }
      }
    }
    if (weaponLines.length) { lines.push('// js/data.js -- DATA.weapons'); lines.push(...weaponLines); lines.push(''); }

    const bossLines = [];
    for (let i = 0; i < DATA.bosses.length; i++) {
      const shipped = DT.shipped.bosses && DT.shipped.bosses[i];
      if (!shipped) continue;
      for (const f of ['hp', 'dmg']) {
        if (DATA.bosses[i][f] !== shipped[f]) {
          bossLines.push('DATA.bosses[' + i + '].' + f + ' = ' + fmtNum(DATA.bosses[i][f]) + ';  // ' + DATA.bosses[i].name + ', was ' + fmtNum(shipped[f]));
        }
      }
    }
    if (bossLines.length) { lines.push('// js/data.js -- DATA.bosses'); lines.push(...bossLines); lines.push(''); }

    const magLines = [];
    if (DT.tuning.passiveMag) {
      for (const id in DT.tuning.passiveMag) {
        if (DT.tuning.passiveMag[id] !== DT.shipped.passiveMag[id]) {
          magLines.push('// DATA.passives has no magnitude field; ' + id + ' per level is hardcoded in game.js recalc().');
          magLines.push('//   ' + id + ': ' + fmtNum(DT.tuning.passiveMag[id]) + '  (was ' + fmtNum(DT.shipped.passiveMag[id]) + ') -- edit the matching constant in Game.prototype.recalc');
        }
      }
    }
    if (magLines.length) { lines.push('// js/game.js -- Game.prototype.recalc, passive magnitudes'); lines.push(...magLines); lines.push(''); }

    if (DT.tuning.xp && JSON.stringify(DT.tuning.xp) !== JSON.stringify(DT.shipped.xp)) {
      const t = DT.tuning.xp;
      lines.push('// js/data.js -- DATA.xpNext');
      lines.push('DATA.xpNext = l => Math.floor(' + fmtNum(t.base) + ' + l * ' + fmtNum(t.lin) + ' + Math.pow(l, ' + fmtNum(t.curveExp) + ') * ' + fmtNum(t.curveMul) + ');');
      lines.push('');
    }

    if (DT.tuning.spawnPacing && JSON.stringify(DT.tuning.spawnPacing) !== JSON.stringify(DT.shipped.spawnPacing)) {
      const t = DT.tuning.spawnPacing;
      lines.push('// js/data.js -- DATA.spawnInterval / DATA.spawnBatch (legacy open field director)');
      lines.push('DATA.spawnInterval = m => Math.max(' + fmtNum(t.intervalFloor) + ', ' + fmtNum(t.intervalBase) + ' - m * ' + fmtNum(t.intervalSlope) + ');');
      lines.push('DATA.spawnBatch = m => ' + fmtNum(t.batchBase) + ' + Math.floor(m * ' + fmtNum(t.batchSlope) + ');');
      lines.push('');
    }

    if (DT.tuning.roomRelease != null && DT.tuning.roomRelease !== DT.shipped.roomRelease) {
      lines.push('// js/room.js -- ROOM_RELEASE (queued spawn release rate, seconds per body)');
      lines.push('const ROOM_RELEASE = ' + fmtNum(DT.tuning.roomRelease) + ';  // was ' + fmtNum(DT.shipped.roomRelease));
      lines.push('');
    }

    if (lines.length <= 4) lines.push('// nothing has been changed yet.');
    return lines.join('\n');
  }

  async function doExport() {
    const text = buildExportText();
    const box = document.getElementById('mbmdt-export-text');
    if (box) box.value = text;
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (e) { copied = false; }
    setStatus(copied ? 'export copied to clipboard' : 'export ready below (clipboard copy unavailable, select and copy manually)');
  }

  // =========================================================================
  // DOM panel
  // =========================================================================
  let panelRoot = null;

  function injectStyle() {
    const css = `
#mbmdt-root { position: fixed; top: 0; right: 0; width: 380px; max-width: 92vw; height: 100%;
  background: rgba(10,12,16,0.96); border-left: 2px solid #3a4150; color: #d9d2c0;
  font-family: Verdana, sans-serif; font-size: 12px; z-index: 99999; display: none;
  flex-direction: column; box-shadow: -6px 0 24px rgba(0,0,0,0.6); }
#mbmdt-root.mbmdt-open { display: flex; }
#mbmdt-head { padding: 10px 12px; border-bottom: 1px solid #2a2f38; display:flex; align-items:center; justify-content:space-between; }
#mbmdt-head b { color: #f4c542; letter-spacing: 1px; font-size: 13px; }
#mbmdt-tabs { display: flex; gap: 4px; padding: 8px 10px 0; }
.mbmdt-tabbtn { flex: 1; cursor: pointer; background: #161b23; border: 1px solid #3a4150; color: #8d947f;
  padding: 6px 4px; font-size: 11px; font-weight: bold; letter-spacing: 1px; border-radius: 4px 4px 0 0; }
.mbmdt-tabbtn.on { color: #0d1015; background: #f4c542; border-color: #f4c542; }
#mbmdt-body { flex: 1; overflow-y: auto; padding: 10px 12px; }
.mbmdt-sec { border: 1px solid #262d38; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px; }
.mbmdt-sec h4 { color: #f4c542; font-size: 11px; letter-spacing: 1px; margin-bottom: 6px; }
.mbmdt-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
.mbmdt-row label { color: #8d947f; min-width: 70px; }
#mbmdt-root select, #mbmdt-root input[type=number], #mbmdt-root input[type=text] {
  background: #0b0e13; color: #d9d2c0; border: 1px solid #333a46; border-radius: 4px; padding: 3px 5px; font-size: 11px; }
#mbmdt-root input[type=number] { width: 68px; }
#mbmdt-root input[type=range] { width: 100px; accent-color: #f4c542; }
#mbmdt-root button { cursor: pointer; font-family: inherit; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;
  color: #e8e0cc; background: #161b23; border: 1px solid #3a4150; border-radius: 4px; padding: 4px 9px; }
#mbmdt-root button:hover { border-color: #f4c542; color: #f4c542; }
#mbmdt-root button.mbmdt-danger:hover { border-color: #d84b3a; color: #d84b3a; }
.mbmdt-check { display: flex; align-items: center; gap: 5px; }
#mbmdt-status { font-size: 11px; color: #7ec8e8; min-height: 14px; padding: 2px 0; }
#mbmdt-savebanner { font-size: 10px; letter-spacing: 1px; padding: 5px 10px; text-align: center; display: none; }
#mbmdt-savebanner.on { display: block; background: rgba(216,75,58,0.18); color: #ff8a75; border-bottom: 1px solid #5a2018; }
#mbmdt-stats { white-space: pre-line; font-size: 11px; line-height: 1.5; color: #cfe8b0; }
#mbmdt-export-text { width: 100%; height: 140px; background: #0b0e13; color: #d9d2c0; border: 1px solid #333a46;
  font-family: monospace; font-size: 10px; padding: 6px; box-sizing: border-box; }
.mbmdt-hide { display: none !important; }
.mbmdt-hint { color: #5d6370; font-size: 10px; line-height: 1.4; margin-bottom: 6px; }
`;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function section(title) {
    const s = el('div', { cls: 'mbmdt-sec' });
    s.appendChild(el('h4', { text: title }));
    return s;
  }
  function row() { return el('div', { cls: 'mbmdt-row' }); }
  function numberInput(value, min, max, step, onChange) {
    const i = el('input', { attrs: { type: 'number', value: String(value) } });
    if (min != null) i.min = min;
    if (max != null) i.max = max;
    if (step != null) i.step = step;
    i.addEventListener('change', () => onChange(parseFloat(i.value)));
    return i;
  }
  function selectOf(pairs) {
    const s = el('select');
    for (const [val, label] of pairs) s.appendChild(el('option', { text: label, attrs: { value: val } }));
    return s;
  }
  function button(label, onClick, cls) {
    return el('button', { text: label, attrs: cls ? { class: cls } : {}, on: { click: onClick } });
  }

  // ---- Tier 1 tab -------------------------------------------------------
  function buildLiveTab() {
    const wrap = el('div');

    // Pause / step
    const sPause = section('RUN CONTROL');
    const rowP = row();
    const btnPause = button('PAUSE', () => {
      DT.paused = !DT.paused;
      btnPause.textContent = DT.paused ? 'RESUME' : 'PAUSE';
    });
    const btnStep = button('STEP 1 FRAME', () => { DT.paused = true; btnPause.textContent = 'RESUME'; DT.stepQueued++; });
    rowP.appendChild(btnPause); rowP.appendChild(btnStep);
    sPause.appendChild(rowP);
    sPause.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Pause freezes the whole simulation; the picture stays on screen. Step advances exactly one frame while paused, the single most useful thing here for watching a hit land.' }));
    wrap.appendChild(sPause);

    // Jump
    const sJump = section('JUMP');
    const rj = row();
    const actSel = selectOf([[1, 'Act 1'], [2, 'Act 2'], [3, 'Act 3']]);
    const roomInput = numberInput(1, 1, 12, 1, () => {});
    rj.appendChild(el('label', { text: 'Act' })); rj.appendChild(actSel);
    rj.appendChild(el('label', { text: 'Room' })); rj.appendChild(roomInput);
    sJump.appendChild(rj);
    sJump.appendChild(button('JUMP TO ACT + ROOM', () => doJump(parseInt(actSel.value, 10), parseInt(roomInput.value, 10) || 1)));
    sJump.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Skips the rooms between here and there, bloodlessly, then locks the destination room in immediately so combat starts without waiting.' }));
    wrap.appendChild(sJump);

    // Spawn
    const sSpawn = section('SPAWN');
    const enemyIds = Object.keys(DATA.enemies);
    const enemySel = selectOf(enemyIds.map(id => [id, titleCase(id)]));
    const rSp1 = row();
    rSp1.appendChild(el('label', { text: 'Enemy' })); rSp1.appendChild(enemySel);
    sSpawn.appendChild(rSp1);
    const rSp2 = row();
    rSp2.appendChild(button('AT CURSOR', () => doSpawnEnemy(enemySel.value, true)));
    rSp2.appendChild(button('NEAR ME', () => doSpawnEnemy(enemySel.value, false)));
    sSpawn.appendChild(rSp2);

    const bossSel = selectOf(DATA.bosses.map(b => [b.id, b.name]));
    const rSp3 = row();
    rSp3.appendChild(el('label', { text: 'Boss' })); rSp3.appendChild(bossSel);
    sSpawn.appendChild(rSp3);
    const rSp4 = row();
    rSp4.appendChild(button('AT CURSOR', () => doSpawnBoss(bossSel.value, true)));
    rSp4.appendChild(button('NEAR ME', () => doSpawnBoss(bossSel.value, false)));
    sSpawn.appendChild(rSp4);
    wrap.appendChild(sSpawn);

    // Grant. All three lists include content still locked behind a merit
    // badge (feats.js has already lifted it out of DATA and into FEAT_VAULT
    // by the time this panel builds): fullTable() merges the vault back in
    // for listing, and doGrantWeapon/Patch/Skill below restore the real
    // entry from the vault at the moment of granting, since "any weapon, any
    // patch, any skill" has to mean any of them, not just the ones already
    // open.
    const sGrant = section('GRANT');
    const fullWeapons = fullTable('weapons');
    const wSel = selectOf(Object.keys(fullWeapons).map(id => [id, fullWeapons[id].name + (fullWeapons[id].locked ? ' (locked)' : '')]));
    const wLvl = numberInput(1, 1, WEAPON_MAX, 1, () => {});
    const rG1 = row();
    rG1.appendChild(el('label', { text: 'Weapon' })); rG1.appendChild(wSel);
    rG1.appendChild(el('label', { text: 'Lv' })); rG1.appendChild(wLvl);
    rG1.appendChild(button('GRANT', () => doGrantWeapon(wSel.value, parseInt(wLvl.value, 10) || 1)));
    sGrant.appendChild(rG1);

    const fullPassives = fullTable('passives');
    const pSel = selectOf(Object.keys(fullPassives).map(id => [id, fullPassives[id].name + (fullPassives[id].locked ? ' (locked)' : '')]));
    const pLvl = numberInput(1, 1, 3, 1, () => {});
    const rG2 = row();
    rG2.appendChild(el('label', { text: 'Patch' })); rG2.appendChild(pSel);
    rG2.appendChild(el('label', { text: 'Lv' })); rG2.appendChild(pLvl);
    rG2.appendChild(button('GRANT', () => doGrantPatch(pSel.value, parseInt(pLvl.value, 10) || 1)));
    sGrant.appendChild(rG2);

    const fullSkills = fullTable('skills');
    const skillIds = (typeof Game !== 'undefined' && Game.skillIds) ? Game.skillIds() : Object.keys(fullSkills);
    const skSel = selectOf(skillIds.map(id => [id, (fullSkills[id] && (fullSkills[id].name + (fullSkills[id].locked ? ' (locked)' : ''))) || id]));
    const rG3 = row();
    rG3.appendChild(el('label', { text: 'Skill' })); rG3.appendChild(skSel);
    rG3.appendChild(button('GRANT', () => doGrantSkill(skSel.value)));
    sGrant.appendChild(rG3);

    const rlSel = selectOf(Object.keys(DATA.relics || {}).map(id => [id, DATA.relics[id].name]));
    const rG4 = row();
    rG4.appendChild(el('label', { text: 'Relic' })); rG4.appendChild(rlSel);
    rG4.appendChild(button('GRANT', () => doGrantRelic(rlSel.value)));
    sGrant.appendChild(rG4);
    wrap.appendChild(sGrant);

    // God / kill all
    const sGod = section('GOD MODE / KILL ALL');
    const rGod = row();
    rGod.appendChild(button('TOGGLE GOD MODE', doGod));
    rGod.appendChild(button('KILL ALL', doKillAll, 'mbmdt-danger'));
    sGod.appendChild(rGod);
    wrap.appendChild(sGod);

    // Overlays
    const sOv = section('SHOW OVERLAYS');
    const ovDefs = [
      ['hitPlayer', 'Player hitbox'], ['hitEnemy', 'Enemy hitboxes'], ['hitProp', 'Prop hitboxes'],
      ['hitShot', 'Shot hitboxes'], ['roomBounds', 'Room bounds'], ['doorZones', 'Door zones'],
      ['spawnMarkers', 'Spawn markers'], ['enemyCount', 'Enemy count'],
    ];
    for (const [key, label] of ovDefs) {
      const wrapRow = el('label', { cls: 'mbmdt-check' });
      const cb = el('input', { attrs: { type: 'checkbox' } });
      cb.checked = DT.overlays[key];
      cb.addEventListener('change', () => { DT.overlays[key] = cb.checked; });
      wrapRow.appendChild(cb);
      wrapRow.appendChild(document.createTextNode(label));
      sOv.appendChild(wrapRow);
    }
    wrap.appendChild(sOv);

    // Stat readout
    const sStat = section('LIVE STAT READOUT');
    sStat.appendChild(el('div', { attrs: { id: 'mbmdt-stats' } }));
    wrap.appendChild(sStat);

    return wrap;
  }

  // ---- Tier 2 tab ---------------------------------------------------------
  function buildTuneTab() {
    const wrap = el('div');

    // Enemies
    const sE = section('ENEMIES');
    sE.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Applies now: DATA changes immediately, and every matching enemy already on the field is rescaled the same proportion, right away.' }));
    for (const id in DATA.enemies) {
      const r = row();
      r.appendChild(el('label', { text: titleCase(id), attrs: { style: 'min-width:90px' } }));
      for (const f of ENEMY_FIELDS) {
        const inp = numberInput(DATA.enemies[id][f], 0, null, f === 'dmg' || f === 'hp' ? 1 : 0.1, v => applyEnemyField(id, f, v));
        inp.title = f;
        inp.style.width = '48px';
        r.appendChild(el('span', { text: f + ':', attrs: { style: 'color:#5d6370;font-size:9px' } }));
        r.appendChild(inp);
      }
      sE.appendChild(r);
    }
    sE.appendChild(button('RESET ENEMIES', resetEnemiesUI));
    sE.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Reset restores DATA for every future spawn. Anything already standing in the room keeps the numbers it was last given until the room turns over.' }));
    wrap.appendChild(sE);

    // Weapons
    const sW = section('WEAPONS');
    sW.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Applies now to weapons you already hold (stats recomputed immediately) and to every future pickup.' }));
    for (const id in DATA.weapons) {
      const def = DATA.weapons[id];
      const box = el('div', { attrs: { style: 'margin-bottom:8px;border-bottom:1px solid #1f242e;padding-bottom:6px' } });
      box.appendChild(el('div', { text: def.name, attrs: { style: 'color:#e8e0cc;font-weight:bold;margin-bottom:3px' } }));
      const baseRow = row();
      baseRow.appendChild(el('span', { text: 'base', attrs: { style: 'color:#5d6370;min-width:32px' } }));
      for (const f in def.base) {
        const inp = numberInput(def.base[f], null, null, 0.01, v => applyWeaponBaseField(id, f, v));
        inp.style.width = '54px';
        baseRow.appendChild(el('span', { text: f, attrs: { style: 'color:#5d6370;font-size:9px' } }));
        baseRow.appendChild(inp);
      }
      box.appendChild(baseRow);
      def.levels.forEach((lvl, i) => {
        const lr = row();
        lr.appendChild(el('span', { text: 'lv' + (i + 2), attrs: { style: 'color:#5d6370;min-width:32px' } }));
        for (const f in lvl) {
          if (f === 'text') continue;
          const inp = numberInput(lvl[f], null, null, 0.01, v => applyWeaponLevelField(id, i, f, v));
          inp.style.width = '54px';
          lr.appendChild(el('span', { text: f, attrs: { style: 'color:#5d6370;font-size:9px' } }));
          lr.appendChild(inp);
        }
        box.appendChild(lr);
      });
      sW.appendChild(box);
    }
    sW.appendChild(button('RESET WEAPONS', () => { resetWeapons(); rebuildTuneTab(); }));
    wrap.appendChild(sW);

    // Passive magnitudes
    const sP = section('PATCH MAGNITUDES (per level)');
    sP.appendChild(el('div', { cls: 'mbmdt-hint', text: 'DATA.passives only stores the description text; the real number is a constant inside recalc() in game.js. This mirrors that formula so it can stay tunable without editing that file. Applies immediately (recalculated on change).' }));
    const fullPassivesForMag = fullTable('passives');
    for (const id in PASSIVE_MAG_DEFAULTS) {
      const r = row();
      const def = fullPassivesForMag[id];
      r.appendChild(el('label', { text: (def && def.name) || id, attrs: { style: 'min-width:120px' } }));
      const inp = numberInput(DT.tuning.passiveMag[id], null, null, 0.01, v => applyPassiveMagChange(id, v));
      r.appendChild(inp);
      sP.appendChild(r);
    }
    sP.appendChild(button('RESET PATCH MAGNITUDES', () => { resetPassiveMag(); rebuildTuneTab(); }));
    wrap.appendChild(sP);

    // XP curve
    const sX = section('XP CURVE (DATA.xpNext)');
    sX.appendChild(el('div', { cls: 'mbmdt-hint', text: 'xpNext(level) = floor(base + level*lin + level^curveExp * curveMul). Applies immediately, including the bar you are currently filling.' }));
    const xpFields = [['base', 'Base'], ['lin', 'Linear'], ['curveMul', 'Curve mult'], ['curveExp', 'Curve exp']];
    for (const [key, label] of xpFields) {
      const r = row();
      r.appendChild(el('label', { text: label }));
      r.appendChild(numberInput(DT.tuning.xp[key], null, null, 0.1, v => { DT.tuning.xp[key] = v; applyXpCurve(true); }));
      sX.appendChild(r);
    }
    sX.appendChild(button('RESET XP CURVE', () => { resetXpCurve(); rebuildTuneTab(); }));
    wrap.appendChild(sX);

    // Spawn pacing
    const sS = section('SPAWN PACING');
    sS.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Two different dials. The top two feed DATA.spawnInterval/spawnBatch, which only the legacy open-field director reads (not used by a normal room-by-room night). The release rate below is real: it is how fast the room you are standing in trickles a queued wave onto the field, live.' }));
    const spFields = [['intervalBase', 'Interval base'], ['intervalSlope', 'Interval slope'], ['intervalFloor', 'Interval floor'], ['batchBase', 'Batch base'], ['batchSlope', 'Batch slope']];
    for (const [key, label] of spFields) {
      const r = row();
      r.appendChild(el('label', { text: label }));
      r.appendChild(numberInput(DT.tuning.spawnPacing[key], null, null, 0.01, v => { DT.tuning.spawnPacing[key] = v; applySpawnPacing(true); }));
      sS.appendChild(r);
    }
    const rr = row();
    rr.appendChild(el('label', { text: 'Release rate (s)' }));
    rr.appendChild(numberInput(DT.tuning.roomRelease, 0.01, 2, 0.01, v => applyRoomReleaseRate(v)));
    sS.appendChild(rr);
    sS.appendChild(button('RESET SPAWN PACING', () => { resetSpawnPacing(); resetRoomReleaseRate(); rebuildTuneTab(); }));
    wrap.appendChild(sS);

    // Bosses
    const sB = section('BOSSES');
    sB.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Applies now: DATA and any live boss of that kind are both updated immediately (current HP is rescaled by the same proportion, never healed above the new max).' }));
    DATA.bosses.forEach((b, i) => {
      const r = row();
      r.appendChild(el('label', { text: b.name, attrs: { style: 'min-width:100px' } }));
      r.appendChild(el('span', { text: 'hp', attrs: { style: 'color:#5d6370;font-size:9px' } }));
      r.appendChild(numberInput(b.hp, 1, null, 10, v => applyBossField(i, 'hp', v)));
      r.appendChild(el('span', { text: 'dmg', attrs: { style: 'color:#5d6370;font-size:9px' } }));
      r.appendChild(numberInput(b.dmg, 0, null, 1, v => applyBossField(i, 'dmg', v)));
      sB.appendChild(r);
    });
    sB.appendChild(button('RESET BOSSES', () => { resetBosses(); rebuildTuneTab(); }));
    wrap.appendChild(sB);

    // Layout reload
    const sR = section('RELOAD LAYOUTS (js/rooms.js)');
    sR.appendChild(el('div', { cls: 'mbmdt-hint', text: 'Re-fetches js/rooms.js from the server, cache busted, and re-enters the room you are standing in with the fresh data. The run itself is untouched: same act, same room slot, same build. If the new file fails to parse or the room you are in no longer exists in it, nothing changes and the reason is shown below.' }));
    sR.appendChild(button('RELOAD LAYOUTS', () => { reloadLayouts(); }));
    sR.appendChild(el('div', { attrs: { id: 'mbmdt-reload-status', style: 'margin-top:6px;font-size:11px' } }));
    wrap.appendChild(sR);

    // Export
    const sExp = section('EXPORT CHANGES');
    sExp.appendChild(button('EXPORT', doExport));
    sExp.appendChild(el('textarea', { attrs: { id: 'mbmdt-export-text', readonly: 'readonly' } }));
    wrap.appendChild(sExp);

    return wrap;
  }

  function resetEnemiesUI() {
    resetEnemies();
    rebuildTuneTab();
  }

  let tuneTabWrap = null;
  function rebuildTuneTab() {
    if (!tuneTabWrap) return;
    tuneTabWrap.innerHTML = '';
    tuneTabWrap.appendChild(buildTuneTab());
  }

  function refreshSaveBanner() {
    const b = document.getElementById('mbmdt-savebanner');
    if (!b) return;
    b.classList.toggle('on', DT.dirty);
    if (DT.dirty) b.textContent = 'DEV TOOLS USED THIS SESSION -- SAVES DISABLED UNTIL YOU RELOAD THE PAGE';
  }

  function buildPanel() {
    injectStyle();
    const root = el('div', { attrs: { id: 'mbmdt-root' } });

    const head = el('div', { attrs: { id: 'mbmdt-head' } });
    head.appendChild(el('b', { text: 'DEV TOOLS' }));
    head.appendChild(button('CLOSE (`)', () => setOpen(false)));
    root.appendChild(head);

    root.appendChild(el('div', { attrs: { id: 'mbmdt-savebanner' } }));

    const tabs = el('div', { attrs: { id: 'mbmdt-tabs' } });
    const liveBtn = el('button', { text: 'LIVE', cls: 'mbmdt-tabbtn on' });
    const tuneBtn = el('button', { text: 'TUNE', cls: 'mbmdt-tabbtn' });
    tabs.appendChild(liveBtn); tabs.appendChild(tuneBtn);
    root.appendChild(tabs);

    const body = el('div', { attrs: { id: 'mbmdt-body' } });
    const liveWrap = buildLiveTab();
    tuneTabWrap = el('div', { cls: 'mbmdt-hide' });
    tuneTabWrap.appendChild(buildTuneTab());
    body.appendChild(liveWrap);
    body.appendChild(tuneTabWrap);

    liveBtn.addEventListener('click', () => {
      liveBtn.classList.add('on'); tuneBtn.classList.remove('on');
      liveWrap.classList.remove('mbmdt-hide'); tuneTabWrap.classList.add('mbmdt-hide');
    });
    tuneBtn.addEventListener('click', () => {
      tuneBtn.classList.add('on'); liveBtn.classList.remove('on');
      tuneTabWrap.classList.remove('mbmdt-hide'); liveWrap.classList.add('mbmdt-hide');
    });

    root.appendChild(body);
    root.appendChild(el('div', { attrs: { id: 'mbmdt-status' } }));

    document.body.appendChild(root);
    panelRoot = root;
  }

  function setOpen(open) {
    DT.open = open;
    if (!panelRoot) buildPanel();
    panelRoot.classList.toggle('mbmdt-open', open);
    if (open) { startStatPolling(); refreshSaveBanner(); } else { stopStatPolling(); }
  }

  // =========================================================================
  // The open key. Backquote: read every gameplay key binding in js/ui.js and
  // js/touch.js first (WASD/arrows move, Space/Shift dodge, Q skill, E
  // interact/shop, M mute, F fullscreen, P pause, J/B/C camp actions, Escape,
  // Digit1-3, R retry, Enter) and Backquote is bound to nothing anywhere in
  // this game, on any screen. It also sits off to the side of the keyboard,
  // away from WASD and the arrows, so a stray finger during play cannot hit
  // it by accident the way a key inside the movement cluster could.
  // =========================================================================
  function installOpenKey() {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Backquote') return;
      const t = e.target;
      const inOwnPanel = t && typeof t.closest === 'function' && t.closest('#mbmdt-root');
      const inGameField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && !inOwnPanel;
      if (inGameField) return; // typing a camp transfer code, leave it alone
      e.preventDefault();
      setOpen(!DT.open);
    });
  }

  // =========================================================================
  // Boot
  // =========================================================================
  function boot() {
    installSaveGuards();
    installPauseHook();
    installPassiveMagnitudes();
    installXpCurve();
    installSpawnPacing();
    installRoomReleaseRate();
    snapshotEnemiesWeaponsBosses();
    installOpenKey();
    requestAnimationFrame(drawOverlays);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
