import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type HudButton =
  | { kind: 'press'; label: string; onPress: () => void }
  | { kind: 'hold'; label: string; activeLabel?: string; active?: boolean; onHoldStart: () => void; onHoldEnd: () => void };

export default function GameHUD(props: {
  title: string;
  leftSub: string;
  rightLines?: string[];
    navButtons?: { label: string; onPress: () => void }[];
  buttons: HudButton[];
  onOpenUpgrades: () => void;
  toast?: string;
  upgradesOpen: boolean;
  onCloseUpgrades: () => void;
  upgradesTitle?: string;
  upgradesBody?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  const Panel = (p: { children: React.ReactNode; style?: any }) => (
    <View
      style={[
        {
          backgroundColor: 'rgba(10,15,24,0.72)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          borderRadius: 18,
          padding: 12,
        },
        p.style,
      ]}
    >
      {p.children}
    </View>
  );

  const Btn = (p: { labelTop: string; labelBottom?: string; onPressIn?: () => void; onPressOut?: () => void; onPress?: () => void; active?: boolean }) => {
    const active = !!p.active;
    return (
      <Pressable
        style={{
          flex: 1,
          minHeight: 54,
          backgroundColor: active ? 'rgba(76,217,100,0.18)' : 'rgba(255,255,255,0.10)',
          borderWidth: 1,
          borderColor: active ? 'rgba(76,217,100,0.36)' : 'rgba(255,255,255,0.14)',
          borderRadius: 16,
          paddingVertical: 10,
          paddingHorizontal: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={p.onPress}
        onPressIn={p.onPressIn}
        onPressOut={p.onPressOut}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }} numberOfLines={1}>
          {p.labelTop}
        </Text>
        {p.labelBottom ? (
          <Text style={{ color: 'rgba(255,255,255,0.70)', marginTop: 2, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
            {p.labelBottom}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(12, insets.bottom + 10),
          paddingHorizontal: 14,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <Panel style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.2 }} numberOfLines={1}>
                {props.title}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.70)', marginTop: 4, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                {props.leftSub}
              </Text>
            </Panel>

            <Panel style={{ paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'flex-start', maxWidth: 220 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                {(props.rightLines ?? []).map((t, i) => (
                  <View
                    key={i}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.10)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }} numberOfLines={1}>
                      {t}
                    </Text>
                  </View>
                ))}
              </View></Panel>
          </View>

        <View pointerEvents="box-none">
          {props.toast ? (
            <View
              pointerEvents="none"
              style={{
                marginBottom: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', textAlign: 'center' }} numberOfLines={2}>
                {props.toast}
              </Text>
            </View>
          ) : null}

          <Panel style={{ padding: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn
                labelTop={`Upgrades ${props.upgradesOpen ? '▴' : '▾'}`}
                labelBottom="Open tree"
                onPress={props.onOpenUpgrades}
              />

              {props.buttons.map((b, i) => {
                if (b.kind === 'hold') {
                  const active = !!b.active;
                  return (
                    <Btn
                      key={i}
                      labelTop={active ? (b.activeLabel ?? 'Walking…') : b.label}
                      labelBottom={active ? 'Release to stop' : 'Hold'}
                      active={active}
                      onPressIn={b.onHoldStart}
                      onPressOut={b.onHoldEnd}
                    />
                  );
                }

                return <Btn key={i} labelTop={b.label} onPress={b.onPress} />;
              })}
            </View>
          </Panel>
        </View>
      </View>

      <Modal visible={props.upgradesOpen} transparent animationType="slide" onRequestClose={props.onCloseUpgrades}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={props.onCloseUpgrades} />

        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: Math.max(12, insets.bottom + 10),
            paddingHorizontal: 12,
          }}
        >
          <View
            style={{
              borderRadius: 22,
              backgroundColor: '#0E1628',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.10)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>
                  {props.upgradesTitle ?? 'Upgrades'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                  Tap outside to close
                </Text>
              </View>

              <Pressable
                onPress={props.onCloseUpgrades}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {props.upgradesBody}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
