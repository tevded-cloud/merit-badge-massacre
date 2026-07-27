// Merit Badge Massacre: all art is drawn code. Smooth vector shapes baked to
// offscreen canvases at 2x supersampling. No image assets anywhere.
'use strict';

const SPR = (() => {
  const TAU = Math.PI * 2;
  const OUT = '#181008';
  const cache = new Map();

  function mk(w, h, fn) {
    const SS = 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
    const g = c.getContext('2d');
    g.scale(SS, SS);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const eyes = [];
    fn(g, eyes);
    return { c, w, h, eyes, wc: null };
  }

  // Rounded organic shape with baked-in shading and outline.
  function blob(g, x, y, rx, ry, fill, o) {
    o = o || {};
    g.save();
    g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    g.fillStyle = fill; g.fill();
    if (!o.flat) {
      g.save(); g.clip();
      g.beginPath(); g.ellipse(0, ry * 0.55, rx * 1.15, ry * 0.8, 0, 0, TAU);
      g.fillStyle = o.shade || 'rgba(12,5,3,0.24)'; g.fill();
      g.beginPath(); g.ellipse(-rx * 0.28, -ry * 0.45, rx * 0.6, ry * 0.46, 0, 0, TAU);
      g.fillStyle = o.hi || 'rgba(255,244,214,0.17)'; g.fill();
      g.restore();
    }
    if (!o.noline) {
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
      g.lineWidth = o.lw || 1.7; g.strokeStyle = o.line || OUT; g.stroke();
    }
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

  // Glossy possessed eye. Registers its center so the renderer can pulse a glow.
  function demonEye(g, eyes, x, y, r) {
    blob(g, x, y, r * 1.3, r * 1.25, '#170a06', { flat: true, lw: 1.1 });
    const grd = g.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, '#ff9a52');
    grd.addColorStop(0.55, '#f03818');
    grd.addColorStop(1, '#8c0f06');
    g.beginPath(); g.ellipse(x, y, r, r * 0.95, 0, 0, TAU);
    g.fillStyle = grd; g.fill();
    g.beginPath(); g.ellipse(x, y, r * 0.24, r * 0.7, 0, 0, TAU);
    g.fillStyle = '#1a0402'; g.fill();
    g.beginPath(); g.arc(x - r * 0.32, y - r * 0.38, r * 0.22, 0, TAU);
    g.fillStyle = 'rgba(255,240,230,0.85)'; g.fill();
    eyes.push([x, y]);
  }

  function cuteEye(g, x, y, r) {
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = '#221a12'; g.fill();
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
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
    blob(g, 13, 28, 10, 15, '#8a4423', { rot: 0.35 });            // tail lower
    blob(g, 17, 14, 8, 10, '#a4552c', { rot: -0.4 });             // tail curl
    blob(g, 33, 37, 14, 12, '#a4552c');                            // body
    blob(g, 33, 40, 8, 6.5, '#e8cfa5', { flat: true, noline: true });
    blob(g, 30, 9, 3.6, 5.2, '#a4552c', { rot: -0.15 });          // ears
    blob(g, 43, 9, 3.6, 5.2, '#a4552c', { rot: 0.15 });
    blob(g, 30, 10, 1.6, 2.4, '#e88f7a', { flat: true, noline: true });
    blob(g, 43, 10, 1.6, 2.4, '#e88f7a', { flat: true, noline: true });
    blob(g, 36.5, 19, 11.5, 10, '#b25f31');                        // head
    blob(g, 41, 24, 5, 3.8, '#e8cfa5', { flat: true, noline: true });
    g.beginPath(); g.arc(43, 22.5, 1.4, 0, TAU); g.fillStyle = '#221108'; g.fill();
    demonEye(g, eyes, 32, 17, 3);
    demonEye(g, eyes, 41.5, 17, 3);
    blob(g, 27, 46, 4, 2.6, '#8a4423', { flat: true });
    blob(g, 39, 46, 4, 2.6, '#8a4423', { flat: true });
    pendant(g, 33, 33, 2.8);
  });

  P.rabbit = () => mk(48, 56, (g, eyes) => {
    blob(g, 18, 12, 4.4, 12, '#e9e4da', { rot: -0.12 });          // ears
    blob(g, 30, 12, 4.4, 12, '#e9e4da', { rot: 0.12 });
    blob(g, 18, 13, 2, 8, '#e8a0a0', { rot: -0.12, flat: true, noline: true });
    blob(g, 30, 13, 2, 8, '#e8a0a0', { rot: 0.12, flat: true, noline: true });
    blob(g, 24, 45, 12.5, 10, '#e9e4da');                          // body
    blob(g, 24, 30, 11.5, 10.5, '#f2ede3');                        // head
    demonEye(g, eyes, 19, 28, 3.1);
    demonEye(g, eyes, 29.5, 28, 3.1);
    blob(g, 24, 34, 2, 1.4, '#e8a0a0', { flat: true, noline: true });
    g.strokeStyle = '#9a938a'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(20, 34); g.lineTo(13, 33); g.moveTo(20, 35.5); g.lineTo(13.5, 36.5);
    g.moveTo(28, 34); g.lineTo(35, 33); g.moveTo(28, 35.5); g.lineTo(34.5, 36.5); g.stroke();
    poly(g, [[21.5, 37], [23.5, 37], [22.5, 40.5]], '#fffdf6', { lw: 0.7 });   // little fangs
    poly(g, [[24.5, 37], [26.5, 37], [25.5, 40.5]], '#fffdf6', { lw: 0.7 });
    blob(g, 16, 53, 5, 2.8, '#e9e4da', { flat: true });
    blob(g, 32, 53, 5, 2.8, '#e9e4da', { flat: true });
    pendant(g, 24, 44, 2.8);
  });

  P.doe = () => mk(60, 62, (g, eyes) => {
    blob(g, 13, 13, 5.4, 9, '#c69a63', { rot: -0.55 });           // ears
    blob(g, 47, 13, 5.4, 9, '#c69a63', { rot: 0.55 });
    blob(g, 13.5, 13.5, 2.4, 5, '#e8b0a0', { rot: -0.55, flat: true, noline: true });
    blob(g, 46.5, 13.5, 2.4, 5, '#e8b0a0', { rot: 0.55, flat: true, noline: true });
    // legs behind chest
    g.lineWidth = 4; g.strokeStyle = '#a97a4a';
    [[21, 46, 20, 59], [39, 46, 40, 59], [26, 48, 25, 60], [34, 48, 35, 60]].forEach(l => {
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke();
    });
    g.lineWidth = 4.4; g.strokeStyle = OUT;
    [[20, 57, 20, 60], [40, 57, 40, 60], [25, 58, 25, 61], [35, 58, 35, 61]].forEach(l => {
      g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke();
    });
    blob(g, 30, 40, 14, 13, '#c69a63');                            // chest
    [[24, 36], [36, 36], [27, 43], [33, 43]].forEach(s => blob(g, s[0], s[1], 1.7, 1.7, '#efe0c2', { flat: true, noline: true }));
    blob(g, 30, 17, 11.5, 10.5, '#c69a63');                        // head
    blob(g, 30, 25, 6, 4.6, '#dab98a', { flat: true, noline: true });
    g.beginPath(); g.arc(30, 24, 1.7, 0, TAU); g.fillStyle = '#221108'; g.fill();
    demonEye(g, eyes, 24.5, 15, 3.2);
    demonEye(g, eyes, 35.5, 15, 3.2);
    pendant(g, 30, 35, 3.2);
  });

  P.bat = () => mk(56, 36, (g, eyes) => {
    const wing = (sx) => {
      g.save(); g.translate(28, 18); g.scale(sx, 1);
      g.beginPath();
      g.moveTo(4, -2);
      g.quadraticCurveTo(14, -12, 25, -8);
      g.quadraticCurveTo(22, -2, 24, 4);
      g.quadraticCurveTo(18, 2, 16, 8);
      g.quadraticCurveTo(12, 4, 4, 8);
      g.closePath();
      g.fillStyle = '#4a3c5c'; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
      g.restore();
    };
    wing(1); wing(-1);
    poly(g, [[23, 8], [26, 12], [21, 13]], '#5a4a6e');             // ears
    poly(g, [[33, 8], [30, 12], [35, 13]], '#5a4a6e');
    blob(g, 28, 19, 8.5, 9, '#5a4a6e');                            // body
    demonEye(g, eyes, 24.8, 17, 2.6);
    demonEye(g, eyes, 31.2, 17, 2.6);
    poly(g, [[25.5, 23.5], [27.5, 23.5], [26.5, 26.5]], '#fffdf6', { lw: 0.6 });
    poly(g, [[28.5, 23.5], [30.5, 23.5], [29.5, 26.5]], '#fffdf6', { lw: 0.6 });
  });

  P.raccoon = () => mk(54, 48, (g, eyes) => {
    blob(g, 45, 30, 6, 9, '#8a9097', { rot: 0.4 });               // ringed tail
    blob(g, 46.5, 25, 5, 4, '#3c3f45', { rot: 0.4, flat: true, noline: true });
    blob(g, 44, 35, 5, 4, '#3c3f45', { rot: 0.4, flat: true, noline: true });
    blob(g, 26, 34, 14, 11.5, '#9aa0a8');                          // body
    blob(g, 26, 38, 8, 6, '#c9cdd2', { flat: true, noline: true });
    blob(g, 17, 7.5, 4, 4.6, '#9aa0a8', { rot: -0.2 });           // ears
    blob(g, 35, 7.5, 4, 4.6, '#9aa0a8', { rot: 0.2 });
    blob(g, 26, 16, 12.5, 10.5, '#aab0b8');                        // head
    blob(g, 26, 14.5, 11, 4.6, '#26221f', { flat: true, lw: 1.2 }); // mask
    demonEye(g, eyes, 20.5, 14.5, 3);
    demonEye(g, eyes, 31.5, 14.5, 3);
    blob(g, 26, 21.5, 5.2, 3.6, '#e6e0d2', { flat: true, noline: true });
    g.beginPath(); g.arc(26, 20.5, 1.5, 0, TAU); g.fillStyle = '#221108'; g.fill();
    blob(g, 18, 44, 4, 2.6, '#6e747c', { flat: true });
    blob(g, 34, 44, 4, 2.6, '#6e747c', { flat: true });
    pendant(g, 26, 30, 2.8);
  });

  P.owl = () => mk(48, 54, (g, eyes) => {
    poly(g, [[9, 12], [15, 4], [18, 13]], '#8a5a34');              // tufts
    poly(g, [[39, 12], [33, 4], [30, 13]], '#8a5a34');
    blob(g, 24, 31, 15.5, 17.5, '#8a5a34');                        // body
    blob(g, 13, 30, 5, 12, '#6e4526', { rot: 0.25, flat: true, noline: true });   // wings
    blob(g, 35, 30, 5, 12, '#6e4526', { rot: -0.25, flat: true, noline: true });
    blob(g, 24, 38, 8.5, 8.5, '#c9a06a', { flat: true, noline: true });
    g.strokeStyle = '#6e4526'; g.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(19, 35 + i * 3.4); g.lineTo(24, 38 + i * 3.4); g.lineTo(29, 35 + i * 3.4); g.stroke();
    }
    blob(g, 17, 19, 7.4, 7.4, '#e8d9b0', { lw: 1.2 });             // eye discs
    blob(g, 31, 19, 7.4, 7.4, '#e8d9b0', { lw: 1.2 });
    demonEye(g, eyes, 17, 19, 3.6);
    demonEye(g, eyes, 31, 19, 3.6);
    poly(g, [[21.5, 25], [26.5, 25], [24, 30]], '#e0a83c');        // beak
    g.strokeStyle = '#e0a83c'; g.lineWidth = 1.6;
    [[18, 49], [30, 49]].forEach(t => {
      g.beginPath();
      g.moveTo(t[0] - 3, t[1] + 4); g.lineTo(t[0], t[1]);
      g.lineTo(t[0] + 3, t[1] + 4); g.moveTo(t[0], t[1]); g.lineTo(t[0], t[1] + 4.5);
      g.stroke();
    });
  });

  P.boar = () => mk(66, 44, (g, eyes) => {
    g.beginPath();                                                  // bristle mane
    g.moveTo(10, 16);
    for (let i = 0; i < 7; i++) { g.lineTo(13 + i * 6, 7 + (i % 2) * 3); g.lineTo(16 + i * 6, 15); }
    g.lineTo(56, 18); g.lineTo(10, 20); g.closePath();
    g.fillStyle = '#42301f'; g.fill(); g.lineWidth = 1.4; g.strokeStyle = OUT; g.stroke();
    blob(g, 33, 26, 26, 15, '#5c4530');                            // body
    poly(g, [[14, 13], [20, 6], [23, 14]], '#5c4530');             // ears
    poly(g, [[52, 13], [46, 6], [43, 14]], '#5c4530');
    blob(g, 33, 33, 9, 6.4, '#7a5a40');                            // snout
    g.fillStyle = '#33241a';
    g.beginPath(); g.ellipse(30, 33, 1.5, 2.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(36, 33, 1.5, 2.2, 0, 0, TAU); g.fill();
    g.strokeStyle = '#f0ead8'; g.lineWidth = 3.4;                   // tusks
    g.beginPath(); g.moveTo(23, 34); g.quadraticCurveTo(19, 30, 20, 24); g.stroke();
    g.beginPath(); g.moveTo(43, 34); g.quadraticCurveTo(47, 30, 46, 24); g.stroke();
    demonEye(g, eyes, 24, 20, 2.9);
    demonEye(g, eyes, 42, 20, 2.9);
    [[18, 40], [28, 41], [38, 41], [48, 40]].forEach(f => blob(g, f[0], f[1], 3.4, 2.4, '#33241a', { flat: true }));
  });

  P.fox = () => mk(58, 48, (g, eyes) => {
    blob(g, 47, 33, 10.5, 8, '#d2692e', { rot: 0.5 });             // tail
    blob(g, 53, 38, 4.6, 4, '#efe6d8', { rot: 0.5, flat: true, noline: true });
    blob(g, 25, 35, 13, 10, '#d2692e');                            // body
    blob(g, 25, 39, 7, 5.4, '#efe6d8', { flat: true, noline: true });
    poly(g, [[13, 2], [20, 13], [10, 12]], '#d2692e');             // ears
    poly(g, [[14, 5], [18, 11.5], [12.5, 11]], '#3a2417', { noline: true });
    poly(g, [[39, 2], [32, 13], [42, 12]], '#d2692e');
    poly(g, [[38, 5], [34, 11.5], [39.5, 11]], '#3a2417', { noline: true });
    blob(g, 26, 17, 11.5, 9.5, '#e0722f');                          // head
    blob(g, 26, 23, 5.4, 3.8, '#efe6d8', { flat: true, noline: true });
    g.beginPath(); g.arc(26, 21.6, 1.5, 0, TAU); g.fillStyle = '#221108'; g.fill();
    demonEye(g, eyes, 20.8, 15, 3);
    demonEye(g, eyes, 31.2, 15, 3);
    blob(g, 17, 44, 4, 2.6, '#a04d1e', { flat: true });
    blob(g, 33, 44, 4, 2.6, '#a04d1e', { flat: true });
    pendant(g, 25, 30, 2.8);
  });

  P.beaver = () => mk(56, 50, (g, eyes) => {
    g.save(); g.translate(28, 44);                                  // flat tail
    g.beginPath(); g.ellipse(0, 0, 12, 6, 0, 0, TAU);
    g.fillStyle = '#4e3520'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    g.save(); g.clip(); g.strokeStyle = 'rgba(20,10,5,0.5)'; g.lineWidth = 0.8;
    for (let i = -10; i <= 10; i += 4) {
      g.beginPath(); g.moveTo(i, -6); g.lineTo(i + 3, 6); g.stroke();
      g.beginPath(); g.moveTo(-12, i * 0.5); g.lineTo(12, i * 0.5); g.stroke();
    }
    g.restore(); g.restore();
    blob(g, 28, 28, 15, 13.5, '#7a4e2c');                           // body
    blob(g, 28, 32, 8.5, 7, '#a4784a', { flat: true, noline: true });
    blob(g, 19, 6.5, 3.4, 3.8, '#7a4e2c');                          // ears
    blob(g, 37, 6.5, 3.4, 3.8, '#7a4e2c');
    blob(g, 28, 14, 11, 9.5, '#8a5a34');                            // head
    demonEye(g, eyes, 23, 12, 2.9);
    demonEye(g, eyes, 33, 12, 2.9);
    blob(g, 28, 18.5, 4.4, 3, '#a4784a', { flat: true, noline: true });
    g.fillStyle = '#fffdf6'; g.strokeStyle = OUT; g.lineWidth = 0.8;
    g.fillRect(25.4, 19.5, 2.4, 4.6); g.strokeRect(25.4, 19.5, 2.4, 4.6);
    g.fillRect(28.2, 19.5, 2.4, 4.6); g.strokeRect(28.2, 19.5, 2.4, 4.6);
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
      blob(g, cx - 4.5 * wide, 49, 3, 5, o.skin, { flat: true, lw: 1.2 });
      blob(g, cx + 4.5 * wide, 49, 3, 5, o.skin, { flat: true, lw: 1.2 });
      blob(g, cx - 4.5 * wide, 54.5, 4.2, 2.6, '#3a2e20', { flat: true, lw: 1.2 });
      blob(g, cx + 4.5 * wide, 54.5, 4.2, 2.6, '#3a2e20', { flat: true, lw: 1.2 });
    }
    blob(g, cx, 42, 9 * wide, 5.4, o.shorts);
    blob(g, cx, 32, 10 * wide, 9.4, o.shirt);
    // badge sash dots
    g.fillStyle = '#f4c542';
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.arc(cx - 4 + i * 4, 29.5 + i * 2.4, 1.3, 0, TAU); g.fill();
    }
    poly(g, [[cx - 8, 23.5], [cx + 8, 23.5], [cx, 32]], o.kerchief); // neckerchief
    g.beginPath(); g.arc(cx, 25.5, 1.8, 0, TAU); g.fillStyle = o.kerchief; g.fill();
    g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
    blob(g, cx, 15, 10, 9.2, o.skin);                                // head
    cuteEye(g, cx - 3.8, 14.5, 1.7);
    cuteEye(g, cx + 3.8, 14.5, 1.7);
    g.strokeStyle = '#5c422e'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 5.4, 11.4); g.lineTo(cx - 2.4, 10.8); g.stroke();
    g.beginPath(); g.moveTo(cx + 5.4, 11.4); g.lineTo(cx + 2.4, 10.8); g.stroke();
    g.strokeStyle = '#8a5a3c'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(cx - 1.6, 19.4); g.quadraticCurveTo(cx, 20.8, cx + 1.6, 19.4); g.stroke();
    blob(g, cx - 6.4, 18, 1.7, 1.1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
    blob(g, cx + 6.4, 18, 1.7, 1.1, 'rgba(232,120,100,0.4)', { flat: true, noline: true });
  }

  const SCOUT_OPTS = {
    max: { cx: 22, skin: '#f0c294', shirt: '#c9a86a', shorts: '#3a4a63', kerchief: '#c0392b' },
    junie: { cx: 22, skin: '#e8b384', shirt: '#5c7248', shorts: '#4a3a2c', kerchief: '#d8722f' },
    gus: { cx: 25, wide: true, skin: '#e8b384', shirt: '#b8a06a', shorts: '#4c5a3a', kerchief: '#8c5c9c' },
  };

  const SCOUT_HATS = {
    max(g) {
      blob(g, 22, 7.6, 12, 3, '#7a5230', { lw: 1.4 });               // campaign hat
      blob(g, 22, 3.6, 6.2, 4.2, '#7a5230', { lw: 1.4 });
      g.strokeStyle = '#54371e'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(16.4, 6.4); g.lineTo(27.6, 6.4); g.stroke();
    },
    junie(g) {
      blob(g, 22, 9, 10.4, 4.6, '#d2692e', { flat: true, lw: 1.3 }); // hair fringe
      blob(g, 14, 13, 2.2, 4.6, '#d2692e', { flat: true, noline: true });
      blob(g, 30, 13, 2.2, 4.6, '#d2692e', { flat: true, noline: true });
      blob(g, 20, 4.4, 9.4, 4, '#3f6b35', { lw: 1.4, rot: -0.12 });  // beret
      g.beginPath(); g.arc(20, 0.8, 1.3, 0, TAU); g.fillStyle = '#2c4b25'; g.fill();
      g.fillStyle = 'rgba(150,90,50,0.5)';                           // freckles
      [[18, 17.6], [20, 18.4], [24, 18.4], [26, 17.6]].forEach(f => {
        g.beginPath(); g.arc(f[0], f[1], 0.6, 0, TAU); g.fill();
      });
    },
    gus(g) {
      blob(g, 32.5, 6.6, 5, 2.4, '#8c2d24', { flat: true, lw: 1.3 }); // backwards cap bill
      blob(g, 25, 5.6, 9.4, 5, '#b03a2e', { lw: 1.4 });
      g.beginPath(); g.arc(25, 5, 1.4, 0, TAU); g.fillStyle = '#e8e0cc'; g.fill();
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
    g.beginPath();
    g.arc(18, 16, 13, Math.PI, 0);
    g.lineTo(31, 32);
    g.quadraticCurveTo(28.5, 27, 25.5, 32);
    g.quadraticCurveTo(22.5, 37, 19.5, 32);
    g.quadraticCurveTo(16.5, 27, 13.5, 32);
    g.quadraticCurveTo(10.5, 37, 7.5, 32);
    g.quadraticCurveTo(6, 29, 5, 32);
    g.closePath();
    g.fillStyle = '#eef2f4'; g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(90,100,110,0.8)'; g.stroke();
    g.fillStyle = '#3a4148';
    g.beginPath(); g.ellipse(13.5, 15, 1.9, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(22.5, 15, 1.9, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(18, 22, 2.4, 3.2, 0, 0, TAU);
    g.fillStyle = '#5a6168'; g.fill();
    g.globalAlpha = 1;
  });

  P.hat_max = () => mk(26, 13, (g) => {
    blob(g, 13, 9, 12, 3, '#7a5230', { lw: 1.3 });
    blob(g, 13, 4.6, 6.2, 3.8, '#7a5230', { lw: 1.3 });
  });
  P.hat_junie = () => mk(24, 11, (g) => {
    blob(g, 12, 6.5, 9.4, 3.8, '#3f6b35', { lw: 1.3, rot: -0.1 });
    g.beginPath(); g.arc(12, 1.8, 1.3, 0, TAU); g.fillStyle = '#2c4b25'; g.fill();
  });
  P.hat_gus = () => mk(24, 13, (g) => {
    blob(g, 10, 7, 8.6, 4.6, '#b03a2e', { lw: 1.3 });
    blob(g, 19, 8, 4.6, 2.2, '#8c2d24', { flat: true, lw: 1.2 });
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
    blob(g, 25, 40, 14, 13, '#6e6a62', { lw: 1.8 });                       // body
    blob(g, 25, 44, 8, 6.4, '#8a867c', { flat: true, noline: true });
    // sash
    g.strokeStyle = '#3f6b35'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(15, 32); g.lineTo(33, 48); g.stroke();
    g.fillStyle = '#f4c542';
    [[19, 36], [24, 40], [29, 44]].forEach(d => { g.beginPath(); g.arc(d[0], d[1], 1.6, 0, TAU); g.fill(); });
    blob(g, 16, 15, 4, 4.4, '#6e6a62');                                    // ears
    blob(g, 34, 15, 4, 4.4, '#6e6a62');
    blob(g, 25, 22, 12.5, 11, '#8a867c');                                  // head
    // badger stripes
    blob(g, 20, 20, 3.2, 8.4, '#2e2a26', { rot: -0.12, flat: true, noline: true });
    blob(g, 30, 20, 3.2, 8.4, '#2e2a26', { rot: 0.12, flat: true, noline: true });
    blob(g, 25, 21, 2.6, 9, '#e6ded0', { flat: true, noline: true });
    cuteEye(g, 20, 19.5, 1.9);
    cuteEye(g, 30, 19.5, 1.9);
    blob(g, 25, 28.5, 4.6, 3.2, '#e6ded0', { flat: true, noline: true });  // muzzle
    g.beginPath(); g.arc(25, 27.4, 1.6, 0, TAU); g.fillStyle = '#181008'; g.fill();
    blob(g, 25, 8.6, 10.4, 2.6, '#7a5230', { lw: 1.3 });                   // campaign hat
    blob(g, 25, 5, 5.4, 3.4, '#7a5230', { lw: 1.3 });
    // whistle
    g.strokeStyle = '#c9d2d8'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(25, 32); g.lineTo(25, 37); g.stroke();
    g.fillStyle = '#c9d2d8'; g.beginPath(); g.arc(25, 38.5, 2, 0, TAU); g.fill();
  });

  P.stick = () => mk(14, 26, (g) => {
    g.strokeStyle = '#8a6138'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(7, 26); g.lineTo(7, 8); g.stroke();
    blob(g, 7, 6, 3.6, 4, '#f6efe2', { lw: 1.1 });                          // marshmallow
    blob(g, 8.4, 4.6, 1.6, 1.4, '#3a2313', { flat: true, noline: true });   // burnt
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

  function draw(ctx, name, x, y, w, o) {
    o = o || {};
    const s = get(name);
    const sc = w / s.w;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.flip ? -sc : sc, sc * (o.squash || 1));
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.drawImage(o.white ? whiteOf(s) : s.c, -s.w / 2, -s.h / 2, s.w, s.h);
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
    // legs
    for (const s of [-1, 1]) {
      const swing = moving ? Math.sin(phase + (s > 0 ? 0 : Math.PI)) * 0.62 : 0.04 * s;
      const fx = x + s * hipDx + Math.sin(swing) * legLen * (o.flip ? -1 : 1);
      const lift = moving ? Math.max(0, Math.sin(phase + (s > 0 ? 0 : Math.PI) + Math.PI / 2)) * 3 * u : 0;
      const fy = yBottom - lift;
      ctx.strokeStyle = skin;
      ctx.lineWidth = 3.4 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * hipDx, hipY);
      ctx.lineTo(fx, fy - 2 * u);
      ctx.stroke();
      ctx.fillStyle = '#3a2e20';
      ctx.beginPath();
      ctx.ellipse(fx + (o.flip ? -1 : 1) * u, fy - 1.4 * u, 3.4 * u, 2 * u, 0, 0, TAU);
      ctx.fill();
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
