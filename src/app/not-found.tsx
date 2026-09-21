import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page is not available</h1>
        <Button asChild className="mt-6"><Link href="/">Return home</Link></Button>
      </div>
    </main>
  )
}
