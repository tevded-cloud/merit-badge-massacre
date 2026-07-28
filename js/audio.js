// Merit Badge Massacre: procedural audio. No assets, everything synthesized.
'use strict';

const AudioSys = (() => {
  // ---------------------------------------------------------------------
  // Context and bus graph
  //
  //   master ------------------------------------> destination
  //   musicBus  -> musicDuck -> master
  //   sfxBus    -> sfxDuck   -> master
  //   voiceBus  -------------> master
  //   stingerBus ------------> master
  // ---------------------------------------------------------------------
  let ac = null;
  let master = null;
  let musicBus = null, musicDuck = null;
  let sfxBus = null, sfxDuck = null;
  let voiceBus = null, stingerBus = null;

  let muted = false;
  let started = false;
  let tickTimer = null;

  // Mixer headroom per bus, tuned so the shipped default slider (0.8) lands
  // at exactly the loudness the old linear mixer produced there.
  const HEADROOM = { music: 0.275, sfx: 0.775, voice: 0.9 };
  // Slider value assumed before anyone calls setVolumes: the shipped default,
  // which against these headrooms reproduces the old init gains.
  const DEFAULT_V = 0.8;
  const vol = { music: DEFAULT_V, sfx: DEFAULT_V, voice: DEFAULT_V };

  const TICK_MS = 33;        // about 30 Hz
  const SMOOTH = 0.05;       // setTargetAtTime tau for every positional write
  const MAX_EMITTERS = 24;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function dbToGain(db) { return Math.pow(10, db / 20); }
  function now() { return ac ? ac.currentTime : 0; }
  function ramp(param, value, tau) {
    if (!param || !ac) return;
    try { param.setTargetAtTime(value, ac.currentTime, Math.max(0.001, tau)); } catch (e) {}
  }
  function viewHalf() {
    const w = (typeof window !== 'undefined' && window.innerWidth) || 960;
    return w / 2;
  }

  // music scheduler state
  let musicOn = false;
  let schedTimer = null;
  let nextTime = 0;
  let step = 0;
  let intensity = 0;
  const TEMPO = 116;
  const STEP_LEN = 60 / TEMPO / 2; // eighth notes

  // Am, F, Dm, E: one bar (8 eighths) each
  const CHORDS = [
    [57, 60, 64], // A minor
    [53, 57, 60], // F major
    [50, 53, 57], // D minor
    [52, 56, 59], // E major
  ];
  const BASS = [45, 41, 38, 40]; // A1 F1 D1 E1

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function init() {
    if (started) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();

      master = ac.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ac.destination);

      musicDuck = ac.createGain(); musicDuck.gain.value = 1; musicDuck.connect(master);
      musicBus = ac.createGain(); musicBus.gain.value = gainFor('music'); musicBus.connect(musicDuck);

      sfxDuck = ac.createGain(); sfxDuck.gain.value = 1; sfxDuck.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = gainFor('sfx'); sfxBus.connect(sfxDuck);

      voiceBus = ac.createGain(); voiceBus.gain.value = gainFor('voice'); voiceBus.connect(master);
      stingerBus = ac.createGain(); stingerBus.gain.value = 1; stingerBus.connect(master);

      started = true;
      startTick();
    } catch (e) { /* audio unavailable, game still runs */ }
  }

  // Browsers suspend the context until a gesture. Safe to call from any of them.
  function poke() {
    if (ac && ac.state === 'suspended') {
      try { ac.resume(); } catch (e) {}
    }
  }

  // ---------------------------------------------------------------------
  // Volumes
  // ---------------------------------------------------------------------
  function gainFor(key) {
    const v = clamp(typeof vol[key] === 'number' ? vol[key] : DEFAULT_V, 0, 1);
    return HEADROOM[key] * v * v; // perceptual curve
  }

  function applyVolumes() {
    if (!started) return;
    ramp(musicBus.gain, gainFor('music'), 0.02);
    ramp(sfxBus.gain, gainFor('sfx'), 0.02);
    ramp(voiceBus.gain, gainFor('voice'), 0.02);
  }

  // Accepts both the old positional form setVolumes(music, sfx) and the new
  // object form setVolumes({ music, sfx, voice }).
  function setVolumes(a, b) {
    if (a && typeof a === 'object') {
      if (typeof a.music === 'number') vol.music = a.music;
      if (typeof a.sfx === 'number') vol.sfx = a.sfx;
      if (typeof a.voice === 'number') vol.voice = a.voice;
    } else {
      if (typeof a === 'number') vol.music = a;
      if (typeof b === 'number') vol.sfx = b;
    }
    applyVolumes();
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem('mbm_mute', muted ? '1' : '0'); } catch (e) {}
    if (master) ramp(master.gain, muted ? 0 : 1, 0.008);
  }
  try { muted = localStorage.getItem('mbm_mute') === '1'; } catch (e) {}

  // ---------------------------------------------------------------------
  // Ducking: refcounted, deepest value per bus wins, release after the last
  // hold expires.
  // ---------------------------------------------------------------------
  const ATTACK_TAU = 0.027;      // about 80ms to land
  const DEFAULT_RELEASE = 0.4;
  const DEFAULT_HOLD = 0.15;
  const ducks = new Map();
  let duckSeq = 0;
  let duckRelease = DEFAULT_RELEASE;  // release of the last duck to let go
  let duckState = { music: 0, sfx: 0 };

  function duck(opt) {
    opt = opt || {};
    const id = ++duckSeq;
    const hold = typeof opt.hold === 'number' ? opt.hold : DEFAULT_HOLD;
    ducks.set(id, {
      music: Math.min(0, typeof opt.music === 'number' ? opt.music : 0),
      sfx: Math.min(0, typeof opt.sfx === 'number' ? opt.sfx : 0),
      expires: performance.now() + hold * 1000,
      release: typeof opt.release === 'number' ? opt.release : DEFAULT_RELEASE,
    });
    applyDucks();
    return {
      release() {
        const d = ducks.get(id);
        if (d) { duckRelease = d.release; ducks.delete(id); applyDucks(); }
      },
    };
  }

  function purgeDucks() {
    const t = performance.now();
    let changed = false;
    ducks.forEach((d, id) => {
      if (d.expires <= t) { duckRelease = d.release; ducks.delete(id); changed = true; }
    });
    return changed;
  }

  function applyDucks() {
    if (!started) return;
    let mdb = 0, sdb = 0;
    ducks.forEach((d) => {
      if (d.music < mdb) mdb = d.music;
      if (d.sfx < sdb) sdb = d.sfx;
    });
    // going deeper is an attack, coming back up is a release
    if (mdb !== duckState.music) {
      ramp(musicDuck.gain, dbToGain(mdb), mdb < duckState.music ? ATTACK_TAU : duckRelease / 3);
      duckState.music = mdb;
    }
    if (sdb !== duckState.sfx) {
      ramp(sfxDuck.gain, dbToGain(sdb), sdb < duckState.sfx ? ATTACK_TAU : duckRelease / 3);
      duckState.sfx = sdb;
    }
  }

  // ---------------------------------------------------------------------
  // Synth primitives
  // ---------------------------------------------------------------------
  let routeOverride = null; // set synchronously by playAt

  function outBus(opts) {
    if (opts && opts.bus) return opts.bus;
    if (routeOverride) return routeOverride;
    return sfxBus;
  }

  function tone(opts) {
    if (!started) return;
    const t0 = ac.currentTime + (opts.at || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = opts.type || 'square';
    o.frequency.setValueAtTime(opts.f, t0);
    if (opts.f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f2), t0 + opts.dur);
    const v = opts.v || 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    o.connect(g); g.connect(outBus(opts));
    o.start(t0); o.stop(t0 + opts.dur + 0.05);
  }

  function noise(opts) {
    if (!started) return;
    const t0 = ac.currentTime + (opts.at || 0);
    const dur = opts.dur;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = opts.hp ? 'highpass' : 'lowpass';
    f.frequency.setValueAtTime(opts.freq || 800, t0);
    if (opts.freq2) f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq2), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(opts.v || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(outBus(opts));
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---------------------------------------------------------------------
  // One shots
  // ---------------------------------------------------------------------
  const throttle = {};
  function play(name, opt) {
    if (!started) return;
    const t = performance.now();
    const gap = { hit: 40, shoot: 30, pop: 35, flame: 70 }[name] || 0;
    if (gap) {
      if (throttle[name] && t - throttle[name] < gap) return;
      throttle[name] = t;
    }
    const p = (opt && opt.pitch) || 1;
    switch (name) {
      case 'shoot':   tone({ f: 620 * p, f2: 420, dur: 0.07, type: 'square', v: 0.10 }); break;
      case 'flame':   noise({ dur: 0.18, freq: 1600, freq2: 500, v: 0.08 }); break;
      case 'swing':   noise({ dur: 0.12, freq: 900, freq2: 2400, hp: true, v: 0.10 }); break;
      case 'throw':   tone({ f: 300, f2: 520, dur: 0.10, type: 'triangle', v: 0.10 }); break;
      case 'hit':     noise({ dur: 0.06, freq: 900, v: 0.14 }); tone({ f: 200 * p, f2: 120, dur: 0.05, type: 'triangle', v: 0.08 }); break;
      case 'pop':     tone({ f: 340 * p, f2: 70, dur: 0.13, type: 'sine', v: 0.16 }); noise({ dur: 0.08, freq: 600, v: 0.07 }); break;
      case 'boom':    noise({ dur: 0.45, freq: 900, freq2: 90, v: 0.4 }); tone({ f: 110, f2: 40, dur: 0.4, type: 'sine', v: 0.3 }); break;
      case 'splash':  noise({ dur: 0.25, freq: 2400, freq2: 400, v: 0.12 }); break;
      case 'bugle':   tone({ f: 392, dur: 0.12, type: 'sawtooth', v: 0.12 }); tone({ f: 523, dur: 0.22, at: 0.1, type: 'sawtooth', v: 0.12 }); break;
      case 'pickup':  tone({ f: 660 * p, dur: 0.06, type: 'square', v: 0.07 }); tone({ f: 880 * p, dur: 0.08, at: 0.05, type: 'square', v: 0.07 }); break;
      case 'heal':    tone({ f: 523, dur: 0.1, type: 'triangle', v: 0.14 }); tone({ f: 784, dur: 0.16, at: 0.08, type: 'triangle', v: 0.14 }); break;
      case 'magnet':  tone({ f: 300, f2: 1200, dur: 0.3, type: 'sine', v: 0.12 }); break;
      case 'chest':   [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.12, at: i * 0.07, type: 'square', v: 0.10 })); break;
      case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.14, at: i * 0.06, type: 'triangle', v: 0.13 })); break;
      case 'hurt':    tone({ f: 180, f2: 55, dur: 0.22, type: 'sawtooth', v: 0.22 }); noise({ dur: 0.12, freq: 500, v: 0.16 }); break;
      case 'roar':    tone({ f: 140, f2: 45, dur: 0.8, type: 'sawtooth', v: 0.3 }); noise({ dur: 0.6, freq: 300, freq2: 80, v: 0.2 }); break;
      case 'click':   tone({ f: 800, dur: 0.04, type: 'square', v: 0.06 }); break;
      case 'victory': [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.2, at: i * 0.13, type: 'triangle', v: 0.14 })); break;
      case 'defeat':  [392, 370, 349, 330].forEach((f, i) => tone({ f, dur: 0.35, at: i * 0.28, type: 'sawtooth', v: 0.12 })); break;
    }
  }

  // Call sites can adopt cue() now. This wave it is play(). Later waves can
  // back a cue with a baked file without touching any call site.
  function cue(name, opt) { return play(name, opt); }

  // ---------------------------------------------------------------------
  // Sustained voices (hold)
  // ---------------------------------------------------------------------
  const holdVoices = {}; // name -> { refs, stopAll }

  function startFlameVoice() {
    const t0 = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = loopBuffer('flame', 2.4);
    src.loop = true;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.075, t0 + 0.05);

    // flicker: cutoff wobble plus a slow amplitude breath
    const lfo = ac.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 7.5;
    const lfoAmt = ac.createGain(); lfoAmt.gain.value = 420;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    const lfo2 = ac.createOscillator();
    lfo2.type = 'sine'; lfo2.frequency.value = 3.1;
    const lfo2Amt = ac.createGain(); lfo2Amt.gain.value = 0.018;
    lfo2.connect(lfo2Amt); lfo2Amt.connect(g.gain);

    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sfxBus);
    src.start(t0, Math.random() * src.buffer.duration);
    lfo.start(t0); lfo2.start(t0);

    return function stopAll(rel) {
      const tEnd = ac.currentTime;
      const r = typeof rel === 'number' ? rel : 0.12;
      g.gain.setTargetAtTime(0.0001, tEnd, Math.max(0.01, r / 3));
      setTimeout(() => {
        try { src.stop(); } catch (e) {}
        try { lfo.stop(); lfo2.stop(); } catch (e) {}
        try { src.disconnect(); hp.disconnect(); lp.disconnect(); g.disconnect(); } catch (e) {}
        try { lfoAmt.disconnect(); lfo2Amt.disconnect(); } catch (e) {}
      }, r * 1000 + 120);
    };
  }

  const HOLD_STARTERS = { flame: startFlameVoice };

  // hold('flame') -> { stop() }. Refcounted, so a weapon that calls it every
  // frame while fire is held keeps exactly one voice alive.
  function hold(name) {
    const starter = HOLD_STARTERS[name];
    if (!started || !starter) return { stop() {} };
    let voice = holdVoices[name];
    if (!voice) {
      voice = { refs: 0, stopAll: starter() };
      holdVoices[name] = voice;
    }
    voice.refs++;
    let done = false;
    return {
      stop() {
        if (done) return;
        done = true;
        voice.refs--;
        if (voice.refs <= 0 && holdVoices[name] === voice) {
          delete holdVoices[name];
          voice.stopAll();
        }
      },
    };
  }

  // ---------------------------------------------------------------------
  // Looping source material, all synthesized
  // ---------------------------------------------------------------------
  const loopCache = {};

  function loopBuffer(kind, seconds) {
    const key = kind + ':' + seconds;
    if (loopCache[key]) return loopCache[key];
    const sr = ac.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = ac.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const coef = (hz) => 1 - Math.exp(-2 * Math.PI * hz / sr);

    if (kind === 'campfire' || kind === 'torch' || kind === 'flame') {
      const body = coef(kind === 'torch' ? 900 : 420);
      const bodyGain = kind === 'flame' ? 0.9 : 0.7;
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += body * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * 3.2 * bodyGain;
      }
      // random pop transients on top of the bed
      if (kind !== 'flame') {
        const pops = Math.floor(seconds * (kind === 'torch' ? 26 : 14));
        for (let p = 0; p < pops; p++) {
          const at = Math.floor(Math.random() * len);
          const dur = Math.floor(sr * (0.006 + Math.random() * (kind === 'torch' ? 0.012 : 0.03)));
          const amp = (kind === 'torch' ? 0.25 : 0.55) * (0.4 + Math.random() * 0.6);
          for (let i = 0; i < dur && at + i < len; i++) {
            const env = Math.exp(-4.5 * (i / dur));
            d[at + i] += (Math.random() * 2 - 1) * amp * env;
          }
        }
      }
    } else if (kind === 'water') {
      // band passed: strip the rumble, keep a burble, roll off the top
      const lo = coef(300), hi = coef(2000);
      let a = 0, b = 0, phase = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        a += lo * (white - a);          // low content to subtract
        b += hi * ((white - a) - b);    // band
        phase += 0.9 / sr;
        const swell = 0.75 + 0.25 * Math.sin(phase * 2 * Math.PI * 2.3);
        d[i] = b * 2.4 * swell;
      }
    } else {
      // hazard hiss and the generic fallback: high passed noise, slow breath
      const lo = coef(1500);
      let a = 0, phase = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        a += lo * (white - a);
        phase += 1.7 / sr;
        const swell = 0.85 + 0.15 * Math.sin(phase * 2 * Math.PI * 1.1);
        d[i] = (white - a) * 0.8 * swell;
      }
    }

    // blend the head into the tail so the loop point does not tick
    const fade = Math.min(Math.floor(sr * 0.05), Math.floor(len / 4));
    for (let i = 0; i < fade; i++) {
      const w = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - w) + d[i] * w;
    }
    for (let i = 0; i < len; i++) d[i] = clamp(d[i], -1, 1);

    loopCache[key] = buf;
    return buf;
  }

  // ---------------------------------------------------------------------
  // Positional layer
  // ---------------------------------------------------------------------
  const EMITTERS = {
    campfire: { ref: 60, max: 520, gain: 0.55, lp: true },
    torch: { ref: 40, max: 320, gain: 0.30, lp: true, rate: 1.15 },
    water: { ref: 50, max: 380, gain: 0.35, lp: true },
    hazard: { ref: 30, max: 260, gain: 0.40 },
  };
  const LP_NEAR = 20000, LP_FAR = 1200;

  let listenerX = 0, listenerY = 0;
  const live = [];
  let emitterSeq = 0;

  function setListener(x, y) {
    listenerX = x;
    listenerY = y;
  }

  // Shared distance model. Returns gain scale, pan and cutoff for a point.
  function fieldAt(x, y, ref, max, lpCeil) {
    const dx = x - listenerX, dy = y - listenerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    const span = Math.max(1, max - ref);
    const t = clamp((max - d) / span, 0, 1);
    let pan = clamp(dx / viewHalf(), -1, 1) * 0.85;
    pan *= clamp(d / 80, 0, 1); // near sources collapse to the middle
    const ceil = lpCeil || LP_NEAR;
    const cutoff = LP_FAR * Math.pow(ceil / LP_FAR, t);
    return { d, t, atten: Math.pow(t, 1.6), pan, cutoff };
  }

  function dropFarthest() {
    let worst = null, worstD = -1;
    for (let i = 0; i < live.length; i++) {
      const e = live[i];
      if (e.dead) continue;
      const dx = e.x - listenerX, dy = e.y - listenerY;
      const d = dx * dx + dy * dy;
      if (d > worstD) { worstD = d; worst = e; }
    }
    if (worst) teardown(worst, 0.08);
  }

  function teardown(e, sec) {
    if (e.dead) return;
    e.dead = true;
    const r = typeof sec === 'number' ? sec : 0.1;
    ramp(e.gain.gain, 0.0001, Math.max(0.01, r / 3));
    setTimeout(() => {
      try { e.src.stop(); } catch (err) {}
      try { e.src.disconnect(); } catch (err) {}
      try { if (e.lp) e.lp.disconnect(); } catch (err) {}
      try { e.gain.disconnect(); e.pan.disconnect(); } catch (err) {}
      const i = live.indexOf(e);
      if (i >= 0) live.splice(i, 1);
    }, r * 1000 + 90);
  }

  const DEAD_HANDLE = { set() {}, param() {}, fade() {}, stop() {} };

  function emitter(recipeId, opt) {
    const recipe = EMITTERS[recipeId];
    if (!started || !recipe) return DEAD_HANDLE;
    opt = opt || {};

    let alive = 0;
    for (let i = 0; i < live.length; i++) if (!live[i].dead) alive++;
    if (alive >= MAX_EMITTERS) dropFarthest();

    const src = ac.createBufferSource();
    src.buffer = loopBuffer(recipeId, recipeId === 'hazard' ? 2.0 : 3.0);
    src.loop = true;
    src.playbackRate.value = recipe.rate || 1;

    const g = ac.createGain();
    g.gain.value = 0.0001;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;

    let lp = null;
    if (recipe.lp) {
      lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = LP_NEAR;
      lp.Q.value = 0.5;
    }

    // source -> lowpass (loops only) -> gain -> panner -> sfxBus
    if (lp) { src.connect(lp); lp.connect(g); } else { src.connect(g); }
    if (pan) { g.connect(pan); pan.connect(sfxBus); } else { g.connect(sfxBus); }
    src.start(0, Math.random() * src.buffer.duration);

    const e = {
      id: ++emitterSeq,
      recipe: recipeId,
      x: typeof opt.x === 'number' ? opt.x : 0,
      y: typeof opt.y === 'number' ? opt.y : 0,
      src, lp, gain: g, pan,
      connected: true,
      base: recipe.gain,
      ref: recipe.ref,
      max: recipe.max,
      lpCeil: LP_NEAR,
      userGain: 1,
      fadeFrom: 1, fadeTo: 1, fadeT0: 0, fadeDur: 0,
      dead: false,
    };
    live.push(e);
    updateEmitter(e);

    return {
      set(x, y) { e.x = x; e.y = y; },
      param(name, v) {
        if (typeof v !== 'number') return;
        if (name === 'rate') ramp(e.src.playbackRate, v, SMOOTH);
        else if (name === 'gain') e.base = v;
        else if (name === 'ref') e.ref = v;
        else if (name === 'max') e.max = v;
        else if (name === 'cutoff' || name === 'lp') e.lpCeil = clamp(v, 200, LP_NEAR);
      },
      fade(gain, sec) {
        e.fadeFrom = e.userGain;
        e.fadeTo = clamp(gain, 0, 4);
        e.fadeT0 = performance.now();
        e.fadeDur = Math.max(0, (sec || 0) * 1000);
        if (e.fadeDur === 0) e.userGain = e.fadeTo;
      },
      stop(sec) { teardown(e, typeof sec === 'number' ? sec : 0.12); },
    };
  }

  function updateEmitter(e) {
    if (e.dead) return;
    if (e.fadeDur > 0) {
      const k = clamp((performance.now() - e.fadeT0) / e.fadeDur, 0, 1);
      e.userGain = e.fadeFrom + (e.fadeTo - e.fadeFrom) * k;
      if (k >= 1) e.fadeDur = 0;
    }
    const f = fieldAt(e.x, e.y, e.ref, e.max, e.lpCeil);

    // out of range sources stop costing anything until the player comes back
    if (f.t <= 0) {
      if (e.connected) {
        try { e.src.disconnect(); } catch (err) {}
        e.connected = false;
      }
      ramp(e.gain.gain, 0.0001, SMOOTH);
      return;
    }
    if (!e.connected) {
      try { e.src.connect(e.lp || e.gain); } catch (err) {}
      e.connected = true;
    }

    ramp(e.gain.gain, Math.max(0.0001, f.atten * e.base * e.userGain), SMOOTH);
    if (e.pan) ramp(e.pan.pan, f.pan, SMOOTH);
    if (e.lp) ramp(e.lp.frequency, f.cutoff, SMOOTH);
  }

  function tick() {
    if (!started) return;
    if (purgeDucks()) applyDucks();
    for (let i = live.length - 1; i >= 0; i--) updateEmitter(live[i]);
  }

  function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(tick, TICK_MS);
  }

  // One shot placed in the world: same distance model, evaluated once.
  function playAt(name, x, y, opt) {
    if (!started) return;
    const recipe = (opt && EMITTERS[opt.recipe]) || null;
    const ref = (opt && typeof opt.ref === 'number') ? opt.ref : (recipe ? recipe.ref : 60);
    const max = (opt && typeof opt.max === 'number') ? opt.max : (recipe ? recipe.max : 520);
    const f = fieldAt(x, y, ref, max);
    if (f.t <= 0) return;

    const g = ac.createGain();
    g.gain.value = f.atten;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { g.connect(pan); pan.connect(sfxBus); pan.pan.value = f.pan; }
    else { g.connect(sfxBus); }

    routeOverride = g;
    try { play(name, opt); } finally { routeOverride = null; }

    setTimeout(() => {
      try { g.disconnect(); } catch (e) {}
      try { if (pan) pan.disconnect(); } catch (e) {}
    }, 5000);
  }

  // ---------------------------------------------------------------------
  // Music scheduler (stays here this wave)
  // ---------------------------------------------------------------------
  function scheduleStep(t, s) {
    const bar = Math.floor(s / 8) % 4;
    const eighth = s % 8;
    const chord = CHORDS[bar];
    // bass on every eighth, accented on downbeats
    tone({ f: mtof(BASS[bar]), dur: 0.14, at: t - ac.currentTime, type: 'square', v: eighth % 2 === 0 ? 0.12 : 0.07, bus: musicBus });
    if (intensity >= 1) {
      const n = chord[[0, 1, 2, 1, 0, 2, 1, 2][eighth]] + 12;
      tone({ f: mtof(n), dur: 0.11, at: t - ac.currentTime, type: 'triangle', v: 0.09, bus: musicBus });
    }
    if (intensity >= 2 && eighth % 2 === 1) {
      noise({ dur: 0.03, freq: 6000, hp: true, v: 0.05, at: t - ac.currentTime, bus: musicBus });
    }
    if (intensity >= 3 && eighth === 0) {
      tone({ f: mtof(chord[0] + 24), dur: 0.5, at: t - ac.currentTime, type: 'sawtooth', v: 0.05, bus: musicBus });
    }
  }

  function startMusic() {
    if (!started || musicOn) return;
    musicOn = true;
    nextTime = ac.currentTime + 0.1;
    step = 0;
    schedTimer = setInterval(() => {
      if (!musicOn) return;
      while (nextTime < ac.currentTime + 0.3) {
        scheduleStep(nextTime, step);
        nextTime += STEP_LEN;
        step++;
      }
    }, 90);
  }

  function stopMusic() {
    musicOn = false;
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  }

  function setIntensity(n) { intensity = n; }

  return {
    init, play, cue, hold, poke,
    setMuted, setVolumes, duck,
    setListener, emitter, playAt,
    startMusic, stopMusic, setIntensity,
    get muted() { return muted; },
    get started() { return started; },
    get emitterCount() {
      let n = 0;
      for (let i = 0; i < live.length; i++) if (!live[i].dead) n++;
      return n;
    },
  };
})();
