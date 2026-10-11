import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateProfile } from "@/components/candidate-profile";
import { CandidateCollaboration } from "@/components/candidate-collaboration";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import type {
  Candidate,
  CandidateAnalysis,
  CandidateWithJob,
  Job,
} from "@/lib/types";
import type { Profile } from "@/lib/types";
import type { CandidateNote } from "@/lib/workspace-types";

export const dynamic = "force-dynamic";

function strings(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, supabase } = await requireProfile();
  const { data: candidateData, error: candidateError } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (candidateError || !candidateData) notFound();
  const candidate = candidateData as Candidate;
  const [{ data: jobData, error: jobError }, { data: analysisData }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id, organization_id, created_by, title, description, location, employment_type, notes, status, created_at, updated_at",
        )
        .eq("id", candidate.job_id)
        .maybeSingle(),
      supabase
        .from("candidate_analyses")
        .select(
          "id, candidate_id, organization_id, summary, strengths, potential_gaps, matching_skills, interview_questions, model, disclaimer, created_at, updated_at",
        )
        .eq("candidate_id", candidate.id)
        .maybeSingle(),
    ]);

  if (jobError || !jobData) notFound();
  const job = jobData as Job;
  const candidateWithJob: CandidateWithJob = {
    ...candidate,
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
    },
  };

  const analysis = analysisData
    ? ({
        ...(analysisData as Omit<
          CandidateAnalysis,
          | "strengths"
          | "potential_gaps"
          | "matching_skills"
          | "interview_questions"
        >),
        strengths: strings((analysisData as { strengths: unknown }).strengths),
        potential_gaps: strings(
          (analysisData as { potential_gaps: unknown }).potential_gaps,
        ),
        matching_skills: strings(
          (analysisData as { matching_skills: unknown }).matching_skills,
        ),
        interview_questions: strings(
          (analysisData as { interview_questions: unknown })
            .interview_questions,
        ),
      } satisfies CandidateAnalysis)
    : null;

  let cvUrl: string | null = null;
  if (candidate.cv_path) {
    const { data: signedUrlData } = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(candidate.cv_path, 60);
    cvUrl = signedUrlData?.signedUrl ?? null;
  }

  const backHref =
    profile.role === "admin"
      ? `/admin/organizations/${candidate.organization_id}`
      : "/dashboard/candidates";
  const [notesResponse, profilesResponse] = await Promise.all([
    supabase
      .from("candidate_notes")
      .select("*")
      .eq("candidate_id", id)
      .order("created_at"),
    supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", candidate.organization_id),
  ]);
  if (notesResponse.error || profilesResponse.error)
    throw new Error("Candidate collaboration could not be loaded.");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref}>
          <ArrowLeft /> Back to candidates
        </Link>
      </Button>
      <CandidateProfile
        candidate={candidateWithJob}
        analysis={analysis}
        cvUrl={cvUrl}
      />
      <CandidateCollaboration
        candidateId={id}
        tags={candidate.tags ?? []}
        notes={(notesResponse.data ?? []) as CandidateNote[]}
        profiles={[
          profile,
          ...((profilesResponse.data ?? []) as Profile[]).filter(
            (p) => p.id !== profile.id,
          ),
        ]}
        currentUserId={profile.id}
        canManage={profile.role === "admin" || profile.is_org_manager}
      />
    </div>
  );
}
