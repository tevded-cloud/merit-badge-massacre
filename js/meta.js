// Merit Badge Massacre: permanent progression. Badges you collect on a run
// are banked at Camp Hearthwood and spent on the Badge Board for permanent
// ranks. The camp itself grows as your history accumulates.
'use strict';

const METADEFS = {
  hearty:     { name: 'Hearty Constitution', icon: 'firstaid',  ranks: 3, costs: [60, 140, 300],  per: '+12 max HP',            desc: 'Three square meals and spite.' },
  sharp:      { name: 'Sharpened Sticks',    icon: 'hatchet',   ranks: 3, costs: [70, 160, 340],  per: '+5% damage',            desc: 'Whittling hour is now mandatory.' },
  swift:      { name: 'Trail Legs',          icon: 'boots',     ranks: 3, costs: [60, 140, 300],  per: '+4% move speed',        desc: 'You know these woods now.' },
  packrat:    { name: 'Packrat',             icon: 'lodestone', ranks: 3, costs: [50, 120, 260],  per: '+12% pickup radius',    desc: 'A badge unclaimed is a badge wasted.' },
  scholar:    { name: 'Merit Scholar',       icon: 'fieldguide',ranks: 3, costs: [50, 120, 260],  per: '+8% badge XP',          desc: 'Read the manual. Twice.' },
  grit:       { name: 'Camp Grit',           icon: 'skillet',   ranks: 3, costs: [80, 180, 380],  per: '+1 armor',              desc: 'Pain is just weakness arriving.' },
  headstart:  { name: 'Head Start',          icon: 'whistle',   ranks: 3, costs: [90, 200, 420],  per: 'Start 1 rank higher',   desc: 'Pack the night before. Every time.' },
  secondwind: { name: 'Second Wind',         icon: 'rabbitfoot',ranks: 1, costs: [400],           per: 'Revive once per night', desc: 'You are not done until dawn says so.' },
};

const META = {
  badges: 0,       // spendable balance
  lifetime: 0,     // total ever collected (drives camp growth)
  spent: 0,
  dawns: 0,
  deaths: 0,
  runs: 0,
  upgrades: {},
  selected: 'max',
  lastRun: null,   // { result, time, kills, killer, char }
  metBrock: false,
  unlocked: [],    // character ids earned beyond the free one
  journal: {},     // long form notes the camp remembers
  flags: {},       // one off story switches
  codex: {},       // boss id -> { seen, killed }
  // Feat counters, banked at the end of a night rather than written per frame.
  // burned is critters set alight, lowHpTime is seconds spent under 15% HP,
  // birdhouses is how many times you have knocked on the one in the grove.
  counters: { burned: 0, lowHpTime: 0, birdhouses: 0 },
  camp: { banner: 0, tentPattern: 0 },

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('mbm_meta') || '{}');
      for (const k of ['badges', 'lifetime', 'spent', 'dawns', 'deaths', 'runs', 'upgrades', 'selected', 'lastRun', 'metBrock', 'unlocked', 'journal', 'flags', 'codex', 'counters', 'camp']) {
        if (s[k] !== undefined) this[k] = s[k];
      }
      if (!DATA.characters[this.selected]) this.selected = 'max';
      if (!Array.isArray(this.unlocked)) this.unlocked = [];
      // Every story field is additive, so a save written before any of them
      // existed loads with the field simply absent. Put the shape back.
      if (!this.journal || typeof this.journal !== 'object') this.journal = {};
      if (!this.flags || typeof this.flags !== 'object') this.flags = {};
      if (!this.codex || typeof this.codex !== 'object') this.codex = {};
      this.counters = this.normCounters(this.counters);
      // 1.0 saves had the whole troop open from the start. Anyone who already
      // walked the trail keeps the scouts they were playing with.
      if (this.runs > 0 && this.unlocked.length === 0) this.unlocked.push('junie', 'gus');
    } catch (e) {}
  },
  // Answers whether the camp actually reached the disk. Everything that banks
  // a night ignores that answer, because a refused write there costs one run.
  // The transfer code cannot ignore it: an import that did not persist is an
  // import that did not happen, and saying otherwise loses the camp.
  save() {
    try {
      localStorage.setItem('mbm_meta', JSON.stringify({
        badges: this.badges, lifetime: this.lifetime, spent: this.spent,
        dawns: this.dawns, deaths: this.deaths, runs: this.runs,
        upgrades: this.upgrades, selected: this.selected,
        lastRun: this.lastRun, metBrock: this.metBrock,
        unlocked: this.unlocked, journal: this.journal,
        flags: this.flags, codex: this.codex,
        counters: this.counters, camp: this.camp,
      }));
      return true;
    } catch (e) { return false; }
  },

  // A counters block from any save, or from nothing at all. Every key here is
  // additive: a save written before one of them existed loads it as zero.
  normCounters(c) {
    const out = { burned: 0, lowHpTime: 0, birdhouses: 0 };
    if (c && typeof c === 'object') {
      if (c.burned > 0) out.burned = c.burned;
      if (c.lowHpTime > 0) out.lowHpTime = c.lowHpTime;
      if (c.birdhouses > 0) out.birdhouses = c.birdhouses;
    }
    return out;
  },

  rank(id) { return this.upgrades[id] || 0; },

  cost(id) {
    const def = METADEFS[id];
    const r = this.rank(id);
    return r >= def.ranks ? null : def.costs[r];
  },

  buy(id) {
    const c = this.cost(id);
    if (c == null || this.badges < c) return false;
    this.badges -= c;
    this.spent += c;
    this.upgrades[id] = this.rank(id) + 1;
    this.save();
    return true;
  },

  // Bank a finished run.
  credit(g, won) {
    // Deeper Nights: every carving on the totem is a promise that tonight is
    // worse, and the pole pays for it here. A bare pole is 1x and all six
    // carvings are exactly 2x. The multiplier lands on the banked number and
    // on lifetime together, because lifetime is meant to be what you earned.
    const base = Math.max(0, Math.round(g.badges || 0));
    let mult = 1;
    try {
      if (typeof Totem !== 'undefined' && Totem && typeof Totem.badgeMult === 'function') {
        mult = Totem.badgeMult(this) || 1;
      }
    } catch (e) { mult = 1; }
    const paid = Math.round(base * mult);
    // lastCredit is deliberately not saved: it describes the run that just
    // ended and the over screen is the only thing that ever reads it.
    this.lastCredit = { base, paid, mult, bonus: paid - base };
    this.badges += paid;
    this.lifetime += paid;
    this.runs++;
    if (won) this.dawns++; else this.deaths++;
    this.lastRun = {
      result: won ? 'dawn' : 'died',
      time: Math.floor(g.time),
      kills: g.kills,
      killer: g.lastKiller || null,
      char: g.charId,
    };
    // The night's feat counters ride home with the run. They are kept in
    // memory while you play, on purpose: a per frame localStorage write for a
    // low health timer would be the most expensive thing in the game.
    this.counters = this.normCounters(this.counters);
    this.counters.lowHpTime = Math.round(this.counters.lowHpTime * 10) / 10;
    this.save();
  },

  // Camp growth tier, 0 through 4.
  tier() {
    let t = 0;
    if (this.runs >= 1) t = 1;
    if (this.lifetime >= 150) t = 2;
    if (this.spent >= 200) t = 3;
    if (this.dawns >= 1) t = 4;
    return t;
  },
};
META.load();

// ---------------------------------------------------------------------------
// The camp transfer code
// ---------------------------------------------------------------------------
// Progress lives in this browser, which means a phone and a laptop are two
// separate camps. The transfer code is the paperwork between them: everything
// permanent packed into one line you can copy, type or read down a phone.
//
// It carries the camp, never the night: a run in progress belongs to the
// machine it is being played on, and mbm_run is deliberately not in here.
//
// SHAPE. A two byte fingerprint of the game's own id tables, then the camp as
// a byte string, then a two byte checksum, then Crockford base 32, then groups
// of five with hyphens. The first group is the literal stamp MBM2, so a wrong
// code says what it is before anything is decoded.
//
// THE LISTS. Everything set shaped (merit badges, journal entries, carvings,
// scouts) travels as one bit per entry, counted against the game's own
// tables. Those tables must only ever be appended to: a code stores how many
// bits it wrote, so a shorter list from an older build reads fine (the tail
// is simply unearned) and a longer one is refused as newer than this build.
//
// THE FINGERPRINT is what makes that rule enforceable instead of hopeful. It
// covers the first N ids of every table in order, N being the count the code
// itself stores, so APPENDING to a table leaves it alone and old codes go on
// reading. A reorder, an insertion at the front, a rename or a deletion inside
// those first N moves it, and the code is refused in plain words rather than
// quietly decoding as somebody else's badges.
const Transfer = (function () {
  const STAMP = 'MBM';
  const VERSION = 2;
  // Crockford's alphabet: no I, L, O or U, so nothing reads as something else
  // in handwriting. Decoding is forgiving in the same spirit.
  const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const GROUP = 5;

  function tables() {
    const chars = (typeof DATA !== 'undefined' && DATA && DATA.characters) ? Object.keys(DATA.characters) : [];
    const ups = (typeof METADEFS !== 'undefined' && METADEFS) ? Object.keys(METADEFS) : [];
    const finds = (typeof FINDS !== 'undefined' && Array.isArray(FINDS)) ? FINDS.map(f => f.id) : [];
    const feats = (typeof FEATS !== 'undefined' && Array.isArray(FEATS)) ? FEATS.map(f => f.id) : [];
    const carvings = (typeof NIGHT_CARVINGS !== 'undefined' && Array.isArray(NIGHT_CARVINGS)) ? NIGHT_CARVINGS.map(c => c.id) : [];
    const arcs = (typeof BROCK !== 'undefined' && BROCK && Array.isArray(BROCK.arc)) ? BROCK.arc.map(b => b.id) : [];
    const bosses = (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.bosses)) ? DATA.bosses.map(b => b.id) : [];
    return { chars, ups, finds, feats, carvings, arcs, bosses };
  }

  function n0(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0; }
  // The same, for the one counter that is measured in tenths of a second.
  function f0(v) { return (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0; }

  // The writer clamps every number at a 32 bit count, so nothing this game can
  // write goes past it. The reader refuses anything past it, and apply clamps
  // as well, so a hand built joke code cannot land a camp with a trillion
  // badges in it whichever way it arrives.
  const CAP = 0xffffffff;
  function cap(v, max) {
    const n = n0(v);
    const m = (max === undefined) ? CAP : max;
    return n > m ? m : n;
  }

  // -------------------------------------------------------- the table mark --
  // FNV 1a again, folded to sixteen bits, over a string. Never answers zero, so
  // a fingerprint is always a mark rather than an absence.
  function hash16(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i) & 0xff;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    const v = ((h >>> 16) ^ (h & 0xffff)) & 0xffff;
    return v || 1;
  }

  // The first n ids of every table, in order, as one line. n comes from the
  // code being read, because each list stores its own length, so a build that
  // has APPENDED entries fingerprints the same prefix and every old code still
  // reads. Anything else moves the line: a swap, an insert at the front, a
  // rename, a deletion. DATA.characters and METADEFS are Object.keys ordered
  // and so the fragile ones, and a new scout with an integer shaped id would
  // jump to the front of Object.keys on its own, which is exactly the accident
  // this catches.
  function fingerprint(t, ns) {
    const part = (list, n) => list.slice(0, Math.max(0, Math.min(list.length, n | 0))).join('|');
    return hash16([
      'v' + VERSION,
      'c' + part(t.chars, ns.chars),
      'u' + part(t.ups, ns.ups),
      'j' + part(t.finds, ns.finds),
      'f' + part(t.feats, ns.feats),
      'a' + part(t.arcs, ns.arcs),
      'n' + part(t.carvings, ns.carvings),
      'b' + part(t.bosses, ns.bosses),
    ].join('#'));
  }

  function fullCounts(t) {
    return {
      chars: t.chars.length, ups: t.ups.length, finds: t.finds.length,
      feats: t.feats.length, arcs: t.arcs.length, carvings: t.carvings.length,
      bosses: t.bosses.length,
    };
  }

  // ------------------------------------------------------------- the bytes --
  function Writer() { this.b = []; }
  Writer.prototype.byte = function (v) { this.b.push(v & 0xff); };
  Writer.prototype.varint = function (v) {
    let n = n0(v);
    if (n > 0xffffffff) n = 0xffffffff;
    do { let part = n & 0x7f; n = Math.floor(n / 128); this.b.push(n > 0 ? (part | 0x80) : part); } while (n > 0);
  };
  // One bit per id in the table, plus how many bits were written.
  Writer.prototype.bits = function (list, has) {
    this.varint(list.length);
    for (let i = 0; i < list.length; i += 8) {
      let byte = 0;
      for (let k = 0; k < 8 && i + k < list.length; k++) if (has(list[i + k])) byte |= (1 << k);
      this.b.push(byte);
    }
  };
  // Four bits per id, for the small counted things (badge board ranks).
  Writer.prototype.nibbles = function (list, val) {
    this.varint(list.length);
    for (let i = 0; i < list.length; i += 2) {
      const a = Math.max(0, Math.min(15, val(list[i]) | 0));
      const b = (i + 1 < list.length) ? Math.max(0, Math.min(15, val(list[i + 1]) | 0)) : 0;
      this.b.push(a | (b << 4));
    }
  };

  // Reading past the end answers zero rather than failing, because the writer
  // trims trailing zero bytes: a camp with nothing in its tail simply stops
  // early. Damage is caught by the checksum, which is what a checksum is for.
  function Reader(bytes) { this.b = bytes; this.i = 0; this.bad = false; this.lastN = 0; }
  Reader.prototype.byte = function () {
    if (this.i >= this.b.length) { this.i++; return 0; }
    return this.b[this.i++];
  };
  Reader.prototype.varint = function () {
    let n = 0, shift = 1, guard = 0;
    // Five bytes is the whole range the writer can emit, because it clamps at
    // a 32 bit count first. A sixth byte, or a number past that ceiling, is
    // not something this game ever wrote: refuse it rather than invent a camp.
    while (guard++ < 5) {
      const v = this.byte();
      if (this.bad) return 0;
      n += (v & 0x7f) * shift;
      if (!(v & 0x80)) {
        if (n > CAP) { this.bad = true; return 0; }
        return n;
      }
      shift *= 128;
    }
    this.bad = true;
    return 0;
  };
  // Returns the ids whose bit is set. A count longer than the table means the
  // code knows about content this build does not: that is a newer game. The
  // count is kept in lastN, because the fingerprint is taken over exactly that
  // many ids.
  Reader.prototype.bits = function (list) {
    const n = this.varint();
    this.lastN = n;
    if (this.bad) return null;
    if (n > list.length) { this.newer = true; this.bad = true; return null; }
    const out = [];
    for (let i = 0; i < n; i += 8) {
      const byte = this.byte();
      if (this.bad) return null;
      for (let k = 0; k < 8 && i + k < n; k++) if (byte & (1 << k)) out.push(list[i + k]);
    }
    return out;
  };
  Reader.prototype.nibbles = function (list) {
    const n = this.varint();
    this.lastN = n;
    if (this.bad) return null;
    if (n > list.length) { this.newer = true; this.bad = true; return null; }
    const out = {};
    for (let i = 0; i < n; i += 2) {
      const byte = this.byte();
      if (this.bad) return null;
      const a = byte & 0x0f, b = (byte >> 4) & 0x0f;
      if (a) out[list[i]] = a;
      if (i + 1 < n && b) out[list[i + 1]] = b;
    }
    return out;
  };

  // ---------------------------------------------------------- the checksum --
  // FNV 1a, sixteen bits, seeded with the version so a hand edited stamp fails
  // here rather than somewhere further in.
  function checksum(bytes, version) {
    let h = 0x811c9dc5 ^ (version >>> 0);
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i] & 0xff;
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ((h >>> 16) ^ (h & 0xffff)) & 0xffff;
  }

  // -------------------------------------------------------------- base 32 --
  function toBase32(bytes) {
    let out = '', bits = 0, acc = 0;
    for (let i = 0; i < bytes.length; i++) {
      acc = (acc << 8) | (bytes[i] & 0xff);
      bits += 8;
      while (bits >= 5) { bits -= 5; out += ALPHA[(acc >> bits) & 31]; }
    }
    if (bits > 0) out += ALPHA[(acc << (5 - bits)) & 31];
    return out;
  }

  function fromBase32(str) {
    const out = [];
    let bits = 0, acc = 0;
    for (const ch of str) {
      const v = ALPHA.indexOf(ch);
      if (v < 0) return null;
      acc = (acc * 32) + v;
      bits += 5;
      if (bits >= 8) { bits -= 8; out.push(Math.floor(acc / Math.pow(2, bits)) & 0xff); acc = acc % Math.pow(2, bits); }
    }
    // Whatever is left over has to be the writer's own padding: fewer than five
    // bits, every one of them zero. A whole spare character on the end (the
    // classic fat fingered paste) leaves five or more, and a damaged last
    // character leaves something other than zero. Both are refused rather than
    // quietly dropped, which is what used to happen.
    if (bits >= 5 || acc !== 0) return null;
    return out;
  }

  // Typed by hand, read off a screen, or pasted with the hyphens left in: all
  // of it lands in the same alphabet. O is zero, I and L are one, as Crockford
  // intended, because that is the mistake people actually make.
  function normalize(code) {
    return String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');
  }

  function group(str) {
    const parts = [];
    for (let i = 0; i < str.length; i += GROUP) parts.push(str.slice(i, i + GROUP));
    return parts.join('-');
  }

  // ------------------------------------------------------------- the pack --
  function packFlags(m) {
    const f = (m && m.flags) || {};
    let bits = 0;
    if (m && m.metBrock) bits |= 1;
    if (f.tarpAck) bits |= 2;
    if (f.blinkFriend) bits |= 4;
    if (f.metQuartermaster) bits |= 8;
    if (f.act2) bits |= 16;
    if (f.act3) bits |= 32;
    return bits;
  }

  const api = {
    version: VERSION,

    // The whole camp as one line. best is App.best, handed in rather than
    // reached for, because the records live in the UI's file, not this one.
    make(best, m) {
      const meta = m || META;
      const t = tables();
      const f = (meta.flags && typeof meta.flags === 'object') ? meta.flags : {};
      const feats = (f.feats && typeof f.feats === 'object') ? f.feats : {};
      const ack = (f.featAck && typeof f.featAck === 'object') ? f.featAck : {};
      const arcs = (f.arcSeen && typeof f.arcSeen === 'object') ? f.arcSeen : {};
      const carv = (f.night && Array.isArray(f.night.carvings)) ? f.night.carvings : [];
      const journal = (meta.journal && typeof meta.journal === 'object') ? meta.journal : {};
      const codex = (meta.codex && typeof meta.codex === 'object') ? meta.codex : {};
      const counters = meta.counters || {};
      const camp = meta.camp || {};
      const b = best || {};
      const unlocked = Array.isArray(meta.unlocked) ? meta.unlocked : [];
      const ups = meta.upgrades || {};

      const w = new Writer();
      // The mark of the tables this code is counted against goes first, so a
      // code from a build with different lists is refused before a single
      // badge of it is believed.
      const fp = fingerprint(t, fullCounts(t));
      w.byte((fp >> 8) & 0xff);
      w.byte(fp & 0xff);
      w.varint(n0(meta.badges));
      w.varint(n0(meta.lifetime));
      w.varint(n0(meta.spent));
      w.varint(n0(meta.dawns));
      w.varint(n0(meta.deaths));
      w.varint(n0(meta.runs));
      w.varint(n0(b.time));
      w.varint(n0(b.kills));
      w.varint(n0(b.dawns));
      w.varint(n0(b.runs));
      w.varint(n0(counters.burned));
      w.varint(Math.round(f0(counters.lowHpTime) * 10));
      w.varint(n0(counters.birdhouses));
      w.varint(n0(camp.banner));
      w.varint(n0(camp.tentPattern));
      w.varint(n0(f.blink));
      w.byte(packFlags(meta));
      const sel = t.chars.indexOf(meta.selected);
      w.byte(sel < 0 ? 0xff : sel);
      w.bits(t.chars, id => unlocked.indexOf(id) !== -1);
      w.nibbles(t.ups, id => ups[id] | 0);
      w.bits(t.finds, id => !!journal[id]);
      w.bits(t.feats, id => !!feats[id]);
      w.bits(t.feats, id => !!ack[id]);
      w.bits(t.arcs, id => !!arcs[id]);
      w.bits(t.carvings, id => carv.indexOf(id) !== -1);
      // The field guide's kill and sighting counts, two numbers a boss.
      w.varint(t.bosses.length);
      for (const id of t.bosses) {
        const e = codex[id];
        let seen = 0, killed = 0;
        // Every shape the codex has ever been written in, read the same way
        // the other five readers of it read: counts, plain true, and the bare
        // strings. A field guide written by an older hand travels whole.
        if (e && typeof e === 'object') {
          seen = n0(e.seen) || (e.seen === true ? 1 : 0);
          killed = n0(e.killed) || n0(e.kills) || (e.killed === true ? 1 : 0);
        } else if (e === 'killed') { seen = 1; killed = 1; }
        else if (e) seen = 1;
        // Nothing was ever killed that was never seen.
        if (killed > seen) seen = killed;
        w.varint(seen);
        w.varint(killed);
      }

      // Trailing zeros carry no news: a young camp is mostly zeros and its
      // code should look like it. The reader fills them back in.
      const body = w.b.slice();
      while (body.length && body[body.length - 1] === 0) body.pop();
      const ck = checksum(body, VERSION);
      const bytes = body.concat([(ck >> 8) & 0xff, ck & 0xff]);
      return STAMP + ALPHA[VERSION] + '-' + group(toBase32(bytes));
    },

    // Read a code without touching anything. Answers { ok, why } on refusal,
    // or { ok: true, data, lines } where lines is the plain words summary the
    // player has to agree to before any of it lands.
    read(code) {
      const raw = normalize(code);
      if (!raw) return { ok: false, why: 'Paste a camp transfer code first.' };
      if (raw.slice(0, 3) !== STAMP) return { ok: false, why: 'That does not look like a camp transfer code.' };
      // The version is exactly one character, so the stamp is always four and
      // a payload that happens to start with digits cannot be read as part of
      // it. A version past Z would need a new stamp, and would deserve one.
      const v = ALPHA.indexOf(raw.charAt(3));
      if (v < 0) return { ok: false, why: 'That code is missing its version stamp.' };
      if (v > VERSION) return { ok: false, why: 'That code was made by a newer version of the game. Update this one first.' };
      if (v < VERSION) return { ok: false, why: 'That code was made by an older version of the game.' };
      const bytes = fromBase32(raw.slice(4));
      if (!bytes) return { ok: false, why: 'That code has a character in it that does not belong. Copy the whole thing again.' };
      if (bytes.length < 3) return { ok: false, why: 'That code is too short to be a whole camp.' };

      const ck = ((bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1]) & 0xffff;
      const payload = bytes.slice(0, bytes.length - 2);
      if (checksum(payload, v) !== ck) {
        return { ok: false, why: 'That code is damaged or incomplete. Copy the whole thing and try again.' };
      }

      const t = tables();
      const r = new Reader(payload);
      const ns = {};
      // The table mark, read first, checked last: the counts it is taken over
      // are stored further in.
      const fpGot = ((r.byte() << 8) | r.byte()) & 0xffff;
      const d = {};
      d.badges = r.varint(); d.lifetime = r.varint(); d.spent = r.varint();
      d.dawns = r.varint(); d.deaths = r.varint(); d.runs = r.varint();
      d.best = { time: r.varint(), kills: r.varint(), dawns: r.varint(), runs: r.varint() };
      d.counters = { burned: r.varint(), lowHpTime: r.varint() / 10, birdhouses: r.varint() };
      d.camp = { banner: r.varint(), tentPattern: r.varint() };
      d.blink = r.varint();
      const bits = r.byte();
      d.metBrock = !!(bits & 1);
      d.tarpAck = !!(bits & 2);
      d.blinkFriend = !!(bits & 4);
      d.metQuartermaster = !!(bits & 8);
      d.act2 = !!(bits & 16);
      d.act3 = !!(bits & 32);
      const sel = r.byte();
      d.selected = (sel === 0xff || sel >= t.chars.length) ? null : t.chars[sel];
      d.unlocked = r.bits(t.chars); ns.chars = r.lastN;
      d.upgrades = r.nibbles(t.ups); ns.ups = r.lastN;
      d.journal = r.bits(t.finds); ns.finds = r.lastN;
      d.feats = r.bits(t.feats); ns.feats = r.lastN;
      d.featAck = r.bits(t.feats); ns.feats = Math.max(ns.feats, r.lastN);
      d.arcSeen = r.bits(t.arcs); ns.arcs = r.lastN;
      d.carvings = r.bits(t.carvings); ns.carvings = r.lastN;
      d.codex = {};
      const nb = r.varint();
      ns.bosses = nb;
      if (!r.bad) {
        if (nb > t.bosses.length) { r.newer = true; r.bad = true; }
        else {
          for (let i = 0; i < nb && !r.bad; i++) {
            const seen = r.varint();
            const killed = r.varint();
            if (seen > 0 || killed > 0) d.codex[t.bosses[i]] = { seen: Math.max(seen, killed, 1), killed };
          }
        }
      }
      if (r.bad) {
        return {
          ok: false,
          why: r.newer
            ? 'That code was made by a newer version of the game. Update this one first.'
            : 'That code is damaged or incomplete. Copy the whole thing and try again.',
        };
      }
      // The tables the code was counted against, against the ones this build
      // has. Appending to a table leaves this alone; anything else does not,
      // and a camp that would land as the wrong badges is refused instead.
      if (fingerprint(t, ns) !== fpGot) {
        return {
          ok: false,
          why: 'That code counts against a different list of scouts, badges and cryptids than this game has. Put both devices on the same version of the game.',
        };
      }
      return { ok: true, data: d, lines: this.describe(d) };
    },

    // What the player is agreeing to, in words rather than fields. Everything
    // apply writes has to show up here: a camp that lands carrying a surprise
    // was not agreed to. Grouped, because forty lines is not a summary.
    describe(d) {
      const n = v => String(n0(v));
      const plural = (v, one, many) => n0(v) === 1 ? (n(v) + ' ' + one) : (n(v) + ' ' + (many || one + 's'));
      const lines = [];
      lines.push(plural(d.runs, 'night walked', 'nights walked'));
      lines.push(plural(d.dawns, 'dawn seen', 'dawns seen'));
      lines.push(n(d.lifetime) + ' badges earned in all, ' + n(d.badges) + ' left to spend');
      let ranks = 0;
      for (const id in (d.upgrades || {})) ranks += n0(d.upgrades[id]);
      lines.push(plural(ranks, 'badge board rank', 'badge board ranks'));
      // The merit badges, and the tallies the unearned ones are counted on.
      const c = d.counters || {};
      const tallies = n0(c.burned) + n0(c.birdhouses) + (f0(c.lowHpTime) > 0 ? 1 : 0);
      lines.push(plural((d.feats || []).length, 'merit badge', 'merit badges')
        + (tallies > 0 ? ', and the tallies behind the ones still open' : ''));
      lines.push(plural(((d.unlocked || []).length + 1), 'scout', 'scouts'));
      // The field guide is two things: what the troop has read, and what it
      // has written up about the things in the woods.
      let bosses = 0;
      for (const id in (d.codex || {})) bosses++;
      lines.push(plural((d.journal || []).length, 'field guide entry', 'field guide entries')
        + ' and ' + plural(bosses, 'cryptid written up', 'cryptids written up'));
      if ((d.carvings || []).length) lines.push(plural(d.carvings.length, 'carving on the totem', 'carvings on the totem'));
      // Brock, Blink, and the switches the fire remembers.
      const story = [];
      if (d.metBrock) story.push('Brock knows you');
      const arcs = (d.arcSeen || []).length;
      if (arcs) story.push(plural(arcs, 'talk remembered', 'talks remembered'));
      if (d.act3) story.push('the story stands at act three');
      else if (d.act2) story.push('the story stands at act two');
      if (n0(d.blink) > 0) story.push('Blink has come by ' + plural(d.blink, 'time', 'times'));
      else if (d.blinkFriend) story.push('Blink knows you');
      if (d.metQuartermaster) story.push('you have met the quartermaster');
      lines.push(story.length ? ('the story so far: ' + story.join(', ')) : 'no story remembered yet');
      // The camp's own look, which the code carries whether or not it changed.
      const banner = n0(d.camp && d.camp.banner);
      const tent = n0(d.camp && d.camp.tentPattern);
      lines.push((banner || tent)
        ? ('camp look: banner ' + banner + ', tent pattern ' + tent)
        : 'camp look: the plain banner and tent');
      // The one thing here that is not an overwrite, and the player should be
      // told so before they agree to any of the rest.
      lines.push('your records (best night, most slain, dawns seen) keep the best of both camps');
      return lines;
    },

    // Records are the best thing that ever happened on either machine, so they
    // take the higher of the two and never go down: a camp carried over from a
    // phone cannot pull a laptop's best night backwards. mine is this
    // machine's block, handed in the way make takes it; left out, it is read
    // off the page's own records if there are any, and failing even that the
    // code's records come back unchanged.
    mergeBest(from, mine) {
      const a = from || {};
      let b = mine;
      if (!b && typeof App !== 'undefined' && App && App.best) b = App.best;
      if (!b) b = {};
      const top = (x, y) => { const p = cap(x), q = cap(y); return p > q ? p : q; };
      return {
        time: top(a.time, b.time),
        kills: top(a.kills, b.kills),
        dawns: top(a.dawns, b.dawns),
        runs: top(a.runs, b.runs),
      };
    },

    // Overwrite this camp with that one. The whole new camp is built first and
    // committed in one go, so a throw anywhere in the building leaves the camp
    // standing exactly as it was. Nothing is reported as landed until the
    // write is known to have reached the disk: a browser that refuses it (a
    // full quota, some private modes) gets the old camp back and an honest
    // refusal, rather than a camp that says it moved and did not.
    //
    // Returns the merged records block for the caller to install, because
    // App.best is not this file's to write, or null if nothing landed.
    apply(d, best, m) {
      const meta = m || META;
      if (!d) return null;

      // ---------------------------------------------------- build it first --
      const next = {};
      next.badges = cap(d.badges);
      next.lifetime = cap(d.lifetime);
      next.spent = cap(d.spent);
      next.dawns = cap(d.dawns);
      next.deaths = cap(d.deaths);
      next.runs = cap(d.runs);
      next.upgrades = {};
      for (const id in (d.upgrades || {})) {
        const def = (typeof METADEFS !== 'undefined' && METADEFS) ? METADEFS[id] : null;
        const top = def ? def.ranks : 0;
        const r = Math.max(0, Math.min(top, n0(d.upgrades[id])));
        if (r > 0) next.upgrades[id] = r;
      }
      next.selected = d.selected || 'max';
      next.unlocked = (d.unlocked || []).slice();
      next.metBrock = !!d.metBrock;
      next.journal = {};
      for (const id of (d.journal || [])) next.journal[id] = true;
      next.codex = {};
      for (const id in (d.codex || {})) {
        const e = d.codex[id] || {};
        next.codex[id] = { seen: cap(e.seen), killed: cap(e.killed) };
      }
      const cs = d.counters || {};
      next.counters = this.norm(meta, {
        burned: cap(cs.burned),
        lowHpTime: Math.min(f0(cs.lowHpTime), CAP),
        birdhouses: cap(cs.birdhouses),
      });
      // The banner and the tent pattern are indexes into two short lists, so a
      // silly number is worth nothing to anyone: keep them small.
      next.camp = { banner: cap(d.camp && d.camp.banner, 999), tentPattern: cap(d.camp && d.camp.tentPattern, 999) };
      // lastRun describes one night on one machine, so it does not travel.
      next.lastRun = null;

      const flags = {};
      flags.feats = {};
      for (const id of (d.feats || [])) flags.feats[id] = true;
      flags.featAck = {};
      for (const id of (d.featAck || [])) flags.featAck[id] = true;
      flags.arcSeen = {};
      for (const id of (d.arcSeen || [])) flags.arcSeen[id] = true;
      flags.night = { carvings: (d.carvings || []).slice() };
      if (d.tarpAck) flags.tarpAck = true;
      if (d.blinkFriend) flags.blinkFriend = true;
      if (d.metQuartermaster) flags.metQuartermaster = true;
      if (d.act2) flags.act2 = true;
      if (d.act3) flags.act3 = true;
      if (cap(d.blink) > 0) flags.blink = cap(d.blink);
      next.flags = flags;

      // ------------------------------------------------- then commit it all --
      const keys = ['badges', 'lifetime', 'spent', 'dawns', 'deaths', 'runs', 'upgrades',
        'selected', 'unlocked', 'metBrock', 'journal', 'codex', 'counters', 'camp',
        'flags', 'lastRun'];
      const prev = {};
      for (const k of keys) prev[k] = meta[k];
      for (const k of keys) meta[k] = next[k];

      let wrote = false;
      try { wrote = meta.save() !== false; } catch (e) { wrote = false; }
      if (wrote) {
        // Written, then read straight back, so an imported camp is loaded from
        // storage exactly like any other camp: same normalizers, same
        // defaults. It is also the proof: a browser that swallowed the write
        // hands back the camp that was already there, and the numbers say so.
        try { meta.load(); } catch (e) {}
        if (n0(meta.lifetime) !== next.lifetime || n0(meta.badges) !== next.badges
          || n0(meta.runs) !== next.runs) wrote = false;
      }
      if (!wrote) {
        for (const k of keys) meta[k] = prev[k];
        return null;
      }

      // The pools follow the merit badges, and the badges just changed.
      if (typeof Feats !== 'undefined' && Feats && typeof Feats.syncPools === 'function') {
        try { Feats.syncPools(meta); } catch (e) {}
      }
      return this.mergeBest(d.best, best);
    },

    norm(meta, c) {
      if (meta && typeof meta.normCounters === 'function') return meta.normCounters(c);
      return { burned: n0(c && c.burned), lowHpTime: n0(c && c.lowHpTime), birdhouses: n0(c && c.birdhouses) };
    },
  };

  return api;
})();
