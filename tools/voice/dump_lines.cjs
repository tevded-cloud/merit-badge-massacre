// Merit Badge Massacre: author tooling, never shipped. Evaluates js/dialogue.js
// as data and flattens every voiceable line into tools/voice/lines.json:
//   { speaker, category, slot, text, spokenText, hash8 [, scout] }
//
// text        the words the game actually puts on screen for this entry. For
//             most lines that is the line exactly as it appears in dialogue.js
//             (narration and all). For a line carrying a {scout} placeholder it
//             is the line with the placeholder already swapped, because the
//             swap happens before the words ever reach the screen or the voice.
// spokenText  what a TTS voice should actually say. Rule: if the line contains
//             double quotes, speak only the concatenated quoted spans (narration
//             like `Brock pokes the fire.` is dropped); otherwise speak the whole
//             line, since plain barks and boss taunts carry no narration to strip.
// hash8       first 8 hex chars of sha1(spokenText). This is the content key
//             gen.py uses for incremental generation and for output filenames,
//             so editing a line's *wording* is what triggers a re-synthesis;
//             editing a voice recipe in voices.json does not change hash8 (see
//             tools/voice/README.md, "recipe evaluation round").
// scout       present only on placeholder variants: which scout's address was
//             substituted to produce this entry. Purely informational, nothing
//             downstream reads it.
//
// dialogue.js has no imports or exports: it is a plain script that declares
// BARKS / SELECT_LINES / BROCK / BOSSLINES / QUARTERMASTER / CRITTER as
// top-level consts and expects a global `META` object to exist (only touched
// inside brockLine/nextArcLine/quartermasterLine, none of which we call here).
// We evaluate the file's source inside a function that receives META as a
// parameter, which shadows the free identifier exactly like a stubbed global
// would, without ever touching js/dialogue.js.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIALOGUE_PATH = path.join(__dirname, '..', '..', 'js', 'dialogue.js');
const OUTPUT_PATH = path.join(__dirname, 'lines.json');

function loadDialogueTables() {
  const src = fs.readFileSync(DIALOGUE_PATH, 'utf8');
  const body = src + '\n;return { BARKS, SELECT_LINES, BROCK, BOSSLINES, QUARTERMASTER, CRITTER };';
  // eslint-disable-next-line no-new-func
  const factory = new Function('META', body);
  return factory({}); // stub META = {}; brockLine()/nextArcLine() are never invoked
}

// ---------------------------------------------------------------------------
// Placeholders
// ---------------------------------------------------------------------------
// A dialogue line may carry a {token} that brockToken() swaps for a real value
// before the words ever reach the screen or the voice. The text a recording is
// keyed on has to be the SUBSTITUTED text: baking a literal "{scout}" into
// spokenText would both hand the generator a voice saying the token out loud
// and guarantee the file could never match what js/voice.js asks for at
// runtime, since the game only ever asks with the placeholder already gone.
//
// Two tokens exist in dialogue.js today.
//
//   {scout}  brockAddress() swaps it for BROCK.address[META.selected]. Three
//            possible values, one per playable scout, read straight out of
//            BROCK.address below so this table can never drift from the game.
//            Every line carrying it is emitted once per scout: four authored
//            lines become twelve recordings.
//
//   {feat}   nextFeatLine() swaps it for the NAME of whichever feat just
//            landed, upper-cased. Those names are not in dialogue.js at all:
//            they are the FEATS list in js/feats.js, fourteen of them today
//            and written to grow. Three authored lines times a growing list
//            is not a variant set, it is a combinatorial explosion bought for
//            one congratulation, so these lines are collected, named out loud
//            on every run (see the report at the bottom of main), and
//            deliberately not emitted. At runtime they resolve to nothing and
//            Brock's congratulation plays silent with its subtitle still on
//            screen, which is a supported state everywhere else in this game.
//
// Any other {token} that shows up later is unknown, and unknown is reported
// and skipped rather than guessed at.
const PLACEHOLDER_RE = /\{[a-zA-Z][a-zA-Z0-9_]*\}/g;
const SCOUT_TOKEN = '{scout}';

function placeholdersIn(text) {
  const found = [];
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    if (found.indexOf(m[0]) < 0) found.push(m[0]);
  }
  return found;
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
  const spokenText = extractSpoken(text);
  return { speaker, category, slot: String(slot), text, spokenText, hash8: hash8(spokenText) };
}

// The one door every collected line goes through. Unwraps the { t, e } portrait
// shape, then either emits the line as-is, expands it once per scout, or hands
// it to the skip list when it carries a placeholder nobody can enumerate.
function emit(ctx, speaker, category, slot, line) {
  // Dialogue lines may be plain strings or { t, e } objects carrying a
  // portrait expression tag; the voice only cares about the words.
  const text = (line && typeof line === 'object' && typeof line.t === 'string') ? line.t : line;
  if (typeof text !== 'string' || !text.trim()) return;

  const tokens = placeholdersIn(text);
  if (tokens.length === 0) {
    ctx.lines.push(makeEntry(speaker, category, slot, text));
    return;
  }

  const unhandled = tokens.filter((t) => t !== SCOUT_TOKEN);
  if (unhandled.length) {
    ctx.skipped.push({ speaker, category, slot: String(slot), tokens: unhandled });
    return;
  }

  // {scout} only: one recording per scout, with the substitution already
  // applied, keyed on exactly the words the game will ask for.
  Object.keys(ctx.addresses).forEach((scoutId) => {
    const swapped = text.split(SCOUT_TOKEN).join(ctx.addresses[scoutId]);
    const entry = makeEntry(speaker, category, `${slot}_${scoutId}`, swapped);
    entry.scout = scoutId;
    ctx.lines.push(entry);
  });
}

// Push every element of an array-valued table as slot 0..n-1.
function pushArray(ctx, speaker, category, arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((line, i) => emit(ctx, speaker, category, i, line));
}

// Push every value of a key -> line table, slot = the key itself.
function pushKeyed(ctx, speaker, category, obj) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((key) => emit(ctx, speaker, category, key, obj[key]));
}

function collectScoutLines(ctx, speaker, barksForSpeaker, selectLine) {
  if (!barksForSpeaker) return;
  const arrayCategories = ['runstart', 'boss', 'lowhp', 'chest', 'revive', 'win', 'death', 'kills'];
  arrayCategories.forEach((cat) => pushArray(ctx, speaker, cat, barksForSpeaker[cat]));
  pushKeyed(ctx, speaker, 'bossnamed', barksForSpeaker.bossnamed);
  emit(ctx, speaker, 'select', 0, selectLine);
}

function collectBrockLines(ctx, brock) {
  if (!brock) return;
  pushArray(ctx, 'brock', 'intro', brock.intro);
  pushKeyed(ctx, 'brock', 'died', brock.died);
  pushArray(ctx, 'brock', 'dawn', brock.dawn);
  pushArray(ctx, 'brock', 'idle', brock.idle);
  // The three conditional pools that mix into idle: the firefly once it has
  // moved in (META.flags.blinkFriend), the tally post once there is a blaze cut
  // into it, and the one-per-visit feat congratulation. All three are ordinary
  // campfire lines Brock says out loud, so all three are collected here; the
  // feats pool then hits the {feat} wall in emit() and is reported, not written.
  pushArray(ctx, 'brock', 'blink', brock.blink);
  pushArray(ctx, 'brock', 'totem', brock.totem);
  pushArray(ctx, 'brock', 'feats', brock.feats);
  (brock.arc || []).forEach((beat) => {
    if (!beat || !beat.id || !Array.isArray(beat.lines)) return;
    beat.lines.forEach((line, i) => emit(ctx, 'brock', 'arc', `${beat.id}_${i}`, line));
  });
}

// The Quartermaster at the supply stall. His speaker id is 'qm', which is what
// js/camp.js hands Voice.speak and what tools/voice/voices.json keys his recipe
// on, so the same string is used here and no translation table exists anywhere.
function collectQuartermasterLines(ctx, qm) {
  if (!qm) return;
  emit(ctx, 'qm', 'intro', 0, qm.intro);
  pushArray(ctx, 'qm', 'idle', qm.idle);
  emit(ctx, 'qm', 'coins', 0, qm.coins);
}

// BOSSLINES are spoken by the boss itself mid fight, one speaker per boss id
// (hare, vicar, antlered), distinct from the scouts' BARKS.bossnamed lines
// (which are the scouts talking *about* the boss, in the scouts' own voices).
function collectBossLines(ctx, bosslines) {
  if (!bosslines || typeof bosslines !== 'object') return;
  Object.keys(bosslines).forEach((bossId) => emit(ctx, bossId, 'bossline', 0, bosslines[bossId]));
}

// ---------------------------------------------------------------------------
// CRITTER.squeaks is EXCLUDED ON PURPOSE. Do not "fix" this.
//
// The rescued squirrel by the fire has five lines and every one of them is a
// squeak plus a bracketed stage direction, two of them stage direction only:
// `(It holds up an acorn. It is showing you the acorn. It puts the acorn away.)`
// There is nothing in there for a voice to say. Worse, a voice saying it would
// give an unmarked woodland animal a person's speaking voice, which is the one
// thing that scene is built on it not having, and js/camp.js deliberately does
// not call campSpeak for it (see the comment above the 'critter' branch there).
// Its subtitles carry the whole beat, which is all it needs.
//
// So: no 'critter' speaker, no recipe for one in voices.json, and five authored
// lines that will never appear in lines.json. That is the intended state.
// ---------------------------------------------------------------------------
const CRITTER_EXCLUDED = 'CRITTER.squeaks (the rescued squirrel stays silent, on purpose)';

function main() {
  const tables = loadDialogueTables();
  const { BARKS, SELECT_LINES, BROCK, BOSSLINES, QUARTERMASTER, CRITTER } = tables;

  // addresses is the {scout} substitution table, taken from the game's own
  // BROCK.address so a new scout added there is picked up here for free.
  const ctx = {
    lines: [],
    skipped: [],
    addresses: (BROCK && BROCK.address) || {},
  };

  collectScoutLines(ctx, 'max', BARKS.max, SELECT_LINES.max);
  collectScoutLines(ctx, 'junie', BARKS.junie, SELECT_LINES.junie);
  collectScoutLines(ctx, 'gus', BARKS.gus, SELECT_LINES.gus);
  collectBrockLines(ctx, BROCK);
  collectQuartermasterLines(ctx, QUARTERMASTER);
  collectBossLines(ctx, BOSSLINES);

  const lines = ctx.lines;

  // Stable order: speaker, then category, then slot. Keeps lines.json diffs
  // small and readable when dialogue.js changes.
  lines.sort((a, b) => {
    if (a.speaker !== b.speaker) return a.speaker < b.speaker ? -1 : 1;
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    return a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0;
  });

  // Sanity checks: warn (never fail the dump) on duplicate identity keys or
  // hash collisions between different spoken text, since gen.py's filenames
  // are keyed on speaker/category/slot/hash8. A third check catches a
  // placeholder that survived into spokenText, which would mean a voice
  // pronouncing a token out loud and a file nothing at runtime can ever match.
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
    const leftover = placeholdersIn(entry.spokenText);
    if (leftover.length) {
      console.warn(`dump_lines: ${key} still contains ${leftover.join(' ')} in its spoken text`);
    }
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lines, null, 2) + '\n', 'utf8');

  const bySpeaker = new Map();
  lines.forEach((e) => bySpeaker.set(e.speaker, (bySpeaker.get(e.speaker) || 0) + 1));
  console.log(`dump_lines: wrote ${lines.length} lines to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  Array.from(bySpeaker.keys()).sort().forEach((sp) => {
    console.log(`  ${sp}: ${bySpeaker.get(sp)}`);
  });

  const variants = lines.filter((e) => e.scout).length;
  if (variants) {
    console.log(`dump_lines: ${variants} of those are ${SCOUT_TOKEN} variants (one per scout: ${Object.keys(ctx.addresses).join(', ')}).`);
  }

  // Loud on purpose, every run: these are authored lines that will have no
  // recording, and the operator should know without reading this file.
  if (ctx.skipped.length) {
    console.warn(`dump_lines: SKIPPED ${ctx.skipped.length} line(s) carrying a placeholder with no enumerable value set:`);
    ctx.skipped.forEach((s) => {
      console.warn(`  ${s.speaker}/${s.category}/${s.slot}  ${s.tokens.join(' ')}`);
    });
    console.warn('  These stay silent at runtime with their subtitles intact. See the placeholder note in this file.');
  }
  console.log(`dump_lines: excluded on purpose: ${CRITTER_EXCLUDED}, ${(CRITTER && CRITTER.squeaks ? CRITTER.squeaks.length : 0)} lines.`);
}

main();
