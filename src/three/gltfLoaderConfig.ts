import { useGLTF } from '@react-three/drei/native';
import { useLoader } from '@react-three/fiber/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three-stdlib';

let didInstall = false;
let didLogAttach = false;

const MESHOPT_DEBUG =
  typeof globalThis !== 'undefined' &&
  !!(globalThis as any).__NEXUS_DEBUG_MESHOPT;

function markInstalled(loader: any) {
  loader.__nexusMeshoptInstalled = true;
  if (MESHOPT_DEBUG && !didLogAttach) {
    didLogAttach = true;
    console.log('[meshopt] attached decoder to GLTFLoader instance');
  }
}

export function configureGLTFLoader(loader: GLTFLoader) {
  const anyLoader = loader as any;
  if (anyLoader.__nexusMeshoptInstalled) return;

  if (anyLoader.setMeshoptDecoder && MeshoptDecoder) {
    anyLoader.setMeshoptDecoder(MeshoptDecoder as any);
    markInstalled(anyLoader);
  }
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;

  // drei/native caches loaders internally; register decoder there too.
  if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
    (useGLTF as any).setMeshoptDecoder(MeshoptDecoder as any);
  }
}

export function ensureMeshoptReady(): Promise<void> {
  installMeshoptDecoder();
  return Promise.resolve((MeshoptDecoder as any)?.ready)
    .then(() => {})
    .catch(() => {});
}

export function useGLTFMeshopt(url: any): any {
  installMeshoptDecoder();
  return useLoader(GLTFLoader as any, url, configureGLTFLoader as any);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  (useLoader as any).preload(GLTFLoader as any, url, configureGLTFLoader as any);

  if ((useGLTF as any)?.preload) {
    (useGLTF as any).preload(url, undefined, undefined, configureGLTFLoader);
  }
}

export function getGLTFLoader(manager?: ConstructorParameters<typeof GLTFLoader>[0]) {
  installMeshoptDecoder();
  const loader = new GLTFLoader(manager);
  configureGLTFLoader(loader);
  return loader;
}