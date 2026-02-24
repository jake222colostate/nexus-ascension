import { useSyncExternalStore } from 'react';
import type { WorldKey } from '../assets/assetManifest';

type PhaseState = {
  playable: boolean;
  phase: string;
  progress: number;
  startedAt: number;
  playableAt?: number;
};

const states: Record<WorldKey, PhaseState> = {
  core: { playable: true, phase: 'idle', progress: 1, startedAt: Date.now() },
  fantasy: { playable: false, phase: 'boot', progress: 0, startedAt: Date.now() },
  skybase: { playable: false, phase: 'boot', progress: 0, startedAt: Date.now() },
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setWorldPhase(world: Exclude<WorldKey, 'core'>, phaseName: string, progress = 0) {
  const prev = states[world];
  states[world] = {
    ...prev,
    phase: phaseName,
    progress: Math.max(0, Math.min(1, progress)),
  };
  console.log(`[PHASE] ${world} phase=${phaseName} progress=${Math.round(states[world].progress * 100)}%`);
  emit();
}

export function markWorldPlayable(world: Exclude<WorldKey, 'core'>) {
  const prev = states[world];
  if (prev.playable) return;
  const now = Date.now();
  states[world] = { ...prev, playable: true, playableAt: now, progress: 1, phase: 'playable' };
  console.log(`[READY] ${world} playable in ${now - prev.startedAt}ms`);
  emit();
}

export function resetWorldReady(world: Exclude<WorldKey, 'core'>) {
  states[world] = { playable: false, phase: 'boot', progress: 0, startedAt: Date.now() };
  emit();
}

export function isWorldReady(world: Exclude<WorldKey, 'core'>) {
  return states[world].playable;
}

export function markWorldReady(world: Exclude<WorldKey, 'core'>) {
  markWorldPlayable(world);
}

export function useWorldReadiness(world: Exclude<WorldKey, 'core'>) {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => ({
      playable: states[world].playable,
      phase: states[world].phase,
      progress: states[world].progress,
    }),
  );
}
