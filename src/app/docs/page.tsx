"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Phone,
  Users,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Brain,
  FileDown,
  Activity,
  Database,
  Webhook,
  Shield,
  Tag,
  ListChecks,
  PhoneIncoming,
  PhoneOutgoing,
  RotateCcw,
  Trash2,
  Languages,
  User,
  Wrench,
} from "lucide-react";

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold tracking-tight">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

export default function DocsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"user" | "technical">("user");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Documentatie</h1>
        </div>
        <P>CallQA Dashboard — ghid de utilizare si referinta tehnica.</P>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "user" ? "default" : "outline"}
          onClick={() => setTab("user")}
          className="gap-2"
        >
          <User className="h-4 w-4" /> Ghid utilizator
        </Button>
        {isAdmin && (
          <Button
            variant={tab === "technical" ? "default" : "outline"}
            onClick={() => setTab("technical")}
            className="gap-2"
          >
            <Wrench className="h-4 w-4" /> Documentatie tehnica
          </Button>
        )}
      </div>

      <Separator />

      {tab === "user" ? <UserGuide /> : isAdmin ? <TechnicalGuide /> : <UserGuide />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   USER GUIDE
   ═══════════════════════════════════════════════════════ */

function UserGuide() {
  return (
    <div className="space-y-8">

      {/* Dashboard */}
      <Section>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <H2>Panou principal (Dashboard)</H2>
        </div>
        <P>Pagina principala afiseaza un sumar al calitatii apelurilor din centrul de apeluri.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Phone, label: "Total apeluri analizate", desc: "Numarul total de apeluri procesate de sistem." },
            { icon: BarChart3, label: "Scor mediu calitate", desc: "Media scorurilor QA pentru toti agentii." },
            { icon: AlertTriangle, label: "Esecuri critice", desc: "Apeluri care au esuat la reguli critice." },
            { icon: CheckCircle2, label: "In asteptare revizie", desc: "Apeluri care necesita revizuirea supervizorului." },
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
        <P>Tabelul de mai jos arata apelurile semnalate pentru revizie — apelurile cu probleme de conformitate.</P>
      </Section>

      <Separator />

      {/* Calls Explorer */}
      <Section>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <H2>Apeluri (Calls Explorer)</H2>
        </div>
        <P>Pagina de apeluri permite navigarea, cautarea si filtrarea tuturor inregistrarilor procesate.</P>
        <div className="space-y-2">
          {[
            { icon: Search, title: "Cautare", desc: "Filtreaza dupa ID apel, nume agent sau numar de telefon." },
            { icon: SlidersHorizontal, title: "Filtre avansate", desc: "Filtreaza dupa status, agent, directie (inbound/outbound), scor minim/maxim, sesiune de ingestie." },
            { icon: ArrowRight, title: "Sortare", desc: "Click pe antetul coloanelor (Data, Agent, Durata, Scor) pentru sortare." },
            { icon: PhoneIncoming, title: "Directie", desc: "Fiecare apel arata directia: In (inbound - client suna) sau Out (outbound - agent suna)." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-lg border">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <P>{desc}</P>
              </div>
            </div>
          ))}
        </div>
        <P>Apelurile neeligibile (mesagerie vocala, prea scurte) sunt marcate cu <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">N/A</Badge> si nu afecteaza statisticile.</P>
      </Section>

      <Separator />

      {/* Call Detail */}
      <Section>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <H2>Detalii apel</H2>
        </div>
        <P>Click pe un apel pentru a vedea detaliile complete.</P>
        <div className="space-y-2">
          <H3>Continut pagina:</H3>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li><strong>Player audio</strong> — ascultati inregistrarea direct din browser.</li>
            <li><strong>Rezumat AI</strong> — un sumar generat automat al conversatiei.</li>
            <li><strong>Recomandari</strong> — sfaturi de imbunatatire pentru agent.</li>
            <li><strong>Transcript</strong> — transcriptul complet cu vorbitori colorati diferit.</li>
            <li><strong>Scorecard QA</strong> — scorul per regula cu explicatii detaliate.</li>
            <li><strong>Informatii apel</strong> — agent, telefon client, durata, directie.</li>
            <li><strong>Info File</strong> — datele brute din fisierul .info (expandabil).</li>
          </ul>
          <H3>Actiuni disponibile:</H3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><RotateCcw className="h-3 w-3" /> Reanalizeaza — retrimite apelul la AI cu regulile curente</Badge>
            <Badge variant="outline" className="gap-1"><Trash2 className="h-3 w-3" /> Sterge — elimina apelul din sistem</Badge>
          </div>
        </div>
      </Section>

      <Separator />

      {/* Agents Hub */}
      <Section>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <H2>Agenti (Agents Hub)</H2>
        </div>
        <P>Pagina de agenti ofera o vedere de ansamblu a performantei fiecarui agent.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Carduri sumar</strong> — total agenti, total apeluri, scor mediu, conformitate medie.</li>
          <li><strong>Grafic scor per agent</strong> — scorul mediu QA pentru fiecare agent (cod de culori).</li>
          <li><strong>Distributia scorurilor</strong> — grafic circular: excelent / bun / slab, filtrabil per agent.</li>
          <li><strong>Apeluri per agent</strong> — numarul de apeluri procesate per agent.</li>
          <li><strong>Tabel detaliat</strong> — sortabil, cu scor, conformitate, durata medie, apeluri semnalate.</li>
          <li><strong>Detalii agent</strong> — click pe un rand pentru a vedea detalii extinse + link catre apelurile agentului.</li>
        </ul>
        <P>Apelurile neeligibile nu sunt incluse in statisticile agentilor.</P>
      </Section>

      <Separator />

      {/* QA Rules */}
      <Section>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <H2>Reguli QA</H2>
        </div>
        <P>Pagina de reguli permite gestionarea criteriilor de evaluare a calitatii apelurilor.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ListChecks className="h-4 w-4 text-primary" />
                <p className="font-medium text-sm">Regula de scoring</p>
              </div>
              <p className="text-xs text-muted-foreground">Are un scor maxim (ex: 5 puncte). AI evalueaza si returneaza scorul + explicatie.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-4 w-4 text-blue-500" />
                <p className="font-medium text-sm">Regula de extractie</p>
              </div>
              <p className="text-xs text-muted-foreground">Extrage o valoare din transcript (ex: numele clientului, motivul apelului).</p>
            </CardContent>
          </Card>
        </div>
        <H3>Gestionare reguli:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Adaugare:</strong> Click pe butonul &quot;+&quot;. Completati titlul, descrierea, sectiunea, scorul maxim.</li>
          <li><strong>Editare:</strong> Click pe iconita creion.</li>
          <li><strong>Stergere:</strong> Click pe iconita cos.</li>
          <li><strong>Reordonare:</strong> Folositi sagetile sus/jos. Regulile sunt evaluate in aceasta ordine.</li>
          <li><strong>Activare/Dezactivare:</strong> Toggle-ul de pe fiecare regula. Regulile dezactivate nu sunt trimise la AI.</li>
          <li><strong>Regula critica:</strong> Toggle-ul &quot;Regula critica&quot; in editare. Esecul unei reguli critice marcheaza apelul ca &quot;semnalat&quot; si afecteaza conformitatea agentului.</li>
          <li><strong>Directie:</strong> Fiecare regula poate fi setata pentru inbound, outbound, sau ambele. Regulile sunt filtrate automat in functie de directia apelului.</li>
        </ul>
        <H3>Prompt principal:</H3>
        <P>Instructiunea de sistem trimisa AI-ului inainte de fiecare analiza. Seteaza contextul si tonul evaluarii. Regulile sunt adaugate automat ca criterii de evaluare numerotate.</P>
      </Section>

      <Separator />

      {/* Export */}
      <Section>
        <div className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          <H2>Export</H2>
        </div>
        <P>Exportati datele apelurilor in format CSV.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>Aplicati filtre (status, agent, sesiune, scor) pentru a exporta un subset.</li>
          <li>Toggle &quot;Include scoruri per regula&quot; — adauga o coloana pentru fiecare regula QA.</li>
          <li>Fisierul CSV include: metadate apel, scoruri, nota, rezumat AI.</li>
          <li>Numele fisierului contine data si ora exportului.</li>
        </ul>
      </Section>

      <Separator />

      {/* Logs */}
      <Section>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <H2>Loguri si monitorizare</H2>
        </div>
        <P>Pagina de loguri afiseaza starea procesarii si evenimentele in timp real.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Carduri status</strong> — stare ingestie, fisiere in coada, total procesate, esuate.</li>
          <li><strong>Sesiuni de procesare</strong> — istoricul procesarilor cu progres, durata, actiuni (oprire/continuare/stergere).</li>
          <li><strong>Jurnal live</strong> — ultimele evenimente de procesare, expandabile cu click.</li>
          <li><strong>Operatiuni de procesare</strong> — coada de fisiere cu status si progres individual.</li>
          <li><strong>Flux de procesare</strong> — cei 4 pasi: descarcare, transcriere, analiza, stocare.</li>
        </ul>
      </Section>

      <Separator />

      {/* Settings */}
      <Section>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <H2>Setari</H2>
        </div>
        <P>Trei pagini de setari configureaza sursele de date si integrarile:</P>
        <div className="space-y-3">
          {[
            { icon: Database, label: "Ingestie date", desc: "Configurarea sursei SFTP/S3 pentru inregistrari. Calea de descarcare, programarea zilnica, si triggerul manual." },
            { icon: Brain, label: "AI si transcriere", desc: "Cheia API pentru serviciul de analiza AI. Configurarea transcrierii (limba, vocabular personalizat, context)." },
            { icon: Webhook, label: "Export si webhook-uri", desc: "Endpoint pentru trimiterea automata a rezultatelor QA dupa procesare." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-3 p-4 rounded-lg border">
              <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <P>{desc}</P>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Language + Auth */}
      <Section>
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <H2>Limba si autentificare</H2>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Schimbarea limbii:</strong> Click pe butonul de limba din bara laterala pentru a comuta intre Romana si English.</li>
          <li><strong>Autentificare:</strong> Sistemul necesita autentificare. Contactati administratorul pentru credentiale.</li>
          <li><strong>Roluri:</strong> Admin (acces complet, gestionare utilizatori), Manager (acces complet fara gestionare utilizatori), Viewer (doar vizualizare).</li>
          <li><strong>Deconectare:</strong> Click pe butonul de deconectare din bara laterala.</li>
        </ul>
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TECHNICAL GUIDE
   ═══════════════════════════════════════════════════════ */

function TechnicalGuide() {
  return (
    <div className="space-y-8">

      {/* Architecture */}
      <Section>
        <H2>Arhitectura</H2>
        <P>Sistem compus din 3 containere Docker:</P>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: "Frontend", tech: "Next.js 15, React 19", desc: "Port configurabil via .env" },
            { name: "Backend", tech: "FastAPI, Python 3.12", desc: "Port configurabil via .env" },
            { name: "Database", tech: "PostgreSQL 16", desc: "Port 5432" },
          ].map(({ name, tech, desc }) => (
            <Card key={name} className="bg-muted/40">
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold text-sm">{name}</p>
                <p className="text-xs text-muted-foreground">{tech}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Data Flow */}
      <Section>
        <H2>Flux de date</H2>
        <P>Pipeline-ul de procesare a apelurilor:</P>
        <div className="space-y-2">
          {[
            { step: "1", title: "Descarcare", desc: "Conectare la SFTP/S3, listare fisiere audio, descarcare in local." },
            { step: "2", title: "Parsarea metadatelor", desc: "Extragere agent, telefon, durata, directie din fisierul .info." },
            { step: "3", title: "Transcriere", desc: "Trimitere audio la Soniox. Rezultat: transcript cu diarizare (identificare vorbitori)." },
            { step: "4", title: "Analiza AI", desc: "Trimitere transcript + reguli la LLM. Rezultat: scor per regula, rezumat, recomandari." },
            { step: "5", title: "Stocare", desc: "Salvare rezultate in PostgreSQL. Trimitere webhook daca este configurat." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3 p-3 rounded-lg border">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <P>{desc}</P>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Database */}
      <Section>
        <H2>Schema bazei de date</H2>
        <div className="space-y-2">
          {[
            { table: "calls", desc: "Apeluri cu metadate, scoruri AI, directie, eligibilitate, request/response LLM." },
            { table: "transcript_lines", desc: "Linii de transcript (vorbitor, timestamp, text). FK catre calls.id cu cascade delete." },
            { table: "scorecard_entries", desc: "Rezultate per regula (scor, passed, detalii). FK catre calls.id cu cascade delete." },
            { table: "qa_rules", desc: "Reguli de evaluare cu directie (inbound/outbound/both), is_critical, enabled." },
            { table: "ingestion_runs", desc: "Sesiuni de procesare (progres, status, fisiere)." },
            { table: "transcription_jobs", desc: "Operatiuni de transcriere per fisier." },
            { table: "log_entries", desc: "Jurnalul evenimentelor de procesare." },
            { table: "settings", desc: "Configurari (SFTP, S3, LLM, Soniox, webhook) — valori sensibile criptate." },
            { table: "users", desc: "Utilizatori cu roluri (admin/manager/viewer), parole bcrypt." },
          ].map(({ table, desc }) => (
            <div key={table} className="flex gap-3 p-2 rounded-lg border">
              <Badge variant="outline" className="font-mono text-xs shrink-0">{table}</Badge>
              <P>{desc}</P>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Scoring */}
      <Section>
        <H2>Sistem de scorare</H2>
        <P>Scorul general este un procentaj calculat de AI:</P>
        <div className="bg-muted rounded-lg p-3 font-mono text-xs mt-1 mb-3">
          overallScore = (totalEarned / totalPossible) x 100
        </div>
        <P>Doar regulile de scoring contribuie. Regulile de extractie nu au scor.</P>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { label: "Excelent", color: "bg-green-100 text-green-800 border-green-200", range: ">= 90%" },
            { label: "Bun", color: "bg-blue-100 text-blue-800 border-blue-200", range: "75–89%" },
            { label: "Acceptabil", color: "bg-yellow-100 text-yellow-800 border-yellow-200", range: "60–74%" },
            { label: "Slab", color: "bg-red-100 text-red-800 border-red-200", range: "< 60%" },
          ].map(({ label, color, range }) => (
            <div key={label} className={`p-3 rounded-lg border flex-1 min-w-[120px] ${color}`}>
              <p className="text-sm font-bold">{label}</p>
              <p className="text-xs">{range}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-red-600" />
            <p className="text-sm font-bold text-red-800">Reguli critice</p>
          </div>
          <P>Daca o regula marcata ca &quot;critica&quot; esueaza, apelul este semnalat automat si conformitatea agentului scade.</P>
        </div>
        <div className="mt-3 p-3 rounded-lg border border-orange-200 bg-orange-50">
          <p className="text-sm font-bold text-orange-800 mb-1">Apeluri neeligibile</p>
          <P>AI determina automat daca apelul este eligibil (mesagerie vocala, prea scurt, fara interactiune reala). Apelurile neeligibile nu afecteaza statisticile.</P>
        </div>
      </Section>

      <Separator />

      {/* Security */}
      <Section>
        <H2>Securitate</H2>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Autentificare JWT</strong> — access token (1h) + refresh token (7 zile).</li>
          <li><strong>Parole</strong> — hash bcrypt, minim 8 caractere, cel putin o litera mare si o cifra.</li>
          <li><strong>Criptare setari</strong> — cheile API si parolele din setari sunt criptate AES-256 in baza de date.</li>
          <li><strong>CORS</strong> — configurat doar pentru originile din .env.</li>
          <li><strong>Toate endpoint-urile protejate</strong> — necesita Bearer token valid (exceptie: login, refresh).</li>
        </ul>
      </Section>

      <Separator />

      {/* Configuration */}
      <Section>
        <H2>Configurare (.env)</H2>
        <P>Toate configurarile sunt centralizate in fisierul .env din radacina proiectului:</P>
        <div className="space-y-1 mt-2">
          {[
            { key: "SERVER_HOST", desc: "IP-ul serverului" },
            { key: "FRONTEND_PORT / BACKEND_PORT", desc: "Porturile serviciilor" },
            { key: "JWT_SECRET_KEY", desc: "Cheia secreta pentru tokenuri JWT (obligatoriu)" },
            { key: "ENCRYPTION_KEY", desc: "Cheia de criptare pentru setari sensibile (obligatoriu)" },
            { key: "POSTGRES_*", desc: "Credentiale baza de date" },
            { key: "OPENROUTER_API_KEY", desc: "Cheia API pentru analiza AI" },
            { key: "SONIOX_API_KEY", desc: "Cheia API pentru transcriere" },
            { key: "SFTP_* / S3_*", desc: "Credentiale sursa de inregistrari" },
            { key: "TZ", desc: "Fusul orar (default: Europe/Bucharest)" },
            { key: "INGEST_CRON_HOUR", desc: "Ora de ingestie zilnica automata" },
          ].map(({ key, desc }) => (
            <div key={key} className="flex gap-3 py-1">
              <Badge variant="outline" className="font-mono text-xs shrink-0">{key}</Badge>
              <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* API Endpoints */}
      <Section>
        <H2>Endpoint-uri API</H2>
        <div className="space-y-1 mt-2">
          {[
            { method: "POST", path: "/api/auth/login", desc: "Autentificare" },
            { method: "POST", path: "/api/auth/refresh", desc: "Reinnoirea tokenului" },
            { method: "GET", path: "/api/calls", desc: "Lista apeluri cu filtre si paginare" },
            { method: "GET", path: "/api/calls/{id}", desc: "Detalii apel complet" },
            { method: "GET", path: "/api/calls/stats", desc: "Statistici dashboard" },
            { method: "GET", path: "/api/calls/agents/stats", desc: "Statistici per agent" },
            { method: "GET", path: "/api/calls/export/csv", desc: "Export CSV" },
            { method: "DELETE", path: "/api/calls/{id}", desc: "Stergere apel" },
            { method: "POST", path: "/api/analyze", desc: "Analiza/reanaliza apel cu AI" },
            { method: "GET", path: "/api/rules", desc: "Lista reguli QA" },
            { method: "POST/PUT/DELETE", path: "/api/rules/*", desc: "CRUD reguli" },
            { method: "POST", path: "/api/ingestion/trigger", desc: "Declansare ingestie manuala" },
            { method: "GET", path: "/api/settings/{key}", desc: "Citire setari" },
            { method: "PUT", path: "/api/settings/{key}", desc: "Salvare setari" },
          ].map(({ method, path, desc }) => (
            <div key={path + method} className="flex items-center gap-3 py-1">
              <Badge variant="secondary" className="font-mono text-xs w-14 justify-center shrink-0">{method.split("/")[0]}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{path}</span>
              <span className="text-xs text-muted-foreground ml-auto">{desc}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
