from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Transcript ---
class TranscriptLineSchema(BaseModel):
    speaker: str
    timestamp: float
    text: str


# --- Scorecard ---
class ScorecardEntrySchema(BaseModel):
    ruleId: str
    ruleTitle: str
    passed: bool
    score: float
    maxScore: float
    details: str = ""
    extractedValue: Optional[str] = None


# --- Call responses ---
class CallSummary(BaseModel):
    id: str
    callId: str
    dateTime: str
    agentName: str
    agentId: str
    customerPhone: str
    duration: int
    qaScore: float
    status: str
    rulesFailed: list[str]
    compliancePass: bool
    direction: str = "unknown"
    callType: Optional[str] = None
    subdirectory: Optional[str] = None
    metadata: dict = {}
    isEligible: bool = True
    ineligibleReason: Optional[str] = None

    model_config = {"from_attributes": True}


class CallDetail(CallSummary):
    transcript: list[TranscriptLineSchema]
    aiScorecard: list[ScorecardEntrySchema]
    aiSummary: Optional[str] = None
    aiGrade: Optional[str] = None
    aiImprovementAdvice: Optional[list[str]] = None
    aiTotalEarned: Optional[float] = None
    aiTotalPossible: Optional[float] = None
    hasCriticalFailure: bool = False
    criticalFailureReason: Optional[str] = None
    rawJson: dict = {}
    audioFileName: Optional[str] = None
    processedAt: Optional[str] = None
    llmRequest: Optional[str] = None
    llmResponse: Optional[str] = None

    model_config = {"from_attributes": True}


class CallListResponse(BaseModel):
    calls: list[CallSummary]
    total: int
    page: int
    pageSize: int
    totalPages: int


# --- Analysis request / response ---
class AnalyzeRequest(BaseModel):
    callId: str
    transcript: Optional[list[TranscriptLineSchema]] = None  # If not provided, uses stored transcript
    ruleIds: Optional[list[str]] = None  # If not provided, uses all enabled rules
    mainPrompt: Optional[str] = None
    model: Optional[str] = None  # Override model for test mode
    temperature: Optional[float] = None
    maxTokens: Optional[int] = None
    thinkingBudget: Optional[int] = None  # Enable extended thinking with token budget
    dryRun: bool = False  # If true, don't save results to DB


class AnalyzeResponse(BaseModel):
    summary: str
    improvementAdvice: list[str]
    grade: str
    overallScore: float
    totalEarned: float
    totalPossible: float
    results: list[ScorecardEntrySchema]
    hasCriticalFailure: bool
    criticalFailureReason: Optional[str] = None
    isEligible: bool = True
    ineligibleReason: Optional[str] = None
    speakerMap: dict = {}
    llmRequest: Optional[str] = None
    llmResponse: Optional[str] = None
