import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader, Panel, PanelHeader, RiskBadge, FilterSelect, StatusPill,
} from "@/components/ui-kit/primitives";
import { listAlerts, getProject, type RiskLevel } from "@/services/api";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Anomaly Alerts — MPLADS Guardian" },
      { name: "description", content: "AI-generated anomaly signals requiring officer review." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const [severity, setSeverity] = useState<RiskLevel | "">("");
  const [showResolved, setShowResolved] = useState(false);

  const all = listAlerts(
    severity ? { severity: severity as RiskLevel } : undefined,
  ).filter((a) => (showResolved ? true : a.status !== "resolved"));

  const open = all.filter((a) => a.status === "open").length;
  const inReview = all.filter((a) => a.status === "in_review").length;

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Anomaly Alerts"
        subtitle="AI-generated anomaly signals requiring officer review."
        meta={
          <span className="text-[12px] text-muted-foreground">
            {open} open · {inReview} in review
          </span>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect label="Severity" value={severity}
          onChange={(v) => setSeverity(v as RiskLevel | "")}
          options={["low","medium","high","critical"].map(r=>({value:r,label:r.charAt(0).toUpperCase()+r.slice(1)}))}
          className="w-[130px]" />
        <label className="flex items-center gap-2 self-end pb-1 text-[12.5px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-border" />
          Show resolved
        </label>
      </div>

      <Panel>
        <PanelHeader title="Alerts" description={`${all.length} alerts matching filters`} />
        <div className="divide-y divide-border">
          {all.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">No alerts match filters.</p>
          )}
          {all.map((a) => {
            const project = getProject(a.projectId);
            return (
              <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">{a.type}</p>
                    <StatusDot status={a.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                    <Link to="/projects/$id" params={{ id: a.projectId }}
                      className="text-primary hover:underline">{a.projectId}</Link>
                    {" · "}{a.projectName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-subtle">
                    {project ? `${project.mpName} · ${project.district}, ${project.state}` : 'Unknown Location'}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-subtle">
                    {a.agent} · {a.detectedLabel}
                  </p>
                </div>
                <RiskBadge level={a.severity} />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function StatusDot({ status }: { status: "open" | "in_review" | "resolved" }) {
  const styles = {
    open: "bg-risk-critical",
    in_review: "bg-risk-medium",
    resolved: "bg-risk-low",
  };
  const labels = { open: "Open", in_review: "In Review", resolved: "Resolved" };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${styles[status]}`} />
      {labels[status]}
    </span>
  );
}
