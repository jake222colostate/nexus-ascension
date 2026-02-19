import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';

export class MeshoptGLTFLoader extends GLTFLoader {
  constructor(manager?: any) {
    // @ts-ignore
    super(manager);
    if (MeshoptDecoder && (this as any).setMeshoptDecoder) {
      (this as any).setMeshoptDecoder(MeshoptDecoder as any);
    }
  }
}
