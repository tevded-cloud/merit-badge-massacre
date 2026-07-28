// Merit Badge Massacre: on-screen sticks for phones and tablets. Stays off
// until the device says it is a touch device, so mouse and keyboard are
// untouched. Nothing here edits any other file: the one hook into the
// simulation is a wrapper around Game.prototype.readInput, installed at boot
// and only on touch devices, that overrides the digital WASD vector with the
// analog one the left thumb is holding.
//
//   left third of the screen   move stick, origin where the thumb lands
//   right third                aim stick, holding it also holds fire
//   button above the right     dodge, its face shows the recharge
'use strict';

const Touch = (function () {
  const RADIUS = 70;        // css px from origin to the rim of a stick
  const DEAD = 0.12;        // inside this fraction of the radius, no input
  const AIM_PROJECT = 200;  // how far from screen center the aim cursor sits
  const BTN_R = 42;         // dodge button radius
  const TAU = Math.PI * 2;

  // id -> { role, ox, oy, x, y }
  const pointers = new Map();
  let wrapped = false;
  let bound = false;
  let canvas = null;

  function W() { return window.innerWidth; }
  function H() { return window.innerHeight; }

  function detect() {
    let coarse = false;
    try {
      coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    } catch (e) { coarse = false; }
    const points = (navigator && typeof navigator.maxTouchPoints === 'number') ? navigator.maxTouchPoints : 0;
    return coarse && points > 0;
  }

  function game() {
    return (typeof App !== 'undefined' && App) ? App.game : null;
  }

  function playing() {
    return typeof App !== 'undefined' && App && App.state === 'play';
  }

  function dodgeAnchor() {
    return { x: W() - 92, y: H() - 236 };
  }

  function restAnchor(role) {
    return role === 'move'
      ? { x: W() * 0.16, y: H() * 0.72 }
      : { x: W() * 0.84, y: H() * 0.72 };
  }

  // Which control a fresh touch belongs to. The dodge button wins over the
  // stick zone it sits in, and a second thumb never steals a live stick.
  function roleFor(x, y) {
    const b = dodgeAnchor();
    if (Math.hypot(x - b.x, y - b.y) <= BTN_R + 12) return 'dodge';
    const third = W() / 3;
    if (x < third) return has('move') ? null : 'move';
    if (x > W() - third) return has('aim') ? null : 'aim';
    return null;
  }

  function has(role) {
    let found = false;
    pointers.forEach(p => { if (p.role === role) found = true; });
    return found;
  }

  function find(role) {
    let hit = null;
    pointers.forEach(p => { if (p.role === role) hit = p; });
    return hit;
  }

  // Stick vector, clamped to the rim and zeroed inside the deadzone.
  function vectorOf(p) {
    if (!p) return { x: 0, y: 0, mag: 0 };
    const dx = p.x - p.ox, dy = p.y - p.oy;
    const d = Math.hypot(dx, dy);
    if (d < RADIUS * DEAD) return { x: 0, y: 0, mag: 0 };
    const mag = Math.min(1, d / RADIUS);
    return { x: (dx / d) * mag, y: (dy / d) * mag, mag };
  }

  function onDown(e) {
    if (!api.active || e.pointerType !== 'touch') return;
    const role = roleFor(e.clientX, e.clientY);
    if (!role) return;
    e.preventDefault();
    if (role === 'dodge') {
      pointers.set(e.pointerId, { role: 'dodge', ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
      if (playing()) INPUT.dodge = true;
      api.dodgeFlash = 0.18;
      return;
    }
    pointers.set(e.pointerId, { role, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    p.x = e.clientX;
    p.y = e.clientY;
  }

  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
  }

  // The only line of this file the simulation ever sees.
  function installWrap() {
    if (wrapped) return;
    if (typeof Game === 'undefined' || !Game.prototype || typeof Game.prototype.readInput !== 'function') return;
    wrapped = true;
    const orig = Game.prototype.readInput;
    Game.prototype.readInput = function () {
      orig.call(this);
      if (!api.active) return;
      const m = api.moveVec;
      if (m.x !== 0 || m.y !== 0) {
        this.player.in.moveX = m.x;
        this.player.in.moveY = m.y;
      }
    };
  }

  function bind(cv) {
    if (bound) return;
    bound = true;
    canvas = cv || document.getElementById('cv');
    if (canvas) canvas.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const tap = document.getElementById('tapstart');
    if (tap) {
      tap.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        // Fullscreen and the orientation lock are only granted inside the
        // gesture itself, so both are asked for right here.
        try { if (typeof AudioSys !== 'undefined' && AudioSys) { AudioSys.init(); AudioSys.poke(); } } catch (err) {}
        goFullscreen();
        api.started = true;
        tap.classList.add('hidden');
      }, { passive: false });
    }
  }

  function goFullscreen() {
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (!req) { lockLandscape(); return; }
      const p = req.call(el);
      if (p && typeof p.then === 'function') p.then(lockLandscape, lockLandscape);
      else lockLandscape();
    } catch (e) { lockLandscape(); }
  }

  function lockLandscape() {
    try {
      const o = window.screen && window.screen.orientation;
      if (o && typeof o.lock === 'function') {
        const p = o.lock('landscape');
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) {}
  }

  // ---------------- painting ----------------
  function ring(ctx, x, y, r, alpha, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = 'rgba(10,12,16,' + (alpha * 0.5).toFixed(3) + ')';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
    ctx.stroke();
  }

  function knob(ctx, x, y, r, alpha, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = color.replace('ALPHA', (alpha * 0.55).toFixed(3));
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
    ctx.stroke();
  }

  function drawStick(ctx, role, color) {
    const p = find(role);
    const live = !!p;
    const at = live ? { x: p.ox, y: p.oy } : restAnchor(role);
    const alpha = live ? 0.35 : 0.16;
    ring(ctx, at.x, at.y, RADIUS, alpha, color);
    const v = vectorOf(p);
    knob(ctx, at.x + v.x * RADIUS, at.y + v.y * RADIUS, 26, alpha, color);
  }

  function drawDodge(ctx) {
    const g = game();
    const b = dodgeAnchor();
    const ready = g && typeof g.dodgeReady === 'function' ? g.dodgeReady() : 1;
    const frac = g && typeof g.dodgeCdFrac === 'function' ? g.dodgeCdFrac() : 1;
    const color = ready > 0 ? 'rgba(126,200,232,ALPHA)' : 'rgba(140,150,165,ALPHA)';
    const alpha = 0.35 + (api.dodgeFlash > 0 ? 0.25 : 0);
    ring(ctx, b.x, b.y, BTN_R, alpha, color);
    if (ready <= 0 && frac < 1) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BTN_R - 6, -Math.PI / 2, -Math.PI / 2 + Math.max(0, Math.min(1, frac)) * TAU);
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(126,200,232,0.5)';
      ctx.stroke();
    }
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,224,204,' + (ready > 0 ? 0.85 : 0.35) + ')';
    ctx.fillText('DODGE', b.x, b.y);
  }

  // ---------------- api ----------------
  const api = {
    active: false,
    started: false,
    dodgeFlash: 0,
    moveVec: { x: 0, y: 0 },
    aimVec: { x: 0, y: 0 },

    // Called once from the UI shell, after INPUT and the canvas exist.
    init(cv) {
      this.active = detect();
      if (!this.active) return false;
      installWrap();
      bind(cv);
      return true;
    },

    // Test and debug door: turns the sticks on regardless of what the device
    // claims to be.
    enable(cv) {
      this.active = true;
      installWrap();
      bind(cv);
      return true;
    },

    update(dt) {
      if (!this.active) return;
      if (this.dodgeFlash > 0) this.dodgeFlash = Math.max(0, this.dodgeFlash - (dt || 0));

      const mv = vectorOf(find('move'));
      const av = vectorOf(find('aim'));
      this.moveVec.x = mv.x; this.moveVec.y = mv.y;
      this.aimVec.x = av.x; this.aimVec.y = av.y;
      if (typeof INPUT === 'undefined') return;
      INPUT.touchMove = { x: mv.x, y: mv.y };
      INPUT.touchAim = { x: av.x, y: av.y };

      if (!playing()) { INPUT.fire = false; return; }

      // The aim stick is a cursor: readInput turns INPUT.mx/my into a world
      // point, so the stick direction is projected out from screen center.
      if (av.mag > 0) {
        const d = Math.hypot(av.x, av.y) || 1;
        INPUT.mx = W() / 2 + (av.x / d) * AIM_PROJECT;
        INPUT.my = H() / 2 + (av.y / d) * AIM_PROJECT;
        INPUT.fire = true;
      } else {
        INPUT.fire = false;
      }
    },

    render(ctx, w, h) {
      if (!this.active || !ctx) return;
      if (typeof App !== 'undefined' && App && ['title', 'options', 'select'].includes(App.state)) return;
      ctx.save();
      drawStick(ctx, 'move', 'rgba(232,224,204,ALPHA)');
      drawStick(ctx, 'aim', 'rgba(244,197,66,ALPHA)');
      drawDodge(ctx);
      ctx.restore();
    },
  };

  return api;
})();
