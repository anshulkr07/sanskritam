"""Package the final app icon (deploy/icons/icon.jpg) for the Android build.

The art is not changed; this only produces the files each surface needs:

  mobile/assets/icon.png                    iOS + pre-Android-8 launcher (full art)
  mobile/assets/android-icon-background.png adaptive layer: the art's own cream
  mobile/assets/android-icon-foreground.png adaptive layer: the art, fitted to the safe circle
  mobile/assets/android-icon-monochrome.png Android 13+ themed icon (silhouette)
  mobile/assets/splash-icon.png             art on transparent
  mobile/assets/favicon.png                 web build
  deploy/icons/icon-512.png                 Play listing icon: 512x512 32-bit PNG

The Play listing icon never becomes the launcher icon; the launcher icon comes
from mobile/assets at build time (Expo prebuild renders it into mipmaps), so a
new build must be uploaded for phones to show it.

Adaptive icons are 108dp layers. Launchers show the centre 72dp and only a
66dp circle is guaranteed visible under every mask, so the art is fitted
inside that circle over a background of the art's own cream.

Run from the repo root:  backend/.venv/Scripts/python.exe deploy/build_launcher_icons.py
Previews of the masked launcher icon go to the system temp folder.
"""
import math
import os
import tempfile
from collections import deque

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "deploy", "icons", "icon.jpg")
ASSETS = os.path.join(ROOT, "mobile", "assets")
STORE_PNG = os.path.join(ROOT, "deploy", "icons", "icon-512.png")
PREVIEW = os.path.join(tempfile.gettempdir(), "sanskritam-icon-preview")
S = 1024
SAFE_DIAMETER = 66 / 108  # of the adaptive layer

art = Image.open(SRC).convert("RGB")
W, H = art.size
BG = art.getpixel((0, 0))  # the art's flat cream, (255, 246, 237)


def is_bg(c, tol=26):
    return max(abs(c[0] - BG[0]), abs(c[1] - BG[1]), abs(c[2] - BG[2])) <= tol


# Background = cream pixels connected to the border, so interior whites
# (the tilak) stay part of the art.
px = art.load()
bgmask = Image.new("L", (W, H), 0)
bm = bgmask.load()
seen = bytearray(W * H)
queue = deque([(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)]
              + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)])
while queue:
    x, y = queue.popleft()
    i = y * W + x
    if seen[i]:
        continue
    seen[i] = 1
    if not is_bg(px[x, y]):
        continue
    bm[x, y] = 255
    if x > 0: queue.append((x - 1, y))
    if x < W - 1: queue.append((x + 1, y))
    if y > 0: queue.append((x, y - 1))
    if y < H - 1: queue.append((x, y + 1))

alpha = Image.eval(bgmask, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(0.8))
cut = art.convert("RGBA")
cut.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
content = cut.crop(bbox)

art.resize((S, S), Image.LANCZOS).save(os.path.join(ASSETS, "icon.png"))
Image.new("RGB", (S, S), BG).save(os.path.join(ASSETS, "android-icon-background.png"))

scale = (SAFE_DIAMETER * S * 0.98) / math.hypot(bw, bh)
cw, ch = round(bw * scale), round(bh * scale)
fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
fg.alpha_composite(content.resize((cw, ch), Image.LANCZOS), ((S - cw) // 2, (S - ch) // 2))
fg.save(os.path.join(ASSETS, "android-icon-foreground.png"))

mono = Image.new("RGBA", (S, S), (0, 0, 0, 0))
mono.putalpha(fg.getchannel("A").point(lambda v: 255 if v > 96 else 0))
mono.save(os.path.join(ASSETS, "android-icon-monochrome.png"))

splash = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sw = int(S * 0.62)
sh = round(bh * sw / bw)
splash.alpha_composite(content.resize((sw, sh), Image.LANCZOS), ((S - sw) // 2, (S - sh) // 2))
splash.save(os.path.join(ASSETS, "splash-icon.png"))

art.resize((48, 48), Image.LANCZOS).save(os.path.join(ASSETS, "favicon.png"))
art.convert("RGBA").save(STORE_PNG, optimize=True)

os.makedirs(PREVIEW, exist_ok=True)
composed = Image.alpha_composite(Image.new("RGBA", (S, S), BG + (255,)), fg)
view = composed.crop((S // 6, S // 6, S - S // 6, S - S // 6)).resize((432, 432), Image.LANCZOS)
for name, radius in (("circle", None), ("squircle", 120), ("rounded-square", 40)):
    m = Image.new("L", view.size, 0)
    d = ImageDraw.Draw(m)
    if radius is None:
        d.ellipse([0, 0, 431, 431], fill=255)
    else:
        d.rounded_rectangle([0, 0, 431, 431], radius=radius, fill=255)
    out = Image.new("RGBA", view.size, (60, 60, 60, 255))
    out.paste(view, (0, 0), m)
    out.save(os.path.join(PREVIEW, f"launcher-{name}.png"))

print(f"art background {BG}, content box {bbox}, fitted at {scale:.3f}x")
print(f"store icon: {STORE_PNG} ({os.path.getsize(STORE_PNG) // 1024} KB)")
print(f"previews: {PREVIEW}")
