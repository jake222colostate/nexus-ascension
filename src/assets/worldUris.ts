import { Asset } from 'expo-asset';

const modules = {
  core: {
    skyboxGlobal: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  fantasy: {
    mountain: require('../../assets/glb/fantasy3d/mountain_v2.glb'),
    gazebo: require('../../assets/glb/fantasy3d/spawn_gazebo.glb'),
    path: require('../../assets/glb/fantasy3d/path.glb'),
    podium: require('../../assets/glb/fantasy3d/podium_v1.glb'),
    forestTree: require('../../assets/glb/fantasy3d/forest_tree.glb'),
    crystal1: require('../../assets/glb/fantasy3d/Crystals/crystal1.glb'),
    crystal2: require('../../assets/glb/fantasy3d/Crystals/crystal2.glb'),
    crystal3: require('../../assets/glb/fantasy3d/Crystals/crystal3.glb'),
    crystal4: require('../../assets/glb/fantasy3d/Crystals/crystal4.glb'),
    crystal5: require('../../assets/glb/fantasy3d/Crystals/crystal5.glb'),
    monsterModel: require('../../assets/glb/fantasy3d/monster1/monster1_model.glb'),
    monsterWalk: require('../../assets/glb/fantasy3d/monster1/monster1_walking.glb'),
    monsterRun: require('../../assets/glb/fantasy3d/monster1/monster1_running.glb'),
    monsterAttack: require('../../assets/glb/fantasy3d/monster1/monster1_attack_v1.glb'),
    fantasySkybox: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  skybase: {
    skybox: require('../../assets/glb/skybase/skybase_stage1_skybox.jpeg'),
  },
} as const;

export type WorldUris = {
  core: Record<string, string>;
  fantasy: Record<string, string>;
  skybase: Record<string, string>;
};

export type AssetProgress = { done: number; total: number; world: string; key: string };

export const WORLD_URIS: WorldUris = {
  core: {
    skyboxGlobal: Asset.fromModule(modules.core.skyboxGlobal).uri,
  },
  fantasy: {
    mountain: Asset.fromModule(modules.fantasy.mountain).uri,
    gazebo: Asset.fromModule(modules.fantasy.gazebo).uri,
    path: Asset.fromModule(modules.fantasy.path).uri,
    podium: Asset.fromModule(modules.fantasy.podium).uri,
    forestTree: Asset.fromModule(modules.fantasy.forestTree).uri,
    crystal1: Asset.fromModule(modules.fantasy.crystal1).uri,
    crystal2: Asset.fromModule(modules.fantasy.crystal2).uri,
    crystal3: Asset.fromModule(modules.fantasy.crystal3).uri,
    crystal4: Asset.fromModule(modules.fantasy.crystal4).uri,
    crystal5: Asset.fromModule(modules.fantasy.crystal5).uri,
    monsterModel: Asset.fromModule(modules.fantasy.monsterModel).uri,
    monsterWalk: Asset.fromModule(modules.fantasy.monsterWalk).uri,
    monsterRun: Asset.fromModule(modules.fantasy.monsterRun).uri,
    monsterAttack: Asset.fromModule(modules.fantasy.monsterAttack).uri,
    fantasySkybox: Asset.fromModule(modules.fantasy.fantasySkybox).uri,
  },
  skybase: {
    skybox: Asset.fromModule(modules.skybase.skybox).uri,
  },
};

export async function resolveWorldUris(onProgress?: (p: AssetProgress) => void): Promise<WorldUris> {
  const resolved: any = { core: {}, fantasy: {}, skybase: {} };

  const entries: Array<{ world: keyof typeof modules; key: string; mod: any }> = [];
  (Object.keys(modules) as Array<keyof typeof modules>).forEach((world) => {
    Object.keys((modules as any)[world]).forEach((key) => {
      entries.push({ world, key, mod: (modules as any)[world][key] });
    });
  });

  const total = entries.length;
  let done = 0;

  for (const e of entries) {
    const asset = Asset.fromModule(e.mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    resolved[e.world][e.key] = uri;
    done += 1;
    onProgress?.({ done, total, world: String(e.world), key: String(e.key) });
  }

  return resolved as WorldUris;
}

// keep old name used elsewhere, but now it actually resolves localUri for fast loads
export async function downloadAllWorldAssets(onProgress?: (p: AssetProgress) => void) {
  await resolveWorldUris(onProgress);
}
