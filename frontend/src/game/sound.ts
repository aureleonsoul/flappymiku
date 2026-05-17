/**
 * Sound effects — uses expo-av. Fails gracefully if expo-av can't load (e.g.
 * web preview without WebAudio support), so the rest of the game keeps working.
 */
import { Audio } from "expo-av";

const FLAP_FILES = [
  require("../../assets/sounds/flap_c.wav"),
  require("../../assets/sounds/flap_d.wav"),
  require("../../assets/sounds/flap_e.wav"),
  require("../../assets/sounds/flap_g.wav"),
];
const SCORE_FILE = require("../../assets/sounds/score.wav");
const HIT_FILE = require("../../assets/sounds/hit.wav");

const pool: { flaps: (Audio.Sound | null)[]; score: Audio.Sound | null; hit: Audio.Sound | null } = {
  flaps: [null, null, null, null],
  score: null,
  hit: null,
};
let initialised = false;
let flapIdx = 0;

export async function initSounds(): Promise<void> {
  if (initialised) return;
  initialised = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });
    for (let i = 0; i < FLAP_FILES.length; i++) {
      try {
        const { sound } = await Audio.Sound.createAsync(FLAP_FILES[i], { volume: 0.45 });
        pool.flaps[i] = sound;
      } catch (e) {
        console.warn("[sfx] flap load failed:", e);
      }
    }
    try {
      const { sound } = await Audio.Sound.createAsync(SCORE_FILE, { volume: 0.4 });
      pool.score = sound;
    } catch (e) {
      console.warn("[sfx] score load failed:", e);
    }
    try {
      const { sound } = await Audio.Sound.createAsync(HIT_FILE, { volume: 0.55 });
      pool.hit = sound;
    } catch (e) {
      console.warn("[sfx] hit load failed:", e);
    }
  } catch (e) {
    console.warn("[sfx] audio mode failed:", e);
  }
}

async function playSound(s: Audio.Sound | null): Promise<void> {
  if (!s) return;
  try {
    await s.setPositionAsync(0);
    await s.playAsync();
  } catch {
    /* ignore; sound may not be loaded */
  }
}

export function playFlap(): void {
  const s = pool.flaps[flapIdx % pool.flaps.length];
  flapIdx++;
  void playSound(s);
}

export function playScore(): void {
  void playSound(pool.score);
}

export function playHit(): void {
  void playSound(pool.hit);
}

export function resetFlapSequence(): void {
  flapIdx = 0;
}
