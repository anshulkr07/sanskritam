"""Preserve generated masters and build offline app WebPs from manifest.json."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
manifest = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
masters = ROOT / 'results/art-refresh-20261015/originals'
masters.mkdir(parents=True, exist_ok=True)
thumbs = []
for entry in manifest:
    master = masters / f"{entry['section']}-{entry['key']}.png"
    source = Path(entry['sourcePath'])
    if source.exists():
        shutil.copy2(source, master)
    elif not master.exists():
        raise FileNotFoundError(f"Neither the generated source nor saved master exists: {entry['key']}")
    target = ROOT / entry['assetPath']
    target.parent.mkdir(parents=True, exist_ok=True)
    wide = entry['key'] in ('leaderboard', 'competition', 'challenge')
    size = (600, 900) if entry['section'] == 'covers' else (1200, 600) if wide else (600, 750)
    with Image.open(master) as im:
        im.load()
        result = ImageOps.fit(im.convert('RGB'), size, method=Image.Resampling.LANCZOS)
        result.save(target, 'WEBP', quality=86, method=6)
        tile = Image.new('RGB', (168, 232), '#f7efdf')
        thumb = ImageOps.contain(result, (156, 200))
        tile.paste(thumb, ((168-thumb.width)//2, 0))
        ImageDraw.Draw(tile).text((6, 207), entry['key'], fill='#30251c')
        thumbs.append(tile)
for section in ('covers', 'games', 'learn'):
    tiles = [tile for tile, e in zip(thumbs, manifest) if e['section'] == section]
    sheet = Image.new('RGB', (168*6, 232*((len(tiles)+5)//6)), '#f7efdf')
    for i, tile in enumerate(tiles):
        sheet.paste(tile, (i%6*168, i//6*232))
    if tiles:
        sheet.save(HERE / f'{section}-contact.jpg', quality=90)
print(f"Saved and decoded {len(manifest)} masters and WebPs")
