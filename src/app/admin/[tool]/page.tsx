import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAllOrganizations, getWorkspaceData } from "@/lib/data";
import { getCollaborationData } from "@/lib/workspace-data";
import { OrganizationDirectory } from "@/components/organization-directory";
import { ActivityWorkspace } from "@/components/activity-workspace";
import { ScheduleWorkspace } from "@/components/schedule-workspace";
import { InsightsWorkspace } from "@/components/insights-workspace";
import { SearchWorkspace } from "@/components/search-workspace";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { JobsManager } from "@/components/jobs-manager";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { PageHeading } from "@/components/workspace-ui";
export const dynamic = "force-dynamic";
export default async function AdminToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tool } = await params;
  if (
    ![
      "organizations",
      "jobs",
      "candidates",
      "activity",
      "schedule",
      "insights",
      "search",
      "settings",
    ].includes(tool)
  )
    notFound();
  const { profile, supabase } = await requireAdmin();
  if (tool === "organizations")
    return (
      <div className="mx-auto max-w-7xl">
        <OrganizationDirectory
          organizations={await getAllOrganizations(supabase)}
        />
      </div>
    );
  if (tool === "settings")
    return (
      <div className="mx-auto max-w-5xl">
        <SettingsWorkspace email={profile.email} />
      </div>
    );
  const [{ jobs, candidates }, data, query] = await Promise.all([
    getWorkspaceData(supabase),
    getCollaborationData(supabase),
    searchParams,
  ]);
  const counts = Object.fromEntries(
    jobs.map((j) => [j.id, candidates.filter((c) => c.job_id === j.id).length]),
  );
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      {tool === "activity" ? (
        <ActivityWorkspace events={data.events} />
      ) : tool === "schedule" ? (
        <ScheduleWorkspace
          interviews={data.interviews}
          candidates={candidates}
        />
      ) : tool === "insights" ? (
        <InsightsWorkspace jobs={jobs} candidates={candidates} />
      ) : tool === "search" ? (
        <SearchWorkspace
          jobs={jobs}
          candidates={candidates}
          admin
          initialQuery={query.q}
        />
      ) : tool === "jobs" ? (
        <>
          <PageHeading
            eyebrow="Across all workspaces"
            title="All roles"
            description="Manage existing roles across the platform. Open a customer workspace to create a new role."
          />
          <JobsManager
            initialJobs={jobs}
            candidateCounts={counts}
            isAdmin
            hideCreate
          />
        </>
      ) : (
        <>
          <PageHeading
            eyebrow="Across all workspaces"
            title="All candidates"
            description="Explore candidates across your customer workspaces. Select a role when adding a candidate."
          />
          <CandidateWorkspace initialCandidates={candidates} jobs={jobs} />
        </>
      )}
    </div>
  );
}
