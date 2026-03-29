from pydantic import BaseModel
from typing import Optional


class SftpSettings(BaseModel):
    host: str = "sftp.telecom-romania.ro"
    port: int = 22
    username: str = "call_ingest_svc"
    password: str = ""
    sshKeyPath: str = "/etc/ssh/telecom_ingest_rsa"
    remotePath: str = "/tlr-cs-recordings/$yesterday_date"


class S3Settings(BaseModel):
    bucketName: str = "telecom-ro-call-recordings"
    region: str = "eu-central-1"
    accessKey: str = ""
    secretKey: str = ""
    prefix: str = "raw-audio/"


class LlmSettings(BaseModel):
    openRouterApiKey: str = ""
    defaultModel: str = "anthropic/claude-4.6-sonnet"
    temperature: float = 0.1
    maxTokens: int = 4096


class SonioxSettings(BaseModel):
    apiKey: str = ""
    language: str = "ro"
    model: str = "stt-async-v4"
    callContext: str = ""
    customVocabulary: list[str] = []


class WebhookSettings(BaseModel):
    endpointUrl: str = "https://api.internal.telecom-ro.com/webhooks/qa-results"
    enabled: bool = True
    retryCount: int = 3
    headers: dict = {}


class IngestSchedule(BaseModel):
    cronHour: int = 6
    enabled: bool = True
    concurrency: int = 5


class MetadataMapping(BaseModel):
    agentIdField: str = "agent_id"
    customerPhoneField: str = "customer_phone"
    dateTimeField: str = "date_time"
    durationField: str = "duration"


class MainPrompt(BaseModel):
    prompt: str = ""


class CallContext(BaseModel):
    context: str = ""


class CustomVocabulary(BaseModel):
    words: list[str] = []


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latencyMs: Optional[int] = None
