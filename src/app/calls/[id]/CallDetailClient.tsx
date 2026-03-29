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
import { fetchCall, getAudioUrl, type CallDetail } from "@/lib/api";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
        <p className="text-muted-foreground">{error || "Apelul nu a fost găsit"}</p>
        <Link href="/calls">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Înapoi la apeluri
          </Button>
        </Link>
      </div>
    );
  }

  const speakerIndex: Record<string, number> = {};
  (call.transcript || []).forEach(({ speaker }) => {
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
          <h1 className="text-2xl font-bold">Detalii Apel</h1>
          <p className="text-muted-foreground">ID: {call.callId}</p>
        </div>
        <div className="flex items-center gap-2">
          <GradeBadge grade={grade} />
          <Badge variant={call.status === "completed" ? "default" : call.status === "flagged" ? "destructive" : "secondary"}>
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
                Înregistrare Apel
              </CardTitle>
              <CardDescription>
                {new Date(call.dateTime).toLocaleString("ro-RO")} • {formatTime(call.duration)}
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
                <p className="text-xs text-muted-foreground">Press play to download and listen to the recording</p>
              )}
            </CardContent>
          </Card>

          {/* AI Summary */}
          {call.aiSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Rezumat AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{call.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Improvement Advice */}
          {call.aiImprovementAdvice && call.aiImprovementAdvice.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recomandări de Îmbunătățire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {call.aiImprovementAdvice.map((advice, idx) => (
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
                <CardTitle>Transcript</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(speakerIndex).map(([id, n]) => {
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <span key={id} className="text-xs px-2 py-0.5 rounded-full font-medium border" style={{ background: p.avatar, borderColor: p.border, color: p.label }}>
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
                  {(call.transcript || []).map((entry, idx) => {
                    const n = speakerIndex[entry.speaker] ?? 0;
                    const p = SPEAKER_PALETTE[n % SPEAKER_PALETTE.length];
                    return (
                      <div key={idx} className="flex gap-3 items-start rounded-md px-3 py-2.5" style={{ background: p.bg, borderLeft: `3px solid ${p.border}` }}>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold" style={{ background: p.avatar, color: p.label }}>
                          {n + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold" style={{ color: p.label }}>Vorbitor {n + 1}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{entry.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!call.transcript || call.transcript.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">Nu există transcript</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Scorecard + Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scorecard QA</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>{Math.round(overallScore)}%</span>
                  <GradeBadge grade={grade} />
                </div>
                {call.aiTotalEarned !== undefined && call.aiTotalPossible !== undefined && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {call.aiTotalEarned}/{call.aiTotalPossible} puncte
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Extracții</span>
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
                  <span className={`font-bold text-sm ${getScoreColor(overallScore)}`}>{Math.round(overallScore)}%</span>
                  <GradeBadge grade={grade} />
                </div>
              </div>
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
                {call.rulesFailed.length > 0 && (
                  <ul className="space-y-2 mt-2">
                    {call.rulesFailed.map((rule, idx) => (
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
    </div>
  );
}
