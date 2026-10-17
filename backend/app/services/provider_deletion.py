"""Retryable third-party account erasure; no names, content or access tokens."""
import logging
from app.models import ProviderDeletion
from app.services import community_audio

logger = logging.getLogger("shabd.safety")

def enqueue_stream(db, uid):
    if not db.get(ProviderDeletion, ("stream", uid)):
        db.add(ProviderDeletion(provider="stream", subject=uid))

def process(db, limit=20):
    done = 0
    if not community_audio.enabled():
        return {"completed": 0, "pending": db.query(ProviderDeletion).count()}
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
    return {"completed": done, "pending": db.query(ProviderDeletion).count()}
