// Merit Badge Massacre: core game engine. The director (spawning, enemy AI,
// bosses, events) lives in director.js and extends Game.prototype.
'use strict';

const TAU = Math.PI * 2;
const ZOOM = 1.5;

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) >>> 0;
}

const CELL = 72;

// Reveille's speed burst. Applied where the player is integrated, never to
// this.speed, which dodge.js reads and recalc() owns.
const HASTE_MUL = 1.3;

// The number each of the six field objects treats as its radius. They were
// written at different times by different hands and named it four different
// ways, and the two that render.js reads by name (a swing's range, a puddle's
// r) cannot be renamed from here, because render.js belongs to another unit.
// So the name is looked up once, at the door, and travels on the object.
const FIELD_R = {
  swing: 'range',    // the hatchet chop
  boom: 'radius',    // the firecracker blast
  puddle: 'r',       // the canteen's holy water
  ring: 'max',       // the bugle wavefront, which grows to it
  orbit: 'r',        // the whittling knives, distance from the scout
  aura: 'r',         // the bug spray cloud
};

// Ceiling on the positional loops one room may stand up. The engine's own cap
// is 24 for the whole game and drops the farthest when a new one would break
// it; the busiest layout in the catalogue asks for 7, so this is a fence
// against a future layout, not a limit anything hits today.
const ROOM_AMBIENCE_MAX = 12;

// A scout's build, empty. One shape, made in exactly one place, so a second
// player is one more call to this and nothing else (COOP_DESIGN.md C1).
//
// items is the ordered list of held item ids and it is the whole of what
// travels: a count vector over a fixed id list, no object references, a few
// hundred bytes at a full night's twenty six picks (C15). The three compiled
// sets and the dash modifiers are DERIVED from it by rebuildTraits and are
// never saved, because a save that stored a compiled set would be a save that
// could not survive a balance change.
function newBuild() {
  return {
    items: [],
    // The stat block's item channel. stacks is a COUNT VECTOR over the
    // nineteen stat keys and flat/pct/mult are the three composition terms, so
    // a whole build is numbers over a fixed key list and travels in a few
    // hundred bytes with no object reference in it (C15). Empty here is the
    // tested state, not a special case: with every term at its identity the
    // block returns the shipped numbers bit for bit.
    grants: Stats.grants(),
    // The nineteen stats, composed. Derived from grants plus the scout's own
    // row plus the patches, rebuilt by recalc whenever any of those change and
    // never per frame. Never saved, for the same reason a compiled trait set
    // is never saved: a save that stored it would be a save that could not
    // survive a balance change.
    stats: null,
    shotTraits: Traits.NONE,    // rides every projectile this scout fires
    strikeTraits: Traits.NONE,  // the strike subset: every point of damage
    fieldTraits: Traits.NONE,   // the field subset: swings, blasts, puddles,
                                //   rings, the knife orbit, the spray cloud
    dashTraits: Traits.NONE,    // rides the dodge roll
    dashMods: { charges: 0, cdMul: 1, distMul: 1, iframeAdd: 0 },
  };
}

class Game {
  constructor(charId) {
    const c = DATA.characters[charId];
    this.charId = charId;
    this.char = c;

    // 3.0 substrate. The night's own event bus, so nothing a previous run
    // registered can reach this one and two Games in one page cannot write
    // into each other's handler lists.
    this.hooks = Hooks.create();
    // The offer builder's memory: one Map, made here and therefore cleared at
    // run start, holding which cards this night has already put in front of
    // somebody and had turned down (pool rule 1).
    this.pool = Pool.memory();
    this._statFrame = null;           // this scout's resolved bases and bounds
    this._lastOffer = null;           // the cards the open panel is showing
    this._tDepth = 0;                 // reentrancy guard for the trait pipeline
    this._chainSet = new Set();       // scratch for chain, allocated once, holds ids
    this._dashBuf = [];               // scratch for the dash grid queries
    this._decoy = null;

    const hearty = META.rank('hearty') * 12;
    this.player = {
      // Entity id. Players are numbered from zero and everything the world
      // spawns is numbered from one (this.nextId below), so a scout's id can
      // never collide with a critter's or a prop's. Every hit registry in the
      // game is a set of these numbers rather than a set of objects, which is
      // what lets a registry survive a save and attribute a kill.
      eid: 0,
      x: 0, y: 0, r: 11, hp: c.hp + hearty, maxhp: c.hp + hearty,
      face: 1, moving: false, lastDir: { x: 1, y: 0 },
      iframe: 0, god: false,
      // active skill state: Ember Drag's armed window, Reveille's speed burst
      emberArm: 0, hasteT: 0,
      in: { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, dodge: false, skill: false },
      // THE BUILD IS AN OBJECT OWNED BY A PLAYER, never a pile of fields on
      // the Game (COOP_DESIGN.md C1). Everything 3.0 adds to a scout's
      // loadout lives in here and is reached as owner.build, so a second
      // scout is a second build and not a second Game. The 2.0 stat block
      // (dmgMul, speed, armor and the rest, written by recalc) is still on
      // the Game: moving it is unit E3's job, since ui.js, run.js and
      // camp.js all read it there today.
      build: newBuild(),
    };
    this.players = [this.player];

    // Room-system fields. The open-field run leaves them at these values;
    // later waves fill them in.
    this.room = null;
    // Positional ambience for the room in play: the live handles, the room
    // they were built for, and the scene name they answer to.
    this.amb = [];
    this._ambRoom = null;
    this._ambSeq = 0;
    this._ambKey = null;
    this.act = 1;
    this.roomIdx = 0;
    this.coins = 0;
    this.props = [];
    this.zones = [];
    this.nextId = 1;
    this._threat = null;

    this.revived = false;
    this.lastKiller = null;
    this.barkNow = null;
    this.barkCds = {};
    this.killBarked = false;
    this.aimAngle = 0;
    this.aimX = 1; this.aimY = 0;
    this.recoil = 0;
    this.hurtFlash = 0;
    this.flashGold = 0;

    this.weapons = [];
    this.passives = {};
    this.addWeapon(c.weapon);

    // One active skill per night, on a button, granted here: the highest
    // priority one the player has actually earned. A run with no merit badge
    // for any of them gets null, and every skill hook below reads that as
    // "there is no button" rather than as a reason to throw.
    this.skill = this.grantSkill();
    this.emberTrail = [];
    this._wasDashing = false;

    this.enemies = [];
    this.shots = [];
    this.eshots = [];
    this.bombs = [];
    this.puddles = [];
    this.rings = [];
    this.swings = [];
    this.corpses = [];
    this.zoomF = 1;
    this.deathHat = null;
    this.hitstop = 0;
    this.gems = [];
    this.pickups = [];
    this.parts = [];
    this.nums = [];
    this.fireflies = [];
    for (let i = 0; i < 26; i++) {
      this.fireflies.push({ x: rand(-600, 600), y: rand(-400, 400), a: rand(0, TAU), ph: rand(0, TAU) });
    }

    this.time = 0;
    this.t = 0;             // animation clock
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = DATA.xpNext(1);
    this.badges = 0;
    this.pendingLevelups = 0;
    this.gemCombo = 0;
    this.gemComboT = 0;

    this.spawnT = 0.6;
    this.eliteT = 110;
    this.eventIdx = 0;
    this.bossSpawned = [false, false, false];
    this.spawnQueue = [];

    this.cam = { x: 0, y: 0 };
    this.shake = 0;
    this.shakeX = 0; this.shakeY = 0;

    this.phase = 'play';    // play, dying, over, dawn, win
    this.phaseT = 0;
    this.toasts = [];

    this.grid = new Map();
    this._qbuf = [];

    this.recalc();

    // Head Start ranks from the Badge Board: begin the night already ranked up
    const hs = META.rank('headstart');
    for (let i = 0; i < hs; i++) {
      this.level++;
      this.pendingLevelups++;
    }
    this.xpNext = DATA.xpNext(this.level);

    // The scout's own dodge flavour, said in the dash vocabulary. Junie's
    // burn trail and Gus's barge are trait sets now, not branches in
    // dodge.js, which is what lets an item that adds frost to a dash compose
    // with her fire instead of arguing with it.
    for (const p of this.players) this.rebuildTraits(p);
    for (const p of this.players) this.hooks.emit('onRunStart', this, p);
  }

  // ---------------- 3.0 substrate ----------------

  // The simulation's random stream, and the only one a trait, a hook or an
  // item is allowed to draw from (COOP_DESIGN.md C7). Delegates to the run's
  // seeded stream (js/run.js's Run.rng, the same mulberry32 stream Room
  // draws its own placement from, js/run.js:942) whenever a run is actually
  // driving this game, so a replay and a desync check have one place to
  // seed, which is what this comment used to only promise.
  //
  // Falls back to Math.random when no run is active. Two real paths hit
  // that fallback and both are supposed to: a Game is constructed before
  // Run.begin() runs (js/ui.js:164 builds the Game, js/ui.js:174 calls
  // Run.begin(), in that order, so Run.active can even still be true and
  // stale from a PREVIOUS night for the first few lines of a fresh Game's
  // constructor), and the MBM_FIELD open field debug path (js/ui.js:7)
  // never calls Run.begin() at all, so Run.active stays false for the
  // whole of a field session and every draw here is exactly what it was
  // before this change.
  rng() {
    if (typeof Run !== 'undefined' && Run && Run.active && Run.rng) return Run.rng();
    return Math.random();
  }

  // Whose damage this is. The caller says so when it knows, a projectile
  // carries the scout who fired it, and anything that names nobody belongs
  // to player one, which is the same answer at one player.
  ownerOf(o) {
    if (o) {
      if (o.owner) return o.owner;
      if (o.src && o.src.owner) return o.src.owner;
    }
    return this.players[0];
  }

  // Every projectile in the game comes through this door. owner is the scout
  // it belongs to; set defaults to that scout's granted traits, and a caller
  // with its own set (a split child inheriting its parent's) passes it.
  //
  // The two ids are stamped here and nowhere else (C4): oid says whose shot
  // this is, so a kill can be credited and a trait can find its scout without
  // reading g.player, and eid names this particular shot.
  armShot(owner, s, set) {
    const o = owner || this.players[0];
    s.oid = o.eid;
    s.eid = this.nextId++;
    s.owner = o;
    const use = (set === undefined || set === null) ? o.build.shotTraits : set;
    return Traits.arm(this, s, use);
  }

  // THE SECOND DOOR (BUILD_ARCHITECTURE.md 4.7). Everything with an area and
  // a lifetime comes through here, exactly as every projectile comes through
  // armShot, and it stamps the same two ids for the same reason (C4).
  //
  // WHY IT EXISTS, measured. Before E2, armShot was called from three sites.
  // DATA.weapons has nine entries. So six of the nine weapons made an object
  // with a position and a lifetime that no item could touch, and a card
  // promising "your shots pierce and chain" was two thirds a lie on a build
  // holding a hand axe. This door plus six call sites is the whole fix.
  //
  // rk is the name of the number this field's own updater treats as a radius.
  // Six objects, written by more than one hand, named it four different ways,
  // and renaming them would reach into render.js, which is not this unit's
  // file. So the name travels with the object.
  armField(owner, f, set) {
    const o = owner || this.players[0];
    f.oid = o.eid;
    f.eid = this.nextId++;
    f.owner = o;
    if (f.rk === undefined) f.rk = FIELD_R[f.fkind] || 'r';
    const use = (set === undefined || set === null) ? o.build.fieldTraits : set;
    Traits.armField(this, f, use);
    // The per-body registry appears exactly when something needs it. A field
    // with no hit budget keeps no registry at all, so an empty build walks
    // the same path it walked in 2.0 and pays nothing for a Map it will
    // never read.
    if (f.budget > 0) {
      if (f.fhit === undefined) f.fhit = new Set();
      f.hitN = new Map();
    }
    return f;
  }

  // The one place a field decides whether it may strike a body again.
  //
  // A field with no registry has nothing to exclude and always says yes: that
  // is the hatchet swing, the firecracker blast and the holy water puddle as
  // they have always behaved. A field with a registry says yes once per body,
  // which is what the bugle ring has always done. Pierce raises that to
  // 1 + budget strikes per body, and the ids are entity ids, never bodies
  // (C5).
  fieldStrike(f, e) {
    const reg = f.fhit;
    if (reg === undefined) return true;
    if (!reg.has(e.eid)) {
      reg.add(e.eid);
      if (f.hitN !== undefined) f.hitN.set(e.eid, 1);
      return true;
    }
    const b = f.budget;
    if (b === undefined || b <= 0) return false;
    const n = f.hitN.get(e.eid) || 1;
    if (n > b) return false;
    f.hitN.set(e.eid, n + 1);
    return true;
  }

  // Split, on a field. The copies are FIELDS: swings, blasts, puddles and
  // rings, pushed into the four arrays this file already owns. Nothing here
  // can touch this.enemies, and that is the point, because C14 forbids any
  // item raising the living body count outside the party multiplier.
  //
  // A copy is measured off the parent AFTER the parent was armed, so a build
  // holding giant and split makes a big field that makes smaller big fields
  // rather than a field that grows a little every generation. gen decrements
  // and at zero the spawn does nothing, so a split cannot run away.
  //
  // The knife orbit and the spray cloud are absent on purpose: both are
  // permanently attached to their scout and never end, so a copy would sit
  // exactly on top of the original for the rest of the night. There is
  // nothing to spawn and pretending otherwise would be a second cloud nobody
  // can see.
  splitField(f, c) {
    const n = Math.max(1, Math.round(typeof c.n === 'number' ? c.n : 3));
    const size = typeof c.size === 'number' ? c.size : 0.6;
    const dmgK = typeof c.dmg === 'number' ? c.dmg : 0.55;
    const gen = f.gen - 1;
    const rk = f.rk || 'r';
    const pr = f[rk] || 0;
    const owner = f.owner;
    const set = f.traits;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (f.a || 0);
      if (f.fkind === 'swing') {
        if (this.swings.length > 40) break;
        const sw = this.armField(owner, {
          fkind: 'swing', x: f.x, y: f.y, a: a, t: 0, dur: f.dur,
          range: pr, arc: f.arc, dmg: f.dmg, knock: f.knock, gen: gen,
        }, set);
        sw.range = pr * size;
        sw.dmg = f.dmg * dmgK;
        this.swings.push(sw);
        this.swingBite(sw);
      } else if (f.fkind === 'boom') {
        if (this.bombs.length > 40) break;
        const d = pr * 0.7;
        const bx = f.tx + Math.cos(a) * d, by = f.ty + Math.sin(a) * d;
        const b = this.armField(owner, {
          fkind: 'boom', type: 'boom', sx: f.tx, sy: f.ty, tx: bx, ty: by,
          x: f.tx, y: f.ty, t: 0, fuse: 0.22, radius: pr, dmg: f.dmg, gen: gen,
        }, set);
        b.radius = pr * size;
        b.dmg = f.dmg * dmgK;
        this.bombs.push(b);
      } else if (f.fkind === 'puddle') {
        if (this.puddles.length > 40) break;
        const d = pr * 0.8;
        const pd = this.armField(owner, {
          fkind: 'puddle', x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d,
          r: pr, dps: f.dps, life: f.life0 * 0.6, tick: 0, gen: gen,
          life0: f.life0 * 0.6,
        }, set);
        pd.r = pr * size;
        pd.dps = f.dps * dmgK;
        this.puddles.push(pd);
      } else if (f.fkind === 'ring') {
        if (this.rings.length > 20) break;
        const rg = this.armField(owner, {
          fkind: 'ring', x: f.x, y: f.y, r: 10, max: pr, speed: f.speed,
          dmg: f.dmg, knock: f.knock, stun: f.stun, fhit: new Set(), gen: gen,
        }, set);
        rg.max = pr * size;
        rg.dmg = f.dmg * dmgK;
        this.rings.push(rg);
      }
    }
  }

  // The knife orbit and the spray cloud are the two fields nobody ever built
  // an object for: both are recomputed from the weapon's stats every frame
  // and neither leaves anything behind. So the object is made here once and
  // kept on the weapon, and it is rebuilt only when the scout's field set
  // changes or the weapon levels up.
  //
  // Comparing the compiled set by IDENTITY is exact rather than lucky:
  // rebuildTraits produces a brand new array on every build change and hands
  // back the same frozen NONE when a build has granted nothing, so the
  // compare is true for exactly as long as nothing has changed.
  weaponField(owner, w, kind, r) {
    const set = owner.build.fieldTraits;
    let f = w.field;
    if (f === undefined || f.traits !== set || f.r0 !== r) {
      f = this.armField(owner, { fkind: kind, x: owner.x, y: owner.y, r: r, r0: r }, set);
      w.field = f;
    }
    f.x = owner.x;
    f.y = owner.y;
    return f;
  }

  // Fold every held item's grants into the four sets this scout's shots,
  // fields and rolls walk. Called whenever the build changes, never per frame.
  rebuildTraits(owner) {
    const b = owner.build;
    let shot = null;
    let dash = null;
    const mods = { charges: 0, cdMul: 1, distMul: 1, iframeAdd: 0 };

    // The scout's own dodge flavour is a trait set like any other. A
    // character authored before the vocabulary existed is compiled from its
    // old flags, so Junie's fire and Gus's shoulder are in the same list an
    // item writes into and compose with it instead of fighting it.
    const cd = this.char && this.char.dodge;
    if (cd) {
      const own = cd.traits || (this.legacyDashTraits ? this.legacyDashTraits(cd) : null);
      if (own) { dash = []; for (const t of own) dash.push(t); }
    }

    for (let i = 0; i < b.items.length; i++) {
      const def = DATA.relics ? DATA.relics[b.items[i]] : null;
      if (!def) continue;
      if (def.shotTraits) { if (shot === null) shot = []; for (const t of def.shotTraits) shot.push(t); }
      if (def.dashTraits) { if (dash === null) dash = []; for (const t of def.dashTraits) dash.push(t); }
      const d = def.dash;
      if (d) {
        if (d.charges) mods.charges += d.charges;
        if (d.cdMul) mods.cdMul *= d.cdMul;
        if (d.distMul) mods.distMul *= d.distMul;
        if (d.iframeAdd) mods.iframeAdd += d.iframeAdd;
      }
    }

    b.dashMods = mods;
    b.shotTraits = Traits.compileShot(shot);
    // The three surfaces, filtered out of the one compiled set by the scope
    // table. Compiled once per build change, never per shot and never per
    // frame, which is what lets armField be one array reference on the hot
    // path. Each of these is a brand new array every time this runs, and
    // weaponField below relies on exactly that to know when to rebuild.
    b.strikeTraits = Traits.strikeScope(b.shotTraits);
    b.fieldTraits = Traits.fieldScope(b.shotTraits);
    b.dashTraits = Traits.compileDash(dash);
  }

  // Take an item. Grants are data: trait lists get folded into this scout's
  // sets, hooks get registered against this scout AND the item id, so two
  // players holding the same item register independently.
  addItem(owner, id) {
    const o = owner || this.players[0];
    const def = DATA.relics ? DATA.relics[id] : null;
    if (!def || o.build.items.indexOf(id) !== -1) return false;
    o.build.items.push(id);
    this.rebuildTraits(o);
    if (def.hooks) {
      for (const h of def.hooks) this.hooks.on(h.on, o, id, h.pri || 0, h.fn);
    }
    return true;
  }

  // THE REMOVAL PATH. An item has to be able to leave a build, or a keystone
  // trade, a drawback that expires and a co-op hand-off are all rewrites
  // later. Taking it off is exactly taking it on, backwards: drop the id,
  // recompile, and take this owner's handlers off the bus by owner AND
  // source so another scout holding the same item keeps theirs.
  //
  // Shots already in the air keep the set they were armed with, which is
  // right: a stone that left the sling pierces because it was fired by a
  // build that pierced. The next shot is the one that changes.
  removeItem(owner, id) {
    const o = owner || this.players[0];
    const at = o.build.items.indexOf(id);
    if (at === -1) return false;
    o.build.items.splice(at, 1);
    this.hooks.off(o, id);
    this.rebuildTraits(o);
    return true;
  }

  bark(trigger) {
    const lines = (BARKS[this.charId] || {})[trigger];
    if (!lines || !lines.length) return;
    if (this.barkCds[trigger] != null && this.t - this.barkCds[trigger] < 25) return;
    this.barkCds[trigger] = this.t;
    this.barkNow = { text: pick(lines), t: 3.0, trigger };
    // Voice rides the bark: the subtitle stretches to cover the audio when
    // a line exists, and silence is a fully supported state.
    if (typeof Voice !== 'undefined' && Voice.available) {
      const v = Voice.speak(this.charId, this.barkNow.text, { priority: trigger });
      if (v && v.dur) this.barkNow.t = Math.max(3.0, v.dur + 0.4);
    }
  }

  // ---------------- stats ----------------
  // THE NINETEEN STAT BLOCK, composed. Every number that used to be a literal
  // in here now lives in js/stats.js, which is the single source of truth the
  // dev overlay tunes and the card renderer reads its deltas from.
  //
  // The block itself belongs to the SCOUT, on owner.build.stats, because a
  // build is an object owned by a player and no stat lives on the Game (C1).
  // The eight fields written onto `this` below are a COMPATIBILITY MIRROR and
  // nothing more: js/ui.js, js/reticle.js, js/director.js and js/traits.js all
  // read g.dmgMul and g.cdMul today and every one of those files belongs to
  // another unit, so the mirror stays until they land on the block. Grep for
  // statMirror to find every line that goes when they do.
  recalc(owner) {
    const o = owner || this.players[0];
    const b = o.build;
    const rank = id => (typeof META !== 'undefined' && META ? META.rank(id) : 0);
    const fr = Stats.frame(this.char, this.passives, rank);
    // The scout's resolved bases and bounds, kept for the offer builder's dead
    // card guard and for anything that needs to ask what a stat's ceiling is.
    this._statFrame = fr;
    const st = Stats.compute(fr, b.grants);
    b.stats = st;
    // Max health accumulates across a night rather than being recomputed, so
    // the block takes the live value and the bounds do the work.
    o.maxhp = Stats.clampTo('maxHealth', o.maxhp > 0 ? o.maxhp : fr.base.maxHealth, fr);
    st.maxHealth = o.maxhp;

    // statMirror: the 2.0 field names, for the files this unit does not own.
    this.dmgMul = st.damage;
    this.speed = st.moveSpeed;
    this.cdMul = st.cdMul;
    this.armor = st.armourFlat;
    this.magnetR = st.pickupRadius;
    this.xpMul = st.badgeXP;
    this.critCh = st.critChance;
    this.regen = st.regen;
    return st;
  }

  // The block for whoever is asking. One call site's worth of defaulting, so
  // nothing downstream has to remember that a missing owner means scout one.
  statsOf(owner) {
    const o = owner || this.players[0];
    if (!o.build.stats) this.recalc(o);
    return o.build.stats;
  }

  // Max health is the one stat that ACCUMULATES during a night instead of
  // being recomputed: two per rank up, ten from a supply patch. Those five
  // scattered mutations went through no bound at all, so this is the door they
  // go through now and the 40 to 600 bound is real without the value being
  // rebuilt out from under them.
  addMaxHp(owner, n) {
    const o = owner || this.players[0];
    const fr = this._statFrame || Stats.frame(this.char, this.passives, id => (typeof META !== 'undefined' && META ? META.rank(id) : 0));
    o.maxhp = Stats.clampTo('maxHealth', o.maxhp + n, fr);
    if (o.build && o.build.stats) o.build.stats.maxHealth = o.maxhp;
    return o.maxhp;
  }

  computeWeaponStats(id, lvl) {
    const def = DATA.weapons[id];
    const st = Object.assign({ cdFactor: 1 }, def.base);
    for (let i = 0; i < lvl - 1 && i < def.levels.length; i++) {
      const up = def.levels[i];
      for (const k in up) {
        if (k === 'text') continue;
        if (k === 'cdMul') st.cdFactor *= up[k];
        else st[k] = (st[k] || 0) + up[k];
      }
    }
    return st;
  }

  addWeapon(id) {
    this.weapons.push({ id, lvl: 1, t: 0, angle: rand(0, TAU), tickT: 0, stats: this.computeWeaponStats(id, 1) });
  }
  upgradeWeapon(id) {
    const w = this.weapons.find(w => w.id === id);
    if (!w) return;
    w.lvl++;
    w.stats = this.computeWeaponStats(id, w.lvl);
  }

  // ---------------- level up pool ----------------
  // EVERY OFFER, APPLY AND GRANT FUNCTION TAKES AN OWNER AS ITS FIRST
  // ARGUMENT (COOP_DESIGN.md C2). That is the signature ninety six items get
  // authored against in wave 3, so it is settled now.
  //
  // js/ui.js and js/transition.js still call the old one-argument forms and
  // they belong to units S3 and S4, so each of these five leads with the
  // shift below: an absent owner resolves to player one, which is the same
  // answer at one player. Every one of those shifts is deleted the day those
  // files land on the new signature, and grepping for `argShift` finds them
  // all.
  // The pool now lives in js/pool.js: the candidate list, the eight gating
  // rules and the draw. This is the door those go through, and it keeps the
  // argShift because ui.js still calls levelPool(3).
  levelPool(owner, n) {
    if (n === undefined) { n = owner; owner = null; }   // argShift, see above
    owner = owner || this.players[0];
    const entries = Pool.candidates(owner, this);
    let out;
    if (entries.length === 0) {
      // The supply cards, which are the pool's floor and not part of it.
      // Rule 7 deletes them from the level up path entirely, and that deletion
      // belongs to unit S1 along with DATA.PASSIVE_SLOTS and the patch ranks,
      // so they stay reachable here until the pool they backstop is unbounded.
      out = [];
      const fillers = DATA.fillers.slice();
      while (out.length < n && fillers.length) {
        const i = (Math.random() * fillers.length) | 0;
        const f = fillers.splice(i, 1)[0];
        out.push({ kind: 'filler', id: f.id, isNew: false, lvl: 0 });
      }
    } else {
      // rng: this.rng() is the seeded stream (see rng() above) whenever a
      // run is driving this game, so a level up offer draws from the same
      // one place a seeded replay reseeds. opts.rng falls back to
      // Math.random on its own (js/pool.js:238) if this were ever left out.
      out = Pool.offer(owner, n, this, { entries, rng: () => this.rng() });
    }
    // What the open panel is showing, so applyChoice can tell the pool's
    // memory which of these cards was turned down (rule 1).
    this._lastOffer = out;
    return out;
  }

  choiceInfo(owner, c) {
    if (c === undefined) { c = owner; owner = null; }    // argShift, see levelPool
    if (c.kind === 'weapon') {
      const def = DATA.weapons[c.id];
      return {
        name: def.name, icon: def.icon,
        chip: c.isNew ? 'NEW ' + (def.kind === 'manual' ? 'WEAPON' : 'SKILL') : 'LV ' + c.lvl,
        desc: c.isNew ? def.desc : def.levels[c.lvl - 2].text,
      };
    }
    if (c.kind === 'passive') {
      const def = DATA.passives[c.id];
      return {
        name: def.name, icon: def.icon,
        chip: c.isNew ? 'NEW BADGE' : 'LV ' + c.lvl,
        desc: (c.isNew ? def.desc + ' ' : '') + def.per,
      };
    }
    if (c.kind === 'relic') {
      const r = DATA.relics[c.id];
      return { name: r.name, icon: r.icon, chip: 'RELIC', desc: r.desc };
    }
    const f = DATA.fillers.find(f => f.id === c.id);
    return { name: f.name, icon: f.icon, chip: 'SUPPLY', desc: f.desc };
  }

  applyChoice(owner, c) {
    if (c === undefined) { c = owner; owner = null; }    // argShift, see levelPool
    owner = owner || this.players[0];
    if (c.kind === 'relic') {
      this.addItem(owner, c.id);
    } else if (c.kind === 'weapon') {
      if (c.isNew) this.addWeapon(c.id); else this.upgradeWeapon(c.id);
    } else if (c.kind === 'passive') {
      this.passives[c.id] = (this.passives[c.id] || 0) + 1;
      this.recalc();
    } else {
      const p = owner;
      if (c.id === 'smore') p.hp = Math.min(p.maxhp, p.hp + 40);
      if (c.id === 'patch') { this.addMaxHp(p, 10); p.hp = Math.min(p.maxhp, p.hp + 10); }
      if (c.id === 'stash') this.gainXP(owner, 25);
    }
    // RULE 1: taken deletes, seen decays. The cards this panel offered and
    // this player walked past are marked declined, so a card turned down at
    // rank 3 is not exactly as likely at rank 4. Nothing anywhere recorded
    // this before, which is why the same three cards could chase a player all
    // night.
    if (this._lastOffer) {
      Pool.recordOutcome(this.pool, this._lastOffer, c, 'declined');
      this._lastOffer = null;
    }
    this.flashGold = 0.35;
    this.spawnBurst(owner.x, owner.y, '#f4c542', 14);
  }

  grantChest(owner) {
    owner = owner || this.players[0];
    const picks = this.levelPool(owner, 1);
    if (picks.length === 0) {
      owner.hp = Math.min(owner.maxhp, owner.hp + 30);
      this.toast('CHEST: 30 HP', '#7ec87e');
      return;
    }
    const c = picks[0];
    this.applyChoice(owner, c);
    const info = this.choiceInfo(owner, c);
    this.toast('CHEST: ' + info.name.toUpperCase() + (c.kind !== 'filler' ? ' LV ' + c.lvl : ''), '#f4c542');
    this.hitstop = Math.max(this.hitstop, 0.16);
    this.parts.push({ kind: 'ring', x: owner.x, y: owner.y - 8, t: 0, life: 0.5, size: 90 });
    AudioSys.play('chest');
  }

  toast(text, color) {
    this.toasts.push({ text, color: color || '#ff5b45' });
  }

  gainXP(owner, v) {
    if (v === undefined) { v = owner; owner = null; }    // argShift, see levelPool
    owner = owner || this.players[0];
    this.xp += v * this.statsOf(owner).badgeXP;
    this.badges += v;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = DATA.xpNext(this.level);
      this.pendingLevelups++;
      this.addMaxHp(owner, 2);
      owner.hp = Math.min(owner.maxhp, owner.hp + 6);
      // rank-up moment: freeze frame, gold ring, spark shower
      this.hitstop = Math.max(this.hitstop, 0.2);
      this.flashGold = 0.4;
      this.spawnBurst(owner.x, owner.y - 10, '#f4c542', 18);
      this.parts.push({ kind: 'ring', x: owner.x, y: owner.y - 8, t: 0, life: 0.45, size: 70 });
      this.hooks.emit('onLevelUp', this, owner, this.level);
    }
  }

  // The pause list. The eight rows the 2.0 block printed come first and in
  // their old order, because a player who knows where their armour number sits
  // should still find it there. The eleven new rows only appear once they are
  // off their neutral value, so a build with no items reads exactly as it did
  // and a build that bought Reach can see it.
  statsSummary(owner) {
    const st = this.statsOf(owner);
    const rows = [
      ['Damage', Math.round(st.damage * 100) + '%'],
      ['Crit chance', Math.round(st.critChance * 100) + '%'],
      ['Move speed', Math.round(st.moveSpeed)],
      ['Armor', st.armourFlat],
      ['Regen', st.regen.toFixed(1) + '/s'],
      ['Cooldowns', Math.round(st.cdMul * 100) + '%'],
      ['Pickup radius', Math.round(st.pickupRadius)],
      ['Badge XP', Math.round(st.badgeXP * 100) + '%'],
    ];
    // Max health is not here because the HP bar is already the whole of it.
    const extra = [
      ['armourPct', 0], ['critDamage', 2], ['area', 1], ['reach', 1],
      ['extraShots', 0], ['pierce', 0], ['effectDuration', 1], ['force', 1],
      ['dodgeRecharge', 1], ['luck', 0],
    ];
    for (const [key, neutral] of extra) {
      if (st[key] !== neutral) rows.push([Stats.SPEC[key].name, Stats.format(key, st[key])]);
    }
    return rows;
  }

  get activeBoss() {
    for (const e of this.enemies) if (e.boss && !e.dead) return e;
    return null;
  }

  // Difficulty clock. Rooms will set _threat directly; until then it is the
  // minute count the director has always scaled on.
  get threat() {
    return this._threat != null ? this._threat : this.time / 60;
  }

  // ---------------- damage ----------------
  // A boss buys its untouchable moments in two places, and neither of them
  // used to reach this function. director.js holdHp parks health on a buffer
  // no burst can chew through and keepHp puts it back every frame, and
  // setHidden parks the hit radius at zero. A projectile carries its own
  // radius, so a shot still connects with a body whose radius is zero, and
  // every one of those hits was deducted, sounded and numbered against health
  // that was going to be restored the same frame. Measured over full fights:
  // MAWMOLE threw away 39 to 45 hits and 1254 to 2099 damage, 13 to 19 percent
  // of everything the player dealt, THE BEHIND 26 hits and 794 damage, and the
  // three older bosses 0.6 to 2 percent during their phase roars. A player
  // watched 440 come off a mound and the health bar did not move.
  //
  // Held health is the one test that covers all of it: holdHp is what every
  // untouchable state calls (the phase roar, the warren, the leap, the tunnel
  // and THE BEHIND's cover), releaseHp is the only thing that clears it, and
  // keepHp refuses to run without it. Hiding is not tested separately because
  // every boss that hides holds its health in the same breath.
  //
  // 3.0: this is also THE ONE DOOR the trait pipeline hangs off. Every point
  // of player damage in the game arrives here (stones, flame, boomerangs, the
  // hand axe, orbiting knives, bug spray, holy water, firecrackers, the
  // bugle), so a hit becomes an event here and nothing downstream needs to
  // know which weapon it was. A hit on something untouchable turns back at
  // the _hpHold line above and fires nothing, which is correct: no damage
  // landed, so there is nothing for a trait or a hook to react to.
  dealDamage(e, base, o) {
    o = o || {};
    if (e.dead) return;
    // The block belongs to whoever swung. ownerOf answers scout one when
    // nothing said otherwise, which is the same answer at one player.
    const hitter = this.ownerOf(o);
    const hs = this.statsOf(hitter);
    if (e.prop) return this.damageProp(e, base * hs.damage, o);
    if (e._hpHold != null) return this.blockHit(e, o);
    let dmg = base * hs.damage;
    let crit = false;
    // Crit damage was the literal 2 in `dmg *= 2` and is stat 8 now. Without a
    // second axis, crit chance is a dead pick the moment it nears 100 percent,
    // which is a failure Isaac accepts and a 96 item catalogue cannot.
    if (!o.noCrit && Math.random() < hs.critChance) { crit = true; dmg *= hs.critDamage; }
    // A dash that marked this body on the way past. Undefined on every
    // critter nobody marked, so the compare is the whole cost.
    if (e.markT > 0) dmg *= (e.markMul || 1);
    e.hp -= dmg;
    e.flash = 0.1;
    // Force (stat 10) is applied HERE, at the one door every point of player
    // damage comes through, rather than at the nine call sites that pass a
    // knock. Its floor is genuinely zero: a build that wants bodies to stay in
    // the burning puddle wants no shove at all.
    const knock = o.knock ? o.knock * hs.force : 0;
    if (knock && !e.boss) {
      const d = Math.max(12, Math.hypot(e.x - (o.fx != null ? o.fx : this.player.x), e.y - (o.fy != null ? o.fy : this.player.y)));
      const fx = o.fx != null ? o.fx : this.player.x;
      const fy = o.fy != null ? o.fy : this.player.y;
      e.kx += (e.x - fx) / d * knock;
      e.ky += (e.y - fy) / d * knock;
    }
    if (!o.quiet) AudioSys.play('hit', { pitch: rand(0.9, 1.15) });
    if (knock >= 60 && this.parts.length < 380 && Math.random() < 0.45) {
      for (let i = 0; i < 2; i++) {
        const a = rand(0, TAU), s = rand(50, 130);
        this.parts.push({
          kind: 'spark', x: e.x, y: e.y - e.r * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          t: 0, life: rand(0.15, 0.3), size: rand(1.2, 2.2), color: '#fff2d8',
        });
      }
    }
    if ((typeof SETTINGS !== 'undefined' ? SETTINGS.dmgNums : true) && (!o.small || dmg >= 9 || crit || Math.random() < 0.25)) {
      this.spawnNum(e.x + rand(-6, 6), e.y - e.r - 6, Math.round(dmg) + '', crit ? '#ffd94a' : (o.color || '#f0e8d8'), crit);
    }

    // o.src is the projectile when a projectile did it, and undefined when a
    // chop or an aura did, which is exactly the distinction a trait's scope
    // is written against: a shot walks its own full set, everything else
    // walks the owner's pre-filtered 'any' scope subset. The depth guard
    // means a handler that deals damage of its own (a chain arc) cannot
    // re-enter the pipeline while the pipeline is on the stack.
    const owner = hitter;
    if (this._tDepth === 0 && !o.noTraits) {
      this._tDepth = 1;
      const tt = o.src !== undefined ? o.src.traits : owner.build.strikeTraits;
      if (tt !== undefined && tt !== null && tt.length !== 0) {
        if (Traits.hit(this, e, tt, o.src, dmg) && o.src !== undefined) o.src._keep = true;
      }
      this.hooks.emit('onHit', this, owner, e, dmg, o.src || null);
      this._tDepth = 0;
    }

    if (e.hp <= 0) this.killEnemy(e, false, owner);
  }

  // What a hit on something untouchable does instead. Not nothing: a shot that
  // lands with no answer at all reads as a dropped input, which is the same
  // complaint the silent deduction above caused, only quieter. So it gets the
  // one response in the game that is neither warm nor loud, a dry tick and a
  // few cold sparks off the point of contact. No health, no flash, no number,
  // no hit sound, nothing that could be read at a glance as a hit that counted,
  // and nothing satisfying enough to be worth doing on purpose. The lesson it
  // teaches is the one the fight wants taught: shoot the mounds, break the
  // cover, wait for the mole to surface.
  //
  // Rate limited per target because a held boss under continuous fire takes
  // upward of thirty of these a second, and thirty ticks a second is a noise,
  // not a cue. Everything the caller asked for otherwise still happens: the
  // projectile is consumed by its own code, and a tick the caller wanted quiet
  // (burn and puddle ticks pass quiet) stays quiet.
  blockHit(e, o) {
    if (this.t - (e._blockFxT != null ? e._blockFxT : -9) < 0.09) return;
    e._blockFxT = this.t;
    if (!o.quiet) AudioSys.play('click');
    // The tick comes off the body, not off the shooter. fx and fy are where
    // the hit came FROM (for a swing that is the player's own feet), so they
    // only ever choose which side of the body the sparks come off and which
    // way they go, exactly as the knockback above uses them. A hidden body
    // still has its real radius parked on _rBak, so a shot into a burrowed
    // mole ticks off the mound rather than off a point.
    const body = e._rBak != null ? e._rBak : e.r;
    const fx = o.fx != null ? o.fx : this.player.x;
    const fy = o.fy != null ? o.fy : this.player.y;
    let a0 = Math.atan2(fy - e.y, fx - e.x);
    if (Math.hypot(fx - e.x, fy - e.y) < 1) a0 = rand(0, TAU);
    const cx = e.x + Math.cos(a0) * body * 0.6;
    const cy = e.y - body * 0.4 + Math.sin(a0) * body * 0.4;
    for (let i = 0; i < 3 && this.parts.length < 420; i++) {
      const a = a0 + rand(-0.9, 0.9), s = rand(40, 95);
      this.parts.push({
        kind: 'spark', x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.12, 0.22), size: rand(1.3, 2.1), color: '#8fa3b8',
      });
    }
  }

  applyBurn(e, dps, dur) {
    if (e.boss) dur *= 0.6;
    // Feat counter: one tick per critter set alight, guarded on the critter,
    // or a flamethrower would count the same rabbit sixty times a second.
    if (!e.burnCounted) {
      e.burnCounted = true;
      if (typeof META !== 'undefined' && META && META.counters) META.counters.burned++;
    }
    e.burnDps = Math.max(e.burnDps || 0, dps);
    e.burnT = Math.max(e.burnT || 0, dur);
  }

  // The camp's field guide. Every named thing the troop has laid eyes on, and
  // how many of them it has put down for good. Seen is never below one:
  // nothing gets killed that was never seen. Reads whatever shape the codex
  // is already in, since it has been written by more than one hand.
  recordBoss(e, killed) {
    if (!e || !e.kind) return;
    if (typeof META === 'undefined' || !META) return;
    if (!META.codex || typeof META.codex !== 'object') META.codex = {};
    const prev = META.codex[e.kind];
    let seen = 0, kills = 0;
    if (prev && typeof prev === 'object') {
      if (prev.seen > 0) seen = prev.seen;
      if (prev.killed > 0) kills = prev.killed;
      else if (prev.kills > 0) kills = prev.kills;
      else if (prev.killed === true) kills = 1;
    } else if (prev === 'killed') { seen = 1; kills = 1; }
    else if (prev) seen = 1;

    if (killed) kills++; else seen++;
    seen = Math.max(1, seen, kills);
    META.codex[e.kind] = { seen, killed: kills };

    if (killed) {
      // A downed boss is a story switch at the fire: which one depends only on
      // how deep the run had gotten when it fell.
      if (!META.flags || typeof META.flags !== 'object') META.flags = {};
      const act = this.act >= 3 ? 3 : (this.act >= 2 ? 2 : 1);
      META.flags['act' + act + 'boss'] = true;
    }
    if (typeof META.save === 'function') META.save();
  }

  // owner is whoever put it down, so a hook can credit the kill. A body that
  // burned to death or fell to the dawn sweep names nobody and answers player
  // one, which is the same answer at one player.
  killEnemy(e, noDrops, owner) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    // Fired here, above the noDrops bail, for the same reason the codex is
    // written here: a body that went down went down, however it went down.
    // The critter still has its position, so a handler can drop something on
    // the spot it fell.
    this.hooks.emit('onKill', this, owner || this.players[0], e);
    // Before the noDrops bail: a bloodless sweep still killed the thing.
    if (e.boss) this.recordBoss(e, true);
    AudioSys.play('pop', { pitch: e.boss ? 0.5 : rand(0.85, 1.2) });
    this.spawnPuff(e.x, e.y - e.r * 0.5, e.boss ? 26 : (e.elite ? 14 : 7));
    // squash-pop corpse flash, then a soul wisp escapes
    if (this.corpses.length < 40) {
      this.corpses.push({ spr: e.spr, x: e.x, y: e.y + e.r, w: e.w, flip: e.flip, t: 0, dur: e.boss ? 0.34 : 0.18 });
    }
    if (this.parts.length < 420) {
      this.parts.push({
        kind: 'wisp', x: e.x, y: e.y - e.r * 0.6, vx: rand(-8, 8), vy: -rand(46, 70),
        t: 0, life: rand(0.6, 0.9), size: e.boss ? 5 : 2.6,
      });
    }
    if (noDrops) return;
    this.dropGems(e.x, e.y, e.xp * (e.elite ? 10 : 1));
    if (e.elite) this.pickups.push({ type: 'chest', x: e.x, y: e.y, t: 0 });
    if (e.boss) {
      this.shakeAdd(9);
      this.pickups.push({ type: 'chest', x: e.x + 20, y: e.y, t: 0 });
      this.pickups.push({ type: 'cocoa', x: e.x - 20, y: e.y, t: 0 });
      this.dropGems(e.x, e.y, 40);
      if (e.final) this.triggerDawn();
      else this.toast(e.name + ' IS DOWN', '#f4c542');
    } else {
      // The litter cap is for random consumables only; uncollected chests
      // must never starve cocoa and magnet drops for the rest of the run.
      let litter = 0;
      for (const pk of this.pickups) if (pk.type !== 'chest') litter++;
      if (Math.random() < 0.015 && litter < 8) this.pickups.push({ type: 'cocoa', x: e.x, y: e.y, t: 0 });
      else if (Math.random() < 0.006 && litter < 8) this.pickups.push({ type: 'magnet', x: e.x, y: e.y, t: 0 });
    }
  }

  dropGems(x, y, value) {
    let v = Math.max(1, Math.round(value));
    while (v > 0) {
      const chunk = v >= 25 ? 25 : (v >= 5 ? 5 : 1);
      v -= chunk;
      if (this.gems.length >= 400) {
        let best = null, bd = Infinity;
        for (const g of this.gems) {
          const d = dist2(g.x, g.y, x, y);
          if (d < bd) { bd = d; best = g; }
        }
        if (best) best.v += chunk;
        continue;
      }
      this.gems.push({ x: x + rand(-14, 14), y: y + rand(-10, 10), v: chunk, attracted: false, ph: rand(0, TAU) });
    }
  }

  damagePlayer(dmg, fx, fy, kind) {
    const p = this.player;
    if (p.iframe > 0 || p.dashI > 0 || p.god || this.phase !== 'play') return;
    // ARMOUR IS TWO ROWS, and the flat term subtracts first. Converting flat
    // armour to a percentage would have been a silent nerf no automated gate
    // catches: at the shipped ceiling of 11 (2 from Gus's row, 6 from three
    // Skillet ranks, 3 from three Camp Grit ranks) the flat subtraction puts
    // every chaff body in DATA.enemies on the 1 damage floor, and that
    // immunity to small bodies is the entire reason Gus can stand still in a
    // crowd. The percentage rides on top of it and is what keeps a late
    // armour pick alive against a boss.
    const st = this.statsOf(p);
    const taken = Stats.damageTaken(dmg, st.armourFlat, st.armourPct);
    p.hp -= taken;
    if (kind) this.lastKiller = kind;
    if (p.hp > 0 && p.hp < p.maxhp * 0.3) this.bark('lowhp');
    p.iframe = 0.7;
    this.hurtFlash = 0.4;
    this.shakeAdd(6);
    AudioSys.play('hurt');
    if (fx != null) {
      const d = Math.max(10, Math.hypot(p.x - fx, p.y - fy));
      p.x += (p.x - fx) / d * 14;
      p.y += (p.y - fy) / d * 14;
    }
    this.spawnNum(p.x, p.y - 24, '-' + taken, '#ff5b45', true);
    this.hooks.emit('onDamaged', this, p, taken, kind);
    if (p.hp <= 0) {
      // Second Wind from the Badge Board: once per night, dawn insists
      if (META.rank('secondwind') > 0 && !this.revived) {
        this.revived = true;
        p.hp = Math.ceil(p.maxhp * 0.4);
        p.iframe = 2.5;
        this.hitstop = Math.max(this.hitstop, 0.35);
        this.flashGold = 0.7;
        this.spawnBurst(p.x, p.y, '#f4c542', 26);
        this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.6, size: 110 });
        this.toast('SECOND WIND', '#f4c542');
        AudioSys.play('levelup');
        this.bark('revive');
        return;
      }
      this.bark('death');
      p.hp = 0;
      // The night is over the instant the scout goes down, so the night in
      // progress stops existing here rather than at the results screen. A tab
      // closed during the death animation cannot be continued back to life.
      if (typeof Run !== 'undefined' && Run && typeof Run.clearSave === 'function') Run.clearSave();
      this.phase = 'dying';
      this.phaseT = 0;
      this.hitstop = 0.28;
      this.shakeAdd(10);
      this.spawnPuff(p.x, p.y, 12);
      // hat flies off
      this.deathHat = {
        x: p.x, y: p.y - 26, vx: rand(-70, 70), vy: -190,
        rot: 0, vrot: rand(-7, 7), ground: p.y + p.r - 2, bounced: false,
      };
      AudioSys.play('defeat');
    }
  }

  triggerDawn() {
    if (this.phase !== 'play') return;
    // Dawn ends the night as surely as dying does: nothing left to continue.
    if (typeof Run !== 'undefined' && Run && typeof Run.clearSave === 'function') Run.clearSave();
    this.phase = 'dawn';
    this.phaseT = 0;
    // Nothing collects loot after the phase flip, so bank the field now:
    // every gem at face value, every unopened chest as a badge bonus.
    let banked = 0;
    for (const g of this.gems) banked += g.v;
    for (const pk of this.pickups) if (pk.type === 'chest') banked += 10;
    this.badges += banked;
    this.gems.length = 0;
    this.pickups.length = 0;
    AudioSys.play('victory');
    this.toast('THE SUN RISES', '#f4c542');
    this.bark('win');
  }

  // ---------------- fx ----------------
  shakeAdd(m) {
    if (typeof SETTINGS !== 'undefined' && !SETTINGS.shake) return;
    this.shake = Math.min(14, this.shake + m);
  }
  spawnNum(x, y, txt, color, big) {
    if (this.nums.length > 80) this.nums.shift();
    this.nums.push({ x, y, txt, color, big, t: 0 });
  }
  spawnPuff(x, y, n) {
    for (let i = 0; i < n && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(15, 70);
      this.parts.push({
        kind: 'puff', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20,
        t: 0, life: rand(0.4, 0.8), size: rand(4, 9),
      });
    }
    for (let i = 0; i < Math.min(4, n) && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(60, 160);
      this.parts.push({
        kind: 'ember', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.3, 0.6), size: rand(1.5, 3),
      });
    }
  }
  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(40, 180);
      this.parts.push({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.3, 0.7), size: rand(1.5, 3.2), color,
      });
    }
  }
  spawnBoom(x, y, r) {
    this.parts.push({ kind: 'ring', x, y, t: 0, life: 0.3, size: r });
    for (let i = 0; i < 16 && this.parts.length < 420; i++) {
      const a = rand(0, TAU), s = rand(60, 240);
      this.parts.push({
        kind: 'ember', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        t: 0, life: rand(0.25, 0.55), size: rand(2, 4),
      });
    }
    this.spawnPuff(x, y, 8);
  }

  // ---------------- grid ----------------
  rebuildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const k = ((e.x / CELL) | 0) + '|' + ((e.y / CELL) | 0);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(e);
    }
    for (const pr of this.props) {
      if (pr.dead) continue;
      const k = ((pr.x / CELL) | 0) + '|' + ((pr.y / CELL) | 0);
      let arr = this.grid.get(k);
      if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(pr);
    }
  }
  queryEnemies(x, y, r, includeProps) {
    const buf = this._qbuf;
    buf.length = 0;
    const x0 = ((x - r) / CELL) | 0, x1 = ((x + r) / CELL) | 0;
    const y0 = ((y - r) / CELL) | 0, y1 = ((y + r) / CELL) | 0;
    const r2 = r * r;
    for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
      for (let cy = y0 - 1; cy <= y1 + 1; cy++) {
        const arr = this.grid.get(cx + '|' + cy);
        if (!arr) continue;
        for (const e of arr) {
          if (e.dead) continue;
          if (e.prop && !includeProps) continue;
          if (dist2(e.x, e.y, x, y) <= (r + e.r) * (r + e.r)) buf.push(e);
        }
      }
    }
    return buf;
  }

  // ---------------- input ----------------
  // The one place the simulation touches the raw INPUT globals. Everything
  // downstream reads player.in, so a pad, a touch stick or a replay can feed
  // the same frame shape.
  readInput() {
    const p = this.player;
    const k = INPUT.keys;
    let moveX = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let moveY = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (moveX !== 0 || moveY !== 0) {
      const il = 1 / Math.hypot(moveX, moveY);
      moveX *= il; moveY *= il;
    }
    const W = window.innerWidth, H = window.innerHeight;
    const aimX = this.cam.x + (INPUT.mx - W / 2) / ZOOM;
    const aimY = this.cam.y + (INPUT.my - H / 2) / ZOOM;
    const dodge = INPUT.dodge === true;
    if (dodge) INPUT.dodge = false;
    // The active skill is an edge exactly like the dodge: a key, a pad button
    // or a thumb sets it, this is the one place it is spent.
    const skill = INPUT.skill === true;
    if (skill) INPUT.skill = false;
    p.in = { moveX, moveY, aimX, aimY, fire: INPUT.fire, dodge, skill };
  }

  // ---------------- update ----------------
  update(rawDt) {
    let dt = rawDt;
    this.t += rawDt;

    // The music/voice brain: a pure observer of whatever this frame's phase,
    // room and boss turn out to be, so it has to run every frame regardless
    // of which branch below returns early.
    if (typeof AudioDirector !== 'undefined' && AudioDirector) AudioDirector.update(this, rawDt);

    if (this.phase === 'dying') {
      this.phaseT += rawDt;
      // brief hitstop, then the world crawls while the camera pushes in
      if (this.hitstop > 0) { this.hitstop -= rawDt; return; }
      dt = rawDt * 0.25;
      this.zoomF = Math.min(1.3, this.zoomF + rawDt * 0.35);
      if (this.deathHat) {
        const h = this.deathHat;
        h.vy += 620 * rawDt;
        h.x += h.vx * rawDt;
        h.y += h.vy * rawDt;
        h.rot += h.vrot * rawDt;
        if (h.y >= h.ground) {
          h.y = h.ground;
          if (!h.bounced) { h.bounced = true; h.vy = -h.vy * 0.35; h.vx *= 0.5; h.vrot *= 0.4; }
          else { h.vx = 0; h.vy = 0; h.vrot = 0; }
        }
      }
      if (this.phaseT > 2.3) { this.phase = 'over'; return; }
      this.updateFx(dt);
      return;
    }
    if (this.phase === 'dawn') {
      this.phaseT += rawDt;
      const alive = this.enemies.filter(e => !e.dead);
      const killRate = Math.ceil(alive.length * rawDt * 1.6) + 1;
      for (let i = 0; i < killRate && i < alive.length; i++) {
        this.killEnemy(alive[(Math.random() * alive.length) | 0], true);
      }
      this.updateFx(rawDt);
      this.sweepDead();
      if (this.phaseT > 2.4) this.phase = 'win';
      return;
    }
    if (this.phase === 'transit') {
      Transition.update(this, rawDt);
      return;
    }
    if (this.phase !== 'play') return;

    this.readInput();

    // big moments chew time: level ups, boss entrances, chests
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      dt *= 0.12;
    }

    this.time += dt;
    const p = this.player;

    // A boss lands in the codex the frame it arrives, however it got here: the
    // spawner lives in director.js, the bookkeeping lives with the save.
    for (const e of this.enemies) {
      if (e.boss && !e.codexSeen) { e.codexSeen = true; this.recordBoss(e, false); }
    }

    // Feat counter: seconds spent one bad hit from the end of the night.
    // Nothing is written to storage here, credit() banks it when the run ends.
    if (typeof META !== 'undefined' && META && META.counters &&
        p.hp > 0 && p.hp < p.maxhp * 0.15) {
      META.counters.lowHpTime += dt;
    }

    this.updateDodge(dt);      // dodge.js, integrates its own movement
    this.updateSkill(dt);      // the one active skill, below

    // movement (a dash owns the player's position while it runs). Reveille's
    // haste is a temporary multiplier on the way out, never on the stat block
    // itself: dodge.js reads the block and recalc() owns it.
    //
    // MOVE SPEED'S FLOOR IS 132, NOT 90, and it is enforced in the block. A
    // boss was cut from 76 speed to 58 specifically so that Gus at 132 with no
    // boot patch still catches him, because at 76 he could not be caught by
    // anyone who had not bought speed and the fight simply never ended. A
    // floor of 90 puts that bug back.
    const pst = this.statsOf(p);
    const spd = pst.moveSpeed * (p.hasteT > 0 ? HASTE_MUL : 1);
    const ax = p.in.moveX, ay = p.in.moveY;
    p.moving = (ax !== 0 || ay !== 0);
    if (p.moving && !(p.dashT > 0)) {
      p.x += ax * spd * dt;
      p.y += ay * spd * dt;
      p.lastDir.x = ax; p.lastDir.y = ay;
      this.walkPhase = (this.walkPhase || 0) + dt * (spd / 13);
    }
    if (this.room) {
      const q = Collide.resolveCircle(p.x, p.y, p.r, this.room.solids);
      const c = Collide.clampToBounds(q.x, q.y, p.r, this.room.bounds);
      p.x = c.x; p.y = c.y;
    }
    p.iframe = Math.max(0, p.iframe - dt);
    if (pst.regen > 0) p.hp = Math.min(p.maxhp, p.hp + pst.regen * dt);

    // positional audio (campfire/torch/water/hazard emitters) tracks the
    // player from here every frame
    AudioSys.setListener(p.x, p.y);
    this.updateAmbience();

    // aim at the cursor (world space)
    const dxm = p.in.aimX - p.x, dym = p.in.aimY - p.y;
    const ml = Math.hypot(dxm, dym) || 1;
    this.aimX = dxm / ml; this.aimY = dym / ml;
    this.aimAngle = Math.atan2(dym, dxm);
    p.face = this.aimX < 0 ? -1 : 1;
    this.recoil = Math.max(0, this.recoil - dt * 4);

    this.rebuildGrid();
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateBombs(dt);
    this.updatePuddles(dt);
    this.updateRings(dt);
    if (this.room) this.room.update(this, dt);   // room.js drives spawns
    else this.updateDirector(dt);                // director.js, open field
    this.updateEnemies(dt);    // director.js
    this.updateProps(dt);      // props.js
    this.updateEshots(dt);
    this.updateLoot(dt);
    this.updateFx(dt);
    this.sweepDead();

    this.gemComboT -= dt;
    if (this.gemComboT <= 0) this.gemCombo = 0;

    if (!this.killBarked && this.kills >= 100) {
      this.killBarked = true;
      this.bark('kills');
    }
  }

  sweepDead() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].dead) this.enemies.splice(i, 1);
    }
  }

  // ---------------- room ambience ----------------
  // The standing water and the burnt strips a layout already draws are given a
  // voice here, and only here. Every room the run deals is a brand new Room
  // object, so comparing the object itself is enough to know the world changed:
  // the counter turns that into a new scene name, and naming a new scene is
  // what tears the last room's loops down. run.js never has to know audio
  // exists, and there is no path through a door that can leave a loop behind.
  //
  // Not calling this is also a statement: the pause menu, the level up card
  // and the run-over screen all stop updating the game, and audio.js quiets
  // the room a beat later on its own.
  updateAmbience() {
    if (typeof AudioSys === 'undefined' || !AudioSys || typeof AudioSys.setScene !== 'function') return;
    const room = this.room || null;
    if (room !== this._ambRoom) {
      this._ambRoom = room;
      this._ambSeq = (this._ambSeq | 0) + 1;
    }
    // The scene name has to identify the WORLD, not just the position in it.
    // setScene compares names, so two Games that both call their first room
    // "run:1" look like the same scene and the old one is never torn down: its
    // loops stay and the new one stacks on top. RETRY walks straight into that,
    // since every fresh Game starts its count at 1. Harmless only by luck today
    // (no act 1 layout has water or a burn band, so both sets are empty), and
    // it would double the loops the day one does, or the day biomes land.
    if (!this._ambId) this._ambId = ++Game._ambIdSeq;
    const key = 'run:' + this._ambId + ':' + (this._ambSeq | 0);
    if (AudioSys.setScene(key) || this._ambKey !== key) this.buildAmbience(key, room);
  }

  buildAmbience(key, room) {
    if (!Array.isArray(this.amb)) this.amb = [];
    for (const h of this.amb) { try { h.stop(0.12); } catch (e) {} }
    this.amb = [];
    this._ambKey = null;
    if (!AudioSys.started) return;   // no context yet: try again next frame

    const dress = (room && room.def && Array.isArray(room.def.dressing)) ? room.def.dressing : [];
    const spots = [];
    for (const en of dress) {
      if (!en) continue;
      if (en.kind === 'pool') {
        // Dressing is authored from the room's top left corner, the world has
        // the room centred on the origin. toWorld is the only place that
        // conversion is allowed to live.
        const p = room.toWorld(en.x, en.y);
        spots.push({ recipe: 'water', x: p.x, y: p.y });
      } else if (en.kind === 'burnband') {
        const a = room.toWorld(en.x0, en.y0), b = room.toWorld(en.x1, en.y1);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        // A charred strip is a line, not a place. One ember voice per 200
        // units, three at most: the hazard recipe is silent past 260, so 200
        // apart is close enough that walking the strip never crosses a hole.
        const n = Math.max(1, Math.min(3, Math.round(len / 200)));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          spots.push({ recipe: 'hazard', x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
    }
    for (let i = 0; i < spots.length && i < ROOM_AMBIENCE_MAX; i++) {
      this.amb.push(AudioSys.emitter(spots[i].recipe, { x: spots[i].x, y: spots[i].y }));
    }
    this._ambKey = key;
  }

  // ---------------- weapons ----------------
  updateWeapons(dt) {
    const p = this.player;
    // This scout's block, read once for the whole pass rather than per weapon.
    const bs = this.statsOf(p);
    for (const w of this.weapons) {
      const st = w.stats;
      const def = DATA.weapons[w.id];
      const gs = Stats.attackScale(bs.area, bs.damage, w.lvl);

      // FIELD CALL SITE 5 of 6: the knife orbit. The field is the circle the
      // knives ride, so giant widens the orbit and every knife with it. The
      // per-body cooldown lives on the BODY here rather than on the field
      // (e.knifeT, a shipped 2.0 shape), so the hit budget is spent against
      // that window instead of against a registry: 1 + budget bites per
      // window, and with no budget this is the same `continue` it always was.
      if (w.id === 'knives') {
        // Area covers the knife orbit: it is one of the five unrelated
        // per-weapon fields that were all called "radius" and it is the one
        // that never got the hidden area term, so it is on the stat now.
        const fld = this.weaponField(p, w, 'orbit', st.radius * bs.area);
        w.angle += st.rot * dt;
        const n = st.count + bs.extraShots;
        for (let i = 0; i < n; i++) {
          const a = w.angle + i * TAU / n;
          const kx = p.x + Math.cos(a) * fld.r;
          const ky = p.y + Math.sin(a) * fld.r;
          const hits = this.queryEnemies(kx, ky, 13, true);
          for (const e of hits) {
            if ((e.knifeT || 0) > this.t - st.hitCd) {
              const b = fld.budget;
              if (b === undefined || b <= 0) continue;
              if ((e.knifeN || 1) > b) continue;
              e.knifeN = (e.knifeN || 1) + 1;
            } else {
              e.knifeT = this.t;
              e.knifeN = 1;
            }
            this.dealDamage(e, st.dmg, { knock: 90, fx: p.x, fy: p.y, owner: p });
          }
        }
        continue;
      }

      // FIELD CALL SITE 6 of 6: the spray cloud. Giant makes a wider cloud.
      // Nothing else in the field vocabulary reaches it: the cloud strikes
      // everything it covers on every tick, so it keeps no per-body exclusion
      // for a hit budget to extend, and it never ends, so there is no moment
      // for a split to happen at.
      if (w.id === 'bugspray') {
        const fld = this.weaponField(p, w, 'aura', st.radius * bs.area);
        w.tickT -= dt;
        if (w.tickT <= 0) {
          w.tickT += st.tick;
          const hits = this.queryEnemies(p.x, p.y, fld.r, true);
          for (const e of hits) {
            this.dealDamage(e, st.dps * st.tick, { small: true, quiet: true, noCrit: true, color: '#9ed88a', owner: p });
            if (st.slow > 0) e.slowT = Math.max(e.slowT || 0, 0.5 * bs.effectDuration);
          }
        }
        continue;
      }

      w.t -= dt;
      if (w.t > 0) continue;
      const wantsFire = def.kind === 'manual' ? p.in.fire : true;
      if (!wantsFire) { w.t = 0; continue; }
      this.fireWeapon(w, gs);
      // cdMul is Attack Speed in the units the timer wants: the shipped
      // Scoutmaster Whistle expression divided by whatever the items bought.
      w.t = Math.max(0.06, st.cd * st.cdFactor * bs.cdMul);
    }
  }

  // Attacks grow with power: damage passives and weapon level fatten every
  // projectile, blast and swing, Isaac-style. THIS WAS THE HIDDEN AREA STAT
  // and it is folded into the Area stat now rather than deleted, because
  // deleting it hands every existing damage build a smaller stone and a
  // shorter axe. The legacy term is the base and Area multiplies it, with the
  // Area bounds applied to the product. Stats.attackScale is the only copy.
  attackScale(w, owner) {
    const bs = this.statsOf(owner);
    return Stats.attackScale(bs.area, bs.damage, w.lvl);
  }

  fireWeapon(w, scale) {
    const p = this.player;
    const st = w.stats;
    const aim = this.aimAngle;
    const bs = this.statsOf(p);
    const gs = scale !== undefined ? scale : Stats.attackScale(bs.area, bs.damage, w.lvl);
    // Extra Shots is an integer stat capped at six, and it is the one thing a
    // GENERATED weapon level may never do (4.2), which is exactly why the
    // player has to be able to buy it deliberately.
    const extra = bs.extraShots;

    switch (w.id) {
      case 'slingshot': {
        const n = st.count + extra;
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 0.11 + rand(-st.spread, st.spread);
          const a = aim + off;
          this.shots.push(this.armShot(p, {
            kind: 'pebble', x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16 - 8,
            vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed,
            dmg: st.dmg, pierce: st.pierce + bs.pierce, r: 4.5 * gs, life: 1.5 * bs.reach,
          }));
        }
        this.recoil = 0.15;
        AudioSys.play('shoot', { pitch: rand(0.92, 1.1) });
        break;
      }
      case 'roaster': {
        // Reach lengthens the gout, and C13's 455 unit fence is applied to it
        // like every other reach in the game.
        const rrange = Stats.reachOf(st.range, bs.reach);
        const rlife = rrange / st.speed;
        for (let i = 0; i < st.count + extra; i++) {
          const a = aim + rand(-st.spread, st.spread);
          const sp = st.speed * rand(0.85, 1.2);
          this.shots.push(this.armShot(p, {
            kind: 'flame', x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18 - 8,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            dmg: st.dmg, r: 9 * gs, life: rlife, maxlife: rlife,
            pierce: bs.pierce,
            burnDps: st.burnDps, burnDur: st.burnDur * bs.effectDuration,
          }));
        }
        AudioSys.play('flame');
        break;
      }
      // FIELD CALL SITE 1 of 6: the hatchet swing. The swing object already
      // had a centre, an arc and a fifth of a second of life; until E2 it was
      // a drawing and the damage was a separate pass that happened to use the
      // same numbers. Now the damage pass reads the swing, so arming it BEFORE
      // the pass is what makes giant a wider CHOP rather than a wider picture.
      case 'hatchet': {
        // THE AXE'S REACH IS THE SPECIFIC REGRESSION THIS UNIT WAS WARNED
        // ABOUT. `0.8 + gs * 0.25` is the whole of it: gs carries the hidden
        // area term, so replacing gs with a bare Area stat that does not
        // include the damage coupling shortens the swing for every damage
        // build that already exists. Measured, Gus, hatchet level 1, no
        // patches: 84 * (0.8 + 0.9 * 0.25) = 86.1 before and after. Reach
        // multiplies the composed number, so the standoff build lengthens it
        // deliberately rather than damage lengthening it by accident.
        const sw = this.armField(p, {
          fkind: 'swing', x: p.x, y: p.y, a: aim, t: 0, dur: 0.2,
          range: Stats.reachOf(st.range * (0.8 + gs * 0.25), bs.reach), arc: st.arc,
          dmg: st.dmg, knock: st.knock,
        }, null);
        this.swings.push(sw);
        this.swingBite(sw);
        this.recoil = 0.2;
        AudioSys.play('swing');
        break;
      }
      case 'firecracker': {
        const throwR = Stats.reachOf(st.range, bs.reach);
        for (let i = 0; i < st.count + extra; i++) {
          let tx = p.in.aimX + (i > 0 ? rand(-40, 40) : 0);
          let ty = p.in.aimY + (i > 0 ? rand(-40, 40) : 0);
          const d = Math.hypot(tx - p.x, ty - p.y);
          if (d > throwR) { tx = p.x + (tx - p.x) / d * throwR; ty = p.y + (ty - p.y) / d * throwR; }
          if (this.room) {
            const hit = Collide.segmentBlocked(this.room, p.x, p.y, tx, ty);
            if (hit) {
              const hd = Math.hypot(hit.x - p.x, hit.y - p.y);
              const back = Math.max(0, hd - 24) / (hd || 1);
              tx = p.x + (hit.x - p.x) * back;
              ty = p.y + (hit.y - p.y) * back;
            }
          }
          // FIELD CALL SITE 2 of 6: the firecracker. The banger in flight and
          // the blast it becomes are one object with one lifetime, so it is
          // armed here at the throw rather than at the bang: a giant cracker
          // is decided by the build that threw it.
          this.bombs.push(this.armField(p, {
            fkind: 'boom', type: 'boom', sx: p.x, sy: p.y - 10, tx, ty,
            x: p.x, y: p.y, t: 0, fuse: st.fuse,
            radius: st.radius * (0.8 + gs * 0.25), dmg: st.dmg,
          }, null));
        }
        this.recoil = 0.15;
        AudioSys.play('throw');
        break;
      }
      case 'boomerang': {
        const n = st.count + extra;
        const flight = Stats.reachOf(st.range, bs.reach);
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * 0.22;
          // hits is a per-target cooldown keyed by ENTITY ID, never by the
          // body itself: a registry of objects cannot be written to a save
          // and cannot say whose kill it was (COOP_DESIGN.md C5).
          this.shots.push(this.armShot(p, {
            kind: 'boomer', x: p.x, y: p.y - 6,
            dirx: Math.cos(a), diry: Math.sin(a), speed: st.speed,
            traveled: 0, range: flight, r: st.size * gs, dmg: st.dmg,
            phase: 'out', spin: rand(0, TAU), hits: new Map(), life: 6,
          }));
        }
        AudioSys.play('throw');
        break;
      }
      case 'canteen': {
        const seek = Stats.reachOf(st.range, bs.reach);
        for (let i = 0; i < st.count + extra; i++) {
          let tx, ty;
          const targets = this.queryEnemies(p.x, p.y, seek);
          if (targets.length) {
            const e = pick(targets);
            tx = e.x + rand(-20, 20); ty = e.y + rand(-20, 20);
          } else {
            const a = rand(0, TAU), d = rand(90, 220);
            tx = p.x + Math.cos(a) * d; ty = p.y + Math.sin(a) * d;
          }
          // The thrown tin is a delivery arc, not a field: it has no radius
          // and hurts nobody. It still carries both ids (C4). The FIELD is
          // the puddle it leaves, and that is armed where it lands, in
          // updateBombs.
          this.bombs.push({ type: 'puddle', sx: p.x, sy: p.y - 10, tx, ty, x: p.x, y: p.y, t: 0, fuse: 0.5, radius: st.radius * bs.area, dps: st.dps, dur: st.dur * bs.effectDuration, owner: p, oid: p.eid, eid: this.nextId++ });
        }
        break;
      }
      // FIELD CALL SITE 4 of 6: the bugle ring. Giant sends the wavefront
      // further, and the exclusion set it has always kept is the registry a
      // hit budget extends. Measured: at 460 units a second and a 16 ms step
      // the wavefront covers a standing critter for about three frames, so a
      // budget of 2 is worth exactly three hits and cannot become four.
      case 'bugle': {
        this.rings.push(this.armField(p, {
          fkind: 'ring', x: p.x, y: p.y, r: 14,
          max: Math.min(Stats.RANGE_CAP, st.radius * bs.area), speed: 460,
          dmg: st.dmg, knock: st.knock, stun: st.stun * bs.effectDuration, fhit: new Set(),
        }, null));
        AudioSys.play('bugle');
        break;
      }
    }
  }

  // ---------------- projectiles ----------------

  // The breakable solid standing in a blocked cell, damaged once, if there is
  // one. A cell can be blocked by bare room geometry or by a boulder, and
  // both of those still stop a shot dead with nothing to show for it, so this
  // returns the prop it hit or null. Damage goes through dealDamage, which
  // routes props to damageProp, so a projectile hit is worth exactly what a
  // melee hit is worth, dmgMul and all.
  damageSolidAt(s, dmg, o) {
    if (!this.props.length) return null;
    // The block grid stamps WHOLE cells, so a shot can die in a cell a prop
    // stamped while sitting well outside that prop's own hit circle: a stump
    // footprint 28 units wide blocks a 24 unit cell that reaches 20 units
    // further out. Search wide enough to cover the cell, then confirm the
    // point against the footprint that actually did the stamping. Testing the
    // hit circle instead is what left one of BRAMBLEBUCK's four mounds
    // unbreakable from one approach angle but not the others.
    const cell = (this.room && this.room.grid && this.room.grid.cell) || 24;
    const sr = s.r || 4;
    const near = this.queryEnemies(s.x, s.y, sr + cell, true);
    let best = null, bd = Infinity;
    for (const e of near) {
      if (!e.prop || e.dead) continue;
      const def = e.def;
      if (!def || !def.solid || !def.breakable) continue;
      const box = e.solidBox;
      if (box) {
        // A stamped cell reaches at most one cell beyond the box it came from.
        if (s.x < box.x0 - cell || s.x > box.x1 + cell) continue;
        if (s.y < box.y0 - cell || s.y > box.y1 + cell) continue;
      } else if (dist2(e.x, e.y, s.x, s.y) > (e.r + sr) * (e.r + sr)) {
        continue;
      }
      const d = dist2(e.x, e.y, s.x, s.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    this.dealDamage(best, dmg, Object.assign({ fx: s.x, fy: s.y }, o || {}));
    return best;
  }

  updateShots(dt) {
    const p = this.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      let remove = false;

      // ---- 3.0 trait pipeline ----------------------------------------
      // Every projectile carries a set. In a build that has granted nothing
      // the set is the shared frozen empty array, so this is one length
      // compare and the whole loop below runs exactly as it did in 2.0.
      const hasT = s.traits !== undefined && s.traits.length !== 0;
      if (hasT) {
        s._keep = false;
        // Steering, wall response and path ownership all resolve BEFORE the
        // shot integrates, so a ricochet turns on the frame it would have
        // entered the wall and the blocked-cell check never sees it.
        Traits.update(this, s, dt);
      }

      if (s.kind === 'boomer') {
        s.spin += 13 * dt;
        if (s.phase === 'out') {
          s.x += s.dirx * s.speed * dt;
          s.y += s.diry * s.speed * dt;
          s.traveled += s.speed * dt;
          if (s.traveled >= s.range) s.phase = 'back';
          else if (this.room && Collide.blockedAt(this.room, s.x, s.y)) s.phase = 'back';
        } else {
          const dx = p.x - s.x, dy = p.y - s.y;
          const d = Math.hypot(dx, dy) || 1;
          s.x += dx / d * s.speed * 1.2 * dt;
          s.y += dy / d * s.speed * 1.2 * dt;
          if (d < 26) remove = true;
        }
        s.life -= dt;
        if (s.life <= 0) remove = true;
        const hits = this.queryEnemies(s.x, s.y, s.r, true);
        for (const e of hits) {
          const last = s.hits.get(e.eid);
          if (last != null && this.t - last < 0.4) continue;
          s.hits.set(e.eid, this.t);
          this.dealDamage(e, s.dmg, { knock: 60, fx: s.x, fy: s.y, src: s });
        }
        if (remove) {
          if (hasT) Traits.expire(this, s);
          this.shots.splice(i, 1);
        }
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
        continue;
      }
      if (this.room && Collide.blockedAt(this.room, s.x, s.y)) {
        // A shot resolves what it hit before it dies. Most blocked cells in a
        // room are blocked BY something: a stump, a logpile, a warren mound.
        // Killing the shot on the cell first meant no projectile could ever
        // damage a solid prop, which left a slingshot or roaster build unable
        // to break BRAMBLEBUCK's mounds (an unwinnable act one) or to open the
        // cache under the logpile in a1_l_cacheline.
        this.damageSolidAt(s, s.dmg, { knock: 70, owner: s.owner });
        this.spawnPuff(s.x, s.y, 2);
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
        continue;
      }

      const hits = this.queryEnemies(s.x, s.y, s.r, true);
      for (const e of hits) {
        if (s.kind === 'flame') {
          if (s.hit !== undefined && s.hit.has(e.eid)) continue;
          this.dealDamage(e, s.dmg, { small: true, color: '#ffb347', src: s });
          this.applyBurn(e, s.burnDps, s.burnDur);
          // A gob of burning sugar is spent on contact, unless something a
          // trait did says otherwise. Pierce reads the same field the stone
          // reads, so a build that grants pierce grants it to the flame too.
          if (hasT && (s._keep || s.pierce > 0)) {
            if (!s._keep) s.pierce--;
            (s.hit || (s.hit = new Set())).add(e.eid);
            s._keep = false;
            continue;
          }
          remove = true;
          break;
        }
        // A stone overlaps a surviving enemy for several frames; without a
        // hit record the pierce charge is burned re-hitting the same target.
        // The record is a set of entity ids, never of bodies (C5).
        if (s.hit && s.hit.has(e.eid)) continue;
        this.dealDamage(e, s.dmg, { knock: 70, fx: s.x, fy: s.y, src: s });
        // A trait can insist the shot lives: bounce turns it at somebody
        // else rather than spending it. That is checked before the pierce
        // budget, so a bounce does not cost a pierce charge.
        if (hasT && s._keep) {
          (s.hit || (s.hit = new Set())).add(e.eid);
          s._keep = false;
          continue;
        }
        if (s.pierce > 0) {
          s.pierce--;
          (s.hit || (s.hit = new Set())).add(e.eid);
        } else {
          remove = true;
          break;
        }
      }
      if (remove) {
        if (hasT) Traits.expire(this, s);
        this.shots.splice(i, 1);
      }
    }
  }

  updateBombs(dt) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      const k = Math.min(1, b.t / b.fuse);
      b.x = lerp(b.sx, b.tx, k);
      b.y = lerp(b.sy, b.ty, k) - Math.sin(k * Math.PI) * 46;
      if (b.t >= b.fuse) {
        if (b.type === 'boom') {
          this.spawnBoom(b.tx, b.ty, b.radius);
          this.shakeAdd(4);
          AudioSys.play('boom');
          const hits = this.queryEnemies(b.tx, b.ty, b.radius, true);
          for (const e of hits) {
            if (!this.fieldStrike(b, e)) continue;
            this.dealDamage(e, b.dmg, { knock: 240, fx: b.tx, fy: b.ty, owner: b.owner });
          }
          // The blast IS the end of this field: it resolves in one instant
          // and there is no later moment for a split to fire at.
          Traits.fieldEnd(this, b);
        } else {
          // FIELD CALL SITE 3 of 6: the holy water. Armed here rather than at
          // the throw because the puddle is the thing with the radius and the
          // three seconds, and it does not exist until the tin lands.
          this.puddles.push(this.armField(b.owner, {
            fkind: 'puddle', x: b.tx, y: b.ty, r: b.radius, dps: b.dps,
            life: b.dur, life0: b.dur, tick: 0,
          }, null));
          AudioSys.play('splash');
        }
        this.bombs.splice(i, 1);
      }
    }
  }

  updatePuddles(dt) {
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const pd = this.puddles[i];
      pd.life -= dt;
      pd.tick -= dt;
      if (pd.tick <= 0) {
        pd.tick += 0.25;
        const hits = this.queryEnemies(pd.x, pd.y, pd.r, true);
        for (const e of hits) {
          this.dealDamage(e, pd.dps * 0.25, { small: true, quiet: true, noCrit: true, color: '#7ec8e8', owner: pd.owner });
        }
      }
      if (pd.life <= 0) {
        Traits.fieldEnd(this, pd);
        this.puddles.splice(i, 1);
      }
    }
  }

  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      const prev = rg.r;
      rg.r += rg.speed * dt;
      const hits = this.queryEnemies(rg.x, rg.y, rg.r + 20, true);
      for (const e of hits) {
        const d = Math.hypot(e.x - rg.x, e.y - rg.y);
        if (d <= rg.r + e.r && d >= prev - e.r - 6) {
          // The band test comes first and the registry second, which is the
          // order that lets a hit budget mean anything: a body outside the
          // wavefront is not a spent charge, it is simply not being hit.
          if (!this.fieldStrike(rg, e)) continue;
          // A ring that carries damage is a weapon (the Camp Bugle) and goes
          // through dealDamage exactly as it always has. A ring with no damage
          // is a shout (Reveille): it must not spawn a "0" over anybody, must
          // not play a hit sound, and must leave props standing, so it shoves
          // by hand and lets the stun below do the rest.
          if (rg.dmg > 0) {
            this.dealDamage(e, rg.dmg, { knock: rg.knock, fx: rg.x, fy: rg.y, owner: rg.owner });
          } else if (!e.prop && rg.knock && !e.boss) {
            // The one shove in the game that does not travel through
            // dealDamage, so Force is applied by hand here rather than being
            // silently missing on the shout.
            const push = rg.knock * this.statsOf(rg.owner).force;
            const kd = Math.max(12, d);
            e.kx = (e.kx || 0) + (e.x - rg.x) / kd * push;
            e.ky = (e.ky || 0) + (e.y - rg.y) / kd * push;
          }
          if (rg.stun > 0 && !e.boss) e.stunT = Math.max(e.stunT || 0, rg.stun);
        }
      }
      if (rg.r >= rg.max) {
        Traits.fieldEnd(this, rg);
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.swings.length - 1; i >= 0; i--) {
      const sw = this.swings[i];
      sw.t += dt;
      // A chop with a hit budget keeps biting for the length of its own
      // animation, which is where the extra bites go. Gated on the budget and
      // not on "carries traits", because a swing that is only bigger must
      // still land exactly once: an empty build and a giant build both take
      // this branch zero times.
      if (sw.budget > 0 && sw.t < sw.dur) this.swingBite(sw);
      if (sw.t >= sw.dur) {
        Traits.fieldEnd(this, sw);
        this.swings.splice(i, 1);
      }
    }
  }

  // The chop, as a pass over the field it is. Lifted out of fireWeapon so the
  // swing's later frames can run the same code its first frame ran, and so a
  // split copy bites the moment it appears rather than having to wait for a
  // second swing to be thrown.
  swingBite(sw) {
    const hits = this.queryEnemies(sw.x, sw.y, sw.range, true);
    for (const e of hits) {
      const ea = Math.atan2(e.y - sw.y, e.x - sw.x);
      if (Math.abs(angDiff(ea, sw.a)) > sw.arc / 2 + 0.25) continue;
      if (!this.fieldStrike(sw, e)) continue;
      this.dealDamage(e, sw.dmg, { knock: sw.knock, owner: sw.owner });
    }
  }

  updateEshots(dt) {
    const p = this.player;
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const s = this.eshots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) { this.eshots.splice(i, 1); continue; }
      if (this.room && Collide.blockedAt(this.room, s.x, s.y)) {
        this.spawnPuff(s.x, s.y, 2);
        this.eshots.splice(i, 1);
        continue;
      }
      if (dist2(s.x, s.y, p.x, p.y) < (s.r + p.r) * (s.r + p.r)) {
        this.damagePlayer(s.dmg, s.x, s.y, s.kind);
        this.eshots.splice(i, 1);
      }
    }
  }

  // ---------------- loot ----------------
  updateLoot(dt) {
    const p = this.player;
    const mr2 = this.magnetR * this.magnetR;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const d2 = dist2(g.x, g.y, p.x, p.y);
      if (g.attracted || d2 < mr2) {
        g.attracted = true;
        const d = Math.sqrt(d2) || 1;
        const sp = 540;
        g.x += (p.x - g.x) / d * sp * dt;
        g.y += (p.y - g.y) / d * sp * dt;
        if (d < 18) {
          this.gems.splice(i, 1);
          this.gainXP(p, g.v);
          this.gemCombo = Math.min(14, this.gemCombo + 1);
          this.gemComboT = 0.9;
          AudioSys.play('pickup', { pitch: 1 + this.gemCombo * 0.05 });
          this.hooks.emit('onPickup', this, p, 'gem', g.v);
        }
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t += dt;
      const d2 = dist2(pk.x, pk.y, p.x, p.y);
      if (d2 < (this.magnetR * 0.8) * (this.magnetR * 0.8)) {
        const d = Math.sqrt(d2) || 1;
        pk.x += (p.x - pk.x) / d * 300 * dt;
        pk.y += (p.y - pk.y) / d * 300 * dt;
        if (d < 20) {
          this.pickups.splice(i, 1);
          this.hooks.emit('onPickup', this, p, pk.type, 1);
          if (pk.type === 'cocoa') {
            p.hp = Math.min(p.maxhp, p.hp + 25);
            this.spawnNum(p.x, p.y - 26, '+25', '#7ec87e', true);
            AudioSys.play('heal');
          } else if (pk.type === 'magnet') {
            for (const g of this.gems) g.attracted = true;
            AudioSys.play('magnet');
          } else if (pk.type === 'chest') {
            this.grantChest(p);
          }
        }
      }
    }
  }

  // ---------------- fx update ----------------
  updateFx(dt) {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += dt;
      if (c.t >= c.dur) this.corpses.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const pa = this.parts[i];
      pa.t += dt;
      if (pa.t >= pa.life) { this.parts.splice(i, 1); continue; }
      if (pa.vx != null) {
        pa.x += pa.vx * dt;
        pa.y += pa.vy * dt;
        if (pa.kind === 'wisp') {
          pa.x += Math.sin(pa.t * 9) * 14 * dt;
        } else {
          pa.vx *= Math.pow(0.1, dt);
          pa.vy *= Math.pow(0.1, dt);
        }
        if (pa.kind === 'puff') pa.y -= 14 * dt;
      }
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += dt;
      n.y -= 34 * dt;
      if (n.t > 0.75) this.nums.splice(i, 1);
    }
    // A dash decoy is the only thing in the world that can pull a critter's
    // attention off the scout, so it is on a short clock and it clears itself.
    if (this._decoy !== null) {
      this._decoy.life -= dt;
      if (this._decoy.life <= 0) this._decoy = null;
    }
    this.shake = Math.max(0, this.shake - dt * 26);
    this.shakeX = rand(-1, 1) * this.shake;
    this.shakeY = rand(-1, 1) * this.shake;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
    this.flashGold = Math.max(0, this.flashGold - dt * 1.4);
    this.bossFlash = Math.max(0, (this.bossFlash || 0) - dt * 0.9);
    if (this.barkNow) {
      this.barkNow.t -= dt;
      if (this.barkNow.t <= 0) this.barkNow = null;
    }
    // fireflies wander near the camera
    for (const f of this.fireflies) {
      f.a += rand(-1.4, 1.4) * dt;
      f.x += Math.cos(f.a) * 26 * dt;
      f.y += Math.sin(f.a) * 26 * dt;
      const dx = f.x - this.cam.x, dy = f.y - this.cam.y;
      if (Math.abs(dx) > 700) f.x = this.cam.x - Math.sign(dx) * 680;
      if (Math.abs(dy) > 500) f.y = this.cam.y - Math.sign(dy) * 480;
    }
  }
}

// One number per Game ever made, so two nights can never claim the same scene
// name. Read by updateAmbience; see the note there for why it matters.
Game._ambIdSeq = 0;

Game.prototype.gainCoins = function (n) {
  this.coins += n;
};

// ---------------------------------------------------------------- skills ---
// The active skill: one per run, on a button, earned with a merit badge.
// DATA.skills carries the name, the icon and the description; the numbers live
// here because data.js is the balance pass's file, not this one's. An id being
// present in DATA.skills IS the unlock gate: feats.js physically lifts a locked
// def out of that table and parks it in its vault until the badge lands.
(function () {

  // Priority order. The first one the player has earned is the one the night
  // grants: a run never carries two.
  const SKILL_ORDER = ['emberdrag', 'reveille', 'fieldstrip'];

  // Seconds. Deliberately NOT multiplied by this.cdMul: the cooldown ring on
  // the HUD should be honest about the number, and tuning is not this file's.
  const SKILL_CD = { emberdrag: 10, reveille: 14, fieldstrip: 18 };

  const ARM_WINDOW = 3;        // Ember Drag: seconds to start a dash in
  const NODE_LIFE = 2.4;       // seconds a patch of the lane keeps burning
  const NODE_R = 22;
  const NODE_GAP = 14;         // minimum spacing, so the lane is even
  const NODE_TICK = 0.2;       // seconds between a node's bites
  const NODE_BURN_DPS = 9;
  const NODE_BURN_DUR = 2.0;
  const NODE_DMG = 4;
  const TRAIL_MAX = 120;       // defensive cap, a dash drops well under ten
  const EMBER_RATE = 25;       // embers a second for the whole lane, any length
  const PART_CAP = 420;        // the budget guard used everywhere in this file

  const STRIP_MAX = 30;        // Field Strip: coins spent at most, 1 hp each
  const REVEILLE_HASTE = 2.2;  // seconds of the speed burst
  const REVEILLE_STUN = 1.2;

  // ------------------------------------------------------------ unlocking ---

  // The def, wherever it currently lives. Normally DATA.skills; the vault is
  // read as a fallback so a page that has not run syncPools yet still works.
  function defOf(id) {
    if (typeof DATA !== 'undefined' && DATA && DATA.skills && DATA.skills[id]) return DATA.skills[id];
    if (typeof Feats !== 'undefined' && Feats && typeof Feats.rewardDef === 'function') {
      try { return Feats.rewardDef({ kind: 'skill', id }) || null; } catch (e) { return null; }
    }
    return null;
  }

  // Earned? Present and unlocked in DATA.skills is the real gate. The feats
  // ledger is asked as well, and both are feature tested, so a page with
  // feats.js missing (or a save that has never heard of any of this) plays.
  function unlocked(id) {
    if (typeof DATA !== 'undefined' && DATA && DATA.skills && DATA.skills[id] && !DATA.skills[id].locked) return true;
    if (typeof Feats !== 'undefined' && Feats && typeof Feats.isUnlocked === 'function') {
      try {
        const m = (typeof META !== 'undefined') ? META : null;
        if (Feats.isUnlocked('skill', id, m)) return true;
      } catch (e) { /* a save shaped like nothing we know is simply not earned */ }
    }
    return false;
  }

  function build(id) {
    const def = defOf(id);
    if (!def) return null;
    return { id, def, cd: SKILL_CD[id] || 12, t: 0 };
  }

  // Statics, so the debug door can report without a live run.
  Game.skillIds = function () { return SKILL_ORDER.slice(); };
  Game.skillUnlocked = function (id) { return unlocked(id); };
  Game.skillPick = function () {
    for (const id of SKILL_ORDER) if (unlocked(id) && defOf(id)) return id;
    return null;
  };

  Game.prototype.grantSkill = function () {
    const id = Game.skillPick();
    return id ? build(id) : null;
  };

  // Debug only: force the live run's skill. Builds the same shape the
  // constructor builds and touches nothing on the save.
  Game.prototype.setSkill = function (id) {
    if (id == null) { this.skill = null; return null; }
    const s = build(id);
    if (!s) return null;
    this.skill = s;
    return s;
  };

  // ----------------------------------------------------------- HUD hooks ---
  // Deliberately shaped like dodgeReady and dodgeCdFrac in dodge.js.

  Game.prototype.skillInfo = function () {
    const s = this.skill;
    if (!s) return null;
    const def = s.def || {};
    return { id: s.id, name: def.name || s.id, icon: def.icon || 'knives' };
  };

  Game.prototype.skillReady = function () {
    const s = this.skill;
    return (s && s.t <= 0) ? 1 : 0;
  };

  Game.prototype.skillCdFrac = function () {
    const s = this.skill;
    if (!s) return 1;
    if (s.t <= 0) return 1;
    const cd = s.cd || SKILL_CD[s.id] || 12;
    return 1 - s.t / cd;
  };

  // ---------------------------------------------------------------- tick ---

  Game.prototype.updateSkill = function (dt) {
    const p = this.player;
    const dashing = p.dashT > 0;

    // Ember Drag hooks the dash from out here, because dodge.js owns the dash
    // and is not this unit's file. updateDodge already ran this frame, so a
    // dash that started this frame is visible right now as p.dashT > 0.
    if (dashing && !this._wasDashing) {
      if (p.emberArm > 0) {
        p.emberArm = 0;
        this._emberDash = true;
        this.dropEmberNode(p.x, p.y, true);
      }
    }
    if (!dashing) this._emberDash = false;
    this._wasDashing = dashing;
    if (this._emberDash && dashing) this.dropEmberNode(p.x, p.y, false);

    this.updateEmberTrail(dt);

    // timers. The armed window is ticked after the edge check, so a dash that
    // starts on the very frame it lapses still lights.
    if (p.emberArm > 0) p.emberArm = Math.max(0, p.emberArm - dt);
    if (p.hasteT > 0) {
      p.hasteT = Math.max(0, p.hasteT - dt);
      this._hasteSpark = (this._hasteSpark || 0) - dt;
      const movingNow = p.in && (p.in.moveX !== 0 || p.in.moveY !== 0);
      if (movingNow && this._hasteSpark <= 0 && this.parts.length < PART_CAP) {
        this._hasteSpark = 0.05;
        this.parts.push({
          kind: 'spark', x: p.x + rand(-5, 5), y: p.y + rand(-2, 8),
          vx: rand(-16, 16), vy: -rand(8, 34),
          t: 0, life: rand(0.18, 0.36), size: rand(1.1, 2), color: '#f4c542',
        });
      }
    }

    const s = this.skill;
    if (s && s.t > 0) s.t = Math.max(0, s.t - dt);

    if (p.in && p.in.skill) this.fireSkill();
  };

  // --------------------------------------------------------- the trigger ---

  Game.prototype.fireSkill = function () {
    const s = this.skill;
    if (!s) return false;
    if (this.phase !== 'play') return false;
    if (s.t > 0) return false;

    let fired = false;
    if (s.id === 'emberdrag') fired = this.fireEmberDrag();
    else if (s.id === 'fieldstrip') fired = this.fireFieldStrip();
    else if (s.id === 'reveille') fired = this.fireReveille();

    if (!fired) return false;
    s.t = s.cd;                 // the cooldown starts the moment it fires
    return true;
  };

  // Ember Drag: firing does not make fire, it arms the next dash. Arming is
  // the cost, so a window that lapses unused still spent the cooldown.
  Game.prototype.fireEmberDrag = function () {
    const p = this.player;
    p.emberArm = ARM_WINDOW;
    this.spawnPuff(p.x, p.y, 6);
    AudioSys.play('flame');
    return true;
  };

  // Field Strip: unspent Cookie Money straight into hit points. Refuses, and
  // charges nothing, when there is no money or no wound to spend it on.
  Game.prototype.fireFieldStrip = function () {
    const p = this.player;
    const n = Math.min(STRIP_MAX, Math.floor(this.coins), Math.ceil(p.maxhp - p.hp));
    if (!(n > 0)) return false;
    this.coins -= n;
    p.hp = Math.min(p.maxhp, p.hp + n);
    this.spawnNum(p.x, p.y - 26, '+' + n, '#7ec87e', true);
    this.toast('FIELD STRIP  ' + n + ' COOKIE MONEY', '#7ec87e');
    AudioSys.play('heal');
    this.spawnBurst(p.x, p.y, '#7ec87e', 16);
    this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.45, size: 70 });
    return true;
  };

  // Reveille: one blast, everything that is not a boss stops, and the bugler
  // gets a couple of seconds to be somewhere else.
  Game.prototype.fireReveille = function () {
    const p = this.player;
    // A shout, not a weapon: it carries no damage and no traits, so it is not
    // armed. Its exclusion set is spelled fhit because updateRings reads the
    // one field registry name for every ring in the game.
    const st = this.statsOf(p);
    this.rings.push({
      x: p.x, y: p.y, r: 14, max: Math.min(Stats.RANGE_CAP, 340 * st.area), speed: 560,
      dmg: 0, knock: 90, stun: REVEILLE_STUN * st.effectDuration, fhit: new Set(),
      owner: p, oid: p.eid, eid: this.nextId++,
    });
    p.hasteT = REVEILLE_HASTE;
    AudioSys.play('bugle');
    this.shakeAdd(4);
    this.spawnBurst(p.x, p.y, '#f4c542', 14);
    this.parts.push({ kind: 'ring', x: p.x, y: p.y - 8, t: 0, life: 0.5, size: 90 });
    this.toast('REVEILLE', '#f4c542');
    return true;
  };

  // ---------------------------------------------------------- the burning ---

  // One patch of burning ground. Spacing is measured against the last node so
  // the lane is even however fast the dash is going.
  Game.prototype.dropEmberNode = function (x, y, force) {
    const trail = this.emberTrail || (this.emberTrail = []);
    if (!force && trail.length) {
      const last = trail[trail.length - 1];
      if (dist2(last.x, last.y, x, y) < NODE_GAP * NODE_GAP) return;
    }
    if (trail.length >= TRAIL_MAX) trail.shift();
    // The room a patch was lit in. Every room is built around the origin, so
    // without this a lane lit on the way to a door would freeze through the
    // transition (nothing ticks outside the play phase) and light up again at
    // the same coordinates in the next room. Burning ground belongs to the
    // floor it was burned into.
    trail.push({
      x, y, t: 0, life: NODE_LIFE, r: NODE_R, tick: 0, room: this.room || null,
      owner: this.player, oid: this.player.eid, eid: this.nextId++,
    });
    if (this.parts.length < PART_CAP) {
      this.parts.push({ kind: 'ring', x, y, t: 0, life: 0.35, size: NODE_R * 1.1 });
    }
  };

  Game.prototype.updateEmberTrail = function (dt) {
    const trail = this.emberTrail;
    if (!trail || !trail.length) return;
    // The whole lane emits at about the same rate whatever its length, so a
    // long drag is a long fire rather than a brighter one.
    const emit = Math.min(1, (EMBER_RATE / trail.length) * dt);
    for (let i = trail.length - 1; i >= 0; i--) {
      const nd = trail[i];
      nd.t += dt;
      if (nd.t >= nd.life || nd.room !== (this.room || null)) { trail.splice(i, 1); continue; }

      nd.tick -= dt;
      if (nd.tick <= 0) {
        nd.tick += NODE_TICK;
        const hits = this.queryEnemies(nd.x, nd.y, nd.r, true);
        for (const e of hits) {
          // applyBurn is written for critters; dealDamage routes props to
          // damageProp on its own, so the second call is safe for both.
          if (!e.prop) this.applyBurn(e, NODE_BURN_DPS, NODE_BURN_DUR * this.statsOf(nd.owner).effectDuration);
          this.dealDamage(e, NODE_DMG, { small: true, quiet: true, noCrit: true, color: '#ffb347', owner: nd.owner });
        }
      }

      if (this.parts.length < PART_CAP && Math.random() < emit) {
        const a = rand(0, TAU), rr = Math.sqrt(Math.random()) * nd.r;
        this.parts.push({
          kind: 'ember', x: nd.x + Math.cos(a) * rr, y: nd.y + Math.sin(a) * rr,
          vx: rand(-12, 12), vy: -rand(14, 40),
          t: 0, life: rand(0.35, 0.7), size: rand(1.3, 2.6),
        });
      }
    }
  };

})();

// ------------------------------------------------------- the night, written
// A run is nineteen minutes on a good night, and a closed tab used to cost
// all of it. These two are the whole of what the game itself hands to the
// save and takes back from it: run.js owns the plan, the cursor and the file,
// this owns the scout. Nothing here writes storage or reads it.
(function () {
  function num(v, fallback) {
    return (typeof v === 'number' && isFinite(v)) ? v : fallback;
  }

  // What the scout is carrying at a room boundary. Read before the room is
  // entered, so a rest stop's comfort and a cache's haul land once when the
  // night is continued instead of once per continue.
  // One scout's whole build, as a count vector over a fixed id list with no
  // object reference anywhere in it (COOP_DESIGN.md C15). Twenty six item ids
  // is about 350 bytes, which is what makes this cheap enough to send at
  // every room boundary. The compiled trait sets are NOT here: they are
  // derived from these ids by rebuildTraits, and a save that stored a
  // compiled set would be a save that could not survive a balance change.
  function buildOut(owner) {
    const items = [];
    const b = owner && owner.build;
    if (b && Array.isArray(b.items)) {
      for (const id of b.items) if (typeof id === 'string' && id) items.push(id);
    }
    // The stat block's stack counts: a COUNT VECTOR over the nineteen fixed
    // stat keys, which is what makes a whole build a few hundred bytes with no
    // object reference in it (C15). Only non-zero entries are written, and an
    // unknown key on the way back in is dropped rather than trusted, exactly
    // as an unknown item id is.
    const stacks = {};
    const g = b && b.grants;
    if (g && g.stacks) {
      for (const k of Stats.KEYS) {
        const n = g.stacks[k] | 0;
        if (n > 0) stacks[k] = n;
      }
    }
    return { items, stacks };
  }

  Game.prototype.snapshot = function () {
    const p = this.player || {};
    const weapons = [];
    for (const w of this.weapons || []) {
      if (w && w.id) weapons.push({ id: w.id, lvl: Math.max(1, w.lvl | 0) });
    }
    if (!weapons.length) return null;
    const passives = {};
    for (const id in (this.passives || {})) {
      const r = this.passives[id] | 0;
      if (r > 0) passives[id] = r;
    }
    const s = this.skill;
    // THE SAVE IS A LIST OF BUILDS, NOT A BUILD (C16). One entry today, one
    // per scout the night an extra scout exists, and restore already walks it
    // as a list. The flat fields below it stay where they are because
    // js/run.js:285-291 validates weapons and passives at the top level of
    // this object and js/run.js belongs to unit S4; the day it moves, the
    // rest of the scout moves into this array beside the items.
    const builds = [];
    for (const pl of (this.players || [])) builds.push(buildOut(pl));
    // The night's feat counters live on META while you play and are only
    // banked at the end, so they ride along here or a continued night forgets
    // everything it set alight.
    const c = (typeof META !== 'undefined' && META && META.counters) ? META.counters : null;
    return {
      charId: this.charId,
      level: this.level | 0,
      xp: num(this.xp, 0),
      xpNext: num(this.xpNext, 0),
      pendingLevelups: this.pendingLevelups | 0,
      coins: num(this.coins, 0),
      badges: num(this.badges, 0),
      kills: this.kills | 0,
      time: num(this.time, 0),
      hp: num(p.hp, 0),
      maxhp: num(p.maxhp, 0),
      // Where the scout is standing at the swap, which is still the last
      // room's floor. The next room is built around them (spawn points reject
      // anything too close to the player), so the same coordinates have to go
      // back or the room rebuilds itself slightly differently.
      px: num(p.x, 0),
      py: num(p.y, 0),
      revived: !!this.revived,
      act: this.act | 0,
      roomIdx: this.roomIdx | 0,
      threat: num(this._threat, null),
      bossSpawned: Array.isArray(this.bossSpawned) ? this.bossSpawned.slice() : null,
      weapons,
      passives,
      builds,
      skill: s && s.id ? { id: s.id, t: Math.max(0, num(s.t, 0)) } : null,
      counters: c ? { burned: c.burned | 0, lowHpTime: Math.round(num(c.lowHpTime, 0) * 10) / 10 } : null,
    };
  };

  // The other direction. Anything the build no longer has a definition for
  // answers null and the caller throws the save away: half a scout is worse
  // than starting the night again.
  Game.restore = function (s) {
    // A list of length one, or the single entry itself: both are accepted,
    // because a save that is a list of builds has to be readable by a caller
    // that only knows about one scout (C16).
    if (Array.isArray(s)) s = s.length ? s[0] : null;
    if (!s || typeof s !== 'object') return null;
    if (typeof DATA === 'undefined' || !DATA || !DATA.characters) return null;
    // The builds this save carries. A save written before the list existed
    // has its scout at the top level, and lands on the same array.
    const builds = Array.isArray(s.builds) ? s.builds : [s];
    if (!builds.length) return null;
    const id = s.charId;
    if (typeof id !== 'string' || !DATA.characters[id]) return null;
    if (!Array.isArray(s.weapons) || !s.weapons.length) return null;
    for (const w of s.weapons) if (!w || !DATA.weapons[w.id]) return null;
    if (s.passives && typeof s.passives === 'object') {
      for (const pid in s.passives) if (!DATA.passives[pid]) return null;
    }
    // Item ids are validated exactly the way a weapon id, a patch id and a
    // boss id already are (js/run.js:299-307 for the boss): a snapshot naming
    // an item this build no longer ships is a snapshot we decline, whole.
    // Half a scout is worse than starting the night again, and an item that
    // silently vanished would be a build the player did not choose.
    for (const b of builds) {
      if (!b || typeof b !== 'object') return null;
      if (b.items === undefined || b.items === null) continue;
      if (!Array.isArray(b.items)) return null;
      for (const iid of b.items) {
        if (typeof iid !== 'string' || !DATA.relics || !DATA.relics[iid]) return null;
      }
    }

    let g = null;
    try { g = new Game(id); } catch (e) { return null; }

    // The build, back on the scout it belongs to: the same ids in the same
    // order, so the trait sets recompile to the same thing and the hooks
    // register in the same order they were picked up in.
    for (let i = 0; i < builds.length && i < g.players.length; i++) {
      const held = builds[i].items;
      if (Array.isArray(held)) {
        for (const iid of held) g.addItem(g.players[i], iid);
      }
      // The stack counts back onto the block. A key this build no longer
      // ships is dropped rather than restored, because the alternative is a
      // stat nobody can name feeding a number nobody can find.
      const sv = builds[i].stacks;
      if (sv && typeof sv === 'object') {
        const dst = g.players[i].build.grants.stacks;
        for (const k of Stats.KEYS) {
          const n = sv[k] | 0;
          if (n > 0) dst[k] = n;
        }
      }
    }

    // Gear, exactly as it stood: the same ids at the same levels, with the
    // stat block recomputed rather than trusted from the file.
    const maxLvl = (typeof DATA.WEAPON_MAX === 'number') ? DATA.WEAPON_MAX : 5;
    g.weapons.length = 0;
    for (const w of s.weapons) {
      g.addWeapon(w.id);
      const held = g.weapons[g.weapons.length - 1];
      held.lvl = Math.max(1, Math.min(maxLvl, w.lvl | 0));
      held.stats = g.computeWeaponStats(w.id, held.lvl);
    }
    g.passives = {};
    if (s.passives && typeof s.passives === 'object') {
      for (const pid in s.passives) {
        const def = DATA.passives[pid];
        const r = Math.max(0, Math.min(def.max | 0, s.passives[pid] | 0));
        if (r > 0) g.passives[pid] = r;
      }
    }
    g.recalc();

    g.level = Math.max(1, s.level | 0);
    g.xp = Math.max(0, num(s.xp, 0));
    const nxt = num(s.xpNext, 0);
    g.xpNext = nxt > 0 ? nxt : DATA.xpNext(g.level);
    // Head Start already banked its rank ups when the night began, so the
    // stored count replaces the constructor's rather than adding to it.
    g.pendingLevelups = Math.max(0, s.pendingLevelups | 0);
    g.coins = Math.max(0, num(s.coins, 0));
    g.badges = Math.max(0, num(s.badges, 0));
    g.kills = Math.max(0, s.kills | 0);
    g.time = Math.max(0, num(s.time, 0));
    g.revived = !!s.revived;
    g.act = Math.max(1, s.act | 0);
    g.roomIdx = Math.max(0, s.roomIdx | 0);
    if (typeof s.threat === 'number' && isFinite(s.threat)) g._threat = s.threat;
    if (Array.isArray(s.bossSpawned)) {
      for (let i = 0; i < g.bossSpawned.length && i < s.bossSpawned.length; i++) {
        g.bossSpawned[i] = !!s.bossSpawned[i];
      }
    }

    const maxhp = num(s.maxhp, 0);
    // Through the same bound the live grants go through, so a save cannot
    // carry a health total the block would refuse.
    if (maxhp > 0) {
      g.player.maxhp = Stats.clampTo('maxHealth', maxhp, g._statFrame);
      if (g.player.build.stats) g.player.build.stats.maxHealth = g.player.maxhp;
    }
    const hp = num(s.hp, 0);
    g.player.hp = Math.max(1, Math.min(g.player.maxhp, hp > 0 ? hp : g.player.maxhp));
    g.player.x = num(s.px, g.player.x);
    g.player.y = num(s.py, g.player.y);

    // The skill on the button, and how much of its cooldown was still
    // burning. A skill this save has since lost keeps whatever the badge
    // board grants now, which is the same answer a fresh run would give.
    if (s.skill && typeof s.skill.id === 'string') {
      const set = (typeof g.setSkill === 'function') ? g.setSkill(s.skill.id) : null;
      if (set) set.t = Math.max(0, Math.min(set.cd || 0, num(s.skill.t, 0)));
    }

    // Feat counters only ever climb, so the night's total is taken as a floor.
    // Anything earned in camp since (a knocked birdhouse) is left alone.
    if (s.counters && typeof META !== 'undefined' && META && META.counters) {
      META.counters.burned = Math.max(META.counters.burned | 0, s.counters.burned | 0);
      META.counters.lowHpTime = Math.max(num(META.counters.lowHpTime, 0), num(s.counters.lowHpTime, 0));
    }

    return g;
  };
})();

// debug hooks (harmless in production, invaluable in test)
window.MBM = {
  get game() { return typeof App !== 'undefined' && App ? App.game : null; },
  skip(t) { if (App.game) App.game.time = t; },
  god() { if (App.game) App.game.player.god = !App.game.player.god; return App.game.player.god; },
  levelup() { if (App.game) App.game.gainXP(App.game.xpNext + 1); },
  warp(act, room) {
    // Debug: jump the live run to act N, room M (1 based), skipping the
    // rooms between. Clears each intermediate room bloodlessly.
    if (!App.game || typeof Run === 'undefined' || !Run.active) { console.log('warp needs a live room run'); return; }
    const g = App.game;
    let guard = 0;
    while ((Run.act < act || (Run.act === act && Run.roomIdx < room - 1)) && !Run.finished && guard++ < 40) {
      for (const e of g.enemies) if (!e.dead) g.killEnemy(e, true);
      g.enemies.length = 0;
      // Warp skips the transition, so it must also do the transition's
      // sweeping or skipped rooms pile their props into the destination.
      g.props.length = 0; g.zones.length = 0; g.gems.length = 0;
      g.pickups.length = 0; g.shots.length = 0; g.eshots.length = 0;
      const door = (g.room && g.room.doors && g.room.doors[0]) || null;
      Run.advance(door);
    }
    g.player.x = g.room && g.room.entryPoint ? g.room.entryPoint.x : g.player.x;
    g.player.y = g.room && g.room.entryPoint ? g.room.entryPoint.y : g.player.y;
    console.log('warped to act ' + Run.act + ' room ' + (Run.roomIdx + 1));
  },
  clear() {
    if (!App.game) return;
    for (const e of App.game.enemies) {
      if (!e.boss && !e.dead) App.game.killEnemy(e, true);
    }
  },
  coins(n) { if (App.game) App.game.gainCoins(n); },
  skill(id) {
    // Debug: hand the live run an active skill without earning its merit
    // badge first. Live game object only, nothing is written to the save.
    const g = this.game;
    if (!g) { console.log('skill needs a live run'); return null; }
    if (id == null) {
      console.log('skill(id) takes one of: ' + Game.skillIds().join(', ') +
        '. current: ' + (g.skill ? g.skill.id : 'none'));
      return g.skill ? g.skill.id : null;
    }
    const s = g.setSkill(id);
    if (!s) { console.log('no skill called ' + id + ', try: ' + Game.skillIds().join(', ')); return null; }
    console.log('skill set to ' + s.id + ' (' + (s.def.name || s.id) + '), cooldown ' + s.cd + 's, ready now');
    return s.id;
  },
  skills() {
    // Debug: what the badge board has actually opened, and what a fresh run
    // would therefore grant. Reads only.
    const ids = Game.skillIds();
    for (const id of ids) {
      console.log(id + ': ' + (Game.skillUnlocked(id) ? 'unlocked' : 'locked'));
    }
    const pick = Game.skillPick();
    console.log('a fresh run would grant: ' + (pick || 'nothing'));
    const g = this.game;
    if (g) console.log('this run is carrying: ' + (g.skill ? g.skill.id : 'nothing'));
    return pick;
  },
  find() {
    // Debug: hand over the next thing this act owes you, card and all.
    if (!App.game) { console.log('find needs a live run'); return null; }
    if (typeof Finds === 'undefined' || !Finds) { console.log('finds.js is not loaded'); return null; }
    const act = App.game.act || 1;
    const id = Finds.nextFor(act);
    if (!id) { console.log('act ' + act + ' has nothing left to find'); return null; }
    Finds.grant(App.game, id);
    console.log('found ' + id);
    return id;
  },
};
