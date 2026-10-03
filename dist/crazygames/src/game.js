/**
 * Suika Merge Drop - Core Game Engine
 * Physics with Matter.js, aiming & dropping, collision merge, combo system,
 * danger line detection, squash-and-stretch deformation, screen shake,
 * animated score rolling, and onboarding tutorial hints.
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
      this.displayedScore = 0;
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

      // Onboarding tutorial state
      this.hasDismissedTutorial = false;
      this.tutorialAlpha = 1.0;
      try {
        this.hasDismissedTutorial = localStorage.getItem('suika_tutorial_done') === 'true';
        if (this.hasDismissedTutorial) this.tutorialAlpha = 0;
      } catch (e) {
        this.hasDismissedTutorial = false;
      }

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
        this.ui.scoreVal.textContent = this.displayedScore;
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

      // Container Walls: Left, Right, Bottom
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

          // 1. Fruit to Fruit Collisions
          if (bodyA.isFruit && bodyB.isFruit) {
            // Calculate relative collision speed for impact squash & sound
            const relVx = bodyA.velocity.x - bodyB.velocity.x;
            const relVy = bodyA.velocity.y - bodyB.velocity.y;
            const impactSpeed = Math.hypot(relVx, relVy);

            if (impactSpeed > 2.2) {
              const squashAmt = Math.min(1.35, 1.0 + impactSpeed * 0.035);
              if (window.SuikaFruits) {
                window.SuikaFruits.applySquash(bodyA, squashAmt, 1 / squashAmt);
                window.SuikaFruits.applySquash(bodyB, squashAmt, 1 / squashAmt);
              }
              if (window.SoundManager) {
                window.SoundManager.playImpact(impactSpeed);
              }
            }

            bodyA.hasLanded = true;
            bodyB.hasLanded = true;

            // Handle potential tier merge
            this.handleFruitCollision(bodyA, bodyB);
          }
          // 2. Fruit to Floor or Wall Collisions
          else if (bodyA.isFruit || bodyB.isFruit) {
            const fruitBody = bodyA.isFruit ? bodyA : bodyB;
            const wallBody = bodyA.isFruit ? bodyB : bodyA;
            fruitBody.hasLanded = true;

            const speed = Math.hypot(fruitBody.velocity.x, fruitBody.velocity.y);
            if (speed > 2.0) {
              const squashAmt = Math.min(1.32, 1.0 + speed * 0.03);
              if (window.SuikaFruits) {
                if (wallBody.label === 'ground') {
                  window.SuikaFruits.applySquash(fruitBody, squashAmt, 1 / squashAmt);
                } else {
                  window.SuikaFruits.applySquash(fruitBody, 1 / squashAmt, squashAmt);
                }
              }
              if (window.SoundManager) {
                window.SoundManager.playImpact(speed);
              }
            }
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
        newBody.hasLanded = true;
        Matter.Body.setVelocity(newBody, { x: m.vx, y: m.vy });

        // Apply a gentle squash on spawn
        if (window.SuikaFruits) {
          window.SuikaFruits.applySquash(newBody, 1.25, 0.82);
        }

        Matter.World.add(this.world, newBody);
        this.fruits.push(newBody);

        // Score calculation with combo bonus
        const basePoints = fruitInfo.points;
        const comboBonusMultiplier = 1 + (this.comboCount - 1) * 0.5;
        const awardedPoints = Math.round(basePoints * comboBonusMultiplier);

        this.score += awardedPoints;
        this.saveHighScore();

        // Audio pop with tier-scaled harmonics
        if (window.SoundManager) {
          window.SoundManager.playMerge(nextTier, this.comboCount);
        }

        // Screen Shake for impactful high-tier merges (Apple tier 6 and above)
        if (window.SuikaParticles) {
          if (nextTier >= 6) {
            const intensity = Math.min(6.5, 2.5 + (nextTier - 6) * 0.8);
            const duration = 160 + (nextTier - 6) * 20;
            window.SuikaParticles.shake(intensity, duration);
          }
          if (nextTier === 11) {
            window.SuikaParticles.shake(7.0, 320);
          }

          // Juicy fruit splatter & expanding shockwave ring
          window.SuikaParticles.juiceSplatter(m.x, m.y, fruitInfo.color, nextTier);

          // Bouncy combo banners & floating points
          window.SuikaParticles.addComboPopup(m.x, m.y, nextTier, this.comboCount, awardedPoints);
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
      body.hasLanded = false;
      body.squashX = 1.0;
      body.squashY = 1.0;
      body.squashVx = 0;
      body.squashVy = 0;

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

      const dismissTutorial = () => {
        if (!this.hasDismissedTutorial) {
          this.hasDismissedTutorial = true;
          try {
            localStorage.setItem('suika_tutorial_done', 'true');
          } catch (e) {
            // ignore
          }
        }
      };

      const handlePointerDown = (e) => {
        if (this.isGameOver) return;
        dismissTutorial();
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
        dismissTutorial();
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

      const body = this.createFruitBody(this.aimX, DROP_Y, this.currentTier);

      // Add slight initial stretch when dropping
      if (window.SuikaFruits) {
        window.SuikaFruits.applySquash(body, 0.85, 1.22);
      }

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

      // Show Game Over Modal with rapid score ticker animation
      if (this.ui.gameOverModal) {
        this.ui.gameOverModal.classList.remove('hidden');
      }

      this.animateModalScore(this.score, this.highScore);
    }

    animateModalScore(targetScore, bestScore) {
      if (!this.ui.finalScore) return;
      let current = 0;
      const duration = 800; // ms
      const startTime = performance.now();

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / duration);
        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        current = Math.round(eased * targetScore);
        if (this.ui.finalScore) {
          this.ui.finalScore.textContent = current;
        }
        if (progress < 1.0) {
          requestAnimationFrame(tick);
        } else {
          if (this.ui.finalScore) this.ui.finalScore.textContent = targetScore;
          if (this.ui.finalBest) this.ui.finalBest.textContent = bestScore;
        }
      };
      requestAnimationFrame(tick);
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
      this.displayedScore = 0;
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

      // 1. Smooth score counter animation
      if (this.displayedScore < this.score) {
        const diff = this.score - this.displayedScore;
        const step = Math.max(1, Math.ceil(diff * 0.16));
        this.displayedScore = Math.min(this.score, this.displayedScore + step);
        if (this.ui.scoreVal) {
          this.ui.scoreVal.textContent = this.displayedScore;
        }
      }

      // 2. Physics Step
      if (!this.isGameOver) {
        Matter.Engine.update(this.engine, dt * 1000);
        this.processPendingMerges();
        this.checkDangerAndGameOver(dt);
      }

      // 3. Update squash spring physics on each fruit body
      if (window.SuikaFruits) {
        for (let i = 0; i < this.fruits.length; i++) {
          window.SuikaFruits.updateSquash(this.fruits[i]);
        }
      }

      // 4. Particle & Screen Shake Update
      if (window.SuikaParticles) {
        window.SuikaParticles.update();
      }

      // 5. Update tutorial hint fadeout
      if (this.hasDismissedTutorial && this.tutorialAlpha > 0) {
        this.tutorialAlpha = Math.max(0, this.tutorialAlpha - dt * 2.5);
      }

      // 6. Render Canvas
      this.draw(timestamp);

      requestAnimationFrame((t) => this.renderLoop(t));
    }

    draw(timestamp = 0) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Get screen shake translation offset
      let shakeX = 0;
      let shakeY = 0;
      if (window.SuikaParticles) {
        const offset = window.SuikaParticles.getShakeOffset();
        shakeX = offset.x;
        shakeY = offset.y;
      }

      ctx.save();
      if (shakeX !== 0 || shakeY !== 0) {
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw Container Background & Floor/Walls
      this.drawContainer(ctx);

      // 2. Draw Danger Warning Line
      this.drawDangerLine(ctx);

      // 3. Draw Aiming Guide Line and Dropper Preview Fruit (if active)
      if (!this.isGameOver) {
        this.drawAimGuide(ctx);
      }

      // 4. Draw Active Fruits with Kawaii Dynamic Expressions & Eye Tracking
      const now = performance.now();
      const blinkTime = Date.now();

      for (let i = 0; i < this.fruits.length; i++) {
        const body = this.fruits[i];
        if (body.isMerging) continue;

        // Occasional blinking kawaii eyes based on fruit id seed
        const isBlinking = ((blinkTime + body.id * 850) % 3600) < 160;

        // Expression selection logic
        let expression = 'normal';
        if (now - body.spawnTime < 650 && body.tier > 1) {
          expression = 'merging_happy';
        } else if (body.position.y < 180 || (this.isDangerActive && body.position.y < 230)) {
          expression = 'danger_worried';
        } else if (body.velocity.y > 3.6 && !body.hasLanded) {
          expression = 'dropping';
        }

        // Eye tracking: glance toward nearest same-tier fruit (within 160px) or drop target
        let targetX = this.aimX;
        let targetY = DROP_Y;
        let closestDist = 160;

        for (let j = 0; j < this.fruits.length; j++) {
          const other = this.fruits[j];
          if (other !== body && other.tier === body.tier && !other.isMerging) {
            const dist = Math.hypot(other.position.x - body.position.x, other.position.y - body.position.y);
            if (dist < closestDist) {
              closestDist = dist;
              targetX = other.position.x;
              targetY = other.position.y;
            }
          }
        }

        window.SuikaFruits.drawFruit(
          ctx,
          body.position.x,
          body.position.y,
          body.fruitRadius,
          body.tier,
          body.angle,
          {
            squashX: body.squashX || 1.0,
            squashY: body.squashY || 1.0,
            expression: expression,
            isBlinking: isBlinking,
            eyeTargetX: targetX,
            eyeTargetY: targetY
          }
        );
      }

      // 5. Draw Particle System & Floating Text on top of fruits
      if (window.SuikaParticles) {
        window.SuikaParticles.draw(ctx);
      }

      // 6. Draw Onboarding Tutorial Hint (if not permanently dismissed)
      if (this.tutorialAlpha > 0) {
        this.drawOnboardingTutorial(ctx, timestamp);
      }

      ctx.restore();
    }

    drawOnboardingTutorial(ctx, timestamp) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.tutorialAlpha));

      // Oscillating hand / arrow movement
      const wave = Math.sin(timestamp * 0.0035);
      const handX = (CONTAINER_LEFT + CONTAINER_RIGHT) / 2 + wave * 75;
      const handY = DROP_Y + 70;

      // Aiming hand indicator icon
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDC46', handX, handY); // pointing hand up 👆

      // Rounded glassmorphism tutorial pill banner
      const bannerY = handY + 38;
      const bannerText = 'Drag to aim \u2022 Release to drop';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(bannerText);
      const bannerW = textMetrics.width + 28;
      const bannerH = 28;
      const bannerX = (CONTAINER_LEFT + CONTAINER_RIGHT) / 2 - bannerW / 2;

      ctx.fillStyle = 'rgba(22, 27, 34, 0.88)';
      ctx.strokeStyle = 'rgba(255, 211, 42, 0.65)';
      ctx.lineWidth = 1.5;

      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(bannerX, bannerY - bannerH / 2, bannerW, bannerH, 14)
        : ctx.rect(bannerX, bannerY - bannerH / 2, bannerW, bannerH);
      ctx.fill();
      ctx.stroke();

      // Banner text
      ctx.fillStyle = '#ffd32a';
      ctx.fillText(bannerText, (CONTAINER_LEFT + CONTAINER_RIGHT) / 2, bannerY);

      ctx.restore();
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(CONTAINER_LEFT + 2, CONTAINER_BOTTOM - 16);
      ctx.lineTo(CONTAINER_LEFT + 2, CONTAINER_BOTTOM - 2);
      ctx.lineTo(CONTAINER_LEFT + 16, CONTAINER_BOTTOM - 2);

      ctx.moveTo(CONTAINER_RIGHT - 2, CONTAINER_BOTTOM - 16);
      ctx.lineTo(CONTAINER_RIGHT - 2, CONTAINER_BOTTOM - 2);
      ctx.lineTo(CONTAINER_RIGHT - 16, CONTAINER_BOTTOM - 2);
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);

      ctx.beginPath();
      ctx.moveTo(this.aimX, DROP_Y + r + 4);
      ctx.lineTo(this.aimX, CONTAINER_BOTTOM - 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Ghost/Drop Fruit preview at top
      const canDropNow = performance.now() - this.lastDropTime >= DROP_COOLDOWN_MS;
      ctx.globalAlpha = canDropNow ? 0.96 : 0.45;
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
