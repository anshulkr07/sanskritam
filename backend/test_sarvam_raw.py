import asyncio, httpx, os, json
from dotenv import load_dotenv
load_dotenv('.env')
from app.evals.tasks import build_cases
async def main():
    cases = build_cases(['generate'], limit=1)
    c = cases[0]
    client = httpx.AsyncClient(headers={'api-subscription-key': os.environ.get('SARVAM_API_KEY')}, timeout=90.0)
    res = await client.post('https://api.sarvam.ai/v1/chat/completions', json={'model': 'sarvam-105b', 'messages': [{'role': 'system', 'content': c.system}, {'role': 'user', 'content': c.user}], 'max_tokens': 512, 'temperature': 0.0, 'response_format': {'type': 'json_object'}})
    with open('raw_sarvam.json', 'w', encoding='utf-8') as f:
        f.write(res.text)
asyncio.run(main())
