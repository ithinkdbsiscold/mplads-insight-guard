import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, StatusDot } from "@/components/ui-kit/primitives";
import { getSystemComponents } from "@/services/api";

export const Route = createFileRoute("/system-status")({
  head: () => ({
    meta: [
      { title: "System Status — MPLADS Guardian" },
      { name: "description", content: "Health status of all monitoring platform components." },
    ],
  }),
  component: SystemStatusPage,
});

function SystemStatusPage() {
  const components = getSystemComponents();
  const allOk = components.every((c) => c.status === "Operational");

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="System Status"
        subtitle="Real-time health of platform components."
        meta={
          <StatusDot
            tone={allOk ? "ok" : "warn"}
            label={allOk ? "All Systems Operational" : "Partial Degradation"}
          />
        }
      />

      <Panel>
        <PanelHeader title="Component Status" description={`${components.length} monitored components`} />
        <div className="divide-y divide-border">
          {components.map((c) => {
            const tone = c.status === "Operational" ? "ok" as const : "warn" as const;
            return (
              <div key={c.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{c.name}</p>
                  <p className="text-[12px] text-muted-foreground">{c.detail}</p>
                </div>
                <StatusDot tone={tone} label={c.status} />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="px-4 py-4">
        <p className="text-[12px] text-subtle">
          Uptime data refreshes every 60 seconds. Component health is derived from heartbeat signals and error-rate thresholds.
        </p>
      </Panel>
    </div>
  );
}
