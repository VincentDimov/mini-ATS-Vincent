import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Layers,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const preview = [
  {
    stage: "New",
    color: "bg-sky-500",
    people: ["Alex Morgan", "Jamie Andersson"],
  },
  { stage: "Screening", color: "bg-violet-500", people: ["Sam Rivera"] },
  {
    stage: "Interview",
    color: "bg-amber-500",
    people: ["Robin Chen", "Taylor Eriksson"],
  },
];
const features = [
  {
    icon: Layers,
    title: "One clear hiring flow",
    description:
      "Move between a visual pipeline and a focused list. Search, tag and update candidates together.",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    icon: CalendarDays,
    title: "Better conversations",
    description:
      "Share candidate notes, plan interviews and take appointments into your own calendar.",
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    icon: LockKeyhole,
    title: "The right people. The right access.",
    description:
      "Private CVs, separate company workspaces and hiring circles for sensitive roles.",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="border-b border-primary/10 bg-card/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="brand-mark">
              <Sparkles className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">
              mini<span className="text-primary">ats.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground hover:text-primary sm:block"
            >
              Inside the workspace
            </Link>
            <Button asChild>
              <Link href="/login">
                Sign in <ArrowRight />
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-24">
          <div className="pointer-events-none absolute -right-20 top-20 size-96 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="relative">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-2 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />A little more clarity. A better
              hiring day.
            </p>
            <h1 className="text-5xl font-semibold leading-[1.06] tracking-[-.045em] sm:text-6xl lg:text-7xl">
              Great teams
              <br />
              start with
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-sky-600 bg-clip-text text-transparent dark:from-violet-300 dark:to-sky-300">
                real connection.
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
              Your roles, your people, your next conversation. A thoughtful
              recruiting workspace that brings it all together.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/login">
                  Open your workspace <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">Take a closer look</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Accounts are provided by your workspace administrator.
            </p>
          </div>
          <div className="relative rounded-3xl border border-primary/15 bg-card p-4 shadow-[0_30px_90px_-35px_rgb(109_40_217_/_0.35)] sm:p-6">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="avatar-tile">
                  <Layers className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Your next great hire</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Engineering · Candidate pipeline
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-medium text-primary">
                Example workspace
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {preview.map((column) => (
                <div
                  key={column.stage}
                  className="rounded-2xl bg-muted/50 p-2 sm:p-3"
                >
                  <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold">
                    <span className={"size-2 rounded-full " + column.color} />
                    {column.stage}
                    <span className="ml-auto text-muted-foreground">
                      {column.people.length}
                    </span>
                  </p>
                  <div className="space-y-3">
                    {column.people.map((name, index) => (
                      <div
                        key={name}
                        className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-3"
                      >
                        <div className="avatar-tile mb-3 size-8 text-[10px]">
                          {name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <p className="text-xs font-semibold">{name}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {index ? "Product engineer" : "Frontend engineer"}
                        </p>
                        <div className="mt-3 border-t pt-2 text-[10px] text-primary">
                          {column.stage === "Interview"
                            ? "Conversation planned"
                            : "Profile ready"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Check className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">
                  A shared view, without the spreadsheet shuffle.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Every stage change stays connected to the candidate.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="border-t border-border bg-card/60 px-6 py-20 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <p className="section-label">
              Less administration. More connection.
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Everything your hiring day needs.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description, color }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-border bg-card p-7"
                >
                  <span
                    className={
                      "mb-6 flex size-12 items-center justify-center rounded-2xl " +
                      color
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row lg:px-10">
        <p>Mini ATS Vincent · Made for thoughtful teams.</p>
        <Link href="/login" className="hover:text-primary">
          Your workspace awaits →
        </Link>
      </footer>
    </div>
  );
}
