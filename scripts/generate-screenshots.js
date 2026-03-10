/**
 * Generate Chrome Web Store screenshots by rendering the pixel office scene.
 * Output: 1280×800 PNG screenshots.
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1280, H = 800;
const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets');

// Map constants (from office-map.js)
const MAP_W = 800, MAP_H = 1020, TILE = 24;
const ZONE_BOUNDS = {
  work:    { x: 20,  y: 60,  w: 370, h: 420 },
  meeting: { x: 410, y: 60,  w: 370, h: 420 },
  rest:    { x: 20,  y: 540, w: 370, h: 440 },
  blocked: { x: 410, y: 540, w: 370, h: 440 },
};
const ZONE_LABELS = {
  work:    { x: 205, y: 60, label: 'WORK AREA', color: '#2563eb', bg: '#dbeafe' },
  meeting: { x: 595, y: 60, label: 'MEETING ROOM', color: '#7c3aed', bg: '#ede9fe' },
  rest:    { x: 205, y: 540, label: 'BREAK ROOM', color: '#16a34a', bg: '#dcfce7' },
  blocked: { x: 595, y: 540, label: 'BLOCKED ZONE', color: '#dc2626', bg: '#fee2e2' },
};

const FLOOR_BASE = '#f0e6d3';
const FLOOR_ALT  = '#e8dcc8';
const WALL_COLOR = '#d4c4a8';
const ZONE_FLOORS = {
  work:    { base: '#e8eef6', alt: '#dde5f0' },
  meeting: { base: '#eee8f6', alt: '#e4dcf0' },
  rest:    { base: '#e4f2e8', alt: '#d8eadc' },
  blocked: { base: '#e8eef0', alt: '#dde6ea' },
};

const SPRITE_FILES = [
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

// Agent positions for the screenshot (placed in different rooms)
const DEMO_AGENTS = [
  { name: 'Macoteng',  sprite: 0,  x: 80,  y: 200, frame: 0 },   // work
  { name: 'Acevideo',  sprite: 1,  x: 180, y: 240, frame: 4 },   // work
  { name: 'FastFood',  sprite: 5,  x: 280, y: 280, frame: 0 },   // work
  { name: 'OfficeA',   sprite: 10, x: 340, y: 200, frame: 1 },   // work
  { name: 'Tingeyes',  sprite: 2,  x: 480, y: 200, frame: 0 },   // meeting
  { name: 'Gobbie',    sprite: 4,  x: 580, y: 240, frame: 1 },   // meeting
  { name: 'Teacher',   sprite: 13, x: 680, y: 280, frame: 0 },   // meeting
  { name: 'Einstein',  sprite: 14, x: 730, y: 200, frame: 4 },   // meeting
  { name: 'Mino',      sprite: 6,  x: 80,  y: 680, frame: 0 },   // break
  { name: 'Student',   sprite: 12, x: 180, y: 720, frame: 2 },   // break
  { name: 'OfficeB',   sprite: 11, x: 280, y: 700, frame: 0 },   // break
  { name: 'Vampy',     sprite: 7,  x: 340, y: 680, frame: 1 },   // break
  { name: 'Beholder',  sprite: 8,  x: 480, y: 700, frame: 0 },   // blocked
  { name: 'Slimey',    sprite: 9,  x: 580, y: 680, frame: 3 },   // blocked
  { name: 'SpecForce', sprite: 15, x: 680, y: 720, frame: 0 },   // blocked
  { name: 'Trump',     sprite: 16, x: 730, y: 700, frame: 4 },   // blocked
];

async function loadSprites() {
  const sprites = [];
  for (const file of SPRITE_FILES) {
    const p = path.join(__dirname, '..', 'public', 'sprites', file);
    sprites.push(await loadImage(p));
  }
  return sprites;
}

function drawFloor(ctx) {
  for (let y = 0; y < MAP_H; y += TILE) {
    for (let x = 0; x < MAP_W; x += TILE) {
      ctx.fillStyle = ((x / TILE) + (y / TILE)) % 2 === 0 ? FLOOR_BASE : FLOOR_ALT;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
}

function drawZones(ctx) {
  for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS)) {
    const zf = ZONE_FLOORS[zoneId];
    for (let ty = bounds.y; ty < bounds.y + bounds.h; ty += TILE) {
      for (let tx = bounds.x; tx < bounds.x + bounds.w; tx += TILE) {
        ctx.fillStyle = ((tx / TILE) + (ty / TILE)) % 2 === 0 ? zf.base : zf.alt;
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }
    const wt = 4;
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, wt);
    ctx.fillRect(bounds.x, bounds.y, wt, bounds.h);
    ctx.fillRect(bounds.x + bounds.w - wt, bounds.y, wt, bounds.h);
    ctx.fillRect(bounds.x, bounds.y + bounds.h - wt, bounds.w, wt);
  }
}

function drawZoneLabels(ctx) {
  for (const [, label] of Object.entries(ZONE_LABELS)) {
    ctx.font = 'bold 13px "Courier New", monospace';
    const textWidth = ctx.measureText(label.label).width;
    const tabW = textWidth + 24;
    const tabH = 22;
    const tabX = label.x - tabW / 2;
    const tabY = label.y + 8;
    ctx.fillStyle = label.bg;
    ctx.fillRect(tabX, tabY, tabW, tabH);
    ctx.fillStyle = label.color;
    ctx.fillRect(tabX, tabY, tabW, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label.label, label.x, tabY + 5);
  }
}

async function generateScreenshot1(sprites) {
  // Main screenshot: office with agents
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#c8b89a';
  ctx.fillRect(0, 0, W, H);

  // Scale and center the office map
  const scale = Math.min(W / MAP_W, H / MAP_H) * 0.85;
  const offsetX = (W - MAP_W * scale) / 2;
  const offsetY = (H - MAP_H * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawFloor(ctx);
  drawZones(ctx);
  drawZoneLabels(ctx);

  // Draw agents
  ctx.imageSmoothingEnabled = false;
  for (const agent of DEMO_AGENTS) {
    const img = sprites[agent.sprite];
    const renderSize = 48;
    const dx = agent.x - renderSize / 2;
    const dy = agent.y - renderSize + 14;

    // Shadow
    ctx.fillStyle = '#00000018';
    ctx.beginPath();
    ctx.ellipse(agent.x, agent.y + 14, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sprite
    ctx.drawImage(img, agent.frame * 32, 0, 32, 32, dx, dy, renderSize, renderSize);

    // Name label
    const nameW = agent.name.length * 6.5 + 10;
    ctx.fillStyle = '#00000060';
    ctx.fillRect(agent.x - nameW / 2, agent.y + 20, nameW, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(agent.name, agent.x, agent.y + 22);
  }
  ctx.imageSmoothingEnabled = true;

  ctx.restore();

  // Title overlay at top
  ctx.fillStyle = '#1e293bdd';
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OpenClaw Agent Workspace Monitor', W / 2, 30);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Real-time pixel office simulation for your AI agents', W / 2, 50);

  return canvas;
}

async function generateScreenshot2(sprites) {
  // Character showcase screenshot
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('17 Unique Pixel Art Characters', W / 2, 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Each agent gets a unique character assigned automatically', W / 2, 55);

  // Draw all 17 characters — show idle frame large + small strip
  const names = [
    'Red Hood', 'Knight', 'Ninja', 'Villager', 'Goblin', 'Fast Food',
    'Minotaur', 'Vampire', 'Beholder', 'Slime', 'Office A', 'Office B',
    'Student', 'Teacher', 'Einstein', 'Spec Forces', 'Trump',
  ];
  const cols = 6;
  const rows = Math.ceil(sprites.length / cols);
  const cellW = Math.floor((W - 40) / cols);
  const cellH = Math.floor((H - 100) / rows);
  const startY = 80;

  ctx.imageSmoothingEnabled = false;

  for (let ci = 0; ci < sprites.length; ci++) {
    const row = Math.floor(ci / cols);
    const col = ci % cols;
    const centerX = 20 + col * cellW + cellW / 2;
    const baseY = startY + row * cellH;

    // Character name
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(names[ci], centerX, baseY);

    // Large idle frame
    const bigSize = Math.min(cellH - 50, cellW - 20, 80);
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(centerX - bigSize / 2 - 2, baseY + 18, bigSize + 4, bigSize + 4);
    ctx.drawImage(sprites[ci], 0, 0, 32, 32, centerX - bigSize / 2, baseY + 20, bigSize, bigSize);

    // Small strip of all 5 frames below
    const smallSize = Math.min(24, (cellW - 30) / 5);
    const stripW = 5 * (smallSize + 2);
    const stripStartX = centerX - stripW / 2;
    for (let f = 0; f < 5; f++) {
      ctx.drawImage(sprites[ci], f * 32, 0, 32, 32, stripStartX + f * (smallSize + 2), baseY + 22 + bigSize + 6, smallSize, smallSize);
    }
  }

  ctx.imageSmoothingEnabled = true;
  return canvas;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sprites = await loadSprites();

  const ss1 = await generateScreenshot1(sprites);
  const p1 = path.join(OUTPUT_DIR, 'screenshot_1_office.png');
  fs.writeFileSync(p1, ss1.toBuffer('image/png'));
  console.log(`✓ ${p1}`);

  const ss2 = await generateScreenshot2(sprites);
  const p2 = path.join(OUTPUT_DIR, 'screenshot_2_characters.png');
  fs.writeFileSync(p2, ss2.toBuffer('image/png'));
  console.log(`✓ ${p2}`);

  console.log('Done! Screenshots in store-assets/');
}

main().catch(console.error);
