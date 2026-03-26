"use client";

import { use } from "react";
import { calls } from "@/lib/mockData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallDetailClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const call = calls.find((c) => c.id === id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  if (!call) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Call not found</p>
      </div>
    );
  }

  const weightMap: Record<string, number> = {
    critical: 3,
    moderate: 2,
    minor: 1,
  };

  const calculatedScore = call.aiScorecard.overallScore;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      in_review: { variant: "secondary", label: "In Review" },
      flagged: { variant: "destructive", label: "Flagged" },
      processing: { variant: "outline", label: "Processing" },
    };
    const config = variants[status] || variants.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calls">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Call Details</h1>
          <p className="text-muted-foreground">ID: {call.id}</p>
        </div>
        {getStatusBadge(call.status)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Call Info & Audio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Call Recording
              </CardTitle>
              <CardDescription>
                {call.dateTime} • {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, "0")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Waveform placeholder */}
              <div className="h-20 bg-muted rounded-lg flex items-center justify-center">
                <div className="flex gap-1">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary/50 rounded"
                      style={{
                        height: `${Math.random() * 100}%`,
                        minHeight: "10%",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    onValueChange={(v) => setCurrentTime(v[0])}
                    max={call.duration}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">
                  {formatTime(currentTime)} / {formatTime(call.duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider defaultValue={[75]} max={100} step={1} className="w-24" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {call.transcript.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        entry.speaker === "agent"
                          ? "flex-row"
                          : "flex-row-reverse"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          entry.speaker === "agent"
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        {entry.speaker === "agent" ? (
                          <Headphones className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`flex-1 p-3 rounded-lg ${
                          entry.speaker === "agent"
                            ? "bg-primary/5"
                            : "bg-muted"
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {entry.speaker === "agent" ? "Agent" : "Customer"} •{" "}
                          {formatTime(entry.timestamp)}
                        </div>
                        <p className="text-sm">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Scorecard & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QA Scorecard</CardTitle>
              <CardDescription>
                Score:{" "}
                <span className={getScoreColor(calculatedScore)}>
                  {calculatedScore}%
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={calculatedScore} className="h-3 mb-4" />
              <div className="space-y-3">
                {call.aiScorecard.sections.map((section) => (
                  <div
                    key={section.ruleId}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    {section.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {section.ruleTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {section.details}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {section.weight}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="font-medium">{call.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">N/A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{call.customerPhone}</span>
              </div>
            </CardContent>
          </Card>

          {call.status === "flagged" && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Flagged Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {call.rulesFailed.map((rule, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
