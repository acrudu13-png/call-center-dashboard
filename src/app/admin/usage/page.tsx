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
import {
  BarChart3,
  Loader2,
  AlertCircle,
  Building2,
  Users,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import {
  fetchPlatformUsage,
  type PlatformUsageResponse,
} from "@/lib/api";

export default function PlatformUsagePage() {
  const [usage, setUsage] = useState<PlatformUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPlatformUsage();
      setUsage(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-muted-foreground">{error || "No data"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Usage</h1>
        <p className="text-muted-foreground">
          Cross-organization usage statistics
        </p>
      </div>

      {/* Aggregates */}
      <div className="grid gap-4 grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{usage.total_organizations}</p>
              <p className="text-sm text-muted-foreground">
                Organizations ({usage.active_organizations} active)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{usage.total_users}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Phone className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{usage.total_calls.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">
                {usage.organizations.reduce((sum, o) => sum + o.total_ingestion_runs, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Ingestion Runs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-org table */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Organization Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Users className="h-3 w-3 inline mr-1" /> Users
                </TableHead>
                <TableHead>
                  <Phone className="h-3 w-3 inline mr-1" /> Calls
                </TableHead>
                <TableHead>
                  <CheckCircle2 className="h-3 w-3 inline mr-1" /> Completed
                </TableHead>
                <TableHead>
                  <AlertTriangle className="h-3 w-3 inline mr-1" /> Flagged
                </TableHead>
                <TableHead>
                  <ClipboardCheck className="h-3 w-3 inline mr-1" /> Rules
                </TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Last Ingestion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.organizations.map((org) => (
                <TableRow key={org.organization_id} className={!org.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{org.organization_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {org.organization_slug}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.is_active ? "default" : "secondary"}>
                      {org.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{org.user_count}</TableCell>
                  <TableCell>{org.call_count.toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">{org.completed_calls}</TableCell>
                  <TableCell className="text-orange-600">{org.flagged_calls}</TableCell>
                  <TableCell>{org.rules_count}</TableCell>
                  <TableCell>{org.total_ingestion_runs}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {org.last_ingestion_at
                      ? new Date(org.last_ingestion_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {usage.organizations.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No organizations</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
