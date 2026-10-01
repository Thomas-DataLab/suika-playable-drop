# Poki Publishing & Submission Guide: Suika Merge Drop

This guide provides complete instructions and exact metadata for submitting **Suika Merge Drop** to [Poki for Developers](https://developers.poki.com/).

---

## 1. Platform Requirements & Overview

- **Portal URL**: [https://developers.poki.com/](https://developers.poki.com/)
- **SDK**: Poki SDK v2 (included in `dist/poki/index.html`)
- **Format**: Self-contained ZIP Archive (`dist/poki.zip`)
- **Orientation**: Portrait (Responsive scale: 480x800 base)
- **Audio Handling**: Poki requires all game audio to halt during commercial breaks. `PlatformSDK` handles this automatically via `SoundManager.setMuted()`.
- **Gameplay Lifecycle**: `gameplayStart()`, `gameplayStop()`, and `happyTime()` hooks are fully wired.

---

## 2. Submission Form Metadata

| Field | Content / Value |
| :--- | :--- |
| **Game Title** | `Suika Merge Drop` |
| **Tagline / Catchphrase** | `The juicy fruit-stacking puzzle where twin fruits fuse into giant watermelons!` |
| **Primary Category** | `Puzzle Games` |
| **Sub-Categories** | `Skill Games`, `Arcade Games`, `Brain Games` |
| **Keywords / Tags** | `suika`, `watermelon game`, `fruit merge`, `physics drop`, `match 2`, `kawaii`, `chain reaction`, `casual puzzle` |
| **Default Dimensions** | `480 x 800` (auto-responsive CSS and canvas) |
| **Orientation** | `Portrait` |
| **Target Audience** | All Ages (`PEGI 3`, `ESRB Everyone`) |
| **Controls** | Mouse Drag/Click, Mobile/Tablet Touch |
| **Languages Supported** | English (text-minimal design makes it globally accessible) |

---

## 3. Game Pitch & Descriptions

### Elevator Pitch (For Poki Editorial Team)
> Suika Merge Drop takes the viral fruit merge genre and elevates it with responsive high-framerate Matter.js physics, procedural Web Audio effects, dynamic combo scoring, and an ad-driven revive mechanic. Built with zero external asset dependencies, it loads instantaneously (< 250KB total footprint) and plays flawlessly on any screen.

### Player-Facing Description
```markdown
Drop, match, and merge your way to the giant Watermelon in Suika Merge Drop!

Drop adorable kawaii fruits into the glass container. When two fruits of the same kind bump into each other, they merge with an explosive pop into the next tier of fruit! Start with tiny cherries and work your way up through strawberries, grapes, persimmons, and pineapples until you reach the mighty Watermelon.

Watch the danger line at the top! If your fruits pile up too high and sit in the danger zone for more than 3 seconds, it's game over. Rack up rapid merges to build combo multipliers and set records on the personal leaderboard.

How high can you score before the jar overflows?
```

### How to Play / Controls
```markdown
- Aim: Drag mouse or finger left and right to line up your drop.
- Release: Let go of mouse button or finger to drop the fruit.
- Merge: Match identical fruits together to evolve them into bigger fruits.
- Revive: When close to losing, watch a short video to vaporize overflowing fruits and keep playing!
```

---

## 4. Poki SDK Integration Checklist

The bundle generated in `dist/poki/` fulfills all Poki QA criteria:

1. **SDK Script Inclusion**:
   ```html
   <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
   ```
2. **Initialization & Loading**:
   - `PokiSDK.init()` is executed immediately.
   - `PokiSDK.gameLoadingFinished()` called as soon as the physics engine, UI, and canvas are mounted.
3. **Gameplay Lifecycle**:
   - `PokiSDK.gameplayStart()` called on the first fruit drop or upon continuing a round.
   - `PokiSDK.gameplayStop()` called when game over occurs or when the user enters an ad break.
4. **Celebrations (Happy Time)**:
   - `PokiSDK.happyTime(1.0)` called upon creating the ultimate Watermelon (tier 11).
   - `PokiSDK.happyTime(0.8)` called upon achieving a 5x or higher combo streak.
5. **Commercial Breaks (Interstitial)**:
   - `PokiSDK.commercialBreak()` called safely on game over with audio automatically muted during playback.
6. **Rewarded Breaks**:
   - `PokiSDK.rewardedBreak()` invoked when clicking "REVIVE (WATCH AD)" on the Game Over screen. Upon success, top fruits are cleared and gameplay resumes seamlessly.

---

## 5. Step-by-Step Submission Instructions

1. **Generate Poki Distribution Package**:
   ```bash
   node scripts/package-all.js
   ```
   This creates `dist/poki.zip` (with `index.html` at the zip root).

2. **Test with Poki Inspector (Local Test)**:
   - Host `dist/poki/` locally or run `npx serve dist/poki`.
   - Open browser developer tools to verify PokiSDK logs:
     - `[PlatformSDK] Initializing platform: poki`
     - `[PlatformSDK] gameplayStart() triggered.`
     - `[PlatformSDK] Poki commercial break finished.`

3. **Log in to Poki for Developers**:
   - Go to [https://developers.poki.com/](https://developers.poki.com/).
   - Click **Add Game** / **Submit Game**.

4. **Upload ZIP**:
   - Upload `dist/poki.zip`.

5. **Upload Artwork**:
   - Square Icon: `512 x 512 px` PNG.
   - Thumbnail: `800 x 600 px` PNG.
   - Promotional Banner: `1920 x 1080 px` PNG.

6. **Submit for Review**:
   - Submit your build to Poki Review. Poki typically evaluates game playability, retention, and SDK compliance within 5–7 working days.
