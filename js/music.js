// Merit Badge Massacre: the music layer. AudioSys still owns every sound the
// 1.0 game makes; this takes over when the tracks land.
//
// What this is: a layered stem player. tools/render bakes each theme into
// several files that are all exactly the same length, and the game plays all of
// a theme's layers at once, locked to one scheduled start, and moves their
// gains around instead of switching tracks. Heat opens the layers, phase
// unmutes the boss layers, goto crossfades whole themes on the bar.
//
// What this is not: a replacement for the procedural scheduler in js/audio.js.
// With no stems loaded every call here does nothing at all, so a build with no
// assets/ folder behaves exactly as it does today. The moment real stems are
// loaded Music takes over, and it stops the old scheduler before its first note
// so the two never play over each other. If Music is live but a particular
// theme was never rendered, it hands that state back to the old scheduler
// rather than going quiet.
'use strict';

const Music = (() => {
  // =====================================================================
  // Tables and tunables
  // =====================================================================

  // State ids the game (js/audio_director.js) will speak, and the themes each
  // one wants, best first. A state falls down its list until it finds a theme
  // that actually has stems loaded, so a half rendered soundtrack still plays:
  // act3.combat with only act1 baked lands on act1 rather than on silence. If
  // nothing in the list is loaded the state falls all the way through to the
  // procedural scheduler in js/audio.js.
  const STATE = {
    'silence':     [],
    'title':       ['title', 'camp'],
    'camp':        ['camp'],
    'act1.combat': ['act1'],
    'act1.boss':   ['act1'],
    'act2.combat': ['act2', 'act1'],
    'act2.boss':   ['act2', 'act1'],
    'act3.combat': ['act3', 'act2', 'act1'],
    'act3.boss':   ['act3', 'act2', 'act1'],
  };

  // Boss themes are named after the boss, not after the act, because which
  // boss ends an act is rolled per run (js/run.js picks from DATA.bossTiers),
  // so no table could name it ahead of time. The caller names it instead:
  // goto('boss.bramblebuck'), goto('boss.mawmole'), goto('boss.behind'),
  // goto('boss.oldnobody'). A boss theme whose stems are not baked yet leaves
  // the act theme playing rather than dropping the fight into the procedural
  // scheduler mid swing. Boss themes carry base plus p2 and p3, which is what
  // setPhase drives.
  const BOSS_PREFIX = 'boss.';

  // Heat windows, overlapping on purpose: l1 is already all the way in before
  // l2 starts, but l2 and l3 are close enough that the middle of the fight is
  // always a mix rather than a staircase. Below the low edge a layer is silent,
  // above the high edge it is fully in, between them it rides a smoothstep.
  const HEAT_WINDOW = {
    l1: [0.10, 0.30],
    l2: [0.32, 0.55],
    l3: [0.62, 0.85],
  };

  // Boss layers. Not heat driven: they are off until the fight reaches that
  // phase, and then they come in on the next bar line and stay.
  const PHASE_LAYER = { p2: 2, p3: 3 };

  // Every other layer id (base, and camp's warm) is simply always on.

  // Stingers are baked by the same harness as everything else, so a cue lives
  // at music/sting_<cueId>.<hash8>.webm: theme "sting", layer <cueId>.
  const STINGER_THEME = 'sting';

  const DEFAULT_SR = 48000;          // what tools/render/encode.cjs writes
  const DEFAULT_BEATS_PER_BAR = 4;
  const LOOKAHEAD = 0.06;            // scheduling margin, seconds
  const DEFAULT_FADE = 1.2;          // crossfade seconds
  const HEAT_TAU = 0.22;             // setTargetAtTime tau for heat moves
  const PHASE_TAU = 0.05;            // phase layers snap in harder
  const STINGER_SNAP = 0.14;         // quantize a stinger only inside this
  const FADE_STEPS = 24;             // segments per equal power fade
  const DECODE_PARALLEL = 4;
  const MUSIC_DIR = 'music/';

  // music/<theme>_<layer>.<hash8>.webm. Theme and layer ids never contain an
  // underscore (js/music/src/README.md makes that a hard rule) so the split is
  // unambiguous. The hash and the extension are both tolerated loosely so a
  // hand dropped file still plays.
  const FILE_RE = /^music\/([^_/]+)_([^./]+)(?:\.([0-9a-fA-F]{6,}))?\.(webm|ogg|mp3|m4a|wav)$/;

  // =====================================================================
  // Small helpers
  // =====================================================================
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function smoothstep(a, b, x) {
    if (!(b > a)) return x >= b ? 1 : 0;
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function num(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : null; }

  function norm(p) {
    let s = String(p == null ? '' : p).replace(/\\/g, '/').replace(/^\.\//, '');
    while (s.charAt(0) === '/') s = s.slice(1);
    if (s.indexOf('assets/') === 0) s = s.slice(7);
    return s;
  }

  function sys() { return (typeof AudioSys !== 'undefined' && AudioSys) ? AudioSys : null; }
  function assets() { return (typeof Assets !== 'undefined' && Assets) ? Assets : null; }

  const warned = new Set();
  function warnOnce(key, msg) {
    if (warned.has(key)) return;
    warned.add(key);
    try { console.warn('Music: ' + msg); } catch (e) {}
  }

  // =====================================================================
  // Routing
  //
  // js/audio.js keeps ac, master, musicBus, musicDuck, sfxBus, voiceBus and
  // stingerBus in closure scope and exports none of them. Its whole public
  // surface is init, play, cue, hold, poke, setMuted, setVolumes, duck,
  // setListener, emitter, playAt, startMusic, stopMusic, setIntensity, and the
  // getters muted, started and emitterCount. There is no context handle and no
  // bus handle on it.
  //
  // Connecting stems straight to ac.destination would put the music outside
  // mute, outside the music slider and outside the ducking, which is worse than
  // not playing them, so that is not an option. Instead this file installs a one
  // shot capture around the AudioContext constructor at load time. index.html
  // loads audio.js and then music.js, and AudioSys.init() only runs later on the
  // first user gesture, so the capture is always in place first. It records the
  // gain nodes init() builds and the edges between them, then names them from
  // the shape of the graph audio.js documents at the top of itself:
  //
  //   master ------------------------------------> destination
  //   musicBus  -> musicDuck -> master
  //   sfxBus    -> sfxDuck   -> master
  //   voiceBus  -------------> master
  //   stingerBus ------------> master
  //
  // master is the gain connected to ac.destination. Exactly two gains on master
  // have a gain of their own hanging off them: those are the ducks, and the
  // first one built is musicDuck, whose only child is musicBus. Exactly two
  // gains on master are childless: voiceBus then stingerBus, so the stinger bus
  // is the later one. If the recorded graph does not have that shape the capture
  // refuses to guess, Music stays a no op, and the procedural scheduler keeps
  // scoring the game.
  //
  // If a later audio.js exports handles (ctx/context/ac, musicBus, stingerBus,
  // or a buses object), those win and no capture is used. Music.attach(ctx,
  // musicNode, stingerNode) wins over everything, for tests and for an embedder
  // that owns its own graph.
  // =====================================================================
  let ctx = null;            // AudioSys's AudioContext
  let musicOut = null;       // our gain, connected to the music bus
  let musicBusNode = null;   // the AudioSys bus musicOut feeds, for debug()
  let stingerOut = null;     // stinger bus if we found one, else musicOut
  let routeVia = 'none';     // what we ended up using, for debug()

  let capturedCtx = null;
  let capturedGains = null;  // [{ node, to: [] }] in creation order
  let attached = null;       // { ctx, music, stinger } from Music.attach

  const MAX_WATCHED_GAINS = 16;

  function isNode(x) { return !!x && typeof x.connect === 'function'; }

  // Wraps the AudioContext constructor once. The first context anything in the
  // page builds is AudioSys's (js/audio.js is the only file in the game that
  // makes one), and the wrapper takes itself back off immediately after.
  function installCapture() {
    if (typeof window === 'undefined') return;
    ['AudioContext', 'webkitAudioContext'].forEach((name) => {
      const Ctor = window[name];
      if (typeof Ctor !== 'function' || Ctor.__mbmMusicWrap) return;
      const Wrapped = function (options) {
        const c = options === undefined ? new Ctor() : new Ctor(options);
        try { onContext(c); } catch (e) { /* capture is optional, never fatal */ }
        return c;
      };
      Wrapped.__mbmMusicWrap = true;
      Wrapped.prototype = Ctor.prototype;
      try {
        Object.defineProperty(Wrapped, 'name', { value: name });
        window[name] = Wrapped;
        Wrapped.__mbmOriginal = Ctor;
      } catch (e) { /* frozen window: no capture, Music stays a no op */ }
    });
  }

  function uninstallCapture() {
    if (typeof window === 'undefined') return;
    ['AudioContext', 'webkitAudioContext'].forEach((name) => {
      const cur = window[name];
      if (cur && cur.__mbmMusicWrap && cur.__mbmOriginal) {
        try { window[name] = cur.__mbmOriginal; } catch (e) {}
      }
    });
  }

  function onContext(c) {
    uninstallCapture();          // one shot: later contexts are none of our business
    if (capturedCtx) return;
    capturedCtx = c;
    watchGains(c);
  }

  // Records the gains AudioSys.init() builds, and who each one connects to.
  // Stops the moment AudioSys reports started, which init() sets after the last
  // bus is wired, so the recording is exactly the bus graph and never the
  // thousands of little gains play() and emitter() make afterwards.
  function watchGains(c) {
    const original = c.createGain;
    if (typeof original !== 'function') return;
    const recs = [];
    capturedGains = recs;
    c.createGain = function () {
      const s = sys();
      if ((s && s.started) || recs.length >= MAX_WATCHED_GAINS) {
        c.createGain = original;
        return original.call(c);
      }
      const g = original.call(c);
      const rec = { node: g, to: [] };
      recs.push(rec);
      const connect = g.connect;
      g.connect = function (dest) {
        rec.to.push(dest);
        return connect.apply(g, arguments);
      };
      return g;
    };
  }

  function unwatchGains() {
    if (!capturedGains) return;
    capturedGains.forEach((rec) => {
      try { delete rec.node.connect; } catch (e) {}
    });
  }

  // Names the buses from the recorded graph. Returns null unless the shape
  // matches what audio.js documents, so a rewritten graph fails closed.
  function namedBuses(c, recs) {
    if (!c || !recs || recs.length < 7) return null;
    const kidsOf = (node) => recs.filter((r) => r.to.indexOf(node) >= 0);
    const master = recs.filter((r) => r.to.indexOf(c.destination) >= 0)[0];
    if (!master) return null;
    const onMaster = kidsOf(master.node);
    const ducks = onMaster.filter((r) => kidsOf(r.node).length > 0);
    const leaves = onMaster.filter((r) => kidsOf(r.node).length === 0);
    if (ducks.length !== 2 || leaves.length !== 2) return null;
    const musicBus = kidsOf(ducks[0].node)[0];   // musicDuck is built first
    if (!musicBus) return null;
    return { music: musicBus.node, stinger: leaves[leaves.length - 1].node };
  }

  // Everything below only runs when someone actually wants music, so a game
  // with no stems never even looks for the buses.
  function ensureRoute() {
    if (musicOut) return true;

    let c = null, music = null, sting = null, via = '';

    if (attached && attached.ctx) {
      c = attached.ctx; music = attached.music || null; sting = attached.stinger || null;
      via = 'Music.attach';
    }

    const s = sys();
    if (!c && s) {
      const exported = s.ctx || s.context || s.audioContext || s.ac || null;
      const buses = s.buses || null;
      const m = s.musicBus || (buses && buses.music) || null;
      if (exported && isNode(m)) {
        c = exported; music = m;
        sting = s.stingerBus || (buses && buses.stinger) || null;
        via = 'AudioSys export';
      }
    }

    if (!c && capturedCtx) {
      const found = namedBuses(capturedCtx, capturedGains);
      if (found) {
        c = capturedCtx; music = found.music; sting = found.stinger;
        via = 'captured bus graph';
        unwatchGains();
      } else if (capturedGains && capturedGains.length) {
        warnOnce('shape', 'the AudioSys bus graph does not have the shape music.js knows how to ' +
          'join, so stems stay off and the procedural scheduler keeps playing.');
      }
    }

    if (!c || !isNode(music)) return false;

    try {
      musicOut = c.createGain();
      musicOut.gain.value = 1;
      musicOut.connect(music);
    } catch (e) {
      musicOut = null;
      return false;
    }
    ctx = c;
    musicBusNode = music;
    stingerOut = isNode(sting) ? sting : musicOut;
    routeVia = via + (isNode(sting) ? ' (stinger bus found)' : ' (stingers on the music route)');
    return true;
  }

  // A context has to exist before anything can be decoded. AudioSys.init() is
  // idempotent and swallows its own failures, so asking it for one here is safe
  // even if the game has not seen a gesture yet; the context simply starts
  // suspended and AudioSys.poke() wakes it on the first one.
  function ensureCtx() {
    if (ctx) return ctx;
    if (!ensureRoute()) {
      const s = sys();
      if (s && !s.started) { try { s.init(); } catch (e) {} }
      if (!ensureRoute()) return null;
    }
    return ctx;
  }

  installCapture();

  // =====================================================================
  // The loaded stems
  // =====================================================================
  // themeId -> {
  //   id, bpm, bars, beatsPerBar, sampleRate, samples,
  //   loopSeconds, barSeconds, beatSeconds,
  //   layers: [{ id, role, path, buffer, samples, sampleRate, loopEnd }]
  // }
  const themes = new Map();
  const decoded = new Map();   // path -> AudioBuffer, so a reload never re-decodes
  let loading = null;

  function roleOf(layerId) {
    if (HEAT_WINDOW[layerId]) return 'heat';
    if (PHASE_LAYER[layerId]) return 'phase';
    return 'always';
  }

  function manifest() {
    const a = assets();
    return (a && a.manifest) || null;
  }

  // Every music file the manifest knows about, whether or not its bytes are in
  // yet, with whatever metadata the entry carries.
  function musicEntries() {
    const man = manifest();
    const files = man && man.files;
    const out = [];
    if (!files) return out;
    const take = (rawPath, meta) => {
      const path = norm(rawPath);
      const m = FILE_RE.exec(path);
      if (!m) return;
      out.push({
        path: path,
        theme: m[1],
        layer: m[2],
        meta: (meta && typeof meta === 'object') ? meta : null,
      });
    };
    if (Array.isArray(files)) {
      files.forEach((e) => {
        if (typeof e === 'string') take(e, null);
        else if (e && e.path) take(e.path, e);
      });
    } else if (typeof files === 'object') {
      Object.keys(files).forEach((k) => take(k, files[k]));
    }
    return out;
  }

  // The sample count is the one thing the audio file itself cannot tell us:
  // Opus pads and delays, so buffer.duration is longer than the music. The
  // harness records the true count (tools/render/encode.cjs writes
  // out/samplecounts.json) and the manifest carries it through. This reads it
  // from every shape the manifest could reasonably use, and never guesses a bpm.
  function metaFor(themeId, entries) {
    const man = manifest() || {};
    const meta = { bpm: null, bars: null, beatsPerBar: null, sampleRate: null, samples: null };
    const fill = (src) => {
      if (!src || typeof src !== 'object') return;
      ['bpm', 'bars', 'beatsPerBar', 'sampleRate', 'samples'].forEach((k) => {
        if (meta[k] == null) meta[k] = num(src[k]);
      });
    };
    fill(man.music && man.music.themes && man.music.themes[themeId]);
    fill(man.themes && man.themes[themeId]);
    fill(man.music && man.music[themeId]);
    entries.forEach((e) => fill(e.meta));
    return meta;
  }

  function buildTheme(themeId, entries) {
    const meta = metaFor(themeId, entries);
    const beatsPerBar = meta.beatsPerBar || DEFAULT_BEATS_PER_BAR;
    const sr = meta.sampleRate || DEFAULT_SR;

    const layers = [];
    entries.forEach((e) => {
      const buffer = decoded.get(e.path);
      if (!buffer) return;
      const lsr = (e.meta && num(e.meta.sampleRate)) || sr;
      const samples = (e.meta && num(e.meta.samples)) || meta.samples;
      // seconds, not frames: the decoder resamples to the context rate, so the
      // sample count only means anything against the rate it was written at.
      let loopEnd = samples ? samples / lsr : buffer.duration;
      if (loopEnd > buffer.duration + 1e-6) {
        warnOnce('loop:' + e.path, e.path + ' claims ' + samples + ' samples at ' + lsr +
          ' Hz but only decoded to ' + buffer.duration.toFixed(6) + 's, looping the whole buffer.');
        loopEnd = buffer.duration;
      }
      if (!samples) {
        warnOnce('nosamples:' + themeId, 'theme "' + themeId + '" has no sample count in the ' +
          'manifest, so its loop point is the decoded length and may drift. Merge ' +
          'tools/render/out/samplecounts.json into assets/manifest.json.');
      }
      layers.push({
        id: e.layer,
        role: roleOf(e.layer),
        path: e.path,
        buffer: buffer,
        samples: samples,
        sampleRate: lsr,
        loopEnd: loopEnd,
      });
    });
    if (!layers.length) return null;

    // base first, then the rest by id, so debug output reads in a sane order.
    layers.sort((a, b) => (a.id === 'base' ? -1 : b.id === 'base' ? 1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));

    const loopSeconds = layers[0].loopEnd;
    // The bar grid is derived from the loop, not from the bpm, so it can never
    // drift away from the audio: the render rounds bars * beats * 60/bpm * sr to
    // whole samples once, and dividing that back by the bar count lands on the
    // same grid the music was written to. bpm is only the fallback if the
    // manifest carries a tempo but no bar count.
    let barSeconds = 0;
    if (meta.bars && loopSeconds > 0) barSeconds = loopSeconds / meta.bars;
    else if (meta.bpm) barSeconds = beatsPerBar * (60 / meta.bpm);
    if (!(barSeconds > 0)) {
      warnOnce('nogrid:' + themeId, 'theme "' + themeId + '" has no bars or bpm in the manifest, ' +
        'so bar and beat syncing fall back to starting immediately.');
    }

    return {
      id: themeId,
      bpm: meta.bpm,
      bars: meta.bars,
      beatsPerBar: beatsPerBar,
      sampleRate: sr,
      samples: meta.samples,
      loopSeconds: loopSeconds,
      barSeconds: barSeconds,
      beatSeconds: barSeconds > 0 ? barSeconds / beatsPerBar : 0,
      layers: layers,
    };
  }

  function decodeOne(path) {
    if (decoded.has(path)) return Promise.resolve(true);
    const a = assets();
    const bytes = a && a.get(path);
    if (!bytes) return Promise.resolve(false);
    // decodeAudioData detaches the ArrayBuffer it is handed, and Assets keeps
    // that same buffer in its store, so it always gets a copy.
    let copy;
    try { copy = bytes.slice(0); } catch (e) { return Promise.resolve(false); }
    return new Promise((resolve) => {
      const ok = (buf) => { decoded.set(path, buf); resolve(true); };
      const bad = () => { warnOnce('decode:' + path, 'could not decode ' + path); resolve(false); };
      let p = null;
      try { p = ctx.decodeAudioData(copy, ok, bad); } catch (e) { bad(); return; }
      if (p && typeof p.then === 'function') p.then(ok, bad);
    });
  }

  function decodeAll(paths) {
    let next = 0;
    const worker = () => {
      if (next >= paths.length) return Promise.resolve();
      return decodeOne(paths[next++]).then(worker);
    };
    const crew = [];
    for (let i = 0; i < Math.min(DECODE_PARALLEL, paths.length); i++) crew.push(worker());
    return Promise.all(crew);
  }

  // Which asset groups have to come down for the themes we want. Derived from
  // the manifest rather than hardcoded, so a new group name needs no change here.
  function groupsHolding(themeIds) {
    const man = manifest();
    const groups = man && man.groups;
    if (!groups) return [];
    const out = [];
    Object.keys(groups).forEach((name) => {
      const raw = groups[name];
      const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : []);
      const hit = list.some((entry) => {
        const p = norm(entry);
        if (p.indexOf('*') >= 0) return p.indexOf(MUSIC_DIR) === 0 || p.indexOf('*') === 0;
        const m = FILE_RE.exec(p);
        return !!m && (!themeIds || themeIds.indexOf(m[1]) >= 0);
      });
      if (hit) out.push(name);
    });
    return out;
  }

  function splitRequest(what) {
    const man = manifest();
    const groups = (man && man.groups) || {};
    const list = what == null ? [] : (Array.isArray(what) ? what : [what]);
    const groupNames = [], themeIds = [];
    list.forEach((raw) => {
      const id = String(raw || '').trim();
      if (!id) return;
      if (Object.prototype.hasOwnProperty.call(groups, id)) groupNames.push(id);
      else themeIds.push(id);
    });
    return { groupNames, themeIds };
  }

  // Music.load: fetch the stems for a group or a set of themes, decode them,
  // and register the themes. Always resolves, never throws, and a build with no
  // assets/ folder simply resolves with nothing loaded.
  function load(what, onProgress) {
    if (loading) return loading.then(() => load(what, onProgress));
    const a = assets();
    if (!a) return Promise.resolve(summary([]));

    loading = a.loadManifest().then(() => {
      const req = splitRequest(what);
      const wantThemes = req.themeIds.length ? req.themeIds : null;
      const names = req.groupNames.length ? req.groupNames : groupsHolding(wantThemes);
      let chain = Promise.resolve();
      names.forEach((n) => { chain = chain.then(() => a.loadGroup(n, onProgress)); });
      return chain;
    }).then(() => {
      const req = splitRequest(what);
      const wantThemes = req.themeIds.length ? req.themeIds : null;
      const entries = musicEntries().filter((e) => {
        if (e.theme === STINGER_THEME) return a.has(e.path);
        if (wantThemes && wantThemes.indexOf(e.theme) < 0) return false;
        return a.has(e.path);
      });
      if (!entries.length) return summary([]);
      if (!ensureCtx()) {
        warnOnce('noctx', 'no audio context or music bus to play stems through, ' +
          'leaving the music to the procedural scheduler.');
        return summary([]);
      }
      return decodeAll(entries.map((e) => e.path)).then(() => {
        const byTheme = new Map();
        entries.forEach((e) => {
          if (!byTheme.has(e.theme)) byTheme.set(e.theme, []);
          byTheme.get(e.theme).push(e);
        });
        const added = [];
        byTheme.forEach((list, id) => {
          const theme = buildTheme(id, list);
          if (theme) { themes.set(id, theme); added.push(id); }
        });
        return summary(added);
      });
    }).catch((e) => {
      warnOnce('load', 'load failed, staying on the procedural scheduler (' + e + ')');
      return summary([]);
    }).then((res) => { loading = null; return res; });

    return loading;
  }

  function summary(added) {
    let layers = 0;
    themes.forEach((t) => { layers += t.layers.length; });
    return { themes: Array.from(themes.keys()), added: added, layers: layers };
  }

  // Music only takes the wheel once something is actually loaded. Stingers on
  // their own do not count: they are a garnish, not a score.
  function playable() {
    let n = 0;
    themes.forEach((t) => { if (t.id !== STINGER_THEME) n++; });
    return n > 0;
  }

  // =====================================================================
  // Playback
  // =====================================================================
  let state = 'silence';
  let mode = 'off';          // off, stems, procedural
  let heat = 0;
  let phase = 1;
  let current = null;        // the live theme voice
  const outgoing = [];       // voices still fading out

  // A voice: { theme, gain, startTime, fade, layers: [{ id, role, src, gain, loopEnd }] }

  function fadeValueAt(f, t) {
    if (!f) return 1;
    if (!(f.dur > 0)) return f.to;
    if (t <= f.t0) return f.from;
    if (t >= f.t0 + f.dur) return f.to;
    const x = (t - f.t0) / f.dur;
    const s = f.to > f.from ? Math.sin(x * Math.PI / 2) : 1 - Math.cos(x * Math.PI / 2);
    return f.from + (f.to - f.from) * s;
  }

  function cancelHold(param, t) {
    try {
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(t);
      else param.cancelScheduledValues(t);
    } catch (e) {
      try { param.cancelScheduledValues(t); } catch (err) {}
    }
  }

  // Equal power: the rising side follows sin(x * pi/2), the falling side
  // cos(x * pi/2), so the two sum to constant power through the crossfade and
  // the middle does not dip. Written as short linear ramps rather than
  // setValueCurveAtTime because a value curve throws if a second one lands on
  // top of it, and a goto can always interrupt a goto.
  function rampEqualPower(param, from, to, t0, dur) {
    cancelHold(param, t0);
    try { param.setValueAtTime(from, t0); } catch (e) {}
    if (!(dur > 0)) {
      try { param.setValueAtTime(to, t0); } catch (e) {}
      return;
    }
    const rising = to > from;
    for (let i = 1; i <= FADE_STEPS; i++) {
      const x = i / FADE_STEPS;
      const s = rising ? Math.sin(x * Math.PI / 2) : 1 - Math.cos(x * Math.PI / 2);
      try { param.linearRampToValueAtTime(from + (to - from) * s, t0 + dur * x); } catch (e) {}
    }
  }

  function layerTarget(layer) {
    if (layer.role === 'heat') {
      const w = HEAT_WINDOW[layer.id];
      return smoothstep(w[0], w[1], heat);
    }
    if (layer.role === 'phase') return phase >= PHASE_LAYER[layer.id] ? 1 : 0;
    return 1;
  }

  // The next bar or beat line of whatever is playing now. With nothing playing
  // there is no grid to join, so the answer is "as soon as possible". The grid
  // is anchored on the playing theme's own start, and the answer is never
  // earlier than that start, which matters while a theme is scheduled but has
  // not sounded yet.
  function boundary(sync, from) {
    if (sync === 'now' || !current) return from;
    const grid = sync === 'beat' ? current.theme.beatSeconds : current.theme.barSeconds;
    if (!(grid > 0)) return from;
    const earliest = Math.max(from, current.startTime);
    const k = Math.ceil((earliest - current.startTime) / grid - 1e-9);
    return current.startTime + k * grid;
  }

  function retire(voice, at) {
    voice.layers.forEach((l) => {
      try { l.src.stop(at); } catch (e) { try { l.src.stop(); } catch (err) {} }
    });
    const wait = Math.max(0, (at - ctx.currentTime) * 1000) + 250;
    setTimeout(() => {
      voice.layers.forEach((l) => {
        try { l.src.disconnect(); } catch (e) {}
        try { l.gain.disconnect(); } catch (e) {}
      });
      try { voice.gain.disconnect(); } catch (e) {}
      const i = outgoing.indexOf(voice);
      if (i >= 0) outgoing.splice(i, 1);
    }, wait);
  }

  function fadeOut(voice, at, dur) {
    const from = fadeValueAt(voice.fade, at);
    rampEqualPower(voice.gain.gain, from, 0, at, dur);
    voice.fade = { from: from, to: 0, t0: at, dur: dur };
    retire(voice, at + dur + 0.05);
  }

  // Every layer of a theme starts on one scheduled time. That is the whole
  // point of the format: the render harness guarantees the layers are the same
  // length to the sample, so one shared start plus one shared loop length keeps
  // them phase locked forever, and the crossfades stay musical.
  function startTheme(theme, at, dur) {
    // Layer and theme gains are seeded now, not at the scheduled start: a
    // seed scheduled at "at" would sit later in the timeline than a setHeat
    // made in the meantime and would quietly undo it. Nothing is audible
    // before "at" anyway, because the theme gain is still at zero.
    const seed = Math.min(at, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, seed);
    gain.connect(musicOut);

    const voice = { theme: theme, gain: gain, startTime: at, fade: null, layers: [] };
    theme.layers.forEach((l) => {
      const g = ctx.createGain();
      const src = ctx.createBufferSource();
      src.buffer = l.buffer;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = l.loopEnd;
      g.gain.setValueAtTime(layerTarget(l), seed);
      src.connect(g);
      g.connect(gain);
      src.start(at);
      voice.layers.push({ id: l.id, role: l.role, src: src, gain: g, loopEnd: l.loopEnd, samples: l.samples });
    });

    rampEqualPower(gain.gain, 0, 1, at, dur);
    voice.fade = { from: 0, to: 1, t0: at, dur: dur };
    return voice;
  }

  function stopStems(at, dur) {
    if (current) { outgoing.push(current); fadeOut(current, at, dur); current = null; }
    for (let i = outgoing.length - 1; i >= 0; i--) {
      const v = outgoing[i];
      if (!v.fade || v.fade.to !== 0) fadeOut(v, at, dur);
    }
  }

  function resolveTheme(stateId) {
    let list;
    if (Object.prototype.hasOwnProperty.call(STATE, stateId)) list = STATE[stateId];
    else if (stateId.indexOf(BOSS_PREFIX) === 0) list = [stateId.slice(BOSS_PREFIX.length)];
    // an id that is not in the table but is a loaded theme plays that theme:
    // handy for one off cutscene beds and for tests.
    else list = (themes.has(stateId) && stateId !== STINGER_THEME) ? [stateId] : [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] !== STINGER_THEME && themes.has(list[i])) return themes.get(list[i]);
    }
    return null;
  }

  // =====================================================================
  // Public API
  // =====================================================================
  function goto(stateId, opt) {
    opt = opt || {};
    const id = String(stateId == null ? 'silence' : stateId);

    // Nothing loaded: this file does not exist as far as the game is
    // concerned. js/ui.js keeps driving AudioSys.startMusic/stopMusic exactly
    // as it does today.
    if (!playable()) { state = id; return; }
    if (!ensureCtx()) { state = id; return; }

    const theme = resolveTheme(id);
    const dur = typeof opt.fade === 'number' ? Math.max(0, opt.fade) : DEFAULT_FADE;
    const sync = opt.sync === 'beat' ? 'beat' : (opt.sync === 'now' ? 'now' : 'bar');
    const at = boundary(sync, ctx.currentTime + LOOKAHEAD);

    if (!theme) {
      // A boss whose own theme is not baked yet keeps whatever is playing:
      // dropping a fight back onto the procedural scheduler mid swing is worse
      // than staying on the act theme.
      if (id.indexOf(BOSS_PREFIX) === 0 && current) { state = id; return; }
      // This state was never rendered. Hand it back rather than going quiet.
      stopStems(at, dur);
      phase = 1;
      const s = sys();
      if (id === 'silence') { if (s) { try { s.stopMusic(); } catch (e) {} } mode = 'off'; }
      else { if (s) { try { s.startMusic(); } catch (e) {} } mode = 'procedural'; }
      state = id;
      return;
    }

    // Two states can share a theme (act2.combat falls back to act1 while act1
    // is what is already playing). Nothing musical changes, so nothing moves,
    // and the phase the director set stays set.
    if (current && current.theme === theme) { state = id; return; }
    phase = 1;   // a new theme is always phase one until the director says otherwise

    // Stems are about to sound, so the old scheduler stops before they do.
    const s = sys();
    if (s) { try { s.stopMusic(); } catch (e) {} }

    if (current) { outgoing.push(current); fadeOut(current, at, dur); }
    current = startTheme(theme, at, dur);
    mode = 'stems';
    state = id;
  }

  function setHeat(h) {
    heat = clamp(typeof h === 'number' && isFinite(h) ? h : 0, 0, 1);
    if (!current || !ctx) return;
    const t = ctx.currentTime;
    current.layers.forEach((l) => {
      if (l.role !== 'heat') return;
      const w = HEAT_WINDOW[l.id];
      try { l.gain.gain.setTargetAtTime(smoothstep(w[0], w[1], heat), t, HEAT_TAU); } catch (e) {}
    });
  }

  function setPhase(n) {
    const v = Math.max(1, Math.floor(typeof n === 'number' && isFinite(n) ? n : 1));
    phase = v;
    if (!current || !ctx) return;
    // Boss layers arrive on a bar line, never mid phrase.
    const at = boundary('bar', ctx.currentTime + LOOKAHEAD);
    current.layers.forEach((l) => {
      if (l.role !== 'phase') return;
      const target = phase >= PHASE_LAYER[l.id] ? 1 : 0;
      try { l.gain.gain.setTargetAtTime(target, at, PHASE_TAU); } catch (e) {}
    });
  }

  function stinger(cueId, opt) {
    opt = opt || {};
    const pack = themes.get(STINGER_THEME);
    if (!pack || !ctx || !musicOut) return;
    const layer = pack.layers.filter((l) => l.id === String(cueId))[0];
    if (!layer) return;

    const from = ctx.currentTime + LOOKAHEAD;
    let at = from;
    if (opt.sync !== 'now') {
      const want = boundary(opt.sync === 'bar' ? 'bar' : 'beat', from);
      // Close enough to a line to be worth waiting for; any further out and a
      // stinger that is meant to punctuate an event arrives after the event.
      if (want - from <= STINGER_SNAP) at = want;
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(1, at);
    const src = ctx.createBufferSource();
    src.buffer = layer.buffer;
    src.loop = false;
    src.connect(g);
    g.connect(stingerOut);
    src.start(at);
    const life = (at - ctx.currentTime + layer.buffer.duration) * 1000 + 250;
    setTimeout(() => {
      try { src.disconnect(); } catch (e) {}
      try { g.disconnect(); } catch (e) {}
    }, life);
  }

  function stop(opt) {
    opt = opt || {};
    if (!playable()) { state = 'silence'; return; }
    const dur = typeof opt.fade === 'number' ? Math.max(0, opt.fade) : DEFAULT_FADE;
    if (ctx) stopStems(ctx.currentTime + LOOKAHEAD, dur);
    const s = sys();
    if (s) { try { s.stopMusic(); } catch (e) {} }
    mode = 'off';
    state = 'silence';
  }

  // Lets a host hand in its own graph, and lets the verification harness point
  // Music at a context it built itself.
  function attach(c, musicNode, stingerNode) {
    attached = { ctx: c || null, music: musicNode || null, stinger: stingerNode || null };
    musicOut = null; musicBusNode = null; stingerOut = null; ctx = null; routeVia = 'none';
    return ensureRoute();
  }

  function debug() {
    const voice = (v) => ({
      theme: v.theme.id,
      startTime: v.startTime,
      gain: v.gain.gain.value,
      fade: v.fade,
      layers: v.layers.map((l) => ({
        id: l.id, role: l.role, gain: l.gain.gain.value,
        loop: l.src.loop, loopEnd: l.src.loopEnd, samples: l.samples,
        startTime: v.startTime,
      })),
    });
    return {
      state: state, mode: mode, heat: heat, phase: phase,
      route: routeVia,
      // The live gain of the AudioSys buses this file joined, so "why is the
      // music quiet" is answerable without a debugger.
      bus: {
        music: musicBusNode ? musicBusNode.gain.value : null,
        stinger: (stingerOut && stingerOut !== musicOut) ? stingerOut.gain.value : null,
      },
      ctxTime: ctx ? ctx.currentTime : null,
      ctxState: ctx ? ctx.state : null,
      playable: playable(),
      themes: Array.from(themes.keys()).map((id) => {
        const t = themes.get(id);
        return {
          id: id, bpm: t.bpm, bars: t.bars, beatsPerBar: t.beatsPerBar,
          samples: t.samples, sampleRate: t.sampleRate,
          loopSeconds: t.loopSeconds, barSeconds: t.barSeconds, beatSeconds: t.beatSeconds,
          layers: t.layers.map((l) => ({ id: l.id, role: l.role, loopEnd: l.loopEnd, samples: l.samples })),
        };
      }),
      current: current ? voice(current) : null,
      outgoing: outgoing.map(voice),
    };
  }

  return {
    load: load,
    goto: goto,
    setHeat: setHeat,
    setPhase: setPhase,
    stinger: stinger,
    stop: stop,
    attach: attach,
    debug: debug,
    get state() { return state; },
    get mode() { return mode; },
    get heat() { return heat; },
    get phase() { return phase; },
    get theme() { return current ? current.theme.id : null; },
    get loaded() { return playable(); },
    get STATES() { return Object.keys(STATE); },
  };
})();
