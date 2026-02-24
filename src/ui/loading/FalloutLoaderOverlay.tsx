import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Text, View, StyleSheet } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { Clone } from '@react-three/drei/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { preloadGLTFMeshopt, useGLTFMeshopt } from '../../loading/meshoptSetup';
import { reportWorldGate } from '../../loading/worldLoadState';

type AssetDescriptor = { id?: string; url: string; kind?: string };

const EXCLUDED_PREVIEW = ['mountain', 'skybox', 'monster', 'attack', 'walk', 'run'];

function ext(url?: string) {
  const s = String(url ?? '');
  const m = s.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return (m && m[1]) ? String(m[1]).toLowerCase() : '';
}

function PreviewModel({ uri, yaw, zoom }: { uri: string; yaw: number; zoom: number }) {
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

    const radius = Math.max(size.x, size.y, size.z, 1) * 0.5;
    const distance = Math.max(2.8, radius * (2.4 + zoom * 1.6));
    camera.position.set(distance * 0.7, distance * 0.38, distance);
    camera.near = 0.01;
    camera.far = Math.max(100, distance * 8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    scene.background = new THREE.Color('#0a0f18');
  }, [root, camera, scene, zoom]);

  if (!root) return null;
  return <group rotation={[0, yaw, 0]}><Clone object={root} /></group>;
}

type Props = {
  world?: 'fantasy' | 'skybase';
  assets: AssetDescriptor[];
  onDone: () => void;
  title?: string;
  subtitle?: string;
  phase?: string;
  progress?: number;
  playable?: boolean;
  error?: string;
};

export default function FalloutLoaderOverlay(props: Props) {
  const insets = useSafeAreaInsets();
  const entryUrls = useMemo(
    () => props.assets.map((a) => a.url).filter((u) => !!u && ['glb', 'gltf', 'jpg', 'jpeg', 'png'].includes(ext(u))),
    [props.assets],
  );

  const preview = useMemo(() => {
    const candidates = props.assets.filter((a) => {
      const e = ext(a.url);
      if (!(e === 'glb' || e === 'gltf')) return false;
      const key = `${a.id ?? ''} ${a.url}`.toLowerCase();
      return !EXCLUDED_PREVIEW.some((x) => key.includes(x));
    });
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [props.assets]);

  const [readyCount, setReadyCount] = useState(0);
  const [zoom, setZoom] = useState(0.35);
  const [yaw, setYaw] = useState(0);
  const fired = useRef(false);
  const gesture = useRef({ lookActive: false, lookTouch: -1, x: 0, pinchActive: false, pinchDist0: 0, zoom0: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let done = 0;
      for (const u of entryUrls) {
        try { if (ext(u) === 'glb' || ext(u) === 'gltf') preloadGLTFMeshopt(u as any); } catch {}
        done += 1;
        if (!cancelled) setReadyCount(done);
        await new Promise((r) => setTimeout(r, 16));
      }
      if (props.world) reportWorldGate(props.world, 'entry-assets', `queued=${done}`);
    })();
    return () => { cancelled = true; };
  }, [entryUrls, props.world]);

  useEffect(() => {
    if (!props.playable || fired.current) return;
    fired.current = true;
    props.onDone();
  }, [props.playable, props.onDone]);

  const pct = Math.max(0, Math.min(100, Math.round((props.progress ?? (readyCount / Math.max(1, entryUrls.length))) * 100)));
  const lightSeed = useMemo(() => ({ x: (Math.random() - 0.5) * 10, y: 5 + Math.random() * 7, z: (Math.random() - 0.5) * 10 }), []);

  return (
    <View
      style={S.root}
      pointerEvents="auto"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderMove={(e) => {
        const ts = e.nativeEvent.touches || [];
        if (ts.length >= 2) {
          const [a, b] = ts;
          const dx = (a.pageX ?? 0) - (b.pageX ?? 0);
          const dy = (a.pageY ?? 0) - (b.pageY ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (!gesture.current.pinchActive) {
            gesture.current.pinchActive = true;
            gesture.current.pinchDist0 = Math.max(1, dist);
            gesture.current.zoom0 = zoom;
          } else {
            const ratio = dist / Math.max(1, gesture.current.pinchDist0);
            setZoom(Math.max(0, Math.min(1, gesture.current.zoom0 - (ratio - 1) * 0.6)));
          }
          gesture.current.lookActive = false;
          return;
        }

        gesture.current.pinchActive = false;
        if (ts.length === 1) {
          const t = ts[0];
          const id = Number(t.identifier ?? -1);
          const x = t.pageX ?? 0;
          if (!gesture.current.lookActive || gesture.current.lookTouch !== id) {
            gesture.current.lookActive = true;
            gesture.current.lookTouch = id;
            gesture.current.x = x;
            return;
          }
          const dx = x - gesture.current.x;
          gesture.current.x = x;
          setYaw((v) => v - dx * 0.012);
        }
      }}
      onResponderRelease={() => { gesture.current.lookActive = false; gesture.current.pinchActive = false; }}
      onResponderTerminate={() => { gesture.current.lookActive = false; gesture.current.pinchActive = false; }}
    >
      {preview ? (
        <Canvas style={S.canvasFill} camera={{ fov: 50, position: [3, 1.5, 3] }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[lightSeed.x, lightSeed.y, lightSeed.z]} intensity={1.2} />
          <PreviewModel uri={preview.url} yaw={yaw} zoom={zoom} />
        </Canvas>
      ) : null}

      <View style={[S.bottom, { paddingBottom: Math.max(14, insets.bottom + 10) }]}>
        <Text style={S.title}>{props.title ?? 'Loading world…'}</Text>
        <Text style={S.sub}>{props.subtitle ?? 'Preparing first-frame assets…'}</Text>
        <Text style={S.sub}>Phase: {props.error ? 'error' : (props.phase ?? 'boot')}</Text>
        {props.error ? <Text style={S.err}>{props.error}</Text> : null}
        <View style={S.barOuter}><View style={[S.barInner, { width: `${pct}%` }]} /></View>
        <Text style={S.pct}>{pct}%</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { position: 'absolute', inset: 0, backgroundColor: '#0a0f18' },
  canvasFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bottom: { position: 'absolute', left: 14, right: 14, bottom: 0, paddingTop: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(10,15,24,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: '#cfcfcf', marginTop: 6, fontSize: 12, fontWeight: '700' },
  err: { color: '#ff8a8a', marginTop: 6, fontSize: 12, fontWeight: '700' },
  barOuter: { marginTop: 12, height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  barInner: { height: 12, backgroundColor: 'rgba(120,170,255,0.92)' },
  pct: { color: '#fff', marginTop: 8, textAlign: 'right', fontWeight: '900' },
});
