import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { JobsManager } from "@/components/jobs-manager";
import { WorkspaceToolView } from "@/components/workspace-tool-view";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getOrganization, getWorkspaceData } from "@/lib/data";
import { getCollaborationData } from "@/lib/workspace-data";
export const dynamic = "force-dynamic";
const tabs = [
  "jobs",
  "candidates",
  "team",
  "groups",
  "schedule",
  "insights",
  "activity",
];
export default async function AdminOrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params,
    { view = "jobs" } = await searchParams;
  if (!tabs.includes(view)) notFound();
  const { supabase, profile } = await requireAdmin(),
    organization = await getOrganization(supabase, id);
  if (!organization) notFound();
  const [{ jobs, candidates }, data] = await Promise.all([
    getWorkspaceData(supabase, id),
    getCollaborationData(supabase, id),
  ]);
  const counts = Object.fromEntries(
    jobs.map((j) => [j.id, candidates.filter((c) => c.job_id === j.id).length]),
  );
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/admin/organizations">
            <ArrowLeft />
            All workspaces
          </Link>
        </Button>
        <span className="status-chip text-primary">
          <ShieldCheck className="size-3.5" />
          Admin workspace view · {profile.full_name}
        </span>
      </div>
      <header className="workspace-heading">
        <div>
          <p className="section-label">Customer workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">{organization.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {organization.industry || "Your customer hiring workspace"}
            {organization.location ? " · " + organization.location : ""}
          </p>
        </div>
      </header>
      <nav
        aria-label="Workspace sections"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2"
      >
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={"?view=" + tab}
            aria-current={tab === view ? "page" : undefined}
            className={
              "shrink-0 rounded-xl px-4 py-2 text-sm font-medium capitalize transition-colors " +
              (tab === view
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted")
            }
          >
            {tab}
          </Link>
        ))}
      </nav>
      {view === "jobs" ? (
        <JobsManager
          initialJobs={jobs}
          candidateCounts={counts}
          organizationId={id}
        />
      ) : view === "candidates" ? (
        <CandidateWorkspace
          initialCandidates={candidates}
          jobs={jobs}
          organizationId={id}
        />
      ) : (
        <WorkspaceToolView
          tool={view}
          organizationId={id}
          data={data}
          jobs={jobs}
          candidates={candidates}
          profile={profile}
        />
      )}
    </div>
  );
}
