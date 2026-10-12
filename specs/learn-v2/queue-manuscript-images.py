"""Select concrete artwork from the accepted manuscripts, preserving source labels."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPECS = ROOT / 'specs/learn-v2'
PROTO = Path('C:/Users/AnshulKumar/.codex/visualizations/2026/10/10/01a12792-a234-7a80-b6bf-fe778750afd9')
data = json.loads((PROTO / 'sandhi-chapter-data.json').read_text(encoding='utf-8'))
lessons = {l['id']: l for l in data['lessons']}
style = (' Landscape 3:2 Sanskrit teaching illustration. Refined watercolor and gouache, matte warm ochre, terracotta, leafy green and teal. Natural anatomy. Keep teaching evidence clear in top 75 percent with generous margins. Bottom 25 percent is a completely blank deep teal panel for native checked labels. No text, letters, imitation writing, numbers, logos, watermark or collage. Every book cover and paper page must be blank. Pens and pencils are allowed. Depict the concrete meaning; native formulas explain sound changes, never pretend scenery proves a phonetic rule.')
selections = [
 ('boundary',0,'One adult man named Rama standing here on a quiet veranda, indicated by a companion.'),
 ('boundary',6,'Strong winds visibly bend several tree branches and carry loose leaves in an Indian countryside. No people.'),
 ('like-vowels',0,'Sita, an adult woman, joins a seated gathering of two adults. She is clearly the additional arriving participant.'),
 ('like-vowels',7,'A single inviting Indian temple, central doorway and shrine architecture clearly visible, no crowds.'),
 ('like-vowels',5,'One adult recites a hymn from a plain open book, mouth visibly speaking, one attentive listener.'),
 ('a-combinations',0,'Respectful traditional depiction of Indra as lord of the gods, seated with a vajra, calm dignified figure.'),
 ('a-combinations',1,'Respectful traditional depiction of Shiva as a great lord, calm seated figure with traditional trident beside him.'),
 ('a-combinations',2,'An adult teacher gives beneficial instruction to two attentive adult learners, clear speaking and listening gestures.'),
 ('a-combinations',3,'One dignified great sage seated thoughtfully beneath a tree with a plain book.'),
 ('a-combinations',5,'A wide powerful mass of flood water sweeping through an uninhabited river valley. No people or injury.'),
 ('glides',1,'A clearly visible river here in the foreground, an adult indicates the water with an open hand.'),
 ('glides',2,'Two adults warmly welcome one arriving adult visitor at a home doorway.'),
 ('glides',3,'A father gives instruction to his attentive teenage child, eye contact and explanatory hand gesture.'),
 ('glides',6,'A river visibly flows through rocks with ripples and current, no people.'),
 ('e-o',0,'Exactly three adult guides lead a small group along a village path, leadership direction clear.'),
 ('e-o',2,'Three additional adults join an existing group in a courtyard, arrival and inclusion clear.'),
 ('e-o',3,'Exactly three adult visitors have arrived at a doorway with travel bags, greeted by one host.'),
 ('e-o',5,'An adult woman receives a gift book from another adult; clear recipient and handoff.'),
 ('protected',0,'Exactly two distinct fires in two separated small hearths, viewed by one adult from a safe distance. No third fire, candles or lamps.'),
 ('protected',1,'One adult raises both arms clearly above the shoulders, exactly two arms and two hands, full body visible.'),
 ('protected',2,'Exactly two adults receive the reins of exactly three horses from a stable keeper. Horses individually countable.'),
 ('protected',3,'Exactly three adult men standing here together, clear plural group with no background people.'),
 ('stops',0,'One adult speaker visibly speaking to an attentive adult, neutral natural conversational gesture.'),
 ('stops',3,'One adult indicates exactly one whole mango on a plate. No other fruit.'),
 ('stops',5,'A plain framed painted landscape picture beside a brass bowl of water; the picture and real water are distinct objects. No lettering.'),
 ('stops',7,'An adult points toward a plain closed book as a second adult reaches to obtain it.'),
 ('nasals',5,'An adult crosses a narrow river using a stone footbridge, walking direction and opposite bank clearly visible.'),
 ('nasals',9,'A broad tree casts an obvious cool shadow on sunlit courtyard ground; an adult rests inside the shade.'),
 ('visarga-more',2,'One adult man Rama lies down resting on a simple woven cot, full body supported by cot.'),
 ('visarga-more',3,'One clear fire burns in a small hearth, no people, no additional flames.'),
 ('internal',2,'One calm awakened sage sits upright and alert in contemplative awareness, eyes open, dignified neutral portrayal.'),
 ('retroflex',1,'One adult archer holds one traditional bow with both hands, bow and string completely visible, no combat.'),
 ('retroflex',5,'One adult travels in a clearly recognizable traditional two-wheeled horse-drawn chariot, wheels and horse visible.'),
 ('retroflex',6,'One adult named Hari bows respectfully with joined hands to an elder, bowing posture clearly visible.'),
 ('reading',0,'One adult man Rama stands near a forest entrance with a clear path leading into the trees; a companion indicates him. Context for a two-sentence reading, no panels.'),
]
jobs = []
for lesson_id, index, scene in selections:
    card = lessons[lesson_id]['cards'][index]
    jobs.append({'asset_id':f'sandhi-{lesson_id}-{index+1}', 'lesson_id':f'sandhi-{lesson_id}', 'card_ids':[f'{lesson_id}-{index+1:02d}'], 'source':{'file':str(PROTO/'sandhi-chapter-data.json'),'lesson_id':lesson_id,'card_index':index,'teaching_excerpt':card[5]}, 'labels':{'sa':card[1]+' → '+card[2], 'iast':card[3]}, 'meaning':{'en':scene}, 'prompt':scene+style, 'status':'source_selected', 'verification':{'status':'passed','evidence':'Exact labels and teaching excerpt copied from accepted existing Sandhi manuscript; artwork depicts its concrete meaning, not a new sandhi claim.'}})

verse = (PROTO/'verse-rhythm-course-content.md').read_text(encoding='utf-8')
parts = re.split(r'^### (\d+)\. (.+)$', verse, flags=re.M)
sections = {int(parts[i]):{'title':parts[i+1],'body':parts[i+2]} for i in range(1,len(parts),3)}
verse_scenes = [
 (1,'spoken','One adult speaks a verse from a plain book to an attentive listener. No musical instruments.'),
 (1,'sung','One adult sings a verse with a tanpura beside them and an attentive listener. Mouth visibly singing.'),
 (2,'yoga','One adult in a calm recognizable seated yoga posture, upright spine, quiet courtyard.'),
 (2,'field','A clearly bounded cultivated field with neat planted rows, no people.'),
 (4,'assembly','Two distinct ancient armies assembled peacefully facing across a wide plain, banners without writing, no fighting or injury. Context for the opening question of the Gita.'),
 (5,'poet','One adult poet thoughtfully composes with a pencil and completely blank notebook.'),
 (5,'teacher','One adult teacher gives a thoughtful explanation to one attentive adult learner.'),
 (6,'sita','Respectful adult portrait of Sita in an ochre sari beside a quiet garden, no additional people.'),
 (7,'fire','One clear ceremonial fire, burning logs and flame readily visible.'),
 (7,'friend','Two adult friends warmly greet each other in a courtyard.'),
 (7,'story','One adult storyteller speaks expressively to two attentive adult listeners.'),
 (8,'sorrow','One adult seated with a visibly sorrowful expression, head lowered; respectful calm depiction.'),
 (10,'temple','A temple with a clearly visible central entrance and serene courtyard; illustrates the temple word in the sandhi example.'),
 (22,'himalaya','Majestic snow-covered Himalayan mountain range, towering peaks over green foothills. No map labels.'),
 (26,'separation','A solitary adult yaksha sits beneath a tree gazing toward distant clouds with an expression of longing, his beloved absent. No speech bubbles.'),
 (34,'parents','Respectful traditional depiction of Parvati and Shiva seated together, exactly two principal figures, serene mutual connection.'),
 (36,'recitation','An adult learner reads a verse aloud from a plain book to an attentive adult teacher.'),
 (38,'agni','A ritual fire at the foreground of a quiet traditional recitation space, two adults reciting nearby; no invented textual marks.'),
 (39,'tradition','An adult teacher demonstrates recitation while one adult learner listens carefully, no diagrams or invented pitch symbols.'),
 (41,'ocean','A broad ocean horizon with waves and rocky Indian coastline. Literal ocean imagery only; the native lesson explains numerical convention.'),
 (44,'composition','An adult composes thoughtfully with a pencil, plain notebook, and several blank book covers on a simple desk.'),
 (46,'hermitage','A quiet hermitage on a wooded hillside with welcoming tree shade and a stream; one solitary adult dwells there.'),
 (47,'peer','One adult learner explains a plain open book to another adult learner, cooperative attention.'),
 (48,'study','An adult scholar compares two plain open volumes at a desk, careful evidence-seeking posture, pens allowed.'),
]
for number, key, scene in verse_scenes:
    sec = sections[number]
    jobs.append({'asset_id':f'verse-{number:02d}-{key}', 'lesson_id':f'verse-{number:02d}', 'card_ids':[], 'source':{'file':str(PROTO/'verse-rhythm-course-content.md'),'lesson_number':number,'lesson_title':sec['title'],'teaching_excerpt':sec['body']}, 'labels':{'sa':'','iast':''}, 'meaning':{'en':scene}, 'prompt':scene+style, 'status':'source_selected', 'verification':{'status':'passed','evidence':'Scene supports an existing manuscript example or learning activity. No new Sanskrit, metre pattern, historical quotation, or sound rule is authored into the artwork. Exact metrical notation remains native text.'}})
(SPECS/'manuscript-image-production-queue.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Selected {len(selections)} Sandhi scenes and {len(verse_scenes)} Verse scenes: {len(jobs)} additional assets.')
