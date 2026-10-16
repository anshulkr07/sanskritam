"""Snapshot the app's complete Gita and author reproducible, meaning-grounded jobs."""
import hashlib,json,re,sqlite3
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
EXPECTED=[47,72,43,42,29,47,30,28,34,42,55,20,34,27,20,24,28,78]
con=sqlite3.connect('file:'+str(ROOT/'backend/app.db')+'?mode=ro',uri=True);con.row_factory=sqlite3.Row
raw=[dict(r) for r in con.execute("SELECT id,verse_uid,source_ref,devanagari,iast,translation_en,translation_hi,date FROM shlokas WHERE source_ref LIKE 'Bhagavad Gītā %'")]
def address(row):
 m=re.fullmatch(r'Bhagavad Gītā (\d+)\.(\d+)',row['source_ref']);assert m,row['source_ref'];return tuple(map(int,m.groups()))
def preferred(row):
 # Match mobile/src/utils/verses.ts: fullest Devanagari, meaning, earliest date/id.
 length=len(re.sub(r'[^\u0900-\u097f]|[।॥]','',row['devanagari']))
 return (-length,-bool((row['translation_en'] or row['translation_hi'] or '').strip()),row['date'],row['id'])
best={}
for row in raw:
 key=address(row)
 if key not in best or preferred(row)<preferred(best[key]):best[key]=row
assert len(best)==700
counts=Counter(c for c,v in best);assert [counts[i] for i in range(1,19)]==EXPECTED
rows=[best[k] for k in sorted(best)]
assert all(r['translation_en'] and r['translation_en'].strip() for r in rows),'Do not generate a page without its stored meaning'
for r in rows:r.pop('date',None)
OUT.mkdir(exist_ok=True);(OUT/'verses.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')

chapter_context={
1:'Before combat on Kurukshetra. Depict the described armies, speakers and events precisely. Dhritarashtra is the blind king listening to Sanjaya in the palace; he is NOT physically on the battlefield. Drona is the elderly martial teacher; Duryodhana is the armored Kaurava king in a muted red cloak. When a verse lists names, render a coherent military group or the stated action, never labeled portrait grids. Krishna and Arjuna have not yet begun the philosophical discourse. No active battle unless the verse actually states it.',
2:'Arjuna is distressed; Krishna teaches the Self, endurance, wise action and steadiness. For a described analogy, make that exact analogy the image. For abstract Self teachings, use a restrained interpretive natural scene or Krishna quietly instructing Arjuna; no invented literal body of the incorporeal Self.',
3:'Karma yoga: selfless action, duty, reciprocity, example, desire and restraint. Depict the precise everyday action or analogy described. Do not make every verse an identical Krishna-Arjuna portrait.',
4:'Knowledge, action, teaching lineage, offering and insight. Depict the verse-specific symbolism; the iconic divine descent is appropriate only where stated. Distinguish the many kinds of offering without text labels.',
5:'Renunciation and action, equanimity, freedom from attachment and inner peace. Use the verse-specific person, comparison or natural metaphor rather than generic grand divinity.',
6:'Meditation, discipline, moderation, the steady mind and the yogin. Preserve physical details when explicitly described, and use the lamp-in-a-windless-place analogy where stated.',
7:'Knowing the divine, nature, qualities, devotion and the many manifestations. Paint the named element or manifestation in this verse; do not replace all with a deity portrait.',
8:'The imperishable, remembrance, transition, cosmic cycles and paths. Use symbolic contemplative imagery without depicting bodily distress, corpses or literal metaphysical claims as historical events.',
9:'The royal knowledge, divine pervasion, devotion and simple offerings. When the verse names a leaf, flower, fruit or water, show those exact offerings; preserve the specific central teaching.',
10:'Divine manifestations. This chapter often names a very specific being, mountain, tree, river, season or quality. Make THAT named manifestation the dominant subject; do not default to an unrelated Krishna-Arjuna scene.',
11:'The universal vision granted to Arjuna. Follow the verse-specific appearance, emotional response or prayer. Awe and cosmic scale, but no gore or graphic violence; when cosmic destruction is stated, use symbolic silhouettes and radiance.',
12:'Devotion and the qualities of the devotee. Render the precise conduct or quality described: compassion, humility, balance, freedom from possessiveness, or the relevant practice.',
13:'Field and knower, nature and consciousness, knowledge and its qualities. Use grounded interpretive scenes; do not label philosophical entities or imply one human body is the entire incorporeal Self.',
14:'The three gunas, their effects, and transcending them. Show the specific quality or conduct named in this verse. For a contrast, use one coherent scene, never three labeled infographic columns.',
15:'The inverted ashvattha tree, the supreme person, light, nourishment and remembrance. Preserve the exact tree/root/branch orientation and other explicit imagery when named.',
16:'Divine and demonic dispositions. Illustrate ethical conduct and its consequences through restrained human actions; avoid literal monsters, stigmatizing human groups or graphic punishment.',
17:'Threefold faith, foods, sacrifice, austerity, speech, charity and sacred utterance. Paint the specified type or practice. No Sanskrit letters or written sacred syllables inside the image.',
18:'Renunciation, duties, knowledge/action/agency, understanding, resolve, joy, surrender and the closing dialogue. Follow the exact verse-specific teaching; bring Sanjaya and Dhritarashtra back into the palace for the closing narration when appropriate.'
}
style=('Use case: illustration-story. Asset: one ORIGINAL MASTER painting for one Bhagavad Gita verse in a Sanskrit reader. '
 'Generate a single square 1:1 image, 2048x2048 or the highest actually supported native square resolution. '
 'Consistent series style: refined traditional Indian watercolor and restrained gouache on warm ivory handmade paper; fine organic detail, subtle ochre, sage, dusty terracotta and muted indigo; dignified ancient Indian setting, quiet atmospheric daylight. '
 'The image must illustrate THIS VERSE\'S ACTUAL MEANING. Read the exact source meaning below; derive a concrete, intelligible scene or a restrained symbolic interpretation of that teaching. Never simply paint an unrelated chariot, generic temple or anonymous landscape. '
 'Compose one coherent scene, no collage or infographic. Keep important faces, hands, relationships and narrative objects inside the central 60% of width and central 50% of height, surrounded by ample low-detail sky, ground and paper atmosphere. No important subject cut by an edge. This one master must support portrait/landscape phones and tablets through safe proportional fitting. '
 'No text of any kind, no verse number, no letters, no Sanskrit/Roman typography, no watermark, no frame, no UI. Text will be rendered separately by the app over the image at a user-adjustable default image opacity of 48%. '
 'If Krishna is depicted, maintain a youthful calm blue-skinned figure in muted golden-yellow garments, a restrained peacock-feather crown, no modern jewelry. Arjuna is a dark-haired warrior with a small crown, bow and understated bronze armor. Use them only when the meaning warrants them; the scene or analogy remains verse-specific. ')
jobs=[]
for row in rows:
 c,v=address(row);key=f'{c:02d}-{v:03d}'
 prev=best.get((c,v-1));nxt=best.get((c,v+1))
 prompt=style+' Reference (DO NOT DRAW THIS TEXT): '+row['source_ref']+'. Exact Sanskrit: '+row['devanagari']+' Exact stored meaning: '+row['translation_en']+' Chapter context: '+chapter_context[c]
 if prev:prompt+=' Previous verse context only, do not substitute for the target: '+prev['translation_en']
 if nxt:prompt+=' Next verse context only, do not substitute for the target: '+nxt['translation_en']
 prompt+=' Final instruction: center the distinctive content of the TARGET meaning, not the neighboring verses. No fabricated teaching or unrelated religious scene.'
 jobs.append({'key':key,'chapter':c,'verse':v,'source_ref':row['source_ref'],'verse_uid':row['verse_uid'],'source_devanagari':row['devanagari'],'source_translation_en':row['translation_en'],'prompt':prompt,'prompt_sha256':hashlib.sha256(prompt.encode()).hexdigest(),'master':f'results/gita-art-20261016/masters/{key}.png','focal_point':[.5,.5],'safe_region':{'x':.04,'y':.04,'width':.92,'height':.92}})
(OUT/'generation-jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'chapter-counts.json').write_text(json.dumps(dict(sorted(counts.items())),indent=2),encoding='utf-8')
print('Prepared',len(jobs),'meaning-grounded jobs, 18 chapters, no missing meanings.')
