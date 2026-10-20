"""Attach verified instructional paintings to exact source forms and examples."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi, item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
CONTENT=ROOT/'backend/app/curriculum/content/acts'
ART=HERE/'artwork'

ALTS={
 'teaching-fruit-one':bi('One whole mango','एक पूरा आम'),
 'teaching-fruit-two':bi('Two separate whole mangoes','दो अलग-अलग पूरे आम'),
 'teaching-fruit-many':bi('Three separate whole mangoes','तीन अलग-अलग पूरे आम'),
 'teaching-reader-one':bi('One boy reading a book with अ इ उ','अ इ उ वाली पुस्तक पढ़ता एक बालक'),
 'teaching-reader-two':bi('Two boys reading books with अ इ उ','अ इ उ वाली पुस्तकें पढ़ते दो बालक'),
 'teaching-reader-many':bi('Three boys reading books with अ इ उ','अ इ उ वाली पुस्तकें पढ़ते तीन बालक'),
 'teaching-boat-one':bi('One boat on the river','नदी पर एक नाव'),
 'teaching-boat-two':bi('Two separate boats on the river','नदी पर दो अलग-अलग नावें'),
 'teaching-boat-many':bi('Three separate boats on the river','नदी पर तीन अलग-अलग नावें'),
}


def main():
    delivered={r['id']:r for r in json.loads((ART/'deliveries.json').read_text(encoding='utf-8'))}
    def picture(key):
        if key not in delivered: return None
        row=delivered[key]
        return {'id':key,'brief':row['prompt'],'alt':ALTS[key],'ratio':row['ratio'],'text_in_image':row['expected']}
    def noun_image(check):
        family={'फल':'fruit','नौका':'boat','बालक':'reader'}.get((check or {}).get('stem'))
        number={'Eka':'one','Dvi':'two','Bahu':'many'}.get((check or {}).get('vacana'))
        return picture('teaching-'+family+'-'+number) if family and number else None
    paths=sorted(CONTENT.glob('*/*/*.yaml'))
    changed=[];cells=0;figures=0
    for path in paths:
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text(encoding='utf-8'));before=copy.deepcopy(lesson);hit=False
        for card in lesson['cards']:
            if card['kind']=='table':
                for row in card['rows']:
                    for cell in row:
                        img=noun_image(cell.get('check'))
                        if img:
                            cell['image']=img;cells+=1;hit=True
            if card['kind']!='teach' or card.get('depth','core')!='core':continue
            visuals=[v for v in card.get('visuals',[]) if not v['id'].startswith('v-picture-')]
            comparisons=[]
            for i,example in enumerate(card.get('examples',[])):
                img=noun_image(example.get('check'))
                if not img:
                    words=example.get('words',[])
                    verbs=[w for w in words if w.get('check',{}).get('type')=='tinanta']
                    simple_reading = len(words)==2 or (len(words)==3 and any(w.get('check',{}).get('stem')=='पुस्तक' for w in words))
                    if simple_reading and len(verbs)==1 and verbs[0]['check'].get('dhatu')=='पठ्' and not verbs[0]['check'].get('sanadi'):
                        number={'Eka':'one','Dvi':'two','Bahu':'many'}.get(verbs[0]['check'].get('vacana'))
                        if number:img=picture('teaching-reader-'+number)
                if img:
                    node=item(i,example);node['image']=img;comparisons.append(node)
            # These particular source lists pair a verb with a depicted count.
            if lesson['id'] in ('num.verbs','num.agree'):
                source=card.get('steps') if lesson['id']=='num.verbs' else card.get('rows')
                family='reader' if lesson['id']=='num.verbs' else 'boat'
                if source and len(source)==3:
                    comparisons=[]
                    for i,(form,count) in enumerate(zip(source,['one','two','many'])):
                        img=picture('teaching-'+family+'-'+count)
                        if img:
                            node=item(i,form);node['image']=img;comparisons.append(node)
            if comparisons:
                visuals.insert(0,{'id':'v-picture-examples','kind':'comparison',
                    'title':bi('See the meaning; read the form','अर्थ देखें, रूप पढ़ें'),
                    'explanation':bi('Compare the pictures with the live Sanskrit captions.','चित्रों की तुलना संस्कृत के रूपों से करें।'),
                    'items':comparisons})
                figures+=1;hit=True
            if visuals:card['visuals']=visuals
        if hit or lesson!=before:
            path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
            changed.append(lesson['id'])
    report={'illustrated_table_cells':cells,'picture_comparisons':figures,'lessons':changed,'delivered_library':sorted(delivered)}
    (HERE/'illustration-consumers.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
