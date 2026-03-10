/**
 * Generate Chrome Web Store promotional images.
 * Small promo: 440×280
 * Marquee promo: 1400×560
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'store-assets');
const SPRITES_DIR = path.join(__dirname, '..', 'public', 'sprites');

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

async function loadSprites() {
  const sprites = [];
  for (const file of SPRITE_FILES) {
    sprites.push(await loadImage(path.join(SPRITES_DIR, file)));
  }
  return sprites;
}

async function generateSmallPromo(sprites) {
  const W = 440, H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background gradient
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  // Floor tiles at bottom
  ctx.fillStyle = '#f0e6d320';
  for (let x = 0; x < W; x += 20) {
    for (let y = H - 80; y < H; y += 20) {
      if (((x / 20) + (y / 20)) % 2 === 0) {
        ctx.fillRect(x, y, 20, 20);
      }
    }
  }

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OpenClaw Agent', W / 2, 24);
  ctx.fillText('Workspace Monitor', W / 2, 50);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px "Courier New", monospace';
  ctx.fillText('Pixel office simulation for AI agents', W / 2, 82);

  // Draw 7 characters in a row
  ctx.imageSmoothingEnabled = false;
  const charSize = 48;
  const chars = [0, 5, 2, 14, 12, 15, 9]; // Red Hood, FastFood, Ninja, Einstein, Student, SpecForces, Slime
  const totalW = chars.length * charSize + (chars.length - 1) * 12;
  const startX = (W - totalW) / 2;

  for (let i = 0; i < chars.length; i++) {
    const cx = startX + i * (charSize + 12) + charSize / 2;
    const cy = 170;

    // Shadow
    ctx.fillStyle = '#00000030';
    ctx.beginPath();
    ctx.ellipse(cx, cy + charSize / 2 + 4, charSize * 0.3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character
    ctx.drawImage(
      sprites[chars[i]],
      0, 0, 32, 32,
      cx - charSize / 2, cy - charSize / 2, charSize, charSize
    );
  }
  ctx.imageSmoothingEnabled = true;

  // Bottom tagline
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('17 unique characters • 4 office rooms • real-time monitoring', W / 2, H - 24);

  return canvas;
}

async function generateMarqueePromo(sprites) {
  const W = 1400, H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);

  // Floor tiles across bottom third
  ctx.fillStyle = '#f0e6d315';
  for (let x = 0; x < W; x += 24) {
    for (let y = H - 180; y < H; y += 24) {
      if (((x / 24) + (y / 24)) % 2 === 0) {
        ctx.fillRect(x, y, 24, 24);
      }
    }
  }

  // Room color zones in background
  const zones = [
    { x: 80, y: H - 170, w: 280, h: 140, color: '#e8eef610' },
    { x: 400, y: H - 170, w: 280, h: 140, color: '#eee8f610' },
    { x: 720, y: H - 170, w: 280, h: 140, color: '#e4f2e810' },
    { x: 1040, y: H - 170, w: 280, h: 140, color: '#e8eef010' },
  ];
  for (const z of zones) {
    ctx.fillStyle = z.color;
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeStyle = '#ffffff10';
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x, z.y, z.w, z.h);
  }

  // Room labels
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const roomLabels = [
    { x: 220, y: H - 165, label: 'WORK AREA', color: '#3b82f6' },
    { x: 540, y: H - 165, label: 'MEETING ROOM', color: '#8b5cf6' },
    { x: 860, y: H - 165, label: 'BREAK ROOM', color: '#22c55e' },
    { x: 1180, y: H - 165, label: 'BLOCKED ZONE', color: '#ef4444' },
  ];
  for (const rl of roomLabels) {
    ctx.fillStyle = rl.color + '80';
    ctx.fillText(rl.label, rl.x, rl.y);
  }

  // Title (left side, large)
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('OpenClaw Agent', W / 2, 40);
  ctx.fillText('Workspace Monitor', W / 2, 95);

  // Subtitle
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText('Watch your AI agents come alive in a pixel art office simulation', W / 2, 160);

  // Feature pills
  ctx.font = 'bold 13px "Courier New", monospace';
  const pills = ['17 Characters', '5 Animations', '4 Rooms', 'Real-time', 'Singapore Theme'];
  const pillW = 130;
  const pillTotalW = pills.length * pillW + (pills.length - 1) * 12;
  const pillStartX = (W - pillTotalW) / 2;

  for (let i = 0; i < pills.length; i++) {
    const px = pillStartX + i * (pillW + 12);
    const py = 200;
    ctx.fillStyle = '#2a3a5a';
    ctx.fillRect(px, py, pillW, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px, py, pillW, 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(pills[i], px + pillW / 2, py + 8);
  }

  // Draw all 17 characters spread across the rooms
  ctx.imageSmoothingEnabled = false;
  const charSize = 56;
  const charPositions = [
    // Room 1
    { sprite: 0,  x: 110, frame: 0 },
    { sprite: 1,  x: 190, frame: 4 },
    { sprite: 10, x: 270, frame: 0 },
    { sprite: 5,  x: 340, frame: 1 },
    // Room 2
    { sprite: 2,  x: 430, frame: 0 },
    { sprite: 3,  x: 510, frame: 1 },
    { sprite: 13, x: 590, frame: 0 },
    { sprite: 14, x: 660, frame: 4 },
    // Room 3
    { sprite: 4,  x: 750, frame: 2 },
    { sprite: 6,  x: 830, frame: 0 },
    { sprite: 12, x: 910, frame: 1 },
    { sprite: 11, x: 980, frame: 0 },
    // Room 4
    { sprite: 7,  x: 1070, frame: 0 },
    { sprite: 8,  x: 1140, frame: 3 },
    { sprite: 9,  x: 1210, frame: 0 },
    { sprite: 15, x: 1280, frame: 0 },
    { sprite: 16, x: 1350, frame: 4 },
  ];

  for (const cp of charPositions) {
    const cy = H - 80;

    // Shadow
    ctx.fillStyle = '#00000025';
    ctx.beginPath();
    ctx.ellipse(cp.x, cy + charSize / 2 + 4, charSize * 0.28, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character
    ctx.drawImage(
      sprites[cp.sprite],
      cp.frame * 32, 0, 32, 32,
      cp.x - charSize / 2, cy - charSize / 2, charSize, charSize
    );
  }
  ctx.imageSmoothingEnabled = true;

  return canvas;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const sprites = await loadSprites();

  const small = await generateSmallPromo(sprites);
  const p1 = path.join(OUTPUT_DIR, 'promo_small_440x280.png');
  fs.writeFileSync(p1, small.toBuffer('image/png'));
  console.log(`✓ ${p1}`);

  const marquee = await generateMarqueePromo(sprites);
  const p2 = path.join(OUTPUT_DIR, 'promo_marquee_1400x560.png');
  fs.writeFileSync(p2, marquee.toBuffer('image/png'));
  console.log(`✓ ${p2}`);

  console.log('Done!');
}

main().catch(console.error);
