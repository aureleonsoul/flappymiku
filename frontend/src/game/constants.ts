/**
 * Physics + layout constants + score-driven difficulty staging.
 *
 * Physics base values are specified per frame at 60 fps; we convert them to
 * the engine's seconds-based integration once at module load so the rest of
 * the game stays unit-consistent.
 */

const FPS = 60;
/** Frame-domain spec values (per the design doc). */
const GRAVITY_PF = 0.38;        // px / frame²
const FLAP_VY_PF = -7.2;        // px / frame
const MAX_FALL_PF = 8;          // px / frame

export const GAME = {
  // Player
  PLAYER_X: 110,
  PLAYER_R: 22,

  // Physics — converted from per-frame to per-second.
  GRAVITY: GRAVITY_PF * FPS * FPS,   // 1368 px/s²
  FLAP_VY: FLAP_VY_PF * FPS,         // -432 px/s
  MAX_VY: MAX_FALL_PF * FPS,         // 480 px/s

  // Pipes
  PIPE_WIDTH: 64,

  // Layout
  GROUND_H: 90,

  // Revive
  REVIVE_FREEZE_S: 1.0,
  REVIVE_INVINCIBLE_S: 1.5,

  // Stage transitions
  STAGE_FADE_S: 1.5,
  STAGE_FLASH_S: 1.0,

  /**
   * Floor on the gap size. Computed as (player diameter) + 55 px per spec,
   * which dominates the "95 px hard floor" mentioned in the design doc.
   */
  MIN_PIPE_GAP: 22 * 2 + 55, // = 99 px
} as const;

export type GameStatus = "ready" | "playing" | "over";

export interface StageParams {
  stage: number;
  /** absolute pipe speed in px/s */
  speed: number;
  /** vertical gap size in px */
  gap: number;
  /** challenge margin 0..1 applied to the reachability window */
  margin: number;
}

/** Resolve the stage parameters for the current score. */
export function stageForScore(score: number): StageParams {
  if (score < 10)  return clampParams({ stage: 1, speed: 140, gap: 175, margin: 0.92 });
  if (score < 25)  return clampParams({ stage: 2, speed: 162, gap: 165, margin: 0.85 });
  if (score < 40)  return clampParams({ stage: 3, speed: 188, gap: 148, margin: 0.75 });
  if (score < 60)  return clampParams({ stage: 4, speed: 230, gap: 120, margin: 0.62 });

  // Stage 5+: procedural ramp.
  const stepsPast60 = Math.floor((score - 60) / 10);
  const speed = Math.min(420, 265 * Math.pow(1.05, stepsPast60));
  const gap = 105 - stepsPast60 * 2;
  return clampParams({ stage: 5, speed, gap, margin: 0.50 });
}

function clampParams(p: StageParams): StageParams {
  return { ...p, gap: Math.max(GAME.MIN_PIPE_GAP, p.gap) };
}

export const STAGE_NAMES: Record<number, string> = {
  1: "FESTIVAL",
  2: "SUNSET",
  3: "CONCERT HALL",
  4: "CYBER NIGHT",
  5: "OUTER SPACE",
};

/**
 * Reachability window — how far above + below the player's current Y the
 * gap center is allowed to sit, given the current pipe speed and the stage's
 * challenge margin. Guarantees the gap is theoretically reachable.
 */
export function reachableDelta(speed: number, margin: number): number {
  const travelTime = GAME.PIPE_WIDTH / speed; // seconds
  const maxRise = Math.abs(GAME.FLAP_VY) * travelTime;
  const maxFall = 0.5 * GAME.GRAVITY * travelTime * travelTime;
  return (maxRise + maxFall) * margin;
}

/**
 * Horizontal spacing between consecutive pipe spawns, independent of speed.
 * Target ~3 pipes visible at once at 1.8× screen-width total span.
 */
export function spawnIntervalSeconds(speed: number, screenWidth: number): number {
  const targetSpacing = (1.8 * screenWidth) / 3;
  return targetSpacing / speed;
}
