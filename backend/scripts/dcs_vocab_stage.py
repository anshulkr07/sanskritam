"""DCS vocab staging (CURRICULUM Q3 — WordNet alternative, P22-5 unblocked).

Builds a frequency-ranked Sanskrit word list from the DCS GitHub export
(`cltk/sanskrit_text_dcs`, CC BY 3.0 Unported — attribution only, verified
on the DCS impressum page) WITHOUT touching WordNet (Q2: GPL/FDL + NC
variants — unusable without written permission).

Pipeline (all local, ₹0, no network, no DB writes):
  DCS IAST text → tokenize → frequency → top-N → lipi IAST→Devanāgarī →
  Vidyut parse (lemma; drop unparsed) → staged JSON in results/imports/.

Deliberately UNFILLED (curation-owned, never guessed):
  - ``gloss`` — DCS has no English. Recommended next: cross-ref the
    Mitrasaṃgraha 391K Sanskrit–English pairs (largely CC0).
  - ``topic`` — no WordNet synsets; guessing topics from surface forms
    would misfile words. Owner maps staged lemmas onto the 10 slugs.
  - ``gender``/``stem`` — kosha liṅga is not unanimous (P7-12 finding:
    MASC/FEM/NEUT deliberately unclaimed); stems ship only for regular
    a-stems per the P22-5 rule, and staging is not the place to assert.
  - ``examples[].gloss`` — DCS sentences ship as Devanagari + lipi IAST
    with empty gloss (absent is absent).

Usage (from backend/, CWD is the schema — §2.10)::

    python -m scripts.dcs_vocab_stage --dir <dcs/corpora> [--top 500]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/dcs_vocab_stage.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# IAST letters: ASCII + long vowels, vocalics, anusvāra/visarga,
# velar/palatal/retroflex nasals, sibilants. Case-insensitive counting
# folds these (IAST case carries no grammatical meaning in this export).
IAST_TOKEN_RE = re.compile(
    r"[a-zA-Z\u0101\u0100\u012b\u012a\u016b\u016a\u1e5b\u1e5a"
    r"\u1e5d\u1e5c\u1e37\u1e36\u1e39\u1e38\u0113\u0112\u014d\u014c"
    r"\u1e43\u1e42\u1e25\u1e24\u1e45\u1e44\u00f1\u00d1\u1e6d\u1e6c"
    r"\u1e0d\u1e0c\u1e47\u1e46\u015b\u015a\u1e63\u1e62]+"
)
VERSE_REF_RE = re.compile(r"\(\d+\.\d+\)")
SOURCE_KEY = "dcs"
LICENCE_NOTE = "CC BY 3.0 Unported (DCS impressum, O. Hellwig)"


def tokenize(text: str) -> list[str]:
    """IAST surface tokens, lowercased, verse refs and debris removed."""
    text = VERSE_REF_RE.sub(" ", text)
    return [t.lower() for t in IAST_TOKEN_RE.findall(text) if len(t) > 1]


def split_sentences(text: str) -> list[str]:
    """Split on daṇḍas and line ends — the export's own verse boundaries."""
    parts = re.split(r"[|/]+\s*|\n+", text)
    return [p.strip(" ./|") for p in parts if p.strip(" ./|")]


def frequency(corpora_dir: Path) -> tuple[Counter, dict[str, list[str]]]:
    """Token counts + an inverted index token → example sentences."""
    counts: Counter = Counter()
    index: dict[str, list[str]] = {}
    files = sorted(corpora_dir.glob("*.txt"))
    if not files:
        raise SystemExit(f"no .txt files in {corpora_dir}")
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:  # noqa: BLE001 — one bad file never kills the run
            print(f"[dcs] unreadable file skipped: {path.name} ({e})")
            continue
        for sent in split_sentences(text):
            toks = tokenize(sent)
            if not toks:
                continue
            counts.update(toks)
            for tok in set(toks):
                bucket = index.setdefault(tok, [])
                if len(bucket) < 4 and sent not in bucket:
                    bucket.append(sent)
    return counts, index


def stage_word(iast: str, freq: int, sentences: list[str]) -> dict | None:
    """One staged row, or None when the engine cannot parse the form.

    Lemma comes from the analyzer's first confident reading; gender, stem,
    gloss and topic stay empty for the curation pass (see module docstring).
    """
    from app.grading.analyzer import analyze_sentence, iast_to_devanagari
    from app.services import iast as _iast

    try:
        dev = iast_to_devanagari(iast)
    except Exception:  # noqa: BLE001 — unconvertible token, drop with reason
        return None
    if not dev or not dev.strip():
        return None
    try:
        results = analyze_sentence(dev)
    except Exception:  # noqa: BLE001 — engine miss, drop (never guess)
        return None
    parsed = (results[0].parsed if results else {}) or {}
    if not parsed:
        return None
    lemma = next(iter(parsed))
    examples = []
    for sent in sentences[:2]:
        toks = tokenize(sent)
        if iast not in toks:
            continue
        try:
            sent_dev = iast_to_devanagari(sent)
        except Exception:  # noqa: BLE001
            continue
        examples.append({
            "devanagari": sent_dev,
            "iast": _iast.to_iast(sent_dev),
            "gloss": "",
        })
        if len(examples) == 2:
            break
    return {
        "rank": 0,  # assigned after sorting
        "iast": iast,
        "devanagari": dev,
        "lemma": lemma,
        "freq": freq,
        "gender": "",
        "stem": "",
        "gloss": "",
        "topic": None,
        "examples": examples,
        "provenance": f"{SOURCE_KEY}:frequency",
        "source_key": SOURCE_KEY,
        "licence": LICENCE_NOTE,
    }


def run_stage(corpora_dir: Path, top: int) -> dict:
    from app.models import VocabWord  # noqa: F401  (schema reference only)
    from app.db import SessionLocal

    counts, index = frequency(corpora_dir)
    db = SessionLocal()
    try:
        from app.models import VocabWord as _VW
        seeded = {r[0] for r in db.query(_VW.devanagari).all()}
    finally:
        db.close()

    staged: list[dict] = []
    dropped_noparse = 0
    skipped_seeded = 0
    for iast, freq in counts.most_common(top * 3):  # oversample: parsing drops some
        if len(staged) >= top:
            break
        # Skip words the curated seed already teaches (by Devanagari).
        from app.grading.analyzer import iast_to_devanagari as _conv
        try:
            dev_probe = _conv(iast)
        except Exception:  # noqa: BLE001
            dropped_noparse += 1
            continue
        if dev_probe in seeded:
            skipped_seeded += 1
            continue
        row = stage_word(iast, freq, index.get(iast, []))
        if row is None:
            dropped_noparse += 1
            continue
        staged.append(row)
    for rank, row in enumerate(staged):
        row["rank"] = rank
    return {
        "staged": staged,
        "top": top,
        "distinct_tokens": len(counts),
        "dropped_noparse": dropped_noparse,
        "skipped_seeded": skipped_seeded,
        "licence": LICENCE_NOTE,
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="dcs_vocab_stage",
                                description="Stage DCS-frequency vocab (no DB writes).")
    p.add_argument("--dir", required=True, help="DCS corpora dir (*.txt, IAST)")
    p.add_argument("--top", type=int, default=500)
    p.add_argument("--out", default="results/imports/dcs-vocab.stage.json")
    args = p.parse_args(argv)
    corpora_dir = Path(args.dir)
    if not corpora_dir.is_dir():
        raise SystemExit(f"not a directory: {corpora_dir}")
    report = run_stage(corpora_dir, args.top)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report["staged"], ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"[dcs] distinct tokens: {report['distinct_tokens']}")
    print(f"[dcs] staged {len(report['staged'])}/{args.top} "
          f"({report['dropped_noparse']} unparsed, "
          f"{report['skipped_seeded']} already seeded)")
    print(f"[dcs] licence: {report['licence']}")
    print(f"[dcs] staged JSON written to {out} (gloss/topic/gender/stem need curation)")
    rep = out.with_suffix("").as_posix() + ".report.json"
    Path(rep).write_text(json.dumps(
        {k: v for k, v in report.items() if k != "staged"},
        ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[dcs] report written to {rep}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
