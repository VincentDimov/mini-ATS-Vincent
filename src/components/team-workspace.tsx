"use client";
import { useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  Users,
  Briefcase,
  Pencil,
  Trash2,
} from "lucide-react";
import { createManagedUser } from "@/app/admin/users/actions";
import {
  assignJob,
  setMemberActive,
  renameTeamMember,
  deleteManagedProfile,
} from "@/app/workspace-actions";
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
  Busy,
  EmptyPanel,
  Feedback,
  PageHeading,
  fieldClass,
  useWorkspaceAction,
} from "@/components/workspace-ui";
import type { Job, Profile } from "@/lib/types";
export function TeamWorkspace({
  organizationId,
  profiles,
  jobs,
  canManage,
  currentUserId,
}: {
  organizationId: string;
  profiles: Profile[];
  jobs: Job[];
  canManage: boolean;
  currentUserId: string;
}) {
  const action = useWorkspaceAction(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const [draft, setDraft] = useState({
    id: "",
    email: "",
    fullName: "",
    password: "",
  });
  const members = profiles.filter((p) =>
    [p.full_name, p.email]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  function generatedPassword() {
    const data = new Uint8Array(18);
    crypto.getRandomValues(data);
    return (
      "Aa7!" +
      Array.from(
        data,
        (n) =>
          "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%"[
            n % 60
          ],
      ).join("")
    );
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="People & ownership"
        title="Your hiring team"
        description="One shared workspace. Clear job ownership and controlled access for every member."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setDraft({
                  id: "",
                  email: "",
                  fullName: "",
                  password: generatedPassword(),
                });
                setOpen(true);
              }}
            >
              <UserPlus /> Add member
            </Button>
          ) : undefined
        }
      />
      <Feedback value={action.feedback} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {profiles.length} members ·{" "}
          {profiles.filter((p) => p.is_active).length} active
        </p>
        <Input
          className="h-10 sm:max-w-xs"
          aria-label="Search team members"
          placeholder="Find a teammate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent>
              <div className="flex gap-3">
                <div className="avatar-tile">
                  {member.full_name.slice(0, 2).toUpperCase() || "TM"}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {member.full_name || "Unnamed member"}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                {member.is_org_manager ? (
                  <ShieldCheck className="size-5 text-primary" />
                ) : (
                  <Users className="size-5 text-sky-600" />
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="status-chip">
                  {member.is_org_manager ? "Workspace manager" : "Recruiter"}
                </span>
                <span
                  className={
                    member.is_active
                      ? "status-chip text-emerald-700 dark:text-emerald-300"
                      : "status-chip text-destructive"
                  }
                >
                  {member.is_active ? "Active" : "Suspended"}
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {jobs.filter((j) => j.assigned_to === member.id).length}{" "}
                assigned roles
              </p>
              {canManage &&
              member.id !== currentUserId &&
              !member.is_org_manager ? (
                <Button
                  className="mt-4"
                  aria-label={
                    (member.is_active ? "Suspend " : "Restore ") +
                    member.full_name
                  }
                  variant="outline"
                  size="sm"
                  disabled={action.pending}
                  onClick={() =>
                    action.execute(() =>
                      setMemberActive(
                        member.id,
                        organizationId,
                        !member.is_active,
                      ),
                    )
                  }
                >
                  {member.is_active ? "Suspend access" : "Restore access"}
                </Button>
              ) : null}
              {canManage &&
              member.id !== currentUserId &&
              !member.is_org_manager ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={"Edit " + member.full_name}
                    disabled={action.pending}
                    onClick={() => {
                      setDraft({
                        id: member.id,
                        email: member.email,
                        fullName: member.full_name,
                        password: "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                    Edit profile
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    aria-label={"Delete " + member.full_name}
                    disabled={action.pending}
                    onClick={() => {
                      if (
                        confirm(
                          "Delete this recruiter account? Job and candidate records remain.",
                        )
                      )
                        action.execute(() => deleteManagedProfile(member.id));
                    }}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {!members.length ? (
        <EmptyPanel
          title="No matching teammates"
          description="Try another name or email address."
        />
      ) : null}
      <Card>
        <CardContent>
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Briefcase className="size-4 text-primary" /> Job assignments
          </h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                key={job.id}
              >
                <span className="flex-1 text-sm font-medium">{job.title}</span>
                <select
                  aria-label={"Owner of " + job.title}
                  className={fieldClass + " sm:w-52"}
                  disabled={!canManage || action.pending}
                  value={job.assigned_to ?? ""}
                  onChange={(e) =>
                    action.execute(() =>
                      assignJob({
                        organizationId,
                        jobId: job.id,
                        assignedTo: e.target.value || null,
                        restricted: job.restricted,
                      }),
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {profiles
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={job.restricted}
                    disabled={!canManage || action.pending}
                    onChange={(e) =>
                      action.execute(() =>
                        assignJob({
                          organizationId,
                          jobId: job.id,
                          assignedTo: job.assigned_to,
                          restricted: e.target.checked,
                        }),
                      )
                    }
                  />
                  Owner, creator & groups only
                </label>
              </div>
            ))}
          </div>
          {!jobs.length ? (
            <p className="text-sm text-muted-foreground">
              Create a role to assign ownership.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "Edit teammate" : "Add a teammate"}
            </DialogTitle>
            <DialogDescription>
              {draft.id
                ? "Update the teammate name. Email changes require a verified Auth process."
                : "Create a recruiter account in this workspace. Share the initial password securely."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                () =>
                  draft.id
                    ? renameTeamMember(draft.id, organizationId, draft.fullName)
                    : createManagedUser({
                        ...draft,
                        role: "customer",
                        organizationId,
                      }),
                () => setOpen(false),
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="member-name">Full name</Label>
              <Input
                id="member-name"
                required
                value={draft.fullName}
                onChange={(e) =>
                  setDraft({ ...draft, fullName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                disabled={Boolean(draft.id)}
                type="email"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            {!draft.id ? (
              <div className="space-y-2">
                <Label htmlFor="member-password">Initial password</Label>
                <Input
                  id="member-password"
                  type="text"
                  minLength={12}
                  autoComplete="new-password"
                  required
                  value={draft.password}
                  onChange={(e) =>
                    setDraft({ ...draft, password: e.target.value })
                  }
                />
              </div>
            ) : null}
            <Feedback value={action.feedback} />
            <Button type="submit" disabled={action.pending}>
              <Busy pending={action.pending} />
              {draft.id ? "Save teammate" : "Create account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
