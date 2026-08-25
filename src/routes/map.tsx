import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader, RiskBadge } from "@/components/ui-kit/primitives";
import { getMapProjects, type RiskLevel } from "@/services/api";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Geographic Map — MPLADS Guardian" },
      { name: "description", content: "Geographic distribution of MPLADS projects and risk hotspots." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const projects = getMapProjects();
  const highRisk = projects.filter((p) => p.riskLevel === "high" || p.riskLevel === "critical");

  const stateGroups = new Map<string, { total: number; highRisk: number }>();
  projects.forEach((p) => {
    const g = stateGroups.get(p.state) ?? { total: 0, highRisk: 0 };
    g.total++;
    if (p.riskLevel === "high" || p.riskLevel === "critical") g.highRisk++;
    stateGroups.set(p.state, g);
  });

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Geographic Map"
        subtitle="Spatial distribution of projects and risk hotspots across monitored states."
      />

      {/* placeholder map area */}
      <Panel>
        <PanelHeader title="Project Locations" description="Interactive map integration pending — showing tabular geographic data" />
        <div className="relative grid place-items-center bg-surface/50 px-4 py-16">
          <div className="text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-[13px] font-medium text-muted-foreground">
              Map integration will render here
            </p>
            <p className="mt-1 text-[12px] text-subtle">
              Leaflet / Mapbox layer with {projects.length} project markers across {stateGroups.size} states
            </p>
          </div>
        </div>
      </Panel>

      {/* state breakdown */}
      <Panel>
        <PanelHeader title="State-wise Distribution" />
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Total Projects</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">High/Critical Risk</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">% High Risk</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(stateGroups.entries())
                .sort((a, b) => b[1].highRisk - a[1].highRisk)
                .map(([state, g]) => (
                  <tr key={state} className="border-b border-border hover:bg-accent/40">
                    <td className="px-4 py-2.5 font-medium text-foreground">{state}</td>
                    <td className="px-4 py-2.5 tnum text-right text-foreground">{g.total}</td>
                    <td className="px-4 py-2.5 tnum text-right text-risk-high font-medium">{g.highRisk}</td>
                    <td className="px-4 py-2.5 tnum text-right text-muted-foreground">
                      {g.total > 0 ? Math.round((g.highRisk / g.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* high-risk project pins */}
      <Panel>
        <PanelHeader title="High-Risk Project Locations" description={`${highRisk.length} projects at high or critical risk`} />
        <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
          {highRisk.slice(0, 20).map((p) => (
            <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <Link to="/projects/$id" params={{ id: p.id }}
                  className="text-[12.5px] font-medium text-primary hover:underline">{p.id}</Link>
                <span className="text-[12px] text-muted-foreground"> · {p.name} · {p.district}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum text-[11px] text-subtle">{p.lat}°N, {p.lng}°E</span>
                <RiskBadge level={p.riskLevel} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
