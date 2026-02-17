import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { StyleSheet, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

const ZOOM_MIN = 16;
const ZOOM_MAX = 90;

const SKYBOX_URL = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/skybase_stage1_skybox.jpeg';

function SkyboxAndFog() {
  const { scene } = useThree();
  const tex: any = useTexture(SKYBOX_URL);

  useEffect(() => {
    if (!tex) return;
    try {
      if ("colorSpace" in tex && (THREE as any).SRGBColorSpace) tex.colorSpace = (THREE as any).SRGBColorSpace;
      else if ((THREE as any).sRGBEncoding) tex.encoding = (THREE as any).sRGBEncoding;
    } catch {}

    try { tex.mapping = (THREE as any).EquirectangularReflectionMapping; } catch {}

    scene.background = tex;
    scene.environment = tex;

    return () => {
      try {
        if (scene.background === tex) scene.background = null as any;
        if (scene.environment === tex) scene.environment = null as any;
      } catch {}
    };
  }, [tex, scene]);

  return null;
}


function Scene({
  targetY,
  yawRef,
  pitchRef,
  radiusRef,
}: {
  targetY: number;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  radiusRef: React.MutableRefObject<number>;
}) {
  useFrame(({ camera }) => {
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const r = radiusRef.current;

    const cy = Math.cos(pitch);
    const sy = Math.sin(pitch);

    const x = Math.sin(yaw) * r * cy;
    const z = Math.cos(yaw) * r * cy;
    const y = targetY + 2.2 + sy * r * 0.55;

    camera.position.set(x, y, z);
    camera.lookAt(0, targetY + 1.0, 0);
  });

  const ground = useMemo(() => new THREE.CylinderGeometry(22, 22, 0.6, 48, 1, false), []);
  const core = useMemo(() => new THREE.CylinderGeometry(0.7, 0.95, 6.0, 18, 1, false), []);
  const ring = useMemo(() => new THREE.CylinderGeometry(15.5, 16.2, 0.55, 32, 1, false), []);
  const pillar = useMemo(() => new THREE.CylinderGeometry(0.26, 0.26, 2.4, 12, 1, false), []);
  const pad = useMemo(() => new THREE.CylinderGeometry(2.2, 2.8, 0.35, 22, 1, false), []);

  const matMetal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6B7A93', metalness: 0.7, roughness: 0.35 }), []);
  const matDark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1A2233', metalness: 0.25, roughness: 0.9 }), []);
  const matGlow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2ED6FF', emissive: '#2ED6FF', emissiveIntensity: 0.7, metalness: 0.1, roughness: 0.6 }), []);

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#9fb7ff", "#06080f", 0.9]} />
      <directionalLight position={[12, 18, 8]} intensity={1.15} />
      <directionalLight position={[-10, 6, -14]} intensity={0.35} />
      <fog attach="fog" args={['#0a0f18', 20, 140]} />

      <mesh geometry={ground} material={matDark} position={[0, targetY - 0.5, 0]} />

      <mesh geometry={core} material={matMetal} position={[0, targetY + 3.0, 0]} />
      <mesh geometry={pad} material={matGlow} position={[0, targetY + 0.18, 0]} />

      <mesh geometry={ring} material={matDark} position={[0, targetY + 0.25, 0]} />

      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const rr = 15.9;
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        return (
          <mesh key={i} geometry={pillar} material={matMetal} position={[x, targetY + 1.45, z]} />
        );
      })}
    </>
  );
}

export default function SkybaseWorld3D(props: { layer: number; layerHeight: number }) {
  const yawRef = useRef(0);
  const pitchRef = useRef(-0.18);
  const radiusRef = useRef(34.0);

  const lookTouch = useRef<number | null>(null);
  const lookState = useRef({ active: false, x: 0, y: 0 });

  const pinchRef = useRef<{ active: boolean; dist0: number; r0: number }>({ active: false, dist0: 0, r0: 0 });

  const targetY = props.layerHeight ?? 0;

  const handleTouches = (touches: any[]) => {
    const ts = touches || [];

    // 2 fingers: pinch zoom ONLY (radius). Works at any yaw/pitch because camera orbits in useFrame.
    if (ts.length >= 2) {
      const a = ts[0], b = ts[1];
      const ax = a.pageX ?? a.locationX ?? 0;
      const ay = a.pageY ?? a.locationY ?? 0;
      const bx = b.pageX ?? b.locationX ?? 0;
      const by = b.pageY ?? b.locationY ?? 0;

      const dx = ax - bx;
      const dy = ay - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!pinchRef.current.active) {
        pinchRef.current.active = true;
        pinchRef.current.dist0 = Math.max(1, dist);
        pinchRef.current.r0 = radiusRef.current;
      } else {
        const ratio = dist / Math.max(1, pinchRef.current.dist0);
        const target = pinchRef.current.r0 / Math.max(0.25, ratio); // pinch out => zoom in
        radiusRef.current = clamp(target, ZOOM_MIN, ZOOM_MAX);
      }

      lookTouch.current = null;
      lookState.current.active = false;
      return;
    }

    pinchRef.current.active = false;

    // 1 finger: rotate ONLY (yaw/pitch). NO zoom.
    if (ts.length === 1) {
      const t = ts[0];
      const id = t.identifier as number;
      const x = t.pageX ?? t.locationX ?? 0;
      const y = t.pageY ?? t.locationY ?? 0;

      if (!lookState.current.active || lookTouch.current !== id) {
        lookTouch.current = id;
        lookState.current.active = true;
        lookState.current.x = x;
        lookState.current.y = y;
        return;
      }

      const ddx = x - lookState.current.x;
      const ddy = y - lookState.current.y;
      lookState.current.x = x;
      lookState.current.y = y;

      yawRef.current -= ddx * 0.0065;
      pitchRef.current = clamp(pitchRef.current + ddy * 0.0030, -0.32, 0.75);
      return;
    }

    lookTouch.current = null;
    lookState.current.active = false;
  };

  const releaseTouches = (chs: any[]) => {
    const changed = chs || [];
    for (const t of changed) {
      const id = t.identifier as number;
      if (id === lookTouch.current) {
        lookTouch.current = null;
        lookState.current.active = false;
      }
    }
  };

  return (
    <View
      style={styles.root}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleTouches(e.nativeEvent.touches)}
      onResponderMove={(e) => handleTouches(e.nativeEvent.touches)}
      onResponderRelease={(e) => releaseTouches(e.nativeEvent.changedTouches)}
      onResponderTerminate={(e) => releaseTouches(e.nativeEvent.changedTouches)}
    >
      <Canvas
          dpr={1}
        style={styles.canvas}
        gl={{ antialias: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => { try { (gl as any).setClearColor?.('#0a0f18', 1); } catch (e) {} }}
        camera={{ position: [0, 6, 18], fov: 60 }}
      >
        <Suspense fallback={null}>
            <SkyboxAndFog />
            <Scene targetY={targetY} yawRef={yawRef} pitchRef={pitchRef} radiusRef={radiusRef} />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f18' },
  canvas: { flex: 1 },
});
