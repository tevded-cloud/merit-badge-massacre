// Merit Badge Massacre: the room catalogue. Room kinds, the per-act running
// order, and the wave tables the combat rooms draw from. Empty until the
// content units fill them.
'use strict';

const ROOMS = {
  combat: {},
  elite: {},
  puzzle: {},
  lore: {},
  shop: {},
  loot: {},
  rest: {},
  miniboss: {},
  boss: {},
  secret: {},
};

const ACT_TEMPLATES = [];

const WAVE_TEMPLATES = {};
