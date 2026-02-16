import { useCallback, useEffect, useMemo, useState } from 'react';
import { canAdvanceTier, canBuyUpgrade, ProgressState } from '../systems/upgrades/gating';
import { loadState, saveState } from '../systems/upgrades/persistence';
import { deriveStats, getUpgradeCost, getUpgradeLevel, upgradeMap } from '../systems/upgrades/upgradeEngine';
import { UpgradeCategory, UpgradeLevels, WorldKey } from '../systems/upgrades/upgradeTypes';

export function useGameState() {
  const [ready, setReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootAsset, setBootAsset] = useState('Initializing Systems');
  const [mana, setMana] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [fantasyTier, setFantasyTier] = useState(1);
  const [skybaseTier, setSkybaseTier] = useState(1);
  const [monumentsFantasy, setMonumentsFantasy] = useState(0);
  const [monumentsSkybase, setMonumentsSkybase] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeLevels>({});
  const [toast, setToast] = useState<string>('');
  const [lockReason, setLockReason] = useState<string>('');
  const [activeUpgradeTab, setActiveUpgradeTab] = useState<UpgradeCategory>('fantasy');

  useEffect(() => {
    let active = true;
    setBootProgress(0);
    setBootAsset('Reading Save Data');

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 90));
      if (!active) return;
      setBootProgress(20);
      setBootAsset('Applying Upgrade Ledger');

      const s = await loadState();
      if (!active) return;
      setBootProgress(70);
      setBootAsset('Hydrating World State');
      setMana(s.mana); setEnergy(s.energy); setFantasyTier(s.fantasyTier); setSkybaseTier(s.skybaseTier);
      setMonumentsFantasy(s.monumentsFantasy); setMonumentsSkybase(s.monumentsSkybase); setUpgrades(s.upgrades);

      await new Promise((resolve) => setTimeout(resolve, 90));
      if (!active) return;
      setBootProgress(100);
      setBootAsset('Ready');
      setReady(true);
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState({ mana, energy, fantasyTier, skybaseTier, monumentsFantasy, monumentsSkybase, upgrades });
  }, [ready, mana, energy, fantasyTier, skybaseTier, monumentsFantasy, monumentsSkybase, upgrades]);

  const stats = useMemo(() => deriveStats(upgrades), [upgrades]);
  const gateSlack = getUpgradeLevel(upgrades, 'm_gate_authority');

  const progress: ProgressState = { fantasyTier, skybaseTier, monumentsFantasy, monumentsSkybase };

  const buyUpgrade = useCallback((id: string) => {
    const def = upgradeMap.get(id);
    if (!def) return;
    const level = upgrades[id] ?? 0;
    const cost = getUpgradeCost(def, level);
    const gate = canBuyUpgrade(id, upgrades, progress);
    if (!gate.allowed) {
      setLockReason(gate.reason ?? 'Locked');
      setToast(gate.reason ?? 'Locked');
      setActiveUpgradeTab(def.category);
      return;
    }
    if (level >= def.maxLevel) return;

    const spendFromMana = def.category === 'fantasy' || def.category === 'meta';
    if (spendFromMana && mana < cost) return setToast('Not enough Mana');
    if (!spendFromMana && energy < cost) return setToast('Not enough Energy');

    setLockReason('');
    if (spendFromMana) setMana((v) => v - cost); else setEnergy((v) => v - cost);
    setUpgrades((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }, [upgrades, progress, mana, energy]);

  const tryTierUp = useCallback((world: WorldKey) => {
    const result = canAdvanceTier(world, progress, gateSlack);
    if (!result.allowed) {
      setToast(result.reason ?? 'Progression gated');
      if (result.requiredUpgradeId) {
        const def = upgradeMap.get(result.requiredUpgradeId);
        if (def) setActiveUpgradeTab(def.category);
      }
      return false;
    }
    if (world === 'fantasy') setFantasyTier((v) => v + 1);
    if (world === 'skybase') setSkybaseTier((v) => v + 1);
    return true;
  }, [progress, gateSlack]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      setMana((v) => v + stats.fantasyAutoGain);
      setEnergy((v) => v + stats.skybaseAutoGain);
    }, 1000);
    return () => clearInterval(id);
  }, [ready, stats]);

  return {
    ready,
    bootProgress,
    bootAsset,
    mana,
    energy,
    fantasyTier,
    skybaseTier,
    monumentsFantasy,
    monumentsSkybase,
    stats,
    upgrades,
    toast,
    lockReason,
    activeUpgradeTab,
    setActiveUpgradeTab,
    setToast,
    addMana: (v: number) => setMana((s) => s + v),
    addEnergy: (v: number) => setEnergy((s) => s + v),
    addMonument: (world: WorldKey) => world === 'fantasy' ? setMonumentsFantasy((v) => v + 1) : setMonumentsSkybase((v) => v + 1),
    buyUpgrade,
    tryTierUp,
  };
}
