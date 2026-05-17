import React, { useEffect, useState, createContext, useContext } from "react";
import { Platform } from "react-native";
import { mobileAds, HAS_ADS } from "./googleMobileAds";

interface AdMobContextValue {
  ready: boolean;
  hasAds: boolean;
}

const AdMobContext = createContext<AdMobContextValue>({ ready: true, hasAds: false });

export const useAdMob = () => useContext(AdMobContext);

export const AdMobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(!HAS_ADS); // if no native module, we're "ready" immediately

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!HAS_ADS) return;
      try {
        await mobileAds().initialize();
        if (mounted) setReady(true);
      } catch (e) {
        console.warn("[ads] initialize failed:", e);
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AdMobContext.Provider value={{ ready, hasAds: HAS_ADS && Platform.OS !== "web" }}>
      {children}
    </AdMobContext.Provider>
  );
};
