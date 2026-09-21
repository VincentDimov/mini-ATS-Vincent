import { AppShell } from '@/components/app-shell'
import { requireProfile } from '@/lib/auth'
import { getOrganization } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function CandidatesLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireProfile()
  const organization = profile.organization_id ? await getOrganization(supabase, profile.organization_id) : null

  return <AppShell profile={profile} organizationName={organization?.name}>{children}</AppShell>
}
