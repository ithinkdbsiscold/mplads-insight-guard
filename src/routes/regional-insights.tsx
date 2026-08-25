import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, PanelHeader } from "@/components/ui-kit/primitives";
import { getAnalytics, getFilterOptions } from "@/services/api";

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
  const analytics = getAnalytics();
  const options = getFilterOptions();
  
  // Create state performance data using the overview from getAnalytics.byState
  const statePerformance = options.states.map(state => {
    const stateData = analytics.byState.find(s => s.name === state);
    if (!stateData) return null;
    return {
      state,
      projects: stateData.total,
      attention: stateData.highRisk,
      // Synthetic mock numbers based on proportion
      delayed: Math.floor(stateData.total * 0.08),
      utilization: 75 + Math.floor(Math.random() * 20),
    };
  }).filter(Boolean).sort((a: any, b: any) => b.projects - a.projects);

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Regional Insights"
        subtitle="State and district-level comparisons of MPLADS project activity."
      />

      <Panel>
        <PanelHeader title="State Performance" description="Comparative overview across monitored states." />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Projects</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Attention</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Delayed</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statePerformance.map((row: any) => (
                <tr key={row.state} className="group transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{row.state}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tnum">{row.projects}</td>
                  <td className="px-4 py-3 text-right font-medium text-risk-high tnum">{row.attention}</td>
                  <td className="px-4 py-3 text-right text-risk-medium tnum">{row.delayed}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground tnum">{row.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Districts Requiring Attention" description="Top districts by indicator density." />
          <div className="divide-y divide-border">
            {analytics.byDistrict.slice(0, 8).map((d) => (
              <div key={d.name} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span className="font-medium">{d.name}</span>
                <span className="tnum font-medium text-risk-high">{d.highRisk} projects</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Agencies Requiring Attention" description="Top implementing agencies by indicator density." />
          <div className="divide-y divide-border">
            {analytics.byAgency.slice(0, 8).map((a) => (
              <div key={a.name} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span className="font-medium truncate pr-4">{a.name}</span>
                <span className="tnum font-medium text-risk-high whitespace-nowrap">{a.highRisk} projects</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
