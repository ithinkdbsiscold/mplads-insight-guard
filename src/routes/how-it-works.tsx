import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Database, Search, Clock, FileWarning, Map, CheckCircle2, AlertTriangle, Play, ChevronRight, Activity } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it Works — MPLADS Guardian" },
      { name: "description", content: "Learn how the MPLADS Guardian AI risk engine works." },
    ],
  }),
  component: OnboardingFlow,
});

function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const totalSteps = 5;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else router.navigate({ to: "/dashboard" });
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderVisual = () => {
    switch (step) {
      case 1:
        return <VisualStep1 />;
      case 2:
        return <VisualStep2 />;
      case 3:
        return <VisualStep3 />;
      case 4:
        return <VisualStep4 />;
      case 5:
        return <VisualStep5 />;
      default:
        return null;
    }
  };

  const textContent = [
    {
      label: "THE PROBLEM",
      title: "Monitoring thousands of projects",
      desc: "MPLADS involves large volumes of project information, fund utilization, physical progress, timelines, implementing agencies, and geographic information. Finding the projects that need attention first can be difficult when reviewing large volumes of data manually.",
    },
    {
      label: "MULTI-AGENT ANALYSIS",
      title: "Multiple analytical agents. One investigation view.",
      desc: "MPLADS Guardian uses specialized analytical agents to examine different aspects of every project.",
    },
    {
      label: "RISK ENGINE",
      title: "From individual signals to a single risk view",
      desc: "Each analytical agent produces evidence and an indicator strength. The risk engine combines these signals into an overall project risk score.",
    },
    {
      label: "INVESTIGATION",
      title: "Understand why a project was flagged",
      desc: "Every risk score is accompanied by the evidence that contributed to it. The system assists officers rather than replacing human judgement.",
    },
    {
      label: "MONITORING WORKSPACE",
      title: "From signals to action",
      desc: "The monitoring workspace allows officers to monitor projects across regions, filter high-risk projects, investigate individual projects, review agent findings, analyze geographic patterns, track alerts, and generate investigation briefs.",
    }
  ];

  const current = textContent[step - 1]!;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* Top Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6 md:px-12">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-foreground text-background text-xs font-bold">
            MG
          </span>
          <span className="text-sm font-semibold tracking-tight">MPLADS Guardian</span>
        </Link>
        <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Skip introduction
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* Left Column: Text & Nav */}
        <div className="flex w-full flex-col justify-between border-b border-border lg:w-[45%] lg:border-b-0 lg:border-r p-8 md:p-16 xl:p-24">
          <div className="space-y-6 fade-in-up" key={`text-${step}`}>
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{current.label}</span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl heading-serif">
              {current.title}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              {current.desc}
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tnum">0{step} / 0{totalSteps}</span>
              <div className="flex gap-1.5 ml-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i + 1 === step ? "w-4 bg-foreground" : "w-1.5 bg-border"}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                aria-label="Previous step"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextStep}
                className="flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                {step === totalSteps ? "Enter Workspace" : "Next"} 
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual */}
        <div className="flex w-full flex-1 items-center justify-center bg-surface p-8 md:p-16">
          <div className="w-full max-w-xl fade-in-up" key={`visual-${step}`}>
            {renderVisual()}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------ Visual Components ------------ */

function VisualStep1() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Data Ingestion Engine</span>
        </div>
        <span className="text-xs text-muted-foreground tnum">24,152 Records</span>
      </div>
      
      <div className="space-y-3">
        {[
          { icon: Search, label: "Project Proposals", val: "12,400" },
          { icon: Activity, label: "Fund Utilization Certificates", val: "8,920" },
          { icon: Clock, label: "Physical Progress Reports", val: "2,105" },
          { icon: Map, label: "Geospatial Coordinates", val: "727" }
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <span className="text-sm text-muted-foreground tnum">{item.val} / mo</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualStep2() {
  const agents = [
    { icon: Activity, name: "Financial Agent", desc: "Detects unusual expenditure & cost patterns." },
    { icon: CheckCircle2, name: "Progress Agent", desc: "Compares financial vs physical progress." },
    { icon: Clock, name: "Delay Agent", desc: "Identifies projects falling behind timelines." },
    { icon: FileWarning, name: "Duplicate Agent", desc: "Finds overlapping or duplicate works." },
    { icon: Map, name: "Geographic Agent", desc: "Identifies unusual spatial patterns." },
    { icon: Search, name: "Compliance Agent", desc: "Checks against monitoring requirements." }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {agents.map((agent, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-foreground/20">
          <agent.icon className="mb-3 h-5 w-5 text-foreground" />
          <h3 className="text-sm font-semibold mb-1">{agent.name}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{agent.desc}</p>
        </div>
      ))}
    </div>
  );
}

function VisualStep3() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="bg-surface px-6 py-4 border-b border-border">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Risk Calculation</span>
      </div>
      <div className="p-6">
        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Financial anomaly</span>
            <span className="font-mono text-risk-high">+20</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Progress mismatch</span>
            <span className="font-mono text-risk-high">+30</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Delay indicator</span>
            <span className="font-mono text-risk-medium">+20</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Duplicate similarity</span>
            <span className="font-mono text-risk-medium">+12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Geographic anomaly</span>
            <span className="font-mono text-risk-low">+10</span>
          </div>
        </div>
        
        <div className="border-t border-border pt-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-1">Total Score</span>
            <span className="text-3xl font-bold tnum">92 <span className="text-xl text-muted-foreground font-medium">/ 100</span></span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 rounded-sm bg-risk-critical-soft px-2.5 py-1 text-risk-critical mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-bold uppercase tracking-wide">Critical</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Requires investigation</span>
          </div>
        </div>
      </div>
      <div className="bg-surface px-6 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The risk score represents the combined strength of detected indicators. It does not establish wrongdoing.
        </p>
      </div>
    </div>
  );
}

function VisualStep4() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground">MPL-1842</span>
            <h3 className="text-base font-semibold mt-0.5">Community Health Centre</h3>
            <p className="text-xs text-muted-foreground">Patna, Bihar</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tnum">92 <span className="text-sm text-muted-foreground">/ 100</span></div>
            <span className="text-[10px] font-semibold text-risk-critical uppercase">Risk Score</span>
          </div>
        </div>
      </div>
      
      <div className="p-6 border-b border-border">
        <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Detected Evidence</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Financial Progress</span>
            <span className="font-medium tnum">94%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Physical Progress</span>
            <span className="font-medium tnum text-risk-critical">38%</span>
          </div>
          <div className="h-px w-full bg-border" />
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><span className="text-risk-high mt-0.5">•</span> 6 months behind schedule</li>
            <li className="flex gap-2"><span className="text-risk-high mt-0.5">•</span> Cost approximately 38% above regional benchmark</li>
            <li className="flex gap-2"><span className="text-risk-high mt-0.5">•</span> Possible similar project detected nearby</li>
          </ul>
        </div>
      </div>
      
      <div className="p-6 bg-surface">
        <h4 className="text-xs font-semibold tracking-widest uppercase text-foreground mb-3">Recommended verification</h4>
        <ol className="list-decimal list-inside space-y-1.5 text-[13px] text-muted-foreground">
          <li>Verify reported physical progress.</li>
          <li>Review expenditure records.</li>
          <li>Compare nearby projects.</li>
          <li>Consider field inspection if discrepancies remain.</li>
        </ol>
      </div>
    </div>
  );
}

function VisualStep5() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[400px]">
      <div className="flex h-10 items-center border-b border-border bg-surface px-4 gap-4">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="h-5 w-48 rounded bg-background border border-border" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Mock Sidebar */}
        <div className="w-32 shrink-0 border-r border-border bg-surface p-3 space-y-2">
          <div className="h-4 w-20 rounded bg-border mb-6" />
          <div className="h-3 w-full rounded bg-border/50" />
          <div className="h-3 w-full rounded bg-border/50" />
          <div className="h-3 w-5/6 rounded bg-primary/20" />
          <div className="h-3 w-full rounded bg-border/50" />
        </div>
        {/* Mock Main Content */}
        <div className="flex-1 p-5 space-y-4">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-32 rounded bg-border" />
            <div className="h-6 w-24 rounded bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="h-16 rounded border border-border bg-background" />
            <div className="h-16 rounded border border-border bg-background" />
            <div className="h-16 rounded border border-border bg-background" />
          </div>
          <div className="h-32 rounded border border-border bg-background p-4 space-y-3">
             <div className="h-3 w-1/3 rounded bg-border" />
             <div className="h-px w-full bg-surface" />
             <div className="h-3 w-full rounded bg-surface" />
             <div className="h-3 w-full rounded bg-surface" />
             <div className="h-3 w-2/3 rounded bg-surface" />
          </div>
        </div>
      </div>
      {/* Overlay Button */}
      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
        <Link 
          to="/dashboard"
          className="flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-8 text-sm font-medium text-background shadow-lg transition-transform hover:scale-105"
        >
          Enter Monitoring Workspace <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
