import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { getCollaborationData } from "@/lib/workspace-data";
import { WorkspaceToolView } from "@/components/workspace-tool-view";
export const dynamic = "force-dynamic";
export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tool } = await params;
  if (
    ![
      "team",
      "groups",
      "activity",
      "schedule",
      "insights",
      "search",
      "settings",
    ].includes(tool)
  )
    notFound();
  const { profile, supabase } = await requireCustomer();
  const [{ jobs, candidates }, data, query] = await Promise.all([
    getWorkspaceData(supabase, profile.organization_id!),
    getCollaborationData(supabase, profile.organization_id!),
    searchParams,
  ]);
  return (
    <div className="mx-auto max-w-7xl">
      <WorkspaceToolView
        tool={tool}
        organizationId={profile.organization_id!}
        data={data}
        jobs={jobs}
        candidates={candidates}
        profile={profile}
        initialQuery={query.q}
      />
    </div>
  );
}
