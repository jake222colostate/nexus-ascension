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
      { id: 'mountain', label: 'Mountain Range', url: worldUris.fantasy.mountain, kind: 'model' },
      { id: 'gazebo', label: 'Spawn Gazebo', url: worldUris.fantasy.gazebo, kind: 'model' },
      { id: 'path', label: 'Ancient Path', url: worldUris.fantasy.path, kind: 'model' },
      { id: 'podium', label: 'Rune Podium', url: worldUris.fantasy.podium, kind: 'model' },
      { id: 'forest-tree', label: 'Forest Tree', url: worldUris.fantasy.forestTree, kind: 'model' },
      { id: 'crystal-1', label: 'Crystal (1)', url: worldUris.fantasy.crystal1, kind: 'model' },
      { id: 'crystal-2', label: 'Crystal (2)', url: worldUris.fantasy.crystal2, kind: 'model' },
      { id: 'crystal-3', label: 'Crystal (3)', url: worldUris.fantasy.crystal3, kind: 'model' },
      { id: 'crystal-4', label: 'Crystal (4)', url: worldUris.fantasy.crystal4, kind: 'model' },
      { id: 'crystal-5', label: 'Crystal (5)', url: worldUris.fantasy.crystal5, kind: 'model' },
      { id: 'monster-model', label: 'Night Stalker', url: worldUris.fantasy.monsterModel, kind: 'model' },
      { id: 'monster-walk', label: 'Walk Anim', url: worldUris.fantasy.monsterWalk, kind: 'model' },
      { id: 'monster-run', label: 'Run Anim', url: worldUris.fantasy.monsterRun, kind: 'model' },
      { id: 'monster-attack', label: 'Attack Anim', url: worldUris.fantasy.monsterAttack, kind: 'model' },
      { id: 'fantasy-skybox', label: 'Fantasy Sky', url: worldUris.fantasy.fantasySkybox, kind: 'texture' },
    ],
    skybase: [
      { id: 'skybase-skybox', label: 'Skybase Atmosphere', url: worldUris.skybase.skybox, kind: 'texture' },
    ],
  };
}

export function buildWorldEntryAssets(world: Exclude<WorldKey, 'core'>, worldUris: any): AssetDescriptor[] {
  const m = buildAssetManifest(worldUris);

  // The goal of "world entry" is: fast + stable on iOS.
  // Do NOT parse huge GLBs here (mountains/forests/monster rigs/animations).
  // Those should load lazily after first frame inside the world.
  if (world === 'fantasy') {
    const pick = (id: string) => m.fantasy.find(a => a.id === id);
    const out: AssetDescriptor[] = [];

    // Always include core skybox texture (cheap)
    out.push(...m.core);

    // Minimal "first frame" set
    for (const id of ['gazebo', 'path', 'podium', 'crystal-1', 'fantasy-skybox']) {
      const a = pick(id);
      if (a) out.push(a);
    }
    return out;
  }

  // Skybase entry is already tiny
  return [...m.core, ...m.skybase];
}
