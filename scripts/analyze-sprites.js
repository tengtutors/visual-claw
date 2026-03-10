const fs = require('fs');
const { PNG } = require('pngjs');

function analyzeSpriteSheet(filePath) {
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const { width, height } = png;
  console.log(`\n=== ${filePath} ===`);
  console.log(`Dimensions: ${width}x${height}`);

  // Sprite pixel = not very bright (bg is near-white)
  function isSprite(x, y) {
    const idx = (y * width + x) * 4;
    const r = png.data[idx], g = png.data[idx+1], b = png.data[idx+2];
    const brightness = (r + g + b) / 3;
    return brightness < 230;
  }

  // Find row bands
  const rowDensity = [];
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (isSprite(x, y)) count++;
    rowDensity[y] = count;
  }

  const rowHasSprite = rowDensity.map(c => c > 10);
  const bands = findRuns(rowHasSprite, 12);
  console.log(`\nFound ${bands.length} bands:`);

  for (let bi = 0; bi < bands.length; bi++) {
    const band = bands[bi];
    console.log(`\nBand ${bi}: y=${band.start}..${band.end} (h=${band.end - band.start + 1})`);

    // Find sprite columns within band
    const colDensity = [];
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let y = band.start; y <= band.end; y++) if (isSprite(x, y)) count++;
      colDensity[x] = count;
    }

    const colHasSprite = colDensity.map(c => c > 3);
    const sprites = findRuns(colHasSprite, 10);
    console.log(`  ${sprites.length} items:`);
    for (let si = 0; si < sprites.length; si++) {
      const s = sprites[si];
      // Tight Y bounds
      let minY = band.end, maxY = band.start;
      for (let y = band.start; y <= band.end; y++) {
        for (let x = s.start; x <= s.end; x++) {
          if (isSprite(x, y)) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const w = s.end - s.start + 1;
      const h = maxY - minY + 1;
      console.log(`  [${si}] x:${s.start} y:${minY} w:${w} h:${h}`);
    }
  }
}

function findRuns(arr, minGap) {
  const runs = [];
  let inRun = false, start = 0;
  for (let i = 0; i <= arr.length; i++) {
    if (i < arr.length && arr[i]) {
      if (!inRun) { start = i; inRun = true; }
    } else if (inRun) {
      let gap = 0;
      for (let j = i; j < arr.length && !arr[j]; j++) gap++;
      if (gap >= minGap || i >= arr.length) {
        runs.push({ start, end: i - 1 });
        inRun = false;
      }
    }
  }
  return runs;
}

analyzeSpriteSheet('sprite/pixel art character customisation 2.png');
