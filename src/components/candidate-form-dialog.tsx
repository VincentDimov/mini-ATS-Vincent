"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PIPELINE_META, PIPELINE_STAGES, isPipelineStage } from "@/lib/pipeline"
import type { PipelineStage } from "@/lib/types"

type JobOption = {
  id: string
  title: string
  status: string
}

type EditableCandidate = {
  id: string
  job_id: string
  full_name: string
  email: string
  phone?: string | null
  linkedin_url?: string | null
  current_title?: string | null
  current_company?: string | null
  notes?: string | null
  pipeline_stage: PipelineStage
}

export type CandidateFormValues = {
  candidateId?: string
  organizationId?: string
  jobId: string
  fullName: string
  email: string
  phone?: string
  linkedinUrl?: string
  currentTitle?: string
  currentCompany?: string
  notes?: string
  pipelineStage: PipelineStage
}

type CandidateFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobs: JobOption[]
  candidate?: EditableCandidate
  organizationId?: string
  onSave: (values: CandidateFormValues) => Promise<{ ok: boolean; error?: string }>
}

type FormState = {
  jobId: string
  fullName: string
  email: string
  phone: string
  linkedinUrl: string
  currentTitle: string
  currentCompany: string
  notes: string
  pipelineStage: PipelineStage
}

type FieldErrors = Partial<Record<"jobId" | "fullName" | "email" | "linkedinUrl", string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function firstAvailableJobId(jobs: JobOption[]) {
  return jobs.find((job) => job.status === "active")?.id ?? jobs[0]?.id ?? ""
}

function getInitialForm(candidate: EditableCandidate | undefined, jobs: JobOption[]): FormState {
  return {
    jobId: candidate?.job_id ?? firstAvailableJobId(jobs),
    fullName: candidate?.full_name ?? "",
    email: candidate?.email ?? "",
    phone: candidate?.phone ?? "",
    linkedinUrl: candidate?.linkedin_url ?? "",
    currentTitle: candidate?.current_title ?? "",
    currentCompany: candidate?.current_company ?? "",
    notes: candidate?.notes ?? "",
    pipelineStage:
      candidate && isPipelineStage(candidate.pipeline_stage)
        ? candidate.pipeline_stage
        : "new",
  }
}

function getLinkedInError(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  try {
    const url = new URL(trimmed)
    const hostname = url.hostname.toLowerCase()
    const isLinkedIn = hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")

    if (url.protocol !== "https:" || !isLinkedIn || !url.pathname.startsWith("/in/")) {
      return "Use a valid LinkedIn profile URL, such as https://www.linkedin.com/in/name."
    }
  } catch {
    return "Use a valid LinkedIn profile URL, such as https://www.linkedin.com/in/name."
  }

  return undefined
}

function optionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

export function CandidateFormDialog({
  open,
  onOpenChange,
  jobs,
  candidate,
  organizationId,
  onSave,
}: CandidateFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => getInitialForm(candidate, jobs))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setForm(getInitialForm(candidate, jobs))
    setErrors({})
    setFormError(undefined)
  }, [candidate, jobs, open])

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSaving) return
    if (!nextOpen) {
      setErrors({})
      setFormError(undefined)
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const fullName = form.fullName.trim()
    const email = form.email.trim().toLowerCase()
    const linkedinError = getLinkedInError(form.linkedinUrl)
    const nextErrors: FieldErrors = {}

    if (!form.jobId) {
      nextErrors.jobId = jobs.length
        ? "Choose the job this candidate is applying for."
        : "Create a job before adding a candidate."
    }
    if (!fullName) nextErrors.fullName = "Enter the candidate's full name."
    if (!email || !EMAIL_PATTERN.test(email)) nextErrors.email = "Enter a valid email address."
    if (linkedinError) nextErrors.linkedinUrl = linkedinError

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFormError(undefined)
      return
    }

    setErrors({})
    setFormError(undefined)
    setIsSaving(true)

    try {
      const result = await onSave({
        candidateId: candidate?.id,
        organizationId,
        jobId: form.jobId,
        fullName,
        email,
        phone: optionalValue(form.phone),
        linkedinUrl: optionalValue(form.linkedinUrl),
        currentTitle: optionalValue(form.currentTitle),
        currentCompany: optionalValue(form.currentCompany),
        notes: optionalValue(form.notes),
        pipelineStage: form.pipelineStage,
      })

      if (!result.ok) {
        setFormError(result.error ?? "We couldn't save this candidate. Please try again.")
        return
      }

      onOpenChange(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "We couldn't save this candidate. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const isEditing = Boolean(candidate)
  const noJobsAvailable = jobs.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!isSaving}
      >
        <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit candidate" : "Add candidate"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the candidate details and hiring stage."
                : "Add the candidate details and connect them to an open role."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="candidate-job">
                Job <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.jobId}
                onValueChange={(jobId) => {
                  updateField("jobId", jobId)
                  setErrors((current) => ({ ...current, jobId: undefined }))
                }}
                disabled={noJobsAvailable || isSaving}
              >
                <SelectTrigger
                  id="candidate-job"
                  className="w-full"
                  aria-invalid={Boolean(errors.jobId)}
                  aria-describedby={errors.jobId ? "candidate-job-error" : undefined}
                >
                  <SelectValue placeholder="Choose a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}{job.status === "archived" ? " (archived)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {noJobsAvailable ? (
                <p className="text-xs text-muted-foreground">Create a job before adding candidates.</p>
              ) : null}
              {errors.jobId ? (
                <p id="candidate-job-error" className="text-xs text-destructive" role="alert">
                  {errors.jobId}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidate-full-name">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="candidate-full-name"
                  value={form.fullName}
                  onChange={(event) => {
                    updateField("fullName", event.target.value)
                    setErrors((current) => ({ ...current, fullName: undefined }))
                  }}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? "candidate-full-name-error" : undefined}
                  disabled={isSaving}
                  required
                />
                {errors.fullName ? (
                  <p id="candidate-full-name-error" className="text-xs text-destructive" role="alert">
                    {errors.fullName}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="candidate-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="candidate-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    updateField("email", event.target.value)
                    setErrors((current) => ({ ...current, email: undefined }))
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "candidate-email-error" : undefined}
                  disabled={isSaving}
                  required
                />
                {errors.email ? (
                  <p id="candidate-email-error" className="text-xs text-destructive" role="alert">
                    {errors.email}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidate-phone">
                  Phone <span className="font-normal text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="candidate-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  autoComplete="tel"
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="candidate-stage">Pipeline stage</Label>
                <Select
                  value={form.pipelineStage}
                  onValueChange={(pipelineStage) => {
                    if (isPipelineStage(pipelineStage)) updateField("pipelineStage", pipelineStage)
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger id="candidate-stage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {PIPELINE_META[stage].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-linkedin">
                LinkedIn profile <span className="font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                id="candidate-linkedin"
                type="url"
                inputMode="url"
                value={form.linkedinUrl}
                onChange={(event) => {
                  updateField("linkedinUrl", event.target.value)
                  setErrors((current) => ({ ...current, linkedinUrl: undefined }))
                }}
                onBlur={() => {
                  const linkedinError = getLinkedInError(form.linkedinUrl)
                  if (linkedinError) {
                    setErrors((current) => ({ ...current, linkedinUrl: linkedinError }))
                  }
                }}
                autoComplete="url"
                placeholder="https://www.linkedin.com/in/name"
                aria-invalid={Boolean(errors.linkedinUrl)}
                aria-describedby={
                  errors.linkedinUrl
                    ? "candidate-linkedin-hint candidate-linkedin-error"
                    : "candidate-linkedin-hint"
                }
                disabled={isSaving}
              />
              <p id="candidate-linkedin-hint" className="text-xs text-muted-foreground">
                Use a public profile URL beginning with https://www.linkedin.com/in/.
              </p>
              {errors.linkedinUrl ? (
                <p id="candidate-linkedin-error" className="text-xs text-destructive" role="alert">
                  {errors.linkedinUrl}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="candidate-current-title">
                  Current title <span className="font-normal text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="candidate-current-title"
                  value={form.currentTitle}
                  onChange={(event) => updateField("currentTitle", event.target.value)}
                  autoComplete="organization-title"
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="candidate-current-company">
                  Current company <span className="font-normal text-muted-foreground">Optional</span>
                </Label>
                <Input
                  id="candidate-current-company"
                  value={form.currentCompany}
                  onChange={(event) => updateField("currentCompany", event.target.value)}
                  autoComplete="organization"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-notes">
                Notes <span className="font-normal text-muted-foreground">Optional</span>
              </Label>
              <textarea
                id="candidate-notes"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
                placeholder="Interview notes, availability, or anything the hiring team should know."
                disabled={isSaving}
              />
            </div>
          </div>

          {formError ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {isSaving ? "Saving candidate" : ""}
          </p>

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || noJobsAvailable}>
              {isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
