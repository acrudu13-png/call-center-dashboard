from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9-]+$", v):
            raise ValueError("Slug must contain only lowercase letters, numbers, and hyphens")
        return v


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    is_active: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: datetime
    user_count: int = 0
    call_count: int = 0


class OrganizationListResponse(BaseModel):
    organizations: list[OrganizationResponse]
    total: int


class OrganizationUsageStats(BaseModel):
    organization_id: str
    organization_name: str
    organization_slug: str
    is_active: bool
    user_count: int
    call_count: int
    completed_calls: int
    flagged_calls: int
    rules_count: int
    last_ingestion_at: Optional[datetime] = None
    total_ingestion_runs: int = 0


class PlatformUsageResponse(BaseModel):
    total_organizations: int
    active_organizations: int
    total_users: int
    total_calls: int
    organizations: list[OrganizationUsageStats]
