// Merit Badge Massacre: the wipe between rooms. Owns the 'transit' phase.
// Never active until a door is walked through.
'use strict';

const Transition = {
  active: false,
  start(g, door) {},
  update(g, dt) {},
  render(ctx, W, H) {},
};
