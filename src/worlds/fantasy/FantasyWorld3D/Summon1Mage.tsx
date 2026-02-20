import React, { useEffect, useMemo, useRef } from "react";
import { Asset } from "expo-asset";
import { useGLTF, useAnimations } from "@react-three/drei/native";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

export type Summon1Anim = "walk" | "run" | "cast1" | "cast2" | "cast3";

const SUMMON_BASE_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/summon_texture.glb")
).uri;

const SUMMON_WALK_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/walking.glb")
).uri;

const SUMMON_RUN_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/running.glb")
).uri;

const SUMMON_CAST1_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/spellcast1.glb")
).uri;

const SUMMON_CAST2_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/spellcast2.glb")
).uri;

const SUMMON_CAST3_URL = Asset.fromModule(
  require("../../../../assets/glb/fantasy3d/Summons/Summons1/spellcast3.glb")
).uri;

useGLTF.preload(SUMMON_BASE_URL as any);
useGLTF.preload(SUMMON_WALK_URL as any);
useGLTF.preload(SUMMON_RUN_URL as any);
useGLTF.preload(SUMMON_CAST1_URL as any);
useGLTF.preload(SUMMON_CAST2_URL as any);
useGLTF.preload(SUMMON_CAST3_URL as any);

export default function Summon1Mage(props: {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  anim: Summon1Anim;
}) {
  const ref = useRef<THREE.Group>(null);

  const baseG: any = useGLTF(SUMMON_BASE_URL as any);
  const walkG: any = useGLTF(SUMMON_WALK_URL as any);
  const runG: any = useGLTF(SUMMON_RUN_URL as any);
  const c1G: any = useGLTF(SUMMON_CAST1_URL as any);
  const c2G: any = useGLTF(SUMMON_CAST2_URL as any);
  const c3G: any = useGLTF(SUMMON_CAST3_URL as any);

  const baseScene: any = (baseG && baseG.scene) ? baseG.scene : (Array.isArray(baseG) ? baseG[0]?.scene : null);

  const obj = useMemo<any>(() => {
    if (!baseScene) return null;
    const c: any = SkeletonUtils.clone(baseScene);
    c.traverse((m: any) => {
      if (!m?.isMesh) return;
      m.frustumCulled = false;
      if (m.material) {
        try { m.material.transparent = false; } catch {}
      }
    });
    return c;
  }, [baseScene]);

  const clips = useMemo<THREE.AnimationClip[]>(() => {
    const out: THREE.AnimationClip[] = [];

    const add = (g: any, name: Summon1Anim) => {
      const arr: any[] = Array.isArray(g?.animations) ? g.animations : [];
      for (const c of arr) {
        const cc: any = c?.clone ? c.clone() : c;
        if (!cc) continue;
        cc.name = name;
        out.push(cc);
      }
    };

    add(walkG, "walk");
    add(runG, "run");
    add(c1G, "cast1");
    add(c2G, "cast2");
    add(c3G, "cast3");

    return out;
  }, [walkG, runG, c1G, c2G, c3G]);

  const { actions } = useAnimations(clips, ref);

  useEffect(() => {
    if (!actions) return;

    const key = props.anim;
    const keys = Object.keys(actions as any);

    let act: any = (actions as any)[key];
    if (!act && key === "run") act = (actions as any)["walk"];
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

      const isCast = key === "cast1" || key === "cast2" || key === "cast3";
      if (isCast) {
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
