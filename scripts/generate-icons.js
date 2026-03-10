/**
 * Generate Chrome extension icons from character sprite strips.
 * Creates pixel-art character icons at 16×16, 48×48, 128×128.
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 48, 128];
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');
const SPRITE = path.join(__dirname, '..', 'public', 'sprites', 'char01_red_hood_strip_5f.png');

async function generateIcons() {
  const spriteImg = await loadImage(SPRITE);

  for (const size of SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Rounded background
    const r = Math.max(2, Math.round(size * 0.18));
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 0, 0, size, size, r);
    ctx.fill();

    // Subtle top highlight
    ctx.fillStyle = '#2a3a5a';
    roundRect(ctx, 1, 1, size - 2, Math.round(size * 0.45), r - 1);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#0f1729';
    ctx.lineWidth = Math.max(1, Math.round(size * 0.025));
    roundRect(ctx, 0, 0, size, size, r);
    ctx.stroke();

    // Draw character sprite — crisp pixel art
    ctx.imageSmoothingEnabled = false;
    const spriteSize = Math.round(size * 0.78);
    const offsetX = Math.round((size - spriteSize) / 2);
    const offsetY = Math.round((size - spriteSize) / 2) + Math.round(size * 0.06);
    ctx.drawImage(
      spriteImg,
      0, 0, 32, 32,                                    // source: frame 0 (front)
      offsetX, offsetY, spriteSize, spriteSize          // dest: centered
    );

    // Tiny shadow under feet
    if (size >= 48) {
      ctx.fillStyle = '#00000025';
      ctx.beginPath();
      ctx.ellipse(size / 2, offsetY + spriteSize + 1, spriteSize * 0.3, Math.max(1, size * 0.025), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const outPath = path.join(OUTPUT_DIR, `icon${size}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`✓ icon${size}.png`);
  }
  console.log('Done!');
}

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

generateIcons().catch(console.error);
