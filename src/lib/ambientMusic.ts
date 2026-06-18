// Lightweight cinematic ambient pad generator using the Web Audio API.
// No external audio files required. Slowly building, dreamy, emotional.
export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode }[] = [];
  private started = false;
  private startTime = 0;

  // A soft minor-ish chord progression of frequencies (dreamy pad)
  private voices = [
    164.81, // E3
    196.0,  // G3
    246.94, // B3
    329.63, // E4
    392.0,  // G4
  ];

  async start() {
    if (this.started) {
      this.resume();
      return;
    }
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // gentle reverb-ish via a lowpass + delay feedback
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.connect(this.master);

    const now = this.ctx.currentTime;
    this.startTime = now;

    this.voices.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      const gain = this.ctx!.createGain();
      gain.gain.value = 0;

      // slow swelling LFO on amplitude for a breathing pad
      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.013;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(now);
      lfo.start(now);

      // staggered fade-in to build slowly
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05 + i * 0.01, now + 6 + i * 2);

      this.nodes.push({ osc, gain, lfo });
    });

    // master swell – slow build over the whole experience
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(0.5, now + 12);
    this.master.gain.linearRampToValueAtTime(0.75, now + 90);

    this.started = true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1.5);
    }
  }

  mute() {
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8);
    }
  }

  swellPeak() {
    // emotional peak for the reveal
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0.95, this.ctx.currentTime + 4);
    }
  }
}
