/**
 * Auto-crop transparent/white borders from a sprite PNG and resize to 48x48.
 * Usage: node crop-and-resize.js <input.png> <output.png>
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node crop-and-resize.js <input> <output>');
  process.exit(1);
}

const TARGET_SIZE = 48;

const src = PNG.sync.read(fs.readFileSync(inputPath));
const { width, height, data } = src;

// Detect non-background pixels (not white/near-white and not transparent)
function isContent(x, y) {
  const idx = (y * width + x) * 4;
  const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
  if (a < 30) return false; // transparent
  if (r > 240 && g > 240 && b > 240) return false; // near-white bg
  return true;
}

// Find bounding box of content
let minX = width, maxX = 0, minY = height, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (isContent(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

if (minX > maxX) {
  console.error(`  No content found in ${inputPath}`);
  process.exit(1);
}

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
console.log(`  Crop: ${cropW}x${cropH} from (${minX},${minY})`);

// Make it square (use the larger dimension)
const side = Math.max(cropW, cropH);
const padX = Math.floor((side - cropW) / 2);
const padY = Math.floor((side - cropH) / 2);

// Create cropped square image
const cropped = new PNG({ width: side, height: side, fill: true });
// Fill with transparent
for (let i = 0; i < side * side * 4; i += 4) {
  cropped.data[i] = 0;
  cropped.data[i + 1] = 0;
  cropped.data[i + 2] = 0;
  cropped.data[i + 3] = 0;
}

// Copy content pixels (preserving alpha)
for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const srcIdx = ((minY + y) * width + (minX + x)) * 4;
    const dstIdx = ((padY + y) * side + (padX + x)) * 4;
    const a = data[srcIdx + 3];
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    // Skip near-white background pixels — make them transparent
    if (a > 30 && !(r > 240 && g > 240 && b > 240)) {
      cropped.data[dstIdx] = r;
      cropped.data[dstIdx + 1] = g;
      cropped.data[dstIdx + 2] = b;
      cropped.data[dstIdx + 3] = a;
    }
  }
}

// Nearest-neighbor resize to TARGET_SIZE x TARGET_SIZE (preserves pixel art crispness)
const out = new PNG({ width: TARGET_SIZE, height: TARGET_SIZE, fill: true });
for (let i = 0; i < TARGET_SIZE * TARGET_SIZE * 4; i += 4) {
  out.data[i] = 0;
  out.data[i + 1] = 0;
  out.data[i + 2] = 0;
  out.data[i + 3] = 0;
}

for (let y = 0; y < TARGET_SIZE; y++) {
  for (let x = 0; x < TARGET_SIZE; x++) {
    const srcX = Math.floor(x * side / TARGET_SIZE);
    const srcY = Math.floor(y * side / TARGET_SIZE);
    const srcIdx = (srcY * side + srcX) * 4;
    const dstIdx = (y * TARGET_SIZE + x) * 4;
    out.data[dstIdx] = cropped.data[srcIdx];
    out.data[dstIdx + 1] = cropped.data[srcIdx + 1];
    out.data[dstIdx + 2] = cropped.data[srcIdx + 2];
    out.data[dstIdx + 3] = cropped.data[srcIdx + 3];
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(out));
const outSize = fs.statSync(outputPath).size;
console.log(`  Output: ${TARGET_SIZE}x${TARGET_SIZE} → ${outputPath} (${(outSize / 1024).toFixed(1)}KB)`);
