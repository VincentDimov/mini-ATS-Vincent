"use client";
import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import { Clock3, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading, EmptyPanel, fieldClass } from "@/components/workspace-ui";
import { downloadText, toCsv } from "@/lib/exports";
import type { ActivityEvent } from "@/lib/workspace-types";
export function ActivityWorkspace({ events }: { events: ActivityEvent[] }) {
  const [query, setQuery] = useState(""),
    [action, setAction] = useState("all"),
    [entity, setEntity] = useState("all");
  const filtered = events.filter(
    (e) =>
      (action === "all" || e.action === action) &&
      (entity === "all" || e.entity_type === entity) &&
      [e.actor_name, e.entity_name, e.entity_type]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Workspace history"
        title="Every change, in context"
        description="A transaction-bound history of who changed what. Showing the latest 300 visible events."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadText(
                "mini-ats-activity.csv",
                toCsv([
                  ["Time", "Actor", "Action", "Entity", "Name"],
                  ...filtered.map((e) => [
                    e.created_at,
                    e.actor_name,
                    e.action,
                    e.entity_type,
                    e.entity_name,
                  ]),
                ]),
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download />
            Export
          </Button>
        }
      />
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_180px_180px]">
        <Input
          className="h-10"
          placeholder="Search people or records…"
          aria-label="Search activity"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={fieldClass}
          value={action}
          aria-label="Filter activity by action"
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="all">All changes</option>
          {["insert", "update", "delete"].map((a) => (
            <option key={a} value={a}>
              {a === "insert"
                ? "Created"
                : a === "update"
                  ? "Updated"
                  : "Deleted"}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={entity}
          aria-label="Filter activity by entity"
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="all">All records</option>
          {[...new Set(events.map((e) => e.entity_type))].map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {filtered.length ? (
        <Card>
          <CardContent className="divide-y divide-border">
            {filtered.map((event) => (
              <article key={event.id} className="flex gap-4 py-5">
                <span
                  className={
                    "mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl " +
                    (event.action === "insert"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : event.action === "delete"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-violet-500/10 text-violet-600")
                  }
                >
                  <Clock3 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <strong className="font-semibold">
                      {event.actor_name}
                    </strong>{" "}
                    {event.action === "insert"
                      ? "created"
                      : event.action === "delete"
                        ? "deleted"
                        : "updated"}{" "}
                    <strong className="font-medium">{event.entity_name}</strong>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.entity_type.replaceAll("_", " ")}
                    {event.details.from_stage &&
                    event.details.from_stage !== event.details.to_stage
                      ? " · " +
                        event.details.from_stage +
                        " → " +
                        event.details.to_stage
                      : ""}
                  </p>
                </div>
                <LocalTime
                  value={event.created_at}
                  options={{ dateStyle: "short", timeStyle: "short" }}
                  className="shrink-0 text-right text-xs leading-5 text-muted-foreground"
                />
              </article>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyPanel
          title="A fresh chapter"
          description="Changes will appear here as your team works. Try clearing filters if you expected to see more."
        />
      )}
    </div>
  );
}
