# Flappy Miku — EAS / Play Store build setup

This guide walks you through producing a signed Android build of Flappy Miku.
AdMob (banner + interstitial + rewarded) is wired in but **only renders inside
a real EAS build** — Expo Go and the in-browser preview intentionally no-op
the ad calls, so don't worry if you don't see ads while developing.

---

## 1. Prerequisites
- An Expo account: https://expo.dev/signup
- Node 20+ and `yarn` installed locally
- A Google AdMob account with the app already registered (yours is — the IDs are wired in `app.json` and in `src/ads/googleMobileAds.ts`)
- A Google Play Console account if you want to publish

## 2. Install the EAS CLI
```bash
npm install -g eas-cli
eas login
```

## 3. Initialize EAS in this project (one-time)
From the project root (`/app/frontend`):
```bash
cd /app/frontend
eas init               # links the project to your Expo account
eas build:configure    # generates eas.json if missing
```
If `eas init` prompts you for a project name/slug, accept the defaults from `app.json` (`flappy-miku`).

## 4. Suggested `eas.json` build profiles
```jsonc
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleRelease" },
      "channel": "preview"
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```
EAS CLI's `eas build:configure` writes most of this for you; copy the snippets above into the generated file if anything is missing.

## 5. Run a build
- **APK for sideloading / smoke-testing on a device**
  ```bash
  eas build --platform android --profile preview
  ```
  Install the downloaded `.apk` on a device, open the app, and verify:
  1. Banner ad appears at the bottom of every screen (test ads in dev / real ads in release).
  2. Game over after 3 deaths fires an interstitial.
  3. "Revive!" button on game over loads + shows a rewarded ad and brings Miku back.

- **AAB for the Play Store**
  ```bash
  eas build --platform android --profile production
  ```

## 6. Submit to the Play Store
After your first successful production build:
```bash
eas submit --platform android --latest
```
EAS will walk you through uploading service-account credentials the first time.

## 7. Things you'll be asked for in the Play Console listing
- App name: **Flappy Miku**
- Short description: *Tap to flap. Dodge the leeks. Unlock the whole Vocaloid crew.*
- Privacy policy URL: **https://aureleonsoul.github.io/privacy-policy/** (already saved in `app.json` under `expo.extra.privacyPolicyUrl`)
- App category: Casual / Arcade
- Content rating: Everyone
- Target audience: 13+ (no personalised ads to children — already configured by leaving `requestNonPersonalizedAdsOnly` flexible)

## 8. AdMob policy reminders
- Never tap your own production ads more than once for QA — Google will flag the account. Use a real device installed via EAS preview build to sanity-check ad slots.
- Real ads only appear in **release builds**. In Expo Go / web preview the entire `react-native-google-mobile-ads` import is replaced by a no-op stub (`src/ads/googleMobileAds.web.ts`).
- The plugin config in `app.json` automatically injects the AdMob App ID into `AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`) during `expo prebuild` — you do not need to edit any native files.

## 9. Where the ad IDs live
| Asset | Where |
|---|---|
| App ID | `app.json` → `plugins → react-native-google-mobile-ads → androidAppId` |
| Banner / Interstitial / Rewarded unit IDs | `src/ads/googleMobileAds.ts` (constants at the top) |
| `__DEV__` test IDs | `TestIds.*` from `react-native-google-mobile-ads` (auto-used in development) |

When you eventually add the **iOS** AdMob app, update `iosAppId` in the same `app.json` plugin block (currently placeholders to the Android value).
