import { featureFlags } from '../../assets/featureFlags';
import { WorldKey } from '../../systems/upgrades/upgradeTypes';
import { fantasyAssets } from '../../worlds/fantasy/fantasyAssets';
import { skybaseAssets } from '../../worlds/skybase/skybaseAssets';

export type LoadProgress = { progress: number; asset?: string; done: boolean };

const baseAssets: Record<WorldKey, string[]> = {
  fantasy: fantasyAssets
    .filter((asset) => featureFlags.spawnGazeboEnabled || asset.id !== 'gazebo')
    .map((asset) => asset.label)
    .concat('Collision BVH', 'Controls Ready'),
  skybase: skybaseAssets.map((asset) => asset.label).concat('Collision BVH', 'Controls Ready'),
  hub: ['Nexus Graph', 'Meta Upgrade Ledger', 'Navigation Routes'],
};

export async function loadWorld(world: WorldKey, onProgress: (value: LoadProgress) => void): Promise<void> {
  const steps = baseAssets[world];
  onProgress({ progress: 0, asset: 'Initializing', done: false });

  for (let i = 0; i < steps.length; i += 1) {
    const progress = Math.floor(((i + 1) / (steps.length + 1)) * 100);
    onProgress({ progress, asset: steps[i], done: false });
    await new Promise((resolve) => setTimeout(resolve, 130));
  }
}
