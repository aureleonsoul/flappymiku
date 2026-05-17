# Miku Flap — Product Requirements Document

## Overview
A Flappy Bird-style mini-game starring Hatsune Miku as the "bird". Built as a single self-contained vanilla-JS + HTML5 Canvas game, embedded inside the Expo app via `WebView` on mobile and a native `<iframe srcdoc>` on web. No external assets, no third-party APIs.

## Tech Stack
- Frontend shell: Expo Router (`/app/index.tsx`) with `react-native-webview` (mobile) and an `<iframe srcdoc>` on web — both render the same standalone HTML game.
- Game: `/app/frontend/src/game/mikuFlapHtml.ts` exports a single HTML string containing inline CSS and a vanilla JS Canvas game.
- Persistence: `localStorage` inside the WebView/iframe for best score (`miku_flap_best`).
- Audio: Procedural WebAudio (no asset files) — alternating musical notes from a C-major pentatonic-ish scale on every flap, a 2-note arpeggio on scoring, and a swept saw on collision.

## Gameplay
- Tap on the canvas / press `Space` / `ArrowUp` → Miku flaps upward.
- Gravity pulls her down between flaps.
- Scrolling leek (negi) obstacles scroll in from the right with vertical gaps; collision with any leek or the ground ends the game.
- Score increments each time Miku passes a pair of leeks.
- Game-over screen shows score, best score, "NEW BEST!" callout when applicable, and a "TRY AGAIN" button (also: tap anywhere to retry).

## Visuals
- Pastel sky gradient (pink → lavender → teal-blue) refreshed each frame.
- Concert-stage aesthetic: animated sweeping teal + pink spotlights (screen blend), distant truss with pulsing lights and speaker stacks.
- Procedurally drawn chibi Miku sprite on canvas: teal twin-tails with hair ties, sailor-style white/teal top, red tie, sweet face with teal eyes, blush, animated wing/arm flap, body rotation tied to vertical velocity.
- Leek obstacles drawn with white bulb + green striped leaf body + jagged tips + root tufts at the gap edge.
- Scrolling ground with grass + dirt stripes, ambient cloud parallax, sparkle particles on flap, confetti shower on death, score pop sparkles when passing leeks.

## Controls
- Pointer / touch: tap canvas anywhere.
- Keyboard: `Space` or `ArrowUp`.
- All inputs share the same handler so they work identically on mobile and desktop.

## Test IDs
- `miku-flap-webview` (RN mobile container)
- `miku-flap-web-container`, `miku-flap-iframe` (web container)
- `game-canvas`, `hint` (inside the game HTML)

## Smart Business Enhancement
- Best-score persistence + "NEW BEST!" celebration creates a self-driven retention loop. Future hook: shareable score image (download canvas as PNG) to drive viral install attribution.
