import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import { Mesh } from 'three';

export function SkybaseScene({ moving }: { moving: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.x += dt * 0.6;
      ref.current.rotation.z += dt * (moving ? 1.8 : 0.8);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 4, 0]} intensity={30} color="#44d9ff" />
      <mesh ref={ref}>
        <torusKnotGeometry args={[1, 0.3, 100, 16]} />
        <meshStandardMaterial color="#21bcff" emissive="#0c5e7a" emissiveIntensity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#111a29" />
      </mesh>
    </>
  );
}
