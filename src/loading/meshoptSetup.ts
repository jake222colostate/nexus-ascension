import { useLoader } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { MeshoptGLTFLoaderV2 } from './MeshoptGLTFLoaderV2';

let didInstall = false;
let didLogInstall = false;
let readyPromise: Promise<void> | null = null;

function getReadyPromise(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.resolve((MeshoptDecoder as any)?.ready)
      .then(() => {})
      .catch(() => {});
  }
  return readyPromise;
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;
  try {
    if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
      (useGLTF as any).setMeshoptDecoder(MeshoptDecoder as any);
      if (!didLogInstall) {
        didLogInstall = true;
        console.log('[meshopt] decoder installed');
      }
    }
  } catch {}
}

// Backward-compatible alias while we migrate callsites.
export const ensureMeshoptDecoder = installMeshoptDecoder;

export function useGLTFMeshopt(url: any): any {
  installMeshoptDecoder();
  const r: any = MeshoptDecoder as any;
  if (r?.ready && typeof r.ready.then === 'function') {
    if (!r._nexusReady) {
      throw getReadyPromise().then(() => {
        r._nexusReady = true;
      });
    }
  }
  return useLoader(MeshoptGLTFLoaderV2 as any, url);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  getReadyPromise().then(() => {
    (useLoader as any).preload(MeshoptGLTFLoaderV2 as any, url);
  });
}
