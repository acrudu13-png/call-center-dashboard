import os
import time
import logging
from typing import Optional, Callable
import paramiko
from app.schemas.setting import SftpSettings, ConnectionTestResult

logger = logging.getLogger(__name__)


class SFTPService:
    """Handles SFTP connections for downloading call recordings."""

    def __init__(self, settings: SftpSettings):
        self.settings = settings

    def _get_transport(self) -> paramiko.Transport:
        host = self.settings.host.strip()
        port = self.settings.port
        logger.info(f"Attempting SFTP connection to {host}:{port}")
        transport = paramiko.Transport((host, port))
        if self.settings.sshKeyPath and os.path.exists(self.settings.sshKeyPath):
            pkey = paramiko.RSAKey.from_private_key_file(self.settings.sshKeyPath)
            transport.connect(username=self.settings.username, pkey=pkey)
        else:
            transport.connect(
                username=self.settings.username, password=self.settings.password
            )
        return transport

    def test_connection(self) -> ConnectionTestResult:
        start = time.time()
        try:
            transport = self._get_transport()
            sftp = paramiko.SFTPClient.from_transport(transport)
            sftp.listdir(self.settings.remotePath.replace("$yesterday_date", ""))
            sftp.close()
            transport.close()
            latency = int((time.time() - start) * 1000)
            return ConnectionTestResult(
                success=True,
                message=f"Connected to {self.settings.host} successfully.",
                latencyMs=latency,
            )
        except Exception as e:
            latency = int((time.time() - start) * 1000)
            logger.error(f"SFTP connection test failed for {self.settings.host}: {e}")
            return ConnectionTestResult(
                success=False, message=str(e), latencyMs=latency
            )

    def list_files(self, remote_path: Optional[str] = None) -> list[str]:
        """List audio files in the remote directory."""
        path = remote_path or self.settings.remotePath
        from datetime import timedelta
        from app.database import utcnow

        yesterday = (utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        path = path.replace("$yesterday_date", yesterday)

        transport = self._get_transport()
        sftp = paramiko.SFTPClient.from_transport(transport)
        try:
            files = sftp.listdir(path)
            audio_files = [
                f for f in files if f.endswith((".wav", ".mp3", ".ogg", ".flac", ".au"))
            ]
            return [f"{path}/{f}" for f in audio_files]
        finally:
            sftp.close()
            transport.close()

    def download_file(self, remote_path: str, local_dir: str) -> str:
        """Download a single file and return local path."""
        filename = os.path.basename(remote_path)
        local_path = os.path.join(local_dir, filename)

        transport = self._get_transport()
        sftp = paramiko.SFTPClient.from_transport(transport)
        try:
            sftp.get(remote_path, local_path)
            logger.info(f"Downloaded {remote_path} -> {local_path}")
            return local_path
        finally:
            sftp.close()
            transport.close()

    def download_folder(
        self,
        local_base_dir: str,
        remote_path: Optional[str] = None,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
    ) -> list[str]:
        """
        Connects once and downloads all audio files from a remote folder.
        on_progress(downloaded, total, filename) is called after each file.
        """
        from datetime import timedelta
        from app.database import utcnow

        if not remote_path:
            path = self.settings.remotePath
            yesterday = (utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            remote_path = path.replace("$yesterday_date", yesterday)

        target_dir_name = os.path.basename(remote_path)
        local_dir = os.path.join(local_base_dir, target_dir_name)
        os.makedirs(local_dir, exist_ok=True)

        transport = self._get_transport()
        sftp = paramiko.SFTPClient.from_transport(transport)

        local_paths = []
        try:
            logger.info(f"Listing files in {remote_path}")
            files = sftp.listdir(remote_path)

            audio_files = [f for f in files if f.endswith((".wav", ".mp3", ".ogg", ".flac", ".au"))]
            info_files = {f for f in files if f.endswith(".info")}
            total = len(audio_files)
            logger.info(f"Found {total} audio files + {len(info_files)} info files to download.")

            for idx, filename in enumerate(audio_files, 1):
                r_file = f"{remote_path}/{filename}"
                l_file = os.path.join(local_dir, filename)

                # Skip files already downloaded (resume support)
                if os.path.exists(l_file):
                    logger.info(f"[{idx}/{total}] Skipping (already exists): {filename}")
                    local_paths.append(l_file)
                    if on_progress:
                        on_progress(idx, total, filename)
                    continue

                sftp.get(r_file, l_file)

                # Also download the matching .info file if it exists
                # audio: TELERENTA_123--456_R207-N210_N+407..._2026-03-15_10-05-57.au
                # info:  TELERENTA_123--456.info
                base_id = filename.split("_R")[0].split("_N+")[0].split("_N2")[0]
                # Try common patterns
                for info_name in info_files:
                    if info_name.startswith(base_id) and info_name.endswith(".info"):
                        info_local = os.path.join(local_dir, info_name)
                        if not os.path.exists(info_local):
                            try:
                                sftp.get(f"{remote_path}/{info_name}", info_local)
                            except Exception:
                                pass
                        break

                logger.info(f"[{idx}/{total}] Downloaded: {filename}")
                local_paths.append(l_file)

                if on_progress:
                    on_progress(idx, total, filename)

            return local_paths
        finally:
            sftp.close()
            transport.close()
