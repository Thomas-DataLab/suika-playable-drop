/**
 * Fruits Data Dictionary & Kawaii Canvas 2D Renderer
 * Features:
 * - Dynamic facial expressions (normal, danger_worried, dropping, merging_happy)
 * - Eye tracking towards same-tier fruits or drop target with body-rotation compensation
 * - Elastic squash & stretch spring simulation
 * - Rich 3D multi-stop radial gradients, specular highlights & distinctive tier details
 */
(function(window) {
  'use strict';

  const FRUITS = [
    {
      tier: 1,
      name: 'Cherry',
      radius: 16,
      color: '#e74c3c',
      accentColor: '#b02316',
      darkColor: '#5c0a0a',
      highlightColor: '#ff8585',
      points: 2,
      stemColor: '#5c3a21',
      leafColor: '#2ed573'
    },
    {
      tier: 2,
      name: 'Strawberry',
      radius: 22,
      color: '#ff4757',
      accentColor: '#d6223b',
      darkColor: '#6d0818',
      highlightColor: '#ff7b92',
      points: 4,
      leafColor: '#2ed573',
      seedColor: '#f9ca24'
    },
    {
      tier: 3,
      name: 'Grape',
      radius: 28,
      color: '#9b59b6',
      accentColor: '#7a2d96',
      darkColor: '#411352',
      highlightColor: '#c595dc',
      points: 8,
      stemColor: '#5d4037',
      leafColor: '#26af5f'
    },
    {
      tier: 4,
      name: 'Orange',
      radius: 35,
      color: '#ffa502',
      accentColor: '#e07a00',
      darkColor: '#7a3e00',
      highlightColor: '#ffcf66',
      points: 16,
      leafColor: '#2ed573'
    },
    {
      tier: 5,
      name: 'Persimmon',
      radius: 43,
      color: '#ff6348',
      accentColor: '#d83a1e',
      darkColor: '#731a09',
      highlightColor: '#ffa08e',
      points: 32,
      leafColor: '#4cd137'
    },
    {
      tier: 6,
      name: 'Apple',
      radius: 52,
      color: '#2ed573',
      accentColor: '#1eb35a',
      darkColor: '#0b562a',
      highlightColor: '#8df5b5',
      points: 64,
      stemColor: '#4e342e',
      leafColor: '#10ac84'
    },
    {
      tier: 7,
      name: 'Pear',
      radius: 62,
      color: '#eccc68',
      accentColor: '#c7a339',
      darkColor: '#634e12',
      highlightColor: '#f7e39b',
      points: 128,
      stemColor: '#5d4037',
      leafColor: '#2ed573'
    },
    {
      tier: 8,
      name: 'Peach',
      radius: 73,
      color: '#ff7f50',
      accentColor: '#e55a29',
      darkColor: '#7c2809',
      highlightColor: '#ffb499',
      points: 256,
      leafColor: '#2ed573'
    },
    {
      tier: 9,
      name: 'Pineapple',
      radius: 85,
      color: '#f1c40f',
      accentColor: '#d49b07',
      darkColor: '#684a00',
      highlightColor: '#fae477',
      points: 512,
      leafColor: '#26af5f'
    },
    {
      tier: 10,
      name: 'Melon',
      radius: 98,
      color: '#1dd1a1',
      accentColor: '#10ac84',
      darkColor: '#08533f',
      highlightColor: '#64f3ce',
      points: 1024,
      netColor: 'rgba(255, 255, 255, 0.42)'
    },
    {
      tier: 11,
      name: 'Watermelon',
      radius: 115,
      color: '#10ac84',
      accentColor: '#086e54',
      darkColor: '#033a2b',
      stripeColor: '#043425',
      highlightColor: '#4de8bf',
      points: 2048,
      stemColor: '#5c3a21'
    }
  ];

  function getFruitByTier(tier) {
    const idx = Math.max(1, Math.min(tier || 1, FRUITS.length)) - 1;
    return FRUITS[idx];
  }

  /**
   * Update spring simulation for elastic squash and stretch
   * @param {Object} body Matter.js Body
   */
  function updateSquash(body) {
    if (!body) return;
    if (body.squashX === undefined) body.squashX = 1.0;
    if (body.squashY === undefined) body.squashY = 1.0;
    if (body.squashVx === undefined) body.squashVx = 0;
    if (body.squashVy === undefined) body.squashVy = 0;

    const kSpring = 0.22;
    const damping = 0.84;

    body.squashVx = (body.squashVx + (1.0 - body.squashX) * kSpring) * damping;
    body.squashX += body.squashVx;

    body.squashVy = (body.squashVy + (1.0 - body.squashY) * kSpring) * damping;
    body.squashY += body.squashVy;

    if (Math.abs(body.squashX - 1.0) < 0.003 && Math.abs(body.squashVx) < 0.003) {
      body.squashX = 1.0;
      body.squashVx = 0;
    }
    if (Math.abs(body.squashY - 1.0) < 0.003 && Math.abs(body.squashVy) < 0.003) {
      body.squashY = 1.0;
      body.squashVy = 0;
    }
  }

  /**
   * Trigger squash deformation on impact or drop
   * @param {Object} body Matter.js Body
   * @param {number} [factorX=1.25]
   * @param {number} [factorY=0.8]
   */
  function applySquash(body, factorX = 1.25, factorY = 0.8) {
    if (!body) return;
    body.squashX = factorX;
    body.squashY = factorY;
    body.squashVx = (1.0 - factorX) * 0.12;
    body.squashVy = (1.0 - factorY) * 0.12;
  }

  /**
   * Helper to draw a tiny 4-pointed golden sparkle star
   */
  function drawSparkleStar(ctx, cx, cy, size, color = '#ffd32a') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx, cy, cx + size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + size);
    ctx.quadraticCurveTo(cx, cy, cx - size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw a stylized kawaii fruit on Canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x Body center X
   * @param {number} y Body center Y
   * @param {number} radius Fruit radius
   * @param {number} tier Fruit tier (1 - 11)
   * @param {number} angle Body rotation angle
   * @param {Object} [options] Squash, expressions, eye tracking, blinking
   */
  function drawFruit(ctx, x, y, radius, tier, angle = 0, options = {}) {
    const fruit = getFruitByTier(tier);
    if (!fruit) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Apply squash and stretch scaling if active
    const sx = options.squashX || 1.0;
    const sy = options.squashY || 1.0;
    if (sx !== 1.0 || sy !== 1.0) {
      ctx.scale(sx, sy);
    }

    // 1. Soft ambient drop shadow underneath
    ctx.beginPath();
    ctx.arc(0, radius * 0.08, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fill();

    // 2. Base fruit sphere with multi-stop radial gradient for rich 3D volume
    const grad = ctx.createRadialGradient(
      -radius * 0.32,
      -radius * 0.35,
      radius * 0.05,
      0,
      0,
      radius
    );
    grad.addColorStop(0, fruit.highlightColor || fruit.color);
    grad.addColorStop(0.35, fruit.color);
    grad.addColorStop(0.85, fruit.accentColor);
    grad.addColorStop(1, fruit.darkColor || fruit.accentColor);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Clip inner content to fruit sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();

    // 3. Bottom ambient bounce highlight
    const bottomGlow = ctx.createRadialGradient(
      0,
      radius * 0.85,
      radius * 0.1,
      0,
      radius * 0.85,
      radius * 0.6
    );
    bottomGlow.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    bottomGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bottomGlow;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Distinctive Kawaii Tier Patterns & Details
    if (tier === 11) {
      // Watermelon: dark wavy vertical stripes with natural curves
      ctx.strokeStyle = fruit.stripeColor;
      ctx.lineWidth = Math.max(3.2, radius * 0.095);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const stripeFactors = [-0.72, -0.42, -0.14, 0.14, 0.42, 0.72];
      stripeFactors.forEach((factor, idx) => {
        ctx.beginPath();
        const sx = factor * radius;
        const wave = (idx % 2 === 0 ? 1 : -1) * radius * 0.12;
        ctx.moveTo(sx, -radius);
        ctx.bezierCurveTo(
          sx + wave,
          -radius * 0.4,
          sx - wave,
          radius * 0.4,
          sx,
          radius
        );
        ctx.stroke();
      });
    } else if (tier === 10) {
      // Melon: intricate cantaloupe webbing/netting
      ctx.strokeStyle = fruit.netColor;
      ctx.lineWidth = Math.max(1.4, radius * 0.02);
      const step = radius * 0.32;
      for (let i = -radius * 1.2; i <= radius * 1.2; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, -radius);
        ctx.bezierCurveTo(i + radius * 0.4, -radius * 0.3, i + radius * 0.7, radius * 0.3, i + radius, radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(i, radius);
        ctx.bezierCurveTo(i + radius * 0.4, radius * 0.3, i + radius * 0.7, -radius * 0.3, i + radius, -radius);
        ctx.stroke();
      }
    } else if (tier === 9) {
      // Pineapple: tropical diamond crosshatch pattern with tufts
      ctx.strokeStyle = 'rgba(180, 115, 10, 0.4)';
      ctx.lineWidth = Math.max(1.8, radius * 0.025);
      const step = radius * 0.36;
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
      // Small tuft centers
      ctx.fillStyle = 'rgba(160, 95, 5, 0.45)';
      for (let tx = -radius * 0.6; tx <= radius * 0.6; tx += step) {
        for (let ty = -radius * 0.6; ty <= radius * 0.6; ty += step) {
          ctx.beginPath();
          ctx.arc(tx, ty, radius * 0.03, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (tier === 8) {
      // Peach: vertical heart crease/cleft indented along the center
      ctx.strokeStyle = 'rgba(214, 48, 49, 0.35)';
      ctx.lineWidth = Math.max(2, radius * 0.04);
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.95);
      ctx.quadraticCurveTo(-radius * 0.06, -radius * 0.1, 0, radius * 0.85);
      ctx.stroke();
    } else if (tier === 7) {
      // Pear: subtle golden freckle speckles
      ctx.fillStyle = 'rgba(180, 130, 20, 0.3)';
      const pearSpots = [
        [-0.4, 0.3], [0.35, 0.25], [-0.25, 0.5], [0.2, 0.55],
        [-0.5, 0.1], [0.45, 0.4], [0, 0.65]
      ];
      pearSpots.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx * radius, fy * radius, radius * 0.035, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (tier === 4) {
      // Orange: citrus peel stipple texture
      ctx.fillStyle = 'rgba(230, 100, 0, 0.22)';
      const peelDots = [
        [-0.4, -0.4], [0.3, -0.45], [-0.5, 0.1], [0.4, 0.15],
        [-0.3, 0.4], [0.35, 0.35], [0, 0.55], [-0.1, -0.5]
      ];
      peelDots.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px * radius, py * radius, radius * 0.04, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (tier === 2) {
      // Strawberry: golden yellow seed drops
      ctx.fillStyle = fruit.seedColor || '#f9ca24';
      const seedOffsets = [
        [-0.45, -0.22], [0.45, -0.22], [0, -0.38],
        [-0.32, 0.15], [0.32, 0.15], [0, 0.0],
        [-0.26, 0.46], [0.26, 0.46], [0, 0.58]
      ];
      seedOffsets.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.ellipse(fx * radius, fy * radius, radius * 0.045, radius * 0.08, 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5. Top Glossy Crescent & Glass Reflection
    ctx.beginPath();
    ctx.ellipse(
      -radius * 0.22,
      -radius * 0.38,
      radius * 0.46,
      radius * 0.23,
      -Math.PI / 5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fill();

    // Small secondary reflection dot
    ctx.beginPath();
    ctx.arc(radius * 0.42, -radius * 0.26, radius * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fill();

    ctx.restore(); // unclip

    // 6. Outer Spherical Contour Border
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.6, radius * 0.035);
    ctx.strokeStyle = fruit.accentColor;
    ctx.stroke();

    // 7. Stems, Leaves & Crowns on Top
    if (tier === 1) {
      // Cherry: dual curved stem with green leaf
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.88);
      ctx.quadraticCurveTo(radius * 0.2, -radius * 1.35, radius * 0.4, -radius * 1.45);
      ctx.strokeStyle = fruit.stemColor;
      ctx.lineWidth = Math.max(2.0, radius * 0.14);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Twin leaf
      ctx.beginPath();
      ctx.ellipse(radius * 0.42, -radius * 1.35, radius * 0.24, radius * 0.12, Math.PI / 5, 0, Math.PI * 2);
      ctx.fillStyle = fruit.leafColor;
      ctx.fill();
    } else if (tier === 6 || tier === 7) {
      // Apple & Pear: curved wooden stem + leaf
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.88);
      ctx.quadraticCurveTo(radius * 0.15, -radius * 1.25, radius * 0.2, -radius * 1.35);
      ctx.strokeStyle = fruit.stemColor;
      ctx.lineWidth = Math.max(2.2, radius * 0.1);
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(radius * 0.28, -radius * 1.18, radius * 0.22, radius * 0.11, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = fruit.leafColor;
      ctx.fill();
    } else if (tier === 2) {
      // Strawberry: 5-point leafy calyx hat
      ctx.fillStyle = fruit.leafColor;
      for (let a = -0.5; a <= 0.5; a += 0.25) {
        ctx.save();
        ctx.translate(0, -radius * 0.88);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.16, radius * 0.09, radius * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (tier === 5) {
      // Persimmon: 4-lobed star calyx cap
      ctx.fillStyle = fruit.leafColor;
      [-0.45, -0.15, 0.15, 0.45].forEach((a) => {
        ctx.save();
        ctx.translate(0, -radius * 0.88);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -radius * 0.12, radius * 0.12, radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (tier === 8) {
      // Peach: cute twin leaves at top cleft
      ctx.fillStyle = fruit.leafColor;
      ctx.beginPath();
      ctx.ellipse(-radius * 0.15, -radius * 0.95, radius * 0.16, radius * 0.08, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(radius * 0.15, -radius * 0.95, radius * 0.16, radius * 0.08, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (tier === 9) {
      // Pineapple: multi-spiked tropical crown leaves
      ctx.fillStyle = fruit.leafColor;
      const crownAngles = [-0.45, -0.22, 0, 0.22, 0.45];
      const crownHeights = [0.35, 0.45, 0.52, 0.45, 0.35];
      crownAngles.forEach((a, i) => {
        ctx.save();
        ctx.translate(0, -radius * 0.86);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.1, 0);
        ctx.lineTo(0, -radius * crownHeights[i]);
        ctx.lineTo(radius * 0.1, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    } else if (tier === 11) {
      // Watermelon: curly pigtail vine stem
      ctx.beginPath();
      ctx.moveTo(0, -radius * 0.88);
      ctx.quadraticCurveTo(radius * 0.15, -radius * 1.15, radius * 0.05, -radius * 1.25);
      ctx.quadraticCurveTo(-radius * 0.1, -radius * 1.35, radius * 0.1, -radius * 1.38);
      ctx.strokeStyle = fruit.stemColor;
      ctx.lineWidth = Math.max(2.4, radius * 0.06);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // 8. Kawaii Dynamic Expressions & Eye Tracking
    const expression = options.expression || 'normal';
    const isBlinking = options.isBlinking || false;
    const eyeSpacing = radius * 0.32;
    const eyeY = -radius * 0.04;
    const eyeR = Math.max(2.2, radius * 0.095);

    // Calculate eye tracking offset with body rotation compensation
    let pupilDx = 0;
    let pupilDy = 0;
    if (options.eyeTargetX !== undefined && options.eyeTargetY !== undefined) {
      const worldDx = options.eyeTargetX - x;
      const worldDy = options.eyeTargetY - y;
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      const localDx = worldDx * cosA - worldDy * sinA;
      const localDy = worldDx * sinA + worldDy * cosA;
      const dist = Math.hypot(localDx, localDy);
      if (dist > 1) {
        const maxOffset = Math.min(2.5, eyeR * 0.35);
        pupilDx = (localDx / dist) * maxOffset;
        pupilDy = (localDy / dist) * maxOffset;
      }
    } else if (options.pupilOffsetX !== undefined) {
      pupilDx = Math.max(-2.5, Math.min(2.5, options.pupilOffsetX));
      pupilDy = Math.max(-2.5, Math.min(2.5, options.pupilOffsetY || 0));
    }

    if (expression === 'merging_happy') {
      // --- EXPRESSION: MERGING HAPPY (^ . ^) ---
      // Closed joyful curved eyes
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(2.0, radius * 0.065);
      ctx.lineCap = 'round';

      [-eyeSpacing, eyeSpacing].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR * 1.2, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        // Golden sparkle star beside eye
        drawSparkleStar(ctx, ex + (ex < 0 ? -eyeR * 1.5 : eyeR * 1.5), eyeY - eyeR * 0.4, eyeR * 0.7);
      });

      // Bright happy blush cheeks
      ctx.fillStyle = 'rgba(255, 107, 129, 0.65)';
      [-eyeSpacing * 1.35, eyeSpacing * 1.35].forEach((cx) => {
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + eyeR * 1.3, eyeR * 1.3, eyeR * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Joyful big open smile with pink tongue
      const mouthY = eyeY + eyeR * 1.25;
      const mouthW = radius * 0.2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, mouthY, mouthW, 0, Math.PI, false);
      ctx.closePath();
      ctx.fillStyle = '#b33939';
      ctx.fill();
      ctx.clip();

      // Tongue inside
      ctx.beginPath();
      ctx.arc(0, mouthY + mouthW * 0.75, mouthW * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7675';
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(0, mouthY, mouthW, 0, Math.PI, false);
      ctx.closePath();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(1.8, radius * 0.05);
      ctx.stroke();

    } else if (expression === 'danger_worried') {
      // --- EXPRESSION: DANGER WORRIED (Nervous, shaking, sweat drop, wavy mouth) ---
      const now = Date.now();
      const jitterX = Math.sin(now * 0.035) * Math.max(0.6, radius * 0.02);
      const jitterY = Math.cos(now * 0.04) * Math.max(0.6, radius * 0.02);

      // Worried slanted inner eyebrows
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(1.6, radius * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeSpacing - eyeR * 0.8, eyeY - eyeR * 1.5);
      ctx.lineTo(-eyeSpacing + eyeR * 0.7, eyeY - eyeR * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(eyeSpacing + eyeR * 0.8, eyeY - eyeR * 1.5);
      ctx.lineTo(eyeSpacing - eyeR * 0.7, eyeY - eyeR * 1.9);
      ctx.stroke();

      // Wide nervous shaking eyes
      [-eyeSpacing, eyeSpacing].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex + jitterX, eyeY + jitterY, eyeR * 1.05, 0, Math.PI * 2);
        ctx.fillStyle = '#222222';
        ctx.fill();

        // Shrunk pupil catchlight
        ctx.beginPath();
        ctx.arc(ex + jitterX - eyeR * 0.2, eyeY + jitterY - eyeR * 0.2, eyeR * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // Animated sweat droplet on temple
      const sweatDropY = eyeY - radius * 0.35 + Math.sin(now * 0.008) * (radius * 0.06);
      ctx.fillStyle = 'rgba(116, 185, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(eyeSpacing * 1.45, sweatDropY - eyeR * 0.9);
      ctx.quadraticCurveTo(
        eyeSpacing * 1.6,
        sweatDropY,
        eyeSpacing * 1.45,
        sweatDropY + eyeR * 0.6
      );
      ctx.quadraticCurveTo(
        eyeSpacing * 1.3,
        sweatDropY,
        eyeSpacing * 1.45,
        sweatDropY - eyeR * 0.9
      );
      ctx.fill();

      // Wavy trembling mouth (~)
      const mouthY = eyeY + eyeR * 1.4;
      const mw = radius * 0.16;
      ctx.beginPath();
      ctx.moveTo(-mw, mouthY);
      ctx.quadraticCurveTo(-mw * 0.5, mouthY - eyeR * 0.4, 0, mouthY);
      ctx.quadraticCurveTo(mw * 0.5, mouthY + eyeR * 0.4, mw, mouthY);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(1.8, radius * 0.05);
      ctx.lineCap = 'round';
      ctx.stroke();

    } else if (expression === 'dropping') {
      // --- EXPRESSION: DROPPING (Surprised :O mouth, wide excited anime eyes) ---
      [-eyeSpacing, eyeSpacing].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR * 1.15, 0, Math.PI * 2);
        ctx.fillStyle = '#222222';
        ctx.fill();

        // Big sparkling highlights
        ctx.beginPath();
        ctx.arc(ex - eyeR * 0.25, eyeY - eyeR * 0.25, eyeR * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex + eyeR * 0.35, eyeY + eyeR * 0.35, eyeR * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // Bright glowing blush cheeks
      ctx.fillStyle = 'rgba(255, 107, 129, 0.6)';
      [-eyeSpacing * 1.35, eyeSpacing * 1.35].forEach((cx) => {
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + eyeR * 1.3, eyeR * 1.3, eyeR * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Wide surprised :O mouth
      const mouthY = eyeY + eyeR * 1.35;
      const mouthR = radius * 0.12;
      ctx.beginPath();
      ctx.ellipse(0, mouthY, mouthR * 0.85, mouthR * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#222222';
      ctx.fill();

      // Tongue inside
      ctx.beginPath();
      ctx.ellipse(0, mouthY + mouthR * 0.5, mouthR * 0.55, mouthR * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7675';
      ctx.fill();

    } else {
      // --- EXPRESSION: NORMAL (Cute kawaii eyes with catchlights, blinking, smile) ---
      if (isBlinking) {
        // Happy closed curved eyes (^_^)
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = Math.max(1.8, radius * 0.06);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, eyeR * 1.1, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eyeSpacing, eyeY, eyeR * 1.1, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        // Big anime eyes with eye tracking offset
        [-eyeSpacing, eyeSpacing].forEach((ex) => {
          ctx.beginPath();
          ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
          ctx.fillStyle = '#222222';
          ctx.fill();

          // Main glossy catchlight (adjusted slightly by pupil gaze)
          ctx.beginPath();
          ctx.arc(ex - eyeR * 0.28 + pupilDx * 0.35, eyeY - eyeR * 0.28 + pupilDy * 0.35, eyeR * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Small secondary glint
          ctx.beginPath();
          ctx.arc(ex + eyeR * 0.32 + pupilDx * 0.2, eyeY + eyeR * 0.32 + pupilDy * 0.2, eyeR * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }

      // Rosy Pink Cheeks
      ctx.fillStyle = 'rgba(255, 107, 129, 0.48)';
      [-eyeSpacing * 1.35, eyeSpacing * 1.35].forEach((cx) => {
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + eyeR * 1.35, eyeR * 1.25, eyeR * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Gentle cute smile mouth
      ctx.beginPath();
      const mouthY = eyeY + eyeR * 1.3;
      const mouthW = radius * 0.16;
      ctx.arc(0, mouthY, mouthW, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = Math.max(1.6, radius * 0.05);
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.restore();
  }

  window.SuikaFruits = {
    list: FRUITS,
    get: getFruitByTier,
    drawFruit: drawFruit,
    updateSquash: updateSquash,
    applySquash: applySquash
  };
})(window);
