import { isPipelineStage } from '@/lib/pipeline'
import type { CandidateInput, JobInput, PipelineStage } from '@/lib/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanOptional(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function cleanRequired(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  if (trimmed.length > maxLength) throw new Error(`${label} is too long.`)
  return trimmed
}

export function validateLinkedInUrl(value: string | undefined): string | null {
  const url = cleanOptional(value)
  if (!url) return null

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isLinkedIn = host === 'linkedin.com' || host.endsWith('.linkedin.com')

    if (parsed.protocol !== 'https:' || !isLinkedIn || !parsed.pathname.startsWith('/in/')) {
      throw new Error()
    }

    return parsed.toString()
  } catch {
    throw new Error('LinkedIn URL must be a valid https://linkedin.com/in/... URL.')
  }
}

export function validateJobInput(input: JobInput): Omit<JobInput, 'organizationId'> {
  const title = cleanRequired(input.title, 'Job title', 160)
  const description = cleanRequired(input.description, 'Job description', 12_000)

  return {
    title,
    description,
    location: cleanOptional(input.location) ?? undefined,
    employmentType: cleanOptional(input.employmentType) ?? undefined,
    notes: cleanOptional(input.notes) ?? undefined,
  }
}

export function validateCandidateInput(input: CandidateInput): Omit<CandidateInput, 'organizationId'> {
  const fullName = cleanRequired(input.fullName, 'Candidate name', 160)
  const email = cleanRequired(input.email, 'Email', 254).toLowerCase()
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid email address.')
  if (!input.jobId) throw new Error('Choose a job for the candidate.')
  if (!isPipelineStage(input.pipelineStage)) throw new Error('Choose a valid pipeline stage.')

  return {
    jobId: input.jobId,
    fullName,
    email,
    phone: cleanOptional(input.phone) ?? undefined,
    linkedinUrl: validateLinkedInUrl(input.linkedinUrl) ?? undefined,
    currentTitle: cleanOptional(input.currentTitle) ?? undefined,
    currentCompany: cleanOptional(input.currentCompany) ?? undefined,
    notes: cleanOptional(input.notes) ?? undefined,
    pipelineStage: input.pipelineStage as PipelineStage,
  }
}

export function validateAdminUserInput(input: {
  email: string
  fullName: string
  password: string
  role: string
  organizationId?: string
  organizationName?: string
}) {
  const email = cleanRequired(input.email, 'Email', 254).toLowerCase()
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid email address.')

  const fullName = cleanRequired(input.fullName, 'Name', 160)
  if (input.password.length < 12) {
    throw new Error('The initial password must be at least 12 characters long.')
  }
  if (input.role !== 'admin' && input.role !== 'customer') {
    throw new Error('Choose a valid role.')
  }

  const organizationId = cleanOptional(input.organizationId)
  const organizationName = cleanOptional(input.organizationName)
  if (input.role === 'customer' && !organizationId && !organizationName) {
    throw new Error('Choose an organization or enter a new organization name.')
  }
  if (organizationName && organizationName.length > 120) {
    throw new Error('Organization name is too long.')
  }

  return { email, fullName, password: input.password, role: input.role, organizationId, organizationName }
}
