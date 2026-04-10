import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.job import LogEntry
from app.models.rule import QARule
from app.schemas.call import AnalyzeRequest, AnalyzeResponse
from app.schemas.setting import LlmSettings, MainPrompt, ClassificationSettings
from app.services.llm_service import LLMService
from app.services.settings_service import get_setting as _get_setting
from app.auth import get_current_user, require_role, require_page, scope_query, get_org_id
from app.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analysis"], dependencies=[Depends(require_role("org_admin", "manager")), Depends(require_page("calls"))])

# Stop signal for bulk reanalysis
_bulk_stop_event = asyncio.Event()


def _add_log(db, level: str, message: str, org_id: str = None):
    entry = LogEntry(organization_id=org_id, timestamp=utcnow(), level=level, source="analysis", message=message)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("", response_model=AnalyzeResponse)
async def analyze_call(payload: AnalyzeRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Run LLM-based QA analysis on a call."""
    org_id = get_org_id(current_user)
    llm_settings = _get_setting(db, "llm", LlmSettings, org_id=org_id)
    if not llm_settings.openRouterApiKey:
        raise HTTPException(status_code=400, detail="OpenRouter API key not configured")

    # Override settings for test mode
    overrides: dict = {}
    if payload.model:
        overrides["defaultModel"] = payload.model
    if payload.temperature is not None:
        overrides["temperature"] = payload.temperature
    if payload.maxTokens is not None:
        overrides["maxTokens"] = payload.maxTokens
    if overrides:
        llm_settings = llm_settings.model_copy(update=overrides)

    llm = LLMService(llm_settings)

    # Resolve call (scoped per org)
    q = db.query(Call).filter((Call.id == payload.callId) | (Call.call_id == payload.callId))
    if current_user.role != "superadmin":
        q = q.filter(Call.organization_id == org_id)
    call = q.first()
    call_label = call.call_id if call else payload.callId

    # Prevent concurrent reanalysis of the same call (skip check for dry runs)
    # Allow retrying "reanalyzing" calls that may be stuck from a previous failed attempt
    if not payload.dryRun and call and call.status == "processing":
        raise HTTPException(status_code=409, detail=f"Call {call_label} is already being analyzed")

    # Mark as reanalyzing (only for real runs)
    if not payload.dryRun and call:
        call.status = "reanalyzing"
        db.commit()

    # Log start
    _add_log(db, "info", f"Reanalysis started for {call_label}", org_id=org_id)
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Reanalysis started for {call_label}",
    }, org_id=org_id)

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
    rules_query = db.query(QARule).filter(QARule.enabled == True).filter(QARule.organization_id == org_id)
    if payload.ruleIds:
        rules_query = rules_query.filter(QARule.rule_id.in_(payload.ruleIds))
    rules = rules_query.order_by(QARule.sort_order).all()

    # Classify call type
    from app.models.call_type import CallType as CallTypeModel
    call_type_key = None
    active_types = db.query(CallTypeModel).filter(CallTypeModel.enabled == True).filter(CallTypeModel.organization_id == org_id).order_by(CallTypeModel.sort_order).all()
    types_data = [{"key": ct.key, "name": ct.name, "description": ct.description} for ct in active_types]
    if types_data and call:
        cls_settings = _get_setting(db, "classification", ClassificationSettings, org_id=org_id)
        call_type_key, cls_debug = await llm.classify_call(transcript, types_data, agent_name=call.agent_name, classification_settings=cls_settings)
        call.call_type = call_type_key
        from sqlalchemy.orm.attributes import flag_modified
        rj = dict(call.raw_json or {})
        rj["classification_debug"] = cls_debug
        call.raw_json = rj
        flag_modified(call, "raw_json")
        db.commit()
        _add_log(db, "info", f"Classified {call_label} as: {call_type_key}", org_id=org_id)

    # Filter by direction, call type, subdirectory, and metadata conditions
    from app.services.filename_parser import check_metadata_conditions
    call_subdir = call.subdirectory if call else None
    call_meta = call.call_metadata or {} if call else {}
    rules = [r for r in rules if r.direction == "both" or r.direction == call_dir]
    rules = [r for r in rules if not r.call_types or (call_type_key and call_type_key in r.call_types)]
    rules = [r for r in rules if not r.subdirectories or (call_subdir and call_subdir in r.subdirectories)]
    rules = [r for r in rules if check_metadata_conditions(r.metadata_conditions or [], call_meta)]

    rules_data = [
        {
            "rule_id": r.rule_id, "title": r.title, "description": r.description,
            "max_score": r.max_score, "rule_type": r.rule_type, "is_critical": r.is_critical,
        }
        for r in rules
    ]

    _add_log(db, "info", f"Sending {call_label} ({call_dir}, {call_type_key}) to AI with {len(rules)} rules", org_id=org_id)
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Sending {call_label} to AI with {len(rules)} rules",
    }, org_id=org_id)

    # Get prompt
    main_prompt_setting = _get_setting(db, "main-prompt", MainPrompt, org_id=org_id)
    prompt = payload.mainPrompt or main_prompt_setting.prompt or None

    # Run analysis
    try:
        result = await llm.analyze_call(
            transcript, rules_data,
            main_prompt=prompt,
            agent_name=call.agent_name if call else None,
            thinking_budget=payload.thinkingBudget,
        )
    except Exception as e:
        # Reset status so the call can be reanalyzed again
        if call and not payload.dryRun:
            call.status = "failed"
            db.commit()
        _add_log(db, "error", f"Reanalysis failed for {call_label}: {e}", org_id=org_id)
        await manager.broadcast("log", {
            "timestamp": utcnow().isoformat(), "level": "error",
            "source": "analysis", "message": f"Reanalysis failed for {call_label}: {e}",
        }, org_id=org_id)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # Save results to the call record (skip for dry runs / test mode)
    if call and not payload.dryRun:
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
        # Merge speaker map into raw_json
        from sqlalchemy.orm.attributes import flag_modified
        rj = dict(call.raw_json or {})  # copy to ensure new reference
        rj["speaker_map"] = result.speakerMap
        call.raw_json = rj
        flag_modified(call, "raw_json")
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

        _add_log(db, "info", f"Reanalysis complete for {call_label}: {result.grade} ({round(result.overallScore, 1)}%)", org_id=org_id)
        await manager.broadcast("log", {
            "timestamp": utcnow().isoformat(), "level": "info",
            "source": "analysis", "message": f"Reanalysis complete for {call_label}: {result.grade} ({round(result.overallScore, 1)}%)",
        }, org_id=org_id)

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
    callType: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Queue bulk reanalysis for all matching calls. Runs in background."""
    from fastapi import BackgroundTasks
    org_id = get_org_id(current_user)
    query = db.query(Call).filter(Call.status.notin_(["processing", "reanalyzing"]))
    query = query.filter(Call.organization_id == org_id)

    if status:
        query = query.filter(Call.status == status)
    if agentId:
        query = query.filter(Call.agent_id == agentId)
    if direction:
        query = query.filter(Call.direction == direction)
    if callType:
        query = query.filter(Call.call_type == callType)
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

    calls_list = query.all()
    call_ids = [c.id for c in calls_list]
    total = len(call_ids)

    if total == 0:
        return {"message": "No calls match the filters", "total": 0}

    # Mark all calls as "reanalyzing" so the UI can show progress
    for c in calls_list:
        c.status = "reanalyzing"
    db.commit()

    _add_log(db, "info", f"Bulk reanalysis started for {total} calls", org_id=org_id)
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reanalysis started for {total} calls",
    }, org_id=org_id)
    await manager.broadcast("bulk_reanalyze_started", {"callIds": call_ids, "total": total}, org_id=org_id)

    # Run in background
    _bulk_stop_event.clear()
    asyncio.create_task(_bulk_reanalyze_bg(call_ids, org_id))

    return {"message": f"Bulk reanalysis queued for {total} calls", "total": total}


@router.post("/bulk/stop")
async def stop_bulk_reanalyze(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Stop ongoing bulk reanalysis and reset remaining calls."""
    org_id = get_org_id(current_user)
    _bulk_stop_event.set()

    # Reset any calls still in "reanalyzing" status back to their previous state
    stuck = db.query(Call).filter(Call.status == "reanalyzing").filter(Call.organization_id == org_id).all()
    for c in stuck:
        c.status = "completed"
    db.commit()

    _add_log(db, "info", f"Bulk reanalysis stopped. Reset {len(stuck)} calls.", org_id=org_id)
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reanalysis stopped. Reset {len(stuck)} calls.",
    }, org_id=org_id)
    await manager.broadcast("bulk_reanalyze_done", {"total": 0, "stopped": True}, org_id=org_id)

    return {"message": f"Stopped. Reset {len(stuck)} calls.", "reset": len(stuck)}


@router.post("/bulk/reclassify")
async def bulk_reclassify(
    status: Optional[str] = None,
    agentId: Optional[str] = None,
    search: Optional[str] = None,
    minScore: Optional[float] = None,
    maxScore: Optional[float] = None,
    runId: Optional[str] = None,
    direction: Optional[str] = None,
    callType: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Bulk reclassify call types only (no QA rules analysis)."""
    org_id = get_org_id(current_user)
    query = db.query(Call).filter(Call.status.notin_(["processing", "reanalyzing"]))
    query = query.filter(Call.organization_id == org_id)

    if status:
        query = query.filter(Call.status == status)
    if agentId:
        query = query.filter(Call.agent_id == agentId)
    if direction:
        query = query.filter(Call.direction == direction)
    if callType:
        query = query.filter(Call.call_type == callType)
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

    calls_list = query.all()
    call_ids = [c.id for c in calls_list]
    total = len(call_ids)

    if total == 0:
        return {"message": "No calls match the filters", "total": 0}

    # Mark all calls as "reclassifying" so the UI can show progress
    for c in calls_list:
        c.status = "reanalyzing"
    db.commit()

    _add_log(db, "info", f"Bulk reclassification started for {total} calls", org_id=org_id)
    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reclassification started for {total} calls",
    }, org_id=org_id)
    await manager.broadcast("bulk_reanalyze_started", {"callIds": call_ids, "total": total}, org_id=org_id)

    _bulk_stop_event.clear()
    asyncio.create_task(_bulk_reclassify_bg(call_ids, org_id))

    return {"message": f"Bulk reclassification queued for {total} calls", "total": total}


async def _bulk_reclassify_bg(call_ids: list[str], org_id: str = None):
    """Background task to reclassify call types only (no rules analysis)."""
    import asyncio
    from app.database import SessionLocal
    from app.services.settings_service import get_setting
    from app.schemas.setting import LlmSettings, ClassificationSettings as ClsSettings
    from app.models.call_type import CallType as CallTypeModel
    from sqlalchemy.orm.attributes import flag_modified

    semaphore = asyncio.Semaphore(10)
    completed_count = 0
    lock = asyncio.Lock()

    async def _reclassify_one(call_id: str):
        nonlocal completed_count
        if _bulk_stop_event.is_set():
            return
        async with semaphore:
            if _bulk_stop_event.is_set():
                return
            db = SessionLocal()
            try:
                call = db.query(Call).filter(Call.id == call_id, Call.organization_id == org_id).first()
                if not call or call.status != "reanalyzing":
                    return

                llm_settings = get_setting(db, "llm", LlmSettings, org_id=org_id)
                if not llm_settings.openRouterApiKey:
                    return

                transcript = [
                    {"speaker": t.speaker, "timestamp": t.timestamp, "text": t.text}
                    for t in call.transcript_lines
                ]
                if not transcript:
                    # No transcript — just restore status
                    call.status = "completed"
                    db.commit()
                    return

                active_types = db.query(CallTypeModel).filter(CallTypeModel.enabled == True).filter(CallTypeModel.organization_id == org_id).order_by(CallTypeModel.sort_order).all()
                types_data = [{"key": ct.key, "name": ct.name, "description": ct.description} for ct in active_types]

                if not types_data:
                    call.call_type = None
                    call.status = "flagged" if call.has_critical_failure else "completed"
                    db.commit()
                    return

                llm = LLMService(llm_settings)
                cls_s = get_setting(db, "classification", ClsSettings, org_id=org_id)
                call_type_key, cls_debug = await llm.classify_call(
                    transcript, types_data,
                    agent_name=call.agent_name,
                    classification_settings=cls_s,
                )

                call.call_type = call_type_key
                rj = dict(call.raw_json or {})
                rj["classification_debug"] = cls_debug
                call.raw_json = rj
                flag_modified(call, "raw_json")
                # Restore the previous status (not reanalyzing)
                call.status = "flagged" if call.has_critical_failure else "completed"
                db.commit()

                async with lock:
                    completed_count += 1
                    idx = completed_count

                await manager.broadcast("call_updated", {
                    "callId": call.id,
                    "status": call.status,
                    "qaScore": call.qa_score,
                    "callType": call.call_type,
                    "index": idx,
                    "total": len(call_ids),
                }, org_id=org_id)

            except Exception as e:
                logger.error(f"Bulk reclassification failed for {call_id}: {e}")
                db2 = SessionLocal()
                try:
                    failed_call = db2.query(Call).filter(Call.id == call_id).first()
                    if failed_call and failed_call.status == "reanalyzing":
                        failed_call.status = "flagged" if failed_call.has_critical_failure else "completed"
                        db2.commit()
                finally:
                    db2.close()

                async with lock:
                    completed_count += 1
                    idx = completed_count

                await manager.broadcast("call_updated", {
                    "callId": call_id, "status": "completed",
                    "index": idx, "total": len(call_ids),
                }, org_id=org_id)
            finally:
                db.close()

    await asyncio.gather(*[_reclassify_one(cid) for cid in call_ids])

    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reclassification complete: {len(call_ids)} calls",
    }, org_id=org_id)
    await manager.broadcast("bulk_reanalyze_done", {"total": len(call_ids)}, org_id=org_id)


async def _bulk_reanalyze_bg(call_ids: list[str], org_id: str = None):
    """Background task to reanalyze calls in parallel."""
    import asyncio
    from app.database import SessionLocal
    from app.services.settings_service import get_setting
    from app.schemas.setting import LlmSettings, MainPrompt, IngestSchedule, ClassificationSettings as ClsSettings
    from app.models.call_type import CallType as CallTypeModel
    from sqlalchemy.orm.attributes import flag_modified

    # Read concurrency from ingestion settings (same pool)
    db_init = SessionLocal()
    try:
        schedule = get_setting(db_init, "ingest-schedule", IngestSchedule, org_id=org_id)
        concurrency = max(1, schedule.concurrency)
    except Exception:
        concurrency = 5
    finally:
        db_init.close()

    semaphore = asyncio.Semaphore(concurrency)
    completed_count = 0
    lock = asyncio.Lock()

    async def _reanalyze_one(call_id: str):
        nonlocal completed_count
        if _bulk_stop_event.is_set():
            return
        async with semaphore:
            if _bulk_stop_event.is_set():
                return
            db = SessionLocal()
            try:
                call = db.query(Call).filter(Call.id == call_id, Call.organization_id == org_id).first()
                if not call or call.status != "reanalyzing":
                    return

                llm_settings = get_setting(db, "llm", LlmSettings, org_id=org_id)
                if not llm_settings.openRouterApiKey:
                    return

                transcript = [
                    {"speaker": t.speaker, "timestamp": t.timestamp, "text": t.text}
                    for t in call.transcript_lines
                ]
                if not transcript:
                    return

                call_dir = call.direction if call else "unknown"

                # Classify call type
                call_type_key = None
                active_types = db.query(CallTypeModel).filter(CallTypeModel.enabled == True).filter(CallTypeModel.organization_id == org_id).order_by(CallTypeModel.sort_order).all()
                types_data = [{"key": ct.key, "name": ct.name, "description": ct.description} for ct in active_types]

                llm = LLMService(llm_settings)

                if types_data:
                    cls_s = get_setting(db, "classification", ClsSettings, org_id=org_id)
                    call_type_key, cls_debug = await llm.classify_call(transcript, types_data, agent_name=call.agent_name, classification_settings=cls_s)
                    call.call_type = call_type_key
                    rj = dict(call.raw_json or {})
                    rj["classification_debug"] = cls_debug
                    call.raw_json = rj
                    flag_modified(call, "raw_json")

                from app.services.filename_parser import check_metadata_conditions as _check_meta
                rules = db.query(QARule).filter(QARule.enabled == True).filter(QARule.organization_id == org_id).order_by(QARule.sort_order).all()
                call_subdir = call.subdirectory
                call_meta = call.call_metadata or {}
                rules = [r for r in rules if r.direction == "both" or r.direction == call_dir]
                rules = [r for r in rules if not r.call_types or (call_type_key and call_type_key in r.call_types)]
                rules = [r for r in rules if not r.subdirectories or (call_subdir and call_subdir in r.subdirectories)]
                rules = [r for r in rules if _check_meta(r.metadata_conditions or [], call_meta)]

                rules_data = [
                    {"rule_id": r.rule_id, "title": r.title, "description": r.description,
                     "max_score": r.max_score, "rule_type": r.rule_type, "is_critical": r.is_critical}
                    for r in rules
                ]

                main_prompt_setting = get_setting(db, "main-prompt", MainPrompt, org_id=org_id)
                prompt = main_prompt_setting.prompt or None

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
                rj = dict(call.raw_json or {})
                rj["speaker_map"] = result.speakerMap
                call.raw_json = rj
                flag_modified(call, "raw_json")
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

                async with lock:
                    completed_count += 1
                    idx = completed_count

                await manager.broadcast("log", {
                    "timestamp": utcnow().isoformat(), "level": "info",
                    "source": "analysis",
                    "message": f"[{idx}/{len(call_ids)}] Reanalyzed {call.call_id}: {result.grade} ({round(result.overallScore, 1)}%)",
                }, org_id=org_id)
                await manager.broadcast("call_updated", {
                    "callId": call.id,
                    "status": call.status,
                    "qaScore": call.qa_score,
                    "callType": call.call_type,
                    "index": idx,
                    "total": len(call_ids),
                }, org_id=org_id)

            except Exception as e:
                logger.error(f"Bulk reanalysis failed for {call_id}: {e}")
                db2 = SessionLocal()
                try:
                    failed_call = db2.query(Call).filter(Call.id == call_id).first()
                    if failed_call:
                        failed_call.status = "failed"
                        db2.commit()
                finally:
                    db2.close()

                async with lock:
                    completed_count += 1
                    idx = completed_count

                await manager.broadcast("log", {
                    "timestamp": utcnow().isoformat(), "level": "error",
                    "source": "analysis", "message": f"Bulk reanalysis failed for call {call_id}: {e}",
                }, org_id=org_id)
                await manager.broadcast("call_updated", {
                    "callId": call_id, "status": "failed",
                    "index": idx, "total": len(call_ids),
                }, org_id=org_id)
            finally:
                db.close()

    await asyncio.gather(*[_reanalyze_one(cid) for cid in call_ids])

    await manager.broadcast("log", {
        "timestamp": utcnow().isoformat(), "level": "info",
        "source": "analysis", "message": f"Bulk reanalysis complete: {len(call_ids)} calls",
    }, org_id=org_id)
    await manager.broadcast("bulk_reanalyze_done", {"total": len(call_ids)}, org_id=org_id)


