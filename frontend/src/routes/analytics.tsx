import { createFileRoute } from "@tanstack/react-router";
import { Panel, PanelHeader, PageHeader } from "@/components/ui-kit/primitives";
import { getAnalyticsData } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/DataContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ZAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MPLADS Guardian" },
      { name: "description", content: "Data breakdowns for MPLADS monitoring." },
    ],
  }),
  component: AnalyticsPage,
});

const C = {
  primary: "#1E3A8A",
  grid: "#E2E8F0",
  label: "#64748B",
};

function AnalyticsPage() {
  const { selectedHouse, selectedTerm } = useData();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", selectedHouse, selectedTerm],
    queryFn: () => getAnalyticsData(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground fade-in-up">Loading analytics data...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-12 text-center text-risk-high fade-in-up">
        Unable to load analytics data. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Analytics" subtitle="Project distributions and status breakdowns." />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownChart title="Projects by State" data={data.byState} />
        <BreakdownChart title="Projects by Category" data={data.byCategory} />
        <BreakdownChart title="Projects by Status" data={data.byStatus} />
      </div>
    </div>
  );
}

function BreakdownChart({ title, data }: { title: string; data: { name: string; total: number }[] }) {
  if (!data || data.length === 0) return null;
  
  return (
    <Panel>
      <PanelHeader title={title} />
      <div className="px-4 py-4">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={C.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.label }} axisLine={false} tickLine={false}
              interval={0} angle={-35} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11, fill: C.label }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 5, border: `1px solid ${C.grid}` }} />
            <Bar dataKey="total" fill={C.primary} radius={[3, 3, 0, 0]} name="Total Projects" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
