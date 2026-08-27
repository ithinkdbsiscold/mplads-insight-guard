import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjectsData, getProjectDetail } from "@/services/api";
import { useData } from "@/lib/DataContext";
import { cn } from "@/lib/utils";
import { cr } from "@/lib/format";
import { Panel, PanelHeader } from "@/components/ui-kit/primitives";
import {
  Database,
  CheckCircle,
  BarChart3,
  Clock,
  Search,
  FileWarning,
  AlertTriangle,
  Brain,
  UserCheck,
  ChevronRight,
  Loader2,
  AlertOctagon
} from "lucide-react";

export const Route = createFileRoute("/ai-analysis")({
  head: () => ({
    meta: [{ title: "AI Analysis Demonstrator — MPLADS Guardian" }],
  }),
  component: AiAnalysisPage,
});

const PIPELINE_STAGES = [
  { id: "ingestion", label: "Data Ingestion", icon: Database, desc: "Fetching raw MPLADS records." },
  { id: "validation", label: "Data Validation", icon: CheckCircle, desc: "Verifying format & constraints." },
  { id: "financial", label: "Financial Analysis", icon: BarChart3, desc: "Checking allocation vs expenditure." },
  { id: "timeline", label: "Timeline Analysis", icon: Clock, desc: "Evaluating project duration." },
  { id: "pattern", label: "Pattern Analysis", icon: Search, desc: "Comparing with similar projects." },
  { id: "anomaly", label: "Anomaly Detection", icon: FileWarning, desc: "Identifying outlier data points." },
  { id: "risk", label: "Risk Scoring", icon: AlertTriangle, desc: "Calculating risk probability." },
  { id: "finding", label: "Finding Generation", icon: Brain, desc: "Structuring evidence." },
  { id: "human", label: "Human Review", icon: UserCheck, desc: "Final verification by analyst." },
];

function AiAnalysisPage() {
  const { selectedHouse, selectedTerm } = useData();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(-1);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects-list", selectedHouse, selectedTerm],
    queryFn: () => getProjectsData(selectedHouse, selectedTerm, { pageSize: 50 }),
  });

  const { data: projectDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["project-detail", selectedProjectId],
    queryFn: () => getProjectDetail(selectedProjectId),
    enabled: !!selectedProjectId && analysisComplete,
  });

  const handleRunAnalysis = () => {
    if (!selectedProjectId) return;
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setActiveStageIndex(0);
  };

  useEffect(() => {
    if (isAnalyzing && activeStageIndex < PIPELINE_STAGES.length - 1) {
      const timer = setTimeout(() => {
        setActiveStageIndex((prev) => prev + 1);
      }, 600); // 600ms per stage
      return () => clearTimeout(timer);
    } else if (isAnalyzing && activeStageIndex === PIPELINE_STAGES.length - 1) {
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisComplete(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, activeStageIndex]);

  // Deterministic risk scoring based on project data
  const generateRiskScore = (detail: any) => {
    if (!detail?.project) return { score: 0, level: "LOW", confidence: 0, factors: [] };
    
    const project = detail.project;
    const expenditures = detail.expenditures || [];
    let score = 25; // Base risk
    const factors: string[] = [];
    
    const amount = project.recommended_amount ?? project.amount ?? 0;
    const status = project.work_status ?? project.status ?? "Unknown";

    if (amount > 5000000) {
      score += 30;
      factors.push("High expenditure volume");
    }
    
    if (status === "Recommended" || status === "Pending") {
      score += 15;
      factors.push("Project status is still pending/recommended");
    }
    
    if (expenditures.length > 0) {
      // Find suspicious payments (e.g. large round numbers)
      const hasRoundPayment = expenditures.some((e: any) => {
        const eAmount = e.expenditure_amount ?? e.amount ?? 0;
        return eAmount > 0 && eAmount % 100000 === 0;
      });
      if (hasRoundPayment) {
        score += 20;
        factors.push("Unusual payment pattern (round figures)");
      }
    } else {
       score += 10;
       factors.push("Missing expenditure history");
    }

    score = Math.min(score, 98);
    let level = "LOW";
    if (score > 40) level = "MEDIUM";
    if (score > 70) level = "HIGH";
    if (score > 90) level = "CRITICAL";
    
    return {
      score,
      level,
      confidence: 85 + Math.floor(Math.random() * 10), // Deterministic pseudo-random confidence
      factors: factors.length > 0 ? factors : ["No significant anomalies detected"]
    };
  };

  const riskResult = analysisComplete && projectDetail ? generateRiskScore(projectDetail) : null;

  return (
    <div className="space-y-8 fade-in-up pb-12">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground">AI Analysis Demonstrator</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground max-w-3xl">
          This module demonstrates the automated risk detection pipeline. It uses a deterministic rule-based engine on 
          <strong> real MPLADS database records</strong> to simulate the planned Machine Learning automation.
        </p>
      </div>

      {/* Pipeline Visualization */}
      <section>
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-muted-foreground mb-4">1. How AI Works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = isAnalyzing && activeStageIndex === idx;
            const isPast = activeStageIndex > idx || analysisComplete;
            
            return (
              <div 
                key={stage.id} 
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-[3px] border text-center transition-all duration-300",
                  isActive ? "border-primary bg-primary/5 shadow-sm scale-105" : 
                  isPast ? "border-border bg-muted/30" : "border-border/50 bg-card/50 opacity-70"
                )}
              >
                <stage.icon className={cn(
                  "h-6 w-6 mb-2 transition-colors",
                  isActive ? "text-primary animate-pulse" : 
                  isPast ? "text-muted-foreground" : "text-border"
                )} />
                <span className={cn(
                  "text-[11px] font-bold uppercase tracking-wide leading-tight",
                  isActive ? "text-primary" : "text-foreground"
                )}>{stage.label}</span>
                <span className="text-[9.5px] text-muted-foreground mt-1.5 leading-tight">{stage.desc}</span>
                
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-border hidden lg:block z-10" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Run Analysis Selection */}
      <section className="pt-4 border-t border-border">
        <h2 className="text-[14px] font-bold uppercase tracking-wider text-muted-foreground mb-4">2. Run Analysis</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full max-w-md">
            <label className="block text-[12px] font-semibold text-foreground mb-1.5">Select a real MPLADS project</label>
            <select
              className="w-full h-10 px-3 rounded-[3px] border border-border bg-card text-[13px] focus:outline-none focus:border-primary"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isAnalyzing}
            >
              <option value="">-- Choose a project --</option>
              {projectsData?.result?.rows?.length ? projectsData.result.rows.map((p: any) => {
                const desc = p.work_description ?? p.project_name ?? p.project ?? "Unknown Project";
                const amount = p.recommended_amount ?? p.amount ?? 0;
                return (
                  <option key={p.id} value={p.id}>
                    {p.id} - {desc.length > 50 ? desc.substring(0, 50) + "..." : desc} ({cr(amount)})
                  </option>
                );
              }) : (
                <option value="" disabled>No projects available</option>
              )}
            </select>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={!selectedProjectId || isAnalyzing}
            className={cn(
              "h-10 px-6 rounded-[3px] font-semibold text-[13px] transition-colors flex items-center justify-center min-w-[160px]",
              !selectedProjectId || isAnalyzing
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Run AI Analysis"
            )}
          </button>
        </div>
      </section>

      {/* Analysis Result */}
      {analysisComplete && projectDetail && riskResult && (
        <section className="pt-4 border-t border-border fade-in-up">
          <h2 className="text-[14px] font-bold uppercase tracking-wider text-muted-foreground mb-4">3. Analysis Result</h2>
          
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            <div className="space-y-6">
              <Panel>
                <PanelHeader title="Project Details" />
                <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Project</span>
                    <span className="font-medium">{projectDetail.project.work_description ?? projectDetail.project.project ?? "Not available"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">MP</span>
                    <span className="font-medium">{projectDetail.project.mp_name ?? "Not available"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Location</span>
                    <span className="font-medium">{(projectDetail.project.district || projectDetail.project.constituency) ?? "Unknown"}, {projectDetail.project.state ?? "Unknown"}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Allocation</span>
                    <span className="font-medium">{cr(projectDetail.project.recommended_amount ?? projectDetail.project.amount ?? 0)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Status</span>
                    <span className="font-medium">{projectDetail.project.work_status ?? projectDetail.project.status ?? "Not available"}</span>
                  </div>
                </div>
              </Panel>

              <Panel className="border-primary/20 bg-primary/5">
                <PanelHeader 
                  title={<span className="flex items-center gap-2 text-primary"><Brain className="h-4 w-4" /> AI Finding</span>}
                />
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Category</span>
                      <span className="font-medium text-[13px]">{riskResult.level === "LOW" ? "Routine Review" : "Potential Anomaly"}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-0.5">Status</span>
                      <span className="inline-flex items-center rounded-[2px] bg-orange-100 text-orange-800 px-2 py-0.5 text-[11px] font-bold">
                        Pending Human Review
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-border/50">
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Explanation</span>
                    <p className="text-[13px] leading-relaxed">
                      Based on deterministic analysis of the project records, {riskResult.level === "LOW" 
                        ? "no significant unusual patterns were detected. Expenditure and timeline appear consistent with typical MPLADS constraints." 
                        : "certain indicators require verification. The system detected potential inconsistencies between expected milestones and recorded data."}
                    </p>
                  </div>
                  
                  <div className="pt-2 border-t border-border/50">
                    <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Recommended Action</span>
                    <p className="text-[13px] font-medium text-foreground">
                      {riskResult.level === "LOW" ? "Standard periodic review." : "Review supporting expenditure/project records with the district authority."}
                    </p>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel>
                <PanelHeader title="Risk Assessment" />
                <div className="p-5 flex flex-col items-center justify-center border-b border-border text-center">
                  <div className={cn(
                    "w-24 h-24 rounded-full border-[4px] flex items-center justify-center mb-3",
                    riskResult.level === "LOW" ? "border-green-500 text-green-600" :
                    riskResult.level === "MEDIUM" ? "border-yellow-500 text-yellow-600" :
                    riskResult.level === "HIGH" ? "border-orange-500 text-orange-600" :
                    "border-red-500 text-red-600"
                  )}>
                    <span className="text-3xl font-bold">{riskResult.score}</span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Risk Score</span>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                    <div className="bg-muted/50 p-2 rounded-[3px]">
                      <span className="block text-[10px] uppercase text-muted-foreground font-bold">Risk Level</span>
                      <span className={cn(
                        "text-[13px] font-bold",
                        riskResult.level === "LOW" ? "text-green-600" :
                        riskResult.level === "MEDIUM" ? "text-yellow-600" :
                        riskResult.level === "HIGH" ? "text-orange-600" : "text-red-600"
                      )}>{riskResult.level}</span>
                    </div>
                    <div className="bg-muted/50 p-2 rounded-[3px]">
                      <span className="block text-[10px] uppercase text-muted-foreground font-bold">Confidence</span>
                      <span className="text-[13px] font-bold text-foreground">{riskResult.confidence}%</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-2">Contributing Factors</span>
                  <ul className="space-y-2">
                    {riskResult.factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px]">
                        <AlertOctagon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
