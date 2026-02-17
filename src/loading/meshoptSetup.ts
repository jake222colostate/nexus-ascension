import { useGLTF } from '@react-three/drei/native';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let configured = false;

export function ensureMeshoptDecoder() {
  if (configured) return;
  const anyUseGLTF = useGLTF as unknown as { setMeshoptDecoder?: (decoder: unknown) => void };
  anyUseGLTF.setMeshoptDecoder?.(MeshoptDecoder);
  configured = true;
}

ensureMeshoptDecoder();
