import logging
import subprocess

logger = logging.getLogger(__name__)


def get_audio_duration(file_path: str) -> int:
    """Get audio duration in seconds using ffprobe. Returns 0 on failure."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            return int(float(result.stdout.strip()))
    except Exception as e:
        logger.warning(f"ffprobe failed for {file_path}: {e}")
    return 0
