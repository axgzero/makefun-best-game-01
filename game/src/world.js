// LUMENFALL's world: the player, the foes, the waves, the upgrades and the boss.
// Pure step logic over a plain state object, so the game loop and the
// screenshot scenes both drive it with the same fixed step.
import { ARENA, ENEMIES, PLAYER, SCORE, STEP, TOTAL_WAVES, UPGRADES, WAVES } from './config.js';
import { createRandom, shuffle } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;
export const EVENT_VICTORY = 4;

export function createWorld(width, height, seed) {
  const random = createRandom(seed || 20261116);
  return {
    width,
    height,
    random,
    time: 0,
    score: 0,
    kills: 0,
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    pickups: [],
    texts: [],
    shake: 0,
    flash: 0,
    banner: '',
    bannerTime: 0,
    offer: null,
    boss: null,
    player: freshPlayer(width, height),
    best: 0,
  };
}

function freshPlayer(width, height) {
  return {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletDamage: PLAYER.bulletDamage,
    spread: 1,
    pierce: 0,
    magnetRadius: PLAYER.magnetRadius,
    lightRadius: PLAYER.lightRadius,
    dashCooldown: PLAYER.dashCooldown,
    fireCd: 0,
    dashCd: 0,
    dashTime: 0,
    dashX: 0,
    dashY: 0,
    invulnerable: 0,
    aimX: width / 2,
    aimY: height / 2 - 100,
    alive: true,
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.width, world.height, 20261116);
  fresh.best = world.best;
  Object.assign(world, fresh);
}

function edgePoint(world) {
  const r = world.random;
  const side = Math.floor(r() * 4);
  const m = ARENA.margin + 10;
  if (side === 0) return { x: m + r() * (world.width - 2 * m), y: m };
  if (side === 1) return { x: m + r() * (world.width - 2 * m), y: world.height - m };
  if (side === 2) return { x: m, y: m + r() * (world.height - 2 * m) };
  return { x: world.width - m, y: m + r() * (world.height - 2 * m) };
}

function spawnEnemy(world, kind) {
  const def = ENEMIES[kind];
  const at = edgePoint(world);
  const hpScale = 1 + (world.wave - 1) * 0.06;
  const enemy = {
    kind,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    radius: def.radius,
    speed: def.speed * (0.9 + world.random() * 0.2),
    damage: def.damage,
    score: def.score,
    color: def.color,
    t: world.random() * 10,
    shootCd: 1 + world.random() * 1.5,
    burst: 0,
  };
  world.enemies.push(enemy);
  if (def.boss) world.boss = enemy;
  return enemy;
}

export function startWave(world, number) {
  world.wave = number;
  world.waveActive = true;
  world.spawnQueue = [];
  const comp = WAVES[number - 1];
  for (const kind of ['motes', 'drifters', 'spitters', 'brutes', 'warden']) {
    const count = comp[kind === 'motes' ? 'motes' : kind === 'drifters' ? 'drifters' : kind === 'spitters' ? 'spitters' : kind === 'brutes' ? 'brutes' : 'warden'] || 0;
    const single = kind === 'motes' ? 'mote' : kind === 'drifters' ? 'drifter' : kind === 'spitters' ? 'spitter' : kind === 'brutes' ? 'brute' : 'warden';
    for (let i = 0; i < count; i += 1) world.spawnQueue.push(single);
  }
  world.spawnQueue = shuffle(world.random, world.spawnQueue);
  world.spawnTimer = 0.4;
  world.banner = number === TOTAL_WAVES ? 'FINAL WAVE — THE GLOOM WARDEN' : `WAVE ${number}`;
  world.bannerTime = 2.2;
}

function offerUpgrades(world) {
  const pool = shuffle(world.random, UPGRADES);
  world.offer = pool.slice(0, 3);
}

export function applyUpgrade(world, index) {
  const upgrade = world.offer && world.offer[index];
  if (!upgrade) return false;
  upgrade.apply(world.player);
  world.offer = null;
  return true;
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const v = speed * (0.3 + world.random() * 0.7);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.35 + world.random() * 0.4,
      maxLife: 0.75,
      size: 2 + world.random() * 3,
      color,
    });
  }
}

function addText(world, x, y, text, color) {
  world.texts.push({ x, y, text, color: color || '#ffe082', life: 0.9, maxLife: 0.9 });
}

function firePlayer(world) {
  const p = world.player;
  const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
  const count = p.spread;
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * 0.14;
    const angle = base + offset;
    world.bullets.push({
      x: p.x + Math.cos(angle) * (p.radius + 6),
      y: p.y + Math.sin(angle) * (p.radius + 6),
      vx: Math.cos(angle) * p.bulletSpeed,
      vy: Math.sin(angle) * p.bulletSpeed,
      damage: p.bulletDamage,
      pierce: p.pierce,
      radius: PLAYER.bulletRadius,
      life: 1.2,
    });
  }
  burst(world, p.x + Math.cos(base) * (p.radius + 8), p.y + Math.sin(base) * (p.radius + 8), '#ffca28', 2, 90);
}

function hurtPlayer(world, damage) {
  const p = world.player;
  if (!p.alive || p.invulnerable > 0 || p.dashTime > 0) return;
  p.hp -= damage;
  p.invulnerable = PLAYER.invulnerableAfterHit;
  world.shake = Math.max(world.shake, 7);
  world.flash = 0.25;
  burst(world, p.x, p.y, '#ff5252', 10, 160);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    burst(world, p.x, p.y, '#ffd54f', 42, 320);
    burst(world, p.x, p.y, '#ff7043', 24, 220);
  }
}

function killEnemy(world, enemy, index) {
  world.enemies.splice(index, 1);
  world.kills += 1;
  world.score += enemy.score;
  burst(world, enemy.x, enemy.y, enemy.color, enemy.kind === 'warden' ? 60 : 14, 240);
  addText(world, enemy.x, enemy.y - enemy.radius, `+${enemy.score}`, enemy.color);
  const shards = enemy.kind === 'warden' ? 12 : enemy.kind === 'brute' ? 4 : 2;
  for (let i = 0; i < shards; i += 1) {
    world.pickups.push({
      kind: 'shard',
      x: enemy.x + (world.random() - 0.5) * 30,
      y: enemy.y + (world.random() - 0.5) * 30,
      vx: (world.random() - 0.5) * 60,
      vy: (world.random() - 0.5) * 60,
      radius: 6,
      life: 9,
    });
  }
  if (enemy.kind === 'brute' && world.random() < 0.4) {
    world.pickups.push({ kind: 'heart', x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: 9, life: 9 });
  }
  if (enemy.kind === 'warden') {
    world.boss = null;
    world.shake = 14;
    for (let i = 0; i < 10; i += 1) {
      world.pickups.push({ kind: 'heart', x: enemy.x + (world.random() - 0.5) * 90, y: enemy.y + (world.random() - 0.5) * 90, vx: 0, vy: 0, radius: 9, life: 12 });
    }
  }
}

function updateEnemy(world, enemy, dt) {
  const p = world.player;
  enemy.t += dt;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (enemy.kind === 'spitter') {
    // Keeps its distance and fires ember bolts at the player.
    const want = 260;
    const dir = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
    enemy.x += (dx / dist) * enemy.speed * dir * dt;
    enemy.y += (dy / dist) * enemy.speed * dir * dt;
    enemy.shootCd -= dt;
    if (enemy.shootCd <= 0 && p.alive) {
      enemy.shootCd = 2.2;
      const angle = Math.atan2(dy, dx);
      world.enemyBullets.push({
        x: enemy.x, y: enemy.y,
        vx: Math.cos(angle) * 175, vy: Math.sin(angle) * 175,
        damage: enemy.damage, radius: 6, life: 4,
      });
    }
  } else if (enemy.kind === 'warden') {
    // The boss drifts toward the player and fires radial bursts.
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
    enemy.shootCd -= dt;
    if (enemy.shootCd <= 0 && p.alive) {
      enemy.shootCd = enemy.hp < enemy.maxHp / 2 ? 1.6 : 2.4;
      const arms = enemy.hp < enemy.maxHp / 2 ? 12 : 8;
      for (let i = 0; i < arms; i += 1) {
        const angle = (i / arms) * Math.PI * 2 + enemy.t;
        world.enemyBullets.push({
          x: enemy.x, y: enemy.y,
          vx: Math.cos(angle) * 150, vy: Math.sin(angle) * 150,
          damage: 12, radius: 7, life: 5,
        });
      }
      world.shake = Math.max(world.shake, 4);
    }
    if (enemy.hp < enemy.maxHp / 2 && world.random() < dt * 0.5 && world.enemies.length < 14) {
      spawnEnemy(world, 'mote');
    }
  } else {
    // Motes, drifters and brutes chase the player, with a little wobble.
    const wobble = Math.sin(enemy.t * 3 + enemy.x * 0.01) * 0.35;
    const angle = Math.atan2(dy, dx) + wobble;
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;
  }
  const m = ARENA.margin;
  enemy.x = Math.max(m, Math.min(world.width - m, enemy.x));
  enemy.y = Math.max(m, Math.min(world.height - m, enemy.y));
}

// One fixed step of the live game. `input` is {moveX, moveY, aimX, aimY,
// firing, dash} in -1..1 / pixels / booleans. Returns event flags.
export function stepWorld(world, input, dt) {
  const p = world.player;
  let events = 0;
  world.time += dt;
  if (world.bannerTime > 0) world.bannerTime -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);
  if (!p.alive) {
    updateParticles(world, dt);
    return EVENT_OVER;
  }

  // --- player movement and dash ---
  p.aimX = input.aimX;
  p.aimY = input.aimY;
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (input.dash && p.dashCd <= 0 && p.dashTime <= 0) {
    // Dash toward the movement keys, or toward the aim when standing still.
    let dx = input.moveX;
    let dy = input.moveY;
    if (!dx && !dy) {
      dx = p.aimX - p.x;
      dy = p.aimY - p.y;
    }
    const len = Math.hypot(dx, dy) || 1;
    p.dashX = dx / len;
    p.dashY = dy / len;
    p.dashTime = PLAYER.dashTime;
    p.dashCd = p.dashCooldown;
  }
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
    world.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, size: 5, color: '#ffe082' });
  } else {
    const mx = input.moveX;
    const my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      p.x += (mx / len) * p.speed * dt;
      p.y += (my / len) * p.speed * dt;
    }
  }
  const m = ARENA.margin;
  p.x = Math.max(m + p.radius, Math.min(world.width - m - p.radius, p.x));
  p.y = Math.max(m + p.radius, Math.min(world.height - m - p.radius, p.y));

  // --- player fire ---
  if (p.fireCd > 0) p.fireCd -= dt;
  if (input.firing && p.fireCd <= 0) {
    p.fireCd = p.fireInterval;
    firePlayer(world);
  }

  // --- spawning ---
  if (world.waveActive && world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = 0.55;
      spawnEnemy(world, world.spawnQueue.shift());
    }
  }

  // --- enemies ---
  for (let i = world.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = world.enemies[i];
    updateEnemy(world, enemy, dt);
    const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    if (dist < p.radius + enemy.radius - 2) hurtPlayer(world, enemy.damage);
    if (!p.alive) return EVENT_OVER;
  }

  // --- player bullets ---
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < m || b.x > world.width - m || b.y < m || b.y > world.height - m) {
      world.bullets.splice(i, 1);
      continue;
    }
    for (let j = world.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = world.enemies[j];
      if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < b.radius + enemy.radius) {
        enemy.hp -= b.damage;
        burst(world, b.x, b.y, '#ffca28', 3, 120);
        if (enemy.hp <= 0) {
          killEnemy(world, enemy, j);
        } else if (b.pierce > 0) {
          b.pierce -= 1;
          break;
        }
        if (b.pierce <= 0) { world.bullets.splice(i, 1); break; }
      }
    }
  }

  // --- enemy bullets ---
  for (let i = world.enemyBullets.length - 1; i >= 0; i -= 1) {
    const b = world.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < m || b.x > world.width - m || b.y < m || b.y > world.height - m) {
      world.enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 2) {
      hurtPlayer(world, b.damage);
      world.enemyBullets.splice(i, 1);
      if (!p.alive) return EVENT_OVER;
    }
  }

  // --- pickups ---
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.life -= dt;
    const dist = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (dist < p.magnetRadius) {
      pk.x += ((p.x - pk.x) / (dist || 1)) * 320 * dt;
      pk.y += ((p.y - pk.y) / (dist || 1)) * 320 * dt;
    } else {
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= 0.96;
      pk.vy *= 0.96;
    }
    if (dist < p.radius + pk.radius + 4) {
      if (pk.kind === 'shard') {
        world.score += SCORE.shard;
        burst(world, pk.x, pk.y, '#ffe082', 3, 80);
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 18);
        addText(world, pk.x, pk.y - 12, '+18', '#81c784');
      }
      world.pickups.splice(i, 1);
      continue;
    }
    if (pk.life <= 0) world.pickups.splice(i, 1);
  }

  updateParticles(world, dt);

  // --- wave cleared? ---
  if (world.waveActive && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.waveActive = false;
    world.score += SCORE.waveClear * world.wave;
    // Clearing a wave steadies the keeper's light a little.
    p.hp = Math.min(p.maxHp, p.hp + 15);
    if (world.wave >= TOTAL_WAVES) {
      events |= EVENT_VICTORY;
    } else {
      offerUpgrades(world);
      events |= EVENT_WAVE_CLEAR;
    }
  }
  return events;
}

function updateParticles(world, dt) {
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94;
    pt.vy *= 0.94;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.texts.length - 1; i >= 0; i -= 1) {
    const t = world.texts[i];
    t.y -= 34 * dt;
    t.life -= dt;
    if (t.life <= 0) world.texts.splice(i, 1);
  }
}

export { STEP };
