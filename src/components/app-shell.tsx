import type { ReactNode } from 'react'
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { LogoutButton } from '@/components/logout-button'

type AppShellProfile = {
  full_name: string
  email: string
  role: 'admin' | 'customer'
}

interface AppShellProps {
  profile: AppShellProfile
  organizationName?: string | null
  children: ReactNode
}

interface NavigationItem {
  href: string
  label: string
  icon: LucideIcon
}

const customerNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/candidates', label: 'Candidates', icon: Users },
]

const adminNavigation: NavigationItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
]

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function NavigationLinks({ items, mobile = false }: { items: NavigationItem[]; mobile?: boolean }) {
  return items.map(({ href, label, icon: Icon }) => (
    <Link
      key={href}
      href={href}
      className={
        mobile
          ? 'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Link>
  ))
}

export function AppShell({ profile, organizationName, children }: AppShellProps) {
  const isAdmin = profile.role === 'admin'
  const navigation = isAdmin ? adminNavigation : customerNavigation
  const workspaceName = organizationName?.trim() || (isAdmin ? 'Mini ATS' : 'Your workspace')
  const displayName = profile.full_name.trim() || profile.email
  const initials = initialsFor(displayName) || 'U'
  const roleLabel = isAdmin ? 'Administrator' : 'Customer workspace'

  return (
    <div className="min-h-screen bg-muted/45">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/90 shadow-xl shadow-primary/5 backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-primary to-sky-500 text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">Mini ATS</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        <div className="mx-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-violet-500/5 to-sky-500/10 p-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Building2 className="size-3.5" aria-hidden="true" />
            Workspace
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold">{workspaceName}</p>
        </div>

        <nav aria-label="Primary navigation" className="mt-6 flex flex-1 flex-col gap-1 px-3">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {isAdmin ? 'Administration' : 'Hiring'}
          </p>
          <NavigationLinks items={navigation} />
        </nav>

        <div className="m-3 rounded-2xl border border-primary/10 bg-card/75 p-3 shadow-sm shadow-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <LogoutButton className="mt-3 w-full justify-start" />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-sidebar-border bg-sidebar/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-sky-500 text-primary-foreground shadow-sm shadow-primary/25">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <span className="truncate text-sm font-semibold">{workspaceName}</span>
          </Link>
          <LogoutButton className="shrink-0" />
        </div>
        <nav aria-label="Primary navigation" className="flex gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          <NavigationLinks items={navigation} mobile />
        </nav>
      </header>

      <div className="lg:pl-64">
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
