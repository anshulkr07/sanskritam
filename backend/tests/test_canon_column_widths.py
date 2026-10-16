"""Canon seed strings must fit the columns production has.

SQLite ignores String(n), Postgres does not: an over-long seed string passes
every test here and then takes the Cloud Run revision down at startup with
``StringDataRightTruncation`` (shabd-api-00081 for ``notes``, -00083 for
``licence``).  Checked against the model's declared widths, so a field that is
String(n) in the model and longer than n in the seed fails here.  The
migrations must keep production aligned with the model.
"""
import sqlalchemy as sa

from app.models import CanonText
from app.seeds.canon import CANON_TEXTS


def test_canon_seed_fits_declared_column_widths():
    widths = {
        col.key: col.type.length
        for col in CanonText.__table__.columns
        if isinstance(col.type, sa.String) and not isinstance(col.type, sa.Text) and col.type.length
    }
    over = [
        (t["slug"], field, len(t[field]), widths[field])
        for t in CANON_TEXTS
        for field in widths
        if isinstance(t.get(field), str) and len(t[field]) > widths[field]
    ]
    assert not over, f"canon seed longer than its column (slug, field, length, width): {over}"


def test_verbatim_licence_and_notes_are_unbounded_text():
    # The Kaṭha/Muṇḍaka licences and notes run past 512 chars; the model and
    # the 20261016_canon_* migrations keep both columns Text.
    for name in ("licence", "notes"):
        assert isinstance(CanonText.__table__.c[name].type, sa.Text), name
