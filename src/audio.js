/**
 * Audio Synthesizer using Web Audio API
 * Fully procedural sound generation with zero external asset dependencies.
 */
(function(window) {
  'use strict';

  class SoundManager {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.initialized = false;
      this.lastDangerSoundTime = 0;

      // Load saved mute state
      try {
        this.muted = localStorage.getItem('suika_audio_muted') === 'true';
      } catch (e) {
        this.muted = false;
      }
    }

    init() {
      if (this.initialized) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('[Audio] Web Audio API is not supported in this environment.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;

      // Resume context on user interaction
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
            console.log('[Audio] AudioContext resumed successfully.');
          });
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }

    ensureContext() {
      if (!this.initialized) {
        this.init();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.ensureContext();
      this.muted = !this.muted;

      try {
        localStorage.setItem('suika_audio_muted', this.muted ? 'true' : 'false');
      } catch (e) {
        // ignore storage error
      }

      if (this.masterGain && this.ctx) {
        const targetGain = this.muted ? 0 : 0.6;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
      }

      return this.muted;
    }

    isMuted() {
      return this.muted;
    }

    /**
     * Subtle soft whoosh / click when fruit drops
     */
    playDrop() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    }

    /**
     * Merge pop sound with pitch scaling by fruit tier & combo count
     * @param {number} tier (1-11)
     * @param {number} combo (1+)
     */
    playMerge(tier, combo = 1) {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const safeTier = Math.max(1, Math.min(tier || 1, 11));
      const safeCombo = Math.max(1, Math.min(combo || 1, 10));

      // Dynamic base frequency: higher tiers are sweeter and higher, combos pitch up
      const baseFreq = 220 + safeTier * 28 + (safeCombo - 1) * 35;

      // Primary bubbly oscillator
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq * 0.8, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.04);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.16);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      // Harmonious pop overtone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.0, now);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.06);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      osc1.start(now);
      osc1.stop(now + 0.19);
      osc2.start(now);
      osc2.stop(now + 0.13);
    }

    /**
     * Soft ticking danger warning sound (throttled to avoid harsh noise)
     */
    playDangerWarning() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      if (now - this.lastDangerSoundTime < 0.35) return;
      this.lastDangerSoundTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.075);
    }

    /**
     * Playful descending game over chime sequence
     */
    playGameOver() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Notes: G4 (392Hz), E4 (329.63Hz), C4 (261.63Hz), A3 (220Hz)
      const notes = [392.0, 329.63, 261.63, 220.0];
      const noteDuration = 0.14;

      notes.forEach((freq, idx) => {
        const startTime = now + idx * noteDuration;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + noteDuration);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + noteDuration + 0.12);
      });
    }
  }

  window.SoundManager = new SoundManager();
})(window);
