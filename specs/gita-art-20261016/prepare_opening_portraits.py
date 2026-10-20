"""Versioned phone recompositions of the owner's original three preview verses."""
import hashlib,json
from pathlib import Path
OUT=Path(__file__).resolve().parent
if __name__=='__main__':
 for j in json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'))[:3]:
  p=OUT/'revisions'/f"{j['key']}-v2.json"
  if p.exists():continue
  prompt=j['prompt'].replace('single square 1:1 image, 2048x2048 or the highest actually supported native square resolution','single PORTRAIT 9:16 image, 1080x1920 or the highest actually supported native portrait resolution close to 9:16').replace('central 60% of width and central 50% of height','central 70% of width and central 70% of height')
  prompt+=' Owner-authorized phone-first recomposition: make a genuine tall 9:16 watercolor composition, with the natural setting continuing organically through the portrait canvas. Phones are primary; keep the named main speakers large and clear at 320–430 logical pixels. Keep complete heads, crowns, hands, gestures and important narrative objects safely inside quiet margins. Arrange depth vertically, rather than spreading the essential story across a wide panorama. This same single painting will be contained proportionally on tablets and landscape screens; no edge crop, stretching, square inset, added blank bands or second tablet generation. All flags, books and fabrics must have plain unlettered surfaces, no sacred syllables, invented writing, numbers, labels or annotation marks.'
  d={'key':j['key'],'revision':2,'mode':'generate','composition_policy':'phone-portrait-9x16-20261019','master':f"results/gita-art-20261016/masters/{j['key']}-v2.png",'prompt':prompt,'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'reason':'Owner authorized regeneration where needed; opening palace/army scenes recomposed vertically for primary phone readers.'}
  p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Opening portrait revision prompts ready: 1.1, 1.2, 1.3')
