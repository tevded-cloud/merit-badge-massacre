// Merit Badge Massacre: Camp Hearthwood, the walkable home base. A real
// campground now: a warm golden-hour pocket carved out of dark pine mass,
// connected zones on worn paths. Fire circle in the middle, tent row west,
// trailhead east, the Quartermaster's supply stall north, the lake south,
// the memorial grove northwest, the old cabin northeast. Heavy layers bake
// once (ground, far treeline, near fringe); per frame the camp costs three
// drawImage calls plus the cast.
'use strict';

const CAMP_ZOOM = 1.25;

// ---------------------------------------------------------------- layout ---
// Grounds bounds in world units, origin at the fire circle's clearing.
const CAMP_G = { x0: -780, x1: 780, y0: -540, y1: 540, pad: 200, bleed: 40 };
const CAMP_S = 1.5;          // bake scale: canvas pixels per world unit
const CAMP_PEEK = 110;       // camera overscan into the treeline band

// Golden hour: warm amber light pooling on open ground, dark conifer border.
const CPAL = {
  void: '#080d07',
  floorOut: '#10160a',
  grass: '#43491d',
  mottleDark: '#364017',
  mottleWarm: '#5c5a22',
  sunPool: 'rgba(255,196,110,0.16)',
  dapple: 'rgba(255,206,130,0.10)',
  shadow: 'rgba(20,26,12,0.30)',
  path: { edge: 'rgba(38,24,10,0.55)', base: '#7c5c31', mid: '#93703d', speck: '#ab8850' },
  pineDeep: '#0d1409',
  pineBack: '#16240e',
  pineMid: '#1d3013',
  pineFront: '#264019',
  pineLit: '#4c6a24',
  pineRim: 'rgba(255,182,92,0.4)',
  trunk: '#4a3418',
  trunkLit: '#6e5228',
  water: { fill: '#174042', deep: '#0f3236', edge: 'rgba(14,24,18,0.85)', glint: 'rgba(255,220,150,0.55)' },
  sand: '#8a7442',
  moss: '#2c4420',
  out: '#181008',
};

// Cosmetic hooks. META.camp is additive and read with defaults; the picker UI
// comes later, these are the render hooks it will drive.
const CAMP_BANNERS = [
  ['#c0392b', '#f4c542', '#5c7248', '#4a76a8'],
  ['#d4402c', '#e07a2a', '#f4c542', '#c0392b'],
  ['#3f5c22', '#5c7248', '#8aa050', '#f4c542'],
  ['#4a76a8', '#7ec8e8', '#e9e4da', '#3a4a63'],
];
const CAMP_TENTCOLS = ['#c0392b', '#4a76a8', '#5c7248', '#f4c542'];

function campMeta() {
  const c = (typeof META !== 'undefined' && META && META.camp && typeof META.camp === 'object') ? META.camp : null;
  return {
    banner: c && c.banner >= 0 ? (c.banner | 0) % CAMP_BANNERS.length : 0,
    tentPattern: c && c.tentPattern >= 0 ? (c.tentPattern | 0) % CAMP_TENTCOLS.length : 0,
  };
}

// Feats change what stands in the camp: earned cosmetics turn up as furniture
// and the totem grows a face per carving. Both are baked, so the bake has to
// know when they move. This signature is compared against the baked one every
// frame, exactly the way the growth tier already is.
function campFeatSig() {
  let s = '0:0';
  try {
    const f = (typeof Feats !== 'undefined' && Feats) ? Feats.count() : 0;
    const t = (typeof Totem !== 'undefined' && Totem) ? Totem.active().length : 0;
    s = f + ':' + t;
  } catch (e) {}
  return s;
}

function campHasCosmetic(id) {
  try {
    return (typeof Feats !== 'undefined' && Feats) ? Feats.hasCosmetic(id) : false;
  } catch (e) { return false; }
}

// The totem is uncarved wood until the camp has seen a dawn, the same shape
// the cabin and the lakeshore gates use.
function campTotemOpen() {
  try {
    return (typeof Totem !== 'undefined' && Totem) ? Totem.open() : false;
  } catch (e) { return false; }
}

function campCarvings() {
  try {
    return (typeof Totem !== 'undefined' && Totem) ? Totem.active() : [];
  } catch (e) { return []; }
}

// Deterministic rng so the bake is stable between visits.
function campRng(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// A named painter that has not landed yet must not take the camp down. The
// parallel art unit owns sprites.js; until its painters exist, camp.js draws
// its own fallbacks with primitives.
const campSprCache = {};
function campHasSpr(name) {
  if (campSprCache[name] === undefined) {
    try { SPR.get(name); campSprCache[name] = true; }
    catch (e) { campSprCache[name] = false; }
  }
  return campSprCache[name];
}
function campSpr(ctx, name, x, yB, w, o, fallback) {
  if (campHasSpr(name)) { SPR.drawBottom(ctx, name, x, yB, w, o); return; }
  if (fallback) fallback(ctx, x, yB, w, o || {});
}

// Local offscreen bake for fallback actors (quartermaster, squirrel), so per
// frame they are one drawImage like everything else.
function campBake(w, h, fn) {
  const SS = 3;
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
  const g = c.getContext('2d');
  g.scale(SS, SS);
  g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  return { c, w, h };
}
function campBlit(ctx, s, x, yB, w, o) {
  o = o || {};
  const sc = w / s.w;
  const h = s.h * sc * (o.squash || 1);
  ctx.save();
  ctx.translate(x, yB - h / 2);
  ctx.scale(o.flip ? -sc : sc, sc * (o.squash || 1));
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
  ctx.restore();
}

// ------------------------------------------------------ fallback painters --
// Every fallback follows ART_STYLE.md: outline #181008, two tier line weight,
// baked top light and belly shade, one accent per thing.

let CAMP_QM_C = null;
function campQmSprite() {
  if (CAMP_QM_C) return CAMP_QM_C;
  CAMP_QM_C = campBake(48, 58, (g) => {
    const cx = 24;
    // boots
    g.fillStyle = '#3a2e20';
    g.beginPath(); g.roundRect(cx - 13, 52, 10, 6, 2); g.fill();
    g.beginPath(); g.roundRect(cx + 3, 52, 10, 6, 2); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1;
    g.beginPath(); g.roundRect(cx - 13, 52, 10, 6, 2); g.stroke();
    g.beginPath(); g.roundRect(cx + 3, 52, 10, 6, 2); g.stroke();
    // stout khaki body, belly first
    g.fillStyle = '#c9a86a';
    g.beginPath();
    g.moveTo(cx - 15, 53); g.quadraticCurveTo(cx - 20, 36, cx - 14, 26);
    g.quadraticCurveTo(cx - 8, 20, cx, 20);
    g.quadraticCurveTo(cx + 8, 20, cx + 14, 26);
    g.quadraticCurveTo(cx + 20, 36, cx + 15, 53);
    g.closePath(); g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.16)'; g.fillRect(cx - 22, 42, 44, 14);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(cx - 18, 20, 16, 12);
    g.restore();
    g.strokeStyle = CPAL.out; g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(cx - 15, 53); g.quadraticCurveTo(cx - 20, 36, cx - 14, 26);
    g.quadraticCurveTo(cx - 8, 20, cx, 20);
    g.quadraticCurveTo(cx + 8, 20, cx + 14, 26);
    g.quadraticCurveTo(cx + 20, 36, cx + 15, 53);
    g.stroke();
    // belt
    g.fillStyle = '#5c4326';
    g.fillRect(cx - 16, 41, 32, 4);
    g.strokeStyle = CPAL.out; g.lineWidth = 1; g.strokeRect(cx - 16, 41, 32, 4);
    g.fillStyle = '#e3b341'; g.fillRect(cx - 3, 40.5, 6, 5);
    // badge sash, the one saturated accent
    g.strokeStyle = '#8a2f23'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(cx - 12, 24); g.lineTo(cx + 12, 44); g.stroke();
    const badgeCols = ['#f4c542', '#7ec87e', '#7ec8e8', '#e9e4da'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = badgeCols[i];
      g.beginPath(); g.arc(cx - 9 + i * 6, 26.5 + i * 5, 1.7, 0, TAU); g.fill();
    }
    // ledger clipboard in the left hand
    g.fillStyle = '#8a6138';
    g.save(); g.translate(cx + 14, 36); g.rotate(0.22);
    g.fillRect(-4, -7, 9, 13);
    g.strokeStyle = CPAL.out; g.lineWidth = 1; g.strokeRect(-4, -7, 9, 13);
    g.fillStyle = '#e9e4da'; g.fillRect(-2.6, -5.4, 6.2, 10);
    g.strokeStyle = '#8d947f'; g.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-1.6, -3 + i * 2.4); g.lineTo(2.6, -3 + i * 2.4); g.stroke(); }
    g.restore();
    // kerchief
    g.fillStyle = '#c0392b';
    g.beginPath(); g.moveTo(cx - 8, 20); g.lineTo(cx + 8, 20); g.lineTo(cx, 29); g.closePath(); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1; g.stroke();
    // head with grey mutton chops
    g.fillStyle = '#d7a45f';
    g.beginPath(); g.arc(cx, 13, 9.5, 0, TAU); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = '#c9ccd4';
    g.beginPath(); g.arc(cx - 7.5, 15, 3.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx + 7.5, 15, 3.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx, 18.5, 4.6, 0, Math.PI); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, 18.5, 4.6, 0, Math.PI); g.stroke();
    // heavy grey brows, tired eyes with a spark
    g.strokeStyle = '#c9ccd4'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx - 6, 9.5); g.lineTo(cx - 2, 10.2); g.stroke();
    g.beginPath(); g.moveTo(cx + 6, 9.5); g.lineTo(cx + 2, 10.2); g.stroke();
    g.fillStyle = '#221a12';
    g.beginPath(); g.arc(cx - 3.6, 12.4, 1.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx + 3.6, 12.4, 1.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(cx - 4, 11.9, 0.55, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx + 3.2, 11.9, 0.55, 0, TAU); g.fill();
    // campaign hat, wide crisp brim
    g.fillStyle = '#8a6f42';
    g.beginPath(); g.ellipse(cx, 7.4, 12.5, 3.4, 0, 0, TAU); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#9d7f4c';
    g.beginPath();
    g.moveTo(cx - 6.5, 7); g.quadraticCurveTo(cx - 5, -0.5, cx, -1);
    g.quadraticCurveTo(cx + 5, -0.5, cx + 6.5, 7);
    g.closePath(); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = '#5c4326'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - 6, 6); g.lineTo(cx + 6, 6); g.stroke();
  });
  return CAMP_QM_C;
}

let CAMP_SQ_C = null;
function campSquirrelSprite() {
  if (CAMP_SQ_C) return CAMP_SQ_C;
  CAMP_SQ_C = campBake(26, 24, (g) => {
    // the rescued critter: an unmarked squirrel, no tin, no red anywhere
    // tail first, big and curled
    g.fillStyle = '#8f3f18';
    g.beginPath();
    g.moveTo(16, 20);
    g.quadraticCurveTo(26, 16, 24, 7);
    g.quadraticCurveTo(22, 0, 16, 2);
    g.quadraticCurveTo(19, 7, 17, 12);
    g.quadraticCurveTo(16, 16, 13, 18);
    g.closePath(); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1.8; g.stroke();
    g.fillStyle = '#b85a24';
    g.beginPath();
    g.moveTo(17, 17); g.quadraticCurveTo(23, 13, 21.5, 6.5);
    g.quadraticCurveTo(20, 10, 18, 13);
    g.closePath(); g.fill();
    // body bean
    g.fillStyle = '#b85a24';
    g.beginPath(); g.ellipse(9, 16.5, 7.4, 6, -0.15, 0, TAU); g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.18)'; g.fillRect(0, 19, 26, 6);
    g.fillStyle = 'rgba(255,244,214,0.18)'; g.fillRect(2, 9, 8, 6);
    g.restore();
    g.strokeStyle = CPAL.out; g.lineWidth = 1.8;
    g.beginPath(); g.ellipse(9, 16.5, 7.4, 6, -0.15, 0, TAU); g.stroke();
    // cream belly
    g.fillStyle = '#e8cfa5';
    g.beginPath(); g.ellipse(7.6, 18.4, 3.6, 3, -0.1, 0, TAU); g.fill();
    // head
    g.fillStyle = '#b85a24';
    g.beginPath(); g.ellipse(6.5, 9.5, 5.2, 4.6, 0, 0, TAU); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1.8; g.stroke();
    // ear tufts
    g.fillStyle = '#b85a24';
    g.beginPath(); g.moveTo(3.4, 6.4); g.quadraticCurveTo(2.6, 1.8, 5.4, 3.6); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(8.6, 5.6); g.quadraticCurveTo(9.2, 1.2, 11.2, 4); g.closePath(); g.fill();
    g.strokeStyle = CPAL.out; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(3.4, 6.4); g.quadraticCurveTo(2.6, 1.8, 5.4, 3.6); g.stroke();
    g.beginPath(); g.moveTo(8.6, 5.6); g.quadraticCurveTo(9.2, 1.2, 11.2, 4); g.stroke();
    g.fillStyle = '#f08a9a';
    g.beginPath(); g.arc(4.4, 4.7, 0.8, 0, TAU); g.fill();
    // friendly bead eye, wet dot, no demon anywhere near this one
    g.fillStyle = '#221a12';
    g.beginPath(); g.arc(4.8, 9.2, 1.7, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(4.3, 8.6, 0.6, 0, TAU); g.fill();
    // nose and cheek
    g.fillStyle = '#3a2418';
    g.beginPath(); g.arc(1.8, 10.6, 1, 0, TAU); g.fill();
    // paws holding nothing, politely
    g.strokeStyle = CPAL.out; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(4, 14.5); g.lineTo(5.6, 15.8); g.stroke();
    g.beginPath(); g.moveTo(7.6, 14.8); g.lineTo(8.8, 16); g.stroke();
  });
  return CAMP_SQ_C;
}

// Painted conifer used by the treeline bake and the lone in-camp pines when
// the art unit's painter has not landed. Draws directly at bake time.
function campPine(q, x, yB, w, h, o) {
  o = o || {};
  const fill = o.fill || CPAL.pineMid;
  // trunk stub
  if (!o.noTrunk) {
    q.fillStyle = o.trunk || CPAL.trunk;
    q.fillRect(x - w * 0.05, yB - h * 0.2, w * 0.1, h * 0.2);
  }
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.26);
    const th = h * 0.4;
    const by = yB - h * 0.14 - i * h * 0.26;
    q.beginPath();
    q.moveTo(x - tw / 2, by);
    q.quadraticCurveTo(x - tw * 0.16, by - th * 0.42, x, by - th);
    q.quadraticCurveTo(x + tw * 0.16, by - th * 0.42, x + tw / 2, by);
    q.quadraticCurveTo(x, by + th * 0.1, x - tw / 2, by);
    q.closePath();
    q.fillStyle = fill; q.fill();
    if (o.line) { q.strokeStyle = CPAL.out; q.lineWidth = 2; q.stroke(); }
    // belly shade under each tier
    q.fillStyle = 'rgba(6,10,4,0.35)';
    q.beginPath();
    q.moveTo(x - tw * 0.42, by - 1);
    q.quadraticCurveTo(x, by + th * 0.08, x + tw * 0.42, by - 1);
    q.quadraticCurveTo(x, by - th * 0.22, x - tw * 0.42, by - 1);
    q.closePath(); q.fill();
    // west sun catches the left flank
    if (o.lit) {
      q.strokeStyle = o.lit; q.lineWidth = 2.2; q.lineCap = 'round';
      q.beginPath();
      q.moveTo(x - tw * 0.44, by - 2);
      q.quadraticCurveTo(x - tw * 0.15, by - th * 0.45, x - w * 0.02, by - th * 0.92);
      q.stroke();
    }
  }
  if (o.rim) {
    q.strokeStyle = o.rim; q.lineWidth = 1.6; q.lineCap = 'round';
    q.beginPath();
    q.moveTo(x - w * 0.1, yB - h * 1.02);
    q.quadraticCurveTo(x - w * 0.3, yB - h * 0.8, x - w * 0.4, yB - h * 0.6);
    q.stroke();
  }
}

// ------------------------------------------------- nature cluster painters -
// The reference is painterly and DENSE: no empty ground, everything in
// composed clusters. Each of these is a bake-time fallback for a future
// sprites.js painter of the same name.
function campFernClump(q, x, y, s, rng) {
  const n = 5 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.9 + (rng() - 0.5) * 0.2;
    const len = s * (0.7 + rng() * 0.5);
    const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
    q.strokeStyle = i % 2 ? '#3f5c22' : '#354e1d';
    q.lineWidth = 2.2;
    q.beginPath();
    q.moveTo(x, y);
    q.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.7 - s * 0.2, tx, ty);
    q.stroke();
    q.strokeStyle = '#557a2c'; q.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const t = k / 4;
      const px = x + (tx - x) * t, py = y + (ty - y) * t - s * 0.16 * Math.sin(t * Math.PI);
      q.beginPath(); q.moveTo(px, py); q.lineTo(px - 3, py - 2.4); q.stroke();
      q.beginPath(); q.moveTo(px, py); q.lineTo(px + 3, py - 2); q.stroke();
    }
  }
}
function campFlowerPatch(q, x, y, s, rng) {
  // one or two sunflowers over a spray of small wildflowers
  const suns = 1 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < suns; i++) {
    const fx = x + (rng() - 0.5) * s, fy = y + (rng() - 0.5) * s * 0.4;
    const hh = s * (0.9 + rng() * 0.5);
    q.strokeStyle = '#3f5c22'; q.lineWidth = 2;
    q.beginPath(); q.moveTo(fx, fy); q.quadraticCurveTo(fx + 2, fy - hh * 0.6, fx, fy - hh); q.stroke();
    q.beginPath(); q.moveTo(fx, fy - hh * 0.5); q.lineTo(fx + 4, fy - hh * 0.62); q.stroke();
    q.fillStyle = '#f4c542';
    for (let p = 0; p < 8; p++) {
      const a = p / 8 * TAU;
      q.beginPath();
      q.ellipse(fx + Math.cos(a) * 3.4, fy - hh + Math.sin(a) * 3.4, 2.4, 1.2, a, 0, TAU);
      q.fill();
    }
    q.fillStyle = '#5c4326';
    q.beginPath(); q.arc(fx, fy - hh, 2.6, 0, TAU); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 0.8; q.stroke();
  }
  const cols = ['#f08a9a', '#e9e4da', '#f4c542', '#e07a2a'];
  const n = 6 + ((rng() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const fx = x + (rng() - 0.5) * s * 1.7, fy = y + (rng() - 0.5) * s * 0.8;
    q.strokeStyle = '#3f5c22'; q.lineWidth = 1;
    q.beginPath(); q.moveTo(fx, fy + 3); q.lineTo(fx, fy); q.stroke();
    q.fillStyle = cols[(rng() * cols.length) | 0];
    q.beginPath(); q.arc(fx, fy, 1.5 + rng(), 0, TAU); q.fill();
    q.fillStyle = 'rgba(255,244,214,0.8)';
    q.beginPath(); q.arc(fx - 0.4, fy - 0.4, 0.5, 0, TAU); q.fill();
  }
}
function campMushroomRing(q, x, y, s, rng) {
  const n = 5 + ((rng() * 3) | 0);
  const rot = rng() * TAU;
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU;
    const mx = x + Math.cos(a) * s, my = y + Math.sin(a) * s * 0.55;
    const mw = 3 + rng() * 2.4;
    q.fillStyle = '#e8cfa5';
    q.fillRect(mx - mw * 0.2, my - mw * 0.9, mw * 0.4, mw * 0.9);
    q.fillStyle = '#c0392b';
    q.beginPath(); q.ellipse(mx, my - mw * 0.9, mw, mw * 0.62, 0, Math.PI, 0); q.closePath(); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 0.9; q.stroke();
    q.fillStyle = '#e9e4da';
    q.beginPath(); q.arc(mx - mw * 0.35, my - mw * 1.05, 0.7, 0, TAU); q.fill();
    q.beginPath(); q.arc(mx + mw * 0.3, my - mw * 0.95, 0.55, 0, TAU); q.fill();
  }
}
function campRockCluster(q, x, y, s, rng) {
  const n = 2 + (rng() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const rx = x + (i - (n - 1) / 2) * s * 0.8 + (rng() - 0.5) * 4;
    const ry = y + (rng() - 0.5) * s * 0.3;
    const rw = s * (0.5 + rng() * 0.45);
    q.fillStyle = CPAL.shadow;
    q.beginPath(); q.ellipse(rx + rw * 0.9, ry + 1.5, rw * 1.2, rw * 0.3, 0, 0, TAU); q.fill();
    q.fillStyle = i % 2 ? '#7a8494' : '#98a4b2';
    q.beginPath();
    q.moveTo(rx - rw, ry);
    q.quadraticCurveTo(rx - rw * 0.8, ry - rw * 0.85, rx - rw * 0.1, ry - rw * 0.9);
    q.quadraticCurveTo(rx + rw * 0.8, ry - rw * 0.85, rx + rw, ry);
    q.closePath(); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
    q.fillStyle = 'rgba(255,244,214,0.22)';
    q.beginPath(); q.ellipse(rx - rw * 0.4, ry - rw * 0.6, rw * 0.34, rw * 0.2, -0.4, 0, TAU); q.fill();
  }
}
function campMossLog(q, x, y, s, rng) {
  const rot = (rng() - 0.5) * 0.5;
  q.save(); q.translate(x, y); q.rotate(rot);
  q.fillStyle = CPAL.shadow;
  q.beginPath(); q.ellipse(s * 0.5, 3, s * 1.3, s * 0.22, 0, 0, TAU); q.fill();
  q.fillStyle = '#5c3a20';
  q.beginPath(); q.roundRect(-s, -s * 0.32, s * 2, s * 0.64, s * 0.3); q.fill();
  q.strokeStyle = CPAL.out; q.lineWidth = 1.8; q.stroke();
  q.fillStyle = '#6e4526';
  q.beginPath(); q.ellipse(s, 0, s * 0.14, s * 0.3, 0, 0, TAU); q.fill();
  q.strokeStyle = CPAL.out; q.lineWidth = 1; q.stroke();
  q.strokeStyle = '#3f2c16'; q.lineWidth = 0.8;
  q.beginPath(); q.ellipse(s, 0, s * 0.06, s * 0.16, 0, 0, TAU); q.stroke();
  // moss cap
  q.fillStyle = '#41552a';
  q.beginPath();
  q.moveTo(-s * 0.9, -s * 0.2);
  q.quadraticCurveTo(-s * 0.3, -s * 0.55, s * 0.3, -s * 0.28);
  q.quadraticCurveTo(0, -s * 0.05, -s * 0.9, -s * 0.2);
  q.closePath(); q.fill();
  q.restore();
}
function campGrassClump(q, x, y, s, rng) {
  for (let i = 0; i < 3 + ((rng() * 3) | 0); i++) {
    const gx = x + (rng() - 0.5) * s * 1.6, gy = y + (rng() - 0.5) * s * 0.6;
    if (campHasSpr(rng() < 0.5 ? 'grass1' : 'grass2')) {
      SPR.drawBottom(q, rng() < 0.5 ? 'grass1' : 'grass2', gx, gy, 16 + rng() * 10);
    }
  }
}

// ------------------------------------------------------------------ Camp ---
class Camp {
  constructor() {
    this.scene = 'grounds';        // grounds | cabin
    this.p = { x: 0, y: 60, r: 11, face: 1, moving: false };
    this.cam = { x: 0, y: 0 };
    this.t = 0;
    this.parts = [];
    this.puffs = [];
    this.smoke = [];
    this.near = null;
    this.msg = null;               // { text, t }
    this.popT = 0;
    this.starT = 0;
    this.sceneT = 0;               // door cooldown so exits do not re-enter
    this.idlers = [];
    this.selId = null;
    this.warmSpots = [
      { x: -66, y: -14, by: null },
      { x: 40, y: 30, by: null },
      { x: -18, y: 48, by: null },
    ];
    this.critter = null;
    // Fireflies live in places, never sprinkled: a slow halo around the
    // fire, a low cloud over the lake, a few weaving the grove, a pair at
    // the cabin porch light. Deterministic orbit and bob paths per firefly.
    this.fireflies = [];
    const rf = campRng(77);
    for (let i = 0; i < 8; i++) {
      this.fireflies.push({
        zone: 'fire', cx: 0, cy: -60,
        r: 86 + rf() * 44, a0: rf() * TAU, sp: (0.1 + rf() * 0.14) * (rf() < 0.5 ? -1 : 1),
        bobA: 6 + rf() * 8, bobS: 0.7 + rf() * 0.8, ph: rf() * TAU,
      });
    }
    for (let i = 0; i < 20; i++) {
      this.fireflies.push({
        zone: 'lake', cx: -300 + rf() * 600, cy: 0,
        wx: 26 + rf() * 40, ws: 0.12 + rf() * 0.2,
        depth: 14 + rf() * 70,
        bobA: 4 + rf() * 6, bobS: 0.8 + rf() * 0.9, ph: rf() * TAU,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.fireflies.push({
        zone: 'grove', cx: -490, cy: -352,
        wx: 50 + rf() * 34, wy: 26 + rf() * 18,
        s1: 0.16 + rf() * 0.12, s2: 0.23 + rf() * 0.14, ph: rf() * TAU,
      });
    }
    for (let i = 0; i < 2; i++) {
      this.fireflies.push({
        zone: 'cabin', cx: 458, cy: -338,
        r: 20 + rf() * 14, a0: rf() * TAU, sp: (0.3 + rf() * 0.2) * (i ? -1 : 1),
        bobA: 3 + rf() * 3, bobS: 1 + rf(), ph: rf() * TAU,
      });
    }
    this.glints = [];
    for (let i = 0; i < 14; i++) {
      this.glints.push({ x: rf() * 1200 - 600, k: rf(), ph: rf() * TAU });
    }
    // Blink, the firefly you befriend. His arc persists in META.flags.blink.
    this.blink = {
      stage: this.blinkStage(),
      x: 196, y: -136,
      nearT: 0, visitAdvanced: false,
      mode: 'idle', modeT: 0, breakT: rand(5, 9),
      stillT: 0, landed: false,
    };
    this.lastRuns = META.runs;
    this.bakedTier = -1;
    this.bakedFeatSig = null;
    this._interior = null;
    this._bake();
    this.buildIdlers();
    this.buildCritter();
  }

  // ------------------------------------------------------------- layout ----
  tier() { return META.tier(); }

  scoutSpots() {
    return [
      { id: 'max', name: 'Max', x: -452, y: -102 },
      { id: 'junie', name: 'Junie', x: -512, y: 76 },
      { id: 'gus', name: 'Gus', x: -402, y: 244 },
    ];
  }
  spotFor(id) {
    return this.scoutSpots().find(sc => sc.id === id) || null;
  }
  tentFor(id) {
    return { max: { x: -520, y: -150 }, junie: { x: -585, y: 30 }, gus: { x: -470, y: 205 } }[id];
  }

  walkRects() {
    const tier = this.tier();
    const R = [
      [-210, 210, -180, 140],      // fire circle
      [-660, -300, -220, 290],     // tent row
      [-320, -190, -60, 80],       // west path
      [-170, 150, -358, -230],     // supply stall front
      [-60, 70, -245, -160],       // north path
      [270, 700, -130, 130],       // trailhead
      [190, 290, -60, 70],         // east path
      [-640, -350, -450, -280],    // memorial grove
      [-375, -150, -400, -315],    // grove to stall
      [-560, -460, -295, -205],    // grove to tents
    ];
    if (tier >= 1) {
      R.push([340, 660, -300, -170]);   // cabin yard
      R.push([420, 540, -185, -110]);   // cabin path
    }
    if (tier >= 2) {
      R.push([-340, 340, 150, 345]);    // lake bank
      R.push([48, 112, 330, 465]);      // dock
      R.push([-60, 60, 125, 165]);      // lake path
    } else {
      R.push([-60, 60, 125, 195]);      // stub into the overgrowth
    }
    return R;
  }

  keepOuts() {
    const tier = this.tier();
    const K = [
      [0, -70, 44],                 // the fire itself
      [-520, -150, 46], [-585, 30, 46], [-470, 205, 46],   // tents
      [58, -52, 18],                // Brock
      [35, -345, 18],               // the Quartermaster
      [600, -30, 16],               // trail sign
      [150, 62, 40],                // picnic table
      [196, 16, 15],                // cooler
      [-100, -140, 7], [100, -135, 7],  // lantern poles
      [-85, 8, 24], [80, -2, 24],   // bench logs
      [-15, 56, 11], [95, 34, 11], [-110, -44, 11],  // stump seats
      [-430, -395, 18],             // grove cairn
      [640, 58, 12],                // trailhead mailbox
      [-150, -350, 18], [152, -350, 18],  // stall barrels and crates
      [-250, -265, 16], [-285, 130, 16], [240, -200, 16], [360, 190, 16],  // lone pines
      [-118, -300, 14],             // the feat board rack
      [-540, -350, 11],             // the grove birdhouse
      [330, -70, 17],               // the totem, carved or not
    ];
    if (tier >= 2) K.push([170, 430, 34]);   // moored canoe
    if (tier >= 4) K.push([95, -120, 9]);    // trophy post
    if (campHasSpr('findpedestal')) K.push([-616, -404, 14]);
    if (campHasSpr('npc_mailcarrier')) K.push([668, 74, 14]);
    if (tier < 1) K.push([480, -142, 12]);
    if (tier < 2) K.push([0, 225, 12]);
    return K;
  }

  clampWalk(p) {
    const rects = this.walkRects();
    // circles push first, rects have the last word so asserts stay simple
    for (const k of this.keepOuts()) {
      const dx = p.x - k[0], dy = p.y - k[1];
      const d = Math.hypot(dx, dy);
      if (d < k[2] && d > 0.001) {
        p.x = k[0] + dx / d * k[2];
        p.y = k[1] + dy / d * k[2];
      }
    }
    let insideAny = false;
    for (const r of rects) {
      if (p.x >= r[0] && p.x <= r[1] && p.y >= r[2] && p.y <= r[3]) { insideAny = true; break; }
    }
    if (!insideAny) {
      let bx = p.x, by = p.y, best = Infinity;
      for (const r of rects) {
        const cx = clamp(p.x, r[0], r[1]);
        const cy = clamp(p.y, r[2], r[3]);
        const d = (cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y);
        if (d < best) { best = d; bx = cx; by = cy; }
      }
      p.x = bx; p.y = by;
    }
  }

  // ------------------------------------------------------------- idlers ----
  buildIdlers() {
    this.selId = META.selected;
    this.idlers = [];
    for (const sp of this.warmSpots) sp.by = null;
    for (const sc of this.scoutSpots()) {
      if (sc.id === META.selected) continue;
      this.idlers.push(this.mkIdler(sc.id, sc.x, sc.y, sc));
    }
  }

  mkIdler(id, x, y, home) {
    const h = home || this.spotFor(id) || { x, y };
    return {
      id,
      x, y,
      homeX: h.x, homeY: h.y,
      state: 'idle',
      tx: h.x, ty: h.y,
      after: null,                  // state to enter when a walk arrives
      idleT: rand(7, 16),
      warmT: 0,
      warmSpot: -1,
      face: h.x > 0 ? -1 : 1,
      sway: (h.x + h.y) * 0.03,
      walkPhase: 0,
      locked: !Roster.isUnlocked(id),
    };
  }

  releaseWarm(it) {
    if (it.warmSpot >= 0 && this.warmSpots[it.warmSpot] && this.warmSpots[it.warmSpot].by === it.id) {
      this.warmSpots[it.warmSpot].by = null;
    }
    it.warmSpot = -1;
  }

  buildCritter() {
    this.critter = this.codexHasKill() ? {
      x: 44, y: 26, homeX: 44, homeY: 26,
      hopT: rand(0.8, 2), hopK: -1, hx: 44, hy: 26, tx: 44, ty: 26,
      face: -1,
    } : null;
  }

  codexHasKill() {
    const c = (META && META.codex) || {};
    for (const id in c) {
      const e = c[id];
      if (!e) continue;
      if (e === 'killed' || e.killed === true) return true;
      if (typeof e.killed === 'number' && e.killed > 0) return true;
      if (typeof e.kills === 'number' && e.kills > 0) return true;
    }
    return false;
  }

  // -------------------------------------------------------------- spots ----
  spots() {
    if (this.scene === 'cabin') {
      return [
        { id: 'exitdoor', x: 0, y: 116, r: 34, label: 'Step outside' },
        { id: 'locker', x: -52, y: 30, r: 26, label: 'Open the footlocker' },
        { id: 'pinboard', x: -20, y: -52, r: 32, label: 'Read the pinboard' },
        { id: 'bunk', x: -108, y: -6, r: 30, label: 'Sit a minute' },
        { id: 'window', x: 108, y: -50, r: 26, label: 'Look out the window' },
      ];
    }
    const tier = this.tier();
    const s = [
      { id: 'fire', x: 0, y: -60, r: 62, label: 'Talk to Scoutmaster Brock' },
      { id: 'board', x: -30, y: -352, r: 46, label: 'Open the Badge Board' },
      { id: 'qm', x: 35, y: -340, r: 38, label: 'Talk to the Quartermaster' },
      { id: 'sign', x: 600, y: -30, r: 50, label: 'Take the trail as ' + DATA.characters[META.selected].name },
    ];
    s.push({ id: 'featboard', x: -118, y: -300, r: 36, label: 'Read the Feat Board' });
    s.push({ id: 'birdhouse', x: -540, y: -350, r: 30, label: 'Knock on the birdhouse' });
    if (campTotemOpen()) s.push({ id: 'totem', x: 330, y: -70, r: 42, label: 'Carve the totem' });
    else s.push({ id: 'totemhint', x: 330, y: -70, r: 42, label: 'Look at the log' });
    if (tier >= 1) s.push({ id: 'cabindoor', x: 520, y: -292, r: 30, label: 'Step inside the cabin' });
    else s.push({ id: 'cabinhint', x: 480, y: -146, r: 40, label: 'Read the sign' });
    if (tier < 2) s.push({ id: 'lakehint', x: 0, y: 222, r: 40, label: 'Read the sign' });
    if (this.critter) {
      s.push({ id: 'critter', x: this.critter.x, y: this.critter.y, r: 30, label: 'Say hi to the squirrel' });
    }
    for (const it of this.idlers) {
      if (it.id === META.selected) continue;
      const home = this.spotFor(it.id);
      s.push({
        id: 'scout:' + it.id, x: it.x, y: it.y, r: 42, locked: it.locked,
        label: it.locked ? 'zzz' : 'Send ' + (home ? home.name : it.id) + ' tonight',
      });
    }
    return s;
  }

  // Take over another scout. The one you were is left behind to walk to the
  // spot the new one just vacated, so the camp always holds all three.
  swap(newId) {
    const prev = META.selected;
    if (newId === prev || !Roster.isUnlocked(newId)) return null;
    const incoming = this.idlers.find(it => it.id === newId);
    const target = incoming ? { x: incoming.homeX, y: incoming.homeY } : this.spotFor(newId);
    if (!target) return null;
    if (incoming) this.releaseWarm(incoming);

    const out = this.mkIdler(prev, this.p.x, this.p.y, target);
    if (out.locked) {
      out.x = target.x; out.y = target.y;
    } else {
      out.state = 'walking';
      out.after = 'idle';
      out.face = target.x >= this.p.x ? 1 : -1;
    }
    this.idlers = this.idlers.filter(it => it.id !== newId);
    this.idlers.push(out);

    META.selected = newId;
    META.save();
    this.selId = newId;
    try {
      if (typeof Voice !== 'undefined' && Voice && typeof Voice.preload === 'function') Voice.preload(newId);
    } catch (e) {}

    this.p.x = target.x;
    this.p.y = target.y;
    this.p.moving = false;
    this.popT = 0.25;
    this.starT = 0.4;
    for (let i = 0; i < 11; i++) {
      this.puffs.push({
        x: target.x + rand(-6, 6), y: target.y + this.p.r + rand(-3, 3),
        vx: rand(-48, 48), vy: rand(-30, -6),
        t: 0, life: rand(0.32, 0.6), size: rand(1.8, 4.4),
      });
    }
    this.msg = { text: SELECT_LINES[newId], t: 4 };
    return { type: 'select', id: newId };
  }

  // ------------------------------------------------------------- update ----
  update(dt) {
    this.t += dt;
    if (this.sceneT > 0) this.sceneT = Math.max(0, this.sceneT - dt);
    if (this.selId !== META.selected) this.buildIdlers();
    this._maybeBake();
    if (!this.critter && this.codexHasKill()) this.buildCritter();

    const p = this.p;
    const ax = (INPUT.keys.has('KeyD') || INPUT.keys.has('ArrowRight') ? 1 : 0) - (INPUT.keys.has('KeyA') || INPUT.keys.has('ArrowLeft') ? 1 : 0);
    const ay = (INPUT.keys.has('KeyS') || INPUT.keys.has('ArrowDown') ? 1 : 0) - (INPUT.keys.has('KeyW') || INPUT.keys.has('ArrowUp') ? 1 : 0);
    p.moving = ax !== 0 || ay !== 0;
    if (p.moving) {
      const il = 1 / Math.hypot(ax, ay);
      p.x += ax * il * 175 * dt;
      p.y += ay * il * 175 * dt;
      if (ax !== 0) p.face = ax;
      this.walkPhase = (this.walkPhase || 0) + dt * 13.5;
    }

    if (this.scene === 'cabin') {
      this.updateCabin(dt);
      return;
    }

    this.clampWalk(p);

    // walking into the cabin door steps inside
    if (this.tier() >= 1 && this.sceneT <= 0) {
      if (Math.hypot(p.x - 520, p.y + 295) < 24) this.enterCabin();
    }

    // nearest interactable
    this.near = null;
    let best = Infinity;
    for (const s of this.spots()) {
      const sd = Math.hypot(p.x - s.x, p.y - s.y);
      if (sd < s.r && sd < best) { best = sd; this.near = s; }
    }

    // camera trails the scout, clamped to the grounds
    this.updateCamera(dt);

    // fire sparks
    if (this.parts.length < 60 && Math.random() < 0.5) {
      this.parts.push({
        x: rand(-8, 8), y: -70 + rand(-4, 4), vx: rand(-8, 8), vy: -rand(26, 60),
        t: 0, life: rand(0.6, 1.3), size: rand(1.2, 2.6),
      });
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const pa = this.parts[i];
      pa.t += dt;
      pa.x += pa.vx * dt + Math.sin(this.t * 6 + i) * 6 * dt;
      pa.y += pa.vy * dt;
      if (pa.t >= pa.life) this.parts.splice(i, 1);
    }
    // cabin chimney smoke
    if (this.tier() >= 1 && this.smoke.length < 14 && Math.random() < 0.12) {
      this.smoke.push({ x: 584 + rand(-3, 3), y: -450, t: 0, life: rand(2.4, 3.6), size: rand(3, 6) });
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.t += dt;
      s.x += (10 + Math.sin(this.t * 0.8 + i) * 6) * dt;
      s.y -= 16 * dt;
      if (s.t >= s.life) this.smoke.splice(i, 1);
    }
    // takeover dust
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const pu = this.puffs[i];
      const damp = Math.exp(-4 * dt);
      pu.t += dt;
      pu.x += pu.vx * dt; pu.y += pu.vy * dt;
      pu.vx *= damp; pu.vy *= damp;
      if (pu.t >= pu.life) this.puffs.splice(i, 1);
    }
    if (this.popT > 0) this.popT = Math.max(0, this.popT - dt);
    if (this.starT > 0) this.starT = Math.max(0, this.starT - dt);

    this.updateIdlers(dt);
    this.updateCritter(dt);
    this.updateBlink(dt);
    if (this.msg) {
      this.msg.t -= dt;
      if (this.msg.t <= 0) this.msg = null;
    }
  }

  updateCamera(dt) {
    const k = 1 - Math.exp(-6 * dt);
    this.cam.x += (this.p.x - this.cam.x) * k;
    this.cam.y += (this.p.y - this.cam.y) * k;
    const W = window.innerWidth, H = window.innerHeight;
    const hw = W / (2 * CAMP_ZOOM), hh = H / (2 * CAMP_ZOOM);
    const x0 = CAMP_G.x0 - CAMP_PEEK, x1 = CAMP_G.x1 + CAMP_PEEK;
    const y0 = CAMP_G.y0 - CAMP_PEEK, y1 = CAMP_G.y1 + CAMP_PEEK;
    this.cam.x = (x1 - x0) < hw * 2 ? (x0 + x1) / 2 : clamp(this.cam.x, x0 + hw, x1 - hw);
    this.cam.y = (y1 - y0) < hh * 2 ? (y0 + y1) / 2 : clamp(this.cam.y, y0 + hh, y1 - hh);
  }

  // Scouts live here: they sleep by their tents when locked, drift from tent
  // to fire on long idles, warm their hands, and wander home again.
  updateIdlers(dt) {
    for (const it of this.idlers) {
      const lk = !Roster.isUnlocked(it.id);
      if (lk !== it.locked) {
        it.locked = lk;
        it.state = 'idle';
        this.releaseWarm(it);
        it.x = it.homeX; it.y = it.homeY;
        it.face = it.x > 0 ? -1 : 1;
      }
      if (it.locked) { it.state = 'idle'; continue; }

      if (it.state === 'idle') {
        it.idleT -= dt;
        if (it.idleT <= 0) {
          // wander over to the fire if a spot by it is free
          let free = -1;
          for (let i = 0; i < this.warmSpots.length; i++) {
            if (!this.warmSpots[i].by) { free = i; break; }
          }
          if (free >= 0) {
            this.warmSpots[free].by = it.id;
            it.warmSpot = free;
            it.state = 'walking';
            it.tx = this.warmSpots[free].x + rand(-4, 4);
            it.ty = this.warmSpots[free].y + rand(-3, 3);
            it.after = 'warming';
          } else {
            it.idleT = rand(6, 12);
          }
        }
      } else if (it.state === 'warming') {
        it.warmT -= dt;
        if (it.warmT <= 0) {
          this.releaseWarm(it);
          it.state = 'walking';
          it.tx = it.homeX; it.ty = it.homeY;
          it.after = 'idle';
        }
      }

      if (it.state !== 'walking') continue;
      const dx = it.tx - it.x, dy = it.ty - it.y;
      const d = Math.hypot(dx, dy);
      if (d <= 2) {
        it.x = it.tx; it.y = it.ty;
        it.state = it.after || 'idle';
        it.after = null;
        if (it.state === 'warming') {
          it.warmT = rand(6, 11);
          it.face = it.x > 6 ? -1 : 1;   // face the fire
        } else {
          it.idleT = rand(8, 18);
          it.face = it.x > 0 ? -1 : 1;
        }
      } else {
        const step = Math.min(d, 120 * dt);
        it.x += dx / d * step;
        it.y += dy / d * step;
        if (Math.abs(dx) > 0.5) it.face = dx > 0 ? 1 : -1;
        it.walkPhase += dt * 13.5;
      }
    }
  }

  updateCritter(dt) {
    const c = this.critter;
    if (!c) return;
    if (c.hopK >= 0) {
      c.hopK += dt / 0.32;
      if (c.hopK >= 1) {
        c.x = c.tx; c.y = c.ty;
        c.hopK = -1;
        c.hopT = rand(0.9, 2.4);
      } else {
        c.x = c.hx + (c.tx - c.hx) * c.hopK;
        c.y = c.hy + (c.ty - c.hy) * c.hopK;
      }
    } else {
      c.hopT -= dt;
      if (c.hopT <= 0) {
        const a = rand(0, TAU);
        const d = rand(10, 26);
        let nx = c.x + Math.cos(a) * d, ny = c.y + Math.sin(a) * d;
        if (Math.hypot(nx - c.homeX, ny - c.homeY) > 60) { nx = c.homeX; ny = c.homeY; }
        const fd = Math.hypot(nx, ny + 70);
        if (fd < 50) { nx = c.x; ny = c.y; }
        c.hx = c.x; c.hy = c.y; c.tx = nx; c.ty = ny;
        if (Math.abs(nx - c.x) > 0.5) c.face = nx > c.x ? 1 : -1;
        c.hopK = 0;
      }
    }
  }

  // ------------------------------------------------------------- Blink -----
  blinkStage() {
    const f = (META && META.flags) || {};
    const n = f.blink | 0;
    return n < 0 ? 0 : (n > 4 ? 4 : n);
  }

  // A firefly's place in the world, computed from time so the paths are
  // deterministic and gentle.
  fireflyPos(f) {
    const t = this.t;
    if (f.zone === 'fire') {
      const a = f.a0 + t * f.sp;
      const r = f.r + Math.sin(t * 0.4 + f.ph) * 8;
      return {
        x: f.cx + Math.cos(a) * r,
        y: f.cy + Math.sin(a) * r * 0.7 + Math.sin(t * f.bobS + f.ph) * f.bobA,
      };
    }
    if (f.zone === 'lake') {
      const x = f.cx + Math.sin(t * f.ws + f.ph) * f.wx;
      return {
        x,
        y: this.bankY(x) + f.depth + Math.sin(t * f.bobS + f.ph) * f.bobA,
      };
    }
    if (f.zone === 'grove') {
      return {
        x: f.cx + Math.sin(t * f.s1 + f.ph) * f.wx,
        y: f.cy + Math.sin(t * f.s2 + f.ph * 1.7) * f.wy,
      };
    }
    // cabin porch light
    const a = f.a0 + t * f.sp;
    return {
      x: f.cx + Math.cos(a) * f.r,
      y: f.cy + Math.sin(a) * f.r * 0.6 + Math.sin(t * f.bobS + f.ph) * f.bobA,
    };
  }

  updateBlink(dt) {
    const b = this.blink;
    const p = this.p;
    // a new night resets the once-per-visit friendship step
    if (this.lastRuns !== META.runs) {
      this.lastRuns = META.runs;
      b.visitAdvanced = false;
      b.nearT = 0;
    }
    const home = { x: 196, y: -136 };
    let tx = home.x, ty = home.y;
    let k = 1 - Math.exp(-2.2 * dt);
    const pd = Math.hypot(p.x - b.x, p.y - b.y);

    if (b.stage === 0) {
      // shy: drifts off when rushed at
      if (pd < 90 && p.moving) {
        const away = Math.hypot(b.x - p.x, b.y - p.y) || 1;
        tx = b.x + (b.x - p.x) / away * 50;
        ty = b.y + (b.y - p.y) / away * 50;
        // but never far from his patch of treeline
        const hd = Math.hypot(tx - home.x, ty - home.y);
        if (hd > 80) { tx = home.x + (tx - home.x) / hd * 80; ty = home.y + (ty - home.y) / hd * 80; }
      }
    } else if (b.stage === 1) {
      tx = home.x; ty = home.y;   // holds his ground now
    } else if (b.stage === 2) {
      // circles the fire with the halo, breaks off to say hi
      if (b.mode === 'visit') {
        b.modeT -= dt;
        tx = p.x + Math.sin(this.t * 3) * 8;
        ty = p.y - 36 + Math.sin(this.t * 2.2) * 5;
        k = 1 - Math.exp(-3.5 * dt);
        if (b.modeT <= 0) { b.mode = 'idle'; b.breakT = rand(5, 9); }
      } else {
        const a = this.t * 0.22;
        tx = Math.cos(a) * 108;
        ty = -60 + Math.sin(a) * 76 + Math.sin(this.t * 0.9) * 7;
        b.breakT -= dt;
        if (b.breakT <= 0 && Math.hypot(p.x, p.y + 60) < 240) {
          b.mode = 'visit'; b.modeT = 2.4;
        }
      }
    } else if (b.stage === 3) {
      // lives beside you now
      tx = p.x - p.face * 16 + Math.sin(this.t * 1.8) * 4;
      ty = p.y - 30 + Math.sin(this.t * 2.6) * 5;
      k = 1 - Math.exp(-4.5 * dt);
    } else {
      // perched on the hat, lifting off when you run
      if (p.moving) { b.stillT = 0; b.landed = false; }
      else b.stillT += dt;
      if (!b.landed && b.stillT > 0.5) b.landed = true;
      if (b.landed) {
        b.x = p.x + p.face * 2; b.y = p.y - 33;
      } else {
        tx = p.x - p.face * 10;
        ty = p.y - 46 + Math.sin(this.t * 2.4) * 4;
        k = 1 - Math.exp(-6 * dt);
      }
      if (!((META.flags || {}).blinkFriend)) {
        if (!META.flags) META.flags = {};
        META.flags.blinkFriend = true;
        META.save();
      }
    }
    if (!(b.stage === 4 && b.landed)) {
      b.x += (tx - b.x) * k;
      b.y += (ty - b.y) * k;
    }

    // standing with him for a couple of seconds deepens the friendship,
    // once per camp visit
    if (b.stage < 4) {
      if (pd < 60) b.nearT += dt; else b.nearT = Math.max(0, b.nearT - dt * 2);
      if (b.nearT >= 2 && !b.visitAdvanced) {
        b.visitAdvanced = true;
        b.nearT = 0;
        b.stage++;
        if (!META.flags) META.flags = {};
        META.flags.blink = b.stage;
        if (b.stage >= 4) META.flags.blinkFriend = true;
        META.save();
        const lines = [
          '',
          'The firefly does not drift away this time.',
          'The firefly joins the halo over the fire. It keeps an eye on you.',
          'The firefly has decided you are a place it lives now.',
          'The firefly lands on your hat. That is settled, then.',
        ];
        this.msg = { text: lines[b.stage] || lines[4], t: 4 };
      }
    }
  }

  renderBlink(ctx) {
    const b = this.blink;
    const p = this.p;
    const perched = b.stage === 4 && b.landed;
    // pulse harder when the player is close at stage 1+
    const pd = Math.hypot(p.x - b.x, p.y - b.y);
    const nearPulse = b.stage >= 1 && pd < 70 ? 0.22 : 0;
    const a = 0.5 + nearPulse + 0.2 * Math.sin(this.t * (perched ? 2.2 : 4.6));
    const R = perched ? 5.5 : 8;
    const gr = ctx.createRadialGradient(b.x, b.y, 0.4, b.x, b.y, R);
    gr.addColorStop(0, 'rgba(255,222,140,' + Math.min(1, a) + ')');
    gr.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.fill();
    // the little guy himself: a warm core and a tiny dark body dot
    ctx.fillStyle = 'rgba(255,240,200,0.95)';
    ctx.beginPath(); ctx.arc(b.x, b.y, 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,46,18,0.9)';
    ctx.beginPath(); ctx.arc(b.x, b.y - 1.4, 1.05, 0, TAU); ctx.fill();
  }

  // ---------------------------------------------------------- the cabin ----
  enterCabin() {
    this.scene = 'cabin';
    this.sceneT = 0.6;
    this.p.x = 0; this.p.y = 96;
    this.p.moving = false;
    this.near = null;
    if (!this._interior) this._bakeInterior();
    this.msg = { text: 'The cabin smells of pine resin and thirty years of cocoa.', t: 4 };
  }

  exitCabin() {
    this.scene = 'grounds';
    this.sceneT = 0.6;
    this.p.x = 520; this.p.y = -258;
    this.p.moving = false;
    this.near = null;
    this.cam.x = 520; this.cam.y = -258;
  }

  updateCabin(dt) {
    const p = this.p;
    // one soft room: clamp to the floor, keep out of the furniture
    for (const k of [[-108, -6, 34], [-52, 30, 15], [95, 22, 17]]) {
      const dx = p.x - k[0], dy = p.y - k[1];
      const d = Math.hypot(dx, dy);
      if (d < k[2] && d > 0.001) { p.x = k[0] + dx / d * k[2]; p.y = k[1] + dy / d * k[2]; }
    }
    p.x = clamp(p.x, -150, 150);
    p.y = clamp(p.y, -70, 118);
    if (this.sceneT <= 0 && p.y > 108 && Math.abs(p.x) < 30) { this.exitCabin(); return; }

    this.near = null;
    let best = Infinity;
    for (const s of this.spots()) {
      const sd = Math.hypot(p.x - s.x, p.y - s.y);
      if (sd < s.r && sd < best) { best = sd; this.near = s; }
    }
    this.cam.x = 0; this.cam.y = 20;
    if (this.msg) {
      this.msg.t -= dt;
      if (this.msg.t <= 0) this.msg = null;
    }
  }

  // The one feat counter the camp owns. Knocking is free, does nothing, and
  // is the only thing in Camp Hearthwood with a running total attached to it.
  knockBirdhouse() {
    const lines = [
      'You knock. Nothing. It is a birdhouse.',
      'Knock two. The hole is the size of a nickel and twice as dark.',
      'Somebody has knocked here before. There is a worn spot.',
      'You knock. Somewhere behind you, Brock decides not to ask.',
      'Nothing. You are now the kind of person who knocks on birdhouses.',
      'Six. The wood sounds hollow, which is correct, and disappointing.',
      'Seven. Something inside knocks back once, politely, and then does not.',
      'It has stopped answering. You are welcome to keep going.',
    ];
    let n = 0;
    if (typeof META !== 'undefined' && META) {
      if (!META.counters || typeof META.counters !== 'object') META.counters = { burned: 0, lowHpTime: 0, birdhouses: 0 };
      META.counters.birdhouses = (META.counters.birdhouses || 0) + 1;
      n = META.counters.birdhouses;
      if (typeof META.save === 'function') META.save();
    }
    let earned = [];
    try {
      if (typeof Feats !== 'undefined' && Feats) earned = Feats.check(META) || [];
    } catch (e) { earned = []; }
    if (earned.length) {
      try { if (typeof flagFeatFlash === 'function') flagFeatFlash(earned); } catch (e) {}
      const def = (typeof Feats !== 'undefined' && Feats) ? Feats.byId(earned[0]) : null;
      const name = (def && def.name) || earned[0];
      this.msg = { text: lines[6] + '  EARNED: ' + String(name).toUpperCase() + '.', t: 7 };
      try { AudioSys.play('levelup'); } catch (e) {}
      return null;
    }
    this.msg = { text: lines[Math.min(n, lines.length) - 1] || lines[lines.length - 1], t: 5 };
    try { AudioSys.play('click'); } catch (e) {}
    return null;
  }

  // ----------------------------------------------------------- interact ----
  interact() {
    if (!this.near) return null;
    const id = this.near.id;
    if (this.scene === 'cabin') {
      if (id === 'exitdoor') { this.exitCabin(); return null; }
      if (id === 'locker') {
        const lines = [
          'Spare kerchiefs, a tin of nails, and a label that says DO NOT LABEL.',
          'Somebody folded every shirt in here to regulation. Twice.',
          'A whistle, a spare whistle, and a whistle marked SPARE SPARE.',
        ];
        this.msg = { text: lines[(Math.random() * lines.length) | 0], t: 5 };
        return null;
      }
      if (id === 'bunk') {
        this.msg = { text: 'The blanket is scratchy in the way that means somebody cared.', t: 5 };
        return null;
      }
      if (id === 'window') {
        this.msg = { text: 'Fireflies stitch the dark outside the glass. The treeline watches back.', t: 5 };
        return null;
      }
      if (id === 'pinboard') {
        const keys = Object.keys((META && META.journal) || {});
        if (!keys.length) {
          this.msg = { text: 'Twelve empty pins. Somebody expects a lot of notes.', t: 5 };
        } else {
          const k = keys[keys.length - 1];
          const def = (typeof Finds !== 'undefined' && Finds && Finds.byId) ? Finds.byId(k) : null;
          const title = def ? def.title : k;
          this.msg = { text: 'Pinned at eye height: "' + String(title).toUpperCase() + '". ' + keys.length + ' of 12 pins filled.', t: 5 };
        }
        return null;
      }
      return null;
    }
    if (id === 'sign') return { type: 'run' };
    if (id === 'board') return { type: 'shop' };
    if (id === 'featboard') return { type: 'feats' };
    if (id === 'totem') return { type: 'totem' };
    if (id === 'totemhint') {
      this.msg = { text: 'A cedar log, upright, bark still on. Brock: "Carve it when you have seen a sunrise. Not before. Carving it before is how you get a worse sunrise."', t: 6 };
      return null;
    }
    if (id === 'birdhouse') return this.knockBirdhouse();
    if (id === 'fire') return { type: 'talk', line: brockLine(), speaker: 'SCOUTMASTER BROCK' };
    if (id === 'qm') return { type: 'talk', line: quartermasterLine(), speaker: 'THE QUARTERMASTER' };
    if (id === 'critter') return { type: 'talk', line: critterLine(), speaker: 'A SMALL SQUIRREL' };
    if (id === 'cabindoor') { this.enterCabin(); return null; }
    if (id === 'cabinhint') {
      this.msg = { text: 'NO CABIN YET. Come back after your first night out. The cabin finds people who return.', t: 5 };
      return null;
    }
    if (id === 'lakehint') {
      this.msg = { text: 'LAKESHORE CLOSED. The path grows back when the camp does. Bank 150 lifetime badges.', t: 5 };
      return null;
    }
    if (id.startsWith('scout:')) {
      const scout = id.slice(6);
      if (!Roster.isUnlocked(scout)) {
        this.msg = { text: Roster.hint(scout), t: 5 };
        return null;
      }
      return this.swap(scout);
    }
    return null;
  }

  // =========================================================== bake =========
  // The camp rebakes when it grows a tier, and now also when a feat lands a
  // new cosmetic or a carving changes the totem: both are baked furniture.
  _maybeBake() {
    if (this.bakedTier !== this.tier() || this.bakedFeatSig !== campFeatSig()) this._bake();
  }

  _bake() {
    this.bakedTier = this.tier();
    this.bakedFeatSig = campFeatSig();
    const rngG = campRng(0x5eed + this.bakedTier);
    const rngT = campRng(0x7ee5 + this.bakedTier);
    this._bakeGround(rngG);
    this._bakeTrees(rngT);
    this._buildFurniture();
  }

  _mkCanvas(x0, y0, x1, y1) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((x1 - x0) * CAMP_S);
    c.height = Math.ceil((y1 - y0) * CAMP_S);
    const q = c.getContext('2d');
    q.setTransform(CAMP_S, 0, 0, CAMP_S, -x0 * CAMP_S, -y0 * CAMP_S);
    q.lineJoin = 'round'; q.lineCap = 'round';
    return { c, q, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  bankY(x) {
    return 372 + Math.sin(x * 0.006) * 14 + Math.sin(x * 0.0173 + 2) * 7;
  }

  _paintPath(q, x0, y0, x1, y1, w, rng) {
    const mx = (x0 + x1) / 2 + (rng() - 0.5) * 40;
    const my = (y0 + y1) / 2 + (rng() - 0.5) * 40;
    const curve = () => {
      q.beginPath(); q.moveTo(x0, y0); q.quadraticCurveTo(mx, my, x1, y1);
    };
    q.strokeStyle = CPAL.path.edge; q.lineWidth = w * 1.2; q.globalAlpha = 0.35; curve(); q.stroke();
    q.strokeStyle = CPAL.path.base; q.lineWidth = w; q.globalAlpha = 0.85; curve(); q.stroke();
    q.strokeStyle = CPAL.path.mid; q.lineWidth = w * 0.5; q.globalAlpha = 0.8; curve(); q.stroke();
    q.globalAlpha = 1;
    // specks along the walk
    q.fillStyle = CPAL.path.speck;
    for (let i = 0; i <= 12; i++) {
      if (rng() < 0.5) continue;
      const t = i / 12, u = 1 - t;
      const px = u * u * x0 + 2 * u * t * mx + t * t * x1;
      const py = u * u * y0 + 2 * u * t * my + t * t * y1;
      const a = rng() * TAU, d = w * (0.24 + rng() * 0.3);
      q.globalAlpha = 0.25 + rng() * 0.25;
      q.beginPath(); q.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, 1 + rng() * 1.6, 0, TAU); q.fill();
    }
    q.globalAlpha = 1;
  }

  _clusterAt(q, x, y, rng, bias) {
    const roll = rng();
    if (bias === 'flower' || (bias !== 'plain' && roll < 0.2)) {
      if (rng() < 0.35) campSprBaked(q, 'sunflowerclump', x, y, 24, rng, campFlowerPatch, 16);
      else campSprBaked(q, 'flowerpatch', x, y, 26, rng, campFlowerPatch, 14);
    } else if (roll < 0.38) {
      campSprBaked(q, 'fernclump', x, y, 24, rng, campFernClump, 13);
    } else if (roll < 0.5) {
      campSprBaked(q, 'mushroomring', x, y, 22, rng, campMushroomRing, 10);
    } else if (roll < 0.66) {
      campSprBaked(q, 'rockcluster', x, y, 24, rng, (q2, x2, y2, s2, r2) => campRockCluster(q2, x2, y2, 9 + r2() * 5, r2), 8);
    } else if (roll < 0.76) {
      campSprBaked(q, 'mosslog', x, y, 30, rng, campMossLog, 15);
    } else {
      campSprBaked(q, 'tallgrass', x, y, 26, rng, (q2, x2, y2, s2, r2) => campGrassClump(q2, x2, y2, 14 + r2() * 8, r2), 8);
    }
  }

  _bakeGround(rng) {
    const B = CAMP_G.bleed;
    const L = this._mkCanvas(CAMP_G.x0 - B, CAMP_G.y0 - B, CAMP_G.x1 + B, CAMP_G.y1 + B);
    const q = L.q;
    const tier = this.bakedTier;
    const cust = campMeta();

    // warm grass base with mottling both darker and sunnier
    q.fillStyle = CPAL.grass;
    q.fillRect(L.x, L.y, L.w, L.h);
    for (let i = 0; i < 150; i++) {
      q.fillStyle = rng() < 0.5 ? CPAL.mottleDark : CPAL.mottleWarm;
      q.globalAlpha = 0.12 + rng() * 0.16;
      q.beginPath();
      q.ellipse(L.x + rng() * L.w, L.y + rng() * L.h, 26 + rng() * 60, 16 + rng() * 36, rng() * TAU, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;

    // golden hour: long soft tree shadows reaching in from the west treeline
    q.fillStyle = 'rgba(18,24,10,1)';
    for (let i = 0; i < 15; i++) {
      const sy = CAMP_G.y0 + 30 + (i / 15) * (CAMP_G.y1 - CAMP_G.y0 - 60) + (rng() - 0.5) * 30;
      const len = 170 + rng() * 260;
      const hh = 16 + rng() * 22;
      q.globalAlpha = 0.08 + rng() * 0.08;
      q.beginPath();
      q.moveTo(CAMP_G.x0 - 20, sy - hh);
      q.lineTo(CAMP_G.x0 + len, sy - hh * 0.3);
      q.quadraticCurveTo(CAMP_G.x0 + len + 30, sy, CAMP_G.x0 + len, sy + hh * 0.3);
      q.lineTo(CAMP_G.x0 - 20, sy + hh);
      q.closePath(); q.fill();
    }
    q.globalAlpha = 1;

    // trampled pads under each zone
    const pad = (x, y, rx, ry, col, a) => {
      q.fillStyle = col || CPAL.path.base;
      q.globalAlpha = a || 0.5;
      q.beginPath(); q.ellipse(x, y, rx, ry, 0, 0, TAU); q.fill();
      q.globalAlpha = 1;
    };
    pad(0, -30, 170, 120);                        // fire circle
    pad(-10, -330, 150, 70);                      // stall front
    pad(-480, 40, 150, 190, CPAL.path.base, 0.32);// tent row
    pad(520, -20, 150, 90);                       // trailhead
    pad(-490, -360, 120, 70, CPAL.moss, 0.55);    // grove is moss, not dirt
    if (tier >= 1) pad(500, -240, 130, 70, CPAL.path.base, 0.4);

    // worn paths stitching the zones together
    this._paintPath(q, 0, -10, -370, 30, 34, rng);       // to the tents
    this._paintPath(q, 30, -20, 590, -20, 36, rng);      // to the trailhead
    this._paintPath(q, 0, -90, -20, -320, 30, rng);      // to the stall
    this._paintPath(q, -140, -350, -420, -370, 24, rng); // stall to grove
    this._paintPath(q, 610, -20, 770, -10, 34, rng);     // the trail leaves camp
    if (tier >= 1) this._paintPath(q, 470, -60, 512, -270, 26, rng);
    if (tier >= 2) this._paintPath(q, 10, 60, 40, 330, 30, rng);
    else this._paintPath(q, 10, 60, 0, 190, 24, rng);

    // the lake, when the camp has grown to the shore
    if (tier >= 2) {
      // sandy bank apron
      q.fillStyle = CPAL.sand; q.globalAlpha = 0.5;
      q.beginPath();
      q.moveTo(CAMP_G.x0 - B, 330);
      for (let x = CAMP_G.x0 - B; x <= CAMP_G.x1 + B; x += 40) q.lineTo(x, this.bankY(x) - 14);
      q.lineTo(CAMP_G.x1 + B, 330);
      q.closePath(); q.fill();
      q.globalAlpha = 1;
      // water body
      q.fillStyle = CPAL.water.fill;
      q.beginPath();
      q.moveTo(CAMP_G.x0 - B, CAMP_G.y1 + B);
      q.lineTo(CAMP_G.x0 - B, this.bankY(CAMP_G.x0));
      for (let x = CAMP_G.x0 - B; x <= CAMP_G.x1 + B; x += 24) q.lineTo(x, this.bankY(x));
      q.lineTo(CAMP_G.x1 + B, CAMP_G.y1 + B);
      q.closePath(); q.fill();
      // deep band lower down
      q.fillStyle = CPAL.water.deep;
      q.beginPath();
      q.moveTo(CAMP_G.x0 - B, CAMP_G.y1 + B);
      q.lineTo(CAMP_G.x0 - B, 460);
      for (let x = CAMP_G.x0 - B; x <= CAMP_G.x1 + B; x += 30) {
        q.lineTo(x, 452 + Math.sin(x * 0.01) * 10);
      }
      q.lineTo(CAMP_G.x1 + B, CAMP_G.y1 + B);
      q.closePath(); q.fill();
      // bank line
      q.strokeStyle = CPAL.water.edge; q.lineWidth = 3;
      q.beginPath();
      q.moveTo(CAMP_G.x0 - B, this.bankY(CAMP_G.x0 - B));
      for (let x = CAMP_G.x0 - B; x <= CAMP_G.x1 + B; x += 24) q.lineTo(x, this.bankY(x));
      q.stroke();
      // baked sun glitter, a warm lane of it below the dock
      q.strokeStyle = CPAL.water.glint;
      for (let i = 0; i < 26; i++) {
        const gx = -80 + rng() * 320, gy = 385 + rng() * 120;
        q.globalAlpha = 0.14 + rng() * 0.2;
        q.lineWidth = 1.4;
        q.beginPath(); q.moveTo(gx - 6 - rng() * 6, gy); q.lineTo(gx + 6 + rng() * 6, gy); q.stroke();
      }
      q.globalAlpha = 1;
      // reeds along the shore
      for (let x = CAMP_G.x0 + 30; x < CAMP_G.x1 - 30; x += 60 + rng() * 70) {
        if (x > 20 && x < 140) continue;   // not through the dock
        if (campHasSpr('reed')) SPR.drawBottom(q, 'reed', x, this.bankY(x) + 8, 20 + rng() * 8);
      }
      // the dock: warm planks out over the water
      this._bakeDock(q, rng);
    }

    // fire circle furniture that lives at ground level: stone ring, char
    q.fillStyle = '#241c12'; q.globalAlpha = 0.8;
    q.beginPath(); q.ellipse(0, -66, 34, 22, 0, 0, TAU); q.fill();
    q.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + 0.3;
      const sx = Math.cos(a) * 40, sy = -66 + Math.sin(a) * 27;
      q.fillStyle = i % 2 ? '#98a4b2' : '#7a8494';
      q.beginPath(); q.ellipse(sx, sy, 6 + (i % 3), 4.4, a, 0, TAU); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 1.4; q.stroke();
      q.fillStyle = 'rgba(255,196,110,0.35)';
      q.beginPath(); q.ellipse(sx - 1.4, sy - 1.6, 2.6, 1.6, a, 0, TAU); q.fill();
    }
    // cooking clutter by the ring: flat skillet on a stone, mugs
    if (campHasSpr('stone')) SPR.drawBottom(q, 'stone', -52, -34, 20);
    q.fillStyle = '#2c2c30';
    q.beginPath(); q.ellipse(-52, -40, 8, 5, 0, 0, TAU); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.2; q.stroke();
    q.strokeStyle = '#2c2c30'; q.lineWidth = 2;
    q.beginPath(); q.moveTo(-59, -41); q.lineTo(-68, -44); q.stroke();
    for (const [mx, my, mc] of [[34, -18, '#4a76a8'], [42, -14, '#c0392b']]) {
      q.fillStyle = mc;
      q.beginPath(); q.roundRect(mx - 2.6, my - 4, 5.2, 4.6, 1); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 0.9; q.stroke();
    }

    // bedrolls by the tents: rolled canvas sleeping bags with tie straps,
    // a thin accent stripe in the tent pattern color
    const bcol = CAMP_TENTCOLS[cust.tentPattern];
    for (const [bx, by, br] of [[-462, -170, 0.3], [-528, 62, -0.2], [-408, 186, 0.25]]) {
      q.save(); q.translate(bx, by); q.rotate(br);
      q.fillStyle = CPAL.shadow;
      q.beginPath(); q.ellipse(6, 4, 25, 8, 0, 0, TAU); q.fill();
      q.fillStyle = '#a8895c';
      q.beginPath(); q.roundRect(-23, -7, 46, 14, 6); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
      // rolled end: a little spiral of canvas
      q.fillStyle = '#8f744c';
      q.beginPath(); q.ellipse(19, 0, 4.6, 6.4, 0, 0, TAU); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 1; q.stroke();
      q.strokeStyle = '#6e5638'; q.lineWidth = 1;
      q.beginPath(); q.ellipse(19, 0, 2.2, 3.4, 0, 0, TAU); q.stroke();
      // accent stripe woven through the canvas
      q.strokeStyle = bcol; q.lineWidth = 3; q.globalAlpha = 0.85;
      q.beginPath(); q.moveTo(-21, -1.4); q.lineTo(13, -1.4); q.stroke();
      q.globalAlpha = 1;
      // tie straps
      q.strokeStyle = '#5c4326'; q.lineWidth = 1.8;
      q.beginPath(); q.moveTo(-12, -8); q.lineTo(-12, 8); q.stroke();
      q.beginPath(); q.moveTo(4, -8); q.lineTo(4, 8); q.stroke();
      // top light along the roll
      q.fillStyle = 'rgba(255,196,110,0.22)';
      q.beginPath(); q.roundRect(-20, -6, 32, 3.4, 2); q.fill();
      q.restore();
    }

    // the memorial grove floor: quiet moss, small stones, cooler light
    q.fillStyle = 'rgba(44,68,32,0.5)';
    q.beginPath(); q.ellipse(-490, -360, 130, 80, 0, 0, TAU); q.fill();
    for (let i = 0; i < 8; i++) {
      const a = rng() * TAU, d = 40 + rng() * 80;
      if (campHasSpr('stone')) SPR.drawBottom(q, 'stone', -490 + Math.cos(a) * d, -360 + Math.sin(a) * d * 0.6, 14 + rng() * 6);
    }

    // trailhead corruption: the warm light dies where the trail leaves
    q.fillStyle = 'rgba(24,14,20,0.35)';
    q.beginPath(); q.ellipse(720, -10, 90, 70, 0, 0, TAU); q.fill();
    for (const [fx, fy] of [[664, 24], [700, -52], [736, 6], [688, 44]]) {
      if (campHasSpr('redfungus')) SPR.drawBottom(q, 'redfungus', fx, fy, 18 + rng() * 8);
    }

    // ----- density pass: clusters everywhere, composed, never lone --------
    // ring at the treeline feet
    const feet = [];
    for (let x = CAMP_G.x0 + 40; x < CAMP_G.x1 - 40; x += 78 + rng() * 40) {
      feet.push([x, CAMP_G.y0 + 24 + rng() * 30, 'flower']);
      if (tier < 2 || x < -420 || x > 420) feet.push([x, CAMP_G.y1 - 26 - rng() * 30, 'plain']);
    }
    for (let y = CAMP_G.y0 + 60; y < CAMP_G.y1 - 60; y += 82 + rng() * 44) {
      feet.push([CAMP_G.x0 + 26 + rng() * 30, y, 'flower']);
      feet.push([CAMP_G.x1 - 26 - rng() * 30, y, 'plain']);
    }
    for (const f of feet) {
      if (tier >= 2 && f[1] > this.bankY(f[0]) - 26) continue;
      if (Math.abs(f[1] + 10) < 70 && f[0] > 560) continue;   // not in the trail mouth
      this._clusterAt(q, f[0], f[1], rng, f[2]);
    }
    // interior sprinkle, skipping the working ground
    let placed = 0, tries = 0;
    while (placed < 64 && tries < 400) {
      tries++;
      const x = CAMP_G.x0 + 60 + rng() * (CAMP_G.x1 - CAMP_G.x0 - 120);
      const y = CAMP_G.y0 + 60 + rng() * (CAMP_G.y1 - CAMP_G.y0 - 120);
      if (Math.hypot(x, y + 40) < 120) continue;                    // fire circle stays open
      if (Math.abs(x + 10) < 130 && Math.abs(y + 330) < 90) continue;  // stall
      if (Math.hypot(x + 520, y + 150) < 90 || Math.hypot(x + 585, y - 30) < 90 || Math.hypot(x + 470, y - 205) < 90) continue;
      if (tier >= 2 && y > this.bankY(x) - 30) continue;
      if (tier >= 1 && Math.abs(x - 520) < 140 && Math.abs(y + 380) < 120) continue;
      if (Math.abs(y + 20) < 46 && x > -380 && x < 620) continue;   // main east-west walk
      this._clusterAt(q, x, y, rng, null);
      placed++;
    }
    // crates, sacks and pots in little authored groups near tents and stall
    const sack = (sx, sy, sw) => {
      q.fillStyle = CPAL.shadow;
      q.beginPath(); q.ellipse(sx + sw * 0.5, sy + 2, sw * 0.9, sw * 0.26, 0, 0, TAU); q.fill();
      q.fillStyle = '#c9a86a';
      q.beginPath();
      q.moveTo(sx - sw * 0.6, sy);
      q.quadraticCurveTo(sx - sw * 0.7, sy - sw * 0.9, sx - sw * 0.2, sy - sw);
      q.quadraticCurveTo(sx, sy - sw * 1.25, sx + sw * 0.2, sy - sw);
      q.quadraticCurveTo(sx + sw * 0.7, sy - sw * 0.9, sx + sw * 0.6, sy);
      q.closePath(); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
      q.strokeStyle = '#8a6f42'; q.lineWidth = 1;
      q.beginPath(); q.moveTo(sx - sw * 0.16, sy - sw * 1.02); q.lineTo(sx + sw * 0.16, sy - sw * 1.02); q.stroke();
      q.fillStyle = 'rgba(255,244,214,0.2)';
      q.beginPath(); q.ellipse(sx - sw * 0.25, sy - sw * 0.7, sw * 0.2, sw * 0.3, -0.3, 0, TAU); q.fill();
    };
    sack(-354, 262, 12); sack(-332, 268, 9);
    sack(-104, -302, 11);
    if (campHasSpr('urn')) {
      SPR.drawBottom(q, 'urn', -376, 252, 22);
      SPR.drawBottom(q, 'urn', 122, -310, 20);
    }

    // sun pools where life happens, plus leaf-light dapple all over
    const pool = (x, y, r, a) => {
      const gr = q.createRadialGradient(x, y, 6, x, y, r);
      gr.addColorStop(0, 'rgba(255,196,110,' + a + ')');
      gr.addColorStop(1, 'rgba(255,196,110,0)');
      q.fillStyle = gr;
      q.fillRect(x - r, y - r, r * 2, r * 2);
    };
    pool(0, -40, 240, 0.2);
    pool(-480, 40, 200, 0.13);
    pool(-10, -330, 170, 0.15);
    pool(560, -20, 170, 0.13);
    if (tier >= 1) pool(500, -235, 150, 0.13);
    if (tier >= 2) pool(80, 360, 190, 0.12);
    pool(-490, -360, 110, 0.06);
    for (let i = 0; i < 46; i++) {
      const x = CAMP_G.x0 + rng() * (CAMP_G.x1 - CAMP_G.x0);
      const y = CAMP_G.y0 + rng() * (CAMP_G.y1 - CAMP_G.y0);
      q.fillStyle = CPAL.dapple;
      q.globalAlpha = 0.35 + rng() * 0.35;
      q.beginPath(); q.ellipse(x, y, 12 + rng() * 20, 7 + rng() * 11, rng() * TAU, 0, TAU); q.fill();
    }
    q.globalAlpha = 1;

    // ground cools and darkens toward the wall of pines
    const D = 130;
    const edges = [
      [L.x, CAMP_G.y0, L.w, D, 0, 1], [L.x, CAMP_G.y1 - D, L.w, D, 0, -1],
    ];
    for (const e of edges) {
      const gr = q.createLinearGradient(0, e[5] > 0 ? e[1] : e[1] + e[3], 0, e[5] > 0 ? e[1] + e[3] : e[1]);
      gr.addColorStop(0, 'rgba(14,20,9,0.4)'); gr.addColorStop(1, 'rgba(14,20,9,0)');
      q.fillStyle = gr; q.fillRect(e[0], e[1], e[2], e[3]);
    }
    let gr = q.createLinearGradient(CAMP_G.x0, 0, CAMP_G.x0 + D, 0);
    gr.addColorStop(0, 'rgba(14,20,9,0.4)'); gr.addColorStop(1, 'rgba(14,20,9,0)');
    q.fillStyle = gr; q.fillRect(CAMP_G.x0, L.y, D, L.h);
    gr = q.createLinearGradient(CAMP_G.x1, 0, CAMP_G.x1 - D, 0);
    gr.addColorStop(0, 'rgba(14,20,9,0.4)'); gr.addColorStop(1, 'rgba(14,20,9,0)');
    q.fillStyle = gr; q.fillRect(CAMP_G.x1 - D, L.y, D, L.h);

    this.groundL = L;
  }

  _bakeDock(q, rng) {
    // posts first, shadow apron in the water
    q.fillStyle = 'rgba(8,14,12,0.4)';
    q.beginPath(); q.ellipse(80, 400, 52, 80, 0, 0, TAU); q.fill();
    campSpr(q, 'dock', 80, 470, 76, null, () => {
      for (let y = 336; y < 470; y += 13) {
        q.fillStyle = (y / 13 | 0) % 2 ? '#8a6138' : '#7c5630';
        q.beginPath(); q.roundRect(48, y, 62, 10.4, 2); q.fill();
        q.strokeStyle = CPAL.out; q.lineWidth = 1.2; q.stroke();
        q.fillStyle = 'rgba(255,196,110,0.16)';
        q.fillRect(50, y + 1, 58, 2.4);
      }
      for (const [px, py] of [[50, 342], [108, 342], [50, 462], [108, 462], [50, 402], [108, 402]]) {
        q.fillStyle = '#5c3a20';
        q.beginPath(); q.arc(px, py, 4.4, 0, TAU); q.fill();
        q.strokeStyle = CPAL.out; q.lineWidth = 1.4; q.stroke();
        q.fillStyle = 'rgba(255,196,110,0.3)';
        q.beginPath(); q.arc(px - 1.2, py - 1.2, 1.6, 0, TAU); q.fill();
      }
      // mooring rope to where the canoe rides
      q.strokeStyle = '#c9a86a'; q.lineWidth = 1.6;
      q.beginPath(); q.moveTo(110, 440); q.quadraticCurveTo(136, 452, 152, 438); q.stroke();
    });
  }

  // The wall of conifers: the camp is a warm pocket carved out of dark pine
  // mass and the contrast is the whole mood. Far layer draws under the cast,
  // near fringe draws over it.
  _bakeTrees(rng) {
    const P = CAMP_G.pad;
    const F = this._mkCanvas(CAMP_G.x0 - P, CAMP_G.y0 - P, CAMP_G.x1 + P, CAMP_G.y1 + P);
    const N = this._mkCanvas(CAMP_G.x0 - P, CAMP_G.y0 - P, CAMP_G.x1 + P, CAMP_G.y1 + P);
    const fq = F.q, nq = N.q;
    const tier = this.bakedTier;
    const gapAt = (side, along) => side === 'e' && Math.abs(along - 530) < 110;
    const outPt = (side, along, depth) => {
      if (side === 'n') return { x: CAMP_G.x0 + along, y: CAMP_G.y0 - depth };
      if (side === 's') return { x: CAMP_G.x0 + along, y: CAMP_G.y1 + depth };
      if (side === 'e') return { x: CAMP_G.x1 + depth, y: CAMP_G.y0 + along };
      return { x: CAMP_G.x0 - depth, y: CAMP_G.y0 + along };
    };

    // beyond the clearing: forest floor falling away into dusk
    fq.fillStyle = CPAL.void; fq.fillRect(F.x, F.y, F.w, F.h);
    fq.clearRect(CAMP_G.x0, CAMP_G.y0, CAMP_G.x1 - CAMP_G.x0, CAMP_G.y1 - CAMP_G.y0);
    fq.fillStyle = CPAL.floorOut;
    fq.fillRect(F.x, F.y, F.w, P);
    fq.fillRect(F.x, CAMP_G.y1, F.w, P);
    fq.fillRect(F.x, CAMP_G.y0, P, CAMP_G.y1 - CAMP_G.y0);
    fq.fillRect(CAMP_G.x1, CAMP_G.y0, P, CAMP_G.y1 - CAMP_G.y0);

    // the trail mouth: worn dirt fading out, then a dark way through
    {
      let sg = fq.createLinearGradient(CAMP_G.x1, -10, CAMP_G.x1 + 70, -10);
      sg.addColorStop(0, CPAL.path.base); sg.addColorStop(1, 'rgba(0,0,0,0)');
      fq.strokeStyle = sg; fq.lineWidth = 36; fq.globalAlpha = 0.6;
      fq.beginPath(); fq.moveTo(CAMP_G.x1 - 6, -10); fq.lineTo(CAMP_G.x1 + 64, -10); fq.stroke();
      fq.globalAlpha = 1;
      const mg = fq.createLinearGradient(CAMP_G.x1 + 30, -10, CAMP_G.x1 + 150, -10);
      mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, CPAL.void);
      fq.fillStyle = mg;
      fq.fillRect(CAMP_G.x1 + 20, -100, 160, 180);
    }

    // deep canopy mass ringing everything
    fq.fillStyle = CPAL.pineDeep;
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = -60; along < len + 60; along += 40 + rng() * 26) {
        const d = gapAt(side, along) ? 120 + rng() * 20 : 92 - rng() * 30;
        const pt = outPt(side, along, d);
        fq.beginPath();
        fq.ellipse(pt.x, pt.y, 40 + rng() * 30, 34 + rng() * 22, rng() * TAU, 0, TAU);
        fq.fill();
      }
    }

    // back row: tall dark spires sunk toward the mass
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = -50; along < len + 50; along += 46 + rng() * 22) {
        if (gapAt(side, along)) continue;
        const pt = outPt(side, along + (rng() - 0.5) * 16, 62 + rng() * 44);
        campPine(fq, pt.x, pt.y + 40, 64 + rng() * 26, 150 + rng() * 60, {
          fill: CPAL.pineBack, noTrunk: true,
        });
      }
    }
    // front row: the pines you actually read, sun catching their west flanks
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = -40; along < len + 40; along += 54 + rng() * 26) {
        if (gapAt(side, along)) continue;
        const pt = outPt(side, along + (rng() - 0.5) * 14, 16 + rng() * 34);
        campPine(fq, pt.x, pt.y + 24, 58 + rng() * 24, 120 + rng() * 56, {
          fill: rng() < 0.5 ? CPAL.pineMid : CPAL.pineFront,
          lit: rng() < 0.75 ? CPAL.pineLit : null,
          rim: rng() < 0.4 ? CPAL.pineRim : null,
          line: true,
        });
      }
    }
    // corners packed tight so the pocket reads carved, not tiled
    for (const cn of [[CAMP_G.x0, CAMP_G.y0, -1, -1], [CAMP_G.x1, CAMP_G.y0, 1, -1], [CAMP_G.x0, CAMP_G.y1, -1, 1], [CAMP_G.x1, CAMP_G.y1, 1, 1]]) {
      for (let i = 0; i < 5; i++) {
        const dx = (10 + rng() * 100) * cn[2], dy = (10 + rng() * 100) * cn[3];
        campPine(fq, cn[0] + dx, cn[1] + dy + 30, 60 + rng() * 26, 130 + rng() * 50, {
          fill: rng() < 0.5 ? CPAL.pineBack : CPAL.pineMid, lit: rng() < 0.4 ? CPAL.pineLit : null,
        });
      }
    }

    // locked zones read as dense treeline
    if (tier < 1) {
      for (let i = 0; i < 22; i++) {
        const x = 380 + rng() * 300, y = -470 + rng() * 240;
        campPine(fq, x, y + 30, 54 + rng() * 26, 110 + rng() * 60, {
          fill: rng() < 0.5 ? CPAL.pineBack : CPAL.pineMid, lit: rng() < 0.3 ? CPAL.pineLit : null, line: rng() < 0.5,
        });
      }
    }
    if (tier < 2) {
      for (let i = 0; i < 34; i++) {
        const x = CAMP_G.x0 + 30 + rng() * (CAMP_G.x1 - CAMP_G.x0 - 60);
        const y = 270 + rng() * 250;
        if (Math.abs(x) < 60 && y < 300) continue;   // leave the stub path open
        campPine(fq, x, y + 30, 54 + rng() * 28, 110 + rng() * 64, {
          fill: rng() < 0.5 ? CPAL.pineBack : CPAL.pineMid, lit: rng() < 0.3 ? CPAL.pineLit : null, line: rng() < 0.5,
        });
      }
    }

    // fade the band out into the void at the canvas edge
    const FD = 90;
    let gr = fq.createLinearGradient(0, F.y + FD, 0, F.y);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, CPAL.void);
    fq.fillStyle = gr; fq.fillRect(F.x, F.y, F.w, FD);
    gr = fq.createLinearGradient(0, F.y + F.h - FD, 0, F.y + F.h);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, CPAL.void);
    fq.fillStyle = gr; fq.fillRect(F.x, F.y + F.h - FD, F.w, FD);
    gr = fq.createLinearGradient(F.x + FD, 0, F.x, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, CPAL.void);
    fq.fillStyle = gr; fq.fillRect(F.x, F.y, FD, F.h);
    gr = fq.createLinearGradient(F.x + F.w - FD, 0, F.x + F.w, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, CPAL.void);
    fq.fillStyle = gr; fq.fillRect(F.x + F.w - FD, F.y, FD, F.h);

    // last light catching the inner rim of the treeline
    fq.strokeStyle = 'rgba(255,190,110,0.2)'; fq.lineWidth = 2.4; fq.lineCap = 'round';
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = 14; along < len - 40; along += 64) {
        if (gapAt(side, along)) continue;
        if (side === 's' && tier < 2) continue;
        const a2 = outPt(side, along, 12);
        const c2 = outPt(side, along + 34, 12);
        fq.beginPath(); fq.moveTo(a2.x, a2.y); fq.lineTo(c2.x, c2.y); fq.stroke();
      }
    }

    // ---- near fringe: trunks and brush that overhang the cast ------------
    for (const side of ['n', 'e', 'w']) {
      const len = (side === 'n') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = 16; along < len - 16; along += 66 + rng() * 34) {
        if (gapAt(side, along)) continue;
        const pt = outPt(side, along, 2 + rng() * 10);
        if (campHasSpr(rng() < 0.5 ? 'tl_trunk1' : 'tl_trunk2')) {
          SPR.drawBottom(nq, rng() < 0.5 ? 'tl_trunk1' : 'tl_trunk2', pt.x, pt.y + 6, 34 + rng() * 12);
        }
      }
    }
    // south wall shows canopy from behind unless the lake owns that edge
    if (tier < 2) {
      const len = CAMP_G.x1 - CAMP_G.x0;
      for (let along = 10; along < len - 10; along += 60 + rng() * 30) {
        const pt = outPt('s', along, 12 + rng() * 14);
        campPine(nq, pt.x, pt.y + 60, 62 + rng() * 22, 130 + rng() * 40, {
          fill: CPAL.pineFront, lit: CPAL.pineLit, line: true,
        });
      }
    }
    // undergrowth stitching the wall shut between trunks
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? CAMP_G.x1 - CAMP_G.x0 : CAMP_G.y1 - CAMP_G.y0;
      for (let along = 8; along < len - 8; along += 40 + rng() * 24) {
        if (gapAt(side, along)) continue;
        if (side === 's' && tier >= 2) continue;   // the shore is the border there
        const pt = outPt(side, along, -2 + rng() * 8);
        if (campHasSpr('tl_brush')) SPR.drawBottom(nq, 'tl_brush', pt.x, pt.y + 8, 40 + rng() * 18);
      }
    }
    // deeper in, the trailhead trunks wear the Mark, scratched at eye height
    nq.strokeStyle = 'rgba(212,64,44,0.8)'; nq.lineWidth = 1.8; nq.lineCap = 'round';
    for (const [sx, sy] of [[CAMP_G.x1 + 8, -90], [CAMP_G.x1 + 4, 66]]) {
      for (let i = 0; i < 3; i++) {
        nq.beginPath();
        nq.moveTo(sx - 5 + i * 4, sy - 7);
        nq.lineTo(sx - 8 + i * 4, sy + 7);
        nq.stroke();
      }
    }

    this.farL = F;
    this.nearL = N;
  }

  // Static furniture, y-sorted with the cast each frame. Baked positions,
  // live draws (they are a handful of cached sprite blits).
  _buildFurniture() {
    const tier = this.bakedTier;
    const cust = campMeta();
    const F = [];
    const push = (y, fn) => F.push({ y, fn });
    const shadow = (ctx, x, y, rx) => {
      ctx.fillStyle = CPAL.shadow;
      ctx.beginPath(); ctx.ellipse(x + rx * 0.5, y + 2, rx * 1.5, rx * 0.32, 0, 0, TAU); ctx.fill();
    };

    // tents, each wearing the accent flap
    const tcol = CAMP_TENTCOLS[cust.tentPattern];
    for (const [id, tx, ty, fl] of [['max', -520, -150, false], ['junie', -585, 30, false], ['gus', -470, 205, true]]) {
      push(ty + 28, (ctx) => {
        shadow(ctx, tx, ty + 28, 34);
        SPR.drawBottom(ctx, 'tent', tx, ty + 28, 86, { flip: fl });
        ctx.fillStyle = tcol; ctx.globalAlpha = 0.9;
        const dx = fl ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(tx + dx * 14, ty + 26);
        ctx.lineTo(tx + dx * 26, ty + 26);
        ctx.lineTo(tx + dx * 20, ty + 4);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.2; ctx.stroke();
      });
    }

    // the supply stall: the badge board under a layered roof, counter, stock
    push(-352, (ctx) => this.renderStall(ctx, cust, tier));
    push(-349, (ctx) => {
      shadow(ctx, -150, -336, 16);
      SPR.drawBottom(ctx, 'barrel', -150, -336, 34);
      SPR.drawBottom(ctx, 'basket', -118, -330, 30);
    });
    push(-348, (ctx) => {
      shadow(ctx, 152, -334, 16);
      SPR.drawBottom(ctx, 'crate', 152, -334, 38);
      SPR.drawBottom(ctx, 'crate', 148, -358, 30);
      SPR.drawBottom(ctx, 'basket', 186, -330, 26);
    });

    // the feat rack, standing in front of the stall: a crossbar with a sash on
    // it and one tin badge per feat claimed, so the camp says out loud how far
    // along the board you are before you ever open it.
    push(-300, (ctx) => {
      shadow(ctx, -118, -300, 14);
      this.renderFeatRack(ctx, -118, -300);
    });

    // the totem at the trailhead: bark on until the camp has seen a dawn, and
    // one carved face per carving after that.
    push(-70, (ctx) => {
      shadow(ctx, 330, -70, 15);
      this.renderTotem(ctx, 330, -70);
    });

    // trail sign
    push(-6, (ctx) => {
      shadow(ctx, 600, -6, 12);
      SPR.drawBottom(ctx, 'sign', 600, -6, 40);
      // THE TWELFTH NAME: the sanded nameplate, nailed up where people leave.
      if (campHasCosmetic('nameplate')) {
        ctx.fillStyle = '#b9bec6'; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.roundRect(608, -30, 22, 9, 1.6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,244,214,0.45)';
        ctx.fillRect(610, -28.4, 18, 1.6);
        ctx.fillStyle = '#5d6370';
        ctx.beginPath(); ctx.arc(611, -25.5, 1, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(627, -25.5, 1, 0, TAU); ctx.fill();
      }
    });
    // hint signs for the zones the camp has not grown yet
    if (tier < 1) push(-130, (ctx) => {
      shadow(ctx, 480, -130, 10);
      SPR.drawBottom(ctx, 'sign', 480, -130, 32);
    });
    if (tier < 2) push(238, (ctx) => {
      shadow(ctx, 0, 238, 10);
      SPR.drawBottom(ctx, 'sign', 0, 238, 32);
    });

    // fire circle furniture: bench logs, stump seats, tripod, picnic table
    push(16, (ctx) => {
      shadow(ctx, -85, 16, 26);
      campSpr(ctx, 'mosslog', -85, 16, 62, null, (c2, x, yB, w) => campMossLog(c2, x, yB - 8, w * 0.42, campRng(3)));
    });
    push(6, (ctx) => {
      shadow(ctx, 80, 6, 26);
      campSpr(ctx, 'mosslog', 80, 6, 58, null, (c2, x, yB, w) => campMossLog(c2, x, yB - 8, w * 0.42, campRng(9)));
    });
    for (const [sx, sy] of [[-15, 62], [95, 40], [-110, -38]]) {
      push(sy, (ctx) => {
        shadow(ctx, sx, sy, 12);
        SPR.drawBottom(ctx, 'stump', sx, sy, 30);
      });
    }
    push(-56, (ctx) => {
      // iron tripod over the fire, pot hanging
      ctx.strokeStyle = '#2c2c30'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-24, -56); ctx.lineTo(0, -112); ctx.lineTo(24, -56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -112); ctx.lineTo(10, -58); ctx.stroke();
      ctx.strokeStyle = '#181008'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(0, -96); ctx.stroke();
      ctx.fillStyle = '#2c2c30';
      ctx.beginPath(); ctx.ellipse(0, -90, 7, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,196,110,0.35)';
      ctx.beginPath(); ctx.ellipse(-2, -93, 2.4, 1.6, 0, 0, TAU); ctx.fill();
    });
    push(64, (ctx) => {
      shadow(ctx, 150, 64, 38);
      campSpr(ctx, 'picnictable', 150, 64, 92, null, (c2, x, yB, w) => this.fallbackPicnic(c2, x, yB, w));
    });
    push(18, (ctx) => {
      shadow(ctx, 196, 18, 14);
      campSpr(ctx, 'cooler', 196, 18, 34, null, (c2, x, yB, w) => this.fallbackCooler(c2, x, yB, w));
    });

    // lantern poles by the fire, the string glows per frame
    for (const [px, py] of [[-100, -140], [100, -135]]) {
      push(py, (ctx) => {
        ctx.fillStyle = '#6e4526';
        ctx.fillRect(px - 3, py - 88, 6, 88);
        ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6;
        ctx.strokeRect(px - 3, py - 88, 6, 88);
        ctx.fillStyle = 'rgba(255,196,110,0.35)';
        ctx.fillRect(px - 2, py - 86, 1.6, 84);
      });
    }

    // trophy skull on a post after the first dawn
    if (tier >= 4) push(-118, (ctx) => {
      shadow(ctx, 95, -118, 8);
      ctx.fillStyle = '#6e4526'; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6;
      ctx.fillRect(92, -158, 6, 40); ctx.strokeRect(92, -158, 6, 40);
      SPR.draw(ctx, 'skull', 95, -165, 44);
    });
    // TROPHY WALL: the post gets two neighbours, one per named thing put down.
    if (campHasCosmetic('trophyrow')) {
      for (const [tx, th] of [[54, 34], [136, 30]]) {
        push(-116, (ctx) => {
          shadow(ctx, tx, -116, 7);
          ctx.fillStyle = '#6e4526'; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6;
          ctx.fillRect(tx - 3, -116 - th, 6, th); ctx.strokeRect(tx - 3, -116 - th, 6, th);
          SPR.draw(ctx, 'skull', tx, -116 - th - 8, 36);
        });
      }
    }
    // FEEDING THE CORKBOARD: bunting strung between the lantern poles.
    if (campHasCosmetic('bunting')) {
      push(-141, (ctx) => {
        const cols = CAMP_BANNERS[cust.banner];
        ctx.strokeStyle = '#3a2c18'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-100, -226);
        ctx.quadraticCurveTo(0, -196, 100, -221);
        ctx.stroke();
        for (let i = 0; i <= 9; i++) {
          const t = i / 9, u = 1 - t;
          const bx = u * u * -100 + 2 * u * t * 0 + t * t * 100;
          const by = u * u * -226 + 2 * u * t * -196 + t * t * -221;
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath();
          ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.lineTo(bx, by + 10);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
        }
      });
    }
    // BLINK'S FAVORITE: a jar on the picnic table with the lid off, glowing.
    if (campHasCosmetic('blinkjar')) {
      push(66, (ctx) => {
        ctx.fillStyle = 'rgba(210,240,180,0.16)';
        ctx.strokeStyle = 'rgba(220,240,200,0.55)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.roundRect(168, -1, 13, 17, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(190,230,120,0.85)';
        ctx.beginPath(); ctx.arc(174.5, 9, 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(190,230,120,0.22)';
        ctx.beginPath(); ctx.arc(174.5, 9, 7, 0, TAU); ctx.fill();
      });
    }

    // lone pines inside the grounds, depth the camera can walk around
    for (const [px, py, pw, ph, seed] of [[-250, -265, 74, 168, 11], [-285, 130, 66, 150, 12], [240, -200, 70, 158, 13], [360, 190, 64, 146, 14]]) {
      push(py, (ctx) => {
        shadow(ctx, px, py, 20);
        campSpr(ctx, seed % 2 ? 'conifer1' : 'conifer2', px, py, pw, null, (c2, x, yB, w) => {
          campPine(c2, x, yB, w, ph, { fill: CPAL.pineFront, lit: CPAL.pineLit, rim: CPAL.pineRim, line: true });
        });
      });
    }

    // firewood by the tents
    push(266, (ctx) => {
      shadow(ctx, -560, 266, 24);
      SPR.drawBottom(ctx, 'logpile', -560, 266, 56);
    });
    push(-88, (ctx) => {
      shadow(ctx, -600, -88, 18);
      SPR.drawBottom(ctx, 'crate', -600, -88, 36);
    });

    // the memorial grove: one marshmallow stick per fallen run, and a cairn
    const sticks = Math.min(META.deaths, 24);
    for (let i = 0; i < sticks; i++) {
      const sx = -566 + (i % 8) * 20;
      const sy = -388 + Math.floor(i / 8) * 26;
      push(sy, (ctx) => SPR.drawBottom(ctx, 'stick', sx, sy, 11));
    }
    push(-380, (ctx) => {
      shadow(ctx, -430, -380, 18);
      for (const [cx2, cy2, cw] of [[-436, -380, 16], [-424, -380, 14], [-430, -390, 12], [-430, -398, 9]]) {
        SPR.drawBottom(ctx, 'stone', cx2, cy2, cw);
      }
    });
    push(-350, (ctx) => {
      shadow(ctx, -540, -350, 12);
      SPR.drawBottom(ctx, 'birdhouse', -540, -350, 30);
    });
    // BIRDHOUSE ENTHUSIAST: the grove agrees with you and builds four more.
    if (campHasCosmetic('birdhouse_row')) {
      for (const [bx, by, bw] of [[-578, -362, 26], [-604, -338, 22], [-500, -344, 24], [-472, -366, 20]]) {
        push(by, (ctx) => {
          shadow(ctx, bx, by, 9);
          SPR.drawBottom(ctx, 'birdhouse', bx, by, bw);
        });
      }
    }
    // THE GROVE IS FULL: a line strung between the tents, old sashes drying.
    if (campHasCosmetic('sashline')) {
      push(-84, (ctx) => {
        ctx.strokeStyle = '#3a2c18'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-556, -196);
        ctx.quadraticCurveTo(-500, -172, -448, -190);
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const t = 0.16 + i * 0.22, u = 1 - t;
          const sx = u * u * -556 + 2 * u * t * -500 + t * t * -448;
          const sy = u * u * -196 + 2 * u * t * -172 + t * t * -190;
          ctx.fillStyle = i % 2 ? '#3f5c22' : '#5c7248';
          ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.roundRect(sx - 4, sy, 8, 26, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#f4c542';
          for (let k = 0; k < 3; k++) {
            ctx.beginPath(); ctx.arc(sx, sy + 6 + k * 7, 1.5, 0, TAU); ctx.fill();
          }
        }
      });
    }
    // a find pedestal keeps the grove's quiet company once its painter lands
    if (campHasSpr('findpedestal')) {
      push(-404, (ctx) => {
        shadow(ctx, -616, -404, 14);
        SPR.drawBottom(ctx, 'findpedestal', -616, -404, 34);
      });
    }
    // the trailhead mail vignette: letters leave camp even when scouts do not
    push(58, (ctx) => {
      shadow(ctx, 640, 58, 10);
      SPR.drawBottom(ctx, 'mailbox', 640, 58, 26);
    });
    if (campHasSpr('npc_mailcarrier')) {
      push(74, (ctx) => {
        shadow(ctx, 668, 74, 13);
        SPR.drawBottom(ctx, 'npc_mailcarrier', 668, 74, 40, { flip: true });
      });
    }

    // the cabin, once the camp has earned it
    if (tier >= 1) {
      push(-300, (ctx) => campSpr(ctx, 'cabin', 520, -300, 220, null, (c2, x, yB, w) => this.fallbackCabin(c2, x, yB, w)));
    }
    // the canoe, once the shore is open
    if (tier >= 2) {
      push(438, (ctx) => {
        ctx.fillStyle = 'rgba(8,14,12,0.45)';
        ctx.beginPath(); ctx.ellipse(170, 442, 44, 12, -0.12, 0, TAU); ctx.fill();
        campSpr(ctx, 'canoe', 170, 446, 88, null, (c2, x, yB, w) => this.fallbackCanoe(c2, x, yB, w));
      });
    }

    this.furn = F;
  }

  // --------------------------------------------- feat rack and the totem ---
  // A crossbar with a hand sewn sash over it and one tin badge per claimed
  // feat, up to the whole board. Reading the camp should tell you where you
  // are before you open a single screen.
  renderFeatRack(ctx, x, yB) {
    let claimed = 0, total = 0;
    try {
      if (typeof Feats !== 'undefined' && Feats) { claimed = Feats.count(); total = Feats.total; }
    } catch (e) {}
    const top = yB - 62;
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6;
    ctx.fillStyle = '#6e4526';
    for (const px of [x - 17, x + 17]) {
      ctx.fillRect(px - 3, top, 6, 62);
      ctx.strokeRect(px - 3, top, 6, 62);
    }
    ctx.fillStyle = '#7c5630';
    ctx.beginPath(); ctx.roundRect(x - 24, top - 5, 48, 7, 2); ctx.fill(); ctx.stroke();
    // the sash
    ctx.fillStyle = '#3f5c22';
    ctx.beginPath(); ctx.roundRect(x - 12, top + 2, 24, 46, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,244,214,0.14)';
    ctx.fillRect(x - 10, top + 4, 6, 42);
    // one tin badge per claimed feat, four to a row
    const cap = Math.min(claimed, total || claimed);
    for (let i = 0; i < cap; i++) {
      const bx = x - 8 + (i % 3) * 8;
      const by = top + 9 + Math.floor(i / 3) * 8;
      ctx.fillStyle = '#f4c542';
      ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(24,16,8,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    if (!cap) {
      ctx.fillStyle = 'rgba(24,16,8,0.35)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(x - 8 + i * 8, top + 9, 2.4, 0, TAU); ctx.fill();
      }
    }
  }

  // A cedar log at the trailhead. Before the first dawn it still has its bark
  // on and reads as firewood nobody has got round to. After it, every carving
  // you switch on is another face stacked up the pole, so the camp shows how
  // much worse you have promised tonight will be from across the clearing.
  renderTotem(ctx, x, yB) {
    const open = campTotemOpen();
    const carved = open ? campCarvings() : [];
    const seg = 22;
    const hw = 13;
    // the pole is as tall as the promises on it, with a floor so a sanded
    // pole is still a pole and not a stump.
    const h = Math.max(54, 16 + carved.length * seg);
    const top = yB - h;

    ctx.fillStyle = open ? '#7c5630' : '#5a4327';
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(x - hw, top, hw * 2, h, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,196,110,0.18)';
    ctx.fillRect(x - hw + 2, top + 3, 5, h - 6);
    ctx.fillStyle = 'rgba(24,16,8,0.22)';
    ctx.fillRect(x + hw - 6, top + 3, 4, h - 6);

    if (!open) {
      // bark still on: rough vertical strokes, nothing carved into it at all
      ctx.strokeStyle = 'rgba(24,16,8,0.5)'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 7; i++) {
        const bx = x - 9 + i * 3.1;
        ctx.beginPath(); ctx.moveTo(bx, top + 4); ctx.lineTo(bx + 1.6, yB - 4); ctx.stroke();
      }
      ctx.fillStyle = '#4a3a1f';
      ctx.beginPath(); ctx.ellipse(x, top + 2, hw, 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4; ctx.stroke();
      return;
    }

    // one carved face per promise, oldest at the bottom, newest wearing the
    // antlers so the whole stack still reads as one totem from a distance.
    for (let i = 0; i < carved.length; i++) {
      const fy = yB - 12 - i * seg;
      const topFace = i === carved.length - 1;
      // recessed panel
      ctx.fillStyle = 'rgba(24,16,8,0.5)';
      ctx.beginPath(); ctx.roundRect(x - hw + 2, fy - 17, hw * 2 - 4, 19, 3); ctx.fill();
      ctx.fillStyle = 'rgba(120,78,36,0.55)';
      ctx.beginPath(); ctx.roundRect(x - hw + 3, fy - 16, hw * 2 - 6, 8, 3); ctx.fill();
      // a heavy carved brow over two lit sockets
      ctx.fillStyle = '#3b2711';
      ctx.fillRect(x - 8, fy - 13, 16, 3);
      ctx.fillStyle = '#f4c542';
      ctx.beginPath(); ctx.arc(x - 4.5, fy - 8, 2.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4.5, fy - 8, 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(244,197,66,0.22)';
      ctx.beginPath(); ctx.arc(x - 4.5, fy - 8, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 4.5, fy - 8, 5, 0, TAU); ctx.fill();
      // a flat tooth row for a mouth
      ctx.fillStyle = '#241606';
      ctx.fillRect(x - 7, fy - 3, 14, 3);
      ctx.fillStyle = 'rgba(233,228,218,0.75)';
      for (let k = 0; k < 4; k++) ctx.fillRect(x - 6 + k * 3.6, fy - 3, 1.6, 3);
      if (topFace) {
        ctx.fillStyle = '#c9ccd4'; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.1;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + s * hw, fy - 14);
          ctx.lineTo(x + s * (hw + 9), fy - 21);
          ctx.lineTo(x + s * (hw + 10), fy - 15);
          ctx.lineTo(x + s * (hw + 2), fy - 8);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    }
    // sanded cap
    ctx.fillStyle = '#8a6138';
    ctx.beginPath(); ctx.ellipse(x, top + 2, hw, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = 'rgba(255,244,214,0.18)';
    ctx.beginPath(); ctx.ellipse(x - 2, top + 1, hw * 0.5, 2, 0, 0, TAU); ctx.fill();
  }

  // ------------------------------------------------- fallback furniture ----
  fallbackPicnic(ctx, x, yB, w) {
    const h = w * 0.52;
    const top = yB - h;
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2;
    // X legs
    ctx.fillStyle = '#6e4526';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(x + s * w * 0.3, yB - h * 0.32);
      ctx.rotate(s * 0.5);
      ctx.fillRect(-3, -h * 0.3, 6, h * 0.62);
      ctx.strokeRect(-3, -h * 0.3, 6, h * 0.62);
      ctx.rotate(-s * 1);
      ctx.fillRect(-3, -h * 0.3, 6, h * 0.62);
      ctx.strokeRect(-3, -h * 0.3, 6, h * 0.62);
      ctx.restore();
    }
    // benches
    ctx.fillStyle = '#7c5630';
    ctx.beginPath(); ctx.roundRect(x - w * 0.46, yB - h * 0.34, w * 0.92, 7, 2); ctx.fill(); ctx.stroke();
    // top planks
    ctx.fillStyle = '#8a6138';
    ctx.beginPath(); ctx.roundRect(x - w * 0.5, top, w, 12, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(24,16,8,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w * 0.46, top + 6); ctx.lineTo(x + w * 0.46, top + 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,196,110,0.25)';
    ctx.fillRect(x - w * 0.46, top + 1.4, w * 0.92, 2.6);
    // clutter on top: tin plate and a mug
    ctx.fillStyle = '#c9ccd4';
    ctx.beginPath(); ctx.ellipse(x - w * 0.16, top + 2, 7, 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#4a76a8';
    ctx.beginPath(); ctx.roundRect(x + w * 0.12, top - 6, 8, 8, 1.6); ctx.fill(); ctx.stroke();
  }

  fallbackCooler(ctx, x, yB, w) {
    const h = w * 0.74;
    ctx.fillStyle = '#4a76a8';
    ctx.beginPath(); ctx.roundRect(x - w / 2, yB - h, w, h, 4); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e9e4da';
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 1.4, yB - h - 5, w + 2.8, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,244,214,0.3)';
    ctx.fillRect(x - w / 2 + 2, yB - h + 3, w * 0.3, h * 0.5);
    ctx.fillStyle = '#c9ccd4';
    ctx.fillRect(x - 2.4, yB - h + 2, 4.8, 4);
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.strokeRect(x - 2.4, yB - h + 2, 4.8, 4);
  }

  fallbackCanoe(ctx, x, yB, w) {
    const h = w * 0.34;
    ctx.save();
    ctx.translate(x, yB - h * 0.5);
    ctx.rotate(-0.08);
    // hull: deep belly, both ends sweeping up into points
    ctx.fillStyle = '#8f3f18';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.34);
    ctx.quadraticCurveTo(-w * 0.34, h * 0.5, 0, h * 0.52);
    ctx.quadraticCurveTo(w * 0.34, h * 0.5, w / 2, -h * 0.34);
    ctx.quadraticCurveTo(w * 0.4, -h * 0.02, w * 0.3, -h * 0.06);
    ctx.quadraticCurveTo(0, h * 0.02, -w * 0.3, -h * 0.06);
    ctx.quadraticCurveTo(-w * 0.4, -h * 0.02, -w / 2, -h * 0.34);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2.2; ctx.stroke();
    // interior: the dark inside with a bench thwart
    ctx.fillStyle = '#4a1f0c';
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.04);
    ctx.quadraticCurveTo(0, h * 0.05, w * 0.3, -h * 0.04);
    ctx.quadraticCurveTo(w * 0.34, h * 0.1, w * 0.24, h * 0.14);
    ctx.quadraticCurveTo(0, h * 0.22, -w * 0.24, h * 0.14);
    ctx.quadraticCurveTo(-w * 0.34, h * 0.1, -w * 0.3, -h * 0.04);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(24,16,8,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#b85a24';
    ctx.beginPath(); ctx.roundRect(-5, -h * 0.02, 10, h * 0.16, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
    // hull planking and the sun on the gunwale
    ctx.strokeStyle = '#5c2c12'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, h * 0.1);
    ctx.quadraticCurveTo(0, h * 0.4, w * 0.42, h * 0.1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,110,0.55)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-w * 0.46, -h * 0.26);
    ctx.quadraticCurveTo(-w * 0.3, -h * 0.02, 0, -h * 0.01);
    ctx.stroke();
    // a paddle laid across the near gunwale
    ctx.strokeStyle = '#8a6138'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-w * 0.1, -h * 0.24); ctx.lineTo(w * 0.22, h * 0.34); ctx.stroke();
    ctx.fillStyle = '#8a6138';
    ctx.beginPath(); ctx.ellipse(w * 0.26, h * 0.42, 4.6, 7.4, 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  fallbackCabin(ctx, x, yB, w) {
    const wallH = w * 0.42;
    const roofH = w * 0.34;
    const x0 = x - w / 2, x1 = x + w / 2;
    const wallTop = yB - wallH;
    // log courses
    for (let i = 0; i < 6; i++) {
      const ly = yB - (i + 1) * wallH / 6;
      ctx.fillStyle = i % 2 ? '#6e4526' : '#5f3c20';
      ctx.beginPath(); ctx.roundRect(x0, ly, w, wallH / 6 + 1, 3); ctx.fill();
      ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = 'rgba(255,196,110,0.12)';
      ctx.fillRect(x0 + 3, ly + 1.4, w - 6, 2);
      // log ends
      for (const ex of [x0, x1]) {
        ctx.fillStyle = '#8a6138';
        ctx.beginPath(); ctx.arc(ex, ly + wallH / 12, wallH / 11, 0, TAU); ctx.fill();
        ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.strokeStyle = '#5c3a20'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(ex, ly + wallH / 12, wallH / 22, 0, TAU); ctx.stroke();
      }
    }
    // roof: two layered shingle slopes with a warm lit edge
    ctx.fillStyle = '#3d3126';
    ctx.beginPath();
    ctx.moveTo(x0 - 16, wallTop + 4);
    ctx.lineTo(x, wallTop - roofH);
    ctx.lineTo(x1 + 16, wallTop + 4);
    ctx.lineTo(x1 + 8, wallTop + 10);
    ctx.lineTo(x, wallTop - roofH + 10);
    ctx.lineTo(x0 - 8, wallTop + 10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#54432f';
    ctx.beginPath();
    ctx.moveTo(x0 - 10, wallTop + 2);
    ctx.lineTo(x, wallTop - roofH + 4);
    ctx.lineTo(x1 + 10, wallTop + 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(24,16,8,0.6)'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(x0 - 10 + (x - x0 + 10) * t, wallTop + 2 - (roofH - 2) * t);
      ctx.lineTo(x1 + 10 - (x1 - x + 10) * t, wallTop + 2 - (roofH - 2) * t);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,196,110,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 - 12, wallTop + 1); ctx.lineTo(x - 2, wallTop - roofH + 3); ctx.stroke();
    // stone chimney: a squat capped stack poking through the roof slope
    const chX = x + w * 0.24, chTop = wallTop - roofH * 0.66;
    ctx.fillStyle = '#7a8494';
    ctx.beginPath(); ctx.roundRect(chX, chTop, 22, roofH * 0.62, 3); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#98a4b2';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(chX + 6 + (i % 2) * 10, chTop + 8 + i * 7, 3.4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#5f6b7a';
    ctx.beginPath(); ctx.roundRect(chX - 3, chTop - 6, 28, 8, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = 'rgba(255,196,110,0.25)';
    ctx.fillRect(chX - 1, chTop - 4.6, 10, 3);
    // door with a small porch step
    const dw = w * 0.16, dh = wallH * 0.78;
    ctx.fillStyle = '#241708';
    ctx.beginPath(); ctx.roundRect(x - dw / 2, yB - dh, dw, dh, 3); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#8a6138'; ctx.lineWidth = 1.6;
    ctx.strokeRect(x - dw / 2 + 3, yB - dh + 3, dw - 6, dh - 6);
    ctx.fillStyle = '#e3b341';
    ctx.beginPath(); ctx.arc(x + dw / 2 - 5, yB - dh * 0.45, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7c5630';
    ctx.beginPath(); ctx.roundRect(x - dw * 0.7, yB - 2, dw * 1.4, 5, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.2; ctx.stroke();
    // warm lit window
    const wx = x - w * 0.28, wy = yB - wallH * 0.62;
    ctx.fillStyle = '#ffca6e';
    ctx.beginPath(); ctx.roundRect(wx - 11, wy - 10, 22, 20, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#5c3a20'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 10); ctx.lineTo(wx, wy + 10);
    ctx.moveTo(wx - 11, wy); ctx.lineTo(wx + 11, wy);
    ctx.stroke();
    // firewood stacked against the wall
    for (let i = 0; i < 5; i++) {
      const lx = x1 - 14 - (i % 3) * 10, ly = yB - 5 - Math.floor(i / 3) * 8;
      ctx.fillStyle = '#8a6138';
      ctx.beginPath(); ctx.arc(lx, ly, 4.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = '#5c3a20'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, TAU); ctx.stroke();
    }
  }

  renderStall(ctx, cust, tier) {
    const x = -10, backY = -430, frontY = -352;
    // posts
    ctx.fillStyle = '#6e4526'; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.8;
    for (const [px, py, ph] of [[-130, frontY, 74], [110, frontY, 74], [-118, backY + 44, 52], [98, backY + 44, 52]]) {
      ctx.fillRect(px - 3.4, py - ph, 6.8, ph);
      ctx.strokeRect(px - 3.4, py - ph, 6.8, ph);
    }
    // the badge board itself lives under the roof
    SPR.drawBottom(ctx, 'board', -30, -368, 62);
    if (tier >= 3) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(244,197,66,' + (0.10 + Math.sin(this.t * 3) * 0.04) + ')';
      ctx.beginPath(); ctx.arc(-30, -394, 44, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // counter with wares
    ctx.fillStyle = '#8a6138';
    ctx.beginPath(); ctx.roundRect(8, -382, 96, 10, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,196,110,0.25)'; ctx.fillRect(10, -381, 92, 2.4);
    ctx.fillStyle = '#6e4526';
    ctx.fillRect(14, -372, 5, 20); ctx.fillRect(92, -372, 5, 20);
    // wares on the counter: jars, tin stack, rope coil
    ctx.fillStyle = '#7ec8e8';
    ctx.beginPath(); ctx.roundRect(20, -394, 9, 12, 2); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#e3b341';
    ctx.beginPath(); ctx.roundRect(34, -392, 9, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9ccd4';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(58, -385 - i * 3.4, 7, 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(82, -388, 5.4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(82, -388, 7, 0, TAU); ctx.stroke();
    // layered roof: canvas over planks, lit along the front edge
    ctx.fillStyle = '#54432f';
    ctx.beginPath();
    ctx.moveTo(-146, frontY - 70);
    ctx.lineTo(126, frontY - 70);
    ctx.lineTo(112, backY - 8);
    ctx.lineTo(-132, backY - 8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = '#5c7248';
    ctx.beginPath();
    ctx.moveTo(-150, frontY - 64);
    ctx.lineTo(130, frontY - 64);
    ctx.lineTo(122, frontY - 84);
    ctx.lineTo(-142, frontY - 84);
    ctx.closePath(); ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,110,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-146, frontY - 66); ctx.lineTo(126, frontY - 66); ctx.stroke();
    // scalloped canvas edge
    ctx.fillStyle = '#5c7248';
    for (let sx = -142; sx < 122; sx += 24) {
      ctx.beginPath(); ctx.arc(sx + 12, frontY - 64, 11, 0, Math.PI); ctx.fill();
    }
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.4;
    for (let sx = -142; sx < 122; sx += 24) {
      ctx.beginPath(); ctx.arc(sx + 12, frontY - 64, 11, 0, Math.PI); ctx.stroke();
    }
    // pennant string across the front once the camp has grown into itself
    if (tier >= 2) {
      const cols = CAMP_BANNERS[cust.banner];
      ctx.strokeStyle = '#3a2e20'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-130, frontY - 60); ctx.quadraticCurveTo(-10, frontY - 46, 110, frontY - 60); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const t = (i + 0.5) / 8;
        const bx = -130 + t * 240;
        const by = frontY - 60 + (1 - Math.abs(t - 0.5) * 2) * 13 + Math.sin(i * 1.2) * 1.5;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx, by + 11); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }

  // ============================================================ render ======
  // o.bare skips the prompt, message and letterhead (used by wide captures).
  render(ctx, W, H, o) {
    if (this.scene === 'cabin') { this.renderCabin(ctx, W, H); return; }
    this._maybeBake();
    const tier = this.bakedTier;
    ctx.fillStyle = CPAL.void;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(CAMP_ZOOM, CAMP_ZOOM);
    ctx.translate(-this.cam.x, -this.cam.y);

    // the three baked layers cost three drawImage calls
    ctx.drawImage(this.groundL.c, this.groundL.x, this.groundL.y, this.groundL.w, this.groundL.h);
    ctx.drawImage(this.farL.c, this.farL.x, this.farL.y, this.farL.w, this.farL.h);

    // living water: glints riding the baked lake
    if (tier >= 2) {
      ctx.strokeStyle = CPAL.water.glint;
      ctx.lineWidth = 1.6;
      for (const gl of this.glints) {
        const gy = this.bankY(gl.x) + 14 + gl.k * 120;
        const a = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(this.t * 1.6 + gl.ph));
        ctx.globalAlpha = a;
        const gw = 6 + Math.sin(this.t * 0.9 + gl.ph) * 3;
        ctx.beginPath(); ctx.moveTo(gl.x - gw, gy); ctx.lineTo(gl.x + gw, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // slow bank lap
      ctx.strokeStyle = 'rgba(230,240,220,' + (0.10 + 0.06 * Math.sin(this.t * 1.1)) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lap = Math.sin(this.t * 1.1) * 3;
      for (let x = -320; x <= 320; x += 26) {
        const y = this.bankY(x) + 5 + lap;
        if (x === -320) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // firelight pool, breathing
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flick = 0.10 + Math.sin(this.t * 11) * 0.02 + Math.sin(this.t * 23) * 0.01;
    const lg = ctx.createRadialGradient(0, -60, 10, 0, -60, 240);
    lg.addColorStop(0, 'rgba(255,150,60,' + flick + ')');
    lg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(0, -60, 240, 0, TAU); ctx.fill();
    ctx.restore();

    // draw list: baked furniture positions plus the living cast, y-sorted
    const items = [];
    for (const f of this.furn) items.push(f);
    const push = (y, fn) => items.push({ y, fn });

    push(-56, (c2) => this.renderFire(c2));
    push(-46, (c2) => {
      const squash = 1 + Math.sin(this.t * 2.2) * 0.02;
      c2.fillStyle = CPAL.shadow;
      c2.beginPath(); c2.ellipse(64, -44, 16, 5.4, 0, 0, TAU); c2.fill();
      SPR.drawBottom(c2, 'brock', 58, -46, 40, { flip: true, squash });
    });
    push(-340, (c2) => {
      const squash = 1 + Math.sin(this.t * 1.9) * 0.018;
      c2.fillStyle = CPAL.shadow;
      c2.beginPath(); c2.ellipse(40, -338, 15, 5, 0, 0, TAU); c2.fill();
      campSpr(c2, 'npc_quartermaster', 35, -340, 44, { squash }, (c3, x, yB, w, o) => {
        campBlit(c3, campQmSprite(), x, yB, w, o);
      });
    });
    if (this.critter) push(this.critter.y, (c2) => this.renderCritter(c2));
    for (const it of this.idlers) push(it.y, (c2) => this.renderIdler(c2, it));
    push(this.p.y, (c2) => this.renderPlayer(c2));

    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn(ctx);

    // near fringe over the cast: the treeline overhangs its people
    ctx.drawImage(this.nearL.c, this.nearL.x, this.nearL.y, this.nearL.w, this.nearL.h);

    // chimney smoke over the fringe
    for (const s of this.smoke) {
      const k = s.t / s.life;
      ctx.fillStyle = 'rgba(216,207,192,' + (0.26 * (1 - k)) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y - k * 46, s.size * (1 + k * 1.8), 0, TAU); ctx.fill();
    }

    // takeover dust
    for (const pu of this.puffs) {
      const k = pu.t / pu.life;
      ctx.fillStyle = 'rgba(196,176,138,' + (0.42 * (1 - k)) + ')';
      ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.size * (1 + k * 1.7), 0, TAU); ctx.fill();
    }

    // glowing things: strung lights, sparks, fireflies
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.renderLanternString(ctx);
    for (const pa of this.parts) {
      const k = pa.t / pa.life;
      ctx.fillStyle = 'rgba(255,' + Math.round(190 - k * 130) + ',70,' + (0.8 * (1 - k)) + ')';
      ctx.beginPath(); ctx.arc(pa.x, pa.y - k * 30, pa.size * (1 - k * 0.5), 0, TAU); ctx.fill();
    }
    for (const f of this.fireflies) {
      if (f.zone === 'lake' && tier < 2) continue;
      if (f.zone === 'cabin' && tier < 1) continue;
      const pos = this.fireflyPos(f);
      const k = 0.5 + 0.5 * Math.sin(this.t * 2 + f.ph);
      const fg = ctx.createRadialGradient(pos.x, pos.y, 0.3, pos.x, pos.y, 6);
      fg.addColorStop(0, 'rgba(210,240,130,' + (0.22 + 0.3 * k) + ')');
      fg.addColorStop(1, 'rgba(150,210,80,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(225,245,170,' + (0.35 + 0.45 * k) + ')';
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 1.6, 0, TAU); ctx.fill();
    }
    this.renderBlink(ctx);
    // the cabin window glows
    if (tier >= 1) {
      const wg = ctx.createRadialGradient(458, -340, 2, 458, -340, 40);
      wg.addColorStop(0, 'rgba(255,202,110,0.16)');
      wg.addColorStop(1, 'rgba(255,202,110,0)');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(458, -340, 40, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // golden hour wash: warm center breathing, cool dark rim at the pines
    const breathe = Math.sin(this.t * 0.45);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createRadialGradient(-60, -60, 40, 0, 0, 860);
    gr.addColorStop(0, 'rgba(255,196,120,' + (0.07 + 0.012 * breathe).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(CAMP_G.x0 - CAMP_G.pad, CAMP_G.y0 - CAMP_G.pad, (CAMP_G.x1 - CAMP_G.x0) + CAMP_G.pad * 2, (CAMP_G.y1 - CAMP_G.y0) + CAMP_G.pad * 2);
    ctx.restore();
    gr = ctx.createRadialGradient(0, 0, 480, 0, 0, 980);
    gr.addColorStop(0, 'rgba(6,10,5,0)');
    gr.addColorStop(1, 'rgba(6,10,5,' + (0.16 + 0.02 * breathe).toFixed(3) + ')');
    ctx.fillStyle = gr;
    ctx.fillRect(CAMP_G.x0 - CAMP_G.pad, CAMP_G.y0 - CAMP_G.pad, (CAMP_G.x1 - CAMP_G.x0) + CAMP_G.pad * 2, (CAMP_G.y1 - CAMP_G.y0) + CAMP_G.pad * 2);

    if (!o || !o.bare) {
      this.renderPrompt(ctx);
      this.renderMsg(ctx, this.cam.x, this.cam.y + 216);
    }

    ctx.restore();

    if (o && o.bare) return;
    // letterhead
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,224,204,0.6)';
    ctx.fillText('CAMP HEARTHWOOD', W / 2, 34);
    ctx.font = '11px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(244,197,66,0.8)';
    ctx.fillText(META.badges + ' badges banked', W / 2, 52);
  }

  renderPrompt(ctx) {
    if (!this.near) return;
    const s = this.near;
    const label = '[E]  ' + s.label;
    ctx.font = 'bold 12px Verdana, sans-serif';
    const tw = ctx.measureText(label).width;
    const bx = s.x, by = s.y - 62;
    ctx.fillStyle = 'rgba(10,12,16,0.88)';
    ctx.strokeStyle = '#f4c542';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx - tw / 2 - 10, by - 12, tw + 20, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4c542';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx, by + 3);
  }

  renderMsg(ctx, cx, cy) {
    if (!this.msg) return;
    ctx.font = 'italic 13px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, this.msg.t);
    ctx.fillStyle = 'rgba(10,12,16,0.85)';
    const tw = ctx.measureText(this.msg.text).width;
    ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 12, cy, tw + 24, 26, 7); ctx.fill();
    ctx.fillStyle = '#d9d2c0';
    ctx.fillText(this.msg.text, cx, cy + 17);
    ctx.globalAlpha = 1;
  }

  renderLanternString(ctx) {
    // wire between the poles, then the bulbs; caller set lighter compositing
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#3a2e20'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-100, -224); ctx.quadraticCurveTo(0, -204, 100, -219); ctx.stroke();
    if (campHasSpr('lanternstring')) {
      SPR.draw(ctx, 'lanternstring', 0, -214, 200);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      const bx = -100 + t * 200;
      const by = -224 + (1 - Math.abs(t - 0.5) * 2) * 16 + 4;
      const a = 0.5 + 0.24 * Math.sin(this.t * 3 + i * 1.7);
      const bg = ctx.createRadialGradient(bx, by, 0.5, bx, by, 9);
      bg.addColorStop(0, 'rgba(255,214,140,' + a + ')');
      bg.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,236,190,' + (0.6 + 0.2 * Math.sin(this.t * 3 + i * 1.7)) + ')';
      ctx.beginPath(); ctx.arc(bx, by, 1.6, 0, TAU); ctx.fill();
    }
  }

  renderPlayer(ctx) {
    const p = this.p;
    const pop = this.popT > 0 ? this.popT / 0.25 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + p.r, 13 * (1 - pop * 0.35), 4.6 * (1 - pop * 0.35), 0, 0, TAU); ctx.fill();
    SPR.drawScout(ctx, META.selected, p.x, p.y + p.r, 34, {
      flip: p.face < 0,
      phase: this.walkPhase || 0,
      moving: p.moving,
      squash: (p.moving ? 1 : 1 + Math.sin(this.t * 2.4) * 0.015) + pop * 0.3,
    });
    if (this.starT > 0) {
      const k = this.starT / 0.4;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 1.5);
      SPR.star(ctx, p.x, p.y - 42 - (1 - k) * 10, 5 + (1 - k) * 3.5, -Math.PI / 2 + (1 - k) * 1.4);
      ctx.fillStyle = '#f4c542'; ctx.fill();
      ctx.restore();
    }
  }

  // A scout who is not you. Locked ones sleep by their tent; the rest idle,
  // wander to the fire, warm their hands, wander home.
  renderIdler(ctx, it) {
    if (it.locked) {
      const yb = it.y + 32;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(it.x + 3, yb, 15, 5, 0, 0, TAU); ctx.fill();
      SPR.drawBottom(ctx, it.id + '_body', it.x, yb, 32, {
        tint: '#241b30', alpha: 0.9, squash: 0.86, flip: it.face < 0,
      });
      for (let i = 0; i < 3; i++) {
        const k = (this.t * 0.5 + i / 3) % 1;
        const a = 0.5 * Math.sin(k * Math.PI);
        ctx.fillStyle = 'rgba(198,204,220,' + a + ')';
        ctx.beginPath(); ctx.arc(it.x + 12 + k * 8, it.y - 4 - k * 22, 1.3 + k * 1.5, 0, TAU); ctx.fill();
      }
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(it.x + 3, it.y + 12, 13, 5, 0, 0, TAU); ctx.fill();
    if (it.state === 'walking') {
      SPR.drawScout(ctx, it.id, it.x, it.y + 12, 32, {
        flip: it.face < 0, phase: it.walkPhase, moving: true,
      });
    } else if (it.state === 'warming') {
      // hands out to the fire: a faster, deeper breathing squash
      const squash = 1 + Math.sin(this.t * 3.4 + it.sway) * 0.035;
      SPR.drawBottom(ctx, it.id, it.x, it.y + 12, 32, { squash, flip: it.face < 0 });
      const gx = it.x + (it.face > 0 ? 10 : -10);
      ctx.fillStyle = 'rgba(255,196,110,' + (0.14 + 0.05 * Math.sin(this.t * 6 + it.sway)) + ')';
      ctx.beginPath(); ctx.arc(gx, it.y + 2, 8, 0, TAU); ctx.fill();
    } else {
      const squash = 1 + Math.sin(this.t * 2.6 + it.sway) * 0.02;
      SPR.drawBottom(ctx, it.id, it.x, it.y + 12, 32, { squash, flip: it.face < 0 });
    }
  }

  renderCritter(ctx) {
    const c = this.critter;
    const hop = c.hopK >= 0 ? Math.sin(c.hopK * Math.PI) * 9 : 0;
    const squash = c.hopK >= 0 ? 1.06 - Math.sin(c.hopK * Math.PI) * 0.14 : 1 + Math.sin(this.t * 5) * 0.03;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(c.x + 2, c.y + 8, 9 * (1 - hop * 0.03), 3.4, 0, 0, TAU); ctx.fill();
    campSpr(ctx, 'critter_free', c.x, c.y + 8 - hop, 24, { flip: c.face < 0, squash }, (c2, x, yB, w, o) => {
      campBlit(c2, campSquirrelSprite(), x, yB, w, o);
    });
  }

  renderFire(ctx) {
    ctx.save();
    ctx.translate(0, -62);
    [[-0.35, '#6e4526'], [0.35, '#5c3a20']].forEach(l => {
      ctx.save(); ctx.rotate(l[0]);
      ctx.fillStyle = l[1]; ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-20, -4, 40, 8, 4); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'lighter';
    const layers = [
      [16, 30, 'rgba(200,60,10,0.55)', 9],
      [11, 22, 'rgba(255,140,40,0.7)', 13],
      [6, 13, 'rgba(255,220,140,0.9)', 17],
    ];
    for (const [w, h, col, sp] of layers) {
      const fl = 1 + Math.sin(this.t * sp) * 0.14 + Math.sin(this.t * (sp * 1.7) + 1) * 0.08;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.quadraticCurveTo(-w * 0.6, -h * 0.55 * fl, 0, -h * fl);
      ctx.quadraticCurveTo(w * 0.6, -h * 0.55 * fl, w, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------ cabin interior ---
  _bakeInterior() {
    const L = this._mkCanvas(-230, -160, 230, 170);
    const q = L.q;
    // floor planks
    q.fillStyle = '#4a3418';
    q.fillRect(-230, -160, 460, 330);
    for (let y = -60; y < 150; y += 20) {
      q.fillStyle = ((y / 20) | 0) % 2 ? '#5c4326' : '#54391f';
      q.beginPath(); q.roundRect(-190, y, 380, 18, 2); q.fill();
      q.strokeStyle = 'rgba(24,16,8,0.6)'; q.lineWidth = 1.2; q.stroke();
      // plank seams
      q.strokeStyle = 'rgba(24,16,8,0.4)';
      for (let x = -190 + ((y * 7) % 60 + 60) % 60; x < 190; x += 76) {
        q.beginPath(); q.moveTo(x, y); q.lineTo(x, y + 18); q.stroke();
      }
    }
    // back wall of log courses
    for (let i = 0; i < 5; i++) {
      const ly = -160 + i * 20;
      q.fillStyle = i % 2 ? '#6e4526' : '#5f3c20';
      q.beginPath(); q.roundRect(-210, ly, 420, 20, 3); q.fill();
      q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
      q.fillStyle = 'rgba(255,196,110,0.10)';
      q.fillRect(-206, ly + 2, 412, 3);
    }
    // side walls sloping in
    q.fillStyle = '#4f3419';
    q.beginPath(); q.moveTo(-230, -160); q.lineTo(-190, -60); q.lineTo(-190, 170); q.lineTo(-230, 170); q.closePath(); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 2; q.stroke();
    q.beginPath(); q.moveTo(230, -160); q.lineTo(190, -60); q.lineTo(190, 170); q.lineTo(230, 170); q.closePath(); q.fill();
    q.stroke();
    // braided rug in the middle
    for (let i = 4; i >= 0; i--) {
      q.fillStyle = ['#8a2f23', '#c9a86a', '#5c7248', '#c9a86a', '#8a2f23'][i];
      q.beginPath(); q.ellipse(10, 40, 30 + i * 12, 14 + i * 6, 0, 0, TAU); q.fill();
      q.strokeStyle = 'rgba(24,16,8,0.5)'; q.lineWidth = 1; q.stroke();
    }
    // the bunk, blanket and pillow
    q.fillStyle = CPAL.shadow;
    q.beginPath(); q.ellipse(-100, 26, 58, 12, 0, 0, TAU); q.fill();
    q.fillStyle = '#6e4526';
    q.beginPath(); q.roundRect(-152, -46, 96, 66, 5); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 2.2; q.stroke();
    q.fillStyle = '#8a2f23';
    q.beginPath(); q.roundRect(-146, -34, 84, 46, 4); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
    q.strokeStyle = 'rgba(24,16,8,0.4)'; q.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      q.beginPath(); q.moveTo(-146, -34 + i * 11); q.lineTo(-62, -34 + i * 11); q.stroke();
    }
    q.fillStyle = '#e9e4da';
    q.beginPath(); q.roundRect(-148, -42, 30, 18, 4); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.4; q.stroke();
    // footlocker at the foot of the bunk
    q.fillStyle = '#5c4326';
    q.beginPath(); q.roundRect(-70, 16, 40, 24, 3); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 2; q.stroke();
    q.strokeStyle = '#8a6138'; q.lineWidth = 1.4;
    q.beginPath(); q.moveTo(-70, 26); q.lineTo(-30, 26); q.stroke();
    q.fillStyle = '#e3b341'; q.fillRect(-52, 24, 5, 5);
    // the pinboard, waiting for twelve notes
    q.fillStyle = '#8a6138';
    q.beginPath(); q.roundRect(-64, -128, 92, 56, 3); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 2.2; q.stroke();
    q.fillStyle = '#c9a86a';
    q.beginPath(); q.roundRect(-58, -122, 80, 44, 2); q.fill();
    const keys = Object.keys((META && META.journal) || {});
    for (let i = 0; i < 12; i++) {
      const px = -50 + (i % 4) * 21, py = -114 + Math.floor(i / 4) * 15;
      if (i < keys.length) {
        q.fillStyle = '#e9e4da';
        q.save(); q.translate(px, py); q.rotate((i % 3 - 1) * 0.08);
        q.fillRect(-6, -4, 13, 10);
        q.strokeStyle = 'rgba(24,16,8,0.5)'; q.lineWidth = 0.8; q.strokeRect(-6, -4, 13, 10);
        q.strokeStyle = '#8d947f';
        q.beginPath(); q.moveTo(-4, -1); q.lineTo(5, -1); q.moveTo(-4, 2); q.lineTo(3, 2); q.stroke();
        q.restore();
        q.fillStyle = '#c0392b';
        q.beginPath(); q.arc(px, py - 4, 1.4, 0, TAU); q.fill();
      } else {
        q.fillStyle = '#8a6138';
        q.beginPath(); q.arc(px, py, 1.2, 0, TAU); q.fill();
      }
    }
    // shelf with clutter, tucked under the window
    q.fillStyle = '#6e4526';
    q.beginPath(); q.roundRect(62, -78, 90, 7, 2); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
    q.fillStyle = '#7ec8e8';
    q.beginPath(); q.roundRect(70, -92, 10, 14, 2); q.fill(); q.stroke();
    q.fillStyle = '#e3b341';
    q.beginPath(); q.roundRect(86, -90, 10, 12, 2); q.fill(); q.stroke();
    q.fillStyle = '#c0392b';
    q.beginPath(); q.roundRect(102, -91, 9, 13, 2); q.fill(); q.stroke();
    q.fillStyle = '#98a4b2';
    q.beginPath(); q.ellipse(128, -82, 9, 4, 0, 0, TAU); q.fill(); q.stroke();
    // the window: dusk and fireflies live behind it, drawn per frame
    q.fillStyle = '#181008';
    q.beginPath(); q.roundRect(84, -136, 52, 44, 3); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 2.4; q.stroke();
    // small table with a lamp
    q.fillStyle = CPAL.shadow;
    q.beginPath(); q.ellipse(98, 30, 26, 8, 0, 0, TAU); q.fill();
    q.fillStyle = '#8a6138';
    q.beginPath(); q.roundRect(78, 2, 38, 8, 2); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.8; q.stroke();
    q.fillRect(82, 10, 5, 16); q.strokeRect(82, 10, 5, 16);
    q.fillRect(107, 10, 5, 16); q.strokeRect(107, 10, 5, 16);
    // the door out, mat in front
    q.fillStyle = '#c9a86a';
    q.beginPath(); q.roundRect(-26, 118, 52, 14, 3); q.fill();
    q.strokeStyle = CPAL.out; q.lineWidth = 1.6; q.stroke();
    q.strokeStyle = 'rgba(24,16,8,0.4)'; q.lineWidth = 1;
    q.beginPath(); q.moveTo(-20, 125); q.lineTo(20, 125); q.stroke();
    this._interior = L;
  }

  renderCabin(ctx, W, H) {
    if (!this._interior) this._bakeInterior();
    ctx.fillStyle = '#120b06';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    // the interior is a small room: pull it closer than the grounds
    const CABIN_ZOOM = 1.8;
    ctx.scale(CABIN_ZOOM, CABIN_ZOOM);
    ctx.translate(-this.cam.x, -this.cam.y);

    const L = this._interior;
    ctx.drawImage(L.c, L.x, L.y, L.w, L.h);

    // the window is a hole into the dusk: fireflies drift across it
    ctx.save();
    ctx.beginPath(); ctx.roundRect(86, -134, 48, 40, 2); ctx.clip();
    ctx.fillStyle = '#101a22';
    ctx.fillRect(86, -134, 48, 40);
    ctx.fillStyle = '#0c1410';
    ctx.fillRect(86, -110, 48, 16);
    for (let i = 0; i < 6; i++) {
      const fx = 110 + Math.sin(this.t * 0.5 + i * 2.2) * 20;
      const fy = -116 + Math.cos(this.t * 0.35 + i * 1.4) * 14;
      const a = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(this.t * 2.4 + i));
      ctx.fillStyle = 'rgba(190,230,120,' + a + ')';
      ctx.beginPath(); ctx.arc(fx, fy, 1.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#5c3a20'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, -134); ctx.lineTo(110, -94);
    ctx.moveTo(86, -114); ctx.lineTo(134, -114);
    ctx.stroke();

    // the lamp glows and breathes
    const lampA = 0.5 + Math.sin(this.t * 7) * 0.05 + Math.sin(this.t * 13) * 0.03;
    ctx.fillStyle = '#e3b341';
    ctx.beginPath(); ctx.roundRect(92, -16, 12, 16, 3); ctx.fill();
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#8a6138';
    ctx.fillRect(96, -20, 4, 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(98, -8, 4, 98, -8, 150);
    lg.addColorStop(0, 'rgba(255,202,110,' + (lampA * 0.5) + ')');
    lg.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(98, -8, 150, 0, TAU); ctx.fill();
    ctx.restore();

    // the player, indoors
    this.renderPlayer(ctx);

    // warm vignette
    const vg = ctx.createRadialGradient(0, 0, 120, 0, 0, 320);
    vg.addColorStop(0, 'rgba(10,6,3,0)');
    vg.addColorStop(1, 'rgba(10,6,3,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(-260, -190, 520, 400);

    this.renderPrompt(ctx);
    this.renderMsg(ctx, 0, 150);
    ctx.restore();

    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,224,204,0.6)';
    ctx.fillText('THE OLD CABIN', W / 2, 34);
    ctx.font = '11px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(244,197,66,0.8)';
    ctx.fillText('Camp Hearthwood', W / 2, 52);
  }
}

// Bake-time helper: prefer a real painter when the art unit has landed it,
// fall back to the primitive cluster otherwise.
function campSprBaked(q, name, x, y, w, rng, fallback, s) {
  if (campHasSpr(name)) { SPR.drawBottom(q, name, x, y + (s || 12), w); return; }
  fallback(q, x, y, s || 12, rng);
}
