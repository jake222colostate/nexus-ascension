import { useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three-stdlib';
import * as meshopt from 'meshoptimizer';

const decoder: any =
  (meshopt as any).MeshoptDecoder ??
  (meshopt as any).MeshoptDecoderModule ??
  (meshopt as any).default ??
  meshopt;

const __dataImageRe = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+/g;

const __dataToBlobUrl = new Map<string, string>();
const __pendingPrecache = new Map<string, Promise<void>>();
let __urlmodSet = false;

function __mimeFromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return 'image/png';
  const meta = dataUrl.slice(5, comma);
  return meta.split(';')[0] || 'image/png';
}

function __b64FromDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return '';
  return dataUrl.slice(comma + 1).replace(/\r|\n/g, '');
}

function __abToString(u8: Uint8Array): string {
  try {
    const TD: any = (global as any).TextDecoder;
    if (TD) return new TD('utf-8').decode(u8);
  } catch {}
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}

function __b64ToU8(b64: string): Uint8Array {
  const atobFn: any = (global as any).atob || (typeof atob !== 'undefined' ? atob : null);
  if (!atobFn) throw new Error('atob missing');
  const bin = atobFn(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function __makeBlobUrl(dataUrl: string): string | null {
  try {
    if (!dataUrl.startsWith('data:image/') || !dataUrl.includes(';base64,')) return null;
    const cached = __dataToBlobUrl.get(dataUrl);
    if (cached) return cached;

    const mime = __mimeFromDataUrl(dataUrl);
    const b64 = __b64FromDataUrl(dataUrl);
    if (!b64) return null;

    const bytes = __b64ToU8(b64);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const blob = new Blob([ab as any], { type: mime });
    const url = URL.createObjectURL(blob);
    __dataToBlobUrl.set(dataUrl, url);
    return url;
  } catch {
    return null;
  }
}

async function __precacheDataImagesFromGlb(url: string): Promise<void> {
  if (__pendingPrecache.has(url)) return __pendingPrecache.get(url)!;

  const p = (async () => {
    try {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      const u8 = new Uint8Array(ab);

      if (u8.length < 24) return;
      const dv = new DataView(ab);
      const magic = dv.getUint32(0, true);
      if (magic !== 0x46546c67) return;

      let off = 12;
      while (off + 8 <= u8.length) {
        const chunkLen = dv.getUint32(off, true);
        const chunkType = dv.getUint32(off + 4, true);
        off += 8;
        if (off + chunkLen > u8.length) break;

        if (chunkType === 0x4e4f534a) {
          const json = __abToString(u8.subarray(off, off + chunkLen));
          const matches = json.match(__dataImageRe);
          if (matches && matches.length) {
            for (const m of matches) __makeBlobUrl(m);
          }
          break;
        }
        off += chunkLen;
      }
    } catch {}
  })();

  __pendingPrecache.set(url, p);
  await p;
}

function __applyMeshoptAndUrls(loader: any) {
  try {
    loader?.setMeshoptDecoder?.(decoder);
  } catch {}

  if (!__urlmodSet && loader?.manager?.setURLModifier) {
    __urlmodSet = true;
    loader.manager.setURLModifier((url: any) => {
      try {
        const s = typeof url === 'string' ? url : String(url);
        if (s.startsWith('data:image/') && s.includes(';base64,')) {
          const blobUrl = __makeBlobUrl(s);
          return blobUrl || s;
        }
        return url;
      } catch {
        return url;
      }
    });
  }

  try {
    const proto = (loader as any)?.__proto__ || Object.getPrototypeOf(loader);
    if (proto && !proto.__na_patched_for_textures) {
      proto.__na_patched_for_textures = true;

      const origLoad = proto.load;
      proto.load = function (url: any, onLoad: any, onProgress: any, onError: any) {
        const u = typeof url === 'string' ? url : String(url);
        __precacheDataImagesFromGlb(u)
          .then(() => origLoad.call(this, url, onLoad, onProgress, onError))
          .catch(() => origLoad.call(this, url, onLoad, onProgress, onError));
      };

      const origLoadAsync = proto.loadAsync;
      if (typeof origLoadAsync === 'function') {
        proto.loadAsync = async function (url: any, onProgress: any) {
          const u = typeof url === 'string' ? url : String(url);
          try { await __precacheDataImagesFromGlb(u); } catch {}
          return origLoadAsync.call(this, url, onProgress);
        };
      }
    }
  } catch {}
}

export function ensureMeshoptDecoder() {}

export function useGLTFMeshopt(url: any) {
  return useLoader(GLTFLoader as any, url, (loader: any) => __applyMeshoptAndUrls(loader));
}

export function preloadGLTFMeshopt(url: any) {
  (useLoader as any).preload(GLTFLoader as any, url, (loader: any) => __applyMeshoptAndUrls(loader));
}
