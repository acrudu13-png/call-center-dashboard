"""
Seed QA rules into the database — matching the Telerenta scoring system.
Run inside Docker: python -m app.seed_rules

Optional environment variable:
  SEED_ORG_SLUG  — slug of the organization to seed rules into (default: "default")
"""
import os
from app.database import SessionLocal, engine, Base
from app.models.rule import QARule
from app.models.organization import Organization

Base.metadata.create_all(bind=engine)

RULES = [
    # Section I: Deschidere apel (max 10)
    {"rule_id": "rule-001", "title": "Salut & Verificare identitate", "description": "Agentul trebuie să salute clientul, să se prezinte cu numele și compania (Telerenta), să verifice identitatea clientului cu cel puțin două date (CNP, număr contract sau dată naștere) și să confirme că apelul este înregistrat.", "section": "Deschidere apel", "rule_type": "scoring", "max_score": 2, "is_critical": False, "sort_order": 1},
    {"rule_id": "rule-002", "title": "Consimțământ GDPR", "description": "Agentul trebuie să informeze clientul că apelul este înregistrat și să obțină consimțământul verbal pentru prelucrarea datelor conform GDPR România, înainte de a continua.", "section": "Deschidere apel", "rule_type": "scoring", "max_score": 2, "is_critical": True, "sort_order": 2},
    {"rule_id": "rule-003", "title": "Ton profesional", "description": "Agentul menține un ton profesional, calm și prietenos pe toată durata deschiderii apelului. Nu folosește argou, nu întrerupe clientul și nu adoptă un ton distant sau nepoliticos.", "section": "Deschidere apel", "rule_type": "scoring", "max_score": 3, "is_critical": False, "sort_order": 3},
    {"rule_id": "rule-004", "title": "Scopul apelului explicat", "description": "Agentul explică clar scopul apelului sau confirmă motivul contactului clientului, asigurând că ambele părți înțeleg contextul conversației încă de la început.", "section": "Deschidere apel", "rule_type": "scoring", "max_score": 3, "is_critical": False, "sort_order": 4},

    # Section II: Comunicare (max 15)
    {"rule_id": "rule-005", "title": "Claritate & Coerență", "description": "Agentul comunică clar și coerent, fără repetări robotice, fără halucinații sau răspunsuri irelevante. Informațiile sunt prezentate logic și fără ambiguitate.", "section": "Comunicare", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 5},
    {"rule_id": "rule-006", "title": "Acuratețea informațiilor", "description": "Toate informațiile despre produse, prețuri și politici comunicate de agent sunt corecte din punct de vedere factual. Nu există informații eronate, completări inutile sau bucle repetitive.", "section": "Comunicare", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 6},
    {"rule_id": "rule-007", "title": "Adaptare la nivelul clientului", "description": "Agentul adaptează limbajul și ritmul conversației la nivelul de înțelegere al clientului, folosind termeni simpli pentru clienți obișnuiți și termeni tehnici pentru cei familiarizați cu domeniul.", "section": "Comunicare", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 7},

    # Section III: Identificare nevoie (max 15)
    {"rule_id": "rule-008", "title": "Întrebări relevante adresate", "description": "Agentul pune întrebări pertinente pentru a înțelege situația clientului: motivul apelului, istoricul problemei, așteptările clientului. Întrebările sunt deschise și orientate spre soluție.", "section": "Identificare nevoie", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 8},
    {"rule_id": "rule-009", "title": "Ascultare activă", "description": "Agentul demonstrează ascultare activă: parafrazează preocupările clientului, confirmă înțelegerea și nu întrerupe. Folosește indicatori verbali de ascultare.", "section": "Identificare nevoie", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 9},
    {"rule_id": "rule-010", "title": "Înțelegerea situației clientului", "description": "Agentul demonstrează că a înțeles corect situația clientului înainte de a propune soluții. Rezumă sau confirmă problema clientului cu acuratețe.", "section": "Identificare nevoie", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 10},

    # Section IV: Prezentare soluție (max 20)
    {"rule_id": "rule-011", "title": "Explicarea clară a produsului/situației", "description": "Agentul explică clar produsul sau soluția oferită, inclusiv caracteristicile relevante, fără a omite informații esențiale sau a induce în eroare clientul.", "section": "Prezentare soluție", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 11},
    {"rule_id": "rule-012", "title": "Beneficii cheie prezentate", "description": "Agentul prezintă cel puțin două beneficii cheie relevante pentru situația clientului, personalizând prezentarea în funcție de nevoile identificate.", "section": "Prezentare soluție", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 12},
    {"rule_id": "rule-013", "title": "Costuri & Obligații explicate", "description": "Agentul explică transparent costurile, durata contractului și orice obligații aferente soluției propuse. Nu omite informații financiare relevante.", "section": "Prezentare soluție", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 13},
    {"rule_id": "rule-014", "title": "Soluție persuasivă și relevantă", "description": "Soluția propusă este relevantă pentru situația clientului și prezentată convingător, fără a fi forțată. Agentul aliniază propunerea la nevoile reale identificate.", "section": "Prezentare soluție", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 14},

    # Section V: Gestionarea obiecțiilor (max 15)
    {"rule_id": "rule-015", "title": "Răspuns calm la obiecții", "description": "Agentul răspunde calm și empatic la obiecțiile clientului, fără a deveni defensiv, agresiv sau a ignora preocupările exprimate.", "section": "Gestionarea obiecțiilor", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 15},
    {"rule_id": "rule-016", "title": "Argumente relevante", "description": "Agentul furnizează argumente concrete și relevante pentru a răspunde obiecțiilor, bazate pe fapte și beneficii reale, nu generice.", "section": "Gestionarea obiecțiilor", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 16},
    {"rule_id": "rule-017", "title": "Fără conflicte / bucle", "description": "Agentul nu intră în conflict cu clientul și nu se blochează în bucle repetitive. Dacă clientul rămâne hotărât, agentul acceptă respectuos și îndrumă spre pașii următori.", "section": "Gestionarea obiecțiilor", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 17},

    # Section VI: Call to Action (max 15)
    {"rule_id": "rule-018", "title": "Cerere clară de acțiune", "description": "Agentul formulează o cerere de acțiune clară și specifică pentru client (ex: confirmare abonament, programare tehnician, furnizare date), fără ambiguitate.", "section": "Call to Action", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 18},
    {"rule_id": "rule-019", "title": "Termen concret menționat", "description": "Agentul menționează un termen sau un interval de timp concret pentru acțiunea propusă sau pentru pașii următori (ex: '5-7 zile lucrătoare', 'până la sfârșitul zilei').", "section": "Call to Action", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 19},
    {"rule_id": "rule-020", "title": "Confirmare înțelegere client", "description": "Agentul confirmă că clientul a înțeles acțiunea care urmează și este de acord cu pașii stabiliți, înainte de a încheia această secțiune.", "section": "Call to Action", "rule_type": "scoring", "max_score": 5, "is_critical": False, "sort_order": 20},

    # Section VII: Control (max 5)
    {"rule_id": "rule-021", "title": "Control direcție conversație", "description": "Agentul menține controlul conversației, ghidând discuția spre obiectivul apelului fără a fi autoritar. Readuce conversația pe traiectoria corectă dacă clientul deviază.", "section": "Control", "rule_type": "scoring", "max_score": 3, "is_critical": False, "sort_order": 21},
    {"rule_id": "rule-022", "title": "Fără devieri inutile", "description": "Agentul nu introduce subiecte irelevante și nu permite conversației să se abată nejustificat de la scopul apelului.", "section": "Control", "rule_type": "scoring", "max_score": 2, "is_critical": False, "sort_order": 22},

    # Section VIII: Închidere apel (max 5)
    {"rule_id": "rule-023", "title": "Rezumat pași următori", "description": "Agentul rezumă clar pașii următori stabiliți, menționând numărul de referință al apelului sau al tichetului și orice acțiuni pendinte.", "section": "Închidere apel", "rule_type": "scoring", "max_score": 3, "is_critical": False, "sort_order": 23},
    {"rule_id": "rule-024", "title": "Închidere politicoasă", "description": "Agentul încheie apelul politicos, mulțumind clientului pentru apel, urând o zi bună și așteptând ca clientul să închidă primul dacă este posibil.", "section": "Închidere apel", "rule_type": "scoring", "max_score": 2, "is_critical": False, "sort_order": 24},

    # Extraction rules
    {"rule_id": "rule-ext-001", "title": "Customer Name Extraction", "description": "Extract the customer's full name if they identify themselves or are verified during the call. Return the name as a string, or 'N/A' if not identified.", "section": "Extracții", "rule_type": "extraction", "max_score": 0, "is_critical": False, "sort_order": 25},
    {"rule_id": "rule-ext-002", "title": "Customer Intent Classification", "description": "Classify the primary reason for the call. Options: billing dispute, technical issue, plan change, roaming activation, cancellation request, general inquiry, other.", "section": "Extracții", "rule_type": "extraction", "max_score": 0, "is_critical": False, "sort_order": 26},
    {"rule_id": "rule-ext-003", "title": "Customer Sentiment", "description": "Classify the customer's overall emotional tone throughout the call. Options: satisfied, neutral, frustrated, angry.", "section": "Extracții", "rule_type": "extraction", "max_score": 0, "is_critical": False, "sort_order": 27},
]


def seed():
    db = SessionLocal()
    try:
        # Resolve target organization
        slug = os.getenv("SEED_ORG_SLUG", "default")
        org = db.query(Organization).filter(Organization.slug == slug).first()
        if not org:
            print(f"Organization with slug '{slug}' not found. Available organizations:")
            for o in db.query(Organization).all():
                print(f"  - {o.slug} ({o.name})")
            return
        print(f"Seeding rules into organization: {org.name} ({org.slug})")

        existing = db.query(QARule).filter(QARule.organization_id == org.id).count()
        if existing > 0:
            print(f"Already {existing} rules in this org. Deleting and re-seeding...")
            db.query(QARule).filter(QARule.organization_id == org.id).delete()
            db.commit()

        for r in RULES:
            db.add(QARule(organization_id=org.id, enabled=True, **r))
        db.commit()
        print(f"Seeded {len(RULES)} QA rules successfully.")

        # Verify
        count = db.query(QARule).filter(
            QARule.organization_id == org.id,
            QARule.enabled == True,
        ).count()
        total_score = sum(r["max_score"] for r in RULES if r["rule_type"] == "scoring")
        print(f"Active rules: {count}, Total max score: {total_score}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
