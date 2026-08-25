import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { lakh, pct, financialProgress } from "@/lib/format";
import {
  Panel, PanelHeader, PageHeader, Button, RiskBadge, RiskScore,
  StatusPill, ProgressBar, MetricRow, riskMeta,
} from "@/components/ui-kit/primitives";
import {
  getProject, getAgentFindings, getRiskContributors, getTimeline,
  type AgentFinding, type RiskContributor, type TimelineEvent,
} from "@/services/api";
import {
  AlertTriangle, CheckCircle, Clock, Eye, ExternalLink, FileText,
} from "lucide-react";

export const Route = createFileRoute("/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — MPLADS Guardian` },
      { name: "description", content: `Risk summary and AI findings for project ${params.id}.` },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const project = getProject(id);

  if (!project) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Project <span className="tnum font-medium text-foreground">{id}</span> not found.
      </div>
    );
  }

  const findings = getAgentFindings(id);
  const contributors = getRiskContributors(id);
  const timeline = getTimeline(id);
  const fp = financialProgress(project.utilizedLakh, project.sanctionedLakh);

  return (
    <div className="space-y-6 fade-in-up">
      <PageHeader
        title={project.name}
        subtitle={`${project.id} · ${project.district}, ${project.state} · ${project.constituency}`}
        meta={<StatusPill status={project.status} />}
        actions={
          <div className="flex gap-2">
            <Button variant="default"><FileText className="h-3.5 w-3.5" /> Export Report</Button>
            <Button variant="primary"><Eye className="h-3.5 w-3.5" /> Mark Reviewed</Button>
          </div>
        }
      />

      {/* top row: risk summary + financials */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <PanelHeader title="Risk Summary" />
          <div className="space-y-4 px-4 py-4">
            <div className="flex items-center gap-3">
              <RiskScore score={project.riskScore} level={project.riskLevel} />
              <RiskBadge level={project.riskLevel} />
            </div>
            <div className="space-y-1">
              {contributors.map((c) => (
                <ContributorRow key={c.label} {...c} total={project.riskScore} />
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Financial & Physical Overview" />
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div className="space-y-1">
              <MetricRow label="Sanctioned" value={lakh(project.sanctionedLakh)} />
              <MetricRow label="Released" value={lakh(project.releasedLakh)} />
              <MetricRow label="Utilised" value={lakh(project.utilizedLakh)} />
              <MetricRow label="Financial Progress" value={pct(fp)} />
            </div>
            <div className="space-y-3">
              <div>
                <p className="label-meta mb-1">Physical Progress</p>
                <div className="flex items-center gap-2">
                  <ProgressBar value={project.physicalProgress} tone={project.riskLevel === "critical" ? "critical" : project.riskLevel === "high" ? "high" : "neutral"} className="flex-1" />
                  <span className="tnum text-[13px] font-semibold">{pct(project.physicalProgress)}</span>
                </div>
              </div>
              {Math.abs(fp - project.physicalProgress) > 20 && (
                <div className="rounded-md border border-risk-high/20 bg-risk-high-soft px-3 py-2 text-[12px] text-risk-high">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                  Financial–physical mismatch of {Math.abs(fp - project.physicalProgress)} percentage points detected.
                </div>
              )}
              <MetricRow label="Implementing Agency" value={project.agency} />
              <MetricRow label="Category" value={project.category} />
              <MetricRow label="Delay" value={project.delayMonths > 0 ? `${project.delayMonths} months` : "On schedule"} />
            </div>
          </div>
        </Panel>
      </div>

      {/* timeline */}
      <Panel>
        <PanelHeader title="Project Timeline" />
        <div className="px-4 py-4">
          <ol className="relative border-l-2 border-border pl-6 space-y-5">
            {timeline.map((t, i) => (
              <TimelineItem key={i} {...t} />
            ))}
          </ol>
        </div>
      </Panel>

      {/* agent findings */}
      <Panel>
        <PanelHeader title="Multi-Agent Findings" description="Automated analysis from specialised detection agents" />
        <div className="divide-y divide-border">
          {findings.map((f, i) => (
            <FindingRow key={i} {...f} />
          ))}
        </div>
      </Panel>

      {/* recommended steps */}
      <Panel>
        <PanelHeader title="Recommended Steps" />
        <div className="space-y-2 px-4 py-4">
          {[
            "Request updated field photographs and progress measurement from implementing agency.",
            "Conduct independent site inspection to verify reported physical progress.",
            "Cross-verify payment vouchers against regional rate benchmarks.",
            "Review proximity to similar sanctioned works for potential overlap.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2 text-[12.5px]">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{i + 1}</span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-3">
            <Button variant="primary"><CheckCircle className="h-3.5 w-3.5" /> Initiate Review</Button>
            <Button variant="default"><ExternalLink className="h-3.5 w-3.5" /> Escalate</Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ContributorRow({ label, points, total }: RiskContributor & { total: number }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="tnum font-medium text-foreground">{points} pts</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(points / total) * 100}%` }} />
      </div>
    </div>
  );
}

function TimelineItem({ label, date, note, state }: TimelineEvent) {
  const dots: Record<string, string> = {
    done: "bg-risk-low", current: "bg-primary", late: "bg-risk-critical", pending: "bg-muted",
  };
  return (
    <li className="relative">
      <span className={cn("absolute -left-[31px] top-0.5 h-3 w-3 rounded-full border-2 border-card", dots[state])} />
      <p className="text-[13px] font-medium text-foreground">{label}</p>
      <p className="text-[12px] text-muted-foreground">{date}</p>
      {note && <p className="text-[11.5px] text-subtle">{note}</p>}
    </li>
  );
}

function FindingRow({ agent, finding, severity, evidence, status }: AgentFinding) {
  const m = riskMeta[severity];
  return (
    <div className="px-4 py-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-foreground">{agent}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{finding}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RiskBadge level={severity} />
          <span className={cn("text-[11px] font-medium", status === "Escalated" ? "text-risk-critical" : "text-muted-foreground")}>{status}</span>
        </div>
      </div>
      {evidence.length > 0 && (
        <ul className="space-y-0.5 pl-3 border-l-2 border-border">
          {evidence.map((e, i) => (
            <li key={i} className="text-[11.5px] text-subtle">{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
