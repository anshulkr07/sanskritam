"""Read a small generation chunk without sending the whole corpus to tool output."""
import argparse,json
from pathlib import Path
if __name__ == '__main__':
 OUT=Path(__file__).resolve().parent
 p=argparse.ArgumentParser();p.add_argument('--start',type=int,required=True);p.add_argument('--count',type=int,default=8);a=p.parse_args()
 jobs=json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'))
 ready=[]
 for j in jobs[a.start:a.start+a.count]:
  if (OUT/'deliveries'/f"{j['key']}.json").exists():continue
  ready.append({'key':j['key'],'source_ref':j['source_ref'],'prompt':j['prompt']})
 print(json.dumps(ready,ensure_ascii=True))
