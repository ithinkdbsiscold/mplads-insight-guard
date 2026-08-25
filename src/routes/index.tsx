import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Welcome — MPLADS Guardian" },
      { name: "description", content: "AI-assisted monitoring for MPLADS projects." },
    ],
  }),
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Header */}
      <header className="flex h-16 shrink-0 items-center border-b border-border px-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-foreground text-background text-xs font-bold">
            MG
          </span>
          <span className="text-sm font-semibold tracking-tight">MPLADS Guardian</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:gap-24">
          
          {/* Left Column: Text */}
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl heading-serif">
                Welcome to MPLADS Guardian
              </h1>
              <p className="text-xl font-medium text-foreground">
                AI-assisted monitoring for MPLADS projects, funds and implementation risks.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground max-w-[500px]">
                MPLADS Guardian analyzes project, financial and progress data to identify unusual patterns and prioritize projects that may require closer review.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to="/how-it-works"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-8 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-transparent px-8 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Skip introduction
              </Link>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
              <div className="flex flex-col space-y-6">
                <ProcessStep label="PROJECT DATA" active={false} />
                <ProcessArrow />
                <ProcessStep label="AI ANALYSIS" active={true} />
                <ProcessArrow />
                <ProcessStep label="RISK INDICATORS" active={false} />
                <ProcessArrow />
                <ProcessStep label="INVESTIGATION PRIORITY" active={false} emphasis />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border px-6 py-6 md:px-12 text-center">
        <p className="text-sm text-muted-foreground">
          Designed as an AI-assisted decision-support system. Final decisions remain with authorized officers.
        </p>
      </footer>
    </div>
  );
}

function ProcessStep({ label, active, emphasis }: { label: string; active?: boolean; emphasis?: boolean }) {
  return (
    <div className={`flex h-14 items-center justify-center rounded-md border ${
      active ? 'border-foreground bg-foreground text-background' : 
      emphasis ? 'border-primary bg-primary/5 text-primary font-semibold' :
      'border-border bg-background text-foreground'
    }`}>
      <span className="text-xs font-semibold tracking-widest uppercase">{label}</span>
    </div>
  );
}

function ProcessArrow() {
  return (
    <div className="flex justify-center text-muted-foreground">
      <div className="h-6 w-px bg-border"></div>
    </div>
  );
}
