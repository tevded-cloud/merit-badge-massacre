// Merit Badge Massacre 3.0: the run event bus.
//
// The substrate's second half. traits.js lets an item change what a
// projectile IS; this file lets an item react to what the run DOES, without
// the reacting code having to live in the file where the thing happened.
//
// Nine events, one per natural call site the game already had. Every one of
// them is a place the engine was already doing something interesting and
// telling nobody about it: a critter dying, a scout being hit, a room
// opening its doors. An item registers a handler against an owner and a
// source id, the bus fires it in priority order, and the whole set goes when
// the night ends because the bus belongs to the night.
//
// THREE SHAPE DECISIONS, ALL OF THEM MADE HERE BECAUSE THEY ARE FREE NOW AND
// EXPENSIVE ONCE NINETY SIX ITEMS ARE AUTHORED AGAINST THEM.
//
//   1. EVERY EVENT CARRIES AN OWNER (COOP_DESIGN.md I1). A handler is told
//      who killed it, who was hurt, who picked it up. An event that nobody
//      owns (a room clearing, a boss crossing a phase cut) passes null, and
//      emit hands that handler its OWN owner instead, so a handler never has
//      to ask which build it belongs to.
//   2. THE REGISTRY IS KEYED BY OWNER AND SOURCE TOGETHER (I2). Two players
//      holding the same item register independently, and removing one
//      player's copy leaves the other player's copy alone. Removing by
//      source alone is the bug that shape prevents.
//   3. THE BUS IS AN OBJECT, NOT A MODULE (I3). Every Game owns its own, so
//      two Games in one page (a headless replay beside a live run, a desync
//      check) cannot write into each other's handler lists. Nothing here is
//      module level except the closed event list, which never changes.
//
// HOT PATH RULES. emit() must not allocate. That means:
//   - fixed arity: emit(ev, g, owner, a, b, c). No rest args, no spread, no
//     array of arguments, no options object built at the call site.
//   - no closures created per event. The handler record is built once, at
//     registration, and reused forever.
//   - an event with no handlers costs one property read and one length
//     compare, which is what makes it safe to emit from dealDamage.
//
// Payloads are positional and documented per event in TRAITS.md. A handler
// that needs to CHANGE something is handed a mutable options object as one
// of its positional args (this is how onDodge lets an item lengthen a dash
// before the dash integrates); a handler that is only being told something
// is handed values.
'use strict';

const Hooks = (function () {

  // The closed list. An event that is not in here is a typo, and on() says so
  // out loud rather than silently registering a handler that never fires.
  const EVENTS = [
    'onRunStart',    // (g, owner)                     a night begins, build is empty
    'onLevelUp',     // (g, owner, level)              a rank was gained
    'onHit',         // (g, owner, enemy, dmg, shot)   player damage landed, shot may be null
    'onKill',        // (g, owner, enemy)              a body went down
    'onDamaged',     // (g, owner, taken, kind)        the scout took a hit
    'onDodge',       // (g, owner, opt)                a dash is about to integrate, opt is MUTABLE
    'onPickup',      // (g, owner, type, value)        'gem' | 'cocoa' | 'magnet' | 'chest'
    'onRoomClear',   // (g, owner, room)               doors just opened, owner is null
    'onBossPhase',   // (g, owner, enemy, phase)       a boss crossed a phase cut, owner is null
  ];

  // Lower priority runs first. Ties break on registration order, so a set of
  // handlers authored at the same priority fires in the order the items were
  // picked up, which is the order a player would expect.
  function byPri(a, b) { return (a.pri - b.pri) || (a.seq - b.seq); }

  function Bus() {
    this.lists = {};
    for (let i = 0; i < EVENTS.length; i++) this.lists[EVENTS[i]] = [];
    this.seq = 0;
  }

  // Register. owner is the player whose build is paying for this handler and
  // src is the id it registers under (an item id, a character id, 'debug').
  // The pair is what off() removes by.
  Bus.prototype.on = function (ev, owner, src, pri, fn) {
    const l = this.lists[ev];
    if (l === undefined) {
      if (typeof console !== 'undefined') console.warn('Hooks.on: unknown event ' + ev);
      return false;
    }
    if (typeof fn !== 'function') return false;
    l.push({ owner: owner || null, src: src || 'anon', pri: pri || 0, seq: this.seq++, fn: fn });
    l.sort(byPri);
    return true;
  };

  // Everything one owner registered under one source, gone. Used by the
  // removal path when an item leaves a build. A null owner means "whoever
  // holds it", which is what a debug console wants and what a party wipe
  // wants; a real owner only ever takes its own handlers off.
  Bus.prototype.off = function (owner, src) {
    for (let i = 0; i < EVENTS.length; i++) {
      const l = this.lists[EVENTS[i]];
      for (let j = l.length - 1; j >= 0; j--) {
        if (l[j].src !== src) continue;
        if (owner !== null && owner !== undefined && l[j].owner !== owner) continue;
        l.splice(j, 1);
      }
    }
  };

  // A night ends. Nothing this run registered survives.
  Bus.prototype.clear = function () {
    for (let i = 0; i < EVENTS.length; i++) this.lists[EVENTS[i]].length = 0;
    this.seq = 0;
  };

  Bus.prototype.count = function (ev) {
    const l = this.lists[ev];
    return l === undefined ? 0 : l.length;
  };

  // The hot path. Allocates nothing. A handler that throws is reported and
  // skipped: one bad item must never take the frame down with it.
  //
  // owner === null means the event belongs to the world rather than to a
  // player, and every handler is then handed the owner it registered under.
  // That one compare is what lets an item react to a room clearing without
  // the bus having to invent an owner for the room.
  Bus.prototype.emit = function (ev, g, owner, a, b, c) {
    const l = this.lists[ev];
    if (l === undefined) return;
    const n = l.length;
    if (n === 0) return;
    for (let i = 0; i < n; i++) {
      const h = l[i];
      try {
        h.fn(g, owner === null || owner === undefined ? h.owner : owner, a, b, c);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error('Hooks: ' + ev + ' handler from ' + h.src + ' threw', err);
        }
      }
    }
  };

  return {
    EVENTS: EVENTS,
    // One bus per Game. See shape decision 3 at the top of this file.
    create() { return new Bus(); },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Hooks;
