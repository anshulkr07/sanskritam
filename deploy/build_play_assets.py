"""Build the final Sanskritam Play Store asset set from Concept B (aurora + voice).

Outputs into deploy/:
  play-store-icon-512.png          512x512  Play Console app icon
  adaptive-icon-foreground-432.png glyph on transparent (safe-zone sized)
  adaptive-icon-background-432.png full-bleed gradient
  adaptive-icon-monochrome-432.png single-tone glyph on transparent
  feature-graphic-1024x500.png     Play Console feature graphic
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

DEPLOY = r"C:\Users\AnshulKumar\PycharmProjects\sanskrit\deploy"
CONCEPT_B = r"C:\Users\AnshulKumar\AppData\Local\hermes\cache\images\openrouter_gen_20260929_172833_56cee764.png"
DEVANAGARI = r"C:\Windows\Fonts\Nirmala.ttc"
UI_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
UI_SEMI = r"C:\Windows\Fonts\seguisb.ttf"

# Brand palette (pulled from Concept B)
NAVY = (14, 42, 92)
ROYAL = (46, 111, 224)
VIOLET = (124, 77, 255)
CREAM = (255, 252, 242)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def diagonal_gradient(size, stops, angle=45.0):
    """stops: list of (t, rgb). Renders a diagonal multi-stop gradient."""
    w, h = size
    img = Image.new("RGB", (w, h))
    px = img.load()
    import math
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    # project corners to get min/max
    proj = [0 * dx + 0 * dy, w * dx + 0 * dy, 0 * dx + h * dy, w * dx + h * dy]
    lo, hi = min(proj), max(proj)
    span = (hi - lo) or 1
    for y in range(h):
        for x in range(w):
            t = ((x * dx + y * dy) - lo) / span
            # find segment
            for i in range(len(stops) - 1):
                t0, c0 = stops[i]
                t1, c1 = stops[i + 1]
                if t <= t1:
                    lt = 0 if t1 == t0 else (t - t0) / (t1 - t0)
                    px[x, y] = lerp(c0, c1, max(0.0, min(1.0, lt)))
                    break
            else:
                px[x, y] = stops[-1][1]
    return img


def glyph_mask(size, glyph="\u0905", font_scale=0.62, dy_frac=0.0):
    """Render a Devanagari/any glyph into an L-mode mask, centered."""
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    target = int(size[1] * font_scale)
    font = None
    for s in range(target, 10, -2):
        try:
            f = ImageFont.truetype(DEVANAGARI, s)
            bb = d.textbbox((0, 0), glyph, font=f)
            if (bb[3] - bb[1]) <= target:
                font = f
                break
        except Exception:
            continue
    if font is None:
        font = ImageFont.truetype(DEVANAGARI, target)
    bb = d.textbbox((0, 0), glyph, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x = (size[0] - tw) / 2 - bb[0]
    y = (size[1] - th) / 2 - bb[1] + dy_frac * size[1]
    d.text((x, y), glyph, font=font, fill=255)
    return m


def rounded_arcs(draw, cx, cy, radii, width, color, start, end, n=3, alpha=40):
    for r in radii[:n]:
        draw.arc([cx - r, cy - r, cx + r, cy + r], start, end, fill=color, width=width)


# ── 1. Play Store icon 512 (from Concept B) ──────────────────────────────────
src = Image.open(CONCEPT_B).convert("RGB")
store = src.resize((512, 512), Image.LANCZOS).convert("RGBA")
store.save(os.path.join(DEPLOY, "play-store-icon-512.png"))
print("play-store-icon-512.png")

# ── 2. Adaptive icon background (full-bleed gradient) ────────────────────────
bg = diagonal_gradient((432, 432), [(0.0, NAVY), (0.5, ROYAL), (1.0, VIOLET)], angle=45.0).convert("RGBA")
bg.save(os.path.join(DEPLOY, "adaptive-icon-background-432.png"))
print("adaptive-icon-background-432.png")

# ── 3. Adaptive icon foreground (glyph on transparent, 62% safe zone) ────────
fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
mask = glyph_mask((432, 432), font_scale=0.62)
white = Image.new("RGBA", (432, 432), (255, 255, 255, 255))
fg = Image.composite(white, fg, mask)
fg.save(os.path.join(DEPLOY, "adaptive-icon-foreground-432.png"))
print("adaptive-icon-foreground-432.png")

# ── 4. Monochrome layer (single-tone glyph on transparent) ───────────────────
mono = Image.composite(white, Image.new("RGBA", (432, 432), (0, 0, 0, 0)),
                       glyph_mask((432, 432), font_scale=0.62))
mono.save(os.path.join(DEPLOY, "adaptive-icon-monochrome-432.png"))
print("adaptive-icon-monochrome-432.png")

# ── 5. Feature graphic 1024x500 ─────────────────────────────────────────────
W, H = 1024, 500
feat = diagonal_gradient((W, H), [(0.0, NAVY), (0.45, ROYAL), (1.0, VIOLET)], angle=30.0).convert("RGBA")

# subtle sound-wave arcs bottom-right
arcs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ad = ImageDraw.Draw(arcs)
for i, r in enumerate(range(150, 620, 70)):
    ad.arc([920 - r, 250 - r, 920 + r, 250 + r], 120, 250,
           fill=(255, 255, 255, 26), width=3)
feat = Image.alpha_composite(feat, arcs)

# big translucent अ watermark on the right
wm = Image.new("L", (W, H), 0)
wm.paste(glyph_mask((W, H), font_scale=0.92), (int(W * 0.60), int(H * 0.02)))
wm_color = Image.new("RGBA", (W, H), (255, 255, 255, 38))
feat = Image.alpha_composite(feat, Image.composite(wm_color, Image.new("RGBA", (W, H), (0, 0, 0, 0)), wm))

# crisp white अ badge on the left
badge_size = 300
badge = Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0))
bmask = glyph_mask((badge_size, badge_size), font_scale=0.70)
feat.alpha_composite(Image.composite(Image.new("RGBA", (badge_size, badge_size), (255, 255, 255, 255)),
                                     Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0)), bmask),
                     (60, (H - badge_size) // 2))

d = ImageDraw.Draw(feat)
try:
    f_title = ImageFont.truetype(UI_BOLD, 84)
    f_tag = ImageFont.truetype(UI_SEMI, 34)
except Exception:
    f_title = ImageFont.truetype("arialbd.ttf", 84)
    f_tag = ImageFont.truetype("arial.ttf", 34)

d.text((400, 168), "Sanskritam", font=f_title, fill=(255, 255, 255, 255))
d.text((404, 272), "Speak Sanskrit. Learn naturally.", font=f_tag, fill=(235, 240, 255, 255))

feat.convert("RGB").save(os.path.join(DEPLOY, "feature-graphic-1024x500.png"), quality=95)
print("feature-graphic-1024x500.png")

print("\n--- final sizes ---")
for f in sorted(os.listdir(DEPLOY)):
    if f.endswith(".png") and ("icon" in f or "feature" in f):
        p = os.path.join(DEPLOY, f)
        im = Image.open(p)
        print(f"{f:46s} {im.size[0]}x{im.size[1]}  {os.path.getsize(p)//1024} KB")
