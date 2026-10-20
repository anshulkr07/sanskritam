"""Record public cache response evidence without exposing credentials."""
import json
from datetime import datetime,timezone
from pathlib import Path
import requests
OUT=Path(__file__).resolve().parent
results=[]
with requests.Session() as session:
 for key in ['01-001','13-016','18-078']:
  delivery=json.loads((OUT/'deliveries'/f'{key}.json').read_text(encoding='utf-8'))
  variant=delivery['entry']['variants']['phone'];responses=[]
  for _ in range(2):
   response=session.get(variant['uri'],timeout=(15,30));response.raise_for_status()
   assert len(response.content)==variant['bytes']
   responses.append({'cache_status':response.headers.get('CF-Cache-Status'),'cache_control':response.headers.get('Cache-Control'),'bytes':len(response.content)})
  results.append({'key':key,'requests':responses})
assert all(r['requests'][-1]['cache_status']=='HIT' for r in results),'Repeat public requests must be CDN hits'
report={'checked_at':datetime.now(timezone.utc).isoformat(),'results':results}
(OUT/'cdn-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
