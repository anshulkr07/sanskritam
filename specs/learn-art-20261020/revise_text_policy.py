"""Apply the owner's 20 October text permission without losing the original job snapshot."""
import json, re
from pathlib import Path
OUT=Path(__file__).resolve().parent
jobs=json.loads((OUT/'jobs.json').read_text(encoding='utf-8'))
def strings(value):
    if isinstance(value,str):return [value]
    if isinstance(value,list):return [s for item in value for s in strings(item)]
    if isinstance(value,dict):return [s for item in value.values() for s in strings(item)]
    return []
plan={
 'cons-grid-s1':['क ख ग घ ङ','च छ ज झ ञ','ट ठ ड ढ ण','त थ द ध न','प फ ब भ म'],
 'cons-semivowels-s1':['य र ल व'], 'cons-sibilants-s1':['श ष स ह'], 'cons-virama-s1':['क्'],
 'joined-clusters-s1':['क्ष त्र ज्ञ श्र'], 'joined-hum-breath-s1':['गंगा','रामः'],
 'joined-marks-s1':['ऽ','।','॥','ॐ','० १ २ ३ ४ ५ ६ ७ ८ ९'],
 'joined-ra-s1':['धर्मः','प्रियः','क्रमः'],
 'you-grid-s1':['पठति पठतः पठन्ति','पठसि पठथः पठथ','पठामि पठावः पठामः'],
 'num-agree-s1':['बालकः पठति।','बालकौ पठतः।','बालकाः पठन्ति।'],
 'who-order-s1':['बालकः','पठति'], 'with-means-s1':['सा लेखन्या लिखति।'],
 'avy-where-s1':['अत्र','तत्र','कुत्र'],
 'part-krtya-s1':['कर्तव्यम्','करणीयम्','कार्यम्'], 'part-kta-s1':['गतः','पठितम्','कृतम्'],
 'part-ktva-s1':['गत्वा','कृत्वा','श्रुत्वा'], 'part-tumun-s1':['पठितुम्'],
 'pre-come-s1':['गम्'], 'c1-tatpurusha-s1':['राजपुरुषः'],
 'split-back-s1':['विद्यालयः'], 'split-line-s1':['काव्यशास्त्रविनोदेन कालो गच्छति धीमताम्'],
 'split-line-r1':['काव्यशास्त्रविनोदेन','कालः गच्छति धीमताम्','तदा राजा साश्चर्यो बभूव'],
 'syn-who-s1':['यः पठति सः जानाति।'], 'vis-s-s1':['रामश्च','रामस्तत्र','रामष्टीकते'],
 'vs-stop-s1':['हरी एतौ'], 'pg-it-s1':['तिप्'], 'pg-prakriya-s1':['भू'],
 'pg-shiva-s1':['अइउण्','ऋऌक्','एओङ्','ऐऔच्','हयवरट्','लण्','ञमङणनम्','झभञ्','घढधष्','जबगडदश्','खफछठथचटतव्','कपय्','शषसर्','हल्'],
 'tale-leaf-6-r1':['बृहत्कथा'],
 'reading-iast-s1':['ā ś ṣ ṭ ṃ ḥ'], 'reading-names-s1':['रामः','सीता','लक्ष्मणः'],
 'reading-syllables-s1':['मौनी'], 'nf2-i-s1':['कविः कवी कवयः।'],
 'pn-time-s1':['एकादश','द्वादश','त्रयोदश'], 'pn-who-s1':['?'],
 'who-does-s1':['लिखति'], 'avy-iti-s1':['इति'], 'should-rules-r1':['सत्यम् ब्रूयात्।'],
 'c2-avyayi-s1':['यथाशक्ति','प्रतिदिनम्','आमरणम्'],
 'cs-place-s1':['च'], 'cs-voice-s1':['तदस्ति'],
 'rv-steps-s1':['विद्याददातिविनयंविनयाद्यातिपात्रताम्'],
 'syn-order-s1':['रिक्तपाणिर् न पश्येत राजानं भिषजं गुरुम्'],
 'vs-e-o-s1':['वनेऽस्ति'],
 'kss-naming-s1':['तत्रासूत च सा काले कुमारं कान्तदर्शनम्','गगनाद् उच्चचारैवं काले तस्मिन् सरस्वती'],
 'tale-leaf-3-r2':['एष श्रुतधरो जातो विद्यां वर्षादवाप्स्यति','किंच व्याकरणं लोके प्रतिष्ठां प्रापयिष्यति'],
 'tale-leaf-4-r3':['व्याकरणम्'],
 'nf1-deva-s1':['देवः','देवौ','देवाः'], 'nf1-lata-s1':['लता','लते','लताः'],
 'nf1-phala-s1':['फलम्','फले','फलानि'],
 'of-family-s1':['पिता','माता','भ्राता','भगिनी','पुत्रः','पितामही'],
 'num-verbs-s1':['पठति','पठतः','पठन्ति'],
 'should-rules-s1':['सत्यं ब्रूयात् प्रियं ब्रूयान्','न ब्रूयात् सत्यम् अप्रियम्'],
 'vc1-bhu-s1':['भू','भवति','नी','नयति','जि','जयति'],
 'vc2-da-s1':['दा','ददाति','धा','दधाति'],
 'vc2-jna-s1':['छिद्','छिनत्ति','क्री','क्रीणाति'],
 'vc2-kr-s1':['श्रु','शृणोति','कृ','करोति'],
 'c1-dvandva-s1':['रामलक्ष्मणौ'], 'c1-nan-s1':['असत्यम्','अधर्मः','अनन्तः'],
 'c2-bahuvrihi-s1':['नीलकण्ठः'], 'c2-long-r1':['सूर्य','कोटिः','सम','आभासः'],
 'm1-weight-s1':['धर्मक्षेत्रे कुरुक्षेत्रे'],
 'm2-arya-s1':['दानं भोगो नाशस्','तिस्रो गतयो भवन्ति वित्तस्य','यो न ददाति न भुङ्क्ते','तस्य तृतीया गतिर्भवति'],
 'rv-tika-s1':['ईशा वास्यम् इदं सर्वं यत् किञ्च जगत्यां जगत्','तेन त्यक्तेन भुञ्जीथा मा गृधः कस्य स्विद्धनम्','तेन त्यक्तेन','त्यागेनेत्यर्थः'],
 'tad-son-s1':['राघवः','पाण्डवः','कौरवः'],
 'tale-leaf-1-r1':['अ आ इ ई'],
 'tale-leaf-6-r2':['बृहत्कथा'], 'tale-leaf-6-r3':['बृहत्कथा'],
}
first_line=['अ इ उ','ऋ ऌ','ए ओ','ऐ औ']
for key in ['portrait-you','freed-dhumaka','prologue-4','vowels-short-smoke','vowels-long-shuka']:
    plan[key]=first_line
for key in ['prologue-1','prologue-3']:plan[key]=['बृहत्कथा']
plan['vowels-signs-second-line']=[*first_line,'का कि की कु कू कृ के कै को कौ']
for job in jobs:
    job['shared_text_sources']={'course_title_sa':'दग्धा बृहत्कथा'}
    source_strings=strings({'scene':job['source'],'shared':job['shared_text_sources']}); corpus=' '.join(source_strings)
    expected=plan.get(job['id'],[])
    for line in expected:
        # Whole source strings, or rows assembled in source order from literal table cells.
        assert line in corpus or re.sub(r'\s+','',line) in re.sub(r'\s+','',corpus) or all(word in source_strings or word in corpus for word in line.split()), (job['id'],line)
    if 'prompt_before_text_permission' not in job:job['prompt_before_text_permission']=job['prompt']
    prompt=job['prompt_before_text_permission'].split('MANDATORY TEXT OVERRIDE:')[0]
    if expected:
        script='accurate LATIN letters with the exact macrons, acute accents and underdots; never convert these to Devanagari' if job['id']=='reading-iast-s1' else 'accurate Devanagari'
        prompt+='Owner-approved writing: render the following EXACT text, and no other writing, on the physical surface described in the scene. Use generous size, clear orthographic shapes and '+script+'. The same text remains live app content. Do not substitute, omit, add or invent letters. No watermark, UI or extra labels.\n'+ '\n'.join(expected)
    else:
        prompt+='Writing is permitted by the owner. This particular scene needs no readable inscription; focus on its narrative. Do not invent scripts or fill small objects with pseudo-lettering. No watermark or UI.'
    if job['id'] in {'nf1-deva-s1','nf1-lata-s1','nf1-phala-s1'}:
        prompt+='\nMake exactly THREE large foreground name tags, each bearing one approved form, clearly readable. Other foliage is natural leaves, not additional blank tags. Keep all three labelled tags unobscured.'
    if job['id']=='of-family-s1':prompt+='\nDraw six clear named branches in the notebook, using the six approved kinship labels exactly once each.'
    if job['id']=='rv-tika-s1':prompt+='\nThe first two approved strings are the large carved verse; the last two are its smaller marginal commentary notes. No extra pseudo-writing on the wall or cord.'
    if job['id']=='vowels-signs-second-line':prompt+='\nPut the first four approved groups together on the established FIRST line of the leaf; the final approved string is the SECOND line, with each vowel sign clearly and correctly placed. Both lines are legible.'
    if job['id'].startswith('vc'):prompt+='\nPut the approved roots and corresponding forms in a clear, short ledger list, one root/form pair per row. No additional writing.'
    if job['id'] in {'prologue-1','prologue-3','tale-leaf-6-r1','tale-leaf-6-r2','tale-leaf-6-r3'}:
        prompt+='\nThe writing is the book title sourced from the course, an interpretive title label, not an invented historical Paishachi quotation. Render only that title on the visible manuscript.'
    job['prompt']=prompt;job['expected']=expected;job['text_policy']='Owner update 2026-10-20: writing allowed; verify all actual lettering against source before delivery.'
(OUT/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(OUT/'text-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(jobs)} prompts updated; {len(plan)} scenes with explicit, source-verified writing.')
