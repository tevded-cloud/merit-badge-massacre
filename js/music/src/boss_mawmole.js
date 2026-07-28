// Merit Badge Massacre: "mawmole", the star nosed mole boss. 70 bpm, 32 bars,
// F minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// Subterranean, blind, seismic. The piece crawls: seismic hits that drop in
// pitch, a sub drone that never quite settles, and the feelers: skittering
// tick clusters panned hard, the star nose reading the dark. The Neapolitan
// G flat bars are the ground shifting; the C bars carry E natural, F minor's
// harmonic minor leading tone, the same dread the rest of the forest runs on.
//
// Form (one chord per bar, four 8 bar sentences over a crawling drone):
//
//   bars  1-8    A   Fm Fm Fm Db  Fm Fm Gb C     the crawl, first shift
//   bars  9-16   B   Fm Db Bbm C  Fm Gb Fm C7    the ground moves in twos
//   bars 17-24   C   Bbm Bbm Fm Fm  Db Db Gb C   deeper, the cold layer
//   bars 25-32   A'  Fm Db Bbm C  Fm Gb C7 C7    the crawl again, V pedal out
//
// Boss layers STACK as the fight escalates. base must carry the fight alone;
// p2 and p3 are added on top of it, never instead of it:
//   base  seismic hits, sub drone, rumble       phase 1, always audible
//   p2    sonar toll, cluster pad, feelers      phase 2 joins
//   p3    the drill: driving eighths, climb     phase 3 joins
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 70;
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
  // Harmony: 32 bars. Gb is the Neapolitan, C and C7 carry E natural.
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Db', bass: 'Db2', pad: ['F3', 'Ab3', 'Db4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'C4', 'Ab4'] },
    { name: 'Gb', bass: 'Gb2', pad: ['Gb3', 'Bb3', 'Db4'] },
    { name: 'C', bass: 'C2', pad: ['E3', 'G3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Db', bass: 'Db2', pad: ['F3', 'Ab3', 'Db4'] },
    { name: 'Bbm', bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4'] },
    { name: 'C', bass: 'C2', pad: ['E3', 'G3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Gb', bass: 'Gb2', pad: ['Gb3', 'Bb3', 'Db4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'C4', 'Ab4'] },
    { name: 'C7', bass: 'C2', pad: ['E3', 'Bb3', 'C4'] },
    { name: 'Bbm', bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4'] },
    { name: 'Bbm', bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Db', bass: 'Db2', pad: ['Ab3', 'Db4', 'F4'] },
    { name: 'Db', bass: 'Db2', pad: ['Ab3', 'Db4', 'F4'] },
    { name: 'Gb', bass: 'Gb2', pad: ['Gb3', 'Bb3', 'Db4'] },
    { name: 'C', bass: 'C2', pad: ['E3', 'G3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Db', bass: 'Db2', pad: ['F3', 'Ab3', 'Db4'] },
    { name: 'Bbm', bass: 'Bb1', pad: ['F3', 'Bb3', 'Db4'] },
    { name: 'C', bass: 'C2', pad: ['E3', 'G3', 'C4'] },
    { name: 'Fm', bass: 'F2', pad: ['F3', 'Ab3', 'C4'] },
    { name: 'Gb', bass: 'Gb2', pad: ['Gb3', 'Bb3', 'Db4'] },
    { name: 'C7', bass: 'C2', pad: ['E3', 'Bb3', 'C4'] },
    { name: 'C7', bass: 'C2', pad: ['E3', 'Bb3', 'C4'] },
  ];

  // ----------------------------------------------------------------
  // Groove: the crawl. A seismic hit on 1, a dragging thud on 3, and
  // every fourth bar an extra pull on the and of 3.
  // ----------------------------------------------------------------
  var KICK_STEPS = [0, 8];
  var KICK_FILL = [0, 8, 11];

  function kickSteps(bar) {
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

  // The feelers: deterministic skitter clusters. [bar, beat, pan, count]
  var SKITTERS = [
    [2, 3, -0.7, 5], [5, 2, 0.6, 6], [8, 3.5, -0.5, 4], [11, 2.5, 0.7, 7],
    [14, 3, -0.6, 5], [17, 2, 0.5, 6], [20, 3.5, -0.7, 5], [23, 2.5, 0.6, 4],
    [26, 3, -0.5, 6], [29, 2, 0.7, 5], [31, 3.5, -0.6, 7],
  ];

  function skitter(ctx, dest, c, bar, beat, pan, count, seed, v) {
    for (var i = 0; i < count; i++) {
      S.noise(ctx, dest, {
        at: c.at(bar, beat) + i * 0.055, dur: 0.014, v: v * (1 - i * 0.08),
        type: 'highpass', freq: 6200, q: 0.9,
        pan: pan + (i % 2 ? 0.12 : -0.12),
        seed: seed + i, attack: 0.001, source: 2,
      });
    }
  }

  // ----------------------------------------------------------------
  // base: seismic hits, sub drone, rumble
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.55, master);

    var cave = S.reverb(ctx, master, { seconds: 3.4, decay: 2.6, wet: 0.26, tone: 2600, lowCut: 150, preDelay: 0.04, seed: 0x3301 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, cave, 0.3);

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.32, release: 0.3 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    // ---- the deep: rumble that never sits still ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.07, tone: 260, lowCut: 55, drift: 0.03, driftDepth: 120, pan: 0 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.025, tone: 900, lowCut: 300, drift: 0.022, driftDepth: 400, pan: 0.25, seed: 127 });

    // slow earth breaths, one per sentence
    for (var br = 0; br < 4; br++) {
      S.noise(ctx, airBus, {
        at: c.at(br * 8 + 3, 1), dur: c.bar * 2, v: 0.04, type: 'bandpass',
        freq: 180, q: 0.6, shape: 'adsr',
        attack: c.bar, decay: 0.4, sustain: 0.7, release: c.bar * 0.8,
        source: 12, seed: 131 + br, pan: br % 2 ? 0.3 : -0.3,
      });
    }

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var lastOfPhrase = (bar % 4 === 0);

      // ---- seismic hits: the pitch falls out from under them ----
      var ks = kickSteps(bar);
      for (var k = 0; k < ks.length; k++) {
        var strong = ks[k] === 0;
        S.kick(ctx, master, {
          at: c.step(bar, ks[k]),
          v: strong ? 0.95 : 0.5,
          fall: strong ? 0.7 : 0.4,
          tune: strong ? 38 : 44, top: strong ? 110 : 95,
          sweep: 0.09, drive: 2.4, tone: 2200, click: 0.12,
        });
      }
      // the drag: a low scrape after the downbeat
      S.noise(ctx, perc, {
        at: c.step(bar, 2), dur: c.beats(0.8), v: 0.045,
        type: 'bandpass', freq: 420, freqTo: 240, q: 1.6,
        attack: 0.06, seed: 137, source: 4, pan: bar % 2 ? -0.3 : 0.3,
      });

      // ---- thud on 3: felt more than heard ----
      S.snare(ctx, perc, { at: c.step(bar, 8), v: 0.34, dur: 0.3, freq: 900 });

      // ---- sub drone: a bar long root with a pitch drop into it ----
      // Bb1 stays put: another octave down would be sub 30 Hz, felt by no one
      var subNote = S.midi(h.bass) >= 36 ? S.midi(h.bass) - 12 : S.midi(h.bass);
      S.sub(ctx, bassBus, {
        at: c.at(bar, 1), note: subNote, dur: c.bar * 0.95, v: 0.3,
        blip: 1.3, attack: 0.02, decay: 0.3, sustain: 0.8, release: 0.3, tone: 110,
      });
      // a mid bass shadow so the drone reads on small speakers
      S.tone(ctx, bassBus, {
        at: c.at(bar, 1), note: h.bass, dur: c.bar * 0.9, v: 0.09,
        type: 'triangle', voices: 2, detune: 4,
        cutoff: 500, cutoffTo: 260, cutoffTime: c.bar * 0.7, q: 1.2,
        attack: 0.05, decay: 0.4, sustain: 0.8, release: 0.3,
      });
      // the pull at the end of a phrase: a fifth below, sliding home
      if (lastOfPhrase) {
        var f = S.hz(S.midi(h.bass) - 5);
        S.tone(ctx, bassBus, {
          at: c.step(bar, 11), f: f, glideTo: S.hz(h.bass), glideTime: c.beats(1.1),
          dur: c.beats(1.2), v: 0.1, type: 'triangle', voices: 2, detune: 5,
          cutoff: 420, q: 1.4, attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.15,
        });
      }

      // a few feelers even in phase 1, quiet
      if (bar % 8 === 2) {
        skitter(ctx, perc, c, bar, 3.5, bar % 16 < 8 ? -0.6 : 0.6, 4, 139 + bar, 0.03);
      }
    }
  }

  // ----------------------------------------------------------------
  // p2: the sonar toll, a cluster pad, and the feelers in earnest
  //
  // The toll is a two note question, F then G flat, a minor second: the
  // mole pinging the dark and the dark answering a half step wrong.
  // ----------------------------------------------------------------
  function renderP2(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.6, master);

    var cave = S.reverb(ctx, master, { seconds: 3.8, decay: 2.4, wet: 0.34, tone: 3000, lowCut: 170, preDelay: 0.05, seed: 0x3302 });
    var deepEcho = S.echo(ctx, master, { time: c.beats(1.5), feedback: 0.4, damp: 1600, lowCut: 260, mix: 0.3 });

    var shape = S.gain(ctx, 0.75, master);
    shape.gain.setValueAtTime(0.75, 0);
    shape.gain.linearRampToValueAtTime(1.0, c.at(17, 1));
    shape.gain.linearRampToValueAtTime(0.85, loop);

    var duck = S.gain(ctx, 1, shape);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.28, release: 0.3 });

    var padBus = S.gain(ctx, 0.9, duck);
    S.send(padBus, cave, 0.36);

    var toll = S.gain(ctx, 0.9, duck);
    S.send(toll, cave, 0.4);
    S.send(toll, deepEcho, 0.7);

    var feelers = S.gain(ctx, 0.9, shape);
    S.send(feelers, cave, 0.22);

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var t0 = c.at(bar, 1);

      // ---- cluster pad: the chord plus its flat second, rubbed in ----
      var notes = h.pad.slice();
      notes.push(S.midi(h.pad[0]) + 1);
      S.pad(ctx, padBus, {
        at: t0 - (bar === 1 ? 0 : c.beats(0.4)),
        dur: c.bar + c.beats(0.4),
        notes: notes,
        v: 0.11,
        cutoff: 850,
        breathe: 0.04, breatheDepth: 260,
        attack: bar === 1 ? 1.8 : 0.7, decay: 0.8, sustain: 0.9, release: 1.0,
        detune: 10, spread: 0.5,
      });

      // ---- the sonar toll: one ping every two bars, answered wrong ----
      if (bar % 2 === 1) {
        S.pluck(ctx, toll, {
          at: c.at(bar, 2), note: 'F4', dur: c.beats(1.6), v: 0.1,
          pan: -0.15, open: 2600, close: 480, decay: 0.5, sustain: 0.15, release: 1.4,
        });
        S.pluck(ctx, toll, {
          at: c.at(bar, 3.5), note: 'Gb4', dur: c.beats(2), v: 0.08,
          pan: 0.2, open: 2200, close: 420, decay: 0.6, sustain: 0.12, release: 1.6,
        });
      }

      // ---- feelers: skitters answering the toll ----
      var didSkitter = false;
      for (var sk = 0; sk < SKITTERS.length; sk++) {
        if (SKITTERS[sk][0] === bar) {
          skitter(ctx, feelers, c, bar, SKITTERS[sk][1], SKITTERS[sk][2], SKITTERS[sk][3], 149 + sk * 11, 0.05);
          didSkitter = true;
        }
      }
      // ticking where there is no skitter: the nose never stops
      if (!didSkitter && bar % 2 === 0) {
        S.noise(ctx, feelers, {
          at: c.step(bar, 6), dur: 0.016, v: 0.035, type: 'highpass', freq: 5400,
          q: 0.9, pan: bar % 4 === 0 ? 0.5 : -0.5, seed: 151 + bar, attack: 0.001, source: 2,
        });
      }

      // ---- low toms answering the thud, alternate bars ----
      if (bar % 2 === 0) {
        S.kick(ctx, duck, { at: c.step(bar, 14), v: 0.32, fall: 0.16, tune: 70, top: 160, sweep: 0.05, drive: 1.7, tone: 2800 });
      }
    }
  }

  // ----------------------------------------------------------------
  // p3: the drill
  //
  // Driving eighths under a slow chromatic climb: the crawl becomes a
  // machine. The climb walks F to C across each half of the loop, always
  // arriving on the leading tone bars.
  // ----------------------------------------------------------------
  function renderP3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.1, master);

    var cave = S.reverb(ctx, master, { seconds: 3.0, decay: 2.8, wet: 0.26, tone: 3400, lowCut: 200, seed: 0x3303 });

    var shape = S.gain(ctx, 0.6, master);
    shape.gain.setValueAtTime(0.6, 0);
    shape.gain.linearRampToValueAtTime(0.8, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(25, 1));
    shape.gain.linearRampToValueAtTime(0.7, loop);

    var duck = S.gain(ctx, 1, shape);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.3, release: 0.28 });

    var drill = S.gain(ctx, 0.9, duck);
    var climb = S.gain(ctx, 0.85, duck);
    S.send(climb, cave, 0.3);

    var ticks = S.gain(ctx, 0.9, shape);
    S.send(ticks, cave, 0.2);

    // ---- the drill: relentless eighths on the root ----
    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      for (var e = 0; e < 8; e++) {
        var st = e * 2;
        var accent = (st % 8 === 0);
        var dur = c.beats(0.4);
        S.tone(ctx, drill, {
          at: c.step(bar, st), note: S.midi(h.bass) + 12, dur: dur,
          v: accent ? 0.1 : 0.07,
          type: 'square', voices: 2, detune: 6,
          cutoff: accent ? 900 : 650, cutoffTo: 380, cutoffTime: dur * 0.8, q: 2.6,
          attack: 0.004, decay: 0.06, sustain: 0.5, release: 0.06,
        });
      }
      // grinding sixteenths, low, in the second half of each sentence
      if (bar % 8 >= 5 || bar % 8 === 0) {
        for (var s = 1; s < 16; s += 2) {
          S.noise(ctx, ticks, {
            at: c.step(bar, s), dur: 0.02, v: 0.04,
            type: 'bandpass', freq: 1900, q: 2.2,
            pan: s % 4 === 1 ? -0.35 : 0.35, seed: 157, attack: 0.001, source: 2,
          });
        }
      }
    }

    // ---- the climb: two long chromatic walks, one per half ----
    // F3 up a tritone across bars 1..14, landing on B natural against the
    // C7 of bar 15..16: the drill biting into the leading tone harmony.
    var WALK = ['F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3'];
    for (var half = 0; half < 2; half++) {
      var start = half * 16;
      for (var w = 0; w < WALK.length; w++) {
        var atBar = start + 1 + w * 2;
        var dur2 = c.bar * 2 * 0.96;
        S.tone(ctx, climb, {
          at: c.at(atBar, 1), note: WALK[w], dur: dur2, v: 0.075 + w * 0.004,
          type: 'sawtooth', voices: 3, detune: 9,
          cutoff: 700 + w * 120, cutoffTo: 500, cutoffTime: dur2, q: 1.8,
          attack: c.beats(1.5), decay: 0.5, sustain: 0.9, release: c.beats(1),
          vibrato: 5, vibratoRate: 3.2, pan: half ? 0.15 : -0.15,
        });
      }
      // release the walk: a fall back down at the end of each half
      S.tone(ctx, climb, {
        at: c.at(start + 15, 1), f: S.hz('B3'), glideTo: S.hz('F3'),
        glideTime: c.bar * 1.6, dur: c.bar * 1.8, v: 0.07,
        type: 'sawtooth', voices: 3, detune: 10,
        cutoff: 900, cutoffTo: 420, cutoffTime: c.bar * 1.6, q: 1.8,
        attack: c.beats(0.5), decay: 0.4, sustain: 0.85, release: c.beats(1.5),
        pan: half ? -0.1 : 0.1,
      });
    }

    // ---- seismic riser: the whole hill leaning in, end of the loop ----
    S.noise(ctx, shape, {
      at: c.at(31, 1), dur: c.bar * 2, v: 0.1,
      type: 'bandpass', freq: 120, freqTo: 2400, q: 2.2,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 12, seed: 163, pan: 0,
    });
    S.sub(ctx, shape, {
      at: c.at(31, 1), note: 'F1', dur: c.bar * 2, v: 0.14,
      attack: c.bar * 1.5, decay: 0.3, sustain: 0.9, release: 0.4, tone: 100,
    });
  }

  var composition = {
    id: 'mawmole',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'F minor',
    tailSeconds: 4,
    notes: 'MAWMOLE. Seismic crawl, sonar toll, chromatic drill climb.',
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
