"""Expose source-authored procedures one stage at a time and label checked cells."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi, feature

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    procedures=0;cells=0;lessons=[]
    for path in sorted((ROOT/'backend/app/curriculum/content/acts').glob('*/*/*.yaml')):
        if path.name=='unit.yaml':continue
        lesson=yaml.safe_load(path.read_text(encoding='utf-8'));hit=False
        for card in lesson['cards']:
            if card['kind']!='table':continue
            for row in card['rows']:
                for cell in row:
                    if value:=feature(cell.get('check')):
                        cell['feature']=value;cells+=1;hit=True
            columns=card['columns']
            header=columns[0]['en'].lower()
            is_procedure=header=='step' or lesson['id']=='pg.prakriya'
            card['visuals']=[v for v in card.get('visuals',[]) if v['id']!='v-procedure']
            if is_procedure:
                nodes=[]
                for i,row in enumerate(card['rows']):
                    if lesson['id']=='pg.prakriya':
                        node={'id':'stage-'+str(i),'sa':row[0]['sa'],'label':copy.deepcopy(row[2]['text']),
                              'feature':bi('Rule: {{'+row[1]['sa']+'}}','सूत्र: {{'+row[1]['sa']+'}}')}
                    elif len(row)==2:
                        node={'id':'stage-'+str(i)}
                        node['label']=copy.deepcopy(row[0].get('text') or bi('Stage: {{'+row[0].get('sa','')+'}}','चरण: {{'+row[0].get('sa','')+'}}'))
                        if row[1].get('sa'):node['sa']=row[1]['sa']
                        else:node['meaning']=copy.deepcopy(row[1]['text'])
                    else:
                        node={'id':'stage-'+str(i),'label':copy.deepcopy(row[1]['text'])}
                        if row[-1].get('sa'):node['sa']=row[-1]['sa']
                        else:node['meaning']=copy.deepcopy(row[-1]['text'])
                    nodes.append(node)
                if card.get('note'):nodes.append({'id':'conclusion','label':bi('What the steps show','इन चरणों से क्या समझें'),'meaning':copy.deepcopy(card['note'])})
                card['visuals'].append({'id':'v-procedure','kind':'worked','title':bi('Work through the example','उदाहरण को चरण-चरण समझें'),'items':nodes})
                procedures+=1;hit=True
            if not card['visuals']:card.pop('visuals')
        if hit:
            path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8');lessons.append(lesson['id'])
    report={'source_authored_procedures':procedures,'checked_cells_with_features':cells,'lessons':lessons}
    (HERE/'worked-tables.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(f'{procedures} progressive procedures; {cells} cells labelled from their existing engine claims')


if __name__=='__main__':main()
