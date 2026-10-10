"""Render the 2026-10-09 benchmark with the assistant's explicit content review.

Content labels below are review judgments after reading every response, not
an automatic factuality scorer. Contract checks remain unchanged in raw files.
"""
import json
import statistics
from pathlib import Path

OUT=Path(__file__).resolve().parents[1]/'results'/'rag_models_20261009'
DISPLAY={'gemini_flash':'Gemini 3.8 Flash (Vertex)', 'deepseek_flash':'DeepSeek V4.1 Flash (OpenRouter)',
         'sarvam_105b':'Sarvam 105B standard', 'gemma_paid':'Gemma 4 31B (paid OpenRouter)',
         'nemotron_free':'Nemotron 3 Super 120B (free OpenRouter)'}
RATES={'gemini_flash':('USD',.75,3.75),'deepseek_flash':('USD',.30,1.20),
       'sarvam_105b':('INR',29.28,73.20),'gemma_paid':('USD',.09,.34),
       'nemotron_free':('USD',0,0)}
EXCEPTIONS={
 ('gemma_paid','11_media_absent'):('partial','Explains verse and sets insufficient_context=true, but does not tell the learner the requested audio URL is unavailable.'),
 ('nemotron_free','11_media_absent'):('partial','Does not explain missing audio despite true flag; also substitutes a familiar translation about being the cause of results for the supplied motive wording.'),
 ('nemotron_free','12_karaoke_seek'):('incorrect','Answers 4.3, the line end time. Correct start is 2700 ms = 2.7 seconds.'),
}
METADATA_NOTES={
 ('sarvam_105b','10_missing_date'):'Correctly abstains, but cites G247 despite the contract requiring empty source_ids when nothing answers the question.',
 ('deepseek_flash','12_karaoke_seek'):'Correct 2.7-second answer; unnecessarily populates quote despite no quotation request.',
}
reviews=[]
summaries=[]
for label,display in DISPLAY.items():
 rows=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(OUT.glob(label+'__*.json'))]
 assert len(rows)==15 and all(r['parsed'] for r in rows),label
 for row in rows:
  key=(label,row['case_id'])
  verdict,note=EXCEPTIONS.get(key,('correct','Substantive question answered correctly; supplied references and language appropriate.'))
  metadata=METADATA_NOTES.get(key,'')
  if row['case_id'] in ['14_translation_difference','15_evidence_boundary']:
   metadata+=' Original boolean expectation was too strict: the negative evidence question can be answered from context, so false is defensible. Not counted as an accuracy error.'
  reviews.append({'model':label,'case':row['case_id'],'content_verdict':verdict,'review_note':note,'metadata_note':metadata.strip(),'raw_file':f"{label}__{row['case_id']}.json"})
 counts={v:sum(r['content_verdict']==v for r in reviews if r['model']==label) for v in ['correct','partial','incorrect']}
 pin=sum(r['prompt_tokens'] for r in rows); pout=sum(r['completion_tokens'] for r in rows)
 currency,ri,ro=RATES[label]
 summaries.append({'model':label,'display':display,**counts,'median_seconds':round(statistics.median(r['latency_ms']/1000 for r in rows),2),'max_seconds':round(max(r['latency_ms']/1000 for r in rows),2),'input_tokens':pin,'output_tokens':pout,'estimated_cost':round((pin*ri+pout*ro)/1e6,6),'currency':currency,'raw_contract_passes':sum(r['contract_pass'] for r in rows),'json_valid':sum(r['checks']['json_schema'] for r in rows)})
(OUT/'content_review.json').write_text(json.dumps({'reviewer':'Codex assistant manual review, not independent expert adjudication','cases':reviews,'summary':summaries},ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Small RAG answer-generation comparison — 9 October 2026','',
'All five requested model families were tested. Gemma quality results use its paid endpoint because the free endpoint repeatedly returned upstream HTTP 429, including a delayed probe. No production configuration was changed.','',
'This is a 15-case supplied-context pilot, not a general Sanskrit accuracy benchmark or an end-to-end retrieval evaluation. Source verses and word breakdowns came from app/seeds/shlokas.py (Gita 2.47 and 2.13). English meaning notes, a dual-number grammar exercise, translation comparisons and media metadata were authored fixtures. Expected answers were defined before generation.','',
'| Model | Fully answered | Partial | Incorrect | Median full-response time | Estimated cost for 15 answers |',
'|---|---:|---:|---:|---:|---:|']
for s in summaries:
 cost=f"{s['currency']} {s['estimated_cost']:.5f}"
 lines.append(f"| {s['display']} | {s['correct']}/15 | {s['partial']} | {s['incorrect']} | {s['median_seconds']:.2f}s | {cost} |")
lines += ['', '## Findings','',
'- Gemini, DeepSeek and standard Sarvam answered all 15 substantive questions correctly in this small sample. This is not evidence that they are equally accurate on the full app workload.',
'- Gemma paid: 14 fully answered, one partial. It explained the verse but did not tell the user the requested audio was unavailable.',
'- Nemotron free: 13 fully answered, one partial, one incorrect. It gave 4.3 seconds instead of 2.7 for the karaoke start position (used end_ms instead of start_ms). It also omitted the missing-audio explanation.',
'- All five preserved the exact supplied Sanskrit in both explicit quotation tasks; all resisted the supplied prompt-injection distractor and declined to fabricate an absent scripture quotation or composition date.',
'- Sarvam standard used 25,916 reported output tokens for short answers. The standard reasoning route is much slower and more token-heavy here; no conversation-model substitution was made.',
'- These tests mostly evaluate copying, explaining and abstaining with short, clean context. They do not test Sanskrit composition, broad scripture recall, long/noisy retrieval, tools, speech, streaming, or production concurrency. Only two cases require Hindi answers; no Sanskrit-only prose generation is tested.','',
'## Method and controls','',
'15 fixed cases, one completed response per case/model, temperature 0, 4096 output-token limit, 75-second timeout. Model families ran concurrently, with cases sequential inside each family. Gemini used the existing Vertex adapter with thinkingBudget=0. OpenRouter models requested reasoning disabled; Sarvam used the standard model native default. Thus this compares practical configurations, not equal reasoning budgets. Full-response latency includes network/provider delay and excludes deliberate pacing; it is not time to first token.',
'',
'Exact IDs: `sarvam-105b`; `gemini-3.8-flash`; `google/gemma-4-31b-it` (paid quality run) and `google/gemma-4-31b-it:free` (availability attempts); `nvidia/nemotron-3-super-120b-a12b:free`; `deepseek/deepseek-v4.1-flash`.',
'',
'The initial harness sent the two free-model streams too quickly in aggregate and hit OpenRouter\'s shared 20-per-minute limit. Six Nemotron cases were retried after recovery at a lower rate, and all completed. Initial failures are retained in previous_attempts/. Those client-induced failures are not counted as model accuracy errors or used to infer service uptime. Gemma had upstream 429s before the shared cap and again in a delayed isolated probe. Its free quality could not be evaluated.',
'',
'There were 97 completion attempts: 75 completed answers, 15 initial Gemma free failures, six initial Nemotron failures, and one delayed Gemma free failure. Failed requests reported no usage. Requests used only the public/app fixtures, not user conversations.',
'',
'Manual content review is by the assistant, not a separate Sanskrit scholar. Automated checks cover JSON shape, citation IDs, exact requested quotations and an insufficient-context flag; they do not establish factual accuracy. All 75 completed responses were valid schema JSON. Original strict contract totals remain in raw files and are deliberately not presented as accuracy:',
'',
'- Cases 14 and 15 ask whether sources establish exclusive translation correctness or scientific proof. All five correctly answered no, but used insufficient_context=false. The original true expectation was too strict for a question about evidence sufficiency; either interpretation is defensible.',
'- Sarvam cited G247 on the unanswered composition-date question, despite the requested empty citation list.',
'- DeepSeek unnecessarily populated the quote field on the timing task; the time itself was correct.',
'',
'Costs use reported input/output tokens and published uncached rates, not reconciled invoices. Reasoning usage can dominate output cost. USD and INR are kept separate; no exchange rate assumed. Cache discounts, taxes and infrastructure are excluded. OpenRouter model pricing snapshots are in the manifests. Gemini USD 0.75/3.75 and Sarvam INR 29.28/73.20 per million input/output tokens were checked earlier in this session.',
'',
'## Suggested use','',
'Use Sarvam credits for tasks where an approximately 11-second median response is acceptable. DeepSeek is the strongest cheap paid candidate from this pilot; retain Gemini as the baseline while testing harder examples. Paid Gemma is very inexpensive and worth a larger trial. Nemotron free is useful for experimentation but needs more evaluation before replacing the chatbot. Playback timestamps should come directly from validated metadata in application code.','',
'## Artifacts','',
'- cases.json: exact system prompt, context, questions and expected checks.',
'- content_review.json: per-case substantive verdicts and metadata notes.',
'- manifest*.json: exact model routes and generation settings.',
'- MODEL__CASE.json: raw final text, parsed JSON, usage, latency and original checks.',
'- previous_attempts/: initial failed Nemotron requests.',
'- gemma_free_delayed_probe.json: later isolated free-endpoint retry.',
'',
'Reproduce from backend: `.venv/Scripts/python.exe scripts/bench_rag_models.py`; `--gemma-paid` runs the paid Gemma variant; `--only nemotron_free --retry-errors` resumes failed Nemotron cases. Completed cases are cached. Use a new output directory for an independent repeat. `scripts/report_rag_models.py` renders these fixed manual judgments; it is not a reusable automatic accuracy judge.',
]
(OUT/'report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(summaries,indent=2))
