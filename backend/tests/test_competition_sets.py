"""Multi-shloka competition sets: scheduling with preflight, per-piece bests,
event totals over ALL pieces, divisions, monthly standings."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.models import Competition, CompetitionEntry
from app.services.competition_sets import (
    SETS_RULES_VERSION, ensure_weekly_sets, event_progress,
    monthly_standings, preflight, publish_sets, rank_entries_sets,
    record_piece_result,
)
from app.services.competitions import tick


def _mk_piece(ref: str, uid: str, length: str) -> dict:
    return {"source_ref": ref, "verse_uid": uid, "length": length}


def test_sets_scheduling_preflight_and_no_repeat(client):
    # The suite DB has seeded shlokas but (normally) no served audio, so the
    # scheduler must refuse to schedule rather than advertise broken events.
    from app.db import SessionLocal
    db = SessionLocal()
    made = ensure_weekly_sets(db, datetime.now(timezone.utc))
    db.commit()
    n_sets = db.query(Competition).filter(Competition.rules_version == SETS_RULES_VERSION).count()
    assert made == 0 and n_sets == 0  # nothing advertised without media
    # With eligible pieces, preflight gates every week's event.
    pieces = [_mk_piece("G 2.47", "uid-a", "short"), _mk_piece("G 2.48", "uid-b", "medium")]
    pre = preflight(db, pieces)
    assert pre["ok"] is False and pre["problems"]
    db.close()


def test_event_progress_means_over_all_pieces(client):
    from app.db import SessionLocal
    from datetime import datetime, timezone as tz
    db = SessionLocal()
    comp = Competition(slug="set-test-1", kind="weekend",
                       opens_at=datetime(2026, 10, 12), closes_at=datetime(2026, 10, 19),
                       results_at=datetime(2026, 10, 21),
                       pieces=[_mk_piece("A", "uid-a", "short"), _mk_piece("B", "uid-b", "medium"),
                               _mk_piece("C", "uid-c", "longer")],
                       status="open", rules_version=SETS_RULES_VERSION)
    db.add(comp)
    db.flush()
    e = CompetitionEntry(competition_id=comp.id, learner_id="learner-x",
                         public_name="X", division="standard")
    db.add(e)
    db.flush()
    record_piece_result(db, e, comp, "A", 1, 80.0)
    record_piece_result(db, e, comp, "B", 2, 90.0)
    prog = event_progress(e, comp)
    assert prog["submitted"] == 2 and prog["total"] == 3
    assert prog["complete"] is False
    import pytest
    assert prog["provisional_total"] == pytest.approx((80 + 90) / 3, abs=0.1)
    # a lower resubmission does not replace the piece best
    changed = record_piece_result(db, e, comp, "A", 3, 50.0)
    assert changed is False
    record_piece_result(db, e, comp, "C", 4, 100.0)
    assert event_progress(e, comp)["complete"] is True
    db.commit()
    db.close()


def test_set_publish_ranks_complete_entries_with_ties(client):
    from app.db import SessionLocal
    db = SessionLocal()
    comp = Competition(slug="set-test-2", kind="weekend",
                       opens_at=datetime(2026, 10, 12), closes_at=datetime(2026, 10, 19),
                       results_at=datetime(2026, 10, 21),
                       pieces=[_mk_piece("A", "uid-a", "short"), _mk_piece("B", "uid-b", "medium")],
                       status="closed", rules_version=SETS_RULES_VERSION)
    db.add(comp)
    db.flush()
    complete_a = CompetitionEntry(competition_id=comp.id, learner_id="l-a",
                                  public_name="A", division="standard")
    complete_a.piece_results = {"A": {"percent": 90.0}, "B": {"percent": 90.0}}
    tie_b = CompetitionEntry(competition_id=comp.id, learner_id="l-b",
                             public_name="B", division="standard")
    tie_b.piece_results = {"A": {"percent": 90.0}, "B": {"percent": 90.0}}
    lower = CompetitionEntry(competition_id=comp.id, learner_id="l-c",
                             public_name="C", division="standard")
    lower.piece_results = {"A": {"percent": 70.0}, "B": {"percent": 70.0}}
    incomplete = CompetitionEntry(competition_id=comp.id, learner_id="l-d",
                                  public_name="D", division="standard")
    incomplete.piece_results = {"A": {"percent": 100.0}}  # one perfect piece only
    beginner = CompetitionEntry(competition_id=comp.id, learner_id="l-e",
                                public_name="E", division="beginner")
    beginner.piece_results = {"A": {"percent": 60.0}, "B": {"percent": 60.0}}
    for e in (complete_a, tie_b, lower, incomplete, beginner):
        db.add(e)
    db.commit()
    ranked = rank_entries_sets(db, comp)
    # incomplete never outranks complete, even with a perfect single piece
    assert ranked[-1].learner_id == "l-d"
    status = publish_sets(db, comp)
    db.expire_all()
    assert status == "published"
    ea = db.query(CompetitionEntry).filter(CompetitionEntry.learner_id == "l-a").first()
    eb = db.query(CompetitionEntry).filter(CompetitionEntry.learner_id == "l-b").first()
    ec = db.query(CompetitionEntry).filter(CompetitionEntry.learner_id == "l-c").first()
    assert ea.final_rank == 1 and eb.final_rank == 1  # shared rank for ties
    assert ec.final_rank == 3  # 1, 1, 3
    assert incomplete.final_rank is None  # outside the final ranked table
    db.close()


def test_monthly_standings_count_only_month_closes(client):
    from app.db import SessionLocal
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    this_month = f"{now.year:04d}-{now.month:02d}"
    comp = Competition(slug=f"set-m-{this_month}", kind="weekend",
                       opens_at=now - timedelta(days=3), closes_at=now - timedelta(days=1),
                       results_at=now + timedelta(days=1),
                       pieces=[_mk_piece("A", "uid-a", "short"), _mk_piece("B", "uid-b", "medium")],
                       status="published", rules_version=SETS_RULES_VERSION)
    db.add(comp)
    db.flush()
    e = CompetitionEntry(competition_id=comp.id, learner_id="l-m",
                         public_name="M", division="standard")
    e.piece_results = {"A": {"percent": 80.0}, "B": {"percent": 60.0}}
    db.add(e)
    db.commit()
    rows = monthly_standings(db, this_month)
    match = [r for r in rows if r["learner_id"] == "l-m"]
    assert match and match[0]["average"] == 70.0
    db.close()
