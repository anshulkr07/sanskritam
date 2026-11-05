"""Public disclosures describe the actual free launch and deletion paths."""
import pytest
from app.config import settings

@pytest.mark.parametrize("path", ["/privacy", "/delete-account"])
def test_public_legal_document(client, path):
    response=client.get(path)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Vedic Valor" in response.text
    assert "Anshul Kumar" not in response.text

@pytest.mark.parametrize("path", ["/privacy", "/delete-account"])
def test_contact_is_configured_and_escaped(client, monkeypatch, path):
    monkeypatch.setattr(settings,"legal_contact_email","help@example.com")
    assert 'href="mailto:help@example.com"' in client.get(path).text
    monkeypatch.setattr(settings,"legal_contact_email","")
    assert "contact email not configured" in client.get(path).text

def test_release_disclosures_and_actual_processors(client):
    text=client.get("/privacy").text
    for claim in ("no memberships", "purchases", "advertising", "Group chat", "Voice companions", "Sarvam AI", "Google Gemini", "Vertex AI", "ML Kit", "YouTube", "Cloudflare", "Supabase", "free Gemini service", "improve products"):
        assert claim in text
    assert "This release" in text
    assert "17 October 2026" in text

def test_camera_and_voice_disclosures_are_not_contradictory(client):
    text=client.get("/privacy").text
    assert "photo is sent through our server to Sarvam AI" in text
    assert "camera frames are analysed and discarded on your phone" in text
    assert "not practice audio on our servers" in text
    assert "Photos stay on this phone" not in text


def test_optional_ads_disclosures_match_enabled_hybrid_release(client, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", True)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", True)
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    text = client.get("/privacy").text
    assert "Google Mobile Ads" in text and "non-personalized" in text
    assert "purchased editions contain no ads" in text
    assert "Lite and Plus are ad-free" in text
    assert "We do not sell personal data or share it for advertising" not in text
    assert "Advertising, Group chat" not in text

def test_ads_disclosure_when_ads_launch_before_purchases(client, monkeypatch):
    monkeypatch.setattr(settings, "commerce_enabled", False)
    monkeypatch.setattr(settings, "commerce_hybrid_enabled", False)
    monkeypatch.setattr(settings, "commerce_ads_enabled", True)
    text = client.get("/privacy").text
    assert "The free app shows ads" in text and "Google Mobile Ads" in text and "non-personalized" in text
    assert "full-screen ad may also appear between verses" in text
    assert "does not initialise advertising SDKs" not in text and "purchases, advertising," not in text
    assert "Lite and Plus are ad-free" not in text and "rewarded" not in text
    assert "We do not sell personal data or share it for advertising" not in text

def test_deletion_includes_provider_erasure_and_retry(client):
    for path in ("/privacy", "/delete-account"):
        text=client.get(path).text
        assert "Stream" in text
        assert "retry" in text or "retries" in text
        assert "until" in text and "confirms" in text or "until confirmed" in text
        assert "we don't ask Stream" not in text
    text=client.get("/delete-account").text
    assert "In the app" in text and "Without the app" in text
    assert "within 30 days" in text
    assert "account deletion does not cancel" in text

def test_safety_reports_have_a_contact_and_review_process(client):
    text=client.get("/privacy").text
    assert "checks the queue daily" in text
    assert "withdraw answers" in text
    assert "sanskritam@vedicvalor.com" in text
    assert settings.gemini_free_allow_personal is False
