import { useLoader } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { MeshoptGLTFLoaderV2 } from './MeshoptGLTFLoaderV2';

let didGlobal = false;
let readyPromise: Promise<void> | null = null;

function getReadyPromise(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.resolve((MeshoptDecoder as any)?.ready)
      .then(() => {})
      .catch(() => {});
  }
  return readyPromise;
}

export function ensureMeshoptDecoder() {
  if (didGlobal) return;
  didGlobal = true;
  try {
    if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
      (useGLTF as any).setMeshoptDecoder(MeshoptDecoder as any);
    }
  } catch {}
}

export function useGLTFMeshopt(url: any): any {
  ensureMeshoptDecoder();
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
  ensureMeshoptDecoder();
  getReadyPromise().then(() => {
    (useLoader as any).preload(MeshoptGLTFLoaderV2 as any, url);
  });
}
