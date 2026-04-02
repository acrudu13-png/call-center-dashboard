"use client";

import { useTranslation } from "@/lib/i18n";
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
  UserCog,
  Calendar,
  Settings,
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
  const { t, locale } = useTranslation();
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t.docs.title}</h1>
        </div>
        <P>{t.docs.subtitle}</P>
      </div>

      <Separator />

      {locale === "en" ? <UserGuideEn /> : <UserGuide />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   USER GUIDE — ROMANA
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
            { icon: SlidersHorizontal, title: "Filtre avansate", desc: "Filtreaza dupa status, agent, directie (inbound/outbound), tip apel, scor minim/maxim, sesiune de ingestie, regula esuata." },
            { icon: Calendar, title: "Interval de date", desc: "Filtreaza apelurile dupa data de inceput si data de sfarsit." },
            { icon: PhoneIncoming, title: "Directie", desc: "Fiecare apel arata directia: In (inbound - client suna) sau Out (outbound - agent suna). Filtreaza apelurile dupa directie." },
            { icon: Tag, title: "Tip apel", desc: "Filtreaza dupa tipul de apel clasificat automat de AI (ex: suport, vanzari, reclamatii)." },
            { icon: ArrowRight, title: "Sortare", desc: "Click pe antetul coloanelor (Data, Agent, Durata, Scor) pentru sortare ascendenta/descendenta." },
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
        <H3>Reanaliza in masa:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Reclasifica tipuri:</strong> Butonul retrimite toate apelurile din filtrele curente la AI doar pentru reclasificarea tipului de apel, fara a rula regulile QA. Util dupa modificarea tipurilor sau a promptului de clasificare.</li>
          <li><strong>Reanalizeaza tot:</strong> Butonul retrimite toate apelurile din filtrele curente la AI pentru reevaluare completa (clasificare + reguli QA).</li>
          <li><strong>Progres live:</strong> In timpul reanalizei/reclasificarii, un indicator arata progresul (ex: 15/120 apeluri procesate).</li>
          <li><strong>Oprire:</strong> Butonul rosu opreste operatiunea in curs fara a afecta apelurile deja procesate.</li>
        </ul>
        <P>Apelurile neeligibile (mesagerie vocala, prea scurte) sunt marcate cu <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">N/A</Badge> si nu afecteaza statisticile.</P>
        <P>Numarul de randuri per pagina poate fi ajustat: 10, 25, 50 sau 100.</P>
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
            <li><strong>Transcript</strong> — transcriptul complet cu vorbitori colorati diferit. Numele vorbitorilor sunt identificate automat (agent + client).</li>
            <li><strong>Scorecard QA</strong> — scorul per regula cu explicatii detaliate. Regulile de scoring arata punctele obtinute/posibile, iar regulile de extractie arata valoarea extrasa.</li>
            <li><strong>Informatii apel</strong> — agent, telefon client, durata, directie, tip apel, data procesarii.</li>
            <li><strong>Eligibilitate</strong> — apelurile neeligibile (voicemail, prea scurte) sunt marcate cu motivul.</li>
            <li><strong>Info File</strong> — datele brute din fisierul .info (expandabil).</li>
          </ul>
          <H3>Actiuni disponibile:</H3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><RotateCcw className="h-3 w-3" /> Reanalizeaza — retrimite apelul la AI cu regulile curente</Badge>
            <Badge variant="outline" className="gap-1"><Trash2 className="h-3 w-3" /> Sterge — elimina apelul din sistem</Badge>
          </div>
          <H3>Gandire extinsa (Extended Thinking):</H3>
          <P>La reanaliza, activati optiunea &quot;Extended Thinking&quot; pentru a oferi AI-ului un buget de gandire suplimentar (1.024 — 128.000 tokeni). Aceasta imbunatateste calitatea analizei pentru apeluri complexe, dar creste timpul de procesare.</P>
          <H3>Mod de test (Test Mode):</H3>
          <P>Panoul de test permite compararea mai multor modele AI pe acelasi apel:</P>
          <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
            <li>Adaugati/eliminati modele pentru comparatie.</li>
            <li>Ajustati temperatura si numarul maxim de tokeni.</li>
            <li>Activati &quot;Dry Run&quot; pentru a testa fara a salva rezultatele.</li>
            <li>Rezultatele sunt afisate intr-un tabel comparativ cu scor, nota, puncte, esecuri critice si timp de executie.</li>
            <li>Expandati fiecare model pentru detalii: rezumat, recomandari, scoruri per regula, raspuns brut LLM.</li>
          </ul>
          <H3>Depanare LLM:</H3>
          <P>Sectiunea de depanare (expandabila) contine tab-uri cu: transcriptul complet, regulile trecute/esuate, JSON-ul brut si gandul AI-ului (daca este disponibil).</P>
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
        <P>Pagina de reguli este organizata in doua tab-uri: agentul principal de evaluare si agentul de clasificare a tipului de apel.</P>

        <H3>Tab 1: Reguli Agent Principal</H3>
        <P>Gestioneaza criteriile de evaluare a calitatii apelurilor si promptul principal.</P>
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
          <li><strong>Tip apel:</strong> Fiecare regula poate fi asociata cu anumite tipuri de apel. Gol = se aplica la toate tipurile.</li>
        </ul>
        <H3>Prompt principal:</H3>
        <P>Instructiunea de sistem trimisa AI-ului inainte de fiecare analiza. Seteaza contextul si tonul evaluarii. Regulile sunt adaugate automat ca criterii de evaluare numerotate.</P>

        <Separator className="my-4" />

        <H3>Tab 2: Agent Tip Apel</H3>
        <P>Configureaza agentul AI care clasifica automat fiecare apel intr-o categorie (ex: suport, vanzari, reclamatii).</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Model:</strong> Modelul OpenRouter folosit pentru clasificare (ex: openai/gpt-5-nano). Poate fi diferit de modelul principal de analiza.</li>
          <li><strong>Prompt sistem:</strong> Instructiunea de sistem trimisa agentului de clasificare. Tipurile de apel sunt adaugate automat.</li>
          <li><strong>Temperatura:</strong> Valori mai mici (0) produc clasificari mai consistente.</li>
        </ul>
        <H3>Gestionare tipuri de apel:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Adaugare:</strong> Click pe &quot;Adauga Tip&quot;. Fiecare tip are o cheie unica (snake_case), un nume si o descriere.</li>
          <li><strong>Descriere:</strong> Descrierea este trimisa AI-ului pentru a intelege categoria — cu cat este mai clara, cu atat clasificarea este mai precisa.</li>
          <li><strong>Editare:</strong> Click pe iconita creion pentru a modifica numele sau descrierea.</li>
          <li><strong>Activare/Dezactivare:</strong> Tipurile dezactivate nu sunt incluse in clasificare.</li>
          <li><strong>Stergere:</strong> Click pe iconita cos pentru a elimina un tip.</li>
        </ul>
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
          <li><strong>Statistici:</strong> Patru carduri arata totalul apelurilor, completate, semnalate si in revizie.</li>
          <li><strong>Cautare:</strong> Filtreaza dupa ID apel sau nume agent.</li>
          <li>Aplicati filtre (status, agent, sesiune, scor) pentru a exporta un subset.</li>
          <li>Toggle &quot;Include scoruri per regula&quot; — adauga o coloana pentru fiecare regula QA in CSV.</li>
          <li>Fisierul CSV include: metadate apel, scoruri, nota, rezumat AI.</li>
          <li>Numele fisierului contine data si ora exportului.</li>
          <li>Butonul &quot;Sterge filtre&quot; reseteaza toate filtrele cu un click.</li>
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
          <Settings className="h-5 w-5 text-primary" />
          <H2>Setari</H2>
        </div>
        <P>Trei pagini de setari configureaza sursele de date si integrarile:</P>
        <div className="space-y-3">
          {[
            { icon: Database, label: "Ingestie date", desc: "Configurarea sursei SFTP/S3 pentru inregistrari, parsarea metadatelor, programarea zilnica si triggerul manual." },
            { icon: Brain, label: "AI si transcriere", desc: "Cheia API OpenRouter, modelul implicit, temperatura, modele disponibile, transcriere Soniox, vocabular personalizat si context apeluri." },
            { icon: Webhook, label: "Export si webhook-uri", desc: "Endpoint pentru trimiterea automata a rezultatelor QA, test conectivitate, previzualizare payload." },
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

        <H3>Ingestie date — detalii:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>SFTP:</strong> Host, port, username, parola sau cheie SSH. Calea suporta variabila <code className="bg-muted px-1 rounded text-xs">$yesterday_date</code> care se rezolva automat la data zilei precedente.</li>
          <li><strong>Test conexiune:</strong> Butonul testeaza conectivitatea SFTP fara a salva setarile.</li>
          <li><strong>S3:</strong> Bucket, regiune, access key, secret key, prefix pentru filtrarea obiectelor.</li>
          <li><strong>Parsare fisiere:</strong> Pattern regex cu grupuri de captura (phone, date, time) pentru extragerea metadatelor din numele fisierelor. Previzualizare live a rezultatelor.</li>
          <li><strong>Procesare paralela:</strong> Numarul de fisiere procesate simultan (1-20). Recomandat: 3-5.</li>
          <li><strong>Durata minima:</strong> Apelurile mai scurte decat pragul setat (secunde) sunt marcate ca neeligibile si nu sunt analizate.</li>
          <li><strong>Programare:</strong> Rulare automata zilnica la ora configurata (toggle activare/dezactivare).</li>
          <li><strong>Verificare manuala:</strong> Butonul &quot;Verifica acum&quot; porneste ingestia imediat, cu optiunea de a specifica o cale diferita.</li>
        </ul>

        <H3>AI si transcriere — detalii:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Cheie API OpenRouter:</strong> Necesara pentru analiza AI si clasificarea apelurilor.</li>
          <li><strong>Model implicit:</strong> Modelul folosit pentru analiza QA. Poate fi schimbat oricand.</li>
          <li><strong>Modele disponibile:</strong> Gestionati lista de modele — click pe un model pentru a-l seta ca implicit, X pentru a-l elimina din lista.</li>
          <li><strong>Temperatura:</strong> Valori mai mici (0.0-0.2) produc rezultate mai consistente.</li>
          <li><strong>Max tokeni:</strong> Limita de tokeni pentru raspunsul AI.</li>
          <li><strong>Soniox:</strong> Cheie API, limba si modelul pentru transcriere speech-to-text.</li>
          <li><strong>Vocabular personalizat:</strong> Adaugati termeni specifici domeniului (nume produse, termeni financiari, jargon romanesc) pentru imbunatatirea transcrierii.</li>
          <li><strong>Context apeluri:</strong> Text liber despre natura apelurilor (reguli de business, fluxuri agent, proceduri GDPR). Injectat in fiecare prompt de analiza.</li>
        </ul>

        <H3>Webhook-uri — detalii:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Endpoint URL:</strong> Adresa unde sunt trimise automat rezultatele QA dupa procesare.</li>
          <li><strong>Activare/Dezactivare:</strong> Toggle pentru oprirea temporara a trimiterii webhook-urilor.</li>
          <li><strong>Numar reincercari:</strong> Cate ori sa reincerce trimiterea in caz de esec.</li>
          <li><strong>Test conexiune:</strong> Trimite un request de test la endpoint pentru validare.</li>
          <li><strong>Header-uri:</strong> Previzualizare a header-elor HTTP incluse in request.</li>
          <li><strong>Payload exemplu:</strong> Structura JSON trimisa, include: eveniment, ID apel, timestamp, scoruri, agent, durata.</li>
        </ul>
      </Section>

      <Separator />

      {/* Users */}
      <Section>
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <H2>Gestionare utilizatori</H2>
        </div>
        <P>Pagina de utilizatori permite administratorilor sa gestioneze conturile si permisiunile.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Carduri sumar:</strong> Numarul de utilizatori per rol (Admin, Manager, Viewer).</li>
          <li><strong>Creare utilizator:</strong> Username, nume complet, email, parola, rol.</li>
          <li><strong>Editare:</strong> Modificarea numelui, emailului, rolului si restrictiilor (parola nu poate fi editata).</li>
          <li><strong>Activare/Dezactivare:</strong> Toggle pentru a dezactiva temporar un cont (nu poate fi aplicat propriului cont).</li>
          <li><strong>Stergere:</strong> Eliminarea permanenta a unui cont (nu poate fi aplicat propriului cont).</li>
        </ul>
        <H3>Roluri:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Admin:</strong> Acces complet la toate paginile + gestionare utilizatori.</li>
          <li><strong>Manager:</strong> Acces complet la functionalitati fara gestionare utilizatori.</li>
          <li><strong>Viewer:</strong> Acces doar in mod vizualizare (nu poate modifica reguli, setari sau analiza apeluri).</li>
        </ul>
        <H3>Restrictii granulare (Manager si Viewer):</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Restrictii agenti:</strong> Limiteaza vizualizarea doar la apelurile anumitor agenti. Gol = toti agentii.</li>
          <li><strong>Restrictii pagini:</strong> Limiteaza accesul la anumite pagini ale aplicatiei. Gol = toate paginile.</li>
        </ul>
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
          <li><strong>Deconectare:</strong> Click pe butonul de deconectare din bara laterala.</li>
        </ul>
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   USER GUIDE — ENGLISH
   ═══════════════════════════════════════════════════════ */

function UserGuideEn() {
  return (
    <div className="space-y-8">
      {/* Dashboard */}
      <Section>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <H2>Dashboard</H2>
        </div>
        <P>The main page displays a summary of call center quality.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Phone, label: "Total calls analyzed", desc: "Total number of calls processed by the system." },
            { icon: BarChart3, label: "Average quality score", desc: "Average QA score across all agents." },
            { icon: AlertTriangle, label: "Critical failures", desc: "Calls that failed critical rules." },
            { icon: CheckCircle2, label: "Pending review", desc: "Calls awaiting supervisor review." },
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
        <P>The table below shows calls flagged for review — calls with compliance issues.</P>
      </Section>

      <Separator />

      {/* Calls Explorer */}
      <Section>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <H2>Calls Explorer</H2>
        </div>
        <P>Browse, search, and filter all processed call recordings.</P>
        <div className="space-y-2">
          {[
            { icon: Search, title: "Search", desc: "Filter by call ID, agent name, or phone number." },
            { icon: SlidersHorizontal, title: "Advanced filters", desc: "Filter by status, agent, direction (inbound/outbound), call type, score range, ingestion run, failed rule." },
            { icon: Calendar, title: "Date range", desc: "Filter calls by start date and end date." },
            { icon: PhoneIncoming, title: "Direction", desc: "Each call shows direction: In (inbound — customer calls) or Out (outbound — agent calls). Filter calls by direction." },
            { icon: Tag, title: "Call type", desc: "Filter by the automatically classified call type (e.g. support, sales, complaints)." },
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
        </div>
        <H3>Bulk reanalysis:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Reclassify types:</strong> Resends all calls matching current filters to AI for call type reclassification only, without running QA rules. Useful after modifying call types or the classification prompt.</li>
          <li><strong>Reanalyze all:</strong> Resends all calls matching current filters to AI for full re-evaluation (classification + QA rules).</li>
          <li><strong>Live progress:</strong> During reanalysis/reclassification, a counter shows progress (e.g. 15/120 calls processed).</li>
          <li><strong>Stop:</strong> The red stop button halts the operation without affecting already processed calls.</li>
        </ul>
        <P>Ineligible calls (voicemail, too short) are marked with <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">N/A</Badge> and do not affect statistics.</P>
        <P>Rows per page can be adjusted: 10, 25, 50, or 100.</P>
      </Section>

      <Separator />

      {/* Call Detail */}
      <Section>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <H2>Call Details</H2>
        </div>
        <P>Click a call to view full details.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Audio player</strong> — listen to the recording directly in the browser.</li>
          <li><strong>AI Summary</strong> — auto-generated conversation summary.</li>
          <li><strong>Recommendations</strong> — improvement tips for the agent.</li>
          <li><strong>Transcript</strong> — full transcript with color-coded speakers. Speaker names are automatically identified (agent + customer).</li>
          <li><strong>QA Scorecard</strong> — per-rule scores with detailed explanations. Scoring rules show points earned/possible, extraction rules show the extracted value.</li>
          <li><strong>Call info</strong> — agent, customer phone, duration, direction, call type, processed date.</li>
          <li><strong>Eligibility</strong> — ineligible calls (voicemail, too short) are marked with the reason.</li>
          <li><strong>Info File</strong> — raw data from the .info file (expandable).</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="gap-1"><RotateCcw className="h-3 w-3" /> Reanalyze — resend to AI with current rules</Badge>
          <Badge variant="outline" className="gap-1"><Trash2 className="h-3 w-3" /> Delete — remove from system</Badge>
        </div>
        <H3>Extended Thinking:</H3>
        <P>When reanalyzing, enable &quot;Extended Thinking&quot; to give the AI an additional thinking budget (1,024 — 128,000 tokens). This improves analysis quality for complex calls but increases processing time.</P>
        <H3>Test Mode:</H3>
        <P>The test panel allows comparing multiple AI models on the same call:</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li>Add/remove models for comparison.</li>
          <li>Adjust temperature and max tokens.</li>
          <li>Enable &quot;Dry Run&quot; to test without saving results.</li>
          <li>Results are displayed in a comparison table with score, grade, points, critical failures, and execution time.</li>
          <li>Expand each model for details: summary, recommendations, per-rule scores, raw LLM response.</li>
        </ul>
        <H3>LLM Debug:</H3>
        <P>The debug section (expandable) contains tabs with: full transcript, passed/failed rules, raw JSON, and AI thinking (if available).</P>
      </Section>

      <Separator />

      {/* Agents Hub */}
      <Section>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <H2>Agents Hub</H2>
        </div>
        <P>Overview of each agent&apos;s performance.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Summary cards</strong> — total agents, total calls, average score, average compliance.</li>
          <li><strong>Score chart</strong> — average QA score per agent (color-coded).</li>
          <li><strong>Score distribution</strong> — pie chart: excellent / good / poor, filterable per agent.</li>
          <li><strong>Calls per agent</strong> — number of calls processed per agent.</li>
          <li><strong>Detailed table</strong> — sortable, with score, compliance, average duration, flagged calls.</li>
          <li><strong>Agent detail</strong> — click a row for extended details + link to agent&apos;s calls.</li>
        </ul>
        <P>Ineligible calls are not included in agent statistics.</P>
      </Section>

      <Separator />

      {/* QA Rules */}
      <Section>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <H2>QA Rules</H2>
        </div>
        <P>The rules page is organized into two tabs: the main evaluation agent and the call type classification agent.</P>

        <H3>Tab 1: Main Agent Rules</H3>
        <P>Manage evaluation criteria for call quality analysis and the main prompt.</P>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ListChecks className="h-4 w-4 text-primary" />
                <p className="font-medium text-sm">Scoring rule</p>
              </div>
              <p className="text-xs text-muted-foreground">Has a max score (e.g. 5 points). AI evaluates and returns score + explanation.</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-4 w-4 text-blue-500" />
                <p className="font-medium text-sm">Extraction rule</p>
              </div>
              <p className="text-xs text-muted-foreground">Extracts a value from transcript (e.g. customer name, call reason).</p>
            </CardContent>
          </Card>
        </div>
        <H3>Managing rules:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Add:</strong> Click the &quot;+&quot; button. Fill in title, description, section, max score.</li>
          <li><strong>Edit:</strong> Click the pencil icon.</li>
          <li><strong>Delete:</strong> Click the trash icon.</li>
          <li><strong>Reorder:</strong> Use up/down arrows. Rules are evaluated in this order.</li>
          <li><strong>Enable/Disable:</strong> Toggle on each rule. Disabled rules are not sent to AI.</li>
          <li><strong>Critical rule:</strong> Toggle in edit. Failure marks the call as &quot;flagged&quot; and affects agent compliance.</li>
          <li><strong>Direction:</strong> Each rule can be set for inbound, outbound, or both. Automatically filtered by call direction.</li>
          <li><strong>Call type:</strong> Each rule can be associated with specific call types. Empty = applies to all types.</li>
        </ul>
        <H3>Main prompt:</H3>
        <P>The system instruction sent to the AI before each analysis. Sets the evaluation context and tone. Rules are automatically appended as numbered evaluation criteria.</P>

        <Separator className="my-4" />

        <H3>Tab 2: Call Type Agent</H3>
        <P>Configure the AI agent that automatically classifies each call into a category (e.g. support, sales, complaints).</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Model:</strong> The OpenRouter model used for classification (e.g. openai/gpt-5-nano). Can be different from the main analysis model.</li>
          <li><strong>System prompt:</strong> The system instruction sent to the classification agent. Call types are added automatically.</li>
          <li><strong>Temperature:</strong> Lower values (0) produce more consistent classifications.</li>
        </ul>
        <H3>Managing call types:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Add:</strong> Click &quot;Add Type&quot;. Each type has a unique key (snake_case), a name, and a description.</li>
          <li><strong>Description:</strong> The description is sent to the AI to understand the category — the clearer it is, the more accurate the classification.</li>
          <li><strong>Edit:</strong> Click the pencil icon to modify the name or description.</li>
          <li><strong>Enable/Disable:</strong> Disabled types are not included in classification.</li>
          <li><strong>Delete:</strong> Click the trash icon to remove a type.</li>
        </ul>
      </Section>

      <Separator />

      {/* Export */}
      <Section>
        <div className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          <H2>Export</H2>
        </div>
        <P>Export call data as CSV.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Statistics:</strong> Four cards show total calls, completed, flagged, and in review.</li>
          <li><strong>Search:</strong> Filter by call ID or agent name.</li>
          <li>Apply filters (status, agent, run, score) to export a subset.</li>
          <li>Toggle &quot;Include per-rule scores&quot; — adds a column for each QA rule in the CSV.</li>
          <li>CSV includes: call metadata, scores, grade, AI summary.</li>
          <li>Filename includes export date and time.</li>
          <li>The &quot;Clear filters&quot; button resets all filters with one click.</li>
        </ul>
      </Section>

      <Separator />

      {/* Logs */}
      <Section>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <H2>Logs &amp; Monitoring</H2>
        </div>
        <P>Processing status and real-time event logs.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Status cards</strong> — ingestion status, files in queue, total processed, failed.</li>
          <li><strong>Processing runs</strong> — history with progress, duration, actions (stop/resume/delete).</li>
          <li><strong>Live logs</strong> — recent processing events, expandable on click.</li>
          <li><strong>Processing jobs</strong> — file queue with status and individual progress.</li>
          <li><strong>Processing flow</strong> — 4 steps: download, transcribe, analyze, store.</li>
        </ul>
      </Section>

      <Separator />

      {/* Settings */}
      <Section>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <H2>Settings</H2>
        </div>
        <P>Three settings pages configure data sources and integrations:</P>
        <div className="space-y-3">
          {[
            { icon: Database, label: "Data Ingestion", desc: "SFTP/S3 source configuration for recordings, metadata parsing, daily schedule, and manual trigger." },
            { icon: Brain, label: "AI & Transcription", desc: "OpenRouter API key, default model, temperature, available models, Soniox transcription, custom vocabulary, and call context." },
            { icon: Webhook, label: "Export & Webhooks", desc: "Endpoint for automatic delivery of QA results, connection test, payload preview." },
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

        <H3>Data Ingestion — details:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>SFTP:</strong> Host, port, username, password or SSH key. Path supports <code className="bg-muted px-1 rounded text-xs">$yesterday_date</code> variable that auto-resolves to the previous day&apos;s date.</li>
          <li><strong>Test connection:</strong> Tests SFTP connectivity without saving settings.</li>
          <li><strong>S3:</strong> Bucket, region, access key, secret key, key prefix for filtering objects.</li>
          <li><strong>File parsing:</strong> Regex pattern with capture groups (phone, date, time) for extracting metadata from filenames. Live preview of results.</li>
          <li><strong>Parallel processing:</strong> Number of files processed simultaneously (1-20). Recommended: 3-5.</li>
          <li><strong>Minimum duration:</strong> Calls shorter than the threshold (seconds) are marked ineligible and not analyzed.</li>
          <li><strong>Schedule:</strong> Automatic daily run at the configured time (enable/disable toggle).</li>
          <li><strong>Manual check:</strong> The &quot;Check Now&quot; button starts ingestion immediately, with optional custom path override.</li>
        </ul>

        <H3>AI &amp; Transcription — details:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>OpenRouter API key:</strong> Required for AI analysis and call classification.</li>
          <li><strong>Default model:</strong> The model used for QA analysis. Can be changed anytime.</li>
          <li><strong>Available models:</strong> Manage the model list — click a model to set as default, X to remove from list.</li>
          <li><strong>Temperature:</strong> Lower values (0.0-0.2) produce more consistent results.</li>
          <li><strong>Max tokens:</strong> Token limit for AI response.</li>
          <li><strong>Soniox:</strong> API key, language, and model for speech-to-text transcription.</li>
          <li><strong>Custom vocabulary:</strong> Add domain-specific terms (product names, financial terms, Romanian jargon) to improve transcription accuracy.</li>
          <li><strong>Call context:</strong> Free-text about the nature of calls (business rules, agent workflows, GDPR procedures). Injected into every analysis prompt.</li>
        </ul>

        <H3>Webhooks — details:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Endpoint URL:</strong> The address where QA results are automatically sent after processing.</li>
          <li><strong>Enable/Disable:</strong> Toggle to temporarily stop webhook delivery.</li>
          <li><strong>Retry count:</strong> How many times to retry on failure.</li>
          <li><strong>Test connection:</strong> Sends a test request to the endpoint for validation.</li>
          <li><strong>Headers:</strong> Preview of HTTP headers included in the request.</li>
          <li><strong>Sample payload:</strong> Example JSON structure sent, includes: event, call ID, timestamp, scores, agent, duration.</li>
        </ul>
      </Section>

      <Separator />

      {/* Users */}
      <Section>
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <H2>User Management</H2>
        </div>
        <P>The users page allows administrators to manage accounts and permissions.</P>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Summary cards:</strong> Number of users per role (Admin, Manager, Viewer).</li>
          <li><strong>Create user:</strong> Username, full name, email, password, role.</li>
          <li><strong>Edit:</strong> Modify name, email, role, and restrictions (password cannot be edited).</li>
          <li><strong>Activate/Deactivate:</strong> Toggle to temporarily disable an account (cannot be applied to your own account).</li>
          <li><strong>Delete:</strong> Permanently remove an account (cannot be applied to your own account).</li>
        </ul>
        <H3>Roles:</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Admin:</strong> Full access to all pages + user management.</li>
          <li><strong>Manager:</strong> Full access to features without user management.</li>
          <li><strong>Viewer:</strong> Read-only access (cannot modify rules, settings, or analyze calls).</li>
        </ul>
        <H3>Granular restrictions (Manager and Viewer):</H3>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Agent restrictions:</strong> Limit visibility to only specific agents&apos; calls. Empty = all agents.</li>
          <li><strong>Page restrictions:</strong> Limit access to specific application pages. Empty = all pages.</li>
        </ul>
      </Section>

      <Separator />

      {/* Language + Auth */}
      <Section>
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          <H2>Language &amp; Authentication</H2>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
          <li><strong>Language switch:</strong> Click the language button in the sidebar to toggle between Romanian and English.</li>
          <li><strong>Authentication:</strong> The system requires login. Contact the administrator for credentials.</li>
          <li><strong>Sign out:</strong> Click the sign out button in the sidebar.</li>
        </ul>
      </Section>
    </div>
  );
}
