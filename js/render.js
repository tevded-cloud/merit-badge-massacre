// Merit Badge Massacre: everything that draws. These are the same methods
// that used to sit at the bottom of the Game class, moved out unchanged and
// hung on Game.prototype (game.js loads first).
'use strict';

(function () {

  // ---------------- render ----------------
  Game.prototype.render = function (ctx, W, H) {
    const p = this.player;
    this.cam.x = p.x;
    this.cam.y = p.y;
    if (this.room && this.room.bounds) {
      // clamp the camera to the room, centering any axis the room is
      // narrower than the viewport on
      const b = this.room.bounds;
      const zz = ZOOM * this.zoomF;
      const hw = W / (2 * zz), hh = H / (2 * zz);
      this.cam.x = (b.x1 - b.x0) < hw * 2 ? (b.x0 + b.x1) / 2 : clamp(this.cam.x, b.x0 + hw, b.x1 - hw);
      this.cam.y = (b.y1 - b.y0) < hh * 2 ? (b.y0 + b.y1) / 2 : clamp(this.cam.y, b.y0 + hh, b.y1 - hh);
    }

    ctx.fillStyle = '#131a11';
    ctx.fillRect(0, 0, W, H);

    const Z = ZOOM * this.zoomF;
    ctx.save();
    ctx.translate(W / 2 + this.shakeX, H / 2 + this.shakeY);
    ctx.scale(Z, Z);
    ctx.translate(-this.cam.x, -this.cam.y);

    const vw = W / Z, vh = H / Z;
    this.renderGround(ctx, vw, vh);

    // puddles under everything
    for (const pd of this.puddles) {
      const a = clamp(pd.life, 0, 1) * 0.4;
      ctx.fillStyle = 'rgba(110,190,230,' + (a * 0.55) + ')';
      ctx.beginPath(); ctx.ellipse(pd.x, pd.y, pd.r, pd.r * 0.62, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(180,230,250,' + a + ')';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,250,255,' + (a * 0.9) + ')';
      for (let i = 0; i < 3; i++) {
        const gx = pd.x + Math.cos(this.t * 2 + i * 2.1) * pd.r * 0.5;
        const gy = pd.y + Math.sin(this.t * 3 + i * 1.7) * pd.r * 0.3;
        ctx.beginPath(); ctx.arc(gx, gy, 2, 0, TAU); ctx.fill();
      }
    }

    // bugspray aura
    const spray = this.weapons.find(w => w.id === 'bugspray');
    if (spray) {
      const r = spray.stats.radius;
      const pulse = 1 + Math.sin(this.t * 3) * 0.03;
      ctx.fillStyle = 'rgba(120,190,90,0.10)';
      ctx.beginPath(); ctx.arc(p.x, p.y, r * pulse, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(140,210,110,0.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // charge telegraphs under entities
    for (const e of this.enemies) {
      if (e.ai && e.ai.telegraph) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.ai.telegraph.a);
        ctx.fillStyle = 'rgba(220,60,40,0.16)';
        ctx.fillRect(0, -e.r, e.ai.telegraph.len, e.r * 2);
        ctx.restore();
      }
    }

    // gems
    for (const g of this.gems) {
      const bobY = Math.sin(this.t * 4 + g.ph) * 2.5;
      const name = g.v >= 25 ? 'badge3' : (g.v >= 5 ? 'badge2' : 'badge1');
      SPR.draw(ctx, name, g.x, g.y + bobY, 15);
    }
    // pickups
    for (const pk of this.pickups) {
      const bobY = Math.sin(this.t * 3 + pk.t) * 3;
      if (pk.type === 'chest') {
        ctx.fillStyle = 'rgba(244,197,66,' + (0.16 + Math.sin(this.t * 5) * 0.06) + ')';
        ctx.beginPath(); ctx.arc(pk.x, pk.y + bobY, 22, 0, TAU); ctx.fill();
      }
      SPR.draw(ctx, pk.type === 'chest' ? 'chest' : pk.type, pk.x, pk.y + bobY, pk.type === 'chest' ? 26 : 21);
    }

    // death pops: white silhouette inflates and bursts
    for (const c of this.corpses) {
      const k = c.t / c.dur;
      SPR.drawBottom(ctx, c.spr, c.x, c.y, c.w * (1 + k * 0.45), {
        flip: c.flip, white: true, alpha: 0.9 * (1 - k), squash: 1 - k * 0.25,
      });
    }

    // y-sorted entities: one shared draw list so props and doors interleave
    // correctly with enemies and the player
    const zbuf = [];
    for (const e of this.enemies) zbuf.push({ y: e.y, t: 'enemy', o: e });
    for (const pr of this.props) zbuf.push({ y: pr.y + (pr.r || 0), t: 'prop', o: pr });
    if (this.room && this.room.doors) {
      for (const d of this.room.doors) zbuf.push({ y: d.y, t: 'door', o: d });
    }
    zbuf.push({ y: p.y, t: 'player', o: p });
    zbuf.sort((a, b) => a.y - b.y);
    for (const z of zbuf) {
      if (z.t === 'enemy') this.renderEnemy(ctx, z.o);
      else if (z.t === 'prop') this.renderProp(ctx, z.o);
      else if (z.t === 'door') this.renderDoor(ctx, z.o);
      else this.renderPlayer(ctx);
    }

    // swings (hatchet arcs)
    for (const sw of this.swings) {
      const k = sw.t / sw.dur;
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.rotate(sw.a);
      ctx.fillStyle = 'rgba(240,235,220,' + (0.35 * (1 - k)) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, sw.range, -sw.arc / 2 + k * 0.5, sw.arc / 2 + k * 0.5);
      ctx.arc(0, 0, sw.range * 0.35, sw.arc / 2 + k * 0.5, -sw.arc / 2 + k * 0.5, true);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // player shots
    for (const s of this.shots) {
      if (s.kind === 'pebble') {
        ctx.fillStyle = '#cfc9b8';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(60,50,40,0.5)';
        ctx.beginPath(); ctx.arc(s.x + 1, s.y + 1, s.r * 0.5, 0, TAU); ctx.fill();
      } else if (s.kind === 'flame') {
        const k = 1 - s.life / s.maxlife;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rr = s.r * (0.7 + k * 1.1);
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
        grd.addColorStop(0, 'rgba(255,230,150,' + (0.9 * (1 - k)) + ')');
        grd.addColorStop(0.5, 'rgba(255,130,40,' + (0.55 * (1 - k)) + ')');
        grd.addColorStop(1, 'rgba(200,40,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (s.kind === 'boomer') {
        SPR.draw(ctx, 'boomer', s.x, s.y, s.r * 2.2, { rot: s.spin });
      }
    }

    // bombs in flight
    for (const b of this.bombs) {
      if (b.type === 'boom') {
        SPR.draw(ctx, 'bomb', b.x, b.y, 13, { rot: b.t * 9 });
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,210,110,0.9)';
        ctx.beginPath(); ctx.arc(b.x + rand(-2, 2), b.y - 9 + rand(-2, 2), 2, 0, TAU); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(126,200,232,0.9)';
        ctx.beginPath(); ctx.ellipse(b.x, b.y, 5, 7, 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(230,250,255,0.8)';
        ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 2, 1.6, 0, TAU); ctx.fill();
      }
    }

    // enemy shots
    for (const s of this.eshots) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2);
      grd.addColorStop(0, 'rgba(255,120,200,0.9)');
      grd.addColorStop(0.5, 'rgba(180,40,160,0.5)');
      grd.addColorStop(1, 'rgba(120,10,120,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f8d8f0';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, TAU); ctx.fill();
    }

    // bugle rings
    for (const rg of this.rings) {
      const k = rg.r / rg.max;
      ctx.strokeStyle = 'rgba(244,197,66,' + (0.65 * (1 - k)) + ')';
      ctx.lineWidth = 5 * (1 - k) + 1.5;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, TAU); ctx.stroke();
    }

    // particles
    for (const pa of this.parts) {
      const k = pa.t / pa.life;
      if (pa.kind === 'puff') {
        ctx.fillStyle = 'rgba(40,36,44,' + (0.5 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * (1 + k * 1.4), 0, TAU); ctx.fill();
      } else if (pa.kind === 'ember') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,' + Math.round(170 - k * 120) + ',60,' + (0.85 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * (1 - k * 0.5), 0, TAU); ctx.fill();
        ctx.restore();
      } else if (pa.kind === 'spark') {
        ctx.fillStyle = pa.color || '#f4c542';
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (pa.kind === 'ring') {
        ctx.strokeStyle = 'rgba(255,200,120,' + (0.8 * (1 - k)) + ')';
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * k, 0, TAU); ctx.stroke();
      } else if (pa.kind === 'ghost') {
        SPR.drawScout(ctx, pa.charId, pa.x, pa.y, 34, {
          flip: pa.face < 0, phase: 0, moving: false,
          alpha: (pa.alpha != null ? pa.alpha : 0.4) * (1 - k),
        });
      } else if (pa.kind === 'wisp') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createRadialGradient(pa.x, pa.y, 0, pa.x, pa.y, pa.size * 3);
        grd.addColorStop(0, 'rgba(255,80,50,' + (0.7 * (1 - k)) + ')');
        grd.addColorStop(1, 'rgba(255,30,10,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size * 3, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    // fireflies
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.fireflies) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 2.2 + f.ph));
      ctx.fillStyle = 'rgba(190,230,120,' + a + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // damage numbers
    for (const n of this.nums) {
      const k = n.t / 0.75;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = (n.big ? 'bold 15px' : 'bold 11px') + ' Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(10,8,6,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(n.txt, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.txt, n.x, n.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // screen-space overlays
    if (this.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(180,30,20,' + (this.hurtFlash * 0.4) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.bossFlash > 0) {
      ctx.fillStyle = 'rgba(150,15,10,' + (this.bossFlash * 0.3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flashGold > 0) {
      ctx.fillStyle = 'rgba(244,197,66,' + (this.flashGold * 0.18) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.phase === 'dawn' || this.phase === 'win') {
      const k = clamp(this.phaseT / 2.4, 0, 1);
      ctx.fillStyle = 'rgba(255,244,214,' + (k * 0.85) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (this.phase === 'dying') {
      const k = clamp(this.phaseT / 1.5, 0, 1);
      ctx.fillStyle = 'rgba(10,2,2,' + (k * 0.7) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    if (typeof Reticle !== 'undefined') Reticle.render(ctx, this, W, H);
    if (typeof Transition !== 'undefined') Transition.render(ctx, W, H);
  };

  Game.prototype.renderGround = function (ctx, vw, vh) {
    const CS = 96;
    const x0 = Math.floor((this.cam.x - vw / 2) / CS) - 1;
    const x1 = Math.floor((this.cam.x + vw / 2) / CS) + 1;
    const y0 = Math.floor((this.cam.y - vh / 2) / CS) - 1;
    const y1 = Math.floor((this.cam.y + vh / 2) / CS) + 1;

    // soft mottling
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const h = hash2(cx, cy);
        if (h % 5 === 0) {
          ctx.fillStyle = 'rgba(28,40,24,0.5)';
          ctx.beginPath();
          ctx.ellipse(cx * CS + (h % 60), cy * CS + (h % 47), 50 + (h % 30), 34 + (h % 22), 0, 0, TAU);
          ctx.fill();
        }
      }
    }
    // rune circles on a coarser grid
    const RS = CS * 5;
    const rx0 = Math.floor((this.cam.x - vw / 2) / RS) - 1;
    const rx1 = Math.floor((this.cam.x + vw / 2) / RS) + 1;
    const ry0 = Math.floor((this.cam.y - vh / 2) / RS) - 1;
    const ry1 = Math.floor((this.cam.y + vh / 2) / RS) + 1;
    for (let cx = rx0; cx <= rx1; cx++) {
      for (let cy = ry0; cy <= ry1; cy++) {
        const h = hash2(cx * 7 + 3, cy * 11 + 5);
        if (h % 3 === 0) {
          SPR.draw(ctx, 'rune', cx * RS + RS / 2 + (h % 120) - 60, cy * RS + RS / 2 + ((h >> 4) % 120) - 60, 170);
        }
      }
    }
    // decorations
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const h = hash2(cx, cy);
        const m = h % 97;
        const px = cx * CS + 12 + (h % 72);
        const py = cy * CS + 12 + ((h >> 6) % 72);
        if (m < 22) SPR.draw(ctx, (h & 1) ? 'grass1' : 'grass2', px, py, 24);
        else if (m < 30) SPR.draw(ctx, 'stone', px, py, 22);
        else if (m < 34) SPR.draw(ctx, 'mush', px, py, 16);
        else if (m < 37) SPR.draw(ctx, 'bone', px, py, 22);
      }
    }
  };

  Game.prototype.renderPlayer = function (ctx) {
    const p = this.player;
    if (this.phase === 'dying' || this.phase === 'over') {
      // full death scene: body down, hat tossed, ghost rises, stars spin
      const k = clamp(this.phaseT / 2.3, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.5, p.r * 0.45, 0, 0, TAU); ctx.fill();
      SPR.drawBottom(ctx, this.char.spr, p.x, p.y + p.r, 34, {
        rot: Math.PI / 2 * Math.min(1, this.phaseT * 4),
        squash: 0.94,
      });
      if (this.deathHat) {
        SPR.draw(ctx, 'hat_' + this.charId, this.deathHat.x, this.deathHat.y, 22, { rot: this.deathHat.rot });
      }
      if (this.phaseT > 0.45) {
        const gk = clamp((this.phaseT - 0.45) / 1.85, 0, 1);
        const gx = p.x + Math.sin(this.phaseT * 3.2) * 7;
        const gy = p.y - 10 - gk * 58;
        SPR.draw(ctx, 'ghost', gx, gy, 26 + gk * 8, {
          alpha: gk < 0.75 ? 0.9 : 0.9 * (1 - (gk - 0.75) / 0.25),
          squash: 1 + Math.sin(this.phaseT * 6) * 0.06,
        });
      }
      // dizzy stars over the body
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + i * TAU / 3;
        const sx = p.x + Math.cos(a) * 14;
        const sy = p.y - 6 + Math.sin(a) * 4;
        ctx.fillStyle = 'rgba(244,197,66,' + (0.75 - k * 0.4) + ')';
        ctx.font = 'bold 9px Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('*', sx, sy);
      }
      return;
    }
    if (this.phase === 'dawn' || this.phase === 'win') {
      const hop = Math.abs(Math.sin(this.t * 7)) * 9;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.15, p.r * 0.42, 0, 0, TAU); ctx.fill();
      SPR.drawBottom(ctx, this.char.spr, p.x, p.y + p.r - hop, 34, { squash: 1.05 });
      return;
    }
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r, p.r * 1.15, p.r * 0.42, 0, 0, TAU); ctx.fill();

    const flicker = p.iframe > 0 && Math.floor(this.t * 18) % 2 === 0;
    SPR.drawScout(ctx, this.charId, p.x, p.y + p.r, 34, {
      flip: p.face < 0,
      phase: this.walkPhase || 0,
      moving: p.moving,
      squash: p.moving ? 1 : 1 + Math.sin(this.t * 2.4) * 0.015,
      alpha: flicker ? 0.35 : 1,
    });

    // held weapon aimed at cursor
    if (this.char.held) {
      const a = this.aimAngle;
      const off = 15 - this.recoil * 26;
      ctx.save();
      ctx.translate(p.x + Math.cos(a) * off, p.y - 8 + Math.sin(a) * off);
      ctx.rotate(a + (p.face < 0 ? Math.PI : 0));
      if (p.face < 0) ctx.scale(-1, 1);
      SPR.draw(ctx, this.char.held, 6, 0, 26);
      ctx.restore();
      if (this.recoil > 0.08) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const mx = p.x + Math.cos(a) * (off + 16), my = p.y - 8 + Math.sin(a) * (off + 16);
        ctx.fillStyle = 'rgba(255,220,140,' + this.recoil * 3 + ')';
        ctx.beginPath(); ctx.arc(mx, my, 5, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    this.renderBark(ctx);
  };

  Game.prototype.renderBark = function (ctx) {
    if (!this.barkNow) return;
    const p = this.player;
    const alpha = Math.min(1, this.barkNow.t / 0.4);
    const text = this.barkNow.text;
    ctx.font = 'bold 11px Verdana, sans-serif';
    // wrap into at most two lines
    let lines = [text];
    if (text.length > 26) {
      const mid = text.lastIndexOf(' ', Math.ceil(text.length / 2) + 4);
      if (mid > 0) lines = [text.slice(0, mid), text.slice(mid + 1)];
    }
    const w = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bx = p.x, by = p.y - 52 - (lines.length - 1) * 13;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(14,16,20,0.92)';
    ctx.strokeStyle = 'rgba(217,210,192,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx - w / 2 - 9, by - 14, w + 18, 14 * lines.length + 12, 7);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + 14 * lines.length - 2);
    ctx.lineTo(bx + 5, by + 14 * lines.length - 2);
    ctx.lineTo(bx, by + 14 * lines.length + 6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,16,20,0.92)'; ctx.fill();
    ctx.fillStyle = '#e8e0cc';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, bx, by + i * 14));
    ctx.globalAlpha = 1;
  };

  Game.prototype.renderEnemy = function (ctx, e) {
    if (e.dead) return;
    const yB = e.y + e.r;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.05, e.r * 0.38, 0, 0, TAU); ctx.fill();

    if (e.boss) {
      const pulse = 0.22 + Math.sin(this.t * 3.5) * 0.06;
      ctx.fillStyle = 'rgba(190,30,20,' + pulse + ')';
      ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.9, e.r * 0.72, 0, 0, TAU); ctx.fill();
    } else if (e.elite) {
      ctx.strokeStyle = 'rgba(220,60,40,' + (0.5 + Math.sin(this.t * 5) * 0.2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, yB, e.r * 1.5, e.r * 0.6, 0, 0, TAU); ctx.stroke();
    }

    // per-species gait
    let squash = 1 + Math.sin(this.t * 8 + e.bob) * 0.05;
    let hopY = 0;
    let gaitRot = Math.sin(this.t * 9 + e.bob) * 0.06 * (e.flip ? -1 : 1);
    if (e.move === 'hop' || e.move === 'bosshare') {
      if (e.ai && e.ai.state === 'hop') {
        const k = e.ai.k || 0;
        hopY = Math.sin(k * Math.PI) * (e.boss ? 30 : 16);
        squash = 1.14 - Math.sin(k * Math.PI) * 0.18;
        gaitRot = (e.flip ? 0.1 : -0.1);
      } else {
        squash = 0.95 + Math.sin(this.t * 6 + e.bob) * 0.02;
        gaitRot = 0;
      }
    } else if (e.spr === 'bat') {
      squash = 1 + Math.sin(this.t * 17 + e.bob) * 0.13;   // wingbeat
      hopY = Math.sin(this.t * 5 + e.bob) * 5 + 8;         // hover
      gaitRot = Math.sin(this.t * 3 + e.bob) * 0.08;
    } else if (e.move === 'charge' && e.ai && e.ai.state === 'charge') {
      gaitRot = (e.flip ? 0.16 : -0.16);                    // headlong lean
      squash = 0.94;
    } else if (e.move === 'charge' && e.ai && e.ai.state === 'windup') {
      gaitRot = Math.sin(this.t * 40) * 0.05;               // trembling
      squash = 1.06;
    } else if (e.stunT > 0) {
      gaitRot = Math.sin(this.t * 20) * 0.08;
      squash = 0.97;
    }
    const drawY = yB - hopY;
    const o = { flip: e.flip, squash, rot: gaitRot, alpha: e.stunT > 0 ? 0.85 : 1 };
    SPR.drawBottom(ctx, e.spr, e.x, drawY, e.w, o);
    if (e.flash > 0) {
      o.white = true;
      o.alpha = clamp(e.flash / 0.1, 0, 1) * 0.75;
      SPR.drawBottom(ctx, e.spr, e.x, drawY, e.w, o);
    }
    // burning
    if (e.burnT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const fx = e.x + Math.sin(this.t * 9 + i * 2.4 + e.bob) * e.r * 0.5;
        const fy = drawY - e.r - Math.abs(Math.sin(this.t * 7 + i)) * 6;
        ctx.fillStyle = 'rgba(255,150,50,0.55)';
        ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // possessed eye glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = 0.32 + 0.2 * Math.sin(this.t * 5 + e.bob);
    for (const [ex, ey] of SPR.eyePositions(e.spr, e.x, drawY, e.w, e.flip, squash)) {
      const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, e.boss ? 9 : 5);
      grd.addColorStop(0, 'rgba(255,60,30,' + glow + ')');
      grd.addColorStop(1, 'rgba(255,30,10,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(ex, ey, e.boss ? 9 : 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // windup warning
    if (e.ai && e.ai.state === 'windup') {
      ctx.font = 'bold 16px Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5b45';
      ctx.strokeStyle = 'rgba(10,5,5,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText('!', e.x, drawY - e.w * SPR.height(e.spr, 1) - 8);
      ctx.fillText('!', e.x, drawY - e.w * SPR.height(e.spr, 1) - 8);
    }
  };

})();
