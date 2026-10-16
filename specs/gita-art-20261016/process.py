"""Contact sheets, reviewed delivery sizes, and resumable verified R2 publishing."""
import argparse,concurrent.futures,hashlib,json,os,re,sys
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image,ImageDraw
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'specs/isha-art-20261016'))
from migrate_artwork import http,mime_for
sys.path.insert(0,str(ROOT/'specs/artwork'))
from remove_generated_masters import discard_local, verify_variant

def deliveries():
 return {p.stem:json.loads(p.read_text(encoding='utf-8')) for p in sorted((OUT/'deliveries').glob('*.json'))}

def save_delivery(value):
 path=OUT/'deliveries'/f"{value['key']}.json";temporary=path.with_suffix('.json.tmp')
 temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(path)

def refresh_gallery_links():
 # Embed current public reading URLs so even an already running read-only
 # gallery server can show originals' replacements without a process restart.
 links={d['key']:d['entry']['variants']['tablet']['uri'] for d in deliveries().values() if d.get('published')}
 path=OUT/'progress.html';html=path.read_text(encoding='utf-8')
 value='const readingImages=/*READING_URLS*/'+json.dumps(links,separators=(',',':'))+'/*END_READING_URLS*/;'
 if '/*READING_URLS*/' in html:html=re.sub(r'const readingImages=/\*READING_URLS\*/.*?/\*END_READING_URLS\*/;',lambda _:value,html)
 else:html=html.replace('<script>','<script>\n'+value,1)
 html=html.replace("full.href='/master/'+j.key+'.png'", "full.href=readingImages[j.key]||('/master/'+j.key+'.png')")
 path.write_text(html,encoding='utf-8')

def status():
 ds=deliveries();counts={}
 for value in ds.values():
  chapter=int(value['key'].split('-')[0]);counts[chapter]=counts.get(chapter,0)+1
 unresolved=[p for p in (OUT/'errors').glob('*.json') if p.stem not in ds]
 report={'checked_at':datetime.now(timezone.utc).isoformat(),'expected':700,'generated':len(ds),'reviewed':sum(bool(d.get('reviewed')) for d in ds.values()),'published':sum(bool(d.get('published')) for d in ds.values()),'chapters':counts,'errors':len(unresolved)}
 (OUT/'progress.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report));return report

def contact(chapter):
 ds=[d for d in deliveries().values() if int(d['key'].split('-')[0])==chapter]
 if not ds:return
 cols=8;width=1600;rows=(len(ds)+cols-1)//cols
 sheet=Image.new('RGB',(width,rows*225),'#fff8ee');draw=ImageDraw.Draw(sheet)
 for index,d in enumerate(ds):
  preview=ROOT/d['master'] if d.get('master_retained',True) else ROOT/'results/gita-art-20261016/delivery'/f"{d['key']}-tablet.webp"
  with Image.open(preview) as original:
   im=original.convert('RGB');im.thumbnail((190,190))
  x=(index%cols)*200;y=(index//cols)*225;sheet.paste(im,(x+(200-im.width)//2,y));draw.text((x+9,y+195),d['key'],fill='#3b2e25')
 target=OUT/'contact-sheets';target.mkdir(exist_ok=True)
 sheet.save(target/f'chapter-{chapter:02d}.jpg',quality=92)
 (target/f'chapter-{chapter:02d}.json').write_text(json.dumps([{'key':d['key'],'sha256':d['sha256']} for d in ds],indent=2),encoding='utf-8')

def publish():
 ds=deliveries();cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ};base=cfg['R2_BASE_URL'].rstrip('/')
 client=boto3.client('s3',endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3},max_pool_connections=8))
 jobs={j['key']:j for j in json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'))}
 pending=[d for d in ds.values() if d.get('reviewed') and not d.get('published')]
 output=ROOT/'results/gita-art-20261016/delivery';output.mkdir(exist_ok=True)
 def upload(path,key):
  data=path.read_bytes();digest=hashlib.sha256(data).hexdigest();present=False
  try:
   old=client.head_object(Bucket=cfg['R2_BUCKET'],Key=key);present=old.get('Metadata',{}).get('sha256')==digest and old['ContentLength']==len(data)
  except ClientError as e:
   if e.response['Error']['Code'] not in ('404','NoSuchKey','NotFound'):raise
  if not present:client.put_object(Bucket=cfg['R2_BUCKET'],Key=key,Body=data,ContentType=mime_for(path.name),CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':digest})
  response=http().head(base+'/'+key,timeout=(15,30))
  assert response.status_code==200 and int(response.headers.get('Content-Length','-1'))==len(data),'Public artwork verification failed'
  return base+'/'+key
 def one(d):
  job=jobs[d['key']];master=ROOT/d['master']
  variants={}
  with Image.open(master) as original:
   original=original.convert('RGB')
   for name,edge,quality in [('phone',768,80),('tablet',1536,88)]:
    im=original.copy();im.thumbnail((edge,edge));path=output/f"{d['key']}-{name}.webp";im.save(path,'WEBP',quality=quality,method=6)
    digest=hashlib.sha256(path.read_bytes()).hexdigest();url=upload(path,f'art/verses/v1/{digest[:24]}.webp')
    variants[name]={'uri':url,'width':im.width,'height':im.height,'bytes':path.stat().st_size}
  entry={'source_ref':d['source_ref'],'focalPoint':job['focal_point'],'safeRegion':d.get('safe_region',{'x':0,'y':0,'width':1,'height':1}),'alt':f"Interpretive watercolor for {d['source_ref']}: {job['source_translation_en']}",'variants':variants}
  d.update({'published':True,'entry':entry})
  for variant in variants.values():verify_variant(variant)
  discard_local(d)
  save_delivery(d)
  for path in (OUT/'history').glob(d['key']+'-v*.json'):
   old=json.loads(path.read_text(encoding='utf-8'));discard_local(old)
   temporary=path.with_suffix('.json.tmp');temporary.write_text(json.dumps(old,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(path)
  return d['source_ref']
 if pending:
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
   for n,ref in enumerate(pool.map(one,pending),1):
    if n%10==0:print('Published and verified',n,'/',len(pending),flush=True)
 # Merge only verified entries; preserve Isha and any other book's registry.
 path=ROOT/'mobile/src/components/artwork/verseManifest.json';registry=json.loads(path.read_text(encoding='utf-8'))
 for d in deliveries().values():
  if d.get('published'):registry[d['source_ref']]=d['entry']
 temporary=path.with_suffix('.json.tmp');temporary.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temporary.replace(path)
 refresh_gallery_links()
 status()

def main():
 p=argparse.ArgumentParser();p.add_argument('--status',action='store_true');p.add_argument('--contact',type=int);p.add_argument('--reviewed',type=int);p.add_argument('--reviewed-sheet',type=int);p.add_argument('--exclude',default='');p.add_argument('--publish',action='store_true');a=p.parse_args()
 if a.contact:contact(a.contact)
 assert not (a.reviewed and a.reviewed_sheet),'Choose one review mode'
 assert not a.exclude or a.reviewed_sheet,'Exclusions require a specific contact-sheet snapshot'
 if a.reviewed or a.reviewed_sheet:
  if a.reviewed:
   expected=json.loads((OUT/'chapter-counts.json').read_text())[str(a.reviewed)]
   matches=[d for d in deliveries().values() if int(d['key'].split('-')[0])==a.reviewed]
   assert len(matches)==expected,'Only mark a complete, visually inspected chapter reviewed'
  else:
   snapshot=json.loads((OUT/'contact-sheets'/f'chapter-{a.reviewed_sheet:02d}.json').read_text(encoding='utf-8'));current=deliveries();excluded=set(filter(None,a.exclude.split(',')));matches=[]
   assert excluded<={d['key'] for d in snapshot},'Excluded key is absent from the inspected sheet'
   for item in snapshot:
    d=current[item['key']];assert d['sha256']==item['sha256'],'Master changed after the contact sheet was made'
    if d['key'] not in excluded:matches.append(d)
  for d in matches:
   d['reviewed']=True
   # Preserve the whole painted scene across all aspect ratios. Tightening this
   # rectangle requires a separate per-master composition review.
   d['safe_region']={'x':0,'y':0,'width':1,'height':1}
   d['review_note']='Contact-sheet inspection; conservative full-frame safe region preserves all figures and objects.'
   save_delivery(d)
 if a.publish:publish()
 else:status()
if __name__=='__main__':main()
