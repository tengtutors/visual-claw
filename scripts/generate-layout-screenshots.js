/**
 * Generate Chrome Web Store screenshots for layout editing feature
 * and a cropped face icon (128x128).
 * Output: 1280x800 PNGs + 128x128 icon PNG
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1280, H = 800;
const OUTPUT_DIR = path.join(__dirname, '..', 'chrome-store-assets');

// Office tileset path
const TILESET_PATH = path.join(__dirname, '..', 'dist', 'sprites', 'office_tileset_32x32.png');
const FLOOR_PATH = path.join(__dirname, '..', 'dist', 'sprites', 'office_floors.png');
const ICON_PATH = path.join(__dirname, '..', 'public', 'icons', 'icon128.png');

// Shared styling
const BG_COLOR = '#0e1525';
const PANEL_BG = '#1a1f35';
const BORDER_COLOR = '#2a3555';
const ACCENT = '#38d98a';
const TEXT_COLOR = '#e0e0e0';
const SUBTITLE_COLOR = '#60d4f0';
const DIM_COLOR = '#667';

// Draw a rounded rect
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Simulated office floor + furniture for a mini office view
function drawMiniOffice(ctx, tileset, floor, ox, oy, scale) {
  ctx.save();
  ctx.translate(ox, oy);

  // Floor background
  const officeW = 580 * scale, officeH = 480 * scale;
  ctx.fillStyle = '#d8cfc0';
  roundRect(ctx, 0, 0, officeW, officeH, 6);
  ctx.fill();

  // Grid lines (subtle)
  ctx.strokeStyle = '#c8bfb0';
  ctx.lineWidth = 0.5;
  const tileSize = 32 * scale;
  for (let gx = 0; gx <= officeW; gx += tileSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, officeH); ctx.stroke();
  }
  for (let gy = 0; gy <= officeH; gy += tileSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(officeW, gy); ctx.stroke();
  }

  // Draw some furniture pieces from tileset
  ctx.imageSmoothingEnabled = false;
  const s = 32; // source tile size
  const d = tileSize * 2; // draw size (2 tiles)

  // Shelves (top-left)
  ctx.drawImage(tileset, 384, 352, 64, 96, tileSize * 1, tileSize * 0.5, d, d * 1.5);
  ctx.drawImage(tileset, 448, 352, 64, 96, tileSize * 3.5, tileSize * 0.5, d, d * 1.5);

  // Desks (bottom area)
  ctx.drawImage(tileset, 96, 576, 32, 64, tileSize * 3, tileSize * 8, tileSize, tileSize * 2);
  ctx.drawImage(tileset, 96, 576, 32, 64, tileSize * 7, tileSize * 8, tileSize, tileSize * 2);
  ctx.drawImage(tileset, 96, 576, 32, 64, tileSize * 11, tileSize * 8, tileSize, tileSize * 2);

  // Laptops on desks
  ctx.drawImage(tileset, 352, 768, 32, 32, tileSize * 3.2, tileSize * 8.5, tileSize * 0.8, tileSize * 0.8);
  ctx.drawImage(tileset, 352, 768, 32, 32, tileSize * 7.2, tileSize * 8.5, tileSize * 0.8, tileSize * 0.8);

  // Sofa area (mid-right)
  ctx.drawImage(tileset, 64, 512, 32, 64, tileSize * 12, tileSize * 3, tileSize, tileSize * 2);
  ctx.drawImage(tileset, 64, 512, 32, 64, tileSize * 12, tileSize * 5, tileSize, tileSize * 2);

  // Vending machine (top-right)
  ctx.drawImage(tileset, 448, 512, 64, 96, tileSize * 10, tileSize * 0.5, d, d * 1.5);

  // Plants
  ctx.drawImage(tileset, 96, 896, 32, 64, tileSize * 0.5, tileSize * 10, tileSize, tileSize * 2);
  ctx.drawImage(tileset, 96, 896, 32, 64, tileSize * 14, tileSize * 10, tileSize, tileSize * 2);

  ctx.imageSmoothingEnabled = true;
  ctx.restore();

  return { w: officeW, h: officeH };
}

// Draw a highlighted furniture piece being dragged
function drawDragHighlight(ctx, x, y, w, h, label) {
  // Dashed selection box
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#38d98a';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  ctx.setLineDash([]);

  // Corner handles
  const handleSize = 6;
  ctx.fillStyle = '#38d98a';
  [[x - 4, y - 4], [x + w - 2, y - 4], [x - 4, y + h - 2], [x + w - 2, y + h - 2]].forEach(([hx, hy]) => {
    ctx.fillRect(hx, hy, handleSize, handleSize);
  });

  // Label
  if (label) {
    ctx.font = 'bold 12px "Courier New", monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#38d98a';
    roundRect(ctx, x + w / 2 - tw / 2 - 6, y - 24, tw + 12, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y - 15);
  }

  ctx.restore();
}

// Draw a side panel UI
function drawSidePanel(ctx, x, y, w, h, items) {
  ctx.fillStyle = PANEL_BG;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  let cy = y + 16;
  for (const item of items) {
    if (item.type === 'title') {
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `bold ${item.size || 18}px "Courier New", monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.text, x + 16, cy);
      cy += (item.size || 18) + 10;
    } else if (item.type === 'subtitle') {
      ctx.fillStyle = SUBTITLE_COLOR;
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.text, x + 16, cy);
      cy += 20;
    } else if (item.type === 'divider') {
      ctx.strokeStyle = '#334';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 16, cy + 4);
      ctx.lineTo(x + w - 16, cy + 4);
      ctx.stroke();
      cy += 12;
    } else if (item.type === 'furniture-item') {
      // Category icon + name + interactive badge
      const rowH = 36;
      const isSelected = item.selected;

      if (isSelected) {
        ctx.fillStyle = '#1e2a40';
        roundRect(ctx, x + 8, cy - 2, w - 16, rowH, 4);
        ctx.fill();
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1;
        roundRect(ctx, x + 8, cy - 2, w - 16, rowH, 4);
        ctx.stroke();
      }

      // Icon placeholder
      ctx.fillStyle = item.iconColor || '#445';
      roundRect(ctx, x + 16, cy + 4, 24, 24, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon || '?', x + 28, cy + 16);

      // Name
      ctx.fillStyle = isSelected ? '#fff' : TEXT_COLOR;
      ctx.font = '13px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name, x + 48, cy + 16);

      // Badge
      if (item.badge) {
        const bw = ctx.measureText(item.badge).width + 10;
        ctx.fillStyle = item.badgeColor || '#2a6';
        roundRect(ctx, x + w - bw - 20, cy + 6, bw, 20, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.badge, x + w - bw / 2 - 20, cy + 16);
      }

      cy += rowH + 4;
    } else if (item.type === 'button') {
      const bw = 120, bh = 32;
      ctx.fillStyle = item.color || ACCENT;
      roundRect(ctx, x + w / 2 - bw / 2, cy, bw, bh, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, x + w / 2, cy + bh / 2);
      cy += bh + 12;
    } else if (item.type === 'spacer') {
      cy += item.h || 10;
    } else if (item.type === 'input') {
      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = '#3a4';
      ctx.lineWidth = 1;
      roundRect(ctx, x + 16, cy, w - 32, 28, 4);
      ctx.fill();
      roundRect(ctx, x + 16, cy, w - 32, 28, 4);
      ctx.stroke();
      ctx.fillStyle = item.value ? TEXT_COLOR : '#556';
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.value || item.placeholder || '', x + 24, cy + 14);
      cy += 38;
    } else if (item.type === 'label') {
      ctx.fillStyle = DIM_COLOR;
      ctx.font = '11px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.text, x + 16, cy);
      cy += 18;
    } else if (item.type === 'toggle-row') {
      const rowH = 30;
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '12px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.name, x + 16, cy + rowH / 2);

      // Toggle switch
      const tw = 36, th = 18;
      const tx = x + w - tw - 20, ty = cy + (rowH - th) / 2;
      ctx.fillStyle = item.on ? ACCENT : '#445';
      roundRect(ctx, tx, ty, tw, th, th / 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(item.on ? tx + tw - th / 2 : tx + th / 2, ty + th / 2, th / 2 - 3, 0, Math.PI * 2);
      ctx.fill();

      cy += rowH + 4;
    }
  }
}

// Draw move arrows / cursor hint
function drawMoveArrows(ctx, x, y) {
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // A cursor icon
  ctx.fillStyle = '#ffffffcc';
  // Arrow shape pointing to furniture
  const arrowLen = 30;
  ctx.strokeStyle = '#38d98a';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x - arrowLen, y - arrowLen);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cursor triangle
  ctx.fillStyle = '#ffffffdd';
  ctx.beginPath();
  ctx.moveTo(x - arrowLen - 2, y - arrowLen - 2);
  ctx.lineTo(x - arrowLen - 2, y - arrowLen + 16);
  ctx.lineTo(x - arrowLen + 6, y - arrowLen + 10);
  ctx.closePath();
  ctx.fill();
}

async function generateScreenshot3(tileset, floor) {
  // Screenshot: Drag & Drop Layout Editing
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Title bar
  ctx.fillStyle = '#111a2eee';
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Drag & Drop Layout Editor', 40, 28);
  ctx.fillStyle = SUBTITLE_COLOR;
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Customize your office by dragging furniture to new positions', 40, 52);

  // Mini office on the left
  const officeX = 40, officeY = 100;
  const { w: ow, h: oh } = drawMiniOffice(ctx, tileset, floor, officeX, officeY, 1.1);

  // Draw a piece being dragged (a desk) with ghost trail
  const dragX = officeX + 240, dragY = officeY + 280;
  const dragW = 50, dragH = 50;

  // Ghost at original position
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#8af';
  ctx.fillRect(officeX + 100, officeY + 340, dragW, dragH);
  ctx.globalAlpha = 1.0;

  // The piece at new position with highlight
  ctx.fillStyle = '#4a7aaa';
  ctx.fillRect(dragX, dragY, dragW, dragH);
  drawDragHighlight(ctx, dragX, dragY, dragW, dragH, 'Sofa');

  // Cursor
  drawMoveArrows(ctx, dragX + dragW / 2, dragY + dragH / 2);

  // Side panel: furniture list
  const panelX = ow + 80, panelY = 100, panelW = 320, panelH = 580;
  drawSidePanel(ctx, panelX, panelY, panelW, panelH, [
    { type: 'title', text: 'Furniture', size: 16 },
    { type: 'subtitle', text: 'Click to select, drag to move' },
    { type: 'divider' },
    { type: 'furniture-item', name: 'Tall Shelf A', icon: '\u{1F4DA}', iconColor: '#3a5040', selected: false },
    { type: 'furniture-item', name: 'Tall Shelf B', icon: '\u{1F4DA}', iconColor: '#3a5040', selected: false },
    { type: 'furniture-item', name: 'Sofa', icon: '\u{1FA91}', iconColor: '#5a3060', selected: true, badge: 'MOVING', badgeColor: '#e8a030' },
    { type: 'furniture-item', name: 'Vending Machine', icon: '\u{1F3B0}', iconColor: '#304060', selected: false },
    { type: 'furniture-item', name: 'Laptop', icon: '\u{1F4BB}', iconColor: '#2a4a5a', selected: false, badge: 'Cron Tasks', badgeColor: '#38d' },
    { type: 'furniture-item', name: 'Metal Table', icon: '\u{1F5A5}', iconColor: '#404050', selected: false },
    { type: 'furniture-item', name: 'Chair', icon: '\u{1FA91}', iconColor: '#504030', selected: false },
    { type: 'furniture-item', name: 'Plant', icon: '\u{1F331}', iconColor: '#2a5a2a', selected: false },
    { type: 'furniture-item', name: 'Rug', icon: '\u{1F7E5}', iconColor: '#6a4a3a', selected: false, badge: 'Gateway', badgeColor: '#38d' },
    { type: 'furniture-item', name: 'Blackboard', icon: '\u{1F4CB}', iconColor: '#2a4a2a', selected: false },
    { type: 'divider' },
    { type: 'button', text: 'Save Layout', color: ACCENT },
  ]);

  // "Edit Mode" toggle indicator at top-right
  ctx.fillStyle = '#1a2a40';
  roundRect(ctx, W - 200, 12, 170, 44, 8);
  ctx.fill();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.5;
  roundRect(ctx, W - 200, 12, 170, 44, 8);
  ctx.stroke();
  ctx.fillStyle = ACCENT;
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u270F\uFE0F  Edit Mode ON', W - 115, 34);

  return canvas;
}

async function generateScreenshot4(tileset, floor) {
  // Screenshot: Interactive Furniture / Panels
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Title bar
  ctx.fillStyle = '#111a2eee';
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Interactive Office Furniture', 40, 28);
  ctx.fillStyle = SUBTITLE_COLOR;
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Click items in the office to manage agents, tasks, and gateway', 40, 52);

  // Mini office (slightly smaller, left side)
  const officeX = 30, officeY = 95;
  const { w: ow, h: oh } = drawMiniOffice(ctx, tileset, floor, officeX, officeY, 0.95);

  // Highlight an interactive item (the laptop → cron tasks)
  const laptopX = officeX + 112, laptopY = officeY + 280;
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(laptopX - 6, laptopY - 6, 36, 36);
  ctx.setLineDash([]);

  // Interaction icon above it
  ctx.fillStyle = '#f0c040';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('\u23F0', laptopX + 12, laptopY - 10);

  // Also highlight the crates (Create Agent)
  const crateX = officeX + 35, crateY = officeY + 8;
  ctx.strokeStyle = '#60d0f0';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(crateX - 4, crateY - 4, 68, 48);
  ctx.setLineDash([]);
  ctx.fillStyle = '#60d0f0';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('\u{1F4BB}', crateX + 30, crateY - 8);

  // Draw the "Create Agent" panel (right side, top)
  const p1x = ow + 60, p1y = 85, p1w = 340, p1h = 290;
  drawSidePanel(ctx, p1x, p1y, p1w, p1h, [
    { type: 'title', text: '\u{1F4BB} Create Agent', size: 15 },
    { type: 'subtitle', text: 'Deploy a new AI agent' },
    { type: 'divider' },
    { type: 'label', text: 'Agent Name' },
    { type: 'input', value: 'research-bot' },
    { type: 'label', text: 'Bot Token (Telegram)' },
    { type: 'input', value: '7284619:AAF...' },
    { type: 'label', text: 'Task Description' },
    { type: 'input', value: 'Research AI papers daily' },
    { type: 'spacer', h: 6 },
    { type: 'button', text: 'Deploy Agent', color: ACCENT },
  ]);

  // Draw the "Scheduled Tasks" panel (right side, bottom)
  const p2x = ow + 60, p2y = p1y + p1h + 20, p2w = 340, p2h = 310;
  drawSidePanel(ctx, p2x, p2y, p2w, p2h, [
    { type: 'title', text: '\u23F0 Scheduled Tasks', size: 15 },
    { type: 'subtitle', text: 'Cron jobs from OpenClaw' },
    { type: 'divider' },
    { type: 'toggle-row', name: 'Daily report', on: true },
    { type: 'toggle-row', name: 'Check emails', on: true },
    { type: 'toggle-row', name: 'Backup logs', on: false },
    { type: 'divider' },
    { type: 'label', text: 'New Schedule' },
    { type: 'input', placeholder: 'every 6h' },
    { type: 'label', text: 'Message' },
    { type: 'input', placeholder: 'Send weekly summary' },
    { type: 'spacer', h: 4 },
    { type: 'button', text: 'Add Job', color: '#38a8d8' },
  ]);

  // Connection lines from furniture to panels
  ctx.strokeStyle = '#60d0f044';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  // Crate → Create Agent panel
  ctx.beginPath();
  ctx.moveTo(crateX + 64, crateY + 20);
  ctx.lineTo(p1x, p1y + 40);
  ctx.stroke();
  // Laptop → Cron panel
  ctx.beginPath();
  ctx.moveTo(laptopX + 30, laptopY + 12);
  ctx.lineTo(p2x, p2y + 40);
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas;
}

async function generateFaceIcon() {
  const icon = await loadImage(ICON_PATH);

  // The character is 128x128. The head/face is roughly the top 55% of the image.
  // Let's crop to focus on the face. Looking at pixel art characters,
  // the head is typically in the upper portion.
  // We want to crop a square region around the face and scale to 128x128.

  // Crop to face filling the frame - include full head, cut below chin
  const srcX = 24, srcY = 6, srcW = 80, srcH = 66;

  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 128, 128);

  // Draw cropped face, scaled to fill 128x128
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(icon, srcX, srcY, srcW, srcH, 0, 0, 128, 128);

  return canvas;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tileset = await loadImage(TILESET_PATH);
  const floor = await loadImage(FLOOR_PATH);

  // Screenshot 3: Layout editing / drag & drop
  const ss3 = await generateScreenshot3(tileset, floor);
  const p3 = path.join(OUTPUT_DIR, 'screenshot-layout-editor-1280x800.png');
  fs.writeFileSync(p3, ss3.toBuffer('image/png'));
  console.log(`Done: ${p3}`);

  // Screenshot 4: Interactive furniture / panels
  const ss4 = await generateScreenshot4(tileset, floor);
  const p4 = path.join(OUTPUT_DIR, 'screenshot-interactive-panels-1280x800.png');
  fs.writeFileSync(p4, ss4.toBuffer('image/png'));
  console.log(`Done: ${p4}`);

  // Face icon
  const faceIcon = await generateFaceIcon();
  const iconOut = path.join(OUTPUT_DIR, 'icon-face-128x128.png');
  fs.writeFileSync(iconOut, faceIcon.toBuffer('image/png'));
  console.log(`Done: ${iconOut}`);

  console.log('\nAll assets generated!');
}

main().catch(console.error);
