// Merit Badge Massacre: the wipe between rooms. Owns the 'transit' phase.
// Never active until a door is walked through. game.js calls
// Transition.update(this, rawDt) every frame while this.phase === 'transit'
// and Transition.render(ctx, W, H) every frame regardless of phase.
'use strict';

const Transition = (function () {
  // ---- timeline (seconds, measured from Transition.start) ----
  const T_PUSH = 0.30;   // camera push-in eases to its peak by here
  const T_SWAP = 0.55;   // the cut: room swap, arrays cleared, overlay is fully black
  const T_HOLD = 0.60;   // overlay holds black a beat after the cut
  const T_END = 0.95;    // overlay finishes fading out, phase returns to 'play'
  const CARD_START = 0.6;
  const CARD_END = 2.0;
  const CARD_SLIDE = 0.35;

  const ZOOM_BASE = 1;
  const ZOOM_PUSH = 1.08;
  const ZOOM_SNAP = 0.94;

  const ARRAY_FIELDS = [
    'enemies', 'shots', 'eshots', 'bombs', 'puddles', 'rings',
    'swings', 'corpses', 'gems', 'pickups', 'parts', 'props', 'zones',
  ];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerpV(a, b, k) { return a + (b - a) * k; }
  function easeOutCubic(k) { const i = 1 - k; return 1 - i * i * i; }
  function nowSeconds() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now() / 1000;
    }
    return Date.now() / 1000;
  }

  const api = {
    active: false,
    t: 0,
    door: null,
    alpha: 0,

    // -------------------------------------------------------------
    start(g, door) {
      if (this.active) return;
      if (!g) return;
      this.door = door || null;
      this.t = 0;
      this.active = true;
      this.swapped = false;
      this.ended = false;
      this.alpha = 0;
      this.fromPhase = g.phase;
      g.phase = 'transit';
      this.hasCard = !!(this.door && this.door.label);
      this.cardT = this.hasCard ? 0 : null;
      this._lastCardNow = null;
    },

    update(g, rawDt) {
      if (!this.active) return;
      this.t += rawDt;
      const t = this.t;

      // overlay: fade in to the cut, hold a beat, fade back out
      if (t <= T_SWAP) {
        this.alpha = clamp01(t / T_SWAP);
      } else if (t <= T_HOLD) {
        this.alpha = 1;
      } else {
        this.alpha = 1 - clamp01((t - T_HOLD) / (T_END - T_HOLD));
      }

      // camera: push in toward the door, snap in on the cut, settle back to rest
      if (g) {
        if (t <= T_PUSH) {
          g.zoomF = lerpV(ZOOM_BASE, ZOOM_PUSH, easeOutCubic(clamp01(t / T_PUSH)));
        } else if (t <= T_SWAP) {
          g.zoomF = ZOOM_PUSH;
        } else if (t <= T_HOLD) {
          g.zoomF = ZOOM_SNAP;
        } else if (t <= T_END) {
          g.zoomF = lerpV(ZOOM_SNAP, ZOOM_BASE, easeOutCubic(clamp01((t - T_HOLD) / (T_END - T_HOLD))));
        } else {
          g.zoomF = ZOOM_BASE;
        }
      }

      if (this.hasCard) this.cardT = t;

      if (!this.swapped && t >= T_SWAP) {
        this.swapped = true;
        this._swap(g);
      }

      if (!this.ended && t >= T_END) {
        this.ended = true;
        this.active = false;
        this.alpha = 0;
        if (g) {
          g.phase = 'play';
          g.zoomF = ZOOM_BASE;
          if (g.player) g.player.iframe = Math.max(g.player.iframe || 0, 0.6);
        }
      }
    },

    render(ctx, W, H) {
      this._tickCard();

      const drawOverlay = this.active && this.alpha > 0;
      const drawCard = this.hasCard && this.cardT != null &&
        this.cardT >= CARD_START && this.cardT <= CARD_END;

      if (!drawOverlay && !drawCard) return;
      if (!ctx) return;

      if (drawOverlay) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + this.alpha + ')';
        ctx.fillRect(0, 0, W, H);

        // inward vignette pinch: a dark ring that tightens as the overlay commits
        const cx = W / 2, cy = H / 2;
        const maxR = Math.hypot(cx, cy);
        const innerR = Math.max(0, maxR * (0.85 - 0.4 * this.alpha));
        const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.8, 0.35 + this.alpha * 0.45) + ')');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (drawCard) this._drawCard(ctx, W, H);
    },

    // ---------------- internal ----------------
    // Fires exactly once, when t first reaches T_SWAP: banks the field,
    // clears the world, hands off to Run, and lands the player if the
    // (not-yet-landed) room system gives us somewhere to land.
    _swap(g) {
      if (!g) return;

      let sum = 0;
      if (Array.isArray(g.gems)) {
        for (let i = 0; i < g.gems.length; i++) {
          const gem = g.gems[i];
          if (gem && typeof gem.v === 'number') sum += gem.v;
        }
      }
      if (typeof g.gainXP === 'function') g.gainXP(sum);

      for (let i = 0; i < ARRAY_FIELDS.length; i++) {
        const arr = g[ARRAY_FIELDS[i]];
        if (Array.isArray(arr)) arr.length = 0;
      }

      if (typeof Run !== 'undefined' && Run && typeof Run.advance === 'function') {
        Run.advance(this.door);
      }

      if (g.room && g.room.bounds) {
        if (g.room.entryPoint && g.player) {
          g.player.x = g.room.entryPoint.x;
          g.player.y = g.room.entryPoint.y;
        }
        // else: no entry point on offer this wave, leave the player where they are
      }

      g.zoomF = ZOOM_SNAP;
    },

    // The card keeps sliding after the transit phase ends, but update() is
    // only ever called while phase === 'transit'. Once we've gone inactive,
    // render() (which does run every frame) advances the card clock itself.
    _tickCard() {
      if (!this.hasCard || this.cardT == null) return;
      if (this.active) { this._lastCardNow = null; return; }
      if (this.cardT >= CARD_END) return;
      const now = nowSeconds();
      if (this._lastCardNow == null) { this._lastCardNow = now; return; }
      const dt = now - this._lastCardNow;
      this._lastCardNow = now;
      if (dt > 0) this.cardT = Math.min(CARD_END, this.cardT + Math.min(0.25, dt));
    },

    _drawCard(ctx, W, H) {
      const label = this.door && this.door.label;
      if (!label) return;

      const dur = CARD_END - CARD_START;
      const local = this.cardT - CARD_START;
      let a, dy;
      if (local < CARD_SLIDE) {
        const k = easeOutCubic(clamp01(local / CARD_SLIDE));
        a = k; dy = lerpV(-16, 0, k);
      } else if (local > dur - CARD_SLIDE) {
        a = clamp01((dur - local) / CARD_SLIDE); dy = 0;
      } else {
        a = 1; dy = 0;
      }
      if (a <= 0) return;

      const text = String(label).toUpperCase();
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '600 13px sans-serif';
      ctx.textBaseline = 'middle';
      const spacing = 3;
      let textW = 0;
      for (const ch of text) textW += ctx.measureText(ch).width + spacing;
      textW -= spacing;

      const padX = 22, stripH = 28;
      const stripW = textW + padX * 2;
      const cx = W / 2;
      const topY = 30 + dy;

      ctx.fillStyle = 'rgba(8,8,12,0.72)';
      ctx.fillRect(cx - stripW / 2, topY, stripW, stripH);

      ctx.fillStyle = '#f0e8d8';
      let x = cx - textW / 2;
      for (const ch of text) {
        ctx.fillText(ch, x, topY + stripH / 2);
        x += ctx.measureText(ch).width + spacing;
      }
      ctx.restore();
    },
  };

  return api;
})();
