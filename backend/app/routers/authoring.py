"""Admin authoring endpoints: Sarvam draft → Vidyut gate → Bulbul render.

Pipeline entry points for human-in-the-loop authoring (architecture §12):

    POST /authoring/draft      draft + gate report — NO database writes
    POST /authoring/scenario   full run → persists a DialogueScenario graph
    POST /authoring/render     Bulbul pre-render pass for a scenario
    GET  /authoring/scenarios  list authored scenarios with node/edge counts

Every endpoint is admin-guarded (``require_admin``, X-Admin-Token header) and
additionally gated behind ``SHABD_AUTHORING_LIVE=1`` — without it the pipeline
refuses to run so an unconfigured dev box never spends LLM credits.  Request
schemas live here (they are authoring-only and deliberately not in
``app/schemas.py``).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.models import DialogueEdge, DialogueNode, DialogueScenario
from app.services.authoring import (
    AuthoringConflictError,
    AuthoringError,
    AuthoringNotFoundError,
    AuthoringProviderError,
    authoring_live,
    render_scenario,
    run_authoring,
)

logger = logging.getLogger("shabd.authoring")

router = APIRouter(prefix="/authoring")


# ─── request schemas ──────────────────────────────────────────────────────

class DraftBrief(BaseModel):
    """Brief for one authored scenario (title, register, band, bridge, topic)."""

    title: str = Field(..., min_length=1, max_length=256)
    register: str = "laukika"
    ratio_band: Optional[dict[str, float] | list[float]] = None  # {min,max} or [min,max]
    bridge_lang: str = "hi"
    topic: str = ""
    sample_features: list[str] = []


class DraftRequest(BaseModel):
    brief: DraftBrief
    n_turns: int = Field(3, ge=1, le=12)
    with_dual: bool = False
    dry_run: bool = True  # forced True by the draft endpoint regardless


class ScenarioRequest(BaseModel):
    brief: DraftBrief
    n_turns: int = Field(3, ge=1, le=12)
    with_dual: bool = False
    replace: bool = False


class RenderRequest(BaseModel):
    scenario_id: str = Field(..., min_length=1)


# ─── deps ─────────────────────────────────────────────────────────────────

def require_live() -> bool:
    """503 unless SHABD_AUTHORING_LIVE=1 — real runs cost money, stay off by default."""
    if not authoring_live():
        raise HTTPException(
            status_code=503,
            detail="authoring is disabled: set SHABD_AUTHORING_LIVE=1 to enable "
                   "(real runs call paid LLM providers)",
        )
    return True


def _map_authoring_error(exc: AuthoringError) -> HTTPException:
    if isinstance(exc, AuthoringConflictError):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, AuthoringNotFoundError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, AuthoringProviderError):
        return HTTPException(status_code=502, detail=str(exc))
    return HTTPException(status_code=500, detail=f"authoring failed: {exc}")


# ─── endpoints ────────────────────────────────────────────────────────────

@router.post("/draft")
async def authoring_draft(
    req: DraftRequest,
    _admin: bool = Depends(require_admin),
    _live: bool = Depends(require_live),
) -> dict:
    """Run draft + gate and return the report.  Writes NOTHING to the DB.

    ``dry_run`` is accepted for symmetry but forced True — this endpoint is
    the human's spot-check surface (architecture §12).
    """
    try:
        return await run_authoring(
            req.brief.model_dump(),
            req.n_turns,
            with_dual=req.with_dual,
            dry_run=True,
        )
    except AuthoringError as e:
        raise _map_authoring_error(e) from e


@router.post("/scenario")
async def authoring_scenario(
    req: ScenarioRequest,
    _admin: bool = Depends(require_admin),
    _live: bool = Depends(require_live),
    db: Session = Depends(get_db),
) -> dict:
    """Full run: draft → gate → persist the dialogue graph.

    Refuses (409) when a scenario with the same title already exists unless
    ``replace=True``, which deletes + recreates it (idempotent re-runs).
    """
    try:
        return await run_authoring(
            req.brief.model_dump(),
            req.n_turns,
            with_dual=req.with_dual,
            dry_run=False,
            replace=req.replace,
            db=db,
        )
    except AuthoringError as e:
        raise _map_authoring_error(e) from e


@router.post("/render")
async def authoring_render(
    req: RenderRequest,
    _admin: bool = Depends(require_admin),
    _live: bool = Depends(require_live),
    db: Session = Depends(get_db),
) -> dict:
    """Pre-render every unrendered node of a scenario via Sarvam Bulbul."""
    try:
        return await render_scenario(req.scenario_id, db=db)
    except AuthoringError as e:
        raise _map_authoring_error(e) from e


@router.get("/scenarios")
async def authoring_scenarios(
    _admin: bool = Depends(require_admin),
    _live: bool = Depends(require_live),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List all dialogue scenarios with node + edge counts."""
    scenarios = (
        db.query(DialogueScenario)
        .order_by(DialogueScenario.created_at.desc())
        .all()
    )
    out: list[dict[str, Any]] = []
    for s in scenarios:
        n_nodes = (
            db.query(func.count(DialogueNode.id))
            .filter(DialogueNode.scenario_id == s.id)
            .scalar()
            or 0
        )
        n_edges = (
            db.query(func.count(DialogueEdge.id))
            .filter(DialogueEdge.scenario_id == s.id)
            .scalar()
            or 0
        )
        out.append(
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "register": s.register,
                "entry_node_id": s.entry_node_id,
                "min_ratio": s.min_ratio,
                "max_ratio": s.max_ratio,
                "est_minutes": s.est_minutes,
                "n_nodes": n_nodes,
                "n_edges": n_edges,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
        )
    return out


# ─── Review endpoints ─────────────────────────────────────────────────█

from datetime import datetime, timezone as dt_timezone

class ReviewRequest(BaseModel):
    status: Optional[str] = Field(default="approved", pattern="^(approved|rejected)$")
    note: str = ""


@router.get("/review")
async def authoring_review_list(
    status: Optional[str] = Query(default="pending", pattern="^(pending|approved|rejected)$"),
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """List scenarios by review status, oldest first (the review queue)."""
    q = db.query(DialogueScenario)
    if status:
        q = q.filter(DialogueScenario.review_status == status)
    scenarios = q.order_by(DialogueScenario.created_at.asc()).all()
    out: list[dict[str, Any]] = []
    for s in scenarios:
        n_nodes = (
            db.query(func.count(DialogueNode.id))
            .filter(DialogueNode.scenario_id == s.id)
            .scalar()
            or 0
        )
        n_edges = (
            db.query(func.count(DialogueEdge.id))
            .filter(DialogueEdge.scenario_id == s.id)
            .scalar()
            or 0
        )
        out.append({
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "register": s.register,
            "review_status": s.review_status,
            "review_note": s.review_note or "",
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "n_nodes": n_nodes,
            "n_edges": n_edges,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return out


@router.post("/review/{scenario_id}")
async def authoring_review_submit(
    scenario_id: str,
    req: ReviewRequest,
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Approve or reject a scenario."""
    scenario = db.query(DialogueScenario).filter(DialogueScenario.id == scenario_id).first()
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    scenario.review_status = req.status
    scenario.review_note = req.note or ""
    scenario.reviewed_at = datetime.now(dt_timezone.utc)
    db.commit()
    db.refresh(scenario)

    return {
        "id": scenario.id,
        "title": scenario.title,
        "review_status": scenario.review_status,
        "review_note": scenario.review_note,
        "reviewed_at": scenario.reviewed_at.isoformat() if scenario.reviewed_at else None,
    }