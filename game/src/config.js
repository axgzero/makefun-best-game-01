// LUMENFALL — tuning constants. One place for every number the game balances on,
// so tuning never means hunting through logic files.
export const STEP = 1 / 60;
export const TOTAL_WAVES = 10;

export const ARENA = {
  margin: 26,
  wallGlow: '#2a1e4f',
};

export const PLAYER = {
  radius: 14,
  speed: 265,
  maxHp: 100,
  fireInterval: 0.15,
  bulletSpeed: 560,
  bulletDamage: 14,
  bulletRadius: 5,
  dashSpeed: 820,
  dashTime: 0.18,
  dashCooldown: 2.4,
  invulnerableAfterHit: 0.9,
  magnetRadius: 90,
  lightRadius: 210,
};

export const ENEMIES = {
  mote: { radius: 10, hp: 14, speed: 150, damage: 8, score: 10, color: '#b388ff', spikes: true },
  drifter: { radius: 15, hp: 34, speed: 96, damage: 12, score: 25, color: '#4dd0e1', spikes: false },
  spitter: { radius: 14, hp: 26, speed: 70, damage: 10, score: 30, color: '#f06292', shoots: true },
  brute: { radius: 26, hp: 130, speed: 46, damage: 20, score: 60, color: '#ffb74d', spikes: false },
  warden: { radius: 46, hp: 900, speed: 42, damage: 26, score: 1000, color: '#e040fb', shoots: true, boss: true },
};

export const WAVES = [
  { motes: 6, drifters: 2, spitters: 0, brutes: 0 },
  { motes: 8, drifters: 4, spitters: 2, brutes: 0 },
  { motes: 10, drifters: 6, spitters: 3, brutes: 1 },
  { motes: 12, drifters: 8, spitters: 5, brutes: 1 },
  { motes: 10, drifters: 8, spitters: 6, brutes: 3 },
  { motes: 14, drifters: 10, spitters: 7, brutes: 3 },
  { motes: 16, drifters: 12, spitters: 8, brutes: 4 },
  { motes: 18, drifters: 12, spitters: 10, brutes: 5 },
  { motes: 20, drifters: 14, spitters: 10, brutes: 6 },
  { motes: 12, drifters: 8, spitters: 6, brutes: 2, warden: 1 },
];

export const UPGRADES = [
  { id: 'damage', name: 'Kindled Embers', desc: '+25% ember damage', apply: (p) => { p.bulletDamage *= 1.25; } },
  { id: 'rate', name: 'Rapid Wick', desc: '+20% fire rate', apply: (p) => { p.fireInterval *= 0.83; } },
  { id: 'spread', name: 'Split Flame', desc: '+1 ember per shot', apply: (p) => { p.spread += 1; } },
  { id: 'pierce', name: 'Piercing Light', desc: 'Embers pierce +1 foe', apply: (p) => { p.pierce += 1; } },
  { id: 'dash', name: 'Swift Step', desc: 'Dash recharges 30% faster', apply: (p) => { p.dashCooldown *= 0.7; } },
  { id: 'vigor', name: 'Deep Reservoir', desc: '+25 max light, heal 25', apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'magnet', name: 'Shard Lure', desc: '+70% shard pickup radius', apply: (p) => { p.magnetRadius *= 1.7; } },
  { id: 'speed', name: 'Fleetfoot', desc: '+12% move speed', apply: (p) => { p.speed *= 1.12; } },
  { id: 'bulb', name: 'Bright Lantern', desc: '+40 light radius', apply: (p) => { p.lightRadius += 40; } },
];

export const SCORE = {
  shard: 5,
  waveClear: 50,
};
