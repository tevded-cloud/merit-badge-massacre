// Merit Badge Massacre: the room catalogue. Room kinds, the per-act running
// order, and the wave tables the combat rooms draw from.
//
// Nothing in this file runs today. The 1.0 game is still one open timed field
// and reads none of it; the room runtime lands in a later wave. This is pure
// authored content, safe to load beside the field game.
//
// ---------------------------------------------------------------------------
// RoomDef
// ---------------------------------------------------------------------------
// {
//   id            unique string, prefixed a1_ / a2_ / a3_ by act
//   name          display name for the door card and the room banner
//   type          'combat' | 'elite' | 'shop' | 'loot' | 'rest' | 'lore' | 'boss'
//   acts          [1], [2], [3]: which acts may deal this layout
//   size          { w, h } in world units, same scale the field game uses
//   shape         'rect' | 'round' | 'pillars'
//   lock          'none'     doors open the whole time (shop, rest, lore)
//                 'clear'    doors open when every wave is dead (combat, elite, boss)
//                 'survive'  doors open when the clock runs out (unused so far)
//                 'objective' doors open when the room's thing is done (loot caches)
//   doors         [{ side: 'n'|'e'|'s'|'w', t: 0..1 }] anchor points on the wall,
//                 t running left to right on n/s and top to bottom on e/w
//   entry         { side, t } where the player walks in
//   solids        [{ x, y, w, h, spr }] blockers in room-local coordinates with
//                 the origin at the top left corner. House rules, checked by the
//                 assertion pass: 2 to 5 per combat room, never closer than 200
//                 to any wall, never closer than 110 to each other, so they can
//                 never seal a pocket the player can walk into and not out of.
//                 spr names the painter: 'brock' exists today (sprites.js), and
//                 'log', 'wall', 'slab' come with the room render unit.
//   props         [{ id, x, y }] hand placed props, room-local coordinates
//   scatter       { propId: [min, max] } extra props the room seeds at random
//   spawnMarkers  [{ x, y }] anchors for waves that spawn at 'marker'
//   waves         [WaveDef] in order, first to last
//   reward        { kind: 'auto' } let the run pick the payout
//   floor         theme id into DATA.themes: 1, 2, 3, or 'hollow'
// }
//
// ---------------------------------------------------------------------------
// WaveDef
// ---------------------------------------------------------------------------
// {
//   delay    seconds to wait before this wave starts spawning
//   nextAt   advance when the living fraction of THIS wave drops below this
//            (0.3 means "when 70 percent of it is dead"), 0 means kill it all
//   maxT     seconds after which the wave advances anyway, so a stuck runner
//            never soft locks a room
//   spawns   [{ id, n, mode, r?, x?, y? }] where id is an enemy id from
//            DATA.enemies or 'auto' to roll DATA.pool at the room's threat
//            mode 'edge'   just off the room edge, all the way around
//                 'ring'   a full circle around the player at radius r
//                 'marker' cycles the room's spawnMarkers
//                 'point'  all at x, y in room-local coordinates
//                 'door'   at the room's door anchors
//   elites   how many of the wave's spawns come up elite
//   drip     null, or { id: 'auto', every, n } for a slow steady top up that
//            runs for as long as the wave is alive
//   ref      a WAVE_TEMPLATES key, or null. When set the template's spawns are
//            the wave's spawns and the template's name toasts on the screen.
// }
'use strict';

// The only prop ids a layout may name. boulder is the unbreakable one.
const ROOM_PROP_IDS = [
  'crate', 'basket', 'mailbox', 'birdhouse', 'stump',
  'bush', 'urn', 'barrel', 'logpile', 'boulder',
];

// ---------------------------------------------------------------------------
// Wave templates: the six named set pieces, lifted off DATA.events so a room
// can call for one by name. DATA.events itself is untouched and still drives
// the open field game on its own clock. The old 'side' and 'burst' modes both
// land on 'edge' here, since a room edge is already a ring of arrival points.
// ---------------------------------------------------------------------------
const WAVE_TEMPLATES = {
  ring_of_the_hare: {
    name: 'RING OF THE HARE',
    delay: 1.2, nextAt: 0.2, maxT: 55,
    spawns: [{ id: 'rabbit', n: 26, mode: 'ring', r: 470 }],
    elites: 0, drip: null, ref: null,
  },
  chiropteran_choir: {
    name: 'CHIROPTERAN CHOIR',
    delay: 1.2, nextAt: 0.25, maxT: 60,
    spawns: [{ id: 'bat', n: 36, mode: 'edge' }],
    elites: 0, drip: null, ref: null,
  },
  the_squirrel_flood: {
    name: 'THE SQUIRREL FLOOD',
    delay: 1.0, nextAt: 0.2, maxT: 65,
    spawns: [{ id: 'squirrel', n: 60, mode: 'edge' }],
    elites: 0, drip: null, ref: null,
  },
  foxfire_hunt: {
    name: 'FOXFIRE HUNT',
    delay: 1.4, nextAt: 0, maxT: 60,
    spawns: [{ id: 'fox', n: 10, mode: 'ring', r: 430 }],
    elites: 0, drip: null, ref: null,
  },
  stampede: {
    name: 'STAMPEDE',
    delay: 1.6, nextAt: 0, maxT: 65,
    spawns: [{ id: 'boar', n: 14, mode: 'edge' }],
    elites: 0, drip: null, ref: null,
  },
  dam_break: {
    name: 'DAM BREAK',
    delay: 1.6, nextAt: 0, maxT: 70,
    spawns: [{ id: 'beaver', n: 18, mode: 'ring', r: 460 }],
    elites: 0, drip: null, ref: null,
  },
};

// ---------------------------------------------------------------------------
// Act templates. Three acts, each ending on its own boss room, then THE HOLLOW
// after act 3. beats is one entry per room slot: a single type, or a few types
// separated by pipes for the run to choose between. beats.length always equals
// rooms, and the last slot is always the boss.
// ---------------------------------------------------------------------------
const ACT_TEMPLATES = [
  {
    act: 1,
    name: 'THE UNDERSTORY',
    rooms: 6,
    beats: ['combat', 'shop|lore', 'combat|elite', 'combat|elite', 'loot|rest|lore', 'boss'],
    bossTier: 1,
    rules: { noRepeatType: 2, guarantee: ['shop', 'loot'] },
  },
  {
    act: 2,
    name: 'THE SOG',
    rooms: 7,
    beats: ['combat', 'combat|elite|lore', 'shop', 'combat|elite', 'combat|elite', 'loot|rest|lore', 'boss'],
    bossTier: 2,
    rules: { noRepeatType: 2, guarantee: ['shop', 'loot'] },
  },
  {
    act: 3,
    name: 'THE BURN',
    rooms: 8,
    beats: ['combat', 'combat|elite|lore', 'combat|elite', 'shop', 'combat|elite', 'combat|elite', 'loot|rest|lore', 'boss'],
    bossTier: 3,
    rules: { noRepeatType: 2, guarantee: ['shop', 'loot'] },
  },
];

// ---------------------------------------------------------------------------
// Layouts. Ten per act (4 combat, 1 elite, 1 shop, 1 loot, 1 rest, 1 lore,
// 1 boss arena) plus THE HOLLOW at the end of act 3.
//
// Kill budget: every combat room totals 55 to 70 authored spawns across 2 to 4
// waves. Drip is on top of that and only starts in act 2.
// ---------------------------------------------------------------------------
const ROOMS = {
  combat: {

    // ------------------------------ act 1 ------------------------------
    a1_c_needlefall: {
      id: 'a1_c_needlefall', name: 'NEEDLEFALL', type: 'combat', acts: [1],
      size: { w: 1500, h: 1050 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.55 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.72 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 420, y: 330, w: 170, h: 60, spr: 'log' },
        { x: 900, y: 560, w: 120, h: 120, spr: 'brock' },
        { x: 560, y: 720, w: 200, h: 56, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 330, y: 520 },
        { id: 'bush', x: 1130, y: 300 },
        { id: 'crate', x: 1180, y: 800 },
        { id: 'basket', x: 300, y: 840 },
        { id: 'mailbox', x: 760, y: 220 },
        { id: 'logpile', x: 1010, y: 900 },
      ],
      scatter: { bush: [3, 6], stump: [1, 3] },
      spawnMarkers: [
        { x: 260, y: 250 }, { x: 1240, y: 250 }, { x: 260, y: 800 },
        { x: 1240, y: 800 }, { x: 750, y: 520 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 22, mode: 'edge' }, { id: 'auto', n: 6, mode: 'ring', r: 340 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_kettlehollow: {
      id: 'a1_c_kettlehollow', name: 'KETTLE HOLLOW', type: 'combat', acts: [1],
      size: { w: 1700, h: 1150 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.4 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 600, y: 420, w: 140, h: 140, spr: 'brock' },
        { x: 1000, y: 640, w: 150, h: 120, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 400, y: 300 },
        { id: 'stump', x: 1300, y: 850 },
        { id: 'urn', x: 860, y: 300 },
        { id: 'bush', x: 420, y: 860 },
        { id: 'basket', x: 1280, y: 340 },
        { id: 'crate', x: 300, y: 600 },
        { id: 'boulder', x: 1400, y: 600 },
      ],
      scatter: { bush: [4, 7], stump: [2, 4] },
      spawnMarkers: [
        { x: 850, y: 230 }, { x: 850, y: 920 }, { x: 330, y: 575 },
        { x: 1370, y: 575 }, { x: 600, y: 880 }, { x: 1150, y: 280 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.6, nextAt: 0.25, maxT: 55, spawns: [], elites: 0, drip: null, ref: 'ring_of_the_hare' },
        { delay: 1.2, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_mailroute: {
      id: 'a1_c_mailroute', name: 'THE MAIL ROUTE', type: 'combat', acts: [1],
      size: { w: 1800, h: 1200 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.72 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.35 },
      solids: [
        { x: 420, y: 330, w: 110, h: 110, spr: 'slab' },
        { x: 820, y: 330, w: 110, h: 110, spr: 'slab' },
        { x: 1220, y: 330, w: 110, h: 110, spr: 'slab' },
        { x: 620, y: 700, w: 110, h: 110, spr: 'slab' },
        { x: 1020, y: 700, w: 110, h: 110, spr: 'slab' },
      ],
      props: [
        { id: 'mailbox', x: 280, y: 600 },
        { id: 'mailbox', x: 1520, y: 600 },
        { id: 'birdhouse', x: 900, y: 200 },
        { id: 'crate', x: 1600, y: 1000 },
        { id: 'basket', x: 220, y: 1000 },
        { id: 'bush', x: 1650, y: 260 },
        { id: 'stump', x: 180, y: 250 },
        { id: 'barrel', x: 940, y: 1030 },
      ],
      scatter: { bush: [3, 6], birdhouse: [1, 2] },
      spawnMarkers: [
        { x: 250, y: 300 }, { x: 1550, y: 300 }, { x: 250, y: 900 },
        { x: 1550, y: 900 }, { x: 900, y: 600 }, { x: 900, y: 1100 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'edge' }, { id: 'auto', n: 8, mode: 'door' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 22, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_bramblecut: {
      id: 'a1_c_bramblecut', name: 'THE BRAMBLE CUT', type: 'combat', acts: [1],
      size: { w: 1600, h: 1100 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }],
      entry: { side: 'n', t: 0.45 },
      solids: [
        { x: 300, y: 380, w: 220, h: 60, spr: 'log' },
        { x: 760, y: 280, w: 60, h: 200, spr: 'wall' },
        { x: 1080, y: 520, w: 160, h: 70, spr: 'log' },
        { x: 520, y: 700, w: 180, h: 64, spr: 'log' },
      ],
      props: [
        { id: 'bush', x: 200, y: 220 },
        { id: 'bush', x: 1400, y: 250 },
        { id: 'bush', x: 240, y: 950 },
        { id: 'stump', x: 900, y: 900 },
        { id: 'crate', x: 1420, y: 900 },
        { id: 'basket', x: 1300, y: 200 },
        { id: 'logpile', x: 640, y: 1000 },
        { id: 'urn', x: 1450, y: 560 },
        { id: 'barrel', x: 160, y: 640 },
      ],
      scatter: { bush: [5, 9], stump: [2, 4] },
      spawnMarkers: [
        { x: 260, y: 260 }, { x: 1340, y: 260 }, { x: 260, y: 860 },
        { x: 1340, y: 860 }, { x: 800, y: 1000 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 20, mode: 'ring', r: 380 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // -- act 1 added variety --
    a1_c_boulderrun: {
      id: 'a1_c_boulderrun', name: 'BOULDER RUN', type: 'combat', acts: [1],
      size: { w: 1900, h: 1250 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.6 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 300, y: 820, w: 220, h: 70, spr: 'log' },
        { x: 1460, y: 240, w: 220, h: 70, spr: 'log' },
        { x: 840, y: 520, w: 150, h: 150, spr: 'brock' },
      ],
      props: [
        { id: 'boulder', x: 350, y: 250 },
        { id: 'boulder', x: 700, y: 430 },
        { id: 'boulder', x: 1050, y: 610 },
        { id: 'boulder', x: 1400, y: 790 },
        { id: 'boulder', x: 1650, y: 970 },
        { id: 'bush', x: 180, y: 1080 },
        { id: 'stump', x: 1780, y: 1120 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 260, y: 260 }, { x: 1780, y: 300 }, { x: 260, y: 1030 },
        { x: 1700, y: 1050 }, { x: 950, y: 300 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_mailboxlane: {
      id: 'a1_c_mailboxlane', name: 'THE MAILBOX LANE', type: 'combat', acts: [1],
      size: { w: 2000, h: 1100 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 420, y: 260, w: 220, h: 70, spr: 'wall' },
        { x: 420, y: 770, w: 220, h: 70, spr: 'wall' },
        { x: 1100, y: 260, w: 220, h: 70, spr: 'wall' },
        { x: 1100, y: 770, w: 220, h: 70, spr: 'wall' },
      ],
      props: [
        { id: 'mailbox', x: 250, y: 550 },
        { id: 'mailbox', x: 760, y: 550 },
        { id: 'mailbox', x: 1260, y: 550 },
        { id: 'mailbox', x: 1750, y: 550 },
        { id: 'crate', x: 250, y: 950 },
        { id: 'basket', x: 1750, y: 150 },
      ],
      scatter: { mailbox: [1, 3] },
      spawnMarkers: [
        { x: 1900, y: 330 }, { x: 1900, y: 770 }, { x: 1000, y: 180 },
        { x: 250, y: 250 }, { x: 250, y: 850 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 55, spawns: [], elites: 0, drip: null, ref: 'foxfire_hunt' },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 30, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_stumphenge: {
      id: 'a1_c_stumphenge', name: 'STUMP HENGE', type: 'combat', acts: [1],
      size: { w: 1700, h: 1150 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 1130, y: 350, w: 120, h: 120, spr: 'brock' },
        { x: 1130, y: 780, w: 120, h: 120, spr: 'brock' },
        { x: 460, y: 780, w: 120, h: 120, spr: 'brock' },
        { x: 460, y: 350, w: 120, h: 120, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 850, y: 300 },
        { id: 'stump', x: 850, y: 850 },
        { id: 'stump', x: 300, y: 575 },
        { id: 'stump', x: 1400, y: 575 },
        { id: 'urn', x: 850, y: 575 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 850, y: 230 }, { x: 850, y: 920 }, { x: 250, y: 575 },
        { x: 1450, y: 575 }, { x: 850, y: 575 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 22, mode: 'ring', r: 380 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // ------------------------------ act 2 ------------------------------
    a2_c_sluicegate: {
      id: 'a2_c_sluicegate', name: 'THE SLUICE GATE', type: 'combat', acts: [2],
      size: { w: 1700, h: 1150 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 400, y: 320, w: 100, h: 100, spr: 'slab' },
        { x: 760, y: 320, w: 100, h: 100, spr: 'slab' },
        { x: 1120, y: 320, w: 100, h: 100, spr: 'slab' },
        { x: 580, y: 660, w: 100, h: 100, spr: 'slab' },
        { x: 940, y: 660, w: 100, h: 100, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 260, y: 560 },
        { id: 'barrel', x: 1440, y: 560 },
        { id: 'crate', x: 300, y: 980 },
        { id: 'logpile', x: 1400, y: 980 },
        { id: 'urn', x: 850, y: 220 },
        { id: 'basket', x: 240, y: 240 },
        { id: 'bush', x: 1460, y: 240 },
        { id: 'boulder', x: 850, y: 1000 },
      ],
      scatter: { bush: [3, 6], barrel: [1, 3] },
      spawnMarkers: [
        { x: 250, y: 520 }, { x: 1450, y: 520 }, { x: 850, y: 240 },
        { x: 850, y: 1020 }, { x: 400, y: 980 }, { x: 1300, y: 980 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 850, y: 575 }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 18, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_drownedmess: {
      id: 'a2_c_drownedmess', name: 'THE DROWNED MESS', type: 'combat', acts: [2],
      size: { w: 1900, h: 1250 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.45 },
      solids: [
        { x: 360, y: 360, w: 240, h: 70, spr: 'log' },
        { x: 900, y: 300, w: 70, h: 220, spr: 'wall' },
        { x: 1260, y: 600, w: 200, h: 80, spr: 'log' },
        { x: 520, y: 780, w: 220, h: 70, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 240, y: 240 },
        { id: 'barrel', x: 1660, y: 240 },
        { id: 'crate', x: 240, y: 1000 },
        { id: 'crate', x: 1660, y: 1000 },
        { id: 'logpile', x: 1000, y: 1100 },
        { id: 'basket', x: 1600, y: 560 },
        { id: 'urn', x: 300, y: 620 },
        { id: 'bush', x: 1100, y: 220 },
        { id: 'boulder', x: 1050, y: 880 },
      ],
      scatter: { bush: [4, 7], urn: [1, 3] },
      spawnMarkers: [
        { x: 260, y: 260 }, { x: 1640, y: 260 }, { x: 260, y: 1000 },
        { x: 1640, y: 1000 }, { x: 950, y: 1120 }, { x: 950, y: 200 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'ring', r: 420 }, { id: 'auto', n: 4, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 14, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_cattailrun: {
      id: 'a2_c_cattailrun', name: 'CATTAIL RUN', type: 'combat', acts: [2],
      size: { w: 1800, h: 1200 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.45 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 520, y: 420, w: 150, h: 90, spr: 'log' },
        { x: 980, y: 380, w: 130, h: 130, spr: 'brock' },
        { x: 760, y: 760, w: 180, h: 70, spr: 'log' },
      ],
      props: [
        { id: 'bush', x: 400, y: 300 },
        { id: 'bush', x: 1400, y: 300 },
        { id: 'bush', x: 400, y: 900 },
        { id: 'bush', x: 1400, y: 900 },
        { id: 'urn', x: 900, y: 240 },
        { id: 'basket', x: 300, y: 600 },
        { id: 'crate', x: 1500, y: 600 },
        { id: 'logpile', x: 900, y: 1050 },
      ],
      scatter: { bush: [5, 9], stump: [1, 3] },
      spawnMarkers: [
        { x: 900, y: 260 }, { x: 900, y: 1000 }, { x: 340, y: 600 },
        { x: 1460, y: 600 }, { x: 600, y: 1000 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 55, spawns: [], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: 'dam_break' },
        { delay: 1.2, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 26, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_boathouse: {
      id: 'a2_c_boathouse', name: 'THE BOATHOUSE', type: 'combat', acts: [2],
      size: { w: 2000, h: 1300 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.4 }, { side: 'w', t: 0.4 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 420, y: 360, w: 120, h: 120, spr: 'wall' },
        { x: 840, y: 360, w: 120, h: 120, spr: 'wall' },
        { x: 1260, y: 360, w: 120, h: 120, spr: 'wall' },
        { x: 620, y: 760, w: 120, h: 120, spr: 'wall' },
        { x: 1060, y: 760, w: 120, h: 120, spr: 'wall' },
      ],
      props: [
        { id: 'crate', x: 260, y: 260 },
        { id: 'crate', x: 1740, y: 260 },
        { id: 'barrel', x: 260, y: 1040 },
        { id: 'barrel', x: 1740, y: 1040 },
        { id: 'logpile', x: 1000, y: 1160 },
        { id: 'basket', x: 1600, y: 700 },
        { id: 'urn', x: 300, y: 660 },
        { id: 'mailbox', x: 1000, y: 220 },
        { id: 'bush', x: 1620, y: 1120 },
        { id: 'boulder', x: 400, y: 1140 },
      ],
      scatter: { barrel: [2, 5], crate: [2, 4] },
      spawnMarkers: [
        { x: 260, y: 300 }, { x: 1740, y: 300 }, { x: 260, y: 1000 },
        { x: 1740, y: 1000 }, { x: 1000, y: 640 }, { x: 1000, y: 1180 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 1000, y: 650 }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // -- act 2 added variety --
    a2_c_birdhousegrove: {
      id: 'a2_c_birdhousegrove', name: 'THE BIRDHOUSE GROVE', type: 'combat', acts: [2],
      size: { w: 1800, h: 1200 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 340, y: 380, w: 110, h: 110, spr: 'brock' },
        { x: 700, y: 280, w: 110, h: 110, spr: 'brock' },
        { x: 1060, y: 420, w: 110, h: 110, spr: 'brock' },
        { x: 1420, y: 300, w: 110, h: 110, spr: 'brock' },
        { x: 900, y: 760, w: 130, h: 130, spr: 'brock' },
      ],
      props: [
        { id: 'birdhouse', x: 200, y: 600 },
        { id: 'birdhouse', x: 600, y: 180 },
        { id: 'birdhouse', x: 1000, y: 600 },
        { id: 'birdhouse', x: 1400, y: 180 },
        { id: 'birdhouse', x: 1650, y: 700 },
        { id: 'bush', x: 850, y: 1000 },
        { id: 'stump', x: 250, y: 1000 },
      ],
      scatter: { birdhouse: [2, 4], bush: [2, 4] },
      spawnMarkers: [
        { x: 260, y: 280 }, { x: 1550, y: 280 }, { x: 260, y: 950 },
        { x: 1550, y: 950 }, { x: 900, y: 250 }, { x: 900, y: 1050 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.3, nextAt: 0, maxT: 60, spawns: [], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: 'chiropteran_choir' },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 6, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_killbowl: {
      id: 'a2_c_killbowl', name: 'THE KILL BOWL', type: 'combat', acts: [2],
      size: { w: 1700, h: 1150 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'w', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'e', t: 0.5 },
      solids: [
        { x: 300, y: 300, w: 160, h: 60, spr: 'log' },
        { x: 1240, y: 790, w: 160, h: 60, spr: 'log' },
      ],
      props: [
        { id: 'boulder', x: 850, y: 575 },
        { id: 'bush', x: 230, y: 900 },
        { id: 'bush', x: 1470, y: 250 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 850, y: 230 }, { x: 850, y: 920 }, { x: 250, y: 575 },
        { x: 1450, y: 575 }, { x: 600, y: 850 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 420 }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, spawns: [{ id: 'auto', n: 32, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // Survive showcase: doors are meant to stay shut until the clock, not the
    // kill count, says stop. js/room.js does not know 'survive' yet today:
    // it only special-cases 'clear' (wave pump) and 'objective' (loot rooms)
    // in _lockIn(), so an unrecognized lock like this one falls into the same
    // branch as 'none' and opens the doors immediately on lock-in. This room
    // is authored ahead of that runtime support: the waves below are a valid
    // fallback so the room still plays a normal fight today, and are ready
    // to run as drip pressure once the room runner picks up 'survive' and
    // def.surviveT for real.
    a2_c_pressurebog: {
      id: 'a2_c_pressurebog', name: 'THE PRESSURE BOG', type: 'combat', acts: [2],
      size: { w: 1800, h: 1150 }, shape: 'rect', lock: 'survive', surviveT: 45,
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 820, y: 230, w: 140, h: 220, spr: 'wall' },
        { x: 820, y: 700, w: 140, h: 220, spr: 'wall' },
        { x: 340, y: 800, w: 130, h: 130, spr: 'brock' },
      ],
      props: [
        { id: 'urn', x: 250, y: 300 },
        { id: 'urn', x: 1550, y: 300 },
        { id: 'barrel', x: 250, y: 900 },
        { id: 'barrel', x: 1550, y: 900 },
        { id: 'logpile', x: 900, y: 1080 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [
        { x: 260, y: 280 }, { x: 1540, y: 280 }, { x: 260, y: 920 },
        { x: 1540, y: 920 }, { x: 900, y: 180 }, { x: 900, y: 1000 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 20, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.4, nextAt: 0.25, maxT: 60, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // ------------------------------ act 3 ------------------------------
    a3_c_charline: {
      id: 'a3_c_charline', name: 'THE CHAR LINE', type: 'combat', acts: [3],
      size: { w: 1900, h: 1250 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 's', t: 0.55 }],
      entry: { side: 'w', t: 0.45 },
      solids: [
        { x: 360, y: 340, w: 230, h: 70, spr: 'log' },
        { x: 940, y: 340, w: 230, h: 70, spr: 'log' },
        { x: 1440, y: 560, w: 80, h: 220, spr: 'wall' },
        { x: 620, y: 760, w: 240, h: 70, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 260, y: 240 },
        { id: 'stump', x: 1660, y: 240 },
        { id: 'logpile', x: 300, y: 1040 },
        { id: 'logpile', x: 1600, y: 1040 },
        { id: 'bush', x: 1250, y: 220 },
        { id: 'urn', x: 1250, y: 1080 },
        { id: 'crate', x: 300, y: 620 },
        { id: 'basket', x: 1000, y: 1140 },
        { id: 'boulder', x: 1100, y: 620 },
      ],
      scatter: { stump: [3, 6], logpile: [1, 3] },
      spawnMarkers: [
        { x: 260, y: 620 }, { x: 1640, y: 620 }, { x: 950, y: 200 },
        { x: 950, y: 1120 }, { x: 600, y: 1080 }, { x: 1300, y: 1080 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 18, mode: 'ring', r: 440 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_emberfield: {
      id: 'a3_c_emberfield', name: 'THE EMBER FIELD', type: 'combat', acts: [3],
      size: { w: 2000, h: 1300 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.45 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 640, y: 480, w: 150, h: 150, spr: 'brock' },
        { x: 1120, y: 440, w: 150, h: 150, spr: 'brock' },
        { x: 880, y: 840, w: 200, h: 80, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 500, y: 320 },
        { id: 'stump', x: 1500, y: 320 },
        { id: 'logpile', x: 500, y: 980 },
        { id: 'logpile', x: 1500, y: 980 },
        { id: 'urn', x: 1000, y: 260 },
        { id: 'bush', x: 1000, y: 1120 },
        { id: 'crate', x: 360, y: 650 },
        { id: 'boulder', x: 1640, y: 650 },
      ],
      scatter: { stump: [3, 6], urn: [1, 3] },
      spawnMarkers: [
        { x: 1000, y: 300 }, { x: 1000, y: 1050 }, { x: 400, y: 650 },
        { x: 1600, y: 650 }, { x: 700, y: 1100 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, spawns: [], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: 'stampede' },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 30, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_snagstand: {
      id: 'a3_c_snagstand', name: 'THE SNAG STAND', type: 'combat', acts: [3],
      size: { w: 2100, h: 1400 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 420, y: 380, w: 120, h: 120, spr: 'wall' },
        { x: 900, y: 380, w: 120, h: 120, spr: 'wall' },
        { x: 1380, y: 380, w: 120, h: 120, spr: 'wall' },
        { x: 660, y: 820, w: 120, h: 120, spr: 'wall' },
        { x: 1140, y: 820, w: 120, h: 120, spr: 'wall' },
      ],
      props: [
        { id: 'stump', x: 280, y: 280 },
        { id: 'stump', x: 1820, y: 280 },
        { id: 'logpile', x: 280, y: 1120 },
        { id: 'logpile', x: 1820, y: 1120 },
        { id: 'urn', x: 1050, y: 240 },
        { id: 'crate', x: 1700, y: 700 },
        { id: 'basket', x: 340, y: 700 },
        { id: 'barrel', x: 1050, y: 1240 },
        { id: 'bush', x: 700, y: 1200 },
        { id: 'boulder', x: 1500, y: 1160 },
      ],
      scatter: { stump: [4, 8], bush: [2, 5] },
      spawnMarkers: [
        { x: 280, y: 660 }, { x: 1820, y: 660 }, { x: 1050, y: 280 },
        { x: 1050, y: 1180 }, { x: 560, y: 1180 }, { x: 1560, y: 1180 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 1050, y: 700 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_ashpit: {
      id: 'a3_c_ashpit', name: 'THE ASH PIT', type: 'combat', acts: [3],
      size: { w: 1900, h: 1300 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 'n', t: 0.5 },
      solids: [
        { x: 340, y: 400, w: 200, h: 80, spr: 'slab' },
        { x: 820, y: 320, w: 80, h: 240, spr: 'wall' },
        { x: 1240, y: 420, w: 200, h: 80, spr: 'slab' },
        { x: 700, y: 840, w: 220, h: 80, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 260, y: 260 },
        { id: 'stump', x: 1640, y: 260 },
        { id: 'logpile', x: 300, y: 1060 },
        { id: 'logpile', x: 1600, y: 1060 },
        { id: 'urn', x: 1100, y: 240 },
        { id: 'crate', x: 1620, y: 660 },
        { id: 'basket', x: 280, y: 680 },
        { id: 'barrel', x: 1100, y: 1140 },
        { id: 'boulder', x: 1450, y: 940 },
      ],
      scatter: { urn: [2, 5], stump: [2, 5] },
      spawnMarkers: [
        { x: 260, y: 620 }, { x: 1640, y: 620 }, { x: 1080, y: 220 },
        { x: 1080, y: 1120 }, { x: 560, y: 1120 }, { x: 1500, y: 1120 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 24, mode: 'edge' }, { id: 'auto', n: 4, mode: 'ring', r: 300 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- act 3 added variety --
    a3_c_twinkilns: {
      id: 'a3_c_twinkilns', name: 'THE TWIN KILNS', type: 'combat', acts: [3],
      size: { w: 2000, h: 1300 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 900, y: 240, w: 160, h: 240, spr: 'wall' },
        { x: 900, y: 760, w: 160, h: 240, spr: 'wall' },
        { x: 1500, y: 560, w: 130, h: 130, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 260, y: 280 },
        { id: 'stump', x: 1740, y: 280 },
        { id: 'logpile', x: 260, y: 1020 },
        { id: 'logpile', x: 1740, y: 1020 },
        { id: 'urn', x: 900, y: 1120 },
        { id: 'crate', x: 900, y: 180 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 260, y: 650 }, { x: 1740, y: 650 }, { x: 900, y: 200 },
        { x: 900, y: 1120 }, { x: 560, y: 1120 }, { x: 1300, y: 180 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_barricadealley: {
      id: 'a3_c_barricadealley', name: 'BARRICADE ALLEY', type: 'combat', acts: [3],
      size: { w: 1900, h: 1200 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 360, y: 400, w: 180, h: 70, spr: 'slab' },
        { x: 360, y: 730, w: 180, h: 70, spr: 'slab' },
        { x: 860, y: 400, w: 180, h: 70, spr: 'slab' },
        { x: 860, y: 730, w: 180, h: 70, spr: 'slab' },
        { x: 1360, y: 565, w: 180, h: 70, spr: 'slab' },
      ],
      props: [
        { id: 'crate', x: 600, y: 250 },
        { id: 'crate', x: 1100, y: 250 },
        { id: 'barrel', x: 600, y: 950 },
        { id: 'barrel', x: 1100, y: 950 },
        { id: 'logpile', x: 1700, y: 600 },
        { id: 'urn', x: 150, y: 600 },
      ],
      scatter: { crate: [1, 3], barrel: [1, 3] },
      spawnMarkers: [
        { x: 260, y: 300 }, { x: 1640, y: 300 }, { x: 260, y: 950 },
        { x: 1640, y: 950 }, { x: 900, y: 200 }, { x: 900, y: 1050 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 20, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 18, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_kilngrid: {
      id: 'a3_c_kilngrid', name: 'THE KILN GRID', type: 'combat', acts: [3],
      size: { w: 2100, h: 1400 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 500, y: 420, w: 120, h: 120, spr: 'slab' },
        { x: 900, y: 420, w: 120, h: 120, spr: 'slab' },
        { x: 1300, y: 420, w: 120, h: 120, spr: 'slab' },
        { x: 700, y: 840, w: 120, h: 120, spr: 'slab' },
        { x: 1100, y: 840, w: 120, h: 120, spr: 'slab' },
      ],
      props: [
        { id: 'crate', x: 250, y: 250 },
        { id: 'crate', x: 1850, y: 250 },
        { id: 'barrel', x: 250, y: 1150 },
        { id: 'barrel', x: 1850, y: 1150 },
        { id: 'stump', x: 1050, y: 1250 },
        { id: 'urn', x: 1050, y: 150 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 260, y: 700 }, { x: 1840, y: 700 }, { x: 1050, y: 230 },
        { x: 1050, y: 1250 }, { x: 600, y: 1250 }, { x: 1500, y: 230 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.4, maxT: 40, spawns: [{ id: 'auto', n: 8, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: 'the_squirrel_flood' },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  elite: {
    a1_e_stumpcourt: {
      id: 'a1_e_stumpcourt', name: 'THE STUMP COURT', type: 'elite', acts: [1],
      size: { w: 1700, h: 1150 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 640, y: 480, w: 160, h: 120, spr: 'brock' },
        { x: 1020, y: 380, w: 130, h: 130, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 420, y: 320 },
        { id: 'stump', x: 1280, y: 880 },
        { id: 'stump', x: 860, y: 900 },
        { id: 'urn', x: 400, y: 820 },
        { id: 'crate', x: 1300, y: 260 },
        { id: 'boulder', x: 880, y: 240 },
      ],
      scatter: { stump: [3, 6], bush: [2, 4] },
      spawnMarkers: [
        { x: 850, y: 250 }, { x: 850, y: 900 }, { x: 320, y: 575 }, { x: 1380, y: 575 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 1, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_e_spillway: {
      id: 'a2_e_spillway', name: 'THE SPILLWAY', type: 'elite', acts: [2],
      size: { w: 1800, h: 1250 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 420, y: 420, w: 200, h: 80, spr: 'wall' },
        { x: 1080, y: 420, w: 200, h: 80, spr: 'wall' },
        { x: 760, y: 800, w: 180, h: 90, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 280, y: 280 },
        { id: 'barrel', x: 1520, y: 280 },
        { id: 'urn', x: 280, y: 980 },
        { id: 'urn', x: 1520, y: 980 },
        { id: 'crate', x: 880, y: 240 },
        { id: 'logpile', x: 880, y: 1080 },
      ],
      scatter: { barrel: [2, 5], bush: [2, 4] },
      spawnMarkers: [
        { x: 280, y: 620 }, { x: 1520, y: 620 }, { x: 880, y: 260 }, { x: 880, y: 1100 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_e_kilnyard: {
      id: 'a3_e_kilnyard', name: 'THE KILN YARD', type: 'elite', acts: [3],
      size: { w: 2000, h: 1300 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 520, y: 460, w: 130, h: 130, spr: 'slab' },
        { x: 1280, y: 460, w: 130, h: 130, spr: 'slab' },
        { x: 520, y: 820, w: 130, h: 130, spr: 'slab' },
        { x: 1280, y: 820, w: 130, h: 130, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 960, y: 280 },
        { id: 'barrel', x: 960, y: 1040 },
        { id: 'urn', x: 300, y: 660 },
        { id: 'urn', x: 1700, y: 660 },
        { id: 'crate', x: 960, y: 660 },
        { id: 'boulder', x: 1700, y: 240 },
      ],
      scatter: { urn: [3, 6], logpile: [1, 3] },
      spawnMarkers: [
        { x: 960, y: 300 }, { x: 960, y: 1020 }, { x: 300, y: 660 }, { x: 1700, y: 660 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 80, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- one nastier elite per act: tight corridors that never seal a pocket --
    a1_e_thorncorridor: {
      id: 'a1_e_thorncorridor', name: 'THE THORN CORRIDOR', type: 'elite', acts: [1],
      size: { w: 1800, h: 1200 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 400, y: 380, w: 260, h: 70, spr: 'wall' },
        { x: 1000, y: 380, w: 260, h: 70, spr: 'wall' },
        { x: 700, y: 760, w: 260, h: 70, spr: 'wall' },
        { x: 1300, y: 760, w: 260, h: 70, spr: 'wall' },
      ],
      props: [
        { id: 'bush', x: 250, y: 250 },
        { id: 'bush', x: 1550, y: 950 },
        { id: 'stump', x: 900, y: 1080 },
        { id: 'urn', x: 250, y: 950 },
        { id: 'boulder', x: 1650, y: 250 },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 900, y: 250 }, { x: 900, y: 950 }, { x: 280, y: 600 }, { x: 1520, y: 600 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_e_causewaycut: {
      id: 'a2_e_causewaycut', name: 'THE CAUSEWAY CUT', type: 'elite', acts: [2],
      size: { w: 1900, h: 1250 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 380, y: 300, w: 70, h: 260, spr: 'wall' },
        { x: 380, y: 760, w: 70, h: 260, spr: 'wall' },
        { x: 1420, y: 300, w: 70, h: 260, spr: 'wall' },
        { x: 1420, y: 760, w: 70, h: 260, spr: 'wall' },
      ],
      props: [
        { id: 'crate', x: 900, y: 200 },
        { id: 'crate', x: 900, y: 1080 },
        { id: 'barrel', x: 200, y: 625 },
        { id: 'urn', x: 1700, y: 625 },
        { id: 'boulder', x: 900, y: 625 },
      ],
      scatter: { barrel: [2, 4] },
      spawnMarkers: [
        { x: 900, y: 250 }, { x: 900, y: 1030 }, { x: 250, y: 625 }, { x: 1650, y: 625 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_e_cindermaze: {
      id: 'a3_e_cindermaze', name: 'THE CINDER MAZE', type: 'elite', acts: [3],
      size: { w: 2000, h: 1300 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 400, y: 380, w: 130, h: 130, spr: 'slab' },
        { x: 760, y: 600, w: 130, h: 130, spr: 'slab' },
        { x: 1120, y: 380, w: 130, h: 130, spr: 'slab' },
        { x: 1480, y: 600, w: 130, h: 130, spr: 'slab' },
        { x: 900, y: 900, w: 130, h: 130, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 1750, y: 250 },
        { id: 'stump', x: 250, y: 1050 },
        { id: 'crate', x: 1750, y: 1050 },
        { id: 'urn', x: 250, y: 250 },
        { id: 'boulder', x: 1000, y: 1150 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 1000, y: 280 }, { x: 1000, y: 1150 }, { x: 280, y: 650 }, { x: 1720, y: 650 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 80, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  puzzle: {},

  lore: {
    a1_lo_signboard: {
      id: 'a1_lo_signboard', name: 'THE SIGNBOARD', type: 'lore', acts: [1],
      size: { w: 1200, h: 900 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 600, y: 300 },
        { id: 'stump', x: 420, y: 560 },
        { id: 'bush', x: 820, y: 560 },
        { id: 'urn', x: 300, y: 300 },
        { id: 'birdhouse', x: 900, y: 240 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_lo_gaugepost: {
      id: 'a2_lo_gaugepost', name: 'THE GAUGE POST', type: 'lore', acts: [2],
      size: { w: 1250, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 620, y: 320 },
        { id: 'stump', x: 440, y: 600 },
        { id: 'bush', x: 840, y: 600 },
        { id: 'urn', x: 320, y: 320 },
        { id: 'birdhouse', x: 940, y: 250 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_lo_burnplaque: {
      id: 'a3_lo_burnplaque', name: 'THE BURN PLAQUE', type: 'lore', acts: [3],
      size: { w: 1300, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 650, y: 320 },
        { id: 'stump', x: 460, y: 620 },
        { id: 'bush', x: 880, y: 620 },
        { id: 'urn', x: 340, y: 320 },
        { id: 'birdhouse', x: 980, y: 260 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- one extra lore stop per act: no enemies, warm dressing, one open
    // spot flagged with a spawnMarker for wherever the find lands --
    a1_lo_rangercache: {
      id: 'a1_lo_rangercache', name: 'THE RANGER CACHE', type: 'lore', acts: [1],
      size: { w: 1250, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 600, y: 300 },
        { id: 'basket', x: 420, y: 600 },
        { id: 'urn', x: 820, y: 600 },
        { id: 'stump', x: 300, y: 280 },
        { id: 'birdhouse', x: 950, y: 260 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [{ x: 640, y: 480 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_lo_driftwoodline: {
      id: 'a2_lo_driftwoodline', name: 'THE DRIFTWOOD LINE', type: 'lore', acts: [2],
      size: { w: 1300, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 620, y: 320 },
        { id: 'basket', x: 440, y: 620 },
        { id: 'urn', x: 840, y: 620 },
        { id: 'barrel', x: 320, y: 300 },
        { id: 'birdhouse', x: 960, y: 260 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [{ x: 660, y: 500 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_lo_cinderhearth: {
      id: 'a3_lo_cinderhearth', name: 'THE CINDER HEARTH', type: 'lore', acts: [3],
      size: { w: 1350, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 650, y: 330 },
        { id: 'basket', x: 460, y: 630 },
        { id: 'urn', x: 880, y: 630 },
        { id: 'stump', x: 340, y: 300 },
        { id: 'crate', x: 980, y: 270 },
      ],
      scatter: { stump: [2, 4] },
      spawnMarkers: [{ x: 680, y: 500 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  shop: {
    a1_s_quartermaster: {
      id: 'a1_s_quartermaster', name: 'THE QUARTERMASTER', type: 'shop', acts: [1],
      size: { w: 1200, h: 900 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 460, y: 380, w: 280, h: 70, spr: 'wall' }],
      props: [
        { id: 'crate', x: 220, y: 240 },
        { id: 'barrel', x: 300, y: 660 },
        { id: 'basket', x: 980, y: 260 },
        { id: 'urn', x: 960, y: 660 },
        { id: 'mailbox', x: 600, y: 180 },
        { id: 'crate', x: 880, y: 470 },
      ],
      scatter: { crate: [1, 3] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_s_ferrylanding: {
      id: 'a2_s_ferrylanding', name: 'THE FERRY LANDING', type: 'shop', acts: [2],
      size: { w: 1250, h: 900 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 480, y: 380, w: 290, h: 70, spr: 'wall' }],
      props: [
        { id: 'crate', x: 240, y: 260 },
        { id: 'barrel', x: 300, y: 680 },
        { id: 'basket', x: 1010, y: 280 },
        { id: 'urn', x: 1000, y: 680 },
        { id: 'mailbox', x: 620, y: 190 },
        { id: 'crate', x: 900, y: 470 },
      ],
      scatter: { barrel: [1, 3] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_s_saltbox: {
      id: 'a3_s_saltbox', name: 'THE SALT BOX', type: 'shop', acts: [3],
      size: { w: 1300, h: 950 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 500, y: 400, w: 300, h: 70, spr: 'wall' }],
      props: [
        { id: 'crate', x: 260, y: 280 },
        { id: 'barrel', x: 320, y: 700 },
        { id: 'basket', x: 1050, y: 300 },
        { id: 'urn', x: 1040, y: 700 },
        { id: 'mailbox', x: 650, y: 200 },
        { id: 'crate', x: 940, y: 480 },
      ],
      scatter: { urn: [1, 3] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  loot: {
    a1_l_cacheline: {
      id: 'a1_l_cacheline', name: 'THE CACHE LINE', type: 'loot', acts: [1],
      size: { w: 1150, h: 850 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 300, y: 300 },
        { id: 'crate', x: 560, y: 260 },
        { id: 'crate', x: 840, y: 320 },
        { id: 'barrel', x: 320, y: 600 },
        { id: 'basket', x: 600, y: 620 },
        { id: 'urn', x: 860, y: 600 },
        { id: 'logpile', x: 560, y: 430 },
      ],
      scatter: { crate: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_l_silthouse: {
      id: 'a2_l_silthouse', name: 'THE SILT HOUSE', type: 'loot', acts: [2],
      size: { w: 1200, h: 900 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 320, y: 300 },
        { id: 'crate', x: 600, y: 260 },
        { id: 'crate', x: 880, y: 320 },
        { id: 'barrel', x: 340, y: 620 },
        { id: 'basket', x: 620, y: 640 },
        { id: 'urn', x: 880, y: 620 },
        { id: 'logpile', x: 600, y: 450 },
      ],
      scatter: { barrel: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_l_slagcache: {
      id: 'a3_l_slagcache', name: 'THE SLAG CACHE', type: 'loot', acts: [3],
      size: { w: 1250, h: 950 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 340, y: 320 },
        { id: 'crate', x: 620, y: 280 },
        { id: 'crate', x: 900, y: 340 },
        { id: 'barrel', x: 360, y: 640 },
        { id: 'basket', x: 640, y: 660 },
        { id: 'urn', x: 900, y: 640 },
        { id: 'logpile', x: 620, y: 470 },
      ],
      scatter: { urn: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  rest: {
    a1_r_firepit: {
      id: 'a1_r_firepit', name: 'THE FIRE PIT', type: 'rest', acts: [1],
      size: { w: 1100, h: 850 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 420, y: 480 },
        { id: 'stump', x: 680, y: 480 },
        { id: 'stump', x: 550, y: 650 },
        { id: 'logpile', x: 550, y: 330 },
        { id: 'basket', x: 760, y: 300 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_r_dryrock: {
      id: 'a2_r_dryrock', name: 'DRY ROCK', type: 'rest', acts: [2],
      size: { w: 1150, h: 900 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 440, y: 500 },
        { id: 'stump', x: 700, y: 500 },
        { id: 'logpile', x: 570, y: 340 },
        { id: 'basket', x: 570, y: 680 },
        { id: 'urn', x: 820, y: 320 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_r_windbreak: {
      id: 'a3_r_windbreak', name: 'THE WINDBREAK', type: 'rest', acts: [3],
      size: { w: 1200, h: 900 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 460, y: 500 },
        { id: 'stump', x: 740, y: 500 },
        { id: 'logpile', x: 600, y: 340 },
        { id: 'basket', x: 600, y: 680 },
        { id: 'urn', x: 860, y: 330 },
      ],
      scatter: { stump: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  miniboss: {},

  boss: {
    a1_b_warren: {
      id: 'a1_b_warren', name: 'THE WARREN', type: 'boss', acts: [1],
      size: { w: 1700, h: 1200 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 520, y: 520, w: 120, h: 120, spr: 'brock' },
        { x: 1060, y: 560, w: 120, h: 120, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 360, y: 300 },
        { id: 'stump', x: 1360, y: 900 },
        { id: 'boulder', x: 880, y: 260 },
        { id: 'urn', x: 880, y: 960 },
      ],
      scatter: { bush: [2, 5] },
      // 4 corner mounds, well inside the walls, for the warren's burrows.
      spawnMarkers: [
        { x: 300, y: 300 }, { x: 1400, y: 300 }, { x: 300, y: 900 }, { x: 1400, y: 900 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_b_middenhall: {
      id: 'a2_b_middenhall', name: 'THE MIDDEN HALL', type: 'boss', acts: [2],
      size: { w: 1800, h: 1250 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 480, y: 420, w: 110, h: 110, spr: 'slab' },
        { x: 1210, y: 420, w: 110, h: 110, spr: 'slab' },
        { x: 480, y: 760, w: 110, h: 110, spr: 'slab' },
        { x: 1210, y: 760, w: 110, h: 110, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 900, y: 260 },
        { id: 'barrel', x: 900, y: 1000 },
        { id: 'urn', x: 280, y: 640 },
        { id: 'urn', x: 1520, y: 640 },
      ],
      scatter: { barrel: [2, 5] },
      // 6 markers spread around the hall for the tunnel mouths.
      spawnMarkers: [
        { x: 900, y: 260 }, { x: 1450, y: 420 }, { x: 1450, y: 830 },
        { x: 900, y: 1000 }, { x: 350, y: 830 }, { x: 350, y: 420 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_b_ashenring: {
      id: 'a3_b_ashenring', name: 'THE ASHEN RING', type: 'boss', acts: [3],
      size: { w: 1900, h: 1300 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 560, y: 560, w: 130, h: 130, spr: 'brock' },
        { x: 1180, y: 560, w: 130, h: 130, spr: 'brock' },
      ],
      props: [
        { id: 'urn', x: 950, y: 300 },
        { id: 'urn', x: 950, y: 1000 },
        { id: 'boulder', x: 400, y: 650 },
        { id: 'boulder', x: 1500, y: 650 },
        // 6 breakable stumps and crates preplaced for prop regrowth.
        { id: 'stump', x: 700, y: 450 },
        { id: 'stump', x: 1200, y: 450 },
        { id: 'crate', x: 700, y: 850 },
        { id: 'crate', x: 1200, y: 850 },
        { id: 'stump', x: 950, y: 500 },
        { id: 'crate', x: 950, y: 800 },
      ],
      scatter: { urn: [2, 5] },
      // 8 markers rimming the space for prop regrowth.
      spawnMarkers: [
        { x: 1450, y: 650 }, { x: 1304, y: 297 }, { x: 950, y: 150 }, { x: 597, y: 297 },
        { x: 450, y: 650 }, { x: 597, y: 1003 }, { x: 950, y: 1150 }, { x: 1304, y: 1003 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },

    // The last room of the run. Round, bare, no cover, nothing to hide behind.
    hollow: {
      id: 'hollow', name: 'THE HOLLOW', type: 'boss', acts: [3],
      size: { w: 1600, h: 1600 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [],
      scatter: {},
      // 6 markers evenly spread on a ring at 60% radius, for Old Nobody's
      // sign circles.
      spawnMarkers: [
        { x: 1280, y: 800 }, { x: 1040, y: 384 }, { x: 560, y: 384 },
        { x: 320, y: 800 }, { x: 560, y: 1216 }, { x: 1040, y: 1216 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 'hollow',
    },
  },

  secret: {},
};
