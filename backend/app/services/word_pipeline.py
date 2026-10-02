"""Word journey pipeline logic (handover_language 7.1, 7.3, 7.5-7.7).

Pure functions, tested. No network, no disk here: the CLI in
``scripts/word_origins.py`` owns the working folder
``backend/results/word_origins/<run id>/`` and the Vertex client.

Scope of this part: English loans. That is the one check proven so far.
German, Russian and relatives are section 8 (not in this work).
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date
from pathlib import Path
from typing import Optional

from app.services.word_check import classify_ahd, parse_json, parse_list

PROPOSE_N = 60

# 7.5: the model copies, never recalls. Not measured: verify prints the pass rate.
WRITE_SYSTEM = (
    "You copy facts out of a dictionary entry. Use only the entry text you are "
    "given. Copy every word form exactly as printed. "
    "Reply with one JSON object and nothing else."
)

EM_DASH = "\u2014"
SPACED_EN_DASH = " \u2013 "

ALLOWED_KINDS = ("loan", "related")
ALLOWED_CONFIDENCE = ("certain", "probable")
ALLOWED_SCRIPTS = ("latin", "cyrillic")
# Licence registry keys the pipeline may emit (handover 4.4 + existing).
KNOWN_SOURCE_KEYS = frozenset({
    "mw", "ahd", "pfeifer", "duden", "vasmer", "platts",
    "original", "learnsanskrit", "vidyut-data", "sa-wikisource",
    "public-domain", "dcs", "mitrasamgraha",
})


# ─── Small text rules (4.2, 7.6) ────────────────────────────────────────────

def has_banned_dash(text: str) -> bool:
    t = text or ""
    return EM_DASH in t or SPACED_EN_DASH in t


def word_count(text: str) -> int:
    return len((text or "").split())


def _words_for_run(text: str) -> list[str]:
    """Lowercased word tokens for the 8-word copy check."""
    toks = []
    for w in (text or "").split():
        c = w.strip(".,;:()[]\"'“”‘’·!?-–—/").lower()
        c = unicodedata.normalize("NFC", c)
        if c:
            toks.append(c)
    return toks


def shares_long_run(a: str, b: str, n: int = 8) -> bool:
    """True when a and b share a run of n or more words (case-insensitive)."""
    wa, wb = _words_for_run(a), _words_for_run(b)
    if len(wa) < n or len(wb) < n:
        return False
    b_runs = {" ".join(wb[i:i + n]) for i in range(len(wb) - n + 1)}
    return any(" ".join(wa[i:i + n]) in b_runs for i in range(len(wa) - n + 1))


def norm_entry(text: str) -> str:
    """Comparison form for verify checks 1-3: NFC, case ignored."""
    return unicodedata.normalize("NFC", text or "").casefold()


# ─── Propose (7.3) ──────────────────────────────────────────────────────────

def seeds_dir_default() -> Path:
    here = Path(__file__).resolve()
    return here.parents[2] / "app" / "seeds" / "word_origins"


def live_words_by_lang(seeds_dir: Path | str | None = None) -> dict[str, set[str]]:
    """Every live word by language, from every batch-*.json."""
    d = Path(seeds_dir) if seeds_dir else seeds_dir_default()
    out: dict[str, set[str]] = {}
    for path in sorted(d.glob("batch-*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for item in data.get("items", []):
            for route in item.get("routes", []):
                if (route.get("status") or "approved") != "approved":
                    continue
                lang = str(route.get("lang") or "")
                word = str(route.get("word") or "")
                if lang and word:
                    out.setdefault(lang, set()).add(word.casefold())
    return out


def rejected_words_by_lang(seeds_dir: Path | str | None = None) -> dict[str, set[str]]:
    d = Path(seeds_dir) if seeds_dir else seeds_dir_default()
    path = d / "rejected.json"
    out: dict[str, set[str]] = {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return out
    for item in data.get("items", []):
        lang = str(item.get("lang") or "")
        word = str(item.get("word") or "")
        if lang and word:
            out.setdefault(lang, set()).add(word.casefold())
    return out


def build_propose_known(
    live: dict[str, set[str]],
    rejected: dict[str, set[str]],
    lang: str = "en",
) -> list[str]:
    """Do-not-use list for one language: live + rejected, sorted."""
    words = set(live.get(lang, set())) | set(rejected.get(lang, set()))
    return sorted(words)


def build_propose_user(n: int, known: list[str], template: str) -> str:
    """Fill the measured B_USER template (kept word for word in the bench)."""
    return template.format(n=n, known=", ".join(known))


def parse_proposals(raw_text: str) -> list[dict]:
    """Proposals from a propose reply: [{word, sanskrit, route, confidence}]."""
    out = []
    for d in parse_list(raw_text or ""):
        word = str(d.get("word") or "").strip()
        if not word:
            continue
        out.append({
            "word": word,
            "sanskrit": str(d.get("sanskrit") or ""),
            "route": d.get("route") or [],
            "confidence": str(d.get("confidence") or ""),
        })
    return out


# ─── Write (7.5) ────────────────────────────────────────────────────────────

def build_write_user(
    word: str, lang_name: str, stem_roman: str, entry_text: str
) -> str:
    return (
        f"Word: {word}\n"
        f"Language: {lang_name}\n"
        f"Sanskrit stem (roman letters): {stem_roman}\n"
        f"Dictionary entry text:\n{entry_text}\n\n"
        "Reply as one JSON object with exactly these keys:\n"
        '- "sanskrit_form" (as printed)\n'
        '- "hops" (the stops between the Sanskrit word and this word, '
        "from the Sanskrit side outward, each {\"lang\", \"form\"} as printed)\n"
        '- "hedged"\n'
        '- "gloss" (the meaning of the word today, at most 8 words, your own words)\n'
        '- "sanskrit_gloss" (the meaning the entry gives for the Sanskrit word, '
        "at most 8 words)\n"
        '- "note" (at most 40 words, your own words, only what the entry says; '
        '"" if there is nothing worth saying)'
    )


def parse_write_reply(raw_text: str) -> Optional[dict]:
    data = parse_json(raw_text or "")
    return data if isinstance(data, dict) else None


# ─── Verify (7.6): code, no model ────────────────────────────────────────────

def verify_reply(
    word: str,
    entry_text: str,
    entry_segs: list[str],
    label: str,
    reply: dict | None,
    rejected_set: set[str] | None = None,
    live_set: set[str] | None = None,
) -> tuple[bool, list[str]]:
    """Verify one write reply. Returns (passed, reasons).

    A reply is accepted only if ALL hold; otherwise the word goes to
    "needs a look" with the reason.
    """
    reasons: list[str] = []
    if not isinstance(reply, dict):
        return False, ["unparseable_reply"]

    sanskrit_form = str(reply.get("sanskrit_form") or "")
    hops = reply.get("hops") or []
    hedged = bool(reply.get("hedged"))
    gloss = str(reply.get("gloss") or "")
    note = str(reply.get("note") or "")
    entry_norm = norm_entry(entry_text)

    # 1. sanskrit_form and every hop form occur in the entry (NFC, case ignored).
    if not sanskrit_form or norm_entry(sanskrit_form) not in entry_norm:
        reasons.append("sanskrit_form_not_in_entry")
    if not isinstance(hops, list):
        reasons.append("hops_not_a_list")
        hops = []
    for hop in hops:
        form = str((hop or {}).get("form") or "")
        if not form or norm_entry(form) not in entry_norm:
            reasons.append(f"hop_form_not_in_entry:{form or '?'}")
            break

    # 2. Every hop lang occurs in the entry.
    for hop in hops:
        lang = str((hop or {}).get("lang") or "")
        if not lang or norm_entry(lang) not in entry_norm:
            reasons.append(f"hop_lang_not_in_entry:{lang or '?'}")
            break

    # 3. In an AHD entry forms run word-back-to-Sanskrit, so hop forms must
    #    appear in the entry in the REVERSE of their order in hops.
    if isinstance(hops, list) and len(hops) >= 2:
        positions = []
        missing = False
        for hop in hops:
            form = str((hop or {}).get("form") or "")
            pos = entry_norm.find(norm_entry(form)) if form else -1
            if pos < 0:
                missing = True
                break
            positions.append(pos)
        if not missing and positions != sorted(positions, reverse=True):
            # Equal positions (repeated forms) are not a failure; only a
            # strictly forward order is.
            if len(set(positions)) > 1:
                reasons.append("hops_wrong_order")

    # 4. hedged agrees with the rule.
    expected_hedged = (classify_ahd(entry_segs or []) == "sanskrit_hedged")
    if bool(hedged) != expected_hedged:
        reasons.append("hedged_mismatch")

    # 5. gloss and note: no em dash, lengths, no 8-word copy.
    for field_name, field_value, limit in (("gloss", gloss, 8), ("note", note, 40)):
        if has_banned_dash(field_value):
            reasons.append(f"{field_name}_has_banned_dash")
        if word_count(field_value) > limit:
            reasons.append(f"{field_name}_too_long")
        if field_value and shares_long_run(field_value, entry_text or ""):
            reasons.append(f"{field_name}_copies_entry")

    # 6. Not rejected, not already live.
    key = (word or "").casefold()
    if rejected_set and key in {w.casefold() for w in rejected_set}:
        reasons.append("in_rejected")
    if live_set and key in {w.casefold() for w in live_set}:
        reasons.append("already_live")

    # Label gate: only sanskrit / sanskrit_hedged reach write at all.
    if label not in ("sanskrit", "sanskrit_hedged"):
        reasons.append(f"label_not_loan:{label or '?'}")

    # Confidence coherence: a hedged entry must not ship as certain via
    # a model that forgot to hedge.
    if label == "sanskrit_hedged" and not hedged:
        if "hedged_mismatch" not in reasons:
            reasons.append("hedged_mismatch")

    return (len(reasons) == 0), reasons


# ─── Item building ──────────────────────────────────────────────────────────

_IAST_ASCII = {
    "ā": "a", "ī": "i", "ū": "u", "ṛ": "ri", "ṝ": "ri",
    "ḷ": "l", "ḹ": "l", "ṃ": "m", "ḥ": "h", "ṅ": "n",
    "ñ": "n", "ṭ": "t", "ḍ": "d", "ṇ": "n", "ś": "sh",
    "ṣ": "sh", "ñ": "n",
}


def ascii_id(text: str) -> str:
    """IAST/SLP1-ish -> lowercase ascii id (śarkarā -> sharkara, mātṛ -> matri)."""
    t = unicodedata.normalize("NFC", text or "")
    for src, dst in _IAST_ASCII.items():
        t = t.replace(src, dst)
    t = t.lower()
    # SLP1 capitals that survive when the input was SLP1, not IAST.
    slp_map = {"a": "a", "i": "i", "u": "u", "f": "ri", "x": "ksh", "z": "sh",
               "s": "sh", "n": "n", "m": "m", "h": "h", "t": "t", "d": "d",
               "n": "n"}
    _ = slp_map  # documented; SLP1 inputs go through lipi first.
    return re.sub(r"[^a-z0-9]+", "", t)


def origin_id_for_mw(mw_key: str) -> str:
    """Batch id for a stem: IAST (via lipi) then ascii (SarkarA -> sharkara)."""
    try:
        import vidyut.lipi as lipi
        iast = lipi.transliterate(mw_key or "", lipi.Scheme.Slp1, lipi.Scheme.Iast)
    except Exception:
        iast = mw_key or ""
    slug = ascii_id(iast)
    return slug or re.sub(r"[^a-z0-9]+", "", (mw_key or "").lower())


def route_id_for(origin_id: str, lang: str, word: str) -> str:
    slug = ascii_id(word or "")
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "", (word or "").lower()) or "word"
    return f"{origin_id}.{lang}.{slug}"


def sanskrit_forms_for(mw_key: str) -> tuple[str, str]:
    """(dev, iast) derived via lipi; never typed. Raises on failure."""
    import vidyut.lipi as lipi
    dev = lipi.transliterate(mw_key, lipi.Scheme.Slp1, lipi.Scheme.Devanagari)
    from app.services.iast import to_iast as _to_iast
    return dev, _to_iast(dev)


def build_item(
    mw_key: str,
    lang: str,
    lang_name: str,
    word: str,
    gloss: str,
    sanskrit_gloss: str,
    note: str,
    hops: list[dict],
    lookup: str,
    checked_on: str,
    confidence: str,
    script: str = "latin",
) -> dict:
    """One batch item (one Sanskrit stem) with a single route.

    Devanagari/roman come from lipi; wording length/dash rules are enforced
    by the caller (verify) and re-checked by validate_new_batch.
    """
    dev, iast = sanskrit_forms_for(mw_key)
    oid = origin_id_for_mw(mw_key)
    route_id = route_id_for(oid, lang, word)
    clean_hops = [
        {"lang": str(h.get("lang") or ""), "form": str(h.get("form") or "")}
        for h in (hops or []) if isinstance(h, dict)
    ]
    item_id = oid
    return {
        "id": item_id,
        "status": "approved",
        "mw_key": mw_key,
        "sanskrit": {"dev": dev, "iast": iast},
        "gloss": sanskrit_gloss or gloss,
        "attested_abbr": [],
        "attested": "",
        "note": note or "",
        "routes": [{
            "id": route_id,
            "status": "approved",
            "lang": lang,
            "lang_name": lang_name,
            "word": word,
            "script": script,
            "roman": "",
            "gloss": gloss,
            "kind": "loan",
            "confidence": confidence,
            "hops": clean_hops,
            "sources": ["ahd"],
            "lookup": lookup or word,
            "checked_on": checked_on,
            "checked_by": "rule",
        }],
    }


def merge_items_by_stem(items: list[dict]) -> list[dict]:
    """Group single-route items sharing an mw_key into one item, routes appended."""
    by_key: dict[str, dict] = {}
    order: list[str] = []
    for item in items:
        key = str(item.get("mw_key") or "")
        if key not in by_key:
            by_key[key] = dict(item)
            by_key[key]["routes"] = list(item.get("routes", []))
            order.append(key)
        else:
            by_key[key]["routes"].extend(item.get("routes", []))
            # Keep the longest note/gloss already present.
            if len(str(item.get("note") or "")) > len(str(by_key[key].get("note") or "")):
                by_key[key]["note"] = item.get("note")
    return [by_key[k] for k in order]


# ─── Batch validation (mirrors 5.6 file rules) ──────────────────────────────

def iter_batches(seeds_dir: Path | str | None = None) -> list[dict]:
    d = Path(seeds_dir) if seeds_dir else seeds_dir_default()
    out = []
    for path in sorted(d.glob("batch-*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.append({"path": path, "data": data})
    return out


def last_scheduled_date(seeds_dir: Path | str | None = None) -> str:
    """Latest scheduled date across batches: start_date + (n_items - 1)."""
    from datetime import datetime, timedelta
    latest = ""
    for entry in iter_batches(seeds_dir):
        data = entry["data"]
        start = str(data.get("start_date") or "")
        try:
            base = datetime.strptime(start, "%Y-%m-%d").date()
        except Exception:
            continue
        n = len(data.get("items", []))
        if n <= 0:
            continue
        last = (base + timedelta(days=n - 1)).isoformat()
        if last > latest:
            latest = last
    return latest


def next_batch_name(seeds_dir: Path | str | None = None) -> str:
    nums = []
    d = Path(seeds_dir) if seeds_dir else seeds_dir_default()
    for path in d.glob("batch-*.json"):
        m = re.fullmatch(r"batch-(\d+)\.json", path.name)
        if m:
            nums.append(int(m.group(1)))
    nxt = (max(nums) + 1) if nums else 1
    return f"batch-{nxt:04d}.json"


def scheduled_dates_in_use(seeds_dir: Path | str | None = None) -> set[str]:
    """Every scheduled date already taken across batches."""
    from datetime import datetime, timedelta
    used: set[str] = set()
    for entry in iter_batches(seeds_dir):
        data = entry["data"]
        start = str(data.get("start_date") or "")
        try:
            base = datetime.strptime(start, "%Y-%m-%d").date()
        except Exception:
            continue
        for i, _item in enumerate(data.get("items", [])):
            used.add((base + timedelta(days=i)).isoformat())
    return used


def validate_new_batch(
    items: list[dict],
    start_date: str,
    seeds_dir: Path | str | None = None,
    rejected: dict[str, set[str]] | None = None,
    live: dict[str, set[str]] | None = None,
) -> list[str]:
    """Every 5.6 file rule that can be checked offline. Returns error strings."""
    errors: list[str] = []
    try:
        base = date.fromisoformat(start_date)
    except Exception:
        return [f"bad start_date {start_date!r}"]
    from datetime import timedelta
    used = scheduled_dates_in_use(seeds_dir)
    rej = rejected if rejected is not None else rejected_words_by_lang(seeds_dir)
    liv = live if live is not None else live_words_by_lang(seeds_dir)

    seen_ids: set[str] = set()
    for offset, item in enumerate(items):
        day = (base + timedelta(days=offset)).isoformat()
        if day in used:
            errors.append(f"date collision: {day}")
        iid = str(item.get("id") or "")
        if not iid:
            errors.append(f"item {offset}: missing id")
        elif iid in seen_ids:
            errors.append(f"duplicate id {iid}")
        seen_ids.add(iid)
        mw_key = str(item.get("mw_key") or "")
        if not mw_key:
            errors.append(f"{iid}: missing mw_key")
        else:
            try:
                dev, iast = sanskrit_forms_for(mw_key)
                if str((item.get("sanskrit") or {}).get("dev") or "") != dev:
                    errors.append(f"{iid}: sanskrit.dev disagrees with lipi")
                from app.services.iast import matches as _matches
                got_iast = str((item.get("sanskrit") or {}).get("iast") or "")
                if not _matches(dev, got_iast):
                    errors.append(f"{iid}: sanskrit.iast disagrees with lipi")
            except Exception as e:
                errors.append(f"{iid}: lipi failed: {e}")
        gloss = str(item.get("gloss") or "")
        note = str(item.get("note") or "")
        attested = str(item.get("attested") or "")
        if word_count(gloss) > 8:
            errors.append(f"{iid}: gloss over 8 words")
        if word_count(note) > 40:
            errors.append(f"{iid}: note over 40 words")
        for field_name, field_value in (("gloss", gloss), ("note", note),
                                        ("attested", attested)):
            if has_banned_dash(field_value):
                errors.append(f"{iid}: {field_name} has banned dash")
        routes = item.get("routes") or []
        if not routes:
            errors.append(f"{iid}: no routes")
        for route in routes:
            kind = str(route.get("kind") or "")
            conf = str(route.get("confidence") or "")
            if kind not in ALLOWED_KINDS:
                errors.append(f"{iid}: bad kind {kind!r}")
            if conf not in ALLOWED_CONFIDENCE:
                errors.append(f"{iid}: bad confidence {conf!r}")
            for hop in route.get("hops") or []:
                if not str(hop.get("lang") or "") or not str(hop.get("form") or ""):
                    errors.append(f"{iid}: hop missing lang/form")
            for key in route.get("sources") or []:
                if key not in KNOWN_SOURCE_KEYS:
                    errors.append(f"{iid}: unknown source {key!r}")
            if not (route.get("sources") or []):
                errors.append(f"{iid}: route has no sources")
            script = str(route.get("script") or "")
            if script not in ALLOWED_SCRIPTS:
                errors.append(f"{iid}: bad script {script!r}")
            if script == "latin" and str(route.get("roman") or ""):
                errors.append(f"{iid}: latin route carries roman")
            lang = str(route.get("lang") or "")
            word = str(route.get("word") or "")
            if not word:
                errors.append(f"{iid}: route missing word")
            if lang and word and word.casefold() in rej.get(lang, set()):
                errors.append(f"{iid}: {lang}:{word} is in rejected.json")
            if lang and word and word.casefold() in liv.get(lang, set()):
                errors.append(f"{iid}: {lang}:{word} already live")
    return errors


def build_batch_file(
    items: list[dict],
    batch_name: str,
    start_date: str,
    maker: str = "word pipeline approve",
    model: str = "",
) -> dict:
    batch = re.fullmatch(r"batch-(\d+)\.json", batch_name)
    num = batch.group(1) if batch else "0001"
    return {
        "batch": num,
        "made_on": date.today().isoformat(),
        "maker": maker,
        "model": model,
        "start_date": start_date,
        "items": items,
    }


# ─── Review (7.7) ───────────────────────────────────────────────────────────

def relation_label(kind: str, hops: list) -> str:
    if kind == "related":
        return "Same family as Sanskrit"
    if kind == "loan" and hops:
        n = len(hops)
        return f"From Sanskrit, through {n} language{'s' if n != 1 else ''}"
    return "Borrowed from Sanskrit"


def review_markdown(
    passed: list[dict],
    needs_look: list[dict],
    entry_texts: dict[str, str] | None = None,
    entry_urls: dict[str, str] | None = None,
) -> str:
    """review.md: each card as the learner will see it, then the entry text
    and address, then why it is in needs-a-look. Passed first."""
    entries = entry_texts or {}
    urls = entry_urls or {}
    lines = ["# Word journey: review", ""]
    lines.append(f"Passed: {len(passed)}. Needs a look: {len(needs_look)}.")
    lines.append("")
    for group_name, group in (("Passed", passed), ("Needs a look", needs_look)):
        lines.append(f"## {group_name}")
        lines.append("")
        for cand in group:
            word = str(cand.get("word") or "")
            gloss = str(cand.get("gloss") or "")
            mw_key = str(cand.get("mw_key") or "")
            hops = cand.get("hops") or []
            label = relation_label(str(cand.get("kind") or "loan"), hops)
            lines.append(f"### {word} ({mw_key})")
            lines.append("")
            lines.append(f"Word: {word}, meaning: {gloss or '-'}")
            stops = [mw_key] + [str(h.get("form") or "") for h in hops] + [word]
            lines.append("Stops: " + " > ".join(s for s in stops if s))
            lines.append(f"Label: {label}")
            if cand.get("note"):
                lines.append(f"Note: {cand.get('note')}")
            lines.append("")
            lines.append(f"Entry text: {(entries.get(word) or cand.get('entry_text') or '-')[:2000]}")
            lines.append(f"Address: {urls.get(word) or cand.get('entry_url') or '-'}")
            reason = str(cand.get("reason") or cand.get("label") or "")
            if group_name != "Passed":
                lines.append(f"Why needs a look: {reason or 'see check/verify'}")
            lines.append("")
    return "\n".join(lines)


# ─── Status ─────────────────────────────────────────────────────────────────

def run_status(run_dir: Path | str) -> dict:
    """Summarise a working folder for the status subcommand."""
    d = Path(run_dir)
    info: dict = {"run": d.name, "exists": d.is_dir(), "files": {}}
    if not d.is_dir():
        return info
    for name in ("run.json", "proposals.json", "check.json", "writes.json",
                 "verify.json", "review.md"):
        p = d / name
        info["files"][name] = p.is_file()
    for name in ("propose_job.json", "write_job.json",
                 "propose_output.json", "write_output.json"):
        p = d / name
        info["files"][name] = p.is_file()
    try:
        if (d / "proposals.json").is_file():
            info["n_proposals"] = len(json.loads(
                (d / "proposals.json").read_text(encoding="utf-8")).get("proposals", []))
    except Exception:
        pass
    try:
        if (d / "check.json").is_file():
            data = json.loads((d / "check.json").read_text(encoding="utf-8"))
            rows = data.get("rows", [])
            info["n_check"] = len(rows)
            info["n_pass"] = sum(1 for r in rows if r.get("status") == "pass")
            info["n_needs_look"] = sum(1 for r in rows if r.get("status") == "needs_look")
            info["n_rejected"] = sum(1 for r in rows if r.get("status") == "rejected")
    except Exception:
        pass
    try:
        if (d / "verify.json").is_file():
            data = json.loads((d / "verify.json").read_text(encoding="utf-8"))
            rows = data.get("rows", [])
            info["n_verify"] = len(rows)
            info["n_verified"] = sum(1 for r in rows if r.get("passed"))
    except Exception:
        pass
    return info
