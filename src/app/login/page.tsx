'use client'

import { ArrowLeft, LoaderCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !data.user) throw new Error('Incorrect email or password.')

      // Authorization is always read from the RLS-protected profiles table;
      // browser-editable user metadata is not trusted for role routing.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      const profile = profileData as Pick<Profile, 'role'> | null

      if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'customer')) {
        await supabase.auth.signOut()
        throw new Error('This account does not have a valid Mini ATS access profile.')
      }

      router.replace(profile.role === 'admin' ? '/admin' : '/dashboard')
      router.refresh()
    } catch (signInFailure) {
      setError(signInFailure instanceof Error ? signInFailure.message : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-80 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.34),transparent_30%),radial-gradient(circle_at_80%_75%,rgba(45,212,191,.42),transparent_28%)]" />
        <div className="absolute -bottom-24 -left-20 size-72 rounded-full bg-fuchsia-400/35 blur-3xl" />
        <div className="relative flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/95 text-violet-700 shadow-lg shadow-indigo-950/20"><Sparkles className="size-4" /></span>
          Mini ATS
        </div>
        <div className="relative max-w-lg">
          <p className="mb-4 text-sm font-medium tracking-wide text-white/80">RECRUITMENT, WITHOUT THE CLUTTER</p>
          <h1 className="text-4xl font-semibold tracking-tight">A focused workspace for every hiring conversation.</h1>
          <p className="mt-5 text-base leading-7 text-white/80">Keep roles, candidates and interview context in one secure pipeline.</p>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-background px-6 py-16 sm:px-10">
        <div className="pointer-events-none absolute right-0 top-0 size-80 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-72 rounded-full bg-violet-300/20 blur-3xl" />
        <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:left-10 sm:top-10">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
        <div className="relative w-full max-w-sm rounded-3xl border border-primary/10 bg-card/90 p-6 shadow-xl shadow-primary/10 backdrop-blur sm:p-8">
          <div className="mb-8">
            <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-primary-foreground shadow-lg shadow-primary/20 lg:hidden"><Sparkles className="size-4" /></div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use the account created by your Mini ATS administrator.</p>
          </div>
          <form className="space-y-5" onSubmit={signIn}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="h-11" />
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
            <Button className="h-11 w-full" type="submit" disabled={loading}>
              {loading && <LoaderCircle className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
