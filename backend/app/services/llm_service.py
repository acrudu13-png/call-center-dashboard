import asyncio
import json
import logging
from typing import Optional
import httpx
from app.schemas.setting import LlmSettings, ClassificationSettings
from app.schemas.call import AnalyzeResponse, ScorecardEntrySchema

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

DEFAULT_MAIN_PROMPT = """Ești un evaluator QA pentru un call center de telecomunicații din România.
Analizează transcriptul apelului și evaluează FIECARE regulă din lista de mai jos.

REGULI STRICTE:
1. PRIMUL LUCRU: determină dacă apelul este eligibil pentru evaluare (isEligible).
   Setează isEligible=false și ineligibleReason dacă:
   - Apelul este un mesaj vocal / voicemail / robot telefonic
   - Apelul este prea scurt pentru a fi evaluat (sub 10 secunde de conversație reală)
   - Nu există o interacțiune reală între agent și client
   - Clientul a închis înainte de a vorbi cu agentul
   În aceste cazuri, pune toate scorurile pe 0 și grade="Slab".
2. Identifică cine este agentul și cine este clientul din transcript.
   Returnează speakerMap: un obiect care mapează ID-ul vorbitorului (ex: "speaker_0") la numele sau rolul său.
   Folosește numele agentului furnizat. Pentru client, folosește "Client" sau numele dacă se prezintă.
3. Evaluează TOATE regulile — nu sări niciuna.
4. Returnează regulile în EXACT aceeași ordine.
5. Folosește EXACT ruleId și ruleTitle furnizate.
6. Pentru reguli de scoring: score între 0 și maxScore. passed=true dacă score >= maxScore*0.6.
7. Pentru reguli de extraction: extractedValue = valoarea extrasă, score=0, maxScore=0.
8. overallScore = (totalEarned / totalPossible) * 100.
9. grade: "Excelent" >= 90, "Bun" >= 75, "Acceptabil" >= 60, "Slab" < 60.
10. hasCriticalFailure = true dacă orice regulă critică are passed=false.

Răspunde DOAR cu JSON valid."""


def _build_schema_for_rules(rules: list[dict], speaker_ids: list[str] | None = None) -> dict:
    """Build a JSON schema with a fixed-length results array matching the exact rules."""
    total_possible = sum(r["max_score"] for r in rules)

    # Build a detailed description listing every rule with its expected values
    rules_desc = "\n".join(
        f"  [{i+1}] ruleId=\"{r['rule_id']}\", ruleTitle=\"{r['title']}\", maxScore={r['max_score']}, type={r['rule_type']}"
        for i, r in enumerate(rules)
    )

    rule_ids = [r["rule_id"] for r in rules]
    rule_max_scores = {r["rule_id"]: r["max_score"] for r in rules}

    return {
        "name": "call_analysis",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Call summary in Romanian"},
                "improvementAdvice": {"type": "array", "items": {"type": "string"}, "description": "1-4 improvement suggestions in Romanian"},
                "grade": {"type": "string", "enum": ["Excelent", "Bun", "Acceptabil", "Slab"]},
                "overallScore": {"type": "number", "description": f"(totalEarned / {total_possible}) * 100"},
                "totalEarned": {"type": "number", "description": "Sum of all scoring rule scores"},
                "totalPossible": {"type": "number", "description": f"Must be exactly {total_possible}"},
                "results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "ruleId": {"type": "string", "enum": rule_ids, "description": "Exact rule ID from the list"},
                            "ruleTitle": {"type": "string"},
                            "passed": {"type": "boolean", "description": "true if score >= maxScore * 0.6"},
                            "score": {"type": "number", "description": "0 to maxScore for this rule"},
                            "maxScore": {"type": "number", "description": f"Must match the rule definition. Values: {rule_max_scores}"},
                            "details": {"type": "string", "description": "Short explanation in Romanian"},
                            "extractedValue": {"type": ["string", "null"]},
                        },
                        "required": ["ruleId", "ruleTitle", "passed", "score", "maxScore", "details", "extractedValue"],
                        "additionalProperties": False,
                    },
                    "minItems": len(rules),
                    "maxItems": len(rules),
                    "description": f"Exactly {len(rules)} results in order:\n{rules_desc}",
                },
                "hasCriticalFailure": {"type": "boolean"},
                "criticalFailureReason": {"type": ["string", "null"]},
                "isEligible": {"type": "boolean", "description": "false if voicemail, too short, no real conversation, or client hung up before talking"},
                "ineligibleReason": {"type": ["string", "null"], "description": "Reason in Romanian why the call is not eligible for QA evaluation, or null if eligible"},
                "speakerMap": {
                    "type": "object",
                    "description": f"Map EXACT speaker IDs from the transcript to names. Keys MUST be from: {speaker_ids or ['speaker_0', 'speaker_1']}. Use agent name provided and 'Client' or customer name if identified.",
                    "properties": {sid: {"type": "string"} for sid in (speaker_ids or ["speaker_0", "speaker_1"])},
                    "required": speaker_ids or ["speaker_0", "speaker_1"],
                    "additionalProperties": False,
                },
            },
            "required": [
                "summary", "improvementAdvice", "grade", "overallScore",
                "totalEarned", "totalPossible", "results",
                "hasCriticalFailure", "criticalFailureReason",
                "isEligible", "ineligibleReason", "speakerMap",
            ],
            "additionalProperties": False,
        },
    }


class LLMService:
    """Handles LLM-based QA scoring via OpenRouter."""

    def __init__(self, settings: LlmSettings):
        self.settings = settings

    async def classify_call(
        self,
        transcript: list[dict],
        call_types: list[dict],
        agent_name: Optional[str] = None,
        classification_settings: Optional[ClassificationSettings] = None,
    ) -> tuple[str, dict]:
        """Classify the call type. Returns (key, debug_info)."""
        cls_settings = classification_settings or ClassificationSettings()
        debug = {"model": cls_settings.model, "request": "", "response": "", "result": "other"}

        if not self.settings.openRouterApiKey or not call_types:
            return "other", debug

        types_text = "\n".join(
            f"- {ct['key']}: {ct['name']} — {ct['description']}"
            for ct in call_types
        )

        short_transcript = "\n".join(
            f"[{seg['timestamp']:.1f}s] {seg['speaker']}: {seg['text']}"
            for seg in transcript[:30]
        )

        keys_list = ", ".join(ct["key"] for ct in call_types)
        prompt = (
            f"Categories:\n{types_text}\n\n"
            f"Transcript:\n{short_transcript}\n\n"
            f"Which category? Reply with one of: {keys_list}"
        )

        messages = [
            {"role": "system", "content": cls_settings.prompt},
            {"role": "user", "content": prompt},
        ]

        debug["request"] = prompt

        headers = {
            "Authorization": f"Bearer {self.settings.openRouterApiKey}",
            "Content-Type": "application/json",
        }

        valid_keys = [ct["key"] for ct in call_types]
        classification_schema = {
            "name": "call_classification",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": valid_keys,
                        "description": "The category key that best matches the call",
                    },
                },
                "required": ["category"],
                "additionalProperties": False,
            },
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    response = await client.post(
                        OPENROUTER_URL,
                        headers=headers,
                        json={
                            "model": cls_settings.model,
                            "messages": messages,
                            "temperature": cls_settings.temperature,
                            "max_completion_tokens": 2000,
                            "response_format": {
                                "type": "json_schema",
                                "json_schema": classification_schema,
                            },
                        },
                    )
                    debug["http_status"] = str(response.status_code)
                    debug["raw_body"] = response.text[:2000]
                    if response.status_code != 200:
                        debug["response"] = f"ERROR HTTP {response.status_code}: {response.text[:500]}"
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1)
                            continue
                        return "other", debug
                    data = response.json()
                    choice = data.get("choices", [{}])[0]
                    finish_reason = choice.get("finish_reason", "")
                    message = choice.get("message", {})
                    content = message.get("content") or ""
                    debug["content"] = repr(content)
                    debug["finish_reason"] = finish_reason

                    if not content or finish_reason == "length":
                        logger.warning(f"Classification attempt {attempt + 1}: empty content or truncated (finish_reason={finish_reason})")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1)
                            continue
                        return "other", debug

                    try:
                        parsed = json.loads(content)
                        result = parsed.get("category", "other").lower().strip()
                    except (json.JSONDecodeError, AttributeError):
                        result = content.strip().lower().strip('"').strip("'").strip()

                    valid_keys_set = {ct["key"] for ct in call_types}
                    if result in valid_keys_set:
                        debug["result"] = result
                        debug["attempt"] = attempt + 1
                        return result, debug
                    for key in valid_keys_set:
                        if key in result:
                            debug["result"] = key
                            debug["attempt"] = attempt + 1
                            return key, debug

                    if attempt < max_retries - 1:
                        await asyncio.sleep(1)
                        continue
                    debug["result"] = "other"
                    return "other", debug
            except Exception as e:
                logger.warning(f"Classification attempt {attempt + 1} failed: {e}")
                debug["response"] = str(e)
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                return "other", debug
        return "other", debug

    async def analyze_call(
        self,
        transcript: list[dict],
        rules: list[dict],
        main_prompt: Optional[str] = None,
        agent_name: Optional[str] = None,
        log_fn=None,
        job_id: Optional[str] = None,
        thinking_budget: Optional[int] = None,
    ) -> AnalyzeResponse:
        """
        Send transcript + rules to LLM and return structured QA analysis.
        """
        def _log(level: str, msg: str):
            logger.log(getattr(logging, level.upper(), logging.INFO), msg)
            if log_fn:
                log_fn(level, "analysis", msg, job_id)

        if not self.settings.openRouterApiKey:
            raise ValueError("OpenRouter API key is not configured.")

        prompt = main_prompt or DEFAULT_MAIN_PROMPT

        # Build rules context with numbered list so the LLM knows the exact order
        rules_text = "\n".join(
            f"{i+1}. [{r['rule_id']}] \"{r['title']}\" "
            f"(max_score={r['max_score']}, type={r['rule_type']}, "
            f"critical={r.get('is_critical', False)}): {r['description']}"
            for i, r in enumerate(rules)
        )

        # Build the expected results template so the LLM knows exactly what to fill
        results_template = "\n".join(
            f'  {i+1}. ruleId="{r["rule_id"]}", ruleTitle="{r["title"]}", maxScore={r["max_score"]}'
            for i, r in enumerate(rules)
        )

        transcript_text = "\n".join(
            f"[{seg['timestamp']:.1f}s] {seg['speaker']}: {seg['text']}"
            for seg in transcript
        )

        total_max = sum(r["max_score"] for r in rules)

        messages = [
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": (
                    f"{'AGENT: ' + agent_name + chr(10) + chr(10) if agent_name else ''}"
                    f"REGULI DE EVALUARE ({len(rules)} reguli, totalPossible={total_max}):\n{rules_text}\n\n"
                    f"ORDINEA EXACTĂ a results (trebuie {len(rules)} elemente):\n{results_template}\n\n"
                    f"IMPORTANT: totalPossible TREBUIE să fie exact {total_max}. overallScore = (totalEarned / {total_max}) * 100.\n\n"
                    f"TRANSCRIPT:\n{transcript_text}"
                ),
            },
        ]

        headers = {
            "Authorization": f"Bearer {self.settings.openRouterApiKey}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://callcenter-dashboard.local",
            "X-Title": "Call Center QA Dashboard",
        }

        payload = {
            "model": self.settings.defaultModel,
            "messages": messages,
            "temperature": self.settings.temperature,
            "max_tokens": self.settings.maxTokens,
        }

        if thinking_budget:
            payload["reasoning"] = {"effort": "high", "max_tokens": thinking_budget}
            # Extended thinking requires higher max_tokens for the response
            payload["max_tokens"] = max(self.settings.maxTokens, thinking_budget + 4096)

        # Extract unique speaker IDs from transcript to constrain the schema
        speaker_ids = sorted(set(seg["speaker"] for seg in transcript if seg.get("speaker")))

        # Build dynamic schema matching the exact rules
        dynamic_schema = _build_schema_for_rules(rules, speaker_ids=speaker_ids or None)

        # Log the full prompt being sent
        user_msg = messages[1]["content"]
        _log("info", f"=== LLM REQUEST ===\nModel: {self.settings.defaultModel}\nRules count: {len(rules)}\nPrompt length: {len(user_msg)} chars\nFirst 500 chars of user message:\n{user_msg[:500]}")

        async with httpx.AsyncClient(timeout=120) as client:
            _log("info", f"Sending analysis request to OpenRouter ({self.settings.defaultModel}) with {len(rules)} rules...")

            # Attempt 1: json_schema (structured output)
            mode_used = "json_schema"
            payload_with_schema = {
                **payload,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": dynamic_schema,
                },
            }
            response = await client.post(
                OPENROUTER_URL, headers=headers, json=payload_with_schema
            )

            if response.status_code == 400:
                # Attempt 2: json_object mode (strip reasoning if present)
                mode_used = "json_object"
                logger.warning(f"json_schema failed (400): {response.text[:300]}. Falling back to json_object...")
                payload_fallback = {k: v for k, v in payload.items() if k != "reasoning"}
                payload_json_mode = {
                    **payload_fallback,
                    "response_format": {"type": "json_object"},
                }
                response = await client.post(
                    OPENROUTER_URL, headers=headers, json=payload_json_mode
                )

            if response.status_code == 400:
                # Attempt 3: plain mode (strip reasoning if present)
                mode_used = "plain"
                logger.warning(f"json_object failed (400): {response.text[:300]}. Falling back to plain...")
                payload_plain = {k: v for k, v in payload.items() if k != "reasoning"}
                response = await client.post(
                    OPENROUTER_URL, headers=headers, json=payload_plain
                )

            logger.info(f"LLM response status: {response.status_code}, mode: {mode_used}")

            if response.status_code != 200:
                error_body = response.text[:2000]
                logger.error(f"=== LLM ERROR ===\nModel: {self.settings.defaultModel}\nStatus: {response.status_code}\nMode: {mode_used}\nBody: {error_body}")
                raise ValueError(f"OpenRouter {response.status_code} ({self.settings.defaultModel}, mode={mode_used}): {error_body}")
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        logger.info(f"=== LLM RESPONSE ===\nMode: {mode_used}\nLength: {len(content)} chars\nFull response:\n{content[:3000]}")

        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            import re
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
            if match:
                result = json.loads(match.group(1))
            else:
                logger.error(f"LLM returned invalid JSON:\n{content[:2000]}")
                raise ValueError(f"LLM returned invalid JSON. Raw:\n{content[:1000]}")

        # Validate required fields — fill defaults instead of crashing
        if "summary" not in result:
            result["summary"] = "Rezumat indisponibil"
        if "improvementAdvice" not in result:
            result["improvementAdvice"] = []
        if "grade" not in result:
            result["grade"] = "Slab"
        if "overallScore" not in result:
            result["overallScore"] = 0
        if "totalEarned" not in result:
            result["totalEarned"] = 0
        if "totalPossible" not in result:
            result["totalPossible"] = sum(r["max_score"] for r in rules)
        if "results" not in result:
            result["results"] = []
        if "hasCriticalFailure" not in result:
            result["hasCriticalFailure"] = False
        if "criticalFailureReason" not in result:
            result["criticalFailureReason"] = None
        if "isEligible" not in result:
            result["isEligible"] = True
        if "ineligibleReason" not in result:
            result["ineligibleReason"] = None
        if "speakerMap" not in result:
            result["speakerMap"] = {}

        logger.info(f"LLM returned {len(result.get('results', []))} results, grade={result.get('grade')}, score={result.get('overallScore')}")

        # Validate: ensure all rules are present, fill missing ones
        result_map = {r["ruleId"]: r for r in result.get("results", [])}
        ordered_results = []
        for r in rules:
            if r["rule_id"] in result_map:
                ordered_results.append(result_map[r["rule_id"]])
            else:
                logger.warning(f"LLM missed rule {r['rule_id']}, adding default")
                ordered_results.append({
                    "ruleId": r["rule_id"],
                    "ruleTitle": r["title"],
                    "passed": False,
                    "score": 0,
                    "maxScore": r["max_score"],
                    "details": "Nu a fost evaluat de AI",
                    "extractedValue": None,
                })

        # Store the full request/response for debugging
        debug_request = json.dumps({
            "model": self.settings.defaultModel,
            "temperature": self.settings.temperature,
            "max_tokens": self.settings.maxTokens,
            "mode": mode_used,
            "system_prompt": messages[0]["content"],
            "user_message": messages[1]["content"],
            "response_format": dynamic_schema,
        }, indent=2, ensure_ascii=False)
        debug_response = content

        # Compute totals from individual scores instead of trusting LLM arithmetic
        computed_total_earned = sum(r["score"] for r in ordered_results)
        computed_total_possible = sum(r["maxScore"] for r in ordered_results)
        computed_overall_score = (computed_total_earned / computed_total_possible * 100) if computed_total_possible > 0 else 0

        return AnalyzeResponse(
            summary=result["summary"],
            improvementAdvice=result.get("improvementAdvice", [])[:4],
            grade=result["grade"],
            overallScore=computed_overall_score,
            totalEarned=computed_total_earned,
            totalPossible=computed_total_possible,
            results=[
                ScorecardEntrySchema(
                    ruleId=r["ruleId"],
                    ruleTitle=r["ruleTitle"],
                    passed=r["passed"],
                    score=r["score"],
                    maxScore=r["maxScore"],
                    details=r["details"],
                    extractedValue=r.get("extractedValue"),
                )
                for r in ordered_results
            ],
            hasCriticalFailure=result["hasCriticalFailure"],
            criticalFailureReason=result.get("criticalFailureReason"),
            isEligible=result.get("isEligible", True),
            ineligibleReason=result.get("ineligibleReason"),
            speakerMap=result.get("speakerMap", {}),
            llmRequest=debug_request,
            llmResponse=debug_response,
        )
