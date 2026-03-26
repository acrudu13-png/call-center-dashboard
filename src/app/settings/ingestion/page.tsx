"use client";

import { useState, useMemo } from "react";
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
  defaultSftpSettings,
  defaultS3Settings,
  defaultMetadataMapping,
  defaultIngestSchedule,
} from "@/lib/mockData";
import {
  saveSftpSettings,
  testSftpConnection,
  saveS3Settings,
  saveIngestSchedule,
  triggerManualIngestionCheck,
} from "@/lib/actions";
import {
  Server,
  Cloud,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Play,
  Info,
} from "lucide-react";

// Resolve $yesterday_date variable in a path string
function resolvePathVars(path: string): string {
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];
  return path.replace(/\$yesterday_date/g, yesterday);
}

// Try to apply a regex pattern to a filename and return named capture groups
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

// Format time value from HH-MM-SS to HH:MM:SS
function formatTimePart(raw: string): string {
  return raw.replace(/-/g, ":");
}

export default function IngestionSettingsPage() {
  const [sftp, setSftp] = useState(defaultSftpSettings);
  const [sftpSaving, setSftpSaving] = useState(false);
  const [sftpTesting, setSftpTesting] = useState(false);
  const [sftpTestResult, setSftpTestResult] = useState<string | null>(null);
  const [showSftpPassword, setShowSftpPassword] = useState(false);

  const [s3, setS3] = useState(defaultS3Settings);
  const [s3Saving, setS3Saving] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [metadata, setMetadata] = useState(defaultMetadataMapping);

  const [schedule, setSchedule] = useState(defaultIngestSchedule);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [manualCheckResult, setManualCheckResult] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSftpSave = async () => {
    setSftpSaving(true);
    const result = await saveSftpSettings({ ...sftp, port: Number(sftp.port) });
    showStatus(result.message);
    setSftpSaving(false);
  };

  const handleSftpTest = async () => {
    setSftpTesting(true);
    setSftpTestResult(null);
    const result = await testSftpConnection({
      host: sftp.host,
      port: Number(sftp.port),
      username: sftp.username,
    });
    setSftpTestResult(result.message);
    setSftpTesting(false);
  };

  const handleS3Save = async () => {
    setS3Saving(true);
    const result = await saveS3Settings(s3);
    showStatus(result.message);
    setS3Saving(false);
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
    const result = await triggerManualIngestionCheck(sftp.remotePath);
    setManualCheckResult(result.message);
    setManualChecking(false);
  };

  // Resolve the remote path with $yesterday_date replaced
  const resolvedPath = useMemo(() => resolvePathVars(sftp.remotePath), [sftp.remotePath]);
  const pathHasVar = sftp.remotePath.includes("$yesterday_date");

  // Parse sample filenames with the current regex pattern
  const parsedSamples = useMemo(() => {
    return metadata.sampleFilenames.map((fn) => ({
      filename: fn,
      result: parseFilename(metadata.filenamePattern, fn),
    }));
  }, [metadata.filenamePattern, metadata.sampleFilenames]);

  const nextRunTime = (() => {
    const now = new Date();
    const next = new Date();
    next.setHours(schedule.cronHour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
                    <Input
                      id="sftp-host"
                      value={sftp.host}
                      onChange={(e) => setSftp({ ...sftp, host: e.target.value })}
                      placeholder="sftp.example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sftp-port">Port</Label>
                    <Input
                      id="sftp-port"
                      type="number"
                      value={sftp.port}
                      onChange={(e) => setSftp({ ...sftp, port: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-user">Username</Label>
                  <Input
                    id="sftp-user"
                    value={sftp.username}
                    onChange={(e) => setSftp({ ...sftp, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="sftp-pass"
                      type={showSftpPassword ? "text" : "password"}
                      value={sftp.password}
                      onChange={(e) => setSftp({ ...sftp, password: e.target.value })}
                      placeholder="Enter password or leave blank for SSH key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSftpPassword(!showSftpPassword)}
                    >
                      {showSftpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-key">SSH Key Path</Label>
                  <Input
                    id="sftp-key"
                    value={sftp.sshKeyPath}
                    onChange={(e) => setSftp({ ...sftp, sshKeyPath: e.target.value })}
                    placeholder="/path/to/private/key"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sftp-remote">Remote Path</Label>
                  <Input
                    id="sftp-remote"
                    value={sftp.remotePath}
                    onChange={(e) => setSftp({ ...sftp, remotePath: e.target.value })}
                    placeholder="/recordings/$yesterday_date"
                    className="font-mono text-sm"
                  />
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
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4" />
                    {sftpTestResult}
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
                    <Input
                      id="s3-bucket"
                      value={s3.bucketName}
                      onChange={(e) => setS3({ ...s3, bucketName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-region">Region</Label>
                    <Input
                      id="s3-region"
                      value={s3.region}
                      onChange={(e) => setS3({ ...s3, region: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-access">Access Key</Label>
                  <Input
                    id="s3-access"
                    value={s3.accessKey}
                    onChange={(e) => setS3({ ...s3, accessKey: e.target.value })}
                    placeholder="AKIA..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-secret">Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="s3-secret"
                      type={showSecretKey ? "text" : "password"}
                      value={s3.secretKey}
                      onChange={(e) => setS3({ ...s3, secretKey: e.target.value })}
                      placeholder="Enter secret key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-prefix">Key Prefix</Label>
                  <Input
                    id="s3-prefix"
                    value={s3.prefix}
                    onChange={(e) => setS3({ ...s3, prefix: e.target.value })}
                    placeholder="raw-audio/"
                  />
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
          <Card>
            <CardHeader>
              <CardTitle>Filename Regex Parser</CardTitle>
              <CardDescription>
                Define a regex with named capture groups to extract phone number, date, and time from audio filenames. Use <span className="font-mono bg-muted px-1 rounded text-xs">{"(?<phone>...)"}</span>, <span className="font-mono bg-muted px-1 rounded text-xs">{"(?<date>...)"}</span>, <span className="font-mono bg-muted px-1 rounded text-xs">{"(?<time>...)"}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-pattern">Regex Pattern</Label>
                  <Input
                    id="meta-pattern"
                    value={metadata.filenamePattern}
                    onChange={(e) => setMetadata({ ...metadata, filenamePattern: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="_N(?<phone>\+[\d]+)_.*_(?<date>\d{4}-\d{2}-\d{2})_(?<time>\d{2}-\d{2}-\d{2})\."
                  />
                  <p className="text-xs text-muted-foreground">
                    Example filename: <span className="font-mono">Telerenta_1777723443827-43242343_N+40758423232_N210-R207_2026-03-25_11-57-14.au</span>
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 text-xs font-medium bg-muted px-3 py-2 text-muted-foreground">
                      <span>Filename</span>
                      <span className="w-36 text-center">Phone</span>
                      <span className="w-28 text-center">Date</span>
                      <span className="w-24 text-center">Time</span>
                    </div>
                    {parsedSamples.map(({ filename, result }, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center px-3 py-2.5 border-t text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground truncate pr-2">
                          {filename}
                        </span>
                        <span className="w-36 text-center">
                          {result?.phone ? (
                            <Badge variant="secondary" className="font-mono text-xs">{result.phone}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>
                          )}
                        </span>
                        <span className="w-28 text-center">
                          {result?.date ? (
                            <Badge variant="secondary" className="font-mono text-xs">{result.date}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>
                          )}
                        </span>
                        <span className="w-24 text-center">
                          {result?.time ? (
                            <Badge variant="secondary" className="font-mono text-xs">{formatTimePart(result.time)}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {parsedSamples.some(({ result }) => !result) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Info className="h-3 w-3" /> One or more filenames did not match the pattern — check your regex.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Test Your Own Filename</Label>
                  <FilenameTestInput pattern={metadata.filenamePattern} />
                </div>
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
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(v) => setSchedule({ ...schedule, enabled: v })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cron-hour">Daily Run Time (24h)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="cron-hour"
                      type="number"
                      min={0}
                      max={23}
                      value={schedule.cronHour}
                      onChange={(e) =>
                        setSchedule({
                          ...schedule,
                          cronHour: Math.min(23, Math.max(0, Number(e.target.value))),
                        })
                      }
                      className="w-24 font-mono"
                    />
                    <span className="text-sm text-muted-foreground">
                      :00 — runs at <span className="font-mono font-medium text-foreground">{String(schedule.cronHour).padStart(2, "0")}:00</span> daily
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The job will check <span className="font-mono bg-muted px-1 rounded">{resolvedPath}</span> for new audio files.
                  </p>
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
                <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-4 py-3 font-mono">
                  <span className="text-muted-foreground">Path:</span>
                  <span>{resolvedPath}</span>
                </div>
                <Button
                  onClick={handleManualCheck}
                  disabled={manualChecking}
                  variant="outline"
                  className="gap-2"
                >
                  {manualChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
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

// Isolated component to avoid re-rendering the whole page on every keystroke
function FilenameTestInput({ pattern }: { pattern: string }) {
  const [testFilename, setTestFilename] = useState(
    "Telerenta_1777723443827-43242343_N+40758423232_N210-R207_2026-03-25_11-57-14.au"
  );

  const result = useMemo(() => parseFilename(pattern, testFilename), [pattern, testFilename]);

  return (
    <div className="space-y-3">
      <Input
        value={testFilename}
        onChange={(e) => setTestFilename(e.target.value)}
        placeholder="Paste a filename to test..."
        className="font-mono text-sm"
      />
      {testFilename && (
        <div className="flex flex-wrap gap-2 text-sm">
          {result ? (
            <>
              {result.phone && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Phone:</span>
                  <Badge variant="secondary" className="font-mono">{result.phone}</Badge>
                </div>
              )}
              {result.date && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Date:</span>
                  <Badge variant="secondary" className="font-mono">{result.date}</Badge>
                </div>
              )}
              {result.time && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Time:</span>
                  <Badge variant="secondary" className="font-mono">{result.time.replace(/-/g, ":")}</Badge>
                </div>
              )}
              {!result.phone && !result.date && !result.time && (
                <span className="text-amber-600 text-xs">Pattern matched but no named groups (phone/date/time) found.</span>
              )}
            </>
          ) : (
            <span className="text-destructive text-xs">No match — check pattern or filename.</span>
          )}
        </div>
      )}
    </div>
  );
}
