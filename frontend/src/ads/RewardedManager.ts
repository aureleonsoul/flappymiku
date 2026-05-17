/**
 * Rewarded manager — singleton.
 * Exposes `showForRevive(onReward, onFallback)` matching the revive-flow spec:
 * - If the ad is ready, show it; on EARNED_REWARD invoke `onReward`.
 * - If the user dismisses without earning a reward, invoke `onFallback`.
 * - If the ad isn't loaded yet, immediately invoke `onFallback`.
 * After every dismiss we kick off a fresh load so the next revive is ready.
 */
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  adUnit,
  HAS_ADS,
} from "./googleMobileAds";

class _RewardedManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ad: any = null;
  private isLoaded = false;
  private earnedThisShow = false;
  private pendingReward: (() => void) | null = null;
  private pendingFallback: (() => void) | null = null;

  constructor() {
    if (!HAS_ADS || !RewardedAd) return;
    try {
      this.ad = RewardedAd.createForAdRequest(adUnit("rewarded"), {
        requestNonPersonalizedAdsOnly: false,
      });
      this.ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isLoaded = true;
      });
      this.ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        this.earnedThisShow = true;
        const cb = this.pendingReward;
        this.pendingReward = null;
        this.pendingFallback = null;
        if (cb) {
          try {
            cb();
          } catch (e) {
            console.warn("[ads] reward callback threw:", e);
          }
        }
      });
      this.ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.isLoaded = false;
        // If the user closed without the reward event, fire the fallback.
        if (!this.earnedThisShow && this.pendingFallback) {
          const fb = this.pendingFallback;
          this.pendingFallback = null;
          this.pendingReward = null;
          try {
            fb();
          } catch (e) {
            console.warn("[ads] fallback callback threw:", e);
          }
        }
        this.earnedThisShow = false;
        try {
          this.ad.load();
        } catch (e) {
          console.warn("[ads] rewarded reload failed:", e);
        }
      });
      this.ad.addAdEventListener(AdEventType.ERROR, (err: unknown) => {
        console.warn("[ads] rewarded error:", err);
        this.isLoaded = false;
      });
      this.ad.load();
    } catch (e) {
      console.warn("[ads] rewarded setup failed:", e);
      this.ad = null;
    }
  }

  isReady(): boolean {
    return !!this.ad && this.isLoaded;
  }

  showForRevive(onReward: () => void, onFallback: () => void): void {
    if (!this.ad || !this.isLoaded) {
      // Ad not ready — invoke fallback so caller can display a toast.
      onFallback();
      // Trigger a fresh load attempt in case it failed silently earlier.
      try {
        this.ad?.load();
      } catch {
        /* no-op */
      }
      return;
    }
    this.earnedThisShow = false;
    this.pendingReward = onReward;
    this.pendingFallback = onFallback;
    try {
      this.ad.show();
    } catch (e) {
      console.warn("[ads] rewarded show failed:", e);
      this.pendingReward = null;
      this.pendingFallback = null;
      onFallback();
    }
  }
}

export const RewardedManager = new _RewardedManager();
