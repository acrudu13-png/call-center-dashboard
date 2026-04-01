"use client";

import { use, useMemo, useState, useEffect, useRef } from "react";
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
  Brain,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { fetchCall, getAudioUrl, analyzeCall, deleteCall, fetchCallTypes, type CallDetail, type CallTypeInfo, type AnalyzeResponse } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { RotateCcw, Trash2, FlaskConical, Plus, X as XIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatTime(seconds: number) {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function GradeBadge({ grade }: { grade: string }) {
  const config: Record<string, { label: string; className: string }> = {
    Excelent: { label: "Excelent", className: "bg-green-100 text-green-800 border-green-200" },
    Excellent: { label: "Excelent", className: "bg-green-100 text-green-800 border-green-200" },
    Bun: { label: "Bun", className: "bg-blue-100 text-blue-800 border-blue-200" },
    Good: { label: "Bun", className: "bg-blue-100 text-blue-800 border-blue-200" },
    Acceptabil: { label: "Acceptabil", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    Acceptable: { label: "Acceptabil", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    Slab: { label: "Slab", className: "bg-red-100 text-red-800 border-red-200" },
    Poor: { label: "Slab", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, className } = config[grade] ?? { label: grade, className: "bg-gray-100 text-gray-800 border-gray-200" };
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
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [callTypes, setCallTypes] = useState<CallTypeInfo[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get("test-mode") === "true";
  const { t } = useTranslation();

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchCallTypes().then(setCallTypes).catch(() => {});
    fetchCall(id)
      .then(setCall)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePlayPause = () => {
    if (!audioRef.current) {
      // First press: start loading audio from SFTP
      setAudioLoading(true);
      setAudioError(null);
      const audio = new Audio(getAudioUrl(id));
      audioRef.current = audio;

      audio.addEventListener("canplay", () => {
        setAudioLoading(false);
        setAudioReady(true);
        setAudioDuration(audio.duration || call?.duration || 0);
        audio.play();
        setIsPlaying(true);
      });

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });

      audio.addEventListener("error", () => {
        setAudioLoading(false);
        setAudioError("Failed to load audio from server");
      });

      audio.load();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await analyzeCall({ callId: id });
      const updated = await fetchCall(id);
      setCall(updated);
    } catch (e) {
      console.error("Reanalysis failed:", e);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this call?")) return;
    setDeleting(true);
    try {
      await deleteCall(id);
      router.push("/calls");
    } catch (e) {
      console.error("Delete failed:", e);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">{error || "{t.callDetail.callNotFound}"}</p>
        <Link href="/calls">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.callDetail.backToCalls}
          </Button>
        </Link>
      </div>
    );
  }

  const transcript = call.transcript || [];
  const rulesFailed = call.rulesFailed || [];
  const improvementAdvice = call.aiImprovementAdvice || [];
  const speakerMap = (call.rawJson?.speaker_map || {}) as Record<string, string>;

  const getSpeakerName = (speakerId: string, index: number) => {
    if (speakerMap[speakerId]) return speakerMap[speakerId];
    return `${t.callDetail.speaker} ${index + 1}`;
  };

  const speakerIndex: Record<string, number> = {};
  transcript.forEach(({ speaker }) => {
    if (!(speaker in speakerIndex)) {
      speakerIndex[speaker] = Object.keys(speakerIndex).length;
    }
  });

  const SPEAKER_PALETTE = [
    { bg: "rgba(59,130,246,0.07)", border: "#93c5fd", avatar: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
    { bg: "rgba(244,63,94,0.07)", border: "#fca5a5", avatar: "rgba(244,63,94,0.18)", label: "#be123c" },
    { bg: "rgba(34,197,94,0.07)", border: "#86efac", avatar: "rgba(34,197,94,0.18)", label: "#15803d" },
    { bg: "rgba(234,179,8,0.07)", border: "#fde047", avatar: "rgba(234,179,8,0.18)", label: "#a16207" },
  ];

  const overallScore = call.qaScore ?? 0;
  const grade = call.aiGrade ?? "Slab";
  const scorecard = call.aiScorecard || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const scoringRules = scorecard.filter((s) => s.maxScore > 0);
  const extractionRules = scorecard.filter((s) => s.maxScore === 0 && s.extractedValue);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calls">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t.callDetail.title}</h1>
          <p className="text-muted-foreground">ID: {call.callId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {call.direction === "inbound" ? "Inbound" : call.direction === "outbound" ? "Outbound" : "—"}
          </Badge>
          {call.callType && (
            <Badge variant="secondary" className="text-xs">{callTypes.find(ct => ct.key === call.callType)?.name || call.callType}</Badge>
          )}
          {!call.isEligible && (
            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
              N/A{call.ineligibleReason ? `: ${call.ineligibleReason}` : ""}
            </Badge>
          )}
          <GradeBadge grade={grade} />
          <Badge variant={call.status === "completed" ? "default" : call.status === "flagged" || call.status === "failed" ? "destructive" : "secondary"}>
            {call.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                {t.callDetail.recording}
              </CardTitle>
              <CardDescription>
                {new Date(call.dateTime).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })} • {formatTime(call.duration)}
                {call.processedAt && (
                  <span className="ml-3 text-muted-foreground">
                    {t.callDetail.processed}: {new Date(call.processedAt).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {audioError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{audioError}</div>
              )}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePlayPause}
                  disabled={audioLoading}
                >
                  {audioLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    onValueChange={(v) => handleSeek(Array.isArray(v) ? v[0] : v)}
                    max={audioDuration || call.duration}
                    step={0.1}
                    disabled={!audioReady}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">
                  {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(audioDuration || call.duration))}
                </span>
              </div>
              {audioLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Downloading audio from server...
                </div>
              )}
              {!audioReady && !audioLoading && (
                <p className="text-xs text-muted-foreground">{t.callDetail.pressPlay}</p>
              )}
              {call.audioFileName && (
                <p className="text-xs text-muted-foreground font-mono truncate mt-1" title={call.audioFileName}>
                  {call.audioFileName}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Failed notice */}
          {call.status === "failed" && (
            <Card className="border-red-300 bg-red-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{t.callDetail.processingFailed}</p>
                    <p className="text-sm text-red-700 mt-1">
                      {call.ineligibleReason || t.callDetail.unknownError}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ineligible notice (not failed) */}
          {!call.isEligible && call.status !== "failed" && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6">
                <p className="text-sm text-orange-700">
                  {call.ineligibleReason || t.callDetail.notEligible}
                </p>
                {call.aiSummary && (
                  <p className="text-sm text-muted-foreground mt-2">{call.aiSummary}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {call.isEligible && call.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  {t.callDetail.aiSummary}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{call.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Improvement Advice */}
          {call.isEligible && improvementAdvice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t.callDetail.improvements}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {improvementAdvice.map((advice, idx) => (
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

          {/* Transcript */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>{t.callDetail.transcript}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(speakerIndex).map(([id, n]) => {
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <span key={id} className="text-xs px-2 py-0.5 rounded-full font-medium border" style={{ background: p.avatar, borderColor: p.border, color: p.label }}>
                        {getSpeakerName(id, n)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {transcript.map((entry, idx) => {
                    const n = speakerIndex[entry.speaker] ?? 0;
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <div key={idx} className="flex gap-3 items-start rounded-md px-3 py-2.5" style={{ background: p.bg, borderLeft: `3px solid ${p.border}` }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ background: p.avatar, color: p.label }}>
                          {n + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: p.label }}>{getSpeakerName(entry.speaker, n)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {transcript.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">{t.callDetail.noTranscript}</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Scorecard + Info */}
        <div className="space-y-6">
          {call.isEligible && (
            <Card>
              <CardHeader>
                <CardTitle>{t.callDetail.scorecard}</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{Math.round(overallScore)}%</span>
                    <GradeBadge grade={grade} />
                  </div>
                  {call.aiTotalEarned !== undefined && call.aiTotalPossible !== undefined && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {call.aiTotalEarned}/{call.aiTotalPossible} {t.callDetail.points}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={overallScore} className="h-3 mb-4" />
                <div className="space-y-1">
                  {scoringRules.map((entry) => (
                    <div key={entry.ruleId} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      {entry.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{entry.ruleTitle}</div>
                        <div className="text-xs text-muted-foreground">{entry.details}</div>
                      </div>
                      <span className="text-xs font-mono font-semibold shrink-0">{entry.score}/{entry.maxScore}</span>
                    </div>
                  ))}

                  {extractionRules.length > 0 && (
                    <div className="pt-2 mt-2 border-t">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.callDetail.extractions}</span>
                      {extractionRules.map((entry) => (
                        <div key={entry.ruleId} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <Tag className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">{entry.ruleTitle}</div>
                            <div className="text-xs text-muted-foreground">{entry.details}</div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{entry.extractedValue}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t.callDetail.callInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{t.callDetail.agent}</span>
                <span className="font-medium text-sm">{call.agentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{t.callDetail.phone}</span>
                <span className="font-medium text-sm font-mono">{call.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">{t.callDetail.duration}</span>
                <span className="font-medium text-sm">{formatTime(call.duration)}</span>
              </div>
              {call.isEligible && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t.callDetail.qaScore}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${getScoreColor(overallScore)}`}>{Math.round(overallScore)}%</span>
                    <GradeBadge grade={grade} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {call.hasCriticalFailure && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Probleme Critice
                </CardTitle>
              </CardHeader>
              <CardContent>
                {call.criticalFailureReason && (
                  <p className="text-sm text-destructive">{call.criticalFailureReason}</p>
                )}
                {rulesFailed.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {rulesFailed.map((rule, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={reanalyzing}>
          {reanalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
          {reanalyzing ? t.callDetail.analyzing : t.callDetail.reanalyze}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
          {deleting ? t.callDetail.deleting : t.callDetail.deleteCall}
        </Button>
      </div>

      {/* Info File Panel */}
      {typeof call.rawJson?.info_file === "string" && call.rawJson.info_file && (
        <InfoFilePanel content={call.rawJson.info_file} />
      )}

      {/* LLM Debug Panel */}
      {(call.llmRequest || call.llmResponse || !!call.rawJson?.classification_debug) && (
        <LlmDebugPanel
          request={call.llmRequest}
          response={call.llmResponse}
          classificationDebug={(call.rawJson?.classification_debug || null) as Record<string, string> | null}
        />
      )}

      {/* Test Mode Panel */}
      {isTestMode && (
        <TestModePanel callId={id} />
      )}
    </div>
  );
}

function InfoFilePanel({ content }: { content: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!content) return null;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {t.callDetail.infoFile}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            {open ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent>
          <ScrollArea className="h-[300px]">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded-lg">
              {content}
            </pre>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

type DebugTab = "classification" | "config" | "system" | "prompt" | "schema" | "response";

function LlmDebugPanel({ request, response, classificationDebug }: {
  request?: string | null;
  response?: string | null;
  classificationDebug?: Record<string, string> | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DebugTab>(classificationDebug ? "classification" : "config");

  if (!request && !response && !classificationDebug) return null;

  // Parse structured request
  let parsed: Record<string, unknown> | null = null;
  try {
    if (request) parsed = JSON.parse(request);
  } catch {
    // old format — plain text
  }

  const configText = parsed
    ? `Model: ${parsed.model}\nTemperature: ${parsed.temperature}\nMax tokens: ${parsed.max_tokens}\nMode: ${parsed.mode}`
    : null;
  const systemPrompt = parsed ? String(parsed.system_prompt || "") : null;
  const userMessage = parsed ? String(parsed.user_message || "") : request;
  const schemaText = parsed?.response_format
    ? JSON.stringify(parsed.response_format, null, 2)
    : null;

  // Pretty-print response JSON
  let responseText = response || "";
  try {
    if (response) responseText = JSON.stringify(JSON.parse(response), null, 2);
  } catch {
    // keep raw
  }

  const classificationText = classificationDebug
    ? Object.entries(classificationDebug).map(([k, v]) => `--- ${k} ---\n${v}`).join("\n\n")
    : null;

  const tabs: { key: DebugTab; label: string; content: string | null }[] = [
    { key: "classification", label: "Classification", content: classificationText },
    { key: "config", label: "Config", content: configText },
    { key: "system", label: "System Prompt", content: systemPrompt },
    { key: "prompt", label: "User Prompt", content: userMessage },
    { key: "schema", label: "JSON Schema", content: schemaText },
    { key: "response", label: "Response", content: responseText },
  ].filter((t) => t.content) as { key: DebugTab; label: string; content: string }[];

  const activeContent = tabs.find((t) => t.key === tab)?.content || tabs[0]?.content || "No data";

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t.callDetail.llmDebug}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            {open ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {tabs.map((t) => (
              <Button
                key={t.key}
                variant={tab === t.key ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <ScrollArea className="h-[500px]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted p-4 rounded-lg">
              {activeContent}
            </pre>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Test Mode Panel ──────────────────────────────────────── */

const DEFAULT_TEST_MODELS = [
  "google/gemini-3.1-flash-lite-preview",
  "openai/gpt-5.4-nano",
];

interface TestResult {
  model: string;
  status: "pending" | "running" | "done" | "error";
  result?: AnalyzeResponse;
  error?: string;
  durationMs?: number;
}

function TestModePanel({ callId }: { callId: string }) {
  const [models, setModels] = useState<string[]>([...DEFAULT_TEST_MODELS]);
  const [newModel, setNewModel] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  // LLM parameters
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(8000);

  const addModel = () => {
    const m = newModel.trim();
    if (m && !models.includes(m)) {
      setModels([...models, m]);
    }
    setNewModel("");
  };

  const removeModel = (model: string) => {
    setModels(models.filter((m) => m !== model));
    setResults(results.filter((r) => r.model !== model));
  };

  const runTests = async () => {
    setRunning(true);
    setExpandedModel(null);
    const initial: TestResult[] = models.map((m) => ({ model: m, status: "pending" }));
    setResults(initial);

    const promises = models.map(async (model, idx) => {
      setResults((prev) => prev.map((r, i) => i === idx ? { ...r, status: "running" } : r));
      const start = Date.now();
      try {
        const result = await analyzeCall({
          callId,
          model,
          temperature,
          maxTokens,
          thinkingBudget: thinkingEnabled ? thinkingBudget : undefined,
          dryRun: true,
        });
        const durationMs = Date.now() - start;
        setResults((prev) => prev.map((r, i) => i === idx ? { ...r, status: "done", result, durationMs } : r));
      } catch (e) {
        const durationMs = Date.now() - start;
        setResults((prev) => prev.map((r, i) => i === idx ? { ...r, status: "error", error: String(e), durationMs } : r));
      }
    });

    await Promise.all(promises);
    setRunning(false);
  };

  return (
    <Card className="border-2 border-purple-300 dark:border-purple-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-purple-500" />
          Test Mode — Model Comparison
        </CardTitle>
        <CardDescription>
          Run this call through multiple models without saving results. Compare scores, grades, and responses side by side.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model list */}
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <Badge key={model} variant="secondary" className="text-sm py-1 px-3 gap-1.5">
              {model}
              <button onClick={() => removeModel(model)} className="hover:text-destructive">
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add model */}
        <div className="flex gap-2">
          <Input
            placeholder="openrouter model id (e.g. meta-llama/llama-4-scout)"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModel()}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addModel} disabled={!newModel.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 border">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Temperature: {temperature}</Label>
            <Slider
              value={[temperature]}
              onValueChange={(v) => setTemperature(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={2}
              step={0.05}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Max Tokens</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={256}
              max={32768}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <input
                type="checkbox"
                checked={thinkingEnabled}
                onChange={(e) => setThinkingEnabled(e.target.checked)}
                className="rounded"
              />
              Extended Thinking
            </Label>
            <Input
              type="number"
              value={thinkingBudget}
              onChange={(e) => setThinkingBudget(Number(e.target.value))}
              min={1024}
              max={128000}
              disabled={!thinkingEnabled}
              placeholder="Token budget"
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground pt-1">
            <p>Temp 0 = deterministic</p>
            <p>Temp 1+ = creative</p>
            <p>Thinking = deeper reasoning</p>
          </div>
        </div>

        {/* Run button */}
        <Button onClick={runTests} disabled={running || models.length === 0} className="bg-purple-600 hover:bg-purple-700">
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
          {running ? "Running tests..." : `Run ${models.length} model${models.length > 1 ? "s" : ""}`}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            {/* Summary table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow
                    key={r.model}
                    className={`cursor-pointer ${expandedModel === r.model ? "bg-muted" : ""}`}
                    onClick={() => setExpandedModel(expandedModel === r.model ? null : r.model)}
                  >
                    <TableCell className="font-mono text-xs">{r.model}</TableCell>
                    <TableCell>
                      {r.result ? (
                        <Badge variant={r.result.overallScore >= 85 ? "default" : r.result.overallScore >= 70 ? "secondary" : "destructive"}>
                          {Math.round(r.result.overallScore)}%
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{r.result?.grade || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.result ? `${r.result.totalEarned}/${r.result.totalPossible}` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.result ? (
                        r.result.hasCriticalFailure
                          ? <Badge variant="destructive">Yes</Badge>
                          : <Badge variant="outline">No</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.status === "pending" && <span className="text-xs text-muted-foreground">Pending</span>}
                      {r.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {r.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {r.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Expanded detail for selected model */}
            {expandedModel && (() => {
              const r = results.find((r) => r.model === expandedModel);
              if (!r) return null;

              if (r.status === "error") {
                return (
                  <Card className="border-destructive/50">
                    <CardContent className="pt-4">
                      <pre className="text-xs text-red-500 whitespace-pre-wrap">{r.error}</pre>
                    </CardContent>
                  </Card>
                );
              }

              if (!r.result) return null;

              return (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="font-mono">{r.model}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.result.overallScore >= 85 ? "default" : r.result.overallScore >= 70 ? "secondary" : "destructive"}>
                          {Math.round(r.result.overallScore)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal">{r.result.grade}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Summary</h4>
                      <p className="text-sm">{r.result.summary}</p>
                    </div>

                    {/* Improvements */}
                    {r.result.improvementAdvice.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Improvements</h4>
                        <ol className="text-sm list-decimal pl-4 space-y-1">
                          {r.result.improvementAdvice.map((adv, i) => <li key={i}>{adv}</li>)}
                        </ol>
                      </div>
                    )}

                    {/* Rule scores */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Rule Scores</h4>
                      <div className="space-y-1">
                        {r.result.results.filter(s => s.maxScore > 0).map((s) => (
                          <div key={s.ruleId} className="flex items-start gap-2 text-sm">
                            {s.passed
                              ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{s.ruleTitle}</span>
                                <span className="font-mono text-xs text-muted-foreground shrink-0 ml-2">{s.score}/{s.maxScore}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{s.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Raw response */}
                    {r.result.llmResponse && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground font-semibold">Raw LLM Response</summary>
                        <ScrollArea className="h-[300px] mt-2">
                          <pre className="font-mono whitespace-pre-wrap break-all bg-muted p-3 rounded-lg">
                            {(() => { try { return JSON.stringify(JSON.parse(r.result!.llmResponse!), null, 2); } catch { return r.result!.llmResponse; } })()}
                          </pre>
                        </ScrollArea>
                      </details>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
