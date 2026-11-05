import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollaborationData } from "@/lib/workspace-types";
export async function getCollaborationData(
  supabase: SupabaseClient,
  organizationId?: string,
): Promise<CollaborationData> {
  const tables = [
    "profiles",
    "job_groups",
    "group_members",
    "group_jobs",
    "interviews",
    "activity_log",
  ] as const;
  const responses = await Promise.all(
    tables.map((table) => {
      let query = supabase.from(table).select("*");
      if (organizationId) query = query.eq("organization_id", organizationId);
      return table === "activity_log"
        ? query.order("created_at", { ascending: false }).limit(300)
        : query;
    }),
  );
  const failed = responses.find((response) => response.error);
  if (failed?.error)
    throw new Error(
      "Workspace tools could not be loaded. Apply the collaboration migration first.",
    );
  return {
    profiles: responses[0].data ?? [],
    groups: responses[1].data ?? [],
    members: responses[2].data ?? [],
    links: responses[3].data ?? [],
    interviews: responses[4].data ?? [],
    events: responses[5].data ?? [],
  } as CollaborationData;
}
