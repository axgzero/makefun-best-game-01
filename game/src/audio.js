// All sound is synthesized with WebAudio: no audio files, nothing to download.
// A tiny synth voice per effect, a master gain, and M to mute.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.32;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume || 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, volume, lowpass) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot() { tone(720 + Math.random() * 120, 0.07, 'square', 0.07, 320); },
    hit() { tone(190, 0.06, 'triangle', 0.12, 90); },
    kill() { noise(0.16, 0.22, 900); tone(320, 0.14, 'sawtooth', 0.08, 70); },
    pickup() { tone(880, 0.09, 'sine', 0.12, 1320); },
    hurt() { tone(140, 0.22, 'sawtooth', 0.2, 55); noise(0.12, 0.14, 500); },
    dash() { noise(0.14, 0.12, 2400); },
    horn() { tone(196, 0.5, 'triangle', 0.16, 392); tone(294, 0.5, 'triangle', 0.1, 392); },
    boss() { tone(98, 0.8, 'sawtooth', 0.18, 49); tone(147, 0.8, 'sawtooth', 0.12, 73); },
    upgrade() { tone(523, 0.12, 'sine', 0.14); setTimeout(() => tone(784, 0.16, 'sine', 0.14), 90); },
    victory() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 130)); },
    gameOver() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.32, 'triangle', 0.14), i * 160)); },
  };
}
