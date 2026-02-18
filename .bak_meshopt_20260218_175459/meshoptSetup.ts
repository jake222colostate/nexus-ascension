import { useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as meshopt from 'meshoptimizer';

const decoder: any =
  (meshopt as any).MeshoptDecoder ??
  (meshopt as any).MeshoptDecoderModule ??
  (meshopt as any).default ??
  meshopt;

function applyMeshopt(loader: any) {
  try {
    loader?.setMeshoptDecoder?.(decoder);
  } catch {}
}

// kept for compatibility with existing imports/calls
export function ensureMeshoptDecoder() {}

export function useGLTFMeshopt(url: any) {
  return useLoader(GLTFLoader as any, url, (loader: any) => applyMeshopt(loader));
}

export function preloadGLTFMeshopt(url: any) {
  (useLoader as any).preload(GLTFLoader as any, url, (loader: any) => applyMeshopt(loader));
}
