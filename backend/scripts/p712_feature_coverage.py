"""P7-12 · Widen feature coverage — the free half.

Two mechanisms, both deterministic Vidyut output, ₹0:

1. **Re-claim features on the existing pool.** The analyzer already emits
   ``NOM.SG``-style values, so bare number (``SG``/``PL``/``DU``) and pada
   (``PARASMAIPADA``/``ATMANEPADA`` via the derivation-log rule) are a
   *claiming* gap, not a generation gap. ``--enrich`` re-derives features for
   every challenge and adds only what the engines support, idempotently.

2. **Sandhi challenges from services/sandhi.py.** ``--sandhi`` generates
   challenges whose target contains a real sandhi junction, produced by
   joining two known words and verifying the round-trip through chedaka —
   never an LLM draft (HANDOVER P7-12: "derive, do not prompt").

Report counts DISTINCT rows touched/added (§2.14); runs offline; the DB is
never rebuilt, only ``features`` columns updated / challenges appended.

Usage (from backend/, CWD is the schema — §2.10):

    python -m scripts.p712_feature_coverage --dry-run            # default
    python -m scripts.p712_feature_coverage --enrich --live
    python -m scripts.p712_feature_coverage --sandhi --live
"""

from __future__ import annotations

import argparse
import sys
import unicodedata
import uuid
from collections import Counter

if __package__ in (None, ""):  # allow `python scripts/p712_feature_coverage.py`
    sys.path.insert(0, __file__.rsplit("/", 2)[0])

from app.db import SessionLocal  # noqa: E402
from app.models import Challenge  # noqa: E402
from app.services.feature_derivation import derivable_features  # noqa: E402

PROMPTS = {
    "VOWEL-SANDHI": "Say as one sandhied phrase: {first} + {second}",
    "VISARGA-SANDHI": "Join with visarga sandhi: {first} + {second}",
    "ANUSVARA-SANDHI": "Join with anusvāra sandhi: {first} + {second}",
    "CONSONANT-SANDHI": "Join with consonant sandhi: {first} + {second}",
}


def enrich_challenge(ch: Challenge) -> list[str]:
    """Return the NEW feature ids derivable for ``ch`` from engine output."""
    d = derivable_features(ch.target_sanskrit, existing_parses=ch.accepted_parses or None)
    fresh: set[str] = set()
    for vals in d.values():
        fresh.update(vals)
    return sorted(fresh - set(ch.features or []))


def _normalise_for_dedupe(s: str) -> str:
    t = unicodedata.normalize("NFC", s)
    for chx in ("।", "॥", ".", ",", "?", "!", ";", ":", "-", " "):
        t = t.replace(chx, "")
    return t


def run_enrich(live: bool) -> int:
    db = SessionLocal()
    touched = 0
    per_feat: Counter = Counter()
    try:
        rows = db.query(Challenge).all()
        for ch in rows:
            fresh = enrich_challenge(ch)
            if not fresh:
                continue
            per_feat.update(fresh)
            touched += 1
            if live:
                ch.features = sorted(set(ch.features or []) | set(fresh))
        if live:
            db.commit()
    finally:
        db.close()
    mode = "LIVE" if live else "DRY-RUN (nothing written)"
    print(f"[enrich] {mode}: {touched} row(s) gain features "
          f"({sum(per_feat.values())} feature claims)")
    for f, n in sorted(per_feat.items()):
        print(f"    {f:16} +{n}")
    return 0


# ── sandhi generation ───────────────────────────────────────────────────────

# Word pairs known to the kosha whose join exercises one of the four sandhi
# types. The JOIN is validated by chedaka round-trip before anything is
# written — a pair that fails the round-trip is reported and skipped, never
# guessed (§2.11).
WORD_PAIRS: list[tuple[str, str, str, str]] = [
    # (first, second, expected feature, gloss)
    ("रामः", "गच्छति", "VISARGA-SANDHI", "Rāma goes (6.1.113 अतो ऽन्यतरस्याम्)"),
    ("बालकः", "पश्यति", "VISARGA-SANDHI", "the boy sees"),
    ("सः", "अस्ति", "VISARGA-SANDHI", "he is (स अस्ति, visarga → s)"),
    ("एषः", "अस्ति", "VISARGA-SANDHI", "this one is"),
    ("तस्मात्", "यस्मात्", "VISARGA-SANDHI", "from that, from which"),
    ("रामाः", "गच्छन्ति", "VISARGA-SANDHI", "the Rāmas go (8.2.66 खरि च)"),
    ("देवाः", "आगच्छन्ति", "VISARGA-SANDHI", "the gods come (8.3.34)"),
    ("तत्", "एव", "CONSONANT-SANDHI", "that indeed (8.4.45 झलां जशो ऽते)"),
    ("तत्", "च", "CONSONANT-SANDHI", "and that (श्चुत्वश्च, 8.4.40)"),
    ("वाक्", "अस्ति", "CONSONANT-SANDHI", "there is speech (क्→ग्, 8.4.45)"),
    ("शश्वत्", "तिष्ठति", "CONSONANT-SANDHI", "stands forever"),
    ("अहम्", "गच्छामि", "ANUSVARA-SANDHI", "I go (म् → ं, 8.3.22)"),
    ("त्वम्", "पठसि", "ANUSVARA-SANDHI", "you read"),
    ("तथा", "अस्ति", "VOWEL-SANDHI", "so it is (ā + a → ā, अकः सवर्णे दीर्घः)"),
    ("रामम्", "आगच्छति", "VOWEL-SANDHI", "Rāma comes (m + ā, direct merge)"),
]


def _join_via_chedaka(first: str, second: str, va) -> str | None:
    """Join ``first``+``second`` by testing candidate joins through chedaka.

    The Splitter only splits, so the join is produced by trying the obvious
    surface merges (first-final mutated per the sandhi class) and accepting
    the one whose chedaka round-trip yields exactly {first, second}."""
    import re
    f = first.strip("।॥. ")
    s = second.strip("।॥. ")
    candidates: list[str] = []
    # visarga class: रामः+गच्छति → रामो गच्छति (6.1.113 ato 'nyatarasyām);
    # देवाः+आगच्छन्ति → देवा आगच्छन्ति (8.2.66-68); सः+अस्ति → स आस्ति-class aḥ+a → o/a
    if f.endswith("ः"):
        base = f[:-1]
        if s and s[0] in "अआइईउऊऋएऐओऔ":
            candidates.append(base + "ो" + s)        # aḥ + a-class → o
            candidates.append(base + "ा" + s)        # āḥ + vowel → ā
            candidates.append(base + " " + s)        # unjoined (also a valid target shape)
        else:
            candidates.append(base + "ो" + s)        # aḥ + C → o (ścuḥ śi)
            candidates.append(base + "श्" + s if s[0] in "चछजझश" else base + "स्" + s)
    # consonant class: tat+eva → tad eva (jhalām jaśo 'the); t/d + vowel → d
    if f.endswith("त्") or f.endswith("द्"):
        base = f[:-1]
        candidates.append(base + "द" + s)
        candidates.append(base + "द्" + s)
    if f.endswith("क्") or f.endswith("ग्"):
        base = f[:-1]
        candidates.append(base + "ग" + s)
    # vowel class: a+a → ā (akāḥ savarṇe dīrghaḥ); a+i → e; a+u → o (ād guṇaḥ)
    if f and f[-1] == "अ" and s:
        if s[0] == "अ":
            candidates.append(f[:-1] + "ा" + s[1:])
        elif s[0] in "इई":
            candidates.append(f[:-1] + "े" + s[1:])
        elif s[0] in "उऊ":
            candidates.append(f[:-1] + "ो" + s[1:])
    # anusvāra class: म् + C → ं (मो ऽनुस्वारः, 8.3.22)
    if f.endswith("म्") and s:
        candidates.append(f[:-1] + "ं" + s)
    # ā-stem final + vowel: आ + C stays; आ + अ → आ (savarṇa dīrgha)
    if f and f[-1] == "ा" and s and s[0] == "अ":
        candidates.append(f + s[1:])
    # default: plain concatenation (some joins are the direct merge)
    candidates.append(f + s)
    candidates.append(f + " " + s)

    from app.grading.analyzer import normalize_to_slp1

    def _pieces_of(word: str) -> tuple[str, ...]:
        """Chedaka's own pre-sandhi analysis of a standalone word.

        Visarga words analyze as -as/-ās (रामः → rAmas) — the same forms the
        joined round-trip returns, so comparing piece tuples (not surface
        strings) is the engine-native equivalence."""
        try:
            toks = list(va._chedaka.run(normalize_to_slp1(word)))
            return tuple(t.text for t in toks if getattr(t, "data", None) is not None)
        except Exception:  # noqa: BLE001
            return ()

    want_first = _pieces_of(f)
    want_second = _pieces_of(s)
    if not want_first or not want_second:
        return None
    for cand in candidates:
        joined = cand.replace(" ", "")
        try:
            toks = list(va._chedaka.run(normalize_to_slp1(joined)))
        except Exception:
            continue
        pieces = tuple(t.text for t in toks if getattr(t, "data", None) is not None)
        if len(pieces) == 2 and pieces[0] == want_first[0] and pieces[1] == want_second[-1]:
            return joined
    return None


def run_sandhi(live: bool) -> int:
    from app.grading.analyzer import VidyutAnalyzer
    from app.services.sandhi import split_candidates

    va = VidyutAnalyzer()
    if va._chedaka is None:
        print("[sandhi] chedaka unavailable — cannot generate", file=sys.stderr)
        return 2

    db = SessionLocal()
    inserted = 0
    skipped_dup = 0
    failed = []
    try:
        existing = {(_normalise_for_dedupe(c.target_sanskrit), c.register)
                    for c in db.query(Challenge).all()}
        for first, second, feat, gloss in WORD_PAIRS:
            joined = _join_via_chedaka(first, second, va)
            if joined is None:
                failed.append((first, second))
                continue
            # the derivation must also be visible from the SPLIT side (U10-2's
            # DerivationPlayer consumes split_candidates for the junction)
            splits = split_candidates(joined)
            both_known = [c for c in splits if c["first_valid"] and c["second_valid"]]
            if not both_known:
                failed.append((first, second))
                continue
            target = f"{first} + {second} → {joined}"
            if (target, "laukika") in existing or (_normalise_for_dedupe(joined), "laukika") in existing:
                skipped_dup += 1
                continue
            if live:
                ch = Challenge(
                    id=uuid.uuid4().hex[:16],
                    prompt_l1=PROMPTS[feat].format(first=first, second=second) + f" — {gloss}",
                    prompt_lang="en",
                    target_sanskrit=target,
                    target_iast="",
                    features=[feat],
                    accepted_parses=[{
                        "joined": joined,
                        "split_first": both_known[0]["first"],
                        "split_second": both_known[0]["second"],
                    }],
                    register="laukika",
                    review_status="pending",
                )
                db.add(ch)
                db.flush()
                existing.add((target, "laukika"))
            inserted += 1
        if live:
            db.commit()
    finally:
        db.close()
    mode = "LIVE" if live else "DRY-RUN (nothing written)"
    print(f"[sandhi] {mode}: {inserted} distinct challenge(s) "
          f"{'would be inserted' if not live else 'inserted'}, "
          f"{skipped_dup} duplicate(s) skipped")
    if failed:
        print(f"[sandhi] round-trip failed for {len(failed)} pair(s) — NOT generated: "
              + ", ".join(f"{a}+{b}" for a, b in failed))
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="p712_feature_coverage",
                                description="P7-12 free feature coverage (enrich + sandhi).")
    p.add_argument("--enrich", action="store_true",
                   help="re-derive features on the existing pool (SG/PL/DU/pada)")
    p.add_argument("--sandhi", action="store_true",
                   help="generate sandhi challenges from services/sandhi.py + chedaka")
    p.add_argument("--live", action="store_true", help="write changes (default dry-run)")
    args = p.parse_args(argv)
    if not args.enrich and not args.sandhi:
        p.error("nothing to do: pass --enrich and/or --sandhi")
    rc = 0
    if args.enrich:
        rc = run_enrich(args.live) or rc
    if args.sandhi:
        rc = run_sandhi(args.live) or rc
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
