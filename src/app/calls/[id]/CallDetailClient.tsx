"use client";

import { use, useMemo } from "react";
import { calls, qaRules, type ScorecardSection } from "@/lib/mockData";
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
  Headphones,
  Tag,
  History,
  Brain,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GradeBadge({ grade }: { grade: "Excellent" | "Good" | "Acceptable" | "Poor" }) {
  const config: Record<string, { label: string; className: string }> = {
    Excellent: { label: "Excelent", className: "bg-green-100 text-green-800 border-green-200" },
    Good: { label: "Bun", className: "bg-blue-100 text-blue-800 border-blue-200" },
    Acceptable: { label: "Acceptabil", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    Poor: { label: "Slab", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, className } = config[grade] ?? config.Poor;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      {label}
    </span>
  );
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

  // Get caller history - all other calls from the same phone number
  const callerHistory = useMemo(() => {
    if (!call) return [];
    return calls
      .filter((c) => c.customerPhone === call.customerPhone && c.id !== call.id)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [call]);

  // Group scorecard sections by section name (non-extraction only)
  const sectionGroups = useMemo(() => {
    if (!call) return new Map<string, ScorecardSection[]>();
    const groups = new Map<string, ScorecardSection[]>();
    call.aiScorecard.sections.forEach((sec) => {
      if (sec.extractedValue !== undefined) return; // skip extraction
      const rule = qaRules.find((r) => r.id === sec.ruleId);
      const key = rule?.section ?? "Altele";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(sec);
    });
    return groups;
  }, [call]);

  if (!call) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Apelul nu a fost găsit</p>
      </div>
    );
  }

  // Build ordered speaker index from transcript (order of first appearance)
  const speakerIndex: Record<string, number> = {};
  call.transcript.forEach(({ speaker }) => {
    if (!(speaker in speakerIndex)) {
      speakerIndex[speaker] = Object.keys(speakerIndex).length;
    }
  });

  // Subtle per-speaker palette (bg tint + left-border + avatar bg + label color)
  const SPEAKER_PALETTE = [
    { bg: "rgba(59,130,246,0.07)",  border: "#93c5fd", avatar: "rgba(59,130,246,0.18)",  label: "#1d4ed8" }, // blue
    { bg: "rgba(244,63,94,0.07)",   border: "#fca5a5", avatar: "rgba(244,63,94,0.18)",   label: "#be123c" }, // rose
    { bg: "rgba(34,197,94,0.07)",   border: "#86efac", avatar: "rgba(34,197,94,0.18)",   label: "#15803d" }, // green
    { bg: "rgba(234,179,8,0.07)",   border: "#fde047", avatar: "rgba(234,179,8,0.18)",   label: "#a16207" }, // amber
  ];

  const calculatedScore = call.aiScorecard.overallScore;
  const grade = call.aiScorecard.grade;

  const extractionRules = qaRules.filter(
    (r) => r.enabled && r.expectedOutput === "extraction" && r.extractionKey
  );

  const getQAStatus = (score: number) => {
    if (score >= 85) return { label: "Trecut", variant: "default" as const };
    if (score >= 70) return { label: "Mediu", variant: "secondary" as const };
    return { label: "Nepromovat", variant: "destructive" as const };
  };

  const qaStatus = getQAStatus(calculatedScore);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 85) return "default" as const;
    if (score >= 70) return "secondary" as const;
    return "destructive" as const;
  };

  const extractionSections = call.aiScorecard.sections.filter(
    (s) => s.extractedValue !== undefined
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calls">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Detalii Apel</h1>
          <p className="text-muted-foreground">ID: {call.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <GradeBadge grade={grade} />
          <Badge variant={qaStatus.variant}>{qaStatus.label}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Call Info & Audio */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Înregistrare Apel
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
                    onValueChange={(v) => setCurrentTime(Array.isArray(v) ? v[0] : v)}
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

          {/* AI Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Rezumat AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {call.aiScorecard.summary}
              </p>
              {call.aiScorecard.coachingNotes.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Note de Coaching
                  </p>
                  <ul className="text-sm space-y-1">
                    {call.aiScorecard.coachingNotes.slice(0, 2).map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Improvement Advice */}
          {call.aiScorecard.improvementAdvice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomandări de Îmbunătățire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {call.aiScorecard.improvementAdvice.map((advice, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{advice}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Transcript</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(speakerIndex).map(([id, n]) => {
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <span
                        key={id}
                        className="text-xs px-2 py-0.5 rounded-full font-medium border"
                        style={{ background: p.avatar, borderColor: p.border, color: p.label }}
                      >
                        Vorbitor {n + 1}
                      </span>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {call.transcript.map((entry, idx) => {
                    const n = speakerIndex[entry.speaker] ?? 0;
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <div
                        key={idx}
                        className="flex gap-3 items-start rounded-md px-3 py-2.5"
                        style={{ background: p.bg, borderLeft: `3px solid ${p.border}` }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                          style={{ background: p.avatar, color: p.label }}
                        >
                          {n + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: p.label }}>
                              Vorbitor {n + 1}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Caller History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Istoric Apelant
              </CardTitle>
              <CardDescription>
                {callerHistory.length > 0 ? (
                  <>
                    {callerHistory.length} apel{callerHistory.length > 1 ? "uri" : ""} anterior{callerHistory.length > 1 ? "e" : ""} de la{" "}
                    <span className="font-mono">{call.customerPhone}</span>
                  </>
                ) : (
                  <>
                    Niciun apel anterior de la <span className="font-mono">{call.customerPhone}</span>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {callerHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dată</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Durată</TableHead>
                      <TableHead>Scor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callerHistory.map((histCall) => (
                      <TableRow key={histCall.id}>
                        <TableCell>
                          <Link
                            href={`/calls/${histCall.id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {formatDate(histCall.dateTime)}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{histCall.customerPhone}</TableCell>
                        <TableCell className="text-sm">{formatTime(histCall.duration)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={getScoreBadgeVariant(histCall.qaScore)}>
                              {histCall.qaScore}%
                            </Badge>
                            <GradeBadge grade={histCall.aiScorecard.grade} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Acesta pare a fi primul apel de la acest număr.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scorecard & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scorecard QA</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${getScoreColor(calculatedScore)}`}>
                    {calculatedScore}%
                  </span>
                  <GradeBadge grade={grade} />
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={calculatedScore} className="h-3 mb-4" />

              {/* Analysis Info */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Analizat de: </span>
                    <span className="font-medium">{(call.rawJson as { analysis_model?: string }).analysis_model ?? "Unknown"}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {(call.rawJson as { analysis_timestamp?: string }).analysis_timestamp
                    ? new Date((call.rawJson as { analysis_timestamp: string }).analysis_timestamp).toLocaleString()
                    : "N/A"}
                </div>
              </div>

              {/* Grouped sections */}
              <div className="space-y-4">
                {Array.from(sectionGroups.entries()).map(([sectionName, sections]) => {
                  const sectionEarned = sections.reduce((sum, s) => sum + (s.score ?? 0), 0);
                  const sectionMax = sections.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);
                  return (
                    <div key={sectionName}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {sectionName}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {sectionEarned}/{sectionMax}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {sections.map((section) => (
                          <div
                            key={section.ruleId}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                          >
                            {section.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium">
                                {section.ruleTitle}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {section.details}
                              </div>
                            </div>
                            <span className="text-xs font-mono font-semibold shrink-0 tabular-nums">
                              {section.score}/{section.maxScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Extraction sections */}
                {extractionSections.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Extracții
                      </span>
                    </div>
                    <div className="space-y-1">
                      {extractionSections.map((section) => (
                        <div
                          key={section.ruleId}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <Tag className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">
                              {section.ruleTitle}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {section.details}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            extract
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informații Apel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Agent</span>
                <span className="font-medium text-sm">{call.agentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Telefon</span>
                <span className="font-medium text-sm font-mono">{call.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Durată</span>
                <span className="font-medium text-sm">{formatTime(call.duration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Scor QA</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm ${getScoreColor(calculatedScore)}`}>
                    {calculatedScore}%
                  </span>
                  <GradeBadge grade={grade} />
                </div>
              </div>

              {extractionRules.length > 0 && (
                <>
                  <div className="border-t pt-3 mt-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                      Extracții AI
                    </p>
                    {extractionRules.map((rule) => {
                      const value = call.aiScorecard.extractions[rule.extractionKey!] ?? "N/A";
                      return (
                        <div key={rule.id} className="flex justify-between items-center py-1">
                          <span className="text-muted-foreground text-sm">{rule.title.replace(" Extraction", "").replace(" Classification", "")}</span>
                          <Badge
                            variant={value === "N/A" ? "outline" : "secondary"}
                            className="text-xs font-normal capitalize max-w-[140px] truncate"
                          >
                            {value}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {call.status === "flagged" && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Probleme Semnalate
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
