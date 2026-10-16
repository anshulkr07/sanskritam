"""First-party operating report; provider estimates are separate from settlements."""
from sqlalchemy import func
from app.models import UsageEvent
from app.commerce.models import Purchase, ReferralReward, Wallet, PrizeCase
from app.commerce import service as svc


def operating_report(db):
    start = svc.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    net = db.query(func.sum(Purchase.net_inr_paise)).filter(Purchase.paid_at >= start, Purchase.state == "paid").scalar() or 0
    liability = db.query(func.sum(ReferralReward.inr_paise)).filter(ReferralReward.state.in_(["pending", "requested"])).scalar() or 0
    # Settled receipts must also cover referral rewards already paid from them.
    paid_referrals = db.query(func.sum(ReferralReward.inr_paise)).join(Purchase, Purchase.id == ReferralReward.purchase_id).filter(
        Purchase.paid_at >= start, ReferralReward.state.in_(["paid", "clawback"])).scalar() or 0
    credits = sum(max(0, row.balance) for row in db.query(Wallet))
    from app.services.quota import _price_inr
    usage = [{"surface": surface, "kind": kind, "units": float(amount or 0),
              "estimated_inr": round(float(amount or 0) * _price_inr(kind), 4)}
             for surface, kind, amount in db.query(UsageEvent.surface, UsageEvent.kind, func.sum(UsageEvent.amount)).filter(
                 UsageEvent.ts >= start).group_by(UsageEvent.surface, UsageEvent.kind)]
    cost_paise = round(sum(r["estimated_inr"] for r in usage) * 100)
    prizes = db.query(func.sum(PrizeCase.cost_inr_paise - PrizeCase.sponsor_inr_paise)).filter_by(month=start.strftime("%Y-%m")).scalar() or 0
    fixed = svc.setting(db, "marketing", {}).get("fixed_costs_inr_paise")
    available = max(0, net - liability - paid_referrals - cost_paise - prizes - credits * 10 - (fixed or 0))
    return {"month": start.strftime("%Y-%m"), "settled_net_inr_paise": net,
            "pending_referral_liability_inr_paise": liability, "outstanding_credits": credits,
            "paid_referral_cost_inr_paise": paid_referrals,
            "credit_service_reserve_inr_paise": credits * 10, "own_prize_budget_used_inr_paise": prizes,
            "estimated_provider_cost_inr_paise": cost_paise, "usage": usage,
            "fixed_costs_inr_paise": fixed, "marketing_budget_provisional": fixed is None,
            "suggested_marketing_budget_inr_paise": (900000 + available) if net else 1500000,
            "cost_note": "Provider estimates use configured unit rates, not invoice reconciliation. Record settlements and fixed costs before relying on this budget."}
