// Merit Badge Massacre: "act2", THE SOG. 92 bpm, 16 bars, D minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// A drowned fen: slow, wet, heavier than act 1, and uneasy. Same forest, so
// the family sound stays: one chord per bar, four phrases with a head, an
// answer, a lift and a climax, and the harmonic minor leading tone (C sharp
// here, where act 1 had G sharp) doing the menace. What changes is the water:
// half time drums, a bass that slides instead of walking, drips with a long
// echo, and a Neapolitan E flat bar in the lift where the ground gives way.
//
// Form (one chord per bar):
//
//   bars  1-4   A     Dm  Dm  Gm  A      statement, sinks onto V
//   bars  5-8   A'    Dm  Dm  Bb  A      answer, reaching up before it sinks
//   bars  9-12  B     Gm  Eb  F   A      the lift: the E flat bar is the bog
//   bars 13-16  A''   Bb  Gm  Dm  A7     climax, then down into the turnaround
//
// Four layers, same roles as act1, all exactly the same length:
//   base  drums, bass, water and room    always audible
//   l1    harmonic bed                   dark pad and sparse comping
//   l2    lead motif                     slow, surfacing, scooped entries
//   l3    peril                          low tremolo grind, bubbles, a riser
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 92;
  var BARS = 16;
  var BEATS = 4;

  function clock(bpm) {
    var spb = 60 / bpm;
    return {
      spb: spb,
      bar: BEATS * spb,
      at: function (bar, beat) { return ((bar - 1) * BEATS + (beat - 1)) * spb; },
      step: function (bar, s) { return ((bar - 1) * BEATS) * spb + s * (spb / 4); },
      beats: function (n) { return n * spb; },
    };
  }

  // ----------------------------------------------------------------
  // Harmony: 16 bars, low dark voicings. Bar 10 is the Neapolitan.
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Dm', bass: 'D2', pad: ['D3', 'A3', 'F4'] },
    { name: 'Dm', bass: 'D2', pad: ['D3', 'A3', 'F4'] },
    { name: 'Gm', bass: 'G2', pad: ['D3', 'Bb3', 'G4'] },
    { name: 'A', bass: 'A2', pad: ['C#4', 'E4', 'A4'] },
    { name: 'Dm', bass: 'D2', pad: ['D3', 'A3', 'F4'] },
    { name: 'Dm', bass: 'D2', pad: ['F3', 'A3', 'D4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['F3', 'Bb3', 'D4'] },
    { name: 'A', bass: 'A2', pad: ['C#4', 'E4', 'A4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['G3', 'Bb3', 'Eb4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'A', bass: 'A2', pad: ['C#4', 'E4', 'A4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['Bb3', 'D4', 'F4'] },
    { name: 'Gm', bass: 'G2', pad: ['Bb3', 'D4', 'G4'] },
    { name: 'Dm', bass: 'D2', pad: ['A3', 'D4', 'F4'] },
    { name: 'A7', bass: 'A2', pad: ['C#4', 'E4', 'G4'] },
  ];

  var FIFTH = { 'D2': 'A2', 'G2': 'D3', 'A2': 'E3', 'Bb2': 'F3', 'Eb2': 'Bb2', 'F2': 'C3' };

  // ----------------------------------------------------------------
  // Groove: half time. Kick on 1 with a push on the and of 3, thud
  // backbeat on 3. Shared so every pumping layer ducks the same hits.
  // ----------------------------------------------------------------
  var KICK_STEPS = [0, 10];
  var KICK_FILL = [0, 7, 10];       // bars 4, 8, 12
  var KICK_LAST = [0, 7, 10, 13];   // bar 16

  function kickSteps(bar) {
    if (bar === 16) return KICK_LAST;
    if (bar % 4 === 0) return KICK_FILL;
    return KICK_STEPS;
  }

  function kickTimes(bpm) {
    var c = clock(bpm);
    var out = [];
    for (var bar = 1; bar <= BARS; bar++) {
      var steps = kickSteps(bar);
      for (var i = 0; i < steps.length; i++) out.push(c.step(bar, steps[i]));
    }
    return out;
  }

  // Deterministic water events. [bar, beat, freq, pan]
  var DRIPS = [
    [2, 2.5, 2100, -0.5], [3, 4, 1700, 0.4], [6, 3.5, 2400, 0.6],
    [8, 2, 1500, -0.3], [10, 4.5, 2000, 0.5], [13, 2.5, 1800, -0.6],
    [15, 3, 2200, 0.3],
  ];
  var BUBBLES = [
    [1, 3, 150, -0.4], [4, 2, 200, 0.5], [7, 4, 170, -0.2],
    [9, 2.5, 220, 0.6], [12, 3.5, 160, -0.5], [14, 2, 190, 0.2],
  ];

  // ----------------------------------------------------------------
  // base: drums, bass, water
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    // Whole layer trim, act1's technique, from the start.
    master = S.gain(ctx, 0.6, master);

    var room = S.reverb(ctx, master, { seconds: 2.4, decay: 3.6, wet: 0.24, tone: 3400, lowCut: 220, seed: 0x5061 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, room, 0.34);

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.3, release: 0.24 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    // drips get their own long echo so the water answers itself
    var dripEcho = S.echo(ctx, master, { time: c.beats(0.75), feedback: 0.45, damp: 3200, lowCut: 500, mix: 0.5 });
    var dripBus = S.gain(ctx, 1, master);
    S.send(dripBus, dripEcho, 0.8);
    S.send(dripBus, room, 0.3);

    // ---- the fen: darker, closer air than act 1 ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.06, tone: 480, lowCut: 90, drift: 0.041, driftDepth: 220, pan: -0.2 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.03, tone: 1100, lowCut: 400, drift: 0.027, driftDepth: 500, pan: 0.3, seed: 29 });
    // one long wet breath across the lift
    S.noise(ctx, airBus, {
      at: c.at(9, 1), dur: c.bar * 2.5, v: 0.034, type: 'bandpass', freq: 420, q: 0.5,
      shape: 'adsr', attack: c.bar * 1.2, decay: 0.4, sustain: 0.7, release: c.bar, source: 12, seed: 53, pan: 0.35,
    });

    // ---- drips and bubbles ----
    for (var d = 0; d < DRIPS.length; d++) {
      var dr = DRIPS[d];
      S.tone(ctx, dripBus, {
        at: c.at(dr[0], dr[1]), f: dr[2], glideTo: dr[2] * 0.55, glideTime: 0.05,
        dur: 0.08, v: 0.05, type: 'sine', voices: 1,
        attack: 0.002, decay: 0.03, sustain: 0.25, release: 0.06, pan: dr[3],
      });
    }
    for (var bl = 0; bl < BUBBLES.length; bl++) {
      var bb = BUBBLES[bl];
      S.noise(ctx, airBus, {
        at: c.at(bb[0], bb[1]), dur: 0.4, v: 0.05, type: 'bandpass',
        freq: bb[2], freqTo: bb[2] * 4.2, q: 2.5,
        attack: 0.06, seed: 59 + bl, pan: bb[3], source: 3,
      });
    }

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var next = HARMONY[bar % HARMONY.length];
      var lastOfPhrase = (bar % 4 === 0);

      // ---- kick: deep and slow, the ground moving under the water ----
      var ks = kickSteps(bar);
      for (var k = 0; k < ks.length; k++) {
        var strong = ks[k] === 0;
        S.kick(ctx, master, {
          at: c.step(bar, ks[k]),
          v: strong ? 0.95 : 0.55,
          fall: strong ? 0.46 : 0.28,
          tune: 43, top: strong ? 140 : 120, sweep: 0.07, drive: 2.1, tone: 2600,
        });
      }

      // ---- thud backbeat on 3: a wet snare, longer and darker than act 1 ----
      S.snare(ctx, perc, { at: c.step(bar, 8), v: 0.5, dur: 0.26, freq: 1400 });
      if (bar >= 9) {
        S.snare(ctx, perc, { at: c.step(bar, 14), v: 0.12, dur: 0.1, freq: 1200 });
      }
      if (bar === 8 || bar === 16) {
        S.snare(ctx, perc, { at: c.step(bar, 13), v: 0.26, dur: 0.14, freq: 1300, pan: -0.25 });
        S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.4, dur: 0.16, freq: 1400, pan: 0.2 });
      }

      // ---- hats: sparse offbeat eighths, barely open, swampy ----
      var hatSteps = [2, 6, 10, 14];
      for (var s = 0; s < hatSteps.length; s++) {
        var open = (hatSteps[s] === 14 && lastOfPhrase);
        S.hat(ctx, perc, {
          at: c.step(bar, hatSteps[s]),
          v: open ? 0.08 : 0.055,
          open: open, freq: 7200, pan: 0.18,
        });
      }

      // ---- bass: long roots that slide up into pitch, a push at the end ----
      var bassSteps = [0, 8, 11, 14];
      for (var b = 0; b < bassSteps.length; b++) {
        var st = bassSteps[b];
        var t = c.step(bar, st);
        var note = h.bass;
        if (st === 11) note = FIFTH[h.bass] || h.bass;
        if (st === 14 && lastOfPhrase) note = S.midi(next.bass) - 1;
        var accent = (st === 0);
        var dur = c.beats(accent ? 1.6 : (st === 8 ? 1.0 : 0.5));
        var f = S.hz(note);
        S.tone(ctx, bassBus, {
          at: t, f: accent ? f * 0.944 : f, glideTo: accent ? f : undefined,
          glideTime: 0.1, dur: dur, v: accent ? 0.21 : 0.13,
          type: 'sawtooth', voices: 2, detune: 4,
          cutoff: accent ? 1100 : 750, cutoffTo: 340, cutoffTime: dur * 0.8, q: 2.8,
          attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1,
        });
        if (accent) {
          S.sub(ctx, bassBus, {
            at: t, note: S.midi(note) - 12, dur: c.beats(1.8), v: 0.3,
            attack: 0.012, decay: 0.15, sustain: 0.75, release: 0.14, tone: 150,
          });
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // l1: the harmonic bed, murkier than act 1's
  // ----------------------------------------------------------------
  function renderL1(ctx, master, bpm, bars) {
    var c = clock(bpm);

    master = S.gain(ctx, 1.0, master);

    var hall = S.reverb(ctx, master, { seconds: 3.2, decay: 2.8, wet: 0.38, tone: 3600, lowCut: 190, preDelay: 0.034, seed: 0x51B2 });

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.28, release: 0.26 });

    var padBus = S.gain(ctx, 0.9, duck);
    S.send(padBus, hall, 0.36);

    var comp = S.gain(ctx, 0.8, duck);
    S.send(comp, hall, 0.26);

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var t0 = c.at(bar, 1);

      // half a beat of overlap: the chords seep into each other
      S.pad(ctx, padBus, {
        at: t0 - (bar === 1 ? 0 : c.beats(0.5)),
        dur: c.bar + c.beats(0.5),
        notes: h.pad,
        v: 0.15,
        cutoff: bar >= 9 ? 1300 : 1000,
        breathe: 0.05, breatheDepth: 380,
        attack: bar === 1 ? 1.4 : 0.6, decay: 0.7, sustain: 0.9, release: 0.9,
        detune: 9, spread: 0.6,
      });

      S.sub(ctx, padBus, {
        at: t0, note: S.midi(h.bass) + 12, dur: c.bar * 0.95, v: 0.1,
        attack: 0.2, decay: 0.4, sustain: 0.75, release: 0.4, tone: 300, edge: 0.2,
      });

      // sparse comping: the and of 3, and later a pickup on the 4th sixteenth
      var top = h.pad[h.pad.length - 1];
      S.pluck(ctx, comp, { at: c.step(bar, 10), note: h.pad[1], dur: c.beats(0.9), v: 0.08, pan: -0.3, open: 2600, close: 520 });
      if (bar >= 9) {
        S.pluck(ctx, comp, { at: c.step(bar, 3), note: h.pad[0], dur: c.beats(0.5), v: 0.055, pan: 0.2, open: 2200, close: 480 });
      }
      // a bell after the thud on phrase ends
      if (bar % 4 === 0) {
        S.pluck(ctx, comp, {
          at: c.step(bar, 8), note: S.midi(top) + 12, dur: c.beats(1.8), v: 0.07,
          pan: 0.12, open: 4600, close: 900, decay: 0.4, sustain: 0.18, release: 1.0,
        });
      }
    }
  }

  // ----------------------------------------------------------------
  // l2: the lead motif
  //
  // [bar, beat, note, beats, velocity, scoop]. Slow and singing, entering
  // some phrases from below pitch, the way something surfaces. The C sharps
  // over the A bars are the leading tone doing what G sharp does in act 1.
  // ----------------------------------------------------------------
  var MELODY = [
    // phrase 1: the head, low and half sunk
    [1, 1, 'D4', 2, 0.75, 1], [1, 3, 'F4', 1, 0.7, 0], [1, 4, 'E4', 1, 0.68, 0],
    [2, 1, 'D4', 1.5, 0.72, 0], [2, 2.5, 'A4', 1.5, 0.82, 0], [2, 4, 'G4', 1, 0.72, 0],
    [3, 1, 'Bb4', 2, 0.85, 0], [3, 3, 'A4', 1, 0.75, 0], [3, 4, 'G4', 1, 0.72, 0],
    [4, 1, 'A4', 2.5, 0.8, 0], [4, 3.5, 'E4', 1.5, 0.7, 0],

    // phrase 2: same head, reaching for air
    [5, 1, 'D4', 2, 0.72, 1], [5, 3, 'F4', 1, 0.72, 0], [5, 4, 'G4', 1, 0.72, 0],
    [6, 1, 'A4', 1.5, 0.8, 0], [6, 2.5, 'C5', 1.5, 0.88, 0], [6, 4, 'A4', 1, 0.75, 0],
    [7, 1, 'D5', 2, 0.95, 1], [7, 3, 'C5', 1, 0.8, 0], [7, 4, 'Bb4', 1, 0.78, 0],
    [8, 1, 'A4', 1.5, 0.82, 0], [8, 2.5, 'C#5', 1.5, 0.9, 0], [8, 4, 'E4', 1, 0.7, 0],

    // phrase 3: the lift, long notes over the ground giving way
    [9, 1, 'G4', 3, 0.78, 0], [9, 4, 'Bb4', 1, 0.76, 0],
    [10, 1, 'Bb4', 2, 0.82, 0], [10, 3, 'G4', 2, 0.72, 0],
    [11, 1, 'A4', 2, 0.78, 0], [11, 3, 'F4', 2, 0.72, 0],
    [12, 1, 'E4', 2, 0.74, 0], [12, 3, 'C#5', 2, 0.85, 0],

    // phrase 4: the climax, then the tune sinks back under
    [13, 1, 'D5', 1.5, 0.95, 0], [13, 2.5, 'F5', 1.5, 1.0, 1], [13, 4, 'D5', 1, 0.85, 0],
    [14, 1, 'C5', 1.5, 0.85, 0], [14, 2.5, 'Bb4', 0.5, 0.75, 0], [14, 3, 'G4', 2, 0.78, 0],
    [15, 1, 'A4', 1.5, 0.8, 0], [15, 2.5, 'F4', 1.5, 0.74, 0], [15, 4, 'D4', 1, 0.7, 0],
    [16, 1, 'E4', 1, 0.72, 0], [16, 2, 'C#4', 1.5, 0.8, 0], [16, 3.5, 'A3', 1.5, 0.68, 0],
  ];

  function renderL2(ctx, master, bpm, bars) {
    var c = clock(bpm);

    master = S.gain(ctx, 1.1, master);

    var hall = S.reverb(ctx, master, { seconds: 3.0, decay: 3.0, wet: 0.32, tone: 4200, lowCut: 240, preDelay: 0.03, seed: 0x52C3 });
    // dotted quarter echo: slow ripples
    var slap = S.echo(ctx, master, { time: c.beats(1.5), feedback: 0.34, damp: 2000, lowCut: 360, mix: 0.24 });

    var lead = S.gain(ctx, 0.85, master);
    S.send(lead, hall, 0.3);
    S.send(lead, slap, 0.45);

    for (var i = 0; i < MELODY.length; i++) {
      var n = MELODY[i];
      var bar = n[0];
      if (bar > bars) continue;
      var t = c.at(bar, n[1]);
      var beats = n[3];
      var vel = n[4];
      var scoop = n[5] === 1;
      var dur = c.beats(beats) * (beats > 1 ? 0.95 : 0.88);
      var long = beats >= 1.5;
      var f = S.hz(n[2]);

      S.tone(ctx, lead, {
        at: t, f: scoop ? f * 0.944 : f, glideTo: scoop ? f : undefined,
        glideTime: 0.12, dur: dur, v: 0.17 * vel,
        type: 'sawtooth', voices: 3, detune: 6,
        cutoff: 900 + 1800 * vel, cutoffTo: 800, cutoffTime: Math.min(dur, 0.5), q: 1.2,
        attack: long ? 0.06 : 0.02, decay: 0.14, sustain: 0.75, release: long ? 0.4 : 0.22,
        vibrato: long ? 6 : 0, vibratoRate: 4.6,
        pan: -0.05,
      });
      // an octave below, quiet: weight instead of act 1's sheen
      S.tone(ctx, lead, {
        at: t, note: S.midi(n[2]) - 12, dur: dur * 0.85, v: 0.05 * vel,
        type: 'triangle', voices: 2, detune: 4,
        attack: long ? 0.07 : 0.02, decay: 0.12, sustain: 0.6, release: 0.2,
        pan: 0.1,
      });
    }
  }

  // ----------------------------------------------------------------
  // l3: peril
  //
  // The grind lives low here: a minor second rubbed at D3, not act 1's
  // shimmer. Bubbling ticks, a tritone stab closing each half, a riser.
  // ----------------------------------------------------------------
  function renderL3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.2, master);

    var hall = S.reverb(ctx, master, { seconds: 3.2, decay: 2.6, wet: 0.3, tone: 4400, lowCut: 240, seed: 0x53D4 });

    var shape = S.gain(ctx, 0.35, master);
    shape.gain.setValueAtTime(0.35, 0);
    shape.gain.linearRampToValueAtTime(0.5, c.at(5, 1));
    shape.gain.linearRampToValueAtTime(0.7, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(13, 1));
    shape.gain.linearRampToValueAtTime(0.55, loop);

    // ---- the low grind: a minor second down where the mud is ----
    var trem = S.tremolo(ctx, { rate: 7.5, depth: 0.8, at: 0, until: loop + 3 });
    var band = S.filter(ctx, 'bandpass', 700, 1.8, shape);
    trem.connect(band);
    S.send(band, hall, 0.35);

    function dyad(lo, hi, at, dur, v) {
      S.tone(ctx, trem, {
        at: at, note: lo, dur: dur, v: v, type: 'sawtooth', voices: 3, detune: 10,
        attack: 0.5, decay: 0.5, sustain: 0.9, release: 0.8, pan: -0.35,
      });
      S.tone(ctx, trem, {
        at: at, note: hi, dur: dur, v: v * 0.85, type: 'sawtooth', voices: 3, detune: 12,
        attack: 0.7, decay: 0.5, sustain: 0.9, release: 0.8, pan: 0.35,
      });
    }
    // D against E flat in the first half, up to G against A flat for the lift
    dyad('D3', 'Eb3', 0, c.bar * 8, 0.075);
    dyad('G3', 'Ab3', c.at(9, 1), c.bar * 8, 0.08);

    // ---- root pedal ----
    S.sub(ctx, shape, {
      at: 0, note: 'D2', dur: loop, v: 0.14,
      attack: 1.4, decay: 1, sustain: 0.9, release: 1.6, tone: 130, edge: 0.14,
    });

    // ---- tritone stabs: A flat over the D pedal, closing each half ----
    S.tone(ctx, shape, {
      at: c.at(8, 1), note: 'Ab4', dur: c.beats(1.5), v: 0.1, type: 'sawtooth',
      voices: 4, detune: 15, cutoff: 2200, cutoffTo: 600, q: 2.2,
      attack: 0.015, decay: 0.25, sustain: 0.35, release: 0.6, pan: 0.2,
    });
    S.tone(ctx, shape, {
      at: c.at(16, 1), note: 'Ab4', dur: c.beats(2), v: 0.12, type: 'sawtooth',
      voices: 4, detune: 17, cutoff: 2600, cutoffTo: 600, q: 2.2,
      attack: 0.015, decay: 0.25, sustain: 0.4, release: 0.7, pan: -0.2,
    });

    // ---- bubbling ticks: sparse sixteenth clusters that thicken late ----
    var ticks = S.gain(ctx, 1, shape);
    S.send(ticks, hall, 0.3);
    for (var bar = 1; bar <= bars; bar++) {
      for (var s = 0; s < 16; s++) {
        var offBeat = (s % 4 === 2);
        var late = bar >= 9;
        if (!offBeat && !(late && s % 4 === 3)) continue;
        S.noise(ctx, ticks, {
          at: c.step(bar, s), dur: 0.02, v: offBeat ? 0.07 : 0.04,
          type: 'bandpass', freq: 2800, q: 2.4,
          pan: (s % 8 < 4 ? -0.4 : 0.4),
          seed: 61, attack: 0.001, source: 2,
        });
      }
      // a gulp at the top of each phrase
      if (bar % 4 === 1) {
        S.noise(ctx, ticks, {
          at: c.at(bar, 1), dur: 0.5, v: 0.065, type: 'bandpass',
          freq: 240, freqTo: 900, q: 2.6,
          attack: 0.05, seed: 67, source: 3, pan: -0.3,
        });
      }
    }

    // ---- the riser: the water rising for two bars ----
    S.noise(ctx, shape, {
      at: c.at(15, 1), dur: c.bar * 2, v: 0.11,
      type: 'bandpass', freq: 260, freqTo: 6400, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 71, pan: 0,
    });
    S.tone(ctx, shape, {
      at: c.at(15, 1), f: 147, glideTo: 587, glideTime: c.bar * 2,
      dur: c.bar * 2, v: 0.055, type: 'sawtooth', voices: 3, detune: 18,
      cutoff: 700, cutoffTo: 4200, cutoffTime: c.bar * 2, q: 2.8,
      attack: c.bar * 1.8, decay: 0.2, sustain: 0.95, release: 0.15, pan: 0.15,
    });
  }

  var composition = {
    id: 'act2',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'D minor',
    tailSeconds: 3.2,
    notes: 'THE SOG. Half time, wet, uneasy. Neapolitan bar in the lift.',
    layers: [
      { id: 'base', render: renderBase },
      { id: 'l1', render: renderL1 },
      { id: 'l2', render: renderL2 },
      { id: 'l3', render: renderL3 },
    ],
  };

  root.MBM_COMPOSITIONS = root.MBM_COMPOSITIONS || [];
  root.MBM_COMPOSITIONS.push(composition);
  if (typeof module !== 'undefined' && module.exports) module.exports = composition;
})();
