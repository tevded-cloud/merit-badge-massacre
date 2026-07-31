// Merit Badge Massacre: THE SMOKE TEST. The first automated test this repo
// has ever had, other than tools/validate_rooms.cjs (which checks layout
// data, not code behaviour). A rewrite is coming that touches the weapon
// system, the pickup system, the HUD, the roster and the save format all at
// once, so something has to exist that fails loudly when the load bearing
// pieces underneath that rewrite stop doing what they say they do.
//
// ---------------------------------------------------------------------------
// How the engine is loaded
// ---------------------------------------------------------------------------
// Copied from tools/validate_rooms.cjs, which is the only other place this
// repo runs its own source headlessly: the real files are concatenated
// behind a small stub header and evaluated once in a Node vm context, no
// DOM, no canvas, no game state beyond what this file builds by hand.
//
// js/ui.js gets a canvas 2d context at FILE SCOPE (ui.js:79-81) and starts a
// requestAnimationFrame loop (ui.js:2191), so it cannot load in Node at all,
// and this harness never tries. js/game.js is not loaded either: it is not
// needed for anything below (see the note above testPoolOfferDeterminism)
// and it pulls in js/hooks.js, INPUT and window.innerWidth (game.js:1194) for
// its update loop, none of which this test wants to stub just to reach a
// constructor.
//
// The stub below is smaller than validate_rooms.cjs's, but not as small as
// a first pass at this file assumed. This harness never calls Room.enter(),
// only Run.begin(), Pool.offer() and META.save()/load(), so it does not need
// validate_rooms.cjs's Game.prototype.gainCoins/spawnBurst/spawnPuff/
// dropGems/spawnEnemy/toast (those exist there for Room.enter() to call
// during a grid build). It still needs the bare Game identifier to exist,
// because js/props.js and js/room.js both extend Game.prototype
// (spawnProp/damageProp/updateProps/renderProp in props.js,
// renderDoor/renderDoorOffer in room.js) with UNGUARDED module scope
// assignments: `Game.prototype.spawnProp = function () {...}` runs the
// moment the file loads, not behind any `typeof Game === 'undefined'`
// check, so leaving Game out threw a ReferenceError the first time this
// file actually ran (ran node tools/smoke.cjs before writing this comment
// to confirm exactly that; see the report for the transcript). None of
// those six methods are ever CALLED by this harness, so Game only needs to
// exist, not do anything: `function Game() {}` is enough.
//
// SPR and AudioSys really are only ever referenced inside function bodies
// in the files this harness loads (grepped for `^\s*(Game|SPR|AudioSys)\.`
// across all ten files before writing this comment, the same way the Game
// gap above was found), so they stay undefined on purpose. TAU, rand and
// clamp are needed because js/props.js uses all three at module scope
// (see randInt() near the top of that file). localStorage is needed
// because js/meta.js and js/run.js both read it (guarded in a try/catch,
// so its absence would not have thrown) but this harness wants the real
// read/write to happen, so the save round trip test proves something.
//
// ---------------------------------------------------------------------------
// Load order
// ---------------------------------------------------------------------------
// index.html loads, in order: sprites, portraits, assets, audio, music,
// voice, hooks, traits, stats, pool, data, rooms, meta, roster, feats,
// dialogue, finds, collide, game, render, props, director, room, run, ...
// Filtered down to the ten files this harness actually needs, that is:
// traits, stats, pool, data, rooms, meta, collide, props, room, run, and
// that is the order used below. Every file in this set was checked by hand
// for module scope (not function body) references to a name declared in a
// file later in this list; none exist. What LOOKS like a same file
// dependency problem (js/pool.js reads DATA.WEAPON_MAX etc, but pool.js
// loads before data.js in index.html) is not one: Pool's whole body is one
// IIFE that only defines functions and returns an object, so DATA is never
// touched until something later CALLS Pool.candidates()/offer(), by which
// point the whole blob, including data.js, has already run. The same is
// true of js/run.js reaching for ROOMS, ACT_TEMPLATES and Room: all three
// are read inside methods on the returned Run object, never at the top of
// the IIFE, so run.js only needs to be LAST in the blob, not last relative
// to any one dependency.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(REPO_ROOT, 'js');

const ENGINE_FILES = [
  'traits.js', 'stats.js', 'pool.js', 'data.js', 'rooms.js',
  'meta.js', 'collide.js', 'props.js', 'room.js', 'run.js',
];

// A localStorage stand in, kept in plain Node scope and handed into the vm
// sandbox by reference, so a test can plant a fixture directly (bypassing
// META.save()) and so META.save()/load() inside the vm are reading and
// writing the exact same store this file can also inspect afterward.
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(String(k)); },
    clear() { store.clear(); },
  };
}

function loadEngine() {
  const stub = [
    '"use strict";',
    'var TAU = Math.PI * 2;',
    'function rand(a, b) { return a + Math.random() * (b - a); }',
    'function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }',
    // Exists only so js/props.js and js/room.js can extend Game.prototype
    // at module scope without throwing. Never instantiated, never called.
    'function Game() {}',
    '',
  ].join('\n');

  const parts = [stub];
  ENGINE_FILES.forEach((f) => {
    parts.push('\n// ================= ' + f + ' =================\n');
    parts.push(fs.readFileSync(path.join(JS_DIR, f), 'utf8'));
  });
  parts.push('\n;({ DATA: DATA, PROPS: PROPS, ROOMS: ROOMS, WAVE_TEMPLATES: WAVE_TEMPLATES,');
  parts.push('  ACT_TEMPLATES: ACT_TEMPLATES, Room: Room, Collide: Collide, Traits: Traits,');
  parts.push('  Stats: Stats, Pool: Pool, META: META, METADEFS: METADEFS, Run: Run });\n');

  const localStorage = makeLocalStorage();
  const sandbox = { console, Math, JSON, Object, Array, Number, String, localStorage };
  sandbox.globalThis = sandbox;
  const engine = vm.runInNewContext(parts.join(''), sandbox, { filename: 'mbm-smoke-engine-blob.js' });
  engine.localStorage = localStorage;
  return engine;
}

// ---------------------------------------------------------------------------
// A small assertion toolkit. No dependency beyond Node itself, matching
// tools/validate_rooms.cjs's own house rule of no npm packages for tooling.
// ---------------------------------------------------------------------------
function jsonish(v) {
  try { return JSON.stringify(v); } catch (e) { return String(v); }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function assertEqual(actual, expected, msg) {
  const same = actual === expected ||
    (typeof actual === 'number' && typeof expected === 'number' && Number.isNaN(actual) && Number.isNaN(expected));
  if (!same) {
    throw new Error((msg || 'values differ') + ': expected ' + jsonish(expected) + ', got ' + jsonish(actual));
  }
}

function assertDeepEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) {
    throw new Error((msg || 'values differ') + ': expected ' + jsonish(expected) + ', got ' + jsonish(actual));
  }
}

function check(name, fn) {
  try {
    fn();
    return { name, status: 'pass', detail: '' };
  } catch (e) {
    return { name, status: 'fail', detail: (e && e.message) ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Assertion 1: SAVE ROUND TRIP. First because it has no feel component and
// it is the riskiest thing the coming rewrite touches (weapon system, pickup
// system, HUD, roster and save format all at once).
// ---------------------------------------------------------------------------
// The exact key list js/meta.js:41 writes and reads. Kept as a literal here
// rather than read off the running META object, so a save() that silently
// drops a key still gets caught: reading the keys off META itself would only
// ever test whatever META happens to still have.
const META_KEYS = [
  'badges', 'lifetime', 'spent', 'dawns', 'deaths', 'runs', 'upgrades',
  'selected', 'lastRun', 'metBrock', 'unlocked', 'journal', 'flags',
  'codex', 'counters', 'camp',
];

function sampleMetaState(charId) {
  return {
    badges: 733, lifetime: 4021, spent: 1900, dawns: 6, deaths: 9, runs: 15,
    upgrades: { hearty: 2, sharp: 3, headstart: 1 },
    selected: charId,
    lastRun: { result: 'dawn', time: 842, kills: 233, killer: null, char: charId },
    metBrock: true,
    unlocked: [charId],
    journal: { some_find: true, other_find: false },
    flags: { act2: true, blinkFriend: true },
    codex: { some_boss: { seen: 3, killed: 1 } },
    counters: { burned: 12, lowHpTime: 44.5, birdhouses: 2 },
    camp: { banner: 3, tentPattern: 2 },
  };
}

function testSaveRoundTrip(ENGINE) {
  const META = ENGINE.META;
  const DATA = ENGINE.DATA;
  const ids = Object.keys(DATA.characters);
  const charId = ids[1] || ids[0];
  const sample = sampleMetaState(charId);

  for (const k of META_KEYS) META[k] = sample[k];
  const wrote = META.save();
  assertEqual(wrote, true, 'META.save() must report success against the stub localStorage');

  // Scramble every key in memory first, so the read back below is load()
  // doing the proving, not leftover state that never actually moved.
  for (const k of META_KEYS) META[k] = null;
  META.load();
  for (const k of META_KEYS) {
    assertDeepEqual(META[k], sample[k], 'META.' + k + ' must survive a save/load round trip');
  }

  // Fixture: an unknown selected character id. js/meta.js:44 specifies the
  // degrade for this exactly: fall back to 'max', nothing else disturbed.
  const badSelected = Object.assign({}, sample, { selected: 'not_a_real_character_id' });
  ENGINE.localStorage.setItem('mbm_meta', JSON.stringify(badSelected));
  META.load();
  assertEqual(META.selected, 'max', "an unknown selected id must degrade to 'max' per js/meta.js:44");
  assertEqual(META.badges, sample.badges, 'the rest of a fixture with only a bad selected id must still load');

  // Fixture: corrupt JSON. js/meta.js:39-55 wraps the whole body of load()
  // in one try/catch, so a JSON.parse failure is swallowed silently. That is
  // NOT the same as resetting to defaults: it leaves whatever was already in
  // memory untouched, and the test below is checking that specific
  // behaviour rather than assuming the friendlier sounding one.
  META.badges = 424242;
  ENGINE.localStorage.setItem('mbm_meta', '{not valid json');
  let threw = false;
  try { META.load(); } catch (e) { threw = true; }
  assertEqual(threw, false, 'a corrupt save must not throw out of META.load()');
  assertEqual(META.badges, 424242, 'a corrupt save must leave in memory state untouched, not reset it');
}

// ---------------------------------------------------------------------------
// Assertion 2: SEED REPRODUCIBILITY. Run.begin(charId, seed) at js/run.js
// :805-827. buildPlan() only ever touches ACT_TEMPLATES, ROOMS and DATA, all
// read from inside functions, so it needs nothing this harness has not
// already loaded.
// ---------------------------------------------------------------------------
function flattenPlan(plan) {
  return plan.map((act) => act.map((slot) => ({
    type: slot.type,
    layoutId: slot.layoutId,
    boss: (slot.bossDef && slot.bossDef.id) || null,
  })));
}

function testSeedReproducibility(ENGINE) {
  const Run = ENGINE.Run;
  const charId = Object.keys(ENGINE.DATA.characters)[0];

  const SEED_A = 0xC0FFEE;
  const planA1 = flattenPlan(Run.begin(charId, SEED_A));
  const planA2 = flattenPlan(Run.begin(charId, SEED_A));
  assertDeepEqual(planA1, planA2, 'Run.begin with the same seed must return the same plan both times');

  const SEED_B = 0xDEADBEEF >>> 0;
  const planB = flattenPlan(Run.begin(charId, SEED_B));
  if (deepEqual(planA1, planB)) {
    throw new Error('seed ' + SEED_A + ' and seed ' + SEED_B +
      ' produced an identical plan. Either the plan is not actually sensitive to the seed, or this ' +
      'is a genuine collision: worth investigating rather than assuming coincidence.');
  }
}

// ---------------------------------------------------------------------------
// Assertion 3: RNG CURSOR. js/run.js:76-87 is mulberry32, exposing fn.read()
// and fn.seek(). js/run.js:89-95 wrap those as the private rngRead/rngSeek,
// but those two wrappers are not on the exported Run object, only the rng
// function instance itself is (as Run.rng, set in begin()), and read/seek
// are properties directly on that function. rngRead(fn) is just
// `fn.read()` and rngSeek(fn, v) is just `fn.seek(v)`, so exercising
// Run.rng.read()/Run.rng.seek() directly exercises the exact same mechanism
// those two private wrappers exist to name.
// ---------------------------------------------------------------------------
function testRngCursor(ENGINE) {
  const Run = ENGINE.Run;
  const charId = Object.keys(ENGINE.DATA.characters)[0];
  Run.begin(charId, 777);

  const cursor = Run.rng.read();
  const a1 = Run.rng();
  const a2 = Run.rng();

  Run.rng.seek(cursor);
  const b1 = Run.rng();
  const b2 = Run.rng();

  assertEqual(b1, a1, 'the value drawn immediately after seek must match the value originally drawn at that cursor');
  assertEqual(b2, a2, 'the second value after seek must also match');
}

// ---------------------------------------------------------------------------
// Assertion 4: the Math.random count. A ratchet baseline, not a gate: this
// never fails the run, it only prints where the number stands.
// ---------------------------------------------------------------------------
// A call site counts if "Math.random" appears on a line whose trimmed text
// does not start with a line comment marker. This method misses an inline
// trailing comment ("doStuff(); // Math.random note") and a /* */ block
// comment that wraps a call without opening on that same line, but every
// raw match in this codebase was read by hand while writing this file, and
// every comment only one is a whole doctrine comment line (2 in
// js/traits.js, 1 in js/pool.js, and 2 more added by this very unit's own
// doctrine comments in js/game.js's rng() and levelPool(), which both
// mention Math.random by name while explaining the fallback), so the simple
// rule is exact for the code as it stands, not merely approximate. If a
// future match does not fit either shape, this function's total and real
// counts will disagree with a manual recount, and that disagreement is the
// signal to make the method less simple.
function countMathRandomInSource(text) {
  let total = 0, real = 0;
  const lines = text.split('\n');
  for (const line of lines) {
    const n = (line.match(/Math\.random/g) || []).length;
    if (!n) continue;
    total += n;
    if (line.trim().indexOf('//') === 0) continue;
    real += n;
  }
  return { total, real };
}

// Ratchet baseline, measured 2026-07-30 with the method above, over the top
// level files in js/ only (js/music/src/*.js is offline render tooling, not
// part of the shipped game, and is out of scope on purpose: the same reading
// the brief for this unit used), AFTER this unit's own wiring edits landed
// in js/game.js. 56 raw occurrences, 5 of them comment only (the doctrine
// comments this unit itself added to rng() and levelPool() both spell out
// "Math.random" while explaining the fallback, which is why the raw count
// is not the round number a pre wiring read of the same files found), 51
// real call sites. This is a ceiling, not a floor: it should only go down
// as later units seed the remaining sites, never up.
const MATH_RANDOM_BASELINE = 51;

function listTopLevelJsFiles() {
  return fs.readdirSync(JS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.js'))
    .map((d) => d.name)
    .sort();
}

function measureMathRandom() {
  const files = listTopLevelJsFiles();
  let total = 0, real = 0;
  const perFile = [];
  files.forEach((f) => {
    const text = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
    const c = countMathRandomInSource(text);
    if (c.total) perFile.push({ file: f, total: c.total, real: c.real });
    total += c.total;
    real += c.real;
  });
  return { total, real, perFile };
}

// ---------------------------------------------------------------------------
// Assertion 5 (added after the determinism wiring): a seeded run's item
// offers are reproducible. js/pool.js:238's draw() takes opts.rng, and
// js/game.js:630 is the only production caller (grepped for `Pool.offer` and
// `Pool.` across js/*.js before this unit's wiring pass); after that pass it
// passes the run's seeded generator through instead of leaving opts.rng
// undefined and falling back to Math.random.
//
// This does not construct a real Game or call Game.prototype.rng(): js/
// game.js is not loaded by this harness (see the header comment for why),
// so there is no `g.rng()` to call here. What this proves is the seam
// game.js:630 now feeds: Pool.offer(owner, n, game, { entries, rng }) draws
// the same cards twice when handed the same seeded rng twice. Actually
// exercising Game.prototype.rng() end to end would need js/game.js loaded
// (and, transitively, js/hooks.js for Hooks.create(), which the Game
// constructor calls) plus a decision about whether readInput()'s
// window.innerWidth reference needs a stub; nothing below needs that, since
// levelPool() and applyChoice() never call readInput().
// ---------------------------------------------------------------------------
function makePoolOwner() {
  return { build: { items: [], stats: null } };
}

function makePoolGameStub(weaponId) {
  return { weapons: [{ id: weaponId, lvl: 1 }], passives: {} };
}

function testPoolOfferDeterminism(ENGINE) {
  const Run = ENGINE.Run;
  const Pool = ENGINE.Pool;
  const DATA = ENGINE.DATA;
  const charId = Object.keys(DATA.characters)[0];
  const weaponId = DATA.characters[charId].weapon;
  const seed = 24601;

  Run.begin(charId, seed);
  const entriesA = Pool.candidates(makePoolOwner(), makePoolGameStub(weaponId));
  const offerA = Pool.offer(makePoolOwner(), 3, makePoolGameStub(weaponId), { entries: entriesA, rng: Run.rng });

  // A fresh begin() with the same seed is a fresh mulberry32(seed): this is
  // what "the same seeded run, twice" means, not calling Run.rng() again on
  // the same live counter.
  Run.begin(charId, seed);
  const entriesB = Pool.candidates(makePoolOwner(), makePoolGameStub(weaponId));
  const offerB = Pool.offer(makePoolOwner(), 3, makePoolGameStub(weaponId), { entries: entriesB, rng: Run.rng });

  assertDeepEqual(offerA, offerB,
    'Pool.offer must draw the same cards twice when handed the same seeded rng twice');

  const entriesC = Pool.candidates(makePoolOwner(), makePoolGameStub(weaponId));
  const offerC = Pool.offer(makePoolOwner(), 3, makePoolGameStub(weaponId), { entries: entriesC, rng: Math.random });
  if (offerA.length && deepEqual(offerA, offerC)) {
    throw new Error('an unseeded draw (Math.random) matched the seeded draw exactly, which would be a real coincidence worth checking');
  }
}

// ---------------------------------------------------------------------------
// Assertion 6: WORLD STREAM ISOLATION. js/run.js used to draw the world (the
// plan, doors, room placement) and the simulation (traits, item rolls, level
// ups) from the SAME mulberry32 counter, so how a fight went changed which
// rooms came after it. This unit splits that into Run.rng (the world stream,
// unchanged name and unchanged snapshot field on purpose, see the doctrine
// comment at js/run.js:72) and Run.simRng (a second stream derived from the
// same seed but decorrelated, js/run.js:130's deriveSimSeed). This is the
// point of the whole unit: begin the same seed twice, draw nothing but world
// draws the first time, interleave a few hundred sim draws between world
// draws the second time, and the world draws must come out identical either
// way. Before the split this would have failed, because the interleaved
// draws would have come off the exact same counter the world draws do.
//
// simDraw() below mirrors js/game.js:260's Game.prototype.rng() delegation
// (js/game.js:261: Run.simRng() when a run is active, Math.random()
// otherwise) exactly. js/game.js itself is not loaded by this harness (see
// the header comment for why: it pulls in js/hooks.js and window sized
// globals this test does not want to stub), so this is how that delegation
// gets exercised here rather than through a live Game instance.
// ---------------------------------------------------------------------------
function simDraw(Run) {
  if (Run && Run.active && Run.simRng) return Run.simRng();
  return Math.random();
}

// ---------------------------------------------------------------------------
// The check that closes the hole simDraw() opens. Because simDraw is a COPY of
// Game.prototype.rng()'s delegation rather than the method itself, every check
// above would still pass if someone edited js/game.js to draw from Run.rng
// again: the copy would keep drawing from the sim stream and the real game
// would be back to one shared counter, with nothing failing. That is the
// classic case of a test proving its own stand in.
//
// So this reads the real method out of js/game.js and asserts what it draws
// from. A source assertion is a blunt instrument and this is deliberately the
// only one in the file, but the regression it guards is exactly one
// identifier, which is the shape a source check is actually right for. If the
// method is ever restructured so this cannot find it, the check FAILS rather
// than silently passing, which is the behaviour that matters.
// ---------------------------------------------------------------------------
function testGameRngDrawsFromSimStream() {
  const src = fs.readFileSync(path.join(JS_DIR, 'game.js'), 'utf8');
  const m = src.match(/\n\s*rng\(\)\s*\{([\s\S]*?)\n\s*\}/);
  if (!m) {
    throw new Error('could not find Game.prototype.rng()\'s body in js/game.js. ' +
      'Either the method was renamed or restructured: this check must be updated to match it, ' +
      'not deleted, because it is the only thing tying the real method to the sim stream.');
  }
  const body = m[1];
  if (body.indexOf('Run.simRng') === -1) {
    throw new Error('js/game.js\'s rng() does not reference Run.simRng. The simulation must draw ' +
      'from the sim stream, or how a player fights changes which rooms the night deals.');
  }
  if (/Run\.rng\b/.test(body)) {
    throw new Error('js/game.js\'s rng() references Run.rng, the WORLD stream. That is the shared ' +
      'counter this split removed: world generation and combat must not read the same dice.');
  }
}

function testWorldStreamIsolation(ENGINE) {
  const Run = ENGINE.Run;
  const charId = Object.keys(ENGINE.DATA.characters)[0];
  const seed = 0xFACADE;
  const WORLD_DRAWS = 20;
  const SIM_DRAWS_PER_STEP = 15; // 20 * 15 = 300 sim draws total: "a few hundred".

  const planBase = flattenPlan(Run.begin(charId, seed));
  const worldBase = [];
  for (let i = 0; i < WORLD_DRAWS; i++) worldBase.push(Run.rng());

  const planInterleaved = flattenPlan(Run.begin(charId, seed));
  const worldInterleaved = [];
  for (let i = 0; i < WORLD_DRAWS; i++) {
    for (let j = 0; j < SIM_DRAWS_PER_STEP; j++) simDraw(Run);
    worldInterleaved.push(Run.rng());
  }

  assertDeepEqual(planInterleaved, planBase,
    'the plan built inside begin() must be identical whether or not the sim stream is later drawn ' +
    'from hundreds of times; the plan is built before either script touches either stream by hand');
  assertDeepEqual(worldInterleaved, worldBase,
    'Run.rng (the world stream) must be unaffected by ' + (WORLD_DRAWS * SIM_DRAWS_PER_STEP) +
    ' draws from Run.simRng (the sim stream) interleaved between them. A mismatch here means the two ' +
    'streams are not actually independent: before this unit split them, simulation draws (traits, ' +
    'item rolls, level ups) came off the same counter the world reads, so how the player fought a ' +
    'room changed which room the plan or a door dealt next.');
}

// ---------------------------------------------------------------------------
// Assertion 7: THE TWO STREAMS ARE ACTUALLY DIFFERENT. Isolation alone is not
// enough to prove the split is real: two independently seeded but identical
// generators would also pass assertion 6. js/run.js:130's deriveSimSeed runs
// the world seed through the same avalanche mix entropySeed() uses on the
// clock, with a distinct constant folded in first, specifically so the sim
// seed lands nowhere near the world seed. This draws the first few values of
// each stream from the same seed and checks they diverge.
//
// Run.rng has already been drawn from by buildPlan() inside begin(), so it
// is seeked back to its own pristine start first: mulberry32's internal
// counter begins equal to its seed before any draw touches it (the same fact
// assertion 3 above, testRngCursor, already exercises), so this is a fair
// first-N-draws comparison against Run.simRng, which begin() never draws
// from at all.
// ---------------------------------------------------------------------------
function testStreamsAreActuallyDifferent(ENGINE) {
  const Run = ENGINE.Run;
  const charId = Object.keys(ENGINE.DATA.characters)[0];
  const seed = 0x1234;
  Run.begin(charId, seed);
  Run.rng.seek(seed);

  const worldDraws = [];
  for (let i = 0; i < 8; i++) worldDraws.push(Run.rng());
  const simDraws = [];
  for (let i = 0; i < 8; i++) simDraws.push(Run.simRng());

  if (deepEqual(worldDraws, simDraws)) {
    throw new Error('Run.rng and Run.simRng produced identical first 8 draws from the same seed ' +
      '0x1234 (world=' + jsonish(worldDraws) + ', sim=' + jsonish(simDraws) + '). That means either ' +
      'deriveSimSeed (js/run.js:130) is not actually decorrelating the sim seed from the world seed, ' +
      'which would be a broken derivation, or this is a genuine collision, which would be a real ' +
      'coincidence worth investigating rather than assuming away.');
  }
}

// ---------------------------------------------------------------------------
// Assertion 8: SIMRNG IS NOT REQUIRED ON A LOADED SNAPSHOT. js/run.js:301's
// parseSave() deliberately does not require s.simRng, and js/run.js:1118's
// resume() tolerates its absence by leaving Run.simRng exactly where begin()
// just seeded it fresh, rather than seeking it. This is the one thing in the
// whole unit that can silently destroy a player's saved night if it is ever
// gotten wrong, so it gets its own check: build a snapshot in exactly the
// shape js/run.js:1044-1058's _write() produces, but from a build before
// this unit (no simRng field at all), drop it straight into the stub
// localStorage under Run's own save key, and confirm Run.peek() (which reads
// through parseSave()) still accepts it.
//
// This harness cannot drive a snapshot all the way through Run.resume() and
// Run.advance() to a built room: advance() reads gameRef() (js/run.js:447),
// which reads App.game, and App is never stubbed here on purpose, the same
// reason this harness never calls Room.enter() (see the file header comment)
// (grepped App/room.enter/gameRef across this file before writing this
// comment: neither is referenced anywhere else in this harness). What this
// proves is the validation gate itself: a snapshot missing simRng is not
// rejected outright, which is the failure mode that would destroy a save.
// ---------------------------------------------------------------------------
const RUN_SAVE_KEY = 'mbm_run'; // must match SAVE_KEY in js/run.js; not exported, so mirrored here.
const RUN_SAVE_VERSION = 2; // must match SAVE_VERSION in js/run.js.

function planToStored(plan) {
  return plan.map((act) => act.map((slot) => ({
    t: slot.type,
    l: slot.layoutId || null,
    b: (slot.bossDef && slot.bossDef.id) || null,
  })));
}

function testSnapshotWithoutSimRngStillLoads(ENGINE) {
  const Run = ENGINE.Run;
  const DATA = ENGINE.DATA;
  const charId = Object.keys(DATA.characters)[0];
  const weaponId = DATA.characters[charId].weapon;
  const seed = 999331;

  const plan = Run.begin(charId, seed);

  const fixture = {
    v: RUN_SAVE_VERSION,
    id: 'smoke-fixture-no-simrng',
    at: Date.now(),
    seed,
    rng: 0,
    // simRng intentionally left out: this is the pre-this-unit snapshot shape.
    charId,
    act: 1,
    roomIdx: 0,
    recent: [],
    carvings: [],
    plan: planToStored(plan),
    game: { weapons: [{ id: weaponId, lvl: 1 }], passives: {} },
  };

  ENGINE.localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(fixture));
  const loaded = Run.peek();

  if (!loaded) {
    throw new Error('a v2 snapshot with no simRng field was rejected outright by Run.peek(). An ' +
      'absent simRng must be tolerated (reseed the sim stream from the run\'s own seed and continue), ' +
      'not treated as an invalid save: this is the one thing in this unit that can silently destroy a ' +
      'real player\'s saved night.');
  }
  assertEqual(loaded.simRng, undefined,
    'the fixture must genuinely have no simRng field for this check to mean anything');
  assertEqual(loaded.seed, seed, 'the rest of a snapshot missing only simRng must still come back intact');
}

// ---------------------------------------------------------------------------
// --selftest: exercises this file's OWN assertion helpers against synthetic
// data made up for the purpose, so the harness itself is under test at least
// once, the same shape tools/validate_rooms.cjs's --selftest promises for
// its predicates (there it replays section 9.3's worked example through all
// 50 predicates; here it is smaller because there is no worked example to
// replay yet, only the helpers this file adds).
// ---------------------------------------------------------------------------
function expectThrow(fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg);
}

function runSelftest() {
  const results = [];

  results.push(check('assertEqual passes on equal primitives', () => {
    assertEqual(5, 5, 'x');
    assertEqual(NaN, NaN, 'NaN must be treated as equal to itself');
  }));

  results.push(check('assertEqual throws on a real mismatch', () => {
    expectThrow(() => assertEqual(5, 6, 'x'), 'assertEqual did not throw on 5 vs 6');
  }));

  results.push(check('assertDeepEqual passes on equal nested structures', () => {
    assertDeepEqual({ a: [1, 2, { b: 3 }] }, { a: [1, 2, { b: 3 }] }, 'x');
  }));

  results.push(check('assertDeepEqual throws on a nested mismatch', () => {
    expectThrow(() => assertDeepEqual({ a: [1, 2, { b: 3 }] }, { a: [1, 2, { b: 4 }] }, 'x'),
      'assertDeepEqual did not throw on a nested mismatch');
  }));

  results.push(check('deepEqual treats key order as irrelevant', () => {
    if (!deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })) throw new Error('key order should not matter');
  }));

  results.push(check('deepEqual is strict about array length', () => {
    if (deepEqual([1, 2], [1, 2, 3])) throw new Error('different length arrays must not compare equal');
  }));

  results.push(check('countMathRandomInSource excludes a whole line comment, counts a real call, counts two calls on one line', () => {
    const src = [
      'function f() { return Math.random(); }',
      '// Math.random mentioned only in prose here',
      '  // and again, indented',
      'const x = Math.random() * 2, y = Math.random() * 3;',
    ].join('\n');
    const c = countMathRandomInSource(src);
    assertEqual(c.total, 4, 'total occurrences');
    assertEqual(c.real, 3, 'real (non comment) occurrences');
  }));

  results.push(check('makeLocalStorage round trips a value and forgets a removed one', () => {
    const store = makeLocalStorage();
    assertEqual(store.getItem('k'), null, 'an unset key reads back null');
    store.setItem('k', 'v');
    assertEqual(store.getItem('k'), 'v', 'a set key reads back its value');
    store.removeItem('k');
    assertEqual(store.getItem('k'), null, 'a removed key reads back null again');
  }));

  return results;
}

// ---------------------------------------------------------------------------
// Output and CLI, matching tools/validate_rooms.cjs's house shape: --json
// for machine readable output, --selftest, exit 1 on any real failure.
// ---------------------------------------------------------------------------
function padEnd(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

function printReport(results, mathRandom, opts) {
  const lines = [];
  lines.push('SMOKE TEST: ' + (opts.selftest ? 'harness selftest' : 'engine checks') +
    ', ' + results.length + ' check(s)');
  lines.push('');
  results.forEach((r) => {
    lines.push('  ' + padEnd(r.status.toUpperCase(), 6) + r.name);
    if (r.status === 'fail') lines.push('        ' + r.detail);
  });
  if (mathRandom) {
    lines.push('');
    lines.push('MATH.RANDOM CALL SITES (ratchet, not a gate)');
    lines.push('  ' + mathRandom.real + ' real call site(s) under js/*.js (top level only), ' +
      mathRandom.total + ' raw regex match(es) before excluding whole line comments.');
    lines.push('  baseline ' + MATH_RANDOM_BASELINE + ', ' +
      (mathRandom.real === MATH_RANDOM_BASELINE ? 'unchanged.'
        : mathRandom.real < MATH_RANDOM_BASELINE
          ? (MATH_RANDOM_BASELINE - mathRandom.real) + ' below baseline, ratchet is working.'
          : (mathRandom.real - MATH_RANDOM_BASELINE) + ' ABOVE baseline: the ratchet moved the wrong way.'));
    mathRandom.perFile.forEach((f) => {
      lines.push('    ' + padEnd(f.file, 20) + f.real + ' real / ' + f.total + ' raw');
    });
  }
  const failed = results.filter((r) => r.status === 'fail').length;
  lines.push('');
  lines.push('TOTAL: ' + (results.length - failed) + ' pass, ' + failed + ' fail.');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { json: false, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') opts.json = true;
    else if (argv[i] === '--selftest') opts.selftest = true;
    else {
      console.error('smoke: unknown argument ' + argv[i]);
      console.error('usage: node tools/smoke.cjs [--json] [--selftest]');
      process.exit(2);
    }
  }

  let results;
  let mathRandom = null;

  if (opts.selftest) {
    results = runSelftest();
  } else {
    const ENGINE = loadEngine();
    results = [
      check('save round trip (META)', () => testSaveRoundTrip(ENGINE)),
      check('seed reproducibility (Run.begin)', () => testSeedReproducibility(ENGINE)),
      check('rng cursor read/seek (Run.rng)', () => testRngCursor(ENGINE)),
      check('pool offer determinism (js/game.js:630 seam)', () => testPoolOfferDeterminism(ENGINE)),
      check('world stream isolation from sim draws (Run.rng vs Run.simRng)', () => testWorldStreamIsolation(ENGINE)),
      check('world and sim streams differ from the same seed', () => testStreamsAreActuallyDifferent(ENGINE)),
      check('a snapshot with no simRng field still loads (backward compatibility)', () => testSnapshotWithoutSimRngStillLoads(ENGINE)),
      check('Game.prototype.rng() really draws from the sim stream (source check)', () => testGameRngDrawsFromSimStream()),
    ];
    mathRandom = measureMathRandom();
  }

  const failed = results.filter((r) => r.status === 'fail');

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      mode: opts.selftest ? 'selftest' : 'smoke',
      results,
      mathRandom: mathRandom ? {
        real: mathRandom.real, total: mathRandom.total,
        baseline: MATH_RANDOM_BASELINE, perFile: mathRandom.perFile,
      } : null,
      pass: results.length - failed.length,
      fail: failed.length,
    }, null, 2) + '\n');
  } else {
    console.log(printReport(results, mathRandom, opts));
  }

  process.exit(failed.length ? 1 : 0);
}

main();
