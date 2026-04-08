"""
WebSocket connection manager — broadcasts ingestion progress, logs, and job updates
to connected clients in real time, scoped per organization.
"""
import asyncio
import json
import logging
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Per-org connections: {org_id: [WebSocket, ...]}
        # Superadmin connections live under the special key "*" and receive all events.
        self.org_connections: dict[str, list[WebSocket]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket, org_id: Optional[str]):
        """Accept a websocket and register it under the user's org (or '*' for superadmin)."""
        await websocket.accept()
        key = org_id if org_id else "*"
        self.org_connections.setdefault(key, []).append(websocket)
        self._loop = asyncio.get_event_loop()
        total = sum(len(v) for v in self.org_connections.values())
        logger.info(f"WS client connected to org={key} ({total} total)")

    def disconnect(self, websocket: WebSocket):
        for key, conns in list(self.org_connections.items()):
            if websocket in conns:
                conns.remove(websocket)
                if not conns:
                    del self.org_connections[key]
                break
        total = sum(len(v) for v in self.org_connections.values())
        logger.info(f"WS client disconnected ({total} total)")

    async def _send_to(self, conns: list[WebSocket], data: dict):
        """Send a message to a list of websockets, removing dead ones."""
        if not conns:
            return
        message = json.dumps(data)
        dead = []
        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast(self, event_type: str, payload: dict, org_id: Optional[str] = None):
        """Broadcast an event to clients in a specific org (and to superadmin clients).
        If org_id is None, the event is sent to ALL connected clients (legacy fallback)."""
        data = {"type": event_type, **payload}
        if org_id is None:
            # Legacy: send to all
            for conns in list(self.org_connections.values()):
                await self._send_to(list(conns), data)
            return
        # Send to org-specific clients + superadmin clients
        await self._send_to(list(self.org_connections.get(org_id, [])), data)
        await self._send_to(list(self.org_connections.get("*", [])), data)

    def broadcast_sync(self, event_type: str, payload: dict, org_id: Optional[str] = None):
        """Thread-safe broadcast — call this from sync code (e.g. SFTP download callback).
        Schedules the async broadcast on the event loop."""
        if not self.org_connections:
            return
        loop = self._loop
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast(event_type, payload, org_id), loop
            )


# Singleton instance used across the app
manager = ConnectionManager()
