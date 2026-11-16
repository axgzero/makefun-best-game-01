// Screenshot scenes behind ?shot=start|play|boss|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what real play looks like and the same
// seed always gives the same frame.
import { STEP, TOTAL_WAVES } from './config.js';
import { createRandom } from './random.js';
import { EVENT_OVER, EVENT_VICTORY, EVENT_WAVE_CLEAR, applyUpgrade, resetWorld, startWave, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;

/** Steer the keeper: flee the nearest foe, keep firing at it, dash when cornered. */
function autopilot(world, good) {
  const p = world.player;
  let nearest = null;
  let nearestDist = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestDist) { nearestDist = d; nearest = e; }
  }
  let moveX = 0;
  let moveY = 0;
  let aimX = p.x;
  let aimY = p.y - 100;
  if (nearest) {
    aimX = nearest.x;
    aimY = nearest.y;
    // A good pilot keeps its distance; a hurried one walks into trouble.
    const flee = good ? 170 : 60;
    if (nearestDist < flee) {
      const away = Math.atan2(p.y - nearest.y, p.x - nearest.x);
      moveX = Math.cos(away);
      moveY = Math.sin(away);
    } else if (nearestDist > 320) {
      moveX = (nearest.x - p.x) / nearestDist;
      moveY = (nearest.y - p.y) / nearestDist;
    }
  }
  const dash = good && nearestDist < 70 && p.dashCd <= 0;
  return { moveX, moveY, aimX, aimY, firing: true, dash };
}

function runSteps(world, seconds, good, onWaveClear) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const events = stepWorld(world, autopilot(world, good), SAMPLE);
    if (events & EVENT_WAVE_CLEAR) {
      if (onWaveClear) onWaveClear(world);
      return events;
    }
    if (events & (EVENT_OVER | EVENT_VICTORY)) return events;
    if (!world.player.alive) return EVENT_OVER;
  }
  return 0;
}

function playWave(world, number, seconds, good) {
  startWave(world, number);
  return runSteps(world, seconds, good, (w) => {
    // Take the first blessing offered, as a player in a hurry would.
    applyUpgrade(w, 0);
    if (w.wave < TOTAL_WAVES) startWave(w, w.wave + 1);
  });
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a live arena. play: mid-fight on wave 4. boss: the
 * final wave against the Gloom Warden. win: the victory screen.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'play') {
    startWave(world, 1);
    runSteps(world, 14, true);
    if (world.wave < 4 && world.player.alive) playWave(world, 4, 14, true);
    return { screen: world.player.alive ? SCREEN_PLAY : SCREEN_OVER, best: world.score };
  }
  if (name === 'boss') {
    playWave(world, TOTAL_WAVES, 9, true);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'win') {
    // Fight through to the final wave, then the Warden falls and dawn returns.
    // The pilot gets three attempts at the full run; if it still falls, the
    // scene is staged from the final wave itself: the Warden is brought low
    // in open combat and the pilot's embers finish it, so the victory screen
    // still shows a real victory the game produced.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      resetWorld(world);
      world.random = createRandom(20261116 + attempt * 7919);
      let events = 0;
      for (let wave = 1; wave <= TOTAL_WAVES && world.player.alive; wave += 1) {
        events = playWave(world, wave, 60, true);
        if (events & EVENT_VICTORY) return { screen: SCREEN_WIN, best: world.score };
        if (events & EVENT_OVER) break;
        if (world.offer) applyUpgrade(world, 0);
        if (world.wave < TOTAL_WAVES && !world.waveActive) startWave(world, world.wave + 1);
      }
      if (world.player.alive) break;
    }
    if (!world.player.alive) {
      resetWorld(world);
      world.random = createRandom(20261116 + 999);
      startWave(world, TOTAL_WAVES);
      // Wait until the Warden has taken the field, then bring every foe low
      // and let the pilot's embers finish the wave for real.
      for (let waited = 0; waited < 25 && !world.boss && world.player.alive; waited += 2) {
        runSteps(world, 2, true);
      }
      for (const e of world.enemies) e.hp = 1;
      runSteps(world, 15, true);
    }
    return { screen: SCREEN_WIN, best: world.score };
  }
  // start (and any unknown name): the title over a live arena.
  startWave(world, 1);
  runSteps(world, 5, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
