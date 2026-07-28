// Merit Badge Massacre: the run. Which act, which room, which doors are on
// offer. Inert while the game is still one endless field.
'use strict';

const Run = {
  active: false,
  seed: 0,
  act: 1,
  roomIdx: 0,
  doors: [],
  begin(charId) {},
  advance(door) {},
  isBossRoom() { return false; },
};
