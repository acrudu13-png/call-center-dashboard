"""
Seed script: populates the database with realistic demo data matching the frontend mockData.
Run: python -m app.seed

Optional environment variable:
  SEED_ORG_SLUG  — slug of the organization to seed into (default: "default")
"""
import json
import os
import random
import uuid
from datetime import datetime, timedelta
from app.database import engine, Base, SessionLocal
from app.models.call import Call, TranscriptLine, ScorecardEntry
from app.models.rule import QARule
from app.models.job import TranscriptionJob, LogEntry
from app.models.setting import Setting
from app.models.organization import Organization

random.seed(42)

# ── QA Rules (matching frontend mockData.ts) ──────────────────────────
RULES = [
    # Section I: Deschiderea apelului (10 pts)
    ("rule-001", "Salut conform script", "Agentul salută clientul conform scriptului standard.", "I. Deschiderea apelului", "scoring", 3, False, False),
    ("rule-002", "Identificare companie", "Agentul menționează numele companiei.", "I. Deschiderea apelului", "scoring", 3, False, False),
    ("rule-003", "Identificare personală", "Agentul se prezintă cu numele complet.", "I. Deschiderea apelului", "scoring", 2, False, False),
    ("rule-004", "Oferirea de ajutor", "Agentul întreabă cum poate ajuta clientul.", "I. Deschiderea apelului", "scoring", 2, False, False),
    # Section II: Comunicare (15 pts)
    ("rule-005", "Ton profesional", "Agentul menține un ton profesional pe tot parcursul apelului.", "II. Comunicare", "scoring", 5, True, False),
    ("rule-006", "Ascultare activă", "Agentul demonstrează ascultare activă.", "II. Comunicare", "scoring", 5, False, False),
    ("rule-007", "Limbaj clar", "Agentul folosește un limbaj clar și accesibil.", "II. Comunicare", "scoring", 5, False, False),
    # Section III: Identificarea nevoilor (15 pts)
    ("rule-008", "Întrebări deschise", "Agentul pune întrebări deschise pentru a înțelege nevoile.", "III. Identificarea nevoilor", "scoring", 5, False, False),
    ("rule-009", "Confirmare nevoie", "Agentul confirmă înțelegerea nevoii clientului.", "III. Identificarea nevoilor", "scoring", 5, False, False),
    ("rule-010", "Explorare completă", "Agentul explorează complet situația clientului.", "III. Identificarea nevoilor", "scoring", 5, False, False),
    # Section IV: Prezentarea soluției (20 pts)
    ("rule-011", "Soluție potrivită", "Agentul propune o soluție adecvată nevoilor.", "IV. Prezentarea soluției", "scoring", 7, False, False),
    ("rule-012", "Explicare beneficii", "Agentul explică beneficiile soluției.", "IV. Prezentarea soluției", "scoring", 5, False, False),
    ("rule-013", "Transparență costuri", "Agentul prezintă costurile în mod transparent.", "IV. Prezentarea soluției", "scoring", 5, True, False),
    ("rule-014", "Confirmare înțelegere", "Agentul verifică dacă clientul a înțeles soluția.", "IV. Prezentarea soluției", "scoring", 3, False, False),
    # Section V: Gestionarea obiecțiilor (15 pts)
    ("rule-015", "Empatie la obiecții", "Agentul arată empatie față de obiecțiile clientului.", "V. Gestionarea obiecțiilor", "scoring", 5, False, False),
    ("rule-016", "Răspuns la obiecții", "Agentul oferă răspunsuri clare la obiecții.", "V. Gestionarea obiecțiilor", "scoring", 5, False, False),
    ("rule-017", "Alternativă propusă", "Agentul propune alternative când este necesar.", "V. Gestionarea obiecțiilor", "scoring", 5, False, False),
    # Section VI: Call to Action (15 pts)
    ("rule-018", "Propunere CTA", "Agentul propune un call to action clar.", "VI. Call to Action", "scoring", 5, False, False),
    ("rule-019", "Urgentare", "Agentul creează un sens de urgență adecvat.", "VI. Call to Action", "scoring", 5, False, False),
    ("rule-020", "Confirmare acord", "Agentul obține confirmarea acordului clientului.", "VI. Call to Action", "scoring", 5, False, False),
    # Section VII: Control (5 pts)
    ("rule-021", "Control conversație", "Agentul menține controlul conversației.", "VII. Control", "scoring", 3, False, False),
    ("rule-022", "Gestionare timp", "Agentul gestionează eficient timpul apelului.", "VII. Control", "scoring", 2, False, False),
    # Section VIII: Închidere (5 pts)
    ("rule-023", "Rezumat final", "Agentul face un rezumat al discuției.", "VIII. Închidere", "scoring", 3, False, False),
    ("rule-024", "Salut final", "Agentul se desparte conform scriptului.", "VIII. Închidere", "scoring", 2, False, False),
    # Extraction rules
    ("rule-ext-001", "Extrage nume client", "Extrage numele clientului din conversație.", "Extracție", "extraction", 0, False, False),
    ("rule-ext-002", "Extrage intenție", "Extrage intenția principală a clientului.", "Extracție", "extraction", 0, False, False),
    ("rule-ext-003", "Extrage sentiment", "Determină sentimentul general al clientului.", "Extracție", "extraction", 0, False, False),
]

AGENTS = [
    ("AGT-001", "Maria Popescu"),
    ("AGT-002", "Ion Ionescu"),
    ("AGT-003", "Elena Dumitrescu"),
    ("AGT-004", "Andrei Popa"),
    ("AGT-005", "Ana Georgescu"),
    ("AGT-006", "Mihai Stan"),
    ("AGT-007", "Cristina Radu"),
    ("AGT-008", "Vlad Munteanu"),
]

STATUSES = ["completed", "completed", "completed", "in_review", "flagged"]
GRADES = ["Excelent", "Bun", "Bun", "Acceptabil", "Slab"]

TRANSCRIPT_TEMPLATES = [
    [
        ("speaker_0", 0, "Bună ziua, ați sunat la Telecom România, eu sunt {agent}. Cu ce vă pot ajuta?"),
        ("speaker_1", 5, "Bună ziua. Aș dori să aflu mai multe despre abonamentele de internet."),
        ("speaker_0", 12, "Cu plăcere! Avem mai multe oferte disponibile. Puteți să-mi spuneți ce viteză aveți în prezent?"),
        ("speaker_1", 20, "Am un abonament de 100 Mbps, dar aș dori ceva mai rapid."),
        ("speaker_0", 28, "Înțeleg. Vă pot recomanda pachetul Premium cu 500 Mbps la doar 59 lei pe lună."),
        ("speaker_1", 38, "Sună bine. Există și o perioadă de probă?"),
        ("speaker_0", 44, "Da, aveți 14 zile de testare gratuită. Doriți să activez oferta?"),
        ("speaker_1", 52, "Da, vă rog. Mulțumesc!"),
        ("speaker_0", 56, "Perfect! Am activat pachetul Premium. Mai aveți vreo întrebare?"),
        ("speaker_1", 64, "Nu, mulțumesc. O zi bună!"),
        ("speaker_0", 68, "Și dumneavoastră! Vă mulțumesc că ați sunat la Telecom România. La revedere!"),
    ],
    [
        ("speaker_0", 0, "Bună ziua, Telecom România, mă numesc {agent}. Cu ce vă pot fi de folos?"),
        ("speaker_1", 4, "Bună ziua. Am o problemă cu factura, mi s-a facturat dublu luna aceasta."),
        ("speaker_0", 12, "Îmi pare rău pentru neplăcere. Să verificăm împreună. Puteți să-mi dați numărul de cont?"),
        ("speaker_1", 20, "Da, este TRC-445829."),
        ("speaker_0", 26, "Am găsit contul. Într-adevăr, văd o factură duplicată. Voi iniția o corecție imediat."),
        ("speaker_1", 35, "Cât durează până se rezolvă?"),
        ("speaker_0", 39, "Corecția va fi procesată în 3-5 zile lucrătoare și veți primi un email de confirmare."),
        ("speaker_1", 48, "Mulțumesc frumos! Apreciez ajutorul."),
        ("speaker_0", 52, "Cu plăcere! Dacă mai aveți nevoie, nu ezitați să sunați. O zi frumoasă!"),
    ],
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Resolve target organization
    slug = os.getenv("SEED_ORG_SLUG", "default")
    org = db.query(Organization).filter(Organization.slug == slug).first()
    if not org:
        print(f"Organization with slug '{slug}' not found. Available organizations:")
        for o in db.query(Organization).all():
            print(f"  - {o.slug} ({o.name})")
        db.close()
        return
    org_id = org.id
    print(f"Seeding into organization: {org.name} ({org.slug})")

    # Check if already seeded for this org
    if db.query(QARule).filter(QARule.organization_id == org_id).count() > 0:
        print("Organization already has rules. Skipping.")
        db.close()
        return

    print("Seeding database...")

    # 1. QA Rules
    for idx, (rid, title, desc, section, rtype, max_score, critical, _) in enumerate(RULES):
        db.add(QARule(
            organization_id=org_id,
            rule_id=rid, title=title, description=desc, section=section,
            rule_type=rtype, max_score=max_score, enabled=True,
            is_critical=critical, sort_order=idx,
        ))
    db.commit()
    print(f"  Created {len(RULES)} QA rules.")

    # 2. Calls (50 calls)
    scoring_rules = [(r[0], r[1], r[5]) for r in RULES if r[4] == "scoring"]
    now = datetime.utcnow()

    for i in range(50):
        agent = random.choice(AGENTS)
        call_date = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        duration = random.randint(120, 600)
        status = random.choice(STATUSES)

        call_uuid = str(uuid.uuid4())
        call_id_str = f"CALL-{1000 + i}"
        phone = f"+40 7{random.randint(10, 99)} {random.randint(100, 999)} {random.randint(100, 999)}"

        # Generate scorecard
        total_earned = 0
        total_possible = 0
        scorecard = []
        failed_rules = []
        for rid, rtitle, max_s in scoring_rules:
            passed = random.random() > 0.25
            score = max_s if passed else round(random.uniform(0, max_s * 0.5), 1)
            total_earned += score
            total_possible += max_s
            if not passed:
                failed_rules.append(rid)
            scorecard.append((rid, rtitle, passed, score, max_s))

        qa_score = round((total_earned / total_possible) * 100, 1) if total_possible > 0 else 0
        grade = (
            "Excelent" if qa_score >= 90
            else "Bun" if qa_score >= 75
            else "Acceptabil" if qa_score >= 60
            else "Slab"
        )
        has_critical = qa_score < 50
        compliance = not has_critical

        call = Call(
            id=call_uuid,
            organization_id=org_id,
            call_id=call_id_str,
            date_time=call_date,
            agent_name=agent[1],
            agent_id=agent[0],
            customer_phone=phone,
            duration=duration,
            qa_score=qa_score,
            status=status,
            rules_failed=failed_rules,
            compliance_pass=compliance,
            ai_summary=f"Apel {grade.lower()} cu clientul. Scor general: {qa_score}%.",
            ai_grade=grade,
            ai_improvement_advice=[
                "Îmbunătățirea salutului inițial",
                "Mai multă empatie la obiecții",
                "Confirmare explicită a înțelegerii",
            ][:random.randint(1, 3)],
            ai_total_earned=total_earned,
            ai_total_possible=total_possible,
            has_critical_failure=has_critical,
            critical_failure_reason="Scor critic sub 50%" if has_critical else None,
            raw_json={"source": "seed", "index": i},
        )
        db.add(call)
        db.flush()

        # Transcript
        template = random.choice(TRANSCRIPT_TEMPLATES)
        for speaker, ts, text in template:
            line_text = text.replace("{agent}", agent[1])
            db.add(TranscriptLine(
                call_id=call_uuid, speaker=speaker,
                timestamp=ts, text=line_text,
            ))

        # Scorecard entries
        for rid, rtitle, passed, score, max_s in scorecard:
            db.add(ScorecardEntry(
                call_id=call_uuid, rule_id=rid, rule_title=rtitle,
                passed=passed, score=score, max_score=max_s,
                details=f"{'Îndeplinit' if passed else 'Neîndeplinit'}: {rtitle}",
            ))

    db.commit()
    print("  Created 50 calls with transcripts and scorecards.")

    # Sync the per-org call counter so future ingestion continues from CALL-1050
    from app.services.call_counter_service import reset_counter
    reset_counter(db, org_id, 1000 + 49)  # last seeded call is CALL-1049
    db.commit()
    print("  Synced call counter to CALL-1049.")

    # 3. Transcription jobs
    for i in range(15):
        status = random.choice(["completed", "completed", "completed", "failed", "transcribing"])
        created = now - timedelta(hours=random.randint(1, 72))
        db.add(TranscriptionJob(
            organization_id=org_id,
            job_id=f"JOB-{uuid.uuid4().hex[:8].upper()}",
            file_name=f"recording_{1000+i}.wav",
            source=random.choice(["sftp", "s3"]),
            status=status,
            progress=100 if status == "completed" else random.randint(10, 90),
            error_message="Timeout during transcription" if status == "failed" else None,
            created_at=created,
            started_at=created + timedelta(seconds=30),
            completed_at=created + timedelta(minutes=5) if status == "completed" else None,
        ))
    db.commit()
    print("  Created 15 transcription jobs.")

    # 4. Log entries
    sources = ["ingestion", "transcription", "analysis", "webhook"]
    levels = ["info", "info", "info", "warn", "error"]
    messages = [
        "Ingestion cycle started",
        "File downloaded successfully",
        "Transcription completed",
        "Analysis completed with score {score}%",
        "Webhook dispatched",
        "Connection timeout, retrying...",
        "File format not supported",
        "Rate limit exceeded, waiting 30s",
    ]
    for i in range(50):
        ts = now - timedelta(hours=random.randint(0, 100))
        msg = random.choice(messages).format(score=random.randint(50, 95))
        db.add(LogEntry(
            organization_id=org_id,
            timestamp=ts,
            level=random.choice(levels),
            source=random.choice(sources),
            message=msg,
        ))
    db.commit()
    print("  Created 50 log entries.")

    # 5. Default settings
    defaults = {
        "sftp": '{"host":"sftp.telecom-romania.ro","port":22,"username":"call_ingest_svc","password":"","sshKeyPath":"/etc/ssh/telecom_ingest_rsa","remotePath":"/tlr-cs-recordings/$yesterday_date"}',
        "s3": '{"bucketName":"telecom-ro-call-recordings","region":"eu-central-1","accessKey":"","secretKey":"","prefix":"raw-audio/"}',
        "llm": '{"openRouterApiKey":"","defaultModel":"anthropic/claude-4.6-sonnet","temperature":0.1,"maxTokens":4096}',
        "soniox": '{"apiKey":"","language":"ro","model":"soniox-default"}',
        "webhook": '{"endpointUrl":"https://api.internal.telecom-ro.com/webhooks/qa-results","enabled":true,"retryCount":3,"headers":{}}',
        "ingest_schedule": '{"cronHour":6,"enabled":true}',
        "metadata_mapping": '{"agentIdField":"agent_id","customerPhoneField":"customer_phone","dateTimeField":"date_time","durationField":"duration"}',
        "main_prompt": '{"prompt":""}',
        "call_context": '{"context":""}',
    }
    for key, value in defaults.items():
        # Skip if already exists for this org
        existing_setting = db.query(Setting).filter(
            Setting.organization_id == org_id,
            Setting.key == key,
        ).first()
        if not existing_setting:
            db.add(Setting(organization_id=org_id, key=key, value=value))
    db.commit()
    print("  Created default settings.")

    print("Seeding complete!")
    db.close()


if __name__ == "__main__":
    seed()
