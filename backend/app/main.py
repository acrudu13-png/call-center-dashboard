import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import calls, rules, logs, settings as settings_router, analyze, ingestion, auth, call_types
from app.ws_manager import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


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
    """Create or update the default admin user from env vars."""
    import os
    from app.database import SessionLocal
    from app.models.user import User
    from app.auth import hash_password, verify_password

    username = os.getenv("DEFAULT_ADMIN_USER", "admin")
    email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@callqa.local")
    password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin")

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == username).first()
        if not admin:
            admin = User(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                full_name="System Administrator",
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info(f"Admin user created: {username}")
        elif not verify_password(password, admin.hashed_password):
            admin.hashed_password = hash_password(password)
            admin.email = email
            db.commit()
            logger.info(f"Admin password synced from env")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

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
app.include_router(calls.router)
app.include_router(calls.audio_router)
app.include_router(rules.router)
app.include_router(logs.router)
app.include_router(settings_router.router)
app.include_router(analyze.router)
app.include_router(ingestion.router)
app.include_router(call_types.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; ignore client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
