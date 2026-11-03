import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const error = code ? (await (await createClient()).auth.exchangeCodeForSession(code)).error : true;
  const response = NextResponse.redirect(new URL(error ? "/forgot-password?error=expired" : "/reset-password", request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
