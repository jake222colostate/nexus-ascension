import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function WorldTabs({ current, onGo }: { current: string; onGo: (target: 'Hub' | 'Fantasy' | 'Skybase') => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
      {(['Hub', 'Fantasy', 'Skybase'] as const).map((tab) => (
        <Pressable key={tab} onPress={() => onGo(tab)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: current === tab ? 'rgba(105,157,255,0.85)' : 'rgba(16,20,34,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>{tab}</Text>
        </Pressable>
      ))}
    </View>
  );
}
