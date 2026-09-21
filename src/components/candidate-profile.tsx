'use client'

import {
  BriefcaseBusiness,
  CircleAlert,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import { updateCandidate, uploadAndAnalyzeCandidateCv } from '@/app/actions'
import { CandidateFormDialog, type CandidateFormValues } from '@/components/candidate-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PIPELINE_META } from '@/lib/pipeline'
import type { Candidate, CandidateAnalysis, Job } from '@/lib/types'

const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024

type CandidateProfileCandidate = Candidate & {
  job: Pick<Job, 'title' | 'description' | 'status'>
}

type CandidateProfileAnalysis = Pick<
  CandidateAnalysis,
  | 'summary'
  | 'strengths'
  | 'potential_gaps'
  | 'matching_skills'
  | 'interview_questions'
  | 'disclaimer'
  | 'model'
  | 'updated_at'
>

type CandidateProfileProps = {
  candidate: CandidateProfileCandidate
  analysis: CandidateProfileAnalysis | null
  cvUrl?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || 'C'
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm text-foreground">{children}</div>
      </div>
    </div>
  )
}

function RecruiterList({
  title,
  items,
  emptyMessage,
  numbered = false,
}: {
  title: string
  items: string[]
  emptyMessage: string
  numbered?: boolean
}) {
  const List = numbered ? 'ol' : 'ul'

  return (
    <section className="rounded-xl border border-border/60 bg-background/60 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length ? (
        <List className={numbered ? 'mt-3 list-decimal space-y-2 pl-5 text-sm leading-6' : 'mt-3 space-y-2'}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className={numbered ? 'pl-1' : 'flex gap-2'}>
              {!numbered ? <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" /> : null}
              <span>{item}</span>
            </li>
          ))}
        </List>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  )
}

export function CandidateProfile({ candidate, analysis, cvUrl }: CandidateProfileProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const stage = PIPELINE_META[candidate.pipeline_stage]
  const jobOptions = [
    {
      id: candidate.job_id,
      title: candidate.job.title,
      status: candidate.job.status,
    },
  ]

  async function saveCandidate(values: CandidateFormValues) {
    const result = await updateCandidate(candidate.id, {
      organizationId: candidate.organization_id,
      jobId: values.jobId,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      linkedinUrl: values.linkedinUrl,
      currentTitle: values.currentTitle,
      currentCompany: values.currentCompany,
      notes: values.notes,
      pipelineStage: values.pipelineStage,
    })

    if (result.ok) router.refresh()
    return result
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setUploadError(null)
    setUploadSuccess(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_CV_SIZE_BYTES) {
      setSelectedFile(null)
      setUploadError('Choose a PDF CV smaller than 5 MB.')
      event.target.value = ''
      return
    }

    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setSelectedFile(null)
      setUploadError('Only PDF CV files are accepted.')
      event.target.value = ''
      return
    }

    setSelectedFile(file)
  }

  async function handleCvUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedFile) {
      setUploadError('Choose a PDF CV to upload.')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('candidateId', candidate.id)
      formData.append('file', selectedFile)

      const result = await uploadAndAnalyzeCandidateCv(formData)
      if (!result.ok) {
        setUploadError(result.error)
        return
      }

      setUploadSuccess(result.message ?? 'CV uploaded successfully.')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The CV could not be uploaded. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials(candidate.full_name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">{candidate.full_name}</h1>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage.badgeClassName}`}>
                    {stage.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {candidate.current_title ?? 'Candidate'}
                  {candidate.current_company ? ` at ${candidate.current_company}` : ''}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden="true" /> Edit candidate
            </Button>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid gap-5 sm:grid-cols-2">
            <Detail icon={<Mail className="size-4" />} label="Email">
              <a className="hover:text-primary hover:underline" href={`mailto:${candidate.email}`}>
                {candidate.email}
              </a>
            </Detail>
            <Detail icon={<Phone className="size-4" />} label="Phone">
              {candidate.phone ? (
                <a className="hover:text-primary hover:underline" href={`tel:${candidate.phone}`}>
                  {candidate.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </Detail>
            <Detail icon={<BriefcaseBusiness className="size-4" />} label="Role">
              <span>{candidate.job.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {candidate.job.status === 'archived' ? 'Archived' : 'Active'}
              </span>
            </Detail>
            <Detail icon={<FileText className="size-4" />} label="LinkedIn">
              {candidate.linkedin_url ? (
                <a
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View profile <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </Detail>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Candidate record</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Added</dt>
                <dd>{formatDate(candidate.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd>{formatDate(candidate.updated_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">CV uploaded</dt>
                <dd>{formatDate(candidate.cv_uploaded_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {candidate.notes ? (
          <div className="border-t border-border/60 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold">Recruiter notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{candidate.notes}</p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          <Card className="py-0">
            <CardHeader className="border-b border-border/60 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    AI-assisted recruiter aid
                  </CardTitle>
                  <CardDescription className="mt-1">
                    A structured prompt for human review of this CV against the role.
                  </CardDescription>
                </div>
                {analysis ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Saved analysis
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 py-5">
              <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm leading-6 text-foreground">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <p>
                  {analysis?.disclaimer || 'AI-assisted candidate summary only. Verify all information with a human reviewer.'}{' '}
                  This recruiter aid does not make a hiring decision, recommendation, ranking, or outcome.
                </p>
              </div>

              {analysis ? (
                <>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">Summary</h2>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(analysis.updated_at)} · {analysis.model}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.summary}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <RecruiterList
                      title="Evidence-based strengths"
                      items={analysis.strengths}
                      emptyMessage="No strengths were saved with this analysis."
                    />
                    <RecruiterList
                      title="Points to clarify"
                      items={analysis.potential_gaps}
                      emptyMessage="No points to clarify were saved with this analysis."
                    />
                  </div>

                  <section className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <h3 className="text-sm font-semibold">Matching skills</h3>
                    {analysis.matching_skills.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysis.matching_skills.map((skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">No matching skills were saved with this analysis.</p>
                    )}
                  </section>

                  <RecruiterList
                    title="Neutral interview questions"
                    items={analysis.interview_questions}
                    emptyMessage="No interview questions were saved with this analysis."
                    numbered
                  />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Lightbulb className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
                  <h2 className="mt-3 font-medium">No AI-assisted summary yet</h2>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    Upload a PDF CV to save a neutral recruiter aid based on the candidate&apos;s background and this role.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="py-0">
            <CardHeader className="border-b border-border/60 py-4">
              <CardTitle>CV</CardTitle>
              <CardDescription>PDF only, up to 5 MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-5">
              {cvUrl ? (
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="truncate text-sm font-medium">{candidate.cv_filename ?? 'Candidate CV.pdf'}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Secure, time-limited download link</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <a href={cvUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download aria-hidden="true" /> Download CV
                    </a>
                  </Button>
                </div>
              ) : candidate.cv_filename ? (
                <p className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                  A CV is on file, but a secure download link is not currently available. Refresh the page or upload a new CV.
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-3 text-sm leading-6 text-muted-foreground">
                  No CV has been uploaded for this candidate.
                </p>
              )}

              <form className="space-y-3" onSubmit={handleCvUpload} noValidate>
                <label className="grid gap-2 text-sm font-medium" htmlFor="candidate-cv">
                  Replace or add CV
                  <Input
                    ref={fileInputRef}
                    id="candidate-cv"
                    name="file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    aria-describedby={
                      uploadError || uploadSuccess
                        ? 'candidate-cv-help candidate-cv-feedback'
                        : 'candidate-cv-help'
                    }
                  />
                </label>
                <p id="candidate-cv-help" className="text-xs leading-5 text-muted-foreground">
                  Uploading a new PDF replaces the active CV and refreshes the recruiter aid when AI is configured.
                </p>

                {uploadError ? (
                  <p id="candidate-cv-feedback" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {uploadError}
                  </p>
                ) : null}
                {uploadSuccess ? (
                  <p id="candidate-cv-feedback" className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200" role="status">
                    {uploadSuccess}
                  </p>
                ) : null}

                <Button type="submit" className="w-full" disabled={isUploading || !selectedFile}>
                  {isUploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                  {isUploading ? 'Uploading and analyzing…' : 'Upload PDF CV'}
                </Button>
                <p className="sr-only" aria-live="polite">
                  {isUploading ? 'Uploading CV and preparing recruiter aid' : ''}
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Role context</CardTitle>
              <CardDescription>{candidate.job.title}</CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {candidate.job.description || 'No job description was provided.'}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <CandidateFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        jobs={jobOptions}
        candidate={candidate}
        organizationId={candidate.organization_id}
        onSave={saveCandidate}
      />
    </div>
  )
}

export default CandidateProfile
