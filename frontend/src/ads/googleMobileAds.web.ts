/**
 * Web/Expo Go stub for googleMobileAds.
 *
 * react-native-google-mobile-ads has native-only requires that Metro can't
 * resolve when bundling for web. We provide a parallel no-op module that
 * Metro will pick up under the `.web.ts` extension, so the same import path
 * works on every platform without crashing the bundler.
 */
import React from "react";
import { View } from "react-native";

export const HAS_ADS = false;

export const mobileAds = () => ({
  initialize: async () => ({}),
  setRequestConfiguration: async () => ({}),
});

export const TestIds = {
  BANNER: "test-banner",
  INTERSTITIAL: "test-interstitial",
  REWARDED: "test-rewarded",
};

export function adUnit(_kind: "banner" | "interstitial" | "rewarded"): string {
  return "stub-unit";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BannerAd: React.ComponentType<any> | null = (() => null) as any;
export const BannerAdSize = {
  BANNER: "BANNER",
  ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER",
} as Record<string, string>;

export const InterstitialAd = null;
export const RewardedAd = null;
export const AdEventType = {
  LOADED: "loaded",
  ERROR: "error",
  CLOSED: "closed",
  OPENED: "opened",
};
export const RewardedAdEventType = {
  LOADED: "loaded",
  EARNED_REWARD: "earned_reward",
};

// keep View import alive for lint; unused
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _v = View;
