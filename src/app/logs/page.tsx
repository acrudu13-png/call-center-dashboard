"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  FileAudio,
  Server,
  Timer,
  Inbox,
  Download,
  Cog,
  FolderDown,
  Wifi,
  WifiOff,
  Square,
  StopCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  fetchJobs,
  fetchLogEntries,
  fetchIngestionProgress,
  stopIngestion,
  rerunIngestion,
  deleteIngestionRun,
  type Job,
  type LogEntry,
  type IngestionRun,
} from "@/lib/api";
import { useIngestionSocket } from "@/lib/useIngestionSocket";
import { useTranslation } from "@/lib/i18n";

type JobStatus = "queued" | "transcribing" | "analyzing" | "completed" | "failed";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "Queued", icon: Inbox, variant: "secondary" },
  transcribing: { label: "Transcribing", icon: Loader2, variant: "default" },
  analyzing: { label: "Analyzing", icon: Cog, variant: "default" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: XCircle, variant: "destructive" },
};

const levelConfig: Record<string, { color: string; bgColor: string }> = {
  info: { color: "text-blue-600", bgColor: "bg-blue-100" },
  warn: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  error: { color: "text-red-600", bgColor: "bg-red-100" },
  debug: { color: "text-gray-600", bgColor: "bg-gray-100" },
};

const ingestionStatusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  downloading: { label: "Downloading", icon: Download, color: "text-blue-600" },
  processing: { label: "Processing", icon: Cog, color: "text-yellow-600" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-600" },
  failed: { label: "Failed", icon: XCircle, color: "text-red-600" },
  stopping: { label: "Stopping...", icon: Loader2, color: "text-orange-600" },
  stopped: { label: "Stopped", icon: StopCircle, color: "text-orange-600" },
};

function LogLine({
  log,
  config,
  isLong,
  formatTime,
}: {
  log: LogEntry;
  config: { color: string; bgColor: string };
  isLong: boolean;
  formatTime: (ts: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-1.5 rounded ${config.bgColor} bg-opacity-50 ${isLong ? "cursor-pointer" : ""}`}
      onClick={isLong ? () => setExpanded(!expanded) : undefined}
    >
      <div className="flex gap-2">
        <span className="text-muted-foreground shrink-0">
          {formatTime(log.timestamp)}
        </span>
        <span className={`uppercase font-semibold w-12 shrink-0 ${config.color}`}>
          {log.level}
        </span>
        <span className={`flex-1 ${!expanded && isLong ? "truncate" : ""}`}>
          {!expanded && isLong ? log.message.slice(0, 120) + "..." : log.message}
        </span>
        {log.jobId && (
          <span className="text-muted-foreground shrink-0">[{log.jobId}]</span>
        )}
      </div>
      {isLong && expanded && (
        <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap break-all max-h-[400px] overflow-auto">
          {log.message}
        </pre>
      )}
    </div>
  );
}

export default function LogsPage() {
  const { t } = useTranslation();
  // Initial data loaded once from API
  const [initialLogs, setInitialLogs] = useState<LogEntry[]>([]);
  const [initialJobs, setInitialJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");

  const [stopping, setStopping] = useState(false);

  // Real-time data from WebSocket
  const ws = useIngestionSocket();

  const handleStop = useCallback(async (runId?: string) => {
    setStopping(true);
    try {
      await stopIngestion(runId);
    } catch (err) {
      console.error("Failed to stop ingestion:", err);
    } finally {
      setStopping(false);
    }
  }, []);

  // Load initial history once
  const loadHistory = useCallback(async () => {
    try {
      const [jobsRes, logsRes, progressRes] = await Promise.all([
        fetchJobs({ pageSize: 50, status: statusFilter === "all" ? undefined : statusFilter }),
        fetchLogEntries({ pageSize: 100 }),
        fetchIngestionProgress(10),
      ]);
      setInitialJobs(jobsRes.jobs);
      setJobsTotal(jobsRes.total);
      setInitialLogs(logsRes.logs);
      setRuns(progressRes.runs);
    } catch (err) {
      console.error("Failed to load logs data:", err);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRerun = useCallback(async (runId: string) => {
    try {
      await rerunIngestion(runId);
      loadHistory();
    } catch (err) {
      console.error("Failed to rerun ingestion:", err);
    }
  }, [loadHistory]);

  const handleDelete = useCallback(async (runId: string) => {
    try {
      await deleteIngestionRun(runId);
      loadHistory();
    } catch (err) {
      console.error("Failed to delete run:", err);
    }
  }, [loadHistory]);

  // Merge WebSocket logs on top of initial logs (dedup by id)
  const allLogs = useMemo(() => {
    const seen = new Set<number>();
    const merged: LogEntry[] = [];
    for (const log of ws.logs) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        merged.push(log);
      }
    }
    for (const log of initialLogs) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        merged.push(log);
      }
    }
    return merged.slice(0, 200);
  }, [ws.logs, initialLogs]);

  // Merge WebSocket job updates on top of initial jobs
  const allJobs = useMemo(() => {
    const jobMap = new Map<string, Job>();
    for (const job of initialJobs) {
      jobMap.set(job.jobId, job);
    }
    for (const [, job] of ws.jobs) {
      jobMap.set(job.jobId, job);
    }
    return Array.from(jobMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [initialJobs, ws.jobs]);

  // Active run: prefer WebSocket live data, fallback to API history
  const activeRun = ws.run ?? runs.find((r) => r.status === "downloading" || r.status === "processing" || r.status === "stopping") ?? null;
  const latestRun = ws.run ?? runs[0] ?? null;

  // Stats
  const stats = useMemo(() => {
    const completedJobs = allJobs.filter((j) => j.status === "completed").length;
    const failedJobs = allJobs.filter((j) => j.status === "failed").length;
    const queuedJobs = allJobs.filter((j) => ["queued", "transcribing", "analyzing"].includes(j.status)).length;
    return { completedJobs, failedJobs, queuedJobs };
  }, [allJobs]);

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const getRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getRunProgress = (run: IngestionRun) => {
    if (run.totalFiles === 0) return 0;
    if (run.status === "downloading") return Math.round((run.downloadedFiles / run.totalFiles) * 100);
    return Math.round((run.processedFiles / run.totalFiles) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.logs.title}</h1>
          <p className="text-muted-foreground">{t.logs.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ws.connected ? "default" : "secondary"} className="gap-1">
            {ws.connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {ws.connected ? "Live" : "Connecting..."}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadHistory}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Active Ingestion Progress Banner */}
      {(activeRun && (activeRun.status === "downloading" || activeRun.status === "processing" || activeRun.status === "stopping" || activeRun.status === "failed")) && (() => {
        const run = activeRun;
        const cfg = ingestionStatusConfig[run.status] || ingestionStatusConfig.processing;
        const Icon = cfg.icon;
        const progress = getRunProgress(run);
        const isActive = run.status === "downloading" || run.status === "processing" || run.status === "stopping";

        return (
          <Card className={isActive ? "border-blue-300 bg-blue-50/50" : "border-red-300 bg-red-50/50"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderDown className="h-5 w-5" />
                  Ingestion Run: {run.runId}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={run.status === "failed" ? "destructive" : "default"} className="gap-1">
                    <Icon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                    {cfg.label}
                  </Badge>
                  {isActive && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStop(run.runId)}
                      disabled={stopping || run.status === "stopping"}
                    >
                      {stopping || run.status === "stopping" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Square className="h-3 w-3 mr-1" />
                      )}
                      {run.status === "stopping" ? "Stopping..." : "Stop"}
                    </Button>
                  )}
                  {(run.status === "stopped" || run.status === "failed") && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRerun(run.runId)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
              {run.remotePath && (
                <CardDescription className="font-mono text-xs">{run.remotePath}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {run.status === "downloading"
                        ? `Downloading: ${run.downloadedFiles} / ${run.totalFiles} files`
                        : `Processing: ${run.processedFiles} / ${run.totalFiles} files`}
                      {run.failedFiles > 0 && (
                        <span className="text-red-600 ml-2">({run.failedFiles} failed)</span>
                      )}
                    </span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        run.status === "failed" ? "bg-red-500" : run.status === "completed" ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {run.currentFile && isActive && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-mono text-xs truncate">{run.currentFile}</span>
                  </div>
                )}
                {run.errorMessage && (
                  <div className="flex items-start gap-2 text-sm p-2 bg-red-100 rounded">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <span className="text-red-700">{run.errorMessage}</span>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {run.startedAt && <span>Started: {formatDate(run.startedAt)}</span>}
                  {run.completedAt && <span>Completed: {formatDate(run.completedAt)}</span>}
                  {run.startedAt && !run.completedAt && <span>Running for {getRelativeTime(run.startedAt)}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.logs.ingestionStatus}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {activeRun && (activeRun.status === "downloading" || activeRun.status === "processing" || activeRun.status === "stopping") ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  <span className="text-lg font-bold text-green-600">{t.logs.running}</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-lg font-bold">{t.logs.idle}</span>
                </>
              )}
            </div>
            {latestRun?.startedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {t.logs.lastRun}: {getRelativeTime(latestRun.startedAt)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.logs.inQueue}</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queuedJobs}</div>
            <p className="text-xs text-muted-foreground">{t.logs.filesWaiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.logs.totalProcessed}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{jobsTotal}</div>
            <p className="text-xs text-muted-foreground">{t.logs.allTimeJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t.logs.failedLabel}</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedJobs}</div>
            <p className="text-xs text-muted-foreground">{t.logs.inCurrentView}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ingestion History */}
      {runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderDown className="h-5 w-5" />
              {t.logs.ingestionRuns}
            </CardTitle>
            <CardDescription>{t.logs.runsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.logs.runId}</TableHead>
                  <TableHead>{t.logs.source}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.logs.progress}</TableHead>
                  <TableHead>{t.logs.files}</TableHead>
                  <TableHead>{t.logs.started}</TableHead>
                  <TableHead>{t.logs.durationLabel}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  // Use live WS data if this is the active run
                  const liveRun = ws.run?.runId === run.runId ? ws.run : run;
                  const cfg = ingestionStatusConfig[liveRun.status] || ingestionStatusConfig.processing;
                  const Icon = cfg.icon;
                  const progress = getRunProgress(liveRun);
                  const isActive = liveRun.status === "downloading" || liveRun.status === "processing" || liveRun.status === "stopping";
                  const duration = liveRun.startedAt
                    ? liveRun.completedAt
                      ? Math.round((new Date(liveRun.completedAt).getTime() - new Date(liveRun.startedAt).getTime()) / 1000)
                      : Math.round((Date.now() - new Date(liveRun.startedAt).getTime()) / 1000)
                    : 0;
                  const durationStr = duration > 3600
                    ? `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
                    : duration > 60
                    ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                    : `${duration}s`;

                  return (
                    <TableRow key={run.runId}>
                      <TableCell className="font-mono text-xs">{liveRun.runId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">{liveRun.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={liveRun.status === "failed" ? "destructive" : isActive ? "default" : "secondary"} className="gap-1">
                          <Icon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${liveRun.status === "failed" ? "bg-red-500" : liveRun.status === "completed" ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-8 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-green-600">{liveRun.processedFiles}</span>
                        {liveRun.failedFiles > 0 && <span className="text-red-600"> + {liveRun.failedFiles} err</span>}
                        <span className="text-muted-foreground"> / {liveRun.totalFiles}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {liveRun.startedAt ? formatDate(liveRun.startedAt) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {durationStr}
                        {isActive && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                      </TableCell>
                      <TableCell>
                        {(liveRun.status === "stopped" || liveRun.status === "failed") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRerun(run.runId)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        {isActive && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleStop(run.runId)}
                            disabled={stopping || liveRun.status === "stopping"}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            {liveRun.status === "stopping" ? "..." : "Stop"}
                          </Button>
                        )}
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(run.runId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t.logs.liveLogs}
                </CardTitle>
                <CardDescription>{t.logs.liveLogsDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 font-mono text-xs">
                {allLogs.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">{t.logs.noLogs}</p>
                )}
                {allLogs.map((log, i) => {
                  const config = levelConfig[log.level] || levelConfig.info;
                  const isLong = log.message.length > 80 || log.level === "error" || log.level === "warn";
                  return (
                    <LogLine
                      key={`${log.id}-${i}`}
                      log={log}
                      config={config}
                      isLong={isLong}
                      formatTime={formatTime}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Transcription Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileAudio className="h-5 w-5" />
                  {t.logs.transcriptionJobs}
                </CardTitle>
                <CardDescription>{t.logs.jobsDesc}</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | "all")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="transcribing">Transcribing</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.logs.jobId}</TableHead>
                    <TableHead>{t.logs.file}</TableHead>
                    <TableHead>{t.logs.progress}</TableHead>
                    <TableHead>{t.logs.started}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead>{t.logs.call}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t.logs.noJobs}</TableCell>
                    </TableRow>
                  )}
                  {allJobs.map((job) => {
                    const config = statusConfig[job.status] || statusConfig.queued;
                    const Icon = config.icon;
                    return (
                      <TableRow key={job.jobId}>
                        <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                        <TableCell>
                          <span className="text-xs truncate max-w-[150px] block" title={job.fileName}>{job.fileName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${job.progress}%` }} />
                            </div>
                            <span className="text-xs font-mono w-8 text-right">{Math.round(job.progress)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {job.startedAt ? formatTime(job.startedAt) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <Icon className={`h-3 w-3 ${(job.status === "transcribing" || job.status === "analyzing") ? "animate-spin" : ""}`} />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {job.callId ? (
                            <Link href={`/calls/${job.callId}`} className="text-primary hover:underline text-xs font-medium">
                              View →
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Flow Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t.logs.processFlow}
          </CardTitle>
          <CardDescription>{t.logs.processFlowDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Download className="h-5 w-5 text-blue-500" />
              <span className="font-medium">1. {t.logs.stepDownload}</span>
              <span className="text-xs text-muted-foreground text-center">{t.logs.stepDownloadDesc}</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Upload className="h-5 w-5 text-purple-500" />
              <span className="font-medium">2. {t.logs.stepTranscribe}</span>
              <span className="text-xs text-muted-foreground text-center">{t.logs.stepTranscribeDesc}</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Cog className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">3. {t.logs.stepAnalyze}</span>
              <span className="text-xs text-muted-foreground text-center">{t.logs.stepAnalyzeDesc}</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">4. {t.logs.stepStore}</span>
              <span className="text-xs text-muted-foreground text-center">{t.logs.stepStoreDesc}</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{t.logs.liveUpdates}</p>
        </CardContent>
      </Card>
    </div>
  );
}
