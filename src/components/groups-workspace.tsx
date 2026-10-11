"use client";
import { useState } from "react";
import { Layers, Plus, Trash2, LockKeyhole } from "lucide-react";
import {
  createGroup,
  removeGroup,
  toggleGroupLink,
} from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeading,
  Feedback,
  EmptyPanel,
  useWorkspaceAction,
  Busy,
} from "@/components/workspace-ui";
import type { Job, Profile } from "@/lib/types";
import type { JobGroup, GroupMember, GroupJob } from "@/lib/workspace-types";
export function GroupsWorkspace({
  organizationId,
  profiles,
  jobs,
  groups,
  members,
  links,
  canManage,
}: {
  organizationId: string;
  profiles: Profile[];
  jobs: Job[];
  groups: JobGroup[];
  members: GroupMember[];
  links: GroupJob[];
  canManage: boolean;
}) {
  const action = useWorkspaceAction(),
    [name, setName] = useState(""),
    [description, setDescription] = useState("");
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Shared access"
        title="Hiring circles"
        description="Bring the right people together around a role. Groups grant access to restricted jobs within this workspace."
      />
      <Feedback value={action.feedback} />
      {canManage ? (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-card p-4 lg:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            action.execute(
              () => createGroup(organizationId, name, description),
              () => {
                setName("");
                setDescription("");
              },
            );
          }}
        >
          <Input
            required
            minLength={2}
            maxLength={100}
            aria-label="New group name"
            placeholder="e.g. Engineering hiring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 lg:max-w-xs"
          />
          <Input
            aria-label="Group description"
            maxLength={2000}
            placeholder="What this circle works on"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10"
          />
          <Button type="submit" disabled={action.pending} className="h-10">
            <Busy pending={action.pending} />
            <Plus />
            Create circle
          </Button>
        </form>
      ) : null}
      {!groups.length ? (
        <EmptyPanel
          title="Build your first hiring circle"
          description={
            canManage
              ? "Create a circle, add teammates and connect the roles they should work on."
              : "Your workspace manager can create circles and add members."
          }
        />
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="avatar-tile">
                  <Layers className="size-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.description || "A shared hiring circle"}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={"Delete " + group.name}
                    disabled={action.pending}
                    onClick={() => {
                      if (
                        confirm("Delete this circle and its membership links?")
                      )
                        action.execute(() =>
                          removeGroup(group.id, organizationId),
                        );
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="section-label">Teammates</h3>
                  <div className="mt-3 space-y-2">
                    {profiles
                      .filter((p) => p.is_active)
                      .map((profile) => (
                        <label
                          key={profile.id}
                          className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            disabled={!canManage || action.pending}
                            checked={members.some(
                              (m) =>
                                m.group_id === group.id &&
                                m.profile_id === profile.id,
                            )}
                            onChange={(e) =>
                              action.execute(() =>
                                toggleGroupLink({
                                  organizationId,
                                  groupId: group.id,
                                  targetId: profile.id,
                                  kind: "member",
                                  remove: !e.target.checked,
                                }),
                              )
                            }
                          />
                          <span className="truncate">
                            {profile.full_name || profile.email}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
                <div>
                  <h3 className="section-label">Connected roles</h3>
                  <div className="mt-3 space-y-2">
                    {jobs.map((job) => (
                      <label
                        key={job.id}
                        className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          disabled={!canManage || action.pending}
                          checked={links.some(
                            (link) =>
                              link.group_id === group.id &&
                              link.job_id === job.id,
                          )}
                          onChange={(e) =>
                            action.execute(() =>
                              toggleGroupLink({
                                organizationId,
                                groupId: group.id,
                                targetId: job.id,
                                kind: "job",
                                remove: !e.target.checked,
                              }),
                            )
                          }
                        />
                        <span className="truncate">{job.title}</span>
                        {job.restricted ? (
                          <LockKeyhole className="size-3 shrink-0 text-primary" />
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
