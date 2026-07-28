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
    } catch (e) {}
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
