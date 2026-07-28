// Merit Badge Massacre: who you can play as. Max is free. The rest of the
// troop is asleep by the tents until you earn the right to wake them.
'use strict';

// cond() is checked against META whenever the camp asks. Feat based conditions
// (marshmallows burned, a night survived under ten hit points) swap in here
// once those counters exist in META; the shape of an entry does not change.
const ROSTER = {
  max: { free: true },
  junie: {
    free: false,
    cond: () => META.lifetime >= 150 || META.dawns >= 1,
    hint: 'Earn 150 lifetime badges, or see one dawn.',
  },
  gus: {
    free: false,
    cond: () => META.lifetime >= 400,
    hint: 'Bank 400 lifetime badges.',
  },
};

const Roster = {
  meta() { return typeof META !== 'undefined' ? META : null; },

  isUnlocked(id) {
    const r = ROSTER[id];
    if (!r) return false;
    if (r.free) return true;
    const m = this.meta();
    return !!(m && Array.isArray(m.unlocked) && m.unlocked.indexOf(id) !== -1);
  },

  // Wakes anyone whose condition is now met. Returns the ids gained this call,
  // so the caller can announce them. Safe to call as often as you like.
  checkUnlocks() {
    const gained = [];
    const m = this.meta();
    if (!m) return gained;
    if (!Array.isArray(m.unlocked)) m.unlocked = [];
    for (const id of Object.keys(ROSTER)) {
      const r = ROSTER[id];
      if (r.free || m.unlocked.indexOf(id) !== -1) continue;
      let ok = false;
      try { ok = !!(r.cond && r.cond()); } catch (e) { ok = false; }
      if (!ok) continue;
      m.unlocked.push(id);
      gained.push(id);
    }
    if (gained.length && typeof m.save === 'function') m.save();
    return gained;
  },

  hint(id) {
    const r = ROSTER[id];
    return (r && r.hint) || 'Not tonight.';
  },
};
