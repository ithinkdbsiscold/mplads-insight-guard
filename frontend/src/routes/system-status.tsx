import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, StatusDot } from "@/components/ui-kit/primitives";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/system-status")({
  head: () => ({
    meta: [
      { title: "System Status — MPLADS Guardian" },
      { name: "description", content: "Health status of all monitoring platform components." },
    ],
  }),
  component: SystemStatusPage,
});

async function checkHealth() {
  const url = import.meta.env['VITE_API_BASE_URL'] || "http://localhost:8000";
  const res = await fetch(`${url}/api/v1/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

function SystemStatusPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["system-health"],
    queryFn: checkHealth,
  });

  const allOk = !isError && data?.status === "ok";

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="System Status"
        subtitle="Real-time health of platform components."
        meta={
          <StatusDot
            tone={allOk ? "ok" : "warn"}
            label={isLoading ? "Checking..." : (allOk ? "All Systems Operational" : "Service Disruption")}
          />
        }
      />

      <Panel>
        <PanelHeader title="Component Status" description="API and Database health" />
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">FastAPI Backend</p>
              <p className="text-[12px] text-muted-foreground">{data?.timestamp || "Awaiting status..."}</p>
            </div>
            <StatusDot tone={allOk ? "ok" : "warn"} label={allOk ? "Operational" : "Degraded"} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
