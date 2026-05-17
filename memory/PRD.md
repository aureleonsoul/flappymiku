# Flappy Miku — PRD

A native React Native (Expo SDK 54) Flappy-Bird clone starring Hatsune Miku and friends, built for the Google Play Store. AdMob is wired in with real Android ad unit IDs and gated behind a safe wrapper so the same JS bundle still runs in Expo Go and the in-browser preview (ads no-op there).

## Build target
- Platform: Android (Play Store)
- Package: `com.aureleonsoul.flappymiku`
- Version: 1.0.0 (versionCode 1)
- Build command: `eas build --platform android`
- min/compile/target SDK: 21 / 34 / 34 (via `expo-build-properties`)
- Privacy policy: https://aureleonsoul.github.io/privacy-policy/

## Tech stack
- Expo Router (file-based navigation)
- `react-native-game-engine` for the 60 fps update loop
- `react-native-svg` for character + leek sprites
- `expo-av` for short flap / score / hit sound effects
- `@react-native-async-storage/async-storage` for best score, selected character, unlocked roster, session counts, and rate-prompt state
- `react-native-google-mobile-ads` for AdMob (banner, interstitial, rewarded)

## File layout
```
app/
  _layout.tsx               # Stack + SafeArea + AdMobProvider
  index.tsx                 # Main menu (banner, play, character select, best, rate prompt)
  game.tsx                  # Gameplay + revive flow + game-over panel
  characters.tsx            # Unlock grid
src/
  ads/
    googleMobileAds.ts      # Native AdMob bindings (Android / iOS)
    googleMobileAds.web.ts  # Stub for Expo Go / Web (no native module)
    AdMobProvider.tsx       # Initializes MobileAds on app launch
    BannerAdView.tsx        # Anchored adaptive banner
    InterstitialManager.ts  # Singleton: preload + show + cooldown
    RewardedManager.ts      # Singleton: show + reward callback + fallback
    Toast.tsx               # Lightweight in-app toast
  game/
    constants.ts            # Physics constants
    engine.ts               # Entities + systems (physics, input, spawn, score, collision, revive)
    WorldRenderer.tsx       # Renders sky/lights/leeks/ground/player/score from state
    sound.ts                # expo-av sound pool
    sprites/
      Vocaloid.tsx          # Single SVG sprite parameterised per character
      Leek.tsx              # Negi obstacle SVG
  storage/
    keys.ts                 # AsyncStorage keys
    profile.ts              # load/save best, selected, unlocked, sessions, rate prompt
assets/sounds/              # flap_c/d/e/g.wav, score.wav, hit.wav (procedurally generated)
```

## AdMob wiring (real IDs)
| Placement | Unit ID | Where |
|---|---|---|
| App ID | `ca-app-pub-9157304901776255~7895265487` | `app.json` plugin config (injected into AndroidManifest by the config plugin) |
| Banner | `ca-app-pub-9157304901776255/7101058560` | `BannerAdView` — used on **Main Menu**, **Game**, **Game Over**, **Character Select** |
| Interstitial | `ca-app-pub-9157304901776255/6829595820` | Shown every 3rd game-over via `InterstitialManager.showIfReady()` |
| Rewarded | `ca-app-pub-9157304901776255/8222568545` | "Revive!" button on game-over; on `EARNED_REWARD` we revive player, freeze pipes 1 s, invincibility 1.5 s; one revive per run; failure → toast "Ad not available, try again later" |

In `__DEV__` the same code uses Google's test IDs from `TestIds.*` to avoid invalid traffic. Release builds use the real IDs above.

## Gameplay
- Gravity 1500 px/s², flap impulse −430 px/s, max fall 600 px/s.
- Leek pipes 64 px wide, 175 px gap, 160 px/s scroll, spawned every 1.55 s.
- Score increments when pipe.x + width passes player.x. Best stored to AsyncStorage and recomputed against unlock thresholds on every save.
- Tap anywhere (mobile) or Space / ArrowUp (keyboard) to flap.

## Characters (unlock thresholds saved to AsyncStorage)
| ID | Name | Unlock at best score |
|---|---|---|
| `miku` | Hatsune Miku | 0 (default) |
| `rin` | Kagamine Rin | 10 |
| `len` | Kagamine Len | 10 |
| `luka` | Megurine Luka | 25 |
| `kaito` | KAITO | 40 |
| `meiko` | MEIKO | 40 |

Locked characters render as a dark silhouette with "Reach score N". All sprites are inline SVG — no PNG assets.

## Session / Rate prompt
- A counter is bumped exactly once per app launch (`bumpSessionCount`).
- On the 5th session, the main menu shows the "Enjoying the game? Rate us!" modal one time. Both buttons ("No thanks" / "Rate us!") set `ratePromptHandled = "1"` so the prompt never re-appears. "Rate us!" opens `https://play.google.com/store/apps/details?id=com.aureleonsoul.flappymiku`.

## Sound
- 4 short flap tones (C-D-E-G pentatonic with upward glide) rotate per flap.
- Score: 2-note arpeggio. Hit: descending saw. All generated procedurally and bundled as tiny WAV files under `assets/sounds/`.

## Cross-platform safety
- `react-native-google-mobile-ads` is **not** present in Expo Go or web. Metro is told via `googleMobileAds.web.ts` to use a no-op module on web; the native file uses a guarded `require` so even on Expo Go (native module missing) the banner/interstitial/rewarded calls just return without crashing. Same JS works everywhere; ads only appear in the EAS-built APK/AAB.

## What's intentionally out of scope for this iteration
- App icon / adaptive-icon redesign (still using the Expo default art).
- iOS-specific AdMob app ID (reusing the Android value as a placeholder — replace before iOS submission).
- Server-side reward verification.
- Running `eas build` (requires the developer's Expo account login). See `/app/EAS_BUILD_SETUP.md`.

## Smart business enhancement
Best-score persistence drives the character unlock curve at 10/25/40, giving players concrete progression goals beyond just the high score. The 5-session rate prompt and the rewarded "Revive!" flow lift both store rating and ad ARPDAU without nagging players.
