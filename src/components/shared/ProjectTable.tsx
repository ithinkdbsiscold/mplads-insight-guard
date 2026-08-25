import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { lakh, pct } from "@/lib/format";
import {
  RiskBadge,
  RiskScore,
  StatusPill,
  ProgressBar,
} from "@/components/ui-kit/primitives";
import type { Project, RiskLevel } from "@/services/api";

interface ProjectTableProps {
  rows: Project[];
  compact?: boolean;
  className?: string;
  showDistrict?: boolean;
}

export function ProjectTable({
  rows,
  compact = false,
  className,
  showDistrict = true,
}: ProjectTableProps) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
        No projects match the current filters.
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 text-muted-foreground font-medium">ID</th>
            <th className="px-4 py-2.5 text-muted-foreground font-medium min-w-[180px]">
              Project
            </th>
            {showDistrict && !compact && (
              <th className="hidden px-4 py-2.5 text-muted-foreground font-medium lg:table-cell">
                District
              </th>
            )}
            {!compact && (
              <th className="hidden px-4 py-2.5 text-muted-foreground font-medium md:table-cell">
                Category
              </th>
            )}
            <th className="px-4 py-2.5 text-muted-foreground font-medium text-right">
              Sanctioned
            </th>
            {!compact && (
              <th className="hidden px-4 py-2.5 text-muted-foreground font-medium text-right sm:table-cell">
                Utilised
              </th>
            )}
            <th className="px-4 py-2.5 text-muted-foreground font-medium">
              Progress
            </th>
            <th className="px-4 py-2.5 text-muted-foreground font-medium">Priority</th>
            <th className="px-4 py-2.5 text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.id}
              className={cn(
                "border-b border-border transition-colors hover:bg-accent/50",
                i % 2 === 0 ? "bg-card" : "bg-background",
              )}
            >
              <td className="px-4 py-2.5">
                <Link
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="tnum text-primary font-medium hover:underline"
                >
                  {p.id}
                </Link>
              </td>
              <td className="px-4 py-2.5 max-w-[220px] truncate text-foreground">
                {p.name}
              </td>
              {showDistrict && !compact && (
                <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">
                  {p.district}, {p.state}
                </td>
              )}
              {!compact && (
                <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                  {p.category}
                </td>
              )}
              <td className="px-4 py-2.5 text-right tnum text-foreground">
                {lakh(p.sanctionedLakh)}
              </td>
              {!compact && (
                <td className="hidden px-4 py-2.5 text-right tnum text-muted-foreground sm:table-cell">
                  {lakh(p.utilizedLakh)}
                </td>
              )}
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={p.physicalProgress}
                    tone={progressTone(p.riskLevel)}
                    className="w-14"
                  />
                  <span className="tnum text-muted-foreground">
                    {pct(p.physicalProgress)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <RiskScore score={p.riskScore} level={p.riskLevel} />
                  <RiskBadge level={p.riskLevel} className="hidden xl:inline-flex" />
                </div>
              </td>
              <td className="px-4 py-2.5">
                <StatusPill status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function progressTone(level: RiskLevel) {
  if (level === "critical" || level === "high") return level;
  return "neutral" as const;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <span className="text-[12px] text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
        {total.toLocaleString("en-IN")}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-7 items-center rounded-[4px] border border-border bg-card px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page + i - 2;
          if (p < 1 || p > totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[12px] transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border border-border bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-7 items-center rounded-[4px] border border-border bg-card px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
