// Merit Badge Massacre: who you can play as. The three starters are always
// unlocked; META keeps anything earned later.
'use strict';

const ROSTER = {
  max: { unlocked: true },
  junie: { unlocked: true },
  gus: { unlocked: true },
};

const Roster = {
  isUnlocked(id) {
    const r = ROSTER[id];
    return !!(r && r.unlocked) || !!(window.META && META.unlocked && META.unlocked.includes(id));
  },
  checkUnlocks() { return []; },
};
