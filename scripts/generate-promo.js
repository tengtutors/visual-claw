/**
 * Generate Chrome Web Store promotional images for OpenClaw Live Workspace.
 * Small promo: 440x280
 * Marquee promo: 1400x560
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'chrome-store-assets');
const ASSET = (...parts) => path.join(ROOT, 'chrome-store-assets', ...parts);

const SOURCES = {
  faceIcon: ASSET('icon-face-128x128.png'),
  office: ASSET('screenshot-office-1280x800.png'),
  layout: ASSET('screenshot-layout-editor-1280x800.png'),
  panels: ASSET('screenshot-interactive-panels-1280x800.png'),
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(ctx, image, x, y, w, h, accent) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.clip();
  ctx.drawImage(image, x, y, w, h);
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();
}

function drawBadge(ctx, label, x, y, bg, fg) {
  ctx.save();
  ctx.font = 'bold 16px "Courier New"';
  const padX = 16;
  const width = ctx.measureText(label).width + padX * 2;
  roundRect(ctx, x, y, width, 34, 17);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + 17);
  ctx.restore();
}

async function loadSources() {
  const entries = await Promise.all(
    Object.entries(SOURCES).map(async ([key, file]) => [key, await loadImage(file)])
  );
  return Object.fromEntries(entries);
}

async function generateSmallPromo(images) {
  const W = 440;
  const H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#07111f');
  gradient.addColorStop(0.55, '#13233a');
  gradient.addColorStop(1, '#0b1321');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(i * 44, 0, 22, H);
  }

  drawCard(ctx, images.office, 220, 26, 194, 108, '#38bdf8');
  drawCard(ctx, images.layout, 252, 146, 162, 96, '#22c55e');

  ctx.save();
  roundRect(ctx, 20, 28, 178, 178, 28);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
  ctx.fill();
  ctx.restore();

  ctx.drawImage(images.faceIcon, 48, 44, 120, 120);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 24px "Courier New"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('OpenClaw', 24, 172);
  ctx.fillText('Live Workspace', 24, 198);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '12px "Courier New"';
  ctx.fillText('Watch agents move, think, and work live', 24, 236);

  drawBadge(ctx, 'AUTO CONNECT', 220, 18, '#082f49', '#7dd3fc');
  drawBadge(ctx, 'EDIT LAYOUT', 286, 242, '#052e16', '#86efac');

  return canvas;
}

async function generateMarqueePromo(images) {
  const W = 1400;
  const H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#050b16');
  bg.addColorStop(0.5, '#101f37');
  bg.addColorStop(1, '#0a1020');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  for (let i = -1; i < 12; i++) {
    ctx.fillRect(i * 140, 0, 60, H);
  }

  ctx.drawImage(images.faceIcon, 78, 66, 138, 138);

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 60px "Courier New"';
  ctx.fillText('OpenClaw', 248, 82);
  ctx.fillText('Live Workspace', 248, 150);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '22px "Courier New"';
  ctx.fillText('Real-time agent office for OpenClaw with auto gateway discovery', 252, 238);

  drawBadge(ctx, 'LIVE AGENTS', 252, 304, '#082f49', '#7dd3fc');
  drawBadge(ctx, 'INTERACTIVE MAP', 418, 304, '#3f1d0d', '#fdba74');
  drawBadge(ctx, 'EDIT LAYOUT', 648, 304, '#052e16', '#86efac');

  drawCard(ctx, images.office, 824, 54, 500, 180, '#38bdf8');
  drawCard(ctx, images.panels, 770, 258, 284, 214, '#f59e0b');
  drawCard(ctx, images.layout, 1072, 258, 252, 214, '#22c55e');

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px "Courier New"';
  ctx.fillText('See work, meetings, blockers, and collaboration at a glance.', 252, 368);
  ctx.fillText('Open the layout editor directly from the extension.', 252, 394);
  ctx.fillText('Built for users who want OpenClaw visibility without setup friction.', 252, 420);

  return canvas;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const images = await loadSources();

  const small = await generateSmallPromo(images);
  const smallPath = path.join(OUTPUT_DIR, 'small-promo-440x280.png');
  fs.writeFileSync(smallPath, small.toBuffer('image/png'));
  console.log(`Generated ${smallPath}`);

  const marquee = await generateMarqueePromo(images);
  const marqueePath = path.join(OUTPUT_DIR, 'marquee-1400x560.png');
  fs.writeFileSync(marqueePath, marquee.toBuffer('image/png'));
  console.log(`Generated ${marqueePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
