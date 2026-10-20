"""Audit source references, selected manifest and exact-text delivery receipts."""
import json,sys,importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'backend'))
from app.curriculum.loader import load,CONTENT_DIR
from app.curriculum.__main__ import all_images
s=importlib.util.spec_from_file_location('delivery',OUT/'deliver.py');d=importlib.util.module_from_spec(s);s.loader.exec_module(d)
data=load(CONTENT_DIR);assert not data.issues
refs={image.id for _,image in all_images(data)}
manifest=d.read(ROOT/'mobile/src/story/artwork/manifest.json',{})
jobs={j['id']:j for j in d.read(OUT/'jobs.json',[])}
receipts={r['id']:r for r in d.read(OUT/'deliveries.json',[])}
complete=[];pending=[]
for key,job in jobs.items():
 r=receipts.get(key);review=d.read(OUT/'ocr'/(key+'.json'),{})
 good=r and r['expected']==job['expected'] and review.get('passed') and review.get('sha256')==r['sha256'] and review.get('expected')==job['expected'] and r.get('master_retained') is False
 if good:
  assert all(manifest[key][v]==r['variants'][v]['uri'] for v in ('phone','tablet'))
  complete.append(key)
 else:pending.append(key)
result={'canonical_refs':len(refs),'manifest_entries':len(manifest),'missing_source_images':sorted(refs-set(manifest)),'requested':len(jobs),'verified_current':len(complete),'pending':pending,'text_images':sum(bool(j['expected']) for j in jobs.values()),'text_verified_current':sum(bool(jobs[k]['expected']) for k in complete)}
d.save(OUT/'coverage-audit.json',result)
print(json.dumps(result,ensure_ascii=False,indent=2))
if '--complete' in sys.argv:assert not pending and not result['missing_source_images']
