"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { fetchCalls, fetchRules, fetchIngestionRunsList, fetchAgents, fetchCallTypes, bulkReanalyze, stopBulkReanalyze, type CallSummary, type QARule, type IngestionRunListItem, type CallTypeInfo } from "@/lib/api";
import { RotateCcw, Square } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useIngestionSocket } from "@/lib/useIngestionSocket";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type SortKey = "date_time" | "agent_name" | "duration" | "qa_score";
type SortDir = "asc" | "desc";

export default function CallsExplorerPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [agents, setAgents] = useState<{ agentId: string; agentName: string; callCount: number }[]>([]);
  const [directionFilter, setDirectionFilter] = useState("all");
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [runFilter, setRunFilter] = useState("all");
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRunListItem[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("date_time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [rules, setRules] = useState<QARule[]>([]);
  const [callTypesList, setCallTypesList] = useState<CallTypeInfo[]>([]);
  const { reanalyzingCallIds, lastCallUpdate } = useIngestionSocket();

  function getQAStatus(score: number): "Passed" | "Average" | "Failed" {
    if (score >= 85) return "Passed";
    if (score >= 70) return "Average";
    return "Failed";
  }

  // Load rules, agents, and runs once
  useEffect(() => {
    fetchRules().then(setRules).catch(() => {});
    fetchAgents().then(setAgents).catch(() => {});
    fetchCallTypes().then(setCallTypesList).catch(() => {});
    fetchIngestionRunsList().then((res) => setIngestionRuns(res.runs)).catch(() => {});
  }, []);

  // Load calls from API
  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<string, string> = {
        Passed: "completed",
        Failed: "flagged",
      };
      const res = await fetchCalls({
        page,
        pageSize,
        search: search || undefined,
        sortBy: sortKey,
        sortDir: sortDir,
        status: statusFilter !== "all" ? statusMap[statusFilter] || statusFilter : undefined,
        minScore: minScore ? Number(minScore) : undefined,
        maxScore: maxScore ? Number(maxScore) : undefined,
        runId: runFilter !== "all" ? runFilter : undefined,
        agentId: agentFilter !== "all" ? agentFilter : undefined,
        direction: directionFilter !== "all" ? directionFilter : undefined,
        callType: callTypeFilter !== "all" ? callTypeFilter : undefined,
      });
      setCalls(res.calls);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("Failed to load calls:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortKey, sortDir, statusFilter, minScore, maxScore, runFilter, agentFilter, directionFilter, callTypeFilter]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Refresh calls list when a call finishes reanalyzing
  useEffect(() => {
    if (lastCallUpdate) {
      loadCalls();
    }
  }, [lastCallUpdate, loadCalls]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, minScore, maxScore, statusFilter, ruleFilter, runFilter, agentFilter, directionFilter, callTypeFilter, dateFrom, dateTo, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortableHeader = ({ column, label }: { column: SortKey; label: string }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  const clearFilters = () => {
    setSearch("");
    setMinScore("");
    setMaxScore("");
    setStatusFilter("all");
    setRuleFilter("all");
    setAgentFilter("all");
    setDirectionFilter("all");
    setCallTypeFilter("all");
    setRunFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = minScore || maxScore || statusFilter !== "all" || ruleFilter !== "all" || agentFilter !== "all" || directionFilter !== "all" || callTypeFilter !== "all" || runFilter !== "all" || dateFrom || dateTo;

  const handleBulkReanalyze = async () => {
    const msg = hasActiveFilters
      ? `${t.callDetail.reanalyzeFiltered} (${total})?`
      : `${t.callDetail.reanalyzeAll} (${total})?`;
    if (!confirm(msg)) return;
    setBulkAnalyzing(true);
    try {
      const statusMap: Record<string, string> = { Passed: "completed", Failed: "flagged" };
      await bulkReanalyze({
        status: statusFilter !== "all" ? statusMap[statusFilter] || statusFilter : undefined,
        agentId: agentFilter !== "all" ? agentFilter : undefined,
        search: search || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        maxScore: maxScore ? Number(maxScore) : undefined,
        runId: runFilter !== "all" ? runFilter : undefined,
        direction: directionFilter !== "all" ? directionFilter : undefined,
        callType: callTypeFilter !== "all" ? callTypeFilter : undefined,
      });
      loadCalls(); // refresh to show "reanalyzing" status
    } catch (e) {
      console.error("Bulk reanalyze failed:", e);
      setBulkAnalyzing(false);
    }
  };

  const handleStopBulkReanalyze = async () => {
    try {
      await stopBulkReanalyze();
      loadCalls();
    } catch (e) {
      console.error("Stop bulk reanalyze failed:", e);
    }
  };

  // Keep bulkAnalyzing in sync with websocket state
  useEffect(() => {
    if (reanalyzingCallIds.size > 0) {
      setBulkAnalyzing(true);
    } else if (reanalyzingCallIds.size === 0) {
      setBulkAnalyzing(false);
    }
  }, [reanalyzingCallIds.size]);

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.calls.title}</h1>
        <p className="text-muted-foreground">{t.calls.subtitle}</p>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.calls.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {t.common.filters}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> {t.common.clear}
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {t.calls.fromDate}
                  </Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> {t.calls.toDate}
                  </Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.qaStatus}</Label>
                  <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.allStatuses}</SelectItem>
                      <SelectItem value="completed">{t.common.completed}</SelectItem>
                      <SelectItem value="flagged">{t.common.flagged}</SelectItem>
                      <SelectItem value="in_review">{t.common.inReview}</SelectItem>
                      <SelectItem value="processing">{t.common.processing}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.common.agent}</Label>
                  <Select value={agentFilter} onValueChange={(v) => v && setAgentFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.allAgents}</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.agentId} value={agent.agentId}>
                          {agent.agentName} ({agent.callCount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.direction}</Label>
                  <Select value={directionFilter} onValueChange={(v) => v && setDirectionFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.allDirections}</SelectItem>
                      <SelectItem value="inbound">{t.common.inbound}</SelectItem>
                      <SelectItem value="outbound">{t.common.outbound}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.callType}</Label>
                  <Select value={callTypeFilter} onValueChange={(v) => v && setCallTypeFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.allCallTypes}</SelectItem>
                      {callTypesList.map((ct) => (
                        <SelectItem key={ct.key} value={ct.key}>
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.minScore}</Label>
                  <Input type="number" placeholder="0" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.maxScore}</Label>
                  <Input type="number" placeholder="100" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.failedRule}</Label>
                  <Select value={ruleFilter} onValueChange={(v) => v && setRuleFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="w-auto min-w-[var(--radix-select-trigger-width)] max-w-[500px]">
                      <SelectItem value="all">{t.common.allRules}</SelectItem>
                      {rules.map((rule) => (
                        <SelectItem key={rule.rule_id} value={rule.rule_id}>
                          {rule.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.calls.ingestionRun}</Label>
                  <Select value={runFilter} onValueChange={(v) => v && setRunFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.common.allRuns}</SelectItem>
                      {ingestionRuns.map((run) => (
                        <SelectItem key={run.runId} value={run.runId}>
                          {run.dateLabel || run.runId} ({run.processedFiles}/{run.totalFiles})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t.calls.results}{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({total} calls)
            </span>
            {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.calls.callId}</TableHead>
                <TableHead><SortableHeader column="date_time" label={t.calls.dateTime} /></TableHead>
                <TableHead><SortableHeader column="agent_name" label={t.common.agent} /></TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>{t.calls.customerPhone}</TableHead>
                <TableHead><SortableHeader column="duration" label={t.calls.duration} /></TableHead>
                <TableHead><SortableHeader column="qa_score" label={t.calls.qaScore} /></TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <Link href={`/calls/${call.id}`} className="text-primary hover:underline font-medium">
                      {call.callId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(call.dateTime).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}
                  </TableCell>
                  <TableCell>{call.agentName}</TableCell>
                  <TableCell>
                    <div>
                      {call.direction === "inbound" ? (
                        <span className="flex items-center gap-1 text-blue-600 text-xs"><PhoneIncoming className="h-3 w-3" /> In</span>
                      ) : call.direction === "outbound" ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs"><PhoneOutgoing className="h-3 w-3" /> Out</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {call.callType && (
                        <span className="text-xs text-muted-foreground block">{callTypesList.find(ct => ct.key === call.callType)?.name || call.callType}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{call.customerPhone}</TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>
                    {!call.isEligible ? (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">N/A</Badge>
                    ) : (
                      <Badge variant={call.qaScore >= 85 ? "default" : call.qaScore >= 70 ? "secondary" : "destructive"}>
                        {Math.round(call.qaScore)}%
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.status === "reanalyzing" || reanalyzingCallIds.has(call.id) ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t.callDetail.reanalyzing}
                      </Badge>
                    ) : (
                      <Badge variant={call.status === "completed" ? "default" : call.status === "flagged" || call.status === "failed" ? "destructive" : "secondary"}>
                        {call.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && calls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t.calls.noResults}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t.calls.rowsPerPage}</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {startItem}-{endItem} of {total}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk reanalyze */}
      {total > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          {bulkAnalyzing && (
            <Button variant="destructive" size="sm" onClick={handleStopBulkReanalyze}>
              <Square className="h-3.5 w-3.5 mr-1.5" />
              {t.common.stop}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleBulkReanalyze} disabled={bulkAnalyzing}>
            {bulkAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
            {bulkAnalyzing && lastCallUpdate ? `${t.callDetail.analyzing} (${lastCallUpdate.index}/${lastCallUpdate.total})` : bulkAnalyzing ? t.callDetail.analyzing : hasActiveFilters ? `${t.callDetail.reanalyzeFiltered} (${total})` : `${t.callDetail.reanalyzeAll} (${total})`}
          </Button>
        </div>
      )}
    </div>
  );
}
