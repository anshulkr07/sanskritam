"""Content-well health guard (P7-7).

The defect P7-6 fixed was silent: the śloka well emptied and only a human
counting rows two days later noticed. These tests make the well's condition a
checked invariant — a red test is the mechanism, and the failure names the well.
"""


def test_content_well_report_requires_admin(client):
    r = client.get("/admin/content-wells")
    assert r.status_code == 401


def test_content_well_report_shape(client):
    r = client.get("/admin/content-wells", headers={"X-Admin-Token": "test-admin"})
    assert r.status_code == 200
    d = r.json()
    for well in ("daily_word", "shloka"):
        assert well in d["wells"], f"missing well {well}"
        w = d["wells"][well]
        for field in ("rows_total", "rows_remaining", "runway_days"):
            assert field in w, f"{well} missing {field}"
    assert set(d["scenarios"]) == {"approved", "pending", "rejected"}
    assert isinstance(d["healthy"], bool)


def test_no_daily_surface_runs_out_silently(client):
    """P7-7 guard: every daily well keeps >= MIN_RUNWAY_DAYS of distinct
    content and at least one approved scenario exists. When a floor is
    breached the assertion FAILS and NAMES the offending well — this is the
    mechanism that would have caught P7-6's empty well on day one."""
    from app.db import SessionLocal
    from app.services.content_well import (
        MIN_APPROVED_SCENARIOS,
        MIN_RUNWAY_DAYS,
        content_well_report,
    )

    db = SessionLocal()
    try:
        report = content_well_report(db)
    finally:
        db.close()

    assert not report["issues"]["low_runway_wells"], (
        f"daily wells below {MIN_RUNWAY_DAYS} days of distinct runway: "
        f"{report['issues']['low_runway_wells']}"
    )
    assert not report["issues"]["low_approved"], (
        f"approved scenarios below {MIN_APPROVED_SCENARIOS}: "
        f"{report['scenarios']['approved']}"
    )