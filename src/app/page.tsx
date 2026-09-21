import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-primary/10 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-primary to-sky-500 text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Mini-ATS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/login">
              <Button size="sm" className="rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative px-6 pb-20 pt-32">
        <div className="container mx-auto text-center max-w-4xl relative">
          {/* Background Glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/25 blur-[120px]" />
          <div className="pointer-events-none absolute -right-44 top-16 -z-10 size-72 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 size-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
          
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/80 px-3 py-1 text-sm font-medium text-primary shadow-sm shadow-primary/10 backdrop-blur">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            Elevating Recruitment in Sweden
          </div>
          
          <h1 className="mb-6 bg-gradient-to-br from-foreground via-indigo-950 to-primary bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-7xl">
            Hire the Best Talent, <br className="hidden md:block" />
            <span className="text-primary">Effortlessly.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            The next-generation Applicant Tracking System designed for modern teams. Streamline your hiring process with an elegant, lightning-fast platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 h-12 text-base group">
                Start Hiring Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Interface Mockup */}
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-primary/10 bg-card/75 shadow-[0_30px_80px_-38px_rgb(79_70_229_/_0.45)] backdrop-blur-sm sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-primary/10 bg-gradient-to-r from-violet-50 via-sky-50 to-emerald-50 px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-b from-white/60 to-violet-50/50 p-8 md:p-12">
              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
                {/* Mocked Cards inside ATS */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="flex h-40 flex-col gap-4 rounded-xl border border-violet-100 bg-card p-6 shadow-sm">
                    <div className="h-6 w-32 rounded-md bg-gradient-to-r from-violet-500/35 to-sky-500/25" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-full bg-muted/50 rounded-md" />
                      <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
                    </div>
                  </div>
                  <div className="flex h-24 items-center gap-4 rounded-xl border border-sky-100 bg-card p-6 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                       <div className="h-4 w-24 bg-muted rounded-md" />
                       <div className="h-3 w-16 bg-muted/50 rounded-md" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                    <div className="h-24 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-sky-50 shadow-sm" />
                    <div className="h-40 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="border-t border-primary/10 bg-gradient-to-br from-violet-50/70 via-background to-sky-50/70 py-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why choose Mini-ATS?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Built from the ground up for performance and aesthetics, making your daily recruitment tasks a joy.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-violet-100 bg-card/90 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-200/40">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Built on Next.js App Router for instant page transitions and optimal performance.</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-card/90 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-200/40">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Design</h3>
              <p className="text-muted-foreground">Carefully crafted UI with Shadcn components, prioritizing readability and visual hierarchy.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-card/90 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-200/40">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seamless Workflow</h3>
              <p className="text-muted-foreground">Every click is optimized. Move candidates through your pipeline without friction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 bg-card/50 py-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Mini-ATS-Vincent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
