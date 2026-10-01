import sys, os, math, random, subprocess
from PIL import Image, ImageDraw, ImageFont

# Dimensions
LANDSCAPE_W, LANDSCAPE_H = 1920, 1080
PORTRAIT_W, PORTRAIT_H = 800, 1200
FPS = 30
DURATION_SEC = 8
TOTAL_FRAMES = FPS * DURATION_SEC

# Fruit definitions
FRUITS = [
    {"name": "Cherry", "r": 20, "color": (231, 76, 60), "points": 2},
    {"name": "Strawberry", "r": 28, "color": (255, 94, 126), "points": 4},
    {"name": "Grape", "r": 36, "color": (165, 94, 234), "points": 8},
    {"name": "Orange", "r": 48, "color": (250, 130, 49), "points": 16},
    {"name": "Persimmon", "r": 60, "color": (235, 59, 90), "points": 32},
    {"name": "Apple", "r": 72, "color": (32, 191, 107), "points": 64},
    {"name": "Pear", "r": 85, "color": (247, 183, 49), "points": 128},
    {"name": "Peach", "r": 100, "color": (253, 150, 68), "points": 256},
    {"name": "Pineapple", "r": 115, "color": (241, 196, 15), "points": 512},
    {"name": "Melon", "r": 135, "color": (38, 222, 129), "points": 1024},
    {"name": "Watermelon", "r": 160, "color": (46, 213, 115), "points": 2048}
]

def draw_fruit(draw, cx, cy, tier, scale=1.0, squish_x=1.0, squish_y=1.0):
    t_idx = min(tier, len(FRUITS) - 1)
    f_info = FRUITS[t_idx]
    r = int(f_info["r"] * scale)
    rx = int(r * squish_x)
    ry = int(r * squish_y)
    color = f_info["color"]

    # Shadow
    draw.ellipse([cx - rx, cy - ry + 4, cx + rx, cy + ry + 4], fill=(10, 12, 18, 120))
    # Main Body
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color, outline=(255, 255, 255, 180), width=2)

    # Watermelon stripes if tier == 10
    if t_idx == 10:
        for angle in range(-60, 70, 30):
            sx = cx + int(rx * 0.7 * math.sin(math.radians(angle)))
            draw.arc([sx - rx*0.3, cy - ry + 10, sx + rx*0.3, cy + ry - 10], 0, 360, fill=(20, 120, 60), width=6)

    # Highlight (3D Specular)
    hl_rx = max(3, int(rx * 0.35))
    hl_ry = max(2, int(ry * 0.25))
    draw.ellipse([cx - int(rx * 0.45) - hl_rx, cy - int(ry * 0.45) - hl_ry,
                  cx - int(rx * 0.45) + hl_rx, cy - int(ry * 0.45) + hl_ry],
                 fill=(255, 255, 255, 200))

    # Kawaii Face (Blinking or smiling)
    eye_r = max(2, int(r * 0.1))
    eye_offset_x = int(rx * 0.3)
    eye_y = cy - int(ry * 0.05)

    # Eyes
    draw.ellipse([cx - eye_offset_x - eye_r, eye_y - eye_r, cx - eye_offset_x + eye_r, eye_y + eye_r], fill=(20, 20, 20))
    draw.ellipse([cx + eye_offset_x - eye_r, eye_y - eye_r, cx + eye_offset_x + eye_r, eye_y + eye_r], fill=(20, 20, 20))
    # Eye shine
    draw.ellipse([cx - eye_offset_x - eye_r//2, eye_y - eye_r//2, cx - eye_offset_x, eye_y], fill=(255, 255, 255))
    draw.ellipse([cx + eye_offset_x - eye_r//2, eye_y - eye_r//2, cx + eye_offset_x, eye_y], fill=(255, 255, 255))

    # Blush Cheeks
    blush_r = max(3, int(r * 0.14))
    draw.ellipse([cx - eye_offset_x - blush_r - 2, eye_y + eye_r + 2, cx - eye_offset_x + blush_r - 2, eye_y + eye_r + 2 + blush_r], fill=(255, 100, 120, 150))
    draw.ellipse([cx + eye_offset_x - blush_r + 2, eye_y + eye_r + 2, cx + eye_offset_x + blush_r + 2, eye_y + eye_r + 2 + blush_r], fill=(255, 100, 120, 150))

    # Happy Mouth
    draw.arc([cx - int(rx * 0.15), cy + int(ry * 0.05), cx + int(rx * 0.15), cy + int(ry * 0.25)], 0, 180, fill=(20, 20, 20), width=2)


def generate_frames_generator(is_portrait=False):
    W = PORTRAIT_W if is_portrait else LANDSCAPE_W
    H = PORTRAIT_H if is_portrait else LANDSCAPE_H

    # Box bounds
    if is_portrait:
        box_left = 60
        box_right = W - 60
        box_top = 180
        box_bottom = H - 120
    else:
        # Centered arcade cabinet in landscape
        box_w = 540
        box_left = (W - box_w) // 2
        box_right = box_left + box_w
        box_top = 150
        box_bottom = H - 120

    # Physics simulation state
    fruits_on_field = []
    particles = []
    floating_texts = []
    score = 0
    combo = 1

    # Keyframe timeline
    # Frame 0-25: Cherry 1 drops at left
    # Frame 30-55: Cherry 2 drops at left -> MERGE -> Strawberry! (F55)
    # Frame 60-85: Strawberry 2 drops -> MERGE -> Grape! (F85)
    # Frame 95-125: Grape 2 drops -> MERGE -> Orange! (F125)
    # Frame 135-165: Orange 2 drops -> MERGE -> Persimmon! (F165)
    # Frame 175-210: Big drop -> COMBO CHAIN -> WATERMELON! (F210)

    drops = [
        {"start_f": 5, "tier": 0, "x": box_left + 160},
        {"start_f": 35, "tier": 0, "x": box_left + 160},  # merges with cherry 1
        {"start_f": 65, "tier": 1, "x": box_left + 175},  # drops onto strawberry
        {"start_f": 100, "tier": 2, "x": box_left + 220}, # drops onto grape
        {"start_f": 140, "tier": 3, "x": box_left + 260},
        {"start_f": 175, "tier": 9, "x": box_left + 270}, # giant melon drop
    ]

    for f in range(TOTAL_FRAMES):
        # Create base canvas with dark gradient
        img = Image.new("RGB", (W, H), (13, 17, 23))
        draw = ImageDraw.Draw(img, "RGBA")

        # Background subtle ambient glow
        center_x = (box_left + box_right) // 2
        for rad, alpha in [(400, 15), (250, 25), (150, 35)]:
            draw.ellipse([center_x - rad, H//2 - rad, center_x + rad, H//2 + rad], fill=(80, 50, 150, alpha))

        # Header Titles & Scores
        if not is_portrait:
            # Side panels in landscape
            draw.text((120, 220), "SUIKA", fill=(255, 94, 87), font_size=56)
            draw.text((120, 285), "MERGE DROP", fill=(180, 190, 205), font_size=28)
            draw.text((120, 380), "CRAZYGAMES", fill=(165, 94, 234), font_size=24)
            draw.text((120, 420), "OFFICIAL PREVIEW", fill=(100, 110, 130), font_size=20)

            # High Score & Stats
            draw.rounded_rectangle([120, 500, 400, 620], radius=16, fill=(22, 27, 34, 200), outline=(50, 60, 80))
            draw.text((145, 520), "CURRENT SCORE", fill=(130, 140, 160), font_size=18)
            draw.text((145, 550), f"{score:05d}", fill=(255, 211, 42), font_size=44)

            draw.rounded_rectangle([120, 640, 400, 760], radius=16, fill=(22, 27, 34, 200), outline=(50, 60, 80))
            draw.text((145, 660), "COMBO STREAK", fill=(130, 140, 160), font_size=18)
            draw.text((145, 690), f"x{combo} MULTIPLIER", fill=(46, 213, 115), font_size=32)

            # Right Side Evolution Showcase
            draw.text((W - 400, 220), "FRUIT TIERS", fill=(240, 240, 245), font_size=32)
            for i, fruit in enumerate(FRUITS[:6]):
                ey = 280 + i * 75
                draw.ellipse([W - 380, ey, W - 380 + 40, ey + 40], fill=fruit["color"])
                draw.text((W - 320, ey + 8), f"{i+1}. {fruit['name']}", fill=(220, 225, 235), font_size=22)

        # Draw Playfield Glass Box
        draw.rounded_rectangle([box_left, box_top, box_right, box_bottom], radius=24,
                               fill=(18, 22, 32, 180), outline=(70, 85, 120), width=4)

        # Top Danger Warning Dashed Line
        danger_y = box_top + 90
        for dx in range(box_left + 15, box_right - 15, 20):
            draw.line([(dx, danger_y), (dx + 10, danger_y)], fill=(255, 71, 87, 180), width=2)
        draw.text((box_left + 20, danger_y - 22), "WARNING LINE", fill=(255, 71, 87, 200), font_size=14)

        # Check Active Drops
        for d in drops:
            sf = d["start_f"]
            if sf <= f < sf + 20: # Falling animation (20 frames)
                progress = (f - sf) / 20.0
                curr_y = box_top + 20 + (box_bottom - box_top - 60) * (progress ** 2)
                curr_x = d["x"]

                # Aim Guide Line
                if progress < 0.3:
                    for gy in range(box_top + 10, int(curr_y), 15):
                        draw.line([(curr_x, gy), (curr_x, gy + 8)], fill=(255, 255, 255, 100), width=2)

                draw_fruit(draw, int(curr_x), int(curr_y), d["tier"])

            elif f == sf + 20: # Landed & Merge Trigger
                target_tier = d["tier"]
                target_x = d["x"]
                target_y = box_bottom - FRUITS[target_tier]["r"] - 10

                # Check merge with existing fruit
                merged = False
                for existing in fruits_on_field:
                    if existing["tier"] == target_tier and abs(existing["x"] - target_x) < 80:
                        # TRIGGER MERGE!
                        fruits_on_field.remove(existing)
                        new_tier = target_tier + 1
                        mid_x = (existing["x"] + target_x) // 2
                        mid_y = min(existing["y"], target_y)
                        fruits_on_field.append({"tier": new_tier, "x": mid_x, "y": mid_y, "squish": 1.4, "born": f})

                        # Points & Combo
                        combo += 1
                        pts = FRUITS[new_tier]["points"] * combo
                        score += pts

                        # Confetti Particles
                        for _ in range(35):
                            particles.append({
                                "x": mid_x, "y": mid_y,
                                "vx": random.uniform(-8, 8),
                                "vy": random.uniform(-10, -2),
                                "color": FRUITS[new_tier]["color"],
                                "size": random.randint(4, 9),
                                "life": 25
                            })

                        # Floating Text
                        floating_texts.append({
                            "text": f"MERGE! +{pts}",
                            "x": mid_x - 40, "y": mid_y - 30,
                            "life": 28, "color": (255, 220, 50)
                        })

                        merged = True
                        break

                if not merged:
                    fruits_on_field.append({"tier": target_tier, "x": target_x, "y": target_y, "squish": 1.0, "born": f})

        # Draw fruits on field
        for fruit in fruits_on_field:
            age = f - fruit.get("born", f)
            squish = 1.0
            if age < 8:
                squish = 1.0 + 0.3 * math.sin(age * math.pi / 4)
            draw_fruit(draw, fruit["x"], fruit["y"], fruit["tier"], squish_x=squish, squish_y=2.0-squish)

        # Update & Draw Particles
        for p in list(particles):
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            p["vy"] += 0.5 # gravity
            p["life"] -= 1
            if p["life"] <= 0:
                particles.remove(p)
            else:
                alpha = int(255 * (p["life"] / 25))
                c = p["color"] + (alpha,)
                draw.ellipse([p["x"]-p["size"], p["y"]-p["size"], p["x"]+p["size"], p["y"]+p["size"]], fill=c)

        # Update & Draw Floating Texts
        for ft in list(floating_texts):
            ft["y"] -= 1.8
            ft["life"] -= 1
            if ft["life"] <= 0:
                floating_texts.remove(ft)
            else:
                alpha = int(255 * (ft["life"] / 28))
                draw.text((ft["x"], ft["y"]), ft["text"], fill=ft["color"] + (alpha,), font_size=26)

        # Watermelon celebratory banner on last seconds
        if f > 200:
            banner_y = box_top + 140
            draw.rounded_rectangle([box_left + 20, banner_y, box_right - 20, banner_y + 80], radius=16,
                                   fill=(46, 213, 115, 230), outline=(255, 255, 255), width=3)
            draw.text((box_left + 60, banner_y + 20), "WATERMELON UNLOCKED! ★", fill=(10, 20, 15), font_size=28)

        # Bottom Fruit Evolution Bar
        guide_y = box_bottom + 25
        draw.rounded_rectangle([box_left, guide_y, box_right, guide_y + 40], radius=12, fill=(22, 27, 34))
        for idx, frt in enumerate(FRUITS):
            gx = box_left + 20 + idx * ((box_right - box_left - 40) // 10)
            gr = 10 + idx
            draw.ellipse([gx - gr//2, guide_y + 20 - gr//2, gx + gr//2, guide_y + 20 + gr//2], fill=frt["color"])

        yield img

def render_video(out_path, is_portrait=False):
    W = PORTRAIT_W if is_portrait else LANDSCAPE_W
    H = PORTRAIT_H if is_portrait else LANDSCAPE_H

    ffmpeg_bin = r"C:\Users\GOLDEN LAP\AppData\Local\hermes\tools\ffmpeg-9.0.1-win32-x64\bin\ffmpeg.exe"

    cmd = [
        ffmpeg_bin, "-y",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "20",
        "-movflags", "+faststart",
        out_path
    ]

    print(f"Rendering {'PORTRAIT' if is_portrait else 'LANDSCAPE'} video ({W}x{H}) to: {out_path}")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    frame_count = 0
    for frame_img in generate_frames_generator(is_portrait=is_portrait):
        raw_bytes = frame_img.tobytes("raw", "RGB")
        proc.stdin.write(raw_bytes)
        frame_count += 1

    proc.stdin.close()
    proc.wait()
    print(f"Finished encoding {frame_count} frames to {out_path} (Exit code: {proc.returncode})")

if __name__ == "__main__":
    out_dir = r"C:\Projects\suika-game-playable\dist\assets"
    os.makedirs(out_dir, exist_ok=True)

    landscape_path = os.path.join(out_dir, "preview_landscape.mp4")
    portrait_path = os.path.join(out_dir, "preview_portrait.mp4")

    render_video(landscape_path, is_portrait=False)
    render_video(portrait_path, is_portrait=True)
    print("ALL VIDEOS SUCCESSFULLY GENERATED!")
