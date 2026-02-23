import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import FantasyWorld3D from './FantasyWorld3D';
import { GameHUD } from '../../ui/hud/GameHUD';
import { WorldLoadingScreen } from '../../ui/loading/WorldLoadingScreen';
import { fantasyTips } from './fantasyLogic';

export function FantasyScreen({ navigation, game }: any) {
  const [shootPulse, setShootPulse] = useState(0);
  const [walking, setWalking] = useState(false);
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const shootGain = game?.stats?.fantasyTapGain ?? 1;

  const onShoot = useCallback(() => {
    setShootPulse((v) => v + 1);
    if (game?.addMana) game.addMana(shootGain);
  }, [game, shootGain]);

  const statRight = useMemo(() => [
    `DPS ${(12 * (game?.stats?.fantasyDamageMult ?? 1)).toFixed(1)}`,
    `Tier ${game?.fantasyTier ?? 0} / Mon ${game?.monumentsFantasy ?? 0}`,
    `K/P ${Math.floor((game?.fantasyTier ?? 0) * 10)}/${Math.max(1, game?.fantasyTier ?? 0)}`,
  ] as [string, string, string], [game]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FantasyWorld3D
        walking={walking}
        shootPulse={shootPulse}
        bulletDmgEnemy={1}
        bulletDmgBoss={2}
        onPodium={() => undefined}
        onMonument={() => undefined}
        onEnemyKilled={(kind) => {
          if (!game?.addMana) return;
          game.addMana(kind === 'boss' ? 10 : 2);
        }}
      />

      <GameHUD
        currentWorld="Fantasy"
        onSwitchWorld={(target) => navigation.navigate(target)}
        manaText={`Mana ${Math.floor(game?.mana ?? 0)} • +${(game?.stats?.fantasyAutoGain ?? 0).toFixed(2)}/s`}
        statRight={statRight}
        shootLabel={`Shoot +${shootGain}`}
        onShoot={onShoot}
        onMoveStart={() => setWalking(true)}
        onMoveEnd={() => setWalking(false)}
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

      {loading ? <WorldLoadingScreen world="fantasy" progress={95} asset="Scene Stabilization" tip={fantasyTips[0]} /> : null}
    </View>
  );
}
