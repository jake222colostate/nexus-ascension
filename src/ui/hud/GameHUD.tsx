import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { upgradeData } from '../../systems/upgrades/upgradeData';
import { getUpgradeCost } from '../../systems/upgrades/upgradeEngine';
import { UpgradeLevels } from '../../systems/upgrades/upgradeTypes';

import { hudStyles } from './hudStyles';
import { StatPill } from './HudPills';
import { Toast } from './Toast';
import { WorldTabs } from './WorldTabs';

type World = 'Hub' | 'Fantasy' | 'Skybase';

export function GameHUD(props: {
  currentWorld: World;
  onSwitchWorld: (target: World) => void;

  manaText: string;
  statRight: [string, string, string];

  shootLabel: string;
  onShoot: () => void;

  onMoveStart: () => void;
  onMoveEnd: () => void;

  upgradesOpen: boolean;
  onOpenUpgrades: () => void;
  onCloseUpgrades: () => void;

  toast?: string;

  activeUpgradeTab: 'fantasy' | 'skybase' | 'meta';
  onUpgradeTab: (tab: 'fantasy' | 'skybase' | 'meta') => void;

  levels: UpgradeLevels;
  lockReason?: string;
  onBuyUpgrade: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const upgrades = upgradeData.filter((u) => u.category === props.activeUpgradeTab);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          hudStyles.root,
          {
            paddingTop: insets.top + 6,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        <View style={hudStyles.topWrap}>
          <WorldTabs current={props.currentWorld} onGo={props.onSwitchWorld} />

          <View style={hudStyles.row}>
            <View style={hudStyles.leftStack}>
              <StatPill text={props.manaText} />
              <Pressable
                style={[hudStyles.pill, { alignSelf: 'flex-start', paddingVertical: 7 }]}
                onPress={props.onOpenUpgrades}
              >
                <Text style={hudStyles.pillText}>Upgrades</Text>
              </Pressable>
            </View>

            <View style={hudStyles.rightStack}>
              {props.statRight.map((s) => (
                <StatPill key={s} text={s} />
              ))}
            </View>
          </View>
        </View>

        <View style={hudStyles.bottomRow}>
          <Pressable style={hudStyles.shootBtn} onPress={props.onShoot}>
            <Text style={hudStyles.shootText}>{props.shootLabel}</Text>
          </Pressable>
        </View>

        <Toast text={props.toast} />
      </View>

      <Modal visible={props.upgradesOpen} transparent animationType="slide" onRequestClose={props.onCloseUpgrades}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={props.onCloseUpgrades} />
        <View
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: insets.bottom + 10,
            backgroundColor: '#101826',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            maxHeight: '75%',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
            {(['fantasy', 'skybase', 'meta'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => props.onUpgradeTab(tab)}
                style={[
                  hudStyles.pill,
                  {
                    backgroundColor:
                      props.activeUpgradeTab === tab ? 'rgba(105,157,255,0.75)' : 'rgba(12,17,28,0.8)',
                  },
                ]}
              >
                <Text style={hudStyles.pillText}>{tab.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
            {upgrades.map((up) => {
              const level = props.levels[up.id] ?? 0;
              const cost = getUpgradeCost(up, level);
              const locked = level >= up.maxLevel;

              return (
                <View
                  key={up.id}
                  style={{
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '900' }}>
                    {up.name} Lv.{level}
                  </Text>
                  <Text style={{ color: '#cbd1df' }}>{up.description}</Text>
                  <Text style={{ color: '#9cc0ff', marginTop: 4 }}>Next: {up.effectLabel(level + 1)}</Text>
                  <Text style={{ color: '#d9ddf1', marginTop: 4 }}>Cost: {cost}</Text>

                  <Pressable
                    disabled={locked}
                    onPress={() => props.onBuyUpgrade(up.id)}
                    style={[hudStyles.pill, { marginTop: 8, alignSelf: 'flex-start', opacity: locked ? 0.5 : 1 }]}
                  >
                    <Text style={hudStyles.pillText}>{locked ? 'Maxed' : 'Buy Upgrade'}</Text>
                  </Pressable>
                </View>
              );
            })}
            {props.lockReason ? <Text style={{ color: '#ffb6b6' }}>{props.lockReason}</Text> : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
