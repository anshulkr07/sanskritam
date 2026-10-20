"""Correct the identical-case shortcut before adding a relationship diagram.

Whitney, Sanskrit Grammar §§508–512 (public domain), especially the
different-case relative/correlative examples in §512a. New example is original.
This is new linguistic material: record the need for independent review rather
than carrying the former scholar sign-off over to a changed explanation.
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
    target=next(CONTENT.glob('*/*/pn.who.yaml'))
    lesson=yaml.safe_load(target.read_text(encoding='utf-8'))
    card=next(c for c in lesson['cards'] if c['id']=='t2')
    old=copy.deepcopy(card['body'])
    new=bi('A {{यः}} clause is paired with {{सः}}: {{यः पठति सः पण्डितः}}. They refer to the same person or thing and agree in gender and number. Each takes the case needed in its own clause; the cases need not match. {{यम् अहं पश्यामि सः पठति}}: the one whom I see reads.',
           '{{यः}} वाले उपवाक्य का सम्बन्ध {{सः}} वाले उपवाक्य से है: {{यः पठति सः पण्डितः}}। दोनों उसी व्यक्ति या वस्तु को बताते हैं और लिंग-वचन में मेल खाते हैं। हर सर्वनाम की विभक्ति उसके अपने उपवाक्य में काम से तय होती है; दोनों की विभक्ति अलग हो सकती है। {{यम् अहं पश्यामि सः पठति}}: जिसे मैं देखता हूँ, वह पढ़ता है।')
    revpath=next(CONTENT.glob('*/*/pn.revision.yaml'))
    rev=yaml.safe_load(revpath.read_text(encoding='utf-8'))
    row=next(r for c in rev['cards'] if c['kind']=='revision' for r in c['rows'] if 'same case in both halves' in r['rule']['en'])
    oldrev=copy.deepcopy(row['rule'])
    newrev=bi('{{यद्}} and {{तद्}} can refer to the same person or thing. They agree in gender and number; each takes the case required in its own clause, so their cases can differ.',
              '{{यद्}} और {{तद्}} उसी व्यक्ति या वस्तु को बता सकते हैं। लिंग और वचन में मेल रहता है; हर सर्वनाम की विभक्ति उसके अपने उपवाक्य से तय होती है, इसलिए विभक्तियाँ अलग हो सकती हैं।')
    replacements={old['en']:new['en'],old['hi']:new['hi'],oldrev['en']:newrev['en'],oldrev['hi']:newrev['hi']}
    def change(node):
        if isinstance(node,str):return replacements.get(node,node)
        if isinstance(node,list):return [change(v) for v in node]
        if isinstance(node,dict):return {k:change(v) for k,v in node.items()}
        return node
    source={'title':'Whitney, Sanskrit Grammar, §§508–512 (relative pronouns)',
            'url':'https://en.wikisource.org/wiki/Sanskrit_Grammar/Chapter_VII#512', 'licence':'public domain',
            'note':'Case distinction supported by the relative/correlative examples in §512a; teaching prose and new example are original.'}
    changed=[]
    for path in sorted(CONTENT.glob('*/*/*.yaml')):
        if path.name=='unit.yaml':continue
        original=yaml.safe_load(path.read_text(encoding='utf-8'));updated=change(original)
        if path==target:
            target_card=next(c for c in updated['cards'] if c['id']=='t2')
            example={'sa':'यम् अहम् पश्यामि सः पठति।','meaning':bi('The one whom I see reads.','जिसे मैं देखता हूँ, वह पढ़ता है।'),
              'words':[
                {'sa':'यम्','gloss':bi('whom','जिसे'),'check':{'type':'subanta','stem':'यद्','linga':'Pum','vibhakti':'Dvitiya','vacana':'Eka'}},
                {'sa':'अहम्','gloss':bi('I','मैं')},
                {'sa':'पश्यामि','gloss':bi('see','देखता हूँ'),'check':{'type':'tinanta','dhatu':'दृश्','lakara':'Lat','purusha':'Uttama','vacana':'Eka'}},
                {'sa':'सः','gloss':bi('he, the same person','वह, वही व्यक्ति'),'check':{'type':'subanta','stem':'तद्','linga':'Pum','vibhakti':'Prathama','vacana':'Eka'}},
                {'sa':'पठति','gloss':bi('reads','पढ़ता है'),'check':{'type':'tinanta','dhatu':'पठ्','lakara':'Lat','purusha':'Prathama','vacana':'Eka'}}]}
            target_card['examples'].append(example)
            nodes=[item(i,w) for i,w in enumerate(example['words'])]
            target_card.setdefault('visuals',[]).insert(0,{'id':'v-relative-cases','kind':'relations',
              'title':bi('Same person, different grammatical jobs','वही व्यक्ति, अलग व्याकरणिक काम'),
              'explanation':example['meaning'],'items':nodes,'edges':[
                {'source':'i0','target':'i3','label':bi('same referent; case can differ','वही व्यक्ति; विभक्ति अलग हो सकती है')},
                {'source':'i0','target':'i2','label':bi('object of seeing: द्वितीया','देखने का कर्म: द्वितीया')},
                {'source':'i3','target':'i4','label':bi('doer of reading: प्रथमा','पढ़ने का कर्ता: प्रथमा')}]})
        if updated!=original:
            updated['review']='engine_ok'
            if source not in updated['sources']:updated['sources'].append(source)
            path.write_text(yaml.safe_dump(updated,allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
            changed.append(updated['id'])
    (HERE/'grammar-review.json').write_text(json.dumps({'changed_lessons':changed,'status':'engine checks pending; independent Sanskrit review not claimed',
      'reason':'Remove an identical-case generalization for relative/correlative pronouns.','source':source,'before':old,'after':new},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Clarified relative-case explanations; new material marked engine_ok:',', '.join(changed))


if __name__=='__main__':main()
