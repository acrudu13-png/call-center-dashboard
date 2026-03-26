"use client";

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
import { summaryMetrics, dailyScores, flaggedCalls } from "@/lib/mockData";
import { Phone, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const metricCards = [
  {
    title: "Total Calls Analyzed",
    value: summaryMetrics.totalCalls,
    icon: Phone,
    description: "Last 30 days",
  },
  {
    title: "Average Quality Score",
    value: `${summaryMetrics.avgScore}%`,
    icon: TrendingUp,
    description: "Across all agents",
  },
  {
    title: "Critical Failures",
    value: summaryMetrics.criticalFailures,
    icon: AlertTriangle,
    description: "Compliance violations",
  },
  {
    title: "Pending Review",
    value: summaryMetrics.callsInReview,
    icon: Clock,
    description: "Awaiting supervisor action",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Call center quality overview for the last 30 days.
        </p>
      </div>

      {/* Metric Cards */}
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

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Score Trend</CardTitle>
          <CardDescription>
            Average QA score over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Calls Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged for Review</CardTitle>
          <CardDescription>
            Calls with critical compliance failures requiring supervisor review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failed Rules</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flaggedCalls.slice(0, 10).map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <Link
                      href={`/calls/${call.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {call.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(call.dateTime).toLocaleString()}
                  </TableCell>
                  <TableCell>{call.agentName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={call.qaScore >= 80 ? "default" : "destructive"}
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
                          : "default"
                      }
                    >
                      {call.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {call.rulesFailed.length} rule(s) failed
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
