import { WorldKey } from '../../systems/upgrades/upgradeTypes';

export const loadingThemes: Record<WorldKey, { title: string; accent: string; bg: string; tipPrefix: string }> = {
  fantasy: { title: 'Fantasy Valley', accent: '#b17cff', bg: '#140b22', tipPrefix: 'Rune' },
  skybase: { title: 'Skybase Prime', accent: '#42e7ff', bg: '#071722', tipPrefix: 'Neon' },
  hub: { title: 'Nexus Hub', accent: '#ffd37c', bg: '#151515', tipPrefix: 'Nexus' },
};
