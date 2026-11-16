// Everything LUMENFALL draws: the arena, the lantern-keeper, the gloom, the
// particles, the HUD and every screen. Drawing reads the world, never mutates it.
import { ARENA, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_PAUSE = 'pause';

const FONT = "'Trebuchet MS', 'Segoe UI', sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawWorld(ctx, world, screen) {
  const { width: w, height: h } = world;
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }

  // Deep night background with a faint ember-star field.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0620');
  bg.addColorStop(0.6, '#120a2e');
  bg.addColorStop(1, '#0a0518');
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, w + 40, h + 40);

  // Arena border.
  ctx.strokeStyle = ARENA.wallGlow;
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.margin, ARENA.margin, w - 2 * ARENA.margin, h - 2 * ARENA.margin);
  ctx.strokeStyle = 'rgba(120,90,220,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ARENA.margin + 5, ARENA.margin + 5, w - 2 * ARENA.margin - 10, h - 2 * ARENA.margin - 10);

  // The player's light: a warm pool that shrinks as their light falls.
  const p = world.player;
  if (p.alive) {
    const lightFrac = p.hp / p.maxHp;
    drawGlowCircle(ctx, p.x, p.y, p.lightRadius * (0.55 + 0.45 * lightFrac), '#ffca28', 0.16);
  }

  // Pickups.
  for (const pk of world.pickups) {
    if (pk.kind === 'shard') {
      drawGlowCircle(ctx, pk.x, pk.y, 14, '#ffe082', 0.8);
      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${pk.radius + 4}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', pk.x, pk.y + 1);
    }
  }

  // Enemies.
  for (const e of world.enemies) drawEnemy(ctx, e, world.time);

  // Bullets.
  for (const b of world.bullets) {
    drawGlowCircle(ctx, b.x, b.y, 12, '#ffca28', 0.7);
    ctx.fillStyle = '#ffe082';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of world.enemyBullets) {
    drawGlowCircle(ctx, b.x, b.y, 13, '#e040fb', 0.7);
    ctx.fillStyle = '#ea80fc';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player: a lantern-keeper wisp with a flame and an aim line.
  if (p.alive) {
    const flicker = 1 + Math.sin(world.time * 9) * 0.08;
    drawGlowCircle(ctx, p.x, p.y, p.radius * 3.4 * flicker, '#ffca28', 0.55);
    ctx.fillStyle = p.invulnerable > 0 && Math.floor(world.time * 12) % 2 === 0 ? '#fff9c4' : '#ffd54f';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8e1';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Aim tick.
    const angle = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    ctx.strokeStyle = 'rgba(255,224,130,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(angle) * (p.radius + 4), p.y + Math.sin(angle) * (p.radius + 4));
    ctx.lineTo(p.x + Math.cos(angle) * (p.radius + 16), p.y + Math.sin(angle) * (p.radius + 16));
    ctx.stroke();
  }

  // Particles and floating texts.
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // Hurt flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,40,40,${world.flash * 0.5})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();

  if (screen === SCREEN_PLAY || screen === SCREEN_UPGRADE || screen === SCREEN_PAUSE) {
    drawHud(ctx, world);
  }
  if (world.bannerTime > 0 && screen === SCREEN_PLAY) {
    ctx.globalAlpha = Math.min(1, world.bannerTime);
    ctx.font = `bold 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.shadowColor = '#ff8f00';
    ctx.shadowBlur = 24;
    ctx.fillText(world.banner, w / 2, h * 0.32);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function drawEnemy(ctx, e, time) {
  drawGlowCircle(ctx, e.x, e.y, e.radius * 2.2, e.color, 0.35);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  if (e.kind === 'mote') {
    // Spiked little orb.
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + time * 2;
      const r = i % 2 === 0 ? e.radius + 4 : e.radius - 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'drifter') {
    ctx.rotate(Math.atan2(Math.sin(time), Math.cos(time)) * 0.2 + time * 0.4);
    ctx.beginPath();
    ctx.moveTo(e.radius, 0);
    ctx.lineTo(-e.radius * 0.8, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.4, 0);
    ctx.lineTo(-e.radius * 0.8, -e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'spitter') {
    ctx.rotate(Math.PI / 4 + Math.sin(time * 2) * 0.15);
    ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
    ctx.strokeRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
  } else if (e.kind === 'brute') {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + time * 0.5;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * e.radius, Math.sin(a) * e.radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // The Gloom Warden: a crowned dark orb with a rotating ring.
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 10, time, time + Math.PI * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 10, time + Math.PI, time + Math.PI * 2.4);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-e.radius * 0.35, -e.radius * 0.2, 5, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.35, -e.radius * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Health bar for hurt foes and the boss.
  if (e.hp < e.maxHp) {
    const bw = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw, 5);
    ctx.fillStyle = e.kind === 'warden' ? '#e040fb' : '#81c784';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawHud(ctx, world) {
  const { width: w } = world;
  const p = world.player;
  ctx.save();
  ctx.textBaseline = 'middle';

  // Top-left: light (health) bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 14, 12, 250, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#3e2723';
  roundRect(ctx, 22, 20, 170, 14, 7);
  ctx.fill();
  const frac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = frac > 0.5 ? '#ffb300' : frac > 0.25 ? '#ff7043' : '#e53935';
  if (frac > 0) {
    roundRect(ctx, 22, 20, 170 * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#ffe082';
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`LIGHT ${Math.ceil(p.hp)}/${p.maxHp}`, 200, 27);

  // Top-centre: wave and foes left.
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const foes = world.enemies.length + world.spawnQueue.length;
  ctx.fillText(`WAVE ${Math.max(1, world.wave)} / ${TOTAL_WAVES}   ·   FOES ${foes}`, w / 2, 27);

  // Top-right: score and best.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe082';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`SCORE ${world.score}`, w - 16, 22);
  ctx.fillStyle = '#b39ddb';
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, w - 16, 42);

  // Boss bar.
  if (world.boss) {
    const bw = Math.min(560, w * 0.5);
    const bx = (w - bw) / 2;
    const by = 52;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, bx, by, bw, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#e040fb';
    roundRect(ctx, bx, by, bw * Math.max(0, world.boss.hp / world.boss.maxHp), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#f3e5f5';
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('THE GLOOM WARDEN', w / 2, by + 26);
  }

  // Dash cooldown, bottom centre.
  const dashFrac = 1 - Math.max(0, p.dashCd) / p.dashCooldown;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, w / 2 - 70, world.height - 30, 140, 12, 6);
  ctx.fill();
  ctx.fillStyle = dashFrac >= 1 ? '#80d8ff' : '#546e7a';
  if (dashFrac > 0) {
    roundRect(ctx, w / 2 - 70, world.height - 30, 140 * dashFrac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = '#e1f5fe';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(dashFrac >= 1 ? 'DASH READY  [SPACE]' : 'DASH…', w / 2, world.height - 44);
  ctx.restore();
}

function dim(ctx, world) {
  ctx.fillStyle = 'rgba(5,2,16,0.72)';
  ctx.fillRect(0, 0, world.width, world.height);
}

function panel(ctx, world, title, lines, accent) {
  const { width: w, height: h } = world;
  dim(ctx, world);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || '#ffe082';
  ctx.font = `bold 52px ${FONT}`;
  ctx.shadowColor = accent || '#ff8f00';
  ctx.shadowBlur = 26;
  ctx.fillText(title, w / 2, h * 0.24);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ede7f6';
  ctx.font = `19px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h * 0.24 + 44 + i * 30);
  });
  ctx.restore();
}

export function drawTitle(ctx, world) {
  panel(ctx, world, 'LUMENFALL', [
    'Keep the last light alive.',
    '',
    'WASD / arrows — move      Mouse — aim      Hold click — fire embers',
    'SPACE — dash through danger      P — pause      M — mute',
    'Survive 10 waves. Slay the Gloom Warden. Choose your light between waves.',
    '',
    world.best > 0 ? `Best score: ${world.best}` : 'No lantern has fallen yet — be the first.',
    '',
    '— PRESS ENTER OR CLICK TO BEGIN —',
  ]);
}

export function drawGameOver(ctx, world, stats) {
  panel(ctx, world, 'THE LIGHT GOES OUT', [
    `You fell on wave ${stats.wave}.`,
    `Score ${stats.score}   ·   ${stats.kills} foes banished   ·   ${stats.time}s survived`,
    `Best score: ${Math.max(world.best, stats.score)}`,
    '',
    '— PRESS R OR CLICK TO TRY AGAIN —',
  ], '#ef5350');
}

export function drawVictory(ctx, world, stats) {
  panel(ctx, world, 'THE DAWN RETURNS', [
    'The Gloom Warden is banished. Every lantern burns bright again.',
    `Score ${stats.score}   ·   ${stats.kills} foes banished   ·   ${stats.time}s`,
    `Best score: ${Math.max(world.best, stats.score)}`,
    '',
    '— PRESS R OR CLICK TO PLAY AGAIN —',
  ], '#81c784');
}

export function drawPause(ctx, world) {
  panel(ctx, world, 'PAUSED', [
    'The gloom waits.',
    '',
    '— PRESS P TO RESUME —',
  ]);
}

export function upgradeCardRects(world) {
  const { width: w, height: h } = world;
  const cardW = 250;
  const cardH = 150;
  const gap = 24;
  const total = cardW * 3 + gap * 2;
  const y = h / 2 - cardH / 2 + 30;
  return [0, 1, 2].map((i) => ({
    x: (w - total) / 2 + i * (cardW + gap),
    y,
    w: cardW,
    h: cardH,
  }));
}

export function drawUpgrade(ctx, world) {
  const { width: w, height: h } = world;
  dim(ctx, world);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe082';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(`WAVE ${world.wave} CLEARED`, w / 2, h * 0.22);
  ctx.fillStyle = '#ede7f6';
  ctx.font = `19px ${FONT}`;
  ctx.fillText('Choose one blessing of light — press 1, 2 or 3, or click a card.', w / 2, h * 0.22 + 40);
  const rects = upgradeCardRects(world);
  (world.offer || []).forEach((up, i) => {
    const r = rects[i];
    ctx.fillStyle = 'rgba(38,20,80,0.95)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffe082';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`${i + 1}`, r.x + r.w / 2, r.y + 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText(up.name, r.x + r.w / 2, r.y + 70);
    ctx.fillStyle = '#cfc4e8';
    ctx.font = `16px ${FONT}`;
    ctx.fillText(up.desc, r.x + r.w / 2, r.y + 102);
  });
  ctx.restore();
}
