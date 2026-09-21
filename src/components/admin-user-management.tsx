"use client"

import { useMemo, useState, useTransition, type FormEvent } from "react"
import {
  Building2,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NEW_ORGANIZATION = "__new_organization__"
const NO_ORGANIZATION = "__no_organization__"

export type AdminOrganization = {
  id: string
  name: string
}

export type AdminUser = {
  id: string
  email: string
  full_name: string
  role: "admin" | "customer"
  organization_id: string | null
}

export type CreateAdminUserInput = {
  email: string
  fullName: string
  password: string
  role: "admin" | "customer"
  organizationId?: string
  organizationName?: string
}

export type CreateAdminUserResult = {
  ok: boolean
  error?: string
  message?: string
}

type AdminUserManagementProps = {
  organizations: AdminOrganization[]
  users: AdminUser[]
  onCreate: (input: CreateAdminUserInput) => Promise<CreateAdminUserResult>
}

type UserForm = {
  email: string
  fullName: string
  password: string
  role: AdminUser["role"]
  organizationName: string
}

const initialForm: UserForm = {
  email: "",
  fullName: "",
  password: "",
  role: "customer",
  organizationName: "",
}

function roleLabel(role: AdminUser["role"]) {
  return role === "admin" ? "Admin" : "Customer"
}

export function AdminUserManagement({
  organizations,
  users,
  onCreate,
}: AdminUserManagementProps) {
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(initialForm)
  const [organizationChoice, setOrganizationChoice] = useState<string | undefined>(
    organizations.length === 0 ? NEW_ORGANIZATION : undefined
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const organizationNames = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization.name])),
    [organizations]
  )

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()

    if (!query) return users

    return users.filter((user) => {
      const organization = user.organization_id
        ? organizationNames.get(user.organization_id) ?? ""
        : "unassigned"

      return [user.full_name, user.email, roleLabel(user.role), organization].some((value) =>
        value.toLocaleLowerCase().includes(query)
      )
    })
  }, [organizationNames, search, users])

  const customerCount = users.filter((user) => user.role === "customer").length
  const adminCount = users.length - customerCount
  const isCreatingOrganization = organizationChoice === NEW_ORGANIZATION
  const passwordIsLongEnough = form.password.length >= 12

  function resetForm() {
    setForm(initialForm)
    setOrganizationChoice(organizations.length === 0 ? NEW_ORGANIZATION : undefined)
    setFormError(null)
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) setFormError(null)
  }

  function handleRoleChange(value: string) {
    const role = value as AdminUser["role"]
    setForm((current) => ({
      ...current,
      role,
      organizationName: role === "admin" ? "" : current.organizationName,
    }))

    if (role === "admin") {
      setOrganizationChoice(NO_ORGANIZATION)
    } else if (organizationChoice === NO_ORGANIZATION) {
      setOrganizationChoice(undefined)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    const email = form.email.trim()
    const fullName = form.fullName.trim()
    const password = form.password
    const organizationName = isCreatingOrganization ? form.organizationName.trim() : ""
    const organizationId =
      organizationChoice &&
      organizationChoice !== NEW_ORGANIZATION &&
      organizationChoice !== NO_ORGANIZATION
        ? organizationChoice
        : undefined

    if (!email || !fullName || !password) {
      setFormError("Enter an email address, name, and initial password.")
      return
    }

    if (!passwordIsLongEnough) {
      setFormError("The initial password must be at least 12 characters long.")
      return
    }

    if (form.role === "customer" && !organizationId && !organizationName) {
      setFormError("Choose an existing organization or enter a new organization name.")
      return
    }

    startTransition(async () => {
      try {
        const result = await onCreate({
          email,
          fullName,
          password,
          role: form.role,
          organizationId,
          organizationName: organizationName || undefined,
        })

        if (!result.ok) {
          setFormError(result.error ?? "Could not create the user. Please try again.")
          return
        }

        setSuccessMessage(result.message ?? "User created successfully.")
        resetForm()
        setDialogOpen(false)
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Could not create the user. Please try again."
        )
      }
    })
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">Administration</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            User management
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Create customer and administrator accounts, and keep organization access easy to audit.
          </p>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={openCreateDialog}>
          <UserPlus data-icon="inline-start" aria-hidden="true" />
          Add user
        </Button>
      </div>

      {successMessage ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Users className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total users</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Building2 className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{customerCount}</p>
              <p className="text-xs text-muted-foreground">Customer users</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{adminCount}</p>
              <p className="text-xs text-muted-foreground">Administrators</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {filteredUsers.length === users.length
                ? `${users.length} account${users.length === 1 ? "" : "s"}`
                : `${filteredUsers.length} of ${users.length} accounts`}
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or organization"
              className="pl-8"
              aria-label="Search users"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Organization
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.length ? (
                  filteredUsers.map((user) => {
                    const organization = user.organization_id
                      ? organizationNames.get(user.organization_id)
                      : undefined

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-3 py-3">
                          <p className="font-medium text-foreground">{user.full_name || "Unnamed user"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {organization ?? "Unassigned"}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-10 text-center text-muted-foreground">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredUsers.length ? (
              filteredUsers.map((user) => {
                const organization = user.organization_id
                  ? organizationNames.get(user.organization_id)
                  : undefined

                return (
                  <article key={user.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.full_name || "Unnamed user"}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{organization ?? "Unassigned"}</span>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No users match your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg" showCloseButton={!isPending}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Add an administrator or customer account. Customer users must belong to an organization.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-4">
              {formError ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {formError}
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="new-user-name">Full name</Label>
                <Input
                  id="new-user-name"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-user-email">Email address</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  autoComplete="email"
                  placeholder="alex@company.com"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-user-password">Initial password</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  autoComplete="new-password"
                  minLength={12}
                  placeholder="At least 12 characters"
                  required
                  disabled={isPending}
                  aria-describedby="new-user-password-help"
                />
                <p
                  id="new-user-password-help"
                  className={passwordIsLongEnough || !form.password ? "text-xs text-muted-foreground" : "text-xs text-destructive"}
                >
                  {passwordIsLongEnough || !form.password
                    ? "Use at least 12 characters. The user can change it after signing in."
                    : `${12 - form.password.length} more character${12 - form.password.length === 1 ? "" : "s"} required.`}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-user-role">Role</Label>
                  <Select value={form.role} onValueChange={handleRoleChange} disabled={isPending}>
                    <SelectTrigger id="new-user-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-user-organization">
                    Organization
                    {form.role === "customer" ? <span className="text-destructive">*</span> : null}
                  </Label>
                  <Select
                    value={organizationChoice}
                    onValueChange={setOrganizationChoice}
                    disabled={isPending}
                  >
                    <SelectTrigger id="new-user-organization" className="w-full">
                      <SelectValue placeholder="Choose organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.role === "admin" ? (
                        <SelectItem value={NO_ORGANIZATION}>No organization</SelectItem>
                      ) : (
                        <>
                          {organizations.map((organization) => (
                            <SelectItem key={organization.id} value={organization.id}>
                              {organization.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={NEW_ORGANIZATION}>Create a new organization</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isCreatingOrganization ? (
                <div className="grid gap-2">
                  <Label htmlFor="new-organization-name">New organization name</Label>
                  <Input
                    id="new-organization-name"
                    value={form.organizationName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, organizationName: event.target.value }))
                    }
                    placeholder="e.g. Acme Recruitment"
                    required={form.role === "customer"}
                    disabled={isPending}
                  />
                </div>
              ) : null}

              <p className="text-xs leading-5 text-muted-foreground">
                {form.role === "customer"
                  ? "A customer account is scoped to the selected organization."
                  : "Admins have global access and are intentionally not linked to an organization."}
              </p>
            </div>

            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
                {isPending ? "Creating user…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  const isAdmin = role === "admin"

  return (
    <span
      className={
        isAdmin
          ? "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
      }
    >
      {isAdmin ? <ShieldCheck className="size-3" aria-hidden="true" /> : <Users className="size-3" aria-hidden="true" />}
      {roleLabel(role)}
    </span>
  )
}

export default AdminUserManagement
