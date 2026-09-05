"""Meta-intent detection: learner moves *about* the conversation, not *in* it.

"What does that mean?", "say it again", "translate that" are legitimate
beginner moves that no dialogue edge models — §12's graph answers questions,
it does not field questions about itself. Before this module every one of them
became an escape, and the learner got a repair prompt for a question they had
not asked.

Detection is deterministic and free: a phrase table over the three registers a
Sanskritam learner actually types (Devanagari Hindi, romanized Hinglish, English).
**No LLM runs here** — §12 forbids a model in the guided turn path, and the
sub-second turn is the whole point. The model comes in afterwards, off the
turn path, via services/explainer.py, and only for `explain`/`translate`.

Ordering note (see turn_loop.process_turn): meta detection runs BEFORE edge
matching. A meta move is not a move in the graph, and the bridge phrase lists
are loose enough ("no", "हाँ") to swallow one — "समझ नहीं आया" contains नहीं
and would otherwise route down the refusal edge. The caller guards the
converse case by letting an exact expected-phrase match win outright, so a
seeded reply is never read as a meta request.
"""

from __future__ import annotations

import re
from typing import Optional

# Intent → phrases. Kept deliberately specific: a phrase here outranks the
# dialogue graph, so anything that could plausibly be an ANSWER stays out.
# Bare "अर्थ"/"arth" is excluded for that reason (it is ordinary vocabulary);
# the question forms that carry it are listed instead.
_PATTERNS: dict[str, tuple[str, ...]] = {
    # "I don't follow / what does that mean" — wants the line explained.
    "explain": (
        # Devanagari
        "मतलब", "क्या अर्थ", "अर्थ क्या", "समझ नहीं आया", "समझ नहीं",
        "समझा नहीं", "नहीं समझा", "समझाओ", "समझाइए", "यह क्या है",
        # Romanized Hinglish
        "matlab", "kya arth", "arth kya", "samajh nahi aaya", "samajh nahi",
        "samjha nahi", "nahi samjha", "samjhao", "samjhaiye",
        # English
        "what does that mean", "what does this mean", "what does it mean",
        "what do you mean", "what is that", "what's that", "meaning",
        "i don't understand", "i dont understand", "don't understand",
        "dont understand", "didn't understand", "didnt understand",
        "explain", "confused", "no idea",
    ),
    # "Say that again" — wants the same node re-spoken. Answered for free by
    # replaying the node's audio; never reaches the LLM.
    "repeat": (
        "फिर से", "दोबारा", "दुबारा", "पुनः", "एक बार और",
        "phir se", "dobara", "dubara", "punah", "ek baar aur",
        "say again", "say that again", "say it again", "once more",
        "repeat", "come again", "pardon",
    ),
    # "Give me that in my language" — a translation, not an explanation.
    "translate": (
        "अनुवाद", "हिंदी में", "अंग्रेज़ी में", "अंग्रेजी में", "इंग्लिश में",
        "anuvaad", "anuvad", "hindi mein", "hindi me", "english mein",
        "english me", "angrezi mein",
        "translate", "translation", "in english", "in hindi",
    ),
}

# Longest phrase wins across intents, so "समझ नहीं आया" (explain) beats a
# bare "नहीं" and "say that again" beats "say again".
_COMPILED: list[tuple[str, str, re.Pattern[str]]] = sorted(
    (
        (intent, phrase, re.compile(rf"(?<!\w){re.escape(phrase)}(?!\w)"))
        for intent, phrases in _PATTERNS.items()
        for phrase in phrases
    ),
    key=lambda t: len(t[1]),
    reverse=True,
)

#: Intents that need a generated answer (services/explainer.py). `repeat` is
#: not here: the client already holds the node and just replays it.
LLM_BACKED = frozenset({"explain", "translate"})


def normalize(text: str) -> str:
    """Lowercase, collapse whitespace — the form the phrase table matches."""
    return " ".join((text or "").strip().lower().split())


def detect_meta_intent(transcript: str) -> Optional[str]:
    """Classify an utterance as a meta move, or None if it is a normal turn.

    Returns one of "explain", "repeat", "translate", or None. Longest matching
    phrase wins; ties fall to the first in table order.
    """
    norm = normalize(transcript)
    if not norm:
        return None
    for intent, _phrase, pattern in _COMPILED:
        if pattern.search(norm):
            return intent
    return None
