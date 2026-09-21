import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/admin', '/dashboard', '/candidates']

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // The public landing page remains usable while a local developer is filling
  // in .env.local. Protected pages will still enforce authentication in their
  // server layouts/actions.
  if (!url || !key) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Keep this immediately after client creation: Supabase refreshes the
  // session through these response cookies.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl
  const protectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!signedIn && protectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (signedIn && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)'],
}
