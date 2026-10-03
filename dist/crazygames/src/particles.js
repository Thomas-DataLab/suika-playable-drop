/**
 * Particle & Floating Text System for Juicy Merge Bursts & Screen Shake
 * Features:
 * - Liquid juice droplets with dynamic stretch & gravity
 * - Expanding shockwave splash rings
 * - Sinusoidal decaying screen shake controller
 * - Bouncy spring-scale combo banners & popups
 */
(function(window) {
  'use strict';

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.splashRings = [];
      this.popups = [];

      // Screen Shake state
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
      this.shakeElapsed = 0;
      this.lastUpdateTime = performance.now();
    }

    /**
     * Trigger screen shake with intensity and duration in milliseconds
     * @param {number} intensity Max pixel offset (3-6px)
     * @param {number} duration Duration in ms (150-250ms)
     */
    shake(intensity = 4, duration = 200) {
      this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
      this.shakeDuration = Math.max(this.shakeDuration, duration);
      this.shakeElapsed = 0;
    }

    /**
     * Get current screen shake translation offset
     * @returns {{x: number, y: number}}
     */
    getShakeOffset() {
      if (this.shakeElapsed >= this.shakeDuration || this.shakeDuration <= 0) {
        return { x: 0, y: 0 };
      }
      const remaining = 1.0 - (this.shakeElapsed / this.shakeDuration);
      const damp = remaining * remaining;
      // High-frequency sinusoidal oscillation
      const freq = 0.06;
      const x = Math.sin(this.shakeElapsed * freq) * this.shakeIntensity * damp;
      const y = Math.cos(this.shakeElapsed * (freq * 1.35)) * this.shakeIntensity * damp * 0.7;
      return { x, y };
    }

    /**
     * Spawn an explosion of colorful particles and sparkles
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {number} [count=18]
     */
    burst(x, y, color = '#f1c40f', count = 18) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 2.0;
        const size = Math.random() * 5 + 3;
        const isStar = Math.random() > 0.6;

        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2.0,
          size: size,
          baseSize: size,
          color: color,
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.025,
          gravity: 0.16,
          isStar: isStar,
          isDroplet: false,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3
        });
      }

      // Glowing white sparkle specks
      for (let j = 0; j < 6; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.0 + 1.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3 + 2,
          baseSize: 3,
          color: '#ffffff',
          alpha: 1.0,
          decay: 0.035,
          gravity: 0.08,
          isStar: true,
          isDroplet: false,
          rot: Math.random() * Math.PI * 2,
          vRot: 0.2
        });
      }
    }

    /**
     * Spawn juicy liquid fruit droplets and expanding shockwave ring
     * @param {number} x
     * @param {number} y
     * @param {string} color
     * @param {number} tier
     */
    juiceSplatter(x, y, color = '#ff4757', tier = 1) {
      const count = 16 + Math.min(10, tier * 2);

      // 1. Liquid droplets shooting radially outwards
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6.0 + 2.5;
        const size = Math.random() * 4.5 + 2.5;

        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2.2 + 1.0),
          size: size,
          baseSize: size,
          color: color,
          alpha: 1.0,
          decay: Math.random() * 0.022 + 0.024,
          gravity: 0.22,
          isStar: false,
          isDroplet: true,
          rot: 0,
          vRot: 0
        });
      }

      // 2. Expanding splash ring shockwave
      this.splashRings.push({
        x: x,
        y: y,
        radius: 8,
        maxRadius: 24 + Math.min(50, tier * 5),
        color: color,
        alpha: 0.9,
        decay: 0.038,
        lineWidth: Math.max(2, tier * 0.4)
      });

      // Secondary wider soft ring for higher tiers
      if (tier >= 6) {
        this.splashRings.push({
          x: x,
          y: y,
          radius: 12,
          maxRadius: 36 + tier * 6,
          color: '#ffffff',
          alpha: 0.65,
          decay: 0.045,
          lineWidth: 1.8
        });
      }
    }

    /**
     * Add floating text popup (+score, COMBO x2) with spring bounce
     * @param {number} x
     * @param {number} y
     * @param {string} text
     * @param {string} [color='#ffd32a']
     * @param {number} [scale=1.0]
     */
    addPopup(x, y, text, color = '#ffd32a', scale = 1.0) {
      this.popups.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1.0,
        scale: 0.45,
        targetScale: scale,
        scaleVel: 0.16,
        vy: -2.6,
        decay: 0.02,
        life: 0
      });
    }

    /**
     * Add bouncy celebratory combo banners ("NICE!", "SWEET!", "JUICY!", "SUIKA MASTER!")
     * @param {number} x
     * @param {number} y
     * @param {number} tier
     * @param {number} combo
     * @param {number} points
     */
    addComboPopup(x, y, tier, combo = 1, points = 0) {
      let title = '';
      let color = '#ffd32a';

      if (tier === 11) {
        title = 'WATERMELON!';
        color = '#2ed573';
      } else if (combo >= 5) {
        title = 'SUIKA MASTER!';
        color = '#a55eea';
      } else if (combo === 4) {
        title = 'AWESOME x4!';
        color = '#ff9f1a';
      } else if (combo === 3) {
        title = 'JUICY x3!';
        color = '#ff4757';
      } else if (combo === 2) {
        title = 'SWEET x2!';
        color = '#45aaf2';
      }

      if (title) {
        this.addPopup(x, y - 22, title, color, 1.35);
      }
      if (points > 0) {
        const scoreText = `+${points}`;
        this.addPopup(x, y + (title ? 10 : 0), scoreText, '#ffffff', 1.05);
      }
    }

    /**
     * Update physics, lifetimes & screen shake
     */
    update() {
      const now = performance.now();
      const dtMs = Math.min(50, now - this.lastUpdateTime);
      this.lastUpdateTime = now;

      // Update screen shake timer
      if (this.shakeElapsed < this.shakeDuration) {
        this.shakeElapsed += dtMs;
      }

      // 1. Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.96;
        p.rot += p.vRot;
        p.alpha -= p.decay;
        p.size = Math.max(0, p.baseSize * (p.alpha));

        if (p.alpha <= 0 || p.size <= 0.2) {
          this.particles.splice(i, 1);
        }
      }

      // 2. Update splash rings
      for (let k = this.splashRings.length - 1; k >= 0; k--) {
        const ring = this.splashRings[k];
        ring.radius += (ring.maxRadius - ring.radius) * 0.18 + 0.6;
        ring.alpha -= ring.decay;
        if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
          this.splashRings.splice(k, 1);
        }
      }

      // 3. Update popups with bouncy spring simulation
      for (let j = this.popups.length - 1; j >= 0; j--) {
        const pop = this.popups[j];
        pop.life++;
        pop.y += pop.vy;
        pop.vy *= 0.94; // decelerate upward movement
        pop.alpha -= pop.decay;

        // Spring scale up (0.45 -> 1.3 -> 1.0)
        pop.scaleVel = (pop.scaleVel + (pop.targetScale - pop.scale) * 0.28) * 0.72;
        pop.scale += pop.scaleVel;

        if (pop.alpha <= 0) {
          this.popups.splice(j, 1);
        }
      }
    }

    /**
     * Helper to draw 4-spiked star
     */
    _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    /**
     * Render all particles, rings, and popups
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      if (this.particles.length === 0 && this.splashRings.length === 0 && this.popups.length === 0) return;

      ctx.save();

      // 1. Render Expanding Splash Rings
      for (let k = 0; k < this.splashRings.length; k++) {
        const ring = this.splashRings[k];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ring.alpha));
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.lineWidth;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Render Particles & Liquid Droplets
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;

        if (p.isDroplet) {
          // Stretch along velocity vector for liquid splatter feel
          const speed = Math.hypot(p.vx, p.vy);
          const angle = Math.atan2(p.vy, p.vx);
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * (1 + Math.min(2.5, speed * 0.18)), p.size * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.isStar) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          this._drawStar(ctx, 0, 0, 4, p.size * 1.3, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Render Floating Text Popups
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let j = 0; j < this.popups.length; j++) {
        const pop = this.popups[j];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, pop.alpha));
        ctx.translate(pop.x, pop.y);
        ctx.scale(pop.scale, pop.scale);

        // Bold readable typeface
        ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        // Heavy dark outline for contrast
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.strokeText(pop.text, 0, 0);

        // Text Fill
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, 0, 0);

        ctx.restore();
      }

      ctx.restore();
    }

    clear() {
      this.particles = [];
      this.splashRings = [];
      this.popups = [];
      this.shakeIntensity = 0;
      this.shakeDuration = 0;
      this.shakeElapsed = 0;
    }
  }

  window.SuikaParticles = new ParticleSystem();
})(window);
