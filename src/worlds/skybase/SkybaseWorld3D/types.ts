export type SkybaseWorld3DProps = {
  shootPulse: number;
  moving: boolean;
  damageMult: number;
  onEnemyKilled?: () => void;
  onReady?: () => void;
};
