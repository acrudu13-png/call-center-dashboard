from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.call_type import CallType
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/call-types", tags=["call-types"], dependencies=[Depends(get_current_user)])


class CallTypeResponse(BaseModel):
    id: int
    key: str
    name: str
    description: str
    enabled: bool
    sort_order: int


class CallTypeCreate(BaseModel):
    key: str
    name: str
    description: str = ""
    enabled: bool = True


class CallTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


@router.get("", response_model=list[CallTypeResponse])
def list_call_types(db: Session = Depends(get_db)):
    types = db.query(CallType).order_by(CallType.sort_order).all()
    return [
        CallTypeResponse(id=t.id, key=t.key, name=t.name, description=t.description,
                         enabled=t.enabled, sort_order=t.sort_order)
        for t in types
    ]


@router.post("", response_model=CallTypeResponse, status_code=201)
def create_call_type(
    body: CallTypeCreate,
    _user=Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db),
):
    if db.query(CallType).filter(CallType.key == body.key).first():
        raise HTTPException(status_code=409, detail="Key already exists")
    ct = CallType(key=body.key, name=body.name, description=body.description, enabled=body.enabled)
    db.add(ct)
    db.commit()
    db.refresh(ct)
    return CallTypeResponse(id=ct.id, key=ct.key, name=ct.name, description=ct.description,
                            enabled=ct.enabled, sort_order=ct.sort_order)


@router.put("/{key}", response_model=CallTypeResponse)
def update_call_type(
    key: str,
    body: CallTypeUpdate,
    _user=Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db),
):
    ct = db.query(CallType).filter(CallType.key == key).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Call type not found")
    if body.name is not None:
        ct.name = body.name
    if body.description is not None:
        ct.description = body.description
    if body.enabled is not None:
        ct.enabled = body.enabled
    db.commit()
    db.refresh(ct)
    return CallTypeResponse(id=ct.id, key=ct.key, name=ct.name, description=ct.description,
                            enabled=ct.enabled, sort_order=ct.sort_order)


@router.delete("/{key}")
def delete_call_type(
    key: str,
    _user=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    ct = db.query(CallType).filter(CallType.key == key).first()
    if not ct:
        raise HTTPException(status_code=404, detail="Call type not found")
    db.delete(ct)
    db.commit()
    return {"message": f"Call type '{key}' deleted"}
