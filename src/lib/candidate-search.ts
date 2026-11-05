import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateWithJob } from "@/lib/types";
import { isPipelineStage } from "@/lib/pipeline";

export type CandidateQuery = { q?: string; job?: string; stage?: string; sort?: string; page?: string; pipelineView?: string };
export async function getCandidatePage(supabase: SupabaseClient, query: CandidateQuery, organizationId?: string) {
  const page = Math.min(200, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const search = (query.q ?? "").slice(0, 160);
  const job = query.job && /^[a-f0-9-]{36}$/i.test(query.job) ? query.job : null;
  const stage = query.stage && isPipelineStage(query.stage) ? query.stage : null;
  const sort = ["name", "oldest"].includes(query.sort ?? "") ? query.sort! : "newest";
  const { data, error } = await supabase.rpc("search_candidates", { query_text: search, org: organizationId ?? null, job, stage, sort_mode: sort, page_number: page });
  if (error || !data) throw new Error("Candidate search unavailable. Please retry.");
  return { candidates: data.candidates as CandidateWithJob[], pagination: { page, total: data.total as number }, preferences: { search, jobFilter: job ?? "all", stageFilter: stage ?? "all", sort, view: query.pipelineView === "list" ? "list" as const : "board" as const } };
}
