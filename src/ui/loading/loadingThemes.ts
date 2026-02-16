import { WorldKey } from '../../systems/upgrades/upgradeTypes';

export const loadingThemes: Record<WorldKey, { title: string; accent: string; bg: string; tipPrefix: string }> = {
  fantasy: { title: 'Fantasy Valley', accent: '#b17cff', bg: '#0f081b', tipPrefix: 'Arcane' },
  skybase: { title: 'Skybase Prime', accent: '#42e7ff', bg: '#05121c', tipPrefix: 'Neon' },
  hub: { title: 'Nexus Hub', accent: '#ffd37c', bg: '#111217', tipPrefix: 'Nexus' },
};
