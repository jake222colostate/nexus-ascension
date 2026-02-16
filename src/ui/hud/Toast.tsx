import React from 'react';
import { Text, View } from 'react-native';

export function Toast({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <View style={{ position: 'absolute', bottom: 130, alignSelf: 'center', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
      <Text style={{ color: 'white', fontWeight: '800' }}>{text}</Text>
    </View>
  );
}
