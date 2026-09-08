"""Mitrasaṃgraha gloss induction for staged DCS vocab (P22-5, Q2-alternative).

Fills the ``gloss`` hole the DCS stage deliberately left empty, WITHOUT
WordNet (Q2: GPL/FDL + NC variants — unusable without written permission).

Licence discipline (verified against the repo itself, not the doc's memory):
  - Per-text licences come from ``final_catalog.tsv``'s License column.
  - The English TRANSLATIONS live under ``data/train/cc-by-sa/`` (CC BY-SA)
    and ``data/train/cc-by-nc-nd/`` (NC+ND). The catalogue's "cc0" describes
    the Sanskrit SOURCE text, not the translation.
  - USED: files whose catalogue licence is exactly ``cc0`` AND which live
    outside ``cc-by-nc-nd/``. Excluded in particular: Agni-Purāṇa and
    Tantrāloka (BY-NC-ND strings) and Vrindavana (``cc0?`` uncertain).
  - SHIPPED: at most a 3-token English gloss per lemma. Short phrases are
    not copyrightable subject matter; NO example sentence from these
    translations ever ships (that would be an SA adaptation). Victorian
    translations (Griffith, Ganguly, Bühler…) are a gloss signal, never an
    authority (§4.4 rule, applied again).

Method (local, ₹0, no network, no DB writes):
  one pass over the included pairs, Sanskrit side tokenized with the DCS
  stage's own tokenizer; for each staged lemma collect up to 25 pairs
  containing its surface form (fallback: dictionary lemma); English sides
  → diacritics folded (Brahmā→brahma), lowercase, ASCII-only, stopwords
  and sub-3-letter fragments dropped, trailing-s merged into the bare form
  when present; top token by pair-support becomes the gloss candidate.

Acceptance is two-tiered, because the probe run showed co-occurrence
lies with confidence: dialogue verbs ('said'), vocative contexts
('lord') and reference abbreviations dominate epic English sides, and
surface-frequency pairs ('two sons' → dvau='son') trap numerals.
  - AUTO-ACCEPT (ships as ``gloss``): support ≥5 pairs AND ratio ≥0.70
    AND (document-frequency ≤8 lemmas OR ratio ≥0.90). The ratio≥0.90
    escape keeps genuine verbs of saying (uvāca→said 24/25) while the
    df bar rejects their contextual echoes (kṛtaṃ→said 11/25).
  - CANDIDATES (human picks): everything meeting support ≥3 / ratio
    ≥0.40 ships as ``gloss_candidates`` with per-token support; tokens
    seen in >8 lemmas' top lists are flagged ``background: true`` so
    curation distrusts them. ``gloss`` stays "" — a wrong gloss teaches
    wrong, which is worse than empty.

Usage (from backend/)::

    python -m scripts.mitra_gloss_stage --mitra <data/train> --catalogue <final_catalog.tsv> --in results/imports/dcs-vocab.stage.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

if __package__ in (None, ""):  # allow `python scripts/mitra_gloss_stage.py`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.dcs_vocab_stage import tokenize  # noqa: E402

EN_WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")
SUPPORT_MIN_PAIRS = 3
SUPPORT_MIN_RATIO = 0.40
AUTO_MIN_PAIRS = 5
AUTO_MIN_RATIO = 0.70
AUTO_MIN_RATIO_BACKGROUND = 0.90
BACKGROUND_DF = 8
MAX_PAIRS_PER_LEMMA = 25
GLOSS_MAX_TOKENS = 3
EN_MIN_LEN = 3

STOPWORDS = frozenset(
    "the a an and or of to in on for with by from as at is are was were be "
    "been being it its this that these those he she they them him who which "
    "what when where how not no so but if then than too very all any one two "
    "my your our you we i me us do does did have has had will would shall "
    "should can could may might must there here their his her s t d m ll ve "
    "re o yea nay oh lo unto upon within without".split()
)

SOURCE_KEY = "mitrasamgraha"
LICENCE_NOTE = ("CC BY-SA 4.0 (translation); short-phrase gloss extraction "
                "only — no example sentences shipped")


def catalogue_gate(catalogue_path: Path) -> set[str]:
    """Filenames whose catalogue licence is exactly ``cc0``.

    Anything else ("cc0 BY-NC-ND …", "cc0?") is excluded: NC+ND is
    incompatible outright, and "?" is not a licence (§6 rule).
    """
    ok: set[str] = set()
    with open(catalogue_path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if (row.get("License") or "").strip() == "cc0":
                name = (row.get("Filename") or "").strip()
                if name:
                    ok.add(name)
    return ok


def fold_diacritics(text: str) -> str:
    """Brahmā→brahma, Pârvati→parvati: NFKD strip of combining marks.

    Without this the ASCII-only tokenizer mangles transliterated names
    into fragments ('brahm'), which then win supports as garbage.
    """
    return "".join(c for c in unicodedata.normalize("NFKD", text)
                   if not unicodedata.combining(c))


def english_tokens(text: str) -> list[str]:
    """Lowercase word tokens: diacritics folded, stopwords, sub-3-letter
    fragments and apostrophe forms dropped. Reference abbreviations
    (ch./v./K./R.) die on length; poetic contractions (o'er) and
    possessives (king's) die on the apostrophe — the bare form almost
    always co-occurs where it matters."""
    return [t for t in EN_WORD_RE.findall(fold_diacritics(text).lower())
            if t not in STOPWORDS and len(t) >= EN_MIN_LEN
            and "'" not in t]


def merge_plurals(counts: Counter) -> Counter:
    """Fold 'kings' into 'king' when the bare form is also attested."""
    merged = Counter(counts)
    for tok in list(merged):
        if len(tok) > 3 and tok.endswith("s") and tok[:-1] in merged:
            merged[tok[:-1]] += merged.pop(tok)
    return merged


def induce_candidates(pair_english: list[str]) -> dict:
    """Top supported English tokens with supports — no acceptance here.

    Acceptance needs corpus-wide document frequency (computed in
    ``apply_acceptance``): a token topping dozens of lemmas ('said') is
    narrative background, not a gloss — unless it dominates (≥0.90).
    """
    if len(pair_english) < SUPPORT_MIN_PAIRS:
        return {"pairs": len(pair_english), "candidates": []}
    counts: Counter = Counter()
    for en in pair_english:
        for tok in set(english_tokens(en)):  # one vote per pair per token
            counts[tok] += 1
    counts = merge_plurals(counts)
    ranked = counts.most_common(GLOSS_MAX_TOKENS)
    return {"pairs": len(pair_english),
            "candidates": [{"token": t, "support": n} for t, n in ranked]}


def apply_acceptance(rows: list[dict]) -> None:
    """Two-tier acceptance, in place. See module docstring for the rule."""
    df: Counter = Counter()
    for row in rows:
        for cand in row.get("_cands", {}).get("candidates", []):
            df[cand["token"]] += 1
    for row in rows:
        info = row.pop("_cands", {"pairs": 0, "candidates": []})
        cands = info["candidates"]
        pairs = info["pairs"]
        for cand in cands:
            cand["background"] = df[cand["token"]] > BACKGROUND_DF
        gloss, conf, sup = "", "none", 0
        if cands:
            top = cands[0]
            # Plural-merging can push support past the pair count (a pair
            # voting for both 'pala' and 'palas'); cap the ratio at 1.0 so
            # acceptance math stays honest.
            ratio = min(top["support"], pairs) / pairs if pairs else 0
            if (top["support"] >= AUTO_MIN_PAIRS and ratio >= AUTO_MIN_RATIO
                    and (not top["background"] or ratio >= AUTO_MIN_RATIO_BACKGROUND)):
                gloss = top["token"]
                conf = "high"
                sup = top["support"]
            elif (top["support"] >= SUPPORT_MIN_PAIRS
                    and ratio >= SUPPORT_MIN_RATIO):
                conf = "low"
                sup = top["support"]
        row["gloss_candidates"] = cands
        row["gloss_confidence"] = conf
        row["gloss_support"] = sup
        row["gloss_pairs"] = pairs
        if gloss:
            row["gloss"] = gloss


def collect_pairs(mitra_dir: Path, allowed: set[str],
                  wanted: set[str]) -> dict[str, list[str]]:
    """Single pass: wanted IAST token → up to N English sides.

    Skips the ``cc-by-nc-nd/`` tree unconditionally (licence), and any file
    the catalogue does not clear. Reports both skip lists.
    """
    found: dict[str, list[str]] = {w: [] for w in wanted}
    used_files = 0
    skipped: list[str] = []
    files = sorted(mitra_dir.rglob("*.tsv"))
    for path in files:
        rel = path.relative_to(mitra_dir).as_posix()
        if "cc-by-nc-nd" in path.parts:
            skipped.append(f"{rel} (nc-nd tree)")
            continue
        if path.name not in allowed:
            skipped.append(f"{rel} (catalogue gate)")
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:  # noqa: BLE001 — one bad file never kills the run
            skipped.append(f"{rel} (unreadable: {e})")
            continue
        used_files += 1
        for line in text.splitlines():
            if "\t" not in line:
                continue
            sa, _, en = line.partition("\t")
            if not en.strip():
                continue
            for tok in set(tokenize(sa)):
                bucket = found.get(tok)
                if bucket is not None and len(bucket) < MAX_PAIRS_PER_LEMMA:
                    bucket.append(en.strip())
    return {"index": found, "used_files": used_files, "skipped": skipped}


def run_gloss(mitra_dir: Path, catalogue_path: Path,
              staged: list[dict]) -> dict:
    allowed = catalogue_gate(catalogue_path)
    wanted: set[str] = set()
    for row in staged:
        wanted.add(row["iast"])
        if row.get("lemma"):
            wanted.add(row["lemma"])
    collected = collect_pairs(mitra_dir, allowed, wanted)
    index = collected["index"]
    out_rows = []
    for row in staged:
        pairs = index.get(row["iast"]) or []
        matched_on = "surface"
        if not pairs and row.get("lemma"):
            pairs = index.get(row["lemma"]) or []
            matched_on = "lemma"
        if not pairs and " " in row["iast"]:
            # Sandhi-fused surface forms rarely match; try components.
            for part in row["iast"].split():
                pairs = index.get(part) or []
                if pairs:
                    matched_on = f"component:{part}"
                    break
        res = induce_candidates(pairs)
        new = dict(row)
        new["_cands"] = res
        new["gloss_matched_on"] = matched_on
        new["gloss_provenance"] = f"{SOURCE_KEY}:gloss-induction"
        new["gloss_licence"] = LICENCE_NOTE
        out_rows.append(new)
    apply_acceptance(out_rows)
    filled = sum(1 for r in out_rows if r.get("gloss"))
    return {
        "rows": out_rows,
        "filled": filled,
        "of": len(out_rows),
        "used_files": collected["used_files"],
        "skipped_files": collected["skipped"],
        "licence": LICENCE_NOTE,
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="mitra_gloss_stage",
                                description="Induce short glosses (no DB writes).")
    p.add_argument("--mitra", required=True, help="mitrasamgraha data/train dir")
    p.add_argument("--catalogue", required=True, help="final_catalog.tsv")
    p.add_argument("--in", dest="inp", required=True, help="dcs-vocab.stage.json")
    p.add_argument("--out", default="results/imports/dcs-vocab.glossed.json")
    args = p.parse_args(argv)
    staged = json.loads(Path(args.inp).read_text(encoding="utf-8"))
    report = run_gloss(Path(args.mitra), Path(args.catalogue), staged)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report["rows"], ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(f"[mitra] used {report['used_files']} cc0-gated files; "
          f"skipped {len(report['skipped_files'])}")
    for s in report["skipped_files"][:10]:
        print(f"[mitra]   skip: {s}")
    print(f"[mitra] glossed {report['filled']}/{report['of']} "
          f"(auto-accept: >=5 pairs, >=70% support, background only at >=90%; "
          f"rest ship as candidates for curation)")
    print(f"[mitra] licence: {report['licence']}")
    print(f"[mitra] staged JSON written to {out} (curation reviews before import)")
    rep = out.with_suffix("").as_posix() + ".report.json"
    Path(rep).write_text(json.dumps(
        {k: v for k, v in report.items() if k != "rows"},
        ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[mitra] report written to {rep}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
