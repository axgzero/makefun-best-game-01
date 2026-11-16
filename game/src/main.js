// LUMENFALL — boot, the game loop and the state machine.
// States: title -> play -> upgrade (between waves) -> play ... -> win | over.
// P pauses, M mutes, R restarts from an end screen, Enter starts.
import { STEP, TOTAL_WAVES } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { EVENT_OVER, EVENT_VICTORY, EVENT_WAVE_CLEAR, applyUpgrade, createWorld, resetWorld, startWave, stepWorld } from './world.js';
import {
  SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN,
  drawGameOver, drawPause, drawTitle, drawUpgrade, drawVictory, drawWorld, upgradeCardRects,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1');

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(window.innerWidth, window.innerHeight, seed);
// A small debug handle for play-testing in the browser console.
window.__lumenfall = { world, screen: () => screen, startGame };
world.best = Number(window.localStorage.getItem('lumenfall-best') || '0') || 0;

let screen = SCREEN_TITLE;
let stats = { score: 0, kills: 0, wave: 0, time: 0 };
let lastTime = 0;
let accumulator = 0;
let shootSoundCd = 0;

function saveBest() {
  if (world.score > world.best) {
    world.best = world.score;
    window.localStorage.setItem('lumenfall-best', String(world.best));
  }
}

function startGame() {
  audio.unlock();
  resetWorld(world);
  world.best = Number(window.localStorage.getItem('lumenfall-best') || '0') || 0;
  stats = { score: 0, kills: 0, wave: 0, time: 0 };
  startWave(world, 1);
  audio.horn();
  screen = SCREEN_PLAY;
  announce('Wave 1. Keep the light alive.');
}

function endRun(win) {
  saveBest();
  stats = {
    score: world.score,
    kills: world.kills,
    wave: world.wave,
    time: Math.round(world.time),
  };
  screen = win ? SCREEN_WIN : SCREEN_OVER;
  if (win) audio.victory();
  else audio.gameOver();
  announce(win ? `Victory! Score ${stats.score}.` : `Game over on wave ${stats.wave}. Score ${stats.score}.`);
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function chooseUpgrade(index) {
  if (screen !== SCREEN_UPGRADE) return;
  if (applyUpgrade(world, index)) {
    audio.upgrade();
    if (world.wave < TOTAL_WAVES) startWave(world, world.wave + 1);
    screen = SCREEN_PLAY;
  }
}

function handleKeys() {
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (screen === SCREEN_TITLE) {
    if (input.wasPressed('enter') || input.state.clicked) startGame();
  } else if (screen === SCREEN_PLAY) {
    if (input.wasPressed('p')) screen = SCREEN_PAUSE;
    if (input.wasPressed(' ') && world.player.dashCd <= 0) {
      // Dash is read from the live key state in the step input below.
    }
  } else if (screen === SCREEN_PAUSE) {
    if (input.wasPressed('p') || input.wasPressed('enter')) screen = SCREEN_PLAY;
  } else if (screen === SCREEN_UPGRADE) {
    if (input.wasPressed('1')) chooseUpgrade(0);
    else if (input.wasPressed('2')) chooseUpgrade(1);
    else if (input.wasPressed('3')) chooseUpgrade(2);
    else if (input.state.clicked) {
      const rects = upgradeCardRects(world);
      rects.forEach((r, i) => {
        if (input.state.clickX >= r.x && input.state.clickX <= r.x + r.w
          && input.state.clickY >= r.y && input.state.clickY <= r.y + r.h) chooseUpgrade(i);
      });
    }
  } else if (screen === SCREEN_OVER || screen === SCREEN_WIN) {
    if (input.wasPressed('r') || input.wasPressed('enter') || input.state.clicked) startGame();
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  if (lastTime === 0) lastTime = time;
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  if (dt > 0.25) dt = 0.25;

  resize();
  world.width = canvas.width;
  world.height = canvas.height;

  handleKeys();

  if (screen === SCREEN_PLAY) {
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const events = stepWorld(world, {
        moveX: input.moveX(),
        moveY: input.moveY(),
        aimX: input.state.mouseX,
        aimY: input.state.mouseY,
        firing: input.state.mouseDown,
        dash: input.state.keys.has(' '),
      }, STEP);
      if (events & EVENT_OVER) { endRun(false); break; }
      if (events & EVENT_VICTORY) { endRun(true); break; }
      if (events & EVENT_WAVE_CLEAR) {
        screen = SCREEN_UPGRADE;
        audio.horn();
        announce(`Wave ${world.wave} cleared. Choose a blessing.`);
        break;
      }
      if (input.state.mouseDown) {
        shootSoundCd -= STEP;
        if (shootSoundCd <= 0) {
          audio.shoot();
          shootSoundCd = world.player.fireInterval;
        }
      }
    }
  } else if (screen === SCREEN_TITLE) {
    // The title lives over a demo game: the keeper fights on its own, so the
    // arena behind the panel is alive. If it falls, the demo restarts.
    accumulator += dt;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const p = world.player;
      let nearest = null;
      let nearestDist = Infinity;
      for (const e of world.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < nearestDist) { nearestDist = d; nearest = e; }
      }
      const events = stepWorld(world, {
        moveX: nearest && nearestDist < 170 ? (p.x - nearest.x) / nearestDist : 0,
        moveY: nearest && nearestDist < 170 ? (p.y - nearest.y) / nearestDist : 0,
        aimX: nearest ? nearest.x : p.x,
        aimY: nearest ? nearest.y : p.y - 100,
        firing: true,
        dash: false,
      }, STEP);
      if (events & EVENT_WAVE_CLEAR) {
        if (world.wave < TOTAL_WAVES) startWave(world, world.wave + 1);
        else startWave(world, 1);
      }
      if (!p.alive || (!world.waveActive && world.enemies.length === 0)) {
        resetWorld(world);
        startWave(world, 1);
      }
    }
  }

  drawWorld(ctx, world, screen);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  else if (screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
  else if (screen === SCREEN_OVER) drawGameOver(ctx, world, stats);
  else if (screen === SCREEN_WIN) drawVictory(ctx, world, stats);
  else if (screen === SCREEN_PAUSE) drawPause(ctx, world);

  input.endFrame();
}

if (shotName) {
  // Screenshot mode: stage one deterministic scene, draw it once, signal ready.
  resize();
  world.width = canvas.width;
  world.height = canvas.height;
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  if (screen === SCREEN_WIN) {
    stats = { score: world.score, kills: world.kills, wave: TOTAL_WAVES, time: Math.round(world.time) };
    drawWorld(ctx, world, SCREEN_WIN);
    drawVictory(ctx, world, stats);
  } else if (screen === SCREEN_OVER) {
    stats = { score: world.score, kills: world.kills, wave: world.wave, time: Math.round(world.time) };
    drawWorld(ctx, world, SCREEN_OVER);
    drawGameOver(ctx, world, stats);
  } else {
    drawWorld(ctx, world, screen);
    if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  }
  window.__shotReady = true;
} else {
  window.addEventListener('resize', resize);
  resize();
  startWave(world, 1);
  requestAnimationFrame(frame);
}
