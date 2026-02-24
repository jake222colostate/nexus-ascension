import { useGLTFMeshopt, preloadGLTFMeshopt } from "../../../loading/meshoptSetup";
import React, {useEffect, useMemo, useRef, useState, Suspense, useCallback} from 'react';
import { getBestAssetUri } from '../../../assets/worldUris';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { View, StyleSheet, useWindowDimensions} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useProgress, Clone, useAnimations, useTexture } from '@react-three/drei/native';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { markWorldPlayable, reportWorldGate, setWorldError, setWorldPhase } from '../../../loading/worldLoadState';


let __fireballTex: any = null;

function makeFireballTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const cx = (size - 1) * 0.5;
  const cy = (size - 1) * 0.5;
  const rMax = size * 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy) / rMax;
      const t = Math.max(0, 1 - r);

      const core = Math.pow(t, 2.2);
      const glow = Math.pow(t, 1.2);

      const rr = Math.min(255, (40 + 215 * glow) | 0);
      const gg = Math.min(255, (15 + 140 * core) | 0);
      const bb = Math.min(255, (10 + 60 * core) | 0);
      const aa = Math.min(255, (255 * Math.pow(t, 1.8)) | 0);

      const idx = (y * size + x) * 4;
      data[idx + 0] = rr;
      data[idx + 1] = gg;
      data[idx + 2] = bb;
      data[idx + 3] = aa;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function getFireballTexture() {
  if (__fireballTex) return __fireballTex;
  __fireballTex = makeFireballTexture(64);
  return __fireballTex;
}


type FantasyWorld3DProps = {
  shootPulse: number;
  bulletDmgEnemy: number;
  bulletDmgBoss: number;
  onPodium?: () => void | Promise<void>;
  onMonument?: () => void;
  onEnemyKilled?: (kind: "enemy" | "boss") => void;
};

// === BVH PATCH (must run once, same THREE instance as R3F) ===
(THREE.BufferGeometry as any).prototype.computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry as any).prototype.disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh as any).prototype.raycast = acceleratedRaycast;



const __bvhGeomSeen: any = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

function ensureBVHForObject(obj: any) {
  if (!obj || typeof obj.traverse !== 'function') return () => {};
  let cancelled = false;
  const meshes: any[] = [];
  try {
    obj.traverse((m: any) => {
      if (m?.isMesh && m.geometry) meshes.push(m);
    });
  } catch {}

  let i = 0;
  const CHUNK = 8;

  const step = () => {
    if (cancelled) return;
    const end = Math.min(meshes.length, i + CHUNK);
    for (; i < end; i++) {
      try {
        const g: any = meshes[i]?.geometry;
        if (!g) continue;
        if (__bvhGeomSeen && __bvhGeomSeen.has(g)) continue;
        if (__bvhGeomSeen) __bvhGeomSeen.add(g);
        if (!g.boundsTree) g.boundsTree = new MeshBVH(g);
      } catch {}
    }
    if (i < meshes.length) {
      try { requestAnimationFrame(step); } catch { setTimeout(step, 0); }
    }
  };

  try { requestAnimationFrame(step); } catch { setTimeout(step, 0); }
  return () => { cancelled = true; };
}
type EnemyKind = 'enemy' | 'boss';
type EnemyAnim = 'walk' | 'run' | 'attack';
type Enemy = { id: string; kind: EnemyKind; runner: boolean; baseSpd: number; aggro: boolean; wanderYaw: number; wanderT: number; pos: THREE.Vector3; hp: number; maxHp: number; spd: number; anim: EnemyAnim; ry: number; atkCd: number };
type Projectile = { id: string; pos: THREE.Vector3; vel: THREE.Vector3; ttl: number };
// world-ready bridge (outer -> inner)
const FANTASY_ON_READY_REF: { current: null | (() => void) } = { current: null };


const CHUNK_LEN = 40;
const PODIUM_TOP_Y = 2.00;

const GAZEBO_LIFT = 9.0;
const STAND_H = 1.15;
const GAZEBO_BASE_Y = GAZEBO_LIFT + 0.35;
const GAZEBO_PLATFORM_Y = GAZEBO_BASE_Y + 2.60;

const CHUNK_BACK = 2;
const CHUNK_AHEAD = 3;

const PATH_W = 5.2;
const GRASS_W = 30;
const MOUNTAIN_X = 88;



const TREE_Y = ((0.02 - 4.0) + 2.0) + 2.0;
const SPAWN_MAX_Z = 6.0; // cannot go behind spawn beyond this (+Z)
const PLAYER_RADIUS = 0.55;
const ENEMY_RADIUS = 0.55;
const PODIUM_HALF = 1.1;

const SHOW_DEBUG_WALL = false;

const SHOW_GAZEBO_MESH = true;
const USE_GAZEBO_BVH = false;


const getFantasyUri = (k: string): string => String(getBestAssetUri('fantasy', k) || '');

const MOUNTAIN_URL = () => (getFantasyUri('mountainMobile') || getFantasyUri('mountain'));

const GAZEBO_URL = () => getFantasyUri('gazebo');
const PATH_GLB_URL = () => getFantasyUri('path');
const PATH_DEBUG_VER = "v2";
const PODIUM_URL = () => getFantasyUri('podium');
const SKYBOX_URL = () => getFantasyUri('fantasySkybox');
const FOREST_TREE_URL = () => getFantasyUri('forestTree');

const CRYSTAL1_URL = () => getFantasyUri('crystal1');
const CRYSTAL2_URL = () => getFantasyUri('crystal2');
const CRYSTAL3_URL = () => getFantasyUri('crystal3');
const CRYSTAL4_URL = () => getFantasyUri('crystal4');
const CRYSTAL5_URL = () => getFantasyUri('crystal5');

const MONSTER1_WALK_URL = () => getFantasyUri('monsterWalk');
const MONSTER1_RUN_URL = () => getFantasyUri('monsterRun');
const MONSTER1_ATTACK_URL = () => getFantasyUri('monsterAttack');

const MONSTER1_MODEL_URL = () => getFantasyUri('monsterModel');
const STAFF_URL = () => getFantasyUri('staff');

const FOREST_FOREST_TREE_URL = () => getFantasyUri('forestTree');

function MountainGLB(props: { position: [number, number, number]; scale?: number | [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTFMeshopt(MOUNTAIN_URL());

  useEffect(() => {
    try { return ensureBVHForObject(scene); } catch { return () => {}; }
  }, [scene]);

  return (
    <group
      position={props.position}
      rotation={[0, props.rotationY ?? 0, 0]}
      scale={props.scale ?? 1}
    >
      <Clone object={scene} />
    </group>
  );
}
  function SkyboxAndFog() {
    const { scene } = useThree();
    const tex: any = useTexture(SKYBOX_URL());

    useEffect(() => {
      if (!tex) return;
      try {
        if ('colorSpace' in tex && (THREE as any).SRGBColorSpace) tex.colorSpace = (THREE as any).SRGBColorSpace;
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




function GazeboGLBLoaded(props: { uri: string; position: [number, number, number]; scale?: number; rotationY?: number }) {
  const gltf: any = useGLTFMeshopt(props.uri as any);
  const root: any = (gltf?.scene || gltf);

  if (!root) return null;
  return (
    <group
      position={props.position}
      scale={props.scale ?? 1}
      rotation={[0, props.rotationY ?? 0, 0]}
    >
      <Clone object={root} />
    </group>
  );
}

function GazeboGLB(props: { position: [number, number, number]; scale?: number; rotationY?: number }) {
  const uri = GAZEBO_URL();

  useEffect(() => {
  }, [uri]);

  if (!uri) return null;
  return <GazeboGLBLoaded uri={uri} position={props.position} scale={props.scale} rotationY={props.rotationY} />;
}

function PodiumGLB(props: { position: [number, number, number]; scale?: number | [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTFMeshopt(PODIUM_URL());

  return (
    <group position={props.position} scale={props.scale || 1.0} rotation={[0, props.rotationY || 0, 0]}>
      <Clone object={scene} />
    </group>
  );
}
  function PathGLB(props: {
  position: [number, number, number];
  scale?: number | [number, number, number];
  rotationY?: number;
  targetW?: number; // desired X size in world units
  targetL?: number; // desired Z size in world units
}) {
  const { scene } = useGLTFMeshopt(PATH_GLB_URL());

  const size = useMemo(() => {
    const v = new THREE.Vector3(1, 1, 1);
    try {
      const box = new THREE.Box3().setFromObject(scene);
      box.getSize(v);
      if (!isFinite(v.x) || v.x <= 1e-6) v.x = 1;
      if (!isFinite(v.y) || v.y <= 1e-6) v.y = 1;
      if (!isFinite(v.z) || v.z <= 1e-6) v.z = 1;
    } catch {}
    return v;
  }, [scene]);

  const base = props.scale ?? 1;

  const bx = (size.x || 1);
  const bz = (size.z || 1);

  const tw = props.targetW ?? bx;
  const tl = props.targetL ?? bz;

  const sx = tw / bx;
  const sz = tl / bz;
  const sy = (sx + sz) * 0.5;

  let scale: any;
  if (typeof base === 'number') scale = [sx * base, sy * base, sz * base];
  else scale = [sx * base[0], sy * base[1], sz * base[2]];

  return (
    <group position={props.position} scale={scale} rotation={[0, props.rotationY ?? 0, 0]}>
      <Clone object={scene} />
    </group>
  );
}


function ForestTreeGLB(props: { position: [number, number, number]; scale?: number; rotationY?: number }) {
  const { scene } = useGLTFMeshopt(FOREST_FOREST_TREE_URL());

  const minY = useMemo(() => {
    let y = 0;
    try {
      const box = new THREE.Box3().setFromObject(scene);
      const v = box?.min?.y;
      if (typeof v === 'number' && isFinite(v)) y = v;
    } catch {}
    return y;
  }, [scene]);

  const s = (props.scale ?? 1);
  const sy = (typeof s === 'number') ? s : 1;
  const y = props.position[1] - (minY * sy);

  return (
    <group position={[props.position[0], y, props.position[2]]} scale={s} rotation={[0, props.rotationY ?? 0, 0]}>
      <Clone object={scene} />
    </group>
  );
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function seeded(idx: number) {
  let s = (idx * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type AABB2 = { id: string; minX: number; maxX: number; minZ: number; maxZ: number };

function resolveCircleAABBs(pos: THREE.Vector3, r: number, boxes: AABB2[]) {
  for (const b of boxes) {
    const cx = clamp(pos.x, b.minX, b.maxX);
    const cz = clamp(pos.z, b.minZ, b.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = (dx * dx) + (dz * dz);
    if (d2 >= r * r) continue;
    const d = Math.sqrt(Math.max(1e-9, d2));
    const push = (r - d);
    pos.x += (dx / d) * push;
    pos.z += (dz / d) * push;
  }


}

function makeGazeboColliders(): AABB2[] {
  const z0 = -(CHUNK_LEN * 0.5);
  const H = 7.5;   // inner platform half-size
  const W = 0.65;  // wall thickness
  const P = 0.95;  // pillar half-size
  return [
    { id: "gz_front", minX: -H, maxX: H, minZ: (z0 - H - W), maxZ: (z0 - H + W) },
    { id: "gz_back",  minX: -H, maxX: H, minZ: (z0 + H - W), maxZ: (z0 + H + W) },
    { id: "gz_left",  minX: (-H - W), maxX: (-H + W), minZ: (z0 - H), maxZ: (z0 + H) },
    { id: "gz_right", minX: ( H - W), maxX: ( H + W), minZ: (z0 - H), maxZ: (z0 + H) },

    { id: "gz_p1", minX: (-H - P), maxX: (-H + P), minZ: (z0 - H - P), maxZ: (z0 - H + P) },
    { id: "gz_p2", minX: ( H - P), maxX: ( H + P), minZ: (z0 - H - P), maxZ: (z0 - H + P) },
    { id: "gz_p3", minX: (-H - P), maxX: (-H + P), minZ: (z0 + H - P), maxZ: (z0 + H + P) },
    { id: "gz_p4", minX: ( H - P), maxX: ( H + P), minZ: (z0 + H - P), maxZ: (z0 + H + P) },
  ];
}



const __bvhLocalP = new THREE.Vector3();
const __bvhWorldP = new THREE.Vector3();
const __bvhDelta = new THREE.Vector3();
const __bvhRootPos = new THREE.Vector3();
const __bvhBox = new THREE.Box3();
const __bvhSphere = new THREE.Sphere(new THREE.Vector3(), 1);
const __bvhHit: any = { point: new THREE.Vector3(), distance: 0, faceIndex: -1 };
const __bvhDesired = new THREE.Vector3();
const __triA = new THREE.Vector3();
const __triB = new THREE.Vector3();
const __triC = new THREE.Vector3();
const __triN = new THREE.Vector3();
const __tmp1 = new THREE.Vector3();
const __tmp2 = new THREE.Vector3();
const __bvhR2 = { v: 1 };
const __bvhBestN = new THREE.Vector3();
const __bvhTmpN = new THREE.Vector3();
function resolveSphereMeshBVH(
  pos: THREE.Vector3,
  r: number,
  roots: any[],
) {
  if (!roots || roots.length === 0) return;

  const EPS = 0.03;   // small skin so you stay outside
  const MAXP = 0.28;  // cap per pass so we don't teleport

  __bvhSphere.radius = r;

  for (let pass = 0; pass < 4; pass++) {
    let anyPush = false;

    for (const root of roots) {
    if (!root || !(root as any).traverse) continue;
      if (!root) continue;

      root.getWorldPosition(__bvhRootPos);
      if (Math.abs(__bvhRootPos.z - pos.z) > 120) continue;

      root.updateWorldMatrix(true, true);

      root.traverse((obj: any) => {
        if (!obj || !obj.isMesh || !obj.geometry) return;
        const g: any = obj.geometry;
        if (!g.boundsTree) return;

        __bvhSphere.center.copy(pos);

        if (!g.boundingBox) g.computeBoundingBox();
        __bvhBox.copy(g.boundingBox).applyMatrix4(obj.matrixWorld);
        if (!__bvhBox.intersectsSphere(__bvhSphere)) return;

        __bvhLocalP.copy(pos);
        obj.worldToLocal(__bvhLocalP);

        const hit = g.boundsTree.closestPointToPoint(__bvhLocalP, __bvhHit);
        if (!hit) return;

        __bvhWorldP.copy((hit as any).point);
        obj.localToWorld(__bvhWorldP);

        // Detect penetration in FULL 3D (handles overlapping mountains / overhangs),
        // but push only in XZ (stable FPS walker).
        __bvhDelta.copy(pos).sub(__bvhWorldP);
        const dist3 = __bvhDelta.length();

        if (dist3 < r + EPS) {
          // XZ direction for push
          __bvhDelta.y = 0;
          let distXZ = __bvhDelta.length();

          // If we're exactly on the point in XZ, use a stable fallback direction away from root
          if (distXZ < 1e-6) {
            __bvhDelta.copy(pos).sub(__bvhRootPos);
            __bvhDelta.y = 0;
            distXZ = __bvhDelta.length();
            if (distXZ < 1e-6) return;
          }

          let push = (r + EPS) - dist3;
          if (push > MAXP) push = MAXP;
          if (push > 1e-6) {
            pos.addScaledVector(__bvhDelta, push / distXZ);
            anyPush = true;
          }
        }
      });
    }

    if (!anyPush) break;
  }
}

  function makeEnemy(kind: EnemyKind, z: number): Enemy {
    const id = `${kind}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const x = rand(-10, 10);
    const maxHp = kind === 'boss' ? 120 : 40;
    const hp = maxHp;
    const spd = kind === 'boss' ? 2.1 : 2.7;
    const y = 0;
    const runner = (kind !== 'boss') && (Math.random() < 0.20);
      const baseSpd = spd;
      const wanderYaw = (Math.random() * Math.PI * 2);
      const wanderT = 0;
      const aggro = false;
      return { id, kind, runner, baseSpd, aggro, wanderYaw, wanderT, pos: new THREE.Vector3(x, y, z), hp, maxHp, spd, anim: 'walk', ry: 0, atkCd: 0 };
  }


  function Monster1GLB(props: { position: [number, number, number]; scale?: number; rotationY?: number; anim: EnemyAnim }) {
  const ref = useRef<THREE.Group>(null);

  const walkG: any = useGLTFMeshopt(MONSTER1_WALK_URL() as any);
  const runG: any = useGLTFMeshopt(MONSTER1_RUN_URL() as any);
  const atkG: any = useGLTFMeshopt(MONSTER1_ATTACK_URL() as any);

  const baseScene: any =
    (walkG && walkG.scene) ? walkG.scene :
    (Array.isArray(walkG) ? walkG[0]?.scene : null);

  const obj = useMemo<any>(() => {
    if (!baseScene) return null;
    const c: any = SkeletonUtils.clone(baseScene);
    return c;
  }, [baseScene]);

  useEffect(() => {
    try { return ensureBVHForObject(obj); } catch { return () => {}; }
  }, [obj]);

  const clips = useMemo<THREE.AnimationClip[]>(() => {
    const out: THREE.AnimationClip[] = [];

    const add = (g: any, name: EnemyAnim) => {
      const arr: any[] = Array.isArray(g?.animations) ? g.animations : [];
      for (const c of arr) {
        const cc: any = c?.clone ? c.clone() : c;
        if (!cc) continue;
        cc.name = name;
        out.push(cc);
      }
    };

    add(walkG, 'walk');
    add(runG, 'run');
    add(atkG, 'attack');

    return out;
  }, [walkG, runG, atkG]);

  const { actions } = useAnimations(clips, ref);

  useEffect(() => {
    if (!actions) return;

    const key = props.anim || 'walk';
    const keys = Object.keys(actions as any);

    let act: any = (actions as any)[key];
    if (!act && key === 'run') act = (actions as any)['walk'];
    if (!act && keys.length) act = (actions as any)[keys[0]];
    if (!act) return;

    for (const k of keys) {
      const a: any = (actions as any)[k];
      if (a && a !== act) {
        try { a.fadeOut(0.12); } catch {}
      }
    }

    try {
      act.reset();
      act.fadeIn(0.12);

      if (key === 'attack') {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
      } else {
        act.setLoop(THREE.LoopRepeat, Infinity);
        act.clampWhenFinished = false;
      }

      act.play();
    } catch {}

    return () => {
      try { act.fadeOut(0.10); } catch {}
    };
  }, [actions, props.anim]);

  if (!obj) return null;

  return (
    <group ref={ref} position={props.position} rotation={[0, props.rotationY ?? 0, 0]} scale={props.scale ?? 1}>
      <primitive object={obj} />
    </group>
  );
}


function Chunk(props: { idx: number; centerZ: number; showGazebo?: boolean; onMountains?: (idx: number, roots: any[]) => void; onTrees?: (idx: number, boxes: AABB2[]) => void; showProps?: boolean; showTrees?: boolean; showMountains?: boolean; }) {
  const { idx, centerZ } = props;


  const leftMountainRef = useRef<any>(null);
  const rightMountainRef = useRef<any>(null);
  const forestTrees = useMemo(() => {
    const rng = (k: number) => {
      let t = k >>> 0;
      return () => {
        t = (t + 0x6D2B79F5) >>> 0;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    };
    const r = rng((idx + 1) * 1337);
    const out: { id: string; x: number; z: number; s: number; ry: number }[] = [];
    const sidePad = PATH_W * 0.5 + 0.6;
    const edgeMax = GRASS_W * 0.5 - 1.6;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const side = (r() < 0.5 ? -1 : 1);
      const x = side * (sidePad + (edgeMax - sidePad) * Math.pow(r(), 0.55));
      const z = -CHUNK_LEN * 0.5 + CHUNK_LEN * r();
      const s0 = 0.85 + 0.55 * r();
      const s = Math.max(0.75, Math.min(1.35, s0));
      const ry = (r() * Math.PI * 2);
      out.push({ id: `ft_${idx}_${i}`, x, z, s, ry });
    }
    return out;
  }, [idx]);

  const trunkBoxes = useMemo<AABB2[]>(() => {
    const out: AABB2[] = [];
    for (const t of (forestTrees as any[])) {
      const visScale = (t.s ?? 1) * 7;     // matches render scale={t.s * 7}
      const r = 0.05 * visScale;          // trunk radius in XZ (tune if needed)
      const wz = centerZ + (t.z ?? 0);     // world Z
      out.push({
        id: String(t.id),
        minX: (t.x ?? 0) - r,
        maxX: (t.x ?? 0) + r,
        minZ: wz - r,
        maxZ: wz + r,
      });
    }
    return out;
  }, [forestTrees, centerZ]);

  useEffect(() => {
    if (!props.showTrees) {
      props.onTrees?.(idx, []);
      return;
    }
    props.onTrees?.(idx, trunkBoxes);
    return () => { props.onTrees?.(idx, []); };
  }, [idx, trunkBoxes, props.onTrees, props.showTrees]);

  const gazeboRef = useRef<any>(null);

  useEffect(() => {
    if (!props.showMountains) {
      props.onMountains?.(props.idx, []);
      return;
    }
    let alive = true;
    let tries = 0;
    const tick = () => {
      if (!alive) return;
      const roots = [leftMountainRef.current, rightMountainRef.current].filter(Boolean);
      const gz = (props.idx === 0 && !!props.showGazebo) ? gazeboRef.current : null;if (roots.length) {
        props.onMountains?.(props.idx, roots);
                if (false) console.log('[BVH] registerChunk', { idx: props.idx, roots: roots.length });

        return;
      }
      tries += 1;
      if (tries < 60) {
        const raf = (globalThis as any).requestAnimationFrame;
        if (typeof raf === 'function') raf(tick);
        else setTimeout(tick, 16);
      } else {
        props.onMountains?.(props.idx, []);
        if (false) console.log('[BVH] registerChunk', { idx: props.idx, roots: 0, giveUp: true });
      }
    };
    tick();
    return () => {
      alive = false;
      props.onMountains?.(props.idx, []);};
  }, [props.idx, props.onMountains, props.showMountains]);
return (
    <group position={[0, 0, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[PATH_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#2f3a2f'} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

        {(() => {
          const r = seeded(idx);
          const tiles = Array.from({ length: 6 }, (_, k) => {
            const z = -CHUNK_LEN * 0.5 + (k + 0.5) * (CHUNK_LEN / 6);
            const x = (r() - 0.5) * 0.55;
            const ry = (r() - 0.5) * 0.35;
            const s = 1.0 + (r() - 0.5) * 0.10;
            return { id: `p_${idx}_${k}`, x, z, ry, s, mx: (r() < 0.5) ? -1 : 1 };
          });
          return (
            <group position={[0, 0.06, 0]}>
              {props.showProps ? tiles.map(t => (
                <PathGLB
                  key={t.id}
                  position={[t.x, 0.04, t.z]}
                    targetW={PATH_W}
                    targetL={CHUNK_LEN / 6}
                  scale={[t.s * t.mx, t.s, t.s]}rotationY={t.ry}
                />
              )) : null}
            </group>
          );
        })()}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[GRASS_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#3a4f3a'} />
      </mesh>

      {/* Forest trees */}
      {props.showTrees ? forestTrees.map(t => (
        <ForestTreeGLB
          key={t.id}
          position={[t.x, TREE_Y, t.z]}
          scale={t.s * 7}
          rotationY={t.ry}
        />
      )) : null}


        {(idx === 0 && !!props.showGazebo) ? (
            SHOW_GAZEBO_MESH ? (
              <group ref={gazeboRef}>
                {GAZEBO_URL() ? <GazeboGLB position={[0, GAZEBO_LIFT + 0.35, 0]} scale={12.0} rotationY={Math.PI} /> : null}
              </group>
            ) : (
              <group>
                <mesh position={[0, GAZEBO_PLATFORM_Y - 0.10, 0]}>
                  <cylinderGeometry args={[7.6, 7.6, 0.20, 16]} />
                  <meshStandardMaterial color={"#6c7a6c"} />
                </mesh>
                <mesh position={[0, GAZEBO_BASE_Y + 0.60, 0]}>
                  <cylinderGeometry args={[0.35, 0.35, 1.20, 10]} />
                  <meshStandardMaterial color={"#4e5a4e"} />
                </mesh>
              </group>
            )
          ) : null}



      {props.showMountains ? <group>
          <group ref={leftMountainRef}>
            <MountainGLB position={[-(MOUNTAIN_X - 26.35), 30.0, 0]} scale={[55.0, 110.0, 110.0]} rotationY={(idx % 2 === 0) ? 0 : Math.PI} />
          </group>
          <group ref={rightMountainRef}>
            <MountainGLB position={[ (MOUNTAIN_X - 26.35), 30.0, 0]} scale={[55.0, 110.0, 110.0]} rotationY={(idx % 2 === 0) ? Math.PI : 0} />
          </group>
        </group> : null}
    </group>
  );
}

function Scene(props: {
    onReady?: () => void;
walking: boolean;
  moveRef: React.MutableRefObject<{ x: number; y: number }>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  shootPulse: number;
  bulletDmgEnemy: number;
  bulletDmgBoss: number;
  onPodium: () => void;
  onMonument: () => void;
  onEnemyKilled: (kind: EnemyKind) => void;
}) {
  const [bootPhase, setBootPhase] = useState<0 | 1 | 2 | 3>(0);
  const playerPosRef = useRef(new THREE.Vector3(0, GAZEBO_PLATFORM_Y + STAND_H + 2.25, -(CHUNK_LEN * 0.5)));
    const mountainRootsRef = useRef<any[]>([]);
    const mountainChunkMapRef = useRef<Map<number, any[]>>(new Map());
    
    const tmpMountainRootsRef = useRef<any[]>([]);
const onMountains = useCallback((idx: number, roots: any[]) => {
      const clean = (roots || []).filter(Boolean);
      if (clean.length) mountainChunkMapRef.current.set(idx, clean);
      else mountainChunkMapRef.current.delete(idx);
      const flat: any[] = [];
      for (const arr of mountainChunkMapRef.current.values()) {
        for (const r of arr) if (r) flat.push(r);
      }
      mountainRootsRef.current = flat;
    }, []);
    const treeChunkMapRef = useRef<Map<number, AABB2[]>>(new Map());
  const treeBoxesRef = useRef<AABB2[]>([]);
  
  const onTrees = useCallback((idx: number, boxes: AABB2[]) => {
      if (boxes && boxes.length) treeChunkMapRef.current.set(idx, boxes);
      else treeChunkMapRef.current.delete(idx);

      const flat: AABB2[] = [];
      for (const arr of treeChunkMapRef.current.values()) flat.push(...arr);
      treeBoxesRef.current = flat;
    }, []);
    const showGazebo = Math.abs(playerPosRef.current.z) < 90;
  const STAND_Y = 1.15; // authoritative player standing height
    const GAZEBO_HALF = 9.0;
    const simAcc = useRef(0);
    const moveVelRef = useRef({ x: 0, y: 0 });
  const hadRuntimeErr = useRef(false);
  const firstFrameRef = useRef(false);
  const playableSentRef = useRef(false);
const spawnFixRef = useRef(120);
const lastMountainCountRef = useRef(-1);
const fpsAccRef = useRef({ t: 0, frames: 0, worstMs: 0 });

  const [chunkTick, setChunkTick] = useState(0);
  const baseChunkRef = useRef(0);
  const lastPrefetchChunkRef = useRef<number | null>(null);


  useEffect(() => {
    let alive = true;
    console.log('[ASSET_URI] fantasy', { path: PATH_GLB_URL().startsWith('file://'), gazebo: GAZEBO_URL().startsWith('file://'), staff: STAFF_URL().startsWith('file://') });
    const q = async () => {
      props.onReady?.();
      reportWorldGate('fantasy', 'scene-mounted');
      setWorldPhase('fantasy', 'stage0-canvas', 0.1);
      try { await new Promise((r) => setTimeout(r, 0)); } catch {}
      if (!alive) return;
      setBootPhase(1);
      setWorldPhase('fantasy', 'stage1-near-chunk', 0.35);

      for (const u of [GAZEBO_URL(), PATH_GLB_URL(), PODIUM_URL(), CRYSTAL1_URL(), STAFF_URL()]) {
        if (!u) continue;
        try { preloadGLTFMeshopt(u as any); } catch {}
        try { await new Promise((r) => setTimeout(r, 120)); } catch {}
        if (!alive) return;
      }
      setBootPhase(2);
      setWorldPhase('fantasy', 'stage2-props', 0.6);

      for (const u of [FOREST_FOREST_TREE_URL(), MOUNTAIN_URL(), MONSTER1_MODEL_URL(), MONSTER1_WALK_URL(), MONSTER1_RUN_URL(), MONSTER1_ATTACK_URL()]) {
        if (!u) continue;
        try { preloadGLTFMeshopt(u as any); } catch {}
        try { await new Promise((r) => setTimeout(r, 120)); } catch {}
        if (!alive) return;
      }
      setBootPhase(3);
      setWorldPhase('fantasy', 'stage3-streaming', 0.9);
    };
    q();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Prefetch next chunk assets (request-only), keeps visuals smooth without rendering far.
    const bc = baseChunkRef.current;
    if (lastPrefetchChunkRef.current === bc) return;
    lastPrefetchChunkRef.current = bc;

    const urls = [
      PATH_GLB_URL(),
      FOREST_FOREST_TREE_URL(),
    ].filter(Boolean) as any[];

    const t = setTimeout(() => {
      try {
        for (const u of (urls as any[])) { if (u) preloadGLTFMeshopt(u as any); }
      } catch (e) {}
    }, 50);

    return () => clearTimeout(t);
  }, [chunkTick, bootPhase]);


  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projRef = useRef<Projectile[]>([]);
  projRef.current = projectiles;

  const [enemies, setEnemies] = useState<Enemy[]>(() => [makeEnemy('enemy', -12)]);

useEffect(() => {
  setEnemies([
    makeEnemy('enemy', -18),
    makeEnemy('enemy', -36),
    makeEnemy('enemy', -54),
    makeEnemy('enemy', -72),
    makeEnemy('enemy', -90),
    makeEnemy('boss', -120),
  ]);
}, []);

  const enemiesRef = useRef<Enemy[]>([]);
  enemiesRef.current = enemies;

  const lastShootPulse = useRef(0);
  const spawnT = useRef(0);
  const podiums = useMemo(() => {
    const out: { id: string; side: 1 | -1; z: number }[] = [];
    const count = 10;          // total checkpoints
    let chunk = 6;             // first podium after 14 chunks
    for (let i = 1; i <= count; i++) {
      const side = (i % 2 === 0 ? 1 : -1) as 1 | -1;
      const z = -(chunk * CHUNK_LEN) - (CHUNK_LEN * 0.5);
      out.push({ id: `pod_${i}`, side, z });

      // spacing increases as you progress (harder + more time between checkpoints)
      const add = min(22, 8 + Math.floor(i * 1.6));
      chunk += add;
    }
    return out;

    function min(a: number, b: number) { return a < b ? a : b; }
  }, []);


    const podiumBoxes = useMemo(() => {
      return podiums.map((pd) => {
        const x = pd.side * 3.8;
        const z = pd.z;
        return {
          id: pd.id,
          minX: x - PODIUM_HALF,
          maxX: x + PODIUM_HALF,
          minZ: z - PODIUM_HALF,
          maxZ: z + PODIUM_HALF,
        } as AABB2;
      });
    }, [podiums]);
  

    const gazeboBoxes = useMemo(() => makeGazeboColliders(), []);
const monument = useMemo(() => ({ id: 'monument_1', side: 1 as 1, z: -320 }), []);
  const collectedRef = useRef<Record<string, 1>>({});
  const [collectedTick, setCollectedTick] = useState(0);

  function fireProjectileForward(playerPos: THREE.Vector3) {
    const yaw = props.yawRef.current;
    const pitch = props.pitchRef.current;
    const forward = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(-pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const origin = playerPos.clone().setY(1.55)
      .add(right.multiplyScalar(0.35))
      .add(up.multiplyScalar(-0.22))
      .add(forward.clone().multiplyScalar(0.7));

    const speed = 24;
    const id = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setProjectiles(prev => (prev.length > 40 ? prev.slice(prev.length - 39) : prev).concat([{ id, pos: origin, vel: forward.multiplyScalar(speed), ttl: 2.2 }]));
  }

  useFrame(({ camera }, dt) => {
    try {
      if (!firstFrameRef.current) {
        firstFrameRef.current = true;
        reportWorldGate('fantasy', 'first-frame');
        reportWorldGate('fantasy', 'world-visible');
      }
      if (__DEV__) {
        const ms = dt * 1000;
        const a = fpsAccRef.current;
        a.t += dt;
        a.frames += 1;
        if (ms > a.worstMs) a.worstMs = ms;
        if (a.t >= 2) {
          const fps = a.frames / a.t;
          console.log(`[FPS] fantasy avg=${fps.toFixed(1)} worstMs=${a.worstMs.toFixed(1)} tier=${bootPhase}`);
          a.t = 0; a.frames = 0; a.worstMs = 0;
        }
      }
      const stepHz = 60;
      const stepDt = 1 / stepHz;

      simAcc.current += dt;
      const maxCatchup = 4;
      let loops = 0;

      while (simAcc.current >= stepDt && loops < maxCatchup) {
        simAcc.current -= stepDt;
        loops++;

        const p = playerPosRef.current;          const mv = props.moveRef.current;
          const speed = 5.3;

          // CAMERA-RELATIVE MOVEMENT (stable smoothing done in fixed-step sim)
          // Three.js forward is -Z; with yaw=0, forward is (0,0,-1)
          const yaw = props.yawRef.current;
          const fx = -Math.sin(yaw);
          const fz = -Math.cos(yaw);
          const rx = Math.cos(yaw);
          const rz = -Math.sin(yaw);

          // Normalize input (prevents faster diagonal movement)
          let ix = mv.x;
          let iy = mv.y;
          const mag = Math.hypot(ix, iy);
          if (mag > 1) { ix /= mag; iy /= mag; }

          // Target velocity in LOCAL (right/forward) space
          const targetVX = ix * speed;
          const targetVY = iy * speed;

          // Smooth velocity (accel when moving, strong decel when stopping)
          const v = moveVelRef.current;
          const accel = (Math.abs(ix) > 0.001 || Math.abs(iy) > 0.001) ? 22 : 38;
          const maxDelta = accel * stepDt;

          const dx = clamp(targetVX - v.x, -maxDelta, maxDelta);
          const dy = clamp(targetVY - v.y, -maxDelta, maxDelta);
          v.x += dx;
          v.y += dy;

          // Optional autowalk when no stick input
          if ((mag <= 0.001) && props.walking) {
            v.x = 0;
            v.y = speed;
          }

          // Convert LOCAL (right/forward) velocity to WORLD delta
          const wx = (v.x * rx) + (v.y * fx);
          const wz = (v.x * rz) + (v.y * fz);
          p.x += wx * stepDt;
          p.z += wz * stepDt;
          p.z = Math.min(p.z, SPAWN_MAX_Z);
// lock vertical position (prevents spawning inside BVH meshes)

                      // COLLISION: podiums (2D AABB)
          const nearPodiumBoxes: AABB2[] = [];
            const minLoaded = baseChunkRef.current;
            const maxLoaded = minLoaded + chunks.length - 1;
          for (const b of podiumBoxes) {
            if (collectedRef.current[b.id]) continue;
            const cz = (b.minZ + b.maxZ) * 0.5;
            const dz = cz - p.z;
              const bChunk = Math.floor((-cz) / CHUNK_LEN);
              if (bChunk < minLoaded || bChunk > maxLoaded) continue;
            if (Math.abs(dz) > 60) continue; // only nearby colliders
            nearPodiumBoxes.push(b);
          }
          resolveCircleAABBs(p, PLAYER_RADIUS, nearPodiumBoxes);
                        
          const nearTreeBoxes: AABB2[] = [];
          const curT = Math.floor((-p.z) / CHUNK_LEN);
          const t0 = treeChunkMapRef.current.get(curT);
          const t1 = treeChunkMapRef.current.get(curT - 1);
          const t2 = treeChunkMapRef.current.get(curT + 1);
          if (t0) nearTreeBoxes.push(...t0);
          if (t1) nearTreeBoxes.push(...t1);
          if (t2) nearTreeBoxes.push(...t2);
          if (nearTreeBoxes.length) if (p.y <= 0.55) {
            resolveCircleAABBs(p, PLAYER_RADIUS, nearTreeBoxes);
          }
const mcnt = mountainRootsRef.current.length;
            if (mcnt !== lastMountainCountRef.current) {
              lastMountainCountRef.current = mcnt;
              if (false) console.log('[BVH] mountainRoots', { count: mcnt });
            }

            const curChunkIdx = Math.floor((-p.z) / CHUNK_LEN);
            const tmp = tmpMountainRootsRef.current;
            tmp.length = 0;
            if (bootPhase >= 3) {
              const a0 = mountainChunkMapRef.current.get(curChunkIdx);
              const a1 = mountainChunkMapRef.current.get(curChunkIdx - 1);
              const a2 = mountainChunkMapRef.current.get(curChunkIdx + 1);
              if (a0) tmp.push(...a0);
              if (a1) tmp.push(...a1);
              if (a2) tmp.push(...a2);
              resolveSphereMeshBVH(p, PLAYER_RADIUS, tmp);
            }
            
            const tc2 = Math.floor((-p.z) / CHUNK_LEN);
            const tt0 = (treeChunkMapRef.current.get(tc2) || []) as any;
            const tt1 = (treeChunkMapRef.current.get(tc2 - 1) || []) as any;
            const tt2 = (treeChunkMapRef.current.get(tc2 + 1) || []) as any;
            const ttBoxes = ([] as any[]).concat(tt0, tt1, tt2) as any;
            if (ttBoxes.length) resolveCircleAABBs(p, PLAYER_RADIUS, ttBoxes);
            p.y = STAND_H;
// SPAWN DECLIP (first ~2 seconds): if inside gazebo/podium, snap UP onto top; if inside tree, shove left/right
              if (spawnFixRef.current > 0) {
                spawnFixRef.current--;

                // trees: shove sideways only
                if (ttBoxes.length) {
                  for (const b of ttBoxes) {
                    if (!b) continue;
                    if (p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ) {
                      const shove = PLAYER_RADIUS + 0.55;
                      if (p.x >= 0) p.x = b.maxX + shove;
                      else p.x = b.minX - shove;
                      break;
                    }
                  }
                }

                // podium: snap up if inside footprint
                for (const b of podiumBoxes) {
                  if (!b) continue;
                  if (p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ) {
                    const wantY = PODIUM_TOP_Y + STAND_H + 0.05;
                    if (p.y < wantY) p.y = wantY;
                    break;
                  }
                }
              }


spawnT.current += stepDt;
        if (spawnT.current >= 1.0) {
          spawnT.current = 0;
          const ahead = p.z - rand(18, 55);
          const spawnBoss = Math.random() < 0.06;
          const e = makeEnemy(spawnBoss ? 'boss' : 'enemy', ahead);
          setEnemies(prev => {
            const kept = prev.filter(x => x.hp > 0 && x.pos.z < p.z + 18 && x.pos.z > p.z - 900);
            return kept.concat([e]);
          });
        }

        if (props.shootPulse !== lastShootPulse.current) {
          lastShootPulse.current = props.shootPulse;
          fireProjectileForward(p);
        }

          const alive = enemiesRef.current.filter(e => e.hp > 0);
          if (alive.length) {
            let moved = false;
            let changed = false;

            const AGGRO_RANGE = 16.0;
            const WANDER_TURN_SECS = 1.6;
            const WANDER_SPEED = 0.65;

            const nextEnemies = alive.map(e => {
              const dVec = p.clone().sub(e.pos);
              dVec.y = 0;
              const d0 = dVec.length();

              let atkCd = Math.max(0, (e.atkCd ?? 0) - stepDt);
              const reach = e.kind === 'boss' ? 1.85 : 1.25;

              if (atkCd > 0) {
                if (e.anim !== 'attack') changed = true;
                return { ...e, atkCd, anim: 'attack' as EnemyAnim };
              }

              if (d0 <= reach) {
                changed = true;
                return { ...e, atkCd: 0.85, anim: 'attack' as EnemyAnim };
              }

              const aggro = (e.aggro || d0 <= AGGRO_RANGE);

              let dir: THREE.Vector3;
              let ry: number;
              let wanderYaw = e.wanderYaw ?? 0;
              let wanderT = e.wanderT ?? 0;

              if (aggro) {
                const chase = d0 > 1e-6 ? dVec.multiplyScalar(1 / d0) : new THREE.Vector3(0, 0, 1);
                dir = chase;
                ry = Math.atan2(dir.x, dir.z);
              } else {
                wanderT += stepDt;
                if (wanderT >= WANDER_TURN_SECS) {
                  wanderT = 0;
                  wanderYaw = (Math.random() * Math.PI * 2);
                }
                ry = wanderYaw;
                dir = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
              }

              const baseSpd = e.baseSpd ?? e.spd;
              const moveSpd = aggro ? (e.runner ? baseSpd * 2.0 : baseSpd) : (baseSpd * WANDER_SPEED);
              const step = aggro
                ? Math.min(Math.max(0, d0 - reach), moveSpd * stepDt)
                : Math.min(moveSpd * stepDt, 0.9 * stepDt);

              const locomotion: EnemyAnim = aggro ? (e.runner ? 'run' : 'walk') : 'walk';

              if (aggro !== e.aggro) changed = true;
              if (wanderYaw !== e.wanderYaw || wanderT !== e.wanderT) changed = true;
              if (locomotion !== e.anim) changed = true;

              if (step > 0.0001) {
                moved = true;
                const ep = e.pos.clone().add(dir.multiplyScalar(step));
                resolveCircleAABBs(ep, ENEMY_RADIUS, nearPodiumBoxes);
                const eTree = treeBoxesRef.current;
                if (eTree.length) resolveCircleAABBs(ep, ENEMY_RADIUS, eTree);
                if (bootPhase >= 3) resolveSphereMeshBVH(ep, ENEMY_RADIUS, tmp);
                return { ...e, aggro, wanderYaw, wanderT, pos: ep, ry, atkCd, anim: locomotion };
              }

              return { ...e, aggro, wanderYaw, wanderT, ry, atkCd, anim: locomotion };
            });

            if (moved || changed) setEnemies(nextEnemies);
          }


        const currentEnemies = enemiesRef.current.slice();
        const nextProjectiles: Projectile[] = [];
        let enemiesChanged = false;

        for (const pr of projRef.current) {
          const ppos = pr.pos.clone().add(pr.vel.clone().multiplyScalar(stepDt));
          const ttl = pr.ttl - stepDt;
          if (ttl <= 0) continue;

          let hit = false;
          for (let i = 0; i < currentEnemies.length; i++) {
            const e = currentEnemies[i];
            if (!e || e.hp <= 0) continue;
            const r = (e.kind === 'boss') ? 2.35 : 1.05;
            if (ppos.distanceTo(e.pos) <= r) {
              hit = true;
              const dmg = (e.kind === 'boss') ? props.bulletDmgBoss : props.bulletDmgEnemy;
              const nhp = Math.max(0, e.hp - dmg);
              if (nhp !== e.hp) enemiesChanged = true;
              if (e.hp > 0 && nhp === 0) props.onEnemyKilled(e.kind);
              currentEnemies[i] = { ...e, hp: nhp };
              break;
            }
          }
          if (!hit) nextProjectiles.push({ ...pr, pos: ppos, ttl });
        }

        if (enemiesChanged) setEnemies(currentEnemies);
        if (nextProjectiles.length !== projRef.current.length) setProjectiles(nextProjectiles);

        const base = Math.floor((-p.z) / CHUNK_LEN);
        if (base !== baseChunkRef.current) {
          baseChunkRef.current = base;
          setChunkTick(t => t + 1);
        }
      }

      const p = playerPosRef.current;

      // FIRST PERSON CAMERA (follow player head + apply yaw/pitch)
        const yaw = props.yawRef.current;
        const pitch = props.pitchRef.current;
      camera.position.set(p.x, 1.55, p.z);
      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
      if (!playableSentRef.current && firstFrameRef.current && bootPhase >= 1) {
        playableSentRef.current = true;
        reportWorldGate('fantasy', 'controls-ready');
        setWorldPhase('fantasy', 'playable', 1);
        markWorldPlayable('fantasy');
      }
    } catch (e) {
      if (!hadRuntimeErr.current) {
        hadRuntimeErr.current = true;
        setWorldError('fantasy', `Runtime error during frame update: ${String(e)}`);
      }
      console.error(e);
    }
  });

  const chunks = useMemo(() => Array.from({ length: CHUNK_BACK + CHUNK_AHEAD + 1 }, (_, i) => i - CHUNK_BACK), []);
  const baseChunk = baseChunkRef.current;

  const fogColor = '#bfefff';

  return (
    <>
      <SkyboxAndFog />
<fog attach="fog" args={["#bfefff", 12, 180]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 10, 6]} intensity={1.35} />
      <directionalLight position={[-6, 8, -6]} intensity={0.55} />
      {bootPhase >= 1 ? <StaffViewModel /> : null}

        {SHOW_DEBUG_WALL ? (
          <mesh position={[0, 1.2, 1.0]}>
            <boxGeometry args={[34, 6, 0.35]} />
            <meshStandardMaterial color={'#ff00ff'} />
          </mesh>
        ) : null}


      {chunks.map((i) => {
        const chunkIdx = baseChunk + i;
        const centerZ = -(chunkIdx * CHUNK_LEN) - (CHUNK_LEN / 2);
        return <Chunk key={`c_${chunkIdx}`} idx={chunkIdx} centerZ={centerZ} showGazebo={showGazebo} onMountains={onMountains} onTrees={onTrees} showProps={bootPhase >= 1} showTrees={bootPhase >= 2} showMountains={bootPhase >= 2} />;
      })}

      {podiums.map((pd) => {
        const playerZ = playerPosRef.current.z;
          const pdChunk = Math.floor((-pd.z) / CHUNK_LEN);
          const minLoaded = baseChunk;
          const maxLoaded = baseChunk + chunks.length - 1;
          if (pdChunk < minLoaded || pdChunk > maxLoaded) return null;
        if (pd.z > playerZ + 18) return null;
        if (pd.z < playerZ - 260) return null;
        if (collectedRef.current[pd.id]) return null;
        const x = pd.side * 3.8;
        return (
            <group
              key={pd.id}
              position={[x, 1.05, pd.z]}
              onPointerDown={() => {
                if (collectedRef.current[pd.id]) return;
                collectedRef.current[pd.id] = 1;
                setCollectedTick(t => t + 1);
                props.onPodium();
              }}
            >
              <PodiumGLB position={[0, 0, 0]} scale={1.0} rotationY={0} />
            </group>
          );
      })}

      {!collectedRef.current[monument.id] && (
        <mesh
          key={`mon_${collectedTick}`}
          position={[monument.side * 6.6, 1.8, monument.z]}
          onPointerDown={() => {
            if (collectedRef.current[monument.id]) return;
            collectedRef.current[monument.id] = 1;
            setCollectedTick(t => t + 1);
            props.onMonument();
          }}
        >
          <icosahedronGeometry args={[2.6, 0]} />
          <meshStandardMaterial color={'#cfd7df'} metalness={0.2} roughness={0.6} />
        </mesh>
      )}

      {enemies.map((e) => (
        <group key={e.id}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[e.pos.x, 0.02, e.pos.z]}>
              <circleGeometry args={[e.kind === 'boss' ? 1.6 : 0.9, 24]} />
              <meshBasicMaterial transparent opacity={0.22} color={'#000'} depthWrite={false} />
            </mesh>
            {bootPhase >= 2 ? <Monster1GLB
              position={[e.pos.x, e.pos.y, e.pos.z]}
              scale={e.kind === 'boss' ? 1.3 : 0.7}
              rotationY={e.ry || 0}
              anim={e.anim || 'walk'}
            /> : <mesh position={[e.pos.x, e.pos.y + 0.8, e.pos.z]}><capsuleGeometry args={[0.4, 1.1, 8, 12]} /><meshStandardMaterial color={'#6a748f'} /></mesh>}

          <mesh position={[e.pos.x, e.pos.y + (e.kind === 'boss' ? 3.2 : 1.6), e.pos.z]}>
            <planeGeometry args={[e.kind === 'boss' ? 3.4 : 1.6, 0.18]} />
            <meshStandardMaterial color={'#222'} />
          </mesh>
          <mesh position={[
            e.pos.x - (e.kind === 'boss' ? 1.7 : 0.8) + ((e.hp / e.maxHp) * (e.kind === 'boss' ? 3.4 : 1.6)) / 2,
            e.pos.y + (e.kind === 'boss' ? 3.2 : 1.6),
            e.pos.z + 0.01,
          ]}>
            <planeGeometry args={[(e.hp / e.maxHp) * (e.kind === 'boss' ? 3.4 : 1.6), 0.18]} />
            <meshStandardMaterial color={'#4cd964'} />
          </mesh>
        </group>
      ))}


      {bootPhase >= 1 ? (
        <CrystalField playerPosRef={playerPosRef} poolSize={28} seed={20260220} />
      ) : null}
      {projectiles.map((pr) => (
          <sprite key={pr.id} position={[pr.pos.x, pr.pos.y, pr.pos.z]} scale={[0.9, 0.9, 0.9]}>
            <spriteMaterial
              map={getFireballTexture()}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending as any}
            />
          </sprite>
        ))}
    </>
  );
}


function StaffViewModel() {
  const { camera } = useThree();
  const gltf: any = useGLTFMeshopt(STAFF_URL() as any);
  const root = useMemo(() => (gltf?.scene ? gltf.scene.clone(true) : null), [gltf]);
  const holder = useRef(new THREE.Group());

  useEffect(() => {
    if (!root) return;
    root.scale.setScalar(0.35);
    root.rotation.set(0.25, -0.8, -0.15);
    root.position.set(0.42, -0.34, -0.85);
    holder.current.add(root);
    camera.add(holder.current);
    return () => {
      camera.remove(holder.current);
      holder.current.clear();
    };
  }, [camera, root]);

  return null;
}

function FantasyWorld3D(props: {
  onReady?: () => void;
  walking?: boolean;
  shootPulse: number;
  bulletDmgEnemy: number;
  bulletDmgBoss: number;
  onPodium: () => void;
  onMonument: () => void;
  onEnemyKilled: (kind: EnemyKind) => void;
}) {
  const { width: W, height: H } = useWindowDimensions();

  const onReadyRef = useRef<(() => void) | null>(props.onReady ?? null);
  onReadyRef.current = props.onReady ?? null;

  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  const moveRef = useRef({ x: 0, y: 0 });


    const moveSmooth = useRef({ x: 0, y: 0 });
  const joyState = useRef({ active: false, ox: 0, oy: 0, dx: 0, dy: 0 });
  const lookState = useRef({ active: false, lx: 0, ly: 0 });

  const JOY_SIZE = 132;
  const JOY_R = 52;

  const LOOK_START_X = Math.floor(W * 0.5);

    // === TRUE MULTI-TOUCH CONTROLS ===
    const joyTouch = useRef<number | null>(null);
    const lookTouch = useRef<number | null>(null);

    const joyBottom = Math.max(24, H * 0.08);
    const joyLeft = 18;
    const joyTop = H - joyBottom - JOY_SIZE;

    const isJoy = (x:number,y:number)=> x>=joyLeft && x<=joyLeft+JOY_SIZE && y>=joyTop && y<=joyTop+JOY_SIZE;

    const handleTouches = (touches:any[]) => {
        const joyCx = joyLeft + (JOY_SIZE / 2);
        const joyCy = joyTop + (JOY_SIZE / 2);
        const DEAD = 8;

        const resetJoy = () => {
          joyTouch.current = null;
          joyState.current.active = false;
          joyState.current.ox = joyCx;
          joyState.current.oy = joyCy;
          joyState.current.dx = 0;
          joyState.current.dy = 0;
          moveSmooth.current = { x: 0, y: 0 };
          moveRef.current = { x: 0, y: 0 };
        };

        const resetLook = () => {
          lookTouch.current = null;
          lookState.current.active = false;
        };

        for (const t of touches) {
          const id = t.identifier as number;
          const x = t.pageX as number;
          const y = t.pageY as number;

          if (joyTouch.current == null && isJoy(x, y)) {
            joyTouch.current = id;
            joyState.current.active = true;
            joyState.current.ox = joyCx;
            joyState.current.oy = joyCy;
            joyState.current.dx = 0;
            joyState.current.dy = 0;
            continue;
          }

          if (lookTouch.current == null && id !== joyTouch.current && x >= LOOK_START_X) {
            lookTouch.current = id;
            lookState.current.active = true;
            lookState.current.lx = x;
            lookState.current.ly = y;
          }
        }

        if (joyTouch.current != null) {
          const t = touches.find((tt:any) => (tt.identifier as number) === joyTouch.current);
          if (!t) {
            resetJoy();
          } else {
            const dx = (t.pageX as number) - joyCx;
            const dy = (t.pageY as number) - joyCy;
            const len = Math.sqrt(dx * dx + dy * dy);

            let sx = 0;
            let sy = 0;

            if (len > DEAD) {
              const maxLen = JOY_R;
              const useLen = Math.min(len, maxLen);
              const k = (useLen - DEAD) / (maxLen - DEAD);
              const ux = dx / (len || 1);
              const uy = dy / (len || 1);
              sx = ux * k;
              sy = uy * k;
            }

            joyState.current.dx = sx * JOY_R;
            joyState.current.dy = sy * JOY_R;

            const target = { x: sx, y: -sy };
            const a = 0.35;
            moveSmooth.current = {
              x: moveSmooth.current.x + (target.x - moveSmooth.current.x) * a,
              y: moveSmooth.current.y + (target.y - moveSmooth.current.y) * a,
            };
            moveRef.current = moveSmooth.current;
          }
        }

        if (lookTouch.current != null) {
          const t = touches.find((tt:any) => (tt.identifier as number) === lookTouch.current);
          if (!t) {
            resetLook();
          } else {
            const x = t.pageX as number;
            const y = t.pageY as number;
            const dx = x - lookState.current.lx;
            const dy = y - lookState.current.ly;
            lookState.current.lx = x;
            lookState.current.ly = y;
            yawRef.current -= dx * 0.0055;
            pitchRef.current = clamp(pitchRef.current - dy * 0.0055, -0.95, 0.95);
          }
        }
      };

      const releaseTouches = (chs:any[]) => {
        const changed = chs || [];
        for (const t of changed) {
          const id = t.identifier as number;
          if (id === joyTouch.current) {
            joyTouch.current = null;
            joyState.current.active = false;
            joyState.current.dx = 0;
            joyState.current.dy = 0;
            moveSmooth.current = { x: 0, y: 0 };
            moveRef.current = { x: 0, y: 0 };
          }
          if (id === lookTouch.current) {
            lookTouch.current = null;
            lookState.current.active = false;
          }
        }
      };
  return (
    <View style={styles.root}
 onStartShouldSetResponder={()=>true}
 onMoveShouldSetResponder={()=>true}
 onResponderGrant={(e)=>handleTouches(e.nativeEvent.touches)}
  onResponderMove={(e)=>handleTouches(e.nativeEvent.touches)}
 onResponderRelease={(e)=>releaseTouches(e.nativeEvent.changedTouches)}
 onResponderTerminate={(e)=>releaseTouches(e.nativeEvent.changedTouches)}>
      <Canvas
        style={{ flex: 1 }}
        gl={{ antialias: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => { try { (gl as any).setClearColor?.("#0a0f18", 1); } catch (e) {}
          reportWorldGate('fantasy', 'canvas-mounted');
        }}
        camera={{ position: [0, 1.55, 0], fov: 65 }}
      >
        <Suspense fallback={null}>
          

<Scene
    onReady={props.onReady}
          walking={!!props.walking}
          moveRef={moveRef}
          yawRef={yawRef}
          pitchRef={pitchRef}
          shootPulse={props.shootPulse}
          bulletDmgEnemy={props.bulletDmgEnemy}
          bulletDmgBoss={props.bulletDmgBoss}
          onPodium={props.onPodium}
          onMonument={props.onMonument}
          onEnemyKilled={props.onEnemyKilled}
        />
                  
        </Suspense>
      </Canvas>

      <View style={[styles.lookLayer, { left: LOOK_START_X, width: W - LOOK_START_X }]} pointerEvents="none"  />

      <View style={[styles.joyWrap, { width: JOY_SIZE, height: JOY_SIZE, bottom: Math.max(24, H * 0.08), left: 18 }]} pointerEvents="none" >
        <View style={styles.joyBase}>
          <View style={[styles.joyThumb, { transform: [{ translateX: joyState.current.dx }, { translateY: joyState.current.dy }] }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', alignSelf: 'stretch', backgroundColor: '#0a0f18' },
  canvas: { flex: 1 },

  lookLayer: { position: 'absolute', top: 0, bottom: 0, right: 0, zIndex: 2 },

  joyWrap: { position: 'absolute', zIndex: 3 },
  joyBase: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joyThumb: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});



export default FantasyWorld3D;

/** Crystal Field (Fantasy sky decoration) **/
const CRYSTAL_URLS: string[] = [CRYSTAL1_URL(), CRYSTAL2_URL(), CRYSTAL3_URL(), CRYSTAL4_URL(), CRYSTAL5_URL()].filter(Boolean).map((u: any) => String(u));

function CrystalGLB(props: {
  uri: string;
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  rotationX?: number;
  rotationZ?: number;
}) {
  if (!props?.uri || !String(props.uri)) return null;
  const gltf: any = useGLTFMeshopt(props.uri as any);
  return (
    <group
      position={props.position as any}
      rotation={[props.rotationX ?? 0, props.rotationY ?? 0, props.rotationZ ?? 0] as any}
    >
      <Clone object={gltf.scene} scale={props.scale ?? 1} />
    </group>
  );
}

function CrystalField(props: { playerPosRef: React.MutableRefObject<THREE.Vector3>; poolSize?: number; seed?: number; }) {
  const poolSize = props.poolSize ?? 32;
  const seedBase = props.seed ?? 1337;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 400);
    return () => clearInterval(t);
  }, []);

  const items = useMemo(() => {
    const out: Array<{ key: number; uri: string; position: [number, number, number]; s: number; rx: number; ry: number; rz: number; }> = [];
    const playerZ = props.playerPosRef.current.z;
    const baseChunk = Math.floor((-playerZ) / CHUNK_LEN);
    for (let i = 0; i < poolSize; i++) {
      const chunk = baseChunk - 2 - i;
      let s = (seedBase ^ (chunk * 1103515245)) >>> 0;
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      const uri = CRYSTAL_URLS[Math.floor(rnd() * CRYSTAL_URLS.length)] || CRYSTAL_URLS[0];
      const x = (rnd() - 0.5) * 70;
      const z = -(chunk * CHUNK_LEN) - (rnd() * CHUNK_LEN);
      const y = 20 + rnd() * 22;
      out.push({ key: i, uri, position: [x, y, z], s: 2 + rnd() * 3.5, rx: (rnd() - 0.5) * 0.2, ry: rnd() * Math.PI * 2, rz: (rnd() - 0.5) * 0.2 });
    }
    return out;
  }, [poolSize, props.playerPosRef, seedBase, tick]);

  return <group>{items.map((it) => <CrystalGLB key={it.key} uri={it.uri} position={it.position} scale={it.s} rotationX={it.rx} rotationY={it.ry} rotationZ={it.rz} />)}</group>;
}
