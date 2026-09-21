import { AppShell } from '@/components/app-shell'
import { requireCustomer } from '@/lib/auth'
import { getOrganization } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireCustomer()
  const organization = await getOrganization(supabase, profile.organization_id!)

  return (
    <AppShell profile={profile} organizationName={organization?.name}>
      {children}
    </AppShell>
  )
}
