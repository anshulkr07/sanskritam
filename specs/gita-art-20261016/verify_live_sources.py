"""Read-only release check: the pinned meanings still match the app corpus."""
import json,re,sqlite3,unicodedata
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
def main():
 snapshot=json.loads((OUT/'verses.json').read_text(encoding='utf-8'))
 prefix=snapshot[0]['source_ref'].rsplit(' ',1)[0]+' %'
 con=sqlite3.connect('file:'+str(ROOT/'backend/app.db')+'?mode=ro',uri=True);con.row_factory=sqlite3.Row
 rows=[dict(r) for r in con.execute('SELECT id,verse_uid,source_ref,devanagari,iast,translation_en,translation_hi,date FROM shlokas WHERE source_ref LIKE ?',(prefix,))];con.close()
 def rank(row):
  return (-len(re.sub(r'[^\u0900-\u097f]|[।॥]','',row['devanagari'])),-bool((row['translation_en'] or row['translation_hi'] or '').strip()),row['date'],row['id'])
 best={}
 for row in rows:
  ref=unicodedata.normalize('NFC',row['source_ref'])
  if ref not in best or rank(row)<rank(best[ref]):best[ref]=row
 before={unicodedata.normalize('NFC',v['source_ref']):v for v in snapshot}
 changes=[];metadata=[]
 for ref,old in before.items():
  if ref not in best:continue
  current=best[ref];fields=[field for field in ['devanagari','translation_en'] if old[field]!=current[field]]
  if fields:changes.append({'source_ref':ref,'fields':fields})
  if old['verse_uid']!=current['verse_uid']:metadata.append(ref)
 report={'checked_at':datetime.now(timezone.utc).isoformat(),'canonical_count':len(best),'snapshot_count':len(before),'content_changes':changes,'missing_references':sorted(set(before)-set(best)),'added_references':sorted(set(best)-set(before)),'preferred_uid_changes':metadata}
 (OUT/'live-source-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=True))
 assert len(best)==700 and not changes and not report['missing_references'] and not report['added_references'],'The app corpus changed; review affected artwork before release'
if __name__=='__main__':main()
