import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hash = params.get("token_hash"), type = params.get("type");
  const error = hash && (type === "invite" || type === "recovery") ? (await (await createClient()).auth.verifyOtp({ token_hash: hash, type })).error : true;
  const response = NextResponse.redirect(new URL(error ? "/forgot-password?error=expired" : "/reset-password", request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
