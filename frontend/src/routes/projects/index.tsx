import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  FilterSelect,
  TextField,
} from "@/components/ui-kit/primitives";
import { ProjectTable, Pagination } from "@/components/shared/ProjectTable";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/lib/DataContext";
import {
  getProjectsData,
  type ProjectStatus,
} from "@/services/api";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — MPLADS Guardian" },
      { name: "description", content: "Browse and filter all monitored MPLADS projects." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { selectedHouse, selectedTerm } = useData();

  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "projects",
      selectedHouse,
      selectedTerm,
      search,
      state,
      category,
      status,
      page,
    ],
    queryFn: () => getProjectsData(selectedHouse, selectedHouse === "Lok Sabha" ? selectedTerm : null, {
      search,
      state,
      category,
      status,
      page,
      pageSize: 15,
    }),
  });

  const opts = data?.filterOpts || { states: [] as string[], categories: [] as string[] };
  const result = data?.result || { rows: [], total: 0, page: 1, pageSize: 15 };

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Projects" subtitle="Browse all monitored MPLADS projects." />
      <div className="flex flex-wrap items-end gap-3">
        <TextField label="Search" placeholder="ID, name…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-[180px]" />
        <FilterSelect label="State" value={state}
          onChange={(v) => { setState(v); setPage(1); }}
          options={opts.states.map((s) => ({ value: s, label: s }))} className="w-[150px]" />
        <FilterSelect label="Category" value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          options={opts.categories.map((c) => ({ value: c, label: c }))} className="w-[150px]" />
        <FilterSelect label="Status" value={status}
          onChange={(v) => { setStatus(v as ProjectStatus | ""); setPage(1); }}
          options={["Recommended","Completed"].map(s=>({value:s,label:s}))}
          className="w-[120px]" />
      </div>
      <section className="rounded-md border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading projects...</div>
        ) : isError ? (
          <div className="p-8 text-center text-risk-high">Unable to load MPLADS data. Please try again later.</div>
        ) : (
          <>
            <ProjectTable rows={result.rows} />
            <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
