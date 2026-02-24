import { useGLTF } from '@react-three/drei/native';
import { useLoader } from '@react-three/fiber/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let readyPromise: Promise<void> | null = null;
let didInstall = false;
let didLogMeshoptAttach = false;

const MESHOPT_DEBUG =
  typeof globalThis !== 'undefined' &&
  !!(globalThis as any).__NEXUS_DEBUG_MESHOPT;

function getReadyPromise(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.resolve((MeshoptDecoder as any)?.ready)
      .then(() => {})
      .catch(() => {});
  }
  return readyPromise;
}

function markMeshoptInstalled(loader: any) {
  loader.__nexusMeshoptInstalled = true;
  if (MESHOPT_DEBUG && !didLogMeshoptAttach) {
    didLogMeshoptAttach = true;
    console.log('[meshopt] attached decoder to GLTFLoader instance');
  }
}

export function configureGLTFLoader(loader: GLTFLoader) {
  const anyLoader = loader as any;
  if (anyLoader.__nexusMeshoptInstalled) return;
  if (MeshoptDecoder && anyLoader.setMeshoptDecoder) {
    anyLoader.setMeshoptDecoder(MeshoptDecoder as any);
    markMeshoptInstalled(anyLoader);
  }
}

export function getGLTFLoader(manager?: ConstructorParameters<typeof GLTFLoader>[0]) {
  const loader = new GLTFLoader(manager);
  configureGLTFLoader(loader);
  return loader;
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;

  if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
    (useGLTF as any).setMeshoptDecoder(MeshoptDecoder as any);
  }
}

export function ensureMeshoptReady() {
  installMeshoptDecoder();
  return getReadyPromise();
}

export function useGLTFMeshopt(url: any): any {
  installMeshoptDecoder();
  const r: any = MeshoptDecoder as any;
  if (r?.ready && typeof r.ready.then === 'function' && !r.__nexusReady) {
    throw getReadyPromise().then(() => {
      r.__nexusReady = true;
    });
  }

  return useLoader(GLTFLoader as any, url, configureGLTFLoader as any);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  getReadyPromise().then(() => {
    (useLoader as any).preload(GLTFLoader as any, url, configureGLTFLoader as any);
    if ((useGLTF as any)?.preload) {
      (useGLTF as any).preload(url, undefined, undefined, configureGLTFLoader);
    }
  });
}
