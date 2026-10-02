"""Turn the cover masters into the files the app ships.

Reads  results/covers/miniature/<key>.png   3392x5088 masters from compose_covers.py (tracked in git; EAS ignores /results/)
Writes mobile/assets/covers/<key>.webp      600x900 at maximum quality (quality 100, ~200-300 KB each)

    backend/.venv/Scripts/python.exe specs/covers/export_covers.py [key ...]
"""
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "results" / "covers" / "miniature"
DEST = ROOT / "mobile" / "assets" / "covers"
WIDTH, HEIGHT, QUALITY = 600, 900, 100


def export(path: Path) -> str:
    image = Image.open(path).convert("RGB")
    # The model's 2:3 is a few pixels off true 2:3: trim the longer side evenly, then scale.
    target = WIDTH / HEIGHT
    if image.width / image.height > target:
        width = round(image.height * target)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    else:
        height = round(image.width / target)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    image = image.resize((WIDTH, HEIGHT), Image.LANCZOS)
    buf = io.BytesIO()
    image.save(buf, "WEBP", quality=QUALITY, method=6)
    DEST.mkdir(parents=True, exist_ok=True)
    out = DEST / f"{path.stem}.webp"
    out.write_bytes(buf.getvalue())
    return f"{out.relative_to(ROOT).as_posix()}  {buf.tell() // 1024} KB  quality {QUALITY}"


if __name__ == "__main__":
    keys = sys.argv[1:]
    files = [SOURCE / f"{key}.png" for key in keys] if keys else sorted(SOURCE.glob("*.png"))
    for file in files:
        print(export(file) if file.is_file() else f"missing: {file}")
