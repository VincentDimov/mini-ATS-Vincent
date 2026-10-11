import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  TrendingUp,
  Users,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/workspace-ui";
import { PIPELINE_STAGES, PIPELINE_META } from "@/lib/pipeline";
import type { CandidateWithJob, Job } from "@/lib/types";
export function InsightsWorkspace({
  jobs,
  candidates,
}: {
  jobs: Job[];
  candidates: CandidateWithJob[];
}) {
  const active = jobs.filter((j) => j.status === "active"),
    counts = PIPELINE_STAGES.map((stage) => ({
      stage,
      count: candidates.filter((c) => c.pipeline_stage === stage).length,
    }));
  const latest = Math.max(1, ...counts.map((c) => c.count)),
    now = new Date().getTime();
  const waiting = candidates.filter(
    (c) =>
      !["offered", "rejected"].includes(c.pipeline_stage) &&
      now - new Date(c.updated_at).getTime() > 7 * 86400000,
  );
  const withCv = candidates.filter((c) => c.cv_path).length;
  const stats = [
    {
      label: "Active roles",
      value: active.length,
      icon: Briefcase,
      tint: "bg-violet-500/10 text-violet-700",
    },
    {
      label: "Candidate pool",
      value: candidates.length,
      icon: Users,
      tint: "bg-sky-500/10 text-sky-700",
    },
    {
      label: "Awaiting follow-up",
      value: waiting.length,
      icon: Clock3,
      tint: "bg-amber-500/10 text-amber-700",
    },
    {
      label: "CV coverage",
      value:
        (candidates.length
          ? Math.round((withCv / candidates.length) * 100)
          : 0) + "%",
      icon: TrendingUp,
      tint: "bg-emerald-500/10 text-emerald-700",
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Clarity for your team"
        title="Pipeline intelligence"
        description="Operational insights from your visible records. Spot delayed follow-ups and understand the shape of your hiring pipeline."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <Card key={label}>
            <CardContent className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
              <div className={"rounded-xl p-3 " + tint}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current pipeline distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {counts.map(({ stage, count }) => (
              <div key={stage}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{PIPELINE_META[stage].label}</span>
                  <strong>{count}</strong>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      "h-full rounded-full " + PIPELINE_META[stage].dotClassName
                    }
                    style={{ width: (count / latest) * 100 + "%" }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-xs leading-5 text-muted-foreground">
              Current stage counts, not historical conversion rates.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Follow-up radar</CardTitle>
          </CardHeader>
          <CardContent>
            {waiting.length ? (
              <div className="space-y-3">
                {waiting.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl bg-amber-500/5 p-3 hover:bg-amber-500/10"
                    href={"/candidates/" + c.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {c.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.job.title} ·{" "}
                        {Math.floor(
                          (now - new Date(c.updated_at).getTime()) / 86400000,
                        )}{" "}
                        days unchanged
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 text-amber-700" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No active candidate has been unchanged for more than seven days.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Role coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-border p-4"
              >
                <span className="text-sm font-medium">{job.title}</span>
                <span className="status-chip">
                  {candidates.filter((c) => c.job_id === job.id).length}{" "}
                  candidates
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
