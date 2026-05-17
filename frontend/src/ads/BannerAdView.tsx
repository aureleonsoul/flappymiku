import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize, adUnit, HAS_ADS } from "./googleMobileAds";

/**
 * Reusable banner placement. Renders a 320x50 anchored adaptive banner pinned
 * to the bottom of whatever container hosts it. On platforms without the
 * native AdMob module (Expo Go, web preview) this collapses to `null` so the
 * surrounding layout stays unchanged.
 */
export const BannerAdView: React.FC<{ testID?: string }> = ({ testID }) => {
  if (!HAS_ADS || !BannerAd) {
    // Reserve the same vertical footprint on platforms without ads so layouts
    // don't shift between Expo Go and the production build.
    return <View testID={testID ?? "banner-placeholder"} style={styles.placeholder} />;
  }
  return (
    <View style={styles.wrap} testID={testID ?? "banner-ad"}>
      <BannerAd
        unitId={adUnit("banner")}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => {}}
        onAdFailedToLoad={(err: unknown) => {
          console.warn("[ads] banner failed:", err);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  placeholder: {
    width: "100%",
    height: 50,
    backgroundColor: "#000",
  },
});
