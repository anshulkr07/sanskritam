"""Grammar guide content (2026-09-15): structure, engine checks, language lint.

The guide is authored data (app/services/grammar_guide). These tests are its
editor: every Sanskrit claim must derive in the engine, every learner-facing
string must exist in English AND Hindi, and nothing a beginner sees may be a
feature code or developer jargon.
"""

import json
import re

from app.services import grammar_guide as gg
from app.services.grammar_guide.model import aksharas
from app.services.grammar_guide.verify import verify

DEVANAGARI = re.compile(r"[ऀ-ॿ]")
LATIN = re.compile(r"[A-Za-zÀ-ɏḀ-ỿ]")  # IAST letters count
FEATURE_CODE = re.compile(
    r"\b(NOM|ACC|INSTR|DAT|ABL|GEN|LOC|VOC|PRES|IMPF?|FUT)\.[A-Z0-9]+"
    r"|\b(KARAKA|SAMASA)-|\b[A-Z]+-SANDHI\b")
JARGON = re.compile(
    r"tensor|grader|feature set|f\(a|syncretism|analy[sz]er|endpoint|backend|vidyut|\bapi\b",
    re.IGNORECASE)
PROSE_KINDS = {"text", "analogy", "callout"}


def _locs(node, path="$"):
    """(path, {en, hi}) for every learner-language pair in a node tree."""
    if isinstance(node, dict):
        if set(node) == {"en", "hi"}:
            yield path, node
            return
        for key, value in node.items():
            yield from _locs(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from _locs(value, f"{path}[{i}]")


def _all_raw():
    """Every authored tree: chapters, topics and the glossary."""
    for module in gg.CHAPTER_MODULES:
        yield module.CHAPTER["id"], module.CHAPTER
        for t in module.TOPICS:
            yield t["id"], t
    for g in gg.GLOSSARY:
        yield f"glossary:{g['id']}", g


def _built_topics():
    return [gg.guide_topic(t["id"]) for t in gg.guide_index()["topics"]]


# ─── routes and structure ───

def test_index_route(client):
    d = client.get("/grammar/guide").json()
    assert d["version"].startswith("guide-")
    ids = [t["id"] for t in d["topics"]]
    assert ids and len(ids) == len(set(ids))
    for ch in d["chapters"]:
        assert ch["title"]["en"] and ch["title"]["hi"] and ch["title_iast"], ch["id"]
        assert ch["topic_ids"] and all(t in ids for t in ch["topic_ids"]), ch["id"]
    assert d["glossary"] and all(g["term_iast"] for g in d["glossary"])


def test_topic_route_and_404(client):
    first = client.get("/grammar/guide").json()["topics"][0]["id"]
    t = client.get(f"/grammar/guide/topics/{first}").json()
    assert t["id"] == first and t["blocks"] and t["prev"] is None
    assert client.get("/grammar/guide/topics/no-such-topic").status_code == 404


def test_prev_next_chain_and_chapter_positions():
    order = [t["id"] for t in gg.guide_index()["topics"]]
    for i, tid in enumerate(order):
        t = gg.guide_topic(tid)
        assert (t["prev"] or {}).get("id") == (order[i - 1] if i else None), tid
        assert (t["next"] or {}).get("id") == (order[i + 1] if i + 1 < len(order) else None), tid
        assert 1 <= t["chapter"]["position"] <= t["chapter"]["count"], tid


def test_references_resolve():
    from app.seeds.features import SEED_FEATURES
    from app.seeds.licences import CONTENT_SOURCES

    features = {f["id"] for f in SEED_FEATURES}
    sources = {row[0] for row in CONTENT_SOURCES}
    topic_ids = {t["id"] for t in gg.guide_index()["topics"]}
    for _, t in gg.iter_raw_topics():
        assert set(t["feature_ids"]) <= features, (t["id"], set(t["feature_ids"]) - features)
        assert t["attribution"] in sources, t["id"]
    for g in gg.GLOSSARY:
        assert g["topic_id"] == "" or g["topic_id"] in topic_ids, g["id"]


# ─── the engine is the authority ───

def test_every_engine_check_passes():
    failures = [f"{tid}: {shown} — {why}"
                for tid, shown, check in gg.iter_checks()
                if (why := verify(check, shown))]
    assert not failures, "\n".join(failures)


def test_checks_never_reach_the_client():
    def has_check(node):
        if isinstance(node, dict):
            return "check" in node or any(has_check(v) for v in node.values())
        if isinstance(node, list):
            return any(has_check(v) for v in node)
        return False

    for t in _built_topics():
        assert not has_check(t), t["id"]


def test_iast_comes_from_lipi():
    from app.services.iast import to_iast

    def same(node):
        assert node["iast"] == to_iast(node["sa"]), node["sa"]

    for t in _built_topics():
        gg._walk(t, same)


def test_proofs_run(client):
    for t in _built_topics():
        for p in t["proofs"]:
            params, where = p["params"], (t["id"], p["type"])
            if p["type"] == "derive":
                r = client.get("/grammar/derive", params=params).json()
                assert r["result"], where
                if params.get("expect"):
                    assert r["result"] == params["expect"], where
            elif p["type"] == "paradigm":
                rows = client.get("/grammar/paradigm", params=params).json()["rows"]
                assert any(c["form"] for row in rows for c in row), where
            elif p["type"] == "sandhi":
                assert client.get("/grammar/sandhi", params=params).json()["candidates"], where
            elif p["type"] == "word-order":
                assert client.get("/grammar/word-order", params=params).status_code == 200, where
            elif p["type"] == "scansion":
                assert client.get("/grammar/scansion", params=params).status_code == 200, where


def test_table_endings_split_without_orphaned_signs():
    for t in _built_topics():
        for block in t["blocks"] + [b for d in t["deeper"] for b in d["blocks"]]:
            if block["kind"] != "table":
                continue
            for row in block["rows"]:
                for c in row:
                    if "split" in c:
                        head, tail = c["split"]
                        assert head + tail == c["sa"], c
                        assert aksharas(tail)[0][0] not in "ािीुूृेैोौ्ंँ" or tail[0] in "ःंाी", c


# ─── language lint ───

def test_every_pair_is_complete_and_in_its_script():
    problems = []
    for owner, tree in _all_raw():
        for path, loc in _locs(tree):
            en, hi = loc["en"].strip(), loc["hi"].strip()
            if not en or not hi:
                problems.append(f"{owner}{path}: missing a language")
            elif not DEVANAGARI.search(hi):
                problems.append(f"{owner}{path}: Hindi has no Devanagari — {hi!r}")
            elif not LATIN.search(en) and re.search(r"[^\W\d_]", en):
                # Digits and symbols are language-neutral ("20", "1000");
                # only strings that contain letters must be in Latin script.
                problems.append(f"{owner}{path}: English has no Latin letters — {en!r}")
    assert not problems, "\n".join(problems)


def test_no_feature_codes_or_developer_jargon():
    problems = []
    for owner, tree in _all_raw():
        for path, loc in _locs(tree):
            for lang in ("en", "hi"):
                if FEATURE_CODE.search(loc[lang]) or JARGON.search(loc[lang]):
                    problems.append(f"{owner}{path}.{lang}: {loc[lang]!r}")
    assert not problems, "\n".join(problems)


def test_inline_markup_is_balanced():
    for owner, tree in _all_raw():
        for path, loc in _locs(tree):
            for s in loc.values():
                assert s.count("**") % 2 == 0, (owner, path, s)
                spans = re.findall(r"\{\{(.*?)\}\}", s)
                assert s.count("{{") == s.count("}}") == len(spans), (owner, path, s)
                assert all(DEVANAGARI.search(x) for x in spans), (owner, path, s)


def test_basics_stay_short():
    for _, t in gg.iter_raw_topics():
        limit = 60 if t["level"] == 1 else 80
        for b in t["blocks"]:
            if b["kind"] in PROSE_KINDS:
                n = len(b["text"]["en"].split())
                assert n <= limit, (t["id"], n, b["text"]["en"][:60])
        for d in t["deeper"]:
            for b in d["blocks"]:
                if b["kind"] in PROSE_KINDS:
                    assert len(b["text"]["en"].split()) <= 100, (t["id"], d["title"]["en"])


def test_examples_have_meanings_and_quotes_have_sources():
    for _, t in gg.iter_raw_topics():
        for b in t["blocks"] + [bb for d in t["deeper"] for bb in d["blocks"]]:
            if b["kind"] in ("examples", "wild"):
                for item in b["items"]:
                    assert item["meaning"]["en"] and item["meaning"]["hi"], (t["id"], item["sa"])
                    if b["kind"] == "wild":
                        assert item.get("source"), (t["id"], item["sa"])


def test_every_topic_teaches_something_checkable():
    """A topic may explain a reference-only idea, but it must show real
    Sanskrit: at least one example, table or formula."""
    for _, t in gg.iter_raw_topics():
        kinds = {b["kind"] for b in t["blocks"]}
        assert kinds & {"examples", "wild", "table", "formula"}, t["id"]


# ─── audio ───

def _with_audio(monkeypatch, tmp_path, entries: dict[str, str], files: list[str]):
    """Point the guide at a temp manifest and a temp local audio store."""
    from app.services import storage as st

    manifest = tmp_path / "audio_manifest.json"
    manifest.write_text(json.dumps({gg.audio_key(text): {"text": text, "path": path}
                                    for text, path in entries.items()}), encoding="utf-8")
    audio_dir = tmp_path / "audio"
    for rel in files:
        (audio_dir / rel).parent.mkdir(parents=True, exist_ok=True)
        (audio_dir / rel).write_bytes(b"RIFF")
    monkeypatch.setattr(gg, "MANIFEST_PATH", manifest)
    st.set_storage(st.LocalStorage(str(audio_dir)))
    gg.reset_cache()


def _heard():
    heard = set()
    for t in _built_topics():
        gg._walk(t, lambda n: heard.add(gg.normalize_sa(n["sa"])) if n.get("audio_url") else None)
    return heard


def test_audio_urls_come_only_from_the_manifest(monkeypatch, tmp_path):
    from app.services import storage as st

    texts = gg.iter_sanskrit()
    assert texts and len(texts) == len(set(texts))
    target = texts[0]
    _with_audio(monkeypatch, tmp_path, {target: "grammar/t.wav"}, ["grammar/t.wav"])
    try:
        assert _heard() == {target}
        url = next(u for t in _built_topics() for u in _audio_urls_in(t))
        assert url.endswith("grammar/t.wav")
    finally:
        monkeypatch.undo()
        st.set_storage(None)
        gg.reset_cache()


def test_a_manifest_entry_without_its_file_gets_no_button(monkeypatch, tmp_path):
    """The manifest ships in the image; the WAVs do not. No file, no speaker."""
    from app.services import storage as st

    texts = gg.iter_sanskrit()
    present, missing = texts[0], texts[1]
    _with_audio(monkeypatch, tmp_path,
                {present: "grammar/present.wav", missing: "grammar/missing.wav"},
                ["grammar/present.wav"])
    try:
        assert _heard() == {present}
    finally:
        monkeypatch.undo()
        st.set_storage(None)
        gg.reset_cache()


def _audio_urls_in(node):
    if isinstance(node, dict):
        if node.get("audio_url"):
            yield node["audio_url"]
        for v in node.values():
            yield from _audio_urls_in(v)
    elif isinstance(node, list):
        for v in node:
            yield from _audio_urls_in(v)
