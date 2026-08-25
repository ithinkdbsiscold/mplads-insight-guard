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
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-muted-foreground font-medium">Priority</th>
                <th className="px-4 py-2.5 text-muted-foreground font-medium">Project</th>
                <th className="px-4 py-2.5 text-muted-foreground font-medium">MP</th>
                <th className="hidden px-4 py-2.5 text-muted-foreground font-medium lg:table-cell">State</th>
                <th className="hidden px-4 py-2.5 text-muted-foreground font-medium lg:table-cell">District</th>
                <th className="px-4 py-2.5 text-muted-foreground font-medium">Indicator</th>
                <th className="hidden px-4 py-2.5 text-muted-foreground font-medium md:table-cell">Detected</th>
                <th className="px-4 py-2.5 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {all.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                    No alerts match filters.
                  </td>
                </tr>
              )}
              {all.map((a, i) => {
                const project = getProject(a.projectId);
                return (
                  <tr
                    key={a.id}
                    className={`border-b border-border transition-colors hover:bg-accent/50 ${
                      i % 2 === 0 ? "bg-card" : "bg-background"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <RiskBadge level={a.severity} />
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate text-foreground">
                      <div className="flex flex-col">
                        <Link
                          to="/projects/$id"
                          params={{ id: a.projectId }}
                          className="tnum text-primary font-medium hover:underline"
                        >
                          {a.projectId}
                        </Link>
                        <span className="text-[11px] text-muted-foreground truncate">{a.projectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[150px] truncate">
                      {project ? (
                        <Link
                          to="/mps/$id"
                          params={{ id: project.mpId }}
                          className="text-foreground hover:underline hover:text-primary transition-colors"
                        >
                          {project.mpName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">
                      {project?.state || "Unknown"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">
                      {project?.district || "Unknown"}
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate text-foreground">
                      {a.type}
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                      {a.detectedLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusDot status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
