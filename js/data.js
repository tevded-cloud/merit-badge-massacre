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
    base: { cd: 0.42, dmg: 12, count: 1, speed: 520, pierce: 0, spread: 0.07 },
    levels: [
      { dmg: 4, text: '+4 damage' },
      { count: 1, text: '+1 stone per volley' },
      { pierce: 1, dmg: 5, text: 'Stones pierce, +5 damage' },
      { count: 1, dmg: 6, cdMul: 0.70, text: '+1 stone, +6 damage, 30% faster volleys' },
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
      { count: 1, dmg: 5, burnDps: 4, text: 'Wider gout, +5 damage, hotter burn' },
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
      { dmg: 30, knock: 140, text: '+30 damage, heavy knockback' },
    ],
  },
  firecracker: {
    name: 'Firecrackers', kind: 'manual', icon: 'firecracker', locked: true,
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
    name: 'Compass Boomerang', kind: 'manual', icon: 'boomerang', locked: true,
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
      { count: 1, dmg: 14, text: '+1 knife, +14 damage' },
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
      { radius: 26, dps: 12, text: 'Bigger, far nastier cloud' },
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
      { dur: 1.5, count: 1, dps: 6, text: '+1 splash, holier, lingers longer' },
    ],
  },
  bugle: {
    name: 'Camp Bugle', kind: 'auto', icon: 'bugle', locked: true,
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
  whistle:    { name: 'Scoutmaster Whistle', icon: 'whistle', max: 3, locked: true, desc: 'Everything hustles when it blows.', per: '9% faster cooldowns' },
  skillet:    { name: 'Cast Iron Skillet', icon: 'skillet', max: 3, desc: 'Worn on the chest, as intended.', per: '+2 armor' },
  fieldguide: { name: 'Field Guide', icon: 'fieldguide', max: 3, desc: 'Know thy enemy. Chapter 6: squirrels.', per: '+15% badge XP' },
  rabbitfoot: { name: 'Rabbit Foot', icon: 'rabbitfoot', max: 3, locked: true, desc: 'It is not from a lucky rabbit.', per: '+8% crit chance' },
};

DATA.enemies = {
  squirrel: { hp: 9,   spd: 96,  dmg: 7,  r: 11, xp: 1, w: 32, spr: 'squirrel', move: 'walk' },
  rabbit:   { hp: 13,  spd: 0,   dmg: 8,  r: 11, xp: 1, w: 30, spr: 'rabbit',   move: 'hop', hopSpd: 310 },
  doe:      { hp: 38,  spd: 54,  dmg: 12, r: 14, xp: 2, w: 40, spr: 'doe',      move: 'walk' },
  bat:      { hp: 12,  spd: 120, dmg: 7,  r: 10, xp: 1, w: 34, spr: 'bat',      move: 'sine' },
  raccoon:  { hp: 64,  spd: 64,  dmg: 14, r: 13, xp: 3, w: 36, spr: 'raccoon',  move: 'walk' },
  owl:      { hp: 45,  spd: 82,  dmg: 10, r: 12, xp: 3, w: 34, spr: 'owl',      move: 'ranged', shotCd: 2.8, shotDmg: 9, shotSpd: 190 },
  boar:     { hp: 80,  spd: 56,  dmg: 20, r: 16, xp: 5, w: 48, spr: 'boar',     move: 'charge', chargeSpd: 340 },
  fox:      { hp: 60,  spd: 140, dmg: 14, r: 12, xp: 5, w: 40, spr: 'fox',      move: 'weave' },
  beaver:   { hp: 132, spd: 44,  dmg: 18, r: 14, xp: 6, w: 38, spr: 'beaver',   move: 'walk' },

  // ---- the room roster ----------------------------------------------------
  // Nine species the room run deals and the open field never sees: DATA.pool
  // below is untouched, so the timed field is exactly the nine above. Every
  // field here is read by an engine capability that already exists.
  //   onDeath   'eshot6' bursts, 'split2' halves (director.runDeathEffects)
  //   leash     joins a pack of up to three by proximity at spawn
  //   underT    how long a burrower stays down between surfacings
  //   shotCd/shotDmg/shotSpd  any gait may carry a shot, not just 'ranged'
  //   tongue    how far a hopper will spit on landing
  //   puff      inflate telegraph, seconds, before the tongue lands
  //   stab      a ranged thing that plants a circle instead of firing up close
  //   trail     a charger that leaves fire in the lane it just ran
  //   guard     [shielded seconds, exposed seconds] and guardArmor the share of
  //             damage that gets through while the plates are down

  // The smallest thing in the woods, and it never comes alone.
  ticktot:        { hp: 4,   spd: 138, dmg: 4,  r: 7,  xp: 1, w: 20, spr: 'ticktot',        move: 'walk' },
  // Waddles. Bursts. Kill it at arm's length and you wear the seeds.
  pineconepuffer: { hp: 26,  spd: 40,  dmg: 9,  r: 13, xp: 2, w: 34, spr: 'pineconepuffer', move: 'walk', onDeath: 'eshot6' },
  // Never one chipmunk. Always the trio, and they will not be separated.
  chipchoir:      { hp: 16,  spd: 92,  dmg: 7,  r: 10, xp: 2, w: 26, spr: 'chipchoir',      move: 'leash', leash: true },
  // Hops in, inflates, and the tongue comes out straight.
  bogfrog:        { hp: 36,  spd: 0,   dmg: 10, r: 13, xp: 3, w: 32, spr: 'bogfrog',        move: 'hop', hopSpd: 260, shotCd: 2.4, shotDmg: 8, shotSpd: 300, tongue: 320, puff: 0.35 },
  // Stands off and throws. Let it get close and the bill comes down instead.
  stiltheron:     { hp: 78,  spd: 48,  dmg: 12, r: 13, xp: 5, w: 44, spr: 'stiltheron',     move: 'ranged', shotCd: 2.6, shotDmg: 11, shotSpd: 230, stab: true },
  // Under the whole time it matters, up for exactly as long as it does not.
  sapperrat:      { hp: 32,  spd: 78,  dmg: 11, r: 11, xp: 3, w: 28, spr: 'sapperrat',      move: 'burrow', underT: 2.2 },
  // Runs at you smouldering and the lane stays lit behind it.
  ashelk:         { hp: 86,  spd: 58,  dmg: 19, r: 17, xp: 5, w: 52, spr: 'ashelk',         move: 'charge', chargeSpd: 320, trail: true },
  // Kill it and there are two. Kill those and there are only two.
  cindercrow:     { hp: 30,  spd: 104, dmg: 9,  r: 12, xp: 3, w: 30, spr: 'cindercrow',     move: 'sine', onDeath: 'split2', splitAgain: false },
  // Works a shift: plates down and nothing lands, then a beat where it does.
  quarrybadger:   { hp: 92,  spd: 50,  dmg: 17, r: 15, xp: 5, w: 42, spr: 'quarrybadger',   move: 'walk', guard: [2.5, 1.5], guardArmor: 0.15 },
};

// Display names only. The ids are save keys and never change: the journal, the
// codex and Brock's lines all hang off hare / vicar / antlered.
// BRAMBLEBUCK was the wall of the whole run: most losses happened in his den,
// at three minutes in, on a first night. THE TALLYMAN was the opposite, dead
// in under half a minute. OLD NOBODY ran a three minute health bar and, in the
// last phase, outran the player at 76 speed times the 2.2 the phase applies.
// 58 keeps him catchable by the slowest scout in the troop (Gus, 132) with no
// boot patch on: at 76 he could not be caught by anyone who had not bought
// speed, and the fight simply never ended.
DATA.bosses = [
  { id: 'hare',     at: 300, name: 'BRAMBLEBUCK',  hp: 1050, dmg: 13, r: 26, w: 96,  spr: 'bramblebuck', move: 'bosshare', hopSpd: 360, xp: 60 },
  { id: 'vicar',    at: 600, name: 'THE TALLYMAN', hp: 5000, dmg: 21, r: 30, w: 88,  spr: 'raccoon', move: 'bossvicar', spd: 58, xp: 120 },
  { id: 'antlered', at: 840, name: 'OLD NOBODY',   hp: 6000, dmg: 26, r: 32, w: 150, spr: 'oldnobody', move: 'bossstag', spd: 54, xp: 0, final: true },
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

// Act ecosystems. A room draws its bodies from the act it is standing in, not
// from the flat pool above: each act reads as its own woods, and a species that
// belongs to one act is a guest anywhere else. Numbers are pick weights, not
// counts, and the director tilts them within the act (see rosterPick in
// director.js): the first rooms of an act lean on the lighter half of its list
// and the last rooms lean on the heavier half, so an act opens and closes
// differently without needing two rosters to say so.
//
// The open field never reads this. DATA.pool above still drives that game.
// The three lists are also the difficulty ramp, and they used to be a cliff:
// an act 1 body averaged 16 health, an act 2 body averaged 35, and the door
// between them more than doubled what a body was worth in a single step. That
// door is where the losses piled up. Act 1 carries a little more meat now, act
// 2 leans back on its chaff, and the curve above carries the ramp instead.
DATA.rosters = {
  // THE UNDERSTORY: small, quick, and far too many of them.
  1: { squirrel: 22, rabbit: 20, doe: 26, bat: 10, ticktot: 8, pineconepuffer: 12, chipchoir: 12 },
  // THE SOG: wet things that hold ground and shoot from it. The chaff weights
  // are load bearing, not filler: with only the wet bodies in the list an act 2
  // room is nothing but 32 to 150 hp targets and takes twice as long to clear
  // as the layouts were authored for. Beaver is deliberately rare, at 150 hp it
  // is an event rather than a regular.
  2: { bogfrog: 22, sapperrat: 20, stiltheron: 6, raccoon: 10, beaver: 4, bat: 18, chipchoir: 16, ticktot: 24 },
  // THE BURN: everything here is heavy, on fire, or both. The crows and owls
  // are what keeps it from being a wall of hp.
  3: { ashelk: 11, cindercrow: 24, quarrybadger: 8, boar: 13, fox: 16, owl: 18, doe: 12 },
};

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

// Ranks. The old curve handed out about twenty six of them a night, which was
// enough to finish every weapon and every patch you were carrying: by act 3
// every build was the same build, and what you had picked stopped mattering.
// Nineteen or twenty is the number where the picks are still choices.
DATA.xpNext = l => Math.floor(6 + l * 5.0 + Math.pow(l, 1.8) * 2.0);
// Body health. The quadratic used to do all the work at the top of the ramp
// and none at the bottom, which is how act 3 ended up more than half the
// night with rooms running three minutes each. Nearly linear now: the ramp is
// spread across the whole run instead of parked on the last act.
DATA.hpScale = m => 1 + m * 1.16 + m * m * 0.008;
DATA.dmgScale = m => 1 + m * 0.125;
DATA.bossHpScale = m => 1 + m * 0.105;
DATA.spawnInterval = m => Math.max(0.24, 1.05 - m * 0.062);
DATA.spawnBatch = m => 1 + Math.floor(m * 0.55);

// ===========================================================================
// Run structure. Everything below is additive: the open field game reads none
// of it and behaves exactly as it did. The room runtime lands in a later wave.
// ===========================================================================

// Difficulty on the same 0 to 14 scale the curves above already use, except
// keyed to where you are in the run instead of the wall clock. Each act is
// worth 4.2, so act 1 room 0 is 0 and the last room of act 3 is 12.6. The
// step used to be 4.6, which put the end of a room run at the far end of a
// curve written for a fifteen minute open field: a room run gets there with a
// smaller build, and the top of that ramp was where act 3 turned into a wall.
DATA.threatOf = (act, roomIdx, roomsInAct) =>
  (act - 1) * 4.2 + (roomIdx / Math.max(1, roomsInAct)) * 4.2;

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
// 3.0: the per character flavour is a DASH TRAIT SET, in the same vocabulary
// an item writes into. Junie's fire and Gus's shoulder used to be two flags
// read by two ifs in dodge.js; they are entries in a list now, so an item
// that adds frost to a dash lands beside her fire rather than instead of it.
// The old trail/barge flags are gone: dodge.js still compiles them for any
// character authored before the vocabulary, but nothing here needs that.
DATA.characters.max.dodge = {
  name: 'Sidestep', spd: 620, dur: 0.17, iframe: 0.30, cd: 1.0, charges: 1,
};
DATA.characters.junie.dodge = {
  name: 'Backdraft', spd: 700, dur: 0.13, iframe: 0.24, cd: 0.8, charges: 2,
  traits: [{ t: 'trail', effect: 'burn', dps: 6, dur: 1.2, r: 26, rate: 0.3 }],
};
DATA.characters.gus.dodge = {
  name: 'Tuck and Roll', spd: 520, dur: 0.24, iframe: 0.34, cd: 1.4, charges: 1,
  traits: [{ t: 'barge', knock: 260, stun: 0.3, propDmg: 20, r: 30 }],
};

// Bosses by act tier. These are the same three definitions from DATA.bosses,
// copied with a tier and an act stamped on, so the room runner can ask for
// "the act 2 boss" without caring about the field game's clock triggers. The
// original DATA.bosses array is untouched and still drives the timed field.
DATA.bossTiers = (function () {
  const by = {};
  for (const b of DATA.bosses) by[b.id] = b;
  // The tier copies carry the display names set above by construction: hare
  // is BRAMBLEBUCK, vicar is THE TALLYMAN, antlered is OLD NOBODY. One source
  // of truth, so a rename can never land in one table and not the other.
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
// wave. The runtime is not here yet: nothing reads this table during a run.
// The three entries below exist because the Feat Board awards them, and a
// reward with no name on it is not a reward. Each one is locked: true, which
// means feats.js keeps it out of DATA.skills entirely until its feat lands.
// ===========================================================================
// 3.0 SUBSTRATE DEMONSTRATION ITEMS
//
// These four exist to prove that composable traits and event hooks actually
// compose, and for nothing else. They are not balance and they are not
// content: no feat awards them, they are in no shop, and levelPool only ever
// offers them when DATA.DEBUG_TRAITS is true, which nothing in a normal run
// sets. Turn them on with ?traits=1 in the URL, or DATA.DEBUG_TRAITS = true
// from a console.
//
// The point is the shape. Every one of them is DATA. Not one of them names a
// weapon, a scout, or a projectile kind, and not one of them required a line
// of engine code to exist. That is the whole thesis: later item authoring is
// authoring, not engineering.
// ===========================================================================

DATA.DEBUG_TRAITS = false;
try {
  if (typeof location !== 'undefined' && location.search &&
      /[?&]traits=1/.test(location.search)) {
    DATA.DEBUG_TRAITS = true;
  }
} catch (e) { /* no location off the web, which is fine */ }

DATA.relics = {
  // 1. Two shot traits, stacked. Works on the slingshot, the roaster and the
  //    boomerang because it never mentions any of them; chain is 'any' scope
  //    so it also arcs off a hand axe chop, an orbiting knife, the bug spray
  //    cloud, a holy water puddle, a firecracker blast and a bugle ring.
  quartzsplitter: {
    name: 'Quartz Splitter', icon: 'slingshot',
    desc: 'Everything you throw goes through the first one and jumps to the next.',
    shotTraits: [
      { t: 'pierce', n: 2 },
      { t: 'chain', jumps: 2, range: 150, falloff: 0.6 },
    ],
  },

  // 2. A status and a shape, stacked. burn is 'any' scope and reaches every
  //    weapon; split is 'shot' scope and reshapes the projectiles, which is
  //    the honest answer for a swing that has no projectile to split.
  emberseed: {
    name: 'Ember Seed', icon: 'roaster',
    desc: 'Sets what it touches alight, and comes apart into more of itself.',
    shotTraits: [
      { t: 'burn', dps: 8, dur: 2.4 },
      { t: 'split', on: 'expire', n: 3, spread: 1.0, dmg: 0.5, size: 0.7, life: 0.7, gen: 1 },
    ],
  },

  // 3. No traits at all: one event handler. Proves the bus is a real second
  //    surface, and proves an item can MAKE a trait carrying projectile that
  //    no weapon ever fired.
  tinderfetch: {
    name: 'Tinder Fetch', icon: 'lodestone',
    desc: 'Every critter you put down coughs up a spark that goes looking for the next one.',
    hooks: [{
      on: 'onKill', pri: 0,
      fn: function (g, e) {
        if (!e || e.prop || e.boss) return;
        if (g.shots.length > 260) return;
        if (DATA._sparkSet === undefined) {
          DATA._sparkSet = Traits.compileShot([{ t: 'homing', turn: 7.5, range: 340 }]);
        }
        const a = Math.random() * Math.PI * 2;
        g.shots.push(g.armShot({
          kind: 'pebble', x: e.x, y: e.y - 6,
          vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
          dmg: 6, pierce: 0, r: 4, life: 2.4,
        }, DATA._sparkSet));
      },
    }],
  },

  // 4. The dash surface, end to end: a trait set on the roll, standing
  //    modifiers on the charges, and an onDodge handler that rewrites the
  //    roll before it integrates. Works on all three scouts without naming
  //    any of them: Junie keeps her fire and gains frost beside it, Gus keeps
  //    his shoulder, Max had nothing and now has this.
  ghostlace: {
    name: 'Ghost Lace Boots', icon: 'boots',
    desc: 'Roll through the crowd, not through the walls. The loot follows you home.',
    dash: { charges: 1, cdMul: 0.85, iframeAdd: 0.05 },
    dashTraits: [
      { t: 'phase', grace: 0.1, smash: 18 },
      { t: 'magnet', r: 190, pull: 3.4 },
      { t: 'mark', mul: 1.35, dur: 4, r: 34 },
      { t: 'trail', effect: 'frost', dur: 1.1, r: 26, rate: 0.35 },
    ],
    hooks: [{
      on: 'onDodge', pri: 0,
      fn: function (g, p, opt) {
        // Handed the roll before it moves: lengthen it by a third. Distance
        // is authoritative, so dodge.js derives the speed from what is left
        // here, and nothing about the scout's own numbers is hardcoded.
        opt.dist *= 1.33;
      },
    }],
  },
};

DATA.skills = {
  emberdrag: {
    name: 'Ember Drag', icon: 'roaster', locked: true,
    desc: 'Leave a lane of fire behind you for two seconds. Yours does not burn you. Probably.',
  },
  reveille: {
    name: 'Reveille', icon: 'bugle', locked: true,
    desc: 'One blast. Everything on screen stops what it is doing and looks at you, which is both good and bad.',
  },
  fieldstrip: {
    name: 'Field Strip', icon: 'knives', locked: true,
    desc: 'Turn the Cookie Money in your pocket into patched up scout, one coin at a time.',
  },
};
