import { Asset } from 'expo-asset';

const modules = {
  core: {
    skyboxGlobal: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  fantasy: {
    mountain: require('../../assets/glb/fantasy3d/mountain_v2.glb'),
    mountainMobile: require('../../assets/glb/fantasy3d/mountain_v2_mobile.glb'),
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
    staff: require('../../assets/glb/fantasy3d/staff1.glb'),
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

function asUriMap(source: any): WorldUris {
  return {
    core: Object.fromEntries(Object.keys(source.core).map((k) => [k, Asset.fromModule(source.core[k]).uri])),
    fantasy: Object.fromEntries(Object.keys(source.fantasy).map((k) => [k, Asset.fromModule(source.fantasy[k]).uri])),
    skybase: Object.fromEntries(Object.keys(source.skybase).map((k) => [k, Asset.fromModule(source.skybase[k]).uri])),
  };
}

export const WORLD_URIS: WorldUris = asUriMap(modules);
let RESOLVED_WORLD_URIS: WorldUris | null = null;

export function getWorldUris(): WorldUris {
  return RESOLVED_WORLD_URIS ?? WORLD_URIS;
}

export function hasResolvedWorldUris(): boolean {
  return RESOLVED_WORLD_URIS != null;
}

function keyWithMobilePreference(keys: string[], key: string): string {
  const mobile = `${key}Mobile`;
  if (keys.includes(mobile)) return mobile;
  return key;
}

export function getBestAssetUri(world: keyof WorldUris, key: string): string {
  const uris = getWorldUris()[world] ?? {};
  const keys = Object.keys(uris);
  const finalKey = keyWithMobilePreference(keys, key);
  return String(uris[finalKey] ?? uris[key] ?? '');
}

export async function resolveWorldUris(onProgress?: (p: AssetProgress) => void): Promise<WorldUris> {
  const resolved: any = { core: {}, fantasy: {}, skybase: {} };
  const entries: Array<{ world: keyof typeof modules; key: string; mod: any }> = [];
  (Object.keys(modules) as Array<keyof typeof modules>).forEach((world) => {
    Object.keys((modules as any)[world]).forEach((key) => {
      entries.push({ world, key, mod: (modules as any)[world][key] });
    });
  });

  let done = 0;
  const total = entries.length;
  for (const e of entries) {
    const asset = Asset.fromModule(e.mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    resolved[e.world][e.key] = uri;
    done += 1;
    onProgress?.({ done, total, world: String(e.world), key: String(e.key) });
  }

  RESOLVED_WORLD_URIS = resolved as WorldUris;
  return RESOLVED_WORLD_URIS;
}

export async function downloadAllWorldAssets(onProgress?: (p: AssetProgress) => void) {
  await resolveWorldUris(onProgress);
}
