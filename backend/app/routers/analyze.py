from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.rule import QARule
from app.schemas.call import AnalyzeRequest, AnalyzeResponse
from app.schemas.setting import LlmSettings, MainPrompt
from app.services.llm_service import LLMService
from app.services.settings_service import get_setting as _get_setting
from app.auth import get_current_user

router = APIRouter(prefix="/api/analyze", tags=["analysis"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=AnalyzeResponse)
async def analyze_call(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    """Run LLM-based QA analysis on a call."""
    llm_settings = _get_setting(db, "llm", LlmSettings)
    if not llm_settings.openRouterApiKey:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured")

    # Get transcript
    if payload.transcript:
        transcript = [t.model_dump() for t in payload.transcript]
    else:
        call = db.query(Call).filter(
            (Call.id == payload.callId) | (Call.call_id == payload.callId)
        ).first()
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

    # Get prompt
    main_prompt_setting = _get_setting(db, "main_prompt", MainPrompt)
    prompt = payload.mainPrompt or main_prompt_setting.prompt or None

    # Run analysis
    llm = LLMService(llm_settings)
    result = await llm.analyze_call(transcript, rules_data, main_prompt=prompt)

    # Save results to the call record
    call = db.query(Call).filter(
        (Call.id == payload.callId) | (Call.call_id == payload.callId)
    ).first()
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

    return result
