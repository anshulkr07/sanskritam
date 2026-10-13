"""Recitation calibration capture (handover_games_daily_multiplayer §8).

Collection endpoints for the consented, labelled recording study that freezes
the rubric-v2 thresholds. Separate from play and from competition attempts:
calibration rows never affect scores, and the audio is private with the same
retention rules as competition audio.

  GET  /recite-calibration/prompts   the fixed prompt set + label guide
  POST /recite-calibration           upload one recording (multipart)
  GET  /recite-calibration           collector progress (admin)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import require_admin, require_learner
from app.db import get_db
from app.models import Learner, ReciteCalibration
from app.services.audio_meta import estimate_seconds

router = APIRouter(prefix="/recite-calibration")

MAX_BYTES = 20 * 1024 * 1024
LABELS = ("clean", "slow", "pauses", "scrambled", "noisy", "other")

# The fixed prompt set: well-attested lines of varying length. The label
# guide tells the collector what each labelled take should sound like.
PROMPTS = [
    {"id": "cal-01", "text": "सत्यम् एव जयते", "source": "Muṇḍaka Upaniṣad 3.1.6"},
    {"id": "cal-02", "text": "रामो वनं गच्छति", "source": "authentic simple sentence"},
    {"id": "cal-03", "text": "वसुधैव कुटुम्बकम्", "source": "Maha Upanishad 6.71"},
    {"id": "cal-04", "text": "कर्मणि एव अधिकारः ते", "source": "Bhagavad Gītā 2.47"},
    {"id": "cal-05", "text": "सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः", "source": "peace chant"},
    {"id": "cal-06", "text": "यदा यदा हि धर्मस्य ग्लानिर्भवति भारत", "source": "Bhagavad Gītā 4.7"},
    {"id": "cal-07", "text": "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्", "source": "Bhagavad Gītā 6.5"},
    {"id": "cal-08", "text": "विद्या ददाति विनयं विनयाद्याति पात्रताम्", "source": "Hitopadeśa 1.3"},
]

LABEL_GUIDE = [
    ("clean", "Recite naturally at your own pace."),
    ("slow", "Recite the same lines deliberately slowly — still continuous."),
    ("pauses", "Recite with long, unnatural pauses in the middle of lines."),
    ("scrambled", "Say the words out of order, fragmented."),
    ("noisy", "Record near everyday background noise (fan, traffic hum)."),
    ("other", "Anything else worth keeping — say what in the note."),
]


@router.get("/prompts")
def get_prompts():
    return {"prompts": PROMPTS, "labels": [{"key": k, "guide": g} for k, g in LABEL_GUIDE],
            "target_count": 60, "target_speakers": 10}


@router.post("")
async def post_calibration(
    file: UploadFile = File(...),
    prompt_id: str = Form(""),
    label: str = Form("clean"),
    speaker_alias: str = Form(""),
    device: str = Form(""),
    consent: bool = Form(False),
    note: str = Form(""),
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    if not consent:
        raise HTTPException(status_code=422, detail="Consent is required for calibration recordings.")
    if label not in LABELS:
        raise HTTPException(status_code=422, detail="Unknown label.")
    if prompt_id not in {p["id"] for p in PROMPTS}:
        raise HTTPException(status_code=422, detail="Unknown prompt.")
    data = await file.read()
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Recording missing or too large.")
    import time

    key = f"calibration/{learner.id}/{prompt_id}-{label}-{int(time.time())}.m4a"
    try:
        from app.services.storage import get_storage
        store = get_storage()
        store.store_private(data, key, "audio/mp4")
    except Exception as exc:
        # Dev machines may have private cloud storage unconfigured: keep the
        # capture usable by falling back to the local private directory.
        from app.services.storage import LocalStorage, PrivateStorageOff
        if isinstance(exc, PrivateStorageOff):
            try:
                LocalStorage().store_private(data, key, "audio/mp4")
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Storage unavailable: {e}")
        else:
            raise HTTPException(status_code=503, detail=f"Storage unavailable: {exc}")
    row = ReciteCalibration(
        learner_id=learner.id, speaker_alias=(speaker_alias or "speaker")[:32],
        device=(device or "unknown")[:32], prompt_id=prompt_id, label=label,
        consent=True, audio_key=key, duration_ms=int(estimate_seconds(data) * 1000),
        note=(note or "")[:256],
    )
    db.add(row)
    db.commit()
    return {"id": row.id, "stored": True}


@router.get("")
def get_progress(admin: bool = Depends(require_admin), db: Session = Depends(get_db)):
    """Collector progress vs the study targets (§8: ≥60 recordings, ≥10
    speakers, all labels represented)."""
    rows = db.query(ReciteCalibration).all()
    speakers = {r.speaker_alias for r in rows if r.speaker_alias}
    by_label: dict[str, int] = {}
    for r in rows:
        by_label[r.label] = by_label.get(r.label, 0) + 1
    return {
        "total": len(rows),
        "speakers": len(speakers),
        "by_label": by_label,
        "targets": {"recordings": 60, "speakers": 10},
        "ready_to_freeze": len(rows) >= 60 and len(speakers) >= 10,
    }
