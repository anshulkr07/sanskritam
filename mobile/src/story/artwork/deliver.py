"""Verify generated story paintings, derive WebPs, and optionally publish only verified files."""
import argparse, base64, concurrent.futures, hashlib, json, os, re, sys, time, unicodedata
from pathlib import Path
from io import BytesIO
import requests
from dotenv import dotenv_values
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'backend'))
def save(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(data):return hashlib.sha256(data).hexdigest()
def normalized(value):return unicodedata.normalize('NFC',re.sub(r'\s+',' ',value).strip())
def ocr(job,cfg):
 source=Path(job['original']);raw=source.read_bytes();sha=digest(raw);report_path=OUT/'ocr'/(job['id']+'.json')
 if report_path.exists():
  previous=json.loads(report_path.read_text(encoding='utf-8'))
  if previous.get('sha256')==sha:return previous
 prompt='Examine the entire painting, including tiny text on books, leaves, pots and background objects. Transcribe ALL actual readable lettering exactly in its original script. Do not invent or correct letters. Return JSON with lines (array of exact visible text strings in reading order), unreadable_lettering (true if any fake, incomplete or too-small letterlike writing is present), and notes (brief explanation). Plain natural grain and scratches are not lettering. Do not infer text from the scene. If there are no letters, lines must be empty.'
 body={'contents':[{'role':'user','parts':[{'text':prompt},{'inlineData':{'mimeType':'image/png','data':base64.b64encode(raw).decode()}}]}],'generationConfig':{'temperature':0,'maxOutputTokens':2048,'responseMimeType':'application/json','thinkingConfig':{'thinkingBudget':0}}}
 keys=[]
 for value in (cfg.get('GEMINI_API_KEYS',''),cfg.get('GEMINI_API_KEY','')):
  for key in re.split(r'[,;\s]+',value):
   if key and key not in keys:keys.append(key)
 payload=None;used='';errors=[]
 for model in ['gemini-3.8-flash','gemini-3.7-flash']:
  for key in keys:
   try:response=requests.post('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',headers={'x-goog-api-key':key},json=body,timeout=(15,60))
   except requests.RequestException:errors.append('transport timeout');continue
   if response.status_code==200:payload=response.json();used=model;break
   errors.append(response.status_code)
  if payload is not None:break
 if payload is None:
  from app.services.vertex_live import credentials_info,_fetch_token
  from app.config import settings
  info=credentials_info()
  if not info:raise RuntimeError('Gemini OCR unavailable; credential values were not logged. HTTP statuses: '+str(errors))
  token=_fetch_token(info);model='gemini-3.8-flash'
  response=requests.post('https://aiplatform.googleapis.com/v1/projects/'+settings.vertex_project+'/locations/'+settings.vertex_location+'/publishers/google/models/'+model+':generateContent',headers={'Authorization':'Bearer '+token},json=body,timeout=(15,90));response.raise_for_status();payload=response.json();used='vertex:'+model
 parts=(payload.get('candidates') or [{}])[0].get('content',{}).get('parts',[]);text=''.join(p.get('text','') for p in parts if not p.get('thought'))
 parsed=json.loads(text);lines=[normalized(line) for line in parsed.get('lines',[])];expected=[normalized(line) for line in job.get('expected',[])]
 passed=normalized(' '.join(lines))==normalized(' '.join(expected)) and not parsed.get('unreadable_lettering',False)
 report={'id':job['id'],'sha256':sha,'model':used,'expected':expected,'detected':lines,'unreadable_lettering':bool(parsed.get('unreadable_lettering')),'notes':parsed.get('notes',''),'passed':passed}
 save(report_path,report);return report

def prepare(job,report):
 source=Path(job['original']);raw=source.read_bytes();im=Image.open(BytesIO(raw)).convert('RGB');rw,rh=map(int,job['ratio'].split(':'))
 assert abs(im.width/im.height-rw/rh)<.01,'Wrong image ratio: '+job['id']
 history=[{**item,'sha256':digest(Path(item['original']).read_bytes())} for item in job.get('history',[]) if Path(item['original']).exists()]
 row={**job,'history':history,'safe_rect':[0,0,1,1],'focal_point':[.5,.5],'sha256':digest(raw),'width':im.width,'height':im.height,'text_verified':report['passed'],'master_retained':True,'variants':{}}
 for name,size,quality in [('phone',(768,1536),80),('tablet',(1536,1536),88)]:
  derivative=im.copy();derivative.thumbnail(size,Image.Resampling.LANCZOS);target=OUT/'delivery'/(job['id']+'-'+name+'.webp');target.parent.mkdir(parents=True,exist_ok=True);derivative.save(target,'WEBP',quality=quality,method=6);data=target.read_bytes();sha=digest(data)
  row['variants'][name]={'file':str(target),'key':'learn/'+job['id']+'-'+name+'-'+sha[:8]+'.webp','sha256':sha,'bytes':len(data),'width':derivative.width,'height':derivative.height}
 return row

def publish(row,cfg,client):
 assert row['text_verified'],'Unverified image cannot be published'
 for variant in row['variants'].values():
  data=Path(variant['file']).read_bytes();client.put_object(Bucket=cfg['R2_BUCKET'],Key=variant['key'],Body=data,ContentType='image/webp',CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':variant['sha256']})
  uri=cfg['R2_BASE_URL'].rstrip('/')+'/'+variant['key'];first=requests.get(uri,timeout=(15,45));first.raise_for_status();second=requests.get(uri,timeout=(15,45));second.raise_for_status()
  for response in (first,second):
   assert digest(response.content)==variant['sha256'],'Remote bytes differ';image=Image.open(BytesIO(response.content));assert list(image.size)==[variant['width'],variant['height']];assert 'image/webp' in response.headers.get('Content-Type','');assert 'immutable' in response.headers.get('Cache-Control','')
  assert second.headers.get('CF-Cache-Status','').upper()=='HIT','CDN HIT not verified for '+row['id']
  variant.update(uri=uri,cdn_status=second.headers.get('CF-Cache-Status'),verified=True)
 return row

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--ocr',action='store_true');parser.add_argument('--upload',action='store_true');parser.add_argument('--verify',action='store_true');parser.add_argument('--ids',nargs='*');args=parser.parse_args()
 cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ};jobs=json.loads((OUT/'jobs.json').read_text(encoding='utf-8'))
 if args.verify:
  rows=json.loads((OUT/'deliveries.json').read_text(encoding='utf-8'));checks=[]
  assert len(rows)==len(jobs),'Incomplete delivery manifest'
  for row in rows:
   for name,variant in row['variants'].items():
    local=Path(variant['file']).read_bytes();assert digest(local)==variant['sha256']
    response=requests.get(variant['uri'],timeout=(15,45));response.raise_for_status();assert digest(response.content)==variant['sha256'];assert list(Image.open(BytesIO(response.content)).size)==[variant['width'],variant['height']];assert response.headers.get('CF-Cache-Status','').upper()=='HIT';assert 'immutable' in response.headers.get('Cache-Control','');assert 'image/webp' in response.headers.get('Content-Type','')
    checks.append({'id':row['id'],'variant':name,'sha256':variant['sha256'],'cdn_status':'HIT','verified':True})
   assert not any(Path(item['original']).exists() for item in [row,*row.get('history',[])]),'Temporary original retained'
  save(OUT/'audit.json',{'paintings':len(rows),'variants':checks,'originals_remaining':0});print('Verified '+str(len(checks))+' public/local WebPs; no originals retained.');return
 if any(not Path(job['original']).exists() for job in jobs):raise SystemExit('Temporary originals were discarded after delivery. Use --verify to audit retained WebPs and public URLs.')
 if args.ids:jobs=[job for job in jobs if job['id'] in args.ids]
 reports={};rows=[]
 for job in jobs:
  if args.ocr:report=ocr(job,cfg)
  else:
   target=OUT/'ocr'/(job['id']+'.json');report=json.loads(target.read_text(encoding='utf-8')) if target.exists() else {'passed':False,'notes':'OCR not run'}
  reports[job['id']]=report
  if not report['passed']:print(job['id']+': REJECTED — '+json.dumps(report.get('detected',[]),ensure_ascii=False),flush=True);continue
  row=prepare(job,report);rows.append(row);print(job['id']+': OCR and dimensions passed',flush=True)
 save(OUT/'verification.json',reports)
 if args.upload:
  if len(rows)!=len(jobs):raise SystemExit('Delivery stopped: correct all rejected paintings first.')
  import boto3
  from botocore.config import Config
  client=boto3.client('s3',endpoint_url='https://'+cfg['R2_ACCOUNT_ID']+'.r2.cloudflarestorage.com',aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3}))
  for row in rows:publish(row,cfg,client)
  # The app resolves canonical picture IDs from this verified manifest. The
  # earlier no-backend-edit constraint is preserved; a backend import is supplied separately.
  registry={row['id']:{'phone':row['variants']['phone']['uri'],'tablet':row['variants']['tablet']['uri'],'width':row['width'],'height':row['height']} for row in rows}
  save(OUT/'manifest.json',registry)
  records=[{'id':row['id'],'phone':row['variants']['phone']['uri'],'tablet':row['variants']['tablet']['uri'],'width':row['width'],'height':row['height'],'sha256':row['sha256'],'text_verified':True,'prompt':row['prompt']} for row in rows]
  save(OUT/'backend-deliveries.json',records)
  # Discard only after BOTH public derivatives passed bytes, dimensions and CDN verification.
  allowed=(Path.home()/'.codex/generated_images').resolve()
  for row in rows:
   for item in [row,*row.get('history',[])]:
    original=Path(item['original']).resolve();assert allowed in original.parents,'Unexpected original path'
    if original.exists():original.unlink()
   row['master_retained']=False
 save(OUT/'deliveries.json',rows)
 sheet=Image.new('RGB',(1200,((len(rows)+3)//4)*260),'#F8F2E7');draw=ImageDraw.Draw(sheet)
 for i,row in enumerate(rows):
  thumb=Image.open(row['variants']['phone']['file']).convert('RGB');thumb.thumbnail((280,220));x=(i%4)*300;y=(i//4)*260;sheet.paste(thumb,(x+(300-thumb.width)//2,y));draw.text((x+8,y+228),row['id'],fill='#2A2019')
 if rows:sheet.save(OUT/'contact-sheet.jpg',quality=90)
 print(str(len(rows))+'/'+str(len(jobs))+' paintings passed',flush=True)
if __name__=='__main__':main()
