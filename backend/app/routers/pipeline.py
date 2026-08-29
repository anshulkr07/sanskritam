"""Content validation pipeline: POST /pipeline/run."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.db import get_db
from app.grading.analyzer import analyze_sentence, feature_set_from_results, is_confident
from app.models import Challenge
from app.schemas import PipelineReport

router = APIRouter()


@router.post("/pipeline/run", response_model=PipelineReport)
async def run_pipeline(
    _admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Content validation pipeline: re-derive features from every challenge,
    re-verify accepted_parses, report anomalies.

    Non-destructive: reads challenges, compares analyzer output with stored parses.
    """
    challenges = db.query(Challenge).all()
    anomalies: list[dict] = []
    details: list[dict] = []

    passed = 0
    failed = 0

    for ch in challenges:
        result = {
            "id": ch.id,
            "target": ch.target_sanskrit,
            "register": ch.register,
        }

        # Analyze the target text
        has_dev = any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in ch.target_sanskrit)
        results = analyze_sentence(ch.target_sanskrit, is_iast=not has_dev)
        derived = feature_set_from_results(results)
        confident = is_confident(results)

        if not confident:
            anomaly = {
                "challenge_id": ch.id,
                "type": "low_confidence",
                "detail": f"Analyzer could not confidently parse: {ch.target_sanskrit}",
            }
            anomalies.append(anomaly)
            result["status"] = "low_confidence"
            failed += 1
            details.append(result)
            continue

        # Check that derived features are compatible with stored accepted_parses
        stored_parses = ch.accepted_parses or []
        if not stored_parses:
            anomaly = {
                "challenge_id": ch.id,
                "type": "missing_accepted_parses",
                "detail": "Challenge has no accepted_parses defined",
            }
            anomalies.append(anomaly)
            result["status"] = "missing_parses"
            failed += 1
            details.append(result)
            continue

        # Verify each stored parse is achievable
        mismatch_details = []
        for i, parse in enumerate(stored_parses):
            for role, feature_val in parse.items():
                derived_val = derived.get(role)
                if derived_val is None:
                    mismatch_details.append(
                        f"Word '{role}' with feature '{feature_val}' not found in derived parses"
                    )
                elif derived_val != feature_val:
                    mismatch_details.append(
                        f"Word '{role}': stored '{feature_val}' != derived '{derived_val}'"
                    )

        if mismatch_details:
            anomaly = {
                "challenge_id": ch.id,
                "type": "parse_mismatch",
                "detail": "; ".join(mismatch_details),
            }
            anomalies.append(anomaly)
            result["status"] = "parse_mismatch"
            result["mismatches"] = mismatch_details
            failed += 1
        else:
            result["status"] = "pass"
            passed += 1

        details.append(result)

    return PipelineReport(
        total=len(challenges),
        passed=passed,
        failed=failed,
        anomalies=anomalies,
        details=details,
    )