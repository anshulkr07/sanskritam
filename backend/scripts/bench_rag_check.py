"""Book-search (RAG) comparison, stage 3: automatic checks, then blind review.

``check`` reads every answer under results/rag_full_20261009/answers/ and
records what code can tell without judgement:

* does the JSON parse, and does the app's own clip() leave a card to show;
* is the prose in the asked language (share of Devanagari vs roman letters);
* each quoted verse: taken from the books block (its B id) and copied
  exactly, or a verse the app holds (and whether the model's reference
  matches the app's), or from outside, and then whether the app's own
  checker (ask_sources.check_card, the production code) keeps it;
* which of the expected verses the answer uses.

``review`` writes one page per question with every model's card, the
models hidden behind letters shuffled per question; the key to the letters
is written to review/_mapping.json and is not read until marking is done.

Run with DB_PATH pointing at the same copy of the database the search used.
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from bench_rag_full import OUT  # noqa: E402  (loads .env, settings)

from app.db import SessionLocal  # noqa: E402
from app.models import Shloka  # noqa: E402
from app.services import ask_live, ask_sources  # noqa: E402
from app.services import page_check as pc  # noqa: E402
from rag_bench_cases import CASES, LANG  # noqa: E402

CASE = {c["id"]: c for c in CASES}
_DEVA = re.compile(r"[ऀ-ॿ]")
_LATIN = re.compile(r"[A-Za-zÀ-ɏḀ-ỿ]")


def _nums(ref: str) -> tuple:
    m = re.search(r"(\d+(?:\.\d+)*)\s*$", (ref or "").strip())
    return tuple(int(x) for x in m.group(1).split(".")) if m else ()


def prose_of(card: dict) -> str:
    parts = [card.get("title") or "", card.get("summary") or ""]
    for s in card.get("sections") or []:
        parts.append(s.get("heading") or "")
        parts += [str(i) for i in s.get("items") or []]
    t = card.get("table") or {}
    if isinstance(t, dict):
        parts += [" ".join(map(str, row)) for row in t.get("rows") or []]
    for r in card.get("remedies") or []:
        parts += [str(r.get("name") or ""), " ".join(map(str, r.get("how") or []))]
    for v in card.get("verses") or []:
        parts += [v.get("meaning") or "", v.get("apply") or ""]
    return "\n".join(p for p in parts if p)


def language_ok(card: dict, lang: str) -> tuple[bool, float]:
    text = prose_of(card)
    d, l = len(_DEVA.findall(text)), len(_LATIN.findall(text))
    if d + l == 0:
        return False, 0.0
    share = d / (d + l)
    return (share >= 0.6, round(share, 2)) if lang == "hi" else (share <= 0.25, round(share, 2))


def copy_quality(quote: str, source: str) -> str:
    q, s = pc.verse_letters(quote), pc.verse_letters(source)
    if not q:
        return "no-devanagari"
    if q == s or (len(q) >= 12 and q in s):
        return "exact"
    if len(s) >= 12 and s in q:
        return "extended"  # the whole block text, with more of the verse after it
    if ask_sources._share(q, s) >= ask_sources.MIN_VERSE_SHARE:
        return "near"
    return "changed"


def held_refs(db, sa: str) -> list[str]:
    """Every reference under which the app holds this verse (a verse can be
    held twice: Kaṭha 1.2.23 is also Muṇḍaka 3.2.3)."""
    q = pc.verse_letters(sa)
    if len(q) < ask_sources._SHORT_MIN:
        return []
    out = []
    for _sid, letters, ref in ask_sources._held_rows(db):
        if q[:ask_sources._RUN] not in letters and q[-ask_sources._RUN:] not in letters:
            continue
        if ask_sources._share(q, letters) >= ask_sources.MIN_VERSE_SHARE and ref not in out:
            out.append(ref)
    return out


def check_one(db, row: dict, retrieval: dict, full_text: dict, budget_s: float) -> dict:
    c = CASE[row["case"]]
    out = {"label": row["label"], "case": row["case"], "run": row["run"], "error": row.get("error") or "",
           "latency_ms": row["latency_ms"], "prompt_tokens": row["prompt_tokens"],
           "completion_tokens": row["completion_tokens"], "cost_inr": row["cost_inr"]}
    raw = ask_live._parse(row["text"]) if row.get("text") else None
    out["json_ok"] = raw is not None
    card = ask_live.clip(raw) if raw else None
    out["card_ok"] = ask_live.has_content(card)
    out["kind"] = (card or {}).get("kind")
    if not out["card_ok"]:
        return out
    out["language_ok"], out["devanagari_share"] = language_ok(card, c["lang"])

    hits = retrieval["hits"]
    verses = []
    for v in (raw.get("verses") or []) if isinstance(raw.get("verses"), list) else []:
        if not isinstance(v, dict):
            continue
        sa, ref = str(v.get("sa") or ""), str(v.get("ref") or "")
        bid = str(v.get("id") or "").strip().upper()
        info = {"id": bid, "ref": ref, "sa": sa[:80]}
        m = re.fullmatch(r"B(\d{1,2})", bid)
        if m and 1 <= int(m.group(1)) <= len(hits):
            h = hits[int(m.group(1)) - 1]
            info["block_ref"] = h["ref"]
            info["copy"] = copy_quality(sa, full_text[h["shloka_id"]])
            info["ref_copied"] = " ".join(ref.split()) == " ".join(h["ref"].split())
        elif bid:
            info["bad_id"] = True
        held = ask_sources.stored_verse(db, sa) if sa else None
        if held:
            refs = held_refs(db, sa)
            info["app_ref"], info["app_refs"] = held[1], refs
            mn = _nums(ref)
            info["ref_numbers_differ"] = bool(mn and refs and all(_nums(r) != mn for r in refs if _nums(r)))
            # What the production checker shows: the first row's reference,
            # even when the model named the other, equally right, one.
            info["app_relabels"] = bool(mn and _nums(held[1]) and _nums(held[1]) != mn
                                        and any(_nums(r) == mn for r in refs))
        verses.append(info)
    out["verses"] = verses

    shown = copy.deepcopy(card)
    ask_sources.mark_stored(db, shown)
    counts = ask_sources.check_card(shown, budget_s=budget_s)
    kept = {(v.get("sa") or "")[:40] for v in shown.get("verses") or []}
    out["checker"] = {**counts, "dropped": [v["ref"] for v in card.get("verses") or [] if (v.get("sa") or "")[:40] not in kept]}

    used = set()
    for v in verses:
        if v.get("block_ref"):
            used.add(v["block_ref"])
        if v.get("app_ref"):
            used.add(v["app_ref"])
    flat = ask_live.flatten(card)
    gold = [g["ref"] for g in c["gold"]]
    for g in gold:
        n = ".".join(str(x) for x in _nums(g))
        if n and re.search(r"(?<![\d.])" + re.escape(n) + r"(?![\d])", flat):
            used.add(g)
    out["gold_used"] = [g for g in gold if g in used]
    out["flat"] = flat
    return out


def run_check(args) -> None:
    retrieval = {r["id"]: r for r in json.loads((OUT / "retrieval_gemini.json").read_text(encoding="utf-8"))["results"]}
    db = SessionLocal()
    full_text = {s.id: s.devanagari for s in db.query(Shloka.id, Shloka.devanagari).all()}
    done = {}
    out_path = OUT / "checks.jsonl"
    if out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            done[(r["label"], r["case"], r["run"])] = r
    rows = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((OUT / "answers").glob("*/*.json"))]
    with open(out_path, "a", encoding="utf-8") as fh:
        for i, row in enumerate(rows):
            key = (row["label"], row["case"], row["run"])
            if key in done:
                continue
            r = check_one(db, row, retrieval[row["case"]], full_text, args.budget)
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()
            if i % 50 == 0:
                print(f"{i}/{len(rows)} checked", flush=True)
    db.close()
    print("checks done", flush=True)


# ── blind review pages ─────────────────────────────────────────────────────

def card_text(row: dict) -> str:
    raw = ask_live._parse(row.get("text") or "") if row.get("text") else None
    if raw is None:
        return "(no usable answer: " + (row.get("error") or "JSON did not parse") + ")"
    card = ask_live.clip(raw)
    lines = [f"kind: {card.get('kind')} | title: {card.get('title', '')}"]
    if card.get("summary"):
        lines.append("summary: " + card["summary"])
    for s in card.get("sections") or []:
        lines.append(f"[{s.get('heading', '')}] " + " / ".join(s.get("items") or []))
    t = card.get("table")
    if isinstance(t, dict) and t.get("rows"):
        lines.append("table: " + " | ".join(t.get("columns") or []) + " :: " +
                     " // ".join(" | ".join(map(str, r)) for r in t["rows"]))
    for r in card.get("remedies") or []:
        lines.append(f"remedy: {r}")
    rawv = {str(v.get("sa") or "")[:30]: v for v in raw.get("verses") or [] if isinstance(v, dict)}
    for v in card.get("verses") or []:
        rid = rawv.get(v["sa"][:30], {}).get("id", "")
        lines.append(f"VERSE {rid} ({v['ref']}): {v['sa']} => {v['meaning']}" + (f" | apply: {v['apply']}" if v.get("apply") else ""))
    for t in []:  # terms left out of the review pages
        lines.append(f"term: {t['sa']} = {t['meaning']}")
    if card.get("needs_birth") or card.get("needs_partner"):
        lines.append(f"needs_birth={card.get('needs_birth')} needs_partner={card.get('needs_partner')}")
    return "\n".join(lines)


def flags_text(chk: dict) -> str:
    if not chk:
        return ""
    f = [f"lang {'ok' if chk.get('language_ok') else 'WRONG'} (devanagari {chk.get('devanagari_share')})"]
    for v in chk.get("verses") or []:
        bits = []
        if v.get("copy"):
            bits.append(f"copy {v['copy']}")
        if v.get("ref_copied") is False:
            bits.append("ref not as block")
        if v.get("bad_id"):
            bits.append("BAD ID")
        if v.get("ref_numbers_differ"):
            bits.append(f"REF {v['ref']} but app holds it as {'/'.join(v.get('app_refs') or [v['app_ref']])}")
        if v.get("app_relabels"):
            bits.append(f"(app would relabel it {v['app_ref']})")
        if bits:
            f.append(f"{v.get('id') or '-'} {v['ref']}: " + ", ".join(bits))
    ck = chk.get("checker") or {}
    if ck.get("dropped"):
        f.append("app's checker would drop: " + "; ".join(ck["dropped"]))
    f.append("expected verses used: " + (", ".join(chk.get("gold_used") or []) or "none"))
    return " · ".join(f)


def run_review(args) -> None:
    rows = {}
    for p in (OUT / "answers").glob("*/*.json"):
        r = json.loads(p.read_text(encoding="utf-8"))
        rows[(r["label"], r["case"], r["run"])] = r
    checks = {}
    if (OUT / "checks.jsonl").exists():
        for line in (OUT / "checks.jsonl").read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            checks[(r["label"], r["case"], r["run"])] = r
    retrieval = {r["id"]: r for r in json.loads((OUT / "retrieval_gemini.json").read_text(encoding="utf-8"))["results"]}
    # Letters are dealt over the fixed list of models, so a page written
    # before every answer is in keeps its letters when it is written again.
    from bench_rag_generate import MODELS
    # The thinking variants (variant_of) are marked on their own pages; leaving
    # them out keeps the letters the first review dealt.
    labels = sorted(k for k, m in MODELS.items() if not m.get("variant_of"))
    rng = random.Random(20261009)
    mapping = {}
    rdir = OUT / "review"
    rdir.mkdir(exist_ok=True)
    for c in CASES:
        letters = [chr(ord("A") + i) for i in range(len(labels))]
        order = labels[:]
        rng.shuffle(order)
        mapping[c["id"]] = dict(zip(letters, order))
        L = [f"# {c['id']} ({LANG[c['lang']]})", "", f"**Q:** {c['question']}"]
        if c["history"]:
            L.append(f"**Earlier:** {c['history'][-1][0]} → {c['history'][-1][1]}")
        if c["screen_text"]:
            L.append(f"**Screen:** {' '.join(c['screen_text'].split())}")
        if c["facts"]:
            L.append("**FACTS:** Next Ekadashi begins 21 Oct 2026 14:12, ends 22 Oct 2026 14:49; fasting day cannot be calculated yet.")
        if c["chart"]:
            L.append("**CHART:** Moon Meena (Pisces) 22°48', house 8, Revati pada 2; lagna Simha.")
        L += ["", "**Key:** " + "; ".join(c["must"]),
              "**Fails if:** " + ("; ".join(c["must_not"]) or "-"),
              "**Note:** " + (c["note"] or "-"), "",
              "**Block:** " + "; ".join(f"{h['id']} {h['ref']}" for h in retrieval[c["id"]]["hits"]), ""]
        for letter, label in mapping[c["id"]].items():
            runs = [0] + ([1, 2] if (label, c["id"], 1) in rows else [])
            for run in runs:
                row = rows.get((label, c["id"], run))
                if not row:
                    if run == 0:
                        L += [f"## {letter}", "(pending)", ""]
                    continue
                if (row.get("error") or "").startswith("HTTP 429"):
                    L += [f"## {letter}", "(unavailable: the free endpoint answered HTTP 429; not marked)", ""]
                    continue
                tag = letter if run == 0 else f"{letter}{run}"
                L += [f"## {tag}", card_text(row), f"*auto:* {flags_text(checks.get((label, c['id'], run)))}", ""]
        (rdir / f"{c['id']}.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    (rdir / "_mapping.json").write_text(json.dumps(mapping, indent=1), encoding="utf-8")
    print(f"review pages written for {len(CASES)} questions, {len(labels)} models")


def run_reasoning(args, kind: str = "reasoning", seed: int = 20261010) -> None:
    """Checks and blind pages for the thinking-on answers (answers_reasoning/), or
    for the plain-model controls run on the same questions (answers_control/).

    One page per question, the variants behind letters; marks go to
    marks_reasoning.json as {"<variant>|<case>": [verdict, flags, why]}."""
    rows = {}
    for p in sorted((OUT / f"answers_{kind}").glob("*/*.json")):
        r = json.loads(p.read_text(encoding="utf-8"))
        rows[(r["label"], r["case"])] = r
    retrieval = {r["id"]: r for r in json.loads((OUT / "retrieval_gemini.json").read_text(encoding="utf-8"))["results"]}
    db = SessionLocal()
    full_text = {s.id: s.devanagari for s in db.query(Shloka.id, Shloka.devanagari).all()}
    checks = {}
    for (label, cid), row in rows.items():
        checks[(label, cid)] = check_one(db, row, retrieval[cid], full_text, args.budget)
    db.close()
    (OUT / f"checks_{kind}.json").write_text(
        json.dumps({f"{k[0]}|{k[1]}": v for k, v in checks.items()}, ensure_ascii=False), encoding="utf-8")
    rng = random.Random(seed)
    rdir = OUT / f"review_{kind}"
    rdir.mkdir(exist_ok=True)
    mapping = {}
    for cid in sorted({k[1] for k in rows}):
        c = CASE[cid]
        have = sorted(k[0] for k in rows if k[1] == cid)
        order = have[:]
        rng.shuffle(order)
        mapping[cid] = {chr(ord("A") + i): lb for i, lb in enumerate(order)}
        L = [f"# {cid} ({LANG[c['lang']]})", "", f"**Q:** {c['question']}"]
        if c["history"]:
            L.append(f"**Earlier:** {c['history'][-1][0]} → {c['history'][-1][1]}")
        if c["screen_text"]:
            L.append(f"**Screen:** {' '.join(c['screen_text'].split())}")
        if c["facts"]:
            L.append("**FACTS:** Next Ekadashi begins 21 Oct 2026 14:12, ends 22 Oct 2026 14:49; fasting day cannot be calculated yet.")
        if c["chart"]:
            L.append("**CHART:** Moon Meena (Pisces) 22°48', house 8, Revati pada 2; lagna Simha.")
        L += ["", "**Key:** " + "; ".join(c["must"]), "**Fails if:** " + ("; ".join(c["must_not"]) or "-"),
              "**Note:** " + (c["note"] or "-"), "",
              "**Block:** " + "; ".join(f"{h['id']} {h['ref']}" for h in retrieval[cid]["hits"]), ""]
        for letter, label in mapping[cid].items():
            row = rows[(label, cid)]
            if (row.get("error") or "").startswith("HTTP 429"):
                L += [f"## {letter}", "(unavailable: HTTP 429; not marked)", ""]
                continue
            L += [f"## {letter}", card_text(row), f"*auto:* {flags_text(checks[(label, cid)])}", ""]
        (rdir / f"{cid}.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    (rdir / "_mapping.json").write_text(json.dumps(mapping, indent=1), encoding="utf-8")
    print(f"{kind} review pages: {len(mapping)} questions, {len(rows)} answers")


def run_pairs(args) -> None:
    """Blind pages with the main answers of two or more models side by side, letters
    shuffled per question (seed 20261010), for a fresh model against models already
    marked: ``pairs --kind p37 --labels gemini_37_free,gemini_flash``. The old answers are
    marked again as a check on how steady the marking is."""
    labels = [x for x in args.labels.split(",") if x]
    rows = {}
    for lb in labels:
        for pth in (OUT / "answers" / lb).glob("*__r0.json"):
            r = json.loads(pth.read_text(encoding="utf-8"))
            rows[(lb, r["case"])] = r
    checks = {}
    for line in (OUT / "checks.jsonl").read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        if r["run"] == 0:
            checks[(r["label"], r["case"])] = r
    retrieval = {r["id"]: r for r in json.loads((OUT / "retrieval_gemini.json").read_text(encoding="utf-8"))["results"]}
    rng = random.Random(20261010)
    rdir = OUT / f"review_{args.kind}"
    rdir.mkdir(exist_ok=True)
    mapping = {}
    for c in CASES:
        have = [lb for lb in labels if (lb, c["id"]) in rows]
        if len(have) < 1:
            continue
        order = have[:]
        rng.shuffle(order)
        mapping[c["id"]] = {chr(ord("A") + i): lb for i, lb in enumerate(order)}
        L = [f"# {c['id']} ({LANG[c['lang']]})", "", f"**Q:** {c['question']}"]
        if c["history"]:
            L.append(f"**Earlier:** {c['history'][-1][0]} → {c['history'][-1][1]}")
        if c["screen_text"]:
            L.append(f"**Screen:** {' '.join(c['screen_text'].split())}")
        if c["facts"]:
            L.append("**FACTS:** Next Ekadashi begins 21 Oct 2026 14:12, ends 22 Oct 2026 14:49; fasting day cannot be calculated yet.")
        if c["chart"]:
            L.append("**CHART:** Moon Meena (Pisces) 22°48', house 8, Revati pada 2; lagna Simha.")
        L += ["", "**Key:** " + "; ".join(c["must"]), "**Fails if:** " + ("; ".join(c["must_not"]) or "-"),
              "**Note:** " + (c["note"] or "-"), "",
              "**Block:** " + "; ".join(f"{h['id']} {h['ref']}" for h in retrieval[c["id"]]["hits"]), ""]
        for letter, lb in mapping[c["id"]].items():
            row = rows[(lb, c["id"])]
            L += [f"## {letter}", card_text(row), f"*auto:* {flags_text(checks.get((lb, c['id'])))}", ""]
        (rdir / f"{c['id']}.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    (rdir / "_mapping.json").write_text(json.dumps(mapping, indent=1), encoding="utf-8")
    print(f"{args.kind} pages: {len(mapping)} questions, labels {labels}")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("--budget", type=float, default=15.0, help="seconds the checker may spend opening pages")
    sub.add_parser("review")
    r = sub.add_parser("reasoning")
    r.add_argument("--budget", type=float, default=15.0)
    k = sub.add_parser("control")
    k.add_argument("--budget", type=float, default=15.0)
    q = sub.add_parser("pairs")
    q.add_argument("--kind", required=True)
    q.add_argument("--labels", required=True)
    args = ap.parse_args()
    if args.cmd == "check":
        run_check(args)
    elif args.cmd == "reasoning":
        run_reasoning(args)
    elif args.cmd == "control":
        run_reasoning(args, "control", 20261011)
    elif args.cmd == "pairs":
        run_pairs(args)
    else:
        run_review(args)


if __name__ == "__main__":
    main()
