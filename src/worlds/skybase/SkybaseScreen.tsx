import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkybaseWorld3D from './SkybaseWorld3D';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { skybaseTips } from './skybaseLogic';

export function SkybaseScreen({ navigation, game }: any) {
  const [shootPulse, setShootPulse] = useState(0);
  const [moving, setMoving] = useState(false);
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SkybaseWorld3D shootPulse={shootPulse} moving={moving} damageMult={game.stats.skybaseDamageMult} onReady={() => setLoading(false)} onEnemyKilled={() => game.addEnergy(2)} />
      <GameHUD
        currentWorld="Skybase"
        onSwitchWorld={(target) => navigation.navigate(target)}
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
      {loading ? <WorldLoadingScreen world="skybase" progress={95} asset="Scene Stabilization" tip={skybaseTips[0]} /> : null}
    </View>
  );
}
