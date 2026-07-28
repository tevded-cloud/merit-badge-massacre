# Composition sources

These files are **data for the render harness, not game code.** `index.html` does not
load any of them and must not start: the game's live audio is `js/audio.js`, and the
music layer it will eventually play through is `js/music.js`. Everything here exists to
be baked into audio files by `tools/render/`, offline, ahead of time.

Why bake at all, when `js/audio.js` already synthesizes music live? Because a live
scheduler has to be cheap enough to run beside a bullet hell, and a render does not.
Offline, a chord can be six detuned oscillators through a convolution reverb and nobody
drops a frame. The tradeoff is that the result is a file, so it has to loop perfectly and
its layers have to line up to the sample.

## Making the files

```
npm run audio:music              render what changed, then encode it
npx electron tools/render        render only
npx electron tools/render --only act1
npx electron tools/render --force
node tools/render/encode.cjs --dry-run
node tools/render/selftest.cjs   the logic tests, no Electron, no ffmpeg
```

Rendering stages WAVs in `tools/render/out/`. Encoding turns those into
`assets/music/<theme>_<layer>.<hash8>.webm` and writes `tools/render/out/samplecounts.json`.
Neither step touches anything else in the repo.

## The contract

Each composition file is a **classic script**: no imports, no exports, no module wrapper.
It runs, and on the way past it pushes one object onto the global `MBM_COMPOSITIONS` array.

```js
(function () {
  var root = (typeof window !== 'undefined' ? window : globalThis);
  var S = root.MBMSynth;                  // helpers, already loaded

  var composition = {
    id: 'act1',                           // file name stem, no underscores
    bpm: 116,
    bars: 16,
    beatsPerBar: 4,
    key: 'A minor',                       // documentation, not used by the harness
    tailSeconds: 2.8,                     // optional, default 2.5
    notes: 'one line about the piece',    // optional
    layers: [
      { id: 'base', render: function (ctx, master, bpm, bars) { /* build here */ } },
    ],
  };

  root.MBM_COMPOSITIONS = root.MBM_COMPOSITIONS || [];
  root.MBM_COMPOSITIONS.push(composition);
  if (typeof module !== 'undefined' && module.exports) module.exports = composition;
})();
```

The `module.exports` line at the end is optional but worth keeping: it is what lets
`tools/render/selftest.cjs` load the composition in plain node and build every layer
against a stand in graph, which catches a mistyped note name or a NaN in a schedule
without launching Electron.

Add the file to `index.js` or the harness will never see it.

### `render(ctx, master, bpm, bars)`

- `ctx` is an `OfflineAudioContext`, 2 channels, 48000 Hz. Do not create your own.
- `master` is a `GainNode` already wired to `ctx.destination`. Everything you make must
  end up connected to it, directly or through your own buses.
- `bpm` and `bars` are the composition's own values, passed in so time math never has to
  reach for module scope.
- Schedule at absolute times from 0. `ctx.currentTime` is 0 and stays there.
- Returning a promise is supported. Nothing needs it yet.

### Rules the harness enforces

- **Every layer of a theme is exactly the same number of samples.** This is checked and
  it is a hard failure, because the game crossfades a theme's layers against each other:
  a one sample difference drifts a little further on every loop until the drums are
  ahead of the tune. Nothing is written to disk unless every layer of the theme agrees.
- **Loop length is computed once per theme**, as
  `round(bars * beatsPerBar * (60 / bpm) * 48000)`, and every layer is rendered into a
  context of that length plus the tail. 16 bars of 4/4 at 116 bpm is 33.1034 seconds,
  which is not a whole number of samples, so it gets rounded exactly once and the true
  count is recorded in `samplecounts.json` for the game to loop on.
- **The tail is folded, not cut.** Each layer renders `loop + tailSeconds` and then the
  tail is added back onto the head, which is what a loop that has already been playing
  actually sounds like. So reverb over the loop point is seamless and you do not need to
  leave silence at the end. Write music that runs right up to the last beat.
- **Theme ids and layer ids must not contain an underscore.** The staging and asset file
  names are `<theme>_<layer>`, and the underscore is the separator.
- `base` is encoded at 96 kbps, every other layer at 64. Name the drum carrying layer
  `base`.

### Determinism

Renders are repeatable: the noise is seeded, the dither is seeded, and nothing calls
`Math.random`. Two renders of an unchanged source produce identical bytes, which is what
lets the cache in `tools/render/out/.rendercache.json` skip work honestly, and what keeps
the `hash8` in an asset file name meaningful. If you add a helper, seed it.

## The synth helpers

`synth.js` registers `MBMSynth`. Deliberately better than the live scheduler in
`js/audio.js`: detuned oscillator stacks instead of single oscillators, filters with
their own envelopes, a convolution reverb built from a generated impulse, tempo locked
echo, and sidechain style pumping.

| helper | what it is for |
| --- | --- |
| `tone(ctx, dest, o)` | the workhorse: a detuned oscillator stack with an amp envelope and an optional filter envelope |
| `noise(ctx, dest, o)` | filtered noise burst, with an optional filter sweep |
| `kick / snare / hat` | the kit, all synthesized |
| `pad(ctx, dest, o)` | slow chord bed, one detune stack per note, spread across the stereo field |
| `pluck(ctx, dest, o)` | short and bright, filter envelope plus a resonant body |
| `sub(ctx, dest, o)` | low end that survives a laptop speaker |
| `airBed(ctx, dest, o)` | room tone, a long noise bed with a wandering filter |
| `reverb(ctx, dest, o)` | returns a send input; the wet path is already wired to `dest` |
| `echo(ctx, dest, o)` | feedback delay, damped; set `time` from the tempo |
| `tremolo(ctx, o)` | a gain node swung by an LFO; connect voices into it |
| `pump(param, times, o)` | sidechain style ducking, one duck per time in `times` |
| `midi / hz / db` | `'G#4'` and `'Bb3'` are valid everywhere a note is taken |

Notes are note names or midi numbers, interchangeably. Levels are linear gain, and the
harness reports the peak of every layer in dBFS when it renders, so aim for headroom and
let the mix add up rather than pushing any one layer to the ceiling.

If a layer is meant to be faded in mid fight (`l3` is), give it a shape across the loop
so it lands somewhere musical no matter when it arrives.

## What is here now

**`act1`** (116 bpm, 16 bars, A minor, four layers). Head, answer, lift, climax,
turnaround, one chord per bar: `Am Am F G | Am Am F E | Dm Dm C G | F G Am E7`. The G
sharp in the E chords is the harmonic minor leading tone and the whole mood of the game.

- `base` drums, bass, room tone. Always audible.
- `l1` pad and offbeat comping.
- `l2` the lead motif.
- `l3` peril: a tremoloed minor second over a root pedal, high percussion, a riser.

**`camp`** (68 bpm, 16 bars, C major, one layer `warm`). Between runs, so nothing pushes:
no percussion of any kind. C major is act 1's relative major, so leaving camp for a run
is a change of mood rather than a change of key.
