"""Calibrate recitation rubric v2 against the collected labelled recordings.

Reads the consented recordings gathered via /recite-calibration, scores each
through the production path (Sarvam STT → rubric v2), and reports the §8
acceptance target: clearly good recordings must order above deliberately
disrupted twins in ≥90% of pairs, broken out by speaker and device. Run this
BEFORE freezing recite-v2-1 thresholds; adjust
recite_scoring_v2.{MAX_PAUSE_FREE,PAUSE_PENALTY_BEYOND,SPEECH_RATE_MIN} and
re-run until the target holds, then record the results in the handover.

Usage (from backend/, CWD is the schema, §2.10; needs SARVAM_API_KEY):
    python -m scripts.calibrate_recite            # full run
    python -m scripts.calibrate_recite --dry-run  # inventory only, no STT
"""

from __future__ import annotations

import argparse
import io
import logging
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format="%(message)s")

PROMPT_TEXTS = {
    "cal-01": "सत्यम् एव जयते",
    "cal-02": "रामो वनं गच्छति",
    "cal-03": "वसुधैव कुटुम्बकम्",
    "cal-04": "कर्मणि एव अधिकारः ते",
    "cal-05": "सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः",
    "cal-06": "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत",
    "cal-07": "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्",
    "cal-08": "विद्या ददाति विनयं विनयाद्याति पात्रताम्",
}


def _load_audio(row) -> bytes | None:
    from app.services.storage import get_storage
    try:
        store = get_storage()
        return store.read_private(row.audio_key)
    except Exception as e:  # noqa: BLE001
        logging.info("  ! cannot open %s: %s", row.audio_key, e)
        return None


def _score_one(db, learner, data: bytes, reference: str) -> dict | None:
    """Production scoring path for one take (speech seconds are metered to
    the recording's owner, exactly like recite attempts); returns the v2
    payload."""
    import asyncio

    from app.services import scorer_client
    from app.services.recite_scoring_v2 import Segment, score_v2

    async def run():
        return await scorer_client.score_attempt(
            data, [reference], strict=True, db=db, learner=learner, surface="calibration")

    loop = asyncio.new_event_loop()
    try:
        res = loop.run_until_complete(run())
    finally:
        loop.close()
    if res.get("status") != "scored":
        return None
    segments = [Segment(text=str(s.get("text", "")), start_s=s.get("start_s"),
                        end_s=s.get("end_s")) for s in (res.get("segments") or [])]
    if not segments:
        segments = [Segment(text=res.get("heard", ""))]
    v2 = score_v2([reference], segments)
    return v2.as_payload() if v2.status == "scored" else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="inventory only, no STT")
    args = parser.parse_args()

    from app.db import SessionLocal
    from app.models import ReciteCalibration

    db = SessionLocal()
    rows = db.query(ReciteCalibration).order_by(ReciteCalibration.id).all()
    db.close()
    if not rows:
        print("No calibration recordings yet. Collect them with the app's "
              "Calibration screen (Settings → Calibration, dev builds) — "
              "targets: 60+ recordings from 10+ speakers across all labels.")
        return 1

    speakers = defaultdict(int)
    devices = defaultdict(int)
    labels = defaultdict(int)
    for r in rows:
        speakers[r.speaker_alias] += 1
        devices[r.device] += 1
        labels[r.label] += 1
    print(f"recordings={len(rows)} speakers={len(speakers)} labels={dict(labels)}")
    if args.dry_run:
        for s, n in sorted(speakers.items()):
            print(f"  {s}: {n}")
        return 0

    # Score every take.
    scored: dict[tuple, dict] = {}  # (speaker, prompt, label) -> payload
    skipped = 0
    db = SessionLocal()
    from app.models import Learner
    learners: dict[str, Learner] = {l.id: l for l in db.query(Learner).all()}
    try:
        for r in rows:
            reference = PROMPT_TEXTS.get(r.prompt_id)
            learner = learners.get(r.learner_id)
            if reference is None or learner is None:
                skipped += 1
                continue
            data = _load_audio(r)
            if data is None:
                skipped += 1
                continue
            try:
                payload = _score_one(db, learner, data, reference)
            except Exception as e:  # noqa: BLE001 — scorer/quota issues skip the take
                logging.info("  ! %s/%s failed: %s", r.speaker_alias, r.prompt_id, e)
                payload = None
            if payload is None:
                skipped += 1
                continue
            scored[(r.speaker_alias, r.prompt_id, r.label)] = payload
            print(f"  {r.speaker_alias}/{r.prompt_id}/{r.label}: {payload['total']}")
    finally:
        db.close()
    if skipped:
        print(f"(skipped {skipped} takes: unreadable audio or unclear transcripts)")

    # The §8 ordering target: clean > disrupted for the same speaker+prompt.
    correct = total = 0
    misses = []
    by_speaker: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    by_device_total = len(devices)
    disrupted_labels = ("scrambled", "pauses")
    for (speaker, prompt, label), payload in scored.items():
        if label != "clean":
            continue
        for d_label in disrupted_labels:
            twin = scored.get((speaker, prompt, d_label))
            if twin is None:
                continue
            total += 1
            ok = payload["total"] > twin["total"]
            correct += 1 if ok else 0
            by_speaker[speaker][0] += 1 if ok else 0
            by_speaker[speaker][1] += 1
            if not ok:
                misses.append((speaker, prompt, payload["total"], twin["total"]))

    print(f"\nclean-vs-disrupted pairs: {total}, clean ranked higher: {correct}")
    if total:
        pct = 100.0 * correct / total
        print(f"ordering accuracy: {pct:.1f}% (target ≥90%) — verdict: "
              f"{'PASS — thresholds may be frozen' if pct >= 90 else 'NOT READY — adjust MAX_PAUSE_FREE / PAUSE_PENALTY_BEYOND / SPEECH_RATE_MIN and re-run'}")
        for speaker, (ok_n, n) in sorted(by_speaker.items()):
            print(f"  {speaker}: {ok_n}/{n}")
        if misses:
            print("misses (speaker, prompt, clean, disrupted):")
            for m in misses[:10]:
                print(f"  {m}")
    else:
        print("no clean/disrupted twins found — collect matching takes per prompt")
    print(f"\ndevices seen: {by_device_total} (report by device in the handover)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
