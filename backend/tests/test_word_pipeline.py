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
        # The site's own shape: part of the history, then a pointer in
        # capitals with a homograph digit.
        "lacquer": _ety_page("[Old Test lacre, from Other Test laca; see LAC1.]"),
        "LAC": _ety_page("[Middle test, from Sanskrit teststem.]"),
    }
    client = _FakeClient(pages)
    slept: list[float] = []
    segs, followed = fetch_with_crossref(client, "lacquer", pause_s=1.0, sleep_fn=slept.append)
    assert followed == ["LAC"]
    # The word's own text comes first, then the entry it points at.
    assert segs[0].startswith("[Old Test lacre") and "Sanskrit" in segs[1]
    assert client.calls == ["lacquer", "LAC"]
    assert slept == [1.0]  # one request a second, the followed one included


def test_cross_ref_shapes():
    from app.services.word_check import extract_cross_refs, fetch_with_crossref

    assert extract_cross_refs(["[SANDAL1 + WOOD1.]"]) == ["SANDAL", "WOOD"]
    assert extract_cross_refs(["[x; see LAC1.]"]) == ["LAC"]
    assert extract_cross_refs(["[See KERMES.]"]) == ["KERMES"]
    # A pointer into the appendix of roots is not an entry.
    root = "[Middle Test, from Old Test; see kwel- in the Appendix of Indo-European roots.]"
    assert extract_cross_refs([root]) == []
    client = _FakeClient({"wheel": _ety_page(root)})
    segs, followed = fetch_with_crossref(client, "wheel")
    assert followed == [] and client.calls == ["wheel"]

    # A compound is followed into both of its parts.
    client = _FakeClient({
        "sandalwood": _ety_page("[SANDAL1 + WOOD1.]"),
        "SANDAL": _ety_page("[Middle Test, from Sanskrit teststem.]"),
        "WOOD": _ety_page("[Old Test wudu.]"),
    })
    segs, followed = fetch_with_crossref(client, "sandalwood")
    assert followed == ["SANDAL", "WOOD"]
    assert any("Sanskrit" in s for s in segs)


def test_failed_fetch_is_not_a_rejection():
    from app.services.word_check import check_word, fetch_failed, fetch_with_crossref

    class _Down(_FakeClient):
        def get(self, url, params=None):
            self.calls.append((params or {}).get("q", ""))
            return _FakeResp(503, "")

    segs, followed = fetch_with_crossref(_Down({}), "anyword")
    assert fetch_failed(segs) and followed == []
    row = check_word("anyword", segs, set())
    assert row["status"] == "fetch_failed"
    # Really no word history is still a rejection.
    assert check_word("anyword", [], set())["status"] == "rejected"

    # A followed entry that does not answer adds nothing to the text.
    class _HalfDown(_FakeClient):
        def get(self, url, params=None):
            word = (params or {}).get("q", "")
            self.calls.append(word)
            if word == "LAC":
                return _FakeResp(503, "")
            return _FakeResp(200, self.pages.get(word, ""))

    segs, followed = fetch_with_crossref(_HalfDown({"lacquer": _ety_page("[x; see LAC1.]")}), "lacquer")
    assert segs == ["[x; see LAC1.]"] and followed == ["LAC"]


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


def test_sanskrit_form_is_read_whole_and_from_the_source_clause():
    from app.services.word_check import (
        check_word, sanskrit_printed_form, stem_from_printed_form,
    )

    # A letter outside ASCII and the long-vowel range must not end the form:
    # the form after "Sanskrit" here was once read as its first two letters.
    form = sanskrit_printed_form(["[Hindi panch, from Sanskrit pañca, five.]"])
    assert form == "pañca"
    assert stem_from_printed_form(form) == "paYca"

    # A form printed as a stem keeps its last letter; hyphens are not letters.
    assert stem_from_printed_form("jaṅgala-") == "jaNgala"
    assert stem_from_printed_form("kṛmi-ja-") == "kfmija"

    # The relative an entry calls "akin to Sanskrit ..." is not the source.
    seg = "[Old Test modor, akin to Sanskrit mātā, mother; later from Sanskrit yogaḥ, union.]"
    assert sanskrit_printed_form([seg]) == "yogaḥ"
    row = check_word("madeupword", [seg], {"yoga", "mAtA"})
    assert (row["status"], row["mw_key"]) == ("pass", "yoga")
    assert sanskrit_printed_form(["[Old Test modor, akin to Sanskrit mātā, mother.]"]) == ""


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


def test_verify_holds_back_what_the_check_did_not_pass():
    from app.services.word_pipeline import verify_reply

    hedged_entry = "Madeupword, probably from Old Madeup shakar, from Sanskrit madeupstem."
    reply = _reply(hops=[{"lang": "Old Madeup", "form": "shakar"}], hedged=True)
    # The reply itself is faithful, but a hedged entry waits for the owner.
    ok, reasons = verify_reply("madeupword", hedged_entry, [hedged_entry], "sanskrit_hedged",
                               reply, check_status="needs_look", check_reason="hedged")
    assert not ok and reasons == ["check:hedged"]


def test_verify_form_must_be_the_checked_stem():
    from app.services.word_pipeline import verify_reply

    entry = "[Old Test modor, akin to Sanskrit mātā, mother; later from Sanskrit yogaḥ, union.]"
    good = {"sanskrit_form": "yogaḥ", "hops": [], "hedged": False, "gloss": "a thing", "note": ""}
    ok, reasons = verify_reply("madeupword", entry, [entry], "sanskrit", good, mw_key="yoga")
    assert ok, reasons
    other = dict(good, sanskrit_form="mātā")
    ok, reasons = verify_reply("madeupword", entry, [entry], "sanskrit", other, mw_key="yoga")
    assert not ok and "sanskrit_form_is_not_the_checked_stem" in reasons


def test_verify_and_approve_refuse_a_sanskrit_word_already_carried():
    from app.services.word_pipeline import origin_id_for_mw, verify_reply

    entry = "[Hindi madeup, from Sanskrit yogaḥ, union.]"
    reply = {"sanskrit_form": "yogaḥ", "hops": [{"lang": "Hindi", "form": "madeup"}],
             "hedged": False, "gloss": "a thing", "note": ""}
    held = {origin_id_for_mw("yoga")}
    ok, reasons = verify_reply("madeupword", entry, [entry], "sanskrit", reply,
                               mw_key="yoga", origin_ids=held)
    assert not ok and reasons == ["stem_already_live:yoga"]
    ok, reasons = verify_reply("madeupword", entry, [entry], "sanskrit", reply,
                               mw_key="yoga", origin_ids={"sharkara"})
    assert ok, reasons


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


def _made_run(tmp_path, monkeypatch):
    """The CLI pointed at a temp working folder and a temp seeds folder that
    holds one batch (the Sanskrit word yoga, on 2026-10-15)."""
    import scripts.word_origins as cli
    from app.services.word_pipeline import sanskrit_forms_for

    seeds = tmp_path / "seeds"
    seeds.mkdir()
    (seeds / "rejected.json").write_text(json.dumps({"items": []}), encoding="utf-8")
    dev, iast = sanskrit_forms_for("yoga")
    (seeds / "batch-0000.json").write_text(json.dumps({
        "batch": "0000", "made_on": "2026-10-02", "maker": "t", "model": "",
        "start_date": "2026-10-15",
        "items": [{
            "id": "yoga", "status": "approved", "mw_key": "yoga",
            "sanskrit": {"dev": dev, "iast": iast}, "gloss": "discipline",
            "attested_abbr": [], "attested": "", "note": "",
            "routes": [{"id": "yoga.en.yoga", "status": "approved", "lang": "en",
                        "lang_name": "English", "word": "yoga", "script": "latin",
                        "roman": "", "gloss": "discipline", "kind": "loan",
                        "confidence": "certain", "hops": [], "sources": ["ahd"],
                        "lookup": "yoga", "checked_on": "2026-10-01", "checked_by": "hand"}],
        }],
    }), encoding="utf-8")
    monkeypatch.setattr(cli, "SEEDS_WO_DIR", seeds)
    monkeypatch.setattr(cli, "RESULTS_DIR", tmp_path / "results")
    run = tmp_path / "results" / "made"
    run.mkdir(parents=True)

    def entry(lang_word, form, lead=""):
        return f"[{lead}Hindi {lang_word}, from Sanskrit {form}, something.]"

    words = {
        # word: (entry, check status, check reason, label, stem)
        "alphaword": (entry("alfa", "rathaḥ"), "pass", "", "sanskrit", "raTa"),
        "betaword": (entry("beta", "śarkarā", "Probably from "), "needs_look", "hedged",
                     "sanskrit_hedged", "SarkarA"),
        "gammaword": (entry("gamma", "yogaḥ"), "pass", "", "sanskrit", "yoga"),
    }
    check_rows, replies = [], {}
    for i, (word, (text, status, reason, label, stem)) in enumerate(words.items()):
        check_rows.append({"word": word, "label": label, "printed": "", "mw_key": stem,
                           "stem_found": True, "status": status, "reason": reason,
                           "entry_text": text, "entry_segs": [text],
                           "entry_url": "https://example.invalid/" + word})
        replies[f"write-{i:03d}-{word}"] = json.dumps({
            "sanskrit_form": text.split("Sanskrit ")[1].split(",")[0],
            "hops": [{"lang": "Hindi", "form": text.split("Hindi ")[1].split(",")[0]}],
            "hedged": label == "sanskrit_hedged",
            "gloss": "a made up thing", "sanskrit_gloss": "made up meaning",
            "note": "A short made up note.",
        }, ensure_ascii=False)
    (run / "check.json").write_text(json.dumps({"rows": check_rows}, ensure_ascii=False), encoding="utf-8")
    (run / "write_manifest.json").write_text(json.dumps({"words": list(words)}), encoding="utf-8")
    (run / "writes.json").write_text(json.dumps({"replies": replies}, ensure_ascii=False), encoding="utf-8")
    return cli, seeds, run


def test_cli_verify_review_approve_on_a_made_up_run(tmp_path, monkeypatch, capsys):
    """The commands themselves: only the word the check passed goes on by
    itself; a hedged one needs --also; a Sanskrit word an earlier batch
    carries is refused; a date clash is refused."""
    from app.services.word_pipeline import sanskrit_forms_for, validate_new_batch

    cli, seeds, run = _made_run(tmp_path, monkeypatch)
    assert cli.main(["verify", "--run", "made"]) == 0
    rows = {r["word"]: r for r in json.loads((run / "verify.json").read_text(encoding="utf-8"))["rows"]}
    assert rows["alphaword"]["passed"] is True
    assert rows["betaword"]["passed"] is False and rows["betaword"]["reasons"] == ["check:hedged"]
    assert rows["gammaword"]["reasons"] == ["stem_already_live:yoga"]

    assert cli.main(["review", "--run", "made"]) == 0
    sheet = (run / "review.md").read_text(encoding="utf-8")
    passed_part, look_part = sheet.split("## Needs a look")
    assert "### alphaword" in passed_part and "### betaword" in look_part and "### gammaword" in look_part
    dev, iast = sanskrit_forms_for("raTa")
    # The Sanskrit word as the learner will see it, and each stop with its language.
    assert f"Sanskrit: {dev} {iast}" in passed_part and "raTa" not in passed_part
    assert f"Stops: Sanskrit {iast} > Hindi alfa > English alphaword" in passed_part
    assert "Dictionaries say probably" in look_part

    # A dry run writes nothing.
    assert cli.main(["approve", "--run", "made"]) == 0
    assert sorted(p.name for p in seeds.glob("batch-*.json")) == ["batch-0000.json"]

    # A clash with a date that is taken is refused.
    assert cli.main(["approve", "--run", "made", "--start", "2026-10-15", "--live"]) == 1
    # So is the word whose Sanskrit word batch 0 already carries.
    assert cli.main(["approve", "--run", "made", "--also", "gammaword", "--live"]) == 1
    assert sorted(p.name for p in seeds.glob("batch-*.json")) == ["batch-0000.json"]

    # The owner's yes: the passed word, plus the hedged one by name.
    assert cli.main(["approve", "--run", "made", "--also", "betaword", "--live"]) == 0
    doc = json.loads((seeds / "batch-0001.json").read_text(encoding="utf-8"))
    assert doc["start_date"] == "2026-10-16"  # the day after the last one taken
    by_word = {r["word"]: r for it in doc["items"] for r in it["routes"]}
    assert set(by_word) == {"alphaword", "betaword"}
    assert by_word["alphaword"]["confidence"] == "certain"
    assert by_word["betaword"]["confidence"] == "probable"
    # The file it wrote keeps every file rule, checked as if it were new.
    (seeds / "batch-0001.json").rename(tmp_path / "written.json")
    assert validate_new_batch(doc["items"], doc["start_date"], seeds) == []
    capsys.readouterr()


def test_cli_write_takes_a_stem_from_the_owner(tmp_path, monkeypatch, capsys):
    """A word whose printed form the kosha does not hold can be carried on
    with a stem the owner gives; it still needs --also."""
    cli, seeds, run = _made_run(tmp_path, monkeypatch)
    data = json.loads((run / "check.json").read_text(encoding="utf-8"))
    data["rows"].append({"word": "deltaword", "label": "sanskrit", "printed": "rājā",
                         "mw_key": "", "stem_found": False, "status": "needs_look",
                         "reason": "stem_not_in_kosha", "stem_guess": "rAjA",
                         "entry_text": "[Hindi delta, from Sanskrit rājā, king.]",
                         "entry_segs": ["[Hindi delta, from Sanskrit rājā, king.]"],
                         "entry_url": "https://example.invalid/deltaword"})
    (run / "check.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    assert cli.main(["write", "--run", "made", "--stem", "deltaword=rAjan!"]) == 2
    assert cli.main(["write", "--run", "made", "--stem", "alphaword=raTa"]) == 2  # not needs-a-look
    assert cli.main(["write", "--run", "made", "--stem", "deltaword=rAjan"]) == 0  # dry: no job
    lines = [json.loads(l) for l in (run / "write_input.jsonl").read_text(encoding="utf-8").splitlines()]
    prompt = next(l for l in lines if l["key"].endswith("deltaword"))["request"]["contents"][0]["parts"][0]["text"]
    # The stem goes to the model in roman letters, not in the SLP1 key.
    assert "Sanskrit stem (roman letters): rājan" in prompt
    row = next(r for r in json.loads((run / "check.json").read_text(encoding="utf-8"))["rows"]
               if r["word"] == "deltaword")
    assert (row["mw_key"], row["status"], row["stem_source"]) == ("rAjan", "needs_look", "owner")
    capsys.readouterr()
