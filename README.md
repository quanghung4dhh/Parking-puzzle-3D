# Parking Puzzle 3D

A lightweight TypeScript + Vite + Three.js browser game prepared for CrazyGames submission. Players clear a compact 3D parking lot by tapping cars that can drive straight out through their lane exit.

## Run Locally

```bash
npm install
npm run dev
```

The dev server prints a local URL. The game is also safe to run without the CrazyGames SDK; SDK calls fall back to console logging and localStorage.

## Build

```bash
npm run build
```

The production output is written to `dist/` with relative asset paths from `vite.config.ts`.

Current verified build:

- HTML: 0.60 kB
- CSS: 4.90 kB minified, 1.61 kB gzip
- JS: 521.10 kB minified, 131.59 kB gzip

## Gameplay

- 50 generated, solvable levels.
- Level 1 starts immediately with a pulsing first-car hint.
- Desktop and mobile pointer/touch controls.
- Deterministic grid path checks.
- One moving car at a time.
- Smooth delta-time based movement and bump feedback.
- Coins, hints, cosmetic skins, settings, and language persistence.

## CrazyGames SDK Notes

The SDK wrapper lives in `src/crazygames/CrazyGamesService.ts` and exposes:

- `initCrazyGamesSdk()`
- `gameplayStart()`
- `gameplayStop()`
- `requestMidgameAd(reason)`
- `requestRewardedAd(rewardType)`
- `saveProgress(data)`
- `loadProgress()`
- `getLocale()`

If `window.CrazyGames.SDK` is missing or incomplete, the game continues with localStorage saves, hidden rewarded buttons, and development console logs.

Ad behavior:

- Midgame ads are requested only after level completion.
- No midgame ad is requested before Level 3 completion or before 2 minutes of active play.
- Rewarded ads are user-initiated only from level complete or shop screens.
- Gameplay/input is paused while ads are requested or shown.
- Audio is muted only after `adStarted` and restored after `adFinished` or `adError`.
- Ads are never required to solve or progress.

## Responsiveness Testing

Test these iframe/window sizes:

- 907x510
- 1216x684
- 1077x606
- 821x462
- 1366x768
- 1920x1080
- 1280x720
- 800x450 mobile
- 1080x607 tablet

Suggested browser plan:

- Desktop Chrome: controls, save/load, build output.
- Mobile Chrome: touch input, audio unlock, layout.
- Mobile Safari: touch input, Web Audio resume, visibility changes.
- SDK missing: localStorage fallback, hidden rewarded buttons.
- Ads unavailable: no freeze, no required reward path.
- Save/load: current level, coins, hints, skins, settings.
- Level solvability: `validateAllLevels()` in `src/data/levels.ts` validates generated hint order and greedy fallback logic.

## Compliance Checklist

- HTML5/WebGL game: yes.
- Tech stack: TypeScript, Vite, Three.js.
- Initial download target under 50 MB: yes, current JS gzip is about 132 kB.
- Total bundle target under 250 MB: yes.
- File count target under 1500: yes.
- Relative asset paths: yes, `base: "./"`.
- No external ad networks: yes.
- No external portal branding: yes.
- No app store links: yes.
- No custom fullscreen button: yes.
- English fallback localization: yes.
- Vietnamese localization: included.
- CrazyGames locale usage: yes, falls back to browser locale.
- Save progress: CrazyGames Data adapter plus localStorage fallback.
- Mobile support: pointer/touch controls and responsive HUD.
- Ages 13+ suitability: no gore, gambling, adult, political, hateful, or copyrighted content.

## Known Limitations

- Levels are generated from deterministic recipes, not hand-authored puzzles. The generator validates solvability and can be expanded to 200+ levels by adding recipes.
- Cosmetic skins recolor future level loads; they do not repaint already loaded cars until the next level or restart.
- CrazyGames SDK behavior can only be fully tested inside the CrazyGames environment or with a compatible SDK mock.
