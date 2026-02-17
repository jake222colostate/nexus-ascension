import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useProgress, useTexture } from '@react-three/drei/native';
import { MeshBVH } from 'three-mesh-bvh';
import type { AssetDescriptor } from './src/assets/assetManifest';
import { ensureMeshoptDecoder } from './src/loading/meshoptSetup';

ensureMeshoptDecoder();

function ext(url: string) {
  const q = url.split('?')[0];
  const m = q.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isModel(url: string) {
  const e = ext(url);
  return e === 'glb' || e === 'gltf';
}

function PreloadOne({ url, onPrepared }: { url: string; onPrepared: (url: string) => void }) {
  if (isModel(url)) {
    const gltf: any = useGLTF(url);
    const scene: any = Array.isArray(gltf) ? gltf[0]?.scene : gltf?.scene;

    useEffect(() => {
      if (!scene) return;
      try {
        scene.traverse((m: any) => {
          if (!m?.isMesh || !m.geometry) return;
          const g: any = m.geometry;
          if (!g.boundsTree) g.boundsTree = new MeshBVH(g);
        });
      } catch {}
      onPrepared(url);
    }, [scene, onPrepared, url]);
    return null;
  }

  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext(url))) {
    const tex = useTexture(url);
    useEffect(() => {
      if (!tex) return;
      onPrepared(url);
    }, [onPrepared, tex, url]);
  }

  return null;
}

function PreviewModel({ url, rotY }: { url: string; rotY: React.MutableRefObject<number> }) {
  if (!isModel(url)) return null;
  const gltf: any = useGLTF(url);
  const scene: any = Array.isArray(gltf) ? gltf[0]?.scene : gltf?.scene;
  const clone = useMemo(() => scene?.clone?.(true), [scene]);

  useFrame(() => {
    if (clone) clone.rotation.y = rotY.current;
  });

  if (!clone) return null;
  return <primitive object={clone} position={[0, -0.15, 0]} scale={0.75} />;
}

function HeroPreview({ url }: { url: string }) {
  const rotY = useRef(0);
  useFrame((_, delta) => {
    rotY.current += delta * 0.55;
  });
  return <PreviewModel url={url} rotY={rotY} />;
}

function MiniAssetPreview({ asset }: { asset: AssetDescriptor }) {
  const rotY = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, g) => {
        rotY.current += (g.dx || 0) * 0.005;
      },
    })
  ).current;

  return (
    <View style={styles.carouselCard} {...pan.panHandlers}>
      <Text style={styles.carouselTitle}>{asset.label}</Text>
      <Canvas style={styles.carouselCanvas} camera={{ position: [0, 1, 2], fov: 52 }}>
        <ambientLight intensity={1.0} />
        <directionalLight position={[2, 4, 2]} intensity={1.25} />
        <Suspense fallback={null}>
          {isModel(asset.url) ? <PreviewModel url={asset.url} rotY={rotY} /> : null}
        </Suspense>
      </Canvas>
      <Text style={styles.carouselMeta}>{asset.kind.toUpperCase()}</Text>
    </View>
  );
}

export default function FalloutLoaderOverlay(props: {
  assets: AssetDescriptor[];
  onDone: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { width } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(1)).current;

  const uniqueAssets = useMemo(
    () => props.assets.filter((a, i, arr) => arr.findIndex((b) => b.url === a.url) === i),
    [props.assets]
  );

  const allUrls = useMemo(() => uniqueAssets.map((a) => a.url).filter(Boolean), [uniqueAssets]);
  const modelUrls = useMemo(() => allUrls.filter((u) => isModel(u)), [allUrls]);

  const preparedRef = useRef(new Set<string>());
  const [preparedTick, setPreparedTick] = useState(0);
  const [interactiveReady, setInteractiveReady] = useState(false);

  const onPrepared = (url: string) => {
    if (preparedRef.current.has(url)) return;
    preparedRef.current.add(url);
    setPreparedTick((n) => n + 1);
  };

  const preparedRatio = allUrls.length ? preparedRef.current.size / allUrls.length : 1;
  const bvhRatio = modelUrls.length
    ? modelUrls.filter((url) => preparedRef.current.has(url)).length / modelUrls.length
    : 1;

  const { active, progress, loaded, total } = useProgress();
  const loadingRatio = Math.max(0, Math.min(1, progress / 100));

  useEffect(() => {
    if (!active && loadingRatio >= 0.995 && preparedRatio >= 0.995) {
      const id = setTimeout(() => setInteractiveReady(true), 180);
      return () => clearTimeout(id);
    }
  }, [active, loadingRatio, preparedRatio]);

  const unifiedProgress =
    loadingRatio * 0.7 +
    bvhRatio * 0.2 +
    (interactiveReady ? 1 : Math.min(0.95, (loadingRatio + preparedRatio) / 2)) * 0.1;

  const pct = Math.round(unifiedProgress * 100);

  useEffect(() => {
    if (unifiedProgress < 0.999) return;
    Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
      props.onDone();
    });
  }, [opacity, props, unifiedProgress]);

  const status = unifiedProgress < 0.7
    ? 'Streaming and parsing assets…'
    : unifiedProgress < 0.9
      ? 'Building collisions and scene data…'
      : 'Finalizing world handshake…';

  return (
    <Animated.View style={[styles.root, { opacity }]}>
      <View style={styles.gradientOrbA} />
      <View style={styles.gradientOrbB} />

      <Canvas style={styles.heroCanvas} camera={{ position: [0, 1.4, 2.4], fov: 46 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 2]} intensity={1.4} />
        <Suspense fallback={null}>
          {allUrls.map((url) => (
            <PreloadOne key={url} url={url} onPrepared={onPrepared} />
          ))}
          {uniqueAssets[0] ? <HeroPreview url={uniqueAssets[0].url} /> : null}
        </Suspense>
      </Canvas>

      <View style={styles.topHud}>
        <Text style={styles.title}>{props.title ?? 'Calibrating Rift Gate'}</Text>
        <Text style={styles.subtitle}>{props.subtitle ?? status}</Text>
      </View>

      <View style={styles.carouselWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={uniqueAssets.slice(0, 8)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MiniAssetPreview asset={item} />}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        />
      </View>

      <View style={[styles.bottomHud, { width: width - 30 }]}> 
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.percent}>{pct}%</Text>
        <Text style={styles.meta}>items {loaded}/{total || allUrls.length} • prepared {preparedRef.current.size}/{allUrls.length}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#060911' },
  heroCanvas: { flex: 1 },
  gradientOrbA: {
    position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 200,
    backgroundColor: 'rgba(74,121,255,0.22)',
  },
  gradientOrbB: {
    position: 'absolute', bottom: 130, left: -70, width: 260, height: 260, borderRadius: 220,
    backgroundColor: 'rgba(149,75,255,0.18)',
  },
  topHud: { position: 'absolute', left: 16, right: 16, top: 60 },
  title: { color: '#F3F6FF', fontSize: 24, fontWeight: '900', letterSpacing: 0.4 },
  subtitle: { color: '#AFC0EA', marginTop: 6, fontSize: 13, fontWeight: '700' },
  carouselWrap: { position: 'absolute', left: 0, right: 0, bottom: 130, height: 170 },
  carouselCard: {
    width: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,177,255,0.4)',
    backgroundColor: 'rgba(15,21,37,0.9)',
    overflow: 'hidden',
    padding: 8,
  },
  carouselCanvas: { height: 100, borderRadius: 10, backgroundColor: '#0A1120' },
  carouselTitle: { color: '#E3EBFF', fontWeight: '800', fontSize: 12, marginBottom: 4 },
  carouselMeta: { color: '#8EA7DA', marginTop: 6, fontWeight: '700', fontSize: 10 },
  bottomHud: { position: 'absolute', left: 15, bottom: 34 },
  barOuter: {
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(128,163,255,0.45)',
  },
  barInner: { height: '100%', backgroundColor: '#68B3FF' },
  percent: { color: '#E9F2FF', marginTop: 8, textAlign: 'right', fontWeight: '900', fontSize: 16 },
  meta: { color: '#95A9D8', marginTop: 2, textAlign: 'right', fontWeight: '700', fontSize: 11 },
});
