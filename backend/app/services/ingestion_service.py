"""
Ingestion service: download → transcribe → analyze → store.
"""

import asyncio
import os
import threading
import uuid
import logging
from app.database import utcnow, APP_TZ
from typing import Optional

from sqlalchemy.orm import Session

from dataclasses import dataclass
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.job import TranscriptionJob, LogEntry, IngestionRun
from app.models.rule import QARule
from app.services.sftp_service import SFTPService
from app.services.s3_service import S3Service
from app.services.soniox_service import SonioxService
from app.services.llm_service import LLMService
from app.services.webhook_service import WebhookService
from app.schemas.setting import (
    SftpSettings, S3Settings, SonioxSettings, LlmSettings, WebhookSettings,
    MetadataMapping, CallContext, CustomVocabulary, IngestSchedule,
    ClassificationSettings, FilenameParserSettings,
)
from app.ws_manager import manager

logger = logging.getLogger(__name__)

TEMP_DIR = "/tmp/call_recordings"


def _parse_info_file(audio_path: str) -> dict:
    """
    Parse the .info metadata file that accompanies an audio recording.
    Returns: {agent_name, agent_id, customer_phone, duration}
    """
    result = {
        "agent_name": "Unknown",
        "agent_id": "AGT-000",
        "customer_phone": "Unknown",
        "duration": 0,
        "direction": "unknown",  # inbound | outbound | unknown
        "info_raw": "",
    }

    # Find the .info file: audio is TELERENTA_123--456_R207-N210_..._date_time.au
    # info is TELERENTA_123--456.info (just the base ID)
    filename = os.path.basename(audio_path)
    directory = os.path.dirname(audio_path)

    # Extract base ID: everything before _R or _N+ or _N2 (the routing/phone/date suffixes)
    import re
    match = re.match(r'^(TELERENTA_\d+--\d+)', filename)
    if not match:
        return result
    base_id = match.group(1)

    info_path = os.path.join(directory, f"{base_id}.info")
    if not os.path.exists(info_path):
        return result

    try:
        with open(info_path, "r", encoding="utf-8") as f:
            content = f.read()

        result["info_raw"] = content

        # Parse key=value pairs
        kv = {}
        current_entity_type = None
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("_ENTITY_="):
                current_entity_type = None
            if "=" in line and not line.startswith("#") and not line.startswith("_"):
                key, _, value = line.partition("=")
                kv[key.strip()] = value.strip()
            if line.startswith("type="):
                current_entity_type = line.split("=", 1)[1].strip()

        # Parse entities separately — STATION = agent, EXTERNAL_NUMBER = customer
        station = {}
        external = {}
        current_section = None
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("_ENTITY_="):
                current_section = {}
            elif line.startswith("_CALL_FLOW_") or line.startswith("#") or not line:
                if current_section and current_section.get("type") == "STATION":
                    station = current_section
                elif current_section and current_section.get("type") == "EXTERNAL_NUMBER":
                    external = current_section
                current_section = None
            elif current_section is not None and "=" in line:
                key, _, value = line.partition("=")
                current_section[key.strip()] = value.strip()

        # Handle last section
        if current_section:
            if current_section.get("type") == "STATION":
                station = current_section
            elif current_section.get("type") == "EXTERNAL_NUMBER":
                external = current_section

        # Extract fields
        if station.get("display") and station["display"] != "null":
            result["agent_name"] = station["display"]
        if station.get("number") and station["number"] != "null":
            result["agent_id"] = f"AGT-{station['number']}"
        if external.get("externalNumber") and external["externalNumber"] != "null":
            result["customer_phone"] = external["externalNumber"]
        elif external.get("number") and external["number"] != "null":
            result["customer_phone"] = external["number"]

        # Talk duration from call flow section
        for line in content.splitlines():
            if line.strip().startswith("talkDuration="):
                val = line.strip().split("=", 1)[1]
                try:
                    result["duration"] = int(val)
                except ValueError:
                    pass
                break

        # Call direction from _CALL_FLOW_=[from]-->[to]
        # Short internal number = agent station, +40... or long number = external
        for line in content.splitlines():
            if line.strip().startswith("_CALL_FLOW_="):
                flow = line.strip().split("=", 1)[1]
                flow_match = re.match(r'\[(.+?)\]-->\[(.+?)\]', flow)
                if flow_match:
                    left, right = flow_match.group(1), flow_match.group(2)
                    left_is_external = left.startswith("+") or len(left) > 6
                    right_is_external = right.startswith("+") or len(right) > 6
                    if not left_is_external and right_is_external:
                        result["direction"] = "outbound"
                    elif left_is_external and not right_is_external:
                        result["direction"] = "inbound"
                break

    except Exception as e:
        logger.warning(f"Failed to parse info file {info_path}: {e}")

    return result

# ── Stop flag registry ──────────────────────────────────────

_stop_flags: dict[str, threading.Event] = {}
_stop_lock = threading.Lock()


def request_stop(run_id: str) -> bool:
    with _stop_lock:
        flag = _stop_flags.get(run_id)
        if flag:
            flag.set()
            return True
    return False


def get_active_run_id() -> Optional[str]:
    with _stop_lock:
        for run_id, flag in list(_stop_flags.items()):
            if not flag.is_set():
                return run_id
    return None


# ── Helpers ──────────────────────────────────────────────────

def _get_setting(db: Session, key: str, default_cls, org_id: str = None):
    from app.services.settings_service import get_setting
    return get_setting(db, key, default_cls, org_id)


def _log(db: Session, level: str, source: str, message: str, job_id: Optional[str] = None, org_id: str = None):
    db.add(LogEntry(organization_id=org_id, level=level, source=source, message=message, job_id=job_id))
    db.commit()
    logger.log(getattr(logging, level.upper(), logging.INFO), f"[{source}] {message}")
    manager.broadcast_sync("log", {
        "timestamp": utcnow().isoformat(),
        "level": level, "source": source, "message": message, "jobId": job_id,
    }, org_id=org_id)


def _broadcast_run(run: IngestionRun):
    manager.broadcast_sync("ingestion_progress", {
        "runId": run.run_id, "source": run.source, "status": run.status,
        "remotePath": run.remote_path, "totalFiles": run.total_files,
        "downloadedFiles": run.downloaded_files, "processedFiles": run.processed_files,
        "failedFiles": run.failed_files, "currentFile": run.current_file,
        "errorMessage": run.error_message,
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "completedAt": run.completed_at.isoformat() if run.completed_at else None,
    }, org_id=run.organization_id)


def _broadcast_job(job: TranscriptionJob):
    manager.broadcast_sync("job_update", {
        "jobId": job.job_id, "fileName": job.file_name, "source": job.source,
        "status": job.status, "progress": job.progress, "callId": job.call_id,
        "errorMessage": job.error_message,
        "startedAt": job.started_at.isoformat() if job.started_at else None,
        "completedAt": job.completed_at.isoformat() if job.completed_at else None,
    }, org_id=job.organization_id)


@dataclass
class IngestionSettings:
    sftp: SftpSettings
    s3: S3Settings
    soniox: SonioxSettings
    llm: LlmSettings
    webhook: WebhookSettings
    parser: FilenameParserSettings = None  # type: ignore[assignment]

    def __post_init__(self):
        if self.parser is None:
            self.parser = FilenameParserSettings()


class IngestionStopped(Exception):
    pass


# ── Main service ─────────────────────────────────────────────

class IngestionService:

    def __init__(self, db: Session, org_id: str = None):
        self.db = db
        self.org_id = org_id
        self._stop = threading.Event()
        os.makedirs(TEMP_DIR, exist_ok=True)

    def _check_stopped(self):
        if self._stop.is_set():
            raise IngestionStopped()

    # ── Public entry point ───────────────────────────────────

    async def run_ingestion(
        self,
        source: str = "sftp",
        remote_path: Optional[str] = None,
        resume_run_id: Optional[str] = None,
    ) -> list[str]:
        """
        Run or resume an ingestion.
        - New run: creates a fresh IngestionRun record.
        - Resume: reuses the existing record, skips already-completed files.
        """
        is_resume = resume_run_id is not None
        run = self._init_run(source, remote_path, resume_run_id)
        self._stop = threading.Event()
        with _stop_lock:
            _stop_flags[run.run_id] = self._stop

        try:
            settings = self._load_settings()
            files = await self._download_phase(run, settings, source, remote_path, is_resume)
            self._check_stopped()
            created = await self._process_phase(run, files, settings, source)
            self._finish_run(run, created, len(files))
            return created

        except IngestionStopped:
            run.status = "stopped"
            run.current_file = None
            run.completed_at = utcnow()
            self.db.commit()
            _broadcast_run(run)
            _log(self.db, "warn", "ingestion",
                 f"Run {run.run_id} stopped. {run.processed_files}/{run.total_files} done.",
                 org_id=self.org_id)
            return []

        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)[:500]
            run.current_file = None
            run.completed_at = utcnow()
            self.db.commit()
            _broadcast_run(run)
            _log(self.db, "error", "ingestion", f"Run {run.run_id} failed: {e}",
                 org_id=self.org_id)
            raise

        finally:
            with _stop_lock:
                _stop_flags.pop(run.run_id, None)

    # ── Run lifecycle ────────────────────────────────────────

    def _init_run(self, source: str, remote_path: Optional[str], resume_run_id: Optional[str]) -> IngestionRun:
        if resume_run_id:
            run = self.db.query(IngestionRun).filter(
                IngestionRun.run_id == resume_run_id,
                IngestionRun.organization_id == self.org_id,
            ).first()
            if not run:
                raise ValueError(f"Run {resume_run_id} not found")
            run.status = "processing"  # Skip download status on resume
            run.completed_at = None
            run.error_message = None
            run.current_file = None
            run.failed_files = 0
            self.db.commit()
            _broadcast_run(run)
            _log(self.db, "info", "ingestion", f"Resuming run {run.run_id}...",
                 org_id=self.org_id)
            return run

        run = IngestionRun(
            organization_id=self.org_id,
            run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
            source=source, status="downloading",
            remote_path=remote_path, started_at=utcnow(),
        )
        self.db.add(run)
        self.db.commit()
        _broadcast_run(run)
        _log(self.db, "info", "ingestion", f"Starting run {run.run_id} from {source}...",
             org_id=self.org_id)
        return run

    def _load_settings(self) -> IngestionSettings:
        """Load all settings once."""
        soniox = _get_setting(self.db, "soniox", SonioxSettings, self.org_id)
        ctx = _get_setting(self.db, "call-context", CallContext, self.org_id)
        vocab = _get_setting(self.db, "custom-vocabulary", CustomVocabulary, self.org_id)
        if ctx.context:
            soniox.callContext = ctx.context
        if vocab.words:
            soniox.customVocabulary = vocab.words

        return IngestionSettings(
            sftp=_get_setting(self.db, "sftp", SftpSettings, self.org_id),
            s3=_get_setting(self.db, "s3", S3Settings, self.org_id),
            soniox=soniox,
            llm=_get_setting(self.db, "llm", LlmSettings, self.org_id),
            webhook=_get_setting(self.db, "webhook", WebhookSettings, self.org_id),
            parser=_get_setting(self.db, "filename-parser", FilenameParserSettings, self.org_id),
        )

    def _finish_run(self, run: IngestionRun, created: list[str], total_files: int):
        run.status = "completed"
        run.current_file = None
        run.completed_at = utcnow()
        self.db.commit()
        _broadcast_run(run)
        skipped = total_files - len(created) - run.failed_files
        _log(self.db, "info", "ingestion",
             f"Run {run.run_id} complete. "
             f"{len(created)} new, {max(0, skipped)} skipped, "
             f"{run.failed_files} failed (total {total_files}).",
             org_id=self.org_id)

    # ── Download phase ───────────────────────────────────────

    async def _download_phase(self, run, settings, source, remote_path, is_resume=False) -> list[tuple[str, str]]:
        """
        Download files. Returns list of (local_path, subdirectory_name) tuples.
        subdirectory_name is "" when not using recursive traversal.
        """
        use_recursive = settings.parser.recursiveTraversal and source == "sftp"

        if is_resume:
            if source == "sftp":
                svc = SFTPService(settings.sftp)
                if use_recursive:
                    files = await asyncio.to_thread(svc.download_folder_recursive, TEMP_DIR, remote_path, None)
                else:
                    flat = await asyncio.to_thread(svc.download_folder, TEMP_DIR, remote_path, None)
                    files = [(f, "") for f in flat]
            else:
                svc = S3Service(settings.s3)
                flat = await asyncio.to_thread(svc.list_files)
                files = [(f, "") for f in flat]
            run.total_files = len(files)
            run.downloaded_files = len(files)
            self.db.commit()
            _broadcast_run(run)
            _log(self.db, "info", "ingestion", f"Resume: {len(files)} files ready.",
                 org_id=self.org_id)
            return files

        def on_progress(downloaded: int, total: int, filename: str):
            run.total_files = total
            run.downloaded_files = downloaded
            run.current_file = filename
            self.db.commit()
            _broadcast_run(run)
            if self._stop.is_set():
                raise IngestionStopped()

        if source == "sftp":
            svc = SFTPService(settings.sftp)
            if use_recursive:
                files = await asyncio.to_thread(
                    svc.download_folder_recursive, TEMP_DIR, remote_path, on_progress
                )
            else:
                flat = await asyncio.to_thread(
                    svc.download_folder, TEMP_DIR, remote_path, on_progress
                )
                files = [(f, "") for f in flat]
        else:
            svc = S3Service(settings.s3)
            flat = await asyncio.to_thread(svc.list_files)
            files = [(f, "") for f in flat]
            run.total_files = len(files)
            run.downloaded_files = len(files)
            self.db.commit()
            _broadcast_run(run)

        _log(self.db, "info", "ingestion", f"Downloaded {len(files)} files.",
             org_id=self.org_id)
        return files

    # ── Process phase (parallel) ────────────────────────────

    async def _process_phase(self, run, files: list[tuple[str, str]], settings, source) -> list[str]:
        """Process all files in parallel. Skips already-completed ones.
        files is list of (local_path, subdirectory_name) tuples.
        """
        from app.database import SessionLocal

        # Auto-discover subdirectories and create DB entries
        self._auto_discover_subdirectories(files)

        # Load settings
        schedule = _get_setting(self.db, "ingest-schedule", IngestSchedule, self.org_id)
        concurrency = max(1, schedule.concurrency)
        min_duration = schedule.minDuration

        run.status = "processing"
        run.total_files = len(files)
        self.db.commit()
        _broadcast_run(run)

        # Determine which files are already done (scoped to this org)
        completed_filenames = {
            j.file_name for j in
            self.db.query(TranscriptionJob.file_name)
            .filter(
                TranscriptionJob.organization_id == self.org_id,
                TranscriptionJob.status == "completed",
            )
            .all()
        }

        # Load subdirectory settings for filtering
        from app.models.subdirectory import Subdirectory as SubdirModel
        subdir_map = {
            s.key: s for s in self.db.query(SubdirModel).filter(SubdirModel.organization_id == self.org_id).all()
        }

        pending: list[tuple[str, str]] = []
        skipped = 0
        for file_path, subdir in files:
            fname = os.path.basename(file_path)
            if fname in completed_filenames:
                skipped += 1
            elif subdir and subdir in subdir_map and not subdir_map[subdir].enabled:
                skipped += 1  # subdirectory is disabled
            else:
                pending.append((file_path, subdir))

        run.processed_files = skipped
        self.db.commit()
        _broadcast_run(run)

        if skipped > 0:
            _log(self.db, "info", "ingestion",
                 f"{skipped} files already done, {len(pending)} remaining.",
                 org_id=self.org_id)

        # Load all enabled rules once (filtered per call by direction later)
        all_rules_data = [{
            "rule_id": r.rule_id, "title": r.title,
            "description": r.description, "max_score": r.max_score,
            "rule_type": r.rule_type, "is_critical": r.is_critical,
            "direction": r.direction, "call_types": r.call_types or [],
            "subdirectories": r.subdirectories or [],
            "metadata_conditions": r.metadata_conditions or [],
        } for r in self.db.query(QARule).filter(
            QARule.organization_id == self.org_id,
            QARule.enabled == True
        ).order_by(QARule.sort_order).all()]

        # Shared counters protected by a lock
        lock = asyncio.Lock()
        created_ids: list[str] = []
        failed_count = 0
        stopped = False
        semaphore = asyncio.Semaphore(concurrency)
        _log(self.db, "info", "ingestion", f"Processing with concurrency={concurrency}",
             org_id=self.org_id)

        async def worker(file_info: tuple[str, str]):
            nonlocal failed_count, stopped
            if stopped:
                return

            file_path, subdir_name = file_info
            MAX_RETRIES = 3

            async with semaphore:
                if self._stop.is_set():
                    return

                filename = os.path.basename(file_path)
                last_error = None

                for attempt in range(1, MAX_RETRIES + 1):
                    if self._stop.is_set():
                        return

                    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"

                    # Each attempt gets its own DB session
                    db = SessionLocal()
                    try:
                        call_id = await self._process_file_with_session(
                            db, file_path, job_id, source, settings, run.run_id, all_rules_data, min_duration,
                            subdirectory=subdir_name or None,
                            org_id=self.org_id,
                        )
                        async with lock:
                            created_ids.append(call_id)
                            run.processed_files = skipped + len(created_ids)
                            self.db.commit()
                            _broadcast_run(run)
                        last_error = None
                        break  # success

                    except (IngestionStopped, InterruptedError):
                        stopped = True
                        return

                    except Exception as e:
                        last_error = e
                        db.close()
                        if attempt < MAX_RETRIES:
                            _log(self.db, "warn", "ingestion",
                                 f"Attempt {attempt}/{MAX_RETRIES} failed for {filename}: {e}. Retrying...", job_id,
                                 org_id=self.org_id)
                            await asyncio.sleep(2 * attempt)  # backoff: 2s, 4s
                        continue

                    finally:
                        if db.is_active:
                            db.close()

                # All retries exhausted
                if last_error is not None:
                    db = SessionLocal()
                    try:
                        async with lock:
                            failed_count += 1
                            run.failed_files = failed_count
                            self.db.commit()
                            _broadcast_run(run)

                        # Mark job failed
                        job = db.query(TranscriptionJob).filter(
                            TranscriptionJob.organization_id == self.org_id,
                            TranscriptionJob.job_id == job_id).first()
                        if job and job.status != "completed":
                            job.status = "failed"
                            job.error_message = f"Failed after {MAX_RETRIES} attempts: {str(last_error)[:800]}"
                            job.completed_at = utcnow()
                            db.commit()
                            _broadcast_job(job)

                        # Mark call as failed too (scoped to this org)
                        from app.models.call import Call
                        failed_call = db.query(Call).filter(
                            Call.organization_id == self.org_id,
                            Call.audio_file_path == file_path,
                        ).first()
                        if failed_call and failed_call.status == "processing":
                            failed_call.status = "failed"
                            failed_call.is_eligible = False
                            failed_call.ineligible_reason = f"Eroare dupa {MAX_RETRIES} incercari: {str(last_error)[:200]}"
                            db.commit()

                        _log(db, "error", "ingestion",
                             f"Failed {filename} after {MAX_RETRIES} attempts: {last_error}", job_id,
                             org_id=self.org_id)
                    finally:
                        db.close()

                done = skipped + len(created_ids) + failed_count
                _log(self.db, "info", "ingestion",
                     f"[{done}/{len(files)}] {filename}",
                     org_id=self.org_id)

        # Launch all workers
        tasks = [asyncio.create_task(worker(fi)) for fi in pending]
        await asyncio.gather(*tasks)

        if stopped:
            raise IngestionStopped()

        run.failed_files = failed_count
        self.db.commit()
        return created_ids

    def _auto_discover_subdirectories(self, files: list[tuple[str, str]]):
        """Create DB entries for any new subdirectories found during download."""
        from app.models.subdirectory import Subdirectory as SubdirModel
        import re

        existing_keys = {s.key for s in self.db.query(SubdirModel.key).filter(SubdirModel.organization_id == self.org_id).all()}
        seen = set()
        for _, subdir in files:
            if not subdir or subdir in existing_keys or subdir in seen:
                continue
            seen.add(subdir)
            # Guess direction from name
            name_upper = subdir.upper()
            if "OUTBOUND" in name_upper:
                direction = "outbound"
            elif "INBOUND" in name_upper:
                direction = "inbound"
            else:
                direction = "unknown"
            self.db.add(SubdirModel(
                organization_id=self.org_id,
                key=subdir, display_name=subdir, direction=direction,
                discovered_from=subdir, enabled=True,
            ))
            _log(self.db, "info", "ingestion", f"Discovered subdirectory: {subdir} (direction={direction})",
                 org_id=self.org_id)
        if seen:
            self.db.commit()

    # ── Single file pipeline (with own DB session) ────────────

    async def _process_file_with_session(
        self, db: Session, file_path: str, job_id: str,
        source: str, settings, run_id: str, rules_data: list[dict],
        min_duration: int = 10, subdirectory: str | None = None,
        org_id: str = None,
    ) -> str:
        filename = os.path.basename(file_path)
        log = lambda lvl, msg: _log(db, lvl, "ingestion", msg, job_id, org_id=org_id)

        # 1. Create job record
        job = TranscriptionJob(
            organization_id=org_id,
            job_id=job_id, file_name=filename, source=source,
            status="queued", started_at=utcnow(),
        )
        db.add(job)
        db.commit()
        _broadcast_job(job)

        # 2. Prepare file
        if source == "sftp":
            local_path = file_path
        else:
            local_path = await asyncio.to_thread(
                S3Service(settings.s3).download_file, file_path, TEMP_DIR
            )

        job.status = "transcribing"
        job.progress = 10
        db.commit()
        _broadcast_job(job)
        self._check_stopped()

        # 3. Transcribe
        job.progress = 30
        db.commit()
        _broadcast_job(job)

        soniox = SonioxService(settings.soniox)
        segments = await soniox.transcribe_file(
            local_path,
            stop_event=self._stop,
            log_fn=lambda lvl, src, msg, jid: _log(db, lvl, src, msg, jid, org_id=org_id),
            job_id=job_id,
        )

        job.status = "analyzing"
        job.progress = 60
        db.commit()
        _broadcast_job(job)
        self._check_stopped()

        # 4. Parse metadata — combine info file + filename regex + subdirectory rules
        parser_settings = settings.parser
        meta = {"agent_name": "Unknown", "agent_id": "AGT-000", "customer_phone": "Unknown",
                "duration": 0, "direction": "unknown", "info_raw": ""}

        # Step A: info file (if enabled)
        if parser_settings.useInfoFiles:
            meta = _parse_info_file(file_path)

        # Step B: filename regex (fills in missing fields)
        from app.services.filename_parser import parse_filename
        parsed = parse_filename(parser_settings, filename)
        log("info", f"Filename parser: pattern='{parser_settings.filenamePattern[:80]}...', filename='{filename}', parsed={parsed}")
        if parsed.get("agent_name") and meta["agent_name"] == "Unknown":
            meta["agent_name"] = parsed["agent_name"].replace("_", " ").strip()
        if parsed.get("phone") and meta["customer_phone"] == "Unknown":
            meta["customer_phone"] = parsed["phone"]
        if parsed.get("agent_id") and meta["agent_id"] == "AGT-000":
            meta["agent_id"] = f"AGT-{parsed['agent_id']}"

        # Step C: subdirectory direction (if info file didn't provide one)
        if meta["direction"] == "unknown" and subdirectory:
            from app.models.subdirectory import Subdirectory as SubdirModel
            subdir_rec = db.query(SubdirModel).filter(SubdirModel.key == subdirectory, SubdirModel.organization_id == org_id).first()
            if subdir_rec and subdir_rec.direction != "unknown":
                meta["direction"] = subdir_rec.direction

        # Step D: duration fallback chain — try each source until we get a value
        transcript_duration = int(segments[-1]["timestamp"]) if segments else 0
        if meta["duration"] <= 0 and parser_settings.durationSource == "audio_probe":
            from app.services.audio_utils import get_audio_duration
            meta["duration"] = get_audio_duration(local_path)
        if meta["duration"] <= 0 and parser_settings.durationSource == "transcription":
            meta["duration"] = transcript_duration
        # Final fallback: always try ffprobe then transcript if still 0
        if meta["duration"] <= 0:
            from app.services.audio_utils import get_audio_duration
            meta["duration"] = get_audio_duration(local_path)
        if meta["duration"] <= 0:
            meta["duration"] = transcript_duration
        duration = meta["duration"]

        # Step E: parse datetime from filename regex or fallback patterns
        import re as _re
        from datetime import datetime as _dt
        call_dt = utcnow()
        if parsed.get("date"):
            try:
                date_str = parsed["date"]
                time_str = parsed.get("time", "000000")
                # Normalize time: "14-50-44" or "145044" or "14:50:44"
                time_clean = time_str.replace("-", "").replace(":", "")
                if len(time_clean) == 6:
                    call_dt = _dt.strptime(f"{date_str} {time_clean}", "%Y-%m-%d %H%M%S").replace(tzinfo=APP_TZ)
            except ValueError:
                pass
        if call_dt == utcnow():
            # Fallback: try old pattern ..._2026-03-29_14-50-44.au
            dt_match = _re.search(r'(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.\w+$', filename)
            if dt_match:
                try:
                    call_dt = _dt.strptime(
                        f"{dt_match.group(1)} {dt_match.group(2).replace('-', ':')}",
                        "%Y-%m-%d %H:%M:%S"
                    ).replace(tzinfo=APP_TZ)
                except ValueError:
                    pass

        # Check if this file was already processed — if so, delete old call and rewrite (scoped per org)
        existing = db.query(Call).filter(
            Call.organization_id == org_id,
            Call.audio_file_path == file_path,
        ).first()
        if existing:
            log("info", f"Rewriting existing call {existing.call_id} for {filename}")
            reuse_call_id = existing.call_id
            db.delete(existing)
            db.commit()
        else:
            reuse_call_id = None

        if not reuse_call_id:
            from app.services.call_counter_service import get_next_call_num
            next_num = get_next_call_num(db, org_id)
        call = Call(
            organization_id=org_id,
            call_id=reuse_call_id or f"CALL-{next_num}",
            date_time=call_dt,
            processed_at=utcnow(),
            agent_name=meta["agent_name"],
            agent_id=meta["agent_id"],
            customer_phone=meta["customer_phone"],
            duration=duration,
            direction=meta["direction"],
            subdirectory=subdirectory,
            status="processing",
            audio_file_path=file_path,
            ingestion_run_id=run_id,
            raw_json={"info_file": meta.get("info_raw", ""), "parsed_filename": parsed},
            call_metadata=parsed,
        )
        if meta["agent_name"] != "Unknown":
            log("info", f"Metadata: agent={meta['agent_name']}, phone={meta['customer_phone']}, duration={duration}s, direction={meta['direction']}, subdir={subdirectory}")
        db.add(call)
        db.commit()

        for seg in segments:
            db.add(TranscriptLine(
                call_id=call.id, speaker=seg["speaker"],
                timestamp=seg["timestamp"], text=seg["text"],
            ))
        db.commit()

        # 5. Check minimum duration — skip LLM for very short calls
        if duration < min_duration:
            log("info", f"Skipping analysis for {call.call_id} — duration {duration}s < minimum {min_duration}s")
            call.qa_score = 0
            call.ai_summary = f"Apelul este prea scurt pentru analiza ({duration}s < {min_duration}s minim)."
            call.ai_grade = "Slab"
            call.status = "completed"
            call.is_eligible = False
            call.ineligible_reason = f"Durata prea scurta ({duration}s)"
        else:
            # 5b. Classify call type
            from app.models.call_type import CallType as CallTypeModel
            active_types = db.query(CallTypeModel).filter(CallTypeModel.organization_id == org_id, CallTypeModel.enabled == True).order_by(CallTypeModel.sort_order).all()
            types_data = [{"key": ct.key, "name": ct.name, "description": ct.description} for ct in active_types]

            if types_data:
                llm_cls = LLMService(settings.llm)
                cls_settings = _get_setting(db, "classification", ClassificationSettings, org_id=org_id)
                classified_type, cls_debug = await llm_cls.classify_call(segments, types_data, agent_name=call.agent_name, classification_settings=cls_settings)
                call.call_type = classified_type
                from sqlalchemy.orm.attributes import flag_modified
                rj = dict(call.raw_json or {})
                rj["classification_debug"] = cls_debug
                call.raw_json = rj
                flag_modified(call, "raw_json")
                db.commit()
                log("info", f"Classified {call.call_id} as: {classified_type}")
            else:
                call.call_type = None

            # 5c. LLM analysis — filter rules by call direction + call type + subdirectory + metadata
            from app.services.filename_parser import check_metadata_conditions
            call_dir = call.direction or "unknown"
            filtered_rules = [
                r for r in rules_data
                if (r["direction"] == "both" or r["direction"] == call_dir)
                and (not r.get("call_types") or call.call_type in r.get("call_types", []))
                and (not r.get("subdirectories") or (call.subdirectory and call.subdirectory in r.get("subdirectories", [])))
                and check_metadata_conditions(r.get("metadata_conditions", []), call.call_metadata or {})
            ]
            log("info", f"Analyzing {call.call_id} ({call_dir}, {call.call_type}), {len(filtered_rules)}/{len(rules_data)} rules...")
            job.progress = 70
            db.commit()
            _broadcast_job(job)

            llm = LLMService(settings.llm)
            analysis = await llm.analyze_call(
                segments, filtered_rules,
                agent_name=call.agent_name,
                log_fn=lambda lvl, src, msg, jid: _log(db, lvl, src, msg, jid, org_id=org_id),
                job_id=job_id,
            )

            # 6. Save analysis
            call.qa_score = analysis.overallScore
            call.ai_summary = analysis.summary
            call.ai_grade = analysis.grade
            call.ai_improvement_advice = analysis.improvementAdvice
            call.ai_total_earned = analysis.totalEarned
            call.ai_total_possible = analysis.totalPossible
            call.has_critical_failure = analysis.hasCriticalFailure
            call.critical_failure_reason = analysis.criticalFailureReason
            call.rules_failed = [r.ruleId for r in analysis.results if not r.passed]
            call.compliance_pass = not analysis.hasCriticalFailure
            call.status = "flagged" if analysis.hasCriticalFailure else "completed"
            call.is_eligible = analysis.isEligible
            call.ineligible_reason = analysis.ineligibleReason
            from sqlalchemy.orm.attributes import flag_modified
            rj = dict(call.raw_json or {})
            rj["speaker_map"] = analysis.speakerMap
            call.raw_json = rj
            flag_modified(call, "raw_json")
            call.llm_request = analysis.llmRequest
            call.llm_response = analysis.llmResponse

            for r in analysis.results:
                db.add(ScorecardEntry(
                    call_id=call.id, rule_id=r.ruleId, rule_title=r.ruleTitle,
                    passed=r.passed, score=r.score, max_score=r.maxScore,
                    details=r.details, extracted_value=r.extractedValue,
                ))

        # 7. Mark job complete
        job.status = "completed"
        job.progress = 100
        job.call_id = call.id
        job.completed_at = utcnow()
        db.commit()
        _broadcast_job(job)

        # 8. Webhook
        try:
            await WebhookService(settings.webhook).dispatch({
                "callId": call.call_id, "qaScore": analysis.overallScore,
                "grade": analysis.grade,
                "hasCriticalFailure": analysis.hasCriticalFailure,
                "summary": analysis.summary,
            })
        except Exception as e:
            log("warn", f"Webhook failed for {call.call_id}: {e}")

        # 9. Cleanup
        try:
            os.remove(local_path)
        except OSError:
            pass

        log("info", f"Completed {call.call_id}")
        return call.call_id
