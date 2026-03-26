// ============================================================
// Mock Data for Transcription Logs & Monitoring
// ============================================================

export type JobStatus = 
  | "queued" 
  | "uploading" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "deleting";

export type LogLevel = "info" | "warn" | "error" | "success";

export interface TranscriptionJob {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  status: JobStatus;
  sonioxJobId?: string;
  uploadedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

export interface CronStats {
  lastRun: string | null;
  nextRun: string | null;
  isRunning: boolean;
  totalProcessed: number;
  totalFailed: number;
  totalQueued: number;
  averageProcessingTime: number; // seconds
}

// --- Generate mock transcription jobs ---
function generateJobs(): TranscriptionJob[] {
  const statuses: JobStatus[] = ["queued", "uploading", "processing", "completed", "completed", "completed", "failed", "deleting"];
  const jobs: TranscriptionJob[] = [];

  for (let i = 0; i < 15; i++) {
    const status = statuses[i % statuses.length];
    const now = new Date();
    const uploadedAt = new Date(now.getTime() - (i * 5 * 60000)); // 5 min apart
    
    const job: TranscriptionJob = {
      id: `JOB-${String(2000 + i)}`,
      fileName: `recording_AGT-00${(i % 8) + 1}_${uploadedAt.toISOString().split("T")[0]}_${String(i).padStart(3, "0")}.wav`,
      fileSize: Math.floor(Math.random() * 5000000) + 500000, // 0.5-5.5 MB
      status,
      sonioxJobId: status !== "queued" ? `soniox_${Math.random().toString(36).substring(7)}` : undefined,
      uploadedAt: uploadedAt.toISOString(),
      startedAt: status !== "queued" ? new Date(uploadedAt.getTime() + 30000).toISOString() : undefined,
      completedAt: status === "completed" ? new Date(uploadedAt.getTime() + 120000).toISOString() : undefined,
      retryCount: status === "failed" ? Math.floor(Math.random() * 3) + 1 : 0,
    };

    if (status === "failed") {
      const errors = [
        "Connection timeout while uploading to Soniox",
        "Invalid audio format - file corrupted",
        "Soniox API rate limit exceeded",
        "Transcription failed - audio too short",
        "API key expired",
      ];
      job.error = errors[i % errors.length];
    }

    jobs.push(job);
  }

  return jobs;
}

// --- Generate mock log entries ---
function generateLogs(): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = new Date();

  const logTemplates: { level: LogLevel; message: string }[] = [
    { level: "info", message: "Cron job started - checking for new recordings" },
    { level: "info", message: "Found 3 new files to process" },
    { level: "info", message: "Uploading file to Soniox API" },
    { level: "success", message: "File uploaded successfully, job created" },
    { level: "info", message: "Polling transcription status" },
    { level: "info", message: "Transcription in progress..." },
    { level: "success", message: "Transcription completed, retrieving results" },
    { level: "info", message: "Deleting transcription from Soniox storage" },
    { level: "success", message: "Transcription deleted successfully" },
    { level: "warn", message: "Rate limit approaching, slowing down requests" },
    { level: "error", message: "Failed to connect to Soniox API - retrying" },
    { level: "info", message: "Sending transcription to LLM for analysis" },
    { level: "success", message: "LLM analysis completed" },
    { level: "info", message: "Saving results to database" },
    { level: "success", message: "Cron job completed - processed 12 files" },
  ];

  for (let i = 0; i < 50; i++) {
    const template = logTemplates[i % logTemplates.length];
    const timestamp = new Date(now.getTime() - (i * 30000)); // 30 sec apart

    logs.push({
      id: `LOG-${String(10000 + i)}`,
      timestamp: timestamp.toISOString(),
      level: template.level,
      message: template.message,
      jobId: i % 3 === 0 ? `JOB-${String(2000 + Math.floor(i / 3))}` : undefined,
      metadata: i % 5 === 0 ? { duration: Math.floor(Math.random() * 60) + 10, fileSize: Math.floor(Math.random() * 5000000) } : undefined,
    });
  }

  return logs.reverse(); // Most recent first
}

export const transcriptionJobs: TranscriptionJob[] = generateJobs();
export const logEntries: LogEntry[] = generateLogs();

export const cronStats: CronStats = {
  lastRun: new Date(Date.now() - 120000).toISOString(),
  nextRun: new Date(Date.now() + 3480000).toISOString(), // ~58 min from now
  isRunning: false,
  totalProcessed: 1247,
  totalFailed: 23,
  totalQueued: transcriptionJobs.filter(j => j.status === "queued").length,
  averageProcessingTime: 45, // seconds
};

// --- Helper functions ---
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getStatusColor(status: JobStatus): string {
  switch (status) {
    case "queued": return "bg-gray-500";
    case "uploading": return "bg-blue-500";
    case "processing": return "bg-yellow-500";
    case "completed": return "bg-green-500";
    case "failed": return "bg-red-500";
    case "deleting": return "bg-purple-500";
    default: return "bg-gray-500";
  }
}
