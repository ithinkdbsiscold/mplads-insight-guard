import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, User, Activity, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { getMpDetail, type ProjectStatus } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { ProjectTable } from "@/components/shared/ProjectTable";
import { cr } from "@/lib/format";

export const Route = createFileRoute("/mps/$id")({
  component: MpProfilePage,
});

function MpProfilePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProjectStatus | "all">("all");
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mp", id],
    queryFn: () => getMpDetail(id),
  });

  if (isLoading) {
    return <div className="py-12 text-center fade-in-up text-muted-foreground">Loading MP data...</div>;
  }

  if (isError || !data?.mp) {
    return (
      <div className="py-12 text-center fade-in-up">
        <h2 className="text-xl font-semibold heading-serif">Member of Parliament not found</h2>
        <p className="mt-2 text-muted-foreground">The requested record could not be located or failed to load.</p>
        <button 
          onClick={() => router.history.back()}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const { mp, stats, projects } = data;
  
  const displayProjects = activeTab === "all" ? projects : projects.filter((p: any) => p.work_status === activeTab);

  const tabs = [
    { id: "all", label: "All Works" },
    { id: "Completed", label: "Completed" },
    { id: "Recommended", label: "Recommended" },
  ] as const;

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
          {mp.memberStatus ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px]">
              <span className="font-medium text-muted-foreground">Member Status:</span>
              <span className="font-semibold text-foreground">{mp.memberStatus}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* MPLADS Activity */}
        <div className="rounded-[3px] border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border bg-surface px-5 py-3.5">
            <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Work Progress
            </h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border flex-1">
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Recommended / Outstanding</span>
              <span className="text-2xl font-semibold tnum">{stats?.works_recommended || 0}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Completed Works</span>
              <span className="text-2xl font-semibold tnum">{stats?.works_completed || 0}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Tracked Works</span>
              <span className="text-2xl font-semibold text-foreground tnum">{stats?.total_works || 0}</span>
            </div>
            <div className="p-4 flex flex-col justify-center items-center text-center bg-surface/50">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Completion Rate</span>
              <span className="text-2xl font-semibold text-foreground tnum">{stats?.completion_rate_pct || 0}%</span>
            </div>
          </div>
        </div>

        {/* Fund Utilization */}
        <div className="rounded-[3px] border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-surface px-5 py-3.5">
            <h2 className="text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Financial Overview
            </h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border">
            <div className="p-5">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Allocated</span>
              <span className="text-xl font-semibold tnum">{stats?.allocated_amount !== null ? cr(stats?.allocated_amount) : "Not available"}</span>
            </div>
            <div className="p-5">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Expenditure</span>
              <span className="text-xl font-semibold tnum">{cr(stats?.total_expenditure)}</span>
            </div>
            <div className="p-5 bg-surface/50 col-span-2">
              <span className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Fund Utilization Rate</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold tnum">{stats?.utilization_pct === null ? 'Not available' : `${stats?.utilization_pct}%`}</span>
                {stats?.utilization_pct !== null && (
                  <div className="h-2 flex-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-foreground rounded-full" style={{ width: `${Math.min(100, stats?.utilization_pct || 0)}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-5 py-3 text-[11px] text-muted-foreground bg-surface flex flex-wrap justify-between gap-4">
            <span>Recommended Value: {cr(stats?.recommended_project_value)}</span>
            <span>Completed Value: {cr(stats?.completed_project_value)}</span>
          </div>
        </div>
      </div>

      {/* Project Activity Tabs */}
      <div className="rounded-[3px] border border-border bg-card shadow-sm">
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
          <ProjectTable rows={displayProjects} showDistrict={false} showMp={false} />
        </div>
      </div>
    </div>
  );
}
