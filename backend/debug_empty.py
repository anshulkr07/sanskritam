import asyncio, httpx, os, json
from dotenv import load_dotenv
load_dotenv('.env')
from app.evals.tasks import build_cases
from app.evals.providers import build_provider
async def main():
    cases = build_cases(['generate'], limit=5)
    p = build_provider('sarvam')
    p.model = 'sarvam-105b'
    for c in cases:
        res = await p._client()
        resp = await res.post(p._endpoint(), json=p._payload(c.system, c.user, 0.0, 2048, True))
        body = resp.json()
        txt = ((body.get('choices') or [{}])[0].get('message') or {}).get('content') or ''
        if not txt.strip():
            with open('empty.json', 'w', encoding='utf-8') as f:
                json.dump(body, f, indent=2, ensure_ascii=False)
            break
asyncio.run(main())
