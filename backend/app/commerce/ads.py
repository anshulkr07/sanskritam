"""Verify Google's signed, raw query string before trusting any ad reward fields."""
import base64
import json
import time
from urllib.parse import parse_qs

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.config import settings

_keys = {}
_loaded_at = 0


async def verify_callback(query):
    global _keys, _loaded_at
    try:
        signed, suffix = query.split("&signature=", 1)
        signature_text, key_suffix = suffix.split("&key_id=", 1)
        key_id = key_suffix.split("&", 1)[0]
        parsed = parse_qs(signed, strict_parsing=True)
        if any(len(v) != 1 for v in parsed.values()) or not {"custom_data", "timestamp", "transaction_id", "ad_unit"}.issubset(parsed):
            raise ValueError("Invalid reward fields")
        if time.monotonic() - _loaded_at > 3600 or key_id not in _keys:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get("https://www.gstatic.com/admob/reward/verifier-keys.json")
                response.raise_for_status()
                _keys = {str(k["keyId"]): k["pem"] for k in response.json()["keys"]}
                _loaded_at = time.monotonic()
        from urllib.parse import unquote
        raw = unquote(signature_text)
        signature = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
        key = serialization.load_pem_public_key(_keys[key_id].encode())
        key.verify(signature, signed.encode(), ec.ECDSA(hashes.SHA256()))
        parsed = parse_qs(signed, strict_parsing=True)
        if any(len(v) != 1 for v in parsed.values()):
            raise ValueError("Duplicate parameter")
        data = {k: v[0] for k, v in parsed.items()}
        if data["ad_unit"] not in json.loads(settings.commerce_admob_units):
            raise ValueError("Unrecognized ad unit")
        if abs(time.time() * 1000 - int(data["timestamp"])) > 24 * 3600 * 1000:
            raise ValueError("Stale reward")
        if not data.get("transaction_id") or not data.get("custom_data"):
            raise ValueError("Missing reward identity")
        return data
    except Exception as exc:
        raise HTTPException(401, "Ad reward verification failed") from exc
