"""Story deck (Discover Sanskrit): chapters, cards, attribution, read-only rule.

The deck is backend-driven and read-only: seven ranked chapters, ~40 ranked
cards, every attribution key resolving in the licence registry (P23-4a's
red-on-gap rule, extended), and reading writes nothing.
"""


def _auth_h(client, name="storyuser"):
    r = client.post("/auth/dev-login",
                    json={"display_name": name, "bridge_langs": ["en", "hi"]})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_story_chapters_shape(client):
    h = _auth_h(client, "storyshape")
    chapters = client.get("/story/chapters", headers=h).json()
    assert len(chapters) == 7, f"expected 7 chapters, got {len(chapters)}"
    ranks = [c["rank"] for c in chapters]
    assert ranks == sorted(ranks) == [0, 1, 2, 3, 4, 5, 6]
    assert [c["id"] for c in chapters] == ["s0", "s1", "s2", "s3", "s4", "s5", "s6"]
    for c in chapters:
        assert c["title_en"] and c["title_hi"] and c["blurb"], c["id"]
        assert c["cards"], f"{c['id']} has no cards"


def test_story_card_count_and_order(client):
    h = _auth_h(client, "storycount")
    chapters = client.get("/story/chapters", headers=h).json()
    total = sum(len(c["cards"]) for c in chapters)
    assert total >= 40, f"expected the full arc (~40 cards), got {total}"
    for c in chapters:
        ranks = [k["rank"] for k in c["cards"]]
        assert ranks == sorted(ranks), f"{c['id']} cards not ranked"
        assert len({k["id"] for k in c["cards"]}) == len(c["cards"])
        for k in c["cards"]:
            assert k["chapter_id"] == c["id"]
            assert k["title_en"] and k["body"], k["id"]
            assert len(k["body"].split()) <= 120, f"{k['id']} body over 120 words"


def test_story_cards_filter(client):
    h = _auth_h(client, "storyfilter")
    s2 = client.get("/story/cards?chapter_id=s2", headers=h).json()
    assert len(s2) >= 5, f"s2 should carry the sounds block, got {len(s2)}"
    assert {k["chapter_id"] for k in s2} == {"s2"}
    ranks = [k["rank"] for k in s2]
    assert ranks == sorted(ranks)
    all_cards = client.get("/story/cards", headers=h).json()
    assert len(all_cards) >= 40


def test_story_deep_links_valid(client):
    """Every card's deep_link is a real client route or 'none'."""
    from app.seeds.story_cards import STORY_DEEP_LINKS

    h = _auth_h(client, "storylinks")
    for k in client.get("/story/cards", headers=h).json():
        assert k["deep_link"] in STORY_DEEP_LINKS, f"{k['id']}: {k['deep_link']!r}"
        if k["deep_link"] == "none":
            assert not k["deep_link_label"], k["id"]
        else:
            assert k["deep_link_label"], f"{k['id']} links but has no button text"


def test_story_attribution_resolves(client):
    """Every card's attribution key matches a content_sources row."""
    h = _auth_h(client, "storyattr")
    keys = {r["key"] for r in client.get("/licences", headers=h).json()}
    from app.db import SessionLocal
    from app.models import StoryCard

    db = SessionLocal()
    try:
        for (attr,) in db.query(StoryCard.attribution).distinct().all():
            assert (attr or "") in keys, f"story attribution {attr!r} unattributed"
    finally:
        db.close()


def test_story_examples_carry_iast(client):
    """Cards with a Devanagari example also serve IAST + gloss."""
    h = _auth_h(client, "storyiast")
    cards = client.get("/story/cards", headers=h).json()
    with_example = [k for k in cards if k["example_dev"]]
    assert with_example, "the deck should illustrate with Sanskrit examples"
    for k in with_example:
        assert k["example_iast"], f"{k['id']} has Devanagari but no IAST"
        assert k["example_gloss"], f"{k['id']} has Devanagari but no gloss"


def test_reading_story_writes_nothing(client):
    """There is no attempt/grade endpoint for cards: GET-only resource."""
    h = _auth_h(client, "storynowrite")
    before = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    client.get("/story/chapters", headers=h)
    client.get("/story/cards?chapter_id=s4", headers=h)
    after = client.get("/me", headers=h).json()["learner"]["feature_mastery"]
    assert before == after, "reading the story must not touch mastery"
    assert client.post("/story/chapters", headers=h).status_code in (404, 405)
