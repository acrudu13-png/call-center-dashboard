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
  Star,
  FileAudio,
  Cpu,
  FolderOpen,
} from "lucide-react";

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-4">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">
      {children}
    </code>
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
          Overview of the CallQA dashboard — what it does, how it&apos;s structured, and how to navigate the codebase.
        </p>
      </div>

      <Separator />

      {/* TOC */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
            <li><a href="#overview" className="hover:text-foreground transition-colors">What is CallQA?</a></li>
            <li><a href="#stack" className="hover:text-foreground transition-colors">Tech Stack</a></li>
            <li><a href="#pages" className="hover:text-foreground transition-colors">Pages & Navigation</a></li>
            <li><a href="#pipeline" className="hover:text-foreground transition-colors">Call Processing Pipeline</a></li>
            <li><a href="#rules" className="hover:text-foreground transition-colors">QA Rules Engine</a></li>
            <li><a href="#scoring" className="hover:text-foreground transition-colors">Scoring & Status</a></li>
            <li><a href="#extractions" className="hover:text-foreground transition-colors">AI Extractions</a></li>
            <li><a href="#ingestion" className="hover:text-foreground transition-colors">Data Ingestion</a></li>
            <li><a href="#codebase" className="hover:text-foreground transition-colors">Codebase Structure</a></li>
          </ol>
        </CardContent>
      </Card>

      {/* 1. Overview */}
      <Section id="overview">
        <H2>1. What is CallQA?</H2>
        <P>
          CallQA is an enterprise-grade call center QA (Quality Assurance) analytics dashboard built for telecom support operations.
          Its purpose is to automate the assessment of customer service call recordings using AI — replacing or augmenting manual QA
          processes where a supervisor listens to calls and scores them by hand.
        </P>
        <P>
          The system ingests audio recordings from an SFTP server (or S3 bucket), transcribes them using Soniox (a speech-to-text engine
          with speaker diarization), and then sends the transcript to a large language model (via OpenRouter) along with a configurable
          set of QA rules. The LLM returns a structured JSON scorecard that is stored and displayed in this dashboard.
        </P>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
      </Section>

      <Separator />

      {/* 2. Stack */}
      <Section id="stack">
        <H2>2. Tech Stack</H2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: "Next.js 15", role: "Framework", note: "App Router, static export (output: export)" },
            { name: "React 19", role: "UI runtime", note: "Client components with hooks" },
            { name: "Tailwind CSS", role: "Styling", note: "Utility-first, CSS variables for theming" },
            { name: "shadcn/ui", role: "Component library", note: "Radix primitives, fully customisable" },
            { name: "Recharts", role: "Charts", note: "Score trend line chart on dashboard" },
            { name: "Lucide React", role: "Icons", note: "Consistent icon set across all pages" },
            { name: "Soniox", role: "Transcription", note: "STT engine with speaker diarization" },
            { name: "OpenRouter", role: "LLM gateway", note: "Routes to Claude, GPT-4o, Gemini, etc." },
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
        <P>
          The app is configured with <Code>output: &quot;export&quot;</Code> in <Code>next.config.ts</Code>, meaning it builds to a
          static HTML/JS bundle with no Node.js server required at runtime. All data mutation currently uses mock server actions
          (simulated delays, no real database). Dynamic routes like <Code>/calls/[id]</Code> require <Code>generateStaticParams</Code>
          to enumerate all possible IDs at build time.
        </P>
      </Section>

      <Separator />

      {/* 3. Pages */}
      <Section id="pages">
        <H2>3. Pages & Navigation</H2>
        <div className="space-y-3">
          {[
            {
              icon: LayoutDashboard,
              path: "/",
              label: "Dashboard",
              desc: "Top-level summary: total calls, average QA score, critical failures, and a 30-day score trend chart. Shows a flagged calls table requiring supervisor review.",
            },
            {
              icon: Phone,
              path: "/calls",
              label: "Calls Explorer",
              desc: "Paginated, filterable table of all processed calls. Filters: date range, QA status (Passed / Average / Failed), score range, and failed rule. Each row links to the call detail page.",
            },
            {
              icon: Phone,
              path: "/calls/[id]",
              label: "Call Detail",
              desc: "Shows the audio player (simulated waveform), full transcript with speaker diarization (Speaker 1, 2…), the AI QA scorecard broken down by rule, and the Call Information panel including AI-extracted fields.",
            },
            {
              icon: ClipboardCheck,
              path: "/rules",
              label: "QA Rules Engine",
              desc: "CRUD interface for QA assessment rules. Each rule has a title, description (the LLM instruction), weight (critical / moderate / bonus), and output type (boolean, text, or extraction). Rules are ordered and the enabled set is appended to the main prompt before each analysis.",
            },
            {
              icon: Database,
              path: "/settings/ingestion",
              label: "Data Ingestion",
              desc: "Configure SFTP / S3 source. The SFTP remote path supports the $yesterday_date variable. The File Parsing tab defines a regex with named capture groups (phone, date, time) for extracting metadata from filenames. The Schedule tab sets a daily cron hour and provides a manual Check Now trigger.",
            },
            {
              icon: Brain,
              path: "/settings/ai",
              label: "AI & Transcription",
              desc: "OpenRouter API key and model selection (Claude, GPT-4o, Gemini, etc.), temperature, max tokens. Soniox API key, language, and model. Custom vocabulary for domain-specific terms. A free-text Context field injected into every analysis prompt to describe the call center environment.",
            },
            {
              icon: Webhook,
              path: "/settings/webhooks",
              label: "Export & Webhooks",
              desc: "Configure a webhook endpoint to receive QA results after each call is processed. Supports enable/disable toggle, retry count, and custom Authorization header. Includes a test endpoint button and a sample JSON payload preview.",
            },
            {
              icon: BookOpen,
              path: "/docs",
              label: "Documentation",
              desc: "This page. Overview of the system for developers and QA engineers.",
            },
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

      <Separator />

      {/* 4. Pipeline */}
      <Section id="pipeline">
        <H2>4. Call Processing Pipeline</H2>
        <P>
          The intended end-to-end flow for a production deployment is:
        </P>
        <ol className="space-y-3 mt-2">
          {[
            {
              step: "1",
              title: "File Discovery",
              body: "At the configured cron hour, the system connects to the SFTP server and lists audio files in the resolved remote path (e.g. /tlr-cs-recordings/2026-03-25). New files not yet in the database are queued.",
            },
            {
              step: "2",
              title: "Metadata Extraction",
              body: "The filename is matched against the configured regex. Named capture groups extract the customer phone number, call date, and call time. Example: Telerenta_..._N+40758423232_..._2026-03-25_11-57-14.au → phone: +40758423232, date: 2026-03-25, time: 11:57:14.",
            },
            {
              step: "3",
              title: "Transcription",
              body: "The audio file is sent to the Soniox API. Soniox returns a transcript with speaker diarization — each segment is tagged with a speaker ID (speaker_0, speaker_1, …). The custom vocabulary list improves accuracy for domain-specific terms.",
            },
            {
              step: "4",
              title: "LLM Analysis",
              body: "The transcript is embedded into a prompt: [Main Prompt] + [Context] + [Call Transcript] + [Enabled QA Rules]. The LLM is instructed to return a structured JSON scorecard with pass/fail/extracted values for each rule.",
            },
            {
              step: "5",
              title: "Score Calculation & Storage",
              body: "The scorecard is parsed. Critical failures reduce the score heavily. Results are stored and made available in the dashboard. If a webhook is configured, a POST is sent to the endpoint.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <H3>{title}</H3>
                <P>{body}</P>
              </div>
            </div>
          ))}
        </ol>
      </Section>

      <Separator />

      {/* 5. Rules */}
      <Section id="rules">
        <H2>5. QA Rules Engine</H2>
        <P>
          Rules are defined in <Code>/rules</Code> and stored in state (mock) or a database (production). Each rule has:
        </P>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {[
            {
              icon: AlertTriangle,
              label: "Critical",
              color: "text-red-500",
              desc: "Failing this rule significantly lowers the overall score and triggers a compliance failure flag.",
            },
            {
              icon: CheckCircle2,
              label: "Moderate",
              color: "text-yellow-500",
              desc: "Failing reduces score but does not trigger a compliance failure. Improvement is recommended.",
            },
            {
              icon: Star,
              label: "Bonus",
              color: "text-blue-500",
              desc: "Optional quality indicator (e.g. upsell attempt). Passing adds to the score.",
            },
          ].map(({ icon: Icon, label, color, desc }) => (
            <Card key={label} className="bg-muted/40">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <P>{desc}</P>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          <H3>Output Types</H3>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0 mt-0.5">Boolean</Badge>
              <P>Pass or Fail. The LLM returns <Code>true</Code> / <Code>false</Code> for the rule. Shown as a green checkmark or red X in the scorecard.</P>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0 mt-0.5">Text</Badge>
              <P>The LLM returns a short descriptive answer. Used for rules like &quot;Product Knowledge Accuracy&quot; where a simple pass/fail is insufficient.</P>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Badge variant="secondary" className="shrink-0 mt-0.5 font-mono text-xs">→ key</Badge>
              <P>
                Extraction. The LLM extracts a specific value from the transcript (e.g. customer name, intent, sentiment) and stores it under an <Code>extraction_key</Code>.
                Extracted values are visible in the <strong>Call Information</strong> panel on the call detail page, always shown — <Code>N/A</Code> if not found.
              </P>
            </div>
          </div>
        </div>
      </Section>

      <Separator />

      {/* 6. Scoring */}
      <Section id="scoring">
        <H2>6. Scoring & Status</H2>
        <P>
          Each call receives an overall QA score from 0–100. The score is computed by the LLM based on the weight of each rule:
          critical failures have the highest penalty, moderate rules have a medium penalty, and bonus rules reward good performance.
        </P>
        <div className="flex flex-wrap gap-3 mt-2">
          {[
            { label: "Passed", variant: "default" as const, range: "Score ≥ 85", desc: "Meets quality standards" },
            { label: "Average", variant: "secondary" as const, range: "Score 70–84", desc: "Needs improvement" },
            { label: "Failed", variant: "destructive" as const, range: "Score < 70", desc: "Below acceptable threshold" },
          ].map(({ label, variant, range, desc }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg border flex-1 min-w-[180px]">
              <Badge variant={variant}>{label}</Badge>
              <div>
                <p className="text-sm font-medium">{range}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <P>
          Status is displayed in both the Calls Explorer table and the Call Detail page header. It is derived purely from the
          QA score — the internal <Code>status</Code> field on a call (completed, flagged, in_review, processing) represents
          the workflow state and is separate.
        </P>
      </Section>

      <Separator />

      {/* 7. Extractions */}
      <Section id="extractions">
        <H2>7. AI Extractions</H2>
        <P>
          Extraction rules allow the LLM to pull structured data fields out of the transcript rather than just evaluating compliance.
          Three extraction rules ship by default:
        </P>
        <div className="space-y-2 mt-1">
          {[
            { key: "customer_name", title: "Customer Name Extraction", desc: "The customer's full name if identified during verification." },
            { key: "intent", title: "Customer Intent Classification", desc: "The primary call reason: billing dispute, plan change, technical issue, etc." },
            { key: "sentiment", title: "Customer Sentiment", desc: "The customer's overall emotional tone: satisfied, neutral, frustrated, angry." },
          ].map(({ key, title, desc }) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-lg border">
              <Tag className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{title}</span>
                  <Code>{key}</Code>
                </div>
                <P>{desc}</P>
              </div>
            </div>
          ))}
        </div>
        <P>
          Custom extraction rules can be added in the QA Rules Engine by choosing <strong>Extraction</strong> as the output type
          and providing a snake_case key. The extracted values are always shown in the Call Information panel — displaying
          <Code>N/A</Code> when the LLM could not find the value in the transcript.
        </P>
      </Section>

      <Separator />

      {/* 8. Ingestion */}
      <Section id="ingestion">
        <H2>8. Data Ingestion</H2>
        <div className="space-y-4">
          <div className="space-y-1">
            <H3>Remote Path Variable</H3>
            <P>
              The SFTP remote path supports the <Code>$yesterday_date</Code> variable, which resolves to the previous
              day&apos;s date in <Code>YYYY-MM-DD</Code> format at runtime. This matches the upload convention where recordings
              for a given day are placed in a folder named after that day (e.g. <Code>/tlr-cs-recordings/2026-03-25</Code>)
              and uploaded the following morning at 04:00.
            </P>
          </div>
          <div className="space-y-1">
            <H3>Filename Parser</H3>
            <P>
              A regex with named capture groups extracts metadata directly from audio filenames. The default pattern targets the
              Telerenta filename format:
            </P>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs overflow-x-auto">
              Telerenta_1777723443827-43242343_N+40758423232_N210-R207_2026-03-25_11-57-14.au
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-1">
              <div className="p-2 rounded border"><span className="font-mono text-blue-600">+40758423232</span><br /><span className="text-muted-foreground">phone (<Code>{"(?<phone>...)"}</Code>)</span></div>
              <div className="p-2 rounded border"><span className="font-mono text-green-600">2026-03-25</span><br /><span className="text-muted-foreground">date (<Code>{"(?<date>...)"}</Code>)</span></div>
              <div className="p-2 rounded border"><span className="font-mono text-rose-600">11:57:14</span><br /><span className="text-muted-foreground">time (<Code>{"(?<time>...)"}</Code>)</span></div>
            </div>
          </div>
          <div className="space-y-1">
            <H3>Schedule</H3>
            <P>
              A configurable daily cron hour determines when the system checks for new folders. A <strong>Check Now</strong> button
              on the Schedule tab allows manual triggering outside the scheduled window.
            </P>
          </div>
        </div>
      </Section>

      <Separator />

      {/* 9. Codebase */}
      <Section id="codebase">
        <H2>9. Codebase Structure</H2>
        <div className="space-y-3">
          {[
            {
              icon: FolderOpen,
              path: "src/app/",
              desc: "Next.js App Router pages. Each folder is a route. layout.tsx at the root wraps all pages with the Sidebar.",
            },
            {
              icon: FolderOpen,
              path: "src/app/calls/[id]/",
              desc: "Dynamic call detail route. page.tsx exports generateStaticParams (required for output: export). CallDetailClient.tsx is the interactive client component.",
            },
            {
              icon: FolderOpen,
              path: "src/components/ui/",
              desc: "shadcn/ui components. These are owned by the project — edit freely. Do not import from an external package.",
            },
            {
              icon: FolderOpen,
              path: "src/components/sidebar.tsx",
              desc: "Main navigation sidebar. Add new nav items to the navItems array.",
            },
            {
              icon: GitBranch,
              path: "src/lib/mockData.ts",
              desc: "All TypeScript interfaces (Call, QARule, TranscriptLine, etc.) and generated mock data. In production this would be replaced by API/database calls.",
            },
            {
              icon: GitBranch,
              path: "src/lib/actions.ts",
              desc: "Server actions for all data mutation (save settings, save rules, etc.). Currently stubbed with simulated delays. In production, replace with real database writes.",
            },
            {
              icon: Layers,
              path: "src/lib/utils.ts",
              desc: "Utility functions. Contains cn() for conditional Tailwind class merging (from shadcn/ui).",
            },
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

        <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800 mb-1">Mock vs. Production</p>
          <p className="text-sm text-amber-700">
            The entire dashboard currently runs on generated mock data. No real API calls are made. To wire up a real backend,
            replace the contents of <Code>src/lib/actions.ts</Code> with actual database/API calls, and replace the mock data
            exports in <Code>src/lib/mockData.ts</Code> with data-fetching functions. The UI components and page structure
            require no changes.
          </p>
        </div>
      </Section>
    </div>
  );
}
