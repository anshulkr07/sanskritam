"""Build the book covers from the paintings.

The image model paints only the miniature. This script sets every painting into
the same cover: the layout, frame lines and paper grain measured from the Gita
cover the owner approved on 2026-10-01, on the book's own ground colour. The
part below the frame stays empty; the app sets the title there.

Reads   results/covers/paintings-watercolour/<key>.png   one painting per book (tracked in git; EAS ignores /results/)
        specs/covers/covers.json             ground colour per book
        specs/covers/ground-texture.jpg      the paper grain of the approved cover
Writes  results/covers/miniature/<key>.png   3392x5088 masters (tracked in git; EAS ignores /results/)

    backend/.venv/Scripts/python.exe specs/covers/compose_covers.py [key ...]

Then export_covers.py makes the small files the app ships.
"""
import json
import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PAINTINGS = ROOT / "results" / "covers" / "paintings-watercolour"
MASTERS = ROOT / "results" / "covers" / "miniature"

WIDTH, HEIGHT = 3392, 5088                  # 2:3
# Measured on the approved cover, in pixels of a 1696-wide cover.
UNIT = WIDTH / 1696
MARGIN = round(112 * UNIT)                  # ground above and beside the frame
HAIRLINE, GAP, DARK, GOLD = (round(n * UNIT) for n in (4, 6, 4, 12))
FRAME = HAIRLINE + GAP + DARK + GOLD + DARK
PAINTING_ASPECT = 0.865                     # width / height of the painting inside the frame
INNER_W = WIDTH - 2 * MARGIN - 2 * FRAME
INNER_H = round(INNER_W / PAINTING_ASPECT)
FRAME_BOTTOM = MARGIN + INNER_H + 2 * FRAME  # everything below this row is empty ground
TEXTURE_GAIN = 512 / 0.7                    # ground-texture.jpg stores 128 + (ratio - 1) * 512; used at 70%:
                                            # enlarged to 4K, the grain reads stronger than on the 2K original

CREAM = np.array([255, 244, 240], np.float32)
SHADOW = np.array([22, 12, 8], np.float32)
UMBER = np.array([60, 38, 22], np.float32)
GOLD_RGB = np.array([218, 171, 86], np.float32)


def hex_rgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def ground_texture() -> np.ndarray:
    """Brightness multipliers for the whole cover, tiled from the stored grain by mirroring."""
    tile = Image.open(HERE / "ground-texture.jpg").convert("L")
    tile = tile.resize((round(tile.width * UNIT), round(tile.height * UNIT)), Image.BICUBIC)
    ratio = 1 + (np.asarray(tile, np.float32) - 128) / TEXTURE_GAIN
    across = np.concatenate([ratio, ratio[:, ::-1]], axis=1)
    both = np.concatenate([across, across[::-1]], axis=0)
    reps = (HEIGHT // both.shape[0] + 1, WIDTH // both.shape[1] + 1)
    return np.tile(both, reps)[:HEIGHT, :WIDTH]


def painted_rule(strip: np.ndarray) -> int:
    """How far in from an edge the model's own gold rule ends, in pixels; 0 when it painted none.

    ``strip`` is the outer part of the painting with the edge at row 0. Asked
    for a picture with no border, the model still rules one now and then, as
    miniatures have them. A rule is a thin gold line running the full length,
    with something else outside it; a golden sky is wide and starts at the edge.
    """
    r, g, b = strip[..., 0], strip[..., 1], strip[..., 2]
    gold = ((r > 165) & (g > 125) & (b < 150) & (r - b > 55)).mean(axis=1) > 0.75
    length = strip.shape[1]
    end, start = 0, None
    for i, is_gold in enumerate(np.append(gold, False)):
        if is_gold and start is None:
            start = i
        elif not is_gold and start is not None:
            if start > 0 and 0.0015 * length <= i - start <= 0.02 * length:
                end = i
            start = None
    return end


def trim(painting: Image.Image, manual: list[float] | None) -> Image.Image:
    """Cut away a border the model painted. ``manual`` is [left, top, right, bottom] as fractions."""
    w, h = painting.size
    if manual:
        left, top, right, bottom = (round(f * side) for f, side in zip(manual, (w, h, w, h)))
    else:
        a = np.asarray(painting, np.int16)
        reach = round(0.09 * w)
        pad = round(0.006 * w)                # clears the dark line inside the gold
        left = painted_rule(a[:, :reach].transpose(1, 0, 2))
        right = painted_rule(a[:, ::-1][:, :reach].transpose(1, 0, 2))
        top = painted_rule(a[:reach])
        bottom = painted_rule(a[::-1][:reach])
        left, top, right, bottom = (n + pad if n else 0 for n in (left, top, right, bottom))
    return painting.crop((left, top, w - right, h - bottom)) if any((left, top, right, bottom)) else painting


def fit(painting: Image.Image, bias: float) -> Image.Image:
    """Crop to the frame's shape and scale. bias 0.5 trims evenly; 0 keeps the top, 1 the bottom."""
    if painting.width / painting.height > PAINTING_ASPECT:
        keep = round(painting.height * PAINTING_ASPECT)
        left = (painting.width - keep) // 2
        painting = painting.crop((left, 0, left + keep, painting.height))
    else:
        keep = round(painting.width / PAINTING_ASPECT)
        top = round((painting.height - keep) * bias)
        painting = painting.crop((0, top, painting.width, top + keep))
    return painting.resize((INNER_W, INNER_H), Image.LANCZOS)


def compose(key: str, colour: str, bias: float = 0.5, texture: np.ndarray | None = None,
            manual_trim: list[float] | None = None) -> tuple[Path, str]:
    texture = ground_texture() if texture is None else texture
    canvas = np.clip(hex_rgb(colour)[None, None, :] * texture[:, :, None], 0, 255)
    rng = np.random.default_rng(zlib.crc32(key.encode("utf-8")))
    left, top, right, bottom = MARGIN, MARGIN, WIDTH - MARGIN, FRAME_BOTTOM

    def band(inset: int, thickness: int, paint) -> None:
        x0, y0, x1, y1 = left + inset, top + inset, right - inset, bottom - inset
        for ys, xs in ((slice(y0, y0 + thickness), slice(x0, x1)), (slice(y1 - thickness, y1), slice(x0, x1)),
                       (slice(y0, y1), slice(x0, x0 + thickness)), (slice(y0, y1), slice(x1 - thickness, x1))):
            canvas[ys, xs] = paint(canvas[ys, xs])

    def gold(px: np.ndarray) -> np.ndarray:      # gold leaf: a little speckle
        speckle = rng.normal(0, 9, px.shape[:2]).astype(np.float32)
        return GOLD_RGB + speckle[:, :, None] * np.array([1, 0.95, 0.7], np.float32)

    band(0, HAIRLINE, lambda px: px * 0.42 + CREAM * 0.58)
    band(HAIRLINE + GAP, DARK, lambda px: px * 0.2 + SHADOW * 0.8)
    band(HAIRLINE + GAP + DARK, GOLD, gold)
    band(HAIRLINE + GAP + DARK + GOLD, DARK, lambda px: np.broadcast_to(UMBER, px.shape))

    source = Image.open(PAINTINGS / f"{key}.png").convert("RGB")
    trimmed = trim(source, manual_trim)
    note = "" if trimmed.size == source.size else f"  border trimmed {source.size} -> {trimmed.size}"
    painting = fit(trimmed, bias)
    canvas[top + FRAME:top + FRAME + INNER_H, left + FRAME:left + FRAME + INNER_W] = np.asarray(painting, np.float32)

    MASTERS.mkdir(parents=True, exist_ok=True)
    out = MASTERS / f"{key}.png"
    Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)).save(out, "PNG", compress_level=6)
    return out, note


if __name__ == "__main__":
    spec = json.loads((HERE / "covers.json").read_text(encoding="utf-8"))
    wanted = set(sys.argv[1:])
    grain = ground_texture()
    for item in spec["items"]:
        key = item["key"]
        if wanted and key not in wanted:
            continue
        if not (PAINTINGS / f"{key}.png").is_file():
            print(f"{key}: no painting yet")
            continue
        out, note = compose(key, item["hex"], float(item.get("crop_bias", 0.5)), grain, item.get("trim"))
        print(f"{key}: {out.relative_to(ROOT).as_posix()}  ground {item['hex']}{note}")
    print(f"frame ends at {100 * FRAME_BOTTOM / HEIGHT:.1f}% of the height; the rest is empty ground for the title")
