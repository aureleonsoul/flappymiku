import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS } from "./keys";

export type CharacterId = "miku" | "rin" | "len" | "luka" | "kaito" | "meiko";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  color: string;
  accent: string;
  /** Coin cost to unlock; 0 means unlocked by default. */
  cost: number;
}

/** 1 coin for every 15 score points in a run. */
export const COINS_PER_SCORE_STEP = 15;
export function coinsFromScore(score: number): number {
  return Math.floor(Math.max(0, score) / COINS_PER_SCORE_STEP);
}

export const CHARACTERS: CharacterDef[] = [
  { id: "miku", name: "Hatsune Miku", color: "#39C5BB", accent: "#1f7e78", cost: 0 },
  { id: "rin", name: "Kagamine Rin", color: "#FCE205", accent: "#a88f00", cost: 1 },
  { id: "len", name: "Kagamine Len", color: "#FFD23F", accent: "#a8821a", cost: 1 },
  { id: "luka", name: "Megurine Luka", color: "#E94196", accent: "#8c1f5c", cost: 3 },
  { id: "kaito", name: "KAITO", color: "#4178BC", accent: "#1f3a6e", cost: 6 },
  { id: "meiko", name: "MEIKO", color: "#C0272D", accent: "#6f1115", cost: 6 },
];

export const getCharacter = (id: CharacterId): CharacterDef =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export interface PlayerProfile {
  best: number;
  coins: number;
  selected: CharacterId;
  unlocked: CharacterId[];
  sessionCount: number;
  ratePromptHandled: boolean;
}

const DEFAULT: PlayerProfile = {
  best: 0,
  coins: 0,
  selected: "miku",
  unlocked: ["miku"],
  sessionCount: 0,
  ratePromptHandled: false,
};

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const [b, c, sel, unl, sess, rate] = await AsyncStorage.multiGet([
      KEYS.bestScore,
      KEYS.coins,
      KEYS.selectedChar,
      KEYS.unlocked,
      KEYS.sessionCount,
      KEYS.ratePromptHandled,
    ]);
    const best = b[1] ? parseInt(b[1], 10) || 0 : 0;
    const coins = c[1] ? parseInt(c[1], 10) || 0 : 0;
    const selectedRaw = (sel[1] as CharacterId) || "miku";
    let unlocked: CharacterId[] = ["miku"];
    if (unl[1]) {
      try {
        const arr = JSON.parse(unl[1]);
        if (Array.isArray(arr)) unlocked = arr as CharacterId[];
      } catch {
        /* ignore malformed JSON */
      }
    }
    // Miku is always unlocked.
    if (!unlocked.includes("miku")) unlocked = ["miku", ...unlocked];
    const selected: CharacterId = unlocked.includes(selectedRaw) ? selectedRaw : "miku";
    const sessionCount = sess[1] ? parseInt(sess[1], 10) || 0 : 0;
    const ratePromptHandled = rate[1] === "1";
    return { best, coins, selected, unlocked, sessionCount, ratePromptHandled };
  } catch (e) {
    console.warn("[storage] loadProfile failed:", e);
    return DEFAULT;
  }
}

export async function saveBest(best: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.bestScore, String(best));
}

/**
 * Award coins earned from a single run and persist the new total.
 * Returns { earned, total }.
 */
export async function awardCoinsFromScore(score: number): Promise<{ earned: number; total: number }> {
  const earned = coinsFromScore(score);
  if (earned <= 0) {
    const raw = await AsyncStorage.getItem(KEYS.coins);
    return { earned: 0, total: raw ? parseInt(raw, 10) || 0 : 0 };
  }
  const raw = await AsyncStorage.getItem(KEYS.coins);
  const current = raw ? parseInt(raw, 10) || 0 : 0;
  const total = current + earned;
  await AsyncStorage.setItem(KEYS.coins, String(total));
  return { earned, total };
}

export async function saveSelected(id: CharacterId): Promise<void> {
  await AsyncStorage.setItem(KEYS.selectedChar, id);
}

/**
 * Spend coins to unlock a character. Returns the updated profile snapshot, or
 * `null` if the user doesn't have enough coins (no state change in that case).
 */
export async function attemptUnlock(id: CharacterId): Promise<PlayerProfile | null> {
  const profile = await loadProfile();
  if (profile.unlocked.includes(id)) return profile; // already unlocked
  const def = getCharacter(id);
  if (profile.coins < def.cost) return null;
  const newCoins = profile.coins - def.cost;
  const newUnlocked = [...profile.unlocked, id];
  await AsyncStorage.multiSet([
    [KEYS.coins, String(newCoins)],
    [KEYS.unlocked, JSON.stringify(newUnlocked)],
  ]);
  return { ...profile, coins: newCoins, unlocked: newUnlocked };
}

export async function bumpSessionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.sessionCount);
  const n = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
  await AsyncStorage.setItem(KEYS.sessionCount, String(n));
  return n;
}

export async function markRatePromptHandled(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ratePromptHandled, "1");
}
