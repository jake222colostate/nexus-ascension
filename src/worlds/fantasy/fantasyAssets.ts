import { featureFlags } from '../../assets/featureFlags';

export const fantasyAssets = [
  { id: 'terrain', label: 'Ancient Valley Mesh' },
  { id: 'gazebo', label: featureFlags.spawnGazeboEnabled ? 'Spawn Gazebo' : 'Spawn Gazebo (disabled)' },
  { id: 'enemy', label: 'Monster Rig' },
];
