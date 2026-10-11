"use server";
import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireProfile,
  requireWorkspaceManager,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPipelineStage } from "@/lib/pipeline";
import type { ActionResult } from "@/lib/types";
type Context = Awaited<ReturnType<typeof requireProfile>>;
function refresh(organizationId?: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/candidates", "layout");
  if (organizationId) revalidatePath("/admin/organizations/" + organizationId);
}
async function run(
  context: Context,
  operation: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await operation();
    refresh(context.profile.organization_id ?? undefined);
    return { ok: true, message: "Saved successfully." };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save. Please try again.",
    };
  }
}
function text(value: string, label: string, max = 6000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error("Enter a valid " + label + ".");
  return value.trim();
}
export async function saveOrganization(input: {
  id?: string;
  name: string;
  website_url: string;
  industry: string;
  location: string;
}) {
  const context = await requireAdmin();
  return run(context, async () => {
    const name = text(input.name, "organization name", 120);
    if (input.website_url) {
      const url = new URL(input.website_url);
      if (!["https:", "http:"].includes(url.protocol))
        throw new Error("Use an https website URL.");
    }
    const values = {
      name,
      website_url: input.website_url.trim() || null,
      industry: input.industry.trim().slice(0, 120) || null,
      location: input.location.trim().slice(0, 120) || null,
    };
    const query = input.id
      ? context.supabase.from("organizations").update(values).eq("id", input.id)
      : context.supabase.from("organizations").insert(values);
    const { error } = await query;
    if (error)
      throw new Error(
        error.code === "23505"
          ? "An organization with this name already exists."
          : "Organization could not be saved.",
      );
  });
}
export async function removeOrganization(id: string) {
  const context = await requireAdmin();
  return run(context, async () => {
    const [jobs, profiles] = await Promise.all([
      context.supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", id),
      context.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", id),
    ]);
    if (jobs.error || profiles.error)
      throw new Error("Could not verify organization contents.");
    if (jobs.count || profiles.count)
      throw new Error(
        "Move or remove members and jobs before deleting this organization.",
      );
    const { error } = await context.supabase
      .from("organizations")
      .delete()
      .eq("id", id);
    if (error) throw new Error("Organization could not be deleted.");
  });
}
export async function updateManagedProfile(input: {
  id: string;
  full_name: string;
  role: "admin" | "customer";
  organization_id: string | null;
  is_active: boolean;
  is_org_manager: boolean;
}) {
  const context = await requireAdmin();
  return run(context, async () => {
    if (
      input.id === context.userId &&
      (input.role !== "admin" || !input.is_active)
    )
      throw new Error("You cannot remove your own access.");
    if (input.role !== "admin" && input.role !== "customer")
      throw new Error("Invalid role.");
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: text(input.full_name, "name", 160),
        role: input.role,
        organization_id: input.role === "admin" ? null : input.organization_id,
        is_active: input.is_active,
        is_org_manager: input.role === "customer" && input.is_org_manager,
      })
      .eq("id", input.id);
    if (error)
      throw new Error(
        "Profile could not be saved. Remove group memberships before changing the organization.",
      );
  });
}
export async function deleteManagedProfile(id: string) {
  const context = await requireProfile();
  return run(context, async () => {
    if (id === context.userId)
      throw new Error("You cannot delete your own account.");
    const { data: target, error: lookupError } = await context.supabase
      .from("profiles")
      .select("id, role, organization_id, is_org_manager")
      .eq("id", id)
      .single();
    if (lookupError || !target) throw new Error("User not found.");
    if (
      context.profile.role !== "admin" &&
      (!context.profile.is_org_manager ||
        target.role !== "customer" ||
        target.is_org_manager ||
        target.organization_id !== context.profile.organization_id)
    )
      throw new Error("You can only remove recruiters in your own workspace.");
    // Removing the authoritative profile immediately revokes RLS access, including existing JWTs.
    const { error } = await createAdminClient().auth.admin.deleteUser(id);
    if (error) throw new Error("The account could not be deleted.");
  });
}
export async function renameTeamMember(
  id: string,
  organizationId: string,
  fullName: string,
) {
  const context = await requireWorkspaceManager(organizationId);
  return run(context, async () => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: text(fullName, "name", 160) })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select("id")
      .single();
    if (error) throw new Error("The teammate profile could not be updated.");
  });
}
export async function setMemberActive(
  id: string,
  organizationId: string,
  isActive: boolean,
) {
  const context = await requireWorkspaceManager(organizationId);
  return run(context, async () => {
    if (id === context.userId)
      throw new Error("You cannot remove your own access.");
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) throw new Error("Member access could not be changed.");
  });
}
export async function createGroup(
  organizationId: string,
  name: string,
  description: string,
) {
  const context = await requireWorkspaceManager(organizationId);
  return run(context, async () => {
    const { error } = await context.supabase.from("job_groups").insert({
      organization_id: organizationId,
      name: text(name, "group name", 100),
      description: description.trim().slice(0, 2000),
    });
    if (error)
      throw new Error("Group could not be created. Choose a unique name.");
  });
}
export async function removeGroup(id: string, organizationId: string) {
  const context = await requireWorkspaceManager(organizationId);
  return run(context, async () => {
    const { error } = await context.supabase
      .from("job_groups")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);
    if (error) throw new Error("Group could not be removed.");
  });
}
export async function toggleGroupLink(input: {
  organizationId: string;
  groupId: string;
  targetId: string;
  kind: "member" | "job";
  remove: boolean;
}) {
  const context = await requireWorkspaceManager(input.organizationId);
  return run(context, async () => {
    if (input.kind !== "member" && input.kind !== "job")
      throw new Error("Invalid link.");
    const table = input.kind === "member" ? "group_members" : "group_jobs";
    const column = input.kind === "member" ? "profile_id" : "job_id";
    const query = input.remove
      ? context.supabase
          .from(table)
          .delete()
          .eq("organization_id", input.organizationId)
          .eq("group_id", input.groupId)
          .eq(column, input.targetId)
      : context.supabase.from(table).insert({
          organization_id: input.organizationId,
          group_id: input.groupId,
          [column]: input.targetId,
        });
    const { error } = await query;
    if (error)
      throw new Error(
        "The group link could not be changed. Both records must belong to this workspace.",
      );
  });
}
export async function assignJob(input: {
  organizationId: string;
  jobId: string;
  assignedTo: string | null;
  restricted: boolean;
}) {
  const context = await requireWorkspaceManager(input.organizationId);
  return run(context, async () => {
    const { error } = await context.supabase
      .from("jobs")
      .update({ assigned_to: input.assignedTo, restricted: input.restricted })
      .eq("id", input.jobId)
      .eq("organization_id", input.organizationId);
    if (error) throw new Error("Job access could not be saved.");
  });
}
export async function addCandidateNote(candidateId: string, body: string) {
  const context = await requireProfile();
  return run(context, async () => {
    const { data: candidate, error: lookupError } = await context.supabase
      .from("candidates")
      .select("organization_id")
      .eq("id", candidateId)
      .single();
    if (lookupError || !candidate) throw new Error("Candidate unavailable.");
    const { error } = await context.supabase.from("candidate_notes").insert({
      candidate_id: candidateId,
      organization_id: candidate.organization_id,
      author_id: context.userId,
      body: text(body, "note"),
    });
    if (error) throw new Error("Note could not be saved.");
  });
}
export async function removeCandidateNote(noteId: string) {
  const context = await requireProfile();
  return run(context, async () => {
    const { error } = await context.supabase
      .from("candidate_notes")
      .delete()
      .eq("id", noteId);
    if (error) throw new Error("Note could not be removed.");
  });
}
export async function updateCandidateTags(candidateId: string, tags: string[]) {
  const context = await requireProfile();
  return run(context, async () => {
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string"))
      throw new Error("Invalid tags.");
    const values = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
    if (values.length > 12 || values.some((tag) => tag.length > 40))
      throw new Error("Use up to 12 tags of 40 characters each.");
    const { error } = await context.supabase
      .from("candidates")
      .update({ tags: values })
      .eq("id", candidateId);
    if (error) throw new Error("Tags could not be saved.");
  });
}
export async function scheduleInterview(input: {
  candidateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
}) {
  const context = await requireProfile();
  return run(context, async () => {
    const start = new Date(input.startsAt),
      end = new Date(input.endsAt);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start ||
      end.getTime() - start.getTime() > 8 * 3600000
    )
      throw new Error("Choose a valid interview time, up to eight hours.");
    const { data: candidate, error: lookupError } = await context.supabase
      .from("candidates")
      .select("organization_id")
      .eq("id", input.candidateId)
      .single();
    if (lookupError || !candidate) throw new Error("Candidate unavailable.");
    const { error } = await context.supabase.from("interviews").insert({
      candidate_id: input.candidateId,
      organization_id: candidate.organization_id,
      created_by: context.userId,
      title: text(input.title, "interview title", 160),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      location: input.location.trim().slice(0, 300),
      notes: input.notes.trim().slice(0, 6000),
    });
    if (error) throw new Error("Interview could not be scheduled.");
  });
}
export async function setInterviewStatus(
  id: string,
  status: "scheduled" | "completed" | "cancelled",
) {
  const context = await requireProfile();
  return run(context, async () => {
    if (!["scheduled", "completed", "cancelled"].includes(status))
      throw new Error("Invalid status.");
    const { error } = await context.supabase
      .from("interviews")
      .update({ status })
      .eq("id", id);
    if (error) throw new Error("Interview could not be updated.");
  });
}

export async function moveCandidates(ids: string[], stage: string) {
  const context = await requireProfile();
  return run(context, async () => {
    if (
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      !isPipelineStage(stage)
    )
      throw new Error("Choose 1–100 candidates and a valid stage.");
    const { error } = await context.supabase.rpc("move_candidates", {
      candidate_ids: ids,
      next_stage: stage,
    });
    if (error)
      throw new Error(
        "Some candidates were unavailable. No changes were saved.",
      );
  });
}
