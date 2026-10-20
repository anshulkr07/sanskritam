"""Local-only FastAPI TestClient bridge; source backend and real DB are untouched."""
import json, os, sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timedelta, timezone
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'backend'))
os.environ.update(SHABD_IGNORE_DOTENV='1',DATABASE_URL='',ANALYZER='vidyut',DEV_LOGIN_ENABLED='true',DEFERRED_FEATURES_ENABLED='true',QUOTA_DAILY_BUDGET_INR='0',GEMINI_DAILY_BUDGET_USD='0',GEMINI_DAILY_BUDGET_INR='0',VERTEX_CREDENTIALS_PATH='',VERTEX_CREDENTIALS_JSON='')
for name in ('SARVAM_API_KEY','OPENROUTER_API_KEY','GEMINI_API_KEY','GEMINI_API_KEYS','OPENAI_API_KEY','ANTHROPIC_API_KEY','HF_TOKEN'):os.environ[name]=''
from fastapi.testclient import TestClient
from app.main import create_app
from app.db import SessionLocal
from app.models import ReviewItem
with TestClient(create_app()) as client:
 login=client.post('/auth/dev-login',json={'display_name':'Story acceptance','bridge_langs':['en']})
 assert login.status_code==200,login.text
 headers={'Authorization':'Bearer '+login.json()['token']}
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,*args): pass
  def dispatch(self):
   body=self.rfile.read(int(self.headers.get('Content-Length','0')))
   if self.path=='/_qa/make-due':
    db=SessionLocal()
    try:
     for item in db.query(ReviewItem).all():item.due_at=datetime.now(timezone.utc)-timedelta(days=1)
     db.commit()
    finally:db.close()
    self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{}');return
   response=client.request(self.command,self.path,content=body or None,headers={**headers,'Content-Type':'application/json',**({'If-None-Match':self.headers['If-None-Match']} if self.headers.get('If-None-Match') else {})})
   self.send_response(response.status_code);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(response.content)
  do_GET=dispatch
  do_POST=dispatch
 server=HTTPServer(('127.0.0.1',0),Handler)
 print(json.dumps({'port':server.server_port}),flush=True)
 server.serve_forever()
