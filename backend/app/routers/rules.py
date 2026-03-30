from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rule import QARule
from app.schemas.rule import (
    QARuleCreate, QARuleUpdate, QARuleResponse, ReorderRequest,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/rules", tags=["rules"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[QARuleResponse])
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(QARule).order_by(QARule.sort_order).all()
    return [
        QARuleResponse(
            rule_id=r.rule_id, title=r.title, description=r.description,
            section=r.section, rule_type=r.rule_type, max_score=r.max_score,
            enabled=r.enabled, is_critical=r.is_critical, direction=r.direction,
            sort_order=r.sort_order,
        )
        for r in rules
    ]


@router.post("", response_model=QARuleResponse, status_code=201)
def create_rule(payload: QARuleCreate, db: Session = Depends(get_db)):
    existing = db.query(QARule).filter(QARule.rule_id == payload.rule_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Rule ID already exists")
    rule = QARule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return QARuleResponse(
        rule_id=rule.rule_id, title=rule.title, description=rule.description,
        section=rule.section, rule_type=rule.rule_type, max_score=rule.max_score,
        enabled=rule.enabled, is_critical=rule.is_critical, direction=rule.direction,
        sort_order=rule.sort_order,
    )


@router.put("/{rule_id}", response_model=QARuleResponse)
def update_rule(rule_id: str, payload: QARuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(QARule).filter(QARule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return QARuleResponse(
        rule_id=rule.rule_id, title=rule.title, description=rule.description,
        section=rule.section, rule_type=rule.rule_type, max_score=rule.max_score,
        enabled=rule.enabled, is_critical=rule.is_critical, direction=rule.direction,
        sort_order=rule.sort_order,
    )


@router.delete("/{rule_id}")
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(QARule).filter(QARule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": f"Rule {rule_id} deleted"}


@router.post("/reorder")
def reorder_rules(payload: ReorderRequest, db: Session = Depends(get_db)):
    for idx, rule_id in enumerate(payload.rule_ids):
        rule = db.query(QARule).filter(QARule.rule_id == rule_id).first()
        if rule:
            rule.sort_order = idx
    db.commit()
    return {"message": "Rules reordered"}
