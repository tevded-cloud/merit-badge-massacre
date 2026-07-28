// Merit Badge Massacre: "behind", the hidebehind boss. 72 bpm, 32 bars,
// B minor.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file. It is
// read only by tools/render/, which bakes each layer into its own stem.
//
// Absence. The quietest piece in the game that still counts as combat music:
// a heartbeat that keeps time, a held breath that never finishes, and one
// repeating question: three notes, B, D, then G sharp hanging on the tritone,
// asked into the dark and never answered. Silence is scored here on purpose:
// the heartbeat SKIPS the last bar of each half, and the skip is the scare.
//
// Form (32 bars over a B pedal, in four 8 bar breaths):
//
//   bars  1-8    the heartbeat and the question, asked twice
//   bars  9-16   asked again, the dark leans closer, bar 16 goes silent
//   bars 17-24   the question moves off the beat, the answer comes back wrong
//   bars 25-32   pulse tightens, the question climbs an octave, bar 32 holds
//                its breath into the loop
//
// Boss layers STACK as the fight escalates. base must carry the fight alone;
// p2 and p3 are added on top of it, never instead of it:
//   base  heartbeat, breath, pedal, the question    phase 1, always audible
//   p2    shadow pad, the wrong answer, ticking     phase 2 joins
//   p3    doubled pulse, shimmer, the octave ask    phase 3 joins
//
// Every layer here is mixed far below the other bosses on purpose. The fight
// gets louder by adding almost nothing, which is the hidebehind's whole act.
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 72;
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

  // the heartbeat skips these bars entirely: absence, scored
  function heartbeatRests(bar) {
    return bar === 16 || bar === 32;
  }

  // The question: three notes, the last one hanging on the tritone above D.
  // asked(bar, beat) schedules one asking on the given pluck bus.
  function ask(ctx, dest, c, bar, beat, octave, v) {
    var up = octave ? 12 : 0;
    S.pluck(ctx, dest, {
      at: c.at(bar, beat), note: S.midi('B3') + up, dur: c.beats(0.5), v: v,
      pan: -0.1, open: 2400, close: 460, decay: 0.4, sustain: 0.12, release: 0.8,
    });
    S.pluck(ctx, dest, {
      at: c.at(bar, beat + 0.5), note: S.midi('D4') + up, dur: c.beats(0.5), v: v * 0.95,
      pan: 0.05, open: 2600, close: 480, decay: 0.4, sustain: 0.12, release: 0.8,
    });
    S.pluck(ctx, dest, {
      at: c.at(bar, beat + 1), note: S.midi('G#4') + up, dur: c.beats(2), v: v * 1.1,
      pan: 0.15, open: 3000, close: 520, decay: 0.6, sustain: 0.1, release: 1.6,
    });
  }

  // ----------------------------------------------------------------
  // base: heartbeat, breath, pedal, the question
  // ----------------------------------------------------------------
  function renderBase(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.75, master);

    var dark = S.reverb(ctx, master, { seconds: 3.6, decay: 2.2, wet: 0.36, tone: 3200, lowCut: 160, preDelay: 0.045, seed: 0xBE01 });
    var farEcho = S.echo(ctx, master, { time: c.beats(1.5), feedback: 0.42, damp: 1800, lowCut: 300, mix: 0.3 });

    var pulse = S.gain(ctx, 1, master);
    var bed = S.gain(ctx, 1, master);
    S.send(bed, dark, 0.2);

    var voice = S.gain(ctx, 0.9, master);
    S.send(voice, dark, 0.45);
    S.send(voice, farEcho, 0.6);

    // ---- the pedal: B, breathing, never resolving ----
    S.sub(ctx, bed, {
      at: 0, note: 'B1', dur: loop, v: 0.18,
      attack: 2.5, decay: 1.5, sustain: 0.85, release: 2, tone: 120, edge: 0.1,
    });
    // a fifth above, drifting in and out per 8 bar breath
    for (var s8 = 0; s8 < 4; s8++) {
      S.sub(ctx, bed, {
        at: c.at(s8 * 8 + 2, 1), dur: c.bar * 5, note: 'F#2', v: 0.05,
        attack: c.bar * 1.5, decay: 0.8, sustain: 0.7, release: c.bar, tone: 260, edge: 0.18,
      });
    }

    // ---- air: almost nothing, high and thin, the top of the lungs ----
    S.airBed(ctx, bed, { at: 0, dur: loop, v: 0.03, tone: 520, lowCut: 100, drift: 0.026, driftDepth: 160, pan: -0.1 });
    S.airBed(ctx, bed, { at: 0, dur: loop, v: 0.014, tone: 2800, lowCut: 1100, drift: 0.019, driftDepth: 700, pan: 0.25, seed: 173 });

    // ---- the held breath: an inhale at each half's end, cut short ----
    S.noise(ctx, bed, {
      at: c.at(15, 1), dur: c.bar * 0.9, v: 0.035, type: 'bandpass', freq: 700, q: 0.7,
      shape: 'adsr', attack: c.bar * 0.8, decay: 0.05, sustain: 0.9, release: 0.04,
      source: 8, seed: 179, pan: 0.2,
    });
    S.noise(ctx, bed, {
      at: c.at(31, 1), dur: c.bar * 0.9, v: 0.04, type: 'bandpass', freq: 640, q: 0.7,
      shape: 'adsr', attack: c.bar * 0.8, decay: 0.05, sustain: 0.9, release: 0.04,
      source: 8, seed: 181, pan: -0.2,
    });

    // ---- the heartbeat: lub, dub, and a soft third beat. Skips bars
    //      16 and 32: the silence is the instrument ----
    for (var bar = 1; bar <= bars; bar++) {
      if (heartbeatRests(bar)) continue;
      S.kick(ctx, pulse, { at: c.at(bar, 1), v: 0.4, fall: 0.22, tune: 52, top: 88, sweep: 0.05, drive: 1.5, tone: 1600, click: 0.05 });
      S.kick(ctx, pulse, { at: c.at(bar, 1.75), v: 0.24, fall: 0.16, tune: 48, top: 80, sweep: 0.05, drive: 1.5, tone: 1400, click: 0.04 });
      S.kick(ctx, pulse, { at: c.at(bar, 3), v: 0.3, fall: 0.18, tune: 50, top: 84, sweep: 0.05, drive: 1.5, tone: 1500, click: 0.04 });
    }

    // ---- the question, every fourth bar. From bar 17 it slides off the
    //      beat by half a beat: something is standing where it was ----
    for (var q = 1; q <= bars; q += 4) {
      var beat = q >= 17 ? 2.5 : 2;
      ask(ctx, voice, c, q, beat, false, 0.085);
    }
  }

  // ----------------------------------------------------------------
  // p2: the shadow pad, the wrong answer, ticking
  // ----------------------------------------------------------------
  function renderP2(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 1.15, master);

    var dark = S.reverb(ctx, master, { seconds: 4.0, decay: 2.0, wet: 0.4, tone: 2800, lowCut: 150, preDelay: 0.055, seed: 0xBE02 });
    var farEcho = S.echo(ctx, master, { time: c.beats(2), feedback: 0.45, damp: 1500, lowCut: 260, mix: 0.32 });

    var shape = S.gain(ctx, 0.8, master);
    shape.gain.setValueAtTime(0.8, 0);
    shape.gain.linearRampToValueAtTime(1.0, c.at(17, 1));
    shape.gain.linearRampToValueAtTime(0.85, loop);

    var padBus = S.gain(ctx, 0.9, shape);
    S.send(padBus, dark, 0.4);

    var voice = S.gain(ctx, 0.85, shape);
    S.send(voice, dark, 0.4);
    S.send(voice, farEcho, 0.65);

    var ticksBus = S.gain(ctx, 0.9, shape);
    S.send(ticksBus, dark, 0.15);

    // ---- shadow pad: B minor with the flat nine leaned on it, swelling
    //      through bars 2 to 6 of every breath, gone before the rest ----
    for (var s8 = 0; s8 < 4; s8++) {
      S.pad(ctx, padBus, {
        at: c.at(s8 * 8 + 2, 1), dur: c.bar * 4.5,
        notes: ['B2', 'D3', 'F#3', 'C4'],
        v: 0.085,
        cutoff: 700,
        breathe: 0.03, breatheDepth: 180,
        attack: c.bar * 1.2, decay: 1, sustain: 0.85, release: c.bar,
        detune: 9, spread: 0.45,
      });
    }

    // ---- the wrong answer: the question a tritone away, in the gaps
    //      between the real askings ----
    for (var q = 3; q <= bars; q += 8) {
      S.pluck(ctx, voice, {
        at: c.at(q, 3), note: 'F3', dur: c.beats(0.5), v: 0.06,
        pan: 0.3, open: 1800, close: 380, decay: 0.5, sustain: 0.1, release: 1.0,
      });
      S.pluck(ctx, voice, {
        at: c.at(q, 3.5), note: 'Ab3', dur: c.beats(0.5), v: 0.055,
        pan: 0.35, open: 1800, close: 380, decay: 0.5, sustain: 0.1, release: 1.0,
      });
      S.pluck(ctx, voice, {
        at: c.at(q, 4), note: 'D4', dur: c.beats(1.5), v: 0.065,
        pan: 0.4, open: 2000, close: 400, decay: 0.6, sustain: 0.08, release: 1.4,
      });
    }

    // ---- ticking: twigs underfoot, never quite regular ----
    for (var bar = 1; bar <= bars; bar++) {
      if (heartbeatRests(bar)) continue;
      var st = (bar % 3 === 0) ? 3 : 2;
      S.noise(ctx, ticksBus, {
        at: c.step(bar, st), dur: 0.014, v: 0.028,
        type: 'highpass', freq: 7400, q: 0.8,
        pan: bar % 2 ? -0.5 : 0.5, seed: 191 + bar, attack: 0.001, source: 2,
      });
      if (bar >= 17) {
        S.noise(ctx, ticksBus, {
          at: c.step(bar, 10), dur: 0.014, v: 0.024,
          type: 'highpass', freq: 8200, q: 0.8,
          pan: bar % 2 ? 0.45 : -0.45, seed: 197 + bar, attack: 0.001, source: 2,
        });
      }
    }

    // ---- a low toll a half step under the pedal, once per half:
    //      B flat against B, felt as wrongness more than a note ----
    S.sub(ctx, shape, {
      at: c.at(8, 1), note: 'Bb1', dur: c.bar * 1.5, v: 0.05,
      attack: c.beats(2), decay: 0.5, sustain: 0.7, release: c.beats(3), tone: 110, edge: 0.08,
    });
    S.sub(ctx, shape, {
      at: c.at(24, 1), note: 'Bb1', dur: c.bar * 1.5, v: 0.055,
      attack: c.beats(2), decay: 0.5, sustain: 0.7, release: c.beats(3), tone: 110, edge: 0.08,
    });
  }

  // ----------------------------------------------------------------
  // p3: the pulse doubles, the shimmer arrives, the question climbs
  //
  // Still quiet. The escalation is compression of time, not volume:
  // eighth ticks under the heartbeat, the ask twice as often and an
  // octave up, and one long tension tone that never lands.
  // ----------------------------------------------------------------
  function renderP3(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    master = S.gain(ctx, 0.7, master);

    var dark = S.reverb(ctx, master, { seconds: 3.4, decay: 2.4, wet: 0.34, tone: 3600, lowCut: 200, preDelay: 0.04, seed: 0xBE03 });
    var farEcho = S.echo(ctx, master, { time: c.beats(0.75), feedback: 0.38, damp: 2200, lowCut: 380, mix: 0.26 });

    var shape = S.gain(ctx, 0.7, master);
    shape.gain.setValueAtTime(0.7, 0);
    shape.gain.linearRampToValueAtTime(0.85, c.at(9, 1));
    shape.gain.linearRampToValueAtTime(1.0, c.at(25, 1));
    shape.gain.linearRampToValueAtTime(0.75, loop);

    var pulse = S.gain(ctx, 0.9, shape);
    var voice = S.gain(ctx, 0.85, shape);
    S.send(voice, dark, 0.4);
    S.send(voice, farEcho, 0.55);

    // ---- doubled pulse: soft eighth ticks that keep combat time ----
    for (var bar = 1; bar <= bars; bar++) {
      var resting = heartbeatRests(bar);
      for (var e = 0; e < 8; e++) {
        // in the rest bars even this thins to almost nothing
        if (resting && e % 4 !== 0) continue;
        S.noise(ctx, pulse, {
          at: c.step(bar, e * 2), dur: 0.016, v: resting ? 0.02 : (e % 2 ? 0.03 : 0.042),
          type: 'bandpass', freq: 3400, q: 2.6,
          pan: e % 2 ? 0.3 : -0.3, seed: 211, attack: 0.001, source: 2,
        });
      }
      // a second heartbeat between the beats from bar 17: two of them now
      if (bar >= 17 && !resting) {
        S.kick(ctx, pulse, { at: c.at(bar, 2.5), v: 0.2, fall: 0.14, tune: 56, top: 90, sweep: 0.05, drive: 1.5, tone: 1500, click: 0.04 });
        S.kick(ctx, pulse, { at: c.at(bar, 4), v: 0.16, fall: 0.12, tune: 54, top: 86, sweep: 0.05, drive: 1.5, tone: 1400, click: 0.03 });
      }
    }

    // ---- shimmer: B against C, high, more felt than heard ----
    var trem = S.tremolo(ctx, { rate: 8.5, depth: 0.75, at: 0, until: loop + 3 });
    var band = S.filter(ctx, 'bandpass', 2400, 2.0, shape);
    trem.connect(band);
    S.send(band, dark, 0.4);
    S.tone(ctx, trem, {
      at: c.at(9, 1), note: 'B5', dur: c.bar * 22, v: 0.022, type: 'sine', voices: 2, detune: 7,
      attack: c.bar * 2, decay: 1, sustain: 0.9, release: c.bar * 1.5, pan: -0.3,
    });
    S.tone(ctx, trem, {
      at: c.at(13, 1), note: 'C6', dur: c.bar * 18, v: 0.018, type: 'sine', voices: 2, detune: 8,
      attack: c.bar * 2, decay: 1, sustain: 0.9, release: c.bar * 1.5, pan: 0.3,
    });

    // ---- the question, octave up, every other bar, still unanswered ----
    for (var q = 1; q <= bars; q += 2) {
      var beat = q >= 17 ? 2.5 : 2;
      ask(ctx, voice, c, q, beat, true, 0.05);
    }

    // ---- one tension tone per half: F sharp bending a half step up
    //      and stopping just short of G, never landing ----
    S.tone(ctx, voice, {
      at: c.at(13, 1), f: S.hz('F#4'), glideTo: S.hz('G4') * 0.985, glideTime: c.bar * 2.5,
      dur: c.bar * 2.6, v: 0.045, type: 'triangle', voices: 2, detune: 6,
      attack: c.bar, decay: 0.5, sustain: 0.9, release: c.beats(2), pan: 0.1,
    });
    S.tone(ctx, voice, {
      at: c.at(29, 1), f: S.hz('F#4'), glideTo: S.hz('G4') * 0.985, glideTime: c.bar * 2.5,
      dur: c.bar * 2.6, v: 0.05, type: 'triangle', voices: 2, detune: 6,
      attack: c.bar, decay: 0.5, sustain: 0.9, release: c.beats(2), pan: -0.1,
    });
  }

  var composition = {
    id: 'behind',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'B minor',
    tailSeconds: 4,
    notes: 'THE BEHIND. Heartbeat, held breath, one unanswered question.',
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
