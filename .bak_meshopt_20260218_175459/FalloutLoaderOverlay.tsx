import React, { useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useProgress } from '@react-three/drei/native';
import { preloadGLTFMeshopt } from './src/loading/meshoptSetup';

type AssetDescriptor = { url: string };

type Props =
  | { assets: AssetDescriptor[]; onDone: () => void; title?: string; subtitle?: string }
  | { lootUrl: string; preloadUrls: string[]; onDone: () => void; title?: string; subtitle?: string };

export default function FalloutLoaderOverlay(props: Props) {
  const { active, progress, errors } = useProgress();
  const [kicked, setKicked] = useState(false);

  const urls = useMemo(() => {
    const p: any = props as any;
    if (Array.isArray(p.assets)) return p.assets.map((a: any) => String(a?.url || '').trim()).filter(Boolean);
    const list = [p.lootUrl, ...(Array.isArray(p.preloadUrls) ? p.preloadUrls : [])];
    return list.map((u: any) => String(u || '').trim()).filter(Boolean);
  }, [props]);

  useEffect(() => {
    if (kicked) return;
    setKicked(true);
    for (const u of urls) {
      const ext = (u.match(/\.([a-z0-9]+)(?:\?|#|$)/i)?.[1] || '').toLowerCase();
      if (ext === 'glb' || ext === 'gltf') {
        try { preloadGLTFMeshopt(u as any); } catch {}
      }
    }
  }, [kicked, urls]);

  useEffect(() => {
    if (!active && progress >= 99.9) {
      try { (props as any).onDone?.(); } catch {}
    }
  }, [active, progress, props]);

  const title = (props as any).title ?? 'Loading';
  const subtitle = (props as any).subtitle ?? 'Preparing assets…';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <Text style={styles.pct}>{Math.min(100, Math.max(0, progress)).toFixed(0)}%</Text>
      {errors?.length ? <Text style={styles.err}>Asset load error</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f18' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: '#cfcfcf', marginTop: 6, fontSize: 12, fontWeight: '700' },
  pct: { color: '#fff', marginTop: 14, fontSize: 14, fontWeight: '900' },
  err: { color: '#ffb3b3', marginTop: 10, fontSize: 12, fontWeight: '800' },
});
