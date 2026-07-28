// Merit Badge Massacre: author tooling, never shipped. Scans assets/ (art,
// audio, generated voice lines, whatever exists) and writes assets/manifest.json,
// the file js/assets.js reads at runtime to know what it can optionally load.
// The game ships and runs with no assets/ folder at all (see js/assets.js's own
// header comment), so this script must always succeed, even with nothing there.
//
// Placed at tools/manifest.cjs rather than tools/voice/ on purpose: it walks
// the *whole* assets/ tree (art and music too, not just voice), so it is a
// general asset-packaging tool that the voice pipeline happens to depend on
// for the speaker/spokenText lookup, not a voice-only tool.
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'manifest.json');
const LINES_PATH = path.join(__dirname, 'voice', 'lines.json');

// Convention for campfire music: the render harness writes flat files named
// music/<theme>_<layer>.<hash>.webm, so camp tracks are matched by theme
// prefix, not by folder.
const MUSIC_CAMP_PREFIX = 'music/camp';

// Matches exactly what gen.py writes: assets/voice/en/<speaker>/<anything>_<hash8>.webm
const VOICE_FILE_RE = /^voice\/en\/([^/]+)\/[^/]+_([0-9a-f]{8})\.webm$/;

function shouldSkip(relPath) {
  // Never index the manifest file itself, and skip documentation files
  // (LICENSE-VOICES.md etc.): they are not loadable game assets.
  if (path.posix.basename(relPath) === 'manifest.json') return true;
  if (relPath.toLowerCase().endsWith('.md')) return true;
  return false;
}

function walk(dir, baseDir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out; // dir vanished mid-walk or never existed: treat as empty
  }
  entries
    .slice()
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .forEach((ent) => {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs, baseDir, out);
        return;
      }
      if (!ent.isFile()) return;
      const rel = path.relative(baseDir, abs).split(path.sep).join('/');
      if (shouldSkip(rel)) return;
      const bytes = fs.statSync(abs).size;
      out.push({ rel, bytes });
    });
  return out;
}

// Returns the parsed lines.json array, or null if it doesn't exist / isn't
// readable / isn't valid JSON. dump_lines.cjs not having been run yet (or a
// hand-edited assets/ folder with no voice pipeline involved) is a normal
// state, not an error: speaker/spokenText enrichment and pruning simply have
// no ground truth to work from, so both are skipped.
function loadLines() {
  try {
    const raw = fs.readFileSync(LINES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function buildHashLookup(lines) {
  // speaker -> Map(hash8 -> spokenText). Scoped per speaker because hash8 is
  // only guaranteed unique among one speaker's own lines (two different
  // speakers coincidentally sharing a hash would be two different files in
  // two different folders, never a collision on disk).
  const bySpeaker = new Map();
  if (!lines) return bySpeaker;
  lines.forEach((entry) => {
    if (!entry || !entry.speaker || !entry.hash8) return;
    if (!bySpeaker.has(entry.speaker)) bySpeaker.set(entry.speaker, new Map());
    bySpeaker.get(entry.speaker).set(entry.hash8, entry.spokenText);
  });
  return bySpeaker;
}

function main() {
  // assets/manifest.json can only be written once assets/ exists; creating an
  // empty assets/ folder on a fresh checkout is exactly what "produce a valid
  // empty manifest when assets/ is ... missing" requires.
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const files = walk(ASSETS_DIR, ASSETS_DIR, []); // already sorted by rel, see walk()
  const linesArray = loadLines(); // null if lines.json is absent/unreadable/invalid
  const hashLookup = buildHashLookup(linesArray);

  const filesMap = {};
  const voiceEntries = []; // { rel, speaker, hash8 }, same order as files
  const speakerDirs = new Set();

  files.forEach(({ rel, bytes }) => {
    const m = VOICE_FILE_RE.exec(rel);
    if (!m) {
      filesMap[rel] = bytes; // plain number: matches js/assets.js's sizeOf() non-object case
      return;
    }
    const speaker = m[1];
    const hash8 = m[2];
    speakerDirs.add(speaker);
    voiceEntries.push({ rel, speaker, hash8 });

    const spokenText = hashLookup.has(speaker) ? hashLookup.get(speaker).get(hash8) : undefined;
    const entry = { bytes, speaker };
    if (spokenText !== undefined) entry.spokenText = spokenText;
    filesMap[rel] = entry; // object form: sizeOf() reads .bytes, speaker/spokenText ride along
  });

  // Groups: explicit, pre-resolved path lists rather than wildcard patterns.
  // js/assets.js's matcher supports globs, but since this script already has
  // the full file list in hand, writing literal paths is unambiguous and
  // needs no glob-syntax coordination between the two files.
  const groups = {};

  // core: everything that isn't a voice line (art, sfx, any music that isn't
  // specifically the campfire tracks). Deliberately NOT exclusive with camp
  // below, so a file is never left out of every group.
  groups.core = files.filter((f) => !f.rel.startsWith('voice/')).map((f) => f.rel);

  // camp: Brock's voice lines plus campfire music, once/if either exists.
  const brockVoice = voiceEntries.filter((v) => v.speaker === 'brock').map((v) => v.rel);
  const campMusic = files.filter((f) => f.rel.startsWith(MUSIC_CAMP_PREFIX)).map((f) => f.rel);
  groups.camp = brockVoice.concat(campMusic);

  // voice:<speaker> for every speaker folder actually found on disk: scouts
  // (voice:max, voice:junie, voice:gus), Brock, and every boss pack, all the
  // same way, so a newly added speaker needs no change here.
  Array.from(speakerDirs)
    .sort()
    .forEach((speaker) => {
      groups['voice:' + speaker] = voiceEntries.filter((v) => v.speaker === speaker).map((v) => v.rel);
    });

  // prune: voice files on disk whose hash8 no longer matches any current
  // line for that speaker in lines.json, i.e. dialogue.js's text changed (or
  // the line was removed) after the file was generated. Only meaningful with
  // lines.json present; without it there is no ground truth, so this stays
  // empty rather than guessing.
  const prune = [];
  if (linesArray !== null) {
    voiceEntries.forEach(({ rel, speaker, hash8 }) => {
      const stillReferenced = hashLookup.has(speaker) && hashLookup.get(speaker).has(hash8);
      if (!stillReferenced) prune.push(rel);
    });
  }

  // Music loop truth: encode.cjs writes exact source sample counts to a
  // sidecar because Opus cannot carry them and the stem player needs them to
  // loop sample accurately. Merge them when present: per file fields onto the
  // matching entries, and the per theme table (bpm, bars, layers) wholesale.
  let themes = null;
  const sidecarPath = path.join(__dirname, 'render', 'out', 'samplecounts.json');
  if (fs.existsSync(sidecarPath)) {
    try {
      const sc = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
      Object.keys(sc.files || {}).forEach((rel) => {
        if (filesMap[rel]) {
          const m = sc.files[rel];
          filesMap[rel].samples = m.samples;
          filesMap[rel].sampleRate = m.sampleRate;
          filesMap[rel].theme = m.theme;
          filesMap[rel].layer = m.layer;
        }
      });
      themes = sc.themes || null;
    } catch (e) {
      console.warn('manifest.cjs: samplecounts sidecar unreadable, music loops fall back to decoded length');
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    groups,
    files: filesMap,
    prune,
  };
  if (themes) manifest.themes = themes;

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  const totalBytes = files.reduce((n, f) => n + f.bytes, 0);
  console.log(
    `manifest.cjs: wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)}: ` +
      `${files.length} file(s), ${totalBytes} bytes, ${Object.keys(groups).length} group(s), ` +
      `${prune.length} orphaned file(s) flagged for prune.`
  );
}

main();
