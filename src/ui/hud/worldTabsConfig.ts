export const worldTabTargets: Record<'Hub' | 'Fantasy' | 'Skybase', Array<'Hub' | 'Fantasy' | 'Skybase'>> = {
  Hub: ['Fantasy', 'Skybase'],
  Fantasy: ['Skybase', 'Hub'],
  Skybase: ['Fantasy', 'Hub'],
};
