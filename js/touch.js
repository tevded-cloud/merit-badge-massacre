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
//
// The camp is the other half of the game and it has no shooting in it, so the
// right hand side means something else there: the dodge button's own spot
// carries an INTERACT button instead, wearing whatever words the camp put on
// the walk-up prompt, and a small MENU button sits in the top right corner
// standing in for the Escape key. Both are painted here, next to the geometry
// that already knows about screen space and safe edges, and both call straight
// into the functions the keys call, so a button and a key can never drift
// apart. The camp reads the move stick itself; see camp.js update().
'use strict';

const Touch = (function () {
  const RADIUS = 70;        // css px from origin to the rim of a stick
  const DEAD = 0.12;        // inside this fraction of the radius, no input
  const AIM_PROJECT = 200;  // how far from screen center the aim cursor sits
  const BTN_R = 42;         // dodge button radius
  const GRAB = 12;          // slack around the dodge button that still counts
  const EDGE = 16;          // nothing draws closer than this to a screen edge
  // Centre to centre room between the dodge button and the aim stick. WANT
  // keeps the drawn rings from touching at all; FLOOR is the least a squeezed
  // screen is ever allowed to give, and is still wider than the button's own
  // capture circle, so a thumb reaching for the stick can never hit dodge.
  const WANT_CLEAR = RADIUS + BTN_R + 12;
  const FLOOR_CLEAR = 96;
  const TAU = Math.PI * 2;
  // The two camp buttons. MENU is small on purpose: it is a corner button that
  // pauses, and a fat one in the top right is a fat one to hit by accident.
  // INTERACT is a pill as tall as the dodge button is round, so it lands under
  // the same thumb, and only as wide as the words it is carrying.
  const MENU_W = 84;
  const MENU_H = 40;
  const ACT_H = BTN_R * 2;
  const ACT_PAD = 22;       // air between the words and the end of the pill

  // id -> { role, ox, oy, x, y }
  const pointers = new Map();
  let wrapped = false;
  let bound = false;
  let canvas = null;
  // Width the INTERACT pill was last painted at, or 0 when it was not painted.
  // Measuring text needs a context, and a pointerdown does not have one, so the
  // paint hands the number forward. render() runs every frame, so it is never
  // more than a frame old, and it is cleared the moment the button goes away.
  let actW = 0;

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

  function inCamp() {
    return typeof App !== 'undefined' && App && App.state === 'camp';
  }

  // The camp's own words for whatever the scout is standing next to, or null
  // when there is nothing there. camp.js works the nearest spot out every
  // frame already; this reads its answer rather than doing it again here.
  function campPrompt() {
    if (!inCamp()) return null;
    const c = App.camp;
    if (!c || typeof c.promptLabel !== 'function') return null;
    let s = null;
    try { s = c.promptLabel(); } catch (e) { s = null; }
    return s ? String(s) : null;
  }

  function clampN(v, lo, hi) {
    if (hi < lo) return (lo + hi) / 2;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // Where a stick sits when no thumb is on it. Pulled far enough in from the
  // edge that the whole rim is on screen on a narrow phone.
  function restAnchor(role) {
    const w = W(), h = H();
    const inset = Math.min(RADIUS + EDGE, w * 0.28);
    const y = Math.min(h * 0.72, h - RADIUS - EDGE);
    return role === 'move' ? { x: inset, y } : { x: w - inset, y };
  }

  // The dodge button is derived from the aim stick rather than from the corner,
  // so it can never land under the thumb that aims. It sits up and inboard of
  // the stick, is clamped fully on screen, and if a short screen eats the gap
  // it buys the gap back sideways instead of giving it up.
  function dodgeAnchor() {
    const w = W(), h = H();
    const a = restAnchor('aim');
    const minX = BTN_R + EDGE, maxX = w - BTN_R - EDGE;
    const minY = BTN_R + EDGE, maxY = h - BTN_R - EDGE;
    // 0.6 and 0.8 are a whole 3-4-5 triangle, so the offset is exactly
    // WANT_CLEAR long and the gap the button keeps is the gap it promises.
    let x = clampN(a.x - WANT_CLEAR * 0.6, minX, maxX);
    let y = clampN(a.y - WANT_CLEAR * 0.8, minY, maxY);
    const dy = a.y - y;
    if (Math.hypot(a.x - x, dy) < FLOOR_CLEAR) {
      const across = Math.sqrt(Math.max(0, FLOOR_CLEAR * FLOOR_CLEAR - dy * dy));
      x = clampN(a.x - across, minX, maxX);
    }
    return { x, y };
  }

  // The MENU button: the Escape key, for a screen that has no keys. Top right,
  // the same corner in camp and in a run, so the thumb learns one place.
  function menuRect() {
    return { x: W() - EDGE - MENU_W, y: EDGE, w: MENU_W, h: MENU_H };
  }

  // The INTERACT pill stands exactly where the dodge button stands in a run:
  // same centre, same height, grown sideways to hold the prompt's own words and
  // clamped so both ends stay on the screen.
  function actRect(width) {
    const b = dodgeAnchor();
    const w = clampN(width || ACT_H, ACT_H, Math.max(ACT_H, W() - EDGE * 2));
    // A screen short enough flattens the dodge spot up into the MENU button's
    // corner. The pill gives way and stands below it rather than under it. No
    // phone is this short; the guard is here so none ever has to be.
    const floor = EDGE + MENU_H + 8;
    const y = clampN(b.y - ACT_H / 2, floor, Math.max(floor, H() - EDGE - ACT_H));
    return { x: clampN(b.x - w / 2, EDGE, Math.max(EDGE, W() - EDGE - w)), y, w, h: ACT_H };
  }

  function inRect(r, x, y) {
    return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // Which control a fresh touch belongs to. The dodge button wins over the
  // stick zone it sits in, and a second thumb never steals a live stick. In
  // camp there is nothing to aim at and nothing to dodge, so the right hand
  // side claims no stick at all: it belongs to the two camp buttons, and they
  // take their own touches in the capture listener below.
  function roleFor(x, y) {
    const third = W() / 3;
    if (inCamp()) return (x < third && !has('move')) ? 'move' : null;
    const b = dodgeAnchor();
    if (Math.hypot(x - b.x, y - b.y) <= BTN_R + GRAB) return 'dodge';
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

  // One class on the page, set only when the sticks are actually on. The
  // stylesheet uses it to swap keyboard words for touch words and to move the
  // two HUD readouts out from under the MENU button. A mouse and keyboard page
  // never gets the class, so it never sees any of that.
  function markBody() {
    try { if (document.body) document.body.classList.add('touch'); } catch (e) {}
  }

  // Both camp buttons run the function the key runs. Nothing is forked here.
  function press(fn) {
    try { if (typeof gesture === 'function') gesture(); } catch (e) {}
    try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
  }

  // Capture phase, on window, so this runs before the pointerdown listener
  // bound to the canvas above: a thumb inside one of these buttons is claimed
  // here and the event is stopped dead, so the canvas listener never sees it
  // and can never mistake it for the start of a stick. Nothing below runs for
  // a mouse or a pen, or on a device where the sticks are off, so keyboard and
  // mouse play is untouched by all of it.
  function onCapture(e) {
    if (e.pointerType !== 'touch') return;
    if (!api.active) return;
    const camp = inCamp();
    if (!camp && !playing()) return;
    // MENU is the only one of the two that a run has as well. It takes no slack
    // around its edge, unlike dodge: it pauses, and a button that pauses should
    // want to be hit squarely.
    if (inRect(menuRect(), e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
      api.menuFlash = 0.18;
      press(camp ? 'campEscape' : 'showPause');
      return;
    }
    if (!camp || actW <= 0) return;
    if (!inRect(actRect(actW), e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    api.actFlash = 0.18;
    press('campInteract');
  }

  function bind(cv) {
    if (bound) return;
    bound = true;
    markBody();
    canvas = cv || document.getElementById('cv');
    if (canvas) canvas.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointerdown', onCapture, { capture: true, passive: false });
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

  // A ring stretched into a lozenge: the same dark disc under the same two
  // pixel stroke, so a button that carries words still reads as one of these.
  function pill(ctx, r, alpha, color) {
    const rad = r.h / 2;
    ctx.beginPath();
    ctx.moveTo(r.x + rad, r.y);
    ctx.lineTo(r.x + r.w - rad, r.y);
    ctx.arc(r.x + r.w - rad, r.y + rad, rad, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(r.x + rad, r.y + r.h);
    ctx.arc(r.x + rad, r.y + rad, rad, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,12,16,' + (alpha * 0.5).toFixed(3) + ')';
    ctx.fill();
    ctx.lineWidth = 2;
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

  // The INTERACT button. It is only on screen when the camp has something to
  // press, and it says whatever the camp's own prompt says, so the words on the
  // button and the words floating over the spot are the same words. A prompt
  // too long for one screen steps its type down rather than running off the end.
  function drawInteract(ctx) {
    const words = campPrompt();
    if (!words) { actW = 0; return; }
    const label = words.toUpperCase();
    const room = Math.max(0, W() - EDGE * 2 - ACT_PAD * 2);
    let size = 13;
    ctx.font = 'bold ' + size + 'px Verdana, sans-serif';
    let tw = ctx.measureText(label).width;
    while (tw > room && size > 9) {
      size--;
      ctx.font = 'bold ' + size + 'px Verdana, sans-serif';
      tw = ctx.measureText(label).width;
    }
    actW = clampN(tw + ACT_PAD * 2, ACT_H, Math.max(ACT_H, W() - EDGE * 2));
    const r = actRect(actW);
    const alpha = 0.42 + (api.actFlash > 0 ? 0.25 : 0);
    pill(ctx, r, alpha, 'rgba(244,197,66,ALPHA)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(244,197,66,0.92)';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
  }

  // The MENU button. Always there in camp, and there in a run too, because a
  // screen with no Escape key otherwise has no way to pause, mute or walk away
  // from a night once it has started.
  function drawMenu(ctx) {
    const r = menuRect();
    const alpha = 0.35 + (api.menuFlash > 0 ? 0.25 : 0);
    pill(ctx, r, alpha, 'rgba(232,224,204,ALPHA)');
    ctx.font = 'bold 12px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,224,204,0.85)';
    ctx.fillText('MENU', r.x + r.w / 2, r.y + r.h / 2);
  }

  // ---------------- api ----------------
  const api = {
    active: false,
    started: false,
    dodgeFlash: 0,
    menuFlash: 0,
    actFlash: 0,
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

    // Read only: where the three controls are for the current screen size, and
    // how much room the dodge button is keeping from the aim stick.
    layout() {
      const move = restAnchor('move');
      const aim = restAnchor('aim');
      const dodge = dodgeAnchor();
      return {
        move, aim, dodge,
        radius: RADIUS, buttonR: BTN_R, grab: GRAB,
        clearance: Math.hypot(dodge.x - aim.x, dodge.y - aim.y),
      };
    },

    // Read only, the same door as layout(): where the two camp buttons are, so
    // the geometry can be checked with no thumbs. The INTERACT rect is null
    // whenever the button is not on screen.
    campButtons() {
      return {
        menu: menuRect(),
        interact: actW > 0 ? actRect(actW) : null,
        prompt: campPrompt(),
      };
    },

    update(dt) {
      if (!this.active) return;
      if (this.dodgeFlash > 0) this.dodgeFlash = Math.max(0, this.dodgeFlash - (dt || 0));
      if (this.menuFlash > 0) this.menuFlash = Math.max(0, this.menuFlash - (dt || 0));
      if (this.actFlash > 0) this.actFlash = Math.max(0, this.actFlash - (dt || 0));

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
      const camp = inCamp();
      ctx.save();
      drawStick(ctx, 'move', 'rgba(232,224,204,ALPHA)');
      if (camp) {
        // Nothing to shoot at in camp and nothing to dodge, so the aim stick
        // and the dodge button both stand down and the INTERACT button takes
        // the corner they were sharing.
        drawInteract(ctx);
      } else {
        actW = 0;
        drawStick(ctx, 'aim', 'rgba(244,197,66,ALPHA)');
        drawDodge(ctx);
      }
      if (camp || playing()) drawMenu(ctx);
      ctx.restore();
    },
  };

  return api;
})();
