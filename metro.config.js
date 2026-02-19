const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");
const { resolve } = require("metro-resolver");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(new Set([...(config.resolver.assetExts || []), "glb", "gltf", "bin"]));

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force ONE Three.js instance everywhere (three + three/*)
  if (moduleName === "three" || moduleName.startsWith("three/")) {
    const pinned = path.resolve(__dirname, "node_modules", moduleName);
    return resolve(context, pinned, platform);
  }

  // Force ONE three-stdlib instance too (it must share the same three peer)
  if (moduleName === "three-stdlib" || moduleName.startsWith("three-stdlib/")) {
    const pinned = path.resolve(__dirname, "node_modules", moduleName);
    return resolve(context, pinned, platform);
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
