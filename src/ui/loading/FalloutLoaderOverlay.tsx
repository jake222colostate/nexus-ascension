import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Text, View, StyleSheet } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { Clone } from '@react-three/drei/native';
import { preloadGLTFMeshopt, useGLTFMeshopt } from '../../loading/meshoptSetup';

type AssetDescriptor = { id?: string; url: string; kind?: string };

type Props =
  | { assets: AssetDescriptor[]; onDone: () => void; title?: string; subtitle?: string }
  | { lootUrl: string; preloadUrls: string[]; onDone: () => void; title?: string; subtitle?: string };

const EXCLUDED_PREVIEW = ['mountain', 'skybox', 'monster', 'attack', 'walk', 'run'];

function ext(url?: string) {
  const s = String(url ?? '');
  const m = s.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return (m && m[1]) ? String(m[1]).toLowerCase() : '';
}

function PreviewModel({ uri, angle, zoom }: { uri: string; angle: number; zoom: number }) {
  const { scene, camera } = useThree();
  const gltf: any = useGLTFMeshopt(uri as any);
  const root = useMemo(() => {
    const src = gltf?.scene ?? gltf;
    return src ? src.clone(true) : null;
  }, [gltf]);

  useEffect(() => {
    if (!root) return;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const radius = Math.max(size.x, size.y, size.z, 1);
    camera.position.set(radius * (1.35 + zoom), radius * (0.35 + zoom * 0.4), radius * (1.35 + zoom));
    camera.lookAt(0, 0, 0);
    scene.background = new THREE.Color('#0a0f18');
  }, [root, camera, scene, zoom]);

  if (!root) return null;
  return <group rotation={[0, angle, 0]}><Clone object={root} /></group>;
}

export default function FalloutLoaderOverlay(props: Props) {
  const assets = useMemo(() => {
    const anyProps: any = props;
    if (Array.isArray(anyProps.assets)) return anyProps.assets;
    return [
      { id: 'loot', url: String(anyProps.lootUrl ?? '') },
      ...(anyProps.preloadUrls ?? []).map((u: string, i: number) => ({ id: `p_${i}`, url: String(u ?? '') })),
    ];
  }, [props]);

  const entryUrls = useMemo(
    () => assets.map((a: AssetDescriptor) => a.url).filter((u: string) => !!u && (ext(u) === 'glb' || ext(u) === 'gltf' || ext(u) === 'jpg' || ext(u) === 'jpeg' || ext(u) === 'png')),
    [assets],
  );

  const previewCandidates = useMemo(() => assets.filter((a: AssetDescriptor) => {
    const e = ext(a.url);
    if (!(e === 'glb' || e === 'gltf')) return false;
    const key = `${a.id ?? ''} ${a.url}`.toLowerCase();
    return !EXCLUDED_PREVIEW.some((x) => key.includes(x));
  }), [assets]);

  const preview = useMemo(() => {
    const list = previewCandidates.length ? previewCandidates : assets.filter((a: AssetDescriptor) => ['glb', 'gltf'].includes(ext(a.url)));
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }, [assets, previewCandidates]);

  const [readyCount, setReadyCount] = useState(0);
  const [zoom, setZoom] = useState(0.25);
  const [angle, setAngle] = useState(0);
  const [dragW, setDragW] = useState(280);
  const fired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let done = 0;
      for (const u of entryUrls) {
        try { if (ext(u) === 'glb' || ext(u) === 'gltf') preloadGLTFMeshopt(u as any); } catch {}
        done += 1;
        if (!cancelled) setReadyCount(done);
        await new Promise((r) => setTimeout(r, 90));
      }
      if (!cancelled && !fired.current) {
        fired.current = true;
        props.onDone();
      }
    })();
    return () => { cancelled = true; };
  }, [entryUrls, props]);

  const pct = entryUrls.length ? Math.min(100, Math.round((readyCount / entryUrls.length) * 100)) : 100;
  const lightSeed = useMemo(() => ({
    x: (Math.random() - 0.5) * 8,
    y: 4 + Math.random() * 6,
    z: (Math.random() - 0.5) * 8,
  }), []);

  return (
    <View style={S.root}>
      <Text style={S.title}>{(props as any).title ?? 'Loading world…'}</Text>
      <Text style={S.sub}>{(props as any).subtitle ?? 'Preparing first-frame assets…'}</Text>

      <View style={S.previewWrap}>
        {preview ? (
          <Canvas style={{ flex: 1 }} camera={{ fov: 50, position: [3, 1.5, 3] }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[lightSeed.x, lightSeed.y, lightSeed.z]} intensity={1.2} />
            <PreviewModel uri={preview.url} angle={angle} zoom={zoom} />
          </Canvas>
        ) : null}
      </View>

      <View style={S.slider} onLayout={(e) => setDragW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(e) => {
          const x = e.nativeEvent.locationX;
          const t = Math.max(0, Math.min(1, x / Math.max(1, dragW)));
          setZoom(t);
        }}
      >
        <View style={[S.knob, { left: `${zoom * 100}%` }]} />
      </View>
      <Text
        style={S.orbitHint}
        onPress={() => setAngle((v) => v + Math.PI / 8)}
      >Tap to orbit preview ↻</Text>

      <View style={S.barOuter}><View style={[S.barInner, { width: `${pct}%` }]} /></View>
      <Text style={S.pct}>{pct}%</Text>
    </View>
  );
}

const S = StyleSheet.create({
  root: { position: 'absolute', inset: 0, paddingTop: 90, paddingHorizontal: 18, backgroundColor: '#0a0f18' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: '#cfcfcf', marginTop: 8, fontSize: 12, fontWeight: '700' },
  previewWrap: { marginTop: 16, height: 220, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  slider: { marginTop: 12, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' },
  knob: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 99, backgroundColor: '#9cc3ff' },
  orbitHint: { color: '#cfd8ff', marginTop: 10, fontWeight: '700' },
  barOuter: { marginTop: 22, height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  barInner: { height: 12, backgroundColor: 'rgba(120,170,255,0.85)' },
  pct: { color: '#fff', marginTop: 10, textAlign: 'right', fontWeight: '900' },
});
