/** Physics + layout constants + score-driven difficulty staging. */
export const GAME = {
  // Player
  PLAYER_X: 110,
  PLAYER_R: 22,
  GRAVITY: 950,           // softer fall → longer apex hang time
  FLAP_VY: -540,          // stronger upward impulse
  MAX_VY: 480,

  // Pipes (base values — stages scale these)
  PIPE_WIDTH: 64,
  PIPE_GAP_BASE: 175,
  PIPE_SPEED_BASE: 160,   // px per second
  SPAWN_INTERVAL_BASE: 1.55,

  // Layout
  GROUND_H: 90,

  // Revive
  REVIVE_FREEZE_S: 1.0,
  REVIVE_INVINCIBLE_S: 1.5,

  // Stage transitions
  STAGE_FADE_S: 1.5,
  STAGE_FLASH_S: 1.0,

  // Hard floor on the gap so beyond-stage-5 never becomes literally impossible.
  MIN_PIPE_GAP: 90,
} as const;

export type GameStatus = "ready" | "playing" | "over";

export interface StageParams {
  stage: number;          // 1..N
  speedMul: number;       // multiplier on PIPE_SPEED_BASE
  gap: number;            // px
  spawnInterval: number;  // seconds
  wobbleAmp: number;      // px (0 = no wobble)
}

/**
 * Resolve the difficulty parameters for a given score.
 * Stage 1: 0-9, Stage 2: 10-24, Stage 3: 25-39, Stage 4: 40-59, Stage 5: 60+,
 * then procedural ramp every 10 score points past 60.
 */
export function stageForScore(score: number): StageParams {
  if (score < 10) {
    return { stage: 1, speedMul: 1.0, gap: 175, spawnInterval: 1.55, wobbleAmp: 0 };
  }
  if (score < 25) {
    return { stage: 2, speedMul: 1.15, gap: 165, spawnInterval: 1.55, wobbleAmp: 0 };
  }
  if (score < 40) {
    return { stage: 3, speedMul: 1.30, gap: 155, spawnInterval: 1.45, wobbleAmp: 0 };
  }
  if (score < 60) {
    return { stage: 4, speedMul: 1.50, gap: 145, spawnInterval: 1.35, wobbleAmp: 10 };
  }
  // Stage 5+ procedural ramp.
  const stepsPast60 = Math.floor((score - 60) / 10);
  const speedMul = 1.70 * Math.pow(1.05, stepsPast60);
  const gap = Math.max(GAME.MIN_PIPE_GAP, 135 - stepsPast60 * 2);
  const spawnInterval = Math.max(1.05, 1.30 - stepsPast60 * 0.02);
  const wobbleAmp = 20 + Math.min(20, stepsPast60 * 2);
  return { stage: 5, speedMul, gap, spawnInterval, wobbleAmp };
}

export const STAGE_NAMES: Record<number, string> = {
  1: "FESTIVAL",
  2: "SUNSET",
  3: "CONCERT HALL",
  4: "CYBER NIGHT",
  5: "OUTER SPACE",
};
