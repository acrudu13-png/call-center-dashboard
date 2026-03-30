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
  speaker: string; // arbitrary speaker ID from diarization (e.g. "speaker_0", "speaker_1")
  timestamp: number; // seconds from start
  text: string;
}

export interface AIScorecard {
  overallScore: number; // 0-100 percentage
  grade: "Excellent" | "Good" | "Acceptable" | "Poor";
  summary: string;
  improvementAdvice: string[];
  sections: ScorecardSection[];
  issuesDetected: string[];
  coachingNotes: string[];
  extractions: Record<string, string>; // extractionKey → value or "N/A"
}

export interface ScorecardSection {
  ruleId: string;
  ruleTitle: string;
  passed: boolean;
  score: number;    // actual points earned
  maxScore: number; // maximum possible points
  details: string;
  extractedValue?: string; // populated for extraction-type rules
}

export interface QARule {
  id: string;
  title: string;
  description: string;
  section?: string;       // Romanian section name
  sectionEn?: string;     // English section name
  maxScore?: number;      // max points for scored rules (undefined for extraction rules)
  extractionKey?: string; // snake_case key for extraction rules (undefined for scored rules)
  enabled: boolean;
  direction?: string;    // inbound | outbound | both
  order: number;
}

export interface DailyScore {
  date: string;
  avgScore: number;
  totalCalls: number;
}

// --- QA Rules ---
export const qaRules: QARule[] = [
  // ── Section I: Deschidere apel / Call Opening (max 10) ──
  {
    id: "rule-001",
    title: "Salut & Verificare identitate",
    description:
      "Agentul trebuie să salute clientul, să se prezinte cu numele și compania (Telerenta), să verifice identitatea clientului cu cel puțin două date (CNP, număr contract sau dată naștere) și să confirme că apelul este înregistrat.",
    enabled: true,
    order: 1,
    section: "Deschidere apel",
    sectionEn: "Call Opening",
    maxScore: 2,
  },
  {
    id: "rule-002",
    title: "Consimțământ GDPR",
    description:
      "Agentul trebuie să informeze clientul că apelul este înregistrat și să obțină consimțământul verbal pentru prelucrarea datelor conform GDPR România, înainte de a continua.",
    enabled: true,
    order: 2,
    section: "Deschidere apel",
    sectionEn: "Call Opening",
    maxScore: 2,
  },
  {
    id: "rule-003",
    title: "Ton profesional",
    description:
      "Agentul menține un ton profesional, calm și prietenos pe toată durata deschiderii apelului. Nu folosește argou, nu întrerupe clientul și nu adoptă un ton distant sau nepoliticos.",
    enabled: true,
    order: 3,
    section: "Deschidere apel",
    sectionEn: "Call Opening",
    maxScore: 3,
  },
  {
    id: "rule-004",
    title: "Scopul apelului explicat",
    description:
      "Agentul explică clar scopul apelului sau confirmă motivul contactului clientului, asigurând că ambele părți înțeleg contextul conversației încă de la început.",
    enabled: true,
    order: 4,
    section: "Deschidere apel",
    sectionEn: "Call Opening",
    maxScore: 3,
  },

  // ── Section II: Comunicare / Communication (max 15) ──
  {
    id: "rule-005",
    title: "Claritate & Coerență",
    description:
      "Agentul comunică clar și coerent, fără repetări robotice, fără halucinații sau răspunsuri irelevante. Informațiile sunt prezentate logic și fără ambiguitate.",
    enabled: true,
    order: 5,
    section: "Comunicare",
    sectionEn: "Communication",
    maxScore: 5,
  },
  {
    id: "rule-006",
    title: "Acuratețea informațiilor",
    description:
      "Toate informațiile despre produse, prețuri și politici comunicate de agent sunt corecte din punct de vedere factual. Nu există informații eronate, completări inutile sau bucle repetitive.",
    enabled: true,
    order: 6,
    section: "Comunicare",
    sectionEn: "Communication",
    maxScore: 5,
  },
  {
    id: "rule-007",
    title: "Adaptare la nivelul clientului",
    description:
      "Agentul adaptează limbajul și ritmul conversației la nivelul de înțelegere al clientului, folosind termeni simpli pentru clienți obișnuiți și termeni tehnici pentru cei familiarizați cu domeniul.",
    enabled: true,
    order: 7,
    section: "Comunicare",
    sectionEn: "Communication",
    maxScore: 5,
  },

  // ── Section III: Identificare nevoie / Needs Identification (max 15) ──
  {
    id: "rule-008",
    title: "Întrebări relevante adresate",
    description:
      "Agentul pune întrebări pertinente pentru a înțelege situația clientului: motivul apelului, istoricul problemei, așteptările clientului. Întrebările sunt deschise și orientate spre soluție.",
    enabled: true,
    order: 8,
    section: "Identificare nevoie",
    sectionEn: "Needs Identification",
    maxScore: 5,
  },
  {
    id: "rule-009",
    title: "Ascultare activă",
    description:
      "Agentul demonstrează ascultare activă: parafrazează preocupările clientului, confirmă înțelegerea și nu întrerupe. Folosește indicatori verbali de ascultare.",
    enabled: true,
    order: 9,
    section: "Identificare nevoie",
    sectionEn: "Needs Identification",
    maxScore: 5,
  },
  {
    id: "rule-010",
    title: "Înțelegerea situației clientului",
    description:
      "Agentul demonstrează că a înțeles corect situația clientului înainte de a propune soluții. Rezumă sau confirmă problema clientului cu acuratețe.",
    enabled: true,
    order: 10,
    section: "Identificare nevoie",
    sectionEn: "Needs Identification",
    maxScore: 5,
  },

  // ── Section IV: Prezentare soluție / Solution Presentation (max 20) ──
  {
    id: "rule-011",
    title: "Explicarea clară a produsului/situației",
    description:
      "Agentul explică clar produsul sau soluția oferită, inclusiv caracteristicile relevante, fără a omite informații esențiale sau a induce în eroare clientul.",
    enabled: true,
    order: 11,
    section: "Prezentare soluție",
    sectionEn: "Solution Presentation",
    maxScore: 5,
  },
  {
    id: "rule-012",
    title: "Beneficii cheie prezentate",
    description:
      "Agentul prezintă cel puțin două beneficii cheie relevante pentru situația clientului, personalizând prezentarea în funcție de nevoile identificate.",
    enabled: true,
    order: 12,
    section: "Prezentare soluție",
    sectionEn: "Solution Presentation",
    maxScore: 5,
  },
  {
    id: "rule-013",
    title: "Costuri & Obligații explicate",
    description:
      "Agentul explică transparent costurile, durata contractului și orice obligații aferente soluției propuse. Nu omite informații financiare relevante.",
    enabled: true,
    order: 13,
    section: "Prezentare soluție",
    sectionEn: "Solution Presentation",
    maxScore: 5,
  },
  {
    id: "rule-014",
    title: "Soluție persuasivă și relevantă",
    description:
      "Soluția propusă este relevantă pentru situația clientului și prezentată convingător, fără a fi forțată. Agentul aliniază propunerea la nevoile reale identificate.",
    enabled: true,
    order: 14,
    section: "Prezentare soluție",
    sectionEn: "Solution Presentation",
    maxScore: 5,
  },

  // ── Section V: Gestionarea obiecțiilor / Objection Handling (max 15) ──
  {
    id: "rule-015",
    title: "Răspuns calm la obiecții",
    description:
      "Agentul răspunde calm și empatic la obiecțiile clientului, fără a deveni defensiv, agresiv sau a ignora preocupările exprimate.",
    enabled: true,
    order: 15,
    section: "Gestionarea obiecțiilor",
    sectionEn: "Objection Handling",
    maxScore: 5,
  },
  {
    id: "rule-016",
    title: "Argumente relevante",
    description:
      "Agentul furnizează argumente concrete și relevante pentru a răspunde obiecțiilor, bazate pe fapte și beneficii reale, nu generice.",
    enabled: true,
    order: 16,
    section: "Gestionarea obiecțiilor",
    sectionEn: "Objection Handling",
    maxScore: 5,
  },
  {
    id: "rule-017",
    title: "Fără conflicte / bucle",
    description:
      "Agentul nu intră în conflict cu clientul și nu se blochează în bucle repetitive. Dacă clientul rămâne hotărât, agentul acceptă respectuos și îndrumă spre pașii următori.",
    enabled: true,
    order: 17,
    section: "Gestionarea obiecțiilor",
    sectionEn: "Objection Handling",
    maxScore: 5,
  },

  // ── Section VI: Call to Action (max 15) ──
  {
    id: "rule-018",
    title: "Cerere clară de acțiune",
    description:
      "Agentul formulează o cerere de acțiune clară și specifică pentru client (ex: confirmare abonament, programare tehnician, furnizare date), fără ambiguitate.",
    enabled: true,
    order: 18,
    section: "Call to Action",
    sectionEn: "Call to Action",
    maxScore: 5,
  },
  {
    id: "rule-019",
    title: "Termen concret menționat",
    description:
      "Agentul menționează un termen sau un interval de timp concret pentru acțiunea propusă sau pentru pașii următori (ex: '5-7 zile lucrătoare', 'până la sfârșitul zilei').",
    enabled: true,
    order: 19,
    section: "Call to Action",
    sectionEn: "Call to Action",
    maxScore: 5,
  },
  {
    id: "rule-020",
    title: "Confirmare înțelegere client",
    description:
      "Agentul confirmă că clientul a înțeles acțiunea care urmează și este de acord cu pașii stabiliți, înainte de a încheia această secțiune.",
    enabled: true,
    order: 20,
    section: "Call to Action",
    sectionEn: "Call to Action",
    maxScore: 5,
  },

  // ── Section VII: Control (max 5) ──
  {
    id: "rule-021",
    title: "Control direcție conversație",
    description:
      "Agentul menține controlul conversației, ghidând discuția spre obiectivul apelului fără a fi autoritar. Readuce conversația pe traiectoria corectă dacă clientul deviază.",
    enabled: true,
    order: 21,
    section: "Control",
    sectionEn: "Control",
    maxScore: 3,
  },
  {
    id: "rule-022",
    title: "Fără devieri inutile",
    description:
      "Agentul nu introduce subiecte irelevante și nu permite conversației să se abată nejustificat de la scopul apelului.",
    enabled: true,
    order: 22,
    section: "Control",
    sectionEn: "Control",
    maxScore: 2,
  },

  // ── Section VIII: Închidere apel / Closing (max 5) ──
  {
    id: "rule-023",
    title: "Rezumat pași următori",
    description:
      "Agentul rezumă clar pașii următori stabiliți, menționând numărul de referință al apelului sau al tichetului și orice acțiuni pendinte.",
    enabled: true,
    order: 23,
    section: "Închidere apel",
    sectionEn: "Closing",
    maxScore: 3,
  },
  {
    id: "rule-024",
    title: "Închidere politicoasă",
    description:
      "Agentul încheie apelul politicos, mulțumind clientului pentru apel, urând o zi bună și așteptând ca clientul să închidă primul dacă este posibil.",
    enabled: true,
    order: 24,
    section: "Închidere apel",
    sectionEn: "Closing",
    maxScore: 2,
  },

  // ── Extraction Rules ──
  {
    id: "rule-ext-001",
    title: "Customer Name Extraction",
    description:
      "Extract the customer's full name if they identify themselves or are verified during the call. Return the name as a string, or 'N/A' if not identified.",
    extractionKey: "customer_name",
    enabled: true,
    order: 25,
  },
  {
    id: "rule-ext-002",
    title: "Customer Intent Classification",
    description:
      "Classify the primary reason for the call. Options: billing dispute, technical issue, plan change, roaming activation, cancellation request, general inquiry, other.",
    extractionKey: "intent",
    enabled: true,
    order: 26,
  },
  {
    id: "rule-ext-003",
    title: "Customer Sentiment",
    description:
      "Classify the customer's overall emotional tone throughout the call. Options: satisfied, neutral, frustrated, angry.",
    extractionKey: "sentiment",
    enabled: true,
    order: 27,
  },
];

// Total max score across all scoring rules
export const TOTAL_MAX_SCORE = qaRules
  .filter((r) => r.maxScore !== undefined)
  .reduce((sum, r) => sum + (r.maxScore ?? 0), 0); // = 100

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
    { speaker: "speaker_0", timestamp: 0, text: "Bună ziua, ați sunat la Telerenta, mă numesc Maria Popescu. Cu ce vă pot ajuta astăzi?" },
    { speaker: "speaker_1", timestamp: 5, text: "Bună ziua. Am o problemă cu factura din luna aceasta. Mi s-a facturat o sumă mai mare decât de obicei." },
    { speaker: "speaker_0", timestamp: 14, text: "Îmi pare rău să aud asta. Vă rog să-mi spuneți numărul de contract și CNP-ul pentru a vă verifica identitatea." },
    { speaker: "speaker_1", timestamp: 22, text: "Sigur, numărul de contract este TC-2024-87432 și CNP-ul este 2850315..." },
    { speaker: "speaker_0", timestamp: 35, text: "Vă mulțumesc. Vă informez că acest apel este înregistrat în scopul îmbunătățirii serviciilor. Sunteți de acord cu continuarea?" },
    { speaker: "speaker_1", timestamp: 43, text: "Da, sunt de acord." },
    { speaker: "speaker_0", timestamp: 46, text: "Mulțumesc. Am verificat contul dumneavoastră. Văd că factura din martie este cu 45 de lei mai mare față de luna precedentă. Acest lucru se datorează unui serviciu adițional de roaming care a fost activat pe 15 februarie." },
    { speaker: "speaker_1", timestamp: 62, text: "Dar eu nu am activat niciun serviciu de roaming! Nu am fost în afara țării." },
    { speaker: "speaker_0", timestamp: 68, text: "Înțeleg frustrarea dumneavoastră și vă cer scuze pentru neplăcere. Permiteți-mi să verific istoricul activărilor pe contul dumneavoastră." },
    { speaker: "speaker_1", timestamp: 78, text: "Vă rog, da." },
    { speaker: "speaker_0", timestamp: 80, text: "Am verificat și se pare că serviciul a fost activat printr-un SMS promoțional. Voi dezactiva imediat acest serviciu și voi iniția o cerere de creditare pentru suma de 45 de lei." },
    { speaker: "speaker_1", timestamp: 95, text: "Mulțumesc, asta e tot ce voiam." },
    { speaker: "speaker_0", timestamp: 98, text: "De asemenea, aș dori să vă informez că avem o ofertă specială pentru pachetul Premium care include roaming în UE fără costuri suplimentare, la doar 10 lei pe lună în plus față de abonamentul actual." },
    { speaker: "speaker_1", timestamp: 112, text: "Nu, mulțumesc, nu sunt interesată momentan." },
    { speaker: "speaker_0", timestamp: 116, text: "Nicio problemă. Deci, pentru a rezuma: am dezactivat serviciul de roaming și am înregistrat cererea de creditare cu numărul REF-2024-9981. Creditul va apărea pe factura următoare în 5-7 zile lucrătoare." },
    { speaker: "speaker_1", timestamp: 132, text: "Perfect, mulțumesc mult." },
    { speaker: "speaker_0", timestamp: 135, text: "Mai aveți vreo altă întrebare sau vă mai pot ajuta cu ceva?" },
    { speaker: "speaker_1", timestamp: 139, text: "Nu, asta e tot. Mulțumesc." },
    { speaker: "speaker_0", timestamp: 142, text: "Vă mulțumesc pentru apel și vă dorim o zi frumoasă! Referința apelului este CALL-2024-44521." },
  ];
}

// --- Extraction mock data pools ---
const mockCustomerNames = [
  "Ioan Munteanu", "Gabriela Radu", "Sorin Popa", "Mihaela Stoica",
  "Dan Ilie", "Roxana Dima", "Victor Ghiță", "Alin Borcea",
  "Teodora Vasile", "Bogdan Ciobanu",
];
const mockIntents = [
  "billing dispute", "plan change", "technical issue",
  "roaming activation", "general inquiry", "cancellation request",
];
const mockSentiments = ["satisfied", "neutral", "frustrated", "angry"];

// --- Repeat Caller Profiles (for caller history feature) ---
const repeatCallerProfiles = [
  { phone: "+40 722 111 222", name: "Ion Popescu", callIndices: [0, 8, 15, 32] },
  { phone: "+40 733 222 333", name: "Maria Ionescu", callIndices: [1, 12, 28] },
  { phone: "+40 744 333 444", name: "Alexandru Dumitru", callIndices: [2, 19, 35, 41] },
  { phone: "+40 755 444 555", name: "Elena Stan", callIndices: [3, 24] },
  { phone: "+40 766 555 666", name: "Cristian Moldovan", callIndices: [4, 16, 45] },
  { phone: "+40 777 666 777", name: "Ana Gheorghe", callIndices: [5, 22, 38] },
  { phone: "+40 788 777 888", name: "Mihai Nistor", callIndices: [6, 29] },
  { phone: "+40 799 888 999", name: "Ioana Radu", callIndices: [7, 33, 47] },
];

// --- Grade calculation ---
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

// --- Improvement advice by failed sections ---
const IMPROVEMENT_ADVICE_BY_RULE: Record<string, string> = {
  "rule-001": "Revizuiți scriptul de deschidere pentru a asigura verificarea completă a identității clientului.",
  "rule-002": "Asigurați-vă că obțineți consimțământul GDPR verbal înainte de orice altă discuție.",
  "rule-003": "Lucrați la menținerea unui ton profesional și empatic pe tot parcursul apelului.",
  "rule-004": "Explicați clar scopul apelului la început pentru a seta așteptări corecte.",
  "rule-005": "Evitați repetările inutile și asigurați coerența mesajului transmis.",
  "rule-006": "Verificați întotdeauna informațiile despre produse și prețuri înainte de a le comunica clientului.",
  "rule-007": "Adaptați limbajul la nivelul tehnic al clientului pentru o comunicare mai eficientă.",
  "rule-008": "Adresați mai multe întrebări deschise pentru a înțelege complet situația clientului.",
  "rule-009": "Exersați tehnici de ascultare activă: parafrazare, confirmare, indicatori verbali.",
  "rule-010": "Rezumați situația clientului înainte de a propune soluții pentru a confirma înțelegerea.",
  "rule-011": "Asigurați-vă că explicați produsul/soluția complet și fără ambiguitate.",
  "rule-012": "Prezentați minimum două beneficii relevante pentru situația specifică a clientului.",
  "rule-013": "Explicați transparent toate costurile și obligațiile contractuale asociate soluției propuse.",
  "rule-014": "Personalizați propunerea în funcție de nevoile identificate pentru o abordare mai convingătoare.",
  "rule-015": "Mențineți calmul și empatia atunci când clientul ridică obiecții.",
  "rule-016": "Pregătiți argumente concrete și specifice pentru obiecțiile frecvente ale clienților.",
  "rule-017": "Evitați bucle repetitive — dacă clientul refuză, acceptați respectuos și îndrumați spre pașii următori.",
  "rule-018": "Formulați o cerere de acțiune clară și specifică la finalul prezentării.",
  "rule-019": "Menționați întotdeauna un termen concret pentru acțiunile stabilite.",
  "rule-020": "Confirmați că clientul a înțeles și este de acord cu acțiunile stabilite înainte de a continua.",
  "rule-021": "Exersați tehnici de reorientare a conversației pentru a menține controlul fără a fi autoritar.",
  "rule-022": "Fiți conștient de deviațiile inutile și readuceți conversația la subiect politicos.",
  "rule-023": "Rezumați întotdeauna pașii următori și numărul de referință la finalul apelului.",
  "rule-024": "Încheiați apelul politicos, mulțumind clientului și urând o zi bună.",
};

// --- Generate Calls ---
function generateCalls(): Call[] {
  const calls: Call[] = [];
  const statuses: Call["status"][] = ["completed", "completed", "completed", "in_review", "flagged", "completed", "completed", "processing"];

  // Build a map of call index to phone number for repeat callers
  const indexToPhone: Record<number, string> = {};
  repeatCallerProfiles.forEach((profile) => {
    profile.callIndices.forEach((idx) => {
      indexToPhone[idx] = profile.phone;
    });
  });

  // Seeded pseudo-random for deterministic generation
  const seededRand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 50; i++) {
    const agent = agents[i % agents.length];
    const status = statuses[i % statuses.length];
    const failedRules: string[] = [];
    const scorecardSections: ScorecardSection[] = [];
    const extractions: Record<string, string> = {};

    let totalEarned = 0;
    let totalPossible = 0;

    // Determine if this call has a critical failure (independent of rule scoring)
    const hasCriticalFailure = seededRand(i * 7 + 3) < 0.08; // ~8% of calls

    const scoringRules = qaRules.filter(
      (r) => r.enabled && r.maxScore !== undefined
    );

    scoringRules.forEach((rule, ruleIdx) => {
      const maxScore = rule.maxScore ?? 0;
      totalPossible += maxScore;

      const passProbability = 0.85;
      const rand = seededRand(i * 31 + ruleIdx * 13 + 7);
      const passed = rand < passProbability;

      let score = 0;
      if (passed) {
        // Scored rules can earn partial credit (70-100% of max)
        const partial = seededRand(i * 17 + ruleIdx * 5 + 11);
        score = Math.round(maxScore * (0.7 + partial * 0.3));
      } else {
        failedRules.push(rule.id);
        // Failed rules may earn partial credit (0-40%)
        const partial = seededRand(i * 23 + ruleIdx * 7 + 3);
        score = Math.round(maxScore * partial * 0.4);
      }

      totalEarned += score;

      scorecardSections.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        passed,
        score,
        maxScore,
        details: passed
          ? "Cerință îndeplinită cu succes."
          : "Cerința nu a fost îndeplinită. Se recomandă îmbunătățire.",
      });
    });

    // Extraction rules
    qaRules.filter((r) => r.enabled && !!r.extractionKey).forEach((rule) => {
      let value = "N/A";
      if (rule.extractionKey === "customer_name") {
        const callerProfile = repeatCallerProfiles.find(p => p.callIndices.includes(i));
        value = callerProfile
          ? callerProfile.name
          : (seededRand(i * 3 + 1) > 0.15 ? mockCustomerNames[i % mockCustomerNames.length] : "N/A");
      } else if (rule.extractionKey === "intent") {
        value = mockIntents[i % mockIntents.length];
      } else if (rule.extractionKey === "sentiment") {
        value = mockSentiments[i % mockSentiments.length];
      }
      extractions[rule.extractionKey!] = value;
      scorecardSections.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        passed: value !== "N/A",
        score: 0,
        maxScore: 0,
        details: value !== "N/A" ? `Extras: ${value}` : "Nu s-a putut extrage — valoarea lipsește din transcript.",
        extractedValue: value,
      });
    });

    const overallScore = totalPossible > 0
      ? Math.round((totalEarned / totalPossible) * 100)
      : 0;

    const compliancePass = !hasCriticalFailure;

    const grade = calculateGrade(overallScore, hasCriticalFailure);

    // Build improvement advice from failed rules
    const adviceItems = failedRules
      .slice(0, 3)
      .map((id) => IMPROVEMENT_ADVICE_BY_RULE[id])
      .filter(Boolean);

    if (hasCriticalFailure) {
      adviceItems.unshift("ATENȚIE: Apelul conține un eșec critic care necesită revizuire imediată de către supervizor.");
    }

    const date = new Date(2024, 2, 26 - Math.floor(i / 3));
    date.setHours(8 + (i % 10), Math.floor(seededRand(i * 11) * 60));

    const customerPhone = indexToPhone[i] || `+40 7${String(Math.floor(seededRand(i * 5 + 2) * 90000000) + 10000000)}`;

    calls.push({
      id: `CALL-${String(1000 + i)}`,
      dateTime: date.toISOString(),
      agentName: agent.name,
      agentId: agent.id,
      customerPhone,
      duration: Math.floor(seededRand(i * 7 + 1) * 600) + 120,
      qaScore: overallScore,
      status,
      rulesFailed: failedRules,
      compliancePass,
      transcript: generateTranscript(),
      aiScorecard: {
        overallScore,
        grade,
        summary: failedRules.length > 0 || hasCriticalFailure
          ? "Au fost detectate probleme de conformitate. Agentul necesită o sesiune de coaching privind procedurile de deschidere și respectarea scriptului."
          : "Apel gestionat profesional, cu empatie adecvată și rezolvare eficientă a problemei. Agentul a respectat toate cerințele de calitate.",
        improvementAdvice: adviceItems.length > 0 ? adviceItems : ["Performanță excelentă. Mențineți standardele ridicate."],
        sections: scorecardSections,
        extractions,
        issuesDetected: failedRules.length > 0 || hasCriticalFailure
          ? [
              ...(!compliancePass ? ["Eșec critic de conformitate detectat — revizuire imediată necesară."] : []),
              ...failedRules.slice(0, 2).map((id) => {
                const rule = qaRules.find((r) => r.id === id);
                return `Nerealizat: ${rule?.title}`;
              }),
            ]
          : ["Nu au fost detectate probleme. Apelul îndeplinește toate standardele de calitate."],
        coachingNotes: failedRules.length > 0
          ? [
              "Revizuiți scriptul de deschidere pentru a asigura completarea tuturor pașilor de verificare.",
              "Exersați tehnicile de ascultare activă — repetați preocuparea clientului înainte de a răspunde.",
              "Nu uitați să menționați numărul de referință al apelului la închidere.",
            ]
          : ["Performanță excelentă. Considerați acest apel ca exemplu de training pentru agenții noi."],
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
          overall: overallScore,
          grade,
          total_earned: totalEarned,
          total_possible: totalPossible,
        },
        metadata: {
          agent_id: agent.id,
          customer_phone_hash: "sha256:a1b2c3d4...",
          duration_seconds: Math.floor(seededRand(i * 7 + 1) * 600) + 120,
          hold_time_seconds: Math.floor(seededRand(i * 9 + 4) * 60),
          silence_percentage: (seededRand(i * 13 + 6) * 15).toFixed(1),
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
  remotePath: "/tlr-cs-recordings/$yesterday_date",
};

export const defaultS3Settings = {
  bucketName: "telecom-ro-call-recordings",
  region: "eu-central-1",
  accessKey: "",
  secretKey: "",
  prefix: "raw-audio/",
};

export const defaultMetadataMapping = {
  filenamePattern: "_N(?<phone>\\+[\\d]+)_.*_(?<date>\\d{4}-\\d{2}-\\d{2})_(?<time>\\d{2}-\\d{2}-\\d{2})\\.",
  delimiter: "_",
  agentIdPosition: 0,
  phonePosition: 2,
  sampleFilenames: [
    "Telerenta_1777723443827-43242343_N+40758423232_N210-R207_2026-03-25_11-57-14.au",
    "Telerenta_1888834554938-54353454_N+40722987654_N310-R108_2026-03-25_12-23-45.au",
    "Telerenta_1999945665049-65464565_N+40731456789_N110-R305_2026-03-25_14-08-30.au",
  ],
};

export const defaultIngestSchedule = {
  cronHour: 6,   // 06:00 daily
  enabled: true,
  concurrency: 5,
};

export const defaultLlmSettings = {
  openRouterApiKey: "",
  defaultModel: "anthropic/claude-4.6-sonnet",
  availableModels: [
    "anthropic/claude-4.6-sonnet",
    "anthropic/claude-4.5-opus",
    "google/gemini-3.1-pro",
    "google/gemini-3.0-ultra",
    "openai/gpt-5.3-pro",
    "openai/gpt-5.2-mini",
    "meta-llama/llama-4-70b",
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
  "Telerenta",
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
