"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { defaultWebhookSettings } from "@/lib/mockData";
import { saveWebhookSettings, testWebhookEndpoint } from "@/lib/actions";
import { fetchSetting } from "@/lib/api";
import {
  Webhook,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

export default function WebhooksPage() {
  const [webhook, setWebhook] = useState(defaultWebhookSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchSetting<Record<string, unknown>>("webhook").catch(() => null);
        if (data) {
          setWebhook({ ...defaultWebhookSettings, ...data });
        }
      } catch (e) {
        console.error("Failed to load settings from DB", e);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveWebhookSettings({
      endpointUrl: webhook.endpointUrl,
      enabled: webhook.enabled,
      retryCount: webhook.retryCount,
    });
    setStatusMessage(result.message);
    setSaving(false);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testWebhookEndpoint(webhook.endpointUrl);
    setTestResult(result.message);
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Export & Webhooks
        </h1>
        <p className="text-muted-foreground">
          Configure where assessed call data is sent after processing.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4" />
          {statusMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <div>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Define the endpoint URL where the final assessed JSON data
                should be POSTed after a call is processed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-3">
              <Switch
                checked={webhook.enabled}
                onCheckedChange={(v) =>
                  setWebhook({ ...webhook, enabled: v })
                }
              />
              <Label>Webhook Enabled</Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                value={webhook.endpointUrl}
                onChange={(e) =>
                  setWebhook({ ...webhook, endpointUrl: e.target.value })
                }
                placeholder="https://api.example.com/webhooks/qa-results"
                disabled={!webhook.enabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook-retries">Retry Count</Label>
              <Input
                id="webhook-retries"
                type="number"
                min={0}
                max={10}
                value={webhook.retryCount}
                onChange={(e) =>
                  setWebhook({
                    ...webhook,
                    retryCount: Number(e.target.value),
                  })
                }
                disabled={!webhook.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Number of retry attempts if the initial POST fails.
              </p>
            </div>

            <Separator />

            {/* Headers preview */}
            <div className="space-y-1.5">
              <Label>Request Headers</Label>
              <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                {Object.entries(webhook.headers).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}:</span>{" "}
                    {value}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Payload */}
            <div className="space-y-1.5">
              <Label>Sample Payload</Label>
              <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
                {JSON.stringify(
                  {
                    event: "call.assessed",
                    call_id: "CALL-1001",
                    timestamp: new Date().toISOString(),
                    scores: {
                      overall: 87,
                      compliance: true,
                      rules_passed: 8,
                      rules_failed: 1,
                    },
                    agent_id: "AGT-001",
                    duration_seconds: 245,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Settings
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !webhook.enabled}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test Endpoint
              </Button>
            </div>

            {testResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4" />
                {testResult}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
