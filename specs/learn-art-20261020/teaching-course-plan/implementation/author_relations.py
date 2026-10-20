"""Author contextual relationship figures from the exact source-word analyses."""
import copy
import json
from pathlib import Path

import yaml

from author_source_figures import bi, item

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CONTENT = ROOT/'backend/app/curriculum/content/acts'

# These are contextual interpretations of the specified example, not universal
# equations between a case and a semantic role. The noun/verb strings are copied
# from that example, together with its existing engine claims.
ROLES = {
 'who.doer': {'Prathama':bi('doer of this action','इस क्रिया का कर्ता')},
 'object.what': {'Prathama':bi('doer','कर्ता'),'Dvitiya':bi('object of this action','इस क्रिया का कर्म')},
 'object.where-to': {'Prathama':bi('one who goes','जाने वाला'),'Dvitiya':bi('destination','जहाँ जाना है')},
 'with.means': {'Trtiya':bi('means used','प्रयुक्त साधन')},
 'with.together': {'Trtiya':bi('companion, with सह','सह के साथ साथी')},
 'for.giving': {'Caturthi':bi('recipient of the gift','जिसे उपहार मिलता है'),'Dvitiya':bi('gift being given','दिया जाने वाला उपहार')},
 'from.away': {'Panchami':bi('source of movement','जहाँ से गति शुरू होती है')},
 'from.fear': {'Panchami':bi('what is feared in this example','इस उदाहरण में जिससे डर है')},
 'in.where': {'Saptami':bi('location in this example','इस उदाहरण का स्थान')},
 'pc.passive': {'Trtiya':bi('actual reader, expressed as agent','वास्तविक पढ़ने वाला, व्यक्त कर्ता'), 'Prathama':bi('book described by the passive verb','कर्मवाच्य क्रिया का उद्देश्य, पुस्तक')},
}


def main():
    changed, figures = [], 0
    for path in sorted(CONTENT.glob('*/*/*.yaml')):
        if path.name == 'unit.yaml': continue
        lesson = yaml.safe_load(path.read_text(encoding='utf-8'))
        hit = False
        for card in lesson['cards']:
            card['visuals'] = [v for v in card.get('visuals', []) if not v['id'].startswith('v-links-')]
            if card['kind'] != 'teach' or card.get('depth','core') != 'core': continue
            for index, example in enumerate(card.get('examples', [])):
                words = example.get('words', [])
                verbs = [i for i,w in enumerate(words) if w.get('check',{}).get('type') == 'tinanta']
                nodes, edges = [item(i, word) for i,word in enumerate(words)], []
                lid = lesson['id']
                if lid in ROLES and index == 0 and verbs:
                    verb = verbs[-1]
                    for i, word in enumerate(words):
                        case = word.get('check',{}).get('vibhakti')
                        if case in ROLES[lid]:
                            edges.append({'source':'i'+str(i),'target':'i'+str(verb),'label':ROLES[lid][case]})
                if lid == 'pc.cause' and index == 0 and verbs:
                    labels = {'गुरु':bi('causes the reading','पढ़वाता है'), 'बालक':bi('is made to read','जिससे पढ़वाया जाता है'), 'पाठ':bi('lesson read','पढ़ा जाने वाला पाठ')}
                    for i,word in enumerate(words):
                        stem = word.get('check',{}).get('stem')
                        if stem in labels: edges.append({'source':'i'+str(i),'target':'i'+str(verbs[-1]),'label':labels[stem]})
                if lid == 'num.agree' and len(words) == 2 and verbs:
                    edges.append({'source':'i0','target':'i1','label':bi('same number','एक ही वचन')})
                if lid == 'of.whose' and index == 0:
                    for i,word in enumerate(words[:-1]):
                        if word.get('check',{}).get('vibhakti') == 'Sasthi':
                            edges.append({'source':'i'+str(i),'target':'i'+str(i+1),'label':bi('related noun: belonging to','सम्बन्धित संज्ञा: जिसका है')})
                if lid == 'part.ktva' and index == 0 and len(words) == 4:
                    assert words[2]['sa'] == 'गत्वा' and words[3]['sa'] == 'पठति'
                    edges.extend([{'source':'i0','target':'i2','label':bi('same person goes','यही व्यक्ति जाता है')},
                                  {'source':'i0','target':'i3','label':bi('same person reads','यही व्यक्ति पढ़ता है')},
                                  {'source':'i2','target':'i3','label':bi('having gone, then reads','जाकर, फिर पढ़ता है')}])
                if lid == 'part.shatr' and index == 0 and len(words) == 3:
                    assert words[1]['sa'] == 'गच्छन्'
                    edges.extend([{'source':'i1','target':'i0','label':bi('describes the boy while going','जाते हुए बालक का विशेषण')},
                                  {'source':'i1','target':'i2','label':bi('actions overlap','दोनों क्रियाएँ साथ होती हैं')}])
                if lid == 'syn.who' and index == 0:
                    assert [w['sa'] for w in words] == ['यः','पठति','सः','जानाति']
                    edges.extend([{'source':'i0','target':'i2','label':bi('the same referent in both clauses','दोनों उपवाक्यों में वही व्यक्ति')},
                                  {'source':'i0','target':'i1','label':bi('who reads','जो पढ़ता है')},
                                  {'source':'i2','target':'i3','label':bi('he knows','वह जानता है')}])
                if lid == 'syn.when' and index == 0:
                    assert len(words) == 4 and words[0]['sa'] == 'रामे'
                    edges.extend([{'source':'i0','target':'i1','label':bi('background event: Rāma goes','पृष्ठभूमि की घटना: राम जाता है')},
                                  {'source':'i2','target':'i3','label':bi('main event: another subject','मुख्य घटना: दूसरा कर्ता')},
                                  {'source':'i1','target':'i3','label':bi('sets the time for the main event','मुख्य घटना का समय बताता है')}])
                if edges:
                    card['visuals'].insert(0, {'id':'v-links-'+str(index),'kind':'relations',
                        'title':bi('How the words are connected','शब्द कैसे जुड़े हैं'),
                        'explanation':copy.deepcopy(example['meaning']), 'items':nodes,'edges':edges})
                    hit = True; figures += 1
            if not card['visuals']: card.pop('visuals')
        if hit:
            path.write_text(yaml.safe_dump(lesson, allow_unicode=True, sort_keys=False, width=120),encoding='utf-8')
            changed.append(lesson['id'])
    (HERE/'relations.json').write_text(json.dumps({'figures':figures,'lessons':changed},indent=2)+'\n',encoding='utf-8')
    print(f'{figures} source-grounded relation figures in {len(changed)} lessons')


if __name__ == '__main__': main()
