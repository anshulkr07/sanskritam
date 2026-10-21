"""Finish the source's vowel-length and aspiration meaning contrasts."""
import copy
import json
from pathlib import Path
import yaml
from author_source_figures import bi,item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    deliveries={r['id']:r for r in json.loads((HERE/'artwork/deliveries.json').read_text('utf-8'))}
    alts={'family':bi('A family with two grandparents, two parents and two children','दो दादा-दादी, माता-पिता और दो बच्चों वाला परिवार'),
          'riverbank':bi('The grassy bank beside a river','नदी के पास घास वाला तट'),
          'hand':bi('One open hand with five digits','पाँच उँगलियों वाला एक खुला हाथ'),
          'donkey':bi('One complete grey donkey','एक पूरा धूसर गधा')}
    mapping={'vowels.long':{'कुलम्':'family','कूलम्':'riverbank'},'cons.breath':{'करः':'hand','खरः':'donkey'}}
    for lid,forms in mapping.items():
        path=next((ROOT/'backend/app/curriculum/content/acts').glob('*/*/'+lid+'.yaml'));lesson=yaml.safe_load(path.read_text('utf-8'))
        card=next(c for c in lesson['cards'] if c['id']=='t2');nodes=[]
        for i,example in enumerate(card['examples']):
            if example['sa'] not in forms:continue
            suffix=forms[example['sa']];key='teaching-'+suffix;r=deliveries[key]
            node=item(i,example);node['image']={'id':key,'brief':r['prompt'],'alt':alts[suffix],'ratio':r['ratio'],'text_in_image':r['expected']}
            nodes.append(node)
        card['visuals']=[v for v in card.get('visuals',[]) if v['id']!='v-word-contrast']
        card['visuals'].insert(0,{'id':'v-word-contrast','kind':'comparison','title':bi('A sound difference changes the word','ध्वनि का अन्तर, अलग शब्द'),
            'explanation':bi('Read each complete word and compare its meaning. The captions, not resemblance alone, identify the words.',
                             'हर पूरा शब्द पढ़ें और उसका अर्थ मिलाएँ। केवल चित्र के अनुमान से नहीं, लिखे शब्द से पहचानें।'),'items':nodes})
        path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'word-contrasts.json').write_text(json.dumps({'figures':2,'lessons':list(mapping),'new_assets':['teaching-'+x for x in alts]},indent=2)+'\n','utf-8')
    print('Four reviewed vocabulary paintings integrated into two sound contrasts')


if __name__=='__main__':main()
