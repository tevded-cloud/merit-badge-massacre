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
//                 assertion pass: 2 to 5 per combat room, never closer than 130
//                 to any wall, never closer than 75 to each other, so they can
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
//
// ---------------------------------------------------------------------------
// Dressing (additive, consumed by the room ground baker in render.js)
// ---------------------------------------------------------------------------
// dressing   [entry, ...] optional per layout. Room-local coordinates, same
//            origin as solids and props. The renderer bakes these into the
//            ground once per room entry; nothing here has any gameplay effect.
//   { kind: 'path',  from: {x,y}, to: {x,y}, w? }   a worn trampled band
//   { kind: 'road',  from: {x,y}, to: {x,y}, w? }   dirt road with wheel ruts
//   { kind: 'ring',  x, y, r, w? }                  worn ritual circle
//   { kind: 'patch', x, y, r, role }                ground patch, role one of
//                     dirt | needle | moss | mud | ash | char | scree
//   { kind: 'pool',  x, y, rx, ry }                 standing water with banks
//   { kind: 'bowl',  x, y, r0, r1 }                 darkens from r0 out to r1
//   { kind: 'scree', x0, y0, x1, y1, w? }           cracked rubble band
//   { kind: 'burnband', x0, y0, x1, y1, w? }        charred strip with embers
//   { kind: 'cracks', x, y, r }                     radiating ground cracks
// Rooms without a dressing list still get the act's themed floor plus worn
// paths from the entry toward each door. A layout may also set corruption:
// 0 or 1; rooms near an act boss default to 1 (Mark red accents).
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
    spawns: [{ id: 'rabbit', n: 26, mode: 'ring', r: 291 }],
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
    spawns: [{ id: 'fox', n: 10, mode: 'ring', r: 267 }],
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
    spawns: [{ id: 'beaver', n: 18, mode: 'ring', r: 285 }],
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
      size: { w: 1000, h: 700 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.55 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.72 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 280, y: 220, w: 113, h: 40, spr: 'log' },
        { x: 600, y: 373, w: 80, h: 80, spr: 'brock' },
        { x: 373, y: 480, w: 133, h: 37, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 220, y: 347 },
        { id: 'bush', x: 753, y: 200 },
        { id: 'crate', x: 787, y: 533 },
        { id: 'basket', x: 200, y: 560 },
        { id: 'mailbox', x: 507, y: 147 },
        { id: 'logpile', x: 673, y: 600 },
      ],
      scatter: { bush: [3, 6], stump: [1, 3] },
      spawnMarkers: [
        { x: 173, y: 167 }, { x: 827, y: 167 }, { x: 173, y: 533 },
        { x: 827, y: 533 }, { x: 500, y: 347 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 22, mode: 'edge' }, { id: 'auto', n: 6, mode: 'ring', r: 227 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 320, y: 240, r: 80, role: 'needle' },
        { kind: 'patch', x: 660, y: 410, r: 95, role: 'dirt' },
        { kind: 'patch', x: 430, y: 500, r: 70, role: 'moss' },
        { kind: 'cracks', x: 640, y: 413, r: 46 },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_kettlehollow: {
      id: 'a1_c_kettlehollow', name: 'KETTLE HOLLOW', type: 'combat', acts: [1],
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.4 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 381, y: 267, w: 89, h: 89, spr: 'brock' },
        { x: 635, y: 406, w: 95, h: 76, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 254, y: 190 },
        { id: 'stump', x: 826, y: 540 },
        { id: 'urn', x: 546, y: 190 },
        { id: 'bush', x: 267, y: 546 },
        { id: 'basket', x: 813, y: 216 },
        { id: 'crate', x: 191, y: 381 },
        { id: 'boulder', x: 889, y: 381 },
      ],
      scatter: { bush: [4, 7], stump: [2, 4] },
      spawnMarkers: [
        { x: 540, y: 146 }, { x: 540, y: 584 }, { x: 210, y: 365 },
        { x: 870, y: 365 }, { x: 381, y: 559 }, { x: 731, y: 178 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.6, nextAt: 0.25, maxT: 55, spawns: [], elites: 0, drip: null, ref: 'ring_of_the_hare' },
        { delay: 1.2, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 540, y: 365, r0: 170, r1: 470 },
        { kind: 'patch', x: 425, y: 311, r: 60, role: 'moss' },
        { kind: 'patch', x: 682, y: 444, r: 60, role: 'moss' },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_mailroute: {
      id: 'a1_c_mailroute', name: 'THE MAIL ROUTE', type: 'combat', acts: [1],
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.72 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.35 },
      solids: [
        { x: 264, y: 206, w: 69, h: 69, spr: 'slab' },
        { x: 515, y: 206, w: 69, h: 69, spr: 'slab' },
        { x: 766, y: 206, w: 69, h: 69, spr: 'slab' },
        { x: 389, y: 438, w: 69, h: 69, spr: 'slab' },
        { x: 640, y: 438, w: 69, h: 69, spr: 'slab' },
      ],
      props: [
        { id: 'mailbox', x: 176, y: 375 },
        { id: 'mailbox', x: 954, y: 375 },
        { id: 'birdhouse', x: 565, y: 125 },
        { id: 'crate', x: 1004, y: 625 },
        { id: 'basket', x: 138, y: 625 },
        { id: 'bush', x: 1036, y: 163 },
        { id: 'stump', x: 113, y: 156 },
        { id: 'barrel', x: 590, y: 644 },
      ],
      scatter: { bush: [3, 6], birdhouse: [1, 2] },
      spawnMarkers: [
        { x: 157, y: 188 }, { x: 973, y: 188 }, { x: 157, y: 563 },
        { x: 973, y: 563 }, { x: 565, y: 375 }, { x: 565, y: 688 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'edge' }, { id: 'auto', n: 8, mode: 'door' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 22, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'road', from: { x: 100, y: 375 }, to: { x: 1030, y: 375 }, w: 64 },
        { kind: 'patch', x: 176, y: 385, r: 44, role: 'dirt' },
        { kind: 'patch', x: 954, y: 385, r: 44, role: 'dirt' },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_bramblecut: {
      id: 'a1_c_bramblecut', name: 'THE BRAMBLE CUT', type: 'combat', acts: [1],
      size: { w: 1040, h: 720 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }],
      entry: { side: 'n', t: 0.45 },
      solids: [
        { x: 195, y: 249, w: 143, h: 39, spr: 'log' },
        { x: 494, y: 183, w: 39, h: 131, spr: 'wall' },
        { x: 702, y: 340, w: 104, h: 46, spr: 'log' },
        { x: 338, y: 458, w: 117, h: 42, spr: 'log' },
      ],
      props: [
        { id: 'bush', x: 130, y: 144 },
        { id: 'bush', x: 910, y: 164 },
        { id: 'bush', x: 156, y: 622 },
        { id: 'stump', x: 585, y: 589 },
        { id: 'crate', x: 923, y: 589 },
        { id: 'basket', x: 845, y: 131 },
        { id: 'logpile', x: 416, y: 633 },
        { id: 'urn', x: 943, y: 367 },
        { id: 'barrel', x: 104, y: 419 },
      ],
      scatter: { bush: [5, 9], stump: [2, 4] },
      spawnMarkers: [
        { x: 169, y: 170 }, { x: 871, y: 170 }, { x: 169, y: 563 },
        { x: 871, y: 563 }, { x: 520, y: 655 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 20, mode: 'ring', r: 248 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // -- act 1 added variety --
    a1_c_boulderrun: {
      id: 'a1_c_boulderrun', name: 'BOULDER RUN', type: 'combat', acts: [1],
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.6 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 185, y: 505, w: 135, h: 43, spr: 'log' },
        { x: 899, y: 148, w: 135, h: 43, spr: 'log' },
        { x: 517, y: 320, w: 92, h: 92, spr: 'brock' },
      ],
      props: [
        { id: 'boulder', x: 216, y: 154 },
        { id: 'boulder', x: 374, y: 265 },
        { id: 'boulder', x: 660, y: 376 },
        { id: 'boulder', x: 862, y: 487 },
        { id: 'boulder', x: 1016, y: 580 },
        { id: 'bush', x: 111, y: 665 },
        { id: 'stump', x: 1085, y: 685 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 160, y: 160 }, { x: 1096, y: 185 }, { x: 160, y: 634 },
        { x: 1047, y: 647 }, { x: 585, y: 185 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'scree', x0: 216, y0: 154, x1: 1016, y1: 580, w: 130 },
        { kind: 'cracks', x: 374, y: 265, r: 52 },
        { kind: 'cracks', x: 660, y: 376, r: 52 },
        { kind: 'cracks', x: 862, y: 487, r: 52 },
        { kind: 'patch', x: 216, y: 154, r: 60, role: 'scree' },
        { kind: 'patch', x: 1016, y: 580, r: 60, role: 'scree' },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_mailboxlane: {
      id: 'a1_c_mailboxlane', name: 'THE MAILBOX LANE', type: 'combat', acts: [1],
      size: { w: 1210, h: 700 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 254, y: 165, w: 133, h: 45, spr: 'wall' },
        { x: 254, y: 490, w: 133, h: 45, spr: 'wall' },
        { x: 666, y: 165, w: 133, h: 45, spr: 'wall' },
        { x: 666, y: 490, w: 133, h: 45, spr: 'wall' },
      ],
      props: [
        { id: 'mailbox', x: 151, y: 350 },
        { id: 'mailbox', x: 460, y: 350 },
        { id: 'mailbox', x: 762, y: 350 },
        { id: 'mailbox', x: 1059, y: 350 },
        { id: 'crate', x: 151, y: 605 },
        { id: 'basket', x: 1059, y: 95 },
      ],
      scatter: { mailbox: [1, 3] },
      spawnMarkers: [
        { x: 1150, y: 210 }, { x: 1150, y: 490 }, { x: 605, y: 115 },
        { x: 151, y: 159 }, { x: 151, y: 541 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 55, spawns: [], elites: 0, drip: null, ref: 'foxfire_hunt' },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 30, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'road', from: { x: 50, y: 350 }, to: { x: 1160, y: 350 }, w: 74 },
        { kind: 'patch', x: 151, y: 360, r: 46, role: 'dirt' },
        { kind: 'patch', x: 1059, y: 360, r: 46, role: 'dirt' },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_stumphenge: {
      id: 'a1_c_stumphenge', name: 'STUMP HENGE', type: 'combat', acts: [1],
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 718, y: 222, w: 76, h: 76, spr: 'brock' },
        { x: 718, y: 495, w: 76, h: 76, spr: 'brock' },
        { x: 292, y: 495, w: 76, h: 76, spr: 'brock' },
        { x: 292, y: 222, w: 76, h: 76, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 540, y: 190 },
        { id: 'stump', x: 540, y: 540 },
        { id: 'stump', x: 191, y: 365 },
        { id: 'stump', x: 889, y: 365 },
        { id: 'urn', x: 540, y: 365 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 540, y: 146 }, { x: 540, y: 584 }, { x: 159, y: 365 },
        { x: 921, y: 365 }, { x: 540, y: 365 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 22, mode: 'ring', r: 241 }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'marker' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'ring', x: 540, y: 365, r: 178, w: 34 },
        { kind: 'patch', x: 540, y: 190, r: 42, role: 'dirt' },
        { kind: 'patch', x: 540, y: 540, r: 42, role: 'dirt' },
        { kind: 'patch', x: 191, y: 365, r: 42, role: 'dirt' },
        { kind: 'patch', x: 889, y: 365, r: 42, role: 'dirt' },
        { kind: 'patch', x: 540, y: 365, r: 54, role: 'moss' },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // ------------------------------ act 2 ------------------------------
    a2_c_sluicegate: {
      id: 'a2_c_sluicegate', name: 'THE SLUICE GATE', type: 'combat', acts: [2],
      size: { w: 1080, h: 730 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 254, y: 203, w: 64, h: 63, spr: 'slab' },
        { x: 483, y: 203, w: 64, h: 63, spr: 'slab' },
        { x: 712, y: 203, w: 64, h: 63, spr: 'slab' },
        { x: 368, y: 419, w: 64, h: 63, spr: 'slab' },
        { x: 597, y: 419, w: 64, h: 63, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 165, y: 355 },
        { id: 'barrel', x: 915, y: 355 },
        { id: 'crate', x: 191, y: 622 },
        { id: 'logpile', x: 889, y: 622 },
        { id: 'urn', x: 540, y: 92 },
        { id: 'basket', x: 152, y: 152 },
        { id: 'bush', x: 928, y: 152 },
        { id: 'boulder', x: 540, y: 633 },
      ],
      scatter: { bush: [3, 6], barrel: [1, 3] },
      spawnMarkers: [
        { x: 159, y: 330 }, { x: 921, y: 330 }, { x: 540, y: 152 },
        { x: 540, y: 647 }, { x: 254, y: 622 }, { x: 826, y: 622 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 540, y: 365 }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 18, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 300, y: 350, rx: 120, ry: 36 },
        { kind: 'pool', x: 540, y: 365, rx: 130, ry: 40 },
        { kind: 'pool', x: 790, y: 350, rx: 120, ry: 36 },
        { kind: 'patch', x: 540, y: 510, r: 90, role: 'mud' },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_drownedmess: {
      id: 'a2_c_drownedmess', name: 'THE DROWNED MESS', type: 'combat', acts: [2],
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.45 },
      solids: [
        { x: 222, y: 222, w: 148, h: 43, spr: 'log' },
        { x: 554, y: 185, w: 43, h: 136, spr: 'wall' },
        { x: 776, y: 370, w: 123, h: 49, spr: 'log' },
        { x: 320, y: 480, w: 135, h: 43, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 148, y: 118 },
        { id: 'barrel', x: 1022, y: 148 },
        { id: 'crate', x: 148, y: 616 },
        { id: 'crate', x: 1022, y: 616 },
        { id: 'logpile', x: 616, y: 678 },
        { id: 'basket', x: 985, y: 345 },
        { id: 'urn', x: 185, y: 382 },
        { id: 'bush', x: 677, y: 136 },
        { id: 'boulder', x: 647, y: 542 },
      ],
      scatter: { bush: [4, 7], urn: [1, 3] },
      spawnMarkers: [
        { x: 160, y: 160 }, { x: 1010, y: 160 }, { x: 160, y: 616 },
        { x: 1010, y: 616 }, { x: 585, y: 690 }, { x: 585, y: 123 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'ring', r: 259 }, { id: 'auto', n: 4, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 14, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 360, y: 320, rx: 90, ry: 40 },
        { kind: 'pool', x: 810, y: 520, rx: 100, ry: 46 },
        { kind: 'pool', x: 585, y: 660, rx: 75, ry: 32 },
        { kind: 'patch', x: 585, y: 400, r: 110, role: 'mud' },
        { kind: 'patch', x: 260, y: 560, r: 70, role: 'mud' },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_cattailrun: {
      id: 'a2_c_cattailrun', name: 'CATTAIL RUN', type: 'combat', acts: [2],
      size: { w: 1130, h: 750 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.45 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 326, y: 263, w: 94, h: 56, spr: 'log' },
        { x: 615, y: 238, w: 82, h: 81, spr: 'brock' },
        { x: 477, y: 475, w: 113, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'bush', x: 251, y: 188 },
        { id: 'bush', x: 879, y: 188 },
        { id: 'bush', x: 251, y: 563 },
        { id: 'bush', x: 879, y: 563 },
        { id: 'urn', x: 565, y: 117 },
        { id: 'basket', x: 188, y: 375 },
        { id: 'crate', x: 942, y: 375 },
        { id: 'logpile', x: 565, y: 656 },
      ],
      scatter: { bush: [5, 9], stump: [1, 3] },
      spawnMarkers: [
        { x: 565, y: 163 }, { x: 565, y: 625 }, { x: 213, y: 375 },
        { x: 917, y: 375 }, { x: 377, y: 625 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 55, spawns: [], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: 'dam_break' },
        { delay: 1.2, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 26, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 565, y: 570, rx: 210, ry: 74 },
        { kind: 'pool', x: 300, y: 620, rx: 90, ry: 38 },
        { kind: 'patch', x: 565, y: 430, r: 90, role: 'mud' },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a2_c_boathouse: {
      id: 'a2_c_boathouse', name: 'THE BOATHOUSE', type: 'combat', acts: [2],
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.4 }, { side: 'w', t: 0.4 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 254, y: 219, w: 73, h: 73, spr: 'wall' },
        { x: 508, y: 219, w: 73, h: 73, spr: 'wall' },
        { x: 762, y: 219, w: 73, h: 73, spr: 'wall' },
        { x: 375, y: 462, w: 73, h: 73, spr: 'wall' },
        { x: 641, y: 462, w: 73, h: 73, spr: 'wall' },
      ],
      props: [
        { id: 'crate', x: 136, y: 158 },
        { id: 'crate', x: 1053, y: 158 },
        { id: 'barrel', x: 137, y: 632 },
        { id: 'barrel', x: 1053, y: 632 },
        { id: 'logpile', x: 605, y: 703 },
        { id: 'basket', x: 968, y: 425 },
        { id: 'urn', x: 182, y: 401 },
        { id: 'mailbox', x: 605, y: 134 },
        { id: 'bush', x: 980, y: 681 },
        { id: 'boulder', x: 242, y: 693 },
      ],
      scatter: { barrel: [2, 5], crate: [2, 4] },
      spawnMarkers: [
        { x: 157, y: 182 }, { x: 1053, y: 182 }, { x: 157, y: 608 },
        { x: 1053, y: 608 }, { x: 605, y: 389 }, { x: 605, y: 717 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 605, y: 395 }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 270, y: 730, rx: 150, ry: 36 },
        { kind: 'pool', x: 940, y: 730, rx: 150, ry: 36 },
        { kind: 'patch', x: 605, y: 660, r: 90, role: 'mud' },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // -- act 2 added variety --
    a2_c_birdhousegrove: {
      id: 'a2_c_birdhousegrove', name: 'THE BIRDHOUSE GROVE', type: 'combat', acts: [2],
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 213, y: 238, w: 69, h: 69, spr: 'brock' },
        { x: 439, y: 175, w: 69, h: 69, spr: 'brock' },
        { x: 665, y: 263, w: 69, h: 69, spr: 'brock' },
        { x: 891, y: 188, w: 69, h: 69, spr: 'brock' },
        { x: 565, y: 475, w: 82, h: 81, spr: 'brock' },
      ],
      props: [
        { id: 'birdhouse', x: 126, y: 375 },
        { id: 'birdhouse', x: 377, y: 113 },
        { id: 'birdhouse', x: 628, y: 375 },
        { id: 'birdhouse', x: 879, y: 113 },
        { id: 'birdhouse', x: 1036, y: 438 },
        { id: 'bush', x: 534, y: 625 },
        { id: 'stump', x: 157, y: 625 },
      ],
      scatter: { birdhouse: [2, 4], bush: [2, 4] },
      spawnMarkers: [
        { x: 163, y: 175 }, { x: 973, y: 175 }, { x: 163, y: 594 },
        { x: 973, y: 594 }, { x: 565, y: 156 }, { x: 565, y: 656 },
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
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'w', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'e', t: 0.5 },
      solids: [
        { x: 191, y: 190, w: 102, h: 38, spr: 'log' },
        { x: 788, y: 501, w: 102, h: 38, spr: 'log' },
      ],
      props: [
        { id: 'boulder', x: 540, y: 365 },
        { id: 'bush', x: 146, y: 571 },
        { id: 'bush', x: 934, y: 159 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 540, y: 146 }, { x: 540, y: 584 }, { x: 159, y: 365 },
        { x: 921, y: 365 }, { x: 381, y: 540 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 267 }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, spawns: [{ id: 'auto', n: 32, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 540, y: 365, r0: 150, r1: 460 },
        { kind: 'patch', x: 540, y: 365, r: 96, role: 'mud' },
        { kind: 'ring', x: 540, y: 365, r: 210, w: 26 },
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
      size: { w: 1130, h: 720 }, shape: 'rect', lock: 'survive', surviveT: 45,
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 515, y: 144, w: 88, h: 138, spr: 'wall' },
        { x: 515, y: 438, w: 88, h: 138, spr: 'wall' },
        { x: 213, y: 501, w: 82, h: 81, spr: 'brock' },
      ],
      props: [
        { id: 'urn', x: 157, y: 188 },
        { id: 'urn', x: 973, y: 188 },
        { id: 'barrel', x: 157, y: 624 },
        { id: 'barrel', x: 973, y: 563 },
        { id: 'logpile', x: 565, y: 633 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [
        { x: 163, y: 175 }, { x: 967, y: 175 }, { x: 163, y: 576 },
        { x: 967, y: 576 }, { x: 565, y: 113 }, { x: 565, y: 626 },
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
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 's', t: 0.55 }],
      entry: { side: 'w', t: 0.45 },
      solids: [
        { x: 222, y: 209, w: 142, h: 43, spr: 'log' },
        { x: 579, y: 209, w: 142, h: 43, spr: 'log' },
        { x: 887, y: 345, w: 49, h: 136, spr: 'wall' },
        { x: 382, y: 468, w: 148, h: 43, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 160, y: 103 },
        { id: 'stump', x: 1022, y: 148 },
        { id: 'logpile', x: 185, y: 641 },
        { id: 'logpile', x: 985, y: 641 },
        { id: 'bush', x: 770, y: 136 },
        { id: 'urn', x: 770, y: 665 },
        { id: 'crate', x: 185, y: 382 },
        { id: 'basket', x: 616, y: 702 },
        { id: 'boulder', x: 677, y: 382 },
      ],
      scatter: { stump: [3, 6], logpile: [1, 3] },
      spawnMarkers: [
        { x: 160, y: 382 }, { x: 1010, y: 382 }, { x: 585, y: 123 },
        { x: 585, y: 690 }, { x: 369, y: 665 }, { x: 801, y: 665 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 18, mode: 'ring', r: 271 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 160, y0: 231, x1: 1010, y1: 490, w: 120 },
        { kind: 'cracks', x: 650, y: 231, r: 56 },
        { kind: 'cracks', x: 455, y: 490, r: 56 },
        { kind: 'patch', x: 293, y: 231, r: 70, role: 'char' },
        { kind: 'patch', x: 911, y: 368, r: 70, role: 'ash' },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_emberfield: {
      id: 'a3_c_emberfield', name: 'THE EMBER FIELD', type: 'combat', acts: [3],
      size: { w: 1210, h: 790 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.45 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 387, y: 292, w: 91, h: 91, spr: 'brock' },
        { x: 678, y: 267, w: 91, h: 91, spr: 'brock' },
        { x: 532, y: 510, w: 121, h: 49, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 303, y: 166 },
        { id: 'stump', x: 908, y: 194 },
        { id: 'logpile', x: 303, y: 596 },
        { id: 'logpile', x: 908, y: 596 },
        { id: 'urn', x: 605, y: 143 },
        { id: 'bush', x: 605, y: 681 },
        { id: 'crate', x: 218, y: 395 },
        { id: 'boulder', x: 992, y: 395 },
      ],
      scatter: { stump: [3, 6], urn: [1, 3] },
      spawnMarkers: [
        { x: 605, y: 182 }, { x: 605, y: 638 }, { x: 242, y: 395 },
        { x: 968, y: 395 }, { x: 424, y: 668 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, spawns: [], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: 'stampede' },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 30, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 432, y: 337, r: 90, role: 'char' },
        { kind: 'patch', x: 723, y: 312, r: 90, role: 'char' },
        { kind: 'patch', x: 592, y: 534, r: 80, role: 'ash' },
        { kind: 'cracks', x: 432, y: 337, r: 60 },
        { kind: 'cracks', x: 723, y: 312, r: 60 },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_snagstand: {
      id: 'a3_c_snagstand', name: 'THE SNAG STAND', type: 'combat', acts: [3],
      size: { w: 1250, h: 830 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 250, y: 225, w: 71, h: 71, spr: 'wall' },
        { x: 536, y: 225, w: 71, h: 71, spr: 'wall' },
        { x: 821, y: 225, w: 71, h: 71, spr: 'wall' },
        { x: 393, y: 486, w: 71, h: 71, spr: 'wall' },
        { x: 679, y: 486, w: 71, h: 71, spr: 'wall' },
      ],
      props: [
        { id: 'stump', x: 130, y: 166 },
        { id: 'stump', x: 1083, y: 166 },
        { id: 'logpile', x: 167, y: 664 },
        { id: 'logpile', x: 1083, y: 664 },
        { id: 'urn', x: 641, y: 142 },
        { id: 'crate', x: 1012, y: 415 },
        { id: 'basket', x: 202, y: 415 },
        { id: 'barrel', x: 625, y: 735 },
        { id: 'bush', x: 417, y: 711 },
        { id: 'boulder', x: 893, y: 688 },
      ],
      scatter: { stump: [4, 8], bush: [2, 5] },
      spawnMarkers: [
        { x: 167, y: 391 }, { x: 1083, y: 391 }, { x: 625, y: 166 },
        { x: 625, y: 700 }, { x: 333, y: 700 }, { x: 929, y: 700 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 50, spawns: [{ id: 'auto', n: 18, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'edge' }, { id: 'auto', n: 4, mode: 'point', x: 625, y: 415 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 10, mode: 'marker' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_ashpit: {
      id: 'a3_c_ashpit', name: 'THE ASH PIT', type: 'combat', acts: [3],
      size: { w: 1170, h: 800 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 'n', t: 0.5 },
      solids: [
        { x: 209, y: 246, w: 123, h: 49, spr: 'slab' },
        { x: 505, y: 197, w: 49, h: 148, spr: 'wall' },
        { x: 764, y: 258, w: 123, h: 49, spr: 'slab' },
        { x: 431, y: 517, w: 135, h: 49, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 160, y: 137 },
        { id: 'stump', x: 1010, y: 160 },
        { id: 'logpile', x: 185, y: 652 },
        { id: 'logpile', x: 1001, y: 652 },
        { id: 'urn', x: 677, y: 148 },
        { id: 'crate', x: 998, y: 406 },
        { id: 'basket', x: 172, y: 418 },
        { id: 'barrel', x: 677, y: 702 },
        { id: 'boulder', x: 893, y: 578 },
      ],
      scatter: { urn: [2, 5], stump: [2, 5] },
      spawnMarkers: [
        { x: 160, y: 382 }, { x: 1010, y: 382 }, { x: 665, y: 135 },
        { x: 665, y: 689 }, { x: 345, y: 689 }, { x: 924, y: 689 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 24, mode: 'edge' }, { id: 'auto', n: 4, mode: 'ring', r: 185 }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 585, y: 400, r0: 130, r1: 500 },
        { kind: 'patch', x: 585, y: 400, r: 150, role: 'char' },
        { kind: 'cracks', x: 585, y: 400, r: 120 },
        { kind: 'patch', x: 330, y: 270, r: 70, role: 'ash' },
        { kind: 'patch', x: 826, y: 283, r: 70, role: 'ash' },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- act 3 added variety --
    a3_c_twinkilns: {
      id: 'a3_c_twinkilns', name: 'THE TWIN KILNS', type: 'combat', acts: [3],
      size: { w: 1210, h: 790 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 545, y: 146, w: 97, h: 146, spr: 'wall' },
        { x: 545, y: 462, w: 97, h: 146, spr: 'wall' },
        { x: 908, y: 340, w: 79, h: 79, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 157, y: 170 },
        { id: 'stump', x: 1053, y: 170 },
        { id: 'logpile', x: 157, y: 620 },
        { id: 'logpile', x: 1053, y: 620 },
        { id: 'urn', x: 545, y: 681 },
        { id: 'crate', x: 545, y: 109 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 157, y: 395 }, { x: 1053, y: 395 }, { x: 545, y: 122 },
        { x: 545, y: 681 }, { x: 339, y: 681 }, { x: 787, y: 109 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 16, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 593, y: 219, r: 130, role: 'char' },
        { kind: 'patch', x: 593, y: 535, r: 130, role: 'char' },
        { kind: 'burnband', x0: 593, y0: 250, x1: 593, y1: 510, w: 150 },
        { kind: 'cracks', x: 947, y: 379, r: 60 },
        { kind: 'patch', x: 947, y: 379, r: 80, role: 'ash' },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    a3_c_barricadealley: {
      id: 'a3_c_barricadealley', name: 'BARRICADE ALLEY', type: 'combat', acts: [3],
      size: { w: 1170, h: 740 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 222, y: 247, w: 111, h: 43, spr: 'slab' },
        { x: 222, y: 450, w: 111, h: 43, spr: 'slab' },
        { x: 530, y: 247, w: 111, h: 43, spr: 'slab' },
        { x: 530, y: 450, w: 111, h: 43, spr: 'slab' },
        { x: 837, y: 348, w: 111, h: 43, spr: 'slab' },
      ],
      props: [
        { id: 'crate', x: 369, y: 154 },
        { id: 'crate', x: 677, y: 154 },
        { id: 'barrel', x: 369, y: 586 },
        { id: 'barrel', x: 677, y: 586 },
        { id: 'logpile', x: 1047, y: 370 },
        { id: 'urn', x: 92, y: 370 },
      ],
      scatter: { crate: [1, 3], barrel: [1, 3] },
      spawnMarkers: [
        { x: 160, y: 185 }, { x: 1010, y: 185 }, { x: 160, y: 586 },
        { x: 1010, y: 586 }, { x: 554, y: 123 }, { x: 554, y: 648 },
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
      size: { w: 1250, h: 830 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 298, y: 249, w: 71, h: 71, spr: 'slab' },
        { x: 536, y: 249, w: 71, h: 71, spr: 'slab' },
        { x: 774, y: 249, w: 71, h: 71, spr: 'slab' },
        { x: 417, y: 498, w: 71, h: 71, spr: 'slab' },
        { x: 655, y: 498, w: 71, h: 71, spr: 'slab' },
      ],
      props: [
        { id: 'crate', x: 149, y: 148 },
        { id: 'crate', x: 1101, y: 148 },
        { id: 'barrel', x: 149, y: 682 },
        { id: 'barrel', x: 1101, y: 682 },
        { id: 'stump', x: 625, y: 741 },
        { id: 'urn', x: 625, y: 89 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 155, y: 415 }, { x: 1095, y: 415 }, { x: 625, y: 136 },
        { x: 625, y: 741 }, { x: 357, y: 741 }, { x: 893, y: 136 },
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
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 407, y: 305, w: 102, h: 76, spr: 'brock' },
        { x: 648, y: 241, w: 83, h: 83, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 267, y: 203 },
        { id: 'stump', x: 813, y: 559 },
        { id: 'stump', x: 546, y: 571 },
        { id: 'urn', x: 254, y: 521 },
        { id: 'crate', x: 826, y: 165 },
        { id: 'boulder', x: 559, y: 107 },
      ],
      scatter: { stump: [3, 6], bush: [2, 4] },
      spawnMarkers: [
        { x: 540, y: 159 }, { x: 540, y: 571 }, { x: 203, y: 365 }, { x: 877, y: 365 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 1, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_e_spillway: {
      id: 'a2_e_spillway', name: 'THE SPILLWAY', type: 'elite', acts: [2],
      size: { w: 1130, h: 780 }, shape: 'rect', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 264, y: 262, w: 126, h: 50, spr: 'wall' },
        { x: 678, y: 262, w: 126, h: 50, spr: 'wall' },
        { x: 477, y: 499, w: 113, h: 56, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 176, y: 156 },
        { id: 'barrel', x: 954, y: 175 },
        { id: 'urn', x: 176, y: 612 },
        { id: 'urn', x: 954, y: 612 },
        { id: 'crate', x: 552, y: 150 },
        { id: 'logpile', x: 552, y: 674 },
      ],
      scatter: { barrel: [2, 5], bush: [2, 4] },
      spawnMarkers: [
        { x: 176, y: 387 }, { x: 954, y: 387 }, { x: 552, y: 162 }, { x: 552, y: 686 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_e_kilnyard: {
      id: 'a3_e_kilnyard', name: 'THE KILN YARD', type: 'elite', acts: [3],
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 315, y: 280, w: 79, h: 79, spr: 'slab' },
        { x: 774, y: 280, w: 79, h: 79, spr: 'slab' },
        { x: 315, y: 498, w: 79, h: 79, spr: 'slab' },
        { x: 774, y: 498, w: 79, h: 79, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 581, y: 170 },
        { id: 'barrel', x: 581, y: 632 },
        { id: 'urn', x: 182, y: 401 },
        { id: 'urn', x: 1029, y: 401 },
        { id: 'crate', x: 581, y: 401 },
        { id: 'boulder', x: 1029, y: 146 },
      ],
      scatter: { urn: [3, 6], logpile: [1, 3] },
      spawnMarkers: [
        { x: 581, y: 182 }, { x: 581, y: 620 }, { x: 182, y: 401 }, { x: 1029, y: 401 },
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
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 251, y: 238, w: 163, h: 44, spr: 'wall' },
        { x: 628, y: 238, w: 163, h: 44, spr: 'wall' },
        { x: 439, y: 475, w: 163, h: 44, spr: 'wall' },
        { x: 816, y: 475, w: 163, h: 44, spr: 'wall' },
      ],
      props: [
        { id: 'bush', x: 157, y: 156 },
        { id: 'bush', x: 973, y: 594 },
        { id: 'stump', x: 565, y: 665 },
        { id: 'urn', x: 157, y: 594 },
        { id: 'boulder', x: 1032, y: 156 },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 565, y: 156 }, { x: 565, y: 594 }, { x: 176, y: 375 }, { x: 954, y: 375 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: null, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_e_causewaycut: {
      id: 'a2_e_causewaycut', name: 'THE CAUSEWAY CUT', type: 'elite', acts: [2],
      size: { w: 1170, h: 770 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 234, y: 185, w: 43, h: 160, spr: 'wall' },
        { x: 234, y: 468, w: 43, h: 160, spr: 'wall' },
        { x: 874, y: 185, w: 43, h: 160, spr: 'wall' },
        { x: 874, y: 468, w: 43, h: 160, spr: 'wall' },
      ],
      props: [
        { id: 'crate', x: 554, y: 123 },
        { id: 'crate', x: 554, y: 665 },
        { id: 'barrel', x: 123, y: 385 },
        { id: 'urn', x: 1047, y: 385 },
        { id: 'boulder', x: 554, y: 385 },
      ],
      scatter: { barrel: [2, 4] },
      spawnMarkers: [
        { x: 554, y: 154 }, { x: 554, y: 634 }, { x: 154, y: 385 }, { x: 1016, y: 385 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_e_cindermaze: {
      id: 'a3_e_cindermaze', name: 'THE CINDER MAZE', type: 'elite', acts: [3],
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 242, y: 231, w: 79, h: 79, spr: 'slab' },
        { x: 460, y: 365, w: 79, h: 79, spr: 'slab' },
        { x: 678, y: 231, w: 79, h: 79, spr: 'slab' },
        { x: 895, y: 365, w: 79, h: 79, spr: 'slab' },
        { x: 545, y: 547, w: 79, h: 79, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 1059, y: 152 },
        { id: 'stump', x: 151, y: 638 },
        { id: 'crate', x: 1059, y: 638 },
        { id: 'urn', x: 128, y: 152 },
        { id: 'boulder', x: 605, y: 693 },
      ],
      scatter: { stump: [2, 5] },
      spawnMarkers: [
        { x: 605, y: 170 }, { x: 605, y: 699 }, { x: 169, y: 395 }, { x: 1041, y: 395 },
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
      size: { w: 700, h: 520 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 350, y: 173 },
        { id: 'stump', x: 245, y: 324 },
        { id: 'bush', x: 478, y: 324 },
        { id: 'urn', x: 175, y: 173 },
        { id: 'birdhouse', x: 525, y: 139 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_lo_gaugepost: {
      id: 'a2_lo_gaugepost', name: 'THE GAUGE POST', type: 'lore', acts: [2],
      size: { w: 730, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 362, y: 185 },
        { id: 'stump', x: 257, y: 347 },
        { id: 'bush', x: 491, y: 347 },
        { id: 'urn', x: 187, y: 185 },
        { id: 'birdhouse', x: 549, y: 145 },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_lo_burnplaque: {
      id: 'a3_lo_burnplaque', name: 'THE BURN PLAQUE', type: 'lore', acts: [3],
      size: { w: 750, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'mailbox', x: 375, y: 185 },
        { id: 'stump', x: 265, y: 359 },
        { id: 'bush', x: 508, y: 359 },
        { id: 'urn', x: 196, y: 185 },
        { id: 'birdhouse', x: 565, y: 151 },
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
      size: { w: 730, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 350, y: 174 },
        { id: 'basket', x: 245, y: 347 },
        { id: 'urn', x: 479, y: 347 },
        { id: 'stump', x: 175, y: 162 },
        { id: 'birdhouse', x: 555, y: 151 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [{ x: 374, y: 278 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_lo_driftwoodline: {
      id: 'a2_lo_driftwoodline', name: 'THE DRIFTWOOD LINE', type: 'lore', acts: [2],
      size: { w: 750, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 358, y: 185 },
        { id: 'basket', x: 254, y: 359 },
        { id: 'urn', x: 485, y: 359 },
        { id: 'barrel', x: 185, y: 174 },
        { id: 'birdhouse', x: 554, y: 151 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [{ x: 381, y: 289 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_lo_cinderhearth: {
      id: 'a3_lo_cinderhearth', name: 'THE CINDER HEARTH', type: 'lore', acts: [3],
      size: { w: 780, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [],
      props: [
        { id: 'logpile', x: 376, y: 191 },
        { id: 'basket', x: 266, y: 365 },
        { id: 'urn', x: 508, y: 365 },
        { id: 'stump', x: 196, y: 174 },
        { id: 'crate', x: 566, y: 156 },
      ],
      scatter: { stump: [2, 4] },
      spawnMarkers: [{ x: 393, y: 289 }],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  shop: {
    a1_s_quartermaster: {
      id: 'a1_s_quartermaster', name: 'THE QUARTERMASTER', type: 'shop', acts: [1],
      size: { w: 700, h: 520 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 268, y: 220, w: 163, h: 40, spr: 'wall' }],
      props: [
        { id: 'crate', x: 128, y: 139 },
        { id: 'barrel', x: 175, y: 381 },
        { id: 'basket', x: 572, y: 150 },
        { id: 'urn', x: 560, y: 381 },
        { id: 'mailbox', x: 350, y: 104 },
        { id: 'crate', x: 513, y: 272 },
      ],
      scatter: { crate: [1, 3] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_s_ferrylanding: {
      id: 'a2_s_ferrylanding', name: 'THE FERRY LANDING', type: 'shop', acts: [2],
      size: { w: 730, h: 520 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 280, y: 220, w: 169, h: 40, spr: 'wall' }],
      props: [
        { id: 'crate', x: 140, y: 150 },
        { id: 'barrel', x: 175, y: 393 },
        { id: 'basket', x: 590, y: 162 },
        { id: 'urn', x: 584, y: 393 },
        { id: 'mailbox', x: 362, y: 110 },
        { id: 'crate', x: 526, y: 272 },
      ],
      scatter: { barrel: [1, 3] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_s_saltbox: {
      id: 'a3_s_saltbox', name: 'THE SALT BOX', type: 'shop', acts: [3],
      size: { w: 750, h: 550 }, shape: 'rect', lock: 'none',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [{ x: 288, y: 232, w: 173, h: 41, spr: 'wall' }],
      props: [
        { id: 'crate', x: 150, y: 162 },
        { id: 'barrel', x: 185, y: 405 },
        { id: 'basket', x: 606, y: 174 },
        { id: 'urn', x: 600, y: 405 },
        { id: 'mailbox', x: 375, y: 116 },
        { id: 'crate', x: 542, y: 278 },
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
      size: { w: 670, h: 490 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 175, y: 173 },
        { id: 'crate', x: 326, y: 150 },
        { id: 'crate', x: 489, y: 184 },
        { id: 'barrel', x: 186, y: 346 },
        { id: 'basket', x: 350, y: 357 },
        { id: 'urn', x: 501, y: 346 },
        { id: 'logpile', x: 326, y: 248 },
      ],
      scatter: { crate: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_l_silthouse: {
      id: 'a2_l_silthouse', name: 'THE SILT HOUSE', type: 'loot', acts: [2],
      size: { w: 700, h: 520 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 187, y: 173 },
        { id: 'crate', x: 350, y: 150 },
        { id: 'crate', x: 513, y: 185 },
        { id: 'barrel', x: 198, y: 358 },
        { id: 'basket', x: 362, y: 370 },
        { id: 'urn', x: 513, y: 358 },
        { id: 'logpile', x: 350, y: 260 },
      ],
      scatter: { barrel: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_l_slagcache: {
      id: 'a3_l_slagcache', name: 'THE SLAG CACHE', type: 'loot', acts: [3],
      size: { w: 730, h: 550 }, shape: 'rect', lock: 'objective',
      doors: [{ side: 'e', t: 0.4 }, { side: 'e', t: 0.75 }],
      entry: { side: 'w', t: 0.5 },
      solids: [],
      props: [
        { id: 'crate', x: 199, y: 185 },
        { id: 'crate', x: 362, y: 162 },
        { id: 'crate', x: 526, y: 197 },
        { id: 'barrel', x: 210, y: 371 },
        { id: 'basket', x: 374, y: 382 },
        { id: 'urn', x: 526, y: 371 },
        { id: 'logpile', x: 362, y: 272 },
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
      size: { w: 640, h: 490 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 244, y: 277 },
        { id: 'stump', x: 396, y: 277 },
        { id: 'stump', x: 320, y: 375 },
        { id: 'logpile', x: 320, y: 190 },
        { id: 'basket', x: 442, y: 173 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_r_dryrock: {
      id: 'a2_r_dryrock', name: 'DRY ROCK', type: 'rest', acts: [2],
      size: { w: 670, h: 520 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 256, y: 289 },
        { id: 'stump', x: 408, y: 289 },
        { id: 'logpile', x: 332, y: 196 },
        { id: 'basket', x: 332, y: 393 },
        { id: 'urn', x: 478, y: 185 },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_r_windbreak: {
      id: 'a3_r_windbreak', name: 'THE WINDBREAK', type: 'rest', acts: [3],
      size: { w: 700, h: 520 }, shape: 'round', lock: 'none',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [
        { id: 'stump', x: 268, y: 289 },
        { id: 'stump', x: 432, y: 289 },
        { id: 'logpile', x: 350, y: 196 },
        { id: 'basket', x: 350, y: 393 },
        { id: 'urn', x: 502, y: 191 },
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
      size: { w: 1280, h: 900 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 392, y: 390, w: 90, h: 90, spr: 'brock' },
        { x: 798, y: 420, w: 90, h: 90, spr: 'brock' },
      ],
      props: [
        { id: 'stump', x: 271, y: 225 },
        { id: 'stump', x: 1024, y: 675 },
        { id: 'boulder', x: 663, y: 195 },
        { id: 'urn', x: 663, y: 720 },
      ],
      scatter: { bush: [2, 5] },
      // 4 corner mounds, well inside the walls, for the warren's burrows.
      spawnMarkers: [
        { x: 226, y: 225 }, { x: 1054, y: 225 }, { x: 226, y: 675 }, { x: 1054, y: 675 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 1,
    },

    a2_b_middenhall: {
      id: 'a2_b_middenhall', name: 'THE MIDDEN HALL', type: 'boss', acts: [2],
      size: { w: 1350, h: 940 }, shape: 'pillars', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 360, y: 316, w: 83, h: 83, spr: 'slab' },
        { x: 908, y: 316, w: 83, h: 83, spr: 'slab' },
        { x: 360, y: 572, w: 83, h: 83, spr: 'slab' },
        { x: 908, y: 572, w: 83, h: 83, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 675, y: 196 },
        { id: 'barrel', x: 675, y: 752 },
        { id: 'urn', x: 210, y: 481 },
        { id: 'urn', x: 1140, y: 481 },
      ],
      scatter: { barrel: [2, 5] },
      // 6 markers spread around the hall for the tunnel mouths.
      spawnMarkers: [
        { x: 675, y: 196 }, { x: 1088, y: 316 }, { x: 1088, y: 624 },
        { x: 675, y: 752 }, { x: 263, y: 624 }, { x: 263, y: 316 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 2,
    },

    a3_b_ashenring: {
      id: 'a3_b_ashenring', name: 'THE ASHEN RING', type: 'boss', acts: [3],
      size: { w: 1430, h: 980 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'e', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 421, y: 422, w: 98, h: 98, spr: 'brock' },
        { x: 888, y: 422, w: 98, h: 98, spr: 'brock' },
      ],
      props: [
        { id: 'urn', x: 715, y: 226 },
        { id: 'urn', x: 715, y: 754 },
        { id: 'boulder', x: 265, y: 490 },
        { id: 'boulder', x: 1129, y: 490 },
        // 6 breakable stumps and crates preplaced for prop regrowth.
        { id: 'stump', x: 562, y: 339 },
        { id: 'stump', x: 903, y: 278 },
        { id: 'crate', x: 527, y: 641 },
        { id: 'crate', x: 903, y: 641 },
        { id: 'stump', x: 715, y: 377 },
        { id: 'crate', x: 715, y: 603 },
      ],
      scatter: { urn: [2, 5] },
      // 8 markers rimming the space for prop regrowth.
      spawnMarkers: [
        { x: 1091, y: 490 }, { x: 981, y: 224 }, { x: 715, y: 113 }, { x: 449, y: 224 },
        { x: 339, y: 490 }, { x: 449, y: 756 }, { x: 715, y: 867 }, { x: 981, y: 756 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 3,
    },

    // The last room of the run. Round, bare, no cover, nothing to hide behind.
    hollow: {
      id: 'hollow', name: 'THE HOLLOW', type: 'boss', acts: [3],
      size: { w: 1100, h: 1100 }, shape: 'round', lock: 'clear',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [],
      props: [],
      scatter: {},
      // 6 markers evenly spread on a ring at 60% radius, for Old Nobody's
      // sign circles.
      spawnMarkers: [
        { x: 880, y: 550 }, { x: 715, y: 264 }, { x: 385, y: 264 },
        { x: 220, y: 550 }, { x: 385, y: 836 }, { x: 715, y: 836 },
      ],
      waves: [],
      reward: { kind: 'auto' }, floor: 'hollow',
    },
  },

  secret: {},
};
