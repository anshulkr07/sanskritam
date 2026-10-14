"""Audio only Stream boundary. Tokens are restricted to one authorized call."""

from functools import lru_cache, wraps
from fastapi import HTTPException
from app.config import settings


def upstream(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        from getstream.exceptions import StreamApiException
        import httpx

        try:
            return fn(*args, **kwargs)
        except (StreamApiException, httpx.RequestError) as exc:
            import logging

            logging.getLogger(__name__).warning(
                "Community audio provider failure: %s", type(exc).__name__
            )
            raise HTTPException(
                502, "Audio is temporarily unavailable. Please try again."
            ) from None

    return wrapped


def enabled():
    return bool(settings.stream_api_key and settings.stream_api_secret)


@lru_cache(maxsize=1)
def client():
    if not enabled():
        raise HTTPException(
            503, "Live audio is not configured yet. Chats and groups are available."
        )
    from getstream import Stream

    return Stream(settings.stream_api_key, settings.stream_api_secret, timeout=12)


@upstream
def users(learners):
    from getstream.models import UserRequest

    client().upsert_users(
        *[
            UserRequest(id=u.id, name=u.display_name or "Sanskrit Learner")
            for u in learners
        ]
    )


@upstream
def create(kind, call_id, creator, members, title):
    from getstream.models import (
        CallRequest,
        MemberRequest,
        CallSettingsRequest,
        VideoSettingsRequest,
        TargetResolution,
        AudioSettingsRequest,
        BackstageSettingsRequest,
        ScreensharingSettingsRequest,
        RecordSettingsRequest,
        TranscriptionSettingsRequest,
    )

    users(members)
    call = client().video.call(kind, call_id)
    call.get_or_create(
        data=CallRequest(
            created_by_id=creator.id,
            members=[
                MemberRequest(
                    user_id=u.id, role="admin" if u.id == creator.id else "user"
                )
                for u in members
            ],
            custom={"title": title},
            settings_override=CallSettingsRequest(
                video=VideoSettingsRequest(
                    enabled=False,
                    camera_default_on=False,
                    target_resolution=TargetResolution(width=240, height=240),
                ),
                audio=AudioSettingsRequest(
                    default_device="speaker",
                    mic_default_on=False,
                    access_request_enabled=True,
                ),
                backstage=BackstageSettingsRequest(enabled=False),
                screensharing=ScreensharingSettingsRequest(enabled=False),
                recording=RecordSettingsRequest(mode="disabled"),
                transcription=TranscriptionSettingsRequest(mode="disabled"),
            ),
        ),
        video=False,
    )
    return call


def token(user_id, kind, call_id):
    return {
        "api_key": settings.stream_api_key,
        "user_id": user_id,
        "token": client().create_call_token(
            user_id, call_cids=[f"{kind}:{call_id}"], expiration=3600
        ),
    }


@upstream
def permission(room_id, user_id, allow):
    from getstream.models import MemberRequest

    call = client().video.call("audio_room", room_id)
    call.update_call_members(
        update_members=[
            MemberRequest(user_id=user_id, role="speaker" if allow else "user")
        ]
    )
    call.update_user_permissions(
        user_id=user_id,
        grant_permissions=["send-audio"] if allow else [],
        revoke_permissions=[] if allow else ["send-audio"],
    )


@upstream
def end(kind, call_id):
    client().video.call(kind, call_id).end()


@lru_cache(maxsize=8)
def _occupancy(cids, window):
    response = client().video.query_calls(
        filter_conditions={"cid": {"$in": list(cids)}}, limit=100
    )
    result = {}
    for state in response.data.calls:
        call = state.call
        session = call.session
        if not session or session.ended_at:
            result[call.id] = {"participant_count": 0, "speakers": []}
            continue
        result[call.id] = {
            "participant_count": sum(session.participants_count_by_role.values()),
            "speakers": [
                {"id": p.user.id, "name": p.user.name or "Learner"}
                for p in session.participants
                if p.role in ("admin", "host", "speaker")
            ][:4],
        }
    return result


def occupancy(room_ids):
    if not room_ids or not enabled():
        return {}
    import time

    try:
        return _occupancy(
            tuple("audio_room:" + rid for rid in sorted(room_ids)),
            int(time.monotonic() // 10),
        )
    except Exception:
        # A directory still works when Stream is temporarily unavailable.
        return {}
