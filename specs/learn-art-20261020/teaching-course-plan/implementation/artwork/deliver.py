"""Optimize, review and publish the new instructional illustrations."""
import argparse
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from dotenv import dotenv_values

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
APP = ROOT/'mobile/src/story/artwork'
spec = importlib.util.spec_from_file_location('story_delivery', APP/'deliver.py')
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)
pipeline.OUT = OUT


def read(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name+'.'+uuid4().hex+'.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--phone-reviewed', nargs='*')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    jobs = {j['id']: j for path in OUT.glob('generated-*.json') for j in read(path, [])}
    prepared = read(OUT/'prepared.json', {})
    delivered = read(OUT/'deliveries.json', [])
    done = {r['id'] for r in delivered}
    if args.prepare:
        for key, job in jobs.items():
            if key in done or key in prepared:
                continue
            review = job.get('review', {})
            assert review.get('text_verified') and review.get('visible_text') == job['expected'], key
            assert review.get('count_verified', True), key
            report = {'passed':True, 'expected':job['expected'], 'detected':review['visible_text'],
                      'sha256':hashlib.sha256(Path(job['original']).read_bytes()).hexdigest(),
                      'method':'Direct Codex visual inspection; no OCR service result claimed', 'notes':review['notes']}
            save(OUT/'review'/(key+'.json'), report)
            row = pipeline.prepare(job, report)
            for variant in row['variants'].values():
                source = Path(variant['file'])
                target = source.with_name(source.stem+'-'+variant['sha256'][:8]+source.suffix)
                source.replace(target)
                variant['file'] = str(target)
            prepared[key] = row
        save(OUT/'prepared.json', prepared)
    if args.phone_reviewed:
        for key in args.phone_reviewed:
            row = prepared[key]
            row['phone_review'] = {'method':'Direct inspection of optimized phone derivative',
                                   'sha256':row['variants']['phone']['sha256'], 'passed':True}
        save(OUT/'prepared.json', prepared)
    if args.publish:
        import boto3
        from botocore.config import Config
        cfg = {**dotenv_values(ROOT/'.env'), **dotenv_values(ROOT/'.env.deploy'), **os.environ}
        client = boto3.client('s3', endpoint_url='https://'+cfg['R2_ACCOUNT_ID']+'.r2.cloudflarestorage.com',
            aws_access_key_id=cfg['R2_ACCESS_KEY_ID'], aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],
            region_name='auto', config=Config(connect_timeout=15, read_timeout=60, retries={'max_attempts':3}))
        for key, row in prepared.items():
            if key in done:
                continue
            assert row.get('phone_review', {}).get('passed'), key+' needs phone review'
            assert row['phone_review']['sha256'] == row['variants']['phone']['sha256']
            pipeline.publish(row, cfg, client)
            original = Path(row['original']).resolve()
            allowed = (Path.home()/'.codex/generated_images').resolve()
            assert allowed in original.parents
            original.unlink()
            for old in row.get('history', []):
                path = Path(old['original']).resolve()
                assert allowed in path.parents
                if path.exists(): path.unlink()
                old['master_retained'] = False
            row['master_retained'] = False
            delivered.append(row)
            save(OUT/'deliveries.json', delivered)
            manifest = read(APP/'manifest.json', {})
            manifest[key] = {'phone':row['variants']['phone']['uri'], 'tablet':row['variants']['tablet']['uri'],
                             'width':row['width'], 'height':row['height']}
            save(APP/'manifest.json', manifest)
            print(key+': published, public hashes/dimensions/MIME/CDN HIT verified; originals discarded', flush=True)
        save(OUT/'prepared.json', prepared)
        subprocess.run([sys.executable, '-X', 'utf8', str(ROOT/'backend/scripts/sync_story_artwork.py'), '--apply'], check=True)
    print(f'{len(jobs)} generated records; {len(prepared)} optimized; {len(delivered)} delivered')


if __name__ == '__main__':
    main()
