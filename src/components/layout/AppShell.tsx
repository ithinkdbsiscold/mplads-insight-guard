import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Database,
  LayoutDashboard,
  MapPinned,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Table2,
  Users,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAlerts } from "@/services/api";

const primaryNav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/mps", label: "Members of Parliament", icon: Users },
  { to: "/projects", label: "Projects", icon: Table2 },
  { to: "/alerts", label: "Attention Queue", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/regional-insights", label: "Regional Insights", icon: PieChart },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquareText },
] as const;

const adminNav = [
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/system-status", label: "System Status", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/mps": "Members of Parliament",
  "/projects": "Projects",
  "/alerts": "Attention Queue",
  "/analytics": "Analytics",
  "/regional-insights": "Regional Insights",
  "/assistant": "AI Assistant",
  "/data-sources": "Data Sources",
  "/system-status": "System Status",
  "/settings": "Settings",
};

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3" aria-label="Primary">
      <ul className="space-y-0.5">
        {primaryNav.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: (item as { exact?: boolean }).exact ?? false }}
              className="group flex items-center gap-2.5 rounded-[3px] px-2.5 py-[7px] text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-foreground"
            >
              <item.icon aria-hidden className="h-[15px] w-[15px] shrink-0 opacity-70" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.1em] text-sidebar-muted/60 uppercase">
          Administration
        </p>
        <ul className="space-y-0.5">
          {adminNav.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-[3px] px-2.5 py-[7px] text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-foreground"
              >
                <item.icon aria-hidden className="h-[15px] w-[15px] shrink-0 opacity-70" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-3.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] bg-sidebar-foreground text-sidebar text-[11px] font-bold">
          MG
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold tracking-[-0.01em] text-sidebar-foreground">
            MPLADS Guardian
          </span>
          <span className="block truncate text-[10.5px] text-sidebar-muted">
            Monitoring &amp; Risk Intelligence
          </span>
        </span>
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-foreground"
          >
            RK
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium text-sidebar-foreground">R. Kulkarni</span>
            <span className="block truncate text-[10.5px] text-sidebar-muted">
              District Monitoring Officer
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const unresolvedHigh = listAlerts().filter(
    (a) => a.status !== "resolved" && (a.severity === "high" || a.severity === "critical"),
  ).length;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const segments = pathname.split("/").filter(Boolean);
  const base = segments.length ? `/${segments[0]!}` : "/dashboard";
  const title = titles[base] ?? "Overview";
  const detail = segments.length > 1 ? decodeURIComponent(segments[1]!) : null;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] border-r border-sidebar-border lg:block">
        <SidebarBody />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[248px] shadow-lg">
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[228px]">
        <header className="sticky top-0 z-20 border-b border-border bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] border border-border bg-card text-muted-foreground hover:text-foreground lg:hidden"
              >
                <Menu aria-hidden className="h-4 w-4" />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  <li className="truncate font-semibold text-foreground">{title}</li>
                  {detail ? (
                    <>
                      <li aria-hidden className="text-subtle">
                        /
                      </li>
                      <li className="tnum truncate text-muted-foreground">{detail}</li>
                    </>
                  ) : null}
                </ol>
              </nav>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="relative hidden sm:block">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
                />
                <input
                  type="search"
                  aria-label="Search projects, alerts and districts"
                  placeholder="Search projects or districts"
                  className="h-8 w-[210px] rounded-[3px] border border-border bg-card pl-8 text-[12.5px] placeholder:text-subtle focus:w-[260px] focus:border-primary/40 md:w-[240px] transition-all"
                />
              </div>
              <Link
                to="/alerts"
                aria-label={`Notifications: ${unresolvedHigh} unresolved high priority alerts`}
                className="relative grid h-8 w-8 place-items-center rounded-[3px] border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell aria-hidden className="h-4 w-4" />
                {unresolvedHigh > 0 ? (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-risk-critical ring-2 ring-white"
                  />
                ) : null}
              </Link>
              <button
                aria-label="Account menu"
                className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                RK
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-7">{children}</main>

        <footer className="border-t border-border px-4 py-4 sm:px-6">
          <p className="mx-auto max-w-[1440px] text-[11px] text-subtle">
            The system identifies indicators for review. It does not determine wrongdoing.
          </p>
        </footer>
      </div>
    </div>
  );
}
