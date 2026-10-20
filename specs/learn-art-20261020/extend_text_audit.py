"""Include previously delivered opening scenes with missing manuscript writing."""
import json,sys
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from app.curriculum import load,CONTENT_DIR
from app.curriculum.__main__ import all_images
data=load(CONTENT_DIR);jobs=json.loads((OUT/'jobs.json').read_text(encoding='utf-8'));known={j['id'] for j in jobs}
needed={'portrait-you','freed-dhumaka','prologue-1','prologue-3','prologue-4','vowels-short-smoke','vowels-long-shuka','vowels-signs-second-line'}
characters={c.id:c.look for c in data.bible.characters}
for where,image in all_images(data):
    if image.id not in needed or image.id in known:continue
    lesson=data.lessons.get(where.split('#')[0]);source=lesson.obj.model_dump(mode='json') if lesson else {}
    # The same leaf's established first line is introduced in vowels.short.
    anchors={'vowels.short':data.lessons['vowels.short'].obj.model_dump(mode='json'),'course':data.course.model_dump(mode='json')}
    if image.id=='vowels-signs-second-line':anchors['vowels.signs']=data.lessons['vowels.signs'].obj.model_dump(mode='json')
    source={'scene':source,'shared_leaf_source':anchors}
    cast='\n'.join(f'{key}: {characters[key]}' for key in image.cast if key in characters)
    prompt=(f'Use case: illustration-story. Asset: one {image.ratio} painting for The Burnt Book Sanskrit learning story. '
            'Use the highest supported native resolution in that exact aspect ratio. Refined Indian watercolor with restrained gouache on warm ivory, '
            'quiet ochre, sage, dusty terracotta and muted indigo. Warm and gentle, consistent character design.\n'
            f'Canonical scene brief: {image.brief}\nCharacter appearances:\n{cast}\n'
            'Phone-first composition: compact clear central grouping, essential faces, hands and narrative objects comfortably inside all edges. '
            'Keep the entire painting visible with contain fitting. No collage, UI or decorative border.\n')
    if image.id=='vowels-signs-second-line':prompt+='Owner update: replace the earlier soft-focus/unreadable writing direction with clear, accurate Devanagari vowel-mark examples. '
    jobs.append({'id':image.id,'where':where,'ratio':image.ratio,'expected':[],'prompt':prompt,'prompt_before_text_permission':prompt,
                 'source':source,'brief':image.model_dump(mode='json'),'generator':'built-in image_gen','replaces_earlier_delivery':True})
(OUT/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(jobs)} total scene jobs including {len(needed)} earlier opening/manuscript replacements')
