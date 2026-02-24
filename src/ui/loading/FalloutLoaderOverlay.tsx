import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Text, View, StyleSheet } from 'react-native';
import { useProgress } from '@react-three/drei/native';
import { preloadGLTFMeshopt, ensureMeshoptDecoder } from '../../loading/meshoptSetup';
import { MeshoptGLTFLoaderV2 } from '../../loading/MeshoptGLTFLoaderV2';

type AssetDescriptor = { url: string };

type Props =
  | {
      assets: AssetDescriptor[];
      onDone: () => void;
      title?: string;
      subtitle?: string;
    }
  | {
      lootUrl: string;
      preloadUrls: string[];
      onDone: () => void;
      title?: string;
      subtitle?: string;
    };


async function preloadAllAssets(urls: string[], opts?: { maxGlb?: number }) {
  ensureMeshoptDecoder();
  const manager = THREE.DefaultLoadingManager;
  const gltfLoader: any = new (MeshoptGLTFLoaderV2 as any)(manager);
  const texLoader: any = new (THREE as any).TextureLoader(manager);

  const maxGlb = Math.max(0, Math.min(10, Number(opts?.maxGlb ?? 3)));

  // 1) textures first (cheap)
  for (const u of urls) {
    const e = ext(u);
    if (e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'webp') {
      const t0 = Date.now();
      await texLoader.loadAsync(u);
      console.log('[LOADER] tex', u, (Date.now() - t0) + 'ms');
    }
  }

  // 2) GLBs sequential with a hard cap (prevents iOS OOM)
  let glbCount = 0;
  for (const u of urls) {
    const e = ext(u);
    if (e === 'glb' || e === 'gltf') {
      glbCount += 1;
      if (glbCount > maxGlb) break;
      const t0 = Date.now();
      await gltfLoader.loadAsync(u);
      console.log('[LOADER] gltf', u, (Date.now() - t0) + 'ms');
    }
  }
}

function ext(url?: string) {
  const s = String(url ?? '');
  const m = s.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return (m && m[1]) ? String(m[1]).toLowerCase() : '';
}

export default function FalloutLoaderOverlay(props: Props) {
  const urls = useMemo(() => {
    const anyProps: any = props as any;
    if (Array.isArray(anyProps.assets)) {
      return anyProps.assets.map((a: any) => String(a?.url ?? '')).filter(Boolean);
    }
    const list = [String(anyProps.lootUrl ?? ''), ...(anyProps.preloadUrls ?? [])]
      .map((u: any) => String(u ?? ''))
      .filter(Boolean);
    return list;
  }, [props]);

  // Kick off preloads (models + textures) and ONLY finish when they are actually loaded
  const [preloaded, setPreloaded] = useState(false);
  const [lastErr, setLastErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // keep the old request-only preloads too (harmless + helps cache paths)
        for (const u of urls) {
          const e = ext(u);
          if (e === 'glb' || e === 'gltf') {
            try { preloadGLTFMeshopt(u as any); } catch {}
          }
        }

        try {
          await preloadAllAssets(urls, { maxGlb: 3 });
        } catch (e: any) {
          const msg = String(e?.message ?? e ?? 'unknown error');
          try { console.log('[LOADER_ERR]', msg); } catch {}
            try { console.log('[LOADER_ERR_STACK]', String(e?.stack ?? '')); } catch {}
          if (!cancelled) setLastErr(msg);
        }
        if (!cancelled) setPreloaded(true);
      } catch {
        if (!cancelled) setPreloaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [urls]);

  // drei progress tracks THREE.DefaultLoadingManager, which useLoader uses internally.
  const { progress, active, item, loaded, total, errors } = useProgress() as any;

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    if (!preloaded) return;

    if (!active && (total === 0 || loaded >= total) && Number(progress || 0) >= 99) {
      fired.current = true;
      props.onDone();
    }
  }, [active, progress, loaded, total, preloaded, props]);
const pct = Math.max(0, Math.min(100, Math.round(Number(progress || 0))));
  const title = (props as any).title ?? 'Loading world…';
  const subtitle = (props as any).subtitle ?? (item ? String(item) : 'Fetching assets');

  return (
    <View style={S.root}>
      <Text style={S.title}>{title}</Text>
      <Text style={S.sub}>{subtitle}</Text>

      <View style={S.barOuter}>
        <View style={[S.barInner, { width: `${pct}%` }]} />
      </View>
      <Text style={S.pct}>{pct}%</Text>

      {!!errors && errors.length > 0 ? (
        <Text style={S.err}>Asset load error: {String(errors[0])}</Text>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingTop: 90, paddingHorizontal: 18, backgroundColor: '#0a0f18' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: '#cfcfcf', marginTop: 8, fontSize: 12, fontWeight: '700' },
  barOuter: { marginTop: 22, height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  barInner: { height: 12, backgroundColor: 'rgba(120,170,255,0.85)' },
  pct: { color: '#fff', marginTop: 10, textAlign: 'right', fontWeight: '900' },
  err: { marginTop: 14, color: '#ffb4b4', fontSize: 12, fontWeight: '800' },
});
