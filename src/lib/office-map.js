import { getFurnitureCollisions, getFurnitureObjects, TILE_SCALE, onLayoutChange } from './tile-map.js';

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

// ---------------------------------------------------------------------------
// Auto-derive zone spots from furniture categories
// ---------------------------------------------------------------------------
const CATEGORY_TO_ZONE = {
  // Work — desk/computer related furniture
  'Chair': 'work',
  'Chair Facing A': 'work',
  'Chair Facing B': 'work',
  'Chair Facing C': 'work',
  'Metal Table': 'work',
  'Laptop': 'work',
  'Small Screen B': 'work',
  'Old Computer': 'work',

  // Rest — relaxation / kitchen area
  'Sofa': 'rest',
  'Sofa B': 'rest',
  'Sofa Facing A': 'rest',
  'Sofa Facing B': 'rest',
  'Coffee Table': 'rest',
  'Wooden Table': 'rest',
  'Vending Machine': 'rest',
  'Fridge': 'rest',
  'Water Cooler': 'rest',
  'Water Cooler B': 'rest',

  // Meeting — presentation / collaboration
  'Blackboard': 'meeting',
  'Whiteboard A': 'meeting',
  'Whiteboard B': 'meeting',

  // Blocked — storage / obstacles
  'Crates': 'blocked',
  'Box Stack A': 'blocked',
  'Tall Shelf A': 'blocked',
  'Tall Shelf B': 'blocked',
  'Bookcase A': 'blocked',
  'Bookcase B': 'blocked',
};

const ZONE_POSTURE = {
  work: 'desk',
  rest: 'idle',
  meeting: 'meeting',
  blocked: 'blocked',
};

const FALLBACK_SPOTS = {
  work: [
    { x: 350, y: 600, direction: 'up', posture: 'desk' },
    { x: 450, y: 600, direction: 'up', posture: 'desk' },
  ],
  rest: [
    { x: 550, y: 350, direction: 'down', posture: 'idle' },
    { x: 600, y: 400, direction: 'left', posture: 'idle' },
  ],
  meeting: [
    { x: 400, y: 350, direction: 'down', posture: 'meeting' },
    { x: 450, y: 350, direction: 'down', posture: 'meeting' },
  ],
  blocked: [
    { x: 300, y: 500, direction: 'up', posture: 'blocked' },
    { x: 350, y: 500, direction: 'up', posture: 'blocked' },
  ],
  fallback: [
    { x: 400, y: 500, direction: 'down', posture: 'idle' },
    { x: 500, y: 500, direction: 'down', posture: 'idle' },
    { x: 600, y: 500, direction: 'down', posture: 'idle' },
    { x: 350, y: 600, direction: 'down', posture: 'idle' },
    { x: 500, y: 600, direction: 'down', posture: 'idle' },
  ],
};

let cachedZoneSpots = null;

function computeZoneSpots() {
  const furniture = getFurnitureObjects();
  const zones = { work: [], rest: [], meeting: [], blocked: [], fallback: [...FALLBACK_SPOTS.fallback] };

  for (const f of furniture) {
    // Skip table-top decorations (no collision = sits on furniture, not a destination)
    if (!f.collision) continue;

    // Manual zone override takes priority, then category auto-mapping
    const zone = f.zone || CATEGORY_TO_ZONE[f.cat];
    if (!zone || !zones[zone]) continue;

    const fw = f.src.w * TILE_SCALE;
    const fh = f.src.h * TILE_SCALE;
    const centerX = f.x + fw / 2;
    const posture = ZONE_POSTURE[zone] || 'idle';

    // Place agent in front of the furniture (below it), with enough clearance
    zones[zone].push({
      x: centerX,
      y: f.y + fh + 45,
      direction: 'up',
      posture,
    });

    // Add a second spot slightly offset for variety
    zones[zone].push({
      x: centerX + 25,
      y: f.y + fh + 55,
      direction: 'up',
      posture,
    });
  }

  // Fill empty zones with fallbacks
  for (const zone of ['work', 'rest', 'meeting', 'blocked']) {
    if (zones[zone].length === 0) {
      zones[zone] = [...(FALLBACK_SPOTS[zone] || FALLBACK_SPOTS.fallback)];
    }
  }

  return zones;
}

function getZoneSpots() {
  if (!cachedZoneSpots) {
    cachedZoneSpots = computeZoneSpots();
  }
  return cachedZoneSpots;
}

// Automatically refresh spots when layout changes
onLayoutChange(() => { cachedZoneSpots = null; });

export const ZONE_SPOTS = new Proxy({}, {
  get(_, zone) {
    return getZoneSpots()[zone];
  },
});

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
