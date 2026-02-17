const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Force Metro to always resolve a single copy of `three` from this repo's node_modules
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  three: path.join(projectRoot, "node_modules/three"),
};

module.exports = config;
