import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Users, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/primitives";
import { listMps, getMpStats } from "@/services/api";

export const Route = createFileRoute("/mps/")({
  head: () => ({
    meta: [
      { title: "Members of Parliament — MPLADS Guardian" },
      { name: "description", content: "Search and monitor MPLADS works associated with Members of Parliament." },
    ],
  }),
  component: MpsPage,
});

function MpsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [houseFilter, setHouseFilter] = useState<"Lok Sabha" | "Rajya Sabha" | "">("");
  const [statusFilter, setStatusFilter] = useState<"Sitting" | "Former" | "">("");

  const { rows: mps } = listMps({
    search,
    state: stateFilter,
    house: houseFilter,
    memberStatus: statusFilter,
  });

  const mpData = useMemo(() => {
    return mps.map(mp => {
      const stats = getMpStats(mp.id);
      return { ...mp, stats };
    }).sort((a, b) => b.stats.attention - a.stats.attention);
  }, [mps]);

  const uniqueStates = Array.from(new Set(mps.map(m => m.state))).sort();

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Members of Parliament"
        subtitle="Search and monitor MPLADS works associated with Members of Parliament."
      />

      {/* Filters */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              placeholder="Search MP by name, constituency or state"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface pl-9 text-sm placeholder:text-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="h-8 rounded-[4px] border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:border-border-strong"
            >
              <option value="">All States</option>
              {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value as any)}
              className="h-8 rounded-[4px] border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:border-border-strong"
            >
              <option value="">All Houses</option>
              <option value="Lok Sabha">Lok Sabha</option>
              <option value="Rajya Sabha">Rajya Sabha</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8 rounded-[4px] border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:border-border-strong"
            >
              <option value="">All Statuses</option>
              <option value="Sitting">Sitting</option>
              <option value="Former">Former</option>
            </select>
          </div>
        </div>
      </div>

      {/* MP Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">MP Name</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">House</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Constituency / Area</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Projects</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Completed</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Ongoing</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Delayed</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">Requiring Attention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mpData.length > 0 ? (
                mpData.map((mp) => (
                  <tr 
                    key={mp.id} 
                    onClick={() => navigate({ to: `/mps/${mp.id}` })}
                    className="group cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{mp.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mp.house}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mp.state}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mp.constituency}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tnum">{mp.stats.total}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tnum">{mp.stats.completed}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tnum">{mp.stats.ongoing}</td>
                    <td className="px-4 py-3 text-right font-medium text-risk-medium tnum">{mp.stats.delayed}</td>
                    <td className="px-4 py-3 text-right font-medium text-risk-high tnum">{mp.stats.attention}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No Members of Parliament found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
