"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePdf } from "@/lib/pdf-validation";
import { requestOpenAiAnalysis } from "@/lib/ai-analysis";
import { cleanupCvFiles } from "@/lib/cv-maintenance";
import { isPipelineStage } from "@/lib/pipeline";
import type {
  ActionResult,
  CandidateInput,
  JobInput,
  PipelineStage,
} from "@/lib/types";
import { validateCandidateInput, validateJobInput } from "@/lib/validation";

type SupabaseClient = Awaited<ReturnType<typeof requireProfile>>["supabase"];

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function nullable(value: string | undefined): string | null {
  return value ?? null;
}

function revalidateWorkspace(organizationId?: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/admin", "layout");
  if (organizationId) revalidatePath(`/admin/organizations/${organizationId}`);
}

async function resolveOrganizationId(
  supabase: SupabaseClient,
  profile: Awaited<ReturnType<typeof requireProfile>>["profile"],
  requestedOrganizationId?: string,
) {
  if (profile.role === "customer") {
    if (!profile.organization_id)
      throw new Error("Your account is not assigned to an organization.");
    return profile.organization_id;
  }

  if (!requestedOrganizationId) {
    throw new Error("Choose an organization before creating data as an admin.");
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", requestedOrganizationId)
    .maybeSingle();

  if (error || !data)
    throw new Error("The selected organization could not be found.");
  return data.id as string;
}

async function getAccessibleJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, organization_id, title, description, status")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) throw new Error("The selected job is unavailable.");
  return data as {
    id: string;
    organization_id: string;
    title: string;
    description: string;
    status: string;
  };
}

export async function createJob(
  input: JobInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireProfile();

  try {
    const organizationId = await resolveOrganizationId(
      context.supabase,
      context.profile,
      input.organizationId,
    );
    const value = validateJobInput(input);
    const { data, error } = await context.supabase
      .from("jobs")
      .insert({
        organization_id: organizationId,
        created_by: context.userId,
        title: value.title,
        description: value.description,
        location: nullable(value.location),
        employment_type: nullable(value.employmentType),
        notes: nullable(value.notes),
        salary_range: nullable(value.salaryRange),
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error("The job could not be created.");
    revalidateWorkspace(organizationId);
    return {
      ok: true,
      data: { id: data.id as string },
      message: "Job created.",
    };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The job could not be created."),
    };
  }
}

export async function updateJob(
  jobId: string,
  input: JobInput,
): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    const value = validateJobInput(input);
    const job = await getAccessibleJob(context.supabase, jobId);
    const { error } = await context.supabase
      .from("jobs")
      .update({
        title: value.title,
        description: value.description,
        location: nullable(value.location),
        employment_type: nullable(value.employmentType),
        notes: nullable(value.notes),
        salary_range: nullable(value.salaryRange),
      })
      .eq("id", jobId).select("id").single();

    if (error) throw new Error("The job could not be updated.");
    revalidateWorkspace(job.organization_id);
    return { ok: true, message: "Job updated." };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The job could not be updated."),
    };
  }
}

export async function setJobStatus(
  jobId: string,
  status: "active" | "archived",
): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    const job = await getAccessibleJob(context.supabase, jobId);
    const { error } = await context.supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId).select("id").single();
    if (error) throw new Error("The job status could not be changed.");
    revalidateWorkspace(job.organization_id);
    return {
      ok: true,
      message: status === "archived" ? "Job archived." : "Job restored.",
    };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The job status could not be changed."),
    };
  }
}

export async function deleteJob(jobId: string): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    const job = await getAccessibleJob(context.supabase, jobId);
    const { error } = await context.supabase
      .from("jobs")
      .delete()
      .eq("id", jobId).select("id").single();
    if (error) throw new Error("The job could not be deleted.");
    revalidateWorkspace(job.organization_id);
    return { ok: true, message: "Job and its candidates were deleted." };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The job could not be deleted."),
    };
  }
}

export async function createCandidate(
  input: CandidateInput,
): Promise<ActionResult<{ id: string }>> {
  const context = await requireProfile();

  try {
    const value = validateCandidateInput(input);
    const job = await getAccessibleJob(context.supabase, value.jobId);

    if (job.status !== "active") {
      throw new Error("Candidates can only be added to an active job.");
    }

    if (
      input.organizationId &&
      context.profile.role === "admin" &&
      input.organizationId !== job.organization_id
    ) {
      throw new Error("Choose a job from the active organization.");
    }

    const { data, error } = await context.supabase
      .from("candidates")
      .insert({
        organization_id: job.organization_id,
        job_id: job.id,
        created_by: context.userId,
        full_name: value.fullName,
        email: value.email,
        phone: nullable(value.phone),
        linkedin_url: nullable(value.linkedinUrl),
        current_title: nullable(value.currentTitle),
        current_company: nullable(value.currentCompany),
        notes: nullable(value.notes),
        pipeline_stage: value.pipelineStage,
      })
      .select("id")
      .single();

    if (error || !data) {
      if (error?.code === "23505")
        throw new Error(
          "A candidate with this email already exists for this job.",
        );
      throw new Error("The candidate could not be created.");
    }

    revalidateWorkspace(job.organization_id);
    return {
      ok: true,
      data: { id: data.id as string },
      message: "Candidate added.",
    };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The candidate could not be created."),
    };
  }
}

export async function updateCandidate(
  candidateId: string,
  input: CandidateInput,
): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    const value = validateCandidateInput(input);
    const { data: currentCandidate, error: candidateError } =
      await context.supabase
        .from("candidates")
        .select("id, organization_id")
        .eq("id", candidateId)
        .maybeSingle();

    if (candidateError || !currentCandidate)
      throw new Error("The candidate is unavailable.");
    const job = await getAccessibleJob(context.supabase, value.jobId);

    if (job.organization_id !== currentCandidate.organization_id) {
      throw new Error(
        "A candidate can only be moved to a job in the same organization.",
      );
    }

    const { error } = await context.supabase
      .from("candidates")
      .update({
        job_id: job.id,
        full_name: value.fullName,
        email: value.email,
        phone: nullable(value.phone),
        linkedin_url: nullable(value.linkedinUrl),
        current_title: nullable(value.currentTitle),
        current_company: nullable(value.currentCompany),
        notes: nullable(value.notes),
        pipeline_stage: value.pipelineStage,
      })
      .eq("id", candidateId).select("id").single();

    if (error) {
      if (error.code === "23505")
        throw new Error(
          "A candidate with this email already exists for this job.",
        );
      throw new Error("The candidate could not be updated.");
    }

    revalidateWorkspace(currentCandidate.organization_id as string);
    revalidatePath(`/candidates/${candidateId}`);
    return { ok: true, message: "Candidate updated." };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The candidate could not be updated."),
    };
  }
}

export async function updateCandidateStage(
  candidateId: string,
  pipelineStage: PipelineStage,
): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    if (!isPipelineStage(pipelineStage))
      throw new Error("Choose a valid pipeline stage.");
    const { data, error } = await context.supabase
      .from("candidates")
      .update({ pipeline_stage: pipelineStage })
      .eq("id", candidateId)
      .select("organization_id")
      .maybeSingle();

    if (error || !data)
      throw new Error("The candidate stage could not be changed.");
    const organizationId = data.organization_id as string;
    revalidateWorkspace(organizationId);
    revalidatePath(`/candidates/${candidateId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(
        error,
        "The candidate stage could not be changed.",
      ),
    };
  }
}

export async function deleteCandidate(
  candidateId: string,
): Promise<ActionResult> {
  const context = await requireProfile();

  try {
    const { data, error: loadError } = await context.supabase
      .from("candidates")
      .select("organization_id")
      .eq("id", candidateId)
      .maybeSingle();
    if (loadError || !data) throw new Error("The candidate is unavailable.");

    const { error } = await context.supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId).select("id").single();
    if (error) throw new Error("The candidate could not be deleted.");
    revalidateWorkspace(data.organization_id as string);
    return { ok: true, message: "Candidate deleted." };
  } catch (error) {
    return {
      ok: false,
      error: messageFromError(error, "The candidate could not be deleted."),
    };
  }
}

type AnalysisContext = { token: string; path: string; jobId: string; version: number; title: string; description: string };

async function analyzeSavedCv(context: Awaited<ReturnType<typeof requireProfile>>, candidateId: string): Promise<ActionResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("begin_analysis", { actor_id: context.userId, cid: candidateId });
  if (error || !data) throw new Error("Candidate or CV is unavailable.");
  const snapshot = data as AnalysisContext;
  // Read the committed object, not a stale file supplied by a concurrent request.
  const { data: cv, error: downloadError } = await admin.storage.from("candidate-cvs").download(snapshot.path);
  if (downloadError || !cv) throw new Error("The saved CV could not be read. Retry analysis later.");
  const result = await requestOpenAiAnalysis(new Uint8Array(await cv.arrayBuffer()), snapshot);
  if (!result.configured) return { ok: true, aiUnavailable: true, message: "CV saved. AI analysis is not configured." };
  const saved = await admin.rpc("save_analysis", {
    actor_id: context.userId, cid: candidateId, token: snapshot.token,
    expected_path: snapshot.path, expected_job: snapshot.jobId, expected_version: snapshot.version,
    payload: result.analysis, model_name: result.model,
  });
  if (saved.error) throw new Error("CV saved, but analysis could not be saved. Retry analysis later.");
  if (!saved.data) return { ok: true, aiUnavailable: true, message: "CV or role changed during analysis. Outdated result was discarded; retry for the current context." };
  return { ok: true, message: "AI-assisted summary saved for the current CV and role." };
}

export async function retryCandidateAnalysis(candidateId: string): Promise<ActionResult> {
  const context = await requireProfile();
  try {
    const result = await analyzeSavedCv(context, candidateId);
    revalidatePath(`/candidates/${candidateId}`);
    return result;
  } catch {
    return { ok: false, error: "Analysis unavailable. Your CV is saved; please retry later." };
  }
}

export async function uploadAndAnalyzeCandidateCv(formData: FormData): Promise<ActionResult> {
  const context = await requireProfile();
  let committed = false;
  let candidateId = "";
  try {
    const id = formData.get("candidateId"), file = formData.get("file");
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id) || !(file instanceof File)) throw new Error("Choose a candidate and a PDF CV.");
    candidateId = id;
    // Authorize before buffering/uploading. The service RPC rechecks access.
    const candidate = await context.supabase.from("candidates").select("id,organization_id").eq("id", id).single();
    if (candidate.error || !candidate.data) throw new Error("Candidate unavailable.");
    if (file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error("Choose a PDF smaller than 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validated = validatePdf(bytes, file.name, file.type);
    const admin = createAdminClient();
    const reservation = await admin.rpc("reserve_cv", { actor_id: context.userId, cid: id, bytes: bytes.length, digest: validated.sha256 });
    if (reservation.error || !reservation.data) throw new Error("Upload unavailable or quota reached. Retry later or contact your administrator.");
    const { path, requestId } = reservation.data as { path: string; requestId: string };
    const uploaded = await admin.storage.from("candidate-cvs").upload(path, bytes, { contentType: "application/pdf", cacheControl: "0", upsert: false });
    if (uploaded.error) throw new Error("CV upload failed. Your previous CV is unchanged.");
    const linked = await admin.rpc("commit_cv", { actor_id: context.userId, cid: id, rid: requestId, filename: validated.filename });
    if (linked.error) throw new Error("CV could not be linked. Your previous CV is unchanged; cleanup is queued.");
    if (!linked.data) throw new Error("A newer upload replaced this request. This file was not made active; cleanup is queued.");
    committed = true;
    revalidateWorkspace(candidate.data.organization_id as string);
    await cleanupCvFiles().catch(() => undefined);
    return await analyzeSavedCv(context, id);
  } catch (error) {
    if (committed) return { ok: true, aiUnavailable: true, message: "CV uploaded. Analysis is unavailable; use Retry analysis later without uploading again." };
    return { ok: false, error: messageFromError(error, "CV could not be processed.") };
  } finally {
    if (candidateId) revalidatePath(`/candidates/${candidateId}`);
  }
}
