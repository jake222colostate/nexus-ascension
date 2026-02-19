import React from 'react';
import { Pressable, Text, View } from 'react-native';

type World = 'Hub' | 'Fantasy' | 'Skybase';

export function WorldTabs({ current, onGo }: { current: World; onGo: (target: World) => void }) {
  const routes: Record<World, Array<{ target: World; label: string }>> = {
    Fantasy: [
      { target: 'Hub', label: 'Hub' },
      { target: 'Skybase', label: 'Sci-Fi' },
    ],
    Hub: [
      { target: 'Fantasy', label: 'Fantasy' },
      { target: 'Skybase', label: 'Sci-Fi' },
    ],
    Skybase: [
      { target: 'Fantasy', label: 'Fantasy' },
      { target: 'Hub', label: 'Hub' },
    ],
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {routes[current].map((b) => (
        <Pressable
          key={b.target}
          onPress={() => onGo(b.target)}
          style={{
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor: 'rgba(16,20,34,0.75)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
