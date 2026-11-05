import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Can be called after mutations and by the authenticated scheduled endpoint.
// Queue claims are leased, recheck all live references, and forbid reattachment.
export async function cleanupCvFiles(batchSize = 25) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_cv_cleanup", {
    batch_size: batchSize,
  });
  if (error) throw new Error("CV cleanup queue unavailable.");
  let removed = 0,
    failed = 0;
  for (const item of (data ?? []) as { path: string; lease_id: string }[]) {
    let succeeded = false;
    try {
      const result = await admin.storage
        .from("candidate-cvs")
        .remove([item.path]);
      succeeded = !result.error;
    } catch {
      /* Lease expiry makes even a crashed request recoverable. */
    }
    const final = await admin.rpc("finish_cv_cleanup", {
      object_path: item.path,
      lease: item.lease_id,
      succeeded,
    });
    if (succeeded && !final.error) removed++;
    else failed++;
  }
  return { removed, failed };
}
