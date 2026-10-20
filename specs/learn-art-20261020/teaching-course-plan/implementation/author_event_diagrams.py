"""Show event order from source examples without turning moods into tenses."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi,item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    count=0;consumers=[]
    for path in sorted((ROOT/'backend/app/curriculum/content/acts').glob('*/*/*.yaml')):
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text('utf-8'));before=copy.deepcopy(lesson);lid=lesson['id']
        for card in lesson['cards']:
            if card['kind']!='teach' or card.get('depth','core')!='core':continue
            card['visuals']=[v for v in card.get('visuals',[]) if not v['id'].startswith('v-event-')]
            for n,example in enumerate(card.get('examples',[])):
                words=example.get('words',[]);events=[];explanation=None;anchor=None
                if lid=='part.ktva':
                    earlier=next((w for w in words if w.get('check',{}).get('krt')=='ktvA'),None)
                    main=next((w for w in words if w.get('check',{}).get('type')=='tinanta'),None)
                    if earlier and main:
                        events=[{'label':bi('{{'+earlier['sa']+'}} — completed first','{{'+earlier['sa']+'}} — पहले पूरा हुआ'),'start':0,'end':3},
                                {'label':bi('{{'+main['sa']+'}} — main action follows','{{'+main['sa']+'}} — फिर मुख्य क्रिया'),'start':5,'end':9}]
                        explanation=bi('The same subject performs both actions. The first is completed before the main action.','दोनों काम एक ही कर्ता करता है। पहला काम मुख्य क्रिया से पहले पूरा होता है।')
                elif lid=='part.shatr' and n<2:
                    assert len(words)==3
                    events=[{'label':bi('{{'+words[1]['sa']+'}} — ongoing circumstance','{{'+words[1]['sa']+'}} — साथ चल रही क्रिया'),'start':0,'end':9},
                            {'label':bi('{{'+words[2]['sa']+'}} — main action','{{'+words[2]['sa']+'}} — मुख्य क्रिया'),'start':2,'end':7}]
                    explanation=bi('These actions overlap and describe the same participant. Compare the completed-first construction in the earlier lesson.','ये काम साथ होते हैं और एक ही व्यक्ति के हैं। पहले पाठ की पहले-समाप्त क्रिया से तुलना करें।')
                elif lid=='syn.when' and n<2:
                    assert len(words)==4
                    completed=words[1].get('check',{}).get('krt')=='kta'
                    events=[{'label':bi('{{'+words[0]['sa']+' '+words[1]['sa']+'}} — background event','{{'+words[0]['sa']+' '+words[1]['sa']+'}} — पृष्ठभूमि की घटना'),'start':0,'end':3 if completed else 9},
                            {'label':bi('{{'+words[2]['sa']+' '+words[3]['sa']+'}} — main event','{{'+words[2]['sa']+' '+words[3]['sa']+'}} — मुख्य घटना'),'start':5 if completed else 2,'end':9 if completed else 7}]
                    explanation=bi('The background phrase and main clause have different subjects. Read the participle to decide whether the background event is completed or ongoing.','पृष्ठभूमि के पदसमूह और मुख्य वाक्य के कर्ता अलग हैं। कृदन्त से पहचानें कि पृष्ठभूमि की घटना पूरी हो गई है या चल रही है।')
                elif lid in ('past.augment','future.sya'):
                    verbs=[w for w in words if w.get('check',{}).get('type')=='tinanta']
                    target='Lan' if lid=='past.augment' else 'Lrt'
                    if len(verbs)==1 and verbs[0]['check'].get('lakara')==target:
                        past=target=='Lan';anchor=5
                        events=[{'label':bi('{{'+verbs[0]['sa']+'}} — '+('before the reference time' if past else 'after the reference time'),'{{'+verbs[0]['sa']+'}} — '+('सन्दर्भ के समय से पहले' if past else 'सन्दर्भ के समय के बाद')),'start':0 if past else 6,'end':3 if past else 9}]
                if events:
                    node=item(0,example);node['diagram']={'kind':'timeline','events':events}
                    if anchor is not None:node['diagram']['anchor']=anchor
                    figure={'id':'v-event-'+str(n),'kind':'reading','title':bi('Follow the events','घटनाओं का क्रम समझें'),'items':[node]}
                    if explanation:figure['explanation']=explanation
                    card['visuals'].insert(0,figure);count+=1;consumers.append(lid+'#'+card['id'])
        if lesson!=before:path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'event-diagrams.json').write_text(json.dumps({'figures':count,'cards':consumers},indent=2)+'\n','utf-8');print(count,'event diagrams')


if __name__=='__main__':main()
