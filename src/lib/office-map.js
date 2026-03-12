import { getFurnitureCollisions } from './tile-map.js';

export const MAP_W = 980;
export const MAP_H = 980;
export const TILE = 32;

const WALKABLE_AREAS = [
  { x: 178, y: 246, w: 620, h: 550 },
];

const SPOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: -18, y: 10 },
  { x: 18, y: 10 },
  { x: 0, y: 22 },
  { x: -12, y: 18 },
  { x: 12, y: 18 },
];

export const ZONE_BOUNDS = {
  work: { x: 230, y: 550, w: 500, h: 200 },
  meeting: { x: 300, y: 246, w: 300, h: 200 },
  rest: { x: 400, y: 246, w: 350, h: 200 },
  blocked: { x: 230, y: 400, w: 250, h: 250 },
};

export const ROOM_LABELS = [];

export const ZONE_LABELS = Object.fromEntries(ROOM_LABELS.map((label) => [label.id, {
  x: label.x,
  y: label.y,
  label: label.text,
  color: '#fff7ed',
  bg: '#2f2626',
}]));

export const OFFICE_LAYOUT = {
  rooms: [
    {
      id: 'work',
      mode: 'image',
      x: 40,
      y: 40,
      w: 900,
      h: 900,
      tint: '#6b5a56',
      art: { asset: 'Office Level 2.png', x: 115, y: 46, scale: 1.95 },
      walkableInset: { left: 120, right: 120, top: 120, bottom: 120 },
    },
  ],
  props: [],
  collisions: [],
};

export const FURNITURE = OFFICE_LAYOUT.props;

function getRoom() {
  return OFFICE_LAYOUT.rooms[0];
}

export function getWalkableBounds() {
  const room = getRoom();
  const inset = room.walkableInset;
  return {
    x: room.x + inset.left,
    y: room.y + inset.top,
    w: room.w - inset.left - inset.right,
    h: room.h - inset.top - inset.bottom,
  };
}

export function getCollisionRects() {
  return getFurnitureCollisions();
}

function isInsideRect(x, y, rect, padding = 0) {
  return x >= rect.x - padding
    && x <= rect.x + rect.w + padding
    && y >= rect.y - padding
    && y <= rect.y + rect.h + padding;
}

function isInsideWalkableArea(x, y, padding = 0) {
  return WALKABLE_AREAS.some((rect) => isInsideRect(x, y, rect, -padding));
}

export function isWalkable(zone, x, y, padding = 8) {
  if (!isInsideWalkableArea(x, y, padding)) return false;
  return !getCollisionRects(zone).some((rect) => isInsideRect(x, y, rect, padding));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function clampToRect(rect, x, y, padding) {
  return {
    x: clamp(x, rect.x + padding, rect.x + rect.w - padding),
    y: clamp(y, rect.y + padding, rect.y + rect.h - padding),
  };
}

export function resolveWalkablePoint(zone, x, y, padding = 8) {
  let best = null;
  let bestDistance = Infinity;

  for (const area of WALKABLE_AREAS) {
    const candidate = clampToRect(area, x, y, padding);
    if (!isWalkable(zone, candidate.x, candidate.y, padding)) continue;
    const dist = distanceSquared(x, y, candidate.x, candidate.y);
    if (dist < bestDistance) {
      best = candidate;
      bestDistance = dist;
    }
  }

  if (best) return best;

  const bounds = getWalkableBounds(zone);
  return {
    x: clamp(x, bounds.x + padding, bounds.x + bounds.w - padding),
    y: clamp(y, bounds.y + padding, bounds.y + bounds.h - padding),
  };
}

export const ZONE_SPOTS = {
  // Working → near desks/computers (bottom area)
  work: [
    { x: 265, y: 660, direction: 'right', posture: 'desk' },
    { x: 479, y: 660, direction: 'right', posture: 'desk' },
    { x: 335, y: 660, direction: 'right', posture: 'desk' },
    { x: 549, y: 660, direction: 'right', posture: 'desk' },
    { x: 265, y: 620, direction: 'right', posture: 'desk' },
    { x: 479, y: 620, direction: 'right', posture: 'desk' },
    { x: 335, y: 620, direction: 'right', posture: 'desk' },
    { x: 549, y: 620, direction: 'right', posture: 'desk' },
  ],
  // Meeting → center area near coffee machine / paintings
  meeting: [
    { x: 400, y: 300, direction: 'down', posture: 'meeting' },
    { x: 450, y: 300, direction: 'down', posture: 'meeting' },
    { x: 400, y: 350, direction: 'right', posture: 'meeting' },
    { x: 450, y: 350, direction: 'left', posture: 'meeting' },
  ],
  // Idle/Rest → top-right near vending machine, water coolers
  rest: [
    { x: 629, y: 330, direction: 'up', posture: 'idle' },
    { x: 680, y: 330, direction: 'up', posture: 'idle' },
    { x: 629, y: 380, direction: 'right', posture: 'idle' },
    { x: 680, y: 380, direction: 'left', posture: 'idle' },
    { x: 629, y: 280, direction: 'up', posture: 'idle' },
    { x: 680, y: 280, direction: 'up', posture: 'idle' },
    { x: 580, y: 330, direction: 'right', posture: 'idle' },
    { x: 580, y: 380, direction: 'right', posture: 'idle' },
    { x: 710, y: 330, direction: 'left', posture: 'idle' },
    { x: 710, y: 380, direction: 'left', posture: 'idle' },
  ],
  // Blocked → near shelves/crates top-left
  blocked: [
    { x: 260, y: 580, direction: 'up', posture: 'blocked' },
    { x: 320, y: 580, direction: 'up', posture: 'blocked' },
    { x: 260, y: 630, direction: 'up', posture: 'blocked' },
    { x: 320, y: 630, direction: 'up', posture: 'blocked' },
    { x: 380, y: 580, direction: 'up', posture: 'blocked' },
    { x: 380, y: 630, direction: 'up', posture: 'blocked' },
  ],
  fallback: [
    { x: 400, y: 500, direction: 'down', posture: 'idle' },
    { x: 500, y: 500, direction: 'down', posture: 'idle' },
    { x: 600, y: 500, direction: 'down', posture: 'idle' },
    { x: 350, y: 600, direction: 'down', posture: 'idle' },
    { x: 500, y: 600, direction: 'down', posture: 'idle' },
  ],
};

function isOccupiedPoint(point, takenPositions, minGap = 68) {
  return takenPositions.some((p) => Math.abs(p.x - point.x) < minGap && Math.abs(p.y - point.y) < minGap);
}

function resolveSpot(zone, spot, padding = 8) {
  const point = resolveWalkablePoint(zone, spot.x, spot.y, padding);
  return {
    x: point.x,
    y: point.y,
    direction: spot.direction || 'down',
    posture: spot.posture || 'idle',
  };
}

export function pickSpot(zone, takenPositions) {
  const spots = ZONE_SPOTS[zone] || ZONE_SPOTS.work;
  for (const spot of spots) {
    for (const offset of SPOT_OFFSETS) {
      const resolved = resolveSpot(zone, { ...spot, x: spot.x + offset.x, y: spot.y + offset.y });
      if (!isOccupiedPoint(resolved, takenPositions)) return resolved;
    }
  }

  const base = spots[Math.floor(Math.random() * spots.length)];
  return resolveSpot(zone, base);
}

export function getWanderTarget(zone) {
  const spots = ZONE_SPOTS[zone] || ZONE_SPOTS.fallback || ZONE_SPOTS.work;
  const base = spots[Math.floor(Math.random() * spots.length)];
  return resolveSpot(zone, {
    ...base,
    x: base.x + (Math.random() - 0.5) * 12,
    y: base.y + (Math.random() - 0.5) * 12,
  });
}
