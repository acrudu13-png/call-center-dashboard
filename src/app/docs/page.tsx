"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Phone,
  ClipboardCheck,
  Database,
  Brain,
  Webhook,
  BookOpen,
  Layers,
  GitBranch,
  Tag,
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  Cpu,
  FolderOpen,
  Settings,
  User,
  Wrench,
  ArrowRight,
  Lightbulb,
  ListChecks,
  BarChart3,
  MessageSquare,
  Search,
  SlidersHorizontal,
  History,
  Shield,
} from "lucide-react";

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="space-y-4">{children}</section>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground">{children}</h3>;
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground leading-relaxed ${className ?? ""}`}>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">
      {children}
    </code>
  );
}

function Step({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <H3>{title}</H3>
        <P>{body}</P>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        </div>
        <p className="text-muted-foreground">
          CallQA Dashboard — user guide and technical reference.
        </p>
      </div>

      <Separator />

      {/* TOC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <User className="h-3 w-3" /> User Guide
              </p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li><a href="#dashboard" className="hover:text-foreground transition-colors">Dashboard Overview</a></li>
                <li><a href="#calls-explorer" className="hover:text-foreground transition-colors">Calls Explorer</a></li>
                <li><a href="#call-detail" className="hover:text-foreground transition-colors">Call Detail</a></li>
                <li><a href="#rules-engine" className="hover:text-foreground transition-colors">QA Rules Engine</a></li>
                <li><a href="#settings" className="hover:text-foreground transition-colors">Settings</a></li>
              </ol>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wrench className="h-3 w-3" /> Technical Guide
              </p>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside" start={6}>
                <li><a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a></li>
                <li><a href="#data-flow" className="hover:text-foreground transition-colors">Data Flow</a></li>
                <li><a href="#qa-rules-system" className="hover:text-foreground transition-colors">QA Rules System</a></li>
                <li><a href="#scoring" className="hover:text-foreground transition-colors">Scoring &amp; Grades</a></li>
                <li><a href="#api-endpoint" className="hover:text-foreground transition-colors">API Endpoint</a></li>
                <li><a href="#prompt-structure" className="hover:text-foreground transition-colors">Prompt Structure</a></li>
                <li><a href="#production" className="hover:text-foreground transition-colors">Production Migration</a></li>
                <li><a href="#codebase" className="hover:text-foreground transition-colors">Codebase Structure</a></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== PART A: USER GUIDE ===== */}
      <div className="flex items-center gap-2 mb-2">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Part A: User Guide</h2>
      </div>
      <P>How to navigate and operate the CallQA Dashboard.</P>

      <Separator />

      {/* 1. Dashboard */}
      <Section id="dashboard">
        <H2>1. Dashboard Overview</H2>
        <P>The dashboard (<Code>/</Code>) provides a quick summary of call center quality across the last 30 days.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {[
            { icon: Phone, label: "Total Calls", desc: "Total number of calls analyzed in the period" },
            { icon: BarChart3, label: "Average Score", desc: "Mean QA percentage across all calls" },
            { icon: AlertTriangle, label: "Critical Failures", desc: "Calls with compliance violations" },
            { icon: CheckCircle2, label: "Pending Review", desc: "Calls awaiting supervisor action" },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="bg-muted/40">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-2 mt-3">
          <H3>Quality Score Trend</H3>
          <P>A line chart shows the average QA score per day over the last 30 days. A declining trend may indicate an issue with a specific agent or a rule that needs adjustment.</P>
          <H3>Flagged Calls Table</H3>
          <P>Calls with critical compliance failures are listed here. Click any Call ID to open the full detail and see exactly which rules failed.</P>
        </div>
      </Section>

      <Separator />

      {/* 2. Calls Explorer */}
      <Section id="calls-explorer">
        <H2>2. Calls Explorer</H2>
        <P>The Calls page (<Code>/calls</Code>) is a searchable, filterable table of all processed calls.</P>
        <div className="space-y-2 mt-2">
          {[
            { icon: Search, title: "Search", desc: "Filter by Call ID, agent name, or phone number." },
            { icon: SlidersHorizontal, title: "Filters", desc: "Advanced filters: date range, QA status (Passed/Average/Failed), score range, and specific failed rule." },
            { icon: ArrowRight, title: "Sorting", desc: "Click column headers (Date, Agent, Duration, Score) to sort ascending/descending." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-lg border">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <P>{desc}</P>
              </div>
            </div>
          ))}
          <P className="mt-2">Each row links to the Call Detail page. Pagination at the bottom (10, 25, or 50 per page).</P>
        </div>
      </Section>

      <Separator />

      {/* 3. Call Detail */}
      <Section id="call-detail">
        <H2>3. Call Detail</H2>
        <P>Clicking a call opens its detail page (<Code>/calls/[id]</Code>). Two-column layout:</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {[
            { icon: MessageSquare, label: "Left — Call Content", desc: "Audio player with waveform and controls. AI Summary with coaching notes. Full transcript with speaker diarization (color-coded). Caller History (previous calls from same number)." },
            { icon: ListChecks, label: "Right — Scorecard & Info", desc: "QA Scorecard: overall percentage, grade badge (Excellent/Bun/Acceptabil/Slab), per-rule X/Y pts breakdown. Call Information panel. AI Extractions (name, intent, sentiment). Flagged issues panel if applicable." },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="bg-muted/40">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-medium text-sm">{label}</p>
                </div>
                <P>{desc}</P>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      {/* 4. Rules Engine */}
      <Section id="rules-engine">
        <H2>4. QA Rules Engine</H2>
        <P>The Rules page (<Code>/rules</Code>) is where you define and manage QA assessment criteria.</P>
        <div className="space-y-4 mt-2">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <H3>Main Prompt</H3>
            </div>
            <P>The system instruction sent to the AI before every analysis. Sets context and tone. Rules below are automatically appended as numbered evaluation criteria. Edit to change how the AI approaches scoring.</P>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <H3>Rules List</H3>
            </div>
            <P>Each rule has: title, description (AI instruction), section, and maxScore. Rules are grouped by section. The total possible score is shown at the top.</P>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {[
                { icon: ListChecks, label: "Scored Rule", desc: "Has maxScore (e.g. 5 pts). AI returns score 0–maxScore + explanation." },
                { icon: Tag, label: "Extraction Rule", desc: "Has extractionKey (e.g. customer_name). AI extracts a value from transcript." },
              ].map(({ icon: Icon, label, desc }) => (
                <Card key={label} className="bg-muted/40">
                  <CardContent className="pt-3 pb-2 flex items-start gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <H3>Managing Rules</H3>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li><strong>Add:</strong> Click &quot;Add Rule&quot;. Fill in title, description, section, maxScore (or mark as extraction).</li>
              <li><strong>Edit:</strong> Click the pencil icon.</li>
              <li><strong>Delete:</strong> Click the trash icon.</li>
              <li><strong>Reorder:</strong> Use up/down arrows. Rules are evaluated in this order.</li>
              <li><strong>Enable/Disable:</strong> Toggle the switch. Disabled rules are skipped.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Separator />

      {/* 5. Settings */}
      <Section id="settings">
        <H2>5. Settings</H2>
        <P>Three settings pages configure data sources and integrations:</P>
        <div className="space-y-3 mt-2">
          {[
            { icon: Database, path: "/settings/ingestion", label: "Data Ingestion", desc: "SFTP/S3 source configuration. Remote path with $yesterday_date variable. Filename regex parser. Daily cron schedule with manual trigger." },
            { icon: Brain, path: "/settings/ai", label: "AI & Transcription", desc: "OpenRouter API key + model selection. Soniox transcription config (API key, language, custom vocabulary). Free-text Context field for every analysis prompt." },
            { icon: Webhook, path: "/settings/webhooks", label: "Export & Webhooks", desc: "Webhook endpoint for QA results. Enable/disable, retry count, custom headers. Test endpoint button." },
          ].map(({ icon: Icon, path, label, desc }) => (
            <div key={path} className="flex gap-4 p-4 rounded-lg border bg-card">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{label}</span>
                  <Code>{path}</Code>
                </div>
                <P>{desc}</P>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== PART B: TECHNICAL GUIDE ===== */}
      <Separator />
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Part B: Technical Guide</h2>
      </div>
      <P>How the system works under the hood — for developers.</P>

      <Separator />

      {/* 6. Architecture */}
      <Section id="architecture">
        <H2>6. Architecture</H2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {[
            { name: "Next.js 15", role: "Framework", note: "App Router, static export" },
            { name: "React 19", role: "UI runtime", note: "Client components with hooks" },
            { name: "Tailwind CSS", role: "Styling", note: "Utility-first, CSS variables" },
            { name: "shadcn/ui", role: "Components", note: "Radix primitives, customizable" },
            { name: "Recharts", role: "Charts", note: "Score trend line chart" },
            { name: "Soniox", role: "Transcription", note: "STT with speaker diarization" },
            { name: "OpenRouter", role: "LLM gateway", note: "Claude, GPT-4o, Gemini, etc." },
          ].map(({ name, role, note }) => (
            <div key={name} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{name}</span>
                  <Badge variant="outline" className="text-xs">{role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
              </div>
            </div>
          ))}
        </div>
        <P className="mt-2">Static export via <Code>output: &quot;export&quot;</Code>. Dynamic routes use <Code>generateStaticParams</Code>. All data mutations currently use mock server actions.</P>
      </Section>

      <Separator />

      {/* 7. Data Flow */}
      <Section id="data-flow">
        <H2>7. Data Flow</H2>
        <P>End-to-end processing pipeline:</P>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 mb-4">
          {[
            { icon: FileAudio, label: "Ingestion", desc: "SFTP / S3 → audio files" },
            { icon: Cpu, label: "Transcription", desc: "Soniox STT + diarization" },
            { icon: Brain, label: "AI Analysis", desc: "LLM scores each QA rule" },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} className="bg-muted/40">
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ol className="space-y-3">
          <Step step="1" title="File Discovery" body="At cron hour, connect to SFTP/S3, list audio files, queue new ones not in database." />
          <Step step="2" title="Metadata Extraction" body="Match filename against regex. Extract phone, date, time from named capture groups." />
          <Step step="3" title="Transcription" body="Send audio to Soniox. Get transcript with speaker diarization. Custom vocabulary improves accuracy." />
          <Step step="4" title="LLM Analysis" body="Build prompt: main prompt + context + transcript + rules. LLM returns structured JSON scorecard." />
          <Step step="5" title="Score Calculation & Storage" body="Parse scorecard, calculate scores, store results. Send webhook if configured." />
        </ol>
      </Section>

      <Separator />

      {/* 8. QA Rules System */}
      <Section id="qa-rules-system">
        <H2>8. QA Rules System</H2>
        <P>Two rule types. All return structured JSON — no separate output type field.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <H3>Scored Rules</H3>
            </div>
            <P>Have a <Code>maxScore</Code> (2–5 pts). AI evaluates and returns score 0 to maxScore + explanation.</P>
            <div className="mt-2 bg-muted rounded-lg p-2 font-mono text-xs">
              {"{ ruleId: \"rule-001\", score: 2, maxScore: 2, details: \"Agent greeted...\" }"}
            </div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-blue-500" />
              <H3>Extraction Rules</H3>
            </div>
            <P>Have <Code>extractionKey</Code> (snake_case), no maxScore. AI extracts a value from transcript.</P>
            <div className="mt-2 bg-muted rounded-lg p-2 font-mono text-xs">
              {"{ extractionKey: \"customer_name\", value: \"Ion Popescu\" }"}
            </div>
          </div>
        </div>
        <P className="mt-3">Rules organized into sections with Romanian/English names. <Code>order</Code> field controls evaluation sequence.</P>
      </Section>

      <Separator />

      {/* 9. Scoring */}
      <Section id="scoring">
        <H2>9. Scoring &amp; Grades</H2>
        <P>Overall score is a percentage:</P>
        <div className="bg-muted rounded-lg p-3 font-mono text-xs mt-1 mb-3">
          percentage = (sum of rule scores) / (sum of rule maxScores) × 100
        </div>
        <P>Only scored rules contribute. Extraction rules excluded.</P>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { label: "Excellent", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800", range: "≥ 90%" },
            { label: "Good (Bun)", color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800", range: "75–89%" },
            { label: "Acceptable", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800", range: "60–74%" },
            { label: "Poor (Slab)", color: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800", range: "&lt; 60%" },
          ].map(({ label, color, range }) => (
            <div key={label} className={`p-3 rounded-lg border flex-1 min-w-[120px] ${color}`}>
              <p className="text-sm font-bold">{label}</p>
              <p className="text-xs">{range}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Critical Failures → Instant Poor</p>
          </div>
          <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-0.5">
            <li>Factually incorrect product/pricing information</li>
            <li>PII mishandling</li>
            <li>Failure to escalate when clearly needed</li>
            <li>Rude, aggressive, or inappropriate language</li>
          </ul>
        </div>
      </Section>

      <Separator />

      {/* 10. API Endpoint */}
      <Section id="api-endpoint">
        <H2>10. API Endpoint</H2>
        <P><Code>POST /api/analyze</Code> — takes transcript + rules, calls LLM via OpenRouter, returns scorecard.</P>
        <div className="space-y-3 mt-2">
          <div className="p-4 rounded-lg border">
            <H3>Request Body</H3>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto mt-1 whitespace-pre">{"{\n  \"transcript\": [\n    { \"speaker\": \"speaker_0\", \"timestamp\": 0, \"text\": \"Bună ziua...\" }\n  ],\n  \"rules\": [ /* QARule[] */ ],\n  \"mainPrompt\": \"You are a QA analyst...\"\n}"}</div>
          </div>
          <div className="p-4 rounded-lg border">
            <H3>Response</H3>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto mt-1 whitespace-pre">{"{\n  \"summary\": \"Overall assessment...\",\n  \"improvementAdvice\": [\"Practice active listening...\"],\n  \"grade\": \"Good\",\n  \"overallScore\": 78.5,\n  \"totalEarned\": 78,\n  \"totalPossible\": 100,\n  \"results\": [\n    { \"ruleId\": \"rule-001\", \"passed\": true, \"score\": 2, \"maxScore\": 2, \"details\": \"...\" }\n  ],\n  \"hasCriticalFailure\": false\n}"}</div>
          </div>
          <P>Requires <Code>OPENROUTER_API_KEY</Code> env var. Returns 400/429/500 for errors.</P>
        </div>
      </Section>

      <Separator />

      {/* 11. Prompt Structure */}
      <Section id="prompt-structure">
        <H2>11. Prompt Structure</H2>
        <P>Single LLM prompt assembled from four parts:</P>
        <div className="space-y-2 mt-2">
          {[
            { step: "1", title: "Main Prompt", body: "System instruction from /rules page. Sets evaluator persona." },
            { step: "2", title: "Evaluation Criteria", body: "Each enabled scored rule as: \"N. [ID] [maxScore: X] Title — Description\". Extraction rules listed separately with keys." },
            { step: "3", title: "Transcript", body: "Formatted: \"[speaker_0 @ 0s]: Bună ziua...\"" },
            { step: "4", title: "Output Format", body: "Instructions to return ONLY valid JSON with summary, improvementAdvice, per-rule results, grade." },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-muted-foreground">
                {step}
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <P>{body}</P>
              </div>
            </div>
          ))}
        </div>
        <P className="mt-2">Server parses JSON, handles markdown fences, validates structure, recalculates grade server-side. Temperature: 0.1.</P>
      </Section>

      <Separator />

      {/* 12. Production Migration */}
      <Section id="production">
        <H2>12. Production Migration</H2>
        <P>Current state: all mock data, no real API calls for storage.</P>
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">Steps to go live:</p>
          <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
            <li>Replace <Code>src/lib/actions.ts</Code> stubs with real database writes</li>
            <li>Replace mock data in <Code>src/lib/mockData.ts</Code> with data-fetching functions</li>
            <li>Implement ingestion pipeline (SFTP/S3 → Soniox → DB)</li>
            <li>Connect <Code>/api/analyze</Code> to real transcripts from DB</li>
            <li>Set env vars: <Code>OPENROUTER_API_KEY</Code>, <Code>SONIOX_API_KEY</Code></li>
            <li>Configure webhook endpoint for external integrations</li>
          </ol>
        </div>
        <P className="mt-2">UI components need no changes — they accept data via props/interfaces. Only the data layer swaps.</P>
      </Section>

      <Separator />

      {/* 13. Codebase */}
      <Section id="codebase">
        <H2>13. Codebase Structure</H2>
        <div className="space-y-2">
          {[
            { icon: FolderOpen, path: "src/app/", desc: "Next.js App Router pages. Each folder is a route." },
            { icon: FolderOpen, path: "src/app/api/analyze/", desc: "POST endpoint for real LLM-based QA scoring via OpenRouter." },
            { icon: FolderOpen, path: "src/app/calls/[id]/", desc: "Dynamic call detail. CallDetailClient.tsx is the interactive component." },
            { icon: FolderOpen, path: "src/components/ui/", desc: "shadcn/ui components — project-owned, edit freely." },
            { icon: FolderOpen, path: "src/components/sidebar.tsx", desc: "Main navigation. Add nav items to the navItems array." },
            { icon: GitBranch, path: "src/lib/mockData.ts", desc: "TypeScript interfaces (Call, QARule, TranscriptLine, etc.) and mock data." },
            { icon: GitBranch, path: "src/lib/actions.ts", desc: "Server actions for data mutation. Currently stubbed." },
            { icon: Layers, path: "src/lib/utils.ts", desc: "cn() for Tailwind class merging (from shadcn/ui)." },
          ].map(({ icon: Icon, path, desc }) => (
            <div key={path} className="flex gap-3 p-3 rounded-lg border">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <Code>{path}</Code>
                <P><span className="ml-1">{desc}</span></P>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
