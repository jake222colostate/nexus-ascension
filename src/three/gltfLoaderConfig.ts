import { useGLTF } from '@react-three/drei/native';
import { useLoader } from '@react-three/fiber/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptGLTFLoaderV2 } from '../loading/MeshoptGLTFLoaderV2';

let readyPromise: Promise<void> | null = null;
let didInstall = false;
let meshoptReady = false;

function getReadyPromise(): Promise<void> {
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
  if (MeshoptDecoder && typeof anyLoader.setMeshoptDecoder === 'function') {
    anyLoader.setMeshoptDecoder(MeshoptDecoder as any);
    anyLoader.__nexusMeshoptInstalled = true;
  }
}

export function getGLTFLoader(manager?: ConstructorParameters<typeof GLTFLoader>[0]) {
  const loader = new MeshoptGLTFLoaderV2(manager);
  configureGLTFLoader(loader as any);
  return loader as any;
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;

  if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
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

export function useGLTFMeshopt(url: any): any {
  installMeshoptDecoder();
  if (!meshoptReady) {
    throw ensureMeshoptReady();
  }
  return useLoader(MeshoptGLTFLoaderV2 as any, url);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  ensureMeshoptReady().then(() => {
    (useLoader as any).preload(MeshoptGLTFLoaderV2 as any, url);
    if ((useGLTF as any)?.preload) (useGLTF as any).preload(url);
  });
}