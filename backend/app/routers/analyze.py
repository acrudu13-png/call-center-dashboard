import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.job import LogEntry
from app.models.rule import QARule
from app.schemas.call import AnalyzeRequest, AnalyzeResponse
from app.schemas.setting import LlmSettings, MainPrompt
from app.services.llm_service import LLMService
from app.services.settings_service import get_setting as _get_setting
from app.auth import get_current_user
from app.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analysis"], dependencies=[Depends(get_current_user)])


def _add_log(db, level: str, message: str):
    entry = LogEntry(timestamp=utcnow(), level=level, source="analysis", message=message)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("", response_model=AnalyzeResponse)
async def analyze_call(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    """Run LLM-based QA analysis on a call."""
    llm_settings = _get_setting(db, "llm", LlmSettings)
    if not llm_settings.openRouterApiKey:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured")

    # Resolve call
    call = db.query(Call).filter(
        (Call.id == payload.callId) | (Call.call_id == payload.callId)
    ).first()
    call_label = call.call_id if call else payload.callId

    # Log start
    _add_log(db, "info", f"Reanalysis started for {call_label}")
    await manager.broadcast({"type": "log", "data": {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Reanalysis started for {call_label}",
    }})

    # Get transcript
    if payload.transcript:
        transcript = [t.model_dump() for t in payload.transcript]
    else:
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        transcript = [
            {"speaker": t.speaker, "timestamp": t.timestamp, "text": t.text}
            for t in call.transcript_lines
        ]
        if not transcript:
            raise HTTPException(status_code=400, detail="No transcript found for this call")

    # Get rules
    rules_query = db.query(QARule).filter(QARule.enabled == True)
    if payload.ruleIds:
        rules_query = rules_query.filter(QARule.rule_id.in_(payload.ruleIds))
    rules = rules_query.order_by(QARule.sort_order).all()

    rules_data = [
        {
            "rule_id": r.rule_id, "title": r.title, "description": r.description,
            "max_score": r.max_score, "rule_type": r.rule_type, "is_critical": r.is_critical,
        }
        for r in rules
    ]

    _add_log(db, "info", f"Sending {call_label} to AI with {len(rules)} rules")
    await manager.broadcast({"type": "log", "data": {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Sending {call_label} to AI with {len(rules)} rules",
    }})

    # Get prompt
    main_prompt_setting = _get_setting(db, "main_prompt", MainPrompt)
    prompt = payload.mainPrompt or main_prompt_setting.prompt or None

    # Run analysis
    try:
        llm = LLMService(llm_settings)
        result = await llm.analyze_call(transcript, rules_data, main_prompt=prompt)
    except Exception as e:
        _add_log(db, "error", f"Reanalysis failed for {call_label}: {e}")
        await manager.broadcast({"type": "log", "data": {
            "timestamp": utcnow().isoformat(), "level": "error",
            "source": "analysis", "message": f"Reanalysis failed for {call_label}: {e}",
        }})
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # Save results to the call record
    if call:
        call.qa_score = result.overallScore
        call.ai_summary = result.summary
        call.ai_grade = result.grade
        call.ai_improvement_advice = result.improvementAdvice
        call.ai_total_earned = result.totalEarned
        call.ai_total_possible = result.totalPossible
        call.has_critical_failure = result.hasCriticalFailure
        call.critical_failure_reason = result.criticalFailureReason
        call.rules_failed = [r.ruleId for r in result.results if not r.passed]
        call.compliance_pass = not result.hasCriticalFailure
        call.status = "flagged" if result.hasCriticalFailure else "completed"

        # Replace scorecard entries
        db.query(ScorecardEntry).filter(ScorecardEntry.call_id == call.id).delete()
        for r in result.results:
            db.add(ScorecardEntry(
                call_id=call.id, rule_id=r.ruleId, rule_title=r.ruleTitle,
                passed=r.passed, score=r.score, max_score=r.maxScore,
                details=r.details, extracted_value=r.extractedValue,
            ))
        db.commit()

    # Log completion
    _add_log(db, "info", f"Reanalysis complete for {call_label}: {result.grade} ({result.overallScore}%)")
    await manager.broadcast({"type": "log", "data": {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Reanalysis complete for {call_label}: {result.grade} ({result.overallScore}%)",
    }})

    return result
