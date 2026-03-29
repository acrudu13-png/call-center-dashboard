from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://callcenter:callcenter_secret@db:5432/callcenter"

    # OpenRouter
    openrouter_api_key: str = ""

    # Soniox
    soniox_api_key: str = ""

    # SFTP
    sftp_host: str = "sftp.telecom-romania.ro"
    sftp_port: int = 22
    sftp_username: str = "call_ingest_svc"
    sftp_password: str = ""
    sftp_key_path: str = "/etc/ssh/telecom_ingest_rsa"
    sftp_remote_path: str = "/tlr-cs-recordings"

    # S3
    s3_bucket: str = "telecom-ro-call-recordings"
    s3_region: str = "eu-central-1"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_prefix: str = "raw-audio/"

    # Webhook
    webhook_url: str = "https://api.internal.telecom-ro.com/webhooks/qa-results"
    webhook_enabled: bool = True
    webhook_retry_count: int = 3

    # Ingestion
    ingest_cron_hour: int = 6
    ingest_enabled: bool = True

    # CORS
    cors_origins: str = '["http://localhost:3000","http://localhost:3001"]'

    @property
    def cors_origin_list(self) -> List[str]:
        return json.loads(self.cors_origins)

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
