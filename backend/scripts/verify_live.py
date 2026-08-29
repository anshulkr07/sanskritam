"""Live server verification with proper UTF-8 (python httpx, not shell curl)."""
import httpx, json, sys

BASE = "http://localhost:8000"

r = httpx.post(f"{BASE}/auth/dev-login", json={"display_name": "utf8verify", "bridge_langs": ["en", "hi"]})
token = r.json()["token"]
H = {"Authorization": f"Bearer {token}"}

r = httpx.get(f"{BASE}/challenges/next", params={"register": "laukika", "mode": "text"}, headers=H)
ch = r.json()
print("challenge:", ch["prompt_l1"], "|", ch["target_sanskrit"])
cid = ch["id"]

def attempt(text):
    r = httpx.post(f"{BASE}/attempts", json={"challenge_id": cid, "response_text": text},
                   headers={**H, "Content-Type": "application/json; charset=utf-8"})
    d = r.json()
    print(f"  {text!r:30} -> verdict={d['verdict']:10} abstained={d['abstained']}  diag={d['diagnosis'][:70]}")
    return d

print("(a) scrambled correct:")
attempt("खादति फलं रामः")
attempt("खादति फलम् रामः")
print("(b) wrong case:")
attempt("रामम् फलम् खादति")
print("(c) garbage:")
attempt("asdfgh")

r = httpx.post(f"{BASE}/pipeline/run", headers={"X-Admin-Token": "dev-admin"})
d = r.json()
print("(d) pipeline:", d["passed"], "/", d["total"])
