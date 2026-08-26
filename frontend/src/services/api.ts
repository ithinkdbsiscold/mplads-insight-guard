const API_BASE = import.meta.env['VITE_API_BASE_URL'] || "http://localhost:8000/api/v1";

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ProjectStatus = "Recommended" | "Completed";

async function fetcher(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getDashboardSummary(house: string, term: string | null, filters: any = {}) {
  const summary = await fetcher("/dashboard/summary", { house, ls_term: term, ...filters });
  
  return {
    kpis: {
      total_mps: summary.kpis.total_mps,
      total_works: summary.kpis.total_works,
      completed_works: summary.kpis.completed_works,
      recommended_works: summary.kpis.recommended_works,
      completion_rate_pct: summary.kpis.completion_rate_pct,
      total_allocated: summary.kpis.total_allocated,
      total_expenditure: summary.kpis.total_expenditure,
      utilization_pct: summary.kpis.utilization_pct,
    },
    work_categories: summary.work_categories,
    state_overview: summary.state_overview,
    expenditure_trend: summary.expenditure_trend,
    payment_status: summary.payment_status,
    top_vendors: summary.top_vendors,
    top_mps: summary.top_mps,
    recent_activity: summary.recent_activity,
    last_sync: summary.last_sync,
    filterOpts: { states: summary.state_overview.map((s: any) => s.state) }
  };
}

export async function getMpStates(house: string, term: string | null) {
  const data = await fetcher("/mps/states", { house, ls_term: term });
  return data.states;
}

export async function getMpsData(house: string, term: string | null, filters: any = {}) {
  const data = await fetcher("/mps", { 
    house, 
    ls_term: term,
    search: filters.search,
    state: filters.state,
    page: filters.page || 1,
    page_size: filters.pageSize || 20
  });

  return {
    rows: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.page_size,
    totalPages: data.pages,
  };
}

export async function getMpDetail(id: string, house?: string, term?: string | null) {
  const data = await fetcher(`/mps/${id}`, { house, ls_term: term });
  return data;
}

export async function getProjectsData(house: string, term: string | null, filters: any = {}) {
  const data = await fetcher("/projects", { 
    house, 
    ls_term: term,
    search: filters.search,
    state: filters.state,
    category: filters.category,
    status: filters.status,
    page: filters.page || 1,
    page_size: filters.pageSize || 20
  });
  
  return {
    result: {
      rows: data.items,
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
    },
    filterOpts: { states: [], categories: [] }
  };
}

export async function getProjectDetail(id: string) {
  const project = await fetcher(`/projects/${id}`);
  const analysis = await fetcher(`/projects/${id}/analysis`);
  const exps = await fetcher(`/projects/${id}/expenditures`);
  
  return {
    project,
    findings: analysis.findings,
    expenditures: exps.expenditures,
    contributors: [], // Not supported yet
    timeline: [], // Not supported yet
  };
}

export async function getAnalyticsData(house: string, term: string | null) {
  const data = await fetcher("/analytics", { house, ls_term: term });
  return {
    byState: data.by_state.map((s: any) => ({ name: s.state, total: s.total, highRisk: 0 })),
    byCategory: data.by_category.map((c: any) => ({ name: c.category, total: c.total, highRisk: 0 })),
    byStatus: data.by_status.map((s: any) => ({ name: s.status, total: s.total })),
    byPaymentStatus: data.by_payment_status,
    avgDelayByCategory: [],
    financialVsPhysical: [],
    concentrations: [],
  };
}

export async function getAlertsData(house: string, term: string | null, filters: any = {}) {
  const data = await fetcher("/alerts", { house, ls_term: term, ...filters });
  return data.items;
}
