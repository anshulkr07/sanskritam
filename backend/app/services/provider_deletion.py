"""Retryable third-party account erasure; no names, content or plaintext tokens."""
import logging
from app.models import ProviderDeletion
from app.services import apple_signin, community_audio

logger = logging.getLogger("shabd.safety")


def enqueue_stream(db, uid):
    if not db.get(ProviderDeletion, ("stream", uid)):
        db.add(ProviderDeletion(provider="stream", subject=uid))


def enqueue_apple(db, uid, encrypted_authorization):
    """Queue Apple revocation before the learner row (and its token) is deleted."""
    if not encrypted_authorization:
        return
    task = db.get(ProviderDeletion, ("apple", uid))
    if task is None:
        db.add(ProviderDeletion(
            provider="apple", subject=uid, secret=encrypted_authorization,
        ))
    else:
        task.secret = encrypted_authorization


def _process_stream(db, limit):
    done = 0
    for task in db.query(ProviderDeletion).filter_by(provider="stream").order_by(ProviderDeletion.created_at).limit(limit).all():
        try:
            client = community_audio.client()
            if not task.task_id:
                response = client.delete_users(user_ids=[task.subject], user="hard", messages="hard", conversations="hard", calls="hard", files=True)
                task.task_id = response.data.task_id
                db.commit()
            result = client.get_task(task.task_id).data
            if result.status.lower() in {"completed", "complete", "success", "succeeded"} and not result.error:
                db.delete(task)
                db.commit()
                done += 1
            elif result.error or result.status.lower() in {"failed", "error"}:
                task.task_id = ""
                db.commit()
                logger.error("provider_deletion_retry_required provider=stream")
        except Exception:
            db.rollback()
            logger.error("provider_deletion_retry_required provider=stream")
    return done


def _process_apple(db, limit):
    done = 0
    for task in db.query(ProviderDeletion).filter_by(provider="apple").order_by(ProviderDeletion.created_at).limit(limit).all():
        authorization = apple_signin.decrypt_authorization(task.secret)
        if authorization is None:
            # Keep the row: deleting it would silently turn a key-rotation
            # mistake into an unrevoked Apple authorization. The pending count
            # and this log are the signal to restore the right key.
            logger.error("provider_deletion_apple_unreadable_token")
            continue
        try:
            if apple_signin.revoke_refresh_token(*authorization):
                db.delete(task)
                db.commit()
                done += 1
            else:
                logger.error("provider_deletion_retry_required provider=apple")
        except Exception:
            db.rollback()
            logger.error("provider_deletion_retry_required provider=apple")
    return done


def process(db, limit=20):
    """Retry each provider independently; one being off must not block another."""
    done = 0
    if community_audio.enabled():
        done += _process_stream(db, limit)
    done += _process_apple(db, limit)
    return {"completed": done, "pending": db.query(ProviderDeletion).count()}
