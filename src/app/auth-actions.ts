"use server";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { cookies } from "next/headers";

export async function completePasswordReset(
  password: string,
  confirmation: string,
): Promise<ActionResult> {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128 ||
    password !== confirmation
  )
    return {
      ok: false,
      error: "Use matching passwords between 12 and 128 characters.",
    };
  const client = await createClient();
  const cookieStore = await cookies();
  const ticket = cookieStore.get("mini-ats-recovery")?.value;
  let verifiedToken: string | undefined;
  if (ticket) {
    let proof: { hash?: unknown; type?: unknown };
    try {
      proof = JSON.parse(ticket);
    } catch {
      return {
        ok: false,
        error: "This link is invalid. Request a new recovery email.",
      };
    }
    if (
      typeof proof.hash !== "string" ||
      !/^[a-zA-Z0-9_-]{20,256}$/.test(proof.hash) ||
      (proof.type !== "invite" && proof.type !== "recovery")
    )
      return {
        ok: false,
        error: "This link is invalid. Request a new recovery email.",
      };
    await client.auth.initialize();
    const exchange = await client.auth.verifyOtp({
      token_hash: proof.hash,
      type: proof.type,
    });
    cookieStore.delete("mini-ats-recovery");
    if (exchange.error || !exchange.data.session)
      return {
        ok: false,
        error:
          "This link expired or was already used. Request a new recovery email.",
      };
    verifiedToken = exchange.data.session.access_token;
  }
  const { data, error } = await client.auth.getUser(verifiedToken);
  if (error || !data.user)
    return {
      ok: false,
      error: "This link expired. Request a new recovery email.",
    };
  const profile = await client
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .single();
  if (profile.error || !profile.data?.is_active)
    return {
      ok: false,
      error: "Account access is unavailable. Contact your administrator.",
    };
  const result = await client.auth.updateUser({ password });
  if (result.error)
    return {
      ok: false,
      error:
        "Password could not be changed. Request a fresh link or contact your administrator.",
    };
  await client.auth.signOut({ scope: "global" });
  return {
    ok: true,
    message: "Password saved. Sign in with your new password.",
  };
}

export async function requestPasswordReset(
  email: string,
): Promise<ActionResult> {
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    return { ok: false, error: "Enter a valid email address." };
  const origin = process.env.SITE_URL;
  if (!origin || !/^https?:\/\//.test(origin))
    return {
      ok: false,
      error: "Account recovery is not configured. Contact your administrator.",
    };
  try {
    await (
      await createClient()
    ).auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${new URL(origin).origin}/auth/callback`,
    });
  } catch {
    /* Same response for unknown accounts, rate limits and delivery failures. */
  }
  return {
    ok: true,
    message:
      "If this address has an account, a recovery email will be sent. Check spam, or contact your administrator if it does not arrive.",
  };
}
