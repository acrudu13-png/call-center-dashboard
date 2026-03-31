import json
import logging
from typing import Optional
import httpx
from app.schemas.setting import LlmSettings
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


def _build_schema_for_rules(rules: list[dict]) -> dict:
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
                "speakerMap": {"type": "object", "description": "Map speaker IDs to names. E.g. {\"speaker_0\": \"Andra Gabor\", \"speaker_1\": \"Client\"}. Use agent name provided and 'Client' or customer name if identified.", "additionalProperties": {"type": "string"}},
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
    ) -> str:
        """Classify the call type based on transcript. Returns the call type key."""
        if not self.settings.openRouterApiKey or not call_types:
            return "other"

        types_text = "\n".join(
            f"- {ct['key']}: {ct['name']} — {ct['description']}"
            for ct in call_types
        )

        # Use only first 30 lines of transcript for speed
        short_transcript = "\n".join(
            f"[{seg['timestamp']:.1f}s] {seg['speaker']}: {seg['text']}"
            for seg in transcript[:30]
        )

        messages = [
            {"role": "system", "content": "Clasifici tipul apelului telefonic. Raspunde DOAR cu cheia tipului, nimic altceva."},
            {"role": "user", "content": (
                f"{'AGENT: ' + agent_name + chr(10) if agent_name else ''}"
                f"TIPURI DISPONIBILE:\n{types_text}\n\n"
                f"TRANSCRIPT (primele linii):\n{short_transcript}\n\n"
                f"Raspunde DOAR cu cheia tipului (ex: customer_support, sales, debt_collection, etc.):"
            )},
        ]

        headers = {
            "Authorization": f"Bearer {self.settings.openRouterApiKey}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    OPENROUTER_URL,
                    headers=headers,
                    json={
                        "model": "openai/gpt-5-nano",
                        "messages": messages,
                        "temperature": 0,
                        "max_tokens": 50,
                    },
                )
                response.raise_for_status()
                data = response.json()
                result = data["choices"][0]["message"]["content"].strip().lower()
                # Clean up — extract just the key
                result = result.strip('"').strip("'").strip()
                valid_keys = {ct["key"] for ct in call_types}
                if result in valid_keys:
                    return result
                # Try to find a match in the response
                for key in valid_keys:
                    if key in result:
                        return key
                return "other"
        except Exception as e:
            logger.warning(f"Call classification failed: {e}, defaulting to 'other'")
            return "other"

    async def analyze_call(
        self,
        transcript: list[dict],
        rules: list[dict],
        main_prompt: Optional[str] = None,
        agent_name: Optional[str] = None,
        log_fn=None,
        job_id: Optional[str] = None,
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

        # Build dynamic schema matching the exact rules
        dynamic_schema = _build_schema_for_rules(rules)

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
                # Attempt 2: json_object mode
                mode_used = "json_object"
                logger.warning(f"json_schema failed (400): {response.text[:300]}. Falling back to json_object...")
                payload_json_mode = {
                    **payload,
                    "response_format": {"type": "json_object"},
                }
                response = await client.post(
                    OPENROUTER_URL, headers=headers, json=payload_json_mode
                )

            if response.status_code == 400:
                # Attempt 3: plain mode
                mode_used = "plain"
                logger.warning(f"json_object failed (400): {response.text[:300]}. Falling back to plain...")
                response = await client.post(
                    OPENROUTER_URL, headers=headers, json=payload
                )

            logger.info(f"LLM response status: {response.status_code}, mode: {mode_used}")

            if response.status_code != 200:
                logger.error(f"=== LLM ERROR ===\nStatus: {response.status_code}\nBody: {response.text[:2000]}")

            response.raise_for_status()
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

        return AnalyzeResponse(
            summary=result["summary"],
            improvementAdvice=result.get("improvementAdvice", [])[:4],
            grade=result["grade"],
            overallScore=result["overallScore"],
            totalEarned=result["totalEarned"],
            totalPossible=result["totalPossible"],
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
