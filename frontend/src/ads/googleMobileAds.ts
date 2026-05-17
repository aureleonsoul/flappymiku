/**
 * Safe wrapper around `react-native-google-mobile-ads`.
 *
 * The native module is only available in custom Android/iOS builds produced by
 * `eas build` — it does NOT exist in Expo Go, on web, or in the in-browser
 * preview. We therefore load it via `require` behind a platform check + try /
 * catch so the same JS bundle runs everywhere. On unsupported platforms every
 * export becomes a no-op so the rest of the app code stays platform-agnostic.
 */
import React from "react";
import { Platform } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdsModule = any;

let mod: AnyAdsModule | null = null;

if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
    mod = require("react-native-google-mobile-ads");
  } catch (err) {
    // Running in Expo Go (module not in the prebuilt client) — fall back to no-op.
    console.warn("[ads] native module unavailable:", err);
    mod = null;
  }
}

export const HAS_ADS: boolean = !!mod;

// ----- mobileAds() singleton (initialize, request configuration) -----

export const mobileAds = () => {
  if (mod) return mod.default();
  return {
    initialize: async () => ({}),
    setRequestConfiguration: async () => ({}),
  };
};

// ----- Production ad unit IDs (Android primary; iOS reuses) -----

const PROD = {
  banner: "ca-app-pub-9157304901776255/7101058560",
  interstitial: "ca-app-pub-9157304901776255/6829595820",
  rewarded: "ca-app-pub-9157304901776255/8222568545",
};

export const TestIds = mod
  ? mod.TestIds
  : {
      BANNER: "test-banner",
      INTERSTITIAL: "test-interstitial",
      REWARDED: "test-rewarded",
    };

/**
 * Resolve an ad unit ID. In `__DEV__` we use Google's demo IDs from the
 * library's TestIds export to avoid invalid traffic on the real units; in
 * release builds we use the real IDs supplied by the publisher.
 */
export function adUnit(kind: "banner" | "interstitial" | "rewarded"): string {
  if (__DEV__) {
    if (kind === "banner") return TestIds.BANNER;
    if (kind === "interstitial") return TestIds.INTERSTITIAL;
    return TestIds.REWARDED;
  }
  return PROD[kind];
}

// ----- Banner -----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BannerAd: React.ComponentType<any> | null = mod ? mod.BannerAd : null;
export const BannerAdSize = mod
  ? mod.BannerAdSize
  : ({
      BANNER: "BANNER",
      ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER",
    } as Record<string, string>);

// ----- Interstitial / Rewarded primitives -----

export const InterstitialAd = mod ? mod.InterstitialAd : null;
export const RewardedAd = mod ? mod.RewardedAd : null;
export const AdEventType = mod
  ? mod.AdEventType
  : { LOADED: "loaded", ERROR: "error", CLOSED: "closed", OPENED: "opened" };
export const RewardedAdEventType = mod
  ? mod.RewardedAdEventType
  : { LOADED: "loaded", EARNED_REWARD: "earned_reward" };
