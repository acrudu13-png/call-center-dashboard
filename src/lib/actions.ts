// ============================================================
// Mock Actions — stubbed for demo (client-side mocks)
// ============================================================

export async function saveSftpSettings(data: {
  host: string;
  port: number;
  username: string;
  password: string;
  sshKeyPath: string;
  remotePath: string;
}) {
  await new Promise((r) => setTimeout(r, 800));
  console.log("[Action] SFTP settings saved:", { ...data, password: "***" });
  return { success: true, message: "SFTP settings saved successfully." };
}

export async function testSftpConnection(data: {
  host: string;
  port: number;
  username: string;
}) {
  await new Promise((r) => setTimeout(r, 1500));
  console.log("[Action] Testing SFTP connection to:", data.host);
  return { success: true, message: `Connection to ${data.host}:${data.port} successful.` };
}

export async function saveS3Settings(data: {
  bucketName: string;
  region: string;
  accessKey: string;
  secretKey: string;
  prefix: string;
}) {
  await new Promise((r) => setTimeout(r, 800));
  console.log("[Action] S3 settings saved:", { ...data, secretKey: "***" });
  return { success: true, message: "S3 settings saved successfully." };
}

export async function saveMetadataMapping(data: {
  filenamePattern: string;
  delimiter: string;
  agentIdPosition: number;
  phonePosition: number;
}) {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[Action] Metadata mapping saved:", data);
  return { success: true, message: "Metadata mapping saved successfully." };
}

export async function saveLlmSettings(data: {
  openRouterApiKey: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
}) {
  await new Promise((r) => setTimeout(r, 800));
  console.log("[Action] LLM settings saved:", { ...data, openRouterApiKey: "***" });
  return { success: true, message: "LLM settings saved successfully." };
}

export async function saveSonioxSettings(data: {
  apiKey: string;
  language: string;
  model: string;
}) {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[Action] Soniox settings saved:", { ...data, apiKey: "***" });
  return { success: true, message: "Soniox settings saved successfully." };
}

export async function saveCustomVocabulary(words: string[]) {
  await new Promise((r) => setTimeout(r, 500));
  console.log("[Action] Custom vocabulary saved:", words.length, "terms");
  return { success: true, message: `${words.length} vocabulary terms saved.` };
}

export async function saveWebhookSettings(data: {
  endpointUrl: string;
  enabled: boolean;
  retryCount: number;
}) {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[Action] Webhook settings saved:", data);
  return { success: true, message: "Webhook settings saved successfully." };
}

export async function testWebhookEndpoint(url: string) {
  await new Promise((r) => setTimeout(r, 1200));
  console.log("[Action] Testing webhook endpoint:", url);
  return { success: true, message: `POST to ${url} returned 200 OK.` };
}

export async function saveQARule(rule: {
  id?: string;
  title: string;
  description: string;
  weight: string;
  expectedOutput: string;
  enabled: boolean;
}) {
  await new Promise((r) => setTimeout(r, 600));
  const id = rule.id || `rule-${String(Date.now()).slice(-6)}`;
  console.log("[Action] QA Rule saved:", id);
  return { success: true, message: "Rule saved successfully.", id };
}

export async function deleteQARule(ruleId: string) {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[Action] QA Rule deleted:", ruleId);
  return { success: true, message: "Rule deleted successfully." };
}

export async function reorderQARules(orderedIds: string[]) {
  await new Promise((r) => setTimeout(r, 300));
  console.log("[Action] QA Rules reordered:", orderedIds);
  return { success: true, message: "Rules reordered successfully." };
}

export async function saveMainPrompt(prompt: string) {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[Action] Main prompt saved:", prompt.slice(0, 80));
  return { success: true, message: "Main prompt saved successfully." };
}

export async function saveCallContext(context: string) {
  await new Promise((r) => setTimeout(r, 500));
  console.log("[Action] Call context saved:", context.slice(0, 80));
  return { success: true, message: "Call context saved successfully." };
}

export async function saveIngestSchedule(data: {
  cronHour: number;
  enabled: boolean;
}) {
  await new Promise((r) => setTimeout(r, 500));
  console.log("[Action] Ingest schedule saved:", data);
  return { success: true, message: `Schedule saved — will run daily at ${String(data.cronHour).padStart(2, "0")}:00.` };
}

export async function triggerManualIngestionCheck(remotePath: string) {
  await new Promise((r) => setTimeout(r, 2000));
  const resolved = remotePath.replace(
    "$yesterday_date",
    new Date(Date.now() - 86400000).toISOString().split("T")[0]
  );
  console.log("[Action] Manual ingestion check triggered for:", resolved);
  return {
    success: true,
    message: `Checked ${resolved} — found 12 new files, 0 already processed. Queued for ingestion.`,
  };
}
