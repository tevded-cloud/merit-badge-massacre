// Merit Badge Massacre: solid-geometry queries for the room system. Pure
// math against AABBs and the room's blocked-cell grid, no game state and no
// globals besides Collide itself.
'use strict';

function closestPointOnBox(x, y, box) {
  const cx = Math.max(box.x0, Math.min(x, box.x1));
  const cy = Math.max(box.y0, Math.min(y, box.y1));
  return { x: cx, y: cy };
}

function pushCircleOutOfBox(x, y, r, box) {
  const closest = closestPointOnBox(x, y, box);
  const dx = x - closest.x;
  const dy = y - closest.y;
  const distSq = dx * dx + dy * dy;

  if (distSq > 0) {
    if (distSq >= r * r) return { x, y };
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const push = r - dist;
    return { x: x + nx * push, y: y + ny * push };
  }

  // Center is inside the box (or exactly on its edge), so there is no
  // gradient to push along. Escape along whichever side is nearest.
  const leftPen = x - box.x0;
  const rightPen = box.x1 - x;
  const topPen = y - box.y0;
  const bottomPen = box.y1 - y;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

  if (minPen === leftPen) return { x: box.x0 - r, y };
  if (minPen === rightPen) return { x: box.x1 + r, y };
  if (minPen === topPen) return { x, y: box.y0 - r };
  return { x, y: box.y1 + r };
}

const Collide = {
  resolveCircle(x, y, r, solids) {
    if (!solids || !solids.length) return { x, y };

    let px = x;
    let py = y;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < solids.length; i++) {
        const pushed = pushCircleOutOfBox(px, py, r, solids[i]);
        px = pushed.x;
        py = pushed.y;
      }
    }
    return { x: px, y: py };
  },

  blockedAt(room, x, y) {
    if (!room || !room.grid) return false;

    const bounds = room.bounds;
    if (bounds && (x < bounds.x0 || x > bounds.x1 || y < bounds.y0 || y > bounds.y1)) {
      return true;
    }

    const grid = room.grid;
    let gx = Math.floor((x - grid.x0) / grid.cell);
    let gy = Math.floor((y - grid.y0) / grid.cell);
    gx = Math.max(0, Math.min(grid.cw - 1, gx));
    gy = Math.max(0, Math.min(grid.ch - 1, gy));
    return grid.data[gy * grid.cw + gx] !== 0;
  },

  segmentBlocked(room, x0, y0, x1, y1) {
    if (!room) return null;

    const cell = room.grid && room.grid.cell ? room.grid.cell : null;
    const step = cell ? cell / 2 : 18;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      return Collide.blockedAt(room, x0, y0) ? { x: x0, y: y0 } : null;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    let traveled = 0;
    while (traveled < dist) {
      const x = x0 + nx * traveled;
      const y = y0 + ny * traveled;
      if (Collide.blockedAt(room, x, y)) return { x, y };
      traveled += step;
    }

    if (Collide.blockedAt(room, x1, y1)) return { x: x1, y: y1 };
    return null;
  },

  clampToBounds(x, y, r, b) {
    if (!b) return { x, y };

    const minX = b.x0 + r;
    const maxX = b.x1 - r;
    const minY = b.y0 + r;
    const maxY = b.y1 - r;
    const cx = minX <= maxX ? Math.max(minX, Math.min(maxX, x)) : (b.x0 + b.x1) / 2;
    const cy = minY <= maxY ? Math.max(minY, Math.min(maxY, y)) : (b.y0 + b.y1) / 2;
    return { x: cx, y: cy };
  },
};
