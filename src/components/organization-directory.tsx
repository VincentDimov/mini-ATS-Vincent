"use client";
import { useState } from "react";
import Link from "next/link";
import { Building2, Plus, Pencil, ArrowUpRight, Trash2 } from "lucide-react";
import { saveOrganization, removeOrganization } from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  PageHeading,
  Feedback,
  Busy,
  EmptyPanel,
  useWorkspaceAction,
} from "@/components/workspace-ui";
import type { Organization } from "@/lib/types";
const empty = {
  id: undefined as string | undefined,
  name: "",
  website_url: "",
  industry: "",
  location: "",
};
export function OrganizationDirectory({
  organizations,
}: {
  organizations: Organization[];
}) {
  const action = useWorkspaceAction(),
    [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(empty);
  const filtered = organizations.filter((o) =>
    [o.name, o.industry, o.location]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Platform directory"
        title="Customer workspaces"
        description="Give every hiring team a home. Manage company details and open a scoped workspace."
        actions={
          <Button
            onClick={() => {
              setDraft(empty);
              setOpen(true);
            }}
          >
            <Plus />
            New organization
          </Button>
        }
      />
      <Feedback value={action.feedback} />
      <Input
        className="h-11 max-w-md"
        aria-label="Search organizations"
        placeholder="Search company, industry or location…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((org) => (
          <Card key={org.id}>
            <CardContent>
              <div className="flex gap-3">
                <div className="avatar-tile">
                  <Building2 className="size-5" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold">{org.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {org.industry || "Customer workspace"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {org.location || "No location set"}
              </p>
              {org.website_url && /^https?:\/\//.test(org.website_url) ? (
                <a
                  href={org.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block truncate text-xs text-primary hover:underline"
                >
                  {org.website_url}
                </a>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                <Button asChild size="sm">
                  <Link href={"/admin/organizations/" + org.id}>
                    Open workspace
                    <ArrowUpRight />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={"Edit " + org.name}
                  onClick={() => {
                    setDraft({
                      id: org.id,
                      name: org.name,
                      website_url: org.website_url ?? "",
                      industry: org.industry ?? "",
                      location: org.location ?? "",
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label={"Delete " + org.name}
                  disabled={action.pending}
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this empty organization? Organizations with members or jobs cannot be deleted.",
                      )
                    )
                      action.execute(() => removeOrganization(org.id));
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyPanel
          title="No workspaces found"
          description="Create a workspace or try another search."
        />
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "Edit organization" : "New organization"}
            </DialogTitle>
            <DialogDescription>
              Keep the company details up to date for your team.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              action.execute(
                () => saveOrganization(draft),
                () => setOpen(false),
              );
            }}
          >
            {(["name", "website_url", "industry", "location"] as const).map(
              (key) => (
                <div className="space-y-2" key={key}>
                  <Label htmlFor={"org-" + key}>
                    {key === "website_url"
                      ? "Website"
                      : key[0].toUpperCase() + key.slice(1)}
                  </Label>
                  <Input
                    id={"org-" + key}
                    type={key === "website_url" ? "url" : "text"}
                    required={key === "name"}
                    maxLength={key === "website_url" ? 1000 : 120}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                </div>
              ),
            )}
            <Feedback value={action.feedback} />
            <Button type="submit" disabled={action.pending}>
              <Busy pending={action.pending} />
              Save organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
