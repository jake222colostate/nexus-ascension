import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { hubTips } from './hubLogic';

export function HubScreen({ navigation, game }: any) {
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: '#080c12', justifyContent: 'center', alignItems: 'center' }}>
      {loading ? <WorldLoadingScreen world="hub" progress={100} asset="Nexus Services" tip={hubTips[0]} /> : null}
      <Pressable onPress={() => { setLoading(false); game.tryTierUp('fantasy'); }} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Advance Fantasy Tier</Text></Pressable>
      <Pressable onPress={() => game.tryTierUp('skybase')} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Advance Skybase Tier</Text></Pressable>
      <Pressable onPress={() => navigation.navigate('Fantasy')} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Enter Fantasy</Text></Pressable>
      <Pressable onPress={() => navigation.navigate('Skybase')} style={{ padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Enter Skybase</Text></Pressable>

      <GameHUD
        currentWorld="Hub"
        onSwitchWorld={(target) => navigation.navigate(target)}
        manaText={`Mana ${Math.floor(game.mana)} • Energy ${Math.floor(game.energy)}`}
        statRight={[`Fantasy T${game.fantasyTier}`, `Skybase T${game.skybaseTier}`, `Mon ${game.monumentsFantasy + game.monumentsSkybase}`]}
        shootLabel="Shoot +1"
        onShoot={() => game.addMana(1)}
        onMoveStart={() => undefined}
        onMoveEnd={() => undefined}
        upgradesOpen={upgradesOpen}
        onOpenUpgrades={() => setUpgradesOpen(true)}
        onCloseUpgrades={() => setUpgradesOpen(false)}
        toast={game.toast}
        activeUpgradeTab={game.activeUpgradeTab}
        onUpgradeTab={game.setActiveUpgradeTab}
        levels={game.upgrades}
        lockReason={game.lockReason}
        onBuyUpgrade={game.buyUpgrade}
      />
    </View>
  );
}
