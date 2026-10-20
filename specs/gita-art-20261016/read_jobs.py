"""Read a small generation chunk without sending the whole corpus to tool output."""
import argparse,json
from pathlib import Path
from job_policy import generation_jobs
if __name__ == '__main__':
 OUT=Path(__file__).resolve().parent
 if (OUT/'generation-hold.json').exists():
  print('[]');raise SystemExit(0)
 p=argparse.ArgumentParser();p.add_argument('--start',type=int,required=True);p.add_argument('--count',type=int,default=8);a=p.parse_args()
 jobs=generation_jobs()
 ready=[]
 for j in jobs[a.start:a.start+a.count]:
  if (OUT/'deliveries'/f"{j['key']}.json").exists():continue
  ready.append({'key':j['key'],'source_ref':j['source_ref'],'prompt':j['prompt']})
 print(json.dumps(ready,ensure_ascii=True))
