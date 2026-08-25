import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Panel,
  PanelHeader,
  FilterSelect,
  RiskBadge,
} from "@/components/ui-kit/primitives";
import { ProjectTable } from "@/components/shared/ProjectTable";
import {
  getOverviewKpis,
  getRiskDistribution,
  getStatusDistribution,
  listProjects,
  listAlerts,
  getFilterOptions,
  getAnalytics,
  listMps,
  getMpStats,
  type RiskLevel,
} from "@/services/api";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MPLADS Guardian" },
      { name: "description", content: "Real-time monitoring dashboard for MPLADS projects across India." },
    ],
  }),
  component: OverviewPage,
});

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#16A34A",
  medium: "#CA8A04",
  high: "#EA580C",
  critical: "#DC2626",
};

const STATUS_COLORS = [
  "#16A34A",
  "#64748B",
  "#EA580C",
  "#94A3B8",
];

function OverviewPage() {
  const kpis = getOverviewKpis();
  const riskDist = getRiskDistribution();
  const statusDist = getStatusDistribution();
  const trend = getRiskTrend();
  const filterOpts = getFilterOptions();

  const [stateFilter, setStateFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "">("");

  const attentionProjects = listProjects({
    risk: riskFilter || undefined,
    state: stateFilter || undefined,
    sort: "riskScore",
    direction: "desc",
    pageSize: 6,
  });
  const recentAlerts = listAlerts().slice(0, 5);
  
  const analytics = getAnalytics();
  const topMps = listMps().rows
    .map(mp => ({ ...mp, stats: getMpStats(mp.id) }))
    .sort((a, b) => b.stats.total - a.stats.total)
    .slice(0, 5);

  return (
    <div className="space-y-6 fade-in-up">
      {/* -------- filters -------- */}
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="State"
          value={stateFilter}
          onChange={setStateFilter}
          options={filterOpts.states.map((s) => ({ value: s, label: s }))}
          className="w-[160px]"
        />
        <FilterSelect
          label="Priority Level"
          value={riskFilter}
          onChange={(v) => setRiskFilter(v as RiskLevel | "")}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
          className="w-[140px]"
        />
      </div>

      {/* -------- KPI cards -------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <KpiCard key={i} {...k} />
        ))}
      </div>

      {/* -------- charts row -------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* risk distribution */}
        <Panel>
          <PanelHeader title="Anomaly Distribution" description="Projects by priority level" />
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={riskDist} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 5,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                  }}
                  formatter={(value: number) => [value.toLocaleString("en-IN"), "Projects"]}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {riskDist.map((d) => (
                    <Cell
                      key={d.level}
                      fill={RISK_COLORS[d.level as RiskLevel]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Projects Requiring Attention by State */}
        <Panel>
          <PanelHeader title="Requiring Attention by State" description="Top states by indicator density" />
          <div className="px-4 py-4">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={analytics.byState.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748B" }} width={80} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ fontSize: 12, borderRadius: 5, border: "1px solid #E2E8F0" }}
                />
                <Bar dataKey="highRisk" fill={RISK_COLORS.high} radius={[0, 2, 2, 0]} barSize={16}>
                  {analytics.byState.slice(0, 5).map((d, i) => (
                    <Cell key={i} fill={RISK_COLORS.high} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* -------- MP Activity -------- */}
        <Panel>
          <PanelHeader title="Members of Parliament" description="Most active by project count" />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] whitespace-nowrap">
              <thead className="bg-surface">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">MP Name</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Projects</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Completed</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Attention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topMps.map((mp) => (
                  <tr key={mp.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link to={`/mps/${mp.id}`} className="hover:underline">{mp.name}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{mp.stats.total}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tnum">{mp.stats.completed}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-risk-high tnum">{mp.stats.attention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* -------- risk trend -------- */}
      <Panel>
        <PanelHeader
          title="Anomaly Trend"
          description="12-month priority trend"
          actions={
            <span className="flex items-center gap-1 text-[11.5px] font-medium text-risk-high">
              <TrendingUp className="h-3.5 w-3.5" />
              +12.8%
            </span>
          }
        />
        <div className="px-4 py-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RISK_COLORS.critical} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={RISK_COLORS.critical} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RISK_COLORS.high} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={RISK_COLORS.high} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RISK_COLORS.medium} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={RISK_COLORS.medium} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 5,
                  border: "1px solid #E2E8F0",
                }}
              />
              <Area
                type="monotone"
                dataKey="medium"
                stroke={RISK_COLORS.medium}
                fill="url(#gradMedium)"
                strokeWidth={1.5}
                name="Medium"
              />
              <Area
                type="monotone"
                dataKey="high"
                stroke={RISK_COLORS.high}
                fill="url(#gradHigh)"
                strokeWidth={1.5}
                name="High"
              />
              <Area
                type="monotone"
                dataKey="critical"
                stroke={RISK_COLORS.critical}
                fill="url(#gradCritical)"
                strokeWidth={1.5}
                name="Critical"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      </div>

      {/* -------- attention table -------- */}
      <Panel>
        <PanelHeader
          title="Projects Requiring Attention"
          description="Highest priority projects based on current filters"
        />
        <ProjectTable rows={attentionProjects.rows} compact />
      </Panel>

      {/* -------- recent alerts -------- */}
      <Panel>
        <PanelHeader title="Anomaly Alerts" description="Latest AI-generated anomaly signals" />
        <div className="divide-y divide-border">
          {recentAlerts.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-foreground">
                  {a.type}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {a.projectName} · {a.agent} · {a.detectedLabel}
                </p>
              </div>
              <RiskBadge level={a.severity} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* -------- KPI card -------- */

function KpiCard({
  label,
  value,
  delta,
  trend,
  note,
  emphasis,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  note: string;
  emphasis?: "high" | "medium";
}) {
  const borderAccent = emphasis === "high"
    ? "border-l-risk-high"
    : emphasis === "medium"
      ? "border-l-risk-medium"
      : "border-l-border";

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card px-4 py-3.5 border-l-[3px]",
        borderAccent,
      )}
    >
      <p className="label-meta">{label}</p>
      <p className="mt-1.5 text-[22px] font-semibold tracking-tight tnum text-foreground">
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-1 text-[11.5px]">
        {trend === "up" ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-risk-high" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5 text-risk-low" />
        )}
        <span className="text-muted-foreground">{delta}</span>
      </div>
      <p className="mt-1 text-[11px] text-subtle">{note}</p>
    </div>
  );
}
