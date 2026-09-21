import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Mini ATS', template: '%s · Mini ATS' },
  description: 'A secure, compact applicant tracking system for modern hiring teams.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
