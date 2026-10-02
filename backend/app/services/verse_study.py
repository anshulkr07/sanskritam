"""What a verse means: written once by the model, kept, served from the DB.

Owner instruction 2026-10-02: the verse of the day shows its meaning in
English and Hindi, and the Ask sheet answers questions about a verse. When
the app already holds the answer it is shown from the database. When it does
not, Gemini Flash writes it in a presentable shape (a card: meaning, the
idea, the key words), the answer is stored, and the next learner who asks is
served the stored row with no model call. The verse can be from any text.

Two stores:

* ``shlokas.translation_en`` / ``translation_hi`` — the plain meaning, shown
  under the verse. Filled here only when empty: a translation that came with
  a sourced import is never overwritten.
* ``ask_answers`` — the card for a question about a verse, keyed by the verse
  text, the question and the answer's language. "What does this verse mean?"
  in any wording shares one row per language (``MEANING_Q``).

Two model calls, both JSON, both on the Gemini budget (services/quota.py,
kind ``gemini_inr``, worst case reserved before the call and settled to the
billed tokens after):

* the study — meaning and idea in English and Hindi plus key words, one call
  per verse for its whole life;
* a card — the answer to any other question, or to the meaning question in a
  third language, one call per verse, question and language.

Fail-closed everywhere: no credentials, a spent budget, a failed call or
unparseable JSON returns None and the caller falls back (the stored
translation, then the Sarvam explainer). A line the model says it cannot
read is stored as "nothing honest to say", so it is not paid for twice.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.evals.providers import LLMResponse, build_provider
from app.models import AskAnswer, Learner, Shloka
from app.services.explainer import clip_card, flatten_card, parse_card_json, strip_dashes, strip_markup
from app.services.iast import to_iast
from app.services.quota import (
    GEMINI_KIND,
    QuotaExceeded,
    check_and_consume,
    gemini_cost_inr,
    refund_quota,
    settle_quota,
)

logger = logging.getLogger("shabd.verse_study")

#: The stored question for "what does this verse mean?", whatever its wording.
MEANING_Q = "__meaning__"

# How many word glosses ride along to the model, and onto a card.
_GLOSS_MAX = 24
_TERMS_MAX = 8

_STUDY_PROMPT = """You are a careful Sanskrit teacher writing study notes for \
Sanskritam, a learning app. You are given one Sanskrit verse or saying. Write \
what it means for a beginner, once in English and once in Hindi, as one JSON \
object.

Rules:
- "clear": true when the line is Sanskrit you can read and it carries a \
complete thought. false when it is too short, broken or garbled to explain \
honestly. When false, leave every other field empty. Do not guess.
- "meaning_en": what the verse says, in one or two plain English sentences. \
Your own words, faithful to the Sanskrit, nothing added and nothing left out.
- "meaning_hi": the same meaning in simple Hindi, written in Devanagari.
- "idea_en": two or three short sentences on the thought in the verse and \
why people remember it. "idea_hi": the same in Hindi.
- "words": up to 6 important words as they stand in the verse once sandhi is \
split, each {"sa": the word in Devanagari, "en": short meaning, "hi": short \
meaning}. Only words from the verse. Never compose new Sanskrit.
- WORD GLOSSES, when given, are correct. Stay consistent with them.
- Do not give a chapter or verse number. Do not name the text it comes from \
unless you are certain.
- No markdown, no asterisks, no em dashes, no transliteration.

Return ONLY this JSON object:
{"clear": true, "meaning_en": "", "meaning_hi": "", "idea_en": [""], \
"idea_hi": [""], "words": [{"sa": "", "en": "", "hi": ""}]}"""

_CARD_PROMPT = """You are a patient Sanskrit teacher's assistant in \
Sanskritam, a learning app. A learner is reading one Sanskrit verse and asks \
about it. Answer as one JSON object, no markdown.

Rules:
- Write every field in the language the final instruction names, and no \
other. Sanskrit words stay in Devanagari.
- "title": at most 6 words naming what the answer is about.
- "summary": the direct answer in one or two sentences. If they ask what the \
verse means, this is the meaning.
- "sections": at most 2, each a short heading and at most 3 items of one \
short sentence each, for the idea behind the verse or the steps of an \
explanation. Leave it empty when the summary says it all.
- "terms": at most 4 words from the verse, each {"sa": the word in \
Devanagari as it stands in the verse, "meaning": short meaning}. Only words \
that appear in the verse. Never compose new Sanskrit.
- AUTHORED MEANING and WORD GLOSSES, when given, are correct. Stay consistent \
with them and never contradict them.
- Do not give a chapter or verse number. Name the text it comes from only if \
you are certain.
- Do not grade the learner. No claims about grammatical number or case \
endings unless the learner asked about grammar.
- No em dashes anywhere.
- If the line is too short or too unclear to answer honestly, say so in \
"summary" and leave sections and terms empty.
- If the question is not about this verse, Sanskrit, or the ideas in the \
verse, say in "summary" that you can help with the verse, and leave the rest \
empty.

Return ONLY this JSON object:
{"title": "", "summary": "", "sections": [{"heading": "", "style": \
"bullets", "items": [""]}], "terms": [{"sa": "", "meaning": ""}]}"""

# Shown, and stored, when the model says a line carries no clear meaning.
_NOTHING = {
    "en": "This line is too short or unclear to give a meaning on its own.",
    "hi": "यह पंक्ति इतनी छोटी या अस्पष्ट है कि अकेले इसका अर्थ नहीं बताया जा सकता।",
}
_TITLE = {"en": "Meaning", "hi": "अर्थ"}
_IDEA = {"en": "The idea", "hi": "भाव"}

_DEVANAGARI = re.compile("[ऀ-ॿ]")
_DEVA_RUN = re.compile("^[ऀ-ॿ᳐-᳿ ]+$")
# "What does this verse mean?" and its Hindi forms. A question about one WORD
# of the verse is not this: it is answered as its own question.
_MEANING_EN = re.compile(r"\b(mean|means|meaning|translat\w*|explain)\b", re.I)
_ABOUT_VERSE_EN = re.compile(r"\b(this|it|verse|shloka|sloka|line)\b", re.I)
_MEANING_HI = re.compile("अर्थ|मतलब|अनुवाद|तात्पर्य|भावार्थ")
_ABOUT_VERSE_HI = re.compile("श्लोक|इसका|इस का|इसके|पंक्ति|हिंदी में|हिन्दी में")
_ONE_WORD = re.compile(r"\bword\b|शब्द", re.I)


def is_meaning_question(question: str) -> bool:
    """True for "what does this verse mean?" in English or Hindi wording."""
    q = (question or "").strip()
    if not q or len(q) > 80 or _ONE_WORD.search(q):
        return False
    if _DEVANAGARI.search(q):
        return bool(_MEANING_HI.search(q) and _ABOUT_VERSE_HI.search(q))
    return bool(_MEANING_EN.search(q) and _ABOUT_VERSE_EN.search(q))


def slot_for(language: str) -> Optional[str]:
    """"en" or "hi" for the two languages a study is written in, else None."""
    lang = (language or "").strip()
    if lang == "English":
        return "en"
    if lang.startswith("Hindi"):
        return "hi"
    return None


# ── the store ────────────────────────────────────────────────────────────────

def answer_key(subject: str, question: str, language: str) -> str:
    raw = "\x1f".join(((subject or "").strip(), (question or "").strip(), (language or "").strip()))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def load_answer(db: Session, subject: str, question: str, language: str) -> Optional[dict]:
    """The stored Ask payload for this verse, question and language, or None."""
    row = db.get(AskAnswer, answer_key(subject, question, language))
    return dict(row.payload or {}) if row is not None else None


def save_answer(db: Session, subject: str, question: str, language: str,
                payload: dict, provider: str = "") -> None:
    """Keep an answer. Two learners asking at once write the same key: merge."""
    db.merge(AskAnswer(
        key=answer_key(subject, question, language),
        subject=(subject or "").strip(),
        question=(question or "").strip()[:512],
        language=(language or "").strip()[:48],
        payload=payload,
        provider=(provider or "")[:64],
    ))
    db.commit()


# ── cards ────────────────────────────────────────────────────────────────────

def _clean(text: object) -> str:
    return re.sub(r"\s+", " ", strip_dashes(strip_markup(str(text or "")))).strip()


def _payload(card: Optional[dict], explanation: str, provider: str) -> dict:
    return {
        "routed_to": "llm",
        "explanation": explanation,
        "engine": {},
        "source": "llm",
        "provider": provider,
        "card": card,
    }


def _card(title: str, summary: str, sections: list[dict], terms: list[dict]) -> dict:
    """The Ask card shape the app renders (mobile AskCard)."""
    return {
        "title": title,
        "title_sa": "",
        "title_iast": "",
        "when": {"text": "", "note": ""},
        "summary": summary,
        "sections": sections,
        "terms": terms,
        "caution": "",
        "place_needed": False,
    }


def _glosses(verse: Optional[Shloka]) -> list[tuple[str, str]]:
    if verse is None:
        return []
    return [
        (str(w.get("word") or "").strip(), str(w.get("meaning") or "").strip())
        for w in (verse.word_breakdown or [])[:_GLOSS_MAX]
        if isinstance(w, dict) and w.get("word") and w.get("meaning")
    ]


def _terms(pairs: list[tuple[str, str]]) -> list[dict]:
    terms: list[dict] = []
    for sa, meaning in pairs:
        sa, meaning = _clean(sa), _clean(meaning)
        if not sa or not meaning or not _DEVA_RUN.match(sa):
            continue
        try:
            iast = to_iast(sa)
        except Exception:  # noqa: BLE001 — a term without roman is still a term
            iast = ""
        terms.append({"sa": sa, "iast": iast, "meaning": meaning})
        if len(terms) >= _TERMS_MAX:
            break
    return terms


def stored_card(verse: Shloka, slot: str) -> Optional[dict]:
    """An Ask payload built from what the verse row already holds: its stored
    meaning and, for English, its word glosses. No model, no cost. None when
    the row has no meaning in either language."""
    en = (verse.translation_en or "").strip()
    hi = (verse.translation_hi or "").strip()
    meaning = (hi or en) if slot == "hi" else (en or hi)
    if not meaning:
        return None
    # The authored glosses are English; a Hindi card carries the meaning alone.
    terms = _terms(_glosses(verse)) if slot != "hi" else []
    card = _card(_TITLE[slot if (slot == "hi" and hi) else "en"], _clean(meaning), [], terms)
    return _payload(card, flatten_card(card), "")


def _study_payloads(study: dict, verse: Optional[Shloka], provider: str) -> dict[str, dict]:
    """The two stored payloads ("en", "hi") from one study."""
    words = [w for w in (study.get("words") or []) if isinstance(w, dict)][:6]
    authored = _glosses(verse)
    out: dict[str, dict] = {}
    for slot in ("en", "hi"):
        meaning = _clean(study.get(f"meaning_{slot}"))
        if not meaning:
            continue
        idea = [_clean(i) for i in (study.get(f"idea_{slot}") or [])[:3]]
        idea = [i for i in idea if i]
        sections = [{"heading": _IDEA[slot], "style": "bullets", "items": idea}] if idea else []
        # Authored glosses outrank the model's for the English card.
        pairs = authored if (slot == "en" and authored) else [
            (str(w.get("sa") or ""), str(w.get(slot) or "")) for w in words
        ]
        card = _card(_TITLE[slot], meaning, sections, _terms(pairs))
        out[slot] = _payload(card, flatten_card(card), provider)
    return out


# ── the model ────────────────────────────────────────────────────────────────

class _Reply:
    __slots__ = ("data", "provider")

    def __init__(self, data: Optional[dict], provider: str) -> None:
        self.data = data
        self.provider = provider


_provider = None
_provider_ref = ""


def _get_provider():
    """Process-wide provider for verse work (one client, reused)."""
    global _provider, _provider_ref
    ref = settings.verse_explain_provider
    if _provider is None or ref != _provider_ref:
        _provider = build_provider(ref, timeout=settings.verse_explain_timeout_s)
        _provider_ref = ref
    return _provider


def available() -> bool:
    """True when a Gemini call can plausibly be made right now."""
    if not settings.verse_explain_enabled:
        return False
    name = settings.verse_explain_provider.partition(":")[0].strip().lower()
    # Calls here are billed to the Gemini budget, so only Google-billed routes.
    if name not in ("vertex", "gemini", "openrouter"):
        return False
    try:
        return _get_provider().configured
    except ValueError:
        return False


def _parse_json(text: str) -> Optional[dict]:
    try:
        data = json.loads(text or "")
    except (json.JSONDecodeError, TypeError):
        m = re.search(r"\{.*\}", text or "", re.DOTALL)
        if not m:
            return None
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return None
    return data if isinstance(data, dict) else None


async def _ask_model(db: Session, learner: Learner, system: str, user: str,
                     max_tokens: int) -> Optional[_Reply]:
    """One metered JSON call. None when no usable answer came back.

    The worst case is reserved before the call, so the budget holds while
    calls are in flight; afterwards the reservation is settled to the tokens
    the call was billed for (zero when the vendor answered with an error).
    """
    if not available():
        return None
    # Characters are an upper bound on prompt tokens (probe 2026-10-02: 52
    # tokens for about 200 characters).
    reserve = gemini_cost_inr(len(system) + len(user), max_tokens)
    try:
        check_and_consume(db, learner, GEMINI_KIND, reserve, surface="verse")
    except QuotaExceeded as exc:
        logger.info("Gemini limit reached (%s), verse answer falls back", exc.kind)
        return None

    provider = _get_provider()
    try:
        resp: LLMResponse = await provider.complete(
            system, user, temperature=0.2, max_tokens=max_tokens, json_mode=True,
        )
    except Exception as exc:  # noqa: BLE001 — never take the request down
        logger.warning("verse model call failed: %s", exc)
        refund_quota(db, learner, GEMINI_KIND, reserve, surface="verse", reason="downstream_failure")
        return None
    settle_quota(db, learner, GEMINI_KIND, reserve,
                 gemini_cost_inr(resp.prompt_tokens, resp.completion_tokens), surface="verse")
    if not resp.ok:
        logger.warning("verse model response not ok on %s: %s", provider.label, resp.error or "empty")
        return None
    logger.info("verse model answered in %d ms on %s (%d+%d tok)",
                resp.latency_ms, provider.label, resp.prompt_tokens, resp.completion_tokens)
    return _Reply(_parse_json(resp.text), provider.label)


def _verse_lines(text: str, verse: Optional[Shloka], meaning: str = "") -> list[str]:
    parts = [f"Verse: {text}"]
    if meaning:
        parts.append(f"AUTHORED MEANING: {meaning}")
    glosses = _glosses(verse)
    if glosses:
        parts.append("WORD GLOSSES: " + "; ".join(f"{w} = {m}" for w, m in glosses))
    return parts


# ── what callers use ─────────────────────────────────────────────────────────

def stored_meaning(db: Session, text: str, verse: Optional[Shloka], slot: str) -> Optional[dict]:
    """The meaning answer already held for this verse, or None. No model."""
    hit = load_answer(db, text, MEANING_Q, slot)
    if hit is not None:
        return hit
    return stored_card(verse, slot) if verse is not None else None


async def write_study(db: Session, learner: Learner, text: str,
                      verse: Optional[Shloka]) -> Optional[dict[str, dict]]:
    """Have the model write the study for a verse, and keep it.

    Returns the stored payloads by slot ("en", "hi"), or None when no call
    could be made or it failed. Fills the verse row's empty translation
    fields. A line the model cannot read is stored as such in both slots.
    """
    reply = await _ask_model(
        db, learner, _STUDY_PROMPT,
        "\n".join(_verse_lines(text, verse) + ["Write the JSON object."]),
        settings.verse_study_max_tokens,
    )
    if reply is None or reply.data is None:
        return None
    study = reply.data
    payloads = _study_payloads(study, verse, reply.provider) if study.get("clear", True) else {}
    if not payloads:
        payloads = {slot: _payload(None, _NOTHING[slot], reply.provider) for slot in ("en", "hi")}
    for slot, payload in payloads.items():
        save_answer(db, text, MEANING_Q, slot, payload, reply.provider)
    if verse is not None:
        for slot, column in (("en", "translation_en"), ("hi", "translation_hi")):
            card = (payloads.get(slot) or {}).get("card")
            if card and not (getattr(verse, column) or "").strip():
                setattr(verse, column, card["summary"])
        db.commit()
    return payloads


async def meaning_answer(db: Session, learner: Learner, text: str,
                         verse: Optional[Shloka], slot: str) -> Optional[dict]:
    """"What does this verse mean?" in English or Hindi: the database first,
    the model only when the database has nothing. None means neither had it."""
    hit = stored_meaning(db, text, verse, slot)
    if hit is not None:
        return hit
    payloads = await write_study(db, learner, text, verse)
    if not payloads:
        return None
    return payloads.get(slot) or next(iter(payloads.values()))


async def question_answer(db: Session, learner: Learner, text: str, verse: Optional[Shloka],
                          question: str, language: str) -> Optional[dict]:
    """Any other question about a verse, or the meaning in a third language:
    the stored row first, else one model call, stored. ``question`` is the
    key as the caller normalised it (``MEANING_Q`` for the meaning)."""
    hit = load_answer(db, text, question, language)
    if hit is not None:
        return hit

    authored = ""
    if verse is not None:
        authored = " / ".join(
            m for m in ((verse.translation_en or "").strip(), (verse.translation_hi or "").strip()) if m
        )
    if not authored:
        known = load_answer(db, text, MEANING_Q, "en") or {}
        authored = ((known.get("card") or {}).get("summary") or "").strip()
    asked = "What does this verse mean?" if question == MEANING_Q else question
    reply = await _ask_model(
        db, learner, _CARD_PROMPT,
        "\n".join(_verse_lines(text, verse, authored) + [
            f"Learner asked: {asked}",
            "Answer as one JSON object.",
            # Last line, so the language order sits closest to the model's turn.
            f"Write your entire answer in {language}.",
        ]),
        settings.verse_explain_max_tokens,
    )
    if reply is None or reply.data is None:
        return None
    raw = parse_card_json(json.dumps(reply.data, ensure_ascii=False))
    if raw is None:
        return None
    clipped = clip_card(raw)
    if not clipped.get("summary"):
        return None
    card = _card(clipped["title"], clipped["summary"], clipped["sections"], clipped["terms"])
    payload = _payload(card, flatten_card(card) or clipped["summary"], reply.provider)
    save_answer(db, text, question, language, payload, reply.provider)
    return payload
