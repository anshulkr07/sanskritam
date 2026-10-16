"""Reconcile store truth, stale reservations and private organizer audio.

Dry-run by default. --apply writes only after reading signed/store-verified data.
Run against the intended deployment with its secret-manager configuration.
"""
import argparse
import asyncio
import json
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.commerce import stores, service as svc
from app.commerce.models import Purchase, Membership, Wallet, EventEntry, HostedEvent, Setting
from app.commerce.router import decrypt_proof, encrypt_proof
from app.config import settings
from app.db import SessionLocal
from app.models import Learner
from app.commerce.catalogue import PRODUCTS


async def run(apply):
    with SessionLocal() as db:
        rows = db.query(Purchase).filter_by(state="paid").all()
        print(json.dumps({"mode": "apply" if apply else "dry-run", "purchases": len(rows)}))
        for row in rows:
            try:
                if not db.get(Learner, row.learner_id):
                    continue
                if row.provider == "google":
                    token = row.evidence.get("encrypted_token")
                    if not token:
                        continue
                    token = decrypt_proof(token)
                    value = await stores.verify_google(row.product_id, token, row.learner_id)
                    value["evidence"]["encrypted_token"] = encrypt_proof(token)
                    # Check this historical order for a missed refund independently
                    # of the current subscription's latest successful order.
                    if row.transaction_id != value["transaction_id"]:
                        from urllib.parse import quote
                        old_order = await stores.google_request("orders/" + quote(row.transaction_id, safe=""))
                        if old_order.get("state") == "REFUNDED" and apply:
                            svc.refund_purchase(db, row)
                            db.commit()
                    if PRODUCTS[row.product_id]["kind"] == "subscription":
                        known = {p.transaction_id for p in db.query(Purchase).filter_by(provider="google", original_id=row.original_id)}
                        history = await stores.google_subscription_history(token, value, known)
                        for period in history:
                            if apply and not period.get("revoked"):
                                svc.apply_purchase(db, row.learner_id, period)
                                db.commit()
                else:
                    if PRODUCTS.get(row.product_id, {}).get("kind") == "subscription":
                        values = await asyncio.to_thread(stores.current_apple_transactions, row.original_id, row.learner_id)
                        for value in values:
                            if apply:
                                old = db.query(Purchase).filter_by(provider="apple", transaction_id=value["transaction_id"]).first()
                                if value.get("revoked") and old:
                                    svc.refund_purchase(db, old)
                                elif not value.get("revoked"):
                                    svc.apply_purchase(db, row.learner_id, value)
                                db.commit()
                        continue
                    from appstoreserverlibrary.api_client import AppStoreServerAPIClient
                    from appstoreserverlibrary.models.Environment import Environment
                    if not settings.commerce_apple_private_key_path:
                        continue
                    env = Environment.PRODUCTION if settings.commerce_store_environment == "Production" else Environment.SANDBOX
                    client = AppStoreServerAPIClient(Path(settings.commerce_apple_private_key_path).read_bytes(),
                        settings.commerce_apple_key_id, settings.commerce_apple_issuer_id, settings.commerce_bundle_id, env)
                    response = await asyncio.to_thread(client.get_transaction_info, row.transaction_id)
                    value = stores.verify_apple(response.signedTransactionInfo, row.learner_id)
                print(json.dumps({"purchase_id": row.id, "revoked": value.get("revoked", False)}))
                if apply:
                    if value.get("revoked"):
                        svc.refund_purchase(db, row)
                    else:
                        svc.apply_purchase(db, row.learner_id, value)
                    db.commit()
                    if row.provider == "google" and not value.get("revoked"):
                        try:
                            await stores.finish_google(row.product_id, token)
                        except Exception:
                            pass
            except Exception as exc:
                db.rollback()
                # Never print receipt tokens, keys, or vendor exception bodies.
                print(json.dumps({"purchase_id": row.id, "error_type": type(exc).__name__}))
        if apply:
            for wallet in db.query(Wallet).all():
                locked = svc.lock_wallet(db, wallet.learner_id)
                svc.expire_reservations(db, locked)
                db.commit()
            from app.services.storage import get_storage
            for task in db.query(Setting).filter(Setting.key.like("private_cleanup:%")).all():
                try:
                    get_storage().delete_private(task.value["key"])
                    db.delete(task)
                    db.commit()
                except Exception:
                    db.rollback()
            cutoff = svc.now() - timedelta(days=30)
            for entry in db.query(EventEntry).filter(EventEntry.audio_key.isnot(None)).all():
                event = db.get(HostedEvent, entry.event_id)
                if event and (stores.iso(event.details["ends_at"]) if event.details.get("ends_at") else event.created_at) < cutoff:
                    get_storage().delete_private(entry.audio_key)
                    entry.audio_key = None
            db.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    asyncio.run(run(parser.parse_args().apply))
