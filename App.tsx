import React, { useEffect, useMemo, useRef, useState } from 'react';
import "./src/loading/meshoptSetup";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import './src/loading/meshoptSetup';
import FantasyWorld3D from './FantasyWorld3D';
import FalloutLoaderOverlay from './FalloutLoaderOverlay';
import SkybaseWorld3D from './SkybaseWorld3D';
import { GameHUD } from './src/ui/hud/GameHUD';
import { WORLD_ENTRY_ASSETS } from './src/assets/assetManifest';
import { isWorldReady, markWorldReady } from './src/loading/worldLoadState';

const __origLog = console.log.bind(console);
const __origWarn = console.warn.bind(console);
const __origError = console.error.bind(console);
const __origInfo = console.info ? console.info.bind(console) : __origLog;
const __origDebug = console.debug ? console.debug.bind(console) : __origLog;

  const __base64Re = new RegExp("^[A-Za-z0-9+/=]+$");

function __shouldSuppressLine(s: string) {
  return (
    s.includes("EXGL: gl.pixelStorei() doesn\x27t support this parameter yet!") ||
    (s.includes("onAnimatedValueUpdate") && s.includes("no listeners"))
  );
}

function __sanitizeArgs(args: any[]): any[] | null {
  const out: any[] = [];
  for (const a of args || []) {
    if (typeof a === "string") {
      const s = a;
      if (__shouldSuppressLine(s)) return null;

      const looksLikeImageData =
        (s.length > 200 && s.startsWith("data:image")) ||
        s.includes("iVBORw0KGgo") ||
        s.includes("JRU5ErkJggg") ||
        (s.length > 600 && __base64Re.test(s));

      if (looksLikeImageData) {
        out.push("<omitted image/base64 blob len=" + s.length + "> ");
        continue;
      }

      if (s.length > 2000) {
        out.push(s.slice(0, 500) + "… <truncated len=" + s.length + ">");
        continue;
      }
    }
    out.push(a);
  }
  return out;
}

function __wrapConsole(orig: (...a: any[]) => void) {
  return (...args: any[]) => {
    const s = __sanitizeArgs(args);
    if (!s) return;
    orig(...s);
  };
}

console.log = __wrapConsole(__origLog);
console.warn = __wrapConsole(__origWarn);
console.error = __wrapConsole(__origError);
console.info = __wrapConsole(__origInfo);
console.debug = __wrapConsole(__origDebug);

  try {
    const THREE = require("three");
    const mgr = (THREE as any).DefaultLoadingManager;
    if (mgr && mgr.setURLModifier) {
      mgr.setURLModifier((url: string) => {
        try {
          if (typeof url === "string" && url.length > 80) {
            console.log("[URLMOD]", url.slice(0, 120));
          } else {
            console.log("[URLMOD]", url);
          }
        } catch {}
        return url;
      });
    }
  } catch {}
console.log("<<CONSOLE WRAP ACTIVE>>");
  try {
    const hasBlob = typeof (global as any).Blob !== "undefined";
    const hasCreate = typeof (global as any).URL !== "undefined" && typeof (global as any).URL.createObjectURL === "function";
    console.log("<<BLOB_CHECK>>", { hasBlob, hasCreateObjectURL: hasCreate });
  } catch {}

type RootStackParamList = {
  Home: undefined;
  Fantasy: undefined;
  LoadingFantasy: undefined;
  LoadingSkybase: undefined;
  Skybase: undefined;
  Hub: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const K = {
  lastSeenMs: 'na:lastSeenMs',

  mana: 'na:mana',
  manaTapLvl: 'na:manaTapLvl',
  manaKillLvl: 'na:manaKillLvl',
  manaAutoLvl: 'na:manaAutoLvl',
  fDmgLvl: 'na:fDmgLvl',
  fRateLvl: 'na:fRateLvl',
  fAutoAtkUnlocked: 'na:fAutoAtkUnlocked',

  energy: 'na:energy',
  energyTapLvl: 'na:energyTapLvl',
  energyKillLvl: 'na:energyKillLvl',
  energyAutoLvl: 'na:energyAutoLvl',
  sDmgLvl: 'na:sDmgLvl',
  sRateLvl: 'na:sRateLvl',
  sAutoAtkUnlocked: 'na:sAutoAtkUnlocked',
  sL1ReactorLvl: 'na:sL1ReactorLvl',
  sL1TurretLvl: 'na:sL1TurretLvl',
  sL1ShieldLvl: 'na:sL1ShieldLvl',
  sL1DroneLvl: 'na:sL1DroneLvl',

  boostFantasyToSky: 'na:boostFantasyToSky',
  boostSkyToFantasy: 'na:boostSkyToFantasy',

  fantasyTier: 'na:fantasyTier',
  fantasyMonuments: 'na:fantasyMonuments',
  skyTier: 'na:skyTier',
  skyMonuments: 'na:skyMonuments',
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function formatInt(n: number) {
  return Math.floor(n).toLocaleString();
}

function powCost(base: number, growth: number, level: number) {
  return Math.floor(base * Math.pow(growth, Math.max(0, level)));
}

async function getNum(key: string, fallback: number) {
  const raw = await AsyncStorage.getItem(key);
  const v = raw == null ? fallback : Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

function useStoredNumber(key: string, fallback: number) {
  const [value, setValue] = useState<number>(fallback);

  useEffect(() => {
    (async () => setValue(await getNum(key, fallback)))();
  }, [key, fallback]);

  const api = useMemo(() => {
    return {
      value,
      set: async (next: number) => {
        setValue(next);
        await AsyncStorage.setItem(key, String(next));
      },
      add: async (delta: number) => {
        setValue(prev => {
          const next = prev + delta;
          AsyncStorage.setItem(key, String(next));
          return next;
        });
      },
      reset: async () => {
        setValue(fallback);
        await AsyncStorage.setItem(key, String(fallback));
      },
    };
  }, [value, key, fallback]);

  return api;
}

function HomeScreen({ navigation }: any) {
  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Nexus Ascension</Text>
        <Text style={styles.subtitle}>Idle-Action • Dual Worlds • One Progression</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Start</Text>

          <Pressable style={styles.buttonPrimary} onPress={() => navigation.navigate(isWorldReady('fantasy') ? 'Fantasy' : 'LoadingFantasy')}>
            <Text style={styles.buttonPrimaryText}>Play (Fantasy Valley)</Text>
          </Pressable>

          <View style={styles.row}>
            <Pressable style={styles.button} onPress={() => navigation.navigate(isWorldReady('skybase') ? 'Skybase' : 'LoadingSkybase')}>
              <Text style={styles.buttonText}>Skybase</Text>
            </Pressable>

            <Pressable style={styles.button} onPress={() => navigation.navigate('Hub')}>
              <Text style={styles.buttonText}>Hub</Text>
            </Pressable>
          </View>

          <Pressable style={styles.buttonGhost} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.buttonGhostText}>Settings</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Prototype build • iOS Expo Go</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function useOfflineEarnings(
  onAward: (award: { mana: number; energy: number; awaySec: number; cappedSec: number }) => Promise<void>,
  getRates: () => Promise<{ manaPerSec: number; energyPerSec: number }>
) {
  useEffect(() => {
    let mounted = true;

    const earn = async () => {
      const now = Date.now();
      const lastRaw = await AsyncStorage.getItem(K.lastSeenMs);
      const last = lastRaw ? Number(lastRaw) || now : now;

      const awayMs = Math.max(0, now - last);
      const awaySec = awayMs / 1000;
      const cappedSec = clamp(awaySec, 0, 8 * 3600);

      const { manaPerSec, energyPerSec } = await getRates();
      const mana = Math.floor(cappedSec * manaPerSec);
      const energy = Math.floor(cappedSec * energyPerSec);

      await AsyncStorage.setItem(K.lastSeenMs, String(now));

      if (mounted && (mana > 0 || energy > 0)) {
        await onAward({ mana, energy, awaySec, cappedSec });
      }
    };

    earn();

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        earn();
      }
      if (s === 'background' || s === 'inactive') {
        AsyncStorage.setItem(K.lastSeenMs, String(Date.now()));
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [onAward, getRates]);
}

type CombatConfig = {
  label: string;
  currencyName: 'Mana' | 'Energy';
  currencyKey: string;
  tapLvlKey: string;
  killLvlKey: string;
  autoLvlKey: string;
  dmgLvlKey: string;
  rateLvlKey: string;
  autoAtkKey: string;
  tierKey: string;
  monumentsKey: string;
  killBase: number;
};

type PodiumChoice = {
  title: string;
  desc: string;
  apply: () => Promise<void>;
};

function CombatWorld({ cfg }: { cfg: CombatConfig }) {
  const currency = useStoredNumber(cfg.currencyKey, 0);
  const tapLvl = useStoredNumber(cfg.tapLvlKey, 0);
  const killLvl = useStoredNumber(cfg.killLvlKey, 0);
  const autoLvl = useStoredNumber(cfg.autoLvlKey, 0);

  const dmgLvl = useStoredNumber(cfg.dmgLvlKey, 0);
  const rateLvl = useStoredNumber(cfg.rateLvlKey, 0);
  const autoAtkUnlocked = useStoredNumber(cfg.autoAtkKey, 0);

  const boostF2S = useStoredNumber(K.boostFantasyToSky, 0);
  const boostS2F = useStoredNumber(K.boostSkyToFantasy, 0);

  const tier = useStoredNumber(cfg.tierKey, 0);
  const monuments = useStoredNumber(cfg.monumentsKey, 0);

  const [toast, setToast] = useState<string>('');
    const [upOpen, setUpOpen] = useState(false);
    const [devOpen, setDevOpen] = useState(false);
  const [uiTick, setUiTick] = useState(0);

  const toastTimer = useRef<any>(null);

  const rewardMult = 1 + tier.value * 0.05;

  const tapGain = Math.floor((1 + tapLvl.value * 1) * rewardMult);
  const killGain = Math.floor((cfg.killBase + killLvl.value * 2) * rewardMult);

  const localAutoPerSec = autoLvl.value * 0.5;
  const crossBoost = cfg.currencyName === 'Energy' ? boostF2S.value : boostS2F.value;
  const autoPerSec = localAutoPerSec + crossBoost * 0.25;

  const damage = 1 + dmgLvl.value * 1;
  const attacksPerSec = 1 + rateLvl.value * 0.15;
  const dps = damage * attacksPerSec;

  const [enemyMaxHp, setEnemyMaxHp] = useState<number>(20);
  const [enemyHp, setEnemyHp] = useState<number>(20);

  const killsRef = useRef<number>(0);
  const podiumsRef = useRef<number>(0);

  const [podiumOpen, setPodiumOpen] = useState(false);
  const [podiumChoices, setPodiumChoices] = useState<PodiumChoice[]>([]);

  const monumentPendingRef = useRef(false);
  const [bossOpen, setBossOpen] = useState(false);
  const [bossMaxHp, setBossMaxHp] = useState(500);
  const [bossHp, setBossHp] = useState(500);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  function ThreePreview() {
    function Spinner() {
      const ref = useRef<any>(null);
      useFrame((_, dt) => {
        if (!ref.current) return;
        ref.current.rotation.y += dt * 0.8;
        ref.current.rotation.x += dt * 0.4;
      });
      return (
        <mesh ref={ref}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </mesh>
      );
    }

    return (
      <View style={[styles.threeWrap, { height: 220, backgroundColor: '#000' }]}>
        <Canvas style={{ flex: 1 }} gl={{ antialias: true }} onCreated={({ gl }) => { try { gl.setClearColor('#000000', 1); } catch (e) {} }} camera={{ position: [0, 0, 3], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 3, 3]} intensity={1.2} />
          <Spinner />
        </Canvas>
      </View>
    );
  }


  useEffect(() => {
    const id = setInterval(() => {
      if (autoPerSec > 0) currency.add(autoPerSec);
    }, 1000);
    return () => clearInterval(id);
  }, [autoPerSec]);

  useOfflineEarnings(
    async ({ mana, energy }) => {
      const award = cfg.currencyName === 'Mana' ? mana : energy;
      if (award > 0) {
        await currency.add(award);
        showToast(`Offline: +${formatInt(award)} ${cfg.currencyName}`);
      }
    },
    async () => ({
      manaPerSec: cfg.currencyName === 'Mana' ? autoPerSec : 0,
      energyPerSec: cfg.currencyName === 'Energy' ? autoPerSec : 0,
    })
  );

  function openMonumentBoss() {
    const base = Math.max(300, Math.floor((enemyMaxHp * 25 + podiumsRef.current * 50) * (1 + tier.value * 0.35)));
    setBossMaxHp(base);
    setBossHp(base);
    setBossOpen(true);
    showToast('Monument reached: Boss!');
  }

  async function defeatBoss() {
    setBossOpen(false);
    setBossHp(bossMaxHp);
    await tier.add(1);
    await monuments.add(1);
    setUiTick((t) => t + 1);
    if (cfg.currencyName === 'Mana') {
      await boostF2S.add(1);
      showToast('Monument cleared: Skybase +Auto');
    } else {
      await boostS2F.add(1);
      showToast('Monument cleared: Fantasy +Auto');
    }
  }

  async function openPodium() {
    podiumsRef.current += 1;

    setUiTick((t) => t + 1);

    if (podiumsRef.current % 10 === 0) {
      monumentPendingRef.current = true;
    }

    const choices: PodiumChoice[] = [
      {
        title: 'Power Surge',
        desc: '+1 Damage level',
        apply: async () => dmgLvl.set(dmgLvl.value + 1),
      },
      {
        title: 'Tempo Boost',
        desc: '+1 Fire Rate level',
        apply: async () => rateLvl.set(rateLvl.value + 1),
      },
      {
        title: 'Extractor Rune',
        desc: '+1 Kill Reward level',
        apply: async () => killLvl.set(killLvl.value + 1),
      },
    ];

    setPodiumChoices(choices);
    setPodiumOpen(true);
  }

  async function pickChoice(ix: number) {
    const c = podiumChoices[ix];
    if (!c) return;
    await c.apply();
    setEnemyMaxHp((hp) => Math.max(10, Math.floor(hp * 0.92)));
    setEnemyHp((hp) => Math.max(1, Math.floor(hp * 0.92)));
    setPodiumOpen(false);
    showToast(`Podium chosen: ${c.title}`);

    if (monumentPendingRef.current) {
      monumentPendingRef.current = false;
      openMonumentBoss();
    }
  }

  useEffect(() => {
    const tickMs = 100;
    const perTick = dps * (tickMs / 1000);

    const id = setInterval(() => {
      if (!autoAtkUnlocked.value) return;
      if (podiumOpen) return;

      if (bossOpen) {
        setBossHp((hp) => {
          const next = hp - perTick;
          if (next <= 0) {
            defeatBoss();
            return 0;
          }
          return next;
        });
        return;
      }

      setEnemyHp((hp) => {
        const next = hp - perTick;
        if (next <= 0) {
          killsRef.current += 1;
          setUiTick((t) => t + 1);
          currency.add(killGain);

          const hitPodium = (killsRef.current % 10 === 0);
          let nextMax = (podiumsRef.current === 0) ? enemyMaxHp : Math.floor(enemyMaxHp * 1.02 + 1);
          if (hitPodium) {
            nextMax = Math.floor(nextMax * 1.12 + 5);
            openPodium();
          }
          setEnemyMaxHp(nextMax);
          return nextMax;
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [autoAtkUnlocked.value, dps, killGain, enemyMaxHp, podiumOpen, bossOpen]);

  const costTap = powCost(20, 1.18, tapLvl.value);
  const costKill = powCost(35, 1.20, killLvl.value);
  const costAuto = powCost(60, 1.22, autoLvl.value);
  const costDmg = powCost(40, 1.23, dmgLvl.value);
  const costRate = powCost(45, 1.25, rateLvl.value);
  const costAutoAtk = autoAtkUnlocked.value ? 0 : 150;

  function fantasyUpgradesBody() {
      const rows = [
        { k: 'tap', name: 'Tap Power', lvl: tapLvl.value, cost: costTap },
        { k: 'kill', name: 'Kill Bonus', lvl: killLvl.value, cost: costKill },
        { k: 'auto', name: 'Auto Gain', lvl: autoLvl.value, cost: costAuto },
        { k: 'dmg', name: 'Damage', lvl: dmgLvl.value, cost: costDmg },
        { k: 'rate', name: 'Fire Rate', lvl: rateLvl.value, cost: costRate },
      ] as const;

      return (
        <View>
          {rows.map((r, ix) => (
            <Pressable
              key={ix}
              style={{ borderRadius: 14, padding: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', marginBottom: 10 }}
              onPress={() => buy(r.k as any)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{r.name}  Lv {r.lvl}</Text>
              <Text style={{ color: '#B8C0D6', fontSize: 12, marginTop: 4 }}>Cost: {formatInt(r.cost)}</Text>
            </Pressable>
          ))}

          <Pressable
            style={{ borderRadius: 14, padding: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', marginBottom: 0 }}
            onPress={() => buy('autoatk')}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{autoAtkUnlocked.value ? 'Auto-Attack: Unlocked' : 'Auto-Attack: Unlock'}</Text>
            <Text style={{ color: '#B8C0D6', fontSize: 12, marginTop: 4 }}>{autoAtkUnlocked.value ? 'Enabled for boss fights' : `Cost: ${formatInt(costAutoAtk)}`}</Text>
          </Pressable>
        </View>
      );
    }

    async function buy(kind: 'tap' | 'kill' | 'auto' | 'dmg' | 'rate' | 'autoatk') {
    if (kind === 'tap' && currency.value >= costTap) {
      await currency.add(-costTap);
      await tapLvl.set(tapLvl.value + 1);
    }
    if (kind === 'kill' && currency.value >= costKill) {
      await currency.add(-costKill);
      await killLvl.set(killLvl.value + 1);
    }
    if (kind === 'auto' && currency.value >= costAuto) {
      await currency.add(-costAuto);
      await autoLvl.set(autoLvl.value + 1);
    }
    if (kind === 'dmg' && currency.value >= costDmg) {
      await currency.add(-costDmg);
      await dmgLvl.set(dmgLvl.value + 1);
    }
    if (kind === 'rate' && currency.value >= costRate) {
      await currency.add(-costRate);
      await rateLvl.set(rateLvl.value + 1);
    }
    if (kind === 'autoatk' && !autoAtkUnlocked.value && currency.value >= costAutoAtk) {
      await currency.add(-costAutoAtk);
      await autoAtkUnlocked.set(1);
      showToast('Auto-Attack unlocked!');
    }
  }

  async function resetAll() {
    await currency.reset();
    await tapLvl.reset();
    await killLvl.reset();
    await autoLvl.reset();
    await dmgLvl.reset();
    await rateLvl.reset();
    await autoAtkUnlocked.reset();
    setEnemyMaxHp(20);
    setEnemyHp(20);
    killsRef.current = 0;
    podiumsRef.current = 0;
    monumentPendingRef.current = false;
    setBossOpen(false);
    setBossMaxHp(500);
    setBossHp(500);
    await tier.reset();
    await monuments.reset();
    setUiTick((t) => t + 1);    setPodiumOpen(false);
    setPodiumChoices([]);
    setToast('');
  }

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <Modal visible={devOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dev Menu</Text>
            <Text style={styles.modalSub}>Testing tools</Text>

            <Pressable style={styles.choice} onPress={() => currency.add(1000)}>
              <Text style={styles.choiceTitle}>+1,000 {cfg.currencyName}</Text>
              <Text style={styles.choiceDesc}>Adds currency</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => currency.add(100000)}>
              <Text style={styles.choiceTitle}>+100,000 {cfg.currencyName}</Text>
              <Text style={styles.choiceDesc}>Adds currency</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => { openPodium(); }}>
              <Text style={styles.choiceTitle}>Force Podium</Text>
              <Text style={styles.choiceDesc}>Opens podium upgrade now</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => { monumentPendingRef.current = false; openMonumentBoss(); }}>
              <Text style={styles.choiceTitle}>Force Monument Boss</Text>
              <Text style={styles.choiceDesc}>Opens boss gate now</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => { autoAtkUnlocked.set(1); showToast("Auto-Attack unlocked!"); }}>
              <Text style={styles.choiceTitle}>Unlock Auto-Attack</Text>
              <Text style={styles.choiceDesc}>Sets auto-attack unlocked</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => { dmgLvl.set(dmgLvl.value + 10); rateLvl.set(rateLvl.value + 10); showToast("+10 Damage & Fire Rate"); }}>
              <Text style={styles.choiceTitle}>+10 Damage & Fire Rate</Text>
              <Text style={styles.choiceDesc}>Boost combat stats fast</Text>
            </Pressable>

            <Pressable style={styles.choice} onPress={() => { autoLvl.set(autoLvl.value + 10); showToast("+10 Auto Income"); }}>
              <Text style={styles.choiceTitle}>+10 Auto Income</Text>
              <Text style={styles.choiceDesc}>Boost idle income</Text>
            </Pressable>

            <Pressable style={styles.buttonGhost} onPress={() => setDevOpen(false)}>
              <Text style={styles.buttonGhostText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={podiumOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Upgrade Podium</Text>
            <Text style={styles.modalSub}>Choose 1</Text>

            {podiumChoices.map((c, ix) => (
              <Pressable key={ix} style={styles.choice} onPress={() => pickChoice(ix)}>
                <Text style={styles.choiceTitle}>{c.title}</Text>
                <Text style={styles.choiceDesc}>{c.desc}</Text>
              </Pressable>
            ))}

            <Text style={styles.modalHint}>Podiums reached: {podiumsRef.current}</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={bossOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>👹 Monument Boss</Text>
            <Text style={styles.modalSub}>Defeat to unlock a cross-world boost</Text>

            <View style={styles.bossBarOuter}>
              <View style={[styles.bossBarInner, { width: `${Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100))}%` }]} />
            </View>
            <Text style={styles.bossText}>{formatInt(bossHp)} / {formatInt(bossMaxHp)} ❤️</Text>

            <Text style={styles.modalHint}>Your DPS: {dps.toFixed(2)}</Text>
            <Text style={styles.modalHint}>Tier: {tier.value}</Text>
            <Text style={styles.modalHint}>Monuments cleared: {monuments.value}</Text>

            <Pressable style={styles.buttonGhost} onPress={() => setBossOpen(false)}>
              <Text style={styles.buttonGhostText}>Retreat (keep upgrading)</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

        {cfg.currencyName === 'Mana' ? (<>
          <Text style={styles.sectionTitle}>3D Preview (Fantasy Valley)</Text>
          <ThreePreview />
        </>) : null}


      <ScrollView contentContainerStyle={styles.worldScroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.tapPad} onPress={() => currency.add(tapGain)}>
            <Text style={styles.tapPadText}>Tap for +{tapGain} {cfg.currencyName}</Text>
          </Pressable>
          <View style={{ height: 10 }} />
          <View style={styles.stubTop}>
          <Text style={styles.stubTitle}>{cfg.label}</Text>
          <Text style={styles.stubBody}>
            Tap above for {cfg.currencyName}. Every 10 kills: Podium. Every 10 podiums: Monument Boss.
          </Text>
            </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{cfg.currencyName}</Text>
              <Text style={styles.statValue}>{formatInt(currency.value)}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Auto</Text>
              <Text style={styles.statValue}>{autoPerSec.toFixed(2)}/s</Text>
              <Text style={styles.statTiny}>Cross: +{(crossBoost * 0.25).toFixed(2)}/s</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Enemy HP</Text>
              <Text style={styles.statValue}>{formatInt(enemyHp)} / {formatInt(enemyMaxHp)}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>DPS</Text>
              <Text style={styles.statValue}>{dps.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tier</Text>
              <Text style={styles.statValue}>{tier.value}</Text>
              <Text style={styles.statTiny}>Monuments: {monuments.value}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Progress</Text>
              <Text style={styles.statValue}>{killsRef.current} K / {podiumsRef.current} P</Text>
              </View>

          {__DEV__ ? (
            <Pressable style={styles.devBtn} onPress={() => setDevOpen(true)}>
              <Text style={styles.devBtnText}>DEV</Text>
            </Pressable>
          ) : null}

          <View style={{ height: 14 }} />

          <Pressable style={styles.buttonPrimary} onPress={() => currency.add(killGain)}>
            <Text style={styles.buttonPrimaryText}>Simulate Kill (+{killGain} {cfg.currencyName})</Text>
          </Pressable>

          <View style={{ height: 14 }} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upgrades (cost {cfg.currencyName})</Text>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('autoatk')}>
                <Text style={styles.upName}>Auto-Attack</Text>
                <Text style={styles.upMeta}>{autoAtkUnlocked.value ? 'Unlocked' : 'Unlock passive kills'}</Text>
                <Text style={styles.upCost}>{autoAtkUnlocked.value ? '—' : formatInt(costAutoAtk)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { autoAtkUnlocked.set(0); showToast("Auto-Attack reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('dmg')}>
                <Text style={styles.upName}>Damage</Text>
                <Text style={styles.upMeta}>Lv {dmgLvl.value} • {damage.toFixed(0)} dmg/hit</Text>
                <Text style={styles.upCost}>{formatInt(costDmg)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { dmgLvl.set(0); showToast("Damage reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('rate')}>
                <Text style={styles.upName}>Fire Rate</Text>
                <Text style={styles.upMeta}>Lv {rateLvl.value} • {attacksPerSec.toFixed(2)} atk/s</Text>
                <Text style={styles.upCost}>{formatInt(costRate)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { rateLvl.set(0); showToast("Fire Rate reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('tap')}>
                <Text style={styles.upName}>Tap Power</Text>
                <Text style={styles.upMeta}>Lv {tapLvl.value} • +{tapGain} per tap</Text>
                <Text style={styles.upCost}>{formatInt(costTap)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { tapLvl.set(0); showToast("Tap Power reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('kill')}>
                <Text style={styles.upName}>Kill Reward</Text>
                <Text style={styles.upMeta}>Lv {killLvl.value} • +{killGain} per kill</Text>
                <Text style={styles.upCost}>{formatInt(costKill)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { killLvl.set(0); showToast("Kill Reward reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <View style={styles.upRow}>
              <Pressable style={styles.upRowLeft} onPress={() => buy('auto')}>
                <Text style={styles.upName}>Auto Income</Text>
                <Text style={styles.upMeta}>Lv {autoLvl.value} • +{localAutoPerSec.toFixed(2)}/s</Text>
                <Text style={styles.upCost}>{formatInt(costAuto)}</Text>
              </Pressable>
              <Pressable style={styles.upReset} onPress={() => { autoLvl.set(0); showToast("Auto Income reset"); }}>
                <Text style={styles.upResetText}>Reset</Text>
              </Pressable>
            </View>

            <Pressable style={styles.buttonGhost} onPress={resetAll}>
              <Text style={styles.buttonGhostText}>Reset {cfg.label}</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>Monument Boss is the “build check”. Defeating it buffs the other world’s auto income.</Text>
        </View>
        </ScrollView>
      </SafeAreaView>
  );
}

  function FantasyScreen({ navigation }: any) {
    const cfg: CombatConfig = {
      label: 'Fantasy Valley',
      currencyName: 'Mana',
      currencyKey: K.mana,
      tapLvlKey: K.manaTapLvl,
      killLvlKey: K.manaKillLvl,
      autoLvlKey: K.manaAutoLvl,
      dmgLvlKey: K.fDmgLvl,
      rateLvlKey: K.fRateLvl,
      autoAtkKey: K.fAutoAtkUnlocked,
      tierKey: K.fantasyTier,
      monumentsKey: K.fantasyMonuments,
      killBase: 8,
    };

    const currency = useStoredNumber(cfg.currencyKey, 0);
    const tapLvl = useStoredNumber(cfg.tapLvlKey, 0);
    const killLvl = useStoredNumber(cfg.killLvlKey, 0);
    const autoLvl = useStoredNumber(cfg.autoLvlKey, 0);

    const dmgLvl = useStoredNumber(cfg.dmgLvlKey, 0);
    const rateLvl = useStoredNumber(cfg.rateLvlKey, 0);
    const autoAtkUnlocked = useStoredNumber(cfg.autoAtkKey, 0);

    const boostF2S = useStoredNumber(K.boostFantasyToSky, 0);
    const boostS2F = useStoredNumber(K.boostSkyToFantasy, 0);

    const tier = useStoredNumber(cfg.tierKey, 0);
    const monuments = useStoredNumber(cfg.monumentsKey, 0);

    const [toast, setToast] = useState<string>('');
    const toastTimer = useRef<any>(null);

    const [walking, setWalking] = useState(false);
    const [shootPulse, setShootPulse] = useState(0);

    const [podiumOpen, setPodiumOpen] = useState(false);
    const [podiumChoices, setPodiumChoices] = useState<PodiumChoice[]>([]);

    const monumentPendingRef = useRef(false);
    const [bossOpen, setBossOpen] = useState(false);
    const [bossMaxHp, setBossMaxHp] = useState(500);
    const [bossHp, setBossHp] = useState(500);
      const [upOpen, setUpOpen] = useState(false);

    const killsRef = useRef<number>(0);
    const podiumsRef = useRef<number>(0);

    const rewardMult = 1 + tier.value * 0.05;

    const tapGain = Math.floor((1 + tapLvl.value * 1) * rewardMult);
    const killGain = Math.floor((cfg.killBase + killLvl.value * 2) * rewardMult);

    const localAutoPerSec = autoLvl.value * 0.5;
    const crossBoost = cfg.currencyName === 'Energy' ? boostF2S.value : boostS2F.value;
    const autoPerSec = localAutoPerSec + crossBoost * 0.25;

    const damage = 1 + dmgLvl.value * 1;
    const attacksPerSec = 1 + rateLvl.value * 0.15;
    const dps = damage * attacksPerSec;

    const bulletDmgEnemy = Math.max(1, Math.floor(damage * 2));
    const bulletDmgBoss = Math.max(1, Math.floor(damage * 1.4));

    function showToast(msg: string) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast(msg);
      toastTimer.current = setTimeout(() => setToast(''), 2500);
    }

    useEffect(() => {
      const id = setInterval(() => {
        if (autoPerSec > 0) currency.add(autoPerSec);
      }, 1000);
      return () => clearInterval(id);
    }, [autoPerSec]);

    useOfflineEarnings(
      async ({ mana, energy }) => {
        const award = cfg.currencyName === 'Mana' ? mana : energy;
        if (award > 0) {
          await currency.add(award);
          showToast(`Offline: +${formatInt(award)} ${cfg.currencyName}`);
        }
      },
      async () => ({
        manaPerSec: cfg.currencyName === 'Mana' ? autoPerSec : 0,
        energyPerSec: cfg.currencyName === 'Energy' ? autoPerSec : 0,
      })
    );

    function openMonumentBoss() {
      if (podiumOpen) return;
      const base = Math.max(300, Math.floor((300 + podiumsRef.current * 60) * (1 + tier.value * 0.35)));
      setBossMaxHp(base);
      setBossHp(base);
      setBossOpen(true);
      showToast('Monument reached: Boss!');
    }

    async function defeatBoss() {
      setBossOpen(false);
      setBossHp(bossMaxHp);
      await tier.add(1);
      await monuments.add(1);
      await boostF2S.add(1);
      showToast('Monument cleared: Skybase +Auto');
    }

    async function openPodium() {
      if (bossOpen) return;

      podiumsRef.current += 1;
      if (podiumsRef.current % 10 === 0) monumentPendingRef.current = true;

      const choices: PodiumChoice[] = [
        { title: 'Power Surge', desc: '+1 Damage level', apply: async () => dmgLvl.set(dmgLvl.value + 1) },
        { title: 'Tempo Boost', desc: '+1 Fire Rate level', apply: async () => rateLvl.set(rateLvl.value + 1) },
        { title: 'Extractor Rune', desc: '+1 Kill Reward level', apply: async () => killLvl.set(killLvl.value + 1) },
      ];

      setPodiumChoices(choices);
      setPodiumOpen(true);
    }

    async function pickChoice(ix: number) {
      const c = podiumChoices[ix];
      if (!c) return;
      await c.apply();
      setPodiumOpen(false);
      showToast(`Podium chosen: ${c.title}`);
      if (monumentPendingRef.current) {
        monumentPendingRef.current = false;
        openMonumentBoss();
      }
    }

    function onEnemyKilled(kind: 'enemy' | 'boss') {
      currency.add(killGain);
      killsRef.current += 1;
      if (killsRef.current % 10 === 0) openPodium();
      if (kind === 'boss') showToast('Boss down!');
    }

    useEffect(() => {
      const tickMs = 100;
      const perTick = dps * (tickMs / 1000);
      const id = setInterval(() => {
        if (!autoAtkUnlocked.value) return;
        if (podiumOpen) return;
        if (!bossOpen) return;
        setBossHp((hp) => {
          const next = hp - perTick;
          if (next <= 0) {
            defeatBoss();
            return 0;
          }
          return next;
        });
      }, tickMs);
      return () => clearInterval(id);
    }, [autoAtkUnlocked.value, dps, podiumOpen, bossOpen]);

    const costTap = powCost(20, 1.18, tapLvl.value);
    const costKill = powCost(35, 1.20, killLvl.value);
    const costAuto = powCost(60, 1.22, autoLvl.value);
    const costDmg = powCost(40, 1.23, dmgLvl.value);
    const costRate = powCost(45, 1.25, rateLvl.value);
    const costAutoAtk = autoAtkUnlocked.value ? 0 : 150;

    function fantasyUpgradesBody() {
  const [upOpen, setUpOpen] = useState(false);
      const rows = [
        { k: 'tap', name: 'Tap Power', lvl: tapLvl.value, cost: costTap },
        { k: 'kill', name: 'Kill Bonus', lvl: killLvl.value, cost: costKill },
        { k: 'auto', name: 'Auto Gain', lvl: autoLvl.value, cost: costAuto },
        { k: 'dmg', name: 'Damage', lvl: dmgLvl.value, cost: costDmg },
        { k: 'rate', name: 'Fire Rate', lvl: rateLvl.value, cost: costRate },
      ] as const;

      return (
        <View>
          {rows.map((r, ix) => (
            <Pressable
              key={ix}
              style={{ borderRadius: 14, padding: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', marginBottom: 10 }}
              onPress={() => buy(r.k as any)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{r.name}  Lv {r.lvl}</Text>
              <Text style={{ color: '#B8C0D6', fontSize: 12, marginTop: 4 }}>Cost: {formatInt(r.cost)}</Text>
            </Pressable>
          ))}

          <Pressable
            style={{ borderRadius: 14, padding: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', marginBottom: 0 }}
            onPress={() => buy('autoatk')}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{autoAtkUnlocked.value ? 'Auto-Attack: Unlocked' : 'Auto-Attack: Unlock'}</Text>
            <Text style={{ color: '#B8C0D6', fontSize: 12, marginTop: 4 }}>{autoAtkUnlocked.value ? 'Enabled for boss fights' : `Cost: ${formatInt(costAutoAtk)}`}</Text>
          </Pressable>
        </View>
      );
    }

    async function buy(kind: 'tap' | 'kill' | 'auto' | 'dmg' | 'rate' | 'autoatk') {
      if (kind === 'tap' && currency.value >= costTap) { await currency.add(-costTap); await tapLvl.set(tapLvl.value + 1); }
      if (kind === 'kill' && currency.value >= costKill) { await currency.add(-costKill); await killLvl.set(killLvl.value + 1); }
      if (kind === 'auto' && currency.value >= costAuto) { await currency.add(-costAuto); await autoLvl.set(autoLvl.value + 1); }
      if (kind === 'dmg' && currency.value >= costDmg) { await currency.add(-costDmg); await dmgLvl.set(dmgLvl.value + 1); }
      if (kind === 'rate' && currency.value >= costRate) { await currency.add(-costRate); await rateLvl.set(rateLvl.value + 1); }
      if (kind === 'autoatk' && !autoAtkUnlocked.value && currency.value >= costAutoAtk) {
        await currency.add(-costAutoAtk);
        await autoAtkUnlocked.set(1);
        showToast('Auto-Attack unlocked!');
      }
    }

    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: '#0a0f18' }}>
        <Modal visible={podiumOpen} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 18 }}>
            <View style={{ backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Upgrade Podium</Text>
              <Text style={{ color: '#cfcfcf', marginTop: 6, marginBottom: 12 }}>Choose 1</Text>

              {podiumChoices.map((c, ix) => (
                <Pressable key={ix} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginBottom: 10 }} onPress={() => pickChoice(ix)}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>{c.title}</Text>
                  <Text style={{ color: '#cfcfcf', marginTop: 4 }}>{c.desc}</Text>
                </Pressable>
              ))}

              <Text style={{ color: '#cfcfcf', marginTop: 8 }}>Podiums: {podiumsRef.current}</Text>
            </View>
          </View>
        </Modal>

        <Modal visible={bossOpen} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 18 }}>
            <View style={{ backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>👹 Monument Boss</Text>
              <Text style={{ color: '#cfcfcf', marginTop: 6, marginBottom: 12 }}>Auto-attacks will chip this down</Text>

              <View style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
                <View style={{ height: 12, backgroundColor: 'rgba(255,0,0,0.6)', width: `${Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100))}%` }} />
              </View>
              <Text style={{ color: '#fff', marginTop: 8, fontWeight: '800' }}>{formatInt(bossHp)} / {formatInt(bossMaxHp)} ❤️</Text>

              <Text style={{ color: '#cfcfcf', marginTop: 8 }}>⚔️ DPS {dps.toFixed(2)} • 🏆 Tier {tier.value} • 🗿 Monuments {monuments.value}</Text>

              <Pressable style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', marginTop: 12 }} onPress={() => setBossOpen(false)}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Retreat</Text>
                <Text style={{ color: '#cfcfcf', marginTop: 4 }}>Keep upgrading, come back later</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
          <FantasyWorld3D
            walking={walking}
            shootPulse={shootPulse}
            bulletDmgEnemy={bulletDmgEnemy}
            bulletDmgBoss={bulletDmgBoss}
            onPodium={() => openPodium()}
            onMonument={() => openMonumentBoss()}
            onEnemyKilled={(k: 'enemy' | 'boss') => onEnemyKilled(k)}
          />

          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="box-none">
          
              <GameHUD
                currentWorld="Fantasy"
                onSwitchWorld={(target) => navigation.navigate(target)}
                manaText={`Mana ${formatInt(currency.value)} • +${autoPerSec.toFixed(2)}/s`}
                statRight={[
                  `DPS ${dps.toFixed(2)}`,
                  `Tier ${tier.value} / Mon ${monuments.value}`,
                  `K/P ${killsRef.current}/${Math.max(1, podiumsRef.current)}`,
                ]}
                shootLabel={`Shoot +${tapGain}`}
                onShoot={() => {
                  setShootPulse((v) => v + 1);
                  currency.add(tapGain);
                }}
                onMoveStart={() => setWalking(true)}
                onMoveEnd={() => setWalking(false)}
                upgradesOpen={false}
                onOpenUpgrades={() => undefined}
                onCloseUpgrades={() => undefined}
                toast={toast}
                activeUpgradeTab={'fantasy' as any}
                onUpgradeTab={() => undefined}
                levels={{} as any}
                lockReason={undefined}
                onBuyUpgrade={() => undefined}
              />
</View>

          </View>
        </SafeAreaView>
    );
  }




function LoadingFantasyScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f18' }}>
      <FalloutLoaderOverlay
        assets={WORLD_ENTRY_ASSETS.fantasy}
        onDone={() => {
          markWorldReady('fantasy');
          navigation.replace('Fantasy');
        }}
        title={'Loading Fantasy Valley…'}
        subtitle={'Preparing biomes, enemies and collision mesh…'}
      />
    </View>
  );
}

function LoadingSkybaseScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f18' }}>
      <FalloutLoaderOverlay
        assets={WORLD_ENTRY_ASSETS.skybase}
        onDone={() => {
          markWorldReady('skybase');
          navigation.replace('Skybase');
        }}
        title={'Loading Skybase…'}
        subtitle={'Energizing reactor decks and atmosphere…'}
      />
    </View>
  );
}

function SkybaseScreen({ navigation }: any) {
  const energy = useStoredNumber(K.energy, 0);
  const [upOpen, setUpOpen] = useState(false);

  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <View style={{ flex: 1, width: '100%', height: '100%', alignSelf: 'stretch' }}>
        <SkybaseWorld3D layer={1} layerHeight={0} />

        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="box-none">
        
            <GameHUD
              currentWorld="Skybase"
              onSwitchWorld={(target) => navigation.navigate(target)}
              manaText={`Energy ${formatInt(energy.value)}`}
              statRight={[
                `Tier 0 / Mon 0`,
                `DPS 0.00`,
                `K/P 0/0`,
              ]}
              shootLabel={`Shoot +1`}
              onShoot={() => energy.add(1)}
              onMoveStart={() => undefined}
              onMoveEnd={() => undefined}
              upgradesOpen={false}
              onOpenUpgrades={() => undefined}
              onCloseUpgrades={() => undefined}
              toast={''}
              activeUpgradeTab={'skybase' as any}
              onUpgradeTab={() => undefined}
              levels={{} as any}
              lockReason={undefined}
              onBuyUpgrade={() => undefined}
            />
</View>

        </View>
      </SafeAreaView>
  );
}

function HubScreen() {
  return <ScreenStub title="Nexus Hub" body="Next: vendors + inventory stubs." />;
}

function SettingsScreen() {
  return <ScreenStub title="Settings" body="Next: offline cap upgrades + performance toggles." />;
}

function ScreenStub({ title, body }: { title: string; body: string }) {
  return (
    <SafeAreaView edges={[]} style={styles.safe}>
      <View style={styles.stub}>
        <Text style={styles.stubTitle}>{title}</Text>
        <Text style={styles.stubBody}>{body}</Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0B0F1A' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#0B0F1A' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Nexus Ascension' }} />
        <Stack.Screen name='LoadingFantasy' component={LoadingFantasyScreen} options={{ headerShown: false }} />
        <Stack.Screen name='LoadingSkybase' component={LoadingSkybaseScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Fantasy" component={FantasyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Skybase" component={SkybaseScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Hub" component={HubScreen} options={{ title: 'Hub' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0F1A' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },

  title: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  subtitle: { marginTop: 8, fontSize: 14, color: '#B8C0D6' },

  card: {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#121A2B',
    borderWidth: 1,
    borderColor: '#1B2A4A',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },

  buttonPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#5B7CFF',
  },
  buttonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#1A2540',
    borderWidth: 1,
    borderColor: '#25365F',
  },
  buttonText: { color: '#D7E1FF', fontSize: 14, fontWeight: '700' },

  buttonGhost: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#25365F',
  },
  buttonGhostText: { color: '#B8C0D6', fontSize: 14, fontWeight: '700' },

  footer: { marginTop: 22, alignItems: 'center' },
  footerText: { color: '#6F7BA1', fontSize: 12 },

  stub: { flex: 1, padding: 20, justifyContent: 'center' },
  stubTop: { flex: 1, padding: 20, justifyContent: 'flex-start' },
  stubTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  stubBody: { color: '#B8C0D6', fontSize: 13, marginTop: 10, lineHeight: 18 },

  tapZone: { flex: 1 },

  worldScroll: { padding: 20 },
  tapPad: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F' },
  tapPadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  toast: { color: '#D7E1FF', fontSize: 12, marginTop: 10, fontWeight: '700' },
  hint: { marginTop: 14, color: '#6F7BA1', fontSize: 12 },

  upRow: { borderTopWidth: 1, borderTopColor: '#1B2A4A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upRowLeft: { flex: 1, paddingVertical: 10 },
  upReset: { marginLeft: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F' },
  upResetText: { color: '#D7E1FF', fontSize: 12, fontWeight: '900' },
  upName: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  upMeta: { color: '#B8C0D6', fontSize: 12, marginTop: 4 },
  upCost: { color: '#D7E1FF', fontSize: 12, marginTop: 6, fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 18, backgroundColor: '#121A2B', borderWidth: 1, borderColor: '#1B2A4A', padding: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  modalSub: { color: '#B8C0D6', fontSize: 12, marginTop: 4, marginBottom: 12 },
  choice: { borderRadius: 14, padding: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', marginBottom: 10 },
  choiceTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  choiceDesc: { color: '#B8C0D6', fontSize: 12, marginTop: 4 },
  modalHint: { color: '#6F7BA1', fontSize: 12, marginTop: 6 },

  bossBarOuter: { height: 12, borderRadius: 10, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F', overflow: 'hidden', marginTop: 6 },
  bossBarInner: { height: 12, backgroundColor: '#5B7CFF' },
  bossText: { color: '#D7E1FF', fontSize: 12, marginTop: 8, fontWeight: '800' },

  devBtn: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#1A2540', borderWidth: 1, borderColor: '#25365F' },
  devBtnText: { color: '#D7E1FF', fontSize: 12, fontWeight: '900' },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statBox: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#101A2E', borderWidth: 1, borderColor: '#1B2A4A' },
  statLabel: { color: '#98A7C6', fontSize: 11, fontWeight: '800' },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 2 },
  statTiny: { color: '#D7E1FF', fontSize: 12, marginTop: 4, fontWeight: '800' },

  sectionTitle: { color: '#D7E1FF', fontSize: 14, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  threeWrap: { height: 220, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#25365F', backgroundColor: '#0B1020' },
});
