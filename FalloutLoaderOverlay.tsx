import React, { useEffect, useMemo, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useProgress } from '@react-three/drei/native';
import { preloadGLTFMeshopt } from './src/loading/meshoptSetup';

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

  // Kick off preloads (GLB/GLTF via meshopt-aware loader)
  useEffect(() => {
    for (const u of urls) {
      const e = ext(u);
      if (e === 'glb' || e === 'gltf') {
        try { preloadGLTFMeshopt(u as any); } catch {}
      }
    }
  }, [urls]);

  // drei progress tracks THREE.DefaultLoadingManager, which useLoader uses internally.
  const { progress, active, item, loaded, total, errors } = useProgress() as any;

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;

    // If nothing is actually queued, don't hang forever
    if (!active && total === 0 && urls.length > 0) {
      // still allow a moment for the queue to fill on first render
      const t = setTimeout(() => {
        if (!fired.current) {
          fired.current = true;
          props.onDone();
        }
      }, 600);
      return () => clearTimeout(t);
    }

    if (!active && total > 0 && loaded >= total && progress >= 99.5) {
      fired.current = true;
      props.onDone();
    }
  }, [active, progress, loaded, total, urls.length, props]);

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
