'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult, UserRole } from '@/lib/types'
import { validateAdminUserInput } from '@/lib/validation'

type CreateUserInput = {
  email: string
  fullName: string
  password: string
  role: string
  organizationId?: string
  organizationName?: string
}

export async function createManagedUser(input: CreateUserInput): Promise<ActionResult<{ id: string }>> {
  // Verify the caller with their cookie-bound, RLS-aware client before the
  // service role client is ever created.
  await requireAdmin()

  let createdUserId: string | null = null
  let createdOrganizationId: string | null = null

  try {
    const value = validateAdminUserInput(input)
    const admin = createAdminClient()
    let organizationId = value.organizationId

    if (value.role === 'customer' && value.organizationName) {
      const { data: existingOrganization, error: lookupError } = await admin
        .from('organizations')
        .select('id')
        .eq('name', value.organizationName)
        .maybeSingle()
      if (lookupError) throw new Error('The organization could not be checked.')

      if (existingOrganization) {
        organizationId = existingOrganization.id as string
      } else {
        const { data: newOrganization, error: organizationError } = await admin
          .from('organizations')
          .insert({ name: value.organizationName })
          .select('id')
          .single()
        if (organizationError || !newOrganization) throw new Error('The organization could not be created.')
        organizationId = newOrganization.id as string
        createdOrganizationId = organizationId
      }
    }

    if (value.role === 'customer' && !organizationId) {
      throw new Error('Choose an organization for a customer account.')
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: value.email,
      password: value.password,
      email_confirm: true,
      // Display metadata is never used for authorization. The profiles row is
      // authoritative and is only inserted after this server-side admin check.
      user_metadata: { full_name: value.fullName },
    })
    if (authError || !authData.user) {
      throw new Error(authError?.message || 'The user account could not be created.')
    }

    createdUserId = authData.user.id
    const role = value.role as UserRole
    const { error: profileError } = await admin.from('profiles').insert({
      id: createdUserId,
      email: value.email,
      full_name: value.fullName,
      role,
      organization_id: role === 'customer' ? organizationId : null,
    })

    if (profileError) throw new Error('The auth user was created but its access profile could not be saved.')

    revalidatePath('/admin')
    revalidatePath('/admin/users')
    return { ok: true, data: { id: createdUserId }, message: 'User account created.' }
  } catch (error) {
    // Compensate for a partially completed admin operation. The key never
    // reaches the browser, and this only targets an account created above.
    if (createdUserId) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.deleteUser(createdUserId)
      } catch {
        // A deployment operator can remove a rare partial account manually.
      }
    }
    if (createdOrganizationId) {
      try {
        const admin = createAdminClient()
        await admin.from('organizations').delete().eq('id', createdOrganizationId)
      } catch {
        // Do not mask the original provisioning failure.
      }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The user account could not be created.',
    }
  }
}
