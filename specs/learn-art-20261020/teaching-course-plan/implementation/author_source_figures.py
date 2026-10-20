"""Add worked analyses using existing reviewed examples; never invent Sanskrit.

Idempotent: only v-source-* figures owned by this pass are replaced. Curated
semantic illustrations and diagrams are authored separately.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CONTENT = ROOT / 'backend/app/curriculum/content'


def bi(en, hi):
    return {'en': en, 'hi': hi}


FEATURES = {
    'Pum': ('masculine', 'पुंलिंग'), 'Stri': ('feminine', 'स्त्रीलिंग'), 'Napumsaka': ('neuter', 'नपुंसकलिंग'),
    'Eka': ('singular', 'एकवचन'), 'Dvi': ('dual', 'द्विवचन'), 'Bahu': ('plural', 'बहुवचन'),
    'Prathama': ('प्रथमा', 'प्रथमा'), 'Dvitiya': ('द्वितीया', 'द्वितीया'), 'Trtiya': ('तृतीया', 'तृतीया'),
    'Caturthi': ('चतुर्थी', 'चतुर्थी'), 'Panchami': ('पञ्चमी', 'पञ्चमी'), 'Sasthi': ('षष्ठी', 'षष्ठी'),
    'Saptami': ('सप्तमी', 'सप्तमी'), 'Sambodhana': ('सम्बोधन', 'सम्बोधन'),
    'Lat': ('लट्', 'लट्'), 'Lan': ('लङ्', 'लङ्'), 'Lit': ('लिट्', 'लिट्'), 'Lrt': ('लृट्', 'लृट्'),
    'Lun': ('लुङ्', 'लुङ्'), 'Lot': ('लोट्', 'लोट्'), 'VidhiLin': ('विधिलिङ्', 'विधिलिङ्'),
    'AshirLin': ('आशीर्लिङ्', 'आशीर्लिङ्'), 'Lut': ('लुट्', 'लुट्'), 'Lrn': ('लृङ्', 'लृङ्'),
    'Let': ('लेट्', 'लेट्'), 'Kartari': ('कर्तरि', 'कर्तरि'), 'Karmani': ('कर्मणि', 'कर्मणि'), 'Bhave': ('भावे', 'भावे'),
}


def feature(check):
    if not check:
        return None
    values = []
    if check.get('stem'):
        values.append(bi('Stem: {{'+check['stem']+'}}', 'प्रातिपदिक: {{'+check['stem']+'}}'))
    if check.get('dhatu'):
        values.append(bi('Root: {{'+check['dhatu']+'}}', 'धातु: {{'+check['dhatu']+'}}'))
    for key in ('linga', 'vibhakti', 'vacana', 'lakara', 'prayoga'):
        value = check.get(key)
        if value in FEATURES:
            en, hi = FEATURES[value]
            # Sanskrit technical names use the actual Sanskrit face.
            values.append(bi('{{'+en+'}}' if re.search('[ऀ-ॿ]', en) else en, '{{'+hi+'}}'))
    if check.get('purusha'):
        labels = {'Prathama': bi('Third person ({{प्रथमपुरुष}})', 'प्रथमपुरुष'),
                  'Madhyama': bi('Second person ({{मध्यमपुरुष}})', 'मध्यमपुरुष'),
                  'Uttama': bi('First person ({{उत्तमपुरुष}})', 'उत्तमपुरुष')}
        values.append(labels[check['purusha']])
    return bi(' · '.join(v['en'] for v in values), ' · '.join(v['hi'] for v in values)) if values else None


def item(index, source, label=None):
    result = {'id': 'i'+str(index), 'sa': source['sa']}
    if label:
        result['label'] = label
    meaning = source.get('meaning') or source.get('gloss') or source.get('label')
    if meaning:
        result['meaning'] = copy.deepcopy(meaning)
    if source.get('check'):
        result['check'] = copy.deepcopy(source['check'])
        if value := feature(source['check']):
            result['feature'] = value
    if source.get('words'):
        result['words'] = copy.deepcopy(source['words'])
    return result


def worked(example, ident, explanation=None):
    nodes = [item(0, example, bi('Read the whole example', 'पूरा उदाहरण पढ़ें'))]
    for i, word in enumerate(example.get('words', []), 1):
        nodes.append(item(i, word, bi('Follow this word', 'इस शब्द पर ध्यान दें')))
    # A single inflected form still has an explicit feature analysis.
    if explanation:
        nodes.append({'id': 'rule', 'label': bi('Connect the form and the rule', 'रूप को नियम से जोड़ें'), 'meaning': copy.deepcopy(explanation)})
    nodes.append(item(len(nodes)+1, example, bi('Read it again with the meaning', 'अर्थ समझकर फिर पढ़ें')))
    return {'id': ident, 'kind': 'worked', 'title': bi('Read, examine, understand', 'पढ़ें, समझें, फिर पढ़ें'), 'items': nodes}


def keep_external(card, key):
    card[key] = [v for v in card.get(key, []) if not v['id'].startswith('v-source-')]


def core_digest(lesson):
    raw = copy.deepcopy(lesson)
    def strip(node):
        if isinstance(node, dict):
            return {k: strip(v) for k, v in node.items() if k not in ('visuals', 'feedback_visuals')}
        if isinstance(node, list):
            return [strip(v) for v in node]
        return node
    return hashlib.sha256(json.dumps(strip(raw), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def main():
    files = sorted((CONTENT/'acts').glob('*/*/*.yaml'))
    lessons = {p: yaml.safe_load(p.read_text(encoding='utf-8')) for p in files if p.name != 'unit.yaml'}
    before = {str(p.relative_to(ROOT)): core_digest(d) for p, d in lessons.items()}
    taught = {}
    totals = {'teaching_figures': 0, 'revision_new_explanations': 0, 'reading_alignments': 0, 'practice_feedback': 0, 'optional_depth_figures': 0}
    for p, lesson in lessons.items():
        for card in lesson['cards']:
            keep_external(card, 'visuals')
            keep_external(card, 'feedback_visuals')
            figures = []
            if card['kind'] == 'teach':
                if card.get('rows'):
                    figures.append({'id': 'v-source-compare', 'kind': 'comparison', 'title': bi('Compare the examples', 'उदाहरणों की तुलना करें'),
                                    'explanation': copy.deepcopy(card['body']), 'items': [item(i, r) for i, r in enumerate(card['rows'])]})
                if card.get('steps'):
                    figures.append({'id': 'v-source-forms', 'kind': 'comparison', 'title': bi('Follow the forms', 'रूपों पर ध्यान दें'),
                                    'items': [item(i, r) for i, r in enumerate(card['steps'])]})
                for i, example in enumerate(card.get('examples', [])):
                    figures.append(worked(example, 'v-source-example-'+str(i), card['body']))
                if not figures:
                    # Technical terms and source formulas remain exact, not guessed derivations.
                    terms = list(dict.fromkeys(re.findall(r'\{\{(.*?)\}\}', card['body']['en'])))
                    if card.get('formula'):
                        terms.insert(0, card['formula'])
                    if terms:
                        figures.append({'id': 'v-source-terms', 'kind': 'comparison', 'title': bi('Read the forms in the explanation', 'व्याख्या के रूप पढ़ें'),
                                        'explanation': copy.deepcopy(card['body']), 'items': [{'id':'i'+str(i), 'sa':sa} for i, sa in enumerate(terms)]})
                card['visuals'].extend(figures)
                totals['teaching_figures'] += len(figures)
                if card.get('depth') == 'panini':
                    totals['optional_depth_figures'] += len(figures)
                for skill in card.get('skills', []):
                    if figures and card.get('depth', 'core') == 'core':
                        taught.setdefault(skill, figures[0])
            elif card['kind'] == 'reading':
                for i, line in enumerate(card['passage']):
                    nodes = [item(0, line, bi('The complete line', 'पूरी पंक्ति'))]
                    nodes.extend(item(j+1, w) for j, w in enumerate(line.get('words', [])))
                    card['visuals'].append({'id': 'v-source-line-'+str(i), 'kind': 'reading', 'title': bi('Follow the line word by word', 'पंक्ति को शब्द-शब्द समझें'), 'items':nodes})
                    totals['reading_alignments'] += 1
            elif card['kind'] == 'revision':
                for i, row in enumerate(card['rows']):
                    keep_external(row, 'visuals')
                    if row.get('new_here') and row.get('example'):
                        row['visuals'].append(worked(row['example'], 'v-source-new-'+str(i), row['rule']))
                        totals['revision_new_explanations'] += 1
    for p, lesson in lessons.items():
        for card in lesson['cards']:
            if card['kind'] == 'practice':
                related = next((taught[s] for s in card.get('skills', []) if s in taught), None)
                if related:
                    feedback = copy.deepcopy(related)
                    feedback['id'] = 'v-source-feedback'
                    feedback['title'] = bi('Compare with a taught example', 'सीखे हुए उदाहरण से तुलना करें')
                    card['feedback_visuals'].append(feedback)
                    totals['practice_feedback'] += 1
        assert core_digest(lesson) == before[str(p.relative_to(ROOT))], 'Original content was changed'
        # Empty optional fields need not be authored into unchanged cards.
        def tidy(node):
            if isinstance(node, dict):
                for key in list(node):
                    if key in ('visuals', 'feedback_visuals') and not node[key]:
                        del node[key]
                    else:
                        tidy(node[key])
            elif isinstance(node, list):
                for value in node: tidy(value)
        tidy(lesson)
        p.write_text(yaml.safe_dump(lesson, allow_unicode=True, sort_keys=False, width=120), encoding='utf-8')
    (HERE/'source-preservation.json').write_text(json.dumps({'original_content_unchanged':True, 'lesson_core_hashes':before, 'counts':totals}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(totals, indent=2))


if __name__ == '__main__':
    main()
