# Production deployment and operations

These instructions accompany the security hardening work. The code is not a declaration of legal compliance. Do not test with real candidate information or deploy against an unreviewed database.

## 1. Preflight and database changes

1. Back up the database **and** Storage objects. Verify restore procedures in a separate environment. A database backup alone does not restore deleted Storage content.
2. Check migration history and actual schema/grants in the intended project. The read-only cloud check during this work found only `20260920184847_ats_mvp` registered; objects changed manually may not match that history. Resolve drift before applying migrations; do not blindly mark migrations applied.
3. Apply pending migrations in filename order. In addition to the MVP, this repository includes:

   - `20260921201108_grant_service_role_data_access.sql`
   - `20260921201655_harden_rls_event_trigger.sql`
   - `20261011181141_collaboration_workspace.sql`
   - `20261013062712_production_hardening.sql`

4. The last migration preserves candidates, jobs, existing CV paths and analysis contents. Existing analyses default to **stale**, since their original context cannot be proven. It registers legacy files without deleting them. It adds a private-to-clients CV registry/outbox, AI attempt counters, version columns, retention date, protected RPCs and paginated search.
   Workspace-manager rights must be assigned explicitly by a platform administrator; the collaboration migration does not automatically promote existing customer accounts.
5. Coordinate application and database deployment in a short maintenance window. **Intentional API restriction:** authenticated clients can no longer directly upload/delete Storage objects, change CV columns, or insert/update analyses. They must use the verified server workflow. Older application builds cannot upload CVs after this migration. Reads and normal candidate editing remain available. Cross-workspace job moves are rejected to preserve tenant integrity.
6. Never run `db reset` or seed data against production. No production migration has been executed by this work.

With the pinned CLI, inspect the intended remote target and dry-run first:

```powershell
npx --yes supabase@3.0.0 db push --remote=YOUR_PROJECT_REF --dry-run --skip-vault
```

Only after review, backup and explicit production approval, repeat without `--dry-run`. CLI 3 defaults to **local** without `--remote`. Do not put database passwords into shell history. If the deployment fails, keep the restrictive database policies: do not reopen direct file writes to make an old application work. Prefer a forward fix; use the tested coordinated backup/restore procedure if a full rollback is necessary.

## 2. Application configuration

Use Node.js 22. Docker now uses Node 22 and a non-root runtime. Install with `npm ci`, build with `npm run build`, then run `npm start` (or the standalone Docker entrypoint). Public Supabase configuration must be present at build time as well as runtime. Do not bake server secrets into Docker build arguments.

Set the variables in `.env.example` through the deployment's secret manager:

- `NEXT_PUBLIC_SUPABASE_URL` and a browser-safe publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: **now required for verified CV uploads, AI persistence, invitations and maintenance**, not just account creation. Server only; never use a `NEXT_PUBLIC_` prefix.
- `SITE_URL`: exact trusted HTTPS application origin.
- `MAINTENANCE_SECRET`: independent cryptographically random secret of at least 32 characters.
- Optional `OPENAI_API_KEY`, `OPENAI_MODEL` for summaries. The existing model remains configurable; no provider migration or new AI SDK dependency was introduced.
- For multiple application instances, configure the same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` on all instances. Configure trusted proxy origins narrowly when needed; never use a wildcard to bypass Server Action origin checks.

Allow request bodies up to 6 MB at the reverse proxy and sufficient request duration for a bounded 90-second AI request plus upload/database work. The CV remains saved if analysis times out. Enforce hosting-edge request rate limits in addition to the database upload/AI quotas. Disable request-body/query-token logging for Auth routes and never record CV bodies, passwords, API keys or signed URLs.

## 3. Auth and email

Configure Supabase SMTP with an approved sender and exact allowed redirects. Turn off public registration if this remains an invitation-only application. The application provides `/forgot-password`, `/auth/callback`, `/auth/confirm` and `/reset-password`.

For cross-device invitation/recovery, set the respective email template links to:

```html
<!-- Invitation -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a>
<!-- Password recovery -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Use the trusted Site URL, HTTPS and no link tracking that rewrites single-use links. `/auth/confirm` places the proof in a ten-minute HttpOnly, SameSite cookie; the password POST verifies and consumes the token. Merely following the link does not consume it, protecting against email scanners. Reused/expired tokens are rejected on submission. PKCE recovery through `/auth/callback` requires the browser holding the verifier; the token-hash template supports another device. All redirects remain relative to the same origin; no client-supplied redirect destination is accepted. Test both templates with a synthetic mailbox before launch. Real SMTP delivery is an external configuration requirement, not implied by unit tests.

Enable secure password change/reauthentication as appropriate, leaked-password protection, and MFA for administrators. The read-only Supabase security advisor reported [leaked password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Rotate historically published demo credentials before using real data. Global sign-out removes refresh sessions; already issued access JWTs may remain valid until expiry. Suspended/deleted authoritative profiles lose database access through RLS immediately.

## 4. CV cleanup and retention operations

Schedule an authenticated **POST** to `/api/maintenance` every five minutes, passing `Authorization: Bearer <MAINTENANCE_SECRET>` from a secret store. This is an operational scheduler configuration, not a GitHub Actions job using production credentials. Do not put the secret in a URL.

Each invocation purges up to 100 candidates with an explicitly selected `retain_until` in the past, then processes up to 100 cleanup items. No retention period is assumed for existing candidates; managers choose dates under the organization's policy. Dates are 00:00 UTC. The job must actually be scheduled for automatic deletion to occur.

CV replacement/deletion commits database state first and queues object removal in the same transaction. Storage failures retain a durable retry entry. Cleanup uses leased claims and checks all current references; referenced files cannot be claimed, and a claimed/obsolete reservation cannot be committed again. Abandoned uploads become eligible after 24 hours. Failed/expired leases retry after ten minutes. Late objects on completed reservations are requeued. Completed metadata is pruned after seven days; AI quota counters after one day. These are technical recovery windows, not a universal legal retention policy.

Monitor maintenance HTTP status (503 is retryable) and queue counts/attempts. Operators can inspect aggregate state without reading candidate data:

```sql
select state, count(*), max(attempts) as maximum_attempts
from public.cv_files group by state;
```

Candidate deletion cascades analyses, notes, interviews and AI attempt records; associated audit labels are pseudonymized. CV removal is eventual and must be monitored. Backups, exported CSV/calendar files, downloaded CV copies, free-text references to people in unrelated records, and provider retention require separate organizational processes. Legal holds and restore-after-erasure handling need explicit policy before enabling retention dates.

## 5. Verification and release gates

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
npm run audit:production
npm audit --audit-level=high
```

`test:db` creates a disposable PostgreSQL 17 container with no published ports or mounted volumes. It tests fresh migrations, preservation of synthetic legacy data, RLS, tenant isolation, AI version rejection and cleanup/retention. It stops only its own container.

For real local Auth/Storage and Playwright tests:

```powershell
npx --yes supabase@3.0.0 start -x realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor,mailpit
npm run test:e2e
```

The runner rejects non-local Supabase URLs, overrides production configuration, disables real OpenAI calls and creates random isolated workspaces/accounts. Browser tests block non-local requests during authenticated stories. It cleans its own fixtures after success or failure. Do not publish test traces containing real accounts. GitHub Actions uses fresh local services, pinned action revisions, read-only repository permissions and no production secrets. GitHub-hosted execution must still be confirmed after pushing the workflow.

## Remaining release risks

- PDF checks are conservative content/size/name screening, **not** a complete parser, antivirus or proof that a PDF is safe. Some valid active/encrypted PDFs are rejected; compressed malicious structures may evade screening. Use an approved malware scanning/CDR service if the threat model requires it. Downloads are attachments from a private bucket, signed on demand for 60 seconds; links are bearer capabilities and cannot retract copies already downloaded. Legacy cache settings can outlive a link.
- Candidate-directory search is server-side and tenant-filtered, 50 rows/page, maximum 200 pages with deterministic ID tie-breaks. Narrow filters for deeper datasets. Existing analytics/overview/calendar/team screens still use bounded snapshots; do not treat them as unbounded statistical reporting. Keyset pagination and database aggregates are future scaling work.
- AI failure/retry and consistency are tested without provider spending. Actual provider availability, output quality, processing region and data-protection arrangements need a separate authorized production smoke test. Inline PDF input avoids Files API artifacts; `store:false` is not a zero-retention guarantee. See [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs) and [data controls](https://developers.openai.com/api/docs/guides/your-data).
- The complete dependency audit includes development-tooling advisories; record current counts in the audit report. Do not use forced incompatible dependency downgrades to hide findings.
