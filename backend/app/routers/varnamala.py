"""Spec E — varnamala drill endpoints (build order step 5).

``GET  /varnamala`` — full grid with ids, examples, ``minimal_pairs``,
serve-time ``audio_url``\ s, plus ``contrast_groups``. ``GET
/grammar/varnamala`` keeps working unchanged for existing clients.

``GET  /varnamala/progress`` — the learner's per-varna coverage.

``POST /varnamala/practice`` — ``{varna_id, heard, recorded}``. Records a
rep. Returns NO verdict (Spec E §5: ship the drill, ship no scoring — v1 is
reference audio, self-comparison playback, and coverage tracking, which
carries zero false-accusation risk).

Progress storage: ``Learner.varna_progress`` (``{varna_id: {reps,
last_ts}}``) — its own column, never ``feature_mastery`` (P23-5's rule:
one writer per value, homogeneous dicts only).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_learner
from app.db import get_db
from app.models import Learner
from app.seeds.varnamala import CONTRAST_GROUPS, VARNAMALA_DATA

router = APIRouter(prefix="/varnamala")


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def audio_urls(varna_id: str) -> tuple[str, str]:
    """Serve-time audio URLs — a path convention, not a stored column (§3)."""
    return (
        f"/audio/varnamala/{varna_id}.wav",
        f"/audio/varnamala/{varna_id}_example.wav",
    )


class VarnaFull(BaseModel):
    id: str
    devanagari: str
    iast: str
    place: str | None = None
    voicing: str | None = None
    kind: str
    example_devanagari: str = ""
    example_iast: str = ""
    example_gloss: str = ""
    minimal_pairs: list[str] = []
    mark: str = ""
    audio_url: str = ""
    example_audio_url: str = ""


class ContrastGroupResponse(BaseModel):
    id: str
    label: str
    pairs: list[list[str]]
    note_en: str = ""


class VarnamalaFullResponse(BaseModel):
    vowels: list[VarnaFull]
    consonants: list[VarnaFull]
    nasals: list[VarnaFull]
    others: list[VarnaFull]
    contrast_groups: list[ContrastGroupResponse]


class VarnamalaPracticeRequest(BaseModel):
    varna_id: str
    heard: bool = Field(default=False)
    recorded: bool = Field(default=False)


class VarnamalaPracticeResponse(BaseModel):
    varna_id: str
    reps: int
    last_ts: str


class VarnamalaProgressResponse(BaseModel):
    progress: dict[str, dict] = {}
    covered: int = 0
    total: int = 0


def _all_ids() -> set[str]:
    ids: set[str] = set()
    for key in ("vowels", "consonants", "nasals", "others"):
        for cell in VARNAMALA_DATA[key]:
            ids.add(cell["id"])
    return ids


def _full_cell(cell: dict) -> VarnaFull:
    audio_url, example_audio_url = audio_urls(cell["id"])
    return VarnaFull(
        id=cell["id"],
        devanagari=cell["devanagari"],
        iast=cell["iast"],
        place=cell.get("place"),
        voicing=cell.get("voicing"),
        kind=cell.get("kind", ""),
        example_devanagari=cell.get("example_devanagari", ""),
        example_iast=cell.get("example_iast", ""),
        example_gloss=cell.get("example_gloss", ""),
        minimal_pairs=list(cell.get("minimal_pairs", [])),
        mark=cell.get("mark", ""),
        audio_url=audio_url,
        example_audio_url=example_audio_url,
    )


@router.get("", response_model=VarnamalaFullResponse)
async def get_varnamala_full():
    """The varnamala grid with drill metadata (Spec E §1–3)."""
    return VarnamalaFullResponse(
        vowels=[_full_cell(c) for c in VARNAMALA_DATA["vowels"]],
        consonants=[_full_cell(c) for c in VARNAMALA_DATA["consonants"]],
        nasals=[_full_cell(c) for c in VARNAMALA_DATA["nasals"]],
        others=[_full_cell(c) for c in VARNAMALA_DATA["others"]],
        contrast_groups=[
            ContrastGroupResponse(
                id=g["id"],
                label=g["label"],
                pairs=[list(p) for p in g["pairs"]],
                note_en=g.get("note_en", ""),
            )
            for g in CONTRAST_GROUPS
        ],
    )


@router.get("/progress", response_model=VarnamalaProgressResponse)
def get_varnamala_progress(
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Per-varna coverage for this learner."""
    _ = db  # progress lives on the learner row; no extra query needed
    progress = dict(learner.varna_progress or {})
    return VarnamalaProgressResponse(
        progress=progress,
        covered=len(progress),
        total=len(_all_ids()),
    )


@router.post("/practice", response_model=VarnamalaPracticeResponse)
async def post_varnamala_practice(
    req: VarnamalaPracticeRequest,
    learner: Learner = Depends(require_learner),
    db: Session = Depends(get_db),
):
    """Record one drill rep. No verdict — coverage only (Spec E §5)."""
    if req.varna_id not in _all_ids():
        raise HTTPException(status_code=404, detail="Unknown varna_id")
    progress = dict(learner.varna_progress or {})
    cell = dict(progress.get(req.varna_id) or {"reps": 0, "last_ts": ""})
    cell["reps"] = int(cell.get("reps", 0)) + 1
    cell["last_ts"] = _utcnow_iso()
    progress[req.varna_id] = cell
    learner.varna_progress = progress
    db.commit()
    return VarnamalaPracticeResponse(
        varna_id=req.varna_id, reps=cell["reps"], last_ts=cell["last_ts"]
    )
