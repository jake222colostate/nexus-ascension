import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useProgress, useTexture } from '@react-three/drei/native';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

function ext(url: string) {
  const q = url.split('?')[0];
  const m = q.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function PreloadOne(props: { url: string; onBvhDone: (url: string) => void }) {
  const e = ext(props.url);

  if (e === 'glb' || e === 'gltf') {
    const { scene } = useGLTF(props.url);

    useEffect(() => {
      if (!scene) return;

      try {
        scene.traverse((m: any) => {
          if (!m || !m.isMesh || !m.geometry) return;
          const g: any = m.geometry;
          if (!g.boundsTree) {
            g.boundsTree = new MeshBVH(g);
          }
        });
      } catch (err) {}

      props.onBvhDone(props.url);
    }, [scene, props]);

    return null;
  }

  if (e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'webp') {
    useTexture(props.url);
    return null;
  }

  return null;
}

function LootModel({ url, rotYRef }: { url: string; rotYRef: React.MutableRefObject<number> }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => scene.clone(true), [scene]);

  useFrame(() => {
    obj.rotation.y = rotYRef.current;
  });

  return <primitive object={obj} position={[0, -0.2, 0]} />;
}

function LootPreview(props: {
  lootUrl: string;
  preloadUrls: string[];
  rotYRef: React.MutableRefObject<number>;
  onBvhDone: (url: string) => void;
}) {
  const unique = useMemo(() => Array.from(new Set(props.preloadUrls.filter(Boolean))), [props.preloadUrls]);

  return (
    <Canvas
      style={styles.canvas}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        try { (gl as any).setClearColor?.('#0a0f18', 1); } catch (e) {}
      }}
      camera={{ position: [0, 1.2, 2.2], fov: 50 }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 2]} intensity={1.4} />
      <Suspense fallback={null}>
        {unique.map((u) => (
          <PreloadOne key={u} url={u} onBvhDone={props.onBvhDone} />
        ))}
        <group>
          <LootModel url={props.lootUrl} rotYRef={props.rotYRef} />
        </group>
      </Suspense>
    </Canvas>
  );
}

export default function FalloutLoaderOverlay(props: {
  lootUrl: string;
  preloadUrls: string[];
  onDone: () => void;
  title?: string;
  subtitle?: string;
}) {
  const rotYRef = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;

  const unique = useMemo(() => Array.from(new Set(props.preloadUrls.filter(Boolean))), [props.preloadUrls]);
  const glbUrls = useMemo(() => unique.filter((u) => {
    const e = ext(u);
    return e === 'glb' || e === 'gltf';
  }), [unique]);

  const doneSet = useRef<Set<string>>(new Set());
  const [bvhTick, setBvhTick] = useState(0);

  const onBvhDone = (url: string) => {
    const e = ext(url);
    if (e !== 'glb' && e !== 'gltf') return;
    if (doneSet.current.has(url)) return;
    doneSet.current.add(url);
    setBvhTick((n) => n + 1);
  };

  const bvhReady = glbUrls.length === 0 ? true : doneSet.current.size >= glbUrls.length;

  const { active, progress } = useProgress();
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  const doneOnce = useRef(false);

  useEffect(() => {
    if (doneOnce.current) return;
    if (!active && pct >= 100 && bvhReady) {
      doneOnce.current = true;
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
        props.onDone();
      });
    }
  }, [active, pct, bvhReady, opacity, props, bvhTick]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        rotYRef.current += (g.dx || 0) * 0.005;
      },
      onPanResponderRelease: () => {},
      onPanResponderTerminate: () => {},
    })
  ).current;

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <View style={styles.preview} {...pan.panHandlers}>
        <LootPreview lootUrl={props.lootUrl} preloadUrls={props.preloadUrls} rotYRef={rotYRef} onBvhDone={onBvhDone} />
      </View>

      <View pointerEvents="none" style={styles.hudTop}>
        <Text style={styles.title}>{props.title || 'Loading…'}</Text>
        <Text style={styles.sub}>{props.subtitle || 'Drag to rotate loot'}</Text>
      </View>

      <View pointerEvents="none" style={styles.hudBottom}>
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0a0f18' },
  preview: { flex: 1 },
  canvas: { flex: 1 },

  hudTop: { position: 'absolute', left: 0, right: 0, top: 0, paddingTop: 56, paddingHorizontal: 18 },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sub: { color: '#cfcfcf', marginTop: 6, fontSize: 12, fontWeight: '700' },

  hudBottom: { position: 'absolute', left: 18, right: 18, bottom: 34 },
  barOuter: { height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  barInner: { height: 12, backgroundColor: 'rgba(120,170,255,0.85)' },
  pct: { color: '#fff', marginTop: 10, textAlign: 'right', fontWeight: '900' },
});
