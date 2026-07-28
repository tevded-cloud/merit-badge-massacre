// Merit Badge Massacre: solid-geometry queries for the room system. Every
// function is a pass-through until the room unit lands, so the open field
// stays open.
'use strict';

const Collide = {
  resolveCircle(x, y, r, solids) { return { x, y }; },
  blockedAt(room, x, y) { return false; },
  segmentBlocked(room, x0, y0, x1, y1) { return null; },
  clampToBounds(x, y, r, b) { return { x, y }; },
};
