"""Build offline lesson artwork and its explicit, reviewed example registry."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
entries = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
aliases = json.loads((HERE / 'reused-art.json').read_text(encoding='utf-8'))
masters = ROOT / 'results/lesson-art-20261016/originals'
masters.mkdir(parents=True, exist_ok=True)
lines = ['// Built by specs/lesson-art-20261016/build.py. Exact example matches only.',
         'import type { LearnV2Asset } from "./assetMap";',
         'export const EXTRA_LESSON_ART = {']
matches = {}
tiles = []
for entry in entries:
    key = 'lesson-' + entry['key']
    master = masters / (entry['key'] + '.png')
    if not master.exists():
        shutil.copy2(entry['sourcePath'], master)
    target = ROOT / entry['assetPath']
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(master) as im:
        result = ImageOps.fit(im.convert('RGB'), (900, 600), method=Image.Resampling.LANCZOS)
        result.save(target, 'WEBP', quality=86, method=6)
    first = entry['matches'][0]
    asset = dict(width=900, height=600, sceneHeight=600, captionColor='#073E40',
                 altEn=entry['en'], altHi=entry['hi'], labels=dict(sa=first['sa'], iast=first['iast']))
    literal = json.dumps(asset, ensure_ascii=False)
    lines.append(f'{json.dumps(key)}: {{ source: require("../../assets/learn-v2/{target.name}"), {literal[1:]},')
    for match in entry['matches']:
        matches[json.dumps([match['topic'], match['sa'], match['iast']], ensure_ascii=False, separators=(',', ':'))] = key
    tile = Image.new('RGB', (300, 226), '#fff8ee')
    tile.paste(result.resize((300, 200)), (0, 0))
    ImageDraw.Draw(tile).text((8, 205), entry['key'], fill='#30251c')
    tiles.append(tile)
lines += ['} satisfies Record<string, LearnV2Asset>;', 'export const GUIDE_ART_MATCHES: Record<string, string> = {']
for entry in aliases:
    matches[json.dumps([entry['topic'], entry['sa'], entry['iast']], ensure_ascii=False, separators=(',', ':'))] = entry['assetId']
for key, value in matches.items():
    lines.append(f'{json.dumps(key, ensure_ascii=False)}: {json.dumps(value)},')
lines += ['};', '']
(ROOT / 'mobile/src/learnv2/extraLessonArt.ts').write_text('\n'.join(lines), encoding='utf-8')
sheet = Image.new('RGB', (1200, 226 * ((len(tiles) + 3) // 4)), '#fff8ee')
for i, tile in enumerate(tiles):
    sheet.paste(tile, (300 * (i % 4), 226 * (i // 4)))
sheet.save(HERE / 'contact.jpg', quality=90)
print(f'Built {len(entries)} images, {len(matches)} exact example mappings.')
