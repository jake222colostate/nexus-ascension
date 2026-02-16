import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { worldTabTargets } from './worldTabsConfig';

export function WorldTabs({ current, onGo }: { current: 'Hub' | 'Fantasy' | 'Skybase'; onGo: (target: 'Hub' | 'Fantasy' | 'Skybase') => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }} pointerEvents="box-none">
      {worldTabTargets[current].map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onGo(tab)}
          style={{
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: 'rgba(16,20,34,0.86)',
            borderWidth: 1,
            borderColor: 'rgba(190,215,255,0.45)',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 0.6 }}>{tab.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}
