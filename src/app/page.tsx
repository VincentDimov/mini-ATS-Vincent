import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Users, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/50 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
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
      <main className="pt-32 pb-16 px-6">
        <div className="container mx-auto text-center max-w-4xl relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-70 pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            Elevating Recruitment in Sweden
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
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
          <div className="relative mx-auto max-w-5xl rounded-xl sm:rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="p-8 md:p-12 aspect-[16/9] flex items-center justify-center bg-gradient-to-b from-transparent to-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* Mocked Cards inside ATS */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="h-40 rounded-xl bg-card border border-border shadow-sm p-6 flex flex-col gap-4">
                    <div className="h-6 w-32 bg-muted rounded-md" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-full bg-muted/50 rounded-md" />
                      <div className="h-4 w-5/6 bg-muted/50 rounded-md" />
                    </div>
                  </div>
                  <div className="h-24 rounded-xl bg-card border border-border shadow-sm p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                       <div className="h-4 w-24 bg-muted rounded-md" />
                       <div className="h-3 w-16 bg-muted/50 rounded-md" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                    <div className="h-24 rounded-xl bg-card border border-border shadow-sm" />
                    <div className="h-40 rounded-xl bg-card border border-border shadow-sm bg-gradient-to-br from-primary/5 to-primary/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why choose Mini-ATS?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Built from the ground up for performance and aesthetics, making your daily recruitment tasks a joy.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Built on Next.js App Router for instant page transitions and optimal performance.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Design</h3>
              <p className="text-muted-foreground">Carefully crafted UI with Shadcn components, prioritizing readability and visual hierarchy.</p>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seamless Workflow</h3>
              <p className="text-muted-foreground">Every click is optimized. Move candidates through your pipeline without friction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50 bg-background">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Mini-ATS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
