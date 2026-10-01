# Technical Manual & Architecture Documentation: Suika Merge Drop

**Version:** 1.0.0  
**Engine:** HTML5 Canvas 2D + Matter.js Physics + Web Audio API (Synthesizer)  
**Distribution Platforms:** Web (CrazyGames, Poki, YouTube Playables, Standalone), Mobile (Android via Capacitor)

---

## 1. Architectural Overview & Directory Structure

Suika Merge Drop is engineered with a strict **zero-external-asset dependency** architecture. Graphics, typography symbols, particles, and sound effects are generated 100% procedurally in real-time. This guarantees near-instant initial load (< 250 KB total download size), zero network latency for audio or sprites, and offline playability.

```
suika-game-playable/
├── .github/
│   └── workflows/
│       └── build-apk.yml            # CI/CD: Automated Android Debug APK Builder
├── dist/                            # Generated production bundles & ZIP archives
│   ├── crazygames/                  # CrazyGames standalone bundle
│   ├── poki/                        # Poki standalone bundle
│   ├── android-web/                 # Staged web assets for Capacitor Android build
│   ├── crazygames.zip               # Ready-to-upload CrazyGames distribution package
│   ├── poki.zip                     # Ready-to-upload Poki distribution package
│   └── suika-merge-drop-commercial-v1.0.zip # Marketplace buyer bundle
├── scripts/
│   └── package-all.js               # Multi-target distribution packager & zip generator
├── src/
│   ├── audio.js                     # Procedural Web Audio API sound synthesizer
│   ├── fruits.js                    # 11-Tier fruit definitions & kawaii canvas renderer
│   ├── game.js                      # Core game loop, input mediation, & state manager
│   ├── particles.js                 # High-performance 2D particle burst & text FX
│   ├── platform-sdk.js              # Universal mediation SDK (CrazyGames/Poki/YT/Offline)
│   └── ytplayables.js               # YouTube Playables legacy adapter bridge
├── vendor/
│   └── matter.min.js                # Matter.js 2D Rigid Body Physics Engine (v0.19+)
├── ANDROID_SETUP_GUIDE.md           # Android Studio & CI guide
├── capacitor.config.json            # Capacitor Android native configuration
├── DOCUMENTATION.md                 # Complete technical architecture reference (this file)
├── index.html                       # Semantic HTML5 shell with responsive HUD & playfield
├── package.json                     # NPM tooling & Capacitor dependencies
├── RESKIN_GUIDE.md                  # 5-minute visual & physics customization guide
├── SALES_COPY_MARKETPLACE.md        # Marketing copy for CodeCanyon, Codester, Itch.io
├── style.css                        # Cyberpunk-kawaii glassmorphism UI styling
├── SUBMISSION_GUIDE_CRAZYGAMES.md   # CrazyGames Developer Portal submission guide
└── SUBMISSION_GUIDE_POKI.md         # Poki for Developers submission guide
```

---

## 2. Game Loop & Frame Execution Lifecycle

The game runs inside a continuous `requestAnimationFrame` render loop with a clamped delta time (`dt`) to guarantee numerical stability across variable refresh rates (60Hz, 120Hz, 144Hz ProMotion screens).

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      requestAnimationFrame                  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Delta Time Calculation:                                     │
 │   dt = min(0.05, (timestamp - lastFrameTime) / 1000)        │
 └──────────────────────────────┬──────────────────────────────┘
                                │
               ┌────────────────┴────────────────┐
               │                                 │
        [Is Game Active]                  [Is Game Over]
               │                                 │
               ▼                                 │
 ┌───────────────────────────┐                   │
 │ 1. Matter.Engine.update() │                   │
 │    (dt * 1000 ms)         │                   │
 └─────────────┬─────────────┘                   │
               │                                 │
               ▼                                 │
 ┌───────────────────────────┐                   │
 │ 2. Process Pending Merges │                   │
 │    (Remove/Spawn/Combo)   │                   │
 └─────────────┬─────────────┘                   │
               │                                 │
               ▼                                 │
 ┌───────────────────────────┐                   │
 │ 3. Check Danger Line      │                   │
 │    (Accumulate/decay timer│                   │
 └─────────────┬─────────────┘                   │
               │                                 │
               └────────────────┬────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 4. Particles & Floating Text Update                         │
 │    (Position integration, decay alpha, recycle dead)        │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 5. Render Canvas                                            │
 │    (Container glass background -> Aim indicator ->          │
 │     Active Fruit Bodies -> Danger line -> Particle bursts)  │
 └─────────────────────────────────────────────────────────────┘
```

### Delta Time Clamping
To prevent physics "tunneling" or bodies launching through walls during background tab stalls or CPU spikes, `dt` is clamped to a maximum of 50ms (`0.05s`):
```javascript
const dt = Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
```

---

## 3. Physics Engine Specifications (Matter.js)

### Playfield Dimensions & Boundary Containers
- **Virtual Resolution**: `480px` width by `800px` height.
- **Left Wall**: `x = 15`, `y = 440`, `width = 40`, `height = 720` (Static, Restitution: 0.15, Friction: 0.2).
- **Right Wall**: `x = 465`, `y = 440`, `width = 40`, `height = 720` (Static, Restitution: 0.15, Friction: 0.2).
- **Bottom Floor**: `x = 240`, `y = 780`, `width = 480`, `height = 40` (Static, Restitution: 0.2, Friction: 0.6).
- **Playable Width**: $445 - 35 = 410\text{px}$.
- **Container Bottom**: $Y = 760$.

### Fruit Rigid Bodies
Every fruit is represented as a 2D circular rigid body (`Matter.Bodies.circle`):
- **Restitution (Bounciness)**: `0.22` (prevents excessive jitter while maintaining energetic drops).
- **Friction**: `0.35` (encourages natural rolling over neighbor fruit curves).
- **Air Friction (`frictionAir`)**: `0.012` (subtle aerodynamic dampening).
- **Mass / Density**: Dynamically scaled by tier:
  $$\text{density}(t) = 0.0015 \times (1 + t \times 0.08)$$
  Larger fruits exert heavier downward pressure on smaller fruits underneath, preventing small fruits from unrealistically pushing giants out of the way.

### Merge Queue & Physics Post-Step Decoupling
To avoid mutating the Matter.js physics graph during active collision resolution (which causes Matter.js engine crashes and memory leaks), collision pairs are placed into `this.pendingMerges`. The bodies are flagged with `isMerging = true` immediately, and actual removal/spawning happens cleanly in the post-step phase before rendering.

---

## 4. Web Audio Synthesizer Frequency Table & Sound Architecture

Audio is synthesized dynamically via the native Web Audio API (`AudioContext`). No `.mp3` or `.ogg` sound files are downloaded.

### Master Audio Graph
```
[Oscillator Node(s)] ──► [Gain Node (Envelope ADSR)] ──► [Master Gain] ──► [AudioContext.destination]
```

### 1. Merge Pop Synthesizer (`playMerge(tier, combo)`)
- **Oscillator Type**: `sine` (warm, round, punchy pop tone).
- **Base Frequency Mapping**:
  $$\text{freq} = 220 \times 1.08^{(\text{tier} - 1)} \times (1 + \min(\text{combo} - 1, 8) \times 0.04)$$
  - Tier 1 (Cherry): $220.00\text{ Hz}$ (A3)
  - Tier 2 (Strawberry): $237.60\text{ Hz}$
  - Tier 3 (Grape): $256.60\text{ Hz}$ (Middle C range)
  - Tier 4 (Orange): $277.13\text{ Hz}$
  - Tier 5 (Persimmon): $299.30\text{ Hz}$
  - Tier 6 (Apple): $323.25\text{ Hz}$
  - Tier 7 (Pear): $349.11\text{ Hz}$
  - Tier 8 (Peach): $377.04\text{ Hz}$
  - Tier 9 (Pineapple): $407.20\text{ Hz}$
  - Tier 10 (Melon): $439.78\text{ Hz}$
  - Tier 11 (Watermelon): $474.96\text{ Hz}$
- **Pitch Ramp**: Upward frequency sweep over 40ms ($f \to 1.55f$) followed by sharp exponential decay over 140ms.
- **Second Harmonic**: A subtle overtone at $2.25 \times \text{freq}$ with `triangle` wave produces the wooden "pop" resonance.

### 2. Fruit Drop Tone (`playDrop()`)
- Soft blip: $180\text{ Hz} \to 90\text{ Hz}$ exponential pitch drop over 60ms; peak gain `0.15`.

### 3. Danger Warning (`playDangerWarning()`)
- Throttled to 350ms intervals. Dual sine beeps at $880\text{ Hz}$ (A5) decaying in 80ms.

### 4. Game Over Chime (`playGameOver()`)
- Descending 4-note arpeggio chord: $[440, 370, 311, 220]\text{ Hz}$ spaced by 120ms intervals using warm `triangle` oscillators.

---

## 5. Event Lifecycles & State Transitions

```
[DOM Ready]
    │
    ▼
init() ──► PlatformSDK.init() ──► Ready / Standby
    │
    ▼
User Aims (PointerMove / TouchMove)
    │
    ▼
User Releases (PointerUp / TouchEnd)
    │
    ├─► PlatformSDK.gameplayStart() (first drop)
    ├─► Spawn Fruit Body in Matter.World
    └─► SoundManager.playDrop()
    │
    ▼
Fruit Collision Detected (collisionStart)
    │
    ├─► Bodies of Same Tier?
    │     ├── YES ──► Flag isMerging = true
    │     │           Enqueue into pendingMerges
    │     └── NO  ──► Standard physics bounce
    │
    ▼
processPendingMerges()
    ├─► Remove bodyA & bodyB
    ├─► Spawn new body at midpoint (tier + 1)
    ├─► Calculate score with combo multiplier
    ├─► Trigger particles & floating score text
    ├─► SoundManager.playMerge(nextTier, combo)
    └─► If tier == 11 or combo >= 5 ──► PlatformSDK.happyTime()
    │
    ▼
checkDangerAndGameOver()
    ├─► Settled fruit topY <= DANGER_Y?
    │     ├── YES ──► dangerTimer += dt (playDangerWarning)
    │     └── NO  ──► dangerTimer = max(0, dangerTimer - dt * 1.5)
    │
    └─► dangerTimer >= 3.0s?
          │
          ▼
    triggerGameOver()
          ├─► PlatformSDK.gameplayStop()
          ├─► SoundManager.playGameOver()
          ├─► PlatformSDK.requestInterstitialAd()
          └─► Display Game Over Modal
                │
                ├── [PLAY AGAIN] ──► restart()
                │                     ├── Clear fruits
                │                     └── Reset score/danger
                │
                └── [REVIVE (WATCH AD)] ──► PlatformSDK.requestRewardedAd()
                                             ├── On Success: Vaporize top fruits, reset danger, resume
                                             └── On Dismiss: Return to Game Over modal
```

---

## 6. Responsive Scaling & Safe Area Inset Management

The game uses a flexbox wrapper with CSS `max-width`, `max-height`, and `aspect-ratio: 480 / 800`:

```css
#game-wrapper {
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 100%;
  max-height: 800px;
  aspect-ratio: 480 / 800;
  display: flex;
  flex-direction: column;
}
```

### Canvas Coordinate Mapping
When converting mouse or touch screen coordinates to virtual physics coordinates, canvas bounding rect normalization is applied:

$$\text{virtualX} = (\text{clientX} - \text{rect.left}) \times \left(\frac{\text{canvas.width}}{\text{rect.width}}\right)$$

This guarantees 1:1 precision whether playing on an iPhone 15 Pro, a Samsung Galaxy tablet, an ultra-wide desktop monitor, or inside an iframe on CrazyGames/Poki.
