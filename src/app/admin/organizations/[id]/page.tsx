import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CandidateWorkspace } from '@/components/candidate-workspace'
import { JobsManager } from '@/components/jobs-manager'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth'
import { getOrganization, getWorkspaceData } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function AdminOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  const organization = await getOrganization(supabase, id)
  if (!organization) notFound()
  const { jobs, candidates } = await getWorkspaceData(supabase, organization.id)
  const candidateCounts = Object.fromEntries(
    jobs.map((job) => [job.id, candidates.filter((candidate) => candidate.job_id === job.id).length])
  )

  return (
    <div className="mx-auto max-w-[1600px] space-y-9">
      <header>
        <Button variant="ghost" size="sm" asChild><Link href="/admin"><ArrowLeft /> All workspaces</Link></Button>
        <p className="mt-5 text-sm font-medium text-primary">ADMIN VIEW · CUSTOMER WORKSPACE</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{organization.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Admin changes use the same database rules as the customer workspace, with platform-wide RLS authorization.</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Jobs</h2>
        <JobsManager initialJobs={jobs} candidateCounts={candidateCounts} organizationId={organization.id} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Candidates</h2>
        <CandidateWorkspace initialCandidates={candidates} jobs={jobs} organizationId={organization.id} />
      </section>
    </div>
  )
}
