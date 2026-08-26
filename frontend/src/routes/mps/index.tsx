import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui-kit/primitives";
import { useQuery } from "@tanstack/react-query";
import { getMpsData, getMpStates } from "@/services/api";
import { useData } from "@/lib/DataContext";
import { cr } from "@/lib/format";
import { Pagination } from "@/components/shared/ProjectTable";

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
  const { selectedHouse, selectedTerm } = useData();
  
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // Reset page on search change
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedHouse, selectedTerm, stateFilter]);

  const { data: statesData } = useQuery({
    queryKey: ["mpStates", selectedHouse, selectedTerm],
    queryFn: () => getMpStates(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["mps", selectedHouse, selectedTerm, search, stateFilter, page],
    queryFn: () => getMpsData(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null, {
      search,
      state: stateFilter,
      page,
      pageSize,
    }),
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  });

  const mps = data?.rows || [];
  const uniqueStates = statesData || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader
        title="Members of Parliament"
        subtitle="Search and monitor MPLADS works associated with Members of Parliament."
      />

      {/* Filters */}
      <div className="rounded-[4px] border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              placeholder="Search MP by name, constituency or state"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-[4px] border border-border bg-surface pl-9 text-sm placeholder:text-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
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
              className="h-8 min-w-[140px] rounded-[4px] border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="">All States</option>
              {uniqueStates.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* MP Table */}
      <div className="rounded-[4px] border border-border bg-card overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-surface">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">MP Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">House</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">State</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Constituency / Area</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Rec. Works</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Completed</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Comp. Rate</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Allocated</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Expenditure</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-border transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
              {isLoading && !isPlaceholderData ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span>Loading MPs...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-risk-high">
                    Unable to load Members of Parliament data. Please try again later.
                  </td>
                </tr>
              ) : mps.length > 0 ? (
                mps.map((mp: any) => (
                  <tr 
                    key={mp.mp_id} 
                    onClick={() => navigate({ to: `/mps/${mp.mp_id}` })}
                    className="group cursor-pointer transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3.5 font-medium text-foreground group-hover:text-primary transition-colors">{mp.name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{mp.house}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{mp.state}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{mp.constituency || "-"}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tnum">{mp.stats?.works_recommended || 0}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tnum">{mp.stats?.works_completed || 0}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tnum">{mp.stats?.completion_rate_pct || 0}%</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tnum">{mp.stats?.allocated_amount !== null ? cr(mp.stats?.allocated_amount) : '-'}</td>
                    <td className="px-4 py-3.5 text-right text-foreground font-medium tnum">{cr(mp.stats?.total_expenditure || 0)}</td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground tnum">{mp.stats?.utilization_pct === null ? 'N/A' : `${mp.stats?.utilization_pct}%`}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No Members of Parliament found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {total > 0 && (
          <Pagination 
            page={page} 
            pageSize={pageSize} 
            total={total} 
            onPageChange={setPage} 
          />
        )}
      </div>
    </div>
  );
}
