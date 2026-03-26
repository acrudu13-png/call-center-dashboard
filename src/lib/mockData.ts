// ============================================================
// Mock Data for Enterprise Call Center QA & Analytics Dashboard
// ============================================================

export interface Call {
  id: string;
  dateTime: string;
  agentName: string;
  agentId: string;
  customerPhone: string;
  duration: number; // seconds
  qaScore: number;
  status: "completed" | "in_review" | "flagged" | "processing";
  rulesFailed: string[];
  compliancePass: boolean;
  transcript: TranscriptLine[];
  aiScorecard: AIScorecard;
  rawJson: object;
}

export interface TranscriptLine {
  speaker: "agent" | "customer";
  timestamp: number; // seconds from start
  text: string;
}

export interface AIScorecard {
  overallScore: number;
  sections: ScorecardSection[];
  issuesDetected: string[];
  coachingNotes: string[];
}

export interface ScorecardSection {
  ruleId: string;
  ruleTitle: string;
  passed: boolean;
  weight: "critical" | "moderate" | "bonus";
  details: string;
}

export interface QARule {
  id: string;
  title: string;
  description: string;
  weight: "critical" | "moderate" | "bonus";
  expectedOutput: "boolean" | "text";
  enabled: boolean;
  order: number;
}

export interface DailyScore {
  date: string;
  avgScore: number;
  totalCalls: number;
}

// --- QA Rules ---
export const qaRules: QARule[] = [
  {
    id: "rule-001",
    title: "Greeting & Identity Verification",
    description:
      "Agent must greet the customer by name, state the company name, and verify the customer's identity using at least two data points (CNP, contract number, or date of birth).",
    weight: "critical",
    expectedOutput: "boolean",
    enabled: true,
    order: 1,
  },
  {
    id: "rule-002",
    title: "GDPR Data Processing Consent",
    description:
      "Agent must inform the customer that the call is being recorded and obtain verbal consent for data processing in accordance with Romanian GDPR regulations before proceeding.",
    weight: "critical",
    expectedOutput: "boolean",
    enabled: true,
    order: 2,
  },
  {
    id: "rule-003",
    title: "Problem Identification & Active Listening",
    description:
      "Agent must paraphrase the customer's issue back to them to confirm understanding before offering a solution. Must use active listening cues.",
    weight: "moderate",
    expectedOutput: "boolean",
    enabled: true,
    order: 3,
  },
  {
    id: "rule-004",
    title: "Product Knowledge Accuracy",
    description:
      "All product details, pricing, and policy information stated by the agent must be factually correct. Cross-reference with the current product database.",
    weight: "critical",
    expectedOutput: "text",
    enabled: true,
    order: 4,
  },
  {
    id: "rule-005",
    title: "Upsell/Cross-sell Attempt",
    description:
      "Agent should identify at least one relevant upsell or cross-sell opportunity based on the customer's profile and current subscription.",
    weight: "bonus",
    expectedOutput: "boolean",
    enabled: true,
    order: 5,
  },
  {
    id: "rule-006",
    title: "Empathy & Professionalism",
    description:
      "Agent must maintain a professional and empathetic tone throughout the call. No use of slang, dismissive language, or interruption of the customer.",
    weight: "moderate",
    expectedOutput: "boolean",
    enabled: true,
    order: 6,
  },
  {
    id: "rule-007",
    title: "Resolution & Next Steps",
    description:
      "Agent must clearly state the resolution or next steps, including any follow-up actions, timelines, and ticket/reference numbers.",
    weight: "moderate",
    expectedOutput: "text",
    enabled: true,
    order: 7,
  },
  {
    id: "rule-008",
    title: "Proper Call Closing",
    description:
      "Agent must ask if the customer has any other questions, thank them for calling, and provide the call reference number before disconnecting.",
    weight: "moderate",
    expectedOutput: "boolean",
    enabled: true,
    order: 8,
  },
  {
    id: "rule-009",
    title: "Hold Time Compliance",
    description:
      "Any hold placed during the call must not exceed 90 seconds without the agent returning to provide a status update to the customer.",
    weight: "moderate",
    expectedOutput: "boolean",
    enabled: false,
    order: 9,
  },
  {
    id: "rule-010",
    title: "Prohibited Language Detection",
    description:
      "Detect any use of prohibited language, discriminatory remarks, or inappropriate content from the agent during the call.",
    weight: "critical",
    expectedOutput: "boolean",
    enabled: true,
    order: 10,
  },
];

// --- Agents ---
const agents = [
  { name: "Maria Popescu", id: "AGT-001" },
  { name: "Andrei Ionescu", id: "AGT-002" },
  { name: "Elena Dumitrescu", id: "AGT-003" },
  { name: "Alexandru Popa", id: "AGT-004" },
  { name: "Cristina Moldovan", id: "AGT-005" },
  { name: "Mihai Stanescu", id: "AGT-006" },
  { name: "Ioana Gheorghe", id: "AGT-007" },
  { name: "Radu Nistor", id: "AGT-008" },
];

// --- Sample Transcript ---
function generateTranscript(): TranscriptLine[] {
  return [
    { speaker: "agent", timestamp: 0, text: "Bună ziua, ați sunat la Telecom România, mă numesc Maria Popescu. Cu ce vă pot ajuta astăzi?" },
    { speaker: "customer", timestamp: 5, text: "Bună ziua. Am o problemă cu factura din luna aceasta. Mi s-a facturat o sumă mai mare decât de obicei." },
    { speaker: "agent", timestamp: 14, text: "Îmi pare rău să aud asta. Vă rog să-mi spuneți numărul de contract și CNP-ul pentru a vă verifica identitatea." },
    { speaker: "customer", timestamp: 22, text: "Sigur, numărul de contract este TC-2024-87432 și CNP-ul este 2850315..." },
    { speaker: "agent", timestamp: 35, text: "Vă mulțumesc. Vă informez că acest apel este înregistrat în scopul îmbunătățirii serviciilor. Sunteți de acord cu continuarea?" },
    { speaker: "customer", timestamp: 43, text: "Da, sunt de acord." },
    { speaker: "agent", timestamp: 46, text: "Mulțumesc. Am verificat contul dumneavoastră. Văd că factura din martie este cu 45 de lei mai mare față de luna precedentă. Acest lucru se datorează unui serviciu adițional de roaming care a fost activat pe 15 februarie." },
    { speaker: "customer", timestamp: 62, text: "Dar eu nu am activat niciun serviciu de roaming! Nu am fost în afara țării." },
    { speaker: "agent", timestamp: 68, text: "Înțeleg frustrarea dumneavoastră și vă cer scuze pentru neplăcere. Permiteți-mi să verific istoricul activărilor pe contul dumneavoastră." },
    { speaker: "customer", timestamp: 78, text: "Vă rog, da." },
    { speaker: "agent", timestamp: 80, text: "Am verificat și se pare că serviciul a fost activat printr-un SMS promoțional. Voi dezactiva imediat acest serviciu și voi iniția o cerere de creditare pentru suma de 45 de lei." },
    { speaker: "customer", timestamp: 95, text: "Mulțumesc, asta e tot ce voiam." },
    { speaker: "agent", timestamp: 98, text: "De asemenea, aș dori să vă informez că avem o ofertă specială pentru pachetul Premium care include roaming în UE fără costuri suplimentare, la doar 10 lei pe lună în plus față de abonamentul actual." },
    { speaker: "customer", timestamp: 112, text: "Nu, mulțumesc, nu sunt interesată momentan." },
    { speaker: "agent", timestamp: 116, text: "Nicio problemă. Deci, pentru a rezuma: am dezactivat serviciul de roaming și am înregistrat cererea de creditare cu numărul REF-2024-9981. Creditul va apărea pe factura următoare în 5-7 zile lucrătoare." },
    { speaker: "customer", timestamp: 132, text: "Perfect, mulțumesc mult." },
    { speaker: "agent", timestamp: 135, text: "Mai aveți vreo altă întrebare sau vă mai pot ajuta cu ceva?" },
    { speaker: "customer", timestamp: 139, text: "Nu, asta e tot. Mulțumesc." },
    { speaker: "agent", timestamp: 142, text: "Vă mulțumesc pentru apel și vă dorim o zi frumoasă! Referința apelului este CALL-2024-44521." },
  ];
}

// --- Generate Calls ---
function generateCalls(): Call[] {
  const calls: Call[] = [];
  const statuses: Call["status"][] = ["completed", "completed", "completed", "in_review", "flagged", "completed", "completed", "processing"];

  for (let i = 0; i < 50; i++) {
    const agent = agents[i % agents.length];
    const score = Math.floor(Math.random() * 40) + 60;
    const status = statuses[i % statuses.length];
    const failedRules: string[] = [];
    const scorecardSections: ScorecardSection[] = [];

    qaRules.filter((r) => r.enabled).forEach((rule) => {
      const passed = Math.random() > (rule.weight === "critical" ? 0.25 : rule.weight === "moderate" ? 0.15 : 0.3);
      if (!passed) failedRules.push(rule.id);
      scorecardSections.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        passed,
        weight: rule.weight,
        details: passed
          ? "Requirement met successfully."
          : `Agent did not satisfy this requirement. ${rule.weight === "critical" ? "This is a critical compliance failure." : "Improvement recommended."}`,
      });
    });

    const compliancePass = !failedRules.some((id) => {
      const rule = qaRules.find((r) => r.id === id);
      return rule?.weight === "critical";
    });

    const date = new Date(2024, 2, 26 - Math.floor(i / 3));
    date.setHours(8 + (i % 10), Math.floor(Math.random() * 60));

    calls.push({
      id: `CALL-${String(1000 + i)}`,
      dateTime: date.toISOString(),
      agentName: agent.name,
      agentId: agent.id,
      customerPhone: `+40 7${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
      duration: Math.floor(Math.random() * 600) + 120,
      qaScore: score,
      status,
      rulesFailed: failedRules,
      compliancePass,
      transcript: generateTranscript(),
      aiScorecard: {
        overallScore: score,
        sections: scorecardSections,
        issuesDetected: failedRules.length > 0
          ? [
              ...(!compliancePass ? ["Critical compliance failure detected — immediate review required."] : []),
              ...failedRules.slice(0, 2).map((id) => {
                const rule = qaRules.find((r) => r.id === id);
                return `Failed: ${rule?.title}`;
              }),
            ]
          : ["No issues detected. Call meets all quality standards."],
        coachingNotes: failedRules.length > 0
          ? [
              "Review the opening script to ensure all verification steps are completed.",
              "Practice active listening techniques — repeat back the customer's concern before responding.",
              "Remember to mention the call reference number during closing.",
            ]
          : ["Excellent performance. Consider this call as a training example for new agents."],
      },
      rawJson: {
        call_id: `CALL-${String(1000 + i)}`,
        source_file: `recording_${agent.id}_${date.toISOString().split("T")[0]}_${String(i).padStart(3, "0")}.wav`,
        transcription_engine: "soniox",
        transcription_confidence: 0.94,
        language_detected: "ro",
        analysis_model: "anthropic/claude-3.5-sonnet",
        analysis_timestamp: new Date().toISOString(),
        scores: {
          overall: score,
          greeting: Math.random() > 0.2,
          gdpr_consent: Math.random() > 0.25,
          active_listening: Math.random() > 0.15,
          product_accuracy: Math.random() > 0.2 ? "All statements verified" : "Pricing discrepancy detected",
          upsell_attempt: Math.random() > 0.4,
          empathy: Math.random() > 0.1,
          resolution: Math.random() > 0.15 ? "Issue resolved with credit applied" : "Escalation required",
          closing: Math.random() > 0.2,
        },
        metadata: {
          agent_id: agent.id,
          customer_phone_hash: "sha256:a1b2c3d4...",
          duration_seconds: Math.floor(Math.random() * 600) + 120,
          hold_time_seconds: Math.floor(Math.random() * 60),
          silence_percentage: (Math.random() * 15).toFixed(1),
        },
      },
    });
  }

  return calls;
}

export const calls: Call[] = generateCalls();

// --- Daily Scores for Chart ---
export const dailyScores: DailyScore[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2024, 2, 26 - (29 - i));
  return {
    date: date.toISOString().split("T")[0],
    avgScore: Math.floor(Math.random() * 15) + 78,
    totalCalls: Math.floor(Math.random() * 30) + 10,
  };
});

// --- Flagged Calls ---
export const flaggedCalls = calls.filter((c) => c.status === "flagged" || !c.compliancePass);

// --- Summary Metrics ---
export const summaryMetrics = {
  totalCalls: calls.length,
  avgScore: Math.round(calls.reduce((sum, c) => sum + c.qaScore, 0) / calls.length),
  criticalFailures: calls.filter((c) => !c.compliancePass).length,
  callsInReview: calls.filter((c) => c.status === "in_review").length,
  processingCalls: calls.filter((c) => c.status === "processing").length,
};

// --- Settings Defaults ---
export const defaultSftpSettings = {
  host: "sftp.telecom-romania.ro",
  port: 22,
  username: "call_ingest_svc",
  password: "",
  sshKeyPath: "/etc/ssh/telecom_ingest_rsa",
  remotePath: "/recordings/daily/",
};

export const defaultS3Settings = {
  bucketName: "telecom-ro-call-recordings",
  region: "eu-central-1",
  accessKey: "",
  secretKey: "",
  prefix: "raw-audio/",
};

export const defaultMetadataMapping = {
  filenamePattern: "^(?<agent_id>AGT-\\d{3})_(?<phone>\\d{10})_(?<date>\\d{8})_(?<seq>\\d+)\\.wav$",
  delimiter: "_",
  agentIdPosition: 0,
  phonePosition: 1,
  sampleFilenames: [
    "AGT-001_0745123456_20240315_001.wav",
    "AGT-003_0722987654_20240315_002.wav",
    "AGT-005_0731456789_20240315_003.wav",
  ],
};

export const defaultLlmSettings = {
  openRouterApiKey: "",
  defaultModel: "anthropic/claude-3.5-sonnet",
  availableModels: [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.1-405b-instruct",
  ],
  temperature: 0.1,
  maxTokens: 4096,
};

export const defaultSonioxSettings = {
  apiKey: "",
  language: "ro",
  model: "soniox-default",
};

export const defaultCustomVocabulary = [
  "Telecom România",
  "abonament",
  "factură",
  "creditare",
  "roaming",
  "CNP",
  "contract",
  "pachet Premium",
  "serviciu adițional",
  "GDPR",
  "date personale",
  "consimțământ",
];

export const defaultWebhookSettings = {
  endpointUrl: "https://api.internal.telecom-ro.com/webhooks/qa-results",
  enabled: true,
  retryCount: 3,
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer <token>",
  },
};
