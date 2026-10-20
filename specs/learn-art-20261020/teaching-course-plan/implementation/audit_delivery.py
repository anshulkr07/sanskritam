"""Read-only implementation inventory, distinct from the historical proposal."""
import collections
import json
from pathlib import Path

import yaml

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def walk(node,path=''):
    yield path,node
    if isinstance(node,dict):
        for key,value in node.items():yield from walk(value,path+'.'+key)
    elif isinstance(node,list):
        for i,value in enumerate(node):yield from walk(value,path+f'[{i}]')


def main():
    # The earlier snapshots are immutable. Compare old fields, rather than
    # mistaking additive figure metadata or YAML formatting for removed lessons.
    old={}
    for p in (ROOT/'specs/learn-art-20261020/teaching-visual-audit').glob('act-*-cards.json'):
        for r in json.loads(p.read_text('utf-8')):old[(r['lesson'],r['card'])]=r['content']
    changed=[];missing=[];new_cards=[];rows=[];totals=collections.Counter();art=set();definitions={}
    def compare(a,b,path):
        if isinstance(a,dict):
            if not isinstance(b,dict):changed.append(path);return
            for key,value in a.items():
                # Model defaults omitted by YAML are equivalent to their old
                # empty value, not a lost source sentence or answer.
                if key not in b and value in (None,[],{},False,''):continue
                if key not in b:changed.append(path+'.'+key+' [missing]')
                else:compare(value,b[key],path+'.'+key)
        elif isinstance(a,list):
            if not isinstance(b,list) or len(b)<len(a):changed.append(path+' [shortened]');return
            for i,value in enumerate(a):compare(value,b[i],path+f'[{i}]')
        elif a!=b:changed.append(path)
    delivered={r['id']:r for r in json.loads((HERE/'artwork/deliveries.json').read_text('utf-8'))}
    for p in sorted((ROOT/'backend/app/curriculum/content/acts').glob('*/*/*.yaml')):
        if p.name=='unit.yaml':continue
        lesson=yaml.safe_load(p.read_text('utf-8'));lid=lesson['id'];images=set();figures=collections.Counter();feedback=0;core=0;depth=0;reading=0
        for card in lesson['cards']:
            key=(lid,card['id'])
            if key in old:compare(old.pop(key),card,lid+'#'+card['id'])
            else:new_cards.append(lid+'#'+card['id'])
            totals['cards']+=1
            if card['kind']=='table':totals['live_tables']+=1
            if card['kind']=='teach':
                totals['teach_cards']+=1
                if card.get('visuals'):
                    if card.get('depth','core')=='core':core+=1
                    else:depth+=1
            if card['kind']=='practice':
                totals['practice_cards']+=1
                if card.get('feedback_visuals'):feedback+=1
            if card['kind']=='reading':reading+=1
            for where,value in walk(card):
                if not isinstance(value,dict):continue
                if value.get('kind') in ('figures','comparison','sequence','matrix','relations','worked','reading','beats','sound_range') and '.visuals[' in where:
                    figures[value['kind']]+=1
                img=value.get('image')
                if isinstance(img,dict):
                    images.add(img['id']);art.add(img['id'])
                    if img['id'] in definitions:assert definitions[img['id']]==img,'Conflicting image definition '+img['id']
                    definitions[img['id']]=img
        totals['teaching_figures']+=sum(figures.values());totals['feedback_cards']+=feedback;totals['core_teach_with_figures']+=core;totals['depth_teach_with_figures']+=depth;totals['reading_cards']+=reading
        rows.append({'act':p.parents[1].name,'unit':p.parent.name,'lesson':lid,'title':lesson['title']['en'],'template':lesson['template'],'figures':dict(figures),'unique_images':len(images),'images':sorted(images),'feedback_cards':feedback})
    assert not old,'Old cards were removed: '+str(list(old))
    assert totals['feedback_cards']==totals['practice_cards']
    assert totals['teach_cards']==totals['core_teach_with_figures']+totals['depth_teach_with_figures']
    assert set(delivered)<=art,'New paintings lack a consumer: '+str(set(delivered)-art)
    totals['unit_lessons']=len(rows);totals['canonical_lesson_images']=len(art);totals['new_delivered_images']=len(delivered)
    # Expected source prose correction. New examples are additive; original
    # examples/answers are not removed. Any other source difference is flagged.
    unexpected=[s for s in changed if not s.startswith(('pn.who#','pn.revision#'))]
    report={'counts':dict(totals),'source_preservation':{'original_cards_retained':True,'changed_original_fields':changed,'unexpected_original_changes':unexpected,'new_cards':new_cards},'lessons':rows,
            'scope_note':'Counts of implemented figures are not a claim that all 574 proposed teaching jobs have been independently checked.'}
    (HERE/'delivery-inventory.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
    lines=['# Implemented lesson inventory','',report['scope_note'],'','| Act | Unit | Lesson | Figures | Unique paintings | Feedback cards |','|---|---|---|---:|---:|---:|']
    for row in rows:lines.append(f"| {row['act']} | {row['unit']} | `{row['lesson']}` — {row['title']} | {sum(row['figures'].values())} | {row['unique_images']} | {row['feedback_cards']} |")
    (HERE/'LESSON-INVENTORY.md').write_text('\n'.join(lines)+'\n','utf-8')
    print(json.dumps({'counts':dict(totals),'unexpected_original_changes':unexpected,'changed_original_field_count':len(changed),'new_cards':new_cards},ensure_ascii=False,indent=2))
    assert not unexpected,'Unexpected changes to original source material'


if __name__=='__main__':main()
