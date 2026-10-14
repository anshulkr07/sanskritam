"""Private R2 retention setup and expiry maintenance.

Run from backend: python scripts/community_retention.py --apply-lifecycle
Scheduled maintenance: python scripts/community_retention.py --cleanup
The lifecycle merge preserves every unrelated rule in the private bucket.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.db import SessionLocal
from app.community_models import (
    CommunityMedia,
    CommunityEvent,
    CommunityTicket,
    CommunityRoom,
    now,
)
from datetime import timedelta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-lifecycle", action="store_true")
    parser.add_argument("--cleanup", action="store_true")
    args = parser.parse_args()
    if not args.apply_lifecycle and not args.cleanup:
        parser.print_help()
        return
    from app.routers.community import object_store

    store, bucket = object_store()
    if args.apply_lifecycle:
        from botocore.exceptions import ClientError

        try:
            rules = store.get_bucket_lifecycle_configuration(Bucket=bucket).get(
                "Rules", []
            )
        except ClientError as e:
            if e.response["Error"]["Code"] not in (
                "NoSuchLifecycleConfiguration",
                "NoSuchLifecycle",
            ):
                raise
            rules = []
        rule = {
            "ID": "community-media-48h",
            "Status": "Enabled",
            "Filter": {"Prefix": "ephemeral-chat/"},
            "Expiration": {"Days": 2},
        }
        rules = [r for r in rules if r.get("ID") != rule["ID"]] + [rule]
        store.put_bucket_lifecycle_configuration(
            Bucket=bucket, LifecycleConfiguration={"Rules": rules}
        )
        print(
            "Private bucket: ephemeral-chat/ expires after two days. Unrelated rules preserved."
        )
    if args.cleanup:
        with SessionLocal() as db:
            rows = (
                db.query(CommunityMedia)
                .filter(CommunityMedia.expires_at <= now())
                .all()
            )
            # Keep tombstone rows for message placeholders; deleting objects is idempotent.
            count = 0
            for row in rows:
                if row.key and not row.key.startswith("deleted/"):
                    store.delete_object(Bucket=bucket, Key=row.key)
                    row.key = "deleted/" + row.id
                    count += 1
            db.query(CommunityEvent).filter(
                CommunityEvent.created_at < now() - timedelta(days=2)
            ).delete()
            db.query(CommunityTicket).filter(
                CommunityTicket.expires_at < now()
            ).delete()
            from app.services import community_audio

            for room in db.query(CommunityRoom).filter(
                CommunityRoom.status == "live",
                CommunityRoom.heartbeat < now() - timedelta(minutes=2),
            ):
                if community_audio.enabled():
                    community_audio.end("audio_room", room.id)
                room.status = "ended"
            db.commit()
            print(
                f"Deleted {count} expired objects; cleared old realtime events and tickets."
            )


if __name__ == "__main__":
    main()
