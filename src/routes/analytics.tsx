import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelHeader, PageHeader } from "@/components/ui-kit/primitives";
import { getAnalytics } from "@/services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ZAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MPLADS Guardian" },
      { name: "description", content: "Risk analytics and data breakdowns for MPLADS monitoring." },
    ],
  }),
  component: AnalyticsPage,
});

const C = {
  primary: "#1E3A8A",
  high: "#EA580C",
  critical: "#DC2626",
  medium: "#CA8A04",
  grid: "#E2E8F0",
  label: "#64748B",
};

function AnalyticsPage() {
  const data = getAnalytics();

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Analytics" subtitle="Risk concentrations, delay patterns and cross-cutting metrics." />

      {/* concentrations */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.concentrations.map((c) => (
          <div key={c.scope} className="rounded-md border border-border bg-card px-4 py-3.5">
            <p className="label-meta">{c.scope} — Highest Risk</p>
            <p className="mt-1 text-[15px] font-semibold text-foreground">{c.name}</p>
            <p className="mt-0.5 tnum text-[12px] text-risk-high font-medium">{c.highRisk} high-risk projects</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownChart title="High-Risk Projects by State" data={data.byState} />
        <BreakdownChart title="High-Risk Projects by Category" data={data.byCategory} />
      </div>

      {/* avg delay */}
      <Panel>
        <PanelHeader title="Average Delay by Category" description="Months behind schedule" />
        <div className="px-4 py-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.avgDelayByCategory} layout="vertical" barCategoryGap="22%">
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} unit=" mo" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} width={140} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 5, border: `1px solid ${C.grid}` }}
                formatter={(v: number) => [`${v} months`, "Avg Delay"]} />
              <Bar dataKey="months" fill={C.high} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* scatter: financial vs physical */}
      <Panel>
        <PanelHeader title="Financial vs Physical Progress" description="Each dot is a project. Dots far from the diagonal indicate mismatch." />
        <div className="px-4 py-4">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={C.grid} />
              <XAxis type="number" dataKey="financial" name="Financial %" domain={[0, 100]}
                tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="number" dataKey="physical" name="Physical %" domain={[0, 100]}
                tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} unit="%" width={40} />
              <ZAxis range={[20, 20]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 5, border: `1px solid ${C.grid}` }}
                formatter={(v: number, name: string) => [`${v}%`, name]} />
              <Scatter data={data.financialVsPhysical} fill={C.primary} fillOpacity={0.45}>
                {data.financialVsPhysical.map((d, i) => (
                  <Cell key={i} fill={Math.abs(d.financial - d.physical) > 30 ? C.critical : C.primary}
                    fillOpacity={Math.abs(d.financial - d.physical) > 30 ? 0.7 : 0.35} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function BreakdownChart({ title, data }: { title: string; data: { name: string; highRisk: number; total: number }[] }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.label }} axisLine={false} tickLine={false}
              interval={0} angle={-20} textAnchor="end" height={45} />
            <YAxis tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} width={36} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 5, border: `1px solid ${C.grid}` }} />
            <Bar dataKey="total" fill={C.primary} radius={[3, 3, 0, 0]} name="Total" opacity={0.25} />
            <Bar dataKey="highRisk" fill={C.critical} radius={[3, 3, 0, 0]} name="High Risk" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
