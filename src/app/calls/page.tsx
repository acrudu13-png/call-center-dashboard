"use client";

import { useState, useMemo } from "react";
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
import { Search, SlidersHorizontal, X } from "lucide-react";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallsExplorerPage() {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ruleFilter, setRuleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      if (
        search &&
        !call.agentName.toLowerCase().includes(search.toLowerCase()) &&
        !call.id.toLowerCase().includes(search.toLowerCase()) &&
        !call.customerPhone.includes(search)
      )
        return false;

      if (minScore && call.qaScore < Number(minScore)) return false;
      if (maxScore && call.qaScore > Number(maxScore)) return false;
      if (statusFilter !== "all" && call.status !== statusFilter) return false;
      if (ruleFilter !== "all" && !call.rulesFailed.includes(ruleFilter))
        return false;

      return true;
    });
  }, [search, minScore, maxScore, statusFilter, ruleFilter]);

  const clearFilters = () => {
    setSearch("");
    setMinScore("");
    setMaxScore("");
    setStatusFilter("all");
    setRuleFilter("all");
  };

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
              {(minScore || maxScore || statusFilter !== "all" || ruleFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
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
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                    </SelectContent>
                  </Select>
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
              ({filtered.length} calls)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Customer Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>QA Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((call) => (
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
                    <Badge
                      variant={
                        call.status === "flagged"
                          ? "destructive"
                          : call.status === "in_review"
                          ? "secondary"
                          : call.status === "processing"
                          ? "outline"
                          : "default"
                      }
                    >
                      {call.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
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
        </CardContent>
      </Card>
    </div>
  );
}
