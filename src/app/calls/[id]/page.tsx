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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
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

export default function CallDetailPage({
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
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <h2 className="text-2xl font-bold">Call not found</h2>
        <p className="text-muted-foreground">
          No call with ID &quot;{id}&quot; exists.
        </p>
        <Link href="/calls">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Calls
          </Button>
        </Link>
      </div>
    );
  }

  const weightIcon = (weight: string) => {
    switch (weight) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "moderate":
        return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
      case "bonus":
        return <Star className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/calls">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{call.id}</h1>
            <p className="text-muted-foreground">
              {call.agentName} &middot;{" "}
              {new Date(call.dateTime).toLocaleString()} &middot;{" "}
              {formatTime(call.duration)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={call.compliancePass ? "default" : "destructive"}
            className="text-sm"
          >
            {call.compliancePass ? "Compliant" : "Non-Compliant"}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            Score: {call.qaScore}%
          </Badge>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Transcript */}
        <div className="space-y-4">
          {/* Mock Audio Player */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentTime(Math.max(0, currentTime - 10))
                    }
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentTime(
                        Math.min(call.duration, currentTime + 10)
                      )
                    }
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground font-mono min-w-[80px]">
                    {formatTime(currentTime)} / {formatTime(call.duration)}
                  </span>
                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      max={call.duration}
                      step={1}
                      onValueChange={(val) => setCurrentTime(Array.isArray(val) ? val[0] : val)}
                    />
                  </div>
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <Progress
                  value={(currentTime / call.duration) * 100}
                  className="h-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Full call transcript — {call.transcript.length} segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {call.transcript.map((line, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        line.speaker === "agent"
                          ? ""
                          : "flex-row-reverse text-right"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                          line.speaker === "agent"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {line.speaker === "agent" ? (
                          <Headphones className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`flex-1 rounded-lg p-3 text-sm ${
                          line.speaker === "agent"
                            ? "bg-primary/5 border border-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs uppercase tracking-wider">
                            {line.speaker === "agent" ? "Agent" : "Customer"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(line.timestamp)}
                          </span>
                        </div>
                        <p>{line.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Tabs */}
        <div>
          <Tabs defaultValue="scorecard">
            <TabsList className="w-full">
              <TabsTrigger value="scorecard" className="flex-1">
                AI QA Scorecard
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex-1">
                Raw JSON Output
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Scorecard */}
            <TabsContent value="scorecard" className="space-y-4 mt-4">
              {/* Overall Score */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Overall Score
                      </p>
                      <p className="text-4xl font-bold">
                        {call.aiScorecard.overallScore}%
                      </p>
                    </div>
                    <div
                      className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                        call.aiScorecard.overallScore >= 85
                          ? "bg-green-100 text-green-700"
                          : call.aiScorecard.overallScore >= 70
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {call.aiScorecard.overallScore >= 85
                        ? "A"
                        : call.aiScorecard.overallScore >= 70
                        ? "B"
                        : "C"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rule Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Rule Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {call.aiScorecard.sections.map((section) => (
                      <div
                        key={section.ruleId}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          section.passed
                            ? "border-green-200 bg-green-50/50"
                            : "border-red-200 bg-red-50/50"
                        }`}
                      >
                        {section.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {section.ruleTitle}
                            </span>
                            {weightIcon(section.weight)}
                            <Badge
                              variant={
                                section.weight === "critical"
                                  ? "destructive"
                                  : section.weight === "bonus"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {section.weight}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {section.details}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Issues */}
              <Card>
                <CardHeader>
                  <CardTitle>Issues Detected</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {call.aiScorecard.issuesDetected.map((issue, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Coaching Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Coaching Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {call.aiScorecard.coachingNotes.map((note, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Star className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Raw JSON */}
            <TabsContent value="raw" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Raw LLM Output</CardTitle>
                  <CardDescription>
                    Developer view — structured JSON output from the analysis
                    pipeline.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
                      {JSON.stringify(call.rawJson, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
