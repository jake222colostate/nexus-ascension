import React from 'react';
import { Text, View } from 'react-native';
import { hudStyles } from './hudStyles';

export function StatPill({ text }: { text: string }) {
  return <View style={hudStyles.pill}><Text style={hudStyles.pillText} numberOfLines={1} ellipsizeMode="tail">{text}</Text></View>;
}
