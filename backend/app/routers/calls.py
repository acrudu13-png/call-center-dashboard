import asyncio
import json
import os
import logging

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional

from app.database import get_db
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.schemas.call import (
    CallSummary, CallDetail, CallListResponse,
    TranscriptLineSchema, ScorecardEntrySchema,
)
from app.schemas.setting import SftpSettings
from app.auth import get_current_user, require_role, scope_query, get_org_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calls", tags=["calls"], dependencies=[Depends(get_current_user)])


def _filter_by_user_agents(query, user):
    """Restrict query to user's allowed agents. Empty list = all agents."""
    if user and user.allowed_agents:
        query = query.filter(Call.agent_id.in_(user.allowed_agents))
    return query

# Separate router for audio (uses query-param token auth instead of header)
audio_router = APIRouter(prefix="/api/calls", tags=["calls"])


def _call_to_summary(c: Call) -> CallSummary:
    return CallSummary(
        id=c.id,
        callId=c.call_id,
        dateTime=c.date_time.isoformat() if c.date_time else "",
        agentName=c.agent_name,
        agentId=c.agent_id,
        customerPhone=c.customer_phone,
        duration=c.duration,
        qaScore=c.qa_score,
        status=c.status,
        rulesFailed=c.rules_failed or [],
        compliancePass=c.compliance_pass,
        direction=c.direction or "unknown",
        callType=c.call_type,
        subdirectory=c.subdirectory,
        metadata=c.call_metadata or {},
        isEligible=c.is_eligible if c.is_eligible is not None else True,
        ineligibleReason=c.ineligible_reason,
    )


@router.get("", response_model=CallListResponse)
def list_calls(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    agentId: Optional[str] = None,
    search: Optional[str] = None,
    sortBy: str = "date_time",
    sortDir: str = "desc",
    minScore: Optional[float] = None,
    maxScore: Optional[float] = None,
    runId: Optional[str] = None,
    direction: Optional[str] = None,
    callType: Optional[str] = None,
    subdirectory: Optional[str] = None,
    metadataField: Optional[str] = None,
    metadataValue: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Call)
    query = scope_query(query, Call, current_user)
    query = _filter_by_user_agents(query, current_user)

    # Filters
    if status:
        query = query.filter(Call.status == status)
    if agentId:
        query = query.filter(Call.agent_id == agentId)
    if runId:
        query = query.filter(Call.ingestion_run_id == runId)
    if direction:
        query = query.filter(Call.direction == direction)
    if callType:
        query = query.filter(Call.call_type == callType)
    if subdirectory:
        query = query.filter(Call.subdirectory == subdirectory)
    if metadataField and metadataValue:
        from sqlalchemy import text
        query = query.filter(text("metadata->>:field = :value").bindparams(field=metadataField, value=metadataValue))
    if dateFrom or dateTo:
        from datetime import datetime, timedelta, timezone
        try:
            if dateFrom and dateTo:
                dt_from = datetime.strptime(dateFrom, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                dt_to = datetime.strptime(dateTo, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
                query = query.filter(Call.date_time >= dt_from, Call.date_time < dt_to)
            elif dateFrom:
                # Single date — show only that day
                dt_from = datetime.strptime(dateFrom, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                query = query.filter(Call.date_time >= dt_from, Call.date_time < dt_from + timedelta(days=1))
            elif dateTo:
                # Single date — show only that day
                dt_to = datetime.strptime(dateTo, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                query = query.filter(Call.date_time >= dt_to, Call.date_time < dt_to + timedelta(days=1))
        except ValueError:
            pass
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

    # Count
    total = query.count()

    # Sort (whitelist to prevent column injection, with metadata.* support)
    ALLOWED_SORT = {
        "date_time": Call.date_time, "dateTime": Call.date_time,
        "qa_score": Call.qa_score, "qaScore": Call.qa_score,
        "agent_name": Call.agent_name, "duration": Call.duration,
        "status": Call.status,
    }
    if sortBy.startswith("metadata."):
        from sqlalchemy import text as _text
        field_name = sortBy.split(".", 1)[1]
        sort_col = _text(f"metadata->>'{field_name}'")
    else:
        sort_col = ALLOWED_SORT.get(sortBy, Call.date_time)
    if sortDir == "asc":
        query = query.order_by(sort_col)
    else:
        query = query.order_by(desc(sort_col))

    # Paginate
    offset = (page - 1) * pageSize
    calls = query.offset(offset).limit(pageSize).all()

    return CallListResponse(
        calls=[_call_to_summary(c) for c in calls],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=(total + pageSize - 1) // pageSize,
    )


@router.get("/metadata-fields")
def metadata_fields(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all unique metadata field names and their sample values across all calls."""
    from sqlalchemy import text
    org_id = get_org_id(current_user) if current_user.role != "superadmin" else None
    if org_id:
        rows = db.execute(text(
            "SELECT DISTINCT jsonb_object_keys(metadata::jsonb) AS field FROM calls WHERE organization_id = :org_id AND metadata IS NOT NULL AND metadata::text != '{}'"
        ), {"org_id": org_id}).fetchall()
    else:
        rows = db.execute(text(
            "SELECT DISTINCT jsonb_object_keys(metadata::jsonb) AS field FROM calls WHERE metadata IS NOT NULL AND metadata::text != '{}'"
        )).fetchall()
    fields = sorted([r[0] for r in rows])

    # Get a few unique values per field for filter dropdowns
    result = {}
    for field in fields:
        if org_id:
            vals = db.execute(text(
                f"SELECT DISTINCT metadata->>:field AS val FROM calls WHERE organization_id = :org_id AND metadata->>:field IS NOT NULL ORDER BY val LIMIT 50"
            ), {"field": field, "org_id": org_id}).fetchall()
        else:
            vals = db.execute(text(
                f"SELECT DISTINCT metadata->>:field AS val FROM calls WHERE metadata->>:field IS NOT NULL ORDER BY val LIMIT 50"
            ), {"field": field}).fetchall()
        result[field] = [v[0] for v in vals if v[0]]

    return {"fields": result}


@router.get("/stats")
def call_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Dashboard statistics — excludes ineligible calls from score/compliance metrics."""
    base = scope_query(db.query(Call), Call, current_user)
    base = _filter_by_user_agents(base, current_user)
    eligible = base.filter(Call.is_eligible == True)
    total = base.count()
    completed = base.filter(Call.status == "completed").count()
    flagged = base.filter(Call.status == "flagged").count()
    in_review = base.filter(Call.status == "in_review").count()
    processing = base.filter(Call.status == "processing").count()

    eligible_done = eligible.filter(Call.status != "processing").count() or 1
    avg_score = eligible.filter(Call.status != "processing").with_entities(func.avg(Call.qa_score)).scalar() or 0
    compliance_rate = (
        eligible.filter(Call.compliance_pass == True, Call.status != "processing").count()
        / eligible_done
        * 100
    )

    return {
        "totalCalls": total,
        "completed": completed,
        "flagged": flagged,
        "inReview": in_review,
        "processing": processing,
        "averageScore": round(float(avg_score), 1),
        "complianceRate": round(compliance_rate, 1),
    }


@router.get("/agents")
def list_agents(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get unique agent list with call counts."""
    query = db.query(Call.agent_id, Call.agent_name, func.count(Call.id).label("callCount"))
    if current_user.role != "superadmin":
        query = query.filter(Call.organization_id == current_user.organization_id)
    if current_user.allowed_agents:
        query = query.filter(Call.agent_id.in_(current_user.allowed_agents))
    results = query.group_by(Call.agent_id, Call.agent_name).order_by(Call.agent_name).all()
    return [
        {"agentId": r.agent_id, "agentName": r.agent_name, "callCount": r.callCount}
        for r in results
    ]


@router.get("/agents/stats")
def agent_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Per-agent performance statistics for the Agents Hub."""
    from sqlalchemy import case, and_

    query = db.query(
            Call.agent_id,
            Call.agent_name,
            func.count(Call.id).label("total_calls"),
            func.avg(Call.qa_score).label("avg_score"),
            func.min(Call.qa_score).label("min_score"),
            func.max(Call.qa_score).label("max_score"),
            func.avg(Call.duration).label("avg_duration"),
            func.sum(case((Call.compliance_pass == True, 1), else_=0)).label("compliance_count"),
            func.sum(case((Call.status == "flagged", 1), else_=0)).label("flagged_count"),
            func.sum(case((Call.has_critical_failure == True, 1), else_=0)).label("critical_count"),
            func.sum(case((Call.qa_score >= 85, 1), else_=0)).label("excellent_count"),
            func.sum(case((and_(Call.qa_score >= 70, Call.qa_score < 85), 1), else_=0)).label("good_count"),
            func.sum(case((Call.qa_score < 70, 1), else_=0)).label("poor_count"),
        )
    if current_user.role != "superadmin":
        query = query.filter(Call.organization_id == current_user.organization_id)
    if current_user.allowed_agents:
        query = query.filter(Call.agent_id.in_(current_user.allowed_agents))
    results = (
        query.filter(Call.status != "processing", Call.is_eligible == True)
        .group_by(Call.agent_id, Call.agent_name)
        .order_by(Call.agent_name)
        .all()
    )

    agents = []
    for r in results:
        total = r.total_calls or 1
        agents.append({
            "agentId": r.agent_id,
            "agentName": r.agent_name,
            "totalCalls": r.total_calls,
            "avgScore": round(float(r.avg_score or 0), 1),
            "minScore": round(float(r.min_score or 0), 1),
            "maxScore": round(float(r.max_score or 0), 1),
            "avgDuration": round(float(r.avg_duration or 0)),
            "complianceRate": round(float(r.compliance_count or 0) / total * 100, 1),
            "flaggedCount": int(r.flagged_count or 0),
            "criticalCount": int(r.critical_count or 0),
            "excellentCount": int(r.excellent_count or 0),
            "goodCount": int(r.good_count or 0),
            "poorCount": int(r.poor_count or 0),
        })

    return {"agents": agents}


@router.get("/export/csv")
def export_calls_csv(
    status: Optional[str] = None,
    agentId: Optional[str] = None,
    search: Optional[str] = None,
    minScore: Optional[float] = None,
    maxScore: Optional[float] = None,
    runId: Optional[str] = None,
    includeRules: bool = True,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all matching calls as CSV."""
    from datetime import datetime as dt

    query = db.query(Call)
    query = scope_query(query, Call, current_user)

    if status:
        query = query.filter(Call.status == status)
    if agentId:
        query = query.filter(Call.agent_id == agentId)
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

    calls = query.order_by(desc(Call.date_time)).all()

    # Build scorecard data only if rules are included
    rule_titles_set: list[str] = []
    scorecard_map: dict[str, dict[str, str]] = {}

    if includeRules:
        all_ids = [c.id for c in calls]  # UUID primary keys
        scorecard_rows = (
            db.query(ScorecardEntry)
            .filter(ScorecardEntry.call_id.in_(all_ids))
            .all()
        ) if all_ids else []

        for s in scorecard_rows:
            if s.rule_title not in rule_titles_set:
                rule_titles_set.append(s.rule_title)
            scorecard_map.setdefault(s.call_id, {})[s.rule_title] = (
                f"{s.score}/{s.max_score} {'PASS' if s.passed else 'FAIL'}"
            )

    # Collect unique metadata field names across all exported calls
    meta_fields: list[str] = []
    meta_fields_set: set[str] = set()
    for c in calls:
        for key in (c.call_metadata or {}):
            if key not in meta_fields_set:
                meta_fields_set.add(key)
                meta_fields.append(key)

    headers = [
        "Call ID", "Date/Time", "Agent Name", "Agent ID", "Customer Phone",
        "Duration (s)", "Direction", "Call Type", "Subdirectory",
        "QA Score", "Grade", "Status", "Eligible", "Ineligible Reason", "Compliance",
        "Critical Failure", "Critical Reason", "AI Summary",
    ]
    headers += [f"meta:{f}" for f in meta_fields]
    if includeRules:
        headers += rule_titles_set

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    for c in calls:
        meta = c.call_metadata or {}
        eligible = c.is_eligible if c.is_eligible is not None else True
        score_val = round(c.qa_score, 1) if (eligible and c.qa_score is not None) else "N/A"
        grade_val = c.ai_grade if eligible else "N/A"
        compliance_val = ("Yes" if c.compliance_pass else "No") if eligible else "N/A"
        critical_val = ("Yes" if c.has_critical_failure else "No") if eligible else "N/A"
        row = [
            c.call_id,
            c.date_time.isoformat() if c.date_time else "",
            c.agent_name,
            c.agent_id,
            c.customer_phone,
            c.duration,
            c.direction or "",
            c.call_type or "",
            c.subdirectory or "",
            score_val,
            grade_val or "",
            c.status,
            "Yes" if eligible else "No",
            c.ineligible_reason or "",
            compliance_val,
            critical_val,
            c.critical_failure_reason or "",
            (c.ai_summary or "").replace("\n", " "),
        ]
        for f in meta_fields:
            row.append(meta.get(f, ""))
        if includeRules:
            sc = scorecard_map.get(c.id, {}) if eligible else {}
            for title in rule_titles_set:
                row.append(sc.get(title, "N/A" if not eligible else ""))
        writer.writerow(row)

    now_str = dt.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"calls_export_{now_str}.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{call_id}", response_model=CallDetail)
def get_call(call_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Call).filter((Call.id == call_id) | (Call.call_id == call_id))
    if current_user.role != "superadmin":
        q = q.filter(Call.organization_id == current_user.organization_id)
    call = q.first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if current_user.allowed_agents and call.agent_id not in current_user.allowed_agents:
        raise HTTPException(status_code=403, detail="Access denied")

    transcript = [
        TranscriptLineSchema(speaker=t.speaker, timestamp=t.timestamp, text=t.text)
        for t in call.transcript_lines
    ]
    scorecard = [
        ScorecardEntrySchema(
            ruleId=s.rule_id, ruleTitle=s.rule_title, passed=s.passed,
            score=s.score, maxScore=s.max_score, details=s.details,
            extractedValue=s.extracted_value,
        )
        for s in call.scorecard_entries
    ]

    return CallDetail(
        id=call.id,
        callId=call.call_id,
        dateTime=call.date_time.isoformat() if call.date_time else "",
        agentName=call.agent_name,
        agentId=call.agent_id,
        customerPhone=call.customer_phone,
        duration=call.duration,
        qaScore=call.qa_score,
        status=call.status,
        rulesFailed=call.rules_failed or [],
        compliancePass=call.compliance_pass,
        direction=call.direction or "unknown",
        callType=call.call_type,
        subdirectory=call.subdirectory,
        metadata=call.call_metadata or {},
        isEligible=call.is_eligible if call.is_eligible is not None else True,
        ineligibleReason=call.ineligible_reason,
        transcript=transcript,
        aiScorecard=scorecard,
        aiSummary=call.ai_summary,
        aiGrade=call.ai_grade,
        aiImprovementAdvice=call.ai_improvement_advice,
        aiTotalEarned=call.ai_total_earned,
        aiTotalPossible=call.ai_total_possible,
        hasCriticalFailure=call.has_critical_failure,
        criticalFailureReason=call.critical_failure_reason,
        rawJson=call.raw_json or {},
        audioFileName=os.path.basename(call.audio_file_path) if call.audio_file_path else None,
        processedAt=call.processed_at.isoformat() if call.processed_at else None,
        llmRequest=call.llm_request,
        llmResponse=call.llm_response,
    )


@router.patch("/{call_id}/status")
def update_call_status(call_id: str, status: str, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    q = db.query(Call).filter((Call.id == call_id) | (Call.call_id == call_id))
    if _user.role != "superadmin":
        q = q.filter(Call.organization_id == _user.organization_id)
    call = q.first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if _user.allowed_agents and call.agent_id not in _user.allowed_agents:
        raise HTTPException(status_code=403, detail="Access denied")
    if status not in ("completed", "in_review", "flagged", "processing", "failed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    call.status = status
    db.commit()
    return {"message": f"Call status updated to {status}"}


@router.delete("/{call_id}")
def delete_call(call_id: str, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    q = db.query(Call).filter((Call.id == call_id) | (Call.call_id == call_id))
    if _user.role != "superadmin":
        q = q.filter(Call.organization_id == _user.organization_id)
    call = q.first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if _user.allowed_agents and call.agent_id not in _user.allowed_agents:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(call)  # cascade deletes transcript_lines + scorecard_entries
    db.commit()
    return {"message": f"Call {call.call_id} deleted"}


AUDIO_CACHE_DIR = "/tmp/call_audio_cache"
AUDIO_CACHE_MAX_AGE = 2 * 24 * 3600  # 2 days in seconds


def _cleanup_old_audio_cache():
    """Delete cached audio files older than AUDIO_CACHE_MAX_AGE."""
    import time
    if not os.path.exists(AUDIO_CACHE_DIR):
        return
    now = time.time()
    for f in os.listdir(AUDIO_CACHE_DIR):
        path = os.path.join(AUDIO_CACHE_DIR, f)
        try:
            if os.path.isfile(path) and (now - os.path.getmtime(path)) > AUDIO_CACHE_MAX_AGE:
                os.remove(path)
        except OSError:
            pass


@audio_router.get("/{call_id}/audio")
async def get_call_audio(
    call_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # Accept token via query param (for <audio src=""> which can't set headers)
    from app.auth import decode_token as _decode
    from app.models.user import User

    auth_token = token
    if not auth_token:
        raise HTTPException(status_code=401, detail="Token required")
    payload = _decode(auth_token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Unauthorized")
    """
    Download audio from SFTP on demand, convert .au to .wav, cache locally, and stream back.
    """
    q = db.query(Call).filter((Call.id == call_id) | (Call.call_id == call_id))
    if user.role != "superadmin":
        q = q.filter(Call.organization_id == user.organization_id)
    call = q.first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if user.allowed_agents and call.agent_id not in user.allowed_agents:
        raise HTTPException(status_code=403, detail="Access denied")
    if not call.audio_file_path:
        raise HTTPException(status_code=404, detail="No audio file path stored for this call")

    os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)
    _cleanup_old_audio_cache()

    # Check cache first (use call id as stable key)
    cache_key = call.call_id or call.id
    cached_wav = os.path.join(AUDIO_CACHE_DIR, f"{cache_key}.wav")
    cached_raw = os.path.join(AUDIO_CACHE_DIR, f"{cache_key}{os.path.splitext(call.audio_file_path)[1]}")

    if os.path.exists(cached_wav):
        return FileResponse(cached_wav, media_type="audio/wav", filename=f"{cache_key}.wav")

    # Download from SFTP — reconstruct remote path from the stored local path
    # Stored path: /tmp/call_recordings/2026-03-15/TELERENTA_...au
    # SFTP path:   /tlr-cs-recordings/2026-03-15/TELERENTA_...au
    from app.services.settings_service import get_setting
    sftp_settings = get_setting(db, "sftp", SftpSettings, user.organization_id)
    if not sftp_settings.host:
        raise HTTPException(status_code=500, detail="SFTP settings not configured")

    # Reconstruct SFTP remote path from the stored local path.
    # Local temp dir is /tmp/call_recordings. Everything after that mirrors the SFTP structure.
    # Examples:
    #   /tmp/call_recordings/2026-03-15/TELERENTA_...au → base/2026-03-15/TELERENTA_...au
    #   /tmp/call_recordings/D_2025-11-14/INBOUND_SEARA/E_...wav → base/D_2025-11-14/INBOUND_SEARA/E_...wav
    stored_path = call.audio_file_path
    base_remote = sftp_settings.remotePath.split("$")[0].rstrip("/")

    # Find the relative path after "call_recordings/"
    marker = "/call_recordings/"
    idx = stored_path.find(marker)
    if idx >= 0:
        relative = stored_path[idx + len(marker):]  # e.g. "D_2025-11-14/INBOUND_SEARA/file.wav"
        remote_path = f"{base_remote}/{relative}"
    else:
        # Fallback: just use parent dir + filename
        filename = os.path.basename(stored_path)
        date_folder = os.path.basename(os.path.dirname(stored_path))
        remote_path = f"{base_remote}/{date_folder}/{filename}"

    logger.info(f"Downloading audio for {call.call_id} from SFTP: {remote_path}")

    from app.services.sftp_service import SFTPService
    svc = SFTPService(sftp_settings)

    try:
        local_path = await asyncio.to_thread(svc.download_file, remote_path, AUDIO_CACHE_DIR)
    except Exception as e:
        logger.error(f"Failed to download audio from SFTP: {e}")
        raise HTTPException(status_code=502, detail="Failed to download audio file")

    # Rename to stable cache name
    if local_path != cached_raw:
        os.rename(local_path, cached_raw)

    # Convert to wav if needed
    ext = os.path.splitext(cached_raw)[1].lower()
    if ext != ".wav":
        import subprocess
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", cached_raw, "-ar", "16000", "-ac", "1", cached_wav],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Audio conversion failed: {result.stderr[:300]}")
        # Remove raw file
        try:
            os.remove(cached_raw)
        except OSError:
            pass
    else:
        os.rename(cached_raw, cached_wav)

    logger.info(f"Audio ready for {call.call_id}: {cached_wav}")
    return FileResponse(cached_wav, media_type="audio/wav", filename=f"{cache_key}.wav")
