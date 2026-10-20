"""Pre-rendered audio for the story course.

Which Sanskrit strings get a recorded clip, what the voice is asked to read, the
content-hash file name of each clip, and the deliveries file the pack reads.

* A clip is named by what it says and how it was made: ``clip_key`` hashes the
  NFC text, voice, language, pace and codec. Change a sentence and it gets a new
  name; an old clip can never be played for the wrong words, and a re-render in
  another voice sits beside the first.
* ``content/audio/deliveries.json`` lists the clips that exist in R2. The pack
  attaches ``audio`` (text → url) to each lesson and ``audio`` (urls, reading
  order) to each card only for clips listed there: no delivery, no speaker.
* ``collect`` orders the strings by teaching value (letters, dialogue, sentences,
  words, table cells) so a run that stops early has done the most useful clips.

Rendering lives in ``scripts/render_story_audio.py``.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable

VOICE = "aditya"
MODEL = "bulbul:v3"
LANGUAGE = "sa-IN"
PACE = 1.0
SAMPLE_RATE = 22050
CODEC = "mp3"
#: Bumped when ``speakable`` changes what the voice is asked to read.
RULES = "v1"
STORAGE_PREFIX = "learn"  # R2 key: audio/learn/<key>.mp3
DELIVERIES_PATH = Path(__file__).with_name("content") / "audio" / "deliveries.json"

TIERS = ("letter", "dialogue", "sentence", "word", "cell")

# Written as escapes: NFC normalisation would split the precomposed letters (U+0958..U+095F) inside a literal range.
_DEVANAGARI_LETTER = re.compile(r"[\u0904-\u0939\u0950\u0958-\u0961\u0972-\u097f]")  # letters, not signs
_UNSPEAKABLE = re.compile(r"[A-Za-z0-9\u2260]")
_MARKS = re.compile(r"[\u0900-\u0903\u093a-\u094f\u0951-\u0957\u0962\u0963]")  # signs, virama, accents: not an akshara of their own


def norm(text: str) -> str:
    """The string a clip is filed under: NFC, one space between words."""
    return " ".join(unicodedata.normalize("NFC", text).split())


def aksharas(text: str) -> int:
    """Base letters in a string (signs and the virama do not count)."""
    return sum(1 for ch in norm(text) if not ch.isspace() and not _MARKS.match(ch))


def speakable(text: str) -> str:
    """What the voice reads. Separators the page uses become a pause (a comma);
    suffix hyphens, ellipses and line breaks are dropped."""
    s = norm(text).replace("…", " ").replace("...", " ")
    for sep in (" + ", "+", " = ", "=", " → ", "→", " · ", "·", " / ", "/"):
        s = s.replace(sep, ", ")
    s = s.replace("-", "")
    s = re.sub(r"\s*,\s*(,\s*)+", ", ", s)
    s = re.sub(r"\s+", " ", s).strip(" ,")
    return s


def is_speakable(text: str) -> bool:
    """Devanagari to read aloud: not Roman letters, digits or a symbol-only string."""
    s = norm(text)
    return bool(_DEVANAGARI_LETTER.search(s)) and not _UNSPEAKABLE.search(s)


def clip_key(text: str, *, voice: str = VOICE, language: str = LANGUAGE, pace: float = PACE, codec: str = CODEC) -> str:
    raw = "|".join((RULES, norm(text), voice, language, f"{pace:g}", codec))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def storage_path(key: str, codec: str = CODEC) -> str:
    return f"{STORAGE_PREFIX}/{key}.{codec}"


# ─── What each card lets the learner hear ───────────────────────────────────

def _sa(node: Any) -> str | None:
    return node.get("sa") if isinstance(node, dict) and isinstance(node.get("sa"), str) else None


def _example_texts(example: dict | None) -> Iterable[tuple[str, str]]:
    if not isinstance(example, dict):
        return
    if _sa(example):
        yield "sentence", example["sa"]
    for word in example.get("words") or []:
        if _sa(word):
            yield "word", word["sa"]


def visual_sources(node: Any) -> Iterable[tuple[str, str]]:
    """Only visible Sanskrit nodes, never claims or image briefs."""
    if isinstance(node, list):
        for value in node:
            yield from visual_sources(value)
    elif isinstance(node, dict):
        if _sa(node) and is_speakable(node["sa"]):
            yield "sentence", node["sa"]
        for key in ("items", "rows", "words"):
            yield from visual_sources(node.get(key))


def card_sources(card: dict) -> list[tuple[str, str]]:
    """``(kind, text)`` for every Sanskrit string on a card that has a speaker
    (or, in a table, a tap target), in reading order. Practice cards have none:
    hearing an answer would give it away."""
    out: list[tuple[str, str]] = []
    kind = card.get("kind")
    if kind == "story":
        for line in card.get("lines") or []:
            if _sa(line):
                out.append(("dialogue", line["sa"]))
        quote = card.get("quote")
        if _sa(quote):
            out.append(("dialogue", quote["sa"]))
    elif kind == "reading":
        for line in card.get("passage") or []:
            if _sa(line):
                out.append(("sentence", line["sa"]))
            out.extend(("word", w["sa"]) for w in line.get("words") or [] if _sa(w))
    elif kind == "teach":
        term = card.get("term")
        if _sa(term):
            out.append(("word", term["sa"]))
        out.extend(("word", r["sa"]) for r in card.get("rows") or [] if _sa(r))
        out.extend(("word", s["sa"]) for s in card.get("steps") or [] if _sa(s))
        for example in card.get("examples") or []:
            out.extend(_example_texts(example))
    elif kind == "summary":
        out.extend(("sentence", p["sa"]) for p in card.get("points") or [] if _sa(p))
    elif kind == "table":
        for row in card.get("rows") or []:
            out.extend(("cell", c["sa"]) for c in row if _sa(c))
    elif kind == "revision":
        for row in card.get("rows") or []:
            out.extend(_example_texts(row.get("example")))
    elif kind == "explore" and card.get("widget") == "mouth_map":
        out.extend(("letter", x) for x in (card.get("params") or {}).get("letters") or [] if isinstance(x, str))
    if kind != "practice":
        out.extend(visual_sources(card.get("visuals")))
        if kind == "revision":
            for row in card.get("rows") or []:
                out.extend(visual_sources(row.get("visuals")))
    return [(k, t) for k, t in out if is_speakable(t)]


def card_texts(card: dict) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for _kind, text in card_sources(card):
        n = norm(text)
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def tier_of(kind: str, text: str) -> str:
    return "letter" if aksharas(text) <= 1 else kind


def collect(lessons: dict[str, dict]) -> list[dict]:
    """Every string to render, once, best tier first: ``{text, speak, tier, first}``.
    A string found in several places takes its best tier and first lesson."""
    best: dict[str, dict] = {}
    for lesson_id, lesson in lessons.items():
        for card in lesson["cards"]:
            for kind, text in card_sources(card):
                n = norm(text)
                tier = tier_of(kind, n)
                have = best.get(n)
                if have is None:
                    best[n] = {"text": n, "speak": speakable(n), "tier": tier, "first": lesson_id}
                elif TIERS.index(tier) < TIERS.index(have["tier"]):
                    have["tier"] = tier
    items = [v for v in best.values() if v["speak"]]
    items.sort(key=lambda v: TIERS.index(v["tier"]))  # stable: first-seen order inside a tier
    return items


# ─── Deliveries ─────────────────────────────────────────────────────────────

def load_deliveries(path: Path = DELIVERIES_PATH) -> dict[str, dict]:
    """key → ``{text, url, bytes, seconds, ...}``; an absent or unreadable file means no audio yet."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    clips = raw.get("clips") if isinstance(raw, dict) else None
    return clips if isinstance(clips, dict) else {}


def write_deliveries(clips: dict[str, dict], path: Path = DELIVERIES_PATH) -> None:
    """Atomic: a run killed mid-write keeps the previous file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    body = {"voice": VOICE, "model": MODEL, "language": LANGUAGE, "pace": PACE, "codec": CODEC, "rules": RULES,
            "clips": dict(sorted(clips.items()))}
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(body, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(path)


def attach(cards: list[dict], clips: dict[str, dict]) -> dict[str, str]:
    """Put ``audio`` (urls, reading order) on each card that has clips and return
    the lesson's text → url map. Mutates ``cards``; returns {} when nothing is delivered."""
    lesson_map: dict[str, str] = {}
    if not clips:
        return lesson_map
    for card in cards:
        urls: list[str] = []
        for text in card_texts(card):
            clip = clips.get(clip_key(text))
            if clip and clip.get("url"):
                lesson_map[text] = clip["url"]
                if clip["url"] not in urls:
                    urls.append(clip["url"])
        if urls:
            card["audio"] = urls
        # Feedback audio must not enter the pre-answer autoplay queue.
        for _kind, text in visual_sources(card.get("feedback_visuals")):
            clip = clips.get(clip_key(norm(text)))
            if clip and clip.get("url"):
                lesson_map[norm(text)] = clip["url"]
    return lesson_map


# ─── MP3 length without a library ───────────────────────────────────────────

_MP3_RATES = {  # (version, layer) → kbps by index; MPEG-1 layer III and MPEG-2/2.5 layer III
    (1, 3): (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0),
    (2, 3): (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0),
}
_MP3_HZ = {1: (44100, 48000, 32000), 2: (22050, 24000, 16000), 25: (11025, 12000, 8000)}


def mp3_seconds(data: bytes) -> float | None:
    """Length of an MP3 from its first frame: a Xing/Info frame count when there is
    one, else the byte count at the constant bit rate. None when it is not an MP3."""
    i = 0
    if data[:3] == b"ID3" and len(data) > 10:  # skip a leading ID3v2 tag
        i = 10 + ((data[6] & 0x7F) << 21 | (data[7] & 0x7F) << 14 | (data[8] & 0x7F) << 7 | (data[9] & 0x7F))
    while i + 4 <= len(data):
        if data[i] == 0xFF and (data[i + 1] & 0xE0) == 0xE0:
            v = (data[i + 1] >> 3) & 3
            layer = (data[i + 1] >> 1) & 3
            version = {3: 1, 2: 2, 0: 25}.get(v)
            br_i, sr_i = (data[i + 2] >> 4) & 15, (data[i + 2] >> 2) & 3
            if version and layer == 1 and sr_i < 3 and br_i not in (0, 15):
                rates = _MP3_RATES.get((1 if version == 1 else 2, 3))
                hz = _MP3_HZ[version][sr_i]
                per_frame = 1152 if version == 1 else 576
                kbps = rates[br_i]
                for tag in (b"Xing", b"Info"):
                    at = data.find(tag, i, i + 48)
                    if at > 0 and at + 12 <= len(data) and data[at + 7] & 1:
                        frames = int.from_bytes(data[at + 8:at + 12], "big")
                        if frames:
                            return frames * per_frame / hz
                return (len(data) - i) * 8 / (kbps * 1000)
        i += 1
    return None
