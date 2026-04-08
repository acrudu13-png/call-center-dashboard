from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = ""
    role: str = "viewer"
    allowed_agents: list[str] = []   # [] = all agents
    allowed_pages: list[str] = []    # [] = all pages
    organization_id: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    allowed_agents: Optional[list[str]] = None
    allowed_pages: Optional[list[str]] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    allowed_agents: list[str] = []
    allowed_pages: list[str] = []
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
