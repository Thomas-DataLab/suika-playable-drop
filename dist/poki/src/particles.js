/**
 * Particle & Floating Text System for Juicy Merge Bursts
 */
(function(window) {
  'use strict';

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.popups = [];
    }

    /**
     * Spawn an explosion of juicy colorful particles
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
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3
        });
      }

      // Add a couple of glowing white sparkle specks
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
          rot: Math.random() * Math.PI * 2,
          vRot: 0.2
        });
      }
    }

    /**
     * Add floating text popup (+score, COMBO x2)
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
        scale: scale * 0.7,
        targetScale: scale,
        vy: -2.4,
        decay: 0.022,
        life: 0
      });
    }

    /**
     * Update physics and lifetimes
     */
    update() {
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

      // 2. Update popups
      for (let j = this.popups.length - 1; j >= 0; j--) {
        const pop = this.popups[j];
        pop.life++;
        pop.y += pop.vy;
        pop.vy *= 0.94; // decelerate upward movement
        pop.alpha -= pop.decay;
        pop.scale += (pop.targetScale - pop.scale) * 0.25;

        if (pop.alpha <= 0) {
          this.popups.splice(j, 1);
        }
      }
    }

    /**
     * Draw 5-pointed star
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
     * Render all particles and popups
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
      if (this.particles.length === 0 && this.popups.length === 0) return;

      ctx.save();

      // Render Particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;

        if (p.isStar) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          this._drawStar(ctx, 0, 0, 4, p.size * 1.3, p.size * 0.55);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Floating Popups
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let j = 0; j < this.popups.length; j++) {
        const pop = this.popups[j];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, pop.alpha));
        ctx.translate(pop.x, pop.y);
        ctx.scale(pop.scale, pop.scale);

        // Text Outline for high readability
        ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 4;
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
      this.popups = [];
    }
  }

  window.SuikaParticles = new ParticleSystem();
})(window);
