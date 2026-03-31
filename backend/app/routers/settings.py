from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.setting import (
    SftpSettings, S3Settings, LlmSettings, SonioxSettings,
    WebhookSettings, IngestSchedule, MetadataMapping,
    MainPrompt, CallContext, CustomVocabulary, ConnectionTestResult,
)
from app.services.sftp_service import SFTPService
from app.services.s3_service import S3Service
from app.services.webhook_service import WebhookService
from app.services.settings_service import get_setting as _get_setting, save_setting as _save_setting
from app.auth import get_current_user, require_role, require_page

router = APIRouter(prefix="/api/settings", tags=["settings"], dependencies=[Depends(require_page("ingestion", "ai", "webhooks"))])


# --- SFTP ---
@router.get("/sftp", response_model=SftpSettings)
def get_sftp(db: Session = Depends(get_db)):
    return _get_setting(db, "sftp", SftpSettings)


@router.put("/sftp", response_model=SftpSettings)
def save_sftp(payload: SftpSettings, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "sftp", payload)


@router.post("/sftp/test", response_model=ConnectionTestResult)
def test_sftp(_user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    settings = _get_setting(db, "sftp", SftpSettings)
    svc = SFTPService(settings)
    return svc.test_connection()


# --- S3 ---
@router.get("/s3", response_model=S3Settings)
def get_s3(db: Session = Depends(get_db)):
    return _get_setting(db, "s3", S3Settings)


@router.put("/s3", response_model=S3Settings)
def save_s3(payload: S3Settings, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "s3", payload)


@router.post("/s3/test", response_model=ConnectionTestResult)
def test_s3(_user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    settings = _get_setting(db, "s3", S3Settings)
    svc = S3Service(settings)
    return svc.test_connection()


# --- LLM ---
@router.get("/llm", response_model=LlmSettings)
def get_llm(db: Session = Depends(get_db)):
    return _get_setting(db, "llm", LlmSettings)


@router.put("/llm", response_model=LlmSettings)
def save_llm(payload: LlmSettings, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "llm", payload)


# --- Soniox ---
@router.get("/soniox", response_model=SonioxSettings)
def get_soniox(db: Session = Depends(get_db)):
    return _get_setting(db, "soniox", SonioxSettings)


@router.put("/soniox", response_model=SonioxSettings)
def save_soniox(payload: SonioxSettings, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "soniox", payload)


# --- Webhook ---
@router.get("/webhook", response_model=WebhookSettings)
def get_webhook(db: Session = Depends(get_db)):
    return _get_setting(db, "webhook", WebhookSettings)


@router.put("/webhook", response_model=WebhookSettings)
def save_webhook(payload: WebhookSettings, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "webhook", payload)


@router.post("/webhook/test", response_model=ConnectionTestResult)
async def test_webhook(_user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    settings = _get_setting(db, "webhook", WebhookSettings)
    svc = WebhookService(settings)
    return await svc.test_endpoint()


# --- Ingest Schedule ---
@router.get("/ingest-schedule", response_model=IngestSchedule)
def get_ingest_schedule(db: Session = Depends(get_db)):
    return _get_setting(db, "ingest_schedule", IngestSchedule)


@router.put("/ingest-schedule", response_model=IngestSchedule)
def save_ingest_schedule(payload: IngestSchedule, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "ingest_schedule", payload)


# --- Metadata Mapping ---
@router.get("/metadata-mapping", response_model=MetadataMapping)
def get_metadata_mapping(db: Session = Depends(get_db)):
    return _get_setting(db, "metadata_mapping", MetadataMapping)


@router.put("/metadata-mapping", response_model=MetadataMapping)
def save_metadata_mapping(payload: MetadataMapping, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "metadata_mapping", payload)


# --- Main Prompt ---
@router.get("/main-prompt", response_model=MainPrompt)
def get_main_prompt(db: Session = Depends(get_db)):
    return _get_setting(db, "main_prompt", MainPrompt)


@router.put("/main-prompt", response_model=MainPrompt)
def save_main_prompt(payload: MainPrompt, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "main_prompt", payload)


# --- Call Context ---
@router.get("/call-context", response_model=CallContext)
def get_call_context(db: Session = Depends(get_db)):
    return _get_setting(db, "call_context", CallContext)


@router.put("/call-context", response_model=CallContext)
def save_call_context(payload: CallContext, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "call_context", payload)


# --- Custom Vocabulary ---
@router.get("/custom-vocabulary", response_model=CustomVocabulary)
def get_custom_vocabulary(db: Session = Depends(get_db)):
    return _get_setting(db, "custom-vocabulary", CustomVocabulary)


@router.put("/custom-vocabulary", response_model=CustomVocabulary)
def save_custom_vocabulary(payload: CustomVocabulary, _user=Depends(require_role("admin", "manager")), db: Session = Depends(get_db)):
    return _save_setting(db, "custom-vocabulary", payload)
