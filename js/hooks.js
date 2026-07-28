// Merit Badge Massacre 3.0: the run event bus.
//
// The substrate's second half. traits.js lets an item change what a
// projectile IS; this file lets an item react to what the run DOES, without
// the reacting code having to live in the file where the thing happened.
//
// Nine events, one per natural call site the game already had. Every one of
// them is a place the engine was already doing something interesting and
// telling nobody about it: a critter dying, a scout being hit, a room
// opening its doors. An item registers a handler against a source id, the
// bus fires it in priority order, and the whole set is cleared when a night
// begins so nothing leaks between runs.
//
// HOT PATH RULES. emit() must not allocate. That means:
//   - fixed arity: emit(ev, g, a, b, c). No rest args, no spread, no array
//     of arguments, no options object built at the call site.
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
    'onRunStart',    // (g)                       a night begins, build is empty
    'onLevelUp',     // (g, level)                a rank was gained
    'onHit',         // (g, enemy, dmg, shot)     player damage landed, shot may be null
    'onKill',        // (g, enemy)                a body went down
    'onDamaged',     // (g, taken, kind)          the scout took a hit
    'onDodge',       // (g, player, opt)          a dash is about to integrate, opt is MUTABLE
    'onPickup',      // (g, type, value)          'gem' | 'cocoa' | 'magnet' | 'chest'
    'onRoomClear',   // (g, room)                 doors just opened
    'onBossPhase',   // (g, enemy, phase)         a boss crossed a phase cut
  ];

  const lists = {};
  for (let i = 0; i < EVENTS.length; i++) lists[EVENTS[i]] = [];

  // Lower priority runs first. Ties break on registration order, so a set of
  // handlers authored at the same priority fires in the order the items were
  // picked up, which is the order a player would expect.
  let seq = 0;
  function byPri(a, b) { return (a.pri - b.pri) || (a.seq - b.seq); }

  return {
    EVENTS: EVENTS,

    // Register. src is the id of whatever is registering (an item id, a
    // character id, 'debug'), and it is what off() removes by.
    on(ev, src, pri, fn) {
      const l = lists[ev];
      if (l === undefined) {
        if (typeof console !== 'undefined') console.warn('Hooks.on: unknown event ' + ev);
        return false;
      }
      if (typeof fn !== 'function') return false;
      l.push({ src: src || 'anon', pri: pri || 0, seq: seq++, fn: fn });
      l.sort(byPri);
      return true;
    },

    // Everything one source registered, gone. Used when an item is removed
    // and by clear() at the top of a night.
    off(src) {
      for (let i = 0; i < EVENTS.length; i++) {
        const l = lists[EVENTS[i]];
        for (let j = l.length - 1; j >= 0; j--) {
          if (l[j].src === src) l.splice(j, 1);
        }
      }
    },

    // A night begins. Nothing an old run registered survives this.
    clear() {
      for (let i = 0; i < EVENTS.length; i++) lists[EVENTS[i]].length = 0;
      seq = 0;
    },

    count(ev) {
      const l = lists[ev];
      return l === undefined ? 0 : l.length;
    },

    // The hot path. Allocates nothing. A handler that throws is reported and
    // skipped: one bad item must never take the frame down with it.
    emit(ev, g, a, b, c) {
      const l = lists[ev];
      if (l === undefined) return;
      const n = l.length;
      if (n === 0) return;
      for (let i = 0; i < n; i++) {
        const h = l[i];
        try {
          h.fn(g, a, b, c);
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('Hooks: ' + ev + ' handler from ' + h.src + ' threw', err);
          }
        }
      }
    },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Hooks;
