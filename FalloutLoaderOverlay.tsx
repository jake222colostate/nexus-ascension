import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import {Canvas, useFrame, useLoader} from '@react-three/fiber/native';
import { useGLTF, useProgress, useTexture } from '@react-three/drei/native';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';

try { (useGLTF as any).setMeshoptDecoder?.(MeshoptDecoder as any); } catch (e) {}

function _patchLoaderProto(L: any) {
  try {
    const P: any = L?.prototype;
    if (!P || P.__meshopt_patched_any) return;
    const _load = P.load;
    const _loadAsync = P.loadAsync;
    if (typeof _load === 'function') {
      P.load = function(url: any, onLoad: any, onProgress: any, onError: any) {
        try { this.setMeshoptDecoder?.(MeshoptDecoder as any); } catch (e) {}
        return _load.call(this, url, onLoad, onProgress, onError);
      };
    }
    if (typeof _loadAsync === 'function') {
      P.loadAsync = function(url: any, onProgress: any) {
        try { this.setMeshoptDecoder?.(MeshoptDecoder as any); } catch (e) {}
        return _loadAsync.call(this, url, onProgress);
      };
    }
    P.__meshopt_patched_any = true;
  } catch (e) {}
}

function _tryPatchModule(mod: any) {
  try {
    _patchLoaderProto(mod?.GLTFLoader);
    _patchLoaderProto(mod?.default);
  } catch (e) {}
}

try { _tryPatchModule(require('three/examples/jsm/loaders/GLTFLoader.js')); } catch (e) {}
try { _tryPatchModule(require('three/examples/jsm/loaders/GLTFLoader')); } catch (e) {}
try { (GLTFLoader as any).setMeshoptDecoder?.(MeshoptDecoder); } catch (e) {}

function ext(url: string) {
  const q = (url || '').split('?')[0];
  const m = q.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isTex(url: string) {
  const e = ext(url);
  return e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'webp';
}

function isGltf(url: string) {
  const e = ext(url);
  return e === 'glb' || e === 'gltf';
}

function preloadUrl(url: string) {
  if (!url) return;
  try {
    if (isGltf(url)) {
      (useGLTF as any).preload?.(
        url as any,
        undefined as any,
        true as any,
        (loader: any) => {
          try { loader.setMeshoptDecoder?.(MeshoptDecoder as any); } catch (e) {}
        }
      );
      return;
    }
    if (isTex(url)) {
      (useTexture as any).preload?.(url as any);
      return;
    }
  } catch (e) {}
}

function Model({ url, rotYRef }: { url: string; rotYRef: React.MutableRefObject<number> }) {
  const gltf = (useGLTF as any)(
    url as any,
    undefined as any,
    true as any,
    (loader: any) => {
      try { loader.setMeshoptDecoder?.(MeshoptDecoder as any); } catch (e) {}
    }
  ) as any;

  const scene = gltf?.scene as any;

  const obj = useMemo(() => {
    try {
      return scene?.clone?.(true) ?? scene;
    } catch (e) {
      return scene;
    }
  }, [scene]);

  useFrame(() => {
    if (obj) obj.rotation.y = rotYRef.current;
  });

  if (!obj) return null;
  return <primitive object={obj} position={[0, -0.2, 0]} />;
}

function PreviewCanvas({ modelUrl, preloadUrls, rotYRef }: { modelUrl: string; preloadUrls: string[]; rotYRef: React.MutableRefObject<number> }) {
  const unique = useMemo(() => Array.from(new Set((preloadUrls || []).filter(Boolean))), [preloadUrls]);

  useEffect(() => {
    for (const u of unique) preloadUrl(u);
  }, [unique]);

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
        <group>
          <Model url={modelUrl} rotYRef={rotYRef} />
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
}) {
  const rotYRef = useRef(0);
  const [dragX] = useState(() => new Animated.Value(0));
  const { active, loaded, total } = useProgress();

  const allUrls = useMemo(() => {
    const list = [props.lootUrl, ...(props.preloadUrls || [])].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [props.lootUrl, props.preloadUrls]);

  useEffect(() => {
    for (const u of allUrls) preloadUrl(u);
  }, [allUrls]);

  const pct = useMemo(() => {
    if (!total || total <= 0) return 0;
    const v = Math.round((loaded / total) * 100);
    return Math.max(0, Math.min(100, v));
  }, [loaded, total]);

  const doneCalled = useRef(false);
  useEffect(() => {
    if (doneCalled.current) return;

    if (total > 0 && !active && loaded >= total) {
      doneCalled.current = true;
      try { props.onDone(); } catch (e) {}
      return;
    }

    const t = setTimeout(() => {
      if (doneCalled.current) return;
      if (total > 0 && loaded >= total) {
        doneCalled.current = true;
        try { props.onDone(); } catch (e) {}
      }
    }, 15000);

    return () => clearTimeout(t);
  }, [active, loaded, total, props]);

  const pan = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gs) => {
        const dx = gs.dx || 0;
        dragX.setValue(dx);
        rotYRef.current = dx * 0.01;
      },
      onPanResponderRelease: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
    });
  }, [dragX]);

  return (
    <View style={styles.root}>
      <View style={styles.bg} />
      <View style={styles.previewWrap} {...pan.panHandlers}>
        <PreviewCanvas modelUrl={props.lootUrl} preloadUrls={allUrls} rotYRef={rotYRef} />
      </View>

      <View style={styles.overlay}>
        <Text style={styles.title}>{props.title || 'Loading Fantasy World'}</Text>
        <Text style={styles.sub}>Drag to see Model</Text>

        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: `${pct}%` }]} />
        </View>

        <Text style={styles.pct}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0f18',
  },
  previewWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 42,
    paddingHorizontal: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  sub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginBottom: 14,
  },
  barOuter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  barInner: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pct: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
});
