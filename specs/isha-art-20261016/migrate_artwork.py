"""Publish versioned public artwork, then update only verified app references.

No source assets or R2 objects are deleted. Credentials stay in environment files.
"""
import argparse,concurrent.futures,hashlib,json,mimetypes,re,os,threading
from pathlib import Path
import boto3,requests
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_local=threading.local()
def http():
 if not hasattr(_local,'session'):
  _local.session=requests.Session();_local.session.mount('https://',HTTPAdapter(max_retries=Retry(total=4,backoff_factor=.5,status_forcelist=[429,500,502,503,504])))
 return _local.session

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
ASSETS=ROOT/'mobile/assets'
GROUPS={'covers','festivals','games','learn-v2','learn','path','hubs'}
EXTS={'.webp','.png','.jpg','.jpeg','.svg','.avif','.gif'}
def mime_for(name):
 return {'.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml'}.get(Path(name).suffix.lower()) or mimetypes.guess_type(name)[0] or 'application/octet-stream'

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--upload',action='store_true');parser.add_argument('--integrate',action='store_true');args=parser.parse_args()
 cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ}
 base=(cfg.get('R2_BASE_URL') or '').rstrip('/')
 if not base.startswith('https://'):raise SystemExit('An HTTPS public R2 origin is required')
 client=boto3.client('s3',endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=45,retries={'max_attempts':3},max_pool_connections=12))
 entries={};paths={}
 for group in sorted(GROUPS):
  for path in sorted((ASSETS/group).rglob('*')):
   if not path.is_file() or path.suffix.lower() not in EXTS:continue
   data=path.read_bytes();digest=hashlib.sha256(data).hexdigest();key=f'art/v1/{digest[:24]}{path.suffix.lower()}'
   width=height=0
   if path.suffix.lower()!='.svg':
    with Image.open(path) as im:width,height=im.size
   rel=path.relative_to(ASSETS).as_posix();entries[rel]={'uri':base+'/'+key,'width':width,'height':height,'bytes':len(data),'sha256':digest,'key':key};paths[rel]=path
 print('Migration plan:',len(entries),'files,',sum(e['bytes'] for e in entries.values()),'bytes; startup, tutor and avatar assets remain bundled.',flush=True)
 def upload(item):
  name,entry=item;present=False
  try:
   head=client.head_object(Bucket=cfg['R2_BUCKET'],Key=entry['key']);present=head.get('Metadata',{}).get('sha256')==entry['sha256'] and head['ContentLength']==entry['bytes']
   if present and head.get('ContentType')!=mime_for(name):client.copy_object(Bucket=cfg['R2_BUCKET'],Key=entry['key'],CopySource={'Bucket':cfg['R2_BUCKET'],'Key':entry['key']},MetadataDirective='REPLACE',ContentType=mime_for(name),CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':entry['sha256']})
  except ClientError as e:
   if e.response['Error']['Code'] not in ('404','NoSuchKey','NotFound'):raise
  if not present:client.put_object(Bucket=cfg['R2_BUCKET'],Key=entry['key'],Body=paths[name].read_bytes(),ContentType=mime_for(name),CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':entry['sha256']})
  response=http().head(entry['uri'],timeout=(15,30))
  if response.status_code!=200 or int(response.headers.get('Content-Length','-1'))!=entry['bytes']:raise RuntimeError('Public verification failed for '+name+' (HTTP '+str(response.status_code)+')')
  return name
 if args.upload:
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
   futures={pool.submit(upload,item):item[0] for item in entries.items()}
   for i,future in enumerate(concurrent.futures.as_completed(futures),1):
    try:future.result()
    except Exception as e:
     print('FAILED',futures[future],type(e).__name__,str(e)[:250],flush=True);raise
    if i%50==0:print('Uploaded and publicly verified',i,'/',len(entries),flush=True)
  (OUT/'migration-manifest.json').write_text(json.dumps({'origin':base,'entries':entries,'verified':True,'kept_groups':['(root)','guru','avatar']},indent=2),encoding='utf-8')
 if args.integrate:
  saved=json.loads((OUT/'migration-manifest.json').read_text(encoding='utf-8'))
  if not saved.get('verified') or saved['entries']!=entries:raise SystemExit('Upload and verify the exact inventory before integration')
  generated=ROOT/'mobile/src/components/artwork/remoteManifest.json';generated.write_text(json.dumps(entries,indent=2)+'\n',encoding='utf-8')
  changed=[]
  pattern=re.compile(r'require\((["\'])([^"\']*assets/([^"\']+))\1\)')
  for path in (ROOT/'mobile/src').rglob('*'):
   if path.suffix not in {'.ts','.tsx'}:continue
   text=path.read_text(encoding='utf-8');used=False
   def replace(match):
    nonlocal used
    asset=match.group(3)
    if asset not in entries or asset.startswith(('covers/', 'festivals/')):return match.group(0)
    used=True;return 'remoteArtwork('+json.dumps(asset)+')'
   updated=pattern.sub(replace,text)
   if not used:continue
   rel=os.path.relpath(ROOT/'mobile/src/components/artwork/remoteArtwork',path.parent).replace('\\','/')
   if not rel.startswith('.'):rel='./'+rel
   updated='import { remoteArtwork } from '+json.dumps(rel)+';\n'+updated
   if path.name=='assetMap.ts':
    updated='import type { ImageSourcePropType } from "react-native";\n'+updated.replace('source: number;','source: ImageSourcePropType;')
   path.write_text(updated,encoding='utf-8');changed.append(path.relative_to(ROOT).as_posix())
  # The shared display wrapper adds bounded disk caching without new native dependencies.
  users=['components/book/AlbumArt.tsx','components/book/CoverArt.tsx','components/artwork/PaintedBackground.tsx','learnv2/LearnCard.tsx','learnv2/TeachingArt.tsx','trail/ui.tsx','screens/Parva.tsx','screens/ParvaPage.tsx','components/parva/ParvaStrip.tsx','screens/LearnLibrary.tsx']
  for name in users:
   path=ROOT/'mobile/src'/name;text=path.read_text(encoding='utf-8')
   if 'ArtworkImage as Image' in text:continue
   pat=re.compile(r'(import\s*\{)([^}]+)(\}\s*from\s*["\']react-native["\'];)')
   def move_image(m):return m.group(1)+re.sub(r'(?<!\w)Image\s*,?\s*','',m.group(2),count=1)+m.group(3) if re.search(r'(?<!\w)Image(?=\s*[,}])',m.group(2)+"}") else m.group(0)
   updated=pat.sub(move_image,text)
   if updated==text:continue
   rel=os.path.relpath(ROOT/'mobile/src/components/artwork/ArtworkImage',path.parent).replace('\\','/')
   if not rel.startswith('.'):rel='./'+rel
   path.write_text('import { ArtworkImage as Image } from '+json.dumps(rel)+';\n'+updated,encoding='utf-8');changed.append(path.relative_to(ROOT).as_posix())
  (OUT/'migration-changes.json').write_text(json.dumps(changed,indent=2),encoding='utf-8');print('Integrated remote references in',len(changed),'files.',flush=True)

if __name__=='__main__':main()
