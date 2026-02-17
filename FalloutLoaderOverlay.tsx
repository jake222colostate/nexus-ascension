import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, StyleSheet } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useProgress, useTexture } from '@react-three/drei/native';
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

function ext(url?: string) {
  const s = String(url ?? "");
  const m = s.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return (m && m[1]) ? String(m[1]).toLowerCase() : "";
}

function PreloadOne(props: { url?: string; onBvhDone: (url: string) => void }) {
  const url = (typeof (props as any)?.url === 'string') ? String((props as any).url).trim() : '';
  if (!url) return null;

  const e = ext(url);

  // Preload GLB/GLTF using drei's RN-safe path
  if (e === 'glb' || e === 'gltf') {
    const gltf: any = useGLTF(
      url as any,
      undefined,
      true,
      (loader: any) => {
        try {
          if (loader?.setMeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
        } catch {}
      }
    );

    const scene: any = Array.isArray(gltf) ? gltf[0]?.scene : gltf?.scene;

    useEffect(() => {
      if (!scene) return;

      // Build BVH on geometries (safe even if some meshes don't support it)
      try {
        scene.traverse((m: any) => {
          if (!m || !m.isMesh || !m.geometry) return;
          const g: any = m.geometry
          try {
            if (!g.boundsTree) g.boundsTree = new MeshBVH(g);
          } catch {}
        });
      } catch {}

      try { props.onBvhDone(url); } catch {}
    }, [scene, url, props.onBvhDone]);

    return null;
  }

  // Preload textures via drei
  if (e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'webp') {
    useTexture(url as any);
    return null;
  }

  return null;
}

function LootModel({ url, rotYRef }: { url: string; rotYRef: React.MutableRefObject<number> }) {
  if (!url || String(url).includes("DISABLED_spawn_gazebo.glb")) return null;
  const gltf: any = useGLTF(
    url,
    undefined,
    true,
    (loader: any) => {
      try {
        if (loader?.setMeshoptDecoder) loader.setMeshoptDecoder(MeshoptDecoder);
      } catch {}
    }
  );
  const scene: any = Array.isArray(gltf) ? gltf[0]?.scene : gltf?.scene;
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
  const unique = useMemo<string[]>(() => Array.from(new Set((props.preloadUrls || []).filter(Boolean).map(String))), [props.preloadUrls]);

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
          <PreloadOne key={String(u)} url={String(u)} onBvhDone={props.onBvhDone} />
        ))}
        <group>
          <LootModel url={props.lootUrl} rotYRef={props.rotYRef} />
        </group>
      </Suspense>
    </Canvas>
  );
}

export default function FalloutLoaderOverlay(props: {
  assets?: any[];
  lootUrl?: string;
  preloadUrls?: string[];
  onDone: () => void;
  title?: string;
  subtitle?: string;
}) {

  const rotYRef = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;

  // Support both the new `assets` prop and legacy `preloadUrls`/`lootUrl`
  const derivedPreloadUrls = useMemo<string[]>(() => {
    const a: any[] = Array.isArray((props as any).assets) ? (props as any).assets : [];
    if (a.length > 0) {
      return a.map((x) => (typeof x?.url === 'string' ? String(x.url).trim() : '')).filter((u): u is string => u.length > 0);
    }
    const legacy = Array.isArray(props.preloadUrls) ? props.preloadUrls : [];
    return legacy.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => String(u).trim());
  }, [(props as any).assets, props.preloadUrls]);

  const derivedLootUrl = useMemo<string>(() => {
    if (typeof props.lootUrl === 'string' && props.lootUrl.trim().length > 0) return props.lootUrl.trim();
    const a: any[] = Array.isArray((props as any).assets) ? (props as any).assets : [];
    const first = a.find((x) => typeof x?.url === 'string' && String(x.url).trim().length > 0);
    return first ? String(first.url).trim() : '';
  }, [props.lootUrl, (props as any).assets]);

  const unique = useMemo<string[]>(
    () => Array.from(new Set(derivedPreloadUrls.filter(Boolean).map((u) => String(u).trim()))),
    [derivedPreloadUrls]
  );

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
        <LootPreview lootUrl={derivedLootUrl} preloadUrls={derivedPreloadUrls} rotYRef={rotYRef} onBvhDone={onBvhDone} />
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

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useLoader } from "@react-three/fiber";

try {
  (useGLTF as any).setMeshoptDecoder?.(MeshoptDecoder);
} catch {}

