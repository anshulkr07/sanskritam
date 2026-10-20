"""Use reviewed shared paintings only where count, referent and action match.

An isolated noun can have a lexical picture; a sentence needs a separately
verified participant/action match. Never infer a scene from one matching word.
"""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi, item
from author_illustrated_tables import ALTS

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CONTENT = ROOT/'backend/app/curriculum/content/acts'

ALTS.update({
 'teaching-toward-house':bi('One boy walks toward a house','घर की ओर चलता एक बालक'),
 'teaching-from-house':bi('One boy walks away from a house','घर से दूर चलता एक बालक'),
 'teaching-at-house':bi('One boy sits at the door of a house','घर के द्वार पर बैठा एक बालक'),
 'teaching-gift-teacher':bi('A boy offers one fruit to a teacher','गुरु को एक फल देता बालक'),
 'teaching-girl-writes':bi('A girl writes अ with a pen','लेखनी से अ लिखती बालिका'),
 'teaching-boy-eats':bi('A boy eats one mango','एक आम खाता बालक'),
 'teaching-boy-drinks':bi('A boy drinks from a cup','प्याले से पीता बालक'),
 'teaching-boy-walks':bi('A boy walks on a path','राह पर चलता बालक'),
 'teaching-vine':bi('A creeper on a wooden support','लकड़ी के सहारे पर लता'),
 'teaching-river':bi('A flowing river between two banks','दो तटों के बीच बहती नदी'),
 'teaching-tree':bi('One whole banyan tree','एक पूरा बरगद का वृक्ष'),
 'teaching-pen':bi('A reed pen beside an inkpot','दवात के पास लेखनी'),
 'teaching-book':bi('One closed book with a plain cover','सादे आवरण की एक बन्द पुस्तक'),
 'teaching-cow':bi('One standing cow','खड़ी हुई एक गाय'),
 'teaching-rope':bi('One coiled rope','लिपटी हुई एक रस्सी'),
 'teaching-garland':bi('One flower garland','फूलों की एक माला'),
})
LEXICON={'लता':'vine','नदी':'river','वृक्ष':'tree','लेखनी':'pen','पुस्तक':'book','धेनु':'cow','रज्जु':'rope','माला':'garland'}
EXACT={'लता':'vine','नदी':'river','वृक्षः':'tree','लेखनी':'pen','पुस्तकम्':'book','धेनुः':'cow','रज्जुः':'rope','माला':'garland'}
EXACT={**LEXICON,**EXACT}
VERBS={'पठ्':'reader-one','लिख्':'girl-writes','खाद्':'boy-eats','पा':'boy-drinks','चल्':'boy-walks','गम्':'boy-walks'}


def main():
    deliveries={r['id']:r for r in json.loads((HERE/'artwork/deliveries.json').read_text('utf-8'))}
    def picture(suffix):
        key='teaching-'+suffix; row=deliveries[key]
        return {'id':key,'brief':row['prompt'],'alt':ALTS[key],'ratio':row['ratio'],'text_in_image':row['expected']}
    def lexical(node):
        check=node.get('check',{})
        if check.get('type')=='subanta' and check.get('vacana')=='Eka' and check.get('stem') in LEXICON:
            return picture(LEXICON[check['stem']])
        if node.get('sa') in EXACT and not node.get('words'):
            return picture(EXACT[node['sa']])
        return None
    counts={'lexical_pictures':0,'action_table_cells':0,'matching_sentences':0,'new_spatial_examples':0}; consumers={}
    def enrich(node):
        if isinstance(node,list):
            for value in node:enrich(value)
        elif isinstance(node,dict):
            # Stop at pictures and claims, whose private strings are not content.
            img=lexical(node)
            if img and 'image' not in node:
                node['image']=img;counts['lexical_pictures']+=1
            for key,value in list(node.items()):
                if key not in ('image','check','words','examples','steps','pairs','options'):enrich(value)
    for path in sorted(CONTENT.glob('*/*/*.yaml')):
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text('utf-8'));before=copy.deepcopy(lesson)
        for card in lesson['cards']:
            # Only Cell and VisualItem accept images. Preserve the original
            # Example/Word shapes and attach their pictures to visual copies.
            for key in ('visuals','feedback_visuals'):enrich(card.get(key,[]))
            if card['kind']=='revision':
                for row in card['rows']:enrich(row.get('visuals',[]))
            if card['kind']=='table':
                enrich(card['rows'])
                if lesson['id']=='who.does' and card['id']=='tb1':
                    for row in card['rows']:
                        for cell in row:
                            check=cell.get('check',{})
                            if check.get('type')=='tinanta' and check.get('dhatu') in VERBS:
                                cell['image']=picture(VERBS[check['dhatu']]);counts['action_table_cells']+=1
            if card['kind']=='teach' and card.get('depth','core')=='core':
                nodes=[]
                for i,example in enumerate(card.get('examples',[])):
                    words=example.get('words',[]);subject=next((w for w in words if w.get('check',{}).get('vibhakti')=='Prathama'),None)
                    verb=next((w for w in words if w.get('check',{}).get('type')=='tinanta'),None)
                    suffix=None
                    if subject and verb and verb['check'].get('lakara')=='Lat' and verb['check'].get('vacana')=='Eka' and not verb['check'].get('sanadi'):
                        root=verb['check']['dhatu'];stem=subject['check']['stem']
                        if len(words)==2 and ((stem=='बालिका' and root=='लिख्') or (stem=='बालक' and root in ('पठ्','चल्','गम्','खाद्','पा'))):
                            suffix=VERBS[root]
                        elif stem=='बालक' and root=='खाद्' and len(words)==3 and any(w.get('check',{}).get('stem')=='फल' for w in words):suffix='boy-eats'
                    if suffix:
                        node=item(i,example);node['image']=picture(suffix);nodes.append(node)
                card['visuals']=[v for v in card.get('visuals',[]) if v['id']!='v-semantic-scenes']
                if nodes:
                    card['visuals'].insert(0,{'id':'v-semantic-scenes','kind':'comparison','title':bi('Action and sentence','काम और वाक्य'),'items':nodes});counts['matching_sentences']+=len(nodes)
        # A controlled house triptych uses one participant and one place.
        spatial={
          'object.where-to':('बालकः गृहम् गच्छति।','The boy goes to the house.','बालक घर जाता है।','गृहम्','Dvitiya','गम्','toward-house'),
          'from.away':('बालकः गृहात् गच्छति।','The boy goes from the house.','बालक घर से जाता है।','गृहात्','Panchami','गम्','from-house'),
          'in.where':('बालकः गृहे अस्ति।','The boy is at the house.','बालक घर पर है।','गृहे','Saptami','अस्','at-house'),
        }
        if lesson['id'] in spatial:
            sa,en,hi,place,case,root,suffix=spatial[lesson['id']]
            verb=sa.rstrip('।').split()[-1]
            example={'sa':sa,'meaning':bi(en,hi),'words':[
                {'sa':'बालकः','gloss':bi('boy','बालक'),'check':{'type':'subanta','stem':'बालक','linga':'Pum','vibhakti':'Prathama','vacana':'Eka'}},
                {'sa':place,'gloss':bi('house: '+{'Dvitiya':'destination','Panchami':'source','Saptami':'location'}[case],{'Dvitiya':'घर: जाने का स्थान','Panchami':'घर: निकलने का स्थान','Saptami':'घर: होने का स्थान'}[case]),'check':{'type':'subanta','stem':'गृह','linga':'Napumsaka','vibhakti':case,'vacana':'Eka'}},
                {'sa':verb,'gloss':bi('is' if root=='अस्' else 'goes','है' if root=='अस्' else 'जाता है'),'check':{'type':'tinanta','dhatu':root,'lakara':'Lat','purusha':'Prathama','vacana':'Eka'}}]}
            node=item(0,example);node['image']=picture(suffix)
            card=next(c for c in lesson['cards'] if c['id']=='t1')
            card['visuals']=[v for v in card['visuals'] if v['id']!='v-semantic-house']
            card['visuals'].insert(0,{'id':'v-semantic-house','kind':'reading','title':bi('Follow the place expression','स्थान के पद पर ध्यान दें'),'items':[node]});counts['new_spatial_examples']+=1
        if lesson['id']=='for.giving':
            card=next(c for c in lesson['cards'] if c['id']=='t1');example=card['examples'][0]
            # Source explicitly names a teacher receiving a fruit.
            assert 'आचार्याय' in example['sa'] and 'फल' in example['sa']
            node=item(0,example);node['image']=picture('gift-teacher')
            card['visuals']=[v for v in card['visuals'] if v['id']!='v-semantic-gift']
            card['visuals'].insert(0,{'id':'v-semantic-gift','kind':'reading','title':bi('Giver, gift, recipient','देने वाला, दिया फल, पाने वाला'),'items':[node]})
        def inventory(node):
            if isinstance(node,list):
                for v in node:inventory(v)
            elif isinstance(node,dict):
                if isinstance(node.get('image'),dict):consumers.setdefault(node['image']['id'],set()).add(lesson['id'])
                for k,v in node.items():
                    if k!='image':inventory(v)
        inventory(lesson)
        if lesson!=before:path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    report={'counts':counts,'consumers':{k:sorted(v) for k,v in consumers.items() if k.startswith('teaching-')}}
    assert set(deliveries)<=set(report['consumers']), 'Unused paintings: '+str(set(deliveries)-set(report['consumers']))
    (HERE/'semantic-library.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report['counts']))


if __name__=='__main__':main()
