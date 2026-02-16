import { upgradeData } from './upgradeData';
import { DerivedStats, UpgradeLevels, UpgradeDefinition } from './upgradeTypes';

export const getUpgradeLevel = (levels: UpgradeLevels, id: string) => levels[id] ?? 0;

export const getUpgradeCost = (def: UpgradeDefinition, level: number): number =>
  Math.floor(def.baseCost * Math.pow(def.growth, Math.max(0, level)));

export const deriveStats = (levels: UpgradeLevels): DerivedStats => {
  const fTap = getUpgradeLevel(levels, 'f_tap_focus');
  const fAuto = getUpgradeLevel(levels, 'f_auto_font');
  const fLink = getUpgradeLevel(levels, 'f_world_link');
  const sTap = getUpgradeLevel(levels, 's_tap_focus');
  const sAuto = getUpgradeLevel(levels, 's_auto_reactor');
  const sLink = getUpgradeLevel(levels, 's_world_link');
  const globalTap = 1 + getUpgradeLevel(levels, 'm_tap_global') * 0.1;

  return {
    fantasyTapGain: Math.floor((1 + fTap) * globalTap),
    skybaseTapGain: Math.floor((1 + sTap) * globalTap),
    fantasyDamageMult: 1 + fTap * 0.03,
    skybaseDamageMult: 1 + sTap * 0.03,
    fantasyAutoGain: fAuto * 0.7 + sLink * 0.2,
    skybaseAutoGain: sAuto * 0.7 + fLink * 0.2,
    crossFantasyToSky: fLink * 0.2,
    crossSkyToFantasy: sLink * 0.2,
  };
};

export const upgradeMap = new Map(upgradeData.map((item) => [item.id, item]));
