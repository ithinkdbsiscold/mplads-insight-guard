import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  FilterSelect,
  TextField,
} from "@/components/ui-kit/primitives";
import { ProjectTable, Pagination } from "@/components/shared/ProjectTable";
import {
  listProjects,
  getFilterOptions,
  type RiskLevel,
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
  const opts = getFilterOptions();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [mpId, setMpId] = useState("");
  const [constituency, setConstituency] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("");
  const [agency, setAgency] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "">("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [page, setPage] = useState(1);

  const result = listProjects({
    search: search || undefined,
    state: state || undefined,
    mpId: mpId || undefined,
    constituency: constituency || undefined,
    district: district || undefined,
    category: category || undefined,
    agency: agency || undefined,
    risk: risk || undefined,
    status: status || undefined,
    sort: "riskScore",
    direction: "desc",
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-5 fade-in-up">
      <PageHeader title="Projects" subtitle="Browse all monitored MPLADS projects." />
      <div className="flex flex-wrap items-end gap-3">
        <TextField label="Search" placeholder="ID, name…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-[180px]" />
        <FilterSelect label="State" value={state}
          onChange={(v) => { setState(v); setMpId(""); setConstituency(""); setDistrict(""); setPage(1); }}
          options={opts.states.map((s) => ({ value: s, label: s }))} className="w-[150px]" />
        <FilterSelect label="MP" value={mpId}
          onChange={(v) => { setMpId(v); setPage(1); }}
          options={opts.mps.filter(m => !state || m.state === state).map((m) => ({ value: m.id, label: m.name }))} className="w-[180px]" />
        <FilterSelect label="Constituency" value={constituency}
          onChange={(v) => { setConstituency(v); setPage(1); }}
          options={opts.constituencies.map((c) => ({ value: c, label: c }))} className="w-[160px]" />
        <FilterSelect label="District" value={district}
          onChange={(v) => { setDistrict(v); setPage(1); }}
          options={opts.districts.map((d) => ({ value: d, label: d }))} className="w-[150px]" />
        <FilterSelect label="Category" value={category}
          onChange={(v) => { setCategory(v); setPage(1); }}
          options={opts.categories.map((c) => ({ value: c, label: c }))} className="w-[150px]" />
        <FilterSelect label="Agency" value={agency}
          onChange={(v) => { setAgency(v); setPage(1); }}
          options={opts.agencies.map((a) => ({ value: a, label: a }))} className="w-[150px]" />
        <FilterSelect label="Priority Level" value={risk}
          onChange={(v) => { setRisk(v as RiskLevel | ""); setPage(1); }}
          options={["low","medium","high","critical"].map(r=>({value:r,label:r.charAt(0).toUpperCase()+r.slice(1)}))}
          className="w-[120px]" />
        <FilterSelect label="Status" value={status}
          onChange={(v) => { setStatus(v as ProjectStatus | ""); setPage(1); }}
          options={["completed","ongoing","delayed","pending"].map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}
          className="w-[120px]" />
      </div>
      <section className="rounded-md border border-border bg-card">
        <ProjectTable rows={result.rows} />
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPageChange={setPage} />
      </section>
    </div>
  );
}
