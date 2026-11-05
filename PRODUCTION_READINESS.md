# Production readiness audit — started 2026-10-13, updated 2026-11-05

Scope: existing Next.js architecture on `feature/workspace-upgrade`, including all server actions, UI, SQL migrations, Auth, private Storage, OpenAI, tests and deployment files. This is an engineering assessment, not a GDPR compliance certification.

## Confirmed defects at the audit baseline

| Area / affected files | Evidence and impact |
| --- | --- |
| `src/app/actions.ts` CV deletion | Storage objects were removed before deleting the candidate/job. A failed database deletion could leave valid records without their CV. Replacement ignored cleanup failures; no durable retry. |
| `src/app/actions.ts`, `candidate_analyses` | Unconditional upsert by candidate ID had no CV/job version or request token. Concurrent uploads could save an older analysis last; changing a job or CV left old analysis presented as current. |
| `src/app/actions.ts`, Storage policies | Only filename, MIME and size were checked. A renamed non-PDF passed. Authenticated clients could bypass the application upload validation and upload arbitrary objects into accessible candidate folders. No upload quota. |
| `src/app/candidates/[id]/page.tsx` | A 60-second signed URL was generated on page load, not click; it expired on an otherwise usable page. |
| `src/lib/data.ts` | Unpaginated queries silently stopped at Supabase's row limit. Client filtering only searched the fetched subset. |
| `src/app/actions.ts`, `workspace-actions.ts` | Several mutations treated zero affected rows as success. Runtime job status was not validated. |
| Collaboration migration / `activity_log` | Candidate names remained in audit events after candidate deletion. No retention-date or scheduled purge mechanism. |
| Collaboration migration / `interviews` | Direct API updates could change an interview's author. |
| Auth UI | No forgotten-password/recovery route or invitation flow; managers had to distribute passwords. |
| CI | No GitHub Actions workflow. Existing unit and local RLS/browser tests were not automated in CI. |
| `package.json`, lockfile | The November registry check reported critical Next.js 16.4.0 advisories. Updated Next.js and matching ESLint config to 16.4.4; production audit then reported zero vulnerabilities. No exploit against this application was established. |
| New Auth routes (caught during QA) | Absolute redirects normalized `127.0.0.1` to `localhost`, dropping cookies across origins. Fixed with same-origin relative redirects and a regression assertion. Recovery proof is now consumed on the password POST, not a scanner-followable GET. |

## Risks / external requirements (not confirmed exploits)

- The connected cloud database has the MVP migrations, not the collaboration migration. Deployment must apply both additive upgrades in order. No cloud migration is performed by this audit.
- OpenAI processing requires an organizational decision about candidate consent, lawful basis, processor terms, region and provider retention. `store:false` alone is not zero retention. PDF structural screening is not antivirus or a sandbox.
- Historical demo credentials have appeared in repository history. Operators should rotate affected accounts; rewriting history or rotating production users is not done implicitly.
- Service-role access bypasses RLS. It must remain server-only; scheduled maintenance and deployment secrets require operational controls.
- SMTP, allowed Auth redirects, email templates, secure password change, backup retention, legal holds, incident response, rate limiting at the hosting edge and monitoring require production configuration.
- Existing overview/analytics/team/calendar screens still load bounded snapshots; paginated candidate search does not make every analytics aggregate globally complete.

## Implementation and verification

Implemented: transactional CV registry/outbox with leases and retries; protected service-only reservation/commit and AI CAS; tenant/payload checks; conservative PDF screening, rate/storage quotas; on-demand attachment links; stale legacy/job/CV analysis markers; retention UI and scheduled endpoint; audit-label erasure; bounded database search/pagination; URL-persisted pipeline context; persistent job filters; recovery/invitations; safe error/loading states; CI and isolated database/Auth/Storage/browser tests. No runtime dependencies were added. React review kept filters and feedback above snapshot-remounted editors and added transition loading state.

The cloud migration history was checked read-only again: only the MVP is registered. The security advisor reported leaked-password protection disabled. See [deployment requirements](DEPLOYMENT.md) before enabling production writes or scheduling erasure. Local tests are not proof that cloud configuration has been deployed.

Verification and exact changed-file inventory are recorded below after final execution. No real candidate CV or live OpenAI request was used.

## Final local verification — 2026-11-05

| Check | Actual result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 15 passed, 0 failed |
| `npm run test:db` | Passed: fresh migrations, synthetic populated-database preservation, workspace RLS, tenant boundaries, CV/AI CAS, quotas, cleanup recovery, retention and audit erasure |
| `npm run test:e2e` | 7 passed: real local Auth/Storage checks plus UI lifecycle, download, filters, recovery replay denial, authorization, CRUD, responsive/theme/navigation |
| `npm run build` | Passed with Next.js 16.4.4 |
| `npm run audit:production` | 0 vulnerabilities |
| `npm audit --audit-level=high` | Exit 0; 8 moderate development-only findings through minimatch/typescript-eslint remain. No high/critical findings. Forced fix suggests incompatible ESLint/Next configuration downgrade; not applied. |

During iteration, recovery tests failed and exposed a real cross-origin redirect defect; the final full seven-test run passed after the fix. One development-server response-stream cancellation was logged during rapid navigation; the tests reported no browser page/hydration errors. This does not establish that production has been exercised.

The exact [51-file inventory](CHANGED_FILES.md) includes the initial checkpoint and follow-up fixes. [DEPLOYMENT.md](DEPLOYMENT.md) documents migration order, the intentional restriction of direct Storage/CV/analysis writes, configuration, recovery templates, maintenance scheduling, monitoring and remaining limitations. Candidate deletion and retention features do not claim GDPR compliance.

GitHub Actions was launched after pushing `feature/production-hardening`. The initial hosted static/database/build/audit job passed; the full hosted browser job was not yet confirmed at handoff. The final local seven-test run used the final database functions and explicitly checked privacy-safe audit labels. Follow the [branch workflow runs](https://github.com/VincentDimov/mini-ATS-Vincent/actions?query=branch%3Afeature%2Fproduction-hardening) for the final hosted result.

Not externally verified: production deployment/migrations, real SMTP delivery, live OpenAI generation, malware scanning, legal basis/processor/retention policy and backup-erasure procedures. Auth user provisioning/deletion spans Auth and profile operations rather than a single distributed transaction; failed invitations can leave no-access Auth accounts, and operators should avoid concurrent role/organization changes while deleting accounts. Those operational cases need privileged reconciliation and review.
