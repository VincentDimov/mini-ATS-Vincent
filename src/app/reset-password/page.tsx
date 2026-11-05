"use client";
import { useState } from "react";
import Link from "next/link";
import { completePasswordReset } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function ResetPasswordPage() {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password !== confirm || password.length < 12 || password.length > 128) {
      setMessage("Use matching passwords between 12 and 128 characters.");
      return;
    }
    setPending(true);
    try {
      const result = await completePasswordReset(password, confirm);
      if (!result.ok) throw new Error(result.error);
      setPassword("");
      setConfirm("");
      setSuccess(true);
      setMessage("Password saved. Sign in with your new password.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Recovery unavailable. Retry later.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-md space-y-5 p-6 py-16">
      <h1 className="text-2xl font-semibold">Set your password</h1>
      <p>
        Finish your invitation or account recovery. Your administrator controls
        workspace access.
      </p>
      {!success ? (
        <form className="space-y-4" onSubmit={save}>
          <label htmlFor="new-password">New password (12–128 characters)</label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <Button disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </Button>
        </form>
      ) : null}
      {message ? <p role={success ? "status" : "alert"}>{message}</p> : null}
      <div className="flex gap-4">
        <Link href="/forgot-password" className="underline">
          Request a new link
        </Link>
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
