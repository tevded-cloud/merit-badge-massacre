// Merit Badge Massacre: "bramblebuck", the jackalope boss. 128 bpm, 32 bars,
// G minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// A huge jackalope: bounding, rhythmic, mischief turned menace. Everything in
// the piece leaps: the bass bounds root to octave, the drums hop on the and
// of 2, the lead jumps sixths and octaves and lands where you did not expect
// it. The mischief is the dorian E natural over the C bars; the menace is the
// F sharp over the D bars, the same harmonic minor trick the whole forest
// runs on.
//
// Form (one chord per bar, four 8 bar sentences):
//
//   bars  1-8    A   Gm Gm Bb C   Gm Gm Bb D      the bound, lands on menace
//   bars  9-16   B   Eb Eb C C    Eb F  D  D7     mischief ground, V pedal out
//   bars 17-24   A'  Gm Gm Bb C   Gm Bb Eb D      the bound again, wider
//   bars 25-32   C   Cm Cm Gm Gm  Eb F  Gm D7     the stalk, then the climb
//
// Boss layers STACK as the fight escalates. base must carry the fight alone;
// p2 and p3 are added on top of it, never instead of it:
//   base  gallop drums, bounding bass, air     phase 1, always audible
//   p2    gallop hats, stabs, counter riff     phase 2 joins
//   p3    the menace lead, shimmer, risers     phase 3 joins
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 128;
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
  // Harmony: 32 bars. E natural in the C bars is the mischief, F sharp
  // in the D bars is the menace.
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['F3', 'Bb3', 'D4'] },
    { name: 'C', bass: 'C3', pad: ['G3', 'C4', 'E4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Gm', bass: 'G2', pad: ['Bb3', 'D4', 'G4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['F3', 'Bb3', 'D4'] },
    { name: 'D', bass: 'D3', pad: ['F#3', 'A3', 'D4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['G3', 'Bb3', 'Eb4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['G3', 'Bb3', 'Eb4'] },
    { name: 'C', bass: 'C3', pad: ['G3', 'C4', 'E4'] },
    { name: 'C', bass: 'C3', pad: ['G3', 'C4', 'E4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['Bb3', 'Eb4', 'G4'] },
    { name: 'F', bass: 'F2', pad: ['A3', 'C4', 'F4'] },
    { name: 'D', bass: 'D3', pad: ['F#3', 'A3', 'D4'] },
    { name: 'D7', bass: 'D3', pad: ['F#3', 'C4', 'D4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['F3', 'Bb3', 'D4'] },
    { name: 'C', bass: 'C3', pad: ['G3', 'C4', 'E4'] },
    { name: 'Gm', bass: 'G2', pad: ['Bb3', 'D4', 'G4'] },
    { name: 'Bb', bass: 'Bb2', pad: ['Bb3', 'D4', 'F4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['Bb3', 'Eb4', 'G4'] },
    { name: 'D', bass: 'D3', pad: ['F#3', 'A3', 'D4'] },
    { name: 'Cm', bass: 'C3', pad: ['G3', 'C4', 'Eb4'] },
    { name: 'Cm', bass: 'C3', pad: ['G3', 'C4', 'Eb4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Gm', bass: 'G2', pad: ['G3', 'Bb3', 'D4'] },
    { name: 'Eb', bass: 'Eb2', pad: ['Bb3', 'Eb4', 'G4'] },
    { name: 'F', bass: 'F2', pad: ['A3', 'C4', 'F4'] },
    { name: 'Gm', bass: 'G2', pad: ['Bb3', 'D4', 'G4'] },
    { name: 'D7', bass: 'D3', pad: ['F#3', 'C4', 'D4'] },
  ];

  // ----------------------------------------------------------------
  // Groove: the bound. Kick lands on 1 and 3, hops on the and of 2,
  // tom hits on the offbeat sixteenths make the gallop.
  // ----------------------------------------------------------------
  var KICK_STEPS = [0, 6, 8];
  var KICK_FILL = [0, 6, 8, 14];            // every 4th bar
  var KICK_LAST = [0, 6, 8, 10, 12, 14];    // bar 32

  function kickSteps(bar) {
    if (bar === 32) return KICK_LAST;
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
  // base: gallop drums, bounding bass, thorny air
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.55, master);

    var room = S.reverb(ctx, master, { seconds: 1.6, decay: 4.6, wet: 0.18, tone: 4400, lowCut: 280, seed: 0xBB01 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, room, 0.24);

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.34, release: 0.15 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    // ---- bramble air: night forest with a bright scratch in it ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.05, tone: 800, lowCut: 130, drift: 0.05, driftDepth: 320, pan: -0.15 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.025, tone: 2600, lowCut: 900, drift: 0.034, driftDepth: 900, pan: 0.3, seed: 107 });

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var next = HARMONY[bar % HARMONY.length];
      var lastOfPhrase = (bar % 4 === 0);

      // ---- kick: the landing ----
      var ks = kickSteps(bar);
      for (var k = 0; k < ks.length; k++) {
        var strong = ks[k] === 0 || ks[k] === 8;
        S.kick(ctx, master, {
          at: c.step(bar, ks[k]),
          v: strong ? 0.92 : 0.6,
          fall: strong ? 0.3 : 0.2,
          tune: 48, top: strong ? 160 : 140, drive: 2.0,
        });
      }

      // ---- tom hops: the spring in the step, steps 3 and 11 ----
      S.kick(ctx, perc, { at: c.step(bar, 3), v: 0.4, fall: 0.11, tune: 82, top: 220, sweep: 0.035, drive: 1.6, tone: 3600 });
      S.kick(ctx, perc, { at: c.step(bar, 11), v: 0.36, fall: 0.1, tune: 96, top: 250, sweep: 0.035, drive: 1.6, tone: 3600 });

      // ---- backbeat with a ghost right before it: a skip, not a march ----
      S.snare(ctx, perc, { at: c.step(bar, 4), v: 0.46 });
      S.snare(ctx, perc, { at: c.step(bar, 11), v: 0.1, dur: 0.07 });
      S.snare(ctx, perc, { at: c.step(bar, 12), v: 0.5 });
      if (bar === 8 || bar === 16 || bar === 24 || bar === 32) {
        S.snare(ctx, perc, { at: c.step(bar, 13), v: 0.28, dur: 0.1, pan: -0.25 });
        S.snare(ctx, perc, { at: c.step(bar, 14), v: 0.36, dur: 0.1, pan: 0.2 });
        S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.48, dur: 0.11, pan: 0 });
      }

      // ---- bass: bounding, root to octave and back down ----
      // steps: 0 root long, 3 octave hop, 6 root, 8 root accent, 11 octave,
      // 14 approach into the next bar
      var pat = [
        { st: 0, up: 0, dur: 0.7, acc: true },
        { st: 3, up: 12, dur: 0.35, acc: false },
        { st: 6, up: 0, dur: 0.4, acc: false },
        { st: 8, up: 0, dur: 0.7, acc: true },
        { st: 11, up: 12, dur: 0.35, acc: false },
        { st: 14, up: 0, dur: 0.4, acc: false },
      ];
      for (var b = 0; b < pat.length; b++) {
        var p = pat[b];
        var note = S.midi(h.bass) + p.up;
        if (p.st === 14) {
          note = lastOfPhrase ? S.midi(next.bass) - 1 : S.midi(h.bass) + 7;
        }
        var dur = c.beats(p.dur);
        S.tone(ctx, bassBus, {
          at: c.step(bar, p.st), note: note, dur: dur, v: p.acc ? 0.2 : 0.13,
          type: 'sawtooth', voices: 2, detune: 5,
          cutoff: p.acc ? 1700 : 1100, cutoffTo: 450, cutoffTime: dur * 0.8, q: 3.2,
          attack: 0.004, decay: 0.06, sustain: 0.55, release: 0.06,
        });
        if (p.acc) {
          S.sub(ctx, bassBus, {
            at: c.step(bar, p.st), note: S.midi(h.bass) - 12, dur: c.beats(0.8), v: 0.28,
            attack: 0.008, decay: 0.1, sustain: 0.7, release: 0.1, tone: 165,
          });
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // p2: gallop hats, offbeat stabs, and a counter riff that hops
  // ----------------------------------------------------------------
  function renderP2(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.25, master);

    var hall = S.reverb(ctx, master, { seconds: 2.2, decay: 3.4, wet: 0.28, tone: 4600, lowCut: 260, preDelay: 0.024, seed: 0xBB02 });

    // gentle shape so a mid fight fade in lands somewhere musical
    var shape = S.gain(ctx, 0.75, master);
    shape.gain.setValueAtTime(0.75, 0);
    shape.gain.linearRampToValueAtTime(1.0, c.at(17, 1));
    shape.gain.linearRampToValueAtTime(0.85, loop);

    var duck = S.gain(ctx, 1, shape);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.3, release: 0.15 });

    var perc = S.gain(ctx, 0.9, shape);
    S.send(perc, hall, 0.2);

    var stab = S.gain(ctx, 0.85, duck);
    S.send(stab, hall, 0.26);

    var riff = S.gain(ctx, 0.85, duck);
    S.send(riff, hall, 0.24);
    var slap = S.echo(ctx, shape, { time: c.beats(0.75), feedback: 0.28, damp: 2400, lowCut: 420, mix: 0.2 });
    S.send(riff, slap, 0.4);

    // the counter riff: a two bar hop that answers the bass
    // [stepInTwoBars, degreeIndex into pad, octaveShift, beats, velocity]
    var RIFF = [
      [2, 0, 0, 0.4, 0.8], [6, 2, 0, 0.4, 0.9], [10, 1, 0, 0.4, 0.75],
      [14, 2, 12, 0.4, 0.95], [18, 0, 12, 0.4, 0.85], [22, 2, 0, 0.4, 0.8],
      [26, 1, 0, 0.6, 0.75],
    ];

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];

      // ---- gallop hats: dugga-da dugga-da ----
      var gallop = [0, 3, 4, 8, 11, 12];
      for (var g = 0; g < gallop.length; g++) {
        S.hat(ctx, perc, {
          at: c.step(bar, gallop[g]),
          v: gallop[g] % 8 === 0 ? 0.075 : 0.11,
          pan: gallop[g] % 8 === 3 ? 0.25 : 0.1,
        });
      }
      // shaker sixteenths through the back half of each sentence
      if (bar % 8 >= 5 || bar % 8 === 0) {
        for (var s = 1; s < 16; s += 2) {
          S.hat(ctx, perc, { at: c.step(bar, s), v: 0.04, freq: 9500, pan: -0.2 });
        }
      }
      // open hat closing each 4 bar phrase
      if (bar % 4 === 0) {
        S.hat(ctx, perc, { at: c.step(bar, 14), v: 0.1, open: true, pan: 0.15 });
      }

      // ---- stabs: two note chips on the hops ----
      var mid = h.pad[1];
      var top = h.pad[2];
      S.pluck(ctx, stab, { at: c.step(bar, 6), note: mid, dur: c.beats(0.4), v: 0.09, pan: -0.3, open: 3800, close: 750 });
      S.pluck(ctx, stab, { at: c.step(bar, 6), note: top, dur: c.beats(0.4), v: 0.07, pan: -0.2, open: 4200, close: 800 });
      S.pluck(ctx, stab, { at: c.step(bar, 14), note: top, dur: c.beats(0.4), v: 0.1, pan: 0.3, open: 4400, close: 850 });

      // ---- counter riff on odd bars, answering the bass bound ----
      if (bar % 2 === 1) {
        for (var r = 0; r < RIFF.length; r++) {
          var n = RIFF[r];
          var st = n[0];
          var useBar = bar + (st >= 16 ? 1 : 0);
          if (useBar > bars) continue;
          var hh = HARMONY[(useBar - 1) % HARMONY.length];
          var note = S.midi(hh.pad[n[1]]) + n[2];
          S.pluck(ctx, riff, {
            at: c.step(useBar, st % 16), note: note, dur: c.beats(n[3]), v: 0.085 * n[4],
            pan: (r % 2 ? 0.2 : -0.2), open: 3200, close: 640,
          });
        }
      }

      // ---- a light pad so p2 thickens the harmony, not just the rhythm ----
      S.pad(ctx, duck, {
        at: c.at(bar, 1) - (bar === 1 ? 0 : c.beats(0.1)),
        dur: c.bar + c.beats(0.1), notes: h.pad, v: 0.075,
        cutoff: 1300, breathe: 0.08, breatheDepth: 420,
        attack: bar === 1 ? 0.5 : 0.2, decay: 0.5, sustain: 0.85, release: 0.4,
        detune: 7, spread: 0.55,
      });
    }
  }

  // ----------------------------------------------------------------
  // p3: the menace lead, high shimmer, risers
  //
  // [bar, beat, note, beats, velocity]. The tune bounds: sixths, sevenths
  // and octaves, landing on the mischief E over C and the menace F sharp
  // over D. Written in four 8 bar phrases matching the harmony sentences.
  // ----------------------------------------------------------------
  var MELODY = [
    // phrase A: the bound
    [1, 1, 'G4', 1, 0.85], [1, 2.5, 'D5', 0.5, 0.8], [1, 3, 'Bb4', 1.5, 0.82],
    [2, 1, 'G4', 0.5, 0.72], [2, 1.5, 'G5', 1.5, 0.95], [2, 3, 'F5', 0.5, 0.8], [2, 3.5, 'D5', 1.5, 0.82],
    [3, 1, 'F5', 1, 0.85], [3, 2.5, 'D5', 0.5, 0.75], [3, 3, 'Bb4', 1, 0.78], [3, 4, 'D5', 1, 0.8],
    [4, 1, 'E5', 1.5, 0.88], [4, 2.5, 'C5', 0.5, 0.75], [4, 3, 'G4', 2, 0.76],
    [5, 1, 'G4', 1, 0.82], [5, 2.5, 'D5', 0.5, 0.78], [5, 3, 'Bb4', 1.5, 0.8],
    [6, 1, 'G5', 1, 0.92], [6, 2, 'A5', 0.5, 0.85], [6, 2.5, 'G5', 0.5, 0.8], [6, 3, 'D5', 2, 0.82],
    [7, 1, 'F5', 1, 0.85], [7, 2, 'Bb4', 1, 0.75], [7, 3, 'D5', 1, 0.8], [7, 4, 'F5', 1, 0.85],
    [8, 1, 'F#5', 2, 0.95], [8, 3, 'A5', 1, 0.9], [8, 4, 'D5', 1, 0.8],

    // phrase B: mischief ground, staccato hops
    [9, 1, 'Eb5', 0.5, 0.8], [9, 1.5, 'Bb4', 0.5, 0.72], [9, 2, 'G5', 1, 0.88], [9, 3, 'Eb5', 1, 0.8],
    [10, 1, 'D5', 0.5, 0.75], [10, 1.5, 'Bb4', 0.5, 0.7], [10, 2, 'F5', 1, 0.84], [10, 3, 'D5', 1, 0.78],
    [11, 1, 'E5', 1, 0.85], [11, 2.5, 'G5', 0.5, 0.82], [11, 3, 'C5', 1.5, 0.75],
    [12, 1, 'E5', 0.5, 0.78], [12, 1.5, 'F5', 0.5, 0.78], [12, 2, 'G5', 1.5, 0.88], [12, 4, 'E5', 1, 0.8],
    [13, 1, 'Eb5', 1, 0.82], [13, 2, 'G5', 1, 0.88], [13, 3, 'Bb5', 1.5, 0.95],
    [14, 1, 'A5', 1, 0.9], [14, 2, 'F5', 1, 0.8], [14, 3, 'C5', 1, 0.75], [14, 4, 'A4', 1, 0.72],
    [15, 1, 'F#5', 1.5, 0.92], [15, 3, 'D5', 1, 0.8], [15, 4, 'A4', 1, 0.75],
    [16, 1, 'F#4', 1, 0.8], [16, 2, 'A4', 1, 0.82], [16, 3, 'C5', 1, 0.85], [16, 4, 'D5', 1, 0.88],

    // phrase A': the bound again, reaching further
    [17, 1, 'G4', 1, 0.85], [17, 2.5, 'D5', 0.5, 0.8], [17, 3, 'Bb4', 1.5, 0.82],
    [18, 1, 'G4', 0.5, 0.72], [18, 1.5, 'G5', 1.5, 0.95], [18, 3, 'F5', 0.5, 0.8], [18, 3.5, 'D5', 1.5, 0.82],
    [19, 1, 'F5', 1, 0.85], [19, 2.5, 'D5', 0.5, 0.75], [19, 3, 'Bb4', 1, 0.78], [19, 4, 'D5', 1, 0.8],
    [20, 1, 'E5', 1.5, 0.88], [20, 2.5, 'C5', 0.5, 0.75], [20, 3, 'G4', 2, 0.76],
    [21, 1, 'G4', 1, 0.82], [21, 2.5, 'D5', 0.5, 0.78], [21, 3, 'Bb4', 1.5, 0.8],
    [22, 1, 'D5', 0.5, 0.78], [22, 1.5, 'Bb5', 1.5, 0.95], [22, 3, 'G5', 1, 0.85],
    [23, 1, 'Eb5', 1, 0.82], [23, 2, 'G5', 1, 0.86], [23, 3, 'Bb4', 1, 0.75], [23, 4, 'Eb5', 1, 0.82],
    [24, 1, 'F#5', 1.5, 0.95], [24, 3, 'D5', 0.5, 0.8], [24, 3.5, 'A4', 1.5, 0.75],

    // phrase C: the stalk, low and coiled, then the climb out
    [25, 1, 'C5', 1, 0.8], [25, 2.5, 'G4', 0.5, 0.72], [25, 3, 'Eb5', 1.5, 0.85],
    [26, 1, 'D5', 0.5, 0.78], [26, 1.5, 'C5', 0.5, 0.72], [26, 2, 'G4', 2, 0.74],
    [27, 1, 'G4', 1, 0.78], [27, 2.5, 'Bb4', 0.5, 0.75], [27, 3, 'D5', 1.5, 0.85],
    [28, 1, 'G5', 2, 0.95], [28, 3, 'D5', 1, 0.82], [28, 4, 'Bb4', 1, 0.76],
    [29, 1, 'Eb5', 1, 0.85], [29, 2, 'G5', 1, 0.9], [29, 3, 'Bb5', 2, 1.0],
    [30, 1, 'A5', 1, 0.95], [30, 2, 'F5', 1, 0.85], [30, 3, 'C5', 1, 0.78], [30, 4, 'F5', 1, 0.85],
    [31, 1, 'G5', 1.5, 0.95], [31, 2.5, 'D5', 0.5, 0.82], [31, 3, 'Bb4', 1, 0.75], [31, 4, 'G4', 1, 0.72],
    [32, 1, 'F#4', 0.5, 0.78], [32, 1.5, 'A4', 0.5, 0.8], [32, 2, 'C5', 0.5, 0.84], [32, 2.5, 'D5', 0.5, 0.86],
    [32, 3, 'F#5', 2, 0.98],
  ];

  function renderP3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.3, master);

    var hall = S.reverb(ctx, master, { seconds: 2.4, decay: 3.2, wet: 0.28, tone: 5200, lowCut: 280, preDelay: 0.024, seed: 0xBB03 });
    var slap = S.echo(ctx, master, { time: c.beats(0.75), feedback: 0.3, damp: 2400, lowCut: 420, mix: 0.2 });

    var shape = S.gain(ctx, 0.7, master);
    shape.gain.setValueAtTime(0.7, 0);
    shape.gain.linearRampToValueAtTime(0.85, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(25, 1));
    shape.gain.linearRampToValueAtTime(0.8, loop);

    var lead = S.gain(ctx, 0.85, shape);
    S.send(lead, hall, 0.26);
    S.send(lead, slap, 0.45);

    for (var i = 0; i < MELODY.length; i++) {
      var n = MELODY[i];
      var bar = n[0];
      if (bar > bars) continue;
      var t = c.at(bar, n[1]);
      var beats = n[3];
      var vel = n[4];
      var dur = c.beats(beats) * (beats > 1 ? 0.92 : 0.82);
      var long = beats >= 1.5;

      S.tone(ctx, lead, {
        at: t, note: n[2], dur: dur, v: 0.16 * vel,
        type: 'sawtooth', voices: 3, detune: 8,
        cutoff: 1200 + 2600 * vel, cutoffTo: 1300, cutoffTime: Math.min(dur, 0.3), q: 1.6,
        attack: long ? 0.024 : 0.01, decay: 0.1, sustain: 0.72, release: long ? 0.26 : 0.15,
        vibrato: long ? 7 : 0, vibratoRate: 5.5,
        pan: -0.06,
      });
      S.tone(ctx, lead, {
        at: t, note: S.midi(n[2]) + 12, dur: dur * 0.8, v: 0.04 * vel,
        type: 'triangle', voices: 2, detune: 4,
        attack: long ? 0.026 : 0.012, decay: 0.09, sustain: 0.5, release: 0.14,
        pan: 0.12,
      });
    }

    // ---- antler shimmer: a high minor second, rattling ----
    var trem = S.tremolo(ctx, { rate: 11, depth: 0.85, at: 0, until: loop + 3 });
    var band = S.filter(ctx, 'bandpass', 1900, 2.2, shape);
    trem.connect(band);
    S.send(band, hall, 0.35);

    S.tone(ctx, trem, {
      at: c.at(9, 1), note: 'G5', dur: c.bar * 8, v: 0.04, type: 'sawtooth', voices: 3, detune: 12,
      attack: 0.5, decay: 0.4, sustain: 0.9, release: 0.6, pan: -0.4,
    });
    S.tone(ctx, trem, {
      at: c.at(9, 1), note: 'Ab5', dur: c.bar * 8, v: 0.034, type: 'sawtooth', voices: 3, detune: 13,
      attack: 0.7, decay: 0.4, sustain: 0.9, release: 0.6, pan: 0.4,
    });
    S.tone(ctx, trem, {
      at: c.at(25, 1), note: 'D5', dur: c.bar * 8, v: 0.045, type: 'sawtooth', voices: 3, detune: 12,
      attack: 0.5, decay: 0.4, sustain: 0.9, release: 0.6, pan: -0.4,
    });
    S.tone(ctx, trem, {
      at: c.at(25, 1), note: 'Eb5', dur: c.bar * 8, v: 0.038, type: 'sawtooth', voices: 3, detune: 13,
      attack: 0.7, decay: 0.4, sustain: 0.9, release: 0.6, pan: 0.4,
    });

    // ---- risers into each half's turnaround ----
    S.noise(ctx, shape, {
      at: c.at(15, 1), dur: c.bar * 2, v: 0.08,
      type: 'bandpass', freq: 340, freqTo: 6800, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 109, pan: 0.1,
    });
    S.noise(ctx, shape, {
      at: c.at(31, 1), dur: c.bar * 2, v: 0.11,
      type: 'bandpass', freq: 300, freqTo: 8600, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 113, pan: -0.1,
    });
    S.tone(ctx, shape, {
      at: c.at(31, 1), f: 196, glideTo: 784, glideTime: c.bar * 2,
      dur: c.bar * 2, v: 0.05, type: 'sawtooth', voices: 3, detune: 20,
      cutoff: 900, cutoffTo: 5200, cutoffTime: c.bar * 2, q: 3,
      attack: c.bar * 1.8, decay: 0.2, sustain: 0.95, release: 0.15, pan: 0.15,
    });
  }

  var composition = {
    id: 'bramblebuck',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'G minor',
    tailSeconds: 3,
    notes: 'BRAMBLEBUCK. Bounding gallop, mischief E naturals, menace F sharps.',
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
