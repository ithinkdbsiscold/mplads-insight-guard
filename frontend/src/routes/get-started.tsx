import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, SkipForward, ChevronRight, Database, Users, Search, BarChart3, Shield, Landmark } from "lucide-react";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Get Started — MPLADS Guardian" },
      { name: "description", content: "Introduction to MPLADS Guardian — a data-driven monitoring platform for MPLADS-funded works." },
    ],
  }),
  component: GetStartedPage,
});

const TOTAL_STEPS = 6;

function GetStartedPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Fetch live stats for step 1 (graceful fallback)
  const [liveStats, setLiveStats] = useState<{ mps?: number; works?: number; expenditures?: number } | null>(null);
  useEffect(() => {
    const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(d => {
        if (d.status === "healthy") {
          return fetch(`${API_BASE}/dashboard/summary?house=Lok+Sabha&ls_term=18`);
        }
        return null;
      })
      .then(r => r?.json())
      .then(d => {
        if (d?.kpis) {
          setLiveStats({
            mps: d.kpis.total_mps,
            works: d.kpis.total_works,
          });
        }
      })
      .catch(() => {/* Backend unavailable — onboarding still works */});
  }, []);

  function handleComplete() {
    localStorage.setItem("mplads_guardian_onboarding_completed", "true");
    navigate({ to: "/dashboard" });
  }

  function handleSkip() {
    localStorage.setItem("mplads_guardian_onboarding_completed", "true");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] bg-foreground text-background text-[11px] font-bold">
            MG
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">MPLADS Guardian</span>
        </div>
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip introduction"
        >
          Skip introduction
          <SkipForward className="h-3 w-3" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[640px]">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepData liveStats={liveStats} />}
          {step === 2 && <StepScope />}
          {step === 3 && <StepExplore />}
          {step === 4 && <StepNumbers />}
          {step === 5 && <StepFuture />}
        </div>
      </main>

      {/* Footer with navigation */}
      <footer className="border-t border-border px-6 py-4">
        <div className="mx-auto max-w-[640px] flex items-center justify-between">
          {/* Progress */}
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-card px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent"
                aria-label="Previous step"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-[3px] bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                aria-label="Next step"
              >
                {step === 0 ? "Get Started" : "Next"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-1.5 rounded-[3px] bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                aria-label="Open dashboard"
              >
                Open Dashboard
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Step Components ────────────────────────────────────────────────────── */

function StepWelcome() {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Landmark className="h-3 w-3" />
          Investigation Support Platform
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-foreground leading-tight sm:text-[32px]">
          Welcome to<br />MPLADS Guardian
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          A data-driven monitoring platform for exploring MPLADS-funded works, expenditure, Members of Parliament activity, and project completion across India.
        </p>
      </div>

      <div className="border-t border-border pt-5 space-y-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">What you can do here</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "Explore MPs across Lok Sabha & Rajya Sabha",
            "Search and filter by state, constituency, term",
            "Examine projects, works, and financial activity",
            "Compare fund allocation and utilization",
            "Analyze work completion rates",
            "Review expenditure and payment records",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-[13px] text-foreground">
              <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11.5px] text-muted-foreground/70 leading-relaxed">
        MPLADS Guardian brings together government MPLADS/eSAKSHI data into an investigative interface designed for transparency and accountability.
      </p>
    </div>
  );
}

function StepData({ liveStats }: { liveStats: { mps?: number; works?: number } | null }) {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Database className="h-3 w-3" />
          Step 1 of 5
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.015em] text-foreground">Start with the data</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          MPLADS Guardian uses real records from the government's MPLADS/eSAKSHI database. The platform organizes this information to make a very large dataset easier to explore and understand.
        </p>
      </div>

      <div className="rounded-[3px] border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Data organized around</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border">
          {[
            { label: "MPs", desc: "Members of Parliament" },
            { label: "Works", desc: "Projects & infrastructure" },
            { label: "Allocations", desc: "Funds assigned per MP" },
            { label: "Expenditure", desc: "Payment records" },
            { label: "Completed", desc: "Finished projects" },
            { label: "Recommended", desc: "Pending projects" },
          ].map((item, i) => (
            <div key={item.label} className={`px-4 py-3 ${i >= 3 ? "border-t border-border" : ""}`}>
              <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {liveStats && (
        <div className="flex items-center gap-6 text-[12px] text-muted-foreground pt-1">
          {liveStats.mps && <span>Currently tracking <strong className="text-foreground">{liveStats.mps.toLocaleString()}</strong> MPs</span>}
          {liveStats.works && <span><strong className="text-foreground">{liveStats.works.toLocaleString()}</strong> works indexed</span>}
        </div>
      )}
    </div>
  );
}

function StepScope() {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Step 2 of 5
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.015em] text-foreground">Choose your scope</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          The application header includes a House and Term selector. Changing this selection filters all data across the entire platform — dashboard, MPs, projects, analytics.
        </p>
      </div>

      {/* Visual example */}
      <div className="rounded-[3px] border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">House</p>
          <div className="flex items-center gap-0.5 rounded-[4px] border border-border bg-surface p-0.5 w-fit">
            <span className="px-3 py-1.5 rounded-sm text-[12.5px] font-medium bg-primary text-primary-foreground">Lok Sabha</span>
            <span className="px-3 py-1.5 rounded-sm text-[12.5px] font-medium text-muted-foreground">Rajya Sabha</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Lok Sabha Term</p>
          <div className="flex items-center gap-0.5 rounded-[4px] border border-border bg-surface p-0.5 w-fit">
            <span className="px-3 py-1.5 rounded-sm text-[12.5px] font-medium bg-primary text-primary-foreground">18th Term</span>
            <span className="px-3 py-1.5 rounded-sm text-[12.5px] font-medium text-muted-foreground">17th Term</span>
          </div>
        </div>
      </div>

      <div className="rounded-[3px] border border-dashed border-border bg-muted/30 px-4 py-3">
        <p className="text-[12.5px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Lok Sabha</strong> is filtered by term (17th or 18th). <strong className="text-foreground">Rajya Sabha</strong> shows all available data. The selected scope persists as you navigate between pages.
        </p>
      </div>
    </div>
  );
}

function StepExplore() {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Users className="h-3 w-3" />
          Step 3 of 5
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.015em] text-foreground">Follow the work</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          Browse Members of Parliament, then drill into their associated projects and financial activity.
        </p>
      </div>

      {/* Flow diagram */}
      <div className="rounded-[3px] border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {[
            { step: "1", title: "Find an MP", desc: "Search by name, filter by state, browse with pagination" },
            { step: "2", title: "Open their profile", desc: "See allocation, expenditure, utilization, and completion metrics" },
            { step: "3", title: "Explore projects", desc: "View recommended and completed works linked to that MP" },
            { step: "4", title: "Examine financials", desc: "Check expenditure records, payment status, and vendor details" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 px-4 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                {item.step}
              </span>
              <div>
                <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-[2px] border border-border px-1.5 py-0.5 text-[11px] font-semibold">MP</span>
        <ArrowRight className="h-3 w-3" />
        <span className="inline-flex items-center gap-1 rounded-[2px] border border-border px-1.5 py-0.5 text-[11px] font-semibold">Projects / Works</span>
        <ArrowRight className="h-3 w-3" />
        <span className="inline-flex items-center gap-1 rounded-[2px] border border-border px-1.5 py-0.5 text-[11px] font-semibold">Financial Activity</span>
      </div>
    </div>
  );
}

function StepNumbers() {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <BarChart3 className="h-3 w-3" />
          Step 4 of 5
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.015em] text-foreground">See where the money goes</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          Key financial concepts used throughout the platform.
        </p>
      </div>

      <div className="rounded-[3px] border border-border bg-card divide-y divide-border">
        {[
          { term: "Allocated Funds", def: "Total amount assigned to an MP under MPLADS for the selected scope." },
          { term: "Expenditure", def: "Sum of actual payment records associated with works." },
          { term: "Fund Utilization", def: "Expenditure ÷ Allocated Funds × 100. Measures how much of the allocation has been spent." },
          { term: "Recommended Works", def: "Projects that have been recommended but not yet completed." },
          { term: "Completed Works", def: "Projects with a recorded completion date and final amount." },
          { term: "Completion Rate", def: "Completed Works ÷ Total Tracked Works × 100." },
        ].map((item) => (
          <div key={item.term} className="flex items-start gap-3 px-4 py-3">
            <span className="shrink-0 w-[140px] text-[12.5px] font-semibold text-foreground">{item.term}</span>
            <span className="text-[12.5px] text-muted-foreground leading-relaxed">{item.def}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/70 leading-relaxed border-l-2 border-border pl-3">
        Metrics are derived from available MPLADS source records. Definitions may vary depending on the underlying dataset.
      </p>
    </div>
  );
}

function StepFuture() {
  return (
    <div className="space-y-6 fade-in-up">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-[3px] border border-border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <Shield className="h-3 w-3" />
          Step 5 of 5
        </div>
        <h2 className="text-[24px] font-bold tracking-[-0.015em] text-foreground">From monitoring to investigation</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[520px]">
          MPLADS Guardian is being designed to identify patterns in project and financial data that may deserve closer review.
        </p>
      </div>

      <div className="rounded-[3px] border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Future detection signals may include</p>
        </div>
        <ul className="divide-y divide-border">
          {[
            "Unusual expenditure patterns",
            "Unusual project concentrations",
            "Inconsistencies between expenditure and completion",
            "Duplicate or highly similar project records",
            "Other statistically unusual patterns",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[3px] border border-dashed border-border bg-muted/30 px-4 py-3 space-y-2">
        <p className="text-[12.5px] text-foreground font-medium">Current status</p>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Automated detection is part of the <strong className="text-foreground">next stage</strong> of MPLADS Guardian. The monitoring data is available now — detection agents are not yet active.
        </p>
        <p className="text-[11.5px] text-muted-foreground/70 leading-relaxed mt-1">
          The system is intended to surface records for human review — not automatically determine fraud or wrongdoing.
        </p>
      </div>

      <p className="text-[13px] text-foreground font-medium pt-2">
        Ready to explore the data? Open the dashboard to begin.
      </p>
    </div>
  );
}
