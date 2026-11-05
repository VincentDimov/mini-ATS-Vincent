"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, UserRole } from "@/lib/types";
import { validateAdminUserInput } from "@/lib/validation";

type CreateUserInput = {
  email: string;
  fullName: string;
  password: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  isActive?: boolean;
  isOrgManager?: boolean;
};

export async function inviteRecruiter(input: {
  email: string;
  fullName: string;
  organizationId: string;
}): Promise<ActionResult> {
  const context = await requireProfile();
  if (
    context.profile.role !== "admin" &&
    (!context.profile.is_org_manager ||
      context.profile.organization_id !== input.organizationId)
  )
    return {
      ok: false,
      error:
        "Only workspace managers can invite recruiters into their own workspace.",
    };
  try {
    const origin = process.env.SITE_URL;
    if (!origin)
      throw new Error("Invitations require SITE_URL and configured SMTP.");
    const value = validateAdminUserInput({
      ...input,
      role: "customer",
      password: crypto.randomUUID(),
    });
    const organization = await context.supabase
      .from("organizations")
      .select("id")
      .eq("id", input.organizationId)
      .single();
    if (organization.error || !organization.data)
      throw new Error("Workspace unavailable.");
    const admin = createAdminClient();
    const existing = await admin
      .from("profiles")
      .select("id")
      .eq("email", value.email)
      .limit(1);
    if (existing.error || existing.data?.length)
      throw new Error(
        "This account already exists. Use account recovery or contact the administrator.",
      );
    const invited = await admin.auth.admin.inviteUserByEmail(value.email, {
      redirectTo: `${new URL(origin).origin}/reset-password`,
      data: { full_name: value.fullName },
    });
    if (invited.error || !invited.data.user)
      throw new Error(
        "Invitation could not be sent. Check SMTP and retry; existing accounts should use recovery.",
      );
    const saved = await admin
      .from("profiles")
      .insert({
        id: invited.data.user.id,
        email: value.email,
        full_name: value.fullName,
        role: "customer",
        organization_id: organization.data.id,
        is_active: true,
        is_org_manager: false,
      });
    // Never delete a potentially pre-existing Auth user as compensation for an
    // invite. An orphan without a profile has no application/RLS access.
    if (saved.error)
      throw new Error(
        "Invitation sent but access provisioning failed. Ask a platform admin to inspect the pending Auth account before retrying.",
      );
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      message:
        "Invitation sent. The recruiter chooses their own password; no password needs to be shared.",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invitation unavailable.",
    };
  }
}

export async function createManagedUser(
  input: CreateUserInput,
): Promise<ActionResult<{ id: string }>> {
  // Verify the caller with their cookie-bound, RLS-aware client before the
  // service role client is ever created.
  const context = await requireProfile();
  if (context.profile.role !== "admin") {
    if (
      !context.profile.is_org_manager ||
      input.role !== "customer" ||
      input.organizationId !== context.profile.organization_id ||
      input.organizationName ||
      input.isOrgManager
    ) {
      return {
        ok: false,
        error:
          "Workspace managers can only create customer accounts in their own organization.",
      };
    }
  }

  let createdUserId: string | null = null;
  let createdOrganizationId: string | null = null;

  try {
    const value = validateAdminUserInput(input);
    const admin = createAdminClient();
    let organizationId = value.organizationId;

    if (value.role === "customer" && value.organizationName) {
      const { data: existingOrganization, error: lookupError } = await admin
        .from("organizations")
        .select("id")
        .eq("name", value.organizationName)
        .maybeSingle();
      if (lookupError)
        throw new Error("The organization could not be checked.");

      if (existingOrganization) {
        organizationId = existingOrganization.id as string;
      } else {
        const { data: newOrganization, error: organizationError } = await admin
          .from("organizations")
          .insert({ name: value.organizationName })
          .select("id")
          .single();
        if (organizationError || !newOrganization)
          throw new Error("The organization could not be created.");
        organizationId = newOrganization.id as string;
        createdOrganizationId = organizationId;
      }
    }

    if (value.role === "customer" && !organizationId) {
      throw new Error("Choose an organization for a customer account.");
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: value.email,
        password: value.password,
        email_confirm: true,
        // Display metadata is never used for authorization. The profiles row is
        // authoritative and is only inserted after this server-side admin check.
        user_metadata: { full_name: value.fullName },
      });
    if (authError || !authData.user) {
      throw new Error(
        authError?.message || "The user account could not be created.",
      );
    }

    createdUserId = authData.user.id;
    const role = value.role as UserRole;
    const { error: profileError } = await admin.from("profiles").insert({
      id: createdUserId,
      email: value.email,
      full_name: value.fullName,
      role,
      organization_id: role === "customer" ? organizationId : null,
      is_active: input.isActive !== false,
      is_org_manager:
        context.profile.role === "admin" &&
        role === "customer" &&
        input.isOrgManager === true,
    });

    if (profileError)
      throw new Error(
        "The auth user was created but its access profile could not be saved.",
      );

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return {
      ok: true,
      data: { id: createdUserId },
      message: "User account created.",
    };
  } catch (error) {
    // Compensate for a partially completed admin operation. The key never
    // reaches the browser, and this only targets an account created above.
    if (createdUserId) {
      try {
        const admin = createAdminClient();
        await admin.auth.admin.deleteUser(createdUserId);
      } catch {
        // A deployment operator can remove a rare partial account manually.
      }
    }
    if (createdOrganizationId) {
      try {
        const admin = createAdminClient();
        await admin
          .from("organizations")
          .delete()
          .eq("id", createdOrganizationId);
      } catch {
        // Do not mask the original provisioning failure.
      }
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The user account could not be created.",
    };
  }
}
