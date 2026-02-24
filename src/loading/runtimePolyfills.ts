/* Runtime polyfills needed for Three.js loaders in React Native (Hermes). */
declare const global: any;

(() => {
  try {
    const g: any = global;

    // Ensure globalThis points to the same object
    if (!g.globalThis) g.globalThis = g;

    // Some libraries check for window/self
    if (!g.window) g.window = g;
    if (!g.self) g.self = g;

    // Three's GLTFLoader (and others) may read navigator.userAgent and call .match(...)
    if (!g.navigator) g.navigator = {};
    if (typeof g.navigator.userAgent !== "string" || !g.navigator.userAgent) {
      g.navigator.userAgent = "ReactNative Hermes";
    }
  } catch {
    // intentionally noop
  }
})();
