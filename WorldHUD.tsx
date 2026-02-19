import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type World = 'Hub' | 'Fantasy' | 'Skybase';

type UpgradeRow = {
  id: string;
  title: string;
  desc?: string;
  level?: number;
  costText?: string;
  disabled?: boolean;
};

export function WorldHUD(props: {
  currentWorld: World;
  onSwitchWorld: (target: World) => void;

  leftTopText: string;              // e.g. "Mana 123 • +0.25/s"
  rightLines: [string, string, string];

  upgradesOpen: boolean;
  onOpenUpgrades: () => void;
  onCloseUpgrades: () => void;

  toast?: string;

  // movement
  onMoveStart: () => void;
  onMoveEnd: () => void;

  // shoot
  showShoot?: boolean;              // true for Fantasy/Skybase, optional for Hub
  shootLabel?: string;              // e.g. "Shoot +5"
  onShoot?: () => void;

  // upgrades modal content (simple + safe)
  upgradeTabs?: Array<{ key: string; label: string }>;   // default: FANTASY / SKYBASE / META
  activeUpgradeTab?: string;
  onUpgradeTab?: (tabKey: string) => void;

  upgradeRows?: UpgradeRow[];
  onBuyUpgrade?: (id: string) => void;

  lockReason?: string;              // optional banner in modal
}) {
  const insets = useSafeAreaInsets();

  const upgradeTabs = props.upgradeTabs ?? [
    { key: 'fantasy', label: 'FANTASY' },
    { key: 'skybase', label: 'SKYBASE' },
    { key: 'meta', label: 'META' },
  ];

  const routes: Record<World, Array<{ target: World; label: string }>> = useMemo(
    () => ({
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
    }),
    []
  );

  const showShoot = !!props.showShoot && !!props.onShoot;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.root,
          {
            paddingTop: insets.top + 6,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        {/* TOP */}
        <View style={styles.topWrap}>
          <View style={styles.tabsRow}>
            {routes[props.currentWorld].map((b) => (
              <Pressable
                key={b.target}
                onPress={() => props.onSwitchWorld(b.target)}
                style={styles.tabBtn}
              >
                <Text style={styles.tabText}>{b.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.leftStack}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{props.leftTopText}</Text>
              </View>

              <Pressable
                onPress={props.onOpenUpgrades}
                style={[styles.pill, { alignSelf: 'flex-start', paddingVertical: 7 }]}
              >
                <Text style={styles.pillText}>Upgrades</Text>
              </Pressable>
            </View>

            <View style={styles.rightStack}>
              {props.rightLines.map((s) => (
                <View key={s} style={styles.pill}>
                  <Text style={styles.pillText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* BOTTOM */}
        <View style={styles.bottomRow} pointerEvents="box-none">
          {showShoot ? (
            <Pressable style={styles.shootBtn} onPress={props.onShoot}>
              <Text style={styles.shootText}>{props.shootLabel ?? 'Shoot'}</Text>
            </Pressable>
          ) : (
            <View style={{ width: 160 }} />
          )}
        </View>

        {/* TOAST */}
        {props.toast ? (
          <View pointerEvents="none" style={styles.toastWrap}>
            <View style={styles.toastPill}>
              <Text style={styles.toastText}>{props.toast}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* UPGRADES MODAL */}
      <Modal
        visible={props.upgradesOpen}
        transparent
        animationType="slide"
        onRequestClose={props.onCloseUpgrades}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          onPress={props.onCloseUpgrades}
        />
        <View
          style={[
            styles.modalCard,
            {
              bottom: insets.bottom + 10,
            },
          ]}
        >
          <View style={styles.modalTabs}>
            {upgradeTabs.map((t) => {
              const active = props.activeUpgradeTab ? props.activeUpgradeTab === t.key : t.key === 'fantasy';
              return (
                <Pressable
                  key={t.key}
                  onPress={() => props.onUpgradeTab?.(t.key)}
                  style={[
                    styles.pill,
                    active ? styles.pillActive : null,
                  ]}
                >
                  <Text style={styles.pillText}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {props.lockReason ? (
            <View style={styles.lockBanner}>
              <Text style={styles.lockText}>{props.lockReason}</Text>
            </View>
          ) : null}

          <ScrollView style={{ paddingHorizontal: 12 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {(props.upgradeRows ?? []).map((u) => (
              <View key={u.id} style={styles.upRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upTitle}>
                    {u.title}{typeof u.level === 'number' ? `  •  Lv ${u.level}` : ''}
                  </Text>
                  {u.desc ? <Text style={styles.upDesc}>{u.desc}</Text> : null}
                  {u.costText ? <Text style={styles.upCost}>{u.costText}</Text> : null}
                </View>

                <Pressable
                  disabled={!!u.disabled}
                  onPress={() => props.onBuyUpgrade?.(u.id)}
                  style={[styles.buyBtn, u.disabled ? styles.buyBtnDisabled : null]}
                >
                  <Text style={styles.buyText}>BUY</Text>
                </Pressable>
              </View>
            ))}

            {(props.upgradeRows ?? []).length === 0 ? (
              <View style={{ paddingVertical: 18 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>
                  No upgrades loaded yet.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

export default WorldHUD;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topWrap: { paddingHorizontal: 14, gap: 10 },

  tabsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },

  tabBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(16,20,34,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tabText: { color: 'white', fontWeight: '900', fontSize: 12 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftStack: { gap: 8, flex: 1 },
  rightStack: { gap: 8, alignItems: 'flex-end' },

  pill: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(12,17,28,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: {
    backgroundColor: 'rgba(105,157,255,0.75)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: { color: 'white', fontWeight: '800', fontSize: 12 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16 },
  joystickRing: { width: 106, height: 106, borderRadius: 53, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  joystick: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  joystickText: { color: 'white', fontWeight: '900' },

  shootBtn: { minWidth: 160, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#3f74ff', borderWidth: 1, borderColor: '#7ea0ff', alignItems: 'center', justifyContent: 'center' },
  shootText: { color: 'white', fontWeight: '900', fontSize: 19, textAlign: 'center' },

  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 130, alignItems: 'center' },
  toastPill: { backgroundColor: 'rgba(12,17,28,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  toastText: { color: 'white', fontWeight: '800' },

  modalCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    backgroundColor: '#101826',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxHeight: '75%',
    overflow: 'hidden',
  },
  modalTabs: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, gap: 10 },

  lockBanner: { marginHorizontal: 12, marginBottom: 10, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,102,102,0.12)', borderWidth: 1, borderColor: 'rgba(255,102,102,0.25)' },
  lockText: { color: '#ffb6b6', fontWeight: '800' },

  upRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  upTitle: { color: 'white', fontWeight: '900' },
  upDesc: { color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '700' },
  upCost: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontWeight: '800' },

  buyBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(105,157,255,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  buyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' },
  buyText: { color: 'white', fontWeight: '900' },
});
