import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorldKey } from '../../systems/upgrades/upgradeTypes';
import { loadingThemes } from './loadingThemes';

export function WorldLoadingScreen({ world, progress, asset, tip }: { world: WorldKey; progress: number; asset?: string; tip: string }) {
  const theme = loadingThemes[world];
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.accent }]}>{theme.title}</Text>
      <Text style={styles.percent}>{progress}%</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.accent }]} /></View>
      <Text style={styles.asset}>{asset ?? 'Initializing…'}</Text>
      <Text style={styles.tip}>{tip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '900' },
  percent: { color: 'white', fontSize: 34, fontWeight: '900' },
  track: { width: '70%', height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  fill: { height: '100%' },
  asset: { color: '#dfdfdf', fontWeight: '700' },
  tip: { color: '#bcbcbc', textAlign: 'center', maxWidth: 280 },
});
