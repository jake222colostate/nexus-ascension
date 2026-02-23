import { Asset } from 'expo-asset';

const modules = {
  core: {
    skyboxGlobal: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  fantasy: {
    mountain: require('../../assets/glb/fantasy3d/mountain_v2.glb'),
    gazebo: require('../../assets/glb/fantasy3d/spawn_gazebo.glb'),
    path: require('../../assets/glb/fantasy3d/path.glb'),
    podium: require('../../assets/glb/fantasy3d/podium_v1.glb'),
    forestTree: require('../../assets/glb/fantasy3d/forest_tree.glb'),
    crystal1: require('../../assets/glb/fantasy3d/Crystals/crystal1.glb'),
    crystal2: require('../../assets/glb/fantasy3d/Crystals/crystal2.glb'),
    crystal3: require('../../assets/glb/fantasy3d/Crystals/crystal3.glb'),
    crystal4: require('../../assets/glb/fantasy3d/Crystals/crystal4.glb'),
    crystal5: require('../../assets/glb/fantasy3d/Crystals/crystal5.glb'),
    monsterModel: require('../../assets/glb/fantasy3d/monster1/monster1_model.glb'),
    monsterWalk: require('../../assets/glb/fantasy3d/monster1/monster1_walking.glb'),
    monsterRun: require('../../assets/glb/fantasy3d/monster1/monster1_running.glb'),
    monsterAttack: require('../../assets/glb/fantasy3d/monster1/monster1_attack_v1.glb'),
    fantasySkybox: require('../../assets/glb/skybase/skybox1.jpg'),
  },
  skybase: {
    skybox: require('../../assets/glb/skybase/skybase_stage1_skybox.jpeg'),
  },
} as const;

export async function resolveWorldUris() {
  const resolved: any = {};

  for (const world of Object.keys(modules)) {
    resolved[world] = {};

    for (const key of Object.keys((modules as any)[world])) {
      const asset = Asset.fromModule((modules as any)[world][key]);
      await asset.downloadAsync();
      resolved[world][key] = asset.localUri ?? asset.uri;
    }
  }

  return resolved;
}