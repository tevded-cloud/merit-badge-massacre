// Merit Badge Massacre: the music layer. AudioSys still owns every sound the
// 1.0 game makes; this takes over when the tracks land.
'use strict';

const Music = {
  state: 'silence',
  load(g) { return Promise.resolve(); },
  goto(id, o) {},
  setHeat(h) {},
  setPhase(n) {},
  stinger(id, o) {},
  stop(o) {},
};
