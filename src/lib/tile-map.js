/**
 * Tile-based office map definition.
 *
 * The room is built from the 32x32 tileset spritesheet.
 * Floor is laid out as a grid; furniture is placed as
 * individual objects that carry their own collision bounds.
 */

export const TILE = 32;
export const TILE_SCALE = 1.95;
export const SCALED_TILE = TILE * TILE_SCALE; // ~62.4px per tile on screen

export const TILESET_PATH = 'assets/office/tilesets/Office Tileset All 32x32 no shadow.png';

// Room grid dimensions (in tiles)
export const ROOM_COLS = 12;
export const ROOM_ROWS = 13;

// Where the tile grid starts in world coordinates (matches original room placement)
export const ROOM_ORIGIN_X = 115;
export const ROOM_ORIGIN_Y = 46;

// ---------------------------------------------------------------------------
// Tile source rectangles in the 512x1024 tileset spritesheet
// ---------------------------------------------------------------------------
export const SRC = {
  // Floor — grey tile with subtle dotted border (col 2, row 7)
  FLOOR: { x: 64, y: 224, w: 32, h: 32 },
};

// ---------------------------------------------------------------------------
// Floor grid — only floor tiles, dark background acts as walls
// ---------------------------------------------------------------------------
export function buildFloorGrid() {
  const grid = [];
  for (let r = 0; r < ROOM_ROWS; r++) {
    const row = [];
    for (let c = 0; c < ROOM_COLS; c++) {
      // Leave top 3 rows, bottom 1 row, left 1 col, right 1 col empty (wall = dark bg)
      const isWall = r < 3 || r >= ROOM_ROWS - 1 || c === 0 || c === ROOM_COLS - 1;
      row.push(isWall ? null : 'FLOOR');
    }
    grid.push(row);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Furniture objects
//
// Tileset reference (col*32, row*32):
//   Wooden desk:   (0,0)  3x2 = 96x64   — desk surface + front panel
//   Tan desk:      (4,0)  3x2 = 96x64   — tan desk + drawer
//   Bookshelf:     (9,8)  3x2 = 96x64   — bookshelf face
//   Grey shelf:    (12,8) 3x2 = 96x64   — grey metal shelf
//   Monitor:       (9,26) 2x2 = 64x64
//   Office chairs: (4,16) 2x2 = 64x64
//   Vending:       (14,17) 2x2 = 64x64
//   Fridge/cooler: (14,12) 2x2 = 64x64
//   Boxes stacked: (8,29) 2x2 = 64x64
//   Boxes wide:    (12,29) 3x2 = 96x64
//   Plants:        (6,28) 2x2 = 64x64
//   Rug blue:      (0,30) 2x2 = 64x64
// ---------------------------------------------------------------------------
export const FURNITURE_OBJECTS = [
  // --- Tall shelf left ---
  {
    id: 'shelf_left',
    src: { x: 448, y: 352, w: 64, h: 96 },
    x: 183, y: 382,
    collision: { x: 183, y: 382, w: 64 * TILE_SCALE, h: 96 * TILE_SCALE },
    get zAnchor() { return this.y + 96 * TILE_SCALE; },
  },
  // --- Tall shelf right (next to left) ---
  {
    id: 'shelf_left_2',
    src: { x: 384, y: 352, w: 64, h: 96 },
    x: 289, y: 382,
    collision: { x: 289, y: 382, w: 64 * TILE_SCALE, h: 96 * TILE_SCALE },
    get zAnchor() { return this.y + 96 * TILE_SCALE; },
  },
  // --- Bookshelf top-right ---
  {
    id: 'bookshelf_right',
    src: { x: 256, y: 512, w: 64, h: 96 },
    x: 688, y: 146,
    collision: { x: 688, y: 146, w: 64 * TILE_SCALE, h: 96 * TILE_SCALE },
    get zAnchor() { return this.y + 96 * TILE_SCALE; },
  },
  // --- Painting left wall ---
  {
    id: 'painting_1',
    src: { x: 128, y: 640, w: 64, h: 64 },
    x: 183, y: 136,
    collision: null,
    get zAnchor() { return this.y; },
  },
  // --- Painting center wall ---
  {
    id: 'painting_2',
    src: { x: 128, y: 640, w: 64, h: 64 },
    x: 414, y: 133,
    collision: null,
    get zAnchor() { return this.y; },
  },
  // --- Painting right wall ---
  {
    id: 'painting_3',
    src: { x: 128, y: 640, w: 64, h: 64 },
    x: 654, y: 134,
    collision: null,
    get zAnchor() { return this.y; },
  },
  // --- Vending machine ---
  {
    id: 'vending_machine',
    src: { x: 448, y: 512, w: 64, h: 96 },
    x: 570, y: 143,
    collision: { x: 570, y: 143, w: 64 * TILE_SCALE, h: 96 * TILE_SCALE },
    get zAnchor() { return this.y + 96 * TILE_SCALE; },
  },
  // --- Tall cabinet ---
  {
    id: 'cabinet_tall',
    src: { x: 384, y: 512, w: 32, h: 96 },
    x: 530, y: 142,
    collision: { x: 530, y: 142, w: 32 * TILE_SCALE, h: 96 * TILE_SCALE },
    get zAnchor() { return this.y + 96 * TILE_SCALE; },
  },
  // --- Water cooler left ---
  {
    id: 'cooler_left',
    src: { x: 64, y: 512, w: 32, h: 64 },
    x: 551, y: 284,
    collision: { x: 551, y: 284, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Water cooler right ---
  {
    id: 'cooler_right',
    src: { x: 64, y: 512, w: 32, h: 64 },
    x: 552, y: 341,
    collision: { x: 552, y: 341, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Computer desk top-left ---
  {
    id: 'computer_topleft',
    src: { x: 448, y: 896, w: 64, h: 64 },
    x: 169, y: 172,
    collision: { x: 169, y: 172, w: 64 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Monitor on desk (ON TABLE — high zAnchor) ---
  {
    id: 'monitor_1',
    src: { x: 448, y: 448, w: 32, h: 64 },
    x: 279, y: 188,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Coffee machine ---
  {
    id: 'coffee_machine',
    src: { x: 32, y: 576, w: 32, h: 64 },
    x: 363, y: 234,
    collision: { x: 363, y: 234, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Coffee cup 1 (ON TABLE — high zAnchor) ---
  {
    id: 'cup_1',
    src: { x: 448, y: 640, w: 32, h: 32 },
    x: 360, y: 270,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Printer ---
  {
    id: 'printer',
    src: { x: 0, y: 576, w: 32, h: 64 },
    x: 648, y: 313,
    collision: { x: 648, y: 313, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Filing cabinet right-top ---
  {
    id: 'filing_1',
    src: { x: 96, y: 512, w: 32, h: 64 },
    x: 743, y: 285,
    collision: { x: 743, y: 285, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Filing cabinet right-bottom ---
  {
    id: 'filing_2',
    src: { x: 96, y: 512, w: 32, h: 64 },
    x: 742, y: 346,
    collision: { x: 742, y: 346, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Plant right wall ---
  {
    id: 'plant_right',
    src: { x: 96, y: 896, w: 32, h: 64 },
    x: 736, y: 446,
    collision: { x: 736, y: 446, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Plant left wall ---
  {
    id: 'plant_left',
    src: { x: 96, y: 896, w: 32, h: 64 },
    x: 175, y: 482,
    collision: { x: 175, y: 482, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Plant bottom ---
  {
    id: 'plant_bottom',
    src: { x: 96, y: 896, w: 32, h: 64 },
    x: 623, y: 682,
    collision: { x: 623, y: 682, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Boxes bottom ---
  {
    id: 'boxes_bottom',
    src: { x: 0, y: 832, w: 64, h: 64 },
    x: 692, y: 493,
    collision: { x: 692, y: 493, w: 64 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Rug bottom ---
  {
    id: 'rug',
    src: { x: 128, y: 992, w: 64, h: 32 },
    x: 681, y: 731,
    collision: null,
    get zAnchor() { return this.y; },
  },
  // --- Desk chair left (ON TABLE — high zAnchor) ---
  {
    id: 'desk_chair_left',
    src: { x: 96, y: 576, w: 32, h: 64 },
    x: 498, y: 667,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Desk chair right (ON TABLE — high zAnchor) ---
  {
    id: 'desk_chair_right',
    src: { x: 96, y: 576, w: 32, h: 64 },
    x: 307, y: 668,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Small stool left (ON TABLE — high zAnchor) ---
  {
    id: 'stool_left',
    src: { x: 352, y: 768, w: 32, h: 32 },
    x: 501, y: 680,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Small stool right (ON TABLE — high zAnchor) ---
  {
    id: 'stool_right',
    src: { x: 352, y: 768, w: 32, h: 32 },
    x: 310, y: 678,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Desk left ---
  {
    id: 'desk_left',
    src: { x: 192, y: 512, w: 32, h: 64 },
    x: 242, y: 694,
    collision: { x: 242, y: 694, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Desk right ---
  {
    id: 'desk_right',
    src: { x: 192, y: 512, w: 32, h: 64 },
    x: 439, y: 692,
    collision: { x: 439, y: 692, w: 32 * TILE_SCALE, h: 64 * TILE_SCALE },
    get zAnchor() { return this.y + 64 * TILE_SCALE; },
  },
  // --- Monitor bottom-left (ON TABLE — high zAnchor) ---
  {
    id: 'monitor_2',
    src: { x: 448, y: 448, w: 32, h: 64 },
    x: 587, y: 593,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Monitor bottom-right (ON TABLE — high zAnchor) ---
  {
    id: 'monitor_3',
    src: { x: 448, y: 448, w: 32, h: 64 },
    x: 587, y: 669,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Coffee cup 2 (ON TABLE — high zAnchor) ---
  {
    id: 'cup_2',
    src: { x: 448, y: 640, w: 32, h: 32 },
    x: 650, y: 325,
    collision: null,
    get zAnchor() { return 900; },
  },
  // --- Coffee cup 3 (ON TABLE — high zAnchor) ---
  {
    id: 'cup_3',
    src: { x: 448, y: 640, w: 32, h: 32 },
    x: 301, y: 722,
    collision: null,
    get zAnchor() { return 900; },
  },
];

// ---------------------------------------------------------------------------
// Helper: convert tile grid coords to world coords
// ---------------------------------------------------------------------------
export function tileToWorld(col, row) {
  return {
    x: ROOM_ORIGIN_X + col * SCALED_TILE,
    y: ROOM_ORIGIN_Y + row * SCALED_TILE,
  };
}

// ---------------------------------------------------------------------------
// Derive collision rectangles from furniture objects
// ---------------------------------------------------------------------------
export function getFurnitureCollisions() {
  return FURNITURE_OBJECTS
    .filter((f) => f.collision != null)
    .map((f) => f.collision);
}
