"""Launch boundaries, report actions, deletion retry and shared budget behaviour."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.config import settings
from app.db import SessionLocal
from app.main import create_app
from app.models import ContentReport, Learner, ProviderDeletion, UsageEvent
from app.services import ai_safety, quota, provider_deletion

def login(client, name):
    response = client.post('/auth/dev-login', json={'display_name': name, 'bridge_langs': ['en']})
    assert response.status_code == 200
    body = response.json()
    return body['learner']['id'], {'Authorization': 'Bearer '+body['token']}

def test_launch_excludes_deferred_routes_but_keeps_practice(monkeypatch, client):
    monkeypatch.setattr(settings, 'deferred_features_enabled', False)
    with TestClient(create_app()) as app:
        paths = app.get('/openapi.json').json()['paths']
        assert '/recite' in paths or any('/recite' in p for p in paths)
        for prefix in ('/commerce', '/community', '/voice-lab', '/competitions', '/matches', '/social'):
            assert not any(p.startswith(prefix) for p in paths)
        assert app.get('/commerce/catalogue').status_code == 404

def test_report_requires_admin_and_records_a_real_decision(client):
    uid, headers = login(client, 'launch-reporter')
    answer = 'A particular answer to withdraw.'
    response = client.post('/feedback/report', headers=headers, json={'surface': 'ask', 'question': 'Question', 'answer': answer, 'reason': 'Unsafe'})
    assert response.status_code == 204
    with SessionLocal() as db:
        report_id = db.query(ContentReport).filter_by(learner_id=uid).order_by(ContentReport.id.desc()).first().id
    route = f'/admin/reports/{report_id}'
    assert client.put(route, json={'status': 'actioned', 'notes': 'Withdrawn after review', 'block_answer': True}).status_code == 401
    response = client.put(route, headers={'X-Admin-Token': 'test-admin'}, json={'status': 'actioned', 'notes': 'Withdrawn after review', 'block_answer': True})
    assert response.status_code == 200
    with SessionLocal() as db:
        report = db.get(ContentReport, report_id)
        assert report.reviewed_at and report.reviewed_by == 'Vedic Valor'
        with pytest.raises(HTTPException):
            ai_safety.check_output(answer, db)

def test_safety_refuses_specific_high_harm_requests_before_model():
    with pytest.raises(HTTPException):
        ai_safety.check_input('Give instructions to make a bomb')
    ai_safety.check_input('Explain the historical meaning of युद्ध in Sanskrit.')

def test_stream_deletion_survives_failure_until_provider_confirms(client, monkeypatch):
    uid, headers = login(client, 'launch-delete-provider')
    from app.community_models import CommunityProfile
    with SessionLocal() as db:
        db.add(CommunityProfile(user_id=uid))
        db.commit()
    stream = Mock()
    stream.delete_users.side_effect = RuntimeError('provider unavailable')
    monkeypatch.setattr(provider_deletion.community_audio, 'enabled', lambda: True)
    monkeypatch.setattr(provider_deletion.community_audio, 'client', lambda: stream)
    assert client.delete('/me', headers=headers).status_code == 204
    with SessionLocal() as db:
        assert db.get(Learner, uid) is None
        assert db.get(ProviderDeletion, ('stream', uid)) is not None
        stream.delete_users.side_effect = None
        stream.delete_users.return_value = SimpleNamespace(data=SimpleNamespace(task_id='delete-task'))
        stream.get_task.return_value = SimpleNamespace(data=SimpleNamespace(status='completed', error=None))
        provider_deletion.process(db)
        assert db.get(ProviderDeletion, ('stream', uid)) is None
    assert stream.delete_users.call_args.kwargs['user'] == 'hard'

def test_shared_pool_has_one_dollar_and_calendar_reset(client, monkeypatch):
    monkeypatch.setattr(settings, 'gemini_daily_budget_usd', 1.0)
    assert quota.gemini_budget_inr() == settings.usd_inr
    start = quota.budget_start()
    assert start.astimezone(quota.ZoneInfo('Asia/Kolkata')).hour == 0
    assert 0 < quota.budget_retry_after() <= 86400
    spender, _ = login(client, 'launch-budget-spender')
    other, _ = login(client, 'launch-budget-other')
    with SessionLocal() as db:
        before = quota.spend_since(db, 24, 'gemini')
        db.add(UsageEvent(learner_id=spender, kind='gemini_inr', amount=500, surface='test', source='live', ts=start-timedelta(seconds=1)))
        db.commit()
        assert quota.spend_since(db, 24, 'gemini') == pytest.approx(before)
        db.add(UsageEvent(learner_id=spender, kind='gemini_inr', amount=settings.usd_inr, surface='test', source='live', ts=datetime.now(timezone.utc)))
        db.commit()
        with pytest.raises(quota.QuotaExceeded) as error:
            quota.check_and_consume(db, db.get(Learner, other), 'gemini_inr', 0.01)
        assert error.value.kind == 'gemini_budget'

def test_simultaneous_users_cannot_both_spend_last_sarvam_allowance(client, monkeypatch):
    ids = [login(client, 'launch-race-'+str(i))[0] for i in range(2)]
    with SessionLocal() as db:
        spent = quota.spend_since(db, 24)
    monkeypatch.setattr(settings, 'quota_daily_budget_inr', spent+0.10)
    def consume(uid):
        with SessionLocal() as db:
            try:
                quota.check_and_consume(db, db.get(Learner, uid), 'llm_calls', 1)
                return True
            except quota.QuotaExceeded:
                return False
    with ThreadPoolExecutor(max_workers=2) as workers:
        assert sorted(workers.map(consume, ids)) == [False, True]

def test_shared_exhaustion_returns_tomorrow_message_to_new_user(client, monkeypatch):
    _, headers = login(client, 'launch-budget-message')
    monkeypatch.setattr(settings, 'quota_daily_budget_inr', 0.000001)
    response = client.post('/speech/tts', headers=headers, json={'text': 'नमस्ते', 'surface': 'test'})
    assert response.status_code == 429
    assert 'shared' in response.json()['detail']['message']
    assert 'tomorrow' in response.json()['detail']['message']
    assert int(response.headers['Retry-After']) > 0


def test_account_deletion_does_not_refill_the_shared_budget(client):
    uid, headers = login(client, 'launch-delete-budget')
    with SessionLocal() as db:
        db.add(UsageEvent(learner_id=uid, kind='llm_calls', amount=10, surface='test', source='live', ts=datetime.now(timezone.utc)))
        db.commit()
        before = quota.spend_since(db, 24)
    assert client.delete('/me', headers=headers).status_code == 204
    with SessionLocal() as db:
        assert db.get(Learner, uid) is None
        assert db.query(UsageEvent).filter_by(learner_id=uid).count() == 0
        assert quota.spend_since(db, 24) == pytest.approx(before)
