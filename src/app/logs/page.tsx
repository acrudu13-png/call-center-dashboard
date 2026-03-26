"use client";

import { useState, useEffect, useMemo } from "react";
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
  transcriptionJobs,
  logEntries,
  cronStats,
  formatBytes,
  type TranscriptionJob,
  type LogEntry,
  type JobStatus,
  type LogLevel,
} from "@/lib/logsData";
import {
  Activity,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  FileAudio,
  Server,
  Timer,
  Inbox,
} from "lucide-react";

const statusConfig: Record<JobStatus, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "Queued", icon: Inbox, variant: "secondary" },
  uploading: { label: "Uploading", icon: Upload, variant: "default" },
  processing: { label: "Processing", icon: Loader2, variant: "default" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: XCircle, variant: "destructive" },
  deleting: { label: "Deleting", icon: Trash2, variant: "outline" },
};

const levelConfig: Record<LogLevel, { color: string; bgColor: string }> = {
  info: { color: "text-blue-600", bgColor: "bg-blue-100" },
  warn: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  error: { color: "text-red-600", bgColor: "bg-red-100" },
  success: { color: "text-green-600", bgColor: "bg-green-100" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(logEntries);
  const [jobs, setJobs] = useState<TranscriptionJob[]>(transcriptionJobs);
  const [stats, setStats] = useState(cronStats);
  const [isLive, setIsLive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Add a new log entry occasionally
      if (Math.random() > 0.7) {
        const newLog: LogEntry = {
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: ["info", "success", "warn"][Math.floor(Math.random() * 3)] as LogLevel,
          message: [
            "Polling Soniox API for job status",
            "Transcription progress: 75%",
            "File uploaded successfully",
            "Processing next file in queue",
          ][Math.floor(Math.random() * 4)],
        };
        setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
      }

      // Update stats
      setStats((prev) => ({
        ...prev,
        isRunning: Math.random() > 0.8,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((job) => job.status === statusFilter);
  }, [jobs, statusFilter]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("ro-RO", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs & Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time transcription pipeline status and logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? (
              <>
                <Pause className="h-4 w-4 mr-2" /> Pause Live
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" /> Resume Live
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cron Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {stats.isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  <span className="text-lg font-bold text-green-600">Running</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-lg font-bold">Idle</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next run: {stats.nextRun ? getRelativeTime(stats.nextRun) : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQueued}</div>
            <p className="text-xs text-muted-foreground">Files waiting to process</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
            <p className="text-xs text-muted-foreground">
              Avg processing: {stats.averageProcessingTime}s
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Logs
                </CardTitle>
                <CardDescription>Real-time transcription pipeline events</CardDescription>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                Auto-scroll
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 font-mono text-xs">
                {logs.slice(0, 50).map((log) => {
                  const config = levelConfig[log.level];
                  return (
                    <div
                      key={log.id}
                      className={`flex gap-2 p-1.5 rounded ${config.bgColor} bg-opacity-50`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={`uppercase font-semibold w-12 shrink-0 ${config.color}`}>
                        {log.level}
                      </span>
                      <span className="flex-1">{log.message}</span>
                      {log.jobId && (
                        <span className="text-muted-foreground shrink-0">
                          [{log.jobId}]
                        </span>
                      )}
                    </div>
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
                  Transcription Jobs
                </CardTitle>
                <CardDescription>Soniox async API job queue</CardDescription>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as JobStatus | "all")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="uploading">Uploading</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
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
                    <TableHead>Job ID</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const config = statusConfig[job.status];
                    const Icon = config.icon;
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-mono text-xs">{job.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs truncate max-w-[150px]" title={job.fileName}>
                              {job.fileName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(job.fileSize)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(job.uploadedAt)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {job.startedAt ? formatTime(job.startedAt) : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {job.completedAt ? formatTime(job.completedAt) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="gap-1">
                            <Icon className={`h-3 w-3 ${job.status === "processing" ? "animate-spin" : ""}`} />
                            {config.label}
                          </Badge>
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

      {/* Soniox API Flow Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Soniox Async API Flow
          </CardTitle>
          <CardDescription>
            The transcription pipeline follows these steps for each file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Upload className="h-5 w-5 text-blue-500" />
              <span className="font-medium">1. Upload</span>
              <span className="text-xs text-muted-foreground text-center">
                Send file to Soniox
              </span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">2. Poll Status</span>
              <span className="text-xs text-muted-foreground text-center">
                Check job progress
              </span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">3. Retrieve</span>
              <span className="text-xs text-muted-foreground text-center">
                Get transcription
              </span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted">
              <Trash2 className="h-5 w-5 text-purple-500" />
              <span className="font-medium">4. Delete</span>
              <span className="text-xs text-muted-foreground text-center">
                Clean up storage
              </span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-yellow-800">Storage Limit:</span>
                <span className="text-yellow-700"> Soniox has a storage limit for transcriptions. 
                Files must be deleted after retrieval to avoid hitting the limit. The cron job 
                handles this automatically.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
