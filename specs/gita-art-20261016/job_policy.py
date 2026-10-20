"""Use versioned prompt overrides; never rewrite historical generation prompts."""
import json
from pathlib import Path
OUT=Path(__file__).resolve().parent
def generation_jobs():
 jobs=json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'))
 path=OUT/'phone-first-jobs.json'
 overrides=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
 return [{**job,**overrides.get(job['key'],{})} for job in jobs]
