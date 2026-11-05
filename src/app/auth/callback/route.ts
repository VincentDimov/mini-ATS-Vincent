import { createRouteClient } from "@/lib/supabase/route";
import { NextResponse, type NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code");
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/reset-password" },
  });
  const result = code
    ? await (
        await createRouteClient(request, response)
      ).auth.exchangeCodeForSession(code)
    : null;
  if (!result || result.error || !result.data.session)
    response.headers.set("Location", "/forgot-password?error=expired");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
