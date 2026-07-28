// Merit Badge Massacre: one room instance. The bounds below match the open
// field the 1.0 game already plays in, and a room that is born cleared never
// gates anything.
'use strict';

class Room {
  constructor(def, rng) {
    this.def = def || null;
    this.bounds = { x0: -950, y0: -650, x1: 950, y1: 650 };
    this.solids = [];
    this.doors = [];
    this.state = 'cleared';
  }

  update(g, dt) {}

  isClear(g) { return true; }

  unbake(prop) {}
}

(function () {
  Game.prototype.renderDoor = function (ctx, door) {};
})();
