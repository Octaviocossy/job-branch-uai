"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  LayoutDashboard,
  BarChart3,
  Bell,
  FileText,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/",            icon: LayoutDashboard, label: "Dashboard" },
  { href: "/branches",    icon: GitBranch,       label: "Ramas" },
  { href: "/analytics",   icon: BarChart3,       label: "Analítica" },
  { href: "/followup",    icon: Bell,            label: "Follow-up" },
  { href: "/profiles",    icon: FileText,        label: "Perfiles CV" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">JobBranch</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded px-1">beta</span>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">Principal</p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors group",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "group-hover:text-primary")} />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors group"
        >
          <Settings className="w-4 h-4 group-hover:text-primary" />
          Configuracion
        </Link>
        <div className="mt-3 px-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">JP</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">Juan Perez</p>
              <p className="text-[10px] text-muted-foreground truncate">juan@dev.com</p>
            </div>
          </div>
        </div>
        <Link
          href="/signin"
          className="flex items-center gap-2.5 px-2 py-2 mt-2 rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group"
        >
          <LogOut className="w-4 h-4 group-hover:text-destructive" />
          Cerrar sesion
        </Link>
      </div>
    </aside>
  );
}
