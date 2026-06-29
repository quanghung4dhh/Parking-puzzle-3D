# Parking Puzzle 3D

A lightweight HTML5/WebGL parking puzzle made with TypeScript, Vite, and Three.js for CrazyGames submission. Players clear a compact 3D parking lot by tapping cars that can drive straight out through their lane exit.

## Run Locally

```bash
npm install
npm run dev
```

The dev server prints a local URL. The game is safe to run without the CrazyGames SDK; SDK calls fall back to local behavior and development logs.

## Build And Preview

```bash
npm run build
npm run preview
```

The production output is written to `dist/` with relative asset paths from `vite.config.ts`.

Current verified build:

- HTML: 0.63 kB
- CSS: 4.90 kB minified, 1.61 kB gzip
- JS: 526.88 kB minified, 133.28 kB gzip

## Test And Validate

```bash
npm run test
npm run validate-levels
```

`npm run test` runs Vitest coverage for level validation, Grid path checks, level completion rewards, save/load normalization, CrazyGames SDK fallback, and ad-unavailable fallback.

`npm run validate-levels` runs `scripts/validate-levels.ts`. It validates all generated levels, prints difficulty and solution length, and exits with a non-zero code if any level is invalid or unsolvable.

## Gameplay Features

- 50 deterministic generated levels.
- Difficulty bands: Levels 1-5 tutorial, 6-15 easy, 16-30 medium, 31-45 hard, 46-50 expert.
- Level 1 starts with a pulsing first-car hint.
- Desktop and mobile pointer/touch controls.
- Rapid taps can send multiple clear-path cars out without waiting for each animation to finish.
- Deterministic grid path checks with overlapping exit animations.
- Coins, hints, cosmetic skins, settings, and language persistence.
- English and Vietnamese localization.
- Dev-only testing panel in Vite development mode with level navigation, validation buttons, FPS, solution length, solvability, and difficulty score.

## Important Files

- Levels and generation: `src/data/levels.ts`
- Level solving, validation, and difficulty: `src/game/LevelValidator.ts`
- Level validation CLI: `scripts/validate-levels.ts`
- Gameplay loop and state: `src/game/Game.ts`
- Grid exit/path logic: `src/game/Grid.ts`
- Level rewards: `src/game/LevelRewards.ts`
- Save/load normalization: `src/game/SaveManager.ts`
- UI and dev panel: `src/ui/UIManager.ts`, `src/ui/DevPanel.ts`
- CrazyGames SDK wrapper: `src/crazygames/CrazyGamesService.ts`
- Ad gating and pause handling: `src/monetization/AdManager.ts`

## Adding Levels Safely

Levels are generated from recipes in `src/data/levels.ts`. To expand or rebalance levels:

1. Add or adjust a recipe id, board size, car count, and seed.
2. Keep level ids sequential.
3. Run `npm run validate-levels`.
4. Run `npm run test`.
5. Run `npm run build`.

The validator checks grid bounds, duplicate or overlapping cars, valid directions, valid boundary exits, matching exits for every car, solvability, solution order, and difficulty metadata.

## CrazyGames SDK Notes

The SDK wrapper exposes:

- `initCrazyGamesSdk()`
- `gameplayStart()`
- `gameplayStop()`
- `requestMidgameAd(reason)`
- `requestRewardedAd(rewardType)`
- `saveProgress(data)`
- `loadProgress()`
- `getLocale()`

If `window.CrazyGames.SDK` is missing or incomplete, the game continues with localStorage saves, hidden rewarded buttons, and development logs.

Ad behavior:

- Midgame ads are requested only after level completion.
- No midgame ad is requested before Level 3 completion or before 2 minutes of active play.
- Rewarded ads are user-initiated only from optional rewards such as double coins or bonus shop coins.
- Gameplay/input is paused while ads are requested or shown.
- Audio is muted only after `adStarted` and restored after `adFinished` or `adError`.
- Ads are never required to solve or progress.
- No external ad networks are used.

## CrazyGames Preview Checklist

- Desktop Chrome: controls, save/load, build output.
- Mobile Chrome: touch input, audio unlock, layout.
- Mobile Safari: touch input, Web Audio resume, visibility changes.
- SDK missing: localStorage fallback and no crash.
- Ads unavailable: no freeze and no required reward path.
- Save/load: current level, coins, hints, skins, settings.
- Iframe/window sizes: 907x510, 1216x684, 1077x606, 821x462, 1366x768, 1920x1080, 1280x720, 800x450 mobile, 1080x607 tablet.

## Final Release Checklist

- Build pass: `npm run build`.
- Tests pass: `npm run test`.
- Levels valid and solvable: `npm run validate-levels` reports 50/50 levels.
- Production dev panel hidden: no `.dev-panel` or dev panel strings in `dist/`.
- CrazyGames SDK fallback works: local preview runs without `window.CrazyGames.SDK`.
- Ads are optional and natural-break only: midgame after level completion, rewarded only from optional user actions.
- Mobile/responsive checked: 907x510, 1216x684, 1077x606, 821x462, 1366x768, 1920x1080, 1280x720, 800x450, 1080x607.
- Production console checked: no app JavaScript errors in local production preview.

## Zip Packaging

Build first:

```bash
npm run build
```

Create the upload zip from the contents of `dist/`, not from the repository root:

```bash
cd dist
zip -r ../parking-puzzle-3d-crazygames.zip .
```

The zip root should contain `index.html` and the `assets/` folder directly.

## Compliance Checklist

- HTML5/WebGL game: yes.
- Tech stack: TypeScript, Vite, Three.js.
- Initial download target under 50 MB: yes, current JS gzip is about 133 kB.
- Total bundle target under 250 MB: yes.
- Relative asset paths: yes, `base: "./"`.
- No external ad networks: yes.
- No external portal branding: yes.
- No app store links: yes.
- No custom fullscreen button: yes.
- English fallback localization: yes.
- CrazyGames locale usage: yes, falls back to browser locale.
- Save progress: CrazyGames Data adapter plus localStorage fallback.
- Mobile support: pointer/touch controls and responsive HUD.
- Ages 13+ suitability: no gore, gambling, adult, political, hateful, or copyrighted content.

## Known Limitations

- Levels are generated from deterministic recipes, not hand-authored puzzles.
- Cosmetic skins recolor future level loads; they do not repaint already loaded cars until the next level or restart.
- CrazyGames SDK behavior can only be fully tested inside the CrazyGames environment or with a compatible SDK mock.
