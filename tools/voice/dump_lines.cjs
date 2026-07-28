// Merit Badge Massacre: author tooling, never shipped. Evaluates js/dialogue.js
// as data and flattens every voiceable line into tools/voice/lines.json:
//   { speaker, category, slot, text, spokenText, hash8 }
//
// text        the line exactly as it appears in dialogue.js (narration and all).
// spokenText  what a TTS voice should actually say. Rule: if the line contains
//             double quotes, speak only the concatenated quoted spans (narration
//             like `Brock pokes the fire.` is dropped); otherwise speak the whole
//             line, since plain barks and boss taunts carry no narration to strip.
// hash8       first 8 hex chars of sha1(spokenText). This is the content key
//             gen.py uses for incremental generation and for output filenames,
//             so editing a line's *wording* is what triggers a re-synthesis;
//             editing a voice recipe in voices.json does not change hash8 (see
//             tools/voice/README.md, "recipe evaluation round").
//
// dialogue.js has no imports or exports: it is a plain script that declares
// BARKS / SELECT_LINES / BROCK / BOSSLINES etc. as top-level consts and expects
// a global `META` object to exist (only touched inside brockLine/nextArcLine,
// neither of which we call here). We evaluate the file's source inside a
// function that receives META as a parameter, which shadows the free identifier
// exactly like a stubbed global would, without ever touching js/dialogue.js.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIALOGUE_PATH = path.join(__dirname, '..', '..', 'js', 'dialogue.js');
const OUTPUT_PATH = path.join(__dirname, 'lines.json');

function loadDialogueTables() {
  const src = fs.readFileSync(DIALOGUE_PATH, 'utf8');
  const body = src + '\n;return { BARKS, SELECT_LINES, BROCK, BOSSLINES };';
  // eslint-disable-next-line no-new-func
  const factory = new Function('META', body);
  return factory({}); // stub META = {}; brockLine()/nextArcLine() are never invoked
}

// Speaks only the text inside "double quotes". Multiple quoted spans in one
// line (narration interrupting dialogue, e.g. `"Back already." Brock does not
// look up. "Good. That means..."`) are concatenated with a space. Quote marks
// themselves are stripped since they carry no spoken content. A line with no
// quotes at all (most barks, BOSSLINES) is spoken in full.
function extractSpoken(text) {
  const spans = [];
  const re = /"([^"]*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const span = m[1].trim();
    if (span) spans.push(span);
  }
  if (spans.length === 0) return text.trim();
  return spans.join(' ');
}

function hash8(spokenText) {
  return crypto.createHash('sha1').update(spokenText, 'utf8').digest('hex').slice(0, 8);
}

function makeEntry(speaker, category, slot, text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const spokenText = extractSpoken(text);
  return { speaker, category, slot: String(slot), text, spokenText, hash8: hash8(spokenText) };
}

// Push every element of an array-valued table as slot 0..n-1.
function pushArray(out, speaker, category, arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((text, i) => {
    const entry = makeEntry(speaker, category, i, text);
    if (entry) out.push(entry);
  });
}

// Push every value of a key -> string table, slot = the key itself.
function pushKeyed(out, speaker, category, obj) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((key) => {
    const entry = makeEntry(speaker, category, key, obj[key]);
    if (entry) out.push(entry);
  });
}

function collectScoutLines(out, speaker, barksForSpeaker, selectLine) {
  if (!barksForSpeaker) return;
  const arrayCategories = ['runstart', 'boss', 'lowhp', 'chest', 'revive', 'win', 'death', 'kills'];
  arrayCategories.forEach((cat) => pushArray(out, speaker, cat, barksForSpeaker[cat]));
  pushKeyed(out, speaker, 'bossnamed', barksForSpeaker.bossnamed);
  const select = makeEntry(speaker, 'select', 0, selectLine);
  if (select) out.push(select);
}

function collectBrockLines(out, brock) {
  if (!brock) return;
  pushArray(out, 'brock', 'intro', brock.intro);
  pushKeyed(out, 'brock', 'died', brock.died);
  pushArray(out, 'brock', 'dawn', brock.dawn);
  pushArray(out, 'brock', 'idle', brock.idle);
  (brock.arc || []).forEach((beat) => {
    if (!beat || !beat.id || !Array.isArray(beat.lines)) return;
    beat.lines.forEach((text, i) => {
      const entry = makeEntry('brock', 'arc', `${beat.id}_${i}`, text);
      if (entry) out.push(entry);
    });
  });
}

// BOSSLINES are spoken by the boss itself mid fight, one speaker per boss id
// (hare, vicar, antlered), distinct from the scouts' BARKS.bossnamed lines
// (which are the scouts talking *about* the boss, in the scouts' own voices).
function collectBossLines(out, bosslines) {
  if (!bosslines || typeof bosslines !== 'object') return;
  Object.keys(bosslines).forEach((bossId) => {
    const entry = makeEntry(bossId, 'bossline', 0, bosslines[bossId]);
    if (entry) out.push(entry);
  });
}

function main() {
  const { BARKS, SELECT_LINES, BROCK, BOSSLINES } = loadDialogueTables();

  const lines = [];
  collectScoutLines(lines, 'max', BARKS.max, SELECT_LINES.max);
  collectScoutLines(lines, 'junie', BARKS.junie, SELECT_LINES.junie);
  collectScoutLines(lines, 'gus', BARKS.gus, SELECT_LINES.gus);
  collectBrockLines(lines, BROCK);
  collectBossLines(lines, BOSSLINES);

  // Stable order: speaker, then category, then slot. Keeps lines.json diffs
  // small and readable when dialogue.js changes.
  lines.sort((a, b) => {
    if (a.speaker !== b.speaker) return a.speaker < b.speaker ? -1 : 1;
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    return a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0;
  });

  // Sanity checks: warn (never fail the dump) on duplicate identity keys or
  // hash collisions between different spoken text, since gen.py's filenames
  // are keyed on speaker/category/slot/hash8.
  const seenKey = new Map();
  const seenHash = new Map();
  lines.forEach((entry) => {
    const key = `${entry.speaker}/${entry.category}/${entry.slot}`;
    if (seenKey.has(key)) console.warn(`dump_lines: duplicate slot ${key}`);
    seenKey.set(key, true);
    const hashKey = `${entry.speaker}/${entry.hash8}`;
    if (seenHash.has(hashKey) && seenHash.get(hashKey) !== entry.spokenText) {
      console.warn(`dump_lines: hash8 collision for ${hashKey} between different spoken text`);
    }
    seenHash.set(hashKey, entry.spokenText);
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lines, null, 2) + '\n', 'utf8');

  const bySpeaker = new Map();
  lines.forEach((e) => bySpeaker.set(e.speaker, (bySpeaker.get(e.speaker) || 0) + 1));
  console.log(`dump_lines: wrote ${lines.length} lines to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  Array.from(bySpeaker.keys()).sort().forEach((sp) => {
    console.log(`  ${sp}: ${bySpeaker.get(sp)}`);
  });
}

main();
