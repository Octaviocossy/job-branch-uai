"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bell, ChevronRight, FileText, GitBranch, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/hooks/use-session";
import { SESSION_QUERY_KEY } from "@/query/session-query-key";
import { clearAuthToken } from "@/utilities/auth-token.utility";
import { cn } from "@/utilities/tailwind.utility";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/branches", icon: GitBranch, label: "Ramas" },
  { href: "/analytics", icon: BarChart3, label: "Analítica" },
  { href: "/followup", icon: Bell, label: "Follow-up" },
  { href: "/profiles", icon: FileText, label: "Perfiles CV" },
];

function getInitials(nombreCompleto: string | undefined): string {
  if (!nombreCompleto) return "?";

  const initials = nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

  return initials ? initials.toUpperCase() : "?";
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isPending } = useSession();

  const handleLogout = () => {
    clearAuthToken();
    queryClient.removeQueries({ queryKey: SESSION_QUERY_KEY });
    router.push("/signin");
  };

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <GitBranch className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">JobBranch</span>
        <span className="ml-auto rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">beta</span>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Principal</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                    active ? "bg-sidebar-accent font-medium text-sidebar-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "group-hover:text-primary")} />
                  {label}
                  {active && <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-2 py-3">
        <div className="px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">{getInitials(user?.nombreCompleto)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{isPending ? "Cargando…" : (user?.nombreCompleto ?? "Invitado")}</p>
              <p className="truncate text-[10px] text-muted-foreground">{isPending ? "" : (user?.email ?? "")}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="group mt-2 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 group-hover:text-destructive" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
