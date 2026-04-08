from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserCreate, UserUpdate, LoginRequest, TokenResponse,
    RefreshRequest, UserResponse, UserListResponse, ChangePassword,
)
from app.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, require_role, get_org_id,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id, username=u.username, email=u.email,
        full_name=u.full_name, role=u.role, is_active=u.is_active,
        allowed_agents=u.allowed_agents or [],
        allowed_pages=u.allowed_pages or [],
        organization_id=u.organization_id,
        organization_name=u.organization.name if u.organization else None,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    # Username is unique per org, so multiple users may share a username across orgs.
    # Match by both username + password verification.
    candidates = db.query(User).filter(User.username == body.username).all()
    user = None
    for candidate in candidates:
        if verify_password(body.password, candidate.hashed_password):
            user = candidate
            break
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, user.organization_id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or deactivated")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role, user.organization_id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return _user_response(user)


@router.put("/me/password")
def change_my_password(
    body: ChangePassword,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "Password changed"}


# ── Admin-only user management ────────────────────────

@router.get("/users", response_model=UserListResponse)
def list_users(
    admin: User = Depends(require_role("org_admin")),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if admin.role != "superadmin":
        query = query.filter(User.organization_id == admin.organization_id)
    users = query.order_by(User.username).all()
    return UserListResponse(
        users=[_user_response(u) for u in users],
        total=len(users),
    )


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    body: UserCreate,
    admin: User = Depends(require_role("org_admin")),
    db: Session = Depends(get_db),
):
    if body.role not in ("org_admin", "manager", "viewer"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if body.role == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot create superadmin users")

    org_id = admin.organization_id  # org_admin creates in own org
    if admin.role == "superadmin":
        org_id = body.organization_id  # superadmin can specify
        if not org_id:
            raise HTTPException(400, "Superadmin must specify organization_id")

    # Uniqueness check scoped to org
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
    return _user_response(user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    body: UserUpdate,
    admin: User = Depends(require_role("org_admin")),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.id == user_id)
    if admin.role != "superadmin":
        query = query.filter(User.organization_id == admin.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.email is not None:
        user.email = body.email
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        if body.role not in ("org_admin", "manager", "viewer"):
            raise HTTPException(status_code=400, detail="Invalid role")
        if body.role == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot escalate to superadmin")
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.allowed_agents is not None:
        user.allowed_agents = body.allowed_agents
    if body.allowed_pages is not None:
        user.allowed_pages = body.allowed_pages
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: User = Depends(require_role("org_admin")),
    db: Session = Depends(get_db),
):
    query = db.query(User).filter(User.id == user_id)
    if admin.role != "superadmin":
        query = query.filter(User.organization_id == admin.organization_id)
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    if user.role == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete superadmin users")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
