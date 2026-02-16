import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { View } from 'react-native';
import { fantasyCollisionReady } from './collisions';
import { FantasyScene } from './rendering';
import { FantasyWorld3DProps } from './types';

export default function FantasyWorld3D({ moving, onReady }: FantasyWorld3DProps) {
  useEffect(() => {
    fantasyCollisionReady().then(() => onReady?.());
  }, [onReady]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }} camera={{ position: [0, 2.8, 6], fov: 55 }}>
        <FantasyScene moving={moving} />
      </Canvas>
    </View>
  );
}
