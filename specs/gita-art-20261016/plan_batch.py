"""List a bounded set of missing masters; generation remains in the built-in tool."""
import argparse,json
from pathlib import Path
OUT=Path(__file__).resolve().parent
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=32);a=p.parse_args()
 jobs=json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'))
 missing=[{'index':i,'key':j['key'],'source_ref':j['source_ref']} for i,j in enumerate(jobs) if not (OUT/'deliveries'/f"{j['key']}.json").exists()]
 print(json.dumps({'existing':len(jobs)-len(missing),'jobs':missing[:a.limit]},ensure_ascii=True))
