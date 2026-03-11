import { SCALE_MODES, Texture } from 'pixi.js';
import { getAssetUrl, loadImage } from './assets.js';

const FRAME_SIZE = 32;
const FRAME_GROUP = 6;
const DIRECTION_TO_OFFSET = {
  down: 0,
  right: 6,
  up: 12,
  left: 18,
};

const PERSONAS = {
  Nova: { bodyRow: 1, hairRow: 0, outfit: 1 },
  Sentry: { bodyRow: 0, hairRow: 6, outfit: 5 },
  Pixel: { bodyRow: 3, hairRow: 2, outfit: 4 },
  Echo: { bodyRow: 2, hairRow: 4, outfit: 2 },
  Cipher: { bodyRow: 4, hairRow: 7, outfit: 6 },
  Relay: { bodyRow: 5, hairRow: 1, outfit: 3 },
  Atlas: { bodyRow: 1, hairRow: 5, outfit: 5 },
  Bolt: { bodyRow: 4, hairRow: 3, outfit: 2 },
  fallback: { bodyRow: 0, hairRow: 0, outfit: 1 },
};

let characterAssetsPromise = null;
const generatedPersonaAssignments = new Map();
const usedGeneratedPersonaSignatures = new Set();
const GENERATED_PERSONA_COUNT = 6 * 8 * 6;

function hashName(name, seed = 0) {
  let hash = seed >>> 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33 + name.charCodeAt(i) + seed) >>> 0;
  }
  return hash;
}

function personaFromIndex(index) {
  const normalized = ((index % GENERATED_PERSONA_COUNT) + GENERATED_PERSONA_COUNT) % GENERATED_PERSONA_COUNT;
  const bodyRow = normalized % 6;
  const hairRow = Math.floor(normalized / 6) % 8;
  const outfit = Math.floor(normalized / (6 * 8)) % 6 + 1;
  return { bodyRow, hairRow, outfit };
}

function personaSignature(persona) {
  return `${persona.bodyRow}:${persona.hairRow}:${persona.outfit}`;
}

function createGeneratedPersona(name) {
  if (generatedPersonaAssignments.has(name)) {
    return generatedPersonaAssignments.get(name);
  }

  const startIndex = hashName(name, 97) % GENERATED_PERSONA_COUNT;
  for (let offset = 0; offset < GENERATED_PERSONA_COUNT; offset++) {
    const persona = personaFromIndex(startIndex + offset);
    const signature = personaSignature(persona);
    if (usedGeneratedPersonaSignatures.has(signature)) continue;
    generatedPersonaAssignments.set(name, persona);
    usedGeneratedPersonaSignatures.add(signature);
    return persona;
  }

  const fallbackPersona = personaFromIndex(startIndex);
  generatedPersonaAssignments.set(name, fallbackPersona);
  return fallbackPersona;
}


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

function createFrameTexture(bodyImage, outfitImage, hairImage, bodyRow, hairRow, frameIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_SIZE;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
  ctx.drawImage(
    bodyImage,
    frameIndex * FRAME_SIZE,
    bodyRow * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );
  ctx.drawImage(
    outfitImage,
    frameIndex * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );
  ctx.drawImage(
    hairImage,
    frameIndex * FRAME_SIZE,
    hairRow * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    0,
    0,
    FRAME_SIZE,
    FRAME_SIZE
  );

  return applyNearestScale(Texture.from(canvas));
}

async function loadCharacterAssets() {
  const [bodyImage, hairImage, shadowImage, ...outfits] = await Promise.all([
    loadImage(getAssetUrl('assets/characters/metro-city/character-model/Character Model.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/hair/Hairs.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/character-model/Shadow.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit1.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit2.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit3.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit4.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit5.png')),
    loadImage(getAssetUrl('assets/characters/metro-city/outfits/Outfit6.png')),
  ]);

  return { bodyImage, hairImage, shadowImage, outfits };
}

function getPersona(name) {
  if (PERSONAS[name]) return PERSONAS[name];
  return createGeneratedPersona(name || 'fallback');
}

export function getCharacterKey(agent) {
  if (!agent) return 'fallback';
  if (PERSONAS[agent.name]) return agent.name;
  return `${agent.id || agent.name || 'agent'}::${agent.botUsername || agent.name || 'unknown'}`;
}

export async function createCharacterLibrary(agentNames) {
  if (!characterAssetsPromise) {
    characterAssetsPromise = loadCharacterAssets();
  }

  const assets = await characterAssetsPromise;
  const shadowTexture = applyNearestScale(Texture.from(assets.shadowImage));
  const library = new Map();

  for (const name of agentNames) {
    const persona = getPersona(name);
    const outfitImage = assets.outfits[(persona.outfit || 1) - 1];
    const directions = {};

    for (const [direction, offset] of Object.entries(DIRECTION_TO_OFFSET)) {
      const walk = [];
      for (let i = 0; i < FRAME_GROUP; i++) {
        walk.push(
          createFrameTexture(
            assets.bodyImage,
            outfitImage,
            assets.hairImage,
            persona.bodyRow,
            persona.hairRow,
            offset + i
          )
        );
      }
      directions[direction] = {
        idle: walk[0],
        walk,
      };
    }

    library.set(name, {
      directions,
      shadowTexture,
    });
  }

  return library;
}


export async function drawCharacterPortrait(canvas, agentName, options = {}) {
  if (!canvas) return;

  if (!characterAssetsPromise) {
    characterAssetsPromise = loadCharacterAssets();
  }

  const assets = await characterAssetsPromise;
  const persona = getPersona(agentName);
  const outfitImage = assets.outfits[(persona.outfit || 1) - 1];
  const frameIndex = DIRECTION_TO_OFFSET.down;
  const scale = options.scale || 2;
  const offsetY = options.offsetY || 0;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const drawW = FRAME_SIZE * scale;
  const drawH = FRAME_SIZE * scale;
  const x = Math.round((canvas.width - drawW) / 2);
  const y = Math.round((canvas.height - drawH) / 2 + offsetY);

  ctx.drawImage(
    assets.bodyImage,
    frameIndex * FRAME_SIZE,
    persona.bodyRow * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    x,
    y,
    drawW,
    drawH
  );
  ctx.drawImage(
    outfitImage,
    frameIndex * FRAME_SIZE,
    0,
    FRAME_SIZE,
    FRAME_SIZE,
    x,
    y,
    drawW,
    drawH
  );
  ctx.drawImage(
    assets.hairImage,
    frameIndex * FRAME_SIZE,
    persona.hairRow * FRAME_SIZE,
    FRAME_SIZE,
    FRAME_SIZE,
    x,
    y,
    drawW,
    drawH
  );
}
