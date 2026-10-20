"""Verify source mapping, retained deliveries and registry coverage."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
from job_policy import generation_jobs

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 p=argparse.ArgumentParser();p.add_argument('--complete',action='store_true');args=p.parse_args()
 jobs=generation_jobs()
 verses={v['source_ref']:v for v in json.loads((OUT/'verses.json').read_text(encoding='utf-8'))}
 assert len(jobs)==len(verses)==700
 assert len({j['key'] for j in jobs})==700
 registry=json.loads((ROOT/'mobile/src/components/artwork/verseManifest.json').read_text(encoding='utf-8'))
 baseline=OUT/'registry-baseline.json'
 if baseline.exists():
  for ref,value in json.loads(baseline.read_text(encoding='utf-8')).items():
   assert registry.get(ref)==value,'Existing artwork was changed during Gita publishing: '+ref
 generated=reviewed=published=masterbytes=phonebytes=tabletbytes=0;digests=set()
 for job in jobs:
  verse=verses[job['source_ref']]
  assert job['verse_uid']==verse['verse_uid']
  assert job['source_devanagari']==verse['devanagari']
  assert job['source_translation_en']==verse['translation_en']
  assert hashlib.sha256(job['prompt'].encode()).hexdigest()==job['prompt_sha256']
  path=OUT/'deliveries'/f"{job['key']}.json"
  if not path.exists():continue
  delivery=json.loads(path.read_text(encoding='utf-8'));master=ROOT/delivery['master'];selected=job
  if delivery.get('revision',1)>1:
   revision=json.loads((OUT/'revisions'/f"{job['key']}-v{delivery['revision']}.json").read_text(encoding='utf-8'))
   assert revision['key']==job['key'] and hashlib.sha256(revision['prompt'].encode()).hexdigest()==revision['prompt_sha256']
   selected={**job,**revision}
   if revision.get('mode')=='edit':
    assert delivery.get('generation_mode')=='edit' and delivery.get('reference_images')==revision['reference_images']
    for reference in revision['reference_images']:
     refpath=ROOT/reference['path']
     if refpath.exists():assert hashlib.sha256(refpath.read_bytes()).hexdigest()==reference['sha256']
     else:
      history=[json.loads(p.read_text(encoding='utf-8')) for p in (OUT/'history').glob(f"{job['key']}-v*.json")]
      assert any(h.get('master_retained') is False and h['master']==reference['path'] and h['sha256']==reference['sha256'] for h in history),'Missing historical edit-input provenance'
  assert delivery['key']==job['key'] and delivery['source_ref']==job['source_ref']
  assert delivery['verse_uid']==job['verse_uid'] and delivery['master']==selected['master']
  retained=delivery.get('master_retained',True)
  digest=hashlib.sha256(master.read_bytes()).hexdigest() if retained else delivery['sha256']
  assert digest==delivery['sha256'] and digest not in digests,'A master is corrupt or duplicated'
  digests.add(digest)
  if delivery.get('reused_preview'):
   assert job['key'] in ['01-001','01-002','01-003'] and delivery['prompt'] is None
  else:assert delivery['prompt']==selected['prompt'] and delivery['prompt_sha256']==selected['prompt_sha256']
  if retained:
   with Image.open(master) as im:
    if delivery.get('composition_policy')=='phone-portrait-9x16-20261019':assert im.width>=768 and .53<=im.width/im.height<=.59
    else:assert im.width==im.height and im.width>=1024
    assert [im.width,im.height]==[delivery['width'],delivery['height']];im.verify()
  else:
   assert not master.exists() and delivery.get('published') and delivery.get('master_removed_at')
  assert (OUT/'thumbnails'/f"{job['key']}.webp").exists()
  generated+=1;masterbytes+=master.stat().st_size if retained else 0;reviewed+=bool(delivery.get('reviewed'))
  if delivery.get('published'):
   assert delivery.get('reviewed') and registry[job['source_ref']]==delivery['entry']
   if retained:assert delivery['masterUrl'].startswith('https://cdn.vedicvalor.com/art/masters/gita/')
   else:assert not delivery.get('masterUrl')
   safe=delivery['entry']['safeRegion'];assert all(0<=safe[k]<=1 for k in ['x','y','width','height'])
   assert safe['x']+safe['width']<=1 and safe['y']+safe['height']<=1
   for name,edge in [('phone',768),('tablet',1536)]:
    variant=delivery['entry']['variants'][name];path=ROOT/'results/gita-art-20261016/delivery'/f"{job['key']}-{name}.webp"
    assert variant['bytes']==path.stat().st_size
    assert variant['uri'].endswith(hashlib.sha256(path.read_bytes()).hexdigest()[:24]+'.webp')
    with Image.open(path) as im:
     bounds=(768,1536) if name=='phone' and delivery['height']>delivery['width'] else (edge,edge)
     expected=Image.new('RGB',(delivery['width'],delivery['height']));expected.thumbnail(bounds)
     assert im.size==expected.size
     assert [im.width,im.height]==[variant['width'],variant['height']];im.verify()
    if name=='phone':phonebytes+=variant['bytes']
    else:tabletbytes+=variant['bytes']
   published+=1
 if args.complete:assert generated==reviewed==published==700,'The set is incomplete'
 report={'generated':generated,'reviewed':reviewed,'published':published,'master_bytes':masterbytes,'published_phone_bytes':phonebytes,'published_tablet_bytes':tabletbytes,'source_mappings_checked':700}
 (OUT/'audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
if __name__=='__main__':main()
