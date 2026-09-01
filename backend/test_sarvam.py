import asyncio, httpx, os
from dotenv import load_dotenv
load_dotenv('.env')
async def main():
    client = httpx.AsyncClient(headers={'api-subscription-key': os.environ.get('SARVAM_API_KEY')})
    res = await client.post('https://api.sarvam.ai/v1/chat/completions', json={'model': 'sarvam-105b', 'messages': [{'role': 'user', 'content': 'hi'}], 'max_tokens': 512, 'temperature': 0.0})
    with open('result.json', 'w', encoding='utf-8') as f:
        f.write(res.text)
asyncio.run(main())
