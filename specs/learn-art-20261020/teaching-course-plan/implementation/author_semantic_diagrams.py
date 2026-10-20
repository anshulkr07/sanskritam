"""Exact counts and conversational viewpoint are live, deterministic graphics."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi,item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def matrix(card,ident,title,explanation=None):
    result={'id':ident,'kind':'matrix','title':title,'columns':copy.deepcopy(card['columns']),
            'rows':[[{'id':f'r{i}-c{j}',**{k:copy.deepcopy(v) for k,v in cell.items() if k in ('sa','check','image','feature','compare_from')},
                      **({'label':copy.deepcopy(cell['text'])} if cell.get('text') else {})} for j,cell in enumerate(row)] for i,row in enumerate(card['rows'])]}
    if explanation:result['explanation']=explanation
    return result


def main():
    counts={'conversation_figures':0,'count_figures':0,'distance_figures':0};locations=[]
    for path in sorted((ROOT/'backend/app/curriculum/content/acts').glob('*/*/*.yaml')):
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text('utf-8'));before=copy.deepcopy(lesson)
        for card in lesson['cards']:
            card['visuals']=[v for v in card.get('visuals',[]) if not v['id'].startswith('v-cue-')]
            lid=lesson['id']
            if lid in ('you.i','you.you') and card['id']=='t1':
                role='speaker' if lid=='you.i' else 'listener'
                nodes=[{**item(i,row),'diagram':{'kind':'conversation','role':role,'quantity':i+1,'plural':i==2}} for i,row in enumerate(card['rows'])]
                card['visuals'].insert(0,{'id':'v-cue-conversation','kind':'comparison','title':bi('Whose viewpoint? How many?','किसका दृष्टिकोण? कितने?'),'items':nodes});counts['conversation_figures']+=1
            if lid in ('you.grid','you.be','atm.te') and card['kind']=='table' and len(card['rows'])==3 and len(card['columns'])==4:
                figure=matrix(card,'v-cue-person-grid',bi('Person and number together','पुरुष और वचन साथ में'))
                for i,row in enumerate(figure['rows']):
                    for j,cell in enumerate(row[1:],1):cell['diagram']={'kind':'conversation','role':['referent','listener','speaker'][i],'quantity':j,'plural':j==3}
                card['visuals'].insert(0,figure);counts['conversation_figures']+=1
            if lid=='gender.this' and card['id']=='tb1':
                figure=matrix(card,'v-cue-distance',bi('Distance from the current speaker','अभी बोलने वाले से दूरी'),
                              bi('This diagram illustrates physical near/far reference. A pronoun can also refer back to something already mentioned; distance alone does not explain every use.',
                                 'यह चित्र पास-दूर का भौतिक सम्बन्ध दिखाता है। सर्वनाम पहले कही वस्तु का भी संकेत कर सकता है; केवल दूरी से हर प्रयोग नहीं समझाया जा सकता।'))
                for row in figure['rows']:
                    row[1]['diagram']={'kind':'position','relation':'near'};row[2]['diagram']={'kind':'position','relation':'far'}
                card['visuals'].insert(0,figure);counts['distance_figures']+=1
            if lid in ('pn.count','pn.time') and card['kind']=='table' and card['columns'][0]['en']=='Number':
                figure=matrix(card,'v-cue-counts',bi('Count the groups and read the word','समूह गिनें और शब्द पढ़ें'))
                for row in figure['rows']:
                    number=int(row[0]['label']['en']);row[0]['diagram']={'kind':'count','quantity':number}
                card['visuals'].insert(0,figure);counts['count_figures']+=1
            if lid=='joined.marks' and card['id']=='tb1':
                figure=matrix(card,'v-cue-numerals',bi('A numeral and its exact count','अंक और उसकी ठीक संख्या'))
                for i,row in enumerate(figure['rows']):row[0]['diagram']={'kind':'count','quantity':i}
                card['visuals'].insert(0,figure);counts['count_figures']+=1
            if not card['visuals']:card.pop('visuals')
        if lesson!=before:
            path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8');locations.append(lesson['id'])
    (HERE/'semantic-diagrams.json').write_text(json.dumps({'counts':counts,'lessons':locations},indent=2)+'\n','utf-8');print(counts)


if __name__=='__main__':main()
