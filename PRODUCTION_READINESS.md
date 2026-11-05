# Production readiness audit — 2026-10-13

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

## Risks / external requirements (not confirmed exploits)

- The connected cloud database has the MVP migrations, not the collaboration migration. Deployment must apply both additive upgrades in order. No cloud migration is performed by this audit.
- OpenAI processing requires an organizational decision about candidate consent, lawful basis, processor terms, region and provider retention. `store:false` alone is not zero retention. PDF structural screening is not antivirus or a sandbox.
- Historical demo credentials have appeared in repository history. Operators should rotate affected accounts; rewriting history or rotating production users is not done implicitly.
- Service-role access bypasses RLS. It must remain server-only; scheduled maintenance and deployment secrets require operational controls.
- SMTP, allowed Auth redirects, email templates, secure password change, backup retention, legal holds, incident response, rate limiting at the hosting edge and monitoring require production configuration.
- Existing overview/analytics/team/calendar screens still load bounded snapshots; paginated candidate search does not make every analytics aggregate globally complete.

## Implementation and verification

See the delivery section appended after verification. Never interpret a test definition or a successful previous task as evidence that the new implementation passed.
