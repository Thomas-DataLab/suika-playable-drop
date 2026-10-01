/**
 * Fruits Data Dictionary & Kawaii Canvas 2D Renderer
 */
(function(window) {
  'use strict';

  const FRUITS = [
    {
      tier: 1,
      name: 'Cherry',
      radius: 16,
      color: '#e74c3c',
      accentColor: '#c0392b',
      highlightColor: '#ff7675',
      points: 2,
      stemColor: '#784212',
      leafColor: '#2ecc71'
    },
    {
      tier: 2,
      name: 'Strawberry',
      radius: 22,
      color: '#ff4757',
      accentColor: '#ee3847',
      highlightColor: '#ff6b81',
      points: 4,
      leafColor: '#2ed573'
    },
    {
      tier: 3,
      name: 'Grape',
      radius: 28,
      color: '#9b59b6',
      accentColor: '#8e44ad',
      highlightColor: '#be90d4',
      points: 8,
      leafColor: '#26af5f'
    },
    {
      tier: 4,
      name: 'Orange',
      radius: 35,
      color: '#ffa502',
      accentColor: '#ff7f00',
      highlightColor: '#ffc048',
      points: 16,
      leafColor: '#2ed573'
    },
    {
      tier: 5,
      name: 'Persimmon',
      radius: 43,
      color: '#ff6348',
      accentColor: '#eb4d4b',
      highlightColor: '#ff7979',
      points: 32,
      leafColor: '#4cd137'
    },
    {
      tier: 6,
      name: 'Apple',
      radius: 52,
      color: '#2ed573',
      accentColor: '#26af5f',
      highlightColor: '#7bed9f',
      points: 64,
      stemColor: '#5c3a21',
      leafColor: '#10ac84'
    },
    {
      tier: 7,
      name: 'Pear',
      radius: 62,
      color: '#eccc68',
      accentColor: '#d6a843',
      highlightColor: '#f7d794',
      points: 128,
      stemColor: '#5d4037',
      leafColor: '#2ed573'
    },
    {
      tier: 8,
      name: 'Peach',
      radius: 73,
      color: '#ff7f50',
      accentColor: '#ff6348',
      highlightColor: '#ffa07a',
      points: 256,
      leafColor: '#2ed573'
    },
    {
      tier: 9,
      name: 'Pineapple',
      radius: 85,
      color: '#f1c40f',
      accentColor: '#e1b12c',
      highlightColor: '#f7d794',
      points: 512,
      patternColor: '#d48817',
      leafColor: '#2ed573'
    },
    {
      tier: 10,
      name: 'Melon',
      radius: 98,
      color: '#1dd1a1',
      accentColor: '#10ac84',
      highlightColor: '#55efc4',
      points: 1024,
      netColor: 'rgba(255, 255, 255, 0.4)'
    },
    {
      tier: 11,
      name: 'Watermelon',
      radius: 115,
      color: '#10ac84',
      accentColor: '#0b8b6a',
      stripeColor: '#08533f',
      highlightColor: '#2ed573',
      points: 2048
    }
  ];

  function getFruitByTier(tier) {
    const idx = Math.max(1, Math.min(tier, FRUITS.length)) - 1;
    return FRUITS[idx];
  }

  /**
   * Draw a stylized kawaii fruit on Canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x Body center X
   * @param {number} y Body center Y
   * @param {number} radius Fruit radius
   * @param {number} tier Fruit tier (1 - 11)
   * @param {number} angle Body rotation angle
   * @param {Object} [options] Blinking/expression controls
   */
  function drawFruit(ctx, x, y, radius, tier, angle = 0, options = {}) {
    const fruit = getFruitByTier(tier);
    if (!fruit) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 1. Soft ambient drop shadow underneath
    ctx.beginPath();
    ctx.arc(0, radius * 0.08, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fill();

    // 2. Base fruit circle with radial gradient for 3D sphere feel
    const grad = ctx.createRadialGradient(
      -radius * 0.3,
      -radius * 0.35,
      radius * 0.1,
      0,
      0,
      radius
    );
    grad.addColorStop(0, fruit.highlightColor || fruit.color);
    grad.addColorStop(0.7, fruit.color);
    grad.addColorStop(1, fruit.accentColor);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Clip inner content to fruit sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();

    // 3. Unique Fruit Patterns
    if (tier === 11) {
      // Watermelon stripes (dark green wavy vertical stripes)
      ctx.strokeStyle = fruit.stripeColor;
      ctx.lineWidth = Math.max(3, radius * 0.1);
      ctx.lineCap = 'round';
      const stripeOffsets = [-0.65, -0.35, 0, 0.35, 0.65];
      stripeOffsets.forEach((factor) => {
        ctx.beginPath();
        const sx = factor * radius;
        ctx.moveTo(sx, -radius);
        ctx.bezierCurveTo(
          sx + (factor < 0 ? -radius * 0.15 : radius * 0.15),
          -radius * 0.3,
          sx - (factor < 0 ? -radius * 0.1 : radius * 0.1),
          radius * 0.3,
          sx,
          radius
        );
        ctx.stroke();
      });
    } else if (tier === 10) {
      // Melon netting
      ctx.strokeStyle = fruit.netColor;
      ctx.lineWidth = 1.6;
      const step = radius * 0.35;
      for (let i = -radius; i <= radius; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, -radius);
        ctx.lineTo(i + radius, radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i, radius);
        ctx.lineTo(i + radius, -radius);
        ctx.stroke();
      }
    } else if (tier === 9) {
      // Pineapple diamond crosshatch
      ctx.strokeStyle = 'rgba(180, 115, 10, 0.35)';
      ctx.lineWidth = 2.2;
      const step = radius * 0.4;
      for (let d = -radius * 1.5; d <= radius * 1.5; d += step) {
        ctx.beginPath();
        ctx.moveTo(d, -radius);
        ctx.lineTo(d + radius * 1.2, radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(d, radius);
        ctx.lineTo(d + radius * 1.2, -radius);
        ctx.stroke();
      }
    } else if (tier === 2) {
      // Strawberry yellow seeds
      ctx.fillStyle = '#f6e58d';
      const seedOffsets = [
        [-0.45, -0.2], [0.45, -0.2], [0, -0.35],
        [-0.3, 0.3], [0.3, 0.3], [0, 0.45]
      ];
      seedOffsets.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.ellipse(fx * radius, fy * radius, radius * 0.045, radius * 0.08, 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Top crescent glass highlight
    ctx.beginPath();
    ctx.ellipse(
      -radius * 0.22,
      -radius * 0.38,
      radius * 0.48,
      radius * 0.24,
      -Math.PI / 5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fill();

    // Small secondary glint
    ctx.beginPath();
    ctx.arc(radius * 0.4, -radius * 0.28, radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    ctx.restore(); // unclip

    // Outer subtle border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, radius * 0.035);
    ctx.strokeStyle = fruit.accentColor;
    ctx.stroke();

    // 4. Stems and Leaves on Top
    if (tier === 1 || tier === 6 || tier === 7) {
      // Stem
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.85);
      ctx.quadraticCurveTo(radius * 0.15, -radius * 1.2, radius * 0.2, -radius * 1.3);
      ctx.strokeStyle = fruit.stemColor || '#6d4c41';
      ctx.lineWidth = Math.max(2, radius * 0.12);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Leaf
      ctx.beginPath();
      ctx.ellipse(radius * 0.25, -radius * 1.15, radius * 0.2, radius * 0.1, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = fruit.leafColor || '#2ed573';
      ctx.fill();
    } else if (tier === 2) {
      // Strawberry calyx hat (3 small green leaves at top)
      ctx.fillStyle = '#2ed573';
      for (let a = -0.4; a <= 0.4; a += 0.4) {
        ctx.save();
        ctx.translate(0, -radius * 0.85);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.15, radius * 0.1, radius * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (tier === 9) {
      // Pineapple spiky crown top
      ctx.fillStyle = '#2ed573';
      [-0.35, 0, 0.35].forEach((a) => {
        ctx.save();
        ctx.translate(0, -radius * 0.85);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.1, 0);
        ctx.lineTo(0, -radius * 0.35);
        ctx.lineTo(radius * 0.1, 0);
        ctx.fill();
        ctx.restore();
      });
    }

    // 5. Kawaii Face (Eyes, Blush, Smile)
    const isBlinking = options.isBlinking || false;
    const eyeSpacing = radius * 0.32;
    const eyeY = -radius * 0.05;
    const eyeR = Math.max(2, radius * 0.095);

    // Eyes
    ctx.fillStyle = '#222222';
    if (isBlinking) {
      // Happy closed curved eyes (^_^)
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(1.8, radius * 0.06);
      ctx.lineCap = 'round';

      // Left eye arc
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeR * 1.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Right eye arc
      ctx.beginPath();
      ctx.arc(eyeSpacing, eyeY, eyeR * 1.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      // Big shiny cute anime eyes
      [-eyeSpacing, eyeSpacing].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#222222';
        ctx.fill();

        // Eye sparkle catchlight (large)
        ctx.beginPath();
        ctx.arc(ex - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Eye sparkle catchlight (small)
        ctx.beginPath();
        ctx.arc(ex + eyeR * 0.32, eyeY + eyeR * 0.32, eyeR * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
    }

    // Rosy Pink Cheeks
    ctx.fillStyle = 'rgba(255, 107, 129, 0.45)';
    [-eyeSpacing * 1.35, eyeSpacing * 1.35].forEach((cx) => {
      ctx.beginPath();
      ctx.ellipse(cx, eyeY + eyeR * 1.4, eyeR * 1.25, eyeR * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cute Smile Mouth
    ctx.beginPath();
    const mouthY = eyeY + eyeR * 1.3;
    const mouthW = radius * 0.16;
    ctx.arc(0, mouthY, mouthW, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = Math.max(1.6, radius * 0.05);
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }

  window.SuikaFruits = {
    list: FRUITS,
    get: getFruitByTier,
    drawFruit: drawFruit
  };
})(window);
