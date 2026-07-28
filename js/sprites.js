// Merit Badge Massacre: all art is drawn code. Smooth vector shapes baked to
// offscreen canvases at 2x supersampling. No image assets anywhere.
'use strict';

const SPR = (() => {
  const TAU = Math.PI * 2;
  const OUT = '#181008';
  // Angular-era style constants (see ART_STYLE.md amendment 2026-07-27).
  const LW_SIL = 2.4;   // silhouette edge weight
  const LW_INT = 1.0;   // interior detail weight
  const FUR = '#b85a24', FUR_D = '#8f3f18', FUR_L = '#cc6d2c', TAN = '#d7a45f';
  const GREY = '#98a4b2', MARK = '#d4402c';
  const PINK = '#f08a9a', BONE = '#f0ead8';
  const RIM_WARM = 'rgba(255,152,70,0.5)';
  const RIM_COOL = 'rgba(152,196,246,0.45)';
  const RIM_GREEN = 'rgba(198,224,112,0.5)';
  const cache = new Map();

  function mk(w, h, fn) {
    const SS = 3;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
    const g = c.getContext('2d');
    g.scale(SS, SS);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const eyes = [];
    fn(g, eyes);
    return { c, w, h, eyes, wc: null };
  }

  // Five-level baked lighting, shared by blob and apoly: midtone band, core
  // shadow, warm ground bounce on the underside, upper-left highlight, and
  // an opt-in hue-shifted rim arc. Caller must have clipped to the form.
  function shadePass(g, cx, cy, rx, ry, o) {
    g.beginPath(); g.ellipse(cx, cy + ry * 0.42, rx * 1.25, ry * 0.95, 0, 0, TAU);
    g.fillStyle = o.mid || 'rgba(12,5,3,0.11)'; g.fill();
    g.beginPath(); g.ellipse(cx, cy + ry * 0.7, rx * 1.05, ry * 0.6, 0, 0, TAU);
    g.fillStyle = o.shade || 'rgba(12,5,3,0.18)'; g.fill();
    g.beginPath(); g.ellipse(cx, cy + ry * 1.04, rx * 0.8, ry * 0.32, 0, 0, TAU);
    g.fillStyle = o.bounce || 'rgba(255,166,92,0.1)'; g.fill();
    g.beginPath(); g.ellipse(cx - rx * 0.28, cy - ry * 0.44, rx * 0.62, ry * 0.5, 0, 0, TAU);
    g.fillStyle = o.hi || 'rgba(255,244,214,0.17)'; g.fill();
    if (o.rim) {
      g.strokeStyle = o.rim; g.lineWidth = o.rimW || 2; g.lineCap = 'round';
      g.beginPath();
      g.ellipse(cx, cy, Math.max(1, rx - 1.1), Math.max(1, ry - 1.1), 0, Math.PI * 1.02, Math.PI * 1.82);
      g.stroke();
    }
  }

  // Rounded organic shape with baked-in shading and outline. Carrying forms
  // mostly use apoly now; blob stays for soft masses and interior details.
  function blob(g, x, y, rx, ry, fill, o) {
    o = o || {};
    g.save();
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.fillStyle = fill; g.fill();
    if (!o.flat) {
      g.save(); g.clip();
      shadePass(g, 0, 0, rx, ry, o);
      g.restore();
    }
    if (!o.noline) {
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
      g.lineWidth = o.lw || 1.7; g.strokeStyle = o.line || OUT; g.stroke();
    }
    g.restore();
  }

  // Rounded-corner polygon path. pts is [[x, y, r], ...] where r is that
  // corner's rounding radius (default 3): the style dial of the angular era.
  function apath(g, pts) {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, p[2] != null ? p[2] : 3);
    }
    g.closePath();
  }

  // The silhouette workhorse: angular carrying form with baked shading,
  // two-tier outline, and an opt-in rim light along the upper left.
  function apoly(g, pts, fill, o) {
    o = o || {};
    g.save();
    if (o.rot) {
      let cx0 = 0, cy0 = 0;
      for (const p of pts) { cx0 += p[0]; cy0 += p[1]; }
      cx0 /= pts.length; cy0 /= pts.length;
      g.translate(cx0, cy0); g.rotate(o.rot); g.translate(-cx0, -cy0);
    }
    apath(g, pts);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (fill && !o.flat) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of pts) {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const rx = Math.max(1, (x1 - x0) / 2), ry = Math.max(1, (y1 - y0) / 2);
      g.save(); g.clip();
      shadePass(g, cx, cy, rx, ry, o);
      g.restore();
    }
    if (!o.noline) {
      apath(g, pts);
      g.lineWidth = o.lw || LW_SIL; g.strokeStyle = o.line || OUT; g.stroke();
    }
    g.restore();
  }

  // A shaped fur clump: a petal pointing along ang (0 points up in local
  // space). Laid in rows back to front with alternating value steps, this is
  // how painted fur is built. o.hi adds a micro highlight on the left flank,
  // o.line outlines the clump (for tufts that cross the silhouette).
  function clump(g, x, y, w2, len, ang, fill, o) {
    o = o || {};
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    g.moveTo(-w2 / 2, 0);
    g.quadraticCurveTo(-w2 * 0.55, -len * 0.6, 0, -len);
    g.quadraticCurveTo(w2 * 0.55, -len * 0.6, w2 / 2, 0);
    g.quadraticCurveTo(0, len * 0.2, -w2 / 2, 0);
    g.closePath();
    g.fillStyle = fill; g.fill();
    if (o.line) { g.lineWidth = o.lw || LW_INT; g.strokeStyle = o.line; g.stroke(); }
    if (o.hi) {
      g.strokeStyle = o.hi; g.lineWidth = Math.max(0.5, w2 * 0.16); g.lineCap = 'round';
      g.beginPath(); g.moveTo(-w2 * 0.2, -len * 0.28);
      g.quadraticCurveTo(-w2 * 0.14, -len * 0.6, 0, -len * 0.82);
      g.stroke();
    }
    g.restore();
  }

  // A row of clumps between two points, colors alternating through cols.
  function furRow(g, x0, y0, x1, y1, n, w2, len, ang, cols, o) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      clump(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w2, len, ang, cols[i % cols.length], o);
    }
  }

  // Horizontal lens: two quadratics meeting in naturally sharp tips. arcTo
  // trims acute corners hard, so brims and leaf shapes use this instead.
  function lens(g, x, y, rx, ry, fill, lw) {
    const p2 = () => {
      g.beginPath();
      g.moveTo(x - rx, y);
      g.quadraticCurveTo(x, y - ry * 2, x + rx, y);
      g.quadraticCurveTo(x, y + ry * 2, x - rx, y);
      g.closePath();
    };
    p2(); g.fillStyle = fill; g.fill();
    g.save(); p2(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.18)'; g.fillRect(x - rx, y + ry * 0.15, rx * 2, ry * 2);
    g.fillStyle = 'rgba(255,244,214,0.2)'; g.fillRect(x - rx, y - ry * 1.6, rx, ry * 1.3);
    g.restore();
    p2(); g.lineWidth = lw || 1.6; g.strokeStyle = OUT; g.stroke();
  }

  // Tiny curved claw with a wet specular dot. ang 0 points down.
  function claw(g, x, y, ang, len, fill) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    g.moveTo(-len * 0.3, 0);
    g.quadraticCurveTo(-len * 0.12, len * 0.55, 0, len);
    g.quadraticCurveTo(len * 0.12, len * 0.55, len * 0.3, 0);
    g.closePath();
    g.fillStyle = fill || BONE; g.fill();
    g.lineWidth = 0.7; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(-len * 0.05, len * 0.32, len * 0.12, 0, TAU); g.fill();
    g.restore();
  }

  function poly(g, pts, fill, o) {
    o = o || {};
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (!o.noline) { g.lineWidth = o.lw || 1.6; g.strokeStyle = o.line || OUT; g.stroke(); }
  }

  function star5(g, x, y, r, rot) {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (rot || -Math.PI / 2) + i * TAU * 2 / 5;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  // Glossy possessed eye. Registers its center so the renderer can pulse a
  // glow. Renders 20 percent bigger than the call radius, with a second wet
  // specular at lower right and a lower lid crescent in the head's darker
  // tint (pass lid, defaults to a neutral dark).
  function demonEye(g, eyes, x, y, r, lid) {
    r *= 1.2;
    blob(g, x, y, r * 1.3, r * 1.25, '#170a06', { flat: true, lw: LW_INT });
    const grd = g.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, '#ff9a52');
    grd.addColorStop(0.55, '#ff4a20');
    grd.addColorStop(1, '#8c0f06');
    g.beginPath(); g.ellipse(x, y, r, r * 0.95, 0, 0, TAU);
    g.fillStyle = grd; g.fill();
    g.beginPath(); g.ellipse(x, y, r * 0.24, r * 0.7, 0, 0, TAU);
    g.fillStyle = '#1a0402'; g.fill();
    g.beginPath(); g.arc(x - r * 0.32, y - r * 0.38, r * 0.22, 0, TAU);
    g.fillStyle = 'rgba(255,240,230,0.85)'; g.fill();
    g.beginPath(); g.arc(x + r * 0.36, y + r * 0.4, r * 0.13, 0, TAU);
    g.fillStyle = 'rgba(255,224,208,0.75)'; g.fill();
    g.strokeStyle = lid || 'rgba(28,13,7,0.6)';
    g.lineWidth = Math.max(0.7, r * 0.16); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + r * 0.08, r * 1.12, Math.PI * 0.24, Math.PI * 0.76); g.stroke();
    eyes.push([x, y]);
  }

  // Friendly bead eye. Renders 15 percent bigger, with the wet lower-right
  // specular and a lower lid highlight: about eleven, about to be brave.
  function cuteEye(g, x, y, r) {
    r *= 1.15;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#221a12'; g.fill();
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
    g.beginPath(); g.arc(x + r * 0.34, y + r * 0.38, r * 0.18, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fill();
    g.strokeStyle = 'rgba(255,236,205,0.55)';
    g.lineWidth = Math.max(0.6, r * 0.2); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + r * 0.12, r * 1.14, Math.PI * 0.26, Math.PI * 0.74); g.stroke();
  }

  function pendant(g, x, y, r) {
    g.strokeStyle = '#453017'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - r * 1.6, y - r * 2.2); g.lineTo(x, y); g.lineTo(x + r * 1.6, y - r * 2.2); g.stroke();
    blob(g, x, y, r, r, '#e3b341', { lw: 1, flat: true });
    star5(g, x, y, r * 0.62);
    g.strokeStyle = '#7c1210'; g.lineWidth = 0.8; g.stroke();
  }

  // ---------------- painters ----------------
  const P = {};

  P.squirrel = () => mk(56, 52, (g, eyes) => {
    // tail: sweeping crescent, fur breaks cut into the inner edge
    const tailPts = [
      [6, 46, 3], [3, 33, 6], [6, 18, 5], [13, 6, 4], [21, 3, 3], [26, 8, 3],
      [23, 12.5, 2], [25, 16.5, 2], [20, 19.5, 2], [21.5, 25, 2], [16.5, 30, 2],
      [18, 37, 2], [13, 46, 3],
    ];
    apoly(g, tailPts, FUR, { rim: RIM_WARM, mid: 'rgba(70,28,8,0.16)', shade: 'rgba(70,28,8,0.26)' });
    g.save(); apath(g, tailPts); g.clip();
    furRow(g, 9, 41, 6.5, 24, 4, 4.4, 8, -2.1, ['#8f3f18', '#9c4a1c'], null);
    furRow(g, 11, 28, 13, 12, 4, 4.2, 8, -1.7, ['#cc6d2c', '#c06026'], { hi: 'rgba(255,214,160,0.45)' });
    furRow(g, 16, 9, 22, 7, 3, 3.8, 7, -0.7, ['#dd7f36', '#cc6d2c'], { hi: 'rgba(255,224,178,0.5)' });
    g.restore();
    apath(g, tailPts); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
    // body: chest rising to the right, haunch overlapping behind
    apoly(g, [[20, 28, 5], [31, 25, 6], [42, 29, 5], [46, 36, 4], [44, 44, 3], [36, 48, 3], [24, 48, 4], [17, 42, 4], [16, 33, 4]], FUR, { rim: RIM_WARM });
    apoly(g, [[21, 32, 5], [29, 30, 5], [33.5, 38, 5], [29.5, 46, 4], [21, 46, 4], [16.5, 39, 5]], '#ad5120', { lw: LW_INT, line: 'rgba(24,10,4,0.55)' });
    clump(g, 24, 31.5, 4, 4.5, -0.5, '#c06026', { hi: 'rgba(255,214,160,0.4)' });
    clump(g, 28.5, 30.5, 4, 4.5, -0.2, '#cc6d2c', null);
    // belly with a contact shadow tucked under the chest
    blob(g, 35, 36.5, 7, 2.4, 'rgba(60,24,8,0.22)', { flat: true, noline: true });
    blob(g, 34.5, 41, 6.5, 5, '#e8cfa5', { flat: true, noline: true });
    blob(g, 32.5, 39, 3.4, 2.2, 'rgba(255,250,232,0.5)', { flat: true, noline: true });
    // ears: pointed, translucent pink inside (the accent)
    apoly(g, [[27.5, 2.5, 1.5], [33, 11, 2], [24.5, 11.5, 2]], FUR);
    apoly(g, [[45, 2.5, 1.5], [40, 11, 2], [48.5, 11.5, 2]], FUR);
    apoly(g, [[28, 4.8, 0.8], [31.4, 10, 1], [26.4, 10.2, 1]], PINK, { flat: true, noline: true });
    apoly(g, [[44.6, 4.8, 0.8], [41.6, 10, 1], [46.6, 10.2, 1]], PINK, { flat: true, noline: true });
    blob(g, 28.8, 6.8, 1, 1.6, 'rgba(255,186,176,0.75)', { flat: true, noline: true, rot: 0.2 });
    blob(g, 44.2, 6.8, 1, 1.6, 'rgba(255,186,176,0.75)', { flat: true, noline: true, rot: -0.2 });
    // head: big and forward, cheek tufts breaking the left edge
    clump(g, 25, 21, 4.4, 5, -1.9, FUR_L, { line: OUT, lw: 1.4 });
    clump(g, 25.5, 24.5, 4, 4.4, -2.2, '#c06026', { line: OUT, lw: 1.4 });
    apoly(g, [[26, 9, 6], [38, 7.5, 5], [46, 12, 4], [48.5, 19, 3.5], [44, 26, 3], [34, 29, 4], [26.5, 26.5, 4], [23.5, 17, 5]], FUR_L, { rim: RIM_WARM });
    blob(g, 36, 12.5, 8, 3.6, 'rgba(255,236,200,0.2)', { flat: true, noline: true });
    blob(g, 31, 24, 5.5, 3.4, 'rgba(90,40,14,0.14)', { flat: true, noline: true });
    // muzzle: cream patch, wet nose, buck teeth
    blob(g, 42, 23.5, 5, 3.6, '#e8cfa5', { flat: true, noline: true });
    g.strokeStyle = '#8a5a3c'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(43, 24.8); g.quadraticCurveTo(44.6, 26, 46, 24.9); g.stroke();
    apoly(g, [[44.6, 20.6, 0.9], [47.6, 21.8, 0.9], [45.2, 23.4, 0.9]], '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(45.4, 21.5, 0.55, 0, TAU); g.fill();
    g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 0.6;
    g.fillRect(43.4, 25.6, 1.9, 2.3); g.strokeRect(43.4, 25.6, 1.9, 2.3);
    demonEye(g, eyes, 32, 16.5, 3, '#7c3a13');
    demonEye(g, eyes, 41.5, 16.5, 3, '#7c3a13');
    // paws: little hands over the chest, claws with speculars
    apoly(g, [[24, 42.5, 2], [30.5, 42.5, 2], [31.5, 47.5, 1.5], [23, 47.5, 1.5]], '#9c4a1c', { lw: 1.4 });
    apoly(g, [[34.5, 42, 2], [41, 42, 2], [42, 47, 1.5], [33.5, 47, 1.5]], '#9c4a1c', { lw: 1.4 });
    claw(g, 25.6, 47, 0.15, 2.6, BONE); claw(g, 28.6, 47.3, 0, 2.6, BONE);
    claw(g, 36.2, 46.5, 0.15, 2.6, BONE); claw(g, 39.2, 46.8, 0, 2.6, BONE);
    pendant(g, 33, 33, 2.8);
  });

  P.rabbit = () => mk(48, 56, (g, eyes) => {
    const CRM = '#e9e4da', CRM_L = '#f6f2e9', CRM_D = '#cfc7b8';
    // ears: long blades, translucent pink cores with a hot streak
    apoly(g, [[15, 1.5, 2], [21.5, 7, 3], [20.5, 22.5, 3], [14, 23, 3], [11.5, 8, 3]], CRM, { rim: RIM_COOL });
    apoly(g, [[33, 1.5, 2], [26.5, 7, 3], [27.5, 22.5, 3], [34, 23, 3], [36.5, 8, 3]], CRM, { rim: RIM_COOL });
    apoly(g, [[15.6, 5, 1.5], [19.6, 8.8, 1.5], [18.8, 20, 2], [15.2, 20.2, 2], [13.8, 9, 1.5]], '#e8a0a0', { flat: true, noline: true });
    apoly(g, [[32.4, 5, 1.5], [28.4, 8.8, 1.5], [29.2, 20, 2], [32.8, 20.2, 2], [34.2, 9, 1.5]], '#e8a0a0', { flat: true, noline: true });
    blob(g, 16.6, 11, 1.1, 5, 'rgba(255,190,184,0.8)', { flat: true, noline: true, rot: -0.06 });
    blob(g, 31.4, 11, 1.1, 5, 'rgba(255,190,184,0.8)', { flat: true, noline: true, rot: 0.06 });
    // body: chest over haunches, both flanks called out as forms
    apoly(g, [[15, 37, 4], [33, 37, 4], [37.4, 45, 4], [36, 52.5, 3], [12, 52.5, 3], [10.6, 45, 4]], CRM, { rim: RIM_COOL, mid: 'rgba(80,70,58,0.1)', shade: 'rgba(80,70,58,0.18)' });
    apoly(g, [[12.5, 41, 3], [18, 39.5, 3], [20, 46, 3], [16.5, 51.5, 3], [12, 51, 3], [10.9, 45.5, 3]], CRM_D, { lw: LW_INT, line: 'rgba(90,80,66,0.55)', flat: true });
    apoly(g, [[35.5, 41, 3], [30, 39.5, 3], [28, 46, 3], [31.5, 51.5, 3], [36, 51, 3], [37.1, 45.5, 3]], CRM_D, { lw: LW_INT, line: 'rgba(90,80,66,0.55)', flat: true });
    // chest fluff row peeking under the chin
    furRow(g, 18, 39.5, 30, 39.5, 4, 4, 4.6, 0, [CRM_L, CRM], { hi: 'rgba(255,255,255,0.5)' });
    // head: big, soft, cheek fluff breaking the sides
    clump(g, 13.6, 31, 3.8, 4.2, -1.9, CRM_L, { line: OUT, lw: 1.4 });
    clump(g, 34.4, 31, 3.8, 4.2, 1.9, CRM_L, { line: OUT, lw: 1.4 });
    apoly(g, [[14, 21.5, 6], [34, 21.5, 6], [36.5, 30, 5], [31, 38.5, 5], [17, 38.5, 5], [11.5, 30, 5]], '#f2ede3', { rim: RIM_COOL, mid: 'rgba(80,70,58,0.09)', shade: 'rgba(80,70,58,0.16)' });
    blob(g, 24, 25, 8, 3.2, 'rgba(255,255,255,0.35)', { flat: true, noline: true });
    demonEye(g, eyes, 19, 28, 3.1, '#b0a494');
    demonEye(g, eyes, 29.5, 28, 3.1, '#b0a494');
    // nose, whiskers, the little fangs with glints
    apoly(g, [[22.6, 33, 0.8], [25.4, 33, 0.8], [24, 35.2, 0.8]], '#e8a0a0', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(23.4, 33.6, 0.45, 0, TAU); g.fill();
    g.strokeStyle = '#9a938a'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(20, 34); g.lineTo(13, 33); g.moveTo(20, 35.5); g.lineTo(13.5, 36.5);
    g.moveTo(28, 34); g.lineTo(35, 33); g.moveTo(28, 35.5); g.lineTo(34.5, 36.5); g.stroke();
    poly(g, [[21.5, 37], [23.5, 37], [22.5, 40.5]], '#fffdf6', { lw: 0.7 });
    poly(g, [[24.5, 37], [26.5, 37], [25.5, 40.5]], '#fffdf6', { lw: 0.7 });
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(22.1, 38, 0.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(25.1, 38, 0.4, 0, TAU); g.fill();
    // big split feet, toe ticks
    apoly(g, [[11.5, 50, 2], [21, 50, 2], [22, 55, 2], [10.5, 55, 2]], CRM);
    apoly(g, [[27, 50, 2], [36.5, 50, 2], [37.5, 55, 2], [26, 55, 2]], CRM);
    g.strokeStyle = 'rgba(120,110,100,0.6)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    [14.5, 18, 30.5, 34].forEach(tx => { g.beginPath(); g.moveTo(tx, 52); g.lineTo(tx, 54.4); g.stroke(); });
    pendant(g, 24, 44, 2.8);
  });

  P.doe = () => mk(60, 62, (g, eyes) => {
    // ears: leaf shapes rooted at the head corners, translucent pink inside
    apoly(g, [[8, 7, 2], [18.5, 9, 2.5], [21.5, 17.5, 3], [11, 15.5, 3]], TAN, { rim: RIM_WARM });
    apoly(g, [[52, 7, 2], [41.5, 9, 2.5], [38.5, 17.5, 3], [49, 15.5, 3]], TAN, { rim: RIM_WARM });
    apoly(g, [[10.4, 9, 1.2], [16.6, 10.6, 1.5], [18.8, 15.2, 2], [12.6, 13.8, 2]], '#e8b0a0', { flat: true, noline: true });
    apoly(g, [[49.6, 9, 1.2], [43.4, 10.6, 1.5], [41.2, 15.2, 2], [47.4, 13.8, 2]], '#e8b0a0', { flat: true, noline: true });
    blob(g, 13.6, 11.8, 2, 1.2, 'rgba(255,196,184,0.75)', { flat: true, noline: true, rot: 0.5 });
    blob(g, 46.4, 11.8, 2, 1.2, 'rgba(255,196,184,0.75)', { flat: true, noline: true, rot: -0.5 });
    // segmented legs: knee break, dark hoof with a specular chip
    g.lineCap = 'round'; g.lineJoin = 'round';
    [[21, 46, 20, 59], [39, 46, 40, 59], [26, 48, 25, 60], [34, 48, 35, 60]].forEach(l => {
      const kx = (l[0] + l[2]) / 2 + 1.3, ky = (l[1] + l[3]) / 2;
      g.strokeStyle = '#b98a52'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(kx, ky); g.lineTo(l[2], l[3] - 1.6); g.stroke();
      g.strokeStyle = 'rgba(120,80,40,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(kx - 1.2, ky); g.lineTo(kx + 1.2, ky); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 4.4;
      g.beginPath(); g.moveTo(l[2], l[3] - 2.4); g.lineTo(l[2], l[3]); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.arc(l[2] - 1, l[3] - 2, 0.6, 0, TAU); g.fill();
    });
    // neck joins head to chest, tucked behind the chest form
    apoly(g, [[25, 22, 4], [35, 22, 4], [37, 33, 4], [23, 33, 4]], '#d0a061', { flat: true, noline: true });
    // chest and torso: shoulder planes, spot constellation, chest fluff
    apoly(g, [[17, 30, 6], [30, 26, 7], [43, 30, 6], [45.5, 41, 5], [38, 50, 4], [22, 50, 4], [14.5, 41, 5]], TAN, { rim: RIM_WARM });
    blob(g, 30, 31, 8, 2.2, 'rgba(70,38,12,0.18)', { flat: true, noline: true });
    furRow(g, 22, 35, 38, 35, 5, 3.6, 4.2, 0, ['#e2b271', TAN], { hi: 'rgba(255,232,190,0.4)' });
    [[23, 39], [37, 39], [26, 45], [34, 45], [30, 42], [20.5, 44]].forEach(s => {
      blob(g, s[0], s[1], 1.6, 1.6, '#efe0c2', { flat: true, noline: true });
      blob(g, s[0] - 0.4, s[1] - 0.4, 0.7, 0.7, 'rgba(255,255,255,0.5)', { flat: true, noline: true });
    });
    // head: gentle taper to the muzzle
    apoly(g, [[19.5, 8, 6], [40.5, 8, 6], [43, 17, 5], [36, 25.5, 4], [24, 25.5, 4], [17, 17, 5]], TAN, { rim: RIM_WARM });
    blob(g, 26, 10.8, 3.4, 2, 'rgba(255,238,204,0.3)', { flat: true, noline: true, rot: -0.2 });
    // muzzle: soft wedge, big wet nose
    apoly(g, [[24.5, 19.5, 3], [35.5, 19.5, 3], [34, 28.5, 3], [26, 28.5, 3]], '#dab98a', { lw: LW_INT });
    apoly(g, [[26.9, 23.4, 1.3], [33.1, 23.4, 1.3], [30, 27.8, 1.3]], '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.beginPath(); g.arc(28.5, 24.4, 0.8, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,80,40,0.5)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(30, 27.8); g.lineTo(30, 28.5); g.stroke();
    demonEye(g, eyes, 24.5, 15, 3.2, '#a3743f');
    demonEye(g, eyes, 35.5, 15, 3.2, '#a3743f');
    pendant(g, 30, 35, 3.2);
  });

  P.bat = () => mk(56, 36, (g, eyes) => {
    const wing = (sx) => {
      g.save(); g.translate(28, 18); g.scale(sx, 1);
      const memb = () => {
        g.beginPath();
        g.moveTo(4, -2);
        g.lineTo(12, -10);
        g.lineTo(25.5, -8.5);      // finger tip 1
        g.quadraticCurveTo(21.5, -4.5, 20.5, -3);
        g.lineTo(26, 3.5);         // finger tip 2
        g.quadraticCurveTo(20, 2, 17.5, 3);
        g.lineTo(19.5, 9);         // finger tip 3
        g.quadraticCurveTo(13.5, 5.5, 11, 5);
        g.lineTo(4, 8);
        g.closePath();
      };
      memb(); g.fillStyle = '#4a3c5c'; g.fill();
      g.save(); memb(); g.clip();
      // translucent membrane glow between the fingers
      g.fillStyle = 'rgba(150,110,190,0.28)';
      g.beginPath(); g.ellipse(16, -3, 8, 6, -0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(20,12,30,0.35)';
      g.beginPath(); g.ellipse(9, 6, 9, 5, 0, 0, TAU); g.fill();
      g.restore();
      memb(); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(24,14,34,0.65)'; g.lineWidth = LW_INT; g.lineCap = 'round';
      g.beginPath(); g.moveTo(6, 0); g.lineTo(24, -7.5); g.stroke();
      g.beginPath(); g.moveTo(6, 1.5); g.lineTo(24, 2.5); g.stroke();
      g.strokeStyle = 'rgba(200,170,230,0.4)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(7, -0.8); g.lineTo(22, -7); g.stroke();
      g.restore();
    };
    wing(1); wing(-1);
    // ears: tall, translucent pink inside (the accent)
    apoly(g, [[21.5, 5.5, 1], [27, 12.5, 1.5], [19, 13.5, 1.5]], '#5a4a6e');
    apoly(g, [[34.5, 5.5, 1], [29, 12.5, 1.5], [37, 13.5, 1.5]], '#5a4a6e');
    apoly(g, [[22.3, 7.8, 0.7], [25.6, 12, 0.8], [21.2, 12.6, 0.8]], PINK, { flat: true, noline: true });
    apoly(g, [[33.7, 7.8, 0.7], [30.4, 12, 0.8], [34.8, 12.6, 0.8]], PINK, { flat: true, noline: true });
    blob(g, 22.9, 9.6, 0.7, 1.3, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: 0.3 });
    blob(g, 33.1, 9.6, 0.7, 1.3, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: -0.3 });
    // body: fuzzy chest, fur fringe along the belly
    apoly(g, [[21, 11.5, 4], [35, 11.5, 4], [37, 20, 4.5], [32, 27.5, 4], [24, 27.5, 4], [19, 20, 4.5]], '#5a4a6e', { rim: RIM_COOL, mid: 'rgba(24,14,36,0.16)', shade: 'rgba(24,14,36,0.26)' });
    furRow(g, 23.5, 26.5, 32.5, 26.5, 4, 3, 3.4, Math.PI, ['#6e5c84', '#645278'], null);
    blob(g, 28, 21.5, 4.4, 3.6, '#6e5c84', { flat: true, noline: true });
    demonEye(g, eyes, 24.2, 17, 2.6, '#3c3050');
    demonEye(g, eyes, 31.8, 17, 2.6, '#3c3050');
    // nose leaf and fangs with glints
    apoly(g, [[27, 20.4, 0.6], [29, 20.4, 0.6], [28, 22, 0.6]], '#8a7aa4', { flat: true, noline: true });
    poly(g, [[25.5, 23.5], [27.5, 23.5], [26.5, 26.5]], '#fffdf6', { lw: 0.6 });
    poly(g, [[28.5, 23.5], [30.5, 23.5], [29.5, 26.5]], '#fffdf6', { lw: 0.6 });
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(26.1, 24.4, 0.4, 0, TAU); g.fill();
    g.beginPath(); g.arc(29.1, 24.4, 0.4, 0, TAU); g.fill();
    // hook claws
    g.strokeStyle = '#2e2440'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(25, 27.5); g.quadraticCurveTo(24, 28.8, 24.8, 29.5); g.stroke();
    g.beginPath(); g.moveTo(31, 27.5); g.quadraticCurveTo(32, 28.8, 31.2, 29.5); g.stroke();
  });

  P.raccoon = () => mk(54, 48, (g, eyes) => {
    // ringed tail: fur breaks on the outer edge, textured rings
    const tailPts = [[40.5, 38.5, 3], [42.5, 28, 3], [44.5, 21.5, 3], [50.5, 19.5, 2.5], [52.5, 27, 2], [51, 30, 2], [52.8, 34.5, 2], [48, 42, 2]];
    apoly(g, tailPts, GREY, { rim: RIM_COOL, mid: 'rgba(30,34,40,0.14)', shade: 'rgba(30,34,40,0.24)' });
    g.save(); apath(g, tailPts); g.clip();
    g.fillStyle = '#3c3f45';
    g.beginPath(); g.rect(40, 23.5, 14, 4.6); g.fill();
    g.beginPath(); g.rect(40, 31.5, 14, 4.6); g.fill();
    g.beginPath(); g.moveTo(42, 39); g.lineTo(54, 36.5); g.lineTo(49, 43.5); g.closePath(); g.fill();
    furRow(g, 43, 27, 52, 25.5, 3, 2.6, 3, -0.35, ['#4a4e55', '#3c3f45'], null);
    furRow(g, 42.5, 35, 52, 33, 3, 2.6, 3, -0.35, ['#4a4e55', '#3c3f45'], null);
    g.fillStyle = 'rgba(220,228,238,0.22)';
    g.beginPath(); g.ellipse(45.5, 24, 3.4, 5.4, 0.25, 0, TAU); g.fill();
    g.restore();
    apath(g, tailPts); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
    // body: chest wedge, haunch mass, belly fluff
    apoly(g, [[13, 28, 5], [26, 24.5, 6], [39, 28, 5], [41.5, 37, 4], [35, 45.5, 4], [17, 45.5, 4], [10.5, 37, 4]], GREY, { rim: RIM_COOL, mid: 'rgba(30,34,40,0.13)', shade: 'rgba(30,34,40,0.22)' });
    apoly(g, [[31, 30, 4], [38.5, 29.5, 4], [41, 37, 4], [36, 44.5, 3], [30, 43, 4]], '#8a9097', { lw: LW_INT, line: 'rgba(40,44,50,0.5)' });
    blob(g, 24, 39, 7.5, 5.4, '#c9cdd2', { flat: true, noline: true });
    furRow(g, 18.5, 34.5, 30, 34.5, 4, 3.6, 4, 0, ['#d5d9de', '#c9cdd2'], { hi: 'rgba(255,255,255,0.45)' });
    // bandana scrap: the accent, ragged edge and a side knot
    apoly(g, [[18, 25, 1.5], [34, 25, 1.5], [31, 26.6, 1], [29, 30.5, 1], [26.4, 27.8, 1], [23.5, 31.5, 1], [20.5, 27.5, 1]], '#4a76a8', { flat: true, lw: LW_INT });
    blob(g, 24, 26.2, 4, 1.2, 'rgba(255,255,255,0.22)', { flat: true, noline: true });
    apoly(g, [[33, 24.8, 1], [37.5, 23.5, 1], [35.5, 28.2, 1]], '#4a76a8', { flat: true, lw: LW_INT });
    // ears: pointed, dark inner
    apoly(g, [[13, 3, 1.5], [20.5, 4.5, 2], [19, 11, 2.5], [12, 10, 2.5]], GREY);
    apoly(g, [[39, 3, 1.5], [31.5, 4.5, 2], [33, 11, 2.5], [40, 10, 2.5]], GREY);
    apoly(g, [[14.8, 5, 1], [18.6, 6, 1.2], [17.6, 9.6, 1.2]], '#3c3f45', { flat: true, noline: true });
    apoly(g, [[37.2, 5, 1], [33.4, 6, 1.2], [34.4, 9.6, 1.2]], '#3c3f45', { flat: true, noline: true });
    // head: cheek ruffs breaking the sides, brow light over the mask
    clump(g, 12, 18, 4, 4.4, -1.75, '#aab0b8', { line: OUT, lw: 1.4 });
    clump(g, 12.5, 21.5, 3.6, 4, -2.05, '#9aa0a8', { line: OUT, lw: 1.4 });
    clump(g, 40, 18, 4, 4.4, 1.75, '#aab0b8', { line: OUT, lw: 1.4 });
    clump(g, 39.5, 21.5, 3.6, 4, 2.05, '#9aa0a8', { line: OUT, lw: 1.4 });
    apoly(g, [[14, 7.5, 5], [38, 7.5, 5], [40.5, 15, 4], [34, 25, 4], [26, 27, 4], [18, 25, 4], [11.5, 15, 4]], '#aab0b8', { rim: RIM_COOL, mid: 'rgba(30,34,40,0.12)', shade: 'rgba(30,34,40,0.2)' });
    // white brows, then the bandit mask
    blob(g, 19.5, 10.5, 4.6, 2.4, '#e6e0d2', { flat: true, noline: true });
    blob(g, 32.5, 10.5, 4.6, 2.4, '#e6e0d2', { flat: true, noline: true });
    apoly(g, [[14.5, 11.5, 2], [37.5, 11.5, 2], [39.5, 15.5, 2], [33, 18.5, 2], [19, 18.5, 2], [12.5, 15.5, 2]], '#26221f', { flat: true, lw: LW_INT });
    demonEye(g, eyes, 20.5, 14.5, 3, '#6b727c');
    demonEye(g, eyes, 31.5, 14.5, 3, '#6b727c');
    // muzzle: bright patch, wet nose, whisker dots
    blob(g, 26, 21.8, 5, 3.4, '#e6e0d2', { flat: true, noline: true });
    g.beginPath(); g.arc(26, 20.5, 1.5, 0, TAU); g.fillStyle = '#221108'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(25.5, 20, 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(90,90,86,0.6)';
    [[22.5, 22.3], [23.3, 23.4], [29.5, 22.3], [28.7, 23.4]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.35, 0, TAU); g.fill();
    });
    // clever hands: finger lines and claws
    apoly(g, [[14.5, 41, 1.5], [22, 41, 1.5], [23, 45.8, 1.5], [13.5, 45.8, 1.5]], '#6e747c', { lw: 1.4 });
    apoly(g, [[30, 41, 1.5], [37.5, 41, 1.5], [38.5, 45.8, 1.5], [29.5, 45.8, 1.5]], '#6e747c', { lw: 1.4 });
    g.strokeStyle = 'rgba(30,32,36,0.6)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    [16.6, 18.8, 33, 35.2].forEach(fx => { g.beginPath(); g.moveTo(fx, 42.6); g.lineTo(fx, 45); g.stroke(); });
    claw(g, 17, 45.8, 0.1, 2.2, '#d8cfc0'); claw(g, 20, 45.8, 0, 2.2, '#d8cfc0');
    claw(g, 33.5, 45.8, 0.1, 2.2, '#d8cfc0'); claw(g, 36.5, 45.8, 0, 2.2, '#d8cfc0');
    pendant(g, 26, 30, 2.8);
  });

  P.owl = () => mk(48, 54, (g, eyes) => {
    // ear tufts with an inner shade plane
    apoly(g, [[8, 12.5, 1.2], [14.5, 3, 1.2], [19, 13, 2.5]], '#966036');
    apoly(g, [[40, 12.5, 1.2], [33.5, 3, 1.2], [29, 13, 2.5]], '#966036');
    apoly(g, [[11, 11.5, 0.8], [14.6, 5.5, 0.8], [16.6, 12, 1.2]], 'rgba(60,36,16,0.35)', { flat: true, noline: true });
    apoly(g, [[37, 11.5, 0.8], [33.4, 5.5, 0.8], [31.4, 12, 1.2]], 'rgba(60,36,16,0.35)', { flat: true, noline: true });
    // body: tapered, tail point at the bottom
    apoly(g, [[10, 16.5, 6], [38, 16.5, 6], [40.5, 31, 7], [34, 46.5, 5], [24, 50, 4], [14, 46.5, 5], [7.5, 31, 7]], '#966036', { rim: RIM_WARM, mid: 'rgba(50,28,10,0.13)', shade: 'rgba(50,28,10,0.22)' });
    // folded wings: overlapping feather scallops, two value steps
    for (const s of [-1, 1]) {
      const wx = 24 + s * 11.5;
      apoly(g, [[wx - s * 3.5, 21, 3], [wx + s * 3.2, 23, 3], [wx + s * 2.6, 35, 2], [wx - s * 0.4, 31.5, 1.5], [wx + s * 1.4, 42, 2], [wx - s * 3.2, 38, 2]], '#7a4c28', { flat: true, lw: LW_INT, line: 'rgba(40,22,8,0.55)' });
      furRow(g, wx - s * 1.5, 26, wx + s * 1, 36, 3, 3.2, 4.2, Math.PI + s * 0.25, ['#8a5a34', '#7a4c28'], { hi: 'rgba(230,190,130,0.35)' });
    }
    // belly: soft plate with chevron feather rows
    apoly(g, [[16, 30.5, 5], [32, 30.5, 5], [33.5, 43, 5], [24, 47, 4], [14.5, 43, 5]], '#d0a468', { flat: true, noline: true });
    blob(g, 24, 33.5, 6.5, 2.4, 'rgba(255,236,196,0.4)', { flat: true, noline: true });
    g.lineWidth = 1.1; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = i % 2 ? 'rgba(110,69,38,0.85)' : 'rgba(90,54,26,0.85)';
      g.beginPath(); g.moveTo(19, 34.5 + i * 3.2); g.lineTo(24, 37.3 + i * 3.2); g.lineTo(29, 34.5 + i * 3.2); g.stroke();
      g.strokeStyle = 'rgba(240,214,160,0.35)';
      g.beginPath(); g.moveTo(19.6, 35.2 + i * 3.2); g.lineTo(24, 37.9 + i * 3.2); g.lineTo(28.4, 35.2 + i * 3.2); g.stroke();
    }
    // facial discs: rimmed with radiating feather strokes
    blob(g, 17, 19, 7.6, 7.6, '#e8d9b0', { lw: 1.2, mid: 'rgba(120,90,50,0.08)', shade: 'rgba(120,90,50,0.14)' });
    blob(g, 31, 19, 7.6, 7.6, '#e8d9b0', { lw: 1.2, mid: 'rgba(120,90,50,0.08)', shade: 'rgba(120,90,50,0.14)' });
    g.strokeStyle = 'rgba(150,110,60,0.5)'; g.lineWidth = 0.8;
    for (const cxd of [17, 31]) {
      for (let a = 0; a < 10; a++) {
        const th = -Math.PI / 2 + (a - 4.5) * 0.32;
        g.beginPath();
        g.moveTo(cxd + Math.cos(th) * 5.4, 19 + Math.sin(th) * 5.4);
        g.lineTo(cxd + Math.cos(th) * 7, 19 + Math.sin(th) * 7);
        g.stroke();
      }
    }
    demonEye(g, eyes, 17, 19, 3.6, '#b39a6d');
    demonEye(g, eyes, 31, 19, 3.6, '#b39a6d');
    // beak: gold accent with a ridge highlight
    apoly(g, [[21, 24.5, 1], [27, 24.5, 1], [24, 30.5, 1]], '#e0a83c', { lw: LW_INT });
    g.strokeStyle = 'rgba(255,236,170,0.8)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(23.2, 25.5); g.lineTo(24, 28.6); g.stroke();
    // talons: gold, with tiny speculars
    g.strokeStyle = '#e0a83c'; g.lineWidth = 1.8; g.lineCap = 'round';
    [[18, 49], [30, 49]].forEach(t => {
      g.beginPath();
      g.moveTo(t[0] - 3.4, t[1] + 4.4); g.lineTo(t[0], t[1]);
      g.lineTo(t[0] + 3.4, t[1] + 4.4); g.moveTo(t[0], t[1]); g.lineTo(t[0], t[1] + 4.8);
      g.stroke();
      g.fillStyle = 'rgba(255,244,200,0.85)';
      g.beginPath(); g.arc(t[0] - 0.6, t[1] + 1.4, 0.55, 0, TAU); g.fill();
    });
  });

  P.boar = () => mk(66, 44, (g, eyes) => {
    // bristle mane: double row of spikes, alternating values
    g.beginPath();
    g.moveTo(10, 17);
    for (let i = 0; i < 7; i++) { g.lineTo(13 + i * 6, 6 + (i % 2) * 3); g.lineTo(16 + i * 6, 15); }
    g.lineTo(56, 18); g.lineTo(10, 20); g.closePath();
    g.fillStyle = '#42301f'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    for (let i = 0; i < 6; i++) {
      clump(g, 17 + i * 6, 16, 3.4, 6.5, 0.12, i % 2 ? '#573c22' : '#4a3320', null);
    }
    // body: heavy shoulder, sloped rear, bristle texture on the back
    apoly(g, [[8, 20, 6], [24, 13.5, 6], [48, 13.5, 6], [58, 22, 5], [59, 32, 4], [50, 40, 4], [16, 40, 4], [7, 30, 5]], '#6b4c2e', { rim: RIM_WARM, mid: 'rgba(38,24,10,0.14)', shade: 'rgba(38,24,10,0.24)' });
    g.strokeStyle = 'rgba(30,16,6,0.4)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(46, 15); g.quadraticCurveTo(51, 24, 48, 38); g.stroke();
    furRow(g, 14, 22, 52, 21, 6, 3.6, 4.6, -0.12, ['#5d3f24', '#654728'], null);
    blob(g, 33, 37, 16, 3, 'rgba(255,166,92,0.12)', { flat: true, noline: true });
    // ears standing proud of the mane, dark inner planes
    apoly(g, [[11.5, 13, 1.2], [17.5, 2.5, 1.2], [23.5, 13, 2.5]], '#6b4c2e');
    apoly(g, [[54.5, 13, 1.2], [48.5, 2.5, 1.2], [42.5, 13, 2.5]], '#6b4c2e');
    apoly(g, [[14.5, 11.5, 0.8], [17.8, 5.5, 0.8], [21, 12, 1.2]], 'rgba(30,16,6,0.4)', { flat: true, noline: true });
    apoly(g, [[51.5, 11.5, 0.8], [48.2, 5.5, 0.8], [45, 12, 1.2]], 'rgba(30,16,6,0.4)', { flat: true, noline: true });
    // snout: blocky, wet shine on top, deep nostrils
    apoly(g, [[25, 27.5, 3], [41, 27.5, 3], [43, 36.5, 3], [23, 36.5, 3]], '#8a6444', { lw: 1.4 });
    blob(g, 33, 29.5, 6.5, 1.6, 'rgba(255,220,180,0.35)', { flat: true, noline: true });
    g.fillStyle = '#33241a';
    g.beginPath(); g.ellipse(30, 32.8, 1.5, 2.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(36, 32.8, 1.5, 2.2, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(29.5, 31.8, 0.55, 0, TAU); g.fill();
    g.beginPath(); g.arc(35.5, 31.8, 0.55, 0, TAU); g.fill();
    // chin bristles
    clump(g, 28, 37.5, 2.6, 3.4, Math.PI + 0.35, '#4a3320', null);
    clump(g, 33, 38.2, 2.6, 3.6, Math.PI, '#573c22', null);
    clump(g, 38, 37.5, 2.6, 3.4, Math.PI - 0.35, '#4a3320', null);
    // bone tusks: the accent, long up-curving hooks with speculars
    apoly(g, [[25, 36, 1.5], [18, 33, 1.2], [16, 25, 0.8], [17.5, 21, 0.8], [21, 29.5, 1.5], [27, 32.5, 1.5]], BONE, { lw: LW_INT });
    apoly(g, [[41, 36, 1.5], [48, 33, 1.2], [50, 25, 0.8], [48.5, 21, 0.8], [45, 29.5, 1.5], [39, 32.5, 1.5]], BONE, { lw: LW_INT });
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(17.4, 25, 0.8, 0, TAU); g.fill();
    g.beginPath(); g.arc(48.6, 25, 0.8, 0, TAU); g.fill();
    demonEye(g, eyes, 25, 20, 3.3, '#4a3018');
    demonEye(g, eyes, 41, 20, 3.3, '#4a3018');
    // cloven hooves with a split line
    [[18, 38], [28, 38.5], [38, 38.5], [48, 38]].forEach(f => {
      apoly(g, [[f[0] - 3.4, f[1], 1.2], [f[0] + 3.4, f[1], 1.2], [f[0] + 2.8, f[1] + 4.6, 1], [f[0] - 2.8, f[1] + 4.6, 1]], '#33241a', { flat: true, lw: 1.2 });
      g.strokeStyle = 'rgba(10,4,2,0.7)'; g.lineWidth = LW_INT; g.lineCap = 'round';
      g.beginPath(); g.moveTo(f[0], f[1] + 2); g.lineTo(f[0], f[1] + 4.2); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.arc(f[0] - 1.6, f[1] + 1.4, 0.6, 0, TAU); g.fill();
    });
  });

  P.fox = () => mk(58, 48, (g, eyes) => {
    // brush tail: fur breaks along the top, white tip with its own notch
    const tailPts = [[37.5, 29, 3], [43, 24.5, 3], [46, 26, 2], [49.5, 23.5, 3], [56.5, 30.5, 3], [55, 40, 3], [47, 42.5, 3], [40, 40, 3]];
    apoly(g, tailPts, '#e06f28', { rim: RIM_WARM, mid: 'rgba(120,44,10,0.15)', shade: 'rgba(120,44,10,0.25)' });
    g.save(); apath(g, tailPts); g.clip();
    furRow(g, 41, 32, 52, 28.5, 4, 3.6, 5, -0.7, ['#c05a20', '#d2692e'], null);
    apoly(g, [[48.5, 33.5, 2], [53, 32, 1.5], [56.8, 33.5, 2], [55.4, 40.5, 2], [47.5, 41, 2]], '#efe6d8', { flat: true, noline: true });
    furRow(g, 49, 35, 55, 34, 3, 3, 3.6, -0.5, ['#fdfaf2', '#efe6d8'], null);
    g.restore();
    apath(g, tailPts); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
    // body: lean, low-slung
    apoly(g, [[13, 30, 5], [25, 26, 6], [36, 30, 4], [38.5, 38, 4], [32, 44.5, 4], [18, 44.5, 4], [11.5, 38, 4]], '#e06f28', { rim: RIM_WARM, mid: 'rgba(120,44,10,0.13)', shade: 'rgba(120,44,10,0.22)' });
    // chest bib: cream fluff row under the chin
    blob(g, 24, 38.5, 6.5, 4.8, '#efe6d8', { flat: true, noline: true });
    furRow(g, 19, 35.5, 29.5, 35.5, 4, 3.4, 4, 0, ['#fdfaf2', '#efe6d8'], { hi: 'rgba(255,255,255,0.4)' });
    // ears: tall blades, dark tips, translucent pink inside (the accent)
    apoly(g, [[12.5, 1.5, 1.2], [20, 13, 2.5], [9.5, 12.5, 2.5]], '#e06f28');
    apoly(g, [[39.5, 1.5, 1.2], [32, 13, 2.5], [42.5, 12.5, 2.5]], '#e06f28');
    apoly(g, [[12.2, 1.8, 1], [14.8, 5.8, 1], [10.6, 5.4, 1]], '#3a2417', { flat: true, noline: true });
    apoly(g, [[39.8, 1.8, 1], [37.2, 5.8, 1], [41.4, 5.4, 1]], '#3a2417', { flat: true, noline: true });
    apoly(g, [[13.8, 6, 0.8], [17.6, 11.6, 1], [11.8, 11.2, 1]], PINK, { flat: true, noline: true });
    apoly(g, [[38.2, 6, 0.8], [34.4, 11.6, 1], [40.2, 11.2, 1]], PINK, { flat: true, noline: true });
    blob(g, 14.4, 9, 0.9, 1.7, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: 0.35 });
    blob(g, 37.6, 9, 0.9, 1.7, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: -0.35 });
    // head: pointed cheek fur built into the silhouette, sly forehead light
    apoly(g, [[15, 9, 5], [37, 9, 5], [40.5, 16, 4], [42, 20.5, 1.2], [34, 24, 3], [28.5, 26.5, 2.5], [23.5, 26.5, 2.5], [18, 24, 3], [10, 20.5, 1.2], [11.5, 16, 4]], '#e8762f', { rim: RIM_WARM, mid: 'rgba(120,44,10,0.13)', shade: 'rgba(120,44,10,0.2)' });
    blob(g, 21, 11.5, 3.6, 2, 'rgba(255,224,180,0.3)', { flat: true, noline: true, rot: -0.15 });
    g.strokeStyle = 'rgba(150,60,16,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(13, 19.5); g.lineTo(16.5, 20.6); g.stroke();
    g.beginPath(); g.moveTo(39, 19.5); g.lineTo(35.5, 20.6); g.stroke();
    // snout: cream wedge, dark nose with a wet shine, smiling mouth line
    apoly(g, [[20.5, 20, 2], [31.5, 20, 2], [26, 27.4, 1.5]], '#efe6d8', { flat: true, lw: LW_INT });
    g.strokeStyle = '#8a5a3c'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(23.8, 23.8); g.quadraticCurveTo(26, 25.4, 28.2, 23.8); g.stroke();
    g.beginPath(); g.arc(26, 25.8, 1.6, 0, TAU); g.fillStyle = '#221108'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(25.4, 25.2, 0.55, 0, TAU); g.fill();
    demonEye(g, eyes, 20.8, 15, 3, '#a04d1e');
    demonEye(g, eyes, 31.2, 15, 3, '#a04d1e');
    // dark stockings with claw ticks
    apoly(g, [[13.5, 40, 1.5], [21, 40, 1.5], [22, 45.4, 1.5], [12.5, 45.4, 1.5]], '#a04d1e', { lw: 1.4 });
    apoly(g, [[29.5, 40, 1.5], [37, 40, 1.5], [38, 45.4, 1.5], [28.5, 45.4, 1.5]], '#a04d1e', { lw: 1.4 });
    claw(g, 15.5, 45.4, 0.1, 2.2, '#d8cfc0'); claw(g, 18.5, 45.6, 0, 2.2, '#d8cfc0');
    claw(g, 31.5, 45.4, 0.1, 2.2, '#d8cfc0'); claw(g, 34.5, 45.6, 0, 2.2, '#d8cfc0');
    pendant(g, 25, 30, 2.8);
  });

  P.beaver = () => mk(56, 50, (g, eyes) => {
    // paddle tail: crosshatch scales and a wet sheen band
    const tail = [[17.5, 38.5, 3], [38.5, 38.5, 3], [41.8, 43.5, 3], [38, 49, 3], [18, 49, 3], [14.2, 43.5, 3]];
    apoly(g, tail, '#4e3520', { mid: 'rgba(16,8,4,0.16)', shade: 'rgba(16,8,4,0.28)' });
    g.save(); apath(g, tail); g.clip();
    g.strokeStyle = 'rgba(20,10,5,0.5)'; g.lineWidth = 0.8;
    for (let i = 14; i <= 42; i += 4) { g.beginPath(); g.moveTo(i, 38); g.lineTo(i + 3, 50); g.stroke(); }
    for (let j = 41; j <= 47; j += 3) { g.beginPath(); g.moveTo(13, j); g.lineTo(43, j); g.stroke(); }
    g.fillStyle = 'rgba(255,230,190,0.12)';
    g.beginPath(); g.ellipse(24, 41, 9, 2, -0.08, 0, TAU); g.fill();
    g.restore();
    apath(g, tail); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
    // body: chunky, chest fur row, warm belly
    apoly(g, [[13, 22, 6], [28, 16.5, 7], [43, 22, 6], [44.4, 34, 5], [37.5, 41.5, 4], [18.5, 41.5, 4], [11.6, 34, 5]], '#86552e', { rim: RIM_WARM, mid: 'rgba(46,26,10,0.14)', shade: 'rgba(46,26,10,0.24)' });
    blob(g, 28, 32.5, 8.5, 6.6, '#b28050', { flat: true, noline: true });
    blob(g, 26, 30, 4.5, 2.6, 'rgba(255,222,178,0.4)', { flat: true, noline: true });
    furRow(g, 20, 25, 36, 25, 5, 3.6, 4.2, 0, ['#9c6636', '#86552e'], { hi: 'rgba(240,200,150,0.35)' });
    // little round ears, dark inner dot
    blob(g, 19, 6.5, 3.4, 3.8, '#86552e');
    blob(g, 37, 6.5, 3.4, 3.8, '#86552e');
    blob(g, 19.6, 7, 1.4, 1.7, 'rgba(40,20,8,0.45)', { flat: true, noline: true });
    blob(g, 36.4, 7, 1.4, 1.7, 'rgba(40,20,8,0.45)', { flat: true, noline: true });
    // head: broad, chubby cheek masses overlapping the sides
    apoly(g, [[18, 5.5, 6], [38, 5.5, 6], [40.5, 13.5, 5], [35, 22.5, 4], [21, 22.5, 4], [15.5, 13.5, 5]], '#966036', { rim: RIM_WARM, mid: 'rgba(50,28,10,0.13)', shade: 'rgba(50,28,10,0.2)' });
    blob(g, 19.5, 17.5, 3.6, 4, '#8a5a34', { lw: LW_INT, line: 'rgba(40,22,8,0.5)' });
    blob(g, 36.5, 17.5, 3.6, 4, '#8a5a34', { lw: LW_INT, line: 'rgba(40,22,8,0.5)' });
    blob(g, 28, 9, 7.5, 2.8, 'rgba(255,232,192,0.22)', { flat: true, noline: true });
    demonEye(g, eyes, 23, 12, 2.9, '#5f3a1c');
    demonEye(g, eyes, 33, 12, 2.9, '#5f3a1c');
    // muzzle: big dark nose with shine, whisker dots, iron orange incisors
    blob(g, 28, 18.5, 4.6, 3.2, '#b28050', { flat: true, noline: true });
    blob(g, 28, 16.8, 2.2, 1.5, '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.beginPath(); g.arc(27.3, 16.4, 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(80,50,26,0.6)';
    [[24.6, 18.6], [25.2, 19.8], [31.4, 18.6], [30.8, 19.8]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.35, 0, TAU); g.fill();
    });
    g.fillStyle = '#e8934a'; g.strokeStyle = OUT; g.lineWidth = 0.8;
    g.fillRect(25.4, 19.5, 2.4, 4.6); g.strokeRect(25.4, 19.5, 2.4, 4.6);
    g.fillRect(28.2, 19.5, 2.4, 4.6); g.strokeRect(28.2, 19.5, 2.4, 4.6);
    g.fillStyle = 'rgba(255,240,210,0.8)';
    g.fillRect(25.7, 19.8, 0.7, 3.6);
    // worker hands tucked on the belly, claw ticks
    apoly(g, [[18.5, 35.5, 1.5], [24.5, 35.5, 1.5], [23.5, 40.4, 1.2], [17.5, 40.4, 1.2]], '#5f3a1c', { flat: true, lw: 1.2 });
    apoly(g, [[31.5, 35.5, 1.5], [37.5, 35.5, 1.5], [38.5, 40.4, 1.2], [32.5, 40.4, 1.2]], '#5f3a1c', { flat: true, lw: 1.2 });
    claw(g, 19.8, 40.2, 0.1, 2, '#d8cfc0'); claw(g, 22.4, 40.4, 0, 2, '#d8cfc0');
    claw(g, 33.6, 40.4, 0, 2, '#d8cfc0'); claw(g, 36.2, 40.2, -0.1, 2, '#d8cfc0');
    pendant(g, 28, 25, 2.8);
  });

  P.stag = () => mk(100, 110, (g, eyes) => {
    // antlers
    const antler = (sx) => {
      g.save(); g.translate(50, 0); g.scale(sx, 1); g.translate(-50, 0);
      g.strokeStyle = '#d8cfc0'; g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(41, 34); g.quadraticCurveTo(28, 20, 23, 5); g.stroke();
      g.beginPath(); g.moveTo(35, 26); g.quadraticCurveTo(25, 23, 15, 17); g.stroke();
      g.beginPath(); g.moveTo(38, 30); g.quadraticCurveTo(31, 12, 36, 3); g.stroke();
      g.beginPath(); g.moveTo(30, 15); g.quadraticCurveTo(24, 10, 22, 3); g.stroke();
      g.restore();
    };
    antler(1); antler(-1);
    blob(g, 36, 30, 5, 7.4, '#2e2a33', { rot: -0.5 });              // ears
    blob(g, 64, 30, 5, 7.4, '#2e2a33', { rot: 0.5 });
    // legs
    g.lineWidth = 5; g.strokeStyle = '#241f28';
    [[38, 88, 36, 107], [62, 88, 64, 107], [44, 92, 43, 108], [56, 92, 57, 108]].forEach(l => {
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke();
    });
    blob(g, 50, 72, 21, 25, '#2e2a33');                              // body
    blob(g, 50, 62, 12, 12, '#3a3542', { flat: true, noline: true });
    blob(g, 50, 36, 13.5, 12.5, '#332e3c');                          // head
    blob(g, 50, 46, 7.4, 6, '#241f28');                              // snout
    g.fillStyle = '#0d0509';
    g.beginPath(); g.ellipse(47.5, 46, 1.4, 2, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(52.5, 46, 1.4, 2, 0, 0, TAU); g.fill();
    demonEye(g, eyes, 43.5, 33, 4);
    demonEye(g, eyes, 56.5, 33, 4);
    // rune pendant
    g.strokeStyle = '#5c4a20'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(40, 50); g.quadraticCurveTo(50, 60, 60, 50); g.stroke();
    blob(g, 50, 61, 6, 6, '#e3b341', { lw: 1.4, flat: true });
    star5(g, 50, 61, 4);
    g.strokeStyle = '#7c1210'; g.lineWidth = 1.2; g.stroke();
  });

  // ---------------- scouts ----------------
  function scoutBase(g, o) {
    const cx = o.cx, wide = o.wide ? 1.2 : 1;
    if (!o.legless) {
      // standing legs: straight segments, knee line, wedge boots with soles
      for (const s of [-1, 1]) {
        const lx = cx + s * 4.5 * wide;
        apoly(g, [[lx - 1.8, 43.5, 1], [lx + 1.8, 43.5, 1], [lx + 1.5, 53, 1], [lx - 1.5, 53, 1]], o.skin, { flat: true, lw: 1.2 });
        g.strokeStyle = 'rgba(120,70,40,0.45)'; g.lineWidth = LW_INT; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lx - 1.1, 48.4); g.lineTo(lx + 1.1, 48.4); g.stroke();
        // sock cuff
        g.strokeStyle = '#e8e0cc'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(lx - 1.4, 51.2); g.lineTo(lx + 1.4, 51.2); g.stroke();
        const pts = s > 0
          ? [[lx - 2.4, 52.5, 1.2], [lx + 2.4, 52.5, 1.2], [lx + 4.8, 55, 1], [lx + 4.8, 56.8, 1], [lx - 2.4, 56.8, 1.2]]
          : [[lx + 2.4, 52.5, 1.2], [lx - 2.4, 52.5, 1.2], [lx - 4.8, 55, 1], [lx - 4.8, 56.8, 1], [lx + 2.4, 56.8, 1.2]];
        apoly(g, pts, '#3a2e20', { flat: true, lw: 1.2 });
        g.strokeStyle = '#241a10'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(lx - 2.2, 55.9); g.lineTo(lx + s * 4.4, 55.9); g.stroke();
      }
    }
    // shorts: belt line and a center split
    apoly(g, [[cx - 8 * wide, 37.5, 2.5], [cx + 8 * wide, 37.5, 2.5], [cx + 8.6 * wide, 45.5, 2], [cx + 1.4, 45.5, 1.2], [cx, 43, 1], [cx - 1.4, 45.5, 1.2], [cx - 8.6 * wide, 45.5, 2]], o.shorts, { lw: 1.8 });
    g.strokeStyle = 'rgba(14,10,6,0.4)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(cx - 7.2 * wide, 39.2); g.lineTo(cx + 7.2 * wide, 39.2); g.stroke();
    g.fillStyle = '#e3b341';
    g.beginPath(); g.arc(cx, 39.2, 1, 0, TAU); g.fill();
    // torso: shoulder line, taper, hem
    apoly(g, [[cx - 8.8 * wide, 25, 3.5], [cx + 8.8 * wide, 25, 3.5], [cx + 7.2 * wide, 39, 2.5], [cx - 7.2 * wide, 39, 2.5]], o.shirt, { lw: 1.8, rim: 'rgba(255,240,200,0.35)' });
    g.strokeStyle = 'rgba(40,26,12,0.35)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(cx - 6.9 * wide, 36.4); g.lineTo(cx + 6.9 * wide, 36.4); g.stroke();
    // pocket flaps with button dots
    g.strokeStyle = 'rgba(40,26,12,0.45)'; g.lineWidth = LW_INT;
    for (const s of [-1, 1]) {
      const px = cx + s * 4.4 * wide;
      g.strokeRect(px - 2, 31, 4, 3.2);
      g.beginPath(); g.moveTo(px - 2, 32.2); g.lineTo(px + 2, 32.2); g.stroke();
      g.fillStyle = 'rgba(24,16,8,0.55)';
      g.beginPath(); g.arc(px, 33, 0.5, 0, TAU); g.fill();
    }
    // badge sash dots
    g.fillStyle = '#f4c542';
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.arc(cx - 4 + i * 4, 29.5 + i * 2.4, 1.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.arc(cx - 4.4 + i * 4, 29.1 + i * 2.4, 0.45, 0, TAU); g.fill();
      g.fillStyle = '#f4c542';
    }
    // collar flaps peeking at the shoulders
    apoly(g, [[cx - 8.2, 24.6, 0.8], [cx - 4.6, 24.6, 0.8], [cx - 7, 27.8, 0.8]], 'rgba(255,244,214,0.5)', { flat: true, noline: true });
    apoly(g, [[cx + 8.2, 24.6, 0.8], [cx + 4.6, 24.6, 0.8], [cx + 7, 27.8, 0.8]], 'rgba(255,244,214,0.5)', { flat: true, noline: true });
    // kerchief: sharp triangle, fold shadow, square knot
    apoly(g, [[cx - 7.8, 23.6, 1.5], [cx + 7.8, 23.6, 1.5], [cx, 33.5, 1]], o.kerchief, { lw: 1.8 });
    g.strokeStyle = 'rgba(20,8,6,0.35)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(cx - 4.4, 26.2); g.lineTo(cx, 30.4); g.lineTo(cx + 4.4, 26.2); g.stroke();
    apoly(g, [[cx - 1.9, 24.8, 1], [cx + 1.9, 24.8, 1], [cx + 1.5, 28.2, 1], [cx - 1.5, 28.2, 1]], o.kerchief, { flat: true, lw: 1.2 });
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(cx - 1.2, 25.6); g.lineTo(cx + 1.2, 25.6); g.stroke();
    // head: structured but soft, forehead light, cheek shade
    apoly(g, [[cx - 9.8, 6.6, 7], [cx + 9.8, 6.6, 7], [cx + 8.5, 22.8, 6], [cx - 8.5, 22.8, 6]], o.skin, { rim: RIM_WARM, hi: 'rgba(255,244,214,0.22)', mid: 'rgba(120,66,30,0.1)', shade: 'rgba(120,66,30,0.16)' });
    blob(g, cx, 9.5, 6.5, 2.4, 'rgba(255,244,214,0.3)', { flat: true, noline: true });
    cuteEye(g, cx - 3.8, 14.5, 1.7);
    cuteEye(g, cx + 3.8, 14.5, 1.7);
    g.strokeStyle = '#5c422e'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 5.4, 11.2); g.lineTo(cx - 2.4, 10.5); g.stroke();
    g.beginPath(); g.moveTo(cx + 5.4, 11.2); g.lineTo(cx + 2.4, 10.5); g.stroke();
    g.strokeStyle = '#8a5a3c'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(cx - 1.6, 19.4); g.quadraticCurveTo(cx, 20.8, cx + 1.6, 19.4); g.stroke();
    blob(g, cx - 6.4, 18, 1.7, 1.1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
    blob(g, cx + 6.4, 18, 1.7, 1.1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
    // little nose
    g.strokeStyle = 'rgba(140,90,60,0.55)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 0.6, 16.6); g.quadraticCurveTo(cx + 0.6, 17.2, cx + 0.4, 16.2); g.stroke();
  }

  const SCOUT_OPTS = {
    max: { cx: 22, skin: '#f0c294', shirt: '#c9a86a', shorts: '#3a4a63', kerchief: '#c0392b' },
    junie: { cx: 22, skin: '#e8b384', shirt: '#5c7248', shorts: '#4a3a2c', kerchief: '#d8722f' },
    gus: { cx: 25, wide: true, skin: '#e8b384', shirt: '#b8a06a', shorts: '#4c5a3a', kerchief: '#8c5c9c' },
  };

  const SCOUT_HATS = {
    max(g) {
      const cx = 22;
      // campaign hat: crisp wedge brim, peaked crown, montana crease
      lens(g, cx, 7.4, 13, 2.7, '#7a5230', 1.6);
      apoly(g, [[cx - 6.2, 5.8, 2], [cx - 2.2, 0.4, 2], [cx + 2.2, 0.4, 2], [cx + 6.2, 5.8, 2]], '#7a5230', { lw: 1.6 });
      g.strokeStyle = '#54371e'; g.lineWidth = 1.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 5.6, 6.5); g.lineTo(cx + 5.6, 6.5); g.stroke();
      g.beginPath(); g.moveTo(cx, 1.2); g.lineTo(cx, 5.4); g.stroke();
      g.strokeStyle = 'rgba(255,224,170,0.35)'; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(cx - 10.5, 7.2); g.quadraticCurveTo(cx - 5, 5.8, cx - 1, 5.6); g.stroke();
      // hair wisps at the temples
      g.strokeStyle = '#6e4a26'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(13, 9); g.quadraticCurveTo(12.4, 10.6, 13.2, 11.8); g.stroke();
      g.beginPath(); g.moveTo(31, 9); g.quadraticCurveTo(31.6, 10.6, 30.8, 11.8); g.stroke();
    },
    junie(g) {
      // jagged hair fringe and side falls
      apoly(g, [[12.4, 6.4, 2], [31.6, 6.4, 2], [30.8, 11.6, 1.2], [28, 10.2, 1.2], [25, 12, 1.2], [22, 10.3, 1.2], [19, 12, 1.2], [16, 10.2, 1.2], [13.2, 11.6, 1.2]], '#d2692e', { flat: true, lw: 1.3 });
      g.strokeStyle = 'rgba(255,190,130,0.4)'; g.lineWidth = 0.9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(16, 7.6); g.quadraticCurveTo(18, 8.8, 17, 10.8); g.stroke();
      g.beginPath(); g.moveTo(23, 7.6); g.quadraticCurveTo(24.6, 8.8, 23.8, 10.8); g.stroke();
      apoly(g, [[12.6, 8, 1], [15.8, 9.5, 1], [14.6, 18.2, 1.2], [12, 16, 1.2]], '#d2692e', { flat: true, noline: true });
      apoly(g, [[31.4, 8, 1], [28.2, 9.5, 1], [29.4, 18.2, 1.2], [32, 16, 1.2]], '#d2692e', { flat: true, noline: true });
      // slanted beret with a stem
      apoly(g, [[10.6, 5.4, 3], [19.5, 0.2, 3.5], [29, 3.6, 3], [25.6, 6.8, 2], [13.4, 7.6, 2]], '#3f6b35', { lw: 1.6, rim: RIM_GREEN });
      g.beginPath(); g.arc(19.5, 0.8, 1.3, 0, TAU); g.fillStyle = '#2c4b25'; g.fill();
      g.fillStyle = 'rgba(150,90,50,0.5)';                           // freckles
      [[18, 17.6], [20, 18.4], [24, 18.4], [26, 17.6]].forEach(f => {
        g.beginPath(); g.arc(f[0], f[1], 0.6, 0, TAU); g.fill();
      });
    },
    gus(g) {
      // backwards cap: structured crown, panel seams, bill out the back
      apoly(g, [[32.6, 4.6, 1.5], [38.8, 5.4, 2], [37.8, 8.8, 2], [32.2, 8.2, 1.5]], '#8c2d24', { flat: true, lw: 1.3 });
      apoly(g, [[16, 7.8, 4], [20, 1.2, 4], [30, 1.2, 4], [34, 7.8, 4], [33.4, 10.4, 2], [16.6, 10.4, 2]], '#b03a2e', { lw: 1.6, rim: 'rgba(255,170,140,0.4)' });
      g.strokeStyle = '#8c2d24'; g.lineWidth = LW_INT;
      g.beginPath(); g.moveTo(21.5, 1.8); g.lineTo(23, 10.2); g.stroke();
      g.beginPath(); g.moveTo(28.5, 1.8); g.lineTo(27, 10.2); g.stroke();
      g.beginPath(); g.arc(25, 4.6, 1.4, 0, TAU); g.fillStyle = '#e8e0cc'; g.fill();
      // dark tuft poking out front
      g.strokeStyle = '#3a2e20'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(17.2, 9.6); g.quadraticCurveTo(16, 11, 16.8, 12.4); g.stroke();
    },
  };

  P.max = () => mk(44, 58, (g) => { scoutBase(g, SCOUT_OPTS.max); SCOUT_HATS.max(g); });
  P.junie = () => mk(44, 58, (g) => { scoutBase(g, SCOUT_OPTS.junie); SCOUT_HATS.junie(g); });
  P.gus = () => mk(50, 58, (g) => { scoutBase(g, SCOUT_OPTS.gus); SCOUT_HATS.gus(g); });
  // legless torsos for the walk-cycle renderer
  P.max_body = () => mk(44, 48, (g) => { scoutBase(g, Object.assign({ legless: true }, SCOUT_OPTS.max)); SCOUT_HATS.max(g); });
  P.junie_body = () => mk(44, 48, (g) => { scoutBase(g, Object.assign({ legless: true }, SCOUT_OPTS.junie)); SCOUT_HATS.junie(g); });
  P.gus_body = () => mk(50, 48, (g) => { scoutBase(g, Object.assign({ legless: true }, SCOUT_OPTS.gus)); SCOUT_HATS.gus(g); });

  // ---------------- death scene props ----------------
  P.ghost = () => mk(36, 42, (g) => {
    g.globalAlpha = 0.92;
    const sheet = () => {
      g.beginPath();
      g.arc(18, 16, 13, Math.PI, 0);
      g.lineTo(31, 32);
      g.quadraticCurveTo(28.5, 27, 25.5, 32);
      g.quadraticCurveTo(22.5, 37, 19.5, 32);
      g.quadraticCurveTo(16.5, 27, 13.5, 32);
      g.quadraticCurveTo(10.5, 37, 7.5, 32);
      g.quadraticCurveTo(6, 29, 5, 32);
      g.closePath();
    };
    sheet(); g.fillStyle = '#eef2f4'; g.fill();
    g.save(); sheet(); g.clip();
    // soft interior: cool shade low, holy-water glow (the accent), crown light
    g.fillStyle = 'rgba(110,130,150,0.22)';
    g.beginPath(); g.ellipse(18, 30, 14, 9, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(126,200,232,0.2)';
    g.beginPath(); g.ellipse(18, 25, 8.5, 6.5, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.ellipse(13.5, 8.5, 6.5, 4, -0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(126,200,232,0.5)'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.ellipse(18, 16, 11.6, 11.6, 0, Math.PI * 1.02, Math.PI * 1.62); g.stroke();
    // hem shadows above the wave points
    g.fillStyle = 'rgba(110,130,150,0.16)';
    [[10.5, 30], [16.5, 30.5], [22.5, 30.5], [28.5, 30]].forEach(p2 => {
      g.beginPath(); g.ellipse(p2[0], p2[1], 2, 1.1, 0, 0, TAU); g.fill();
    });
    g.restore();
    sheet(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(90,100,110,0.8)'; g.stroke();
    g.fillStyle = '#3a4148';
    g.beginPath(); g.ellipse(13.5, 15, 1.9, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(22.5, 15, 1.9, 3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(13, 14, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, 14, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(18, 22, 2.4, 3.2, 0, 0, TAU);
    g.fillStyle = '#5a6168'; g.fill();
    g.globalAlpha = 1;
  });

  P.hat_max = () => mk(26, 13, (g) => {
    lens(g, 13, 8.6, 12.4, 2.5, '#7a5230', 1.4);
    apoly(g, [[6.8, 7, 2], [10.8, 1.4, 2], [15.2, 1.4, 2], [19.2, 7, 2]], '#7a5230', { lw: 1.4 });
    g.strokeStyle = '#54371e'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(7.4, 7.6); g.lineTo(18.6, 7.6); g.stroke();
  });
  P.hat_junie = () => mk(24, 11, (g) => {
    apoly(g, [[0.8, 7.6, 2], [10.5, 1.8, 3], [22, 5.2, 2], [17.6, 8.8, 2], [3.6, 9.6, 2]], '#3f6b35', { lw: 1.4 });
    g.beginPath(); g.arc(10.5, 2.4, 1.3, 0, TAU); g.fillStyle = '#2c4b25'; g.fill();
  });
  P.hat_gus = () => mk(24, 13, (g) => {
    apoly(g, [[2, 8.2, 3], [5.5, 2.4, 3], [14.5, 2.4, 3], [18, 8.2, 3], [17.4, 10.6, 2], [2.6, 10.6, 2]], '#b03a2e', { lw: 1.4 });
    apoly(g, [[17.2, 5.4, 1.5], [22.8, 6.2, 2], [21.8, 9.4, 2], [16.8, 8.8, 1.5]], '#8c2d24', { flat: true, lw: 1.2 });
  });

  // ---------------- held weapons (point +x) ----------------
  P.h_slingshot = () => mk(28, 14, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(3, 7); g.lineTo(13, 7); g.stroke();
    g.beginPath(); g.moveTo(13, 7); g.lineTo(21, 2); g.stroke();
    g.beginPath(); g.moveTo(13, 7); g.lineTo(21, 12); g.stroke();
    g.strokeStyle = '#3a3f46'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(21, 2); g.lineTo(25, 7); g.lineTo(21, 12); g.stroke();
    g.beginPath(); g.arc(25, 7, 1.8, 0, TAU); g.fillStyle = '#5a4632'; g.fill();
  });

  P.h_roaster = () => mk(32, 12, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(2, 6); g.lineTo(21, 6); g.stroke();
    blob(g, 25, 6, 4.6, 4, '#f6efe2', { lw: 1.2 });
    blob(g, 27.5, 5, 2, 1.7, '#d8913c', { flat: true, noline: true });
  });

  P.h_hatchet = () => mk(28, 16, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(3, 13); g.lineTo(19, 5); g.stroke();
    poly(g, [[16, 1], [25, 4], [23, 13], [15, 8]], '#b8bec4');
    g.strokeStyle = '#e8edf0'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(24.5, 5); g.lineTo(23, 12); g.stroke();
  });

  // ---------------- projectiles ----------------
  P.knife = () => mk(24, 9, (g) => {
    poly(g, [[2, 4.5], [14, 1], [14, 8]], '#c9d2d8', { lw: 1.1 });
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.1;
    g.beginPath(); g.roundRect(14, 2.4, 8, 4.2, 2); g.fill(); g.stroke();
  });

  P.boomer = () => mk(24, 24, (g) => {
    g.fillStyle = '#d9a441'; g.strokeStyle = OUT; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(4, 20);
    g.quadraticCurveTo(4, 6, 18, 4);
    g.quadraticCurveTo(20, 8, 12, 10);
    g.quadraticCurveTo(9, 11, 9, 20);
    g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#8a6138'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(7, 18); g.lineTo(7, 11); g.stroke();
  });

  P.bomb = () => mk(14, 20, (g) => {
    g.fillStyle = '#b03a2e'; g.strokeStyle = OUT; g.lineWidth = 1.4;
    g.beginPath(); g.roundRect(3, 6, 8, 12, 3); g.fill(); g.stroke();
    g.strokeStyle = '#e8e0cc'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(3.5, 10) ; g.lineTo(10.5, 10); g.moveTo(3.5, 14); g.lineTo(10.5, 14); g.stroke();
    g.strokeStyle = '#8a6138'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(7, 6); g.quadraticCurveTo(9, 2, 12, 2.4); g.stroke();
  });

  // ---------------- pickups ----------------
  function badge(metal, dark) {
    return mk(20, 26, (g) => {
      poly(g, [[6, 12], [10, 16], [4, 24], [3, 18]], '#b03a2e', { lw: 1.2 });
      poly(g, [[14, 12], [10, 16], [16, 24], [17, 18]], '#8c2d24', { lw: 1.2 });
      blob(g, 10, 9, 7.4, 7.4, metal, { lw: 1.5 });
      star5(g, 10, 9, 4.4);
      g.fillStyle = dark; g.fill();
    });
  }
  P.badge1 = () => badge('#c08344', '#7a4a20');
  P.badge2 = () => badge('#c9d2d8', '#5c6a74');
  P.badge3 = () => badge('#f4c542', '#8a6a10');

  P.cocoa = () => mk(24, 22, (g) => {
    g.fillStyle = '#8a5a34'; g.strokeStyle = OUT; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(4, 7, 13, 12, 2.5); g.fill(); g.stroke();
    g.strokeStyle = '#8a5a34'; g.lineWidth = 2.6;
    g.beginPath(); g.arc(18.5, 12.5, 3.4, -1.2, 1.2); g.stroke();
    blob(g, 10.5, 7, 6.4, 2.6, '#e8d9b0', { flat: true, lw: 1.2 });
    g.strokeStyle = 'rgba(240,240,240,0.7)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(8, 5); g.quadraticCurveTo(10, 2, 8, 0.8); g.stroke();
    g.beginPath(); g.moveTo(13, 5); g.quadraticCurveTo(15, 2.4, 13, 1); g.stroke();
  });

  P.magnet = () => mk(20, 20, (g) => {
    g.strokeStyle = '#c0392b'; g.lineWidth = 4.6;
    g.beginPath(); g.arc(10, 9, 6, Math.PI * 0.92, Math.PI * 2.08); g.stroke();
    g.strokeStyle = OUT; g.lineWidth = 1;
    g.fillStyle = '#c9d2d8';
    g.fillRect(2.4, 12.5, 4.4, 4.4); g.strokeRect(2.4, 12.5, 4.4, 4.4);
    g.fillRect(13.2, 12.5, 4.4, 4.4); g.strokeRect(13.2, 12.5, 4.4, 4.4);
  });

  P.chest = () => mk(28, 22, (g) => {
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.6;
    g.beginPath(); g.roundRect(3, 8, 22, 12, 3); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(3, 3, 22, 8, 4); g.fillStyle = '#8a5a34'; g.fill(); g.stroke();
    g.fillStyle = '#e3b341';
    g.fillRect(12, 3, 4, 17); g.strokeRect(12, 3, 4, 17);
    blob(g, 14, 12, 2.6, 3, '#f4c542', { flat: true, lw: 1.2 });
  });

  // Cookie Money: a gold coin somebody took a bite out of.
  P.coin = () => mk(22, 22, (g) => {
    const disc = () => {
      g.beginPath();
      g.arc(11, 11, 9, 0.35, TAU - 1.25);
      g.quadraticCurveTo(13.6, 7.4, 17.6, 8.6);          // two scalloped
      g.quadraticCurveTo(15.4, 11.6, 19.45, 14.09);      // bite notches
      g.closePath();
    };
    disc(); g.fillStyle = '#f4c542'; g.fill();
    g.save(); disc(); g.clip();
    g.fillStyle = 'rgba(120,70,8,0.28)';
    g.beginPath(); g.ellipse(11, 19, 12, 8, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,250,220,0.3)';
    g.beginPath(); g.ellipse(7, 6.4, 5.4, 4, 0, 0, TAU); g.fill();
    g.restore();
    disc(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(140,92,12,0.6)'; g.lineWidth = 1;
    g.beginPath(); g.arc(11, 11, 6.2, 0.75, TAU - 1.35); g.stroke();
    star5(g, 10.4, 11.6, 3.2);
    g.fillStyle = 'rgba(160,104,14,0.45)'; g.fill();
    g.fillStyle = '#e3b341'; g.strokeStyle = OUT; g.lineWidth = 0.7;      // crumb
    g.beginPath(); g.arc(19.4, 4.2, 1.3, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,252,235,0.92)';                               // specular
    g.beginPath(); g.ellipse(6.6, 6.2, 2.5, 1.5, -0.6, 0, TAU); g.fill();
    g.beginPath(); g.arc(5.1, 9.9, 1, 0, TAU); g.fill();
  });

  // ---------------- camp props ----------------
  P.tent = () => mk(78, 56, (g) => {
    poly(g, [[6, 52], [39, 6], [72, 52]], '#5c7248', { lw: 2 });          // canvas
    poly(g, [[39, 6], [72, 52], [58, 52], [39, 14]], '#4a5c3a', { noline: true });
    poly(g, [[28, 52], [39, 22], [50, 52]], '#2c3626', { lw: 1.6 });       // opening
    g.strokeStyle = '#8a6138'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(39, 6); g.lineTo(39, 0); g.stroke();           // pole tip
    g.strokeStyle = '#3a2e20'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(6, 52); g.lineTo(2, 55); g.moveTo(72, 52); g.lineTo(76, 55); g.stroke();
  });

  P.sign = () => mk(36, 46, (g) => {
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.6;
    g.fillRect(15, 12, 6, 32); g.strokeRect(15, 12, 6, 32);
    g.save(); g.translate(18, 12); g.rotate(-0.06);
    g.fillStyle = '#8a6138';
    g.beginPath(); g.roundRect(-16, -9, 32, 14, 2); g.fill(); g.stroke();
    g.strokeStyle = '#3a2313'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-11, -2); g.lineTo(-4, -2); g.moveTo(-1, -2); g.lineTo(8, -2); g.moveTo(-8, 2); g.lineTo(11, 2); g.stroke();
    g.restore();
    poly(g, [[30, 8], [36, 5], [30, 2]], '#c0392b', { lw: 1.2 });          // arrow flag
  });

  P.board = () => mk(58, 52, (g) => {
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.6;
    g.fillRect(6, 14, 5, 36); g.strokeRect(6, 14, 5, 36);
    g.fillRect(47, 14, 5, 36); g.strokeRect(47, 14, 5, 36);
    g.fillStyle = '#8a6138';
    g.beginPath(); g.roundRect(2, 4, 54, 30, 3); g.fill(); g.stroke();
    g.fillStyle = '#5c4a30';
    g.beginPath(); g.roundRect(6, 8, 46, 22, 2); g.fill();
    // pinned badge papers
    [['#e8d9b0', 10, 12], ['#c9d2d8', 24, 11], ['#e8d9b0', 38, 13]].forEach(p2 => {
      g.fillStyle = p2[0];
      g.fillRect(p2[1], p2[2], 9, 11);
      g.fillStyle = '#c0392b';
      g.beginPath(); g.arc(p2[1] + 4.5, p2[2], 1.4, 0, TAU); g.fill();
    });
    star5(g, 47, 26, 3.4); g.fillStyle = '#f4c542'; g.fill();
  });

  P.skull = () => mk(56, 40, (g) => {
    g.strokeStyle = '#d8cfc0'; g.lineWidth = 2.6;                          // antlers
    g.beginPath(); g.moveTo(20, 18); g.quadraticCurveTo(8, 10, 4, 2); g.stroke();
    g.beginPath(); g.moveTo(14, 12); g.quadraticCurveTo(8, 12, 2, 10); g.stroke();
    g.beginPath(); g.moveTo(36, 18); g.quadraticCurveTo(48, 10, 52, 2); g.stroke();
    g.beginPath(); g.moveTo(42, 12); g.quadraticCurveTo(48, 12, 54, 10); g.stroke();
    blob(g, 28, 24, 11, 11, '#e6ded0', { lw: 1.6 });                       // cranium
    blob(g, 28, 33, 5.4, 6, '#d8cfc0', { lw: 1.4 });                       // snout
    g.fillStyle = '#181008';
    g.beginPath(); g.ellipse(23, 22, 3, 3.6, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(33, 22, 3, 3.6, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(28, 33, 1.4, 2.4, 0, 0, TAU); g.fill();
  });

  P.brock = () => mk(50, 60, (g) => {
    // torso: shoulders and a settled, comfortable taper
    apoly(g, [[11, 30, 6], [25, 26.5, 7], [39, 30, 6], [40.5, 42, 5], [34, 52.5, 4], [16, 52.5, 4], [9.5, 42, 5]], '#6e6a62', { rim: RIM_COOL, mid: 'rgba(28,26,22,0.13)', shade: 'rgba(28,26,22,0.22)' });
    blob(g, 25, 45.5, 8, 6, '#8a867c', { flat: true, noline: true });
    furRow(g, 19, 33, 31, 33, 4, 3.6, 4, 0, ['#7c7870', '#6e6a62'], null);
    // merit sash: the green accent, with stitch ticks
    g.strokeStyle = '#3f6b35'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(15, 32); g.lineTo(33, 48); g.stroke();
    g.strokeStyle = 'rgba(230,240,220,0.4)'; g.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const t = 0.12 + i * 0.19, sx = 15 + 18 * t, sy = 32 + 16 * t;
      g.beginPath(); g.moveTo(sx - 1.4, sy + 1.6); g.lineTo(sx - 2.6, sy + 2.8); g.stroke();
    }
    g.fillStyle = '#f4c542';
    [[19, 36], [24, 40], [29, 44]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(d[0] - 0.5, d[1] - 0.5, 0.5, 0, TAU); g.fill();
      g.fillStyle = '#f4c542';
    });
    // ears
    apoly(g, [[12, 11.5, 1.5], [19.5, 13, 2], [14, 19, 2.5]], '#6e6a62');
    apoly(g, [[38, 11.5, 1.5], [30.5, 13, 2], [36, 19, 2.5]], '#6e6a62');
    // head: broad brow settling to the snout
    apoly(g, [[13, 13, 6], [37, 13, 6], [39.5, 22, 5], [32, 31, 4], [25, 33.5, 3], [18, 31, 4], [10.5, 22, 5]], '#8a867c', { rim: RIM_COOL, mid: 'rgba(28,26,22,0.12)', shade: 'rgba(28,26,22,0.2)' });
    // badger stripes: soft-tapered bands over the eyes, bright center blaze
    apoly(g, [[17, 13.6, 2.5], [23, 13.6, 2.5], [22.5, 27, 2], [17.5, 27, 2]], '#2e2a26', { flat: true, noline: true });
    apoly(g, [[27, 13.6, 2.5], [33, 13.6, 2.5], [32.5, 27, 2], [27.5, 27, 2]], '#2e2a26', { flat: true, noline: true });
    apoly(g, [[23.6, 13.6, 1.5], [26.4, 13.6, 1.5], [26, 30.5, 1.5], [24, 30.5, 1.5]], '#e6ded0', { flat: true, noline: true });
    blob(g, 25, 15.5, 6, 1.8, 'rgba(255,255,255,0.2)', { flat: true, noline: true });
    cuteEye(g, 20, 19.5, 1.9);
    cuteEye(g, 30, 19.5, 1.9);
    // muzzle and nose with a shine
    blob(g, 25, 28.5, 4.6, 3.2, '#e6ded0', { flat: true, noline: true });
    g.beginPath(); g.arc(25, 27.4, 1.6, 0, TAU); g.fillStyle = '#181008'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath(); g.arc(24.4, 26.9, 0.5, 0, TAU); g.fill();
    // campaign hat: wedge brim, peaked crown, band
    lens(g, 25, 9.1, 12.5, 2.7, '#7a5230', 1.6);
    apoly(g, [[19.5, 7.4, 2], [23.2, 1.2, 2], [26.8, 1.2, 2], [30.5, 7.4, 2]], '#7a5230', { lw: 1.6 });
    g.strokeStyle = '#54371e'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(20, 8); g.lineTo(30, 8); g.stroke();
    g.beginPath(); g.moveTo(25, 1.8); g.lineTo(25, 6); g.stroke();
    g.strokeStyle = 'rgba(255,224,170,0.35)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(15, 9.2); g.quadraticCurveTo(20, 7.8, 24, 7.6); g.stroke();
    // whistle on a lanyard
    g.strokeStyle = '#c9d2d8'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(25, 33.5); g.lineTo(25, 37); g.stroke();
    g.fillStyle = '#c9d2d8'; g.beginPath(); g.arc(25, 38.5, 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(24.4, 37.9, 0.6, 0, TAU); g.fill();
  });

  P.stick = () => mk(14, 26, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(7, 26); g.lineTo(7, 8); g.stroke();
    blob(g, 7, 6, 3.6, 4, '#f6efe2', { lw: 1.1 });                          // marshmallow
    blob(g, 8.4, 4.6, 1.6, 1.4, '#3a2313', { flat: true, noline: true });   // burnt
  });

  // ---------------- room props ----------------
  P.crate = () => mk(44, 40, (g) => {
    const box = () => { g.beginPath(); g.roundRect(4, 11, 36, 26, 2.5); };
    box(); g.fillStyle = '#8a6138'; g.fill();
    g.save(); box(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.24)'; g.fillRect(4, 27, 36, 12);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(4, 11, 19, 8);
    g.fillStyle = '#6e4526';                                               // corner battens
    g.fillRect(4, 11, 5, 26); g.fillRect(35, 11, 5, 26);
    g.strokeStyle = 'rgba(70,42,18,0.65)'; g.lineWidth = 1.1;              // plank seams
    g.beginPath(); g.moveTo(9, 21); g.lineTo(35, 21); g.moveTo(9, 29); g.lineTo(35, 29); g.stroke();
    g.restore();
    box(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    star5(g, 22, 25, 6.4);                                                 // stencil
    g.fillStyle = 'rgba(192,57,43,0.9)'; g.fill();
    g.strokeStyle = 'rgba(110,24,18,0.8)'; g.lineWidth = 0.9; g.stroke();
    g.save(); g.translate(22, 11); g.rotate(-0.07);                        // lid, askew
    const lid = () => { g.beginPath(); g.roundRect(-20, -7, 40, 9, 2); };
    lid(); g.fillStyle = '#a4753f'; g.fill();
    g.save(); lid(); g.clip();
    g.fillStyle = 'rgba(255,244,214,0.2)'; g.fillRect(-20, -7, 22, 4);
    g.fillStyle = 'rgba(12,5,3,0.22)'; g.fillRect(-20, 0, 40, 3);
    g.restore();
    lid(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    g.restore();
  });

  P.basket = () => mk(40, 34, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 2.4;                          // handle, behind
    g.beginPath(); g.arc(20, 14, 10.4, Math.PI * 1.13, Math.PI * 1.87); g.stroke();
    const body = () => {
      g.beginPath();
      g.moveTo(5, 13); g.lineTo(35, 13); g.lineTo(32, 28);
      g.quadraticCurveTo(20, 32, 8, 28); g.closePath();
    };
    body(); g.fillStyle = '#c69a63'; g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.24)'; g.fillRect(0, 23, 40, 12);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(0, 12, 17, 8);
    g.strokeStyle = 'rgba(90,55,25,0.6)'; g.lineWidth = 1;                 // wicker weave
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(4, 16 + i * 4); g.lineTo(36, 16 + i * 4); g.stroke(); }
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(6 + i * 4, 13); g.lineTo(7 + i * 4, 30); g.stroke(); }
    g.restore();
    body(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    poly(g, [[23, 13.6], [33.4, 9.6], [25.4, 6.3]], '#f2e2b8', { lw: 1.1 }); // sandwich corner
    g.strokeStyle = '#c0392b'; g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(25.4, 12); g.lineTo(31.4, 9.6); g.stroke();
    g.save(); g.translate(6, 13.8); g.rotate(-0.19);                       // lid ajar
    const lid = () => { g.beginPath(); g.roundRect(-1, -6.4, 30, 7, 3); };
    lid(); g.fillStyle = '#d8b174'; g.fill();
    g.save(); lid(); g.clip();
    g.fillStyle = 'rgba(255,244,214,0.22)'; g.fillRect(-1, -6.4, 15, 3);
    g.fillStyle = 'rgba(12,5,3,0.2)'; g.fillRect(-1, -1.4, 30, 2.4);
    g.restore();
    lid(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    g.restore();
  });

  P.mailbox = () => mk(36, 52, (g) => {
    g.save(); g.translate(17, 34); g.rotate(0.07);                         // leaning post
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.7;
    g.beginPath(); g.roundRect(-3.4, -8, 6.8, 26, 1.6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,244,214,0.14)'; g.fillRect(-3, -7, 2.4, 24);
    g.restore();
    g.save(); g.translate(18, 18); g.rotate(0.07);                         // tin box
    const tin = () => {
      g.beginPath();
      g.moveTo(-13, 8); g.lineTo(-13, -1);
      g.quadraticCurveTo(-13, -10, 0, -10);
      g.quadraticCurveTo(13, -10, 13, -1);
      g.lineTo(13, 8); g.closePath();
    };
    tin(); g.fillStyle = '#9aa0a8'; g.fill();
    g.save(); tin(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.26)';
    g.beginPath(); g.ellipse(0, 13, 18, 9, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,244,214,0.2)';
    g.beginPath(); g.ellipse(-5, -7, 9, 4.4, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(44,48,54,0.5)';                                    // dent
    g.beginPath(); g.ellipse(5.4, 2, 4.2, 2.6, 0.34, 0, TAU); g.fill();
    g.restore();
    tin(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = '#5c626a'; g.lineWidth = 1.3;                          // door seam
    g.beginPath(); g.moveTo(-8.6, -8.4); g.lineTo(-8.6, 8); g.stroke();
    g.fillStyle = '#c9d2d8'; g.strokeStyle = OUT; g.lineWidth = 0.9;
    g.beginPath(); g.arc(-5.6, 1, 1.7, 0, TAU); g.fill(); g.stroke();
    g.restore();
    g.save(); g.translate(30, 17); g.rotate(0.07);                         // flag up
    g.strokeStyle = '#8c2d24'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -6.4); g.stroke();
    g.fillStyle = '#c0392b'; g.strokeStyle = OUT; g.lineWidth = 1.4;
    g.beginPath(); g.roundRect(0, -8.6, 5, 7, 1.2); g.fill(); g.stroke();
    g.restore();
  });

  P.birdhouse = () => mk(34, 56, (g, eyes) => {
    g.fillStyle = '#6e4526'; g.strokeStyle = OUT; g.lineWidth = 1.7;       // pole
    g.beginPath(); g.roundRect(13.4, 32, 6.4, 24, 1.6); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,244,214,0.14)'; g.fillRect(14, 33, 2.4, 22);
    const hut = () => { g.beginPath(); g.roundRect(5, 16, 24, 20, 2); };
    hut(); g.fillStyle = '#c69a63'; g.fill();
    g.save(); hut(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.24)'; g.fillRect(5, 28, 24, 10);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(5, 16, 12, 7);
    g.strokeStyle = 'rgba(90,55,25,0.5)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(5, 25); g.lineTo(29, 25); g.moveTo(5, 31); g.lineTo(29, 31); g.stroke();
    g.restore();
    hut(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    poly(g, [[2, 17.4], [17, 5], [32, 17.4]], '#7a4e2c', { lw: 1.8 });     // roof
    poly(g, [[17, 5], [32, 17.4], [24.4, 17.4]], 'rgba(12,5,3,0.22)', { noline: true });
    g.beginPath(); g.arc(17, 24.6, 6, 0, TAU);                             // doorway
    g.fillStyle = '#0d0704'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
    demonEye(g, eyes, 14.7, 23.4, 1.1);                                    // something is home
    demonEye(g, eyes, 19.3, 23, 1.1);
    demonEye(g, eyes, 16.9, 26.8, 1.1);
    g.strokeStyle = '#8a6138'; g.lineWidth = 2;                            // perch
    g.beginPath(); g.moveTo(17, 31.4); g.lineTo(17, 34.6); g.stroke();
  });

  P.stump = () => mk(48, 36, (g) => {
    const trunk = () => {
      g.beginPath();
      g.moveTo(6, 14); g.lineTo(6, 26);
      g.quadraticCurveTo(24, 35, 42, 26); g.lineTo(42, 14); g.closePath();
    };
    trunk(); g.fillStyle = '#5c3a1e'; g.fill();
    g.save(); trunk(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.26)'; g.fillRect(25, 10, 24, 28);
    g.fillStyle = 'rgba(255,244,214,0.14)'; g.fillRect(4, 10, 10, 28);
    g.strokeStyle = 'rgba(30,16,8,0.55)'; g.lineWidth = 1.1;               // bark grooves
    [12, 20, 30, 37].forEach(x => { g.beginPath(); g.moveTo(x, 14); g.lineTo(x + 1.2, 33); g.stroke(); });
    g.restore();
    trunk(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    blob(g, 24, 14, 18, 6.2, '#c69a63', { lw: 1.7 });                      // cut face
    g.strokeStyle = 'rgba(120,78,40,0.75)'; g.lineWidth = 1;               // growth rings
    for (let i = 1; i <= 3; i++) {
      g.beginPath(); g.ellipse(23.4, 14.4, 18 * i / 4.2, 6.2 * i / 4.2, 0, 0, TAU); g.stroke();
    }
    g.strokeStyle = 'rgba(90,55,25,0.8)'; g.lineWidth = 1.2;               // split
    g.beginPath(); g.moveTo(24, 14); g.lineTo(36.4, 16.6); g.stroke();
    blob(g, 12, 23.5, 6.2, 3.4, '#5c7248', { lw: 1.2 });                   // moss
    blob(g, 15.4, 22, 3.4, 2, '#7ea34c', { flat: true, noline: true });
    blob(g, 37.5, 20, 3.4, 2.2, '#5c7248', { lw: 1.1 });
  });

  P.urn = () => mk(34, 42, (g) => {
    blob(g, 17, 38, 8, 3, '#8a4423', { lw: 1.5 });                         // foot
    const belly = () => {
      g.beginPath();
      g.moveTo(11, 10);
      g.quadraticCurveTo(1.6, 20, 8, 33);
      g.quadraticCurveTo(17, 39, 26, 33);
      g.quadraticCurveTo(32.4, 20, 23, 10);
      g.closePath();
    };
    belly(); g.fillStyle = '#a4552c'; g.fill();
    g.save(); belly(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.24)';
    g.beginPath(); g.ellipse(17, 39, 20, 12, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,244,214,0.18)';
    g.beginPath(); g.ellipse(9.4, 18, 5.4, 7.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#e3b341'; g.fillRect(0, 22, 34, 3.4);                   // painted ring
    g.fillStyle = 'rgba(12,5,3,0.18)'; g.fillRect(0, 24.4, 34, 1);
    g.restore();
    belly(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    blob(g, 17, 9, 9, 3.2, '#b25f31', { lw: 1.6 });                        // rim
    blob(g, 17, 8.4, 6, 2, '#3a2011', { flat: true, lw: 1.2 });
    poly(g, [[20.4, 6.2], [24.6, 7.6], [21.4, 10.2]], '#3a2011', { lw: 1.1 }); // chip
    g.strokeStyle = 'rgba(40,20,10,0.7)'; g.lineWidth = 1;                 // crack
    g.beginPath(); g.moveTo(21.6, 11); g.lineTo(24, 15); g.lineTo(22.4, 19); g.stroke();
  });

  P.barrel = () => mk(38, 44, (g) => {
    const staves = () => {
      g.beginPath();
      g.moveTo(7, 9);
      g.quadraticCurveTo(1.4, 22, 7, 39);
      g.quadraticCurveTo(19, 42, 31, 39);
      g.quadraticCurveTo(36.6, 22, 31, 9);
      g.quadraticCurveTo(19, 6, 7, 9);
      g.closePath();
    };
    staves(); g.fillStyle = '#8a6138'; g.fill();
    g.save(); staves(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.26)'; g.fillRect(22, 0, 20, 44);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(0, 4, 11, 30);
    g.strokeStyle = 'rgba(70,42,18,0.7)'; g.lineWidth = 1;
    [12, 19, 26].forEach(x => {
      g.beginPath(); g.moveTo(x, 7); g.quadraticCurveTo(x - 1.6, 22, x, 41); g.stroke();
    });
    [13, 27].forEach(y => {                                                // rusted hoops
      g.fillStyle = '#b4532a'; g.fillRect(0, y, 38, 4.4);
      g.fillStyle = 'rgba(255,244,214,0.14)'; g.fillRect(0, y, 38, 1.2);
      g.fillStyle = 'rgba(12,5,3,0.24)'; g.fillRect(0, y + 3.2, 38, 1.2);
      g.fillStyle = 'rgba(60,26,10,0.5)';
      [6, 15, 24, 32].forEach(x => { g.beginPath(); g.arc(x, y + 2.2, 0.9, 0, TAU); g.fill(); });
    });
    g.restore();
    staves(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    blob(g, 19, 8.6, 12, 3.6, '#6e4526', { lw: 1.6 });                     // lid
    g.strokeStyle = 'rgba(40,22,10,0.6)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(9, 8.6); g.lineTo(29, 8.6); g.stroke();
  });

  P.logpile = () => mk(60, 36, (g) => {
    const log = (x0, x1, y, r, bark, face) => {
      const barkShape = () => { g.beginPath(); g.roundRect(x0, y - r, x1 - x0, r * 2, r * 0.55); };
      barkShape(); g.fillStyle = bark; g.fill();
      g.save(); barkShape(); g.clip();
      g.fillStyle = 'rgba(12,5,3,0.26)'; g.fillRect(x0, y + r * 0.15, x1 - x0, r * 2);
      g.fillStyle = 'rgba(255,244,214,0.15)'; g.fillRect(x0, y - r, x1 - x0, r * 0.7);
      g.strokeStyle = 'rgba(60,36,16,0.5)'; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(x0, y + r * 0.55); g.lineTo(x1, y + r * 0.42); g.stroke();
      g.restore();
      barkShape(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
      blob(g, x0 + 1.6, y, r * 0.62, r * 0.95, face, { lw: 1.5 });         // end grain
      g.strokeStyle = 'rgba(120,78,40,0.8)'; g.lineWidth = 0.9;
      for (let i = 1; i <= 2; i++) {
        g.beginPath(); g.ellipse(x0 + 1.6, y, r * 0.62 * i / 3, r * 0.95 * i / 3, 0, 0, TAU); g.stroke();
      }
    };
    log(4, 56, 28, 7, '#6e4526', '#c69a63');
    log(8, 52, 15.6, 6.4, '#7a4e2c', '#d8b174');
    log(20, 48, 6, 5, '#6e4526', '#c69a63');
    blob(g, 44, 30.4, 4.4, 2.4, '#a83226', { lw: 1.2, line: '#140a08' });  // shelf fungus
    blob(g, 43, 29.4, 2, 1, 'rgba(240,230,210,0.6)', { flat: true, noline: true });
  });

  P.pedestal = () => mk(44, 34, (g) => {
    const col = () => {
      g.beginPath();
      g.moveTo(7, 30); g.lineTo(11.4, 15); g.lineTo(32.6, 15); g.lineTo(37, 30); g.closePath();
    };
    col(); g.fillStyle = '#5a5a52'; g.fill();
    g.save(); col(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.26)'; g.fillRect(24, 12, 20, 22);
    g.fillStyle = 'rgba(255,244,214,0.15)'; g.fillRect(6, 12, 9, 22);
    g.strokeStyle = 'rgba(30,32,30,0.5)'; g.lineWidth = 1;                 // block seam
    g.beginPath(); g.moveTo(6, 23); g.lineTo(38, 23); g.stroke();
    g.restore();
    col(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
    blob(g, 22, 28.6, 18, 4.2, '#6e6a62', { lw: 1.8 });                    // plinth
    blob(g, 22, 14, 17, 5.2, '#8a867c', { lw: 1.8 });                      // top slab
    const gr = g.createRadialGradient(22, 11.6, 1, 22, 11.6, 14);          // reward glow
    gr.addColorStop(0, 'rgba(255,232,166,0.72)');
    gr.addColorStop(0.5, 'rgba(244,197,66,0.26)');
    gr.addColorStop(1, 'rgba(244,197,66,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(22, 11.6, 14, 7.4, 0, 0, TAU); g.fill();
  });

  P.door = () => mk(64, 84, (g) => {
    const outer = () => {
      g.beginPath();
      g.moveTo(3, 83); g.lineTo(3, 30);
      g.arc(32, 30, 29, Math.PI, 0);
      g.lineTo(61, 83); g.closePath();
    };
    const inner = () => {
      g.beginPath();
      g.moveTo(11, 83); g.lineTo(11, 31);
      g.arc(32, 31, 21, Math.PI, 0);
      g.lineTo(53, 83); g.closePath();
    };
    outer(); g.fillStyle = '#8a6138'; g.fill();                            // frame
    g.save(); outer(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.26)'; g.fillRect(34, 0, 34, 84);
    g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(0, 0, 16, 62);
    g.strokeStyle = 'rgba(70,42,18,0.55)'; g.lineWidth = 1;                // frame grain
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(2, 22 + i * 14); g.lineTo(12, 24 + i * 14); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(52, 24 + i * 14); g.lineTo(62, 22 + i * 14); g.stroke(); }
    g.restore();
    outer(); g.lineWidth = 1.9; g.strokeStyle = OUT; g.stroke();
    inner(); g.fillStyle = '#2b1b0d'; g.fill();                            // dark interior panel
    g.save(); inner(); g.clip();
    g.fillStyle = 'rgba(255,244,214,0.09)'; g.fillRect(11, 0, 11, 84);
    g.strokeStyle = 'rgba(10,4,2,0.85)'; g.lineWidth = 1.4;                // plank seams
    [21, 29, 37, 45].forEach(x => { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 84); g.stroke(); });
    g.fillStyle = '#3f3a34';                                               // iron bands
    g.fillRect(8, 34, 48, 5); g.fillRect(8, 62, 48, 5);
    g.fillStyle = 'rgba(255,244,214,0.12)';
    g.fillRect(8, 34, 48, 1.6); g.fillRect(8, 62, 48, 1.6);
    g.restore();
    inner(); g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = '#e3b341'; g.lineWidth = 2.2;                          // ring handle
    g.beginPath(); g.arc(45, 52, 4.4, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(110,72,10,0.6)'; g.lineWidth = 0.9;
    g.beginPath(); g.arc(45, 53.2, 4.4, 0.35, Math.PI - 0.35); g.stroke();
    g.fillStyle = '#c9a24a'; g.strokeStyle = OUT; g.lineWidth = 0.9;
    g.beginPath(); g.arc(45, 46.6, 2, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#3f6b35'; g.lineWidth = 2;                            // vines
    g.beginPath(); g.moveTo(2, 82); g.quadraticCurveTo(7.4, 60, 2.4, 40);
    g.quadraticCurveTo(0.4, 26, 9.4, 14); g.stroke();
    g.beginPath(); g.moveTo(62, 83); g.quadraticCurveTo(56.6, 64, 61.6, 46);
    g.quadraticCurveTo(63, 36, 58, 28); g.stroke();
    [[5.4, 70, -0.5], [4.8, 50, 0.42], [4.4, 32, -0.6], [10, 15, 0.5],
     [59, 72, 0.5], [59.8, 54, -0.42], [57.4, 34, 0.55]].forEach(v => {
      blob(g, v[0], v[1], 3.6, 2, '#4a7c3a', { rot: v[2], lw: 1 });
    });
  });

  // ---------------- ground decorations ----------------
  P.grass1 = () => mk(24, 18, (g) => {
    g.lineWidth = 2; g.lineCap = 'round';
    const cols = ['#22331d', '#2b4023', '#22331d', '#2b4023'];
    [[4, 0], [10, -3], [15, 2], [20, -1]].forEach((b, i) => {
      g.strokeStyle = cols[i];
      g.beginPath(); g.moveTo(b[0], 18);
      g.quadraticCurveTo(b[0] + b[1], 9, b[0] + b[1] * 1.6, 2);
      g.stroke();
    });
  });
  P.grass2 = () => mk(20, 14, (g) => {
    g.lineWidth = 1.8;
    [['#26391f', 3, 2], ['#1e2d1a', 9, -2], ['#26391f', 15, 1]].forEach(b => {
      g.strokeStyle = b[0];
      g.beginPath(); g.moveTo(b[1], 14);
      g.quadraticCurveTo(b[1] + b[2], 7, b[1] + b[2] * 2, 1);
      g.stroke();
    });
  });
  P.stone = () => mk(22, 15, (g) => {
    blob(g, 11, 9, 9, 5.4, '#3c4148', { lw: 1.2, line: '#14161a' });
    blob(g, 8, 7, 3.4, 1.8, 'rgba(200,210,220,0.14)', { flat: true, noline: true });
  });
  P.mush = () => mk(16, 16, (g) => {
    g.fillStyle = '#d8cfba'; g.strokeStyle = '#141014'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(6.4, 8, 3.2, 6.4, 1.4); g.fill(); g.stroke();
    blob(g, 8, 7, 6.4, 4, '#a83226', { lw: 1.1, line: '#140a08' });
    g.fillStyle = 'rgba(240,230,210,0.85)';
    [[5, 6], [9, 4.6], [11.5, 7]].forEach(d => { g.beginPath(); g.arc(d[0], d[1], 1, 0, TAU); g.fill(); });
  });
  P.bone = () => mk(22, 10, (g) => {
    g.strokeStyle = 'rgba(216,207,192,0.5)'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(5, 6); g.lineTo(17, 4); g.stroke();
    g.fillStyle = 'rgba(216,207,192,0.5)';
    [[4, 4.6], [5, 7.4], [17, 2.6], [18, 5.4]].forEach(d => { g.beginPath(); g.arc(d[0], d[1], 1.8, 0, TAU); g.fill(); });
  });
  P.rune = () => mk(170, 170, (g) => {
    const c = 85;
    g.strokeStyle = 'rgba(150,26,18,0.34)'; g.lineWidth = 3;
    g.beginPath(); g.arc(c, c, 74, 0, TAU); g.stroke();
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(c, c, 62, 0, TAU); g.stroke();
    star5(g, c, c, 70, -Math.PI / 2);
    g.strokeStyle = 'rgba(150,26,18,0.3)'; g.lineWidth = 2; g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      const x = c + Math.cos(a) * 74, y = c + Math.sin(a) * 74;
      g.fillStyle = 'rgba(232,161,60,0.55)';
      g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,220,150,0.5)';
      g.beginPath(); g.arc(x, y - 3, 1.4, 0, TAU); g.fill();
    }
  });

  // ---------------- api ----------------
  function get(name) {
    if (!cache.has(name)) {
      if (!P[name]) throw new Error('no sprite painter: ' + name);
      cache.set(name, P[name]());
    }
    return cache.get(name);
  }

  function whiteOf(s) {
    if (s.wc) return s.wc;
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    s.wc = c;
    return c;
  }

  // Flat silhouette in one color, cached per sprite (max 4 colors kept).
  function tintOf(s, color) {
    if (!s.tc) s.tc = new Map();
    const hit = s.tc.get(color);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = s.c.width; c.height = s.c.height;
    const g = c.getContext('2d');
    g.drawImage(s.c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    if (s.tc.size >= 4) s.tc.delete(s.tc.keys().next().value);
    s.tc.set(color, c);
    return c;
  }

  function draw(ctx, name, x, y, w, o) {
    o = o || {};
    const s = get(name);
    const sc = w / s.w;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.flip ? -sc : sc, sc * (o.squash || 1));
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(o.white ? whiteOf(s) : (o.tint ? tintOf(s, o.tint) : s.c), -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }

  // Draw anchored so the sprite's feet sit at yBottom.
  function drawBottom(ctx, name, x, yBottom, w, o) {
    const s = get(name);
    const h = w * s.h / s.w;
    const squash = (o && o.squash) || 1;
    draw(ctx, name, x, yBottom - (h * squash) / 2, w, o);
  }

  function eyePositions(name, x, yBottom, w, flip, squash) {
    const s = get(name);
    const sc = w / s.w;
    const h = w * s.h / s.w;
    squash = squash || 1;
    const cy = yBottom - (h * squash) / 2;
    const out = [];
    for (const [px, py] of s.eyes) {
      out.push([
        x + (px - s.w / 2) * sc * (flip ? -1 : 1),
        cy + (py - s.h / 2) * sc * squash,
      ]);
    }
    return out;
  }

  function height(name, w) {
    const s = get(name);
    return w * s.h / s.w;
  }

  // Articulated scout: swinging legs under a leaning torso. phase drives the
  // stride, moving toggles between walk cycle and idle sway.
  function drawScout(ctx, id, x, yBottom, w, o) {
    o = o || {};
    const body = get(id + '_body');
    const u = w / body.w;
    const hipDx = (id === 'gus' ? 5.4 : 4.5) * u;
    const legLen = 10.5 * u;
    const skin = SCOUT_OPTS[id].skin;
    const phase = o.phase || 0;
    const moving = !!o.moving;
    const bounce = moving ? Math.abs(Math.sin(phase)) * 2.4 * u : 0;
    const hipY = yBottom - legLen - bounce;

    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    // segmented legs: thigh to a knee break, shin to the foot, wedge boot
    const dir = o.flip ? -1 : 1;
    for (const s of [-1, 1]) {
      const swing = moving ? Math.sin(phase + (s > 0 ? 0 : Math.PI)) * 0.62 : 0.04 * s;
      const hx = x + s * hipDx;
      const fx = hx + Math.sin(swing) * legLen * dir;
      const lift = moving ? Math.max(0, Math.sin(phase + (s > 0 ? 0 : Math.PI) + Math.PI / 2)) * 3 * u : 0;
      const fy = yBottom - lift;
      const kx = (hx + fx) / 2 + dir * (1.1 + (moving ? Math.abs(Math.cos(swing)) * 0.9 : 0.2)) * u;
      const ky = (hipY + fy - 2 * u) / 2 + 0.4 * u;
      ctx.strokeStyle = skin;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3.6 * u;
      ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy - 2 * u); ctx.stroke();
      // wedge boot with a toe and a darker sole line
      ctx.fillStyle = '#3a2e20';
      ctx.beginPath();
      ctx.moveTo(fx - dir * 2.4 * u, fy - 3.6 * u);
      ctx.lineTo(fx + dir * 1.6 * u, fy - 3.6 * u);
      ctx.lineTo(fx + dir * 4.4 * u, fy - 1.4 * u);
      ctx.lineTo(fx + dir * 4.4 * u, fy);
      ctx.lineTo(fx - dir * 2.8 * u, fy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#241a10';
      ctx.lineWidth = 0.9 * u;
      ctx.beginPath();
      ctx.moveTo(fx - dir * 2.6 * u, fy - 0.7 * u);
      ctx.lineTo(fx + dir * 4.2 * u, fy - 0.7 * u);
      ctx.stroke();
    }
    // torso leans into the run
    const lean = (o.lean != null ? o.lean : (moving ? 0.09 : 0)) * (o.flip ? -1 : 1);
    draw(ctx, id + '_body', x + (moving ? Math.sin(phase * 2) * 0.6 * u : 0), hipY - (body.h * u) / 2 + 2 * u, w, {
      flip: o.flip, rot: lean, squash: o.squash || 1,
    });
    if (o.alpha != null) ctx.restore();
  }

  // ---------------- UI icons ----------------
  function icon(ctx, id, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    const u = size / 28;
    ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (id) {
      case 'slingshot': draw(ctx, 'h_slingshot', 0, 0, 26, { rot: -0.7 }); break;
      case 'roaster':   draw(ctx, 'h_roaster', 0, 0, 27, { rot: -0.5 }); break;
      case 'hatchet':   draw(ctx, 'h_hatchet', 0, 0, 26, { rot: -0.4 }); break;
      case 'boomerang': draw(ctx, 'boomer', 0, 0, 22); break;
      case 'knives':    draw(ctx, 'knife', 0, 0, 24, { rot: -0.7 }); break;
      case 'firecracker': draw(ctx, 'bomb', 0, 0, 14); break;
      case 'canteen': {
        ctx.fillStyle = '#5c7248'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 2, 9, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a4a63';
        ctx.fillRect(-2.6, -11, 5.2, 5); ctx.strokeRect(-2.6, -11, 5.2, 5);
        ctx.strokeStyle = 'rgba(230,240,250,0.75)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(0, 2, 5.4, -2.4, -0.8); ctx.stroke();
        break;
      }
      case 'bugspray': {
        ctx.fillStyle = '#4a7c3a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect(-5, -6, 10, 16, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8f979e';
        ctx.fillRect(-3, -10, 6, 4); ctx.strokeRect(-3, -10, 6, 4);
        ctx.fillStyle = 'rgba(180,220,160,0.8)';
        [[7, -9], [10, -6], [8, -3]].forEach(d => { ctx.beginPath(); ctx.arc(d[0], d[1], 1.6, 0, TAU); ctx.fill(); });
        break;
      }
      case 'bugle': {
        ctx.fillStyle = '#e3b341'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.lineTo(2, -2); ctx.lineTo(9, -8);
        ctx.lineTo(11, 6); ctx.lineTo(2, 3); ctx.lineTo(-10, 5);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(-10, 3.5, 2.2, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'firstaid': {
        ctx.fillStyle = '#e8e0cc'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect(-10, -7, 20, 15, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-2.4, -4.4, 4.8, 10); ctx.fillRect(-5, -1.8, 10, 4.8);
        break;
      }
      case 'trailmix': {
        ctx.fillStyle = '#8a6138'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-10, 8, 0, 9);
        ctx.quadraticCurveTo(10, 8, 8, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8d9b0'; ctx.fillRect(-8.4, -7, 16.8, 4); ctx.strokeRect(-8.4, -7, 16.8, 4);
        [['#c0392b', -3, 1], ['#f4c542', 2, 3], ['#5c4530', -1, 5]].forEach(d => {
          ctx.fillStyle = d[0]; ctx.beginPath(); ctx.arc(d[1], d[2], 1.7, 0, TAU); ctx.fill();
        });
        break;
      }
      case 'boots': {
        ctx.fillStyle = '#8a5a34'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-6, -9); ctx.lineTo(1, -9); ctx.lineTo(1, 1); ctx.lineTo(9, 4);
        ctx.lineTo(9, 8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-1, -6); ctx.moveTo(-4, -3); ctx.lineTo(-1, -3); ctx.stroke();
        break;
      }
      case 'lodestone': draw(ctx, 'magnet', 0, 0, 22); break;
      case 'coin':      draw(ctx, 'coin', 0, 0, 24); break;
      case 'whistle': {
        ctx.fillStyle = '#c9d2d8'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect(-10, -6, 14, 7, 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(2, 2, 6, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a3f46'; ctx.beginPath(); ctx.arc(2, 2, 2, 0, TAU); ctx.fill();
        break;
      }
      case 'skillet': {
        ctx.strokeStyle = '#54371e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(13, -8); ctx.stroke();
        ctx.fillStyle = '#2c2f34'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(-2, 2, 9, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(200,210,220,0.15)';
        ctx.beginPath(); ctx.arc(-4, -1, 4, 0, TAU); ctx.fill();
        break;
      }
      case 'fieldguide': {
        ctx.fillStyle = '#3f6b35'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.roundRect(-9, -10, 18, 20, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2c4b25'; ctx.fillRect(-9, -10, 4, 20);
        ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(6, -5); ctx.moveTo(-1, -1); ctx.lineTo(6, -1); ctx.stroke();
        star5(ctx, 2, 5, 2.6); ctx.fillStyle = '#f4c542'; ctx.fill();
        break;
      }
      case 'rabbitfoot': {
        ctx.strokeStyle = '#8a6138'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -5); ctx.stroke();
        ctx.fillStyle = '#e9e4da'; ctx.strokeStyle = OUT;
        ctx.beginPath(); ctx.ellipse(0, 1, 5, 7, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(2, 8, 4, 3.4, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      default: {
        ctx.fillStyle = '#f4c542';
        star5(ctx, 0, 0, 9); ctx.fill();
      }
    }
    ctx.restore();
  }

  return { get, draw, drawBottom, drawScout, eyePositions, height, icon, star: star5 };
})();
