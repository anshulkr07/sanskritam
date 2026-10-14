"""Public legal pages Google Play requires: /privacy and /delete-account."""

import pytest

from app.config import settings

PAGES = ["/privacy", "/delete-account"]


@pytest.mark.parametrize("path", PAGES)
def test_page_is_public_html(client, path):
    r = client.get(path)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"].startswith("text/html")


@pytest.mark.parametrize("path", PAGES)
def test_page_links_the_contact_email(client, monkeypatch, path):
    monkeypatch.setattr(settings, "legal_contact_email", "help@example.com")
    assert 'href="mailto:help@example.com"' in client.get(path).text


@pytest.mark.parametrize("path", PAGES)
def test_missing_contact_email_is_visible_not_blank(client, monkeypatch, path):
    monkeypatch.setattr(settings, "legal_contact_email", "")
    assert "contact email not configured" in client.get(path).text


def test_privacy_policy_states_what_leaves_the_device(client):
    text = client.get("/privacy").text
    for claim in ("Sarvam AI", "turned into text", "don't store the recording", "never leave", "under 13", "Delete account"):
        assert claim in text, claim


def test_delete_page_gives_both_routes(client):
    text = client.get("/delete-account").text
    assert "In the app" in text and "Without the app" in text


def test_privacy_policy_says_what_happens_to_a_handwriting_photo(client):
    """Photos are read by Sarvam AI (routers/writing.py photo-check), so the page
    may not say they never leave the phone. What a drawing does is unchanged."""
    text = " ".join(client.get("/privacy").text.split())  # the HTML wraps mid-sentence
    assert "check a photo of your handwriting" in text
    assert "the photo is sent to Sarvam AI to be read" in text
    assert "We keep the letter it read and don't store the photo on our servers" in text
    assert "the drawing never leaves your phone" in text
    # the old blanket claim would now be false
    assert "the drawing and the photo never leave" not in text
    assert "photos of your handwriting, are read on your device" not in text
    # Sarvam is listed for the photo reading, ML Kit only for drawings
    assert "and reading photos of your handwriting when you choose to check one" in text
    assert "reads what you draw on your device" in text


def _flat(client, path="/privacy"):
    return " ".join(client.get(path).text.split())


def test_privacy_policy_discloses_ask_and_the_free_gemini_route(client):
    """Ask goes to Google's Gemini (services/gemini_pool: free keys first, paid Vertex
    after). The free tier lets Google use what is sent, and only a chart or a match
    is kept off it, so the page must say both."""
    text = _flat(client)
    for claim in (
        "Questions in Ask",
        "are sent to Google's Gemini models",
        "We send no name or account ID with them",
        "we don't keep your question with your account",
        "the birth date, time and place you enter",
        "Google's embedding model",
        "200 characters or fewer",
        "free Gemini service",
        "use it to improve its products",
        "A request with birth or match details never uses that service",
    ):
        assert claim in text, claim


def test_privacy_policy_covers_recitation_and_competitions(client):
    text = _flat(client)
    for claim in (
        "Reciting a verse",
        "the whole recording is sent to Sarvam AI to be turned into text",
        "marks that text syllable by syllable",
        "measures the pauses and pace from the recording",
        "Competitions",
        "aged 18 or over",
        "sign in with Google or Apple",
        "choose a public name",
        "certificates, which anyone with the link can open",
        "scored the same way as a practice recitation",
        "best counted recording of each verse",
        "each picture is checked on your phone and deleted at once",
        "no picture leaves it",
        "until 30 days after the results",
        "needed to send it and use them only for that",
        "Competitions are only for people aged 18 or over",
    ):
        assert claim in text, claim


def test_privacy_policy_names_the_new_processors(client):
    text = _flat(client)
    for claim in (
        "Google (Gemini)",
        "Google Cloud",
        "Mumbai region",
        "Cloudflare",
        "stores and delivers the lesson and chant audio files",
        "including recitations, live and after you stop",
        "Supabase",
        "checks that your eyes are closed during a competition recitation",
    ):
        assert claim in text, claim


def test_privacy_policy_says_where_recitations_go(client):
    """Recitations are transcribed by Sarvam (SCORER_URL=sarvam, live captions
    in services/recite_stream.py) and never by a Google model; the page must
    say both and keep the camera promise."""
    text = _flat(client)
    assert "the sound goes through our server to Sarvam AI" in text
    assert "It is not sent to Google's AI models" in text
    assert "no picture leaves it" in text


def test_privacy_policy_date_is_current(client):
    assert "last updated 14 October 2026" in _flat(client)


def test_delete_page_lists_the_competition_and_recitation_data(client):
    text = _flat(client, "/delete-account")
    for claim in (
        "Your recitation results",
        "Your competition entries, public name, confirmations, certificates, monthly-winner records, and any competition recording we still hold",
        "any competition recording we still hold",
        "A general question and its answer stored for other learners carry no account details",
    ):
        assert claim in text, claim


def test_policy_sentence_about_birth_details_matches_the_setting():
    """The page says a request with birth or match details never uses the free
    Gemini service. That is true only while this stays off (ask_live.py marks such a
    request private; services/gemini_pool.py then skips the free keys). Turn it on and
    the page must change first."""
    assert settings.gemini_free_allow_personal is False
