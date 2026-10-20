"""Record targeted manuscript corrections found during final visual review."""
import hashlib,json,shutil
from pathlib import Path
OUT=Path(__file__).resolve().parent
for key in ['18-041','18-042','18-070']:
 d=json.loads((OUT/'deliveries'/f'{key}.json').read_text(encoding='utf-8'))
 prompt=f'Use case: precise-object-edit. Edit only the visible manuscript and book surfaces in the supplied portrait watercolor for Bhagavad Gita {key.replace("-", ".")}. Remove ALL writing, pseudo-Sanskrit, characters, glyphs and writing-like horizontal strokes from EVERY open book and manuscript, including the teacher\'s book and any student\'s manuscript. Replace these marks with plain warm natural palm-leaf or paper surfaces, subtle natural grain and binding details only. Preserve the books\' shapes, positions, angles and bindings. Keep every person, face, hand, pose, clothing, normal forehead adornment, tree, buildings, landscape, objects, watercolor style, light, palette and full 9:16 portrait framing unchanged. No typography, labels, sacred written syllables, explanatory marks, arrows or watermark. Sanskrit and translations remain separate live app text.'
 reference=d['master']
 if not d.get('master_retained',True):
  reference=f'results/gita-art-20261016/delivery/{key}-tablet-v1.webp'
  target_copy=OUT.parents[1]/reference
  if not target_copy.exists():shutil.copy2(OUT.parents[1]/f'results/gita-art-20261016/delivery/{key}-tablet.webp',target_copy)
 digest=hashlib.sha256((OUT.parents[1]/reference).read_bytes()).hexdigest()
 rev={'key':key,'revision':2,'mode':'edit','composition_policy':d['composition_policy'],'master':f'results/gita-art-20261016/masters/{key}-v2.png','prompt':prompt,'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'reference_images':[{'path':reference,'sha256':digest}],'reason':'Native visual review found pseudo-writing on manuscripts; remove before publication.'}
 target=OUT/'revisions'/f'{key}-v2.json'
 if target.exists():assert json.loads(target.read_text(encoding='utf-8'))==rev
 else:target.write_text(json.dumps(rev,indent=2),encoding='utf-8')
