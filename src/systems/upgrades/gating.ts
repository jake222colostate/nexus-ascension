import { upgradeMap } from './upgradeEngine';
import { GateResult, UpgradeLevels, WorldKey } from './upgradeTypes';

export type ProgressState = {
  fantasyTier: number;
  skybaseTier: number;
  monumentsFantasy: number;
  monumentsSkybase: number;
};

export function canAdvanceTier(world: WorldKey, progress: ProgressState, gateSlack: number): GateResult {
  const diff = world === 'fantasy'
    ? progress.fantasyTier - progress.skybaseTier
    : progress.skybaseTier - progress.fantasyTier;

  if (diff >= 2 + gateSlack) {
    const reqWorld = world === 'fantasy' ? 'Skybase' : 'Fantasy';
    return {
      allowed: false,
      reason: `Progress gated: raise ${reqWorld} tier before advancing further.`,
      requiredUpgradeId: 'm_gate_authority',
    };
  }

  return { allowed: true };
}

export function canBuyUpgrade(upgradeId: string, levels: UpgradeLevels, progress: ProgressState): GateResult {
  const def = upgradeMap.get(upgradeId);
  if (!def) return { allowed: false, reason: 'Unknown upgrade.' };

  for (const req of def.prerequisites ?? []) {
    if ((levels[req.upgradeId] ?? 0) < req.level) {
      const reqDef = upgradeMap.get(req.upgradeId);
      return {
        allowed: false,
        reason: `Requires ${reqDef?.name ?? req.upgradeId} Lv.${req.level}.`,
        requiredUpgradeId: req.upgradeId,
      };
    }
  }

  if (def.gate) {
    const tier = def.gate.world === 'fantasy' ? progress.fantasyTier : progress.skybaseTier;
    if (tier < def.gate.minTier) {
      return { allowed: false, reason: def.gate.message, requiredUpgradeId: def.id };
    }
  }

  return { allowed: true };
}
