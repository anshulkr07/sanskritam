"""Controlled picture comparisons for roles, desire and event sequencing."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi,item
from author_semantic_library import ALTS

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
ALTS.update({
 'teaching-cause-reading':bi('A teacher makes a boy read अ इ उ','बालक को अ इ उ पढ़वाते गुरु'),
 'teaching-walk-reading':bi('One boy reads अ इ उ while walking','चलते हुए अ इ उ पढ़ता एक बालक'),
 'teaching-walk-friend':bi('Two friends walk together','साथ चलते दो मित्र'),
 'teaching-wants-drink':bi('A boy reaches toward a cup, before drinking','पीने से पहले प्याले की ओर हाथ बढ़ाता बालक'),
})


def main():
    root=ROOT/'backend/app/curriculum/content/acts';paths={};lessons={}
    for path in root.glob('*/*/*.yaml'):
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text('utf-8'));lessons[lesson['id']]=lesson;paths[lesson['id']]=path
    deliveries={r['id']:r for r in json.loads((HERE/'artwork/deliveries.json').read_text('utf-8'))}
    def image(suffix):
        key='teaching-'+suffix;r=deliveries[key]
        return {'id':key,'brief':r['prompt'],'alt':ALTS[key],'ratio':r['ratio'],'text_in_image':r['expected']}
    def card(lid,cid='t1'):return next(c for c in lessons[lid]['cards'] if c['id']==cid)
    def pictured(example,suffix,ident):
        result=item(ident,example);result['image']=image(suffix);return result
    def insert(lid,cid,figure):
        target=card(lid,cid);target['visuals']=[v for v in target.get('visuals',[]) if v['id']!=figure['id']];target['visuals'].insert(0,figure)
    base=card('who.does','t2')['examples'][0];assert base['sa']=='बालकः पठति।'
    cause=card('pc.cause')['examples'][0]
    insert('pc.cause','t1',{'id':'v-scene-cause','kind':'comparison','title':bi('Reading and causing reading','पढ़ना और पढ़वाना'),
        'explanation':bi('The teacher is the causer; the boy still performs the reading. The lesson is what is read.','गुरु प्रेरक हैं; पढ़ने वाला अब भी बालक है। पाठ पढ़ी जाने वाली वस्तु है।'),
        'items':[pictured(base,'reader-one',0),pictured(cause,'cause-reading',1)]})
    readwhile=card('part.shatr')['examples'][0];assert readwhile['sa']=='बालकः गच्छन् पठति।'
    insert('part.shatr','t1',{'id':'v-scene-simultaneous','kind':'reading','title':bi('Both actions at once','दोनों काम एक साथ'),
        'items':[pictured(readwhile,'walk-reading',0)]})
    together=card('with.together')['examples'][0]
    insert('with.together','t1',{'id':'v-scene-companion','kind':'reading','title':bi('A companion is not a tool','साथी और साधन अलग सम्बन्ध हैं'),
        'explanation':bi('Imagine the boy in ochre saying this. सह includes the companion; it does not turn the first-person singular verb into a plural.',
                         'मान लें कि केसरिया कपड़े वाला बालक यह कह रहा है। सह साथी को जोड़ता है; इससे उत्तमपुरुष एकवचन की क्रिया बहुवचन नहीं हो जाती।'),
        'items':[pictured(together,'walk-friend',0)]})
    means=card('with.means')['examples'][1];assert means['sa']=='सा लेखन्या लिखति।'
    insert('with.means','t1',{'id':'v-scene-tool','kind':'reading','title':bi('The pen is the means','लेखनी साधन है'),
        'items':[pictured(means,'girl-writes',0)]})
    want={'sa':'पिपासति','meaning':bi('wants to drink','पीना चाहता है'),'check':{'type':'tinanta','dhatu':'पा','lakara':'Lat','purusha':'Prathama','vacana':'Eka','sanadi':['San']}}
    doing={'sa':'पिबति','meaning':bi('drinks','पीता है'),'check':{'type':'tinanta','dhatu':'पा','lakara':'Lat','purusha':'Prathama','vacana':'Eka'}}
    insert('pc.want','t1',{'id':'v-scene-desire','kind':'comparison','title':bi('Wanting and doing','चाहना और करना'),
        'explanation':bi('The desire form expresses wanting. By itself it does not tell us that the desired action takes place.',
                         'इच्छार्थक रूप चाहना बताता है। केवल इस रूप से यह नहीं कहा जाता कि चाहा गया काम हो रहा है।'),
        'items':[pictured(want,'wants-drink',0),pictured(doing,'boy-drinks',1)]})
    earlier=card('part.ktva')['examples'][1];assert earlier['sa']=='सः फलम् खादित्वा गच्छति।'
    nodes=[{'id':'first','label':bi('First event: eating, completed before the main action','पहला काम: खाना, जो मुख्य क्रिया से पहले पूरा होता है'),'sa':'खादित्वा','image':image('boy-eats'),'check':copy.deepcopy(earlier['words'][2]['check'])},
           {'id':'next','label':bi('Main action: going','मुख्य क्रिया: जाना'),'sa':'गच्छति','image':image('boy-walks'),'check':copy.deepcopy(earlier['words'][3]['check'])},
           item(2,earlier,bi('Read the complete sequence','पूरा क्रम पढ़ें'))]
    insert('part.ktva','t1',{'id':'v-scene-sequence','kind':'sequence','title':bi('Same person, one action before another','एक ही व्यक्ति, एक काम के बाद दूसरा'),'items':nodes})
    active=copy.deepcopy(next(e for e in card('object.what')['examples'] if e['sa']=='रामः फलम् खादति।'))
    active['sa']='बालकः फलम् खादति।';active['meaning']=bi('The boy eats a fruit.','बालक फल खाता है।');active['words'][0]=copy.deepcopy(base['words'][0])
    passive=card('pc.passive')['examples'][1]
    insert('pc.passive','t1',{'id':'v-scene-voice','kind':'comparison','title':bi('One event, two descriptions','एक घटना के दो वर्णन'),
        'explanation':bi('The boy eats in both pictures. In the passive description, फलम् agrees with खाद्यते; बालकेन identifies the actual eater.',
                         'दोनों चित्रों में खाने वाला बालक ही है। कर्मवाच्य में फलम् का खाद्यते से अन्वय है; बालकेन वास्तविक खाने वाले को बताता है।'),
        'items':[pictured(active,'boy-eats',0),pictured(passive,'boy-eats',1)]})
    modified=['pc.cause','part.shatr','with.together','with.means','pc.want','part.ktva','pc.passive']
    for lid in modified:paths[lid].write_text(yaml.safe_dump(lessons[lid],allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'scene-contrasts.json').write_text(json.dumps({'figures':7,'lessons':modified,'new_assets':['teaching-cause-reading','teaching-walk-reading','teaching-walk-friend','teaching-wants-drink']},indent=2)+'\n','utf-8')
    print('Seven controlled scene contrasts integrated')


if __name__=='__main__':main()
