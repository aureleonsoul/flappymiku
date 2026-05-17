import AsyncStorage from "@react-native-async-storage/async-storage";
import { KEYS } from "./keys";

export type CharacterId = "miku" | "rin" | "len" | "luka" | "kaito" | "meiko";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  color: string;
  accent: string;
  unlockScore: number;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "miku", name: "Hatsune Miku", color: "#39C5BB", accent: "#1f7e78", unlockScore: 0 },
  { id: "rin", name: "Kagamine Rin", color: "#FCE205", accent: "#a88f00", unlockScore: 10 },
  { id: "len", name: "Kagamine Len", color: "#FFD23F", accent: "#a8821a", unlockScore: 10 },
  { id: "luka", name: "Megurine Luka", color: "#E94196", accent: "#8c1f5c", unlockScore: 25 },
  { id: "kaito", name: "KAITO", color: "#4178BC", accent: "#1f3a6e", unlockScore: 40 },
  { id: "meiko", name: "MEIKO", color: "#C0272D", accent: "#6f1115", unlockScore: 40 },
];

export const getCharacter = (id: CharacterId): CharacterDef =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export interface PlayerProfile {
  best: number;
  selected: CharacterId;
  unlocked: CharacterId[];
  sessionCount: number;
  ratePromptHandled: boolean;
}

const DEFAULT: PlayerProfile = {
  best: 0,
  selected: "miku",
  unlocked: ["miku"],
  sessionCount: 0,
  ratePromptHandled: false,
};

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const [b, sel, unl, sess, rate] = await AsyncStorage.multiGet([
      KEYS.bestScore,
      KEYS.selectedChar,
      KEYS.unlocked,
      KEYS.sessionCount,
      KEYS.ratePromptHandled,
    ]);
    const best = b[1] ? parseInt(b[1], 10) || 0 : 0;
    const selected = (sel[1] as CharacterId) || "miku";
    let unlocked: CharacterId[] = ["miku"];
    if (unl[1]) {
      try {
        const arr = JSON.parse(unl[1]);
        if (Array.isArray(arr)) unlocked = arr as CharacterId[];
      } catch {
        /* ignore malformed JSON */
      }
    }
    // Always make sure unlocks reflect best score (in case of upgrade).
    const recomputed = CHARACTERS.filter((c) => best >= c.unlockScore).map((c) => c.id);
    const merged = Array.from(new Set<CharacterId>([...unlocked, ...recomputed]));
    const sessionCount = sess[1] ? parseInt(sess[1], 10) || 0 : 0;
    const ratePromptHandled = rate[1] === "1";
    return {
      best,
      selected: merged.includes(selected) ? selected : "miku",
      unlocked: merged,
      sessionCount,
      ratePromptHandled,
    };
  } catch (e) {
    console.warn("[storage] loadProfile failed:", e);
    return DEFAULT;
  }
}

export async function saveBest(best: number): Promise<CharacterId[]> {
  await AsyncStorage.setItem(KEYS.bestScore, String(best));
  const unlocked = CHARACTERS.filter((c) => best >= c.unlockScore).map((c) => c.id);
  await AsyncStorage.setItem(KEYS.unlocked, JSON.stringify(unlocked));
  return unlocked;
}

export async function saveSelected(id: CharacterId): Promise<void> {
  await AsyncStorage.setItem(KEYS.selectedChar, id);
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
