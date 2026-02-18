import { useLoader } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { GLTFLoader } from 'three-stdlib';
import * as meshopt from 'meshoptimizer';

const MeshoptDecoder: any =
  (meshopt as any).MeshoptDecoder ??
  (meshopt as any).MeshoptDecoderModule ??
  (meshopt as any).default ??
  meshopt;

let didGlobal = false;

function applyMeshoptToLoader(loader: any) {
  try {
    if (!MeshoptDecoder) return;
    if (loader?.setMeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
  } catch {}
}

function applyGlobalOnce() {
  if (didGlobal) return;
  didGlobal = true;

  try {
    if ((useGLTF as any)?.setMeshoptDecoder && MeshoptDecoder) {
      (useGLTF as any).setMeshoptDecoder(MeshoptDecoder);
    }
  } catch {}
}

export function ensureMeshoptDecoder() {
  applyGlobalOnce();
}

export function useGLTFMeshopt(url: any): any {
  applyGlobalOnce();
  return useLoader(GLTFLoader as any, url, (loader: any) => {
    applyMeshoptToLoader(loader);
  });
}

export function preloadGLTFMeshopt(url: any) {
  applyGlobalOnce();
  (useLoader as any).preload(GLTFLoader as any, url, (loader: any) => {
    applyMeshoptToLoader(loader);
  });
}
