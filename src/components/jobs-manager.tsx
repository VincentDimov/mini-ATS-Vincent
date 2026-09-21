'use client'

import { useMemo, useState } from 'react'
import { Archive, BriefcaseBusiness, Pencil, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { createJob, deleteJob, setJobStatus, updateJob } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Job } from '@/lib/types'

type JobDraft = {
  title: string
  description: string
  location: string
  employmentType: string
  notes: string
}

const EMPTY_DRAFT: JobDraft = {
  title: '',
  description: '',
  location: '',
  employmentType: '',
  notes: '',
}

function draftFromJob(job: Job): JobDraft {
  return {
    title: job.title,
    description: job.description,
    location: job.location ?? '',
    employmentType: job.employment_type ?? '',
    notes: job.notes ?? '',
  }
}

export function JobsManager({
  initialJobs,
  organizationId,
  candidateCounts = {},
}: {
  initialJobs: Job[]
  organizationId?: string
  candidateCounts?: Record<string, number>
}) {
  // A refreshed server snapshot intentionally remounts this local, optimistic
  // editor state instead of synchronously setting state from an effect.
  const snapshotKey = initialJobs
    .map((job) => `${job.id}:${job.updated_at}:${job.status}`)
    .join('|')

  return (
    <JobsManagerContent
      key={snapshotKey}
      initialJobs={initialJobs}
      organizationId={organizationId}
      candidateCounts={candidateCounts}
    />
  )
}

function JobsManagerContent({
  initialJobs,
  organizationId,
  candidateCounts = {},
}: {
  initialJobs: Job[]
  organizationId?: string
  candidateCounts?: Record<string, number>
}) {
  const router = useRouter()
  const [jobs] = useState(initialJobs)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [draft, setDraft] = useState<JobDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesStatus = showArchived ? job.status === 'archived' : job.status === 'active'
        const matchesQuery = [job.title, job.location, job.employment_type]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()))
        return matchesStatus && (!query.trim() || matchesQuery)
      }),
    [jobs, query, showArchived]
  )

  function openCreate() {
    setEditingJob(null)
    setDraft(EMPTY_DRAFT)
    setError(null)
    setOpen(true)
  }

  function openEdit(job: Job) {
    setEditingJob(job)
    setDraft(draftFromJob(job))
    setError(null)
    setOpen(true)
  }

  function updateDraft<Key extends keyof JobDraft>(key: Key, value: JobDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function saveJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const input = { ...draft, organizationId }
    const result = editingJob ? await updateJob(editingJob.id, input) : await createJob(input)
    setSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setOpen(false)
    setMessage(result.message ?? 'Saved.')
    router.refresh()
  }

  async function toggleArchive(job: Job) {
    setError(null)
    const result = await setJobStatus(job.id, job.status === 'active' ? 'archived' : 'active')
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage(result.message ?? 'Saved.')
    router.refresh()
  }

  async function removeJob(job: Job) {
    const approved = window.confirm(
      `Delete “${job.title}”? This permanently deletes the job and all candidates linked to it.`
    )
    if (!approved) return

    setError(null)
    const result = await deleteJob(job.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage(result.message ?? 'Deleted.')
    router.refresh()
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/10 bg-card/85 p-4 shadow-lg shadow-primary/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search jobs"
            className="h-10 pl-9"
            placeholder="Search job titles or locations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showArchived ? 'outline' : 'secondary'}
            onClick={() => setShowArchived((current) => !current)}
          >
            <Archive />
            {showArchived ? 'Showing archived' : 'Archived'}
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            New job
          </Button>
        </div>
      </div>

      {message && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {visibleJobs.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visibleJobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-primary/10 bg-card/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${job.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {job.status === 'active' ? 'Active' : 'Archived'}
                    </span>
                    <span className="text-xs text-muted-foreground">{candidateCounts[job.id] ?? 0} candidates</span>
                  </div>
                  <h2 className="truncate text-lg font-semibold tracking-tight">{job.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-primary">
                  <BriefcaseBusiness className="size-5" />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {job.location && <span>{job.location}</span>}
                {job.employment_type && <span>{job.employment_type}</span>}
                <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                <Button variant="outline" size="sm" onClick={() => openEdit(job)}>
                  <Pencil /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleArchive(job)}>
                  {job.status === 'active' ? <Archive /> : <Undo2 />}
                  {job.status === 'active' ? 'Archive' : 'Restore'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => removeJob(job)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="font-medium">{showArchived ? 'No archived jobs' : 'No jobs yet'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {showArchived ? 'Archived roles will appear here.' : 'Create a job to start building a candidate pipeline.'}
          </p>
          {!showArchived && <Button className="mt-5" onClick={openCreate}><Plus /> Create job</Button>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit job' : 'Create a job'}</DialogTitle>
            <DialogDescription>Keep the role concise and include enough detail for the CV summary.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveJob}>
            <div className="space-y-2">
              <Label htmlFor="job-title">Title</Label>
              <Input id="job-title" required maxLength={160} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Description</Label>
              <textarea
                id="job-description"
                required
                maxLength={12000}
                className="min-h-40 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-location">Location</Label>
                <Input id="job-location" value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} placeholder="Stockholm / Hybrid" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-employment-type">Employment type</Label>
                <Input id="job-employment-type" value={draft.employmentType} onChange={(event) => updateDraft('employmentType', event.target.value)} placeholder="Full-time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-notes">Internal notes</Label>
              <textarea
                id="job-notes"
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={draft.notes}
                onChange={(event) => updateDraft('notes', event.target.value)}
                placeholder="Optional notes for your team"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingJob ? 'Save changes' : 'Create job'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
