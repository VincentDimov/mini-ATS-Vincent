import { requireAdmin } from "@/lib/auth";
import { getAllOrganizations } from "@/lib/data";
import { UserDirectory } from "@/components/user-directory";
import type { Profile } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function AdminUsersPage() {
  const { supabase, userId } = await requireAdmin();
  const [organizations, response] = await Promise.all([
    getAllOrganizations(supabase),
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  if (response.error) throw new Error("User accounts could not be loaded.");
  return (
    <div className="mx-auto max-w-7xl">
      <UserDirectory
        organizations={organizations}
        profiles={(response.data ?? []) as Profile[]}
        currentUserId={userId}
      />
    </div>
  );
}
