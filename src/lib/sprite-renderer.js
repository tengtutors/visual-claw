/**
 * Canvas 2D sprite renderer — Singapore-themed pixel office.
 * V2: Character sprites loaded from PNG sprite strips (32×32, 5 frames each).
 * No procedural character generation — real pixel art assets.
 */

import { MAP_W, MAP_H, ZONE_BOUNDS, ZONE_LABELS, FURNITURE, TILE } from './office-map.js';
import { STATE_COLORS } from './constants.js';

// ═══════════════════════════════════════════════════════════
//  SPRITE SHEET SYSTEM
// ═══════════════════════════════════════════════════════════

// Available character sprite strips (160×32 each, 5 frames of 32×32)
const CHARACTER_FILES = [
  'char01_red_hood_strip_5f.png',
  'char02_knight_strip_5f.png',
  'char03_ninja_strip_5f.png',
  'char04_villager_strip_5f.png',
  'char05_goblin_strip_5f.png',
  'char06_female_fastfood_staff_strip_5f.png',
  'char07_minotaur_strip_5f.png',
  'char08_vampire_strip_5f.png',
  'char09_beholder_strip_5f.png',
  'char10_slime_strip_5f.png',
  'char11_female_office_worker_a_strip_5f.png',
  'char12_female_office_worker_b_strip_5f.png',
  'char13_female_student_strip_5f.png',
  'char14_female_teacher_strip_5f.png',
  'char15_male_einstein_style_strip_5f.png',
  'char16_male_special_forces_strip_5f.png',
  'char17_male_trump_style_strip_5f.png',
];

// Frame layout in each strip
const FRAME_W = 32;
const FRAME_H = 32;
const FRAME_FRONT  = 0;  // facing camera, idle
const FRAME_WALK_A = 1;  // walk pose A
const FRAME_WALK_B = 2;  // walk pose B
const FRAME_BACK   = 3;  // facing away
const FRAME_ACTION = 4;  // attack / action pose

// Render size on canvas (2× upscale for crisp pixel art)
const RENDER_W = 48;
const RENDER_H = 48;

// ─── Sprite image loading ───
const spriteImages = [];
let spritesLoaded = false;

function loadSprites() {
  let loaded = 0;
  const total = CHARACTER_FILES.length;

  CHARACTER_FILES.forEach((filename, index) => {
    const img = new Image();
    img.onload = () => {
      loaded++;
      if (loaded === total) spritesLoaded = true;
    };
    img.onerror = () => {
      console.warn(`Failed to load sprite: ${filename}`);
      loaded++;
      if (loaded === total) spritesLoaded = true;
    };
    // Chrome extension: use runtime URL; fallback for dashboard
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      img.src = chrome.runtime.getURL(`sprites/${filename}`);
    } else {
      img.src = `../sprites/${filename}`;
    }
    spriteImages[index] = img;
  });
}

// Start loading immediately on module init
loadSprites();

// ─── Office Tileset loading ───
// Tileset: 512×1024 = 16 cols × 32 rows of 32×32 tiles
let tilesetImg = null;
let tilesetReady = false;

function loadTileset() {
  tilesetImg = new Image();
  tilesetImg.onload = () => { tilesetReady = true; };
  tilesetImg.onerror = () => { console.warn('Failed to load office tileset'); };
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    tilesetImg.src = chrome.runtime.getURL('sprites/office_tileset_32x32.png');
  } else {
    tilesetImg.src = '../sprites/office_tileset_32x32.png';
  }
}

loadTileset();

// Draw a region from the tileset (source in pixels)
function ts(ctx, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!tilesetImg || !tilesetReady) return false;
  ctx.drawImage(tilesetImg, sx, sy, sw, sh, dx, dy, dw ?? sw, dh ?? sh);
  return true;
}

// ─── Agent → character assignment (deterministic by ID hash) ───
const agentCharMap = new Map();

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getCharacterIndex(agentId) {
  if (agentCharMap.has(agentId)) return agentCharMap.get(agentId);
  const h = hashStr(agentId);
  const idx = h % CHARACTER_FILES.length;
  agentCharMap.set(agentId, idx);
  return idx;
}

// ═══════════════════════════════════════════════════════════
//  OFFICE RENDERING — v3 style (WorkspaceMap.jsx colors)
// ═══════════════════════════════════════════════════════════

const FLOOR_BASE = '#efe2cb';
const FLOOR_ALT  = '#e6d9c0';
const WALL_COLOR = '#d1c3aa';
const ZONE_FLOORS = {
  work:    { base: '#f6efe3', alt: '#ede6d8' },
  meeting: { base: '#f5ebf6', alt: '#ece2ee' },
  rest:    { base: '#edf5ea', alt: '#e4ede0' },
  blocked: { base: '#eef5fa', alt: '#e5ecf2' },
};

export function renderScene(ctx, width, height, sprites, agents, selectedAgentId, hoveredAgentId) {
  const scaleX = width / MAP_W;
  const scaleY = height / MAP_H;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (width - MAP_W * scale) / 2;
  const offsetY = (height - MAP_H * scale) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#efe6d5';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawFloor(ctx);
  drawZones(ctx);
  drawFurniture(ctx);
  drawZoneLabels(ctx);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const sorted = [...sprites].sort((a, b) => a.y - b.y);

  for (const sprite of sorted) {
    const agent = agentMap.get(sprite.id);
    if (!agent) continue;
    drawAgent(ctx, sprite, agent, sprite.id === selectedAgentId, sprite.id === hoveredAgentId);
  }

  ctx.restore();
  return { offsetX, offsetY, scale };
}

// ─── Floor ───
function drawFloor(ctx) {
  for (let y = 0; y < MAP_H; y += TILE) {
    for (let x = 0; x < MAP_W; x += TILE) {
      ctx.fillStyle = ((x / TILE) + (y / TILE)) % 2 === 0 ? FLOOR_BASE : FLOOR_ALT;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
  // Subtle grid lines
  ctx.strokeStyle = '#d1c3aa18';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= MAP_W; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
  }
  for (let y = 0; y <= MAP_H; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
  }
}

// ─── Zones ───
function drawZones(ctx) {
  for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS)) {
    const zoneFloor = ZONE_FLOORS[zoneId];
    // Fill room with solid color (matching WorkspaceMap.jsx style)
    ctx.fillStyle = zoneFloor.base;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    // Subtle checkerboard within room
    for (let ty = bounds.y; ty < bounds.y + bounds.h; ty += TILE) {
      for (let tx = bounds.x; tx < bounds.x + bounds.w; tx += TILE) {
        if (((tx / TILE) + (ty / TILE)) % 2 !== 0) {
          ctx.fillStyle = zoneFloor.alt;
          ctx.fillRect(tx, ty, TILE, TILE);
        }
      }
    }

    // Clean stroke border (like SVG strokeWidth="6")
    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 6;
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  }
}

// ─── Zone Labels ───
function drawZoneLabels(ctx) {
  for (const [, label] of Object.entries(ZONE_LABELS)) {
    // Larger, bolder labels matching WorkspaceMap.jsx (fontSize 24, fontWeight 700)
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = label.color;
    ctx.fillText(label.label, label.x, label.y + 12);
  }
}

// ═══════════════════════════════════════════════════════════
//  FURNITURE DRAWING — v3 tileset-based
//  Tileset: Office Tileset All 32x32.png (512×1024, 16×32 grid)
// ═══════════════════════════════════════════════════════════

function drawFurniture(ctx) {
  ctx.imageSmoothingEnabled = false;
  for (const item of FURNITURE) {
    switch (item.type) {
      case 'workdesk':      drawWorkDesk(ctx, item.x, item.y); break;
      case 'meetingtable':  drawMeetingTable(ctx, item.x, item.y); break;
      case 'meetingchair':  drawMeetingChair(ctx, item.x, item.y); break;
      case 'whiteboard':    drawWhiteboard(ctx, item.x, item.y); break;
      case 'sofa':          drawSofa(ctx, item.x, item.y); break;
      case 'plant':         drawPlant(ctx, item.x, item.y); break;
      case 'watercooler':   drawWaterCooler(ctx, item.x, item.y); break;
      case 'merlion':       drawMerlion(ctx, item.x, item.y); break;
      case 'mbs':           drawMBS(ctx, item.x, item.y); break;
      case 'mahjongtable':  drawMahjongTable(ctx, item.x, item.y); break;
      case 'kopistation':   drawKopiStation(ctx, item.x, item.y); break;
      case 'tv':            drawTV(ctx, item.x, item.y); break;
      case 'fridge':        drawFridge(ctx, item.x, item.y); break;
      case 'chopetable':    drawChopeTable(ctx, item.x, item.y); break;
      case 'toiletcubicle': drawToiletCubicle(ctx, item.x, item.y); break;
      case 'sink':          drawSink(ctx, item.x, item.y); break;
      case 'restroomsign':  drawRestroomSign(ctx, item.x, item.y); break;
      case 'playstation':   drawPlayStation(ctx, item.x, item.y); break;
    }
  }
  ctx.imageSmoothingEnabled = true;
}

// ─── Work Room (tileset) ───

function drawWorkDesk(ctx, x, y) {
  // Wooden desk surface (2×1 tiles from row 0)
  ts(ctx, 0, 0, 64, 32, x - 4, y, 64, 32);
  // Desk front panel (2×1 tiles from row 1)
  ts(ctx, 0, 32, 64, 32, x - 4, y + 24, 64, 20);
  // Computer monitor on desk (from row 14, col 8-9 area)
  ts(ctx, 256, 448, 32, 32, x + 8, y - 28, 32, 32);
  // Chair in front of desk
  ts(ctx, 0, 320, 32, 32, x + 14, y + 36, 28, 28);
}

function drawPlant(ctx, x, y) {
  // Potted plant (1×2 tiles from rows 18-19)
  if (!ts(ctx, 64, 576, 32, 64, x - 4, y - 20, 32, 56)) {
    // Fallback
    ctx.fillStyle = '#2d8a4e';
    ctx.fillRect(x, y - 4, 20, 20);
    ctx.fillStyle = '#b06030';
    ctx.fillRect(x + 2, y + 14, 16, 12);
  }
}

function drawWaterCooler(ctx, x, y) {
  // Water cooler / vending machine (1×2 tiles from rows 10-11, col 14)
  if (!ts(ctx, 448, 320, 32, 64, x - 16, y - 24, 32, 56)) {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x - 12, y - 10, 24, 28);
    ctx.fillStyle = '#a0d0f0';
    ctx.fillRect(x - 8, y - 28, 16, 20);
  }
}

// ─── Meeting Room (tileset) ───

function drawMeetingTable(ctx, x, y) {
  // Large meeting table — compose from desk surface tiles (4×2)
  // Use the large desk/counter from rows 0-1, cols 8-11
  ts(ctx, 256, 0, 128, 32, x - 64, y - 10, 128, 32);
  ts(ctx, 256, 32, 128, 32, x - 64, y + 16, 128, 24);
}

function drawMeetingChair(ctx, x, y) {
  // Red upholstered chair (row 10, col 0)
  if (!ts(ctx, 0, 320, 32, 32, x - 14, y - 12, 28, 28)) {
    ctx.fillStyle = '#7a5a4a';
    ctx.fillRect(x - 10, y - 2, 20, 14);
  }
}

function drawWhiteboard(ctx, x, y) {
  // Whiteboard with chart (2×1 tiles from row 17, cols 4-5)
  if (!ts(ctx, 128, 544, 64, 32, x - 4, y, 56, 28)) {
    ctx.fillStyle = '#f0f0ee';
    ctx.fillRect(x, y + 4, 40, 56);
  }
  // Add a framed picture below (landscape from row 15)
  ts(ctx, 0, 480, 64, 32, x - 4, y + 30, 56, 28);
}

function drawMerlion(ctx, x, y) {
  // Framed landscape painting from tileset (row 15, cols 2-3)
  ts(ctx, 64, 480, 64, 32, x - 28, y + 4, 56, 28);
  // Label
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 28, y + 34, 56, 14);
  ctx.fillStyle = '#666';
  ctx.font = 'bold 8px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MERLION', x, y + 36);
}

function drawMBS(ctx, x, y) {
  // Framed sunset painting from tileset (row 15, cols 4-5)
  ts(ctx, 128, 480, 64, 32, x - 30, y + 4, 60, 30);
  // Label
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 30, y + 36, 60, 14);
  ctx.fillStyle = '#666';
  ctx.font = 'bold 7px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MARINA BAY SANDS', x, y + 38);
}

// ─── Break Room (tileset) ───

function drawMahjongTable(ctx, x, y) {
  // Use desk surface tiles for the table top
  ts(ctx, 0, 0, 64, 32, x - 32, y - 16, 64, 32);
  ts(ctx, 0, 32, 64, 32, x - 32, y + 10, 64, 24);
  // Mahjong tiles on table (green felt center)
  ctx.fillStyle = '#2d7a3e';
  ctx.fillRect(x - 20, y - 8, 40, 22);
  // Tile pieces
  ctx.fillStyle = '#f5f0e0';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 16 + i * 9, y - 4, 6, 4);
    ctx.fillRect(x - 16 + i * 9, y + 8, 6, 4);
  }
}

function drawKopiStation(ctx, x, y) {
  // Counter surface (from tileset rows 0-1, long desk)
  ts(ctx, 256, 0, 96, 32, x - 34, y - 4, 68, 24);
  // Vending machine behind counter
  ts(ctx, 448, 320, 32, 64, x - 20, y - 48, 28, 48);
  // Coffee cup
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x + 18, y + 2, 10, 12);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(x + 19, y + 3, 8, 8);
}

function drawTV(ctx, x, y) {
  // Computer monitor from tileset (row 14-15 area) — used as TV
  ts(ctx, 256, 448, 64, 32, x - 32, y, 64, 32);
  ts(ctx, 256, 480, 64, 32, x - 32, y + 28, 64, 24);
}

function drawPlayStation(ctx, x, y) {
  // Small desk/shelf from tileset + computer
  ts(ctx, 0, 352, 32, 32, x - 14, y - 8, 28, 28);
  // Console on shelf
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x - 8, y - 2, 16, 6);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x - 8, y + 1, 16, 1);
}

function drawSofa(ctx, x, y) {
  // Sofa from tileset (row 11, cols 3-4)
  if (!ts(ctx, 96, 352, 64, 32, x - 2, y - 2, 64, 32)) {
    ctx.fillStyle = '#5b9bc4';
    ctx.fillRect(x, y + 6, 60, 18);
  }
}

function drawFridge(ctx, x, y) {
  // Tall locker/fridge from tileset (row 11, col 1)
  if (!ts(ctx, 32, 352, 32, 32, x - 16, y - 16, 32, 32)) {
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x - 16, y - 36, 32, 58);
  }
  // Second locker for bottom half
  ts(ctx, 64, 352, 32, 32, x - 16, y + 12, 32, 24);
}

function drawChopeTable(ctx, x, y) {
  // Small round table from tileset (row 11, col 0)
  if (!ts(ctx, 0, 352, 32, 32, x - 14, y - 8, 28, 28)) {
    ctx.fillStyle = '#c49a6c';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // CHOPED sign
  ctx.fillStyle = '#c44040';
  ctx.font = 'bold 8px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CHOPED!', x, y - 10);
}

// ─── Washroom (tileset) ───

function drawToiletCubicle(ctx, x, y) {
  // Cubicle walls
  ctx.fillStyle = '#e0ddd6';
  ctx.fillRect(x - 26, y - 8, 52, 60);
  ctx.strokeStyle = '#c8c0b0';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 26, y - 8, 52, 60);
  // Toilet from tileset (row 10, cols 4-5)
  ts(ctx, 128, 320, 32, 32, x - 14, y, 28, 28);
}

function drawSink(ctx, x, y) {
  // Use a tileset piece for mirror above sink
  ts(ctx, 32, 448, 32, 32, x - 14, y - 32, 28, 28);
  // Sink basin
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x - 14, y - 2, 28, 18);
  ctx.fillStyle = '#d0e0f0';
  ctx.fillRect(x - 10, y + 2, 20, 10);
  ctx.fillStyle = '#999';
  ctx.fillRect(x - 2, y - 6, 4, 6);
}

function drawRestroomSign(ctx, x, y) {
  // Clock from tileset as a wall decoration
  ts(ctx, 0, 448, 32, 32, x - 16, y - 4, 32, 32);
  // WC label below
  ctx.fillStyle = '#aa4b6b';
  ctx.font = 'bold 10px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('WC', x, y + 28);
}

// ═══════════════════════════════════════════════════════════
//  AGENT DRAWING — Sprite sheet based
// ═══════════════════════════════════════════════════════════

const TOOL_EMOJI = {
  python: '🐍', nodejs: '📗', shell: '💻', browser: '🌐',
  docker: '🐳', github: '🐙', postgres: '🐘', slack: '💬',
};

/**
 * Pick the correct frame from the 5-frame strip based on animation/direction.
 */
function getSpriteFrame(sprite) {
  // Facing away → back frame
  if (sprite.direction === 'up') return FRAME_BACK;

  // Walking → alternate between walk A and B
  if (sprite.animation === 'walk') {
    return sprite.walkFrame % 2 === 0 ? FRAME_WALK_A : FRAME_WALK_B;
  }

  // Action states → attack/action frame
  if (sprite.animation === 'think' || sprite.animation === 'talk') {
    return FRAME_ACTION;
  }

  // Default → front idle
  return FRAME_FRONT;
}

/**
 * Draw a single agent using sprite sheet.
 * Sprite anchor is (x, y). Shadow at y+14, name at y+20.
 */
function drawAgent(ctx, sprite, agent, isSelected, isHovered, skipLabel) {
  const x = Math.round(sprite.x);
  const y = Math.round(sprite.y);
  const t = Date.now();

  // ── Selection / hover rings ──
  if (isSelected) {
    const pulse = 0.8 + Math.sin(t * 0.004) * 0.2;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 28 * pulse, 12 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#3b82f640';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 31 * pulse, 13 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isHovered) {
    ctx.strokeStyle = '#3b82f640';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 24, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = '#00000018';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shake (blocked state)
  let shakeX = 0;
  if (sprite.animation === 'blocked') {
    shakeX = Math.sin(sprite.shakeTimer * 0.025) * 3;
  }
  const cx = x + shakeX;

  // Bob (walk/idle)
  let bobY = 0;
  if (sprite.animation === 'walk') {
    bobY = Math.sin(sprite.walkFrame * Math.PI / 2) * -2.5;
  } else if (sprite.animation === 'idle') {
    bobY = Math.sin(t * 0.002) * -0.8;
  }

  // ── Draw character sprite ──
  const charIdx = getCharacterIndex(agent.id);
  const img = spriteImages[charIdx];
  const frame = getSpriteFrame(sprite);

  // Position: sprite bottom aligns with shadow (y+14), centered on cx
  const drawX = cx - RENDER_W / 2;
  const drawY = y + 14 - RENDER_H + bobY;

  if (img && img.complete && img.naturalWidth > 0) {
    // Disable smoothing for crisp pixel art upscaling
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      frame * FRAME_W, 0, FRAME_W, FRAME_H,  // source rect from strip
      drawX, drawY, RENDER_W, RENDER_H         // destination on canvas
    );
    ctx.imageSmoothingEnabled = true;
  } else {
    // Fallback: colored rectangle while sprites load
    ctx.fillStyle = '#666';
    ctx.fillRect(drawX + 8, drawY + 4, RENDER_W - 16, RENDER_H - 8);
    ctx.fillStyle = '#888';
    ctx.fillRect(drawX + 12, drawY + 8, RENDER_W - 24, RENDER_H - 16);
  }

  // Head top position (for overlays) — roughly top quarter of rendered sprite
  const headY = drawY + 2;

  // ── State overlays ──
  drawStateOverlays(ctx, cx, headY, sprite, t);

  // ── Tool icon ──
  if (agent.currentTool && !skipLabel) {
    const emoji = TOOL_EMOJI[agent.currentTool] || '🔧';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(emoji, cx, headY - 4 + Math.sin(t * 0.004) * 2);
  }

  // ── Name + task labels ──
  if (!skipLabel) {
    drawLabels(ctx, cx, y, agent, isSelected);
  }

  // ── State dot ──
  const stateCol = STATE_COLORS[agent.state] || '#64748b';
  ctx.fillStyle = stateCol;
  ctx.beginPath();
  ctx.arc(cx + RENDER_W / 2 - 4, headY + 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx + RENDER_W / 2 - 4, headY + 6, 4, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── STATE OVERLAYS ───

function drawStateOverlays(ctx, cx, headY, sprite, t) {
  if (sprite.animation === 'think') {
    const phase = Math.floor(t / 400) % 4;
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 3; i++) {
      if (i < phase) {
        ctx.fillRect(cx + 18 + i * 6, headY - 6 - i * 4, 4, 4);
      }
    }
  }

  if (sprite.animation === 'talk') {
    const bubblePhase = Math.floor(t / 800) % 3;
    if (bubblePhase < 2) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + 20, headY - 14, 30, 16);
      ctx.fillRect(cx + 19, headY - 12, 1, 12);
      ctx.fillRect(cx + 50, headY - 12, 1, 12);
      ctx.fillRect(cx + 21, headY + 2, 5, 4);
      ctx.fillStyle = '#666';
      ctx.fillRect(cx + 24, headY - 10, 14, 2);
      ctx.fillRect(cx + 24, headY - 5, 20, 2);
    }
  }

  if (sprite.animation === 'blocked') {
    const flash = Math.floor(t / 350) % 2;
    if (flash === 0) {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, headY - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 1, headY - 16, 3, 8);
      ctx.fillRect(cx - 1, headY - 7, 3, 2);
    }
  }

  if (sprite.animation === 'offline') {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px "Courier New"';
    ctx.textAlign = 'left';
    const zPhase = Math.floor(t / 600) % 3;
    const zFloat = Math.sin(t * 0.003) * 3;
    ctx.fillText('z', cx + 16, headY - 2 + zFloat);
    if (zPhase >= 1) ctx.fillText('z', cx + 24, headY - 10 + zFloat);
    if (zPhase >= 2) {
      ctx.font = 'bold 14px "Courier New"';
      ctx.fillText('Z', cx + 30, headY - 20 + zFloat);
    }
  }
}

// ─── NAME / TASK LABELS ───

function drawLabels(ctx, cx, y, agent, isSelected) {
  const labelY = y + 20;
  const displayName = agent.isTelegramBot ? `📩 ${agent.name}` : agent.name;
  const nameWidth = displayName.length * 6.5 + 10;
  ctx.fillStyle = isSelected ? '#3b82f6cc' : '#00000060';
  ctx.fillRect(cx - nameWidth / 2, labelY, nameWidth, 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(displayName, cx, labelY + 2);

  if (agent.currentTask) {
    const taskLabelY = labelY + 16;
    const taskText = agent.currentTask.length > 24
      ? agent.currentTask.slice(0, 22) + '…'
      : agent.currentTask;
    const taskWidth = taskText.length * 5.5 + 8;
    ctx.fillStyle = '#1e293baa';
    ctx.fillRect(cx - taskWidth / 2, taskLabelY, taskWidth, 12);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText(taskText, cx, taskLabelY + 1);
  }
}

// ═══════════════════════════════════════════════════════════
//  AGENT PREVIEW (for skill sheet panel)
// ═══════════════════════════════════════════════════════════

export function drawAgentPreview(ctx, agentId, agentState, px, py) {
  const fakeSprite = {
    id: agentId, x: px, y: py,
    direction: 'down',
    animation: agentState === 'blocked' ? 'blocked'
             : agentState === 'meeting' ? 'talk'
             : agentState === 'working' ? 'think'
             : 'idle',
    walkFrame: 0, shakeTimer: 0, bubbleTimer: 0,
  };
  const fakeAgent = { id: agentId, name: '', state: agentState };
  drawAgent(ctx, fakeSprite, fakeAgent, false, false, true);
}

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════

export function screenToMap(screenX, screenY, transform) {
  const { offsetX, offsetY, scale } = transform;
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}
