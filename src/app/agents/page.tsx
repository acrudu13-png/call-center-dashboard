"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
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
  Users,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Phone,
  Clock,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { fetchAgentStats, type AgentStats } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type SortKey = "agentName" | "totalCalls" | "avgScore" | "complianceRate" | "flaggedCount";
type SortDir = "asc" | "desc";

const COLORS = ["#22c55e", "#3b82f6", "#ef4444"];

export default function AgentsHubPage() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("avgScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  useEffect(() => {
    fetchAgentStats()
      .then((res) => setAgents(res.agents))
      .catch((err) => console.error("Failed to load agent stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = agents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.agentName.toLowerCase().includes(q) ||
          a.agentId.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [agents, search, sortKey, sortDir]);

  const detail = useMemo(() => {
    if (selectedAgent === "all") return null;
    return agents.find((a) => a.agentId === selectedAgent) || null;
  }, [agents, selectedAgent]);

  // Aggregate stats
  const totals = useMemo(() => {
    if (agents.length === 0) return { totalAgents: 0, totalCalls: 0, avgScore: 0, avgCompliance: 0 };
    const totalCalls = agents.reduce((s, a) => s + a.totalCalls, 0);
    const avgScore =
      agents.reduce((s, a) => s + a.avgScore * a.totalCalls, 0) / Math.max(totalCalls, 1);
    const avgCompliance =
      agents.reduce((s, a) => s + a.complianceRate * a.totalCalls, 0) / Math.max(totalCalls, 1);
    return {
      totalAgents: agents.length,
      totalCalls,
      avgScore: Math.round(avgScore * 10) / 10,
      avgCompliance: Math.round(avgCompliance * 10) / 10,
    };
  }, [agents]);

  // Chart: top/bottom agents by avg score
  const scoreChartData = useMemo(() => {
    return [...agents]
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 15)
      .map((a) => ({
        name: a.agentName.length > 18 ? a.agentName.slice(0, 16) + "..." : a.agentName,
        avgScore: a.avgScore,
        calls: a.totalCalls,
      }));
  }, [agents]);

  // Chart: calls per agent
  const callsChartData = useMemo(() => {
    return [...agents]
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 15)
      .map((a) => ({
        name: a.agentName.length > 18 ? a.agentName.slice(0, 16) + "..." : a.agentName,
        calls: a.totalCalls,
      }));
  }, [agents]);

  // Pie chart for selected agent or overall
  const gradeDistribution = useMemo(() => {
    if (detail) {
      return [
        { name: "Excellent (85+)", value: detail.excellentCount },
        { name: "Good (70-84)", value: detail.goodCount },
        { name: "Poor (<70)", value: detail.poorCount },
      ];
    }
    return [
      { name: "Excellent (85+)", value: agents.reduce((s, a) => s + a.excellentCount, 0) },
      { name: "Good (70-84)", value: agents.reduce((s, a) => s + a.goodCount, 0) },
      { name: "Poor (<70)", value: agents.reduce((s, a) => s + a.poorCount, 0) },
    ];
  }, [agents, detail]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.agents.title}</h1>
        <p className="text-muted-foreground">{t.agents.subtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.agents.totalAgents}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalAgents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.agents.totalCalls}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.agents.avgQaScore}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.agents.avgCompliance}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.avgCompliance}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Average Score by Agent */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> {t.agents.avgScoreByAgent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={scoreChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Avg Score"]}
                    contentStyle={{ borderRadius: "8px" }}
                  />
                  <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                    {scoreChartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.avgScore >= 85
                            ? "#22c55e"
                            : entry.avgScore >= 70
                            ? "#3b82f6"
                            : "#ef4444"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution Pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.agents.scoreDistribution}</CardTitle>
              <Select value={selectedAgent} onValueChange={(v) => v && setSelectedAgent(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.agents.allAgents}</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.agentId} value={a.agentId}>
                      {a.agentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ percent }) =>
                    percent && percent > 0 ? `${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {gradeDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Calls Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" /> {t.agents.callsPerAgent}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callsChartData} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: "8px" }} />
                <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Agent Detail Card (when selected) */}
      {detail && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t.agents.agentDetail}: {detail.agentName}
              <Badge variant="secondary" className="ml-2">{detail.agentId}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-xl font-bold">{detail.totalCalls}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-xl font-bold">{detail.avgScore}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Score Range</p>
                <p className="text-xl font-bold">{detail.minScore}% - {detail.maxScore}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-xl font-bold">{formatDuration(detail.avgDuration)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-xl font-bold">{detail.complianceRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Flagged
                </p>
                <p className="text-xl font-bold">{detail.flaggedCount}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href={`/calls?agentId=${detail.agentId}`}
                className="text-primary hover:underline text-sm font-medium"
              >
                {t.agents.viewAllCalls} {detail.agentName} &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {t.agents.allAgents}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({filtered.length})
              </span>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.agents.searchAgents}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader column="agentName" label="Agent" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="totalCalls" label="Calls" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="avgScore" label="Avg Score" />
                </TableHead>
                <TableHead>
                  <SortableHeader column="complianceRate" label="Compliance" />
                </TableHead>
                <TableHead>Avg Duration</TableHead>
                <TableHead>
                  <SortableHeader column="flaggedCount" label="Flagged" />
                </TableHead>
                <TableHead>Grade Breakdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent) => (
                <TableRow
                  key={agent.agentId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    setSelectedAgent(
                      selectedAgent === agent.agentId ? "all" : agent.agentId
                    )
                  }
                >
                  <TableCell className="font-medium">{agent.agentName}</TableCell>
                  <TableCell>{agent.totalCalls}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        agent.avgScore >= 85
                          ? "default"
                          : agent.avgScore >= 70
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {agent.avgScore}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        agent.complianceRate >= 90
                          ? "text-green-600"
                          : agent.complianceRate >= 70
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
                    >
                      {agent.complianceRate}%
                    </span>
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatDuration(agent.avgDuration)}
                  </TableCell>
                  <TableCell>
                    {agent.flaggedCount > 0 ? (
                      <Badge variant="destructive">{agent.flaggedCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-2 rounded-l bg-green-500"
                        style={{
                          width: `${(agent.excellentCount / Math.max(agent.totalCalls, 1)) * 80}px`,
                        }}
                      />
                      <div
                        className="h-2 bg-blue-500"
                        style={{
                          width: `${(agent.goodCount / Math.max(agent.totalCalls, 1)) * 80}px`,
                        }}
                      />
                      <div
                        className="h-2 rounded-r bg-red-500"
                        style={{
                          width: `${(agent.poorCount / Math.max(agent.totalCalls, 1)) * 80}px`,
                        }}
                      />
                      <span className="text-xs text-muted-foreground ml-1">
                        {agent.excellentCount}/{agent.goodCount}/{agent.poorCount}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {agents.length === 0 ? t.agents.noAgentData : t.agents.noMatch}
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
