import AsyncStorage from '@react-native-async-storage/async-storage';
import { UpgradeLevels } from './upgradeTypes';

const KEY = 'na:state:v2';

export type PersistedState = {
  mana: number;
  energy: number;
  fantasyTier: number;
  skybaseTier: number;
  monumentsFantasy: number;
  monumentsSkybase: number;
  upgrades: UpgradeLevels;
};

export const defaultState: PersistedState = {
  mana: 0,
  energy: 0,
  fantasyTier: 1,
  skybaseTier: 1,
  monumentsFantasy: 0,
  monumentsSkybase: 0,
  upgrades: {},
};

export async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return defaultState;
  try {
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
