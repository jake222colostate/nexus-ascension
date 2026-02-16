import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { hubTips } from './hubLogic';
import { useWorldLoader } from '../../ui/loading/useWorldLoader';

export function HubScreen({ navigation, game }: any) {
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [switchingTarget, setSwitchingTarget] = useState<'Hub' | 'Fantasy' | 'Skybase' | null>(null);
  const loader = useWorldLoader('hub', hubTips[0]);

  useEffect(() => {
    const id = setTimeout(() => loader.markWorldReady(), 320);
    return () => clearTimeout(id);
  }, [loader]);

  const switchTo = (target: 'Hub' | 'Fantasy' | 'Skybase') => {
    if (target === 'Hub') return;
    setSwitchingTarget(target);
    setTimeout(() => navigation.navigate(target), 60);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#080c12', justifyContent: 'center', alignItems: 'center' }}>
      <Pressable onPress={() => game.tryTierUp('fantasy')} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Advance Fantasy Tier</Text></Pressable>
      <Pressable onPress={() => game.tryTierUp('skybase')} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Advance Skybase Tier</Text></Pressable>
      <Pressable onPress={() => switchTo('Fantasy')} style={{ marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Enter Fantasy</Text></Pressable>
      <Pressable onPress={() => switchTo('Skybase')} style={{ padding: 12, borderRadius: 12, backgroundColor: '#21304b' }}><Text style={{ color: 'white', fontWeight: '800' }}>Enter Skybase</Text></Pressable>

      <GameHUD
        currentWorld="Hub"
        onSwitchWorld={switchTo}
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
      {loader.visible ? <WorldLoadingScreen world="hub" progress={loader.progress.progress} asset={loader.progress.asset} tip={loader.tip} /> : null}
      {switchingTarget ? <WorldLoadingScreen world="hub" progress={25} asset={`Jumping to ${switchingTarget}`} tip="Stabilizing world transfer…" /> : null}
    </View>
  );
}
