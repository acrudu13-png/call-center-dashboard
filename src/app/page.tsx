"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Phone,
  TrendingUp,
  AlertTriangle,
  Clock,
  Loader2,
  Download,
  Cog,
  CheckCircle2,
  XCircle,
  FolderDown,
  Square,
  RotateCcw,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import {
  fetchCallStats,
  fetchCalls,
  stopIngestion,
  rerunIngestion,
  fetchIngestionProgress,
  type CallSummary,
  type IngestionRun,
} from "@/lib/api";
import { useIngestionSocket } from "@/lib/useIngestionSocket";
import { useTranslation } from "@/lib/i18n";

interface DashboardStats {
  totalCalls: number;
  completed: number;
  flagged: number;
  inReview: number;
  processing: number;
  averageScore: number;
  complianceRate: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [flaggedCalls, setFlaggedCalls] = useState<CallSummary[]>([]);
  const [recentRuns, setRecentRuns] = useState<IngestionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);

  const ws = useIngestionSocket();

  const ingestionStatusConfig: Record<string, { label: string; icon: React.ElementType }> = {
    downloading: { label: t.dashboard.downloadingFiles, icon: Download },
    processing: { label: t.dashboard.processingCalls, icon: Cog },
    stopping: { label: t.dashboard.stopping, icon: Loader2 },
    stopped: { label: t.dashboard.stopped, icon: StopCircle },
    completed: { label: t.common.completed, icon: CheckCircle2 },
    failed: { label: t.common.failed, icon: XCircle },
  };

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

  const handleResume = useCallback(async (runId: string) => {
    try {
      await rerunIngestion(runId);
    } catch (err) {
      console.error("Failed to resume ingestion:", err);
    }
  }, []);

  const latestWsRun = ws.run;
  const allRuns = useMemo(() => {
    const map = new Map<string, IngestionRun>();
    for (const r of recentRuns) map.set(r.runId, r);
    if (latestWsRun) map.set(latestWsRun.runId, latestWsRun);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.startedAt || "").getTime() - new Date(a.startedAt || "").getTime()
    );
  }, [recentRuns, latestWsRun]);

  const visibleRuns = useMemo(() => {
    const active = allRuns.filter((r) => r.status !== "completed");
    return active.length > 0 ? active.slice(0, 3) : allRuns.slice(0, 1);
  }, [allRuns]);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, callsRes, runsRes] = await Promise.all([
        fetchCallStats(),
        fetchCalls({ status: "flagged", pageSize: 10, sortBy: "date_time", sortDir: "desc" }),
        fetchIngestionProgress(5),
      ]);
      setStats(statsRes);
      setFlaggedCalls(callsRes.calls);
      setRecentRuns(runsRes.runs);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (ws.run?.processedFiles || ws.run?.status === "completed") {
      loadData();
    }
  }, [ws.run?.processedFiles, ws.run?.status, loadData]);

  const getRunProgress = (run: IngestionRun) => {
    if (run.totalFiles === 0) return 0;
    if (run.status === "downloading") return Math.round((run.downloadedFiles / run.totalFiles) * 100);
    return Math.round((run.processedFiles / run.totalFiles) * 100);
  };

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleString("ro-RO", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metricCards = [
    { title: t.dashboard.totalCalls, value: stats?.totalCalls ?? 0, icon: Phone, description: t.dashboard.allTime },
    { title: t.dashboard.avgScore, value: stats ? `${Math.round(stats.averageScore)}%` : "-", icon: TrendingUp, description: t.dashboard.acrossAgents },
    { title: t.dashboard.criticalFailures, value: stats?.flagged ?? 0, icon: AlertTriangle, description: t.dashboard.flaggedCalls },
    { title: t.dashboard.pendingReview, value: (stats?.inReview ?? 0) + (stats?.processing ?? 0), icon: Clock, description: t.dashboard.reviewProcessing },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      {visibleRuns.length > 0 && visibleRuns.map((run) => {
        const cfg = ingestionStatusConfig[run.status] || ingestionStatusConfig.processing;
        const Icon = cfg.icon;
        const progress = getRunProgress(run);
        const isActive = run.status === "downloading" || run.status === "processing" || run.status === "stopping";
        const isStopped = run.status === "stopped" || run.status === "failed";

        const borderColor = isActive ? "border-blue-300 bg-blue-50/50"
          : isStopped ? "border-orange-300 bg-orange-50/50"
          : "border-green-300 bg-green-50/50";

        const barColor = isActive ? "bg-blue-600"
          : run.status === "failed" ? "bg-red-500"
          : run.status === "stopped" ? "bg-orange-500"
          : "bg-green-500";

        return (
          <Card key={run.runId} className={borderColor}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <FolderDown className="h-5 w-5" />
                  <span className="font-semibold text-xs font-mono">{run.runId}</span>
                  <Badge variant={isStopped ? "secondary" : "default"} className="gap-1">
                    <Icon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-sm font-mono font-semibold w-10 text-right">{progress}%</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span>
                      {run.status === "downloading"
                        ? `${run.downloadedFiles}/${run.totalFiles} ${t.dashboard.downloaded}`
                        : `${run.processedFiles}/${run.totalFiles} ${t.dashboard.processed}`}
                    </span>
                    {run.failedFiles > 0 && <span className="text-red-600">{run.failedFiles} {t.common.failed.toLowerCase()}</span>}
                    {run.currentFile && isActive && <span className="truncate font-mono">{run.currentFile}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isActive && (
                    <Button variant="destructive" size="sm" onClick={() => handleStop(run.runId)} disabled={stopping || run.status === "stopping"}>
                      {stopping || run.status === "stopping" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Square className="h-3 w-3 mr-1" />}
                      {run.status === "stopping" ? "..." : t.common.stop}
                    </Button>
                  )}
                  {isStopped && (
                    <Button variant="default" size="sm" onClick={() => handleResume(run.runId)}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t.common.resume}
                    </Button>
                  )}
                  <Link href="/logs" className="text-xs text-blue-700 hover:underline">{t.common.details}</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.flaggedForReview}</CardTitle>
          <CardDescription>{t.dashboard.flaggedDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedCalls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.dashboard.noFlagged}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.calls.callId}</TableHead>
                  <TableHead>{t.calls.dateTime}</TableHead>
                  <TableHead>{t.common.agent}</TableHead>
                  <TableHead>{t.calls.customerPhone}</TableHead>
                  <TableHead>{t.calls.qaScore}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <Link href={`/calls/${call.id}`} className="text-primary hover:underline font-medium">
                        {call.callId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(call.dateTime)}
                    </TableCell>
                    <TableCell>{call.agentName}</TableCell>
                    <TableCell className="font-mono text-xs">{call.customerPhone}</TableCell>
                    <TableCell>
                      <Badge variant={call.qaScore >= 80 ? "default" : "destructive"}>
                        {Math.round(call.qaScore)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={call.qaScore >= 85 ? "default" : call.qaScore >= 70 ? "secondary" : "destructive"}>
                        {call.qaScore >= 85 ? "Passed" : call.qaScore >= 70 ? "Average" : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
