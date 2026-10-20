"""Connect revision/feedback and add an unaided rereading at each unit's end.

All Sanskrit and translations are copied from the unit's actual source. This
is rereading/decoding transfer, not a claim to have authored 44 unseen passages.
"""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi, item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
CONTENT=ROOT/'backend/app/curriculum/content/acts'


def main():
    paths=[p for p in sorted(CONTENT.glob('*/*/*.yaml')) if p.name!='unit.yaml']
    lessons={}; locations={}
    for path in paths:
        value=yaml.safe_load(path.read_text('utf-8'));lessons[value['id']]=value;locations[value['id']]=path
    counts={'new_teach_figures':0,'feedback_completed':0,'revision_links_with_figures':0,'unit_rereadings':0}
    for lesson in lessons.values():
        for card in lesson['cards']:
            if card['kind']=='teach' and not card.get('visuals'):
                nodes=[]
                if card.get('term'):nodes.append(item(0,card['term']))
                nodes.append({'id':'explanation','meaning':copy.deepcopy(card['body'])})
                card['visuals']=[{'id':'v-foundation-concept','kind':'comparison','title':copy.deepcopy(card['title']),'items':nodes}];counts['new_teach_figures']+=1
    # Two skill families have no ordinary example list: the taught procedure
    # and source reading provide the relevant post-answer explanation instead.
    c2=next(c for c in lessons['c2.long']['cards'] if c['id']=='tb1')['visuals'][0]
    kss=next(c for c in lessons['kss.naming']['cards'] if c['kind']=='reading')
    kss_figure={'id':'v-foundation-source','kind':'reading','title':bi('Return to the source line','मूल पंक्ति पर लौटें'),
                'items':[item(i,line) for i,line in enumerate(kss['passage'])]}
    fallback={'sam.long':c2,'kss.read':kss_figure}
    for lesson in lessons.values():
        for card in lesson['cards']:
            if card['kind']=='practice' and not card.get('feedback_visuals'):
                source=next((fallback[s] for s in card.get('skills',[]) if s in fallback),None)
                assert source is not None,(lesson['id'],card['id'])
                figure=copy.deepcopy(source);figure['id']='v-foundation-feedback';card['feedback_visuals']=[figure];counts['feedback_completed']+=1
            if card['kind']=='revision':
                for n,row in enumerate(card['rows']):
                    if not row.get('taught_in'):continue
                    lid,cid=row['taught_in'].split('#');source=next(c for c in lessons[lid]['cards'] if c['id']==cid)
                    figures=source.get('visuals',[])
                    if not figures and source['kind']=='table':
                        figures=[{'id':'reference','kind':'matrix','title':source['title'],'columns':source['columns'],
                                  'rows':[[{'id':f'r{i}-c{j}',**{k:v for k,v in cell.items() if k in ('sa','image','feature','compare_from')},
                                            **({'label':cell['text']} if cell.get('text') else {})} for j,cell in enumerate(r)] for i,r in enumerate(source['rows'])]}]
                    if figures:
                        row['visuals']=[v for v in row.get('visuals',[]) if not v['id'].startswith('v-linked-')]
                        figure=copy.deepcopy(figures[0]);figure['id']='v-linked-'+str(n);row['visuals'].append(figure);counts['revision_links_with_figures']+=1
    transfers=[]
    for unit_path in sorted(CONTENT.glob('*/*/unit.yaml')):
        unit=yaml.safe_load(unit_path.read_text('utf-8'));candidates=[];forms=[];seen=set()
        for lid in unit['lessons']:
            for card in lessons[lid]['cards']:
                if card.get('depth','core')!='core':continue
                examples=card.get('examples',[]) if card['kind']=='teach' else card.get('passage',[]) if card['kind']=='reading' else []
                for example in examples:
                    if example['sa'] not in seen:
                        candidates.append((lid,card['id'],example));seen.add(example['sa'])
                if card['kind']=='teach':
                    for row in card.get('rows',[]):
                        if row['sa'] not in seen:forms.append((lid,card['id'],row));seen.add(row['sa'])
        selected=(candidates[-3:] if candidates else forms[-4:])
        if not selected:
            for lid in unit['lessons']:
                for card in lessons[lid]['cards']:
                    if card['kind']=='summary':
                        for point in card['points']:
                            if point.get('sa'):selected.append((lid,card['id'],{'sa':point['sa'],'meaning':point['text']}))
            selected=selected[-3:]
        assert selected,unit['id']
        lesson=lessons[unit['lessons'][-1]];summary=lesson['cards'][-1];assert summary['kind']=='summary'
        summary['visuals']=[v for v in summary.get('visuals',[]) if v['id']!='v-unit-reread']
        figure={'id':'v-unit-reread','kind':'reading','title':bi('Read again with the help closed','सहायता बन्द रखकर फिर पढ़ें'),
                'explanation':bi('Read aloud and explain each form or line. Then open the meaning and compare. These are examples from this unit.',
                                 'ज़ोर से पढ़ें और हर रूप या पंक्ति समझाएँ। फिर अर्थ खोलकर मिलाएँ। ये इसी अध्याय के उदाहरण हैं।'),
                'items':[item(i,source) for i,(_,_,source) in enumerate(selected)]}
        summary['visuals'].append(figure);counts['unit_rereadings']+=1
        transfers.append({'unit':unit['id'],'lesson':lesson['id'],'card':summary['id'],'sources':[lid+'#'+cid for lid,cid,_ in selected]})
    for lid,lesson in lessons.items():locations[lid].write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'foundation-completion.json').write_text(json.dumps({'counts':counts,'rereadings':transfers},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(counts)


if __name__=='__main__':main()
