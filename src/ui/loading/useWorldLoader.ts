import { useCallback, useEffect, useRef, useState } from 'react';
import { WorldKey } from '../../systems/upgrades/upgradeTypes';
import { LoadProgress, loadWorld } from './loader';

export function useWorldLoader(world: WorldKey, tip: string) {
  const [progress, setProgress] = useState<LoadProgress>({ progress: 0, asset: 'Initializing', done: false });
  const [visible, setVisible] = useState(true);
  const worldReady = useRef(false);

  useEffect(() => {
    let active = true;
    worldReady.current = false;
    setVisible(true);
    setProgress({ progress: 0, asset: 'Initializing', done: false });

    loadWorld(world, (next) => {
      if (!active) return;
      setProgress(next);
    }).then(() => {
      if (!active) return;
      setProgress((prev) => ({ ...prev, progress: Math.min(98, Math.max(90, prev.progress)), asset: 'Awaiting world readiness', done: false }));
    });

    return () => {
      active = false;
    };
  }, [world]);

  const markWorldReady = useCallback(() => {
    worldReady.current = true;
    setProgress({ progress: 100, asset: 'Ready', done: true });
    setTimeout(() => setVisible(false), 140);
  }, []);

  return {
    visible,
    progress,
    tip,
    markWorldReady,
  };
}
