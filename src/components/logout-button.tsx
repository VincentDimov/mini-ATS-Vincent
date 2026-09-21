'use client'

import { useState } from 'react'
import { LoaderCircle, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleLogout() {
    setIsSigningOut(true)

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      router.replace('/login')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={className}
      onClick={handleLogout}
      disabled={isSigningOut}
    >
      {isSigningOut ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
      {isSigningOut ? 'Logging out...' : 'Log out'}
    </Button>
  )
}
