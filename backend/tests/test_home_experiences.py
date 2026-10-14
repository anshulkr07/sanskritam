import json
from pathlib import Path
import re
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

@pytest.fixture
def db():
    from app.db import Base
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session: yield session
    engine.dispose()

from app.seeds.writing_paths import writing_paths
from app.services.parva_content import check_draft

SEEDS = Path(__file__).resolve().parents[1] / "app/seeds"

def test_matras_attach_to_the_actual_stem():
    base = writing_paths("क")
    below = writing_paths("कु")
    # The added vowel stroke starts where the central stem ends.
    stem_numbers = re.findall(r"-?\d+(?:\.\d+)?", base[0]["d"])
    added = re.findall(r"-?\d+(?:\.\d+)?", below[-1]["d"])
    assert added[:2] == stem_numbers[-2:]

def test_words_are_not_fake_separate_conjuncts():
    assert writing_paths("कमल")
    assert writing_paths("का") != writing_paths("क")
    assert writing_paths("पुस्तकम्") == []
    assert writing_paths("क्ष") == []

def test_all_seed_festival_options_have_provenance_and_matching_languages():
    for path in (SEEDS / "parva").glob("*.en.json"):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if doc.get("status") != "approved": continue
        hi_path = path.with_name(path.name.replace(".en.json", ".hi.json"))
        assert check_draft(doc["body"]) == [], path.name
        assert len(doc["body"]["do"].get("budget", [])) >= 2, path.name
        if hi_path.exists():
            hi = json.loads(hi_path.read_text(encoding="utf-8"))
            assert check_draft(hi["body"]) == [], hi_path.name
            assert len(doc["body"]["do"]["budget"]) == len(hi["body"]["do"]["budget"])

def test_reviewed_insights_seed_preserves_withdrawals_and_rotates(db):
    from app.seeds.home_insights import INSIGHTS, seed_home_insights
    from app.models import FactCard
    from app.services.daily_content import fact_for_day
    seed_home_insights(db)
    seed_home_insights(db)
    assert db.query(FactCard).filter(FactCard.made_by == "reviewed").count() == len(INSIGHTS)
    ids = {fact_for_day(db, f"2026-10-{d:02d}").id for d in range(1, 7)}
    assert ids == {x["id"] for x in INSIGHTS}
    row = db.get(FactCard, INSIGHTS[0]["id"])
    row.status = "withdrawn"
    seed_home_insights(db)
    assert row.status == "withdrawn"

def test_inherited_words_do_not_claim_direct_borrowing():
    from app.services.word_origins import relation_of
    assert relation_of({"kind": "inherit", "hops": []}) == "inherited"
    data = json.loads((SEEDS / "word_origins/batch-0001.json").read_text(encoding="utf-8"))
    routes = next(item for item in data["items"] if item["id"] == "ratri")["routes"]
    assert {r["lang"] for r in routes} >= {"ta", "kn", "te", "ur", "hi"}
    assert all(r["source_url"].startswith("https://") for r in routes)
