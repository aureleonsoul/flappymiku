/** Physics + layout constants for the game. */
export const GAME = {
  // Player
  PLAYER_X: 110,
  PLAYER_R: 22,
  GRAVITY: 1500,
  FLAP_VY: -430,
  MAX_VY: 600,

  // Pipes
  PIPE_WIDTH: 64,
  PIPE_GAP: 175,
  PIPE_SPEED: 160, // px per second
  SPAWN_INTERVAL: 1.55,

  // Layout
  GROUND_H: 90,

  // Revive
  REVIVE_FREEZE_S: 1.0,
  REVIVE_INVINCIBLE_S: 1.5,
} as const;

export type GameStatus = "ready" | "playing" | "over";
