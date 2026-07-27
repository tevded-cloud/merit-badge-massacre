// Merit Badge Massacre: procedural audio. No assets, everything synthesized.
'use strict';

const AudioSys = (() => {
  let ac = null, master = null, sfxGain = null, musGain = null;
  let muted = false;
  let started = false;

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
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
      musGain = ac.createGain(); musGain.gain.value = 0.16; musGain.connect(master);
      started = true;
    } catch (e) { /* audio unavailable, game still runs */ }
  }

  function setVolumes(music, sfx) {
    if (sfxGain) sfxGain.gain.value = 0.62 * sfx;
    if (musGain) musGain.gain.value = 0.22 * music;
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('mbm_mute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = m ? 0 : 1;
  }
  try { muted = localStorage.getItem('mbm_mute') === '1'; } catch (e) {}

  function tone(opts) {
    if (!started || muted) return;
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
    o.connect(g); g.connect(opts.bus || sfxGain);
    o.start(t0); o.stop(t0 + opts.dur + 0.05);
  }

  function noise(opts) {
    if (!started || muted) return;
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
    src.connect(f); f.connect(g); g.connect(opts.bus || sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const throttle = {};
  function play(name, opt) {
    if (!started || muted) return;
    const now = performance.now();
    const gap = { hit: 40, shoot: 30, pop: 35, flame: 70 }[name] || 0;
    if (gap) {
      if (throttle[name] && now - throttle[name] < gap) return;
      throttle[name] = now;
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

  function scheduleStep(t, s) {
    const bar = Math.floor(s / 8) % 4;
    const eighth = s % 8;
    const chord = CHORDS[bar];
    // bass on every eighth, accented on downbeats
    tone({ f: mtof(BASS[bar]), dur: 0.14, at: t - ac.currentTime, type: 'square', v: eighth % 2 === 0 ? 0.12 : 0.07, bus: musGain });
    if (intensity >= 1) {
      const n = chord[[0, 1, 2, 1, 0, 2, 1, 2][eighth]] + 12;
      tone({ f: mtof(n), dur: 0.11, at: t - ac.currentTime, type: 'triangle', v: 0.09, bus: musGain });
    }
    if (intensity >= 2 && eighth % 2 === 1) {
      noise({ dur: 0.03, freq: 6000, hp: true, v: 0.05, at: t - ac.currentTime, bus: musGain });
    }
    if (intensity >= 3 && eighth === 0) {
      tone({ f: mtof(chord[0] + 24), dur: 0.5, at: t - ac.currentTime, type: 'sawtooth', v: 0.05, bus: musGain });
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
        if (!muted) scheduleStep(nextTime, step);
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
    init, play, setMuted, setVolumes, startMusic, stopMusic, setIntensity,
    get muted() { return muted; },
    get started() { return started; },
  };
})();
