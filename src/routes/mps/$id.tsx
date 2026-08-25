import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, User, Activity, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { getMp, getMpStats, listProjects, type ProjectStatus, type Project } from "@/services/api";
import { ProjectTable } from "@/components/shared/ProjectTable";

export const Route = createFileRoute("/mps/$id")({
  component: MpProfilePage,
});

function MpProfilePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const mp = getMp(id);
  const [activeTab, setActiveTab] = useState<ProjectStatus | "attention" | "all">("all");

  if (!mp) {
    return (
      <div className="py-12 text-center fade-in-up">
        <h2 className="text-xl font-semibold heading-serif">Member of Parliament not found</h2>
        <p className="mt-2 text-muted-foreground">The requested record could not be located.</p>
        <button 
          onClick={() => router.history.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const stats = getMpStats(mp.id);
  
  // Filter projects for the table
  const query: any = { mpId: mp.id, pageSize: 100 };
  if (activeTab === "attention") {
    // handled after fetch for simplicity since the API mock doesn't support 'attention' status
  } else if (activeTab !== "all") {
    query.status = activeTab;
  }
  
  const { rows: projects } = listProjects(query);
  
  // Filter for attention if needed
  const displayProjects = activeTab === "attention" 
    ? projects.filter(p => p.riskLevel === "high" || p.riskLevel === "critical") 
    : projects;

  const tabs = [
    { id: "all", label: "All Projects" },
    { id: "completed", label: "Completed" },
    { id: "ongoing", label: "Ongoing" },
    { id: "delayed", label: "Delayed" },
    { id: "attention", label: "Requiring Attention" },
  ] as const;

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;
  };

  return (
    <div className="space-y-6 fade-in-up">
      <div>
        <Link 
          to="/mps" 
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Members of Parliament
        </Link>
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground heading-serif">{mp.name}</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              {mp.house} • {mp.constituency}, {mp.state}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px]">
            <span className="font-medium text-muted-foreground">Member Status:</span>
            <span className="font-semibold text-foreground">{mp.memberStatus}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* MPLADS Activity */}
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-surface px-5 py-3.5">
            <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> MPLADS Activity
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border border-b border-border">
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Projects Recommended</span>
              <span className="text-2xl font-semibold tnum">{stats.total}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Completed</span>
              <span className="text-2xl font-semibold tnum">{stats.completed}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Ongoing</span>
              <span className="text-2xl font-semibold tnum">{stats.ongoing}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center sm:col-span-1.5">
              <span className="text-[11px] font-medium text-risk-medium uppercase tracking-wider mb-1">Delayed</span>
              <span className="text-2xl font-semibold text-risk-medium tnum">{stats.delayed}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center sm:col-span-1.5 bg-risk-high-soft/10">
              <span className="text-[11px] font-bold text-risk-high uppercase tracking-wider mb-1">Requiring Attention</span>
              <span className="text-2xl font-bold text-risk-high tnum">{stats.attention}</span>
            </div>
          </div>
          <div className="px-5 py-3 text-[11px] text-muted-foreground bg-surface">
            {stats.attention > 0 ? (
              <span><span className="font-semibold">{stats.attention} projects</span> associated with this MP contain indicators requiring review.</span>
            ) : (
              <span>No projects currently require immediate attention.</span>
            )}
          </div>
        </div>

        {/* Fund Utilization */}
        <div className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-surface px-5 py-3.5">
            <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Fund Utilization
            </h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
            <div className="p-5">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Recommended</span>
              <span className="text-xl font-semibold tnum">{formatCurrency(stats.totalSanctioned)}</span>
            </div>
            <div className="p-5">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Released</span>
              <span className="text-xl font-semibold tnum">{formatCurrency(stats.totalReleased)}</span>
            </div>
            <div className="p-5">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Utilized</span>
              <span className="text-xl font-semibold tnum">{formatCurrency(stats.totalUtilized)}</span>
            </div>
            <div className="p-5 bg-surface/50">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Utilization</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold tnum">{stats.utilPct}%</span>
                <div className="h-2 flex-1 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(100, stats.utilPct)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 text-[11px] text-muted-foreground bg-surface">
            Financial progress across all recommended works.
          </div>
        </div>
      </div>

      {/* Project Activity Tabs */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-surface px-2 pt-2">
          <h2 className="px-3 pb-3 pt-1 text-sm font-semibold text-foreground">Project Activity</h2>
          <div className="flex overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-0">
          <ProjectTable projects={displayProjects} hidePagination={true} />
        </div>
      </div>
    </div>
  );
}
