// ── Avatar Editor — Custom Sprites Only ────────────────────────────────────
// Standalone vanilla JS — no modules, no bundler required.

// ── Frame labels (12-frame format) ──
var FRAME_LABELS = [
  // Walk (0-7) — same layout as classic 9-frame
  'Front Idle', 'Front Walk A', 'Front Walk B',
  'Back Idle',  'Back Walk A',  'Back Walk B',
  'Side Walk A', 'Side Walk B',
  // Chill animation loop (8-9)
  'Chill 1', 'Chill 2',
  // Work animation loop (10-11)
  'Work 1', 'Work 2',
];

// ── Mutable state ──
var selectedSprite   = null;  // string key into customSprites
var customSprites    = {};    // { name: { frames: [HTMLImageElement, ...], scale: number } }
var spriteAssignments = {};   // { agentKey: spriteName }

// ── Upload state ──
var pendingUploadImg = null;
var uploadTolerance  = 25;

// ── Animation ──
var customWalkStep  = 0;
var animLastTime    = 0;
var animRAF         = null;
var FPS             = 8;
var previewMode     = 'walk'; // 'walk' | 'chill' | 'work'
var previewDir      = 'down'; // 'down' | 'up' | 'side'

// ── Chrome storage detection ──
var chromeStorageAvailable = (
  typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
);

// ═══════════════════════════════════════════════════════════
//  BACKGROUND REMOVAL & FRAME DETECTION
// ═══════════════════════════════════════════════════════════

// Flood-fill background removal from image edges — preserves white inside the character.
// Only pixels reachable from the image border (connected background) are made transparent.
function removeWhiteBg(canvas, tolerance) {
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  var w = canvas.width, h = canvas.height;
  var id = ctx.getImageData(0, 0, w, h);
  var d  = id.data;
  var visited = new Uint8Array(w * h);

  function isRemovable(i) {
    // Transparent pixels pass through; near-white pixels get removed
    return d[i+3] <= 10 || (
      d[i]   >= 255 - tolerance &&
      d[i+1] >= 255 - tolerance &&
      d[i+2] >= 255 - tolerance
    );
  }

  // BFS queue stores flat pixel indices
  var queue = [];
  function enqueue(x, y) {
    var idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isRemovable(idx * 4)) queue.push(idx);
  }

  // Seed from all 4 edges
  for (var x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
  for (var y = 1; y < h - 1; y++) { enqueue(0, y); enqueue(w - 1, y); }

  // BFS — spread through connected background pixels
  for (var qi = 0; qi < queue.length; qi++) {
    var p = queue[qi];
    d[p * 4 + 3] = 0; // erase this background pixel
    var px = p % w, py = Math.floor(p / w);
    if (px > 0)     enqueue(px - 1, py);
    if (px < w - 1) enqueue(px + 1, py);
    if (py > 0)     enqueue(px, py - 1);
    if (py < h - 1) enqueue(px, py + 1);
  }

  ctx.putImageData(id, 0, 0);
}

function detectFrameRuns(canvas) {
  var ctx  = canvas.getContext('2d', { willReadFrequently: true });
  var w = canvas.width, h = canvas.height;
  var data = ctx.getImageData(0, 0, w, h).data;
  var colHas = [];
  for (var x = 0; x < w; x++) {
    var found = false;
    for (var y = 0; y < h; y++) {
      if (data[(y * w + x) * 4 + 3] > 10) { found = true; break; }
    }
    colHas.push(found);
  }
  var runs = [], inRun = false, runStart = 0;
  for (var x = 0; x < w; x++) {
    if (colHas[x] && !inRun)      { inRun = true; runStart = x; }
    else if (!colHas[x] && inRun) { inRun = false; runs.push({ start: runStart, end: x - 1 }); }
  }
  if (inRun) runs.push({ start: runStart, end: w - 1 });
  return runs;
}

function mergeCloseRuns(runs, minGap) {
  if (runs.length < 2) return runs;
  var merged = [{ start: runs[0].start, end: runs[0].end }];
  for (var i = 1; i < runs.length; i++) {
    var prev = merged[merged.length - 1];
    if (runs[i].start - prev.end - 1 <= minGap) {
      prev.end = runs[i].end;
    } else {
      merged.push({ start: runs[i].start, end: runs[i].end });
    }
  }
  return merged;
}

function extractFrameImages(srcCanvas, runs) {
  var ctx  = srcCanvas.getContext('2d', { willReadFrequently: true });
  var w = srcCanvas.width, h = srcCanvas.height;
  var data = ctx.getImageData(0, 0, w, h).data;
  return runs.map(function(run) {
    var top = h, bottom = 0;
    for (var x = run.start; x <= run.end; x++) {
      for (var y = 0; y < h; y++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    var fw = run.end - run.start + 1;
    var fh = (bottom >= top) ? bottom - top + 1 : h;
    var size = Math.max(fw, fh);
    var fc = document.createElement('canvas');
    fc.width = fc.height = size;
    var fctx = fc.getContext('2d');
    fctx.imageSmoothingEnabled = false;
    fctx.drawImage(srcCanvas, run.start, top, fw, fh,
      Math.round((size - fw) / 2), Math.round((size - fh) / 2), fw, fh);
    return fc;
  });
}

// ═══════════════════════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════════════════════

function saveCustomSprites() {
  // localStorage
  try {
    var toStore = {};
    Object.keys(customSprites).forEach(function(name) {
      var entry = customSprites[name];
      toStore[name] = {
        frameUrls: entry.frames.map(function(img) { return img.src; }),
        scale: entry.scale != null ? entry.scale : 1.0
      };
    });
    localStorage.setItem('avatarEditorCustomSprites', JSON.stringify(toStore));
  } catch(e) {
    showToast('Could not save sprites: ' + e.message);
  }

  // chrome.storage (single call, no recursion)
  if (chromeStorageAvailable) syncToExtension();
}

function loadCustomSprites() {
  try {
    var raw = localStorage.getItem('avatarEditorCustomSprites');
    if (!raw) return;
    var stored = JSON.parse(raw);
    Object.keys(stored).forEach(function(name) {
      var urls = stored[name].frameUrls || [];
      var savedScale = stored[name].scale != null ? stored[name].scale : 1.0;
      var loaded = 0;
      var frames = new Array(urls.length);
      var capName = name;
      urls.forEach(function(url, i) {
        var img = new Image();
        img.onload = function() {
          frames[i] = img;
          loaded++;
          if (loaded === urls.length) {
            customSprites[capName] = { frames: frames, scale: savedScale };
            buildSpritesList();
          }
        };
        img.onerror = function() {
          loaded++;
          if (loaded === urls.length) buildSpritesList();
        };
        img.src = url;
      });
    });
  } catch(e) { /* ignore corrupt storage */ }
}

function saveAssignments() {
  try {
    localStorage.setItem('avatarEditorAssignments', JSON.stringify(spriteAssignments));
  } catch(e) {}
  if (chromeStorageAvailable) {
    chrome.storage.local.set({ customSpriteAssignments: spriteAssignments });
  }
}

function loadAssignments() {
  try {
    var raw = localStorage.getItem('avatarEditorAssignments');
    if (raw) spriteAssignments = JSON.parse(raw);
  } catch(e) {}
}

function syncToExtension() {
  if (!chromeStorageAvailable) return;
  var spriteData = {};
  Object.keys(customSprites).forEach(function(name) {
    var urls = customSprites[name].frames.map(function(img) {
      if (img.src && img.src.startsWith('data:')) return img.src;
      var c = document.createElement('canvas');
      c.width  = img.naturalWidth  || img.width  || 64;
      c.height = img.naturalHeight || img.height || 64;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/png');
    });
    spriteData[name] = { frameUrls: urls, scale: customSprites[name].scale != null ? customSprites[name].scale : 1.0 };
  });
  chrome.storage.local.set({
    customSpriteData:        spriteData,
    customSpriteAssignments: spriteAssignments
  }, function() {
    if (chrome.runtime.lastError) {
      showToast('Sync failed: ' + chrome.runtime.lastError.message);
    } else {
      showToast('Synced to map ✓');
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  UPLOAD MODAL
// ═══════════════════════════════════════════════════════════

function processAndShowUploadModal(img, defaultName) {
  pendingUploadImg = img;
  document.getElementById('upload-name-input').value = defaultName;
  repaintUploadModal();
  document.getElementById('upload-modal-overlay').classList.add('open');
}

function repaintUploadModal() {
  if (!pendingUploadImg) return;
  var canvas = document.createElement('canvas');
  canvas.width  = pendingUploadImg.width;
  canvas.height = pendingUploadImg.height;
  canvas.getContext('2d').drawImage(pendingUploadImg, 0, 0);
  removeWhiteBg(canvas, uploadTolerance);
  var runs   = mergeCloseRuns(detectFrameRuns(canvas), 8);
  var frames = extractFrameImages(canvas, runs);

  var countEl = document.getElementById('upload-frame-count');
  countEl.textContent = frames.length + ' frame' + (frames.length !== 1 ? 's' : '') + ' detected';
  var goodCount = [5, 9, 10, 12].indexOf(frames.length) !== -1;
  countEl.style.color = goodCount ? '#3fb950' : '#f0a500';

  var previewEl = document.getElementById('upload-frame-preview');
  previewEl.innerHTML = '';
  frames.forEach(function(fc, i) {
    var wrapper = document.createElement('div');
    wrapper.className = 'upload-frame-item';
    var displaySize = Math.min(Math.round(80 * (fc.width / fc.height)), 120);
    var scale = displaySize / fc.width;
    var dc = document.createElement('canvas');
    dc.width  = Math.round(fc.width  * scale);
    dc.height = Math.round(fc.height * scale);
    var dctx = dc.getContext('2d');
    dctx.imageSmoothingEnabled = false;
    dctx.drawImage(fc, 0, 0, dc.width, dc.height);
    var lbl = document.createElement('span');
    lbl.textContent = FRAME_LABELS[i] || ('F' + (i + 1));
    wrapper.appendChild(dc);
    wrapper.appendChild(lbl);
    previewEl.appendChild(wrapper);
  });

  pendingUploadImg._frames = frames;
}

function confirmUpload() {
  var name   = document.getElementById('upload-name-input').value.trim();
  var frames = pendingUploadImg && pendingUploadImg._frames;
  if (!name)   { showToast('Enter a character name'); return; }
  if (!frames || !frames.length) { showToast('No frames detected'); return; }
  if (customSprites[name]) {
    showToast('"' + name + '" already exists — choose a different name'); return;
  }

  var total   = frames.length;
  var ready   = 0;
  var imgFrames = frames.map(function(fc) {
    var img = new Image();
    img.onload = function() {
      ready++;
      if (ready === total) {
        buildSpritesList();
        selectSprite(name);
      }
    };
    img.src = fc.toDataURL('image/png');
    return img;
  });

  customSprites[name] = { frames: imgFrames, scale: 1.0 };
  saveCustomSprites();
  document.getElementById('upload-modal-overlay').classList.remove('open');
  pendingUploadImg = null;
  showToast('Added: ' + name);
}

// ═══════════════════════════════════════════════════════════
//  LEFT PANEL — SPRITES LIST
// ═══════════════════════════════════════════════════════════

function buildSpritesList() {
  var list = document.getElementById('custom-sprites-list');
  list.innerHTML = '';

  Object.keys(customSprites).forEach(function(name) {
    var sprite = customSprites[name];
    var item   = document.createElement('div');
    item.className = 'custom-item' + (name === selectedSprite ? ' selected' : '');
    item.dataset.name = name;

    var thumb = document.createElement('canvas');
    thumb.className = 'custom-item-thumb';
    thumb.width = thumb.height = 32;
    if (sprite.frames[0] && sprite.frames[0].complete && sprite.frames[0].naturalWidth) {
      var tctx = thumb.getContext('2d');
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(sprite.frames[0], 0, 0,
        sprite.frames[0].naturalWidth, sprite.frames[0].naturalHeight, 0, 0, 32, 32);
    }

    var info = document.createElement('div');
    info.className = 'cat-item-info';
    var nameEl = document.createElement('div');
    nameEl.className = 'cat-item-name';
    nameEl.textContent = name;
    var badge = document.createElement('span');
    badge.className = 'custom-badge';
    badge.textContent = sprite.frames.length + ' frames';
    info.appendChild(nameEl);
    info.appendChild(badge);

    // Show assignment if any
    var assignedKeys = Object.keys(spriteAssignments).filter(function(k) { return spriteAssignments[k] === name; });
    if (assignedKeys.length) {
      var assignEl = document.createElement('div');
      assignEl.style.cssText = 'font-size:8px;color:#3fb950;margin-top:1px';
      assignEl.textContent = '→ ' + assignedKeys.join(', ');
      info.appendChild(assignEl);
    }

    var delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.title = 'Delete';
    delBtn.style.cssText = 'background:none;border:none;color:#f8514966;cursor:pointer;font-size:16px;padding:0 4px;line-height:1;flex-shrink:0';
    delBtn.addEventListener('mouseenter', function() { delBtn.style.color = '#f85149'; });
    delBtn.addEventListener('mouseleave', function() { delBtn.style.color = '#f8514966'; });
    delBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!confirm('Delete "' + name + '"?')) return;
      delete customSprites[name];
      saveCustomSprites();
      if (selectedSprite === name) {
        selectedSprite = null;
        if (animRAF) { cancelAnimationFrame(animRAF); animRAF = null; }
        var canvas = document.getElementById('preview-canvas');
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('props-empty').style.display = '';
        var sections = document.getElementById('props-panel').querySelectorAll('.prop-section');
        sections.forEach(function(s) { s.remove(); });
        var lbl = document.getElementById('preview-label');
        if (lbl) lbl.textContent = '';
      }
      buildSpritesList();
    });

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(delBtn);
    item.addEventListener('click', function() { selectSprite(name); });
    list.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════
//  SELECT & PREVIEW
// ═══════════════════════════════════════════════════════════

function selectSprite(name) {
  selectedSprite = name;
  document.getElementById('custom-sprites-list').querySelectorAll('.custom-item').forEach(function(el) {
    el.classList.toggle('selected', el.dataset.name === name);
  });
  buildPreview();
  buildPropsPanel();
}

var previewCanvas = null;
var previewCtx    = null;

function buildPreview() {
  var area = document.getElementById('preview-area');

  // Build canvas once
  if (!previewCanvas) {
    area.innerHTML = '';

    var lbl = document.createElement('div');
    lbl.id = 'preview-label';
    lbl.style.cssText = 'font-size:18px;font-weight:bold;color:#c9d1d9;margin-bottom:10px;letter-spacing:2px';

    previewCanvas = document.createElement('canvas');
    previewCanvas.id = 'preview-canvas';
    previewCanvas.width  = 400;
    previewCanvas.height = 340;
    previewCanvas.style.cssText = 'image-rendering:pixelated;border:2px solid #21262d;border-radius:4px;background:#0d1117';
    previewCtx = previewCanvas.getContext('2d');

    // Mode controls (Walk / Chill / Work)
    var modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;gap:6px;margin-top:10px';
    [['walk','Walking'],['chill','Chilling'],['work','Working']].forEach(function(m) {
      var btn = document.createElement('button');
      btn.className = 'tb-btn' + (m[0] === previewMode ? ' active' : '');
      btn.textContent = m[1];
      btn.dataset.mode = m[0];
      btn.style.cssText = 'flex:1;font-size:11px;padding:4px 0';
      btn.addEventListener('click', function() {
        previewMode = m[0];
        customWalkStep = 0;
        modeRow.querySelectorAll('button').forEach(function(b) {
          b.className = 'tb-btn' + (b.dataset.mode === previewMode ? ' active' : '');
        });
      });
      modeRow.appendChild(btn);
    });

    // Direction controls (Down / Up / Side) — only relevant for walk
    var dirRow = document.createElement('div');
    dirRow.style.cssText = 'display:flex;gap:6px;margin-top:6px';
    [['down','↓ Down'],['up','↑ Up'],['side','→ Side']].forEach(function(d) {
      var btn = document.createElement('button');
      btn.className = 'tb-btn' + (d[0] === previewDir ? ' active' : '');
      btn.textContent = d[1];
      btn.dataset.dir = d[0];
      btn.style.cssText = 'flex:1;font-size:11px;padding:4px 0';
      btn.addEventListener('click', function() {
        previewDir = d[0];
        customWalkStep = 0;
        dirRow.querySelectorAll('button').forEach(function(b) {
          b.className = 'tb-btn' + (b.dataset.dir === previewDir ? ' active' : '');
        });
      });
      modeRow.appendChild(btn); // append to same row for compactness
      dirRow.appendChild(btn);
    });

    area.appendChild(lbl);
    area.appendChild(previewCanvas);
    area.appendChild(modeRow);
    area.appendChild(dirRow);
  }

  document.getElementById('preview-label').textContent = selectedSprite || '';

  if (animRAF) cancelAnimationFrame(animRAF);
  animLastTime   = 0;
  customWalkStep = 0;
  animRAF = requestAnimationFrame(animLoop);
}

function animLoop(timestamp) {
  if (!selectedSprite) return;
  var elapsed = timestamp - animLastTime;
  if (elapsed >= (1000 / FPS)) {
    animLastTime = timestamp;
    var sprite = customSprites[selectedSprite];
    if (sprite) {
      customWalkStep = (customWalkStep + 1) % sprite.frames.length;
      renderPreview();
    }
  }
  animRAF = requestAnimationFrame(animLoop);
}

// Returns the frame index to show given current mode/dir and sprite frame count
function getPreviewFrameIdx(frameCount, step) {
  if (frameCount >= 12) {
    // 12-frame: 0-7 walk, 8-9 chill loop (2), 10-11 work loop (2)
    if (previewMode === 'chill') return 8 + (step % 2);
    if (previewMode === 'work')  return 10 + (step % 2);
    // walk — same cycle as 9-frame
    if (previewDir === 'down') { var c=[0,1,2,1]; return c[step % 4]; }
    if (previewDir === 'up')   { var c=[3,4,5,4]; return c[step % 4]; }
    if (previewDir === 'side') { var c=[6,7,6,7]; return c[step % 4]; }
  } else if (frameCount >= 8) {
    // 9/10-frame: 0=FrontIdle 1=FWalkA 2=FWalkB 3=BackIdle 4=BWalkA 5=BWalkB 6=SideA 7=SideB 8=Chill 9=Work
    if (previewMode === 'chill') return Math.min(8, frameCount - 1);
    if (previewMode === 'work')  return Math.min(9, frameCount - 1);
    if (previewDir === 'down') { var c=[0,1,2,1]; return c[step % 4]; }
    if (previewDir === 'up')   { var c=[3,4,5,4]; return c[step % 4]; }
    if (previewDir === 'side') { var c=[6,7,6,7]; return c[step % 4]; }
  } else {
    // Legacy 5-frame
    if (previewMode === 'chill') return 0;
    if (previewMode === 'work')  return Math.min(4, frameCount - 1);
    var c = previewDir === 'up' ? [3,3,3,3] : [0,1,2,1];
    return c[step % 4];
  }
  return step % frameCount;
}

function renderPreview() {
  if (!previewCtx || !selectedSprite) return;
  var sprite = customSprites[selectedSprite];
  if (!sprite || !sprite.frames.length) return;

  var ctx = previewCtx;
  var W = 400, H = 340;
  ctx.clearRect(0, 0, W, H);

  var frameIdx = getPreviewFrameIdx(sprite.frames.length, customWalkStep);
  var frameImg = sprite.frames[Math.min(frameIdx, sprite.frames.length - 1)];
  if (!frameImg || !frameImg.complete || !frameImg.naturalWidth) return;
  var fw = frameImg.naturalWidth, fh = frameImg.naturalHeight;

  // Large centered preview
  var maxH  = Math.round(H * 0.52);
  var scale = Math.max(1, Math.floor(Math.min(maxH / fh, Math.round(W * 0.6) / fw)));
  var drawW = fw * scale, drawH = fh * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frameImg, 0, 0, fw, fh,
    Math.round((W - drawW) / 2), Math.round(H * 0.04), drawW, drawH);

  // Filmstrip — show all frames with current highlighted
  var count     = sprite.frames.length;
  var stripSize = Math.min(40, Math.floor((W - (count + 1) * 4) / count));
  var totalW    = count * stripSize + (count - 1) * 4;
  var sx0       = Math.round((W - totalW) / 2);
  var sy        = H - stripSize - 22;

  sprite.frames.forEach(function(img, i) {
    if (!img || !img.complete || !img.naturalWidth) return;
    var sx    = sx0 + i * (stripSize + 4);
    var isAct = (i === frameIdx);
    ctx.fillStyle = '#111';
    ctx.fillRect(sx, sy, stripSize, stripSize);
    for (var ty = 0; ty < stripSize; ty += 6) {
      for (var tx = 0; tx < stripSize; tx += 6) {
        if ((Math.floor(tx / 6) + Math.floor(ty / 6)) % 2 === 0) {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(sx + tx, sy + ty, 6, 6);
        }
      }
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, sx, sy, stripSize, stripSize);
    ctx.strokeStyle = isAct ? '#3fb950' : '#21262d';
    ctx.lineWidth   = isAct ? 2 : 1;
    ctx.strokeRect(sx - 1, sy - 1, stripSize + 2, stripSize + 2);
    ctx.fillStyle  = isAct ? '#3fb950' : '#444';
    ctx.font       = '8px Courier New';
    ctx.textAlign  = 'center';
    ctx.fillText(FRAME_LABELS[i] || ('F' + (i + 1)), sx + stripSize / 2, sy + stripSize + 12);
  });
}

// ═══════════════════════════════════════════════════════════
//  RIGHT PANEL — SPRITE SETTINGS
// ═══════════════════════════════════════════════════════════

function buildPropsPanel() {
  if (!selectedSprite) return;
  var sprite = customSprites[selectedSprite];
  if (!sprite) return;

  var panel = document.getElementById('props-panel');
  document.getElementById('props-empty').style.display = 'none';
  panel.querySelectorAll('.prop-section').forEach(function(s) { s.remove(); });

  // ── Sprite Frames ──
  var framesSection = document.createElement('div');
  framesSection.className = 'prop-section';
  var fHead = document.createElement('div');
  fHead.className = 'prop-section-title';
  fHead.textContent = 'Sprite Frames';
  framesSection.appendChild(fHead);

  var frameRow = document.createElement('div');
  frameRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:4px';
  sprite.frames.forEach(function(frameImg, i) {
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px';
    var fc = document.createElement('canvas');
    var displaySize = 48;
    fc.width = fc.height = displaySize;
    fc.style.cssText = 'image-rendering:pixelated;border:1px solid #21262d;border-radius:2px;' +
      'background:repeating-conic-gradient(#1a1a1a 0% 25%,#222 0% 50%) 0 0/8px 8px';
    if (frameImg.complete && frameImg.naturalWidth) {
      var fctx = fc.getContext('2d');
      fctx.imageSmoothingEnabled = false;
      fctx.drawImage(frameImg, 0, 0, frameImg.naturalWidth, frameImg.naturalHeight, 0, 0, displaySize, displaySize);
    }
    var lbl = document.createElement('span');
    lbl.textContent = FRAME_LABELS[i] || ('F' + (i + 1));
    lbl.style.cssText = 'font-size:8px;color:#555;font-family:monospace';
    wrapper.appendChild(fc);
    wrapper.appendChild(lbl);
    frameRow.appendChild(wrapper);
  });
  framesSection.appendChild(frameRow);

  var dlBtn = document.createElement('button');
  dlBtn.className = 'tb-btn';
  dlBtn.textContent = '↓ Download Strip';
  dlBtn.style.cssText = 'margin-top:10px;width:100%';
  dlBtn.addEventListener('click', function() { downloadStrip(selectedSprite); });
  framesSection.appendChild(dlBtn);
  panel.appendChild(framesSection);

  // ── Map Scale ──
  var scaleSection = document.createElement('div');
  scaleSection.className = 'prop-section';
  var sHead = document.createElement('div');
  sHead.className = 'prop-section-title';
  sHead.textContent = 'Map Size';
  scaleSection.appendChild(sHead);

  var scaleDesc = document.createElement('div');
  scaleDesc.style.cssText = 'font-size:9px;color:#555;margin-bottom:8px';
  scaleDesc.textContent = 'Multiplier on top of base size (3.1×). Changes apply immediately.';
  scaleSection.appendChild(scaleDesc);

  var currentScale = sprite.scale != null ? sprite.scale : 1.0;
  var scaleRow = document.createElement('div');
  scaleRow.style.cssText = 'display:flex;align-items:center;gap:8px';

  var scaleSlider = document.createElement('input');
  scaleSlider.type  = 'range';
  scaleSlider.min   = '0.1';
  scaleSlider.max   = '2.0';
  scaleSlider.step  = '0.05';
  scaleSlider.value = currentScale;
  scaleSlider.style.cssText = 'flex:1;accent-color:#4caf50';

  var scaleLabel = document.createElement('span');
  scaleLabel.style.cssText = 'font-size:11px;color:#e0e0e0;font-family:monospace;width:36px;text-align:right';
  scaleLabel.textContent = parseFloat(currentScale).toFixed(2) + '×';

  scaleSlider.addEventListener('input', function() {
    var v = parseFloat(scaleSlider.value);
    scaleLabel.textContent = v.toFixed(2) + '×';
    customSprites[selectedSprite].scale = v;
  });
  scaleSlider.addEventListener('change', function() {
    saveCustomSprites();
  });

  scaleRow.appendChild(scaleSlider);
  scaleRow.appendChild(scaleLabel);
  scaleSection.appendChild(scaleRow);

  var presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:4px;margin-top:6px';
  [[0.3,'Tiny'],[0.6,'Small'],[1.0,'Normal'],[1.5,'Large']].forEach(function(p) {
    var pb = document.createElement('button');
    pb.className = 'tb-btn';
    pb.textContent = p[1];
    pb.style.cssText = 'flex:1;font-size:10px;padding:3px 0';
    pb.addEventListener('click', function() {
      scaleSlider.value = p[0];
      scaleLabel.textContent = parseFloat(p[0]).toFixed(2) + '×';
      customSprites[selectedSprite].scale = p[0];
      saveCustomSprites();
      showToast('Scale → ' + p[1]);
    });
    presetRow.appendChild(pb);
  });
  scaleSection.appendChild(presetRow);
  panel.appendChild(scaleSection);

  // ── Assign to Agent ──
  var assignSection = document.createElement('div');
  assignSection.className = 'prop-section';
  var aHead = document.createElement('div');
  aHead.className = 'prop-section-title';
  aHead.textContent = 'Assign to Agent';
  assignSection.appendChild(aHead);

  var assignedTo = Object.keys(spriteAssignments).filter(function(k) {
    return spriteAssignments[k] === selectedSprite;
  });
  var assignedDisplay = document.createElement('div');
  assignedDisplay.style.cssText = 'font-size:10px;color:#555;margin-bottom:8px;min-height:14px';
  assignedDisplay.textContent = assignedTo.length
    ? 'Assigned to: ' + assignedTo.join(', ')
    : 'Not assigned to any agent yet';
  assignSection.appendChild(assignedDisplay);

  // Agent chips
  var agentChipsDiv = document.createElement('div');
  agentChipsDiv.style.cssText = 'margin-bottom:6px;min-height:20px';
  assignSection.appendChild(agentChipsDiv);

  var assignInput = document.createElement('input');
  assignInput.type = 'text';
  assignInput.placeholder = 'Click an agent above, or type name';
  assignInput.style.cssText = 'background:#0d1117;color:#e0e0e0;border:1px solid #333;' +
    'font-family:monospace;font-size:12px;padding:5px 8px;border-radius:3px;' +
    'width:100%;margin-bottom:6px;box-sizing:border-box';
  assignSection.appendChild(assignInput);

  // Load agents from storage
  if (chromeStorageAvailable) {
    chrome.storage.local.get(['agentState'], function(result) {
      var agents = (result.agentState && result.agentState.agents) || [];
      if (!agents.length) {
        agentChipsDiv.style.cssText = 'font-size:9px;color:#444;margin-bottom:6px';
        agentChipsDiv.textContent = 'No agents online yet. Open the map with gateway connected.';
        return;
      }
      agentChipsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px';
      agents.forEach(function(agent) {
        var chip = document.createElement('button');
        chip.style.cssText = 'background:#1a2a1a;color:#4caf50;border:1px solid #2a4a2a;' +
          'border-radius:10px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:monospace;white-space:nowrap';
        var keyValue = agent.botUsername || agent.id;
        chip.textContent = agent.name || keyValue;
        chip.title = 'Key: ' + keyValue;
        chip.addEventListener('click', function() {
          assignInput.value = keyValue;
          agentChipsDiv.querySelectorAll('button').forEach(function(b) {
            b.style.background = '#1a2a1a'; b.style.borderColor = '#2a4a2a';
          });
          chip.style.background = '#2a5a2a';
          chip.style.borderColor = '#4caf50';
        });
        agentChipsDiv.appendChild(chip);
      });
    });
  } else {
    agentChipsDiv.style.cssText = 'font-size:9px;color:#444;margin-bottom:6px';
    agentChipsDiv.textContent = 'Open via extension to see connected agents.';
  }

  var assignRow = document.createElement('div');
  assignRow.style.cssText = 'display:flex;gap:6px';

  var assignBtn = document.createElement('button');
  assignBtn.className = 'tb-btn primary';
  assignBtn.textContent = 'Assign';
  assignBtn.style.cssText = 'flex:1;padding:5px 0';
  assignBtn.addEventListener('click', function() {
    var key = assignInput.value.trim();
    if (!key) { showToast('Select or type an agent name'); return; }
    spriteAssignments[key] = selectedSprite;
    saveAssignments();
    showToast('Assigned → ' + selectedSprite);
    buildPropsPanel();
  });

  var unassignBtn = document.createElement('button');
  unassignBtn.className = 'tb-btn danger';
  unassignBtn.textContent = 'Remove';
  unassignBtn.style.cssText = 'flex:1;padding:5px 0';
  unassignBtn.addEventListener('click', function() {
    var key = assignInput.value.trim();
    if (!key) {
      Object.keys(spriteAssignments).forEach(function(k) {
        if (spriteAssignments[k] === selectedSprite) delete spriteAssignments[k];
      });
    } else {
      delete spriteAssignments[key];
    }
    saveAssignments();
    showToast('Removed assignment');
    buildPropsPanel();
    buildSpritesList();
  });

  assignRow.appendChild(assignBtn);
  assignRow.appendChild(unassignBtn);
  assignSection.appendChild(assignRow);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:9px;color:#444;margin-top:6px;line-height:1.4';
  hint.textContent = 'Click an agent chip to select, then press Assign. Changes sync to the map immediately.';
  assignSection.appendChild(hint);
  panel.appendChild(assignSection);
}

// ═══════════════════════════════════════════════════════════
//  DOWNLOAD STRIP
// ═══════════════════════════════════════════════════════════

function downloadStrip(name) {
  var sprite = customSprites[name];
  if (!sprite || !sprite.frames.length) return;
  var count = sprite.frames.length;
  var size  = sprite.frames[0].naturalWidth || sprite.frames[0].width || 64;
  var strip = document.createElement('canvas');
  strip.width = size * count;
  strip.height = size;
  var ctx = strip.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  sprite.frames.forEach(function(img, i) {
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, i * size, 0, size, size);
  });
  var a = document.createElement('a');
  a.download = name.toLowerCase().replace(/\s+/g, '_') + '_strip.png';
  a.href = strip.toDataURL('image/png');
  a.click();
}

// ═══════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════

var toastTimeout = null;
function showToast(msg) {
  var existing = document.getElementById('toast-msg');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'toast-msg';
  toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);' +
    'background:#3fb950;color:#000;padding:6px 20px;font-size:12px;font-weight:bold;' +
    'border-radius:4px;z-index:999;font-family:monospace;pointer-events:none';
  toast.textContent = msg;
  document.body.appendChild(toast);
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function() { toast.remove(); }, 2000);
}

// ═══════════════════════════════════════════════════════════
//  EVENT WIRING
// ═══════════════════════════════════════════════════════════

// Upload button
document.getElementById('btn-upload-sprite').addEventListener('click', function() {
  document.getElementById('sprite-file-input').click();
});

document.getElementById('sprite-file-input').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  var reader = new FileReader();
  reader.onload = function(evt) {
    var img = new Image();
    img.onload = function() {
      var name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
        .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      processAndShowUploadModal(img, name);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('btn-upload-confirm').addEventListener('click', function() { confirmUpload(); });
document.getElementById('btn-upload-cancel').addEventListener('click', function() {
  document.getElementById('upload-modal-overlay').classList.remove('open');
  pendingUploadImg = null;
});
document.getElementById('upload-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) { this.classList.remove('open'); pendingUploadImg = null; }
});
document.getElementById('upload-name-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') confirmUpload();
  if (e.key === 'Escape') { document.getElementById('upload-modal-overlay').classList.remove('open'); pendingUploadImg = null; }
});
document.getElementById('upload-tolerance').addEventListener('input', function() {
  uploadTolerance = parseInt(this.value, 10);
  document.getElementById('upload-tolerance-val').textContent = uploadTolerance;
  repaintUploadModal();
});

// Help modal
document.getElementById('btn-help').addEventListener('click', function() {
  document.getElementById('help-modal-overlay').classList.add('open');
});
document.getElementById('btn-help-close').addEventListener('click', function() {
  document.getElementById('help-modal-overlay').classList.remove('open');
});
document.getElementById('help-modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open');
});
document.getElementById('btn-copy-prompt').addEventListener('click', function() {
  var text   = document.getElementById('help-prompt-textarea').value;
  var status = document.getElementById('help-copy-status');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      status.textContent = '✓ Copied!';
      setTimeout(function() { status.textContent = ''; }, 2500);
    });
  } else {
    document.getElementById('help-prompt-textarea').select();
    document.execCommand('copy');
    status.textContent = '✓ Copied!';
    setTimeout(function() { status.textContent = ''; }, 2500);
  }
});

// ── Bootstrap ──
window.addEventListener('load', function() {
  loadAssignments();
  loadCustomSprites();
  // Show "no selection" if no sprites loaded
  setTimeout(function() {
    if (!Object.keys(customSprites).length) {
      document.getElementById('no-selection-msg').style.display = '';
    }
  }, 300);
});
