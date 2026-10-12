from app.db import SessionLocal
from app.models import ErrorLog


def test_render_failure_is_logged_without_learner_content(client, caplog):
    login = client.post("/auth/dev-login", json={"display_name": "client-errors"}).json()
    headers = {"Authorization": f"Bearer {login['token']}"}
    payload = {"route": "ParvaPage", "error_type": "TypeError", "components": ["ParvaPageScreen", "RootNavigator"]}
    assert client.post("/feedback/client-error", json=payload, headers=headers).status_code == 204
    with SessionLocal() as db:
        row = db.query(ErrorLog).filter(ErrorLog.route == "mobile/ParvaPage").order_by(ErrorLog.id.desc()).first()
        assert row.error_type == "TypeError"
        assert row.traceback == "ParvaPageScreen > RootNavigator"
    assert "client_render_error" in caplog.text
    assert login["token"] not in caplog.text


def test_render_diagnostics_require_auth_and_reject_free_text(client):
    payload = {"route": "Conversation", "error_type": "Error", "components": []}
    assert client.post("/feedback/client-error", json=payload).status_code == 401
    login = client.post("/auth/dev-login", json={"display_name": "client-errors-validation"}).json()
    headers = {"Authorization": f"Bearer {login['token']}"}
    for invalid in ({"components": ["learner question here"]}, {"route": "route?question=private"},
                    {"error_type": "private exception message"}, {"components": ["Component"] * 21}):
        assert client.post("/feedback/client-error", json=payload | invalid, headers=headers).status_code == 422
