"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function downloadCandidateCv(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  const { supabase } = await requireProfile();
  const candidate = await supabase
    .from("candidates")
    .select("cv_path,cv_filename")
    .eq("id", id)
    .single();
  if (candidate.error || !candidate.data?.cv_path)
    return { ok: false, error: "CV unavailable or access revoked." };
  const signed = await supabase.storage
    .from("candidate-cvs")
    .createSignedUrl(candidate.data.cv_path, 60, {
      download: candidate.data.cv_filename ?? "candidate-cv.pdf",
    });
  if (signed.error || !signed.data)
    return { ok: false, error: "Download unavailable. Please retry." };
  return { ok: true, data: { url: signed.data.signedUrl } };
}

export async function setCandidateRetention(
  id: string,
  date: string | null,
): Promise<ActionResult> {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin" && !profile.is_org_manager)
    return { ok: false, error: "Only workspace managers can set retention." };
  if (
    date !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      Date.parse(date) <= Date.now())
  )
    return {
      ok: false,
      error: "Choose a future deletion date, or clear the date.",
    };
  const { error } = await supabase
    .from("candidates")
    .update({ retain_until: date ? `${date}T00:00:00Z` : null })
    .eq("id", id)
    .select("id")
    .single();
  if (error)
    return {
      ok: false,
      error: "Retention could not be updated or access was revoked.",
    };
  revalidatePath(`/candidates/${id}`);
  return {
    ok: true,
    message:
      "Retention updated. Scheduled deletion requires the maintenance job to be running.",
  };
}
