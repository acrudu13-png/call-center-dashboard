import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.job import LogEntry
from app.models.rule import QARule
from app.schemas.call import AnalyzeRequest, AnalyzeResponse
from app.schemas.setting import LlmSettings, MainPrompt
from app.services.llm_service import LLMService
from app.services.settings_service import get_setting as _get_setting
from app.auth import get_current_user, require_role
from app.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analysis"], dependencies=[Depends(require_role("admin", "manager"))])


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
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Reanalysis started for {call_label}",
    })

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

    # Get rules — filter by call direction
    call_dir = call.direction if call else "unknown"
    rules_query = db.query(QARule).filter(QARule.enabled == True)
    if payload.ruleIds:
        rules_query = rules_query.filter(QARule.rule_id.in_(payload.ruleIds))
    rules = rules_query.order_by(QARule.sort_order).all()

    # Filter by direction: "both" applies to all calls, otherwise match direction
    rules = [r for r in rules if r.direction == "both" or r.direction == call_dir]

    rules_data = [
        {
            "rule_id": r.rule_id, "title": r.title, "description": r.description,
            "max_score": r.max_score, "rule_type": r.rule_type, "is_critical": r.is_critical,
        }
        for r in rules
    ]

    _add_log(db, "info", f"Sending {call_label} ({call_dir}) to AI with {len(rules)} rules")
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Sending {call_label} to AI with {len(rules)} rules",
    })

    # Get prompt
    main_prompt_setting = _get_setting(db, "main_prompt", MainPrompt)
    prompt = payload.mainPrompt or main_prompt_setting.prompt or None

    # Run analysis
    try:
        llm = LLMService(llm_settings)
        result = await llm.analyze_call(
            transcript, rules_data,
            main_prompt=prompt,
            agent_name=call.agent_name if call else None,
        )
    except Exception as e:
        _add_log(db, "error", f"Reanalysis failed for {call_label}: {e}")
        await manager.broadcast("log", {
            "timestamp": utcnow().isoformat(), "level": "error",
            "source": "analysis", "message": f"Reanalysis failed for {call_label}: {e}",
        })
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
        call.is_eligible = result.isEligible
        call.ineligible_reason = result.ineligibleReason
        call.llm_request = result.llmRequest
        call.llm_response = result.llmResponse

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
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Reanalysis complete for {call_label}: {result.grade} ({result.overallScore}%)",
    })

    return result


@router.post("/bulk")
async def bulk_reanalyze(
    status: Optional[str] = None,
    agentId: Optional[str] = None,
    search: Optional[str] = None,
    minScore: Optional[float] = None,
    maxScore: Optional[float] = None,
    runId: Optional[str] = None,
    direction: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Queue bulk reanalysis for all matching calls. Runs in background."""
    from fastapi import BackgroundTasks
    query = db.query(Call).filter(Call.status != "processing")

    if status:
        query = query.filter(Call.status == status)
    if agentId:
        query = query.filter(Call.agent_id == agentId)
    if direction:
        query = query.filter(Call.direction == direction)
    if runId:
        query = query.filter(Call.ingestion_run_id == runId)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Call.call_id.ilike(pattern))
            | (Call.agent_name.ilike(pattern))
            | (Call.customer_phone.ilike(pattern))
        )
    if minScore is not None:
        query = query.filter(Call.qa_score >= minScore)
    if maxScore is not None:
        query = query.filter(Call.qa_score <= maxScore)

    call_ids = [c.id for c in query.all()]
    total = len(call_ids)

    if total == 0:
        return {"message": "No calls match the filters", "total": 0}

    _add_log(db, "info", f"Bulk reanalysis started for {total} calls")
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reanalysis started for {total} calls",
    })

    # Run in background
    import asyncio
    asyncio.create_task(_bulk_reanalyze_bg(call_ids))

    return {"message": f"Bulk reanalysis queued for {total} calls", "total": total}


async def _bulk_reanalyze_bg(call_ids: list[str]):
    """Background task to reanalyze calls one by one."""
    from app.database import SessionLocal
    from app.services.settings_service import get_setting
    from app.schemas.setting import LlmSettings, MainPrompt

    for i, call_id in enumerate(call_ids):
        db = SessionLocal()
        try:
            call = db.query(Call).filter(Call.id == call_id).first()
            if not call:
                continue

            llm_settings = get_setting(db, "llm", LlmSettings)
            if not llm_settings.openRouterApiKey:
                break

            transcript = [
                {"speaker": t.speaker, "timestamp": t.timestamp, "text": t.text}
                for t in call.transcript_lines
            ]
            if not transcript:
                continue

            call_dir = call.direction if call else "unknown"
            rules = db.query(QARule).filter(QARule.enabled == True).order_by(QARule.sort_order).all()
            rules = [r for r in rules if r.direction == "both" or r.direction == call_dir]

            rules_data = [
                {"rule_id": r.rule_id, "title": r.title, "description": r.description,
                 "max_score": r.max_score, "rule_type": r.rule_type, "is_critical": r.is_critical}
                for r in rules
            ]

            main_prompt_setting = get_setting(db, "main_prompt", MainPrompt)
            prompt = main_prompt_setting.prompt or None

            llm = LLMService(llm_settings)
            result = await llm.analyze_call(transcript, rules_data, main_prompt=prompt, agent_name=call.agent_name)

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
            call.is_eligible = result.isEligible
            call.ineligible_reason = result.ineligibleReason
            call.llm_request = result.llmRequest
            call.llm_response = result.llmResponse

            db.query(ScorecardEntry).filter(ScorecardEntry.call_id == call.id).delete()
            for r in result.results:
                db.add(ScorecardEntry(
                    call_id=call.id, rule_id=r.ruleId, rule_title=r.ruleTitle,
                    passed=r.passed, score=r.score, max_score=r.maxScore,
                    details=r.details, extracted_value=r.extractedValue,
                ))
            db.commit()

            await manager.broadcast("log", {
                "timestamp": utcnow().isoformat(), "level": "info",
                "source": "analysis",
                "message": f"[{i+1}/{len(call_ids)}] Reanalyzed {call.call_id}: {result.grade} ({result.overallScore}%)",
            })

        except Exception as e:
            logger.error(f"Bulk reanalysis failed for {call_id}: {e}")
            await manager.broadcast("log", {
                "timestamp": utcnow().isoformat(), "level": "error",
                "source": "analysis", "message": f"Bulk reanalysis failed for call {call_id}: {e}",
            })
        finally:
            db.close()

    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reanalysis complete: {len(call_ids)} calls",
    })
