// Original procedural audio for Noah's Arkade (Web Audio; no sample files, no
// third-party recordings). The AudioContext is only created after a user gesture,
// so browsers' autoplay rules are always respected.
import { busGain, type Settings } from '../state/settings';

export type Cue = 'select' | 'confirm' | 'back' | 'reveal' | 'start' | 'tick';

type Ctx = AudioContext;

const MIDI = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Warm modal progression (D dorian colour) for the title loop.
const CHORDS: number[][] = [
  [50, 57, 62, 64, 69], // Dm9-ish
  [46, 53, 57, 62, 65], // Bbmaj7
  [43, 50, 55, 58, 62], // Gm9
  [45, 52, 57, 59, 64], // Asus2
];
const PENTA = [62, 64, 67, 69, 72, 74, 76, 79];

class AudioManager {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private delay!: DelayNode;
  // Echo sends follow their bus level so muting a bus also silences its echoes.
  private sfxSend!: GainNode;
  private musicSend!: GainNode;
  private settings: Settings | null = null;
  private musicTimer: number | null = null;
  private nextBar = 0;
  private bar = 0;
  private musicWanted = false;
  private noiseBuf: AudioBuffer | null = null;

  get unlocked() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a user-gesture handler. Safe to call repeatedly. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.build();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null; // audio unavailable; the game stays fully usable
    }
  }

  private build() {
    const c = this.ctx!;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(c.destination);
    this.music = c.createGain();
    this.sfx = c.createGain();
    this.music.gain.value = 0;
    this.sfx.gain.value = 0;
    // A soft tape-ish echo shared by music plucks and bell cues.
    this.delay = c.createDelay(1.5);
    this.delay.delayTime.value = 0.375;
    const fb = c.createGain();
    fb.gain.value = 0.28;
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    this.delay.connect(tone).connect(fb).connect(this.delay);
    const wet = c.createGain();
    wet.gain.value = 0.35;
    tone.connect(wet).connect(this.master);
    this.sfxSend = c.createGain();
    this.musicSend = c.createGain();
    this.sfxSend.gain.value = 0;
    this.musicSend.gain.value = 0;
    this.sfxSend.connect(this.delay);
    this.musicSend.connect(this.delay);
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.master.gain.setTargetAtTime(1, c.currentTime, 0.05);
    if (this.settings) this.apply(this.settings);
  }

  apply(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // setTargetAtTime avoids zipper noise / clicks on every change.
    this.music.gain.setTargetAtTime(busGain(s, 'music') * 0.55, t, 0.08);
    this.sfx.gain.setTargetAtTime(busGain(s, 'sfx'), t, 0.03);
    this.musicSend.gain.setTargetAtTime(busGain(s, 'music') * 0.55, t, 0.08);
    this.sfxSend.gain.setTargetAtTime(busGain(s, 'sfx'), t, 0.03);
  }

  play(cue: Cue): void {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime + 0.005;
    switch (cue) {
      case 'tick':
      case 'select':
        this.bell(t, 1568, 0.09, 0.16, 3.01, cue === 'tick' ? 0.5 : 1);
        this.bell(t + 0.012, 2349, 0.05, 0.1, 2.0, 0.5);
        break;
      case 'confirm':
        this.bell(t, 784, 0.16, 0.5, 3.5, 1, true);
        this.bell(t + 0.07, 1175, 0.14, 0.55, 3.5, 1, true);
        this.noiseHit(t, 0.06, 5200, 0.05);
        break;
      case 'back':
        this.bell(t, 1046, 0.1, 0.22, 2.0, 0.8);
        this.bell(t + 0.06, 784, 0.1, 0.3, 2.0, 0.8);
        break;
      case 'start':
        [0, 0.08, 0.16, 0.26].forEach((dt, i) => this.bell(t + dt, MIDI([62, 69, 74, 81][i]), 0.13, 0.9, 3.5, 1, true));
        this.swell(t, [50, 57, 62, 66, 69], 1.8, 0.11);
        break;
      case 'reveal':
        this.swell(t, [38, 50, 57, 62, 64], 2.6, 0.13);
        [0.9, 1.15, 1.45].forEach((dt, i) => this.bell(t + dt, MIDI([81, 86, 88][i]), 0.06, 1.2, 3.5, 0.7, true));
        break;
    }
  }

  // FM bell: carrier + ratio modulator with decaying index — metallic, warm, short.
  private bell(t: number, freq: number, peak: number, dur: number, ratio: number, level = 1, echo = false) {
    const c = this.ctx!;
    const car = c.createOscillator();
    const mod = c.createOscillator();
    const modGain = c.createGain();
    const amp = c.createGain();
    car.type = 'sine';
    mod.type = 'sine';
    car.frequency.value = freq;
    mod.frequency.value = freq * ratio;
    modGain.gain.setValueAtTime(freq * 1.6, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak * level, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    mod.connect(modGain).connect(car.frequency);
    car.connect(amp).connect(this.sfx);
    if (echo) amp.connect(this.sfxSend);
    car.start(t);
    mod.start(t);
    car.stop(t + dur + 0.05);
    mod.stop(t + dur + 0.05);
  }

  private noiseHit(t: number, dur: number, freq: number, peak: number) {
    const c = this.ctx!;
    if (!this.noiseBuf) return;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private swell(t: number, notes: number[], dur: number, peak: number, dest?: AudioNode) {
    const c = this.ctx!;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.5);
    lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g).connect(dest ?? this.sfx);
    notes.forEach((n, i) => {
      for (const det of [-6, 6]) {
        const o = c.createOscillator();
        o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.frequency.value = MIDI(n);
        o.detune.value = det;
        const og = c.createGain();
        og.gain.value = i === 0 ? 0.5 : 0.16;
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    });
  }

  // ---- Title music: generative, quiet, scheduled ahead with a lookahead timer ----
  startMusic(): void {
    this.musicWanted = true;
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextBar = this.ctx.currentTime + 0.3;
    this.musicTimer = window.setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stopMusic(): void {
    this.musicWanted = false;
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  get musicPlaying() {
    return this.musicWanted;
  }

  private schedule() {
    const c = this.ctx;
    if (!c) return;
    const BAR = 4.8;
    while (this.nextBar < c.currentTime + 1.2) {
      const t = this.nextBar;
      const chord = CHORDS[this.bar % CHORDS.length];
      this.pad(t, chord, BAR);
      // Sparse plucks: deterministic pattern so it feels composed, not random.
      const pattern = [0, 1.2, 1.8, 3.0, 3.6];
      pattern.forEach((dt, i) => {
        if ((this.bar + i) % 3 === 2) return;
        const n = PENTA[(this.bar * 3 + i * 2) % PENTA.length];
        this.pluck(t + dt, MIDI(n), 0.035);
      });
      this.nextBar += BAR;
      this.bar++;
    }
  }

  private pad(t: number, notes: number[], dur: number) {
    const c = this.ctx!;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 1.4);
    g.gain.setValueAtTime(0.06, t + dur - 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
    lp.connect(g).connect(this.music);
    notes.forEach((n, i) => {
      const o = c.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = MIDI(n);
      o.detune.value = (i % 2 ? 1 : -1) * 4;
      const og = c.createGain();
      og.gain.value = i === 0 ? 0.9 : 0.35;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + dur + 1);
    });
  }

  private pluck(t: number, freq: number, peak: number) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    g.connect(this.music);
    g.connect(this.musicSend);
    o.start(t);
    o.stop(t + 1);
  }
}

export const audio = new AudioManager();
