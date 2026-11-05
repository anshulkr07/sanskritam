"""AdMob reward callbacks.

verify_callback only proves a callback came from Google. Whether it grants
anything is reward_problem's job, so a genuine callback that grants nothing
(AdMob's "Verify URL" test, an unknown unit, a replay) still gets HTTP 200 and
AdMob accepts the URL; only a bad signature is refused.
"""
import base64
import json
import time
from pathlib import Path
from urllib.parse import parse_qs, unquote

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.config import settings

_keys = {}
_loaded_at = 0


async def verify_callback(query):
    """Google's signature over the raw query string; returns the signed fields."""
    global _keys, _loaded_at
    try:
        signed, suffix = query.split("&signature=", 1)
        signature_text, key_suffix = suffix.split("&key_id=", 1)
        key_id = key_suffix.split("&", 1)[0]
        if time.monotonic() - _loaded_at > 3600 or key_id not in _keys:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get("https://www.gstatic.com/admob/reward/verifier-keys.json")
                response.raise_for_status()
                _keys = {str(k["keyId"]): k["pem"] for k in response.json()["keys"]}
                _loaded_at = time.monotonic()
        raw = unquote(signature_text)
        signature = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
        key = serialization.load_pem_public_key(_keys[key_id].encode())
        key.verify(signature, signed.encode(), ec.ECDSA(hashes.SHA256()))
        parsed = parse_qs(signed, strict_parsing=True)
        if any(len(v) != 1 for v in parsed.values()):
            raise ValueError("Duplicate parameter")
        return {k: v[0] for k, v in parsed.items()}
    except Exception as exc:
        raise HTTPException(401, "Ad reward verification failed") from exc


# Lists live in a checked-in file: Cloud Run's comma-joined --update-env-vars
# (deploy/gcp/deploy.sh) cannot carry JSON. A non-empty env list still wins.
CONFIG_FILE = Path(__file__).with_name("ad_config.json")


def _listed(env_value, key):
    try:
        values = json.loads(env_value or "[]")
    except ValueError:
        values = []
    if isinstance(values, list) and values:
        return values
    try:
        values = json.loads(CONFIG_FILE.read_text(encoding="utf-8")).get(key, [])
    except (OSError, ValueError, AttributeError):
        return []
    return values if isinstance(values, list) else []


def unit_ids():
    """Configured rewarded units as Google's callback names them: the number
    after the slash. Accepts either "ca-app-pub-…/123" or "123"."""
    values = _listed(settings.commerce_admob_units, "rewarded_units")
    return {str(v).strip().rsplit("/", 1)[-1] for v in values if str(v).strip()}


def reward_problem(data, now_ms=None):
    """Why a verified callback grants nothing, or None when it may grant."""
    if str(data.get("ad_unit", "")).rsplit("/", 1)[-1] not in unit_ids():
        return "unrecognised ad unit"
    try:
        stamp = int(data.get("timestamp", ""))
    except ValueError:
        return "missing timestamp"
    now_ms = time.time() * 1000 if now_ms is None else now_ms
    if abs(now_ms - stamp) > 24 * 3600 * 1000:
        return "stale reward"
    if not data.get("transaction_id") or not data.get("custom_data"):
        return "missing reward identity"
    return None
