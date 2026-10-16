"""Derive both delivery sizes from each single master; publish immutable R2 objects."""
import argparse,concurrent.futures,hashlib,json,mimetypes,os
from pathlib import Path
import boto3,requests
from botocore.config import Config
from dotenv import dotenv_values
from PIL import Image,ImageDraw,ImageFont
from migrate_artwork import http,mime_for

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
DEST=ROOT/'results/isha-art-20261016';DELIVERY=DEST/'delivery'
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--upload',action='store_true');args=parser.parse_args()
 cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ};base=cfg['R2_BASE_URL'].rstrip('/')
 jobs=json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'));DELIVERY.mkdir(parents=True,exist_ok=True)
 entries={};uploads=[];summary=[]
 sheet=Image.new('RGB',(1500,6*290),'#fff8ee');draw=ImageDraw.Draw(sheet)
 for index,job in enumerate(jobs):
  n=job['verse'];master=ROOT/job['master'];assert master.exists(),f'Missing verse {n} master'
  im=Image.open(master).convert('RGB');assert im.width==im.height
  image=im.copy();image.thumbnail((240,240));x=(index%6)*250;y=(index//6)*290
  sheet.paste(image,(x+(250-image.width)//2,y));draw.text((x+12,y+249),f'Isha {n:02d}',fill='#3b2e25')
  row={'source_ref':job['source_ref'],'focalPoint':job['focal_point'],'safeRegion':job['safe_region'],'alt':job['scene'],'variants':{}}
  masterkey=f"art/masters/isha/{n:02d}-{hashlib.sha256(master.read_bytes()).hexdigest()[:16]}.png";uploads.append((master,masterkey))
  for variant,edge,quality in [('phone',768,80),('tablet',1536,88)]:
   copy=im.copy();copy.thumbnail((edge,edge));path=DELIVERY/f'verse-{n:02d}-{variant}.webp';copy.save(path,'WEBP',quality=quality,method=6)
   digest=hashlib.sha256(path.read_bytes()).hexdigest();key=f'art/verses/v1/{digest[:24]}.webp'
   row['variants'][variant]={'uri':base+'/'+key,'width':copy.width,'height':copy.height,'bytes':path.stat().st_size};uploads.append((path,key))
  entries[job['source_ref']]=row
  summary.append({'verse':n,'master':job['master'],'masterDimensions':[im.width,im.height],'masterUrl':base+'/'+masterkey,'phone':row['variants']['phone'],'tablet':row['variants']['tablet']})
 sheet.crop((0,0,1500,3*290)).save(OUT/'contact-sheet.jpg',quality=90)
 (OUT/'artwork-manifest.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
 if args.upload:
  client=boto3.client('s3',endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3},max_pool_connections=8))
  def publish(item):
   path,key=item;data=path.read_bytes();client.put_object(Bucket=cfg['R2_BUCKET'],Key=key,Body=data,ContentType=mime_for(path.name),CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':hashlib.sha256(data).hexdigest()})
   r=http().head(base+'/'+key,timeout=(15,30));assert r.status_code==200 and int(r.headers.get('Content-Length','-1'))==len(data),'Public verification failed: '+key
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(publish,uploads))
  registry_path=ROOT/'mobile/src/components/artwork/verseManifest.json'
  registry=json.loads(registry_path.read_text(encoding='utf-8')) if registry_path.exists() else {}
  registry.update(entries)
  temporary=registry_path.with_suffix('.json.tmp')
  temporary.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temporary.replace(registry_path)
  print('Published and verified',len(uploads),'objects; 18 masters, 36 delivery files.')
 print('Phone bytes',sum(e['variants']['phone']['bytes'] for e in entries.values()),'Tablet bytes',sum(e['variants']['tablet']['bytes'] for e in entries.values()),'Master bytes',sum((ROOT/j['master']).stat().st_size for j in jobs))

if __name__=='__main__':main()
