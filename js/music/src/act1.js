// Merit Badge Massacre: "act1", the first act theme. 116 bpm, 16 bars, A minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// Form (one chord per bar):
//
//   bars  1-4   A     Am  Am  F   G      statement, the head
//   bars  5-8   A'    Am  Am  F   E      same head, higher answer, lands on V
//   bars  9-12  B     Dm  Dm  C   G      the lift, lead thins out and sings
//   bars 13-16  A''   F   G   Am  E7     climax, then a turnaround back to bar 1
//
// The E and E7 bars carry G sharp, the harmonic minor leading tone. That note
// is the whole mood: scouts marching cheerfully toward something with antlers.
//
// Four layers, all exactly the same length so the game can crossfade them:
//   base  drums, bass, room tone      always audible
//   l1    harmonic bed                pad and offbeat comping
//   l2    lead motif                  the tune the player remembers
//   l3    peril                       tremolo dissonance and high percussion
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 116;
  var BARS = 16;
  var BEATS = 4;

  // ----------------------------------------------------------------
  // Time helpers. Everything takes bpm from the render call so the
  // composition contract stays honest.
  // ----------------------------------------------------------------
  function clock(bpm) {
    var spb = 60 / bpm;
    return {
      spb: spb,
      bar: BEATS * spb,
      // 1 based bar, 1 based beat, beat may be fractional (2.5 is the "and" of 2)
      at: function (bar, beat) { return ((bar - 1) * BEATS + (beat - 1)) * spb; },
      // 1 based bar, 0 based sixteenth step 0..15
      step: function (bar, s) { return ((bar - 1) * BEATS) * spb + s * (spb / 4); },
      beats: function (n) { return n * spb; },
    };
  }

  // ----------------------------------------------------------------
  // Harmony: 16 bars, bass root plus a pad voicing that leads its voices
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'F', bass: 'F2', pad: ['A3', 'C4', 'F4'] },
    { name: 'G', bass: 'G2', pad: ['B3', 'D4', 'G4'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'Am', bass: 'A2', pad: ['C4', 'E4', 'A4'] },
    { name: 'F', bass: 'F2', pad: ['C4', 'F4', 'A4'] },
    { name: 'E', bass: 'E2', pad: ['B3', 'E4', 'G#4'] },
    { name: 'Dm', bass: 'D2', pad: ['D4', 'F4', 'A4'] },
    { name: 'Dm', bass: 'D2', pad: ['D4', 'F4', 'A4'] },
    { name: 'C', bass: 'C2', pad: ['C4', 'E4', 'G4'] },
    { name: 'G', bass: 'G2', pad: ['B3', 'D4', 'G4'] },
    { name: 'F', bass: 'F2', pad: ['C4', 'F4', 'A4'] },
    { name: 'G', bass: 'G2', pad: ['D4', 'G4', 'B4'] },
    { name: 'Am', bass: 'A2', pad: ['C4', 'E4', 'A4'] },
    { name: 'E7', bass: 'E2', pad: ['D4', 'G#4', 'B4'] },
  ];

  // The fifth above each root, for the bass line's push notes.
  var FIFTH = { 'A2': 'E3', 'F2': 'C3', 'G2': 'D3', 'E2': 'B2', 'D2': 'A2', 'C2': 'G2' };

  // ----------------------------------------------------------------
  // Groove. The kick pattern is shared: every layer that pumps has to
  // pump against the same hits or the stems will not sit together.
  // ----------------------------------------------------------------
  var KICK_STEPS = [0, 6, 8, 14];
  var KICK_FILL = [0, 6, 8, 12, 14];      // bars 4, 8, 12
  var KICK_LAST = [0, 6, 8, 10, 12, 14];  // bar 16, the turnaround

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

  // ----------------------------------------------------------------
  // base: drums, bass, room tone
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    // Trim the whole layer: the first render clipped at +1.5 dBFS, and the
    // stem contract wants every layer peaking safely below zero.
    master = S.gain(ctx, 0.6, master);

    var room = S.reverb(ctx, master, { seconds: 1.7, decay: 4.4, wet: 0.20, tone: 4400, lowCut: 260, seed: 0x0AC1 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, room, 0.26);

    // Bass and air duck out of the kick's way, the oldest trick that still works.
    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.34, release: 0.16 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    // ---- room tone: the pines, the dark past the firelight ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.055, tone: 720, lowCut: 120, drift: 0.048, driftDepth: 300, pan: -0.15 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.035, tone: 1500, lowCut: 500, drift: 0.031, driftDepth: 700, pan: 0.3, seed: 23 });
    // two slow breaths, so the bed is not a flat hiss
    S.noise(ctx, airBus, {
      at: c.at(5, 1), dur: c.bar * 2.2, v: 0.032, type: 'bandpass', freq: 640, q: 0.5,
      shape: 'adsr', attack: c.bar, decay: 0.4, sustain: 0.7, release: c.bar, source: 12, seed: 31, pan: 0.4,
    });
    S.noise(ctx, airBus, {
      at: c.at(12, 1), dur: c.bar * 2.4, v: 0.036, type: 'bandpass', freq: 520, q: 0.5,
      shape: 'adsr', attack: c.bar, decay: 0.4, sustain: 0.7, release: c.bar, source: 12, seed: 37, pan: -0.4,
    });

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var next = HARMONY[bar % HARMONY.length];

      // ---- kick ----
      var ks = kickSteps(bar);
      for (var k = 0; k < ks.length; k++) {
        var strong = ks[k] === 0 || ks[k] === 8;
        S.kick(ctx, master, {
          at: c.step(bar, ks[k]),
          v: strong ? 0.92 : 0.62,
          fall: strong ? 0.34 : 0.24,
          tune: 47, top: strong ? 162 : 140, drive: 1.9,
        });
      }

      // ---- backbeat ----
      S.snare(ctx, perc, { at: c.step(bar, 4), v: 0.46 });
      S.snare(ctx, perc, { at: c.step(bar, 12), v: 0.5 });
      // ghost notes push the second half of every phrase
      if (bar >= 5) {
        S.snare(ctx, perc, { at: c.step(bar, 7), v: 0.11, dur: 0.09 });
        if (bar >= 13) S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.14, dur: 0.09 });
      }
      if (bar === 8 || bar === 16) {
        S.snare(ctx, perc, { at: c.step(bar, 13), v: 0.3, dur: 0.11, pan: -0.25 });
        S.snare(ctx, perc, { at: c.step(bar, 14), v: 0.38, dur: 0.11, pan: 0.2 });
        S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.5, dur: 0.12, pan: 0 });
      }

      // ---- hats: eighths, offbeats accented, open hat to close a phrase ----
      for (var s = 0; s < 16; s += 2) {
        var open = (s === 14 && bar % 4 === 0);
        S.hat(ctx, perc, {
          at: c.step(bar, s),
          v: open ? 0.1 : (s % 4 === 0 ? 0.075 : 0.115),
          open: open,
          pan: 0.14,
        });
      }
      // sixteenth doubles in the back half of the loop, energy without a tempo change
      if (bar >= 9) {
        S.hat(ctx, perc, { at: c.step(bar, 11), v: 0.06, pan: 0.2 });
        S.hat(ctx, perc, { at: c.step(bar, 15), v: 0.07, pan: 0.08 });
      }

      // ---- bass ----
      var lastOfPhrase = (bar % 4 === 0);
      var bassSteps = [0, 3, 6, 8, 11, 14];
      for (var b = 0; b < bassSteps.length; b++) {
        var st = bassSteps[b];
        var t = c.step(bar, st);
        var note = h.bass;
        if (st === 11) note = FIFTH[h.bass] || h.bass;
        // chromatic approach into the next chord, the oldest bass trick of all
        if (st === 14 && lastOfPhrase) note = S.midi(next.bass) - 1;
        var accent = (st === 0 || st === 8);
        var dur = c.beats(st === 0 || st === 8 ? 0.62 : 0.45);
        S.tone(ctx, bassBus, {
          at: t, note: note, dur: dur, v: accent ? 0.20 : 0.135,
          type: 'sawtooth', voices: 2, detune: 5,
          cutoff: accent ? 1500 : 950, cutoffTo: 420, cutoffTime: dur * 0.8, q: 3.2,
          attack: 0.004, decay: 0.07, sustain: 0.55, release: 0.07,
        });
        if (accent) {
          S.sub(ctx, bassBus, {
            at: t, note: S.midi(note) - 12, dur: c.beats(0.7), v: 0.30,
            attack: 0.008, decay: 0.1, sustain: 0.7, release: 0.1, tone: 170,
          });
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // l1: the harmonic bed
  // ----------------------------------------------------------------
  function renderL1(ctx, master, bpm, bars) {
    var c = clock(bpm);

    var hall = S.reverb(ctx, master, { seconds: 2.6, decay: 3.0, wet: 0.34, tone: 4200, lowCut: 200, preDelay: 0.03, seed: 0x1B1B });

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.30, release: 0.19 });

    var padBus = S.gain(ctx, 0.9, duck);
    S.send(padBus, hall, 0.34);

    var comp = S.gain(ctx, 0.8, duck);
    S.send(comp, hall, 0.22);

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var t0 = c.at(bar, 1);
      // The pad overlaps the bar line by an eighth so chords bleed into each
      // other instead of stepping.
      S.pad(ctx, padBus, {
        at: t0 - (bar === 1 ? 0 : c.beats(0.12)),
        dur: c.bar + c.beats(0.12),
        notes: h.pad,
        v: 0.15,
        cutoff: bar >= 9 ? 1750 : 1350,
        breathe: 0.07, breatheDepth: 520,
        attack: bar === 1 ? 0.9 : 0.28, decay: 0.5, sustain: 0.9, release: 0.55,
        detune: 8, spread: 0.62,
      });

      // one octave of weight under the pad, so l1 alone is not thin
      S.sub(ctx, padBus, {
        at: t0, note: S.midi(h.bass) + 12, dur: c.bar * 0.95, v: 0.10,
        attack: 0.12, decay: 0.3, sustain: 0.75, release: 0.3, tone: 320, edge: 0.2,
      });

      // offbeat comping: quiet plucks on the "and" of 2 and 4, the pulse that
      // keeps a pad from sounding like a held chord
      var top = h.pad[h.pad.length - 1];
      var mid = h.pad[1];
      S.pluck(ctx, comp, { at: c.step(bar, 6), note: mid, dur: c.beats(0.7), v: 0.085, pan: -0.35, open: 3600, close: 620 });
      S.pluck(ctx, comp, { at: c.step(bar, 14), note: top, dur: c.beats(0.7), v: 0.095, pan: 0.35, open: 4200, close: 700 });
      if (bar >= 9) {
        S.pluck(ctx, comp, { at: c.step(bar, 3), note: h.pad[0], dur: c.beats(0.4), v: 0.055, pan: 0.15, open: 3000, close: 560 });
      }
      // phrase ends get a bell: the top of the chord an octave up
      if (bar % 4 === 0) {
        S.pluck(ctx, comp, {
          at: c.step(bar, 8), note: S.midi(top) + 12, dur: c.beats(1.6), v: 0.075,
          pan: 0.1, open: 6200, close: 1100, decay: 0.35, sustain: 0.2, release: 0.8,
        });
      }
    }
  }

  // ----------------------------------------------------------------
  // l2: the lead motif
  //
  // [bar, beat, note, beats, velocity]. Written as four phrases: a statement,
  // the same head with a higher answer, a thinner singing middle, and the
  // climb to A5 before the tune sits down on the dominant and the loop turns.
  // ----------------------------------------------------------------
  var MELODY = [
    // phrase 1: the head
    [1, 1, 'E4', 0.5, 0.72], [1, 1.5, 'A4', 0.5, 0.8], [1, 2, 'C5', 1, 0.9],
    [1, 3, 'B4', 0.5, 0.72], [1, 3.5, 'C5', 0.5, 0.75], [1, 4, 'A4', 1, 0.8],
    [2, 1, 'E4', 0.5, 0.7], [2, 1.5, 'A4', 0.5, 0.78], [2, 2, 'D5', 1, 0.92],
    [2, 3, 'C5', 0.5, 0.75], [2, 3.5, 'B4', 0.5, 0.72], [2, 4, 'A4', 1, 0.82],
    [3, 1, 'F4', 1, 0.8], [3, 2, 'G4', 0.5, 0.72], [3, 2.5, 'A4', 0.5, 0.78],
    [3, 3, 'C5', 1, 0.88], [3, 4, 'A4', 1, 0.78],
    [4, 1, 'B4', 1, 0.84], [4, 2, 'D5', 0.5, 0.9], [4, 2.5, 'B4', 0.5, 0.76],
    [4, 3, 'G4', 2, 0.8],

    // phrase 2: same head, the answer reaches
    [5, 1, 'E4', 0.5, 0.72], [5, 1.5, 'A4', 0.5, 0.8], [5, 2, 'C5', 1, 0.9],
    [5, 3, 'B4', 0.5, 0.72], [5, 3.5, 'C5', 0.5, 0.75], [5, 4, 'A4', 1, 0.8],
    [6, 1, 'E4', 0.5, 0.72], [6, 1.5, 'A4', 0.5, 0.8], [6, 2, 'E5', 1, 0.96],
    [6, 3, 'D5', 0.5, 0.8], [6, 3.5, 'C5', 0.5, 0.76], [6, 4, 'B4', 1, 0.8],
    [7, 1, 'A4', 0.5, 0.78], [7, 1.5, 'C5', 0.5, 0.84], [7, 2, 'F5', 1.5, 1.0],
    [7, 3.5, 'E5', 0.5, 0.85], [7, 4, 'D5', 1, 0.86],
    [8, 1, 'C5', 0.5, 0.82], [8, 1.5, 'B4', 0.5, 0.78], [8, 2, 'G#4', 1, 0.9],
    [8, 3, 'E4', 2, 0.8],

    // phrase 3: the lift, longer notes, the tune stops running
    [9, 1, 'D4', 2, 0.76], [9, 3, 'F4', 1, 0.78], [9, 4, 'A4', 1, 0.82],
    [10, 1, 'G4', 1.5, 0.84], [10, 2.5, 'F4', 0.5, 0.72], [10, 3, 'E4', 2, 0.78],
    [11, 1, 'E4', 1, 0.76], [11, 2, 'G4', 1, 0.8], [11, 3, 'C5', 2, 0.88],
    [12, 1, 'D5', 1, 0.88], [12, 2, 'B4', 1, 0.8], [12, 3, 'G4', 1.5, 0.78],
    [12, 4.5, 'B4', 0.5, 0.72],

    // phrase 4: the climb, the peak, and the landing on E
    [13, 1, 'A4', 0.5, 0.8], [13, 1.5, 'C5', 0.5, 0.86], [13, 2, 'F5', 1, 0.98],
    [13, 3, 'E5', 1, 0.9], [13, 4, 'C5', 1, 0.84],
    [14, 1, 'D5', 0.5, 0.86], [14, 1.5, 'B4', 0.5, 0.8], [14, 2, 'G5', 1, 1.0],
    [14, 3, 'F5', 0.5, 0.88], [14, 3.5, 'D5', 0.5, 0.82], [14, 4, 'B4', 1, 0.84],
    [15, 1, 'A5', 2, 1.0], [15, 3, 'E5', 1, 0.86], [15, 4, 'C5', 1, 0.82],
    [16, 1, 'B4', 1, 0.82], [16, 2, 'G#4', 1, 0.86], [16, 3, 'E4', 2, 0.78],
  ];

  function renderL2(ctx, master, bpm, bars) {
    var c = clock(bpm);

    var hall = S.reverb(ctx, master, { seconds: 2.4, decay: 3.4, wet: 0.30, tone: 5000, lowCut: 260, preDelay: 0.026, seed: 0x2C2C });
    // dotted eighth delay, tempo locked: the repeat lands in the gaps
    var slap = S.echo(ctx, master, { time: c.beats(0.75), feedback: 0.3, damp: 2400, lowCut: 420, mix: 0.22 });

    var lead = S.gain(ctx, 0.85, master);
    S.send(lead, hall, 0.26);
    S.send(lead, slap, 0.5);

    for (var i = 0; i < MELODY.length; i++) {
      var n = MELODY[i];
      var bar = n[0];
      if (bar > bars) continue;
      var t = c.at(bar, n[1]);
      var beats = n[3];
      var vel = n[4];
      // slight detache so repeated notes speak instead of smearing
      var dur = c.beats(beats) * (beats > 1 ? 0.94 : 0.86);
      var long = beats >= 1.5;

      S.tone(ctx, lead, {
        at: t, note: n[2], dur: dur, v: 0.165 * vel,
        type: 'sawtooth', voices: 3, detune: 7,
        cutoff: 1100 + 2600 * vel, cutoffTo: 1250, cutoffTime: Math.min(dur, 0.35), q: 1.6,
        attack: long ? 0.028 : 0.012, decay: 0.11, sustain: 0.72, release: long ? 0.3 : 0.18,
        vibrato: long ? 7 : 0, vibratoRate: 5.3,
        pan: -0.06,
      });
      // a triangle an octave up, quiet: the sheen that makes a melody carry
      S.tone(ctx, lead, {
        at: t, note: S.midi(n[2]) + 12, dur: dur * 0.8, v: 0.042 * vel,
        type: 'triangle', voices: 2, detune: 4,
        attack: long ? 0.03 : 0.014, decay: 0.1, sustain: 0.5, release: 0.16,
        pan: 0.12,
      });
    }
  }

  // ----------------------------------------------------------------
  // l3: peril
  //
  // A minor second, tremoloed, over a root pedal, with high percussion
  // running sixteenths and a riser that hands the loop back to bar 1.
  // ----------------------------------------------------------------
  function renderL3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    var hall = S.reverb(ctx, master, { seconds: 3.0, decay: 2.6, wet: 0.30, tone: 6000, lowCut: 300, seed: 0x3D3D });

    // The whole layer swells across the loop, so fading it in mid fight lands
    // somewhere musical no matter where the player is.
    var shape = S.gain(ctx, 0.35, master);
    shape.gain.setValueAtTime(0.35, 0);
    shape.gain.linearRampToValueAtTime(0.5, c.at(5, 1));
    shape.gain.linearRampToValueAtTime(0.7, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(13, 1));
    shape.gain.linearRampToValueAtTime(0.55, loop);

    // ---- tremolo cluster: a minor second, shivering ----
    var trem = S.tremolo(ctx, { rate: 10.5, depth: 0.85, at: 0, until: loop + 3 });
    var band = S.filter(ctx, 'bandpass', 1500, 2.2, shape);
    trem.connect(band);
    S.send(band, hall, 0.4);

    function dyad(lo, hi, at, dur, v) {
      S.tone(ctx, trem, {
        at: at, note: lo, dur: dur, v: v, type: 'sawtooth', voices: 3, detune: 11,
        attack: 0.35, decay: 0.4, sustain: 0.9, release: 0.6, pan: -0.4,
      });
      S.tone(ctx, trem, {
        at: at, note: hi, dur: dur, v: v * 0.85, type: 'sawtooth', voices: 3, detune: 13,
        attack: 0.5, decay: 0.4, sustain: 0.9, release: 0.6, pan: 0.4,
      });
    }
    // bars 1-8 grind A against B flat, bars 9-16 move it up to D against E flat
    dyad('A4', 'A#4', 0, c.bar * 8, 0.055);
    dyad('D5', 'D#5', c.at(9, 1), c.bar * 8, 0.06);

    // ---- root pedal: the floor the dissonance stands on ----
    S.sub(ctx, shape, {
      at: 0, note: 'A1', dur: loop, v: 0.16,
      attack: 1.2, decay: 1, sustain: 0.9, release: 1.4, tone: 130, edge: 0.16,
    });

    // ---- tritone stabs closing each half ----
    S.tone(ctx, shape, {
      at: c.at(8, 1), note: 'D#5', dur: c.beats(1.5), v: 0.1, type: 'sawtooth',
      voices: 4, detune: 16, cutoff: 2600, cutoffTo: 700, q: 2.4,
      attack: 0.01, decay: 0.2, sustain: 0.35, release: 0.5, pan: 0.2,
    });
    S.tone(ctx, shape, {
      at: c.at(16, 1), note: 'D#5', dur: c.beats(2), v: 0.12, type: 'sawtooth',
      voices: 4, detune: 18, cutoff: 3000, cutoffTo: 700, q: 2.4,
      attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6, pan: -0.2,
    });

    // ---- high percussion ----
    var ticks = S.gain(ctx, 1, shape);
    S.send(ticks, hall, 0.3);
    for (var bar = 1; bar <= bars; bar++) {
      for (var s = 0; s < 16; s++) {
        var onBeat = (s % 4 === 0);
        var offBeat = (s % 4 === 2);
        // sixteenths under everything, accents on the offbeats so the layer
        // pulls against the kick instead of doubling it
        var v = onBeat ? 0.05 : (offBeat ? 0.085 : 0.032);
        if (bar < 5 && !onBeat && !offBeat) continue;
        S.noise(ctx, ticks, {
          at: c.step(bar, s), dur: 0.012, v: v,
          type: 'highpass', freq: 9200, q: 0.8,
          pan: (s % 4 === 1 ? -0.45 : (s % 4 === 3 ? 0.45 : 0.05)),
          seed: 41, attack: 0.001, source: 2,
        });
      }
      // a struck metal edge at the top of each phrase
      if (bar % 4 === 1) {
        S.noise(ctx, ticks, {
          at: c.at(bar, 1), dur: 0.7, v: 0.075, type: 'bandpass', freq: 5200, q: 1.4,
          pan: -0.3, seed: 43, attack: 0.002, source: 3,
        });
      }
    }

    // ---- the riser: two bars of pressure handing back to bar 1 ----
    S.noise(ctx, shape, {
      at: c.at(15, 1), dur: c.bar * 2, v: 0.11,
      type: 'bandpass', freq: 320, freqTo: 8200, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 47, pan: 0,
    });
    S.tone(ctx, shape, {
      at: c.at(15, 1), f: 220, glideTo: 880, glideTime: c.bar * 2,
      dur: c.bar * 2, v: 0.055, type: 'sawtooth', voices: 3, detune: 20,
      cutoff: 900, cutoffTo: 5200, cutoffTime: c.bar * 2, q: 3,
      attack: c.bar * 1.8, decay: 0.2, sustain: 0.95, release: 0.15, pan: 0.15,
    });
  }

  var composition = {
    id: 'act1',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'A minor',
    tailSeconds: 2.8,
    notes: 'First act theme. Head, answer, lift, climax, turnaround.',
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
