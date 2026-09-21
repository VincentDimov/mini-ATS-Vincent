'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-medium text-muted-foreground">Mini ATS</p>
        <h1 className="mt-2 text-2xl font-semibold">Something needs another try</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The page could not be loaded. Your data has not been changed.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
