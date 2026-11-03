"use client";
import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Feedback, useWorkspaceAction } from "@/components/workspace-ui";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const action = useWorkspaceAction();
  return <main className="mx-auto w-full max-w-md space-y-5 p-6 py-16"><h1 className="text-2xl font-semibold">Recover your account</h1><p>Request a new link if your invitation or recovery link expired. Links are single-use.</p><form className="space-y-4" onSubmit={event => { event.preventDefault(); action.execute(() => requestPasswordReset(email)); }}><label htmlFor="recovery-email">Account email</label><Input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /><Button disabled={action.pending}>{action.pending ? "Sending…" : "Send recovery email"}</Button></form><Feedback value={action.feedback} /><Link href="/login" className="underline">Back to sign in</Link></main>;
}
