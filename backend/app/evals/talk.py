"""Live-model regression suite for the Talk path.

    python -m app.evals.talk
    python -m app.evals.talk --repeat 3 --only kn,te

This is NOT the same shape as `python -m app.evals`. That suite scores raw
model output on seed challenges — one provider call per case. This one drives
the SHIPPED PIPELINE end to end:

    services/lang_detect  ->  services/tutor (real prompt, real gates)
                          ->  services/iast

and asserts the invariants those gates exist to hold. Bypassing them to score
the model directly would skip the exact thing worth watching, because every
failure below is one the model still produces and the gates still catch.

Why it exists (all measured 2026-09-22, against sarvam-105b-conversations):

  • With the language rule in the SYSTEM prompt, the model answers almost
    everything in Kannada — Telugu, Tamil, Malayalam, Bengali and Hindi all
    came back Kannada, 2/7 correct. Ordered in the USER message: 9/9. This
    suite fails loudly if that regresses, which a prompt edit could do
    silently.
  • On native-script input the model leaks the input script into the SANSKRIT
    field 38% of the time (3/8) — one reply_sa was 26% Devanagari and the rest
    Telugu. The purity gate catches it; this proves the gate still runs.
  • It invents Sanskrit words. Asked about "Aham henge adini" it invented
    आदिनि for "today" (अद्य) and explained the invented word confidently. The
    Vidyut gate on fix.devanagari is what stops that reaching a learner.

Costs real money and real latency (~1 s/turn), so it is a command you run, not
a pytest. The deterministic half — detection ordering, gate behaviour against
canned output — lives in tests/test_lang_detect.py and tests/test_tutor.py and
runs for free on every commit.

Exit code is non-zero when any invariant fails, so CI can gate on it.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from dataclasses import dataclass, field

from app.evals.cli_env import force_utf8_stdio, load_dotenv


# ─── Cases ───
#
# Each is a real utterance a learner could type, paired with the language it
# IS. Deliberately weighted towards the hard half: romanized input (where a
# script scan tells you nothing) and native-script input (where the model
# leaks the script into the Sanskrit field).


@dataclass(frozen=True)
class TalkCase:
    id: str
    utterance: str
    # The language this genuinely is. "" for a line that is pure romanized
    # Sanskrit: it carries no bridge language at all, so the right answer is
    # "whatever the session already had" and there is nothing to assert.
    lang: str
    kind: str                 # "roman" | "native" | "mixed" | "correct"
    note: str = ""
    # True when the line is ALREADY correct Sanskrit. Such a line must never
    # draw a "say it like this" card — measured live, the model issued one
    # anyway, with an invented grammar rule to justify it.
    correct: bool = False
    # True when the line has a real, provable mistake. It MUST get a fix: the
    # correction guard once trusted a parse-only verdict and would have
    # discarded the fix for "aham gacchasi", the commonest beginner error.
    expect_fix: bool = False


CASES: tuple[TalkCase, ...] = (
    TalkCase("kn-roman-owner", "Aham henge adini", "kn", "roman",
             "the owner's own line; the LLM classifier calls this Telugu at "
             "confidence 1.0, so the marker table must win"),
    TalkCase("kn-roman", "nanna hesaru anshul, sanskrit nalli henge helodu", "kn", "roman"),
    TalkCase("te-roman", "nenu ela unnanu ani sanskrit lo ela cheppali", "te", "roman"),
    TalkCase("ta-roman", "naan porein nu sanskrit la epdi solrathu", "ta", "roman"),
    TalkCase("ml-roman", "njan pokunnu ennu sanskrit il engane parayum", "ml", "roman"),
    TalkCase("hi-roman", "mujhe sanskrit mein kaise kehna hai ki main ghar ja raha hoon",
             "hi", "roman"),
    TalkCase("mr-roman", "mala sanskrit madhe kasa bolaycha aahe", "mr", "roman"),

    TalkCase("te-native", "నేను ఇంటికి వెళ్తున్నాను అని సంస్కృతంలో ఎలా చెప్పాలి?", "te", "native",
             "native script is where reply_sa leaks the input script"),
    TalkCase("kn-native", "ನನ್ನ ಹೆಸರು ಅಂಶುಲ್. ಸಂಸ್ಕೃತದಲ್ಲಿ ಹೇಗೆ ಹೇಳೋದು?", "kn", "native"),
    TalkCase("ta-native", "என் பெயர் அன்ஷுல். சம்ஸ்கிருதத்தில் எப்படி சொல்வது?", "ta", "native"),
    TalkCase("ml-native", "ഞാൻ വീട്ടിൽ പോകുന്നു എന്ന് സംസ്കൃതത്തിൽ എങ്ങനെ പറയും?", "ml", "native"),
    TalkCase("bn-native", "আমার নাম অংশুল, সংস্কৃতে কীভাবে বলব?", "bn", "native"),
    TalkCase("hi-native", "मुझे संस्कृत में कैसे कहना है कि मैं घर जा रहा हूँ", "hi", "native"),

    TalkCase("ml-mixed", "അഹം ഗച്ഛാമി correct aano?", "ml", "mixed",
             "under half Malayalam by letter count; the 0.30 script floor"),
    TalkCase("kn-mixed", "aham vidyalayam gacchami ಅಂತ ಸರಿನಾ?", "kn", "mixed"),

    # Already-correct Sanskrit, in roman letters and in two native scripts.
    # The point of these is the no-false-fix invariant, not detection.
    TalkCase("kn-correct-roman", "aham kushalah asmi", "", "correct",
             "live false correction: drew a fix + an invented gender rule",
             correct=True),
    TalkCase("kn-correct-script", "ಅಹಂ ಗಚ್ಛಾಮಿ", "kn", "correct",
             "Sanskrit in Kannada script; Vidyut reads it via vidyut.lipi",
             correct=True),
    TalkCase("te-correct-script", "మమ నామ అన్షుల్", "te", "correct",
             "live false correction: 'you omitted the verb asti' (copula "
             "elision is correct Sanskrit)", correct=True),

    # Real person-agreement mistakes. Every word parses; the words disagree.
    TalkCase("agree-1v2", "aham gacchasi", "", "mistake",
             "I + you-go; the guard must not swallow this fix", expect_fix=True),
    TalkCase("agree-2v1", "tvam gacchami", "", "mistake", expect_fix=True),
    TalkCase("agree-kn-script", "ಅಹಂ ಗಚ್ಛಸಿ", "kn", "mistake",
             "the same mistake, written in Kannada script", expect_fix=True),

    TalkCase("en-plain", "hello, I would like to learn how to introduce myself",
             "en", "roman",
             "live: an English speaker's reply_native came back in Hindi"),
)


# ─── Invariants ───


@dataclass
class Result:
    case: TalkCase
    detected: str = ""
    lang_source: str = ""
    lang_ms: float = 0.0
    turn_ms: float = 0.0
    source: str = ""
    failures: list[str] = field(default_factory=list)
    reply_sa: str = ""
    reply_native: str = ""

    @property
    def ok(self) -> bool:
        return not self.failures


def _check(reply, case: TalkCase, detected: str) -> list[str]:
    """Every invariant the gates exist to hold. Returns the ones that broke."""
    from app.services import lang_detect
    from app.services.tutor import is_devanagari_pure

    bad: list[str] = []
    lang = lang_detect.get(detected)

    if case.lang and detected != case.lang:
        bad.append(f"language: got {detected!r}, expected {case.lang!r}")

    # The 38% failure. A Sanskrit field must be Sanskrit, in Devanagari.
    if reply.reply_sa and not is_devanagari_pure(reply.reply_sa):
        share = lang_detect.script_share(reply.reply_sa, *lang_detect.DEVANAGARI)
        bad.append(f"reply_sa only {share:.0%} Devanagari")
    if reply.fix_dev and not is_devanagari_pure(reply.fix_dev):
        share = lang_detect.script_share(reply.fix_dev, *lang_detect.DEVANAGARI)
        bad.append(f"fix.devanagari only {share:.0%} Devanagari")

    # Not even one letter of another script inside the Sanskrit. A 96%-
    # Devanagari line with one Kannada letter ("ಅहम्") cleared the 90% floor
    # live; the gate now repairs or rejects it, and this proves it did.
    from app.services.tutor import (
        foreign_script_in_native,
        has_other_indic_letters,
        native_line_is_sanskrit,
    )
    for label, text in (("reply_sa", reply.reply_sa), ("fix.devanagari", reply.fix_dev)):
        if has_other_indic_letters(text):
            bad.append(f"{label} carries letters from another script: {text[:30]!r}")

    # The native line: only the learner's own script, and their LANGUAGE —
    # not the Sanskrit written in their letters.
    leaked = foreign_script_in_native(reply.reply_native, detected)
    if leaked:
        bad.append(f"reply_native mixed in {leaked}")
    if native_line_is_sanskrit(reply.reply_native, detected):
        bad.append("reply_native is Sanskrit in native letters, not the native language")

    # Both scripts, always, or neither. The owner asked for Devanagari AND
    # roman; the old screen shipped neither because iast was never populated.
    if reply.reply_sa and not reply.reply_sa_iast:
        bad.append("Sanskrit reply with no roman line")
    if reply.fix_dev and not reply.fix_iast:
        bad.append("Sanskrit fix with no roman line")

    # A "say it like this" card with nothing in it is worse than no card.
    if reply.fix_needed and not reply.fix_dev:
        bad.append("fix.needed with an empty fix")

    # The reply in the learner's own language must be in that language's
    # script. This is the check that was 2/7 before the order moved.
    if reply.reply_native and lang.block is not None:
        share = lang_detect.script_share(reply.reply_native, *lang.block)
        if share < 0.5:
            bad.append(f"reply_native only {share:.0%} {lang.name_en} script")

    # English has no Unicode block of its own to check, which is exactly how
    # a Hindi reply_native for an English speaker went unnoticed live.
    if reply.reply_native and lang.code == "en":
        letters = [c for c in reply.reply_native if c.isalpha()]
        latin = sum(1 for c in letters if ord(c) < 0x250) / len(letters) if letters else 1.0
        if latin < 0.8:
            bad.append(f"reply_native only {latin:.0%} Latin for an English speaker")

    # Correct Sanskrit must never be "corrected" — and a real mistake must be.
    if case.correct and reply.fix_needed:
        bad.append(f"correct Sanskrit was 'fixed' to {reply.fix_dev!r}")
    if case.expect_fix and not reply.fix_needed:
        bad.append("a real mistake got no fix")

    # A turn that says nothing is a failure however it got there.
    if not reply.has_content:
        bad.append("turn carried no content at all")

    return bad


async def run_case(tutor, case: TalkCase, sticky: str | None) -> Result:
    import time

    from app.services import lang_detect

    t0 = time.perf_counter()
    detected, how = await lang_detect.resolve_language(case.utterance, sticky=sticky)
    lang_ms = (time.perf_counter() - t0) * 1000

    t1 = time.perf_counter()
    reply = await tutor.reply(
        transcript=case.utterance,
        history=[],
        situation="a first conversation",
        target_features=["NOM.SG", "PRES.1SG"],
        native_lang=detected,
    )
    turn_ms = (time.perf_counter() - t1) * 1000

    return Result(
        case=case,
        detected=detected,
        lang_source=how,
        lang_ms=lang_ms,
        turn_ms=turn_ms,
        source=reply.source,
        failures=_check(reply, case, detected),
        reply_sa=reply.reply_sa,
        reply_native=reply.reply_native,
    )


# ─── Report ───


def render(results: list[Result], verbose: bool) -> str:
    lines: list[str] = []
    lines.append(f"{'case':<17}{'lang':<16}{'via':<10}{'lat':>8}  result")
    lines.append("-" * 76)
    for r in results:
        lang = (r.detected if (not r.case.lang or r.detected == r.case.lang)
                else f"{r.detected}!={r.case.lang}")
        verdict = "ok" if r.ok else "FAIL " + "; ".join(r.failures)
        lines.append(
            f"{r.case.id:<17}{lang:<16}{r.lang_source:<10}"
            f"{r.lang_ms + r.turn_ms:>7.0f}ms  {verdict}"
        )
        if verbose and r.reply_sa:
            lines.append(f"{'':>17}sa: {r.reply_sa[:54]}")
        if verbose and r.reply_native:
            lines.append(f"{'':>17}na: {r.reply_native[:54]}")

    failed = [r for r in results if not r.ok]
    total = len(results)
    lines.append("")
    lines.append(f"passing: {total - len(failed)}/{total}")

    # Detection cost, split by which layer carried it — the free layers are
    # supposed to carry almost everything.
    by_layer: dict[str, int] = {}
    for r in results:
        by_layer[r.lang_source] = by_layer.get(r.lang_source, 0) + 1
    lines.append("detection: " + ", ".join(
        f"{k}={v}" for k, v in sorted(by_layer.items(), key=lambda kv: -kv[1])))

    paid = sum(v for k, v in by_layer.items() if k == "llm")
    lines.append(f"  free layers carried {total - paid}/{total}")

    lat = sorted(r.lang_ms + r.turn_ms for r in results)
    if lat:
        lines.append(
            f"latency: p50 {lat[len(lat) // 2]:.0f}ms  "
            f"p100 {lat[-1]:.0f}ms"
        )

    if failed:
        lines.append("")
        lines.append("failures:")
        for r in failed:
            lines.append(f"  {r.case.id}: " + "; ".join(r.failures))
            if r.case.note:
                lines.append(f"      ({r.case.note})")
            # The model is non-deterministic, so a failure is often not
            # reproducible. Print what it actually said, every time.
            if r.reply_sa:
                lines.append(f"      sa: {r.reply_sa}")
            if r.reply_native:
                lines.append(f"      na: {r.reply_native}")

    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m app.evals.talk",
        description="Live-model regression suite for the Talk pipeline "
                    "(lang_detect -> tutor -> gates -> iast).",
    )
    p.add_argument("--only", default="",
                   help="comma-separated language codes to run (e.g. kn,te)")
    p.add_argument("--kind", default="",
                   help="comma-separated from: roman, native, mixed, correct, mistake")
    p.add_argument("--repeat", type=int, default=1,
                   help="run each case N times — this model is non-deterministic "
                        "at temperature 0.6, and a single pass understates the "
                        "leak rate")
    p.add_argument("--verbose", action="store_true",
                   help="print the Sanskrit and native lines for each turn")
    return p


async def _main(args) -> int:
    from app.services.tutor import ConversationTutor

    cases = list(CASES)
    if args.only:
        want = {c.strip().lower() for c in args.only.split(",") if c.strip()}
        cases = [c for c in cases if c.lang in want]
    if args.kind:
        kinds = {k.strip().lower() for k in args.kind.split(",") if k.strip()}
        cases = [c for c in cases if c.kind in kinds]
    if not cases:
        print("No cases selected.", file=sys.stderr)
        return 1

    tutor = ConversationTutor()
    if not tutor.available:
        print("Tutor provider not configured — set SARVAM_API_KEY.", file=sys.stderr)
        return 2

    n = len(cases) * args.repeat
    print(f"{n} turns against the live model "
          f"({len(cases)} cases x {args.repeat})\n")

    results: list[Result] = []
    for pass_no in range(args.repeat):
        # Each pass starts cold. Stickiness is exercised WITHIN a pass, since
        # that is how a real session behaves.
        sticky: str | None = None
        for case in cases:
            r = await run_case(tutor, case, sticky)
            results.append(r)
            sticky = r.detected
            print("." if r.ok else "!", end="", flush=True)
        if args.repeat > 1:
            print(f"  pass {pass_no + 1}/{args.repeat}")
    print("\n")
    print(render(results, args.verbose))

    return 1 if any(not r.ok for r in results) else 0


def main() -> int:
    force_utf8_stdio()
    load_dotenv()
    args = build_parser().parse_args()
    try:
        return asyncio.run(_main(args))
    except KeyboardInterrupt:
        print("\ninterrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
