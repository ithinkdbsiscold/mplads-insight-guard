import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader } from "@/components/ui-kit/primitives";
import { getAnalyticsData } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/DataContext";

export const Route = createFileRoute("/regional-insights")({
  head: () => ({
    meta: [
      { title: "Regional Insights — MPLADS Guardian" },
      { name: "description", content: "Data-driven regional comparisons of MPLADS project activity and indicators." },
    ],
  }),
  component: RegionalInsightsPage,
});

function RegionalInsightsPage() {
  const { selectedHouse, selectedTerm } = useData();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", selectedHouse, selectedTerm],
    queryFn: () => getAnalyticsData(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground fade-in-up">Loading regional insights...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-8 text-center text-risk-high fade-in-up">
        Unable to load regional insights data. Please try again later.
      </div>
    );
  }

  const { byState } = data;

  const sortedStates = [...byState].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Regional Insights"
        subtitle="State-level comparisons of MPLADS project activity."
      />

      <Panel>
        <PanelHeader title="State Performance" description="Comparative overview across states based on available project data." />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedStates.length > 0 ? (
                sortedStates.map((row: any) => (
                  <tr key={row.name} className="group transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tnum">{row.total.toLocaleString("en-IN")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                    No state data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
