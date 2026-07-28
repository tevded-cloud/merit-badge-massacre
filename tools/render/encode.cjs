// Merit Badge Massacre: the encode half of the music harness.
//
// Takes the WAVs that tools/render staged in out/ and writes the files the game
// actually ships: assets/music/<theme>_<layer>.<hash8>.webm, Opus in WebM.
// Then it writes out/samplecounts.json, which is the one thing a lossy file
// cannot tell you afterwards: the exact number of source samples in the loop.
// Opus pads and delays; the manifest tool needs the true loop length so the game
// can loop the stems sample accurately instead of nearly.
//
//   node tools/render/encode.cjs
//   node tools/render/encode.cjs --only act1
//   node tools/render/encode.cjs --dry-run        print the plan, touch nothing
//   node tools/render/encode.cjs --force          re encode even if unchanged
//
// ffmpeg is expected on PATH. Nothing here is bundled: this is author tooling.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const Stems = require('./stems.js');
const Wav = require('./wav.js');

const HERE = __dirname;
const APP_ROOT = path.resolve(HERE, '..', '..');
const OUT_DIR = path.join(HERE, 'out');
const CACHE_PATH = path.join(OUT_DIR, '.rendercache.json');
const SIDECAR_PATH = path.join(OUT_DIR, 'samplecounts.json');
const ASSETS_MUSIC_DIR = path.join(APP_ROOT, 'assets', 'music');

// The path js/assets.js and assets/manifest.json use: relative to assets/.
const MANIFEST_PREFIX = 'music/';

const FFMPEG_MISSING =
  'encode.cjs: ffmpeg is not on PATH.\n' +
  '  This step shells out to ffmpeg to make the Opus files; there is no bundled encoder.\n' +
  '  Windows:  winget install Gyan.FFmpeg      (then open a new terminal)\n' +
  '  macOS:    brew install ffmpeg\n' +
  '  Linux:    sudo apt install ffmpeg\n' +
  '  Then run: npm run audio:music';

const OPUS_MISSING =
  'encode.cjs: this ffmpeg has no libopus encoder.\n' +
  '  The stems have to be Opus. Install a full ffmpeg build (the Gyan.FFmpeg\n' +
  '  and Homebrew builds both include libopus) and run npm run audio:music again.';

// ---------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------
function parseArgs(argv) {
  const out = { only: [], force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') { out.dryRun = true; continue; }
    if (a === '--force' || a === '-f') { out.force = true; continue; }
    if (a === '--only' && argv[i + 1]) { out.only = splitList(argv[++i]); continue; }
    if (a.indexOf('--only=') === 0) { out.only = splitList(a.slice(7)); continue; }
  }
  return out;
}

function splitList(s) {
  return String(s).split(',').map((x) => x.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------
// ffmpeg
// ---------------------------------------------------------------------
// The exact argument list, kept in one function so it can be asserted in a test
// without an encoder anywhere near it.
function buildFfmpegArgs(input, output, kbps) {
  return [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-i', input,
    '-vn',
    '-map_metadata', '-1',
    '-c:a', 'libopus',
    '-b:a', String(kbps) + 'k',
    '-vbr', 'on',
    '-compression_level', '10',
    '-application', 'audio',
    '-frame_duration', '20',
    '-ac', '2',
    '-ar', '48000',
    '-f', 'webm',
    output,
  ];
}

// Windows resolves bare .exe names through PATH on its own, but a shim named
// ffmpeg.cmd needs a shell, so fall back to one rather than claiming ffmpeg is
// missing when it is right there.
function runFfmpeg(args) {
  let res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.error && res.error.code === 'ENOENT') {
    res = spawnSync('ffmpeg', args, { encoding: 'utf8', shell: true });
  }
  return res;
}

function checkFfmpeg() {
  const probe = runFfmpeg(['-version']);
  if (probe.error || probe.status !== 0) return { ok: false, message: FFMPEG_MISSING };
  const encoders = runFfmpeg(['-hide_banner', '-encoders']);
  const text = String((encoders.stdout || '') + (encoders.stderr || ''));
  if (encoders.status === 0 && text && text.indexOf('libopus') < 0) {
    return { ok: false, message: OPUS_MISSING };
  }
  const first = String(probe.stdout || '').split('\n')[0].trim();
  return { ok: true, version: first };
}

// ---------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------
function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function loadCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (raw && raw.themes) return raw;
  } catch (e) { /* no cache: fall back to whatever wavs are in out/ */ }
  return null;
}

// Without a cache the wav files alone still describe the work: the name is
// <theme>_<layer>.wav and the header holds the sample count. Theme and layer ids
// must therefore never contain an underscore (see js/music/src/README.md).
function scanWavs() {
  let names;
  try {
    names = fs.readdirSync(OUT_DIR).filter((n) => n.toLowerCase().endsWith('.wav'));
  } catch (e) {
    return {};
  }
  const themes = {};
  names.sort().forEach((n) => {
    const stem = n.slice(0, -4);
    const cut = stem.lastIndexOf('_');
    if (cut <= 0) return;
    const id = stem.slice(0, cut);
    const layer = stem.slice(cut + 1);
    if (!themes[id]) themes[id] = { layers: [] };
    themes[id].layers.push({ id: layer, wav: n });
  });
  return themes;
}

// The render cache is the good source, because it carries bpm, bars and key.
// Any wav sitting in out/ that the cache has never heard of still gets encoded
// though: dropping a file in the staging folder should just work.
function collectThemes() {
  const cache = loadCache();
  const themes = {};
  if (cache) {
    Object.keys(cache.themes).forEach((id) => {
      themes[id] = Object.assign({}, cache.themes[id], { layers: (cache.themes[id].layers || []).slice() });
    });
  }
  const scanned = scanWavs();
  Object.keys(scanned).forEach((id) => {
    if (!themes[id]) { themes[id] = scanned[id]; return; }
    const known = themes[id].layers.map((l) => l.id);
    scanned[id].layers.forEach((l) => { if (known.indexOf(l.id) < 0) themes[id].layers.push(l); });
  });
  return { cache, themes };
}

function buildPlan(args) {
  const collected = collectThemes();
  const cache = collected.cache;
  const themes = collected.themes;
  const ids = Object.keys(themes).sort();
  const wanted = args.only.length ? ids.filter((id) => args.only.indexOf(id) >= 0) : ids;

  const missing = args.only.filter((id) => ids.indexOf(id) < 0);
  const jobs = [];

  wanted.forEach((id) => {
    const theme = themes[id] || {};
    (theme.layers || []).forEach((layer) => {
      const wav = path.join(OUT_DIR, layer.wav || Stems.wavName(id, layer.id));
      const exists = fs.existsSync(wav);
      let info = null;
      let hash8 = null;
      if (exists) {
        info = Wav.readWavInfo(fs.readFileSync(wav));
        hash8 = sha256File(wav).slice(0, 8);
      }
      const kbps = Stems.bitrateFor(layer.id);
      const name = Stems.assetName(id, layer.id, hash8 || 'x'.repeat(8));
      jobs.push({
        theme: id,
        layer: layer.id,
        wav,
        wavName: path.basename(wav),
        exists,
        hash8,
        kbps,
        assetName: name,
        assetPath: path.join(ASSETS_MUSIC_DIR, name),
        manifestPath: MANIFEST_PREFIX + name,
        // the cache's count and the file's own header must agree, or something
        // rewrote the wav behind the harness's back
        cachedSamples: typeof layer.samples === 'number' ? layer.samples : null,
        samples: info ? info.samples : (typeof layer.samples === 'number' ? layer.samples : null),
        sampleRate: info ? info.sampleRate : (theme.sampleRate || 48000),
        channels: info ? info.channels : 2,
        args: buildFfmpegArgs(wav, path.join(ASSETS_MUSIC_DIR, name), kbps),
      });
    });
  });

  return { cache, themes, jobs, missing };
}

// Old encodes of the same stem: same theme and layer, different hash.
function stalePeers(job) {
  let names;
  try {
    names = fs.readdirSync(ASSETS_MUSIC_DIR);
  } catch (e) {
    return [];
  }
  const prefix = job.theme + '_' + job.layer + '.';
  return names.filter((n) =>
    n.indexOf(prefix) === 0 && n.toLowerCase().endsWith('.webm') && n !== job.assetName);
}

// ---------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------
function main() {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildPlan(args);

  if (plan.missing.length) {
    console.error('encode.cjs: --only named theme(s) with nothing staged: ' + plan.missing.join(', '));
    console.error('  staged themes: ' + (Object.keys(plan.themes).join(', ') || 'none'));
    process.exit(1);
  }
  if (!plan.jobs.length) {
    console.error('encode.cjs: nothing to encode. Run npx electron tools/render first;' +
      ' it stages wav files in ' + path.relative(APP_ROOT, OUT_DIR) + '.');
    process.exit(1);
  }

  if (args.dryRun) {
    console.log('encode.cjs: dry run, nothing will be written.');
    plan.jobs.forEach((job) => {
      console.log('  ' + job.theme + '/' + job.layer + ': ' + job.kbps + 'k -> ' + job.manifestPath +
        (job.exists ? ' (' + job.samples + ' samples)' : ' (wav not staged yet)'));
      console.log('    ffmpeg ' + job.args.join(' '));
    });
    return;
  }

  const ff = checkFfmpeg();
  if (!ff.ok) {
    console.error(ff.message);
    process.exit(1);
  }

  const notStaged = plan.jobs.filter((j) => !j.exists);
  if (notStaged.length) {
    console.error('encode.cjs: these stems are listed but their wav is not in out/:');
    notStaged.forEach((j) => console.error('  ' + j.wavName));
    console.error('  Run npx electron tools/render --force to rebuild them.');
    process.exit(1);
  }

  const drift = plan.jobs.filter((j) => j.cachedSamples !== null && j.cachedSamples !== j.samples);
  if (drift.length) {
    console.error('encode.cjs: a staged wav does not match what the render step recorded:');
    drift.forEach((j) => console.error('  ' + j.wavName + ': header says ' + j.samples +
      ' samples, the render cache says ' + j.cachedSamples));
    console.error('  Run npx electron tools/render --force to rebuild them.');
    process.exit(1);
  }

  fs.mkdirSync(ASSETS_MUSIC_DIR, { recursive: true });

  let encoded = 0;
  let reused = 0;
  plan.jobs.forEach((job) => {
    const already = fs.existsSync(job.assetPath);
    if (already && !args.force) {
      reused++;
    } else {
      const res = runFfmpeg(job.args);
      if (res.error || res.status !== 0) {
        console.error('encode.cjs: ffmpeg failed on ' + job.wavName);
        console.error('  ffmpeg ' + job.args.join(' '));
        if (res.stderr) console.error(String(res.stderr).trim());
        process.exit(1);
      }
      encoded++;
    }
    // The hash is in the name, so an old encode of the same stem is dead weight
    // that the manifest would otherwise index and ship.
    stalePeers(job).forEach((n) => {
      try {
        fs.unlinkSync(path.join(ASSETS_MUSIC_DIR, n));
        console.log('  removed stale ' + MANIFEST_PREFIX + n);
      } catch (e) { /* someone else got there first */ }
    });
    job.bytes = fs.existsSync(job.assetPath) ? fs.statSync(job.assetPath).size : 0;
    console.log('  ' + job.theme + '/' + job.layer + ': ' + job.samples + ' samples @ ' +
      job.sampleRate + ' Hz -> ' + job.manifestPath + ' (' + job.kbps + 'k, ' +
      job.bytes + ' bytes)' + (already && !args.force ? ' [unchanged]' : ''));
  });

  writeSidecar(plan);

  console.log('encode.cjs: ' + encoded + ' encoded, ' + reused + ' unchanged. ' +
    'Sample counts in ' + path.relative(APP_ROOT, SIDECAR_PATH) + '.');
  console.log('encode.cjs: run npm run audio:manifest to index the new files.');
}

// The sidecar the manifest tool merges. Keyed by the same assets relative path
// assets/manifest.json uses, so merging is a lookup and not a parse.
function writeSidecar(plan) {
  const files = {};
  const themes = {};
  plan.jobs.forEach((job) => {
    const meta = (plan.cache && plan.cache.themes && plan.cache.themes[job.theme]) || {};
    files[job.manifestPath] = {
      theme: job.theme,
      layer: job.layer,
      samples: job.samples,
      sampleRate: job.sampleRate,
      seconds: Number((job.samples / job.sampleRate).toFixed(6)),
      channels: job.channels,
      bitrateKbps: job.kbps,
      bytes: job.bytes || 0,
      sourceWav: job.wavName,
      sourceSha256: job.hash8,
    };
    if (!themes[job.theme]) {
      themes[job.theme] = {
        bpm: meta.bpm || null,
        bars: meta.bars || null,
        beatsPerBar: meta.beatsPerBar || null,
        key: meta.key || null,
        sampleRate: job.sampleRate,
        samples: job.samples,
        seconds: Number((job.samples / job.sampleRate).toFixed(6)),
        layers: [],
      };
    }
    themes[job.theme].layers.push({ id: job.layer, file: job.manifestPath, samples: job.samples });
  });

  // Every layer of a theme has to agree here too. The render step already
  // proved it; this catches a wav swapped out by hand afterwards.
  Object.keys(themes).forEach((id) => {
    const layers = themes[id].layers;
    const bad = layers.filter((l) => l.samples !== themes[id].samples);
    if (bad.length) {
      console.error('encode.cjs: theme "' + id + '" has layers of different lengths:');
      layers.forEach((l) => console.error('  ' + l.id + ': ' + l.samples + ' samples'));
      process.exit(1);
    }
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(SIDECAR_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: 'Exact source sample counts per stem. Opus cannot carry these, the game needs them to loop.',
    files: files,
    themes: themes,
  }, null, 2) + '\n', 'utf8');
}

module.exports = {
  buildFfmpegArgs,
  parseArgs,
  buildPlan,
  collectThemes,
  scanWavs,
  checkFfmpeg,
  FFMPEG_MISSING,
  OPUS_MISSING,
  MANIFEST_PREFIX,
};

if (require.main === module) main();
