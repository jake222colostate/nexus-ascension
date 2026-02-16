import { WorldKey } from '../../systems/upgrades/upgradeTypes';

export type LoadProgress = { progress: number; asset?: string; done: boolean };

const fakeAssets: Record<WorldKey, string[]> = {
  fantasy: ['Terrain', 'Gazebo', 'Enemies', 'Collision BVH'],
  skybase: ['Platform', 'Grid', 'Drones', 'Collision BVH'],
  hub: ['Overview Data', 'Meta Systems'],
};

export async function loadWorld(world: WorldKey, onProgress: (value: LoadProgress) => void): Promise<void> {
  const steps = fakeAssets[world];
  for (let i = 0; i < steps.length; i += 1) {
    onProgress({ progress: Math.floor((i / steps.length) * 100), asset: steps[i], done: false });
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  onProgress({ progress: 100, asset: 'Ready', done: true });
}
