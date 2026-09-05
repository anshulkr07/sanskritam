"""P10-1 · Numeral coverage audit — reads nothing, spends nothing.

The claim under audit: "Sanskrit number words are nouns, so the existing
grading stack grades them with no new code." Measured half-true on 2026-09-05
(HANDOVER P10-1): declinable low numerals work; higher numerals do not, and
पञ्च mis-parses CONFIDENTLY as a vocative — the dangerous failure mode, because
the abstention principle (§2.2) only protects a learner when the analyzer KNOWS
it is unsure.

This script audits 1–100 plus common Līlāvatī vocabulary against
``analyze_sentence`` and prints a coverage table. It authors nothing, inserts
nothing, and hits no network. If confident mis-parses are common, P10 STOPS
per §6 and becomes a frozen-analyzer escalation.

Run (from backend/ — CWD is the schema, §2.10):
    python -m scripts.p10_numeral_audit
"""

from __future__ import annotations

import json
import sys

if __package__ in (None, ""):
    sys.path.insert(0, __file__.rsplit("/", 2)[0])

from app.grading.analyzer import analyze_sentence  # noqa: E402

# Cardinal numerals: 1–20, then the decades to 100 (Līlāvatī works mostly in
# these plus compounds).
NUMERALS: list[tuple[str, str, int]] = [
    ("एकः", "ekaḥ", 1), ("द्वौ", "dvau", 2), ("त्रयः", "trayaḥ", 3),
    ("चत्वारः", "catvāraḥ", 4), ("पञ्च", "pañca", 5), ("षट्", "ṣaṭ", 6),
    ("सप्त", "sapta", 7), ("अष्ट", "aṣṭa", 8), ("नव", "nava", 9), ("दश", "daśa", 10),
    ("एकादश", "ekādaśa", 11), ("द्वादश", "dvādaśa", 12), ("त्रयोदश", "trayodaśa", 13),
    ("चतुर्दश", "caturdaśa", 14), ("पञ्चदश", "pañcadaśa", 15), ("षोडश", "ṣoḍaśa", 16),
    ("सप्तदश", "saptadaśa", 17), ("अष्टादश", "aṣṭādaśa", 18), ("नवदश", "navadaśa", 19),
    ("विंशतिः", "viṃśatiḥ", 20),
    ("एकविंशतिः", "ekaviṃśatiḥ", 21), ("द्वाविंशतिः", "dvāviṃśatiḥ", 22),
    ("त्रिंशत्", "triṃśat", 30), ("चत्वारिंशत्", "catvāriṃśat", 40),
    ("पञ्चाशत्", "pañcāśat", 50), ("षष्टिः", "ṣaṣṭiḥ", 60),
    ("सप्ततिः", "saptatiḥ", 70), ("अशीतिः", "aśītiḥ", 80),
    ("नवतिः", "navatiḥ", 90), ("शतम्", "śatam", 100),
]

# Līlāvatī's common vocabulary (Bhāskara II's problem words)
LILAVATI_VOCAB: list[tuple[str, str]] = [
    ("योजनम्", "yojana"), ("करणम्", "karaṇa"), ("गुणम्", "guṇa"),
    ("भागः", "bhāga"), ("राशिः", "rāśi"), ("पदम्", "pada"),
    ("वर्गः", "varga"), ("घनम्", "ghana"), ("मूलम्", "mūla"),
    ("अंशः", "aṃśa"), ("कला", "kalā"), ("रूपम्", "rūpa"),
]


def _classify(word: str, iast: str, value: int) -> dict:
    try:
        results = analyze_sentence(word)
    except Exception as e:  # noqa: BLE001
        return {"word": word, "iast": iast, "value": value, "status": "unresolved",
                "confident": False, "readings": f"analyzer raised: {e}"}
    if not results:
        return {"word": word, "iast": iast, "value": value, "status": "unresolved",
                "confident": False, "readings": "no readings"}
    confident = all(r.is_confident for r in results) and any(r.parsed for r in results)
    readings = [dict(r.parsed or {}) for r in results if r.parsed]
    # A confident non-nominal parse of a bare numeral is a mis-parse: a lone
    # cardinal stated as its own sentence is a subject (NOM) — never LOC or
    # VOC (पञ्च-as-'table'-style collisions).
    blob = json.dumps(readings, ensure_ascii=False)
    if not confident:
        return {"word": word, "iast": iast, "value": value, "status": "unresolved",
                "confident": False, "readings": blob}
    if '"VOC' in blob or '"LOC' in blob:
        return {"word": word, "iast": iast, "value": value, "status": "misparse",
                "confident": True, "readings": blob}
    return {"word": word, "iast": iast, "value": value, "status": "ok",
            "confident": True, "readings": blob}


def main() -> int:
    print("=" * 76)
    print("P10-1 · NUMERAL COVERAGE AUDIT — analyze_sentence, no vendor calls")
    print("=" * 76)
    print(f"{'word':14} {'iast':12} {'value':>6} {'status':11} readings")
    print("-" * 76)
    numerals = [_classify(d, i, v) for (d, i, v) in NUMERALS]
    for r in numerals:
        print(f"{r['word']:14} {r['iast']:12} {r['value']:>6} {r['status']:11} {r['readings']}")
    print("-" * 76)
    print("\nLīlāvatī vocabulary:")
    vocab = [_classify(d, i, 0) for (d, i) in LILAVATI_VOCAB]
    for r in vocab:
        print(f"{r['word']:14} {r['iast']:12} {'—':>6} {r['status']:11} {r['readings']}")

    n_ok = sum(1 for r in numerals if r["status"] == "ok")
    n_unres = sum(1 for r in numerals if r["status"] == "unresolved")
    n_mis = sum(1 for r in numerals if r["status"] == "misparse")
    print("\n" + "=" * 76)
    print(f"NUMERALS: {n_ok} ok · {n_unres} unresolved · {n_mis} CONFIDENT MISPARSE (of {len(numerals)})")
    print(f"LILAVATI: {sum(1 for r in vocab if r['status'] == 'ok')} ok · "
          f"{sum(1 for r in vocab if r['status'] == 'misparse')} misparse (of {len(vocab)})")
    if n_mis:
        print("\n⚠ Confident mis-parses exist → per HANDOVER §6, P10-2/P10-3 STOP here;")
        print("  this becomes an analyzer question (§2.1 escalation), not a fix you make.")
    else:
        print("\nNo confident mis-parses — the grading stack may proceed with P10-2.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
