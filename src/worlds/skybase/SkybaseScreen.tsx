import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkybaseWorld3D from './SkybaseWorld3D';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { skybaseTips } from './skybaseLogic';
import { useWorldLoader } from '../../ui/loading/useWorldLoader';

export function SkybaseScreen({ navigation, game }: any) {
  const [shootPulse, setShootPulse] = useState(0);
  const [moving, setMoving] = useState(false);
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [switchingTarget, setSwitchingTarget] = useState<'Hub' | 'Fantasy' | 'Skybase' | null>(null);
  const loader = useWorldLoader('skybase', skybaseTips[0]);

  const shootGain = game.stats.skybaseTapGain;
  const onShoot = useCallback(() => {
    setShootPulse((v) => v + 1);
    game.addEnergy(shootGain);
  }, [game, shootGain]);

  const statRight = useMemo(() => [
    `DPS ${(12 * game.stats.skybaseDamageMult).toFixed(1)}`,
    `Tier ${game.skybaseTier} / Mon ${game.monumentsSkybase}`,
    `K/P ${Math.floor(game.skybaseTier * 10)}/${Math.max(1, game.skybaseTier)}`,
  ] as [string, string, string], [game]);

  const onSwitchWorld = useCallback((target: 'Hub' | 'Fantasy' | 'Skybase') => {
    if (target === 'Skybase') return;
    setSwitchingTarget(target);
    setTimeout(() => navigation.navigate(target), 60);
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SkybaseWorld3D shootPulse={shootPulse} moving={moving} damageMult={game.stats.skybaseDamageMult} onReady={loader.markWorldReady} onEnemyKilled={() => game.addEnergy(2)} />
      <GameHUD
        currentWorld="Skybase"
        onSwitchWorld={onSwitchWorld}
        manaText={`Energy ${Math.floor(game.energy)} • +${game.stats.skybaseAutoGain.toFixed(2)}/s`}
        statRight={statRight}
        shootLabel={`Shoot +${shootGain}`}
        onShoot={onShoot}
        onMoveStart={() => setMoving(true)}
        onMoveEnd={() => setMoving(false)}
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
      {loader.visible ? <WorldLoadingScreen world="skybase" progress={loader.progress.progress} asset={loader.progress.asset} tip={loader.tip} /> : null}
      {switchingTarget ? <WorldLoadingScreen world="skybase" progress={25} asset={`Jumping to ${switchingTarget}`} tip="Stabilizing world transfer…" /> : null}
    </View>
  );
}
