"""Ask mode: the explainer behind Talk's Ask switch and the Ask bubble.

Owner instructions, 2026-10-04 and 05: Talk's conversation tutor stays as it
is; a switch beside it opens an explainer for everything else a learner asks
(kundli and nakshatra, Ayurveda for a cold, which text says what to do when
sad, dharma, puja vidhi, yoga, maths and astronomy in the texts, cosmology).
"Let kundali go to any extent." Answers may draw on the internet, not only
the books the app holds; "we explain them well."

Why Gemini and not Sarvam: on 2026-10-02 the word-origin bench asked each
model for 16 Gītā and Bhāgavata quotations; sarvam-105b-conversations got 12
wrong (all 8 Bhāgavata ones), Gemini 3.8 Flash got all 16 right
(backend/results/word_origins_bench/merged.json, task c). This module is on
the Gemini budget (services/quota.py, kind ``gemini_inr``, worst case
reserved, settled to the billed tokens). With no Gemini, the old Sarvam card
answers instead (routers/ask.py, routers/explain.py).

What keeps an answer honest is not this prompt alone:

* dates, tithis, nakshatras and festival days come from code as FACTS
  (services/ask_facts.py);
* every planetary position, sign, house and dasha comes from code as a
  CHART (services/kundli.py);
* every verse and link the model names is checked by code before anyone
  sees it, and dropped if it fails (services/ask_sources.py).

The thread's history lives on the phone and is sent with each question; the
server keeps no thread. Questions are never logged.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.evals.providers import LLMResponse, build_provider
from app.models import Learner
from app.services.explainer import strip_dashes
from app.services.iast import to_iast
from app.services.quota import (
    GEMINI_KIND,
    QuotaExceeded,
    check_and_consume,
    gemini_cost_inr,
    refund_quota,
    settle_quota,
)

logger = logging.getLogger("shabd.ask_live")

SYSTEM_PROMPT = """You are the guide in Ask mode of Sanskritam, an app that \
teaches Sanskrit and the knowledge written in it. A learner asks you anything \
about India's traditions of knowledge and practice. Answer fully, clearly and \
warmly, the way a learned teacher who loves the subject explains it to a \
curious student.

WHAT YOU ANSWER
- Sanskrit and its texts: the Vedas, Upanishads, Puranas, Ramayana, \
Mahabharata, Gita, smritis, darshanas and stotras.
- Dharma, philosophy and how to live: duty, karma, the self, ethics, and \
what the texts teach about sadness, fear, anger, joy and grief.
- Festivals, vratas and puja vidhi: when (from FACTS), the samagri, the \
preparation, the sankalpa, every step in order, the mantras, aarti, prasad, \
and regional differences.
- Jyotisha: nakshatras, rashis, grahas, kundli reading and predictions, \
muhurta and remedies.
- Ayurveda: food, drinks, daily and seasonal routine, home remedies for \
common complaints.
- Yoga: asanas and pranayama step by step, with the breath, the count, how \
long to hold, and who should not do them.
- Astronomy, cosmology and time in Indian texts: the Surya Siddhanta, the \
Aryabhatiya, the Puranic universe (brahmanda, lokas), yugas and kalpas, and \
how they compare with modern astronomy.
- Mathematics in Indian texts: the Shulba Sutras, Pingala, Aryabhata, \
Brahmagupta, Bhaskara, the Kerala school, and Vedic Mathematics methods, \
with worked examples.
- Stories, deities, temples, and the history of these ideas.
Anything else (news, politics, comparing or ranking religions, coding, adult \
content, anything harmful) gets one kind sentence in "summary" saying what \
you can help with, and nothing more.

BE TRUE
- Say where an idea comes from: name the text, with chapter and verse when \
you are sure of them, or the teacher or tradition.
- When the texts do not say what a question assumes, say so kindly and show \
where the idea really appears.
- When traditions or regions differ, say so briefly and give the most common \
practice.
- Be honest about what a practice can and cannot do. Never promise a result \
a body cannot give, such as more height after growth has stopped.
- Never invent a verse, a reference, a date or a web address.

FACTS AND CHART
- FACTS and CHART, when given, were calculated by the app. Use them exactly. \
Never state a date, tithi, nakshatra, time, planetary position, sign, house \
or dasha that is not in them, and never work one out yourself.
- If the question needs a date that FACTS do not have, say you cannot \
calculate that yet.
- If the question is about the learner's own kundli, rashi, nakshatra, \
dasha, dosha or future and there is no CHART, set "needs_birth" to true and \
say in "summary" that you need their date, time and place of birth. Explain \
the general idea in the sections.
- With a CHART, read it the Parashari way: the lagna, the Moon, the houses \
and their lords, dignities, yogas, the running dasha and today's transits, \
then what the tradition says about what was asked. Be specific to this \
chart. Answer whatever is asked of it, including health, longevity, \
marriage, children, money and the timing of events, plainly, as the \
tradition reads it, and give the remedies the tradition gives (mantra, \
dana, fasting, worship).
- If the question is about matching the learner with someone (kundli milan, \
gun milan, marriage compatibility) and there is no MATCH, set \
"needs_partner" to true and say in "summary" that you need both people's \
date, time and place of birth. Explain the method in the sections.
- With a MATCH, use its points exactly. Explain what each koota found, the \
total, any Nadi or Bhakoot dosha and Manglik on either side, what the \
tradition says can cancel or lessen them, and the remedies it gives. Answer \
plainly what the match means for the marriage as the tradition reads it.

HEALTH, YOGA AND FEELINGS
- Be practical and specific: which foods, drinks and preparations, how to \
make them, how much and when to take them, which asanas and exactly how to \
do them.
- Never tell anyone to stop, delay or replace a treatment a doctor has given \
them; the tradition's remedies go alongside it.
- When someone shares sadness, fear, anger or grief, answer with warmth \
first, then what the texts teach, then one simple practice.
- If someone says they want to die or to hurt themselves, answer that first \
and most warmly: ask them gently not to do it, tell them their life matters, \
and show them the beauty and worth of life as the texts see it (a human \
birth is rare and precious, sorrow passes, the self within is untouched by \
it), and ask them to talk today to someone close to them. Keep it personal \
and kind.

VERSES AND SOURCES
- "verses": up to 3 verses or mantras quoted from a named text, only ones you \
know word for word. "sa" is the verse in Devanagari exactly as the text has \
it. "ref" is the text's usual name in roman letters with the verse number, \
whatever the answer language: "Bhagavad Gita 2.47", "Rigveda 10.191.4", \
"Katha Upanishad 1.2.23", "Yoga Sutra 1.2". "meaning" gives it in the answer \
language. "url": leave it "" unless you are certain of the exact page; the \
app finds the text itself. The app checks every verse against the text and \
removes any it cannot find there.
- A short standard mantra of one line (such as ॐ नमः शिवाय) may stand inside a \
step. Anything longer goes in "verses".
- "sources": up to 2 pages on trusted sites (a text library, a university, a \
government body, a scholarly publisher) that support the answer, only \
addresses you are certain exist, else none. Never Wikipedia, blogs or \
forums. The app opens each one and removes any that do not open.

SHAPE
- Every field in the language the final instruction names. Sanskrit stays in \
Devanagari. Do not transliterate: the app adds the roman.
- "title": at most 8 words. "title_sa": the topic's Sanskrit name in \
Devanagari, or "".
- "summary": the direct answer in one to three sentences.
- "sections": up to 6, each a short "heading" and up to 8 "items". "style" \
is "steps" for anything done in order (a puja, an asana, a recipe, a worked \
sum), "bullets" for a list, "text" for short paragraphs. An item is one to \
three sentences.
- Maths in plain text: 23 × 47 = 1081, x² + 5x + 6 = 0. No LaTeX.
- "terms": up to 6 Sanskrit words the answer uses, in Devanagari, each with a \
short meaning.
- "follow_ups": up to 3 short questions the learner might ask next, in the \
answer language.
- No markdown, no asterisks, no em dashes.

Return ONLY this JSON object:
{"title": "", "title_sa": "", "summary": "", "sections": [{"heading": "", \
"style": "steps", "items": [""]}], "verses": [{"sa": "", "ref": "", \
"meaning": "", "url": ""}], "terms": [{"sa": "", "meaning": ""}], \
"sources": [{"title": "", "url": ""}], "follow_ups": [""], \
"needs_birth": false, "needs_partner": false}"""


# ── the model ─────────────────────────────────────────────────────────────

_provider = None
_provider_ref = ""


def _get_provider():
    global _provider, _provider_ref
    ref = settings.ask_live_provider
    if _provider is None or ref != _provider_ref:
        _provider = build_provider(ref, timeout=settings.ask_live_timeout_s)
        _provider_ref = ref
    return _provider


def available() -> bool:
    """True when a Gemini answer can plausibly be had right now."""
    if not settings.ask_live_enabled:
        return False
    name = settings.ask_live_provider.partition(":")[0].strip().lower()
    # Billed to the Gemini budget, so only Google-billed routes.
    if name not in ("vertex", "gemini", "openrouter"):
        return False
    try:
        return _get_provider().configured
    except ValueError:
        return False


def provider_label() -> str:
    try:
        return _get_provider().label
    except Exception:  # noqa: BLE001 — diagnostic only
        return ""


def _parse(text: str) -> Optional[dict]:
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


def user_message(
    question: str,
    language: str,
    *,
    history: list[tuple[str, str]] = (),
    facts: str = "",
    chart: str = "",
    match: str = "",
    screen_text: str = "",
) -> str:
    parts: list[str] = []
    turns = list(history)[-settings.ask_history_turns:]
    if turns:
        parts.append("EARLIER IN THIS CONVERSATION (context only; answer the new question):")
        for q, a in turns:
            parts.append(f"Q: {q.strip()[:600]}")
            parts.append(f"A: {a.strip()[:900]}")
    if facts:
        parts.append(facts)
    if chart:
        parts.append(chart)
    if match:
        parts.append(match)
    if screen_text:
        parts.append(f"Text on the learner's screen (read on the phone, may be partial): {screen_text[:1500]}")
    parts.append(f"Learner asks: {question.strip()}")
    parts.append("Answer as one JSON object.")
    # Last, so the language order sits closest to the model's turn.
    parts.append(f"Write every field in {language}.")
    return "\n".join(parts)


async def ask(
    db: Session,
    learner: Learner,
    question: str,
    language: str,
    *,
    history: list[tuple[str, str]] = (),
    facts: str = "",
    chart: str = "",
    match: str = "",
    screen_text: str = "",
    surface: str = "ask",
) -> Optional[tuple[dict, str]]:
    """One metered Gemini answer as (raw JSON dict, provider label), or None
    when no usable answer came back (no credentials, budget spent, call
    failed, JSON unreadable). Never raises."""
    if not available():
        return None
    user = user_message(question, language, history=history, facts=facts,
                        chart=chart, match=match, screen_text=screen_text)
    max_tokens = settings.ask_live_max_tokens
    reserve = _reserve(db, learner, user, max_tokens, surface)
    if reserve is None:
        return None

    provider = _get_provider()
    try:
        resp: LLMResponse = await provider.complete(
            SYSTEM_PROMPT, user, temperature=0.4, max_tokens=max_tokens, json_mode=True,
        )
    except Exception as exc:  # noqa: BLE001 — never take the request down
        logger.warning("ask model call failed: %s", type(exc).__name__)
        refund_quota(db, learner, GEMINI_KIND, reserve, surface=surface, reason="downstream_failure")
        return None
    settle_quota(db, learner, GEMINI_KIND, reserve,
                 gemini_cost_inr(resp.prompt_tokens, resp.completion_tokens), surface=surface)
    if not resp.ok:
        logger.warning("ask model not ok on %s: %s", provider.label, (resp.error or "empty")[:200])
        return None
    data = _parse(resp.text)
    logger.info("ask answered in %d ms on %s (%d+%d tok, json=%s)", resp.latency_ms,
                provider.label, resp.prompt_tokens, resp.completion_tokens, data is not None)
    if data is None:
        return None
    return data, provider.label



def _reserve(db: Session, learner: Learner, user: str, max_tokens: int, surface: str) -> Optional[float]:
    """Reserve the worst case on the Gemini budget; None when it is spent."""
    # Characters are an upper bound on tokens (verse_study measured ~4 to 1).
    reserve = gemini_cost_inr(len(SYSTEM_PROMPT) + len(user), max_tokens)
    try:
        check_and_consume(db, learner, GEMINI_KIND, reserve, surface=surface)
    except QuotaExceeded as exc:
        logger.info("Gemini limit reached (%s); Ask falls back", exc.kind)
        return None
    return reserve


# How often a growing answer is re-read and sent on, at most.
_PARTIAL_EVERY_S = 0.25


async def ask_stream(
    db: Session,
    learner: Learner,
    question: str,
    language: str,
    *,
    history: list[tuple[str, str]] = (),
    facts: str = "",
    chart: str = "",
    match: str = "",
    surface: str = "ask",
):
    """The same answer as ``ask``, while it is written.

    Yields ``{"type": "partial", "card": ...}`` as the answer grows (title,
    summary and sections only: verses and links are shown only after they
    are checked), then one ``{"type": "done", "data": raw JSON, "provider":
    label}``. Yields nothing more when there is no usable answer, and never
    raises. A provider without ``stream`` (tests, other vendors) answers in
    one piece.
    """
    if not available():
        return
    user = user_message(question, language, history=history, facts=facts, chart=chart, match=match)
    max_tokens = settings.ask_live_max_tokens
    reserve = _reserve(db, learner, user, max_tokens, surface)
    if reserve is None:
        return
    provider = _get_provider()
    streamer = getattr(provider, "stream", None)
    if streamer is None:
        try:
            resp: LLMResponse = await provider.complete(
                SYSTEM_PROMPT, user, temperature=0.4, max_tokens=max_tokens, json_mode=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("ask model call failed: %s", type(exc).__name__)
            refund_quota(db, learner, GEMINI_KIND, reserve, surface=surface, reason="downstream_failure")
            return
        settle_quota(db, learner, GEMINI_KIND, reserve,
                     gemini_cost_inr(resp.prompt_tokens, resp.completion_tokens), surface=surface)
        data = _parse(resp.text) if resp.ok else None
        if data is not None:
            yield {"type": "done", "data": data, "provider": provider.label}
        return

    usage: dict = {}
    text = ""
    settled = False
    failed = False
    started = time.perf_counter()
    first_ms = 0.0
    last_sent = 0.0
    last_card: Optional[dict] = None
    try:
        async for piece in streamer(SYSTEM_PROMPT, user, temperature=0.4, max_tokens=max_tokens,
                                    json_mode=True, usage=usage):
            if not text:
                first_ms = (time.perf_counter() - started) * 1000
            text += piece
            now = time.perf_counter()
            if now - last_sent >= _PARTIAL_EVERY_S:
                card = partial_card(text)
                if card is not None and card != last_card:
                    last_card, last_sent = card, now
                    yield {"type": "partial", "card": card}
    except Exception as exc:  # noqa: BLE001 — a broken stream ends the answer, not the request
        logger.warning("ask stream failed: %s", type(exc).__name__)
        failed = True
        if not usage:
            refund_quota(db, learner, GEMINI_KIND, reserve, surface=surface, reason="downstream_failure")
            settled = True
    finally:
        # Also runs when the phone hangs up mid-answer: settle to what was
        # billed, or keep the worst-case reservation when nothing was counted.
        if not settled and usage:
            settle_quota(db, learner, GEMINI_KIND, reserve,
                         gemini_cost_inr(usage.get("prompt_tokens", 0), usage.get("output_tokens", 0)),
                         surface=surface)
    if failed:
        return
    data = _parse(text)
    logger.info("ask streamed: first piece %.0f ms, all %.0f ms on %s (%s+%s tok, json=%s)",
                first_ms, (time.perf_counter() - started) * 1000, provider.label,
                usage.get("prompt_tokens", "?"), usage.get("output_tokens", "?"), data is not None)
    if data is not None:
        yield {"type": "done", "data": data, "provider": provider.label}


# A literal or number cut short at the end ("tr", "fals", "1.") is dropped.
_CUT_LITERAL = re.compile(r"(?<=[:\[,])\s*(?:t(?:ru?)?|f(?:a(?:ls?)?)?|n(?:ul?)?|-?\d*\.?)$")


def repair_json(prefix: str) -> Optional[dict]:
    """The object a JSON prefix has written so far, or None.

    Closes an open string, drops a key that has no value yet (or one cut in
    half), drops a cut literal, and closes every open array and object. Used
    only to show an answer while it is still being written.
    """
    stack: list[list] = []          # ["{", expecting_key] or ["[", False]
    in_str = esc = is_key = False
    key_start = -1
    after_key = False               # a key closed, its ":" not yet seen
    for i, ch in enumerate(prefix):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
                if is_key:
                    after_key = True
            continue
        if ch == '"':
            in_str = True
            is_key = bool(stack) and stack[-1][0] == "{" and stack[-1][1]
            if is_key:
                key_start = i
        elif ch == "{":
            stack.append(["{", True])
        elif ch == "[":
            stack.append(["[", False])
        elif ch in "}]":
            if stack:
                stack.pop()
        elif ch == ":":
            after_key = False
            if stack and stack[-1][0] == "{":
                stack[-1][1] = False
        elif ch == ",":
            if stack and stack[-1][0] == "{":
                stack[-1][1] = True
    text = prefix
    if (in_str and is_key) or after_key:
        text = text[:key_start]
    elif in_str:
        if esc:
            text = text[:-1]
        text += '"'
    text = _CUT_LITERAL.sub("", text.rstrip()).rstrip()
    if text.endswith(":"):
        text += " null"
    if text.endswith(","):
        text = text[:-1]
    closing = "".join("}" if kind == "{" else "]" for kind, _ in reversed(stack))
    try:
        data = json.loads(text + closing)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def partial_card(text: str) -> Optional[dict]:
    """What may be shown of an answer still being written: no verses, words
    or links yet (those are checked first), and no empty card."""
    raw = repair_json(text)
    if not raw:
        return None
    card = clip({k: raw[k] for k in ("title", "title_sa", "summary", "sections") if k in raw})
    if not (card["title"] or card["summary"]):
        return None
    return {k: card[k] for k in ("title", "title_sa", "title_iast", "summary", "sections")}

# ── the card ──────────────────────────────────────────────────────────────

_DEVA_RUN = re.compile("^[ऀ-ॿ᳐-᳿ ]+$")
_DEVANAGARI = re.compile("[ऀ-ॿ]")
# Markdown the model emits anyway. Single * and _ stay: they can be maths.
_MD = re.compile(r"\*\*|__|`+")
_HEAD = re.compile(r"^\s*#{1,6}\s*", re.M)
_BULLET = re.compile(r"^\s*(?:[-•▪]|\d+[.)])\s+")


def _text(value: object, words: int = 0) -> str:
    t = _HEAD.sub("", _MD.sub("", str(value or "")))
    t = re.sub(r"\s+", " ", strip_dashes(t)).strip()
    if words and len(t.split()) > words:
        t = " ".join(t.split()[:words]).rstrip(",;:") + "…"
    return t


def _roman(sa: str) -> str:
    try:
        return to_iast(sa)
    except Exception:  # noqa: BLE001 — a word without roman is still shown
        return ""


def clip(raw: dict) -> dict:
    """Hold the model's JSON to the card shape the app renders."""
    title_sa = _text(raw.get("title_sa"))
    if title_sa and not _DEVA_RUN.match(title_sa):
        title_sa = ""

    sections = []
    for s in (raw.get("sections") or [])[:6]:
        if not isinstance(s, dict):
            continue
        style = str(s.get("style") or "bullets").strip().lower()
        if style not in ("steps", "bullets", "text"):
            style = "bullets"
        items = [_text(_BULLET.sub("", str(i or "")), 90) for i in (s.get("items") or [])[:8]]
        items = [i for i in items if i]
        heading = _text(s.get("heading"), 12)
        if heading or items:
            sections.append({"heading": heading, "style": style, "items": items})

    verses = []
    for v in (raw.get("verses") or [])[:3]:
        if not isinstance(v, dict):
            continue
        sa = re.sub(r"[ \t]+", " ", str(v.get("sa") or "")).strip()
        # A verse with a roman word inside is corrupt: on 2026-10-05 the
        # model put "Broadway" in the middle of a Shulba Sutra line.
        if not _DEVANAGARI.search(sa) or re.search(r"[A-Za-z]", sa) or len(sa) > 600:
            continue
        verses.append({
            "sa": sa,
            "iast": _roman(sa),
            "ref": _text(v.get("ref"), 16),
            "meaning": _text(v.get("meaning"), 120),
            "url": str(v.get("url") or "").strip()[:500],
        })

    terms = []
    for t in (raw.get("terms") or [])[:6]:
        if not isinstance(t, dict):
            continue
        sa = _text(t.get("sa"))
        meaning = _text(t.get("meaning"), 20)
        if sa and meaning and _DEVA_RUN.match(sa):
            terms.append({"sa": sa, "iast": _roman(sa), "meaning": meaning})

    sources = []
    for s in (raw.get("sources") or [])[:4]:
        if isinstance(s, dict) and str(s.get("url") or "").strip():
            sources.append({"title": _text(s.get("title"), 16), "url": str(s["url"]).strip()[:500]})

    follow_ups = [_text(f, 18) for f in (raw.get("follow_ups") or [])[:3] if isinstance(f, str)]

    return {
        "title": _text(raw.get("title"), 10),
        "title_sa": title_sa,
        "title_iast": _roman(title_sa) if title_sa else "",
        "when": {"text": "", "note": ""},
        "summary": _text(raw.get("summary"), 120),
        "sections": sections,
        "verses": verses,
        "terms": terms,
        "sources": sources,
        "caution": _text(raw.get("caution"), 50),
        "follow_ups": [f for f in follow_ups if f],
        "place_needed": False,
        "needs_birth": bool(raw.get("needs_birth")),
        "needs_partner": bool(raw.get("needs_partner")),
    }


def from_old_card(card: dict) -> dict:
    """The Sarvam card (services/explainer.clip_card) in this shape."""
    out = clip({**card, "verses": [], "sources": [], "follow_ups": []})
    out["title_iast"] = card.get("title_iast") or out["title_iast"]
    return out


def flatten(card: dict) -> str:
    """The card as plain text: the explanation field, history and read-aloud."""
    lines: list[str] = []
    if card.get("title"):
        lines.append(card["title"])
    if card.get("summary"):
        lines.append(card["summary"])
    for s in card.get("sections") or []:
        if s.get("heading"):
            lines.append(s["heading"])
        for n, item in enumerate(s.get("items") or [], 1):
            lines.append((f"{n}. " if s.get("style") == "steps" else "") + item)
    for v in card.get("verses") or []:
        lines.append(f"{v.get('sa', '')} ({v.get('ref', '')}): {v.get('meaning', '')}")
    if card.get("caution"):
        lines.append(card["caution"])
    return "\n".join(line for line in lines if line.strip())


def has_content(card: Optional[dict]) -> bool:
    return bool(card and (card.get("summary") or card.get("sections")))


# ── what may be kept and shared ───────────────────────────────────────────

# The first person singular, in English, Hindi and romanized Hindi. A
# question about the asker is never stored or served to anyone else. "We"
# and "main" stay out: "why do we light lamps" and "the main teaching" are
# questions about the world.
_PERSONAL = re.compile(
    r"\b(i|i'm|im|i've|ive|me|my|mine|myself|mera|meri|mere|mujhe|mujh|mai|apna|apni)\b"
    r"|मैं|मेरा|मेरी|मेरे|मुझे|मुझ|अपना|अपनी",
    re.I,
)


def shareable(question: str) -> bool:
    """True when an answer to this question may be stored and served to the
    next learner who asks it: short, about the world, not about the asker."""
    q = (question or "").strip()
    return 0 < len(q) <= 200 and not _PERSONAL.search(q) and not re.search(r"\d{3,}", q)


def store_key(question: str, extra: str = "") -> str:
    base = re.sub(r"\s+", " ", (question or "").strip().casefold())
    return f"{base}|{extra}" if extra else base
