// Merit Badge Massacre: the offline music render harness (Electron main).
//
// Author tooling, never shipped: electron-builder's files list does not include
// tools/. Run it with
//
//   npx electron tools/render                  render everything that changed
//   npx electron tools/render --only act1      render one theme
//   npx electron tools/render --force          render everything, cache be damned
//
// It opens a hidden page, hands it the composition sources from js/music/src,
// and the page renders every layer of every theme through an OfflineAudioContext
// and ships the finished WAVs back over IPC. Nothing is written anywhere except
// tools/render/out/.
//
// Chromium is here because it has the only Web Audio implementation this project
// already depends on: the stems then sound like the game, because they are made
// by the same engine the game plays through.
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const HERE = __dirname;
const APP_ROOT = path.resolve(HERE, '..', '..');
const SRC_DIR = path.join(APP_ROOT, 'js', 'music', 'src');
const OUT_DIR = path.join(HERE, 'out');
const CACHE_PATH = path.join(OUT_DIR, '.rendercache.json');
const LOG_PATH = path.join(OUT_DIR, 'render.log');
const REPORT_PATH = path.join(OUT_DIR, 'render.json');

const SAMPLE_RATE = 48000;
// Bump when the renderer or the synth helpers change in a way that alters the
// audio, so every cached theme re renders instead of going stale.
const RENDER_VERSION = 1;
const WATCHDOG_MS = 20 * 60 * 1000;

// ---------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------
function parseArgs(argv) {
  const out = { only: [], force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
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
// Logging: Electron's stdout is not reliably attached to the parent console on
// Windows, so every line also lands in out/render.log.
// ---------------------------------------------------------------------
let logStream = null;
function log(line) {
  const text = String(line);
  try { process.stdout.write(text + '\n'); } catch (e) { /* no console attached */ }
  try { if (logStream) logStream.write(text + '\n'); } catch (e) { /* disk is full, keep going */ }
}

// ---------------------------------------------------------------------
// Sources and hashes
// ---------------------------------------------------------------------
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readSource(name) {
  const abs = path.join(SRC_DIR, name);
  if (!fs.existsSync(abs)) {
    throw new Error('missing composition source: ' + path.relative(APP_ROOT, abs) +
      '\n  js/music/src/index.js lists it, but it is not on disk.');
  }
  return { name, abs, bytes: fs.readFileSync(abs) };
}

function collectSources() {
  const listPath = path.join(SRC_DIR, 'index.js');
  if (!fs.existsSync(listPath)) {
    throw new Error('missing ' + path.relative(APP_ROOT, listPath) +
      '\n  The harness reads that file to know which compositions exist.');
  }
  delete require.cache[require.resolve(listPath)];
  const list = require(listPath);
  const helpers = (list.helpers || []).map(readSource);
  const compositions = (list.compositions || []).map(readSource);
  if (!compositions.length) throw new Error('js/music/src/index.js lists no compositions');

  // Every theme's hash folds in the helpers and the harness version: a change
  // to synth.js changes the audio of every theme, so it has to invalidate them.
  const helperHash = sha256(Buffer.concat([
    Buffer.from('v' + RENDER_VERSION + '|'),
    ...helpers.map((h) => h.bytes),
  ]));

  // The source text travels over IPC rather than the page fetching it. A page
  // loaded with loadFile could pull a file:// script out of js/music/src, but
  // handing it the text is one less thing that can quietly not work, and the
  // main process has already read every byte to hash it anyway.
  return {
    helperHash,
    helpers: helpers.map((h) => ({
      name: h.name,
      url: fileUrl(h.abs),
      code: h.bytes.toString('utf8'),
    })),
    compositions: compositions.map((c) => ({
      name: c.name,
      url: fileUrl(c.abs),
      code: c.bytes.toString('utf8'),
      hash: sha256(Buffer.concat([Buffer.from(helperHash + '|'), c.bytes])),
      sourceHash: sha256(c.bytes),
    })),
  };
}

function fileUrl(abs) {
  // pathToFileURL, not string surgery: it gets drive letters, spaces and the
  // characters that are legal in a Windows path but not in a URL right.
  return pathToFileURL(abs).toString();
}

// ---------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------
function loadCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (raw && raw.version === RENDER_VERSION && raw.themes) return raw;
  } catch (e) { /* no cache, or a cache from an older harness: render everything */ }
  return { version: RENDER_VERSION, sampleRate: SAMPLE_RATE, themes: {} };
}

// A cache entry is only trustworthy if the files it claims to have produced are
// still sitting in out/. Deleting a wav is a legitimate way to force a re render.
function markPresence(cache) {
  Object.keys(cache.themes).forEach((id) => {
    const entry = cache.themes[id];
    const layers = entry.layers || [];
    entry.wavsPresent = layers.length > 0 && layers.every(
      (l) => l.wav && fs.existsSync(path.join(OUT_DIR, l.wav)));
  });
  return cache;
}

// ---------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

function writeOut(name, bytes) {
  if (typeof name !== 'string' || !SAFE_NAME.test(name) || name.indexOf('..') >= 0) {
    throw new Error('refusing to write unsafe name: ' + name);
  }
  const abs = path.join(OUT_DIR, name);
  if (path.dirname(abs) !== OUT_DIR) throw new Error('refusing to write outside out/: ' + name);
  const buf = Buffer.from(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength || bytes.length);
  fs.writeFileSync(abs, buf);
  return { path: abs, bytes: buf.length };
}

function finish(code, win) {
  try { if (logStream) logStream.end(); } catch (e) { /* already closed */ }
  try { if (win && !win.isDestroyed()) win.destroy(); } catch (e) { /* already gone */ }
  app.exit(code);
}

function main() {
  const args = parseArgs(process.argv.slice(1));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });

  let sources;
  try {
    sources = collectSources();
  } catch (e) {
    log('render: FAILED before starting.\n  ' + e.message);
    finish(1, null);
    return;
  }

  const cache = markPresence(loadCache());
  const job = {
    sampleRate: SAMPLE_RATE,
    renderVersion: RENDER_VERSION,
    force: args.force,
    only: args.only,
    helpers: sources.helpers,
    compositions: sources.compositions,
    cache: cache.themes,
  };

  log('render: ' + sources.compositions.length + ' composition source(s), ' +
    (args.only.length ? 'only ' + args.only.join(', ') : 'all themes') +
    (args.force ? ', forced' : '') + ', ' + SAMPLE_RATE + ' Hz');

  const win = new BrowserWindow({
    show: false,
    width: 480,
    height: 320,
    webPreferences: {
      preload: path.join(HERE, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  const watchdog = setTimeout(() => {
    log('render: FAILED, the render page went quiet for ' + Math.round(WATCHDOG_MS / 60000) +
      ' minutes. Nothing was committed to the cache.');
    finish(1, win);
  }, WATCHDOG_MS);

  // If the page never even asks for its job, the bridge is broken. Fail in a
  // few seconds rather than sitting there until the long watchdog gives up.
  const bootWatchdog = setTimeout(() => {
    log('render: FAILED, the render page never asked for its job.\n' +
      '  tools/render/preload.cjs did not load, so the page has no way to talk back.');
    finish(1, win);
  }, 60 * 1000);

  ipcMain.handle('render:job', () => {
    clearTimeout(bootWatchdog);
    return job;
  });
  ipcMain.handle('render:write', (event, name, bytes) => writeOut(name, bytes));
  ipcMain.on('render:log', (event, line) => log(String(line)));

  ipcMain.handle('render:done', (event, summary) => {
    clearTimeout(watchdog);
    try {
      const next = { version: RENDER_VERSION, sampleRate: SAMPLE_RATE, themes: {} };
      // Keep cache entries for themes this run did not touch, so rendering one
      // theme never throws away what the encode step knows about the others.
      Object.keys(cache.themes).forEach((id) => {
        const old = cache.themes[id];
        if (old && old.wavsPresent) {
          const copy = Object.assign({}, old);
          delete copy.wavsPresent;
          next.themes[id] = copy;
        }
      });
      (summary.themes || []).forEach((t) => {
        if (t.status === 'rendered' || t.status === 'skipped') next.themes[t.id] = t.entry;
      });
      fs.writeFileSync(CACHE_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
      fs.writeFileSync(REPORT_PATH, JSON.stringify({
        generatedAt: new Date().toISOString(),
        sampleRate: SAMPLE_RATE,
        themes: summary.themes || [],
      }, null, 2) + '\n', 'utf8');
    } catch (e) {
      log('render: rendered fine but could not write the cache: ' + e.message);
      finish(1, win);
      return true;
    }
    log('render: done. ' + (summary.rendered || 0) + ' rendered, ' +
      (summary.skipped || 0) + ' unchanged. Staged in ' + path.relative(APP_ROOT, OUT_DIR));
    log('render: next step is node tools/render/encode.cjs');
    finish(0, win);
    return true;
  });

  ipcMain.handle('render:fail', (event, message) => {
    clearTimeout(watchdog);
    log('render: FAILED.\n' + String(message));
    log('render: the cache was left alone, so fixing the composition and running again re renders it.');
    finish(1, win);
    return true;
  });

  win.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) log('  page: ' + message);
  });
  win.webContents.on('render-process-gone', (event, details) => {
    clearTimeout(watchdog);
    log('render: FAILED, the render page crashed (' + details.reason + ').');
    finish(1, win);
  });
  win.webContents.on('did-fail-load', (event, code, desc) => {
    clearTimeout(watchdog);
    log('render: FAILED to load the render page: ' + desc + ' (' + code + ')');
    finish(1, win);
  });

  win.loadFile(path.join(HERE, 'index.html'));
}

// No window is ever shown, so there is nothing for the GPU to do.
app.disableHardwareAcceleration();
app.whenReady().then(main);
app.on('window-all-closed', () => { /* finish() owns the exit, not this */ });
