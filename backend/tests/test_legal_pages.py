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
