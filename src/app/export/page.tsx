"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
} from "lucide-react";
import {
  fetchAgents,
  fetchCallStats,
  fetchIngestionRunsList,
  getExportCsvUrl,
  type IngestionRunListItem,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

export default function ExportPage() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<{ agentId: string; agentName: string; callCount: number }[]>([]);
  const [runs, setRuns] = useState<IngestionRunListItem[]>([]);
  const [stats, setStats] = useState<{ totalCalls: number; completed: number; flagged: number; inReview: number; processing: number } | null>(null);

  // Filters
  const [status, setStatus] = useState("all");
  const [agentId, setAgentId] = useState("all");
  const [runId, setRunId] = useState("all");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [includeRules, setIncludeRules] = useState(true);

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchAgents().then(setAgents).catch(() => {});
    fetchIngestionRunsList().then((res) => setRuns(res.runs)).catch(() => {});
    fetchCallStats().then(setStats).catch(() => {});
  }, []);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const url = getExportCsvUrl({
        status: status !== "all" ? status : undefined,
        agentId: agentId !== "all" ? agentId : undefined,
        runId: runId !== "all" ? runId : undefined,
        search: search || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        maxScore: maxScore ? Number(maxScore) : undefined,
        includeRules: includeRules ? undefined : false,
      });

      const token = localStorage.getItem("callqa_access_token");
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const downloadName = `calls_export_${ts}.csv`;

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const hasFilters =
    status !== "all" || agentId !== "all" || runId !== "all" || search || minScore || maxScore;

  const clearFilters = () => {
    setStatus("all");
    setAgentId("all");
    setRunId("all");
    setSearch("");
    setMinScore("");
    setMaxScore("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.export.title}</h1>
        <p className="text-muted-foreground">{t.export.subtitle}</p>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t.export.totalCalls}</div>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t.common.completed}</div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t.common.flagged}</div>
              <div className="text-2xl font-bold text-red-600">{stats.flagged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{t.export.inReview}</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.inReview}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" /> {t.export.exportFilters}
            </CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t.common.clear}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t.export.filtersDesc}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{t.common.status}</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allStatuses}</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.agent}</Label>
              <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allAgents}</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.agentId} value={a.agentId}>
                      {a.agentName} ({a.callCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.calls.ingestionRun}</Label>
              <Select value={runId} onValueChange={(v) => v && setRunId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common.allRuns}</SelectItem>
                  {runs.map((r) => (
                    <SelectItem key={r.runId} value={r.runId}>
                      {r.dateLabel || r.runId} ({r.processedFiles}/{r.totalFiles})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t.common.search}</Label>
              <Input
                placeholder={t.calls.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.calls.minScore}</Label>
              <Input
                type="number"
                placeholder="0"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.calls.maxScore}</Label>
              <Input
                type="number"
                placeholder="100"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <div>
              <Label className="text-sm font-medium">{t.export.includeRuleScores}</Label>
              <p className="text-xs text-muted-foreground">{t.export.includeRuleScoresDesc}</p>
            </div>
            <Switch checked={includeRules} onCheckedChange={setIncludeRules} />
          </div>
        </CardContent>
      </Card>

      {/* Export action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold">{t.export.csvExport}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.export.csvDesc}
                  {includeRules && t.export.rulesIncluded}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <Badge variant="secondary">{t.export.filtered}</Badge>
              )}
              <Button onClick={handleExport} disabled={downloading} size="lg">
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {downloading ? t.export.downloadingLabel : t.export.exportCsv}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
