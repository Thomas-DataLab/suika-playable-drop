import os, math
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"C:\Projects\suika-game-playable\dist\assets"
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1280, 720

FRUITS = [
    {"name": "Cherry", "r": 28, "color": (231, 76, 60), "pts": "+2"},
    {"name": "Strawberry", "r": 34, "color": (255, 94, 126), "pts": "+4"},
    {"name": "Grape", "r": 42, "color": (165, 94, 234), "pts": "+8"},
    {"name": "Orange", "r": 50, "color": (250, 130, 49), "pts": "+16"},
    {"name": "Persimmon", "r": 58, "color": (235, 59, 90), "pts": "+32"},
    {"name": "Apple", "r": 66, "color": (32, 191, 107), "pts": "+64"},
    {"name": "Pear", "r": 76, "color": (247, 183, 49), "pts": "+128"},
    {"name": "Peach", "r": 86, "color": (253, 150, 68), "pts": "+256"},
    {"name": "Pineapple", "r": 96, "color": (241, 196, 15), "pts": "+512"},
    {"name": "Melon", "r": 110, "color": (38, 222, 129), "pts": "+1024"},
    {"name": "Watermelon", "r": 130, "color": (46, 213, 115), "pts": "+2048"}
]

def draw_fruit(draw, cx, cy, fruit, scale=1.0):
    r = int(fruit["r"] * scale)
    color = fruit["color"]
    draw.ellipse([cx - r, cy - r + 3, cx + r, cy + r + 3], fill=(10, 15, 25, 120))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=(255, 255, 255, 220), width=3)
    if fruit["name"] == "Watermelon":
        for a in [-45, 0, 45]:
            sx = cx + int(r * 0.6 * math.sin(math.radians(a)))
            draw.arc([sx - r*0.3, cy - r + 8, sx + r*0.3, cy + r - 8], 0, 360, fill=(20, 120, 60), width=6)
    hl = max(4, int(r * 0.3))
    draw.ellipse([cx - int(r*0.4) - hl, cy - int(r*0.4) - hl//2, cx - int(r*0.4) + hl, cy - int(r*0.4) + hl//2], fill=(255, 255, 255, 210))
    er = max(2, int(r * 0.1))
    ox = int(r * 0.3)
    ey = cy - int(r * 0.05)
    draw.ellipse([cx - ox - er, ey - er, cx - ox + er, ey + er], fill=(20, 20, 20))
    draw.ellipse([cx + ox - er, ey - er, cx + ox + er, ey + er], fill=(20, 20, 20))
    draw.arc([cx - int(r*0.16), cy + int(r*0.06), cx + int(r*0.16), cy + int(r*0.28)], 0, 180, fill=(20, 20, 20), width=2)

# --- CREATIVE 1: FEATURE SHOWCASE (PILLARS) ---
def make_creative_1():
    img = Image.new("RGB", (W, H), (13, 17, 23))
    draw = ImageDraw.Draw(img, "RGBA")
    
    # Ambient Glow
    draw.ellipse([W//2 - 350, 100, W//2 + 350, 800], fill=(70, 40, 140, 40))
    
    # Header
    draw.text((W//2 - 360, 40), "SUIKA MERGE DROP", fill=(255, 94, 87), font_size=52)
    draw.text((W//2 - 280, 105), "COMPLETE COMMERCIAL HTML5 ASSET", fill=(140, 150, 175), font_size=24)

    # 4 Pillar Cards
    cards = [
        {"title": "UNIVERSAL AD SDK", "sub": "CrazyGames v3, Poki v2 & YouTube Playables pre-integrated.", "color": (165, 94, 234)},
        {"title": "100% WEB AUDIO API", "sub": "Zero MP3 files. Real-time procedural sound synthesizer.", "color": (255, 107, 129)},
        {"title": "MATTER.JS 2D PHYSICS", "sub": "Butter-smooth 60+ FPS circle bounciness & squash-stretch.", "color": (46, 213, 115)},
        {"title": "ANDROID APK READY", "sub": "Capacitor 6 config + automated GitHub Actions CI workflow.", "color": (255, 165, 2)}
    ]

    for i, c in enumerate(cards):
        cx = 80 + (i % 2) * 580
        cy = 180 + (i // 2) * 230
        draw.rounded_rectangle([cx, cy, cx + 540, cy + 200], radius=20, fill=(22, 27, 34, 220), outline=c["color"], width=2)
        draw.ellipse([cx + 30, cy + 30, cx + 70, cy + 70], fill=c["color"])
        draw.text((cx + 90, cy + 36), c["title"], fill=c["color"], font_size=28)
        draw.text((cx + 40, cy + 95), c["sub"], fill=(200, 210, 225), font_size=20)
        draw.text((cx + 40, cy + 140), "✓ Verified & Production Ready", fill=(120, 130, 150), font_size=16)

    # Footer
    draw.text((W//2 - 210, 665), "100% VANILLA JS • NO FRAMEWORK BLOAT", fill=(100, 110, 130), font_size=18)
    img.save(os.path.join(OUT_DIR, "screenshot_01_features.png"))
    print("Saved screenshot_01_features.png")

# --- CREATIVE 2: 11 FRUITS EVOLUTION MATRIX ---
def make_creative_2():
    img = Image.new("RGB", (W, H), (13, 17, 23))
    draw = ImageDraw.Draw(img, "RGBA")

    # Header
    draw.text((W//2 - 380, 35), "11 KAWAII FRUIT EVOLUTION TIERS", fill=(255, 211, 42), font_size=46)
    draw.text((W//2 - 260, 95), "SATISFYING PHYSICS & COMBO MULTIPLIER", fill=(150, 160, 185), font_size=22)

    # 2 Rows of Fruits
    row1 = FRUITS[:6]
    row2 = FRUITS[6:]

    for i, f in enumerate(row1):
        cx = 120 + i * 205
        cy = 230
        draw_fruit(draw, cx, cy, f, scale=0.85)
        draw.text((cx - 30, cy + 70), f["name"], fill=(240, 240, 245), font_size=20)
        draw.text((cx - 15, cy + 95), f["pts"], fill=(255, 211, 42), font_size=18)
        if i < len(row1) - 1:
            draw.text((cx + 80, cy - 10), "➔", fill=(100, 110, 130), font_size=26)

    for i, f in enumerate(row2):
        cx = 140 + i * 215
        cy = 470
        draw_fruit(draw, cx, cy, f, scale=0.75)
        draw.text((cx - 35, cy + 95), f["name"], fill=(240, 240, 245), font_size=20)
        draw.text((cx - 20, cy + 120), f["pts"], fill=(46, 213, 115), font_size=18)
        if i < len(row2) - 1:
            draw.text((cx + 85, cy - 10), "➔", fill=(100, 110, 130), font_size=26)

    # Footer Highlight
    draw.rounded_rectangle([W//2 - 250, 640, W//2 + 250, 690], radius=12, fill=(46, 213, 115, 40), outline=(46, 213, 115), width=1)
    draw.text((W//2 - 210, 652), "★ MERGE TWIN FRUITS TO SPAWN THE WATERMELON! ★", fill=(46, 213, 115), font_size=16)

    img.save(os.path.join(OUT_DIR, "screenshot_02_evolution.png"))
    print("Saved screenshot_02_evolution.png")

# --- CREATIVE 3: RESPONSIVE & MOBILE SHOWCASE ---
def make_creative_3():
    img = Image.new("RGB", (W, H), (13, 17, 23))
    draw = ImageDraw.Draw(img, "RGBA")

    # Header
    draw.text((80, 50), "MULTI-DEVICE RESPONSIVE", fill=(46, 213, 115), font_size=48)
    draw.text((80, 115), "PLAYS SMOOTHLY ON PHONES, TABLETS & DESKTOPS", fill=(140, 150, 175), font_size=24)

    # Left: Smartphone Frame Mockup
    phone_x, phone_y = 100, 180
    phone_w, phone_h = 270, 480
    draw.rounded_rectangle([phone_x, phone_y, phone_x + phone_w, phone_y + phone_h], radius=28, fill=(22, 27, 34), outline=(80, 95, 120), width=3)
    # Notch
    draw.rounded_rectangle([phone_x + 80, phone_y + 8, phone_x + phone_w - 80, phone_y + 20], radius=6, fill=(10, 12, 16))
    # Phone Screen
    draw.rounded_rectangle([phone_x + 12, phone_y + 26, phone_x + phone_w - 12, phone_y + phone_h - 16], radius=16, fill=(15, 20, 28))
    # In-game elements on phone
    draw.text((phone_x + 25, phone_y + 40), "SUIKA DROP", fill=(255, 94, 87), font_size=16)
    draw_fruit(draw, phone_x + 135, phone_y + 250, FRUITS[10], scale=0.45)
    draw_fruit(draw, phone_x + 80, phone_y + 360, FRUITS[7], scale=0.4)
    draw_fruit(draw, phone_x + 190, phone_y + 370, FRUITS[5], scale=0.35)

    # Right: Feature List
    fx = 460
    draw.text((fx, 200), "BUILT FOR GLOBAL COMMERCIAL PUBLISHING", fill=(240, 245, 255), font_size=32)

    bullets = [
        ("📱 Mobile Touch Optimized", "Native pointer and touch gesture listeners with zero input lag."),
        ("🖥️ Desktop Fullscreen & Canvas Scale", "Auto-resizing viewport fits 1080p, 2K and 4K widescreen seamlessly."),
        ("🌐 100% Offline Capable", "Runs standalone without active internet connection or external servers."),
        ("🛠️ 5-Minute Reskin System", "Easily customize textures, colors, fruit radii and gravity in pure code."),
        ("📦 Ready Bundles Included", "Pre-built ZIP archives for CrazyGames, Poki, and Capacitor Android.")
    ]

    for i, (b_title, b_desc) in enumerate(bullets):
        by = 270 + i * 85
        draw.text((fx, by), b_title, fill=(255, 211, 42), font_size=22)
        draw.text((fx, by + 28), b_desc, fill=(180, 190, 205), font_size=17)

    img.save(os.path.join(OUT_DIR, "screenshot_03_devices.png"))
    print("Saved screenshot_03_devices.png")

if __name__ == "__main__":
    make_creative_1()
    make_creative_2()
    make_creative_3()
    print("ALL SHOWCASE CREATIVES GENERATED SUCCESSFULLY!")
