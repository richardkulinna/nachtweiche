'use strict';
// Small, locally synthesized score. The melody and station calls share the same scale.
window.StationSound = class StationSound {
  constructor() {
    this.context = null;
    this.level = .38;
    this.music = .35;
    this.enabled = true;
    this.next = 0;
    this.beat = 0;
  }
  wake() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createGain();
        this.output.gain.value = this.level;
        this.output.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio devices are optional. */ }
  }
  set(enabled, level, music) {
    this.enabled = enabled;
    this.level = level;
    this.music = music;
    if (this.output) this.output.gain.setTargetAtTime(enabled ? level : 0, this.context.currentTime, .025);
  }
  tone(note, delay, duration, volume, wave = 'sine') {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running' || volume <= 0) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = 440 * 2 ** ((note - 69) / 12);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), start + .009);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    osc.connect(envelope).connect(this.output);
    osc.start(start);
    osc.stop(start + duration + .01);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
  }
  effect(kind, n = 0) {
    if (kind === 'spin') {
      this.tone([50, 53, 55, 57, 60][Math.min(4, Math.floor(n / 4))], 0, .095, .11, 'triangle');
      this.tone(38, .018, .06, .08);
      return;
    }
    const calls = { buy:[67,74], route:[62,69,74], notify:[67,69], stamp:[60,67,72,76], signal:[62,69], perfect:[62,69,74,78], prestige:[50,57,62,65,69,74], ending:[50,57,62,65,69,74,77,81], switch:[62] };
    (calls[kind] || []).forEach((note, i) => {
      this.tone(note, i * .108, kind === 'switch' ? .11 : .55, .12);
      this.tone(note + 12, i * .108, .16, .025);
    });
  }
  tick(route, momentum) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.enabled || !this.music || document.hidden || ctx.currentTime < this.next) return;
    const bass = [38, 34, 41, 36][Math.floor(this.beat / 8) % 4];
    const melody = [14, 0, 19, 0, 17, 12, 0, 7, 0, 19, 17, 0, 12, 0, 14, 0];
    const slot = this.beat % 8;
    if (slot === 0 || slot === 4) this.tone(bass, 0, 1.85, this.music * .14);
    if (slot === 2 || slot === 6) {
      this.tone(bass + 15, 0, 1.3, this.music * .043);
      this.tone(bass + 22, .025, 1.05, this.music * .035);
    }
    const offset = melody[(this.beat + 2 * route) % melody.length];
    if (offset) this.tone(bass + 12 + offset, .035, 1.55, this.music * .072, 'sine');
    this.beat++;
    this.next = ctx.currentTime + .53 - .07 * momentum;
  }
};
