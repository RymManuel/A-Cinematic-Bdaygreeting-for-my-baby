// Simple audio player that wraps an HTMLAudioElement with an AudioContext gain node
export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private started = false;

  constructor(private src: string) {}

  async start() {
    if (this.started) {
      this.resume();
      return;
    }
    this.audio = new Audio(this.src);
    this.audio.loop = true;
    this.audio.preload = 'auto';

    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    try {
      this.ctx = new AC();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      const srcNode = this.ctx.createMediaElementSource(this.audio);
      srcNode.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      await this.audio.play();
      // gentle fade in
      const now = this.ctx.currentTime;
      this.gain.gain.setValueAtTime(0, now);
      this.gain.gain.linearRampToValueAtTime(0.7, now + 6);
    } catch (e) {
      // fallback: try plain audio play (no WebAudio)
      try { await this.audio.play(); } catch (err) { /* ignore */ }
    }
    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.gain && this.ctx) {
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1.2);
    } else if (this.audio) {
      this.audio.play().catch(() => {});
    }
  }

  mute() {
    if (this.gain && this.ctx) {
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    } else if (this.audio) {
      try { this.audio.pause(); } catch (e) {}
    }
  }

  swellPeak() {
    if (this.gain && this.ctx) {
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.linearRampToValueAtTime(0.95, this.ctx.currentTime + 3.5);
    }
  }

  setVolume(v: number) {
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime);
    } else if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, v));
    }
  }

  destroy() {
    try {
      if (this.audio) { this.audio.pause(); this.audio.src = ''; }
      if (this.ctx) { this.ctx.close(); }
    } catch (e) {}
    this.audio = null; this.ctx = null; this.gain = null; this.started = false;
  }
}
