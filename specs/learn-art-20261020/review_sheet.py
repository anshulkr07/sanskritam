"""Render numbered contact sheets without retaining extra generation PNG copies."""
import argparse, importlib.util, hashlib
from pathlib import Path
from PIL import Image, ImageDraw
OUT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('delivery',OUT/'deliver.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
parser=argparse.ArgumentParser();parser.add_argument('--start',type=int,default=0);parser.add_argument('--count',type=int,default=8);parser.add_argument('--no-text',action='store_true');parser.add_argument('--text',action='store_true');parser.add_argument('--unreviewed',action='store_true');args=parser.parse_args()
jobs=module.read(OUT/'jobs.json',[]);generated=module.records();rows=[(i,j,generated[j['id']]) for i,j in enumerate(jobs) if j['id'] in generated and Path(generated[j['id']]['original']).exists()]
if args.no_text:rows=[r for r in rows if not r[1]['expected']]
if args.text:rows=[r for r in rows if r[1]['expected']]
if args.unreviewed:
    def pending(row):
        _,job,generation=row;report=module.read(OUT/'ocr'/(job['id']+'.json'),{})
        return not (report.get('passed') and report.get('expected')==job['expected'] and report.get('sha256')==module.pipeline.digest(Path(generation['original']).read_bytes()))
    rows=[row for row in rows if pending(row)]
rows=rows[args.start:args.start+args.count]
module.save(OUT/'review-current.json',[job['id'] for _,job,_ in rows])
canvas=Image.new('RGB',(1600,((len(rows)+1)//2)*640),'#F8F2E7');draw=ImageDraw.Draw(canvas)
for pos,(i,job,generation) in enumerate(rows):
    im=Image.open(generation['original']).convert('RGB');im.thumbnail((790,595));x=(pos%2)*800;y=(pos//2)*640
    canvas.paste(im,(x+(800-im.width)//2,y));draw.text((x+8,y+602),f'{i}: {job["id"]}',fill='#2A2019')
identity='|'.join(job['id']+generation['original'] for _,job,generation in rows)
target=OUT/('review-'+hashlib.sha256(identity.encode()).hexdigest()[:12]+'.jpg')
if rows:canvas.save(target,quality=94)
for _,job,_ in rows:
    print(job['id']+': '+job['brief']['brief'])
    if job['expected']:print('EXPECTED: '+repr(job['expected']))
if rows:print('IMAGE: '+str(target))
