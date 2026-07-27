// Merit Badge Massacre: Camp Hearthwood, the walkable home base. Pick your
// scout, spend badges at the board, hear Brock out, take the trail. The camp
// physically grows with your history: tents, banners, trophies, memorials.
'use strict';

const CAMP_ZOOM = 1.25;

class Camp {
  constructor() {
    this.p = { x: 0, y: 130, r: 11, face: 1, moving: false };
    this.t = 0;
    this.parts = [];
    this.near = null;
    this.msg = null;      // { text, t }
    this.fireflies = [];
    for (let i = 0; i < 14; i++) {
      this.fireflies.push({ x: rand(-380, 380), y: rand(-260, 260), a: rand(0, TAU), ph: rand(0, TAU) });
    }
  }

  scoutSpots() {
    return [
      { id: 'max', name: 'Max', x: -100, y: 80 },
      { id: 'junie', name: 'Junie', x: 10, y: 120 },
      { id: 'gus', name: 'Gus', x: 120, y: 70 },
    ];
  }

  spots() {
    const s = [
      { id: 'fire', x: 0, y: -70, r: 62, label: 'Talk to Scoutmaster Brock' },
      { id: 'board', x: -225, y: -30, r: 52, label: 'Open the Badge Board' },
      { id: 'sign', x: 240, y: 0, r: 50, label: 'Take the trail as ' + DATA.characters[META.selected].name },
    ];
    for (const sc of this.scoutSpots()) {
      s.push({
        id: 'scout:' + sc.id, x: sc.x, y: sc.y, r: 42,
        label: META.selected === sc.id ? sc.name + ' leads tonight' : 'Send ' + sc.name + ' tonight',
      });
    }
    return s;
  }

  update(dt) {
    this.t += dt;
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
    // keep inside the clearing
    const d = Math.hypot(p.x, p.y);
    if (d > 320) { p.x *= 320 / d; p.y *= 320 / d; }
    // keep out of the fire
    const fd = Math.hypot(p.x, p.y + 70);
    if (fd < 42) { p.x += (p.x / (fd || 1)) * (42 - fd); p.y = (p.y + 70) / (fd || 1) * (42 - fd) + p.y; }

    // nearest interactable
    this.near = null;
    let best = Infinity;
    for (const s of this.spots()) {
      const sd = Math.hypot(p.x - s.x, p.y - s.y);
      if (sd < s.r && sd < best) { best = sd; this.near = s; }
    }

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
    for (const f of this.fireflies) {
      f.a += rand(-1.2, 1.2) * dt;
      f.x += Math.cos(f.a) * 20 * dt;
      f.y += Math.sin(f.a) * 20 * dt;
    }
    if (this.msg) {
      this.msg.t -= dt;
      if (this.msg.t <= 0) this.msg = null;
    }
  }

  // Returns an action for the UI layer, or null.
  interact() {
    if (!this.near) return null;
    const id = this.near.id;
    if (id === 'sign') return { type: 'run' };
    if (id === 'board') return { type: 'shop' };
    if (id === 'fire') return { type: 'talk', line: brockLine() };
    if (id.startsWith('scout:')) {
      const scout = id.slice(6);
      META.selected = scout;
      META.save();
      this.msg = { text: SELECT_LINES[scout], t: 4 };
      return { type: 'select' };
    }
    return null;
  }

  render(ctx, W, H) {
    const tier = META.tier();
    ctx.fillStyle = '#141a10';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2 + 20);
    ctx.scale(CAMP_ZOOM, CAMP_ZOOM);

    // trampled clearing
    ctx.fillStyle = '#1c2415';
    ctx.beginPath(); ctx.ellipse(0, 10, 330, 240, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#232d1a';
    ctx.beginPath(); ctx.ellipse(0, -20, 190, 130, 0, 0, TAU); ctx.fill();

    // scattered ground detail
    const decos = [
      ['grass1', -280, -120], ['grass2', 250, -140], ['grass1', 280, 120], ['grass2', -260, 140],
      ['stone', -160, 160], ['stone', 190, 150], ['bone', -300, 40], ['grass1', 60, -180],
      ['grass2', -60, 200], ['stone', 300, -40], ['mush', -320, -60], ['mush', 320, 60],
    ];
    for (const d of decos) SPR.draw(ctx, d[0], d[1], d[2], d[0] === 'grass1' ? 24 : 20);

    // warm firelight pool
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flick = 0.09 + Math.sin(this.t * 11) * 0.015 + Math.sin(this.t * 23) * 0.008;
    const lg = ctx.createRadialGradient(0, -60, 10, 0, -60, 260);
    lg.addColorStop(0, 'rgba(255,150,60,' + flick + ')');
    lg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(0, -60, 260, 0, TAU); ctx.fill();
    ctx.restore();

    // draw list, y-sorted
    const items = [];
    const push = (y, fn) => items.push({ y, fn });

    // tents
    if (tier >= 1) push(-130, () => SPR.drawBottom(ctx, 'tent', -170, -108, 86));
    if (tier >= 2) push(-140, () => SPR.drawBottom(ctx, 'tent', 165, -118, 74, { flip: true }));
    // badge board and sign
    push(-30, () => {
      SPR.drawBottom(ctx, 'board', -225, -4, 62);
      if (tier >= 3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(244,197,66,' + (0.10 + Math.sin(this.t * 3) * 0.04) + ')';
        ctx.beginPath(); ctx.arc(-225, -30, 44, 0, TAU); ctx.fill();
        ctx.restore();
      }
    });
    push(0, () => SPR.drawBottom(ctx, 'sign', 240, 24, 40));
    // campfire
    push(-70, () => this.renderFire(ctx));
    // Brock by the fire
    push(-58, () => {
      const squash = 1 + Math.sin(this.t * 2.2) * 0.02;
      SPR.drawBottom(ctx, 'brock', 52, -46, 40, { flip: true, squash });
    });
    // trophy skull on a post after the first dawn
    if (tier >= 4) push(-131, () => {
      ctx.fillStyle = '#6e4526'; ctx.strokeStyle = '#181008'; ctx.lineWidth = 1.6;
      ctx.fillRect(-3, -168, 6, 40); ctx.strokeRect(-3, -168, 6, 40);
      SPR.draw(ctx, 'skull', 0, -175, 44);
    });
    // banner between poles
    if (tier >= 2) push(-160, () => {
      ctx.strokeStyle = '#8a6138'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-95, -205); ctx.lineTo(-95, -150); ctx.moveTo(95, -205); ctx.lineTo(95, -150); ctx.stroke();
      ctx.strokeStyle = '#3a2e20'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-95, -200); ctx.quadraticCurveTo(0, -188, 95, -200); ctx.stroke();
      const cols = ['#c0392b', '#f4c542', '#5c7248', '#4a76a8'];
      for (let i = 0; i < 8; i++) {
        const bx = -84 + i * 24;
        const by = -197 + Math.sin(i * 1.2) * 2 + 12 * (1 - Math.abs(i - 3.5) / 6);
        ctx.fillStyle = cols[i % 4];
        ctx.beginPath(); ctx.moveTo(bx - 7, by - 6); ctx.lineTo(bx + 7, by - 6); ctx.lineTo(bx, by + 8); ctx.closePath(); ctx.fill();
      }
    });
    // memorial marshmallow sticks, one per fallen run
    const sticks = Math.min(META.deaths, 12);
    for (let i = 0; i < sticks; i++) {
      const sx = -77 + i * 14;
      push(175, () => SPR.drawBottom(ctx, 'stick', sx, 188, 11));
    }
    // the three scouts
    for (const sc of this.scoutSpots()) {
      push(sc.y, () => {
        const isSel = META.selected === sc.id;
        const squash = 1 + Math.sin(this.t * 2.6 + sc.x) * 0.02;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(sc.x, sc.y + 12, 13, 5, 0, 0, TAU); ctx.fill();
        SPR.drawBottom(ctx, sc.id, sc.x, sc.y + 12, 32, { squash, flip: sc.x > 0 });
        if (isSel) {
          SPR.star(ctx, sc.x, sc.y - 44 + Math.sin(this.t * 3) * 2, 5);
          ctx.fillStyle = '#f4c542'; ctx.fill();
        }
      });
    }
    // the player walking around camp
    push(this.p.y, () => {
      const p = this.p;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, 12, 4.6, 0, 0, TAU); ctx.fill();
      SPR.drawScout(ctx, META.selected, p.x, p.y + p.r, 34, {
        flip: p.face < 0,
        phase: this.walkPhase || 0,
        moving: p.moving,
        squash: p.moving ? 1 : 1 + Math.sin(this.t * 2.4) * 0.015,
      });
    });

    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    // sparks above everything near the fire
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const pa of this.parts) {
      const k = pa.t / pa.life;
      ctx.fillStyle = 'rgba(255,' + Math.round(190 - k * 130) + ',70,' + (0.8 * (1 - k)) + ')';
      ctx.beginPath(); ctx.arc(pa.x, pa.y - k * 30, pa.size * (1 - k * 0.5), 0, TAU); ctx.fill();
    }
    for (const f of this.fireflies) {
      const a = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(this.t * 2 + f.ph));
      ctx.fillStyle = 'rgba(190,230,120,' + a + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // interaction prompt
    if (this.near) {
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

    // scout selection line
    if (this.msg) {
      ctx.font = 'italic 13px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, this.msg.t);
      ctx.fillStyle = 'rgba(10,12,16,0.85)';
      const tw = ctx.measureText(this.msg.text).width;
      ctx.beginPath(); ctx.roundRect(-tw / 2 - 12, 216, tw + 24, 26, 7); ctx.fill();
      ctx.fillStyle = '#d9d2c0';
      ctx.fillText(this.msg.text, 0, 233);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // letterhead
    ctx.font = 'bold 15px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(217,210,192,0.55)';
    ctx.fillText('CAMP HEARTHWOOD', W / 2, 34);
    ctx.font = '11px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(244,197,66,0.8)';
    ctx.fillText(META.badges + ' badges banked', W / 2, 52);
  }

  renderFire(ctx) {
    // logs
    ctx.save();
    ctx.translate(0, -62);
    [[-0.35, '#6e4526'], [0.35, '#5c3a20']].forEach(l => {
      ctx.save(); ctx.rotate(l[0]);
      ctx.fillStyle = l[1]; ctx.strokeStyle = '#181008'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.roundRect(-20, -4, 40, 8, 4); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    // flames, three flickering layers
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
}
