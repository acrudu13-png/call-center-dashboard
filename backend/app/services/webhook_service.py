import logging
from typing import Optional
import httpx
from app.schemas.setting import WebhookSettings, ConnectionTestResult

logger = logging.getLogger(__name__)


class WebhookService:
    """Dispatches QA results to configured webhook endpoints."""

    def __init__(self, settings: WebhookSettings):
        self.settings = settings

    async def test_endpoint(self) -> ConnectionTestResult:
        """Send a test ping to the webhook endpoint."""
        if not self.settings.endpointUrl:
            return ConnectionTestResult(success=False, message="No endpoint URL configured.")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    self.settings.endpointUrl,
                    json={"type": "test", "message": "Webhook connectivity test"},
                    headers={**self.settings.headers, "Content-Type": "application/json"},
                )
                return ConnectionTestResult(
                    success=response.status_code < 400,
                    message=f"HTTP {response.status_code}: {response.text[:200]}",
                    latencyMs=int(response.elapsed.total_seconds() * 1000),
                )
        except Exception as e:
            logger.error(f"Webhook test failed: {e}")
            return ConnectionTestResult(success=False, message=str(e))

    async def dispatch(self, payload: dict) -> bool:
        """
        Send QA results payload to the webhook. Retries on failure.
        Returns True if successful.
        """
        if not self.settings.enabled:
            logger.info("Webhook disabled, skipping dispatch.")
            return False

        if not self.settings.endpointUrl:
            logger.warning("No webhook endpoint configured.")
            return False

        headers = {**self.settings.headers, "Content-Type": "application/json"}

        for attempt in range(1, self.settings.retryCount + 1):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.post(
                        self.settings.endpointUrl,
                        json=payload,
                        headers=headers,
                    )
                    if response.status_code < 400:
                        logger.info(f"Webhook dispatched successfully (attempt {attempt}).")
                        return True
                    else:
                        logger.warning(
                            f"Webhook returned {response.status_code} (attempt {attempt})"
                        )
            except Exception as e:
                logger.error(f"Webhook dispatch error (attempt {attempt}): {e}")

        logger.error(f"Webhook failed after {self.settings.retryCount} attempts.")
        return False
