export type WorldKey = 'hub' | 'fantasy' | 'skybase';

export type UpgradeCategory = 'fantasy' | 'skybase' | 'meta';

export type UpgradeDefinition = {
  id: string;
  category: UpgradeCategory;
  name: string;
  description: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
  effectLabel: (level: number) => string;
  prerequisites?: { upgradeId: string; level: number }[];
  gate?: {
    world: WorldKey;
    minTier: number;
    message: string;
  };
};

export type UpgradeLevels = Record<string, number>;

export type GateResult = {
  allowed: boolean;
  reason?: string;
  requiredUpgradeId?: string;
};

export type DerivedStats = {
  fantasyTapGain: number;
  skybaseTapGain: number;
  fantasyDamageMult: number;
  skybaseDamageMult: number;
  fantasyAutoGain: number;
  skybaseAutoGain: number;
  crossFantasyToSky: number;
  crossSkyToFantasy: number;
};
