import { ArrowRight, BriefcaseBusiness, Building2, UsersRound } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth'
import { getAllOrganizations } from '@/lib/data'
import type { Candidate, Job } from '@/lib/types'

export const dynamic = 'force-dynamic'

function records<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin()
  const [organizations, profilesResponse, jobsResponse, candidatesResponse] = await Promise.all([
    getAllOrganizations(supabase),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id, organization_id, created_by, title, description, location, employment_type, notes, status, created_at, updated_at'),
    supabase.from('candidates').select('id, organization_id, job_id, created_by, full_name, email, phone, linkedin_url, current_title, current_company, notes, pipeline_stage, cv_path, cv_filename, cv_uploaded_at, created_at, updated_at'),
  ])

  if (profilesResponse.error || jobsResponse.error || candidatesResponse.error) {
    throw new Error('Admin metrics could not be loaded.')
  }

  const jobs = records<Job>(jobsResponse.data)
  const candidates = records<Candidate>(candidatesResponse.data)

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">PLATFORM ADMINISTRATION</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">System overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage customer workspaces and securely provision new accounts.</p>
        </div>
        <Button asChild><Link href="/admin/users">Manage users <ArrowRight /></Link></Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Organizations" value={organizations.length} icon={<Building2 className="size-5" />} accentClassName="bg-violet-500/10 text-violet-700" />
        <Metric label="Users" value={profilesResponse.count ?? 0} icon={<UsersRound className="size-5" />} accentClassName="bg-sky-500/10 text-sky-700" />
        <Metric label="Jobs" value={jobs.length} icon={<BriefcaseBusiness className="size-5" />} accentClassName="bg-amber-500/10 text-amber-700" />
        <Metric label="Candidates" value={candidates.length} icon={<UsersRound className="size-5" />} accentClassName="bg-emerald-500/10 text-emerald-700" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between border-b">
          <CardTitle>Customer workspaces</CardTitle>
          <Button variant="link" size="sm" asChild><Link href="/admin/users">Add customer</Link></Button>
        </CardHeader>
        <CardContent className="pt-4">
          {organizations.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => {
                const organizationJobs = jobs.filter((job) => job.organization_id === organization.id)
                const organizationCandidates = candidates.filter((candidate) => candidate.organization_id === organization.id)
                return (
                  <Link key={organization.id} href={`/admin/organizations/${organization.id}`} className="rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/45 hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{organization.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{organization.location ?? organization.industry ?? 'Customer workspace'}</p>
                      </div>
                      <Building2 className="size-5 shrink-0 text-primary" />
                    </div>
                    <p className="mt-5 text-sm text-muted-foreground"><strong className="font-medium text-foreground">{organizationJobs.length}</strong> jobs · <strong className="font-medium text-foreground">{organizationCandidates.length}</strong> candidates</p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="font-medium">No customer workspaces yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a customer account and a new organization from User management.</p>
              <Button className="mt-4" asChild><Link href="/admin/users">Create customer</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value, icon, accentClassName }: { label: string; value: number; icon: React.ReactNode; accentClassName: string }) {
  return (
    <Card className="bg-card/90">
      <CardContent className="flex items-center justify-between pt-4">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p></div>
        <span className={`rounded-xl p-2.5 ${accentClassName}`}>{icon}</span>
      </CardContent>
    </Card>
  )
}
