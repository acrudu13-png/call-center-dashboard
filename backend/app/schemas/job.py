from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobResponse(BaseModel):
    jobId: str
    fileName: str
    source: str
    status: str
    progress: float
    callId: Optional[str] = None
    errorMessage: Optional[str] = None
    metadata: dict = {}
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime

    model_config = {"from_attributes": True}


class LogEntryResponse(BaseModel):
    id: int
    timestamp: datetime
    level: str
    source: str
    message: str
    jobId: Optional[str] = None

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int


class LogListResponse(BaseModel):
    logs: list[LogEntryResponse]
    total: int
