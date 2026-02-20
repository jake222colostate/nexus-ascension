import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkybaseWorld3D from './SkybaseWorld3D';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { skybaseTips } from './skybaseLogic';

export function SkybaseScreen({ navigation, game }: any) {
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const shootGain = game?.stats?.skybaseTapGain ?? 1;

  const onShoot = useCallback(() => {
    if (game?.addEnergy) game.addEnergy(shootGain);
  }, [game, shootGain]);

  const statRight = useMemo(() => [
    `DPS ${(12 * (game?.stats?.skybaseDamageMult ?? 1)).toFixed(1)}`,
    `Tier ${game?.skybaseTier ?? 0} / Mon ${game?.monumentsSkybase ?? 0}`,
    `K/P ${Math.floor((game?.skybaseTier ?? 0) * 10)}/${Math.max(1, game?.skybaseTier ?? 0)}`,
  ] as [string, string, string], [game]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SkybaseWorld3D layer={1} layerHeight={0} />

      <GameHUD
        currentWorld="Skybase"
        onSwitchWorld={(target) => navigation.navigate(target)}
        manaText={`Energy ${Math.floor(game?.energy ?? 0)} • +${(game?.stats?.skybaseAutoGain ?? 0).toFixed(2)}/s`}
        statRight={statRight}
        shootLabel={`Shoot +${shootGain}`}
        onShoot={onShoot}
        onMoveStart={() => undefined}
        onMoveEnd={() => undefined}
        upgradesOpen={upgradesOpen}
        onOpenUpgrades={() => setUpgradesOpen(true)}
        onCloseUpgrades={() => setUpgradesOpen(false)}
        toast={game?.toast ?? ''}
        activeUpgradeTab={game?.activeUpgradeTab}
        onUpgradeTab={game?.setActiveUpgradeTab}
        levels={game?.upgrades ?? {}}
        lockReason={game?.lockReason}
        onBuyUpgrade={game?.buyUpgrade}
      />

      {loading ? <WorldLoadingScreen world="skybase" progress={95} asset="Scene Stabilization" tip={skybaseTips[0]} /> : null}
    </View>
  );
}
