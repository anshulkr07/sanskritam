"""Recitation + competition revamp (handover_games_daily_multiplayer §7-9,
finished 2026-10-14): timing from the recording, the live-caption relay's
message shapes, rubric v2 ranking weekly sets, divisions, standings, and the
verse-by-uid lookup."""

from __future__ import annotations

import io
import json
import math
import struct
import uuid
import wave
from datetime import datetime, timedelta, timezone

from app.services import recite_stream as rs
from app.services.recite_scoring_v2 import is_complete, score_recording
from app.services.recite_timing import spans_from_energies, voiced_spans


def _wav(pattern: list[tuple[float, bool]], rate: int = 16000) -> bytes:
    """Tone bursts (True) and silence (False), each (seconds, voiced)."""
    frames = bytearray()
    for secs, voiced in pattern:
        for i in range(int(secs * rate)):
            v = int(9000 * math.sin(2 * math.pi * 220 * i / rate)) if voiced else 0
            frames += struct.pack("<h", v)
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(frames))
    return out.getvalue()


# ── timing ────────────────────────────────────────────────────────────────

def test_spans_bridge_short_dips_and_drop_clicks():
    loud, quiet = 3000.0, 20.0
    e = [quiet] * 10 + [loud] * 50 + [quiet] * 5 + [loud] * 40 + [quiet] * 60 + [loud] * 3 + [quiet] * 10
    spans = spans_from_energies(e)
    # the 0.1 s dip is bridged; the 60 ms click is dropped
    assert len(spans) == 1
    a, b = spans[0]
    assert abs(a - 0.2) < 0.03 and abs(b - 2.1) < 0.03


def test_voiced_spans_from_a_wav():
    audio = _wav([(0.5, False), (2.0, True), (1.2, False), (1.5, True), (0.5, False)])
    spans = voiced_spans(audio)
    assert spans is not None and len(spans) == 2
    assert abs(spans[0][0] - 0.5) < 0.05 and abs(spans[0][1] - 2.5) < 0.05
    assert abs(spans[1][0] - 3.7) < 0.05 and abs(spans[1][1] - 5.2) < 0.05


def test_undecodable_audio_gives_no_spans():
    assert voiced_spans(b"not audio at all") is None


# ── rubric v2 on real-shaped evidence ───────────────────────────────────────

REF = ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।", "मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥"]
HEARD = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि"


def test_long_pauses_cost_flow_and_full_evidence_is_complete():
    smooth = score_recording(REF, HEARD, [(0.3, 4.6), (5.2, 10.4)])
    broken = score_recording(REF, HEARD, [(0.3, 2.0), (6.0, 7.5), (12.0, 13.0), (18.5, 20.0)])
    assert is_complete(smooth) and is_complete(broken)
    assert smooth.components["continuity"] > broken.components["continuity"]
    assert smooth.total > broken.total


def test_no_spans_leaves_timing_missing():
    r = score_recording(REF, HEARD, None)
    assert r.status == "scored" and not is_complete(r)
    assert r.components["continuity"] is None and r.components["rhythm"] is None


def test_timing_points_are_capped_by_coverage():
    half = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
    r = score_recording(REF, half, [(0.3, 4.6)])
    cov = r.evidence["coverage"]
    assert cov < 0.6
    assert r.components["continuity"] <= 15 * cov + 0.1
    assert r.total < 60


# ── live-caption relay message shapes ────────────────────────────────────

def test_audio_message_wraps_pcm_as_sarvam_expects():
    msg = json.loads(rs.audio_message(b"\x01\x00\x02\x00"))
    assert msg["audio"]["sample_rate"] == "16000"
    assert msg["audio"]["encoding"] == "audio/wav"
    assert msg["audio"]["data"] == "AQACAA=="


def test_caption_from_provider_messages():
    assert rs.caption_from('{"type":"data","data":{"transcript":"मा फलेषु"}}') == {
        "type": "caption", "text": "मा फलेषु", "final": True}
    assert rs.caption_from('{"type":"data","data":{"transcript":""}}') is None
    assert rs.caption_from('{"type":"events","data":{"signal_type":"START_SPEECH"}}') == {
        "type": "speech", "state": "start"}
    assert rs.caption_from('{"type":"error","data":{"error":"x"}}')["type"] == "unavailable"
    assert rs.caption_from("not json") is None


def test_upstream_url_carries_sanskrit_and_raw_pcm():
    url = rs._upstream_url()
    assert "language-code=sa-IN" in url and "input_audio_codec=pcm_s16le" in url


# ── endpoints ─────────────────────────────────────────────────────────────

def _login(client, name):
    r = client.post("/auth/dev-login", json={"display_name": name, "bridge_langs": ["en"]})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    return {"Authorization": f"Bearer {tok}"}, tok


def _enter(client, h, tok, name):
    from app.auth import get_learner_from_token
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        learner = get_learner_from_token(tok, db)
        learner.google_sub = "g-" + learner.id
        db.commit()
    finally:
        db.close()
    r = client.put("/me/public-profile", headers=h, json={
        "public_name": name, "age_confirmed": True, "rules_accepted": True, "recordings_consent": True})
    assert r.status_code == 200, r.text


def test_stream_ticket_needs_a_provider(client, monkeypatch):
    from app.config import settings
    h, _ = _login(client, "streamer")
    monkeypatch.setattr(settings, "sarvam_api_key", "")
    assert client.post("/recite/stream-ticket", headers=h).status_code == 503
    monkeypatch.setattr(settings, "sarvam_api_key", "k")
    r = client.post("/recite/stream-ticket", headers=h)
    assert r.status_code == 200 and len(r.json()["ticket"]) > 20


def test_shloka_by_uid(client):
    from app.db import SessionLocal
    from app.models import Shloka
    h, _ = _login(client, "uidreader")
    db = SessionLocal()
    try:
        s = db.query(Shloka).filter(Shloka.verse_uid.is_not(None)).first()
        uid = s.verse_uid
    finally:
        db.close()
    r = client.get(f"/shlokas/uid/{uid}", headers=h)
    assert r.status_code == 200 and r.json()["verse_uid"] == uid
    assert client.get("/shlokas/uid/nope", headers=h).status_code == 404


def test_weekly_set_ranks_on_rubric_v2_by_division(client, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app.models import Competition, Shloka
    from app.services import scorer_client
    from app.services.chant_text import chant_lines
    from app.services.competition_sets import SETS_RULES_VERSION

    monkeypatch.setattr(settings, "scorer_url", "fake")
    db = SessionLocal()
    try:
        rows = [s for s in db.query(Shloka).filter(Shloka.verse_uid.is_not(None)).order_by(Shloka.date, Shloka.id).limit(8).all()]
        std, beg = rows[:3], rows[3:6]
        now = datetime.now(timezone.utc)
        pieces = ([{"source_ref": s.source_ref, "verse_uid": s.verse_uid, "length": l, "division": "standard"}
                   for s, l in zip(std, ("short", "medium", "longer"))]
                  + [{"source_ref": s.source_ref, "verse_uid": s.verse_uid, "length": l, "division": "beginner"}
                     for s, l in zip(beg, ("short", "medium", "longer"))])
        comp = Competition(slug=f"revamp-set-{uuid.uuid4().hex[:8]}", kind="set", opens_at=now - timedelta(hours=1),
                           closes_at=now + timedelta(days=2), results_at=now + timedelta(days=3),
                           pieces=pieces, status="open", rules_version=SETS_RULES_VERSION)
        db.add(comp)
        db.commit()
        cid = comp.id
        refs = {s.verse_uid: [ln["tts"] for ln in chant_lines(s.devanagari or "") if ln.get("kind") != "speaker"]
                for s in std + beg}
    finally:
        db.close()

    # The scorer hears exactly the reference; timing comes from the WAV.
    async def fake_score(audio, reference_lines, strict, **kw):
        heard = " ".join(reference_lines)
        from app.services.recite_scoring import score_transcript
        return {**score_transcript(reference_lines, heard), "duration_ms": 4000}
    monkeypatch.setattr(scorer_client, "score_attempt", fake_score)
    monkeypatch.setattr(scorer_client, "available", lambda: True)

    cam = json.dumps({"face_ratio": 1.0, "eyes_closed_ratio": 1.0, "multi_face_ratio": 0.0,
                      "mouth_moving_ratio": 0.8, "app_version": "1.3.0"})
    audio = _wav([(0.3, False), (3.0, True), (0.4, False), (3.0, True), (0.3, False)])

    std_name = f"SetStd_{uuid.uuid4().hex[:6]}"
    h, tok = _login(client, std_name)
    _enter(client, h, tok, std_name)
    # A beginner piece is not part of the standard set.
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.wav", audio, "audio/wav")},
                    data={"verse_uid": beg[0].verse_uid, "camera": cam, "division": "standard"})
    assert r.status_code == 422
    for i, s in enumerate(std):
        r = client.post(f"/competitions/{cid}/attempts", headers=h,
                        files={"file": ("a.wav", audio, "audio/wav")},
                        data={"verse_uid": s.verse_uid, "camera": cam, "division": "standard"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["counted"] is True, f"attempt not counted, why_not={body.get('why_not')}: {body}"
        assert body["components"]["continuity"] is not None
        assert body["percent"] == body["total"]
        assert body["set_progress"]["submitted"] == i + 1
    assert body["set_progress"]["complete"] is True and body["rank"] == 1
    # Division froze at entry: asking for beginner later changes nothing.
    r = client.post(f"/competitions/{cid}/attempts", headers=h,
                    files={"file": ("a.wav", audio, "audio/wav")},
                    data={"verse_uid": beg[0].verse_uid, "camera": cam, "division": "beginner"})
    assert r.status_code == 422

    # Silence-only audio: no timing, so it cannot count in a v2 event.
    beg_name = f"SetBeg_{uuid.uuid4().hex[:6]}"
    h2, tok2 = _login(client, beg_name)
    _enter(client, h2, tok2, beg_name)
    r = client.post(f"/competitions/{cid}/attempts", headers=h2,
                    files={"file": ("a.wav", _wav([(2.0, False)]), "audio/wav")},
                    data={"verse_uid": beg[0].verse_uid, "camera": cam, "division": "beginner"})
    assert r.status_code == 200 and r.json()["counted"] is False and r.json()["why_not"] == "no_timing"
    r = client.post(f"/competitions/{cid}/attempts", headers=h2,
                    files={"file": ("a.wav", audio, "audio/wav")},
                    data={"verse_uid": beg[0].verse_uid, "camera": cam, "division": "beginner"})
    assert r.json()["counted"] is True and r.json()["division"] == "beginner"

    # Current competition: set details for the learner.
    cur = client.get("/competitions/current", headers=h).json()["open"]
    assert cur["is_set"] is True and cur["scoring"] == "v2"
    assert cur["me"]["division"] == "standard" and cur["me"]["set_progress"]["complete"] is True
    assert all("audio_key" not in v for v in cur["me"]["piece_results"].values())

    # Boards are per division; the provisional beginner is not ranked.
    lb = client.get(f"/competitions/{cid}/leaderboard?division=standard", headers=h).json()
    assert lb["division"] == "standard" and lb["rows"][0]["public_name"] == std_name
    lb2 = client.get(f"/competitions/{cid}/leaderboard?division=beginner", headers=h2).json()
    assert lb2["rows"] == [] and lb2["me"]["complete"] is False and lb2["me"]["submitted"] == 1
    st = client.get("/competitions/standings?period=weekly&division=standard", headers=h).json()
    assert st["board"] == "recitation" and st["me"]["rank"] == 1 and st["me"]["participation"] == 3
    st2 = client.get("/competitions/standings?period=weekly&division=beginner", headers=h2).json()
    assert st2["total"] == 0 and st2["me"]["rank"] == 0 and st2["me"]["of"] == 3
    mo = client.get("/competitions/standings?period=monthly&division=standard", headers=h).json()
    assert mo["period"] == "monthly"


def test_legacy_single_verse_events_stop_being_scheduled(client, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app.services import competitions as svc
    monkeypatch.setattr(svc, "ensure_next", lambda db, now: (_ for _ in ()).throw(AssertionError("called")))
    monkeypatch.setattr(settings, "competition_legacy_events", False)
    db = SessionLocal()
    try:
        out = svc.tick(db, datetime.now(timezone.utc))
        assert out["made"] == 0
    finally:
        db.close()
