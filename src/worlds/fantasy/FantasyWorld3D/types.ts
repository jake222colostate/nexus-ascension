export type FantasyWorld3DProps = {
  shootPulse: number;
  moving: boolean;
  damageMult: number;
  onEnemyKilled?: () => void;
  onReady?: () => void;
};
