import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

// Auth exchanges must attach all chunked cookies to the actual redirect
// response. Do not silently swallow cookie write failures in route handlers.
export async function createRouteClient(
  request: NextRequest,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  // @supabase/ssr disables automatic initialization. Initialize explicitly
  // before exchanging a code so session callbacks are ready to write cookies.
  await client.auth.initialize();
  return client;
}
