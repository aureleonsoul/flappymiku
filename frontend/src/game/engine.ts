/**
 * react-native-game-engine entities + systems for Flappy Miku.
 *
 * The engine calls each system once per frame with
 *   (entities, { time, touches, events, dispatch })
 * Systems mutate / return `entities`; UI re-renders only when something
 * changes thanks to entity-level memoisation in the engine.
 */
import { GAME, GameStatus } from "./constants";

export interface Pipe {
  id: string;
  x: number; // left edge
  gapY: number; // top of gap
  passed: boolean;
}

export interface WorldState {
  width: number;
  height: number;
  playableHeight: number; // height - GROUND_H
  status: GameStatus;
  vy: number;
  y: number;
  angle: number;
  flap: number; // 0..1 wing animation
  pipes: Pipe[];
  score: number;
  spawnTimer: number;
  freezeTimer: number; // seconds during which pipes don't move (post-revive)
  invincibleTimer: number; // seconds during which we ignore collisions
  reviveUsed: boolean;
  groundOffset: number;
  cloudOffset: number;
}

export interface Entities {
  world: { state: WorldState };
}

export function createInitialEntities(width: number, height: number): Entities {
  const playableHeight = height - GAME.GROUND_H;
  return {
    world: {
      state: {
        width,
        height,
        playableHeight,
        status: "ready",
        vy: 0,
        y: playableHeight * 0.4,
        angle: 0,
        flap: 0,
        pipes: [],
        score: 0,
        spawnTimer: 0.6,
        freezeTimer: 0,
        invincibleTimer: 0,
        reviveUsed: false,
        groundOffset: 0,
        cloudOffset: 0,
      },
    },
  };
}

let _pipeId = 0;
function nextPipeId(): string {
  _pipeId += 1;
  return `p${_pipeId}`;
}

// ----- Systems -----

interface SystemArgs {
  time: { delta: number };
  touches: { type: string }[];
  events?: { type: string }[];
  dispatch: (e: { type: string; payload?: unknown }) => void;
}

export function physicsSystem(entities: Entities, args: SystemArgs): Entities {
  const dt = args.time.delta / 1000;
  const s = entities.world.state;
  s.cloudOffset = (s.cloudOffset + dt * 14) % 360;

  if (s.status === "ready") {
    // gentle hover
    s.y = s.playableHeight * 0.4 + Math.sin(Date.now() / 350) * 6;
    s.angle = Math.sin(Date.now() / 350) * 0.08;
    s.flap = Math.max(0, s.flap - dt * 4);
    return entities;
  }

  if (s.status === "playing") {
    s.groundOffset = (s.groundOffset + GAME.PIPE_SPEED * dt) % 24;

    s.vy = Math.min(GAME.MAX_VY, s.vy + GAME.GRAVITY * dt);
    s.y += s.vy * dt;
    s.angle = Math.max(-0.45, Math.min(1.2, s.vy / 600));
    s.flap = Math.max(0, s.flap - dt * 4);

    if (s.freezeTimer > 0) s.freezeTimer = Math.max(0, s.freezeTimer - dt);
    if (s.invincibleTimer > 0) s.invincibleTimer = Math.max(0, s.invincibleTimer - dt);

    // ceiling
    if (s.y - GAME.PLAYER_R < 0) {
      s.y = GAME.PLAYER_R;
      s.vy = 0;
    }
  }

  if (s.status === "over") {
    s.vy = Math.min(GAME.MAX_VY, s.vy + GAME.GRAVITY * dt);
    s.y += s.vy * dt;
    s.angle = Math.min(s.angle + dt * 3, Math.PI / 2);
    if (s.y + GAME.PLAYER_R > s.playableHeight) {
      s.y = s.playableHeight - GAME.PLAYER_R;
      s.vy = 0;
    }
  }

  return entities;
}

export function inputSystem(entities: Entities, args: SystemArgs): Entities {
  const s = entities.world.state;
  const tapped = (args.touches || []).some((t) => t.type === "start" || t.type === "press");
  // Engine events from React state (e.g., keyboard or programmatic flap).
  const flapEvent = (args.events || []).some((e) => e.type === "flap");
  if (!tapped && !flapEvent) return entities;

  if (s.status === "ready") {
    s.status = "playing";
    s.vy = GAME.FLAP_VY;
    s.flap = 1;
    args.dispatch({ type: "started" });
    args.dispatch({ type: "flap-sound" });
    return entities;
  }
  if (s.status === "playing") {
    s.vy = GAME.FLAP_VY;
    s.flap = 1;
    args.dispatch({ type: "flap-sound" });
  }
  return entities;
}

export function spawnSystem(entities: Entities, args: SystemArgs): Entities {
  const dt = args.time.delta / 1000;
  const s = entities.world.state;
  if (s.status !== "playing") return entities;
  if (s.freezeTimer > 0) return entities;

  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    const minY = 70;
    const maxY = s.playableHeight - GAME.PIPE_GAP - 60;
    const gapY = minY + Math.random() * (maxY - minY);
    s.pipes.push({
      id: nextPipeId(),
      x: s.width + 20,
      gapY,
      passed: false,
    });
    s.spawnTimer = GAME.SPAWN_INTERVAL;
  }

  // move pipes
  for (let i = s.pipes.length - 1; i >= 0; i--) {
    const p = s.pipes[i];
    p.x -= GAME.PIPE_SPEED * dt;
    if (p.x + GAME.PIPE_WIDTH < -20) {
      s.pipes.splice(i, 1);
    }
  }
  return entities;
}

function circleVsRect(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

export function scoreSystem(entities: Entities, args: SystemArgs): Entities {
  const s = entities.world.state;
  if (s.status !== "playing") return entities;
  for (const p of s.pipes) {
    if (!p.passed && p.x + GAME.PIPE_WIDTH < GAME.PLAYER_X - 2) {
      p.passed = true;
      s.score += 1;
      args.dispatch({ type: "score", payload: s.score });
    }
  }
  return entities;
}

export function collisionSystem(entities: Entities, args: SystemArgs): Entities {
  const s = entities.world.state;
  if (s.status !== "playing") return entities;
  if (s.invincibleTimer > 0) return entities;

  // Ground
  if (s.y + GAME.PLAYER_R >= s.playableHeight) {
    s.status = "over";
    s.y = s.playableHeight - GAME.PLAYER_R;
    args.dispatch({ type: "game-over", payload: s.score });
    return entities;
  }

  // Pipes
  const cx = GAME.PLAYER_X;
  const cy = s.y;
  const cr = GAME.PLAYER_R * 0.78;
  for (const p of s.pipes) {
    const topY = 0;
    const topH = p.gapY;
    const botY = p.gapY + GAME.PIPE_GAP;
    const botH = s.playableHeight - botY;
    if (
      circleVsRect(cx, cy, cr, p.x, topY, GAME.PIPE_WIDTH, topH) ||
      circleVsRect(cx, cy, cr, p.x, botY, GAME.PIPE_WIDTH, botH)
    ) {
      s.status = "over";
      args.dispatch({ type: "game-over", payload: s.score });
      return entities;
    }
  }
  return entities;
}

/** Apply a revive: restore status, give brief freeze + invincibility, slow the fall. */
export function reviveWorld(entities: Entities): void {
  const s = entities.world.state;
  s.status = "playing";
  s.vy = GAME.FLAP_VY * 0.7;
  s.flap = 1;
  s.freezeTimer = GAME.REVIVE_FREEZE_S;
  s.invincibleTimer = GAME.REVIVE_INVINCIBLE_S;
  s.reviveUsed = true;
  // nudge player away from any pipe that's currently overlapping by clearing
  // any pipe that is sitting right on top of the player.
  s.pipes = s.pipes.filter((p) => p.x + GAME.PIPE_WIDTH < GAME.PLAYER_X - 30 || p.x > GAME.PLAYER_X + 60);
}

export function resetWorld(entities: Entities): void {
  const s = entities.world.state;
  s.status = "ready";
  s.vy = 0;
  s.y = s.playableHeight * 0.4;
  s.angle = 0;
  s.flap = 0;
  s.pipes = [];
  s.score = 0;
  s.spawnTimer = 0.6;
  s.freezeTimer = 0;
  s.invincibleTimer = 0;
  s.reviveUsed = false;
}
