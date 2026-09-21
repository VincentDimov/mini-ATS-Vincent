import { ArrowRight, BriefcaseBusiness, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCustomer } from '@/lib/auth'
import { getWorkspaceData } from '@/lib/data'
import { PIPELINE_META, PIPELINE_STAGES } from '@/lib/pipeline'

export const dynamic = 'force-dynamic'

export default async function CustomerDashboardPage() {
  const { profile, supabase } = await requireCustomer()
  const { jobs, candidates } = await getWorkspaceData(supabase, profile.organization_id!)
  const activeJobs = jobs.filter((job) => job.status === 'active')
  const candidatesByStage = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, candidates.filter((candidate) => candidate.pipeline_stage === stage).length])
  )

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">WORKSPACE OVERVIEW</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Hiring at a glance</h1>
          <p className="mt-2 text-sm text-muted-foreground">A compact view of your active roles and candidate pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/candidates">View pipeline</Link></Button>
          <Button asChild><Link href="/dashboard/jobs">Manage jobs <ArrowRight /></Link></Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Active jobs" value={activeJobs.length} icon={<BriefcaseBusiness className="size-5" />} detail={`${jobs.length - activeJobs.length} archived`} />
        <MetricCard label="Candidates" value={candidates.length} icon={<UsersRound className="size-5" />} detail={`${candidatesByStage.interview + candidatesByStage.offered} in late stages`} />
        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader><CardTitle>Pipeline snapshot</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground"><span className={`size-2 rounded-full ${PIPELINE_META[stage].dotClassName}`} />{PIPELINE_META[stage].label}</span>
                <span className="font-medium tabular-nums">{candidatesByStage[stage]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b">
            <CardTitle>Recent candidates</CardTitle>
            <Button variant="link" size="sm" asChild><Link href="/dashboard/candidates">See all</Link></Button>
          </CardHeader>
          <CardContent className="pt-3">
            {candidates.length ? (
              <div className="divide-y">
                {candidates.slice(0, 6).map((candidate) => (
                  <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{candidate.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{candidate.job.title} · {candidate.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${PIPELINE_META[candidate.pipeline_stage].badgeClassName}`}>
                      {PIPELINE_META[candidate.pipeline_stage].label}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No candidates yet" detail="Add a candidate once you have created a job." href="/dashboard/candidates" action="Add candidate" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active roles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeJobs.length ? activeJobs.slice(0, 5).map((job) => (
              <Link key={job.id} href="/dashboard/jobs" className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <p className="font-medium">{job.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{job.location ?? 'Location not set'}{job.employment_type ? ` · ${job.employment_type}` : ''}</p>
              </Link>
            )) : <EmptyState title="No active jobs" detail="Create a role to start your hiring pipeline." href="/dashboard/jobs" action="Create job" />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <div className="py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{detail}</p>
      <Button className="mt-4" size="sm" asChild><Link href={href}>{action}</Link></Button>
    </div>
  )
}
