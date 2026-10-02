"""Word journey pipeline (handover_language 7.8).

No network. Made-up text in the dictionary's shape; no dictionary text is
pasted into the repo.
"""

from __future__ import annotations

import json


# ─── 1. The rule ────────────────────────────────────────────────────────────

def _seg(text: str) -> list[str]:
    return [text]


def test_rule_five_labels():
    from app.services.word_check import classify_ahd

    sanskrit = _seg("Middle test, from Old Test, from Sanskrit madeupstem")
    assert classify_ahd(sanskrit) == "sanskrit"

    filler = "x" * 150
    hedged = _seg(f"Middle test probably {filler} from Sanskrit madeupstem")
    assert classify_ahd(hedged) == "sanskrit_hedged"

    akin = _seg("Middle test, akin to Sanskrit madeupstem")
    assert classify_ahd(akin) == "akin_only"

    assert classify_ahd(_seg("Middle test, from Latin testword")) == "not_sanskrit"
    assert classify_ahd([]) == "no_etymology"
    assert classify_ahd(["HTTP 404"]) == "no_etymology"


def test_rule_hedge_150_before_counts_hedge_after_does_not():
    from app.services.word_check import classify_ahd

    filler = "q" * 150
    before = f"entry probably {filler} from Sanskrit stemword"
    assert classify_ahd([before]) == "sanskrit_hedged"

    after = "entry from Sanskrit stemword, probably a later sense"
    assert classify_ahd([after]) == "sanskrit"


# ─── 2. Cross-references followed once, not twice ───────────────────────────

class _FakeResp:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


class _FakeClient:
    def __init__(self, pages: dict[str, str]):
        self.pages = pages
        self.calls: list[str] = []

    def get(self, url, params=None):
        word = (params or {}).get("q", "")
        self.calls.append(word)
        return _FakeResp(200, self.pages.get(word, ""))


def _ety_page(*bodies: str) -> str:
    return "".join(f'<div class="etyseg">{b}</div>' for b in bodies)


def test_cross_ref_followed_once():
    from app.services.word_check import fetch_with_crossref

    pages = {
        # Pointer only, no history of its own.
        "lacquer": _ety_page("see LAC"),
        "LAC": _ety_page("Middle test, from Sanskrit teststem"),
    }
    client = _FakeClient(pages)
    segs, followed = fetch_with_crossref(client, "lacquer")
    assert followed == ["LAC"]
    assert any("Sanskrit" in s for s in segs)
    assert client.calls.count("lacquer") == 1
    assert client.calls.count("LAC") == 1


def test_cross_ref_not_followed_twice():
    from app.services.word_check import fetch_with_crossref

    pages = {
        "alpha": _ety_page("see BETA"),
        "BETA": _ety_page("see GAMMA"),
        "GAMMA": _ety_page("Middle test, from Sanskrit teststem"),
    }
    client = _FakeClient(pages)
    segs, followed = fetch_with_crossref(client, "alpha")
    # One level only: BETA's pointer text is used, GAMMA never fetched.
    assert followed == ["BETA"]
    assert "GAMMA" not in client.calls
    assert any("BETA" in s or "see" in s for s in segs)


# ─── 3. The Sanskrit gate ───────────────────────────────────────────────────

def test_sanskrit_gate_endings_and_invented():
    from app.services.word_check import gate_sanskrit, stem_from_printed_form

    stems = {"yoga", "jaNgala", "SarkarA"}
    assert stem_from_printed_form("yogaḥ") == "yoga"
    assert stem_from_printed_form("jaṅgalam") == "jaNgala"
    assert stem_from_printed_form("śarkarā") == "SarkarA"

    key, found = gate_sanskrit("yogaḥ", stems)
    assert (key, found) == ("yoga", True)
    key, found = gate_sanskrit("jaṅgalam", stems)
    assert (key, found) == ("jaNgala", True)
    key, found = gate_sanskrit("śarkarā", stems)
    assert (key, found) == ("SarkarA", True)

    key, found = gate_sanskrit("blorpus", stems)
    assert key == "" and found is False


# ─── 4. Verify ──────────────────────────────────────────────────────────────

_ENTRY = (
    "Madeupword, from Middle Madeup sukkar, from Old Madeup shakar, "
    "from Sanskrit madeupstem. A short test entry with ordinary words."
)
_SEGS = [_ENTRY]


def _reply(**kw):
    base = {
        "sanskrit_form": "madeupstem",
        "hops": [
            {"lang": "Old Madeup", "form": "shakar"},
            {"lang": "Middle Madeup", "form": "sukkar"},
        ],
        "hedged": False,
        "gloss": "a sweet test thing",
        "sanskrit_gloss": "test grit",
        "note": "It once meant something else.",
    }
    base.update(kw)
    return base


def test_verify_form_not_in_entry_fails():
    from app.services.word_pipeline import verify_reply

    ok, reasons = verify_reply(
        "madeupword", _ENTRY, _SEGS, "sanskrit",
        _reply(sanskrit_form="zzznotthere"),
    )
    assert not ok and any("sanskrit_form_not_in_entry" in r for r in reasons)


def test_verify_hops_wrong_order_fail():
    from app.services.word_pipeline import verify_reply

    # Entry runs word-back-to-Sanskrit (sukkar before shakar), so hops must
    # run Sanskrit-outward (shakar then sukkar). Flip them: fail.
    bad = _reply(hops=[
        {"lang": "Middle Madeup", "form": "sukkar"},
        {"lang": "Old Madeup", "form": "shakar"},
    ])
    ok, reasons = verify_reply("madeupword", _ENTRY, _SEGS, "sanskrit", bad)
    assert not ok and "hops_wrong_order" in reasons


def test_verify_note_copying_eight_words_fails():
    from app.services.word_pipeline import verify_reply

    eight = " ".join(_ENTRY.split()[:8])
    ok, reasons = verify_reply("madeupword", _ENTRY, _SEGS, "sanskrit",
                               _reply(note=eight + " extra tail words here"))
    assert not ok and any("note_copies_entry" in r for r in reasons)


def test_verify_clean_passes_and_builds_valid_item():
    from app.services.word_pipeline import build_item, verify_reply

    reply = _reply()
    ok, reasons = verify_reply("madeupword", _ENTRY, _SEGS, "sanskrit", reply,
                               rejected_set=set(), live_set=set())
    assert ok, reasons
    item = build_item(
        mw_key="SarkarA", lang="en", lang_name="English", word="madeupword",
        gloss=reply["gloss"], sanskrit_gloss=reply["sanskrit_gloss"],
        note=reply["note"], hops=reply["hops"], lookup="madeupword",
        checked_on="2026-10-03", confidence="certain",
    )
    assert item["mw_key"] == "SarkarA"
    assert item["routes"][0]["kind"] == "loan"
    assert item["routes"][0]["sources"] == ["ahd"]
    assert item["routes"][0]["checked_by"] == "rule"
    assert item["routes"][0]["hops"][0] == {"lang": "Old Madeup", "form": "shakar"}


# ─── 5. Vertex client with a mocked transport ───────────────────────────────

class _HttpResp:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text if text else (json.dumps(payload) if payload is not None else "")

    def json(self):
        return self._payload


class _StubHttp:
    def __init__(self):
        self.posts: list[dict] = []
        self.gets: list[str] = []
        self.job_state = "JOB_STATE_SUCCEEDED"
        self.predictions_text = ""

    def post(self, url, headers=None, content=None, json=None):
        self.posts.append({"url": url, "headers": headers, "json": json})
        if "storage.googleapis.com/upload" in url:
            return _HttpResp(200, {"name": "input.jsonl"})
        if "batchPredictionJobs" in url:
            return _HttpResp(200, {"name": "projects/p/locations/global/batchPredictionJobs/1",
                                   "displayName": (json or {}).get("displayName")})
        raise AssertionError(f"unexpected POST {url}")

    def get(self, url, headers=None):
        self.gets.append(url)
        if "batchPredictionJobs" in url:
            return _HttpResp(200, {"name": "projects/p/locations/global/batchPredictionJobs/1",
                                   "state": self.job_state,
                                   "outputInfo": {"gcsOutputDirectory": "gs://b/prefix/output/"}})
        if "storage.googleapis.com/storage" in url:
            return _HttpResp(200, None, self.predictions_text)
        raise AssertionError(f"unexpected GET {url}")


def _pred_line(key, text, prompt=10, cand=20, thought=150, err=""):
    response = {} if err else {
        "candidates": [{"content": {"parts": [{"text": text}]}}],
        "usageMetadata": {"promptTokenCount": prompt,
                          "candidatesTokenCount": cand,
                          "thoughtsTokenCount": thought},
    }
    status = {"code": "2", "message": err} if err else {}
    return json.dumps({"key": key, "response": response, "status": status})


def test_vertex_upload_job_body_polling_and_out_of_order_keys():
    from app.services.vertex_batch import VertexBatchClient, parse_predictions_jsonl, sum_tokens

    http = _StubHttp()
    # Lines come back in a different order: match by key.
    http.predictions_text = "\n".join([
        _pred_line("k2", '[{"word": "beta"}]'),
        _pred_line("k0", '[{"word": "alpha"}]'),
        _pred_line("k1", '[{"word": "gamma"}]', err="boom"),
    ])
    client = VertexBatchClient(
        credentials_path="dummy.json", project="videos-498005",
        bucket="videos-498005-batch", prefix="sanskritam-word-origins",
        http=http, token="test-token",
    )
    up = client.upload_input("sanskritam-word-origins/run/propose/input.jsonl", "{}\n")
    assert up["name"] == "input.jsonl"
    assert "videos-498005-batch" in http.posts[0]["url"]

    job = client.create_job("run1", "propose",
                            "sanskritam-word-origins/run/propose/input.jsonl")
    assert job["name"].endswith("batchPredictionJobs/1")
    body = http.posts[1]["json"]
    assert body["displayName"] == "sanskritam-word-origins-run1-propose"
    assert body["model"] == "publishers/google/models/gemini-3.8-flash"
    assert body["inputConfig"]["gcsSource"]["uris"] == [
        "gs://videos-498005-batch/sanskritam-word-origins/run/propose/input.jsonl"]
    assert body["outputConfig"]["gcsDestination"]["outputUriPrefix"] == \
        "gs://videos-498005-batch/sanskritam-word-origins/run1/propose/output/"

    for state in ("JOB_STATE_SUCCEEDED", "JOB_STATE_PARTIALLY_SUCCEEDED",
                  "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED"):
        http.job_state = state
        final = client.poll_job(job["name"], interval_s=0,
                                sleep_fn=lambda s: None, max_polls=1)
        assert final["state"] == state

    http.job_state = "JOB_STATE_SUCCEEDED"
    parsed = client.collect_predictions(client.get_job(job["name"]))
    assert set(parsed) == {"k0", "k1", "k2"}
    assert parsed["k0"]["text"] == '[{"word": "alpha"}]'
    assert parsed["k1"]["status"] == "failed"
    totals = sum_tokens(parsed)
    assert totals["answered"] == 2 and totals["failed"] == 1

    # No secret in the logged/requested headers beyond the bearer token, and
    # the token itself is never logged (caplog stays empty of it).
    assert http.posts[0]["headers"]["Authorization"] == "Bearer test-token"


# ─── 6. Approve ─────────────────────────────────────────────────────────────

def test_approve_writes_valid_file_and_refuses_collision(tmp_path):
    from app.services.word_pipeline import (
        build_batch_file, build_item, next_batch_name, validate_new_batch,
    )

    from app.services.word_pipeline import sanskrit_forms_for as _forms_for
    _dev, _iast = _forms_for("yoga")  # lipi-derived, never typed
    seeds = tmp_path / "seeds"
    seeds.mkdir()
    (seeds / "rejected.json").write_text(json.dumps({"items": []}), encoding="utf-8")
    existing = {
        "batch": "0000", "made_on": "2026-10-02", "maker": "t", "model": "",
        "start_date": "2026-10-15",
        "items": [{
            "id": "yoga", "status": "approved", "mw_key": "yoga",
            "sanskrit": {"dev": _dev, "iast": _iast},
            "gloss": "discipline", "attested_abbr": [], "attested": "",
            "note": "",
            "routes": [{"id": "yoga.en.yoga", "status": "approved", "lang": "en",
                        "lang_name": "English", "word": "yoga", "script": "latin",
                        "roman": "", "gloss": "discipline", "kind": "loan",
                        "confidence": "certain", "hops": [],
                        "sources": ["ahd"], "lookup": "yoga",
                        "checked_on": "2026-10-01", "checked_by": "hand"}],
        }],
    }
    (seeds / "batch-0000.json").write_text(json.dumps(existing), encoding="utf-8")

    item = build_item(
        mw_key="SarkarA", lang="en", lang_name="English", word="sugarfree",
        gloss="sweet thing", sanskrit_gloss="grit gravel",
        note="A short test note.", hops=[{"lang": "Arabic", "form": "sukkar"}],
        lookup="sugarfree", checked_on="2026-10-03", confidence="certain",
    )
    # Lipi-derived scripts agree with the file (5.6 rule 3).
    from app.services.iast import matches as _matches
    assert _matches(item["sanskrit"]["dev"], item["sanskrit"]["iast"])

    # Collision: reusing the taken date is refused.
    errors = validate_new_batch([item], "2026-10-15", seeds)
    assert any("collision" in e for e in errors)

    # Next free day passes every offline file rule.
    errors = validate_new_batch([item], "2026-10-16", seeds)
    assert errors == [], errors
    name = next_batch_name(seeds)
    assert name == "batch-0001.json"
    data = build_batch_file([item], name, "2026-10-16")
    out = seeds / name
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    reread = json.loads(out.read_text(encoding="utf-8"))
    assert reread["start_date"] == "2026-10-16"
    assert reread["items"][0]["routes"][0]["word"] == "sugarfree"
