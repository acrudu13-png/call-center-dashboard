"""Organization management endpoints (superadmin only)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.organization import Organization
from app.models.call_counter import CallCounter
from app.models.user import User
from app.models.call import Call
from app.models.rule import QARule
from app.models.job import IngestionRun
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationListResponse, OrganizationUsageStats, PlatformUsageResponse,
)
from app.schemas.auth import UserCreate, UserResponse, UserListResponse
from app.auth import require_superadmin, hash_password

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def _org_to_response(org: Organization, user_count: int = 0, call_count: int = 0) -> OrganizationResponse:
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        is_active=org.is_active,
        created_at=org.created_at,
        user_count=user_count,
        call_count=call_count,
    )


@router.get("", response_model=OrganizationListResponse)
def list_organizations(
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()

    # Get counts in batch
    user_counts = dict(
        db.query(User.organization_id, func.count(User.id))
        .group_by(User.organization_id)
        .all()
    )
    call_counts = dict(
        db.query(Call.organization_id, func.count(Call.id))
        .group_by(Call.organization_id)
        .all()
    )

    return OrganizationListResponse(
        organizations=[
            _org_to_response(
                org,
                user_count=user_counts.get(org.id, 0),
                call_count=call_counts.get(org.id, 0),
            )
            for org in orgs
        ],
        total=len(orgs),
    )


@router.post("", response_model=OrganizationResponse, status_code=201)
def create_organization(
    body: OrganizationCreate,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    if db.query(Organization).filter(Organization.name == body.name).first():
        raise HTTPException(status_code=409, detail="Organization name already exists")
    if db.query(Organization).filter(Organization.slug == body.slug).first():
        raise HTTPException(status_code=409, detail="Organization slug already exists")

    org = Organization(name=body.name, slug=body.slug)
    db.add(org)
    db.flush()  # ensure org.id is populated
    # Create the per-org call counter so the first call starts at CALL-1000
    db.add(CallCounter(organization_id=org.id, last_call_num=999))
    db.commit()
    db.refresh(org)
    return _org_to_response(org)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    user_count = db.query(func.count(User.id)).filter(User.organization_id == org_id).scalar() or 0
    call_count = db.query(func.count(Call.id)).filter(Call.organization_id == org_id).scalar() or 0
    return _org_to_response(org, user_count=user_count, call_count=call_count)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    body: OrganizationUpdate,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if body.name is not None:
        # Check name uniqueness
        existing = db.query(Organization).filter(
            Organization.name == body.name, Organization.id != org_id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Organization name already exists")
        org.name = body.name
    if body.is_active is not None:
        org.is_active = body.is_active
    db.commit()
    db.refresh(org)
    return _org_to_response(org)


@router.delete("/{org_id}")
def delete_organization(
    org_id: str,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    """Soft-delete by setting is_active=False."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.is_active = False
    db.commit()
    return {"message": f"Organization '{org.name}' deactivated"}


# ── Org-specific user management (superadmin) ────────────────

@router.get("/{org_id}/users", response_model=UserListResponse)
def list_org_users(
    org_id: str,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    users = db.query(User).filter(User.organization_id == org_id).order_by(User.username).all()
    return UserListResponse(
        users=[
            UserResponse(
                id=u.id, username=u.username, email=u.email,
                full_name=u.full_name, role=u.role, is_active=u.is_active,
                allowed_agents=u.allowed_agents or [],
                allowed_pages=u.allowed_pages or [],
                organization_id=u.organization_id,
                organization_name=org.name,
            )
            for u in users
        ],
        total=len(users),
    )


@router.post("/{org_id}/users", response_model=UserResponse, status_code=201)
def create_org_user(
    org_id: str,
    body: UserCreate,
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if body.role not in ("org_admin", "manager", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be org_admin, manager, or viewer")

    # Uniqueness scoped to org
    if db.query(User).filter(User.organization_id == org_id, User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already exists in this organization")
    if db.query(User).filter(User.organization_id == org_id, User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already exists in this organization")

    user = User(
        organization_id=org_id,
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        allowed_agents=body.allowed_agents,
        allowed_pages=body.allowed_pages,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, role=user.role, is_active=user.is_active,
        allowed_agents=user.allowed_agents or [],
        allowed_pages=user.allowed_pages or [],
        organization_id=user.organization_id,
        organization_name=org.name,
    )


# ── Platform usage dashboard (superadmin) ─────────────────────

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


@admin_router.get("/usage", response_model=PlatformUsageResponse)
def platform_usage(
    _user: User = Depends(require_superadmin()),
    db: Session = Depends(get_db),
):
    """Get per-org usage stats across the entire platform."""
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()

    user_counts = dict(
        db.query(User.organization_id, func.count(User.id))
        .group_by(User.organization_id)
        .all()
    )
    call_counts = dict(
        db.query(Call.organization_id, func.count(Call.id))
        .group_by(Call.organization_id)
        .all()
    )
    completed_counts = dict(
        db.query(Call.organization_id, func.count(Call.id))
        .filter(Call.status == "completed")
        .group_by(Call.organization_id)
        .all()
    )
    flagged_counts = dict(
        db.query(Call.organization_id, func.count(Call.id))
        .filter(Call.status == "flagged")
        .group_by(Call.organization_id)
        .all()
    )
    rule_counts = dict(
        db.query(QARule.organization_id, func.count(QARule.id))
        .group_by(QARule.organization_id)
        .all()
    )
    last_runs = dict(
        db.query(IngestionRun.organization_id, func.max(IngestionRun.started_at))
        .group_by(IngestionRun.organization_id)
        .all()
    )
    run_counts = dict(
        db.query(IngestionRun.organization_id, func.count(IngestionRun.id))
        .group_by(IngestionRun.organization_id)
        .all()
    )

    org_stats = []
    for org in orgs:
        org_stats.append(OrganizationUsageStats(
            organization_id=org.id,
            organization_name=org.name,
            organization_slug=org.slug,
            is_active=org.is_active,
            user_count=user_counts.get(org.id, 0),
            call_count=call_counts.get(org.id, 0),
            completed_calls=completed_counts.get(org.id, 0),
            flagged_calls=flagged_counts.get(org.id, 0),
            rules_count=rule_counts.get(org.id, 0),
            last_ingestion_at=last_runs.get(org.id),
            total_ingestion_runs=run_counts.get(org.id, 0),
        ))

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_calls = db.query(func.count(Call.id)).scalar() or 0

    return PlatformUsageResponse(
        total_organizations=len(orgs),
        active_organizations=sum(1 for o in orgs if o.is_active),
        total_users=total_users,
        total_calls=total_calls,
        organizations=org_stats,
    )
