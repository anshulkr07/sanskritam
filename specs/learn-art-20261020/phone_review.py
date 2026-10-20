import json,argparse,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
p=Path(__file__).resolve().parent
ap=argparse.ArgumentParser();ap.add_argument('--start',type=int,default=0);ap.add_argument('--count',type=int,default=4);a=ap.parse_args()
jobs={j['id']:j for j in json.loads((p/'jobs.json').read_text(encoding='utf8'))}
rows=[r for r in json.loads((p/'deliveries.json').read_text(encoding='utf8')) if r['expected'] and r['expected']==jobs[r['id']]['expected']][a.start:a.start+a.count]
im=Image.new('RGB',(1600,((len(rows)+1)//2)*640),'#f8f2e7');d=ImageDraw.Draw(im)
for i,r in enumerate(rows):
 v=r['variants']['phone'];f=Path(v['file']);assert hashlib.sha256(f.read_bytes()).hexdigest()==v['sha256']
 asset=Image.open(f).convert('RGB');asset.thumbnail((790,595));x=i%2*800;y=i//2*640;im.paste(asset,(x+(800-asset.width)//2,y));d.text((x+8,y+602),r['id'],fill='black')
 print(r['id']+': '+repr(r['expected']))
out=p/('phone-proof-'+str(a.start)+'.jpg');im.save(out,quality=94);print('IMAGE: '+str(out))
