/**
 * Movement controller — manages per-agent position, targets, animation state.
 */

import { STATE_TO_ZONE, STATES } from './constants.js';
import { isWalkable, pickSpot, getWanderTarget, resolveWalkablePoint } from './office-map.js';

const MOVE_SPEED = 2.6;
const ARRIVAL_DIST = 4;
const WANDER_INTERVAL_MIN = 3000;
const WANDER_INTERVAL_MAX = 7000;
const ACTIVE_REPOSITION_MIN = 5000;
const ACTIVE_REPOSITION_MAX = 10000;
const AGENT_RADIUS = 10;
const REST_ROUTE_WAYPOINTS = [
  { x: 500, y: 500 },
  { x: 500, y: 340 },
];

function needsAisleDetour(sprite, targetX, targetY, spot) {
  const movingToRest = sprite.zone === 'rest'
    && sprite.x < 430
    && targetX > 560
    && sprite.y > 620
    && targetY < 620;

  const movingToDesk = (spot.posture === 'desk' || sprite.zone === 'work')
    && sprite.x > 560
    && sprite.y < 620
    && targetX < 560
    && targetY > 620;

  return movingToRest || movingToDesk;
}

function setSpriteTarget(sprite, spot) {
  sprite.targetX = spot.x;
  sprite.targetY = spot.y;
  sprite.anchorDirection = spot.direction || sprite.anchorDirection || 'down';
  sprite.posture = spot.posture || 'idle';

  if (needsAisleDetour(sprite, spot.x, spot.y, spot)) {
    const routePoints = REST_ROUTE_WAYPOINTS.map((point) => resolveWalkablePoint(sprite.zone, point.x, point.y, AGENT_RADIUS));
    sprite.routePoints = [...routePoints, { x: spot.x, y: spot.y }];
    const firstStop = sprite.routePoints.shift();
    sprite.targetX = firstStop.x;
    sprite.targetY = firstStop.y;
  } else {
    sprite.routePoints = null;
  }
}

// Spawn point — bottom-right doormat / rug area
const SPAWN_POINT = { x: 700, y: 730 };

function createSpriteState(agent, takenPositions) {
  const zone = STATE_TO_ZONE[agent.state] || agent.zone || 'rest';
  const spot = pickSpot(zone, takenPositions);
  return {
    id: agent.id,
    x: SPAWN_POINT.x + (Math.random() - 0.5) * 30,
    y: SPAWN_POINT.y + (Math.random() - 0.5) * 20,
    targetX: spot.x,
    targetY: spot.y,
    direction: spot.direction || 'down',
    anchorDirection: spot.direction || 'down',
    posture: spot.posture || 'idle',
    animation: 'idle',
    zone,
    walkFrame: 0,
    walkTimer: 0,
    wanderTimer: randomWanderDelay(),
    shakeTimer: 0,
    bubbleTimer: 0,
    prevState: agent.state,
    stuckFrames: 0,
    routePoints: null,
  };
}

function randomWanderDelay() {
  return WANDER_INTERVAL_MIN + Math.random() * (WANDER_INTERVAL_MAX - WANDER_INTERVAL_MIN);
}

function randomActiveDelay() {
  return ACTIVE_REPOSITION_MIN + Math.random() * (ACTIVE_REPOSITION_MAX - ACTIVE_REPOSITION_MIN);
}

function attemptStep(zone, x, y, nextX, nextY) {
  const attempts = [
    { x: nextX, y: nextY },
    { x: nextX, y },
    { x, y: nextY },
  ];
  for (const candidate of attempts) {
    if (isWalkable(zone, candidate.x, candidate.y, AGENT_RADIUS)) {
      return candidate;
    }
  }
  return resolveWalkablePoint(zone, nextX, nextY, AGENT_RADIUS);
}

export class MovementController {
  constructor() {
    this.sprites = new Map();
  }

  sync(agents) {
    const activeIds = new Set(agents.map((a) => a.id));
    for (const id of this.sprites.keys()) {
      if (!activeIds.has(id)) this.sprites.delete(id);
    }

    const takenPositions = [];
    for (const s of this.sprites.values()) {
      takenPositions.push({ x: s.x, y: s.y });
    }

    for (const agent of agents) {
      let sprite = this.sprites.get(agent.id);
      if (!sprite) {
        sprite = createSpriteState(agent, takenPositions);
        this.sprites.set(agent.id, sprite);
        takenPositions.push({ x: sprite.x, y: sprite.y });
        continue;
      }

      const newZone = STATE_TO_ZONE[agent.state] || agent.zone || 'rest';
      if (newZone !== sprite.zone || agent.state !== sprite.prevState) {
        sprite.zone = newZone;
        sprite.prevState = agent.state;
        const taken = [];
        for (const s of this.sprites.values()) {
          if (s.id !== agent.id) taken.push({ x: s.targetX, y: s.targetY });
        }
        const spot = pickSpot(newZone, taken);
        setSpriteTarget(sprite, spot);
        sprite.animation = 'walk';
        sprite.wanderTimer = agent.state === STATES.IDLE || agent.state === STATES.WAITING || agent.state === STATES.OFFLINE
          ? randomWanderDelay()
          : randomActiveDelay();
        sprite.stuckFrames = 0;
      }
    }
  }

  update(dt, agents) {
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    for (const sprite of this.sprites.values()) {
      const agent = agentMap.get(sprite.id);
      if (!agent) continue;

      const dx = sprite.targetX - sprite.x;
      const dy = sprite.targetY - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ARRIVAL_DIST) {
        const prevX = sprite.x;
        const prevY = sprite.y;
        const step = Math.min(MOVE_SPEED, dist);
        const nextX = sprite.x + (dx / dist) * step;
        const nextY = sprite.y + (dy / dist) * step;
        const next = attemptStep(sprite.zone, sprite.x, sprite.y, nextX, nextY);
        sprite.x = next.x;
        sprite.y = next.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          sprite.direction = dx > 0 ? 'right' : 'left';
        } else {
          sprite.direction = dy > 0 ? 'down' : 'up';
        }

        sprite.animation = 'walk';
        sprite.walkTimer += dt;
        if (sprite.walkTimer > 110) {
          sprite.walkFrame = (sprite.walkFrame + 1) % 6;
          sprite.walkTimer = 0;
        }

        if (Math.abs(sprite.x - prevX) < 0.2 && Math.abs(sprite.y - prevY) < 0.2) {
          sprite.stuckFrames += 1;
        } else {
          sprite.stuckFrames = 0;
        }

        if (sprite.stuckFrames > 18 || !isWalkable(sprite.zone, sprite.targetX, sprite.targetY, AGENT_RADIUS)) {
          const fallback = getWanderTarget(sprite.zone, sprite.x, sprite.y);
          setSpriteTarget(sprite, fallback);
          sprite.stuckFrames = 0;
        }
      } else {
        sprite.x = sprite.targetX;
        sprite.y = sprite.targetY;
        sprite.stuckFrames = 0;

        if (sprite.routePoints?.length) {
          const nextStop = sprite.routePoints.shift();
          sprite.targetX = nextStop.x;
          sprite.targetY = nextStop.y;
          if (!sprite.routePoints.length) sprite.routePoints = null;
          sprite.animation = 'walk';
          continue;
        }

        sprite.direction = sprite.anchorDirection || sprite.direction;

        if (agent.state === STATES.BLOCKED) {
          sprite.animation = 'blocked';
          sprite.shakeTimer += dt;
        } else if (agent.state === STATES.WORKING || agent.state === STATES.REVIEWING || agent.state === STATES.HANDOFF) {
          sprite.animation = 'think';
        } else if (agent.state === STATES.MEETING) {
          sprite.animation = 'talk';
          sprite.bubbleTimer += dt;
        } else if (agent.state === STATES.OFFLINE) {
          sprite.animation = 'offline';
        } else {
          sprite.animation = 'idle';
        }

        const isLooseState = agent.state === STATES.IDLE || agent.state === STATES.WAITING || agent.state === STATES.OFFLINE;
        const shouldReposition = isLooseState
          || agent.state === STATES.WORKING
          || agent.state === STATES.REVIEWING
          || agent.state === STATES.HANDOFF
          || agent.state === STATES.MEETING
          || agent.state === STATES.BLOCKED;

        if (shouldReposition) {
          sprite.wanderTimer -= dt;
          if (sprite.wanderTimer <= 0) {
            const taken = [];
            for (const other of this.sprites.values()) {
              if (other.id !== sprite.id) taken.push({ x: other.targetX, y: other.targetY });
            }

            const nextSpot = isLooseState
              ? getWanderTarget(sprite.zone, sprite.x, sprite.y)
              : pickSpot(sprite.zone, taken);

            setSpriteTarget(sprite, nextSpot);
            sprite.wanderTimer = isLooseState ? randomWanderDelay() : randomActiveDelay();
          }
        }
      }
    }
  }

  getSprite(agentId) {
    return this.sprites.get(agentId) || null;
  }

  getAllSprites() {
    return Array.from(this.sprites.values());
  }

  hitTest(mapX, mapY, hitRadius = 28) {
    let closest = null;
    let closestDist = Infinity;

    for (const sprite of this.sprites.values()) {
      const dx = mapX - sprite.x;
      const dy = mapY - (sprite.y - 18);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < closestDist) {
        closest = sprite.id;
        closestDist = dist;
      }
    }
    return closest;
  }
}
