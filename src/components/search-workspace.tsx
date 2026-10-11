"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading, EmptyPanel } from "@/components/workspace-ui";
import type { Job, CandidateWithJob } from "@/lib/types";
export function SearchWorkspace({
  jobs,
  candidates,
  admin,
  initialQuery = "",
}: {
  jobs: Job[];
  candidates: CandidateWithJob[];
  admin: boolean;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    q = query.trim().toLowerCase();
  const matchedJobs = q
    ? jobs
        .filter((j) =>
          [j.title, j.location, j.description]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 30)
    : [];
  const matchedCandidates = q
    ? candidates
        .filter((c) =>
          [c.full_name, c.email, c.current_title, ...(c.tags ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 30)
    : [];
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Find your focus"
        title="Search the workspace"
        description="Jump to roles and candidates across the records you have access to."
      />
      <div className="relative">
        <Search className="absolute left-4 top-4 size-5 text-primary" />
        <Input
          autoFocus
          className="h-14 rounded-2xl pl-12 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search all records"
          placeholder="Search roles, people, skills or labels…"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          ["Roles", matchedJobs],
          ["Candidates", matchedCandidates],
        ].map(([label, list]) => (
          <Card key={label as string}>
            <CardContent>
              <h2 className="mb-4 font-semibold">{label as string}</h2>
              <div className="space-y-2">
                {(list as (Job | CandidateWithJob)[]).map((item) => (
                  <Link
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-4 hover:bg-primary/10"
                    href={
                      "full_name" in item
                        ? "/candidates/" + item.id
                        : (admin ? "/admin/jobs/" : "/dashboard/jobs/") +
                          item.id
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {"full_name" in item ? item.full_name : item.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {"full_name" in item ? item.email : item.location}
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 text-primary" />
                  </Link>
                ))}
                {!(list as unknown[]).length ? (
                  <p className="py-6 text-sm text-muted-foreground">
                    {q ? "No matching records." : "Start typing to search."}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {q && !matchedJobs.length && !matchedCandidates.length ? (
        <EmptyPanel
          title="Nothing here yet"
          description="Try a broader search, or check that the record belongs to your workspace."
        />
      ) : null}
    </div>
  );
}
