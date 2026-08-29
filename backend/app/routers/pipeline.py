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

        # Analyze the target text (shared script detection from the analyzer)
        from app.grading.analyzer import detect_script
        results = analyze_sentence(ch.target_sanskrit, is_iast=(detect_script(ch.target_sanskrit) != "dev"))
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

        # Verify each stored parse is achievable.
        # Use the SAME logic as live grading: feature_set_variants over the
        # analyzer's readings (ambiguous endings produce alternatives), and a
        # stored parse is valid if ANY variant's feature VALUES cover it.
        # (Roles are seed vocabulary labels; features are the linguistics.)
        from app.grading.analyzer import feature_set_variants
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

        variants = feature_set_variants(results)
        if not variants:
            variants = [derived]
        derived_values = [set(v.values()) for v in variants]

        mismatch_details = []
        for i, parse in enumerate(stored_parses):
            expected_values = set(parse.values())
            if not any(expected_values <= dv for dv in derived_values):
                # Report what's missing for this parse
                best = max(derived_values, key=lambda dv: len(expected_values & dv))
                missing = expected_values - best
                mismatch_details.append(
                    f"Parse {i}: features {sorted(missing)} not derivable "
                    f"(closest reading: {sorted(best)})"
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