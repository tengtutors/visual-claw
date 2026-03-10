/**
 * Movement controller — manages per-agent position, targets, animation state.
 * Runs outside React on a requestAnimationFrame loop.
 */

import { STATE_TO_ZONE } from './constants.js';
import { pickSpot, getWanderTarget, ZONE_BOUNDS } from './office-map.js';

const MOVE_SPEED = 1.8;       // pixels per frame (faster for larger map)
const ARRIVAL_DIST = 3;       // snap when this close
const WANDER_INTERVAL_MIN = 3000;  // ms between idle wanders
const WANDER_INTERVAL_MAX = 7000;

/**
 * Per-agent sprite state (separate from React agent data).
 */
function createSpriteState(agent, takenPositions) {
  const zone = STATE_TO_ZONE[agent.state] || agent.zone || 'rest';
  const spot = pickSpot(zone, takenPositions);
  return {
    id: agent.id,
    x: spot.x,
    y: spot.y,
    targetX: spot.x,
    targetY: spot.y,
    direction: 'down',   // up | down | left | right
    animation: 'idle',   // idle | walk | think | blocked | talk | offline
    zone,
    walkFrame: 0,
    walkTimer: 0,
    wanderTimer: randomWanderDelay(),
    shakeTimer: 0,       // for blocked shake
    bubbleTimer: 0,      // for speech bubble
    prevState: agent.state,
  };
}

function randomWanderDelay() {
  return WANDER_INTERVAL_MIN + Math.random() * (WANDER_INTERVAL_MAX - WANDER_INTERVAL_MIN);
}

/**
 * MovementController — call update() each frame.
 */
export class MovementController {
  constructor() {
    this.sprites = new Map();   // agentId -> spriteState
    this.lastTime = 0;
  }

  /**
   * Sync sprite states with agent data from the store.
   * Creates new sprites, removes stale ones, updates targets on state change.
   */
  sync(agents) {
    const activeIds = new Set(agents.map((a) => a.id));

    // Remove sprites for agents that no longer exist
    for (const id of this.sprites.keys()) {
      if (!activeIds.has(id)) this.sprites.delete(id);
    }

    // Collect current positions for spot picking
    const takenPositions = [];
    for (const s of this.sprites.values()) {
      takenPositions.push({ x: s.x, y: s.y });
    }

    for (const agent of agents) {
      let sprite = this.sprites.get(agent.id);

      if (!sprite) {
        // New agent — create sprite
        sprite = createSpriteState(agent, takenPositions);
        this.sprites.set(agent.id, sprite);
        takenPositions.push({ x: sprite.x, y: sprite.y });
        continue;
      }

      // Check if agent zone changed (state change)
      const newZone = STATE_TO_ZONE[agent.state] || agent.zone || 'rest';
      if (newZone !== sprite.zone || agent.state !== sprite.prevState) {
        sprite.zone = newZone;
        sprite.prevState = agent.state;

        // Pick new destination in the new zone
        const taken = [];
        for (const s of this.sprites.values()) {
          if (s.id !== agent.id) taken.push({ x: s.targetX, y: s.targetY });
        }
        const spot = pickSpot(newZone, taken);
        sprite.targetX = spot.x;
        sprite.targetY = spot.y;
        sprite.animation = 'walk';
        sprite.wanderTimer = randomWanderDelay();

        // For collaborating agents in meeting, cluster them
        if (agent.state === 'meeting' && agent.collaboratingWith?.length) {
          // They'll naturally end up in meeting zone spots
        }
      }
    }
  }

  /**
   * Update all sprites — call once per frame.
   * @param {number} dt — delta time in ms
   * @param {Array} agents — current agent data from store
   */
  update(dt, agents) {
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    for (const sprite of this.sprites.values()) {
      const agent = agentMap.get(sprite.id);
      if (!agent) continue;

      const dx = sprite.targetX - sprite.x;
      const dy = sprite.targetY - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ARRIVAL_DIST) {
        // Move toward target
        const step = Math.min(MOVE_SPEED, dist);
        sprite.x += (dx / dist) * step;
        sprite.y += (dy / dist) * step;

        // Update direction
        if (Math.abs(dx) > Math.abs(dy)) {
          sprite.direction = dx > 0 ? 'right' : 'left';
        } else {
          sprite.direction = dy > 0 ? 'down' : 'up';
        }

        sprite.animation = 'walk';
        sprite.walkTimer += dt;
        if (sprite.walkTimer > 150) {
          sprite.walkFrame = (sprite.walkFrame + 1) % 4;
          sprite.walkTimer = 0;
        }
      } else {
        // Arrived — snap and go idle
        sprite.x = sprite.targetX;
        sprite.y = sprite.targetY;

        // Set appropriate idle animation based on agent state
        if (agent.state === 'blocked') {
          sprite.animation = 'blocked';
          sprite.shakeTimer += dt;
        } else if (agent.state === 'working' || agent.state === 'reviewing' || agent.state === 'handoff') {
          sprite.animation = 'think';
        } else if (agent.state === 'meeting') {
          sprite.animation = 'talk';
          sprite.bubbleTimer += dt;
        } else if (agent.state === 'offline') {
          sprite.animation = 'offline';
        } else {
          sprite.animation = 'idle';
        }

        // Idle wandering
        sprite.wanderTimer -= dt;
        if (sprite.wanderTimer <= 0) {
          const wander = getWanderTarget(sprite.zone, sprite.x, sprite.y);
          sprite.targetX = wander.x;
          sprite.targetY = wander.y;
          sprite.wanderTimer = randomWanderDelay();
        }
      }
    }
  }

  /**
   * Get sprite state for rendering.
   */
  getSprite(agentId) {
    return this.sprites.get(agentId) || null;
  }

  getAllSprites() {
    return Array.from(this.sprites.values());
  }

  /**
   * Find which agent is at the given map coordinates (for click detection).
   * Returns agentId or null.
   */
  hitTest(mapX, mapY, hitRadius = 22) {
    let closest = null;
    let closestDist = Infinity;

    for (const sprite of this.sprites.values()) {
      const dx = mapX - sprite.x;
      const dy = mapY - (sprite.y - 12); // offset for character center
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < closestDist) {
        closest = sprite.id;
        closestDist = dist;
      }
    }
    return closest;
  }
}
