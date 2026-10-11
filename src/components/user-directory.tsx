"use client";
import { useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { createManagedUser } from "@/app/admin/users/actions";
import {
  updateManagedProfile,
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
  PageHeading,
  Feedback,
  Busy,
  fieldClass,
  useWorkspaceAction,
} from "@/components/workspace-ui";
import type { Profile, Organization } from "@/lib/types";
const initial = {
  id: "",
  email: "",
  full_name: "",
  password: "",
  role: "customer" as "admin" | "customer",
  organization_id: "",
  is_active: true,
  is_org_manager: false,
};
export function UserDirectory({
  profiles,
  organizations,
  currentUserId,
}: {
  profiles: Profile[];
  organizations: Organization[];
  currentUserId: string;
}) {
  const action = useWorkspaceAction(),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState(initial);
  const filtered = profiles.filter((p) =>
    [
      p.full_name,
      p.email,
      p.role,
      organizations.find((o) => o.id === p.organization_id)?.name,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Identity & access"
        title="People behind the pipeline"
        description="Create accounts, assign workspaces and explicitly grant manager access. Suspended accounts lose data access immediately."
        actions={
          <Button
            onClick={() => {
              setDraft(initial);
              setOpen(true);
            }}
          >
            <Plus />
            Create account
          </Button>
        }
      />
      <Feedback value={action.feedback} />
      <Input
        className="h-11 max-w-md"
        aria-label="Search user accounts"
        placeholder="Search name, email or workspace…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Card>
        <CardContent className="space-y-2">
          {filtered.map((profile) => (
            <article
              key={profile.id}
              className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="avatar-tile">
                  {profile.full_name.slice(0, 2).toUpperCase() || "AC"}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {profile.full_name}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizations.find((o) => o.id === profile.organization_id)
                      ?.name ?? "Platform administration"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-chip">
                  <ShieldCheck className="size-3" />
                  {profile.role === "admin"
                    ? "Admin"
                    : profile.is_org_manager
                      ? "Manager"
                      : "Recruiter"}
                </span>
                <span
                  className={
                    "status-chip " +
                    (profile.is_active
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-destructive")
                  }
                >
                  {profile.is_active ? "Active" : "Suspended"}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={"Edit " + profile.full_name}
                  onClick={() => {
                    setDraft({
                      ...profile,
                      password: "",
                      organization_id: profile.organization_id ?? "",
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  disabled={profile.id === currentUserId || action.pending}
                  aria-label={"Delete " + profile.full_name}
                  onClick={() => {
                    if (
                      confirm(
                        "Permanently delete " +
                          profile.email +
                          "? Job and candidate records remain.",
                      )
                    )
                      action.execute(() => deleteManagedProfile(profile.id));
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </article>
          ))}
          {!filtered.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No matching accounts.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "Edit account" : "Create account"}
            </DialogTitle>
            <DialogDescription>
              Admin access is platform-wide. Customer access is limited to a
              workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                async () => {
                  if (draft.id)
                    return updateManagedProfile({
                      ...draft,
                      organization_id: draft.organization_id || null,
                    });
                  return createManagedUser({
                    email: draft.email,
                    fullName: draft.full_name,
                    password: draft.password,
                    role: draft.role,
                    organizationId: draft.organization_id || undefined,
                    isActive: draft.is_active,
                    isOrgManager: draft.is_org_manager,
                  });
                },
                () => setOpen(false),
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                required
                maxLength={160}
                value={draft.full_name}
                onChange={(e) =>
                  setDraft({ ...draft, full_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                required
                disabled={Boolean(draft.id)}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </div>
            {!draft.id ? (
              <div className="space-y-2">
                <Label htmlFor="account-password">Initial password</Label>
                <Input
                  id="account-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={draft.password}
                  onChange={(e) =>
                    setDraft({ ...draft, password: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  At least 12 characters. Share it securely.
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-role">Role</Label>
                <select
                  id="account-role"
                  className={fieldClass}
                  value={draft.role}
                  disabled={draft.id === currentUserId}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      role: e.target.value as "admin" | "customer",
                      is_org_manager: false,
                    })
                  }
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Platform admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-org">Workspace</Label>
                <select
                  id="account-org"
                  required={draft.role === "customer"}
                  disabled={draft.role === "admin"}
                  className={fieldClass}
                  value={draft.organization_id}
                  onChange={(e) =>
                    setDraft({ ...draft, organization_id: e.target.value })
                  }
                >
                  <option value="">Choose workspace</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {draft.role === "customer" ? (
              <label className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_org_manager}
                  onChange={(e) =>
                    setDraft({ ...draft, is_org_manager: e.target.checked })
                  }
                />
                <span>
                  Workspace manager
                  <p className="mt-1 text-xs text-muted-foreground">
                    Can create recruiters, manage groups and control job
                    assignments in this workspace.
                  </p>
                </span>
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={draft.id === currentUserId}
                checked={draft.is_active}
                onChange={(e) =>
                  setDraft({ ...draft, is_active: e.target.checked })
                }
              />
              Account active
            </label>
            <Feedback value={action.feedback} />
            <Button disabled={action.pending} type="submit">
              <Busy pending={action.pending} />
              Save account
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
