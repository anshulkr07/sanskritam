"""Build Vertex batch requests for Parva pages (handover 8.4).

One request per (slug, variant, lang), carrying the passages code extracted
from the sources, the observance's facts (names, rule; times are NOT
included, they are calculated live), the JSON schema, and the rules:
one-sentence steps, no dashes, no paragraphs, every `text` item cites a
passage given in the request, nothing about a source not given, Hindi as
plain modern Hindi.

Standalone script the owner runs (it starts Vertex batch jobs and costs
money). Dry run of at most 5 requests to measure cost:

    cd backend && ./.venv/Scripts/python.exe scripts/parva_drafts.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.vertex_batch import build_request_line  # noqa: E402

OUT_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds" / "parva"

# (slug, variant) for Phase 1. Later phases append here.
TARGETS: list[tuple[str, str]] = [
    ("ekadashi", ""), ("ekadashi", "papankusha"), ("ekadashi", "prabodhini"),
    ("ekadashi", "nirjala"), ("purnima", ""), ("amavasya", ""),
    ("sankranti", ""), ("diwali_days", "dhanteras"), ("diwali_days", "naraka_chaturdashi"),
    ("diwali_days", "lakshmi_puja"), ("diwali_days", "govardhan_puja"),
    ("diwali_days", "bhai_dooj"), ("karwa_chauth", ""), ("chhath", ""),
    ("kartika_purnima", ""),
]

SYSTEM_EN = (
    "You write festival pages for a Sanskrit learning app. Reply with one JSON object and nothing else. "
    "One-sentence steps, no paragraphs, no em dash and no spaced en dash. "
    "Every item carries basis text, calc or custom. Every text item cites exactly one passage given in the "
    "request with its text_name and ref, and says nothing about a source not given. "
    "Every custom item carries region and source_url. Sanskrit lines are ignored: the app fills them from its own rows."
)

SYSTEM_HI = (
    "You write festival pages in plain modern Hindi for a Sanskrit learning app. Reply with one JSON object "
    "and nothing else. One-sentence steps, no paragraphs, no em dash and no spaced en dash. "
    "Every item carries basis text, calc or custom with the same counts as the English version. "
    "Hindi is plain modern Hindi, not Sanskritised beyond the terms themselves."
)


def user_text(slug: str, variant: str, lang: str, passages: dict[str, str]) -> str:
    lines = [
        f"Observance: {slug}" + (f", variant {variant}" if variant else ""),
        f"Language: {lang}",
        "Shape: summary (one line, max 120 chars); why (4 to 8 steps); do.gather and do.steps (at most 12 steps); "
        "vrat.eat, vrat.avoid, vrat.break and vrat.who_should_eat (at most 10 each; who_should_eat always present: "
        "people who are pregnant, diabetic, on regular medicines, ill, children, the elderly take only fruit or do not fast; "
        "never tell anyone to stop medicine); dont; texts (mantras from the app, leave empty when unsure); regions.",
        "Passages you may cite (ref: passage):",
    ]
    if passages:
        for ref, url in passages.items():
            lines.append(f"- {ref} (opened: {url})")
    else:
        lines.append("- none in this dry run: use basis calc or custom only, no text items.")
    return "\n".join(lines)


def passages_for(_slug: str) -> dict[str, str]:
    # Refs opened for the seeds (app/seeds/parva/passages.json): ref ->
    # {text_name, url, read_on}. The request carries refs, not excerpts, so
    # the model must cite ref only and emit no Sanskrit quotes; the checker
    # fails any quote (nothing to match it against) and any ref not listed.
    try:
        data = json.loads((OUT_DIR / "passages.json").read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return {k: str(v.get("url", "")) for k, v in data.items() if isinstance(v, dict)}
    except Exception:
        pass
    return {}


def build_lines(limit: int = 0) -> list[dict]:
    lines: list[dict] = []
    for slug, variant in TARGETS:
        key = f"{slug}.{variant or 'all'}"
        passages = passages_for(slug)
        lines.append(build_request_line(f"{key}.en", SYSTEM_EN, user_text(slug, variant, "en", passages)))
        if limit and len(lines) >= limit:
            break
        lines.append(build_request_line(f"{key}.hi", SYSTEM_HI, user_text(slug, variant, "hi", passages)))
        if limit and len(lines) >= limit:
            break
    return lines


def estimate_inr(n_requests: int) -> float:
    # Rough: 900 prompt + 8000 output tokens per request at half list price.
    # Priced in quota.gemini_cost_inr at runtime; here a static note.
    return n_requests * 0.35


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default="")
    args = ap.parse_args()
    lines = build_lines(limit=5 if args.dry_run else 0)
    if args.dry_run:
        print(f"dry run: {len(lines)} requests (at most 5 observances x 2 langs, capped at 5 lines here)")
        for ln in lines[:5]:
            req = ln.get("request", {})
            sys_txt = json.dumps(req.get("systemInstruction", ""), ensure_ascii=False)[:120]
            print(f"  {ln.get('key')}: {sys_txt}...")
        print(f"estimated cost: about Rs {estimate_inr(len(lines)):.2f} for {len(lines)} requests")
        print("No job started, no money spent. Full run starts jobs when the owner runs without --dry-run.")
        return
    dest = Path(args.out) if args.out else OUT_DIR / "batch_input.jsonl"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "w", encoding="utf-8", newline="\n") as f:
        for ln in lines:
            f.write(json.dumps(ln, ensure_ascii=False) + "\n")
    print(f"wrote {len(lines)} requests to {dest}")
    print("Next: upload with VertexBatchClient and create the job (see services/vertex_batch.py).")


if __name__ == "__main__":
    main()
