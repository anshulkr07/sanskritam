"""Publish only this reviewed set; merge manifest entries without re-migrating priority art."""
import hashlib,json,os
from pathlib import Path
import boto3,requests
from botocore.config import Config
from dotenv import dotenv_values
from PIL import Image
from io import BytesIO
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ}
base=cfg['R2_BASE_URL'].rstrip('/')
client=boto3.client('s3',endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=45,retries={'max_attempts':3}))
records=json.loads((OUT/'artwork.json').read_text(encoding='utf-8'))
registry_path=ROOT/'mobile/src/components/artwork/remoteManifest.json'
registry=json.loads(registry_path.read_text(encoding='utf-8'))
for record in records:
 for variant,v in record['variants'].items():
  path=ROOT/v['path'];data=path.read_bytes();digest=hashlib.sha256(data).hexdigest();key=f'art/v1/{digest[:24]}.webp';url=base+'/'+key
  client.put_object(Bucket=cfg['R2_BUCKET'],Key=key,Body=data,ContentType='image/webp',CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':digest})
  cache=[]
  for i in range(3):
   response=requests.get(url,timeout=(15,45));response.raise_for_status();assert hashlib.sha256(response.content).hexdigest()==digest
   image=Image.open(BytesIO(response.content));assert list(image.size)==[v['width'],v['height']]
   assert response.headers.get('Content-Type','').split(';')[0]=='image/webp'
   cache.append(response.headers.get('CF-Cache-Status',''))
  assert 'HIT' in cache,cache
  v.update(uri=url,key=key,cdn_checks=cache)
  registry[path.relative_to(ROOT/'mobile/assets').as_posix()]={k:v[k] for k in ['uri','width','height','bytes','sha256','key']}
  print(record['id'],variant,v['width'],v['height'],v['bytes'],cache,flush=True)
registry_path.write_text(json.dumps(registry,indent=2)+'\n',encoding='utf-8')
# ARTWORK.md: discard temporary originals only after both deliveries are verified.
for record in records:
 original=Path(record['original_path']);original.unlink(missing_ok=True);record['master_retained']=False
(OUT/'artwork.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
