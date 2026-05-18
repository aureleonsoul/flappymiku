/**
 * react-native-game-engine entities + systems for Flappy Miku.
 * Now with score-driven stages, pipe wobble, and stage-transition timers.
 */
import { GAME, stageForScore, type GameStatus } from "./constants";

export interface Pipe {
  id: string;
  x: number;
  gapY: number;      // baseline; wobble is applied on top via gapYOffset()
  passed: boolean;
  stage: number;     // stage at which the pipe was spawned (drives its art)
  wobblePhase: number;
}

export interface WorldState {
  width: number;
  height: number;
  playableHeight: number;
  status: GameStatus;
  vy: number;
  y: number;
  angle: number;
  flap: number;
  pipes: Pipe[];
  score: number;
  spawnTimer: number;
  freezeTimer: number;
  invincibleTimer: number;
  reviveUsed: boolean;
  groundOffset: number;
  cloudOffset: number;
  /** Current stage (recomputed each frame from `score`). */
  stage: number;
  /** Stage the rendering was previously showing — used for crossfade. */
  prevStage: number;
  /** Crossfade progress 0..1; 1 = fully on `stage`. */
  stageFade: number;
  /** Stage flash banner countdown in seconds (>0 while visible). */
  stageFlashTimer: number;
  /** Cumulative game time (s) for wobble + shimmer animations. */
  time: number;
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
        stage: 1,
        prevStage: 1,
        stageFade: 1,
        stageFlashTimer: 0,
        time: 0,
      },
    },
  };
}

let _pipeId = 0;
const nextPipeId = (): string => {
  _pipeId += 1;
  return `p${_pipeId}`;
};

/** Effective gap-Y for a pipe at the current world time (applies wobble). */
export function pipeGapYWithWobble(p: Pipe, time: number, amp: number): number {
  if (amp <= 0) return p.gapY;
  return p.gapY + Math.sin(time * 1.6 + p.wobblePhase) * amp;
}

interface SystemArgs {
  time: { delta: number };
  touches: { type: string }[];
  events?: { type: string }[];
  dispatch: (e: { type: string; payload?: unknown }) => void;
}

export function physicsSystem(entities: Entities, args: SystemArgs): Entities {
  const dt = args.time.delta / 1000;
  const s = entities.world.state;
  s.time += dt;
  s.cloudOffset = (s.cloudOffset + dt * 14) % 360;

  // Stage transitions: recompute current stage and start a crossfade when it changes.
  const params = stageForScore(s.score);
  if (params.stage !== s.stage) {
    s.prevStage = s.stage;
    s.stage = params.stage;
    s.stageFade = 0;
    s.stageFlashTimer = GAME.STAGE_FLASH_S;
    args.dispatch({ type: "stage-change", payload: s.stage });
  }
  if (s.stageFade < 1) {
    s.stageFade = Math.min(1, s.stageFade + dt / GAME.STAGE_FADE_S);
  }
  if (s.stageFlashTimer > 0) {
    s.stageFlashTimer = Math.max(0, s.stageFlashTimer - dt);
  }

  if (s.status === "ready") {
    s.y = s.playableHeight * 0.4 + Math.sin(Date.now() / 350) * 6;
    s.angle = Math.sin(Date.now() / 350) * 0.08;
    s.flap = Math.max(0, s.flap - dt * 4);
    return entities;
  }

  if (s.status === "playing") {
    s.groundOffset = (s.groundOffset + params.speedMul * GAME.PIPE_SPEED_BASE * dt) % 24;

    s.vy = Math.min(GAME.MAX_VY, s.vy + GAME.GRAVITY * dt);
    s.y += s.vy * dt;
    s.angle = Math.max(-0.45, Math.min(1.2, s.vy / 600));
    s.flap = Math.max(0, s.flap - dt * 4);

    if (s.freezeTimer > 0) s.freezeTimer = Math.max(0, s.freezeTimer - dt);
    if (s.invincibleTimer > 0) s.invincibleTimer = Math.max(0, s.invincibleTimer - dt);

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

  const params = stageForScore(s.score);

  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0) {
    const minY = 70;
    const maxY = s.playableHeight - params.gap - 60;
    const gapY = minY + Math.random() * (maxY - minY);
    s.pipes.push({
      id: nextPipeId(),
      x: s.width + 20,
      gapY,
      passed: false,
      stage: params.stage,
      wobblePhase: Math.random() * Math.PI * 2,
    });
    s.spawnTimer = params.spawnInterval;
  }

  const dx = params.speedMul * GAME.PIPE_SPEED_BASE * dt;
  for (let i = s.pipes.length - 1; i >= 0; i--) {
    const p = s.pipes[i];
    p.x -= dx;
    if (p.x + GAME.PIPE_WIDTH < -20) s.pipes.splice(i, 1);
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

  if (s.y + GAME.PLAYER_R >= s.playableHeight) {
    s.status = "over";
    s.y = s.playableHeight - GAME.PLAYER_R;
    args.dispatch({ type: "game-over", payload: s.score });
    return entities;
  }

  const params = stageForScore(s.score);
  const cx = GAME.PLAYER_X;
  const cy = s.y;
  const cr = GAME.PLAYER_R * 0.78;
  for (const p of s.pipes) {
    const effGapY = pipeGapYWithWobble(p, s.time, params.wobbleAmp);
    const topY = 0;
    const topH = effGapY;
    const botY = effGapY + params.gap;
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

export function reviveWorld(entities: Entities): void {
  const s = entities.world.state;
  s.status = "playing";
  s.vy = GAME.FLAP_VY * 0.7;
  s.flap = 1;
  s.freezeTimer = GAME.REVIVE_FREEZE_S;
  s.invincibleTimer = GAME.REVIVE_INVINCIBLE_S;
  s.reviveUsed = true;
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
  s.stage = 1;
  s.prevStage = 1;
  s.stageFade = 1;
  s.stageFlashTimer = 0;
  s.time = 0;
}
