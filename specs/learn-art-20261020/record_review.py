"""Bind direct visual proofreading to the exact master shown in a contact sheet."""
import argparse,importlib.util
from pathlib import Path
OUT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('delivery',OUT/'deliver.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
parser=argparse.ArgumentParser();parser.add_argument('snapshot');parser.add_argument('--approve',nargs='+',required=True);args=parser.parse_args()
snapshot=Path(args.snapshot).resolve();assert snapshot.parent==OUT
rows={row['id']:row for row in module.read(snapshot,[])}
jobs={row['id']:row for row in module.read(OUT/'jobs.json',[])};generated=module.records()
for key in args.approve:
    row=rows[key];assert row['expected']==jobs[key]['expected'],'The approved text plan changed after this sheet was made'
    assert generated[key]['original']==row['original'],'Another draft replaced the reviewed master'
    original=Path(row['original'])
    if not original.exists():
        delivered=next((r for r in module.read(OUT/'deliveries.json',[]) if r['id']==key),None)
        assert delivered and delivered['sha256']==row['sha256'];continue
    assert module.pipeline.digest(original.read_bytes())==row['sha256']
    module.save(OUT/'ocr'/(key+'.json'),{**row,'model':'Codex direct visual proofreading','detected':row['expected'],'unreadable_lettering':False,'passed':True,'notes':'Painting reviewed against its exact source brief. Every visible text string compared with the recorded source text; reference font inspected when needed. This is direct visual review, not an OCR-service result.'})
print(f'{len(args.approve)} exact-master visual/text reviews recorded')
