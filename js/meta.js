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

  load() {
    try {
      const s = JSON.parse(localStorage.getItem('mbm_meta') || '{}');
      for (const k of ['badges', 'lifetime', 'spent', 'dawns', 'deaths', 'runs', 'upgrades', 'selected', 'lastRun', 'metBrock']) {
        if (s[k] !== undefined) this[k] = s[k];
      }
      if (!DATA.characters[this.selected]) this.selected = 'max';
    } catch (e) {}
  },
  save() {
    try {
      localStorage.setItem('mbm_meta', JSON.stringify({
        badges: this.badges, lifetime: this.lifetime, spent: this.spent,
        dawns: this.dawns, deaths: this.deaths, runs: this.runs,
        upgrades: this.upgrades, selected: this.selected,
        lastRun: this.lastRun, metBrock: this.metBrock,
      }));
    } catch (e) {}
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
    this.badges += g.badges;
    this.lifetime += g.badges;
    this.runs++;
    if (won) this.dawns++; else this.deaths++;
    this.lastRun = {
      result: won ? 'dawn' : 'died',
      time: Math.floor(g.time),
      kills: g.kills,
      killer: g.lastKiller || null,
      char: g.charId,
    };
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
