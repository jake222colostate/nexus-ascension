import { GLTFLoader } from 'three-stdlib';
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
