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
//  OFFICE RENDERING (unchanged from v1)
// ═══════════════════════════════════════════════════════════

const FLOOR_BASE = '#f0e6d3';
const FLOOR_ALT  = '#e8dcc8';
const WALL_COLOR = '#d4c4a8';
const ZONE_FLOORS = {
  work:    { base: '#e8eef6', alt: '#dde5f0' },
  meeting: { base: '#eee8f6', alt: '#e4dcf0' },
  rest:    { base: '#e4f2e8', alt: '#d8eadc' },
  blocked: { base: '#e8eef0', alt: '#dde6ea' },
};

export function renderScene(ctx, width, height, sprites, agents, selectedAgentId, hoveredAgentId) {
  const scaleX = width / MAP_W;
  const scaleY = height / MAP_H;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (width - MAP_W * scale) / 2;
  const offsetY = (height - MAP_H * scale) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#c8b89a';
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
  ctx.strokeStyle = '#d4c4a822';
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
    if (zoneId === 'blocked') {
      const smallTile = 12;
      for (let ty = bounds.y; ty < bounds.y + bounds.h; ty += smallTile) {
        for (let tx = bounds.x; tx < bounds.x + bounds.w; tx += smallTile) {
          ctx.fillStyle = ((tx / smallTile) + (ty / smallTile)) % 2 === 0 ? '#e8eef0' : '#d8e2e6';
          ctx.fillRect(tx, ty, smallTile, smallTile);
        }
      }
    } else {
      for (let ty = bounds.y; ty < bounds.y + bounds.h; ty += TILE) {
        for (let tx = bounds.x; tx < bounds.x + bounds.w; tx += TILE) {
          ctx.fillStyle = ((tx / TILE) + (ty / TILE)) % 2 === 0 ? zoneFloor.base : zoneFloor.alt;
          ctx.fillRect(tx, ty, TILE, TILE);
        }
      }
    }
    const wt = 4;
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, wt);
    ctx.fillRect(bounds.x, bounds.y, wt, bounds.h);
    ctx.fillRect(bounds.x + bounds.w - wt, bounds.y, wt, bounds.h);
    ctx.fillRect(bounds.x, bounds.y + bounds.h - wt, bounds.w, wt);
    ctx.fillStyle = '#00000008';
    ctx.fillRect(bounds.x + wt, bounds.y + wt, bounds.w - wt * 2, 3);
    ctx.fillRect(bounds.x + wt, bounds.y + wt, 3, bounds.h - wt * 2);
  }
}

// ─── Zone Labels ───
function drawZoneLabels(ctx) {
  for (const [, label] of Object.entries(ZONE_LABELS)) {
    ctx.font = 'bold 13px "Courier New", monospace';
    const textWidth = ctx.measureText(label.label).width;
    const tabW = textWidth + 24;
    const tabH = 22;
    const tabX = label.x - tabW / 2;
    const tabY = label.y + 8;
    ctx.fillStyle = label.bg || '#fff';
    ctx.fillRect(tabX, tabY, tabW, tabH);
    ctx.fillStyle = label.color;
    ctx.fillRect(tabX, tabY, tabW, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label.label, label.x, tabY + 5);
  }
}

// ═══════════════════════════════════════════════════════════
//  FURNITURE DRAWING (unchanged from v1)
// ═══════════════════════════════════════════════════════════

function drawFurniture(ctx) {
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
}

// ─── Work Room ───

function drawWorkDesk(ctx, x, y) {
  ctx.fillStyle = '#00000010';
  ctx.fillRect(x + 2, y + 28, 56, 5);
  ctx.fillStyle = '#b8956a';
  ctx.fillRect(x, y + 6, 56, 22);
  ctx.fillStyle = '#d4a86a';
  ctx.fillRect(x, y + 6, 56, 4);
  ctx.fillStyle = '#9a7a52';
  ctx.fillRect(x, y + 26, 56, 3);
  ctx.fillStyle = '#888';
  ctx.fillRect(x + 20, y + 2, 14, 5);
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(x + 6, y - 20, 38, 24);
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(x + 8, y - 18, 34, 20);
  ctx.fillStyle = '#6a8fc5';
  ctx.fillRect(x + 8, y - 18, 34, 3);
  ctx.fillStyle = '#8ab4f8';
  ctx.fillRect(x + 12, y - 12, 16, 2);
  ctx.fillStyle = '#a8d8a8';
  ctx.fillRect(x + 12, y - 8, 22, 2);
  ctx.fillStyle = '#f8c08a';
  ctx.fillRect(x + 12, y - 4, 14, 2);
  ctx.fillStyle = '#444';
  ctx.fillRect(x + 8, y + 10, 24, 10);
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 9, y + 11, 22, 8);
  ctx.fillStyle = '#666';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 10 + i * 5, y + 12, 4, 2);
    ctx.fillRect(x + 10 + i * 5, y + 15, 4, 2);
  }
  ctx.fillStyle = '#444';
  ctx.fillRect(x + 38, y + 12, 8, 10);
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 39, y + 13, 6, 4);
  ctx.fillStyle = '#222';
  ctx.fillRect(x + 48, y + 10, 6, 12);
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 49, y + 11, 4, 8);
  ctx.fillStyle = '#4a6fa540';
  ctx.fillRect(x + 49, y + 12, 4, 5);
}

function drawPlant(ctx, x, y) {
  ctx.fillStyle = '#b06030';
  ctx.fillRect(x, y + 14, 20, 16);
  ctx.fillStyle = '#c07040';
  ctx.fillRect(x - 2, y + 12, 24, 5);
  ctx.fillStyle = '#5c3a20';
  ctx.fillRect(x + 2, y + 13, 16, 3);
  ctx.fillStyle = '#2d8a4e';
  ctx.fillRect(x + 2, y - 4, 16, 16);
  ctx.fillRect(x - 6, y + 2, 12, 12);
  ctx.fillRect(x + 14, y + 2, 12, 12);
  ctx.fillStyle = '#3da85e';
  ctx.fillRect(x + 4, y - 2, 10, 8);
}

function drawWaterCooler(ctx, x, y) {
  ctx.fillStyle = '#999';
  ctx.fillRect(x - 10, y + 16, 20, 8);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x - 12, y - 10, 24, 28);
  ctx.fillStyle = '#a0d0f0';
  ctx.fillRect(x - 8, y - 28, 16, 20);
  ctx.fillStyle = '#c0e0f8';
  ctx.fillRect(x - 6, y - 26, 12, 16);
  ctx.fillStyle = '#c44040';
  ctx.fillRect(x - 10, y - 2, 8, 5);
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(x + 2, y - 2, 8, 5);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x - 4, y + 6, 8, 8);
}

// ─── Meeting Room ───

function drawMeetingTable(ctx, x, y) {
  ctx.fillStyle = '#00000010';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 28, 64, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a07850';
  ctx.beginPath();
  ctx.ellipse(x, y + 24, 62, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c49a6c';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 60, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b08860';
  ctx.beginPath();
  ctx.ellipse(x, y + 22, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMeetingChair(ctx, x, y) {
  ctx.fillStyle = '#00000010';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x - 10, y - 2, 20, 14);
  ctx.fillStyle = '#7a5a4a';
  ctx.fillRect(x - 8, y, 16, 10);
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x - 10, y - 12, 20, 12);
  ctx.fillStyle = '#6a5a4a';
  ctx.fillRect(x - 8, y - 10, 16, 8);
  ctx.fillStyle = '#444';
  ctx.fillRect(x - 8, y + 10, 3, 5);
  ctx.fillRect(x + 5, y + 10, 3, 5);
}

function drawWhiteboard(ctx, x, y) {
  ctx.fillStyle = '#888';
  ctx.fillRect(x - 4, y, 48, 64);
  ctx.fillStyle = '#f0f0ee';
  ctx.fillRect(x, y + 4, 40, 56);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x + 6, y + 12, 24, 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 6, y + 20, 18, 3);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x + 6, y + 28, 28, 3);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x + 6, y + 36, 14, 3);
  ctx.fillStyle = '#666';
  ctx.fillRect(x + 2, y + 54, 36, 5);
  ctx.fillStyle = '#c44040';
  ctx.fillRect(x + 6, y + 52, 4, 5);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x + 14, y + 52, 4, 5);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x + 22, y + 52, 4, 5);
}

function drawMerlion(ctx, x, y) {
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(x - 32, y, 64, 76);
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(x - 28, y + 4, 56, 42);
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(x - 28, y + 36, 56, 24);
  ctx.fillStyle = '#5aa0e9';
  ctx.fillRect(x - 28, y + 36, 14, 2);
  ctx.fillRect(x - 6, y + 38, 14, 2);
  ctx.fillRect(x + 14, y + 40, 14, 2);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x - 6, y + 26, 16, 24);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(x - 12, y + 36, 8, 14);
  ctx.fillRect(x - 16, y + 40, 6, 10);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x - 10, y + 14, 24, 14);
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x - 14, y + 12, 6, 14);
  ctx.fillRect(x + 12, y + 12, 6, 14);
  ctx.fillRect(x - 12, y + 10, 28, 4);
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 4, y + 18, 3, 3);
  ctx.fillStyle = '#c8a080';
  ctx.fillRect(x + 8, y + 22, 4, 3);
  ctx.fillStyle = '#6ab4f0';
  ctx.fillRect(x + 12, y + 18, 14, 3);
  ctx.fillRect(x + 18, y + 21, 10, 3);
  ctx.fillRect(x + 16, y + 24, 8, 4);
  ctx.fillStyle = '#8ac4f8';
  ctx.fillRect(x + 14, y + 16, 4, 2);
  ctx.fillRect(x + 20, y + 28, 6, 6);
  ctx.fillStyle = '#a0d4ff';
  ctx.fillRect(x + 22, y + 20, 2, 2);
  ctx.fillRect(x + 26, y + 24, 2, 2);
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 28, y + 58, 56, 14);
  ctx.fillStyle = '#666';
  ctx.font = 'bold 8px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MERLION', x, y + 61);
}

function drawMBS(ctx, x, y) {
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(x - 34, y, 68, 76);
  ctx.fillStyle = '#ff9966';
  ctx.fillRect(x - 30, y + 4, 60, 16);
  ctx.fillStyle = '#ffcc88';
  ctx.fillRect(x - 30, y + 4, 60, 8);
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(x - 30, y + 32, 60, 28);
  ctx.fillStyle = '#5a7fb5';
  ctx.fillRect(x - 20, y + 38, 12, 2);
  ctx.fillRect(x + 6, y + 42, 16, 2);
  ctx.fillStyle = '#d0c8b8';
  ctx.fillRect(x - 22, y + 18, 14, 34);
  ctx.fillRect(x - 5, y + 14, 14, 38);
  ctx.fillRect(x + 12, y + 18, 14, 34);
  ctx.fillStyle = '#e8e0d0';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 20, y + 22 + i * 8, 10, 4);
    ctx.fillRect(x - 3, y + 18 + i * 8, 10, 4);
    ctx.fillRect(x + 14, y + 22 + i * 8, 10, 4);
  }
  ctx.fillStyle = '#b8b0a0';
  ctx.fillRect(x - 22, y + 50, 14, 2);
  ctx.fillRect(x - 5, y + 50, 14, 2);
  ctx.fillRect(x + 12, y + 50, 14, 2);
  ctx.fillStyle = '#d4c4a8';
  ctx.fillRect(x - 24, y + 12, 52, 6);
  ctx.fillStyle = '#c4b498';
  ctx.fillRect(x - 28, y + 16, 60, 3);
  ctx.fillStyle = '#d4c4a8';
  ctx.fillRect(x - 28, y + 14, 6, 4);
  ctx.fillRect(x + 26, y + 14, 6, 4);
  ctx.fillStyle = '#6ab4f0';
  ctx.fillRect(x - 20, y + 12, 44, 2);
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 30, y + 58, 60, 14);
  ctx.fillStyle = '#666';
  ctx.font = 'bold 7px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MARINA BAY SANDS', x, y + 61);
}

// ─── Break Room ───

function drawMahjongTable(ctx, x, y) {
  ctx.fillStyle = '#4a2a10';
  ctx.fillRect(x - 32, y + 30, 8, 10);
  ctx.fillRect(x + 24, y + 30, 8, 10);
  ctx.fillStyle = '#5c3a20';
  ctx.fillRect(x - 32, y - 30, 64, 64);
  ctx.fillStyle = '#2d7a3e';
  ctx.fillRect(x - 28, y - 26, 56, 56);
  ctx.fillStyle = '#f5f0e0';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x - 22 + i * 10, y - 24, 7, 5);
    ctx.fillRect(x - 22 + i * 10, y + 22, 7, 5);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - 26, y - 14 + i * 14, 5, 9);
    ctx.fillRect(x + 22, y - 14 + i * 14, 5, 9);
  }
  ctx.fillStyle = '#c44040';
  ctx.fillRect(x - 20, y - 22, 3, 2);
  ctx.fillRect(x + 10, y + 24, 3, 2);
  ctx.fillStyle = '#2d5a8e';
  ctx.fillRect(x - 2, y - 22, 3, 2);
  ctx.fillRect(x + 20, y + 24, 3, 2);
}

function drawKopiStation(ctx, x, y) {
  ctx.fillStyle = '#b8956a';
  ctx.fillRect(x - 34, y, 68, 22);
  ctx.fillStyle = '#d4a86a';
  ctx.fillRect(x - 34, y, 68, 4);
  ctx.fillStyle = '#9a7a52';
  ctx.fillRect(x - 34, y + 20, 68, 3);
  ctx.fillStyle = '#1a6630';
  ctx.fillRect(x - 28, y - 24, 16, 26);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(x - 26, y - 16, 12, 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 24, y - 14, 8, 3);
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x - 4, y - 26, 20, 28);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(x - 2, y - 24, 16, 16);
  ctx.fillStyle = '#c44040';
  ctx.fillRect(x, y - 6, 5, 5);
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(x + 8, y - 6, 5, 5);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x + 22, y + 2, 10, 12);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(x + 23, y + 3, 8, 8);
  const steamPhase = Math.floor(Date.now() / 500) % 3;
  ctx.fillStyle = '#ffffff60';
  ctx.fillRect(x + 24 + steamPhase, y - 2, 2, 3);
  ctx.fillRect(x + 26 - steamPhase, y - 4, 2, 2);
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x - 30, y + 4, 10, 8);
  ctx.fillStyle = '#d4a843';
  ctx.fillRect(x - 18, y + 4, 10, 8);
}

function drawTV(ctx, x, y) {
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 2, y, 4, 10);
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 32, y + 8, 64, 42);
  ctx.fillStyle = '#2a4a6a';
  ctx.fillRect(x - 28, y + 12, 56, 34);
  ctx.fillStyle = '#3a6a9a';
  ctx.fillRect(x - 22, y + 16, 24, 14);
  ctx.fillStyle = '#6a9aca';
  ctx.fillRect(x + 6, y + 16, 22, 8);
  ctx.fillStyle = '#5a8aba';
  ctx.fillRect(x + 6, y + 28, 22, 6);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x + 24, y + 46, 4, 3);
}

function drawPlayStation(ctx, x, y) {
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 28, y - 4, 56, 8);
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(x - 26, y - 2, 52, 4);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x - 14, y, 28, 8);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x - 10, y + 1, 20, 6);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x - 10, y + 3, 20, 1);
  ctx.fillStyle = '#2a2a3e';
  ctx.fillRect(x + 20, y + 1, 12, 6);
  ctx.fillStyle = '#444';
  ctx.fillRect(x + 22, y + 2, 3, 3);
  ctx.fillRect(x + 27, y + 2, 3, 3);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x + 23, y, 6, 1);
  ctx.fillStyle = '#333';
  ctx.fillRect(x - 1, y - 4, 2, 4);
}

function drawSofa(ctx, x, y) {
  ctx.fillStyle = '#00000008';
  ctx.fillRect(x + 2, y + 24, 60, 6);
  ctx.fillStyle = '#4a7a9f';
  ctx.fillRect(x, y - 4, 60, 12);
  ctx.fillStyle = '#5b9bc4';
  ctx.fillRect(x, y + 6, 60, 18);
  ctx.fillStyle = '#4a8ab4';
  ctx.fillRect(x + 28, y + 7, 3, 16);
  ctx.fillStyle = '#4a7a9f';
  ctx.fillRect(x - 4, y - 2, 6, 26);
  ctx.fillRect(x + 58, y - 2, 6, 26);
  ctx.fillStyle = '#6baed6';
  ctx.fillRect(x + 2, y + 7, 24, 3);
  ctx.fillRect(x + 33, y + 7, 24, 3);
}

function drawFridge(ctx, x, y) {
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x - 16, y - 36, 32, 58);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(x - 14, y - 34, 28, 24);
  ctx.fillRect(x - 14, y - 4, 28, 20);
  ctx.fillStyle = '#aaa';
  ctx.fillRect(x + 10, y - 30, 4, 18);
  ctx.fillRect(x + 10, y, 4, 14);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(x - 14, y - 6, 28, 3);
  ctx.fillStyle = '#c44040';
  ctx.fillRect(x - 10, y - 30, 6, 6);
  ctx.fillStyle = '#4a7fd4';
  ctx.fillRect(x - 2, y - 26, 6, 6);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x - 8, y - 20, 6, 6);
}

function drawChopeTable(ctx, x, y) {
  ctx.fillStyle = '#00000010';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 12, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a08060';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c49a6c';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(x - 7, y + 2, 14, 10);
  ctx.fillStyle = '#e0d8c8';
  ctx.fillRect(x - 5, y + 5, 10, 1);
  ctx.fillRect(x - 5, y + 8, 10, 1);
  ctx.fillStyle = '#c44040';
  ctx.font = 'bold 8px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('CHOPED!', x, y - 4);
}

// ─── Washroom ───

function drawToiletCubicle(ctx, x, y) {
  ctx.fillStyle = '#c8c0b0';
  ctx.fillRect(x - 28, y - 12, 56, 72);
  ctx.fillStyle = '#e0ddd6';
  ctx.fillRect(x - 24, y - 8, 48, 64);
  ctx.fillStyle = '#b0a890';
  ctx.fillRect(x - 16, y + 38, 32, 18);
  ctx.fillStyle = '#888';
  ctx.fillRect(x + 10, y + 44, 5, 5);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x - 10, y, 20, 26);
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x - 8, y + 2, 16, 16);
  ctx.fillStyle = '#d0e8f0';
  ctx.fillRect(x - 6, y + 4, 12, 10);
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x - 12, y - 8, 24, 10);
}

function drawSink(ctx, x, y) {
  ctx.fillStyle = '#aaa';
  ctx.fillRect(x - 14, y - 36, 28, 4);
  ctx.fillStyle = '#c8d8e8';
  ctx.fillRect(x - 12, y - 32, 24, 26);
  ctx.fillStyle = '#d8e8f0';
  ctx.fillRect(x - 10, y - 30, 8, 22);
  ctx.fillStyle = '#e8e8e0';
  ctx.fillRect(x - 16, y - 2, 32, 18);
  ctx.fillStyle = '#d0e0f0';
  ctx.fillRect(x - 12, y + 2, 24, 10);
  ctx.fillStyle = '#999';
  ctx.fillRect(x - 2, y - 6, 6, 8);
  ctx.fillRect(x - 4, y - 8, 10, 4);
}

function drawRestroomSign(ctx, x, y) {
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(x - 22, y, 44, 24);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px "Courier New"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WC', x, y + 12);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 20, y + 2, 40, 20);
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
