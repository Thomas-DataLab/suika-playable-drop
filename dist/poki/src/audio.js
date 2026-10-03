/**
 * Audio Synthesizer using Web Audio API
 * Fully procedural sound generation with zero external asset dependencies.
 * Features:
 * - Tier-scaled harmonics (sweet high glockenspiel chimes for low tiers, rich warm pentatonic chords for high tiers)
 * - Soft satisfying physics impact pop/bloop
 * - Triumphant Watermelon victory fanfare
 * - Safe audio unlock and mute state persistence
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
      this.lastImpactSoundTime = 0;

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

    setMuted(muted) {
      this.ensureContext();
      this.muted = !!muted;

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

    toggleMute() {
      return this.setMuted(!this.muted);
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
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    }

    /**
     * Soft, organic physics impact bloop when fruits collide or hit boundaries
     * @param {number} [speed=3.0] Relative collision speed
     */
    playImpact(speed = 3.0) {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Throttling to prevent audio clutter during multi-body pileups
      if (now - this.lastImpactSoundTime < 0.06) return;
      this.lastImpactSoundTime = now;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const baseFreq = 160 + Math.min(120, speed * 15);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.06);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);

      const targetGain = Math.min(0.22, 0.06 + (speed / 10) * 0.14);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.075);
    }

    /**
     * Merge sound scaled by fruit tier and combo count:
     * - Low tiers (1-5): Sweet high glockenspiel chimes with bell overtones
     * - High tiers (6-11): Rich, warm pentatonic arpeggio chords
     * @param {number} tier (1-11)
     * @param {number} combo (1+)
     */
    playMerge(tier, combo = 1) {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const safeTier = Math.max(1, Math.min(tier || 1, 11));
      const safeCombo = Math.max(1, Math.min(combo || 1, 10));

      // Trigger triumph fanfare if Watermelon
      if (safeTier === 11) {
        this.playWatermelonTriumph();
        return;
      }

      const now = this.ctx.currentTime;

      if (safeTier <= 5) {
        // --- LOW TIERS: SWEET GLOCKENSPIEL CHIME ---
        // Pentatonic scale in high octaves
        const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5, D5, E5, G5, A5
        const noteIdx = (safeTier - 1) % pentatonicScale.length;
        const comboShift = (safeCombo - 1) * 2;
        const baseFreq = pentatonicScale[noteIdx] * Math.pow(2, comboShift / 12);

        // Fundamental tone
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(baseFreq, now);

        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.linearRampToValueAtTime(0.38, now + 0.012);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.23);

        // Glockenspiel metallic chime overtone
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 2.756, now);

        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.008);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.15);

      } else {
        // --- HIGH TIERS (6-10): RICH WARM PENTATONIC CHORD ---
        // Layered harmonized arpeggios
        // Tier 6: Apple (C4, G4)
        // Tier 7: Pear (C4, E4, G4)
        // Tier 8: Peach (E4, G4, C5)
        // Tier 9: Pineapple (G4, C5, E5, G5)
        // Tier 10: Melon (C4, G4, C5, E5, G5)
        const chordMaps = {
          6: [261.63, 392.00],
          7: [261.63, 329.63, 392.00],
          8: [329.63, 392.00, 523.25],
          9: [392.00, 523.25, 659.25, 783.99],
          10: [261.63, 392.00, 523.25, 659.25]
        };

        const notes = chordMaps[safeTier] || [261.63, 392.00, 523.25];
        const stagger = 0.035;

        notes.forEach((freq, idx) => {
          const startTime = now + idx * stagger;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq * Math.pow(2, (safeCombo - 1) * 0.08), startTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.28 / Math.sqrt(notes.length), startTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.start(startTime);
          osc.stop(startTime + 0.34);
        });
      }
    }

    /**
     * Celebratory triumphant victory fanfare when crafting the Watermelon (Tier 11)
     */
    playWatermelonTriumph() {
      if (this.muted) return;
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Majestic ascending fanfare notes: C4, G4, C5, E5, G5, C6
      const fanfareNotes = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      const noteDelay = 0.065;

      fanfareNotes.forEach((freq, idx) => {
        const startTime = now + idx * noteDelay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === fanfareNotes.length - 1 ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.32, startTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + (idx === fanfareNotes.length - 1 ? 0.65 : 0.22));

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + (idx === fanfareNotes.length - 1 ? 0.68 : 0.24));
      });

      // Grand sustained celebratory background chord at climax
      const climaxTime = now + (fanfareNotes.length - 1) * noteDelay;
      const chord = [523.25, 659.25, 783.99]; // C5, E5, G5

      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, climaxTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, climaxTime);

        gain.gain.setValueAtTime(0.001, climaxTime);
        gain.gain.linearRampToValueAtTime(0.2, climaxTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, climaxTime + 0.75);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(climaxTime);
        osc.stop(climaxTime + 0.78);
      });
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
