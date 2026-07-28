// Merit Badge Massacre: "act3", THE BURN. 144 bpm, 16 bars, E minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// A fire scar: urgent, ashen, relentless. Still the same forest as act 1, so
// the family rules hold: one chord per bar, head, answer, lift, climax, and
// the harmonic minor leading tone doing the dread (D sharp over the B bars,
// where act 1 had G sharp over E). What changes is the pace: four on the
// floor, a bass that never stops running, and heat shimmer instead of night
// air.
//
// Form (one chord per bar):
//
//   bars  1-4   A     Em  Em  C   D      statement at a dead run
//   bars  5-8   A'    Em  Em  C   B      the answer bares its teeth on V
//   bars  9-12  B     Am  C   G   B      the lift climbs instead of resting
//   bars 13-16  A''   C   D   Em  B7     climax, turnaround, no way to stop
//
// Four layers, same roles as act1, all exactly the same length:
//   base  drums, bass, scorched air     always audible
//   l1    harmonic bed                  tight pad and pushed stabs
//   l2    lead motif                    urgent, repeated notes, wide peak
//   l3    peril                         high shimmer, embers, a riser
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 144;
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
  // Harmony
  // ----------------------------------------------------------------
  var HARMONY = [
    { name: 'Em', bass: 'E2', pad: ['E3', 'B3', 'G4'] },
    { name: 'Em', bass: 'E2', pad: ['E3', 'B3', 'G4'] },
    { name: 'C', bass: 'C2', pad: ['E3', 'C4', 'G4'] },
    { name: 'D', bass: 'D2', pad: ['F#3', 'D4', 'A4'] },
    { name: 'Em', bass: 'E2', pad: ['E3', 'B3', 'G4'] },
    { name: 'Em', bass: 'E2', pad: ['G3', 'B3', 'E4'] },
    { name: 'C', bass: 'C2', pad: ['G3', 'C4', 'E4'] },
    { name: 'B', bass: 'B1', pad: ['F#3', 'B3', 'D#4'] },
    { name: 'Am', bass: 'A1', pad: ['E3', 'A3', 'C4'] },
    { name: 'C', bass: 'C2', pad: ['G3', 'C4', 'E4'] },
    { name: 'G', bass: 'G1', pad: ['G3', 'B3', 'D4'] },
    { name: 'B', bass: 'B1', pad: ['F#3', 'B3', 'D#4'] },
    { name: 'C', bass: 'C2', pad: ['G3', 'C4', 'E4'] },
    { name: 'D', bass: 'D2', pad: ['A3', 'D4', 'F#4'] },
    { name: 'Em', bass: 'E2', pad: ['G3', 'B3', 'E4'] },
    { name: 'B7', bass: 'B1', pad: ['F#3', 'A3', 'D#4'] },
  ];

  // ----------------------------------------------------------------
  // Groove: four on the floor, fills at phrase ends
  // ----------------------------------------------------------------
  var KICK_STEPS = [0, 4, 8, 12];
  var KICK_FILL = [0, 4, 8, 12, 14];          // bars 4, 8, 12
  var KICK_LAST = [0, 4, 8, 10, 12, 14];      // bar 16

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
  // base: drums, running bass, scorched air
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.62, master);

    var room = S.reverb(ctx, master, { seconds: 1.4, decay: 5.0, wet: 0.16, tone: 4800, lowCut: 300, seed: 0xB1A2 });

    var perc = S.gain(ctx, 0.9, master);
    S.send(perc, room, 0.22);

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.4, release: 0.12 });

    var bassBus = S.gain(ctx, 1, duck);
    var airBus = S.gain(ctx, 1, duck);

    // ---- scorched air: a thin, hot hiss instead of act 1's night ----
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.04, tone: 2400, lowCut: 800, drift: 0.07, driftDepth: 900, pan: 0.2, seed: 83 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.035, tone: 900, lowCut: 200, drift: 0.052, driftDepth: 350, pan: -0.25 });

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var next = HARMONY[bar % HARMONY.length];
      var lastOfPhrase = (bar % 4 === 0);

      // ---- kick: tight and dry, no time to ring ----
      var ks = kickSteps(bar);
      for (var k = 0; k < ks.length; k++) {
        var strong = ks[k] % 8 === 0;
        S.kick(ctx, master, {
          at: c.step(bar, ks[k]),
          v: strong ? 0.9 : 0.7,
          fall: 0.2, tune: 50, top: strong ? 170 : 150, sweep: 0.045, drive: 2.2,
        });
      }

      // ---- backbeat ----
      S.snare(ctx, perc, { at: c.step(bar, 4), v: 0.46, dur: 0.13 });
      S.snare(ctx, perc, { at: c.step(bar, 12), v: 0.5, dur: 0.13 });
      if (bar >= 5) {
        S.snare(ctx, perc, { at: c.step(bar, 7), v: 0.12, dur: 0.07 });
        if (bar >= 13) S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.15, dur: 0.07 });
      }
      if (bar === 8 || bar === 16) {
        S.snare(ctx, perc, { at: c.step(bar, 13), v: 0.3, dur: 0.09, pan: -0.25 });
        S.snare(ctx, perc, { at: c.step(bar, 14), v: 0.38, dur: 0.09, pan: 0.2 });
        S.snare(ctx, perc, { at: c.step(bar, 15), v: 0.5, dur: 0.1, pan: 0 });
      }

      // ---- hats: driving eighths, sixteenth pairs from the lift on ----
      for (var s = 0; s < 16; s += 2) {
        var open = (s === 14 && lastOfPhrase);
        S.hat(ctx, perc, {
          at: c.step(bar, s),
          v: open ? 0.1 : (s % 4 === 0 ? 0.07 : 0.11),
          open: open, pan: 0.14,
        });
      }
      if (bar >= 9) {
        S.hat(ctx, perc, { at: c.step(bar, 3), v: 0.06, pan: 0.22 });
        S.hat(ctx, perc, { at: c.step(bar, 7), v: 0.06, pan: 0.06 });
        S.hat(ctx, perc, { at: c.step(bar, 11), v: 0.065, pan: 0.22 });
        S.hat(ctx, perc, { at: c.step(bar, 15), v: 0.07, pan: 0.06 });
      }

      // ---- bass: running eighths, root and octave, never resting ----
      for (var e = 0; e < 8; e++) {
        var st = e * 2;
        var t = c.step(bar, st);
        var up = (e % 2 === 1);
        var note = S.midi(h.bass) + (up ? 12 : 0);
        // last two eighths of a phrase walk chromatically into the next root
        if (lastOfPhrase && e === 7) note = S.midi(next.bass) + 1;
        if (lastOfPhrase && e === 6) note = S.midi(next.bass) - 1;
        var accent = (st % 8 === 0);
        var dur = c.beats(0.42);
        S.tone(ctx, bassBus, {
          at: t, note: note, dur: dur, v: accent ? 0.17 : 0.115,
          type: 'sawtooth', voices: 2, detune: 5,
          cutoff: accent ? 1900 : 1300, cutoffTo: 500, cutoffTime: dur * 0.8, q: 3.4,
          attack: 0.003, decay: 0.05, sustain: 0.5, release: 0.05,
        });
        if (accent && !up) {
          S.sub(ctx, bassBus, {
            at: t, note: S.midi(h.bass) - 12 < 24 ? S.midi(h.bass) : S.midi(h.bass) - 12,
            dur: c.beats(0.6), v: 0.26,
            attack: 0.006, decay: 0.08, sustain: 0.7, release: 0.08, tone: 170,
          });
        }
      }
    }
  }

  // ----------------------------------------------------------------
  // l1: the harmonic bed, tight and pushed
  // ----------------------------------------------------------------
  function renderL1(ctx, master, bpm, bars) {
    var c = clock(bpm);

    master = S.gain(ctx, 1.05, master);

    var hall = S.reverb(ctx, master, { seconds: 2.0, decay: 3.6, wet: 0.28, tone: 4600, lowCut: 260, preDelay: 0.022, seed: 0xB2B3 });

    var duck = S.gain(ctx, 1, master);
    S.pump(duck.gain, kickTimes(bpm), { depth: 0.36, release: 0.13 });

    var padBus = S.gain(ctx, 0.85, duck);
    S.send(padBus, hall, 0.3);

    var stab = S.gain(ctx, 0.85, duck);
    S.send(stab, hall, 0.22);

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var t0 = c.at(bar, 1);

      // a tighter pad than act 1: faster attack, less overlap, more edge
      S.pad(ctx, padBus, {
        at: t0 - (bar === 1 ? 0 : c.beats(0.08)),
        dur: c.bar + c.beats(0.08),
        notes: h.pad,
        v: 0.13,
        cutoff: bar >= 9 ? 2000 : 1600,
        breathe: 0.09, breatheDepth: 600,
        attack: bar === 1 ? 0.4 : 0.12, decay: 0.4, sustain: 0.85, release: 0.35,
        detune: 9, spread: 0.6,
      });

      S.sub(ctx, padBus, {
        at: t0, note: S.midi(h.bass) + 12, dur: c.bar * 0.95, v: 0.09,
        attack: 0.08, decay: 0.25, sustain: 0.7, release: 0.2, tone: 340, edge: 0.22,
      });

      // pushed stabs: the and of 2 and the and of 4, like sparks off a log
      var top = h.pad[h.pad.length - 1];
      var mid = h.pad[1];
      S.pluck(ctx, stab, { at: c.step(bar, 6), note: mid, dur: c.beats(0.5), v: 0.1, pan: -0.3, open: 4200, close: 800 });
      S.pluck(ctx, stab, { at: c.step(bar, 14), note: top, dur: c.beats(0.5), v: 0.11, pan: 0.3, open: 4800, close: 900 });
      if (bar >= 9) {
        S.pluck(ctx, stab, { at: c.step(bar, 3), note: h.pad[0], dur: c.beats(0.35), v: 0.07, pan: 0.12, open: 3400, close: 700 });
        S.pluck(ctx, stab, { at: c.step(bar, 11), note: mid, dur: c.beats(0.35), v: 0.065, pan: -0.15, open: 3400, close: 700 });
      }
      if (bar % 4 === 0) {
        S.pluck(ctx, stab, {
          at: c.step(bar, 8), note: S.midi(top) + 12, dur: c.beats(1.2), v: 0.075,
          pan: 0.1, open: 6400, close: 1200, decay: 0.3, sustain: 0.2, release: 0.6,
        });
      }
    }
  }

  // ----------------------------------------------------------------
  // l2: the lead motif
  //
  // [bar, beat, note, beats, velocity]. Urgent: repeated notes at the head
  // of the phrase, eighth motion everywhere, one wide peak on B5 in the
  // climax, and the D sharps over the B bars as the family leading tone.
  // ----------------------------------------------------------------
  var MELODY = [
    // phrase 1: the head hammers, then swings
    [1, 1, 'E4', 0.5, 0.8], [1, 1.5, 'E4', 0.5, 0.7], [1, 2, 'G4', 0.5, 0.85], [1, 2.5, 'E4', 0.5, 0.7],
    [1, 3, 'B4', 1, 0.9], [1, 4, 'A4', 0.5, 0.75], [1, 4.5, 'G4', 0.5, 0.72],
    [2, 1, 'A4', 0.5, 0.8], [2, 1.5, 'G4', 0.5, 0.72], [2, 2, 'F#4', 0.5, 0.75], [2, 2.5, 'G4', 0.5, 0.72],
    [2, 3, 'E4', 1.5, 0.8],
    [3, 1, 'C5', 1, 0.9], [3, 2, 'B4', 0.5, 0.8], [3, 2.5, 'A4', 0.5, 0.75], [3, 3, 'G4', 1, 0.8], [3, 4, 'A4', 1, 0.78],
    [4, 1, 'B4', 1.5, 0.88], [4, 2.5, 'A4', 0.5, 0.75], [4, 3, 'F#4', 1, 0.78], [4, 4, 'D4', 1, 0.72],

    // phrase 2: same head, the answer lands on the leading tone
    [5, 1, 'E4', 0.5, 0.8], [5, 1.5, 'E4', 0.5, 0.7], [5, 2, 'G4', 0.5, 0.85], [5, 2.5, 'E4', 0.5, 0.7],
    [5, 3, 'B4', 1, 0.9], [5, 4, 'A4', 0.5, 0.75], [5, 4.5, 'G4', 0.5, 0.72],
    [6, 1, 'A4', 0.5, 0.8], [6, 1.5, 'G4', 0.5, 0.72], [6, 2, 'F#4', 0.5, 0.75], [6, 2.5, 'G4', 0.5, 0.72],
    [6, 3, 'E4', 1.5, 0.8],
    [7, 1, 'C5', 1, 0.9], [7, 2, 'D5', 0.5, 0.85], [7, 2.5, 'C5', 0.5, 0.78], [7, 3, 'B4', 1, 0.85], [7, 4, 'G4', 1, 0.75],
    [8, 1, 'A4', 0.5, 0.78], [8, 1.5, 'B4', 0.5, 0.8], [8, 2, 'D#5', 1.5, 0.95], [8, 3.5, 'B4', 0.5, 0.78], [8, 4, 'F#4', 1, 0.72],

    // phrase 3: the lift climbs
    [9, 1, 'E5', 1, 0.9], [9, 2, 'C5', 1, 0.8], [9, 3, 'A4', 2, 0.78],
    [10, 1, 'E5', 1, 0.88], [10, 2, 'D5', 0.5, 0.78], [10, 2.5, 'C5', 0.5, 0.75], [10, 3, 'G4', 2, 0.76],
    [11, 1, 'D5', 1, 0.85], [11, 2, 'B4', 1, 0.78], [11, 3, 'G4', 1, 0.75], [11, 4, 'B4', 1, 0.8],
    [12, 1, 'D#5', 1.5, 0.9], [12, 2.5, 'F#5', 1.5, 0.95], [12, 4, 'B4', 1, 0.8],

    // phrase 4: the climax, twice as wide, then the turnaround
    [13, 1, 'G5', 1, 1.0], [13, 2, 'E5', 0.5, 0.85], [13, 2.5, 'C5', 0.5, 0.8], [13, 3, 'E5', 1, 0.88], [13, 4, 'G5', 1, 0.95],
    [14, 1, 'F#5', 1, 0.92], [14, 2, 'D5', 0.5, 0.8], [14, 2.5, 'A4', 0.5, 0.75], [14, 3, 'D5', 1, 0.85], [14, 4, 'F#5', 1, 0.9],
    [15, 1, 'B5', 2, 1.0], [15, 3, 'G5', 1, 0.9], [15, 4, 'E5', 1, 0.85],
    [16, 1, 'D#5', 1, 0.9], [16, 2, 'B4', 1, 0.8], [16, 3, 'F#4', 1, 0.78], [16, 4, 'A4', 1, 0.82],
  ];

  function renderL2(ctx, master, bpm, bars) {
    var c = clock(bpm);

    master = S.gain(ctx, 1.07, master);

    var hall = S.reverb(ctx, master, { seconds: 2.0, decay: 3.8, wet: 0.26, tone: 5200, lowCut: 300, preDelay: 0.02, seed: 0xB3C4 });
    // straight eighth echo: at this tempo a dotted repeat would smear
    var slap = S.echo(ctx, master, { time: c.beats(0.5), feedback: 0.26, damp: 2600, lowCut: 480, mix: 0.18 });

    var lead = S.gain(ctx, 0.85, master);
    S.send(lead, hall, 0.24);
    S.send(lead, slap, 0.45);

    for (var i = 0; i < MELODY.length; i++) {
      var n = MELODY[i];
      var bar = n[0];
      if (bar > bars) continue;
      var t = c.at(bar, n[1]);
      var beats = n[3];
      var vel = n[4];
      var dur = c.beats(beats) * (beats > 1 ? 0.92 : 0.8);
      var long = beats >= 1.5;

      S.tone(ctx, lead, {
        at: t, note: n[2], dur: dur, v: 0.16 * vel,
        type: 'sawtooth', voices: 3, detune: 8,
        cutoff: 1300 + 2800 * vel, cutoffTo: 1400, cutoffTime: Math.min(dur, 0.25), q: 1.7,
        attack: long ? 0.02 : 0.008, decay: 0.09, sustain: 0.7, release: long ? 0.24 : 0.12,
        vibrato: long ? 8 : 0, vibratoRate: 5.8,
        pan: -0.06,
      });
      // the octave sheen, brighter than act 1: heat
      S.tone(ctx, lead, {
        at: t, note: S.midi(n[2]) + 12, dur: dur * 0.75, v: 0.045 * vel,
        type: 'triangle', voices: 2, detune: 5,
        attack: long ? 0.02 : 0.01, decay: 0.08, sustain: 0.5, release: 0.12,
        pan: 0.14,
      });
    }
  }

  // ----------------------------------------------------------------
  // l3: peril
  //
  // Heat shimmer: a high minor second tremolo, ember ticks, a slow siren
  // underneath it all, and a riser handing the loop back to bar 1.
  // ----------------------------------------------------------------
  function renderL3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.95, master);

    var hall = S.reverb(ctx, master, { seconds: 2.4, decay: 3.0, wet: 0.28, tone: 6200, lowCut: 340, seed: 0xB4D5 });

    var shape = S.gain(ctx, 0.35, master);
    shape.gain.setValueAtTime(0.35, 0);
    shape.gain.linearRampToValueAtTime(0.5, c.at(5, 1));
    shape.gain.linearRampToValueAtTime(0.7, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(13, 1));
    shape.gain.linearRampToValueAtTime(0.55, loop);

    // ---- shimmer: E against F, high and fast, the air over the scar ----
    var trem = S.tremolo(ctx, { rate: 12.5, depth: 0.85, at: 0, until: loop + 3 });
    var band = S.filter(ctx, 'bandpass', 2200, 2.4, shape);
    trem.connect(band);
    S.send(band, hall, 0.4);

    function dyad(lo, hi, at, dur, v) {
      S.tone(ctx, trem, {
        at: at, note: lo, dur: dur, v: v, type: 'sawtooth', voices: 3, detune: 12,
        attack: 0.3, decay: 0.4, sustain: 0.9, release: 0.5, pan: -0.4,
      });
      S.tone(ctx, trem, {
        at: at, note: hi, dur: dur, v: v * 0.85, type: 'sawtooth', voices: 3, detune: 14,
        attack: 0.45, decay: 0.4, sustain: 0.9, release: 0.5, pan: 0.4,
      });
    }
    dyad('E5', 'F5', 0, c.bar * 8, 0.05);
    dyad('A5', 'Bb5', c.at(9, 1), c.bar * 8, 0.05);

    // ---- root pedal ----
    S.sub(ctx, shape, {
      at: 0, note: 'E2', dur: loop, v: 0.15,
      attack: 1.0, decay: 1, sustain: 0.9, release: 1.2, tone: 140, edge: 0.16,
    });

    // ---- the siren: a slow rise and fall under everything, far off ----
    S.tone(ctx, shape, {
      at: c.at(1, 1), f: 330, glideTo: 494, glideTime: c.bar * 4,
      dur: c.bar * 7.5, v: 0.035, type: 'sine', voices: 2, detune: 9,
      attack: c.bar, decay: 0.5, sustain: 0.9, release: c.bar, pan: -0.2,
    });
    S.tone(ctx, shape, {
      at: c.at(9, 1), f: 494, glideTo: 370, glideTime: c.bar * 4,
      dur: c.bar * 6, v: 0.035, type: 'sine', voices: 2, detune: 9,
      attack: c.bar, decay: 0.5, sustain: 0.9, release: c.bar, pan: 0.2,
    });

    // ---- tritone stabs closing each half ----
    S.tone(ctx, shape, {
      at: c.at(8, 1), note: 'A#4', dur: c.beats(1.5), v: 0.1, type: 'sawtooth',
      voices: 4, detune: 16, cutoff: 2800, cutoffTo: 800, q: 2.4,
      attack: 0.01, decay: 0.18, sustain: 0.35, release: 0.4, pan: 0.2,
    });
    S.tone(ctx, shape, {
      at: c.at(16, 1), note: 'A#4', dur: c.beats(2), v: 0.12, type: 'sawtooth',
      voices: 4, detune: 18, cutoff: 3200, cutoffTo: 800, q: 2.4,
      attack: 0.01, decay: 0.18, sustain: 0.4, release: 0.5, pan: -0.2,
    });

    // ---- embers: sixteenth crackle, denser and brighter than act 1 ----
    var ticks = S.gain(ctx, 1, shape);
    S.send(ticks, hall, 0.26);
    for (var bar = 1; bar <= bars; bar++) {
      for (var s = 0; s < 16; s++) {
        var onBeat = (s % 4 === 0);
        var offBeat = (s % 4 === 2);
        var v = onBeat ? 0.045 : (offBeat ? 0.08 : 0.035);
        if (bar < 5 && !onBeat && !offBeat) continue;
        S.noise(ctx, ticks, {
          at: c.step(bar, s), dur: 0.01, v: v,
          type: 'highpass', freq: 8600, q: 0.8,
          pan: (s % 4 === 1 ? -0.45 : (s % 4 === 3 ? 0.45 : 0.05)),
          seed: 89, attack: 0.001, source: 2,
        });
      }
      // a pop and hiss at the top of each phrase: a log giving way
      if (bar % 4 === 1) {
        S.noise(ctx, ticks, {
          at: c.at(bar, 1), dur: 0.04, v: 0.09, type: 'bandpass', freq: 3000, q: 1.2,
          pan: 0.25, seed: 97, attack: 0.001, source: 2,
        });
        S.noise(ctx, ticks, {
          at: c.at(bar, 1.1), dur: 0.6, v: 0.045, type: 'highpass', freq: 5200, q: 0.7,
          pan: -0.2, seed: 101, attack: 0.02, source: 3,
        });
      }
    }

    // ---- the riser ----
    S.noise(ctx, shape, {
      at: c.at(15, 1), dur: c.bar * 2, v: 0.11,
      type: 'bandpass', freq: 400, freqTo: 9000, q: 2.6,
      shape: 'adsr', attack: c.bar * 1.85, decay: 0.2, sustain: 0.95, release: 0.12,
      source: 8, seed: 103, pan: 0,
    });
    S.tone(ctx, shape, {
      at: c.at(15, 1), f: 330, glideTo: 1319, glideTime: c.bar * 2,
      dur: c.bar * 2, v: 0.05, type: 'sawtooth', voices: 3, detune: 22,
      cutoff: 1100, cutoffTo: 6000, cutoffTime: c.bar * 2, q: 3,
      attack: c.bar * 1.8, decay: 0.2, sustain: 0.95, release: 0.15, pan: 0.15,
    });
  }

  var composition = {
    id: 'act3',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'E minor',
    tailSeconds: 2.5,
    notes: 'THE BURN. Four on the floor, running bass, heat shimmer.',
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
