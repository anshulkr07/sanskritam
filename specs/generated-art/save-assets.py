"""Preserve ImageGen masters and reproduce optimized bundled assets."""
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / 'specs/generated-art/manifest.json').read_text())
for item in manifest:
    original = ROOT / item['original']
    output = ROOT / item['file']
    original.parent.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    if not original.exists():
        shutil.copy2(item['sourcePath'], original)
    if not output.exists():
        with Image.open(original) as image:
            width = 1200 if item['group'] == 'festivals' else 600
            image = image.convert('RGB')
            image.thumbnail((width, round(width * image.height / image.width)), Image.Resampling.LANCZOS)
            image.save(output, 'WEBP', quality=86, method=6)
    with Image.open(output) as image:
        print(f"{item['key']}: {image.width} x {image.height}, {output.stat().st_size} bytes")
