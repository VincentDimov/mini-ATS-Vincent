import { JobsManager } from '@/components/jobs-manager'
import { requireCustomer } from '@/lib/auth'
import { getWorkspaceData } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const { profile, supabase } = await requireCustomer()
  const { jobs, candidates } = await getWorkspaceData(supabase, profile.organization_id!)
  const candidateCounts = Object.fromEntries(
    jobs.map((job) => [job.id, candidates.filter((candidate) => candidate.job_id === job.id).length])
  )

  return (
    <div className="mx-auto max-w-7xl space-y-2">
      <div>
        <p className="text-sm font-medium text-primary">JOB MANAGEMENT</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Roles</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create, refine, archive or remove the roles your team is hiring for.</p>
      </div>
      <div className="pt-4"><JobsManager initialJobs={jobs} candidateCounts={candidateCounts} /></div>
    </div>
  )
}
