import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { View } from 'react-native';
import { skyCollisionReady } from './collisions';
import { SkybaseScene } from './rendering';
import { SkybaseWorld3DProps } from './types';

export default function SkybaseWorld3D({ moving, onReady }: SkybaseWorld3DProps) {
  useEffect(() => {
    skyCollisionReady().then(() => onReady?.());
  }, [onReady]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }} camera={{ position: [0, 3, 7], fov: 55 }}>
        <SkybaseScene moving={moving} />
      </Canvas>
    </View>
  );
}
