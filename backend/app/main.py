import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import calls, rules, logs, settings as settings_router, analyze, ingestion, auth, call_types, subdirectories
from app.routers.organizations import router as organizations_router, admin_router
from app.ws_manager import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _ensure_call_counters():
    """Ensure every organization has a call_counter row.
    The migration backfills existing orgs; this is a safety net for orgs created
    via paths that bypass the API. Counters are atomic per-org via UPDATE...RETURNING
    so call IDs never collide between tenants."""
    from sqlalchemy import text
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        result = db.execute(text("""
            INSERT INTO call_counters (organization_id, last_call_num)
            SELECT
                o.id,
                COALESCE(
                    (
                        SELECT MAX(CAST(REPLACE(c.call_id, 'CALL-', '') AS INTEGER))
                        FROM calls c
                        WHERE c.organization_id = o.id
                          AND c.call_id LIKE 'CALL-%'
                          AND c.call_id ~ '^CALL-[0-9]+$'
                    ),
                    999
                )
            FROM organizations o
            ON CONFLICT (organization_id) DO NOTHING
            RETURNING organization_id
        """)).fetchall()
        db.commit()
        if result:
            logger.info(f"Bootstrapped call counters for {len(result)} organization(s)")
    except Exception as e:
        logger.warning(f"Failed to ensure call counters: {e}")
        db.rollback()
    finally:
        db.close()


def _cleanup_orphaned_runs():
    """Mark any in-progress ingestion runs as stopped — they died with the previous process."""
    from app.database import SessionLocal, utcnow
    from app.models.job import IngestionRun

    db = SessionLocal()
    try:
        orphaned = (
            db.query(IngestionRun)
            .filter(IngestionRun.status.in_(["downloading", "processing", "stopping"]))
            .all()
        )
        for run in orphaned:
            logger.warning(f"Marking orphaned run {run.run_id} as stopped (was {run.status})")
            run.status = "stopped"
            run.error_message = "Server restarted while ingestion was running"
            run.completed_at = utcnow()
        if orphaned:
            db.commit()
            logger.info(f"Cleaned up {len(orphaned)} orphaned ingestion run(s)")
    finally:
        db.close()


def _ensure_admin():
    """Create or update the default superadmin user from env vars."""
    import os
    from app.database import SessionLocal
    from app.models.user import User
    from app.auth import hash_password, verify_password

    username = os.getenv("DEFAULT_ADMIN_USER", "admin")
    email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@callqa.local")
    password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin")

    db = SessionLocal()
    try:
        # Find by username (superadmin has organization_id=NULL)
        admin = db.query(User).filter(
            User.username == username,
            User.organization_id.is_(None),
        ).first()
        if not admin:
            admin = User(
                organization_id=None,
                username=username,
                email=email,
                hashed_password=hash_password(password),
                full_name="System Administrator",
                role="superadmin",
            )
            db.add(admin)
            db.commit()
            logger.info(f"Superadmin user created: {username}")
        else:
            updated = False
            if admin.role != "superadmin":
                admin.role = "superadmin"
                updated = True
            if not verify_password(password, admin.hashed_password):
                admin.hashed_password = hash_password(password)
                admin.email = email
                updated = True
            if updated:
                db.commit()
                logger.info(f"Superadmin synced from env")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    # Ensure every org has a per-org call counter row
    _ensure_call_counters()

    # Cleanup runs that were in-progress when the server last stopped
    _cleanup_orphaned_runs()

    # Ensure default admin account exists
    _ensure_admin()

    # Optional: start APScheduler for cron ingestion
    try:
        from app.scheduler import start_scheduler
        start_scheduler()
        logger.info("Scheduler started.")
    except Exception as e:
        logger.warning(f"Scheduler not started: {e}")

    yield

    # Shutdown
    logger.info("Application shutting down.")


app = FastAPI(
    title="Call Center QA Dashboard API",
    description="Backend API for the call center quality assurance dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(organizations_router)
app.include_router(admin_router)
app.include_router(calls.router)
app.include_router(calls.audio_router)
app.include_router(rules.router)
app.include_router(logs.router)
app.include_router(settings_router.router)
app.include_router(analyze.router)
app.include_router(ingestion.router)
app.include_router(call_types.router)
app.include_router(subdirectories.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    """WebSocket endpoint. Authenticates via ?token=<jwt> query param.
    Connections are scoped per organization; superadmin clients see all events."""
    from app.auth import decode_token
    from app.database import SessionLocal
    from app.models.user import User

    org_id: str | None = None
    if token:
        try:
            payload = decode_token(token)
            if payload.get("type") == "access":
                user_id = payload.get("sub")
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user and user.is_active:
                        # Superadmin → key="*" (sees all events)
                        # Others → their organization_id
                        org_id = user.organization_id if user.role != "superadmin" else None
                finally:
                    db.close()
        except Exception as e:
            logger.warning(f"WS auth failed: {e}")
            await websocket.close(code=1008)
            return
    else:
        # No token → reject
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, org_id)
    try:
        while True:
            # Keep connection alive; ignore client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
