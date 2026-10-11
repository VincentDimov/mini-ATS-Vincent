"use client";
import { useState } from "react";
import { LocalTime } from "@/components/local-time";
import { MessageSquare, Tag, Trash2, Plus } from "lucide-react";
import {
  addCandidateNote,
  removeCandidateNote,
  updateCandidateTags,
} from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Feedback,
  Busy,
  useWorkspaceAction,
  fieldClass,
} from "@/components/workspace-ui";
import type { CandidateNote } from "@/lib/workspace-types";
import type { Profile } from "@/lib/types";
export function CandidateCollaboration({
  candidateId,
  tags,
  notes,
  profiles,
  currentUserId,
  canManage,
}: {
  candidateId: string;
  tags: string[];
  notes: CandidateNote[];
  profiles: Profile[];
  currentUserId: string;
  canManage: boolean;
}) {
  const action = useWorkspaceAction(),
    [body, setBody] = useState(""),
    [tag, setTag] = useState("");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            Team conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Feedback value={action.feedback} />
          <div className="space-y-4">
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl border border-border bg-muted/25 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold">
                    {profiles.find((p) => p.id === note.author_id)?.full_name ||
                      "Former teammate"}
                  </p>
                  <div className="flex items-center gap-2">
                    <LocalTime
                      className="text-xs text-muted-foreground"
                      value={note.created_at}
                      options={{ dateStyle: "short", timeStyle: "short" }}
                    />
                    {canManage || note.author_id === currentUserId ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={action.pending}
                        aria-label="Delete note"
                        onClick={() => {
                          if (confirm("Delete this note?"))
                            action.execute(() => removeCandidateNote(note.id));
                        }}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {note.body}
                </p>
              </article>
            ))}
          </div>
          {!notes.length ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Start a shared conversation about the next steps.
            </p>
          ) : null}
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                () => addCandidateNote(candidateId, body),
                () => setBody(""),
              );
            }}
          >
            <label htmlFor="team-note" className="sr-only">
              Add team note
            </label>
            <textarea
              id="team-note"
              className={fieldClass + " min-h-24 py-3"}
              maxLength={6000}
              required
              placeholder="Add interview feedback or a question for the team…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" disabled={action.pending}>
              <Busy pending={action.pending} />
              <Plus />
              Post note
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4 text-sky-600" />
            Candidate labels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {tags.map((value) => (
              <button
                key={value}
                type="button"
                disabled={action.pending}
                title={"Remove " + value}
                className="status-chip hover:bg-destructive/10 hover:text-destructive"
                onClick={() =>
                  action.execute(() =>
                    updateCandidateTags(
                      candidateId,
                      tags.filter((t) => t !== value),
                    ),
                  )
                }
              >
                {value}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                () => updateCandidateTags(candidateId, [...tags, tag]),
                () => setTag(""),
              );
            }}
          >
            <Input
              aria-label="New candidate tag"
              required
              maxLength={40}
              placeholder="e.g. Portfolio reviewed"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
            <Button
              type="submit"
              disabled={action.pending || tags.length >= 12}
              size="icon"
              aria-label="Add tag"
            >
              <Plus />
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Up to 12 labels. Click a label to remove it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
