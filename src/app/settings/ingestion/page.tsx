"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultSftpSettings,
  defaultS3Settings,
  defaultIngestSchedule,
} from "@/lib/mockData";
import {
  saveSftpSettings,
  testSftpConnection,
  saveS3Settings,
  saveIngestSchedule,
  saveFilenameParser,
  triggerManualIngestionCheck,
} from "@/lib/actions";
import { fetchSetting, fetchSampleFilenames } from "@/lib/api";
import {
  Server,
  Cloud,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Play,
  Info,
} from "lucide-react";

interface FilenameParserState {
  filenamePattern: string;
  variables: { name: string; label: string }[];
  sampleFilenames: string[];
  useInfoFiles: boolean;
  recursiveTraversal: boolean;
  audioExtensions: string[];
  durationSource: string;
}

const defaultParser: FilenameParserState = {
  filenamePattern: "",
  variables: [],
  sampleFilenames: [
    "TELERENTA_1777723443827--43242343_R207-N210_N+40758423232_2026-03-25_11-57-14.au",
  ],
  useInfoFiles: true,
  recursiveTraversal: false,
  audioExtensions: [".au", ".wav", ".mp3", ".ogg", ".flac"],
  durationSource: "info_file",
};

function resolvePathVars(path: string): string {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  return path.replace(/\$yesterday_date/g, yesterday);
}

function parseFilename(pattern: string, filename: string): Record<string, string> | null {
  try {
    const re = new RegExp(pattern);
    const match = re.exec(filename);
    if (!match || !match.groups) return null;
    return match.groups as Record<string, string>;
  } catch {
    return null;
  }
}

export default function IngestionSettingsPage() {
  const [sftp, setSftp] = useState(defaultSftpSettings);
  const [sftpSaving, setSftpSaving] = useState(false);
  const [sftpTesting, setSftpTesting] = useState(false);
  const [sftpTestResult, setSftpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSftpPassword, setShowSftpPassword] = useState(false);

  const [s3, setS3] = useState(defaultS3Settings);
  const [s3Saving, setS3Saving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [parser, setParser] = useState<FilenameParserState>(defaultParser);
  const [parserSaving, setParserSaving] = useState(false);

  const [schedule, setSchedule] = useState(defaultIngestSchedule);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [manualCheckResult, setManualCheckResult] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const sftpData = await fetchSetting<Record<string, unknown>>("sftp").catch(() => null);
        if (sftpData) setSftp({ ...defaultSftpSettings, ...sftpData });

        const s3Data = await fetchSetting<Record<string, unknown>>("s3").catch(() => null);
        if (s3Data) setS3({ ...defaultS3Settings, ...s3Data });

        const parserData = await fetchSetting<FilenameParserState>("filename-parser").catch(() => null);
        if (parserData) setParser({ ...defaultParser, ...parserData });

        const schedData = await fetchSetting<Record<string, unknown>>("ingest-schedule").catch(() => null);
        if (schedData) setSchedule({ ...defaultIngestSchedule, ...schedData });
      } catch (e) {
        console.error("Failed to load settings from DB", e);
      }
    }
    loadData();
  }, []);

  const handleSftpSave = async () => {
    setSftpSaving(true);
    const result = await saveSftpSettings({ ...sftp, port: Number(sftp.port) });
    showStatus(result.message);
    setSftpSaving(false);
  };

  const handleSftpTest = async () => {
    setSftpTesting(true);
    setSftpTestResult(null);
    try {
      const result = await testSftpConnection({
        host: sftp.host, port: Number(sftp.port), username: sftp.username,
      });
      setSftpTestResult({ success: result.success, message: result.message });
    } catch (e) {
      setSftpTestResult({
        success: false,
        message: e instanceof Error ? e.message : "Test failed",
      });
    } finally {
      setSftpTesting(false);
    }
  };

  const handleS3Save = async () => {
    setS3Saving(true);
    const result = await saveS3Settings(s3);
    showStatus(result.message);
    setS3Saving(false);
  };

  const handleParserSave = async () => {
    setParserSaving(true);
    const result = await saveFilenameParser(parser);
    showStatus(result.message);
    setParserSaving(false);
  };

  const handleScheduleSave = async () => {
    setScheduleSaving(true);
    const result = await saveIngestSchedule(schedule);
    showStatus(result.message);
    setScheduleSaving(false);
  };

  const handleManualCheck = async () => {
    setManualChecking(true);
    setManualCheckResult(null);
    const targetPath = customPath ?? resolvedPath;
    const result = await triggerManualIngestionCheck(targetPath);
    setManualCheckResult(result.message);
    setManualChecking(false);
  };

  const resolvedPath = useMemo(() => resolvePathVars(sftp.remotePath), [sftp.remotePath]);
  const pathHasVar = sftp.remotePath.includes("$yesterday_date");

  const nextRunTime = (() => {
    const now = new Date();
    const next = new Date();
    next.setHours(schedule.cronHour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Data Ingestion & Storage
        </h1>
        <p className="text-muted-foreground">
          Configure how call recordings are fetched and parsed from your telecom infrastructure.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4" />
          {statusMessage}
        </div>
      )}

      <Tabs defaultValue="sftp">
        <TabsList>
          <TabsTrigger value="sftp" className="gap-2">
            <Server className="h-4 w-4" /> SFTP
          </TabsTrigger>
          <TabsTrigger value="s3" className="gap-2">
            <Cloud className="h-4 w-4" /> S3 Bucket
          </TabsTrigger>
          <TabsTrigger value="parsing" className="gap-2">
            <FileText className="h-4 w-4" /> File Parsing
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="h-4 w-4" /> Schedule
          </TabsTrigger>
        </TabsList>

        {/* SFTP */}
        <TabsContent value="sftp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SFTP Connection</CardTitle>
              <CardDescription>
                Connect to your telecom server to fetch nightly call recordings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="sftp-host">Host</Label>
                    <Input id="sftp-host" value={sftp.host} onChange={(e) => setSftp({ ...sftp, host: e.target.value })} placeholder="sftp.example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sftp-port">Port</Label>
                    <Input id="sftp-port" type="number" value={sftp.port} onChange={(e) => setSftp({ ...sftp, port: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-user">Username</Label>
                  <Input id="sftp-user" value={sftp.username} onChange={(e) => setSftp({ ...sftp, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-pass">Password</Label>
                  <div className="relative">
                    <Input id="sftp-pass" type={showSftpPassword ? "text" : "password"} value={sftp.password} onChange={(e) => setSftp({ ...sftp, password: e.target.value })} placeholder="Enter password or leave blank for SSH key" />
                    <Button variant="ghost" size="icon" type="button" className="absolute right-0 top-0" onClick={() => setShowSftpPassword(!showSftpPassword)}>
                      {showSftpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-key">SSH Key Path</Label>
                  <Input id="sftp-key" value={sftp.sshKeyPath} onChange={(e) => setSftp({ ...sftp, sshKeyPath: e.target.value })} placeholder="/path/to/private/key" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-remote">Remote Path</Label>
                  <Input id="sftp-remote" value={sftp.remotePath} onChange={(e) => setSftp({ ...sftp, remotePath: e.target.value })} placeholder="/recordings/$yesterday_date" className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Use <span className="font-mono bg-muted px-1 rounded">$yesterday_date</span> as a dynamic variable — resolved to the previous day&apos;s date at runtime.
                  </p>
                  {pathHasVar && (
                    <div className="flex items-center gap-2 text-xs bg-muted rounded-md px-3 py-2 font-mono">
                      <span className="text-muted-foreground">Resolves to:</span>
                      <span className="text-foreground">{resolvedPath}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button onClick={handleSftpSave} disabled={sftpSaving}>
                    {sftpSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleSftpTest} disabled={sftpTesting}>
                    {sftpTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Test Connection
                  </Button>
                </div>
                {sftpTestResult && (
                  <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${
                    sftpTestResult.success
                      ? "text-green-700 bg-green-50 border border-green-200"
                      : "text-red-700 bg-red-50 border border-red-200"
                  }`}>
                    {sftpTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {sftpTestResult.message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* S3 */}
        <TabsContent value="s3" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>S3 Bucket Configuration</CardTitle>
              <CardDescription>
                Configure an AWS S3 bucket as an alternative recording source.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-bucket">Bucket Name</Label>
                    <Input id="s3-bucket" value={s3.bucketName} onChange={(e) => setS3({ ...s3, bucketName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-region">Region</Label>
                    <Input id="s3-region" value={s3.region} onChange={(e) => setS3({ ...s3, region: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-access">Access Key</Label>
                  <Input id="s3-access" value={s3.accessKey} onChange={(e) => setS3({ ...s3, accessKey: e.target.value })} placeholder="AKIA..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-secret">Secret Key</Label>
                  <div className="relative">
                    <Input id="s3-secret" type={showSecretKey ? "text" : "password"} value={s3.secretKey} onChange={(e) => setS3({ ...s3, secretKey: e.target.value })} placeholder="Enter secret key" />
                    <Button variant="ghost" size="icon" type="button" className="absolute right-0 top-0" onClick={() => setShowSecretKey(!showSecretKey)}>
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-prefix">Key Prefix</Label>
                  <Input id="s3-prefix" value={s3.prefix} onChange={(e) => setS3({ ...s3, prefix: e.target.value })} placeholder="raw-audio/" />
                </div>
                <Separator />
                <Button onClick={handleS3Save} disabled={s3Saving}>
                  {s3Saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Parsing */}
        <TabsContent value="parsing" className="mt-4 space-y-4">
          {/* Provider options */}
          <Card>
            <CardHeader>
              <CardTitle>Ingestion Mode</CardTitle>
              <CardDescription>
                Configure how recordings are discovered and how metadata is extracted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Use .info companion files</p>
                    <p className="text-xs text-muted-foreground">Parse agent name, phone, duration, and direction from .info files next to audio files.</p>
                  </div>
                  <Switch checked={parser.useInfoFiles} onCheckedChange={(v) => setParser({ ...parser, useInfoFiles: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Recursive directory traversal</p>
                    <p className="text-xs text-muted-foreground">Traverse subdirectories (e.g. date/department/files). New subdirectories are auto-discovered.</p>
                  </div>
                  <Switch checked={parser.recursiveTraversal} onCheckedChange={(v) => setParser({ ...parser, recursiveTraversal: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration source</Label>
                  <Select value={parser.durationSource} onValueChange={(v) => v && setParser({ ...parser, durationSource: v })}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info_file">From .info file</SelectItem>
                      <SelectItem value="audio_probe">From audio file (ffprobe)</SelectItem>
                      <SelectItem value="transcription">From transcription</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Primary source for call duration. Falls back to transcription length if unavailable.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filename Parser — visual labeler + regex */}
          <Card>
            <CardHeader>
              <CardTitle>Filename Parser</CardTitle>
              <CardDescription>
                Fetch real filenames from SFTP, then select text and assign labels to auto-generate the extraction pattern. Or write regex manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 max-w-3xl">
                <FilenameLabelBuilder
                  parser={parser}
                  onParserChange={setParser}
                  onSave={handleParserSave}
                  saving={parserSaving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingestion Schedule</CardTitle>
              <CardDescription>
                Recordings are uploaded to the SFTP server nightly. Configure when this system should check for new folders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-xl">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Scheduled Ingestion</p>
                    <p className="text-sm text-muted-foreground">Run the ingestion job automatically every day.</p>
                  </div>
                  <Switch checked={schedule.enabled} onCheckedChange={(v) => setSchedule({ ...schedule, enabled: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cron-hour">Daily Run Time (24h)</Label>
                  <div className="flex items-center gap-3">
                    <Input id="cron-hour" type="number" min={0} max={23} value={schedule.cronHour} onChange={(e) => setSchedule({ ...schedule, cronHour: Math.min(23, Math.max(0, Number(e.target.value))) })} className="w-24 font-mono" />
                    <span className="text-sm text-muted-foreground">
                      :00 — runs at <span className="font-mono font-medium text-foreground">{String(schedule.cronHour).padStart(2, "0")}:00</span> daily
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The job will check <span className="font-mono bg-muted px-1 rounded">{resolvedPath}</span> for new audio files.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="concurrency">Parallel Processing</Label>
                  <div className="flex items-center gap-3">
                    <Input id="concurrency" type="number" min={1} max={20} value={schedule.concurrency ?? 5} onChange={(e) => setSchedule({ ...schedule, concurrency: Math.min(20, Math.max(1, Number(e.target.value))) })} className="w-24 font-mono" />
                    <span className="text-sm text-muted-foreground">files processed simultaneously</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Higher values speed up ingestion but may hit API rate limits. Recommended: 3-5.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minDuration">Minimum call duration (seconds)</Label>
                  <div className="flex items-center gap-3">
                    <Input id="minDuration" type="number" min={0} max={300} value={schedule.minDuration ?? 10} onChange={(e) => setSchedule({ ...schedule, minDuration: Math.min(300, Math.max(0, Number(e.target.value))) })} className="w-24 font-mono" />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Calls shorter than this will be skipped from AI analysis and marked as ineligible. Set to 0 to analyze all.</p>
                </div>
                {schedule.enabled && (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-4 py-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Next run:</span>
                    <span className="font-medium">{nextRunTime}</span>
                  </div>
                )}
                <Separator />
                <Button onClick={handleScheduleSave} disabled={scheduleSaving}>
                  {scheduleSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manual Ingestion Check</CardTitle>
              <CardDescription>
                Immediately check the remote path for new files without waiting for the next scheduled run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label>Remote Path for Check</Label>
                  <Input value={customPath ?? resolvedPath} onChange={(e) => setCustomPath(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Leave blank to use the default scheduled path.</p>
                </div>
                <Button onClick={handleManualCheck} disabled={manualChecking} variant="outline" className="gap-2">
                  {manualChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {manualChecking ? "Checking..." : "Check Now"}
                </Button>
                {manualCheckResult && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {manualCheckResult}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Available labels for filename parts ──
const LABELS = [
  { value: "agent_name", label: "Agent Name", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "phone", label: "Phone", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "date", label: "Date", color: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "time", label: "Time", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "agent_id", label: "Agent ID", color: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  { value: "custom", label: "Custom...", color: "bg-gray-100 text-gray-800 border-gray-300" },
];

interface LabeledSegment {
  start: number;
  end: number;
  text: string;
  label: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegexFromLabels(filename: string, segments: LabeledSegment[]): string {
  if (!segments.length || !filename) return "";
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  let pattern = "";
  let pos = 0;
  for (const seg of sorted) {
    // Gap between last position and this segment — use smart pattern for variable parts
    if (seg.start > pos) {
      const gap = filename.slice(pos, seg.start);
      // If the gap is a single separator character (like _ or -), keep it literal
      // Otherwise, check if it looks like a fixed delimiter pattern
      if (/^[_\-./\\]+$/.test(gap)) {
        pattern += escapeRegex(gap);
      } else if (/^[A-Z]+[_\-]$/.test(gap)) {
        // Prefix like "E_", "D_", "H_", "CLID_" — keep literal
        pattern += escapeRegex(gap);
      } else {
        // Variable content between labels — use a generic pattern
        // but anchor to the separator before the next label
        const lastChar = gap[gap.length - 1];
        if (/[_\-./]/.test(lastChar)) {
          pattern += ".*?" + escapeRegex(lastChar);
        } else {
          pattern += escapeRegex(gap);
        }
      }
    }
    // Named capture group — guess a generic pattern based on the content
    const val = seg.text;
    let groupPattern: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) groupPattern = "\\d{4}-\\d{2}-\\d{2}";
    else if (/^\d{6}$/.test(val)) groupPattern = "\\d{6}";
    else if (/^\d{2}-\d{2}-\d{2}$/.test(val)) groupPattern = "\\d{2}-\\d{2}-\\d{2}";
    else if (/^\+?\d+$/.test(val)) groupPattern = "\\+?\\d+";
    else groupPattern = "[^_]+";  // match until next underscore
    pattern += `(?<${seg.label}>${groupPattern})`;
    pos = seg.end;
  }
  // Remaining tail — use generic pattern to match any extension
  if (pos < filename.length) {
    const tail = filename.slice(pos);
    // Keep the file extension literal, make the rest generic
    const extMatch = tail.match(/(\.\w+)$/);
    if (extMatch && tail.length > extMatch[1].length) {
      pattern += ".*?" + escapeRegex(extMatch[1]);
    } else {
      pattern += escapeRegex(tail);
    }
  }
  return pattern;
}

function FilenameLabelBuilder({
  parser,
  onParserChange,
  onSave,
  saving,
}: {
  parser: FilenameParserState;
  onParserChange: (p: FilenameParserState) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [fetching, setFetching] = useState(false);
  const [segments, setSegments] = useState<Record<number, LabeledSegment[]>>({});
  const [pendingLabel, setPendingLabel] = useState<{ idx: number; start: number; end: number; text: string } | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [manualMode, setManualMode] = useState(!!parser.filenamePattern);

  const handleFetchSamples = async () => {
    setFetching(true);
    try {
      const res = await fetchSampleFilenames();
      if (res.filenames.length > 0) {
        onParserChange({ ...parser, sampleFilenames: res.filenames });
        setSegments({});
      }
    } catch {
      // ignore
    }
    setFetching(false);
  };

  const handleTextSelect = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const selectedText = sel.toString();
    if (!selectedText.trim()) return;

    const fullText = parser.sampleFilenames[0];
    // Find ALL occurrences and pick the one closest to the selection
    const startOffset = fullText.indexOf(selectedText);
    if (startOffset === -1) return;

    // Make sure this selection doesn't overlap with existing labels
    const existing = segments[0] || [];
    const end = startOffset + selectedText.length;
    const overlaps = existing.some((s) => !(end <= s.start || startOffset >= s.end));
    if (overlaps) {
      sel.removeAllRanges();
      return;
    }

    setPendingLabel({
      idx: 0,
      start: startOffset,
      end,
      text: selectedText,
    });
    sel.removeAllRanges();
  };

  const rebuildRegex = (segs: LabeledSegment[]) => {
    if (segs.length > 0) {
      const regex = buildRegexFromLabels(parser.sampleFilenames[0], segs);
      onParserChange({ ...parser, filenamePattern: regex });
    } else {
      onParserChange({ ...parser, filenamePattern: "" });
    }
  };

  const assignLabel = (labelValue: string) => {
    if (!pendingLabel) return;
    const actualLabel = labelValue === "custom" ? customLabel.trim().replace(/\s+/g, "_").toLowerCase() : labelValue;
    if (!actualLabel) return;

    const { start, end, text } = pendingLabel;
    const existing = segments[0] || [];
    const filtered = existing.filter((s) => s.end <= start || s.start >= end);
    const updated = [...filtered, { start, end, text, label: actualLabel }].sort((a, b) => a.start - b.start);
    const newSegments = { ...segments, 0: updated };
    setSegments(newSegments);
    setPendingLabel(null);
    setCustomLabel("");
    rebuildRegex(updated);
  };

  const removeSegment = (_idx: number, segIdx: number) => {
    const updated = (segments[0] || []).filter((_, i) => i !== segIdx);
    setSegments({ ...segments, 0: updated });
    rebuildRegex(updated);
  };

  const getLabelColor = (label: string) => LABELS.find((l) => l.value === label)?.color || "bg-gray-100 text-gray-800 border-gray-300";

  // Render filename with highlighted labeled segments
  const renderFilename = (filename: string, idx: number) => {
    const segs = segments[idx] || [];
    if (segs.length === 0) {
      return (
        <span data-fn-idx={idx} className="font-mono text-sm cursor-text select-text">{filename}</span>
      );
    }
    const parts: React.ReactNode[] = [];
    let pos = 0;
    for (const seg of segs) {
      if (seg.start > pos) {
        parts.push(<span key={`gap-${pos}`}>{filename.slice(pos, seg.start)}</span>);
      }
      parts.push(
        <span key={`seg-${seg.start}`} className={`px-0.5 rounded border ${getLabelColor(seg.label)}`} title={seg.label}>
          {seg.text}
        </span>
      );
      pos = seg.end;
    }
    if (pos < filename.length) {
      parts.push(<span key={`tail-${pos}`}>{filename.slice(pos)}</span>);
    }
    return (
      <span data-fn-idx={idx} className="font-mono text-sm cursor-text select-text">{parts}</span>
    );
  };

  // Parse preview using current regex
  const parsedSamples = useMemo(() => {
    return parser.sampleFilenames.map((fn) => ({
      filename: fn,
      result: parser.filenamePattern ? parseFilename(parser.filenamePattern, fn) : null,
    }));
  }, [parser.filenamePattern, parser.sampleFilenames]);

  const allGroupNames = useMemo(() => {
    const names = new Set<string>();
    parsedSamples.forEach(({ result }) => {
      if (result) Object.keys(result).forEach((k) => names.add(k));
    });
    return Array.from(names);
  }, [parsedSamples]);

  return (
    <div className="space-y-5">
      {/* Fetch samples */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleFetchSamples} disabled={fetching}>
          {fetching ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Server className="h-3.5 w-3.5 mr-1.5" />}
          Fetch sample files from SFTP
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setManualMode(!manualMode)}>
          {manualMode ? "Visual mode" : "Manual regex"}
        </Button>
      </div>

      {parser.sampleFilenames.length > 0 && parser.sampleFilenames[0] && !manualMode && (
        <>
          {/* Visual labeler — only first filename is interactive */}
          <div className="space-y-2">
            <Label>Select text and assign labels (on the first filename):</Label>
            {/* Primary filename — interactive */}
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5" onMouseUp={handleTextSelect}>
              {renderFilename(parser.sampleFilenames[0], 0)}
              {(segments[0] || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(segments[0] || []).map((seg, si) => (
                    <Badge key={si} variant="outline" className={`text-xs gap-1 ${getLabelColor(seg.label)}`}>
                      {seg.label}: {seg.text}
                      <button onClick={() => removeSegment(0, si)} className="ml-0.5 hover:text-destructive">&times;</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {/* Other filenames — preview only */}
            {parser.sampleFilenames.slice(1).map((fn, i) => (
              <div key={i + 1} className="p-3 rounded-lg border bg-muted/30">
                <span className="font-mono text-sm text-muted-foreground">{fn}</span>
              </div>
            ))}
          </div>

          {/* Label picker popup */}
          {pendingLabel && (
            <div className="p-3 rounded-lg border border-primary bg-primary/5 space-y-2">
              <p className="text-sm">
                Selected: <span className="font-mono font-semibold">{pendingLabel.text}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LABELS.filter((l) => l.value !== "custom").map((l) => (
                  <Button key={l.value} variant="outline" size="sm" className={l.color} onClick={() => assignLabel(l.value)}>
                    {l.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="custom_field_name"
                  className="font-mono text-xs w-48"
                  onKeyDown={(e) => { if (e.key === "Enter") assignLabel("custom"); }}
                />
                <Button variant="outline" size="sm" onClick={() => assignLabel("custom")} disabled={!customLabel.trim()}>
                  Assign custom
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPendingLabel(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual regex input */}
      {manualMode && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="meta-pattern">Regex Pattern</Label>
            <Input
              id="meta-pattern"
              value={parser.filenamePattern}
              onChange={(e) => onParserChange({ ...parser, filenamePattern: e.target.value })}
              className="font-mono text-sm"
              placeholder="E_(?<agent_name>.+?)_D_(?<date>\d{4}-\d{2}-\d{2})_H_(?<time>\d{6})_\d+_CLID_(?<phone>\d+)\.wav"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sample Filenames</Label>
            {parser.sampleFilenames.map((fn, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={fn}
                  onChange={(e) => {
                    const updated = [...parser.sampleFilenames];
                    updated[i] = e.target.value;
                    onParserChange({ ...parser, sampleFilenames: updated });
                  }}
                  className="font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onParserChange({ ...parser, sampleFilenames: parser.sampleFilenames.filter((_, j) => j !== i) })}
                  disabled={parser.sampleFilenames.length <= 1}
                >
                  &times;
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onParserChange({ ...parser, sampleFilenames: [...parser.sampleFilenames, ""] })}>
              + Add sample
            </Button>
          </div>
        </div>
      )}

      {/* Generated regex (always shown) */}
      {parser.filenamePattern && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Generated Regex</Label>
          <div className="p-2 rounded border bg-muted font-mono text-xs break-all select-all">{parser.filenamePattern}</div>
        </div>
      )}

      <Separator />

      {/* Preview table */}
      {allGroupNames.length > 0 && (
        <div className="space-y-2">
          <Label>Extraction Preview</Label>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium">Filename</th>
                  {allGroupNames.map((name) => (
                    <th key={name} className="text-center px-3 py-2 font-medium whitespace-nowrap">{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedSamples.map(({ filename, result }, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-mono text-muted-foreground truncate max-w-xs">{filename}</td>
                    {allGroupNames.map((name) => (
                      <td key={name} className="text-center px-3 py-2">
                        {result?.[name] ? (
                          <Badge variant="secondary" className="font-mono text-xs">{result[name]}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Separator />

      <Button onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Parser Settings
      </Button>
    </div>
  );
}
