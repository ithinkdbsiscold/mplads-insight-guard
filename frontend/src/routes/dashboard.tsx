import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { cr } from "@/lib/format";
import {
  Panel,
  PanelHeader,
  FilterSelect,
  ProgressBar,
} from "@/components/ui-kit/primitives";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/services/api";
import { useData } from "@/lib/DataContext";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MPLADS Guardian" },
      { name: "description", content: "Real-time monitoring dashboard for MPLADS projects across India." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { selectedHouse, selectedTerm } = useData();

  const [stateFilter, setStateFilter] = useState("");
  const [mpFilter, setMpFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", selectedHouse, selectedTerm, stateFilter, mpFilter],
    queryFn: () => getDashboardSummary(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null, {
      state: stateFilter,
      mpId: mpFilter,
    }),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard data...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center text-risk-high">
        Unable to load MPLADS data. Please try again later.
      </div>
    );
  }

  const { kpis, state_overview, expenditure_trend, top_mps, payment_status, top_vendors, recent_activity, filterOpts } = data;

  return (
    <div className="space-y-6 fade-in-up">
      {/* -------- Context Header -------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[3px] border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">House</span>
            <span className="font-semibold text-foreground">{selectedHouse}</span>
          </div>
          {selectedHouse === "Lok Sabha" && (
            <div className="flex items-center gap-2 border-l border-border pl-6">
              <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">Term</span>
              <span className="font-semibold text-foreground">{selectedTerm}th</span>
            </div>
          )}
          <div className="flex items-center gap-2 border-l border-border pl-6">
            <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">State</span>
            <span className="font-semibold text-foreground">{stateFilter || "All"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FilterSelect
            label=""
            value={stateFilter}
            onChange={(v) => { setStateFilter(v); setMpFilter(""); }}
            options={filterOpts.states?.map((s: string) => ({ value: s, label: s })) || []}
            className="w-[180px] m-0"
            placeholder="All States"
          />
        </div>
      </div>

      {/* -------- KPI row -------- */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total MPs" value={kpis.total_mps.toLocaleString()} note="MPs in selected scope" />
        <KpiCard label="Funds Allocated" value={cr(kpis.total_allocated)} note="Total allocated amount" />
        <KpiCard label="Total Expenditure" value={cr(kpis.total_expenditure)} note="Actual expenditure" />
        <KpiCard label="Fund Utilization" value={`${kpis.utilization_pct}%`} note="Expenditure ÷ allocated" />
        
        <KpiCard label="Works Completed" value={kpis.completed_works.toLocaleString()} note="Completed work count" />
        <KpiCard label="Works Remaining" value={kpis.recommended_works.toLocaleString()} note="Recommended but not completed" />
        <KpiCard label="Total Tracked Works" value={kpis.total_works.toLocaleString()} note="Completed + remaining" />
        <KpiCard label="Completion Rate" value={`${kpis.completion_rate_pct}%`} note="Completed ÷ total tracked" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- Fund Utilization Section -------- */}
        <Panel>
          <PanelHeader title="Fund Utilization" />
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Allocated</span>
                <span className="font-medium">{cr(kpis.total_allocated)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Expenditure</span>
                <span className="font-medium">{cr(kpis.total_expenditure)}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium">Utilization</span>
                <span className="text-[14px] font-semibold">{kpis.utilization_pct}%</span>
              </div>
              <ProgressBar value={kpis.utilization_pct} tone="neutral" className="h-2.5" />
            </div>
          </div>
        </Panel>

        {/* -------- Work Progress Section -------- */}
        <Panel>
          <PanelHeader title="Work Progress" />
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{kpis.completed_works.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium">{kpis.recommended_works.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium">Total tracked</span>
                <span className="text-[14px] font-semibold">{kpis.total_works.toLocaleString()}</span>
              </div>
              <ProgressBar value={kpis.completion_rate_pct} tone="neutral" className="h-2.5" />
              <p className="mt-2 text-right text-[11px] text-muted-foreground">{kpis.completion_rate_pct}% completion</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* -------- State Overview -------- */}
      <Panel>
        <PanelHeader title="State Overview" description="Geographic distribution of funds and works" />
        <div className="overflow-x-auto max-h-[320px]">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface sticky top-0 z-10">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">MPs</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Works</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Completed</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Remaining</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Funds</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state_overview?.length > 0 ? state_overview.map((s: any) => (
                <tr 
                  key={s.state} 
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 font-medium text-foreground">{s.state}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{s.mps}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{s.works.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{s.completed.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{s.remaining.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{cr(s.funds)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-foreground tnum">{s.utilization}%</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No state data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- MP Activity -------- */}
        <Panel>
          <PanelHeader title="MP Activity" description="Top MPs by expenditure" />
          <div className="overflow-x-auto h-[320px]">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead className="bg-surface sticky top-0 z-10">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">MP Name</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Expenditure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top_mps?.length > 0 ? top_mps.map((mp: any) => (
                  <tr key={mp.mp_id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link to="/mps/$id" params={{ id: String(mp.mp_id) }} className="hover:underline text-primary">{mp.mp_name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{cr(mp.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No MP data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* -------- Expenditure Over Time -------- */}
        <Panel>
          <PanelHeader title="Expenditure Over Time" description="Monthly spending trends" />
          <div className="p-4 h-[320px] w-full">
            {expenditure_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenditure_trend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    width={75}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => cr(val)}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '4px', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [cr(value), 'Expenditure']}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Area type="monotone" dataKey="amount" stroke="#1E3A8A" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] text-muted-foreground">
                No trend data available.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- Payment Status -------- */}
        <Panel>
          <PanelHeader title="Payment Status" description="Breakdown of expenditure transactions" />
          <div className="p-4 space-y-4">
            {payment_status?.map((ps: any) => (
              <div key={ps.status} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-[13px] font-medium text-foreground">{ps.status}</div>
                  <div className="text-[11px] text-muted-foreground">{ps.count.toLocaleString()} transactions</div>
                </div>
                <div className="text-right">
                  <div className="text-[13.5px] font-semibold">{cr(ps.amount)}</div>
                </div>
              </div>
            ))}
            {(!payment_status || payment_status.length === 0) && (
              <div className="text-center text-[13px] text-muted-foreground py-4">No payment data available.</div>
            )}
          </div>
        </Panel>

        {/* -------- Top Vendors -------- */}
        <Panel>
          <PanelHeader title="Vendor Concentration" description="Top vendors by total expenditure" />
          <div className="overflow-x-auto max-h-[250px]">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead className="bg-surface sticky top-0 z-10">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Vendor Name</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top_vendors?.length > 0 ? top_vendors.map((vendor: any, i: number) => (
                  <tr key={i} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px] truncate" title={vendor.vendor}>
                      {vendor.vendor}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{cr(vendor.amount)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No vendor data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* -------- Recent Work Activity -------- */}
      <Panel>
        <PanelHeader title="Recent Work Activity" description="Latest recommended projects" />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 font-medium text-muted-foreground">Project Description</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">MP</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-center">Status</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent_activity?.length > 0 ? recent_activity.map((work: any) => (
                <tr key={work.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-foreground max-w-[300px] truncate" title={work.project}>{work.project}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <Link to="/mps/$id" params={{ id: String(work.mp_id) }} className="hover:underline text-primary">{work.mp_name}</Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{work.state}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{cr(work.amount)}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">
                    <span className="inline-flex items-center rounded-[2px] border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                      {work.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{work.date}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No recent activity available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* -------- Detection Engine -------- */}
      <Panel className="bg-muted/30 border-dashed">
        <PanelHeader 
          title={<span className="flex items-center gap-2 tracking-[0.1em] text-xs font-bold uppercase text-muted-foreground">Detection Engine</span>}
        />
        <div className="px-4 py-8 grid sm:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="space-y-3">
            <div className="text-[13px] font-medium text-foreground">Status: <span className="text-muted-foreground ml-2 border border-border bg-card px-2 py-0.5 rounded-[2px] text-[11px]">Not yet active</span></div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Data available for analysis: <strong className="text-foreground font-semibold">469,163 records</strong>
            </p>
            <div className="text-[13px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-1">Analysis modules pending:</p>
              <ul className="list-disc pl-5 space-y-0.5 opacity-80">
                <li>Payment patterns</li>
                <li>Expenditure concentration</li>
                <li>Work completion patterns</li>
                <li>Vendor concentration</li>
                <li>Fund utilization</li>
              </ul>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-card border border-border shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col rounded-[3px] border border-border bg-card px-4 py-3.5 shadow-sm">
      <span className="text-[12.5px] font-medium text-muted-foreground tracking-wide">{label}</span>
      <div className="mt-1.5 mb-2">
        <span className="text-[20px] font-semibold tracking-tight text-foreground">
          {value}
        </span>
      </div>
      <p className="mt-auto text-[11.5px] text-muted-foreground font-medium">{note}</p>
    </div>
  );
}
