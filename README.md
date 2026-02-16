# Nexus Ascension Refactor Overview

## Architecture
- `App.tsx`: root navigation + safe-area + game-state wiring.
- `src/app/useGameState.ts`: unified persisted game state, auto-income, toasts, gating, upgrade purchases.

## Worlds
- `src/worlds/fantasy/`
  - `FantasyScreen.tsx`: fantasy gameplay screen, HUD wiring, loading overlay.
  - `FantasyWorld3D/`: split modules (`rendering`, `controls`, `enemyLogic`, `collisions`, `helpers`, `types`).
  - `fantasyAssets.ts`, `fantasyLogic.ts`, `fantasyUpgrades.ts`.
- `src/worlds/skybase/`
  - `SkybaseScreen.tsx`: skybase gameplay screen, HUD wiring, loading overlay.
  - `SkybaseWorld3D/`: split modules (`rendering`, `controls`, `enemyLogic`, `collisions`, `helpers`, `types`).
  - `skybaseAssets.ts`, `skybaseLogic.ts`, `skybaseUpgrades.ts`.
- `src/worlds/hub/`
  - `HubScreen.tsx`: world gateway and tier progression controls.
  - `hubLogic.ts`.

## UI
- `src/ui/hud/`
  - `GameHUD.tsx`: reusable safe-area aware HUD with top tabs, stat pills, joystick, shoot action, and upgrade modal.
  - `WorldTabs.tsx`, `HudPills.tsx`, `Toast.tsx`, `hudStyles.ts`.
- `src/ui/loading/`
  - `WorldLoadingScreen.tsx`: themed loading screen.
  - `loader.ts`: readiness progress helper.
  - `loadingThemes.ts`: per-world theme definitions.

## Unified Upgrade System
- `src/systems/upgrades/`
  - `upgradeTypes.ts`: data contracts.
  - `upgradeData.ts`: data-driven fantasy/skybase/meta upgrades.
  - `upgradeEngine.ts`: costs and derived cross-world effects.
  - `gating.ts`: progression/upgrade gate enforcement.
  - `persistence.ts`: AsyncStorage persistence.

## Notes
- Existing root `FantasyWorld3D.tsx` and `SkybaseWorld3D.tsx` now forward-export refactored modules.
- `/backups` is intentionally untouched.
