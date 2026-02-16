import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorldKey } from '../../systems/upgrades/upgradeTypes';
import { loadingThemes } from './loadingThemes';

export function WorldLoadingScreen({ world, progress, asset, tip }: { world: WorldKey; progress: number; asset?: string; tip: string }) {
  const theme = loadingThemes[world];
  const clampedProgress = Math.max(0, Math.min(100, Math.floor(progress)));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]} pointerEvents="auto">
      <View style={[styles.halo, { shadowColor: theme.accent, borderColor: `${theme.accent}66` }]} />
      <Text style={styles.kicker}>{theme.tipPrefix} LINK</Text>
      <Text style={[styles.title, { color: theme.accent }]}>{theme.title}</Text>
      <Text style={styles.percent}>{clampedProgress}%</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${clampedProgress}%`, backgroundColor: theme.accent }]} /></View>
      <Text style={styles.asset}>{asset ?? 'Initializing…'}</Text>
      <Text style={styles.tip}>{tip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 90, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  kicker: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  percent: { color: 'white', fontSize: 36, fontWeight: '900' },
  track: { width: '82%', maxWidth: 420, height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: '100%' },
  asset: { color: '#f2f4ff', fontWeight: '700', textAlign: 'center' },
  tip: { color: '#c3cadf', textAlign: 'center', maxWidth: 320, lineHeight: 19 },
});
