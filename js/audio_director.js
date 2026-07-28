// Merit Badge Massacre: turns game events into music and voice cues, so the
// sim never has to know what a stinger is.
//
// A pure observer. Nothing else in the game emits events at this file: every
// frame it looks at the shape of `g` (room, phase, act, activeBoss, enemies,
// player) and the shape of `g` alone, notices what changed since the last
// frame, and drives js/music.js (Music.goto/setHeat/setPhase/stop) plus the
// legacy procedural fallback (AudioSys.setIntensity) from that. With no music
// stems loaded, Music.goto/setHeat/setPhase/stop are recorded no ops (they
// still update Music.state, just make no sound), so a build with no assets/
// folder behaves exactly as it did before this file existed.
'use strict';

const AudioDirector = (() => {
  // =====================================================================
  // Tables
  // =====================================================================

  // Which boss theme (js/music.js STATE table, "boss.<id>") a spawned boss's
  // e.kind maps to. e.kind is DATA.bosses[].id (director.js: spawnBoss sets
  // kind: def.id). The old vicar boss pattern is retired as an elite move
  // now (director.js: "the old vicar pattern is an elite move now"), so it
  // never reaches this file as an activeBoss and is deliberately left out.
  // A kind with no entry here is a boss with no baked theme yet: the fight
  // keeps whatever act theme was already playing rather than dropping to
  // silence or guessing.
  const BOSS_THEME = {
    hare: 'bramblebuck',
    antlered: 'oldnobody',
    mole: 'mawmole',
    behind: 'behind',
  };

  // Heat shape (see the update() heat block below for the formula itself).
  const HEAT_RADIUS = 420;
  const HEAT_RADIUS2 = HEAT_RADIUS * HEAT_RADIUS;
  const HEAT_DENSITY_N = 16;
  const HEAT_MASS_SUM = 700;
  const HEAT_PERIL_HP = 0.6;      // peril only kicks in below this hp fraction
  const HEAT_PERIL_SPAN = 0.4;
  const HEAT_ATTACK_TAU = 0.45;   // heat rising
  const HEAT_RELEASE_TAU = 2.6;   // heat falling
  const BOSS_FLOOR_BASE = 0.6;
  const BOSS_FLOOR_PER_PHASE = 0.2;

  const BOSS_RETURN_BEATS = 2;    // gap after a boss dies before the act theme returns
  const FALLBACK_BEAT_SEC = 0.5;  // 120bpm, only used while nothing is loaded to measure

  // =====================================================================
  // Small helpers
  // =====================================================================
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function musicSys() { return (typeof Music !== 'undefined' && Music) ? Music : null; }
  function audioSys() { return (typeof AudioSys !== 'undefined' && AudioSys) ? AudioSys : null; }

  // The beat length of whatever Music is currently playing, so the post-boss
  // gap is musical when stems are loaded and merely a short, harmless pause
  // when they are not (Music.goto/stop are no ops either way).
  function beatSeconds() {
    const m = musicSys();
    if (!m) return FALLBACK_BEAT_SEC;
    try {
      const d = m.debug();
      if (d && d.current && d.themes) {
        for (let i = 0; i < d.themes.length; i++) {
          if (d.themes[i].id === d.current.theme && d.themes[i].beatSeconds > 0) {
            return d.themes[i].beatSeconds;
          }
        }
      }
    } catch (e) { /* verification stubs, or a Music shape we do not know: fall back */ }
    return FALLBACK_BEAT_SEC;
  }

  // =====================================================================
  // State: everything this file remembers between frames. Module scoped, so
  // it survives across Game instances (retry, new run) exactly as Music's own
  // state does; every field it carries is reset on the edges that matter
  // (a fresh room, the run ending) rather than on construction.
  // =====================================================================
  const st = {
    clock: 0,             // running total of dt, only for timestamping notes
    gamePhase: undefined, // last seen g.phase
    room: undefined,      // last seen g.room (identity, not contents)
    ended: false,          // Music already stopped for this run's ending
    boss: null,            // { ref, kind, phase } while a boss is up, else null
    bossReturnT: null,     // seconds left before the act theme reclaims the fight
    bossReturnAct: null,
    heat: 0,               // smoothed 0..1
    requestedState: 'silence', // last state id actually asked of Music
    last: null,             // { state, reason, t } for debug()
  };

  function note(reason) {
    st.last = { state: st.requestedState, reason: reason, t: st.clock };
  }

  // The one place that ever calls into Music to change what is playing, so
  // every request is remembered the same way for debug()/verification.
  function request(id, opt, reason) {
    st.requestedState = id;
    const m = musicSys();
    if (id === 'silence') { if (m) m.stop(opt); }
    else if (m) m.goto(id, opt);
    note(reason);
  }

  function clearBoss() {
    st.boss = null;
    st.bossReturnT = null;
    st.bossReturnAct = null;
  }

  // =====================================================================
  // update(g, dt): call once per frame, from any g.phase. Watches g for
  // whatever changed since last time and reacts. Safe to call with a g that
  // has no room system in play (g.room stays null): it simply never fires a
  // room transition, exactly like the field game never built one.
  // =====================================================================
  function update(g, dt) {
    if (!g) return;
    dt = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? dt : 0;
    st.clock += dt;

    const gp = g.phase;

    // ---- run-ending edges: death, dawn/win -----------------------------
    if (gp !== st.gamePhase) {
      if (gp === 'dying') {
        request('silence', { fade: 0.25 }, 'phase:dying');
        st.ended = true;
        clearBoss();
      } else if ((gp === 'dawn' || gp === 'win') && !st.ended) {
        request('silence', { fade: 1.2 }, 'phase:' + gp);
        st.ended = true;
        clearBoss();
      } else if (gp === 'play' && st.gamePhase !== undefined) {
        // A fresh run (retry, new game) come back around to 'play': let the
        // next room entry and boss spawn pick the score back up.
        st.ended = false;
      }
      st.gamePhase = gp;
    }

    // ---- room entry -----------------------------------------------------
    // g.room is a new Room instance every time the run advances (run.js
    // Run.advance builds `new Room(...)` and stamps it straight onto g), so
    // identity is exactly "did the player just walk into somewhere new".
    if (gp === 'play' && g.room !== st.room) {
      st.room = g.room;
      st.ended = false;
      st.bossReturnT = null;
      clearBoss();
      if (g.room) {
        const type = g.room.def && g.room.def.type;
        const act = g.act || g.room.act || 1;
        if (type === 'shop' || type === 'rest') {
          request('camp', null, 'room:' + type);
        } else if (type === 'lore') {
          request('silence', { fade: 1.5 }, 'room:lore');
        } else {
          // combat, elite, loot, boss, or an untyped/open-field room: the
          // act theme. A boss room's own theme takes over the moment its
          // boss actually spawns, below.
          request('act' + act + '.combat', { sync: 'bar' }, 'room:' + (type || 'combat'));
        }
      }
    }

    // ---- boss lifecycle ---------------------------------------------------
    const boss = gp === 'play' ? (g.activeBoss || null) : null;
    if (boss) {
      if (!st.boss || st.boss.ref !== boss) {
        st.boss = { ref: boss, kind: boss.kind, phase: 1 };
        st.bossReturnT = null;
        const themeId = BOSS_THEME[boss.kind];
        if (themeId) request('boss.' + themeId, { sync: 'beat' }, 'boss:' + boss.kind);
        else note('boss:' + boss.kind + ' (no theme baked, act theme holds)');
      } else {
        const frac = boss.maxhp > 0 ? boss.hp / boss.maxhp : 1;
        const m = musicSys();
        if (st.boss.phase < 2 && frac <= 0.66) {
          st.boss.phase = 2;
          if (m) m.setPhase(2);
          note('boss-phase:2 at ' + frac.toFixed(3));
        }
        if (st.boss.phase < 3 && frac <= 0.33) {
          st.boss.phase = 3;
          if (m) m.setPhase(3);
          note('boss-phase:3 at ' + frac.toFixed(3));
        }
      }
    } else if (st.boss) {
      // The boss that was up a moment ago is gone (dead, or the room/run
      // ended, in which case the ending branch above already cleared it).
      if (gp === 'play') {
        st.bossReturnT = beatSeconds() * BOSS_RETURN_BEATS;
        st.bossReturnAct = g.act;
        note('boss-defeated:' + st.boss.kind);
      }
      st.boss = null;
    }

    if (st.bossReturnT != null) {
      st.bossReturnT -= dt;
      if (st.bossReturnT <= 0) {
        st.bossReturnT = null;
        if (gp === 'play') {
          const act = st.bossReturnAct || g.act || 1;
          request('act' + act + '.combat', { sync: 'beat' }, 'boss-return');
        }
      }
    }

    // ---- heat, and the legacy procedural intensity it feeds -------------
    let raw = 0;
    if (gp === 'play') {
      const p = g.player;
      let near = 0, mass = 0;
      if (p && Array.isArray(g.enemies)) {
        for (let i = 0; i < g.enemies.length; i++) {
          const e = g.enemies[i];
          if (!e || e.dead) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          if (dx * dx + dy * dy <= HEAT_RADIUS2) { near++; mass += (e.w || 0); }
        }
      }
      const density = clamp(near / HEAT_DENSITY_N, 0, 1);
      const massN = clamp(mass / HEAT_MASS_SUM, 0, 1);
      let peril = 0;
      if (p && p.maxhp > 0) {
        const hpFrac = p.hp / p.maxhp;
        if (hpFrac < HEAT_PERIL_HP) peril = clamp((HEAT_PERIL_HP - hpFrac) / HEAT_PERIL_SPAN, 0, 1);
      }
      const bossFloor = st.boss ? (BOSS_FLOOR_BASE + BOSS_FLOOR_PER_PHASE * (st.boss.phase - 1)) : 0;
      raw = Math.max(bossFloor, 0.45 * density + 0.35 * massN + 0.2 * peril);
    }

    const tau = raw > st.heat ? HEAT_ATTACK_TAU : HEAT_RELEASE_TAU;
    if (tau > 0) st.heat += (raw - st.heat) * (1 - Math.exp(-dt / tau));
    st.heat = clamp(st.heat, 0, 1);

    const m = musicSys();
    if (m) m.setHeat(st.heat);
    const a = audioSys();
    if (a) a.setIntensity(Math.round(st.heat * 3));
  }

  function debug() {
    const m = musicSys();
    return {
      gamePhase: st.gamePhase,
      requestedState: st.requestedState,
      room: (st.room && st.room.def && st.room.def.type) || (st.room ? 'room' : null),
      boss: st.boss ? { kind: st.boss.kind, phase: st.boss.phase } : null,
      bossReturnT: st.bossReturnT,
      heat: st.heat,
      intensity: Math.round(st.heat * 3),
      musicState: m ? m.state : null,
      last: st.last,
    };
  }

  return { update: update, debug: debug };
})();
