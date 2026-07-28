// Merit Badge Massacre: "oldnobody", the final boss. 96 bpm, 32 bars, A minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// The first story the woods ever told. The whole piece is a passacaglia on
// the lament bass, A G F E, one bar per step: the oldest four notes in the
// book, walked down over and over while the fight escalates on top. It is in
// act 1's A minor on purpose, and p2 quotes act 1's lead motif once,
// transformed: augmented to double length, dropped an octave onto a horn of
// a sound, with its last note bent to G sharp. The tune the scouts marched
// in on was this story all along.
//
// Form (one chord per bar, eight passes of the lament):
//
//   bars  1-8    Am G F E    Am G F E     the procession
//   bars  9-16   Am G F E7   Dm Am F E    the ground swells
//   bars 17-24   Am G F E    F G Am E     the quote pass, act 1's climax bars
//   bars 25-32   Dm C F E7   Am G F E7    the last walk down
//
// Boss layers STACK as the fight escalates. base must carry the fight alone;
// p2 and p3 are added on top of it, never instead of it:
//   base  processional drums, toll, lament bass    phase 1, stately dread
//   p2    choir, descant, the act 1 quote          phase 2, the story told
//   p3    FLIGHT: double time drums, sprint lead   phase 3, run
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 96;
  var BARS = 32;
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
  // Harmony: eight passes of the lament, two of them varied
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'G', bass: 'G2', pad: ['G3', 'B3', 'D4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E', bass: 'E2', pad: ['E3', 'G#3', 'B3'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'G', bass: 'G2', pad: ['G3', 'B3', 'D4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E', bass: 'E2', pad: ['E3', 'G#3', 'B3'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'G', bass: 'G2', pad: ['G3', 'B3', 'D4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E7', bass: 'E2', pad: ['E3', 'G#3', 'D4'] },
    { name: 'Dm', bass: 'D2', pad: ['D3', 'F3', 'A3'] },
    { name: 'Am', bass: 'A2', pad: ['C4', 'E4', 'A4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E', bass: 'E2', pad: ['E3', 'G#3', 'B3'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'G', bass: 'G2', pad: ['G3', 'B3', 'D4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E', bass: 'E2', pad: ['E3', 'G#3', 'B3'] },
    { name: 'F', bass: 'F2', pad: ['C4', 'F4', 'A4'] },
    { name: 'G', bass: 'G2', pad: ['D4', 'G4', 'B4'] },
    { name: 'Am', bass: 'A2', pad: ['C4', 'E4', 'A4'] },
    { name: 'E', bass: 'E2', pad: ['B3', 'E4', 'G#4'] },
    { name: 'Dm', bass: 'D2', pad: ['D3', 'F3', 'A3'] },
    { name: 'C', bass: 'C2', pad: ['C3', 'E3', 'G3'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E7', bass: 'E2', pad: ['E3', 'G#3', 'D4'] },
    { name: 'Am', bass: 'A2', pad: ['A3', 'C4', 'E4'] },
    { name: 'G', bass: 'G2', pad: ['G3', 'B3', 'D4'] },
    { name: 'F', bass: 'F2', pad: ['F3', 'A3', 'C4'] },
    { name: 'E7', bass: 'E2', pad: ['E3', 'G#3', 'D4'] },
  ];

  // ----------------------------------------------------------------
  // Groove: the procession. Kick on 1 and 3, nothing hurried. The
  // pump list carries both so every layer breathes with the drum.
  // ----------------------------------------------------------------
  function kickTimes(bpm) {
    var c = clock(bpm);
    var out = [];
    for (var bar = 1; bar <= BARS; bar++) {
      out.push(c.at(bar, 1));
      out.push(c.at(bar, 3));
    }
    return out;
  }

  // ----------------------------------------------------------------
  // base: processional drums, the toll, the lament bass
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.55, master);

    var hall = S.reverb(ctx, master, { seconds: 3.0, decay: 2.8, wet: 0.28, tone: 3800, lowCut: 190, preDelay: 0.035, seed: 0x0D01 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, hall, 0.3);

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.3, release: 0.22 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    var tollBus = S.gain(ctx, 0.9, master);
    S.send(tollBus, hall, 0.42);

    // ---- night air, act 1's forest but deeper in ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.05, tone: 600, lowCut: 110, drift: 0.04, driftDepth: 260, pan: -0.15 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.028, tone: 1400, lowCut: 480, drift: 0.028, driftDepth: 600, pan: 0.3, seed: 223 });

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var pass = ((bar - 1) % 4);

      // ---- the procession: kick on 1 and 3 ----
      S.kick(ctx, master, { at: c.at(bar, 1), v: 0.9, fall: 0.4, tune: 45, top: 150, drive: 2.0 });
      S.kick(ctx, master, { at: c.at(bar, 3), v: 0.6, fall: 0.28, tune: 45, top: 130, drive: 2.0 });

      // ---- the toll: a dark bell on the first bar of every pass ----
      if (pass === 0) {
        S.pluck(ctx, tollBus, {
          at: c.at(bar, 1), note: 'A2', dur: c.beats(3.5), v: 0.14,
          pan: 0, open: 1700, close: 380, decay: 0.8, sustain: 0.2, release: 2.2,
        });
        S.tone(ctx, tollBus, {
          at: c.at(bar, 1), f: S.hz('A4') * 1.19, dur: c.beats(1.2), v: 0.03,
          type: 'sine', voices: 1, attack: 0.002, decay: 0.3, sustain: 0.1, release: 0.8,
          pan: 0.1,
        });
      }

      // ---- snare: a military tap on 3, rolls at the sentence ends ----
      S.snare(ctx, perc, { at: c.at(bar, 3), v: 0.22, dur: 0.1, pan: -0.1 });
      if (bar % 8 === 0) {
        for (var r = 0; r < 4; r++) {
          S.snare(ctx, perc, {
            at: c.step(bar, 12 + r), v: 0.12 + r * 0.09, dur: 0.08,
            pan: (r % 2 ? 0.15 : -0.15),
          });
        }
      }

      // ---- the lament bass: half notes walking down forever ----
      S.tone(ctx, bassBus, {
        at: c.at(bar, 1), note: h.bass, dur: c.beats(1.9), v: 0.19,
        type: 'sawtooth', voices: 2, detune: 5,
        cutoff: 1100, cutoffTo: 380, cutoffTime: c.beats(1.6), q: 2.6,
        attack: 0.01, decay: 0.12, sustain: 0.7, release: 0.12,
      });
      S.tone(ctx, bassBus, {
        at: c.at(bar, 3), note: h.bass, dur: c.beats(1.9), v: 0.13,
        type: 'sawtooth', voices: 2, detune: 5,
        cutoff: 800, cutoffTo: 340, cutoffTime: c.beats(1.6), q: 2.6,
        attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.12,
      });
      S.sub(ctx, bassBus, {
        at: c.at(bar, 1), note: S.midi(h.bass) - 12, dur: c.beats(2.2), v: 0.28,
        attack: 0.012, decay: 0.2, sustain: 0.75, release: 0.2, tone: 150,
      });

      // ---- timpani roll into every pass ----
      if (pass === 3) {
        S.noise(ctx, perc, {
          at: c.at(bar, 3), dur: c.beats(2), v: 0.07, type: 'bandpass',
          freq: 130, q: 1.1, shape: 'adsr',
          attack: c.beats(1.7), decay: 0.15, sustain: 0.95, release: 0.2,
          source: 4, seed: 227, pan: -0.1,
        });
      }
    }
  }

  // ----------------------------------------------------------------
  // p2: the choir, the descant, and the act 1 quote
  // ----------------------------------------------------------------

  // Act 1's head motif, quoted once, transformed: augmented to double
  // length, dropped an octave, and the landing note bent from A to G sharp
  // so the old tune curdles into the dominant. Original, act1.js bars 1-2:
  //   E4 A4 C5(2) B4 C5 A4(2) | E4 A4 D5(2) C5 B4 A4(2)  (eighths and quarters)
  // Here, over bars 17 to 20 of the lament:
  var QUOTE = [
    [17, 1, 'E3', 1, 0.8], [17, 2, 'A3', 1, 0.85], [17, 3, 'C4', 2, 0.95],
    [18, 1, 'B3', 1, 0.85], [18, 2, 'C4', 1, 0.85], [18, 3, 'A3', 2, 0.85],
    [19, 1, 'E3', 1, 0.8], [19, 2, 'A3', 1, 0.85], [19, 3, 'D4', 2, 1.0],
    [20, 1, 'C4', 1, 0.9], [20, 2, 'B3', 1, 0.85], [20, 3, 'G#3', 2, 0.9],
  ];

  function renderP2(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.25, master);

    var hall = S.reverb(ctx, master, { seconds: 3.4, decay: 2.6, wet: 0.36, tone: 4000, lowCut: 200, preDelay: 0.04, seed: 0x0D02 });

    var shape = S.gain(ctx, 0.8, master);
    shape.gain.setValueAtTime(0.8, 0);
    shape.gain.linearRampToValueAtTime(1.0, c.at(17, 1));
    shape.gain.linearRampToValueAtTime(0.9, loop);

    var duck = S.gain(ctx, 1, shape);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.26, release: 0.24 });

    var choir = S.gain(ctx, 0.9, duck);
    S.send(choir, hall, 0.38);

    var descant = S.gain(ctx, 0.85, duck);
    S.send(descant, hall, 0.34);

    var horn = S.gain(ctx, 0.9, duck);
    S.send(horn, hall, 0.3);

    // ---- the choir: the pad with a ninth folded in, swelling per pass ----
    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var notes = h.pad.slice();
      notes.push(S.midi(h.pad[0]) + 14);
      S.pad(ctx, choir, {
        at: c.at(bar, 1) - (bar === 1 ? 0 : c.beats(0.3)),
        dur: c.bar + c.beats(0.3),
        notes: notes,
        v: 0.105,
        cutoff: bar >= 17 ? 1400 : 1050,
        breathe: 0.05, breatheDepth: 340,
        attack: bar === 1 ? 1.6 : 0.5, decay: 0.7, sustain: 0.9, release: 0.8,
        detune: 9, spread: 0.6,
      });
    }

    // ---- the descant: one long line over each 8 bar sentence ----
    // [bar, beat, note, beats, velocity]
    var DESCANT = [
      [1, 1, 'E4', 4, 0.7], [2, 1, 'D4', 4, 0.72], [3, 1, 'C4', 4, 0.72], [4, 1, 'B3', 4, 0.75],
      [5, 1, 'C4', 2, 0.7], [5, 3, 'E4', 2, 0.75], [6, 1, 'D4', 4, 0.75], [7, 1, 'C4', 2, 0.72],
      [7, 3, 'A3', 2, 0.7], [8, 1, 'G#3', 4, 0.78],
      [9, 1, 'A4', 4, 0.8], [10, 1, 'G4', 4, 0.78], [11, 1, 'F4', 4, 0.76], [12, 1, 'E4', 2, 0.78],
      [12, 3, 'D4', 2, 0.8], [13, 1, 'F4', 4, 0.8], [14, 1, 'E4', 4, 0.78], [15, 1, 'C4', 4, 0.74],
      [16, 1, 'B3', 4, 0.78],
      [21, 1, 'A4', 4, 0.82], [22, 1, 'B4', 4, 0.85], [23, 1, 'C5', 4, 0.9], [24, 1, 'B4', 4, 0.88],
      [25, 1, 'A4', 4, 0.85], [26, 1, 'G4', 4, 0.8], [27, 1, 'A4', 4, 0.82], [28, 1, 'G#4', 4, 0.88],
      [29, 1, 'A4', 2, 0.85], [29, 3, 'E4', 2, 0.78], [30, 1, 'D4', 4, 0.76], [31, 1, 'C4', 4, 0.74],
      [32, 1, 'B3', 2, 0.76], [32, 3, 'G#3', 2, 0.8],
    ];
    for (var d = 0; d < DESCANT.length; d++) {
      var n = DESCANT[d];
      if (n[0] > bars) continue;
      var dur = c.beats(n[3]) * 0.96;
      S.tone(ctx, descant, {
        at: c.at(n[0], n[1]), note: n[2], dur: dur, v: 0.06 * n[4],
        type: 'triangle', voices: 2, detune: 6,
        cutoff: 2200, cutoffTo: 1200, cutoffTime: Math.min(dur, 1.2), q: 0.9,
        attack: 0.3, decay: 0.5, sustain: 0.85, release: 0.7,
        vibrato: n[3] >= 4 ? 5 : 0, vibratoRate: 4.2,
        pan: 0.12,
      });
    }

    // ---- THE QUOTE: bars 17 to 20, the story says its own name ----
    for (var q = 0; q < QUOTE.length; q++) {
      var m = QUOTE[q];
      if (m[0] > bars) continue;
      var qdur = c.beats(m[3]) * 0.95;
      S.tone(ctx, horn, {
        at: c.at(m[0], m[1]), note: m[2], dur: qdur, v: 0.14 * m[4],
        type: 'sawtooth', voices: 3, detune: 7, sub: 0.3,
        cutoff: 850, cutoffTo: 600, cutoffTime: qdur * 0.8, q: 1.1,
        attack: 0.12, decay: 0.3, sustain: 0.85, release: 0.4,
        vibrato: m[3] >= 2 ? 6 : 0, vibratoRate: 4.0,
        pan: -0.08,
      });
    }
  }

  // ----------------------------------------------------------------
  // p3: FLIGHT
  //
  // Double time drums over the processional pulse, a bass that stops
  // walking and starts running, and a sprint lead. Stacked over base,
  // this is the passacaglia breaking into a run: the story chasing.
  // ----------------------------------------------------------------

  // [bar, beat, note, beats, velocity]. Eighth note running lines in four
  // 8 bar phrases; the peak is the held A5 on bar 31 falling to G sharp.
  var SPRINT = [
    // phrase 1: the run starts low, hammering
    [1, 1, 'A4', 0.5, 0.85], [1, 1.5, 'A4', 0.5, 0.75], [1, 2, 'C5', 0.5, 0.85], [1, 2.5, 'B4', 0.5, 0.78],
    [1, 3, 'A4', 0.5, 0.8], [1, 3.5, 'C5', 0.5, 0.82], [1, 4, 'E5', 1, 0.9],
    [2, 1, 'D5', 0.5, 0.85], [2, 1.5, 'B4', 0.5, 0.78], [2, 2, 'G4', 0.5, 0.75], [2, 2.5, 'B4', 0.5, 0.78],
    [2, 3, 'D5', 1, 0.85], [2, 4, 'B4', 1, 0.78],
    [3, 1, 'C5', 0.5, 0.82], [3, 1.5, 'A4', 0.5, 0.75], [3, 2, 'F4', 0.5, 0.72], [3, 2.5, 'A4', 0.5, 0.76],
    [3, 3, 'C5', 1, 0.84], [3, 4, 'A4', 1, 0.76],
    [4, 1, 'B4', 0.5, 0.8], [4, 1.5, 'G#4', 0.5, 0.82], [4, 2, 'E4', 0.5, 0.72], [4, 2.5, 'G#4', 0.5, 0.8],
    [4, 3, 'B4', 0.5, 0.84], [4, 3.5, 'E5', 1.5, 0.9],
    // phrase 2: same run, higher exit
    [5, 1, 'A4', 0.5, 0.85], [5, 1.5, 'A4', 0.5, 0.75], [5, 2, 'C5', 0.5, 0.85], [5, 2.5, 'B4', 0.5, 0.78],
    [5, 3, 'A4', 0.5, 0.8], [5, 3.5, 'C5', 0.5, 0.82], [5, 4, 'E5', 1, 0.9],
    [6, 1, 'G5', 0.5, 0.9], [6, 1.5, 'D5', 0.5, 0.8], [6, 2, 'B4', 0.5, 0.78], [6, 2.5, 'D5', 0.5, 0.8],
    [6, 3, 'G5', 1, 0.92], [6, 4, 'D5', 1, 0.8],
    [7, 1, 'F5', 0.5, 0.88], [7, 1.5, 'C5', 0.5, 0.78], [7, 2, 'A4', 0.5, 0.75], [7, 2.5, 'C5', 0.5, 0.78],
    [7, 3, 'F5', 1, 0.88], [7, 4, 'A4', 1, 0.75],
    [8, 1, 'E5', 0.5, 0.85], [8, 1.5, 'B4', 0.5, 0.78], [8, 2, 'G#4', 0.5, 0.8], [8, 2.5, 'B4', 0.5, 0.78],
    [8, 3, 'G#4', 0.5, 0.78], [8, 3.5, 'E4', 1.5, 0.75],
    // phrase 3: the chase turns and climbs
    [9, 1, 'E5', 0.5, 0.88], [9, 1.5, 'C5', 0.5, 0.8], [9, 2, 'A4', 0.5, 0.76], [9, 2.5, 'C5', 0.5, 0.8],
    [9, 3, 'E5', 0.5, 0.88], [9, 3.5, 'A5', 1.5, 0.98],
    [10, 1, 'G5', 0.5, 0.9], [10, 1.5, 'D5', 0.5, 0.8], [10, 2, 'B4', 0.5, 0.78], [10, 2.5, 'D5', 0.5, 0.8],
    [10, 3, 'G5', 1, 0.9], [10, 4, 'B4', 1, 0.78],
    [11, 1, 'F5', 0.5, 0.88], [11, 1.5, 'C5', 0.5, 0.78], [11, 2, 'A4', 0.5, 0.75], [11, 2.5, 'C5', 0.5, 0.78],
    [11, 3, 'A5', 1, 0.95], [11, 4, 'F5', 1, 0.85],
    [12, 1, 'G#5', 1, 0.95], [12, 2, 'E5', 0.5, 0.85], [12, 2.5, 'B4', 0.5, 0.78], [12, 3, 'D5', 1, 0.85],
    [12, 4, 'B4', 1, 0.78],
    [13, 1, 'D5', 0.5, 0.85], [13, 1.5, 'A4', 0.5, 0.76], [13, 2, 'F4', 0.5, 0.72], [13, 2.5, 'A4', 0.5, 0.76],
    [13, 3, 'D5', 1, 0.85], [13, 4, 'F5', 1, 0.88],
    [14, 1, 'E5', 0.5, 0.86], [14, 1.5, 'C5', 0.5, 0.78], [14, 2, 'A4', 0.5, 0.75], [14, 2.5, 'C5', 0.5, 0.78],
    [14, 3, 'E5', 1, 0.86], [14, 4, 'A4', 1, 0.75],
    [15, 1, 'F5', 0.5, 0.88], [15, 1.5, 'C5', 0.5, 0.78], [15, 2, 'A4', 0.5, 0.75], [15, 2.5, 'C5', 0.5, 0.78],
    [15, 3, 'F5', 1, 0.88], [15, 4, 'C5', 1, 0.78],
    [16, 1, 'E5', 0.5, 0.86], [16, 1.5, 'B4', 0.5, 0.78], [16, 2, 'G#4', 0.5, 0.8], [16, 2.5, 'B4', 0.5, 0.78],
    [16, 3, 'E5', 2, 0.9],
    // phrase 4: flat out. The runs get longer, the peak arrives, the
    // landing is the leading tone into the loop
    [17, 1, 'A4', 0.5, 0.85], [17, 1.5, 'B4', 0.5, 0.8], [17, 2, 'C5', 0.5, 0.84], [17, 2.5, 'D5', 0.5, 0.84],
    [17, 3, 'E5', 1, 0.9], [17, 4, 'C5', 1, 0.8],
    [18, 1, 'D5', 0.5, 0.85], [18, 1.5, 'E5', 0.5, 0.85], [18, 2, 'F5', 0.5, 0.88], [18, 2.5, 'E5', 0.5, 0.82],
    [18, 3, 'D5', 1, 0.84], [18, 4, 'B4', 1, 0.78],
    [19, 1, 'C5', 0.5, 0.84], [19, 1.5, 'D5', 0.5, 0.82], [19, 2, 'E5', 0.5, 0.85], [19, 2.5, 'F5', 0.5, 0.86],
    [19, 3, 'A5', 1, 0.96], [19, 4, 'F5', 1, 0.86],
    [20, 1, 'G#5', 1.5, 0.96], [20, 2.5, 'E5', 0.5, 0.85], [20, 3, 'B4', 2, 0.8],
    [21, 1, 'A4', 0.5, 0.82], [21, 1.5, 'C5', 0.5, 0.82], [21, 2, 'F5', 1, 0.9], [21, 3, 'E5', 0.5, 0.85],
    [21, 3.5, 'C5', 0.5, 0.78], [21, 4, 'A4', 1, 0.75],
    [22, 1, 'B4', 0.5, 0.82], [22, 1.5, 'D5', 0.5, 0.84], [22, 2, 'G5', 1, 0.94], [22, 3, 'F5', 0.5, 0.86],
    [22, 3.5, 'D5', 0.5, 0.8], [22, 4, 'B4', 1, 0.78],
    [23, 1, 'C5', 0.5, 0.84], [23, 1.5, 'E5', 0.5, 0.86], [23, 2, 'A5', 1, 0.98], [23, 3, 'E5', 1, 0.88],
    [23, 4, 'C5', 1, 0.8],
    [24, 1, 'B4', 0.5, 0.82], [24, 1.5, 'E5', 0.5, 0.86], [24, 2, 'G#5', 1, 0.96], [24, 3, 'B5', 1.5, 1.0],
    [25, 1, 'A5', 0.5, 0.95], [25, 1.5, 'F5', 0.5, 0.86], [25, 2, 'D5', 0.5, 0.8], [25, 2.5, 'F5', 0.5, 0.84],
    [25, 3, 'A5', 1, 0.95], [25, 4, 'D5', 1, 0.8],
    [26, 1, 'G5', 0.5, 0.9], [26, 1.5, 'E5', 0.5, 0.84], [26, 2, 'C5', 0.5, 0.78], [26, 2.5, 'E5', 0.5, 0.82],
    [26, 3, 'G5', 1, 0.9], [26, 4, 'E5', 1, 0.82],
    [27, 1, 'F5', 0.5, 0.88], [27, 1.5, 'A5', 0.5, 0.94], [27, 2, 'C6', 1, 1.0], [27, 3, 'A5', 1, 0.94],
    [27, 4, 'F5', 1, 0.86],
    [28, 1, 'E5', 0.5, 0.86], [28, 1.5, 'G#5', 0.5, 0.92], [28, 2, 'B5', 1, 0.98], [28, 3, 'G#5', 0.5, 0.9],
    [28, 3.5, 'D5', 0.5, 0.8], [28, 4, 'B4', 1, 0.76],
    [29, 1, 'A4', 0.5, 0.8], [29, 1.5, 'D5', 0.5, 0.82], [29, 2, 'F5', 0.5, 0.86], [29, 2.5, 'A5', 0.5, 0.92],
    [29, 3, 'D6', 1, 1.0], [29, 4, 'A5', 1, 0.92],
    [30, 1, 'B5', 0.5, 0.94], [30, 1.5, 'G5', 0.5, 0.88], [30, 2, 'E5', 0.5, 0.84], [30, 2.5, 'G5', 0.5, 0.86],
    [30, 3, 'B5', 1, 0.94], [30, 4, 'G5', 1, 0.86],
    [31, 1, 'A5', 2.5, 1.0], [31, 3.5, 'E5', 1.5, 0.88],
    [32, 1, 'C5', 1, 0.84], [32, 2, 'B4', 1, 0.82], [32, 3, 'G#4', 2, 0.9],
  ];

  function renderP3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.6, master);

    var hall = S.reverb(ctx, master, { seconds: 2.2, decay: 3.4, wet: 0.24, tone: 5000, lowCut: 280, preDelay: 0.02, seed: 0x0D03 });
    var slap = S.echo(ctx, master, { time: c.beats(0.5), feedback: 0.26, damp: 2600, lowCut: 460, mix: 0.16 });

    var shape = S.gain(ctx, 0.7, master);
    shape.gain.setValueAtTime(0.7, 0);
    shape.gain.linearRampToValueAtTime(0.85, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(17, 1));
    shape.gain.linearRampToValueAtTime(0.8, loop);

    var perc = S.gain(ctx, 0.9, shape);
    S.send(perc, hall, 0.16);

    var runBass = S.gain(ctx, 0.9, shape);

    var lead = S.gain(ctx, 0.85, shape);
    S.send(lead, hall, 0.24);
    S.send(lead, slap, 0.4);

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];

      // ---- double time drums. The base already owns beats 1 and 3, so
      //      this layer fills only the between-kicks: stacked, the two
      //      stems complete the sprint grid without ever doubling a hit ----
      for (var e = 0; e < 8; e++) {
        var kst = e * 2;
        if (kst === 0 || kst === 8) continue;
        S.kick(ctx, perc, {
          at: c.step(bar, kst), v: kst % 8 === 4 ? 0.5 : 0.36,
          fall: 0.13, tune: 52, top: 140, sweep: 0.04, drive: 1.9,
        });
      }
      S.snare(ctx, perc, { at: c.step(bar, 4), v: 0.34, dur: 0.1 });
      S.snare(ctx, perc, { at: c.step(bar, 12), v: 0.38, dur: 0.1 });
      for (var s = 0; s < 16; s++) {
        S.hat(ctx, perc, {
          at: c.step(bar, s), v: s % 4 === 2 ? 0.075 : 0.045,
          pan: s % 2 ? 0.2 : 0.05,
        });
      }
      if (bar % 8 === 0) {
        S.snare(ctx, perc, { at: c.step(bar, 14), v: 0.28, dur: 0.09, pan: -0.2 });
        S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.36, dur: 0.1, pan: 0.2 });
      }

      // ---- the running bass: eighths, root and octave ----
      for (var rb = 0; rb < 8; rb++) {
        var up = rb % 2 === 1 ? 12 : 0;
        var dur = c.beats(0.4);
        S.tone(ctx, runBass, {
          at: c.step(bar, rb * 2), note: S.midi(h.bass) + up, dur: dur,
          v: rb % 4 === 0 ? 0.14 : 0.1,
          type: 'sawtooth', voices: 2, detune: 5,
          cutoff: rb % 4 === 0 ? 1600 : 1100, cutoffTo: 480, cutoffTime: dur * 0.8, q: 3.2,
          attack: 0.003, decay: 0.05, sustain: 0.5, release: 0.05,
        });
      }
    }

    // ---- the sprint lead ----
    for (var i = 0; i < SPRINT.length; i++) {
      var n = SPRINT[i];
      if (n[0] > bars) continue;
      var beats = n[3];
      var vel = n[4];
      var ndur = c.beats(beats) * (beats > 1 ? 0.92 : 0.8);
      var long = beats >= 1.5;
      S.tone(ctx, lead, {
        at: c.at(n[0], n[1]), note: n[2], dur: ndur, v: 0.15 * vel,
        type: 'sawtooth', voices: 3, detune: 8,
        cutoff: 1300 + 2600 * vel, cutoffTo: 1400, cutoffTime: Math.min(ndur, 0.25), q: 1.7,
        attack: long ? 0.02 : 0.007, decay: 0.08, sustain: 0.7, release: long ? 0.24 : 0.11,
        vibrato: long ? 8 : 0, vibratoRate: 5.6,
        pan: -0.06,
      });
      S.tone(ctx, lead, {
        at: c.at(n[0], n[1]), note: S.midi(n[2]) + 12, dur: ndur * 0.75, v: 0.04 * vel,
        type: 'triangle', voices: 2, detune: 5,
        attack: long ? 0.02 : 0.01, decay: 0.07, sustain: 0.5, release: 0.1,
        pan: 0.13,
      });
    }

    // ---- the riser into the loop: the story catches up ----
    S.noise(ctx, shape, {
      at: c.at(31, 1), dur: c.bar * 2, v: 0.1,
      type: 'bandpass', freq: 360, freqTo: 8400, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 229, pan: 0,
    });
    S.tone(ctx, shape, {
      at: c.at(31, 1), f: 220, glideTo: 880, glideTime: c.bar * 2,
      dur: c.bar * 2, v: 0.05, type: 'sawtooth', voices: 3, detune: 20,
      cutoff: 900, cutoffTo: 5600, cutoffTime: c.bar * 2, q: 3,
      attack: c.bar * 1.8, decay: 0.2, sustain: 0.95, release: 0.15, pan: 0.12,
    });
  }

  var composition = {
    id: 'oldnobody',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'A minor',
    tailSeconds: 3.5,
    notes: 'OLD NOBODY. A lament bass passacaglia; p3 turns it into flight.',
    layers: [
      { id: 'base', render: renderBase },
      { id: 'p2', render: renderP2 },
      { id: 'p3', render: renderP3 },
    ],
  };

  root.MBM_COMPOSITIONS = root.MBM_COMPOSITIONS || [];
  root.MBM_COMPOSITIONS.push(composition);
  if (typeof module !== 'undefined' && module.exports) module.exports = composition;
})();
