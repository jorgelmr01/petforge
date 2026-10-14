// PETFORGE — tiny WebAudio synth SFX. No audio assets needed.

type SfxName =
  | 'tap' | 'happy' | 'eat' | 'sparkle' | 'coin' | 'fuse' | 'fanfare'
  | 'hit' | 'hurt' | 'win' | 'lose' | 'hatch' | 'pop' | 'sleep' | 'error';

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  private ac(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Call once from a user gesture to unlock audio on iOS. */
  unlock() { this.ac(); }

  private tone(freq: number, dur = 0.12, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number, delay = 0) {
    const ctx = this.ac();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur = 0.1, freq = 1200, vol = 0.12, delay = 0) {
    const ctx = this.ac();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t0);
  }

  private arp(freqs: number[], step = 0.09, type: OscillatorType = 'triangle', vol = 0.16) {
    freqs.forEach((f, i) => this.tone(f, 0.16, type, vol, undefined, i * step));
  }

  play(name: SfxName) {
    switch (name) {
      case 'tap': this.tone(660, 0.08, 'sine', 0.14, 880); break;
      case 'pop': this.tone(440, 0.09, 'square', 0.08, 880); break;
      case 'happy': this.arp([523, 659, 784], 0.08); break;
      case 'eat':
        this.noise(0.07, 900, 0.16); this.noise(0.07, 700, 0.16, 0.12); this.noise(0.09, 500, 0.18, 0.24);
        break;
      case 'sparkle': this.arp([1046, 1318, 1568, 2093], 0.06, 'sine', 0.1); break;
      case 'coin': this.tone(988, 0.08, 'square', 0.07); this.tone(1319, 0.14, 'square', 0.07, undefined, 0.07); break;
      case 'fuse':
        this.tone(180, 0.7, 'sawtooth', 0.1, 1400);
        this.noise(0.5, 3000, 0.05, 0.2);
        this.arp([784, 988, 1175, 1568], 0.07, 'triangle', 0.14);
        break;
      case 'fanfare': this.arp([523, 523, 659, 784, 1046, 1318], 0.1, 'triangle', 0.16); break;
      case 'hit': this.tone(150, 0.15, 'square', 0.2, 60); this.noise(0.12, 400, 0.2); break;
      case 'hurt': this.tone(300, 0.2, 'sawtooth', 0.12, 120); break;
      case 'win': this.arp([523, 659, 784, 1046, 784, 1046], 0.09); break;
      case 'lose': this.arp([392, 330, 262, 196], 0.14, 'sawtooth', 0.1); break;
      case 'hatch':
        this.noise(0.1, 2000, 0.14); this.noise(0.1, 2500, 0.14, 0.15);
        this.arp([659, 784, 1046, 1318, 1568], 0.07, 'sine', 0.14);
        break;
      case 'sleep': this.arp([440, 392, 330], 0.18, 'sine', 0.1); break;
      case 'error': this.tone(220, 0.15, 'square', 0.1, 180); break;
    }
  }
}

export const sfx = new Sfx();
