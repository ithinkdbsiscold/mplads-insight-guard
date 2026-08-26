import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, StatusDot } from "@/components/ui-kit/primitives";
import { getDashboardSummary } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/DataContext";
import { RefreshCw, Database } from "lucide-react";

export const Route = createFileRoute("/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — MPLADS Guardian" },
      { name: "description", content: "Connected data pipelines and ingestion status." },
    ],
  }),
  component: DataSourcesPage,
});

function DataSourcesPage() {
  const { selectedHouse, selectedTerm } = useData();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-data-sources", selectedHouse, selectedTerm],
    queryFn: () => getDashboardSummary(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null, {}),
  });

  const totalWorks = data?.kpis?.total_works || "Loading...";

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Data Sources" subtitle="Connected data pipelines feeding the monitoring platform." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Panel className="px-4 py-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-foreground">eSAKSHI Database</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Primary MPLADS records</p>
              </div>
            </div>
            <StatusDot tone="ok" label="Connected" />
          </div>
          <div className="flex items-center justify-between text-[11.5px] text-subtle pt-2 border-t border-border">
            <span>{totalWorks} Works Indexed</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Live
            </span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
