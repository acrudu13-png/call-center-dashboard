// ============================================================
// API Client — connects to the Python FastAPI backend
// ============================================================

import { API_BASE, TOKEN_KEY, REFRESH_KEY } from "@/lib/config";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // Token expired or invalid — redirect to login
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Calls ──────────────────────────────────────────────────

export interface CallSummary {
  id: string;
  callId: string;
  dateTime: string;
  agentName: string;
  agentId: string;
  customerPhone: string;
  duration: number;
  qaScore: number;
  status: string;
  rulesFailed: string[];
  compliancePass: boolean;
  direction: string;
  callType?: string | null;
  isEligible: boolean;
  ineligibleReason?: string | null;
}

export interface CallListResponse {
  calls: CallSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TranscriptLine {
  speaker: string;
  timestamp: number;
  text: string;
}

export interface ScorecardEntry {
  ruleId: string;
  ruleTitle: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
  extractedValue?: string | null;
}

export interface CallDetail extends CallSummary {
  transcript: TranscriptLine[];
  aiScorecard: ScorecardEntry[];
  aiSummary?: string;
  aiGrade?: string;
  aiImprovementAdvice?: string[];
  aiTotalEarned?: number;
  aiTotalPossible?: number;
  hasCriticalFailure: boolean;
  criticalFailureReason?: string;
  rawJson: Record<string, unknown>;
  audioFileName?: string | null;
  processedAt?: string | null;
  llmRequest?: string | null;
  llmResponse?: string | null;
}

export async function fetchCalls(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  agentId?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  minScore?: number;
  maxScore?: number;
  runId?: string;
  direction?: string;
  callType?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<CallListResponse> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  return apiFetch(`/api/calls?${sp.toString()}`);
}

export async function fetchCall(callId: string): Promise<CallDetail> {
  return apiFetch(`/api/calls/${callId}`);
}

export async function fetchCallStats(): Promise<{
  totalCalls: number;
  completed: number;
  flagged: number;
  inReview: number;
  processing: number;
  averageScore: number;
  complianceRate: number;
}> {
  return apiFetch("/api/calls/stats");
}

export async function fetchAgents(): Promise<
  { agentId: string; agentName: string; callCount: number }[]
> {
  return apiFetch("/api/calls/agents");
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  totalCalls: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  avgDuration: number;
  complianceRate: number;
  flaggedCount: number;
  criticalCount: number;
  excellentCount: number;
  goodCount: number;
  poorCount: number;
}

export async function fetchAgentStats(): Promise<{ agents: AgentStats[] }> {
  return apiFetch("/api/calls/agents/stats");
}

export function getExportCsvUrl(params: {
  status?: string;
  agentId?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  runId?: string;
  includeRules?: boolean;
} = {}): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const qs = sp.toString();
  return `${API_BASE}/api/calls/export/csv${qs ? `?${qs}` : ""}`;
}

export async function updateCallStatus(callId: string, status: string) {
  return apiFetch(`/api/calls/${callId}/status?status=${status}`, {
    method: "PATCH",
  });
}

export async function deleteCall(callId: string) {
  return apiFetch(`/api/calls/${callId}`, { method: "DELETE" });
}

// ── QA Rules ──────────────────────────────────────────────

export interface QARule {
  rule_id: string;
  title: string;
  description: string;
  section: string;
  rule_type: string;
  max_score: number;
  enabled: boolean;
  is_critical: boolean;
  direction: string;
  call_types: string[];
  sort_order: number;
}

export async function fetchRules(): Promise<QARule[]> {
  return apiFetch("/api/rules");
}

export async function createRule(rule: Omit<QARule, "sort_order"> & { sort_order?: number }) {
  return apiFetch("/api/rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateRule(ruleId: string, data: Partial<QARule>) {
  return apiFetch(`/api/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRule(ruleId: string) {
  return apiFetch(`/api/rules/${ruleId}`, { method: "DELETE" });
}

export async function reorderRules(ruleIds: string[]) {
  return apiFetch("/api/rules/reorder", {
    method: "POST",
    body: JSON.stringify({ rule_ids: ruleIds }),
  });
}

// ── Logs & Jobs ───────────────────────────────────────────

export interface Job {
  jobId: string;
  fileName: string;
  source: string;
  status: string;
  progress: number;
  callId?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  jobId?: string;
}

export async function fetchJobs(params: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}): Promise<{ jobs: Job[]; total: number }> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  return apiFetch(`/api/logs/jobs?${sp.toString()}`);
}

export async function fetchLogEntries(params: {
  page?: number;
  pageSize?: number;
  level?: string;
  source?: string;
  jobId?: string;
} = {}): Promise<{ logs: LogEntry[]; total: number }> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  return apiFetch(`/api/logs/entries?${sp.toString()}`);
}

// ── Settings ──────────────────────────────────────────────

export async function fetchSetting<T>(key: string): Promise<T> {
  return apiFetch(`/api/settings/${key}`);
}

export async function saveSetting<T>(key: string, data: T): Promise<T> {
  return apiFetch(`/api/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function testConnection(key: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  return apiFetch(`/api/settings/${key}/test`, { method: "POST" });
}

// ── Analysis ──────────────────────────────────────────────

export async function analyzeCall(params: {
  callId: string;
  transcript?: TranscriptLine[];
  ruleIds?: string[];
  mainPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingBudget?: number;
  dryRun?: boolean;
}): Promise<AnalyzeResponse> {
  return apiFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface AnalyzeResponse {
  summary: string;
  improvementAdvice: string[];
  grade: string;
  overallScore: number;
  totalEarned: number;
  totalPossible: number;
  results: ScorecardEntry[];
  hasCriticalFailure: boolean;
  criticalFailureReason?: string | null;
  isEligible: boolean;
  ineligibleReason?: string | null;
  speakerMap: Record<string, string>;
  llmRequest?: string | null;
  llmResponse?: string | null;
}

export interface ScorecardEntry {
  ruleId: string;
  ruleTitle: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
  extractedValue?: string | null;
}

export async function bulkReanalyze(params: {
  status?: string;
  agentId?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  runId?: string;
  direction?: string;
  callType?: string;
} = {}): Promise<{ message: string; total: number }> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  return apiFetch(`/api/analyze/bulk?${sp.toString()}`, { method: "POST" });
}

export async function stopBulkReanalyze(): Promise<{ message: string; reset: number }> {
  return apiFetch(`/api/analyze/bulk/stop`, { method: "POST" });
}

export async function bulkReclassify(params: {
  status?: string;
  agentId?: string;
  search?: string;
  minScore?: number;
  maxScore?: number;
  runId?: string;
  direction?: string;
  callType?: string;
} = {}): Promise<{ message: string; total: number }> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  return apiFetch(`/api/analyze/bulk/reclassify?${sp.toString()}`, { method: "POST" });
}

// ── Ingestion ─────────────────────────────────────────────

export async function triggerIngestion(source: string = "sftp", remotePath?: string) {
  const sp = new URLSearchParams();
  sp.set("source", source);
  if (remotePath) sp.set("remote_path", remotePath);
  return apiFetch(`/api/ingestion/trigger?${sp.toString()}`, {
    method: "POST",
  });
}

export async function fetchIngestionStatus(): Promise<{
  activeJobs: number;
  isRunning: boolean;
}> {
  return apiFetch("/api/ingestion/status");
}

export interface IngestionRun {
  runId: string;
  source: string;
  status: "downloading" | "processing" | "stopping" | "completed" | "failed" | "stopped";
  remotePath?: string;
  totalFiles: number;
  downloadedFiles: number;
  processedFiles: number;
  failedFiles: number;
  currentFile?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface IngestionRunListItem {
  runId: string;
  dateLabel: string | null;
  status: string;
  totalFiles: number;
  processedFiles: number;
  startedAt: string | null;
}

export async function fetchIngestionRunsList(): Promise<{ runs: IngestionRunListItem[] }> {
  return apiFetch("/api/ingestion/runs-list");
}

export async function fetchIngestionProgress(limit: number = 5): Promise<{
  runs: IngestionRun[];
}> {
  return apiFetch(`/api/ingestion/progress?limit=${limit}`);
}

export async function deleteIngestionRun(runId: string): Promise<{
  deleted: boolean;
  runId?: string;
  message: string;
}> {
  return apiFetch(`/api/ingestion/run/${runId}`, { method: "DELETE" });
}

export async function rerunIngestion(runId: string): Promise<{
  rerun: boolean;
  message: string;
  originalRunId?: string;
}> {
  return apiFetch(`/api/ingestion/rerun/${runId}`, { method: "POST" });
}

export async function stopIngestion(runId?: string): Promise<{
  stopped: boolean;
  runId?: string;
  message: string;
}> {
  const sp = new URLSearchParams();
  if (runId) sp.set("run_id", runId);
  return apiFetch(`/api/ingestion/stop?${sp.toString()}`, { method: "POST" });
}

// ── Audio ─────────────────────────────────────────────────

export function getAudioUrl(callId: string): string {
  const token = getAuthToken();
  const base = `${API_BASE}/api/calls/${callId}/audio`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

// ── Call Types ────────────────────────────────────────────

export interface CallTypeInfo {
  id: number;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  sort_order: number;
}

export async function fetchCallTypes(): Promise<CallTypeInfo[]> {
  return apiFetch("/api/call-types");
}

export async function createCallType(data: { key: string; name: string; description?: string; enabled?: boolean }): Promise<CallTypeInfo> {
  return apiFetch("/api/call-types", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCallType(key: string, data: { name?: string; description?: string; enabled?: boolean }): Promise<CallTypeInfo> {
  return apiFetch(`/api/call-types/${key}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCallType(key: string): Promise<void> {
  return apiFetch(`/api/call-types/${key}`, { method: "DELETE" });
}

// ── Users ─────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  allowed_agents: string[];
  allowed_pages: string[];
}

export async function fetchUsers(): Promise<{ users: UserInfo[]; total: number }> {
  return apiFetch("/api/auth/users");
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role?: string;
  allowed_agents?: string[];
  allowed_pages?: string[];
}): Promise<UserInfo> {
  return apiFetch("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(userId: string, data: {
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  allowed_agents?: string[];
  allowed_pages?: string[];
}): Promise<UserInfo> {
  return apiFetch(`/api/auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return apiFetch(`/api/auth/users/${userId}`, { method: "DELETE" });
}

// ── Health ─────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; version: string }> {
  return apiFetch("/api/health");
}
