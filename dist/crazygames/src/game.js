/**
 * Suika Merge Drop - Core Game Engine
 * Physics with Matter.js, aiming & dropping, collision merge, combo system,
 * danger line detection, and game over lifecycle.
 */
(function(window) {
  'use strict';

  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 800;

  const CONTAINER_LEFT = 35;
  const CONTAINER_RIGHT = 445;
  const CONTAINER_BOTTOM = 760;
  const WALL_THICKNESS = 40;

  const DANGER_Y = 120;
  const DROP_Y = 65;
  const DROP_COOLDOWN_MS = 500;
  const COMBO_TIMEOUT_MS = 1200;
  const DANGER_LIMIT_SECONDS = 3.0;

  class SuikaGame {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.previewCanvas = null;
      this.previewCtx = null;

      // Matter.js components
      this.engine = null;
      this.world = null;
      this.runner = null;

      // Game state
      this.fruits = []; // track active fruit bodies
      this.score = 0;
      this.highScore = 0;
      this.comboCount = 0;
      this.lastMergeTime = 0;
      this.isGameOver = false;

      // Aiming & dropping
      this.currentTier = 1;
      this.nextTier = 1;
      this.aimX = GAME_WIDTH / 2;
      this.isPointerDown = false;
      this.lastDropTime = 0;
      this.canDrop = true;

      // Danger state
      this.dangerTimer = 0; // in seconds
      this.isDangerActive = false;

      // Queues for physics safe-step removals and spawns
      this.pendingMerges = [];

      // UI elements
      this.ui = {};
    }

    init() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = GAME_WIDTH;
      this.canvas.height = GAME_HEIGHT;

      this.previewCanvas = document.getElementById('next-canvas');
      if (this.previewCanvas) {
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewCanvas.width = 70;
        this.previewCanvas.height = 70;
      }

      this.initUI();
      this.loadHighScore();
      this.initPhysics();
      this.initInputs();
      this.prepareNextFruits();

      // Start game loop
      this.lastFrameTime = performance.now();
      requestAnimationFrame((t) => this.renderLoop(t));

      // Notify Universal Platform SDK and legacy YTPlayables
      if (window.PlatformSDK) {
        window.PlatformSDK.init();
      }
      if (window.YTPlayables) {
        window.YTPlayables.gameReady();
      }
    }

    initUI() {
      this.ui.scoreVal = document.getElementById('score-val');
      this.ui.highVal = document.getElementById('high-val');
      this.ui.dangerIndicator = document.getElementById('danger-indicator');
      this.ui.dangerBar = document.getElementById('danger-bar-fill');
      this.ui.gameOverModal = document.getElementById('game-over-modal');
      this.ui.finalScore = document.getElementById('final-score');
      this.ui.finalBest = document.getElementById('final-best');
      this.ui.btnRestart = document.getElementById('btn-restart');
      this.ui.btnRestartModal = document.getElementById('btn-restart-modal');
      this.ui.btnReviveModal = document.getElementById('btn-revive-modal');
      this.ui.btnSound = document.getElementById('btn-sound');

      if (this.ui.btnRestart) {
        this.ui.btnRestart.addEventListener('click', () => this.restart());
      }
      if (this.ui.btnRestartModal) {
        this.ui.btnRestartModal.addEventListener('click', () => this.restart());
      }
      if (this.ui.btnReviveModal) {
        this.ui.btnReviveModal.addEventListener('click', () => this.requestRevive());
      }
      if (this.ui.btnSound) {
        this.ui.btnSound.addEventListener('click', () => {
          if (window.SoundManager) {
            const muted = window.SoundManager.toggleMute();
            this.updateSoundButtonUI(muted);
          }
        });
        if (window.SoundManager) {
          this.updateSoundButtonUI(window.SoundManager.isMuted());
        }
      }

      this.updateScoreUI();
    }

    updateSoundButtonUI(muted) {
      if (!this.ui.btnSound) return;
      this.ui.btnSound.innerHTML = muted
        ? '<span class="icon">&#128263;</span>'
        : '<span class="icon">&#128266;</span>';
      this.ui.btnSound.setAttribute('aria-label', muted ? 'Unmute Sound' : 'Mute Sound');
    }

    loadHighScore() {
      try {
        const saved = localStorage.getItem('suika_high_score');
        this.highScore = saved ? parseInt(saved, 10) || 0 : 0;
      } catch (e) {
        this.highScore = 0;
      }
      if (this.ui.highVal) {
        this.ui.highVal.textContent = this.highScore;
      }
    }

    saveHighScore() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try {
          localStorage.setItem('suika_high_score', this.highScore.toString());
        } catch (e) {
          // ignore
        }
      }
      if (this.ui.highVal) {
        this.ui.highVal.textContent = this.highScore;
      }
    }

    updateScoreUI() {
      if (this.ui.scoreVal) {
        this.ui.scoreVal.textContent = this.score;
      }
      if (this.ui.highVal) {
        this.ui.highVal.textContent = this.highScore;
      }
    }

    initPhysics() {
      const Engine = Matter.Engine;
      const World = Matter.World;
      const Bodies = Matter.Bodies;
      const Events = Matter.Events;

      this.engine = Engine.create({
        enableSleeping: false,
        gravity: { x: 0, y: 1.25, scale: 0.001 }
      });
      this.world = this.engine.world;

      // Container Walls: Left, Right, Bottom, Top Stopper
      const ground = Bodies.rectangle(
        GAME_WIDTH / 2,
        CONTAINER_BOTTOM + WALL_THICKNESS / 2,
        CONTAINER_RIGHT - CONTAINER_LEFT + WALL_THICKNESS * 2,
        WALL_THICKNESS,
        {
          isStatic: true,
          friction: 0.6,
          restitution: 0.15,
          label: 'ground'
        }
      );

      const leftWall = Bodies.rectangle(
        CONTAINER_LEFT - WALL_THICKNESS / 2,
        GAME_HEIGHT / 2,
        WALL_THICKNESS,
        GAME_HEIGHT * 2,
        {
          isStatic: true,
          friction: 0.4,
          restitution: 0.2,
          label: 'leftWall'
        }
      );

      const rightWall = Bodies.rectangle(
        CONTAINER_RIGHT + WALL_THICKNESS / 2,
        GAME_HEIGHT / 2,
        WALL_THICKNESS,
        GAME_HEIGHT * 2,
        {
          isStatic: true,
          friction: 0.4,
          restitution: 0.2,
          label: 'rightWall'
        }
      );

      World.add(this.world, [ground, leftWall, rightWall]);

      // Collision Event Listener
      Events.on(this.engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
          const { bodyA, bodyB } = pairs[i];
          if (bodyA.isFruit && bodyB.isFruit) {
            this.handleFruitCollision(bodyA, bodyB);
          }
        }
      });
    }

    handleFruitCollision(bodyA, bodyB) {
      if (this.isGameOver) return;
      if (bodyA.isMerging || bodyB.isMerging) return;
      if (bodyA.tier !== bodyB.tier) return;
      if (bodyA.tier >= 11) return; // Max tier already

      // Mark both bodies as merging to prevent duplicate event triggers
      bodyA.isMerging = true;
      bodyB.isMerging = true;

      this.pendingMerges.push({
        tier: bodyA.tier,
        x: (bodyA.position.x + bodyB.position.x) / 2,
        y: (bodyA.position.y + bodyB.position.y) / 2,
        vx: (bodyA.velocity.x + bodyB.velocity.x) * 0.3,
        vy: -2.8, // slight upward bounce
        bodyA: bodyA,
        bodyB: bodyB
      });
    }

    processPendingMerges() {
      if (this.pendingMerges.length === 0) return;

      const now = performance.now();
      if (now - this.lastMergeTime < COMBO_TIMEOUT_MS) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.lastMergeTime = now;

      while (this.pendingMerges.length > 0) {
        const m = this.pendingMerges.shift();
        const nextTier = m.tier + 1;
        const fruitInfo = window.SuikaFruits.get(nextTier);

        // Remove old bodies
        Matter.World.remove(this.world, m.bodyA);
        Matter.World.remove(this.world, m.bodyB);
        this.fruits = this.fruits.filter((f) => f !== m.bodyA && f !== m.bodyB);

        // Spawn new upgraded fruit body
        const newBody = this.createFruitBody(m.x, m.y, nextTier);
        Matter.Body.setVelocity(newBody, { x: m.vx, y: m.vy });
        Matter.World.add(this.world, newBody);
        this.fruits.push(newBody);

        // Score calculation with combo bonus
        const basePoints = fruitInfo.points;
        const comboBonusMultiplier = 1 + (this.comboCount - 1) * 0.5;
        const awardedPoints = Math.round(basePoints * comboBonusMultiplier);

        this.score += awardedPoints;
        this.saveHighScore();
        this.updateScoreUI();

        // Audio pop
        if (window.SoundManager) {
          window.SoundManager.playMerge(nextTier, this.comboCount);
        }

        // Particle explosion & floating score text
        if (window.SuikaParticles) {
          window.SuikaParticles.burst(m.x, m.y, fruitInfo.color, 18);
          const popupText = this.comboCount > 1
            ? `+${awardedPoints} x${this.comboCount}!`
            : `+${awardedPoints}`;
          window.SuikaParticles.addPopup(m.x, m.y, popupText, fruitInfo.color, this.comboCount > 1 ? 1.3 : 1.0);
        }

        // Celebratory event on major milestones (Watermelon tier 11 or 5x combo)
        if (nextTier === 11 || this.comboCount >= 5) {
          if (window.PlatformSDK) {
            window.PlatformSDK.happyTime(nextTier === 11 ? 1.0 : 0.8);
          }
        }
      }
    }

    createFruitBody(x, y, tier) {
      const fruitInfo = window.SuikaFruits.get(tier);
      const radius = fruitInfo.radius;

      // Adjust restitution and density
      const body = Matter.Bodies.circle(x, y, radius, {
        restitution: 0.22,
        friction: 0.35,
        frictionAir: 0.012,
        density: 0.0015 * (1 + tier * 0.08),
        label: `fruit_${tier}`
      });

      body.isFruit = true;
      body.tier = tier;
      body.fruitRadius = radius;
      body.spawnTime = performance.now();
      body.isMerging = false;

      return body;
    }

    getRandomDropTier() {
      // Player can drop tiers 1 to 4 with slight weighting towards smaller fruits
      const weights = [0.4, 0.3, 0.2, 0.1];
      const r = Math.random();
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (r <= cumulative) return i + 1;
      }
      return 1;
    }

    prepareNextFruits() {
      this.currentTier = this.getRandomDropTier();
      this.nextTier = this.getRandomDropTier();
      this.renderNextFruitPreview();
    }

    cycleNextFruit() {
      this.currentTier = this.nextTier;
      this.nextTier = this.getRandomDropTier();
      this.renderNextFruitPreview();
    }

    renderNextFruitPreview() {
      if (!this.previewCtx) return;
      const ctx = this.previewCtx;
      ctx.clearRect(0, 0, 70, 70);

      const fruitInfo = window.SuikaFruits.get(this.nextTier);
      // Scale down slightly if needed to comfortably fit in preview box
      const previewScale = Math.min(1.0, 24 / fruitInfo.radius);
      ctx.save();
      ctx.translate(35, 35);
      ctx.scale(previewScale, previewScale);
      window.SuikaFruits.drawFruit(ctx, 0, 0, fruitInfo.radius, this.nextTier, 0);
      ctx.restore();
    }

    initInputs() {
      const getCanvasX = (clientX) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        return (clientX - rect.left) * scaleX;
      };

      const handlePointerDown = (e) => {
        if (this.isGameOver) return;
        this.isPointerDown = true;
        const x = getCanvasX(e.clientX || (e.touches && e.touches[0].clientX));
        this.updateAimX(x);
      };

      const handlePointerMove = (e) => {
        if (this.isGameOver) return;
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;
        const x = getCanvasX(clientX);
        this.updateAimX(x);
      };

      const handlePointerUp = () => {
        if (this.isGameOver) return;
        if (!this.isPointerDown) return;
        this.isPointerDown = false;
        this.tryDropCurrentFruit();
      };

      // Pointer / Mouse events on container
      this.canvas.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      // Touch events fallback
      this.canvas.addEventListener('touchstart', (e) => {
        handlePointerDown(e);
        e.preventDefault();
      }, { passive: false });
      window.addEventListener('touchmove', (e) => {
        handlePointerMove(e);
      }, { passive: true });
      window.addEventListener('touchend', () => {
        handlePointerUp();
      });
    }

    updateAimX(rawX) {
      const fruitInfo = window.SuikaFruits.get(this.currentTier);
      const r = fruitInfo.radius;
      const minX = CONTAINER_LEFT + r + 3;
      const maxX = CONTAINER_RIGHT - r - 3;
      this.aimX = Math.max(minX, Math.min(maxX, rawX));
    }

    tryDropCurrentFruit() {
      const now = performance.now();
      if (now - this.lastDropTime < DROP_COOLDOWN_MS) return;

      const fruitInfo = window.SuikaFruits.get(this.currentTier);
      const body = this.createFruitBody(this.aimX, DROP_Y, this.currentTier);

      Matter.World.add(this.world, body);
      this.fruits.push(body);

      this.lastDropTime = now;

      // Play subtle drop sound
      if (window.SoundManager) {
        window.SoundManager.playDrop();
      }

      // Notify PlatformSDK when dropping fruit begins active gameplay
      if (window.PlatformSDK) {
        window.PlatformSDK.gameplayStart();
      }

      this.cycleNextFruit();
    }

    checkDangerAndGameOver(dtSeconds) {
      if (this.isGameOver) return;

      const now = performance.now();
      let hasFruitAboveDanger = false;

      // Inspect settled fruits above danger line
      for (let i = 0; i < this.fruits.length; i++) {
        const body = this.fruits[i];
        if (body.isMerging) continue;

        const age = (now - body.spawnTime) / 1000;
        // Fruit must be dropped > 1.5s ago and settled (low velocity)
        if (age > 1.5) {
          const speed = body.speed;
          const topY = body.position.y - body.fruitRadius;

          if (topY <= DANGER_Y) {
            if (speed < 0.25) {
              hasFruitAboveDanger = true;
              break;
            }
          }
        }
      }

      if (hasFruitAboveDanger) {
        this.dangerTimer += dtSeconds;
        this.isDangerActive = true;

        if (window.SoundManager) {
          window.SoundManager.playDangerWarning();
        }

        if (this.dangerTimer >= DANGER_LIMIT_SECONDS) {
          this.triggerGameOver();
        }
      } else {
        this.dangerTimer = Math.max(0, this.dangerTimer - dtSeconds * 1.5);
        this.isDangerActive = this.dangerTimer > 0.05;
      }

      // Update Danger UI Indicator & Bar
      if (this.ui.dangerIndicator) {
        if (this.isDangerActive) {
          this.ui.dangerIndicator.classList.add('active');
        } else {
          this.ui.dangerIndicator.classList.remove('active');
        }
      }

      if (this.ui.dangerBar) {
        const pct = Math.min(100, (this.dangerTimer / DANGER_LIMIT_SECONDS) * 100);
        this.ui.dangerBar.style.width = `${pct}%`;
      }
    }

    triggerGameOver() {
      if (this.isGameOver) return;
      this.isGameOver = true;

      // Sound
      if (window.SoundManager) {
        window.SoundManager.playGameOver();
      }

      // Save high score
      this.saveHighScore();

      // Notify PlatformSDK gameplay stop
      if (window.PlatformSDK) {
        window.PlatformSDK.gameplayStop();
      }

      // Interstitial Ad request (PlatformSDK with safe fallback)
      if (window.PlatformSDK) {
        window.PlatformSDK.requestInterstitialAd();
      } else if (window.YTPlayables) {
        window.YTPlayables.requestInterstitialAd();
      }
      // Show Game Over Modal
      if (this.ui.finalScore) {
        this.ui.finalScore.textContent = this.score;
      }
      if (this.ui.finalBest) {
        this.ui.finalBest.textContent = this.highScore;
      }
      if (this.ui.gameOverModal) {
        this.ui.gameOverModal.classList.remove('hidden');
      }
    }

    requestRevive() {
      if (!window.PlatformSDK) {
        this.reviveAfterAd();
        return;
      }

      window.PlatformSDK.requestRewardedAd(
        'revive',
        () => this.reviveAfterAd(),
        () => {
          console.log('[SuikaGame] Revive rewarded ad closed or dismissed.');
        }
      );
    }

    reviveAfterAd() {
      if (this.ui.gameOverModal) {
        this.ui.gameOverModal.classList.add('hidden');
      }

      // Remove fruits near top to clear danger (fruit center above DANGER_Y + 140)
      const clearThresholdY = DANGER_Y + 140;
      const fruitsToRemove = this.fruits.filter((f) => f.position.y < clearThresholdY);
      for (let i = 0; i < fruitsToRemove.length; i++) {
        Matter.World.remove(this.world, fruitsToRemove[i]);
        if (window.SuikaParticles) {
          window.SuikaParticles.burst(fruitsToRemove[i].position.x, fruitsToRemove[i].position.y, '#f1c40f', 16);
          window.SuikaParticles.addPopup(fruitsToRemove[i].position.x, fruitsToRemove[i].position.y, 'REVIVED!', '#2ecc71', 1.2);
        }
      }
      this.fruits = this.fruits.filter((f) => f.position.y >= clearThresholdY);

      // Reset danger timer and game over flag
      this.dangerTimer = 0;
      this.isDangerActive = false;
      this.isGameOver = false;

      if (this.ui.dangerBar) {
        this.ui.dangerBar.style.width = '0%';
      }
      if (this.ui.dangerIndicator) {
        this.ui.dangerIndicator.classList.remove('active');
      }

      if (window.PlatformSDK) {
        window.PlatformSDK.gameplayStart();
      }

      if (window.SoundManager) {
        window.SoundManager.playMerge(6, 1);
      }
    }

    restart() {
      // Clear all fruits from world
      for (let i = 0; i < this.fruits.length; i++) {
        Matter.World.remove(this.world, this.fruits[i]);
      }
      this.fruits = [];
      this.pendingMerges = [];

      // Reset state
      this.score = 0;
      this.comboCount = 0;
      this.dangerTimer = 0;
      this.isDangerActive = false;
      this.isGameOver = false;
      this.isPointerDown = false;
      this.lastDropTime = 0;

      // Reset UI
      this.updateScoreUI();
      if (this.ui.gameOverModal) {
        this.ui.gameOverModal.classList.add('hidden');
      }
      if (this.ui.dangerBar) {
        this.ui.dangerBar.style.width = '0%';
      }
      if (this.ui.dangerIndicator) {
        this.ui.dangerIndicator.classList.remove('active');
      }

      // Clear particles
      if (window.SuikaParticles) {
        window.SuikaParticles.clear();
      }

      this.prepareNextFruits();
    }

    renderLoop(timestamp) {
      const dt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      // 1. Physics Step
      if (!this.isGameOver) {
        Matter.Engine.update(this.engine, dt * 1000);
        this.processPendingMerges();
        this.checkDangerAndGameOver(dt);
      }

      // 2. Particle Update
      if (window.SuikaParticles) {
        window.SuikaParticles.update();
      }

      // 3. Render Canvas
      this.draw();

      requestAnimationFrame((t) => this.renderLoop(t));
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Draw Container Background & Floor/Walls
      this.drawContainer(ctx);

      // Draw Danger Warning Line
      this.drawDangerLine(ctx);

      // Draw Aiming Guide Line and Dropper Preview Fruit (if active)
      if (!this.isGameOver) {
        this.drawAimGuide(ctx);
      }

      // Draw Active Fruits
      const blinkTime = Date.now();
      for (let i = 0; i < this.fruits.length; i++) {
        const body = this.fruits[i];
        if (body.isMerging) continue;

        // Occasional blinking kawaii eyes based on fruit id seed
        const isBlinking = ((blinkTime + body.id * 850) % 3600) < 160;
        window.SuikaFruits.drawFruit(
          ctx,
          body.position.x,
          body.position.y,
          body.fruitRadius,
          body.tier,
          body.angle,
          { isBlinking }
        );
      }

      // Draw Particle System & Floating Text on top
      if (window.SuikaParticles) {
        window.SuikaParticles.draw(ctx);
      }
    }

    drawContainer(ctx) {
      // Subtle container playfield glass background
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(
        CONTAINER_LEFT,
        DANGER_Y - 20,
        CONTAINER_RIGHT - CONTAINER_LEFT,
        CONTAINER_BOTTOM - DANGER_Y + 20
      );

      // Container Borders (Left, Right, Bottom)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(CONTAINER_LEFT, DANGER_Y - 30);
      ctx.lineTo(CONTAINER_LEFT, CONTAINER_BOTTOM);
      ctx.lineTo(CONTAINER_RIGHT, CONTAINER_BOTTOM);
      ctx.lineTo(CONTAINER_RIGHT, DANGER_Y - 30);
      ctx.stroke();

      // Bottom corner neon accents
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CONTAINER_LEFT + 2, CONTAINER_BOTTOM - 15);
      ctx.lineTo(CONTAINER_LEFT + 2, CONTAINER_BOTTOM - 2);
      ctx.lineTo(CONTAINER_LEFT + 15, CONTAINER_BOTTOM - 2);

      ctx.moveTo(CONTAINER_RIGHT - 2, CONTAINER_BOTTOM - 15);
      ctx.lineTo(CONTAINER_RIGHT - 2, CONTAINER_BOTTOM - 2);
      ctx.lineTo(CONTAINER_RIGHT - 15, CONTAINER_BOTTOM - 2);
      ctx.stroke();

      ctx.restore();
    }

    drawDangerLine(ctx) {
      ctx.save();
      const isPulsing = this.isDangerActive;
      const alpha = isPulsing
        ? 0.55 + Math.sin(Date.now() * 0.015) * 0.4
        : 0.28;

      ctx.strokeStyle = isPulsing ? `rgba(255, 71, 87, ${alpha})` : `rgba(255, 165, 2, ${alpha})`;
      ctx.lineWidth = isPulsing ? 3 : 2;
      ctx.setLineDash([8, 6]);

      ctx.beginPath();
      ctx.moveTo(CONTAINER_LEFT + 4, DANGER_Y);
      ctx.lineTo(CONTAINER_RIGHT - 4, DANGER_Y);
      ctx.stroke();

      ctx.restore();
    }

    drawAimGuide(ctx) {
      const fruitInfo = window.SuikaFruits.get(this.currentTier);
      const r = fruitInfo.radius;

      ctx.save();

      // 1. Dotted vertical drop guide line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      ctx.beginPath();
      ctx.moveTo(this.aimX, DROP_Y + r + 4);
      ctx.lineTo(this.aimX, CONTAINER_BOTTOM - 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Ghost/Drop Fruit preview at top
      const canDropNow = performance.now() - this.lastDropTime >= DROP_COOLDOWN_MS;
      ctx.globalAlpha = canDropNow ? 0.95 : 0.45;
      window.SuikaFruits.drawFruit(ctx, this.aimX, DROP_Y, r, this.currentTier, 0);

      ctx.restore();
    }
  }

  // Bootstrap game on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.suikaGame = new SuikaGame();
    window.suikaGame.init();
  });
})(window);
