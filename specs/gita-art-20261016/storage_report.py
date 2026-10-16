"""Count actual R2 bytes without exposing credentials or private object names."""
import json,os
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ}
 client=boto3.client('s3',endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3}))
 coverage='account buckets'
 try:names=[b['Name'] for b in client.list_buckets()['Buckets']]
 except ClientError:
  names=list(dict.fromkeys([cfg['R2_BUCKET'],cfg.get('R2_COMMUNITY_BUCKET','sanskritam-community')]))
  coverage='configured public and community buckets'
 expected=set()
 for path in (OUT/'deliveries').glob('*.json'):
  d=json.loads(path.read_text(encoding='utf-8'))
  if d.get('published'):
   if d.get('masterUrl'):expected.add(urlparse(d['masterUrl']).path.lstrip('/'))
   expected.update(urlparse(v['uri']).path.lstrip('/') for v in d['entry']['variants'].values())
 buckets={};found=set();gita_bytes=0
 for name in names:
  count=size=0
  for page in client.get_paginator('list_objects_v2').paginate(Bucket=name):
   for obj in page.get('Contents',[]):
    count+=1;size+=obj['Size']
    if name==cfg['R2_BUCKET'] and obj['Key'] in expected:
     found.add(obj['Key']);gita_bytes+=obj['Size']
  buckets[name]={'objects':count,'bytes':size}
 report={'checked_at':datetime.now(timezone.utc).isoformat(),'coverage':coverage,'buckets':buckets,'total_bytes':sum(b['bytes'] for b in buckets.values()),'gita_objects':len(found),'gita_bytes':gita_bytes,'missing_published_gita_objects':len(expected-found)}
 (OUT/'storage-after.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))
 assert not expected-found,'A published Gita object is missing from R2'
if __name__=='__main__':main()
