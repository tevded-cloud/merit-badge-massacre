// Merit Badge Massacre: the room catalogue. Room kinds, the per-act running
// order, and the wave tables the combat rooms draw from.
//
// The room runtime is the live default path: js/ui.js:7 sets MBM_FIELD = false,
// and js/room.js:5 says every night is rooms now. The 1.0 open timed field
// survives only behind that MBM_FIELD debug flag, for debugging.
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
//                 spr picks the look, not a painter name: 'log' draws the log
//                 wall family, and anything else ('wall', 'slab') draws the
//                 rock family. Which rock is chosen by the box aspect ratio in
//                 render.js rdBuildSolidDecos, so callers never name a rock.
//   props         [{ id, x, y }] hand placed props, room-local coordinates
//   scatter       { propId: [min, max] } extra props the room seeds at random
//   spawnMarkers  [{ x, y }] anchors for waves that spawn at 'marker'
//   waves         [WaveDef] in order, first to last
//   cast          optional { speciesId: multiplier }. Every 'auto' spawn in the
//                 room rolls the act's ecosystem (DATA.rosters) and this map
//                 bends those weights toward the scene: above 1 for what the
//                 layout is about, below 1 for what it is not. A species the
//                 act does not stock at all is admitted as a guest at a small
//                 base weight, which is how THE MAILBOX LANE gets its raccoons
//                 in act 1 and THE KILL BOWL gets its herd in act 2.
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
//            DATA.enemies or 'auto' to roll the act's roster at the room's
//            threat, through the layout's cast (the open field still rolls the
//            flat DATA.pool, which is why that table is unchanged)
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
    rooms: 8,
    beats: ['combat', 'combat|lore', 'shop|lore', 'combat|elite', 'combat', 'combat|elite', 'loot|rest|lore', 'boss'],
    bossTier: 1,
    rules: { noRepeatType: 2, guarantee: ['shop', 'loot'] },
  },
  {
    act: 2,
    name: 'THE SOG',
    rooms: 9,
    beats: ['combat', 'combat|elite|lore', 'combat', 'shop', 'combat|elite', 'combat|lore', 'combat|elite', 'loot|rest|lore', 'boss'],
    bossTier: 2,
    rules: { noRepeatType: 2, guarantee: ['shop', 'loot'] },
  },
  {
    act: 3,
    name: 'THE BURN',
    rooms: 10,
    beats: ['combat', 'combat|elite|lore', 'combat', 'combat|elite', 'shop', 'combat', 'combat|elite', 'combat|elite|lore', 'loot|rest|lore', 'boss'],
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
    // THE BOWL. Entry west and three doors fan four approach corridors across
    // the middle, so the only ground a body may stand on is the southern rim.
    // The cover sits on that rim, the centre stays open, and the east stump has
    // slid in off the line: cutting inside it is the short way to the lower
    // east door and the way that runs closest to the wave.
    a1_c_needlefall: {
      id: 'a1_c_needlefall', name: 'NEEDLEFALL', type: 'combat', acts: [1],
      cast: { pineconepuffer: 3, squirrel: 1.4, ticktot: 1.2, bat: 0.6 },
      size: { w: 1000, h: 700 }, shape: 'rect', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.55 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.72 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 330, y: 545, w: 64, h: 44, spr: 'log' },
        { x: 670, y: 545, w: 64, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 290, y: 525 },
        { id: 'stump', x: 600, y: 535 },
        { id: 'bush', x: 753, y: 200 },
        { id: 'basket', x: 200, y: 560 },
        { id: 'birdhouse', x: 507, y: 147 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 420,
          members: [{ prop: 0 }, { prop: 1 }],
          violation: { member: { prop: 1 }, slot: { x: 710, y: 525 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 300, y: 180 }, { x: 700, y: 180 }, { x: 860, y: 350 }, { x: 500, y: 210 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 24, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'ring', r: 230 }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 290, y: 525, r: 52, role: 'needle' },
        { kind: 'patch', x: 600, y: 535, r: 52, role: 'needle' },
        { kind: 'bowl', x: 500, y: 350, r0: 150, r1: 430 },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 550, y: 0 } },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 1000, y: 245 } },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 1000, y: 504 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE BOWL. The hollow itself is the room: nothing stands in the middle,
    // two stumps face each other across it on the rim, and the east one has
    // slid down the slope toward the centre. RING OF THE HARE keeps its name
    // but is now spawned inline at r 250 so the whole ring is born on screen.
    a1_c_kettlehollow: {
      id: 'a1_c_kettlehollow', name: 'KETTLE HOLLOW', type: 'combat', acts: [1],
      cast: { rabbit: 2.2, doe: 1.4, squirrel: 0.7, chipchoir: 0.6 },
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.4 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 180, y: 200, w: 64, h: 44, spr: 'log' },
        { x: 180, y: 520, w: 64, h: 44, spr: 'log' },
        { x: 760, y: 160, w: 64, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 280, y: 400 },
        { id: 'stump', x: 710, y: 400 },
        { id: 'bush', x: 267, y: 546 },
        { id: 'basket', x: 813, y: 216 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 520,
          members: [{ prop: 0 }, { prop: 1 }],
          violation: { member: { prop: 1 }, slot: { x: 800, y: 400 } },
        },
      ],
      scatter: { bush: [4, 7] },
      spawnMarkers: [
        { x: 960, y: 120 }, { x: 360, y: 580 }, { x: 860, y: 600 }, { x: 480, y: 120 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.25, maxT: 55, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 60, name: 'RING OF THE HARE', spawns: [{ id: 'rabbit', n: 20, mode: 'ring', r: 250 }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 540, y: 365, r0: 170, r1: 470 },
        { kind: 'patch', x: 280, y: 400, r: 52, role: 'moss' },
        { kind: 'patch', x: 710, y: 400, r: 52, role: 'moss' },
        { kind: 'path', from: { x: 540, y: 684 }, to: { x: 432, y: 0 } },
        { kind: 'path', from: { x: 540, y: 684 }, to: { x: 1080, y: 365 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE LANES. The road is the lane and the north treeline is its wall: two
    // stumps and two fallen logs stand along it, one stump pushed out past the
    // end of the line so the far end of the road has a corner to cut. The
    // mailboxes are not solid, so they may line the road itself.
    a1_c_mailroute: {
      id: 'a1_c_mailroute', name: 'THE MAIL ROUTE', type: 'combat', acts: [1],
      cast: { chipchoir: 2.4, ticktot: 1.6, bat: 1.4, doe: 0.6, squirrel: 0.8 },
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.72 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.35 },
      solids: [
        { x: 480, y: 152, w: 64, h: 44, spr: 'log' },
        { x: 660, y: 152, w: 64, h: 44, spr: 'log' },
        { x: 250, y: 580, w: 64, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 365, y: 150 },
        { id: 'stump', x: 835, y: 150 },
        { id: 'mailbox', x: 176, y: 375 },
        { id: 'mailbox', x: 954, y: 375 },
        { id: 'mailbox', x: 565, y: 405 },
        { id: 'birdhouse', x: 565, y: 120 },
        { id: 'basket', x: 138, y: 625 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 400,
          members: [{ prop: 0 }, { prop: 1 }],
          violation: { member: { prop: 1 }, slot: { x: 765, y: 150 } },
        },
      ],
      scatter: { bush: [3, 6], mailbox: [1, 2] },
      spawnMarkers: [
        { x: 1000, y: 120 }, { x: 180, y: 420 }, { x: 720, y: 620 }, { x: 520, y: 320 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 12, mode: 'door' }, { id: 'auto', n: 8, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 22, mode: 'edge' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'road', from: { x: 100, y: 375 }, to: { x: 1030, y: 375 }, w: 64 },
        { kind: 'patch', x: 365, y: 150, r: 50, role: 'dirt' },
        { kind: 'patch', x: 835, y: 150, r: 50, role: 'dirt' },
        { kind: 'patch', x: 176, y: 385, r: 44, role: 'dirt' },
        { kind: 'patch', x: 954, y: 385, r: 44, role: 'dirt' },
        { kind: 'path', from: { x: 46, y: 262 }, to: { x: 1130, y: 225 } },
        { kind: 'path', from: { x: 46, y: 262 }, to: { x: 1130, y: 540 } },
        { kind: 'path', from: { x: 46, y: 262 }, to: { x: 678, y: 750 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE FUNNEL. In from the north, out through two doors on the south wall:
    // the walls of the cut are a wide log pair and a narrower stump pair, and
    // the rock at (500, 470) is the ambush the player commits past. It is the
    // declared anchor, sitting on the mirror axis between the two door runs.
    // The south stump has been pulled in off its slot, so the west half of the
    // throat is the fast line and the one that passes the point spawn.
    a1_c_bramblecut: {
      id: 'a1_c_bramblecut', name: 'THE BRAMBLE CUT', type: 'combat', acts: [1],
      cast: { rabbit: 2, ticktot: 1.6, squirrel: 1.2, doe: 0.5, bat: 0.5 },
      size: { w: 1040, h: 720 }, shape: 'rect', lock: 'clear',
      archetype: 'funnel', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }],
      entry: { side: 'n', t: 0.45 },
      anchor: { solid: 0 },
      solids: [
        { x: 500, y: 470, w: 46, h: 66, spr: 'slab' },
        { x: 190, y: 200, w: 70, h: 36, spr: 'log' },
        { x: 850, y: 200, w: 70, h: 36, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 270, y: 400 },
        { id: 'stump', x: 700, y: 400 },
        { id: 'bush', x: 130, y: 144 },
        { id: 'bush', x: 910, y: 164 },
        { id: 'basket', x: 845, y: 131 },
      ],
      lanes: [{ w: 180 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 660,
          members: [{ solid: 1 }, { solid: 2 }],
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 500,
          members: [{ prop: 0 }, { prop: 1 }],
          violation: { member: { prop: 1 }, slot: { x: 770, y: 400 } },
        },
      ],
      scatter: { bush: [5, 9] },
      spawnMarkers: [
        { x: 920, y: 400 }, { x: 380, y: 240 }, { x: 120, y: 600 }, { x: 640, y: 600 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 40, spawns: [{ id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 4, mode: 'point', x: 520, y: 560 }, { id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 190, y: 200, r: 50, role: 'moss' },
        { kind: 'patch', x: 850, y: 200, r: 50, role: 'moss' },
        { kind: 'patch', x: 270, y: 400, r: 50, role: 'moss' },
        { kind: 'patch', x: 700, y: 400, r: 50, role: 'moss' },
        { kind: 'bowl', x: 500, y: 470, r0: 90, r1: 330 },
        { kind: 'path', from: { x: 468, y: 46 }, to: { x: 312, y: 720 } },
        { kind: 'path', from: { x: 468, y: 46 }, to: { x: 728, y: 720 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // -- act 1 added variety --
    // THE CROSSROADS. Entry west plus doors north, east and south make an X of
    // approach corridors, so the crossing at C stays empty and every body sits
    // in a quadrant. Base symmetry mirrorY, because the north and south doors
    // are exact mirrors about the entry and rot180 has no legal pair here.
    // One idea: rock. The violation is the north boulder, which has rolled off
    // the east gate toward the crossing.
    a1_c_boulderrun: {
      id: 'a1_c_boulderrun', name: 'BOULDER RUN', type: 'combat', acts: [1],
      cast: { doe: 2, pineconepuffer: 1.5, squirrel: 1.3, bat: 0.5, chipchoir: 0.6 },
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      archetype: 'crossroads', symmetry: 'mirrorY', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.6 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 415, y: 252, w: 64, h: 44, spr: 'slab' },
        { x: 415, y: 518, w: 64, h: 44, spr: 'slab' },
        { x: 1000, y: 190, w: 66, h: 66, spr: 'slab' },
      ],
      props: [
        { id: 'boulder', x: 720, y: 290 },
        { id: 'boulder', x: 846, y: 565 },
        { id: 'bush', x: 111, y: 665 },
      ],
      // The two gate mouths the composition actually cuts, west and east.
      lanes: [{ w: 220 }, { w: 238 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomY', anchor: 'C', step: 266,
          members: [{ solid: 0 }, { solid: 1 }],
        },
        {
          type: 'mirroredPair', axis: 'roomY', anchor: 'C', step: 360,
          members: [{ prop: 0 }, { prop: 1 }],
          violation: { member: { prop: 0 }, slot: { x: 846, y: 205 } },
        },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 565, y: 160 }, { x: 585, y: 600 },
        { x: 975, y: 400 }, { x: 660, y: 690 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 720, y: 290, r: 62, role: 'dirt' },
        { kind: 'patch', x: 846, y: 565, r: 62, role: 'dirt' },
        { kind: 'patch', x: 415, y: 252, r: 46, role: 'dirt' },
        { kind: 'patch', x: 415, y: 518, r: 46, role: 'dirt' },
        { kind: 'bowl', x: 585, y: 385, r0: 120, r1: 430 },
        { kind: 'path', from: { x: 46, y: 385 }, to: { x: 585, y: 0 } },
        { kind: 'path', from: { x: 46, y: 385 }, to: { x: 1170, y: 462 } },
        { kind: 'path', from: { x: 46, y: 385 }, to: { x: 585, y: 770 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    a1_c_mailboxlane: {
      id: 'a1_c_mailboxlane', name: 'THE MAILBOX LANE', type: 'combat', acts: [1],
      // Raccoon led: the lane is a mail route and something has been working
      // it. Raccoons are act 2 stock, so they come in here as a guest.
      cast: { raccoon: 4.5, ticktot: 1.5, squirrel: 0.7, rabbit: 0.6, doe: 0.4, bat: 0.5, pineconepuffer: 0.5, chipchoir: 0.6 },
      size: { w: 1210, h: 700 }, shape: 'rect', lock: 'clear',
      // THE CROSSROADS. Entry west with two east doors and one north cuts the
      // room into corridors and leaves one usable quadrant, the south verge, so
      // the whole line stands along it and the crossing stays open. The west
      // end of the line has been pulled out past its slot: that end is the
      // short way back to the entry side and the one the ring wave closes on.
      archetype: 'crossroads', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 290, y: 550, w: 70, h: 36, spr: 'wall' },
        { x: 865, y: 550, w: 70, h: 36, spr: 'wall' },
        { x: 490, y: 550, w: 70, h: 36, spr: 'wall' },
        { x: 720, y: 550, w: 70, h: 36, spr: 'wall' },
      ],
      props: [
        { id: 'stump', x: 605, y: 550 },
        { id: 'mailbox', x: 151, y: 350 },
        { id: 'mailbox', x: 460, y: 350 },
        { id: 'mailbox', x: 762, y: 350 },
        { id: 'mailbox', x: 1059, y: 350 },
        { id: 'basket', x: 1059, y: 95 },
      ],
      lanes: [{ w: 190 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 260,
          members: [{ solid: 0 }, { prop: 0 }, { solid: 1 }],
          violation: { member: { solid: 0 }, slot: { x: 345, y: 550 } },
        },
      ],
      scatter: { mailbox: [1, 3] },
      spawnMarkers: [
        { x: 120, y: 120 }, { x: 1080, y: 580 }, { x: 720, y: 120 }, { x: 420, y: 380 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, name: 'FOXFIRE HUNT', spawns: [{ id: 'fox', n: 10, mode: 'ring', r: 250 }, { id: 'auto', n: 10, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'road', from: { x: 50, y: 350 }, to: { x: 1160, y: 350 }, w: 74 },
        { kind: 'patch', x: 290, y: 550, r: 50, role: 'dirt' },
        { kind: 'patch', x: 605, y: 550, r: 50, role: 'dirt' },
        { kind: 'patch', x: 865, y: 550, r: 50, role: 'dirt' },
        { kind: 'patch', x: 151, y: 360, r: 46, role: 'dirt' },
        { kind: 'patch', x: 1059, y: 360, r: 46, role: 'dirt' },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 1210, y: 210 } },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 1210, y: 490 } },
        { kind: 'path', from: { x: 46, y: 350 }, to: { x: 605, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE BOWL. The henge circle is still marked on the ground and the middle
    // is kept empty: the run from the entry to the north door goes straight
    // through it. Two stumps stand opposite each other on the ring's diagonal
    // and two stones sit inside it, the east one shouldered out of place, which
    // is the gap the player takes when the ring wave closes.
    a1_c_stumphenge: {
      id: 'a1_c_stumphenge', name: 'STUMP HENGE', type: 'combat', acts: [1],
      cast: { chipchoir: 2.6, pineconepuffer: 1.6, squirrel: 1.2, rabbit: 0.6, bat: 0.5 },
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      archetype: 'bowl', symmetry: 'rot180', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.35 }, { side: 'e', t: 0.7 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 430, y: 360, w: 40, h: 40, spr: 'log' },
        { x: 710, y: 430, w: 40, h: 40, spr: 'log' },
        { x: 170, y: 200, w: 40, h: 40, spr: 'log' },
      ],
      props: [
        { id: 'stump', x: 290, y: 520 },
        { id: 'stump', x: 790, y: 210 },
        { id: 'bush', x: 250, y: 620 },
        { id: 'basket', x: 840, y: 620 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'trueDiagonal', anchor: 'C', step: 588,
          members: [{ prop: 0 }, { prop: 1 }],
        },
        {
          type: 'mirroredPair', axis: 'trueDiagonal', anchor: 'C', step: 220,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 1 }, slot: { x: 650, y: 370 } },
        },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 960, y: 120 }, { x: 120, y: 600 }, { x: 400, y: 120 }, { x: 740, y: 600 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 16, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 18, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 20, mode: 'ring', r: 240 }], elites: 0, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'ring', x: 540, y: 365, r: 178, w: 34 },
        { kind: 'patch', x: 290, y: 520, r: 44, role: 'dirt' },
        { kind: 'patch', x: 790, y: 210, r: 44, role: 'dirt' },
        { kind: 'patch', x: 430, y: 360, r: 40, role: 'moss' },
        { kind: 'patch', x: 710, y: 430, r: 40, role: 'moss' },
        { kind: 'patch', x: 540, y: 365, r: 54, role: 'moss' },
        { kind: 'path', from: { x: 540, y: 684 }, to: { x: 540, y: 0 } },
        { kind: 'path', from: { x: 540, y: 684 }, to: { x: 1080, y: 256 } },
        { kind: 'path', from: { x: 540, y: 684 }, to: { x: 1080, y: 511 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // ------------------------------ act 2 ------------------------------
    // THE LANES. Three doors and the entry fan four approach corridors across
    // the water, so the only ground that holds a body is the south bank. The
    // sluice piers stand along it on one interval and the channel runs open
    // above them. The west pier has been shoved downstream off its slot: the
    // gap it leaves is the fast line back toward the entry, and it is the line
    // that runs closest to the wave.
    a2_c_sluicegate: {
      id: 'a2_c_sluicegate', name: 'THE SLUICE GATE', type: 'combat', acts: [2],
      cast: { stiltheron: 2.2, bogfrog: 1.8, beaver: 1.6, raccoon: 0.6, ticktot: 0.5, chipchoir: 0.5 },
      size: { w: 1080, h: 730 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 300, y: 455, w: 36, h: 44, spr: 'wall' },
        { x: 540, y: 560, w: 36, h: 44, spr: 'wall' },
        { x: 790, y: 560, w: 36, h: 44, spr: 'wall' },
      ],
      props: [
        { id: 'barrel', x: 540, y: 585 },
        { id: 'barrel', x: 790, y: 585 },
        { id: 'mailbox', x: 540, y: 250 },
        { id: 'bush', x: 905, y: 645 },
      ],
      // The channel above the pier line, and the mouth between the two east
      // door corridors.
      lanes: [{ w: 200 }, { w: 180 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 250,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 0 }, slot: { x: 290, y: 560 } },
        },
      ],
      scatter: { mailbox: [1, 2], bush: [2, 4] },
      spawnMarkers: [
        { x: 400, y: 200 }, { x: 700, y: 210 },
        { x: 900, y: 400 }, { x: 350, y: 670 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'door' }], elites: 0, drip: null, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 330, y: 300, rx: 150, ry: 52 },
        { kind: 'pool', x: 800, y: 380, rx: 130, ry: 46 },
        { kind: 'patch', x: 540, y: 570, r: 70, role: 'mud' },
        { kind: 'patch', x: 790, y: 570, r: 70, role: 'mud' },
        { kind: 'patch', x: 300, y: 455, r: 70, role: 'mud' },
        { kind: 'path', from: { x: 46, y: 292 }, to: { x: 1080, y: 219 } },
        { kind: 'path', from: { x: 46, y: 292 }, to: { x: 1080, y: 511 } },
        { kind: 'path', from: { x: 46, y: 292 }, to: { x: 540, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE LANES. The mess hall's back wall is the only thing left standing and
    // it runs the room's own x axis, three stubs on one interval with the water
    // on both sides. The west stub has slid off its slot toward the entry: the
    // slot it left is the short way onto the north bank and the one the flank
    // wave answers. Two bank stubs hold the south corners, both in the fringe.
    a2_c_drownedmess: {
      id: 'a2_c_drownedmess', name: 'THE DROWNED MESS', type: 'combat', acts: [2],
      cast: { bogfrog: 2, sapperrat: 1.8, stiltheron: 1.4, raccoon: 1.2, bat: 0.5 },
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.35 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.45 },
      solids: [
        { x: 335, y: 400, w: 60, h: 44, spr: 'wall' },
        { x: 585, y: 300, w: 60, h: 44, spr: 'wall' },
        { x: 865, y: 300, w: 60, h: 44, spr: 'wall' },
        { x: 220, y: 612, w: 60, h: 44, spr: 'log' },
        { x: 960, y: 612, w: 60, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'mailbox', x: 585, y: 640 },
        { id: 'bush', x: 150, y: 380 },
        { id: 'bush', x: 1020, y: 400 },
      ],
      // The north bank above the wall line and the south channel below it.
      lanes: [{ w: 220 }, { w: 200 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 280,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 0 }, slot: { x: 305, y: 300 } },
        },
      ],
      scatter: { mailbox: [1, 2], bush: [3, 6] },
      spawnMarkers: [
        { x: 420, y: 560 }, { x: 700, y: 560 },
        { x: 200, y: 200 }, { x: 1010, y: 200 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 450, y: 500, rx: 170, ry: 60 },
        { kind: 'pool', x: 810, y: 520, rx: 140, ry: 52 },
        { kind: 'pool', x: 585, y: 180, rx: 120, ry: 44 },
        { kind: 'patch', x: 335, y: 400, r: 74, role: 'mud' },
        { kind: 'patch', x: 585, y: 300, r: 74, role: 'mud' },
        { kind: 'patch', x: 865, y: 300, r: 74, role: 'mud' },
        { kind: 'path', from: { x: 527, y: 724 }, to: { x: 410, y: 0 } },
        { kind: 'path', from: { x: 527, y: 724 }, to: { x: 819, y: 0 } },
        { kind: 'path', from: { x: 527, y: 724 }, to: { x: 1170, y: 385 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE LANES. The run itself is the south bank: three cut stands on one
    // interval with the open water above them. The east stand has been carried
    // up off its slot, which turns the north east into the fast way to the east
    // door and the way the DAM BREAK ring closes on. That set piece is spawned
    // inline at r 250 so the whole ring is born on screen.
    a2_c_cattailrun: {
      id: 'a2_c_cattailrun', name: 'CATTAIL RUN', type: 'combat', acts: [2],
      cast: { stiltheron: 3, bogfrog: 1.8, bat: 0.6, raccoon: 0.5, beaver: 0.6 },
      size: { w: 1130, h: 750 }, shape: 'round', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.45 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 285, y: 570, w: 60, h: 44, spr: 'log' },
        { x: 565, y: 570, w: 60, h: 44, spr: 'log' },
        { x: 845, y: 480, w: 60, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 285, y: 600 },
        { id: 'barrel', x: 565, y: 600 },
        { id: 'bush', x: 200, y: 200 },
        { id: 'bush', x: 940, y: 640 },
        { id: 'mailbox', x: 960, y: 180 },
      ],
      // The open water north of the stands, and the bank walk behind them.
      lanes: [{ w: 220 }, { w: 150 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 280,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 2 }, slot: { x: 845, y: 570 } },
        },
      ],
      scatter: { bush: [4, 7], mailbox: [1, 2] },
      spawnMarkers: [
        { x: 450, y: 250 }, { x: 700, y: 250 },
        { x: 960, y: 300 }, { x: 720, y: 680 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'door' }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 65, name: 'DAM BREAK', spawns: [{ id: 'beaver', n: 18, mode: 'ring', r: 250 }, { id: 'auto', n: 6, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 565, y: 330, rx: 220, ry: 78 },
        { kind: 'pool', x: 300, y: 660, rx: 100, ry: 40 },
        { kind: 'patch', x: 285, y: 585, r: 74, role: 'mud' },
        { kind: 'patch', x: 565, y: 585, r: 74, role: 'mud' },
        { kind: 'patch', x: 845, y: 480, r: 74, role: 'mud' },
        { kind: 'path', from: { x: 46, y: 375 }, to: { x: 1130, y: 338 } },
        { kind: 'path', from: { x: 46, y: 375 }, to: { x: 622, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE CROSSROADS. Four exits and the entry cut an X across the water, so the
    // boathouse itself is the one thing standing in the middle: it is the
    // declared anchor, on the mirror axis. Two cradles hold the north corners of
    // the crossing and two slipway stubs hold the south. The west cradle has
    // slipped off its slot toward the middle, which is the pocket that carries
    // you nearest the flank wave on the way to the west door.
    a2_c_boathouse: {
      id: 'a2_c_boathouse', name: 'THE BOATHOUSE', type: 'combat', acts: [2],
      cast: { sapperrat: 2.2, raccoon: 1.8, beaver: 1.2, bogfrog: 0.6, stiltheron: 0.5 },
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      archetype: 'crossroads', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.4 }, { side: 'w', t: 0.4 }],
      entry: { side: 's', t: 0.5 },
      anchor: { solid: 4 },
      solids: [
        { x: 300, y: 400, w: 60, h: 44, spr: 'wall' },
        { x: 870, y: 320, w: 60, h: 44, spr: 'wall' },
        { x: 180, y: 620, w: 60, h: 44, spr: 'log' },
        { x: 1030, y: 620, w: 60, h: 44, spr: 'log' },
        { x: 605, y: 380, w: 50, h: 50, spr: 'wall' },
      ],
      props: [
        { id: 'mailbox', x: 605, y: 700 },
        { id: 'bush', x: 160, y: 300 },
        { id: 'bush', x: 1050, y: 480 },
      ],
      // The two door runs the crossing opens, north and east.
      lanes: [{ w: 210 }, { w: 190 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 530,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 0 }, slot: { x: 340, y: 320 } },
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 850,
          members: [{ solid: 2 }, { solid: 3 }],
        },
      ],
      scatter: { mailbox: [1, 3], bush: [2, 4] },
      spawnMarkers: [
        { x: 450, y: 560 }, { x: 760, y: 560 },
        { x: 420, y: 200 }, { x: 760, y: 180 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 300, y: 720, rx: 150, ry: 40 },
        { kind: 'pool', x: 910, y: 720, rx: 150, ry: 40 },
        { kind: 'patch', x: 605, y: 380, r: 96, role: 'mud' },
        { kind: 'patch', x: 300, y: 400, r: 70, role: 'moss' },
        { kind: 'patch', x: 870, y: 320, r: 70, role: 'moss' },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 363, y: 0 } },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 847, y: 0 } },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 1210, y: 316 } },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 0, y: 316 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // -- act 2 added variety --
    // THE LANES. The dry stand is a row of three posts on the room's own x
    // axis, and the water lanes run north and south of it. The middle post has
    // been pushed north off its slot: the pocket that opens under it is the
    // short way between the two north door runs and the one the flank wave
    // takes. Two bank stubs hold the south edge, both in the fringe.
    a2_c_birdhousegrove: {
      id: 'a2_c_birdhousegrove', name: 'THE BIRDHOUSE GROVE', type: 'combat', acts: [2],
      // The one dry stand in the Sog, and every small thing in the act has
      // moved into it. Squirrels are act 1 stock and come in as a guest.
      cast: { squirrel: 3, ticktot: 2.6, chipchoir: 1.8, bat: 1.4, raccoon: 0.5, sapperrat: 0.4, bogfrog: 0.3, stiltheron: 0.3, beaver: 0.3 },
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 330, y: 350, w: 30, h: 44, spr: 'wall' },
        { x: 565, y: 240, w: 30, h: 44, spr: 'wall' },
        { x: 800, y: 350, w: 30, h: 44, spr: 'wall' },
        { x: 188, y: 600, w: 40, h: 36, spr: 'log' },
        { x: 942, y: 600, w: 40, h: 36, spr: 'log' },
      ],
      props: [
        { id: 'birdhouse', x: 330, y: 300 },
        { id: 'birdhouse', x: 800, y: 300 },
        { id: 'birdhouse', x: 565, y: 190 },
        { id: 'bush', x: 240, y: 640 },
        { id: 'bush', x: 890, y: 640 },
      ],
      // The lane above the post row and the lane below it.
      lanes: [{ w: 200 }, { w: 220 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 235,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 1 }, slot: { x: 565, y: 350 } },
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 754,
          members: [{ solid: 3 }, { solid: 4 }],
        },
      ],
      scatter: { birdhouse: [2, 4], bush: [2, 4] },
      spawnMarkers: [
        { x: 450, y: 480 }, { x: 690, y: 480 },
        { x: 400, y: 200 }, { x: 720, y: 180 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'door' }], elites: 0, drip: null, ref: null },
        { delay: 1.3, nextAt: 0.30, maxT: 60, name: 'CHIROPTERAN CHOIR', spawns: [{ id: 'bat', n: 20, mode: 'edge' }, { id: 'auto', n: 2, mode: 'marker' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 400, y: 560, rx: 180, ry: 60 },
        { kind: 'pool', x: 800, y: 560, rx: 150, ry: 54 },
        { kind: 'patch', x: 330, y: 350, r: 64, role: 'moss' },
        { kind: 'patch', x: 800, y: 350, r: 64, role: 'moss' },
        { kind: 'patch', x: 565, y: 240, r: 64, role: 'moss' },
        { kind: 'path', from: { x: 565, y: 704 }, to: { x: 339, y: 0 } },
        { kind: 'path', from: { x: 565, y: 704 }, to: { x: 791, y: 0 } },
        { kind: 'path', from: { x: 565, y: 704 }, to: { x: 0, y: 375 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE BOWL. The middle of the bowl is kept empty, which is what the herd
    // wave needs. Entry east and doors west and north strip everything but the
    // southern rim, so the whole line stands along it on one interval. The west
    // stone has rolled up the slope off its slot, and cutting inside it is the
    // short way to the west door and the way that runs closest to the ring.
    a2_c_killbowl: {
      id: 'a2_c_killbowl', name: 'THE KILL BOWL', type: 'combat', acts: [2],
      // The herd room. Whatever the bowl is for, the big bodies come to it
      // from both the act before and the act after: doe, boar, ash elk.
      cast: { doe: 5, boar: 3.4, ashelk: 2.6, raccoon: 0.4, beaver: 0.4, bogfrog: 0.35, sapperrat: 0.35, stiltheron: 0.3, bat: 0.4, chipchoir: 0.4, ticktot: 0.6 },
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'w', t: 0.5 }, { side: 'n', t: 0.5 }],
      entry: { side: 'e', t: 0.5 },
      solids: [
        { x: 280, y: 480, w: 50, h: 44, spr: 'log' },
        { x: 540, y: 560, w: 50, h: 44, spr: 'log' },
        { x: 800, y: 560, w: 50, h: 44, spr: 'log' },
      ],
      props: [
        { id: 'barrel', x: 540, y: 585 },
        { id: 'barrel', x: 800, y: 585 },
        { id: 'bush', x: 180, y: 620 },
        { id: 'bush', x: 900, y: 640 },
      ],
      // The open floor of the bowl above the rim line.
      lanes: [{ w: 230 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 260,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 0 }, slot: { x: 280, y: 560 } },
        },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 700, y: 200 }, { x: 420, y: 200 },
        { x: 180, y: 300 }, { x: 180, y: 640 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 540, y: 340, rx: 240, ry: 90 },
        { kind: 'patch', x: 540, y: 570, r: 80, role: 'mud' },
        { kind: 'patch', x: 800, y: 570, r: 80, role: 'mud' },
        { kind: 'patch', x: 280, y: 480, r: 80, role: 'mud' },
        { kind: 'path', from: { x: 1034, y: 365 }, to: { x: 0, y: 365 } },
        { kind: 'path', from: { x: 1034, y: 365 }, to: { x: 540, y: 0 } },
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
    // THE GAUNTLET. A survive room, so the anti turtle rule is the binding one
    // and the cover sits at the bottom of the band: two bog stones on the mirror
    // and two urns holding the north wedge, with one bank stub in the fringe.
    // The west stone has been pushed out toward the entry off its slot, which is
    // the crossing the figure of eight uses over and over.
    a2_c_pressurebog: {
      id: 'a2_c_pressurebog', name: 'THE PRESSURE BOG', type: 'combat', acts: [2],
      cast: { bogfrog: 2.4, sapperrat: 2, ticktot: 1.4, stiltheron: 1.2, beaver: 0.5, raccoon: 0.6 },
      size: { w: 1130, h: 720 }, shape: 'rect', lock: 'survive', surviveT: 45,
      archetype: 'gauntlet', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'e', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 354, y: 460, w: 36, h: 40, spr: 'wall' },
        { x: 700, y: 460, w: 36, h: 40, spr: 'wall' },
        { x: 900, y: 565, w: 40, h: 36, spr: 'log' },
      ],
      props: [
        { id: 'urn', x: 460, y: 257 },
        { id: 'urn', x: 670, y: 257 },
        { id: 'mailbox', x: 565, y: 500 },
        { id: 'bush', x: 200, y: 640 },
      ],
      // The crossing between the two stones, and the north wedge mouth.
      lanes: [{ w: 200 }, { w: 170 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 270,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 0 }, slot: { x: 430, y: 460 } },
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 210,
          members: [{ prop: 0 }, { prop: 1 }],
        },
      ],
      scatter: { mailbox: [1, 3], bush: [2, 5] },
      spawnMarkers: [
        { x: 280, y: 240 }, { x: 220, y: 570 },
        { x: 880, y: 250 }, { x: 565, y: 640 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 50, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 14, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.4, nextAt: 0.25, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 22, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 530, y: 380, rx: 200, ry: 70 },
        { kind: 'pool', x: 880, y: 420, rx: 130, ry: 50 },
        { kind: 'patch', x: 354, y: 460, r: 70, role: 'mud' },
        { kind: 'patch', x: 700, y: 460, r: 70, role: 'mud' },
        { kind: 'patch', x: 565, y: 257, r: 90, role: 'moss' },
        { kind: 'path', from: { x: 46, y: 360 }, to: { x: 339, y: 0 } },
        { kind: 'path', from: { x: 46, y: 360 }, to: { x: 791, y: 0 } },
        { kind: 'path', from: { x: 46, y: 360 }, to: { x: 1130, y: 360 } },
        { kind: 'path', from: { x: 46, y: 360 }, to: { x: 565, y: 720 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // ------------------------------ act 3 ------------------------------
    // ------------------------------ act 3 ------------------------------
    // THE CROSSROADS. Entry west with two east doors and one south cuts an X
    // through the burn, so the crossing stays empty and the char line itself
    // holds the north verge, three slabs on one interval. The middle slab has
    // been shoved out of the line into the field: the pocket behind it is the
    // shortcut between the two east door runs and the closest ground to the
    // ring wave.
    a3_c_charline: {
      id: 'a3_c_charline', name: 'THE CHAR LINE', type: 'combat', acts: [3],
      cast: { ashelk: 2.2, boar: 1.6, cindercrow: 1.2, fox: 0.7, doe: 0.6 },
      size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
      archetype: 'crossroads', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 's', t: 0.55 }],
      entry: { side: 'w', t: 0.45 },
      solids: [
        { x: 315, y: 150, w: 40, h: 36, spr: 'slab' },
        { x: 585, y: 203, w: 40, h: 36, spr: 'slab' },
        { x: 855, y: 150, w: 40, h: 36, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 315, y: 172 },
        { id: 'barrel', x: 855, y: 172 },
        { id: 'bush', x: 200, y: 640 },
        { id: 'bush', x: 980, y: 620 },
      ],
      // The verge under the char line and the crossing it opens onto.
      lanes: [{ w: 220 }, { w: 200 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 270,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 1 }, slot: { x: 585, y: 150 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 400, y: 320 }, { x: 720, y: 340 },
        { x: 900, y: 500 }, { x: 250, y: 660 },
      ],
      waves: [
        { delay: 0.7, nextAt: 0.40, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 315, y0: 150, x1: 855, y1: 150, w: 130 },
        { kind: 'cracks', x: 585, y: 203, r: 70 },
        { kind: 'patch', x: 315, y: 150, r: 70, role: 'char' },
        { kind: 'patch', x: 855, y: 150, r: 70, role: 'char' },
        { kind: 'patch', x: 585, y: 400, r: 120, role: 'ash' },
        { kind: 'path', from: { x: 46, y: 347 }, to: { x: 1170, y: 231 } },
        { kind: 'path', from: { x: 46, y: 347 }, to: { x: 1170, y: 539 } },
        { kind: 'path', from: { x: 46, y: 347 }, to: { x: 644, y: 770 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // THE BOWL. The field's middle is kept empty for the herd, and the only
    // standing cover is a pair of vents either side of it. The east vent has
    // been blown in off its slot toward the crossing, so the inside line past
    // it is the short way to the east door and the way the STAMPEDE meets you.
    // Three burnt slabs hold the fringe at the corners.
    a3_c_emberfield: {
      id: 'a3_c_emberfield', name: 'THE EMBER FIELD', type: 'combat', acts: [3],
      cast: { cindercrow: 2.2, ashelk: 1.8, owl: 1.2, doe: 0.5, quarrybadger: 0.7 },
      size: { w: 1210, h: 790 }, shape: 'round', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.45 }, { side: 'e', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      solids: [
        { x: 330, y: 400, w: 60, h: 44, spr: 'slab' },
        { x: 760, y: 400, w: 60, h: 44, spr: 'slab' },
        { x: 250, y: 170, w: 60, h: 44, spr: 'slab' },
        { x: 980, y: 180, w: 60, h: 44, spr: 'slab' },
        { x: 250, y: 620, w: 60, h: 44, spr: 'slab' },
      ],
      props: [
        { id: 'bush', x: 605, y: 690 },
        { id: 'bush', x: 1010, y: 620 },
      ],
      // The open middle of the bowl, and the inside line the violation opens.
      lanes: [{ w: 230 }, { w: 180 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 550,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 1 }, slot: { x: 880, y: 400 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 450, y: 580 }, { x: 850, y: 600 },
        { x: 450, y: 250 }, { x: 800, y: 220 },
      ],
      waves: [
        { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.4, nextAt: 0.28, maxT: 60, name: 'STAMPEDE', spawns: [{ id: 'boar', n: 14, mode: 'edge' }, { id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 6, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 605, y: 395, r0: 160, r1: 520 },
        { kind: 'patch', x: 330, y: 400, r: 90, role: 'char' },
        { kind: 'patch', x: 760, y: 400, r: 90, role: 'char' },
        { kind: 'cracks', x: 760, y: 400, r: 70 },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 545, y: 0 } },
        { kind: 'path', from: { x: 605, y: 744 }, to: { x: 1210, y: 395 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // THE CROSSROADS. Four doors and the entry cut an X through the stand, so
    // the crossing at C is empty and the snags stand in two L shaped groves
    // either side of it, mirrored. The north east snag has been blown off its
    // slot toward the corner: the pocket behind it is the one approach to the
    // upper east door that never crosses the middle.
    a3_c_snagstand: {
      id: 'a3_c_snagstand', name: 'THE SNAG STAND', type: 'combat', acts: [3],
      // A rookery. Everything in it has wings, and the bats have come up out
      // of the Sog to join them.
      cast: { owl: 2.6, cindercrow: 2.4, bat: 2.4, fox: 0.6, boar: 0.4, quarrybadger: 0.4, ashelk: 0.5, doe: 0.4 },
      size: { w: 1250, h: 830 }, shape: 'pillars', lock: 'clear',
      archetype: 'crossroads', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 430, y: 220, w: 30, h: 30, spr: 'slab' },
        { x: 900, y: 190, w: 30, h: 30, spr: 'slab' },
        { x: 465, y: 575, w: 30, h: 30, spr: 'slab' },
        { x: 785, y: 575, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'urn', x: 275, y: 645 },
        { id: 'urn', x: 975, y: 645 },
        { id: 'bush', x: 620, y: 760 },
        { id: 'bush', x: 200, y: 300 },
      ],
      // The two door runs the crossing opens, north south and east.
      lanes: [{ w: 210 }, { w: 190 }],
      formations: [
        {
          type: 'doubleL', axis: 'roomX', anchor: 'C', step: 355,
          members: [
            { solid: 0 }, { solid: 2 }, { prop: 0 },
            { solid: 1 }, { solid: 3 }, { prop: 1 },
          ],
          violation: { member: { solid: 1 }, slot: { x: 820, y: 220 } },
        },
      ],
      scatter: { bush: [4, 8] },
      spawnMarkers: [
        { x: 300, y: 400 }, { x: 620, y: 300 },
        { x: 900, y: 420 }, { x: 620, y: 700 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0.35, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 430, y0: 220, x1: 275, y1: 645, w: 110 },
        { kind: 'burnband', x0: 820, y0: 220, x1: 975, y1: 645, w: 110 },
        { kind: 'patch', x: 465, y: 575, r: 80, role: 'ash' },
        { kind: 'patch', x: 785, y: 575, r: 80, role: 'ash' },
        { kind: 'cracks', x: 900, y: 190, r: 70 },
        { kind: 'path', from: { x: 46, y: 332 }, to: { x: 1250, y: 249 } },
        { kind: 'path', from: { x: 46, y: 332 }, to: { x: 1250, y: 581 } },
        { kind: 'path', from: { x: 46, y: 332 }, to: { x: 625, y: 0 } },
        { kind: 'path', from: { x: 46, y: 332 }, to: { x: 625, y: 830 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // THE BOWL. The pit floor is kept empty and the cover sits on its rim: two
    // mirrored pairs of slabs, north and south, with one vent stone at the foot
    // of the bowl on the mirror axis as the declared anchor. The north west slab
    // has slid up the rim off its slot, and the gap it leaves is the fast way
    // back to the entry when the ring closes.
    a3_c_ashpit: {
      id: 'a3_c_ashpit', name: 'THE ASH PIT', type: 'combat', acts: [3],
      cast: { quarrybadger: 2.4, cindercrow: 1.6, ashelk: 1.2, fox: 0.6, owl: 0.6 },
      size: { w: 1170, h: 800 }, shape: 'rect', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 's', t: 0.3 }, { side: 's', t: 0.7 }, { side: 'e', t: 0.5 }],
      entry: { side: 'n', t: 0.5 },
      anchor: { solid: 2 },
      solids: [
        { x: 330, y: 340, w: 30, h: 30, spr: 'slab' },
        { x: 870, y: 460, w: 30, h: 30, spr: 'slab' },
        { x: 585, y: 600, w: 30, h: 30, spr: 'slab' },
        { x: 160, y: 160, w: 30, h: 30, spr: 'slab' },
        { x: 160, y: 560, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'bush', x: 640, y: 180 },
        { id: 'bush', x: 980, y: 200 },
      ],
      // The open floor of the pit, and the rim walk under the east slab.
      lanes: [{ w: 220 }, { w: 180 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 510,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 1 }, slot: { x: 840, y: 340 } },
        },
      ],
      scatter: { bush: [2, 5] },
      spawnMarkers: [
        { x: 480, y: 230 }, { x: 740, y: 220 },
        { x: 340, y: 630 }, { x: 1000, y: 640 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 5, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 585, y: 400, r0: 140, r1: 500 },
        { kind: 'patch', x: 585, y: 400, r: 150, role: 'char' },
        { kind: 'cracks', x: 870, y: 460, r: 70 },
        { kind: 'path', from: { x: 585, y: 46 }, to: { x: 351, y: 800 } },
        { kind: 'path', from: { x: 585, y: 46 }, to: { x: 819, y: 800 } },
        { kind: 'path', from: { x: 585, y: 46 }, to: { x: 1170, y: 400 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- act 3 added variety --
    // THE LANES. Both doors are east, so the room is one long run and the kiln
    // stones stand along its south side on one interval. The west stone has
    // been pulled up out of the line into the run: the pocket it leaves behind
    // is the short way east and the one the flank wave answers. The two kiln
    // mouths themselves hold the north fringe.
    a3_c_twinkilns: {
      id: 'a3_c_twinkilns', name: 'THE TWIN KILNS', type: 'combat', acts: [3],
      cast: { quarrybadger: 2.2, ashelk: 2, boar: 1.2, owl: 0.6, cindercrow: 0.7 },
      size: { w: 1210, h: 790 }, shape: 'rect', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }],
      entry: { side: 'w', t: 0.4 },
      solids: [
        { x: 320, y: 530, w: 30, h: 30, spr: 'slab' },
        { x: 605, y: 600, w: 30, h: 30, spr: 'slab' },
        { x: 890, y: 600, w: 30, h: 30, spr: 'slab' },
        { x: 350, y: 170, w: 30, h: 30, spr: 'slab' },
        { x: 660, y: 170, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'bush', x: 200, y: 620 },
        { id: 'bush', x: 1000, y: 200 },
      ],
      // The long run between the kiln mouths and the stone line.
      lanes: [{ w: 230 }, { w: 200 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 285,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 0 }, slot: { x: 320, y: 600 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 450, y: 300 }, { x: 750, y: 320 },
        { x: 950, y: 300 }, { x: 450, y: 720 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 24, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'patch', x: 350, y: 170, r: 120, role: 'char' },
        { kind: 'patch', x: 660, y: 170, r: 120, role: 'char' },
        { kind: 'burnband', x0: 320, y0: 600, x1: 890, y1: 600, w: 130 },
        { kind: 'cracks', x: 320, y: 530, r: 70 },
        { kind: 'path', from: { x: 46, y: 316 }, to: { x: 1210, y: 237 } },
        { kind: 'path', from: { x: 46, y: 316 }, to: { x: 1210, y: 553 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // THE LANES. Two north doors and one west cut three approach corridors, so
    // the alley itself is what is left: a lane between the west barricade and
    // the east one. The west barricade has been dragged forward off its slot,
    // which opens the cross over the flank wave uses. The kiln stone on the
    // mirror axis is the declared anchor and the two east blocks hold the
    // fringe.
    a3_c_barricadealley: {
      id: 'a3_c_barricadealley', name: 'BARRICADE ALLEY', type: 'combat', acts: [3],
      cast: { boar: 2.2, fox: 2, quarrybadger: 1.2, owl: 0.5, cindercrow: 0.6 },
      size: { w: 1170, h: 740 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'n', t: 0.3 }, { side: 'n', t: 0.7 }, { side: 'w', t: 0.5 }],
      entry: { side: 's', t: 0.5 },
      anchor: { solid: 2 },
      solids: [
        { x: 300, y: 320, w: 30, h: 30, spr: 'slab' },
        { x: 810, y: 400, w: 30, h: 30, spr: 'slab' },
        { x: 585, y: 240, w: 30, h: 30, spr: 'slab' },
        { x: 1000, y: 220, w: 30, h: 30, spr: 'slab' },
        { x: 1000, y: 560, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'bush', x: 200, y: 560 },
        { id: 'bush', x: 700, y: 640 },
      ],
      // The alley between the barricades and the east verge behind them.
      lanes: [{ w: 220 }, { w: 170 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 450,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 0 }, slot: { x: 360, y: 400 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 450, y: 500 }, { x: 700, y: 520 },
        { x: 400, y: 180 }, { x: 850, y: 160 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'door' }], elites: 0, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
        { delay: 1.0, nextAt: 0, maxT: 65, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 300, y0: 320, x1: 810, y1: 400, w: 130 },
        { kind: 'cracks', x: 300, y: 320, r: 70 },
        { kind: 'patch', x: 585, y: 240, r: 90, role: 'char' },
        { kind: 'patch', x: 1000, y: 390, r: 110, role: 'ash' },
        { kind: 'path', from: { x: 585, y: 694 }, to: { x: 351, y: 0 } },
        { kind: 'path', from: { x: 585, y: 694 }, to: { x: 819, y: 0 } },
        { kind: 'path', from: { x: 585, y: 694 }, to: { x: 0, y: 370 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // THE CROSSROADS. Four doors and the entry make an X of the whole floor, so
    // the grid that is left runs on the room's y axis: a line of three kiln
    // stones with the middle one out on the entry sightline, plus a mirrored
    // pair of corner blocks. The upper line stone has been dragged east off its
    // slot, and that gap is the only way between the north and east door runs
    // that does not cross the middle. The vent stone on the axis is the anchor.
    a3_c_kilngrid: {
      id: 'a3_c_kilngrid', name: 'THE KILN GRID', type: 'combat', acts: [3],
      cast: { quarrybadger: 2, owl: 1.8, cindercrow: 1.4, ashelk: 0.7, doe: 0.5 },
      size: { w: 1250, h: 830 }, shape: 'pillars', lock: 'clear',
      archetype: 'crossroads', symmetry: 'mirrorY', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.3 }, { side: 'e', t: 0.7 }, { side: 'n', t: 0.5 }, { side: 's', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      anchor: { prop: 0 },
      solids: [
        { x: 215, y: 175, w: 30, h: 30, spr: 'slab' },
        { x: 215, y: 655, w: 30, h: 30, spr: 'slab' },
        { x: 505, y: 265, w: 30, h: 30, spr: 'slab' },
        { x: 655, y: 415, w: 30, h: 30, spr: 'slab' },
        { x: 445, y: 565, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'urn', x: 850, y: 415 },
        { id: 'bush', x: 950, y: 640 },
        { id: 'bush', x: 950, y: 200 },
      ],
      // The two door runs the crossing opens, north south and east.
      lanes: [{ w: 200 }, { w: 180 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomY', anchor: 'C', step: 480,
          members: [{ solid: 0 }, { solid: 1 }],
        },
        {
          type: 'line', axis: 'roomY', anchor: 'C', step: 258,
          members: [{ solid: 2 }, { solid: 3 }, { solid: 4 }],
          violation: { member: { solid: 2 }, slot: { x: 445, y: 265 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 330, y: 400 }, { x: 620, y: 600 },
        { x: 900, y: 200 }, { x: 900, y: 650 },
      ],
      waves: [
        { delay: 0.8, nextAt: 0.40, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
        { delay: 1.0, nextAt: 0.30, maxT: 60, name: 'THE SQUIRREL FLOOD', spawns: [{ id: 'squirrel', n: 20, mode: 'edge' }, { id: 'auto', n: 2, mode: 'marker' }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
        { delay: 1.2, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 1, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 445, y0: 265, x1: 445, y1: 565, w: 140 },
        { kind: 'cracks', x: 505, y: 265, r: 70 },
        { kind: 'patch', x: 850, y: 415, r: 110, role: 'ash' },
        { kind: 'patch', x: 215, y: 175, r: 80, role: 'char' },
        { kind: 'patch', x: 215, y: 655, r: 80, role: 'char' },
        { kind: 'path', from: { x: 46, y: 415 }, to: { x: 1250, y: 249 } },
        { kind: 'path', from: { x: 46, y: 415 }, to: { x: 1250, y: 581 } },
        { kind: 'path', from: { x: 46, y: 415 }, to: { x: 625, y: 0 } },
        { kind: 'path', from: { x: 46, y: 415 }, to: { x: 625, y: 830 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },
  },

  elite: {
    // THE BOWL. The court's floor is the empty middle, marked by the worn ring.
    // Four seats stand along the south side on one interval, and two more hold
    // the north approach. The east of that pair has been carried out of place,
    // which is the corner the elite will chase you into.
    a1_e_stumpcourt: {
      id: 'a1_e_stumpcourt', name: 'THE STUMP COURT', type: 'elite', acts: [1],
      cast: { chipchoir: 2.2, doe: 1.6, pineconepuffer: 1.4, squirrel: 0.6, bat: 0.5 },
      size: { w: 1080, h: 730 }, shape: 'round', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 246, y: 580, w: 40, h: 40, spr: 'slab' },
        { x: 834, y: 580, w: 40, h: 40, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 442, y: 580 },
        { id: 'stump', x: 638, y: 580 },
        { id: 'stump', x: 370, y: 235 },
        { id: 'stump', x: 780, y: 180 },
        { id: 'bush', x: 220, y: 640 },
        { id: 'basket', x: 880, y: 640 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 196,
          members: [{ solid: 0 }, { prop: 0 }, { prop: 1 }, { solid: 1 }],
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 340,
          members: [{ prop: 2 }, { prop: 3 }],
          violation: { member: { prop: 3 }, slot: { x: 710, y: 235 } },
        },
      ],
      scatter: { bush: [2, 4] },
      spawnMarkers: [
        { x: 120, y: 120 }, { x: 960, y: 460 }, { x: 620, y: 120 }, { x: 360, y: 420 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 26, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'ring', x: 540, y: 430, r: 150, w: 30 },
        { kind: 'patch', x: 442, y: 580, r: 46, role: 'dirt' },
        { kind: 'patch', x: 638, y: 580, r: 46, role: 'dirt' },
        { kind: 'patch', x: 246, y: 580, r: 40, role: 'moss' },
        { kind: 'patch', x: 834, y: 580, r: 40, role: 'moss' },
        { kind: 'patch', x: 370, y: 235, r: 44, role: 'dirt' },
        { kind: 'patch', x: 780, y: 180, r: 44, role: 'dirt' },
        { kind: 'path', from: { x: 46, y: 365 }, to: { x: 1080, y: 292 } },
        { kind: 'path', from: { x: 46, y: 365 }, to: { x: 540, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE LANES. The spill wall is the north treeline and the three gate blocks
    // stand along it on one interval, so the whole floor below is one long lane
    // and the fight runs its length. The middle block has been carried out into
    // the lane off its slot: passing inside it is the short way east and the
    // way that meets the elite head on.
    a2_e_spillway: {
      id: 'a2_e_spillway', name: 'THE SPILLWAY', type: 'elite', acts: [2],
      cast: { stiltheron: 2.2, bogfrog: 1.8, beaver: 1.6, raccoon: 0.6, ticktot: 0.5 },
      size: { w: 1130, h: 780 }, shape: 'rect', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 290, y: 175, w: 50, h: 44, spr: 'wall' },
        { x: 565, y: 262, w: 50, h: 44, spr: 'wall' },
        { x: 840, y: 175, w: 50, h: 44, spr: 'wall' },
      ],
      props: [
        { id: 'barrel', x: 290, y: 150 },
        { id: 'barrel', x: 840, y: 150 },
        { id: 'mailbox', x: 565, y: 560 },
        { id: 'bush', x: 200, y: 600 },
      ],
      // The long lane under the wall, and the mouth the displaced block opens.
      lanes: [{ w: 230 }, { w: 200 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 275,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 1 }, slot: { x: 565, y: 175 } },
        },
      ],
      scatter: { mailbox: [1, 3], bush: [2, 4] },
      spawnMarkers: [
        { x: 400, y: 380 }, { x: 700, y: 380 },
        { x: 900, y: 500 }, { x: 300, y: 700 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 24, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 500, y: 500, rx: 230, ry: 80 },
        { kind: 'pool', x: 880, y: 420, rx: 120, ry: 46 },
        { kind: 'patch', x: 290, y: 175, r: 70, role: 'mud' },
        { kind: 'patch', x: 840, y: 175, r: 70, role: 'mud' },
        { kind: 'patch', x: 565, y: 262, r: 70, role: 'mud' },
        { kind: 'path', from: { x: 46, y: 390 }, to: { x: 1130, y: 312 } },
        { kind: 'path', from: { x: 46, y: 390 }, to: { x: 678, y: 780 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE BOWL. Entry west and doors east and north strip the middle of the
    // yard, so the kiln stones stand along its south rim on one interval with
    // the open floor above them. The middle stone has been pulled out of the
    // rim into the yard: cutting inside it is the short way to the east door
    // and the way that runs closest to the elite.
    a3_e_kilnyard: {
      id: 'a3_e_kilnyard', name: 'THE KILN YARD', type: 'elite', acts: [3],
      cast: { quarrybadger: 2.4, ashelk: 1.8, boar: 1.2, owl: 0.6, doe: 0.5 },
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      archetype: 'bowl', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 320, y: 620, w: 30, h: 30, spr: 'slab' },
        { x: 605, y: 540, w: 30, h: 30, spr: 'slab' },
        { x: 890, y: 620, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'barrel', x: 320, y: 635 },
        { id: 'barrel', x: 890, y: 635 },
        { id: 'bush', x: 605, y: 200 },
        { id: 'bush', x: 200, y: 480 },
      ],
      // The open yard above the rim line, and the mouth the violation opens.
      lanes: [{ w: 230 }, { w: 190 }],
      formations: [
        {
          type: 'line', axis: 'roomX', anchor: 'C', step: 285,
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
          violation: { member: { solid: 1 }, slot: { x: 605, y: 620 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 400, y: 300 }, { x: 700, y: 300 },
        { x: 950, y: 420 }, { x: 560, y: 720 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 24, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 80, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'bowl', x: 605, y: 395, r0: 150, r1: 520 },
        { kind: 'burnband', x0: 320, y0: 620, x1: 890, y1: 620, w: 130 },
        { kind: 'cracks', x: 605, y: 540, r: 70 },
        { kind: 'path', from: { x: 46, y: 395 }, to: { x: 1210, y: 316 } },
        { kind: 'path', from: { x: 46, y: 395 }, to: { x: 666, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 3,
    },

    // -- one nastier elite per act: tight corridors that never seal a pocket --
    // THE LANES. Entry west, doors east and north: the two approach corridors
    // strip the middle, so the corridor of the name is the south band. Two
    // stumps hold its ends, two stones make the inner lane, and the east stone
    // has dropped back and inward, which turns the inner lane into the short
    // and dangerous way through.
    a1_e_thorncorridor: {
      id: 'a1_e_thorncorridor', name: 'THE THORN CORRIDOR', type: 'elite', acts: [1],
      cast: { rabbit: 2.2, ticktot: 1.8, squirrel: 1.2, bat: 0.5, doe: 0.6 },
      size: { w: 1130, h: 750 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.5 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 475, y: 455, w: 40, h: 40, spr: 'slab' },
        { x: 585, y: 525, w: 40, h: 40, spr: 'slab' },
        { x: 900, y: 590, w: 40, h: 40, spr: 'slab' },
      ],
      props: [
        { id: 'stump', x: 285, y: 570 },
        { id: 'stump', x: 845, y: 570 },
        { id: 'bush', x: 200, y: 200 },
        { id: 'basket', x: 900, y: 180 },
      ],
      lanes: [{ w: 200 }],
      formations: [
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 560,
          members: [{ prop: 0 }, { prop: 1 }],
        },
        {
          type: 'mirroredPair', axis: 'roomX', anchor: 'C', step: 180,
          members: [{ solid: 0 }, { solid: 1 }],
          violation: { member: { solid: 1 }, slot: { x: 655, y: 455 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 120, y: 120 }, { x: 1000, y: 440 }, { x: 120, y: 620 }, { x: 620, y: 120 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 26, mode: 'edge' }], elites: 1, drip: null, ref: null },
        { delay: 1.5, nextAt: 0, maxT: 70, spawns: [{ id: 'auto', n: 4, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 2, drip: null, ref: null },
      ],
      dressing: [
        { kind: 'ring', x: 565, y: 512, r: 150, w: 30 },
        { kind: 'patch', x: 285, y: 570, r: 46, role: 'dirt' },
        { kind: 'patch', x: 845, y: 570, r: 46, role: 'dirt' },
        { kind: 'patch', x: 475, y: 455, r: 40, role: 'moss' },
        { kind: 'patch', x: 585, y: 525, r: 40, role: 'moss' },
        { kind: 'path', from: { x: 46, y: 375 }, to: { x: 1130, y: 300 } },
        { kind: 'path', from: { x: 46, y: 375 }, to: { x: 565, y: 0 } },
      ],
      reward: { kind: 'auto' }, floor: 1,
    },

    // THE LANES, as a staggered pair. The causeway is the north row, three
    // blocks on one interval; the south row is two blocks with the cut itself
    // between them, declared as the one break. The south east block has been
    // carried downstream off its slot, and the cross over it opens is the short
    // way to the south door with the elite on your heels.
    a2_e_causewaycut: {
      id: 'a2_e_causewaycut', name: 'THE CAUSEWAY CUT', type: 'elite', acts: [2],
      cast: { sapperrat: 2.2, raccoon: 1.8, bogfrog: 1.2, bat: 0.5, chipchoir: 0.6 },
      size: { w: 1170, h: 770 }, shape: 'pillars', lock: 'clear',
      archetype: 'lanes', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 's', t: 0.6 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 305, y: 175, w: 50, h: 44, spr: 'wall' },
        { x: 585, y: 175, w: 50, h: 44, spr: 'wall' },
        { x: 850, y: 240, w: 50, h: 44, spr: 'wall' },
        { x: 430, y: 480, w: 50, h: 30, spr: 'log' },
        { x: 740, y: 480, w: 50, h: 30, spr: 'log' },
      ],
      props: [
        { id: 'mailbox', x: 585, y: 620 },
        { id: 'bush', x: 200, y: 600 },
        { id: 'bush', x: 1000, y: 620 },
      ],
      // The causeway walk and the water lane south of it.
      lanes: [{ w: 220 }, { w: 200 }],
      formations: [
        {
          type: 'staggeredLanePair', axis: 'roomX', anchor: 'C', step: 280,
          rows: [
            [{ solid: 0 }, { solid: 1 }, { solid: 2 }],
            [{ solid: 3 }, { solid: 4 }],
          ],
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }, { solid: 3 }, { solid: 4 }],
          violation: { member: { solid: 2 }, slot: { x: 865, y: 175 } },
        },
      ],
      scatter: { mailbox: [1, 3], bush: [2, 4] },
      spawnMarkers: [
        { x: 450, y: 300 }, { x: 640, y: 330 },
        { x: 980, y: 420 }, { x: 250, y: 690 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 24, mode: 'edge' }], elites: 1, drip: { id: 'auto', every: 9, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 75, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 7, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'pool', x: 585, y: 330, rx: 250, ry: 70 },
        { kind: 'pool', x: 600, y: 620, rx: 180, ry: 60 },
        { kind: 'patch', x: 305, y: 175, r: 70, role: 'mud' },
        { kind: 'patch', x: 850, y: 240, r: 70, role: 'mud' },
        { kind: 'patch', x: 430, y: 475, r: 70, role: 'moss' },
        { kind: 'path', from: { x: 46, y: 385 }, to: { x: 1170, y: 308 } },
        { kind: 'path', from: { x: 46, y: 385 }, to: { x: 702, y: 770 } },
      ],
      reward: { kind: 'auto' }, floor: 2,
    },

    // THE GAUNTLET. The maze is two staggered rows of cinder blocks across the
    // one clear band, so there is no corner to stand in and the fight is a
    // figure of eight through the stagger gaps. The east block of the upper row
    // has dropped into the lower one off its slot: that is the crossing the
    // player learns and uses over and over.
    a3_e_cindermaze: {
      id: 'a3_e_cindermaze', name: 'THE CINDER MAZE', type: 'elite', acts: [3],
      cast: { cindercrow: 2.6, fox: 1.8, quarrybadger: 1.2, owl: 0.6, boar: 0.5 },
      size: { w: 1210, h: 790 }, shape: 'pillars', lock: 'clear',
      archetype: 'gauntlet', symmetry: 'mirrorX', scatterZone: 'both',
      doors: [{ side: 'e', t: 0.4 }, { side: 'n', t: 0.55 }],
      entry: { side: 'w', t: 0.5 },
      solids: [
        { x: 475, y: 500, w: 30, h: 30, spr: 'slab' },
        { x: 735, y: 500, w: 30, h: 30, spr: 'slab' },
        { x: 350, y: 600, w: 30, h: 30, spr: 'slab' },
        { x: 605, y: 600, w: 30, h: 30, spr: 'slab' },
        { x: 860, y: 500, w: 30, h: 30, spr: 'slab' },
      ],
      props: [
        { id: 'bush', x: 605, y: 220 },
        { id: 'bush', x: 250, y: 300 },
        { id: 'bush', x: 980, y: 300 },
      ],
      // The two stagger gaps the figure of eight runs through.
      lanes: [{ w: 220 }, { w: 190 }],
      formations: [
        {
          type: 'staggeredLanePair', axis: 'roomX', anchor: 'C', step: 255,
          rows: [
            [{ solid: 0 }, { solid: 1 }],
            [{ solid: 2 }, { solid: 3 }, { solid: 4 }],
          ],
          members: [{ solid: 0 }, { solid: 1 }, { solid: 2 }, { solid: 3 }, { solid: 4 }],
          violation: { member: { solid: 4 }, slot: { x: 860, y: 600 } },
        },
      ],
      scatter: { bush: [3, 6] },
      spawnMarkers: [
        { x: 400, y: 300 }, { x: 700, y: 300 },
        { x: 950, y: 250 }, { x: 760, y: 740 },
      ],
      waves: [
        { delay: 1.0, nextAt: 0.30, maxT: 60, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 24, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 8, n: 1 }, ref: null },
        { delay: 1.6, nextAt: 0, maxT: 80, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 22, mode: 'edge' }], elites: 2, drip: { id: 'auto', every: 6, n: 1 }, ref: null },
      ],
      dressing: [
        { kind: 'burnband', x0: 475, y0: 500, x1: 735, y1: 500, w: 120 },
        { kind: 'burnband', x0: 350, y0: 600, x1: 860, y1: 600, w: 120 },
        { kind: 'cracks', x: 860, y: 500, r: 70 },
        { kind: 'patch', x: 605, y: 380, r: 140, role: 'ash' },
        { kind: 'path', from: { x: 46, y: 395 }, to: { x: 1210, y: 316 } },
        { kind: 'path', from: { x: 46, y: 395 }, to: { x: 666, y: 0 } },
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
        { x: 392, y: 390, w: 90, h: 90, spr: 'slab' },
        { x: 798, y: 420, w: 90, h: 90, spr: 'slab' },
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
        { x: 421, y: 422, w: 98, h: 98, spr: 'slab' },
        { x: 888, y: 422, w: 98, h: 98, spr: 'slab' },
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
