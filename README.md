# Mini-ATS Vincent

Ett komplett, multi-tenant Applicant Tracking System (ATS) för mindre rekryteringsteam. Applikationen har två roller: **admin** kan administrera organisationer och användare samt se alla organisationers data; **customer** arbetar enbart i sin egen organisation.

Detta är en ny, säker databasbaseline. Den ska tillämpas på ett nytt Supabase-projekt, inte ovanpå ett äldre schema med okända policies eller data.

## Funktioner

- Inloggning med Supabase Auth och serverkontrollerade rollredirects.
- Adminvy med organisationer, totalsiffror och formulär för att skapa admin- och customer-konton.
- Kundvy med dashboard, jobbhantering och kandidatregister.
- Jobb med titel, beskrivning, plats, anställningsform, interna anteckningar och statusen **active** eller **archived**.
- Kandidater med kontaktuppgifter, LinkedIn, nuvarande roll/bolag, anteckningar och koppling till ett jobb.
- Kanban-flöde: **New → Screening → Interview → Offered → Rejected**. Att dra ett kort eller välja ny fas sparar ändringen direkt.
- Filter på jobb och sökning på kandidatnamn eller e-post.
- Privat PDF-CV-lagring och valfri AI-sammanfattning med sparat strukturerat resultat.
- Fiktiv seeddata för en demoorganisation, två jobb och åtta kandidater.

## Teknik och struktur

| Del | Val |
| --- | --- |
| Webb | Next.js 16, React 19, TypeScript, Tailwind och shadcn-baserade komponenter |
| Auth och data | Supabase Auth, PostgreSQL och Row Level Security (RLS) |
| Filhantering | Privat Supabase Storage-bucket **candidate-cvs** |
| AI | OpenAI Responses API, endast från servern när **OPENAI_API_KEY** finns |

Viktiga delar i koden:

- **src/proxy.ts** uppdaterar Supabase-sessionen och gör tidiga inloggningsredirects.
- **src/lib/auth.ts**, route layouts och server actions kontrollerar aktuell användare och roll på servern. Proxy/UI är aldrig den enda behörighetskontrollen.
- **src/app/actions.ts** innehåller jobb-, kandidat- och CV-operationer.
- **src/app/admin/users/actions.ts** använder service-role-nyckeln först efter en server-side-adminkontroll för kontoprovisionering.
- **supabase/migrations/20260920184847_ats_mvp.sql** är hela schemat, RLS-policies och Storage-policies.

## Lokal installation

Förutsättningar: Node.js 20+ och ett nytt Supabase-projekt. Supabase CLI är valfritt om SQL körs i Dashboardens SQL Editor.

~~~powershell
cd "C:\Users\Vince\Desktop\Mina Projekt\mini-ATS-Vincent"
npm install
Copy-Item .env.example .env.local
~~~

Fyll sedan i **.env.local**:

~~~env
# Säker att använda i webbläsaren
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Alternativt kan den nyare publishable-nyckeln användas i stället för anon-keyn.
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

# Endast server. Behövs för att en admin ska kunna skapa Auth-användare i UI:t.
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Endast server. Valfritt: utan den fungerar CV-uppladdning men inte AI-analys.
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-4o-mini
~~~

Lägg aldrig service-role- eller OpenAI-nyckeln i en **NEXT_PUBLIC_**-variabel, klientkod, commit eller skärmdump.

Starta därefter lokalt:

~~~bash
npm run dev
~~~

Öppna **http://localhost:3000**.

## Databas, migration och demo-data

1. Skapa ett **nytt** Supabase-projekt. Inaktivera öppna e-postregistreringar i Auth-inställningarna och sätt minst 12 tecken som lösenordspolicy; konton ska sedan provisioneras av en admin i appen.
2. Kör hela innehållet i **supabase/migrations/20260920184847_ats_mvp.sql** i SQL Editor, eller länka CLI:t till projektet och kör migrationen:

   ~~~bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ~~~

3. Kör **supabase/seed.sql** i SQL Editor för den fiktiva demoorganisationen **Acme Recruitment**, två jobb och åtta kandidater. Seedfilen skapar medvetet inga Auth-användare och innehåller inga lösenord.
4. Skapa en användare i Supabase Dashboard → Authentication → Users. Bekräfta e-postadressen, och kör sedan följande som en privilegierad SQL Editor-session (anpassa e-post och namn):

   ~~~sql
   insert into public.profiles (id, email, full_name, role, organization_id)
   select id, email, 'Demo Admin', 'admin', null
   from auth.users
   where email = 'admin@example.com'
   on conflict (id) do update
   set email = excluded.email,
       full_name = excluded.full_name,
       role = excluded.role,
       organization_id = excluded.organization_id;
   ~~~

5. Logga in som den administratören på **/login**. Admin kan därefter skapa customer- och adminanvändare i **Admin → Users**. När en customer skapas skapas eller väljs samtidigt en organisation.

För en customer som ska se seeddata väljer du organisationen **Acme Recruitment** i adminformuläret. En customer-profil måste alltid ha ett **organization_id**; en admin-profil måste ha **organization_id = null**.

## Behörighet och tenant-isolering

All dataåtkomst avgörs av PostgreSQL RLS, inte av URL:er, lokala flaggor eller auth-metadata.

| Resurs | Customer | Admin |
| --- | --- | --- |
| Organisationer | Endast sin organisation | Alla organisationer |
| Profiler | Endast sin egen profil | Alla profiler |
| Jobb, kandidater och analyser | Endast rader i sin organisation | Alla organisationer |
| Candidate-CVs | Endast CV:n vars sökväg och kandidat tillhör organisationen | Alla CV:n |

Migrationen använder en privat **private**-schema-yta med säkerhetsdefinierade hjälpfunktioner, explicita policyer per CRUD-operation, både **USING** och **WITH CHECK** för uppdateringar samt en trigger som hämtar kandidatens organisation från det valda jobbet. Därmed kan en klient inte flytta en kandidat till en annan organisation genom att manipulera organisationens ID.

Rollen ligger i den RLS-skyddade **public.profiles**-tabellen. Auth-metadata används inte som behörighetskälla. Service-role-klienten finns endast på servern och används bara för den redan adminskyddade kontoskapandeåtgärden.

## AI-assisterad CV-sammanfattning

PDF-uppladdningen begränsas till **application/pdf** och 5 MB. CV:t sparas i en privat bucket under organisationens och kandidatens UUID-sökväg. Om **OPENAI_API_KEY** saknas visas ett tydligt meddelande: filen kan fortfarande sparas, men AI-analysen körs inte.

När AI är konfigurerad returneras en strukturerad sammanfattning med bland annat relevanta styrkor, möjliga kunskapsluckor, matchande färdigheter och förslag på intervjufrågor. Resultatet är ett rekryterarstöd — **det får inte användas som automatiserat beslut, rangordning, avslag eller anställning**. En människa måste alltid göra den slutliga bedömningen. Ladda bara upp CV:n när organisationen har rättslig grund och kandidatens information hanteras enligt tillämpliga dataskyddskrav.

## Kvalitetssäkring

Kör före leverans:

~~~bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
~~~

Manuell acceptanscheck:

1. Logga in som admin och verifiera att **/admin** fungerar samt att admin kan skapa både en admin och en customer.
2. Logga in som customer och verifiera att **/dashboard** visar bara den egna organisationens jobb och kandidater.
3. Skapa, redigera, arkivera och ta bort ett jobb; skapa och redigera en kandidat med ett giltigt LinkedIn-URL-format.
4. Flytta en kandidat mellan alla fem Kanban-faser och ladda om sidan för att verifiera beständig lagring.
5. Filtrera på jobb och sök på namn/e-post.
6. Ladda upp en PDF på högst 5 MB och verifiera både fallet med en konfigurerad AI-nyckel och det tydliga reservmeddelandet utan nyckel.
7. Skapa en andra customer i en annan organisation och förlita dig inte på UI:t: verifiera även i Supabase att RLS inte ger användaren åtkomst till den första organisationens rader eller filer.

## Distribution och Git-status

En lokal Git-historik har skapats med commit `9310c64` (`Build secure multi-tenant Mini ATS`). Arbetsområdet innehåller fortfarande ingen länkad Supabase-instans, inget Vercel-projekt, ingen Git-remote och inga demohemligheter. Därför finns det ingen påhittad produktions-URL, inga fungerande inloggningsuppgifter och inget påstått pushat repository i detta dokument.

När ett Supabase-projekt är konfigurerat kan applikationen distribueras till Vercel genom att skapa/importera ett projekt, lägga in samma miljövariabler (serverhemligheter endast som servervariabler), sedan köra en produktionsbuild och distribuera. Kontrollera migration, bootstrap-admin och RLS med en riktig customer före produktionssättning.

För att publicera koden till ett eget GitHub-repository:

~~~bash
git init
git add .
git commit -m "Build secure mini ATS MVP"
git branch -M main
git remote add origin <din-git-remote>
git push -u origin main
~~~

Kontrollera före commit att **.env.local**, nycklar, exporterat databasmaterial och verkliga CV-filer inte är spårade. Använd aldrig seeddata eller exempeladresser som verkliga kandidatdata.

## Begränsningar och nästa steg

- E-postinbjudningar, återställning av lösenord och MFA hanteras via Supabase Auth-konfiguration och är inte ersatta av en egen lösenordsfunktion.
- AI-sammanfattning kräver nätverksåtkomst och en giltig OpenAI-nyckel; appen är fortfarande användbar utan AI.
- En etablerad produktionsmiljö bör kompletteras med loggning, backup-rutin, dataretention, personuppgiftsbiträdesavtal och regelbundna RLS-tester.
