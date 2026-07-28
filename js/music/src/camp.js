// Merit Badge Massacre: "camp", the between runs theme. 68 bpm, 16 bars, C major.
//
// COMPOSITION DATA, NOT GAME CODE. index.html does not load this file.
//
// One stem, on purpose. Camp is not a fight, so there is nothing to layer in:
// no drums, no percussion of any kind, nothing that pushes. Just a warm bed,
// a low root, and a few plucked notes with room around them. C major is the
// relative major of act 1's A minor, so leaving camp for a run is a shift in
// mood rather than a change of key.
//
// Form: four four bar sentences, the third one leaning minor (Dm7, Em7) so the
// loop does not read as saccharine, then home.
'use strict';

(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;

  var BPM = 68;
  var BARS = 16;
  var BEATS = 4;

  function clock(bpm) {
    var spb = 60 / bpm;
    return {
      spb: spb,
      bar: BEATS * spb,
      at: function (bar, beat) { return ((bar - 1) * BEATS + (beat - 1)) * spb; },
      beats: function (n) { return n * spb; },
    };
  }

  var HARMONY = [
    { name: 'Cmaj7', bass: 'C2', pad: ['E4', 'G4', 'B4'], top: 'E5' },
    { name: 'Am7', bass: 'A2', pad: ['E4', 'G4', 'C5'], top: 'E5' },
    { name: 'Fmaj7', bass: 'F2', pad: ['E4', 'A4', 'C5'], top: 'F5' },
    { name: 'G6', bass: 'G2', pad: ['D4', 'G4', 'B4'], top: 'E5' },
    { name: 'Cmaj7', bass: 'C2', pad: ['G4', 'B4', 'E5'], top: 'G5' },
    { name: 'Am7', bass: 'A2', pad: ['G4', 'C5', 'E5'], top: 'A5' },
    { name: 'Dm7', bass: 'D2', pad: ['F4', 'A4', 'C5'], top: 'F5' },
    { name: 'G7sus', bass: 'G2', pad: ['F4', 'C5', 'D5'], top: 'G5' },
    { name: 'Cmaj7', bass: 'C2', pad: ['E4', 'G4', 'B4'], top: 'E5' },
    { name: 'Am7', bass: 'A2', pad: ['E4', 'G4', 'C5'], top: 'C5' },
    { name: 'Fmaj7', bass: 'F2', pad: ['E4', 'A4', 'C5'], top: 'A4' },
    { name: 'G6', bass: 'G2', pad: ['D4', 'G4', 'B4'], top: 'B4' },
    { name: 'Em7', bass: 'E2', pad: ['G4', 'B4', 'D5'], top: 'G5' },
    { name: 'Am7', bass: 'A2', pad: ['E4', 'G4', 'C5'], top: 'E5' },
    { name: 'Fmaj7', bass: 'F2', pad: ['A4', 'C5', 'E5'], top: 'C5' },
    { name: 'G6', bass: 'G2', pad: ['D4', 'G4', 'B4'], top: 'D5' },
  ];

  // A short tune that shows up once per sentence and then gets out of the way.
  // [bar, beat, note, beats, velocity]
  var MOTIF = [
    [2, 3, 'G4', 1, 0.7], [2, 4, 'A4', 1, 0.72],
    [3, 1, 'C5', 2, 0.8], [3, 3, 'A4', 2, 0.7],
    [6, 3, 'C5', 1, 0.72], [6, 4, 'D5', 1, 0.74],
    [7, 1, 'E5', 2, 0.82], [7, 3, 'C5', 1.5, 0.7],
    [10, 3, 'G4', 1, 0.68], [10, 4, 'E4', 1, 0.66],
    [11, 1, 'A4', 3, 0.74],
    [14, 3, 'E5', 1, 0.76], [14, 4, 'D5', 1, 0.72],
    [15, 1, 'C5', 2, 0.8], [15, 3, 'G4', 2, 0.66],
  ];

  function renderWarm(ctx, master, bpm, bars) {
    var c = clock(bpm);
    var loop = bars * BEATS * c.spb;

    // A big, soft room. Camp should sound like the sound is coming from
    // somewhere past the treeline.
    var hall = S.reverb(ctx, master, {
      seconds: 3.6, decay: 2.4, wet: 0.42, tone: 4600, lowCut: 170, preDelay: 0.038, seed: 0xCA47,
    });
    var slap = S.echo(ctx, master, { time: c.beats(1.5), feedback: 0.32, damp: 2000, lowCut: 380, mix: 0.24 });

    var padBus = S.gain(ctx, 0.95, master);
    S.send(padBus, hall, 0.38);

    var lowBus = S.gain(ctx, 1, master);

    var pluckBus = S.gain(ctx, 0.9, master);
    S.send(pluckBus, hall, 0.4);
    S.send(pluckBus, slap, 0.34);

    var airBus = S.gain(ctx, 1, master);
    S.send(airBus, hall, 0.2);

    // night air, two beds, barely there
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.05, tone: 620, lowCut: 110, drift: 0.037, driftDepth: 240, pan: -0.2 });
    S.airBed(ctx, airBus, { at: 0, dur: loop, v: 0.028, tone: 1900, lowCut: 700, drift: 0.026, driftDepth: 800, pan: 0.28, seed: 71 });

    for (var bar = 1; bar <= bars; bar++) {
      var h = HARMONY[(bar - 1) % HARMONY.length];
      var t0 = c.at(bar, 1);

      // Chords overlap by half a beat, so the bed never has a seam in it.
      S.pad(ctx, padBus, {
        at: bar === 1 ? 0 : t0 - c.beats(0.5),
        dur: c.bar + c.beats(0.5),
        notes: h.pad,
        v: 0.135,
        cutoff: 1250,
        breathe: 0.045, breatheDepth: 420,
        attack: bar === 1 ? 2.2 : 0.75, decay: 0.8, sustain: 0.92, release: 1.1,
        detune: 6, spread: 0.7,
      });

      S.sub(ctx, lowBus, {
        at: t0, note: h.bass, dur: c.bar * 0.92, v: 0.26,
        attack: 0.25, decay: 0.5, sustain: 0.8, release: 0.55, tone: 165, edge: 0.1,
      });
      // the fifth an octave up, very quiet: warmth without mud
      S.sub(ctx, lowBus, {
        at: t0, note: S.midi(h.bass) + 19, dur: c.bar * 0.8, v: 0.06,
        attack: 0.5, decay: 0.6, sustain: 0.7, release: 0.6, tone: 500, edge: 0.25,
      });

      // Sparse arpeggio: root and top of the chord, beats 1 and 3, nothing more.
      S.pluck(ctx, pluckBus, {
        at: t0, note: h.pad[0], dur: c.beats(2), v: 0.1, pan: -0.28,
        open: 3400, close: 620, decay: 0.4, sustain: 0.18, release: 0.9,
      });
      S.pluck(ctx, pluckBus, {
        at: c.at(bar, 3), note: h.pad[2], dur: c.beats(2), v: 0.085, pan: 0.3,
        open: 3800, close: 700, decay: 0.4, sustain: 0.16, release: 0.9,
      });
      if (bar % 4 === 0) {
        S.pluck(ctx, pluckBus, {
          at: c.at(bar, 4.5), note: h.top, dur: c.beats(1.5), v: 0.07, pan: 0.1,
          open: 5200, close: 900, decay: 0.35, sustain: 0.2, release: 1.1,
        });
      }
    }

    // the tune, soft triangle, sitting above the pad
    var lead = S.gain(ctx, 0.9, master);
    S.send(lead, hall, 0.34);
    S.send(lead, slap, 0.22);
    for (var i = 0; i < MOTIF.length; i++) {
      var n = MOTIF[i];
      if (n[0] > bars) continue;
      var dur = c.beats(n[3]) * 0.9;
      S.tone(ctx, lead, {
        at: c.at(n[0], n[1]), note: n[2], dur: dur, v: 0.075 * n[4],
        type: 'triangle', voices: 2, detune: 5,
        cutoff: 2600, cutoffTo: 1400, cutoffTime: Math.min(dur, 0.7), q: 0.9,
        attack: 0.08, decay: 0.3, sustain: 0.7, release: 0.6,
        vibrato: n[3] >= 2 ? 5 : 0, vibratoRate: 4.4,
        pan: 0.05,
      });
    }
  }

  var composition = {
    id: 'camp',
    bpm: BPM,
    bars: BARS,
    beatsPerBar: BEATS,
    key: 'C major',
    tailSeconds: 4,
    notes: 'Between runs. One stem, no percussion.',
    layers: [
      { id: 'warm', render: renderWarm },
    ],
  };

  root.MBM_COMPOSITIONS = root.MBM_COMPOSITIONS || [];
  root.MBM_COMPOSITIONS.push(composition);
  if (typeof module !== 'undefined' && module.exports) module.exports = composition;
})();
