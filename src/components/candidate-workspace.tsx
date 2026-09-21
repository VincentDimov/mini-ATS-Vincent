'use client'

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { BriefcaseBusiness, GripVertical, Mail, Plus, Search, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createCandidate, updateCandidate, updateCandidateStage } from '@/app/actions'
import { CandidateFormDialog, type CandidateFormValues } from '@/components/candidate-form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PIPELINE_META, PIPELINE_STAGES, isPipelineStage } from '@/lib/pipeline'
import type { CandidateWithJob, Job, PipelineStage } from '@/lib/types'

export function CandidateWorkspace({
  initialCandidates,
  jobs,
  organizationId,
}: {
  initialCandidates: CandidateWithJob[]
  jobs: Job[]
  organizationId?: string
}) {
  // A router refresh supplies a new server snapshot. Remounting only when that
  // snapshot changes resets optimistic state without a cascading setState effect.
  const snapshotKey = [
    ...initialCandidates.map((candidate) => `${candidate.id}:${candidate.updated_at}:${candidate.pipeline_stage}`),
    ...jobs.map((job) => `${job.id}:${job.updated_at}:${job.status}`),
  ].join('|')

  return (
    <CandidateWorkspaceContent
      key={snapshotKey}
      initialCandidates={initialCandidates}
      jobs={jobs}
      organizationId={organizationId}
    />
  )
}

function CandidateWorkspaceContent({
  initialCandidates,
  jobs,
  organizationId,
}: {
  initialCandidates: CandidateWithJob[]
  jobs: Job[]
  organizationId?: string
}) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initialCandidates)
  const [search, setSearch] = useState('')
  const [jobFilter, setJobFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<CandidateWithJob | undefined>()
  const [movingCandidateId, setMovingCandidateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return candidates.filter((candidate) => {
      const matchesJob = jobFilter === 'all' || candidate.job_id === jobFilter
      const matchesSearch =
        !query ||
        candidate.full_name.toLowerCase().includes(query) ||
        candidate.email.toLowerCase().includes(query)
      return matchesJob && matchesSearch
    })
  }, [candidates, jobFilter, search])

  function openCreate() {
    setEditingCandidate(undefined)
    setDialogOpen(true)
  }

  function openEdit(candidate: CandidateWithJob) {
    setEditingCandidate(candidate)
    setDialogOpen(true)
  }

  async function saveCandidate(values: CandidateFormValues) {
    setError(null)
    const input = {
      organizationId: values.organizationId,
      jobId: values.jobId,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      linkedinUrl: values.linkedinUrl,
      currentTitle: values.currentTitle,
      currentCompany: values.currentCompany,
      notes: values.notes,
      pipelineStage: values.pipelineStage,
    }
    const result = values.candidateId
      ? await updateCandidate(values.candidateId, input)
      : await createCandidate(input)

    if (result.ok) router.refresh()
    return result
  }

  async function moveCandidate(candidateId: string, nextStage: PipelineStage) {
    const previous = candidates
    setMovingCandidateId(candidateId)
    setError(null)
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, pipeline_stage: nextStage } : candidate
      )
    )

    const result = await updateCandidateStage(candidateId, nextStage)
    setMovingCandidateId(null)

    if (!result.ok) {
      setCandidates(previous)
      setError(result.error)
      return
    }
    router.refresh()
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.destination.droppableId === result.source.droppableId) return
    if (!isPipelineStage(result.destination.droppableId)) return
    void moveCandidate(result.draggableId, result.destination.droppableId)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9"
            placeholder="Search candidates by name or email"
            aria-label="Search candidates"
          />
        </div>
        <select
          value={jobFilter}
          onChange={(event) => setJobFilter(event.target.value)}
          aria-label="Filter candidates by job"
          className="h-10 min-w-48 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="all">All jobs</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
        <Button className="h-10" onClick={openCreate}>
          <Plus /> Add candidate
        </Button>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {jobs.length ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid min-w-0 gap-4 overflow-x-auto pb-2 xl:grid-cols-5">
            {PIPELINE_STAGES.map((stage) => {
              const stageCandidates = filteredCandidates.filter((candidate) => candidate.pipeline_stage === stage)
              const meta = PIPELINE_META[stage]
              return (
                <Droppable droppableId={stage} key={stage}>
                  {(provided, snapshot) => (
                    <section
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-52 min-w-64 rounded-2xl border p-3 transition-colors ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/30'}`}
                    >
                      <header className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${meta.dotClassName}`} />
                          <h2 className="text-sm font-semibold">{meta.label}</h2>
                        </div>
                        <span className="rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground">{stageCandidates.length}</span>
                      </header>
                      <div className="space-y-2">
                        {stageCandidates.map((candidate, index) => (
                          <Draggable draggableId={candidate.id} index={index} key={candidate.id}>
                            {(dragProvided, dragSnapshot) => (
                              <article
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`rounded-xl border border-border/70 bg-card p-3 shadow-sm ${dragSnapshot.isDragging ? 'shadow-lg ring-1 ring-primary/40' : ''}`}
                              >
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    aria-label={`Drag ${candidate.full_name}`}
                                    className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                                    {...dragProvided.dragHandleProps}
                                  >
                                    <GripVertical className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="min-w-0 flex-1 text-left"
                                    onClick={() => openEdit(candidate)}
                                  >
                                    <p className="truncate text-sm font-medium hover:text-primary">{candidate.full_name}</p>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {candidate.current_title ?? candidate.job.title}
                                    </p>
                                  </button>
                                </div>
                                <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                                  <p className="flex items-center gap-1.5 truncate"><Mail className="size-3" />{candidate.email}</p>
                                  <p className="flex items-center gap-1.5 truncate"><BriefcaseBusiness className="size-3" />{candidate.job.title}</p>
                                </div>
                                <label className="sr-only" htmlFor={`candidate-stage-${candidate.id}`}>Change stage for {candidate.full_name}</label>
                                <select
                                  id={`candidate-stage-${candidate.id}`}
                                  value={candidate.pipeline_stage}
                                  disabled={movingCandidateId === candidate.id}
                                  onChange={(event) => {
                                    if (isPipelineStage(event.target.value)) void moveCandidate(candidate.id, event.target.value)
                                  }}
                                  className="mt-3 h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                                >
                                  {PIPELINE_STAGES.map((item) => <option key={item} value={item}>{PIPELINE_META[item].label}</option>)}
                                </select>
                                <div className="mt-2 flex items-center justify-between">
                                  <Link href={`/candidates/${candidate.id}`} className="text-xs font-medium text-primary hover:underline">Open profile</Link>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClassName}`}>{meta.label}</span>
                                </div>
                              </article>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {!stageCandidates.length && <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Drop candidates here</p>}
                      </div>
                    </section>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="font-medium">Create a job first</h2>
          <p className="mt-1 text-sm text-muted-foreground">Candidates are always linked to a role so the board stays clear.</p>
        </div>
      )}

      <CandidateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobs={jobs.map(({ id, title, status }) => ({ id, title, status }))}
        candidate={editingCandidate}
        organizationId={organizationId}
        onSave={saveCandidate}
      />
    </section>
  )
}
