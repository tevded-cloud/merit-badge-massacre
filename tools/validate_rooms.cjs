// Merit Badge Massacre: the layout validator. Author tooling, never shipped.
//
// LEVEL_DESIGN.md section 8 specifies 50 predicates in 7 groups (A 7, B 7,
// C 12, D 6, E 5, F 9, G 4). Section 10 names writing this pass as the rebuild's
// first unit: the js/rooms.js header claims the house rules are "checked by the
// assertion pass" and no such pass has ever existed, which is how five bodies
// over the wall line and five unusable spawn markers shipped in BOULDER RUN.
//
// Run:   npm run rooms:check
//        node tools/validate_rooms.cjs --layout a1_c_boulderrun
//        node tools/validate_rooms.cjs --json
//        node tools/validate_rooms.cjs --selftest
//
// Exit code is 1 if any layout fails a predicate that was actually evaluated,
// 0 otherwise. Skips never fail the run; they are counted as warnings.
//
// ---------------------------------------------------------------------------
// How the engine is loaded
// ---------------------------------------------------------------------------
// js/data.js, js/props.js, js/collide.js, js/room.js and js/rooms.js are plain
// browser scripts with no imports and no exports: they declare top level consts
// and expect a handful of globals to exist. They are concatenated into one
// source blob behind a small stub header and evaluated once in a vm context, so
// every top level const lands in the same lexical scope and the blob's final
// expression can hand the tables back. No DOM, no canvas, no game state.
//
// ---------------------------------------------------------------------------
// Coordinate conventions (LEVEL_DESIGN.md section 0.0), restated because every
// measurement below depends on them
// ---------------------------------------------------------------------------
// A solid's x, y is the CENTRE of its AABB. A solid prop's x, y is its centre
// and its footprint is a disc of PROPS[id].r. Room local coordinates put the
// origin at the top left. Every distance involving a body is to its SURFACE:
// AABB edge for a solid, centre minus r for a prop.
//
// ---------------------------------------------------------------------------
// Two measurement domains, deliberately kept apart
// ---------------------------------------------------------------------------
// The 44 arithmetic predicates measure prop footprints as discs of PROPS[id].r,
// which is what the doctrine specifies and what the player collides with. The
// 6 grid predicates (B6, B7, G1 to G4) run against the real block grid built by
// Room.enter() plus Room.buildGrid(), where spawnProp() bakes a prop as a box
// of w * 0.36 by r * 0.8 (js/props.js:160). The two disagree on purpose: the
// doctrine's clearances are authoring rules, the grid is engine truth about
// what a body can walk through.
//
// Scatter is stripped before the grid is built. def.scatter is rolled fresh on
// every room entry, so any grid predicate that included it would be measuring a
// different room each run. Grid predicates therefore measure the authored
// layout only, which is the thing a layout can be held to.
//
// ---------------------------------------------------------------------------
// Declared composition: the two additive fields section 8 proposes
// ---------------------------------------------------------------------------
// No layout declares any of these today, so every predicate that needs one
// SKIPS with a counted warning rather than failing. The declared path is fully
// implemented and is exercised by --selftest, which runs section 9.3's worked
// BOULDER RUN rebuild through all 50 predicates.
//
//   def.formations  [{ type, axis, anchor, step, members: [ref...],
//                      break?: gapIndex, rows?: [[ref...], [ref...]],
//                      violation?: { member: ref, slot: { x, y } } }]
//   def.scatterZone 'fringe' | 'feet' | 'both'
//   def.symmetry    'mirrorX' | 'mirrorY' | 'rot180' | 'radial3'..'radial8'
//   def.archetype   'bowl'|'lanes'|'pockets'|'ring'|'funnel'|'crossroads'|
//                   'gauntlet'|'den'
//   def.anchor      ref, the one focal body exempt from formation membership
//   def.lanes       [{ w }] declared lane clear widths, world units
//   ref             { solid: i } | { prop: i }
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(REPO_ROOT, 'js');

// ---------------------------------------------------------------------------
// The derived unit set (LEVEL_DESIGN.md section 0)
// ---------------------------------------------------------------------------
const U = {
  D: 105,              // reference dodge travel
  Pr: 11,              // player radius
  Er: 17,              // widest enemy radius (ashelk)
  TILE: 24,            // ROOM_CELL
  WALL: 130,           // shipped wall clearance house rule
  PEEK: 108,           // RD_PEEK camera overscan
  VHX: 455,            // view half width at ZOOM 1.5 on 1366 x 768
  VHY: 256,            // view half height, the binding one
  GAP_MIN: 158,        // 1.5 D
  GAP_MAX: 263,        // 2.5 D
  LANE_MIN: 130,
  LANE_MAX: 240,
  MARKER_CLEAR: 135,
  PAIR_TOL: 52,        // 0.5 D
  FRINGE: 158,         // 1.5 D from any wall
  FOOT: 52,            // 0.5 D from a formation member
  COMP_W: 910,         // composition rect, one screen wide
  COMP_H: 510,
  AXIS_TOL_DEG: 5,
  STEP_TOL: 8,
  ENTRY_INSET: 46,     // ROOM_ENTRY_INSET
  DOOR_R: 46,          // ROOM_DOOR_R
  EDGE_AWAY: 190,      // ROOM_EDGE_AWAY
  SPAWN_INSET: 32,     // ROOM_SPAWN_INSET
  RELEASE: 0.06,       // ROOM_RELEASE
  ARRIVAL_MAX: 1.56,   // 26 bodies of pouring
  RING_MIN: 190,
  RING_MAX: 256,
  DENSITY_MIN: 0.3,
  DENSITY_MAX: 1.2,
  KILL_MIN: 50,
  KILL_MAX: 70,
  DOOR_SAME_WALL: 200,
  DOOR_OPPOSITE_T: 0.08,
  HEADCOUNT_TOL: 2,    // see F8 note
};

// The closed formation vocabulary, section 2.1. Eight table rows, ten ids
// because "L and double L" and "Ring and half ring" each name two.
const FORMATION_TYPES = [
  'mirroredpair', 'line', 'brokenline', 'arc', 'diamond',
  'l', 'doublel', 'ring', 'halfring', 'staggeredlanepair',
];

// Formations whose members sit on a repeating interval, so B2 and B4 mean
// something. A mirrored pair's separation is set by the symmetry operation, not
// by a crossing interval: section 9.3's rebuilt BOULDER RUN carries a mirrored
// pair of logs 618 units apart and section 9.4 still records B2 as passing, so
// the gap band cannot be applied to that type.
const STEPPED_TYPES = new Set([
  'line', 'brokenline', 'arc', 'diamond', 'ring', 'halfring', 'staggeredlanepair',
]);

// Section 3.9's archetype table, door column.
const ARCHETYPE_DOORS = {
  bowl: [2, 3], lanes: [2, 3], pockets: [3, 3], ring: [2, 3],
  funnel: [2, 2], crossroads: [3, 3], gauntlet: [1, 2], den: [1, 1],
};

// Section 7's per act dressing sets. 'path' and 'road' are exempt everywhere:
// section 9.3 reads them as structural rather than motif dressing, since Rule
// 6.3 requires the door paths in rooms whose doors are not visible from entry.
const ACT_DRESSING = {
  1: { kinds: ['path', 'patch', 'bowl', 'ring'], roles: ['dirt', 'needle', 'moss'], corrupt: ['cracks'] },
  2: { kinds: ['pool', 'patch', 'path', 'road'], roles: ['mud', 'moss'], corrupt: ['cracks'] },
  3: { kinds: ['burnband', 'scree', 'cracks', 'patch', 'bowl'], roles: ['ash', 'char', 'scree'], corrupt: [] },
};

// ---------------------------------------------------------------------------
// Engine load
// ---------------------------------------------------------------------------
function loadEngine() {
  const files = ['data.js', 'props.js', 'collide.js', 'room.js', 'rooms.js'];
  const stub = [
    '"use strict";',
    'var TAU = Math.PI * 2;',
    'function rand(a, b) { return a + Math.random() * (b - a); }',
    'function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }',
    'var SPR = { get: function () { return null; }, drawBottom: function () {},',
    '            height: function () { return 84; }, icon: function () {} };',
    'var AudioSys = { play: function () {} };',
    'function Game() {',
    '  this.props = []; this.parts = []; this.corpses = []; this.pickups = [];',
    '  this.enemies = []; this.room = null; this.nextId = 1; this.act = 1;',
    '  this.player = null; this.threat = 0;',
    '}',
    'Game.prototype.gainCoins = function () {};',
    'Game.prototype.spawnBurst = function () {};',
    'Game.prototype.spawnPuff = function () {};',
    'Game.prototype.dropGems = function () {};',
    'Game.prototype.spawnEnemy = function () { return null; };',
    'Game.prototype.toast = function () {};',
    '',
  ].join('\n');

  const parts = [stub];
  files.forEach((f) => {
    parts.push('\n// ================= ' + f + ' =================\n');
    parts.push(fs.readFileSync(path.join(JS_DIR, f), 'utf8'));
  });
  parts.push('\n;({ DATA: DATA, PROPS: PROPS, ROOMS: ROOMS, WAVE_TEMPLATES: WAVE_TEMPLATES,');
  parts.push('  Room: Room, Collide: Collide, Game: Game, ROOM_CELL: ROOM_CELL,');
  parts.push('  ROOM_ENTRY_INSET: ROOM_ENTRY_INSET, ROOM_DOOR_R: ROOM_DOOR_R });\n');

  const sandbox = { console, Math, JSON, Object, Array, Uint8Array, Number, String };
  sandbox.globalThis = sandbox;
  return vm.runInNewContext(parts.join(''), sandbox, { filename: 'mbm-engine-blob.js' });
}

const ENGINE = loadEngine();
const PROPS = ENGINE.PROPS;
const ROOMS = ENGINE.ROOMS;
const WAVE_TEMPLATES = ENGINE.WAVE_TEMPLATES;

// ---------------------------------------------------------------------------
// Geometry, all room local unless a name says world
// ---------------------------------------------------------------------------
function r1(n) { return Math.round(n * 10) / 10; }
function hyp(dx, dy) { return Math.sqrt(dx * dx + dy * dy); }

function pointBoxDist(px, py, b) {
  const dx = Math.max(b.x0 - px, 0, px - b.x1);
  const dy = Math.max(b.y0 - py, 0, py - b.y1);
  return hyp(dx, dy);
}

function boxBoxGap(a, b) {
  const dx = Math.max(a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(a.y0 - b.y1, b.y0 - a.y1);
  if (dx < 0 && dy < 0) return Math.max(dx, dy); // overlapping, negative
  return hyp(Math.max(dx, 0), Math.max(dy, 0));
}

// Distance from a point to a body's surface. Negative means inside.
function pointBodyDist(px, py, body) {
  if (body.kind === 'solid') return pointBoxDist(px, py, body);
  return hyp(px - body.cx, py - body.cy) - body.r;
}

// Edge to edge gap between two bodies.
function bodyGap(a, b) {
  if (a.kind === 'solid' && b.kind === 'solid') return boxBoxGap(a, b);
  if (a.kind === 'prop' && b.kind === 'prop') {
    return hyp(a.cx - b.cx, a.cy - b.cy) - a.r - b.r;
  }
  const disc = a.kind === 'prop' ? a : b;
  const box = a.kind === 'prop' ? b : a;
  return pointBoxDist(disc.cx, disc.cy, box) - disc.r;
}

function bodyExtent(body) {
  if (body.kind === 'solid') return { x0: body.x0, y0: body.y0, x1: body.x1, y1: body.y1 };
  return { x0: body.cx - body.r, y0: body.cy - body.r, x1: body.cx + body.r, y1: body.cy + body.r };
}

function bodyWallDist(body, w, h) {
  const e = bodyExtent(body);
  return Math.min(e.x0, e.y0, w - e.x1, h - e.y1);
}

function segPointDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return hyp(px - (ax + t * dx), py - (ay + t * dy));
}

function segSegDist(ax, ay, bx, by, cx, cy, dx2, dy2) {
  // Cheap and exact enough: if they cross the distance is 0, otherwise the
  // minimum is achieved at an endpoint against the other segment.
  const d1x = bx - ax, d1y = by - ay, d2x = dx2 - cx, d2y = dy2 - cy;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) > 1e-12) {
    const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den;
    const u = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(
    segPointDist(ax, ay, bx, by, cx, cy),
    segPointDist(ax, ay, bx, by, dx2, dy2),
    segPointDist(cx, cy, dx2, dy2, ax, ay),
    segPointDist(cx, cy, dx2, dy2, bx, by)
  );
}

function segBoxDist(ax, ay, bx, by, box) {
  const inside = (x, y) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
  if (inside(ax, ay) || inside(bx, by)) return 0;
  return Math.min(
    segSegDist(ax, ay, bx, by, box.x0, box.y0, box.x1, box.y0),
    segSegDist(ax, ay, bx, by, box.x1, box.y0, box.x1, box.y1),
    segSegDist(ax, ay, bx, by, box.x1, box.y1, box.x0, box.y1),
    segSegDist(ax, ay, bx, by, box.x0, box.y1, box.x0, box.y0)
  );
}

function segBodyDist(ax, ay, bx, by, body) {
  if (body.kind === 'solid') return segBoxDist(ax, ay, bx, by, body);
  return segPointDist(ax, ay, bx, by, body.cx, body.cy) - body.r;
}

function norm180(deg) { let d = deg % 180; if (d < 0) d += 180; return d; }
function angDiff180(a, b) { const d = Math.abs(norm180(a) - norm180(b)); return d > 90 ? 180 - d : d; }

// Principal axis of a point set, in degrees, mod 180.
function fitAxisDeg(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let mx = 0, my = 0;
  pts.forEach((p) => { mx += p.x; my += p.y; });
  mx /= n; my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  pts.forEach((p) => {
    const dx = p.x - mx, dy = p.y - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  });
  return norm180(0.5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI);
}

function centroid(pts) {
  let mx = 0, my = 0;
  pts.forEach((p) => { mx += p.x; my += p.y; });
  return { x: mx / pts.length, y: my / pts.length };
}

function rectIntersectArea(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return (w > 0 && h > 0) ? w * h : 0;
}

function inRect(x, y, r) { return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; }

// ---------------------------------------------------------------------------
// Room resolution
// ---------------------------------------------------------------------------
function wallPointLocal(side, t, w, h) {
  const f = t == null ? 0.5 : t;
  if (side === 'n') return { x: f * w, y: 0 };
  if (side === 's') return { x: f * w, y: h };
  if (side === 'e') return { x: w, y: f * h };
  return { x: 0, y: f * h };
}

function inward(side) {
  if (side === 'n') return { x: 0, y: 1 };
  if (side === 's') return { x: 0, y: -1 };
  if (side === 'e') return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function resolveRoom(def) {
  const w = def.size && def.size.w ? def.size.w : 0;
  const h = def.size && def.size.h ? def.size.h : 0;
  const C = { x: w / 2, y: h / 2 };

  const bodies = [];
  (def.solids || []).forEach((s, i) => {
    const hw = (s.w || 0) / 2, hh = (s.h || 0) / 2;
    bodies.push({
      kind: 'solid', idx: i, ref: 'solid:' + i,
      label: 'solid ' + i + " '" + (s.spr || '?') + "'",
      cx: s.x, cy: s.y, x0: s.x - hw, y0: s.y - hh, x1: s.x + hw, y1: s.y + hh,
    });
  });
  (def.props || []).forEach((p, i) => {
    const pd = PROPS[p.id];
    if (!pd || !pd.solid) return;
    bodies.push({
      kind: 'prop', idx: i, ref: 'prop:' + i,
      label: 'prop ' + i + " '" + p.id + "'",
      cx: p.x, cy: p.y, r: pd.r,
    });
  });

  const solids = bodies.filter((b) => b.kind === 'solid');
  const props = bodies.filter((b) => b.kind === 'prop');

  const ew = wallPointLocal(def.entry ? def.entry.side : 'w', def.entry ? def.entry.t : 0.5, w, h);
  const en = inward(def.entry ? def.entry.side : 'w');
  const E = { x: ew.x + en.x * U.ENTRY_INSET, y: ew.y + en.y * U.ENTRY_INSET };

  const doors = (def.doors || []).map((d, i) => {
    const p = wallPointLocal(d.side, d.t, w, h);
    return { i, side: d.side, t: d.t, x: p.x, y: p.y };
  });

  // Entry view rect, worked exactly as js/render.js:34-37 does it.
  const camAxis = (span, at, half) =>
    (span + U.PEEK * 2 < half * 2) ? span / 2
      : Math.max(-U.PEEK + half, Math.min(span + U.PEEK - half, at));
  const camx = camAxis(w, E.x, U.VHX);
  const camy = camAxis(h, E.y, U.VHY);
  const viewRect = { x0: camx - U.VHX, y0: camy - U.VHY, x1: camx + U.VHX, y1: camy + U.VHY };

  const insetRect = { x0: U.WALL, y0: U.WALL, x1: w - U.WALL, y1: h - U.WALL };
  const compRect = {
    x0: C.x - U.COMP_W / 2, y0: C.y - U.COMP_H / 2,
    x1: C.x + U.COMP_W / 2, y1: C.y + U.COMP_H / 2,
  };

  const waves = (def.waves || []).map((raw) => {
    const w2 = raw || {};
    let spawns = Array.isArray(w2.spawns) ? w2.spawns : [];
    let fromRef = null;
    if (w2.ref && WAVE_TEMPLATES[w2.ref]) {
      spawns = WAVE_TEMPLATES[w2.ref].spawns || [];
      fromRef = w2.ref;
    }
    const n = spawns.reduce((a, s) => a + (s && s.n > 0 ? (s.n | 0) : 0), 0);
    return {
      delay: w2.delay || 0, nextAt: w2.nextAt || 0, maxT: w2.maxT || 0,
      drip: w2.drip || null, spawns, fromRef, n,
    };
  });

  const act = def.floor != null ? def.floor : (Array.isArray(def.acts) && def.acts.length
    ? Math.min.apply(null, def.acts) : 1);

  const type = def.type || 'combat';
  const isCombat = type === 'combat' || type === 'elite';
  const isBoss = type === 'boss';

  return {
    def, w, h, C, bodies, solids, props, E, doors, viewRect, insetRect, compRect,
    waves, act, type, isCombat, isBoss, isFight: isCombat || isBoss,
    markers: (def.spawnMarkers || []).slice(),
    dressing: Array.isArray(def.dressing) ? def.dressing : null,
    corruption: def.corruption === 1 ? 1 : 0,
    trueDiagDeg: (def.size && def.size.w)
      ? Math.atan2(h - 2 * U.WALL, w - 2 * U.WALL) * 180 / Math.PI : 29.3,
  };
}

// ---------------------------------------------------------------------------
// Declared composition, resolved when present
// ---------------------------------------------------------------------------
function refKey(ref) {
  if (!ref || typeof ref !== 'object') return null;
  if (ref.solid != null) return 'solid:' + ref.solid;
  if (ref.prop != null) return 'prop:' + ref.prop;
  return null;
}

function normType(t) { return String(t || '').toLowerCase().replace(/[^a-z]/g, ''); }

function resolveFormations(R) {
  const raw = R.def.formations;
  if (!Array.isArray(raw) || !raw.length) return null;
  const byRef = {};
  R.bodies.forEach((b) => { byRef[b.ref] = b; });

  const out = raw.map((f, fi) => {
    const members = [];
    const missing = [];
    (f.members || []).forEach((ref) => {
      const key = refKey(ref);
      const b = key ? byRef[key] : null;
      if (b) members.push(b); else missing.push(JSON.stringify(ref));
    });
    let violation = null;
    if (f.violation && f.violation.member && f.violation.slot) {
      const key = refKey(f.violation.member);
      const b = key ? byRef[key] : null;
      if (b) {
        violation = {
          body: b, slot: f.violation.slot,
          mag: hyp(b.cx - f.violation.slot.x, b.cy - f.violation.slot.y),
        };
      }
    }
    return {
      i: fi, type: normType(f.type), rawType: f.type, axis: f.axis, anchor: f.anchor,
      step: f.step, brk: (typeof f.break === 'number') ? f.break : null,
      rows: f.rows || null, members, missing, violation,
    };
  });
  return out;
}

// A member's position with any declared violation snapped back to its slot.
// B2, B4 and C4 measure the lattice, not the displacement: the displacement is
// C5's and C6's business, and section 9.4 records the rebuilt BOULDER RUN as
// passing B4 with a step spread of 0.8, which is only true on the lattice.
function snappedPos(form, body) {
  if (form.violation && form.violation.body === body) {
    return { x: form.violation.slot.x, y: form.violation.slot.y, body };
  }
  return { x: body.cx, y: body.cy, body };
}

// Canonical member order per formation type, so "consecutive" means what the
// geometry says rather than what the author happened to type.
function orderedMembers(form, useSnapped) {
  const pts = form.members.map((b) => (useSnapped ? snappedPos(form, b) : { x: b.cx, y: b.cy, body: b }));
  if (pts.length < 2) return [{ seq: pts, wrap: false }];
  const t = form.type;

  if (t === 'ring' || t === 'halfring' || t === 'arc' || t === 'diamond') {
    const c = centroid(pts);
    const seq = pts.slice().sort((a, b) =>
      Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
    return [{ seq, wrap: t === 'ring' || t === 'diamond' }];
  }

  if (t === 'staggeredlanepair') {
    const axis = fitAxisDeg(pts) || 0;
    const ux = Math.cos(axis * Math.PI / 180), uy = Math.sin(axis * Math.PI / 180);
    const c = centroid(pts);
    let rows;
    if (form.rows && form.rows.length === 2) {
      const byRef = {};
      pts.forEach((p) => { byRef[p.body.ref] = p; });
      rows = form.rows.map((list) => list.map(refKey).map((k) => byRef[k]).filter(Boolean));
    } else {
      const perp = pts.map((p) => ({ p, v: -(p.x - c.x) * uy + (p.y - c.y) * ux }));
      rows = [perp.filter((e) => e.v < 0).map((e) => e.p), perp.filter((e) => e.v >= 0).map((e) => e.p)];
    }
    return rows.filter((rw) => rw.length >= 2).map((rw) => ({
      seq: rw.slice().sort((a, b) => (a.x * ux + a.y * uy) - (b.x * ux + b.y * uy)),
      wrap: false,
    }));
  }

  if (t === 'doublel') {
    const half = Math.ceil(pts.length / 2);
    return [{ seq: pts.slice(0, half), wrap: false }, { seq: pts.slice(half), wrap: false }];
  }

  if (t === 'l') return [{ seq: pts, wrap: false }];

  // line, brokenline, mirroredpair: order along the fitted axis
  const axis = fitAxisDeg(pts) || 0;
  const ux = Math.cos(axis * Math.PI / 180), uy = Math.sin(axis * Math.PI / 180);
  return [{ seq: pts.slice().sort((a, b) => (a.x * ux + a.y * uy) - (b.x * ux + b.y * uy)), wrap: false }];
}

function gapBetween(a, b) {
  // a and b are { x, y, body }: measure surface to surface using the body's own
  // shape but the (possibly snapped) position.
  const shift = (p) => {
    const bd = p.body;
    if (bd.kind === 'prop') return { kind: 'prop', cx: p.x, cy: p.y, r: bd.r };
    const hw = (bd.x1 - bd.x0) / 2, hh = (bd.y1 - bd.y0) / 2;
    return { kind: 'solid', x0: p.x - hw, y0: p.y - hh, x1: p.x + hw, y1: p.y + hh };
  };
  return bodyGap(shift(a), shift(b));
}

// ---------------------------------------------------------------------------
// The block grid, built once per layout through the real engine
// ---------------------------------------------------------------------------
function buildGridRoom(def) {
  const clone = Object.assign({}, def, { scatter: null });
  const room = new ENGINE.Room(clone, () => 0.5);
  const g = new ENGINE.Game();
  g.player = null;
  room.enter(g);
  return room;
}

function gridCellOf(room, wx, wy) {
  const gr = room.grid;
  let gx = Math.floor((wx - gr.x0) / gr.cell);
  let gy = Math.floor((wy - gr.y0) / gr.cell);
  gx = Math.max(0, Math.min(gr.cw - 1, gx));
  gy = Math.max(0, Math.min(gr.ch - 1, gy));
  return { gx, gy, i: gy * gr.cw + gx };
}

function floodFree(room, startCells) {
  const gr = room.grid;
  const seen = new Uint8Array(gr.cw * gr.ch);
  const stack = [];
  startCells.forEach((c) => {
    if (gr.data[c.i] === 0 && !seen[c.i]) { seen[c.i] = 1; stack.push(c.i); }
  });
  while (stack.length) {
    const i = stack.pop();
    const gx = i % gr.cw, gy = (i / gr.cw) | 0;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= gr.cw || ny >= gr.ch) return;
      const j = ny * gr.cw + nx;
      if (seen[j] || gr.data[j] !== 0) return;
      seen[j] = 1; stack.push(j);
    };
    push(gx + 1, gy); push(gx - 1, gy); push(gx, gy + 1); push(gx, gy - 1);
  }
  return seen;
}

// Clearance per free cell: distance from the cell centre to the nearest baked
// solid box and to the four bounds. Walls count, because a corridor between a
// solid and the treeline is exactly as narrow as it looks.
function clearanceField(room) {
  const gr = room.grid;
  const b = room.bounds;
  const out = new Float64Array(gr.cw * gr.ch);
  for (let gy = 0; gy < gr.ch; gy++) {
    for (let gx = 0; gx < gr.cw; gx++) {
      const i = gy * gr.cw + gx;
      if (gr.data[i] !== 0) { out[i] = -1; continue; }
      const cx = gr.x0 + (gx + 0.5) * gr.cell;
      const cy = gr.y0 + (gy + 0.5) * gr.cell;
      let best = Math.min(cx - b.x0, b.x1 - cx, cy - b.y0, b.y1 - cy);
      for (let s = 0; s < room.solids.length; s++) {
        const d = pointBoxDist(cx, cy, room.solids[s]);
        if (d < best) best = d;
      }
      out[i] = best;
    }
  }
  return out;
}

// The grid cells a body's own footprint stamps, in world cell indices. Props
// bake as w * 0.36 by r * 0.8 (js/props.js:160), not as the full disc.
function ownFootprintCells(room, R, body) {
  let hw, hh;
  if (body.kind === 'solid') {
    hw = (body.x1 - body.x0) / 2; hh = (body.y1 - body.y0) / 2;
  } else {
    const pd = PROPS[R.def.props[body.idx].id];
    hw = pd.w * 0.36; hh = pd.r * 0.8;
  }
  const wx = body.cx - R.w / 2, wy = body.cy - R.h / 2;
  const a = gridCellOf(room, wx - hw, wy - hh);
  const b = gridCellOf(room, wx + hw, wy + hh);
  return { gx0: a.gx, gy0: a.gy, gx1: b.gx, gy1: b.gy };
}

function connectedAtThreshold(room, clear, cells, thr) {
  const gr = room.grid;
  const ok = (i) => gr.data[i] === 0 && clear[i] >= thr;
  if (!cells.every((c) => ok(c.i))) return false;
  const seen = new Uint8Array(gr.cw * gr.ch);
  const stack = [cells[0].i];
  seen[cells[0].i] = 1;
  while (stack.length) {
    const i = stack.pop();
    const gx = i % gr.cw, gy = (i / gr.cw) | 0;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= gr.cw || ny >= gr.ch) return;
      const j = ny * gr.cw + nx;
      if (seen[j] || !ok(j)) return;
      seen[j] = 1; stack.push(j);
    };
    push(gx + 1, gy); push(gx - 1, gy); push(gx, gy + 1); push(gx, gy - 1);
  }
  return cells.every((c) => seen[c.i] === 1);
}

// ---------------------------------------------------------------------------
// Result plumbing
// ---------------------------------------------------------------------------
const PASS = 'pass', FAIL = 'fail', SKIP = 'skip', NA = 'na';

function mk(status, detail, measured, bound) {
  return { status, detail: detail || '', measured: measured == null ? null : measured, bound: bound || '' };
}
const pass = (d, m, b) => mk(PASS, d, m, b);
const fail = (d, m, b) => mk(FAIL, d, m, b);
const skip = (d) => mk(SKIP, d, null, '');
const na = (d) => mk(NA, d, null, '');

// Aggregates a list of per item complaints into one result.
function verdict(bad, okDetail, bound, worst) {
  if (!bad.length) return pass(okDetail, worst == null ? null : r1(worst), bound);
  return fail(bad.join('; '), worst == null ? null : r1(worst), bound);
}

// ---------------------------------------------------------------------------
// Group A: size, shape and budget
// ---------------------------------------------------------------------------
const PREDS = {};

PREDS.A1 = { group: 'A', text: 'size inside the catalogue band', run(R) {
  if (!R.isCombat) return na('size band is stated for combat and elite only');
  const bad = [];
  if (!(R.w >= 1000 && R.w <= 1250)) bad.push('w ' + R.w + ' outside [1000, 1250]');
  if (!(R.h >= 700 && R.h <= 830)) bad.push('h ' + R.h + ' outside [700, 830]');
  return verdict(bad, R.w + ' x ' + R.h, 'w [1000,1250], h [700,830]');
} };

PREDS.A2 = { group: 'A', text: 'solid count 2 to 5', run(R) {
  if (!R.isCombat) return na('house rule is per combat room');
  const n = R.solids.length;
  if (n >= 2 && n <= 5) return pass(n + ' solids', n, '[2, 5]');
  return fail('solid count ' + n, n, '[2, 5]');
} };

PREDS.A3 = { group: 'A', text: 'solids 130 off every wall', run(R) {
  if (!R.solids.length) return na('no solids');
  const bad = []; let worst = Infinity;
  R.solids.forEach((s) => {
    const d = bodyWallDist(s, R.w, R.h);
    if (d < worst) worst = d;
    if (d < U.WALL) bad.push(s.label + ' wall clearance ' + r1(d));
  });
  return verdict(bad, 'min wall clearance ' + r1(worst), '>= 130', worst);
} };

PREDS.A4 = { group: 'A', text: 'solid to solid gap 75', run(R) {
  if (R.solids.length < 2) return na('fewer than two solids');
  const bad = []; let worst = Infinity;
  for (let i = 0; i < R.solids.length; i++) {
    for (let j = i + 1; j < R.solids.length; j++) {
      const g = bodyGap(R.solids[i], R.solids[j]);
      if (g < worst) worst = g;
      if (g < 75) bad.push(R.solids[i].label + ' to ' + R.solids[j].label + ' gap ' + r1(g));
    }
  }
  return verdict(bad, 'min solid gap ' + r1(worst), '>= 75', worst);
} };

PREDS.A5 = { group: 'A', text: 'kill budget 50 to 70', run(R) {
  if (!R.isCombat) return na('kill budget is per combat room');
  if (!R.waves.length) return na('no waves');
  const total = R.waves.reduce((a, w) => a + w.n, 0);
  if (total >= U.KILL_MIN && total <= U.KILL_MAX) return pass(total + ' authored spawns', total, '[50, 70]');
  return fail('kill budget ' + total, total, '[50, 70]');
} };

PREDS.A6 = { group: 'A', text: 'wave arrival under 1.56 s', run(R) {
  if (!R.waves.length) return na('no waves');
  const bad = []; let worst = 0;
  R.waves.forEach((w, i) => {
    const t = w.n * U.RELEASE;
    if (t > worst) worst = t;
    if (t > U.ARRIVAL_MAX + 1e-9) {
      bad.push('wave ' + (i + 1) + (w.fromRef ? ' (' + w.fromRef + ')' : '') +
        ' n ' + w.n + ' arrives over ' + r1(t) + ' s');
    }
  });
  return verdict(bad, 'longest arrival ' + r1(worst) + ' s', '<= 1.56 s', worst);
} };

PREDS.A7 = { group: 'A', text: 'solid body density', run(R) {
  if (!R.isCombat) return na('density band is per combat room');
  const tiles = (R.w * R.h) / (U.TILE * U.TILE);
  const dens = R.bodies.length / tiles * 100;
  if (dens >= U.DENSITY_MIN && dens <= U.DENSITY_MAX) {
    return pass(R.bodies.length + ' bodies, ' + dens.toFixed(2) + ' per 100 tu', r1(dens), '[0.3, 1.2]');
  }
  return fail(R.bodies.length + ' bodies, density ' + dens.toFixed(2) + ' per 100 tu', r1(dens), '[0.3, 1.2]');
} };

// ---------------------------------------------------------------------------
// Group B: geometry and clearance
// ---------------------------------------------------------------------------
PREDS.B1 = { group: 'B', text: 'every body inside inset and composition rect', run(R) {
  if (!R.isCombat) return na('Rule 0.1 is stated for combat rooms');
  const bad = []; let worst = Infinity;
  R.bodies.forEach((b) => {
    const e = bodyExtent(b);
    const slackInset = Math.min(e.x0 - R.insetRect.x0, e.y0 - R.insetRect.y0,
      R.insetRect.x1 - e.x1, R.insetRect.y1 - e.y1);
    const slackComp = Math.min(e.x0 - R.compRect.x0, e.y0 - R.compRect.y0,
      R.compRect.x1 - e.x1, R.compRect.y1 - e.y1);
    const slack = Math.min(slackInset, slackComp);
    if (slack < worst) worst = slack;
    if (slack < 0) {
      bad.push(b.label + ' outside by ' + r1(-slack) +
        (slackComp < slackInset ? ' (composition rect)' : ' (inset rect)'));
    }
  });
  return verdict(bad, 'tightest margin ' + r1(worst), '>= 0', worst);
} };

PREDS.B2 = { group: 'B', text: 'intra formation gap band', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const bad = []; let worst = null;
  X.formations.forEach((f) => {
    if (!STEPPED_TYPES.has(f.type)) return;
    [true, false].forEach((useSnapped) => {
      orderedMembers(f, useSnapped).forEach((run) => {
        const seq = run.seq;
        const lim = run.wrap ? seq.length : seq.length - 1;
        for (let i = 0; i < lim; i++) {
          if (f.brk === i) continue; // the one declared break
          const g = gapBetween(seq[i], seq[(i + 1) % seq.length]);
          if (worst == null || g < worst) worst = g;
          if (g < U.GAP_MIN || g > U.GAP_MAX) {
            bad.push('formation ' + f.i + ' (' + f.type + ') gap ' + i + ' = ' + r1(g) +
              (useSnapped ? ' on the lattice' : ' as authored'));
          }
        }
      });
    });
  });
  if (!X.formations.some((f) => STEPPED_TYPES.has(f.type))) {
    return na('no stepped formation declared (mirrored pairs carry no crossing interval)');
  }
  return verdict(bad, 'gaps in band', '[158, 263]', worst);
} };

PREDS.B3 = { group: 'B', text: 'inter formation gap 158', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  if (X.formations.length < 2) return na('single formation');
  const bad = []; let worst = Infinity;
  for (let a = 0; a < X.formations.length; a++) {
    for (let b = a + 1; b < X.formations.length; b++) {
      X.formations[a].members.forEach((ma) => {
        X.formations[b].members.forEach((mb) => {
          const g = bodyGap(ma, mb);
          if (g < worst) worst = g;
          if (g < U.GAP_MIN) bad.push(ma.label + ' to ' + mb.label + ' gap ' + r1(g));
        });
      });
    }
  }
  return verdict(bad, 'min cross gap ' + r1(worst), '>= 158', worst);
} };

PREDS.B4 = { group: 'B', text: 'formation step constant to 8', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const stepped = X.formations.filter((f) => STEPPED_TYPES.has(f.type));
  if (!stepped.length) return na('no stepped formation declared');
  const bad = []; let worst = 0;
  stepped.forEach((f) => {
    orderedMembers(f, true).forEach((run) => {
      const seq = run.seq;
      const lim = run.wrap ? seq.length : seq.length - 1;
      const steps = [];
      for (let i = 0; i < lim; i++) {
        const a = seq[i], b = seq[(i + 1) % seq.length];
        const d = hyp(a.x - b.x, a.y - b.y);
        // A declared break spans an empty lattice slot, so its centre distance
        // is two steps, not one.
        steps.push(f.brk === i ? d / 2 : d);
      }
      if (steps.length < 2) return;
      const spread = Math.max.apply(null, steps) - Math.min.apply(null, steps);
      if (spread > worst) worst = spread;
      if (spread > U.STEP_TOL) {
        bad.push('formation ' + f.i + ' (' + f.type + ') steps ' +
          steps.map(r1).join(', ') + ' spread ' + r1(spread));
      }
    });
  });
  return verdict(bad, 'max step spread ' + r1(worst), '<= 8', worst);
} };

PREDS.B5 = { group: 'B', text: 'declared lane widths', run(R) {
  const lanes = R.def.lanes;
  if (!Array.isArray(lanes) || !lanes.length) return skip('no def.lanes declared');
  const bad = []; let worst = null;
  lanes.forEach((l, i) => {
    const wdt = l.w != null ? l.w : l.width;
    if (wdt == null) { bad.push('lane ' + i + ' declares no width'); return; }
    if (worst == null || wdt < worst) worst = wdt;
    if (wdt < U.LANE_MIN || wdt > U.LANE_MAX) bad.push('lane ' + i + ' width ' + r1(wdt));
  });
  return verdict(bad, 'lane widths in band', '[130, 240]', worst);
} };

PREDS.B6 = { group: 'B', text: 'door to door corridor 130 wide', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  if (R.doors.length < 2) return na('fewer than two doors');
  const room = X.grid.room;
  const clear = X.grid.clear;
  // Measure the route through the composition: door mouths are taken at the
  // WALL line, because every door approach necessarily hugs a wall and would
  // otherwise put a 0 clearance cell on every path.
  const nodes = R.doors.map((d) => {
    const nrm = inward(d.side);
    const lx = d.x + nrm.x * U.WALL, ly = d.y + nrm.y * U.WALL;
    return gridCellOf(room, lx - R.w / 2, ly - R.h / 2);
  });
  const need = U.LANE_MIN / 2;
  if (connectedAtThreshold(room, clear, nodes, need)) {
    return pass('all door mouths joined by a corridor of half width ' + need, need, '>= 65');
  }
  // A mouth that is itself pinched binds the whole measurement, so name it
  // rather than reporting a bottleneck of zero somewhere unstated.
  let tightest = Infinity, tightestDoor = null;
  nodes.forEach((c, i) => {
    const v = room.grid.data[c.i] !== 0 ? 0 : clear[c.i];
    if (v < tightest) { tightest = v; tightestDoor = R.doors[i]; }
  });
  if (tightest < need) {
    return fail('the mouth of the ' + tightestDoor.side + ' door t ' + tightestDoor.t +
      ' has only ' + r1(tightest) + ' of clearance at the wall line', r1(tightest), '>= 65');
  }
  let lo = 0, hi = need;
  for (let k = 0; k < 12; k++) {
    const mid = (lo + hi) / 2;
    if (connectedAtThreshold(room, clear, nodes, mid)) lo = mid; else hi = mid;
  }
  return fail('widest door to door corridor has half width ' + r1(lo), r1(lo), '>= 65');
} };

PREDS.B7 = { group: 'B', text: 'no alcove cell (anti turtle)', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  if (!R.isFight) return na('anti turtle rule is for fight rooms');
  const room = X.grid.room;
  const gr = room.grid;
  const K = Math.SQRT1_2;
  const dirs = [[1, 0], [K, K], [0, 1], [-K, K], [-1, 0], [-K, -K], [0, -1], [K, -K]];
  // Judged on the open floor only: the region more than FRINGE (158) from every
  // wall, which is exactly the floor Rule 2.3 forbids scatter on. Include the
  // fringe band and the treeline itself blocks two to three directions for
  // free, so every rectangular room fails at its own four corners, which
  // section 9.2 explicitly does not expect (BOULDER RUN is called a B7 pass).
  const floor = {
    x0: U.FRINGE, y0: U.FRINGE, x1: R.w - U.FRINGE, y1: R.h - U.FRINGE,
  };
  if (floor.x1 <= floor.x0 || floor.y1 <= floor.y0) return na('room has no open floor outside the fringe band');
  let worstCount = 0, worstAt = null, badCells = 0, tested = 0;
  for (let gy = 0; gy < gr.ch; gy++) {
    for (let gx = 0; gx < gr.cw; gx++) {
      const i = gy * gr.cw + gx;
      if (gr.data[i] !== 0) continue;
      const wx = gr.x0 + (gx + 0.5) * gr.cell, wy = gr.y0 + (gy + 0.5) * gr.cell;
      const lx = wx + R.w / 2, ly = wy + R.h / 2;
      if (!inRect(lx, ly, floor)) continue;
      tested++;
      let blocked = 0;
      for (let d = 0; d < 8; d++) {
        for (let t = gr.cell / 2; t <= U.FRINGE; t += gr.cell / 2) {
          if (ENGINE.Collide.blockedAt(room, wx + dirs[d][0] * t, wy + dirs[d][1] * t)) { blocked++; break; }
        }
      }
      if (blocked > worstCount) { worstCount = blocked; worstAt = { x: r1(lx), y: r1(ly) }; }
      if (blocked >= 4) badCells++;
    }
  }
  if (!tested) return na('no free open floor cell to test');
  if (!badCells) return pass('worst of ' + tested + ' open floor cells has ' + worstCount +
    ' of 8 directions blocked', worstCount, '<= 3');
  return fail(badCells + ' alcove cells, worst ' + worstCount + ' of 8 blocked at local (' +
    worstAt.x + ', ' + worstAt.y + ')', worstCount, '<= 3');
} };

// ---------------------------------------------------------------------------
// Group C: composition and intentionality
// ---------------------------------------------------------------------------
PREDS.C1 = { group: 'C', scope: 'fight', text: 'every body is a member, the anchor, or fringe', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const inF = new Set();
  X.formations.forEach((f) => f.members.forEach((m) => inF.add(m.ref)));
  const anchorKey = refKey(R.def.anchor);
  const bad = [];
  R.bodies.forEach((b) => {
    if (inF.has(b.ref) || b.ref === anchorKey) return;
    if (bodyWallDist(b, R.w, R.h) <= U.FRINGE) return;
    bad.push(b.label + ' belongs to no formation and is ' +
      r1(bodyWallDist(b, R.w, R.h)) + ' from the nearest wall');
  });
  return verdict(bad, R.bodies.length + ' bodies accounted for', 'member, anchor or fringe');
} };

PREDS.C2 = { group: 'C', scope: 'fight', text: 'one or two formations', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const n = X.formations.length;
  if (n >= 1 && n <= 2) return pass(n + ' formations', n, '[1, 2]');
  return fail('formation count ' + n, n, '[1, 2]');
} };

PREDS.C3 = { group: 'C', scope: 'fight', text: 'formation types in the closed vocabulary', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const bad = [];
  X.formations.forEach((f) => {
    if (!FORMATION_TYPES.includes(f.type)) bad.push("formation " + f.i + " type '" + f.rawType + "'");
    if (f.missing.length) bad.push('formation ' + f.i + ' has unresolved members ' + f.missing.join(', '));
  });
  return verdict(bad, X.formations.map((f) => f.type).join(', '), 'the closed vocabulary of 8');
} };

PREDS.C4 = { group: 'C', scope: 'fight', text: 'formation axis on a legal anchor', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const anchors = [{ n: 'room x axis', a: 0 }, { n: 'room y axis', a: 90 },
    { n: 'true diagonal', a: R.trueDiagDeg }, { n: 'true anti diagonal', a: -R.trueDiagDeg },
    { n: 'entry sightline', a: Math.atan2(R.C.y - R.E.y, R.C.x - R.E.x) * 180 / Math.PI }];
  for (let i = 0; i < R.doors.length; i++) {
    for (let j = i + 1; j < R.doors.length; j++) {
      anchors.push({
        n: 'door ' + i + ' to door ' + j,
        a: Math.atan2(R.doors[j].y - R.doors[i].y, R.doors[j].x - R.doors[i].x) * 180 / Math.PI,
      });
    }
  }
  const bad = []; let worst = 0;
  X.formations.forEach((f) => {
    if (f.members.length < 2) return;
    const pts = f.members.map((b) => snappedPos(f, b));
    const fitted = fitAxisDeg(pts);
    let best = { d: Infinity, n: '?' };
    anchors.forEach((an) => {
      const d = angDiff180(fitted, an.a);
      if (d < best.d) best = { d, n: an.n };
    });
    if (best.d > worst) worst = best.d;
    if (best.d > U.AXIS_TOL_DEG) {
      bad.push('formation ' + f.i + ' fitted axis ' + r1(fitted) + ' deg is ' +
        r1(best.d) + ' deg off its nearest anchor (' + best.n + ')');
    }
  });
  return verdict(bad, 'worst axis error ' + r1(worst) + ' deg', '<= 5 deg', worst);
} };

function symImage(op, x, y, C) {
  if (op === 'mirrorX') return { x: 2 * C.x - x, y };
  if (op === 'mirrorY') return { x, y: 2 * C.y - y };
  if (op === 'rot180') return { x: 2 * C.x - x, y: 2 * C.y - y };
  const m = /^radial(\d+)$/.exec(op || '');
  if (m) {
    const a = (Math.PI * 2) / parseInt(m[1], 10);
    const dx = x - C.x, dy = y - C.y;
    return { x: C.x + dx * Math.cos(a) - dy * Math.sin(a), y: C.y + dx * Math.sin(a) + dy * Math.cos(a) };
  }
  return null;
}

PREDS.C5 = { group: 'C', scope: 'fight', text: 'symmetric after snapping the violation', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  if (!R.def.symmetry) return skip('no def.symmetry declared');
  const op = R.def.symmetry;
  const pts = [];
  X.formations.forEach((f) => f.members.forEach((b) => pts.push(snappedPos(f, b))));
  if (!pts.length) return na('no formation members');
  if (!symImage(op, 0, 0, R.C)) return fail("unknown symmetry operation '" + op + "'", null, 'mirrorX|mirrorY|rot180|radialN');
  const used = new Array(pts.length).fill(false);
  const bad = []; let worst = 0;
  pts.forEach((p) => {
    const img = symImage(op, p.x, p.y, R.C);
    let best = -1, bestD = Infinity;
    pts.forEach((q, j) => {
      if (used[j]) return;
      const d = hyp(q.x - img.x, q.y - img.y);
      if (d < bestD) { bestD = d; best = j; }
    });
    if (bestD > worst) worst = bestD;
    if (best < 0 || bestD > U.PAIR_TOL) {
      bad.push(p.body.label + ' has no ' + op + ' partner (nearest miss ' + r1(bestD) + ')');
    } else used[best] = true;
  });
  return verdict(bad, op + ' exact to ' + r1(worst), '<= 52, zero unmatched', worst);
} };

PREDS.C6 = { group: 'C', scope: 'fight', text: 'exactly one declared violation', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const vs = X.formations.filter((f) => f.violation).map((f) => f.violation);
  const lo = R.corruption === 1 ? 126 : U.PAIR_TOL;
  const bound = '[' + lo + ', 158], exactly 1';
  if (vs.length !== 1) return fail('declared violations: ' + vs.length, vs.length, bound);
  const v = vs[0];
  const bad = [];
  if (v.mag < lo || v.mag > 1.5 * U.D) {
    bad.push(v.body.label + ' displaced ' + r1(v.mag) + ' from its slot');
  }
  if (R.corruption === 1) {
    const kinds = (R.dressing || []).filter((d) =>
      d.kind === 'cracks' || d.kind === 'burnband' || (d.kind === 'patch' && d.role === 'char'));
    if (!kinds.length) bad.push('corruption 1 declares no cracks, burnband or char patch dressing');
  }
  return verdict(bad, 'displacement ' + r1(v.mag), bound, v.mag);
} };

PREDS.C7 = { group: 'C', scope: 'fight', text: 'no orphan solid prop in the fringe', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const inF = new Set();
  const members = [];
  X.formations.forEach((f) => f.members.forEach((m) => { inF.add(m.ref); members.push(m); }));
  const anchorKey = refKey(R.def.anchor);
  const bad = []; let worst = 0;
  R.props.forEach((p) => {
    if (inF.has(p.ref) || p.ref === anchorKey) return;
    if (bodyWallDist(p, R.w, R.h) > U.FRINGE) return; // not in the fringe band, C1 owns it
    let best = Infinity;
    members.forEach((m) => { const d = bodyGap(p, m); if (d < best) best = d; });
    if (best > worst) worst = best;
    if (best > U.FOOT) bad.push(p.label + ' is ' + r1(best) + ' from its nearest formation member');
  });
  return verdict(bad, 'fringe props planted', '<= 52 from a member', worst);
} };

PREDS.C8 = { group: 'C', scope: 'fight', text: 'at most one anchor, on the axis', run(R) {
  if (R.def.anchor == null) return na('no def.anchor declared');
  if (Array.isArray(R.def.anchor)) {
    if (R.def.anchor.length > 1) return fail('declared anchors: ' + R.def.anchor.length, R.def.anchor.length, '<= 1');
  }
  const key = refKey(Array.isArray(R.def.anchor) ? R.def.anchor[0] : R.def.anchor);
  const body = R.bodies.find((b) => b.ref === key);
  if (!body) return fail('anchor ref ' + JSON.stringify(R.def.anchor) + ' resolves to no body', null, 'a real body');
  const dC = hyp(body.cx - R.C.x, body.cy - R.C.y);
  if (dC <= U.PAIR_TOL) return pass('anchor ' + r1(dC) + ' from C', r1(dC), '<= 52 from C or on the axis');
  const op = R.def.symmetry;
  const onAxis = (op === 'mirrorX' && Math.abs(body.cx - R.C.x) <= U.PAIR_TOL) ||
    (op === 'mirrorY' && Math.abs(body.cy - R.C.y) <= U.PAIR_TOL);
  if (onAxis) return pass('anchor sits on the ' + op + ' axis', r1(dC), 'on the axis');
  return fail('anchor ' + body.label + ' is ' + r1(dC) + ' from C and off the symmetry axis', r1(dC), '<= 52 from C or on the axis');
} };

PREDS.C9 = { group: 'C', text: 'scatter names only non solid props', run(R) {
  const sc = R.def.scatter;
  const ids = sc ? Object.keys(sc) : [];
  if (!ids.length) return na('no scatter declared');
  const solidIds = ids.filter((id) => {
    const pd = PROPS[id];
    return !pd || pd.solid === true;
  });
  // Service rooms are exempt from section 2, but the hazard C9 guards against
  // is mechanical, not compositional: until _scatterSpot is rezoned a solid
  // scatter prop can land mid floor anywhere. Reported, not failed.
  if (!R.isFight) {
    return na('service room, exempt from section 2.3' +
      (solidIds.length ? "; note def.scatter names solid prop(s) " + solidIds.join(', ') : ''));
  }
  const bad = solidIds.map((id) => "'" + id + "' is solid");
  return verdict(bad, ids.join(', ') + ' all non solid', 'PROPS[id].solid === false');
} };

PREDS.C10 = { group: 'C', scope: 'fight', text: 'one idea: sprite, prop and dressing caps', run(R, X) {
  const bad = [];
  const sprs = Array.from(new Set(R.solids.map((b) => R.def.solids[b.idx].spr).filter(Boolean)));
  if (sprs.length > 2) bad.push('distinct solid spr ' + sprs.length + ' (' + sprs.join(', ') + ')');
  // 'path' and 'road' are structural, not motif dressing: Rule 6.3 requires
  // them, so section 9.3 counts them out of the cap of 3.
  const kinds = Array.from(new Set((R.dressing || [])
    .map((d) => d.kind).filter((k) => k && k !== 'path' && k !== 'road')));
  if (kinds.length > 3) bad.push('distinct dressing kinds ' + kinds.length + ' (' + kinds.join(', ') + ')');
  let note = '';
  if (X.formations) {
    const ids = new Set();
    X.formations.forEach((f) => f.members.forEach((m) => {
      if (m.kind === 'prop') ids.add(R.def.props[m.idx].id);
    }));
    if (ids.size > 2) bad.push('distinct prop ids among members ' + ids.size);
  } else {
    note = ' (member prop id cap not checked: no formations)';
  }
  return verdict(bad, 'spr ' + sprs.length + ', dressing kinds ' + kinds.length + note,
    'spr <= 2, member prop ids <= 2, dressing kinds <= 3');
} };

PREDS.C11 = { group: 'C', scope: 'fight', text: 'dressing drawn from the act set', run(R) {
  if (!R.dressing || !R.dressing.length) return na('no dressing declared');
  const set = ACT_DRESSING[R.act];
  if (!set) return skip("no dressing set is stated for floor '" + R.act + "'");
  const allowed = set.kinds.concat(R.corruption === 1 ? set.corrupt : []);
  const bad = [];
  R.dressing.forEach((d, i) => {
    if (d.kind === 'path' || d.kind === 'road') return; // structural, see C10
    if (!allowed.includes(d.kind)) { bad.push("entry " + i + " kind '" + d.kind + "'"); return; }
    if (d.kind === 'patch' && d.role && !set.roles.includes(d.role)) {
      bad.push("entry " + i + " patch role '" + d.role + "'");
    }
  });
  return verdict(bad, R.dressing.length + ' entries inside act ' + R.act + "'s set",
    'act ' + R.act + ': ' + allowed.join(', ') + '; roles ' + set.roles.join(', '));
} };

PREDS.C12 = { group: 'C', scope: 'fight', text: 'named story dressing capped at 4', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const inF = new Set();
  X.formations.forEach((f) => f.members.forEach((m) => inF.add(m.ref)));
  const anchorKey = refKey(R.def.anchor);
  let n = 0;
  (R.def.props || []).forEach((p, i) => {
    const pd = PROPS[p.id];
    const ref = 'prop:' + i;
    if (inF.has(ref) || ref === anchorKey) return;
    const body = pd && pd.solid
      ? { kind: 'prop', cx: p.x, cy: p.y, r: pd.r }
      : { kind: 'prop', cx: p.x, cy: p.y, r: pd ? pd.r : 0 };
    if (bodyWallDist(body, R.w, R.h) <= U.FRINGE) return;
    n++;
  });
  if (n <= 4) return pass(n + ' story props', n, '<= 4');
  return fail(n + ' props are neither members nor fringe', n, '<= 4');
} };

// ---------------------------------------------------------------------------
// Group D: entry read
// ---------------------------------------------------------------------------
PREDS.D1 = { group: 'D', text: 'no body within 263 of the entry', run(R) {
  if (!R.isFight) return na('entry read is for fight rooms');
  const bad = []; let worst = Infinity;
  R.bodies.forEach((b) => {
    const d = pointBodyDist(R.E.x, R.E.y, b);
    if (d < worst) worst = d;
    if (d < U.GAP_MAX) bad.push(b.label + ' at ' + r1(d));
  });
  return verdict(bad, 'nearest body ' + r1(worst) + ' from entry', '>= 263', worst);
} };

PREDS.D2 = { group: 'D', text: 'entry to door corridors clear', run(R) {
  if (!R.doors.length) return na('no doors');
  const bad = []; let worst = Infinity;
  R.doors.forEach((d) => {
    R.bodies.forEach((b) => {
      const dist = segBodyDist(R.E.x, R.E.y, d.x, d.y, b);
      if (dist < worst) worst = dist;
      if (dist < U.LANE_MIN / 2) {
        bad.push('corridor to ' + d.side + ' door t ' + d.t + ': ' + b.label + ' at ' + r1(dist));
      }
    });
  });
  return verdict(bad, 'tightest corridor clearance ' + r1(worst), '>= 65', worst);
} };

PREDS.D3 = { group: 'D', text: 'entry view covers 60 percent of the inset', run(R) {
  if (!R.isFight) return na('entry read is for fight rooms');
  const area = (R.insetRect.x1 - R.insetRect.x0) * (R.insetRect.y1 - R.insetRect.y0);
  if (area <= 0) return na('inset rect is empty at this room size');
  const frac = rectIntersectArea(R.insetRect, R.viewRect) / area;
  if (frac >= 0.60) return pass((frac * 100).toFixed(1) + ' percent visible', r1(frac * 100), '>= 60 percent');
  return fail('entry view shows ' + (frac * 100).toFixed(1) + ' percent of the inset rect', r1(frac * 100), '>= 60 percent');
} };

PREDS.D4 = { group: 'D', text: 'a member of every formation is in view', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  const bad = [];
  X.formations.forEach((f) => {
    const any = f.members.some((m) => inRect(m.cx, m.cy, R.viewRect));
    if (!any) bad.push('formation ' + f.i + ' (' + f.type + ') has no member inside the entry view rect');
  });
  return verdict(bad, 'every formation reads from the entry', '>= 1 member in view');
} };

PREDS.D5 = { group: 'D', text: 'members in view are unoccluded', run(R, X) {
  if (!X.formations) return skip('no def.formations declared');
  if (!X.grid) return skip('grid unavailable');
  const room = X.grid.room;
  const bad = [];
  X.formations.forEach((f) => {
    f.members.forEach((m) => {
      if (!inRect(m.cx, m.cy, R.viewRect)) return;
      const hit = ENGINE.Collide.segmentBlocked(room,
        R.E.x - R.w / 2, R.E.y - R.h / 2, m.cx - R.w / 2, m.cy - R.h / 2);
      if (!hit) return;
      // The ray ends inside the member, so the last thing it hits is always the
      // member itself. blockedAt quantises to a whole 24 unit cell, so the test
      // has to be "is this one of the cells my own footprint stamps", not "is
      // this point inside my own footprint".
      const own = ownFootprintCells(room, R, m);
      const c = gridCellOf(room, hit.x, hit.y);
      if (c.gx >= own.gx0 && c.gx <= own.gx1 && c.gy >= own.gy0 && c.gy <= own.gy1) return;
      bad.push(m.label + ' occluded at local (' + r1(hit.x + R.w / 2) + ', ' + r1(hit.y + R.h / 2) + ')');
    });
  });
  return verdict(bad, 'sightlines clear', 'segmentBlocked returns null');
} };

PREDS.D6 = { group: 'D', text: 'entry wall carries no door', run(R) {
  const side = R.def.entry ? R.def.entry.side : 'w';
  const clash = R.doors.filter((d) => d.side === side);
  if (!clash.length) return pass("entry on '" + side + "', no door there", null, 'no door on the entry wall');
  return fail(clash.length + " door(s) share the entry wall '" + side + "'", clash.length, '0');
} };

// ---------------------------------------------------------------------------
// Group E: doors
// ---------------------------------------------------------------------------
PREDS.E1 = { group: 'E', text: 'door count matches the archetype', run(R) {
  const n = R.doors.length;
  const arch = normType(R.def.archetype);
  if (!arch) {
    if (n < 1 || n > 3) {
      return fail('door count ' + n + ' is outside every archetype in the section 3.9 table', n, '[1, 3]');
    }
    return skip('no def.archetype declared (door count ' + n + ' is inside the table envelope)');
  }
  const band = ARCHETYPE_DOORS[arch];
  if (!band) return fail("unknown archetype '" + R.def.archetype + "'", n, 'a section 3.9 archetype');
  if (n >= band[0] && n <= band[1]) return pass(arch + ' with ' + n + ' doors', n, '[' + band.join(', ') + ']');
  return fail(arch + ' declares ' + n + ' doors', n, '[' + band.join(', ') + ']');
} };

PREDS.E2 = { group: 'E', text: 'every door visible or signposted', run(R) {
  if (!R.doors.length) return na('no doors');
  // The js/rooms.js header bakes worn paths from the entry toward each door for
  // any layout that declares no dressing list. A layout that declares one opts
  // out of the fallback and must declare the paths itself.
  if (!R.dressing) return pass('no dressing list, so the engine bakes the worn paths', null, 'in view or signposted');
  const bad = [];
  R.doors.forEach((d) => {
    if (inRect(d.x, d.y, R.viewRect)) return;
    const signed = R.dressing.some((e) => {
      if (e.kind !== 'path' && e.kind !== 'road') return false;
      if (!e.from || !e.to) return false;
      const a = hyp(e.from.x - R.E.x, e.from.y - R.E.y) <= 100 && hyp(e.to.x - d.x, e.to.y - d.y) <= 120;
      const b = hyp(e.to.x - R.E.x, e.to.y - R.E.y) <= 100 && hyp(e.from.x - d.x, e.from.y - d.y) <= 120;
      return a || b;
    });
    if (!signed) bad.push(d.side + ' door t ' + d.t + ' is out of view and unsignposted');
  });
  return verdict(bad, 'all doors read from the entry', 'in view, or a path within 100 of E and 120 of the anchor');
} };

PREDS.E3 = { group: 'E', text: 'no body within 263 of a door', run(R) {
  if (!R.doors.length || !R.bodies.length) return na('no doors or no bodies');
  const bad = []; let worst = Infinity;
  R.doors.forEach((d) => {
    R.bodies.forEach((b) => {
      const dist = pointBodyDist(d.x, d.y, b);
      if (dist < worst) worst = dist;
      if (dist < U.GAP_MAX) bad.push(d.side + ' door t ' + d.t + ': ' + b.label + ' at ' + r1(dist));
    });
  });
  return verdict(bad, 'nearest body to a door ' + r1(worst), '>= 263', worst);
} };

PREDS.E4 = { group: 'E', text: 'doors on one wall 200 apart', run(R) {
  const bad = []; let worst = Infinity; let pairs = 0;
  for (let i = 0; i < R.doors.length; i++) {
    for (let j = i + 1; j < R.doors.length; j++) {
      const a = R.doors[i], b = R.doors[j];
      if (a.side !== b.side) continue;
      pairs++;
      const len = (a.side === 'n' || a.side === 's') ? R.w : R.h;
      const sep = Math.abs(a.t - b.t) * len;
      if (sep < worst) worst = sep;
      if (sep < U.DOOR_SAME_WALL) bad.push('two ' + a.side + ' doors ' + r1(sep) + ' apart');
    }
  }
  if (!pairs) return na('no two doors share a wall');
  return verdict(bad, 'closest same wall pair ' + r1(worst), '>= 200', worst);
} };

PREDS.E5 = { group: 'E', text: 'opposite doors are offset', run(R) {
  const opp = { n: 's', s: 'n', e: 'w', w: 'e' };
  const bad = []; let worst = Infinity; let pairs = 0;
  for (let i = 0; i < R.doors.length; i++) {
    for (let j = i + 1; j < R.doors.length; j++) {
      const a = R.doors[i], b = R.doors[j];
      if (opp[a.side] !== b.side) continue;
      pairs++;
      const dt = Math.abs(a.t - b.t);
      if (dt < worst) worst = dt;
      if (dt < U.DOOR_OPPOSITE_T) {
        bad.push(a.side + ' t ' + a.t + ' and ' + b.side + ' t ' + b.t + ' differ by ' + r1(dt));
      }
    }
  }
  if (!pairs) return na('no doors on opposite walls');
  return verdict(bad, 'closest opposite pair differs by ' + worst.toFixed(2), '>= 0.08 in t', worst);
} };

// ---------------------------------------------------------------------------
// Group F: spawn choreography
// ---------------------------------------------------------------------------
PREDS.F1 = { group: 'F', scope: 'fight', text: '3 to 5 spawn markers', run(R) {
  if (!R.isCombat) return na('marker count is per combat room');
  const n = R.markers.length;
  if (n >= 3 && n <= 5) return pass(n + ' markers', n, '[3, 5]');
  return fail('marker count ' + n, n, '[3, 5]');
} };

PREDS.F2 = { group: 'F', scope: 'fight', text: 'marker clearance 135', run(R) {
  if (!R.markers.length || !R.bodies.length) return na('no markers or no bodies');
  const bad = []; let worst = Infinity;
  R.markers.forEach((m, i) => {
    let best = Infinity, who = null;
    R.bodies.forEach((b) => {
      const d = pointBodyDist(m.x, m.y, b);
      if (d < best) { best = d; who = b; }
    });
    if (best < worst) worst = best;
    if (best < U.MARKER_CLEAR) {
      bad.push('marker ' + i + ' (' + m.x + ', ' + m.y + ') has ' + r1(best) +
        ' of floor to ' + who.label);
    }
  });
  return verdict(bad, 'tightest marker clearance ' + r1(worst), '>= 135', worst);
} };

PREDS.F3 = { group: 'F', scope: 'fight', text: 'markers 190 off the entry', run(R) {
  if (!R.markers.length) return na('no markers');
  const bad = []; let worst = Infinity;
  R.markers.forEach((m, i) => {
    const d = hyp(m.x - R.E.x, m.y - R.E.y);
    if (d < worst) worst = d;
    if (d < U.EDGE_AWAY) bad.push('marker ' + i + ' is ' + r1(d) + ' from the entry');
  });
  return verdict(bad, 'nearest marker ' + r1(worst) + ' from entry', '>= 190', worst);
} };

PREDS.F4 = { group: 'F', scope: 'fight', text: 'markers 32 inside the bounds', run(R) {
  if (!R.markers.length) return na('no markers');
  const bad = []; let worst = Infinity;
  R.markers.forEach((m, i) => {
    const d = Math.min(m.x, m.y, R.w - m.x, R.h - m.y);
    if (d < worst) worst = d;
    if (d < U.SPAWN_INSET) bad.push('marker ' + i + ' is ' + r1(d) + ' inside the bounds');
  });
  return verdict(bad, 'tightest marker inset ' + r1(worst), '>= 32', worst);
} };

PREDS.F5 = { group: 'F', scope: 'fight', text: 'wave 1 markers are the announce prefix', run(R) {
  if (!R.markers.length || !R.waves.length) return na('no markers or no waves');
  const w1 = R.waves[0];
  const spawns = w1.spawns.filter((s) => s && s.mode === 'marker');
  if (!spawns.length) return na('wave 1 draws no markers');
  let cursor = 0;
  const bad = [];
  spawns.forEach((s) => {
    const n = s.n > 0 ? (s.n | 0) : 0;
    for (let k = 0; k < n; k++) {
      const idx = cursor % R.markers.length;
      const m = R.markers[idx];
      cursor++;
      if (!inRect(m.x, m.y, R.viewRect)) {
        bad.push('wave 1 body ' + k + ' consumes marker ' + idx + ' (' + m.x + ', ' + m.y +
          '), which is outside the entry view rect');
      }
    }
  });
  if (cursor > R.markers.length) {
    bad.push('wave 1 consumes ' + cursor + ' markers from a list of ' + R.markers.length +
      ', so the cursor wraps and announce stops being distinct from flank');
  }
  const uniq = Array.from(new Set(bad));
  return verdict(uniq.slice(0, 3), 'wave 1 consumes ' + cursor + ' visible markers',
    'wave 1 marker prefix inside the entry view rect');
} };

PREDS.F6 = { group: 'F', scope: 'fight', text: 'ring radius 190 to 256', run(R) {
  const rings = [];
  R.waves.forEach((w, i) => {
    w.spawns.forEach((s) => {
      if (s && s.mode === 'ring') rings.push({ wave: i + 1, r: s.r > 0 ? s.r : 420, ref: w.fromRef });
    });
  });
  if (!rings.length) return na("no mode: 'ring' spawn");
  const bad = [];
  rings.forEach((rg) => {
    if (rg.r < U.RING_MIN || rg.r > U.RING_MAX) {
      bad.push('wave ' + rg.wave + (rg.ref ? ' (template ' + rg.ref + ')' : '') + ' ring r ' + rg.r +
        (rg.r < U.RING_MIN ? ' lands on the player' : ' is born offscreen'));
    }
  });
  const worst = rings.reduce((a, rg) =>
    Math.max(a, Math.max(U.RING_MIN - rg.r, rg.r - U.RING_MAX)), -Infinity);
  return verdict(bad, rings.length + ' ring spawn(s) in band', '[190, 256]', worst > 0 ? worst : null);
} };

PREDS.F7 = { group: 'F', scope: 'fight', text: 'wave 1 not a ring, last wave kills all', run(R) {
  if (!R.waves.length) return na('no waves');
  const bad = [];
  if (R.waves[0].spawns.some((s) => s && s.mode === 'ring')) {
    bad.push("wave 1 uses mode: 'ring', which is a surround and therefore a climax");
  }
  const last = R.waves[R.waves.length - 1];
  if (!(last.nextAt === 0)) bad.push('final wave nextAt ' + last.nextAt + ', not 0');
  return verdict(bad, 'opener announces, climax kills all', "wave 1 no ring, last nextAt 0");
} };

PREDS.F8 = { group: 'F', scope: 'fight', text: 'headcount non increasing after wave 1', run(R) {
  if (R.waves.length < 3) return na('fewer than three waves');
  const bad = []; let worst = 0;
  for (let i = 2; i < R.waves.length; i++) {
    const rise = R.waves[i].n - R.waves[i - 1].n;
    if (rise > worst) worst = rise;
    // Rule 5.4 wants the ramp carried by cast weight, not headcount, but
    // section 9.3's own rebuilt room runs 14, 22, 24 and calls 22 to 24 "flat
    // within tolerance". Two bodies is that tolerance, stated rather than
    // implied.
    if (rise > U.HEADCOUNT_TOL) {
      bad.push('wave ' + (i + 1) + ' is ' + R.waves[i].n + ' against wave ' + i + "'s " + R.waves[i - 1].n);
    }
  }
  return verdict(bad, 'headcounts ' + R.waves.map((w) => w.n).join(', '),
    'no rise over 2 bodies after wave 1', worst);
} };

PREDS.F9 = { group: 'F', scope: 'fight', text: 'point spawns only in a Funnel or lore room', run(R) {
  const pts = [];
  R.waves.forEach((w, i) => w.spawns.forEach((s) => { if (s && s.mode === 'point') pts.push(i + 1); }));
  if (!pts.length) return na("no mode: 'point' spawn");
  if (R.type === 'lore') return pass('lore room, a scripted beat is legal', pts.length, 'Funnel or lore');
  const arch = normType(R.def.archetype);
  if (arch === 'funnel') return pass('Funnel ambush', pts.length, 'Funnel or lore');
  if (!arch) {
    return skip("mode: 'point' on wave(s) " + pts.join(', ') +
      ' in a ' + R.type + ' room, and no def.archetype declared to confirm a Funnel');
  }
  return fail("mode: 'point' on wave(s) " + pts.join(', ') + " in archetype '" + arch + "'",
    pts.length, 'Funnel or lore');
} };

// ---------------------------------------------------------------------------
// Group G: reachability, never waived
// ---------------------------------------------------------------------------
PREDS.G1 = { group: 'G', text: 'every door reachable from the entry', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  if (!R.doors.length) return na('no doors');
  const { room, reach } = X.grid;
  const bad = [];
  R.doors.forEach((d) => {
    const c = gridCellOf(room, d.x - R.w / 2, d.y - R.h / 2);
    if (!reach[c.i]) bad.push(d.side + ' door t ' + d.t + ' is walled off from the entry');
  });
  return verdict(bad, R.doors.length + ' doors reachable', 'flood fill from E');
} };

PREDS.G2 = { group: 'G', text: 'every marker reachable from the entry', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  if (!R.markers.length) return na('no markers');
  const { room, reach } = X.grid;
  const bad = [];
  R.markers.forEach((m, i) => {
    const c = gridCellOf(room, m.x - R.w / 2, m.y - R.h / 2);
    if (reach[c.i]) return;
    // Two different defects land here. A marker in a blocked cell is standing
    // inside a body, and _free() (js/room.js:598) will spiral it up to 144 away
    // or dump the wave on the entry point. A marker in a free but unreachable
    // cell is behind a seal.
    bad.push('marker ' + i + ' (' + m.x + ', ' + m.y + ') ' +
      (room.grid.data[c.i] !== 0
        ? 'sits inside a blocker, so _free() will move the spawn'
        : 'is sealed off from the entry'));
  });
  return verdict(bad, R.markers.length + ' markers reachable', 'flood fill from E');
} };

PREDS.G3 = { group: 'G', text: 'no unreachable free cell', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  const { room, reach } = X.grid;
  const gr = room.grid;
  let free = 0, islands = 0, firstAt = null;
  for (let i = 0; i < gr.data.length; i++) {
    if (gr.data[i] !== 0) continue;
    free++;
    if (!reach[i]) {
      islands++;
      if (!firstAt) {
        const gx = i % gr.cw, gy = (i / gr.cw) | 0;
        firstAt = { x: r1(gr.x0 + (gx + 0.5) * gr.cell + R.w / 2), y: r1(gr.y0 + (gy + 0.5) * gr.cell + R.h / 2) };
      }
    }
  }
  if (!islands) return pass(free + ' free cells, all reachable', 0, '0 islands');
  return fail(islands + ' of ' + free + ' free cells are islands, first at local (' +
    firstAt.x + ', ' + firstAt.y + ')', islands, '0 islands');
} };

PREDS.G4 = { group: 'G', scope: 'fight', text: 'no three sided pocket with a narrow mouth', run(R, X) {
  if (!X.grid) return skip('grid unavailable');
  const { room, clear } = X.grid;
  const gr = room.grid;
  // Declared formations get the exact test: a formation encloses a region if
  // its members ring it and the widest way in is under LANE_MIN. Without them
  // the same defect is found on the grid instead: any open area wide enough to
  // fight in that can only be entered through a corridor under 130 wide is an
  // enclosure, whoever built it. Group G is never waived, so this runs either
  // way and only the confidence note changes.
  const need = U.LANE_MIN / 2;
  const comp = new Int32Array(gr.cw * gr.ch).fill(-1);
  const sizes = [];
  for (let i = 0; i < comp.length; i++) {
    if (comp[i] !== -1 || gr.data[i] !== 0 || clear[i] < need) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const j = stack.pop();
      n++;
      const gx = j % gr.cw, gy = (j / gr.cw) | 0;
      const push = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= gr.cw || ny >= gr.ch) return;
        const k = ny * gr.cw + nx;
        if (comp[k] !== -1 || gr.data[k] !== 0 || clear[k] < need) return;
        comp[k] = id; stack.push(k);
      };
      push(gx + 1, gy); push(gx - 1, gy); push(gx, gy + 1); push(gx, gy - 1);
    }
    sizes.push(n);
  }
  const note = X.formations ? '' : ' (inferred: no formations declared)';
  if (sizes.length <= 1) {
    return pass('one open region' + note, sizes.length, '1 open region');
  }
  const sorted = sizes.slice().sort((a, b) => b - a);
  const pockets = sorted.slice(1).filter((n) => n >= 4);
  if (!pockets.length) {
    return pass(sizes.length + ' regions, all but the main one under 4 cells' + note, 1, '1 open region');
  }
  return fail(pockets.length + ' open pocket(s) of ' + pockets.join(', ') +
    ' cells reachable only through a mouth under 130 wide' + note, pockets.length, '0 pockets');
} };

const PRED_IDS = Object.keys(PREDS);

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
function evaluate(def) {
  const R = resolveRoom(def);
  const X = { formations: resolveFormations(R), grid: null, gridError: null };

  try {
    const room = buildGridRoom(def);
    const eCell = gridCellOf(room, R.E.x - R.w / 2, R.E.y - R.h / 2);
    X.grid = {
      room,
      reach: floodFree(room, [eCell]),
      clear: clearanceField(room),
    };
  } catch (e) {
    X.gridError = e && e.message ? e.message : String(e);
  }

  const results = PRED_IDS.map((id) => {
    const p = PREDS[id];
    let r;
    try {
      // Section 6.4: service rooms (lock 'none': shop, rest, lore, plus the
      // loot caches) "are exempt from Sections 2 through 5 and need only
      // satisfy the door rules here". Groups C and F and the enclosure half of
      // G are exactly sections 2 to 5, so they do not run there. Group A's
      // solid house rules, the door grammar of D and E, and reachability still
      // do, which is what "need only satisfy the door rules" leaves standing.
      r = (p.scope === 'fight' && !R.isFight)
        ? na('service room, exempt from sections 2 to 5 per section 6.4')
        : p.run(R, X);
    } catch (e) {
      r = fail('predicate threw: ' + (e && e.message ? e.message : String(e)), null, '');
    }
    return Object.assign({ id, group: p.group, text: p.text }, r);
  });

  const counts = { pass: 0, fail: 0, skip: 0, na: 0 };
  results.forEach((r) => { counts[r.status]++; });

  return {
    id: def.id, name: def.name, type: R.type, act: R.act,
    size: R.w + 'x' + R.h, bodies: R.bodies.length,
    verdict: counts.fail ? 'FAIL' : 'PASS',
    counts, results, gridError: X.gridError,
    formationsDeclared: !!X.formations,
  };
}

function collectLayouts() {
  const out = [];
  Object.keys(ROOMS).forEach((group) => {
    const bucket = ROOMS[group];
    if (!bucket || typeof bucket !== 'object') return;
    Object.keys(bucket).forEach((key) => {
      const def = bucket[key];
      if (!def || !def.id || !def.size) return;
      out.push({ group, key, def });
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Section 9.3's worked rebuild, so the declared composition path is exercised
// by something before any layout declares one. Not a layout, not loaded by the
// game, only reachable through --selftest.
// ---------------------------------------------------------------------------
function selftestDef() {
  return {
    id: 'selftest_boulderrun_after', name: 'BOULDER RUN (section 9.3 rebuild)',
    type: 'combat', acts: [1], floor: 1,
    cast: { doe: 2 },
    size: { w: 1170, h: 770 }, shape: 'rect', lock: 'clear',
    archetype: 'crossroads', symmetry: 'rot180', scatterZone: 'both',
    doors: [{ side: 'n', t: 0.5 }, { side: 'e', t: 0.6 }, { side: 's', t: 0.62 }],
    entry: { side: 'w', t: 0.5 },
    solids: [
      { x: 330.5, y: 560.5, w: 135, h: 43, spr: 'log' },
      { x: 839.5, y: 209.5, w: 135, h: 43, spr: 'log' },
    ],
    props: [
      { id: 'boulder', x: 178, y: 171 },
      { id: 'boulder', x: 381, y: 278 },
      { id: 'boulder', x: 740, y: 585 },
      { id: 'boulder', x: 992, y: 599 },
      { id: 'stump', x: 1030, y: 630 },
      { id: 'bush', x: 111, y: 665 },
    ],
    formations: [
      {
        type: 'brokenLine', axis: 'trueDiagonal', anchor: 'C', step: 230,
        members: [{ prop: 0 }, { prop: 1 }, { prop: 2 }, { prop: 3 }],
        break: 1,
        violation: { member: { prop: 2 }, slot: { x: 789, y: 492 } },
      },
      {
        type: 'mirroredPair', axis: 'antiDiagonal', anchor: 'C', step: 618,
        members: [{ solid: 0 }, { solid: 1 }],
      },
    ],
    scatter: { bush: [2, 4] },
    spawnMarkers: [
      { x: 585, y: 172 }, { x: 560, y: 606 }, { x: 1045, y: 310 }, { x: 880, y: 725 },
    ],
    waves: [
      { delay: 0.9, nextAt: 0.35, maxT: 45, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 12, mode: 'edge' }], elites: 0, drip: null, ref: null },
      { delay: 1.2, nextAt: 0.30, maxT: 55, spawns: [{ id: 'auto', n: 2, mode: 'marker' }, { id: 'auto', n: 20, mode: 'edge' }], elites: 0, drip: null, ref: null },
      { delay: 1.0, nextAt: 0, maxT: 60, spawns: [{ id: 'auto', n: 24, mode: 'ring', r: 240 }], elites: 0, drip: null, ref: null },
    ],
    dressing: [
      { kind: 'patch', x: 178, y: 171, r: 60, role: 'dirt' },
      { kind: 'patch', x: 992, y: 599, r: 60, role: 'dirt' },
      { kind: 'bowl', x: 585, y: 385, r0: 90, r1: 400 },
      { kind: 'path', from: { x: 46, y: 385 }, to: { x: 1170, y: 462 } },
      { kind: 'path', from: { x: 46, y: 385 }, to: { x: 585, y: 0 } },
      { kind: 'path', from: { x: 46, y: 385 }, to: { x: 725, y: 770 } },
    ],
    reward: { kind: 'auto' },
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function padEnd(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padStart(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

function printReport(rows, opts) {
  const lines = [];
  lines.push('LAYOUT VALIDATOR: LEVEL_DESIGN.md section 8, ' + PRED_IDS.length + ' predicates over ' +
    rows.length + ' layout(s)');
  lines.push('');

  rows.forEach((row) => {
    lines.push(padEnd(row.id, 26) + padEnd(row.name, 28) + padEnd(row.type, 7) +
      padEnd('act ' + row.act, 9) + padEnd(row.size, 11) + padEnd(row.verdict, 6) +
      row.counts.pass + ' pass / ' + row.counts.fail + ' fail / ' +
      row.counts.skip + ' skip / ' + row.counts.na + ' n/a');
    if (row.gridError) lines.push('      grid build failed: ' + row.gridError);
    row.results.filter((r) => r.status === FAIL).forEach((r) => {
      lines.push('      ' + padEnd(r.id, 4) + padEnd(r.text, 42) +
        (r.measured == null ? '' : 'measured ' + r.measured + '  ') +
        (r.bound ? 'bound ' + r.bound : ''));
      lines.push('           ' + r.detail);
    });
    if (opts.verbose) {
      row.results.filter((r) => r.status === SKIP).forEach((r) => {
        lines.push('      ' + padEnd(r.id, 4) + 'SKIP  ' + r.detail);
      });
    }
  });

  lines.push('');
  lines.push('BY ACT AND TYPE');
  lines.push('  ' + padEnd('act', 8) + padEnd('type', 9) + padStart('rooms', 6) +
    padStart('clean', 7) + padStart('failing', 9) + padStart('fails', 7) + padStart('skips', 7));
  const groups = {};
  rows.forEach((row) => {
    const k = row.act + '|' + row.type;
    if (!groups[k]) groups[k] = { act: row.act, type: row.type, rooms: 0, clean: 0, failing: 0, fails: 0, skips: 0 };
    const g = groups[k];
    g.rooms++;
    if (row.counts.fail) { g.failing++; } else { g.clean++; }
    g.fails += row.counts.fail;
    g.skips += row.counts.skip;
  });
  Object.keys(groups).sort().forEach((k) => {
    const g = groups[k];
    lines.push('  ' + padEnd(g.act, 8) + padEnd(g.type, 9) + padStart(g.rooms, 6) +
      padStart(g.clean, 7) + padStart(g.failing, 9) + padStart(g.fails, 7) + padStart(g.skips, 7));
  });

  lines.push('');
  lines.push('BY PREDICATE GROUP');
  lines.push('  ' + padEnd('group', 7) + padStart('pass', 7) + padStart('fail', 7) +
    padStart('skip', 7) + padStart('n/a', 7));
  const byGroup = {};
  rows.forEach((row) => row.results.forEach((r) => {
    if (!byGroup[r.group]) byGroup[r.group] = { pass: 0, fail: 0, skip: 0, na: 0 };
    byGroup[r.group][r.status]++;
  }));
  Object.keys(byGroup).sort().forEach((k) => {
    const g = byGroup[k];
    lines.push('  ' + padEnd(k, 7) + padStart(g.pass, 7) + padStart(g.fail, 7) +
      padStart(g.skip, 7) + padStart(g.na, 7));
  });

  lines.push('');
  lines.push('FAILURES BY PREDICATE');
  const byPred = {};
  rows.forEach((row) => row.results.forEach((r) => {
    if (r.status !== FAIL) return;
    byPred[r.id] = (byPred[r.id] || 0) + 1;
  }));
  const predKeys = Object.keys(byPred).sort((a, b) => byPred[b] - byPred[a] || (a < b ? -1 : 1));
  if (!predKeys.length) lines.push('  none');
  predKeys.forEach((k) => {
    lines.push('  ' + padEnd(k, 5) + padStart(byPred[k], 4) + ' layout(s)   ' + PREDS[k].text);
  });

  lines.push('');
  lines.push('WORST OFFENDERS');
  rows.slice().sort((a, b) => b.counts.fail - a.counts.fail || (a.id < b.id ? -1 : 1))
    .slice(0, 10).forEach((row) => {
      if (!row.counts.fail) return;
      lines.push('  ' + padStart(row.counts.fail, 3) + ' fails   ' + padEnd(row.id, 26) +
        row.results.filter((r) => r.status === FAIL).map((r) => r.id).join(' '));
    });

  const totalFail = rows.reduce((a, r) => a + r.counts.fail, 0);
  const totalSkip = rows.reduce((a, r) => a + r.counts.skip, 0);
  const failing = rows.filter((r) => r.counts.fail).length;
  lines.push('');
  lines.push('TOTAL: ' + failing + ' of ' + rows.length + ' layouts fail at least one predicate. ' +
    totalFail + ' failures, ' + totalSkip + ' skips (predicates awaiting a declared field).');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const opts = { json: false, layout: null, selftest: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') opts.json = true;
    else if (argv[i] === '--verbose') opts.verbose = true;
    else if (argv[i] === '--selftest') opts.selftest = true;
    else if (argv[i] === '--layout') opts.layout = argv[++i];
    else if (argv[i].startsWith('--layout=')) opts.layout = argv[i].slice(9);
    else {
      console.error('validate_rooms: unknown argument ' + argv[i]);
      console.error('usage: node tools/validate_rooms.cjs [--layout <id>] [--json] [--verbose] [--selftest]');
      process.exit(2);
    }
  }

  let defs;
  if (opts.selftest) {
    defs = [selftestDef()];
  } else {
    defs = collectLayouts().map((e) => e.def);
    if (opts.layout) {
      defs = defs.filter((d) => d.id === opts.layout);
      if (!defs.length) {
        console.error("validate_rooms: no layout with id '" + opts.layout + "'");
        process.exit(2);
      }
    }
  }

  const rows = defs.map(evaluate);

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      predicateCount: PRED_IDS.length,
      layoutCount: rows.length,
      totals: {
        failingLayouts: rows.filter((r) => r.counts.fail).length,
        fail: rows.reduce((a, r) => a + r.counts.fail, 0),
        pass: rows.reduce((a, r) => a + r.counts.pass, 0),
        skip: rows.reduce((a, r) => a + r.counts.skip, 0),
        na: rows.reduce((a, r) => a + r.counts.na, 0),
      },
      layouts: rows,
    }, null, 2) + '\n');
  } else {
    console.log(printReport(rows, opts));
  }

  process.exit(rows.some((r) => r.counts.fail) ? 1 : 0);
}

main();
