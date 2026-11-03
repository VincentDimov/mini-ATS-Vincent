import { CandidateWorkspace } from "@/components/candidate-workspace";
import { getCandidatePage, type CandidateQuery } from "@/lib/candidate-search";
import type { Job } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function PaginatedCandidates({ supabase, query, jobs, organizationId }: { supabase: SupabaseClient; query: CandidateQuery; jobs: Job[]; organizationId?: string }) {
  const result = await getCandidatePage(supabase, query, organizationId);
  return <CandidateWorkspace key={JSON.stringify(result.preferences)} initialCandidates={result.candidates} jobs={jobs} organizationId={organizationId} initialPreferences={result.preferences} pagination={result.pagination} />;
}
