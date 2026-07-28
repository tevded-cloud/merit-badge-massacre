// Merit Badge Massacre: dialogue portraits. Half body character art for the
// camp dialog box, drawn in code like everything else and baked lazily at
// high resolution the first time a speaker opens their mouth. Same doctrine
// as js/sprites.js (ART_STYLE.md and its amendment are binding), at portrait
// scale: this is the one place hundreds of draw ops per face is the point.
//
// API: Portraits.get(id, expression) returns a baked canvas or null.
//      Portraits.has(id). Portraits.idFor(speakerName) maps the dialog's
//      speaker string to a portrait id (or null, meaning no card).
// Expressions: neutral, warm, alarmed, plus a signature per character
// (brock deadpan, max determined, junie grin, gus serene, quartermaster
// disapproval, critter tilt). 'signature' resolves per character. 'closeup'
// is the rare comedy macro (SpongeBob rules): built for brock, junie, gus
// and the critter; anyone else falls back to their signature.
'use strict';

const Portraits = (() => {
  const TAU = Math.PI * 2;
  const OUT = '#181008';
  const LW_SIL = 2.4;   // silhouette edge weight
  const LW_INT = 1.0;   // interior detail weight
  const PW = 220, PH = 260, SS = 3;

  // ---------------- house helpers, portrait local ----------------
  // Same five level lighting and rounded polygon language as sprites.js.
  // mk() there is private to SPR, so the portrait shop owns its own copies.

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
      g.strokeStyle = o.rim; g.lineWidth = o.rimW || 3; g.lineCap = 'round';
      g.beginPath();
      g.ellipse(cx, cy, Math.max(1, rx - 1.6), Math.max(1, ry - 1.6), 0, Math.PI * 1.02, Math.PI * 1.82);
      g.stroke();
    }
  }

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

  function furRow(g, x0, y0, x1, y1, n, w2, len, ang, cols, o) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      clump(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w2, len, ang, cols[i % cols.length], o);
    }
  }

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

  // ---------------- portrait face vocabulary ----------------

  // A portrait grade eye: layered iris, pupil, twin wet speculars, lower lid
  // light. o: iris, ring (a pale outer ring for eyes sitting on dark fur),
  // wide (sclera almond behind, whites showing), pr (pupil radius factor),
  // px/py (look offset), lid (0..1 upper lid coverage), lidFill, fleck (warm
  // fire fleck low in the iris), spark (extra star glints for peak cute).
  function pEye(g, x, y, r, o) {
    o = o || {};
    if (o.wide) {
      g.beginPath(); g.ellipse(x, y, r * 1.5, r * 1.28, 0, 0, TAU);
      g.fillStyle = o.sclera || '#f2ecdf'; g.fill();
      g.lineWidth = LW_INT + 0.4; g.strokeStyle = OUT; g.stroke();
    }
    const ir = o.wide ? r * 0.72 : r;
    if (o.ring && !o.wide) {
      g.beginPath(); g.ellipse(x, y, ir + 1.6, ir * 1.04 + 1.6, 0, 0, TAU);
      g.strokeStyle = o.ring; g.lineWidth = 1.6; g.stroke();
    }
    g.beginPath(); g.ellipse(x, y, ir, ir * 1.04, 0, 0, TAU);
    g.fillStyle = o.iris || '#4a3320'; g.fill();
    g.lineWidth = LW_INT; g.strokeStyle = OUT; g.stroke();
    g.save();
    g.beginPath(); g.ellipse(x, y, ir, ir * 1.04, 0, 0, TAU); g.clip();
    g.fillStyle = 'rgba(20,10,4,0.5)';
    g.beginPath(); g.ellipse(x, y - ir * 0.58, ir * 1.12, ir * 0.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,196,120,0.26)';
    g.beginPath(); g.ellipse(x, y + ir * 0.48, ir * 0.72, ir * 0.5, 0, 0, TAU); g.fill();
    if (o.fleck) {
      g.fillStyle = o.fleck;
      g.beginPath(); g.ellipse(x + ir * 0.3, y + ir * 0.42, ir * 0.2, ir * 0.3, 0.3, 0, TAU); g.fill();
    }
    g.restore();
    const pr = ir * (o.pr != null ? o.pr : 0.52);
    g.beginPath();
    g.ellipse(x + (o.px || 0), y + (o.py || 0), pr, pr * 1.06, 0, 0, TAU);
    g.fillStyle = '#160d06'; g.fill();
    g.fillStyle = 'rgba(255,252,244,0.95)';
    g.beginPath(); g.arc(x - ir * 0.34, y - ir * 0.38, ir * 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,240,220,0.8)';
    g.beginPath(); g.arc(x + ir * 0.4, y + ir * 0.42, ir * 0.16, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,236,205,0.55)';
    g.lineWidth = Math.max(1, ir * 0.16); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + ir * 0.16, ir * 1.14, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
    if (o.spark) {
      glint(g, x - ir * 0.05, y - ir * 0.62, ir * 0.2);
      glint(g, x + ir * 0.55, y - ir * 0.1, ir * 0.13);
    }
    if (o.lid) {
      const R = (o.wide ? r * 1.5 : ir) + 1;
      const RY = (o.wide ? r * 1.28 : ir * 1.04) + 1;
      const yEdge = y - RY + o.lid * RY * 2;
      g.save();
      g.beginPath(); g.ellipse(x, y, R, RY, 0, 0, TAU); g.clip();
      g.fillStyle = o.lidFill || '#caa07a';
      g.fillRect(x - R - 1, y - RY - 1, R * 2 + 2, yEdge - (y - RY) + 1);
      g.restore();
      g.strokeStyle = OUT; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - R, yEdge - 1);
      g.quadraticCurveTo(x, yEdge + r * 0.16, x + R, yEdge - 1);
      g.stroke();
    }
  }

  // Closed happy crescent: the top arc of a circle, thick and warm.
  function happyEye(g, x, y, r, col) {
    g.strokeStyle = col || OUT; g.lineWidth = Math.max(2.6, r * 0.4); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + r * 0.55, r, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
  }

  // Closed content line: a soft downward curve, mid snack serenity grade.
  function sereneEye(g, x, y, r, col) {
    g.strokeStyle = col || OUT; g.lineWidth = Math.max(2.4, r * 0.34); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 0.6, x + r, y); g.stroke();
  }

  function browArc(g, x0, y0, cx2, cy2, x1, y1, w, col) {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx2, cy2, x1, y1); g.stroke();
  }

  function sweat(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y - s);
    g.quadraticCurveTo(x + s * 0.95, y + s * 0.3, x, y + s * 0.75);
    g.quadraticCurveTo(x - s * 0.95, y + s * 0.3, x, y - s);
    g.closePath();
    g.fillStyle = '#7ec8e8'; g.fill();
    g.lineWidth = LW_INT; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.arc(x - s * 0.24, y - s * 0.08, s * 0.22, 0, TAU); g.fill();
  }

  // Four point star glint, for wet eyes and peak cute.
  function glint(g, x, y, r, col) {
    g.fillStyle = col || 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    g.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    g.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    g.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    g.closePath(); g.fill();
  }

  // Soft campfire glow pooled behind every portrait, so the card reads as a
  // face lit by the fire the conversation happens around.
  function glowBack(g, warm) {
    const grd = g.createRadialGradient(PW / 2, 138, 24, PW / 2, 148, 128);
    grd.addColorStop(0, warm || 'rgba(255,184,96,0.16)');
    grd.addColorStop(1, 'rgba(255,184,96,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, PW, PH);
  }

  // ---------------- shared costume pieces ----------------

  // Campaign hat at portrait scale: crisp wedge brim, peaked crown with a
  // montana crease, dark band with a small brass pin, stitch run on the brim.
  function campaignHat(g, cx, browY, w) {
    const brimY = browY, ry = w * 0.095;
    lens(g, cx, brimY, w, ry, '#7a5230', 2.2);
    apoly(g, [
      [cx - w * 0.42, brimY - ry * 0.4, 7],
      [cx - w * 0.17, brimY - w * 0.5, 6],
      [cx + w * 0.17, brimY - w * 0.5, 6],
      [cx + w * 0.42, brimY - ry * 0.4, 7],
    ], '#7a5230', { lw: 2.2, rim: 'rgba(255,214,150,0.35)' });
    // montana crease: center dent plus two side pinches
    g.strokeStyle = '#54371e'; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, brimY - w * 0.46); g.lineTo(cx, brimY - w * 0.16); g.stroke();
    g.beginPath(); g.moveTo(cx - w * 0.14, brimY - w * 0.42); g.quadraticCurveTo(cx - w * 0.1, brimY - w * 0.3, cx - w * 0.12, brimY - w * 0.2); g.stroke();
    g.beginPath(); g.moveTo(cx + w * 0.14, brimY - w * 0.42); g.quadraticCurveTo(cx + w * 0.1, brimY - w * 0.3, cx + w * 0.12, brimY - w * 0.2); g.stroke();
    // band with a brass pin
    apoly(g, [
      [cx - w * 0.36, brimY - ry * 0.9, 2], [cx + w * 0.36, brimY - ry * 0.9, 2],
      [cx + w * 0.38, brimY + ry * 0.35, 2], [cx - w * 0.38, brimY + ry * 0.35, 2],
    ], '#54371e', { flat: true, lw: LW_INT });
    star5(g, cx + w * 0.24, brimY - ry * 0.2, w * 0.045);
    g.fillStyle = '#e3b341'; g.fill();
    g.strokeStyle = 'rgba(90,60,10,0.8)'; g.lineWidth = 0.8; g.stroke();
    // stitch run along the brim edge
    g.strokeStyle = 'rgba(84,55,30,0.75)'; g.lineWidth = 1; g.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const t = -0.86 + i * 0.172;
      const sx = cx + t * w * 0.92;
      const sy = brimY + Math.sqrt(Math.max(0, 1 - (t * 0.92) * (t * 0.92))) * ry * 1.5 - 0.6;
      g.beginPath(); g.moveTo(sx - 1.6, sy); g.lineTo(sx + 1.6, sy); g.stroke();
    }
    // sun catch along the left brim
    g.strokeStyle = 'rgba(255,224,170,0.4)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - w * 0.86, brimY + ry * 0.4); g.quadraticCurveTo(cx - w * 0.4, brimY - ry * 0.9, cx - w * 0.05, brimY - ry); g.stroke();
  }

  // Scout torso, shoulders to the frame's bottom edge: uniform shirt with a
  // real shoulder line, collar, kerchief with a proper square knot, pocket
  // flaps, badge sash dots. o: shirt, shirtD (seam tone), kerchief, skin,
  // wide, knotRot, after (hook for character business painted over the top).
  function scoutTorso(g, o) {
    const cx = PW / 2, wide = o.wide ? 1.18 : 1;
    const shx = 76 * wide;
    // upper arms hinted at the frame edges
    blob(g, cx - shx - 4, 232, 22, 42, o.shirt, { rot: 0.14, lw: LW_SIL });
    blob(g, cx + shx + 4, 232, 22, 42, o.shirt, { rot: -0.14, lw: LW_SIL });
    // the torso itself
    apoly(g, [
      [cx - shx, 196, 12], [cx - 30, 182, 9], [cx + 30, 182, 9], [cx + shx, 196, 12],
      [cx + shx + 8, 244, 8], [cx + shx + 10, 266, 2], [cx - shx - 10, 266, 2], [cx - shx - 8, 244, 8],
    ], o.shirt, { rim: 'rgba(255,240,200,0.4)', mid: 'rgba(60,42,18,0.12)', shade: 'rgba(60,42,18,0.2)' });
    // shoulder seams and fabric folds
    g.strokeStyle = o.shirtD || 'rgba(40,26,12,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - shx + 8, 200); g.quadraticCurveTo(cx - shx + 18, 226, cx - shx + 12, 258); g.stroke();
    g.beginPath(); g.moveTo(cx + shx - 8, 200); g.quadraticCurveTo(cx + shx - 18, 226, cx + shx - 12, 258); g.stroke();
    g.beginPath(); g.moveTo(cx - 26, 236); g.quadraticCurveTo(cx - 18, 244, cx - 22, 258); g.stroke();
    g.beginPath(); g.moveTo(cx + 24, 240); g.quadraticCurveTo(cx + 30, 250, cx + 26, 260); g.stroke();
    // pocket flaps with button dots
    for (const s of [-1, 1]) {
      const px = cx + s * 40 * wide;
      apoly(g, [[px - 15, 234, 2], [px + 15, 234, 2], [px + 14, 246, 2], [px - 14, 246, 2]],
        o.shirt, { flat: true, lw: LW_INT, line: 'rgba(40,26,12,0.5)' });
      g.strokeStyle = 'rgba(40,26,12,0.5)'; g.lineWidth = LW_INT;
      g.beginPath(); g.moveTo(px - 14, 240); g.lineTo(px + 14, 240); g.stroke();
      g.fillStyle = 'rgba(24,16,8,0.6)';
      g.beginPath(); g.arc(px, 243, 1.8, 0, TAU); g.fill();
    }
    // badge dots marching up the left chest, each with a stitch ring
    for (let i = 0; i < 3; i++) {
      const bx = cx - 34 + i * 15, by = 216 + i * 9;
      g.fillStyle = '#f4c542';
      g.beginPath(); g.arc(bx, by, 4.6, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(110,72,10,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.arc(bx, by, 4.6, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(90,60,10,0.5)';
      g.beginPath(); g.arc(bx, by, 3.1, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(bx - 1.4, by - 1.4, 1.3, 0, TAU); g.fill();
    }
    // collar points peeking at the shoulders
    apoly(g, [[cx - 42, 186, 2], [cx - 12, 184, 2], [cx - 30, 204, 2]], 'rgba(255,244,214,0.55)', { flat: true, lw: LW_INT, line: 'rgba(60,42,18,0.4)' });
    apoly(g, [[cx + 42, 186, 2], [cx + 12, 184, 2], [cx + 30, 204, 2]], 'rgba(255,244,214,0.55)', { flat: true, lw: LW_INT, line: 'rgba(60,42,18,0.4)' });
    // neck with jaw shadow, tucked behind the kerchief
    apoly(g, [[cx - 14, 158, 4], [cx + 14, 158, 4], [cx + 16, 192, 4], [cx - 16, 192, 4]], o.skin, { flat: true, noline: true });
    blob(g, cx, 165, 16, 6, 'rgba(120,66,30,0.28)', { flat: true, noline: true });
    // kerchief: sharp triangle, fold shadow, square knot with a highlight
    g.save();
    if (o.knotRot) { g.translate(cx, 196); g.rotate(o.knotRot); g.translate(-cx, -196); }
    apoly(g, [[cx - 46, 182, 4], [cx + 46, 182, 4], [cx, 238, 3]], o.kerchief, { lw: 2, rim: 'rgba(255,220,190,0.3)' });
    g.strokeStyle = 'rgba(20,8,6,0.4)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(cx - 26, 196); g.lineTo(cx, 222); g.lineTo(cx + 26, 196); g.stroke();
    g.beginPath(); g.moveTo(cx - 12, 190); g.lineTo(cx - 2, 206); g.stroke();
    apoly(g, [[cx - 11, 188, 3], [cx + 11, 188, 3], [cx + 9, 208, 3], [cx - 9, 208, 3]], o.kerchief, { lw: 1.6, mid: 'rgba(20,8,6,0.2)', shade: 'rgba(20,8,6,0.3)' });
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx - 7, 193); g.lineTo(cx + 7, 193); g.stroke();
    g.strokeStyle = 'rgba(20,8,6,0.45)'; g.lineWidth = LW_INT;
    g.beginPath(); g.moveTo(cx - 6, 199); g.lineTo(cx + 6, 199); g.stroke();
    g.restore();
    if (o.after) o.after(g, cx, wide);
  }

  // Scout head: structured but soft, ears, forehead light, cheek shade,
  // button nose, blush. Eyes, brows and mouth belong to the face layer.
  function scoutHead(g, o) {
    const cx = PW / 2;
    const jw = o.jw || 54;   // jaw half width
    // ears with an inner shade
    blob(g, cx - jw - 5, 106, 10, 14, o.skin, { lw: 2 });
    blob(g, cx + jw + 5, 106, 10, 14, o.skin, { lw: 2 });
    blob(g, cx - jw - 5, 107, 4.4, 7, 'rgba(120,66,30,0.3)', { flat: true, noline: true });
    blob(g, cx + jw + 5, 107, 4.4, 7, 'rgba(120,66,30,0.3)', { flat: true, noline: true });
    apoly(g, [
      [cx - jw, 44, 22], [cx + jw, 44, 22],
      [cx + jw + 6, 96, 14], [cx + jw - 10, 140, 12], [cx, 158, 10], [cx - jw + 10, 140, 12], [cx - jw - 6, 96, 14],
    ], o.skin, { rim: 'rgba(255,152,70,0.5)', hi: 'rgba(255,244,214,0.22)', mid: 'rgba(120,66,30,0.1)', shade: 'rgba(120,66,30,0.16)' });
    blob(g, cx, 62, 36, 12, 'rgba(255,244,214,0.3)', { flat: true, noline: true });
    // cheek planes and chin dimple
    blob(g, cx - jw + 14, 124, 12, 8, 'rgba(120,66,30,0.1)', { flat: true, noline: true });
    blob(g, cx + jw - 14, 124, 12, 8, 'rgba(120,66,30,0.1)', { flat: true, noline: true });
    g.strokeStyle = 'rgba(140,90,60,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - 4, 149); g.quadraticCurveTo(cx, 151, cx + 4, 149); g.stroke();
    // little nose
    g.strokeStyle = 'rgba(140,90,60,0.6)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - 2.4, 116); g.quadraticCurveTo(cx + 2.6, 121, cx + 1.6, 113); g.stroke();
    g.fillStyle = 'rgba(255,244,214,0.4)';
    g.beginPath(); g.arc(cx - 1, 114, 1.4, 0, TAU); g.fill();
    // blush
    blob(g, cx - jw + 16, 132, 10, 5.5, o.blush || 'rgba(232,120,100,0.35)', { flat: true, noline: true });
    blob(g, cx + jw - 16, 132, 10, 5.5, o.blush || 'rgba(232,120,100,0.35)', { flat: true, noline: true });
  }

  // Standard scout eye line: both eyes plus the mouth zone constants.
  const EY = 103, EXL = 88, EXR = 132, MY = 138;

  // ---------------- the cast ----------------
  const CHARS = {};

  // ======================================================== BROCK =========
  // Grizzled badger scoutmaster. Thirty years on the ridge and every one of
  // them is in the face: stripes going grey at the edges, a notched ear, a
  // brow scar, and the campaign hat that outlived Troop 12.
  const BK = {
    body: '#6e6a62', bodyL: '#8a867c', head: '#8a867c', stripe: '#2e2a26',
    blaze: '#e6ded0', sash: '#3f6b35', grizzle: '#b9b4a8',
  };

  CHARS.brock = {
    base(g) {
      glowBack(g);
      // torso: settled shoulders, a chest that has carried packs
      apoly(g, [
        [30, 200, 14], [72, 184, 10], [110, 180, 10], [148, 184, 10], [190, 200, 14],
        [202, 240, 8], [206, 266, 2], [14, 266, 2], [18, 240, 8],
      ], BK.body, { rim: 'rgba(152,196,246,0.4)', mid: 'rgba(28,26,22,0.13)', shade: 'rgba(28,26,22,0.22)' });
      blob(g, 110, 234, 48, 36, BK.bodyL, { flat: true, noline: true });
      furRow(g, 76, 214, 144, 214, 6, 9, 10, 0, ['#7c7870', '#6e6a62'], null);
      furRow(g, 72, 232, 148, 232, 6, 9.5, 11, 0, ['#8a867c', '#7c7870'], { hi: 'rgba(230,222,208,0.35)' });
      furRow(g, 76, 250, 144, 250, 5, 10, 11, 0, ['#7c7870', '#6e6a62'], null);
      // collar ruff ringing the neck, outer clumps breaking the silhouette
      clump(g, 40, 196, 12, 14, -2.2, '#7c7870', { line: OUT, lw: 1.6 });
      clump(g, 52, 188, 12, 13, -1.9, '#8a867c', { line: OUT, lw: 1.6 });
      clump(g, 180, 196, 12, 14, 2.2, '#7c7870', { line: OUT, lw: 1.6 });
      clump(g, 168, 188, 12, 13, 1.9, '#8a867c', { line: OUT, lw: 1.6 });
      furRow(g, 68, 182, 152, 182, 6, 10, 10, Math.PI, ['#8a867c', '#7c7870'], null);
      // merit sash: the green accent, stitched edges, three earned badges
      g.save();
      g.beginPath();
      g.moveTo(44, 190); g.lineTo(76, 182); g.lineTo(172, 262); g.lineTo(138, 268); g.closePath();
      g.fillStyle = BK.sash; g.fill();
      g.clip();
      g.fillStyle = 'rgba(20,30,14,0.35)'; g.fillRect(90, 210, 100, 70);
      g.fillStyle = 'rgba(230,240,220,0.14)'; g.fillRect(40, 178, 60, 40);
      g.restore();
      g.beginPath();
      g.moveTo(44, 190); g.lineTo(76, 182); g.lineTo(172, 262); g.lineTo(138, 268); g.closePath();
      g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(230,240,220,0.45)'; g.lineWidth = 1.1; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const t = 0.1 + i * 0.13;
        const sx = 60 + (155 - 60) * t, sy = 186 + (265 - 186) * t;
        g.beginPath(); g.moveTo(sx - 3, sy + 3); g.lineTo(sx - 6, sy + 6); g.stroke();
        g.beginPath(); g.moveTo(sx + 26, sy - 14); g.lineTo(sx + 29, sy - 17); g.stroke();
      }
      [[86, 208], [110, 226], [134, 244]].forEach((b, i) => {
        g.fillStyle = '#f4c542';
        g.beginPath(); g.arc(b[0], b[1], 6.5, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(110,72,10,0.8)'; g.lineWidth = 1.1;
        g.beginPath(); g.arc(b[0], b[1], 6.5, 0, TAU); g.stroke();
        g.beginPath(); g.arc(b[0], b[1], 4.4, 0, TAU); g.stroke();
        if (i === 0) { star5(g, b[0], b[1], 2.6); g.fillStyle = 'rgba(110,72,10,0.85)'; g.fill(); }
        if (i === 1) { g.strokeStyle = 'rgba(110,72,10,0.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(b[0] - 2.4, b[1] + 2); g.lineTo(b[0], b[1] - 2.4); g.lineTo(b[0] + 2.4, b[1] + 2); g.stroke(); }
        if (i === 2) { g.fillStyle = 'rgba(110,72,10,0.85)'; g.beginPath(); g.arc(b[0], b[1], 1.8, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.65)';
        g.beginPath(); g.arc(b[0] - 2, b[1] - 2, 1.6, 0, TAU); g.fill();
      });
      // whistle on a braided lanyard
      g.strokeStyle = '#c9d2d8'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(88, 182); g.quadraticCurveTo(96, 218, 96, 240); g.stroke();
      g.strokeStyle = 'rgba(90,100,110,0.7)'; g.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const lx = 88 + (96 - 88) * t + Math.sin(t * 9) * 1.2, ly = 182 + 58 * t;
        g.beginPath(); g.moveTo(lx - 1.4, ly); g.lineTo(lx + 1.4, ly + 2); g.stroke();
      }
      blob(g, 96, 246, 6.5, 6.5, '#c9d2d8', { lw: 1.4 });
      g.fillStyle = '#3a3f46';
      g.beginPath(); g.arc(96, 246, 2.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.arc(94, 243.6, 1.4, 0, TAU); g.fill();
      // ears: the left one carries a notch that has a story
      apoly(g, [[66, 38, 4], [86, 42, 5], [90, 62, 6], [62, 70, 6], [57, 62, 1], [63, 57, 1], [54, 52, 5]], BK.head);
      apoly(g, [[166, 52, 5], [154, 38, 4], [134, 42, 5], [130, 62, 6], [158, 70, 6]], BK.head);
      blob(g, 71, 53, 6, 8, '#4a463f', { flat: true, noline: true, rot: -0.3 });
      blob(g, 149, 53, 6, 8, '#4a463f', { flat: true, noline: true, rot: 0.3 });
      // head: broad brow, heavy cheeks, the long badger wedge
      apoly(g, [
        [64, 46, 14], [110, 38, 16], [156, 46, 14], [170, 88, 12],
        [162, 122, 10], [138, 150, 9], [110, 160, 8], [82, 150, 9], [58, 122, 10], [50, 88, 12],
      ], BK.head, { rim: 'rgba(152,196,246,0.42)', mid: 'rgba(28,26,22,0.12)', shade: 'rgba(28,26,22,0.2)' });
      // badger stripes over the eye lines, greying at the edges
      apoly(g, [[70, 46, 6], [96, 43, 6], [96, 126, 5], [72, 118, 5]], BK.stripe, { flat: true, noline: true });
      apoly(g, [[124, 43, 6], [150, 46, 6], [148, 118, 5], [124, 126, 5]], BK.stripe, { flat: true, noline: true });
      // fur break ticks along the stripe edges
      g.fillStyle = BK.stripe;
      for (let i = 0; i < 6; i++) {
        const ty = 56 + i * 12;
        poly(g, [[96, ty], [101, ty + 3], [96, ty + 6]], BK.stripe, { noline: true });
        poly(g, [[124, ty], [119, ty + 3], [124, ty + 6]], BK.stripe, { noline: true });
        poly(g, [[72 + i * 0.4, ty + 2], [67 + i * 0.4, ty + 5], [72 + i * 0.4, ty + 8]], BK.stripe, { noline: true });
        poly(g, [[148 - i * 0.4, ty + 2], [153 - i * 0.4, ty + 5], [148 - i * 0.4, ty + 8]], BK.stripe, { noline: true });
      }
      // the center blaze, bright and clean
      apoly(g, [[102, 42, 4], [118, 42, 4], [117, 132, 5], [103, 132, 5]], BK.blaze, { flat: true, noline: true });
      blob(g, 110, 58, 8, 14, 'rgba(255,255,255,0.28)', { flat: true, noline: true });
      // grizzle: pale age hairs worked into the dark stripes and cheeks
      g.strokeStyle = BK.grizzle; g.lineWidth = 1.1; g.lineCap = 'round';
      [[76, 60, -0.4], [86, 74, -0.2], [80, 92, -0.5], [90, 108, -0.3], [142, 62, 0.4],
       [134, 78, 0.2], [140, 96, 0.5], [130, 110, 0.3], [66, 108, -0.6], [154, 108, 0.6],
       [88, 52, -0.3], [132, 52, 0.3]].forEach(h => {
        g.beginPath(); g.moveTo(h[0], h[1]);
        g.lineTo(h[0] + Math.cos(h[2] - Math.PI / 2) * 5, h[1] + Math.sin(h[2] - Math.PI / 2) * 5);
        g.stroke();
      });
      // cheek fur breaking the head silhouette
      clump(g, 56, 118, 9, 11, -1.9, '#9a968c', { line: OUT, lw: 1.5 });
      clump(g, 58, 130, 8, 10, -2.15, '#8a867c', { line: OUT, lw: 1.5 });
      clump(g, 164, 118, 9, 11, 1.9, '#9a968c', { line: OUT, lw: 1.5 });
      clump(g, 162, 130, 8, 10, 2.15, '#8a867c', { line: OUT, lw: 1.5 });
      // muzzle: cream, worn, a big wet nose that has smelled trouble
      blob(g, 110, 138, 30, 21, BK.blaze, { flat: true, noline: true });
      blob(g, 110, 150, 20, 9, 'rgba(120,110,92,0.25)', { flat: true, noline: true });
      apoly(g, [[97, 118, 6], [123, 118, 6], [110, 136, 5]], '#221a12', { lw: LW_INT });
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.arc(103, 122, 2.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.beginPath(); g.arc(114, 127, 1.4, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(20,12,6,0.55)'; g.lineWidth = 1;
      g.beginPath(); g.arc(104, 129, 2, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      g.beginPath(); g.arc(116, 129, 2, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      // whisker dots
      g.fillStyle = 'rgba(90,84,72,0.6)';
      [[88, 136], [84, 142], [90, 147], [132, 136], [136, 142], [130, 147]].forEach(d => {
        g.beginPath(); g.arc(d[0], d[1], 1.1, 0, TAU); g.fill();
      });
      // the brow scar: two pale ticks crossing the right stripe
      g.strokeStyle = '#cfc9bc'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(136, 66); g.lineTo(144, 74); g.stroke();
      g.beginPath(); g.moveTo(142, 66); g.lineTo(138, 74); g.stroke();
      // campaign hat, brim low over the brow
      campaignHat(g, 110, 46, 82);
    },
    faces: {
      neutral(g) {
        pEye(g, EXL - 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle });
        pEye(g, EXR + 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle });
        // the bags under thirty years of eyes
        g.strokeStyle = 'rgba(20,14,8,0.4)'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.arc(EXL - 2, 104, 13, Math.PI * 0.25, Math.PI * 0.72); g.stroke();
        g.beginPath(); g.arc(EXR + 2, 104, 13, Math.PI * 0.28, Math.PI * 0.75); g.stroke();
        browArc(g, EXL - 14, 84, EXL - 2, 81, EXL + 9, 84, 4, '#221c16');
        browArc(g, EXR - 9, 84, EXR + 2, 81, EXR + 14, 84, 4, '#221c16');
        g.strokeStyle = '#4a4038'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(102, 144); g.quadraticCurveTo(110, 146.5, 118, 144); g.stroke();
      },
      warm(g) {
        pEye(g, EXL - 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle, lid: 0.3, lidFill: '#3b362f' });
        pEye(g, EXR + 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle, lid: 0.3, lidFill: '#3b362f' });
        // smile lines lifting the bags
        g.strokeStyle = 'rgba(20,14,8,0.42)'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.arc(EXL - 4, 106, 12, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
        g.beginPath(); g.arc(EXR + 4, 106, 12, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
        browArc(g, EXL - 14, 82, EXL - 2, 78, EXL + 9, 82, 4, '#221c16');
        browArc(g, EXR - 9, 82, EXR + 2, 78, EXR + 14, 82, 4, '#221c16');
        g.strokeStyle = '#4a4038'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(98, 142); g.quadraticCurveTo(110, 149, 122, 142); g.stroke();
        g.beginPath(); g.moveTo(96, 141); g.lineTo(94, 138.5); g.stroke();
        g.beginPath(); g.moveTo(124, 141); g.lineTo(126, 138.5); g.stroke();
      },
      alarmed(g) {
        pEye(g, EXL - 2, 100, 10.5, { iris: '#6b5335', wide: true, pr: 0.4 });
        pEye(g, EXR + 2, 100, 10.5, { iris: '#6b5335', wide: true, pr: 0.4 });
        browArc(g, EXL - 14, 78, EXL - 2, 72, EXL + 10, 76, 4, '#221c16');
        browArc(g, EXR - 10, 76, EXR + 2, 72, EXR + 14, 78, 4, '#221c16');
        // brow tension over the blaze
        g.strokeStyle = 'rgba(20,14,8,0.5)'; g.lineWidth = 1.3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(106, 80); g.lineTo(104, 88); g.stroke();
        g.beginPath(); g.moveTo(114, 80); g.lineTo(116, 88); g.stroke();
        // mouth open a crack: something out there earned it
        g.fillStyle = '#221008';
        g.beginPath(); g.ellipse(110, 145, 8, 4.6, 0, 0, TAU); g.fill();
        g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
        g.fillStyle = '#fffdf6';
        g.fillRect(104, 141.4, 4, 2.6); g.fillRect(112, 141.4, 4, 2.6);
      },
      deadpan(g) {
        pEye(g, EXL - 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle, lid: 0.48, lidFill: '#3b362f', px: 1.2, pr: 0.46 });
        pEye(g, EXR + 2, 100, 10.5, { iris: '#6b5335', ring: BK.grizzle, lid: 0.48, lidFill: '#3b362f', px: 1.2, pr: 0.46 });
        g.strokeStyle = 'rgba(20,14,8,0.4)'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.arc(EXL - 2, 105, 13, Math.PI * 0.25, Math.PI * 0.72); g.stroke();
        g.beginPath(); g.arc(EXR + 2, 105, 13, Math.PI * 0.28, Math.PI * 0.75); g.stroke();
        // one brow up, one flat: the whole review in two lines
        browArc(g, EXL - 14, 84, EXL - 2, 83.5, EXL + 9, 84, 4, '#221c16');
        browArc(g, EXR - 9, 80, EXR + 2, 76.5, EXR + 14, 79, 4, '#221c16');
        g.strokeStyle = '#4a4038'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(101, 144.5); g.lineTo(119, 144.5); g.stroke();
      },
      // The macro deadpan: the stare, at parody grade magnification.
      closeup(g) {
        // the whole frame is badger: stripes, blaze, and disappointment
        g.fillStyle = BK.head; g.fillRect(0, 0, PW, PH);
        g.fillStyle = BK.stripe;
        g.fillRect(14, 0, 74, PH); g.fillRect(132, 0, 74, PH);
        g.fillStyle = BK.blaze; g.fillRect(96, 0, 28, PH);
        // individual fur strands over every band, rows of them
        for (let r = 0; r < 12; r++) {
          const y = 8 + r * 22;
          for (let i = 0; i < 26; i++) {
            const x = 4 + i * 8.6 + (r % 2) * 4;
            const inStripe = (x > 14 && x < 88) || (x > 132 && x < 206);
            const inBlaze = x > 96 && x < 124;
            g.strokeStyle = inBlaze ? 'rgba(200,190,170,0.7)' : inStripe ? 'rgba(70,64,56,0.8)' : 'rgba(154,150,140,0.7)';
            g.lineWidth = 1.4; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + 2, y + 9, x + 0.6, y + 17);
            g.stroke();
          }
        }
        // stray grey hairs catching the light, tips bright
        for (let i = 0; i < 9; i++) {
          const x = 20 + i * 22, y = 30 + (i % 3) * 70;
          g.strokeStyle = BK.grizzle; g.lineWidth = 1.8; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 6, x + 3, y + 16); g.stroke();
          g.fillStyle = 'rgba(255,250,238,0.9)';
          g.beginPath(); g.arc(x + 3, y + 16, 1.3, 0, TAU); g.fill();
        }
        // two enormous half lidded eyes
        for (const s of [-1, 1]) {
          const x = 110 + s * 52, y = 96;
          blob(g, x, y + 10, 46, 40, 'rgba(16,10,6,0.35)', { flat: true, noline: true });
          pEye(g, x, y, 40, { iris: '#6b5335', ring: BK.grizzle, lid: 0.52, lidFill: '#3b362f', px: s * 4, pr: 0.44 });
          // individual lash fur along the lid edge
          for (let i = 0; i < 11; i++) {
            const lx = x - 40 + i * 8;
            g.strokeStyle = '#221c16'; g.lineWidth = 2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(lx, y + 2.5); g.lineTo(lx - 1.5, y - 4); g.stroke();
          }
          // the bags, in geological layers
          g.strokeStyle = 'rgba(20,14,8,0.55)'; g.lineWidth = 2.4; g.lineCap = 'round';
          g.beginPath(); g.arc(x, y + 16, 48, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
          g.lineWidth = 1.6;
          g.beginPath(); g.arc(x, y + 24, 52, Math.PI * 0.33, Math.PI * 0.67); g.stroke();
          g.lineWidth = 1.1;
          g.beginPath(); g.arc(x, y + 32, 56, Math.PI * 0.36, Math.PI * 0.64); g.stroke();
        }
        // brow ledge with strand by strand fur, one hair out of line
        for (let i = 0; i < 30; i++) {
          const x = 16 + i * 6.4;
          g.strokeStyle = i % 2 ? '#221c16' : '#37302a'; g.lineWidth = 2.6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, 46); g.quadraticCurveTo(x + 3, 38, x + 7, 34); g.stroke();
        }
        g.strokeStyle = BK.grizzle; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(150, 42); g.quadraticCurveTo(158, 24, 152, 12); g.stroke();
        // the nose arrives from below, pored and damp
        apoly(g, [[74, 208, 16], [146, 208, 16], [160, 250, 12], [110, 268, 10], [60, 250, 12]], '#221a12', { lw: 2.2 });
        for (let i = 0; i < 46; i++) {
          const a = (i * 2.399963);
          const rr = 8 + (i * 7919 % 100) / 100 * 38;
          const px = 110 + Math.cos(a) * rr, py = 236 + Math.sin(a) * rr * 0.5;
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.beginPath(); g.arc(px, py, 1.1, 0, TAU); g.fill();
          g.fillStyle = 'rgba(120,110,100,0.25)';
          g.beginPath(); g.arc(px - 0.7, py - 0.7, 0.55, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.75)';
        g.beginPath(); g.ellipse(88, 222, 12, 7, -0.4, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath(); g.arc(134, 240, 4, 0, TAU); g.fill();
        // flat mouth line, barely in frame: no comment
        g.strokeStyle = OUT; g.lineWidth = 3;
        g.beginPath(); g.moveTo(96, 262); g.lineTo(150, 258); g.stroke();
      },
    },
  };

  // ========================================================== MAX =========
  // Squad leader. Eleven years old, about to be brave, and taking that very
  // seriously. Campaign hat like Brock's because of course it is.
  const MX = { skin: '#f0c294', lid: '#d99f6e', hair: '#6e4a26', hairHi: '#8a5f33', shirt: '#c9a86a', kerchief: '#c0392b' };

  CHARS.max = {
    base(g) {
      glowBack(g);
      scoutTorso(g, {
        shirt: MX.shirt, kerchief: MX.kerchief, skin: MX.skin,
        after(g2, cx) {
          // troop 13 shoulder patch, worn proudly on the right sleeve
          blob(g2, cx + 84, 218, 9, 11, '#5c7248', { flat: true, lw: 1.2, line: 'rgba(40,26,12,0.6)' });
          star5(g2, cx + 84, 217, 4.4);
          g2.fillStyle = '#f4c542'; g2.fill();
        },
      });
      scoutHead(g, { skin: MX.skin, jw: 52 });
      // tidy hair at the temples, a couple of wisps escaping the hat
      g.strokeStyle = MX.hair; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(58, 62); g.quadraticCurveTo(53, 74, 57, 86); g.stroke();
      g.beginPath(); g.moveTo(162, 62); g.quadraticCurveTo(167, 74, 163, 86); g.stroke();
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(64, 58); g.quadraticCurveTo(60, 68, 63, 78); g.stroke();
      g.beginPath(); g.moveTo(156, 58); g.quadraticCurveTo(160, 68, 157, 78); g.stroke();
      // fringe: a neat band of hair under the brim, a few points escaping
      apoly(g, [[64, 50, 3], [156, 50, 3], [152, 62, 2], [138, 57, 2], [124, 64, 2], [110, 57, 2], [96, 64, 2], [82, 57, 2], [68, 62, 2]], MX.hair, { flat: true, lw: 1.6 });
      g.strokeStyle = MX.hairHi; g.lineWidth = 1.4; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const x = 84 + i * 18;
        g.beginPath(); g.moveTo(x, 53); g.quadraticCurveTo(x + 3, 57, x + 2, 60); g.stroke();
      }
      campaignHat(g, 110, 48, 78);
    },
    faces: {
      neutral(g) {
        pEye(g, EXL, EY, 11, { iris: '#4a3320' });
        pEye(g, EXR, EY, 11, { iris: '#4a3320' });
        browArc(g, EXL - 12, 86, EXL, 84, EXL + 10, 86.5, 3, '#5c422e');
        browArc(g, EXR - 10, 86.5, EXR, 84, EXR + 12, 86, 3, '#5c422e');
        g.strokeStyle = '#8a5a3c'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(102, MY); g.quadraticCurveTo(110, MY + 2.5, 118, MY); g.stroke();
      },
      warm(g) {
        happyEye(g, EXL, EY, 11.5, '#3a2a1c');
        happyEye(g, EXR, EY, 11.5, '#3a2a1c');
        browArc(g, EXL - 12, 84, EXL, 81.5, EXL + 10, 84, 3, '#5c422e');
        browArc(g, EXR - 10, 84, EXR, 81.5, EXR + 12, 84, 3, '#5c422e');
        // open smile with a tooth glint
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(97, MY - 2); g.quadraticCurveTo(110, MY + 12, 123, MY - 2);
        g.quadraticCurveTo(110, MY + 3, 97, MY - 2);
        g.closePath(); g.fill();
        g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
        g.fillStyle = '#fffdf6';
        g.beginPath(); g.moveTo(101, MY - 0.8); g.quadraticCurveTo(110, MY + 2.6, 119, MY - 0.8);
        g.lineTo(117, MY + 1.6); g.quadraticCurveTo(110, MY + 4.4, 103, MY + 1.6); g.closePath(); g.fill();
        blob(g, 68, 130, 11, 6, 'rgba(232,120,100,0.45)', { flat: true, noline: true });
        blob(g, 152, 130, 11, 6, 'rgba(232,120,100,0.45)', { flat: true, noline: true });
      },
      alarmed(g) {
        pEye(g, EXL, EY, 11, { iris: '#4a3320', wide: true, pr: 0.38 });
        pEye(g, EXR, EY, 11, { iris: '#4a3320', wide: true, pr: 0.38 });
        browArc(g, EXL - 12, 80, EXL - 2, 74, EXL + 10, 78, 3, '#5c422e');
        browArc(g, EXR - 10, 78, EXR + 2, 74, EXR + 12, 80, 3, '#5c422e');
        g.fillStyle = '#472018';
        g.beginPath(); g.ellipse(110, MY + 3, 6.5, 8, 0, 0, TAU); g.fill();
        g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
        sweat(g, 160, 84, 6.5);
      },
      determined(g) {
        pEye(g, EXL, EY, 11, { iris: '#4a3320', lid: 0.24, lidFill: MX.lid, pr: 0.46 });
        pEye(g, EXR, EY, 11, { iris: '#4a3320', lid: 0.24, lidFill: MX.lid, pr: 0.46 });
        // brows driving in toward the nose
        browArc(g, EXL - 13, 82, EXL - 2, 84, EXL + 10, 90, 3.6, '#5c422e');
        browArc(g, EXR - 10, 90, EXR + 2, 84, EXR + 13, 82, 3.6, '#5c422e');
        g.strokeStyle = 'rgba(140,90,60,0.5)'; g.lineWidth = 1.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(106, 90); g.lineTo(104, 95); g.stroke();
        g.beginPath(); g.moveTo(114, 90); g.lineTo(116, 95); g.stroke();
        // mouth set: pressed line with grit at the corners
        g.strokeStyle = '#7a4a30'; g.lineWidth = 2.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(100, MY + 1); g.lineTo(120, MY + 1); g.stroke();
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(98, MY - 1.5); g.lineTo(100, MY + 1); g.stroke();
        g.beginPath(); g.moveTo(122, MY - 1.5); g.lineTo(120, MY + 1); g.stroke();
        g.strokeStyle = 'rgba(140,90,60,0.45)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(104, MY + 7); g.quadraticCurveTo(110, MY + 8.5, 116, MY + 7); g.stroke();
      },
    },
  };

  // ======================================================== JUNIE =========
  // The fire hazard. Orange everything, a slanted beret, a singed kerchief
  // tip, and a grin that arrives slightly before she does.
  const JN = {
    skin: '#e8b384', lid: '#caa07a', hair: '#d2692e', hairHi: '#f0914a', hairD: '#a84e1e',
    beret: '#3f6b35', beretD: '#2c4b25', shirt: '#5c7248', kerchief: '#d8722f',
  };

  CHARS.junie = {
    base(g) {
      glowBack(g, 'rgba(255,164,72,0.2)');
      scoutTorso(g, {
        shirt: JN.shirt, kerchief: JN.kerchief, skin: JN.skin, knotRot: 0.06,
        after(g2, cx) {
          // one scorch smudge on the left shoulder: an experiment, apparently
          blob(g2, cx - 62, 206, 13, 8, 'rgba(30,20,12,0.5)', { flat: true, noline: true, rot: 0.3 });
          blob(g2, cx - 58, 204, 6, 4, 'rgba(255,140,40,0.25)', { flat: true, noline: true });
          g2.strokeStyle = 'rgba(30,20,12,0.6)'; g2.lineWidth = 1; g2.lineCap = 'round';
          g2.beginPath(); g2.moveTo(cx - 72, 200); g2.lineTo(cx - 76, 195); g2.stroke();
          g2.beginPath(); g2.moveTo(cx - 66, 197); g2.lineTo(cx - 68, 192); g2.stroke();
          // the kerchief tip is singed too
          g2.fillStyle = 'rgba(40,24,12,0.75)';
          g2.beginPath(); g2.moveTo(cx - 5, 232); g2.lineTo(cx + 6, 230); g2.lineTo(cx, 239); g2.closePath(); g2.fill();
        },
      });
      // side falls of hair behind the head, down to the shoulders
      apoly(g, [[52, 78, 6], [66, 68, 5], [70, 150, 6], [64, 188, 6], [48, 182, 6], [44, 120, 8]], JN.hair, { mid: 'rgba(120,50,16,0.2)', shade: 'rgba(120,50,16,0.3)' });
      apoly(g, [[168, 78, 6], [154, 68, 5], [150, 150, 6], [156, 188, 6], [172, 182, 6], [176, 120, 8]], JN.hair, { mid: 'rgba(120,50,16,0.2)', shade: 'rgba(120,50,16,0.3)' });
      g.strokeStyle = JN.hairHi; g.lineWidth = 1.6; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(52 + i * 4, 84 + i * 6); g.quadraticCurveTo(50 + i * 4, 124, 54 + i * 4, 170 - i * 6); g.stroke();
        g.beginPath(); g.moveTo(168 - i * 4, 84 + i * 6); g.quadraticCurveTo(170 - i * 4, 124, 166 - i * 4, 170 - i * 6); g.stroke();
      }
      scoutHead(g, { skin: JN.skin, jw: 53, blush: 'rgba(232,120,100,0.4)' });
      // freckles across the nose bridge and cheeks
      g.fillStyle = 'rgba(150,90,50,0.55)';
      [[92, 118], [100, 122], [110, 124], [120, 122], [128, 118], [80, 126], [140, 126], [104, 116], [116, 116]].forEach(f => {
        g.beginPath(); g.arc(f[0], f[1], 1.5, 0, TAU); g.fill();
      });
      // a small bandage on the left cheekbone, worn like a medal
      g.save(); g.translate(74, 120); g.rotate(-0.3);
      g.fillStyle = '#e8cfa5'; g.fillRect(-9, -4, 18, 8);
      g.strokeStyle = 'rgba(120,86,50,0.7)'; g.lineWidth = 1; g.strokeRect(-9, -4, 18, 8);
      g.fillStyle = 'rgba(120,86,50,0.35)';
      [[-3, -1], [0, 1], [3, -1]].forEach(d => { g.beginPath(); g.arc(d[0], d[1], 0.8, 0, TAU); g.fill(); });
      g.restore();
      // jagged fringe: sawtooth points over the brow, alternating values
      const fr = [[60, 60, 3], [160, 60, 3], [156, 82, 2], [146, 72, 2], [134, 86, 2], [122, 73, 2], [110, 88, 2], [98, 73, 2], [86, 86, 2], [74, 72, 2], [64, 82, 2]];
      apoly(g, fr, JN.hair, { flat: true, lw: 1.8 });
      g.strokeStyle = JN.hairHi; g.lineWidth = 1.4; g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const x = 78 + i * 16;
        g.beginPath(); g.moveTo(x, 62); g.quadraticCurveTo(x + 4, 70, x + 2, 79 + (i % 2) * 5); g.stroke();
      }
      g.strokeStyle = JN.hairD; g.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const x = 86 + i * 16;
        g.beginPath(); g.moveTo(x, 64); g.quadraticCurveTo(x + 2, 70, x + 1, 76); g.stroke();
      }
      // flyaway strands breaking the silhouette: she has been near heat
      g.strokeStyle = JN.hair; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(62, 66); g.quadraticCurveTo(50, 58, 46, 46); g.stroke();
      g.beginPath(); g.moveTo(158, 66); g.quadraticCurveTo(168, 56, 174, 48); g.stroke();
      g.strokeStyle = JN.hairHi; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(63, 64); g.quadraticCurveTo(53, 57, 50, 48); g.stroke();
      // slanted beret with a stem and a rolled edge, one singe on the rim
      apoly(g, [[54, 56, 8], [96, 26, 9], [148, 34, 8], [166, 52, 6], [140, 62, 6], [70, 66, 6]], JN.beret, { lw: 2.2, rim: 'rgba(198,224,112,0.5)', mid: 'rgba(24,40,18,0.16)', shade: 'rgba(24,40,18,0.26)' });
      apoly(g, [[58, 56, 3], [70, 62, 3], [140, 58, 3], [162, 51, 3], [164, 56, 3], [140, 65, 3], [68, 69, 3]], JN.beretD, { flat: true, noline: true });
      blob(g, 104, 24, 4.5, 4.5, JN.beretD, { lw: 1.6 });
      g.strokeStyle = 'rgba(160,220,120,0.4)'; g.lineWidth = 1.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(66, 50); g.quadraticCurveTo(90, 34, 120, 32); g.stroke();
      blob(g, 158, 44, 5, 3.4, 'rgba(30,20,12,0.55)', { flat: true, noline: true, rot: 0.4 });
    },
    faces: {
      neutral(g) {
        pEye(g, EXL, EY + 1, 11.5, { iris: '#5a3a1a', fleck: 'rgba(255,150,60,0.75)' });
        pEye(g, EXR, EY + 1, 11.5, { iris: '#5a3a1a', fleck: 'rgba(255,150,60,0.75)' });
        browArc(g, EXL - 12, 86, EXL, 82.5, EXL + 10, 85, 3, JN.hairD);
        browArc(g, EXR - 10, 85, EXR, 82.5, EXR + 12, 86, 3, JN.hairD);
        // small smile, already loading
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(101, MY); g.quadraticCurveTo(110, MY + 7, 119, MY);
        g.quadraticCurveTo(110, MY + 2, 101, MY);
        g.closePath(); g.fill();
        g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
      },
      warm(g) {
        happyEye(g, EXL, EY + 1, 12, '#3a2a1c');
        happyEye(g, EXR, EY + 1, 12, '#3a2a1c');
        browArc(g, EXL - 12, 84, EXL, 80.5, EXL + 10, 83, 3, JN.hairD);
        browArc(g, EXR - 10, 83, EXR, 80.5, EXR + 12, 84, 3, JN.hairD);
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(96, MY - 2); g.quadraticCurveTo(110, MY + 13, 124, MY - 2);
        g.quadraticCurveTo(110, MY + 3, 96, MY - 2);
        g.closePath(); g.fill();
        g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
        g.fillStyle = '#fffdf6';
        g.beginPath(); g.moveTo(100, MY - 0.6); g.quadraticCurveTo(110, MY + 3, 120, MY - 0.6);
        g.lineTo(118, MY + 2); g.quadraticCurveTo(110, MY + 5, 102, MY + 2); g.closePath(); g.fill();
        blob(g, 68, 131, 11, 6, 'rgba(232,120,100,0.5)', { flat: true, noline: true });
        blob(g, 152, 131, 11, 6, 'rgba(232,120,100,0.5)', { flat: true, noline: true });
      },
      alarmed(g) {
        // Junie's alarm is halfway to delight: huge eyes, tiny pupils
        pEye(g, EXL, EY + 1, 11.5, { iris: '#5a3a1a', wide: true, pr: 0.3, fleck: 'rgba(255,150,60,0.85)' });
        pEye(g, EXR, EY + 1, 11.5, { iris: '#5a3a1a', wide: true, pr: 0.3, fleck: 'rgba(255,150,60,0.85)' });
        browArc(g, EXL - 12, 78, EXL, 73, EXL + 10, 77, 3, JN.hairD);
        browArc(g, EXR - 10, 77, EXR, 73, EXR + 12, 78, 3, JN.hairD);
        // wavy open mouth: is this bad? is this GREAT?
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(100, MY + 1);
        g.quadraticCurveTo(105, MY - 2, 110, MY + 1);
        g.quadraticCurveTo(115, MY + 4, 120, MY + 1);
        g.quadraticCurveTo(119, MY + 9, 110, MY + 10);
        g.quadraticCurveTo(101, MY + 9, 100, MY + 1);
        g.closePath(); g.fill();
        g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
      },
      grin(g) {
        // the too wide grin: cheek to cheek, every tooth reporting for duty
        pEye(g, EXL, EY, 11.5, { iris: '#5a3a1a', wide: true, pr: 0.3, fleck: 'rgba(255,150,60,0.9)' });
        pEye(g, EXR, EY, 11.5, { iris: '#5a3a1a', wide: true, pr: 0.3, fleck: 'rgba(255,150,60,0.9)' });
        browArc(g, EXL - 13, 79, EXL, 74, EXL + 10, 78, 3, JN.hairD);
        browArc(g, EXR - 10, 78, EXR, 74, EXR + 13, 79, 3, JN.hairD);
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(76, 132); g.quadraticCurveTo(110, 158, 144, 132);
        g.quadraticCurveTo(110, 140, 76, 132);
        g.closePath(); g.fill();
        g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
        // the tooth row, individually accounted for
        g.save();
        g.beginPath();
        g.moveTo(76, 132); g.quadraticCurveTo(110, 158, 144, 132);
        g.quadraticCurveTo(110, 140, 76, 132);
        g.closePath(); g.clip();
        g.fillStyle = '#fffdf6';
        g.beginPath(); g.moveTo(76, 130); g.quadraticCurveTo(110, 140, 144, 130); g.lineTo(144, 140); g.quadraticCurveTo(110, 148, 76, 140); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,86,50,0.5)'; g.lineWidth = 1;
        for (let i = 1; i < 7; i++) {
          const x = 76 + i * 9.7;
          g.beginPath(); g.moveTo(x, 132); g.lineTo(x, 143); g.stroke();
        }
        g.restore();
        // cheek push lines from grinning that hard
        g.strokeStyle = 'rgba(140,90,60,0.5)'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(72, 128); g.quadraticCurveTo(68, 134, 71, 140); g.stroke();
        g.beginPath(); g.moveTo(148, 128); g.quadraticCurveTo(152, 134, 149, 140); g.stroke();
        blob(g, 66, 122, 10, 5.5, 'rgba(232,120,100,0.5)', { flat: true, noline: true });
        blob(g, 154, 122, 10, 5.5, 'rgba(232,120,100,0.5)', { flat: true, noline: true });
      },
      // The macro grin: SpongeBob rules, every tooth a monument.
      closeup(g) {
        g.fillStyle = JN.skin; g.fillRect(0, 0, PW, PH);
        // pore and peach fuzz texture over the whole face
        for (let i = 0; i < 120; i++) {
          const x = (i * 7919 % PW), y = (i * 104729 % PH);
          g.fillStyle = 'rgba(150,90,50,0.12)';
          g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
        }
        for (let i = 0; i < 40; i++) {
          const x = (i * 6271 % PW), y = (i * 3557 % 90);
          g.strokeStyle = 'rgba(255,220,180,0.25)'; g.lineWidth = 0.8; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3); g.stroke();
        }
        // hair strands dropping into frame from above
        for (let i = 0; i < 12; i++) {
          const x = 8 + i * 19;
          g.strokeStyle = i % 2 ? JN.hair : JN.hairD; g.lineWidth = 4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, -4); g.quadraticCurveTo(x + 6, 14, x + 2, 26 + (i % 3) * 6); g.stroke();
          g.strokeStyle = JN.hairHi; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(x + 1, 0); g.quadraticCurveTo(x + 6, 12, x + 3, 22); g.stroke();
        }
        // two enormous eyes, pupils pinned, flame catchlights
        for (const s of [-1, 1]) {
          const x = 110 + s * 50, y = 76;
          g.beginPath(); g.ellipse(x, y, 42, 34, 0, 0, TAU);
          g.fillStyle = '#f6f0e2'; g.fill();
          g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
          g.beginPath(); g.ellipse(x, y, 21, 22, 0, 0, TAU);
          g.fillStyle = '#5a3a1a'; g.fill();
          g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
          // iris striations
          g.save();
          g.beginPath(); g.ellipse(x, y, 21, 22, 0, 0, TAU); g.clip();
          for (let i = 0; i < 26; i++) {
            const a = i / 26 * TAU;
            g.strokeStyle = i % 2 ? 'rgba(255,170,80,0.35)' : 'rgba(40,20,6,0.5)';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8.5);
            g.lineTo(x + Math.cos(a) * 21, y + Math.sin(a) * 22);
            g.stroke();
          }
          g.restore();
          g.beginPath(); g.arc(x, y, 6.5, 0, TAU); g.fillStyle = '#160d06'; g.fill();
          // a tiny flame reflected in each pupil
          g.fillStyle = '#ff8c28';
          g.beginPath();
          g.moveTo(x, y - 4.6);
          g.quadraticCurveTo(x + 3.4, y - 0.5, x + 1.8, y + 2.4);
          g.quadraticCurveTo(x, y + 4, x - 1.8, y + 2.4);
          g.quadraticCurveTo(x - 3.4, y - 0.5, x, y - 4.6);
          g.closePath(); g.fill();
          g.fillStyle = '#ffdc8c';
          g.beginPath();
          g.moveTo(x, y - 1.6);
          g.quadraticCurveTo(x + 1.6, y + 0.8, x, y + 2.6);
          g.quadraticCurveTo(x - 1.6, y + 0.8, x, y - 1.6);
          g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,252,244,0.95)';
          g.beginPath(); g.arc(x - 8, y - 9, 4.4, 0, TAU); g.fill();
          // lower lashes, individually
          for (let i = 0; i < 7; i++) {
            const lx = x - 27 + i * 9;
            g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.6; g.lineCap = 'round';
            g.beginPath(); g.moveTo(lx, y + 31); g.lineTo(lx - 1, y + 36); g.stroke();
          }
          // eyebrow strand by strand, riding high
          for (let i = 0; i < 16; i++) {
            const bx = x - 30 + i * 4;
            g.strokeStyle = i % 3 ? JN.hairD : JN.hair; g.lineWidth = 2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(bx, 32 + Math.abs(i - 8) * 0.9); g.lineTo(bx + 3, 25 + Math.abs(i - 8) * 0.9); g.stroke();
          }
        }
        // freckle clusters with cores and rims
        [[26, 130], [48, 142], [178, 136], [196, 126], [110, 118], [78, 126], [146, 122]].forEach(f => {
          g.fillStyle = 'rgba(150,90,50,0.7)';
          g.beginPath(); g.arc(f[0], f[1], 2.6, 0, TAU); g.fill();
          g.fillStyle = 'rgba(96,52,24,0.8)';
          g.beginPath(); g.arc(f[0] + 0.5, f[1] + 0.5, 1.2, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,214,170,0.5)';
          g.beginPath(); g.arc(f[0] - 1.2, f[1] - 1.2, 0.8, 0, TAU); g.fill();
        });
        // nose with sheen and two shadowed nostril dents
        g.strokeStyle = 'rgba(140,90,60,0.7)'; g.lineWidth = 2.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(104, 118); g.quadraticCurveTo(112, 126, 108, 112); g.stroke();
        g.fillStyle = 'rgba(96,52,24,0.5)';
        g.beginPath(); g.ellipse(103, 122, 2.6, 1.6, 0.3, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(116, 122, 2.6, 1.6, -0.3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,244,214,0.6)';
        g.beginPath(); g.arc(108, 112, 2.4, 0, TAU); g.fill();
        // THE GRIN: full frame width, gums, and every tooth with its own shine
        g.fillStyle = '#3a1610';
        g.beginPath();
        g.moveTo(6, 168); g.quadraticCurveTo(110, 236, 214, 168);
        g.quadraticCurveTo(110, 196, 6, 168);
        g.closePath(); g.fill();
        g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
        g.save();
        g.beginPath();
        g.moveTo(6, 168); g.quadraticCurveTo(110, 236, 214, 168);
        g.quadraticCurveTo(110, 196, 6, 168);
        g.closePath(); g.clip();
        // gumline
        g.fillStyle = '#b0524a';
        g.beginPath(); g.moveTo(0, 160); g.quadraticCurveTo(110, 190, 220, 160); g.lineTo(220, 172); g.quadraticCurveTo(110, 200, 0, 172); g.closePath(); g.fill();
        // teeth
        for (let i = 0; i < 9; i++) {
          const x = 14 + i * 22;
          const dip = Math.sin((i + 0.5) / 9 * Math.PI) * 26;
          g.fillStyle = '#fdfaf0';
          g.beginPath(); g.roundRect(x, 164 + dip * 0.55, 19, 26 + dip * 0.35, 4); g.fill();
          g.strokeStyle = 'rgba(120,86,50,0.55)'; g.lineWidth = 1.4;
          g.beginPath(); g.roundRect(x, 164 + dip * 0.55, 19, 26 + dip * 0.35, 4); g.stroke();
          if (i === 6) {
            // one chipped corner, from an incident she describes as a win
            g.fillStyle = '#3a1610';
            g.beginPath(); g.moveTo(x + 12, 164 + dip * 0.55 + 24); g.lineTo(x + 19, 164 + dip * 0.55 + 17); g.lineTo(x + 19, 164 + dip * 0.55 + 26); g.closePath(); g.fill();
          }
          g.fillStyle = 'rgba(255,255,255,0.85)';
          g.beginPath(); g.arc(x + 5, 170 + dip * 0.55, 2.2, 0, TAU); g.fill();
        }
        g.restore();
        // lip shine and cheek push
        g.strokeStyle = 'rgba(255,214,170,0.5)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(30, 176); g.quadraticCurveTo(60, 190, 90, 196); g.stroke();
        g.strokeStyle = 'rgba(140,90,60,0.6)'; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(10, 158); g.quadraticCurveTo(2, 170, 8, 184); g.stroke();
        g.beginPath(); g.moveTo(210, 158); g.quadraticCurveTo(218, 170, 212, 184); g.stroke();
      },
    },
  };

  // ========================================================== GUS =========
  // Big fella. Backwards cap, purple kerchief, a cookie mid journey, and the
  // settled calm of somebody who has never once skipped a meal on purpose.
  const GS = {
    skin: '#e8b384', lid: '#caa07a', cap: '#b03a2e', capD: '#8c2d24', tuft: '#3a2e20',
    shirt: '#b8a06a', kerchief: '#8c5c9c', cookie: '#b97c3e', chip: '#4a2e18',
  };

  CHARS.gus = {
    base(g) {
      glowBack(g);
      scoutTorso(g, {
        shirt: GS.shirt, kerchief: GS.kerchief, skin: GS.skin, wide: true,
        after(g2, cx) {
          // a granola bar riding the pocket, foil tip catching the light
          g2.save(); g2.translate(cx + 42, 232); g2.rotate(-0.12);
          g2.fillStyle = '#7ec87e'; g2.fillRect(-8, -12, 16, 14);
          g2.strokeStyle = OUT; g2.lineWidth = 1.2; g2.strokeRect(-8, -12, 16, 14);
          g2.fillStyle = '#c9d2d8'; g2.fillRect(-8, -12, 16, 4.4);
          g2.fillStyle = 'rgba(255,255,255,0.7)'; g2.fillRect(-6.5, -11.2, 5, 1.8);
          g2.restore();
          // one shirt button under strain, stress creases radiating
          g2.fillStyle = 'rgba(24,16,8,0.65)';
          g2.beginPath(); g2.arc(cx, 252, 2.4, 0, TAU); g2.fill();
          g2.strokeStyle = 'rgba(60,42,18,0.5)'; g2.lineWidth = 1.1; g2.lineCap = 'round';
          [[-14, -5], [-15, 0], [-14, 5], [14, -5], [15, 0], [14, 5]].forEach(v => {
            g2.beginPath(); g2.moveTo(cx + v[0] * 0.5, 252 + v[1] * 0.5); g2.lineTo(cx + v[0], 252 + v[1]); g2.stroke();
          });
          // the cookie hand, raised into frame at the lower right
          blob(g2, cx + 74, 254, 15, 13, GS.skin, { lw: 2 });
          g2.strokeStyle = 'rgba(140,90,60,0.55)'; g2.lineWidth = 1.2; g2.lineCap = 'round';
          [[-6, 0], [0, -1], [6, 0]].forEach((f, i) => {
            g2.beginPath(); g2.moveTo(cx + 68 + i * 6, 246); g2.quadraticCurveTo(cx + 69 + i * 6, 242, cx + 71 + i * 6, 241); g2.stroke();
          });
          // the cookie itself, one bite gone
          g2.save();
          g2.beginPath(); g2.arc(cx + 74, 234, 13, 0, TAU);
          g2.fillStyle = GS.cookie; g2.fill();
          g2.clip();
          g2.fillStyle = 'rgba(70,40,14,0.3)'; g2.fillRect(cx + 61, 236, 26, 12);
          g2.fillStyle = 'rgba(255,220,160,0.3)'; g2.fillRect(cx + 61, 222, 13, 9);
          g2.fillStyle = GS.chip;
          [[-5, -4], [3, -6], [6, 2], [-2, 4], [-8, 2]].forEach(c => {
            g2.beginPath(); g2.ellipse(cx + 74 + c[0], 234 + c[1], 2.2, 1.8, 0.4, 0, TAU); g2.fill();
          });
          g2.restore();
          // the bite: shirt shows through where cookie used to be
          g2.fillStyle = GS.shirt;
          g2.beginPath(); g2.arc(cx + 84, 224, 8.5, 0, TAU); g2.fill();
          g2.fillStyle = 'rgba(60,42,18,0.18)';
          g2.beginPath(); g2.arc(cx + 84, 224, 8.5, 0, TAU); g2.fill();
          g2.beginPath(); g2.arc(cx + 74, 234, 13, Math.PI * 0.42, Math.PI * 1.8);
          g2.lineWidth = 2; g2.strokeStyle = OUT; g2.stroke();
          g2.strokeStyle = 'rgba(24,16,8,0.7)'; g2.lineWidth = 1.2;
          g2.beginPath(); g2.arc(cx + 84, 224, 8.5, Math.PI * 0.6, Math.PI * 1.4); g2.stroke();
          // crumbs in transit
          g2.fillStyle = GS.cookie;
          [[cx + 58, 222], [cx + 64, 214], [cx + 88, 210]].forEach(c => {
            g2.beginPath(); g2.arc(c[0], c[1], 1.6, 0, TAU); g2.fill();
          });
        },
      });
      scoutHead(g, { skin: GS.skin, jw: 60, blush: 'rgba(232,120,100,0.3)' });
      // extra cheek fullness: the face of a man at peace
      blob(g, 58, 128, 13, 10, 'rgba(255,220,180,0.35)', { flat: true, noline: true });
      blob(g, 162, 128, 13, 10, 'rgba(255,220,180,0.35)', { flat: true, noline: true });
      g.strokeStyle = 'rgba(140,90,60,0.35)'; g.lineWidth = 1.3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(96, 150); g.quadraticCurveTo(110, 154, 124, 150); g.stroke();
      // crumbs that live on the cheek now
      g.fillStyle = GS.cookie;
      [[128, 142], [134, 136]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], 1.7, 0, TAU); g.fill(); });
      g.fillStyle = 'rgba(255,244,214,0.6)';
      g.beginPath(); g.arc(127.4, 141.4, 0.7, 0, TAU); g.fill();
      // dark tuft poking out the front of the cap
      g.strokeStyle = GS.tuft; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(70, 58); g.quadraticCurveTo(64, 66, 67, 74); g.stroke();
      g.beginPath(); g.moveTo(80, 54); g.quadraticCurveTo(76, 62, 79, 68); g.stroke();
      // backwards cap: structured crown, panel seams, button, bill out back
      apoly(g, [[150, 40, 4], [186, 44, 5], [182, 62, 5], [148, 58, 4]], GS.capD, { flat: true, lw: 1.6 });
      g.strokeStyle = 'rgba(255,170,140,0.3)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(154, 44); g.lineTo(180, 47); g.stroke();
      apoly(g, [[62, 62, 10], [78, 24, 10], [142, 24, 10], [158, 62, 10], [154, 74, 5], [66, 74, 5]], GS.cap, { lw: 2.2, rim: 'rgba(255,170,140,0.4)', mid: 'rgba(90,20,12,0.16)', shade: 'rgba(90,20,12,0.26)' });
      g.strokeStyle = GS.capD; g.lineWidth = LW_INT + 0.4;
      g.beginPath(); g.moveTo(92, 27); g.lineTo(98, 73); g.stroke();
      g.beginPath(); g.moveTo(128, 27); g.lineTo(122, 73); g.stroke();
      g.beginPath(); g.moveTo(66, 68); g.lineTo(154, 68); g.stroke();
      blob(g, 110, 26, 4.5, 4.5, '#e8e0cc', { lw: 1.4 });
      // stitch dashes along the crown seams
      g.strokeStyle = 'rgba(255,200,180,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.moveTo(94 + i * 0.8, 32 + i * 8); g.lineTo(96.5 + i * 0.8, 32 + i * 8); g.stroke();
        g.beginPath(); g.moveTo(125 - i * 0.8, 32 + i * 8); g.lineTo(122.5 - i * 0.8, 32 + i * 8); g.stroke();
      }
    },
    faces: {
      neutral(g) {
        pEye(g, EXL - 2, EY + 3, 10, { iris: '#4a3320', lid: 0.24, lidFill: GS.lid });
        pEye(g, EXR + 2, EY + 3, 10, { iris: '#4a3320', lid: 0.24, lidFill: GS.lid });
        browArc(g, EXL - 13, 88, EXL - 2, 86, EXL + 8, 88, 3, GS.tuft);
        browArc(g, EXR - 8, 88, EXR + 2, 86, EXR + 13, 88, 3, GS.tuft);
        g.strokeStyle = '#8a5a3c'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(103, MY + 2); g.quadraticCurveTo(110, MY + 4, 117, MY + 2); g.stroke();
      },
      warm(g) {
        happyEye(g, EXL - 2, EY + 3, 11, '#3a2a1c');
        happyEye(g, EXR + 2, EY + 3, 11, '#3a2a1c');
        browArc(g, EXL - 13, 86, EXL - 2, 83.5, EXL + 8, 86, 3, GS.tuft);
        browArc(g, EXR - 8, 86, EXR + 2, 83.5, EXR + 13, 86, 3, GS.tuft);
        g.fillStyle = '#472018';
        g.beginPath();
        g.moveTo(96, MY); g.quadraticCurveTo(110, MY + 12, 124, MY);
        g.quadraticCurveTo(110, MY + 4, 96, MY);
        g.closePath(); g.fill();
        g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
        blob(g, 62, 132, 12, 6.5, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
        blob(g, 158, 132, 12, 6.5, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
      },
      alarmed(g) {
        // fully awake: this only happens when rations are threatened
        pEye(g, EXL - 2, EY + 2, 10.5, { iris: '#4a3320', wide: true, pr: 0.36 });
        pEye(g, EXR + 2, EY + 2, 10.5, { iris: '#4a3320', wide: true, pr: 0.36 });
        browArc(g, EXL - 13, 80, EXL - 2, 75, EXL + 8, 79, 3, GS.tuft);
        browArc(g, EXR - 8, 79, EXR + 2, 75, EXR + 13, 80, 3, GS.tuft);
        g.fillStyle = '#472018';
        g.beginPath(); g.ellipse(110, MY + 4, 7, 8.5, 0, 0, TAU); g.fill();
        g.lineWidth = 1.7; g.strokeStyle = OUT; g.stroke();
        // crumbs leaving the scene
        g.fillStyle = GS.cookie;
        [[120, 132], [126, 126], [100, 130]].forEach(c => {
          g.beginPath(); g.arc(c[0], c[1], 1.5, 0, TAU); g.fill();
        });
        g.strokeStyle = 'rgba(120,86,50,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(122, 136); g.lineTo(120, 133); g.stroke();
        g.beginPath(); g.moveTo(128, 130); g.lineTo(126, 127); g.stroke();
      },
      serene(g) {
        // mid snack serenity: eyes shut, one cheek at work
        sereneEye(g, EXL - 2, EY + 2, 11, '#3a2a1c');
        sereneEye(g, EXR + 2, EY + 2, 11, '#3a2a1c');
        // small lashes on the closed lines
        g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.4; g.lineCap = 'round';
        [[-8, 3], [0, 4.4], [8, 3]].forEach(l => {
          g.beginPath(); g.moveTo(EXL - 2 + l[0], EY + 3 + l[1]); g.lineTo(EXL - 2 + l[0], EY + 6.4 + l[1]); g.stroke();
          g.beginPath(); g.moveTo(EXR + 2 + l[0], EY + 3 + l[1]); g.lineTo(EXR + 2 + l[0], EY + 6.4 + l[1]); g.stroke();
        });
        browArc(g, EXL - 13, 84, EXL - 2, 81.5, EXL + 8, 84, 3, GS.tuft);
        browArc(g, EXR - 8, 84, EXR + 2, 81.5, EXR + 13, 84, 3, GS.tuft);
        // the working cheek, bulged and lit
        blob(g, 138, 136, 17, 14, GS.skin, { lw: 1.8, hi: 'rgba(255,244,214,0.4)' });
        blob(g, 133, 131, 6, 4, 'rgba(255,250,235,0.55)', { flat: true, noline: true });
        // content chewing smile drifting off center
        g.strokeStyle = '#8a5a3c'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(98, MY + 2); g.quadraticCurveTo(108, MY + 7, 120, MY + 3); g.stroke();
        // crumbs at the corner of the mouth
        g.fillStyle = GS.cookie;
        [[97, 142], [93, 138]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], 1.6, 0, TAU); g.fill(); });
        blob(g, 62, 132, 12, 6.5, 'rgba(232,120,100,0.35)', { flat: true, noline: true });
        blob(g, 158, 132, 12, 6.5, 'rgba(232,120,100,0.35)', { flat: true, noline: true });
      },
      // The macro chew: crumb by crumb, at documentary magnification.
      closeup(g) {
        g.fillStyle = GS.skin; g.fillRect(0, 0, PW, PH);
        // peach fuzz and pore texture across the cheek country
        for (let i = 0; i < 90; i++) {
          const x = (i * 7919 % PW), y = 40 + (i * 104729 % (PH - 40));
          g.fillStyle = 'rgba(150,90,50,0.1)';
          g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
        }
        for (let i = 0; i < 44; i++) {
          const x = (i * 6271 % PW), y = 60 + (i * 3557 % 170);
          g.strokeStyle = 'rgba(255,224,190,0.3)'; g.lineWidth = 0.9; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.6, y + 2, x + 1, y + 4.4); g.stroke();
        }
        // cap bill entering the top of frame, double stitch rows
        g.fillStyle = GS.capD;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(PW, 0); g.lineTo(PW, 26); g.quadraticCurveTo(110, 44, 0, 26); g.closePath(); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(0, 26); g.quadraticCurveTo(110, 44, PW, 26); g.stroke();
        for (const row of [8, 16]) {
          g.strokeStyle = 'rgba(255,190,170,0.5)'; g.lineWidth = 1.2;
          for (let i = 0; i < 18; i++) {
            const x = 6 + i * 12;
            g.beginPath(); g.moveTo(x, row + Math.sin(x / 60) * 3); g.lineTo(x + 6, row + Math.sin((x + 6) / 60) * 3); g.stroke();
          }
        }
        // serene closed eyes, lashes counted one by one
        for (const s of [-1, 1]) {
          const x = 110 + s * 52, y = 74;
          g.strokeStyle = '#3a2a1c'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - 30, y); g.quadraticCurveTo(x, y + 16, x + 30, y); g.stroke();
          for (let i = 0; i < 6; i++) {
            const lx = x - 25 + i * 10;
            const ly = y + 7 - Math.abs(i - 2.5) * 2.4;
            g.lineWidth = 2;
            g.beginPath(); g.moveTo(lx, ly + 4); g.lineTo(lx - 1, ly + 12); g.stroke();
          }
          // brow strands
          for (let i = 0; i < 12; i++) {
            const bx = x - 26 + i * 4.6;
            g.strokeStyle = i % 2 ? GS.tuft : '#57493a'; g.lineWidth = 2.2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(bx, 52 - Math.abs(i - 6) * 1.2); g.lineTo(bx + 3.4, 44 - Math.abs(i - 6) * 1.2); g.stroke();
          }
        }
        // THE CHEEK: a planetary bulge with its own lighting model
        blob(g, 148, 172, 62, 54, GS.skin, { lw: 2.6, rim: 'rgba(255,214,150,0.5)', hi: 'rgba(255,244,214,0.3)' });
        blob(g, 128, 150, 22, 15, 'rgba(255,250,235,0.65)', { flat: true, noline: true, rot: -0.3 });
        g.strokeStyle = 'rgba(140,90,60,0.4)'; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.arc(148, 172, 44, Math.PI * 0.15, Math.PI * 0.5); g.stroke();
        // the mouth mid chew: shut tight, doing important work
        g.strokeStyle = '#7a4a30'; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(38, 196); g.quadraticCurveTo(66, 210, 96, 202); g.stroke();
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(40, 204); g.quadraticCurveTo(64, 214, 90, 208); g.stroke();
        // chocolate smear at the corner: evidence
        blob(g, 34, 190, 8, 5, 'rgba(74,46,24,0.75)', { flat: true, noline: true, rot: 0.5 });
        // crumbs, each with a specular and a cast shadow
        [[52, 220, 3.2], [70, 228, 2.4], [44, 232, 2], [88, 222, 2.8], [104, 234, 2.2],
         [62, 212, 1.8], [120, 226, 2.6], [30, 214, 2.2], [140, 238, 2], [80, 240, 1.7],
         [112, 214, 1.5], [96, 244, 2.4]].forEach(c => {
          g.fillStyle = 'rgba(60,34,12,0.35)';
          g.beginPath(); g.ellipse(c[0] + 1.4, c[1] + c[2] * 0.9, c[2] * 1.1, c[2] * 0.4, 0, 0, TAU); g.fill();
          g.fillStyle = GS.cookie;
          g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill();
          g.strokeStyle = 'rgba(60,34,12,0.7)'; g.lineWidth = 0.9;
          g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.stroke();
          g.fillStyle = 'rgba(255,230,180,0.8)';
          g.beginPath(); g.arc(c[0] - c[2] * 0.35, c[1] - c[2] * 0.35, c[2] * 0.32, 0, TAU); g.fill();
        });
        // one airborne crumb with motion ticks: history in the making
        g.fillStyle = GS.cookie;
        g.beginPath(); g.arc(174, 116, 3.4, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(60,34,12,0.7)'; g.lineWidth = 1;
        g.beginPath(); g.arc(174, 116, 3.4, 0, TAU); g.stroke();
        g.fillStyle = GS.chip;
        g.beginPath(); g.ellipse(173, 115, 1.2, 0.9, 0.4, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,86,50,0.6)'; g.lineWidth = 1.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(182, 108); g.lineTo(188, 103); g.stroke();
        g.beginPath(); g.moveTo(184, 116); g.lineTo(191, 113); g.stroke();
      },
    },
  };

  // ================================================ QUARTERMASTER =========
  // Stout, wire glasses, a ledger thicker than you are. The inventory has
  // names; you are the thing that makes the inventory smaller.
  const QM = {
    skin: '#d7a45f', lid: '#b8874a', khaki: '#c9a86a', hair: '#c3c8ce', hairD: '#9aa1ab',
    wire: '#8a8f96', kerchief: '#c0392b', sash: '#8a2f23', board: '#8a6138', paper: '#e9e4da',
  };

  // Lens sheen redraws over the eyes so the glass stays in front of whatever
  // the expression does behind it. Called at the end of every face.
  function qmSheen(g) {
    g.strokeStyle = 'rgba(233,240,248,0.4)'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(EXL - 10, 94); g.lineTo(EXL + 2, 112); g.stroke();
    g.beginPath(); g.moveTo(EXL - 4, 92); g.lineTo(EXL + 6, 108); g.stroke();
    g.beginPath(); g.moveTo(EXR - 10, 94); g.lineTo(EXR + 2, 112); g.stroke();
    g.beginPath(); g.moveTo(EXR - 4, 92); g.lineTo(EXR + 6, 108); g.stroke();
  }

  CHARS.quartermaster = {
    base(g) {
      glowBack(g);
      // stout torso: shoulders in, belly proud, the frame ends at the belt
      apoly(g, [
        [46, 196, 12], [78, 184, 9], [142, 184, 9], [174, 196, 12],
        [196, 240, 10], [202, 266, 2], [18, 266, 2], [24, 240, 10],
      ], QM.khaki, { rim: 'rgba(255,240,200,0.4)', mid: 'rgba(60,42,18,0.13)', shade: 'rgba(60,42,18,0.2)' });
      // arms at the frame edges
      blob(g, 34, 232, 20, 40, QM.khaki, { rot: 0.2, lw: LW_SIL });
      blob(g, 186, 232, 20, 40, QM.khaki, { rot: -0.2, lw: LW_SIL });
      // belt riding the belly at the very bottom, brass buckle
      apoly(g, [[26, 248, 2], [194, 248, 2], [196, 262, 2], [24, 262, 2]], '#5c4326', { flat: true, lw: 1.6 });
      g.fillStyle = '#e3b341'; g.fillRect(100, 246, 20, 17);
      g.strokeStyle = OUT; g.lineWidth = 1.2; g.strokeRect(100, 246, 20, 17);
      g.strokeStyle = 'rgba(110,72,10,0.7)'; g.lineWidth = 1; g.strokeRect(103.5, 249.5, 13, 10);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.arc(104, 250, 1.6, 0, TAU); g.fill();
      // shirt seams and strain folds
      g.strokeStyle = 'rgba(40,26,12,0.4)'; g.lineWidth = LW_INT; g.lineCap = 'round';
      g.beginPath(); g.moveTo(54, 202); g.quadraticCurveTo(66, 226, 58, 248); g.stroke();
      g.beginPath(); g.moveTo(166, 202); g.quadraticCurveTo(154, 226, 162, 248); g.stroke();
      g.beginPath(); g.moveTo(96, 240); g.quadraticCurveTo(110, 244, 124, 240); g.stroke();
      // pocket flap with a pen clipped in it
      apoly(g, [[132, 216, 2], [162, 216, 2], [161, 230, 2], [133, 230, 2]], QM.khaki, { flat: true, lw: LW_INT, line: 'rgba(40,26,12,0.5)' });
      g.fillStyle = '#3a4a63'; g.fillRect(140, 210, 4, 12);
      g.strokeStyle = OUT; g.lineWidth = 0.9; g.strokeRect(140, 210, 4, 12);
      g.fillStyle = '#c9d2d8'; g.fillRect(140, 210, 4, 3);
      // the service sash: the one saturated accent, four campaigns deep
      g.save();
      g.beginPath();
      g.moveTo(66, 190); g.lineTo(96, 184); g.lineTo(168, 254); g.lineTo(136, 262); g.closePath();
      g.fillStyle = QM.sash; g.fill();
      g.clip();
      g.fillStyle = 'rgba(40,10,8,0.4)'; g.fillRect(100, 214, 90, 60);
      g.fillStyle = 'rgba(255,200,180,0.14)'; g.fillRect(60, 182, 50, 34);
      g.restore();
      g.beginPath();
      g.moveTo(66, 190); g.lineTo(96, 184); g.lineTo(168, 254); g.lineTo(136, 262); g.closePath();
      g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
      g.strokeStyle = 'rgba(240,220,210,0.4)'; g.lineWidth = 1; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const t = 0.12 + i * 0.15;
        const sx = 80 + (150 - 80) * t, sy = 188 + (258 - 188) * t;
        g.beginPath(); g.moveTo(sx - 3, sy + 3); g.lineTo(sx - 6, sy + 6); g.stroke();
      }
      // four badges, four different services, all polished
      const bc = ['#f4c542', '#7ec87e', '#7ec8e8', '#e9e4da'];
      [[92, 202], [110, 218], [128, 234], [146, 250]].forEach((b, i) => {
        g.fillStyle = bc[i];
        g.beginPath(); g.arc(b[0], b[1], 6, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(40,20,10,0.7)'; g.lineWidth = 1.1;
        g.beginPath(); g.arc(b[0], b[1], 6, 0, TAU); g.stroke();
        g.beginPath(); g.arc(b[0], b[1], 4, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.arc(b[0] - 1.8, b[1] - 1.8, 1.4, 0, TAU); g.fill();
      });
      // neck and tidy regulation kerchief
      apoly(g, [[96, 160, 4], [124, 160, 4], [126, 192, 4], [94, 192, 4]], QM.skin, { flat: true, noline: true });
      blob(g, 110, 167, 16, 6, 'rgba(120,66,30,0.28)', { flat: true, noline: true });
      apoly(g, [[68, 184, 4], [152, 184, 4], [110, 234, 3]], QM.kerchief, { lw: 2, rim: 'rgba(255,220,190,0.3)' });
      g.strokeStyle = 'rgba(20,8,6,0.4)'; g.lineWidth = LW_INT;
      g.beginPath(); g.moveTo(86, 196); g.lineTo(110, 220); g.lineTo(134, 196); g.stroke();
      apoly(g, [[100, 188, 3], [120, 188, 3], [118, 206, 3], [102, 206, 3]], QM.kerchief, { lw: 1.6, mid: 'rgba(20,8,6,0.2)', shade: 'rgba(20,8,6,0.3)' });
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(104, 193); g.lineTo(116, 193); g.stroke();
      // the clipboard, raised into the lower left of frame
      g.save(); g.translate(40, 236); g.rotate(0.16);
      apoly(g, [[-26, -38, 3], [26, -38, 3], [26, 40, 3], [-26, 40, 3]], QM.board, { lw: 2, mid: 'rgba(60,36,16,0.18)', shade: 'rgba(60,36,16,0.28)' });
      g.fillStyle = QM.paper; g.fillRect(-20, -30, 40, 62);
      g.strokeStyle = 'rgba(120,110,100,0.5)'; g.lineWidth = 0.8; g.strokeRect(-20, -30, 40, 62);
      // the clip
      g.fillStyle = '#c9ccd4'; g.fillRect(-12, -42, 24, 10);
      g.strokeStyle = OUT; g.lineWidth = 1.1; g.strokeRect(-12, -42, 24, 10);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-9, -40.5, 8, 2.4);
      // ruled lines, checkmarks in the done column, one line crossed out
      g.strokeStyle = '#8d947f'; g.lineWidth = 0.9;
      for (let i = 0; i < 7; i++) {
        g.beginPath(); g.moveTo(-16, -22 + i * 8); g.lineTo(16, -22 + i * 8); g.stroke();
      }
      g.strokeStyle = '#5c7248'; g.lineWidth = 1.4; g.lineCap = 'round';
      for (const cy of [-24, -8, 8]) {
        g.beginPath(); g.moveTo(-15, cy + 1); g.lineTo(-13, cy + 3.4); g.lineTo(-9.5, cy - 2); g.stroke();
      }
      g.strokeStyle = '#8a2f23'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-16, 16.5); g.lineTo(14, 15.5); g.stroke();
      g.restore();
      // the hand holding it
      blob(g, 64, 262, 12, 9, QM.skin, { lw: 1.8 });
      // head: round cheeks, a chin that has opinions
      scoutHead(g, { skin: QM.skin, jw: 56, blush: 'rgba(232,120,100,0.28)' });
      g.strokeStyle = 'rgba(140,90,60,0.4)'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(96, 152); g.quadraticCurveTo(110, 156, 124, 152); g.stroke();
      // reading dents either side of the nose bridge
      g.strokeStyle = 'rgba(140,90,60,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(104, 108); g.lineTo(103, 111); g.stroke();
      g.beginPath(); g.moveTo(116, 108); g.lineTo(117, 111); g.stroke();
      // grey hair: parted crown, temple sweeps, the bun riding high
      apoly(g, [[54, 66, 8], [76, 42, 8], [110, 36, 9], [146, 42, 8], [166, 66, 8], [156, 72, 5], [110, 58, 8], [66, 74, 5]], QM.hair, { lw: 2, mid: 'rgba(70,76,84,0.15)', shade: 'rgba(70,76,84,0.22)' });
      // comb lines following the part
      g.strokeStyle = 'rgba(80,86,94,0.55)'; g.lineWidth = 1; g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.moveTo(104 - i * 9, 44 + i * 3); g.quadraticCurveTo(84 - i * 6, 52 + i * 4, 66 - i * 2, 64 + i * 2); g.stroke();
        g.beginPath(); g.moveTo(116 + i * 9, 44 + i * 3); g.quadraticCurveTo(136 + i * 6, 52 + i * 4, 154 + i * 2, 64 + i * 2); g.stroke();
      }
      // the bun, with its band and two strands that got away
      blob(g, 148, 34, 20, 17, QM.hair, { lw: 2, mid: 'rgba(70,76,84,0.16)', shade: 'rgba(70,76,84,0.24)', hi: 'rgba(255,255,255,0.25)' });
      g.strokeStyle = 'rgba(80,86,94,0.6)'; g.lineWidth = 1.1;
      g.beginPath(); g.arc(148, 34, 11, Math.PI * 0.15, Math.PI * 1.3); g.stroke();
      g.beginPath(); g.arc(148, 34, 6, Math.PI * 0.4, Math.PI * 1.5); g.stroke();
      g.strokeStyle = '#5c4326'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(136, 44); g.quadraticCurveTo(148, 50, 160, 43); g.stroke();
      g.strokeStyle = QM.hairD; g.lineWidth = 1.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(164, 30); g.quadraticCurveTo(172, 36, 170, 46); g.stroke();
      g.beginPath(); g.moveTo(56, 66); g.quadraticCurveTo(50, 74, 53, 84); g.stroke();
      // wire glasses: rims, bridge, temple arms back to the ears
      g.strokeStyle = QM.wire; g.lineWidth = 2;
      g.beginPath(); g.arc(EXL - 2, EY, 16, 0, TAU); g.stroke();
      g.beginPath(); g.arc(EXR + 2, EY, 16, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(EXL + 14, EY - 3); g.quadraticCurveTo(110, EY - 8, EXR - 14, EY - 3); g.stroke();
      g.beginPath(); g.moveTo(EXL - 18, EY - 2); g.lineTo(54, 100); g.stroke();
      g.beginPath(); g.moveTo(EXR + 18, EY - 2); g.lineTo(166, 100); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1;
      g.beginPath(); g.arc(EXL - 2, EY, 16, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(EXR + 2, EY, 16, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
    },
    faces: {
      neutral(g) {
        pEye(g, EXL - 2, EY + 1, 9, { iris: '#5c4a30', lid: 0.18, lidFill: QM.lid });
        pEye(g, EXR + 2, EY + 1, 9, { iris: '#5c4a30', lid: 0.18, lidFill: QM.lid });
        browArc(g, EXL - 13, 84, EXL - 2, 82.5, EXL + 8, 84, 3.2, QM.hair);
        browArc(g, EXR - 8, 84, EXR + 2, 82.5, EXR + 13, 84, 3.2, QM.hair);
        g.strokeStyle = '#8a5a3c'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(102, MY + 2); g.lineTo(118, MY + 2); g.stroke();
        qmSheen(g);
      },
      warm(g) {
        // the rare approval: cocoa is on the house exactly once
        happyEye(g, EXL - 2, EY + 1, 9.5, '#3a3026');
        happyEye(g, EXR + 2, EY + 1, 9.5, '#3a3026');
        browArc(g, EXL - 13, 82, EXL - 2, 80, EXL + 8, 82, 3.2, QM.hair);
        browArc(g, EXR - 8, 82, EXR + 2, 80, EXR + 13, 82, 3.2, QM.hair);
        g.strokeStyle = '#8a5a3c'; g.lineWidth = 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(99, MY); g.quadraticCurveTo(110, MY + 6, 121, MY); g.stroke();
        blob(g, 62, 130, 11, 6, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
        blob(g, 158, 130, 11, 6, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
        qmSheen(g);
      },
      alarmed(g) {
        // something is off by one in the ledger
        pEye(g, EXL - 2, EY + 1, 9, { iris: '#5c4a30', wide: true, pr: 0.4 });
        pEye(g, EXR + 2, EY + 1, 9, { iris: '#5c4a30', wide: true, pr: 0.4 });
        browArc(g, EXL - 13, 76, EXL - 2, 71, EXL + 8, 75, 3.2, QM.hair);
        browArc(g, EXR - 8, 75, EXR + 2, 71, EXR + 13, 76, 3.2, QM.hair);
        g.fillStyle = '#472018';
        g.beginPath(); g.ellipse(110, MY + 3, 6, 7, 0, 0, TAU); g.fill();
        g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
        sweat(g, 162, 80, 6);
        qmSheen(g);
      },
      disapproval(g) {
        // the signature: one lens goes full glare, the ledger closes
        pEye(g, EXL - 2, EY + 1, 9, { iris: '#5c4a30', lid: 0.46, lidFill: QM.lid, px: 1, pr: 0.44 });
        pEye(g, EXR + 2, EY + 1, 9, { iris: '#5c4a30', lid: 0.46, lidFill: QM.lid, px: 1, pr: 0.44 });
        browArc(g, EXL - 13, 87, EXL - 2, 89, EXL + 8, 90, 3.4, QM.hair);
        browArc(g, EXR - 8, 90, EXR + 2, 89, EXR + 13, 87, 3.4, QM.hair);
        // the flat mouth of a person who has seen your requisition form
        g.strokeStyle = '#7a4a30'; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(101, MY + 3); g.quadraticCurveTo(110, MY + 1, 119, MY + 3); g.stroke();
        g.strokeStyle = 'rgba(140,90,60,0.5)'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(98, MY + 1); g.lineTo(100, MY + 3); g.stroke();
        g.beginPath(); g.moveTo(122, MY + 1); g.lineTo(120, MY + 3); g.stroke();
        // full glare on the right lens
        g.save();
        g.beginPath(); g.arc(EXR + 2, EY, 14.6, 0, TAU); g.clip();
        g.fillStyle = 'rgba(233,228,218,0.75)';
        g.fillRect(EXR - 14, EY - 16, 34, 34);
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(EXR - 8, EY + 10); g.lineTo(EXR + 8, EY - 10); g.stroke();
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(EXR - 2, EY + 13); g.lineTo(EXR + 12, EY - 4); g.stroke();
        g.restore();
        qmSheen(g);
      },
    },
  };

  // ======================================================== CRITTER =======
  // The rescued squirrel. Unmarked: no tin, no red, nothing pressed into the
  // fur. It is here because you kept coming back. The head lives in the face
  // layer so the signature tilt can move all of it at once.

  const CR = {
    fur: '#b85a24', furD: '#8f3f18', furL: '#cc6d2c', cream: '#e8cfa5',
    iris: '#6b4423', pink: '#f08a9a',
  };

  // The whole head, rotated rot radians about the neck. mode picks the eye
  // and mouth set; the tilt also flops one ear.
  function critHead(g, rot, mode) {
    g.save();
    g.translate(110, 150); g.rotate(rot); g.translate(-110, -150);
    const back = mode === 'alarmed';
    const flop = mode === 'tilt';
    // ears: pink cores with a hot translucent streak
    if (back) {
      // ears pinned back and out, clear of the head silhouette
      apoly(g, [[44, 84, 3], [70, 62, 3], [80, 76, 4], [58, 96, 4]], CR.fur);
      apoly(g, [[176, 84, 3], [150, 62, 3], [140, 76, 4], [162, 96, 4]], CR.fur);
      apoly(g, [[52, 84, 2], [68, 70, 2], [72, 78, 2.5], [60, 90, 2.5]], CR.pink, { flat: true, noline: true });
      apoly(g, [[168, 84, 2], [152, 70, 2], [148, 78, 2.5], [160, 90, 2.5]], CR.pink, { flat: true, noline: true });
    } else {
      apoly(g, [[70, 36, 3], [88, 62, 4], [62, 66, 4]], CR.fur);
      if (flop) {
        // the right ear folds over mid tilt
        apoly(g, [[136, 58, 4], [158, 46, 4], [162, 62, 3], [146, 68, 4]], CR.fur);
        apoly(g, [[144, 58, 2], [155, 52, 2], [156, 60, 2], [148, 63, 2]], CR.pink, { flat: true, noline: true });
        g.strokeStyle = 'rgba(24,16,8,0.5)'; g.lineWidth = 1.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(140, 54); g.lineTo(136, 48); g.stroke();
        g.beginPath(); g.moveTo(146, 52); g.lineTo(144, 46); g.stroke();
      } else {
        apoly(g, [[150, 36, 3], [132, 62, 4], [158, 66, 4]], CR.fur);
      }
      apoly(g, [[72, 44, 2], [84, 60, 2.5], [68, 62, 2.5]], CR.pink, { flat: true, noline: true });
      blob(g, 75, 52, 3.4, 6, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: 0.25 });
      if (!flop) {
        apoly(g, [[148, 44, 2], [136, 60, 2.5], [152, 62, 2.5]], CR.pink, { flat: true, noline: true });
        blob(g, 145, 52, 3.4, 6, 'rgba(255,186,176,0.8)', { flat: true, noline: true, rot: -0.25 });
      }
    }
    // cheek tufts breaking the sides
    clump(g, 60, 116, 9, 11, -1.9, CR.furL, { line: OUT, lw: 1.5 });
    clump(g, 62, 128, 8, 10, -2.2, '#c06026', { line: OUT, lw: 1.5 });
    clump(g, 160, 116, 9, 11, 1.9, CR.furL, { line: OUT, lw: 1.5 });
    clump(g, 158, 128, 8, 10, 2.2, '#c06026', { line: OUT, lw: 1.5 });
    // the head: big, soft, forward
    apoly(g, [
      [70, 62, 12], [110, 52, 14], [150, 62, 12], [162, 96, 11],
      [152, 128, 10], [128, 148, 9], [110, 152, 8], [92, 148, 9], [68, 128, 10], [58, 96, 11],
    ], CR.furL, { rim: 'rgba(255,152,70,0.5)', mid: 'rgba(90,40,14,0.12)', shade: 'rgba(90,40,14,0.2)' });
    blob(g, 110, 70, 30, 12, 'rgba(255,236,200,0.25)', { flat: true, noline: true });
    // muzzle: cream, tiny wet nose, buck teeth under most moods
    blob(g, 110, 130, 26, 17, CR.cream, { flat: true, noline: true });
    apoly(g, [[102, 114, 3], [118, 114, 3], [110, 125, 3]], '#221108', { flat: true, noline: true });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(106, 117, 1.8, 0, TAU); g.fill();
    g.fillStyle = 'rgba(90,84,72,0.6)';
    [[86, 128], [82, 134], [88, 139], [134, 128], [138, 134], [132, 139]].forEach(d => {
      g.beginPath(); g.arc(d[0], d[1], 1, 0, TAU); g.fill();
    });
    // eyes and mouth per mode
    const ex1 = 88, ex2 = 132, ey = 100;
    if (mode === 'warm') {
      happyEye(g, ex1, ey, 12, OUT);
      happyEye(g, ex2, ey, 12, OUT);
      blob(g, 74, 118, 9, 5, 'rgba(240,138,154,0.5)', { flat: true, noline: true });
      blob(g, 146, 118, 9, 5, 'rgba(240,138,154,0.5)', { flat: true, noline: true });
      g.strokeStyle = '#7a4a30'; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(103, 132); g.quadraticCurveTo(110, 137, 117, 132); g.stroke();
      g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 1;
      g.fillRect(104, 134, 5.4, 6.5); g.strokeRect(104, 134, 5.4, 6.5);
      g.fillRect(110.6, 134, 5.4, 6.5); g.strokeRect(110.6, 134, 5.4, 6.5);
    } else if (mode === 'alarmed') {
      pEye(g, ex1, ey, 13, { iris: CR.iris, wide: true, pr: 0.32 });
      pEye(g, ex2, ey, 13, { iris: CR.iris, wide: true, pr: 0.32 });
      g.fillStyle = '#3a1c10';
      g.beginPath(); g.ellipse(110, 134, 4.4, 5.4, 0, 0, TAU); g.fill();
      g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
      // fur standing up in little shocked ticks
      g.strokeStyle = 'rgba(24,16,8,0.6)'; g.lineWidth = 1.3; g.lineCap = 'round';
      [[70, 66, -0.5], [80, 60, -0.25], [140, 60, 0.25], [150, 66, 0.5]].forEach(t => {
        g.beginPath(); g.moveTo(t[0], t[1]);
        g.lineTo(t[0] + Math.sin(t[2]) * 7, t[1] - Math.cos(t[2]) * 7); g.stroke();
      });
    } else if (mode === 'tilt') {
      pEye(g, ex1, ey, 13.5, { iris: CR.iris, spark: true });
      pEye(g, ex2, ey, 13.5, { iris: CR.iris, spark: true });
      blob(g, 74, 118, 9, 5, 'rgba(240,138,154,0.45)', { flat: true, noline: true });
      blob(g, 146, 118, 9, 5, 'rgba(240,138,154,0.45)', { flat: true, noline: true });
      g.strokeStyle = '#7a4a30'; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(104, 131); g.quadraticCurveTo(110, 135.5, 116, 131); g.stroke();
      g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 1;
      g.fillRect(104.5, 133, 5.2, 6); g.strokeRect(104.5, 133, 5.2, 6);
      g.fillRect(110.3, 133, 5.2, 6); g.strokeRect(110.3, 133, 5.2, 6);
    } else {
      pEye(g, ex1, ey, 12.5, { iris: CR.iris });
      pEye(g, ex2, ey, 12.5, { iris: CR.iris });
      g.strokeStyle = '#7a4a30'; g.lineWidth = 1.7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(104, 131.5); g.quadraticCurveTo(110, 135, 116, 131.5); g.stroke();
      g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 1;
      g.fillRect(104.5, 133.5, 5.2, 6); g.strokeRect(104.5, 133.5, 5.2, 6);
      g.fillRect(110.3, 133.5, 5.2, 6); g.strokeRect(110.3, 133.5, 5.2, 6);
    }
    // tiny brow fur ticks
    g.strokeStyle = 'rgba(24,16,8,0.55)'; g.lineWidth = 1.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(82, 84); g.lineTo(88, 82); g.stroke();
    g.beginPath(); g.moveTo(138, 82); g.lineTo(144, 84); g.stroke();
    g.restore();
  }

  CHARS.critter = {
    base(g) {
      glowBack(g, 'rgba(255,184,96,0.18)');
      // the tail: a full sweep behind the left side, rows of shaped fur
      const tailPts = [
        [30, 258, 8], [16, 210, 14], [12, 150, 16], [26, 92, 14], [56, 56, 10], [88, 50, 8], [102, 64, 8],
        [88, 76, 6], [94, 92, 6], [76, 102, 6], [80, 122, 6], [62, 136, 6], [66, 160, 6], [52, 178, 6], [58, 210, 6], [48, 258, 8],
      ];
      apoly(g, tailPts, CR.fur, { rim: 'rgba(255,152,70,0.5)', mid: 'rgba(70,28,8,0.16)', shade: 'rgba(70,28,8,0.26)' });
      g.save(); apath(g, tailPts); g.clip();
      furRow(g, 34, 240, 22, 160, 5, 14, 24, -2.1, ['#8f3f18', '#9c4a1c'], null);
      furRow(g, 36, 140, 44, 84, 5, 13, 22, -1.6, ['#cc6d2c', '#c06026'], { hi: 'rgba(255,214,160,0.45)' });
      furRow(g, 60, 66, 88, 58, 4, 11, 18, -0.7, ['#dd7f36', '#cc6d2c'], { hi: 'rgba(255,224,178,0.5)' });
      g.restore();
      apath(g, tailPts); g.lineWidth = LW_SIL; g.strokeStyle = OUT; g.stroke();
      // body: small chest under the big head, haunches at the frame bottom
      apoly(g, [
        [70, 168, 10], [110, 158, 10], [150, 168, 10], [166, 210, 10],
        [170, 262, 4], [50, 262, 4], [56, 210, 10],
      ], CR.fur, { rim: 'rgba(255,152,70,0.5)', mid: 'rgba(70,28,8,0.14)', shade: 'rgba(70,28,8,0.24)' });
      // cream belly with a soft highlight
      blob(g, 112, 224, 34, 32, CR.cream, { flat: true, noline: true });
      blob(g, 104, 210, 15, 11, 'rgba(255,250,232,0.55)', { flat: true, noline: true });
      furRow(g, 84, 190, 140, 190, 5, 9, 9, 0, ['#c06026', CR.fur], null);
      // both paws up, holding the acorn like a presentation
      blob(g, 92, 210, 10, 8, '#9c4a1c', { lw: 1.6 });
      blob(g, 128, 210, 10, 8, '#9c4a1c', { lw: 1.6 });
      g.strokeStyle = 'rgba(24,16,8,0.55)'; g.lineWidth = 1.1; g.lineCap = 'round';
      [[86, 206], [90, 204], [126, 204], [130, 206]].forEach(f => {
        g.beginPath(); g.moveTo(f[0], f[1]); g.lineTo(f[0] + 2, f[1] + 4); g.stroke();
      });
      // the acorn: cap crosshatched, body glossy
      blob(g, 110, 202, 12, 14, '#c99a58', { lw: 1.8, mid: 'rgba(90,55,25,0.16)', shade: 'rgba(90,55,25,0.26)' });
      g.beginPath();
      g.moveTo(96, 196); g.quadraticCurveTo(110, 186, 124, 196);
      g.quadraticCurveTo(110, 200, 96, 196);
      g.closePath();
      g.fillStyle = '#6e4526'; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
      g.save();
      g.beginPath();
      g.moveTo(96, 196); g.quadraticCurveTo(110, 186, 124, 196);
      g.quadraticCurveTo(110, 200, 96, 196);
      g.closePath(); g.clip();
      g.strokeStyle = 'rgba(40,22,8,0.6)'; g.lineWidth = 0.8;
      for (let i = 0; i < 6; i++) {
        g.beginPath(); g.moveTo(94 + i * 5, 186); g.lineTo(98 + i * 5, 200); g.stroke();
        g.beginPath(); g.moveTo(124 - i * 5, 186); g.lineTo(120 - i * 5, 200); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#54371e'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(110, 188); g.lineTo(110, 183); g.stroke();
      g.fillStyle = 'rgba(255,244,214,0.6)';
      g.beginPath(); g.arc(105, 200, 2.6, 0, TAU); g.fill();
      // no pendant. That is the entire point of this squirrel.
    },
    faces: {
      neutral(g) { critHead(g, 0, 'neutral'); },
      warm(g) { critHead(g, 0, 'warm'); },
      alarmed(g) { critHead(g, 0, 'alarmed'); },
      tilt(g) { critHead(g, -0.16, 'tilt'); },
      // The macro cute: eyes the size of ponds, love at parody resolution.
      closeup(g) {
        g.fillStyle = CR.furL; g.fillRect(0, 0, PW, PH);
        // full frame fur, laid in overlapping strand rows
        for (let r = 0; r < 13; r++) {
          const y = 6 + r * 20;
          for (let i = 0; i < 24; i++) {
            const x = 2 + i * 9.4 + (r % 2) * 4.5;
            g.strokeStyle = i % 3 === 0 ? 'rgba(143,63,24,0.7)' : i % 3 === 1 ? 'rgba(221,127,54,0.7)' : 'rgba(192,96,38,0.7)';
            g.lineWidth = 1.6; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x + 2.4, y + 8, x + 1, y + 15);
            g.stroke();
          }
        }
        // brow tufts, each hair accounted for
        for (const s of [-1, 1]) {
          for (let i = 0; i < 14; i++) {
            const x = 110 + s * (18 + i * 5.4);
            g.strokeStyle = i % 2 ? '#8f3f18' : '#dd7f36'; g.lineWidth = 2.2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(x, 30 + Math.abs(i - 7) * 1.4);
            g.quadraticCurveTo(x + s * 3, 22 + Math.abs(i - 7) * 1.4, x + s * 6, 18 + Math.abs(i - 7) * 1.4);
            g.stroke();
          }
        }
        // THE EYES: two ponds of uncanny devotion
        for (const s of [-1, 1]) {
          const x = 110 + s * 52, y = 108, R = 46;
          // fur ring shadow
          blob(g, x, y + 6, R + 8, R + 4, 'rgba(70,28,8,0.3)', { flat: true, noline: true });
          g.beginPath(); g.arc(x, y, R, 0, TAU);
          g.fillStyle = CR.iris; g.fill();
          g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
          g.save();
          g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
          // layered iris: dark rim, striations, inner glow ring
          g.fillStyle = 'rgba(30,16,6,0.6)';
          g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke();
          g.beginPath(); g.ellipse(x, y - R * 0.5, R * 1.1, R * 0.6, 0, 0, TAU); g.fill();
          for (let i = 0; i < 30; i++) {
            const a = i / 30 * TAU;
            g.strokeStyle = i % 2 ? 'rgba(255,178,96,0.35)' : 'rgba(40,20,6,0.55)';
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(x + Math.cos(a) * R * 0.42, y + Math.sin(a) * R * 0.42);
            g.lineTo(x + Math.cos(a) * R * 0.98, y + Math.sin(a) * R * 0.98);
            g.stroke();
          }
          g.strokeStyle = 'rgba(255,196,120,0.5)'; g.lineWidth = 2.4;
          g.beginPath(); g.arc(x, y, R * 0.42, 0, TAU); g.stroke();
          g.restore();
          // pupil with a campfire reflected in it: your campfire
          g.beginPath(); g.arc(x, y + 2, R * 0.4, 0, TAU);
          g.fillStyle = '#160d06'; g.fill();
          const fx = x, fy = y + 6;
          g.fillStyle = '#c83c0a';
          g.beginPath();
          g.moveTo(fx, fy - 9); g.quadraticCurveTo(fx + 6.4, fy - 1, fx + 3.4, fy + 4);
          g.quadraticCurveTo(fx, fy + 7, fx - 3.4, fy + 4);
          g.quadraticCurveTo(fx - 6.4, fy - 1, fx, fy - 9);
          g.closePath(); g.fill();
          g.fillStyle = '#ff8c28';
          g.beginPath();
          g.moveTo(fx, fy - 5.4); g.quadraticCurveTo(fx + 3.6, fy, fx + 1.8, fy + 3.4);
          g.quadraticCurveTo(fx, fy + 5, fx - 1.8, fy + 3.4);
          g.quadraticCurveTo(fx - 3.6, fy, fx, fy - 5.4);
          g.closePath(); g.fill();
          g.fillStyle = '#ffdc8c';
          g.beginPath(); g.arc(fx, fy + 1.4, 1.7, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,220,150,0.6)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(fx - 5, fy + 6); g.lineTo(fx + 5, fy + 6); g.stroke();
          // speculars: the big wet one, the second, the third, the sparkles
          g.fillStyle = 'rgba(255,252,244,0.95)';
          g.beginPath(); g.ellipse(x - R * 0.36, y - R * 0.4, R * 0.2, R * 0.15, -0.4, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,240,220,0.8)';
          g.beginPath(); g.arc(x + R * 0.42, y + R * 0.36, R * 0.1, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,240,220,0.6)';
          g.beginPath(); g.arc(x - R * 0.1, y + R * 0.52, R * 0.06, 0, TAU); g.fill();
          glint(g, x + R * 0.2, y - R * 0.55, R * 0.14);
          glint(g, x - R * 0.55, y + R * 0.1, R * 0.09);
          // wet lower lid gleam
          g.strokeStyle = 'rgba(255,236,205,0.75)'; g.lineWidth = 3.4; g.lineCap = 'round';
          g.beginPath(); g.arc(x, y + 4, R * 1.06, Math.PI * 0.32, Math.PI * 0.68); g.stroke();
          g.strokeStyle = 'rgba(126,200,232,0.35)'; g.lineWidth = 1.6;
          g.beginPath(); g.arc(x, y + 7, R * 1.1, Math.PI * 0.38, Math.PI * 0.62); g.stroke();
        }
        // the nose, tiny and wet, with pore stipple and whisker roots
        apoly(g, [[98, 210, 5], [122, 210, 5], [110, 228, 5]], '#221108', { lw: 2 });
        for (let i = 0; i < 16; i++) {
          const a = i * 2.399963;
          const rr = 2 + (i * 7919 % 100) / 100 * 6.5;
          g.fillStyle = 'rgba(120,110,100,0.3)';
          g.beginPath(); g.arc(110 + Math.cos(a) * rr, 216 + Math.sin(a) * rr * 0.6, 0.7, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath(); g.ellipse(104, 213, 4, 2.6, -0.3, 0, TAU); g.fill();
        // whisker roots and three whiskers per side, leaving the frame
        for (const s of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            g.fillStyle = 'rgba(60,40,20,0.7)';
            g.beginPath(); g.arc(110 + s * (26 + (i % 2) * 8), 224 + i * 7, 1.5, 0, TAU); g.fill();
          }
          g.strokeStyle = 'rgba(240,234,216,0.8)'; g.lineWidth = 1.6; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.moveTo(110 + s * 30, 226 + i * 8);
            g.quadraticCurveTo(110 + s * 80, 220 + i * 12, 110 + s * 120, 226 + i * 16);
            g.stroke();
          }
        }
        // a mouth so small it is mostly a rumor of a smile
        g.strokeStyle = '#54371e'; g.lineWidth = 2.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(102, 238); g.quadraticCurveTo(110, 244, 118, 238); g.stroke();
        g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 1.1;
        g.fillRect(104, 241, 5.6, 7); g.strokeRect(104, 241, 5.6, 7);
        g.fillRect(110.4, 241, 5.6, 7); g.strokeRect(110.4, 241, 5.6, 7);
      },
    },
  };

  // ---------------- bake and serve ----------------

  // Signature expression per character: 'signature' resolves through this,
  // and unknown expressions fall back to neutral so a typo in a dialogue tag
  // can never blank a face.
  const SIG = {
    brock: 'deadpan', max: 'determined', junie: 'grin',
    gus: 'serene', quartermaster: 'disapproval', critter: 'tilt',
  };

  const baseCache = new Map();
  const cache = new Map();

  function pmk(fn) {
    const c = document.createElement('canvas');
    c.width = PW * SS; c.height = PH * SS;
    const g = c.getContext('2d');
    g.scale(SS, SS);
    g.lineJoin = 'round'; g.lineCap = 'round';
    fn(g);
    return c;
  }

  function get(id, expression) {
    const def = CHARS[id];
    if (!def) return null;
    let e = expression || 'neutral';
    if (e === 'signature') e = SIG[id] || 'neutral';
    if (e === 'closeup' && !def.faces.closeup) e = SIG[id] || 'neutral';
    if (!def.faces[e]) e = 'neutral';
    const key = id + ':' + e;
    if (cache.has(key)) return cache.get(key);
    let c;
    if (e === 'closeup') {
      // macro shots frame themselves: no shared base underneath
      c = pmk(gg => def.faces.closeup(gg));
    } else {
      if (!baseCache.has(id)) baseCache.set(id, pmk(def.base));
      c = document.createElement('canvas');
      c.width = PW * SS; c.height = PH * SS;
      const g = c.getContext('2d');
      g.drawImage(baseCache.get(id), 0, 0);
      g.scale(SS, SS);
      g.lineJoin = 'round'; g.lineCap = 'round';
      def.faces[e](g);
    }
    cache.set(key, c);
    return c;
  }

  function has(id) {
    return !!CHARS[id];
  }

  // Maps the dialog's speaker string to a portrait id. Unknown speakers get
  // null, which the dialog reads as: no card, todays layout exactly.
  function idFor(speaker) {
    if (!speaker) return null;
    const s = String(speaker).toUpperCase();
    if (s.indexOf('BROCK') >= 0) return 'brock';
    if (s.indexOf('QUARTERMASTER') >= 0) return 'quartermaster';
    if (s.indexOf('SQUIRREL') >= 0 || s.indexOf('CRITTER') >= 0) return 'critter';
    if (/\bMAX\b/.test(s)) return 'max';
    if (/\bJUNIE\b/.test(s)) return 'junie';
    if (/\bGUS\b/.test(s)) return 'gus';
    return null;
  }

  function ids() {
    return Object.keys(CHARS);
  }

  return { get, has, idFor, ids, SIG, W: PW, H: PH };
})();
