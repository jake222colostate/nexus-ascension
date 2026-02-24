export {
  ensureMeshoptReady,
  installMeshoptDecoder,
  preloadGLTFMeshopt,
  useGLTFMeshopt,
} from '../three/gltfLoaderConfig';

// Backward-compatible alias while we migrate callsites.
export { installMeshoptDecoder as ensureMeshoptDecoder } from '../three/gltfLoaderConfig';
