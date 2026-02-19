export type Vec3 = { x: number; y: number; z: number };

export type SummonUpgrades = {
  aggroRadius: number;      // how far it can "see" enemies
  exploreRadius: number;    // how far it may wander from player
  followTightness: number;  // how strongly it prefers staying near player (0..1)
  fireRate: number;         // shots per second
  projectileDamage: number; // damage per hit
};

export type Summon = {
  id: string;
  pos: Vec3;
  vel: Vec3;

  // AI state
  mode: 'follow' | 'explore' | 'attack';
  targetEnemyId?: string;

  // cooldown
  shootCd: number;
};

export type EnemyLite = {
  id: string;
  pos: Vec3;
  alive: boolean;
};

export type SummonsState = {
  summons: Summon[];
  upgrades: SummonUpgrades;
  seed: number;
};

export const defaultSummonUpgrades: SummonUpgrades = {
  aggroRadius: 8,
  exploreRadius: 5,
  followTightness: 0.8,
  fireRate: 1.2,
  projectileDamage: 1,
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dist2(a: Vec3, b: Vec3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function mul(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function len(a: Vec3) {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function norm(a: Vec3): Vec3 {
  const l = len(a);
  if (l <= 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

// tiny deterministic PRNG (good enough for wandering)
function rand01(state: SummonsState) {
  state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
  return (state.seed & 0xffffffff) / 0x100000000;
}

export function createSummonsState(opts?: Partial<SummonsState>): SummonsState {
  return {
    summons: opts?.summons ?? [],
    upgrades: { ...defaultSummonUpgrades, ...(opts?.upgrades ?? {}) },
    seed: opts?.seed ?? 12345,
  };
}

export function spawnDefaultSummonNearPlayer(state: SummonsState, playerPos: Vec3) {
  if (state.summons.length > 0) return;

  state.summons.push({
    id: 'summon_1',
    pos: { x: playerPos.x + 0.6, y: playerPos.y, z: playerPos.z + 0.6 },
    vel: { x: 0, y: 0, z: 0 },
    mode: 'follow',
    shootCd: 0,
  });
}

export type SummonsStepContext = {
  dt: number;
  playerPos: Vec3;
  enemies: EnemyLite[];

  // called when summon fires at an enemy
  onSummonHitEnemy?: (enemyId: string, damage: number) => void;
};

export function stepSummons(state: SummonsState, ctx: SummonsStepContext) {
  const { dt, playerPos, enemies } = ctx;
  const up = state.upgrades;

  const aggroR2 = up.aggroRadius * up.aggroRadius;
  const exploreR2 = up.exploreRadius * up.exploreRadius;

  for (const s of state.summons) {
    // cooldown tick
    s.shootCd = Math.max(0, s.shootCd - dt);

    // find closest valid enemy within aggro
    let bestId: string | undefined;
    let bestD2 = Infinity;

    for (const e of enemies) {
      if (!e.alive) continue;
      const d2 = dist2(s.pos, e.pos);
      if (d2 <= aggroR2 && d2 < bestD2) {
        bestD2 = d2;
        bestId = e.id;
      }
    }

    if (bestId) {
      s.mode = 'attack';
      s.targetEnemyId = bestId;
    } else {
      s.targetEnemyId = undefined;
      // wander a little, but mostly stay near player
      const d2p = dist2(s.pos, playerPos);
      const wantsExplore = rand01(state) < 0.15; // occasional exploration
      s.mode = wantsExplore && d2p < exploreR2 ? 'explore' : 'follow';
    }

    // movement target
    let targetPos: Vec3 = playerPos;

    if (s.mode === 'attack' && s.targetEnemyId) {
      const enemy = enemies.find((e) => e.id === s.targetEnemyId && e.alive);
      if (enemy) targetPos = enemy.pos;
      else s.mode = 'follow';
    } else if (s.mode === 'explore') {
      // pick a point around the player (very small drift each tick)
      const ang = rand01(state) * Math.PI * 2;
      const r = clamp(rand01(state) * up.exploreRadius, 0.5, up.exploreRadius);
      targetPos = { x: playerPos.x + Math.cos(ang) * r, y: playerPos.y, z: playerPos.z + Math.sin(ang) * r };
    } else {
      // follow: stay slightly offset so it "orbits" you
      const orbitAng = rand01(state) * Math.PI * 2;
      targetPos = { x: playerPos.x + Math.cos(orbitAng) * 0.9, y: playerPos.y, z: playerPos.z + Math.sin(orbitAng) * 0.9 };
    }

    // simple steering (no physics assumptions yet)
    const toTarget = sub(targetPos, s.pos);
    const dir = norm(toTarget);

    // follow tightness maps to speed preference
    const baseSpeed = 2.2;
    const speed = baseSpeed * (0.6 + up.followTightness * 0.8);

    // integrate
    s.vel = mul(dir, speed);
    s.pos = add(s.pos, mul(s.vel, dt));

    // fire if attacking and cooldown ready
    if (s.mode === 'attack' && s.targetEnemyId) {
      const enemy = enemies.find((e) => e.id === s.targetEnemyId && e.alive);
      if (enemy) {
        const closeEnough = dist2(s.pos, enemy.pos) <= (up.aggroRadius * up.aggroRadius);
        const canShoot = s.shootCd <= 0;
        if (closeEnough && canShoot) {
          s.shootCd = 1 / Math.max(0.1, up.fireRate);
          ctx.onSummonHitEnemy?.(enemy.id, up.projectileDamage);
        }
      }
    }
  }
}
