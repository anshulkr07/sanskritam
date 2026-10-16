"""Owner-authorized retirement of verse originals; keep verified reading files.

Default is a read-only plan. --apply deletes only explicitly inventoried masters.
"""
import argparse, concurrent.futures, hashlib, io, json, os, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import boto3, requests
from botocore.config import Config
from PIL import Image
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SETS = [ROOT/'specs/gita-art-20261016', ROOT/'specs/isha-art-20261016']

def save(path, value):
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temp.replace(path)

def verify_variant(v):
    url = urlparse(v['uri'])
    assert url.scheme == 'https' and url.netloc == 'cdn.vedicvalor.com'
    assert url.path.startswith('/art/verses/v1/') and url.path.endswith('.webp')
    r = requests.get(v['uri'], timeout=(15, 60)); r.raise_for_status()
    assert len(r.content) == v['bytes'], 'Delivery byte count mismatch'
    digest = hashlib.sha256(r.content).hexdigest()
    assert Path(url.path).stem == digest[:24], 'Delivery hash mismatch'
    with Image.open(io.BytesIO(r.content)) as im:
        assert list(im.size) == [v['width'], v['height']]
        im.verify()
    return len(r.content)

def local_masters(record):
    """Exact files only, with resolved workspace checks before any deletion."""
    paths = []
    if record.get('master'):
        path = (ROOT/record['master']).resolve()
        allowed = [(ROOT/f'results/{s.name}/masters').resolve() for s in SETS]
        assert any(path.is_relative_to(base) for base in allowed), 'Unexpected master location'
        if path.exists(): paths.append(path)
    source = record.get('generated_path')
    if source:
        path = Path(source).resolve()
        allowed = (Path.home()/'.codex/generated_images').resolve()
        if path.exists() and path.is_relative_to(allowed):
            expected = record.get('sha256')
            if not expected and paths: expected = hashlib.sha256(paths[0].read_bytes()).hexdigest()
            assert expected and hashlib.sha256(path.read_bytes()).hexdigest() == expected
            paths.append(path)
    return list(dict.fromkeys(paths))

def discard_local(record):
    paths = local_masters(record)
    removed = sum(p.stat().st_size for p in paths)
    for path in paths: path.unlink()
    record['master_retained'] = False
    record['master_removed_at'] = datetime.now(timezone.utc).isoformat()
    record['master_storage_policy'] = 'Temporary generation input only; retain phone/tablet WebP deliveries.'
    if record.get('masterUrl'): record['removed_master_url'] = record.pop('masterUrl')
    return len(paths), removed

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--apply', action='store_true'); args = parser.parse_args()
    registry = json.loads((ROOT/'mobile/src/components/artwork/verseManifest.json').read_text(encoding='utf-8'))
    cfg = {**dotenv_values(ROOT/'.env'), **dotenv_values(ROOT/'.env.deploy'), **os.environ}
    client = boto3.client('s3', endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com", aws_access_key_id=cfg['R2_ACCESS_KEY_ID'], aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'], region_name='auto', config=Config(retries={'max_attempts':3}, max_pool_connections=12))
    records = []; variants = {}; keys = set(); files = set(); summaries = []
    for folder in SETS:
        summary_path = folder/'artwork-manifest.json'
        summary = json.loads(summary_path.read_text(encoding='utf-8')) if summary_path.exists() else []
        by_verse = {r['verse']:r for r in summary}
        if summary: summaries.append((summary_path, summary))
        for path in sorted((folder/'deliveries').glob('*.json')):
            d = json.loads(path.read_text(encoding='utf-8'))
            if folder.name.startswith('gita'):
                assert d.get('published') and d.get('reviewed'), 'Unpublished original must be reviewed/published first'
                entry = d['entry']; assert registry[d['source_ref']] == entry
            else:
                row = by_verse[d['verse']]
                entry = registry[row.get('source_ref', 'Īśopaniṣad '+str(d['verse']))] if row.get('source_ref') else None
                if entry is None:
                    matches = [e for e in registry.values() if e['variants'].get('phone') == row['phone']]
                    assert len(matches)==1; entry=matches[0]
                assert entry['variants']['phone']==row['phone'] and entry['variants']['tablet']==row['tablet']
                if row.get('masterUrl'): d['masterUrl']=row['masterUrl']
            for v in entry['variants'].values(): variants[v['uri']] = v
            for record in [d]+[json.loads(p.read_text(encoding='utf-8')) for p in (folder/'history').glob(path.stem+'-v*.json')]:
                files.update(local_masters(record))
                url=record.get('masterUrl')
                if url:
                    key=urlparse(url).path.lstrip('/')
                    assert key.startswith(('art/masters/gita/', 'art/masters/isha/')) and key.endswith('.png')
                    keys.add(key)
            records.append((path,d,folder))
    # Validate all deliveries before deleting even the first original.
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        verified_bytes=sum(pool.map(verify_variant, variants.values()))
    remote={}
    for prefix in ['art/masters/gita/', 'art/masters/isha/']:
        for page in client.get_paginator('list_objects_v2').paginate(Bucket=cfg['R2_BUCKET'], Prefix=prefix):
            for obj in page.get('Contents',[]):
                assert obj['Key'] in keys, 'Unrecognized original: abort rather than delete by prefix'
                remote[obj['Key']]=obj['Size']
    report={'checked_at':datetime.now(timezone.utc).isoformat(), 'applied':args.apply, 'verse_images':len(records), 'verified_reading_files':len(variants), 'verified_reading_bytes':verified_bytes, 'remote_masters':len(remote), 'remote_bytes_removed':sum(remote.values()), 'local_original_files':len(files), 'local_bytes_removed':sum(p.stat().st_size for p in files)}
    print(json.dumps(report),flush=True)
    if not args.apply:return
    for start in range(0,len(remote),1000):
        result=client.delete_objects(Bucket=cfg['R2_BUCKET'], Delete={'Objects':[{'Key':k} for k in list(remote)[start:start+1000]], 'Quiet':True})
        assert not result.get('Errors'), 'Remote deletion incomplete'
    for path in files:path.unlink()
    for path,d,folder in records:
        discard_local(d); save(path,d)
        for history in (folder/'history').glob(path.stem+'-v*.json'):
            old=json.loads(history.read_text(encoding='utf-8'));discard_local(old);save(history,old)
    for path,summary in summaries:
        for row in summary:
            row['master_retained']=False
            if row.get('masterUrl'):row['removed_master_url']=row.pop('masterUrl')
        save(path,summary)
    for prefix in ['art/masters/gita/', 'art/masters/isha/']:
        assert client.list_objects_v2(Bucket=cfg['R2_BUCKET'],Prefix=prefix,MaxKeys=1).get('KeyCount',0)==0
    report['remote_masters_remaining']=0
    save(OUT/'master-removal-report.json',report)
    print('Removed originals; all verified phone/tablet deliveries retained.',flush=True)

if __name__=='__main__':main()
