import { useGLTF } from '@react-three/drei/native';
import { useLoader } from '@react-three/fiber/native';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptGLTFLoaderV2 } from '../loading/MeshoptGLTFLoaderV2';

let didInstall = false;
let readyPromise: Promise<void> | null = null;

function getReadyPromise(): Promise<void> {
  if (!readyPromise) {
    readyPromise = Promise.resolve((MeshoptDecoder as any)?.ready)
      .then(() => {})
      .catch(() => {});
  }
  return readyPromise;
}

function installDecoderOnLoader(loader: any) {
  if (!loader || !(loader as any).setMeshoptDecoder || !MeshoptDecoder) return;
  if ((loader as any).__nexusMeshoptInstalled) return;
  (loader as any).setMeshoptDecoder(MeshoptDecoder as any);
  (loader as any).__nexusMeshoptInstalled = true;
}

function patchGLTFLoaderPrototype() {
  const proto: any = GLTFLoader.prototype as any;
  if (proto.__nexusMeshoptPatched) return;
  proto.__nexusMeshoptPatched = true;

  const originalLoad = proto.load;
  proto.load = function patchedLoad(this: any, ...args: any[]) {
    installDecoderOnLoader(this);
    return originalLoad.apply(this, args);
  };

  const originalParse = proto.parse;
  proto.parse = function patchedParse(this: any, ...args: any[]) {
    installDecoderOnLoader(this);
    return originalParse.apply(this, args);
  };
}

export function installMeshoptDecoder() {
  if (didInstall) return;
  didInstall = true;

  patchGLTFLoaderPrototype();

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
  return useLoader(MeshoptGLTFLoaderV2 as any, url);
}

export function preloadGLTFMeshopt(url: any) {
  installMeshoptDecoder();
  getReadyPromise().then(() => {
    (useLoader as any).preload(MeshoptGLTFLoaderV2 as any, url);
  });
}
