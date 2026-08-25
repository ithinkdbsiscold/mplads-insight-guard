/**
 * API service layer.
 *
 * Every read used by the UI goes through this module. Today it resolves
 * against local synthetic datasets; replacing each function body with a
 * `fetch(`${API_BASE_URL}/...`)` call is sufficient to move the app onto
 * the FastAPI backend without touching component code.
 */

import {
  agentFindingsByProject,
  alerts,
  dataSources,
  projects,
  riskContributorsByProject,
  riskTrend,
  systemComponents,
  timelineByProject,
  type Alert,
  type AgentFinding,
  type Project,
  type ProjectStatus,
  type RiskContributor,
  type RiskLevel,
  type TimelineEvent,
} from "@/lib/mock/data";

export const API_BASE_URL = "/api/v1";

export type {
  Alert,
  AgentFinding,
  Project,
  ProjectStatus,
  RiskContributor,
  RiskLevel,
  TimelineEvent,
};

export interface ProjectQuery {
  search?: string;
  state?: string;
  district?: string;
  constituency?: string;
  category?: string;
  agency?: string;
  risk?: RiskLevel | "";
  status?: ProjectStatus | "";
  sort?: keyof Project;
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

function matches(p: Project, q: ProjectQuery) {
  const s = q.search?.trim().toLowerCase();
  if (s && !`${p.id} ${p.name} ${p.district} ${p.state}`.toLowerCase().includes(s)) return false;
  if (q.state && p.state !== q.state) return false;
  if (q.district && p.district !== q.district) return false;
  if (q.constituency && p.constituency !== q.constituency) return false;
  if (q.category && p.category !== q.category) return false;
  if (q.agency && p.agency !== q.agency) return false;
  if (q.risk && p.riskLevel !== q.risk) return false;
  if (q.status && p.status !== q.status) return false;
  return true;
}

export function listProjects(q: ProjectQuery = {}): Paged<Project> {
  const filtered = projects.filter((p) => matches(p, q));
  const sort = q.sort ?? "riskScore";
  const dir = q.direction ?? "desc";
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 12;
  return {
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageSize,
  };
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getAgentFindings(id: string): AgentFinding[] {
  return agentFindingsByProject[id] ?? agentFindingsByProject["MPL-1842"];
}

export function getRiskContributors(id: string): RiskContributor[] {
  return riskContributorsByProject[id] ?? riskContributorsByProject["MPL-1842"];
}

export function getTimeline(id: string): TimelineEvent[] {
  return timelineByProject[id] ?? timelineByProject["MPL-1842"];
}

export function listAlerts(filter?: { severity?: RiskLevel; resolved?: boolean }): Alert[] {
  return alerts.filter((a) => {
    if (filter?.severity && a.severity !== filter.severity) return false;
    if (filter?.resolved !== undefined) {
      const resolved = a.status === "resolved";
      if (filter.resolved !== resolved) return false;
    }
    return true;
  });
}

export function getFilterOptions() {
  const uniq = (values: string[]) => Array.from(new Set(values)).sort();
  return {
    states: uniq(projects.map((p) => p.state)),
    districts: uniq(projects.map((p) => p.district)),
    constituencies: uniq(projects.map((p) => p.constituency)),
    categories: uniq(projects.map((p) => p.category)),
    agencies: uniq(projects.map((p) => p.agency)),
  };
}

export function getOverviewKpis() {
  return [
    {
      label: "Total Projects",
      value: "24,582",
      delta: "+312 from previous period",
      trend: "up" as const,
      note: "Across 10 monitored states",
    },
    {
      label: "Funds Monitored",
      value: "₹1,284 Cr",
      delta: "+2.1% from previous period",
      trend: "up" as const,
      note: "Sanctioned value under review",
    },
    {
      label: "High-Risk Projects",
      value: "1,284",
      delta: "+8.4% from previous period",
      trend: "up" as const,
      note: "Indicators awaiting officer review",
      emphasis: "high" as const,
    },
    {
      label: "Delayed Projects",
      value: "843",
      delta: "-1.6% from previous period",
      trend: "down" as const,
      note: "Beyond sanctioned completion date",
      emphasis: "medium" as const,
    },
  ];
}

export function getRiskDistribution() {
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  projects.forEach((p) => (counts[p.riskLevel] += 1));
  const scale = 24582 / projects.length;
  return (["low", "medium", "high", "critical"] as RiskLevel[]).map((level) => ({
    level,
    label: level[0].toUpperCase() + level.slice(1),
    value: Math.round(counts[level] * scale),
  }));
}

export function getStatusDistribution() {
  const counts: Record<ProjectStatus, number> = {
    completed: 0,
    ongoing: 0,
    delayed: 0,
    pending: 0,
  };
  projects.forEach((p) => (counts[p.status] += 1));
  const scale = 24582 / projects.length;
  return (["completed", "ongoing", "delayed", "pending"] as ProjectStatus[]).map((status) => ({
    status,
    label: status[0].toUpperCase() + status.slice(1),
    value: Math.round(counts[status] * scale),
  }));
}

export function getRiskTrend() {
  return riskTrend;
}

function groupCount(key: (p: Project) => string, limit = 6) {
  const map = new Map<string, { name: string; highRisk: number; total: number }>();
  projects.forEach((p) => {
    const k = key(p);
    const row = map.get(k) ?? { name: k, highRisk: 0, total: 0 };
    row.total += 1;
    if (p.riskLevel === "high" || p.riskLevel === "critical") row.highRisk += 1;
    map.set(k, row);
  });
  return Array.from(map.values())
    .map((r) => ({ ...r, highRisk: Math.round(r.highRisk * 3.4), total: Math.round(r.total * 3.4) }))
    .sort((a, b) => b.highRisk - a.highRisk)
    .slice(0, limit);
}

export function getAnalytics() {
  return {
    byState: groupCount((p) => p.state, 8),
    byDistrict: groupCount((p) => p.district, 8),
    byCategory: groupCount((p) => p.category, 8),
    byAgency: groupCount((p) => p.agency, 6),
    avgDelayByCategory: [
      { name: "Health Infrastructure", months: 7.4 },
      { name: "Road & Connectivity", months: 5.8 },
      { name: "Community Infrastructure", months: 4.9 },
      { name: "Drinking Water", months: 4.1 },
      { name: "Education", months: 3.6 },
      { name: "Sanitation", months: 2.8 },
    ],
    financialVsPhysical: projects.slice(0, 90).map((p) => ({
      financial: Math.round((p.utilizedLakh / p.sanctionedLakh) * 100),
      physical: p.physicalProgress,
      id: p.id,
    })),
    trend: riskTrend,
    concentrations: [
      { scope: "State", name: "Bihar", highRisk: 183 },
      { scope: "District", name: "Patna", highRisk: 42 },
      { scope: "Category", name: "Community Infrastructure", highRisk: 96 },
      { scope: "Agency", name: "PWD (State)", highRisk: 71 },
    ],
  };
}

export function getMapProjects() {
  return projects;
}

export function getDataSources() {
  return dataSources;
}

export function getSystemComponents() {
  return systemComponents;
}
