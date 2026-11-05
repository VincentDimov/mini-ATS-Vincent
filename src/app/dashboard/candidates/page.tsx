import { PaginatedCandidates } from "@/components/paginated-candidates";
import type { CandidateQuery } from "@/lib/candidate-search";
import { requireCustomer } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<CandidateQuery>;
}) {
  const { profile, supabase } = await requireCustomer();
  const { jobs } = await getWorkspaceData(supabase, profile.organization_id!);

  return (
    <div className="mx-auto max-w-[1600px] space-y-2">
      <div>
        <p className="text-sm font-medium text-primary">CANDIDATE PIPELINE</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Candidates
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Filter quickly, drag candidates between stages, or use the per-card
          stage control on any device.
        </p>
      </div>
      <div className="pt-4">
        <PaginatedCandidates
          supabase={supabase}
          query={await searchParams}
          jobs={jobs}
          organizationId={profile.organization_id!}
        />
      </div>
    </div>
  );
}
