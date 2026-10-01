# 5-Minute Reskin & Customization Guide: Suika Merge Drop

Welcome to the **Suika Merge Drop** customization manual! Whether you want to rebrand this game as a planet-merging simulator, a gem-stacking puzzle, a candy crusher, or an animal drop game, this guide walks you through every customization in under 5 minutes.

---

## 1. Changing Fruit Names, Colors, Sizes & Scores (in `src/fruits.js`)

All tier specifications are defined in the `FRUITS` array at the top of `src/fruits.js`:

```javascript
// src/fruits.js
const FRUITS = [
  {
    tier: 1,
    name: 'Cherry',          // Name shown in evolution guide
    radius: 16,              // Physics radius in pixels (determines physical size)
    color: '#e74c3c',        // Main body fill color
    accentColor: '#c0392b',  // Shadow/gradient accent color
    highlightColor: '#ff7675', // Specular sheen color
    points: 2                // Base points awarded on merge
  },
  // ... tiers 2 through 11
];
```

### Quick Recipe: Converting to a Planet Merge Theme
To reskin the fruits into celestial planets:
```javascript
const FRUITS = [
  { tier: 1,  name: 'Pluto',    radius: 14, color: '#bdc581', points: 2 },
  { tier: 2,  name: 'Moon',     radius: 18, color: '#dcdde1', points: 4 },
  { tier: 3,  name: 'Mercury',  radius: 24, color: '#8c7ae6', points: 8 },
  { tier: 4,  name: 'Mars',     radius: 32, color: '#e84118', points: 16 },
  { tier: 5,  name: 'Venus',    radius: 40, color: '#fbc531', points: 32 },
  { tier: 6,  name: 'Earth',    radius: 50, color: '#00a8ff', points: 64 },
  { tier: 7,  name: 'Neptune',  radius: 62, color: '#273c75', points: 128 },
  { tier: 8,  name: 'Uranus',   radius: 74, color: '#4cd137', points: 256 },
  { tier: 9,  name: 'Saturn',   radius: 88, color: '#f5cd79', points: 512 },
  { tier: 10, name: 'Jupiter',  radius: 102, color: '#e15f41', points: 1024 },
  { tier: 11, name: 'Sun',      radius: 120, color: '#f39c12', points: 2048 }
];
```

---

## 2. Using Custom PNG or WebP Images Instead of Procedural Canvas

If you have pre-rendered PNG, WebP, or SVG graphics, you can replace the procedural drawing routines with image sprites in 3 simple steps:

### Step 1: Preload your images in `src/fruits.js`
At the top of `src/fruits.js`:
```javascript
const fruitImages = [];
for (let i = 1; i <= 11; i++) {
  const img = new Image();
  img.src = `assets/sprites/tier_${i}.png`; // Put your PNG files here
  fruitImages[i] = img;
}
```

### Step 2: Update `drawFruit()` in `src/fruits.js`
Replace the procedural rendering code in `drawFruit()` with `ctx.drawImage`:
```javascript
function drawFruit(ctx, x, y, radius, tier, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const img = fruitImages[tier];
  if (img && img.complete && img.naturalWidth > 0) {
    // Draw centered image scaled to match the physical diameter
    const diameter = radius * 2;
    ctx.drawImage(img, -radius, -radius, diameter, diameter);
  } else {
    // Fallback: draw circle placeholder while image loads
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4757';
    ctx.fill();
  }

  ctx.restore();
}
```

---

## 3. Tuning Physics (Gravity, Bounciness & Friction)

All physics engine parameters are tuned inside `src/game.js`:

### Adjusting Gravity
Open `src/game.js` and locate `initPhysics()`:
```javascript
// Default: normal downward gravity
this.engine.world.gravity.y = 1.0; 

// Want a floaty, lunar moon gravity?
this.engine.world.gravity.y = 0.45;

// Want fast-paced arcade action?
this.engine.world.gravity.y = 1.4;
```

### Adjusting Bounciness & Friction
In `src/game.js`, locate `createFruitBody()`:
```javascript
const body = Matter.Bodies.circle(x, y, radius, {
  restitution: 0.22,  // Bounciness: 0.0 = clay/no bounce, 0.6 = bouncy rubber
  friction: 0.35,     // Surface friction: lower makes fruits slip and roll faster
  frictionAir: 0.012, // Air resistance
  density: 0.0015 * (1 + tier * 0.08) // Mass scaling
});
```

### Adjusting Drop Cooldown & Drop Tiers
At the top of `src/game.js`:
```javascript
const DROP_COOLDOWN_MS = 500; // Delay between consecutive drops in milliseconds
```
To change which tiers can be randomly dropped from the top, edit `getRandomDropTier()` in `src/game.js`:
```javascript
getRandomDropTier() {
  // Currently allows tiers 1 through 4 with weighted probabilities:
  const weights = [0.4, 0.3, 0.2, 0.1]; // Tier 1: 40%, Tier 2: 30%, Tier 3: 20%, Tier 4: 10%
  // ...
}
```

---

## 4. Customizing UI Themes & Colors (in `style.css`)

The entire interface uses centralized CSS custom properties at the top of `style.css`:

```css
:root {
  /* Background Canvas */
  --bg-gradient: radial-gradient(circle at 50% 20%, #1a1e29 0%, #0d1117 100%);
  
  /* Glassmorphic Panel Elements */
  --panel-bg: rgba(22, 27, 34, 0.85);
  --panel-border: rgba(255, 255, 255, 0.08);

  /* Highlight Accents */
  --accent-gold: #ffd32a;
  --accent-green: #2ed573;
  --accent-red: #ff4757;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### Changing to a Light / Pastel Theme:
```css
:root {
  --bg-gradient: linear-gradient(180deg, #fcedf2 0%, #e8f0fe 100%);
  --panel-bg: rgba(255, 255, 255, 0.88);
  --panel-border: rgba(0, 0, 0, 0.08);
  --text-primary: #2d3436;
  --text-dim: #636e72;
}
```

---

## 5. Summary Checklist for a Complete Reskin

1. [ ] Update fruit names and color hex codes in `src/fruits.js`.
2. [ ] (Optional) Add your sprite images to an `assets/` folder and link them in `drawFruit()`.
3. [ ] Customize header branding name and favicon in `index.html`.
4. [ ] Tune gravity or bounciness in `src/game.js` to match your theme's material feel.
5. [ ] Adjust CSS colors and font choices in `style.css`.
6. [ ] Run `node scripts/package-all.js` to build fresh distributions ready to publish!
