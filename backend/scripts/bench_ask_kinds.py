"""Live length bench: section 9 questions through ask_live.ask + clip.

Recommended by handover_ask_answers.md section 8 (about Rs 5 of Gemini).
Uses the invented birth details 1990-06-15 11:00 New Delhi, as
tests/test_ask_live.py does. Prints and saves each question's kind and prose
word count to backend/results/ask_kinds_bench/.

Usage: cd backend && ./.venv/Scripts/python.exe scripts/bench_ask_kinds.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.db import SessionLocal, init_db  # noqa: E402
from app.models import Learner  # noqa: E402
from app.services import ask_facts, ask_live, kundli, milan  # noqa: E402
from app.services.explainer import reply_language  # noqa: E402

NEW_DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}
BIRTH = {"date": "1990-06-15", "time": "11:00", "tz": "Asia/Kolkata", "label": "New Delhi",
         "lat": 28.6, "lon": 77.2, "time_known": True}

QUESTIONS = [
    (1, "What is today's date according to Vikram Samvat?", "fact", 45, {}),
    (2, "What time is Brahma muhurta tomorrow?", "fact", 45, {}),
    (3, "When is the next amavasya?", "fact", 45, {}),
    (4, "List the 12 months in English and Sanskrit with their dates", "table", 30, {"tradition": "north"}),
    (5, "How can I get a job through astrology?", "reading", 300, {"birth": True}),
    (6, "How is my horoscope today?", "reading", 300, {"birth": True}),
    (7, "What should I eat when I have a cold, according to Ayurveda?", "remedies", 60, {}),
    (8, "What should I do when I am sad, according to the Bhagavad Gita?", "verses", 80, {}),
    (9, "What is the puja vidhi for Navratri?", "procedure", 380, {}),
    (10, "What is dharma?", "explain", 300, {}),
    (11, "Is there trigonometry in the Vedas or Upanishads?", "explain", 300, {}),
    (12, "उदास होने पर भगवद गीता के अनुसार क्या करना चाहिए?", "verses", 80, {}),
]


def prose_words(card: dict) -> int:
    """Prose words only, per handover 3.2 and section 9.

    Not the Sanskrit of a verse or the cells of a table. Acceptance adds
    "plus the table / tiles / verses": those blocks are extra, so they are
    not counted here. Compat sections duplicating them for the old phone are
    not counted either.
    """
    kind = str(card.get("kind") or "explain")
    bits = [card.get("summary") or ""]
    if kind == "table":
        pass
    elif kind == "remedies":
        remedy_names = [(r.get("name") or "").strip().casefold() for r in (card.get("remedies") or [])]
        for s in card.get("sections") or []:
            h = (s.get("heading") or "").strip().casefold()
            if s.get("style") == "steps" and h in remedy_names:
                continue
            bits.extend(s.get("items") or [])
    elif kind == "verses":
        for s in card.get("sections") or []:
            bits.extend(s.get("items") or [])
    else:
        for s in card.get("sections") or []:
            bits.extend(s.get("items") or [])
        for v in card.get("verses") or []:
            bits.append(v.get("meaning") or "")
            bits.append(v.get("apply") or "")
        for t in card.get("terms") or []:
            bits.append(t.get("meaning") or "")
    if card.get("caution"):
        bits.append(card["caution"])
    return len(" ".join(bits).split())


async def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        learner = db.query(Learner).first()
        if learner is None:
            from app.models import Learner as L
            learner = L(display_name="bench", bridge_langs=["en", "hi"])
            db.add(learner)
            db.commit()
        rows = []
        only = os.environ.get("BENCH_ONLY", "")
        wanted = {int(x) for x in only.split(",") if x.strip().isdigit()} if only else None
        for num, q, want_kind, want_words, flags in QUESTIONS:
            if wanted is not None and num not in wanted:
                continue
            place = dict(NEW_DELHI)
            trad = flags.get("tradition", "")
            facts, _wt, _wn, _ds, _pk = ask_facts.calendar_facts(q, "", place, trad)
            chart_text, match_text = "", ""
            if flags.get("birth"):
                born = kundli.birth_moment(BIRTH["date"], BIRTH["time"], BIRTH["tz"], True)
                chart = kundli.chart(born, BIRTH["lat"], BIRTH["lon"], time_known=True)
                chart_text = kundli.facts_text(chart)
                if ask_facts.is_daily_question(q):
                    chart_text += "\n" + kundli.daily_text(chart)
            got = await ask_live.ask(db, learner, q, reply_language(q, ["en", "hi"]), facts=facts,
                                     chart=chart_text, match=match_text, surface="bench")
            if got is None:
                rows.append({"n": num, "question": q, "kind": None, "words": None,
                             "want_kind": want_kind, "want_words": want_words, "error": "no answer"})
                print(f"{num}. NO ANSWER want={want_kind}", flush=True)
                continue
            card = ask_live.clip(got[0])
            # check_card needs a db session; verses/links unchecked here are
            # still clipped, which is what the word count measures.
            words = prose_words(card)
            ok = "OK" if (card.get("kind") == want_kind and words <= want_words) else "OVER"
            rows.append({"n": num, "question": q, "kind": card.get("kind"), "words": words,
                         "want_kind": want_kind, "want_words": want_words, "verdict": ok,
                         "card": card})
            print(f"{num}. kind={card.get('kind')} want={want_kind} words={words}/{want_words} {ok}",
                  flush=True)
        outdir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "results", "ask_kinds_bench")
        os.makedirs(outdir, exist_ok=True)
        stamp = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y%m%d-%H%M")
        with open(os.path.join(outdir, f"bench-{stamp}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
