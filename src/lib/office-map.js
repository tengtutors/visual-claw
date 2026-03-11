export const MAP_W = 980;
export const MAP_H = 980;
export const TILE = 32;

const WALKABLE_AREAS = [
  { x: 230, y: 246, w: 520, h: 500 },
];

const COLLISION_RECTS = [
  { x: 258, y: 276, w: 154, h: 70 },
  { x: 590, y: 276, w: 136, h: 48 },
  { x: 284, y: 418, w: 108, h: 68 },
  { x: 468, y: 418, w: 108, h: 68 },
  { x: 662, y: 412, w: 100, h: 80 },
  { x: 284, y: 556, w: 108, h: 68 },
  { x: 468, y: 556, w: 108, h: 68 },
  { x: 662, y: 628, w: 100, h: 68 },
  { x: 692, y: 700, w: 78, h: 70 },
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
  work: { x: 218, y: 246, w: 530, h: 470 },
  meeting: { x: 218, y: 246, w: 530, h: 470 },
  rest: { x: 218, y: 246, w: 530, h: 470 },
  blocked: { x: 218, y: 246, w: 530, h: 470 },
};

export const ROOM_LABELS = [
  { id: 'work', text: 'Working', x: 420, y: 440 },
  { id: 'rest', text: 'Rest Zone', x: 615, y: 300 },
  { id: 'blocked', text: 'Blocked', x: 690, y: 640 },
];

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
  collisions: COLLISION_RECTS,
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
  return OFFICE_LAYOUT.collisions;
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
  work: [
    { x: 300, y: 610, direction: 'up', posture: 'desk' },
    { x: 305, y: 668, direction: 'up', posture: 'desk' },
    { x: 488, y: 668, direction: 'up', posture: 'desk' },
    { x: 690, y: 700, direction: 'up', posture: 'desk' },
    { x: 305, y: 782, direction: 'up', posture: 'desk' },
    { x: 488, y: 782, direction: 'up', posture: 'desk' },
    { x: 395, y: 500, direction: 'down', posture: 'idle' },
    { x: 575, y: 500, direction: 'down', posture: 'idle' },
  ],
  meeting: [
    { x: 294, y: 318, direction: 'right', posture: 'meeting' },
    { x: 350, y: 318, direction: 'left', posture: 'meeting' },
    { x: 294, y: 370, direction: 'down', posture: 'meeting' },
    { x: 350, y: 370, direction: 'down', posture: 'meeting' },
  ],
  rest: [
    { x: 612, y: 470, direction: 'down', posture: 'idle' },
    { x: 706, y: 470, direction: 'down', posture: 'idle' },
    { x: 612, y: 536, direction: 'up', posture: 'idle' },
    { x: 706, y: 536, direction: 'up', posture: 'idle' },
    { x: 568, y: 336, direction: 'right', posture: 'idle' },
    { x: 642, y: 336, direction: 'left', posture: 'idle' },
    { x: 610, y: 378, direction: 'right', posture: 'idle' },
    { x: 672, y: 378, direction: 'left', posture: 'idle' },
    { x: 610, y: 404, direction: 'down', posture: 'idle' },
    { x: 672, y: 404, direction: 'down', posture: 'idle' },
    { x: 430, y: 316, direction: 'up', posture: 'idle' },
    { x: 480, y: 316, direction: 'up', posture: 'idle' },
    { x: 300, y: 316, direction: 'up', posture: 'idle' },
    { x: 350, y: 316, direction: 'up', posture: 'idle' },
  ],
  blocked: [
    { x: 610, y: 690, direction: 'left', posture: 'blocked' },
    { x: 708, y: 690, direction: 'right', posture: 'blocked' },
    { x: 610, y: 744, direction: 'left', posture: 'blocked' },
    { x: 708, y: 744, direction: 'right', posture: 'blocked' },
  ],
  fallback: [
    { x: 286, y: 660, direction: 'down', posture: 'idle' },
    { x: 394, y: 650, direction: 'down', posture: 'idle' },
    { x: 512, y: 648, direction: 'down', posture: 'idle' },
    { x: 630, y: 648, direction: 'down', posture: 'idle' },
    { x: 520, y: 470, direction: 'down', posture: 'idle' },
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
