"use client";
import { useState } from "react";
import { useBrowserTimezone } from "@/components/local-time";
import Link from "next/link";
import { CalendarDays, Download, Plus, Check } from "lucide-react";
import { scheduleInterview, setInterviewStatus } from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PageHeading,
  EmptyPanel,
  Feedback,
  Busy,
  fieldClass,
  useWorkspaceAction,
} from "@/components/workspace-ui";
import { downloadText, interviewCalendar } from "@/lib/exports";
import type { CandidateWithJob } from "@/lib/types";
import type { Interview } from "@/lib/workspace-types";
export function ScheduleWorkspace({
  interviews,
  candidates,
}: {
  interviews: Interview[];
  candidates: CandidateWithJob[];
}) {
  const timeZone = useBrowserTimezone();
  const action = useWorkspaceAction(),
    [open, setOpen] = useState(false),
    [showPast, setShowPast] = useState(false);
  const [draft, setDraft] = useState({
    candidateId: candidates[0]?.id ?? "",
    title: "Interview",
    startsAt: "",
    endsAt: "",
    location: "",
    notes: "",
  });
  const [now] = useState(() => Date.now());
  const visible = interviews
    .filter((i) => showPast || new Date(i.ends_at).getTime() >= now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Conversations that count"
        title="Interview planner"
        description="Keep upcoming conversations organized and export appointments to your calendar. Times are shown in your local timezone."
        actions={
          <Button disabled={!candidates.length} onClick={() => setOpen(true)}>
            <Plus />
            Schedule interview
          </Button>
        }
      />
      <Feedback value={action.feedback} />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showPast}
          onChange={(e) => setShowPast(e.target.checked)}
        />
        Include past interviews
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((interview) => {
          const candidate = candidates.find(
            (c) => c.id === interview.candidate_id,
          );
          return (
            <Card key={interview.id}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-primary/10 py-3 text-primary">
                    <span className="text-xs font-semibold uppercase">
                      {new Date(interview.starts_at).toLocaleDateString(
                        "en-GB",
                        { month: "short", timeZone },
                      )}
                    </span>
                    <span className="text-2xl font-semibold">
                      {new Date(interview.starts_at).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", timeZone },
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{interview.title}</h2>
                    <Link
                      className="mt-1 block truncate text-sm text-primary hover:underline"
                      href={"/candidates/" + interview.candidate_id}
                    >
                      {candidate?.full_name ?? "Candidate"}
                    </Link>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(interview.starts_at).toLocaleString("en-GB", {
                        timeZone,
                      })}{" "}
                      –{" "}
                      {new Date(interview.ends_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {interview.location || "Location to be confirmed"}
                    </p>
                  </div>
                  <span className="status-chip">{interview.status}</span>
                </div>
                {interview.notes ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                    {interview.notes}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadText(
                        "interview.ics",
                        interviewCalendar(interview),
                        "text/calendar;charset=utf-8",
                      )
                    }
                  >
                    <Download />
                    Calendar
                  </Button>
                  {interview.status === "scheduled" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={action.pending}
                        onClick={() =>
                          action.execute(() =>
                            setInterviewStatus(interview.id, "completed"),
                          )
                        }
                      >
                        <Check />
                        Complete
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={action.pending}
                        onClick={() => {
                          if (confirm("Cancel this interview?"))
                            action.execute(() =>
                              setInterviewStatus(interview.id, "cancelled"),
                            );
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!visible.length ? (
        <EmptyPanel
          title="Make room for your next conversation"
          description="Schedule an interview from this page. The appointment stays linked to the candidate."
        />
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              Schedule an interview
            </DialogTitle>
            <DialogDescription>
              Choose a candidate and a time. Calendar export does not send an
              invitation or email.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                () =>
                  scheduleInterview({
                    ...draft,
                    startsAt: new Date(draft.startsAt).toISOString(),
                    endsAt: new Date(draft.endsAt).toISOString(),
                  }),
                () => setOpen(false),
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="interview-candidate">Candidate</Label>
              <select
                id="interview-candidate"
                required
                className={fieldClass}
                value={draft.candidateId}
                onChange={(e) =>
                  setDraft({ ...draft, candidateId: e.target.value })
                }
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} · {c.job.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-title">Title</Label>
              <Input
                id="interview-title"
                required
                minLength={2}
                maxLength={160}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="interview-start">Starts</Label>
                <Input
                  id="interview-start"
                  type="datetime-local"
                  required
                  value={draft.startsAt}
                  onChange={(e) =>
                    setDraft({ ...draft, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interview-end">Ends</Label>
                <Input
                  id="interview-end"
                  type="datetime-local"
                  required
                  value={draft.endsAt}
                  onChange={(e) =>
                    setDraft({ ...draft, endsAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-location">
                Location or meeting URL
              </Label>
              <Input
                id="interview-location"
                value={draft.location}
                onChange={(e) =>
                  setDraft({ ...draft, location: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-notes">Preparation notes</Label>
              <textarea
                id="interview-notes"
                className={fieldClass + " min-h-24 py-3"}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </div>
            <Feedback value={action.feedback} />
            <Button disabled={action.pending} type="submit">
              <Busy pending={action.pending} />
              Save interview
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
