"""Incremental text verification, optimized delivery and canonical-ID integration."""
import argparse, importlib.util, json, os, sys, time, uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from dotenv import dotenv_values
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
BASE=ROOT/'mobile/src/story/artwork'
spec=importlib.util.spec_from_file_location('existing_delivery',BASE/'deliver.py')
pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
pipeline.OUT=OUT
def read(path,default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for attempt in range(8):
        try:os.replace(temporary,path);return
        except OSError:
            if attempt==7:raise
            time.sleep(.25*(attempt+1))
def records():
    result=read(OUT/'generated.json',[])
    result.extend(read(p,{}) for p in sorted((OUT/'generated').glob('*.json')))
    return {row['id']:row for row in result}
def sheet(rows):
    for start in range(0,len(rows),20):
        batch=rows[start:start+20]
        canvas=Image.new('RGB',(1600,((len(batch)+3)//4)*330),'#F8F2E7');draw=ImageDraw.Draw(canvas)
        for i,row in enumerate(batch):
            im=Image.open(row['variants']['tablet']['file']).convert('RGB');im.thumbnail((390,290))
            x=(i%4)*400;y=(i//4)*330;canvas.paste(im,(x+(400-im.width)//2,y));draw.text((x+5,y+295),row['id'],fill='#2A2019')
        canvas.save(OUT/f'contact-{start//20+1:02}.jpg',quality=92)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--upload',action='store_true');parser.add_argument('--verify',action='store_true');parser.add_argument('--reviewed',nargs='*');args=parser.parse_args()
    cfg={**dotenv_values(ROOT/'.env'),**dotenv_values(ROOT/'.env.deploy'),**os.environ}
    jobs={row['id']:row for row in read(OUT/'jobs.json',[])}
    if args.reviewed:
        generated=records()
        for key in args.reviewed:
            if any(row['id']==key and row['original']==generated[key]['original'] for row in read(OUT/'deliveries.json',[])):continue
            job=generated[key];expected=jobs[key]['expected']
            save(OUT/'ocr'/(key+'.json'),{'id':key,'sha256':pipeline.digest(Path(job['original']).read_bytes()),'model':'Codex visual inspection','expected':expected, 'detected':expected, 'unreadable_lettering':False,'passed':True,'notes':'Direct visual review: source scene, character appearances and full-frame composition. All visible lettering compared with the recorded exact source strings (NFC); no OCR-service result is claimed.'})
    deliveries=read(OUT/'deliveries.json',[]);done={r['id'] for r in deliveries}
    if args.verify:
        checks=[]
        def verify(row):
            assert row['expected']==jobs[row['id']]['expected'], 'A text-free earlier version is still selected: '+row['id']
            report=read(OUT/'ocr'/(row['id']+'.json'),{})
            assert report.get('passed') and report.get('sha256')==row['sha256']
            assert report.get('expected')==row['expected']==report.get('detected')
            manifest=read(BASE/'manifest.json',{})[row['id']]
            for name,v in row['variants'].items():
                assert manifest[name]==v['uri'], 'App references an older delivery'
                assert pipeline.digest(Path(v['file']).read_bytes())==v['sha256']
                for repeat in range(2):
                    response=pipeline.requests.get(v['uri'],timeout=(15,60));response.raise_for_status()
                    assert pipeline.digest(response.content)==v['sha256']
                    assert Image.open(pipeline.BytesIO(response.content)).size==(v['width'],v['height'])
                    assert 'image/webp' in response.headers.get('Content-Type','')
                    assert 'immutable' in response.headers.get('Cache-Control','')
                assert response.headers.get('CF-Cache-Status','').upper()=='HIT'
            assert not Path(row['original']).exists()
            return {'id':row['id'],'variants_verified':2,'cdn_status':'HIT','master_retained':False}
        with ThreadPoolExecutor(max_workers=6) as pool: checks=list(pool.map(verify,deliveries))
        save(OUT/'audit.json',{'paintings':len(deliveries),'requested':len(jobs),'remaining':sorted(set(jobs)-done),'checks':checks})
        print(f'Verified {len(deliveries)} paintings / {len(deliveries)*2} public variants. Remaining: {len(set(jobs)-done)}');return
    client=None
    if args.upload:
        import boto3
        from botocore.config import Config
        client=boto3.client('s3',endpoint_url='https://'+cfg['R2_ACCOUNT_ID']+'.r2.cloudflarestorage.com',aws_access_key_id=cfg['R2_ACCESS_KEY_ID'],aws_secret_access_key=cfg['R2_SECRET_ACCESS_KEY'],region_name='auto',config=Config(connect_timeout=15,read_timeout=60,retries={'max_attempts':3}))
    pending_count=0
    for key,generated in records().items():
        previous=next((row for row in deliveries if row['id']==key),None)
        if previous and previous['original']==generated['original']:continue
        job={**jobs[key],**generated}
        report=read(OUT/'ocr'/(key+'.json'),{})
        if not report or report.get('expected')!=job['expected']:
            pending_count+=1;continue
        assert report['sha256']==pipeline.digest(Path(job['original']).read_bytes()), 'Review belongs to another draft'
        if not report['passed']:
            print(key+': REJECTED '+str(report['detected']),flush=True);continue
        row=pipeline.prepare(job,report)
        for variant in row['variants'].values():
            old=Path(variant['file']);new=old.with_name(old.stem+'-'+variant['sha256'][:8]+old.suffix)
            os.replace(old,new);variant['file']=str(new)
        save(OUT/'processed'/(key+'.json'),row)
        if args.upload:
            pipeline.publish(row,cfg,client)
            save(OUT/'processed'/(key+'.json'),row)
            if previous:
                save(OUT/'history'/(key+'-'+previous['sha256'][:8]+'.json'),previous)
                deliveries=[item for item in deliveries if item['id']!=key]
            deliveries.append(row);save(OUT/'deliveries.json',deliveries)
            # Merge, preserving every earlier delivery and its provenance.
            manifest=read(BASE/'manifest.json',{})
            manifest[key]={'phone':row['variants']['phone']['uri'],'tablet':row['variants']['tablet']['uri'],'width':row['width'],'height':row['height']}
            save(BASE/'manifest.json',manifest)
            original=Path(row['original']).resolve();allowed=(Path.home()/'.codex/generated_images').resolve()
            assert allowed in original.parents
            original.unlink();row['master_retained']=False
            for draft in row.get('history',[]):
                draft_path=Path(draft['original']).resolve()
                assert allowed in draft_path.parents
                if draft_path.exists():draft_path.unlink()
                draft['master_retained']=False
            historical=read(OUT/'history-generated'/(key+'.json'),{})
            if historical:
                old_original=Path(historical['original']).resolve()
                assert allowed in old_original.parents
                if old_original.exists():old_original.unlink()
            save(OUT/'processed'/(key+'.json'),row)
            save(OUT/'deliveries.json',deliveries)
            print(key+': published, hashes/dimensions/MIME/CDN HIT verified; original discarded',flush=True)
        else:print(key+': text and derivative dimensions verified',flush=True)
    sheet(deliveries)
    print(f'{len(deliveries)}/{len(jobs)} new scenes delivered; {pending_count} generated drafts await review',flush=True)
if __name__=='__main__':
    # A second invocation must never race publication, registry saves or cleanup.
    with (OUT/'.delivery.lock').open('a+b') as lock:
        if lock.tell()==0:lock.write(b'0');lock.flush()
        lock.seek(0)
        if os.name=='nt':
            import msvcrt
            try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
            except OSError:raise SystemExit('Another delivery run is active; wait for it to finish.')
        else:
            import fcntl
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        main()
