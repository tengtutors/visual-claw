import 'pixi.js/unsafe-eval';
import {
  Assets,
  Container,
  Graphics,
  Rectangle,
  SCALE_MODES,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import { MAP_W, MAP_H, OFFICE_LAYOUT, ROOM_LABELS } from '../../lib/office-map.js';
import { STATE_COLORS } from '../../lib/constants.js';
import { getAssetUrl } from '../utils/assets.js';
import { createCharacterLibrary, getCharacterKey } from '../utils/characters.js';
import {
  TILE, TILE_SCALE, SRC, TILESET_PATH,
  ROOM_COLS, ROOM_ROWS, ROOM_ORIGIN_X, ROOM_ORIGIN_Y,
  buildFloorGrid, ensureOfficeLayoutLoaded, getFurnitureObjects, getInteractiveFurniture, SCALED_TILE,
  hitTestFurniture,
} from '../../lib/tile-map.js';

const AGENT_WORLD_SCALE = 3.1;
const VIEW_ZOOM = 1.08;
const CHAT_BUBBLE_DURATION = 20000; // ms to show bubble
const CHAT_BUBBLE_FADE_START = 17000; // ms before starting fade
const CHAT_BUBBLE_MAX_WIDTH = 220;
const CHAT_BUBBLE_MAX_CHARS = 140;

// Set to true to use tile-based rendering, false for legacy single-image
const USE_TILE_RENDERER = true;

function applyNearestScale(texture) {
  const source = texture?.source;
  const style = source?.style;

  if (style) {
    style.scaleMode = SCALE_MODES.NEAREST;
    style.magFilter = SCALE_MODES.NEAREST;
    style.minFilter = SCALE_MODES.NEAREST;
    style.mipmapFilter = SCALE_MODES.NEAREST;
    style.update();
  }

  return texture;
}

function makeLabel(text, x, y) {
  const label = new Text({
    text,
    style: {
      fontFamily: 'Courier New',
      fontSize: 34,
      fontWeight: '700',
      fill: '#fff7ed',
      stroke: { color: '#3b2f2f', width: 5 },
    },
  });
  label.x = x;
  label.y = y;
  label.anchor.set(0.5, 0);
  return label;
}

function getDirection(sprite) {
  if (sprite.direction === 'left' || sprite.direction === 'right' || sprite.direction === 'up') return sprite.direction;
  return 'down';
}

function getFrameIndex(sprite) {
  return sprite.animation === 'walk' ? sprite.walkFrame % 6 : 0;
}

export async function createOfficeScene(app) {
  await ensureOfficeLayoutLoaded();
  const characterLibrary = new Map();

  const stage = app.stage;
  const root = new Container();
  const backgroundLayer = new Container();
  const worldLayer = new Container();
  const overlayLayer = new Container();
  const camera = { scale: 1, offsetX: 0, offsetY: 0 };
  const spriteNodes = new Map();
  const agentById = new Map();

  worldLayer.sortableChildren = true;
  root.addChild(backgroundLayer, worldLayer, overlayLayer);
  stage.addChild(root);

  const furnitureSpriteMap = new Map();
  let highlightedFurnitureId = null;

  if (USE_TILE_RENDERER) {
    // --- Tile-based rendering ---
    const tilesetTexture = await Assets.load(getAssetUrl(TILESET_PATH));
    applyNearestScale(tilesetTexture);
    const floorGrid = buildFloorGrid();

    // Render floor + wall tiles into backgroundLayer
    for (let row = 0; row < floorGrid.length; row++) {
      for (let col = 0; col < floorGrid[row].length; col++) {
        const tileKey = floorGrid[row][col];
        if (!tileKey) continue;
        const srcRect = SRC[tileKey];
        if (!srcRect) continue;

        const tileTexture = new Texture({
          source: tilesetTexture.source,
          frame: new Rectangle(srcRect.x, srcRect.y, srcRect.w, srcRect.h),
        });
        applyNearestScale(tileTexture);

        const tileSprite = new Sprite(tileTexture);
        tileSprite.x = ROOM_ORIGIN_X + col * SCALED_TILE;
        tileSprite.y = ROOM_ORIGIN_Y + row * SCALED_TILE;
        tileSprite.scale.set(TILE_SCALE);
        tileSprite.roundPixels = true;
        backgroundLayer.addChild(tileSprite);
      }
    }

    // Render furniture as individual sprites in worldLayer (Y-sorted)
    const furnitureObjects = getFurnitureObjects();
    const interactiveFurniture = getInteractiveFurniture();
    for (const furniture of furnitureObjects) {
      const furnitureTexture = new Texture({
        source: tilesetTexture.source,
        frame: new Rectangle(furniture.src.x, furniture.src.y, furniture.src.w, furniture.src.h),
      });
      applyNearestScale(furnitureTexture);

      const furnitureSprite = new Sprite(furnitureTexture);
      furnitureSprite.x = furniture.flipped ? furniture.x + furniture.src.w * TILE_SCALE : furniture.x;
      furnitureSprite.y = furniture.y;
      furnitureSprite.scale.set(furniture.flipped ? -TILE_SCALE : TILE_SCALE, TILE_SCALE);
      furnitureSprite.roundPixels = true;
      furnitureSprite.zIndex = furniture.zAnchor;
      worldLayer.addChild(furnitureSprite);

      // Track interactive furniture sprites for highlight
      if (interactiveFurniture[furniture.id]) {
        furnitureSpriteMap.set(furniture.id, furnitureSprite);
      }
    }
  } else {
    // --- Legacy single-image rendering ---
    const workRoomTexture = await Assets.load(getAssetUrl('assets/office/rooms/Office Level 2.png'));
    for (const room of OFFICE_LAYOUT.rooms) {
      const roomSprite = new Sprite(workRoomTexture);
      roomSprite.x = room.art.x;
      roomSprite.y = room.art.y;
      roomSprite.scale.set(room.art.scale);
      applyNearestScale(roomSprite.texture);
      roomSprite.roundPixels = true;
      backgroundLayer.addChild(roomSprite);
    }
  }

  for (const label of ROOM_LABELS) {
    overlayLayer.addChild(makeLabel(label.text, label.x, label.y));
  }

  async function ensureLibraryEntry(key) {
    if (!characterLibrary.has(key)) {
      const generated = await createCharacterLibrary([key]);
      for (const [entryKey, value] of generated.entries()) {
        characterLibrary.set(entryKey, value);
      }
    }

    return characterLibrary.get(key) || characterLibrary.get('Nova');
  }

  async function ensureAgentNode(agent) {
    let node = spriteNodes.get(agent.id);
    if (node) return node;
    const libraryEntry = await ensureLibraryEntry(getCharacterKey(agent));
    const container = new Container();
    const sprite = new Sprite(libraryEntry.directions.down.idle);
    const ring = new Graphics();
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(AGENT_WORLD_SCALE, AGENT_WORLD_SCALE);
    sprite.roundPixels = true;
    ring.visible = false;

    // Chat bubble container
    const bubbleContainer = new Container();
    bubbleContainer.visible = false;
    const bubbleBg = new Graphics();
    const bubbleText = new Text({
      text: '',
      style: {
        fontFamily: 'Courier New',
        fontSize: 11,
        fill: '#fff',
        wordWrap: true,
        wordWrapWidth: CHAT_BUBBLE_MAX_WIDTH - 12,
        lineHeight: 14,
      },
    });
    bubbleText.anchor.set(0.5, 1);
    bubbleContainer.addChild(bubbleBg, bubbleText);

    container.addChild(ring, sprite, bubbleContainer);
    worldLayer.addChild(container);
    node = { container, sprite, ring, libraryEntry, bubbleContainer, bubbleBg, bubbleText, lastBubbleText: '' };
    spriteNodes.set(agent.id, node);
    return node;
  }

  async function syncAgents(agents) {
    const liveIds = new Set(agents.map((agent) => agent.id));
    for (const agent of agents) {
      agentById.set(agent.id, agent);
      await ensureAgentNode(agent);
    }
    for (const [id, node] of spriteNodes.entries()) {
      if (liveIds.has(id)) continue;
      worldLayer.removeChild(node.container);
      node.container.destroy({ children: true });
      spriteNodes.delete(id);
      agentById.delete(id);
    }
  }

  function resize(width) {
    const rawScale = Math.min((width / MAP_W) * VIEW_ZOOM, 1);
    const scale = Math.max(0.5, Math.round(rawScale * 4) / 4);
    camera.scale = scale;
    camera.offsetX = Math.max(0, (width - MAP_W * scale) / 2);
    camera.offsetY = 18;
    root.x = camera.offsetX;
    root.y = camera.offsetY;
    root.scale.set(scale);
  }

  async function render({ sprites, agents, selectedAgentId, hoveredAgentId }) {
    await syncAgents(agents);
    for (const spriteState of sprites) {
      const agent = agentById.get(spriteState.id);
      const node = spriteNodes.get(spriteState.id);
      if (!agent || !node) continue;
      const frames = node.libraryEntry.directions[getDirection(spriteState)];
      node.container.x = Math.round(spriteState.x);
      node.container.y = Math.round(spriteState.y);
      node.container.zIndex = Math.round(spriteState.y);
      node.sprite.texture = spriteState.animation === 'walk' ? frames.walk[getFrameIndex(spriteState)] : frames.idle;
      applyNearestScale(node.sprite.texture);
      node.ring.clear();
      if (spriteState.id === selectedAgentId || spriteState.id === hoveredAgentId) {
        const highlight = spriteState.id === selectedAgentId ? STATE_COLORS[agent.state] || '#ffffff' : '#ffffff';
        node.ring.circle(0, -24, 26).stroke({ color: highlight, width: 4, alpha: 0.92 });
        node.ring.visible = true;
      } else {
        node.ring.visible = false;
      }

      // Chat bubble
      const snippet = agent.chatSnippet;
      const snippetTs = agent.chatSnippetTs || 0;
      const elapsed = Date.now() - snippetTs;

      if (snippet && elapsed < CHAT_BUBBLE_DURATION) {
        // Update text only when it changes
        const truncated = snippet.length > CHAT_BUBBLE_MAX_CHARS
          ? snippet.slice(0, CHAT_BUBBLE_MAX_CHARS - 1) + '…'
          : snippet;

        if (truncated !== node.lastBubbleText) {
          node.bubbleText.text = truncated;
          node.lastBubbleText = truncated;
        }

        // Position bubble above agent head
        const textBounds = node.bubbleText;
        const tw = Math.min(textBounds.width, CHAT_BUBBLE_MAX_WIDTH);
        const th = textBounds.height;
        const padX = 8, padY = 5;
        const bw = tw + padX * 2;
        const bh = th + padY * 2;
        const bubbleY = -68; // above sprite head

        node.bubbleText.x = 0;
        node.bubbleText.y = bubbleY - padY;

        // Draw background rounded rect + pointer
        node.bubbleBg.clear();
        node.bubbleBg.roundRect(-bw / 2, bubbleY - bh - padY, bw, bh, 6);
        node.bubbleBg.fill({ color: '#1a1a2e', alpha: 0.88 });
        // Small pointer triangle
        node.bubbleBg.moveTo(-5, bubbleY - padY);
        node.bubbleBg.lineTo(0, bubbleY - padY + 6);
        node.bubbleBg.lineTo(5, bubbleY - padY);
        node.bubbleBg.closePath();
        node.bubbleBg.fill({ color: '#1a1a2e', alpha: 0.88 });

        // Fade out near end
        const alpha = elapsed > CHAT_BUBBLE_FADE_START
          ? 1 - (elapsed - CHAT_BUBBLE_FADE_START) / (CHAT_BUBBLE_DURATION - CHAT_BUBBLE_FADE_START)
          : 1;
        node.bubbleContainer.alpha = Math.max(0, alpha);
        node.bubbleContainer.visible = true;
      } else {
        node.bubbleContainer.visible = false;
        node.lastBubbleText = '';
      }
    }
  }

  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - camera.offsetX) / camera.scale,
      y: (screenY - camera.offsetY) / camera.scale,
    };
  }

  function highlightFurniture(furnitureId) {
    // Reset previous highlight
    if (highlightedFurnitureId && furnitureSpriteMap.has(highlightedFurnitureId)) {
      furnitureSpriteMap.get(highlightedFurnitureId).tint = 0xffffff;
    }
    highlightedFurnitureId = furnitureId;
    // Apply new highlight
    if (furnitureId && furnitureSpriteMap.has(furnitureId)) {
      furnitureSpriteMap.get(furnitureId).tint = 0xaaffaa;
    }
  }

  function destroy() {
    stage.removeChild(root);
    root.destroy({ children: true });
  }

  return { resize, render, screenToWorld, hitTestFurniture, highlightFurniture, destroy };
}
