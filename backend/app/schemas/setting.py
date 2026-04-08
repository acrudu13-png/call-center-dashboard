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
    availableModels: list[str] = [
        "anthropic/claude-4.6-sonnet",
        "anthropic/claude-4.5-opus",
        "google/gemini-3.1-pro",
        "google/gemini-3.0-ultra",
        "openai/gpt-5.3-pro",
        "openai/gpt-5.2-mini",
        "meta-llama/llama-4-70b",
    ]


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
    minDuration: int = 10  # seconds — calls shorter than this skip LLM analysis


class MetadataMapping(BaseModel):
    """Deprecated — kept for backward compatibility. Use FilenameParserSettings."""
    agentIdField: str = "agent_id"
    customerPhoneField: str = "customer_phone"
    dateTimeField: str = "date_time"
    durationField: str = "duration"


class FilenameVariable(BaseModel):
    name: str       # e.g. "agent_name", "phone", "date", "time"
    label: str = ""  # human display label


class FilenameParserSettings(BaseModel):
    filenamePattern: str = ""  # regex with named capture groups (?P<name>...)
    variables: list[FilenameVariable] = []
    sampleFilenames: list[str] = []  # for live preview in UI
    useInfoFiles: bool = True  # whether to look for .info companion files
    recursiveTraversal: bool = False  # date/subdir/files structure
    audioExtensions: list[str] = [".au", ".wav", ".mp3", ".ogg", ".flac"]
    durationSource: str = "info_file"  # info_file | audio_probe | transcription


class MainPrompt(BaseModel):
    prompt: str = ""


class CallContext(BaseModel):
    context: str = ""


class CustomVocabulary(BaseModel):
    words: list[str] = []


class ClassificationSettings(BaseModel):
    model: str = "openai/gpt-5-nano"
    prompt: str = "You classify phone calls into categories. Reply with ONLY the category key, nothing else. No explanation."
    temperature: float = 0.0


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latencyMs: Optional[int] = None
