import { ensureMeshoptReady, getGLTFLoader, preloadGLTFMeshopt } from './meshoptSetup';
import { setAssetProgress } from './worldLoadState';

export type PipelineAsset = { key: string; uri: string };

const successCache = new Set<string>();
const inflight = new Map<string, Promise<void>>();

async function preloadOne(asset: PipelineAsset): Promise<void> {
  if (!asset.uri) return;
  if (successCache.has(asset.uri)) return;
  const existing = inflight.get(asset.uri);
  if (existing) return existing;

  const p = (async () => {
    await ensureMeshoptReady();
    const loader: any = getGLTFLoader();
    await loader.loadAsync(asset.uri);
    try { preloadGLTFMeshopt(asset.uri as any); } catch {}
    successCache.add(asset.uri);
  })().finally(() => inflight.delete(asset.uri));

  inflight.set(asset.uri, p);
  return p;
}

export async function preloadCriticalWorldAssets(
  world: 'fantasy' | 'skybase',
  assets: PipelineAsset[],
): Promise<void> {
  let loaded = 0;
  let failed = 0;
  const queued = assets.length;

  for (const asset of assets) {
    try {
      await preloadOne(asset);
      loaded += 1;
    } catch (error) {
      failed += 1;
      console.error(`[LOAD_ASSET_FAIL] ${world} key=${asset.key} uri=${asset.uri} reason=${String(error)}`);
    }
    setAssetProgress(world, { loaded, queued, failed, currentAssetKey: asset.key });
  }
}
