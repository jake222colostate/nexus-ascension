export type WorldKey = 'core' | 'fantasy' | 'skybase';

export type AssetDescriptor = {
  id: string;
  label: string;
  url: string;
  kind: 'model' | 'texture' | 'audio';
};

const FANTASY_BASE = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/environment-fantasy3d';
const SKYBASE_BASE = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets';

export const ASSET_MANIFEST: Record<WorldKey, AssetDescriptor[]> = {
  core: [
    { id: 'skybox-global', label: 'Global Skybox', url: `${SKYBASE_BASE}/skybox1.jpg`, kind: 'texture' },
  ],
  fantasy: [
    { id: 'mountain', label: 'Mountain Range', url: `${FANTASY_BASE}/mountain_v2.glb`, kind: 'model' },
    { id: 'path', label: 'Ancient Path', url: `${FANTASY_BASE}/path.glb`, kind: 'model' },
    { id: 'podium', label: 'Rune Podium', url: `${FANTASY_BASE}/podium_v1.glb`, kind: 'model' },
    { id: 'forest-tree', label: 'Forest Tree', url: `${FANTASY_BASE}/forest_tree.glb`, kind: 'model' },
    { id: 'monster-model', label: 'Night Stalker', url: `${FANTASY_BASE}/monster1/monster1_model.glb`, kind: 'model' },
    { id: 'monster-walk', label: 'Walk Anim', url: `${FANTASY_BASE}/monster1/monster1_walking.glb`, kind: 'model' },
    { id: 'monster-run', label: 'Run Anim', url: `${FANTASY_BASE}/monster1/monster1_running.glb`, kind: 'model' },
    { id: 'monster-attack', label: 'Attack Anim', url: `${FANTASY_BASE}/monster1/monster1_attack_v1.glb`, kind: 'model' },
    { id: 'fantasy-skybox', label: 'Fantasy Sky', url: `${SKYBASE_BASE}/skybox1.jpg`, kind: 'texture' },
  ],
  skybase: [
    { id: 'skybase-skybox', label: 'Skybase Atmosphere', url: `${SKYBASE_BASE}/skybase_stage1_skybox.jpeg`, kind: 'texture' },
  ],
};

export const WORLD_ENTRY_ASSETS: Record<Exclude<WorldKey, 'core'>, AssetDescriptor[]> = {
  fantasy: [...ASSET_MANIFEST.core, ...ASSET_MANIFEST.fantasy],
  skybase: [...ASSET_MANIFEST.core, ...ASSET_MANIFEST.skybase],
};
