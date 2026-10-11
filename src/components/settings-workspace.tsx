"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading, Feedback } from "@/components/workspace-ui";
import { ThemeToggle } from "@/components/theme-toggle";
export function SettingsWorkspace({ email }: { email: string }) {
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [pending, setPending] = useState(false),
    [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
      null,
    );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Make it yours"
        title="Workspace preferences"
        description="Choose your appearance and keep your account secure."
      />
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Light by default. Your selected theme is remembered on this browser.
          </p>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-muted-foreground">{email}</p>
          <form
            className="max-w-md space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setFeedback(null);
              if (password !== confirmation) {
                setFeedback({
                  ok: false,
                  message: "The passwords do not match.",
                });
                return;
              }
              setPending(true);
              try {
                const { error } = await createClient().auth.updateUser({
                  password,
                });
                if (error) throw error;
                setPassword("");
                setConfirmation("");
                setFeedback({ ok: true, message: "Password updated." });
              } catch (error) {
                setFeedback({
                  ok: false,
                  message:
                    error instanceof Error
                      ? error.message
                      : "Password could not be updated.",
                });
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>
            <Feedback value={feedback} />
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
