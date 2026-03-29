import os
import time
import logging
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from app.schemas.setting import S3Settings, ConnectionTestResult

logger = logging.getLogger(__name__)


class S3Service:
    """Handles S3 operations for downloading call recordings."""

    def __init__(self, settings: S3Settings):
        self.settings = settings
        self._client = None

    @property
    def client(self):
        if self._client is None:
            kwargs = {"region_name": self.settings.region}
            if self.settings.accessKey and self.settings.secretKey:
                kwargs["aws_access_key_id"] = self.settings.accessKey
                kwargs["aws_secret_access_key"] = self.settings.secretKey
            self._client = boto3.client("s3", **kwargs)
        return self._client

    def test_connection(self) -> ConnectionTestResult:
        start = time.time()
        try:
            self.client.head_bucket(Bucket=self.settings.bucketName)
            latency = int((time.time() - start) * 1000)
            return ConnectionTestResult(
                success=True,
                message=f"Bucket '{self.settings.bucketName}' is accessible.",
                latencyMs=latency,
            )
        except ClientError as e:
            latency = int((time.time() - start) * 1000)
            logger.error(f"S3 connection test failed: {e}")
            return ConnectionTestResult(
                success=False, message=str(e), latencyMs=latency
            )

    def list_files(self, prefix: Optional[str] = None, since_date: Optional[str] = None) -> list[str]:
        """List audio files in the bucket with given prefix."""
        pfx = prefix or self.settings.prefix
        paginator = self.client.get_paginator("list_objects_v2")

        files = []
        for page in paginator.paginate(Bucket=self.settings.bucketName, Prefix=pfx):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if key.endswith((".wav", ".mp3", ".ogg", ".flac", ".au")):
                    files.append(key)
        return files

    def download_file(self, s3_key: str, local_dir: str) -> str:
        """Download a single file from S3."""
        filename = os.path.basename(s3_key)
        local_path = os.path.join(local_dir, filename)
        self.client.download_file(self.settings.bucketName, s3_key, local_path)
        logger.info(f"Downloaded s3://{self.settings.bucketName}/{s3_key} -> {local_path}")
        return local_path
