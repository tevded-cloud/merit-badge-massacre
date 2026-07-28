// Merit Badge Massacre: all tuning data. Weapons come in two kinds:
// manual (fired at the cursor while the player holds attack) and
// auto (skills that trigger themselves on their own cooldowns).
'use strict';

const DATA = {};

DATA.WEAPON_SLOTS = 4;
DATA.PASSIVE_SLOTS = 4;
DATA.WEAPON_MAX = 5;

DATA.characters = {
  max: {
    name: 'Max', title: 'Troop Leader',
    desc: 'Steady hand, straight shot.',
    stats: '+10% damage, +3% crit',
    weapon: 'slingshot', held: 'h_slingshot',
    hp: 100, speed: 150, dmg: 0.10, armor: 0, crit: 0.03, pickup: 0,
    spr: 'max',
  },
  junie: {
    name: 'Junie', title: 'Pyromania Badge',
    desc: 'Fast, fragile, flammable.',
    stats: '+12% move speed, +8% crit',
    weapon: 'roaster', held: 'h_roaster',
    hp: 85, speed: 168, dmg: 0, armor: 0, crit: 0.08, pickup: 0,
    spr: 'junie',
  },
  gus: {
    name: 'Gus', title: 'Snack Officer',
    desc: 'Built like a bear box.',
    stats: '+40 max HP, +2 armor, +25% pickup radius',
    weapon: 'hatchet', held: 'h_hatchet',
    hp: 140, speed: 132, dmg: 0, armor: 2, crit: 0, pickup: 0.25,
    spr: 'gus',
  },
};

DATA.weapons = {
  slingshot: {
    name: 'Slingshot', kind: 'manual', icon: 'slingshot',
    desc: 'Pelts the faithful with river stones. Hold attack to fire.',
    base: { cd: 0.42, dmg: 11, count: 1, speed: 520, pierce: 0, spread: 0.07 },
    levels: [
      { dmg: 5, text: '+5 damage' },
      { count: 1, text: '+1 stone per volley' },
      { pierce: 1, dmg: 4, text: 'Stones pierce, +4 damage' },
      { count: 1, cdMul: 0.8, text: '+1 stone, 20% faster volleys' },
    ],
  },
  roaster: {
    name: 'Marshmallow Roaster', kind: 'manual', icon: 'roaster',
    desc: 'A jet of burning sugar. Sets critters alight.',
    base: { cd: 0.16, dmg: 4, count: 2, speed: 300, range: 175, spread: 0.34, burnDps: 5, burnDur: 2 },
    levels: [
      { dmg: 2, text: '+2 damage per gob' },
      { range: 55, text: 'Longer flame' },
      { burnDps: 5, text: 'Burns hotter' },
      { count: 1, dmg: 2, text: 'Wider gout, +2 damage' },
    ],
  },
  hatchet: {
    name: 'Hand Axe', kind: 'manual', icon: 'hatchet',
    desc: 'A wide chop toward the cursor. Big damage, short reach.',
    base: { cd: 0.55, dmg: 24, range: 84, arc: 2.1, knock: 220 },
    levels: [
      { dmg: 12, text: '+12 damage' },
      { range: 22, arc: 0.4, text: 'Wider, longer swing' },
      { cdMul: 0.78, text: 'Swing 22% faster' },
      { dmg: 18, knock: 140, text: '+18 damage, heavy knockback' },
    ],
  },
  firecracker: {
    name: 'Firecrackers', kind: 'manual', icon: 'firecracker',
    desc: 'Lob a banger at your cursor. Friendly to you, only you.',
    base: { cd: 1.5, dmg: 30, count: 1, radius: 78, fuse: 0.45, range: 340 },
    levels: [
      { radius: 22, text: '+22 blast radius' },
      { dmg: 16, text: '+16 damage' },
      { count: 1, text: '+1 cracker per throw' },
      { dmg: 20, cdMul: 0.8, text: '+20 damage, quicker fuse work' },
    ],
  },
  boomerang: {
    name: 'Compass Boomerang', kind: 'manual', icon: 'boomerang',
    desc: 'Flies out along your aim and carves back through everything.',
    base: { cd: 1.1, dmg: 16, count: 1, range: 285, speed: 430, size: 12 },
    levels: [
      { dmg: 8, text: '+8 damage' },
      { count: 1, text: '+1 boomerang' },
      { range: 95, size: 4, text: 'Flies farther, hits wider' },
      { dmg: 10, cdMul: 0.82, text: '+10 damage, faster returns' },
    ],
  },
  knives: {
    name: 'Whittling Knives', kind: 'auto', icon: 'knives',
    desc: 'Pocketknives orbit you and cut whatever creeps close.',
    base: { count: 2, dmg: 13, radius: 66, rot: 2.6, hitCd: 0.45 },
    levels: [
      { count: 1, text: '+1 knife' },
      { dmg: 7, text: '+7 damage' },
      { radius: 22, rot: 0.7, text: 'Wider, faster orbit' },
      { count: 1, dmg: 8, text: '+1 knife, +8 damage' },
    ],
  },
  bugspray: {
    name: 'Bug Spray', kind: 'auto', icon: 'bugspray',
    desc: 'A choking cloud that constantly stings everything near you.',
    base: { radius: 76, dps: 8, tick: 0.25, slow: 0 },
    levels: [
      { radius: 20, text: 'Bigger cloud' },
      { dps: 5, text: 'Nastier fumes' },
      { slow: 0.3, text: 'Fumes slow critters' },
      { radius: 26, dps: 6, text: 'Bigger, nastier cloud' },
    ],
  },
  canteen: {
    name: 'Canteen of Holy Water', kind: 'auto', icon: 'canteen',
    desc: 'Splashes blessed puddles that scald the unholy where they stand.',
    base: { cd: 3.0, count: 1, radius: 64, dps: 10, dur: 3, range: 300 },
    levels: [
      { radius: 18, text: 'Wider puddles' },
      { count: 1, text: '+1 splash' },
      { dps: 7, text: 'Holier water' },
      { dur: 1.5, count: 1, text: '+1 splash, lingers longer' },
    ],
  },
  bugle: {
    name: 'Camp Bugle', kind: 'auto', icon: 'bugle',
    desc: 'Periodic reveille blast that batters and shoves the whole horde.',
    base: { cd: 4.2, dmg: 22, radius: 175, knock: 300, stun: 0 },
    levels: [
      { dmg: 12, text: '+12 damage' },
      { radius: 60, text: 'Louder, wider blast' },
      { cdMul: 0.75, text: 'Sounds off 25% more often' },
      { dmg: 16, stun: 0.8, text: '+16 damage, staggers critters' },
    ],
  },
};

DATA.passives = {
  firstaid:   { name: 'First Aid Kit', icon: 'firstaid', max: 3, desc: 'Regenerate HP over time.', per: '+0.6 HP per second' },
  trailmix:   { name: 'Trail Mix', icon: 'trailmix', max: 3, desc: 'Protein. Raisins. Violence.', per: '+12% damage' },
  boots:      { name: 'Hiking Boots', icon: 'boots', max: 3, desc: 'Broken in on lesser trails.', per: '+10% move speed' },
  lodestone:  { name: 'Lodestone', icon: 'lodestone', max: 3, desc: 'Badges want to come home.', per: '+45% pickup radius' },
  whistle:    { name: 'Scoutmaster Whistle', icon: 'whistle', max: 3, desc: 'Everything hustles when it blows.', per: '9% faster cooldowns' },
  skillet:    { name: 'Cast Iron Skillet', icon: 'skillet', max: 3, desc: 'Worn on the chest, as intended.', per: '+2 armor' },
  fieldguide: { name: 'Field Guide', icon: 'fieldguide', max: 3, desc: 'Know thy enemy. Chapter 6: squirrels.', per: '+15% badge XP' },
  rabbitfoot: { name: 'Rabbit Foot', icon: 'rabbitfoot', max: 3, desc: 'It is not from a lucky rabbit.', per: '+8% crit chance' },
};

DATA.enemies = {
  squirrel: { hp: 9,   spd: 96,  dmg: 7,  r: 11, xp: 1, w: 32, spr: 'squirrel', move: 'walk' },
  rabbit:   { hp: 13,  spd: 0,   dmg: 8,  r: 11, xp: 1, w: 30, spr: 'rabbit',   move: 'hop', hopSpd: 310 },
  doe:      { hp: 34,  spd: 54,  dmg: 12, r: 14, xp: 2, w: 40, spr: 'doe',      move: 'walk' },
  bat:      { hp: 12,  spd: 120, dmg: 7,  r: 10, xp: 1, w: 34, spr: 'bat',      move: 'sine' },
  raccoon:  { hp: 60,  spd: 64,  dmg: 14, r: 13, xp: 3, w: 36, spr: 'raccoon',  move: 'walk' },
  owl:      { hp: 45,  spd: 82,  dmg: 10, r: 12, xp: 3, w: 34, spr: 'owl',      move: 'ranged', shotCd: 2.8, shotDmg: 9, shotSpd: 190 },
  boar:     { hp: 95,  spd: 56,  dmg: 20, r: 16, xp: 5, w: 48, spr: 'boar',     move: 'charge', chargeSpd: 340 },
  fox:      { hp: 70,  spd: 140, dmg: 14, r: 12, xp: 5, w: 40, spr: 'fox',      move: 'weave' },
  beaver:   { hp: 170, spd: 44,  dmg: 18, r: 14, xp: 6, w: 38, spr: 'beaver',   move: 'walk' },
};

DATA.bosses = [
  { id: 'hare',     at: 300, name: 'THE HARE OF PERDITION', hp: 1300, dmg: 16, r: 26, w: 76,  spr: 'rabbit',  move: 'bosshare', hopSpd: 360, xp: 60 },
  { id: 'vicar',    at: 600, name: 'THE TRASH VICAR',       hp: 3600, dmg: 22, r: 30, w: 88,  spr: 'raccoon', move: 'bossvicar', spd: 58, xp: 120 },
  { id: 'antlered', at: 840, name: 'THE ANTLERED ONE',      hp: 8500, dmg: 28, r: 32, w: 120, spr: 'stag',    move: 'bossstag', spd: 76, xp: 0, final: true },
];

DATA.pool = [
  { id: 'squirrel', from: 0,    until: 9,  wgt: 100 },
  { id: 'rabbit',   from: 0.7,  until: 11, wgt: 70 },
  { id: 'doe',      from: 2,    until: 13, wgt: 55 },
  { id: 'bat',      from: 3.5,  until: 14, wgt: 50 },
  { id: 'raccoon',  from: 4.5,  until: 99, wgt: 45 },
  { id: 'owl',      from: 6,    until: 99, wgt: 30 },
  { id: 'boar',     from: 7.5,  until: 99, wgt: 30 },
  { id: 'fox',      from: 9,    until: 99, wgt: 30 },
  { id: 'beaver',   from: 10.5, until: 99, wgt: 28 },
];

DATA.events = [
  { t: 170, name: 'RING OF THE HARE',   spawns: [{ id: 'rabbit', n: 26, mode: 'ring' }] },
  { t: 330, name: 'CHIROPTERAN CHOIR',  spawns: [{ id: 'bat', n: 36, mode: 'side' }] },
  { t: 480, name: 'THE SQUIRREL FLOOD', spawns: [{ id: 'squirrel', n: 60, mode: 'burst' }] },
  { t: 560, name: 'FOXFIRE HUNT',       spawns: [{ id: 'fox', n: 10, mode: 'ring' }] },
  { t: 660, name: 'STAMPEDE',           spawns: [{ id: 'boar', n: 14, mode: 'side' }] },
  { t: 760, name: 'DAM BREAK',          spawns: [{ id: 'beaver', n: 18, mode: 'ring' }] },
];

DATA.fillers = [
  { id: 'smore', name: 'Emergency S\'more', desc: 'Recover 40 HP right now.', icon: 'firstaid' },
  { id: 'patch', name: 'Uniform Patch', desc: '+10 max HP, and heal 10.', icon: 'skillet' },
  { id: 'stash', name: 'Badge Stash', desc: 'Gain 25 badge XP.', icon: 'fieldguide' },
];

DATA.xpNext = l => Math.floor(6 + l * 3.5 + Math.pow(l, 1.8) * 0.8);
DATA.hpScale = m => 1 + m * 0.5 + m * m * 0.035;
DATA.dmgScale = m => 1 + m * 0.11;
DATA.bossHpScale = m => 1 + m * 0.09;
DATA.spawnInterval = m => Math.max(0.24, 1.05 - m * 0.062);
DATA.spawnBatch = m => 1 + Math.floor(m * 0.55);

// ===========================================================================
// Run structure. Everything below is additive: the open field game reads none
// of it and behaves exactly as it did. The room runtime lands in a later wave.
// ===========================================================================

// Difficulty on the same 0 to 14 scale the curves above already use, except
// keyed to where you are in the run instead of the wall clock. Each act is
// worth 4.6, so act 1 room 0 is 0 and the last room of act 3 is 13.8, which
// puts a winning 15 minute run on the same curve the timed field ends on.
DATA.threatOf = (act, roomIdx, roomsInAct) =>
  (act - 1) * 4.6 + (roomIdx / Math.max(1, roomsInAct)) * 4.6;

// Floor themes, one per act plus the final arena. deco lists existing ground
// painters from sprites.js with pick weights; the hollow has none, on purpose.
// The dress block is the world dressing palette the room renderer bakes from:
// treeline canopy values, forest floor beyond the wall, trampled path colors,
// standing water, char, and the clearing light. Purely visual.
DATA.themes = {
  1: {
    name: 'THE UNDERSTORY',
    ground: '#0e1510',
    mottle: '#1e2a16',
    deco: [
      { id: 'grass1', w: 34 },
      { id: 'grass2', w: 30 },
      { id: 'stone', w: 14 },
      { id: 'mush', w: 14 },
      { id: 'bone', w: 8 },
    ],
    signAlpha: 0.55,
    fogColor: '#0a120c',
    fogAlpha: 0.16,
    ambient: '#8fd8a6',
    accent: '#c9f27a',
    dress: {
      void: '#040803',
      floorOut: '#0a0f08',
      canopyDeep: '#0a1309',
      canopyWash: null,
      rim: 'rgba(178,214,116,0.20)',
      path: { edge: 'rgba(12,9,5,0.55)', base: '#2e2517', mid: '#3d3120', speck: '#57482e' },
      water: { fill: '#0e2126', deep: '#0c2b33', edge: 'rgba(10,16,18,0.8)', glint: 'rgba(150,214,220,0.25)' },
      charFill: '#0b0705',
      ember: '255,122,42',
      needles: ['#33270f', '#3e2f14', '#271e0c'],
      firefly: '190,230,120',
      lightWarm: '255,214,150',
      lightDark: '4,8,6',
      edgeDark: 0.28,
    },
  },
  2: {
    name: 'THE SOG',
    ground: '#0b1417',
    mottle: '#123038',
    deco: [
      { id: 'grass2', w: 28 },
      { id: 'stone', w: 26 },
      { id: 'mush', w: 22 },
      { id: 'grass1', w: 14 },
      { id: 'bone', w: 10 },
    ],
    signAlpha: 0.5,
    fogColor: '#0d2a30',
    fogAlpha: 0.28,
    ambient: '#5fb9c9',
    accent: '#7fe6d8',
    dress: {
      void: '#03070a',
      floorOut: '#070d10',
      canopyDeep: '#081114',
      canopyWash: 'rgba(24,74,80,0.20)',
      rim: 'rgba(127,230,216,0.16)',
      path: { edge: 'rgba(6,10,12,0.6)', base: '#20272a', mid: '#2b3438', speck: '#3e4a4e' },
      water: { fill: '#0c2129', deep: '#0d2d38', edge: 'rgba(8,13,16,0.85)', glint: 'rgba(127,230,216,0.28)' },
      charFill: '#0a0d0e',
      ember: '127,230,216',
      needles: ['#1c2422', '#232c2a', '#161d1c'],
      firefly: '110,210,205',
      lightWarm: '170,230,225',
      lightDark: '2,7,10',
      edgeDark: 0.30,
    },
  },
  3: {
    name: 'THE BURN',
    ground: '#17110d',
    mottle: '#2c1a10',
    deco: [
      { id: 'bone', w: 30 },
      { id: 'stone', w: 28 },
      { id: 'grass1', w: 16 },
      { id: 'mush', w: 14 },
      { id: 'grass2', w: 12 },
    ],
    signAlpha: 0.45,
    fogColor: '#2a1408',
    fogAlpha: 0.30,
    ambient: '#e08a3c',
    accent: '#ff7a2a',
    dress: {
      void: '#080403',
      floorOut: '#0e0906',
      canopyDeep: '#120b07',
      canopyWash: 'rgba(80,32,12,0.22)',
      rim: 'rgba(255,122,42,0.14)',
      path: { edge: 'rgba(10,6,4,0.6)', base: '#2a221b', mid: '#383026', speck: '#4e4234' },
      water: { fill: '#101314', deep: '#0c0f10', edge: 'rgba(8,6,4,0.8)', glint: 'rgba(255,150,80,0.18)' },
      charFill: '#0a0605',
      ember: '255,122,42',
      needles: ['#2c211a', '#362a20', '#221913'],
      firefly: '255,150,60',
      lightWarm: '255,178,110',
      lightDark: '8,4,3',
      edgeDark: 0.30,
    },
  },
  hollow: {
    name: 'THE HOLLOW',
    ground: '#05060a',
    mottle: '#0b0d14',
    deco: [],
    signAlpha: 0,
    fogColor: '#000105',
    fogAlpha: 0.42,
    ambient: '#6a7cff',
    accent: '#b7c0ff',
    dress: {
      void: '#020308',
      floorOut: '#04050a',
      canopyDeep: '#05070d',
      canopyWash: 'rgba(16,20,48,0.35)',
      rim: 'rgba(183,192,255,0.10)',
      path: { edge: 'rgba(2,3,6,0.6)', base: '#0e1016', mid: '#14161e', speck: '#1e2230' },
      water: { fill: '#070a12', deep: '#05070d', edge: 'rgba(2,3,6,0.8)', glint: 'rgba(140,150,255,0.14)' },
      charFill: '#030408',
      ember: '106,124,255',
      needles: ['#0c0e14', '#101320', '#080a10'],
      firefly: '106,124,255',
      lightWarm: '140,150,255',
      lightDark: '1,2,6',
      edgeDark: 0.44,
    },
  },
};

// Dodge roll, one per character. Added as a key on the existing entries so the
// character table above stays exactly as it was. spd is the roll speed, dur how
// long the roll lasts, iframe how long you are untouchable, cd the recharge per
// charge in seconds.
DATA.characters.max.dodge = {
  name: 'Sidestep', spd: 620, dur: 0.17, iframe: 0.30, cd: 1.0, charges: 1,
};
DATA.characters.junie.dodge = {
  name: 'Backdraft', spd: 700, dur: 0.13, iframe: 0.24, cd: 0.8, charges: 2, trail: 'burn',
};
DATA.characters.gus.dodge = {
  name: 'Tuck and Roll', spd: 520, dur: 0.24, iframe: 0.34, cd: 1.4, charges: 1, barge: true,
};

// Bosses by act tier. These are the same three definitions from DATA.bosses,
// copied with a tier and an act stamped on, so the room runner can ask for
// "the act 2 boss" without caring about the field game's clock triggers. The
// original DATA.bosses array is untouched and still drives the timed field.
DATA.bossTiers = (function () {
  const by = {};
  for (const b of DATA.bosses) by[b.id] = b;
  return {
    1: [Object.assign({}, by.hare, { tier: 1, act: 1 })],
    2: [Object.assign({}, by.vicar, { tier: 2, act: 2 })],
    3: [Object.assign({}, by.antlered, { tier: 3, act: 3, final: true })],
  };
})();

// Cookie Money: the in-run currency. clear pays out per cleared combat room and
// grows by act, prop is the min and max a smashed prop coughs up, cache is a
// loot room haul, and convert is how many badges each leftover coin is worth
// when the run ends.
DATA.COINS = {
  clear: act => 8 + act * 4,
  elite: 12,
  boss: 60,
  prop: [1, 3],
  cache: 35,
  convert: 2,
};

// Active skills (the ones on a button, not the auto weapons) land in a later
// wave. The key exists now so nothing downstream has to guess at its shape.
DATA.skills = {};
