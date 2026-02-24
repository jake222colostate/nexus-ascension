import { getBestAssetUri } from '../../assets/worldUris';

export type WorldAssetItem = { key: string; uri: string };

export function getFantasyCriticalAssets(): WorldAssetItem[] {
  return [
    { key: 'mountain', uri: getBestAssetUri('fantasy', 'mountain') },
    { key: 'gazebo', uri: getBestAssetUri('fantasy', 'gazebo') },
    { key: 'path', uri: getBestAssetUri('fantasy', 'path') },
    { key: 'podium', uri: getBestAssetUri('fantasy', 'podium') },
    { key: 'staff', uri: getBestAssetUri('fantasy', 'staff') },
  ];
}

export function getFantasyDeferredAssets(): WorldAssetItem[] {
  return [
    { key: 'forestTree', uri: getBestAssetUri('fantasy', 'forestTree') },
    { key: 'crystal1', uri: getBestAssetUri('fantasy', 'crystal1') },
    { key: 'crystal2', uri: getBestAssetUri('fantasy', 'crystal2') },
    { key: 'crystal3', uri: getBestAssetUri('fantasy', 'crystal3') },
    { key: 'crystal4', uri: getBestAssetUri('fantasy', 'crystal4') },
    { key: 'crystal5', uri: getBestAssetUri('fantasy', 'crystal5') },
    { key: 'monsterModel', uri: getBestAssetUri('fantasy', 'monsterModel') },
    { key: 'monsterWalk', uri: getBestAssetUri('fantasy', 'monsterWalk') },
    { key: 'monsterRun', uri: getBestAssetUri('fantasy', 'monsterRun') },
    { key: 'monsterAttack', uri: getBestAssetUri('fantasy', 'monsterAttack') },
  ];
}
