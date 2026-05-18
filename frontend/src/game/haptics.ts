/**
 * Procedural haptic helpers. Wraps expo-haptics so the rest of the app can
 * call `lightTap()` / `mediumTap()` / `heavyTap()` without worrying about
 * unsupported platforms (web preview → silent no-op).
 */
import { Platform } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let haptics: any = null;
if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    haptics = require("expo-haptics");
  } catch (e) {
    console.warn("[haptics] expo-haptics not available:", e);
    haptics = null;
  }
}

export const lightTap = (): void => {
  if (!haptics) return;
  try {
    haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* ignore */
  }
};

export const mediumTap = (): void => {
  if (!haptics) return;
  try {
    haptics.impactAsync(haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* ignore */
  }
};

export const heavyTap = (): void => {
  if (!haptics) return;
  try {
    haptics.impactAsync(haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    /* ignore */
  }
};
