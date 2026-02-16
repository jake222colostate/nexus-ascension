export type UiWorld = 'Hub' | 'Fantasy' | 'Skybase';

export const worldToKey: Record<UiWorld, 'hub' | 'fantasy' | 'skybase'> = {
  Hub: 'hub',
  Fantasy: 'fantasy',
  Skybase: 'skybase',
};
