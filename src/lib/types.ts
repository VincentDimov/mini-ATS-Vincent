export type UserRole = 'admin' | 'customer'

export type JobStatus = 'active' | 'archived'

export type PipelineStage = 'new' | 'screening' | 'interview' | 'offered' | 'rejected'

export interface Organization {
  id: string
  name: string
  website_url: string | null
  industry: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  organization_id: string
  created_by: string | null
  title: string
  description: string
  location: string | null
  employment_type: string | null
  notes: string | null
  status: JobStatus
  created_at: string
  updated_at: string
}

export interface Candidate {
  id: string
  organization_id: string
  job_id: string
  created_by: string | null
  full_name: string
  email: string
  phone: string | null
  linkedin_url: string | null
  current_title: string | null
  current_company: string | null
  notes: string | null
  pipeline_stage: PipelineStage
  cv_path: string | null
  cv_filename: string | null
  cv_uploaded_at: string | null
  created_at: string
  updated_at: string
}

export interface CandidateWithJob extends Candidate {
  job: Pick<Job, 'id' | 'title' | 'description' | 'status'>
}

export interface CandidateAnalysis {
  id: string
  candidate_id: string
  organization_id: string
  summary: string
  strengths: string[]
  potential_gaps: string[]
  matching_skills: string[]
  interview_questions: string[]
  model: string
  disclaimer: string
  created_at: string
  updated_at: string
}

export interface JobInput {
  organizationId?: string
  title: string
  description: string
  location?: string
  employmentType?: string
  notes?: string
}

export interface CandidateInput {
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

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string; aiUnavailable?: boolean }
  | { ok: false; error: string }
