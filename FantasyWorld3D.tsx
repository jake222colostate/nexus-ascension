import React, {useEffect, useMemo, useRef, useState, Suspense, useCallback} from 'react';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { View, StyleSheet, useWindowDimensions} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF, useProgress } from '@react-three/drei/native';
import * as THREE from 'three';

// === BVH PATCH (must run once, same THREE instance as R3F) ===
(THREE.BufferGeometry as any).prototype.computeBoundsTree = computeBoundsTree;
(THREE.BufferGeometry as any).prototype.disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh as any).prototype.raycast = acceleratedRaycast;


type EnemyKind = 'enemy' | 'boss';
type Enemy = { id: string; kind: EnemyKind; pos: THREE.Vector3; hp: number; maxHp: number; spd: number };
type Projectile = { id: string; pos: THREE.Vector3; vel: THREE.Vector3; ttl: number };

const CHUNK_LEN = 40;
const CHUNK_BACK = 2;
const CHUNK_AHEAD = 2;

const PATH_W = 5.2;
const GRASS_W = 30;
const MOUNTAIN_X = 88;



const TREE_Y = ((0.02 - 4.0) + 2.0) + 2.0;
const SPAWN_MAX_Z = 6.0; // cannot go behind spawn beyond this (+Z)
const PLAYER_RADIUS = 0.55;
const ENEMY_RADIUS = 0.55;
const PODIUM_HALF = 1.1;
const SHOW_DEBUG_WALL = false; // TEMP: set false after you confirm placement

const MOUNTAIN_URL = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/environment-fantasy3d/mountain_v2.glb';

const GAZEBO_URL = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/environment-fantasy3d/spawn_gazebo.glb';

const FOREST_TREE_URL = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/environment-fantasy3d/forest_tree.glb';
useGLTF.preload(MOUNTAIN_URL);
useGLTF.preload(GAZEBO_URL);

useGLTF.preload(FOREST_TREE_URL);
const FOREST_FOREST_TREE_URL = 'https://sosfewysdevfgksvfbkf.supabase.co/storage/v1/object/public/game-assets/environment-fantasy3d/forest_tree.glb';
useGLTF.preload(FOREST_FOREST_TREE_URL);

function MountainGLB(props: { position: [number, number, number]; scale?: number | [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTF(MOUNTAIN_URL);

  const obj = useMemo<THREE.Object3D>(() => {
    const clone = scene.clone(true);
    clone.traverse((m: any) => {
      if (!m?.isMesh || !m.geometry) return;
      const g: any = m.geometry;
      if (!g.boundsTree) {
        g.boundsTree = new MeshBVH(g);
      }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={obj}
      position={props.position}
      scale={props.scale ?? 1}
      rotation={[0, props.rotationY ?? 0, 0]}
    />
  );
}


function GazeboGLB(props: { position: [number, number, number]; scale?: number; rotationY?: number }) {
  const { scene } = useGLTF(GAZEBO_URL);
  const obj = useMemo(() => {
    const c: any = scene.clone(true);
    // build BVH for gazebo meshes
    try {
      c.traverse((m: any) => {
        if (!m?.isMesh || !m.geometry) return;
        const g: any = m.geometry;
        if (!g.boundsTree) g.boundsTree = new MeshBVH(g);
      });
    } catch {}
    try {
      const box = new THREE.Box3().setFromObject(c);
      const minY = box?.min?.y;
      if (typeof minY === 'number' && isFinite(minY) && Math.abs(minY) > 1e-5) {
        // lift so the lowest vertex sits on y=0
        c.position.y -= minY;
      }
    } catch {}
    return c;
  }, [scene]);
  return (
    <primitive
      object={obj}
      position={props.position}
      scale={props.scale ?? 1}
      rotation={[0, props.rotationY ?? 0, 0]}
    />
  );
}
function ForestTreeGLB(props: { position: [number, number, number]; scale?: number; rotationY?: number }) {
  const { scene } = useGLTF(FOREST_FOREST_TREE_URL);

  const memo = useMemo(() => {
    const c: any = scene.clone(true);
    let minY = 0;
    try {
      const box = new THREE.Box3().setFromObject(c);
      const v = box?.min?.y;
      if (typeof v === 'number' && isFinite(v)) minY = v;
    } catch {}
    return { obj: c as THREE.Object3D, minY };
  }, [scene]);

  const s = (props.scale ?? 1);
  const sy = (typeof s === 'number') ? s : 1;
  const y = props.position[1] - (memo.minY * sy);

  return (
    <primitive
      object={memo.obj}
      position={[props.position[0], y, props.position[2]]}
      scale={s}
      rotation={[0, props.rotationY ?? 0, 0]}
    />
  );
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }

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
  return { id, kind, pos: new THREE.Vector3(x, kind === 'boss' ? 1.2 : 0.7, z), hp, maxHp, spd };
}

function Chunk(props: { idx: number; centerZ: number; showGazebo?: boolean; onMountains?: (idx: number, roots: any[]) => void; onGazebo?: (roots: any[]) => void }) {
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

  const gazeboRef = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    const tick = () => {
      if (!alive) return;
      const roots = [leftMountainRef.current, rightMountainRef.current].filter(Boolean);
      const gz = (props.idx === 0 && !!props.showGazebo) ? gazeboRef.current : null;
      if (props.idx === 0) props.onGazebo?.(gz ? [gz] : []);
      if (roots.length) {
        props.onMountains?.(props.idx, roots);
                if (false) console.log('[BVH] registerChunk', { idx: props.idx, roots: roots.length });
        try {
          const boxes = roots.map((r) => {
            const b = new THREE.Box3().setFromObject(r);
            return {
              min: [Number(b.min.x.toFixed(2)), Number(b.min.y.toFixed(2)), Number(b.min.z.toFixed(2))],
              max: [Number(b.max.x.toFixed(2)), Number(b.max.y.toFixed(2)), Number(b.max.z.toFixed(2))],
            };
          });
          if (true) console.log('[BVH] mountainBox', { idx: props.idx, boxes });
        } catch (e) {
          console.log('[BVH] mountainBox error', String(e));
        }

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
      props.onMountains?.(props.idx, []);
      if (props.idx === 0) props.onGazebo?.([]);
    };
  }, [props.idx, props.onMountains]);

  return (
    <group position={[0, 0, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[PATH_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#2f3a2f'} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[GRASS_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#3a4f3a'} />
      </mesh>

      {/* Forest trees */}
      {forestTrees.map(t => (
        <ForestTreeGLB
          key={t.id}
          position={[t.x, TREE_Y, t.z]}
          scale={t.s * 7}
          rotationY={t.ry}
        />
      ))}


        {(idx === 0 && !!props.showGazebo) ? (
          <group ref={gazeboRef}>
            <GazeboGLB position={[0, 0, 0]} scale={12.0} rotationY={Math.PI} />
          </group>
        ) : null}



        <group>
          <group ref={leftMountainRef}>
            <MountainGLB position={[-(MOUNTAIN_X - 26.35), 30.0, 0]} scale={[55.0, 110.0, 110.0]} rotationY={(idx % 2 === 0) ? 0 : Math.PI} />
          </group>
          <group ref={rightMountainRef}>
            <MountainGLB position={[ (MOUNTAIN_X - 26.35), 30.0, 0]} scale={[55.0, 110.0, 110.0]} rotationY={(idx % 2 === 0) ? Math.PI : 0} />
          </group>
        </group>
    </group>
  );
}

function Scene(props: {
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
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0));
    const mountainRootsRef = useRef<any[]>([]);
  const gazeboRootsRef = useRef<any[]>([]);

    const mountainChunkMapRef = useRef<Map<number, any[]>>(new Map());
    
    const tmpMountainRootsRef = useRef<any[]>([]);
const onMountains = useCallback((idx: number, roots: any[]) => {
      if (roots && roots.length) mountainChunkMapRef.current.set(idx, roots);
      else mountainChunkMapRef.current.delete(idx);
      const flat: any[] = [];
      for (const arr of mountainChunkMapRef.current.values()) flat.push(...arr);
      mountainRootsRef.current = flat;
    }, []);
  const onGazebo = useCallback((roots: any[]) => { gazeboRootsRef.current = roots || []; }, []);
    const showGazebo = Math.abs(playerPosRef.current.z) < 90;
  const simAcc = useRef(0);
    const moveVelRef = useRef({ x: 0, y: 0 });
  const hadRuntimeErr = useRef(false);
    const lastMountainCountRef = useRef(-1);

  const [chunkTick, setChunkTick] = useState(0);
  const baseChunkRef = useRef(0);

  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projRef = useRef<Projectile[]>([]);
  projRef.current = projectiles;

  const [enemies, setEnemies] = useState<Enemy[]>(() => [makeEnemy('enemy', -12)]);
  const enemiesRef = useRef<Enemy[]>([]);
  enemiesRef.current = enemies;

  const lastShootPulse = useRef(0);
  const spawnT = useRef(0);

  const podiums = useMemo(() => {
    const out: { id: string; side: 1 | -1; z: number }[] = [];
    for (let i = 1; i <= 30; i++) {
      const side = (i % 2 === 0 ? 1 : -1) as 1 | -1;
      out.push({ id: `pod_${i}`, side, z: -i * 26 });
    }
    return out;
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
  const monument = useMemo(() => ({ id: 'monument_1', side: 1 as 1, z: -320 }), []);
  const collectedRef = useRef<Record<string, 1>>({});
  const [collectedTick, setCollectedTick] = useState(0);

  function fireAtNearest(playerPos: THREE.Vector3) {
    const list = enemiesRef.current.filter(e => e.hp > 0);
    if (!list.length) return;

    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of list) {
      const d = playerPos.distanceTo(e.pos);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) return;

    const origin = new THREE.Vector3(playerPos.x, 1.05, playerPos.z - 0.2);
    const to = best.pos.clone().add(new THREE.Vector3(0, best.kind === 'boss' ? 1.2 : 0.4, 0));
    const dir = to.clone().sub(origin);
    const len = dir.length();
    if (len < 0.001) return;
    dir.multiplyScalar(1 / len);

    const spread = best.kind === 'boss' ? 0.10 : 0.14;
    const sx = (Math.random() - 0.5) * 2 * spread;
    const sy = (Math.random() - 0.5) * 2 * spread;
    const sz = (Math.random() - 0.5) * 2 * spread;

    const finalDir = dir.clone().add(new THREE.Vector3(sx, sy, sz)).normalize();
    const speed = 22;

    const id = `p${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setProjectiles(prev => prev.concat([{
      id,
      pos: origin,
      vel: finalDir.multiplyScalar(speed),
      ttl: 2.2,
    }]));
  }

  useFrame(({ camera }, dt) => {
    if (hadRuntimeErr.current) return;
    try {
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




                    // COLLISION: podiums (2D AABB)
          const nearPodiumBoxes: AABB2[] = [];
          for (const b of podiumBoxes) {
            if (collectedRef.current[b.id]) continue;
            const cz = (b.minZ + b.maxZ) * 0.5;
            const dz = cz - p.z;
            if (Math.abs(dz) > 60) continue; // only nearby colliders
            nearPodiumBoxes.push(b);
          }
          resolveCircleAABBs(p, PLAYER_RADIUS, nearPodiumBoxes);
                        const mcnt = mountainRootsRef.current.length;
            if (mcnt !== lastMountainCountRef.current) {
              lastMountainCountRef.current = mcnt;
              if (false) console.log('[BVH] mountainRoots', { count: mcnt });
            }

            const curChunkIdx = Math.floor((-p.z) / CHUNK_LEN);
            const tmp = tmpMountainRootsRef.current;
            tmp.length = 0;
            const a0 = mountainChunkMapRef.current.get(curChunkIdx);
            const a1 = mountainChunkMapRef.current.get(curChunkIdx - 1);
            const a2 = mountainChunkMapRef.current.get(curChunkIdx + 1);
            if (a0) tmp.push(...a0);
            if (a1) tmp.push(...a1);
            if (a2) tmp.push(...a2);
            resolveSphereMeshBVH(p, PLAYER_RADIUS, tmp);
            if (gazeboRootsRef.current.length) resolveSphereMeshBVH(p, PLAYER_RADIUS, gazeboRootsRef.current);
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
          fireAtNearest(p);
        }

        const alive = enemiesRef.current.filter(e => e.hp > 0);
        if (alive.length) {
          let moved = false;
          const nextEnemies = alive.map(e => {
            const dir = p.clone().sub(e.pos);
            dir.y = 0;
            const d = dir.length();
            if (d > 0.001) dir.multiplyScalar(1 / d);

            const reach = e.kind === 'boss' ? 1.8 : 1.15;
            const canStep = Math.max(0, d - reach);
            const step = Math.min(canStep, e.spd * stepDt);
            if (step > 0.0001) {
              moved = true;
              const np = e.pos.clone().add(dir.multiplyScalar(step));
                const ep = np;
                resolveCircleAABBs(ep, ENEMY_RADIUS, nearPodiumBoxes);
                
                  resolveSphereMeshBVH(ep, ENEMY_RADIUS, tmp);                  if (gazeboRootsRef.current.length) resolveSphereMeshBVH(ep, ENEMY_RADIUS, gazeboRootsRef.current);
return { ...e, pos: ep };
            }
            return e;
          });
          if (moved) setEnemies(nextEnemies);
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
    } catch (e) {
      hadRuntimeErr.current = true;
      console.error(e);
    }
  });

  const chunks = useMemo(() => Array.from({ length: CHUNK_BACK + CHUNK_AHEAD + 1 }, (_, i) => i - CHUNK_BACK), []);
  const baseChunk = baseChunkRef.current;

  const fogColor = '#0a0f18';

  return (
  <>
      <fog attach="fog" args={[fogColor, 6, 110]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 10, 6]} intensity={1.35} />
      <directionalLight position={[-6, 8, -6]} intensity={0.55} />

        {SHOW_DEBUG_WALL ? (
          <mesh position={[0, 1.2, 1.0]}>
            <boxGeometry args={[34, 6, 0.35]} />
            <meshStandardMaterial color={'#ff00ff'} />
          </mesh>
        ) : null}


      {chunks.map((i) => {
        const chunkIdx = baseChunk + i;
        const centerZ = -(chunkIdx * CHUNK_LEN) - (CHUNK_LEN / 2);
        return <Chunk key={`c_${chunkIdx}`} idx={chunkIdx} centerZ={centerZ} showGazebo={showGazebo} onMountains={onMountains}  onGazebo={onGazebo} />;
      })}

      {podiums.map((pd) => {
        const playerZ = playerPosRef.current.z;
        if (pd.z > playerZ + 18) return null;
        if (pd.z < playerZ - 900) return null;
        if (collectedRef.current[pd.id]) return null;
        const x = pd.side * 3.8;
        return (
          <mesh
            key={pd.id}
            position={[x, 0.35, pd.z]}
            onPointerDown={() => {
              if (collectedRef.current[pd.id]) return;
              collectedRef.current[pd.id] = 1;
              setCollectedTick(t => t + 1);
              props.onPodium();
            }}
          >
            <boxGeometry args={[1.35, 0.75, 1.35]} />
            <meshStandardMaterial color={'#c7b38a'} />
          </mesh>
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
          <mesh position={[e.pos.x, e.pos.y, e.pos.z]} scale={e.kind === 'boss' ? [4, 4, 4] : [1.5, 1.5, 1.5]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={e.kind === 'boss' ? '#7b2b2b' : '#8b2f2f'} />
          </mesh>

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

      {projectiles.map((pr) => (
        <mesh key={pr.id} position={[pr.pos.x, pr.pos.y, pr.pos.z]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color={'#ffffff'} />
        </mesh>
      ))}
    </>
  );
}

export default function FantasyWorld3D(props: {
  walking?: boolean;
  shootPulse: number;
  bulletDmgEnemy: number;
  bulletDmgBoss: number;
  onPodium: () => void;
  onMonument: () => void;
  onEnemyKilled: (kind: EnemyKind) => void;
}) {
  const { width: W, height: H } = useWindowDimensions();

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
        style={styles.canvas}
        gl={{ antialias: true }}
        onCreated={({ gl }) => { try { (gl as any).setClearColor?.('#0a0f18', 1); } catch (e) {} }}
        camera={{ position: [0, 1.55, 0], fov: 65 }}
      >
        <Suspense fallback={null}>
          

          <Scene
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
  root: { flex: 1, backgroundColor: '#0a0f18' },
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
