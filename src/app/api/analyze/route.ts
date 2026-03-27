// ============================================================
// POST /api/analyze — Real LLM-based QA scoring via OpenRouter
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import type { TranscriptLine, QARule } from "@/lib/mockData";

interface AnalyzeRequest {
  transcript: TranscriptLine[];
  rules: QARule[];
  mainPrompt: string;
}

interface RuleResult {
  ruleId: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
  extractedValue?: string;
}

interface AnalyzeResponse {
  summary: string;
  improvementAdvice: string[];
  grade: "Excellent" | "Good" | "Acceptable" | "Poor";
  overallScore: number; // 0-100 percentage
  totalEarned: number;
  totalPossible: number;
  results: RuleResult[];
  hasCriticalFailure: boolean;
  criticalFailureReason?: string;
}

function calculateGrade(
  percentage: number,
  hasCriticalFailure: boolean
): "Excellent" | "Good" | "Acceptable" | "Poor" {
  if (hasCriticalFailure) return "Poor";
  if (percentage >= 90) return "Excellent";
  if (percentage >= 75) return "Good";
  if (percentage >= 60) return "Acceptable";
  return "Poor";
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { transcript, rules, mainPrompt } = body;

  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json({ error: "transcript is required and must be non-empty." }, { status: 400 });
  }
  if (!rules || !Array.isArray(rules)) {
    return NextResponse.json({ error: "rules array is required." }, { status: 400 });
  }

  // Format transcript as readable text
  const transcriptText = transcript
    .map((line) => `[${line.speaker} @ ${line.timestamp}s]: ${line.text}`)
    .join("\n");

  // Separate scoring rules from extraction rules
  const scoringRules = rules.filter(
    (r) => r.enabled && r.expectedOutput !== "extraction"
  );
  const extractionRules = rules.filter(
    (r) => r.enabled && r.expectedOutput === "extraction" && r.extractionKey
  );

  // Build the evaluation criteria
  const criteriaLines = scoringRules.map((rule, idx) => {
    const maxScore = rule.maxScore ?? 0;
    if (rule.expectedOutput === "boolean") {
      return `${idx + 1}. [ID: ${rule.id}] [boolean] [maxScore: ${maxScore}] ${rule.title} — ${rule.description}`;
    } else {
      return `${idx + 1}. [ID: ${rule.id}] [text] [maxScore: ${maxScore}] ${rule.title} — ${rule.description}`;
    }
  });

  const extractionLines = extractionRules.map((rule, idx) => {
    return `E${idx + 1}. [ID: ${rule.id}] [extraction: ${rule.extractionKey}] ${rule.title} — ${rule.description}`;
  });

  const totalPossible = scoringRules.reduce((sum, r) => sum + (r.maxScore ?? 0), 0);

  const systemPrompt = `${mainPrompt}

TRANSCRIPT:
${transcriptText}

EVALUATION CRITERIA (scoring rules):
${criteriaLines.join("\n")}

EXTRACTION RULES:
${extractionLines.join("\n")}

CRITICAL FAILURE CONDITIONS (any of these = instant "Poor" grade):
- Gave factually incorrect product/pricing information
- Mishandled PII (leaked or misused sensitive data)
- Did not escalate when clearly needed
- Was rude, aggressive, or used inappropriate language

Return ONLY a JSON object with this exact structure (no markdown fences, no explanation):
{
  "summary": "string — overall call quality summary in Romanian (2-3 sentences)",
  "improvementAdvice": ["string", ...] — up to 4 specific improvement tips in Romanian,
  "hasCriticalFailure": boolean,
  "criticalFailureReason": "string or null — describe the critical failure if applicable",
  "results": [
    {
      "ruleId": "rule-001",
      "passed": true,
      "score": 2,
      "maxScore": 2,
      "details": "string — brief explanation in Romanian"
    },
    ...one entry per scoring rule in the same order as provided...
  ],
  "extractions": {
    "customer_name": "string or N/A",
    "intent": "string or N/A",
    "sentiment": "string or N/A"
    ... one key per extraction rule's extractionKey ...
  }
}

Rules for scoring:
- boolean rules: score must be 0 (failed) or maxScore (passed)
- text rules: score can be any integer from 0 to maxScore (partial credit allowed)
- passed = true if score > 0
- Be objective and base assessment only on what is explicitly stated in the transcript`;

  // Call OpenRouter API
  let llmResponseText: string;
  try {
    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/telerenta/call-center-dashboard",
        "X-Title": "Telerenta QA Dashboard",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        temperature: 0.1,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
      }),
    });

    if (!openRouterRes.ok) {
      const errText = await openRouterRes.text();
      console.error("[analyze] OpenRouter error:", openRouterRes.status, errText);
      return NextResponse.json(
        { error: `OpenRouter API error: ${openRouterRes.status}` },
        { status: 502 }
      );
    }

    const openRouterData = await openRouterRes.json();
    llmResponseText = openRouterData.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[analyze] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach OpenRouter API." },
      { status: 502 }
    );
  }

  // Parse LLM JSON response
  let llmJson: {
    summary: string;
    improvementAdvice: string[];
    hasCriticalFailure: boolean;
    criticalFailureReason?: string | null;
    results: Array<{
      ruleId: string;
      passed: boolean;
      score: number;
      maxScore: number;
      details: string;
    }>;
    extractions: Record<string, string>;
  };

  try {
    const cleaned = stripMarkdownFences(llmResponseText);
    llmJson = JSON.parse(cleaned);
  } catch (err) {
    console.error("[analyze] Failed to parse LLM response:", llmResponseText, err);
    return NextResponse.json(
      { error: "LLM returned invalid JSON.", raw: llmResponseText },
      { status: 502 }
    );
  }

  // Validate and compute totals
  const results: RuleResult[] = [];
  let totalEarned = 0;

  for (const rule of scoringRules) {
    const llmResult = llmJson.results?.find((r) => r.ruleId === rule.id);
    const maxScore = rule.maxScore ?? 0;

    if (!llmResult) {
      // Missing from LLM response — default to 0
      results.push({
        ruleId: rule.id,
        passed: false,
        score: 0,
        maxScore,
        details: "Nu a putut fi evaluat.",
      });
      continue;
    }

    // Clamp score to valid range
    const score = Math.max(0, Math.min(maxScore, Math.round(llmResult.score ?? 0)));
    // For boolean rules, score must be 0 or maxScore
    const finalScore = rule.expectedOutput === "boolean"
      ? (score > 0 ? maxScore : 0)
      : score;

    totalEarned += finalScore;

    results.push({
      ruleId: rule.id,
      passed: finalScore > 0,
      score: finalScore,
      maxScore,
      details: llmResult.details ?? "",
    });
  }

  // Add extraction results
  for (const rule of extractionRules) {
    const extractedValue = llmJson.extractions?.[rule.extractionKey!] ?? "N/A";
    results.push({
      ruleId: rule.id,
      passed: extractedValue !== "N/A",
      score: 0,
      maxScore: 0,
      details: extractedValue !== "N/A" ? `Extras: ${extractedValue}` : "Nu s-a putut extrage.",
      extractedValue,
    });
  }

  const overallScore = totalPossible > 0
    ? Math.round((totalEarned / totalPossible) * 100)
    : 0;

  // Server-side grade as safety net
  const grade = calculateGrade(overallScore, llmJson.hasCriticalFailure ?? false);

  const response: AnalyzeResponse = {
    summary: llmJson.summary ?? "",
    improvementAdvice: llmJson.improvementAdvice ?? [],
    grade,
    overallScore,
    totalEarned,
    totalPossible,
    results,
    hasCriticalFailure: llmJson.hasCriticalFailure ?? false,
    criticalFailureReason: llmJson.criticalFailureReason ?? undefined,
  };

  return NextResponse.json(response);
}
