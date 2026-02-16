import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavButton = { label: string; onPress: () => void };

export default function GameHUD(props: {
  title?: string;
  leftSub?: string;
  rightLines?: string[];
  navButtons?: NavButton[];
  toast?: string;

  onOpenUpgrades?: () => void;

  upgradesOpen?: boolean;
  onCloseUpgrades?: () => void;
  upgradesTitle?: string;
  upgradesBody?: React.ReactNode;
}) {
  const rightLines = props.rightLines ?? [];
  const navButtons = props.navButtons ?? [];

  const showUpgrades = !!props.upgradesOpen;
  const upgradesTitle = props.upgradesTitle ?? 'Upgrades';
  const hasUpgrades = !!props.onOpenUpgrades;

  const topRight = useMemo(() => rightLines.slice(0, 3), [rightLines]);

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safe}>
      <View pointerEvents="box-none" style={styles.root}>
        {/* TOP CENTER WORLD TABS (capsule) */}
        {(navButtons.length > 0) && (
          <View pointerEvents="box-none" style={styles.topCenterWrap}>
            <View style={styles.topCapsule}>
              {navButtons.map((b, i) => (
                <Pressable
                  key={i}
                  onPress={b.onPress}
                  style={({ pressed }) => [styles.topTab, pressed && styles.pressed]}
                >
                  <Text style={styles.topTabText}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* TOP LEFT + TOP RIGHT STATS */}
        <View pointerEvents="box-none" style={styles.topStatsRow}>
          {!!props.leftSub && (
            <View style={styles.statPillLeft}>
              <Text style={styles.statText} numberOfLines={1}>{props.leftSub}</Text>
            </View>
          )}

          <View style={styles.rightStack}>
            {topRight.map((t, i) => (
              <View key={i} style={styles.statPillRight}>
                <Text style={styles.statText} numberOfLines={1}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {!!props.toast && (
          <View pointerEvents="none" style={styles.toastWrap}>
            <Text style={styles.toastText} numberOfLines={2}>{props.toast}</Text>
          </View>
        )}

        {/* (No bottom nav/actions here — bottom is handled by FantasyScreen so nothing overlaps.) */}

        <Modal visible={showUpgrades} transparent animationType="fade" onRequestClose={props.onCloseUpgrades}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{upgradesTitle}</Text>
                <Pressable
                  onPress={props.onCloseUpgrades}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                {props.upgradesBody}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  
  upTopBtn: {
    marginTop:  4,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(91, 124, 255, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(91, 124, 255, 0.55)",
  },
  upTopText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },

safe: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  root: { flex: 1 },

  topCenterWrap: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 18, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  topTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  topTabText: { color: '#EAF0FF', fontWeight: '900', fontSize: 14, letterSpacing: 0.2 },

  topStatsRow: {
    position: 'absolute',
    top: 14,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  statPillLeft: {
    maxWidth: '62%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 18, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  rightStack: { alignItems: 'flex-end', gap: 10 },
  statPillRight: {
    maxWidth: 220,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 10, 18, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statText: { color: '#EAF0FF', fontWeight: '900', fontSize: 14, letterSpacing: 0.2 },

  toastWrap: {
    position: 'absolute',
    top: 118,
    left: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(7, 10, 18, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  toastText: { color: '#EAF0FF', fontWeight: '900', fontSize: 12 },

  pressed: { opacity: 0.85 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#0F1626',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.03)' },
  modalTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  closeBtnText: { color: '#D7E1FF', fontWeight: '900', fontSize: 12 },
  modalBody: { padding: 14 },
});
