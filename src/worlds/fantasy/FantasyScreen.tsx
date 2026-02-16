import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import FantasyWorld3D from './FantasyWorld3D';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { fantasyTips } from './fantasyLogic';

export function FantasyScreen({ navigation, game }: any) {
  const [shootPulse, setShootPulse] = useState(0);
  const [moving, setMoving] = useState(false);
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const shootGain = game.stats.fantasyTapGain;
  const onShoot = useCallback(() => {
    setShootPulse((v) => v + 1);
    game.addMana(shootGain);
  }, [game, shootGain]);

  const statRight = useMemo(() => [
    `DPS ${(12 * game.stats.fantasyDamageMult).toFixed(1)}`,
    `Tier ${game.fantasyTier} / Mon ${game.monumentsFantasy}`,
    `K/P ${Math.floor(game.fantasyTier * 10)}/${Math.max(1, game.fantasyTier)}`,
  ] as [string, string, string], [game]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FantasyWorld3D shootPulse={shootPulse} moving={moving} damageMult={game.stats.fantasyDamageMult} onReady={() => setLoading(false)} onEnemyKilled={() => game.addMana(2)} />
      <GameHUD
        currentWorld="Fantasy"
        onSwitchWorld={(target) => navigation.navigate(target)}
        manaText={`Mana ${Math.floor(game.mana)} • +${game.stats.fantasyAutoGain.toFixed(2)}/s`}
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
      {loading ? <WorldLoadingScreen world="fantasy" progress={95} asset="Scene Stabilization" tip={fantasyTips[0]} /> : null}
    </View>
  );
}
