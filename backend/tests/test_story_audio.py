"""Story course audio: clip names, what is read aloud, what a card offers, the
deliveries file, the pack's `audio` fields and the renderer (with fakes: no network)."""

from __future__ import annotations

import asyncio
import base64
import unicodedata

import pytest

from app.curriculum import CONTENT_DIR, audio, build, load
from app.curriculum.pack import lesson_payload
from scripts import render_story_audio as rsa

# 7,004 bytes of 128 kbps MPEG-2 layer III: a valid-looking 0.44 s clip
FAKE_MP3 = bytes.fromhex("fff3c0c4") + bytes(7000)


# ─── Names and speech ───────────────────────────────────────────────────────

def test_clip_key_is_stable_and_ignores_unicode_form_and_spacing():
    composed, decomposed = "क़", "क़"  # क़ precomposed and as क + nukta
    assert unicodedata.normalize("NFC", composed) == unicodedata.normalize("NFC", decomposed)
    assert audio.clip_key(composed) == audio.clip_key(decomposed)
    assert audio.clip_key("रामः  वनं गच्छति") == audio.clip_key(" रामः वनं गच्छति ")
    key = audio.clip_key("अ")
    assert key == audio.clip_key("अ") and len(key) == 16 and int(key, 16) >= 0


def test_clip_key_changes_with_every_voice_setting():
    base = audio.clip_key("अ")
    assert len({base, audio.clip_key("आ"), audio.clip_key("अ", voice="ritu"), audio.clip_key("अ", pace=0.9),
                audio.clip_key("अ", language="hi-IN"), audio.clip_key("अ", codec="wav")}) == 6


@pytest.mark.parametrize("text, spoken", [
    ("तत् + अस्ति = तदस्ति।", "तत्, अस्ति, तदस्ति।"),
    ("अगमः → गमः", "अगमः, गमः"),
    ("-एत् · -एः · -एयम्", "एत्, एः, एयम्"),
    ("पठति … जानाति", "पठति जानाति"),
    ("-वत् / -मत्", "वत्, मत्"),
    ("अ + धातु + ...", "अ, धातु"),
    ("मैतां विद्याधरा\nअटव्यां", "मैतां विद्याधरा अटव्यां"),
    ("कः त्वम्?", "कः त्वम्?"),
])
def test_speakable_turns_page_separators_into_pauses(text, spoken):
    assert audio.speakable(text) == spoken


def test_only_devanagari_letters_are_read_aloud():
    for ok in ("क", "क्", "कि", "गौः", "ॐ", "रामः वनं गच्छति।", "क़"):
        assert audio.is_speakable(ok), ok
    for bad in ("ा", "ि", "ँ", "ऽ", "ā ś ṣ", "गण 1 ≠ गण 6", "", "  ", "+", "→"):
        assert not audio.is_speakable(bad), bad


def test_aksharas_counts_base_letters_not_signs():
    assert [audio.aksharas(x) for x in ("अ", "कि", "कः", "क्ष", "पठति")] == [1, 1, 1, 2, 3]


# ─── What a card offers ─────────────────────────────────────────────────────

CARDS = {
    "story": {"kind": "story", "lines": [{"sa": "कः त्वम्?"}, {"text": "no Sanskrit"}], "quote": {"sa": "धर्मो रक्षति रक्षितः।"}},
    "teach": {"kind": "teach", "term": {"sa": "स्वरः"}, "rows": [{"sa": "अ"}], "steps": [],
              "examples": [{"sa": "बालकः पठति।", "words": [{"sa": "बालकः"}, {"sa": "पठति"}]}]},
    "table": {"kind": "table", "rows": [[{"sa": "क"}, {"text": {"en": "ka"}}], [{"sa": "पठति"}]]},
    "summary": {"kind": "summary", "points": [{"sa": "अइउण्", "text": {}}, {"text": {"en": "plain"}}]},
    "reading": {"kind": "reading", "passage": [{"sa": "रामः वनं गच्छति।", "words": [{"sa": "रामः"}]}]},
    "revision": {"kind": "revision", "rows": [{"example": {"sa": "तत्र अस्ति।", "words": [{"sa": "तत्र"}]}}, {}]},
    "mouth": {"kind": "explore", "widget": "mouth_map", "params": {"letters": ["अ", "इ"]}},
    "other_widget": {"kind": "explore", "widget": "mark_words", "params": {"words": ["अग्निः"]}},
    "practice": {"kind": "practice", "mode": "choice", "options": [{"sa": "अ"}], "tiles": ["क"], "tokens": ["क"]},
}


def test_card_sources_by_kind_in_reading_order():
    src = {k: audio.card_sources(v) for k, v in CARDS.items()}
    assert src["story"] == [("dialogue", "कः त्वम्?"), ("dialogue", "धर्मो रक्षति रक्षितः।")]
    assert src["teach"] == [("word", "स्वरः"), ("word", "अ"), ("sentence", "बालकः पठति।"), ("word", "बालकः"), ("word", "पठति")]
    assert src["table"] == [("cell", "क"), ("cell", "पठति")]
    assert src["summary"] == [("sentence", "अइउण्")]
    assert src["reading"] == [("sentence", "रामः वनं गच्छति।"), ("word", "रामः")]
    assert src["revision"] == [("sentence", "तत्र अस्ति।"), ("word", "तत्र")]
    assert src["mouth"] == [("letter", "अ"), ("letter", "इ")]
    assert src["other_widget"] == [] and src["practice"] == [], "hearing an answer would give it away"


def test_collect_orders_by_tier_dedupes_and_keeps_the_first_lesson():
    lessons = {
        "a": {"cards": [CARDS["story"], {"kind": "table", "rows": [[{"sa": "पठति"}]]}]},
        "b": {"cards": [CARDS["mouth"], CARDS["table"], CARDS["teach"]]},
    }
    items = audio.collect(lessons)
    tiers = [i["tier"] for i in items]
    assert tiers == sorted(tiers, key=audio.TIERS.index), "best tier first"
    by_text = {i["text"]: i for i in items}
    assert by_text["अ"]["tier"] == "letter" and by_text["क"]["tier"] == "letter"
    assert by_text["पठति"]["tier"] == "word" and by_text["पठति"]["first"] == "a", "a cell in one lesson and a word in another: best tier, first lesson"
    assert len({i["text"] for i in items}) == len(items)
    assert by_text["कः त्वम्?"]["speak"] == "कः त्वम्?"


def test_attach_marks_only_delivered_clips():
    cards = [dict(CARDS["story"]), dict(CARDS["teach"]), {"kind": "practice", "mode": "choice"}]
    clips = {audio.clip_key("कः त्वम्?"): {"url": "https://cdn/x/q.mp3"}, audio.clip_key("बालकः"): {"url": "https://cdn/x/b.mp3"},
             audio.clip_key("पठति"): {"url": ""}}  # a delivery without a url is no delivery
    lesson_map = audio.attach(cards, clips)
    assert lesson_map == {"कः त्वम्?": "https://cdn/x/q.mp3", "बालकः": "https://cdn/x/b.mp3"}
    assert cards[0]["audio"] == ["https://cdn/x/q.mp3"] and cards[1]["audio"] == ["https://cdn/x/b.mp3"] and "audio" not in cards[2]
    again = [dict(CARDS["story"])]
    assert audio.attach(again, {}) == {} and "audio" not in again[0], "no deliveries, no audio fields"


def test_attach_lists_a_repeated_clip_once_per_card():
    card = {"kind": "teach", "rows": [{"sa": "अ"}, {"sa": "आ"}], "examples": [{"sa": "अ"}], "steps": []}
    clips = {audio.clip_key("अ"): {"url": "u/a.mp3"}, audio.clip_key("आ"): {"url": "u/aa.mp3"}}
    audio.attach([card], clips)
    assert card["audio"] == ["u/a.mp3", "u/aa.mp3"]


# ─── Deliveries file ────────────────────────────────────────────────────────

def test_deliveries_round_trip_and_bad_files_mean_no_audio(tmp_path):
    path = tmp_path / "audio" / "deliveries.json"
    assert audio.load_deliveries(path) == {}
    audio.write_deliveries({"b": {"text": "ब", "url": "u/b.mp3"}, "a": {"text": "अ", "url": "u/a.mp3"}}, path)
    assert list(audio.load_deliveries(path)) == ["a", "b"] and not path.with_suffix(".json.tmp").exists()
    for junk in ("", "not json", "[1,2]", '{"clips": 3}'):
        path.write_text(junk, encoding="utf-8")
        assert audio.load_deliveries(path) == {}


def test_mp3_seconds_reads_constant_bit_rate_and_skips_an_id3_tag():
    assert audio.mp3_seconds(bytes.fromhex("fff3c0c4") + bytes(15996)) == pytest.approx(1.0, abs=0.001)  # 16,000 bytes at 128 kbps
    tag = b"ID3\x03\x00\x00\x00\x00\x00\x0a" + bytes(10)
    assert audio.mp3_seconds(tag + bytes.fromhex("fff3c0c4") + bytes(15996)) == pytest.approx(1.0, abs=0.001)
    assert audio.mp3_seconds(b"RIFF" + bytes(100)) is None and audio.mp3_seconds(b"") is None


# ─── The pack ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def course():
    return load(CONTENT_DIR)


def test_pack_attaches_audio_only_for_delivered_clips(course):
    lesson = course.lesson("vowels.short")
    plain = lesson_payload(lesson, course)
    saved = course.audio
    try:
        course.audio = {audio.clip_key("अ"): {"url": "https://cdn.test/a.mp3"}}
        with_audio = lesson_payload(lesson, course)
    finally:
        course.audio = saved
    if not saved:
        assert "audio" not in plain and all("audio" not in c for c in plain["cards"])
    assert with_audio["audio"] == {"अ": "https://cdn.test/a.mp3"}
    assert any(c.get("audio") == ["https://cdn.test/a.mp3"] for c in with_audio["cards"])
    assert with_audio["hash"] != plain["hash"] or saved, "a lesson with new audio must change its hash so phones refetch it"


def test_loader_reads_the_deliveries_file_and_does_not_mistake_it_for_a_lesson(tmp_path):
    import shutil

    root = tmp_path / "content"
    shutil.copytree(CONTENT_DIR, root, ignore=shutil.ignore_patterns("__pycache__"))
    audio.write_deliveries({"abc": {"text": "अ", "url": "u/a.mp3"}}, root / "audio" / "deliveries.json")
    data = load(root)
    assert data.audio == {"abc": {"text": "अ", "url": "u/a.mp3"}}
    assert not [i for i in data.issues if i.level == "error"]


# ─── The renderer (fake Sarvam, fake R2) ────────────────────────────────────

class FakeClient:
    def __init__(self, behaviour=None):
        self.calls, self.behaviour = [], behaviour or (lambda n, kw: base64.b64encode(FAKE_MP3).decode())

    async def text_to_speech(self, **kw):
        self.calls.append(kw)
        return self.behaviour(len(self.calls), kw)


class FakeStorage:
    def __init__(self):
        self.stored = {}

    def store(self, data, path, content_type="audio/wav"):
        self.stored[path] = (data, content_type)
        return f"https://cdn.test/audio/{path}"


async def _no_sleep(_):
    return None


def _items(*texts):
    return [{**i, "key": audio.clip_key(i["text"])} for i in audio.collect({"x": {"cards": [{"kind": "table", "rows": [[{"sa": t} for t in texts]]}]}})]


def test_plan_skips_done_clips_and_estimate_counts_what_is_spoken():
    items = audio.collect({"x": {"cards": [CARDS["story"], CARDS["table"], CARDS["mouth"]]}})
    done = {audio.clip_key("कः त्वम्?"): {}}
    todo = rsa.plan(items, done)
    assert "कः त्वम्?" not in [t["text"] for t in todo]
    assert [t["tier"] for t in rsa.plan(items, done, tier="letter")] == ["letter"] * len(rsa.plan(items, done, tier="letter"))
    assert len(rsa.plan(items, done, limit=2)) == 2
    est = rsa.estimate(todo)
    assert est["chars"] == sum(len(t["speak"]) for t in todo) and est["cost_rs"] == round(est["chars"] * 0.003, 2)


def test_check_clip_rejects_stubs_silence_and_runaway_audio():
    assert rsa.check_clip(FAKE_MP3, "अ") is None
    assert "not an MP3" in rsa.check_clip(b"hello" * 500, "अ")
    assert "too short" in rsa.check_clip(bytes.fromhex("fff3c0c4") + bytes(100), "अ")
    assert "too long" in rsa.check_clip(bytes.fromhex("fff3c0c4") + bytes(15996) * 3, "अ")


def test_render_stores_each_clip_in_r2_and_records_it():
    items, clips, store, saves = _items("अ", "आ"), {}, FakeStorage(), []
    client = FakeClient()
    summary = asyncio.run(rsa.render(items, clips, client=client, storage=store, pace=0, sleep=_no_sleep, save=lambda c: saves.append(dict(c)), log=lambda m: None))
    assert summary["rendered"] == 2 and not summary["failures"] and not summary["stopped"]
    key = audio.clip_key("अ")
    assert store.stored[f"learn/{key}.mp3"][1] == "audio/mpeg"
    assert clips[key]["url"] == f"https://cdn.test/audio/learn/{key}.mp3" and clips[key]["text"] == "अ" and clips[key]["bytes"] == len(FAKE_MP3)
    call = client.calls[0]
    assert (call["language_code"], call["speaker"], call["model"], call["codec"], call["sample_rate"]) == ("sa-IN", "aditya", "bulbul:v3", "mp3", 22050)
    assert saves and set(saves[-1]) == {key, audio.clip_key("आ")}, "the deliveries are saved at the end"


def test_render_reads_the_speakable_form_and_files_under_the_page_text():
    items, clips = _items("तत् + अस्ति"), {}
    client = FakeClient()
    asyncio.run(rsa.render(items, clips, client=client, storage=FakeStorage(), pace=0, sleep=_no_sleep, log=lambda m: None))
    assert client.calls[0]["text"] == "तत्, अस्ति" and audio.clip_key("तत् + अस्ति") in clips


def test_render_keeps_going_past_a_bad_clip_and_never_records_it():
    def behaviour(n, kw):
        return base64.b64encode(b"junk" * 400).decode() if n == 1 else base64.b64encode(FAKE_MP3).decode()

    items, clips = _items("अ", "आ"), {}
    summary = asyncio.run(rsa.render(items, clips, client=FakeClient(behaviour), storage=FakeStorage(), pace=0, sleep=_no_sleep, log=lambda m: None))
    assert summary["rendered"] == 1 and len(summary["failures"]) == 1 and "not an MP3" in summary["failures"][0][1]
    assert audio.clip_key("अ") not in clips and audio.clip_key("आ") in clips


def test_render_retries_a_429_then_succeeds_and_stops_when_it_never_clears():
    from app.services.sarvam import SarvamError

    waits = []

    async def sleep(s):
        waits.append(s)

    flaky = lambda n, kw: (_ for _ in ()).throw(SarvamError(429, "slow down")) if n <= 2 else base64.b64encode(FAKE_MP3).decode()  # noqa: E731
    clips = {}
    summary = asyncio.run(rsa.render(_items("अ"), clips, client=FakeClient(flaky), storage=FakeStorage(), pace=0, sleep=sleep, log=lambda m: None))
    assert summary["rendered"] == 1 and waits == [5, 15], "two refusals, then the clip"

    always = lambda n, kw: (_ for _ in ()).throw(SarvamError(429, "no"))  # noqa: E731
    waits.clear()
    clips = {}
    summary = asyncio.run(rsa.render(_items("अ", "आ", "इ"), clips, client=FakeClient(always), storage=FakeStorage(), pace=0, sleep=sleep, log=lambda m: None))
    assert summary["rendered"] == 0 and "3 clips left" in summary["stopped"] and waits == list(rsa.RETRY_DELAYS), "stops the run, does not fail the rest one by one"


def test_render_does_not_retry_a_rejected_text():
    from app.services.sarvam import SarvamError

    bad = lambda n, kw: (_ for _ in ()).throw(SarvamError(400, "bad text"))  # noqa: E731
    client = FakeClient(bad)
    summary = asyncio.run(rsa.render(_items("अ", "आ"), {}, client=client, storage=FakeStorage(), pace=0, sleep=_no_sleep, log=lambda m: None))
    assert len(client.calls) == 2 and len(summary["failures"]) == 2 and summary["stopped"] is None
