"""Discard task generation PNGs only after every requested selection verifies."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
OUT=Path(__file__).resolve().parent
GENERATED=Path.home()/'.codex/generated_images/01a15763-ed53-7072-8dab-a3474e7644af'
ap=argparse.ArgumentParser();ap.add_argument('--apply',action='store_true');args=ap.parse_args()
files=list(GENERATED.glob('*.png'));rows=[]
for f in files:
 assert f.resolve().parent==GENERATED.resolve()
 with Image.open(f) as im:size=list(im.size)
 rows.append({'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'dimensions':size,'disposition':'temporary unselected or superseded generation; no master backup'})
if args.apply:
 coverage=json.loads((OUT/'coverage-audit.json').read_text(encoding='utf8'));audit=json.loads((OUT/'audit.json').read_text(encoding='utf8'))
 assert not coverage['pending'] and not coverage['missing_source_images']
 assert audit['paintings']==audit['requested']==168 and not audit['remaining']
 receipt=OUT/'discarded-temporary-generations.json'
 previous=json.loads(receipt.read_text(encoding='utf8')) if receipt.exists() else []
 receipt.write_text(json.dumps(previous+rows,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 for row in rows:Path(row['path']).unlink()
 assert not list(GENERATED.glob('*.png'))
print(str(len(rows))+(' temporary PNGs discarded' if args.apply else ' temporary PNGs awaiting final verification/cleanup'))
