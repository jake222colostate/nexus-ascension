import { useGLTF } from '@react-three/drei/native';
import { useLoader } from '@react-three/fiber/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptGLTFLoaderV2 } from '../loading/MeshoptGLTFLoaderV2';

let readyPromise: Promise<void> | null = null;
let didInstall = false;
let meshoptReady = false;

export function isMeshoptSupported(): boolean {
  return !!MeshoptDecoder && (MeshoptDecoder as any).supported === true && typeof (MeshoptDecoder as any).ready?.then === 'function';
}

const meshoptReadyThenable = typeof (MeshoptDecoder as any)?.ready?.then === 'function';
console.log(`[meshopt] supported=${isMeshoptSupported()} readyThenable=${meshoptReadyThenable}`);

function getGLTFLoaderClass() {
  return isMeshoptSupported() ? MeshoptGLTFLoaderV2 : GLTFLoader;
}

function getReadyPromise(): Promise<void> {
  if (!isMeshoptSupported()) return Promise.resolve();
  if (!readyPromise) {
    readyPromise = Promise.resolve((MeshoptDecoder as any)?.ready)
      .then(() => {
        meshoptReady = true;
      })
      .catch(() => {});
  }
  return readyPromise;
}

export function configureGLTFLoader(loader: GLTFLoader) {
  const anyLoader = loader as any;
  if (anyLoader.__nexusMeshoptInstalled) return;
  if (isMeshoptSupported() && MeshoptDecoder && typeof anyLoader.setMeshoptDecoder === 'function') {
    anyLoader.setMeshoptDecoder(MeshoptDecoder as any);
    anyLoader.__nexusMeshoptInstalled = true;
  }
}

export function getGLTFLoader(manager?: ConstructorParameters<typeof GLTFLoader>[0]) {
  const LoaderClass = getGLTFLoaderClass();
  const loader = new LoaderClass(manager as any);
  configureGLTFLoader(loader as any);
  return loader as any;
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;

  if (isMeshoptSupported() && (useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
    (useGLTF as any).setMeshoptDecoder(MeshoptDecoder as any);
  }

  const ul: any = useLoader as any;
  if (typeof ul.clear === 'function') {
    ul.clear(GLTFLoader as any);
    ul.clear(MeshoptGLTFLoaderV2 as any);
  }
}

export function ensureMeshoptReady() {
  installMeshoptDecoder();
  return getReadyPromise();
}

export function useGLTFCompatible(url: any): any {
  installMeshoptDecoder();
  if (isMeshoptSupported() && !meshoptReady) {
    throw ensureMeshoptReady();
  }
  return useLoader(getGLTFLoaderClass() as any, url);
}

export function useGLTFMeshopt(url: any): any {
  return useGLTFCompatible(url);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  ensureMeshoptReady().then(() => {
    (useLoader as any).preload(getGLTFLoaderClass() as any, url);
  });
}
