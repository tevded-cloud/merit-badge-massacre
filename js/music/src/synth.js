// Merit Badge Massacre: synth voices for the offline music render harness.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file and never
// will: only tools/render/ loads it, into an OfflineAudioContext, to bake stems.
// The game keeps its own live synth in js/audio.js.
//
// These voices are deliberately richer than the live scheduler in js/audio.js:
// multi oscillator detune stacks instead of one bare oscillator, filters with
// their own envelopes, a convolution reverb built from a generated impulse, and
// sidechain style pumping. Everything is deterministic (seeded noise, no
// Math.random) so the same source always renders byte identical audio, which is
// what makes the render cache in tools/render honest.
'use strict';

var MBMSynth = (function () {
  // -------------------------------------------------------------------
  // Notes and numbers
  // -------------------------------------------------------------------
  var STEP = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  var NAME_RE = /^([a-gA-G])([#b]*)(-?\d+)$/;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // 'A4' -> 69, 'C#5' -> 73, 'Bb3' -> 58. Numbers pass through as midi.
  function midi(n) {
    if (typeof n === 'number') return n;
    var m = NAME_RE.exec(String(n).trim());
    if (!m) throw new Error('MBMSynth: bad note name "' + n + '"');
    var v = STEP[m[1].toLowerCase()];
    for (var i = 0; i < m[2].length; i++) v += (m[2].charAt(i) === '#') ? 1 : -1;
    return v + (parseInt(m[3], 10) + 1) * 12;
  }

  function hz(n) { return mtof(midi(n)); }
  function db(x) { return Math.pow(10, x / 20); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pick(v, d) { return v === undefined || v === null ? d : v; }

  // mulberry32: small, fast, and repeatable, which matters more here than quality
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function scratch(ctx) {
    if (!ctx.__mbm) ctx.__mbm = { bufs: {}, seq: 0, shapers: {} };
    return ctx.__mbm;
  }

  // -------------------------------------------------------------------
  // Small graph helpers
  // -------------------------------------------------------------------
  function gain(ctx, value, dest) {
    var g = ctx.createGain();
    g.gain.value = pick(value, 1);
    if (dest) g.connect(dest);
    return g;
  }

  function panner(ctx, value, dest) {
    var p = ctx.createStereoPanner();
    p.pan.value = clamp(pick(value, 0), -1, 1);
    if (dest) p.connect(dest);
    return p;
  }

  // A gentle, non resonant filter. A true one pole is 6 dB per octave and the
  // Web Audio biquad is 12, so this is the closest honest stand in: Q pinned
  // low enough that there is no peak at the corner at all.
  function onePole(ctx, type, freq, dest) {
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.0001;
    if (dest) f.connect(dest);
    return f;
  }

  function filter(ctx, type, freq, q, dest) {
    var f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = pick(q, 0.7);
    if (dest) f.connect(dest);
    return f;
  }

  // tanh style soft clipper. Adds the harmonics that make a kick read as a kick
  // on laptop speakers instead of vanishing into the sub.
  function sat(ctx, drive, dest) {
    var d = pick(drive, 2);
    var key = 'k' + d.toFixed(3);
    var s = scratch(ctx);
    var curve = s.shapers[key];
    if (!curve) {
      var n = 2048;
      curve = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * d) / Math.tanh(d);
      }
      s.shapers[key] = curve;
    }
    var ws = ctx.createWaveShaper();
    ws.curve = curve;
    ws.oversample = '4x';
    if (dest) ws.connect(dest);
    return ws;
  }

  // send(from, to, amount) taps a node into a bus without disturbing its dry path
  function send(from, to, amount) {
    var g = from.context.createGain();
    g.gain.value = pick(amount, 0.25);
    from.connect(g);
    g.connect(to);
    return g;
  }

  // -------------------------------------------------------------------
  // Noise
  // -------------------------------------------------------------------
  function noiseBuffer(ctx, seconds, seed) {
    var s = scratch(ctx);
    var key = 'n' + seconds + '/' + (seed || 0);
    if (s.bufs[key]) return s.bufs[key];
    var len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var r = rng(0xB0B0 ^ (seed || 0) ^ len);
    for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
    // crossfade the head into the tail so a looped bed never ticks
    var fade = Math.min(Math.floor(ctx.sampleRate * 0.08), Math.floor(len / 4));
    for (var j = 0; j < fade; j++) {
      var w = j / fade;
      d[len - fade + j] = d[len - fade + j] * (1 - w) + d[j] * w;
    }
    s.bufs[key] = buf;
    return buf;
  }

  // Deterministic "random" read offset, so bursts do not all sound identical
  // but two renders of the same source still match sample for sample.
  function nextOffset(ctx, span) {
    var s = scratch(ctx);
    s.seq++;
    return (s.seq * 0.61803398875) % 1 * Math.max(0.001, span);
  }

  // -------------------------------------------------------------------
  // Envelopes
  // -------------------------------------------------------------------
  // Returns the time the voice is safe to stop at.
  function adsr(param, t0, peak, o) {
    var a = pick(o.attack, 0.006);
    var d = pick(o.decay, 0.09);
    var s = pick(o.sustain, 0.65);
    var r = pick(o.release, 0.18);
    var dur = Math.max(pick(o.dur, 0.3), a + 0.001);
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
    param.setTargetAtTime(Math.max(0.0001, peak * s), t0 + a, Math.max(0.004, d / 3));
    param.setTargetAtTime(0.0001, t0 + dur, Math.max(0.004, r / 3));
    return t0 + dur + r * 4 + 0.03;
  }

  // Percussive: straight to peak, exponential fall, no sustain stage.
  function hit(param, t0, peak, attack, fall) {
    var a = pick(attack, 0.003);
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + Math.max(0.01, fall));
    return t0 + a + fall + 0.02;
  }

  // -------------------------------------------------------------------
  // Reverb: generated impulse, energy normalized so wet is a real mix control
  // -------------------------------------------------------------------
  function impulse(ctx, o) {
    o = o || {};
    var sr = ctx.sampleRate;
    var seconds = pick(o.seconds, 2.2);
    var len = Math.max(16, Math.floor(sr * seconds));
    var buf = ctx.createBuffer(2, len, sr);
    var decay = pick(o.decay, 3.4);
    var dampHz = pick(o.dampHz, 3600);
    var seed = pick(o.seed, 0x5EED);

    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      var r = rng(seed + c * 7919);
      var lp = 0;
      // damping opens wide at the front and closes as the tail dies, which is
      // what a real room does to a decaying sound
      for (var i = 0; i < len; i++) {
        var t = i / len;
        var coef = 1 - Math.exp(-2 * Math.PI * (dampHz * (1 - 0.75 * t)) / sr);
        var white = r() * 2 - 1;
        lp += coef * (white - lp);
        d[i] = lp * Math.exp(-decay * t) * (1 - t);
      }
      // early reflections: a handful of discrete taps, slightly different per
      // channel so the room has width without a stereo widener
      var taps = [0.0071, 0.0113, 0.0170, 0.0231, 0.0307, 0.0412];
      for (var k = 0; k < taps.length; k++) {
        var at = Math.floor(taps[k] * (1 + (c ? 0.11 : -0.09)) * sr);
        if (at < len) d[at] += (k % 2 ? -1 : 1) * 0.55 * Math.pow(0.72, k);
      }
      // energy normalize: wet 0.3 then means roughly 30 percent wet, always
      var sum = 0;
      for (var m = 0; m < len; m++) sum += d[m] * d[m];
      var norm = 1 / Math.sqrt(Math.max(1e-9, sum));
      for (var n = 0; n < len; n++) d[n] *= norm;
    }
    return buf;
  }

  // Returns the send input node. Wet output is already wired to dest.
  function reverb(ctx, dest, o) {
    o = o || {};
    var input = gain(ctx, 1);
    var pre = ctx.createDelay(1);
    pre.delayTime.value = pick(o.preDelay, 0.022);
    var hp = onePole(ctx, 'highpass', pick(o.lowCut, 180));
    var conv = ctx.createConvolver();
    conv.normalize = false;
    conv.buffer = impulse(ctx, o);
    var lp = onePole(ctx, 'lowpass', pick(o.tone, 5200));
    var wet = gain(ctx, pick(o.wet, 0.9), dest);
    input.connect(pre);
    pre.connect(hp);
    hp.connect(conv);
    conv.connect(lp);
    lp.connect(wet);
    return input;
  }

  // Feedback echo. Legal as a cycle because the delay is far longer than one
  // render quantum, and damped so repeats fall away instead of piling up.
  function echo(ctx, dest, o) {
    o = o || {};
    var input = gain(ctx, 1);
    var dl = ctx.createDelay(4);
    dl.delayTime.value = pick(o.time, 0.35);
    var fb = gain(ctx, clamp(pick(o.feedback, 0.34), 0, 0.85));
    var damp = onePole(ctx, 'lowpass', pick(o.damp, 2600));
    var cut = onePole(ctx, 'highpass', pick(o.lowCut, 300));
    var out = gain(ctx, pick(o.mix, 0.3), dest);
    input.connect(dl);
    dl.connect(damp);
    damp.connect(cut);
    cut.connect(fb);
    fb.connect(dl);
    cut.connect(out);
    return input;
  }

  // Tremolo: a gain node whose value is swung by an LFO. Returns the node.
  function tremolo(ctx, o) {
    o = o || {};
    var depth = clamp(pick(o.depth, 0.6), 0, 1);
    var g = gain(ctx, 1 - depth / 2);
    var lfo = ctx.createOscillator();
    lfo.type = o.shape || 'sine';
    lfo.frequency.value = pick(o.rate, 9);
    var amt = gain(ctx, depth / 2);
    lfo.connect(amt);
    amt.connect(g.gain);
    lfo.start(pick(o.at, 0));
    lfo.stop(pick(o.until, 60));
    return g;
  }

  // -------------------------------------------------------------------
  // Sidechain style pumping
  // -------------------------------------------------------------------
  // Writes a duck at every time in times. Release is clamped so two close hits
  // never fight over the same param.
  function pump(param, times, o) {
    o = o || {};
    var depth = clamp(pick(o.depth, 0.5), 0, 1);
    var release = pick(o.release, 0.18);
    var base = pick(o.base, 1);
    var lead = 0.004;
    var sorted = times.slice().sort(function (a, b) { return a - b; });
    param.setValueAtTime(base, 0);
    for (var i = 0; i < sorted.length; i++) {
      var t = Math.max(lead, sorted[i]);
      var next = i + 1 < sorted.length ? sorted[i + 1] : t + release + 1;
      var rel = Math.max(0.03, Math.min(release, next - t - 0.02));
      param.setValueAtTime(base, t - lead);
      param.linearRampToValueAtTime(base * (1 - depth), t + 0.008);
      param.linearRampToValueAtTime(base, t + 0.008 + rel);
    }
  }

  // -------------------------------------------------------------------
  // Voices
  // -------------------------------------------------------------------
  // Detuned oscillator stack with its own filter envelope. The workhorse.
  //   tone(ctx, dest, { note:'A4', at, dur, v, type, voices, detune, cutoff,
  //                     cutoffTo, q, pan, sub, glideTo, vibrato, vibratoRate })
  function tone(ctx, dest, o) {
    var t0 = pick(o.at, 0);
    var dur = pick(o.dur, 0.3);
    var f = o.f ? o.f : hz(pick(o.note, 'A4'));
    var voices = Math.max(1, pick(o.voices, 3));
    var spread = pick(o.detune, 9);
    var v = pick(o.v, 0.2);

    var amp = gain(ctx, 0.0001);
    var out = panner(ctx, pick(o.pan, 0), dest);
    var node = amp;

    if (o.cutoff) {
      var lp = filter(ctx, o.filterType || 'lowpass', o.cutoff, pick(o.q, 0.9));
      lp.frequency.setValueAtTime(o.cutoff, t0);
      if (o.cutoffTo) {
        lp.frequency.exponentialRampToValueAtTime(
          Math.max(40, o.cutoffTo), t0 + pick(o.cutoffTime, Math.max(0.05, dur * 0.6)));
      }
      amp.connect(lp);
      lp.connect(out);
      node = lp;
    } else {
      amp.connect(out);
    }

    var stop = adsr(amp.gain, t0, v, o);
    var vib = null;
    var vibAmt = null;
    if (o.vibrato) {
      vib = ctx.createOscillator();
      vib.frequency.value = pick(o.vibratoRate, 5.1);
      vibAmt = gain(ctx, o.vibrato);
      vib.connect(vibAmt);
      vib.start(t0);
      vib.stop(stop);
    }

    for (var i = 0; i < voices; i++) {
      var osc = ctx.createOscillator();
      osc.type = o.type || 'sawtooth';
      osc.frequency.setValueAtTime(f, t0);
      if (o.glideTo) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, o.glideTo), t0 + pick(o.glideTime, dur));
      }
      // symmetric spread: 0, -1, +1, -2, +2 ... in cents
      var k = (i % 2 ? 1 : -1) * Math.ceil(i / 2);
      osc.detune.value = k * spread + pick(o.tune, 0);
      if (vibAmt) vibAmt.connect(osc.detune);
      var vg = gain(ctx, 1 / voices, amp);
      osc.connect(vg);
      osc.start(t0);
      osc.stop(stop);
    }

    if (o.sub) {
      var so = ctx.createOscillator();
      so.type = 'sine';
      so.frequency.setValueAtTime(f / 2, t0);
      var sg = gain(ctx, o.sub, amp);
      so.connect(sg);
      so.start(t0);
      so.stop(stop);
    }

    return node;
  }

  // Filtered noise burst.
  //   noise(ctx, dest, { at, dur, v, type:'highpass', freq, freqTo, q, pan })
  function noise(ctx, dest, o) {
    var t0 = pick(o.at, 0);
    var dur = Math.max(0.005, pick(o.dur, 0.1));
    var bufSeconds = pick(o.source, 2.5);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, bufSeconds, o.seed || 1);
    if (o.loop) src.loop = true;

    var f = filter(ctx, o.type || 'lowpass', pick(o.freq, 1200), pick(o.q, 0.8));
    if (o.freqTo) {
      f.frequency.setValueAtTime(pick(o.freq, 1200), t0);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, o.freqTo), t0 + dur);
    }
    var f2 = o.type2 ? filter(ctx, o.type2, pick(o.freq2, 200), pick(o.q2, 0.7)) : null;
    var amp = gain(ctx, 0.0001);
    var out = panner(ctx, pick(o.pan, 0), dest);

    src.connect(f);
    if (f2) { f.connect(f2); f2.connect(amp); } else { f.connect(amp); }
    amp.connect(out);

    var stop = o.shape === 'adsr'
      ? adsr(amp.gain, t0, pick(o.v, 0.2), o)
      : hit(amp.gain, t0, pick(o.v, 0.2), pick(o.attack, 0.002), dur);
    var span = Math.max(0.01, src.buffer.duration - dur - 0.05);
    src.start(t0, nextOffset(ctx, span));
    src.stop(stop);
    return amp;
  }

  // -------------------------------------------------------------------
  // Kit
  // -------------------------------------------------------------------
  function kick(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var v = pick(o.v, 0.85);
    var fall = pick(o.fall, 0.34);
    var top = pick(o.top, 158);
    var bottom = pick(o.tune, 47);

    var drive = sat(ctx, pick(o.drive, 1.9));
    var tame = onePole(ctx, 'lowpass', pick(o.tone, 3200), dest);
    drive.connect(tame);

    var amp = gain(ctx, 0.0001, drive);
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(top, t0);
    osc.frequency.exponentialRampToValueAtTime(bottom, t0 + pick(o.sweep, 0.055));
    osc.connect(amp);
    var stop = hit(amp.gain, t0, v, 0.004, fall);
    osc.start(t0);
    osc.stop(stop);

    // beater click: what you actually hear on small speakers
    noise(ctx, tame, {
      at: t0, dur: 0.014, v: v * pick(o.click, 0.22),
      type: 'highpass', freq: 1900, q: 0.6, seed: 3,
    });
    return amp;
  }

  function hat(ctx, dest, o) {
    o = o || {};
    var open = !!o.open;
    return noise(ctx, dest, {
      at: pick(o.at, 0),
      dur: pick(o.dur, open ? 0.22 : 0.032),
      v: pick(o.v, open ? 0.11 : 0.13),
      type: 'highpass',
      freq: pick(o.freq, 8200),
      q: 0.7,
      type2: 'peaking',
      freq2: 11500,
      q2: 1.4,
      pan: pick(o.pan, 0.12),
      seed: 5,
      attack: 0.001,
    });
  }

  function snare(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var v = pick(o.v, 0.5);
    noise(ctx, dest, {
      at: t0, dur: pick(o.dur, 0.17), v: v * 0.9,
      type: 'bandpass', freq: pick(o.freq, 1900), q: 0.75,
      type2: 'highpass', freq2: 420, q2: 0.6,
      pan: pick(o.pan, -0.05), seed: 7, attack: 0.001,
    });
    // two tuned bodies give it a drum pitch instead of a hiss
    tone(ctx, dest, {
      at: t0, note: null, f: 186, dur: 0.06, v: v * 0.5, type: 'triangle',
      voices: 1, attack: 0.001, decay: 0.03, sustain: 0.02, release: 0.05,
      pan: pick(o.pan, -0.05),
    });
    tone(ctx, dest, {
      at: t0, note: null, f: 262, dur: 0.04, v: v * 0.28, type: 'triangle',
      voices: 1, attack: 0.001, decay: 0.02, sustain: 0.02, release: 0.04,
      pan: pick(o.pan, -0.05),
    });
  }

  // -------------------------------------------------------------------
  // Pitched voices
  // -------------------------------------------------------------------
  // Slow chord bed: every note is its own detune stack, spread across the
  // stereo field, sharing one filter that breathes on a very slow LFO.
  function pad(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var dur = pick(o.dur, 2);
    var notes = o.notes || ['A3', 'C4', 'E4'];
    var v = pick(o.v, 0.16);
    var cutoff = pick(o.cutoff, 1500);

    var amp = gain(ctx, 0.0001);
    var lp = filter(ctx, 'lowpass', cutoff, pick(o.q, 0.8));
    var out = panner(ctx, pick(o.pan, 0), dest);
    amp.connect(lp);
    lp.connect(out);

    var stop = adsr(amp.gain, t0, v, {
      attack: pick(o.attack, 0.5),
      decay: pick(o.decay, 0.6),
      sustain: pick(o.sustain, 0.85),
      release: pick(o.release, 0.9),
      dur: dur,
    });

    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = pick(o.breathe, 0.09);
    var lfoAmt = gain(ctx, pick(o.breatheDepth, cutoff * 0.35));
    lfo.connect(lfoAmt);
    lfoAmt.connect(lp.frequency);
    lfo.start(t0);
    lfo.stop(stop);

    var spread = pick(o.spread, 0.55);
    for (var i = 0; i < notes.length; i++) {
      var f = hz(notes[i]);
      var pos = notes.length > 1 ? (i / (notes.length - 1)) * 2 - 1 : 0;
      var np = panner(ctx, pos * spread, amp);
      var ng = gain(ctx, 1 / Math.max(1, notes.length), np);
      for (var j = 0; j < 2; j++) {
        var osc = ctx.createOscillator();
        osc.type = j ? 'triangle' : 'sawtooth';
        osc.frequency.value = f;
        osc.detune.value = (j ? 1 : -1) * pick(o.detune, 7) + (i % 2 ? 3 : -3);
        var g = gain(ctx, j ? 0.55 : 0.45, ng);
        osc.connect(g);
        osc.start(t0);
        osc.stop(stop);
      }
    }
    return amp;
  }

  // Short, bright, decaying. A filter envelope plus a resonant body, which
  // reads as a plucked string without a feedback delay line.
  function pluck(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var f = o.f ? o.f : hz(pick(o.note, 'A4'));
    var v = pick(o.v, 0.2);
    var dur = pick(o.dur, 0.4);
    var out = panner(ctx, pick(o.pan, 0), dest);

    var amp = gain(ctx, 0.0001);
    var lp = filter(ctx, 'lowpass', pick(o.open, 5200), 1.1);
    lp.frequency.setValueAtTime(pick(o.open, 5200), t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, pick(o.close, 700)), t0 + Math.min(dur, 0.28));
    amp.connect(lp);
    lp.connect(out);

    // body resonance, mixed under the main path
    var body = filter(ctx, 'bandpass', f * 2.6, 6, out);
    var bodyGain = gain(ctx, 0.18, body);
    amp.connect(bodyGain);

    var stop = adsr(amp.gain, t0, v, {
      attack: 0.002, decay: pick(o.decay, 0.14), sustain: pick(o.sustain, 0.12),
      release: pick(o.release, 0.3), dur: dur,
    });

    for (var i = 0; i < 2; i++) {
      var osc = ctx.createOscillator();
      osc.type = i ? 'square' : 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = i ? 6 : -6;
      var g = gain(ctx, i ? 0.3 : 0.7, amp);
      osc.connect(g);
      osc.start(t0);
      osc.stop(stop);
    }
    return amp;
  }

  // Low end. Sine plus a whisper of triangle so it survives a phone speaker.
  function sub(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var f = o.f ? o.f : hz(pick(o.note, 'A1'));
    var dur = pick(o.dur, 0.4);
    var v = pick(o.v, 0.35);

    var lp = onePole(ctx, 'lowpass', pick(o.tone, 180), dest);
    var amp = gain(ctx, 0.0001, lp);
    var stop = adsr(amp.gain, t0, v, {
      attack: pick(o.attack, 0.01), decay: pick(o.decay, 0.08),
      sustain: pick(o.sustain, 0.8), release: pick(o.release, 0.09), dur: dur,
    });

    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * pick(o.blip, 1), t0);
    if (o.blip) osc.frequency.exponentialRampToValueAtTime(f, t0 + 0.03);
    osc.connect(gain(ctx, 0.88, amp));
    osc.start(t0);
    osc.stop(stop);

    var tri = ctx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.value = f;
    tri.connect(gain(ctx, pick(o.edge, 0.12), amp));
    tri.start(t0);
    tri.stop(stop);
    return amp;
  }

  // -------------------------------------------------------------------
  // Beds
  // -------------------------------------------------------------------
  // Room tone: a long noise bed with a slowly wandering filter. Used for the
  // "camp at night" air under the act 1 base stem.
  function airBed(ctx, dest, o) {
    o = o || {};
    var t0 = pick(o.at, 0);
    var dur = pick(o.dur, 8);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, Math.min(12, Math.max(4, dur)), pick(o.seed, 11));
    src.loop = true;

    var lp = filter(ctx, 'lowpass', pick(o.tone, 760), 0.6);
    var hp = onePole(ctx, 'highpass', pick(o.lowCut, 110));
    var amp = gain(ctx, 0.0001);
    var out = panner(ctx, pick(o.pan, 0), dest);
    src.connect(lp);
    lp.connect(hp);
    hp.connect(amp);
    amp.connect(out);

    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(pick(o.v, 0.05), t0 + pick(o.attack, 1.2));
    amp.gain.setTargetAtTime(0.0001, t0 + dur, 0.25);

    // wind: the cutoff drifts, so the bed never sits still
    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = pick(o.drift, 0.055);
    var amt = gain(ctx, pick(o.driftDepth, 320));
    lfo.connect(amt);
    amt.connect(lp.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 1.5);

    src.start(t0);
    src.stop(t0 + dur + 1.5);
    return amp;
  }

  return {
    mtof: mtof, midi: midi, hz: hz, db: db, clamp: clamp, rng: rng,
    gain: gain, panner: panner, onePole: onePole, filter: filter, sat: sat, send: send,
    noiseBuffer: noiseBuffer, adsr: adsr, hit: hit,
    impulse: impulse, reverb: reverb, echo: echo, tremolo: tremolo, pump: pump,
    tone: tone, noise: noise, kick: kick, hat: hat, snare: snare,
    pad: pad, pluck: pluck, sub: sub, airBed: airBed,
  };
})();

if (typeof window !== 'undefined') window.MBMSynth = MBMSynth;
if (typeof module !== 'undefined' && module.exports) module.exports = MBMSynth;
