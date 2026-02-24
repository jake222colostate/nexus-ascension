import { getBestAssetUri } from './worldUris';

export type WorldKey = 'core' | 'fantasy' | 'skybase';

export type AssetDescriptor = {
  id: string;
  label: string;
  url: string;
  kind: 'model' | 'texture' | 'audio';
};

export function buildAssetManifest(worldUris: any): Record<WorldKey, AssetDescriptor[]> {
  return {
    core: [
      { id: 'skybox-global', label: 'Global Skybox', url: worldUris.core.skyboxGlobal, kind: 'texture' },
    ],
    fantasy: [
      { id: 'mountain', label: 'Mountain Range', url: getBestAssetUri('fantasy', 'mountain'), kind: 'model' },
      { id: 'gazebo', label: 'Spawn Gazebo', url: getBestAssetUri('fantasy', 'gazebo'), kind: 'model' },
      { id: 'path', label: 'Ancient Path', url: getBestAssetUri('fantasy', 'path'), kind: 'model' },
      { id: 'podium', label: 'Rune Podium', url: getBestAssetUri('fantasy', 'podium'), kind: 'model' },
      { id: 'staff', label: 'Mage Staff', url: getBestAssetUri('fantasy', 'staff'), kind: 'model' },
      { id: 'forest-tree', label: 'Forest Tree', url: getBestAssetUri('fantasy', 'forestTree'), kind: 'model' },
      { id: 'crystal-1', label: 'Crystal (1)', url: getBestAssetUri('fantasy', 'crystal1'), kind: 'model' },
      { id: 'crystal-2', label: 'Crystal (2)', url: getBestAssetUri('fantasy', 'crystal2'), kind: 'model' },
      { id: 'crystal-3', label: 'Crystal (3)', url: getBestAssetUri('fantasy', 'crystal3'), kind: 'model' },
      { id: 'crystal-4', label: 'Crystal (4)', url: getBestAssetUri('fantasy', 'crystal4'), kind: 'model' },
      { id: 'crystal-5', label: 'Crystal (5)', url: getBestAssetUri('fantasy', 'crystal5'), kind: 'model' },
      { id: 'monster-model', label: 'Night Stalker', url: getBestAssetUri('fantasy', 'monsterModel'), kind: 'model' },
      { id: 'monster-walk', label: 'Walk Anim', url: getBestAssetUri('fantasy', 'monsterWalk'), kind: 'model' },
      { id: 'monster-run', label: 'Run Anim', url: getBestAssetUri('fantasy', 'monsterRun'), kind: 'model' },
      { id: 'monster-attack', label: 'Attack Anim', url: getBestAssetUri('fantasy', 'monsterAttack'), kind: 'model' },
      { id: 'fantasy-skybox', label: 'Fantasy Sky', url: worldUris.fantasy.fantasySkybox, kind: 'texture' },
    ],
    skybase: [
      { id: 'skybase-skybox', label: 'Skybase Atmosphere', url: worldUris.skybase.skybox, kind: 'texture' },
    ],
  };
}

export function buildWorldEntryAssets(world: Exclude<WorldKey, 'core'>, worldUris: any): AssetDescriptor[] {
  const m = buildAssetManifest(worldUris);

  if (world === 'fantasy') {
    const pick = (id: string) => m.fantasy.find(a => a.id === id);
    const out: AssetDescriptor[] = [];
    out.push(...m.core);
    for (const id of ['gazebo', 'path', 'podium', 'staff', 'crystal-1', 'fantasy-skybox']) {
      const a = pick(id);
      if (a) out.push(a);
    }
    return out;
  }

  return [...m.core, ...m.skybase];
}
