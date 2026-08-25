import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel, ProjectStatus } from "@/services/api";

/* ---------------------------------- panels --------------------------------- */

export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <section
      className={cn("rounded-[3px] border border-border bg-card", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.005em] text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-border pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <h1 className="text-[20px] font-bold tracking-[-0.015em] text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {meta}
        {actions}
      </div>
    </div>
  );
}

/* ---------------------------------- buttons -------------------------------- */

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-[3px] text-[12.5px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "default",
  size = "sm",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const variants = {
    default: "border border-border bg-card text-foreground hover:bg-accent",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
    danger: "border border-risk-critical/30 bg-risk-critical-soft text-risk-critical hover:bg-risk-critical/10",
  } as const;
  const sizes = { sm: "h-8 px-2.5", md: "h-9 px-3.5" } as const;
  return <button className={cn(buttonBase, variants[variant], sizes[size], className)} {...rest} />;
}

/* ----------------------------------- risk ---------------------------------- */

export const riskMeta: Record<RiskLevel, { label: string; dot: string; text: string; bg: string; border: string; bar: string }> = {
  low: {
    label: "Low",
    dot: "bg-risk-low",
    text: "text-risk-low",
    bg: "bg-risk-low-soft",
    border: "border-risk-low/25",
    bar: "bg-risk-low",
  },
  medium: {
    label: "Medium",
    dot: "bg-risk-medium",
    text: "text-risk-medium",
    bg: "bg-risk-medium-soft",
    border: "border-risk-medium/30",
    bar: "bg-risk-medium",
  },
  high: {
    label: "High",
    dot: "bg-risk-high",
    text: "text-risk-high",
    bg: "bg-risk-high-soft",
    border: "border-risk-high/30",
    bar: "bg-risk-high",
  },
  critical: {
    label: "Critical",
    dot: "bg-risk-critical",
    text: "text-risk-critical",
    bg: "bg-risk-critical-soft",
    border: "border-risk-critical/30",
    bar: "bg-risk-critical",
  },
};

export function RiskBadge({
  level,
  suffix,
  className,
}: {
  level: RiskLevel;
  suffix?: string;
  className?: string;
}) {
  const m = riskMeta[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-1.5 py-0.5 text-[11px] font-semibold",
        m.bg,
        m.border,
        m.text,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
      {suffix ? <span className="font-normal opacity-80">{suffix}</span> : null}
    </span>
  );
}

export function RiskScore({ score, level }: { score: number; level: RiskLevel }) {
  const m = riskMeta[level];
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cn("h-4 w-[3px] rounded-sm", m.bar)} />
      <span className="tnum text-[13px] font-semibold text-foreground">{score}</span>
      <span className="sr-only">{m.label} risk</span>
    </span>
  );
}

const statusMeta: Record<ProjectStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "text-risk-low border-risk-low/25 bg-risk-low-soft" },
  ongoing: { label: "Ongoing", className: "text-muted-foreground border-border bg-muted" },
  delayed: {
    label: "Delayed",
    className: "text-risk-high border-risk-high/30 bg-risk-high-soft",
  },
  pending: { label: "Pending", className: "text-muted-foreground border-border bg-muted" },
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[11px] font-semibold",
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}

export function StatusDot({
  tone,
  label,
}: {
  tone: "ok" | "warn" | "error";
  label: string;
}) {
  const tones = {
    ok: { dot: "bg-risk-low", text: "text-risk-low" },
    warn: { dot: "bg-risk-medium", text: "text-risk-medium" },
    error: { dot: "bg-risk-critical", text: "text-risk-critical" },
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium", tones[tone].text)}>
      <span aria-hidden className={cn("h-[6px] w-[6px] rounded-full", tones[tone].dot)} />
      {label}
    </span>
  );
}

/* ---------------------------------- filters -------------------------------- */

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "All",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="label-meta">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 min-w-0 rounded-[3px] border border-border bg-card px-2 text-[12.5px] text-foreground transition-colors hover:border-border-strong"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextField({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="label-meta">{label}</span>
      <input
        className="h-8 min-w-0 rounded-[3px] border border-border bg-card px-2 text-[12.5px] text-foreground placeholder:text-subtle transition-colors hover:border-border-strong"
        {...rest}
      />
    </label>
  );
}

/* ---------------------------------- misc ----------------------------------- */

export function ProgressBar({
  value,
  tone = "neutral",
  className,
}: {
  value: number;
  tone?: "neutral" | "low" | "medium" | "high" | "critical";
  className?: string;
}) {
  const tones = {
    neutral: "bg-primary",
    low: "bg-risk-low",
    medium: "bg-risk-medium",
    high: "bg-risk-high",
    critical: "bg-risk-critical",
  } as const;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface", className)}
      role="presentation"
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="tnum text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}
