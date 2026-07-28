// Merit Badge Massacre: pure logic tests for the music harness.
//
//   node tools/render/selftest.cjs
//
// Everything in here runs in plain node with no Electron, no Web Audio and no
// ffmpeg: the WAV writer, the loop length rules, the tail fold, the sample count
// assertion, and the ffmpeg argument list. What it cannot test is the audio
// itself, which needs Chromium. That is what npm run audio:music is for.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const Wav = require('./wav.js');
const Stems = require('./stems.js');
const Encode = require('./encode.cjs');
const Fake = require('./fakeaudio.cjs');

const OUT_DIR = path.join(__dirname, 'out');

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (e) {
    failures.push(name + ': ' + (e && e.message ? e.message : e));
    console.log('  FAIL ' + name + '\n       ' + (e && e.message ? e.message : e));
  }
}

function eq(actual, expected, what) {
  if (actual !== expected) {
    throw new Error((what || 'value') + ' was ' + actual + ', expected ' + expected);
  }
}

function near(actual, expected, tol, what) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error((what || 'value') + ' was ' + actual + ', expected about ' + expected);
  }
}

function throws(fn, needle, what) {
  let message = null;
  try { fn(); } catch (e) { message = e.message; }
  if (message === null) throw new Error((what || 'call') + ' did not throw');
  if (needle && message.indexOf(needle) < 0) {
    throw new Error((what || 'call') + ' threw the wrong message: ' + message);
  }
}

// A stand in for an AudioBuffer. foldTail only ever asks for numberOfChannels,
// length and getChannelData, which is the whole reason it lives in stems.js.
function stubBuffer(channels, length, fill) {
  const data = [];
  for (let c = 0; c < channels; c++) {
    const arr = new Float32Array(length);
    for (let i = 0; i < length; i++) arr[i] = fill(c, i);
    data.push(arr);
  }
  return {
    numberOfChannels: channels,
    length: length,
    sampleRate: 48000,
    getChannelData: (c) => data[c],
  };
}

console.log('stem length rules');

check('act1 loop length is exact and shared', () => {
  const comp = { id: 'act1', bpm: 116, bars: 16, beatsPerBar: 4 };
  const n = Stems.themeSampleCount(comp, 48000);
  // 16 bars x 4 beats at 116 bpm is 33.1034... s, which is not a whole number
  // of samples. It gets rounded once, here, and every layer then uses this.
  eq(n, 1588966, 'act1 sample count');
  near(n / 48000, 33.1034, 0.001, 'act1 seconds');
  eq(Stems.themeSampleCount(comp, 48000), n, 'second call');
});

check('camp loop length is exact', () => {
  // 64 beats at 68 bpm is 56.470... s: 184320000 / 68 samples, rounded down
  const n = Stems.themeSampleCount({ id: 'camp', bpm: 68, bars: 16, beatsPerBar: 4 }, 48000);
  eq(n, 2710588, 'camp sample count');
  near(n / 48000, 56.4706, 0.001, 'camp seconds');
});

check('a theme with no tempo is refused', () => {
  throws(() => Stems.themeSampleCount({ id: 'broken', bars: 16 }, 48000), 'positive bpm');
});

check('tail length follows tailSeconds, with a default', () => {
  eq(Stems.tailSampleCount({ id: 'a', tailSeconds: 2.8 }, 48000), 134400, 'act1 tail');
  eq(Stems.tailSampleCount({ id: 'a' }, 48000), 120000, 'default tail');
  eq(Stems.tailSampleCount({ id: 'a', tailSeconds: 0 }, 48000), 0, 'zero tail');
});

console.log('tail fold');

check('fold returns exactly the loop length and wraps the tail onto the head', () => {
  const loop = 1000;
  const tail = 250;
  // head is 1 everywhere, tail is 0.25 everywhere: after folding, the first 250
  // samples must be 1.25 and the rest still 1
  const buf = stubBuffer(2, loop + tail, (c, i) => (i < loop ? 1 : 0.25));
  const out = Stems.foldTail(buf, loop);
  eq(out.length, loop, 'folded length');
  eq(out.tail, tail, 'tail size');
  eq(out.channels.length, 2, 'channel count');
  near(out.channels[0][0], 1.25, 1e-6, 'first sample');
  near(out.channels[0][249], 1.25, 1e-6, 'last folded sample');
  near(out.channels[0][250], 1, 1e-6, 'first unfolded sample');
  near(out.channels[1][999], 1, 1e-6, 'last sample');
  near(out.peak, 1.25, 1e-6, 'reported peak');
});

check('a tail longer than the loop still wraps round', () => {
  const buf = stubBuffer(1, 10 + 25, (c, i) => (i < 10 ? 0 : 1));
  const out = Stems.foldTail(buf, 10);
  eq(out.length, 10, 'folded length');
  // 25 tail samples over a 10 sample loop: samples 0..4 get 3 hits, 5..9 get 2
  near(out.channels[0][0], 3, 1e-6, 'triple wrapped sample');
  near(out.channels[0][9], 2, 1e-6, 'double wrapped sample');
});

check('a loop longer than what was rendered is refused', () => {
  const buf = stubBuffer(1, 100, () => 0);
  throws(() => Stems.foldTail(buf, 200), 'exceeds rendered length');
});

console.log('sample count assertion');

check('matching layers pass and report the count', () => {
  const n = Stems.assertSameLength('act1', [
    { id: 'base', length: 1588966 },
    { id: 'l1', length: 1588966 },
    { id: 'l2', length: 1588966 },
    { id: 'l3', length: 1588966 },
  ]);
  eq(n, 1588966, 'agreed length');
});

check('one wrong layer hard fails and names it', () => {
  let message = null;
  try {
    Stems.assertSameLength('act1', [
      { id: 'base', length: 1588966 },
      { id: 'l1', length: 1588966 },
      { id: 'l2', length: 1588965 },
      { id: 'l3', length: 1588966 },
    ]);
  } catch (e) { message = e.message; }
  if (message === null) throw new Error('mismatched layers did not throw');
  ['act1', 'l2', '1588965', '1588966', 'wrong'].forEach((needle) => {
    if (message.indexOf(needle) < 0) throw new Error('message never mentions "' + needle + '": ' + message);
  });
});

check('the expected count wins over the first layer', () => {
  throws(() => Stems.assertSameLength('act1', [
    { id: 'base', length: 10 },
    { id: 'l1', length: 10 },
  ], 1588966), 'do not match');
});

check('a theme with no layers is refused', () => {
  throws(() => Stems.assertSameLength('act1', []), 'rendered no layers');
});

console.log('wav writer');

check('header describes 48 kHz 16 bit stereo', () => {
  const frames = 128;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  const bytes = Wav.encodeWav([left, right], { sampleRate: 48000, dither: false });
  eq(bytes.length, 44 + frames * 4, 'file size');
  const view = new DataView(bytes.buffer);
  eq(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), 'RIFF', 'RIFF tag');
  eq(String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]), 'WAVE', 'WAVE tag');
  eq(view.getUint32(4, true), 36 + frames * 4, 'RIFF size');
  eq(view.getUint16(20, true), 1, 'PCM format');
  eq(view.getUint16(22, true), 2, 'channels');
  eq(view.getUint32(24, true), 48000, 'sample rate');
  eq(view.getUint32(28, true), 48000 * 4, 'byte rate');
  eq(view.getUint16(32, true), 4, 'block align');
  eq(view.getUint16(34, true), 16, 'bit depth');
  eq(view.getUint32(40, true), frames * 4, 'data size');
});

check('samples quantize, interleave, clamp and survive NaN', () => {
  const left = new Float32Array([0, 1, -1, 0.5, 2, NaN]);
  const right = new Float32Array([0.25, -0.25, 0, -2, 0, 0]);
  const bytes = Wav.encodeWav([left, right], { sampleRate: 48000, dither: false });
  const view = new DataView(bytes.buffer);
  const s = (frame, ch) => view.getInt16(44 + frame * 4 + ch * 2, true);
  eq(s(0, 0), 0, 'silence');
  eq(s(0, 1), 8192, 'right channel of frame 0');       // 0.25 * 32767 rounds to 8192
  eq(s(1, 0), 32767, 'full scale positive');
  eq(s(1, 1), -8192, 'negative quarter');
  eq(s(2, 0), -32767, 'full scale negative');
  eq(s(3, 0), 16384, 'half scale');                     // 0.5 * 32767 rounds to 16384
  eq(s(3, 1), -32768, 'clamped below');                 // -2 clamps to the int16 floor
  eq(s(4, 0), 32767, 'clamped above');
  eq(s(5, 0), 0, 'NaN became silence');
});

check('dither is on by default, repeatable, and stays within one LSB', () => {
  const frames = 512;
  const quiet = new Float32Array(frames); // digital black
  const a = Wav.encodeWav([quiet, quiet], { sampleRate: 48000 });
  const b = Wav.encodeWav([quiet, quiet], { sampleRate: 48000 });
  let differs = false;
  let worst = 0;
  const va = new DataView(a.buffer);
  const vb = new DataView(b.buffer);
  for (let i = 44; i < a.length; i += 2) {
    const x = va.getInt16(i, true);
    if (x !== 0) differs = true;
    if (Math.abs(x) > worst) worst = Math.abs(x);
    if (x !== vb.getInt16(i, true)) throw new Error('two renders of the same input differ at byte ' + i);
  }
  if (!differs) throw new Error('dither never moved a single sample');
  if (worst > 1) throw new Error('dither reached ' + worst + ' LSB, expected at most 1');
});

check('a different seed gives different dither', () => {
  const frames = 256;
  const quiet = new Float32Array(frames);
  const a = Wav.encodeWav([quiet, quiet], { seed: 1 });
  const b = Wav.encodeWav([quiet, quiet], { seed: 2 });
  let same = true;
  for (let i = 44; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
  if (same) throw new Error('two seeds produced identical dither');
});

check('mismatched channel lengths are refused', () => {
  throws(() => Wav.encodeWav([new Float32Array(10), new Float32Array(9)], {}), 'frames');
});

check('reading back a written file recovers the sample count', () => {
  const frames = 1588966 % 4096 + 7; // an awkward length on purpose
  const bytes = Wav.encodeWav([new Float32Array(frames), new Float32Array(frames)], { sampleRate: 48000 });
  const info = Wav.readWavInfo(bytes);
  eq(info.channels, 2, 'channels');
  eq(info.sampleRate, 48000, 'sample rate');
  eq(info.bitsPerSample, 16, 'bit depth');
  eq(info.samples, frames, 'sample count');
  eq(info.dataBytes, frames * 4, 'data bytes');
});

check('a file that is not a wav is refused', () => {
  throws(() => Wav.readWavInfo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), 'not a RIFF');
});

console.log('naming and bitrates');

check('stem names match the shipping convention', () => {
  eq(Stems.wavName('act1', 'base'), 'act1_base.wav', 'wav name');
  eq(Stems.assetName('act1', 'l2', 'a1b2c3d4'), 'act1_l2.a1b2c3d4.webm', 'asset name');
  eq(Stems.bitrateFor('base'), 96, 'base bitrate');
  eq(Stems.bitrateFor('l1'), 64, 'l1 bitrate');
  eq(Stems.bitrateFor('l2'), 64, 'l2 bitrate');
  eq(Stems.bitrateFor('l3'), 64, 'l3 bitrate');
  eq(Stems.bitrateFor('warm'), 64, 'camp bitrate');
});

console.log('ffmpeg arguments');

check('base gets 96k Opus in WebM, stereo, 48 kHz', () => {
  const args = Encode.buildFfmpegArgs('/in/act1_base.wav', '/out/act1_base.abc12345.webm', 96);
  const joined = args.join(' ');
  [
    '-c:a libopus', '-b:a 96k', '-ac 2', '-ar 48000', '-f webm',
    '-vbr on', '-application audio', '-i /in/act1_base.wav',
  ].forEach((needle) => {
    if (joined.indexOf(needle) < 0) throw new Error('missing "' + needle + '" in: ' + joined);
  });
  eq(args[args.length - 1], '/out/act1_base.abc12345.webm', 'output is the last argument');
  eq(args[0], '-y', 'overwrite flag comes first');
  if (joined.indexOf('-vn') < 0) throw new Error('video stream is not disabled');
});

check('support layers get 64k', () => {
  const args = Encode.buildFfmpegArgs('in.wav', 'out.webm', Stems.bitrateFor('l3'));
  if (args.join(' ').indexOf('-b:a 64k') < 0) throw new Error('l3 was not encoded at 64k');
});

check('argument list is a real array, never a shell string', () => {
  const args = Encode.buildFfmpegArgs('a file with spaces.wav', 'out.webm', 96);
  const i = args.indexOf('-i');
  eq(args[i + 1], 'a file with spaces.wav', 'path with spaces stays one argument');
});

check('the missing ffmpeg message says how to install it', () => {
  ['winget', 'brew', 'apt', 'PATH'].forEach((needle) => {
    if (Encode.FFMPEG_MISSING.indexOf(needle) < 0) {
      throw new Error('install message never mentions ' + needle);
    }
  });
});

console.log('encode dry run');

check('dry run plans real staged wavs and writes nothing', () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fixtureName = 'selftestfixture_base.wav';
  const fixture = path.join(OUT_DIR, fixtureName);
  const before = fs.readdirSync(OUT_DIR);
  const frames = 4800;
  fs.writeFileSync(fixture, Buffer.from(
    Wav.encodeWav([new Float32Array(frames), new Float32Array(frames)], { sampleRate: 48000 })));
  try {
    const res = spawnSync(process.execPath,
      [path.join(__dirname, 'encode.cjs'), '--dry-run', '--only', 'selftestfixture'],
      { encoding: 'utf8' });
    eq(res.status, 0, 'exit code');
    const out = String(res.stdout || '');
    ['dry run', 'selftestfixture/base', 'music/selftestfixture_base.', '96k',
      '-c:a libopus', String(frames) + ' samples'].forEach((needle) => {
      if (out.indexOf(needle) < 0) throw new Error('dry run output never mentions "' + needle + '":\n' + out);
    });
    // the hash8 in the planned name has to be a real hash of the real file
    const m = /music\/selftestfixture_base\.([0-9a-f]{8})\.webm/.exec(out);
    if (!m) throw new Error('planned asset name has no 8 character hash:\n' + out);
    const after = fs.readdirSync(OUT_DIR).filter((n) => n !== fixtureName);
    const added = after.filter((n) => before.indexOf(n) < 0);
    if (added.length) throw new Error('dry run wrote ' + added.join(', '));
    if (fs.existsSync(path.join(__dirname, '..', '..', 'assets', 'music', m[0].slice(6)))) {
      throw new Error('dry run created an asset file');
    }
  } finally {
    try { fs.unlinkSync(fixture); } catch (e) { /* already gone */ }
  }
});

check('dry run refuses a theme that is not staged', () => {
  const res = spawnSync(process.execPath,
    [path.join(__dirname, 'encode.cjs'), '--dry-run', '--only', 'nosuchtheme'],
    { encoding: 'utf8' });
  eq(res.status, 1, 'exit code');
  if (String(res.stderr || '').indexOf('nosuchtheme') < 0) {
    throw new Error('the error never names the missing theme: ' + res.stderr);
  }
});

check('flags parse in both spellings', () => {
  const a = Encode.parseArgs(['--only', 'act1,camp', '--dry-run']);
  eq(a.only.join('|'), 'act1|camp', 'comma list');
  eq(a.dryRun, true, 'dry run flag');
  eq(a.force, false, 'force defaults off');
  const b = Encode.parseArgs(['--only=act1', '--force']);
  eq(b.only.join('|'), 'act1', 'equals form');
  eq(b.force, true, 'force flag');
});

console.log('composition sources');

// Compositions are just functions that build a graph, so they can be built
// against a stand in graph right here. This does not prove the music sounds
// good, only that every layer builds cleanly and schedules legal events.
const SRC_DIR = path.join(__dirname, '..', '..', 'js', 'music', 'src');
const sources = require(path.join(SRC_DIR, 'index.js'));

check('index.js lists files that exist', () => {
  const all = (sources.helpers || []).concat(sources.compositions || []);
  if (!all.length) throw new Error('index.js lists nothing');
  if (!(sources.compositions || []).length) throw new Error('index.js lists no compositions');
  all.forEach((name) => {
    if (!fs.existsSync(path.join(SRC_DIR, name))) throw new Error('index.js lists a missing file: ' + name);
  });
});

check('none of the composition sources are loaded by the game', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  if (html.indexOf('js/music/src') >= 0) {
    throw new Error('index.html loads something from js/music/src; these files are render only data');
  }
  (sources.compositions || []).concat(sources.helpers || []).forEach((name) => {
    if (html.indexOf('js/music/' + name) >= 0) throw new Error('index.html loads ' + name);
  });
});

global.MBMSynth = require(path.join(SRC_DIR, 'synth.js'));

check('synth note names and frequencies are right', () => {
  const S = global.MBMSynth;
  eq(S.midi('A4'), 69, 'A4');
  eq(S.midi('C4'), 60, 'middle C');
  eq(S.midi('G#4'), 68, 'G sharp 4');
  eq(S.midi('Bb3'), 58, 'B flat 3');
  eq(S.midi('A2'), 45, 'A2');
  eq(S.midi(64), 64, 'a midi number passes through');
  near(S.hz('A4'), 440, 1e-9, 'A4 in hertz');
  near(S.hz('A2'), 110, 1e-9, 'A2 in hertz');
  throws(() => S.midi('H4'), 'bad note name', 'a bogus note name');
});

const built = [];
(sources.compositions || []).forEach((name) => {
  const comp = require(path.join(SRC_DIR, name));
  built.push({ name, comp });
});

built.forEach((entry) => {
  const comp = entry.comp;

  check('theme ' + comp.id + ' declares a complete contract', () => {
    if (!comp.id) throw new Error('no id');
    if (comp.id.indexOf('_') >= 0) throw new Error('id "' + comp.id + '" has an underscore, which is the file name separator');
    if (!(comp.bpm > 0)) throw new Error('no bpm');
    if (!(comp.bars > 0)) throw new Error('no bars');
    eq(comp.beatsPerBar, 4, 'beatsPerBar');
    if (!comp.key) throw new Error('no key');
    if (!Array.isArray(comp.layers) || !comp.layers.length) throw new Error('no layers');
    const seen = {};
    comp.layers.forEach((l) => {
      if (!l.id) throw new Error('a layer has no id');
      if (l.id.indexOf('_') >= 0) throw new Error('layer id "' + l.id + '" has an underscore');
      if (typeof l.render !== 'function') throw new Error('layer ' + l.id + ' has no render function');
      if (seen[l.id]) throw new Error('two layers called ' + l.id);
      seen[l.id] = true;
    });
  });

  check('theme ' + comp.id + ' builds every layer against a stand in graph', () => {
    const sampleRate = 48000;
    const loop = Stems.themeSampleCount(comp, sampleRate);
    const tail = Stems.tailSampleCount(comp, sampleRate);
    const total = loop + tail;
    const lengths = [];

    comp.layers.forEach((layer) => {
      const ctx = Fake.makeContext({ sampleRate, length: total });
      const master = ctx.createGain();
      master.connect(ctx.destination);
      const result = layer.render(ctx, master, comp.bpm, comp.bars);
      if (result && typeof result.then === 'function') {
        throw new Error('layer ' + layer.id + ' returned a promise; the harness supports it but nothing needs it yet');
      }
      if (ctx.problems.length) {
        throw new Error('layer ' + layer.id + ' scheduled ' + ctx.problems.length +
          ' illegal event(s):\n       ' + ctx.problems.slice(0, 6).join('\n       '));
      }
      if (master.__in === 0) throw new Error('layer ' + layer.id + ' connected nothing to master');
      if (ctx.stats.nodes < 8) throw new Error('layer ' + layer.id + ' built only ' + ctx.stats.nodes + ' nodes');
      const limit = total / sampleRate + 30;
      if (ctx.stats.maxTime > limit) {
        throw new Error('layer ' + layer.id + ' schedules something at ' + ctx.stats.maxTime.toFixed(1) +
          ' s, far past the ' + (total / sampleRate).toFixed(1) + ' s render');
      }
      // every layer of a theme is rendered into a context of this one length,
      // which is what makes the sample counts match by construction
      lengths.push({ id: layer.id, length: loop });
    });

    Stems.assertSameLength(comp.id, lengths, loop);
  });
});

check('act1 is the four stem contract at 116 bpm in A minor', () => {
  const act1 = built.filter((b) => b.comp.id === 'act1')[0];
  if (!act1) throw new Error('act1 is not registered');
  eq(act1.comp.bpm, 116, 'bpm');
  eq(act1.comp.bars, 16, 'bars');
  eq(act1.comp.key, 'A minor', 'key');
  eq(act1.comp.layers.map((l) => l.id).join(','), 'base,l1,l2,l3', 'layer ids');
});

check('camp is one warm stem, slow, with no percussion', () => {
  const camp = built.filter((b) => b.comp.id === 'camp')[0];
  if (!camp) throw new Error('camp is not registered');
  eq(camp.comp.layers.length, 1, 'layer count');
  eq(camp.comp.layers[0].id, 'warm', 'layer id');
  eq(camp.comp.bars, 16, 'bars');
  if (camp.comp.bpm >= 100) throw new Error('camp is meant to be slow, it is at ' + camp.comp.bpm + ' bpm');
  const src = fs.readFileSync(path.join(SRC_DIR, 'camp.js'), 'utf8');
  ['S.kick(', 'S.hat(', 'S.snare('].forEach((call) => {
    if (src.indexOf(call) >= 0) throw new Error('camp uses ' + call + ', it is supposed to have no percussion');
  });
});

console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' FAILED');
  failures.forEach((f) => console.log('  ' + f));
  process.exit(1);
}
console.log(passed + ' passed. Audio itself is untested here: that needs npm run audio:music.');
