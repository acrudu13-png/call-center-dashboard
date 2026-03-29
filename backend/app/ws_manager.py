"""
WebSocket connection manager — broadcasts ingestion progress, logs, and job updates
to all connected frontend clients in real time.
"""
import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._loop = asyncio.get_event_loop()
        logger.info(f"WS client connected ({len(self.active_connections)} total)")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WS client disconnected ({len(self.active_connections)} total)")

    async def _send(self, data: dict):
        """Send to all connected clients, remove dead ones."""
        dead = []
        message = json.dumps(data)
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast(self, event_type: str, payload: dict):
        """Broadcast an event to all connected clients."""
        await self._send({"type": event_type, **payload})

    def broadcast_sync(self, event_type: str, payload: dict):
        """
        Thread-safe broadcast — call this from sync code (e.g. SFTP download callback).
        Schedules the async broadcast on the event loop.
        """
        if not self.active_connections:
            return
        loop = self._loop
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast(event_type, payload), loop
            )


# Singleton instance used across the app
manager = ConnectionManager()
