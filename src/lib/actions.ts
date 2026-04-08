// ============================================================
// Actions — now backed by the Python FastAPI backend
// ============================================================

import {
  saveSetting,
  testConnection,
  createRule,
  updateRule,
  deleteRule as apiDeleteRule,
  reorderRules,
  triggerIngestion,
  createCallType as apiCreateCallType,
  updateCallType as apiUpdateCallType,
  deleteCallType as apiDeleteCallType,
} from "./api";

export async function saveSftpSettings(data: {
  host: string;
  port: number;
  username: string;
  password: string;
  sshKeyPath: string;
  remotePath: string;
}) {
  await saveSetting("sftp", data);
  return { success: true, message: "SFTP settings saved successfully." };
}

export async function testSftpConnection(_data: {
  host: string;
  port: number;
  username: string;
}) {
  const result = await testConnection("sftp");
  return { success: result.success, message: result.message };
}

export async function saveS3Settings(data: {
  bucketName: string;
  region: string;
  accessKey: string;
  secretKey: string;
  prefix: string;
}) {
  await saveSetting("s3", data);
  return { success: true, message: "S3 settings saved successfully." };
}

export async function saveMetadataMapping(data: {
  filenamePattern?: string;
  delimiter?: string;
  agentIdPosition?: number;
  phonePosition?: number;
  agentIdField?: string;
  customerPhoneField?: string;
  dateTimeField?: string;
  durationField?: string;
}) {
  await saveSetting("metadata-mapping", data);
  return { success: true, message: "Metadata mapping saved successfully." };
}

export async function saveLlmSettings(data: {
  openRouterApiKey: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
}) {
  await saveSetting("llm", data);
  return { success: true, message: "LLM settings saved successfully." };
}

export async function saveSonioxSettings(data: {
  apiKey: string;
  language: string;
  model: string;
}) {
  await saveSetting("soniox", data);
  return { success: true, message: "Soniox settings saved successfully." };
}

export async function saveCustomVocabulary(words: string[]) {
  // Store as a setting
  await saveSetting("custom-vocabulary", { words });
  return { success: true, message: `${words.length} vocabulary terms saved.` };
}

export async function saveWebhookSettings(data: {
  endpointUrl: string;
  enabled: boolean;
  retryCount: number;
}) {
  await saveSetting("webhook", data);
  return { success: true, message: "Webhook settings saved successfully." };
}

export async function testWebhookEndpoint(_url: string) {
  const result = await testConnection("webhook");
  return { success: result.success, message: result.message };
}

export async function saveQARule(rule: {
  id?: string;
  title: string;
  description: string;
  section?: string;
  sectionEn?: string;
  maxScore?: number;
  extractionKey?: string;
  enabled: boolean;
  isCritical?: boolean;
  direction?: string;
  callTypes?: string[];
  subdirectories?: string[];
  metadataConditions?: { field: string; operator: string; value: string }[];
}) {
  if (rule.id) {
    await updateRule(rule.id, {
      title: rule.title,
      description: rule.description,
      section: rule.section || "General",
      max_score: rule.maxScore || 0,
      enabled: rule.enabled,
      is_critical: rule.isCritical || false,
      call_types: rule.callTypes || [],
      subdirectories: rule.subdirectories || [],
      metadata_conditions: rule.metadataConditions || [],
      direction: rule.direction || "both",
    });
    return { success: true, message: "Rule saved successfully.", id: rule.id };
  } else {
    const id = `rule-${String(Date.now()).slice(-6)}`;
    await createRule({
      rule_id: id,
      title: rule.title,
      description: rule.description,
      section: rule.section || "General",
      rule_type: rule.extractionKey ? "extraction" : "scoring",
      max_score: rule.maxScore || 0,
      enabled: rule.enabled,
      is_critical: rule.isCritical || false,
      direction: rule.direction || "both",
      call_types: rule.callTypes || [],
      subdirectories: rule.subdirectories || [],
      metadata_conditions: rule.metadataConditions || [],
    });
    return { success: true, message: "Rule saved successfully.", id };
  }
}

export async function deleteQARule(ruleId: string) {
  await apiDeleteRule(ruleId);
  return { success: true, message: "Rule deleted successfully." };
}

export async function reorderQARules(orderedIds: string[]) {
  await reorderRules(orderedIds);
  return { success: true, message: "Rules reordered successfully." };
}

export async function saveMainPrompt(prompt: string) {
  await saveSetting("main-prompt", { prompt });
  return { success: true, message: "Main prompt saved successfully." };
}

export async function saveCallContext(context: string) {
  await saveSetting("call-context", { context });
  return { success: true, message: "Call context saved successfully." };
}

export async function saveIngestSchedule(data: {
  cronHour: number;
  enabled: boolean;
}) {
  await saveSetting("ingest-schedule", data);
  return {
    success: true,
    message: `Schedule saved — will run daily at ${String(data.cronHour).padStart(2, "0")}:00.`,
  };
}

export async function saveClassificationSettings(data: {
  model: string;
  prompt: string;
  temperature: number;
}) {
  await saveSetting("classification", data);
  return { success: true, message: "Classification settings saved successfully." };
}

export async function saveCallType(data: {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  isNew?: boolean;
}) {
  const { isNew, ...rest } = data;
  if (isNew) {
    await apiCreateCallType(rest);
  } else {
    await apiUpdateCallType(data.key, { name: data.name, description: data.description, enabled: data.enabled });
  }
  return { success: true, message: "Call type saved successfully." };
}

export async function removeCallType(key: string) {
  await apiDeleteCallType(key);
  return { success: true, message: "Call type deleted successfully." };
}

export async function saveFilenameParser(data: {
  filenamePattern: string;
  variables: { name: string; label: string }[];
  sampleFilenames: string[];
  useInfoFiles: boolean;
  recursiveTraversal: boolean;
  audioExtensions: string[];
  durationSource: string;
}) {
  await saveSetting("filename-parser", data);
  return { success: true, message: "Filename parser settings saved successfully." };
}

export async function triggerManualIngestionCheck(remotePath: string) {
  await triggerIngestion("sftp", remotePath);
  return {
    success: true,
    message: "Ingestion triggered. Check logs for progress.",
  };
}
