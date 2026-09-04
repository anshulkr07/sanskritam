"""Offline review of authored dialogue scenarios (P7-3).

A human-in-the-loop review surface for the pending scenarios that are
otherwise invisible: ``routers/conversation.py`` serves approved scenarios
only, so 5 of the 6 in the DB sit unreachable with no review tooling.
This script reads the DB directly via ``SessionLocal`` — no server, no admin
token, no network.

The review field set is the SAME one ``POST /authoring/review/{id}`` writes:
``review_status``, ``review_note``, ``reviewed_at``. Do not fork the
semantics; this is the offline counterpart of that endpoint.

Usage (run from ``backend/`` — CWD is the schema, see HANDOVER §2.10)::

    python -m scripts.review_scenarios --list
    python -m scripts.review_scenarios --show <scenario_id>
    python -m scripts.review_scenarios --packet review_packet.txt
    python -m scripts.review_scenarios --approve <scenario_id>
    python -m scripts.review_scenarios --reject <scenario_id> --note "..."

``--approve`` / ``--reject`` are idempotent: re-setting the same status is a
reported no-op, not an error, and does not rewrite ``reviewed_at``.
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional, TextIO

if __package__ in (None, ""):  # allow `python scripts/review_scenarios.py`
    sys.path.insert(0, __file__.rsplit("/", 2)[0])

from sqlalchemy.orm import Session  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.models import Challenge, DialogueEdge, DialogueNode, DialogueScenario  # noqa: E402

VALID_STATUS = ("pending", "approved", "rejected")


# ─── read helpers ───────────────────────────────────────────────────────────

def load_scenarios(db: Session, status: Optional[str] = None) -> list[dict]:
    """Every scenario (optionally filtered by review status), oldest first."""
    q = db.query(DialogueScenario)
    if status:
        q = q.filter(DialogueScenario.review_status == status)
    out = []
    for s in q.order_by(DialogueScenario.created_at.asc()).all():
        n_nodes = db.query(DialogueNode).filter(DialogueNode.scenario_id == s.id).count()
        n_edges = db.query(DialogueEdge).filter(DialogueEdge.scenario_id == s.id).count()
        out.append({
            "id": s.id,
            "title": s.title,
            "register": s.register,
            "review_status": s.review_status,
            "review_note": s.review_note or "",
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "n_nodes": n_nodes,
            "n_edges": n_edges,
            "est_minutes": s.est_minutes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return out


def render_scenario(db: Session, scenario: DialogueScenario) -> list[str]:
    """The scenario as readable prose, walked in graph order from the entry.

    Each node is printed indented under the edge that reaches it (edges are
    the learner's expected responses); ``repair_type`` is marked where set.
    No raw node ids appear in normal bodies.  Anything not reachable from
    the entry is surfaced under an explicit header — nothing is silently
    dropped (HANDOVER §2.11).
    """
    nodes = {n.id: n for n in db.query(DialogueNode)
             .filter(DialogueNode.scenario_id == scenario.id).all()}
    by_from: dict[str, list] = defaultdict(list)
    for e in db.query(DialogueEdge).filter(DialogueEdge.scenario_id == scenario.id).all():
        by_from[e.from_node_id].append(e)
    for k in by_from:
        by_from[k].sort(key=lambda e: (e.rank or 0))

    lines = [
        f"Scenario: {scenario.title}",
        f"  register: {scenario.register} · status: {scenario.review_status}"
        f" · est ~{scenario.est_minutes or '?'} min"
        f" · nodes: {len(nodes)}",
    ]
    if scenario.description:
        lines.append(f"  {scenario.description}")

    visited: set[str] = set()

    def emit(node_id: Optional[str], depth: int) -> None:
        if node_id is None:
            return
        ind = "  " * depth
        if node_id in visited:
            lines.append(f"{ind}↻ (already shown — cycle/repeat, node {node_id})")
            return
        if node_id not in nodes:
            lines.append(f"{ind}⚠ missing node {node_id}")
            return
        visited.add(node_id)
        n = nodes[node_id]
        kind = n.kind.upper() + (f":{n.repair_type}" if n.repair_type else "")
        lines.append(f"{ind}▶ {kind} · {n.lang}")
        if n.devanagari:
            lines.append(f"{ind}   {n.devanagari}")
        if n.iast:
            lines.append(f"{ind}   IAST  {n.iast}")
        if n.gloss:
            lines.append(f"{ind}   {n.gloss}")
        for e in by_from.get(node_id, []):
            phrase = e.expected_text or "(no expected text)"
            lines.append(f"{ind}   ∟ ({e.lang}) “{phrase}”")
            if e.to_node_id:
                emit(e.to_node_id, depth + 1)

    entry = scenario.entry_node_id
    if not entry:
        lines.append("⚠ no entry_node_id set — cannot walk the graph")
    else:
        emit(entry, 1)

    orphans = [nid for nid in nodes if nid not in visited]
    if orphans:
        lines.append("── UNREACHABLE FROM ENTRY ──")
        for nid in sorted(orphans):
            n = nodes[nid]
            lines.append(f"▶ {n.kind.upper()} · {n.lang}  (unreachable, node {nid})")
            if n.devanagari:
                lines.append(f"   {n.devanagari}")
    return lines


# ─── write helpers ──────────────────────────────────────────────────────────

def set_review_status(db: Session, scenario_id: str, status: str,
                      note: str = "") -> tuple[dict, bool]:
    """Set review status/none/reviewed_at; returns (summary, changed).

    Idempotent: re-setting the same status returns changed=False and leaves
    ``reviewed_at`` untouched (a no-op that reports itself, not an error).
    """
    scenario = db.query(DialogueScenario).filter(DialogueScenario.id == scenario_id).first()
    if scenario is None:
        raise FileNotFoundError(f"no scenario with id {scenario_id}")
    changed = bool(scenario.review_status != status
                   or (note and scenario.review_note != note))
    if changed:
        scenario.review_status = status
        if note:
            scenario.review_note = note
        scenario.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(scenario)
    return {
        "id": scenario.id,
        "title": scenario.title,
        "review_status": scenario.review_status,
        "review_note": scenario.review_note or "",
        "reviewed_at": scenario.reviewed_at.isoformat() if scenario.reviewed_at else None,
    }, changed


def render_packet(db: Session, path: str, out: Optional[TextIO] = None) -> int:
    """Write every pending scenario's prose to ``path`` (or ``out``)."""
    pending = load_scenarios(db, status="pending")
    n = 0
    stream = out if out is not None else open(path, "w", encoding="utf-8")
    try:
        for s in pending:
            scenario = db.get(DialogueScenario, s["id"])
            stream.write("\n".join(render_scenario(db, scenario)) + "\n\n")
            n += 1
    finally:
        if out is None:
            stream.close()
    return n


# ─── challenge review helpers (P7-11) ───────────────────────────────────────

def load_challenges(db: Session, status: Optional[str] = None,
                    register: Optional[str] = None) -> list[dict]:
    """Challenge rows (optionally by review status + register), oldest first.

    Includes derived feature coverage so the reviewer can see, at a glance,
    which of the 37 features this pool exercises without a second query."""
    q = db.query(Challenge)
    if status:
        q = q.filter(Challenge.review_status == status)
    if register:
        q = q.filter(Challenge.register == register)
    out = []
    for c in q.order_by(Challenge.created_at.asc()).all():
        out.append({
            "id": c.id,
            "prompt_l1": c.prompt_l1,
            "target_sanskrit": c.target_sanskrit,
            "target_iast": c.target_iast,
            "features": list(c.features or []),
            "register": c.register,
            "review_status": c.review_status,
            "review_note": c.review_note or "",
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
            "audio_url": c.audio_url or "",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return out


def set_challenge_review_status(db: Session, challenge_id: str, status: str,
                                note: str = "") -> tuple[dict, bool]:
    """Set a challenge's review status; idempotent (same semantics as
    ``set_review_status`` for scenarios)."""
    ch = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if ch is None:
        raise FileNotFoundError(f"no challenge with id {challenge_id}")
    changed = bool(ch.review_status != status or (note and ch.review_note != note))
    if changed:
        ch.review_status = status
        if note:
            ch.review_note = note
        ch.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(ch)
    return {
        "id": ch.id,
        "target_sanskrit": ch.target_sanskrit,
        "review_status": ch.review_status,
        "review_note": ch.review_note or "",
        "reviewed_at": ch.reviewed_at.isoformat() if ch.reviewed_at else None,
    }, changed


def set_challenges_by_band(db: Session, features: list[str], status: str,
                           note: str = "") -> int:
    """Bulk-set review_status for every challenge exercising ANY listed feature.

    P7-11: reviewing 96 sentences one HTTP call at a time is how the review
    stalls again. Bands come straight from ``seeds/briefs.FEATURE_BANDS``.
    Returns the number of rows changed."""
    n = 0
    for ch in db.query(Challenge).filter(
        Challenge.review_status != status
    ).all():
        chf = list(ch.features or [])
        if any(f in chf for f in features):
            ch.review_status = status
            if note:
                ch.review_note = note
            ch.reviewed_at = datetime.now(timezone.utc)
            n += 1
    if n:
        db.commit()
    return n


def render_challenge_packet(db: Session, path: str, out: Optional[TextIO] = None) -> int:
    """Write every pending challenge's sentence + prompt + features to ``path``."""
    pending = load_challenges(db, status="pending")
    n = 0
    stream = out if out is not None else open(path, "w", encoding="utf-8")
    try:
        for r in pending:
            stream.write(
                f"[{r['register']}] {r['target_sanskrit']}\n"
                f"    IAST   {r['target_iast']}\n"
                f"    prompt {r['prompt_l1']}\n"
                f"    feats  {', '.join(r['features'])}\n\n"
            )
            n += 1
    finally:
        if out is None:
            stream.close()
    return n


# ─── CLI ────────────────────────────────────────────────────────────────────

def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(
        prog="review_scenarios",
        description="Offline review of authored dialogue scenarios (P7-3) and challenges (P7-11).",
    )
    p.add_argument("--challenges", action="store_true",
                   help="operate on challenges instead of dialogue scenarios")
    p.add_argument("--list", action="store_true", help="list every item with review status")
    p.add_argument("--show", metavar="ID", help="render one scenario's graph as prose")
    p.add_argument("--packet", metavar="PATH", help="write all pending items' prose to a file")
    p.add_argument("--approve", metavar="ID", help="approve one item (idempotent)")
    p.add_argument("--reject", metavar="ID", help="reject one item (idempotent)")
    p.add_argument("--approve-band", metavar="FEATURES",
                   help="approve every challenge exercising ANY listed feature (comma-sep)")
    p.add_argument("--register", default=None, help="filter challenges by register (laukika|classical)")
    p.add_argument("--note", default="", help="review note for approve/reject")
    args = p.parse_args(argv)

    actions = sum(bool(x) for x in (
        args.list, args.show, args.packet, args.approve, args.reject, args.approve_band
    ))
    if actions != 1:
        p.error("exactly one of --list / --show / --packet / --approve / --reject / --approve-band required")

    db = SessionLocal()
    count = 0
    try:
        if args.challenges:
            return _challenges_cli(db, args)

        if args.list:
            rows = load_scenarios(db)
            print(f"{'id':<40} {'status':<9} {'nodes':>6} {'edges':>6}  title/register")
            for r in rows:
                print(f"{r['id']:<40} {r['review_status']:<9} {r['n_nodes']:>6} "
                      f"{r['n_edges']:>6}  {r['title']} [{r['register']}]")
            print(f"\n{len(rows)} scenario(s): "
                  f"{sum(1 for r in rows if r['review_status']=='approved')} approved, "
                  f"{sum(1 for r in rows if r['review_status']=='pending')} pending, "
                  f"{sum(1 for r in rows if r['review_status']=='rejected')} rejected")

        elif args.show:
            s = db.get(DialogueScenario, args.show)
            if s is None:
                print(f"unknown scenario: {args.show}", file=sys.stderr)
                return 2
            print("\n".join(render_scenario(db, s)))

        elif args.packet:
            n = render_packet(db, args.packet)
            print(f"wrote {n} pending scenario(s) to {args.packet}")

        elif args.approve or args.reject:
            target = args.approve or args.reject
            status = "approved" if args.approve else "rejected"
            summary, changed = set_review_status(db, target, status, args.note)
            if changed:
                print(f"{target}: {summary['review_status']} — review_note={summary['review_note']!r}")
            else:
                print(f"{target}: already {status} — no change (idempotent no-op)")
        db.commit()
    finally:
        db.close()
    return count if count else 0


def _challenges_cli(db, args) -> int:
    """Handle the --challenges review surface (P7-11)."""
    if args.list:
        rows = load_challenges(db, register=args.register)
        print(f"{'id':<16} {'status':<9} {'register':<10}  target")
        for r in rows:
            print(f"{r['id']:<16} {r['review_status']:<9} {r['register']:<10} "
                  f"{r['target_sanskrit']}")
        # Feature coverage: how many distinct features does each status exercise?
        feats = {"pending": set(), "approved": set(), "rejected": set()}
        for r in rows:
            feats[r["review_status"]].update(r["features"])
        print(f"\n{len(rows)} challenge(s): "
              f"{sum(1 for r in rows if r['review_status']=='approved')} approved, "
              f"{sum(1 for r in rows if r['review_status']=='pending')} pending, "
              f"{sum(1 for r in rows if r['review_status']=='rejected')} rejected")
        print(f"features exercised: approved={len(feats['approved'])} "
              f"pending={len(feats['pending'])} rejected={len(feats['rejected'])}")
        return 0
    elif args.packet:
        n = render_challenge_packet(db, args.packet)
        print(f"wrote {n} pending challenge(s) to {args.packet}")
    elif args.approve or args.reject:
        target = args.approve or args.reject
        status = "approved" if args.approve else "rejected"
        summary, changed = set_challenge_review_status(db, target, status, args.note)
        if changed:
            print(f"{target}: {summary['review_status']} — review_note={summary['review_note']!r}")
        else:
            print(f"{target}: already {status} — no change (idempotent no-op)")
    elif args.approve_band:
        features = [f.strip() for f in args.approve_band.split(",") if f.strip()]
        n = set_challenges_by_band(db, features, "approved", args.note)
        print(f"approved {n} challenge(s) exercising [{', '.join(features)}]")
    db.commit()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())