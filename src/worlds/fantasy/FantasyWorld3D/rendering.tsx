import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { Mesh } from 'three';

export function FantasyScene({ moving }: { moving: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * (moving ? 1.7 : 0.5);
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} />
      <mesh ref={ref} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#24381f" />
      </mesh>
    </>
  );
}
