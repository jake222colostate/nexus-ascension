import { useSyncExternalStore } from 'react';
import type { WorldKey } from '../assets/assetManifest';

type PlayableWorld = Exclude<WorldKey, 'core'>;

type WorldGate = 'entry-assets' | 'canvas-mounted' | 'scene-mounted' | 'first-frame' | 'controls-ready' | 'world-visible' | 'playable';

const REQUIRED_GATES: Record<PlayableWorld, WorldGate[]> = {
  fantasy: ['entry-assets', 'canvas-mounted', 'scene-mounted', 'first-frame', 'controls-ready', 'world-visible', 'playable'],
  skybase: ['entry-assets', 'canvas-mounted', 'scene-mounted', 'first-frame', 'controls-ready', 'world-visible', 'playable'],
};

type PhaseState = {
  playable: boolean;
  phase: string;
  progress: number;
  displayProgress: number;
  startedAt: number;
  playableAt?: number;
  error?: string;
  requiredGates: WorldGate[];
  gates: Partial<Record<WorldGate, { at: number; detail?: string }>>;
};

const states: Record<WorldKey, PhaseState> = {
  core: { playable: true, phase: 'idle', progress: 1, displayProgress: 1, startedAt: Date.now(), requiredGates: [], gates: {} },
  fantasy: { playable: false, phase: 'boot', progress: 0, displayProgress: 0, startedAt: Date.now(), requiredGates: [...REQUIRED_GATES.fantasy], gates: {} },
  skybase: { playable: false, phase: 'boot', progress: 0, displayProgress: 0, startedAt: Date.now(), requiredGates: [...REQUIRED_GATES.skybase], gates: {} },
};

const listeners = new Set<() => void>();
let progressTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;

function emit() { listeners.forEach((l) => l()); }

function ensureTimers() {
  if (!progressTimer) {
    progressTimer = setInterval(() => {
      let dirty = false;
      (Object.keys(REQUIRED_GATES) as PlayableWorld[]).forEach((world) => {
        const s = states[world];
        const target = s.playable ? 1 : Math.min(0.99, s.progress);
        if (s.displayProgress + 0.0001 < target) {
          s.displayProgress = Math.min(target, s.displayProgress + 0.01);
          dirty = true;
        }
      });
      if (dirty) emit();
    }, 45);
  }

  if (!watchdogTimer) {
    watchdogTimer = setInterval(() => {
      const now = Date.now();
      let dirty = false;
      (Object.keys(REQUIRED_GATES) as PlayableWorld[]).forEach((world) => {
        const s = states[world];
        if (s.playable || s.error) return;
        if (now - s.startedAt < 45000) return;
        const missing = s.requiredGates.filter((g) => !s.gates[g]);
        if (!missing.length) return;
        s.error = `Timed out waiting for: ${missing.join(', ')}`;
        s.phase = 'error';
        console.error(`[LOAD_ERROR] ${world} ${s.error}`);
        dirty = true;
      });
      if (dirty) emit();
    }, 1000);
  }
}

ensureTimers();

function recomputeProgress(world: PlayableWorld) {
  const s = states[world];
  const total = s.requiredGates.length;
  const done = s.requiredGates.filter((g) => !!s.gates[g]).length;
  s.progress = total ? done / total : 1;
  if (s.playable) s.progress = 1;
}

export function resetWorldReady(world: PlayableWorld) {
  states[world] = {
    playable: false,
    phase: 'boot',
    progress: 0,
    displayProgress: 0,
    startedAt: Date.now(),
    requiredGates: [...REQUIRED_GATES[world]],
    gates: {},
    error: undefined,
  };
  emit();
}

export function setWorldPhase(world: PlayableWorld, phaseName: string, progressHint?: number) {
  const s = states[world];
  s.phase = phaseName;
  if (typeof progressHint === 'number') {
    const bounded = Math.max(0, Math.min(0.99, progressHint));
    s.progress = Math.max(s.progress, bounded);
  }
  emit();
}

export function reportWorldGate(world: PlayableWorld, gate: WorldGate, detail?: string) {
  const s = states[world];
  if (!s.gates[gate]) {
    s.gates[gate] = { at: Date.now(), detail };
    console.log(`[LOAD_GATE] ${world} gate=${gate}${detail ? ` detail=${detail}` : ''}`);
  }
  if (gate === 'playable') {
    s.playable = true;
    s.playableAt = Date.now();
    s.phase = 'playable';
  }
  s.error = undefined;
  recomputeProgress(world);
  emit();
}

export function setWorldError(world: PlayableWorld, reason: string) {
  const s = states[world];
  s.error = reason;
  s.phase = 'error';
  console.error(`[LOAD_ERROR] ${world} ${reason}`);
  emit();
}

export function markWorldPlayable(world: PlayableWorld) {
  reportWorldGate(world, 'playable');
}

export function isWorldReady(world: PlayableWorld) {
  return states[world].playable;
}

export function markWorldReady(world: PlayableWorld) { markWorldPlayable(world); }

export function useWorldReadiness(world: PlayableWorld) {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      const s = states[world];
      return {
        playable: s.playable,
        phase: s.phase,
        progress: s.displayProgress,
        rawProgress: s.progress,
        error: s.error,
      };
    },
  );
}
