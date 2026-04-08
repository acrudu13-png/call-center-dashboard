from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.subdirectory import Subdirectory
from app.auth import get_current_user, require_role, scope_query, get_org_id

router = APIRouter(prefix="/api/subdirectories", tags=["subdirectories"], dependencies=[Depends(get_current_user)])


class SubdirectoryResponse(BaseModel):
    id: int
    key: str
    display_name: str
    direction: str
    enabled: bool
    discovered_from: Optional[str] = None


class SubdirectoryCreate(BaseModel):
    key: str
    display_name: str = ""
    direction: str = "unknown"
    enabled: bool = True


class SubdirectoryUpdate(BaseModel):
    display_name: Optional[str] = None
    direction: Optional[str] = None
    enabled: Optional[bool] = None


@router.get("", response_model=list[SubdirectoryResponse])
def list_subdirectories(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    items = scope_query(db.query(Subdirectory), Subdirectory, current_user).order_by(Subdirectory.key).all()
    return [
        SubdirectoryResponse(
            id=s.id, key=s.key, display_name=s.display_name or s.key,
            direction=s.direction, enabled=s.enabled, discovered_from=s.discovered_from,
        )
        for s in items
    ]


@router.post("", response_model=SubdirectoryResponse, status_code=201)
def create_subdirectory(
    body: SubdirectoryCreate,
    _user=Depends(require_role("org_admin", "manager")),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(_user)
    if db.query(Subdirectory).filter(Subdirectory.organization_id == org_id, Subdirectory.key == body.key).first():
        raise HTTPException(status_code=409, detail="Subdirectory key already exists")
    s = Subdirectory(
        organization_id=org_id,
        key=body.key,
        display_name=body.display_name or body.key,
        direction=body.direction,
        enabled=body.enabled,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return SubdirectoryResponse(
        id=s.id, key=s.key, display_name=s.display_name,
        direction=s.direction, enabled=s.enabled, discovered_from=s.discovered_from,
    )


@router.put("/{key}", response_model=SubdirectoryResponse)
def update_subdirectory(
    key: str,
    body: SubdirectoryUpdate,
    _user=Depends(require_role("org_admin", "manager")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(current_user)
    s = db.query(Subdirectory).filter(Subdirectory.organization_id == org_id, Subdirectory.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subdirectory not found")
    if body.display_name is not None:
        s.display_name = body.display_name
    if body.direction is not None:
        s.direction = body.direction
    if body.enabled is not None:
        s.enabled = body.enabled
    db.commit()
    db.refresh(s)
    return SubdirectoryResponse(
        id=s.id, key=s.key, display_name=s.display_name,
        direction=s.direction, enabled=s.enabled, discovered_from=s.discovered_from,
    )


@router.delete("/{key}")
def delete_subdirectory(
    key: str,
    _user=Depends(require_role("org_admin")),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = get_org_id(current_user)
    s = db.query(Subdirectory).filter(Subdirectory.organization_id == org_id, Subdirectory.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subdirectory not found")
    db.delete(s)
    db.commit()
    return {"message": f"Subdirectory '{key}' deleted"}
