import type { WorldKey } from '../assets/assetManifest';

const readyWorlds = new Set<WorldKey>();

export function markWorldReady(world: WorldKey) {
  readyWorlds.add(world);
}

export function isWorldReady(world: WorldKey) {
  return readyWorlds.has(world);
}

export function resetWorldReady(world: WorldKey) {
  readyWorlds.delete(world);
}
