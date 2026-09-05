"""P20-3 / P20-4 — the writing grading contract.

Three-valued, and this is NOT a style preference — §2.2 is an invariant and
handwriting is the surface most likely to break it:

  • **correct** — the recogniser returned the target with (config) confidence.
  • **unsure**  — everything else that is not a confident different letter.
    It NEVER counts as wrong, NEVER breaks a streak, NEVER moves mastery down.
    A first attempt at an unfamiliar script is the worst place in this product
    to be confidently wrong at someone: when the recogniser and the learner
    disagree, the RECOGNISER is the one that abstains.
  • **wrong**   — reserved for a *confident* recognition of a *different*
    akṣara. Rare by design, and rarer on the photo path (P20-4), whose floors
    are configured higher because OCR on beginner handwriting is materially
    less reliable than stroke ink.

The request that reaches the backend is ``{item_id, recognised_text,
confidence, source}`` — never the strokes, never the image (§2.16: the image
is processed on-device and discarded; it does not reach the server, the logs,
or a crash report).

Writing feeds mastery the way pronunciation does (the existing pattern): an
`unsure` contributes nothing rather than a penalty. This module never touches
mastery or streaks at all on `unsure` — and the router only calls the adaptive
path on `correct`.
"""

from __future__ import annotations

from app.config import settings


def grade_writing(item_devanagari: str, recognised_text: str,
                  confidence: float, source: str = "ink") -> dict:
    """Return the three-valued verdict for one writing attempt.

    Normalisation is deliberately minimal: surrounding whitespace and the
    trailing danda are stripped; the comparison is on the full string, so
    'क' vs 'का' is a different akṣara, not a near miss — the reference letter
    is shown again either way.
    """
    target = (item_devanagari or "").strip().strip("।॥")
    got = (recognised_text or "").strip().strip("।॥")

    is_photo = (source or "ink") == "photo"
    correct_floor = (settings.writing_photo_correct_confidence if is_photo
                     else settings.writing_correct_confidence)
    wrong_floor = (settings.writing_photo_wrong_confidence if is_photo
                   else settings.writing_wrong_confidence)

    conf = float(confidence or 0.0)

    # 1. Confident recognition of the target => correct.
    if got == target and conf >= correct_floor:
        return {"verdict": "correct", "abstained": False}

    # 2. Confident recognition of a DIFFERENT akṣara => wrong — rare by
    #    design, and tuned rarer on the photo path. Below the wrong-floor it
    #    is an abstention, not a judgement.
    if got and got != target and conf >= wrong_floor:
        return {"verdict": "wrong", "abstained": False}

    # 3. Everything else — low confidence, empty recognition, partial match —
    #    is the recogniser abstaining. Never a failure of the learner.
    return {"verdict": "unsure", "abstained": True}
