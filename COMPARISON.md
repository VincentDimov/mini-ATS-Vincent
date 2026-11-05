# Workspace-upgrade: jämförelse och leverans

Jämförelse av de lokala källkodsträden den 11 oktober 2026. Funktioner har implementerats i Vincents befintliga Next.js-arkitektur, inte genom att kopiera referensprojektens autentisering eller ersätta befintlig kandidatdata.

| Funktion i referensprojekten | Vincent efter uppgraderingen |
| --- | --- |
| Murshed: företagsregister och företagsspecifik administration | `/admin/organizations`, företagsredigering och flikindelad adminarbetsyta för varje företag |
| Murshed/Regine: användaradministration, roller och företag | `/admin/users`: skapa, redigera profil/roll/företag/åtkomst och radera Auth-konto; egen avstängning och radering blockeras |
| Murshed: company-admin, team och avstängning | Explicit `is_org_manager`, skapa/redigera/radera rekryterare i eget team, avstängning och jobbansvar i `/dashboard/team` |
| Murshed: jobbgrupper, medlemmar och jobblänkar | `/dashboard/groups`: hiring circles och databasstyrd åtkomst till begränsade jobb |
| Murshed: aktivitetslogg med filtrering | `/dashboard/activity`, `/admin/activity`: databasgenererade loggar med filter och CSV |
| Murshed: jobbdetaljer och löneintervall | Företags- och adminjobbdetaljer, löneintervall och befintlig jobbredigering/arkivering |
| Regine: globala jobb, kandidater och företag | `/admin/jobs`, `/admin/candidates` och företagsarbetsytor |
| Regine: kandidatanteckningar och tema | Delade författarmärkta kandidatanteckningar, taggar, ljus/mörk design |
| Referensprojekten: kandidatpipeline och CV | Befintlig Kanban, tillgänglig fasväljare, redigering, radering, privat PDF-CV och valfritt AI-stöd behålls och förstärks |

## Avancerade tillägg

- List-/Kanban-vy, fasfilter, sortering och sökning även i kandidat­taggar.
- Atomisk massflytt av upp till 100 kandidater: om en kandidat inte är tillgänglig rullas hela operationen tillbaka.
- CSV-export som neutraliserar användartext som annars kan bli kalkylbladsformler.
- Intervjuplanering med tidsvalidering, status, kandidat­länk och ICS-export. Exporten skickar inte e-postinbjudningar.
- Uppföljningsradar, fasfördelning, CV-täckning och jobböversikt; inga automatiserade kandidatbeslut.
- Global snabbsökning, Ctrl/Cmd+K, markerad navigation, mobilvy, skip-länk och minskade animationer vid systeminställning.
- Eget lösenordsbyte via Supabase Auth, skydd mot att ta bort egen adminåtkomst, omedelbar avstängning via RLS.
- CV-policy korrigerad för verkligt uppladdningsformat; filstädning vid byte/radering av CV och kandidat/jobb.

## Medvetna säkerhetsval

Referensprojektens klientbaserade impersonation ersätts med en tydligt markerad företagsvy där administratörens verkliga identitet behålls. Behörighet läses från skyddade profiler, inte klientflaggor eller redigerbar Auth-metadata. Privata CV:n ersätts inte med publika länkar. AI:s numeriska kandidatpoäng/automatiska rangordning kopieras inte: befintlig neutral sammanfattning stöder mänsklig bedömning. E-postadressändring kräver fortsatt en verifierad Auth-process och görs inte genom att skriva över profilens e-postfält.

## Databasändringen som behöver godkännas

Migration: `supabase/migrations/20261011181141_collaboration_workspace.sql`.

- Sex nya RLS-skyddade tabeller: `job_groups`, `group_members`, `group_jobs`, `candidate_notes`, `interviews`, `activity_log`.
- Profiler får `is_active` och `is_org_manager`. **Inga befintliga kundkonton upphöjs automatiskt.** Alla befintliga aktiva kundkonton fortsätter som rekryterare; platform-admin tilldelar ansvar uttryckligen i UI:t.
- Jobb får löneintervall, ansvarig och begränsad åtkomst (standard: inte begränsad). Kandidater får taggar.
- Åtkomstregler för profiler/jobb/kandidater/analyser/CV uppdateras för avstängda konton och begränsade jobb. Team kan se kollegornas profilnamn/e-post; inga Auth-lösenord är läsbara.
- Loggar skapas av databas­triggers med faktisk databasidentitet; klienter får inte skriva eller ändra loggar. Systemprovisionering via service-role markeras som System. Loggen innehåller inte CV-text, lösenord eller anteckningars brödtext.
- Befintliga organisationer, jobb, kandidater, analyser och CV:n tas inte bort av migrationen.

Molnmigrationen stoppades av den automatiska godkännandegranskningen eftersom den ändrar beständiga åtkomstregler. Den är därför **inte tillämpad i molnprojektet**. Lokala migrationer och tester använder endast separata testinstanser.

## Säker aktiveringsordning

1. Granska och godkänn migrationen. Ta verifierad backup/återställningspunkt i den befintliga Supabase-miljön.
2. Tillämpa endast den nya migrationen ovan, inte seeddata eller den gamla baseline på nytt.
3. Verifiera företagsisolering, befintlig inloggning och CV-uppladdning. Kontrollera Supabase security/performance advisors.
4. Merge `feature/workspace-upgrade` och distribuera den nya appen. Behåll servernycklar som serverhemligheter.
5. Tilldela utvalda kundkonton organisationsansvar och konfigurera grupper/begränsade jobb efter behov.

## Reproducerbara tester

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` och `npm audit --omit=dev`.

`tests/workspace-rls.sql` körs med `psql -v ON_ERROR_STOP=1` endast i isolerad lokal testdatabas efter migrationerna. Alla dess fixtures rullas tillbaka. `tests/local-supabase-bootstrap.sql` är en minimal disposable-Postgres-bootstrap, inte en migration och aldrig avsedd för en riktig Supabase-miljö.

`npm run test:e2e` använder en redan startad **lokal** Supabase-instans, bygger testkonton med slumpmässiga lösenord och startar appen mot den lokala instansen utan OpenAI-nyckel. Testverktyget vägrar icke-lokala adresser. Testdata får aldrig skapas i molnprojektet.

För lokal fullflödesverifiering (Docker krävs):

```bash
npx supabase start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor,mailpit
npx playwright install chromium
npm run test:e2e
```

Den lokala konfigurationen behåller publik registrering avstängd via `[auth].enable_signup=false`, men aktiverar e-postleverantören för befintliga kontons lösenordsinloggning.

Verifierat i leveransen: 8 enhet-/kontraktstester och 5 fullflödestester passerar, liksom isolerade PostgreSQL RLS-tester, ESLint, TypeScript och produktionsbuild. Desktop, mobil och mörkt läge har också kontrollerats visuellt. OpenAI-anrop och riktiga e-postutskick ingår inte i testkörningen.

Produktionsberoendena uppgraderades till en kontrollerad Next.js-version och `npm audit --omit=dev` rapporterar 0 sårbarheter. Full audit rapporterar fortfarande 5 höga advisories i utvecklingsverktygens `braces`/`micromatch`/`fast-glob`/ESLint-kedja. Den föreslagna automatiska åtgärden skulle nedgradera Nexts ESLint-konfiguration till en inkompatibel huvudversion och används därför inte. Dessa verktyg körs endast på betrodd projektkod, inte användaruppladdningar.
