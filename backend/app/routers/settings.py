from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.setting import (
    SftpSettings, S3Settings, LlmSettings, SonioxSettings,
    WebhookSettings, IngestSchedule, MetadataMapping, FilenameParserSettings,
    MainPrompt, CallContext, CustomVocabulary, ClassificationSettings,
    ConnectionTestResult,
)
from app.services.sftp_service import SFTPService
from app.services.s3_service import S3Service
from app.services.webhook_service import WebhookService
from app.services.settings_service import get_setting as _get_setting, save_setting as _save_setting
from app.auth import get_current_user, require_role, require_page, get_org_id

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(require_page("ingestion", "ai", "webhooks", "rules"))])


# --- SFTP ---
@router.get("/sftp", response_model=SftpSettings)
def get_sftp(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "sftp", SftpSettings, org_id)


@router.put("/sftp", response_model=SftpSettings)
def save_sftp(payload: SftpSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "sftp", payload, org_id)


@router.post("/sftp/test", response_model=ConnectionTestResult)
def test_sftp(_user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    settings = _get_setting(db, "sftp", SftpSettings, org_id)
    svc = SFTPService(settings)
    return svc.test_connection()


@router.get("/sftp/directories")
def sftp_list_directories(_user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    """List available date directories from the SFTP remote path.
    Returns directory names (e.g. 2026-04-08, 2026-04-07) with file counts."""
    import stat as stat_mod
    org_id = get_org_id(_user)
    settings = _get_setting(db, "sftp", SftpSettings, org_id)
    parser = _get_setting(db, "filename-parser", FilenameParserSettings, org_id)
    svc = SFTPService(settings)

    import paramiko
    exts = tuple(parser.audioExtensions) if parser.audioExtensions else (".au", ".wav", ".mp3", ".ogg", ".flac")

    # Resolve the base path (before $yesterday_date)
    base_path = settings.remotePath
    if "$yesterday_date" in base_path:
        parent = base_path.split("$yesterday_date")[0].rstrip("/")
    else:
        parent = base_path.rstrip("/")

    from fastapi import Query as FQuery
    limit = 20

    transport = svc._get_transport()
    sftp = paramiko.SFTPClient.from_transport(transport)
    try:
        entries = sftp.listdir_attr(parent)
        # Sort newest first, take only directories, limit to most recent
        dir_entries = sorted(
            [e for e in entries if stat_mod.S_ISDIR(e.st_mode)],
            key=lambda x: x.filename,
            reverse=True,
        )[:limit]

        directories = []
        for e in dir_entries:
            dir_path = f"{parent}/{e.filename}"
            file_count = 0
            try:
                sub_entries = sftp.listdir_attr(dir_path)
                audio_files = [s for s in sub_entries if s.filename.lower().endswith(exts)]
                sub_dirs = [s for s in sub_entries if stat_mod.S_ISDIR(s.st_mode)]
                file_count = len(audio_files)
                for sd in sub_dirs:
                    try:
                        deep_files = sftp.listdir(f"{dir_path}/{sd.filename}")
                        file_count += sum(1 for f in deep_files if f.lower().endswith(exts))
                    except Exception:
                        pass
            except Exception:
                pass
            directories.append({
                "name": e.filename,
                "path": dir_path,
                "fileCount": file_count,
            })
        return {"directories": directories, "basePath": parent}
    except Exception as e:
        return {"directories": [], "basePath": parent, "error": str(e)[:300]}
    finally:
        sftp.close()
        transport.close()


@router.get("/sftp/sample-files")
def sftp_sample_files(_user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    """Fetch a few sample filenames from the SFTP remote path for regex building."""
    import stat as stat_mod
    org_id = get_org_id(_user)
    settings = _get_setting(db, "sftp", SftpSettings, org_id)
    svc = SFTPService(settings)
    parser = _get_setting(db, "filename-parser", FilenameParserSettings, org_id)

    from datetime import timedelta
    from app.database import utcnow
    import paramiko

    path = settings.remotePath
    yesterday = (utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    path = path.replace("$yesterday_date", yesterday)

    exts = tuple(parser.audioExtensions) if parser.audioExtensions else (".au", ".wav", ".mp3", ".ogg", ".flac")

    transport = svc._get_transport()
    sftp = paramiko.SFTPClient.from_transport(transport)
    try:
        # If path has $yesterday_date, resolve to the most recent existing date folder
        base_path = settings.remotePath
        if "$yesterday_date" in base_path:
            parent = base_path.split("$yesterday_date")[0].rstrip("/")
            try:
                parent_entries = sftp.listdir_attr(parent)
                date_dirs = sorted(
                    [e.filename for e in parent_entries if stat_mod.S_ISDIR(e.st_mode)],
                    reverse=True,
                )
                if date_dirs:
                    path = f"{parent}/{date_dirs[0]}"  # most recent folder
            except Exception:
                pass  # fall through to resolved path

        entries = sftp.listdir_attr(path)
        dirs = [e.filename for e in entries if stat_mod.S_ISDIR(e.st_mode)]
        audio = [e.filename for e in entries if e.filename.lower().endswith(exts)]

        # If we found audio files at this level, return them
        if audio:
            return {"filenames": audio[:3]}

        # No audio files — dig into subdirectories automatically
        samples = []
        for d in sorted(dirs, reverse=True)[:3]:  # most recent dirs first
            try:
                sub_entries = sftp.listdir_attr(f"{path}/{d}")
                sub_dirs = [e.filename for e in sub_entries if stat_mod.S_ISDIR(e.st_mode)]
                sub_audio = [e.filename for e in sub_entries if e.filename.lower().endswith(exts)]

                if sub_audio:
                    samples.extend(sub_audio[:3])
                elif sub_dirs:
                    # One more level (date → subdir → files)
                    for sd in sorted(sub_dirs)[:2]:
                        try:
                            deep_files = sftp.listdir(f"{path}/{d}/{sd}")
                            deep_audio = [f for f in deep_files if f.lower().endswith(exts)]
                            samples.extend(deep_audio[:2])
                        except Exception:
                            pass
                        if len(samples) >= 3:
                            break
            except Exception:
                pass
            if len(samples) >= 3:
                break

        return {"filenames": samples[:3]}
    except Exception as e:
        return {"filenames": [], "error": str(e)[:300]}
    finally:
        sftp.close()
        transport.close()


# --- S3 ---
@router.get("/s3", response_model=S3Settings)
def get_s3(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "s3", S3Settings, org_id)


@router.put("/s3", response_model=S3Settings)
def save_s3(payload: S3Settings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "s3", payload, org_id)


@router.post("/s3/test", response_model=ConnectionTestResult)
def test_s3(_user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    settings = _get_setting(db, "s3", S3Settings, org_id)
    svc = S3Service(settings)
    return svc.test_connection()


# --- LLM ---
@router.get("/llm", response_model=LlmSettings)
def get_llm(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "llm", LlmSettings, org_id)


@router.put("/llm", response_model=LlmSettings)
def save_llm(payload: LlmSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "llm", payload, org_id)


# --- Soniox ---
@router.get("/soniox", response_model=SonioxSettings)
def get_soniox(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "soniox", SonioxSettings, org_id)


@router.put("/soniox", response_model=SonioxSettings)
def save_soniox(payload: SonioxSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "soniox", payload, org_id)


# --- Webhook ---
@router.get("/webhook", response_model=WebhookSettings)
def get_webhook(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "webhook", WebhookSettings, org_id)


@router.put("/webhook", response_model=WebhookSettings)
def save_webhook(payload: WebhookSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "webhook", payload, org_id)


@router.post("/webhook/test", response_model=ConnectionTestResult)
async def test_webhook(_user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    settings = _get_setting(db, "webhook", WebhookSettings, org_id)
    svc = WebhookService(settings)
    return await svc.test_endpoint()


# --- Ingest Schedule ---
@router.get("/ingest-schedule", response_model=IngestSchedule)
def get_ingest_schedule(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "ingest-schedule", IngestSchedule, org_id)


@router.put("/ingest-schedule", response_model=IngestSchedule)
def save_ingest_schedule(payload: IngestSchedule, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    result = _save_setting(db, "ingest-schedule", payload, org_id)
    # Live-update the cron job for this org
    try:
        from app.scheduler import update_org_schedule
        update_org_schedule(org_id)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to update scheduler for org {org_id}: {e}")
    return result


# --- Metadata Mapping ---
@router.get("/metadata-mapping", response_model=MetadataMapping)
def get_metadata_mapping(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "metadata-mapping", MetadataMapping, org_id)


@router.put("/metadata-mapping", response_model=MetadataMapping)
def save_metadata_mapping(payload: MetadataMapping, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "metadata-mapping", payload, org_id)


# --- Main Prompt ---
@router.get("/main-prompt", response_model=MainPrompt)
def get_main_prompt(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "main-prompt", MainPrompt, org_id)


@router.put("/main-prompt", response_model=MainPrompt)
def save_main_prompt(payload: MainPrompt, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "main-prompt", payload, org_id)


# --- Call Context ---
@router.get("/call-context", response_model=CallContext)
def get_call_context(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "call-context", CallContext, org_id)


@router.put("/call-context", response_model=CallContext)
def save_call_context(payload: CallContext, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "call-context", payload, org_id)


# --- Custom Vocabulary ---
@router.get("/custom-vocabulary", response_model=CustomVocabulary)
def get_custom_vocabulary(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "custom-vocabulary", CustomVocabulary, org_id)


@router.put("/custom-vocabulary", response_model=CustomVocabulary)
def save_custom_vocabulary(payload: CustomVocabulary, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "custom-vocabulary", payload, org_id)


# --- Classification Settings ---
@router.get("/classification", response_model=ClassificationSettings)
def get_classification(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "classification", ClassificationSettings, org_id)


@router.put("/classification", response_model=ClassificationSettings)
def save_classification(payload: ClassificationSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "classification", payload, org_id)


# --- Filename Parser ---
@router.get("/filename-parser", response_model=FilenameParserSettings)
def get_filename_parser(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = get_org_id(current_user)
    return _get_setting(db, "filename-parser", FilenameParserSettings, org_id)


@router.put("/filename-parser", response_model=FilenameParserSettings)
def save_filename_parser(payload: FilenameParserSettings, _user=Depends(require_role("org_admin", "manager")), db: Session = Depends(get_db)):
    org_id = get_org_id(_user)
    return _save_setting(db, "filename-parser", payload, org_id)
