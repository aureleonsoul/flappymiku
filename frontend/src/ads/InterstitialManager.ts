/**
 * Interstitial manager — singleton.
 * Preloads on construction, shows on demand, and reloads after close.
 */
import { InterstitialAd, AdEventType, adUnit, HAS_ADS } from "./googleMobileAds";

class _InterstitialManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ad: any = null;
  private isLoaded = false;
  private lastShownAt = 0;
  private readonly cooldownMs = 30_000;

  constructor() {
    if (!HAS_ADS || !InterstitialAd) return;
    try {
      this.ad = InterstitialAd.createForAdRequest(adUnit("interstitial"), {
        requestNonPersonalizedAdsOnly: false,
      });
      this.ad.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
      });
      this.ad.addAdEventListener(AdEventType.ERROR, (err: unknown) => {
        console.warn("[ads] interstitial error:", err);
        this.isLoaded = false;
      });
      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.isLoaded = false;
        this.lastShownAt = Date.now();
        try {
          this.ad.load();
        } catch (e) {
          console.warn("[ads] interstitial reload failed:", e);
        }
      });
      this.ad.load();
    } catch (e) {
      console.warn("[ads] interstitial setup failed:", e);
      this.ad = null;
    }
  }

  isReady(): boolean {
    return !!this.ad && this.isLoaded;
  }

  /** Returns true if the ad was actually presented. */
  showIfReady(): boolean {
    if (!this.ad || !this.isLoaded) return false;
    if (Date.now() - this.lastShownAt < this.cooldownMs) return false;
    try {
      this.ad.show();
      this.isLoaded = false;
      this.lastShownAt = Date.now();
      return true;
    } catch (e) {
      console.warn("[ads] interstitial show failed:", e);
      return false;
    }
  }
}

export const InterstitialManager = new _InterstitialManager();
