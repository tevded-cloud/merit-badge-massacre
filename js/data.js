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
