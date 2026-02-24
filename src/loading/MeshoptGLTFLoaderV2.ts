import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isMeshoptSupported } from '../three/gltfLoaderConfig';

export class MeshoptGLTFLoaderV2 extends GLTFLoader {
  constructor(manager?: ConstructorParameters<typeof GLTFLoader>[0]) {
    super(manager);
    const anyThis = this as any;
    if (!(globalThis as any).__NEXUS_MESHOPT_CTOR_LOGGED) {
      (globalThis as any).__NEXUS_MESHOPT_CTOR_LOGGED = true;
      console.log('[meshopt] MeshoptGLTFLoaderV2 ctor: MeshoptDecoder exists=', !!MeshoptDecoder, 'supported=', (MeshoptDecoder as any)?.supported, 'readyThenable=', !!(MeshoptDecoder as any)?.ready?.then);
    }

    if (isMeshoptSupported() && MeshoptDecoder && typeof anyThis.setMeshoptDecoder === 'function') {
      anyThis.setMeshoptDecoder(MeshoptDecoder as any);
      console.log('[meshopt] MeshoptGLTFLoaderV2 ctor: setMeshoptDecoder CALLED');
    }
    anyThis.__nexusMeshoptInstalled = true;
  }
}
