import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, StatusDot } from "@/components/ui-kit/primitives";
import { getDataSources } from "@/services/api";
import { RefreshCw } from "lucide-react";

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
  const sources = getDataSources();

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Data Sources" subtitle="Connected data pipelines feeding the monitoring platform." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => {
          const tone = s.status === "Connected" ? "ok" : s.status === "Partial" ? "warn" : "warn";
          return (
            <Panel key={s.name} className="px-4 py-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[13.5px] font-semibold text-foreground">{s.name}</h3>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{s.description}</p>
                </div>
                <StatusDot tone={tone} label={s.status} />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-subtle">
                <span>{s.records}</span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  {s.lastUpdated}
                </span>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
