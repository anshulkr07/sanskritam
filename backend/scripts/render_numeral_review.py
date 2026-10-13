"""Render the Sanskrit numeral lexicon review packet.

Generates results/numeral_lexicon_review.md straight from the live lexicon, so
the packet always matches what the code serves. The reviewer checks the forms,
marks edits, and signs the block at the end; an approved packet is the
linguistic sign-off that flips the Number Builder content to "reviewed"
(also run this after any lexicon.py edit to regenerate).

Run from backend/ (CWD is the schema, §2.10):
    python -m scripts.render_numeral_review
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "results" / "numeral_lexicon_review.md"

from app.services.numerals import CONVENTION_NOTE, ENGINE_VERSION, REVIEW_STATUS  # noqa: E402
from app.services.numerals.fixtures import owner_example_expectations  # noqa: E402
from app.services.numerals.lexicon import get_lexicon  # noqa: E402


def main() -> int:
    sa = get_lexicon("sa")
    en = get_lexicon("en")
    exp = owner_example_expectations()

    def roman(entry) -> str:
        return entry.surface("roman") or entry.surface("dev")

    lines: list[str] = [
        "# Sanskrit numeral lexicon — review packet",
        "",
        f"Engine version `{ENGINE_VERSION}` · current status **{REVIEW_STATUS}**",
        "",
        "## How to sign off",
        "",
        "1. Check each form below (classical citation forms; sandhi as shown).",
        "2. Mark any correction directly in the table — or edit",
        "   `backend/app/services/numerals/lexicon.py` yourself; it is a data table.",
        "3. Confirm the counting convention (next section) or write the preferred one.",
        "4. Fill in and sign the block at the end, then tell the developer —",
        "   the lexicon status flips to `reviewed` and Number Builder's Sanskrit",
        "   reading publishes under your sign-off. No code changes are needed for",
        "   surface-form edits.",
        "",
        "## The taught convention (confirm or correct)",
        "",
        CONVENTION_NOTE,
        "",
        "Key convention choices to confirm:",
        "",
        "- x9 numbers use the एकोन- (\"one-less\") form as primary (39 =",
        "  एकोनचत्वारिंशत्), with the unit-first नव- compound recorded as an accepted",
        "  variant (नवत्रिंशत्).",
        "- 21–99 are unit-first (48 = अष्टाचत्वारिंशत्, \"eight-forty\").",
        "- Scale nouns stay in one citation form regardless of coefficient",
        "  (दश कोटिः, त्रीणि शतम्) — this is a *reading/counting* exercise;",
        "  qualified counting with declined plurals is deliberately out of scope.",
        "- The decimal marker दशमंशे is a MODERN choice (classical Sanskrit has no",
        "  digit-reading decimal convention). Alternatives a reviewer may prefer:",
        "  दशमिक, बिन्दुः (Hindi loan), or a fractions reading (त्रीणि दशांशाः) — the",
        "  brief requires the fractions reading to stay a separate exercise.",
        "- The negative marker ऋणम् follows the classical धन/ऋण (positive/negative)",
        "  of Indian mathematics (Brahmagupta).",
        "",
        "## 0–99 inventory",
        "",
        "| value | Devanagari (primary) | IAST | accepted variants |",
        "| ---: | --- | --- | --- |",
    ]
    for n in range(100):
        e = sa.by_id[f"sa:n:{n}"]
        variants = "; ".join(v.get("dev", "") for v in e.variants) or "—"
        lines.append(f"| {n} | {e.surface('dev')} | {roman(e)} | {variants} |")

    lines += [
        "",
        "## Scales, marker, sign",
        "",
        "| value | Devanagari | IAST | note |",
        "| --- | --- | --- | --- |",
        f"| 100 | शतम् | {roman(sa.by_id['sa:scale:hundred'])} | hundreds group |",
        f"| 1000 | सहस्रम् | {roman(sa.by_id['sa:scale:thousand'])} | thousands group |",
        f"| 10^5 | लक्षम् | {roman(sa.by_id['sa:scale:lakh'])} | lakh (Indian grouping) |",
        f"| 10^7 | कोटिः | {roman(sa.by_id['sa:scale:crore'])} | crore (Indian grouping) |",
        f"| decimal | दशमंशे | {roman(sa.by_id['sa:marker:decimal'])} | digit-reading marker — CONFIRM |",
        f"| negative | ऋणम् | {roman(sa.by_id['sa:sign:negative'])} | धन/ऋण tradition — CONFIRM |",
        "",
        "English surfaces are included for completeness (en junction \"and\" is",
        "deliberately NOT an accepted surface — the taught convention reads",
        "digit-style; tell us if you want British \"and\" accepted):",
        "",
        "| item | English |",
        "| --- | --- |",
        f"| marker | {en.by_id['en:marker:decimal'].surface('text')} |",
        f"| negative | minus (accepted: negative) |",
        "| scales | hundred, thousand, lakh, crore, million |",
        "",
        "## The canonical worked example (owner's number)",
        "",
        f"`104847322.34`",
        "",
        f"- International display: `{exp['international_display']}`",
        f"- Indian display: `{exp['indian_display']}`",
        f"- English international: \"{exp['english_international']}\"",
        f"- English Indian: \"{exp['english_indian']}\"",
        f"- Sanskrit: **{exp['sanskrit']}**",
        f"- Semantic decomposition: {exp['decomposition']}",
        "",
        "Audio for this reading is rendered from the reviewed surface text via the",
        "existing TTS pipeline once the sign-off lands.",
        "",
        "## Sign-off",
        "",
        "```",
        "Reviewed by: ______________________________",
        "",
        "Date: ____________",
        "",
        "Convention confirmed as written:  [ ] yes   [ ] corrected (see notes)",
        "",
        "0–99 forms:  [ ] approved as shown   [ ] corrections marked above (n = ____)",
        "",
        "Decimal marker दशमंशे:  [ ] approved   [ ] replace with: ______________",
        "",
        "Negative marker ऋणम्:  [ ] approved   [ ] replace with: ______________",
        "",
        "Notes:",
        "____________________________________________________________",
        "____________________________________________________________",
        "```",
    ]

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(lines)} lines, lexicon status {REVIEW_STATUS})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
