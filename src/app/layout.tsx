import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cookies } from "next/headers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mini ATS", template: "%s · Mini ATS" },
  description:
    "A secure, compact applicant tracking system for modern hiring teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const dark = (await cookies()).get("mini-ats-theme")?.value === "dark";
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased${dark ? " dark" : ""}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
