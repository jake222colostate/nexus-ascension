import { useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three-stdlib';
import * as meshopt from 'meshoptimizer';

const decoder: any =
  (meshopt as any).MeshoptDecoder ??
  (meshopt as any).MeshoptDecoderModule ??
  (meshopt as any).default ??
  meshopt;

function applyMeshoptDecoder(loader: any) {
  try {
    loader?.setMeshoptDecoder?.(decoder);
  } catch {}
}

export function ensureMeshoptDecoder() {
  // Intentionally empty: we apply meshopt per-loader in useLoader so it always happens before parse.
}

export function useGLTFMeshopt(url: any) {
  return useLoader(GLTFLoader as any, url, (loader: any) => applyMeshoptDecoder(loader));
}

export function preloadGLTFMeshopt(url: any) {
  (useLoader as any).preload(GLTFLoader as any, url, (loader: any) => applyMeshoptDecoder(loader));
}
