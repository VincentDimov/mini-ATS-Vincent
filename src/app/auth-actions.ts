"use server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  const origin = process.env.SITE_URL;
  if (!origin || !/^https?:\/\//.test(origin)) return { ok: false, error: "Account recovery is not configured. Contact your administrator." };
  try {
    await (await createClient()).auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${new URL(origin).origin}/auth/callback` });
  } catch { /* Same response for unknown accounts, rate limits and delivery failures. */ }
  return { ok: true, message: "If this address has an account, a recovery email will be sent. Check spam, or contact your administrator if it does not arrive." };
}
