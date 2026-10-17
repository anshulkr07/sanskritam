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
