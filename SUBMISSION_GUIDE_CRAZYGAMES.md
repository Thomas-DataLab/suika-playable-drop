# CrazyGames Publishing & Submission Guide: Suika Merge Drop

This guide provides step-by-step instructions and exact metadata for submitting **Suika Merge Drop** to the [CrazyGames Developer Portal](https://developer.crazygames.com/).

---

## 1. Submission Overview & Pre-requisites

- **Platform URL**: [https://developer.crazygames.com/](https://developer.crazygames.com/)
- **Target SDK**: CrazyGames SDK v3 (included automatically via mediation in `dist/crazygames/index.html`)
- **Format**: HTML5 ZIP Archive (`dist/crazygames.zip`)
- **Aspect Ratio**: Portrait (9:16 or responsive vertical 480x800)
- **Audio Context**: Automatically managed (mutes on commercial break, resumes after)
- **Monetization**: Midgame Interstitial (`midgame`) + Rewarded Ad (`rewarded`) for Revive mechanic.

---

## 2. Exact Submission Metadata Fields

| Form Field | Value / Content |
| :--- | :--- |
| **Game Title** | `Suika Merge Drop` |
| **Game Subtitle / Tagline** | `Drop, merge kawaii fruits, and aim for the ultimate Watermelon!` |
| **Category / Genre** | `Puzzle` (Secondary: `Casual`, `Arcade`) |
| **Tags** | `physics`, `merge`, `suika`, `fruits`, `match`, `kawaii`, `watermelon`, `endless`, `high-score`, `relaxing` |
| **Game Orientation** | `Portrait` |
| **Screen Dimensions** | Recommended: `480 x 800` (Game auto-scales dynamically to any screen) |
| **Supported Devices** | Desktop (Mouse / Trackpad), Mobile (Touch), Tablet (Touch) |
| **Multiplayer** | No (Single Player) |
| **Primary Language** | English (`en`) |
| **Rating / Age Recommendation** | `PEGI 3` / `Everyone` (Family friendly, no violence) |

---

## 3. Short & Long Descriptions

### Short Description (Max 150 chars)
> Drop and merge colorful fruits in this juicy physics puzzle! Combine twin fruits, trigger satisfying combos, and discover the giant Watermelon!

### Long Description
```markdown
Suika Merge Drop is a delightful physics-based fruit drop and merge puzzle game inspired by the viral Suika phenomenon!

Carefully aim your fruit dropper, release juicy kawaii fruits into the jar, and watch them roll, bounce, and fuse together. When two identical fruits touch, they pop and merge into a bigger, juicier fruit—all the way up to the legendary Watermelon!

Features:
- Satisfying Physics: Realistic circle physics and bouncy collisions powered by Matter.js.
- 11 Juicy Fruit Tiers: From tiny Cherries and sweet Strawberries to Pineapples, Melons, and giant Watermelons.
- Dynamic Combo Multiplier: Rapid merges trigger exciting combo point multipliers and vibrant particle bursts.
- Tension-Packed Danger Line: Watch out for the top danger line! Keep fruits from overflowing or face the countdown.
- Rewarded Revive System: Watch a quick ad to vaporize top fruits and keep your high-score run going!
- Procedural Audio: Rich synthesizer audio built directly in Web Audio API. Zero external audio lag.
- Play Anywhere: Fully responsive across desktop browsers, smartphones, and tablets.

Can you master the dropper and claim the highest score on the leaderboard?
```

### Controls Description
```markdown
- Aim: Move mouse cursor or drag finger across the screen.
- Drop Fruit: Click left mouse button or release touch.
- Sound Toggle: Click the speaker button in the top right corner.
- Revive: Click the Revive button on game over to clear overflowing fruits.
```

---

## 4. CrazyGames SDK Integration Details

The build package in `dist/crazygames/` already includes:
1. CrazyGames SDK v3 script tag in `<head>`:
   ```html
   <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
   ```
2. Universal mediation via `src/platform-sdk.js`:
   - `CrazyGames.SDK.init()` called on page load.
   - `CrazyGames.SDK.game.loadingStop()` triggered once canvas and assets are initialized.
   - `CrazyGames.SDK.game.gameplayStart()` called on fruit drop.
   - `CrazyGames.SDK.game.gameplayStop()` called on game over / revive prompt.
   - `CrazyGames.SDK.game.happytime()` triggered when creating Watermelon or hitting 5x combos.
   - `CrazyGames.SDK.ad.requestAd("midgame")` on game over.
   - `CrazyGames.SDK.ad.requestAd("rewarded")` on Revive button click.

---

## 5. Step-by-Step Submission Instructions

1. **Build Distribution Package**:
   Run the automated build script:
   ```bash
   node scripts/package-all.js
   ```
   This generates `dist/crazygames.zip`.

2. **Verify Zip Contents**:
   Ensure `index.html` is at the root of `dist/crazygames.zip` (no wrapping root folder).

3. **Log In to Developer Portal**:
   Navigate to [developer.crazygames.com](https://developer.crazygames.com/) and click **Submit a Game**.

4. **Fill In Metadata**:
   Paste title, descriptions, tags, and category from Section 2 & 3 above.

5. **Upload Game File**:
   Select and upload `dist/crazygames.zip`.

6. **Upload Visual Assets**:
   - Icon: `512 x 512 px` (PNG)
   - Cover / Banner: `1920 x 1080 px` (16:9 PNG)
   - Gameplay Screenshots: 3-5 screenshots showing aiming, merge popping, and watermelon creation.

7. **Test in CrazyGames Sandbox / QA Preview**:
   - Verify ads trigger without errors.
   - Check that `gameplayStart` and `gameplayStop` logs appear in console.
   - Ensure audio stops when ads display.

8. **Submit for Review**:
   Click **Submit**. CrazyGames QA typically reviews and approves submissions within 2–5 business days.
