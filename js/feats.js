// Merit Badge Massacre: the Merit Badge Board and the Tally Post.
//
// Two systems live here because they are the same idea from opposite ends.
// A MERIT BADGE is a dare the camp remembers: do a specific, slightly stupid
// thing across your whole history and the woods hand something back. A
// BLAZE cut into the tally post is a dare you make in advance: promise the
// night will be worse, and the night pays more. Neither one is a chore
// counter. Every badge below is a joke, a dare or a discovery, and the ones
// that are none of those were cut.
//
// "Merit badge" is the name the player sees, on the board, the sash and the
// cards. Underneath, nothing changed its name on purpose: FEATS, Feats,
// featMeta, featFlags, FEAT_REWARDS, FEAT_LOCKED, FEAT_TABLES, FEAT_VAULT
// and flags.feats all keep the exact identifiers they always had, because
// four other files and every save already written depend on those exact
// names and that exact shape. A save from last week has never heard of the
// new name, and it does not need to: it still loads.
//
// Everything reads META defensively. A save written before any of this existed
// has none of these keys, and every read here treats that as zero rather than
// as a reason to throw during a run.
'use strict';

// ---------------------------------------------------------------- reading ---

function featMeta(m) {
  if (m && typeof m === 'object') return m;
  return (typeof META !== 'undefined' && META) ? META : null;
}

function featFlags(m) {
  const meta = featMeta(m);
  if (!meta) return {};
  if (!meta.flags || typeof meta.flags !== 'object') meta.flags = {};
  return meta.flags;
}

function featCounter(m, key) {
  const meta = featMeta(m);
  const c = (meta && meta.counters && typeof meta.counters === 'object') ? meta.counters : null;
  const v = c ? c[key] : 0;
  return (typeof v === 'number' && v > 0) ? v : 0;
}

function featNum(m, key) {
  const meta = featMeta(m);
  const v = meta ? meta[key] : 0;
  return (typeof v === 'number' && v > 0) ? v : 0;
}

function featFlag(m, name) {
  return !!featFlags(m)[name];
}

function featJournal(m) {
  const meta = featMeta(m);
  const j = (meta && meta.journal && typeof meta.journal === 'object') ? meta.journal : {};
  return j;
}

function featJournalCount(m) {
  return Object.keys(featJournal(m)).length;
}

// The codex has been written by several hands, so read every shape it has
// ever taken. A killed thing counts as seen, because it was.
function featCodex(m, kind) {
  const meta = featMeta(m);
  const c = (meta && meta.codex && typeof meta.codex === 'object') ? meta.codex : {};
  let n = 0;
  for (const id in c) {
    const e = c[id];
    if (!e) continue;
    const killed = e === 'killed' || e.killed === true ||
      (typeof e.killed === 'number' && e.killed > 0) ||
      (typeof e.kills === 'number' && e.kills > 0);
    if (kind === 'killed') { if (killed) n++; continue; }
    const seen = killed || e === 'seen' || e.seen === true ||
      (typeof e.seen === 'number' && e.seen > 0);
    if (seen) n++;
  }
  return n;
}

// ------------------------------------------------------------------ table ---
// Authored with have/need. cond() and progress() are generated from those
// below, so every entry carries the full { cond, progress } contract without
// each one writing the same two closures by hand.
//
// emblem names the painter in js/sprites.js that draws this badge. The id
// half of that name is deliberately the feat's own id, so the table and the
// painter can never drift apart.

const FEATS = [
  {
    id: 'birdhouse',
    name: 'Birdhouse Enthusiast',
    desc: 'Knock on the birdhouse in the memorial grove seven times.',
    hint: 'Nobody is home. Nobody has ever been home. Knock anyway.',
    have: m => featCounter(m, 'birdhouses'), need: 7,
    reward: { kind: 'cosmetic', id: 'birdhouse_row', label: 'A whole row of birdhouses' },
    emblem: 'mb_birdhouse',
  },
  {
    id: 'pyro',
    name: "Pyromaniac's Merit Badge",
    desc: 'Set two hundred and fifty critters alight.',
    hint: 'Junie framed hers. Junie has not stopped talking about it since.',
    have: m => featCounter(m, 'burned'), need: 250,
    reward: { kind: 'weapon', id: 'firecracker', label: 'Firecrackers' },
    emblem: 'mb_pyro',
  },
  {
    id: 'wholeforest',
    name: 'Advanced Arson',
    desc: 'Set a thousand critters alight.',
    hint: 'There is a version of this badge that is just a scorch mark.',
    have: m => featCounter(m, 'burned'), need: 1000,
    reward: { kind: 'skill', id: 'emberdrag', label: 'Skill: Ember Drag' },
    emblem: 'mb_wholeforest',
  },
  {
    id: 'longnight',
    name: 'The Long Night',
    desc: 'Spend three whole minutes of your life under fifteen percent health.',
    hint: 'It adds up across nights, which is the worrying part.',
    have: m => featCounter(m, 'lowHpTime'), need: 180, unit: 's',
    reward: { kind: 'patch', id: 'rabbitfoot', label: 'Rabbit Foot patch' },
    emblem: 'mb_longnight',
  },
  {
    id: 'blinksfav',
    name: "Blink's Favorite",
    desc: 'Befriend the firefly, then bring him a sunrise.',
    hint: 'He has never seen one. He is a firefly.',
    have: m => (featFlag(m, 'blinkFriend') ? 1 : 0) + (featNum(m, 'dawns') >= 1 ? 1 : 0), need: 2,
    reward: { kind: 'cosmetic', id: 'blinkjar', label: 'Blink gets a jar, lid off' },
    emblem: 'mb_blinksfav',
  },
  {
    id: 'fieldscholar',
    name: 'Field Scholar',
    desc: 'Fill all twelve pins on the cabin board.',
    hint: 'Thirty years up here and Brock managed none of them.',
    have: m => featJournalCount(m), need: 12,
    reward: { kind: 'patch', id: 'whistle', label: 'Scoutmaster Whistle patch' },
    emblem: 'mb_fieldscholar',
  },
  {
    id: 'naturalist',
    name: 'Naturalist',
    desc: 'Get a good look at three of the named ones.',
    hint: 'Looking is free. Getting away afterwards is the expensive part.',
    have: m => featCodex(m, 'seen'), need: 3,
    reward: { kind: 'weapon', id: 'boomerang', label: 'Compass Boomerang' },
    emblem: 'mb_naturalist',
  },
  {
    id: 'trophywall',
    name: 'Trophy Wall',
    desc: 'Put three of the named ones down for good.',
    hint: 'The post by the fire has room for exactly three.',
    have: m => featCodex(m, 'killed'), need: 3,
    reward: { kind: 'cosmetic', id: 'trophyrow', label: 'Two more posts by the fire' },
    emblem: 'mb_trophywall',
  },
  {
    id: 'deepwoods',
    name: 'Past the Treeline',
    desc: 'Stand in the Sog, and stand in the Burn.',
    hint: 'Further than Brock goes. He will find a way to mention that.',
    have: m => (featFlag(m, 'act2') ? 1 : 0) + (featFlag(m, 'act3') ? 1 : 0), need: 2,
    reward: { kind: 'weapon', id: 'bugle', label: 'Camp Bugle' },
    emblem: 'mb_deepwoods',
  },
  {
    id: 'gravefull',
    name: 'The Grove Is Full',
    desc: 'Plant twenty four marshmallow sticks in the memorial grove.',
    hint: 'The grove seats twenty four. After that we start a second grove.',
    have: m => featNum(m, 'deaths'), need: 24,
    reward: { kind: 'cosmetic', id: 'sashline', label: 'A washing line of old sashes' },
    emblem: 'mb_gravefull',
  },
  {
    id: 'corkboard',
    name: 'Feeding the Corkboard',
    desc: 'Hand the Badge Board a thousand badges.',
    hint: 'It says nothing. It has never once said thank you.',
    have: m => featNum(m, 'spent'), need: 1000,
    reward: { kind: 'cosmetic', id: 'bunting', label: 'Bunting over the fire circle' },
    emblem: 'mb_corkboard',
  },

  // ------------------------------------------------------------- hidden ----
  // Three the board will not name. The card stays dark and says only the
  // teasing line until the night it goes gold.
  {
    id: 'deepdebt',
    name: 'Nothing But Lint',
    hidden: true,
    desc: 'Bank five hundred badges in your life, then walk out of camp with a balance of zero.',
    hint: 'Somebody has to find out what happens when the board takes everything.',
    have: m => (featNum(m, 'lifetime') >= 500 ? 1 : 0) + (featNum(m, 'badges') === 0 ? 1 : 0), need: 2,
    reward: { kind: 'skill', id: 'fieldstrip', label: 'Skill: Field Strip' },
    emblem: 'mb_deepdebt',
  },
  {
    id: 'dawnpatrol',
    name: 'Dawn Patrol',
    hidden: true,
    desc: 'See three dawns.',
    hint: 'One is a story. Three is a habit.',
    have: m => featNum(m, 'dawns'), need: 3,
    reward: { kind: 'skill', id: 'reveille', label: 'Skill: Reveille' },
    emblem: 'mb_dawnpatrol',
  },
  {
    id: 'twelfthname',
    name: 'The Twelfth Name',
    hidden: true,
    desc: 'Find the sanded nameplate, and put OLD NOBODY down.',
    hint: 'Brock says not tonight. Brock says that every night.',
    have: m => (featJournal(m).t12_nameplate ? 1 : 0) + (featFlag(m, 'act3boss') ? 1 : 0), need: 2,
    reward: { kind: 'cosmetic', id: 'nameplate', label: 'The nameplate, nailed up at the trailhead' },
    emblem: 'mb_twelfthname',
  },
];

// Generate the { cond, progress } contract every feat is required to carry.
(function buildFeatFns() {
  for (const f of FEATS) {
    const have = f.have, need = f.need > 0 ? f.need : 1;
    f.cond = function (m) {
      let v = 0;
      try { v = have(m) || 0; } catch (e) { v = 0; }
      return v >= need;
    };
    f.progress = function (m) {
      let v = 0;
      try { v = have(m) || 0; } catch (e) { v = 0; }
      if (!(v > 0)) return 0;
      return v >= need ? 1 : v / need;
    };
  }
})();

// reward key to feat id, so a piece of content can be asked what earns it.
const FEAT_REWARDS = (function () {
  const out = {};
  for (const f of FEATS) {
    if (f.reward && f.reward.kind && f.reward.id) out[f.reward.kind + ':' + f.reward.id] = f.id;
  }
  return out;
})();

// The content that starts the game behind a feat. These ids are all authored
// in data.js with locked: true, and none of them is anybody's starting weapon.
const FEAT_LOCKED = {
  weapon: ['firecracker', 'boomerang', 'bugle'],
  patch: ['rabbitfoot', 'whistle'],
  skill: ['emberdrag', 'reveille', 'fieldstrip'],
};

// kind to the DATA table it lives in.
const FEAT_TABLES = { weapon: 'weapons', patch: 'passives', skill: 'skills' };

// Locked defs are lifted clean out of DATA and parked here, which is what
// keeps them out of every for..in over DATA.weapons without a single line
// changing in game.js. syncPools puts them back the night they are earned.
const FEAT_VAULT = { weapon: {}, patch: {}, skill: {} };

// ----------------------------------------------------------------- engine ---

const Feats = {
  table: FEATS,
  total: FEATS.length,

  byId(id) {
    if (!this._map) {
      this._map = {};
      for (const f of FEATS) this._map[f.id] = f;
    }
    return this._map[id] || null;
  },

  // The painter name in js/sprites.js for this feat, or null if the table
  // does not know the id. Says nothing about whether it is earned: that is
  // for the caller to decide before it draws anything.
  emblemFor(id) {
    const f = this.byId(id);
    return f ? f.emblem : null;
  },

  // The earned set, always an object, created on the save if it is missing.
  ledger(m) {
    const flags = featFlags(m);
    if (!flags.feats || typeof flags.feats !== 'object') flags.feats = {};
    return flags.feats;
  },

  done(id, m) { return !!this.ledger(m)[id]; },

  count(m) {
    const led = this.ledger(m);
    let n = 0;
    for (const f of FEATS) if (led[f.id]) n++;
    return n;
  },

  // Everything newly true this call. Records it, opens the pools, saves once.
  // Safe to call as often as you like: a feat only ever fires the first time.
  check(m) {
    const meta = featMeta(m);
    const gained = [];
    if (!meta) return gained;
    const led = this.ledger(meta);
    for (const f of FEATS) {
      if (led[f.id]) continue;
      let ok = false;
      try { ok = !!f.cond(meta); } catch (e) { ok = false; }
      if (!ok) continue;
      led[f.id] = true;
      gained.push(f.id);
    }
    if (gained.length) {
      this.syncPools(meta);
      if (typeof meta.save === 'function') meta.save();
    }
    return gained;
  },

  // Is this piece of content in the pools? Content nobody gates is always in.
  isUnlocked(kind, id, m) {
    const feat = FEAT_REWARDS[kind + ':' + id];
    if (!feat) return true;
    return this.done(feat, m);
  },

  // Cosmetics are strict: an id nobody awards is not a cosmetic you own.
  hasCosmetic(id, m) {
    const feat = FEAT_REWARDS['cosmetic:' + id];
    return !!feat && this.done(feat, m);
  },

  // The def behind a reward, whether it is currently in DATA or in the vault,
  // so the board can paint a silhouette of something you have not earned.
  rewardDef(reward) {
    if (!reward || typeof DATA === 'undefined') return null;
    const table = FEAT_TABLES[reward.kind];
    if (!table || !DATA[table]) return null;
    return DATA[table][reward.id] || FEAT_VAULT[reward.kind][reward.id] || null;
  },

  // Writes META.flags.pools (the set of unlocked content ids) and makes the
  // pools true at runtime: a locked def is moved out of its DATA table into
  // FEAT_VAULT, so game.js levelPool, ui.js gearPool and ui.js patchPool never
  // see it, and moved back the moment its feat lands. The authored locked flag
  // in data.js is deleted on the way in and restored on the way out, so the
  // table always says out loud which state the def is in.
  syncPools(m) {
    const meta = featMeta(m);
    if (!meta || typeof DATA === 'undefined') return {};
    const flags = featFlags(meta);
    const pools = {};
    for (const kind in FEAT_LOCKED) {
      const table = DATA[FEAT_TABLES[kind]];
      if (!table) continue;
      for (const id of FEAT_LOCKED[kind]) {
        const open = this.isUnlocked(kind, id, meta);
        const def = table[id] || FEAT_VAULT[kind][id];
        if (open) pools[kind + ':' + id] = true;
        if (!def) continue;
        if (open) {
          delete def.locked;
          if (!table[id]) table[id] = def;
          delete FEAT_VAULT[kind][id];
        } else {
          def.locked = true;
          FEAT_VAULT[kind][id] = def;
          if (table[id]) delete table[id];
        }
      }
    }
    flags.pools = pools;
    return pools;
  },

  // Everything the board draws, with live fractions, already in board order:
  // the things you are closest to first, then what you have claimed, then the
  // ones that will not say what they are.
  progressList(m) {
    const meta = featMeta(m);
    const led = this.ledger(meta);
    const out = [];
    for (const f of FEATS) {
      const done = !!led[f.id];
      let have = 0;
      try { have = f.have(meta) || 0; } catch (e) { have = 0; }
      const need = f.need > 0 ? f.need : 1;
      const p = done ? 1 : (have > 0 ? Math.min(1, have / need) : 0);
      const dark = !!f.hidden && !done;
      out.push({
        id: f.id,
        def: f,
        done,
        dark,
        hidden: !!f.hidden,
        name: dark ? '? ? ?' : f.name,
        line: dark ? f.hint : f.desc,
        hint: f.hint,
        p,
        have,
        need,
        text: Math.min(Math.floor(have), need) + ' / ' + need + (f.unit || ''),
        reward: f.reward,
        rank: done ? 1 : (dark ? 2 : 0),
      });
    }
    out.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.rank === 0) return b.p - a.p;
      return a.def.name < b.def.name ? -1 : 1;
    });
    return out;
  },

  // One entry per merit badge, in FEATS table order (not progressList's
  // sorted order), for the sash: { id, name, emblem, done }. name is always
  // the real name, even for a hidden entry, because the sash only ever draws
  // an emblem for a badge that is actually earned, and its message line
  // wants the real name to go with it.
  sashList(m) {
    const meta = featMeta(m);
    const led = this.ledger(meta);
    const out = [];
    for (const f of FEATS) {
      out.push({
        id: f.id,
        name: f.name,
        emblem: f.emblem,
        done: !!led[f.id],
      });
    }
    return out;
  },
};

// ========================================================= the tally post ====
// Deeper Nights v1. Six dares, each one a hatchet blaze cut into the post at
// the trailhead. Each one is a promise that tonight is worse, and each one
// pays a percentage on top of every badge the night banks. All six is exactly
// double.
//
// Only the ids are stored, and all six are wired: body counts and enemy damage
// in director.js, corruption and coin payouts in room.js, act length and the
// cache supply in run.js. The badge multiplier is applied in META.credit.
//
// Before the camp has seen a dawn there is no post to look at: there is a
// lumpy shape under a weathered tarp, roped down, and nothing about it says
// what it is. revealLine is the one time anybody acknowledges the tarp
// coming off, spoken once, ever, the night after the first dawn.
//
// The identifiers below are deliberately unchanged. NIGHT_CARVINGS, Totem,
// flags.night.carvings and every carving id are read by five other files and
// by every save already written, so they keep the names they were born with.
// Only the words the player reads moved to the post and the hatchet.

const NIGHT_CARVINGS = [
  {
    id: 'tighter', name: 'TIGHTER WOODS', bonus: 15,
    desc: 'Every room packs in twenty percent more bodies.',
    note: 'The woods were always this full. You were just early.',
  },
  {
    id: 'mark', name: 'THE MARK SPREADS', bonus: 25,
    desc: 'Every room runs corruption tier one.',
    note: 'Everything out there turns up already promoted.',
  },
  {
    id: 'lean', name: 'LEAN SEASON', bonus: 15,
    desc: 'Cookie Money payouts are halved.',
    note: 'The store is aware. The store is not sympathetic.',
  },
  {
    id: 'teeth', name: 'SHARP TEETH', bonus: 20,
    desc: 'Everything out there hits twenty five percent harder.',
    note: 'Same critters. Worse night.',
  },
  {
    id: 'longwalk', name: 'THE LONG WALK', bonus: 15,
    desc: 'One more room in every act.',
    note: 'The night does not get longer. You do.',
  },
  {
    id: 'nothing', name: 'NOTHING WASTED', bonus: 10,
    desc: 'No cache rooms.',
    note: 'Whatever you find, you find on the floor, like an animal.',
  },
];

const Totem = {
  list: NIGHT_CARVINGS,

  byId(id) {
    for (const c of NIGHT_CARVINGS) if (c.id === id) return c;
    return null;
  },

  // The post stays under its tarp until the camp has seen a dawn. Same tier
  // gate shape the cabin and the lakeshore use.
  open(m) { return featNum(m, 'dawns') >= 1; },

  // Brock's one line about the tarp coming off the post. Fires once, ever:
  // null unless the post is open and flags.tarpAck is still falsy, and the
  // one call that returns the line sets tarpAck true and saves immediately,
  // so it cannot fire twice, not even across sessions. An old save simply
  // has no tarpAck at all, which reads as falsy and is correct: it gets the
  // line once, on its next visit, same as anyone else.
  revealLine(m) {
    const meta = featMeta(m);
    if (!this.open(meta)) return null;
    const flags = featFlags(meta);
    if (flags.tarpAck) return null;
    flags.tarpAck = true;
    if (meta && typeof meta.save === 'function') meta.save();
    return {
      t: '"Tarp is off." He does not look at the trailhead. "Thirty years that post stood under canvas because the man before me covered it, and I never once asked what a post needs covering for. Weather has taken the old marks out of it. There is a hatchet on the nail by the door, and now that you have seen a sunrise I have no good reason left to tell you it is not yours."',
      e: 'deadpan',
    };
  },

  // META.flags.night, normalized. An old save has no flags.night at all.
  night(m) {
    const flags = featFlags(m);
    let n = flags.night;
    if (!n || typeof n !== 'object') { n = { carvings: [] }; flags.night = n; }
    if (!Array.isArray(n.carvings)) n.carvings = [];
    // Anything the table no longer knows about is dropped on read, so a
    // renamed dare cannot keep paying. The camp asks for this twice a
    // frame, so the array is only rebuilt when there is actually a stray in
    // it rather than reallocated every call.
    let stray = false;
    for (let i = 0; i < n.carvings.length; i++) {
      if (!this.byId(n.carvings[i])) { stray = true; break; }
    }
    if (stray) n.carvings = n.carvings.filter(id => !!this.byId(id));
    return n;
  },

  on(id, m) { return this.night(m).carvings.indexOf(id) !== -1; },

  toggle(id, m) {
    const meta = featMeta(m);
    if (!this.byId(id)) return false;
    const n = this.night(meta);
    const i = n.carvings.indexOf(id);
    if (i === -1) n.carvings.push(id); else n.carvings.splice(i, 1);
    if (meta && typeof meta.save === 'function') meta.save();
    return i === -1;
  },

  clear(m) {
    const meta = featMeta(m);
    this.night(meta).carvings.length = 0;
    if (meta && typeof meta.save === 'function') meta.save();
  },

  active(m) {
    const n = this.night(m);
    const out = [];
    for (const c of NIGHT_CARVINGS) if (n.carvings.indexOf(c.id) !== -1) out.push(c);
    return out;
  },

  bonusPct(m) {
    let n = 0;
    for (const c of this.active(m)) n += c.bonus;
    return n;
  },

  // What one badge is worth tonight. 1 with a bare post, 2 with all six.
  badgeMult(m) {
    if (!this.open(m)) return 1;
    return 1 + this.bonusPct(m) / 100;
  },
};
