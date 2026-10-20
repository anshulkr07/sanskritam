"""Save a completed built-in image-tool result without regenerating or editing it."""
import argparse,hashlib,json,shutil
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image
from job_policy import generation_jobs

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 p=argparse.ArgumentParser();p.add_argument('--key',required=True);p.add_argument('--source',required=True);p.add_argument('--reuse',action='store_true');p.add_argument('--revision',type=int,default=1);args=p.parse_args()
 jobs={j['key']:j for j in generation_jobs()};job=jobs[args.key]
 if args.revision>1:
  revision=json.loads((OUT/'revisions'/f'{args.key}-v{args.revision}.json').read_text(encoding='utf-8'))
  assert revision['key']==args.key and revision['revision']==args.revision
  assert hashlib.sha256(revision['prompt'].encode()).hexdigest()==revision['prompt_sha256']
  job={**job,**{k:revision[k] for k in ['prompt','prompt_sha256','master']}}
  if revision.get('composition_policy'):job['composition_policy']=revision['composition_policy']
 source=Path(args.source);target=ROOT/job['master'];target.parent.mkdir(parents=True,exist_ok=True)
 with Image.open(source) as im:
  width,height=im.size
  if job.get('composition_policy')=='phone-portrait-9x16-20261019':
   assert width>=768 and height>=1024 and .53<=width/height<=.59,'Expected native portrait artwork close to 9:16'
  else:assert width==height and width>=1024,'A high-resolution square original is required'
  im.verify()
 if target.exists():
  assert hashlib.sha256(target.read_bytes()).digest()==hashlib.sha256(source.read_bytes()).digest(),'Do not overwrite a different master'
 else:shutil.copy2(source,target)
 thumbs=OUT/'thumbnails';thumbs.mkdir(exist_ok=True)
 with Image.open(target) as original:
  thumbnail=original.convert('RGB');thumbnail.thumbnail((240,240));thumb=thumbs/f'{args.key}.webp';temporary=thumb.with_suffix('.tmp');thumbnail.save(temporary,'WEBP',quality=70,method=4);temporary.replace(thumb)
 info={'key':args.key,'source_ref':job['source_ref'],'verse_uid':job['verse_uid'],'master':job['master'],'generated_path':str(source),'generator':'built-in image_gen','reused_preview':args.reuse,'prompt':None if args.reuse else job['prompt'],'prompt_sha256':None if args.reuse else job['prompt_sha256'],'width':width,'height':height,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'recorded_at':datetime.now(timezone.utc).isoformat(),'reviewed':False}
 info['revision']=args.revision
 if job.get('composition_policy'):info['composition_policy']=job['composition_policy']
 if args.revision>1:
  info['generation_mode']=revision.get('mode','generate')
  info['reference_images']=revision.get('reference_images',[])
 delivery=OUT/'deliveries'/f'{args.key}.json';temporary=delivery.with_suffix('.json.tmp');write=True
 if delivery.exists():
  existing=json.loads(delivery.read_text(encoding='utf-8'))
  assert existing['source_ref']==info['source_ref']
  if existing['sha256']==info['sha256']:write=False
  else:
   assert args.revision>existing.get('revision',1),'Use a new revision; preserve the original master'
   history=OUT/'history';history.mkdir(exist_ok=True);archive=history/f"{args.key}-v{existing.get('revision',1)}.json"
   if archive.exists():assert json.loads(archive.read_text(encoding='utf-8'))==existing
   else:archive.write_text(json.dumps(existing,ensure_ascii=False,indent=2),encoding='utf-8')
 if write:
  temporary.write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(delivery)
 (OUT/'errors'/f'{args.key}.json').unlink(missing_ok=True)
 print('Saved',job['source_ref'].encode('ascii','backslashreplace').decode(),width,height)
if __name__=='__main__':main()
