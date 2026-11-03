import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupCvFiles } from "@/lib/cv-maintenance";

export async function POST(request: Request) {
  const secret = process.env.MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)))
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const { data, error } = await createAdminClient().rpc("purge_expired_candidates", { batch_size: 100 });
    if (error) throw new Error("Retention job failed");
    const cleanup = await cleanupCvFiles(100);
    return Response.json({ purged: data, ...cleanup }, { headers: { "Cache-Control": "no-store" }, status: cleanup.failed ? 503 : 200 });
  } catch {
    // Counts and generic errors only: never expose paths, names, CV content or secrets.
    return Response.json({ error: "Maintenance failed; retry scheduled work" }, { status: 503 });
  }
}
