"""Tips from recitation bands (handover_recite 8.5). At most three."""

from __future__ import annotations

from app.services.pronunciation import SCORABLE_CONTRASTS

_TIP_TEXT = {
    "retroflex_vs_dental": "Retroflex sounds: curl the tongue back for ट ठ ड ढ ण",
    "aspirated_vs_plain": "Aspiration: add a puff of air for ख घ छ झ ठ ढ थ ध फ भ",
    "sibilants": "Sibilants: shape the groove for श ष स",
    "vowel_length": "Vowel length: hold long vowels twice as long",
}


def _contrast_of(a: str, b: str) -> str:
    for kind, chars in SCORABLE_CONTRASTS.items():
        if a and b and a[0] in chars and b[0] in chars and a != b:
            # Same class, different sound: only when both carry the class.
            # Devanagari in tips comes from SCORABLE_CONTRASTS, never typed.
            return kind
    return ""


def tips(bands: list[dict], line_of: list[int] | None = None, perfect: bool = False) -> list[dict]:
    if perfect:
        return [{"kind": "perfect", "text": "Perfect"}]
    out: list[dict] = []
    # Contrast tips, most frequent first.
    counts: dict[str, int] = {}
    for b in bands:
        if b.get("band") == "red" and b.get("heard"):
            k = _contrast_of(b.get("t", ""), b.get("heard", ""))
            if k:
                counts[k] = counts.get(k, 0) + 1
    for kind, _ in sorted(counts.items(), key=lambda kv: -kv[1]):
        out.append({"kind": kind, "text": _TIP_TEXT.get(kind, kind)})
        if len(out) >= 3:
            return out[:3]
    # Skipped runs: 3+ consecutive non-green.
    run = 0
    run_line = 0
    for idx, b in enumerate(bands):
        ln = (line_of[idx] + 1) if line_of and idx < len(line_of) else 0
        if b.get("band") != "green":
            if run == 0:
                run_line = ln
            run += 1
        else:
            if run >= 3:
                out.append({"kind": "skipped", "text": f"You skipped part of line {run_line}." if run_line else "You skipped a part."})
                if len(out) >= 3:
                    return out[:3]
            run = 0
    if run >= 3:
        out.append({"kind": "skipped", "text": f"You skipped part of line {run_line}." if run_line else "You skipped a part."})
        if len(out) >= 3:
            return out[:3]
    # Unclear share.
    if bands:
        u = sum(1 for b in bands if b.get("band") == "amber") / len(bands)
        if u > 0.20:
            out.append({"kind": "unclear",
                        "text": "Some parts were hard to hear. Try a quieter place, closer to the phone."})
    return out[:3]
