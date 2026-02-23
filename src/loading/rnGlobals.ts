const g: any = globalThis as any;

if (!g.navigator) g.navigator = {};
if (typeof g.navigator.userAgent !== 'string' || !g.navigator.userAgent) {
  g.navigator.userAgent = 'ReactNative';
}
