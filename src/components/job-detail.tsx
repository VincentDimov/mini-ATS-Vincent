import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Wallet, Briefcase } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getWorkspaceData } from "@/lib/data";
import { CandidateWorkspace } from "@/components/candidate-workspace";
import { JobsManager } from "@/components/jobs-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading } from "@/components/workspace-ui";
export async function JobDetail({ id }: { id: string }) {
  const { profile, supabase } = await requireProfile();
  const { data: found, error } = await supabase
    .from("jobs")
    .select("organization_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !found) notFound();
  const { jobs, candidates } = await getWorkspaceData(
    supabase,
    found.organization_id,
  );
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();
  const applicants = candidates.filter((c) => c.job_id === id),
    admin = profile.role === "admin";
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <Button asChild variant="ghost">
        <Link
          href={
            admin
              ? "/admin/organizations/" + job.organization_id
              : "/dashboard/jobs"
          }
        >
          <ArrowLeft />
          Back to roles
        </Link>
      </Button>
      <PageHeading
        eyebrow={"Role workspace · " + job.status}
        title={job.title}
        description="Everything your team needs for this role, in one place."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <div className="mb-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {job.location ? (
                <span className="status-chip">
                  <MapPin className="size-3" />
                  {job.location}
                </span>
              ) : null}
              {job.employment_type ? (
                <span className="status-chip">
                  <Briefcase className="size-3" />
                  {job.employment_type}
                </span>
              ) : null}
              {job.salary_range ? (
                <span className="status-chip">
                  <Wallet className="size-3" />
                  {job.salary_range}
                </span>
              ) : null}
            </div>
            <h2 className="mb-3 font-semibold">Role description</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {job.description}
            </p>
            {job.notes ? (
              <div className="mt-5 rounded-xl bg-muted/40 p-4">
                <h3 className="text-sm font-medium">Internal notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {job.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <JobsManager
          initialJobs={[job]}
          organizationId={admin ? job.organization_id : undefined}
          candidateCounts={{ [job.id]: applicants.length }}
          hideCreate
        />
      </div>
      <h2 className="text-xl font-semibold">
        Candidate pipeline{" "}
        <span className="text-muted-foreground">({applicants.length})</span>
      </h2>
      <CandidateWorkspace
        initialCandidates={applicants}
        jobs={[job]}
        organizationId={job.organization_id}
      />
    </div>
  );
}
