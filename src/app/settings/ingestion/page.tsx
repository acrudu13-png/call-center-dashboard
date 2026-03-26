"use client";

import { useState } from "react";
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
import {
  defaultSftpSettings,
  defaultS3Settings,
  defaultMetadataMapping,
} from "@/lib/mockData";
import {
  saveSftpSettings,
  testSftpConnection,
  saveS3Settings,
  saveMetadataMapping,
} from "@/lib/actions";
import {
  Server,
  Cloud,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

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
  const [metaSaving, setMetaSaving] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSftpSave = async () => {
    setSftpSaving(true);
    const result = await saveSftpSettings({ ...sftp, port: Number(sftp.port) });
    setStatusMessage(result.message);
    setSftpSaving(false);
    setTimeout(() => setStatusMessage(null), 3000);
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
    setStatusMessage(result.message);
    setS3Saving(false);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleMetaSave = async () => {
    setMetaSaving(true);
    const result = await saveMetadataMapping({
      ...metadata,
      agentIdPosition: Number(metadata.agentIdPosition),
      phonePosition: Number(metadata.phonePosition),
    });
    setStatusMessage(result.message);
    setMetaSaving(false);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Data Ingestion & Storage
        </h1>
        <p className="text-muted-foreground">
          Configure how call recordings are fetched from your telecom
          infrastructure.
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
          <TabsTrigger value="metadata" className="gap-2">
            <FileText className="h-4 w-4" /> Metadata Mapping
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
                      onChange={(e) =>
                        setSftp({ ...sftp, host: e.target.value })
                      }
                      placeholder="sftp.example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sftp-port">Port</Label>
                    <Input
                      id="sftp-port"
                      type="number"
                      value={sftp.port}
                      onChange={(e) =>
                        setSftp({ ...sftp, port: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-user">Username</Label>
                  <Input
                    id="sftp-user"
                    value={sftp.username}
                    onChange={(e) =>
                      setSftp({ ...sftp, username: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-pass">Password</Label>
                  <div className="relative">
                    <Input
                      id="sftp-pass"
                      type={showSftpPassword ? "text" : "password"}
                      value={sftp.password}
                      onChange={(e) =>
                        setSftp({ ...sftp, password: e.target.value })
                      }
                      placeholder="Enter password or leave blank for SSH key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSftpPassword(!showSftpPassword)}
                    >
                      {showSftpPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-key">SSH Key Path</Label>
                  <Input
                    id="sftp-key"
                    value={sftp.sshKeyPath}
                    onChange={(e) =>
                      setSftp({ ...sftp, sshKeyPath: e.target.value })
                    }
                    placeholder="/path/to/private/key"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sftp-remote">Remote Path</Label>
                  <Input
                    id="sftp-remote"
                    value={sftp.remotePath}
                    onChange={(e) =>
                      setSftp({ ...sftp, remotePath: e.target.value })
                    }
                    placeholder="/recordings/daily/"
                  />
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button onClick={handleSftpSave} disabled={sftpSaving}>
                    {sftpSaving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Save Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSftpTest}
                    disabled={sftpTesting}
                  >
                    {sftpTesting && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
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
                      onChange={(e) =>
                        setS3({ ...s3, bucketName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-region">Region</Label>
                    <Input
                      id="s3-region"
                      value={s3.region}
                      onChange={(e) =>
                        setS3({ ...s3, region: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-access">Access Key</Label>
                  <Input
                    id="s3-access"
                    value={s3.accessKey}
                    onChange={(e) =>
                      setS3({ ...s3, accessKey: e.target.value })
                    }
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
                      onChange={(e) =>
                        setS3({ ...s3, secretKey: e.target.value })
                      }
                      placeholder="Enter secret key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s3-prefix">Key Prefix</Label>
                  <Input
                    id="s3-prefix"
                    value={s3.prefix}
                    onChange={(e) =>
                      setS3({ ...s3, prefix: e.target.value })
                    }
                    placeholder="raw-audio/"
                  />
                </div>

                <Separator />

                <Button onClick={handleS3Save} disabled={s3Saving}>
                  {s3Saving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Mapping */}
        <TabsContent value="metadata" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Filename Metadata Mapping</CardTitle>
              <CardDescription>
                Define how Agent ID and Phone Number are extracted from raw
                audio filenames.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-pattern">Filename Regex Pattern</Label>
                  <Input
                    id="meta-pattern"
                    value={metadata.filenamePattern}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        filenamePattern: e.target.value,
                      })
                    }
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use named capture groups: {`(?<agent_id>...)`} and{" "}
                    {`(?<phone>...)`}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-delim">Delimiter</Label>
                    <Input
                      id="meta-delim"
                      value={metadata.delimiter}
                      onChange={(e) =>
                        setMetadata({
                          ...metadata,
                          delimiter: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-agent-pos">Agent ID Position</Label>
                    <Input
                      id="meta-agent-pos"
                      type="number"
                      value={metadata.agentIdPosition}
                      onChange={(e) =>
                        setMetadata({
                          ...metadata,
                          agentIdPosition: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meta-phone-pos">Phone Position</Label>
                    <Input
                      id="meta-phone-pos"
                      type="number"
                      value={metadata.phonePosition}
                      onChange={(e) =>
                        setMetadata({
                          ...metadata,
                          phonePosition: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sample Filenames (Preview)</Label>
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    {metadata.sampleFilenames.map((fn, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm font-mono"
                      >
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>{fn}</span>
                        <span className="text-muted-foreground">&rarr;</span>
                        <Badge variant="outline" className="text-xs">
                          Agent:{" "}
                          {fn.split(metadata.delimiter)[
                            metadata.agentIdPosition
                          ] || "?"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Phone:{" "}
                          {fn.split(metadata.delimiter)[
                            metadata.phonePosition
                          ] || "?"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleMetaSave} disabled={metaSaving}>
                  {metaSaving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
