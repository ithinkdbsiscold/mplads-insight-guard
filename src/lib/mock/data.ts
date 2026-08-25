/**
 * Synthetic MPLADS-style datasets.
 * These mirror the shape of the future REST API payloads so that
 * `src/services/api.ts` can be repointed at FastAPI without UI changes.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ProjectStatus = "completed" | "ongoing" | "delayed" | "pending";
export type AgentName =
  | "Financial Agent"
  | "Progress Agent"
  | "Delay Agent"
  | "Duplicate Detection Agent"
  | "Geographic Agent"
  | "Compliance Agent";

export interface MP {
  id: string;
  mpId: string;
  mpName: string;
  name: string;
  house: "Lok Sabha" | "Rajya Sabha";
  memberStatus: "Sitting" | "Former";
  state: string;
  constituency: string;
  memberStartDate: string;
  memberEndDate: string;
}

export interface Project {
  id: string;
  name: string;
  state: string;
  district: string;
  constituency: string;
  category: string;
  agency: string;
  sanctionedLakh: number;
  releasedLakh: number;
  utilizedLakh: number;
  physicalProgress: number;
  riskScore: number;
  riskLevel: RiskLevel;
  status: ProjectStatus;
  sanctionedOn: string;
  expectedCompletion: string;
  lat: number;
  lng: number;
  delayMonths: number;
}

export interface Alert {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  agent: AgentName;
  severity: RiskLevel;
  detectedAt: string;
  detectedLabel: string;
  status: "open" | "in_review" | "resolved";
}

export interface AgentFinding {
  agent: AgentName;
  finding: string;
  severity: RiskLevel;
  evidence: string[];
  status: "Requires Review" | "Monitoring" | "No Indicator" | "Escalated";
}

export interface RiskContributor {
  label: string;
  points: number;
}

export interface TimelineEvent {
  label: string;
  date: string;
  note?: string;
  state: "done" | "current" | "late" | "pending";
}

const STATES = [
  "Bihar",
  "Uttar Pradesh",
  "Maharashtra",
  "Madhya Pradesh",
  "Rajasthan",
  "West Bengal",
  "Karnataka",
  "Tamil Nadu",
  "Delhi",
  "Odisha",
];

const DISTRICTS: Record<string, string[]> = {
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Varanasi", "Gorakhpur"],
  Maharashtra: ["Pune", "Nagpur", "Nashik", "Thane"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Rewa"],
  Rajasthan: ["Jaipur", "Jodhpur", "Kota", "Ajmer"],
  "West Bengal": ["Howrah", "Nadia", "Purba Medinipur", "Darjeeling"],
  Karnataka: ["Bengaluru Rural", "Belagavi", "Mysuru", "Kalaburagi"],
  "Tamil Nadu": ["Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Delhi: ["North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  Odisha: ["Cuttack", "Khordha", "Ganjam", "Sambalpur"],
};

const CONSTITUENCIES: Record<string, string> = {
  Patna: "Patna Sahib",
  Gaya: "Gaya",
  Muzaffarpur: "Muzaffarpur",
  Bhagalpur: "Bhagalpur",
  Lucknow: "Lucknow",
  "Kanpur Nagar": "Kanpur",
  Varanasi: "Varanasi",
  Gorakhpur: "Gorakhpur",
  Pune: "Pune",
  Nagpur: "Nagpur",
  Nashik: "Nashik",
  Thane: "Thane",
  Bhopal: "Bhopal",
  Indore: "Indore",
  Jabalpur: "Jabalpur",
  Rewa: "Rewa",
  Jaipur: "Jaipur",
  Jodhpur: "Jodhpur",
  Kota: "Kota-Bundi",
  Ajmer: "Ajmer",
  Howrah: "Howrah",
  Nadia: "Ranaghat",
  "Purba Medinipur": "Tamluk",
  Darjeeling: "Darjeeling",
  "Bengaluru Rural": "Bangalore Rural",
  Belagavi: "Belgaum",
  Mysuru: "Mysore",
  Kalaburagi: "Gulbarga",
  Coimbatore: "Coimbatore",
  Madurai: "Madurai",
  Salem: "Salem",
  Tiruchirappalli: "Tiruchirappalli",
  "North Delhi": "North West Delhi",
  "South Delhi": "South Delhi",
  "West Delhi": "West Delhi",
  "East Delhi": "East Delhi",
  Cuttack: "Cuttack",
  Khordha: "Bhubaneswar",
  Ganjam: "Berhampur",
  Sambalpur: "Sambalpur",
};

const CATEGORIES = [
  "Health Infrastructure",
  "Road & Connectivity",
  "Community Infrastructure",
  "Education",
  "Drinking Water",
  "Sanitation",
  "Electrification",
  "Sports Facilities",
];

const AGENCIES = [
  "PWD (State)",
  "Rural Works Department",
  "Municipal Corporation",
  "Zilla Parishad",
  "Public Health Engineering",
  "District Rural Dev. Agency",
];

const NAMES = [
  "Construction of Community Health Centre",
  "Rural Road Improvement",
  "Construction of Community Hall",
  "Upgradation of Primary School Building",
  "Installation of Solar Street Lights",
  "Construction of Anganwadi Centre",
  "Deep Boring Drinking Water Facility",
  "Construction of Public Toilet Block",
  "Sports Ground Development",
  "Bus Stand Shelter Construction",
  "Cremation Ground Boundary Wall",
  "Library Building Construction",
  "Drainage Line Construction",
  "Additional Classroom Construction",
  "Panchayat Bhawan Renovation",
];

const STATE_COORDS: Record<string, [number, number]> = {
  Bihar: [25.6, 85.3],
  "Uttar Pradesh": [26.9, 80.9],
  Maharashtra: [18.9, 74.2],
  "Madhya Pradesh": [23.3, 77.4],
  Rajasthan: [26.9, 75.8],
  "West Bengal": [22.9, 88.2],
  Karnataka: [13.2, 77.3],
  "Tamil Nadu": [11.0, 78.0],
  Delhi: [28.66, 77.2],
  Odisha: [20.5, 85.1],
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}


export const mps: MP[] = [];
for (const state of STATES) {
  const districts = DISTRICTS[state] || [];
  for (const dist of districts) {
    mps.push({
      id: `MP-${mps.length + 1}`,
      name: `Shri ${dist} MP`,
      house: "Lok Sabha",
      memberStatus: "Sitting",
      state: state,
      constituency: CONSTITUENCIES[dist] || dist,
      memberStartDate: "2019-05-23",
      memberEndDate: "2024-05-23"
    });
  }
}
// Add some Rajya Sabha MPs
for (const state of STATES) {
  mps.push({
    id: `MP-${mps.length + 1}`,
    name: `Smt. ${state} RS Member`,
    house: "Rajya Sabha",
    memberStatus: "Sitting",
    state: state,
    constituency: state, // Rajya Sabha represents the state
    memberStartDate: "2020-04-03",
    memberEndDate: "2026-04-02"
  });
}

function buildProjects(): Project[] {
  const rnd = seeded(42);
  const out: Project[] = [];

  // Three canonical records referenced across the product.
  out.push({
    id: "MPL-1842",
    name: "Construction of Community Health Centre",
    state: "Bihar",
    district: "Patna",
    constituency: "Patna Sahib",
    category: "Health Infrastructure",
    agency: "PWD (State)",
    sanctionedLakh: 25,
    releasedLakh: 24.2,
    utilizedLakh: 23.5,
    physicalProgress: 38,
    riskScore: 92,
    riskLevel: "critical",
    status: "delayed",
    sanctionedOn: "2024-03-14",
    expectedCompletion: "2025-09-30",
    lat: 25.61,
    lng: 85.14,
    delayMonths: 6,
  });
  out.push({
    id: "MPL-5821",
    name: "Rural Road Improvement",
    state: "Uttar Pradesh",
    district: "Lucknow",
    constituency: "Lucknow",
    category: "Road & Connectivity",
    agency: "Rural Works Department",
    sanctionedLakh: 18,
    releasedLakh: 16.5,
    utilizedLakh: 14.2,
    physicalProgress: 72,
    riskScore: 78,
    riskLevel: "high",
    status: "ongoing",
    sanctionedOn: "2024-07-02",
    expectedCompletion: "2026-01-15",
    lat: 26.85,
    lng: 80.95,
    delayMonths: 2,
  });
  out.push({
    id: "MPL-2391",
    name: "Construction of Community Hall",
    state: "Delhi",
    district: "North Delhi",
    constituency: "North West Delhi",
    category: "Community Infrastructure",
    agency: "Municipal Corporation",
    sanctionedLakh: 12,
    releasedLakh: 11.4,
    utilizedLakh: 5.4,
    physicalProgress: 95,
    riskScore: 24,
    riskLevel: "low",
    status: "ongoing",
    sanctionedOn: "2025-01-20",
    expectedCompletion: "2026-03-31",
    lat: 28.71,
    lng: 77.13,
    delayMonths: 0,
  });

  for (let i = 0; i < 137; i++) {
    const state = STATES[Math.floor(rnd() * STATES.length)]!;
    const districts = DISTRICTS[state]!;
    const district = districts[Math.floor(rnd() * districts.length)]!;
    const sanctioned = Math.round((5 + rnd() * 40) * 10) / 10;
    const releasedRatio = 0.55 + rnd() * 0.45;
    const released = Math.round(sanctioned * releasedRatio * 10) / 10;
    const utilized = Math.round(released * (0.5 + rnd() * 0.5) * 10) / 10;
    const financial = (utilized / sanctioned) * 100;
    const gap = rnd();
    const physical =
      gap > 0.72
        ? Math.max(4, Math.round(financial - (25 + rnd() * 45)))
        : Math.max(2, Math.min(100, Math.round(financial + (rnd() * 20 - 8))));
    const mismatch = Math.max(0, financial - physical);
    const delayMonths = rnd() > 0.6 ? Math.round(rnd() * 11) : 0;
    const score = Math.max(
      6,
      Math.min(
        98,
        Math.round(mismatch * 0.85 + delayMonths * 3.2 + rnd() * 22 + (rnd() > 0.85 ? 14 : 0)),
      ),
    );
    const level = riskLevelFromScore(score);
    const status: ProjectStatus =
      physical >= 99
        ? "completed"
        : delayMonths >= 3
          ? "delayed"
          : physical <= 5
            ? "pending"
            : "ongoing";
    const base = STATE_COORDS[state]!;
    const [lat, lng] = base;
    const constituency = CONSTITUENCIES[district] ?? district;
    const possibleMps = mps.filter(m => m.state === state && (m.constituency === constituency || m.house === "Rajya Sabha"));
    const mp = possibleMps[Math.floor(rnd() * possibleMps.length)] || mps[0];


    out.push({
      id: `MPL-${(1000 + Math.floor(rnd() * 8900)).toString()}`,
      mpId: mp.id,
      mpName: mp.name,
      name: NAMES[Math.floor(rnd() * NAMES.length)]!,
      state,
      district,
      constituency: CONSTITUENCIES[district] ?? district,
      category: CATEGORIES[Math.floor(rnd() * CATEGORIES.length)]!,
      agency: AGENCIES[Math.floor(rnd() * AGENCIES.length)]!,
      sanctionedLakh: sanctioned,
      releasedLakh: released,
      utilizedLakh: utilized,
      physicalProgress: physical,
      riskScore: score,
      riskLevel: level,
      status,
      sanctionedOn: `202${3 + Math.floor(rnd() * 3)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`,
      expectedCompletion: `202${5 + Math.floor(rnd() * 2)}-0${1 + Math.floor(rnd() * 9)}-2${Math.floor(rnd() * 8)}`,
      lat: Math.round((lat + (rnd() - 0.5) * 2.4) * 100) / 100,
      lng: Math.round((lng + (rnd() - 0.5) * 2.4) * 100) / 100,
      delayMonths,
    });
  }

  // De-duplicate generated ids
  const seen = new Set<string>();
  return out.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export const projects: Project[] = buildProjects();

export const alerts: Alert[] = [
  {
    id: "ALT-9001",
    projectId: "MPL-1842",
    projectName: "Construction of Community Health Centre",
    type: "Financial / Physical Progress Mismatch",
    agent: "Progress Agent",
    severity: "critical",
    detectedAt: "2026-08-25T10:30:00Z",
    detectedLabel: "12 minutes ago",
    status: "open",
  },
  {
    id: "ALT-9002",
    projectId: "MPL-5821",
    projectName: "Rural Road Improvement",
    type: "Unusual Expenditure Pattern",
    agent: "Financial Agent",
    severity: "high",
    detectedAt: "2026-08-25T10:05:00Z",
    detectedLabel: "37 minutes ago",
    status: "open",
  },
  {
    id: "ALT-9003",
    projectId: "MPL-2391",
    projectName: "Construction of Community Hall",
    type: "Possible Duplicate Work",
    agent: "Duplicate Detection Agent",
    severity: "medium",
    detectedAt: "2026-08-25T09:42:00Z",
    detectedLabel: "1 hour ago",
    status: "in_review",
  },
  {
    id: "ALT-9004",
    projectId: "MPL-4417",
    projectName: "Deep Boring Drinking Water Facility",
    type: "Extended Schedule Overrun",
    agent: "Delay Agent",
    severity: "high",
    detectedAt: "2026-08-25T07:10:00Z",
    detectedLabel: "3 hours ago",
    status: "open",
  },
  {
    id: "ALT-9005",
    projectId: "MPL-7734",
    projectName: "Installation of Solar Street Lights",
    type: "Coordinates Outside Sanctioned Constituency",
    agent: "Geographic Agent",
    severity: "medium",
    detectedAt: "2026-08-25T05:55:00Z",
    detectedLabel: "5 hours ago",
    status: "in_review",
  },
  {
    id: "ALT-9006",
    projectId: "MPL-3120",
    projectName: "Additional Classroom Construction",
    type: "Missing Utilisation Certificate",
    agent: "Compliance Agent",
    severity: "medium",
    detectedAt: "2026-08-24T18:20:00Z",
    detectedLabel: "Yesterday",
    status: "open",
  },
  {
    id: "ALT-9007",
    projectId: "MPL-6605",
    projectName: "Construction of Public Toilet Block",
    type: "Rate Above Regional Benchmark",
    agent: "Financial Agent",
    severity: "low",
    detectedAt: "2026-08-24T12:00:00Z",
    detectedLabel: "Yesterday",
    status: "resolved",
  },
  {
    id: "ALT-9008",
    projectId: "MPL-2288",
    projectName: "Drainage Line Construction",
    type: "Progress Reported Without Field Photograph",
    agent: "Compliance Agent",
    severity: "low",
    detectedAt: "2026-08-23T09:00:00Z",
    detectedLabel: "2 days ago",
    status: "resolved",
  },
  {
    id: "ALT-9009",
    projectId: "MPL-8842",
    projectName: "Panchayat Bhawan Renovation",
    type: "Near-identical Work Description Nearby",
    agent: "Duplicate Detection Agent",
    severity: "high",
    detectedAt: "2026-08-23T06:15:00Z",
    detectedLabel: "2 days ago",
    status: "in_review",
  },
  {
    id: "ALT-9010",
    projectId: "MPL-1509",
    projectName: "Construction of Anganwadi Centre",
    type: "Fund Release Without Progress Update",
    agent: "Progress Agent",
    severity: "critical",
    detectedAt: "2026-08-22T14:45:00Z",
    detectedLabel: "3 days ago",
    status: "open",
  },
];

export const agentFindingsByProject: Record<string, AgentFinding[]> = {
  "MPL-1842": [
    {
      agent: "Financial Agent",
      finding:
        "Project expenditure is approximately 38% above the regional benchmark for comparable health infrastructure works.",
      severity: "high",
      evidence: [
        "₹23.5 L utilised of ₹25.0 L sanctioned",
        "Regional benchmark for comparable CHC works: ₹17.0 L",
        "Two payment tranches released within 11 days",
      ],
      status: "Requires Review",
    },
    {
      agent: "Progress Agent",
      finding: "Financial progress significantly exceeds reported physical progress.",
      severity: "critical",
      evidence: [
        "Financial progress: 94%",
        "Physical progress: 38%",
        "Last field-verified progress update: 4 months ago",
      ],
      status: "Escalated",
    },
    {
      agent: "Delay Agent",
      finding:
        "Work is approximately 6 months behind the sanctioned completion schedule with no revised timeline recorded.",
      severity: "high",
      evidence: [
        "Expected completion: 30 Sep 2025",
        "No extension approval on record",
        "Progress velocity fell 71% after Feb 2025",
      ],
      status: "Requires Review",
    },
    {
      agent: "Duplicate Detection Agent",
      finding:
        "Work description shows 84% textual similarity with a separate sanctioned work located 1.9 km away.",
      severity: "medium",
      evidence: ["Comparable record: MPL-1877, Patna", "Same implementing agency and sanction year"],
      status: "Requires Review",
    },
    {
      agent: "Geographic Agent",
      finding:
        "Reported site coordinates fall 3.2 km outside the ward boundary recorded in the sanction order.",
      severity: "medium",
      evidence: ["Sanctioned ward: Patna Ward 22", "Reported coordinates: 25.61 N, 85.14 E"],
      status: "Monitoring",
    },
    {
      agent: "Compliance Agent",
      finding:
        "Utilisation certificate for the second tranche is on record; third-party inspection report is not attached.",
      severity: "low",
      evidence: ["UC-2 filed 12 Jan 2026", "Third-party inspection: not uploaded"],
      status: "Monitoring",
    },
  ],
};

export const riskContributorsByProject: Record<string, RiskContributor[]> = {
  "MPL-1842": [
    { label: "Progress mismatch", points: 30 },
    { label: "Financial anomaly", points: 20 },
    { label: "Delay indicator", points: 20 },
    { label: "Duplicate similarity", points: 12 },
    { label: "Geographic anomaly", points: 10 },
  ],
};

export const timelineByProject: Record<string, TimelineEvent[]> = {
  "MPL-1842": [
    { label: "Project sanctioned", date: "14 Mar 2024", state: "done" },
    { label: "Funds released (Tranche 1)", date: "02 May 2024", state: "done" },
    { label: "Work started", date: "27 Jun 2024", state: "done" },
    {
      label: "Progress updates",
      date: "Last update 18 Apr 2026",
      note: "38% physical progress reported",
      state: "current",
    },
    {
      label: "Expected completion",
      date: "30 Sep 2025",
      note: "6 months behind expected schedule",
      state: "late",
    },
    { label: "Current status", date: "Delayed — under monitoring", state: "pending" },
  ],
};

export const riskTrend = [
  { month: "Sep", critical: 34, high: 88, medium: 142 },
  { month: "Oct", critical: 41, high: 96, medium: 151 },
  { month: "Nov", critical: 38, high: 104, medium: 147 },
  { month: "Dec", critical: 52, high: 118, medium: 162 },
  { month: "Jan", critical: 49, high: 126, medium: 158 },
  { month: "Feb", critical: 57, high: 131, medium: 171 },
  { month: "Mar", critical: 63, high: 142, medium: 168 },
  { month: "Apr", critical: 58, high: 137, medium: 176 },
  { month: "May", critical: 66, high: 149, medium: 181 },
  { month: "Jun", critical: 71, high: 158, medium: 174 },
  { month: "Jul", critical: 68, high: 164, medium: 189 },
  { month: "Aug", critical: 74, high: 171, medium: 193 },
];

export const dataSources = [
  {
    name: "MPLADS Project Data",
    description: "Sanction orders, work descriptions and constituency mapping.",
    lastUpdated: "25 Aug 2026, 09:10",
    records: "24,582 records",
    status: "Connected" as const,
  },
  {
    name: "Financial Records",
    description: "Release tranches, utilisation certificates and payment vouchers.",
    lastUpdated: "25 Aug 2026, 08:45",
    records: "118,904 records",
    status: "Connected" as const,
  },
  {
    name: "Progress Reports",
    description: "Monthly physical progress declarations from implementing agencies.",
    lastUpdated: "24 Aug 2026, 21:30",
    records: "76,331 records",
    status: "Delayed sync" as const,
  },
  {
    name: "Geographic Data",
    description: "Work-site coordinates, ward and constituency boundaries.",
    lastUpdated: "25 Aug 2026, 06:00",
    records: "24,110 records",
    status: "Connected" as const,
  },
  {
    name: "Inspection Records",
    description: "Third-party and district-level field inspection findings.",
    lastUpdated: "19 Aug 2026, 17:20",
    records: "8,247 records",
    status: "Partial" as const,
  },
];

export const systemComponents = [
  { name: "Data Pipeline", detail: "Ingestion + normalisation", status: "Operational" as const },
  { name: "Risk Detection Engine", detail: "Scoring orchestrator", status: "Operational" as const },
  { name: "Financial Agent", detail: "Benchmark & expenditure", status: "Operational" as const },
  { name: "Progress Agent", detail: "Physical vs financial", status: "Operational" as const },
  { name: "Delay Agent", detail: "Schedule variance", status: "Operational" as const },
  { name: "Duplicate Detection", detail: "Textual + spatial match", status: "Operational" as const },
  { name: "Geographic Agent", detail: "Boundary validation", status: "Degraded" as const },
  { name: "Compliance Agent", detail: "Document completeness", status: "Operational" as const },
  { name: "Database", detail: "PostgreSQL primary", status: "Operational" as const },
];
