// ── Constants ──
const TILE = 32;
const SCALE = 1.95;
const ST = TILE * SCALE;
const ROOM_COLS = 12;
const ROOM_ROWS = 13;
const ROOM_OX = 115;
const ROOM_OY = 46;
const MAP_W = 860;
const MAP_H = 860;

const mapCanvas = document.getElementById('map');
const mapCtx = mapCanvas.getContext('2d');
mapCanvas.width = MAP_W;
mapCanvas.height = MAP_H;

let tileset = null;
let placedItems = [];
let selectedCatalogItem = null;
let selectedPlacedItem = null;
let dragItem = null;
let dragOffX = 0, dragOffY = 0;
let deleteMode = false;
let undoStack = [];
const VS = MAP_W / 980; // view scale
const OFFICE_LAYOUT_URL = 'http://127.0.0.1:18790/office-layout';
const TILESET_SRC = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
  ? chrome.runtime.getURL('assets/office/tilesets/Office Tileset All 32x32 no shadow.png')
  : '../public/assets/office/tilesets/Office Tileset All 32x32 no shadow.png';

// ── Furniture Catalog ──
const CATALOG = [
  // ── Desks ──
  { category: 'Desks', name: 'Long Counter A', src: {x:128,y:0,w:96,h:64}, hasCollision: true },
  { category: 'Desks', name: 'Drawer Unit A', src: {x:0,y:128,w:64,h:64}, hasCollision: true },
  { category: 'Desks', name: 'Corner Unit B', src: {x:448,y:0,w:64,h:64}, hasCollision: true },
  { category: 'Desks', name: 'Side Unit B', src: {x:448,y:64,w:64,h:64}, hasCollision: true },

  // ── Furniture ──
  { category: 'Furniture', name: 'Chair', src: {x:192,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Crates', src: {x:448,y:896,w:64,h:64}, hasCollision: true, interactive: 'create_agent' },
  { category: 'Furniture', name: 'Metal Table', src: {x:96,y:576,w:32,h:64}, hasCollision: false },
  { category: 'Furniture', name: 'Coffee Table', src: {x:0,y:576,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Sofa', src: {x:64,y:512,w:32,h:64}, hasCollision: true, interactive: 'cron_tasks' },
  { category: 'Furniture', name: 'Sofa B', src: {x:96,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Wooden Table', src: {x:32,y:576,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Table C', src: {x:64,y:576,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Sofa Facing A', src: {x:0,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Sofa Facing B', src: {x:32,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Chair Facing A', src: {x:128,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Chair Facing B', src: {x:160,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Chair Facing C', src: {x:224,y:512,w:32,h:64}, hasCollision: true },
  { category: 'Furniture', name: 'Water Cooler', src: {x:320,y:512,w:32,h:96}, hasCollision: true },

  // ── Walls ──
  { category: 'Walls', name: 'Metal Wall A', src: {x:0,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'Metal Wall B', src: {x:32,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'Wooden Wall A', src: {x:64,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'Wooden Wall B', src: {x:96,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'Tatami Wall A', src: {x:128,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'Tatami Wall B', src: {x:160,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'White Wall A', src: {x:192,y:448,w:32,h:64}, hasCollision: true },
  { category: 'Walls', name: 'White Wall B', src: {x:224,y:448,w:32,h:64}, hasCollision: true },

  // ── Storage ──
  { category: 'Storage', name: 'Tall Shelf A', src: {x:448,y:352,w:64,h:96}, hasCollision: true },
  { category: 'Storage', name: 'Tall Shelf B', src: {x:384,y:352,w:64,h:96}, hasCollision: true },
  { category: 'Storage', name: 'Bookcase A', src: {x:256,y:352,w:64,h:96}, hasCollision: true },
  { category: 'Storage', name: 'Bookcase B', src: {x:320,y:352,w:64,h:96}, hasCollision: true },
  { category: 'Storage', name: 'Fridge', src: {x:384,y:512,w:32,h:96}, hasCollision: true },
  { category: 'Storage', name: 'Blackboard', src: {x:0,y:832,w:64,h:64}, hasCollision: true },
  { category: 'Storage', name: 'Vending Machine', src: {x:448,y:512,w:64,h:96}, hasCollision: true, interactive: 'workspace_config' },
  { category: 'Storage', name: 'Box Stack A', src: {x:320,y:896,w:64,h:64}, hasCollision: true },

  // ── Tech ──
  { category: 'Tech', name: 'Laptop', src: {x:352,y:768,w:32,h:32}, hasCollision: false },
  { category: 'Tech', name: 'Divider', src: {x:448,y:448,w:32,h:64}, hasCollision: false },
  { category: 'Tech', name: 'Small Screen B', src: {x:320,y:768,w:32,h:32}, hasCollision: false },

  // ── Wall Decor ──
  { category: 'Wall Decor', name: 'Old Computer', src: {x:256,y:704,w:64,h:64}, hasCollision: false },
  { category: 'Wall Decor', name: 'Whiteboard A', src: {x:64,y:832,w:64,h:64}, hasCollision: false },
  { category: 'Wall Decor', name: 'Whiteboard B', src: {x:128,y:832,w:64,h:64}, hasCollision: false },

  // ── Kitchen ──
  { category: 'Kitchen', name: 'Coffee Cup', src: {x:448,y:640,w:32,h:32}, hasCollision: false },

  // ── Decor ──
  { category: 'Decor', name: 'Window', src: {x:128,y:640,w:64,h:64}, hasCollision: false },
  { category: 'Decor', name: 'Window B', src: {x:192,y:640,w:64,h:64}, hasCollision: false },
  { category: 'Decor', name: 'Rug', src: {x:128,y:992,w:64,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Microwave', src: {x:192,y:992,w:64,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Water Cooler B', src: {x:256,y:512,w:64,h:96}, hasCollision: true, interactive: 'event_log' },
  { category: 'Decor', name: 'Espresso Machine', src: {x:256,y:640,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Nespresso Machine', src: {x:320,y:640,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Phone', src: {x:384,y:640,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Coffee Cup B', src: {x:416,y:640,w:32,h:32}, hasCollision: false },

  // ── Plants ──
  { category: 'Plants', name: 'Plant', src: {x:96,y:896,w:32,h:64}, hasCollision: true },
  { category: 'Plants', name: 'Plant D', src: {x:64,y:896,w:32,h:64}, hasCollision: true },

  // ── Small Decor Items (y:672 row) ──
  { category: 'Decor', name: 'Small Item A', src: {x:352,y:672,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Small Item B', src: {x:384,y:672,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Small Item C', src: {x:416,y:672,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Small Item D', src: {x:448,y:672,w:32,h:32}, hasCollision: false },
  { category: 'Decor', name: 'Small Item E', src: {x:480,y:672,w:32,h:32}, hasCollision: false },
];

// ── Default Layout (from tile-map.js) ──
const DEFAULT_LAYOUT = [
  { id:'shelf_left', cat:'Tall Shelf A', src:{x:448,y:352,w:64,h:96}, x:183, y:382, hasCollision:true },
  { id:'shelf_left_2', cat:'Tall Shelf B', src:{x:384,y:352,w:64,h:96}, x:289, y:382, hasCollision:true },
  { id:'bookshelf_right', cat:'Water Cooler B', src:{x:256,y:512,w:64,h:96}, x:688, y:146, hasCollision:true, interactive:'event_log' },
  { id:'painting_1', cat:'Window', src:{x:128,y:640,w:64,h:64}, x:183, y:136, hasCollision:false },
  { id:'painting_2', cat:'Window', src:{x:128,y:640,w:64,h:64}, x:414, y:133, hasCollision:false },
  { id:'painting_3', cat:'Window', src:{x:128,y:640,w:64,h:64}, x:654, y:134, hasCollision:false },
  { id:'vending_machine', cat:'Vending Machine', src:{x:448,y:512,w:64,h:96}, x:570, y:143, hasCollision:true, interactive:'workspace_config' },
  { id:'cabinet_tall', cat:'Fridge', src:{x:384,y:512,w:32,h:96}, x:530, y:142, hasCollision:true },
  { id:'cooler_left', cat:'Sofa', src:{x:64,y:512,w:32,h:64}, x:551, y:284, hasCollision:true, interactive:'cron_tasks' },
  { id:'cooler_right', cat:'Sofa', src:{x:64,y:512,w:32,h:64}, x:552, y:341, hasCollision:true },
  { id:'computer_topleft', cat:'Crates', src:{x:448,y:896,w:64,h:64}, x:169, y:172, hasCollision:true, interactive:'create_agent' },
  { id:'monitor_1', cat:'Divider', src:{x:448,y:448,w:32,h:64}, x:279, y:188, hasCollision:false },
  { id:'coffee_machine', cat:'Wooden Table', src:{x:32,y:576,w:32,h:64}, x:363, y:234, hasCollision:true },
  { id:'cup_1', cat:'Coffee Cup', src:{x:448,y:640,w:32,h:32}, x:360, y:270, hasCollision:false },
  { id:'printer', cat:'Coffee Table', src:{x:0,y:576,w:32,h:64}, x:648, y:313, hasCollision:true },
  { id:'filing_1', cat:'Sofa B', src:{x:96,y:512,w:32,h:64}, x:743, y:285, hasCollision:true },
  { id:'filing_2', cat:'Sofa B', src:{x:96,y:512,w:32,h:64}, x:742, y:346, hasCollision:true },
  { id:'plant_right', cat:'Plant', src:{x:96,y:896,w:32,h:64}, x:736, y:446, hasCollision:true },
  { id:'plant_left', cat:'Plant', src:{x:96,y:896,w:32,h:64}, x:175, y:482, hasCollision:true },
  { id:'plant_bottom', cat:'Plant', src:{x:96,y:896,w:32,h:64}, x:623, y:682, hasCollision:true },
  { id:'boxes_bottom', cat:'Blackboard', src:{x:0,y:832,w:64,h:64}, x:692, y:493, hasCollision:true },
  { id:'rug', cat:'Rug', src:{x:128,y:992,w:64,h:32}, x:681, y:731, hasCollision:false },
  { id:'desk_chair_left', cat:'Metal Table', src:{x:96,y:576,w:32,h:64}, x:498, y:667, hasCollision:false },
  { id:'desk_chair_right', cat:'Metal Table', src:{x:96,y:576,w:32,h:64}, x:307, y:668, hasCollision:false },
  { id:'stool_left', cat:'Laptop', src:{x:352,y:768,w:32,h:32}, x:501, y:680, hasCollision:false },
  { id:'stool_right', cat:'Laptop', src:{x:352,y:768,w:32,h:32}, x:310, y:678, hasCollision:false },
  { id:'desk_left', cat:'Chair', src:{x:192,y:512,w:32,h:64}, x:242, y:694, hasCollision:true },
  { id:'desk_right', cat:'Chair', src:{x:192,y:512,w:32,h:64}, x:439, y:692, hasCollision:true },
  { id:'monitor_2', cat:'Divider', src:{x:448,y:448,w:32,h:64}, x:587, y:593, hasCollision:false },
  { id:'monitor_3', cat:'Divider', src:{x:448,y:448,w:32,h:64}, x:587, y:669, hasCollision:false },
  { id:'cup_2', cat:'Coffee Cup', src:{x:448,y:640,w:32,h:32}, x:650, y:325, hasCollision:false },
  { id:'cup_3', cat:'Coffee Cup', src:{x:448,y:640,w:32,h:32}, x:301, y:722, hasCollision:false },
];

// ── Load Tileset ──
const img = new Image();
img.onload = () => {
  tileset = img;
  buildCatalog();
  loadInitialLayout().finally(() => {
    drawMap();
  });
};
img.onerror = (e) => {
  console.error('Failed to load tileset from:', TILESET_SRC, e);
  document.getElementById('status-bar').textContent = 'ERROR: Tileset failed to load — check console';
  buildCatalog();
  loadInitialLayout().finally(() => {
    drawMap();
  });
};
img.src = TILESET_SRC;

// ── Build Catalog UI ──
function buildCatalog() {
  const list = document.getElementById('catalog-list');
  let lastCat = '';
  for (const item of CATALOG) {
    if (item.category !== lastCat) {
      lastCat = item.category;
      const sec = document.createElement('div');
      sec.className = 'cat-section';
      sec.textContent = item.category;
      list.appendChild(sec);
    }
    const div = document.createElement('div');
    div.className = 'cat-item';
    div.dataset.name = item.name;

    // Thumbnail
    const thumb = document.createElement('canvas');
    const tScale = Math.min(3, 40 / Math.max(item.src.w, item.src.h));
    thumb.width = item.src.w * tScale;
    thumb.height = item.src.h * tScale;
    const tctx = thumb.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    if (tileset) {
      tctx.drawImage(tileset, item.src.x, item.src.y, item.src.w, item.src.h,
        0, 0, thumb.width, thumb.height);
    }

    const info = document.createElement('div');
    info.className = 'cat-item-info';
    let tags = '';
    if (item.interactive) {
      tags = '<span class="cat-item-tag tag-interactive">interactive</span>';
    }
    info.innerHTML =
      '<div class="cat-item-name">' + item.name + '</div>' +
      '<div class="cat-item-size">' + item.src.w + '\u00d7' + item.src.h + 'px</div>' +
      tags;

    div.appendChild(thumb);
    div.appendChild(info);
    div.addEventListener('click', () => selectCatalogItem(item, div));
    list.appendChild(div);
  }
}

function selectCatalogItem(item, el) {
  document.querySelectorAll('.cat-item').forEach(e => e.classList.remove('selected'));
  if (selectedCatalogItem === item) {
    selectedCatalogItem = null;
    document.getElementById('mode-badge').style.display = 'none';
    mapCanvas.style.cursor = 'default';
    return;
  }
  selectedCatalogItem = item;
  el.classList.add('selected');
  document.getElementById('mode-badge').style.display = 'block';
  document.getElementById('mode-badge').textContent = 'PLACING: ' + item.name + ' \u2014 click on map';
  mapCanvas.style.cursor = 'crosshair';
  selectedPlacedItem = null;
  updateProps();
}

// ── Properties Panel ──
function updateProps() {
  const panel = document.getElementById('props-content');
  if (!selectedPlacedItem) {
    panel.innerHTML = '<div class="prop-section" style="color:#555;font-size:11px">' +
      'Click a furniture piece on the map to view its properties' +
      '</div>' +
      '<div class="prop-section">' +
      '<div class="prop-label">Placed Items</div>' +
      '<div class="prop-value">' + placedItems.length + ' pieces</div>' +
      '</div>';
    return;
  }
  const item = selectedPlacedItem;

  // Build properties panel with event listeners instead of inline handlers
  panel.innerHTML = '';

  // Name
  const nameSection = document.createElement('div');
  nameSection.className = 'prop-section';
  nameSection.innerHTML = '<div class="prop-label">Name</div><div class="prop-value">' + (item.cat || item.id) + '</div>';
  panel.appendChild(nameSection);

  // ID
  const idSection = document.createElement('div');
  idSection.className = 'prop-section';
  idSection.innerHTML = '<div class="prop-label">ID</div><div class="prop-value" style="font-size:10px;color:#666">' + item.id + '</div>';
  panel.appendChild(idSection);

  // Position
  const posSection = document.createElement('div');
  posSection.className = 'prop-section';
  posSection.innerHTML = '<div class="prop-label">Position</div>';
  const posRow = document.createElement('div');
  posRow.className = 'prop-row';

  const xDiv = document.createElement('div');
  xDiv.innerHTML = '<span style="font-size:10px;color:#666">X</span>';
  const xInput = document.createElement('input');
  xInput.className = 'prop-input';
  xInput.type = 'number';
  xInput.value = item.x;
  xInput.addEventListener('change', () => moveSelected(xInput.value, selectedPlacedItem.y));
  xDiv.appendChild(xInput);

  const yDiv = document.createElement('div');
  yDiv.innerHTML = '<span style="font-size:10px;color:#666">Y</span>';
  const yInput = document.createElement('input');
  yInput.className = 'prop-input';
  yInput.type = 'number';
  yInput.value = item.y;
  yInput.addEventListener('change', () => moveSelected(selectedPlacedItem.x, yInput.value));
  yDiv.appendChild(yInput);

  posRow.appendChild(xDiv);
  posRow.appendChild(yDiv);
  posSection.appendChild(posRow);
  panel.appendChild(posSection);

  // Size
  const sizeSection = document.createElement('div');
  sizeSection.className = 'prop-section';
  sizeSection.innerHTML = '<div class="prop-label">Size</div>' +
    '<div class="prop-value">' + item.src.w + '\u00d7' + item.src.h + 'px (' +
    Math.round(item.src.w * SCALE) + '\u00d7' + Math.round(item.src.h * SCALE) + ' scaled)</div>';
  panel.appendChild(sizeSection);

  // Collision
  const collSection = document.createElement('div');
  collSection.className = 'prop-section';
  collSection.innerHTML = '<div class="prop-label">Collision</div>' +
    '<div class="prop-value">' + (item.hasCollision ? 'Yes \u2014 blocks movement' : 'No \u2014 walk-through') + '</div>';
  panel.appendChild(collSection);

  // Interactive
  const interSection = document.createElement('div');
  interSection.className = 'prop-section';
  interSection.innerHTML = '<div class="prop-label">Interactive Action</div>' +
    '<div class="prop-value">' + (item.interactive || 'None') + '</div>';
  panel.appendChild(interSection);

  // Flip
  const flipSection = document.createElement('div');
  flipSection.className = 'prop-section';
  flipSection.innerHTML = '<div class="prop-label">Flip</div>';
  const flipRow = document.createElement('div');
  flipRow.className = 'prop-row';
  const flipBtn = document.createElement('button');
  flipBtn.className = 'tb-btn';
  flipBtn.style.cssText = 'padding:3px 10px;font-size:11px';
  flipBtn.textContent = item.flipped ? '\u21a9 Unflip' : '\u2194 Flip Horizontal';
  flipBtn.addEventListener('click', flipSelected);
  flipRow.appendChild(flipBtn);
  flipSection.appendChild(flipRow);
  panel.appendChild(flipSection);

  // Delete
  const delSection = document.createElement('div');
  delSection.className = 'prop-section';
  const delBtn = document.createElement('button');
  delBtn.className = 'tb-btn danger';
  delBtn.style.cssText = 'width:100%;padding:6px';
  delBtn.textContent = 'Delete This Piece';
  delBtn.addEventListener('click', deleteSelected);
  delSection.appendChild(delBtn);
  panel.appendChild(delSection);
}

function moveSelected(x, y) {
  if (!selectedPlacedItem) return;
  saveUndo();
  selectedPlacedItem.x = parseInt(x);
  selectedPlacedItem.y = parseInt(y);
  updateProps();
}

function flipSelected() {
  if (!selectedPlacedItem) return;
  saveUndo();
  selectedPlacedItem.flipped = !selectedPlacedItem.flipped;
  updateProps();
}

function deleteSelected() {
  if (!selectedPlacedItem) return;
  saveUndo();
  placedItems = placedItems.filter(i => i !== selectedPlacedItem);
  selectedPlacedItem = null;
  updateProps();
}

// ── Drawing ──
function worldToCanvas(wx, wy) { return { x: wx * VS, y: wy * VS }; }
function canvasToWorld(cx, cy) { return { x: cx / VS, y: cy / VS }; }

function drawMap() {
  mapCtx.imageSmoothingEnabled = false;
  mapCtx.fillStyle = '#0d1117';
  mapCtx.fillRect(0, 0, MAP_W, MAP_H);
  if (!tileset) { requestAnimationFrame(drawMap); return; }

  // Floor
  const floorSrc = { x: 64, y: 224, w: 32, h: 32 };
  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      const isWall = r < 3 || r >= ROOM_ROWS - 1 || c === 0 || c === ROOM_COLS - 1;
      if (isWall) continue;
      const wx = ROOM_OX + c * ST, wy = ROOM_OY + r * ST;
      const p = worldToCanvas(wx, wy);
      mapCtx.drawImage(tileset, floorSrc.x, floorSrc.y, floorSrc.w, floorSrc.h,
        p.x, p.y, ST * VS, ST * VS);
    }
  }

  // Grid lines
  mapCtx.strokeStyle = 'rgba(255,255,255,0.04)';
  mapCtx.lineWidth = 0.5;
  for (let r = 3; r <= ROOM_ROWS - 1; r++) {
    const y = (ROOM_OY + r * ST) * VS;
    mapCtx.beginPath();
    mapCtx.moveTo((ROOM_OX + ST) * VS, y);
    mapCtx.lineTo((ROOM_OX + (ROOM_COLS - 1) * ST) * VS, y);
    mapCtx.stroke();
  }
  for (let c = 1; c <= ROOM_COLS - 1; c++) {
    const x = (ROOM_OX + c * ST) * VS;
    mapCtx.beginPath();
    mapCtx.moveTo(x, (ROOM_OY + 3 * ST) * VS);
    mapCtx.lineTo(x, (ROOM_OY + (ROOM_ROWS - 1) * ST) * VS);
    mapCtx.stroke();
  }

  // Placed items sorted by z-order
  const sorted = [...placedItems].sort((a, b) => {
    const az = a.hasCollision === false ? 900 : a.y + a.src.h * SCALE;
    const bz = b.hasCollision === false ? 900 : b.y + b.src.h * SCALE;
    return az - bz;
  });

  for (const item of sorted) {
    const p = worldToCanvas(item.x, item.y);
    const sw = item.src.w * SCALE * VS;
    const sh = item.src.h * SCALE * VS;

    mapCtx.save();
    if (item.flipped) {
      mapCtx.translate(p.x + sw, p.y);
      mapCtx.scale(-1, 1);
      mapCtx.drawImage(tileset, item.src.x, item.src.y, item.src.w, item.src.h, 0, 0, sw, sh);
    } else {
      mapCtx.drawImage(tileset, item.src.x, item.src.y, item.src.w, item.src.h, p.x, p.y, sw, sh);
    }
    mapCtx.restore();

    // Highlight selected
    if (item === selectedPlacedItem) {
      mapCtx.strokeStyle = '#3fb950';
      mapCtx.lineWidth = 2;
      mapCtx.setLineDash([4, 4]);
      mapCtx.strokeRect(p.x, p.y, sw, sh);
      mapCtx.setLineDash([]);
    }
    // Highlight dragging
    if (item === dragItem) {
      mapCtx.strokeStyle = '#58a6ff';
      mapCtx.lineWidth = 2;
      mapCtx.strokeRect(p.x, p.y, sw, sh);
    }
    // Show collision bounds
    if (item === selectedPlacedItem && item.hasCollision) {
      mapCtx.fillStyle = 'rgba(255,100,100,0.15)';
      mapCtx.fillRect(p.x, p.y, sw, sh);
    }
  }

  // Delete mode overlay
  if (deleteMode) {
    mapCtx.fillStyle = 'rgba(248,81,73,0.08)';
    mapCtx.fillRect(0, 0, MAP_W, MAP_H);
  }

  requestAnimationFrame(drawMap);
}

// ── Map Interaction ──
function hitTest(wx, wy) {
  for (let i = placedItems.length - 1; i >= 0; i--) {
    const item = placedItems[i];
    const iw = item.src.w * SCALE, ih = item.src.h * SCALE;
    if (wx >= item.x && wx <= item.x + iw && wy >= item.y && wy <= item.y + ih) {
      return item;
    }
  }
  return null;
}

const tooltip = document.getElementById('tooltip');

mapCanvas.addEventListener('mousemove', (e) => {
  const rect = mapCanvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const w = canvasToWorld(cx, cy);

  document.getElementById('status-bar').textContent =
    'Position: ' + Math.round(w.x) + ', ' + Math.round(w.y) +
    (deleteMode ? '  |  DELETE MODE \u2014 click to remove' : '') +
    (selectedCatalogItem ? '  |  Placing: ' + selectedCatalogItem.name : '');

  if (dragItem) {
    dragItem.x = Math.round(w.x - dragOffX);
    dragItem.y = Math.round(w.y - dragOffY);
    updateProps();
    return;
  }

  const hit = hitTest(w.x, w.y);
  if (hit) {
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY - 8) + 'px';
    tooltip.textContent = (hit.cat || hit.id) + ' (' + hit.x + ', ' + hit.y + ')';
    mapCanvas.style.cursor = deleteMode ? 'not-allowed' : 'grab';
  } else {
    tooltip.style.display = 'none';
    mapCanvas.style.cursor = selectedCatalogItem ? 'crosshair' : 'default';
  }
});

mapCanvas.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

mapCanvas.addEventListener('mousedown', (e) => {
  if (e.button === 2) return;
  const rect = mapCanvas.getBoundingClientRect();
  const w = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);

  const hit = hitTest(w.x, w.y);

  // Delete mode
  if (deleteMode && hit) {
    saveUndo();
    placedItems = placedItems.filter(i => i !== hit);
    if (selectedPlacedItem === hit) selectedPlacedItem = null;
    updateProps();
    return;
  }

  // Click existing item → select or drag
  if (hit) {
    selectedPlacedItem = hit;
    dragItem = hit;
    dragOffX = w.x - hit.x;
    dragOffY = w.y - hit.y;
    saveUndo();
    updateProps();
    return;
  }

  // Place new from catalog
  if (selectedCatalogItem) {
    saveUndo();
    const newItem = {
      id: selectedCatalogItem.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      cat: selectedCatalogItem.name,
      src: { ...selectedCatalogItem.src },
      x: Math.round(w.x - (selectedCatalogItem.src.w * SCALE / 2)),
      y: Math.round(w.y - (selectedCatalogItem.src.h * SCALE / 2)),
      hasCollision: selectedCatalogItem.hasCollision,
      interactive: selectedCatalogItem.interactive || null,
      flipped: false,
    };
    placedItems.push(newItem);
    selectedPlacedItem = newItem;
    updateProps();
    return;
  }

  // Click empty → deselect
  selectedPlacedItem = null;
  updateProps();
});

mapCanvas.addEventListener('mouseup', () => {
  dragItem = null;
});

mapCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = mapCanvas.getBoundingClientRect();
  const w = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const hit = hitTest(w.x, w.y);
  if (hit) {
    saveUndo();
    placedItems = placedItems.filter(i => i !== hit);
    if (selectedPlacedItem === hit) selectedPlacedItem = null;
    updateProps();
  }
});

// ── Toolbar Actions ──
function toggleDeleteMode() {
  deleteMode = !deleteMode;
  document.getElementById('btn-delete').classList.toggle('active', deleteMode);
  if (deleteMode) {
    selectedCatalogItem = null;
    document.querySelectorAll('.cat-item').forEach(e => e.classList.remove('selected'));
    document.getElementById('mode-badge').style.display = 'block';
    document.getElementById('mode-badge').textContent = 'DELETE MODE \u2014 click items to remove';
    document.getElementById('mode-badge').style.background = '#f85149';
  } else {
    document.getElementById('mode-badge').style.display = 'none';
    document.getElementById('mode-badge').style.background = '#3fb950';
  }
}

function saveUndo() {
  undoStack.push(JSON.parse(JSON.stringify(placedItems)));
  if (undoStack.length > 50) undoStack.shift();
}

function undoLast() {
  if (undoStack.length === 0) return;
  placedItems = undoStack.pop();
  selectedPlacedItem = null;
  updateProps();
}

function clearAll() {
  if (!confirm('Remove all furniture?')) return;
  saveUndo();
  placedItems = [];
  selectedPlacedItem = null;
  updateProps();
}

function loadDefaults() {
  saveUndo();
  placedItems = DEFAULT_LAYOUT.map(item => ({
    ...item,
    src: { ...item.src },
    interactive: item.interactive || null,
    flipped: Boolean(item.flipped),
  }));
  selectedPlacedItem = null;
  updateProps();
}

function applyLayout(data, source) {
  placedItems = data.map(item => ({
    id: item.id || 'imported_' + Date.now(),
    cat: item.cat || item.id,
    src: item.src,
    x: item.x,
    y: item.y,
    hasCollision: item.hasCollision !== false,
    interactive: item.interactive || null,
    flipped: item.flipped || false,
  }));
  selectedPlacedItem = null;
  updateProps();
  document.getElementById('status-bar').textContent = 'Loaded ' + data.length + ' items from ' + source;
}

async function loadInitialLayout() {
  // Try chrome.storage.local first
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get('officeLayout');
      if (Array.isArray(result.officeLayout) && result.officeLayout.length > 0) {
        applyLayout(result.officeLayout, 'saved layout');
        return;
      }
    } catch {}
  }

  // Fall back to file server
  try {
    const response = await fetch(OFFICE_LAYOUT_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
    applyLayout(data, 'office-layout.json');
  } catch {
    loadDefaults();
    document.getElementById('status-bar').textContent = 'Loaded default layout';
  }
}

function exportJSON() {
  const output = placedItems.map(item => ({
    id: item.id,
    cat: item.cat,
    src: item.src,
    x: item.x,
    y: item.y,
    hasCollision: item.hasCollision,
    interactive: item.interactive || null,
    flipped: item.flipped || false,
  }));
  const json = JSON.stringify(output, null, 2);

  // Save to chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ officeLayout: output }, () => {
      // Notify the extension to reload the layout in the sidepanel
      chrome.runtime.sendMessage({ type: 'LAYOUT_UPDATED' }).catch(() => {});
      document.getElementById('status-bar').textContent = 'Saved ' + output.length + ' items';
    });
  }

  // Also try saving to file server if running
  fetch(OFFICE_LAYOUT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).catch(() => {});

  navigator.clipboard.writeText(json).catch(() => {});
}

function importJSON() {
  const json = prompt('Paste furniture layout JSON:');
  if (!json) return;
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) throw new Error('Expected array');
    saveUndo();
    placedItems = data.map(item => ({
      id: item.id || 'imported_' + Date.now(),
      cat: item.cat || item.id,
      src: item.src,
      x: item.x,
      y: item.y,
      hasCollision: item.hasCollision !== false,
      interactive: item.interactive || null,
      flipped: item.flipped || false,
    }));
    selectedPlacedItem = null;
    updateProps();
    document.getElementById('status-bar').textContent = 'Imported ' + data.length + ' items';
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

// ── Toolbar button listeners ──
document.getElementById('btn-delete').addEventListener('click', toggleDeleteMode);
document.getElementById('btn-undo').addEventListener('click', undoLast);
document.getElementById('btn-clear').addEventListener('click', clearAll);
document.getElementById('btn-defaults').addEventListener('click', loadDefaults);
document.getElementById('btn-export').addEventListener('click', exportJSON);
document.getElementById('btn-import').addEventListener('click', importJSON);

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedPlacedItem && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      deleteSelected();
    }
  }
  if (e.key === 'Escape') {
    selectedCatalogItem = null;
    selectedPlacedItem = null;
    deleteMode = false;
    document.getElementById('btn-delete').classList.remove('active');
    document.getElementById('mode-badge').style.display = 'none';
    document.querySelectorAll('.cat-item').forEach(e => e.classList.remove('selected'));
    mapCanvas.style.cursor = 'default';
    updateProps();
  }
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    undoLast();
  }
  if (e.key === 'f' && selectedPlacedItem && document.activeElement.tagName !== 'INPUT') {
    flipSelected();
  }
});

// Start
drawMap();
updateProps();
