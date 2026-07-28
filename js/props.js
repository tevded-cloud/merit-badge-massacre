// Merit Badge Massacre: breakable and interactable room props (crates,
// baskets, mailboxes, birdhouses, stumps, bushes, urns, barrels, logpiles,
// boulders). Catalogue and behaviour for the props unit.
'use strict';

const PROPS = {};

(function () {

  // ---------------- helpers ----------------
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  // Coins are an instant stat gain, not a pickup entity, so the only visual
  // feedback is a small gold spark burst at the break point.
  function dropCoinsFx(g, x, y, n) {
    g.gainCoins(n);
    g.spawnBurst(x, y, '#f4c542', 6);
  }

  // dropGems(x, y, value) chunks value into 25/5/1 sized gems; calling it
  // once per unit with value 1 is the simplest way to get exactly n discrete
  // gem pickups on the ground, matching the "N gems" language in the design.
  function dropGemsN(g, x, y, n) {
    for (let i = 0; i < n; i++) g.dropGems(x, y, 1);
  }

  // ---------------- catalogue ----------------
  // Sprite names are locked to this list; painters land in js/sprites.js
  // from another unit this same wave. Until they do (and forever after, for
  // any name that typos or never ships) resolveSpr() below falls back to
  // 'stone' instead of letting SPR.get() throw.
  Object.assign(PROPS, {
    crate: {
      spr: 'crate', w: 34, r: 15, hp: 12, solid: true, breakable: true,
      shard: '#8a4423',
      drop(g, x, y) {
        dropCoinsFx(g, x, y, randInt(1, 3));
        if (Math.random() < 0.3) dropGemsN(g, x, y, 1);
      },
    },
    basket: {
      spr: 'basket', w: 30, r: 13, hp: 6, solid: false, breakable: true,
      shard: '#d8b174',
      drop(g, x, y) {
        if (Math.random() < 0.25) g.pickups.push({ type: 'cocoa', x, y, t: 0 });
        else dropGemsN(g, x, y, randInt(1, 2));
      },
    },
    mailbox: {
      spr: 'mailbox', w: 26, r: 12, hp: 10, solid: false, breakable: true,
      shard: '#8a4423',
      drop(g, x, y) {
        // The "found item" hook (letters, quest triggers) lands with a
        // later unit; for now the mailbox just pays out coins.
        dropCoinsFx(g, x, y, randInt(2, 4));
      },
    },
    birdhouse: {
      spr: 'birdhouse', w: 26, r: 12, hp: 6, solid: false, breakable: true,
      shard: '#8a4423',
      onBreak: 'spawn', spawn: { id: 'squirrel', n: 3 },
    },
    stump: {
      spr: 'stump', w: 40, r: 18, hp: 16, solid: true, breakable: true,
      shard: '#8a4423',
      drop(g, x, y) { dropGemsN(g, x, y, 2); },
    },
    bush: {
      spr: 'grass1', w: 40, r: 14, hp: 6, solid: false, breakable: true,
      shard: '#5c7248',
      drop(g, x, y) { if (Math.random() < 0.3) dropGemsN(g, x, y, 1); },
    },
    urn: {
      spr: 'urn', w: 28, r: 13, hp: 18, solid: true, breakable: true,
      shard: '#b25f31',
      drop(g, x, y) { dropCoinsFx(g, x, y, randInt(3, 6)); },
    },
    barrel: {
      spr: 'barrel', w: 32, r: 15, hp: 14, solid: true, breakable: true,
      shard: '#8a4423',
      drop(g, x, y) { dropCoinsFx(g, x, y, randInt(2, 4)); },
    },
    logpile: {
      spr: 'logpile', w: 52, r: 20, hp: 20, solid: true, breakable: true,
      shard: '#7a4e2c',
      drop(g, x, y) { dropGemsN(g, x, y, randInt(2, 3)); },
    },
    boulder: {
      spr: 'stone', w: 74, r: 32, hp: 0, solid: true, breakable: false,
    },
  });

  // ---------------- sprite resolution ----------------
  // Checked once per def id, not once per prop per frame: the first render
  // (or break) of a given prop type either finds the painter or commits to
  // the 'stone' fallback, and every later prop of that type reuses the
  // cached answer.
  const sprCache = {};
  function resolveSpr(defId, def) {
    if (sprCache[defId] !== undefined) return sprCache[defId];
    let name = def.spr;
    try { SPR.get(name); } catch (e) { name = 'stone'; }
    sprCache[defId] = name;
    return name;
  }

  // ---------------- break sequence ----------------
  function breakProp(g, prop) {
    const def = prop.def;
    const sprName = resolveSpr(prop.id, def);
    AudioSys.play('pop', { pitch: rand(1.0, 1.3) });
    g.spawnPuff(prop.x, prop.y - prop.r * 0.5, Math.round(6 + prop.r * 0.3));
    if (g.corpses.length < 40) {
      g.corpses.push({
        spr: sprName, x: prop.x, y: prop.y + prop.r, w: prop.w,
        flip: false, t: 0, dur: 0.18,
      });
    }
    if (def.drop) def.drop(g, prop.x, prop.y);
    if (def.onBreak === 'spawn' && def.spawn) {
      const sp = def.spawn;
      for (let i = 0; i < sp.n; i++) {
        const a = rand(0, TAU), d = rand(16, 30);
        g.spawnEnemy(sp.id, prop.x + Math.cos(a) * d, prop.y + Math.sin(a) * d, false);
      }
    }
    if (prop.solidBox && g.room) {
      const idx = g.room.solids.indexOf(prop.solidBox);
      if (idx >= 0) g.room.solids.splice(idx, 1);
    }
    if (g.room) g.room.unbake(prop);
    prop.dead = true;
  }

  // ---------------- engine hooks ----------------
  Game.prototype.spawnProp = function (id, x, y) {
    const def = PROPS[id];
    if (!def) return null;
    const prop = {
      def, id, x, y, r: def.r, w: def.w, hp: def.hp, maxhp: def.hp,
      hitT: 0, flash: 0, dead: false, prop: true, solid: def.solid,
      eid: this.nextId++,
    };
    this.props.push(prop);
    if (this.room && def.solid) {
      // Footprint sits a touch inside the draw width and the hit radius:
      // it should read as the base the object stands on, not its full
      // silhouette or its combat hit circle.
      const hw = def.w * 0.36, hh = def.r * 0.8;
      const box = { x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh };
      this.room.solids.push(box);
      prop.solidBox = box;
    }
    return prop;
  };

  Game.prototype.damageProp = function (prop, dmg, o) {
    const def = prop.def;
    if (!def.breakable || prop.dead) return;
    prop.hp -= dmg;
    prop.flash = 0.1;
    prop.hitT = 0.14;
    AudioSys.play('hit', { pitch: rand(0.7, 0.85) });
    const n = randInt(3, 5);
    for (let i = 0; i < n && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(40, 140);
      this.parts.push({
        kind: 'spark', x: prop.x, y: prop.y - prop.r * 0.4,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.2, 0.4), size: rand(1.4, 2.6),
        color: def.shard || '#9aa0a8',
      });
    }
    if (prop.hp <= 0) breakProp(this, prop);
  };

  Game.prototype.updateProps = function (dt) {
    for (let i = this.props.length - 1; i >= 0; i--) {
      const pr = this.props[i];
      if (pr.hitT > 0) pr.hitT = Math.max(0, pr.hitT - dt);
      if (pr.flash > 0) pr.flash = Math.max(0, pr.flash - dt);
      if (pr.dead) this.props.splice(i, 1);
    }
  };

  Game.prototype.renderProp = function (ctx, prop) {
    if (prop.dead) return;
    const sprName = resolveSpr(prop.id, prop.def);
    const yB = prop.y + prop.r;
    // shadow first, like renderEnemy
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(prop.x, yB, prop.r * 1.05, prop.r * 0.38, 0, 0, TAU); ctx.fill();

    const squash = 1 - prop.hitT * 0.9;
    const o = { squash };
    SPR.drawBottom(ctx, sprName, prop.x, yB, prop.w, o);
    if (prop.flash > 0) {
      o.white = true;
      o.alpha = clamp(prop.flash / 0.1, 0, 1) * 0.75;
      SPR.drawBottom(ctx, sprName, prop.x, yB, prop.w, o);
    }
  };

})();
