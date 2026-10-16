"""Local read-only progress view. Only known jobs/thumbnails are exposed."""
import json,re
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
OUT=Path(__file__).resolve().parent
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  route=self.path.split('?',1)[0]
  if route=='/':body=(OUT/'progress.html').read_bytes();kind='text/html; charset=utf-8'
  elif route=='/jobs':
   jobs=json.loads((OUT/'generation-jobs.json').read_text(encoding='utf-8'));body=json.dumps([{k:j[k] for k in ['key','chapter','verse','source_ref','source_translation_en']} for j in jobs],ensure_ascii=False).encode();kind='application/json; charset=utf-8'
  elif route=='/status':
   values=[]
   for p in (OUT/'deliveries').glob('*.json'):
    try:values.append(json.loads(p.read_text(encoding='utf-8')))
    except (OSError,ValueError):continue
   body=json.dumps({'generated':len(values),'reviewed':sum(bool(d.get('reviewed')) for d in values),'published':sum(bool(d.get('published')) for d in values),'deliveries':[{'key':d['key'],'reviewed':bool(d.get('reviewed')),'published':bool(d.get('published'))} for d in values]}).encode();kind='application/json'
  elif re.fullmatch(r'/thumb/\d{2}-\d{3}\.webp',route):
   p=OUT/'thumbnails'/route.rsplit('/',1)[1]
   if not p.exists():self.send_error(404);return
   body=p.read_bytes();kind='image/webp'
  elif re.fullmatch(r'/master/\d{2}-\d{3}\.png',route):
   key=route.rsplit('/',1)[1][:-4]
   record=OUT/'deliveries'/f'{key}.json'
   if not record.exists():self.send_error(404);return
   data=json.loads(record.read_text(encoding='utf-8'))
   if not data.get('master_retained',True):
    self.send_response(302);self.send_header('Location',data['entry']['variants']['tablet']['uri']);self.send_header('Cache-Control','no-store');self.end_headers();return
   p=(OUT.parents[1]/data['master']).resolve()
   masters=(OUT.parents[1]/'results/gita-art-20261016/masters').resolve()
   if not p.is_relative_to(masters) or not p.exists():self.send_error(404);return
   body=p.read_bytes();kind='image/png'
  else:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',8769),Handler).serve_forever()
