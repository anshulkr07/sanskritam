import asyncio, os, json
from dotenv import load_dotenv
load_dotenv('.env')
from app.evals.tasks import build_cases
from app.evals.providers import build_provider
async def main():
    cases = build_cases(['generate'], limit=1)
    c = cases[0]
    p = build_provider('sarvam')
    resp = await p.complete(c.system, c.user, json_mode=True)
    with open('debug_sarvam.json', 'w', encoding='utf-8') as f:
        json.dump({'sys': c.system, 'usr': c.user, 'resp': resp.to_dict()}, f, indent=2, ensure_ascii=False)
asyncio.run(main())
