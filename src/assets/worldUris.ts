import { Asset } from 'expo-asset';
import { isMeshoptSupported } from '../three/gltfLoaderConfig';

const modules = {
  core: {
    skyboxGlobal: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  fantasy: {
    mountainMobile: require('../../assets/glb/fantasy3d/mountain_v2_mobile.glb'),
    mountainLegacy: require('../../assets/glb/_old/fantasy3d/mountain_v2.glb'),
    gazeboMobile: require('../../assets/glb/fantasy3d/spawn_gazebo_mobile.glb'),
    gazeboLegacy: require('../../assets/glb/_old/fantasy3d/spawn_gazebo.glb'),
    pathMobile: require('../../assets/glb/fantasy3d/path_mobile.glb'),
    pathLegacy: require('../../assets/glb/_old/fantasy3d/path.glb'),
    podiumMobile: require('../../assets/glb/fantasy3d/podium_v1_mobile.glb'),
    podiumLegacy: require('../../assets/glb/_old/fantasy3d/podium_v1.glb'),
    forestTreeMobile: require('../../assets/glb/fantasy3d/forest_tree_mobile.glb'),
    forestTreeLegacy: require('../../assets/glb/_old/fantasy3d/forest_tree.glb'),
    crystal1Mobile: require('../../assets/glb/fantasy3d/Crystals/crystal1_mobile.glb'),
    crystal1Legacy: require('../../assets/glb/_old/fantasy3d/Crystals/crystal1.glb'),
    crystal2Mobile: require('../../assets/glb/fantasy3d/Crystals/crystal2_mobile.glb'),
    crystal2Legacy: require('../../assets/glb/_old/fantasy3d/Crystals/crystal2.glb'),
    crystal3Mobile: require('../../assets/glb/fantasy3d/Crystals/crystal3_mobile.glb'),
    crystal3Legacy: require('../../assets/glb/_old/fantasy3d/Crystals/crystal3.glb'),
    crystal4Mobile: require('../../assets/glb/fantasy3d/Crystals/crystal4_mobile.glb'),
    crystal4Legacy: require('../../assets/glb/_old/fantasy3d/Crystals/crystal4.glb'),
    crystal5Mobile: require('../../assets/glb/fantasy3d/Crystals/crystal5_mobile.glb'),
    crystal5Legacy: require('../../assets/glb/_old/fantasy3d/Crystals/crystal5.glb'),
    monsterModelMobile: require('../../assets/glb/fantasy3d/monster1/monster1_model_mobile.glb'),
    monsterModelLegacy: require('../../assets/glb/_old/fantasy3d/monster1/monster1_model.glb'),
    monsterWalkMobile: require('../../assets/glb/fantasy3d/monster1/monster1_walking_mobile.glb'),
    monsterWalkLegacy: require('../../assets/glb/_old/fantasy3d/monster1/monster1_walking.glb'),
    monsterRunMobile: require('../../assets/glb/fantasy3d/monster1/monster1_running_mobile.glb'),
    monsterRunLegacy: require('../../assets/glb/_old/fantasy3d/monster1/monster1_running.glb'),
    monsterAttackMobile: require('../../assets/glb/fantasy3d/monster1/monster1_attack_v1_mobile.glb'),
    monsterAttackLegacy: require('../../assets/glb/_old/fantasy3d/monster1/monster1_attack_v1.glb'),
    staffMobile: require('../../assets/glb/fantasy3d/staff1_mobile.glb'),
    staffLegacy: require('../../assets/glb/_old/fantasy3d/staff1.glb'),
    summonBaseMobile: require('../../assets/glb/fantasy3d/Summons/Summons1/summon_texture_mobile.glb'),
    summonBaseLegacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/summon_texture.glb'),
    summonWalkMobile: require('../../assets/glb/fantasy3d/Summons/Summons1/walking_mobile.glb'),
    summonWalkLegacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/walking.glb'),
    summonRunMobile: require('../../assets/glb/fantasy3d/Summons/Summons1/running_mobile.glb'),
    summonRunLegacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/running.glb'),
    summonCast1Mobile: require('../../assets/glb/fantasy3d/Summons/Summons1/spellcast1_mobile.glb'),
    summonCast1Legacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/spellcast1.glb'),
    summonCast2Mobile: require('../../assets/glb/fantasy3d/Summons/Summons1/spellcast2_mobile.glb'),
    summonCast2Legacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/spellcast2.glb'),
    summonCast3Mobile: require('../../assets/glb/fantasy3d/Summons/Summons1/spellcast3_mobile.glb'),
    summonCast3Legacy: require('../../assets/glb/_old/fantasy3d/Summons/Summons1/spellcast3.glb'),
    fantasySkybox: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  skybase: {
    skybox: require('../../assets/glb/skybase/skybase_stage1_skybox.jpeg'),
  },
} as const;

const PREFERRED_KEYS: Record<string, readonly string[]> = {
  mountain: ['mountainMobile', 'mountain', 'mountainLegacy'],
  gazebo: ['gazeboMobile', 'gazebo', 'gazeboLegacy'],
  path: ['pathMobile', 'path', 'pathLegacy'],
  podium: ['podiumMobile', 'podium', 'podiumLegacy'],
  forestTree: ['forestTreeMobile', 'forestTree', 'forestTreeLegacy'],
  crystal1: ['crystal1Mobile', 'crystal1', 'crystal1Legacy'],
  crystal2: ['crystal2Mobile', 'crystal2', 'crystal2Legacy'],
  crystal3: ['crystal3Mobile', 'crystal3', 'crystal3Legacy'],
  crystal4: ['crystal4Mobile', 'crystal4', 'crystal4Legacy'],
  crystal5: ['crystal5Mobile', 'crystal5', 'crystal5Legacy'],
  monsterModel: ['monsterModelMobile', 'monsterModel', 'monsterModelLegacy'],
  monsterWalk: ['monsterWalkMobile', 'monsterWalk', 'monsterWalkLegacy'],
  monsterRun: ['monsterRunMobile', 'monsterRun', 'monsterRunLegacy'],
  monsterAttack: ['monsterAttackMobile', 'monsterAttack', 'monsterAttackLegacy'],
  staff: ['staffMobile', 'staff', 'staffLegacy'],
  summonBase: ['summonBaseMobile', 'summonBase', 'summonBaseLegacy'],
  summonWalk: ['summonWalkMobile', 'summonWalk', 'summonWalkLegacy'],
  summonRun: ['summonRunMobile', 'summonRun', 'summonRunLegacy'],
  summonCast1: ['summonCast1Mobile', 'summonCast1', 'summonCast1Legacy'],
  summonCast2: ['summonCast2Mobile', 'summonCast2', 'summonCast2Legacy'],
  summonCast3: ['summonCast3Mobile', 'summonCast3', 'summonCast3Legacy'],
};

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
const loggedBest = new Set<string>();

type VariantUris = {
  meshopt?: string;
  noMeshopt?: string;
};

const ASSET_VARIANTS: Partial<Record<keyof WorldUris, Record<string, VariantUris>>> = {
  fantasy: {
    mountain: { meshopt: 'mountainMobile', noMeshopt: 'mountainLegacy' },
    gazebo: { meshopt: 'gazeboMobile', noMeshopt: 'gazeboLegacy' },
    path: { meshopt: 'pathMobile', noMeshopt: 'pathLegacy' },
    podium: { meshopt: 'podiumMobile', noMeshopt: 'podiumLegacy' },
    forestTree: { meshopt: 'forestTreeMobile', noMeshopt: 'forestTreeLegacy' },
    crystal1: { meshopt: 'crystal1Mobile', noMeshopt: 'crystal1Legacy' },
    crystal2: { meshopt: 'crystal2Mobile', noMeshopt: 'crystal2Legacy' },
    crystal3: { meshopt: 'crystal3Mobile', noMeshopt: 'crystal3Legacy' },
    crystal4: { meshopt: 'crystal4Mobile', noMeshopt: 'crystal4Legacy' },
    crystal5: { meshopt: 'crystal5Mobile', noMeshopt: 'crystal5Legacy' },
    monsterModel: { meshopt: 'monsterModelMobile', noMeshopt: 'monsterModelLegacy' },
    monsterWalk: { meshopt: 'monsterWalkMobile', noMeshopt: 'monsterWalkLegacy' },
    monsterRun: { meshopt: 'monsterRunMobile', noMeshopt: 'monsterRunLegacy' },
    monsterAttack: { meshopt: 'monsterAttackMobile', noMeshopt: 'monsterAttackLegacy' },
    staff: { meshopt: 'staffMobile', noMeshopt: 'staffLegacy' },
    summonBase: { meshopt: 'summonBaseMobile', noMeshopt: 'summonBaseLegacy' },
    summonWalk: { meshopt: 'summonWalkMobile', noMeshopt: 'summonWalkLegacy' },
    summonRun: { meshopt: 'summonRunMobile', noMeshopt: 'summonRunLegacy' },
    summonCast1: { meshopt: 'summonCast1Mobile', noMeshopt: 'summonCast1Legacy' },
    summonCast2: { meshopt: 'summonCast2Mobile', noMeshopt: 'summonCast2Legacy' },
    summonCast3: { meshopt: 'summonCast3Mobile', noMeshopt: 'summonCast3Legacy' },
  },
};

export function getWorldUris(): WorldUris {
  return RESOLVED_WORLD_URIS ?? WORLD_URIS;
}

export function hasResolvedWorldUris(): boolean {
  return RESOLVED_WORLD_URIS != null;
}

export function getBestAssetUri(world: keyof WorldUris, key: string): string {
  const uris = getWorldUris()[world] ?? {};
  const variant = ASSET_VARIANTS[world]?.[key];
  const meshoptSupported = isMeshoptSupported();

  if (variant) {
    const meshoptUri = variant.meshopt ? String(uris[variant.meshopt] ?? '') : '';
    const noMeshoptUri = variant.noMeshopt ? String(uris[variant.noMeshopt] ?? '') : '';

    if (!meshoptSupported) {
      if (noMeshoptUri) {
        const logKey = `${world}:${key}:fallback`;
        if (!loggedBest.has(logKey)) {
          loggedBest.add(logKey);
          console.log(`[meshopt] FALLBACK no-meshopt for key=${key} uri=${noMeshoptUri}`);
        }
        return noMeshoptUri;
      }

      throw new Error(
        `[meshopt] Unsupported meshopt asset on iOS runtime: key=${key} uri=${meshoptUri || '(missing meshopt uri)'}. ` +
        `Asset is meshopt-compressed and no noMeshopt variant is configured. Re-export/add a non-meshopt GLB and wire it as noMeshopt.`,
      );
    }

    if (meshoptUri) {
      const logKey = `${world}:${key}`;
      if (!loggedBest.has(logKey)) {
        loggedBest.add(logKey);
        const meshoptKey = variant.meshopt as string;
        console.log(`[ASSET_SELECT] world=${world} key=${key} chosen=${meshoptKey} mobile=${meshoptKey.toLowerCase().includes('mobile')} uri=${meshoptUri}`);
      }
      return meshoptUri;
    }
  }

  const preferredKeys = PREFERRED_KEYS[key] ?? [`${key}Mobile`, key, `${key}Legacy`];
  const chosenKey = preferredKeys.find((candidate) => Boolean(uris[candidate])) ?? key;
  const uri = String(uris[chosenKey] ?? uris[key] ?? '');

  const logKey = `${world}:${key}`;
  if (!loggedBest.has(logKey)) {
    loggedBest.add(logKey);
    console.log(`[ASSET_SELECT] world=${world} key=${key} chosen=${chosenKey} mobile=${chosenKey.toLowerCase().includes('mobile')} uri=${uri}`);
  }

  return uri;
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
