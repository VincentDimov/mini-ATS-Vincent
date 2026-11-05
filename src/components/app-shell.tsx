"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  Command,
  Layers,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppShellProfile = {
  full_name: string;
  email: string;
  role: "admin" | "customer";
};
interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: string;
}
const hiringNavigation: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    section: "Workspace",
  },
  {
    href: "/dashboard/jobs",
    label: "Roles",
    icon: Briefcase,
    section: "Workspace",
  },
  {
    href: "/dashboard/candidates",
    label: "Candidates",
    icon: Users,
    section: "Workspace",
  },
  {
    href: "/dashboard/schedule",
    label: "Interviews",
    icon: CalendarDays,
    section: "Workspace",
  },
  {
    href: "/dashboard/insights",
    label: "Insights",
    icon: TrendingUp,
    section: "Workspace",
  },
  {
    href: "/dashboard/team",
    label: "Team",
    icon: Users,
    section: "Collaboration",
  },
  {
    href: "/dashboard/groups",
    label: "Hiring circles",
    icon: Layers,
    section: "Collaboration",
  },
  {
    href: "/dashboard/activity",
    label: "Activity",
    icon: Activity,
    section: "Collaboration",
  },
  {
    href: "/dashboard/settings",
    label: "Preferences",
    icon: Settings2,
    section: "Account",
  },
];
const adminNavigation: NavigationItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    section: "Platform",
  },
  {
    href: "/admin/organizations",
    label: "Workspaces",
    icon: Building2,
    section: "Platform",
  },
  {
    href: "/admin/users",
    label: "People & access",
    icon: ShieldCheck,
    section: "Platform",
  },
  {
    href: "/admin/jobs",
    label: "All roles",
    icon: Briefcase,
    section: "Hiring",
  },
  {
    href: "/admin/candidates",
    label: "All candidates",
    icon: Users,
    section: "Hiring",
  },
  {
    href: "/admin/schedule",
    label: "Interviews",
    icon: CalendarDays,
    section: "Hiring",
  },
  {
    href: "/admin/insights",
    label: "Insights",
    icon: TrendingUp,
    section: "Hiring",
  },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: Activity,
    section: "Platform",
  },
  {
    href: "/admin/settings",
    label: "Preferences",
    icon: Settings2,
    section: "Account",
  },
];
function activePath(pathname: string, href: string) {
  return (
    pathname === href ||
    (!["/admin", "/dashboard"].includes(href) &&
      pathname.startsWith(href + "/"))
  );
}
export function AppShell({
  profile,
  organizationName,
  children,
}: {
  profile: AppShellProfile;
  organizationName?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const admin = profile.role === "admin",
    base = admin ? "/admin" : "/dashboard",
    navigation = admin ? adminNavigation : hiringNavigation;
  const name = profile.full_name.trim() || profile.email,
    workspace =
      organizationName?.trim() ||
      (admin ? "Platform control" : "Your workspace");
  const current = navigation.find((item) => activePath(pathname, item.href));
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const searchButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 rounded-xl border border-border bg-card/75 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search anything</span>
      <kbd className="ml-4 hidden rounded-md bg-muted px-1.5 text-[10px] sm:inline">
        Ctrl K
      </kbd>
    </button>
  );
  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:flex">
        <Link href={base} className="flex h-24 items-center gap-3 px-6">
          <div className="brand-mark">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">
              mini<span className="text-primary">ats.</span>
            </p>
            <p className="text-[10px] uppercase tracking-[.2em] text-muted-foreground">
              Vincent workspace
            </p>
          </div>
        </Link>
        <div className="mx-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/8 to-sky-500/8 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
            <Building2 className="size-3.5" />
            {admin ? "Platform administration" : "Hiring workspace"}
          </div>
          <p className="truncate text-sm font-semibold">{workspace}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected workspace
          </span>
        </div>
        <nav
          aria-label="Primary navigation"
          className="mt-5 flex-1 overflow-y-auto px-3 pb-5"
        >
          {[...new Set(navigation.map((item) => item.section))].map(
            (section) => (
              <div className="mb-5" key={section}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  {section}
                </p>
                <div className="space-y-1">
                  {navigation
                    .filter((item) => item.section === section)
                    .map(({ href, label, icon: Icon }) => (
                      <Link
                        href={href}
                        key={href}
                        aria-current={
                          activePath(pathname, href) ? "page" : undefined
                        }
                        className={
                          "nav-item " +
                          (activePath(pathname, href) ? "nav-item-active" : "")
                        }
                      >
                        <Icon className="size-4" />
                        <span>{label}</span>
                        {activePath(pathname, href) ? (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        ) : null}
                      </Link>
                    ))}
                </div>
              </div>
            ),
          )}
        </nav>
        <div className="m-3 rounded-2xl border border-primary/10 bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="avatar-tile size-9 text-xs">
              {name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <LogoutButton className="justify-start" />
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="flex h-18 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <Link href={base} className="brand-mark size-8 lg:hidden">
                <Sparkles className="size-4" />
              </Link>
              <div>
                <p className="hidden text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:block">
                  {admin ? "Platform" : "Workspace"}
                </p>
                <p className="text-sm font-medium">
                  {current?.label ?? "Record details"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {searchButton}
              <span className="hidden items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary xl:inline-flex">
                <Sparkles className="size-3" />
                Build a better team
              </span>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </div>
          <nav
            aria-label="Mobile primary navigation"
            className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden"
          >
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={activePath(pathname, href) ? "page" : undefined}
                className={
                  "nav-item shrink-0 " +
                  (activePath(pathname, href) ? "nav-item-active" : "")
                }
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main
          id="workspace-content"
          className="min-w-0 px-4 py-7 sm:px-6 lg:px-10 lg:py-10"
        >
          {children}
        </main>
        <footer className="px-6 py-7 text-xs text-muted-foreground lg:px-10">
          <span>Mini ATS Vincent</span>
          <span className="mx-2">·</span>A little more clarity. A better hiring
          day.
        </footer>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command className="size-4 text-primary" />
              Quick switch
            </DialogTitle>
            <DialogDescription>
              Find a page or press Enter to search your records.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push(base + "/search?q=" + encodeURIComponent(query));
            }}
          >
            <Input
              autoFocus
              aria-label="Quick navigation and search"
              className="h-12"
              placeholder="Search candidates, roles or pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" className="mt-3 w-full" variant="secondary">
              <Search />
              Search records
            </Button>
          </form>
          <div className="max-h-72 overflow-y-auto">
            {navigation
              .filter((item) =>
                item.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map(({ href, label, icon: Icon }) => (
                <Link
                  onClick={() => setOpen(false)}
                  href={href}
                  key={href}
                  className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-muted"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="flex-1">{label}</span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
