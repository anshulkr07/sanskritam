import time
import pytest
from app.services.learning_state import merge


def test_bookmarks_merge_without_awarding_mastery(client, auth_headers):
    stamp = int(time.time() * 1000)
    before = client.get("/me", headers=auth_headers).json()["learner"]["feature_mastery"]
    first = client.put("/me/learning-state", headers=auth_headers, json={"entries": {
        "shabd.learning.goal": {"value": "read", "updated_ms": stamp},
        "shabd.read.position.gita": {"value": "12", "updated_ms": stamp},
    }})
    assert first.status_code == 200, first.text
    second = client.put("/me/learning-state", headers=auth_headers, json={"entries": {
        "shabd.learning.goal": {"value": "speak", "updated_ms": stamp - 1},
        "shabd.read.position.isha": {"value": "3", "updated_ms": stamp},
    }}).json()["entries"]
    assert second["shabd.learning.goal"]["value"] == "read"
    assert second["shabd.read.position.gita"]["value"] == "12"
    assert second["shabd.read.position.isha"]["value"] == "3"
    assert client.get("/me", headers=auth_headers).json()["learner"]["feature_mastery"] == before


def test_state_is_isolated_between_accounts(client, auth_headers):
    other = client.post("/auth/dev-login", json={"display_name": "bookmark-isolation"}).json()
    headers = {"Authorization": "Bearer " + other["token"]}
    assert client.get("/me/learning-state", headers=headers).json() == {"entries": {}}
    assert client.get("/me/learning-state").status_code == 401


@pytest.mark.parametrize("entries", [
    {"shabd.token": {"value": "secret", "updated_ms": 1}},
    {"shabd.learning.goal": {"value": "read", "updated_ms": 999999999999999}},
])
def test_rejects_private_keys_and_future_clock(entries):
    with pytest.raises(ValueError):
        merge({}, entries)


def test_native_sanskrit_is_unchanged_even_with_legacy_flags():
    from app.voice_lab.config import LabConfig
    from app.schemas import TTSRequest
    from app.voice_lab.sanskrit_phonetics import SanskritPhoneticRouter
    from app.seeds.challenges import SEED_CHALLENGES
    from app.grading.analyzer import iast_to_devanagari
    assert LabConfig().language == "sa-IN"
    assert TTSRequest(text="native speech").language_code == "sa-IN"
    text = iast_to_devanagari(SEED_CHALLENGES[0]["target_iast"])
    assert SanskritPhoneticRouter.transform(text, "sa-IN", True, True, True) == text


def test_v2_provider_does_not_change_v1_or_enable_max_reasoning():
    from app.evals.providers import build_provider
    old = build_provider("sarvam:sarvam-105b-conversations", api_key="test")
    new = build_provider("sarvam_v2:deepseekv4.1-flash", api_key="test")
    assert old.spec.base_url.endswith("/v1")
    assert new.spec.base_url.endswith("/v2")
    assert new._payload("system", "user", 0, 512, True)["reasoning_effort"] == "low"


def test_testing_budget_cannot_exceed_user_limits(tmp_path):
    from scripts.bench_beta_routes import Budget
    budget = Budget(tmp_path)
    budget.reserve("sarvam_inr", 299, "test")
    budget.reserve("google_usd", 1.99, "test")
    with pytest.raises(RuntimeError):
        budget.reserve("sarvam_inr", 2, "over")
    with pytest.raises(RuntimeError):
        budget.reserve("google_usd", .02, "over")
    restored = Budget(tmp_path)
    assert restored.data["reserved"] == {"sarvam_inr": 299, "google_usd": 1.99}


def test_trail_visits_from_an_older_offline_device_are_not_lost():
    merged = merge({"shabd.trail.v1.visited": {"value": '["a"]', "updated_ms": 20}},
                   {"shabd.trail.v1.visited": {"value": '["b"]', "updated_ms": 10}})
    import json
    assert json.loads(merged["shabd.trail.v1.visited"]["value"]) == ["a", "b"]
