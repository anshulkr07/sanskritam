"""Try every key in GEMINI_API_KEYS once, so a bad key or model shows before users do.

    backend/.venv/Scripts/python.exe backend/scripts/check_gemini_keys.py
    backend/.venv/Scripts/python.exe backend/scripts/check_gemini_keys.py --no-chat   # embeddings only

For each key (named k1, k2, ... and never printed) and each model in
GEMINI_FREE_MODELS it sends one real Ask request (the Ask prompt, a typical
question, streamed as the app streams it) and prints the time to the first
piece and to the whole answer, then one embedding request, and finally compares
a free embedding with Vertex's for the same text. The same question goes to
Vertex once for comparison. Each free chat request uses one of that key's 20
requests for the day on that model; a 503 ("high demand") is tried once more.
Reads the keys from the same .env files as the server.

What it cannot tell you is whether a key is free: a project with billing
linked (AI Studio: "Tier 1") answers like any other and is charged per call.
Check each key's project in AI Studio before it goes in the list.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402
import numpy as np  # noqa: E402

from app.config import settings  # noqa: E402
from app.evals.providers import build_provider  # noqa: E402
from app.services import ask_live  # noqa: E402
from app.services import book_search as bs  # noqa: E402
from app.services import gemini_pool as gp  # noqa: E402

QUESTION = "What does the Katha Upanishad say about the good and the pleasant?"


async def timed_stream(prov, system: str, user: str) -> tuple[str, float, float, dict]:
    """(error, first piece ms, whole answer ms, usage); the error is empty when it worked."""
    usage: dict = {}
    t0 = time.perf_counter()
    first = 0.0
    text = ""
    try:
        async for piece in prov.stream(system, user, temperature=0.4, max_tokens=settings.ask_live_max_tokens,
                                       json_mode=True, usage=usage):
            if not text:
                first = (time.perf_counter() - t0) * 1000
            text += piece
    except Exception as exc:  # noqa: BLE001
        return str(exc)[:300], first, (time.perf_counter() - t0) * 1000, usage
    total = (time.perf_counter() - t0) * 1000
    try:
        json.loads(text)
    except ValueError:
        return "answer is not JSON", first, total, usage
    return "", first, total, usage


async def main(chat: bool, vertex: bool) -> int:
    keys = gp.parse_keys(settings.gemini_api_keys)
    if not keys:
        print("GEMINI_API_KEYS is empty. Put the keys in the repo-root .env or backend/.env, comma separated.")
        return 1
    models = [m for m in re.split(r"[,;\s]+", settings.gemini_free_models) if m]
    print(f"{len(keys)} key(s), models: {', '.join(models)}")
    bad = 0
    system = ask_live.system_prompt("")
    user = ask_live.user_message(QUESTION, "English")
    if chat:
        for i, key in enumerate(keys, 1):
            for model in models:
                prov = gp.GeminiApiProvider(key, model, timeout=60.0)
                for attempt in (1, 2):
                    err, first, total, usage = await timed_stream(prov, system, user)
                    if err.startswith("HTTP 503") and attempt == 1:
                        print(f"  k{i} {model}: 503 high demand, trying once more in 6 s")
                        await asyncio.sleep(6)
                        continue
                    break
                if not err:
                    print(f"  k{i} {model}: ok, first piece {first:.0f} ms, whole answer {total:.0f} ms, "
                          f"{usage.get('prompt_tokens', '?')}+{usage.get('output_tokens', '?')} tokens")
                else:
                    bad += 1
                    print(f"  k{i} {model}: FAILED {err!r}")
                await prov.close()
        if vertex:
            prov = build_provider("vertex:gemini-3.8-flash", timeout=60.0)
            if prov.configured:
                err, first, total, usage = await timed_stream(prov, system, user)
                print("  Vertex gemini-3.8-flash (for comparison): " + (
                    f"first piece {first:.0f} ms, whole answer {total:.0f} ms" if not err else f"FAILED {err!r}"))
                await prov.close()
            else:
                print("  Vertex comparison skipped: no Vertex credentials")
        print(f"  The app sends a free request to Vertex instead if no piece comes in {settings.gemini_free_timeout_s:.0f} s "
              f"(GEMINI_FREE_TIMEOUT_S).")
    emb = settings.book_search_embed_model
    free_vecs = {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i, key in enumerate(keys, 1):
            body = {"requests": [{"model": f"models/{emb}", "content": {"parts": [{"text": bs._PARITY_PROBE}]},
                                  "taskType": "RETRIEVAL_DOCUMENT", "outputDimensionality": settings.book_search_dims}]}
            r = await client.post(f"{gp.API_BASE}/models/{emb}:batchEmbedContents", json=body,
                                  headers={"x-goog-api-key": key})
            if r.status_code == 200:
                v = r.json()["embeddings"][0]["values"]
                free_vecs[i] = v
                print(f"  k{i} {emb}: ok, {len(v)} numbers")
            else:
                bad += 1
                print(f"  k{i} {emb}: FAILED HTTP {r.status_code} {r.text[:240]!r}")
        if free_vecs:
            try:
                paid = await bs._embed_vertex([bs._PARITY_PROBE], "RETRIEVAL_DOCUMENT", emb,
                                              settings.book_search_dims, client, 30.0)
                for i, v in free_vecs.items():
                    cos = float(np.dot(bs.unit(v), bs.unit(paid.vectors[0])))
                    verdict = "same" if cos >= bs._PARITY_MIN_COSINE else "DIFFERENT: the app will not use free embeddings"
                    print(f"  k{i} against Vertex: cosine {cos:.4f} ({verdict})")
            except Exception as exc:  # noqa: BLE001
                print(f"  Vertex comparison skipped: {type(exc).__name__}: {str(exc)[:160]}")
    print("all keys answered" if not bad else f"{bad} request(s) failed")
    return 1 if bad else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-chat", action="store_true", help="skip the chat requests (they use the day's quota)")
    ap.add_argument("--no-vertex", action="store_true", help="skip the one Vertex chat request used for comparison")
    args = ap.parse_args()
    raise SystemExit(asyncio.run(main(not args.no_chat, not args.no_vertex)))
