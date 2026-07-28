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

  // The Token: a stamped tin disc on a bootlace. The sigil is an eye, outer
  // ring, lens, slit pupil, pressed dark into the metal, with one canonical
  // punched notch at the lower right rim. Same signature as the old pendant,
  // so every call site simply gets the new look.
  function pendant(g, x, y, r) {
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - r * 1.6, y - r * 2.2); g.lineTo(x, y - r * 0.7); g.lineTo(x + r * 1.6, y - r * 2.2); g.stroke();
    g.fillStyle = '#3a2513';
    g.beginPath(); g.arc(x, y - r * 0.95, r * 0.28, 0, TAU); g.fill();
    blob(g, x, y, r, r, '#b0b6bd', { lw: 1, flat: true });
    g.strokeStyle = 'rgba(58,64,72,0.9)'; g.lineWidth = Math.max(0.7, r * 0.18);
    g.beginPath(); g.arc(x, y, r * 0.72, 0, TAU); g.stroke();
    const alm = () => {
      g.beginPath();
      g.moveTo(x - r * 0.52, y);
      g.quadraticCurveTo(x, y - r * 0.62, x + r * 0.52, y);
      g.quadraticCurveTo(x, y + r * 0.62, x - r * 0.52, y);
      g.closePath();
    };
    alm(); g.fillStyle = '#c6ccd3'; g.fill();
    alm(); g.strokeStyle = 'rgba(50,56,64,0.9)'; g.lineWidth = Math.max(0.6, r * 0.14); g.stroke();
    g.beginPath(); g.ellipse(x, y, r * 0.14, r * 0.34, 0, 0, TAU);
    g.fillStyle = '#2a2e34'; g.fill();
    poly(g, [[x + r * 0.58, y + r * 0.4], [x + r * 1.1, y + r * 0.76], [x + r * 0.38, y + r * 0.92]], OUT, { noline: true });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(x - r * 0.42, y - r * 0.52, r * 0.16, 0, TAU); g.fill();
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

  // ---------------- bosses ----------------
  // The Hare of Perdition grown into itself: four prong antlers threaded
  // through its ears, hind feet like snowshoes, the Token on a bootlace.
  P.bramblebuck = () => mk(96, 104, (g, eyes) => {
    const CRM = '#e6ddcb', CRM_D = '#cfc4b0', CRM_L = '#f2ecdf';
    const bone = (x0, y0, x1, y1, x2, y2, w) => {
      g.lineCap = 'round';
      g.strokeStyle = OUT; g.lineWidth = w + 2.2;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
      g.strokeStyle = '#d8cfc0'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
      g.strokeStyle = 'rgba(255,250,235,0.45)'; g.lineWidth = Math.max(1, w * 0.28);
      g.beginPath(); g.moveTo(x0 - 1, y0 - 1); g.quadraticCurveTo(x1 - 1.5, y1, x2 - 1, y2 + 1); g.stroke();
    };
    // antler beams rise behind the ears first
    bone(38, 44, 34, 34, 32.5, 25, 4);
    bone(58, 44, 62, 34, 63.5, 25, 4);
    // ears: long blades, pink inner cores, a torn hole mid blade
    apoly(g, [[27, 4, 2], [35, 10, 3], [40, 36, 3], [30, 38, 3], [21, 12, 3]], CRM, { rim: RIM_COOL });
    apoly(g, [[69, 4, 2], [61, 10, 3], [56, 36, 3], [66, 38, 3], [75, 12, 3]], CRM, { rim: RIM_COOL });
    apoly(g, [[28.5, 7, 1.5], [33.6, 11.5, 1.5], [37.6, 33, 2], [31.6, 34.5, 2], [24.4, 13, 1.5]], '#e8a0a0', { flat: true, noline: true });
    apoly(g, [[67.5, 7, 1.5], [62.4, 11.5, 1.5], [58.4, 33, 2], [64.4, 34.5, 2], [71.6, 13, 1.5]], '#e8a0a0', { flat: true, noline: true });
    blob(g, 30, 15, 1.4, 5.5, 'rgba(255,190,184,0.8)', { flat: true, noline: true, rot: 0.12 });
    blob(g, 66, 15, 1.4, 5.5, 'rgba(255,190,184,0.8)', { flat: true, noline: true, rot: -0.12 });
    // pierced holes, then the beams thread up through and fork: four prongs
    blob(g, 31.5, 22, 2.4, 3, '#221108', { flat: true, lw: 1, rot: 0.15 });
    blob(g, 64.5, 22, 2.4, 3, '#221108', { flat: true, lw: 1, rot: -0.15 });
    bone(31.5, 22, 28, 12, 25, 3, 3.6);
    bone(29.5, 14, 21, 10, 14, 9, 2.8);
    bone(64.5, 22, 68, 12, 71, 3, 3.6);
    bone(66.5, 14, 75, 10, 82, 9, 2.8);
    // body: hunched mass, chest fluff
    apoly(g, [[30, 62, 6], [66, 62, 6], [74, 76, 5], [70, 90, 4], [26, 90, 4], [22, 76, 5]], CRM_D, { rim: RIM_COOL, mid: 'rgba(80,70,58,0.11)', shade: 'rgba(80,70,58,0.2)' });
    apoly(g, [[24, 70, 4], [34, 67, 4], [36, 79, 4], [31, 88, 3], [24.5, 87, 3], [21.5, 78, 4]], '#c2b6a2', { lw: LW_INT, line: 'rgba(90,80,66,0.55)', flat: true });
    apoly(g, [[72, 70, 4], [62, 67, 4], [60, 79, 4], [65, 88, 3], [71.5, 87, 3], [74.5, 78, 4]], '#c2b6a2', { lw: LW_INT, line: 'rgba(90,80,66,0.55)', flat: true });
    furRow(g, 36, 68, 60, 68, 5, 4.6, 5.2, 0, [CRM_L, CRM], { hi: 'rgba(255,255,255,0.5)' });
    // head: big, cheek fluff breaking the sides, a hard brow
    clump(g, 27, 47, 4.6, 5, -1.9, CRM_L, { line: OUT, lw: 1.4 });
    clump(g, 27.5, 52, 4.2, 4.6, -2.15, CRM, { line: OUT, lw: 1.4 });
    clump(g, 69, 47, 4.6, 5, 1.9, CRM_L, { line: OUT, lw: 1.4 });
    clump(g, 68.5, 52, 4.2, 4.6, 2.15, CRM, { line: OUT, lw: 1.4 });
    apoly(g, [[32, 34, 7], [64, 34, 7], [70, 44, 6], [64, 62, 5], [48, 68, 5], [32, 62, 5], [26, 44, 6]], '#eee7d8', { rim: RIM_COOL, mid: 'rgba(80,70,58,0.1)', shade: 'rgba(80,70,58,0.17)' });
    blob(g, 48, 39, 11, 3.6, 'rgba(255,255,255,0.35)', { flat: true, noline: true });
    g.strokeStyle = '#6b5a44'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 42.5); g.lineTo(43, 45); g.stroke();
    g.beginPath(); g.moveTo(62, 42.5); g.lineTo(53, 45); g.stroke();
    demonEye(g, eyes, 40, 50, 4.2, '#b0a494');
    demonEye(g, eyes, 56, 50, 4.2, '#b0a494');
    // nose, whiskers, long buck teeth with a chipped corner
    apoly(g, [[45.8, 56, 1], [50.2, 56, 1], [48, 59.4, 1]], '#e8a0a0', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.arc(47, 56.8, 0.6, 0, TAU); g.fill();
    g.strokeStyle = '#9a938a'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(42, 58); g.lineTo(31, 56.5); g.moveTo(42, 60); g.lineTo(32, 61.5);
    g.moveTo(54, 58); g.lineTo(65, 56.5); g.moveTo(54, 60); g.lineTo(64, 61.5); g.stroke();
    g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 0.8;
    poly(g, [[43.6, 60], [47.4, 60], [46.8, 66.5], [43.6, 66]], '#fffdf6', { lw: 0.8 });
    poly(g, [[48.6, 60], [52.4, 60], [52.4, 64], [50.8, 65.8], [48.9, 65.4]], '#fffdf6', { lw: 0.8 });
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.arc(45, 61.4, 0.6, 0, TAU); g.fill();
    g.beginPath(); g.arc(50, 61.4, 0.6, 0, TAU); g.fill();
    // little forepaws, then the Token
    apoly(g, [[38, 80, 2], [45, 80, 2], [46, 86, 1.5], [37, 86, 1.5]], '#cfc4b0', { lw: 1.4 });
    apoly(g, [[51, 80, 2], [58, 80, 2], [59, 86, 1.5], [50, 86, 1.5]], '#cfc4b0', { lw: 1.4 });
    pendant(g, 48, 77, 4);
    // comically oversized hind feet, splayed wide
    apoly(g, [[10, 87, 4], [42, 88, 3], [43, 100, 3], [7, 99, 4]], CRM_L, { mid: 'rgba(80,70,58,0.1)', shade: 'rgba(80,70,58,0.16)' });
    apoly(g, [[86, 87, 4], [54, 88, 3], [53, 100, 3], [89, 99, 4]], CRM_L, { mid: 'rgba(80,70,58,0.1)', shade: 'rgba(80,70,58,0.16)' });
    g.strokeStyle = 'rgba(120,110,100,0.6)'; g.lineWidth = 1.2; g.lineCap = 'round';
    [15, 24, 33].forEach(tx => { g.beginPath(); g.moveTo(tx, 92); g.lineTo(tx - 1, 98.4); g.stroke(); });
    [63, 72, 81].forEach(tx => { g.beginPath(); g.moveTo(tx, 92); g.lineTo(tx + 1, 98.4); g.stroke(); });
    claw(g, 13, 99.4, 0.2, 3, BONE); claw(g, 22, 100, 0.1, 3, BONE); claw(g, 31, 100.2, 0, 3, BONE);
    claw(g, 83, 99.4, -0.2, 3, BONE); claw(g, 74, 100, -0.1, 3, BONE); claw(g, 65, 100.2, 0, 3, BONE);
  });

  // The star nosed mole, mostly buried: twenty ray nose star, bone shovel
  // claws, displaced earth, and the only boss that wears a Token.
  P.mawmole = () => mk(120, 90, (g, eyes) => {
    // far lip of thrown earth
    apoly(g, [[10, 74, 5], [24, 56, 7], [60, 48, 8], [96, 56, 7], [110, 74, 5], [104, 84, 4], [16, 84, 4]], '#2c1a0e', { flat: true, lw: 1.8 });
    furRow(g, 22, 56, 60, 49, 6, 6, 7, -0.2, ['#3a2313', '#2c1a0e'], { line: OUT, lw: 1 });
    furRow(g, 60, 49, 98, 56, 6, 6, 7, 0.2, ['#3a2313', '#2c1a0e'], { line: OUT, lw: 1 });
    // velvet body dome
    apoly(g, [[38, 68, 8], [41, 38, 9], [52, 24, 8], [68, 24, 8], [79, 38, 9], [82, 68, 8]], '#4a3626', { mid: 'rgba(16,8,4,0.16)', shade: 'rgba(16,8,4,0.26)', hi: 'rgba(140,110,90,0.14)' });
    furRow(g, 46, 34, 74, 34, 5, 4.4, 4.6, 0, ['#54402e', '#4a3626'], null);
    furRow(g, 44, 46, 76, 46, 5, 4.6, 4.8, 0, ['#443122', '#4a3626'], null);
    // tiny buried eyes, lidded by fur
    demonEye(g, eyes, 49, 33, 1.7, '#2c1e14');
    demonEye(g, eyes, 71, 33, 1.7, '#2c1e14');
    clump(g, 49, 29.5, 4.4, 3.4, Math.PI, '#4a3626', null);
    clump(g, 71, 29.5, 4.4, 3.4, Math.PI, '#4a3626', null);
    // pale snout, then the twenty ray hot pink star
    blob(g, 60, 44, 8, 7, '#6e523c', { lw: LW_INT });
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * TAU;
      clump(g, 60 + Math.cos(a) * 5.5, 47 + Math.sin(a) * 5, 3.2, 8, a + Math.PI / 2,
        i % 2 ? '#ff4fa0' : '#e83a8c', { line: OUT, lw: 0.9 });
    }
    blob(g, 60, 47, 3.2, 3, '#c22a74', { lw: 0.9 });
    g.fillStyle = '#3a0a22';
    g.beginPath(); g.ellipse(58.8, 47, 0.9, 1.3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(61.2, 47, 0.9, 1.3, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    [[60, 40.5], [54.5, 44], [65.5, 44], [57, 52], [63, 52]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.7, 0, TAU); g.fill();
    });
    // bone shovel claws, splayed at the mound edges
    for (const s of [-1, 1]) {
      const hx = 60 + s * 38;
      apoly(g, [[hx - s * 10, 52, 4], [hx + s * 8, 48, 4], [hx + s * 13, 62, 4], [hx + s * 6, 72, 4], [hx - s * 8, 66, 4]], '#bd9a86', { mid: 'rgba(90,50,30,0.14)', shade: 'rgba(90,50,30,0.22)' });
      blob(g, hx + s * 2, 57, 4, 3, 'rgba(255,220,200,0.3)', { flat: true, noline: true });
      claw(g, hx + s * 11, 66, s * 0.75, 11, BONE);
      claw(g, hx + s * 8, 70, s * 0.4, 13, BONE);
      claw(g, hx + s * 2, 72, s * 0.1, 12, BONE);
      claw(g, hx - s * 4, 70, -s * 0.15, 9, BONE);
    }
    // near rim of displaced earth over the body base
    apoly(g, [[4, 80, 5], [20, 68, 6], [44, 73, 6], [62, 66, 7], [84, 73, 6], [102, 68, 6], [116, 80, 5], [110, 88, 4], [10, 88, 4]], '#4a2c16', { mid: 'rgba(12,5,3,0.2)', shade: 'rgba(12,5,3,0.3)', hi: 'rgba(200,140,80,0.12)' });
    furRow(g, 16, 70, 58, 69, 7, 5.4, 6, -0.1, ['#5a3a1e', '#3a2313'], { line: OUT, lw: 0.9 });
    furRow(g, 62, 69, 106, 70, 7, 5.4, 6, 0.1, ['#5a3a1e', '#3a2313'], { line: OUT, lw: 0.9 });
    blob(g, 26, 80, 3.2, 2.2, '#3c4148', { lw: 1, line: '#14161a' });
    blob(g, 94, 82, 2.6, 1.8, '#3c4148', { lw: 1, line: '#14161a' });
    blob(g, 52, 84, 2.2, 1.5, '#5a5a52', { lw: 0.9, line: '#14161a' });
    g.fillStyle = 'rgba(20,10,4,0.5)';
    [[36, 78], [70, 76], [84, 82], [18, 82]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1.1, 0, TAU); g.fill();
    });
    pendant(g, 60, 74, 3.6);
  });

  // The Behind: the deliberate hole in the art style. Near black, matte,
  // almost no highlight, no face, exactly two pale glints. It should look
  // wrong standing next to everything else.
  P.behind = () => mk(80, 130, (g) => {
    const VOID = '#0b0912';
    // long arms hang past where knees would be, three fingers each
    apoly(g, [[27, 22, 3], [33, 26, 3], [26, 68, 2.5], [20, 96, 2], [15, 96, 2], [19, 64, 2.5]], VOID, { flat: true });
    apoly(g, [[53, 22, 3], [47, 26, 3], [54, 68, 2.5], [60, 96, 2], [65, 96, 2], [61, 64, 2.5]], VOID, { flat: true });
    g.lineCap = 'round';
    for (const s of [-1, 1]) {
      const wx = 40 + s * 23, wy = 96;
      [[-5 * s, 17], [0, 20], [4 * s, 15]].forEach(f => {
        g.strokeStyle = OUT; g.lineWidth = 3.4;
        g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + f[0], wy + f[1]); g.stroke();
        g.strokeStyle = '#0e0c15'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + f[0], wy + f[1]); g.stroke();
      });
    }
    // the body: one tapered silhouette, head tilted a little off center
    apoly(g, [[35, 6, 9], [47, 7, 9], [52, 20, 7], [54, 40, 6], [48, 78, 6], [43, 122, 3], [37, 122, 3], [32, 78, 6], [26, 40, 6], [28, 20, 7]], VOID, { flat: true });
    blob(g, 40, 52, 8, 20, 'rgba(34,38,48,0.16)', { flat: true, noline: true });
    // exactly two pale glints, uneven, nothing else
    g.fillStyle = 'rgba(216,224,232,0.9)';
    g.beginPath(); g.arc(35, 16, 1.15, 0, TAU); g.fill();
    g.beginPath(); g.arc(46, 17.2, 1, 0, TAU); g.fill();
  });

  // Old Nobody: a void dark stag with a long pale skull, eyes where eyes
  // should not be, and a crown of antlers built from bone and lost things:
  // a tent pole, a fishing rod, a bicycle frame piece, one red neckerchief.
  P.oldnobody = () => mk(180, 200, (g, eyes) => {
    const boneStk = (w, x0, y0, x1, y1, x2, y2) => {
      g.lineCap = 'round';
      g.strokeStyle = OUT; g.lineWidth = w + 2.4;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
      g.strokeStyle = '#cfc4b2'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
    };
    // bone lattice: eleven branches, asymmetric, left side sweeping wider
    boneStk(4.6, 80, 66, 52, 40, 34, 14);   // 1 left main beam
    boneStk(3.4, 66, 48, 56, 46, 48, 32);   // 2
    boneStk(3, 52, 32, 40, 24, 30, 26);     // 3
    boneStk(2.6, 44, 22, 38, 10, 44, 4);    // 4
    boneStk(3, 76, 58, 66, 60, 56, 64);     // 5 brow tine
    boneStk(4.4, 100, 66, 126, 44, 142, 22); // 6 right main beam
    boneStk(3, 116, 50, 124, 40, 120, 30);  // 7
    boneStk(2.8, 130, 36, 142, 32, 150, 40); // 8
    boneStk(2.6, 138, 28, 140, 16, 134, 8); // 9
    boneStk(2.8, 92, 60, 94, 44, 88, 34);   // 10 crown spike
    boneStk(2.8, 98, 58, 104, 46, 110, 36); // 11 crown spike
    // 12 tent pole, lashed across the left beam
    g.lineCap = 'round';
    g.strokeStyle = OUT; g.lineWidth = 6;
    g.beginPath(); g.moveTo(28, 36); g.lineTo(66, 16); g.stroke();
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(28, 36); g.lineTo(66, 16); g.stroke();
    g.strokeStyle = '#5c626a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(46, 26.6); g.lineTo(50, 24.5); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(30, 34); g.lineTo(63, 16.6); g.stroke();
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(38, 26); g.lineTo(44, 34); g.moveTo(44, 26); g.lineTo(38, 34); g.stroke();
    // 13 fishing rod off the right beam, line hanging with a hook
    g.strokeStyle = OUT; g.lineWidth = 4.6;
    g.beginPath(); g.moveTo(140, 24); g.quadraticCurveTo(158, 28, 172, 42); g.stroke();
    g.strokeStyle = '#8a6138'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(140, 24); g.quadraticCurveTo(158, 28, 172, 42); g.stroke();
    g.strokeStyle = '#a4753f'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(162, 33); g.lineTo(172, 42); g.stroke();
    g.strokeStyle = 'rgba(230,235,240,0.55)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(172, 42); g.quadraticCurveTo(174, 54, 170, 64); g.stroke();
    g.beginPath(); g.arc(168.6, 65.5, 2, Math.PI * 1.7, Math.PI * 0.9); g.stroke();
    // 14 bicycle frame piece hung in the left lattice, rusted
    g.strokeStyle = OUT; g.lineWidth = 5;
    g.beginPath(); g.moveTo(40, 46); g.lineTo(62, 38); g.lineTo(56, 56); g.closePath(); g.stroke();
    g.strokeStyle = '#6e6a62'; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(40, 46); g.lineTo(62, 38); g.lineTo(56, 56); g.closePath(); g.stroke();
    blob(g, 40, 46, 2.6, 2.6, '#54504a', { flat: true, lw: 1 });
    blob(g, 52, 42, 2, 1.4, '#7a4a30', { flat: true, noline: true, rot: 0.4 });
    blob(g, 58, 50, 1.8, 1.2, '#7a4a30', { flat: true, noline: true, rot: -0.5 });
    // 15 the neckerchief: one bright red readable thing, tied on and hanging
    blob(g, 120, 30, 3, 2.4, '#d4402c', { lw: 1.1 });
    apoly(g, [[113, 32, 1.5], [127, 32, 1.5], [120.5, 49, 1]], '#d4402c', { lw: 1.2, mid: 'rgba(90,10,6,0.2)', shade: 'rgba(90,10,6,0.3)' });
    g.strokeStyle = '#8c1f14'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(117, 34); g.lineTo(120, 44); g.stroke();
    blob(g, 117.5, 34.5, 2, 1, 'rgba(255,255,255,0.25)', { flat: true, noline: true, rot: 0.5 });
    // tattered ears, thin void body, stilt legs
    blob(g, 74, 66, 4.4, 7, '#241f28', { rot: -0.55, lw: 1.6 });
    blob(g, 106, 66, 4.4, 7, '#241f28', { rot: 0.55, lw: 1.6 });
    g.lineCap = 'round';
    [[74, 160, 66, 194], [86, 164, 82, 197], [94, 164, 98, 197], [106, 160, 114, 194]].forEach(l => {
      const kx = (l[0] + l[2]) / 2 + 2, ky = (l[1] + l[3]) / 2;
      g.strokeStyle = OUT; g.lineWidth = 6.2;
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(kx, ky); g.lineTo(l[2], l[3]); g.stroke();
      g.strokeStyle = '#14101a'; g.lineWidth = 4.6;
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(kx, ky); g.lineTo(l[2], l[3] - 1.5); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 5;
      g.beginPath(); g.moveTo(l[2], l[3] - 2.2); g.lineTo(l[2], l[3]); g.stroke();
    });
    apoly(g, [[64, 110, 10], [116, 110, 10], [122, 140, 9], [112, 166, 7], [68, 166, 7], [58, 140, 9]], '#17131c', { mid: 'rgba(0,0,0,0.22)', shade: 'rgba(0,0,0,0.3)', hi: 'rgba(120,130,160,0.08)' });
    g.strokeStyle = 'rgba(150,160,180,0.12)'; g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.arc(90, 118 + i * 10, 20 - i * 2, Math.PI * 0.25, Math.PI * 0.75); g.stroke();
    }
    apoly(g, [[80, 88, 4], [100, 88, 4], [104, 116, 4], [76, 116, 4]], '#1d1824', { flat: true, noline: true });
    // the long pale skull, hung low
    apoly(g, [[76, 62, 8], [104, 62, 8], [108, 84, 6], [102, 100, 5], [78, 100, 5], [72, 84, 6]], '#e6ded0', { rim: RIM_COOL, mid: 'rgba(90,84,70,0.12)', shade: 'rgba(90,84,70,0.2)' });
    apoly(g, [[82, 98, 4], [98, 98, 4], [95, 126, 3], [85, 126, 3]], '#d8cfc0', { mid: 'rgba(90,84,70,0.12)', shade: 'rgba(90,84,70,0.2)' });
    g.strokeStyle = 'rgba(70,60,46,0.5)'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(84, 70); g.lineTo(88, 76); g.lineTo(86, 82); g.stroke();
    g.beginPath(); g.moveTo(98, 92); g.lineTo(95, 100); g.stroke();
    blob(g, 84, 80, 5, 6, '#1a1410', { flat: true, noline: true });
    blob(g, 96, 80, 5, 6, '#1a1410', { flat: true, noline: true });
    poly(g, [[90, 110], [86.6, 120], [93.4, 120]], '#221a10', { lw: 1 });
    g.fillStyle = '#efe8da'; g.strokeStyle = OUT; g.lineWidth = 0.7;
    [85.4, 88.4, 91.4, 94.4].forEach(tx => {
      g.fillRect(tx, 123, 2.2, 3.4); g.strokeRect(tx, 123, 2.2, 3.4);
    });
    // six eyes scattered where they should not be
    demonEye(g, eyes, 84, 80, 3.6, '#b8ab94');
    demonEye(g, eyes, 96, 80, 3.6, '#b8ab94');
    demonEye(g, eyes, 90, 67.5, 2.2, '#b8ab94');
    demonEye(g, eyes, 76.5, 91, 1.8, '#b8ab94');
    demonEye(g, eyes, 103, 92, 1.6, '#b8ab94');
    demonEye(g, eyes, 88, 106, 1.5, '#b8ab94');
  });

  // ---------------- late game species ----------------
  P.ticktot = () => mk(34, 30, (g, eyes) => {
    // six thin legs, jointed, three a side
    g.lineCap = 'round';
    const leg = (x0, y0, x1, y1, x2, y2) => {
      g.strokeStyle = OUT; g.lineWidth = 2.8;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = '#4a3421'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    };
    leg(9, 12, 3, 8, 1, 15); leg(8, 16, 2, 16, 1, 23); leg(10, 20, 4, 23, 4, 28);
    leg(25, 12, 31, 8, 33, 15); leg(26, 16, 32, 16, 33, 23); leg(24, 20, 30, 23, 30, 28);
    // round body with a darker scutum near the head
    blob(g, 17, 15, 10.5, 9, '#6b4a2e', { rim: RIM_WARM, mid: 'rgba(38,24,10,0.15)', shade: 'rgba(38,24,10,0.26)' });
    blob(g, 17, 19.5, 5.5, 3.2, '#503722', { flat: true, noline: true });
    g.fillStyle = 'rgba(38,24,10,0.4)';
    [[11, 12], [23, 12], [14, 8.5], [20, 8.5]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.8, 0, TAU); g.fill();
    });
    // the gold back dot: accent and cult tell in one
    blob(g, 17, 10.5, 3, 3, '#f4c542', { lw: 1, flat: true });
    g.fillStyle = 'rgba(255,252,235,0.9)';
    g.beginPath(); g.arc(16, 9.5, 0.9, 0, TAU); g.fill();
    // little head tucked at the front
    blob(g, 17, 24.5, 4.6, 3.6, '#5a3a24', { lw: 1.6, mid: 'rgba(30,18,8,0.16)', shade: 'rgba(30,18,8,0.24)' });
    demonEye(g, eyes, 14.6, 24, 1.7, '#3a2413');
    demonEye(g, eyes, 19.4, 24, 1.7, '#3a2413');
    g.strokeStyle = '#2c1c0e'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(15.4, 27.6); g.lineTo(16.4, 29.2); g.stroke();
    g.beginPath(); g.moveTo(18.6, 27.6); g.lineTo(17.6, 29.2); g.stroke();
  });

  P.pineconepuffer = () => mk(40, 46, (g, eyes) => {
    // stubby feet first
    apoly(g, [[10, 40, 2], [17, 40, 2], [18, 45, 1.5], [9, 45, 1.5]], '#8a6138', { lw: 1.4 });
    apoly(g, [[23, 40, 2], [30, 40, 2], [31, 45, 1.5], [22, 45, 1.5]], '#8a6138', { lw: 1.4 });
    g.strokeStyle = 'rgba(60,36,16,0.6)'; g.lineWidth = 1; g.lineCap = 'round';
    [12, 14.8, 25.2, 28].forEach(tx => { g.beginPath(); g.moveTo(tx, 42); g.lineTo(tx, 44.4); g.stroke(); });
    // cone body: dark base egg, then downward scale rows bottom to top
    apoly(g, [[13, 8, 5], [27, 8, 5], [33, 25, 6], [28, 41, 4], [12, 41, 4], [7, 25, 6]], '#4a2c12', { mid: 'rgba(20,10,4,0.18)', shade: 'rgba(20,10,4,0.28)' });
    furRow(g, 11, 40, 29, 40, 5, 6.6, 8, Math.PI, ['#8a5a34', '#6e4526'], { line: OUT, lw: 1, hi: 'rgba(240,200,150,0.35)' });
    furRow(g, 9.5, 33, 30.5, 33, 5, 6.8, 8.4, Math.PI, ['#6e4526', '#8a5a34'], { line: OUT, lw: 1 });
    furRow(g, 10, 26, 30, 26, 4, 6.6, 8, Math.PI, ['#8a5a34', '#5f3a1e'], { line: OUT, lw: 1, hi: 'rgba(240,200,150,0.35)' });
    furRow(g, 12, 19, 28, 19, 4, 6, 7.4, Math.PI, ['#6e4526', '#8a5a34'], { line: OUT, lw: 1 });
    furRow(g, 14.5, 13, 25.5, 13, 3, 5.6, 6.8, Math.PI, ['#8a5a34', '#6e4526'], { line: OUT, lw: 1, hi: 'rgba(240,200,150,0.3)' });
    // one eye peeking from between the scales
    blob(g, 25, 22, 3.6, 2.8, '#2c1a0c', { flat: true, noline: true });
    demonEye(g, eyes, 25, 21.5, 2.6, '#4a3018');
    clump(g, 27.5, 26.5, 5.4, 6.6, Math.PI - 0.25, '#6e4526', { line: OUT, lw: 1 });
    // the accent: a live green sprout on top
    g.strokeStyle = '#4a7c3a'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(20, 9); g.quadraticCurveTo(19.5, 5, 20.5, 2); g.stroke();
    clump(g, 18.5, 4, 3.2, 4.6, -0.85, '#7ea34c', { line: OUT, lw: 0.9, hi: 'rgba(220,255,170,0.5)' });
    clump(g, 22.5, 3.6, 3, 4.2, 0.85, '#5f8c3a', { line: OUT, lw: 0.9 });
  });

  P.chipchoir = () => mk(44, 40, (g, eyes) => {
    // flat little tail up behind
    apoly(g, [[32, 30, 3], [39, 19, 3], [42, 25, 2], [39, 34, 2], [32, 36, 2]], '#c06026', { rim: RIM_WARM });
    g.strokeStyle = '#4a2c12'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(35, 31); g.quadraticCurveTo(38.5, 27, 39.5, 22.5); g.stroke();
    // small body with flank stripes
    apoly(g, [[14, 24, 5], [30, 24, 5], [33, 32, 4], [28, 38, 3], [16, 38, 3], [11, 32, 4]], '#c06026', { rim: RIM_WARM, mid: 'rgba(70,28,8,0.14)', shade: 'rgba(70,28,8,0.24)' });
    blob(g, 22, 33, 5.4, 4, '#e8cfa5', { flat: true, noline: true });
    g.lineCap = 'round';
    g.strokeStyle = '#4a2c12'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(13.5, 27); g.quadraticCurveTo(12.5, 32, 14.5, 36.5); g.stroke();
    g.beginPath(); g.moveTo(30.5, 27); g.quadraticCurveTo(31.5, 32, 29.5, 36.5); g.stroke();
    g.strokeStyle = '#e8cfa5'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(15.5, 27); g.quadraticCurveTo(14.6, 32, 16.4, 36); g.stroke();
    g.beginPath(); g.moveTo(28.5, 27); g.quadraticCurveTo(29.4, 32, 27.6, 36); g.stroke();
    // ears with the pink accent
    apoly(g, [[12, 2.5, 1.5], [18, 8.5, 2], [10.5, 9.5, 2]], '#cc6d2c');
    apoly(g, [[32, 2.5, 1.5], [26, 8.5, 2], [33.5, 9.5, 2]], '#cc6d2c');
    apoly(g, [[12.6, 4.6, 0.8], [16.4, 8.2, 1], [11.8, 8.8, 1]], PINK, { flat: true, noline: true });
    apoly(g, [[31.4, 4.6, 0.8], [27.6, 8.2, 1], [32.2, 8.8, 1]], PINK, { flat: true, noline: true });
    // big head over the body
    apoly(g, [[12, 6, 6], [32, 6, 6], [36, 14, 5], [30, 24, 4], [14, 24, 4], [8, 14, 5]], '#cc6d2c', { rim: RIM_WARM, mid: 'rgba(70,28,8,0.12)', shade: 'rgba(70,28,8,0.2)' });
    blob(g, 22, 9.5, 7, 2.6, 'rgba(255,236,200,0.25)', { flat: true, noline: true });
    // chipmunk face stripes through the eye line
    g.strokeStyle = '#4a2c12'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(10.5, 13); g.lineTo(15.4, 13); g.moveTo(28.6, 13); g.lineTo(33.5, 13); g.stroke();
    g.strokeStyle = '#e8cfa5'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(10.5, 10.8); g.lineTo(15, 10.8); g.moveTo(29, 10.8); g.lineTo(33.5, 10.8); g.stroke();
    // stuffed cheek pouches bulging out of the head silhouette
    blob(g, 11.5, 19, 5, 4.6, '#e8cfa5', { lw: 1.2, line: 'rgba(120,70,30,0.6)', mid: 'rgba(120,70,30,0.1)', shade: 'rgba(120,70,30,0.16)' });
    blob(g, 32.5, 19, 5, 4.6, '#e8cfa5', { lw: 1.2, line: 'rgba(120,70,30,0.6)', mid: 'rgba(120,70,30,0.1)', shade: 'rgba(120,70,30,0.16)' });
    blob(g, 10, 17.5, 1.8, 1.3, 'rgba(255,255,255,0.5)', { flat: true, noline: true });
    blob(g, 31, 17.5, 1.8, 1.3, 'rgba(255,255,255,0.5)', { flat: true, noline: true });
    demonEye(g, eyes, 18, 13, 2.6, '#7c3a13');
    demonEye(g, eyes, 26, 13, 2.6, '#7c3a13');
    // tiny pink nose and a little round singing mouth
    apoly(g, [[21, 16.4, 0.7], [23, 16.4, 0.7], [22, 17.8, 0.7]], '#e8a0a0', { flat: true, noline: true });
    blob(g, 22, 20.5, 1.8, 2.3, '#3a1408', { flat: true, lw: 0.8 });
    g.fillStyle = '#fffdf6';
    g.fillRect(21.2, 18.9, 1.6, 1.3);
    // paws at the sides, then the Token
    apoly(g, [[14.5, 29, 1.5], [19.5, 29, 1.5], [20, 33.4, 1.2], [14, 33.4, 1.2]], '#9c4a1c', { lw: 1.2 });
    apoly(g, [[24.5, 29, 1.5], [29.5, 29, 1.5], [30, 33.4, 1.2], [24, 33.4, 1.2]], '#9c4a1c', { lw: 1.2 });
    pendant(g, 22, 27, 2.4);
  });

  P.bogfrog = () => mk(52, 40, (g, eyes) => {
    // folded haunches with webbed toes
    for (const s of [-1, 1]) {
      const hx = 26 + s * 20;
      apoly(g, [[hx - s * 3, 22, 4], [hx + s * 6, 18, 4], [hx + s * 9, 30, 3], [hx + s * 3, 36, 3], [hx - s * 4, 30, 3]], '#42522f', { mid: 'rgba(20,28,12,0.16)', shade: 'rgba(20,28,12,0.26)' });
      g.strokeStyle = '#33402a'; g.lineWidth = 1.8; g.lineCap = 'round';
      [[0, 0], [3, 1], [6, 0]].forEach(t => {
        g.beginPath(); g.moveTo(hx + s * 3, 35); g.lineTo(hx + s * (t[0] - 2), 38.6 - t[1]); g.stroke();
      });
    }
    // wide low body
    apoly(g, [[8, 14, 7], [44, 14, 7], [49, 26, 5], [42, 36, 4], [10, 36, 4], [3, 26, 5]], '#4a5c3a', { rim: RIM_GREEN, mid: 'rgba(20,28,12,0.14)', shade: 'rgba(20,28,12,0.24)' });
    g.fillStyle = 'rgba(30,40,20,0.5)';
    [[14, 18], [36, 17], [42, 24], [10, 24], [30, 21]].forEach(d => {
      g.beginPath(); g.ellipse(d[0], d[1], 1.9, 1.3, 0.3, 0, TAU); g.fill();
    });
    // top mounted eye turrets breaking the upper silhouette
    blob(g, 15, 11.5, 6, 5, '#4a5c3a', { lw: LW_SIL, mid: 'rgba(20,28,12,0.12)', shade: 'rgba(20,28,12,0.2)' });
    blob(g, 37, 11.5, 6, 5, '#4a5c3a', { lw: LW_SIL, mid: 'rgba(20,28,12,0.12)', shade: 'rgba(20,28,12,0.2)' });
    demonEye(g, eyes, 15, 10, 3, '#33402a');
    demonEye(g, eyes, 37, 10, 3, '#33402a');
    // the wide mouth and nostrils
    g.strokeStyle = '#22301a'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(9, 21); g.quadraticCurveTo(26, 26, 43, 21); g.stroke();
    g.fillStyle = '#22301a';
    g.beginPath(); g.arc(23.5, 16.5, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.arc(28.5, 16.5, 0.7, 0, TAU); g.fill();
    // inflatable throat sac: a pale under layer with a hot translucent core
    blob(g, 26, 31.5, 13, 7, '#d8cba0', { lw: 1.2, line: 'rgba(40,44,22,0.55)' });
    blob(g, 26, 30.5, 7, 4, 'rgba(255,178,168,0.55)', { flat: true, noline: true });
    g.strokeStyle = 'rgba(120,110,70,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.arc(26, 29, 9.5, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    // front feet under the sac edge
    g.strokeStyle = '#33402a'; g.lineWidth = 1.8;
    [[17, 37.5], [35, 37.5]].forEach(f => {
      [-3, 0, 3].forEach(o => {
        g.beginPath(); g.moveTo(f[0], f[1] - 1.5); g.lineTo(f[0] + o, f[1] + 1.8); g.stroke();
      });
    });
  });

  P.stiltheron = () => mk(50, 110, (g, eyes) => {
    // absurd stilt legs, backward knees, long toes
    g.lineCap = 'round';
    const leg = (hx, hy, kx, ky, fx, fy) => {
      g.strokeStyle = OUT; g.lineWidth = 4;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
      g.strokeStyle = '#5a5c4a'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
      g.strokeStyle = 'rgba(20,18,12,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(kx - 1.4, ky); g.lineTo(kx + 1.4, ky); g.stroke();
      g.strokeStyle = '#4a4c3c'; g.lineWidth = 1.6;
      [[-5, 2], [0, 3], [4, 2]].forEach(t => {
        g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + t[0], fy + t[1]); g.stroke();
      });
    };
    leg(23, 60, 27, 82, 19, 103);
    leg(29, 62, 34, 84, 33, 105);
    // tail wisp, then the compact body with a folded wing plane
    clump(g, 12, 58, 4.4, 7, -2.3, '#6e7a88', { line: OUT, lw: 1.2 });
    apoly(g, [[14, 44, 6], [34, 42, 6], [40, 52, 5], [34, 64, 5], [18, 64, 5], [10, 54, 5]], '#8a95a3', { rim: RIM_COOL, mid: 'rgba(30,36,44,0.13)', shade: 'rgba(30,36,44,0.22)' });
    apoly(g, [[22, 46, 4], [35, 45, 4], [38, 53, 4], [32, 62, 3], [24, 60, 4]], '#6e7a88', { lw: LW_INT, line: 'rgba(30,36,44,0.55)' });
    furRow(g, 27, 58, 35, 51, 3, 3.4, 4.4, 2.5, ['#5e6a78', '#6e7a88'], { line: OUT, lw: 1 });
    furRow(g, 15, 52, 20, 60, 3, 3.4, 4, -0.4, ['#d8d4ca', '#c4c0b4'], { hi: 'rgba(255,255,255,0.4)' });
    // the S neck, one continuous stroke
    const neck = () => {
      g.beginPath(); g.moveTo(19, 50);
      g.quadraticCurveTo(4, 40, 13, 27);
      g.quadraticCurveTo(20, 17, 27, 13);
    };
    g.strokeStyle = OUT; g.lineWidth = 8; neck(); g.stroke();
    g.strokeStyle = '#98a4b2'; g.lineWidth = 6; neck(); g.stroke();
    g.strokeStyle = 'rgba(240,244,248,0.35)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(16, 46); g.quadraticCurveTo(7, 39, 14, 28); g.stroke();
    // head, black crest, dagger beak in gold
    blob(g, 30, 11, 6.5, 5.5, '#98a4b2', { lw: LW_SIL, mid: 'rgba(30,36,44,0.12)', shade: 'rgba(30,36,44,0.2)' });
    clump(g, 25, 7, 3, 6.4, -2, '#2c3038', { line: OUT, lw: 1 });
    clump(g, 27, 5.4, 2.6, 5.6, -1.75, '#3a4048', { line: OUT, lw: 1 });
    poly(g, [[34, 8.6], [49, 12.6], [34, 14.6]], '#e0a83c', { lw: 1.2 });
    g.strokeStyle = 'rgba(255,236,170,0.8)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(35, 11.4); g.lineTo(46, 12.4); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(47.2, 12.4, 0.6, 0, TAU); g.fill();
    demonEye(g, eyes, 27.5, 10, 2.4, '#5c6878');
    demonEye(g, eyes, 33, 10.6, 2, '#5c6878');
  });

  P.sapperrat = () => mk(44, 34, (g, eyes) => {
    // tail snaking on the surface behind
    g.strokeStyle = OUT; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(33, 23); g.quadraticCurveTo(40, 19, 43, 22); g.stroke();
    g.strokeStyle = '#4a2e1a'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(33, 23); g.quadraticCurveTo(40, 19, 43, 22); g.stroke();
    // wet slicked body hump with spiked fur breaks along the back
    apoly(g, [[8, 18, 5], [20, 11, 6], [32, 15, 5], [37, 24, 4], [8, 27, 4]], '#5a3a24', { mid: 'rgba(24,12,6,0.16)', shade: 'rgba(24,12,6,0.26)', hi: 'rgba(210,230,240,0.22)' });
    clump(g, 16, 11.5, 3.4, 4.6, -0.5, '#4a2e1a', { line: OUT, lw: 1 });
    clump(g, 22, 11, 3.4, 4.8, -0.15, '#54341e', { line: OUT, lw: 1 });
    clump(g, 28, 13, 3.2, 4.2, 0.25, '#4a2e1a', { line: OUT, lw: 1 });
    // head, wet brow shine, round ears
    blob(g, 10, 7.5, 2.6, 2.6, '#4a2e1a', { lw: 1.4 });
    blob(g, 19, 6, 2.6, 2.6, '#4a2e1a', { lw: 1.4 });
    blob(g, 10.6, 7.8, 1.1, 1.1, 'rgba(24,10,4,0.5)', { flat: true, noline: true });
    blob(g, 19.4, 6.4, 1.1, 1.1, 'rgba(24,10,4,0.5)', { flat: true, noline: true });
    apoly(g, [[6, 9, 4], [20, 7, 5], [26, 13, 4], [23, 21, 4], [8, 22, 4], [2, 15, 4]], '#654328', { mid: 'rgba(30,16,6,0.14)', shade: 'rgba(30,16,6,0.22)', hi: 'rgba(210,230,240,0.25)' });
    blob(g, 13, 10.5, 4.4, 1.8, 'rgba(220,238,248,0.3)', { flat: true, noline: true, rot: -0.15 });
    demonEye(g, eyes, 11, 14, 2.4, '#3f2917');
    demonEye(g, eyes, 19, 14, 2.4, '#3f2917');
    // wet nose, whiskers, little incisors
    blob(g, 5.4, 18, 1.7, 1.4, '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(5, 17.5, 0.6, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,205,210,0.5)'; g.lineWidth = 0.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(6, 19); g.lineTo(1, 18); g.moveTo(6.5, 20); g.lineTo(1.5, 21); g.stroke();
    g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 0.6;
    g.fillRect(6.5, 20.2, 1.5, 2.2); g.strokeRect(6.5, 20.2, 1.5, 2.2);
    // the accent: a pondweed strand draped over head and back
    g.strokeStyle = '#4a8c3a'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(9, 6); g.quadraticCurveTo(17, 9, 24, 8); g.quadraticCurveTo(29, 8, 31, 12); g.stroke();
    clump(g, 24, 8.5, 2.8, 4, 1.9, '#5fa348', { line: OUT, lw: 0.8 });
    clump(g, 30, 11.5, 2.6, 3.6, 2.4, '#4a8c3a', { line: OUT, lw: 0.8 });
    // the waterline: dark bog water across the base, ripples, glints
    apoly(g, [[0, 25, 2], [44, 25, 2], [44, 34, 0], [0, 34, 0]], '#20342c', { flat: true, noline: true });
    g.strokeStyle = 'rgba(126,200,232,0.4)'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 25.5); g.quadraticCurveTo(8, 24.2, 14, 25.5);
    g.quadraticCurveTo(22, 26.8, 30, 25.3); g.quadraticCurveTo(37, 24.4, 44, 25.6); g.stroke();
    g.strokeStyle = 'rgba(126,200,232,0.28)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(20, 27.5, 14, 2, 0, 0.15, Math.PI - 0.3); g.stroke();
    g.beginPath(); g.ellipse(21, 30, 18, 2.6, 0, 0.3, Math.PI - 0.5); g.stroke();
    g.fillStyle = 'rgba(190,230,248,0.4)';
    [[7, 28], [34, 28.5], [26, 31.5]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.8, 0, TAU); g.fill();
    });
  });

  P.ashelk = () => mk(80, 90, (g, eyes) => {
    // blackened branch antlers with ember tips
    g.lineCap = 'round';
    const char = (x0, y0, x1, y1, x2, y2, w, ember) => {
      g.strokeStyle = OUT; g.lineWidth = w + 1.8;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
      g.strokeStyle = '#241a12'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
      if (ember) {
        g.fillStyle = 'rgba(255,74,32,0.35)';
        g.beginPath(); g.arc(x2, y2, 2.6, 0, TAU); g.fill();
        g.fillStyle = '#ff8c28';
        g.beginPath(); g.arc(x2, y2, 1.1, 0, TAU); g.fill();
      }
    };
    char(31, 20, 18, 12, 10, 3, 3, true);
    char(24, 13, 15, 12, 8, 16, 2.4, true);
    char(20, 8, 20, 3, 25, 1, 2, true);
    char(49, 20, 62, 12, 70, 3, 3, true);
    char(56, 13, 65, 12, 72, 16, 2.4, true);
    char(60, 8, 60, 3, 55, 1, 2, true);
    // ears, segmented legs with charred lower halves
    blob(g, 27, 16, 3.6, 5, '#6e6e6c', { rot: -0.5, lw: 1.6 });
    blob(g, 53, 16, 3.6, 5, '#6e6e6c', { rot: 0.5, lw: 1.6 });
    [[26, 62, 24, 87], [54, 62, 56, 87], [33, 65, 32, 88], [47, 65, 48, 88]].forEach(l => {
      const kx = (l[0] + l[2]) / 2 + 1.4, ky = (l[1] + l[3]) / 2;
      g.strokeStyle = OUT; g.lineWidth = 5.4;
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(kx, ky); g.lineTo(l[2], l[3]); g.stroke();
      g.strokeStyle = '#6e6e6c'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(kx, ky); g.stroke();
      g.strokeStyle = '#3a3a38'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(l[2], l[3] - 1.8); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 4.4;
      g.beginPath(); g.moveTo(l[2], l[3] - 2.2); g.lineTo(l[2], l[3]); g.stroke();
    });
    // neck, then the humped shoulder body
    apoly(g, [[33, 26, 4], [47, 26, 4], [50, 40, 4], [30, 40, 4]], '#7c7c7a', { flat: true, noline: true });
    apoly(g, [[16, 40, 7], [30, 30, 8], [46, 32, 8], [62, 40, 6], [66, 54, 5], [56, 66, 5], [24, 66, 5], [12, 54, 6]], '#8a8a88', { rim: RIM_COOL, mid: 'rgba(30,30,30,0.14)', shade: 'rgba(30,30,30,0.24)' });
    furRow(g, 24, 42, 56, 42, 6, 4, 4.6, 0, ['#9a9a98', '#8a8a88'], { hi: 'rgba(230,230,225,0.35)' });
    // ash flecks drifting on the back
    g.fillStyle = 'rgba(222,222,216,0.55)';
    [[26, 36], [42, 34], [56, 44], [34, 47]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.9, 0, TAU); g.fill();
    });
    // the accent: glowing ember seam cracks across shoulder and haunch
    const crack = pts => {
      g.strokeStyle = 'rgba(255,74,32,0.35)'; g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
      g.strokeStyle = '#ff4a20'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    };
    crack([[24, 48], [30, 54], [28, 61]]);
    crack([[48, 42], [54, 48], [52, 56], [57, 61]]);
    crack([[38, 56], [43, 60]]);
    g.fillStyle = '#ffdc8c';
    [[30, 54], [54, 48], [52, 56]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.7, 0, TAU); g.fill();
    });
    // head with a charred muzzle and chin beard
    apoly(g, [[30, 12, 5], [50, 12, 5], [53, 21, 4], [47, 30, 4], [33, 30, 4], [27, 21, 4]], '#8a8a88', { rim: RIM_COOL, mid: 'rgba(30,30,30,0.12)', shade: 'rgba(30,30,30,0.2)' });
    blob(g, 36, 14.5, 3.4, 1.8, 'rgba(240,240,235,0.3)', { flat: true, noline: true });
    apoly(g, [[34, 24.5, 3], [46, 24.5, 3], [44.5, 32.5, 3], [35.5, 32.5, 3]], '#4a4644', { lw: LW_INT });
    g.fillStyle = '#221e1c';
    g.beginPath(); g.ellipse(37.6, 28.6, 1.1, 1.6, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(42.4, 28.6, 1.1, 1.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.beginPath(); g.arc(37.2, 27.8, 0.5, 0, TAU); g.fill();
    clump(g, 40, 33.5, 3.4, 4.4, Math.PI, '#5c5c5a', { line: OUT, lw: 1 });
    demonEye(g, eyes, 34.5, 18.5, 3, '#5c5c5a');
    demonEye(g, eyes, 45.5, 18.5, 3, '#5c5c5a');
  });

  P.cindercrow = () => mk(48, 34, (g, eyes) => {
    // half spread wings dipping down and out: the W silhouette
    for (const s of [-1, 1]) {
      g.save(); g.translate(23, 0); g.scale(s, 1);
      const wingPts = [[-2, 12, 3], [-14, 18, 2.5], [-20, 27, 1.5], [-14.5, 24, 1.5], [-15, 31, 1.5], [-9.5, 26.5, 1.5], [-8.5, 32, 1.5], [-4, 26, 2], [-1, 18, 3]];
      apoly(g, wingPts, '#26242a', { mid: 'rgba(8,8,12,0.2)', shade: 'rgba(8,8,12,0.3)', hi: 'rgba(130,140,165,0.14)' });
      g.strokeStyle = 'rgba(130,140,160,0.3)'; g.lineWidth = 0.9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-4, 15); g.lineTo(-16, 24); g.stroke();
      g.beginPath(); g.moveTo(-3, 18); g.lineTo(-11, 27); g.stroke();
      g.restore();
    }
    // tail fan behind the body
    apoly(g, [[19, 24, 2], [27, 24, 2], [30, 32, 1.5], [25.5, 30, 1.5], [23, 33, 1.5], [20.5, 30, 1.5], [16, 32, 1.5]], '#1e1c22', { flat: true, lw: 1.4 });
    // body with the ember throat glow
    g.fillStyle = 'rgba(255,74,32,0.28)';
    g.beginPath(); g.ellipse(23, 17, 6.5, 7, 0, 0, TAU); g.fill();
    apoly(g, [[17, 9, 5], [29, 9, 5], [32, 19, 4], [26, 27, 3], [20, 27, 3], [14, 19, 4]], '#2c2a30', { rim: RIM_COOL, mid: 'rgba(8,8,12,0.18)', shade: 'rgba(8,8,12,0.28)' });
    blob(g, 23, 17.5, 4.2, 5, '#3a1408', { flat: true, noline: true });
    g.strokeStyle = '#ff8c28'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(21, 14); g.lineTo(23, 17.5); g.lineTo(22, 21); g.stroke();
    g.beginPath(); g.moveTo(25.5, 15); g.lineTo(24.5, 19.5); g.stroke();
    g.fillStyle = '#ffdc8c';
    g.beginPath(); g.arc(23, 17.5, 0.8, 0, TAU); g.fill();
    // charcoal head with a faint cool sheen
    blob(g, 22, 8, 6, 5.5, '#26242a', { lw: LW_SIL, mid: 'rgba(8,8,12,0.16)', shade: 'rgba(8,8,12,0.26)' });
    g.strokeStyle = 'rgba(152,196,246,0.22)'; g.lineWidth = 1.4; g.lineCap = 'round';
    g.beginPath(); g.arc(22, 8, 4.2, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    // beak with an ember seam
    poly(g, [[27, 5.6], [38, 8.4], [27, 10.8]], '#1a181e', { lw: 1.1 });
    g.strokeStyle = '#ff8c28'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(29, 8.3); g.lineTo(35, 8.4); g.stroke();
    demonEye(g, eyes, 18.5, 7, 2.2, '#3a3742');
    demonEye(g, eyes, 24.5, 6.6, 2.2, '#3a3742');
    // tucked feet
    g.strokeStyle = '#1a181e'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(20, 27.5); g.lineTo(19, 30.5); g.stroke();
    g.beginPath(); g.moveTo(26, 27.5); g.lineTo(27, 30.5); g.stroke();
  });

  P.quarrybadger = () => mk(60, 44, (g, eyes) => {
    // tail stub behind
    clump(g, 53, 26, 5, 6.6, 1.9, '#5c584f', { line: OUT, lw: 1.3 });
    // long low body
    apoly(g, [[8, 20, 6], [24, 13, 7], [44, 15, 6], [54, 23, 5], [55, 33, 4], [46, 40, 4], [12, 40, 4], [4, 30, 5]], '#6e6a62', { rim: RIM_COOL, mid: 'rgba(28,26,22,0.14)', shade: 'rgba(28,26,22,0.24)' });
    furRow(g, 18, 17, 46, 19, 5, 4.2, 4.8, -0.1, ['#7c7870', '#6e6a62'], null);
    // badger stripes surviving on the rear flank
    g.lineCap = 'round';
    g.strokeStyle = '#3a3630'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(40, 17); g.quadraticCurveTo(48, 22, 51, 30); g.stroke();
    g.strokeStyle = '#d8d4ca'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(45, 16.5); g.quadraticCurveTo(52, 21, 54, 28); g.stroke();
    // stub legs, long bone digger claws on the front pair
    [[14, 37], [26, 38], [38, 38], [48, 37]].forEach((f, i) => {
      apoly(g, [[f[0] - 3.2, f[1], 1.2], [f[0] + 3.2, f[1], 1.2], [f[0] + 2.6, f[1] + 5, 1], [f[0] - 2.6, f[1] + 5, 1]], '#33302c', { flat: true, lw: 1.2 });
      if (i < 2) {
        claw(g, f[0] - 2, f[1] + 5, 0.15, 3.6, BONE);
        claw(g, f[0], f[1] + 5.4, 0, 4, BONE);
        claw(g, f[0] + 2, f[1] + 5, -0.15, 3.6, BONE);
      }
    });
    // tiny ears above the plate line
    blob(g, 20, 11.5, 2.4, 2.6, '#5c584f', { lw: 1.3 });
    blob(g, 38, 11.5, 2.4, 2.6, '#5c584f', { lw: 1.3 });
    // head mass, then the riveted tin face plate strapped over it
    apoly(g, [[16, 14, 5], [42, 14, 5], [45, 26, 4], [38, 37, 4], [22, 37, 4], [13, 26, 4]], '#7c786e', { mid: 'rgba(28,26,22,0.12)', shade: 'rgba(28,26,22,0.2)' });
    g.strokeStyle = '#3a2513'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(21, 15); g.quadraticCurveTo(29, 11, 37, 15); g.stroke();
    apoly(g, [[19, 16, 3], [39, 16, 3], [42, 26, 2], [35, 35, 2], [23, 35, 2], [16, 26, 2]], '#9aa0a8', { lw: 1.9, mid: 'rgba(30,34,40,0.14)', shade: 'rgba(30,34,40,0.22)', hi: 'rgba(255,255,255,0.16)' });
    g.strokeStyle = 'rgba(40,44,50,0.6)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(29, 17); g.lineTo(29, 22); g.moveTo(29, 29); g.lineTo(29, 34); g.stroke();
    g.beginPath(); g.moveTo(22, 31); g.lineTo(26, 33.5); g.stroke();
    // the eye slot: one demon eye burning through, the other side empty
    apoly(g, [[21, 23.4, 1.2], [37, 23.4, 1.2], [37, 27.6, 1.2], [21, 27.6, 1.2]], '#14100c', { flat: true, lw: 1.1 });
    demonEye(g, eyes, 25.5, 25.5, 2.6, '#0f0c0a');
    // brass rivets: the accent, six around the plate edge
    [[21, 18.5], [37, 18.5], [18.5, 26], [39.5, 26], [24, 33], [34, 33]].forEach(rv => {
      g.fillStyle = '#e3b341';
      g.beginPath(); g.arc(rv[0], rv[1], 1.1, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(90,60,10,0.7)'; g.lineWidth = 0.6; g.stroke();
      g.fillStyle = 'rgba(255,252,235,0.85)';
      g.beginPath(); g.arc(rv[0] - 0.35, rv[1] - 0.35, 0.35, 0, TAU); g.fill();
    });
    // tin snout wedge with nostril holes
    apoly(g, [[26.5, 32.5, 1.5], [31.5, 32.5, 1.5], [30.5, 37.5, 1.2], [27.5, 37.5, 1.2]], '#7e848c', { lw: 1.2 });
    g.fillStyle = '#14100c';
    g.beginPath(); g.arc(28, 35.5, 0.7, 0, TAU); g.fill();
    g.beginPath(); g.arc(30, 35.5, 0.7, 0, TAU); g.fill();
  });

  // The rescued squirrel: the restyled squirrel body, warm brown cute eyes,
  // no token anywhere. Pure comfort. Mirrors P.squirrel deliberately.
  P.critter_free = () => mk(56, 52, (g) => {
    const warmEye = (x, y, r) => {
      g.beginPath(); g.arc(x, y, r * 1.15, 0, TAU); g.fillStyle = '#6b4423'; g.fill();
      g.lineWidth = LW_INT; g.strokeStyle = OUT; g.stroke();
      g.beginPath(); g.arc(x + r * 0.1, y + r * 0.15, r * 0.62, 0, TAU); g.fillStyle = '#241a10'; g.fill();
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, r * 0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.92)'; g.fill();
      g.beginPath(); g.arc(x + r * 0.38, y + r * 0.42, r * 0.2, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fill();
      g.strokeStyle = 'rgba(255,236,205,0.55)'; g.lineWidth = Math.max(0.6, r * 0.2); g.lineCap = 'round';
      g.beginPath(); g.arc(x, y + r * 0.12, r * 1.14, Math.PI * 0.26, Math.PI * 0.74); g.stroke();
    };
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
    apoly(g, [[20, 28, 5], [31, 25, 6], [42, 29, 5], [46, 36, 4], [44, 44, 3], [36, 48, 3], [24, 48, 4], [17, 42, 4], [16, 33, 4]], FUR, { rim: RIM_WARM });
    apoly(g, [[21, 32, 5], [29, 30, 5], [33.5, 38, 5], [29.5, 46, 4], [21, 46, 4], [16.5, 39, 5]], '#ad5120', { lw: LW_INT, line: 'rgba(24,10,4,0.55)' });
    clump(g, 24, 31.5, 4, 4.5, -0.5, '#c06026', { hi: 'rgba(255,214,160,0.4)' });
    clump(g, 28.5, 30.5, 4, 4.5, -0.2, '#cc6d2c', null);
    blob(g, 35, 36.5, 7, 2.4, 'rgba(60,24,8,0.22)', { flat: true, noline: true });
    blob(g, 34.5, 41, 6.5, 5, '#e8cfa5', { flat: true, noline: true });
    blob(g, 32.5, 39, 3.4, 2.2, 'rgba(255,250,232,0.5)', { flat: true, noline: true });
    apoly(g, [[27.5, 2.5, 1.5], [33, 11, 2], [24.5, 11.5, 2]], FUR);
    apoly(g, [[45, 2.5, 1.5], [40, 11, 2], [48.5, 11.5, 2]], FUR);
    apoly(g, [[28, 4.8, 0.8], [31.4, 10, 1], [26.4, 10.2, 1]], PINK, { flat: true, noline: true });
    apoly(g, [[44.6, 4.8, 0.8], [41.6, 10, 1], [46.6, 10.2, 1]], PINK, { flat: true, noline: true });
    blob(g, 28.8, 6.8, 1, 1.6, 'rgba(255,186,176,0.75)', { flat: true, noline: true, rot: 0.2 });
    blob(g, 44.2, 6.8, 1, 1.6, 'rgba(255,186,176,0.75)', { flat: true, noline: true, rot: -0.2 });
    clump(g, 25, 21, 4.4, 5, -1.9, FUR_L, { line: OUT, lw: 1.4 });
    clump(g, 25.5, 24.5, 4, 4.4, -2.2, '#c06026', { line: OUT, lw: 1.4 });
    apoly(g, [[26, 9, 6], [38, 7.5, 5], [46, 12, 4], [48.5, 19, 3.5], [44, 26, 3], [34, 29, 4], [26.5, 26.5, 4], [23.5, 17, 5]], FUR_L, { rim: RIM_WARM });
    blob(g, 36, 12.5, 8, 3.6, 'rgba(255,236,200,0.2)', { flat: true, noline: true });
    blob(g, 31, 24, 5.5, 3.4, 'rgba(90,40,14,0.14)', { flat: true, noline: true });
    blob(g, 42, 23.5, 5, 3.6, '#e8cfa5', { flat: true, noline: true });
    g.strokeStyle = '#8a5a3c'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(43, 24.8); g.quadraticCurveTo(44.6, 26, 46, 24.9); g.stroke();
    apoly(g, [[44.6, 20.6, 0.9], [47.6, 21.8, 0.9], [45.2, 23.4, 0.9]], '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(45.4, 21.5, 0.55, 0, TAU); g.fill();
    g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 0.6;
    g.fillRect(43.4, 25.6, 1.9, 2.3); g.strokeRect(43.4, 25.6, 1.9, 2.3);
    warmEye(32, 16.5, 3);
    warmEye(41.5, 16.5, 3);
    apoly(g, [[24, 42.5, 2], [30.5, 42.5, 2], [31.5, 47.5, 1.5], [23, 47.5, 1.5]], '#9c4a1c', { lw: 1.4 });
    apoly(g, [[34.5, 42, 2], [41, 42, 2], [42, 47, 1.5], [33.5, 47, 1.5]], '#9c4a1c', { lw: 1.4 });
    claw(g, 25.6, 47, 0.15, 2.6, BONE); claw(g, 28.6, 47.3, 0, 2.6, BONE);
    claw(g, 36.2, 46.5, 0.15, 2.6, BONE); claw(g, 39.2, 46.8, 0, 2.6, BONE);
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

  // ---------------- the thorn gate ----------------
  // A room exit is not a carpentered door standing in a treeline gap: it is
  // the wood itself, woven shut with bramble, hauled back to the sides once
  // the room is beaten. Both states are painted twice from the same code with
  // the same deterministic stream: once as themselves, once as the corrupted
  // overlay (gate_shut_mark, gate_open_mark), so the Mark red lands on exactly
  // the thorns, leaves and canes the base pass drew. P.door stays as the
  // legacy key: anything still asking for 'door' gets brambles.
  const GATE_W = 64, GATE_H = 84;
  const CANE_D = '#181006', CANE_M = '#2c1f0c';
  const CANE_HI = 'rgba(164,114,56,0.28)';
  const LEAF_BACK = ['#091308', '#0c180a', '#0f1d0b'];
  const LEAF_MID = ['#122010', '#162712', '#1a2e14'];
  const LEAF_FRONT = ['#1f3115', '#243617', '#2b4020'];
  const LEAF_LIT = '#33512a';
  const LEAF_HI = 'rgba(206,242,140,0.34)';
  const THORN_L = '#e8cfa5', THORN_D = '#8a6138';
  const GATE_MASS = {
    lw: LW_SIL, rim: RIM_GREEN,
    mid: 'rgba(6,10,4,0.15)', shade: 'rgba(6,10,4,0.3)',
    bounce: 'rgba(255,166,92,0.08)', hi: 'rgba(214,255,150,0.15)',
  };

  // One deterministic stream per painter, so a leaf field can be dense
  // without a table of a hundred positions, and so the corrupted pass walks
  // the same leaves in the same order.
  function gRng(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Point and tangent on a cane: [x0, y0, cx, cy, x1, y1].
  function qAt(c, t) {
    const u = 1 - t;
    return {
      x: u * u * c[0] + 2 * u * t * c[2] + t * t * c[4],
      y: u * u * c[1] + 2 * u * t * c[3] + t * t * c[5],
      a: Math.atan2(2 * (u * (c[3] - c[1]) + t * (c[5] - c[3])),
        2 * (u * (c[2] - c[0]) + t * (c[4] - c[2]))),
    };
  }

  // A length of cane, built as a tapered ribbon rather than a stroke, so it
  // thins toward the tip and swells at its nodes the way a real whip does.
  // Sampling by t means a partial run can be redrawn over the cane that
  // crosses it: that overlap is what makes a weave read as woven.
  function cane(g, c, t0, t1, w0, col, o) {
    o = o || {};
    const N = 18;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * i / N;
      const p = qAt(c, t);
      const taper = 1 - 0.42 * t;
      const node = 1 + 0.16 * Math.cos(t * 17);
      pts.push([p.x, p.y, w0 * taper * node * 0.5, p.a]);
    }
    const ribbon = (pad) => {
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = pts[i], hw = p[2] + pad;
        const x = p[0] + Math.cos(p[3] - Math.PI / 2) * hw;
        const y = p[1] + Math.sin(p[3] - Math.PI / 2) * hw;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      for (let i = N; i >= 0; i--) {
        const p = pts[i], hw = p[2] + pad;
        g.lineTo(p[0] + Math.cos(p[3] + Math.PI / 2) * hw,
          p[1] + Math.sin(p[3] + Math.PI / 2) * hw);
      }
      g.closePath();
    };
    ribbon(o.back ? 0.45 : 0.85); g.fillStyle = OUT; g.fill();
    ribbon(0); g.fillStyle = col; g.fill();
    g.save(); ribbon(0); g.clip();
    // the underside darkens and the moonlit edge runs along the top
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const p = pts[i], sgn = Math.sin(p[3] + Math.PI / 2) > 0 ? 1 : -1;
      const x = p[0] + Math.cos(p[3] + sgn * Math.PI / 2) * p[2] * 0.55;
      const y = p[1] + Math.sin(p[3] + sgn * Math.PI / 2) * p[2] * 0.55;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokeStyle = 'rgba(6,3,1,0.45)'; g.lineWidth = w0 * 0.55; g.stroke();
    if (!o.back) {
      g.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = pts[i], sgn = Math.sin(p[3] - Math.PI / 2) < 0 ? -1 : 1;
        const x = p[0] + Math.cos(p[3] + sgn * Math.PI / 2) * p[2] * 0.5;
        const y = p[1] + Math.sin(p[3] + sgn * Math.PI / 2) * p[2] * 0.5;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokeStyle = CANE_HI; g.lineWidth = Math.max(0.4, w0 * 0.28); g.stroke();
    }
    g.restore();
  }

  // A thorn: a narrow spike standing off the cane and hooked back along it.
  // Lit ones carry the wet tip every sharp thing in this game wears.
  function thorn(g, c, t, side, len, col, lit) {
    const p = qAt(c, t);
    const nrm = p.a - side * Math.PI / 2;
    g.save();
    g.translate(p.x + Math.cos(nrm) * 0.4, p.y + Math.sin(nrm) * 0.4);
    g.rotate(nrm - Math.PI / 2 - side * 0.5);
    g.beginPath();
    g.moveTo(-len * 0.3, 0);
    g.quadraticCurveTo(-len * 0.05, len * 0.5, 0, len);
    g.quadraticCurveTo(len * 0.12, len * 0.5, len * 0.3, 0);
    g.closePath();
    g.fillStyle = col; g.fill();
    g.lineWidth = 0.55; g.strokeStyle = OUT; g.stroke();
    if (lit) {
      g.fillStyle = 'rgba(255,242,208,0.8)';
      g.beginPath(); g.arc(-len * 0.04, len * 0.6, len * 0.11, 0, TAU); g.fill();
    }
    g.restore();
  }

  // The corrupted pass: the point of a thorn gone Mark red, hot at the tip.
  function thornTip(g, c, t, side, len) {
    const p = qAt(c, t);
    const nrm = p.a - side * Math.PI / 2;
    g.save();
    g.translate(p.x + Math.cos(nrm) * 0.4, p.y + Math.sin(nrm) * 0.4);
    g.rotate(nrm - Math.PI / 2 - side * 0.5);
    g.beginPath();
    g.moveTo(-len * 0.16, len * 0.44);
    g.quadraticCurveTo(-len * 0.04, len * 0.76, 0, len);
    g.quadraticCurveTo(len * 0.07, len * 0.76, len * 0.16, len * 0.44);
    g.closePath();
    g.fillStyle = MARK; g.fill();
    g.fillStyle = 'rgba(255,74,32,0.5)';
    g.beginPath(); g.arc(0, len * 0.9, len * 0.3, 0, TAU); g.fill();
    g.restore();
  }

  // A bramble leaflet: the clump petal with a midrib and two veins.
  function gleaf(g, x, y, ang, w2, len, col, o) {
    o = o || {};
    if (o.drop) clump(g, x + 0.7, y + 0.9, w2, len, ang, 'rgba(4,8,3,0.4)', null);
    clump(g, x, y, w2, len, ang, col, { line: o.line, lw: o.lw || 0.8, hi: o.hi });
    if (!o.vein) return;
    g.save(); g.translate(x, y); g.rotate(ang);
    g.strokeStyle = o.vein; g.lineWidth = 0.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, len * 0.04); g.lineTo(0, -len * 0.82); g.stroke();
    g.beginPath(); g.moveTo(0, -len * 0.28); g.lineTo(-w2 * 0.4, -len * 0.5); g.stroke();
    g.beginPath(); g.moveTo(0, -len * 0.46); g.lineTo(w2 * 0.38, -len * 0.66); g.stroke();
    g.restore();
  }

  // Pale unripe berries in a knot of three, each with its wet dot.
  function gberry(g, x, y, s) {
    g.strokeStyle = '#3a2a14'; g.lineWidth = 0.7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y - s * 2.6); g.lineTo(x, y - s * 0.7); g.stroke();
    const one = (bx, by, br, col) => {
      blob(g, bx, by, br, br * 0.94, col, {
        lw: 0.75, mid: 'rgba(40,44,28,0.16)', shade: 'rgba(40,44,28,0.32)',
        hi: 'rgba(255,255,240,0.4)',
      });
      g.fillStyle = 'rgba(255,255,240,0.55)';
      g.beginPath(); g.arc(bx - br * 0.3, by - br * 0.34, br * 0.26, 0, TAU); g.fill();
    };
    one(x - s * 0.9, y + s * 0.28, s, '#9aa27e');
    one(x + s * 0.86, y + s * 0.48, s * 0.84, '#828a68');
    one(x, y - s * 0.5, s * 0.92, '#aeb490');
  }

  // A young tendril curling off a cane: the one soft line in a hostile plant.
  function gtendril(g, x, y, a, len, col) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = col; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.34, -len * 0.55, len * 0.1, -len);
    g.stroke();
    g.beginPath(); g.arc(len * 0.1 - 1.5, -len - 0.3, 1.6, -0.6, Math.PI * 1.35); g.stroke();
    g.restore();
  }

  // The Sign, scratched into a cane by something carrying an axe.
  function gscratch(g, c, t, s) {
    const p = qAt(c, t);
    g.save(); g.translate(p.x, p.y); g.rotate(p.a);
    g.strokeStyle = 'rgba(212,64,44,0.55)'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-s, -s * 0.55); g.lineTo(s, s * 0.55); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.75, s * 0.55); g.lineTo(s * 0.75, -s * 0.55); g.stroke();
    g.fillStyle = 'rgba(255,74,32,0.4)';
    g.beginPath(); g.arc(0, 0, 0.85, 0, TAU); g.fill();
    g.restore();
  }

  // The gap in the treeline both states are painted into.
  function gateGap(g) {
    g.beginPath();
    g.moveTo(4, 84);
    g.lineTo(4.4, 40);
    g.quadraticCurveTo(7, 14, 32, 9);
    g.quadraticCurveTo(57, 14, 59.6, 40);
    g.lineTo(60, 84);
    g.closePath();
  }

  // Inside the gap, inset from its edge: the test every leaf of the shut
  // weave has to pass.
  function gateInArch(x, y, inset) {
    if (y < 11 + inset || y > 85) return false;
    const hw = y >= 42 ? 27.6
      : 27.6 * Math.sqrt(Math.max(0, 1 - ((42 - y) / 33) * ((42 - y) / 33)));
    return Math.abs(x - 32) <= hw - inset;
  }

  // A tier of leaves on a jittered grid: the whole reason the weave looks
  // grown rather than placed. The callback does the drawing so the corrupted
  // pass can walk the identical field and paint only what it wants.
  function gateLeafField(rng, o, each) {
    for (let r = 0; r < o.ny; r++) {
      for (let ci = 0; ci < o.nx; ci++) {
        const x = o.x0 + (ci + 0.5) * ((o.x1 - o.x0) / o.nx) + (rng() - 0.5) * o.jx;
        const y = o.y0 + (r + 0.5) * ((o.y1 - o.y0) / o.ny) + (rng() - 0.5) * o.jy;
        const ang = (rng() - 0.5) * o.spread + (x - 32) * (o.fan || 0);
        const len = o.len * (0.76 + rng() * 0.46);
        const pick = rng();
        const hot = rng();
        if (!o.test(x, y)) continue;
        each(x, y, ang, len, pick, hot);
      }
    }
  }

  // Shut: canes 0 to 4 lie behind the leaf mass, 5 to 8 in front of it.
  const GATE_CANES = [
    [1, 79, 15, 41, 45, 12],
    [63, 81, 49, 43, 19, 11],
    [0, 57, 21, 29, 57, 23],
    [64, 61, 43, 27, 7, 21],
    [10, 84, 30, 56, 52, 18],
    [3, 84, 25, 63, 60, 45],
    [61, 84, 37, 59, 4, 43],
    [29, 84, 38, 48, 24, 12],
    [54, 84, 44, 50, 12, 30],
    [5, 47, 30, 21, 59, 35],
    [59, 53, 34, 17, 7, 31],
  ];
  const GATE_TH = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84];
  function gateThorns(front, fn) {
    for (let ci = 0; ci < GATE_CANES.length; ci++) {
      if ((ci >= 5) !== front) continue;
      for (let i = 0; i < GATE_TH.length; i++) {
        fn(GATE_CANES[ci], GATE_TH[i], i % 2 ? 1 : -1, ci, i);
      }
    }
  }

  function gateShut(g, mark) {
    const rng = gRng(0x51ed2701);
    if (!mark) {
      // the wood behind the weave: what little of it you are allowed to see
      gateGap(g); g.fillStyle = '#080e06'; g.fill();
      g.save(); gateGap(g); g.clip();
      const gr = g.createLinearGradient(0, 8, 0, 84);
      gr.addColorStop(0, '#16220e'); gr.addColorStop(0.5, '#0b1307'); gr.addColorStop(1, '#050a04');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 84);
      g.fillStyle = '#0d1509';
      g.fillRect(14, 8, 5.5, 76); g.fillRect(43, 10, 4.5, 74);
      g.strokeStyle = 'rgba(168,206,140,0.12)'; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(26, 14); g.lineTo(24, 44); g.stroke();
      g.beginPath(); g.moveTo(38, 16); g.lineTo(40, 38); g.stroke();
      g.restore();

      // the weave as one carrying mass: the five level lighting lives here,
      // the canes and clumps above only break its edges. Notch vertices at
      // the shoulders leave the slivers of wood that sell the depth.
      apoly(g, [
        [6, 84, 2], [5, 54, 4], [11, 42, 3], [6, 27, 3], [15, 15, 4],
        [25, 22, 3], [32, 10, 4], [40, 21, 3], [50, 14, 4], [58, 28, 3],
        [53, 42, 3], [59, 55, 4], [58, 84, 2],
      ], '#152410', GATE_MASS);
      // two holes punched clean through, half grown over again further up
      blob(g, 21, 33, 3.6, 2.8, '#080e06', { flat: true, noline: true });
      blob(g, 45, 59, 3, 2.4, '#080e06', { flat: true, noline: true });
    }

    // tier one: the dark behind everything
    gateLeafField(rng, {
      nx: 10, ny: 10, x0: 4, x1: 60, y0: 10, y1: 85, jx: 5, jy: 5,
      spread: 2.4, len: 5.2, test: (x, y) => gateInArch(x, y, 1),
    }, (x, y, a, len, pick) => {
      if (mark) return;
      gleaf(g, x, y, a, len * 0.6, len, LEAF_BACK[(pick * 3) | 0], {});
    });
    if (!mark) {
      for (let i = 0; i < 5; i++) cane(g, GATE_CANES[i], 0, 1, 1.6, CANE_D, { back: true });
    }
    gateThorns(false, (c, t, s, ci, i) => {
      const lit = ((ci * 7 + i) % 9) === 0;
      if (!mark) thorn(g, c, t, s, 1.8, THORN_D, lit);
    });

    // tier two: the body of the weave
    gateLeafField(rng, {
      nx: 9, ny: 9, x0: 5, x1: 59, y0: 11, y1: 85, jx: 5.5, jy: 5.5,
      spread: 2.6, len: 5.6, test: (x, y) => gateInArch(x, y, 1.5),
    }, (x, y, a, len, pick, hot) => {
      if (mark) return;
      gleaf(g, x, y, a, len * 0.6, len, LEAF_MID[(pick * 3) | 0], {
        drop: true, hi: hot < 0.14 ? LEAF_HI : null,
      });
    });

    if (!mark) {
      // front canes over the body, then three back canes crossing back over
      // the front ones: the overlap is the weave
      for (let i = 5; i < GATE_CANES.length; i++) cane(g, GATE_CANES[i], 0, 1, 2.3, CANE_M, {});
      cane(g, GATE_CANES[0], 0.42, 0.58, 1.6, CANE_D, { back: true });
      cane(g, GATE_CANES[1], 0.4, 0.56, 1.6, CANE_D, { back: true });
      cane(g, GATE_CANES[2], 0.5, 0.64, 1.9, CANE_D, { back: true });
      cane(g, GATE_CANES[4], 0.24, 0.4, 1.6, CANE_D, { back: true });
    }

    if (!mark) {
      // moonlight along the top shoulder, the note the crowns carry, laid in
      // before the lit tier so the leaves break it up
      g.strokeStyle = 'rgba(190,224,130,0.14)'; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath(); g.arc(32, 36, 24, Math.PI * 1.1, Math.PI * 1.56); g.stroke();
    }
    // tier three: the lit leaves, veined, outlined where they cut the edge
    gateLeafField(rng, {
      nx: 7, ny: 7, x0: 6, x1: 58, y0: 12, y1: 84, jx: 6, jy: 6,
      spread: 2.8, len: 6, test: (x, y) => gateInArch(x, y, 0.5),
    }, (x, y, a, len, pick, hot) => {
      const edge = !gateInArch(x, y, 5);
      const lit = x + y < 62;
      if (!mark) {
        gleaf(g, x, y, a, len * 0.62, len, lit && hot < 0.5 ? LEAF_LIT : LEAF_FRONT[(pick * 3) | 0], {
          drop: true, line: OUT, lw: edge ? 1 : 0.8,
          vein: 'rgba(10,22,7,0.5)',
          hi: hot < 0.3 ? LEAF_HI : null,
        });
      } else if (hot > 0.88) {
        // corruption creeping up the veins of a few leaves
        clump(g, x, y, len * 0.62, len, a, 'rgba(178,44,30,0.34)', null);
        g.save(); g.translate(x, y); g.rotate(a);
        g.strokeStyle = 'rgba(255,74,32,0.65)'; g.lineWidth = 0.7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.82); g.stroke();
        g.restore();
      }
    });

    if (!mark) {
      gberry(g, 17, 50, 1.15); gberry(g, 44, 28, 1.05);
      gtendril(g, 24, 45, -0.35, 8, '#4c6c34');
      gtendril(g, 48, 57, 0.4, 7, '#3c5a28');
    }
    // thorns last: they bristle through the foliage, not under it
    gateThorns(true, (c, t, s, ci, i) => {
      const lit = ((ci * 3 + i) % 5) === 0;
      if (!mark) thorn(g, c, t, s, 2.1, lit ? THORN_L : THORN_D, lit);
      else if ((ci + i) % 4 === 0) thornTip(g, c, t, s, 2.1);
    });
    if (mark) {
      gscratch(g, GATE_CANES[5], 0.36, 3.2);
      gscratch(g, GATE_CANES[6], 0.54, 2.8);
      gscratch(g, GATE_CANES[7], 0.6, 2.6);
    }
  }

  // Open: the canes hauled back into two bunches, a lintel still spanning the
  // top, and the trodden gap lit between them.
  const GATE_OPEN_CANES = [
    [9, 84, 1, 48, 13, 12],
    [19, 84, 13, 45, 5, 17],
    [15, 84, 6, 40, 17, 22],
    [55, 84, 63, 46, 51, 11],
    [45, 84, 52, 42, 59, 18],
    [49, 84, 58, 38, 47, 24],
    [2, 27, 32, 3, 62, 25],
    [5, 36, 32, 13, 59, 33],
  ];
  const GATE_OPEN_TH = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84];
  function gateOpenThorns(fn) {
    for (let ci = 0; ci < GATE_OPEN_CANES.length; ci++) {
      for (let i = 0; i < GATE_OPEN_TH.length; i++) {
        fn(GATE_OPEN_CANES[ci], GATE_OPEN_TH[i], i % 2 ? 1 : -1, ci, i);
      }
    }
  }
  // The bunched masses: the inner edge slides inward as it comes down, so the
  // gap is a wedge and the mass is heaviest against the outer edge.
  function gateInBunch(x, y, side, inset) {
    if (y < 10 || y > 85) return false;
    const inner = side < 0 ? 11 + (y / 84) * 13 : 53 - (y / 84) * 13;
    return side < 0 ? x < inner - inset && x > -2 : x > inner + inset && x < 66;
  }
  function gateUnderLintel(x, y) {
    if (y > 30 || y < 6) return false;
    return gateInArch(x, y, 0) && !gateInBunch(x, y, -1, 0) && !gateInBunch(x, y, 1, 0);
  }

  function gateOpen(g, mark) {
    const rng = gRng(0x2f6d1a95);
    if (!mark) {
      // the path the woods just handed you
      gateGap(g); g.fillStyle = '#070d05'; g.fill();
      g.save(); gateGap(g); g.clip();
      let gr = g.createLinearGradient(0, 8, 0, 84);
      gr.addColorStop(0, '#0a1207'); gr.addColorStop(0.6, '#101809'); gr.addColorStop(1, '#241d10');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 84);
      g.fillStyle = '#0a1006';
      g.fillRect(12, 8, 6, 58); g.fillRect(46, 9, 5, 54);
      // trodden earth, widening toward the camera
      poly(g, [[27, 36], [37, 36], [50, 84], [14, 84]], '#2e2410', { noline: true });
      poly(g, [[29, 42], [35, 42], [45, 84], [19, 84]], '#453619', { noline: true });
      poly(g, [[30, 50], [34, 50], [40, 84], [24, 84]], '#5a4724', { noline: true });
      // warm light spilling over the threshold
      gr = g.createRadialGradient(32, 76, 2, 32, 76, 44);
      gr.addColorStop(0, 'rgba(255,232,172,0.5)');
      gr.addColorStop(0.4, 'rgba(244,197,66,0.2)');
      gr.addColorStop(1, 'rgba(244,197,66,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 84);
      // pebbles pressed into the path, and two blades that survived the boots
      [[28, 64, 1.5], [36, 71, 1.7], [30, 78, 1.9], [38, 58, 1.2]].forEach(s => {
        blob(g, s[0], s[1], s[2], s[2] * 0.6, '#6b5a34', { lw: 0.7, line: 'rgba(20,14,6,0.7)' });
        g.fillStyle = 'rgba(255,236,190,0.4)';
        g.beginPath(); g.arc(s[0] - s[2] * 0.3, s[1] - s[2] * 0.3, s[2] * 0.24, 0, TAU); g.fill();
      });
      g.strokeStyle = '#3d4d2e'; g.lineWidth = 1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(24, 81); g.quadraticCurveTo(22, 75, 23, 71); g.stroke();
      g.beginPath(); g.moveTo(42, 79); g.quadraticCurveTo(44, 74, 43, 70); g.stroke();
      g.restore();

      // the lintel still spans the top, so the gap stays framed by wood
      cane(g, GATE_OPEN_CANES[6], 0, 1, 1.9, CANE_D, { back: true });
      cane(g, GATE_OPEN_CANES[7], 0, 1, 1.6, CANE_D, { back: true });
    }
    // leaves hanging off the lintel into the top of the gap
    gateLeafField(rng, {
      nx: 10, ny: 4, x0: 5, x1: 59, y0: 7, y1: 30, jx: 4.5, jy: 4,
      spread: 0.9, len: 5.4, test: gateUnderLintel,
    }, (x, y, a, len, pick, hot) => {
      if (mark) return;
      gleaf(g, x, y, a + Math.PI, len * 0.6, len,
        hot < 0.45 ? LEAF_MID[(pick * 3) | 0] : LEAF_FRONT[(pick * 3) | 0],
        { drop: true, vein: hot > 0.7 ? 'rgba(10,22,7,0.5)' : null, hi: hot < 0.12 ? LEAF_HI : null });
    });
    if (!mark) {
      gtendril(g, 27, 22, -0.2, 8, '#4c6c34');
      gtendril(g, 41, 24, 0.25, 7, '#3c5a28');
      // the two bunches: heaviest against the outer edge where they gather
      apoly(g, [
        [0, 84, 2], [0, 16, 3], [7, 8, 4], [15, 15, 3], [12, 26, 3],
        [20, 38, 4], [15, 50, 3], [23, 62, 4], [17, 72, 3], [24, 84, 2],
      ], '#152410', GATE_MASS);
      apoly(g, [
        [64, 84, 2], [64, 14, 3], [56, 7, 4], [49, 14, 3], [52, 25, 3],
        [44, 36, 4], [49, 49, 3], [41, 60, 4], [47, 71, 3], [40, 84, 2],
      ], '#152410', GATE_MASS);
    }
    // the dark tier inside each bunch
    for (const side of [-1, 1]) {
      gateLeafField(rng, {
        nx: 5, ny: 11, x0: side < 0 ? 0 : 40, x1: side < 0 ? 24 : 64,
        y0: 10, y1: 85, jx: 4.5, jy: 5, spread: 1.6, len: 5.2,
        test: (x, y) => gateInBunch(x, y, side, 1.5),
      }, (x, y, a, len, pick) => {
        if (mark) return;
        gleaf(g, x, y, a + side * 0.4, len * 0.6, len, LEAF_BACK[(pick * 3) | 0], {});
      });
    }
    if (!mark) {
      for (let i = 0; i < 6; i++) cane(g, GATE_OPEN_CANES[i], 0, 1, 2.3, CANE_M, {});
      // the lintel crossing back over the bunches it is tied into
      cane(g, GATE_OPEN_CANES[6], 0.05, 0.19, 1.9, CANE_D, { back: true });
      cane(g, GATE_OPEN_CANES[6], 0.81, 0.95, 1.9, CANE_D, { back: true });
    }
    // the lit tier: brightest along the inner edges where the gap light lands
    for (const side of [-1, 1]) {
      gateLeafField(rng, {
        nx: 5, ny: 9, x0: side < 0 ? 0 : 40, x1: side < 0 ? 24 : 64,
        y0: 11, y1: 84, jx: 5, jy: 6, spread: 2, len: 5.8,
        test: (x, y) => gateInBunch(x, y, side, 0),
      }, (x, y, a, len, pick, hot) => {
        const edge = !gateInBunch(x, y, side, 4.5);
        if (!mark) {
          gleaf(g, x, y, a + side * 0.5, len * 0.62, len,
            edge && hot < 0.6 ? LEAF_LIT : LEAF_FRONT[(pick * 3) | 0], {
              drop: true, line: OUT, lw: edge ? 1 : 0.8,
              vein: 'rgba(10,22,7,0.5)', hi: hot < 0.28 ? LEAF_HI : null,
            });
        } else if (hot > 0.9) {
          clump(g, x, y, len * 0.62, len, a + side * 0.5, 'rgba(178,44,30,0.34)', null);
        }
      });
    }
    gateOpenThorns((c, t, s, ci, i) => {
      const len = ci < 6 ? 2.1 : 1.9;
      const lit = ((ci * 3 + i) % 5) === 0;
      if (!mark) thorn(g, c, t, s, len, lit ? THORN_L : THORN_D, lit);
      else if ((ci + i) % 4 === 0) thornTip(g, c, t, s, len);
    });
    if (!mark) {
      gberry(g, 11, 47, 1.1); gberry(g, 53, 36, 1.05); gberry(g, 19, 70, 1);
      // the inner edges catch the light coming through the gap, in the short
      // broken catches a leaf edge actually makes
      g.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          const y0 = 16 + i * 9.5 + (i % 2) * 2.5;
          const len = 4 + (i % 3) * 2;
          const x0 = side < 0 ? 12.5 + (y0 / 84) * 8 : 51.5 - (y0 / 84) * 8;
          g.strokeStyle = 'rgba(255,214,146,' + (i % 2 ? 0.34 : 0.24) + ')';
          g.lineWidth = i % 2 ? 1.4 : 1;
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo(x0 + side * 0.9, y0 + len * 0.5, x0 + side * 0.4, y0 + len);
          g.stroke();
        }
      }
      g.strokeStyle = 'rgba(190,224,130,0.13)'; g.lineWidth = 1.4;
      g.beginPath(); g.arc(10, 46, 12, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    } else {
      gscratch(g, GATE_OPEN_CANES[0], 0.55, 3);
      gscratch(g, GATE_OPEN_CANES[3], 0.48, 2.8);
      gscratch(g, GATE_OPEN_CANES[6], 0.5, 2.6);
    }
  }

  P.gate_shut = () => mk(GATE_W, GATE_H, (g) => gateShut(g, false));
  P.gate_shut_mark = () => mk(GATE_W, GATE_H, (g) => gateShut(g, true));
  P.gate_open = () => mk(GATE_W, GATE_H, (g) => gateOpen(g, false));
  P.gate_open_mark = () => mk(GATE_W, GATE_H, (g) => gateOpen(g, true));
  // legacy key: props and layouts that still ask for 'door' get the gate
  P.door = () => mk(GATE_W, GATE_H, (g) => gateShut(g, false));

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
  // The Sign: a ring of eight short axe blaze scratches around a stamped eye
  // sigil, thin scratch marks radiating between the blazes. Ground art, same
  // alpha discipline as the old pentagram ring.
  P.rune = () => mk(170, 170, (g) => {
    const c = 85;
    g.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * TAU / 8;
      const ux = Math.cos(a), uy = Math.sin(a);
      const px = c + ux * 71, py = c + uy * 71;
      g.strokeStyle = 'rgba(150,26,18,0.34)'; g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(px - ux * 8, py - uy * 8); g.lineTo(px + ux * 8, py + uy * 8);
      g.stroke();
      g.strokeStyle = 'rgba(150,26,18,0.3)'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px - uy * 4 - ux * 4, py + ux * 4 - uy * 4);
      g.lineTo(px - uy * 4 + ux * 5, py + ux * 4 + uy * 5);
      g.stroke();
      g.fillStyle = 'rgba(232,161,60,0.55)';
      g.beginPath(); g.arc(px + uy * 6, py - ux * 6, 2.4, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(150,26,18,0.3)'; g.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i + 0.5) * TAU / 8;
      const ux = Math.cos(a), uy = Math.sin(a);
      g.beginPath();
      g.moveTo(c + ux * 42, c + uy * 42); g.lineTo(c + ux * 58, c + uy * 58);
      g.stroke();
    }
    g.strokeStyle = 'rgba(150,26,18,0.34)'; g.lineWidth = 3;
    g.beginPath(); g.arc(c, c, 33, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(150,26,18,0.32)'; g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(c - 24, c);
    g.quadraticCurveTo(c, c - 15, c + 24, c);
    g.quadraticCurveTo(c, c + 15, c - 24, c);
    g.closePath(); g.stroke();
    g.fillStyle = 'rgba(150,26,18,0.4)';
    g.beginPath(); g.ellipse(c, c, 3.6, 9.5, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(232,161,60,0.5)';
    g.beginPath(); g.arc(c, c - 3.4, 1.6, 0, TAU); g.fill();
  });

  // ---------------- world dressing painters ----------------
  // Treeline stock: canopy crowns, trunks, undergrowth, and the solid-deco
  // set (fallen trunks, rock ridges, slabs). Background art keeps thinner
  // outlines so it sits behind the cast instead of competing with it.

  P.tl_crown1 = () => mk(96, 80, (g) => {
    const C0 = '#0d1a0b', C1 = '#142310', C2 = '#1c2e14', C3 = '#26391b';
    blob(g, 48, 34, 44, 29, C0, { flat: true, lw: 1.5 });
    blob(g, 21, 44, 19, 15, C1, { flat: true, lw: 1.3 });
    blob(g, 50, 49, 27, 18, C1, { flat: true, lw: 1.3 });
    blob(g, 77, 42, 16, 13, C1, { flat: true, lw: 1.3 });
    blob(g, 33, 58, 17, 11, C2, { flat: true, lw: 1.2 });
    blob(g, 63, 60, 15, 10, C2, { flat: true, lw: 1.2 });
    furRow(g, 12, 65, 84, 67, 9, 5.4, 6.2, Math.PI, [C2, C3], null);
    g.strokeStyle = 'rgba(190,224,130,0.20)'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.arc(33, 54, 15, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.beginPath(); g.arc(63, 56, 13, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  });

  P.tl_crown2 = () => mk(80, 72, (g) => {
    const C0 = '#0d1a0b', C1 = '#142310', C2 = '#1d2f15', C3 = '#26391b';
    blob(g, 40, 32, 35, 27, C0, { flat: true, lw: 1.5 });
    blob(g, 24, 44, 18, 14, C1, { flat: true, lw: 1.3 });
    blob(g, 54, 42, 20, 16, C1, { flat: true, lw: 1.3 });
    blob(g, 40, 55, 18, 11, C2, { flat: true, lw: 1.2 });
    furRow(g, 12, 59, 68, 61, 8, 5, 5.8, Math.PI, [C2, C3], null);
    g.strokeStyle = 'rgba(190,224,130,0.18)'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.arc(40, 50, 14, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  });

  P.tl_crown3 = () => mk(116, 66, (g) => {
    const C0 = '#0c1809', C1 = '#132110', C2 = '#1b2c13', C3 = '#243617';
    blob(g, 58, 28, 54, 24, C0, { flat: true, lw: 1.5 });
    blob(g, 24, 38, 21, 15, C1, { flat: true, lw: 1.3 });
    blob(g, 60, 42, 27, 16, C1, { flat: true, lw: 1.3 });
    blob(g, 94, 38, 19, 14, C1, { flat: true, lw: 1.3 });
    blob(g, 40, 51, 17, 9, C2, { flat: true, lw: 1.2 });
    blob(g, 78, 51, 17, 9, C2, { flat: true, lw: 1.2 });
    furRow(g, 14, 53, 102, 55, 11, 5.4, 5.8, Math.PI, [C2, C3], null);
    g.strokeStyle = 'rgba(190,224,130,0.16)'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.arc(50, 46, 15, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  });

  P.tl_trunk1 = () => mk(46, 80, (g) => {
    // canopy shadow pooling at the top of the bole
    blob(g, 23, 10, 16, 9, '#0d1a0b', { flat: true, noline: true });
    apoly(g, [
      [17, 4, 3], [29, 4, 3], [31, 52, 2], [40, 72, 2], [28, 67, 2],
      [23, 71, 2], [17, 67, 2], [6, 72, 2], [15, 52, 2],
    ], '#2c1c10', { mid: 'rgba(8,4,2,0.2)', shade: 'rgba(8,4,2,0.3)', hi: 'rgba(120,80,40,0.14)', lw: 1.9 });
    g.strokeStyle = 'rgba(10,6,3,0.6)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(20, 10); g.lineTo(19, 56); g.stroke();
    g.beginPath(); g.moveTo(26, 8); g.lineTo(27, 52); g.stroke();
    g.beginPath(); g.moveTo(23, 14); g.lineTo(23, 44); g.stroke();
    // knot
    blob(g, 27.5, 34, 2.6, 3.4, '#1c110a', { flat: true, lw: 1 });
    g.strokeStyle = 'rgba(255,170,90,0.12)'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(17.5, 12); g.lineTo(16.5, 50); g.stroke();
  });

  P.tl_trunk2 = () => mk(50, 74, (g) => {
    blob(g, 25, 9, 17, 9, '#0d1a0b', { flat: true, noline: true });
    apoly(g, [
      [16, 4, 3], [30, 5, 3], [34, 30, 2], [33, 48, 2], [43, 66, 2],
      [30, 62, 2], [24, 66, 2], [17, 62, 2], [7, 66, 2], [15, 46, 2],
    ], '#33200f', { mid: 'rgba(8,4,2,0.2)', shade: 'rgba(8,4,2,0.3)', hi: 'rgba(120,80,40,0.14)', lw: 1.9 });
    // broken branch stub
    apoly(g, [[31, 22, 1.5], [44, 16, 1.5], [45, 21, 1.5], [33, 27, 1.5]], '#26170a', { flat: true, lw: 1.4 });
    blob(g, 44, 18.5, 2, 2.6, '#8a6138', { flat: true, lw: 0.9 });
    g.strokeStyle = 'rgba(10,6,3,0.6)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(20, 10); g.lineTo(19, 52); g.stroke();
    g.beginPath(); g.moveTo(27, 9); g.lineTo(28, 50); g.stroke();
    // moss collar
    blob(g, 18, 55, 5, 3, '#2c3a1e', { flat: true, lw: 1 });
    g.strokeStyle = 'rgba(255,170,90,0.12)'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(16.6, 12); g.lineTo(15.6, 46); g.stroke();
  });

  P.tl_snag = () => mk(38, 90, (g) => {
    apoly(g, [
      [17, 3, 1], [23, 6, 1], [25, 44, 1.5], [30, 84, 2],
      [8, 84, 2], [14, 42, 1.5],
    ], '#150d08', { mid: 'rgba(0,0,0,0.25)', shade: 'rgba(0,0,0,0.3)', lw: 1.8 });
    apoly(g, [[22, 24, 1], [34, 14, 1], [35, 18, 1], [24, 29, 1]], '#1a1009', { flat: true, lw: 1.3 });
    apoly(g, [[15, 36, 1], [4, 30, 1], [3, 34, 1], [14, 41, 1]], '#1a1009', { flat: true, lw: 1.3 });
    g.strokeStyle = 'rgba(255,122,42,0.35)'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(15, 66); g.lineTo(16, 78); g.stroke();
    g.beginPath(); g.moveTo(22, 60); g.lineTo(23, 70); g.stroke();
    g.fillStyle = 'rgba(255,150,80,0.5)';
    g.beginPath(); g.arc(18, 79, 1, 0, TAU); g.fill();
  });

  P.tl_brush = () => mk(56, 34, (g) => {
    clump(g, 13, 33, 11, 15, 0.1, '#16240f', { line: OUT, lw: 1.2 });
    clump(g, 29, 34, 13, 19, -0.1, '#1c2c12', { line: OUT, lw: 1.2 });
    clump(g, 44, 33, 10, 13, 0.2, '#16240f', { line: OUT, lw: 1.2 });
    g.strokeStyle = '#2b4023'; g.lineWidth = 1.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(21, 32); g.quadraticCurveTo(20, 24, 23, 18); g.stroke();
    g.beginPath(); g.moveTo(36, 33); g.quadraticCurveTo(38, 25, 36, 20); g.stroke();
  });

  P.reed = () => mk(24, 40, (g) => {
    g.lineCap = 'round';
    g.strokeStyle = '#3d4d2e'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(7, 40); g.quadraticCurveTo(5, 24, 5.5, 10); g.stroke();
    g.beginPath(); g.moveTo(12, 40); g.quadraticCurveTo(13, 22, 13.5, 5); g.stroke();
    g.beginPath(); g.moveTo(17, 40); g.quadraticCurveTo(19, 26, 20, 12); g.stroke();
    g.strokeStyle = '#2e3d22'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(10, 40); g.quadraticCurveTo(16, 28, 22, 24); g.stroke();
    // cattail heads
    [[5.5, 10], [13.5, 5], [20, 12]].forEach(hd => {
      g.fillStyle = '#5a3a1e'; g.strokeStyle = OUT; g.lineWidth = 0.9;
      g.beginPath(); g.roundRect(hd[0] - 1.6, hd[1], 3.2, 8, 1.6); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,220,160,0.25)';
      g.fillRect(hd[0] - 1.1, hd[1] + 0.8, 1.1, 5.4);
    });
  });

  P.redfungus = () => mk(22, 16, (g) => {
    blob(g, 11, 11, 9, 4.6, 'rgba(255,74,32,0.16)', { flat: true, noline: true });
    g.fillStyle = '#d8cfba'; g.strokeStyle = '#140a08'; g.lineWidth = 0.8;
    g.beginPath(); g.roundRect(5, 8.6, 2.2, 4.6, 1); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(11, 7, 2.4, 5.6, 1); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(16.4, 9.4, 2, 4, 1); g.fill(); g.stroke();
    blob(g, 6, 8, 3.6, 2.6, '#d4402c', { lw: 0.9, line: '#140a08' });
    blob(g, 12.2, 6.2, 4.4, 3.2, '#c23322', { lw: 0.9, line: '#140a08' });
    blob(g, 17.4, 8.8, 3.2, 2.4, '#d4402c', { lw: 0.9, line: '#140a08' });
    g.fillStyle = 'rgba(255,140,110,0.85)';
    [[5.2, 7.2], [11.4, 5.2], [16.8, 8]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.8, 0, TAU); g.fill();
    });
  });

  P.logwall = () => mk(124, 58, (g) => {
    const body = () => { g.beginPath(); g.roundRect(8, 22, 108, 28, 13); };
    body(); g.fillStyle = '#5c3a1e'; g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.28)'; g.fillRect(8, 38, 108, 14);
    g.fillStyle = 'rgba(255,244,214,0.13)'; g.fillRect(8, 22, 108, 8);
    g.strokeStyle = 'rgba(26,13,6,0.6)'; g.lineWidth = 1.1;
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(24 + i * 16, 24); g.lineTo(26 + i * 16, 49); g.stroke();
    }
    g.strokeStyle = 'rgba(20,10,4,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(20, 34); g.lineTo(112, 33); g.stroke();
    g.fillStyle = '#2c3a1e';
    g.beginPath(); g.ellipse(92, 25, 12, 4.4, 0.1, 0, TAU); g.fill();
    g.fillStyle = '#41552a';
    [[86, 23.4], [95, 24.4], [101, 25.6]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1.2, 0, TAU); g.fill();
    });
    g.restore();
    body(); g.lineWidth = 1.9; g.strokeStyle = OUT; g.stroke();
    // broken branch stubs on top
    apoly(g, [[46, 12, 1.5], [56, 12, 1.5], [57, 23, 1], [45, 23, 1]], '#4a2e16', { flat: true, lw: 1.5 });
    blob(g, 51, 12.5, 5, 2.4, '#a4753f', { flat: true, lw: 1.2 });
    apoly(g, [[74, 16, 1.5], [82, 15, 1.5], [83, 23, 1], [73, 23, 1]], '#3f2712', { flat: true, lw: 1.4 });
    // end grain, left
    blob(g, 16, 36, 8.5, 13, '#c69a63', { lw: 1.7 });
    g.strokeStyle = 'rgba(120,78,40,0.8)'; g.lineWidth = 0.9;
    for (let i = 1; i <= 3; i++) {
      g.beginPath(); g.ellipse(16, 36, 8.5 * i / 4, 13 * i / 4, 0, 0, TAU); g.stroke();
    }
    g.strokeStyle = 'rgba(90,55,25,0.8)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(16, 36); g.lineTo(22, 42); g.stroke();
  });

  P.logwallv = () => mk(58, 132, (g) => {
    const body = () => { g.beginPath(); g.roundRect(16, 6, 26, 114, 12); };
    body(); g.fillStyle = '#5c3a1e'; g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = 'rgba(12,5,3,0.28)'; g.fillRect(31, 6, 12, 114);
    g.fillStyle = 'rgba(255,244,214,0.13)'; g.fillRect(16, 6, 8, 114);
    g.strokeStyle = 'rgba(26,13,6,0.6)'; g.lineWidth = 1.1;
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(18, 20 + i * 18); g.lineTo(40, 22 + i * 18); g.stroke();
    }
    g.fillStyle = '#2c3a1e';
    g.beginPath(); g.ellipse(20, 40, 4.4, 11, 0.1, 0, TAU); g.fill();
    g.restore();
    body(); g.lineWidth = 1.9; g.strokeStyle = OUT; g.stroke();
    // stub branch, right
    apoly(g, [[40, 52, 1.5], [52, 46, 1.5], [54, 51, 1.5], [42, 58, 1]], '#4a2e16', { flat: true, lw: 1.5 });
    blob(g, 52.6, 48.4, 2.2, 2.8, '#a4753f', { flat: true, lw: 1 });
    // end grain facing the camera at the base
    blob(g, 29, 118, 15, 8.6, '#c69a63', { lw: 1.7 });
    g.strokeStyle = 'rgba(120,78,40,0.8)'; g.lineWidth = 0.9;
    for (let i = 1; i <= 3; i++) {
      g.beginPath(); g.ellipse(29, 118, 15 * i / 4, 8.6 * i / 4, 0, 0, TAU); g.stroke();
    }
  });

  P.rockspan = () => mk(124, 66, (g) => {
    // back ridge
    apoly(g, [[30, 18, 6], [62, 12, 7], [92, 20, 6], [102, 38, 5], [86, 54, 4], [38, 54, 4], [20, 36, 5]],
      '#454b52', { rim: RIM_COOL, mid: 'rgba(18,20,24,0.14)', shade: 'rgba(18,20,24,0.24)', lw: 2 });
    // flanking boulders
    apoly(g, [[8, 34, 4], [30, 28, 5], [40, 44, 4], [30, 58, 3], [10, 56, 3], [3, 46, 4]],
      '#3c4148', { mid: 'rgba(14,16,20,0.16)', shade: 'rgba(14,16,20,0.26)', lw: 1.9 });
    apoly(g, [[94, 36, 4], [116, 40, 4], [119, 54, 3], [98, 60, 3], [88, 48, 3]],
      '#3a4046', { mid: 'rgba(14,16,20,0.16)', shade: 'rgba(14,16,20,0.26)', lw: 1.9 });
    // moss caps and cracks
    blob(g, 56, 16, 9, 3.6, '#2c3a1e', { lw: 1.1 });
    blob(g, 24, 31, 6, 2.6, '#2c3a1e', { lw: 1 });
    g.fillStyle = '#4c6030';
    [[52, 14.4], [61, 15.6], [22, 30]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1.1, 0, TAU); g.fill();
    });
    g.strokeStyle = 'rgba(12,14,18,0.7)'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(58, 24); g.lineTo(54, 36); g.lineTo(58, 46); g.stroke();
    g.beginPath(); g.moveTo(84, 28); g.lineTo(88, 40); g.stroke();
  });

  P.rockspanv = () => mk(58, 148, (g) => {
    apoly(g, [[18, 12, 5], [40, 14, 5], [46, 34, 4], [38, 50, 4], [18, 50, 4], [10, 32, 4]],
      '#454b52', { rim: RIM_COOL, mid: 'rgba(18,20,24,0.14)', shade: 'rgba(18,20,24,0.24)', lw: 1.9 });
    apoly(g, [[12, 46, 5], [44, 46, 5], [50, 74, 4], [44, 98, 4], [14, 98, 4], [6, 72, 4]],
      '#3e444b', { mid: 'rgba(14,16,20,0.16)', shade: 'rgba(14,16,20,0.26)', lw: 2 });
    apoly(g, [[10, 94, 5], [48, 94, 5], [54, 120, 4], [46, 142, 4], [12, 142, 4], [3, 118, 4]],
      '#3a4046', { mid: 'rgba(14,16,20,0.16)', shade: 'rgba(14,16,20,0.26)', lw: 2 });
    blob(g, 28, 12, 8, 3.2, '#2c3a1e', { lw: 1 });
    blob(g, 16, 48, 6, 2.4, '#2c3a1e', { lw: 1 });
    g.fillStyle = '#4c6030';
    g.beginPath(); g.arc(25, 10.6, 1.1, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(12,14,18,0.7)'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(28, 54); g.lineTo(24, 72); g.lineTo(28, 88); g.stroke();
    g.beginPath(); g.moveTo(34, 102); g.lineTo(38, 120); g.stroke();
  });

  P.slabrock = () => mk(92, 88, (g) => {
    apoly(g, [[16, 26, 7], [52, 14, 8], [80, 30, 6], [88, 60, 5], [68, 82, 5], [24, 82, 5], [6, 56, 6]],
      '#474d55', { rim: RIM_COOL, mid: 'rgba(18,20,24,0.14)', shade: 'rgba(18,20,24,0.26)', lw: 2.1 });
    // flat top plane
    apoly(g, [[24, 30, 5], [52, 20, 6], [76, 33, 5], [64, 45, 5], [33, 45, 5]],
      '#5a626c', { flat: true, lw: LW_INT, line: 'rgba(20,22,26,0.6)' });
    blob(g, 40, 26, 8, 3, 'rgba(226,232,240,0.12)', { flat: true, noline: true });
    // moss and lichen on the top edge
    blob(g, 62, 22, 7, 3, '#2c3a1e', { lw: 1 });
    blob(g, 30, 32, 5, 2.4, '#2c3a1e', { lw: 1 });
    g.fillStyle = '#4c6030';
    [[59, 20.6], [66, 22], [28, 30.6]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1.1, 0, TAU); g.fill();
    });
    g.strokeStyle = 'rgba(12,14,18,0.7)'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(58, 46); g.lineTo(64, 64); g.lineTo(58, 78); g.stroke();
    g.beginPath(); g.moveTo(20, 52); g.lineTo(26, 62); g.stroke();
    // chipped shards at the base
    poly(g, [[14, 82], [22, 78], [24, 84]], '#3a4046', { lw: 1.2 });
    poly(g, [[68, 84], [76, 79], [79, 85]], '#3a4046', { lw: 1.2 });
  });

  // ---------------- camp and world ----------------
  // Camp furniture and the two camp people. Same fidelity bar as the cast:
  // apoly carrying forms, baked five level lighting, two tier outlines, one
  // saturated accent each.

  P.picnictable = () => mk(92, 48, (g) => {
    blob(g, 46, 45, 40, 3.2, 'rgba(8,6,3,0.28)', { flat: true, noline: true });
    // far bench peeking over the table edge
    apoly(g, [[10, 20, 1.5], [82, 20, 1.5], [82, 24.5, 1.5], [10, 24.5, 1.5]], '#5f3c20', { flat: true, lw: 1.4 });
    // crossed A frame legs under the top
    for (const s of [-1, 1]) {
      const lx = 46 + s * 26;
      apoly(g, [[lx - s * 8, 17, 1.2], [lx - s * 3, 17, 1.2], [lx + s * 9, 44, 1.2], [lx + s * 4, 44, 1.2]], '#6e4526', { flat: true, lw: 1.5 });
      apoly(g, [[lx + s * 8, 17, 1.2], [lx + s * 3, 17, 1.2], [lx - s * 9, 44, 1.2], [lx - s * 4, 44, 1.2]], '#5c3a1e', { flat: true, lw: 1.5 });
    }
    // near bench on stub feet
    apoly(g, [[16, 40, 1], [20, 40, 1], [20, 45, 1], [16, 45, 1]], '#5c3a1e', { flat: true, lw: 1.3 });
    apoly(g, [[72, 40, 1], [76, 40, 1], [76, 45, 1], [72, 45, 1]], '#5c3a1e', { flat: true, lw: 1.3 });
    apoly(g, [[6, 32, 2], [86, 32, 2], [86, 39.5, 2], [6, 39.5, 2]], '#7c5630', { lw: 1.8, mid: 'rgba(20,10,4,0.14)', shade: 'rgba(20,10,4,0.2)' });
    g.fillStyle = 'rgba(255,196,110,0.22)'; g.fillRect(8, 33.2, 76, 2);
    // table top: two planks, grain ticks, sun strip along the front edge
    apoly(g, [[2, 6, 2.5], [90, 6, 2.5], [90, 17.5, 2.5], [2, 17.5, 2.5]], '#8a6138', { lw: LW_SIL, mid: 'rgba(20,10,4,0.12)', shade: 'rgba(20,10,4,0.18)', hi: 'rgba(255,236,190,0.2)' });
    g.strokeStyle = 'rgba(24,16,8,0.5)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(4, 11.8); g.lineTo(88, 11.8); g.stroke();
    g.strokeStyle = 'rgba(70,42,18,0.5)';
    [[14, 8.4], [60, 8.6], [34, 14.6], [78, 14.2]].forEach(k => {
      g.beginPath(); g.moveTo(k[0], k[1]); g.lineTo(k[0] + 9, k[1]); g.stroke();
    });
    g.fillStyle = 'rgba(255,196,110,0.28)'; g.fillRect(4, 7, 84, 2.2);
    // tin plate, then the enamel mug: the one saturated accent
    blob(g, 30, 6.5, 7, 2.6, '#c9ccd4', { flat: true, lw: 1.1 });
    blob(g, 30, 6.2, 4, 1.4, '#e2e6ea', { flat: true, noline: true });
    apoly(g, [[60, 0.5, 1.2], [68, 0.5, 1.2], [67.4, 6.5, 1.2], [60.6, 6.5, 1.2]], '#4a76a8', { lw: 1.2, hi: 'rgba(255,255,255,0.25)' });
    g.strokeStyle = '#4a76a8'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(69.4, 3.4, 2.2, -Math.PI * 0.45, Math.PI * 0.45); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(61.4, 1.4, 1.6, 4.2);
  });

  P.cooler = () => mk(36, 30, (g) => {
    blob(g, 18, 28.4, 15, 2.6, 'rgba(8,6,3,0.3)', { flat: true, noline: true });
    // boxy blue body under a cream lid that overhangs
    apoly(g, [[3, 10, 2.5], [33, 10, 2.5], [32, 28, 2.5], [4, 28, 2.5]], '#4a76a8', { lw: LW_SIL, mid: 'rgba(14,26,44,0.2)', shade: 'rgba(14,26,44,0.3)', hi: 'rgba(220,240,255,0.2)' });
    g.strokeStyle = 'rgba(20,34,56,0.55)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(5, 23); g.lineTo(31, 23); g.stroke();
    g.fillStyle = 'rgba(230,244,255,0.3)'; g.fillRect(5.4, 11.5, 8, 11);
    apoly(g, [[1.5, 4.5, 2.5], [34.5, 4.5, 2.5], [34, 11.5, 2.5], [2, 11.5, 2.5]], '#e9e4da', { lw: 1.8, mid: 'rgba(90,84,70,0.14)', shade: 'rgba(90,84,70,0.2)', hi: 'rgba(255,255,255,0.3)' });
    g.strokeStyle = 'rgba(120,112,96,0.5)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(4, 8); g.lineTo(32, 8); g.stroke();
    // latch and the side handles
    apoly(g, [[15.6, 9.5, 1], [20.4, 9.5, 1], [20, 14.5, 1], [16, 14.5, 1]], '#c9ccd4', { flat: true, lw: 1.1 });
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(16.6, 10.4, 1.2, 2.6);
    g.strokeStyle = '#31537a'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(3.4, 15); g.quadraticCurveTo(0.6, 17, 3.2, 19); g.stroke();
    g.beginPath(); g.moveTo(32.6, 15); g.quadraticCurveTo(35.4, 17, 32.8, 19); g.stroke();
    // a bottlecap dropped by the corner
    blob(g, 31, 28.6, 1.6, 1.1, '#e3b341', { flat: true, lw: 0.8 });
  });

  // Strung lanterns for the camp. Drawn once by camp.js at width 200 with a
  // runtime pulse glow landing on seven fixed points, so the paper bodies
  // are placed exactly under those points. Wire ends level so it can tile.
  P.lanternstring = () => mk(200, 40, (g) => {
    g.lineCap = 'round';
    g.strokeStyle = '#2c2318'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(100, 30, 200, 10); g.stroke();
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      const x = 200 * t;
      const y = 14 + (1 - Math.abs(t - 0.5) * 2) * 16;
      const wy = 10 + 40 * t * (1 - t);
      g.strokeStyle = '#2c2318'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(x, wy); g.lineTo(x, y - 5); g.stroke();
      const paper = i % 2 ? '#e8b45a' : '#e2d8bc';
      blob(g, x, y, 4.2, 5, paper, { lw: 1.2, mid: 'rgba(90,60,20,0.16)', shade: 'rgba(90,60,20,0.24)', hi: 'rgba(255,255,240,0.3)' });
      g.strokeStyle = 'rgba(90,60,20,0.4)'; g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(x, y, 2.6, 4.6, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(x, y, 1.2, 4.4, 0, 0, TAU); g.stroke();
      // caps top and bottom, and the warm heart the runtime glow sits on
      g.fillStyle = '#5a4326';
      g.fillRect(x - 1.6, y - 6.2, 3.2, 1.8); g.fillRect(x - 1.3, y + 4.6, 2.6, 1.5);
      g.fillStyle = 'rgba(255,214,140,0.85)';
      g.beginPath(); g.arc(x, y, 1.5, 0, TAU); g.fill();
    }
  });

  P.canoe = () => mk(88, 30, (g) => {
    const hull = () => {
      g.beginPath();
      g.moveTo(2, 8);
      g.quadraticCurveTo(14, 24, 44, 25);
      g.quadraticCurveTo(74, 24, 86, 8);
      g.quadraticCurveTo(80, 13, 70, 14.5);
      g.quadraticCurveTo(44, 18, 18, 14.5);
      g.quadraticCurveTo(8, 13, 2, 8);
      g.closePath();
    };
    hull(); g.fillStyle = '#8f3f18'; g.fill();
    g.save(); hull(); g.clip();
    g.fillStyle = 'rgba(20,8,4,0.24)'; g.fillRect(0, 19, 88, 11);
    g.fillStyle = 'rgba(255,196,110,0.18)'; g.fillRect(4, 8, 40, 5);
    g.strokeStyle = '#5c2c12'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(8, 14); g.quadraticCurveTo(44, 22.5, 80, 14); g.stroke();
    g.beginPath(); g.moveTo(12, 17); g.quadraticCurveTo(44, 25, 76, 17); g.stroke();
    // the painted bow band: the one blue accent
    g.strokeStyle = '#4a76a8'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(6, 10.5); g.quadraticCurveTo(16, 20, 30, 22.6); g.stroke();
    g.restore();
    hull(); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
    // the open interior with a bench thwart
    const inner = () => {
      g.beginPath();
      g.moveTo(14, 11.6);
      g.quadraticCurveTo(44, 16.5, 74, 11.6);
      g.quadraticCurveTo(70, 15.5, 60, 16.8);
      g.quadraticCurveTo(44, 18.6, 28, 16.8);
      g.quadraticCurveTo(18, 15.5, 14, 11.6);
      g.closePath();
    };
    inner(); g.fillStyle = '#421c0a'; g.fill();
    inner(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(18,8,3,0.8)'; g.stroke();
    apoly(g, [[40, 13.4, 1], [48, 13.4, 1], [47.4, 16.8, 1], [40.6, 16.8, 1]], '#b85a24', { flat: true, lw: 1 });
    // gunwale sun, prow wraps, a paddle laid across the near side
    g.strokeStyle = 'rgba(255,196,110,0.5)'; g.lineWidth = 1.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(56, 12.6); g.quadraticCurveTo(74, 11, 84, 8.6); g.stroke();
    g.strokeStyle = '#5c2c12'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(3.5, 8.5); g.lineTo(6.5, 12); g.stroke();
    g.beginPath(); g.moveTo(84.5, 8.5); g.lineTo(81.5, 12); g.stroke();
    g.strokeStyle = '#8a6138'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(50, 6); g.lineTo(64, 20); g.stroke();
    blob(g, 66.5, 22, 3, 5.4, '#8a6138', { rot: 0.8, lw: 1.1 });
    g.strokeStyle = 'rgba(255,224,170,0.4)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(52, 7.5); g.lineTo(61, 16.5); g.stroke();
  });

  // Dock planks, tileable vertically: plank rows repeat every 12 units and
  // the post pairs repeat every 48, so stacked tiles continue cleanly.
  P.dock = () => mk(56, 96, (g) => {
    g.fillStyle = '#1c2a26'; g.fillRect(0, 0, 56, 96);
    for (let i = 0; i < 8; i++) {
      const y = i * 12;
      apoly(g, [[1, y + 0.8, 1.5], [55, y + 0.8, 1.5], [55, y + 11, 1.5], [1, y + 11, 1.5]], i % 2 ? '#8a6138' : '#7c5630', { flat: true, lw: 1.3 });
      g.fillStyle = 'rgba(255,196,110,0.16)'; g.fillRect(3, y + 2, 50, 2.2);
      g.fillStyle = 'rgba(20,10,4,0.28)'; g.fillRect(3, y + 8.8, 50, 1.6);
      g.strokeStyle = 'rgba(70,42,18,0.5)'; g.lineWidth = 0.9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(10 + (i % 3) * 14, y + 4); g.lineTo(20 + (i % 3) * 14, y + 4.6); g.stroke();
    }
    // post tops on a 48 unit rhythm
    for (const py of [6, 54]) {
      for (const px of [5, 51]) {
        blob(g, px, py, 4.2, 4.2, '#5c3a20', { lw: 1.6, hi: 'rgba(255,196,110,0.25)' });
        g.strokeStyle = 'rgba(30,16,6,0.7)'; g.lineWidth = 0.9;
        g.beginPath(); g.arc(px, py, 2, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,196,110,0.3)';
        g.beginPath(); g.arc(px - 1.2, py - 1.2, 1.2, 0, TAU); g.fill();
      }
    }
    // nail dots along the plank edges
    g.fillStyle = 'rgba(24,14,6,0.6)';
    for (let i = 0; i < 8; i++) {
      g.beginPath(); g.arc(8, i * 12 + 6, 0.8, 0, TAU); g.fill();
      g.beginPath(); g.arc(48, i * 12 + 6, 0.8, 0, TAU); g.fill();
    }
  });

  // The log cabin front. The lit window sits at painter coords (30.5, 84.5)
  // because camp.js draws this at x 520 yB -300 w 220 and lands its runtime
  // window glow at world (458, -340): keep those aligned if either moves.
  P.cabin = () => mk(140, 110, (g) => {
    blob(g, 70, 108, 62, 3.6, 'rgba(8,6,3,0.3)', { flat: true, noline: true });
    // six log courses with butt ends left and right
    for (let i = 5; i >= 0; i--) {
      const ly = 58 + i * 8.66;
      apoly(g, [[10, ly + 0.4, 4], [130, ly + 0.4, 4], [130, ly + 9, 4], [10, ly + 9, 4]], i % 2 ? '#6e4526' : '#5f3c20', { flat: true, lw: 1.6 });
      g.fillStyle = 'rgba(255,196,110,0.13)'; g.fillRect(14, ly + 1.6, 112, 2.2);
      g.fillStyle = 'rgba(20,10,4,0.3)'; g.fillRect(14, ly + 7.4, 112, 1.4);
    }
    for (let i = 0; i < 6; i++) {
      const cy = 58 + i * 8.66 + 4.6;
      for (const ex of [10, 130]) {
        blob(g, ex, cy, 4.6, 4.2, '#8a6138', { lw: 1.4 });
        g.strokeStyle = '#5c3a20'; g.lineWidth = 0.8;
        g.beginPath(); g.arc(ex, cy, 2.2, 0, TAU); g.stroke();
      }
    }
    // gable roof in two shingle planes with a warm lit edge
    apoly(g, [[2, 62, 2], [70, 16, 3], [138, 62, 2], [130, 66, 2], [70, 26, 2], [10, 66, 2]], '#3d3126', { flat: true, lw: LW_SIL });
    apoly(g, [[8, 60, 2], [70, 20, 3], [132, 60, 2]], '#54432f', { flat: true, lw: 1.4 });
    g.strokeStyle = 'rgba(24,16,8,0.55)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      g.beginPath();
      g.moveTo(8 + 62 * t, 60 - 40 * t); g.lineTo(132 - 62 * t, 60 - 40 * t);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,196,110,0.4)'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(6, 60); g.lineTo(66, 20.6); g.stroke();
    // stone chimney through the right slope
    apoly(g, [[96, 26, 2], [112, 26, 2], [112, 52, 2], [96, 46, 2]], '#7a8494', { lw: 1.8, mid: 'rgba(24,28,34,0.16)', shade: 'rgba(24,28,34,0.24)' });
    apoly(g, [[93.5, 20, 1.5], [114.5, 20, 1.5], [113.5, 26.5, 1.5], [94.5, 26.5, 1.5]], '#5f6b7a', { flat: true, lw: 1.6 });
    g.fillStyle = '#98a4b2';
    [[100, 31], [107, 34], [101, 39], [108, 42]].forEach(st => {
      g.beginPath(); g.arc(st[0], st[1], 2.6, 0, TAU); g.fill();
    });
    g.fillStyle = 'rgba(255,196,110,0.2)'; g.fillRect(95.5, 21.4, 8, 2.4);
    // the lit window with a mullion cross and a sill
    apoly(g, [[20.5, 76.5, 1.5], [40.5, 76.5, 1.5], [40.5, 92.5, 1.5], [20.5, 92.5, 1.5]], '#ffca6e', { flat: true, lw: LW_SIL });
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(22, 78, 7, 6);
    g.strokeStyle = '#3a2513'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(30.5, 77); g.lineTo(30.5, 92); g.moveTo(21, 84.5); g.lineTo(40, 84.5); g.stroke();
    apoly(g, [[18.5, 92.5, 1], [42.5, 92.5, 1], [41.5, 95.5, 1], [19.5, 95.5, 1]], '#8a6138', { flat: true, lw: 1.2 });
    // the readable door: dark planks, timber frame, gold knob, porch step
    apoly(g, [[58, 70, 2.5], [82, 70, 2.5], [82, 108, 1.5], [58, 108, 1.5]], '#241708', { lw: LW_SIL });
    g.strokeStyle = '#8a6138'; g.lineWidth = 1.6;
    g.beginPath(); g.roundRect(60.5, 72.5, 19, 33.5, 2); g.stroke();
    g.strokeStyle = 'rgba(138,97,56,0.55)'; g.lineWidth = 1;
    [66, 71.5, 76].forEach(px => { g.beginPath(); g.moveTo(px, 74); g.lineTo(px, 105); g.stroke(); });
    g.fillStyle = '#e3b341';
    g.beginPath(); g.arc(78, 90, 1.9, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(90,60,10,0.7)'; g.lineWidth = 0.7; g.stroke();
    g.fillStyle = 'rgba(255,252,235,0.85)';
    g.beginPath(); g.arc(77.4, 89.4, 0.6, 0, TAU); g.fill();
    apoly(g, [[54, 107, 1.5], [86, 107, 1.5], [84, 110, 1], [56, 110, 1]], '#7c5630', { flat: true, lw: 1.3 });
  });

  // The quartermaster: stout, grey bun, reading glasses low on her nose,
  // the ledger clipboard she never puts down. Kind eyes, zero nonsense.
  P.npc_quartermaster = () => mk(48, 58, (g) => {
    const cx = 24;
    for (const s of [-1, 1]) {
      const lx = cx + s * 6;
      apoly(g, [[lx - 2.2, 46, 1], [lx + 2.2, 46, 1], [lx + 1.9, 52.5, 1], [lx - 1.9, 52.5, 1]], '#d7a45f', { flat: true, lw: 1.3 });
      g.strokeStyle = '#e8e0cc'; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(lx - 1.8, 50.6); g.lineTo(lx + 1.8, 50.6); g.stroke();
      const pts = s > 0
        ? [[lx - 3, 52, 1.2], [lx + 3, 52, 1.2], [lx + 5.6, 55, 1], [lx + 5.6, 57, 1], [lx - 3, 57, 1.2]]
        : [[lx + 3, 52, 1.2], [lx - 3, 52, 1.2], [lx - 5.6, 55, 1], [lx - 5.6, 57, 1], [lx + 3, 57, 1.2]];
      apoly(g, pts, '#3a2e20', { flat: true, lw: 1.3 });
    }
    // stout khaki uniform: shoulders in, belly proud, skirt hem
    apoly(g, [[cx - 10, 22, 4], [cx + 10, 22, 4], [cx + 14.5, 38, 4], [cx + 13, 47, 3], [cx - 13, 47, 3], [cx - 14.5, 38, 4]], '#c9a86a', { lw: LW_SIL, rim: 'rgba(255,240,200,0.35)', mid: 'rgba(60,42,18,0.13)', shade: 'rgba(60,42,18,0.2)' });
    g.strokeStyle = 'rgba(40,26,12,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 12.6, 43.5); g.lineTo(cx + 12.6, 43.5); g.stroke();
    // belt riding the belly, brass buckle
    apoly(g, [[cx - 13.6, 35.5, 1.5], [cx + 13.6, 35.5, 1.5], [cx + 14, 39.5, 1.5], [cx - 14, 39.5, 1.5]], '#5c4326', { flat: true, lw: 1.4 });
    g.fillStyle = '#e3b341'; g.fillRect(cx - 2.6, 35, 5.2, 5);
    g.strokeStyle = OUT; g.lineWidth = 0.9; g.strokeRect(cx - 2.6, 35, 5.2, 5);
    // pocket flap, then the service sash: the one saturated accent
    g.strokeStyle = 'rgba(40,26,12,0.45)'; g.lineWidth = LW_INT;
    g.strokeRect(cx + 3, 28.5, 5, 3.6);
    g.strokeStyle = '#8a2f23'; g.lineWidth = 4.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 9, 24); g.lineTo(cx + 10, 37); g.stroke();
    const bc = ['#f4c542', '#7ec87e', '#7ec8e8', '#e9e4da'];
    for (let i = 0; i < 4; i++) {
      g.fillStyle = bc[i];
      g.beginPath(); g.arc(cx - 6.4 + i * 5, 26 + i * 3.2, 1.5, 0, TAU); g.fill();
    }
    // arms: one on the hip, one holding the clipboard out front
    blob(g, cx - 12.5, 30, 3, 6.4, '#c9a86a', { rot: 0.5, lw: 1.6 });
    blob(g, cx - 13.8, 35.8, 2.4, 2.2, '#d7a45f', { lw: 1.2 });
    blob(g, cx + 12.5, 31, 3, 6.6, '#c9a86a', { rot: -0.55, lw: 1.6 });
    g.save(); g.translate(cx + 15, 38.5); g.rotate(0.18);
    apoly(g, [[-5, -7.5, 1.5], [5, -7.5, 1.5], [5, 8, 1.5], [-5, 8, 1.5]], '#8a6138', { flat: true, lw: 1.5 });
    g.fillStyle = '#e9e4da'; g.fillRect(-3.6, -5.6, 7.2, 12);
    g.fillStyle = '#c9ccd4'; g.fillRect(-2.4, -8.6, 4.8, 3);
    g.strokeStyle = OUT; g.lineWidth = 0.8; g.strokeRect(-2.4, -8.6, 4.8, 3);
    g.strokeStyle = '#8d947f'; g.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-2.4, -3.4 + i * 2.3); g.lineTo(2.6, -3.4 + i * 2.3); g.stroke(); }
    g.restore();
    blob(g, cx + 13.2, 44.6, 2.4, 2.2, '#d7a45f', { lw: 1.2 });
    // kerchief over the collar
    apoly(g, [[cx - 8.4, 21.4, 1.5], [cx + 8.4, 21.4, 1.5], [cx, 30.5, 1]], '#c0392b', { lw: 1.6 });
    apoly(g, [[cx - 1.8, 22.4, 1], [cx + 1.8, 22.4, 1], [cx + 1.4, 25.6, 1], [cx - 1.4, 25.6, 1]], '#c0392b', { flat: true, lw: 1.1 });
    // head: round cheeks, warm forehead light
    apoly(g, [[cx - 8.6, 6, 6], [cx + 8.6, 6, 6], [cx + 7.6, 20.6, 5.5], [cx - 7.6, 20.6, 5.5]], '#d7a45f', { rim: RIM_WARM, hi: 'rgba(255,244,214,0.22)', mid: 'rgba(120,66,30,0.1)', shade: 'rgba(120,66,30,0.16)' });
    // grey hair: parted crown, temple sweeps, the bun riding high
    apoly(g, [[cx - 9, 6.8, 3], [cx - 2, 3.2, 3], [cx + 6, 4, 3], [cx + 9, 7.4, 2.5], [cx + 7, 8.8, 2], [cx, 6.6, 2.5], [cx - 6.6, 9.4, 2]], '#c3c8ce', { lw: 1.5, mid: 'rgba(70,76,84,0.15)', shade: 'rgba(70,76,84,0.22)' });
    blob(g, cx + 7.8, 3.6, 4.4, 3.8, '#c3c8ce', { lw: 1.6, mid: 'rgba(70,76,84,0.16)', shade: 'rgba(70,76,84,0.24)', hi: 'rgba(255,255,255,0.25)' });
    g.strokeStyle = 'rgba(80,86,94,0.6)'; g.lineWidth = 0.8; g.lineCap = 'round';
    g.beginPath(); g.arc(cx + 7.8, 3.6, 2.4, Math.PI * 0.2, Math.PI * 1.3); g.stroke();
    // wire glasses, kind eyes behind them
    g.strokeStyle = '#8a8f96'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx - 3.6, 14, 2.6, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx + 3.6, 14, 2.6, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(cx - 1, 14); g.lineTo(cx + 1, 14); g.stroke();
    cuteEye(g, cx - 3.6, 14, 1.5);
    cuteEye(g, cx + 3.6, 14, 1.5);
    // grey brows, soft smile, blush
    g.strokeStyle = '#c3c8ce'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - 5.6, 10.6); g.lineTo(cx - 1.8, 10.2); g.stroke();
    g.beginPath(); g.moveTo(cx + 5.6, 10.6); g.lineTo(cx + 1.8, 10.2); g.stroke();
    g.strokeStyle = '#8a5a3c'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(cx - 1.8, 18.4); g.quadraticCurveTo(cx, 19.6, cx + 1.8, 18.4); g.stroke();
    blob(g, cx - 6, 16.6, 1.6, 1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
    blob(g, cx + 6, 16.6, 1.6, 1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
  });

  // The mail carrier: wiry, all elbows, flat cap, the blue mail satchel
  // stuffed with letters. Built to look mid errand even standing still.
  P.npc_mailcarrier = () => mk(40, 58, (g) => {
    const cx = 20;
    for (const s of [-1, 1]) {
      const lx = cx + s * 4;
      apoly(g, [[lx - 1.5, 42, 1], [lx + 1.5, 42, 1], [lx + 1.3, 52.5, 1], [lx - 1.3, 52.5, 1]], '#e8b384', { flat: true, lw: 1.2 });
      g.strokeStyle = '#e8e0cc'; g.lineWidth = 1.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(lx - 1.3, 49); g.lineTo(lx + 1.3, 49); g.stroke();
      g.beginPath(); g.moveTo(lx - 1.3, 50.8); g.lineTo(lx + 1.3, 50.8); g.stroke();
      const pts = s > 0
        ? [[lx - 2.2, 52, 1], [lx + 2.2, 52, 1], [lx + 4.6, 54.6, 1], [lx + 4.6, 56.6, 1], [lx - 2.2, 56.6, 1]]
        : [[lx + 2.2, 52, 1], [lx - 2.2, 52, 1], [lx - 4.6, 54.6, 1], [lx - 4.6, 56.6, 1], [lx + 2.2, 56.6, 1]];
      apoly(g, pts, '#3a2e20', { flat: true, lw: 1.2 });
    }
    // shorts and a narrow tucked shirt
    apoly(g, [[cx - 6, 36.5, 2], [cx + 6, 36.5, 2], [cx + 6.6, 43, 1.5], [cx + 1.2, 43, 1], [cx, 41, 1], [cx - 1.2, 43, 1], [cx - 6.6, 43, 1.5]], '#4a3a2c', { lw: 1.6 });
    apoly(g, [[cx - 7, 24, 3], [cx + 7, 24, 3], [cx + 5.6, 37.5, 2], [cx - 5.6, 37.5, 2]], '#5c7248', { lw: LW_SIL, rim: 'rgba(230,255,190,0.3)', mid: 'rgba(24,34,16,0.14)', shade: 'rgba(24,34,16,0.2)' });
    g.strokeStyle = 'rgba(20,28,12,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 5.4, 35); g.lineTo(cx + 5.4, 35); g.stroke();
    g.strokeRect(cx - 4.6, 28, 3.6, 3);
    // strap across the chest, then the stuffed satchel on the hip
    g.strokeStyle = '#31537a'; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(cx - 6, 25); g.lineTo(cx + 7.4, 36.5); g.stroke();
    g.strokeStyle = 'rgba(160,200,240,0.35)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(cx - 5.6, 26.2); g.lineTo(cx + 6.6, 36.6); g.stroke();
    // wiry arms: one swinging free, one pinning the satchel
    blob(g, cx - 9, 29.5, 2.2, 6, '#5c7248', { rot: 0.35, lw: 1.4 });
    blob(g, cx - 10.6, 34.8, 1.9, 1.9, '#e8b384', { lw: 1.1 });
    blob(g, cx + 8.6, 30, 2.2, 5.6, '#5c7248', { rot: -0.3, lw: 1.4 });
    // letters poking out behind the flap, then the satchel front
    g.save(); g.translate(cx + 7.6, 37.4); g.rotate(-0.18);
    g.fillStyle = '#e9e4da'; g.fillRect(0, -3.4, 4.6, 3.6);
    g.strokeStyle = OUT; g.lineWidth = 0.8; g.strokeRect(0, -3.4, 4.6, 3.6);
    g.restore();
    g.save(); g.translate(cx + 11.2, 36.8); g.rotate(0.14);
    g.fillStyle = '#d8cfc0'; g.fillRect(0, -3, 4.2, 3.2);
    g.strokeStyle = OUT; g.lineWidth = 0.8; g.strokeRect(0, -3, 4.2, 3.2);
    g.restore();
    apoly(g, [[cx + 4.6, 37, 2.5], [cx + 14.6, 37, 2.5], [cx + 13.8, 47.5, 2.5], [cx + 5.4, 47.5, 2.5]], '#4a76a8', { lw: LW_SIL, mid: 'rgba(14,26,44,0.2)', shade: 'rgba(14,26,44,0.3)', hi: 'rgba(220,240,255,0.2)' });
    apoly(g, [[cx + 4.6, 37, 2.5], [cx + 14.6, 37, 2.5], [cx + 14, 41.5, 2], [cx + 5.2, 41.5, 2]], '#3d6390', { flat: true, lw: 1.4 });
    g.fillStyle = '#e3b341';
    g.beginPath(); g.arc(cx + 9.6, 41.5, 1.2, 0, TAU); g.fill();
    g.strokeStyle = OUT; g.lineWidth = 0.7; g.stroke();
    blob(g, cx + 9.4, 45.4, 1.9, 1.9, '#e8b384', { lw: 1.1 });
    // kerchief
    apoly(g, [[cx - 5.8, 23, 1.2], [cx + 5.8, 23, 1.2], [cx, 30, 1]], '#d8722f', { lw: 1.5 });
    apoly(g, [[cx - 1.5, 23.6, 0.8], [cx + 1.5, 23.6, 0.8], [cx + 1.2, 26.2, 0.8], [cx - 1.2, 26.2, 0.8]], '#d8722f', { flat: true, lw: 1 });
    // narrow head, big ears, freckles
    apoly(g, [[cx - 7, 7, 5.5], [cx + 7, 7, 5.5], [cx + 6.2, 21.4, 5], [cx - 6.2, 21.4, 5]], '#e8b384', { rim: RIM_WARM, hi: 'rgba(255,244,214,0.22)', mid: 'rgba(120,66,30,0.1)', shade: 'rgba(120,66,30,0.16)' });
    blob(g, cx - 7.4, 14.5, 1.7, 2.4, '#e8b384', { lw: 1.3 });
    blob(g, cx + 7.4, 14.5, 1.7, 2.4, '#e8b384', { lw: 1.3 });
    cuteEye(g, cx - 3.2, 13.5, 1.6);
    cuteEye(g, cx + 3.2, 13.5, 1.6);
    g.strokeStyle = '#5c422e'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 4.8, 10.4); g.lineTo(cx - 1.8, 9.9); g.stroke();
    g.beginPath(); g.moveTo(cx + 4.8, 10.4); g.lineTo(cx + 1.8, 9.9); g.stroke();
    g.strokeStyle = '#8a5a3c'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 1.4, 18.2); g.quadraticCurveTo(cx + 0.4, 19.4, cx + 2, 18); g.stroke();
    g.fillStyle = 'rgba(150,90,50,0.5)';
    [[cx - 4.6, 16.2], [cx - 2.8, 17], [cx + 2.8, 17], [cx + 4.6, 16.2]].forEach(f => {
      g.beginPath(); g.arc(f[0], f[1], 0.55, 0, TAU); g.fill();
    });
    // flat cap tipped back, brim out front, one escaping forelock
    apoly(g, [[cx - 8, 7.6, 3], [cx - 3, 2.6, 3.5], [cx + 5, 2.4, 3.5], [cx + 8.4, 7, 2.5], [cx + 5, 8.6, 2], [cx - 4, 9, 2]], '#8a6138', { lw: 1.6, rim: RIM_WARM });
    lens(g, cx + 6.8, 8.2, 4.6, 1.4, '#6e4526', 1.2);
    g.strokeStyle = '#5c3a20'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 2, 3.6); g.lineTo(cx + 1, 8); g.stroke();
    g.strokeStyle = '#3a2e20'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx - 6.4, 8.6); g.quadraticCurveTo(cx - 7.4, 10.2, cx - 6.6, 11.8); g.stroke();
  });

  // Where a found thing waits: a low mossy sitting stone with a soft gold
  // seat glow, humbler than the ruin pedestal on purpose.
  P.findpedestal = () => mk(44, 30, (g) => {
    blob(g, 22, 27.5, 18, 2.8, 'rgba(8,6,3,0.3)', { flat: true, noline: true });
    apoly(g, [[8, 12, 5], [34, 11, 6], [40, 20, 4], [36, 27, 3], [9, 27, 3], [4, 20, 4]], '#5a5f58', { lw: LW_SIL, rim: RIM_COOL, mid: 'rgba(18,20,18,0.16)', shade: 'rgba(18,20,18,0.26)' });
    // the worn seat plane
    blob(g, 22, 13.5, 12, 4, '#767b72', { lw: LW_INT, line: 'rgba(24,26,24,0.6)' });
    blob(g, 19, 12.6, 5.4, 1.7, 'rgba(230,235,225,0.2)', { flat: true, noline: true });
    // moss creeping up the shaded side, lichen freckles
    blob(g, 9.5, 21, 4.6, 3.2, '#2c3a1e', { lw: 1, rot: 0.3 });
    blob(g, 14, 25, 3.4, 2.2, '#33432a', { lw: 0.9 });
    clump(g, 7.5, 17.6, 3.4, 3.6, -0.9, '#3c5026', { line: OUT, lw: 0.9 });
    g.fillStyle = '#4c6030';
    [[31, 15.4], [35, 18.6], [12, 15]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1, 0, TAU); g.fill();
    });
    g.strokeStyle = 'rgba(20,22,20,0.6)'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(30, 20); g.lineTo(33.6, 25); g.stroke();
    // the soft gold waiting glow pooled on the seat
    const gr = g.createRadialGradient(22, 12.5, 1, 22, 12.5, 13);
    gr.addColorStop(0, 'rgba(255,232,166,0.6)');
    gr.addColorStop(0.55, 'rgba(244,197,66,0.2)');
    gr.addColorStop(1, 'rgba(244,197,66,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(22, 12.5, 13, 6.4, 0, 0, TAU); g.fill();
  });

  // ---------------- nature clusters ----------------
  // Vignette clusters: each composes several plants or stones with internal
  // overlap and a shared contact shadow. No eyes, no tokens, pure forest.

  P.fernclump = () => mk(46, 36, (g) => {
    blob(g, 23, 33.5, 19, 2.8, 'rgba(8,10,5,0.3)', { flat: true, noline: true });
    // a frond: arcing midrib with paired leaflets shrinking toward the tip
    const frond = (x, y, ang, len, col, hi) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const px = (2 * t * (1 - t) * 0.14 + t * t * 0.42) * len;
        const py = -(2 * t * (1 - t) * 0.62 + t * t) * len;
        const sz = 1 - t * 0.7;
        clump(g, px, py, 2.8 * sz, 5.6 * sz, -1.25 + t * 0.9, col, hi && i % 2 === 0 ? { hi: 'rgba(214,255,150,0.35)' } : null);
        clump(g, px, py, 2.8 * sz, 5.2 * sz, 1.05 + t * 0.9, col, null);
      }
      g.strokeStyle = col; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.14, -len * 0.62, len * 0.42, -len); g.stroke();
      clump(g, len * 0.42, -len, 2, 4.4, 0.35, col, null);
      g.restore();
    };
    frond(21, 33, -0.85, 24, '#233617', false);
    frond(25, 33, 0.8, 22, '#233617', false);
    frond(20, 33, -0.45, 28, '#2c4420', false);
    frond(26, 33, 0.42, 27, '#2c4420', false);
    frond(23, 33, -0.12, 30, '#35511f', true);
    frond(22, 33, 0.16, 26, '#3c5a28', true);
    // one young fiddlehead curling up at the front
    g.strokeStyle = '#4c6c34'; g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(29, 33); g.quadraticCurveTo(31.5, 27, 30, 23.5); g.stroke();
    g.beginPath(); g.arc(29, 23, 1.8, -0.4, Math.PI * 1.35); g.stroke();
  });

  P.flowerpatch = () => mk(44, 30, (g) => {
    blob(g, 22, 27.5, 18, 2.6, 'rgba(8,10,5,0.3)', { flat: true, noline: true });
    // the grass bed the flowers stand in
    g.lineCap = 'round'; g.lineWidth = 1.4;
    [[6, -2], [12, 2], [19, -3], [26, 2], [33, -2], [38, 2]].forEach((b, i) => {
      g.strokeStyle = i % 2 ? '#2b4023' : '#22331d';
      g.beginPath(); g.moveTo(b[0], 28); g.quadraticCurveTo(b[0] + b[1], 21, b[0] + b[1] * 1.8, 15); g.stroke();
    });
    // species one: nodding harebells on thin stems, the blue accent
    const bell = (x, y, lean) => {
      g.strokeStyle = '#3d4d2e'; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(x, 28); g.quadraticCurveTo(x + lean, (28 + y) / 2, x + lean * 1.6, y); g.stroke();
      g.save(); g.translate(x + lean * 1.6, y); g.rotate(lean * 0.12);
      apoly(g, [[-2.6, 0, 1], [2.6, 0, 1], [3, 4.6, 0.8], [1.4, 3.6, 0.8], [0, 4.8, 0.8], [-1.4, 3.6, 0.8], [-3, 4.6, 0.8]], '#7ea8d8', { lw: 1, mid: 'rgba(24,40,70,0.2)', shade: 'rgba(24,40,70,0.28)', hi: 'rgba(230,242,255,0.35)' });
      g.restore();
    };
    bell(8, 8, 1.6); bell(14, 12, -1.2); bell(35, 9, -1.8);
    // species two: white daisies with gold hearts, faces tilted apart
    const daisy = (x, y, r, tilt) => {
      g.strokeStyle = '#3d4d2e'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x + tilt * 2, 28); g.quadraticCurveTo(x + tilt, (28 + y) / 2, x, y + r); g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = tilt * 0.3 + i / 8 * TAU;
        clump(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.5, r * 0.5, r * 0.95, a + Math.PI / 2, i % 2 ? '#e9e4da' : '#f6f2e9', { line: 'rgba(90,90,70,0.45)', lw: 0.7 });
      }
      blob(g, x, y, r * 0.42, r * 0.4, '#f4c542', { lw: 0.9 });
      g.fillStyle = 'rgba(255,252,235,0.9)';
      g.beginPath(); g.arc(x - r * 0.14, y - r * 0.14, r * 0.14, 0, TAU); g.fill();
    };
    daisy(20, 10, 5, -0.5);
    daisy(29, 15, 4.2, 0.6);
    daisy(12, 18, 3.4, 0.2);
    // a couple of leaves at the stems
    clump(g, 17, 24, 2.8, 5, -0.9, '#33512a', null);
    clump(g, 31, 23, 2.8, 4.6, 0.8, '#2c4420', null);
  });

  P.mushroomring = () => mk(52, 34, (g) => {
    blob(g, 26, 30, 22, 3, 'rgba(8,10,5,0.28)', { flat: true, noline: true });
    // the faint trodden circle inside the ring
    g.strokeStyle = 'rgba(50,64,36,0.4)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(26, 21, 15, 5.6, 0, 0, TAU); g.stroke();
    const shroom = (x, y, s) => {
      blob(g, x, y + s * 0.6, s * 1.3, s * 0.5, 'rgba(8,10,5,0.3)', { flat: true, noline: true });
      g.fillStyle = '#d8cfba'; g.strokeStyle = '#140a08'; g.lineWidth = 0.9;
      g.beginPath(); g.roundRect(x - s * 0.32, y - s * 0.9, s * 0.64, s * 1.5, s * 0.3); g.fill(); g.stroke();
      g.fillStyle = 'rgba(120,104,80,0.5)';
      g.fillRect(x - s * 0.32, y - s * 0.05, s * 0.64, s * 0.35);
      blob(g, x, y - s, s * 1.15, s * 0.72, s > 4.4 ? '#c23322' : '#d4402c', { lw: 1.1, line: '#140a08', mid: 'rgba(60,8,4,0.18)', shade: 'rgba(60,8,4,0.28)', hi: 'rgba(255,150,120,0.25)' });
      g.fillStyle = 'rgba(240,230,210,0.9)';
      [[-0.5, -1.25], [0.3, -1.45], [0.75, -1]].forEach(d => {
        g.beginPath(); g.arc(x + d[0] * s, y + d[1] * s, s * 0.14, 0, TAU); g.fill();
      });
    };
    // seven caps on a partial ellipse, the ring open toward the front
    const ring = [];
    for (const a of [Math.PI * 0.78, Math.PI * 1.02, Math.PI * 1.28, Math.PI * 1.52, Math.PI * 1.76, Math.PI * 0.02, Math.PI * 0.24]) {
      ring.push([26 + Math.cos(a) * 19, 21 + Math.sin(a) * 7]);
    }
    ring.sort((p, q) => p[1] - q[1]);
    ring.forEach(p => shroom(p[0], p[1], 3.2 + (p[1] - 14) * 0.32));
    // grass tufts breaking up the circle
    g.lineCap = 'round'; g.strokeStyle = '#2b4023'; g.lineWidth = 1.2;
    [[16, 25], [37, 24], [26, 18]].forEach(t => {
      g.beginPath(); g.moveTo(t[0], t[1]); g.quadraticCurveTo(t[0] + 1.5, t[1] - 4, t[0] + 1, t[1] - 6.5); g.stroke();
      g.beginPath(); g.moveTo(t[0] + 2, t[1]); g.quadraticCurveTo(t[0] + 3.5, t[1] - 3, t[0] + 4.4, t[1] - 5); g.stroke();
    });
  });

  P.rockcluster = () => mk(56, 40, (g) => {
    blob(g, 28, 36.5, 24, 3.2, 'rgba(8,6,3,0.3)', { flat: true, noline: true });
    // the big mossy one behind
    apoly(g, [[14, 12, 6], [34, 8, 7], [46, 18, 5], [43, 32, 4], [18, 33, 4], [8, 22, 5]], '#474d55', { lw: LW_SIL, rim: RIM_COOL, mid: 'rgba(18,20,24,0.15)', shade: 'rgba(18,20,24,0.26)' });
    g.strokeStyle = 'rgba(14,16,20,0.6)'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(30, 12); g.lineTo(35, 22); g.lineTo(32, 30); g.stroke();
    // its moss cap sliding down the shaded side
    blob(g, 20, 12.5, 8, 3.6, '#2c3a1e', { lw: 1, rot: -0.14 });
    clump(g, 13.5, 15, 4, 4.4, -1.35, '#33432a', { line: OUT, lw: 0.9 });
    blob(g, 27, 10.4, 4, 1.8, '#3c5026', { flat: true, noline: true });
    g.fillStyle = '#4c6030';
    [[24, 15], [17, 19], [30, 13.6]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1, 0, TAU); g.fill();
    });
    // two smaller stones tucked against its foot, overlapping
    apoly(g, [[6, 26, 3.5], [18, 24, 4], [22, 31, 3], [17, 37, 2.5], [6, 36.5, 2.5], [2, 31, 3]], '#565d66', { lw: 1.9, mid: 'rgba(18,20,24,0.14)', shade: 'rgba(18,20,24,0.24)', hi: 'rgba(220,228,240,0.16)' });
    apoly(g, [[36, 27, 3], [48, 25, 3.5], [53, 32, 2.5], [49, 37.5, 2.5], [38, 37.5, 2.5], [33, 32, 3]], '#3c4148', { lw: 1.9, mid: 'rgba(12,14,18,0.16)', shade: 'rgba(12,14,18,0.26)', hi: 'rgba(200,210,225,0.14)' });
    // contact shadows tucked where stone meets stone
    blob(g, 20, 26.5, 5, 1.6, 'rgba(8,8,10,0.35)', { flat: true, noline: true });
    blob(g, 38, 28.5, 5, 1.6, 'rgba(8,8,10,0.35)', { flat: true, noline: true });
    // lichen freckles on the near faces
    g.fillStyle = 'rgba(200,208,190,0.5)';
    [[10, 30], [14, 33], [44, 30], [48, 33.6]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 0.9, 0, TAU); g.fill();
    });
  });

  P.mosslog = () => mk(64, 36, (g) => {
    blob(g, 32, 33, 28, 3, 'rgba(8,6,3,0.3)', { flat: true, noline: true });
    // the fallen trunk, settled into the ground
    apoly(g, [[4, 14, 5], [56, 12, 5], [60, 17, 4], [60, 26, 4], [56, 31, 4], [6, 32, 4], [2, 25, 4]], '#4a3018', { lw: LW_SIL, mid: 'rgba(14,7,3,0.18)', shade: 'rgba(14,7,3,0.28)', hi: 'rgba(160,110,60,0.14)' });
    g.strokeStyle = 'rgba(20,10,4,0.55)'; g.lineWidth = 1.1; g.lineCap = 'round';
    [[10, 17, 46, 2], [12, 22, 40, -1.5], [16, 27, 36, 1]].forEach(f => {
      g.beginPath(); g.moveTo(f[0], f[1]); g.quadraticCurveTo(f[0] + f[2] / 2, f[1] + f[3], f[0] + f[2], f[1]); g.stroke();
    });
    // sawn end with rings
    blob(g, 58, 21.5, 4.6, 7.4, '#c9a86a', { lw: 1.8 });
    g.strokeStyle = '#8a6138'; g.lineWidth = 0.9;
    g.beginPath(); g.ellipse(58, 21.5, 2.9, 4.8, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(58, 21.5, 1.3, 2.3, 0, 0, TAU); g.stroke();
    // the moss blanket draped over the top, bark still owning the belly
    apoly(g, [[4, 13.5, 4], [56, 11.5, 4], [58, 15.5, 3], [40, 17.5, 4], [20, 18.5, 4], [4, 17.5, 4]], '#2c3a1e', { lw: 1.4, mid: 'rgba(12,18,8,0.2)', shade: 'rgba(12,18,8,0.26)', hi: 'rgba(150,190,90,0.16)' });
    furRow(g, 7, 17.6, 55, 15.4, 11, 3.2, 3.6, Math.PI, ['#33432a', '#2c3a1e'], null);
    furRow(g, 12, 14.2, 50, 12.6, 7, 3, 3.2, Math.PI - 0.2, ['#3c5026', '#33432a'], { hi: 'rgba(170,210,110,0.3)' });
    g.fillStyle = '#4c6030';
    [[14, 15.6], [28, 14.8], [42, 14]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1, 0, TAU); g.fill();
    });
    // tiny mushrooms sheltering against the trunk
    const nub = (x, y, s, cap) => {
      g.fillStyle = '#d8cfba'; g.strokeStyle = '#140a08'; g.lineWidth = 0.8;
      g.beginPath(); g.roundRect(x - s * 0.3, y - s, s * 0.6, s, s * 0.28); g.fill(); g.stroke();
      blob(g, x, y - s, s * 0.95, s * 0.6, cap, { lw: 0.9, line: '#140a08' });
      g.fillStyle = 'rgba(240,230,210,0.85)';
      g.beginPath(); g.arc(x - s * 0.25, y - s * 1.15, s * 0.14, 0, TAU); g.fill();
    };
    nub(12, 32.5, 4, '#a83226');
    nub(19, 33.5, 3, '#d4402c');
    nub(48, 32, 3.4, '#b98a3c');
    // a few grass blades against the shade side
    g.strokeStyle = '#2b4023'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(6, 32); g.quadraticCurveTo(4.5, 26, 6, 21.5); g.stroke();
    g.beginPath(); g.moveTo(52, 31); g.quadraticCurveTo(54, 26.5, 53, 23); g.stroke();
  });

  // Standalone pines for room interiors: full trees, y sorted with the
  // cast, dense layered canopy over a narrow trunk footprint.
  P.conifer1 = () => mk(90, 150, (g) => {
    blob(g, 45, 146.5, 20, 3.4, 'rgba(8,10,5,0.32)', { flat: true, noline: true });
    // trunk and root flare first, the canopy hangs over it
    apoly(g, [[40, 90, 2], [50, 90, 2], [52, 138, 2], [58, 147, 1.5], [47, 143.5, 2], [43, 147, 2], [39, 143.5, 2], [32, 147, 1.5], [38, 138, 2]], '#33200f', { lw: 1.9, mid: 'rgba(8,4,2,0.2)', shade: 'rgba(8,4,2,0.3)', hi: 'rgba(120,80,40,0.14)' });
    g.strokeStyle = 'rgba(10,6,3,0.6)'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(43, 96); g.lineTo(42, 136); g.stroke();
    g.beginPath(); g.moveTo(47.5, 94); g.lineTo(48.5, 134); g.stroke();
    g.strokeStyle = 'rgba(255,170,90,0.12)'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(40.6, 98); g.lineTo(39.8, 134); g.stroke();
    // four canopy tiers, wide to narrow: carrying shape, inner shadow mass,
    // a soft inner fringe, then the outlined skirt fringe
    const tier = (cy, half, rise, col, dark, edge) => {
      apoly(g, [[45, cy - rise, 3], [45 + half, cy, 3], [45 + half * 0.55, cy + 4, 4], [45, cy + 2, 4], [45 - half * 0.55, cy + 4, 4], [45 - half, cy, 3]], col, { lw: 1.9, mid: 'rgba(6,10,4,0.16)', shade: 'rgba(6,10,4,0.26)' });
      blob(g, 45 - half * 0.3, cy - rise * 0.16, half * 0.38, rise * 0.24, dark, { flat: true, noline: true });
      blob(g, 45 + half * 0.32, cy - rise * 0.08, half * 0.34, rise * 0.2, dark, { flat: true, noline: true });
      furRow(g, 45 - half * 0.76, cy - 3, 45 + half * 0.76, cy - 3, edge, 4.8, 5.6, Math.PI, [dark, col], null);
      furRow(g, 45 - half * 0.9, cy + 1.5, 45 + half * 0.9, cy + 1.5, edge + 4, 4.8, 6, Math.PI, [col, dark], { line: OUT, lw: 0.9 });
    };
    tier(104, 38, 30, '#16240f', '#0d1608', 9);
    tier(82, 31, 26, '#1a2b11', '#101c0a', 8);
    tier(60, 24, 22, '#1f3113', '#13230c', 7);
    tier(40, 17, 18, '#243617', '#16290f', 5);
    // the leader spike on top
    apoly(g, [[45, 5, 1.5], [54, 27, 2.5], [45, 23.5, 2.5], [36, 27, 2.5]], '#243617', { lw: 1.9, mid: 'rgba(6,10,4,0.14)', shade: 'rgba(6,10,4,0.22)' });
    // moonlit arcs along the west shoulder of each tier
    g.strokeStyle = 'rgba(190,224,130,0.18)'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(12, 102); g.quadraticCurveTo(22, 88, 40, 78); g.stroke();
    g.beginPath(); g.moveTo(19, 80); g.quadraticCurveTo(27, 68, 41, 60); g.stroke();
    g.beginPath(); g.moveTo(26, 58); g.quadraticCurveTo(32, 48, 42, 41); g.stroke();
    g.beginPath(); g.moveTo(38, 25); g.quadraticCurveTo(41, 15, 45, 9); g.stroke();
  });

  P.conifer2 = () => mk(70, 120, (g) => {
    blob(g, 35, 117, 16, 3, 'rgba(8,10,5,0.32)', { flat: true, noline: true });
    apoly(g, [[31.5, 72, 2], [39.5, 72, 2], [41, 110, 2], [46, 118, 1.5], [37, 114.5, 2], [33, 118, 2], [25, 116, 1.5], [30, 110, 2]], '#2c1c10', { lw: 1.8, mid: 'rgba(8,4,2,0.2)', shade: 'rgba(8,4,2,0.3)', hi: 'rgba(120,80,40,0.13)' });
    g.strokeStyle = 'rgba(10,6,3,0.6)'; g.lineWidth = 1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 78); g.lineTo(33.4, 108); g.stroke();
    // three tiers with a slight lean in the leader
    const tier = (cy, half, rise, lean, col, dark, edge) => {
      apoly(g, [[35 + lean, cy - rise, 3], [35 + half, cy, 3], [35 + half * 0.52, cy + 3.6, 3.5], [35, cy + 1.8, 3.5], [35 - half * 0.52, cy + 3.6, 3.5], [35 - half, cy, 3]], col, { lw: 1.8, mid: 'rgba(6,10,4,0.16)', shade: 'rgba(6,10,4,0.26)' });
      blob(g, 35 - half * 0.28, cy - rise * 0.16, half * 0.36, rise * 0.24, dark, { flat: true, noline: true });
      blob(g, 35 + half * 0.3, cy - rise * 0.08, half * 0.32, rise * 0.2, dark, { flat: true, noline: true });
      furRow(g, 35 - half * 0.74, cy - 2.6, 35 + half * 0.74, cy - 2.6, edge, 4.4, 5, Math.PI, [dark, col], null);
      furRow(g, 35 - half * 0.88, cy + 1.2, 35 + half * 0.88, cy + 1.2, edge + 3, 4.4, 5.4, Math.PI, [col, dark], { line: OUT, lw: 0.85 });
    };
    tier(82, 30, 26, 2, '#15230e', '#0d1608', 8);
    tier(60, 23, 21, 3, '#1a2b11', '#101c0a', 6);
    tier(40, 16, 17, 3, '#213314', '#13230c', 5);
    apoly(g, [[39, 4, 1.5], [46, 25, 2.5], [38, 21.5, 2.5], [30, 25, 2.5]], '#243617', { lw: 1.8, mid: 'rgba(6,10,4,0.14)', shade: 'rgba(6,10,4,0.22)' });
    g.strokeStyle = 'rgba(190,224,130,0.17)'; g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(9, 80); g.quadraticCurveTo(18, 66, 32, 58); g.stroke();
    g.beginPath(); g.moveTo(16, 58); g.quadraticCurveTo(23, 47, 33, 41); g.stroke();
    g.beginPath(); g.moveTo(31, 22); g.quadraticCurveTo(34, 13, 38, 7); g.stroke();
    // one dead orange branch low on the shade side
    g.strokeStyle = '#5a3a1e'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(44, 86); g.quadraticCurveTo(52, 84, 57, 88); g.stroke();
    clump(g, 55, 88.5, 3, 4, 2.3, '#7a5024', { line: OUT, lw: 0.8 });
  });

  P.tallgrass = () => mk(40, 40, (g) => {
    blob(g, 20, 37.5, 15, 2.4, 'rgba(8,10,5,0.28)', { flat: true, noline: true });
    g.lineCap = 'round';
    const blade = (x, lean, hgt, col, w) => {
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.moveTo(x, 38);
      g.quadraticCurveTo(x + lean * 0.5, 38 - hgt * 0.6, x + lean, 38 - hgt);
      g.stroke();
    };
    // back rank darkest, mid rank, then seed stalks catching light
    [[8, -4, 26], [13, 2, 30], [18, -2, 33], [23, 3, 31], [28, -3, 28], [33, 4, 25]].forEach(b => blade(b[0], b[1], b[2], '#1e2d1a', 1.8));
    [[10, 3, 24], [15, -3, 28], [20, 4, 30], [25, -4, 27], [30, 2, 23]].forEach(b => blade(b[0], b[1], b[2], '#2b4023', 1.7));
    for (const s of [[14, 5, 32], [26, -5, 34]]) {
      blade(s[0], s[1], s[2], '#54622e', 1.3);
      const tx = s[0] + s[1], ty = 38 - s[2];
      g.strokeStyle = '#8c9448'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(tx, ty + 6); g.lineTo(tx + s[1] * 0.2, ty); g.stroke();
      g.strokeStyle = 'rgba(230,235,180,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(tx - 0.5, ty + 5); g.lineTo(tx + s[1] * 0.2 - 0.5, ty + 1); g.stroke();
    }
    // front rank lit, plus one long bent stem
    [[12, -2, 20], [17, 3, 24], [22, -3, 26], [27, 4, 22], [32, -2, 18]].forEach(b => blade(b[0], b[1], b[2], '#3c5a28', 1.6));
    g.strokeStyle = '#4c6c34'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(20, 38); g.quadraticCurveTo(24, 24, 33, 21); g.stroke();
    clump(g, 33.5, 21, 2, 3.4, 1.85, '#4c6c34', null);
  });

  P.sunflowerclump = () => mk(44, 60, (g) => {
    blob(g, 22, 57, 17, 2.8, 'rgba(8,10,5,0.3)', { flat: true, noline: true });
    const stem = (x0, x1, y1, w) => {
      g.strokeStyle = '#3d5226'; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, 58); g.quadraticCurveTo((x0 + x1) / 2 + 2, (58 + y1) / 2, x1, y1); g.stroke();
    };
    const leaf = (x, y, ang, s, col) => clump(g, x, y, s, s * 1.8, ang, col, { line: OUT, lw: 1 });
    const bloom = (x, y, r, face) => {
      for (let i = 0; i < 12; i++) {
        const a = face * 0.25 + i / 12 * TAU;
        clump(g, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.58, r * 0.42, r * 0.85, a + Math.PI / 2, i % 3 ? '#f4c542' : '#e3b341', { line: 'rgba(110,74,10,0.55)', lw: 0.8, hi: i % 4 === 0 ? 'rgba(255,244,190,0.5)' : null });
      }
      blob(g, x, y, r * 0.5, r * 0.48, '#4a3018', { lw: 1.2, mid: 'rgba(14,8,3,0.2)', shade: 'rgba(14,8,3,0.3)' });
      g.fillStyle = 'rgba(120,80,36,0.8)';
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + face;
        g.beginPath(); g.arc(x + Math.cos(a) * r * 0.28, y + Math.sin(a) * r * 0.26, r * 0.05 + 0.3, 0, TAU); g.fill();
      }
      g.fillStyle = 'rgba(255,236,190,0.5)';
      g.beginPath(); g.arc(x - r * 0.18, y - r * 0.18, r * 0.14, 0, TAU); g.fill();
    };
    // back bloom: smaller, turned aside
    stem(27, 33, 16, 2);
    leaf(31, 38, 1.2, 3.4, '#33512a');
    bloom(33, 14, 6.4, 2);
    // the side profile bud looking away
    stem(17, 9.5, 24, 1.8);
    leaf(12, 40, -1.1, 3.2, '#2c4420');
    g.save(); g.translate(9.5, 23); g.rotate(-0.5);
    clump(g, 4.6, 1.2, 3, 4.2, 2, '#33512a', { line: OUT, lw: 0.9 });
    lens(g, 0, 0, 5.6, 2.6, '#e3b341', 1);
    blob(g, -4.4, 0, 2.4, 2.6, '#4a3018', { lw: 1.1 });
    g.restore();
    // front bloom: the big face
    stem(21, 20, 32, 2.4);
    leaf(16, 46, -0.9, 4, '#3c5a28');
    leaf(25, 43, 0.95, 3.6, '#33512a');
    bloom(20, 30, 8.6, 0);
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
