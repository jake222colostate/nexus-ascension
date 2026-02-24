import { useSyncExternalStore } from 'react';
import type { WorldKey } from '../assets/assetManifest';

export type PlayableWorld = Exclude<WorldKey, 'core'>;
export type WorldLoadPhase = 'idle' | 'starting' | 'preloading' | 'canvas-mounted' | 'scene-ready' | 'interactive' | 'error';

export type AssetProgressDetails = {
  queued: number;
  loaded: number;
  failed: number;
  currentAssetKey?: string;
};

type PhaseTimestamps = Partial<Record<Exclude<WorldLoadPhase, 'idle'>, number>>;

type WorldLoadState = {
  world: PlayableWorld;
  phase: WorldLoadPhase;
  progress: number;
  playable: boolean;
  error?: string;
  details: AssetProgressDetails;
  startedAt: number;
  timestamps: PhaseTimestamps;
  criticalAssets: string[];
};

const PHASE_ORDER: WorldLoadPhase[] = ['idle', 'starting', 'preloading', 'canvas-mounted', 'scene-ready', 'interactive', 'error'];

const state: Record<PlayableWorld, WorldLoadState> = {
  fantasy: makeInitialState('fantasy'),
  skybase: makeInitialState('skybase'),
};

const listeners = new Set<() => void>();

function makeInitialState(world: PlayableWorld): WorldLoadState {
  return {
    world,
    phase: 'idle',
    progress: 0,
    playable: false,
    details: { queued: 0, loaded: 0, failed: 0 },
    startedAt: 0,
    timestamps: {},
    criticalAssets: [],
  };
}

function emit() { listeners.forEach((l) => l()); }

function phaseIndex(phase: WorldLoadPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

function transitionPhase(world: PlayableWorld, next: WorldLoadPhase, reason?: string) {
  const s = state[world];
  if (s.phase === next) return;
  const prev = s.phase;
  if (phaseIndex(next) < phaseIndex(prev) && next !== 'error') return;
  s.phase = next;
  if (next !== 'idle') s.timestamps[next] = Date.now();
  if (next === 'interactive') {
    s.playable = true;
    s.progress = 1;
    const totalMs = s.startedAt ? Date.now() - s.startedAt : 0;
    console.log(`[LOAD_DONE] ${world} interactive_ms=${totalMs}`);
  }
  console.log(`[LOAD_PHASE] ${world} ${prev} -> ${next}${reason ? ` (${reason})` : ''}`);
}

function recomputeProgress(world: PlayableWorld) {
  const s = state[world];
  const ratio = s.details.queued > 0 ? s.details.loaded / s.details.queued : 0;
  const phaseFloor: Record<WorldLoadPhase, number> = {
    idle: 0,
    starting: 0.03,
    preloading: 0.08,
    'canvas-mounted': 0.75,
    'scene-ready': 0.92,
    interactive: 1,
    error: Math.min(0.99, s.progress),
  };
  const preloadCap = s.phase === 'preloading' ? 0.7 : 0.9;
  const fromAssets = Math.min(preloadCap, 0.08 + ratio * 0.62);
  s.progress = Math.max(phaseFloor[s.phase], fromAssets, s.phase === 'interactive' ? 1 : 0);
}

export function beginWorldLoad(world: PlayableWorld, assetList: Array<{ key: string; uri: string }>) {
  const now = Date.now();
  state[world] = {
    world,
    phase: 'starting',
    progress: 0.03,
    playable: false,
    details: { queued: assetList.length, loaded: 0, failed: 0 },
    startedAt: now,
    timestamps: { starting: now },
    criticalAssets: assetList.map((a) => a.key),
    error: undefined,
  };
  console.log(`[LOAD_START] ${world} t0=${now} critical=${assetList.map((a) => `${a.key}:${a.uri}`).join(',')}`);
  transitionPhase(world, 'preloading');
  recomputeProgress(world);
  emit();
}

export function setAssetProgress(world: PlayableWorld, progress: { loaded: number; queued: number; failed?: number; currentAssetKey?: string }) {
  const s = state[world];
  s.details = {
    queued: Math.max(0, progress.queued),
    loaded: Math.max(0, progress.loaded),
    failed: Math.max(0, progress.failed ?? s.details.failed),
    currentAssetKey: progress.currentAssetKey,
  };
  if (s.phase === 'starting' || s.phase === 'idle') transitionPhase(world, 'preloading');
  recomputeProgress(world);
  emit();
}

export function markCanvasMounted(world: PlayableWorld) {
  transitionPhase(world, 'canvas-mounted');
  recomputeProgress(world);
  emit();
}

export function markSceneReady(world: PlayableWorld) {
  transitionPhase(world, 'scene-ready');
  recomputeProgress(world);
  emit();
}

export function markInteractive(world: PlayableWorld) {
  transitionPhase(world, 'interactive');
  recomputeProgress(world);
  emit();
}

export function setWorldError(world: PlayableWorld, reason: string) {
  const s = state[world];
  s.error = reason;
  transitionPhase(world, 'error', reason);
  recomputeProgress(world);
  console.error(`[LOAD_ERROR] ${world} ${reason}`);
  emit();
}

// Compatibility wrappers for existing callers.
export function resetWorldReady(world: PlayableWorld) {
  state[world] = makeInitialState(world);
  emit();
}

export function setWorldPhase(world: PlayableWorld, phaseName: string, progressHint?: number) {
  const s = state[world];
  if (typeof progressHint === 'number') s.progress = Math.max(s.progress, Math.min(0.99, Math.max(0, progressHint)));
  if (phaseName.includes('canvas')) markCanvasMounted(world);
  if (phaseName.includes('scene')) markSceneReady(world);
  emit();
}

export function reportWorldGate(world: PlayableWorld, gate: string, detail?: string) {
  if (gate === 'canvas-mounted') markCanvasMounted(world);
  if (gate === 'scene-mounted') markSceneReady(world);
  if (gate === 'controls-ready' || gate === 'playable') markInteractive(world);
  if (gate === 'entry-assets') {
    const queued = state[world].details.queued || 1;
    setAssetProgress(world, { loaded: queued, queued, currentAssetKey: detail });
  }
}

export function markWorldPlayable(world: PlayableWorld) { markInteractive(world); }
export function markWorldReady(world: PlayableWorld) { markInteractive(world); }
export function isWorldReady(world: PlayableWorld) { return state[world].phase === 'interactive'; }

type Snapshot = {
  playable: boolean;
  phase: string;
  progress: number;
  rawProgress: number;
  error?: string;
  blockers: string[];
  details: AssetProgressDetails;
};

function blockersFor(world: PlayableWorld): string[] {
  const s = state[world];
  if (s.phase === 'preloading' && s.details.currentAssetKey) return [`Loading ${s.details.currentAssetKey}`];
  if (s.phase === 'preloading') return ['Loading critical GLBs'];
  if (s.phase === 'canvas-mounted') return ['Waiting for scene assembly'];
  if (s.phase === 'scene-ready') return ['Waiting for first interactive frame'];
  if (s.phase === 'error') return [s.error ?? 'Loading error'];
  return [];
}

export function useWorldReadiness(world: PlayableWorld) {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      const s = state[world];
      return {
        playable: s.phase === 'interactive',
        phase: s.phase,
        progress: s.progress,
        rawProgress: s.progress,
        error: s.error,
        blockers: blockersFor(world),
        details: s.details,
      } as Snapshot;
    },
  );
}
