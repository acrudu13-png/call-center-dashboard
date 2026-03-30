"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Tag,
  ListChecks,
  PhoneIncoming,
  RotateCcw,
  Trash2,
  Languages,
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Documentatie</h1>
        </div>
        <P>CallQA Dashboard — ghid de utilizare.</P>
      </div>

      <Separator />

      <UserGuide />
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

