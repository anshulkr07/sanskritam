"""Source-grounded duration, vowel-sign and र-order teaching figures."""
import json
from pathlib import Path

import yaml

from author_source_figures import bi

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    plans={
      'vowels.short':{
        't1':[{'id':'v-script-short-duration','kind':'comparison','title':bi('One short beat','एक छोटी मात्रा'),
               'items':[{'id':'v'+str(i),'sa':sa,'duration':1} for i,sa in enumerate(['अ','इ','उ'])]}],
        't2':[{'id':'v-script-rl-duration','kind':'comparison','title':bi('Each vowel carries one syllable','हर स्वर एक अक्षर का आधार'),
               'items':[{'id':'v'+str(i),'sa':sa,'duration':1} for i,sa in enumerate(['ऋ','ऌ'])]}]},
      'vowels.long':{'t1':[{'id':'v-script-duration-pairs','kind':'matrix','title':bi('Same place, different duration','वही स्थान, अलग अवधि'),
        'columns':[bi('Short','ह्रस्व'),bi('Long','दीर्घ')],
        'rows':[[{'id':'s'+str(i),'sa':a,'duration':1},{'id':'l'+str(i),'sa':b,'duration':2}] for i,(a,b) in enumerate([('अ','आ'),('इ','ई'),('उ','ऊ'),('ऋ','ॠ')])]}]},
      'vowels.compound':{'t2':[{'id':'v-script-joined-duration','kind':'comparison','title':bi('Each lasts two mātrās','हर एक की अवधि दो मात्राएँ'),
        'items':[{'id':'v'+str(i),'sa':sa,'duration':2} for i,sa in enumerate(['ए','ओ','ऐ','औ'])]}]},
      'vowels.signs':{
        't1':[{'id':'v-script-inherent','kind':'sequence','title':bi('A consonant and its vowel','व्यञ्जन और उसका स्वर'),
          'items':[{'id':'consonant','sa':'क्','meaning':bi('The consonant without a vowel.','स्वर के बिना व्यञ्जन।')},
                   {'id':'inherent','sa':'क् + अ → क','meaning':bi('The plain letter carries अ.','साधारण अक्षर में अ है।')},
                   {'id':'replace','sa':'क् + आ → का','meaning':bi('The sign supplies आ in place of the inherent अ.','मात्रा अन्तर्निहित अ की जगह आ देती है।')}]}],
        't3':[{'id':'v-script-i-order','kind':'sequence','title':bi('Written position and spoken order','लिखने का स्थान और बोलने का क्रम'),
          'items':[{'id':'whole','sa':'कि','meaning':bi('See the sign to the left of the consonant.','व्यञ्जन के बाईं ओर मात्रा देखें।')},
                   {'id':'first','sa':'क्','meaning':bi('Say the consonant first.','पहले व्यञ्जन बोलें।')},
                   {'id':'next','sa':'इ','meaning':bi('Say its vowel next.','फिर उसका स्वर बोलें।')},
                   {'id':'blend','sa':'कि','meaning':bi('Blend them into one syllable.','दोनों को मिलाकर एक अक्षर बोलें।')}]}]},
      'cons.virama':{'t1':[{'id':'v-script-virama','kind':'comparison','title':bi('Keep or remove the inherent vowel','अन्तर्निहित स्वर रखें या हटाएँ'),
        'items':[{'id':'with','sa':'क','meaning':bi('Consonant with अ.','अ के साथ व्यञ्जन।')},
                 {'id':'without','sa':'क्','meaning':bi('Virāma removes that vowel.','हलन्त उस स्वर को हटाता है।')}]}]},
      'joined.ra':{
        't1':[{'id':'v-script-repha','kind':'sequence','title':bi('र् is spoken first','र् पहले बोला जाता है'),
          'items':[{'id':'parts','sa':'र् + म','meaning':bi('र् comes before म in sound order.','बोलने में र्, म से पहले है।')},
                   {'id':'shape','sa':'र्म','meaning':bi('The repha is written above. Read र् before म.','रेफ ऊपर लिखा है। र् को म से पहले पढ़ें।')},
                   {'id':'word','sa':'धर्मः','meaning':bi('Find that order inside the word.','शब्द के भीतर वही क्रम पहचानें।')}]}],
        't2':[{'id':'v-script-rakara','kind':'sequence','title':bi('र follows the first consonant','र पहले व्यञ्जन के बाद'),
          'items':[{'id':'parts','sa':'प् + र','meaning':bi('The first consonant is प्.','पहला व्यञ्जन प् है।')},
                   {'id':'shape','sa':'प्र','meaning':bi('The hook below writes the following र.','नीचे का चिह्न बाद में आने वाले र को लिखता है।')},
                   {'id':'word','sa':'प्रियः','meaning':bi('Read the consonants in that order.','उसी क्रम में व्यञ्जन पढ़ें।')}]}]},
    }
    count=0
    for lid,cards in plans.items():
        path=next((ROOT/'backend/app/curriculum/content/acts').glob('*/*/'+lid+'.yaml'))
        lesson=yaml.safe_load(path.read_text(encoding='utf-8'))
        for cid,figures in cards.items():
            target=next(card for card in lesson['cards'] if card['id']==cid)
            target['visuals']=[v for v in target.get('visuals',[]) if not v['id'].startswith('v-script-')]
            target['visuals']=figures+target['visuals'];count+=len(figures)
        path.write_text(yaml.safe_dump(lesson,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'script-figures.json').write_text(json.dumps({'figures':count,'lessons':list(plans)},indent=2)+'\n',encoding='utf-8')
    print(f'{count} duration and writing-order figures in {len(plans)} lessons')


if __name__=='__main__':main()
