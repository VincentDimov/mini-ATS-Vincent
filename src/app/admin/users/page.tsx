import { AdminUserManagement } from '@/components/admin-user-management'
import { requireAdmin } from '@/lib/auth'
import { getAllOrganizations } from '@/lib/data'
import type { Profile } from '@/lib/types'

import { createManagedUser } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin()
  const [organizations, profilesResponse] = await Promise.all([
    getAllOrganizations(supabase),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, created_at, updated_at')
      .order('created_at', { ascending: false }),
  ])

  if (profilesResponse.error) throw new Error('Users could not be loaded.')
  const profiles = (Array.isArray(profilesResponse.data) ? profilesResponse.data : []) as Profile[]

  return (
    <AdminUserManagement
      organizations={organizations.map(({ id, name }) => ({ id, name }))}
      users={profiles.map(({ id, email, full_name, role, organization_id }) => ({ id, email, full_name, role, organization_id }))}
      onCreate={createManagedUser}
    />
  )
}
