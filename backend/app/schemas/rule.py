from pydantic import BaseModel
from typing import Optional


class QARuleBase(BaseModel):
    title: str
    description: str = ""
    section: str
    rule_type: str = "scoring"  # scoring | extraction
    max_score: float = 0
    enabled: bool = True
    is_critical: bool = False
    direction: str = "both"  # inbound | outbound | both
    call_types: list[str] = []  # [] = all types
    subdirectories: list[str] = []  # [] = all subdirectories
    metadata_conditions: list[dict] = []  # [{"field":"x","operator":"equals","value":"y"}]
    sort_order: int = 0


class QARuleCreate(QARuleBase):
    rule_id: str  # e.g. "rule-025"


class QARuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    section: Optional[str] = None
    rule_type: Optional[str] = None
    max_score: Optional[float] = None
    enabled: Optional[bool] = None
    is_critical: Optional[bool] = None
    direction: Optional[str] = None
    call_types: Optional[list[str]] = None
    subdirectories: Optional[list[str]] = None
    metadata_conditions: Optional[list[dict]] = None
    sort_order: Optional[int] = None


class QARuleResponse(QARuleBase):
    rule_id: str

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    rule_ids: list[str]  # ordered list of rule_ids
