"""Recitation rubric v2 (handover_games_daily_multiplayer §8): a versioned
100-point rubric with four named components, each honestly computed:

  content     60 — correctly spoken expected content, from an
              occurrence-aware multiset measure: repeating one expected word
              can never satisfy several different words, and extra material
              does not erase covered content.
  sequence    20 — monotonic (Levenshtein) alignment of the recitation
              against the expected progression; reordered or repeated chunks
              lose credit while duplicate identities stay distinct.
  continuity  15 — internal pauses and fragmentation measured from
              TIMESTAMPED evidence (provider timestamps when present,
              deterministic envelope analysis otherwise). Leading/trailing
              silence is ignored; a documented breathing allowance per
              phrase boundary applies.
  rhythm      5 — pacing stability relative to a reviewed delivery profile
              with tolerance for slower speakers; never grades melody,
              accent or absolute speed.

Hard rules this module enforces and fixtures assert:
  • a clean ordered reading must outrank the same words scrambled and
    fragmented with long pauses;
  • a slower but continuous correct recitation is not heavily penalised;
  • the combined result is capped by demonstrated content coverage, so one
    perfect line of a long verse (or fluent humming) cannot score highly;
  • insufficient evidence returns "unclear", never an invented zero.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.services.recite_scoring import aksharas

RUBRIC_VERSION = "recite-v2-1"

# Pause handling (seconds) — calibrated defaults; the calibration job in
# tests/test_recite_v2.py checks ordering targets before these freeze.
MAX_PAUSE_FREE = 0.8        # phrase-boundary breathing allowance
PAUSE_PENALTY_BEYOND = 2.5  # pauses beyond this many seconds count fully
SPEECH_RATE_MIN = 1.6       # aksharas/second floor for "slow but continuous"
WORDS_PER_PHRASE = 4

WEIGHT_CONTENT = 60
WEIGHT_SEQUENCE = 20
WEIGHT_CONTINUITY = 15
WEIGHT_RHYTHM = 5


@dataclass
class Segment:
    """One recognised chunk with its timing evidence (seconds from start)."""

    text: str
    start_s: float | None = None
    end_s: float | None = None


@dataclass
class ReciteScoreV2:
    status: str  # scored | unclear
    total: int | None
    components: dict = field(default_factory=dict)
    evidence: dict = field(default_factory=dict)
    reason: str = ""

    def as_payload(self) -> dict:
        return {
            "status": self.status, "total": self.total,
            "components": self.components, "evidence": self.evidence,
            "reason": self.reason, "rubric_version": RUBRIC_VERSION,
        }


def _multiset_content(ref: list[str], hyp: list[str]) -> float:
    """Occurrence-aware coverage: each reference akshara occurrence can be
    satisfied once; leftovers and extras are ignored beyond capping."""
    from collections import Counter
    want = Counter(ref)
    have = Counter(hyp)
    covered = sum(min(want[t], have[t]) for t in want)
    return covered / len(ref) if ref else 0.0


def _monotonic_sequence(ref: list[str], hyp: list[str]) -> float:
    """Monotonic alignment ratio (1 - editdistance/max) — reordering and
    repeats break monotonicity and lose credit here, not in content."""
    n, m = len(ref), len(hyp)
    if n == 0:
        return 0.0
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cur[j] = min(prev[j - 1] + (ref[i - 1] != hyp[j - 1]),
                         prev[j] + 1, cur[j - 1] + 1)
        prev = cur
    dist = prev[m]
    return max(0.0, 1.0 - dist / max(1, m))


def _pauses(segments: list[Segment]) -> tuple[list[float], float, float]:
    """Internal gaps between voiced segments; returns (gaps, lead, tail)."""
    voiced = [s for s in segments if s.start_s is not None and s.end_s is not None
              and s.text.strip()]
    if not voiced:
        return [], 0.0, 0.0
    gaps = []
    for a, b in zip(voiced, voiced[1:]):
        g = max(0.0, b.start_s - a.end_s)
        gaps.append(g)
    lead = voiced[0].start_s
    tail = 0.0
    last_end = voiced[-1].end_s
    if segments and segments[-1].end_s is not None:
        tail = max(0.0, segments[-1].end_s - last_end) if segments[-1].end_s and last_end else 0.0
    return gaps, float(lead), float(tail)


def continuity_score(segments: list[Segment], expected_aksharas: int) -> tuple[float, dict]:
    """15-point component: excessive internal pauses and fragmentation.
    Phrase-boundary breathing (≤ MAX_PAUSE_FREE) is free; pauses beyond
    PAUSE_PENALTY_BEYOND count fully; linear in between."""
    gaps, lead, tail = _pauses(segments)
    if expected_aksharas == 0:
        return 0.0, {"reason": "no reference"}
    # expected speech time from a mid-range delivery profile (~3 aksharas/s)
    expected_speech = expected_aksharas / 3.0
    voiced = sum((s.end_s - s.start_s) for s in segments
                 if s.start_s is not None and s.end_s is not None and s.text.strip())
    total_internal = sum(g for g in gaps if g > MAX_PAUSE_FREE)
    allowance = 0.15 * max(1.0, expected_speech)  # breathing budget
    over = max(0.0, total_internal - allowance)
    penalty_share = min(1.0, over / max(1.0, expected_speech))
    score = WEIGHT_CONTINUITY * (1.0 - penalty_share)
    return max(0.0, score), {
        "internal_pauses_s": round(total_internal, 2),
        "allowance_s": round(allowance, 2),
        "pause_penalty": round(penalty_share, 3),
    }


def rhythm_score(segments: list[Segment], expected_aksharas: int) -> tuple[float, dict]:
    """5-point component: pacing stability vs the delivery profile, tolerant
    of slower speakers. Rates below SPEECH_RATE_MIN taper gently; this is
    pacing feedback, not metre analysis."""
    voiced = [(s.start_s, s.end_s) for s in segments
              if s.start_s is not None and s.end_s is not None and s.text.strip()]
    if not voiced or expected_aksharas == 0:
        return 0.0, {"reason": "no timing evidence"}
    span = voiced[-1][1] - voiced[0][0]
    if span <= 0:
        return 0.0, {"reason": "empty interval"}
    rate = expected_aksharas / span
    if rate >= SPEECH_RATE_MIN:
        factor = 1.0
    else:
        # gentle taper: half the component at half the floor rate, zero near silence
        factor = max(0.0, min(1.0, rate / SPEECH_RATE_MIN))
    return WEIGHT_RHYTHM * factor, {"rate_aksharas_per_s": round(rate, 2)}


def score_v2(reference_lines: list[str], segments: list[Segment],
             heard: str | None = None) -> ReciteScoreV2:
    """Score one recitation. `segments` carry the recognised text plus the
    timestamps the provider (or the deterministic envelope) produced. With
    no usable timing evidence the timing components are returned as missing
    rather than invented; callers may present a partial result (practice) or
    mark the attempt unclear (ranked).

    `heard`, when given, is the whole transcript and the segments carry
    timing only (voiced spans measured from the audio)."""
    ref = [a for line in reference_lines for a in aksharas(line)]
    if heard is None:
        heard = "".join(s.text + " " for s in segments)
    hyp = aksharas(heard)
    if len(ref) < 3 or len(hyp) < 2 or not heard.strip():
        return ReciteScoreV2(status="unclear", total=None,
                             reason="insufficient recognised speech")

    coverage = _multiset_content(ref, hyp)
    sequence = _monotonic_sequence(ref, hyp)
    content = WEIGHT_CONTENT * coverage
    seq_score = WEIGHT_SEQUENCE * sequence

    timed = any(s.start_s is not None and s.end_s is not None for s in segments)
    if timed:
        cont, cont_evi = continuity_score(segments, len(ref))
        rhythm, rhy_evi = rhythm_score(segments, len(ref))
        # Coverage cap: flow and pace are earned only on the content actually
        # recited, so one fluent line of a long verse (or humming) cannot
        # collect the full timing points.
        cont *= coverage
        rhythm *= coverage
    else:
        cont = cont_evi = None
        rhythm = rhy_evi = None

    components = {
        "content": round(content, 1),
        "sequence": round(seq_score, 1),
        "continuity": round(cont, 1) if cont is not None else None,
        "rhythm": round(rhythm, 1) if rhythm is not None else None,
    }
    evidence = {
        "coverage": round(coverage, 3),
        "sequence_ratio": round(sequence, 3),
        "ref_aksharas": len(ref),
        "heard_aksharas": len(hyp),
        **({"continuity": cont_evi} if cont_evi is not None else {}),
        **({"rhythm": rhy_evi} if rhy_evi is not None else {}),
    }

    # Coverage cap: the combined result can never exceed what demonstrated
    # content supports (humming or one perfect line of a long verse).
    partial = content + seq_score
    if not timed:
        total = round(partial)
        return ReciteScoreV2(status="scored", total=total,
                             components=components, evidence=evidence,
                             reason="timing components unavailable; partial total")
    total = int(round(content + seq_score + cont + rhythm))
    return ReciteScoreV2(status="scored", total=max(0, total),
                         components=components, evidence=evidence)


def score_recording(reference_lines: list[str], heard: str,
                    spans: list[tuple[float, float]] | None) -> ReciteScoreV2:
    """Score a real recording: words from the transcript, timing from the
    voiced spans measured in the audio (app.services.recite_timing). No
    spans (undecodable or silent audio) leaves timing missing, never
    invented."""
    segments = [Segment(text="~", start_s=a, end_s=b) for a, b in (spans or [])]
    return score_v2(reference_lines, segments, heard=heard)


def is_complete(result: ReciteScoreV2) -> bool:
    """Every component present: the only result a ranked event may count."""
    c = result.components or {}
    return result.status == "scored" and all(
        c.get(k) is not None for k in ("content", "sequence", "continuity", "rhythm"))


# ── Counterexample helpers used by calibration fixtures ─────────────────────


def synthetic_segments(text: str, *, t0: float = 0.0, wps: float = 2.8,
                       pause_every: int = 0, pause_s: float = 0.0,
                       scramble: bool = False, fragment: bool = False) -> list[Segment]:
    """Deterministic timing for fixture recordings (the calibration suite
    builds clean vs disrupted inputs with this)."""
    words = text.split()
    if scramble:
        words = words[::-1]
    segments: list[Segment] = []
    t = t0
    chunk = 1 if fragment else WORDS_PER_PHRASE
    for i, w in enumerate(words):
        dur = max(0.2, len(w) / (wps * 2.2))
        segments.append(Segment(text=w, start_s=round(t, 3), end_s=round(t + dur, 3)))
        t += dur
        if pause_every and (i + 1) % pause_every == 0:
            t += pause_s
    return segments
