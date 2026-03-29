import asyncio
import os
import logging
import subprocess
import time
import threading
from typing import Optional, Callable

from soniox import SonioxClient
from soniox.types import (
    CreateTranscriptionConfig,
    StructuredContext,
    StructuredContextGeneralItem,
)

from app.schemas.setting import SonioxSettings

logger = logging.getLogger(__name__)

# Audio formats natively supported by Soniox
SONIOX_SUPPORTED = {".aac", ".aiff", ".amr", ".asf", ".flac", ".mp3", ".ogg", ".wav", ".webm", ".m4a", ".mp4"}

# Type for the log callback: (level, source, message, job_id) -> None
LogCallback = Optional[Callable[[str, str, str, Optional[str]], None]]


def _convert_to_wav(input_path: str) -> str:
    """Convert unsupported audio formats (e.g. .au) to .wav using ffmpeg."""
    ext = os.path.splitext(input_path)[1].lower()
    if ext in SONIOX_SUPPORTED:
        return input_path

    output_path = os.path.splitext(input_path)[0] + ".wav"
    if os.path.exists(output_path):
        logger.info(f"Converted file already exists: {output_path}")
        return output_path

    logger.info(f"Converting {ext} -> .wav: {os.path.basename(input_path)}")
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", output_path],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr[:500]}")

    logger.info(f"Conversion complete: {os.path.basename(output_path)}")
    return output_path


class SonioxService:
    """Handles speech-to-text transcription via the Soniox SDK (async file API)."""

    def __init__(self, settings: SonioxSettings):
        self.settings = settings

    async def transcribe_file(
        self,
        file_path: str,
        stop_event: Optional[threading.Event] = None,
        log_fn: LogCallback = None,
        job_id: Optional[str] = None,
    ) -> list[dict]:
        """
        Upload a file to Soniox, wait for transcription, return segments.
        All sync SDK calls run in a thread so the event loop stays free.
        Always cleans up Soniox resources even on failure.
        """
        if not self.settings.apiKey:
            raise ValueError("Soniox API key is not configured.")

        # Run the entire sync pipeline in a thread
        return await asyncio.to_thread(
            self._transcribe_sync, file_path, stop_event, log_fn, job_id
        )

    def _transcribe_sync(
        self,
        file_path: str,
        stop_event: Optional[threading.Event],
        log_fn: LogCallback,
        job_id: Optional[str],
    ) -> list[dict]:
        """Sync implementation — runs in a thread, never blocks the event loop."""

        filename = os.path.basename(file_path)

        def _log(level: str, msg: str):
            logger.log(getattr(logging, level.upper(), logging.INFO), msg)
            if log_fn:
                log_fn(level, "transcription", msg, job_id)

        # Log the API key being used (masked)
        key = self.settings.apiKey.strip()
        masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
        _log("info", f"Using Soniox API key: {masked}")

        # Convert unsupported formats (e.g. .au) to .wav
        audio_path = _convert_to_wav(file_path)
        if audio_path != file_path:
            _log("info", f"Converted {filename} to .wav for Soniox")

        # Pass API key directly to the client
        client = SonioxClient(api_key=key, api_base_url="https://api.eu.soniox.com/v1")

        uploaded_file_id: Optional[str] = None
        transcription_id: Optional[str] = None

        try:
            # 1. Upload file
            _log("info", f"Uploading {filename} to Soniox...")
            uploaded_file = client.files.upload(audio_path)
            uploaded_file_id = uploaded_file.id
            _log("info", f"Upload complete for {filename} (file_id: {uploaded_file_id})")

            # 2. Build config
            context_items = [
                StructuredContextGeneralItem(key="domain", value="Call Center"),
            ]
            if self.settings.callContext:
                context_items.append(
                    StructuredContextGeneralItem(key="topic", value=self.settings.callContext)
                )

            config = CreateTranscriptionConfig(
                model="stt-async-v4",
                language_hints=[self.settings.language] if self.settings.language else ["ro"],
                enable_speaker_diarization=True,
                context=StructuredContext(
                    general=context_items,
                    terms=self.settings.customVocabulary or [],
                ),
            )

            # 3. Create transcription and wait (interruptible)
            _log("info", f"Creating Soniox transcription job for {filename}...")
            transcription = client.stt.create(config=config, file_id=uploaded_file_id)
            transcription_id = transcription.id
            _log("info", f"Soniox job {transcription_id} created, waiting for result...")

            # Poll with stop check
            poll_count = 0
            while True:
                if stop_event and stop_event.is_set():
                    _log("warn", f"Stop requested — aborting transcription for {filename}")
                    raise InterruptedError("Transcription interrupted by stop request")

                try:
                    t = client.stt.get(transcription_id)
                    t_status = getattr(t, "status", None)
                    if t_status == "completed":
                        break
                    if t_status in ("failed", "error"):
                        error_msg = getattr(t, "error", None) or getattr(t, "error_message", None) or str(t)
                        _log("error", f"Soniox transcription {t_status} for {filename}: {error_msg}")
                        raise RuntimeError(f"Soniox transcription {t_status}: {error_msg}")
                    poll_count += 1
                    if poll_count % 5 == 0:
                        _log("info", f"Still transcribing {filename} (status: {t_status})...")
                except AttributeError:
                    _log("info", f"Falling back to blocking wait for {filename}")
                    client.stt.wait(transcription_id)
                    break

                time.sleep(2)

            # 4. Get result
            result = client.stt.get_transcript(transcription_id)
            _log("info", f"Transcription complete for {filename}: {len(result.tokens)} tokens")

            # 5. Parse tokens into segments
            segments = self._tokens_to_segments(result.tokens)
            merged = self._merge_segments(segments)
            _log("info", f"Parsed {len(merged)} speaker segments from {filename}")

            return merged

        except InterruptedError:
            raise
        except Exception as e:
            _log("error", f"Soniox failed for {filename}: {e}")
            raise

        finally:
            # ALWAYS clean up Soniox resources to avoid hitting storage limits
            if transcription_id:
                try:
                    client.stt.delete(transcription_id)
                    _log("info", f"Deleted Soniox transcription {transcription_id}")
                except Exception as e:
                    _log("warn", f"Failed to delete Soniox transcription {transcription_id}: {e}")

            if uploaded_file_id:
                try:
                    client.files.delete(uploaded_file_id)
                    _log("info", f"Deleted Soniox file {uploaded_file_id}")
                except Exception as e:
                    _log("warn", f"Failed to delete Soniox file {uploaded_file_id}: {e}")

            # Cleanup converted wav file
            if audio_path != file_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except OSError:
                    pass

    @staticmethod
    def _tokens_to_segments(tokens) -> list[dict]:
        """Convert Soniox token list to our segment format."""
        segments = []
        current_speaker = None
        current_text = ""
        current_start = 0.0

        for token in tokens:
            speaker = getattr(token, "speaker", None) or "speaker_0"
            start_ms = getattr(token, "start_ms", 0) or 0
            text = getattr(token, "text", "") or ""

            if speaker != current_speaker:
                if current_text.strip():
                    segments.append({
                        "speaker": current_speaker or "speaker_0",
                        "timestamp": current_start / 1000.0,
                        "text": current_text.strip(),
                    })
                current_speaker = speaker
                current_text = text
                current_start = start_ms
            else:
                current_text += text

        # Last segment
        if current_text.strip():
            segments.append({
                "speaker": current_speaker or "speaker_0",
                "timestamp": current_start / 1000.0,
                "text": current_text.strip(),
            })

        return segments

    @staticmethod
    def _merge_segments(segments: list[dict], max_gap: float = 1.5) -> list[dict]:
        """Merge consecutive segments from the same speaker."""
        if not segments:
            return []

        merged = [segments[0].copy()]
        for seg in segments[1:]:
            last = merged[-1]
            if seg["speaker"] == last["speaker"]:
                last["text"] += " " + seg["text"]
            else:
                merged.append(seg.copy())
        return merged
