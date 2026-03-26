"use client";

import { useState, useMemo, useEffect } from "react";
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
import { calls, qaRules } from "@/lib/mockData";
import Link from "next/link";
import { Search, SlidersHorizontal, X, Calendar, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type SortKey = "dateTime" | "agentName" | "duration" | "qaScore";
type SortDir = "asc" | "desc";

export default function CallsExplorerPage() {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("dateTime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function getQAStatus(score: number): "Passed" | "Average" | "Failed" {
    if (score >= 85) return "Passed";
    if (score >= 70) return "Average";
    return "Failed";
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortableHeader = ({ 
    column, 
    label 
  }: { 
    column: SortKey; 
    label: string; 
  }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(column)}
    >
      {label}
      {sortKey === column ? (
        sortDir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  const filteredAndSorted = useMemo(() => {
    // First filter
    const filtered = calls.filter((call) => {
      if (
        search &&
        !call.agentName.toLowerCase().includes(search.toLowerCase()) &&
        !call.id.toLowerCase().includes(search.toLowerCase()) &&
        !call.customerPhone.includes(search)
      )
        return false;

      if (minScore && call.qaScore < Number(minScore)) return false;
      if (maxScore && call.qaScore > Number(maxScore)) return false;

      if (statusFilter !== "all" && getQAStatus(call.qaScore) !== statusFilter)
        return false;

      if (ruleFilter !== "all" && !call.rulesFailed.includes(ruleFilter))
        return false;

      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(call.dateTime) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(call.dateTime) > to) return false;
      }

      return true;
    });

    // Then sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];

      if (sortKey === "dateTime") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (typeof aVal === "string") {
        const cmp = (aVal as string).localeCompare(bVal as string);
        return sortDir === "asc" ? cmp : -cmp;
      }

      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [search, minScore, maxScore, statusFilter, ruleFilter, dateFrom, dateTo, sortKey, sortDir]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return {
      data: filteredAndSorted.slice(start, start + pageSize),
      total: filteredAndSorted.length,
      totalPages: Math.ceil(filteredAndSorted.length / pageSize),
      startItem: start + 1,
      endItem: Math.min(start + pageSize, filteredAndSorted.length),
    };
  }, [filteredAndSorted, page, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, minScore, maxScore, statusFilter, ruleFilter, dateFrom, dateTo, sortKey, sortDir]);

  const clearFilters = () => {
    setSearch("");
    setMinScore("");
    setMaxScore("");
    setStatusFilter("all");
    setRuleFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    minScore || maxScore || statusFilter !== "all" || ruleFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls Explorer</h1>
        <p className="text-muted-foreground">
          Browse and filter all processed call recordings.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by agent name, call ID, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> From Date
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> To Date
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>QA Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Passed">Passed</SelectItem>
                      <SelectItem value="Average">Average</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Min Score</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Failed Rule</Label>
                  <Select value={ruleFilter} onValueChange={(v) => v && setRuleFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rules</SelectItem>
                      {qaRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.title}
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
            Results{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({filteredAndSorted.length} calls)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>
                  <SortableHeader column="dateTime" label="Date/Time" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="agentName" label="Agent" />
                </TableHead>
                <TableHead>Customer Phone</TableHead>
                <TableHead>
                  <SortableHeader column="duration" label="Duration" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="qaScore" label="QA Score" />
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.data.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <Link
                      href={`/calls/${call.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {call.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {new Date(call.dateTime).toLocaleString()}
                  </TableCell>
                  <TableCell>{call.agentName}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {call.customerPhone}
                  </TableCell>
                  <TableCell>{formatDuration(call.duration)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        call.qaScore >= 85
                          ? "default"
                          : call.qaScore >= 70
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {call.qaScore}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = getQAStatus(call.qaScore);
                      return (
                        <Badge
                          variant={
                            s === "Passed"
                              ? "default"
                              : s === "Average"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {s}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No calls match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {paginatedData.total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
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
                  {paginatedData.startItem}-{paginatedData.endItem} of {paginatedData.total}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setPage((p) => Math.min(paginatedData.totalPages, p + 1))
                    }
                    disabled={page === paginatedData.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
