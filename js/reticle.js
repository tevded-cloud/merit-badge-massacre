// Merit Badge Massacre: the two-layer aiming reticle. A world-space layer
// under the cursor previews what the player's manual weapon will actually
// do (blast radius, swing wedge, aim lane); a screen-space layer sits at
// the mouse and reads as a HUD element (spread ring, cooldown sweep, hover
// feedback). Read-only against game state: only Reticle's own private
// state (below) is ever mutated here.
'use strict';

const Reticle = (function () {

  const COLORS = { max: '#c0392b', junie: '#d8722f', gus: '#8c5c9c' };
  const DEFAULT_COLOR = '#f4c542';
  const HOVER_COLOR = '#ff5b45';
  const HOVER_R = 26;
  const FLASH_DUR = 0.12;

  function hexA(hex, a) {
    const h = (hex || DEFAULT_COLOR).replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) || 0;
    const gg = parseInt(h.substring(2, 4), 16) || 0;
    const b = parseInt(h.substring(4, 6), 16) || 0;
    return 'rgba(' + r + ',' + gg + ',' + b + ',' + a + ')';
  }

  // Reticle's own private state. Nothing here belongs to the game; it is
  // memory the reticle needs to animate itself frame to frame.
  const S = {
    gameRef: null,
    lastT: null,
    weapon: null,
    worldX: 0, worldY: 0,
    hoverEnemy: null,
    killFlashT: 0,
    readyFlashT: 0,
    wasReady: true,
    lastWeaponId: null,
  };

  function firstManualWeapon(g) {
    for (const w of g.weapons) {
      const def = DATA.weapons[w.id];
      if (def && def.kind === 'manual') return w;
    }
    return null;
  }

  // ---------------- update: clocks + hover memory ----------------
  function update(g, dt) {
    dt = dt > 0 ? dt : 0;
    const p = g.player;
    const W = window.innerWidth, H = window.innerHeight;
    const worldX = g.cam.x + (INPUT.mx - W / 2) / ZOOM;
    const worldY = g.cam.y + (INPUT.my - H / 2) / ZOOM;
    S.worldX = worldX;
    S.worldY = worldY;

    const w = firstManualWeapon(g);
    S.weapon = w;

    // hover: nearest live enemy within HOVER_R of the cursor's world point
    let hovered = null;
    if (p && typeof g.queryEnemies === 'function') {
      const hits = g.queryEnemies(worldX, worldY, HOVER_R);
      if (hits && hits.length) {
        let bd = Infinity;
        for (let i = 0; i < hits.length; i++) {
          const e = hits[i];
          const dx = e.x - worldX, dy = e.y - worldY;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; hovered = e; }
        }
      }
    }

    // kill-under-cursor: whatever was hovered last frame is gone now and
    // its own dead flag is set, so it died rather than just wandering off
    const prev = S.hoverEnemy;
    if (prev && prev !== hovered && prev.dead) {
      S.killFlashT = FLASH_DUR;
    }
    S.hoverEnemy = hovered;

    if (S.killFlashT > 0) S.killFlashT = Math.max(0, S.killFlashT - dt);
    if (S.readyFlashT > 0) S.readyFlashT = Math.max(0, S.readyFlashT - dt);

    // cooldown-ready edge: flash the instant the active weapon snaps ready
    if (w && w.stats) {
      const maxCd = (w.stats.cd || 0) * (w.stats.cdFactor || 1) * (g.cdMul || 1);
      const ready = !(maxCd > 0) || w.t <= 0;
      if (S.lastWeaponId !== w.id) {
        S.lastWeaponId = w.id;
        S.wasReady = ready;
      } else {
        if (ready && !S.wasReady) S.readyFlashT = FLASH_DUR;
        S.wasReady = ready;
      }
    }
  }

  // ---------------- world layer ----------------
  function drawGroundEllipse(ctx, g, w, worldX, worldY, color) {
    const gs = g.attackScale(w);
    const r = 10 * gs;
    ctx.fillStyle = hexA(color, 0.18);
    ctx.beginPath();
    ctx.ellipse(worldX, worldY, r, r * 0.55, 0, 0, TAU);
    ctx.fill();
  }

  function drawFirecracker(ctx, g, p, w, worldX, worldY, color) {
    const st = w.stats || {};
    if (st.radius == null) return;
    const range = st.range || 340;
    const gs = g.attackScale(w);
    let tx = worldX, ty = worldY;
    const d = Math.hypot(tx - p.x, ty - p.y) || 1;
    if (d > range) { tx = p.x + (tx - p.x) / d * range; ty = p.y + (ty - p.y) / d * range; }

    // dotted throw arc: a shallow lob preview toward the clamped landing spot
    ctx.save();
    ctx.strokeStyle = hexA(color, 0.4);
    ctx.lineWidth = 1.3;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 8);
    ctx.quadraticCurveTo((p.x + tx) / 2, (p.y + ty) / 2 - 42, tx, ty);
    ctx.stroke();
    ctx.restore();

    // dashed blast-radius circle at the landing spot
    ctx.save();
    ctx.strokeStyle = hexA(color, 0.55);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(tx, ty, (st.radius || 0) * gs, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawHatchet(ctx, g, p, w, aim, color) {
    const st = w.stats || {};
    if (st.arc == null || st.range == null) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(aim);
    ctx.fillStyle = hexA(color, 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, st.range, -st.arc / 2, st.arc / 2);
    ctx.arc(0, 0, st.range * 0.3, st.arc / 2, -st.arc / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLane(ctx, p, aimX, aimY, range, color) {
    if (!range) return;
    const ex = p.x + aimX * range, ey = p.y + aimY * range;
    const grad = ctx.createLinearGradient(p.x, p.y, ex, ey);
    grad.addColorStop(0, hexA(color, 0.22));
    grad.addColorStop(1, hexA(color, 0));
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  function drawWorldLayer(ctx, g, p, w, color) {
    drawGroundEllipse(ctx, g, w, S.worldX, S.worldY, color);
    const st = w.stats || {};
    const aimX = g.aimX != null ? g.aimX : 1;
    const aimY = g.aimY != null ? g.aimY : 0;
    switch (w.id) {
      case 'firecracker':
        drawFirecracker(ctx, g, p, w, S.worldX, S.worldY, color);
        break;
      case 'hatchet':
        drawHatchet(ctx, g, p, w, g.aimAngle || 0, color);
        break;
      case 'slingshot':
        // slingshot carries no range stat; fall back to a sane preview length
        drawLane(ctx, p, aimX, aimY, st.range || 480, color);
        break;
      case 'roaster':
        drawLane(ctx, p, aimX, aimY, st.range || 175, color);
        break;
      case 'boomerang':
        drawLane(ctx, p, aimX, aimY, st.range || 285, color);
        break;
      default:
        break;
    }
  }

  // ---------------- screen layer ----------------
  function baseRadius(st) {
    if (typeof st.spread === 'number') {
      const t = clamp((st.spread - 0.07) / (0.34 - 0.07), 0, 1);
      return lerp(9, 20, t);
    }
    return 12;
  }

  function drawScreenLayer(ctx, g, w, cx, cy, color) {
    const st = (w && w.stats) || {};
    const baseR = w ? baseRadius(st) : 12;
    const hovered = S.hoverEnemy;
    const isElite = !!(hovered && (hovered.elite || hovered.boss));

    // cooldown readiness, 0 (just fired) to 1 (ready)
    let fill = 1;
    if (w) {
      const maxCd = (st.cd || 0) * (st.cdFactor || 1) * (g.cdMul || 1);
      fill = maxCd > 0 ? 1 - clamp(w.t / maxCd, 0, 1) : 1;
    }

    // fire kick, plus a light continuous flicker while the roaster is firing
    let kick = 1 + clamp(g.recoil || 0, 0, 1) * 0.4;
    if (w && w.id === 'roaster' && INPUT.fire) {
      kick *= 1 + Math.sin(g.t * 61) * 0.05;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(kick, kick);

    // base ring
    ctx.strokeStyle = hexA(hovered ? HOVER_COLOR : color, hovered ? 0.95 : 0.85);
    ctx.lineWidth = hovered ? 2.6 : 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, TAU);
    ctx.stroke();

    // roaster's wide spray gets 4 flared ticks pointing outward
    if (w && w.id === 'roaster') {
      ctx.strokeStyle = hexA(color, 0.5);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const a = i * (TAU / 4) + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (baseR + 2), Math.sin(a) * (baseR + 2));
        ctx.lineTo(Math.cos(a) * (baseR + 8), Math.sin(a) * (baseR + 8));
        ctx.stroke();
      }
    }

    // hover feedback: 4 ticks rotating slowly, pointing inward at the ring
    if (hovered) {
      const spin = g.t * 1.6;
      ctx.strokeStyle = hexA(HOVER_COLOR, 0.9);
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = spin + i * (TAU / 4);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (baseR + 9), Math.sin(a) * (baseR + 9));
        ctx.lineTo(Math.cos(a) * (baseR + 2), Math.sin(a) * (baseR + 2));
        ctx.stroke();
      }
    }

    // cooldown sweep, snapping with a brief flash when it completes
    if (w) {
      ctx.strokeStyle = hexA(color, 0.8);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, baseR + 5, -Math.PI / 2, -Math.PI / 2 + TAU * fill);
      ctx.stroke();
      if (S.readyFlashT > 0) {
        const k = S.readyFlashT / FLASH_DUR;
        ctx.strokeStyle = hexA('#ffffff', k * 0.9);
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(0, 0, baseR + 5, 0, TAU);
        ctx.stroke();
      }
    }

    // elite/boss hp arc wrapped just outside the ring
    if (isElite && hovered.maxhp) {
      const frac = clamp(hovered.hp / hovered.maxhp, 0, 1);
      ctx.strokeStyle = hexA(HOVER_COLOR, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, baseR + 12, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
    }

    // center dot
    ctx.fillStyle = hexA(hovered ? HOVER_COLOR : color, 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, 1.6, 0, TAU);
    ctx.fill();

    // kill-under-cursor burst
    if (S.killFlashT > 0) {
      const k = S.killFlashT / FLASH_DUR;
      ctx.strokeStyle = hexA('#ffffff', k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, baseR + (1 - k) * baseR, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ---------------- render ----------------
  function render(ctx, g, W, H) {
    if (typeof App === 'undefined' || App.state !== 'play') return;
    if (!g || g.phase !== 'play') return;
    const p = g.player;
    if (!p) return;

    // Nothing in the current build calls Reticle.update() yet; render() is
    // the only wired entry point. Drive our own clock off the game's own
    // unscaled animation clock (g.t, incremented every real frame in
    // Game.update regardless of phase) so update() still runs once per
    // frame. Also reset on a fresh Game instance (new run) so stale hover
    // memory from a prior run can't fire a false kill-flash on frame one.
    // If a later change wires an explicit Reticle.update(g, dt) call into
    // the main loop, this self-drive should be removed to avoid double
    // ticking the timers above.
    if (S.gameRef !== g) {
      S.gameRef = g;
      S.lastT = null;
      S.hoverEnemy = null;
      S.killFlashT = 0;
      S.readyFlashT = 0;
      S.wasReady = true;
      S.lastWeaponId = null;
    }
    const dt = S.lastT != null ? Math.max(0, g.t - S.lastT) : 0;
    S.lastT = g.t;
    update(g, dt);

    const color = COLORS[g.charId] || DEFAULT_COLOR;
    const w = S.weapon;
    const dim = (p.dashT > 0) ? 0.75 : 1;

    ctx.save();
    ctx.globalAlpha = dim;

    if (w) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-g.cam.x, -g.cam.y);
      drawWorldLayer(ctx, g, p, w, color);
      ctx.restore();
    }

    drawScreenLayer(ctx, g, w, INPUT.mx, INPUT.my, color);

    ctx.restore();
  }

  return { update, render };
})();
