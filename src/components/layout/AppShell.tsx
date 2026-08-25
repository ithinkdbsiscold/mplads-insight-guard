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
  ShieldCheck,
  Table2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAlerts } from "@/services/api";

const primaryNav = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/projects", label: "Projects", icon: Table2 },
  { to: "/alerts", label: "Risk Alerts", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/map", label: "Geographic Map", icon: MapPinned },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquareText },
] as const;

const adminNav = [
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/system-status", label: "System Status", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const titles: Record<string, string> = {
  "/": "Overview",
  "/projects": "Projects",
  "/alerts": "Risk Alerts",
  "/analytics": "Analytics",
  "/map": "Geographic Map",
  "/assistant": "AI Assistant",
  "/data-sources": "Data Sources",
  "/system-status": "System Status",
  "/settings": "Settings",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3" aria-label="Primary">
      <ul className="space-y-0.5">
        {primaryNav.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              activeOptions={{ exact: (item as { exact?: boolean }).exact ?? false }}
              className="group flex items-center gap-2.5 rounded-[5px] px-2.5 py-[7px] text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-foreground"
            >
              <item.icon aria-hidden className="h-[15px] w-[15px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <p className="px-2.5 pb-1.5 text-[10.5px] font-medium tracking-[0.08em] text-sidebar-muted/80 uppercase">
          Administration
        </p>
        <ul className="space-y-0.5">
          {adminNav.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-[5px] px-2.5 py-[7px] text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-foreground"
              >
                <item.icon aria-hidden className="h-[15px] w-[15px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-3.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[5px] border border-sidebar-border bg-sidebar-accent">
          <ShieldCheck aria-hidden className="h-[15px] w-[15px]" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold tracking-[-0.01em]">
            MPLADS Guardian
          </span>
          <span className="block truncate text-[11px] text-sidebar-muted">
            Monitoring &amp; Risk Intelligence
          </span>
        </span>
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[11.5px] font-semibold"
          >
            RK
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium">R. Kulkarni</span>
            <span className="block truncate text-[11px] text-sidebar-muted">
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
  const base = segments.length ? `/${segments[0]}` : "/";
  const title = titles[base] ?? "Overview";
  const detail = segments.length > 1 ? decodeURIComponent(segments[1]) : null;

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
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[5px] border border-border bg-card text-muted-foreground hover:text-foreground lg:hidden"
              >
                <Menu aria-hidden className="h-4 w-4" />
              </button>
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  <li className="truncate font-medium text-foreground">{title}</li>
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
                  className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
                />
                <input
                  type="search"
                  aria-label="Search projects, alerts and districts"
                  placeholder="Search projects or districts"
                  className="h-8 w-[210px] rounded-[5px] border border-border bg-card pl-7 text-[12.5px] placeholder:text-subtle focus:w-[260px] focus:border-border-strong md:w-[240px]"
                />
              </div>
              <Link
                to="/alerts"
                aria-label={`Notifications: ${unresolvedHigh} unresolved high-risk alerts`}
                className="relative grid h-8 w-8 place-items-center rounded-[5px] border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell aria-hidden className="h-4 w-4" />
                {unresolvedHigh > 0 ? (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-risk-critical ring-2 ring-card"
                  />
                ) : null}
              </Link>
              <button
                aria-label="Account menu"
                className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-[11px] font-semibold text-foreground"
              >
                RK
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-7">{children}</main>

        <footer className="border-t border-border px-4 py-4 sm:px-6">
          <p className="mx-auto max-w-[1440px] text-[11.5px] text-subtle">
            Risk indicators are analytical signals for prioritising review. They do not establish
            wrongdoing. All findings require human verification.
          </p>
        </footer>
      </div>
    </div>
  );
}
