// Merit Badge Massacre: everything that draws. These are the same methods
// that used to sit at the bottom of the Game class, moved out unchanged and
// hung on Game.prototype (game.js loads first).
'use strict';

(function () {

  // The Mark: the red every telegraph and every stamped critter shares.
  const MARK = '212,64,44';

  // A sprite name whose painter has not landed yet must not take the frame
  // down: the answer is cached per name, once.
  const sprOk = {};
  function safeSpr(name) {
    if (sprOk[name] === undefined) {
      try { SPR.get(name); sprOk[name] = name; }
      catch (err) { sprOk[name] = 'stag'; }
    }
    return sprOk[name];
  }

  // ---------------- render ----------------
  Game.prototype.render = function (ctx, W, H) {
    const p = this.player;
    this.cam.x = p.x;
    this.cam.y = p.y;
    if (this.room && this.room.bounds) {
      // clamp the camera to the room, centering any axis the room is
      // narrower than the viewport on. The clamp overscans by RD_PEEK so the
      // treeline band outside the walls stays on screen at the room's edge.
      const b = this.room.bounds;
      const zz = ZOOM * this.zoomF;
      const hw = W / (2 * zz), hh = H / (2 * zz);
      this.cam.x = (b.x1 - b.x0) + RD_PEEK * 2 < hw * 2
        ? (b.x0 + b.x1) / 2 : clamp(this.cam.x, b.x0 - RD_PEEK + hw, b.x1 + RD_PEEK - hw);
      this.cam.y = (b.y1 - b.y0) + RD_PEEK * 2 < hh * 2
        ? (b.y0 + b.y1) / 2 : clamp(this.cam.y, b.y0 - RD_PEEK + hh, b.y1 + RD_PEEK - hh);
    }

    ctx.fillStyle = this.room ? this._roomDress().voidColor : '#131a11';
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
      // tunnel mouths a mole left behind, and the plug meter over them
      if (e.ai && e.ai.tunnels) {
        for (const tn of e.ai.tunnels) this.renderTunnel(ctx, tn);
      }
    }

    // zones: the warning, the hit, and the walls of sound
    for (const z of this.zones) this.renderZone(ctx, z);

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
      SPR.drawBottom(ctx, safeSpr(c.spr), c.x, c.y, c.w * (1 + k * 0.45), {
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
    if (this.room) {
      for (const sd of this._roomDress().sdecos) zbuf.push({ y: sd.yB - 2, t: 'sdeco', o: sd });
    }
    zbuf.push({ y: p.y, t: 'player', o: p });
    zbuf.sort((a, b) => a.y - b.y);
    for (const z of zbuf) {
      if (z.t === 'enemy') this.renderEnemy(ctx, z.o);
      else if (z.t === 'prop') this.renderProp(ctx, z.o);
      else if (z.t === 'sdeco') this.renderSolidDeco(ctx, z.o);
      else if (z.t === 'door') {
        if (this.room) this.renderDoorBrush(ctx, z.o, false);
        this.renderDoor(ctx, z.o);
        if (this.room) this.renderDoorBrush(ctx, z.o, true);
      } else this.renderPlayer(ctx);
    }
    // near treeline fringe over the cast, then fog and the clearing light
    if (this.room) this.renderRoomOverlay(ctx);

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
      // a shell you can shoot out of the air wears its cracks
      if (s.hp > 0) {
        ctx.strokeStyle = 'rgba(248,216,240,' + (0.35 + 0.2 * s.hp) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,10,40,0.55)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          const a = i * TAU / 3 + this.t * 0.6;
          ctx.beginPath();
          ctx.moveTo(s.x + Math.cos(a) * s.r * 0.35, s.y + Math.sin(a) * s.r * 0.35);
          ctx.lineTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r);
          ctx.stroke();
        }
      }
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

    // fireflies in the field; ember motes, marsh lights or pale sparks when
    // the run is inside a themed room
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ffCol = this.room ? this._roomDress().dress.firefly : '190,230,120';
    for (const f of this.fireflies) {
      const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 2.2 + f.ph));
      ctx.fillStyle = 'rgba(' + ffCol + ',' + a + ')';
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

    if (this.bossCard) this.renderBossCard(ctx, W, H);

    if (typeof Reticle !== 'undefined') Reticle.render(ctx, this, W, H);
    if (typeof Transition !== 'undefined') Transition.render(ctx, W, H);
  };

  // ---------------- zones ----------------
  // A warning fills from a third of its weight to nearly solid over its warn,
  // then flashes white-hot for the beat it is actually dangerous.
  Game.prototype.renderZone = function (ctx, z) {
    if (z.type === 'ring') {
      const k = clamp(z.r / (z.maxR || 1), 0, 1);
      ctx.strokeStyle = 'rgba(' + MARK + ',' + (0.75 * (1 - k)) + ')';
      ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,190,150,' + (0.35 * (1 - k)) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(1, z.r - 6), 0, TAU); ctx.stroke();
      return;
    }

    const warn = z.warn > 0 ? z.warn : 0.001;
    const path = () => {
      ctx.beginPath();
      if (z.type === 'cone') {
        ctx.moveTo(z.x, z.y);
        ctx.arc(z.x, z.y, z.r, z.a - z.arc / 2, z.a + z.arc / 2);
        ctx.closePath();
      } else {
        ctx.arc(z.x, z.y, z.r, 0, TAU);
      }
    };

    if (!z.fired) {
      const k = clamp(z.t / warn, 0, 1);
      const a = 0.30 + 0.60 * k;
      const pulse = 0.82 + Math.sin(this.t * 13) * 0.18;
      ctx.fillStyle = 'rgba(' + MARK + ',' + (a * 0.26) + ')';
      path(); ctx.fill();
      ctx.strokeStyle = 'rgba(' + MARK + ',' + (a * pulse) + ')';
      ctx.lineWidth = 2 + k * 2;
      path(); ctx.stroke();
      // the sweep hand: how much of the warning is spent
      if (z.type !== 'cone') {
        ctx.strokeStyle = 'rgba(255,180,150,' + (a * 0.7) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.86, -Math.PI / 2, -Math.PI / 2 + k * TAU);
        ctx.stroke();
      }
      // a contested sign fills gold as the player stands on it
      if (z.contest > 0 && z.snuff > 0) {
        const s = clamp(z.snuff / z.contest, 0, 1);
        ctx.strokeStyle = 'rgba(244,197,66,0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r * 0.6, -Math.PI / 2, -Math.PI / 2 + s * TAU);
        ctx.stroke();
      }
      return;
    }

    const k = clamp((z.t - warn) / (z.fire > 0 ? z.fire : 0.25), 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,180,120,' + (0.55 * (1 - k)) + ')';
    path(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,240,220,' + (0.85 * (1 - k)) + ')';
    ctx.lineWidth = 3 * (1 - k) + 1;
    path(); ctx.stroke();
  };

  // A hole in the ground that keeps handing critters up, and the meter that
  // fills while the player stands on it to fill it in.
  Game.prototype.renderTunnel = function (ctx, tn) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(tn.x, tn.y, 26, 15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(74,52,34,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(tn.x, tn.y, 26, 15, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(' + MARK + ',' + (0.16 + Math.sin(this.t * 4 + tn.x) * 0.06) + ')';
    ctx.beginPath(); ctx.ellipse(tn.x, tn.y, 18, 10, 0, 0, TAU); ctx.fill();
    if (tn.plugT > 0) {
      const k = clamp(tn.plugT / 1.2, 0, 1);
      ctx.strokeStyle = '#f4c542';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(tn.x, tn.y, 30, 18, 0, -Math.PI / 2, -Math.PI / 2 + k * TAU);
      ctx.stroke();
    }
  };

  // Something moving under the dirt: a low mound with the soil pushed aside.
  Game.prototype.renderMound = function (ctx, e) {
    const r = (e._rBak != null ? e._rBak : e.r) || 14;
    const yB = e.y + r * 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(e.x, yB + 3, r * 1.5, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2b1c';
    ctx.beginPath(); ctx.ellipse(e.x, yB, r * 1.35, r * 0.62, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4d3a25';
    ctx.beginPath(); ctx.ellipse(e.x, yB - r * 0.16, r * 0.95, r * 0.4, 0, 0, TAU); ctx.fill();
    // clods thrown out to the sides, riding the shove
    ctx.fillStyle = 'rgba(58,43,28,0.9)';
    for (let i = 0; i < 4; i++) {
      const a = this.t * 3 + i * 1.7 + e.bob;
      const cx = e.x + Math.cos(a) * r * 1.5;
      const cy = yB + Math.sin(a * 0.7) * r * 0.35;
      ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, TAU); ctx.fill();
    }
  };

  // The boss card: name, epithet, and the line it says, sliding in from the
  // bottom left and gone before the fight has properly started.
  Game.prototype.renderBossCard = function (ctx, W, H) {
    const c = this.bossCard;
    const slide = clamp(c.t / 0.4, 0, 1);
    const ease = 1 - Math.pow(1 - slide, 3);
    const fade = c.t > 4 ? clamp(1 - (c.t - 4) / 0.4, 0, 1) : 1;
    const x = 26;
    const y = H - 74 + (1 - ease) * 28;
    ctx.save();
    ctx.globalAlpha = fade * ease;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const spaced = (text, px, py, spacing) => {
      let cx = px;
      for (const ch of text) {
        ctx.fillText(ch, cx, py);
        cx += ctx.measureText(ch).width + spacing;
      }
    };

    ctx.font = 'bold 22px Verdana, sans-serif';
    ctx.fillStyle = 'rgba(8,6,6,0.9)';
    spaced(c.name, x + 2, y + 2, 3);
    ctx.fillStyle = '#e8e0cc';
    spaced(c.name, x, y, 3);

    if (c.epithet) {
      ctx.font = 'italic 12px Verdana, sans-serif';
      ctx.fillStyle = '#8d947f';
      ctx.fillText(c.epithet, x + 1, y + 18);
    }
    if (c.line) {
      ctx.font = '12px Verdana, sans-serif';
      ctx.fillStyle = 'rgba(' + MARK + ',0.95)';
      spaced(c.line.toLowerCase(), x + 1, y + 38, 1.6);
    }
    ctx.restore();
  };

  Game.prototype.renderGround = function (ctx, vw, vh) {
    if (this.room && this.room.bounds) { this.renderRoomGround(ctx); return; }
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
    // Drawn at the sprite's authored width: at zoom 1.5 that puts the scout
    // at one ninth of a 768 tall frame, the reference game bar.
    SPR.drawScout(ctx, this.charId, p.x, p.y + p.r, 44, {
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
    // Subtitles off: the bubble is the subtitle, so it does not draw. The bark
    // itself still runs its clock and its voice line still plays.
    if (typeof subtitlesOn === 'function' && !subtitlesOn()) return;
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
    // underground: no body to draw, only the dirt it is shoving. Something
    // that went up instead of down draws nothing at all: it is not here.
    if (e.hidden) {
      if (!e.airborne) this.renderMound(ctx, e);
      return;
    }
    const spr = safeSpr(e.spr);
    const behind = e.move === 'bossbehind';
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
    // THE BEHIND is never a body, only a shape where a body would be
    if (behind) { o.tint = '#131013'; o.alpha = 0.85; }
    SPR.drawBottom(ctx, spr, e.x, drawY, e.w, o);
    if (e.flash > 0) {
      const f = { flip: e.flip, squash, rot: gaitRot, white: true, alpha: clamp(e.flash / 0.1, 0, 1) * 0.75 };
      SPR.drawBottom(ctx, spr, e.x, drawY, e.w, f);
    }
    // an untouchable boss strobes white through the roar
    if (e.phaseGuard > 0 && Math.floor(this.t * 8) % 2 === 0) {
      SPR.drawBottom(ctx, spr, e.x, drawY, e.w, {
        flip: e.flip, squash, rot: gaitRot, white: true, alpha: 0.8,
      });
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
    // possessed eye glow, or the two pale glints that are all THE BEHIND
    // ever shows of itself
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = 0.32 + 0.2 * Math.sin(this.t * 5 + e.bob);
    for (const [ex, ey] of SPR.eyePositions(spr, e.x, drawY, e.w, e.flip, squash)) {
      if (behind) {
        ctx.fillStyle = 'rgba(226,232,220,' + (0.55 + 0.3 * Math.sin(this.t * 2.2 + e.bob)) + ')';
        ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, TAU); ctx.fill();
        continue;
      }
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
      ctx.strokeText('!', e.x, drawY - e.w * SPR.height(spr, 1) - 8);
      ctx.fillText('!', e.x, drawY - e.w * SPR.height(spr, 1) - 8);
    }
  };

  // =========================================================================
  // World dressing: every room is a clearing carved out of deep forest.
  // Everything heavy bakes once per room entry into offscreen canvases
  // (themed ground, far treeline, near trunk fringe); per frame a room costs
  // a few drawImage calls plus two gradient fills. The open field (g.room
  // null) never reaches any of this and renders exactly as before.
  // =========================================================================
  const RD_S = 1.5;        // bake scale: canvas pixels per world unit
  const RD_PAD = 170;      // how far past the walls the treeline canvases reach
  const RD_BLEED = 26;     // ground canvas bleed past the walls
  const RD_PEEK = 108;     // camera overscan into the treeline band

  const RD = {
    room: null, theme: null, dress: null, act: 1, corrupt: 0,
    voidColor: '#131a11',
    ground: null, far: null, near: null,
    sdecos: [], paths: [], water: null, pools: [],
  };

  function rdSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rdRng(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rdCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * RD_S));
    c.height = Math.max(1, Math.ceil(h * RD_S));
    return c;
  }
  function rdCtx(c, ox, oy) {
    const q = c.getContext('2d');
    q.setTransform(RD_S, 0, 0, RD_S, -ox * RD_S, -oy * RD_S);
    q.lineJoin = 'round';
    q.lineCap = 'round';
    return q;
  }
  // A point depth units OUTSIDE the wall (negative depth reaches inside).
  function rdOutPoint(b, side, along, depth) {
    if (side === 'n') return { x: b.x0 + along, y: b.y0 - depth };
    if (side === 's') return { x: b.x0 + along, y: b.y1 + depth };
    if (side === 'e') return { x: b.x1 + depth, y: b.y0 + along };
    return { x: b.x0 - depth, y: b.y0 + along };
  }

  function rdCorruption(room) {
    const def = room.def || {};
    if (def.corruption != null) return def.corruption | 0;
    if (def.type === 'boss') return 1;
    if (room.roomIdx != null && typeof ACT_TEMPLATES !== 'undefined') {
      let total = 6;
      for (const t of ACT_TEMPLATES) if (t && t.act === room.act) total = t.rooms;
      if (room.roomIdx >= total - 2) return 1;
    }
    return 0;
  }

  // Doors plus the entry: everywhere the treeline parts.
  function rdBuildGaps(room) {
    const b = room.bounds, gaps = [];
    for (const d of room.doors || []) {
      gaps.push({ side: d.side, along: (d.side === 'n' || d.side === 's') ? d.x - b.x0 : d.y - b.y0 });
    }
    const es = room.entrySide || 'w';
    const ep = room.entryPoint || { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    gaps.push({ side: es, along: (es === 'n' || es === 's') ? ep.x - b.x0 : ep.y - b.y0, entry: true });
    return gaps;
  }
  function rdNearGap(gaps, side, along, r) {
    for (const gp of gaps) {
      if (gp.side === side && Math.abs(gp.along - along) < r) return true;
    }
    return false;
  }

  // ------------------------------------------------------------- paths -----
  function rdPathEntry(x0, y0, x1, y1, w, road, cx, cy, rng) {
    // control point pulled toward the room center so paths bow through the
    // clearing instead of ruling straight lines across it
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const k = road ? 0.04 : 0.16 + rng() * 0.1;
    const qx = mx + (cx - mx) * k, qy = my + (cy - my) * k;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, u = 1 - t;
      pts.push([u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1]);
    }
    return { x0, y0, qx, qy, x1, y1, w, road, pts };
  }
  function rdBuildPaths(room, rng) {
    const paths = [];
    const b = room.bounds;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const def = room.def || {};
    const ep = room.entryPoint || { x: cx, y: cy };
    for (const en of (def.dressing || [])) {
      if (en.kind !== 'path' && en.kind !== 'road') continue;
      const a = room.toWorld(en.from.x, en.from.y);
      const c = room.toWorld(en.to.x, en.to.y);
      paths.push(rdPathEntry(a.x, a.y, c.x, c.y, en.w || (en.kind === 'road' ? 64 : 44), en.kind === 'road', cx, cy, rng));
    }
    // worn dirt from the entry toward each door: the strongest designed cue
    if (RD.act !== 4) {
      for (const d of room.doors || []) {
        paths.push(rdPathEntry(ep.x, ep.y, d.x, d.y, 28 + rng() * 8, false, cx, cy, rng));
      }
    }
    return paths;
  }
  function rdNearPath(paths, x, y, r) {
    for (const pa of paths) {
      const rr = pa.w * 0.5 + r;
      for (const pt of pa.pts) {
        const dx = pt[0] - x, dy = pt[1] - y;
        if (dx * dx + dy * dy < rr * rr) return true;
      }
    }
    return false;
  }
  function rdPaintPath(q, pa, pal) {
    const curve = () => {
      q.beginPath();
      q.moveTo(pa.x0, pa.y0);
      q.quadraticCurveTo(pa.qx, pa.qy, pa.x1, pa.y1);
    };
    const soft = pa.road ? 1 : 0.62;
    q.strokeStyle = pal.edge; q.lineWidth = pa.w * 1.18; q.globalAlpha = 0.3 * soft; curve(); q.stroke();
    q.strokeStyle = pal.base; q.lineWidth = pa.w; q.globalAlpha = 0.55 * soft; curve(); q.stroke();
    q.strokeStyle = pal.mid; q.lineWidth = pa.w * 0.48; q.globalAlpha = 0.5 * soft; curve(); q.stroke();
    q.globalAlpha = 1;
  }
  function rdPathSpecks(q, pa, pal, rng) {
    q.fillStyle = pal.speck;
    for (const pt of pa.pts) {
      if (rng() < 0.68) continue;
      const a = rng() * TAU, d = pa.w * (0.28 + rng() * 0.32);
      q.globalAlpha = 0.22 + rng() * 0.2;
      q.beginPath();
      q.arc(pt[0] + Math.cos(a) * d, pt[1] + Math.sin(a) * d, 1 + rng() * 1.6, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;
  }
  function rdRoadRuts(q, pa, pal) {
    for (const s of [-1, 1]) {
      q.strokeStyle = pal.edge; q.lineWidth = 4.5; q.globalAlpha = 0.6;
      q.beginPath();
      for (let i = 0; i < pa.pts.length; i++) {
        const p0 = pa.pts[Math.max(0, i - 1)], p1 = pa.pts[Math.min(pa.pts.length - 1, i + 1)];
        let nx = -(p1[1] - p0[1]), ny = p1[0] - p0[0];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const x = pa.pts[i][0] + nx * s * pa.w * 0.22;
        const y = pa.pts[i][1] + ny * s * pa.w * 0.22;
        if (i === 0) q.moveTo(x, y); else q.lineTo(x, y);
      }
      q.stroke();
    }
    q.globalAlpha = 1;
  }

  // ------------------------------------------------------------- water -----
  function rdBuildWater(room, rng, gaps) {
    const b = room.bounds;
    const prof = {};
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
      const n = Math.max(4, Math.round(len / 130));
      const arr = [];
      for (let i = 0; i <= n; i++) {
        const along = (i / n) * len;
        let d = rng() * 96 - 38;             // often zero: broken margins
        if (d < 0) d = 0;
        if (rdNearGap(gaps, side, along, 130)) d = 0;
        arr.push(d);
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < arr.length - 1; i++) arr[i] = (arr[i - 1] + arr[i] * 2 + arr[i + 1]) / 4;
      }
      arr[0] = 0; arr[arr.length - 1] = 0;
      prof[side] = { len, arr };
    }
    return prof;
  }
  function rdWaterDepthAt(prof, side, along) {
    const p = prof[side];
    if (!p) return 0;
    const t = clamp(along / p.len, 0, 1) * (p.arr.length - 1);
    const i = Math.floor(t), f = t - i;
    const a = p.arr[i], b2 = p.arr[Math.min(p.arr.length - 1, i + 1)];
    return a + (b2 - a) * f;
  }
  function rdPaintWaterMargins(q, room, prof, dr, rng) {
    const b = room.bounds;
    for (const side of ['n', 'e', 's', 'w']) {
      const p = prof[side];
      if (!p) continue;
      let wet = false;
      for (const d of p.arr) if (d > 6) wet = true;
      if (!wet) continue;
      const steps = 40;
      const poly = (scale) => {
        q.beginPath();
        const s0 = rdOutPoint(b, side, 0, 0);
        q.moveTo(s0.x, s0.y);
        const sEnd = rdOutPoint(b, side, p.len, 0);
        q.lineTo(sEnd.x, sEnd.y);
        for (let i = steps; i >= 0; i--) {
          const along = (i / steps) * p.len;
          const pt = rdOutPoint(b, side, along, -rdWaterDepthAt(prof, side, along) * scale);
          q.lineTo(pt.x, pt.y);
        }
        q.closePath();
      };
      poly(1); q.fillStyle = dr.water.fill; q.globalAlpha = 0.95; q.fill();
      poly(0.55); q.fillStyle = dr.water.deep; q.globalAlpha = 0.9; q.fill();
      q.globalAlpha = 1;
      // the bank line, broken where the margin dries up
      q.strokeStyle = dr.water.edge; q.lineWidth = 3;
      q.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const along = (i / steps) * p.len;
        const d = rdWaterDepthAt(prof, side, along);
        const pt = rdOutPoint(b, side, along, -d);
        if (d > 3) {
          if (!started) { q.moveTo(pt.x, pt.y); started = true; }
          else q.lineTo(pt.x, pt.y);
        } else started = false;
      }
      q.stroke();
      // glints riding the surface
      q.strokeStyle = dr.water.glint; q.lineWidth = 1.6;
      for (let i = 2; i < steps; i += 3) {
        if (rng() < 0.5) continue;
        const along = (i / steps) * p.len;
        const d = rdWaterDepthAt(prof, side, along);
        if (d < 12) continue;
        const pt = rdOutPoint(b, side, along, -d * (0.4 + rng() * 0.4));
        q.beginPath();
        if (side === 'e' || side === 'w') { q.moveTo(pt.x, pt.y - 5); q.lineTo(pt.x, pt.y + 5); }
        else { q.moveTo(pt.x - 6, pt.y); q.lineTo(pt.x + 6, pt.y); }
        q.stroke();
      }
      // reed clumps on the bank
      for (let i = 1; i < steps; i += 2) {
        const along = (i / steps) * p.len;
        const d = rdWaterDepthAt(prof, side, along);
        if (d < 16 || rng() < 0.55) continue;
        const pt = rdOutPoint(b, side, along, -(d + 4 + rng() * 8));
        SPR.drawBottom(q, 'reed', pt.x, pt.y + 10, 20 + rng() * 8);
      }
    }
  }
  function rdPaintPool(q, x, y, rx, ry, dr, rng, reeds) {
    // muddy bank apron first
    q.fillStyle = dr.path.base; q.globalAlpha = 0.4;
    q.beginPath(); q.ellipse(x, y + 3, rx * 1.18, ry * 1.3, 0, 0, TAU); q.fill();
    q.globalAlpha = 1;
    q.fillStyle = dr.water.fill;
    q.beginPath(); q.ellipse(x, y, rx, ry, 0, 0, TAU); q.fill();
    q.fillStyle = dr.water.deep;
    q.beginPath(); q.ellipse(x, y + ry * 0.12, rx * 0.66, ry * 0.6, 0, 0, TAU); q.fill();
    q.strokeStyle = dr.water.edge; q.lineWidth = 3;
    q.beginPath(); q.ellipse(x, y, rx, ry, 0, 0, TAU); q.stroke();
    q.strokeStyle = dr.water.glint; q.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const a = rng() * TAU;
      const gx = x + Math.cos(a) * rx * 0.5, gy = y + Math.sin(a) * ry * 0.5;
      q.beginPath(); q.moveTo(gx - 7, gy); q.lineTo(gx + 7, gy); q.stroke();
    }
    if (reeds) {
      const n = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU;
        const bx = x + Math.cos(a) * rx * (1 + rng() * 0.16);
        const by = y + Math.sin(a) * ry * (1 + rng() * 0.2);
        SPR.drawBottom(q, 'reed', bx, by + 8, 20 + rng() * 8);
      }
    }
  }
  function rdInWater(x, y, b) {
    if (RD.water) {
      if (y - b.y0 < rdWaterDepthAt(RD.water, 'n', x - b.x0) + 8) return true;
      if (b.y1 - y < rdWaterDepthAt(RD.water, 's', x - b.x0) + 8) return true;
      if (b.x1 - x < rdWaterDepthAt(RD.water, 'e', y - b.y0) + 8) return true;
      if (x - b.x0 < rdWaterDepthAt(RD.water, 'w', y - b.y0) + 8) return true;
    }
    for (const pl of RD.pools) {
      const dx = (x - pl.x) / (pl.rx + 10), dy = (y - pl.y) / (pl.ry + 10);
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  }

  // --------------------------------------------- dressing vocabulary -------
  function rdPaintPatch(q, x, y, r, role, dr, rng) {
    const fills = {
      dirt: [dr.path.base, 0.4],
      needle: [(dr.needles && dr.needles[1]) || '#3e2f14', 0.5],
      moss: ['#26381a', 0.4],
      mud: [dr.path.mid, 0.5],
      ash: ['#39312a', 0.45],
      char: [dr.charFill, 0.75],
      scree: ['#343a42', 0.4],
    };
    const f = fills[role] || fills.dirt;
    q.fillStyle = f[0];
    for (let i = 0; i < 5; i++) {
      const a = rng() * TAU, d = rng() * r * 0.45;
      q.globalAlpha = f[1] * (0.7 + rng() * 0.5);
      q.beginPath();
      q.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d,
        r * (0.5 + rng() * 0.4), r * (0.34 + rng() * 0.3), rng() * TAU, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;
    if (role === 'char') {
      for (let i = 0; i < 6; i++) {
        const a = rng() * TAU, d = rng() * r * 0.7;
        const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d;
        q.fillStyle = 'rgba(' + dr.ember + ',0.10)';
        q.beginPath(); q.arc(ex, ey, 5 + rng() * 4, 0, TAU); q.fill();
        q.fillStyle = 'rgba(' + dr.ember + ',0.55)';
        q.beginPath(); q.arc(ex, ey, 1 + rng(), 0, TAU); q.fill();
      }
    } else if (role === 'scree') {
      q.fillStyle = '#494f58';
      for (let i = 0; i < 8; i++) {
        const a = rng() * TAU, d = rng() * r * 0.8;
        q.globalAlpha = 0.5 + rng() * 0.3;
        q.beginPath(); q.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.6 + rng() * 2.4, 0, TAU); q.fill();
      }
      q.globalAlpha = 1;
    } else if (role === 'moss') {
      q.fillStyle = '#41552a';
      for (let i = 0; i < 6; i++) {
        const a = rng() * TAU, d = rng() * r * 0.6;
        q.globalAlpha = 0.4 + rng() * 0.3;
        q.beginPath(); q.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.4 + rng() * 1.6, 0, TAU); q.fill();
      }
      q.globalAlpha = 1;
    } else if (role === 'mud') {
      q.strokeStyle = 'rgba(200,230,235,0.10)'; q.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const a = rng() * TAU, d = rng() * r * 0.5;
        const gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d;
        q.beginPath(); q.moveTo(gx - 5, gy); q.lineTo(gx + 5, gy); q.stroke();
      }
    }
  }
  function rdPaintRing(q, x, y, r, w, dr, rng, corrupt) {
    w = w || 30;
    q.strokeStyle = dr.path.base; q.lineWidth = w; q.globalAlpha = 0.6;
    q.beginPath(); q.arc(x, y, r, 0, TAU); q.stroke();
    q.strokeStyle = dr.path.mid; q.lineWidth = w * 0.45; q.globalAlpha = 0.7;
    q.beginPath(); q.arc(x, y, r, 0, TAU); q.stroke();
    q.globalAlpha = 1;
    // wear scuffs around the circuit
    q.strokeStyle = dr.path.edge; q.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + rng() * 0.2;
      const rr = r + (rng() - 0.5) * w * 0.7;
      q.beginPath(); q.arc(x, y, rr, a, a + 0.12 + rng() * 0.1); q.stroke();
    }
    // faint scratched signs: the cult walked this circle first
    q.strokeStyle = 'rgba(' + MARK + ',' + (corrupt ? 0.28 : 0.14) + ')';
    q.lineWidth = 1.6;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r;
      q.beginPath();
      q.moveTo(gx - 4, gy - 5); q.lineTo(gx + 3, gy + 4);
      q.moveTo(gx + 4, gy - 4); q.lineTo(gx - 2, gy + 5);
      q.stroke();
    }
  }
  function rdPaintBowl(q, x, y, r0, r1, dr) {
    const gr = q.createRadialGradient(x, y, Math.max(1, r0), x, y, Math.max(r0 + 1, r1));
    gr.addColorStop(0, 'rgba(' + dr.lightDark + ',0)');
    gr.addColorStop(1, 'rgba(' + dr.lightDark + ',0.4)');
    q.fillStyle = gr;
    q.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
    q.strokeStyle = 'rgba(' + dr.lightDark + ',0.18)'; q.lineWidth = 2;
    for (let i = 1; i <= 2; i++) {
      q.beginPath(); q.arc(x, y, r0 + (r1 - r0) * i / 3, 0, TAU); q.stroke();
    }
  }
  function rdPaintCrack(q, x, y, r, rng) {
    q.strokeStyle = 'rgba(8,10,12,0.45)'; q.lineWidth = 1.4;
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      let px = x, py = y, ca = rng() * TAU;
      q.beginPath(); q.moveTo(px, py);
      const segs = 2 + Math.floor(rng() * 2);
      for (let s = 0; s < segs; s++) {
        ca += (rng() - 0.5) * 1.1;
        px += Math.cos(ca) * r * (0.2 + rng() * 0.25);
        py += Math.sin(ca) * r * (0.2 + rng() * 0.25);
        q.lineTo(px, py);
      }
      q.stroke();
    }
  }
  function rdPaintScree(q, en, room, dr, rng) {
    const a = room.toWorld(en.x0, en.y0), c = room.toWorld(en.x1, en.y1);
    const w = en.w || 110;
    const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    const ux = (c.x - a.x) / len, uy = (c.y - a.y) / len;
    const nx = -uy, ny = ux;
    q.strokeStyle = '#31363e'; q.lineWidth = w; q.globalAlpha = 0.28;
    q.beginPath(); q.moveTo(a.x, a.y); q.lineTo(c.x, c.y); q.stroke();
    q.globalAlpha = 1;
    for (let d = 30; d < len - 20; d += 46 + rng() * 40) {
      const px = a.x + ux * d + nx * (rng() - 0.5) * w * 0.6;
      const py = a.y + uy * d + ny * (rng() - 0.5) * w * 0.6;
      rdPaintCrack(q, px, py, 16 + rng() * 22, rng);
    }
    for (let d = 10; d < len; d += 16 + rng() * 18) {
      const off = (rng() - 0.5) * w * 0.9;
      const px = a.x + ux * d + nx * off, py = a.y + uy * d + ny * off;
      if (rng() < 0.12) SPR.drawBottom(q, 'stone', px, py + 4, 16 + rng() * 8);
      else {
        q.fillStyle = rng() < 0.5 ? '#454b52' : '#383e46';
        q.globalAlpha = 0.55 + rng() * 0.3;
        q.beginPath(); q.arc(px, py, 1.6 + rng() * 2.6, 0, TAU); q.fill();
      }
    }
    q.globalAlpha = 1;
  }
  function rdPaintBurnband(q, en, room, dr, rng) {
    const a = room.toWorld(en.x0, en.y0), c = room.toWorld(en.x1, en.y1);
    const w = en.w || 110;
    const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    const ux = (c.x - a.x) / len, uy = (c.y - a.y) / len;
    const nx = -uy, ny = ux;
    q.fillStyle = dr.charFill;
    for (let d = 0; d <= len; d += 26) {
      const off = (rng() - 0.5) * w * 0.3;
      q.globalAlpha = 0.5 + rng() * 0.3;
      q.beginPath();
      q.ellipse(a.x + ux * d + nx * off, a.y + uy * d + ny * off,
        w * (0.3 + rng() * 0.24), w * (0.2 + rng() * 0.16), Math.atan2(uy, ux), 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;
    for (let d = 12; d < len; d += 30 + rng() * 30) {
      const off = (rng() - 0.5) * w * 0.5;
      const ex = a.x + ux * d + nx * off, ey = a.y + uy * d + ny * off;
      q.fillStyle = 'rgba(' + dr.ember + ',0.10)';
      q.beginPath(); q.arc(ex, ey, 6 + rng() * 5, 0, TAU); q.fill();
      q.fillStyle = 'rgba(' + dr.ember + ',0.6)';
      q.beginPath(); q.arc(ex, ey, 1 + rng() * 1.2, 0, TAU); q.fill();
    }
  }

  // ------------------------------------------------------ ground bake ------
  function rdEdgeSpot(b, rng, inMin, inMax) {
    const side = ['n', 'e', 's', 'w'][Math.min(3, (rng() * 4) | 0)];
    const d = inMin + rng() * (inMax - inMin);
    const w = b.x1 - b.x0, h = b.y1 - b.y0;
    if (side === 'n') return { x: b.x0 + rng() * w, y: b.y0 + d };
    if (side === 's') return { x: b.x0 + rng() * w, y: b.y1 - d };
    if (side === 'e') return { x: b.x1 - d, y: b.y0 + rng() * h };
    return { x: b.x0 + d, y: b.y0 + rng() * h };
  }
  function rdRootScars(q, b, color, rng, count) {
    q.strokeStyle = color;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    for (let i = 0; i < count; i++) {
      const spot = rdEdgeSpot(b, rng, -6, 10);
      let dx = cx - spot.x, dy = cy - spot.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const len = 40 + rng() * 70;
      const mx = spot.x + dx * len * 0.5 + (rng() - 0.5) * 30;
      const my = spot.y + dy * len * 0.5 + (rng() - 0.5) * 30;
      q.lineWidth = 3 + rng() * 2.5;
      q.beginPath();
      q.moveTo(spot.x, spot.y);
      q.quadraticCurveTo(mx, my, spot.x + dx * len, spot.y + dy * len);
      q.stroke();
      q.lineWidth = 1.4;
      q.beginPath();
      q.moveTo(spot.x + 4, spot.y + 3);
      q.quadraticCurveTo(mx + 6, my + 4, spot.x + dx * len * 0.7 + 5, spot.y + dy * len * 0.7 + 4);
      q.stroke();
    }
  }
  function rdGroundUnderstory(q, b, dr, rng) {
    const area = (b.x1 - b.x0) * (b.y1 - b.y0);
    const n = Math.round(area / 5200);
    for (let i = 0; i < n; i++) {
      const x = b.x0 + rng() * (b.x1 - b.x0), y = b.y0 + rng() * (b.y1 - b.y0);
      const a = rng() * TAU, l = 4 + rng() * 6;
      q.strokeStyle = dr.needles[(rng() * dr.needles.length) | 0];
      q.globalAlpha = 0.35 + rng() * 0.3;
      q.lineWidth = 1 + rng();
      q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke();
    }
    q.globalAlpha = 1;
    rdRootScars(q, b, 'rgba(22,14,7,0.5)', rng, 12);
  }
  function rdGroundSog(q, room, b, dr, rng, gaps) {
    const area = (b.x1 - b.x0) * (b.y1 - b.y0);
    const n = Math.round(area / 30000);
    q.fillStyle = '#16333a';
    for (let i = 0; i < n; i++) {
      q.globalAlpha = 0.10 + rng() * 0.12;
      q.beginPath();
      q.ellipse(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0),
        20 + rng() * 46, 8 + rng() * 18, 0, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;
    RD.water = rdBuildWater(room, rng, gaps);
    rdPaintWaterMargins(q, room, RD.water, dr, rng);
  }
  function rdGroundBurn(q, b, dr, rng) {
    const area = (b.x1 - b.x0) * (b.y1 - b.y0);
    let n = Math.round(area / 34000);
    q.fillStyle = '#3a322b';
    for (let i = 0; i < n; i++) {
      q.globalAlpha = 0.14 + rng() * 0.14;
      q.beginPath();
      q.ellipse(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0),
        24 + rng() * 50, 14 + rng() * 26, rng() * TAU, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;
    n = Math.round(area / 60000);
    for (let i = 0; i < n; i++) {
      const x = b.x0 + 60 + rng() * (b.x1 - b.x0 - 120);
      const y = b.y0 + 60 + rng() * (b.y1 - b.y0 - 120);
      rdPaintPatch(q, x, y, 26 + rng() * 30, 'char', dr, rng);
    }
    rdRootScars(q, b, 'rgba(10,6,4,0.6)', rng, 14);
  }
  function rdGroundHollow(q, b, rng) {
    // packed bare dirt: concentric wear around the center, nothing else
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    q.strokeStyle = 'rgba(20,22,34,0.5)';
    for (let i = 1; i <= 6; i++) {
      q.globalAlpha = 0.12 + rng() * 0.08;
      q.lineWidth = 8 + rng() * 14;
      q.beginPath(); q.arc(cx, cy, 70 + i * 74 + rng() * 20, 0, TAU); q.stroke();
    }
    q.globalAlpha = 1;
  }
  function rdGroundScatter(q, room, b, th, rng) {
    const deco = th.deco || [];
    if (!deco.length) return;
    let total = 0;
    for (const d of deco) total += d.w;
    const area = (b.x1 - b.x0) * (b.y1 - b.y0);
    const n = Math.round(area / 15000);
    const ep = room.entryPoint || { x: 0, y: 0 };
    for (let i = 0; i < n; i++) {
      const x = b.x0 + 46 + rng() * (b.x1 - b.x0 - 92);
      const y = b.y0 + 46 + rng() * (b.y1 - b.y0 - 92);
      if (rdNearPath(RD.paths, x, y, 6)) continue;
      if (rdInWater(x, y, b)) continue;
      const dx = x - ep.x, dy = y - ep.y;
      if (dx * dx + dy * dy < 70 * 70) continue;
      let roll = rng() * total, id = deco[0].id;
      for (const d of deco) { roll -= d.w; if (roll <= 0) { id = d.id; break; } }
      const w2 = id === 'mush' ? 13 + rng() * 5 : (id === 'bone' ? 16 + rng() * 6 : 18 + rng() * 8);
      q.globalAlpha = 0.85 + rng() * 0.15;
      SPR.drawBottom(q, id, x, y, w2);
    }
    q.globalAlpha = 1;
  }
  function rdEdgeDarkening(q, b, dr) {
    const D = 116;
    const col = 'rgba(' + dr.lightDark + ',';
    const a = dr.edgeDark != null ? dr.edgeDark : 0.28;
    const w = (b.x1 - b.x0) + RD_BLEED * 2, h = (b.y1 - b.y0) + RD_BLEED * 2;
    let gr = q.createLinearGradient(0, b.y0, 0, b.y0 + D);
    gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)');
    q.fillStyle = gr; q.fillRect(b.x0 - RD_BLEED, b.y0, w, D);
    gr = q.createLinearGradient(0, b.y1, 0, b.y1 - D);
    gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)');
    q.fillStyle = gr; q.fillRect(b.x0 - RD_BLEED, b.y1 - D, w, D);
    gr = q.createLinearGradient(b.x0, 0, b.x0 + D, 0);
    gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)');
    q.fillStyle = gr; q.fillRect(b.x0, b.y0 - RD_BLEED, D, h);
    gr = q.createLinearGradient(b.x1, 0, b.x1 - D, 0);
    gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)');
    q.fillStyle = gr; q.fillRect(b.x1 - D, b.y0 - RD_BLEED, D, h);
    // the bleed apron past the wall goes darker still
    q.fillStyle = col + (a * 0.9) + ')';
    q.fillRect(b.x0 - RD_BLEED, b.y0 - RD_BLEED, w, RD_BLEED);
    q.fillRect(b.x0 - RD_BLEED, b.y1, w, RD_BLEED);
    q.fillRect(b.x0 - RD_BLEED, b.y0 - RD_BLEED, RD_BLEED, h);
    q.fillRect(b.x1, b.y0 - RD_BLEED, RD_BLEED, h);
  }
  function rdBakeGround(g, rng, gaps) {
    const room = g.room, b = room.bounds, th = RD.theme, dr = RD.dress;
    const gx = b.x0 - RD_BLEED, gy = b.y0 - RD_BLEED;
    const gw = (b.x1 - b.x0) + RD_BLEED * 2, gh = (b.y1 - b.y0) + RD_BLEED * 2;
    const c = rdCanvas(gw, gh);
    const q = rdCtx(c, gx, gy);
    q.fillStyle = th.ground;
    q.fillRect(gx, gy, gw, gh);

    // soft mottling
    const nm = Math.round(gw * gh / 24000);
    q.fillStyle = th.mottle;
    for (let i = 0; i < nm; i++) {
      q.globalAlpha = 0.13 + rng() * 0.17;
      q.beginPath();
      q.ellipse(gx + rng() * gw, gy + rng() * gh, 24 + rng() * 50, 16 + rng() * 34, rng() * TAU, 0, TAU);
      q.fill();
    }
    q.globalAlpha = 1;

    if (RD.act === 1) rdGroundUnderstory(q, b, dr, rng);
    else if (RD.act === 2) rdGroundSog(q, room, b, dr, rng, gaps);
    else if (RD.act === 3) rdGroundBurn(q, b, dr, rng);
    else rdGroundHollow(q, b, rng);

    // authored identity dressing under the trampling
    const dress = (room.def && room.def.dressing) || [];
    for (const en of dress) {
      if (en.kind === 'patch') {
        const p2 = room.toWorld(en.x, en.y);
        rdPaintPatch(q, p2.x, p2.y, en.r || 60, en.role, dr, rng);
      } else if (en.kind === 'bowl') {
        const p2 = room.toWorld(en.x, en.y);
        rdPaintBowl(q, p2.x, p2.y, en.r0 || 100, en.r1 || 300, dr);
      } else if (en.kind === 'scree') rdPaintScree(q, en, room, dr, rng);
      else if (en.kind === 'burnband') rdPaintBurnband(q, en, room, dr, rng);
      else if (en.kind === 'cracks') {
        const p2 = room.toWorld(en.x, en.y);
        rdPaintCrack(q, p2.x, p2.y, en.r || 40, rng);
      }
    }

    // trampled ground: entry to doors, plus authored paths and roads
    for (const pa of RD.paths) {
      rdPaintPath(q, pa, dr.path);
      if (pa.road) rdRoadRuts(q, pa, dr.path);
      rdPathSpecks(q, pa, dr.path, rng);
    }

    for (const en of dress) {
      if (en.kind === 'ring') {
        const p2 = room.toWorld(en.x, en.y);
        rdPaintRing(q, p2.x, p2.y, en.r || 150, en.w, dr, rng, RD.corrupt);
      }
    }
    for (const en of dress) {
      if (en.kind !== 'pool') continue;
      const p2 = room.toWorld(en.x, en.y);
      rdPaintPool(q, p2.x, p2.y, en.rx || 80, en.ry || 40, dr, rng, RD.act === 2);
      RD.pools.push({ x: p2.x, y: p2.y, rx: en.rx || 80, ry: en.ry || 40 });
    }

    if (RD.act !== 4) rdGroundScatter(q, room, b, th, rng);

    // corruption: red glinting fungus creeping in from the treeline
    if (RD.corrupt && RD.act !== 4) {
      const n = 5 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const spot = rdEdgeSpot(b, rng, 30, 90);
        SPR.drawBottom(q, 'redfungus', spot.x, spot.y, 18 + rng() * 8);
      }
    }

    // the clearing darkens toward the wall of trees (the baked half of the
    // clearing light; the breathing half is drawn per frame)
    rdEdgeDarkening(q, b, dr);

    RD.ground = { c, x: gx, y: gy, w: gw, h: gh };
  }

  // ---------------------------------------------------- treeline bake ------
  function rdGapStub(fq, b, gp, dr) {
    const along = gp.along;
    let x, y, dx, dy;
    if (gp.side === 'n') { x = b.x0 + along; y = b.y0; dx = 0; dy = -1; }
    else if (gp.side === 's') { x = b.x0 + along; y = b.y1; dx = 0; dy = 1; }
    else if (gp.side === 'e') { x = b.x1; y = b.y0 + along; dx = 1; dy = 0; }
    else { x = b.x0; y = b.y0 + along; dx = -1; dy = 0; }
    // the trampling fades out as it leaves the clearing: gradient strokes so
    // the stub never reads as a floating pill in the dark
    let sg = fq.createLinearGradient(x, y, x + dx * 46, y + dy * 46);
    sg.addColorStop(0, dr.path.base); sg.addColorStop(1, 'rgba(0,0,0,0)');
    fq.strokeStyle = sg; fq.lineWidth = 34; fq.globalAlpha = 0.5;
    fq.beginPath(); fq.moveTo(x - dx * 4, y - dy * 4); fq.lineTo(x + dx * 44, y + dy * 44); fq.stroke();
    sg = fq.createLinearGradient(x, y, x + dx * 36, y + dy * 36);
    sg.addColorStop(0, dr.path.mid); sg.addColorStop(1, 'rgba(0,0,0,0)');
    fq.strokeStyle = sg; fq.lineWidth = 16; fq.globalAlpha = 0.45;
    fq.beginPath(); fq.moveTo(x - dx * 4, y - dy * 4); fq.lineTo(x + dx * 34, y + dy * 34); fq.stroke();
    fq.globalAlpha = 1;
    // the way through is a mouth, not a meadow: it goes dark fast
    const gr = fq.createLinearGradient(x + dx * 26, y + dy * 26, x + dx * 96, y + dy * 96);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, dr.void);
    fq.fillStyle = gr;
    fq.fillRect(Math.min(x - 56, x + dx * 100), Math.min(y - 56, y + dy * 100),
      dx === 0 ? 112 : 100 + 56, dy === 0 ? 112 : 100 + 56);
  }
  function rdDeepMass(fq, b, dr, rng, gaps) {
    fq.fillStyle = dr.canopyDeep;
    const w = (b.x1 - b.x0) + RD_PAD * 2, h = (b.y1 - b.y0) + RD_PAD * 2;
    fq.fillRect(b.x0 - RD_PAD, b.y0 - RD_PAD, w, RD_PAD - 96);
    fq.fillRect(b.x0 - RD_PAD, b.y1 + 96, w, RD_PAD - 96);
    fq.fillRect(b.x0 - RD_PAD, b.y0 - RD_PAD, RD_PAD - 96, h);
    fq.fillRect(b.x1 + 96, b.y0 - RD_PAD, RD_PAD - 96, h);
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
      for (let along = -60; along < len + 60; along += 44 + rng() * 30) {
        const near = rdNearGap(gaps, side, along, 64);
        const d = near ? 98 + rng() * 20 : 96 - rng() * 34;
        const pt = rdOutPoint(b, side, along, d);
        fq.beginPath();
        fq.ellipse(pt.x, pt.y, 36 + rng() * 26, 30 + rng() * 20, rng() * TAU, 0, TAU);
        fq.fill();
      }
    }
  }
  function rdCrownRows(fq, b, dr, rng, gaps) {
    const crowns = ['tl_crown1', 'tl_crown2', 'tl_crown3'];
    const burn = RD.act === 3, hollow = RD.act === 4;
    // back row: darker, bigger, sunk toward the deep mass
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
      for (let along = -50; along < len + 50; along += 56 + rng() * 26) {
        if (rdNearGap(gaps, side, along, 62)) continue;
        const pt = rdOutPoint(b, side, along + (rng() - 0.5) * 16, 76 + rng() * 40);
        fq.globalAlpha = 0.85;
        SPR.draw(fq, crowns[(rng() * crowns.length) | 0], pt.x, pt.y, 104 + rng() * 44);
      }
    }
    // front row: the individual trees you actually read
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
      for (let along = -40; along < len + 40; along += 50 + rng() * 24) {
        if (rdNearGap(gaps, side, along, 58)) continue;
        const pt = rdOutPoint(b, side, along + (rng() - 0.5) * 12, 24 + rng() * 42);
        fq.globalAlpha = 1;
        if ((burn && rng() < 0.3) || (hollow && rng() < 0.35)) {
          SPR.drawBottom(fq, 'tl_snag', pt.x, pt.y + 30, 28 + rng() * 10);
          continue;
        }
        SPR.draw(fq, crowns[(rng() * crowns.length) | 0], pt.x, pt.y, 84 + rng() * 34);
      }
    }
    // corners packed tight so the clearing reads carved, not tiled
    for (const cn of [[b.x0, b.y0, -1, -1], [b.x1, b.y0, 1, -1], [b.x0, b.y1, -1, 1], [b.x1, b.y1, 1, 1]]) {
      for (let i = 0; i < 4; i++) {
        const dx = (14 + rng() * 90) * cn[2], dy = (14 + rng() * 90) * cn[3];
        SPR.draw(fq, crowns[(rng() * crowns.length) | 0], cn[0] + dx, cn[1] + dy, 92 + rng() * 40);
      }
    }
    fq.globalAlpha = 1;
  }
  function rdOuterFade(fq, ox, oy, ow, oh, dr) {
    const F = 84;
    let gr = fq.createLinearGradient(0, oy + F, 0, oy);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, dr.void);
    fq.fillStyle = gr; fq.fillRect(ox, oy, ow, F);
    gr = fq.createLinearGradient(0, oy + oh - F, 0, oy + oh);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, dr.void);
    fq.fillStyle = gr; fq.fillRect(ox, oy + oh - F, ow, F);
    gr = fq.createLinearGradient(ox + F, 0, ox, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, dr.void);
    fq.fillStyle = gr; fq.fillRect(ox, oy, F, oh);
    gr = fq.createLinearGradient(ox + ow - F, 0, ox + ow, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, dr.void);
    fq.fillStyle = gr; fq.fillRect(ox + ow - F, oy, F, oh);
  }
  function rdRimAccent(fq, b, dr, gaps) {
    const rim = RD.corrupt ? 'rgba(' + MARK + ',0.22)' : dr.rim;
    fq.strokeStyle = rim; fq.lineWidth = 2.4; fq.lineCap = 'round';
    for (const side of ['n', 'e', 's', 'w']) {
      const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
      for (let along = 14; along < len - 40; along += 60) {
        if (rdNearGap(gaps, side, along, 70)) continue;
        const a2 = rdOutPoint(b, side, along, 14);
        const c2 = rdOutPoint(b, side, along + 34, 14);
        fq.beginPath(); fq.moveTo(a2.x, a2.y); fq.lineTo(c2.x, c2.y); fq.stroke();
      }
    }
  }
  function rdNearFringe(nq, b, dr, rng, gaps) {
    const burn = RD.act === 3, hollow = RD.act === 4, sog = RD.act === 2;
    const scratchAt = [];
    // trunks on the walls whose trees face the clearing
    for (const side of ['n', 'e', 'w']) {
      const len = (side === 'n') ? b.x1 - b.x0 : b.y1 - b.y0;
      for (let along = 16; along < len - 16; along += 62 + rng() * 30) {
        if (rdNearGap(gaps, side, along, 52)) continue;
        const pt = rdOutPoint(b, side, along, 4 + rng() * 10);
        const w2 = 34 + rng() * 12;
        if ((burn || hollow) && rng() < (hollow ? 0.55 : 0.35)) {
          SPR.drawBottom(nq, 'tl_snag', pt.x, pt.y + 6, w2 * 0.8);
        } else {
          SPR.drawBottom(nq, rng() < 0.5 ? 'tl_trunk1' : 'tl_trunk2', pt.x, pt.y + 6, w2);
        }
        if (RD.corrupt && rng() < 0.3) scratchAt.push({ x: pt.x, y: pt.y - 22 - rng() * 14 });
      }
    }
    // the south wall shows canopy from behind: foliage overhangs the room
    {
      const len = b.x1 - b.x0;
      for (let along = 10; along < len - 10; along += 54 + rng() * 26) {
        if (rdNearGap(gaps, 's', along, 56)) continue;
        const pt = rdOutPoint(b, 's', along, 16 + rng() * 16);
        nq.globalAlpha = 0.96;
        SPR.draw(nq, rng() < 0.5 ? 'tl_crown2' : 'tl_crown1', pt.x + (rng() - 0.5) * 10, pt.y, 66 + rng() * 26);
      }
      nq.globalAlpha = 1;
    }
    // undergrowth stitching the wall line shut between trunks
    if (!hollow) {
      for (const side of ['n', 'e', 's', 'w']) {
        const len = (side === 'n' || side === 's') ? b.x1 - b.x0 : b.y1 - b.y0;
        for (let along = 8; along < len - 8; along += 44 + rng() * 26) {
          if (rdNearGap(gaps, side, along, 48)) continue;
          const pt = rdOutPoint(b, side, along, -2 + rng() * 8);
          if (sog && rng() < 0.35) SPR.drawBottom(nq, 'reed', pt.x, pt.y + 6, 20 + rng() * 8);
          else SPR.drawBottom(nq, 'tl_brush', pt.x, pt.y + 8, 40 + rng() * 18);
        }
      }
    }
    // the Mark, scratched at eye height facing the clearing
    nq.strokeStyle = 'rgba(' + MARK + ',0.8)'; nq.lineWidth = 1.8; nq.lineCap = 'round';
    for (const s2 of scratchAt) {
      for (let i = 0; i < 3; i++) {
        nq.beginPath();
        nq.moveTo(s2.x - 5 + i * 4, s2.y - 7);
        nq.lineTo(s2.x - 8 + i * 4, s2.y + 7);
        nq.stroke();
      }
    }
  }
  function rdBakeTreeline(g, rng, gaps) {
    const room = g.room, b = room.bounds, dr = RD.dress;
    const ox = b.x0 - RD_PAD, oy = b.y0 - RD_PAD;
    const ow = (b.x1 - b.x0) + RD_PAD * 2, oh = (b.y1 - b.y0) + RD_PAD * 2;
    const farC = rdCanvas(ow, oh);
    const fq = rdCtx(farC, ox, oy);
    const nearC = rdCanvas(ow, oh);
    const nq = rdCtx(nearC, ox, oy);

    // beyond the wall: forest floor falling away into black
    fq.fillStyle = dr.void; fq.fillRect(ox, oy, ow, oh);
    fq.clearRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    fq.fillStyle = dr.floorOut;
    fq.fillRect(ox, oy, ow, RD_PAD);
    fq.fillRect(ox, b.y1, ow, RD_PAD);
    fq.fillRect(ox, b.y0, RD_PAD, b.y1 - b.y0);
    fq.fillRect(b.x1, b.y0, RD_PAD, b.y1 - b.y0);

    for (const gp of gaps) rdGapStub(fq, b, gp, dr);
    rdDeepMass(fq, b, dr, rng, gaps);
    rdCrownRows(fq, b, dr, rng, gaps);
    rdOuterFade(fq, ox, oy, ow, oh, dr);
    if (dr.canopyWash) {
      fq.save();
      fq.globalCompositeOperation = 'source-atop';
      fq.fillStyle = dr.canopyWash;
      fq.fillRect(ox, oy, ow, oh);
      fq.restore();
    }
    rdRimAccent(fq, b, dr, gaps);

    rdNearFringe(nq, b, dr, rng, gaps);
    if (dr.canopyWash) {
      nq.save();
      nq.globalCompositeOperation = 'source-atop';
      nq.fillStyle = dr.canopyWash;
      nq.fillRect(ox, oy, ow, oh);
      nq.restore();
    }

    RD.far = { c: farC, x: ox, y: oy, w: ow, h: oh };
    RD.near = { c: nearC, x: ox, y: oy, w: ow, h: oh };
  }

  // ----------------------------------------------------- solid decos -------
  function rdBuildSolidDecos(room) {
    RD.sdecos = [];
    const list = room.solidDecos || [];
    for (const sd of list) {
      let box = null;
      for (const s of room.solids) {
        if (s.x0 == null) continue;
        if (Math.abs((s.x0 + s.x1) / 2 - sd.x) < 2 && Math.abs((s.y0 + s.y1) / 2 - sd.y) < 2) { box = s; break; }
      }
      const bw = box ? box.x1 - box.x0 : (sd.w || 60);
      const bh = box ? box.y1 - box.y0 : (sd.w || 60) * 0.5;
      const yB = (box ? box.y1 : sd.y + bh / 2) + 4;
      const a = bw / Math.max(1, bh);
      let name, tw, th, uniform = false;
      if (sd.spr === 'brock') {
        name = 'brock'; uniform = true; tw = Math.max(bw, bh) * 1.02; th = 0;
      } else if (sd.spr === 'log') {
        if (a >= 1) { name = 'logwall'; tw = bw * 1.14 + 8; th = bh + 26; }
        else { name = 'logwallv'; tw = Math.max(46, bw * 1.3); th = bh + 20; }
      } else if (a >= 1.35) { name = 'rockspan'; tw = bw * 1.12 + 8; th = bh + 30; }
      else if (a <= 0.72) { name = 'rockspanv'; tw = Math.max(48, bw * 1.25); th = bh + 20; }
      else { name = 'slabrock'; tw = bw * 1.16 + 6; th = bh + 30; }
      RD.sdecos.push({ cx: sd.x, yB, bw, bh, tw, th, name, uniform });
    }
  }
  Game.prototype.renderSolidDeco = function (ctx, e) {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(e.cx, e.yB, e.tw * 0.5, Math.min(16, e.bh * 0.45), 0, 0, TAU);
    ctx.fill();
    if (e.uniform) { SPR.drawBottom(ctx, e.name, e.cx, e.yB, e.tw); return; }
    const s = SPR.get(e.name);
    ctx.save();
    ctx.translate(e.cx, e.yB);
    ctx.scale(e.tw / s.w, e.th / s.h);
    ctx.drawImage(s.c, -s.w / 2, -s.h, s.w, s.h);
    ctx.restore();
  };

  // ------------------------------------------------------- door brush ------
  // A shut door reads blocked by brush and vines; the mass fades out with the
  // door's opening animation so an open gap reads clear and lit.
  Game.prototype.renderDoorBrush = function (ctx, door, front) {
    const openT = (typeof ROOM_OPEN_T !== 'undefined') ? ROOM_OPEN_T : 0.25;
    const k = door.state === 'open' ? (door.openT > 0 ? door.openT / openT : 0) : 1;
    if (k <= 0) return;
    const yB = door.y + 6;
    const o = { alpha: k };
    if (!front) {
      SPR.draw(ctx, 'tl_crown2', door.x, yB - 66, 76, o);
      SPR.drawBottom(ctx, 'tl_brush', door.x - 20, yB + 2, 48, o);
      SPR.drawBottom(ctx, 'tl_brush', door.x + 18, yB + 3, 44, o);
    } else {
      SPR.drawBottom(ctx, 'tl_brush', door.x - 24, yB + 9, 34, o);
      SPR.drawBottom(ctx, 'tl_brush', door.x + 25, yB + 8, 32, o);
    }
  };

  // ---------------------------------------------------- per frame ----------
  Game.prototype._roomDress = function () {
    if (RD.room !== this.room) rdBake(this);
    return RD;
  };
  function rdBake(g) {
    const room = g.room;
    const def = room.def || {};
    RD.room = room;
    RD.theme = (typeof DATA !== 'undefined' && DATA.themes && DATA.themes[def.floor]) || DATA.themes[1];
    RD.dress = RD.theme.dress || DATA.themes[1].dress;
    RD.act = def.floor === 'hollow' ? 4 : ((def.floor | 0) || 1);
    RD.voidColor = RD.dress.void;
    RD.corrupt = rdCorruption(room);
    RD.water = null;
    RD.pools = [];
    const rng = rdRng(rdSeed(String(def.id || 'room') + ':' + RD.act));
    const gaps = rdBuildGaps(room);
    RD.paths = rdBuildPaths(room, rng);
    rdBakeGround(g, rng, gaps);
    rdBakeTreeline(g, rng, gaps);
    rdBuildSolidDecos(room);
  }
  Game.prototype.renderRoomGround = function (ctx) {
    const rd = this._roomDress();
    ctx.drawImage(rd.ground.c, rd.ground.x, rd.ground.y, rd.ground.w, rd.ground.h);
    ctx.drawImage(rd.far.c, rd.far.x, rd.far.y, rd.far.w, rd.far.h);
  };

  let rdFogC = null;
  function rdFogLayer() {
    if (rdFogC) return rdFogC;
    const c = document.createElement('canvas');
    c.width = 640; c.height = 240;
    const q = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * 640, y = 40 + Math.random() * 160, r = 50 + Math.random() * 90;
      const gr = q.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, 'rgba(168,222,218,0.085)');
      gr.addColorStop(1, 'rgba(168,222,218,0)');
      q.fillStyle = gr;
      for (const off of [-640, 0, 640]) {
        q.beginPath(); q.arc(x + off, y, r, 0, TAU); q.fill();
      }
    }
    rdFogC = c;
    return c;
  }

  Game.prototype.renderRoomOverlay = function (ctx) {
    const rd = this._roomDress();
    const b = this.room.bounds;
    // near trunk fringe over the cast: critters pass behind trees at the edge
    ctx.drawImage(rd.near.c, rd.near.x, rd.near.y, rd.near.w, rd.near.h);

    // one slow fog layer drifting across the Sog
    if (rd.act === 2) {
      const fog = rdFogLayer();
      const fw = (b.x1 - b.x0) * 0.9;
      const fh = Math.min((b.y1 - b.y0) * 0.9, fw * 0.42);
      const drift = (this.t * 11) % fw;
      const fy = (b.y0 + b.y1) / 2 - fh / 2 + Math.sin(this.t * 0.23) * 14;
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 0.31) * 0.1;
      for (let i = -1; i <= 1; i++) {
        ctx.drawImage(fog, b.x0 - RD_PAD + i * fw + drift, fy, fw, fh);
      }
      ctx.restore();
    }

    // the clearing light: warmer and lighter in the middle, cooler and darker
    // toward the treeline, breathing gently. Under a 12 percent swing so the
    // night mood holds.
    const dr = rd.dress;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const R = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.62;
    const breathe = Math.sin(this.t * 0.45);
    const fx = b.x0 - RD_PAD, fy2 = b.y0 - RD_PAD;
    const fw2 = (b.x1 - b.x0) + RD_PAD * 2, fh2 = (b.y1 - b.y0) + RD_PAD * 2;
    const warmA = (rd.act === 4 ? 0.028 : 0.05) + 0.011 * breathe;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let gr = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, R);
    gr.addColorStop(0, 'rgba(' + dr.lightWarm + ',' + warmA.toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(' + dr.lightWarm + ',0)');
    ctx.fillStyle = gr;
    ctx.fillRect(fx, fy2, fw2, fh2);
    ctx.restore();
    const rimA = (rd.act === 4 ? 0.30 : 0.10) + 0.02 * breathe;
    gr = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.25);
    gr.addColorStop(0, 'rgba(' + dr.lightDark + ',0)');
    gr.addColorStop(1, 'rgba(' + dr.lightDark + ',' + rimA.toFixed(3) + ')');
    ctx.fillStyle = gr;
    ctx.fillRect(fx, fy2, fw2, fh2);
  };

})();
