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
    for claim in ("Sarvam AI", "then discarded", "never leave", "under 13", "Delete account"):
        assert claim in text, claim


def test_delete_page_gives_both_routes(client):
    text = client.get("/delete-account").text
    assert "In the app" in text and "Without the app" in text


def test_privacy_policy_says_what_happens_to_a_handwriting_photo(client):
    """Photos are read by Sarvam AI (routers/writing.py photo-check), so the page
    may not say they never leave the phone. What a drawing does is unchanged."""
    text = " ".join(client.get("/privacy").text.split())  # the HTML wraps mid-sentence
    assert "check a photo of your handwriting" in text
    assert "sent to Sarvam AI to be read, then discarded" in text
    assert "We keep the letter it read, not the photo" in text
    assert "the drawing never leaves your phone" in text
    # the old blanket claim would now be false
    assert "the drawing and the photo never leave" not in text
    assert "photos of your handwriting, are read on your device" not in text
    # Sarvam is listed for the photo reading, ML Kit only for drawings
    assert "and reading photos of your handwriting when you choose to check one" in text
    assert "reads what you draw on your device" in text
