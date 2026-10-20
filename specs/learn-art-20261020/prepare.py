"""Snapshot canonical missing pictures and build reproducible, source-grounded prompts."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app.curriculum import load, CONTENT_DIR
from app.curriculum.__main__ import all_images

OUT = Path(__file__).resolve().parent
data = load(CONTENT_DIR)
manifest = json.loads((ROOT / 'mobile/src/story/artwork/manifest.json').read_text())
characters = {c.id: c.look for c in data.bible.characters}
jobs = []
for where, image in all_images(data):
    if image.id in manifest:
        continue
    lesson_id = where.split('#')[0]
    lesson = data.lessons.get(lesson_id)
    source = lesson.obj.model_dump(mode='json') if lesson else None
    cast = '\n'.join(f'{key}: {characters[key]}' for key in image.cast if key in characters)
    prompt = (
        'Use case: illustration-story. Asset: one 4:3 landscape painting for The Burnt Book Sanskrit learning story. '
        'Request 1536 x 1152 native output or the closest supported native 4:3 resolution. '
        'Refined Indian watercolor with restrained gouache on warm ivory paper; organic detail, quiet ochre, sage, dusty terracotta, muted indigo. '
        'Warm, gentle, evocative storytelling, consistent character design.\n'
        f'Canonical scene brief: {image.brief}\nCharacter appearances:\n{cast}\n'
        'Phone-first composition: clear compact narrative grouping, essential faces, hands and objects comfortably inside all edges. '
        'Show the complete scene without border. No collage or multi-panel layout.\n'
        'Writing is allowed when useful to this lesson. Render only the exact source-grounded strings in the approved text plan, '
        'clearly and accurately as part of the scene. Teaching text also remains separate live app content. '
        'No invented script, unintended extra lettering, watermark or UI.'
    )
    jobs.append({'id': image.id, 'where': where, 'ratio': image.ratio, 'expected': image.text_in_image,
                 'prompt': prompt, 'source': source, 'brief': image.model_dump(mode='json'),
                 'generator': 'built-in image_gen'})
(OUT / 'jobs.json').write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{len(jobs)} source-grounded generation jobs prepared')
