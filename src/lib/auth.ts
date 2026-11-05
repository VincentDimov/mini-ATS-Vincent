import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export interface AuthContext {
  userId: string;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "customer";
}

export async function requireProfile(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, organization_id, is_active, is_org_manager, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  if (error || !profile || !isUserRole(profile.role) || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=profile");
  }

  return { userId: user.id, profile, supabase };
}

export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireProfile();
  if (context.profile.role !== "admin") redirect("/dashboard");
  return context;
}

export async function requireCustomer(): Promise<AuthContext> {
  const context = await requireProfile();
  if (context.profile.role === "admin") redirect("/admin");
  if (!context.profile.organization_id) redirect("/login?error=profile");
  return context;
}

export async function requireWorkspaceManager(
  organizationId: string,
): Promise<AuthContext> {
  const context = await requireProfile();
  if (
    context.profile.role !== "admin" &&
    (!context.profile.is_org_manager ||
      context.profile.organization_id !== organizationId)
  ) {
    throw new Error("Only workspace managers can perform this action.");
  }
  return context;
}
