import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

type EnemyKind = 'enemy' | 'boss';
type Enemy = { id: string; kind: EnemyKind; pos: THREE.Vector3; hp: number; maxHp: number; spd: number };
type Projectile = { id: string; pos: THREE.Vector3; vel: THREE.Vector3; ttl: number };

const CHUNK_LEN = 40;
const CHUNK_BACK = 24;
const CHUNK_AHEAD = 14;

const PATH_W = 5.2;
const GRASS_W = 30;
const MOUNTAIN_X = 20;

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function makeEnemy(kind: EnemyKind, z: number): Enemy {
  const id = `${kind}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const x = rand(-10, 10);
  const maxHp = kind === 'boss' ? 120 : 40;
  const hp = maxHp;
  const spd = kind === 'boss' ? 2.1 : 2.7;
  return { id, kind, pos: new THREE.Vector3(x, kind === 'boss' ? 1.2 : 0.7, z), hp, maxHp, spd };
}

function Chunk(props: { idx: number; centerZ: number }) {
  const { idx, centerZ } = props;

  const mountainBands = useMemo(() => {
    const zs: number[] = [];
    for (let i = 0; i < 7; i++) zs.push(centerZ + (i * (CHUNK_LEN / 6)) - (CHUNK_LEN / 2));
    return zs;
  }, [centerZ]);

  return (
    <group position={[0, 0, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[PATH_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#2f3a2f'} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[GRASS_W, CHUNK_LEN]} />
        <meshStandardMaterial color={'#3a4f3a'} />
      </mesh>

      <group>
        {mountainBands.map((mz, i) => (
          <group key={`m_${idx}_${i}`}>
            <mesh position={[-MOUNTAIN_X, 2.2, mz - centerZ]}>
              <coneGeometry args={[4.2, 7.5, 6]} />
              <meshStandardMaterial color={'#405a3f'} />
            </mesh>
            <mesh position={[MOUNTAIN_X, 2.2, mz - centerZ]}>
              <coneGeometry args={[4.2, 7.5, 6]} />
              <meshStandardMaterial color={'#405a3f'} />
            </mesh>
          </group>
        ))}
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
  const playerPosRef = useRef(new THREE.Vector3(0, 0.6, 0));
  const simAcc = useRef(0);
    const moveVelRef = useRef({ x: 0, y: 0 });
  const hadRuntimeErr = useRef(false);

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


        p.x = clamp(p.x, -12.5, 12.5);

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
              return { ...e, pos: e.pos.clone().add(dir.multiplyScalar(step)) };
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

  const chunks = useMemo(() => Array.from({ length: CHUNK_BACK + CHUNK_AHEAD }, (_, i) => i - CHUNK_BACK), []);
  const baseChunk = baseChunkRef.current;

  const fogColor = '#0a0f18';

  return (
    <>
      <fog attach="fog" args={[fogColor, 6, 110]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 10, 6]} intensity={1.35} />
      <directionalLight position={[-6, 8, -6]} intensity={0.55} />

      {chunks.map((i) => {
        const chunkIdx = baseChunk + i;
        const centerZ = -(chunkIdx * CHUNK_LEN) - (CHUNK_LEN / 2);
        return <Chunk key={`c_${chunkIdx}_${chunkTick}`} idx={chunkIdx} centerZ={centerZ} />;
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
