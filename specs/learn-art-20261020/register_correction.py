"""Select a new draft while preserving exact earlier prompts and paths."""
import json,sys
from pathlib import Path
p=Path(__file__).resolve().parent
new=json.loads(Path(sys.argv[1]).read_text(encoding='utf8'));file=p/'generated'/(new['id']+'.json')
old=json.loads(file.read_text(encoding='utf8')) if file.exists() else None
if old and old['original']!=new['original']:new['history']=[*old.get('history',[]),{'original':old['original'],'prompt':old['prompt']}]
new.update(generator='built-in image_gen',policy_version='2026-10-20-complete-source-audit')
file.write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(new['id']+': new draft registered; review required')
