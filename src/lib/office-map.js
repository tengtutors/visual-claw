/**
 * Office map definition — v3 layout from WorkspaceMap.jsx.
 * Map is 980 x 1320 logical pixels.
 * 4 rooms: Work Area, Meeting Room, Break Room, Washroom.
 */

export const MAP_W = 980;
export const MAP_H = 1320;
export const TILE = 24;

export const ZONE_BOUNDS = {
  work:    { x: 30,  y: 80,  w: 430, h: 430 },
  meeting: { x: 500, y: 80,  w: 450, h: 430 },
  rest:    { x: 30,  y: 550, w: 430, h: 690 },
  blocked: { x: 500, y: 550, w: 450, h: 690 },
};

// Agent standing/sitting spots — well spaced within each room
export const ZONE_SPOTS = {
  work: [
    { x: 120, y: 200 },
    { x: 250, y: 200 },
    { x: 370, y: 200 },
    { x: 120, y: 340 },
    { x: 250, y: 340 },
    { x: 370, y: 340 },
    { x: 180, y: 420 },
    { x: 310, y: 420 },
  ],
  meeting: [
    { x: 600, y: 200 },
    { x: 740, y: 200 },
    { x: 860, y: 200 },
    { x: 600, y: 340 },
    { x: 740, y: 340 },
    { x: 860, y: 340 },
    { x: 670, y: 420 },
    { x: 800, y: 420 },
  ],
  rest: [
    { x: 120, y: 700 },
    { x: 250, y: 700 },
    { x: 370, y: 700 },
    { x: 120, y: 860 },
    { x: 250, y: 860 },
    { x: 370, y: 860 },
    { x: 180, y: 1020 },
    { x: 310, y: 1020 },
    { x: 120, y: 1140 },
    { x: 370, y: 1140 },
  ],
  blocked: [
    { x: 600, y: 700 },
    { x: 740, y: 700 },
    { x: 860, y: 700 },
    { x: 600, y: 860 },
    { x: 740, y: 860 },
    { x: 860, y: 860 },
    { x: 670, y: 1020 },
    { x: 800, y: 1020 },
    { x: 600, y: 1140 },
    { x: 860, y: 1140 },
  ],
};

// Furniture items to draw on the map
export const FURNITURE = [
  // === WORK ROOM ===
  { x: 80,  y: 140, type: 'workdesk' },
  { x: 210, y: 140, type: 'workdesk' },
  { x: 340, y: 140, type: 'workdesk' },
  { x: 80,  y: 280, type: 'workdesk' },
  { x: 210, y: 280, type: 'workdesk' },
  { x: 340, y: 280, type: 'workdesk' },
  { x: 410, y: 110, type: 'plant' },
  { x: 410, y: 440, type: 'watercooler' },

  // === MEETING ROOM ===
  { x: 720, y: 260, type: 'meetingtable' },
  { x: 620, y: 230, type: 'meetingchair' },
  { x: 820, y: 230, type: 'meetingchair' },
  { x: 620, y: 320, type: 'meetingchair' },
  { x: 820, y: 320, type: 'meetingchair' },
  { x: 720, y: 180, type: 'meetingchair' },
  { x: 720, y: 380, type: 'meetingchair' },
  { x: 900, y: 110, type: 'whiteboard' },
  { x: 540, y: 100, type: 'merlion' },
  { x: 700, y: 100, type: 'mbs' },

  // === BREAK ROOM ===
  { x: 150, y: 660, type: 'mahjongtable' },
  { x: 380, y: 600, type: 'tv' },
  { x: 310, y: 740, type: 'kopistation' },
  { x: 80,  y: 900, type: 'sofa' },
  { x: 260, y: 900, type: 'sofa' },
  { x: 400, y: 880, type: 'fridge' },
  { x: 380, y: 660, type: 'playstation' },
  { x: 200, y: 1060, type: 'chopetable' },

  // === WASHROOM ===
  { x: 560, y: 640, type: 'toiletcubicle' },
  { x: 740, y: 640, type: 'toiletcubicle' },
  { x: 560, y: 800, type: 'toiletcubicle' },
  { x: 740, y: 860, type: 'sink' },
  { x: 850, y: 860, type: 'sink' },
  { x: 720, y: 566, type: 'restroomsign' },
];

// Zone label positions
export const ZONE_LABELS = {
  work:    { x: 245, y: 80,  label: 'WORK AREA',    color: '#5a8dee', bg: '#e8f0fe' },
  meeting: { x: 725, y: 80,  label: 'MEETING ROOM', color: '#9b59b6', bg: '#f0ebfa' },
  rest:    { x: 245, y: 550, label: 'BREAK ROOM',   color: '#4e9f68', bg: '#e6f5ec' },
  blocked: { x: 725, y: 550, label: 'WASHROOM',     color: '#aa4b6b', bg: '#fde8e8' },
};

/**
 * Pick an available spot in a zone for an agent.
 * Tries to avoid spots already taken by other agents.
 */
export function pickSpot(zone, takenPositions) {
  const spots = ZONE_SPOTS[zone] || ZONE_SPOTS.rest;
  for (const spot of spots) {
    const occupied = takenPositions.some(
      (p) => Math.abs(p.x - spot.x) < 44 && Math.abs(p.y - spot.y) < 44
    );
    if (!occupied) return { ...spot };
  }
  const base = spots[Math.floor(Math.random() * spots.length)];
  return {
    x: base.x + (Math.random() - 0.5) * 30,
    y: base.y + (Math.random() - 0.5) * 30,
  };
}

/**
 * Get a random wander target within a zone, near the agent's current position.
 */
export function getWanderTarget(zone, currentX, currentY) {
  const bounds = ZONE_BOUNDS[zone] || ZONE_BOUNDS.rest;
  const wanderRange = 40;
  const tx = currentX + (Math.random() - 0.5) * wanderRange * 2;
  const ty = currentY + (Math.random() - 0.5) * wanderRange * 2;
  return {
    x: Math.max(bounds.x + 40, Math.min(bounds.x + bounds.w - 40, tx)),
    y: Math.max(bounds.y + 40, Math.min(bounds.y + bounds.h - 40, ty)),
  };
}
