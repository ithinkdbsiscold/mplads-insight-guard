import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { cr } from "@/lib/format";
import {
  Panel, PanelHeader, PageHeader, StatusPill, MetricRow,
} from "@/components/ui-kit/primitives";
import {
  getProjectDetail,
} from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { User, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project ${params.id} — MPLADS Guardian` },
      { name: "description", content: `Details and expenditures for project ${params.id}.` },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectDetail(id),
  });

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground fade-in-up">Loading project details...</div>;
  }

  if (isError || !data?.project) {
    return (
      <div className="py-20 text-center text-risk-high fade-in-up">
        Project <span className="tnum font-medium text-foreground">{id}</span> not found or could not be loaded.
      </div>
    );
  }

  const { project, expenditures } = data;
  
  const totalExpenditure = expenditures?.reduce((acc: number, curr: any) => acc + (curr.expenditure_amount || 0), 0) || 0;

  return (
    <div className="space-y-6 fade-in-up">
      <PageHeader
        title={project.work_description || "Unknown Project"}
        subtitle={`Work ID: ${project.work_id} · ${project.house}${project.ls_term ? ` (${project.ls_term}th Term)` : ''}`}
        meta={<StatusPill status={project.work_status} />}
      />

      {/* MP Information */}
      {project.mp_id && (
        <div className="rounded-[3px] border border-border bg-card px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">Recommended By</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Link to="/mps/$id" params={{ id: String(project.mp_id) }} className="text-[15px] font-semibold text-foreground hover:underline">
                {project.mp_name}
              </Link>
            </div>
          </div>
          <div className="flex gap-4 md:text-right">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">State</p>
              <p className="text-[13px] font-medium text-foreground">{project.state}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Constituency</p>
              <p className="text-[13px] font-medium text-foreground">{project.constituency || "-"}</p>
            </div>
          </div>
        </div>
      )}

      {/* top row: financials */}
      <Panel>
        <PanelHeader title="Project Details" />
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
          <div className="space-y-1">
            <MetricRow label="Category" value={project.work_category || "-"} />
            <MetricRow label="Implementing Agency" value={project.implementing_agency || "-"} />
            <MetricRow label="Recommendation Date" value={project.recommendation_date || "-"} />
            <MetricRow label="Completion Date" value={project.work_status === 'Completed' ? (project.completion_date || "-") : "Not completed"} />
          </div>
          <div className="space-y-1">
            <MetricRow label="Recommended Amount" value={cr(project.recommended_amount || 0)} />
            <MetricRow label="Final Amount" value={project.work_status === 'Completed' ? cr(project.final_amount || 0) : "Not completed"} />
            <MetricRow label="Total Tracked Expenditure" value={cr(totalExpenditure)} />
            <MetricRow label="Payment Records" value={expenditures?.length || 0} />
          </div>
        </div>
      </Panel>

      {/* agent findings */}
      <Panel className="bg-surface/50 border-dashed">
        <PanelHeader 
          title={<span className="flex items-center gap-2 text-muted-foreground"><ShieldAlert className="h-4 w-4" /> Detection Analysis</span>} 
        />
        <div className="px-4 py-12 text-center text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">Automated detection is not yet active for this project.</p>
          <p className="mt-1 opacity-80 max-w-md mx-auto">This project's financial and implementation data is available in the database, but it has not yet been processed by the anomaly detection module.</p>
        </div>
      </Panel>

      {/* expenditures */}
      <Panel>
        <PanelHeader title="Expenditures / Payments" description={expenditures?.length ? `${expenditures.length} payment records found associated with this Work ID` : 'No expenditure records found'} />
        {expenditures && expenditures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left bg-surface">
                  <th className="px-4 py-2.5 text-muted-foreground font-medium">Date</th>
                  <th className="px-4 py-2.5 text-muted-foreground font-medium">Vendor</th>
                  <th className="px-4 py-2.5 text-muted-foreground font-medium">Implementing Agency</th>
                  <th className="px-4 py-2.5 text-muted-foreground font-medium text-center">Status</th>
                  <th className="px-4 py-2.5 text-muted-foreground font-medium text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {expenditures.map((e: any, i: number) => (
                  <tr key={e.expenditure_id} className={cn("border-b border-border transition-colors hover:bg-accent/50", i % 2 === 0 ? "bg-card" : "bg-background")}>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.expenditure_date || "-"}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate" title={e.vendor}>{e.vendor || "-"}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate" title={e.implementing_agency}>{e.implementing_agency || "-"}</td>
                    <td className="px-4 py-2.5 text-center text-foreground">
                      <span className="inline-flex items-center rounded-[2px] border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                        {e.payment_status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tnum text-foreground font-medium">
                      {cr(e.expenditure_amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">
            No expenditure records are explicitly linked to this project's Work ID in the source data.
          </div>
        )}
      </Panel>
    </div>
  );
}

